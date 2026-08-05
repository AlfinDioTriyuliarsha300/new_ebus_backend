const pool = require("../config/database");
const geolib = require("geolib");
const firebaseService = require("./firebaseService");

/*
========================================
CEK GEOFENCE
========================================
*/

exports.checkBusGeofence = async (
  busId,
  latitude,
  longitude
) => {
  try {
    console.log("================================");
    console.log("CHECK GEOFENCE DIPANGGIL");
    console.log("BUS :", busId);
    console.log("LAT :", latitude);
    console.log("LNG :", longitude);
    console.log("================================");
    
    /*
    ==========================
    AMBIL SCHEDULE AKTIF
    ==========================
    */
    const scheduleResult =
      await pool.query(
        `
        SELECT route_id
        FROM schedules
        WHERE
        bus_id = $1
        AND status='Aktif'
        LIMIT 1
        `,
        [busId]
      );

      console.log("SCHEDULE RESULT");
      console.log(scheduleResult.rows);

    if (scheduleResult.rows.length == 0) {
      console.log("Tidak ada schedule aktif");
      return;
    }

    const routeId =
      scheduleResult.rows[0].route_id;
      console.log("ROUTE ID :", routeId);

    /*
    ==========================
    TERMINAL AWAL
    ==========================
    */
    const startResult =
      await pool.query(
        `
        SELECT
        t.id,
        t.nama_terminal,
        t.lat,
        t.lng
        FROM routes r
        JOIN terminals t
        ON t.id=r.start_terminal_id
        WHERE r.id=$1
        `,
        [routeId]
      );

    /*
    ==========================
    TERMINAL TUJUAN
    ==========================
    */
    const endResult =
      await pool.query(
        `
        SELECT
        t.id,
        t.nama_terminal,
        t.lat,
        t.lng
        FROM routes r
        JOIN terminals t
        ON t.id=r.end_terminal_id
        WHERE r.id=$1
        `,
        [routeId]
      );

    /*
    ==========================
    CHECKPOINT
    ==========================
    */
    const checkpointResult =
      await pool.query(
        `
        SELECT
        cp.id,
        cp.nama,
        cp.lat,
        cp.lng
        FROM route_checkpoints rc
        JOIN checkpoints cp
        ON cp.id=rc.checkpoint_id
        WHERE rc.route_id=$1
        ORDER BY rc.id
        `,
        [routeId]
      );

    /*
    ===================================
    GABUNG SEMUA ZONE
    ===================================
    */
    const zones = [];
    if (startResult.rows.length > 0) {
      zones.push({
          id:startResult.rows[0].id,
          nama:startResult.rows[0].nama_terminal,
          lat:startResult.rows[0].lat,
          lng:startResult.rows[0].lng,
          type:"TERMINAL_AWAL"
      });
    }

    checkpointResult.rows.forEach((cp) => {
        zones.push({
            id:cp.id,
            nama:cp.nama,
            lat:cp.lat,
            lng:cp.lng,
            type:"CHECKPOINT"
        });
    });

    if (endResult.rows.length > 0) {
      zones.push({
          id:endResult.rows[0].id,
          nama:endResult.rows[0].nama_terminal,
          lat:endResult.rows[0].lat,
          lng:endResult.rows[0].lng,
          type:"TERMINAL_TUJUAN"
      });
    }

    console.log("==========================");
    console.log("TOTAL ZONE :", zones.length);
    console.log(zones);
    console.log("==========================");

    /*
    ==================================
    AMBIL STATUS BUS SEKARANG
    ==================================
    */

    const busStatusResult =
    await pool.query(
    `
    SELECT
    current_zone,
    current_zone_status
    FROM buses
    WHERE id=$1
    `,
    [
    busId
    ]
    );

    const currentZone =
    busStatusResult.rows[0]?.current_zone;

    const currentStatus =
    busStatusResult.rows[0]?.current_zone_status;

    /*
    ==================================
    FLAG APAKAH BUS BERADA DI GEOFENCE
    ==================================
    */

    let insideAnyZone = false;

    for (const zone of zones) {
      const inside =
        geolib.isPointWithinRadius(
          {
            latitude,
            longitude,
          },

          {
            latitude: Number(zone.lat),
            longitude: Number(zone.lng),
          },
          200
        );

        const distance =
          geolib.getDistance(
          {
              latitude,
              longitude
          },
          {
              latitude:Number(zone.lat),
              longitude:Number(zone.lng)
          });

          console.log("--------------------------------");
          console.log("ZONE :", zone.nama);
          console.log("DISTANCE :", distance);
          console.log("INSIDE :", inside);
          console.log("--------------------------------");

      if (inside) {
         insideAnyZone = true;

      /*
      ==================================
      SUDAH DI DALAM ZONA?
      ==================================
      */

      if (
          currentZone === zone.nama &&
          currentStatus === "MASUK"
      ) {

          console.log("Masih di dalam geofence");

          continue;
      }

      console.log(
          `BUS ${busId} MASUK ${zone.type} : ${zone.nama}`
        );

        let statusBus = "Perjalanan";

        if (zone.type == "TERMINAL_AWAL") {
            statusBus = "Siap Berangkat";
        }

        if (zone.type == "TERMINAL_TUJUAN") {
            statusBus = "Selesai";
        }

        /*
        ===================================
        UPDATE BUS
        ===================================
        */
        await pool.query(
          `
          UPDATE buses

            SET

            current_zone = $1,
            current_zone_status = 'MASUK',
            status = $2

            WHERE id = $3
          `,
            [
                zone.nama,
                statusBus,
                busId
            ]
        );

        

        /*
        ==================================
        AMBIL TOKEN PENERIMA
        ==================================
        */

        const tokens = await getReceiverTokens(busId);

        console.log("==============================");
        console.log("TOKEN RESULT");
        console.log(tokens);
        console.log("==============================");

        if (tokens.length === 0) {
            console.log("TIDAK ADA TOKEN");
            break;
        }

        for (const item of tokens) {

            // Simpan notifikasi ke database
            await pool.query(
                `
                INSERT INTO notifications
                (
                    user_id,
                    bus_id,
                    title,
                    message,
                    type,
                    is_read,
                    created_at
                )

                VALUES
                (
                    $1,
                    $2,
                    $3,
                    $4,
                    $5,
                    false,
                    NOW()
                )
                `,
                [
                    item.id,
                    busId,
                    "Geofence",
                    `Bus memasuki ${zone.nama}`,
                    "GEOFENCE"
                ]
            );

            if (!item.fcm_token) {
                continue;
            }

            console.log("KIRIM FCM KE :", item.fcm_token);

            const success =
                await firebaseService.sendNotification(
                    item.fcm_token,
                    "Geofence",
                    `Bus memasuki ${zone.nama}`,
                    {
                        type: "geofence",
                        zone: zone.nama,
                        bus_id: String(busId)
                    }
                );

            console.log("HASIL :", success);
        }

        break;
      } // <-- menutup if (inside)
    } // <-- menu
        
    /*
    ==================================
    BUS KELUAR DARI GEOFENCE
    ==================================
    */

    if (
        !insideAnyZone &&
        currentStatus == "MASUK"
    ) {

        console.log("==============================");
        console.log("BUS KELUAR GEOFENCE");
        console.log("==============================");

        await pool.query(
        `
        UPDATE buses

        SET

        current_zone=NULL,
        current_zone_status='DI LUAR'

        WHERE id=$1
        `,
        [
            busId
        ]
        );

        console.log(
          `BUS ${busId} BERHASIL KELUAR DARI GEOFENCE`
        );
    }
  }

  catch(err){
    console.log(err);
  }
};

async function getReceiverTokens(busId) {

    const result = await pool.query(`
        SELECT DISTINCT
            u.id,
            u.fcm_token
        FROM users u
        WHERE u.fcm_token IS NOT NULL
        AND (
            u.id IN (
                SELECT d.user_id
                FROM drivers d
                JOIN buses b
                    ON b.driver_id=d.id
                WHERE b.id=$1
            )

            OR

            u.id IN (
                SELECT t.user_id
                FROM tickets t
                WHERE t.bus_id=$1
            )

            OR

            u.company_id=(
                SELECT company_id
                FROM buses
                WHERE id=$1
            )
        )
    `,[busId]);

    return result.rows;
}