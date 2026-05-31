const express = require("express");
const router = express.Router();

const inventoryController = require("../controllers/inventoryController");
const { requireManager } = require("../middleware/requireManager");

router.get("/", requireManager, inventoryController.getInventoryItems); // ! маршрут получения списка товаров
router.get("/movements", requireManager, inventoryController.getInventoryMovements); // ! маршрут получения списка движений товаров
router.post("/", requireManager, inventoryController.createInventoryItem); // ! маршрут создания товара
router.patch("/:id/restock", requireManager, inventoryController.restockInventoryItem); // ! маршрут пополнения товара
router.delete("/:id", requireManager, inventoryController.deleteInventoryItem); // ! маршрут удаления товара

module.exports = router;
