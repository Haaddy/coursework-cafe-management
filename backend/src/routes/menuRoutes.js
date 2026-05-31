const express = require("express");
const router = express.Router();


const menuController = require("../controllers/menuController");
const { requireManager } = require("../middleware/requireManager");

router.get("/", menuController.getMenu); // ! маршрут получения списка меню 
router.get("/:id/ingredients", requireManager, menuController.getMenuIngredients); // ! маршрут получения рецепта меню
router.post("/", requireManager, menuController.createMenuItem); // ! маршрут создания меню
router.put("/:id/ingredients", requireManager, menuController.replaceMenuIngredients); // ! маршрут замены рецепта меню
router.patch("/:id", requireManager, menuController.updateMenuItem); // ! маршрут обновления меню
router.delete("/:id", requireManager, menuController.deleteMenuItem); // ! маршрут удаления меню



module.exports = router;