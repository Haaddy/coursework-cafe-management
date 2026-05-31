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

async function getRecipeStockRows(menuId, volume) { // ! функция получения строк рецептов
    return all(RECIPE_STOCK_SQL, [menuId, volume, volume]);
} // ! возвращение строк рецептов

function buildStockMessage(missingIngredients) { // ! функция построения сообщения о недостаточности ингредиентов
    if (!missingIngredients.length) { // ! если недостаточно ингредиентов
        return null;
    }
    if (missingIngredients.length === 1) { // ! если недостаточно одного ингредиента
        return `Закончился ингредиент: ${missingIngredients[0].name}`;
    }
    return "Недостаточно ингредиентов"; // ! возвращение сообщения о недостаточности ингредиентов
}

function evaluateRecipeAvailability(recipeRows) { // ! функция оценки доступности рецепта
    if (!recipeRows.length) { // ! если рецепт не найден
        return { available: true, missingIngredients: [], stockMessage: null };
    }

    const missingIngredients = []; // ! создание массива недостающих ингредиентов
    for (const row of recipeRows) {
        const requiredQty = Number(row.qty_per_unit); // ! получение необходимого количества ингредиента
        const currentQty = Number(row.quantity || 0); // ! получение текущего количества ингредиента
        if (currentQty < requiredQty) { // ! если текущее количество ингредиента меньше необходимого
            missingIngredients.push({ // ! добавление недостающего ингредиента в массив
                inventoryItemId: row.inventory_item_id,
                name: row.inventory_item_name,
                requiredQty,
                currentQty,
            });
        }
    }

    return { // ! возвращение оценки доступности рецепта
        available: missingIngredients.length === 0, // ! если недостающих ингредиентов нет
        missingIngredients, // ! недостающие ингредиенты
        stockMessage: buildStockMessage(missingIngredients), // ! сообщение о недостаточности ингредиентов
    };
}

async function getMenuItemAvailability(menuId, isVolumes, price) { // ! функция получения доступности товара
    if (!isVolumes) { // ! если товар не имеет объемов
        const recipeRows = await getRecipeStockRows(menuId, null);
        const availability = evaluateRecipeAvailability(recipeRows); // ! оценка доступности рецепта
        return { // ! возвращение доступности товара
            available: availability.available, // ! доступность товара
            volumeAvailability: null, // ! доступность товара по объемам
            stockMessage: availability.stockMessage, // ! сообщение о недостаточности ингредиентов
        };
    }

    const volumeKeys = // ! получение ключей объемов
        typeof price === "object" && price !== null ? Object.keys(price) : ["250", "350", "500"];
    const volumeAvailability = {}; // ! создание массива доступности товара по объемам
    let anyAvailable = false; // ! флаг доступности товара

    for (const volume of volumeKeys) { // ! цикл по объемам
        const recipeRows = await getRecipeStockRows(menuId, volume); // ! получение строк рецептов
        const availability = evaluateRecipeAvailability(recipeRows); // ! оценка доступности рецепта
        volumeAvailability[volume] = availability.available; // ! добавление доступности товара по объему в массив
        if (availability.available) {
            anyAvailable = true; // ! флаг доступности товара
        }
    }

    return { // ! возвращение доступности товара
        available: anyAvailable, // ! доступность товара
        volumeAvailability, // ! доступность товара по объемам
        stockMessage: anyAvailable ? null : "Недостаточно ингредиентов для всех объёмов", // ! сообщение о недостаточности ингредиентов
    };
}

