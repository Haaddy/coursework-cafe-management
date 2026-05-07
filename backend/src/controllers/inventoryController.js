const inventoryService = require("../services/inventoryService");

async function getInventoryItems(req, res) {
  const items = await inventoryService.getInventoryItems();
  res.json(items);
}

async function createInventoryItem(req, res) {
  try {
    const { name, itemType, unit, quantity } = req.body || {};
    if (!name || typeof name !== "string") {
      return res.status(400).json({ error: "name is required" });
    }
    if (itemType !== "ingredient" && itemType !== "finished_good") {
      return res
        .status(400)
        .json({ error: "itemType must be ingredient or finished_good" });
    }

    const item = await inventoryService.createInventoryItem({
      name: name.trim(),
      itemType,
      unit: typeof unit === "string" && unit.trim() ? unit.trim() : "pcs",
      quantity,
    });
    return res.status(201).json(item);
  } catch (err) {
    if (String(err.message || "").includes("UNIQUE constraint failed")) {
      return res.status(409).json({ error: "Item with this name already exists" });
    }
    return res.status(500).json({ error: err.message || "Failed to create item" });
  }
}

async function restockInventoryItem(req, res) {
  try {
    const { id } = req.params;
    const { quantity, reason } = req.body || {};
    const item = await inventoryService.restockInventoryItem(id, quantity, reason);
    return res.json(item);
  } catch (err) {
    if (err.message === "Inventory item not found") {
      return res.status(404).json({ error: err.message });
    }
    if (err.message === "Quantity must be a positive number") {
      return res.status(400).json({ error: err.message });
    }
    return res.status(500).json({ error: err.message || "Failed to restock item" });
  }
}

async function deleteInventoryItem(req, res) {
  try {
    const { id } = req.params;
    const deleted = await inventoryService.deleteInventoryItem(id);
    return res.json(deleted);
  } catch (err) {
    if (err.message === "Inventory item not found") {
      return res.status(404).json({ error: err.message });
    }
    return res.status(500).json({ error: err.message || "Failed to delete item" });
  }
}

async function getInventoryMovements(req, res) {
  const itemId = req.query.itemId;
  const movements = await inventoryService.getInventoryMovements(itemId);
  res.json(movements);
}

module.exports = {
  getInventoryItems,
  createInventoryItem,
  restockInventoryItem,
  deleteInventoryItem,
  getInventoryMovements,
};
