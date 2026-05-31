const analyticsService = require("../services/analyticsService");

async function getOrdersAnalytics(req, res) { // ! функция получения статистики заказов
  try {
    const { from, to, groupBy, topLimit } = req.query; // ! получение данных из query-параметров
    const payload = await analyticsService.getOrdersAnalytics(from, to, groupBy, topLimit);
    res.json(payload); // ! отправка статистики заказов
  } catch (err) {
    const message = err.message || "Analytics error"; // ! отправка ошибки если не удалось получить статистику заказов
    const status = message.includes("required") || message.includes("Invalid") || message.includes("must be") ? 400 : 500;
    res.status(status).json({ error: message });
  }
}

async function getEmployeesAnalytics(req, res) { // ! функция получения статистики сотрудников
  try {
    const { from, to, topLimit } = req.query; // ! получение данных из query-параметров
    const payload = await analyticsService.getEmployeesAnalytics(from, to, topLimit); // ! получение статистики сотрудников
    res.json(payload); // ! отправка статистики сотрудников
  } catch (err) {
    const message = err.message || "Analytics error"; // ! отправка ошибки если не удалось получить статистику сотрудников
    const status = message.includes("required") || message.includes("Invalid") || message.includes("must be") ? 400 : 500;
    res.status(status).json({ error: message });
  }
}

module.exports = { getOrdersAnalytics, getEmployeesAnalytics };
