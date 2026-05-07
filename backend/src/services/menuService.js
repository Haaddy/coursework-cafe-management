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

module.exports = {getMenu, createMenuItem, updateMenuItem, deleteMenuItem};