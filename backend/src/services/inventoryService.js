const { all, get, run, initializeDatabase } = require("../data/database");
const { parseOptionalDateBounds } = require("../utils/parseDateBounds");

function mapInventoryRow(row) {
  return {
    id: row.id,
    name: row.name,
    itemType: row.item_type,
    unit: row.unit,
    quantity: Number(row.quantity || 0),
    updatedAt: row.updated_at,
  };
}

async function getInventoryItems() {
  await initializeDatabase();
  const rows = await all(
    `SELECT i.id, i.name, i.item_type, i.unit, s.quantity, s.updated_at
     FROM inventory_items i
     LEFT JOIN inventory_stock s ON s.item_id = i.id
     ORDER BY i.name ASC`
  );

  return rows.map(mapInventoryRow);
}

async function createInventoryItem({ name, itemType, unit, quantity = 0 }) {
  await initializeDatabase();
  const createdAt = new Date().toISOString();
  const normalizedQty = Number(quantity) || 0;

  const insertItem = await run(
    "INSERT INTO inventory_items (name, item_type, unit, created_at) VALUES (?, ?, ?, ?)",
    [name, itemType, unit || "pcs", createdAt]
  );

  await run(
    "INSERT INTO inventory_stock (item_id, quantity, updated_at) VALUES (?, ?, ?)",
    [insertItem.lastID, normalizedQty, createdAt]
  );

  if (normalizedQty > 0) {
    await run(
      `INSERT INTO inventory_movements
       (item_id, movement_type, quantity, reason, reference_type, reference_id, created_at)
       VALUES (?, 'in', ?, ?, ?, ?, ?)`,
      [insertItem.lastID, normalizedQty, "initial_stock", "manual", null, createdAt]
    );
  }

  const row = await get(
    `SELECT i.id, i.name, i.item_type, i.unit, s.quantity, s.updated_at
     FROM inventory_items i
     JOIN inventory_stock s ON s.item_id = i.id
     WHERE i.id = ?`,
    [insertItem.lastID]
  );
  return mapInventoryRow(row);
}

async function restockInventoryItem(id, quantity, reason) {
  await initializeDatabase();
  const item = await get("SELECT id FROM inventory_items WHERE id = ?", [id]);
  if (!item) throw new Error("Inventory item not found");

  const qty = Number(quantity);
  if (!Number.isFinite(qty) || qty <= 0) {
    throw new Error("Quantity must be a positive number");
  }

  const now = new Date().toISOString();
  await run(
    "UPDATE inventory_stock SET quantity = quantity + ?, updated_at = ? WHERE item_id = ?",
    [qty, now, id]
  );
  await run(
    `INSERT INTO inventory_movements
     (item_id, movement_type, quantity, reason, reference_type, reference_id, created_at)
     VALUES (?, 'in', ?, ?, ?, ?, ?)`,
    [id, qty, reason || "restock", "manual", null, now]
  );

  const row = await get(
    `SELECT i.id, i.name, i.item_type, i.unit, s.quantity, s.updated_at
     FROM inventory_items i
     JOIN inventory_stock s ON s.item_id = i.id
     WHERE i.id = ?`,
    [id]
  );
  return mapInventoryRow(row);
}

async function deleteInventoryItem(id) {
  await initializeDatabase();
  const row = await get(
    `SELECT i.id, i.name, i.item_type, i.unit, s.quantity, s.updated_at
     FROM inventory_items i
     LEFT JOIN inventory_stock s ON s.item_id = i.id
     WHERE i.id = ?`,
    [id]
  );
  if (!row) throw new Error("Inventory item not found");

  await run("DELETE FROM inventory_items WHERE id = ?", [id]);
  return mapInventoryRow(row);
}

const DEFAULT_MOVEMENTS_LIMIT = 500;
const MAX_MOVEMENTS_LIMIT = 2000;

function assertMovementType(raw) {
  if (raw == null || String(raw).trim() === "") {
    return null;
  }
  const v = String(raw).toLowerCase();
  if (v !== "in" && v !== "out") {
    throw new Error("movementType must be in or out");
  }
  return v;
}

function parseMovementsLimit(raw) {
  if (raw == null || String(raw).trim() === "") {
    return DEFAULT_MOVEMENTS_LIMIT;
  }
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 1) {
    throw new Error("limit must be a positive number");
  }
  return Math.min(Math.floor(n), MAX_MOVEMENTS_LIMIT);
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
async function getInventoryMovements(filters = {}) {
  await initializeDatabase();

  const { fromIso, toIso } = parseOptionalDateBounds(filters.from, filters.to);
  const movementType = assertMovementType(filters.movementType);
  const limit = parseMovementsLimit(filters.limit);

  const clauses = [];
  const params = [];

  if (filters.itemId != null && String(filters.itemId).trim() !== "") {
    const id = Number(filters.itemId);
    if (!Number.isFinite(id)) {
      throw new Error("itemId must be a number");
    }
    clauses.push("m.item_id = ?");
    params.push(id);
  }

  if (fromIso) {
    clauses.push("datetime(m.created_at) >= datetime(?)");
    params.push(fromIso);
  }
  if (toIso) {
    clauses.push("datetime(m.created_at) <= datetime(?)");
    params.push(toIso);
  }
  if (movementType) {
    clauses.push("m.movement_type = ?");
    params.push(movementType);
  }
  if (filters.referenceType != null && String(filters.referenceType).trim() !== "") {
    clauses.push("m.reference_type = ?");
    params.push(String(filters.referenceType).trim());
  }

  const whereClause = clauses.length > 0 ? `WHERE ${clauses.join(" AND ")}` : "";

  params.push(limit);

  const rows = await all(
    `SELECT m.id, m.item_id, i.name AS item_name, m.movement_type, m.quantity, m.reason,
            m.reference_type, m.reference_id, m.created_at
     FROM inventory_movements m
     JOIN inventory_items i ON i.id = m.item_id
     ${whereClause}
     ORDER BY m.created_at DESC, m.id DESC
     LIMIT ?`,
    params
  );

  return rows.map((row) => ({
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

module.exports = {
  getInventoryItems,
  createInventoryItem,
  restockInventoryItem,
  deleteInventoryItem,
  getInventoryMovements,
};
