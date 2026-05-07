const express = require("express");
const router = express.Router();


const menuController = require("../controllers/menuController");

router.get("/", menuController.getMenu);
router.get("/:id/ingredients", menuController.getMenuIngredients);
router.post("/", menuController.createMenuItem);
router.put("/:id/ingredients", menuController.replaceMenuIngredients);
router.patch("/:id", menuController.updateMenuItem);
router.delete("/:id", menuController.deleteMenuItem);



module.exports = router;