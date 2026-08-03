exports.getProfile = async (req, res) => {

  try {

    const { id } = req.params;

    const result = await pool.query(
      `
      SELECT
        id,
        name,
        email,
        role,
        company_id,
        created_at

      FROM users

      WHERE id = $1
      `,
      [id]
    );

    if (result.rows.length == 0) {

      return res.status(404).json({
        success: false,
        message: "User tidak ditemukan"
      });
    }

    res.json({
      success: true,
      data: result.rows[0]
    });

  } catch (err) {

    res.status(500).json({
      success: false,
      message: err.message
    });
  }
};

const pool = require("../config/database");
const bcrypt = require("bcrypt");

// ===================================
// GET ALL USERS
// ===================================
exports.getAllUsers =
async (req, res) => {

  try {

    const result =
      await pool.query(`
        SELECT
          id,
          email,
          role,
          profile_image,
          company_id,
          device

        FROM users

        ORDER BY id DESC
      `);

    res.json({
      success: true,
      data: result.rows
    });

  } catch (err) {

    console.log(err);

    res.status(500).json({
      success: false,
      message: err.message
    });
  }
};

// =====================================
// RESET PASSWORD USER
// =====================================
exports.resetPassword = async (req, res) => {

  try {

    const { id } = req.params;

    const { newPassword } = req.body;

    const hashedPassword =
      await bcrypt.hash(
        newPassword,
        10,
      );

    await pool.query(

      `
      UPDATE users

      SET password = $1

      WHERE id = $2
      `,

      [
        hashedPassword,
        id,
      ],
    );

    res.json({

      success: true,

      message: "Password berhasil diubah",

    });

  } catch (err) {

    console.log(err);

    res.status(500).json({

      success: false,

      message: err.message,

    });
  }
};

// =====================================
// CREATE USER
// =====================================
exports.createUser = async (req, res) => {

  try {

    const {

      email,
      password,
      role,
      company_id,

    } = req.body;

    // cek email

    const cek = await pool.query(

      `
      SELECT id
      FROM users
      WHERE email = $1
      `,

      [email],

    );

    if (cek.rows.length > 0) {

      return res.status(400).json({

        success: false,
        message: "Email sudah digunakan",

      });

    }

    const hashedPassword =
        await bcrypt.hash(
      password,
      10,
    );

    const result = await pool.query(

      `
      INSERT INTO users
      (
        email,
        password,
        role,
        company_id
      )

      VALUES
      (
        $1,
        $2,
        $3,
        $4
      )
      RETURNING *
      `,
      [
        email,
        hashedPassword,
        role,
        company_id == 0
            ? null
            : company_id,
      ],
    );

    res.json({
      success: true,
      data: result.rows[0],
    });

  } catch (err) {

    console.log(err);
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

// =====================================
// UPDATE USER
// =====================================
exports.updateUser = async (req, res) => {
  try {
    const { id } = req.params;

    const {
      email,
      role,
      company_id,
    } = req.body;

    const result = await pool.query(
      `
      UPDATE users

      SET
        email = $1,
        role = $2,
        company_id = $3

      WHERE id = $4

      RETURNING *
      `,
      [
        email,
        role,
        company_id,
        id,
      ],
    );

    res.json({
      success: true,
      data: result.rows[0],
    });

  } catch (err) {

    console.log(err);

    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

// =====================================
// DELETE USER
// =====================================
exports.deleteUser = async (req, res) => {

  try {

    const { id } = req.params;

    await pool.query(
      `
      DELETE FROM users
      WHERE id = $1
      `,
      [id]
    );

    res.json({
      success: true,
      message: "User berhasil dihapus"
    });

  } catch (err) {

    console.log(err);

    res.status(500).json({
      success: false,
      message: err.message
    });

  }

};

// =====================================
// UPDATE FCM TOKEN
// =====================================
exports.updateFcmToken = async (req, res) => {
  try {
    const {
      user_id,
      fcm_token,
    } = req.body;

    if (!user_id || !fcm_token) {
      return res.status(400).json({
        success: false,
        message: "user_id dan fcm_token wajib diisi",
      });
    }

    await pool.query(
      `
      UPDATE users
      SET fcm_token = $1
      WHERE id = $2
      `,
      [
        fcm_token,
        user_id,
      ],
    );

    res.json({
      success: true,
      message: "FCM Token berhasil disimpan",
    });

  } catch (err) {

    console.log(err);

    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};