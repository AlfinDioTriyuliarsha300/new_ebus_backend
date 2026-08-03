const pool = require("../config/database");
const geolib = require("geolib");
const routeIndexService = require("./routeIndexService");
const progressService = require("./progressService");
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

    if (scheduleResult.rows.length == 0) {
      console.log("Tidak ada schedule aktif");
      return;
    }

    const routeId =
      scheduleResult.rows[0].route_id;

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
        type: "TERMINAL_AWAL",
        ...startResult.rows[0],
      });
    }

    checkpointResult.rows.forEach((cp) => {
        zones.push({
            type: "CHECKPOINT",
            ...cp,
        });
    });

    if (endResult.rows.length > 0) {
      zones.push({
        type: "TERMINAL_TUJUAN",
        ...endResult.rows[0],
      });
    }

    /*
    ===================================
    CEK SATU PER SATU
    ===================================
    */
    await routeIndexService.updateRouteIndex(
        busId,
        latitude,
        longitude
    );

    await progressService.updateProgress(
        busId
    );

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

      if (inside) {
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
        ===================================
        SIMPAN LOG
        ===================================
        */
        await pool.query(
          `
          INSERT INTO notifications
          (
            bus_id,
            title,
            message,
            created_at
          )

          VALUES
          (
            $1,
            $2,
            $3,
            NOW()
          )
          `,
          [
            busId,
            "Geofence",
            `Bus memasuki ${zone.nama}`
          ]
        );

        const tokenResult =
        await pool.query(
        `
        SELECT

        u.fcm_token

        FROM buses b

        JOIN drivers d
        ON d.id = b.driver_id

        JOIN users u
        ON u.id = d.user_id

        WHERE b.id = $1
        `,
        [
            busId
        ]
        );

        if (
            tokenResult.rows.length > 0 &&
            tokenResult.rows[0].fcm_token
        ) {

          console.log("=================================");
          console.log("MENGIRIM FCM");
          console.log("Bus :", busId);
          console.log("Zone:", zone.nama);
          console.log("Token:", tokenResult.rows[0].fcm_token);
          console.log("=================================");

            await firebaseService.sendNotification(
              tokenResult.rows[0].fcm_token,
              "Geofence",
              `Bus memasuki ${zone.nama}`,
              {
                  type: "geofence",
                  zone: zone.nama,
                  bus_id: busId.toString(),
              }
            );

        }
        return;
      }
    }

    /*
    ===================================
    BUS DI LUAR SEMUA ZONE
    ===================================
    */
    await pool.query(
      `
      UPDATE buses
      SET
      current_zone=NULL,
      current_zone_status='DI LUAR'
      WHERE id=$1
      `,
      [busId]
    );
  }

  catch(err){
    console.log(err);
  }
};