const pool = require("../config/database");

const {
    generateTicketNumber
} = require("../services/ticketGenerator");

exports.getHome = async (req, res) => {

    try {

        const result = await pool.query(
        `
        SELECT

            s.id AS schedule_id,

            s.jam_berangkat,

            s.jam_tiba,

            s.status,

            b.id AS bus_id,

            b.nomor_bus,

            b.plat_nomor,

            c.company_name,

            r.id AS route_id,

            r.nama_rute

        FROM schedules s

        JOIN buses b
        ON b.id = s.bus_id

        JOIN companies c
        ON c.id = b.company_id

        JOIN routes r
        ON r.id = s.route_id

        WHERE

            s.status='Aktif'

        ORDER BY

            s.jam_berangkat ASC
        `);

        res.json({

            success:true,

            data:result.rows

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

exports.buyTicket = async (req, res) => {

    try {

        const {

            user_id,
            schedule_id,
            passenger_name,
            phone

        } = req.body;

        /*
        =============================
        CARI BUS DARI JADWAL
        =============================
        */

        const scheduleResult = await pool.query(
            `
            SELECT

                bus_id

            FROM schedules

            WHERE id = $1

            LIMIT 1
            `,
            [schedule_id]
        );

        if (scheduleResult.rows.length == 0) {

            return res.status(404).json({

                success: false,
                message: "Jadwal tidak ditemukan"

            });

        }

        const busId = scheduleResult.rows[0].bus_id;

        /*
        =============================
        GENERATE TIKET
        =============================
        */

        let ticketNumber;

        while (true) {

            ticketNumber = generateTicketNumber();

            const check = await pool.query(
                `
                SELECT id

                FROM tickets

                WHERE ticket_number=$1
                `,
                [ticketNumber]
            );

            if (check.rows.length == 0) {
                break;
            }

        }

        /*
        =============================
        INSERT
        =============================
        */

        const result = await pool.query(

            `
            INSERT INTO tickets
            (

                ticket_number,

                passenger_name,

                phone,

                bus_id,

                schedule_id,

                user_id,

                status

            )

            VALUES

            (

                $1,
                $2,
                $3,
                $4,
                $5,
                $6,
                'Aktif'

            )

            RETURNING *

            `,
            [

                ticketNumber,

                passenger_name,

                phone,

                busId,

                schedule_id,

                user_id

            ]

        );

        res.json({

            success: true,

            data: result.rows[0]

        });

    }

    catch (err) {

        console.log(err);

        res.status(500).json({

            success: false,

            message: err.message

        });

    }

};

exports.getMyTickets = async (req, res) => {

    try {

        const userId = req.params.userId;

        const result = await pool.query(
            `
            SELECT

                t.id,

                t.ticket_number,

                t.passenger_name,

                t.phone,

                t.status,

                t.created_at,

                b.id AS bus_id,

                b.nomor_bus,

                b.plat_nomor,

                s.id AS schedule_id,

                r.nama_rute

            FROM tickets t

            JOIN buses b
            ON b.id=t.bus_id

            JOIN schedules s
            ON s.id=t.schedule_id

            JOIN routes r
            ON r.id=s.route_id

            WHERE

            t.user_id=$1

            ORDER BY t.created_at DESC
            `,
            [userId]
        );

        res.json({

            success: true,

            data: result.rows

        });

    }

    catch (err) {

        console.log(err);

        res.status(500).json({

            success: false,

            message: err.message

        });

    }

};

