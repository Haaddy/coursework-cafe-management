const fs = require("fs");
const path = require("path");
const sqlite3 = require("sqlite3").verbose();
const { seedDemoDataIfNeeded } = require("./seedDemoData");

const DB_PATH = path.join(__dirname, "cafe.sqlite");
const LEGACY_ORDERS_PATH = path.join(__dirname, "db.json5");
const LEGACY_MENU_PATH = path.join(__dirname, "menuDB.json");

const db = new sqlite3.Database(DB_PATH); 

function run(sql, params = []) { // ! функция выполнения SQL запроса
  return new Promise((resolve, reject) => {
    db.run(sql, params, function onRun(err) { // ! функция выполнения SQL запроса
      if (err) return reject(err); // ! отправка ошибки если запрос не выполнен
      return resolve(this); // ! возвращение результата запроса
    });
  });
}

function get(sql, params = []) { // ! функция получения одной строки
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => { // ! функция получения одной строки
      if (err) return reject(err); // ! отправка ошибки если запрос не выполнен
      return resolve(row); // ! возвращение результата запроса
    });
  });
}

function all(sql, params = []) { // ! функция получения всех строк
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => { // ! функция получения всех строк
      if (err) return reject(err); // ! отправка ошибки если запрос не выполнен
      return resolve(rows); // ! возвращение результата запроса
    });
  });
}

function normalizeOrderDateForNumber(value) { // ! функция нормализации даты для номера заказа
  const parsedDate = value ? new Date(value) : new Date(); // ! получение даты
  const safeDate = Number.isNaN(parsedDate.getTime()) ? new Date() : parsedDate; // ! получение безопасной даты
  return safeDate.toISOString().slice(0, 10).replace(/-/g, ""); // ! возвращение безопасной даты
}

function buildOrderNumber(dateValue, sequence) { // ! функция построения номера заказа
  const datePart = normalizeOrderDateForNumber(dateValue); // ! получение даты
  return `${datePart}-${String(sequence).padStart(4, "0")}`; // ! возвращение номера заказа
}

async function createTables() { // ! функция создания таблиц
  // ! создание таблицы menu
  await run(`
    CREATE TABLE IF NOT EXISTS menu (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      category TEXT NOT NULL,
      is_volumes INTEGER NOT NULL DEFAULT 0,
      price_json TEXT NOT NULL
    )
  `);

  // ! создание таблицы orders
  await run(`
    CREATE TABLE IF NOT EXISTS orders (
      id TEXT PRIMARY KEY,
      order_number TEXT UNIQUE,
      status TEXT NOT NULL DEFAULT 'pending',
      total_price REAL NOT NULL DEFAULT 0,
      payment_method TEXT,
      paid_at TEXT,
      closed_by_employee_id INTEGER,
      closed_at TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY(closed_by_employee_id) REFERENCES employees(id) ON DELETE SET NULL
    )
  `);

  // ! создание таблицы order_items
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

  // ! создание таблицы inventory_items
  await run(`
    CREATE TABLE IF NOT EXISTS inventory_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      item_type TEXT NOT NULL CHECK (item_type IN ('ingredient', 'finished_good')),
      unit TEXT NOT NULL DEFAULT 'pcs',
      created_at TEXT NOT NULL
    )
  `);

  // ! создание таблицы inventory_stock
  await run(`
    CREATE TABLE IF NOT EXISTS inventory_stock (
      item_id INTEGER PRIMARY KEY,
      quantity REAL NOT NULL DEFAULT 0,
      updated_at TEXT NOT NULL,
      FOREIGN KEY(item_id) REFERENCES inventory_items(id) ON DELETE CASCADE
    )
  `);

  // ! создание таблицы inventory_movements
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

  // ! создание таблицы menu_ingredients
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

  // ! создание таблицы employees
  await run(`
    CREATE TABLE IF NOT EXISTS employees (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      full_name TEXT NOT NULL,
      position TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'vacation', 'dismissed')),
      personal_code TEXT NOT NULL UNIQUE,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )
  `);
}

