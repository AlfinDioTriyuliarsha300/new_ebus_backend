const express = require("express");

const router = express.Router();

const {
  sendTestNotification,
} = require("../controllers/notificationController");

router.post(
  "/test",
  sendTestNotification
);

module.exports = router;