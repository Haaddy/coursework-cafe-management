const fs = require("fs");
const path = require("path");

const DB_Path = path.join(__dirname, "../data/db.json5");
let orders = [];


async function readDb(){
    const rawData = await fs.promises.readFile(DB_Path, "utf-8");
    return JSON.parse(rawData);
}

async function writeDb(data){
    await fs.promises.writeFile(DB_Path, JSON.stringify(data, null, 2));
}


async function getOrders() {
    const db = await readDb();
    return db.orders;
}

async function getOrderById(id) {
    const db = await readDb();
    const order = db.orders.find((o) => String(o.id) === String(id));
    if (!order) {
        throw new Error("Order not found");
    }
    return order;
}

async function createOrder(name, cart) {
    const db = await readDb();

    const totalPrice = cart.reduce((acc, item) => acc + Number(item.price), 0);
    const order = {
        id: crypto.randomUUID?.() || Date.now(),
        name,
        status: "pending",
        items: cart,
        totalPrice,
        createdAt: new Date().toISOString()
    };
    db.orders = db.orders || [];
    db.orders.push(order);
    
    await writeDb(db);
    return order;
}

async function updateOrderStatus(id, status) {
    const db = await readDb();
    const order = db.orders.find((o) => String(o.id) === String(id));
    if (!order) {
        throw new Error("Order not found");
    }
    order.status = status;
    await writeDb(db);
    return order;
}

module.exports = { getOrders, getOrderById, createOrder, updateOrderStatus };