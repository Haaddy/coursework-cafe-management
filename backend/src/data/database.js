const fs = require("fs");
const path = require("path");
const sqlite3 = require("sqlite3").verbose();

const DB_PATH = path.join(__dirname, "cafe.sqlite");
const LEGACY_ORDERS_PATH = path.join(__dirname, "db.json5");
const LEGACY_MENU_PATH = path.join(__dirname, "menuDB.json");

const db = new sqlite3.Database(DB_PATH);

function run(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function onRun(err) {
      if (err) return reject(err);
      return resolve(this);
    });
  });
}

function get(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) return reject(err);
      return resolve(row);
    });
  });
}

function all(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) return reject(err);
      return resolve(rows);
    });
  });
}

async function createTables() {
  await run(`
    CREATE TABLE IF NOT EXISTS menu (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      category TEXT NOT NULL,
      is_volumes INTEGER NOT NULL DEFAULT 0,
      price_json TEXT NOT NULL
    )
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS orders (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      total_price REAL NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL
    )
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS order_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id TEXT NOT NULL,
      menu_id INTEGER,
      name_snapshot TEXT NOT NULL,
      price_snapshot REAL NOT NULL,
      volume TEXT,
      FOREIGN KEY(order_id) REFERENCES orders(id) ON DELETE CASCADE,
      FOREIGN KEY(menu_id) REFERENCES menu(id) ON DELETE SET NULL
    )
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS inventory_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      item_type TEXT NOT NULL CHECK (item_type IN ('ingredient', 'finished_good')),
      unit TEXT NOT NULL DEFAULT 'pcs',
      created_at TEXT NOT NULL
    )
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS inventory_stock (
      item_id INTEGER PRIMARY KEY,
      quantity REAL NOT NULL DEFAULT 0,
      updated_at TEXT NOT NULL,
      FOREIGN KEY(item_id) REFERENCES inventory_items(id) ON DELETE CASCADE
    )
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS inventory_movements (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      item_id INTEGER NOT NULL,
      movement_type TEXT NOT NULL CHECK (movement_type IN ('in', 'out')),
      quantity REAL NOT NULL,
      reason TEXT,
      reference_type TEXT,
      reference_id TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY(item_id) REFERENCES inventory_items(id) ON DELETE CASCADE
    )
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS menu_ingredients (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      menu_id INTEGER NOT NULL,
      inventory_item_id INTEGER NOT NULL,
      qty_per_unit REAL NOT NULL CHECK (qty_per_unit > 0),
      volume TEXT,
      created_at TEXT NOT NULL,
      UNIQUE(menu_id, inventory_item_id, volume),
      FOREIGN KEY(menu_id) REFERENCES menu(id) ON DELETE CASCADE,
      FOREIGN KEY(inventory_item_id) REFERENCES inventory_items(id) ON DELETE CASCADE
    )
  `);
}

async function seedMenuIfNeeded() {
  const row = await get("SELECT COUNT(*) AS count FROM menu");
  if ((row?.count || 0) > 0) return;
  if (!fs.existsSync(LEGACY_MENU_PATH)) return;

  const raw = await fs.promises.readFile(LEGACY_MENU_PATH, "utf-8");
  const parsed = JSON.parse(raw);
  const items = parsed.products || [];

  for (const item of items) {
    await run(
      "INSERT INTO menu (name, category, is_volumes, price_json) VALUES (?, ?, ?, ?)",
      [
        item.name || "",
        item.category || "",
        item.isVolumes ? 1 : 0,
        JSON.stringify(item.price),
      ]
    );
  }
}

async function seedOrdersIfNeeded() {
  const row = await get("SELECT COUNT(*) AS count FROM orders");
  if ((row?.count || 0) > 0) return;
  if (!fs.existsSync(LEGACY_ORDERS_PATH)) return;

  const raw = await fs.promises.readFile(LEGACY_ORDERS_PATH, "utf-8");
  const parsed = JSON.parse(raw);
  const orders = parsed.orders || [];

  for (const order of orders) {
    await run(
      "INSERT INTO orders (id, name, status, total_price, created_at) VALUES (?, ?, ?, ?, ?)",
      [
        String(order.id),
        order.name || "",
        order.status || "pending",
        Number(order.totalPrice) || 0,
        order.createdAt || new Date().toISOString(),
      ]
    );

    for (const item of order.items || []) {
      await run(
        "INSERT INTO order_items (order_id, menu_id, name_snapshot, price_snapshot, volume) VALUES (?, ?, ?, ?, ?)",
        [
          String(order.id),
          Number(item.id) || null,
          item.name || "",
          Number(item.price) || 0,
          item.volume == null ? null : String(item.volume),
        ]
      );
    }
  }
}

let initPromise;
function initializeDatabase() {
  if (!initPromise) {
    initPromise = (async () => {
      await run("PRAGMA foreign_keys = ON");
      await createTables();
      await seedMenuIfNeeded();
      await seedOrdersIfNeeded();
    })();
  }
  return initPromise;
}

module.exports = { db, run, get, all, initializeDatabase };
