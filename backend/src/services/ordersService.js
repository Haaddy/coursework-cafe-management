const crypto = require("crypto");
const { all, get, run, initializeDatabase } = require("../data/database");

function mapOrderRowToBase(orderRow) {
    return {
        id: orderRow.id,
        name: orderRow.name,
        status: orderRow.status,
        totalPrice: Number(orderRow.total_price),
        createdAt: orderRow.created_at,
    };
}

async function hydrateOrder(orderRow) {
    const itemsRows = await all(
        `SELECT menu_id, name_snapshot, price_snapshot, volume
         FROM order_items
         WHERE order_id = ?
         ORDER BY id ASC`,
        [orderRow.id]
    );

    return {
        ...mapOrderRowToBase(orderRow),
        items: itemsRows.map((item) => ({
            id: item.menu_id,
            name: item.name_snapshot,
            price: Number(item.price_snapshot),
            volume: item.volume,
        })),
    };
}


async function getOrders() {
    await initializeDatabase();
    const orderRows = await all(
        "SELECT id, name, status, total_price, created_at FROM orders ORDER BY created_at DESC"
    );
    return Promise.all(orderRows.map(hydrateOrder));
}

async function getOrderById(id) {
    await initializeDatabase();
    const orderRow = await get(
        "SELECT id, name, status, total_price, created_at FROM orders WHERE id = ?",
        [String(id)]
    );
    if (!orderRow) {
        throw new Error("Order not found");
    }
    return hydrateOrder(orderRow);
}

async function createOrder(name, cart) {
    await initializeDatabase();

    const totalPrice = cart.reduce((acc, item) => acc + Number(item.price), 0);
    const orderId = crypto.randomUUID?.() || String(Date.now());
    const createdAt = new Date().toISOString();

    await run(
        "INSERT INTO orders (id, name, status, total_price, created_at) VALUES (?, ?, ?, ?, ?)",
        [orderId, name, "pending", totalPrice, createdAt]
    );

    for (const item of cart) {
        await run(
            "INSERT INTO order_items (order_id, menu_id, name_snapshot, price_snapshot, volume) VALUES (?, ?, ?, ?, ?)",
            [
                orderId,
                Number(item.id) || null,
                item.name || "",
                Number(item.price) || 0,
                item.volume == null ? null : String(item.volume),
            ]
        );
    }

    return getOrderById(orderId);
}

async function updateOrderStatus(id, status) {
    await initializeDatabase();
    const existing = await get("SELECT id FROM orders WHERE id = ?", [String(id)]);
    if (!existing) {
        throw new Error("Order not found");
    }

    await run("UPDATE orders SET status = ? WHERE id = ?", [status, String(id)]);
    return getOrderById(id);
}

module.exports = { getOrders, getOrderById, createOrder, updateOrderStatus };