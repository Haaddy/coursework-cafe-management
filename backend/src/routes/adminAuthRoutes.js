const express = require("express");
const router = express.Router();

const adminAuthController = require("../controllers/adminAuthController");
const { requireManager } = require("../middleware/requireManager");

router.post("/login", adminAuthController.login);
router.get("/me", requireManager, adminAuthController.me);
router.post("/logout", requireManager, adminAuthController.logout);

module.exports = router;
