const analyticsService = require("../services/analyticsService");

async function getOrdersAnalytics(req, res) {
  try {
    const { from, to, groupBy, topLimit } = req.query;
    const payload = await analyticsService.getOrdersAnalytics(from, to, groupBy, topLimit);
    res.json(payload);
  } catch (err) {
    const message = err.message || "Analytics error";
    const status = message.includes("required") || message.includes("Invalid") || message.includes("must be") ? 400 : 500;
    res.status(status).json({ error: message });
  }
}

async function getEmployeesAnalytics(req, res) {
  try {
    const { from, to, topLimit } = req.query;
    const payload = await analyticsService.getEmployeesAnalytics(from, to, topLimit);
    res.json(payload);
  } catch (err) {
    const message = err.message || "Analytics error";
    const status = message.includes("required") || message.includes("Invalid") || message.includes("must be") ? 400 : 500;
    res.status(status).json({ error: message });
  }
}

module.exports = { getOrdersAnalytics, getEmployeesAnalytics };
