const express = require("express");

const router = express.Router();

const controller =
require("../controllers/passengerHomeController");

router.get(
    "/",
    controller.getHome
);

router.post(
    "/buy-ticket",
    controller.buyTicket
);

router.get(
    "/tickets/:userId",
    controller.getMyTickets
);

module.exports = router;