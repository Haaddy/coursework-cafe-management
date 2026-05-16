const crypto = require("crypto");
const { all, get, run, initializeDatabase } = require("../data/database");

const ORDER_STATUSES = Object.freeze({
    PENDING: "pending",
    READY: "ready",
    PAID: "paid",
    CLOSED: "closed",
});

class OrderServiceError extends Error {
    constructor(message, statusCode, code = "ORDER_ERROR") {
        super(message);
        this.name = "OrderServiceError";
        this.statusCode = statusCode;
        this.code = code;
    }
}

function makeOrderServiceError(message, statusCode, code) {
    return new OrderServiceError(message, statusCode, code);
}

function isStatusTransitionAllowed(currentStatus, nextStatus) {
    if (currentStatus === nextStatus) return true;
    if (currentStatus === ORDER_STATUSES.PENDING && nextStatus === ORDER_STATUSES.READY) return true;
    if (currentStatus === ORDER_STATUSES.READY && nextStatus === ORDER_STATUSES.PAID) return true;
    if (currentStatus === ORDER_STATUSES.PAID && nextStatus === ORDER_STATUSES.CLOSED) return true;
    return false;
}

async function getOrderLifecycleState(id) {
    const order = await get(
        `SELECT id, status, closed_by_employee_id
         FROM orders
         WHERE id = ?`,
        [String(id)]
    );

    if (!order) {
        throw makeOrderServiceError("Order not found", 404, "ORDER_NOT_FOUND");
    }

    return order;
}

function normalizeOrderDateForNumber(value) {
    const parsedDate = value ? new Date(value) : new Date();
    const safeDate = Number.isNaN(parsedDate.getTime()) ? new Date() : parsedDate;
    return safeDate.toISOString().slice(0, 10).replace(/-/g, "");
}

function buildOrderNumber(dateValue, sequence) {
    const datePart = normalizeOrderDateForNumber(dateValue);
    return `${datePart}-${String(sequence).padStart(4, "0")}`;
}

async function generateNextOrderNumber(createdAt) {
    // order_number is human-facing; id remains internal UUID for relations and API path params.
    const datePart = normalizeOrderDateForNumber(createdAt);
    const latestRow = await get(
        `SELECT order_number
         FROM orders
         WHERE order_number LIKE ?
         ORDER BY order_number DESC
         LIMIT 1`,
        [`${datePart}-%`]
    );

    let nextSequence = 1;
    if (latestRow?.order_number) {
        const match = new RegExp(`^${datePart}-(\\d+)$`).exec(String(latestRow.order_number));
        if (match) {
            nextSequence = Number(match[1]) + 1;
        }
    }

    return buildOrderNumber(createdAt, nextSequence);
}

function mapOrderRowToBase(orderRow) {
    const closedByEmployeeId = orderRow.closed_by_employee_id == null
        ? null
        : Number(orderRow.closed_by_employee_id);

    return {
        id: orderRow.id,
        orderNumber: orderRow.order_number,
        name: orderRow.name,
        status: orderRow.status,
        totalPrice: Number(orderRow.total_price),
        paymentMethod: orderRow.payment_method,
        paidAt: orderRow.paid_at,
        closedByEmployeeId,
        closedAt: orderRow.closed_at,
        closedByEmployee: closedByEmployeeId == null
            ? null
            : {
                id: closedByEmployeeId,
                fullName: orderRow.closed_by_employee_name,
            },
        createdAt: orderRow.created_at,
    };
}

async function expandOrder(orderRow) { // 
    const itemsRows = await all(
        `SELECT menu_id, name_snapshot, price_snapshot, volume
         FROM order_items
         WHERE order_id = ?
         ORDER BY id ASC`,
        [orderRow.id]
    );

    return {
        ...mapOrderRowToBase(orderRow),
        items: itemsRows.map((item) => ({
            id: item.menu_id,
            name: item.name_snapshot,
            price: Number(item.price_snapshot),
            volume: item.volume,
        })),
    };
}


