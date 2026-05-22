const { all, get, initializeDatabase } = require("../data/database");
const { parseDateRange } = require("../utils/parseDateBounds");

const GROUP_SQL = {
  day: { select: "date(created_at)", group: "date(created_at)" },
  week: { select: "strftime('%Y-W%W', created_at)", group: "strftime('%Y-W%W', created_at)" },
  month: { select: "strftime('%Y-%m', created_at)", group: "strftime('%Y-%m', created_at)" },
};

const DEFAULT_TOP_PRODUCTS_LIMIT = 10;
const MAX_TOP_PRODUCTS_LIMIT = 50;

function assertGroupBy(groupBy) {
  if (groupBy == null || groupBy === "") {
    return null;
  }
  const g = String(groupBy).toLowerCase();
  if (!GROUP_SQL[g]) {
    throw new Error("groupBy must be one of: day, week, month");
  }
  return g;
}

function parseTopLimit(raw) {
  if (raw == null || String(raw).trim() === "") {
    return DEFAULT_TOP_PRODUCTS_LIMIT;
  }
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 1) {
    throw new Error("topLimit must be a positive number");
  }
  return Math.min(Math.floor(n), MAX_TOP_PRODUCTS_LIMIT);
}

function formatHourRange(hour) {
  const h = Number(hour);
  const next = (h + 1) % 24;
  const pad = (v) => String(v).padStart(2, "0");
  return `${pad(h)}:00–${pad(next)}:00`;
}

async function getOrdersSummary(fromIso, toIso) {
  const row = await get(
    `SELECT
       COUNT(*) AS order_count,
       COALESCE(SUM(total_price), 0) AS total_revenue
     FROM orders
     WHERE datetime(created_at) >= datetime(?)
       AND datetime(created_at) <= datetime(?)`,
    [fromIso, toIso]
  );

  const orderCount = Number(row?.order_count || 0);
  const totalRevenue = Number(row?.total_revenue || 0);
  const averageCheck = orderCount > 0 ? totalRevenue / orderCount : null;

  return { totalRevenue, orderCount, averageCheck };
}

async function getOrdersPeriods(fromIso, toIso, groupBy) {
  const { select, group } = GROUP_SQL[groupBy];
  const rows = await all(
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

  return rows.map((r) => {
    const count = Number(r.order_count || 0);
    const revenue = Number(r.revenue || 0);
    return {
      period: String(r.period),
      orderCount: count,
      revenue,
      averageCheck: count > 0 ? revenue / count : null,
    };
  });
}

async function getTopProducts(fromIso, toIso, limit) {
  const rows = await all(
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

  return rows.map((row, index) => ({
    rank: index + 1,
    menuId: row.menu_id == null ? null : Number(row.menu_id),
    name: String(row.name || ""),
    orderCount: Number(row.line_count || 0),
    revenue: Number(row.revenue || 0),
  }));
}

async function getSalesByHour(fromIso, toIso) {
  const rows = await all(
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

  const countByHour = new Map(rows.map((r) => [Number(r.hour), Number(r.order_count || 0)]));
  const salesByHour = Array.from({ length: 24 }, (_, hour) => ({
    hour,
    label: formatHourRange(hour),
    orderCount: countByHour.get(hour) || 0,
  }));

  let peakHour = null;
  for (const bucket of salesByHour) {
    if (!peakHour || bucket.orderCount > peakHour.orderCount) {
      peakHour = bucket;
    }
  }

  if (peakHour && peakHour.orderCount === 0) {
    peakHour = null;
  }

  return { salesByHour, peakHour };
}

async function getTopEmployeesByClosedChecks(fromIso, toIso, limit) {
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

  return rows.map((row, index) => ({
    rank: index + 1,
    employeeId: Number(row.employee_id),
    fullName: String(row.full_name || ""),
    position: String(row.position || ""),
    personalCode: String(row.personal_code || ""),
    closedCount: Number(row.closed_count || 0),
    revenue: Number(row.revenue || 0),
  }));
}

async function getClosedOrdersSummary(fromIso, toIso) {
  const row = await get(
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
    closedCount: Number(row?.closed_count || 0),
    totalRevenue: Number(row?.total_revenue || 0),
  };
}

async function getEmployeesAnalytics(fromRaw, toRaw, topLimitRaw) {
  await initializeDatabase();
  const { fromIso, toIso } = parseDateRange(fromRaw, toRaw);
  const topLimit = parseTopLimit(topLimitRaw);

  const [summary, topEmployees] = await Promise.all([
    getClosedOrdersSummary(fromIso, toIso),
    getTopEmployeesByClosedChecks(fromIso, toIso, topLimit),
  ]);

  return {
    from: fromIso,
    to: toIso,
    summary,
    topEmployees,
  };
}

async function getOrdersAnalytics(fromRaw, toRaw, groupByRaw, topLimitRaw) {
  await initializeDatabase();
  const { fromIso, toIso } = parseDateRange(fromRaw, toRaw);
  const groupBy = assertGroupBy(groupByRaw);
  const topLimit = parseTopLimit(topLimitRaw);

  const [summary, topProducts, hourStats] = await Promise.all([
    getOrdersSummary(fromIso, toIso),
    getTopProducts(fromIso, toIso, topLimit),
    getSalesByHour(fromIso, toIso),
  ]);

  const base = {
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
    return base;
  }

  const periods = await getOrdersPeriods(fromIso, toIso, groupBy);
  return { ...base, groupBy, buckets: periods };
}

module.exports = { getOrdersAnalytics, getEmployeesAnalytics };
