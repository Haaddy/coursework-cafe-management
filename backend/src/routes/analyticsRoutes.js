const express = require("express");
const router = express.Router();

const analyticsController = require("../controllers/analyticsController");

router.get("/orders", analyticsController.getOrdersAnalytics);

module.exports = router;
