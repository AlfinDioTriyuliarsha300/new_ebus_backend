const admin = require("../config/firebaseService");

class FirebaseService {
  async sendNotification(token, title, body, data = {}) {
    try {
      console.log("========== SEND FCM ==========");
      console.log("TOKEN :", token);
      console.log("TITLE :", title);
      console.log("BODY  :", body);

      const message = {
        token: token,

        notification: {
          title: title,
          body: body,
        },

        data: {
          click_action: "FLUTTER_NOTIFICATION_CLICK",
          ...data
        },

        android: {
          priority: "high",
          notification: {
              channelId: "geofence_channel",
              sound: "default"
          }
        },
      };

      console.log(message);

      const response = await admin.messaging().send(message);

      console.log("MESSAGE ID :", response);

      return true;
    } catch (e) {
      console.log("FCM ERROR");
      console.log(e);

      return false;
    }
  }
}

module.exports = new FirebaseService();