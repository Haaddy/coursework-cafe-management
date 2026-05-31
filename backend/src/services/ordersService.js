const crypto = require("crypto");
const { all, get, run, initializeDatabase } = require("../data/database"); // ! импорт модуля базы данных

const ORDER_STATUSES = Object.freeze({ // ! статусы заказов
    PENDING: "pending",
    READY: "ready",
    PAID: "paid",
    CLOSED: "closed",
});

class OrderServiceError extends Error { // ! класс ошибки заказа
    constructor(message, statusCode, code = "ORDER_ERROR") { // ! конструктор класса ошибки заказа
        super(message);
        this.name = "OrderServiceError";
        this.statusCode = statusCode;
        this.code = code;
    }
}

function makeOrderServiceError(message, statusCode, code) { // ! функция создания ошибки заказа
    return new OrderServiceError(message, statusCode, code);
}

function isStatusTransitionAllowed(currentStatus, nextStatus) { // ! функция проверки допустимости перехода статуса заказа
    if (currentStatus === nextStatus) return true; 
    if (currentStatus === ORDER_STATUSES.PENDING && nextStatus === ORDER_STATUSES.READY) return true;
    if (currentStatus === ORDER_STATUSES.READY && nextStatus === ORDER_STATUSES.PAID) return true;
    if (currentStatus === ORDER_STATUSES.PAID && nextStatus === ORDER_STATUSES.CLOSED) return true;
    return false;
}

async function getOrderLifecycleState(id) { // ! функция получения состояния заказа
    const order = await get( // ! получение заказа
        `SELECT id, status, closed_by_employee_id
         FROM orders
         WHERE id = ?`,
        [String(id)]
    );

    if (!order) { 
        throw makeOrderServiceError("Order not found", 404, "ORDER_NOT_FOUND"); // ! отправка ошибки если заказ не найден
    }

    return order; // ! возвращение заказа
}

function normalizeOrderDateForNumber(value) { // ! функция нормализации даты заказа
    const parsedDate = value ? new Date(value) : new Date(); // ! получение даты заказа
    const safeDate = Number.isNaN(parsedDate.getTime()) ? new Date() : parsedDate;
    return safeDate.toISOString().slice(0, 10).replace(/-/g, ""); // ! возвращение нормализованной даты заказа
}

function buildOrderNumber(dateValue, sequence) { // ! функция построения номера заказа
    const datePart = normalizeOrderDateForNumber(dateValue); // ! получение даты заказа
    return `${datePart}-${String(sequence).padStart(4, "0")}`; // ! возвращение номера заказа
}

async function generateNextOrderNumber(createdAt) { // ! функция генерации следующего номера заказа
    
    const datePart = normalizeOrderDateForNumber(createdAt); // ! получение даты заказа
    const latestRow = await get( // ! получение последнего заказа
        `SELECT order_number
         FROM orders
         WHERE order_number LIKE ?
         ORDER BY order_number DESC
         LIMIT 1`,
        [`${datePart}-%`] 
    );

    let nextSequence = 1; // ! начальное значение последовательности
    if (latestRow?.order_number) { // ! если есть последний заказ
        const match = new RegExp(`^${datePart}-(\\d+)$`).exec(String(latestRow.order_number));
        if (match) { // ! если есть совпадение
            nextSequence = Number(match[1]) + 1;
        }
    }

    return buildOrderNumber(createdAt, nextSequence); // ! возвращение номера заказа
}

function mapOrderRowToBase(orderRow) { // ! функция преобразования строки заказа в базовый объект
    const closedByEmployeeId = orderRow.closed_by_employee_id == null  
        ? null
        : Number(orderRow.closed_by_employee_id); // ! получение ID сотрудника закрывшего заказ

    return { // ! возвращение базового объекта заказа
        id: orderRow.id,
        orderNumber: orderRow.order_number,
        status: orderRow.status,
        totalPrice: Number(orderRow.total_price),
        paymentMethod: orderRow.payment_method,
        paidAt: orderRow.paid_at,
        closedByEmployeeId,
        closedAt: orderRow.closed_at,
        closedByEmployee: closedByEmployeeId == null
            ? null
            : { // ! возвращение объекта сотрудника закрывшего заказ
                id: closedByEmployeeId,
                fullName: orderRow.closed_by_employee_name,
            },
        createdAt: orderRow.created_at,
    };
}