async function getOrders(filters = {}) {
    await initializeDatabase();
    const validStatuses = new Set(Object.values(ORDER_STATUSES));
    const where = [];
    const params = [];

    if (filters.activeOnly) {
        where.push("o.status IN ('pending', 'ready', 'paid')");
    }

    if (filters.status) {
        const normalizedStatus = String(filters.status).trim().toLowerCase();
        if (!validStatuses.has(normalizedStatus)) {
            throw makeOrderServiceError(
                "Invalid status filter. Allowed: pending, ready, paid, closed",
                400,
                "ORDER_INVALID_STATUS_FILTER"
            );
        }
        where.push("o.status = ?");
        params.push(normalizedStatus);
    }

    if (filters.date) {
        const normalizedDate = String(filters.date).trim().toLowerCase();
        if (normalizedDate === "today") {
            where.push("date(o.created_at) = date('now', 'localtime')");
        } else if (/^\d{4}-\d{2}-\d{2}$/.test(normalizedDate)) {
            where.push("date(o.created_at) = date(?)");
            params.push(normalizedDate);
        } else {
            throw makeOrderServiceError(
                "Invalid date filter. Use today or YYYY-MM-DD",
                400,
                "ORDER_INVALID_DATE_FILTER"
            );
        }
    }

    if (filters.from) {
        const normalizedFrom = String(filters.from).trim();
        const date = new Date(normalizedFrom);
        if (Number.isNaN(date.getTime())) {
            throw makeOrderServiceError(
                "Invalid from filter. Use ISO date",
                400,
                "ORDER_INVALID_FROM_FILTER"
            );
        }
        where.push("o.created_at >= ?");
        params.push(date.toISOString());
    }

    if (filters.to) {
        const normalizedTo = String(filters.to).trim();
        const date = new Date(normalizedTo);
        if (Number.isNaN(date.getTime())) {
            throw makeOrderServiceError(
                "Invalid to filter. Use ISO date",
                400,
                "ORDER_INVALID_TO_FILTER"
            );
        }
        where.push("o.created_at <= ?");
        params.push(date.toISOString());
    }

    if (filters.q) {
        const normalizedQuery = String(filters.q).trim();
        if (normalizedQuery) {
            where.push("o.order_number LIKE ?");
            params.push(`%${normalizedQuery}%`);
        }
    }

    const whereSql = where.length > 0 ? `WHERE ${where.join(" AND ")}` : "";
    const orderRows = await all(
        `SELECT
            o.id,
            o.order_number,
            o.name,
            o.status,
            o.total_price,
            o.payment_method,
            o.paid_at,
            o.closed_by_employee_id,
            o.closed_at,
            o.created_at,
            e.full_name AS closed_by_employee_name
         FROM orders o
         LEFT JOIN employees e ON e.id = o.closed_by_employee_id
         ${whereSql}
         ORDER BY
           CASE o.status
             WHEN 'pending' THEN 0
             WHEN 'ready' THEN 1
             WHEN 'paid' THEN 2
             WHEN 'closed' THEN 3
             ELSE 4
           END ASC,
           o.created_at DESC`,
        params
    );
    return Promise.all(orderRows.map(expandOrder));
}

async function getOrderById(id) {
    await initializeDatabase();
    const orderRow = await get(
        `SELECT
            o.id,
            o.order_number,
            o.name,
            o.status,
            o.total_price,
            o.payment_method,
            o.paid_at,
            o.closed_by_employee_id,
            o.closed_at,
            o.created_at,
            e.full_name AS closed_by_employee_name
         FROM orders o
         LEFT JOIN employees e ON e.id = o.closed_by_employee_id
         WHERE o.id = ?`,
        [String(id)]
    );
    if (!orderRow) {
        throw makeOrderServiceError("Order not found", 404, "ORDER_NOT_FOUND");
    }
    return expandOrder(orderRow);
}

