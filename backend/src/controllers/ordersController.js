const ordersService = require("../services/ordersService");

function sendOrderError(res, err, defaultMessage) { // ! функция отправки ошибки заказа
    const statusCode = Number(err?.statusCode) || 500; 
    return res.status(statusCode).json({ // ! отправка ошибки заказа
        error: err?.message || defaultMessage,
        code: err?.code || "ORDER_INTERNAL_ERROR", // ! код ошибки заказа
    });
}

async function getOrders(req, res) { // ! функция получения списка заказов
    try {
        const { // ! получение query-параметров
            status,
            activeOnly,
            date,
            from,
            to,
            q,
            includeAll,
        } = req.query || {}; 
        const filters = { // ! фильтры для получения списка заказов
            status, // ! фильтр статуса заказа
            activeOnly: String(activeOnly || "").toLowerCase() === "true", // ! фильтр активных заказов
            date: date || undefined, // ! фильтр даты
            from: from || undefined, // ! фильтр даты с
            to: to || undefined, // ! фильтр даты до
            q: q || undefined, // ! фильтр поиска
        };

        
        if (!filters.date && !filters.from && !filters.to && String(includeAll || "").toLowerCase() !== "true") { // ! если нет фильтров даты, то устанавливаем фильтр даты на сегодня
            filters.date = "today";
        }

        const orders = await ordersService.getOrders(filters); // ! получение списка заказов
        return res.json(orders); // ! отправка списка заказов
    } catch (err) {
        return sendOrderError(res, err, "Failed to fetch orders"); // ! отправка ошибки при получении списка заказов
    }
}

async function getOrderById(req, res) { // ! функция получения заказа по ID
    try {
        const { id } = req.params;
        const order = await ordersService.getOrderById(id); // ! получение заказа по ID
        return res.json(order); // ! отправка заказа
    } catch (err) {
        return sendOrderError(res, err, "Order not found"); // ! отправка ошибки при получении заказа
    }
}


async function createOrder(req, res) { // ! функция создания заказа
    try {
        const { cart } = req.body; // ! получение корзины из тела запроса

        if (!Array.isArray(cart)||cart.length === 0) {
            return res.status(400).json({ error: "Cart is empty" }); 
        }

        const order = await ordersService.createOrder(cart); // ! создание заказа
        return res.status(201).json(order); // ! отправка заказа
    } catch (err) {
        return sendOrderError(res, err, "Failed to create order");
    }
}

async function updateOrderStatus(req, res) { // ! функция обновления статуса заказа
    try {
        const { id } = req.params; // ! получение ID заказа из параметров запроса
        const { status } = req.body; // ! получение статуса из тела запроса
        if (!status || typeof status !== "string") {
            return res.status(400).json({ error: "status is required" });
        }
        const order = await ordersService.updateOrderStatus(id, status.trim()); // ! обновление статуса заказа
        return res.json(order); // ! отправка заказа
    } catch (err) {
        return sendOrderError(res, err, "Failed to update order status");
    }
}

async function payOrder(req, res) { // ! функция оплаты заказа
    try {
        const { id } = req.params; // ! получение ID заказа из параметров запроса
        const { paymentMethod } = req.body || {}; // ! получение метода оплаты из тела запроса
        if (!paymentMethod || typeof paymentMethod !== "string") { // ! если метод оплаты не указан, то отправляем ошибку
            return res.status(400).json({ error: "paymentMethod is required" });
        }
        const order = await ordersService.payOrder(id, paymentMethod); // ! оплата заказа
        return res.json(order); // ! отправка заказа
    } catch (err) {
        return sendOrderError(res, err, "Failed to pay order");
    }
}

async function closeOrder(req, res) { // ! функция закрытия заказа
    try {
        const { id } = req.params; // ! получение ID заказа из параметров запроса
        const { employeeCode } = req.body || {}; // ! получение кода сотрудника из тела запроса
        if (!employeeCode || typeof employeeCode !== "string") { // ! если код сотрудника не указан, то отправляем ошибку
            return res.status(400).json({ error: "employeeCode is required" });
        }
        const order = await ordersService.closeOrderWithEmployeeCode(id, employeeCode); // ! закрытие заказа
        return res.json(order); // ! отправка заказа
    } catch (err) {
        return sendOrderError(res, err, "Failed to close order");
    }
}

module.exports = { getOrders, getOrderById, createOrder, updateOrderStatus, payOrder, closeOrder };

