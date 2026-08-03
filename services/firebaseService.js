const admin = require("../config/firebaseService");

class FirebaseService {
  async sendNotification(token, title, body, data = {}) {
    try {
      if (!token) {
        console.log("FCM Token kosong.");
        return false;
      }

      const message = {
        token,

        notification: {
          title,
          body,
        },

        data,

        android: {
          priority: "high",
          notification: {
            sound: "default",
          },
        },
      };

      const response = await admin.messaging().send(message);

      console.log("=================================");
      console.log("Push Notification BERHASIL");
      console.log("Message ID :", response);
      console.log("=================================");

      return true;
    } catch (err) {
      console.log("=================================");
      console.log("Push Notification GAGAL");
      console.log(err.message);
      console.log("=================================");

      return false;
    }
  }
}

module.exports = new FirebaseService();