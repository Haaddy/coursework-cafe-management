const { all, get, run, initializeDatabase } = require("../data/database");


async function getMenu(){
    await initializeDatabase();
    const rows = await all(
        "SELECT id, name, category, is_volumes, price_json FROM menu ORDER BY id ASC"
    );

    return rows.map((row) => ({
        id: row.id,
        name: row.name,
        category: row.category,
        isVolumes: Boolean(row.is_volumes),
        price: JSON.parse(row.price_json),
    }));
}

async function createMenuItem(itemData) {
    await initializeDatabase();
    const insert = await run(
        "INSERT INTO menu (name, category, is_volumes, price_json) VALUES (?, ?, ?, ?)",
        [
            itemData.name,
            itemData.category,
            itemData.isVolumes ? 1 : 0,
            JSON.stringify(itemData.price),
        ]
    );

    return {
        id: insert.lastID,
        name: itemData.name,
        category: itemData.category,
        isVolumes: Boolean(itemData.isVolumes),
        price: itemData.price,
    };
}

async function updateMenuItem(id, itemData) {
    await initializeDatabase();
    const existing = await get("SELECT id FROM menu WHERE id = ?", [id]);
    if (!existing) {
        throw new Error("Menu item not found");
    }
    await run(
        "UPDATE menu SET name = ?, category = ?, is_volumes = ?, price_json = ? WHERE id = ?",
        [
            itemData.name,
            itemData.category,
            itemData.isVolumes ? 1 : 0,
            JSON.stringify(itemData.price),
            id,
        ]
    );

    return {
        id: Number(id),
        name: itemData.name,
        category: itemData.category,
        isVolumes: Boolean(itemData.isVolumes),
        price: itemData.price,
    };
}

async function deleteMenuItem(id) {
    await initializeDatabase();
    const existing = await get(
        "SELECT id, name, category, is_volumes, price_json FROM menu WHERE id = ?",
        [id]
    );
    if (!existing) {
        throw new Error("Menu item not found");
    }
    await run("DELETE FROM menu WHERE id = ?", [id]);

    return {
        id: existing.id,
        name: existing.name,
        category: existing.category,
        isVolumes: Boolean(existing.is_volumes),
        price: JSON.parse(existing.price_json),
    };
}

async function getMenuIngredients(menuId) {
    await initializeDatabase();

    const menu = await get("SELECT id FROM menu WHERE id = ?", [menuId]);
    if (!menu) {
        throw new Error("Menu item not found");
    }

    const rows = await all(
        `SELECT mi.id, mi.menu_id, mi.inventory_item_id, mi.qty_per_unit, mi.volume, mi.created_at,
                i.name AS inventory_item_name, i.unit AS inventory_item_unit
         FROM menu_ingredients mi
         JOIN inventory_items i ON i.id = mi.inventory_item_id
         WHERE mi.menu_id = ?
         ORDER BY mi.id ASC`,
        [menuId]
    );

    return rows.map((row) => ({
        id: row.id,
        menuId: row.menu_id,
        inventoryItemId: row.inventory_item_id,
        inventoryItemName: row.inventory_item_name,
        inventoryItemUnit: row.inventory_item_unit,
        qtyPerUnit: Number(row.qty_per_unit),
        volume: row.volume,
        createdAt: row.created_at,
    }));
}

async function replaceMenuIngredients(menuId, ingredients) {
    await initializeDatabase();

    const menu = await get("SELECT id FROM menu WHERE id = ?", [menuId]);
    if (!menu) {
        throw new Error("Menu item not found");
    }

    try {
        await run("BEGIN TRANSACTION");
        await run("DELETE FROM menu_ingredients WHERE menu_id = ?", [menuId]);

        const createdAt = new Date().toISOString();
        for (const ingredient of ingredients) {
            const inventoryItemId = Number(ingredient.inventoryItemId);
            const qtyPerUnit = Number(ingredient.qtyPerUnit);
            const volume = ingredient.volume == null || ingredient.volume === ""
                ? null
                : String(ingredient.volume);

            const inventoryItem = await get("SELECT id FROM inventory_items WHERE id = ?", [inventoryItemId]);
            if (!inventoryItem) {
                throw new Error(`Inventory item not found: ${inventoryItemId}`);
            }
            if (!Number.isFinite(qtyPerUnit) || qtyPerUnit <= 0) {
                throw new Error("qtyPerUnit must be a positive number");
            }

            await run(
                `INSERT INTO menu_ingredients (menu_id, inventory_item_id, qty_per_unit, volume, created_at)
                 VALUES (?, ?, ?, ?, ?)`,
                [menuId, inventoryItemId, qtyPerUnit, volume, createdAt]
            );
        }

        await run("COMMIT");
    } catch (error) {
        await run("ROLLBACK");
        throw error;
    }

    return getMenuIngredients(menuId);
}

module.exports = {
    getMenu,
    createMenuItem,
    updateMenuItem,
    deleteMenuItem,
    getMenuIngredients,
    replaceMenuIngredients,
};