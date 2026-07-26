const express = require("express");

const router = express.Router();

const ticketController = require("../controllers/ticketController");

router.get(
  "/buses",
  ticketController.getAvailableBuses
);

router.post(
    "/buy",
    ticketController.buyTicket
);

router.get(
    "/my/:userId",
    ticketController.getMyTicket
);

router.get(
    "/history/:userId",
    ticketController.getMyTickets
);

module.exports = router;