async function expandOrder(orderRow) { // ! функция расширения заказа
    const itemsRows = await all( // ! получение строк заказа
        `SELECT menu_id, name_snapshot, price_snapshot, volume
         FROM order_items
         WHERE order_id = ?
         ORDER BY id ASC`,
        [orderRow.id]
    );

    return { // ! возвращение расширенного объекта заказа
        ...mapOrderRowToBase(orderRow),
        items: itemsRows.map((item) => ({ // ! возвращение массива объектов заказа
            id: item.menu_id,
            name: item.name_snapshot,
            price: Number(item.price_snapshot), // ! получение цены заказа
            volume: item.volume, // ! получение объема заказа
        })), 
    };
}


async function getOrders(filters = {}) { // ! функция получения списка заказов
    await initializeDatabase();
    const validStatuses = new Set(Object.values(ORDER_STATUSES)); // ! получение списка статусов заказов
    const where = []; // ! массив условий
    const params = []; // ! массив параметров

    if (filters.activeOnly) { // ! если фильтр активных заказов
        where.push("o.status IN ('pending', 'ready', 'paid')");
    }

    if (filters.status) { // ! если фильтр статуса заказа
        const normalizedStatus = String(filters.status).trim().toLowerCase(); // ! получение нормализованного статуса заказа
        if (!validStatuses.has(normalizedStatus)) { // ! если статус заказа не в списке допустимых статусов
            throw makeOrderServiceError(
                "Invalid status filter. Allowed: pending, ready, paid, closed", // ! отправка ошибки если статус заказа не в списке допустимых статусов
                400, // ! статус ошибки
                "ORDER_INVALID_STATUS_FILTER" // ! код ошибки
            );
        }
        where.push("o.status = ?"); // ! добавление условия в массив условий
        params.push(normalizedStatus); // ! добавление параметра в массив параметров
    }

    if (filters.date) { // ! если фильтр даты заказа
        const normalizedDate = String(filters.date).trim().toLowerCase(); // ! получение нормализованной даты заказа
        if (normalizedDate === "today") {
            where.push("date(o.created_at) = date('now', 'localtime')"); // ! добавление условия в массив условий
        } else if (/^\d{4}-\d{2}-\d{2}$/.test(normalizedDate)) { // ! если дата заказа в формате YYYY-MM-DD
            where.push("date(o.created_at) = date(?)"); // ! добавление условия в массив условий
            params.push(normalizedDate); // ! добавление параметра в массив параметров
        } else {
            throw makeOrderServiceError(
                "Invalid date filter. Use today or YYYY-MM-DD",
                400,
                "ORDER_INVALID_DATE_FILTER"
            );
        }
    }

    if (filters.from) { // ! если фильтр даты с
        const normalizedFrom = String(filters.from).trim();
        const date = new Date(normalizedFrom); // ! получение даты заказа
        if (Number.isNaN(date.getTime())) { // ! если дата заказа не валидна
            throw makeOrderServiceError(
                "Invalid from filter. Use ISO date", // ! отправка ошибки если дата заказа не валидна
                400, // ! статус ошибки
                "ORDER_INVALID_FROM_FILTER" // ! код ошибки
            );
        }
        where.push("o.created_at >= ?"); // ! добавление условия в массив условий
        params.push(date.toISOString()); // ! добавление параметра в массив параметров
    }
    if (filters.to) { // ! если фильтр даты до
        const normalizedTo = String(filters.to).trim(); // ! получение нормализованной даты заказа
        const date = new Date(normalizedTo); // ! получение даты заказа
        if (Number.isNaN(date.getTime())) { // ! если дата заказа не валидна
            throw makeOrderServiceError(
                "Invalid to filter. Use ISO date", // ! отправка ошибки если дата заказа не валидна
                400,
                "ORDER_INVALID_TO_FILTER"
            );
        }
        where.push("o.created_at <= ?"); // ! добавление условия в массив условий
        params.push(date.toISOString()); // ! добавление параметра в массив параметров
    }

    if (filters.q) { // ! если фильтр поиска
        const normalizedQuery = String(filters.q).trim(); // ! получение нормализованного запроса
        if (normalizedQuery) { // ! если запрос не пустой
            where.push("o.order_number LIKE ?"); // ! добавление условия в массив условий
            params.push(`%${normalizedQuery}%`); // ! добавление параметра в массив параметров
        }
    }

    const whereSql = where.length > 0 ? `WHERE ${where.join(" AND ")}` : ""; // ! получение строки условий
    const orderRows = await all( // ! получение строк заказа
        `SELECT
            o.id,
            o.order_number,
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
    return Promise.all(orderRows.map(expandOrder)); // ! возвращение списка заказов
}

async function getOrderById(id) { // ! функция получения заказа по ID
    await initializeDatabase();
    const orderRow = await get( // ! получение строки заказа
        `SELECT
            o.id,
            o.order_number,
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
        throw makeOrderServiceError("Order not found", 404, "ORDER_NOT_FOUND"); // ! отправка ошибки если заказ не найден
    }
    return expandOrder(orderRow); // ! возвращение расширенного объекта заказа
}

