const express = require("express");
const router = express.Router();


const menuController = require("../controllers/menuController");
const { requireManager } = require("../middleware/requireManager");

router.get("/", menuController.getMenu);
router.get("/:id/ingredients", requireManager, menuController.getMenuIngredients);
router.post("/", requireManager, menuController.createMenuItem);
router.put("/:id/ingredients", requireManager, menuController.replaceMenuIngredients);
router.patch("/:id", requireManager, menuController.updateMenuItem);
router.delete("/:id", requireManager, menuController.deleteMenuItem);



module.exports = router;