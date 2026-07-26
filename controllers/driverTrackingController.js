const pool = require("../config/database");
const geofenceService = require("../services/geofenceService");

exports.getDriverTracking = async (req, res) => {
  try {

    const busId = parseInt(req.params.busId, 10);

    if (isNaN(busId)) {
      return res.status(400).json({
        success: false,
        message: "busId harus berupa angka"
      });
    }

    const busResult = await pool.query(
      `
      SELECT

        b.id,
        b.nomor_bus,
        b.plat_nomor,
        b.status,
        b.is_tracking,

        b.current_zone,
        b.current_zone_status,
        b.route_index,
        b.progress,

        d.id AS driver_id,
        d.driver_name,

        c.company_name

      FROM buses b

      LEFT JOIN drivers d
      ON d.id = b.driver_id

      LEFT JOIN companies c
      ON c.id = b.company_id

      WHERE b.id = $1
      `,
      [busId]
    );

    if (busResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Bus tidak ditemukan"
      });
    }

    const bus = busResult.rows[0];

    /*
    ==========================
    ROUTE
    ==========================
    */

    const routeResult = await pool.query(
      `
      SELECT

      r.id,
      r.nama_rute,
      r.path,

      t1.nama_terminal AS start_name,
      t1.lat AS start_lat,
      t1.lng AS start_lng,

      t2.nama_terminal AS end_name,
      t2.lat AS end_lat,
      t2.lng AS end_lng

      FROM schedules s

      JOIN routes r
      ON r.id = s.route_id

      LEFT JOIN terminals t1
      ON t1.id = r.start_terminal_id

      LEFT JOIN terminals t2
      ON t2.id = r.end_terminal_id

      WHERE

      s.bus_id=$1

      AND s.status='Aktif'

      LIMIT 1
      `,
      [busId]
    );

    let route = null;

    if (routeResult.rows.length > 0) {
      route = routeResult.rows[0];
    }

    /*
    ==========================
    CHECKPOINT
    ==========================
    */

    const checkpointResult = await pool.query(
      `
      SELECT

      cp.id,
      cp.nama,
      cp.lat,
      cp.lng

      FROM route_checkpoints rc

      JOIN checkpoints cp
      ON cp.id = rc.checkpoint_id

      WHERE rc.route_id = $1

      ORDER BY rc.id
      `,
      [route?.id ?? 0]
    );

    /*
    ==========================
    GPS TERAKHIR
    ==========================
    */

    const gpsResult = await pool.query(
      `
      SELECT

      latitude,
      longitude,
      speed,
      heading,
      accuracy,
      created_at

      FROM bus_locations
      WHERE bus_id = $1
      ORDER BY created_at DESC
      
      LIMIT 1
      `,
      [busId]
    );

    let gps = {
      latitude: 0,
      longitude: 0,
      speed: 0,
      heading: 0,
      accuracy: 0,
      created_at: null
    };

    if (gpsResult.rows.length > 0) {
      gps = gpsResult.rows[0];
    }

    res.json({

      success: true,

      data: {

        bus: {

        id: bus.id,

        nomor_bus: bus.nomor_bus,

        plat_nomor: bus.plat_nomor,

        status: bus.status,

        tracking: bus.is_tracking,

        current_zone: bus.current_zone,

        current_zone_status: bus.current_zone_status,

        route_index: bus.route_index,

        progress: bus.progress

      },

        driver: {

          id: bus.driver_id,

          nama: bus.driver_name
        },

        company: bus.company_name,

        route: route == null
            ? null
            : {

                id: route.id,

                nama: route.nama_rute,

                path: route.path ?? [],

                terminal_awal: {

                  nama: route.start_name,

                  lat: route.start_lat,

                  lng: route.start_lng
                },

                terminal_tujuan: {

                  nama: route.end_name,

                  lat: route.end_lat,

                  lng: route.end_lng
                },

                checkpoints: checkpointResult.rows
              },

        location: {

          lat: gps.latitude,

          lng: gps.longitude,

          speed: gps.speed,

          heading: gps.heading,

          accuracy: gps.accuracy,

          updated_at: gps.created_at,

          current_zone: bus.current_zone,

          current_zone_status: bus.current_zone_status,

          progress: bus.progress,

          route_index: bus.route_index
        }

      }

    });

  } catch (err) {

    console.log(err);

    res.status(500).json({

      success: false,

      message: err.message
    });
  }
};

exports.startTracking = async (req, res) => {

    try {

        const { driver_id } = req.body;

        const busResult =
        await pool.query(
            `
            SELECT id
            FROM buses
            WHERE driver_id = $1
            LIMIT 1
            `,
            [driver_id]
        );

        if(busResult.rows.length == 0){

            return res.status(404).json({

                success:false,

                message:"Bus tidak ditemukan"

            });

        }

        const busId =
        busResult.rows[0].id;

        await pool.query(
            `
            UPDATE buses

            SET

            is_tracking = true

            WHERE id = $1
            `,
            [busId]
        );

        res.json({

            success:true,

            message:"Tracking dimulai"

        });

    }

    catch(err){

        console.log(err);

        res.status(500).json({

            success:false,

            message:err.message

        });

    }

};

