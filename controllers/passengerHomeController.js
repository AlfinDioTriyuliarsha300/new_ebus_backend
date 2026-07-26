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

exports.buyTicket = async (req,res)=>{

    try{

        const{

            passenger_id,

            schedule_id

        }=req.body;

        const ticketNumber=
        generateTicketNumber();

        const result=
        await pool.query(

            `
            INSERT INTO tickets
            (

                passenger_id,

                schedule_id,

                ticket_number,

                status

            )

            VALUES

            (

                $1,

                $2,

                $3,

                'Aktif'

            )

            RETURNING *
            `,

            [

                passenger_id,

                schedule_id,

                ticketNumber

            ]

        );

        res.json({

            success:true,

            data:result.rows[0]

        });

    }

    catch(err){

        res.status(500).json({

            success:false,

            message:err.message

        });

    }

};

exports.getMyTickets = async (req,res)=>{

    try{

        const passengerId=
        req.params.passengerId;

        const result=
        await pool.query(

            `
            SELECT

                t.id,

                t.ticket_number,

                t.status,

                t.created_at,

                b.nomor_bus,

                r.nama_rute

            FROM tickets t

            JOIN schedules s
            ON s.id=t.schedule_id

            JOIN buses b
            ON b.id=s.bus_id

            JOIN routes r
            ON r.id=s.route_id

            WHERE

            t.passenger_id=$1

            ORDER BY t.created_at DESC
            `,

            [

                passengerId

            ]

        );

        res.json({

            success:true,

            data:result.rows

        });

    }

    catch(err){

        res.status(500).json({

            success:false,

            message:err.message

        });

    }

};

