const pool = require("../config/database");
const axios = require("axios");
const geolib = require("geolib");

// ===================================
// OpenRouteService
// ===================================
async function generateRoadPath(points) {

  const coordinates = points.map(point => [
    Number(point.lng),
    Number(point.lat)
  ]);

  console.log("KOORDINAT ORS");
  console.log(JSON.stringify(coordinates));

  try {

    const response = await axios.post(
      "https://api.openrouteservice.org/v2/directions/driving-car/geojson",
      {
        coordinates
      },
      {
        headers: {
          Authorization: process.env.ORS_API_KEY,
          "Content-Type": "application/json"
        }
      }
    );

    console.log("STATUS :", response.status);

    return response.data.features[0].geometry.coordinates.map(c => ({
      lat: c[1],
      lng: c[0]
    }));

  } catch (err) {

    console.log("===== ORS ERROR =====");

    console.log("STATUS :", err.response?.status);

    console.log("DATA :");

    console.log(JSON.stringify(err.response?.data, null, 2));

    throw err;
  }
}

// ===================================
// checkGeofence
// ===================================
async function checkGeofence(
    busId,
    lat,
    lng
){

    const zones =
      await pool.query(`
        SELECT
          id,
          nama_terminal as nama,
          lat,
          lng,
          geofence_radius

        FROM terminals
      `);

    for(const zone of zones.rows){

      const inside =
          geolib.isPointWithinRadius(

        {
          latitude: lat,
          longitude: lng
        },

        {
          latitude: zone.lat,
          longitude: zone.lng
        },

        zone.geofence_radius
      );

      if(inside){

        console.log(
          `Bus ${busId}
          masuk ${zone.nama}`
        );

      }
    }
}

// ===================================
// GET ROUTES BERDASARKAN COMPANY
// ===================================
exports.getRoutesByCompany = async (req, res) => {

  try {

    const { companyId } = req.params;

    const result = await pool.query(`
      SELECT *
      FROM routes
      WHERE company_id = $1
      ORDER BY id DESC
    `, [companyId]);

    res.json({
      success: true,
      data: result.rows
    });

  } catch (err) {

    console.error(err);

    res.status(500).json({
      success: false,
      message: err.message
    });

  }

};

// ===================================
// GET ROUTE BERDASARKAN BUS
// ===================================
exports.getRouteByBus = async (req, res) => {

  try {

    const { busId } = req.params;

    const result = await pool.query(`
      SELECT
          r.*,

          st.lat AS start_lat,
          st.lng AS start_lng,

          et.lat AS end_lat,
          et.lng AS end_lng,

          cpa.lat AS checkpoint_a_lat,
          cpa.lng AS checkpoint_a_lng,

          cpb.lat AS checkpoint_b_lat,
          cpb.lng AS checkpoint_b_lng

      FROM buses b

      JOIN routes r
      ON b.route_id = r.id

      LEFT JOIN terminals st
      ON r.start_terminal_id = st.id

      LEFT JOIN terminals et
      ON r.end_terminal_id = et.id

      LEFT JOIN checkpoints cpa
      ON r.checkpoint_a_id = cpa.id

      LEFT JOIN checkpoints cpb
      ON r.checkpoint_b_id = cpb.id

      WHERE b.id = $1
    `, [busId]);

    if (result.rows.length === 0) {

      return res.status(404).json({
        success: false,
        message: "Route tidak ditemukan"
      });

    }

    res.json({
      success: true,
      data: result.rows[0]
    });

  } catch (err) {

    console.error(err);

    res.status(500).json({
      success: false,
      message: err.message
    });

  }

};


