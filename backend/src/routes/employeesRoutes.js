const express = require("express");
const router = express.Router();

const employeesController = require("../controllers/employeesController");
const { requireManager } = require("../middleware/requireManager");

router.get("/", requireManager, employeesController.getEmployees);
router.post("/", requireManager, employeesController.createEmployee);
router.put("/:id", requireManager, employeesController.updateEmployee);
router.delete("/:id", requireManager, employeesController.deleteEmployee);

module.exports = router;