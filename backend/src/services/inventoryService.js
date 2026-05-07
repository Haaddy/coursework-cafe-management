const { all, get, run, initializeDatabase } = require("../data/database");

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

async function getInventoryMovements(itemId) {
  await initializeDatabase();
  const params = [];
  let whereClause = "";
  if (itemId != null) {
    whereClause = "WHERE m.item_id = ?";
    params.push(itemId);
  }

  const rows = await all(
    `SELECT m.id, m.item_id, i.name AS item_name, m.movement_type, m.quantity, m.reason,
            m.reference_type, m.reference_id, m.created_at
     FROM inventory_movements m
     JOIN inventory_items i ON i.id = m.item_id
     ${whereClause}
     ORDER BY m.created_at DESC, m.id DESC`,
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
