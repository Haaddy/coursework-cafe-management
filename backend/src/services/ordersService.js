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

async function expandOrder(orderRow) { // 
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
    return Promise.all(orderRows.map(expandOrder));
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
    return expandOrder(orderRow);
}

async function createOrder(name, cart) {
    await initializeDatabase();

    const totalPrice = cart.reduce((acc, item) => acc + Number(item.price), 0);
    const orderId = crypto.randomUUID?.() || String(Date.now());
    const createdAt = new Date().toISOString();
    const now = () => new Date().toISOString();

    try {
        await run("BEGIN TRANSACTION");

        await run(
            "INSERT INTO orders (id, name, status, total_price, created_at) VALUES (?, ?, ?, ?, ?)",
            [orderId, name, "pending", totalPrice, createdAt]
        );

        for (const item of cart) {
            const menuId = Number(item.id) || null;
            const itemVolume = item.volume == null ? null : String(item.volume);

            await run(
                "INSERT INTO order_items (order_id, menu_id, name_snapshot, price_snapshot, volume) VALUES (?, ?, ?, ?, ?)",
                [
                    orderId,
                    menuId,
                    item.name || "",
                    Number(item.price) || 0,
                    itemVolume,
                ]
            );

            if (!menuId) continue;

            const recipeRows = await all(
                `SELECT mi.inventory_item_id, mi.qty_per_unit, s.quantity
                 FROM menu_ingredients mi
                 JOIN inventory_stock s ON s.item_id = mi.inventory_item_id
                 WHERE mi.menu_id = ?
                   AND (
                     mi.volume = ?
                     OR (
                       mi.volume IS NULL
                       AND NOT EXISTS (
                         SELECT 1
                         FROM menu_ingredients mi2
                         WHERE mi2.menu_id = mi.menu_id
                           AND mi2.inventory_item_id = mi.inventory_item_id
                           AND mi2.volume = ?
                       )
                     )
                   )`,
                [menuId, itemVolume, itemVolume]
            );

            for (const recipeRow of recipeRows) {
                const requiredQty = Number(recipeRow.qty_per_unit);
                const currentQty = Number(recipeRow.quantity || 0);

                if (currentQty < requiredQty) {
                    throw new Error(`Not enough stock for ingredient #${recipeRow.inventory_item_id}`);
                }

                await run(
                    "UPDATE inventory_stock SET quantity = quantity - ?, updated_at = ? WHERE item_id = ?",
                    [requiredQty, now(), recipeRow.inventory_item_id]
                );

                await run(
                    `INSERT INTO inventory_movements
                     (item_id, movement_type, quantity, reason, reference_type, reference_id, created_at)
                     VALUES (?, 'out', ?, ?, ?, ?, ?)`,
                    [recipeRow.inventory_item_id, requiredQty, "order", "order", orderId, now()]
                );
            }
        }

        await run("COMMIT");
        return getOrderById(orderId);
    } catch (error) {
        await run("ROLLBACK");
        throw error;
    }
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