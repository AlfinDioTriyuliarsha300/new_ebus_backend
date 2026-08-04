const pool = require("../config/database");

// GET ALL
const getAllBuses = async (req, res) => {
  try {

    const result = await pool.query(`
    SELECT *
    FROM buses
    ORDER BY id ASC
    `);

    res.json({
      success: true,
      data: result.rows
    });

  } catch (err) {

    res.status(500).json({
      success: false,
      message: err.message
    });
  }
};

// CREATE
const createBus = async (req, res) => {

  const {
    company_id,
    driver_id,
    nomor_bus,
    plat_nomor,
    mesin_id,
    route_id,
    schedule_id,
    status
  } = req.body;

  try {

    const result = await pool.query(
      `
      INSERT INTO buses
      (
        company_id,
        driver_id,
        nomor_bus,
        plat_nomor,
        mesin_id,
        route_id,
        schedule_id,
        status
      )
      VALUES
      (
        $1,$2,$3,$4,$5,$6,$7,$8
      )
      RETURNING *
      `,
      [
        company_id,
        driver_id,
        nomor_bus,
        plat_nomor,
        mesin_id,
        route_id,
        schedule_id,
        status
      ]
    );

    res.json({
      success: true,
      data: result.rows[0]
    });

  } catch(err) {

    res.status(500).json({
      success: false,
      message: err.message
    });

  }
};

// UPDATE
const updateBus = async (req, res) => {

  const { id } = req.params;

  const {
    driver_id,
    nomor_bus,
    plat_nomor,
    mesin_id,
    route_id,
    schedule_id,
    status
  } = req.body;

  try {

    const result = await pool.query(
      `
      UPDATE buses
      SET
        driver_id=$1,
        nomor_bus=$2,
        plat_nomor=$3,
        mesin_id=$4,
        route_id=$5,
        schedule_id=$6,
        status=$7,
        updated_at=NOW()
      WHERE id=$8
      RETURNING *
      `,
      [
        driver_id,
        nomor_bus,
        plat_nomor,
        mesin_id,
        route_id,
        schedule_id,
        status,
        id
      ]
    );

    /*
    =========================================
    SYNC SCHEDULE AKTIF
    =========================================
    */

    if (schedule_id != null) {

        await pool.query(
            `
            UPDATE schedules
            SET
                bus_id = $1,
                route_id = $2
            WHERE id = $3
            `,
            [
                id,
                route_id,
                schedule_id
            ]
        );

    }

    res.json({
      success: true,
      data: result.rows[0]
    });

  } catch(err) {

    res.status(500).json({
      success: false,
      message: err.message
    });

  }
};

// DELETE
const deleteBus = async (req, res) => {

  const { id } = req.params;

  try {

    await pool.query(
      `
      DELETE FROM buses
      WHERE id=$1
      `,
      [id]
    );

    res.json({
      success: true,
      message: "Bus berhasil dihapus"
    });

  } catch (err) {

    res.status(500).json({
      success: false,
      message: err.message
    });
  }
};

module.exports = {
  getAllBuses,
  createBus,
  updateBus,
  deleteBus
};

const getBusByCompany = async (req,res)=>{
  try{
    const { companyId } = req.params;
    const result =
      await pool.query(
        `
        SELECT
          id,
          plat_nomor,
          latitude,
          longitude,
          is_tracking

        FROM buses

        WHERE company_id = $1
        AND latitude IS NOT NULL
        AND longitude IS NOT NULL
        `,
        [companyId]
      );

    res.json({
      success:true,
      data: result.rows
    });

  }catch(err){

    console.log(err);

    res.status(500).json({
      success:false,
      message:err.message
    });
  }
};

  module.exports = {
    getAllBuses,
    createBus,
    updateBus,
    deleteBus,
    getBusByCompany
  };