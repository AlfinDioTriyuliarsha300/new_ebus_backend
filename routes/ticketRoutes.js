const express = require("express");

const router = express.Router();

const ticketController = require("../controllers/ticketController");

router.get(
  "/buses",
  ticketController.getAvailableBuses
);

module.exports = router;