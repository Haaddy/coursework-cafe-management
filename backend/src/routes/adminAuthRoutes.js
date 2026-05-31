const express = require("express");
const router = express.Router();

const adminAuthController = require("../controllers/adminAuthController");
const { requireManager } = require("../middleware/requireManager");

router.post("/login", adminAuthController.login); // ! маршрут логина
router.get("/me", requireManager, adminAuthController.me); // ! маршрут получения информации о текущем менеджере
router.post("/logout", requireManager, adminAuthController.logout); // ! маршрут выхода из системы

module.exports = router;
