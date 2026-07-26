const pool = require("../config/database");

/*
=========================================
GET AVAILABLE BUSES
GET /api/tickets/buses
=========================================
*/

exports.getAvailableBuses = async (req, res) => {
  try {

    const result = await pool.query(`
      SELECT

        b.id AS bus_id,
        b.nomor_bus,
        b.plat_nomor,
        b.status,

        c.company_name,

        s.id AS schedule_id,
        s.tanggal_berangkat,
        s.jam_berangkat,
        s.harga_tiket,

        r.nama_rute

      FROM buses b

      INNER JOIN companies c
      ON c.id = b.company_id

      INNER JOIN schedules s
      ON s.bus_id = b.id

      INNER JOIN routes r
      ON r.id = s.route_id

      WHERE s.status = 'Aktif'

      ORDER BY
      s.tanggal_berangkat,
      s.jam_berangkat
    `);

    const buses = result.rows.map((row) => ({

      bus_id: row.bus_id,

      nomor_bus: row.nomor_bus,

      plat_nomor: row.plat_nomor,

      status: row.status,

      company: row.company_name,

      schedule_id: row.schedule_id,

      tanggal_berangkat: row.tanggal_berangkat,

      jam_berangkat: row.jam_berangkat,

      harga_tiket: row.harga_tiket,

      route: row.nama_rute,

    }));

    res.json({

      success: true,

      data: buses,

    });

  } catch (err) {

    console.error(err);

    res.status(500).json({

      success: false,

      message: err.message,

    });

  }
};