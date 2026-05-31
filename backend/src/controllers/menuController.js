const menuService = require("../services/menuService");

async function getMenu(req, res) { // ! функция получения списка меню
    const menu = await menuService.getMenu(); // ! получение списка меню
    res.json(menu); // ! отправка списка меню
}

async function createMenuItem(req, res) { // ! функция создания меню
    try {
        const { name, category, isVolumes, price } = req.body || {}; // ! получение данных из тела запроса

        if (!name || typeof name !== "string") {
            return res.status(400).json({ error: "name is required" }); // ! отправка ошибки если название не указано
        }

        if (!category || typeof category !== "string") { // ! отправка ошибки если категория не указана
            return res.status(400).json({ error: "category is required" });
        }

        const hasVolumes = Boolean(isVolumes); // ! проверка на наличие объемов
        if (hasVolumes) {
            const isPriceObject = typeof price === "object" && price !== null; // ! проверка на наличие объекта цены
            if (!isPriceObject) {
                return res.status(400).json({ error: "price must be object for volume item" }); // ! отправка ошибки если цена не является объектом
            }
        } else if (typeof price !== "number" || Number.isNaN(price)) { // ! отправка ошибки если цена не является числом
            return res.status(400).json({ error: "price must be number for single-size item" });
        }

        const newItem = await menuService.createMenuItem({ // ! создание меню
            name: name.trim(),
            category: category.trim(),
            isVolumes: hasVolumes,
            price,
        });

        return res.status(201).json(newItem); // ! отправка меню
    } catch (err) {
        return res.status(500).json({ error: err.message || "Failed to create menu item" });
    }
}

async function updateMenuItem(req, res) { // ! функция обновления меню
    try {
        const { id } = req.params; // ! получение ID из параметров запроса
        const { name, category, isVolumes, price } = req.body || {}; // ! получение данных из тела запроса

        if (!name || typeof name !== "string") { // ! отправка ошибки если название не указано
            return res.status(400).json({ error: "name is required" });
        }

        if (!category || typeof category !== "string") { // ! отправка ошибки если категория не указана
            return res.status(400).json({ error: "category is required" });
        }

        const hasVolumes = Boolean(isVolumes); // ! проверка на наличие объемов
        if (hasVolumes) {
            const isPriceObject = typeof price === "object" && price !== null; // ! проверка на наличие объекта цены
            if (!isPriceObject) { // ! отправка ошибки если цена не является объектом
                return res.status(400).json({ error: "price must be object for volume item" });
            }
        } else if (typeof price !== "number" || Number.isNaN(price)) { // ! отправка ошибки если цена не является числом
            return res.status(400).json({ error: "price must be number for single-size item" });
        }

        const updatedItem = await menuService.updateMenuItem(id, { // ! обновление меню
            name: name.trim(),
            category: category.trim(),
            isVolumes: hasVolumes,
            price,
        });

        return res.json(updatedItem); // ! отправка меню
    } catch (err) {
        if (err.message === "Menu item not found") { // ! отправка ошибки если меню не найдено
            return res.status(404).json({ error: err.message });
        }
        return res.status(500).json({ error: err.message || "Failed to update menu item" });
    }
}

async function deleteMenuItem(req, res) { // ! функция удаления меню
    try {
        const { id } = req.params; // ! получение ID из параметров запроса
        const deletedItem = await menuService.deleteMenuItem(id); // ! удаление меню
        return res.json(deletedItem);
    } catch (err) {
        if (err.message === "Menu item not found") {
            return res.status(404).json({ error: err.message });
        }
        return res.status(500).json({ error: err.message || "Failed to delete menu item" });
    }
}

async function getMenuIngredients(req, res) { // ! функция получения ингредиентов меню
    try {
        const { id } = req.params; // ! получение ID из параметров запроса
        const ingredients = await menuService.getMenuIngredients(id); // ! получение ингредиентов меню
        return res.json(ingredients);
    } catch (err) {
        if (err.message === "Menu item not found") { // ! отправка ошибки если меню не найдено
            return res.status(404).json({ error: err.message });
        }
        return res.status(500).json({ error: err.message || "Failed to fetch menu ingredients" });
    }
}

async function replaceMenuIngredients(req, res) { // ! функция замены ингредиентов меню
    try {
        const { id } = req.params; // ! получение ID из параметров запроса
        const { ingredients } = req.body || {}; // ! получение данных из тела запроса

        if (!Array.isArray(ingredients)) {
            return res.status(400).json({ error: "ingredients must be an array" }); // ! отправка ошибки если ингредиенты не являются массивом
        }

        const result = await menuService.replaceMenuIngredients(id, ingredients); // ! замена ингредиентов меню
        return res.json(result);
    } catch (err) {
        if (err.message === "Menu item not found") { // ! отправка ошибки если меню не найдено
            return res.status(404).json({ error: err.message });
        }
        if (err.message.startsWith("Inventory item not found:") || err.message === "qtyPerUnit must be a positive number") { // ! отправка ошибки если ингредиент не найден или количество ингредиента не является положительным числом
            return res.status(400).json({ error: err.message });
        }
        return res.status(500).json({ error: err.message || "Failed to update menu ingredients" });
    }
}

module.exports = {
    getMenu,
    createMenuItem,
    updateMenuItem,
    deleteMenuItem,
    getMenuIngredients,
    replaceMenuIngredients,
};