const { all, get, initializeDatabase } = require("../data/database");
const { parseDateRange } = require("../utils/parseDateBounds");

const GROUP_SQL = {
  day: { select: "date(created_at)", group: "date(created_at)" },
  week: { select: "strftime('%Y-W%W', created_at)", group: "strftime('%Y-W%W', created_at)" },
  month: { select: "strftime('%Y-%m', created_at)", group: "strftime('%Y-%m', created_at)" },
}; // ! массив группировки заказов

const DEFAULT_TOP_PRODUCTS_LIMIT = 10; // ! значение по умолчанию для лимита топ продуктов
const MAX_TOP_PRODUCTS_LIMIT = 50; // ! максимальное значение для лимита топ продуктов

function assertGroupBy(groupBy) { // ! функция проверки группировки заказов
  if (groupBy == null || groupBy === "") {
    return null; // ! возвращение null если группировка заказов не задана
  }
  const g = String(groupBy).toLowerCase();
  if (!GROUP_SQL[g]) {
    throw new Error("groupBy must be one of: day, week, month"); // ! отправка ошибки если группировка заказов не валидна
  }
  return g; // ! возвращение группировки заказов
}

function parseTopLimit(raw) { // ! функция парсинга лимита топ продуктов
  if (raw == null || String(raw).trim() === "") {
    return DEFAULT_TOP_PRODUCTS_LIMIT; // ! возвращение значения по умолчанию для лимита топ продуктов
  }
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 1) {
    throw new Error("topLimit must be a positive number"); // ! отправка ошибки если лимит топ продуктов не является положительным числом
  }
  return Math.min(Math.floor(n), MAX_TOP_PRODUCTS_LIMIT); // ! возвращение минимального значения для лимита топ продуктов
}

function formatHourRange(hour) { // ! функция форматирования часового диапазона
  const h = Number(hour);
  const next = (h + 1) % 24;
  const pad = (v) => String(v).padStart(2, "0");
  return `${pad(h)}:00–${pad(next)}:00`;
}

async function getOrdersSummary(fromIso, toIso) { // ! функция получения суммы заказов
  const row = await get( // ! получение строки заказа
    `SELECT
       COUNT(*) AS order_count,
       COALESCE(SUM(total_price), 0) AS total_revenue
     FROM orders
     WHERE datetime(created_at) >= datetime(?)
       AND datetime(created_at) <= datetime(?)`,
    [fromIso, toIso]
  );

  const orderCount = Number(row?.order_count || 0); // ! получение количества заказов
  const totalRevenue = Number(row?.total_revenue || 0); // ! получение суммы заказов
  const averageCheck = orderCount > 0 ? totalRevenue / orderCount : null; // ! получение среднего чека заказов

  return { totalRevenue, orderCount, averageCheck }; // ! возвращение суммы заказов
}

async function getOrdersPeriods(fromIso, toIso, groupBy) { // ! функция получения периодов заказов
  const { select, group } = GROUP_SQL[groupBy]; // ! получение select и group из GROUP_SQL
  const rows = await all( // ! получение строк заказов
    `SELECT
       ${select} AS period,
       COUNT(*) AS order_count,
       COALESCE(SUM(total_price), 0) AS revenue
     FROM orders
     WHERE datetime(created_at) >= datetime(?)
       AND datetime(created_at) <= datetime(?)
     GROUP BY ${group}
     ORDER BY period ASC`,
    [fromIso, toIso]
  );

  return rows.map((r) => { // ! возвращение периодов заказов
    const count = Number(r.order_count || 0); // ! получение количества заказов
    const revenue = Number(r.revenue || 0); // ! получение суммы заказов
    return {
      period: String(r.period),
      orderCount: count, // ! получение количества заказов
      revenue, // ! получение суммы заказов
      averageCheck: count > 0 ? revenue / count : null, // ! получение среднего чека заказов
    };
  });
}

async function getTopProducts(fromIso, toIso, limit) { // ! функция получения топ продуктов
  const rows = await all( // ! получение строк продуктов
    `SELECT
       oi.menu_id,
       oi.name_snapshot AS name,
       COUNT(*) AS line_count,
       COALESCE(SUM(oi.price_snapshot), 0) AS revenue
     FROM order_items oi
     INNER JOIN orders o ON o.id = oi.order_id
     WHERE datetime(o.created_at) >= datetime(?)
       AND datetime(o.created_at) <= datetime(?)
     GROUP BY COALESCE(oi.menu_id, oi.name_snapshot), oi.name_snapshot
     ORDER BY line_count DESC, revenue DESC, name ASC
     LIMIT ?`,
    [fromIso, toIso, limit]
  );

  return rows.map((row, index) => ({ // ! возвращение топ продуктов
    rank: index + 1, // ! получение ранга продукта
    menuId: row.menu_id == null ? null : Number(row.menu_id),
    name: String(row.name || ""), // ! получение названия продукта
    orderCount: Number(row.line_count || 0), // ! получение количества заказов
    revenue: Number(row.revenue || 0), // ! получение суммы заказов
  }));
}