function normalizeCartItem(item, index) {
    if (!item || typeof item !== "object") {
        throw makeOrderServiceError(
            `Cart item #${index + 1} is invalid`,
            400,
            "ORDER_INVALID_CART_ITEM"
        );
    }

    const normalizedName = String(item.name || "").trim();
    if (!normalizedName) {
        throw makeOrderServiceError(
            `Cart item #${index + 1} name is required`,
            400,
            "ORDER_INVALID_CART_ITEM_NAME"
        );
    }

    const normalizedPrice = Number(item.price);
    if (!Number.isFinite(normalizedPrice) || normalizedPrice <= 0) {
        throw makeOrderServiceError(
            `Cart item #${index + 1} price must be greater than 0`,
            400,
            "ORDER_INVALID_CART_ITEM_PRICE"
        );
    }

    let normalizedMenuId = null;
    if (item.id != null && String(item.id).trim() !== "") {
        normalizedMenuId = Number(item.id);
        if (!Number.isInteger(normalizedMenuId) || normalizedMenuId <= 0) {
            throw makeOrderServiceError(
                `Cart item #${index + 1} id is invalid`,
                400,
                "ORDER_INVALID_CART_ITEM_ID"
            );
        }
    }

    let normalizedVolume = null;
    if (item.volume != null && String(item.volume).trim() !== "") {
        const volumeNumber = Number(item.volume);
        if (!Number.isFinite(volumeNumber) || volumeNumber <= 0) {
            throw makeOrderServiceError(
                `Cart item #${index + 1} volume is invalid`,
                400,
                "ORDER_INVALID_CART_ITEM_VOLUME"
            );
        }
        normalizedVolume = String(item.volume);
    }

    return {
        id: normalizedMenuId,
        name: normalizedName,
        price: normalizedPrice,
        volume: normalizedVolume,
    };
}

async function createOrder(name, cart) {
    await initializeDatabase();
    const normalizedCart = cart.map((item, index) => normalizeCartItem(item, index));

    const totalPrice = normalizedCart.reduce((acc, item) => acc + Number(item.price), 0);
    const orderId = crypto.randomUUID?.() || String(Date.now());
    const createdAt = new Date().toISOString();
    const normalizedName = typeof name === "string" ? name.trim() : "";
    const now = () => new Date().toISOString();

    try {
        await run("BEGIN TRANSACTION");
        const orderNumber = await generateNextOrderNumber(createdAt);

        await run(
            `INSERT INTO orders
             (id, order_number, name, status, total_price, created_at)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [orderId, orderNumber, normalizedName, "pending", totalPrice, createdAt]
        );

        for (const item of normalizedCart) {
            const menuId = item.id;
            const itemVolume = item.volume;

            await run(
                "INSERT INTO order_items (order_id, menu_id, name_snapshot, price_snapshot, volume) VALUES (?, ?, ?, ?, ?)",
                [
                    orderId,
                    menuId,
                    item.name,
                    item.price,
                    itemVolume,
                ]
            );

            if (!menuId) continue;

            const recipeRows = await all(
                `SELECT mi.inventory_item_id, mi.qty_per_unit, s.quantity
                 FROM menu_ingredients mi
                 JOIN inventory_stock s ON s.item_id = mi.inventory_item_id
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
                   )`,
                [menuId, itemVolume, itemVolume]
            );

            for (const recipeRow of recipeRows) {
                const requiredQty = Number(recipeRow.qty_per_unit);
                const currentQty = Number(recipeRow.quantity || 0);

                if (currentQty < requiredQty) {
                    throw makeOrderServiceError(
                        `Not enough stock for ingredient #${recipeRow.inventory_item_id}`,
                        400,
                        "ORDER_STOCK_SHORTAGE"
                    );
                }

                await run(
                    "UPDATE inventory_stock SET quantity = quantity - ?, updated_at = ? WHERE item_id = ?",
                    [requiredQty, now(), recipeRow.inventory_item_id]
                );

                await run(
                    `INSERT INTO inventory_movements
                     (item_id, movement_type, quantity, reason, reference_type, reference_id, created_at)
                     VALUES (?, 'out', ?, ?, ?, ?, ?)`,
                    [recipeRow.inventory_item_id, requiredQty, "order", "order", orderId, now()]
                );
            }
        }

        await run("COMMIT");
        return getOrderById(orderId);
    } catch (error) {
        await run("ROLLBACK");
        throw error;
    }
}

async function updateOrderStatus(id, status) {
    await initializeDatabase();
    const normalizedStatus = String(status || "").trim().toLowerCase();
    const validStatuses = new Set(Object.values(ORDER_STATUSES));
    if (!validStatuses.has(normalizedStatus)) {
        throw makeOrderServiceError(
            "Invalid status. Allowed: pending, ready, paid, closed",
            400,
            "ORDER_INVALID_STATUS"
        );
    }

    const order = await getOrderLifecycleState(id);
    if (!isStatusTransitionAllowed(order.status, normalizedStatus)) {
        throw makeOrderServiceError(
            `Invalid status transition: ${order.status} -> ${normalizedStatus}`,
            400,
            "ORDER_INVALID_STATUS_TRANSITION"
        );
    }

    await run("UPDATE orders SET status = ? WHERE id = ?", [normalizedStatus, String(id)]);
    return getOrderById(id);
}

