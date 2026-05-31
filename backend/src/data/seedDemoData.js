const DEMO_SEED_KEY = "demo_seed_v1";

const INGREDIENTS = [
  { name: "Эспрессо", itemType: "ingredient", unit: "ml", quantity: 5000 },
  { name: "Молоко", itemType: "ingredient", unit: "ml", quantity: 10000 },
  { name: "Сироп мята", itemType: "ingredient", unit: "ml", quantity: 3000 },
  { name: "Содовая", itemType: "ingredient", unit: "ml", quantity: 5000 },
  { name: "Лайм", itemType: "ingredient", unit: "pcs", quantity: 200 },
  { name: "Чизкейк", itemType: "finished_good", unit: "pcs", quantity: 50 },
];

const MENU_ITEMS = [
  {
    name: "Капучино",
    category: "coffee",
    isVolumes: true,
    price: { 250: 10, 350: 12, 500: 15 },
    recipes: [
      { ingredient: "Эспрессо", qty: 30, volume: "250" },
      { ingredient: "Молоко", qty: 200, volume: "250" },
      { ingredient: "Эспрессо", qty: 40, volume: "350" },
      { ingredient: "Молоко", qty: 280, volume: "350" },
      { ingredient: "Эспрессо", qty: 50, volume: "500" },
      { ingredient: "Молоко", qty: 380, volume: "500" },
    ],
  },
  {
    name: "Чизкейк",
    category: "dessert",
    isVolumes: false,
    price: 16,
    recipes: [{ ingredient: "Чизкейк", qty: 1, volume: null }],
  },
  {
    name: "Мохито",
    category: "drink",
    isVolumes: true,
    price: { 250: 13, 350: 15, 500: 18 },
    recipes: [
      { ingredient: "Сироп мята", qty: 20, volume: "250" },
      { ingredient: "Содовая", qty: 200, volume: "250" },
      { ingredient: "Лайм", qty: 1, volume: "250" },
      { ingredient: "Сироп мята", qty: 25, volume: "350" },
      { ingredient: "Содовая", qty: 280, volume: "350" },
      { ingredient: "Лайм", qty: 1, volume: "350" },
      { ingredient: "Сироп мята", qty: 30, volume: "500" },
      { ingredient: "Содовая", qty: 400, volume: "500" },
      { ingredient: "Лайм", qty: 2, volume: "500" },
    ],
  },
];

const DEMO_ORDERS = [
  {
    id: "demo-order-pending",
    status: "pending",
    items: [{ menuName: "Капучино", volume: "350", price: 12 }],
  },
  {
    id: "demo-order-ready",
    status: "ready",
    items: [{ menuName: "Чизкейк", volume: null, price: 16 }],
  },
  {
    id: "demo-order-paid",
    status: "paid",
    paymentMethod: "card",
    items: [{ menuName: "Мохито", volume: "250", price: 13 }],
  },
  {
    id: "demo-order-closed",
    status: "closed",
    paymentMethod: "cash",
    closedByPersonalCode: "BR-0001",
    items: [{ menuName: "Капучино", volume: "250", price: 10 }],
  },
];

async function ensureAppMetaTable(run) {
  await run(`
    CREATE TABLE IF NOT EXISTS app_meta (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    )
  `);
}

async function isDemoSeedApplied(get) {
  const row = await get("SELECT value FROM app_meta WHERE key = ?", [DEMO_SEED_KEY]);
  return Boolean(row);
}

async function markDemoSeedApplied(run) {
  await run("INSERT OR REPLACE INTO app_meta (key, value) VALUES (?, ?)", [
    DEMO_SEED_KEY,
    new Date().toISOString(),
  ]);
}

async function upsertInventoryItem(run, get, { name, itemType, unit, quantity }) {
  const existing = await get("SELECT id FROM inventory_items WHERE name = ?", [name]);
  const now = new Date().toISOString();

  if (existing) {
    return existing.id;
  }

  const insert = await run(
    "INSERT INTO inventory_items (name, item_type, unit, created_at) VALUES (?, ?, ?, ?)",
    [name, itemType, unit, now]
  );
  const itemId = insert.lastID;

  await run(
    "INSERT INTO inventory_stock (item_id, quantity, updated_at) VALUES (?, ?, ?)",
    [itemId, quantity, now]
  );
  await run(
    `INSERT INTO inventory_movements
     (item_id, movement_type, quantity, reason, reference_type, reference_id, created_at)
     VALUES (?, 'in', ?, ?, ?, ?, ?)`,
    [itemId, quantity, "demo_seed", "manual", null, now]
  );

  return itemId;
}

async function upsertMenuItem(run, get, item) {
  const existing = await get("SELECT id FROM menu WHERE name = ?", [item.name]);
  if (existing) {
    return existing.id;
  }

  const insert = await run(
    "INSERT INTO menu (name, category, is_volumes, price_json) VALUES (?, ?, ?, ?)",
    [item.name, item.category, item.isVolumes ? 1 : 0, JSON.stringify(item.price)]
  );
  return insert.lastID;
}

