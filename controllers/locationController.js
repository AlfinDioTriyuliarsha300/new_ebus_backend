const pool = require("../config/database");
const geofenceService = require("../services/geofenceService");
const routeIndexService = require("../services/routeIndexService");
const progressService = require("../services/progressService");

// =====================================
// Update Lokasi Driver
// =====================================
exports.updateLocation = async (req, res) => {

    try {
        console.log("================================");
        console.log("UPDATE LOCATION");
        console.log(req.body);
        const {
            driver_id,
            latitude,
            longitude,
            speed,
            heading,
            accuracy
        } = req.body;

        await pool.query(
            `
            INSERT INTO locations
            (
                driver_id,
                latitude,
                longitude,
                speed,
                heading,
                accuracy,
                created_at
            )

            VALUES
            (
                $1,$2,$3,$4,$5,$6,NOW()
            )
            `,
            [
                driver_id,
                latitude,
                longitude,
                speed,
                heading,
                accuracy
            ]
        );

        await pool.query(
            `
            UPDATE buses

            SET

            latitude=$1,
            longitude=$2,
            speed=$3,
            heading=$4,
            is_tracking=true,
            updated_at=NOW()

            WHERE driver_id=$5
            `,
            [
                latitude,
                longitude,
                speed,
                heading,
                driver_id
            ]
        );

        // Cari bus milik driver
        const busResult = await pool.query(
            `
            SELECT id
            FROM buses
            WHERE driver_id=$1
            `,
            [driver_id]
        );

        if (busResult.rows.length > 0) {

            const busId = busResult.rows[0].id;

            // update progress
            await routeIndexService.updateRouteIndex(
                busId,
                latitude,
                longitude
            );

            await progressService.updateProgress(
                busId
            );

            // cek geofence
            await geofenceService.checkBusGeofence(
                busId,
                latitude,
                longitude
            );
        }

        if (global.io && busResult.rows.length > 0) {
            global.io.emit(
                "locationUpdate",
                {
                    busId: busResult.rows[0].id,
                    latitude,
                    longitude,
                    speed,
                    heading,
                    accuracy,
                },
            );
        }

        res.json({
            success:true,
            message:"Lokasi berhasil diperbarui"
        });

    } catch(err){

        console.log(err);

        res.status(500).json({
            success:false,
            message:err.message
        });
    }
};

// =====================================
// Lokasi Bus Terakhir
// =====================================
exports.getBusLocation = async(req,res)=>{

    try{

        const {busId}=req.params;

        const result = await pool.query(

            `
            SELECT

            id,
            nomor_bus,
            latitude,
            longitude,
            speed,
            heading,
            updated_at

            FROM buses

            WHERE id=$1
            `,
            [busId]
        );

        res.json({

            success:true,

            data:result.rows[0]

        });

    }catch(err){

        res.status(500).json({

            success:false,

            message:err.message

        });

    }

};

// =====================================
// Histori Lokasi
// =====================================
exports.getLocationHistory = async(req,res)=>{
    try{
        const {driverId}=req.params;

        const result=await pool.query(
            `
            SELECT *
            FROM locations
            WHERE driver_id=$1
            ORDER BY created_at DESC
            LIMIT 100
            `,
            [driverId]
        );

        res.json({
            success:true,
            data:result.rows
        });

    }catch(err){

        res.status(500).json({
            success:false,
            message:err.message
        });
    }
};