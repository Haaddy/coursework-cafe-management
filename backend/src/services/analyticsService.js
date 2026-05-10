const { all, get, initializeDatabase } = require("../data/database");
const { parseDateRange } = require("../utils/parseDateBounds");

const GROUP_SQL = {
  day: { select: "date(created_at)", group: "date(created_at)" },
  week: { select: "strftime('%Y-W%W', created_at)", group: "strftime('%Y-W%W', created_at)" },
  month: { select: "strftime('%Y-%m', created_at)", group: "strftime('%Y-%m', created_at)" },
};

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

async function getOrdersAnalytics(fromRaw, toRaw, groupByRaw) {
  await initializeDatabase();
  const { fromIso, toIso } = parseDateRange(fromRaw, toRaw);
  const groupBy = assertGroupBy(groupByRaw);

  const summary = await getOrdersSummary(fromIso, toIso);

  if (!groupBy) {
    return { from: fromIso, to: toIso, summary, buckets: null };
  }

  const periods = await getOrdersPeriods(fromIso, toIso, groupBy);
  return { from: fromIso, to: toIso, summary, groupBy, buckets: periods };
}

module.exports = { getOrdersAnalytics };
