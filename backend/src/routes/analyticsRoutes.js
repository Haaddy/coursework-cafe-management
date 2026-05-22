const express = require("express");
const router = express.Router();

const analyticsController = require("../controllers/analyticsController");
const { requireManager } = require("../middleware/requireManager");

router.get("/orders", requireManager, analyticsController.getOrdersAnalytics);
router.get("/employees", requireManager, analyticsController.getEmployeesAnalytics);

module.exports = router;
