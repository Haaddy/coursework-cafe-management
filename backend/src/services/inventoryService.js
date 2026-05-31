const { all, get, run, initializeDatabase } = require("../data/database");
const { parseOptionalDateBounds } = require("../utils/parseDateBounds");

function mapInventoryRow(row) { // ! функция преобразования строки склада в объект
  return {
    id: row.id,
    name: row.name,
    itemType: row.item_type,
    unit: row.unit,
    quantity: Number(row.quantity || 0),
    updatedAt: row.updated_at,
  };
}

async function getInventoryItems() { // ! функция получения списка товаров на складе
  await initializeDatabase();
  const rows = await all(
    `SELECT i.id, i.name, i.item_type, i.unit, s.quantity, s.updated_at
     FROM inventory_items i
     LEFT JOIN inventory_stock s ON s.item_id = i.id
     ORDER BY i.name ASC`
  );

  return rows.map(mapInventoryRow); // ! возвращение списка товаров на складе
}

async function createInventoryItem({ name, itemType, unit, quantity = 0 }) { // ! функция создания товара на складе
  await initializeDatabase();
  const createdAt = new Date().toISOString(); // ! получение даты создания
  const normalizedQty = Number(quantity) || 0; // ! получение нормализованного количества

  const insertItem = await run( // ! добавление товара в базу данных
    "INSERT INTO inventory_items (name, item_type, unit, created_at) VALUES (?, ?, ?, ?)",
    [name, itemType, unit || "pcs", createdAt]
  );

  await run( // ! добавление товара в базу данных
    "INSERT INTO inventory_stock (item_id, quantity, updated_at) VALUES (?, ?, ?)",
    [insertItem.lastID, normalizedQty, createdAt]
  );

  if (normalizedQty > 0) { // ! если количество товара больше 0
    await run( // ! добавление товара в базу данных
      `INSERT INTO inventory_movements
       (item_id, movement_type, quantity, reason, reference_type, reference_id, created_at)
       VALUES (?, 'in', ?, ?, ?, ?, ?)`,
      [insertItem.lastID, normalizedQty, "initial_stock", "manual", null, createdAt]
    );
  }

  const row = await get( // ! получение товара
    `SELECT i.id, i.name, i.item_type, i.unit, s.quantity, s.updated_at
     FROM inventory_items i
     JOIN inventory_stock s ON s.item_id = i.id
     WHERE i.id = ?`,
    [insertItem.lastID]
  );
  return mapInventoryRow(row); // ! возвращение товара
}

async function restockInventoryItem(id, quantity, reason) { // ! функция пополнения остатка товара
  await initializeDatabase();
  const item = await get("SELECT id FROM inventory_items WHERE id = ?", [id]); // ! получение товара
  if (!item) throw new Error("Inventory item not found");

  const qty = Number(quantity); // ! получение нормализованного количества
  if (!Number.isFinite(qty) || qty <= 0) {
    throw new Error("Quantity must be a positive number"); // ! отправка ошибки если количество товара не является положительным числом
  }

  const now = new Date().toISOString(); // ! получение даты создания
  await run( // ! обновление остатка товара в базе данных
    "UPDATE inventory_stock SET quantity = quantity + ?, updated_at = ? WHERE item_id = ?",
    [qty, now, id]
  );
  await run( // ! добавление движения товара в базу данных
    `INSERT INTO inventory_movements
     (item_id, movement_type, quantity, reason, reference_type, reference_id, created_at)
     VALUES (?, 'in', ?, ?, ?, ?, ?)`,
    [id, qty, reason || "restock", "manual", null, now]
  );

  const row = await get( // ! получение товара
    `SELECT i.id, i.name, i.item_type, i.unit, s.quantity, s.updated_at
     FROM inventory_items i
     JOIN inventory_stock s ON s.item_id = i.id
     WHERE i.id = ?`,
    [id]
  );
  return mapInventoryRow(row); // ! возвращение товара
}

async function deleteInventoryItem(id) { // ! функция удаления товара
  await initializeDatabase();
  const row = await get( // ! получение товара
    `SELECT i.id, i.name, i.item_type, i.unit, s.quantity, s.updated_at
     FROM inventory_items i
     LEFT JOIN inventory_stock s ON s.item_id = i.id
     WHERE i.id = ?`,
    [id]
  );
  if (!row) throw new Error("Inventory item not found"); // ! отправка ошибки если товар не найден

  await run("DELETE FROM inventory_items WHERE id = ?", [id]);
  return mapInventoryRow(row); // ! возвращение товара
}

