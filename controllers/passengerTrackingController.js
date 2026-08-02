const pool = require("../config/database");
const {getDistance,getPathLength,} = require("geolib");

exports.getPassengerTracking = async (req, res) => {
  try {

    const { ticket } = req.params;

    /*
    ===========================
    CARI TIKET
    ===========================
    */

    const ticketResult = await pool.query(
      `
      SELECT

        t.id,
        t.ticket_number,
        t.passenger_name,
        t.phone,
        t.user_id,

        t.bus_id,

        b.nomor_bus,
        b.plat_nomor,
        b.status,
        b.is_tracking,
        b.current_zone,
        b.current_zone_status,
        b.progress,

        c.company_name

        FROM tickets t

        JOIN buses b
        ON b.id=t.bus_id

        JOIN companies c
        ON c.id=b.company_id

        WHERE t.ticket_number=$1

        LIMIT 1
      `,
      [ticket]
    );

    if (ticketResult.rows.length == 0) {
      return res.status(404).json({
        success: false,
        message: "Nomor tiket tidak ditemukan"
      });
    }

    const data = ticketResult.rows[0];

    /*
    ===========================
    GPS TERBARU
    ===========================
    */

    const gpsResult = await pool.query(
      `
      SELECT

        latitude,
        longitude,
        speed,
        heading,
        accuracy,
        updated_at

      FROM bus_locations

      WHERE bus_id=$1

      ORDER BY updated_at DESC

      LIMIT 1
      `,
      [data.bus_id]
    );

    let gps = {
      latitude: 0,
      longitude: 0,
      speed: 0,
      heading: 0,
      accuracy: 0,
      updated_at: null
    };

    if (gpsResult.rows.length > 0) {
      gps = gpsResult.rows[0];
    }

    /*
    ===========================
    ROUTE
    ===========================
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
      ON r.id=s.route_id

      LEFT JOIN terminals t1
      ON t1.id=r.start_terminal_id

      LEFT JOIN terminals t2
      ON t2.id=r.end_terminal_id

      WHERE s.bus_id=$1
      AND s.status='Aktif'

      LIMIT 1
      `,
      [data.bus_id]
    );

    let route = null;

    if (routeResult.rows.length > 0) {
      route = routeResult.rows[0];
    }

    /*
    ===========================
    CHECKPOINT
    ===========================
    */

    let checkpoints = [];

    if (route != null) {

      const cpResult = await pool.query(
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
        [route.id]
      );

      checkpoints = cpResult.rows;
    }

    /*
    ===========================
    REMAINING DISTANCE
    ===========================
    */

    let remainingDistance = 0;

    if (
      route &&
      route.path &&
      gps.latitude &&
      gps.longitude
    ) {

      remainingDistance = calculateRemainingDistance(
        route.path,
        {
          lat: Number(gps.latitude),
          lng: Number(gps.longitude),
        }
      );

    }

    /*
    ===========================
    ESTIMATED ARRIVAL
    ===========================
    */

    let estimatedMinutes = null;

    const speed = Number(gps.speed);

    if (remainingDistance > 0 && speed > 0) {

      const distanceKm = remainingDistance / 1000;

      estimatedMinutes = Math.round(
        (distanceKm / speed) * 60
      );

    }

    res.json({

      success:true,

      data:{

        passenger:{
            nama:data.passenger_name,
            phone:data.phone,
            user_id:data.user_id
        },

        ticket:{
          nomor:data.ticket_number
        },

        bus:{
            id:data.bus_id,
            nomor_bus:data.nomor_bus,
            plat_nomor:data.plat_nomor,
            status:data.status,
            tracking:data.is_tracking,
            current_zone:data.current_zone,
            current_zone_status:data.current_zone_status,
            progress:data.progress
        },

        company:data.company_name,

        location:{
            lat:gps.latitude,
            lng:gps.longitude,

            speed:gps.speed,
            heading:gps.heading,
            accuracy:gps.accuracy,

            progress:data.progress,

            remaining_distance: remainingDistance,

            estimated_minutes: estimatedMinutes,

            updated_at:gps.updated_at,
            
            current_zone:data.current_zone,
            current_zone_status:data.current_zone_status,
        },

        route:route==null
        ?null
        :{

          id:route.id,
          nama:route.nama_rute,

          path:route.path,

          terminal_awal:{
            nama:route.start_name,
            lat:route.start_lat,
            lng:route.start_lng
          },

          terminal_tujuan:{
            nama:route.end_name,
            lat:route.end_lat,
            lng:route.end_lng
          },

          checkpoints:checkpoints
        }

      }

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

function calculateRemainingDistance(path, busLocation) {

  if (!Array.isArray(path) || path.length < 2) {
    return 0;
  }

  //----------------------------------------
  // Cari titik polyline paling dekat
  //----------------------------------------

  let nearestIndex = 0;
  let nearestDistance = Number.MAX_VALUE;

  for (let i = 0; i < path.length; i++) {

    const d = getDistance(
      {
        latitude: busLocation.lat,
        longitude: busLocation.lng,
      },
      {
        latitude: path[i].lat,
        longitude: path[i].lng,
      }
    );

    if (d < nearestDistance) {
      nearestDistance = d;
      nearestIndex = i;
    }
  }

  //----------------------------------------
  // Hitung sisa polyline
  //----------------------------------------

  let remaining = nearestDistance;

  for (let i = nearestIndex; i < path.length - 1; i++) {

    remaining += getDistance(
      {
        latitude: path[i].lat,
        longitude: path[i].lng,
      },
      {
        latitude: path[i + 1].lat,
        longitude: path[i + 1].lng,
      }
    );

  }

  return Math.round(remaining);

}