const pool =
  require("../config/database");

exports.getSchedulesByCompany = async (req, res) => {
  try {

    const { companyId } = req.params;

    const result = await pool.query(`
      SELECT
        s.*,
        b.plat_nomor,
        r.nama_rute

      FROM schedules s

      LEFT JOIN buses b
      ON s.bus_id = b.id

      LEFT JOIN routes r
      ON s.route_id = r.id

      WHERE s.company_id = $1

      ORDER BY s.id DESC
    `,[companyId]);

    res.json({
      success: true,
      data: result.rows,
    });

  } catch(err) {

    console.log(err);

    res.status(500).json({
      success:false,
      message: err.message,
    });
  }
};

exports.createSchedule =
async (req,res)=>{
  try{
    console.log(req.body);
    const {
      company_id,
      bus_id,
      route_id,
      tanggal_berangkat,
      jam_berangkat,
      harga_tiket
    } = req.body;

    console.log(
        company_id,
        bus_id,
        route_id,
        tanggal_berangkat,
        jam_berangkat,
        harga_tiket
    );

    await pool.query(
      `
      UPDATE schedules
      SET status='Selesai'
      WHERE bus_id=$1
      `,
    [bus_id]
    );

    const result = 
      await pool.query(
        `
        INSERT INTO schedules
        (
          company_id,
          bus_id,
          route_id,
          tanggal_berangkat,
          jam_berangkat,
          harga_tiket,
          status
        )

        VALUES
        (
          $1,$2,$3,$4,$5,$6,$7
        )

        RETURNING *
        `,
        [
          company_id,
          bus_id,
          route_id,
          tanggal_berangkat,
          jam_berangkat,
          harga_tiket,
          "Aktif"
        ]
      );

    await pool.query(
    `
    UPDATE buses
    SET
        schedule_id = $1,
        route_id = $2
    WHERE id = $3
    `,
    [
        result.rows[0].id,
        route_id,
        bus_id
    ]);

    res.json({
      success:true,
      data: result.rows[0]
    });

  }catch(err){

    console.log(err);

    res.status(500).json({
      success:false,
      message: err.message
    });
  }
};


exports.updateSchedule =
async(req,res)=>{

  try{

    const {id}=req.params;

    const {
        bus_id,
        route_id,
        tanggal_berangkat,
        jam_berangkat,
        harga_tiket
    } = req.body;

    const result = await pool.query(
      `
      UPDATE schedules

      SET
      bus_id=$1,
      route_id=$2,
      tanggal_berangkat=$3,
      jam_berangkat=$4,
      harga_tiket=$5

      WHERE id=$6

      RETURNING *
      `,
      [
          bus_id,
          route_id,
          tanggal_berangkat,
          jam_berangkat,
          harga_tiket,
          id
      ]
    );

    await pool.query(
    `
    UPDATE buses
    SET
        schedule_id = $1,
        route_id = $2
    WHERE id = $3
    `,
    [
        result.rows[0].id,
        route_id,
        bus_id
    ]
    );

    res.json({
      success:true,
      data: result.rows[0]
    });

  }catch(err){

    res.status(500).json({
      success:false,
      message: err.message
    });
  }
};


exports.deleteSchedule = async (req, res) => {

  try {

    const { id } = req.params;

    /*
    ======================================
    AMBIL DATA SCHEDULE YANG AKAN DIHAPUS
    ======================================
    */

    const scheduleResult = await pool.query(
      `
      SELECT
        bus_id
      FROM schedules
      WHERE id = $1
      `,
      [id]
    );

    if (scheduleResult.rows.length > 0) {

      const busId = scheduleResult.rows[0].bus_id;

      /*
      ======================================
      HAPUS RELASI BUS HANYA JIKA
      BUS MASIH MEMAKAI SCHEDULE INI
      ======================================
      */

      await pool.query(
        `
        UPDATE buses
        SET
          schedule_id = NULL,
          route_id = NULL
        WHERE
          id = $1
          AND schedule_id = $2
        `,
        [
          busId,
          id
        ]
      );

    }

    /*
    ======================================
    HAPUS SCHEDULE
    ======================================
    */

    await pool.query(
      `
      DELETE FROM schedules
      WHERE id = $1
      `,
      [id]
    );

    res.json({
      success: true
    });

  } catch (err) {

    console.log(err);

    res.status(500).json({
      success: false,
      message: err.message
    });

  }

};