const DEFAULT_MOVEMENTS_LIMIT = 500; // ! значение по умолчанию для лимита движений
const MAX_MOVEMENTS_LIMIT = 2000; // ! максимальное значение для лимита движений  

function assertMovementType(raw) { // ! функция проверки типа движения
  if (raw == null || String(raw).trim() === "") {
    return null;
  }
  const v = String(raw).toLowerCase(); 
  if (v !== "in" && v !== "out") {
    throw new Error("movementType must be in or out"); // ! отправка ошибки если тип движения не валиден
  }
  return v;
}

function parseMovementsLimit(raw) { // ! функция парсинга лимита движений
  if (raw == null || String(raw).trim() === "") {
    return DEFAULT_MOVEMENTS_LIMIT; // ! возвращение значения по умолчанию для лимита движений
  }
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 1) {
    throw new Error("limit must be a positive number"); // ! отправка ошибки если лимит движений не является положительным числом
  }
  return Math.min(Math.floor(n), MAX_MOVEMENTS_LIMIT); // ! возвращение минимального значения для лимита движений
}

/**
 * @param {object} filters
 * @param {string|number|undefined} filters.itemId
 * @param {string|undefined} filters.from
 * @param {string|undefined} filters.to
 * @param {string|undefined} filters.movementType — in | out
 * @param {string|undefined} filters.referenceType — например order, manual
 * @param {string|number|undefined} filters.limit — по умолчанию 500, макс. 2000
 */
async function getInventoryMovements(filters = {}) { // ! функция получения истории движений склада
  await initializeDatabase();

  const { fromIso, toIso } = parseOptionalDateBounds(filters.from, filters.to); // ! получение даты начала и конца
  const movementType = assertMovementType(filters.movementType);
  const limit = parseMovementsLimit(filters.limit); // ! получение лимита движений

  const clauses = []; // ! массив условий
  const params = []; // ! массив параметров

  if (filters.itemId != null && String(filters.itemId).trim() !== "") {
    const id = Number(filters.itemId); // ! получение ID товара
    if (!Number.isFinite(id)) {
      throw new Error("itemId must be a number"); // ! отправка ошибки если ID товара не является числом
    }
    clauses.push("m.item_id = ?");
    params.push(id); // ! добавление параметра в массив параметров
  }

  if (fromIso) {
    clauses.push("datetime(m.created_at) >= datetime(?)"); // ! добавление условия в массив условий
    params.push(fromIso); // ! добавление параметра в массив параметров
  }
  if (toIso) { // ! если дата конца не пустая
    clauses.push("datetime(m.created_at) <= datetime(?)");
    params.push(toIso); // ! добавление параметра в массив параметров
  }
  if (movementType) { // ! если тип движения не пустой
    clauses.push("m.movement_type = ?");
    params.push(movementType); // ! добавление параметра в массив параметров
  }
  if (filters.referenceType != null && String(filters.referenceType).trim() !== "") { // ! если тип ссылки не пустой
    clauses.push("m.reference_type = ?");
    params.push(String(filters.referenceType).trim()); // ! добавление параметра в массив параметров
  }

  const whereClause = clauses.length > 0 ? `WHERE ${clauses.join(" AND ")}` : ""; // ! получение условия WHERE

  params.push(limit); // ! добавление параметра в массив параметров

  const rows = await all( // ! получение строк движений
    `SELECT m.id, m.item_id, i.name AS item_name, m.movement_type, m.quantity, m.reason,
            m.reference_type, m.reference_id, m.created_at
     FROM inventory_movements m
     JOIN inventory_items i ON i.id = m.item_id
     ${whereClause}
     ORDER BY m.created_at DESC, m.id DESC
     LIMIT ?`,
    params
  );

  return rows.map((row) => ({ // ! возвращение истории движений
    id: row.id,
    itemId: row.item_id,
    itemName: row.item_name,
    movementType: row.movement_type,
    quantity: Number(row.quantity),
    reason: row.reason,
    referenceType: row.reference_type,
    referenceId: row.reference_id,
    createdAt: row.created_at,
  }));
}

module.exports = { // ! экспорт функций
  getInventoryItems,
  createInventoryItem, // ! функция создания товара на складе
  restockInventoryItem, // ! функция пополнения остатка товара
  deleteInventoryItem, // ! функция удаления товара
  getInventoryMovements, // ! функция получения истории движений склада
};
