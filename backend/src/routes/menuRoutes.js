const express = require("express");
const router = express.Router();


const menuController = require("../controllers/menuController");

router.get("/", menuController.getMenu);
router.post("/", menuController.createMenuItem);
router.patch("/:id", menuController.updateMenuItem);
router.delete("/:id", menuController.deleteMenuItem);



module.exports = router;