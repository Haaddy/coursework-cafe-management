const express = require("express");
const router = express.Router();

const inventoryController = require("../controllers/inventoryController");

router.get("/", inventoryController.getInventoryItems);
router.get("/movements", inventoryController.getInventoryMovements);
router.post("/", inventoryController.createInventoryItem);
router.patch("/:id/restock", inventoryController.restockInventoryItem);
router.delete("/:id", inventoryController.deleteInventoryItem);

module.exports = router;