async function ensureOrdersSchema() { // ! функция проверки схемы заказов
  const columns = await all("PRAGMA table_info(orders)");
  const columnNames = new Set(columns.map((column) => column.name));

  if (!columnNames.has("order_number")) { // ! если колонка order_number не найдена
    await run("ALTER TABLE orders ADD COLUMN order_number TEXT");
  }
  if (!columnNames.has("payment_method")) { // ! если колонка payment_method не найдена
    await run("ALTER TABLE orders ADD COLUMN payment_method TEXT");
  }
  if (!columnNames.has("paid_at")) { // ! если колонка paid_at не найдена
    await run("ALTER TABLE orders ADD COLUMN paid_at TEXT");
  }
  if (!columnNames.has("closed_by_employee_id")) { // ! если колонка closed_by_employee_id не найдена       
    await run("ALTER TABLE orders ADD COLUMN closed_by_employee_id INTEGER");
  }
  if (!columnNames.has("closed_at")) { // ! если колонка closed_at не найдена
    await run("ALTER TABLE orders ADD COLUMN closed_at TEXT");
  }
  if (columnNames.has("name")) { // ! если колонка name найдена
    await run("ALTER TABLE orders DROP COLUMN name");
  }

  await run("CREATE UNIQUE INDEX IF NOT EXISTS idx_orders_order_number ON orders(order_number)"); // ! создание уникального индекса на колонку order_number
  await run("CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at)"); // ! создание индекса на колонку created_at
  await run("CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status)"); // ! создание индекса на колонку status
}

async function backfillMissingOrderNumbers() { // ! функция заполнения отсутствующих номеров заказов
  const countersByDate = new Map(); // ! создание массива счетчиков по дате
  const existingNumbers = await all( // ! получение всех номеров заказов
    `SELECT order_number
     FROM orders
     WHERE order_number IS NOT NULL
       AND TRIM(order_number) <> ''`
  );

  for (const row of existingNumbers) {
    const match = /^(\d{8})-(\d+)$/.exec(String(row.order_number)); // ! получение номера заказа
    if (!match) continue;
    const [, datePart, sequenceValue] = match; // ! получение даты и порядкового номера
    const sequence = Number(sequenceValue);
    const currentMax = countersByDate.get(datePart) || 0;
    if (sequence > currentMax) { // ! если порядковый номер больше текущего максимального
      countersByDate.set(datePart, sequence);
    }
  }

  const missingRows = await all( // ! получение всех строк без номера заказа
    `SELECT id, created_at
     FROM orders
     WHERE order_number IS NULL
       OR TRIM(order_number) = ''
     ORDER BY created_at ASC, id ASC`
  );

  for (const row of missingRows) {
    const datePart = normalizeOrderDateForNumber(row.created_at); // ! получение даты
    const nextSequence = (countersByDate.get(datePart) || 0) + 1;
    countersByDate.set(datePart, nextSequence); // ! установка нового порядкового номера
    const orderNumber = buildOrderNumber(row.created_at, nextSequence); // ! построение номера заказа
    await run("UPDATE orders SET order_number = ? WHERE id = ?", [orderNumber, row.id]); // ! обновление номера заказа
  }
}

async function seedMenuIfNeeded() { // ! функция заполнения меню
  const row = await get("SELECT COUNT(*) AS count FROM menu");
  if ((row?.count || 0) > 0) return;
  if (!fs.existsSync(LEGACY_MENU_PATH)) return; // ! если файл меню не найден

  const raw = await fs.promises.readFile(LEGACY_MENU_PATH, "utf-8");
  const parsed = JSON.parse(raw); // ! парсинг файла меню
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
      "INSERT INTO orders (id, status, total_price, created_at) VALUES (?, ?, ?, ?)",
      [
        String(order.id),
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

let initPromise; // ! promise инициализации базы данных
function initializeDatabase() {
  if (!initPromise) { // ! если promise инициализации базы данных не создан
    initPromise = (async () => { // ! создание promise инициализации базы данных
      await run("PRAGMA foreign_keys = ON"); // ! включение внешних ключей
      await createTables();
      await ensureOrdersSchema();
      await seedMenuIfNeeded();
      await seedOrdersIfNeeded();
      await seedDemoDataIfNeeded({ run, get });
      await backfillMissingOrderNumbers();
    })();
  }
  return initPromise; // ! возвращение promise инициализации базы данных
}

module.exports = { db, run, get, all, initializeDatabase };
