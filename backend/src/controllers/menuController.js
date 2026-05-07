const menuService = require("../services/menuService");

async function getMenu(req, res) {
    const menu = await menuService.getMenu();
    res.json(menu);
}

async function createMenuItem(req, res) {
    try {
        const { name, category, isVolumes, price } = req.body || {};

        if (!name || typeof name !== "string") {
            return res.status(400).json({ error: "name is required" });
        }

        if (!category || typeof category !== "string") {
            return res.status(400).json({ error: "category is required" });
        }

        const hasVolumes = Boolean(isVolumes);
        if (hasVolumes) {
            const isPriceObject = typeof price === "object" && price !== null;
            if (!isPriceObject) {
                return res.status(400).json({ error: "price must be object for volume item" });
            }
        } else if (typeof price !== "number" || Number.isNaN(price)) {
            return res.status(400).json({ error: "price must be number for single-size item" });
        }

        const newItem = await menuService.createMenuItem({
            name: name.trim(),
            category: category.trim(),
            isVolumes: hasVolumes,
            price,
        });

        return res.status(201).json(newItem);
    } catch (err) {
        return res.status(500).json({ error: err.message || "Failed to create menu item" });
    }
}

async function updateMenuItem(req, res) {
    try {
        const { id } = req.params;
        const { name, category, isVolumes, price } = req.body || {};

        if (!name || typeof name !== "string") {
            return res.status(400).json({ error: "name is required" });
        }

        if (!category || typeof category !== "string") {
            return res.status(400).json({ error: "category is required" });
        }

        const hasVolumes = Boolean(isVolumes);
        if (hasVolumes) {
            const isPriceObject = typeof price === "object" && price !== null;
            if (!isPriceObject) {
                return res.status(400).json({ error: "price must be object for volume item" });
            }
        } else if (typeof price !== "number" || Number.isNaN(price)) {
            return res.status(400).json({ error: "price must be number for single-size item" });
        }

        const updatedItem = await menuService.updateMenuItem(id, {
            name: name.trim(),
            category: category.trim(),
            isVolumes: hasVolumes,
            price,
        });

        return res.json(updatedItem);
    } catch (err) {
        if (err.message === "Menu item not found") {
            return res.status(404).json({ error: err.message });
        }
        return res.status(500).json({ error: err.message || "Failed to update menu item" });
    }
}

async function deleteMenuItem(req, res) {
    try {
        const { id } = req.params;
        const deletedItem = await menuService.deleteMenuItem(id);
        return res.json(deletedItem);
    } catch (err) {
        if (err.message === "Menu item not found") {
            return res.status(404).json({ error: err.message });
        }
        return res.status(500).json({ error: err.message || "Failed to delete menu item" });
    }
}

async function getMenuIngredients(req, res) {
    try {
        const { id } = req.params;
        const ingredients = await menuService.getMenuIngredients(id);
        return res.json(ingredients);
    } catch (err) {
        if (err.message === "Menu item not found") {
            return res.status(404).json({ error: err.message });
        }
        return res.status(500).json({ error: err.message || "Failed to fetch menu ingredients" });
    }
}

async function replaceMenuIngredients(req, res) {
    try {
        const { id } = req.params;
        const { ingredients } = req.body || {};

        if (!Array.isArray(ingredients)) {
            return res.status(400).json({ error: "ingredients must be an array" });
        }

        const result = await menuService.replaceMenuIngredients(id, ingredients);
        return res.json(result);
    } catch (err) {
        if (err.message === "Menu item not found") {
            return res.status(404).json({ error: err.message });
        }
        if (err.message.startsWith("Inventory item not found:") || err.message === "qtyPerUnit must be a positive number") {
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