async function ensureMenuRecipes(run, get, menuId, recipes, inventoryByName) {
  const countRow = await get(
    "SELECT COUNT(*) AS count FROM menu_ingredients WHERE menu_id = ?",
    [menuId]
  );
  if ((countRow?.count || 0) > 0) {
    return;
  }

  const createdAt = new Date().toISOString();
  for (const recipe of recipes) {
    const inventoryItemId = inventoryByName.get(recipe.ingredient);
    if (!inventoryItemId) continue;

    await run(
      `INSERT INTO menu_ingredients (menu_id, inventory_item_id, qty_per_unit, volume, created_at)
       VALUES (?, ?, ?, ?, ?)`,
      [menuId, inventoryItemId, recipe.qty, recipe.volume, createdAt]
    );
  }
}

function normalizeOrderDateForNumber(value) {
  const parsedDate = value ? new Date(value) : new Date();
  const safeDate = Number.isNaN(parsedDate.getTime()) ? new Date() : parsedDate;
  return safeDate.toISOString().slice(0, 10).replace(/-/g, "");
}

function buildOrderNumber(dateValue, sequence) {
  const datePart = normalizeOrderDateForNumber(dateValue);
  return `${datePart}-${String(sequence).padStart(4, "0")}`;
}

async function nextDemoOrderNumber(get, createdAt) {
  const datePart = normalizeOrderDateForNumber(createdAt);
  const latestRow = await get(
    `SELECT order_number FROM orders WHERE order_number LIKE ? ORDER BY order_number DESC LIMIT 1`,
    [`${datePart}-%`]
  );
  let nextSequence = 1;
  if (latestRow?.order_number) {
    const match = new RegExp(`^${datePart}-(\\d+)$`).exec(String(latestRow.order_number));
    if (match) {
      nextSequence = Number(match[1]) + 1;
    }
  }
  return buildOrderNumber(createdAt, nextSequence);
}

async function seedDemoOrders(run, get, menuByName) {
  const baseTime = Date.now();

  for (let index = 0; index < DEMO_ORDERS.length; index += 1) {
    const demo = DEMO_ORDERS[index];
    const exists = await get("SELECT id FROM orders WHERE id = ?", [demo.id]);
    if (exists) continue;

    const createdAt = new Date(baseTime - (DEMO_ORDERS.length - index) * 60_000).toISOString();
    const orderNumber = await nextDemoOrderNumber(get, createdAt);
    const totalPrice = demo.items.reduce((sum, item) => sum + item.price, 0);
    const paidAt = demo.status === "paid" || demo.status === "closed" ? createdAt : null;

    let closedByEmployeeId = null;
    let closedAt = null;
    if (demo.status === "closed" && demo.closedByPersonalCode) {
      const employee = await get(
        "SELECT id FROM employees WHERE personal_code = ? AND status = 'active'",
        [demo.closedByPersonalCode]
      );
      closedByEmployeeId = employee?.id ?? null;
      closedAt = closedByEmployeeId ? createdAt : null;
    }

    await run(
      `INSERT INTO orders
       (id, order_number, status, total_price, payment_method, paid_at,
        closed_by_employee_id, closed_at, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        demo.id,
        orderNumber,
        demo.status,
        totalPrice,
        demo.paymentMethod ?? null,
        paidAt,
        closedByEmployeeId,
        closedAt,
        createdAt,
      ]
    );

    for (const item of demo.items) {
      const menuRow = menuByName.get(item.menuName);
      await run(
        `INSERT INTO order_items (order_id, menu_id, name_snapshot, price_snapshot, volume)
         VALUES (?, ?, ?, ?, ?)`,
        [
          demo.id,
          menuRow?.id ?? null,
          item.menuName,
          item.price,
          item.volume == null ? null : String(item.volume),
        ]
      );
    }
  }
}

async function seedDemoDataIfNeeded({ run, get }) {
  await ensureAppMetaTable(run);
  if (await isDemoSeedApplied(get)) {
    return;
  }

  const inventoryByName = new Map();
  for (const ingredient of INGREDIENTS) {
    const id = await upsertInventoryItem(run, get, ingredient);
    inventoryByName.set(ingredient.name, id);
  }

  const menuByName = new Map();
  for (const menuItem of MENU_ITEMS) {
    const menuId = await upsertMenuItem(run, get, menuItem);
    menuByName.set(menuItem.name, { id: menuId });
    await ensureMenuRecipes(run, get, menuId, menuItem.recipes, inventoryByName);
  }

  await seedDemoOrders(run, get, menuByName);
  await markDemoSeedApplied(run);

  console.log("[seed] Demo data applied (menu, inventory, recipes, sample orders).");
}

module.exports = { seedDemoDataIfNeeded, DEMO_SEED_KEY };
