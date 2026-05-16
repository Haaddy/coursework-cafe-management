const ordersService = require("../services/ordersService");

function sendOrderError(res, err, defaultMessage) {
    const statusCode = Number(err?.statusCode) || 500;
    return res.status(statusCode).json({
        error: err?.message || defaultMessage,
        code: err?.code || "ORDER_INTERNAL_ERROR",
    });
}

async function getOrders(req, res) {
    try {
        const {
            status,
            activeOnly,
            date,
            from,
            to,
            q,
            includeAll,
        } = req.query || {};
        const filters = {
            status,
            activeOnly: String(activeOnly || "").toLowerCase() === "true",
            date: date || undefined,
            from: from || undefined,
            to: to || undefined,
            q: q || undefined,
        };

        // POS defaults to today's orders unless explicitly requested otherwise.
        if (!filters.date && !filters.from && !filters.to && String(includeAll || "").toLowerCase() !== "true") {
            filters.date = "today";
        }

        const orders = await ordersService.getOrders(filters);
        return res.json(orders);
    } catch (err) {
        return sendOrderError(res, err, "Failed to fetch orders");
    }
}

async function getOrderById(req, res) {
    try {
        const { id } = req.params;
        const order = await ordersService.getOrderById(id);
        return res.json(order);
    } catch (err) {
        return sendOrderError(res, err, "Order not found");
    }
}


async function createOrder(req, res) {
    try {
        const {name, cart} = req.body;

        if (!Array.isArray(cart)||cart.length === 0) {
            return res.status(400).json({ error: "Cart is empty" });
        }

        const order = await ordersService.createOrder(name, cart);
        return res.status(201).json(order);
    } catch (err) {
        return sendOrderError(res, err, "Failed to create order");
    }
}

async function updateOrderStatus(req, res) {
    try {
        const { id } = req.params;
        const { status } = req.body;
        if (!status || typeof status !== "string") {
            return res.status(400).json({ error: "status is required" });
        }
        const order = await ordersService.updateOrderStatus(id, status.trim());
        return res.json(order);
    } catch (err) {
        return sendOrderError(res, err, "Failed to update order status");
    }
}

async function payOrder(req, res) {
    try {
        const { id } = req.params;
        const { paymentMethod } = req.body || {};
        if (!paymentMethod || typeof paymentMethod !== "string") {
            return res.status(400).json({ error: "paymentMethod is required" });
        }
        const order = await ordersService.payOrder(id, paymentMethod);
        return res.json(order);
    } catch (err) {
        return sendOrderError(res, err, "Failed to pay order");
    }
}

async function closeOrder(req, res) {
    try {
        const { id } = req.params;
        const { employeeCode } = req.body || {};
        if (!employeeCode || typeof employeeCode !== "string") {
            return res.status(400).json({ error: "employeeCode is required" });
        }
        const order = await ordersService.closeOrderWithEmployeeCode(id, employeeCode);
        return res.json(order);
    } catch (err) {
        return sendOrderError(res, err, "Failed to close order");
    }
}

module.exports = { getOrders, getOrderById, createOrder, updateOrderStatus, payOrder, closeOrder };

