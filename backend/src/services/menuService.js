const { all, get, run, initializeDatabase } = require("../data/database");

const RECIPE_STOCK_SQL = `SELECT mi.inventory_item_id, mi.qty_per_unit, s.quantity,
                i.name AS inventory_item_name
         FROM menu_ingredients mi
         JOIN inventory_stock s ON s.item_id = mi.inventory_item_id
         JOIN inventory_items i ON i.id = mi.inventory_item_id
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
           )`;

async function getRecipeStockRows(menuId, volume) {
    return all(RECIPE_STOCK_SQL, [menuId, volume, volume]);
}

function buildStockMessage(missingIngredients) {
    if (!missingIngredients.length) {
        return null;
    }
    if (missingIngredients.length === 1) {
        return `Закончился ингредиент: ${missingIngredients[0].name}`;
    }
    return "Недостаточно ингредиентов";
}

function evaluateRecipeAvailability(recipeRows) {
    if (!recipeRows.length) {
        return { available: true, missingIngredients: [], stockMessage: null };
    }

    const missingIngredients = [];
    for (const row of recipeRows) {
        const requiredQty = Number(row.qty_per_unit);
        const currentQty = Number(row.quantity || 0);
        if (currentQty < requiredQty) {
            missingIngredients.push({
                inventoryItemId: row.inventory_item_id,
                name: row.inventory_item_name,
                requiredQty,
                currentQty,
            });
        }
    }

    return {
        available: missingIngredients.length === 0,
        missingIngredients,
        stockMessage: buildStockMessage(missingIngredients),
    };
}

async function getMenuItemAvailability(menuId, isVolumes, price) {
    if (!isVolumes) {
        const recipeRows = await getRecipeStockRows(menuId, null);
        const availability = evaluateRecipeAvailability(recipeRows);
        return {
            available: availability.available,
            volumeAvailability: null,
            stockMessage: availability.stockMessage,
        };
    }

    const volumeKeys =
        typeof price === "object" && price !== null ? Object.keys(price) : ["250", "350", "500"];
    const volumeAvailability = {};
    let anyAvailable = false;

    for (const volume of volumeKeys) {
        const recipeRows = await getRecipeStockRows(menuId, volume);
        const availability = evaluateRecipeAvailability(recipeRows);
        volumeAvailability[volume] = availability.available;
        if (availability.available) {
            anyAvailable = true;
        }
    }

    return {
        available: anyAvailable,
        volumeAvailability,
        stockMessage: anyAvailable ? null : "Недостаточно ингредиентов для всех объёмов",
    };
}

async function getMenu(){
    await initializeDatabase();
    const rows = await all(
        "SELECT id, name, category, is_volumes, price_json FROM menu ORDER BY id ASC"
    );

    const menu = [];
    for (const row of rows) {
        const price = JSON.parse(row.price_json);
        const isVolumes = Boolean(row.is_volumes);
        const availability = await getMenuItemAvailability(row.id, isVolumes, price);

        menu.push({
            id: row.id,
            name: row.name,
            category: row.category,
            isVolumes,
            price,
            available: availability.available,
            volumeAvailability: availability.volumeAvailability,
            stockMessage: availability.stockMessage,
        });
    }

    return menu;
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