const express = require("express");
const router = express.Router();

const inventoryController = require("../controllers/inventoryController");
const { requireManager } = require("../middleware/requireManager");

router.get("/", requireManager, inventoryController.getInventoryItems);
router.get("/movements", requireManager, inventoryController.getInventoryMovements);
router.post("/", requireManager, inventoryController.createInventoryItem);
router.patch("/:id/restock", requireManager, inventoryController.restockInventoryItem);
router.delete("/:id", requireManager, inventoryController.deleteInventoryItem);

module.exports = router;