async function payOrder(id, paymentMethod) {
    await initializeDatabase();
    const allowedMethods = new Set(["cash", "card", "other"]);
    const normalizedMethod = String(paymentMethod || "").trim().toLowerCase();
    if (!normalizedMethod) {
        throw makeOrderServiceError("paymentMethod is required", 400, "ORDER_PAYMENT_METHOD_REQUIRED");
    }
    if (!allowedMethods.has(normalizedMethod)) {
        throw makeOrderServiceError(
            "paymentMethod must be one of: cash, card, other",
            400,
            "ORDER_INVALID_PAYMENT_METHOD"
        );
    }

    const order = await getOrderLifecycleState(id);
    if (order.status === ORDER_STATUSES.CLOSED) {
        throw makeOrderServiceError("Order is already closed", 409, "ORDER_ALREADY_CLOSED");
    }
    if (order.status === ORDER_STATUSES.PAID) {
        throw makeOrderServiceError("Order is already paid", 409, "ORDER_ALREADY_PAID");
    }
    if (order.status !== ORDER_STATUSES.READY) {
        throw makeOrderServiceError("Only ready orders can be paid", 400, "ORDER_INVALID_PAYMENT_STATUS");
    }

    await run(
        `UPDATE orders
         SET payment_method = ?, paid_at = ?, status = ?
         WHERE id = ?`,
        [normalizedMethod, new Date().toISOString(), ORDER_STATUSES.PAID, String(id)]
    );
    return getOrderById(id);
}

async function closeOrderWithEmployeeCode(id, employeeCode) {
    await initializeDatabase();
    const normalizedCode = String(employeeCode || "").trim();
    if (!normalizedCode) {
        throw makeOrderServiceError("employeeCode is required", 400, "ORDER_EMPLOYEE_CODE_REQUIRED");
    }
    if (normalizedCode.length < 3 || normalizedCode.length > 32) {
        throw makeOrderServiceError(
            "employeeCode length must be from 3 to 32 characters",
            400,
            "ORDER_EMPLOYEE_CODE_LENGTH"
        );
    }
    if (!/^[A-Za-z0-9_-]+$/.test(normalizedCode)) {
        throw makeOrderServiceError(
            "employeeCode has invalid characters",
            400,
            "ORDER_EMPLOYEE_CODE_FORMAT"
        );
    }

    const order = await getOrderLifecycleState(id);
    if (order.status === ORDER_STATUSES.CLOSED) {
        throw makeOrderServiceError("Order is already closed", 409, "ORDER_ALREADY_CLOSED");
    }
    if (order.status !== ORDER_STATUSES.PAID) {
        throw makeOrderServiceError("Only paid orders can be closed", 400, "ORDER_INVALID_CLOSE_STATUS");
    }

    const employee = await get(
        `SELECT id, full_name, status, position
         FROM employees
         WHERE personal_code = ?`,
        [normalizedCode]
    );
    if (!employee) {
        throw makeOrderServiceError("Employee code is invalid", 404, "ORDER_EMPLOYEE_CODE_INVALID");
    }
    if (employee.status !== "active") {
        throw makeOrderServiceError("Employee is not active", 403, "ORDER_EMPLOYEE_INACTIVE");
    }
    const allowedCloserPositions = new Set(["barista", "manager", "бариста", "менеджер"]);
    if (!allowedCloserPositions.has(String(employee.position || "").trim().toLowerCase())) {
        throw makeOrderServiceError(
            "Employee position is not allowed to close orders",
            403,
            "ORDER_EMPLOYEE_POSITION_NOT_ALLOWED"
        );
    }

    await run(
        `UPDATE orders
         SET closed_by_employee_id = ?, closed_at = ?, status = ?
         WHERE id = ?`,
        [employee.id, new Date().toISOString(), ORDER_STATUSES.CLOSED, String(id)]
    );
    return getOrderById(id);
}

module.exports = {
    getOrders,
    getOrderById,
    createOrder,
    updateOrderStatus,
    payOrder,
    closeOrderWithEmployeeCode,
    OrderServiceError,
};