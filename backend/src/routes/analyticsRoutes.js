const express = require("express");
const router = express.Router();

const analyticsController = require("../controllers/analyticsController"); 
const { requireManager } = require("../middleware/requireManager");

router.get("/orders", requireManager, analyticsController.getOrdersAnalytics); // ! маршрут получения статистики заказов
router.get("/employees", requireManager, analyticsController.getEmployeesAnalytics); // ! маршрут получения статистики сотрудников

module.exports = router;