async function getMenu(){ // ! функция получения меню
    await initializeDatabase();
    const rows = await all( // ! получение строк меню
        "SELECT id, name, category, is_volumes, price_json FROM menu ORDER BY id ASC"
    );

    const menu = []; // ! создание массива меню
    for (const row of rows) {
        const price = JSON.parse(row.price_json); // ! получение цены товара
        const isVolumes = Boolean(row.is_volumes); // ! проверка на наличие объемов
        const availability = await getMenuItemAvailability(row.id, isVolumes, price); // ! получение доступности товара

        menu.push({ // ! добавление товара в массив меню
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

    return menu; // ! возвращение меню
}

async function createMenuItem(itemData) { // ! функция создания товара
    await initializeDatabase();
    const insert = await run( // ! создание товара
        "INSERT INTO menu (name, category, is_volumes, price_json) VALUES (?, ?, ?, ?)",
        [
            itemData.name,
            itemData.category,
            itemData.isVolumes ? 1 : 0,
            JSON.stringify(itemData.price),
        ]
    );

    return { // ! возвращение товара
        id: insert.lastID,
        name: itemData.name,
        category: itemData.category,
        isVolumes: Boolean(itemData.isVolumes),
        price: itemData.price,
    };
}

async function updateMenuItem(id, itemData) { // ! функция обновления товара
    await initializeDatabase();
    const existing = await get("SELECT id FROM menu WHERE id = ?", [id]); // ! получение товара
    if (!existing) {
        throw new Error("Menu item not found");
    }
    await run( // ! обновление товара
        "UPDATE menu SET name = ?, category = ?, is_volumes = ?, price_json = ? WHERE id = ?",
        [
            itemData.name,
            itemData.category,
            itemData.isVolumes ? 1 : 0,
            JSON.stringify(itemData.price),
            id,
        ]
    );

    return { // ! возвращение товара
        id: Number(id),
        name: itemData.name,
        category: itemData.category,
        isVolumes: Boolean(itemData.isVolumes),
        price: itemData.price,
    };
}

async function deleteMenuItem(id) { // ! функция удаления товара
    await initializeDatabase();
    const existing = await get( // ! получение товара
        "SELECT id, name, category, is_volumes, price_json FROM menu WHERE id = ?",
        [id]
    );
    if (!existing) { // ! если товар не найден
        throw new Error("Menu item not found");
    }
    await run("DELETE FROM menu WHERE id = ?", [id]); // ! удаление товара

    return { // ! возвращение товара
        id: existing.id,
        name: existing.name,
        category: existing.category,
        isVolumes: Boolean(existing.is_volumes),
        price: JSON.parse(existing.price_json),
    };
}

async function getMenuIngredients(menuId) { // ! функция получения ингредиентов товара
    await initializeDatabase();

    const menu = await get("SELECT id FROM menu WHERE id = ?", [menuId]); // ! получение товара
    if (!menu) { // ! если товар не найден
        throw new Error("Menu item not found");
    }

    const rows = await all( // ! получение строк ингредиентов
        `SELECT mi.id, mi.menu_id, mi.inventory_item_id, mi.qty_per_unit, mi.volume, mi.created_at,
                i.name AS inventory_item_name, i.unit AS inventory_item_unit
         FROM menu_ingredients mi
         JOIN inventory_items i ON i.id = mi.inventory_item_id
         WHERE mi.menu_id = ?
         ORDER BY mi.id ASC`,
        [menuId]
    );

    return rows.map((row) => ({ // ! возвращение ингредиентов
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

async function replaceMenuIngredients(menuId, ingredients) { // ! функция замены ингредиентов товара
    await initializeDatabase();

    const menu = await get("SELECT id FROM menu WHERE id = ?", [menuId]); // ! получение товара
    if (!menu) { // ! если товар не найден
        throw new Error("Menu item not found");
    }

    try { // ! начало транзакции    
        await run("BEGIN TRANSACTION"); 
        await run("DELETE FROM menu_ingredients WHERE menu_id = ?", [menuId]); // ! удаление ингредиентов товара

        const createdAt = new Date().toISOString(); // ! получение даты создания
        for (const ingredient of ingredients) { // ! цикл по ингредиентам
            const inventoryItemId = Number(ingredient.inventoryItemId); // ! получение ID ингредиента
            const qtyPerUnit = Number(ingredient.qtyPerUnit); // ! получение количества ингредиента
            const volume = ingredient.volume == null || ingredient.volume === "" // ! получение объема ингредиента
                ? null
                : String(ingredient.volume); 

            const inventoryItem = await get("SELECT id FROM inventory_items WHERE id = ?", [inventoryItemId]); // ! получение ингредиента
            if (!inventoryItem) { // ! если ингредиент не найден
                throw new Error(`Inventory item not found: ${inventoryItemId}`); 
            }
            if (!Number.isFinite(qtyPerUnit) || qtyPerUnit <= 0) { // ! если количество ингредиента не является положительным числом
                throw new Error("qtyPerUnit must be a positive number");
            }

            await run( // ! добавление ингредиента в базу данных
                `INSERT INTO menu_ingredients (menu_id, inventory_item_id, qty_per_unit, volume, created_at)
                 VALUES (?, ?, ?, ?, ?)`,
                [menuId, inventoryItemId, qtyPerUnit, volume, createdAt]
            );
        }

        await run("COMMIT"); // ! завершение транзакции
    } catch (error) {
        await run("ROLLBACK");
        throw error;
    }

    return getMenuIngredients(menuId); // ! возвращение ингредиентов товара
}

module.exports = { // ! экспорт функций
    getMenu, // ! функция получения меню
    createMenuItem, // ! функция создания товара
    updateMenuItem, // ! функция обновления товара
    deleteMenuItem, // ! функция удаления товара
    getMenuIngredients, // ! функция получения ингредиентов товара
    replaceMenuIngredients, // ! функция замены ингредиентов товара
};