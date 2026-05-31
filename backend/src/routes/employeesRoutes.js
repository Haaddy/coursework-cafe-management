const express = require("express");
const router = express.Router();

const employeesController = require("../controllers/employeesController");
const { requireManager } = require("../middleware/requireManager");

router.get("/", requireManager, employeesController.getEmployees); // ! маршрут получения списка сотрудников
router.post("/", requireManager, employeesController.createEmployee); // ! маршрут создания сотрудника
router.put("/:id", requireManager, employeesController.updateEmployee); // ! маршрут обновления сотрудника
router.delete("/:id", requireManager, employeesController.deleteEmployee); // ! маршрут удаления сотрудника

module.exports = router;