async function getSalesByHour(fromIso, toIso) { // ! функция получения продаж по часам
  const rows = await all( // ! получение строк продаж
    `SELECT
       CAST(strftime('%H', o.created_at, 'localtime') AS INTEGER) AS hour,
       COUNT(*) AS order_count
     FROM orders o
     WHERE datetime(o.created_at) >= datetime(?)
       AND datetime(o.created_at) <= datetime(?)
     GROUP BY hour
     ORDER BY hour ASC`,
    [fromIso, toIso]
  );

  const countByHour = new Map(rows.map((r) => [Number(r.hour), Number(r.order_count || 0)])); // ! получение количества продаж по часам
  const salesByHour = Array.from({ length: 24 }, (_, hour) => ({
    hour, // ! получение часа
    label: formatHourRange(hour), // ! получение метки времени
    orderCount: countByHour.get(hour) || 0, // ! получение количества продаж по часам
  }));

  let peakHour = null; // ! получение пикового часа
  for (const bucket of salesByHour) { 
    if (!peakHour || bucket.orderCount > peakHour.orderCount) { // ! если пиковый час не найден или количество продаж по часам больше пикового часа
      peakHour = bucket; // ! получение пикового часа
    }
  }

  if (peakHour && peakHour.orderCount === 0) { // ! если пиковый час не найден или количество продаж по часам равно 0
    peakHour = null; // ! получение пикового часа
  }

  return { salesByHour, peakHour }; // ! возвращение продаж по часам
}

async function getTopEmployeesByClosedChecks(fromIso, toIso, limit) { // ! функция получения топ сотрудников по закрытым чекам
  const rows = await all(
    `SELECT
       e.id AS employee_id,
       e.full_name,
       e.position,
       e.personal_code,
       COUNT(*) AS closed_count,
       COALESCE(SUM(o.total_price), 0) AS revenue
     FROM orders o
     INNER JOIN employees e ON e.id = o.closed_by_employee_id
     WHERE o.status = 'closed'
       AND o.closed_by_employee_id IS NOT NULL
       AND datetime(COALESCE(o.closed_at, o.created_at)) >= datetime(?)
       AND datetime(COALESCE(o.closed_at, o.created_at)) <= datetime(?)
     GROUP BY e.id
     ORDER BY closed_count DESC, revenue DESC, e.full_name ASC
     LIMIT ?`,
    [fromIso, toIso, limit]
  );

  return rows.map((row, index) => ({ // ! возвращение топ сотрудников по закрытым чекам
    rank: index + 1,
    employeeId: Number(row.employee_id),
    fullName: String(row.full_name || ""),
    position: String(row.position || ""),
    personalCode: String(row.personal_code || ""),
    closedCount: Number(row.closed_count || 0),
    revenue: Number(row.revenue || 0),
  }));
}

async function getClosedOrdersSummary(fromIso, toIso) { // ! функция получения суммы закрытых заказов
  const row = await get( // ! получение строки заказа
    `SELECT
       COUNT(*) AS closed_count,
       COALESCE(SUM(total_price), 0) AS total_revenue
     FROM orders
     WHERE status = 'closed'
       AND closed_by_employee_id IS NOT NULL
       AND datetime(COALESCE(closed_at, created_at)) >= datetime(?)
       AND datetime(COALESCE(closed_at, created_at)) <= datetime(?)`,
    [fromIso, toIso]
  );

  return {
    closedCount: Number(row?.closed_count || 0), // ! получение количества закрытых заказов
    totalRevenue: Number(row?.total_revenue || 0), // ! получение суммы закрытых заказов
  }; // ! возвращение суммы закрытых заказов
}

async function getEmployeesAnalytics(fromRaw, toRaw, topLimitRaw) { // ! функция получения аналитики сотрудников
  await initializeDatabase();
  const { fromIso, toIso } = parseDateRange(fromRaw, toRaw);
  const topLimit = parseTopLimit(topLimitRaw); // ! получение лимита топ сотрудников

  const [summary, topEmployees] = await Promise.all([ // ! получение суммы закрытых заказов и топ сотрудников по закрытым чекам
    getClosedOrdersSummary(fromIso, toIso),
    getTopEmployeesByClosedChecks(fromIso, toIso, topLimit), // ! получение топ сотрудников по закрытым чекам
  ]);

  return { // ! возвращение аналитики сотрудников
    from: fromIso,
    to: toIso,
    summary,
    topEmployees,
  };
}

async function getOrdersAnalytics(fromRaw, toRaw, groupByRaw, topLimitRaw) { // ! функция получения аналитики заказов
  await initializeDatabase();
  const { fromIso, toIso } = parseDateRange(fromRaw, toRaw);
  const groupBy = assertGroupBy(groupByRaw); // ! получение группировки заказов
  const topLimit = parseTopLimit(topLimitRaw); // ! получение лимита топ продуктов

  const [summary, topProducts, hourStats] = await Promise.all([ // ! получение суммы заказов, топ продуктов и продаж по часам
    getOrdersSummary(fromIso, toIso),
    getTopProducts(fromIso, toIso, topLimit), // ! получение топ продуктов
    getSalesByHour(fromIso, toIso),
  ]); // ! получение продаж по часам

  const base = { // ! получение базовой аналитики
    from: fromIso,
    to: toIso,
    summary,
    topProducts,
    salesByHour: hourStats.salesByHour,
    peakHour: hourStats.peakHour,
    buckets: null,
    groupBy: null,
  };

  if (!groupBy) { 
    return base; // ! возвращение базовой аналитики
  }

  const periods = await getOrdersPeriods(fromIso, toIso, groupBy); // ! получение периодов заказов
  return { ...base, groupBy, buckets: periods }; // ! возвращение аналитики заказов
}

module.exports = { getOrdersAnalytics, getEmployeesAnalytics };
