const pool = require("../config/database");

const {
    generateTicketNumber
} = require("../services/ticketGenerator");

exports.getHome = async (req,res)=>{

    try{

        const routes =
        await pool.query(

            `
            SELECT

                r.id,

                r.nama_rute,

                c.company_name,

                COUNT(b.id) AS total_bus

            FROM routes r

            LEFT JOIN schedules s
            ON s.route_id=r.id

            LEFT JOIN buses b
            ON b.id=s.bus_id

            LEFT JOIN companies c
            ON c.id=b.company_id

            GROUP BY

            r.id,

            c.company_name

            ORDER BY r.nama_rute
            `

        );

        res.json({

            success:true,

            data:routes.rows

        });

    }

    catch(err){

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