function normalizeCartItem(item, index) { // ! функция нормализации товара в корзине
    if (!item || typeof item !== "object") {
        throw makeOrderServiceError(
            `Cart item #${index + 1} is invalid`,
            400,
            "ORDER_INVALID_CART_ITEM"
        );
    }

    const normalizedName = String(item.name || "").trim(); // ! получение нормализованного имени товара
    if (!normalizedName) { // ! если имя товара не валидно
        throw makeOrderServiceError(
            `Cart item #${index + 1} name is required`,
            400,
            "ORDER_INVALID_CART_ITEM_NAME"
        );
    }

    const normalizedPrice = Number(item.price); // ! получение нормализованной цены товара
    if (!Number.isFinite(normalizedPrice) || normalizedPrice <= 0) { // ! если цена товара не валидна
        throw makeOrderServiceError(
            `Cart item #${index + 1} price must be greater than 0`, // ! отправка ошибки если цена товара не валидна
            400,
            "ORDER_INVALID_CART_ITEM_PRICE"
        );
    }

    let normalizedMenuId = null; // ! начальное значение ID товара
    if (item.id != null && String(item.id).trim() !== "") { // ! если ID товара не пустой
        normalizedMenuId = Number(item.id); // ! получение нормализованного ID товара
        if (!Number.isInteger(normalizedMenuId) || normalizedMenuId <= 0) { // ! если ID товара не валидно
            throw makeOrderServiceError(
                `Cart item #${index + 1} id is invalid`,
                400,
                "ORDER_INVALID_CART_ITEM_ID"
            );
        }
    }

    let normalizedVolume = null; // ! начальное значение объема товара
    if (item.volume != null && String(item.volume).trim() !== "") { // ! если объем товара не пустой
        const volumeNumber = Number(item.volume); // ! получение нормализованного объема товара
        if (!Number.isFinite(volumeNumber) || volumeNumber <= 0) { // ! если объем товара не валиден
            throw makeOrderServiceError(
                `Cart item #${index + 1} volume is invalid`, // ! отправка ошибки если объем товара не валиден
                400,
                "ORDER_INVALID_CART_ITEM_VOLUME"
            );
        }
        normalizedVolume = String(item.volume); // ! получение нормализованного объема товара
    }

    return { // ! возвращение нормализованного товара
        id: normalizedMenuId,
        name: normalizedName, // ! получение нормализованного имени товара
        price: normalizedPrice, // ! получение нормализованной цены товара
        volume: normalizedVolume, // ! получение нормализованного объема товара
    };
}

