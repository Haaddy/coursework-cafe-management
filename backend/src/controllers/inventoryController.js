const inventoryService = require("../services/inventoryService");

async function getInventoryItems(req, res) { // ! функция получения списка склада
  const items = await inventoryService.getInventoryItems(); // ! получение списка склада
  res.json(items);
}

async function createInventoryItem(req, res) { // ! функция создания склада
  try {
    const { name, itemType, unit, quantity } = req.body || {}; // ! получение данных из тела запроса
    if (!name || typeof name !== "string") { // ! отправка ошибки если название не указано
      return res.status(400).json({ error: "name is required" });
    }
    if (itemType !== "ingredient" && itemType !== "finished_good") { // ! отправка ошибки если тип не указан
      return res
        .status(400)
        .json({ error: "itemType must be ingredient or finished_good" });
    }

    const item = await inventoryService.createInventoryItem({ // ! создание склада
      name: name.trim(), // ! название склада
      itemType, // ! тип склада
      unit: typeof unit === "string" && unit.trim() ? unit.trim() : "pcs",
      quantity, // ! количество склада
    });
    return res.status(201).json(item); // ! отправка склада
  } catch (err) {
    if (String(err.message || "").includes("UNIQUE constraint failed")) { // ! отправка ошибки если склад с таким названием уже существует
      return res.status(409).json({ error: "Item with this name already exists" });
    }
    return res.status(500).json({ error: err.message || "Failed to create item" });
  }
}

async function restockInventoryItem(req, res) { // ! функция пополнения склада
  try {
    const { id } = req.params; // ! получение ID из параметров запроса
    const { quantity, reason } = req.body || {}; // ! получение данных из тела запроса
    const item = await inventoryService.restockInventoryItem(id, quantity, reason); // ! пополнение склада
    return res.json(item);
  } catch (err) {
    if (err.message === "Inventory item not found") { // ! отправка ошибки если склад не найден
      return res.status(404).json({ error: err.message });
    }
    if (err.message === "Quantity must be a positive number") { // ! отправка ошибки если количество не является положительным числом
      return res.status(400).json({ error: err.message });
    }
    return res.status(500).json({ error: err.message || "Failed to restock item" });
  }
}

async function deleteInventoryItem(req, res) { // ! функция удаления склада
  try {
    const { id } = req.params; // ! получение ID из параметров запроса
    const deleted = await inventoryService.deleteInventoryItem(id); // ! удаление склада
    return res.json(deleted);
  } catch (err) {
    if (err.message === "Inventory item not found") { // ! отправка ошибки если склад не найден
      return res.status(404).json({ error: err.message });
    }
    return res.status(500).json({ error: err.message || "Failed to delete item" });
  }
}

async function getInventoryMovements(req, res) { // ! функция получения истории движений склада
  try {
    const { itemId, from, to, movementType, referenceType, limit } = req.query; // ! получение данных из query-параметров
    const movements = await inventoryService.getInventoryMovements({ // ! получение истории движений склада
      itemId, // ! ID товара
      from, // ! дата начала
      to, // ! дата конца
      movementType, // ! тип движения
      referenceType, // ! тип ссылки
      limit, // ! лимит
    });
    res.json(movements); // ! отправка истории движений склада
  } catch (err) {
    const message = err.message || "Failed to load movements"; // ! отправка ошибки если не удалось загрузить историю движений склада
    const status =
      message.includes("must be") || message.includes("Invalid") || message.includes("required")
        ? 400
        : 500;
    res.status(status).json({ error: message });
  }
}

module.exports = {
  getInventoryItems,
  createInventoryItem,
  restockInventoryItem,
  deleteInventoryItem,
  getInventoryMovements,
};