exports.stopTracking = async (req,res)=>{

    try{

        const {driver_id}=req.body;

        const busResult=
        await pool.query(

            `
            SELECT id

            FROM buses

            WHERE driver_id=$1

            LIMIT 1
            `,

            [driver_id]

        );

        if(busResult.rows.length==0){

            return res.status(404).json({

                success:false,

                message:"Bus tidak ditemukan"

            });

        }

        const busId=
        busResult.rows[0].id;

        await pool.query(

            `
            UPDATE buses

            SET

            is_tracking=false

            WHERE id=$1
            `,

            [busId]

        );

        res.json({

            success:true,

            message:"Tracking dihentikan"

        });

    }

    catch(err){

        console.log(err);

        res.status(500).json({

            success:false,

            message:err.message

        });

    }

};

exports.updateLocation = async (req,res)=>{

    try{

        console.log("==================================");
        console.log("UPDATE LOCATION DIPANGGIL");
        console.log(req.body);

        const {

            driver_id,

            latitude,

            longitude,

            speed,

            heading,

            accuracy

        } = req.body;

        /*
        ==========================
        BUS
        ==========================
        */

        const busResult =
        await pool.query(

            `
            SELECT id

            FROM buses

            WHERE driver_id=$1

            LIMIT 1
            `,

            [driver_id]

        );

        if(busResult.rows.length==0){

            return res.status(404).json({

                success:false,

                message:"Bus tidak ditemukan"

            });

        }

        const busId=
        busResult.rows[0].id;

        console.log("BUS ID =", busId);

        /*
        ==========================
        UPDATE GPS
        ==========================
        */

        const existing =
        await pool.query(

            `
            SELECT id

            FROM bus_locations

            WHERE bus_id=$1
            `,

            [busId]

        );

        if(existing.rows.length>0){
            await pool.query(
              `
                UPDATE bus_locations
                SET
                    latitude = $1,
                    longitude = $2,
                    speed = $3,
                    heading = $4,
                    accuracy = $5,
                    updated_at = NOW()
                WHERE bus_id = $6
              `,
              [
                  latitude,
                  longitude,
                  speed,
                  heading,
                  accuracy,
                  busId
              ]
            );
          console.log("UPDATE bus_locations BERHASIL");
        }

        else{

            await pool.query(

                `
                INSERT INTO bus_locations
                (

                    bus_id,

                    latitude,

                    longitude,

                    speed,

                    heading,

                    accuracy

                )

                VALUES($1,$2,$3,$4,$5,$6)
                `,

                [

                    busId,

                    latitude,

                    longitude,

                    speed,

                    heading,

                    accuracy

                ]

            );
          console.log("INSERT bus_locations BERHASIL");
        }

        await pool.query(
        `
          UPDATE buses
          SET
          latitude=$1,
          longitude=$2,
          updated_at=NOW()
          WHERE id=$3
        `,
          [
            latitude,
            longitude,
            busId
          ]
        );

        console.log("UPDATE buses BERHASIL");

        /*
        ==========================
        HITUNG SEMUA
        ==========================
        */
       
        console.log(
          "UPDATE BERHASIL",
          latitude,
          longitude
        );

        // update tabel buses
        await pool.query(
        `
        UPDATE buses
        SET
            latitude = $1,
            longitude = $2,
            updated_at = NOW()
        WHERE id = $3
        `,
        [
            latitude,
            longitude,
            busId
        ]
        );

        await geofenceService.checkBusGeofence(
            busId,
            Number(latitude),
            Number(longitude)
        );

        /*
        =====================================
        STATUS BERDASARKAN KECEPATAN
        =====================================
        */

        let statusBus = "Lancar";

        const currentSpeed = Number(speed);

        if (currentSpeed <= 0) {
            statusBus = "Berhenti";
        } else if (currentSpeed < 30) {
            statusBus = "Lambat";
        } else {
            statusBus = "Lancar";
        }

        await pool.query(
        `
        UPDATE buses
        SET status = $1
        WHERE id = $2
        `,
        [
            statusBus,
            busId
        ]
        );

        /*
        =====================================
        AMBIL DATA BUS TERBARU
        =====================================
        */

        const latestBus = await pool.query(
        `
        SELECT

        current_zone,
        current_zone_status,
        progress,
        status

        FROM buses

        WHERE id=$1
        `,
        [
            busId
        ]
        );

        const bus = latestBus.rows[0];

        /*
        =====================================
        SOCKET EMIT
        =====================================
        */

        global.io.emit("bus_location", {

          bus_id: busId,

          latitude: Number(latitude),

          longitude: Number(longitude),

          speed: Number(speed),

          heading: Number(heading),

          accuracy: Number(accuracy),

          current_zone: bus.current_zone,

          current_zone_status: bus.current_zone_status,

          progress: Number(bus.progress),

          status: bus.status

      });

        res.json({

            success:true,

            message:"Lokasi berhasil diperbarui"

        });

    }

    catch(err){

        console.log(err);

        res.status(500).json({

            success:false,

            message:err.message

        });

    }

};