async function createOrder(cart) { // ! функция создания заказа
    await initializeDatabase();
    const normalizedCart = cart.map((item, index) => normalizeCartItem(item, index)); // ! получение нормализованной корзины

    const totalPrice = normalizedCart.reduce((acc, item) => acc + Number(item.price), 0); // ! получение общей цены корзины
    const orderId = crypto.randomUUID?.() || String(Date.now()); // ! получение ID заказа
    const createdAt = new Date().toISOString(); // ! получение даты создания заказа
    const now = () => new Date().toISOString(); // ! получение текущей даты

    try {
        await run("BEGIN TRANSACTION"); // ! начало транзакции
        const orderNumber = await generateNextOrderNumber(createdAt); // ! получение следующего номера заказа

        await run( // ! добавление заказа в базу данных
            `INSERT INTO orders (id, order_number, status, total_price, created_at) VALUES (?, ?, ?, ?, ?)`,
            [orderId, orderNumber, "pending", totalPrice, createdAt]
        );

        for (const item of normalizedCart) { // ! добавление товаров в заказ
            const menuId = item.id; // ! получение ID товара
            const itemVolume = item.volume; // ! получение объема товара

            await run( // ! добавление товара в заказ
                "INSERT INTO order_items (order_id, menu_id, name_snapshot, price_snapshot, volume) VALUES (?, ?, ?, ?, ?)",
                [
                    orderId,
                    menuId,
                    item.name,
                    item.price,
                    itemVolume,
                ]
            );

            if (!menuId) continue; // ! если товар не найден

            const recipeRows = await all( // ! получение строк рецептов
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

            for (const recipeRow of recipeRows) { // ! добавление рецептов в заказ
                const requiredQty = Number(recipeRow.qty_per_unit); // ! получение необходимого количества ингредиента
                const currentQty = Number(recipeRow.quantity || 0); // ! получение текущего количества ингредиента

                if (currentQty < requiredQty) { // ! если текущее количество ингредиента меньше необходимого
                    throw makeOrderServiceError(
                        `Недостаточно ингредиентов для «${item.name}»`, // ! отправка ошибки если недостаточно ингредиентов
                        400,
                        "ORDER_STOCK_SHORTAGE" // ! код ошибки
                    );
                }

                await run( // ! обновление количества ингредиента в базе данных
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

        await run("COMMIT"); // ! завершение транзакции
        return getOrderById(orderId); // ! возвращение заказа
    } catch (error) {
        await run("ROLLBACK"); // ! откат транзакции
        throw error;
    }
}

async function updateOrderStatus(id, status) { // ! функция обновления статуса заказа
    await initializeDatabase();
    const normalizedStatus = String(status || "").trim().toLowerCase(); // ! получение нормализованного статуса заказа
    const validStatuses = new Set(Object.values(ORDER_STATUSES)); // ! получение списка допустимых статусов заказов
    if (!validStatuses.has(normalizedStatus)) { // ! если статус заказа не в списке допустимых статусов
        throw makeOrderServiceError(
            "Invalid status. Allowed: pending, ready, paid, closed", // ! отправка ошибки если статус заказа не в списке допустимых статусов
            400,
            "ORDER_INVALID_STATUS"
        );
    }

    const order = await getOrderLifecycleState(id); // ! получение состояния заказа
    if (!isStatusTransitionAllowed(order.status, normalizedStatus)) { // ! если переход статуса заказа не допустим
        throw makeOrderServiceError(
            `Invalid status transition: ${order.status} -> ${normalizedStatus}`, // ! отправка ошибки если переход статуса заказа не допустим
            400,
            "ORDER_INVALID_STATUS_TRANSITION" // ! код ошибки
        );
    }

    await run("UPDATE orders SET status = ? WHERE id = ?", [normalizedStatus, String(id)]); // ! обновление статуса заказа в базе данных
    return getOrderById(id); // ! возвращение заказа
}

async function payOrder(id, paymentMethod) { // ! функция оплаты заказа
    await initializeDatabase();
    const allowedMethods = new Set(["cash", "card", "other"]); // ! получение списка допустимых методов оплаты
    const normalizedMethod = String(paymentMethod || "").trim().toLowerCase();
    if (!normalizedMethod) { // ! если метод оплаты не валиден
        throw makeOrderServiceError("paymentMethod is required", 400, "ORDER_PAYMENT_METHOD_REQUIRED"); // ! отправка ошибки если метод оплаты не валиден       
    }
    if (!allowedMethods.has(normalizedMethod)) { // ! если метод оплаты не в списке допустимых методов оплаты
        throw makeOrderServiceError(
            "paymentMethod must be one of: cash, card, other", // ! отправка ошибки если метод оплаты не в списке допустимых методов оплаты
            400,
            "ORDER_INVALID_PAYMENT_METHOD"
        );
    }

    const order = await getOrderLifecycleState(id); // ! получение состояния заказа
    if (order.status === ORDER_STATUSES.CLOSED) { // ! если заказ уже закрыт
        throw makeOrderServiceError("Order is already closed", 409, "ORDER_ALREADY_CLOSED");
    }
    if (order.status === ORDER_STATUSES.PAID) { // ! если заказ уже оплачен
        throw makeOrderServiceError("Order is already paid", 409, "ORDER_ALREADY_PAID");
    }
    if (order.status !== ORDER_STATUSES.READY) { // ! если заказ не готов к оплате
        throw makeOrderServiceError("Only ready orders can be paid", 400, "ORDER_INVALID_PAYMENT_STATUS");
    }

    await run( // ! обновление статуса заказа в базе данных
        `UPDATE orders
         SET payment_method = ?, paid_at = ?, status = ?
         WHERE id = ?`,
        [normalizedMethod, new Date().toISOString(), ORDER_STATUSES.PAID, String(id)]
    );
    return getOrderById(id); // ! возвращение заказа
}

async function closeOrderWithEmployeeCode(id, employeeCode) { // ! функция закрытия заказа с кодом сотрудника
    await initializeDatabase();
    const normalizedCode = String(employeeCode || "").trim(); // ! получение нормализованного кода сотрудника
    if (!normalizedCode) { // ! если код сотрудника не валиден
        throw makeOrderServiceError("employeeCode is required", 400, "ORDER_EMPLOYEE_CODE_REQUIRED");
    }
    if (normalizedCode.length < 3 || normalizedCode.length > 32) { // ! если код сотрудника не валиден
        throw makeOrderServiceError(
            "employeeCode length must be from 3 to 32 characters", // ! отправка ошибки если код сотрудника не валиден
            400,
            "ORDER_EMPLOYEE_CODE_LENGTH"
        );
    }
    if (!/^[A-Za-z0-9_-]+$/.test(normalizedCode)) { // ! если код сотрудника не валиден
        throw makeOrderServiceError(
            "employeeCode has invalid characters", // ! отправка ошибки если код сотрудника не валиден
            400,
            "ORDER_EMPLOYEE_CODE_FORMAT"
        );
    }

    const order = await getOrderLifecycleState(id); // ! получение состояния заказа
    if (order.status === ORDER_STATUSES.CLOSED) { // ! если заказ уже закрыт
        throw makeOrderServiceError("Order is already closed", 409, "ORDER_ALREADY_CLOSED");
    }
    if (order.status !== ORDER_STATUSES.PAID) { // ! если заказ не оплачен
        throw makeOrderServiceError("Only paid orders can be closed", 400, "ORDER_INVALID_CLOSE_STATUS");
    }

    const employee = await get( // ! получение сотрудника
        `SELECT id, full_name, status, position
         FROM employees
         WHERE personal_code = ?`,
        [normalizedCode]
    );
    if (!employee) { // ! если сотрудник не найден  
        throw makeOrderServiceError("Employee code is invalid", 404, "ORDER_EMPLOYEE_CODE_INVALID");
    }
    if (employee.status !== "active") { // ! если сотрудник не активен
        throw makeOrderServiceError("Employee is not active", 403, "ORDER_EMPLOYEE_INACTIVE");
    }
    const allowedCloserPositions = new Set(["barista", "manager", "бариста", "менеджер"]); // ! получение списка допустимых позиций сотрудников
    if (!allowedCloserPositions.has(String(employee.position || "").trim().toLowerCase())) { // ! если позиция сотрудника не в списке допустимых позиций сотрудников
        throw makeOrderServiceError(
            "Employee position is not allowed to close orders",
            403,
            "ORDER_EMPLOYEE_POSITION_NOT_ALLOWED"
        );
    }

    await run( // ! обновление статуса заказа в базе данных
        `UPDATE orders
         SET closed_by_employee_id = ?, closed_at = ?, status = ?
         WHERE id = ?`,
        [employee.id, new Date().toISOString(), ORDER_STATUSES.CLOSED, String(id)]
    );
    return getOrderById(id); // ! возвращение заказа
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