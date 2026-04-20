const express = require("express");
const router = express.Router();

const adminAuthController = require("../controllers/adminAuthController");

router.post("/unlock", adminAuthController.unlock);
router.post("/", adminAuthController.unlock);

module.exports = router;