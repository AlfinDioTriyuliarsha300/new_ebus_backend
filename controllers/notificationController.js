const pool = require("../config/database");
const firebaseService = require("../services/firebaseService");

// =====================================
// TEST PUSH NOTIFICATION
// =====================================
exports.sendTestNotification = async (req, res) => {
  try {
    const { user_id } = req.body;

    if (!user_id) {
      return res.status(400).json({
        success: false,
        message: "user_id wajib diisi",
      });
    }

    const result = await pool.query(
      `
      SELECT
        fcm_token,
        email
      FROM users
      WHERE id = $1
      `,
      [user_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "User tidak ditemukan",
      });
    }

    const token = result.rows[0].fcm_token;

    if (!token) {
      return res.status(400).json({
        success: false,
        message: "User belum memiliki FCM Token",
      });
    }

    const success = await firebaseService.sendNotification(
      token,
      "E-Bus Notification",
      "Selamat! Push Notification berhasil dikirim dari Backend.",
      {
        type: "test",
      }
    );

    if (!success) {
      return res.status(500).json({
        success: false,
        message: "Gagal mengirim notification",
      });
    }

    res.json({
      success: true,
      message: "Push Notification berhasil dikirim",
    });

  } catch (err) {

    console.log(err);

    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};