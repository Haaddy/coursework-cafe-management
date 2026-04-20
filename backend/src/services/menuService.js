const fs = require("fs");
const path = require("path");

const MENU_DB_Path = path.join(__dirname, "../data/menuDB.json");


async function readDb(){
    const rawData = await fs.promises.readFile(MENU_DB_Path, "utf-8");
    return JSON.parse(rawData);
}

async function writeDb(data){
    await fs.promises.writeFile(MENU_DB_Path, JSON.stringify(data, null, 2));
}


async function getMenu(){
    const db = await readDb();
    return db.products;
}

async function createMenuItem(itemData) {
    const db = await readDb();
    const products = db.products || [];

    const nextId = products.length
        ? Math.max(...products.map((item) => Number(item.id) || 0)) + 1
        : 1;

    const newItem = {
        id: nextId,
        name: itemData.name,
        category: itemData.category,
        isVolumes: Boolean(itemData.isVolumes),
        price: itemData.price,
    };

    products.push(newItem);
    db.products = products;

    await writeDb(db);
    return newItem;
}

async function updateMenuItem(id, itemData) {
    const db = await readDb();
    const products = db.products || [];
    const index = products.findIndex((item) => String(item.id) === String(id));

    if (index === -1) {
        throw new Error("Menu item not found");
    }

    const current = products[index];
    const updatedItem = {
        ...current,
        name: itemData.name,
        category: itemData.category,
        isVolumes: Boolean(itemData.isVolumes),
        price: itemData.price,
    };

    products[index] = updatedItem;
    db.products = products;

    await writeDb(db);
    return updatedItem;
}

async function deleteMenuItem(id) {
    const db = await readDb();
    const products = db.products || [];
    const index = products.findIndex((item) => String(item.id) === String(id));

    if (index === -1) {
        throw new Error("Menu item not found");
    }

    const [deletedItem] = products.splice(index, 1);
    db.products = products;

    await writeDb(db);
    return deletedItem;
}

module.exports = {getMenu, createMenuItem, updateMenuItem, deleteMenuItem};