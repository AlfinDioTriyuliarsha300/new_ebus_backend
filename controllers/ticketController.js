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

exports.buyTicket = async (req, res) => {
    try {

        const {
            passenger_name,
            phone,
            bus_id,
            schedule_id,
            user_id
        } = req.body;

        if (!passenger_name || !bus_id || !schedule_id) {
            return res.status(400).json({
                success: false,
                message: "Data belum lengkap"
            });
        }

        const random =
            Math.floor(100000 + Math.random() * 900000);

        const ticketNumber = `EB-${random}`;

        const seatNumber =
            "A" + Math.floor(Math.random() * 20 + 1);

        const result = await pool.query(
            `
            INSERT INTO tickets
            (
                ticket_number,
                passenger_name,
                phone,
                bus_id,
                schedule_id,
                seat_number,
                user_id
            )

            VALUES
            (
                $1,$2,$3,$4,$5,$6,$7
            )

            RETURNING id
            `,
            [
                ticketNumber,
                passenger_name,
                phone,
                bus_id,
                schedule_id,
                seatNumber,
                user_id ?? null
            ]
        );

        res.json({
            success: true,
            message: "Tiket berhasil dibuat",
            data: {
                id: result.rows[0].id,
                ticket_number: ticketNumber,
                seat_number: seatNumber
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