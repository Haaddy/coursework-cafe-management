const ordersService = require("../services/ordersService");

async function getOrders(req, res) {
    const orders = await ordersService.getOrders();
    res.json(orders);
}

async function getOrderById(req, res) {
    try {
        const { id } = req.params;
        const order = await ordersService.getOrderById(id);
        res.json(order);
    } catch (err) {
        res.status(404).json({ error: err.message || "Order not found" });
    }
}


async function createOrder(req, res) {
    const {name, cart} = req.body;

    if (!name) {
        return res.status(400).json({ error: "Name is required" });
    }

    if (!Array.isArray(cart)||cart.length === 0) {
        return res.status(400).json({ error: "Cart is empty" });
    }

    const order = await ordersService.createOrder(name.trim(), cart);
    res.status(201).json(order);
}

async function updateOrderStatus(req, res) {
    try {
        const { id } = req.params;
        const { status } = req.body;
        if (!status || typeof status !== "string") {
            return res.status(400).json({ error: "status is required" });
        }
        const order = await ordersService.updateOrderStatus(id, status.trim());
        res.json(order);
    } catch (err) {
        res.status(404).json({ error: err.message || "Order not found" });
    }
}

module.exports = { getOrders, getOrderById, createOrder, updateOrderStatus };