// ===================================
// CREATE ROUTE
// ===================================
exports.createRoute = async (req, res) => {

  console.log("MASUK CREATE ROUTE");

  try {

    console.log("BODY:", req.body);

    const {
      company_id,
      nama_rute,
      start_terminal_id,
      end_terminal_id,
      checkpoint_a_id,
      checkpoint_b_id,
      route_mode
    } = req.body;

    // VALIDASI
    if (
      !company_id ||
      !nama_rute ||
      !start_terminal_id ||
      !end_terminal_id
    ) {
      return res.status(400).json({
        success: false,
        message: "Data wajib belum lengkap"
      });
    }

    // TERMINAL AWAL
    const startResult = await pool.query(
      `
      SELECT lat,lng
      FROM terminals
      WHERE id = $1
      `,
      [start_terminal_id]
    );

    // TERMINAL TUJUAN
    const endResult = await pool.query(
      `
      SELECT lat,lng
      FROM terminals
      WHERE id = $1
      `,
      [end_terminal_id]
    );

    if (startResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Terminal awal tidak ditemukan"
      });
    }

    if (endResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Terminal tujuan tidak ditemukan"
      });
    }

    // FORMAT TITIK
    const titik_awal =
      `${startResult.rows[0].lat},${startResult.rows[0].lng}`;

    const titik_tujuan =
      `${endResult.rows[0].lat},${endResult.rows[0].lng}`;

    // ==========================
    // MEMBENTUK PATH POLYLINE
    // ==========================
    const path = [];

    // Terminal Awal
    path.push({
      lat: startResult.rows[0].lat,
      lng: startResult.rows[0].lng
    });

    // Checkpoint A
    if (checkpoint_a_id) {

      const cpA = await pool.query(
        `
        SELECT lat,lng
        FROM checkpoints
        WHERE id = $1
        `,
        [checkpoint_a_id]
      );

      if (cpA.rows.length > 0) {

        path.push({
          lat: cpA.rows[0].lat,
          lng: cpA.rows[0].lng
        });
      }
    }

    // Checkpoint B
    if (checkpoint_b_id) {

      const cpB = await pool.query(
        `
        SELECT lat,lng
        FROM checkpoints
        WHERE id = $1
        `,
        [checkpoint_b_id]
      );

      if (cpB.rows.length > 0) {

        path.push({
          lat: cpB.rows[0].lat,
          lng: cpB.rows[0].lng
        });
      }
    }

    // Terminal Tujuan
    path.push({
      lat: endResult.rows[0].lat,
      lng: endResult.rows[0].lng
    });

    console.log("PATH ROUTE:");
    console.log(path);

    // ===================================
    // GENERATE JALAN ASLI DARI ORS
    // ===================================
    const realPath =
        await generateRoadPath(path);

    console.log("REAL PATH:");
    console.log(realPath.length);

    // INSERT DATABASE
    const result = await pool.query(
      `
      INSERT INTO routes
      (
        company_id,
        nama_rute,
        titik_awal,
        titik_tujuan,
        jarak_estimasi,
        path,
        route_mode,
        start_terminal_id,
        end_terminal_id,
        checkpoint_a_id,
        checkpoint_b_id
      )

      VALUES
      (
        $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11
      )

      RETURNING *
      `,
      [
        company_id,
        nama_rute,

        titik_awal,
        titik_tujuan,

        "0",

        JSON.stringify(realPath),

        route_mode,

        start_terminal_id,
        end_terminal_id,

        checkpoint_a_id || null,
        checkpoint_b_id || null
      ]
    );

    res.status(201).json({
      success: true,
      data: result.rows[0]
    });

  } catch (err) {

    console.log("===== ERROR CREATE ROUTE =====");

    console.log(err);
    console.log(err.message);
    console.log(err.stack);

    res.status(500).json({
      success: false,
      message: err.message
    });
  }
};

// ===================================
// UPDATE ROUTE
// ===================================
exports.updateRoute = async (req, res) => {

  try {

    const { id } = req.params;

    const {

      nama_rute,
      titik_awal,
      titik_tujuan,

      jarak_estimasi,
      path,

      start_terminal_id,
      end_terminal_id,

      checkpoint_a_id,
      checkpoint_b_id,

      route_mode

    } = req.body;

    const result = await pool.query(`
      UPDATE routes

      SET

      nama_rute = $1,
      titik_awal = $2,
      titik_tujuan = $3,

      jarak_estimasi = $4,
      path = $5,

      route_mode = $6,

      start_terminal_id = $7,
      end_terminal_id = $8,

      checkpoint_a_id = $9,
      checkpoint_b_id = $10,

      updated_at = NOW()

      WHERE id = $11

      RETURNING *
    `,
    [
      nama_rute,
      titik_awal,
      titik_tujuan,

      jarak_estimasi,
      JSON.stringify(path),

      route_mode,

      start_terminal_id,
      end_terminal_id,

      checkpoint_a_id,
      checkpoint_b_id,

      id
    ]);

    res.json({
      success: true,
      data: result.rows[0]
    });

  } catch (err) {

    console.error(err);

    res.status(500).json({
      success: false,
      message: err.message
    });

  }

};


// ===================================
// DELETE ROUTE
// ===================================
exports.deleteRoute = async (req, res) => {

  try {

    const { id } = req.params;

    await pool.query(`
      DELETE
      FROM routes
      WHERE id = $1
    `, [id]);

    res.json({
      success: true,
      message: "Route berhasil dihapus"
    });

  } catch (err) {

    console.error(err);

    res.status(500).json({
      success: false,
      message: err.message
    });

  }

};