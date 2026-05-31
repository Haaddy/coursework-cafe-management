const employeesService = require("../services/employeesService");
const ALLOWED_STATUSES = new Set(["active", "vacation", "dismissed"]);

async function getEmployees(req, res) { // ! функция получения списка сотрудников
    try {
        const employees = await employeesService.getEmployees(); // ! получение списка сотрудников
        return res.json(employees); // ! отправка списка сотрудников
    } catch (err) {
        return res.status(500).json({ error: err.message || "Failed to fetch employees" });
    }
}

async function createEmployee(req, res) { // ! функция создания сотрудника
    try {
        const { fullName, position, status, personalCode } = req.body || {}; // ! получение данных из тела запроса
        if (!fullName || typeof fullName !== "string" || !fullName.trim()) {
            return res.status(400).json({ error: "fullName is required" }); // ! отправка ошибки если имя не указано
        }
        if (!position || typeof position !== "string" || !position.trim()) { // ! отправка ошибки если должность не указана
            return res.status(400).json({ error: "position is required" }); // ! отправка ошибки если должность не указана
        }
        if (!status || typeof status !== "string" || !ALLOWED_STATUSES.has(status)) { // ! отправка ошибки если статус не указан
            return res
                .status(400)
                .json({ error: "status must be one of: active, vacation, dismissed" }); // ! отправка ошибки если статус не указан
        }
        if (!personalCode || typeof personalCode !== "string" || !personalCode.trim()) {
            return res.status(400).json({ error: "personalCode is required" }); // ! отправка ошибки если личный код не указан
        }

        const employee = await employeesService.createEmployee( // ! создание сотрудника
            fullName.trim(),
            position.trim(), // ! должность сотрудника
            status, // ! статус сотрудника
            personalCode.trim() // ! личный код сотрудника
        );
        return res.status(201).json(employee); // ! отправка сотрудника
    } catch (err) {
        if (String(err.message || "").includes("UNIQUE constraint failed")) { // ! отправка ошибки если сотрудник с таким личным кодом уже существует
            return res.status(409).json({ error: "Employee with this personalCode already exists" }); // ! отправка ошибки если сотрудник с таким личным кодом уже существует
        }
        return res.status(500).json({ error: err.message || "Failed to create employee" }); // ! отправка ошибки если не удалось создать сотрудника
    }
}

async function updateEmployee(req, res) { // ! функция обновления сотрудника
    try {
        const { id } = req.params; // ! получение ID из параметров запроса
        const { fullName, position, status, personalCode } = req.body || {}; // ! получение данных из тела запроса
        if (!fullName || typeof fullName !== "string" || !fullName.trim()) {
            return res.status(400).json({ error: "fullName is required" }); // ! отправка ошибки если имя не указано
        }
        if (!position || typeof position !== "string" || !position.trim()) {
            return res.status(400).json({ error: "position is required" }); // ! отправка ошибки если должность не указана
        }
        if (!status || typeof status !== "string" || !ALLOWED_STATUSES.has(status)) { // ! отправка ошибки если статус не указан
            return res
                .status(400)
                .json({ error: "status must be one of: active, vacation, dismissed" }); // ! отправка ошибки если статус не указан
        }
        if (!personalCode || typeof personalCode !== "string" || !personalCode.trim()) {
            return res.status(400).json({ error: "personalCode is required" }); // ! отправка ошибки если личный код не указан
        }

        const employee = await employeesService.updateEmployee( // ! обновление сотрудника
            id,
            fullName.trim(),
            position.trim(),
            status,
            personalCode.trim()
        );
        return res.json(employee); // ! отправка сотрудника
    } catch (err) {
        if (err.message === "Employee not found") { // ! отправка ошибки если сотрудник не найден
            return res.status(404).json({ error: err.message });
        }
        if (String(err.message || "").includes("UNIQUE constraint failed")) { // ! отправка ошибки если сотрудник с таким личным кодом уже существует
            return res.status(409).json({ error: "Employee with this personalCode already exists" });
        }
        return res.status(500).json({ error: err.message || "Failed to update employee" });
    }
}

async function deleteEmployee(req, res) { // ! функция удаления сотрудника
    try {
        const { id } = req.params; // ! получение ID из параметров запроса
        const employee = await employeesService.deleteEmployee(id); // ! удаление сотрудника
        return res.json(employee);
    } catch (err) {
        if (err.message === "Employee not found") { // ! отправка ошибки если сотрудник не найден
            return res.status(404).json({ error: err.message });
        }
        return res.status(500).json({ error: err.message || "Failed to delete employee" });
    }
}

module.exports = {
    getEmployees,
    createEmployee,
    updateEmployee,
    deleteEmployee,
};