const employeesService = require("../services/employeesService");
const ALLOWED_STATUSES = new Set(["active", "vacation", "dismissed"]);

async function getEmployees(req, res) {
    try {
        const employees = await employeesService.getEmployees();
        return res.json(employees);
    } catch (err) {
        return res.status(500).json({ error: err.message || "Failed to fetch employees" });
    }
}

async function createEmployee(req, res) {
    try {
        const { fullName, position, status, personalCode } = req.body || {};
        if (!fullName || typeof fullName !== "string" || !fullName.trim()) {
            return res.status(400).json({ error: "fullName is required" });
        }
        if (!position || typeof position !== "string" || !position.trim()) {
            return res.status(400).json({ error: "position is required" });
        }
        if (!status || typeof status !== "string" || !ALLOWED_STATUSES.has(status)) {
            return res
                .status(400)
                .json({ error: "status must be one of: active, vacation, dismissed" });
        }
        if (!personalCode || typeof personalCode !== "string" || !personalCode.trim()) {
            return res.status(400).json({ error: "personalCode is required" });
        }

        const employee = await employeesService.createEmployee(
            fullName.trim(),
            position.trim(),
            status,
            personalCode.trim()
        );
        return res.status(201).json(employee);
    } catch (err) {
        if (String(err.message || "").includes("UNIQUE constraint failed")) {
            return res.status(409).json({ error: "Employee with this personalCode already exists" });
        }
        return res.status(500).json({ error: err.message || "Failed to create employee" });
    }
}

async function updateEmployee(req, res) {
    try {
        const { id } = req.params;
        const { fullName, position, status, personalCode } = req.body || {};
        if (!fullName || typeof fullName !== "string" || !fullName.trim()) {
            return res.status(400).json({ error: "fullName is required" });
        }
        if (!position || typeof position !== "string" || !position.trim()) {
            return res.status(400).json({ error: "position is required" });
        }
        if (!status || typeof status !== "string" || !ALLOWED_STATUSES.has(status)) {
            return res
                .status(400)
                .json({ error: "status must be one of: active, vacation, dismissed" });
        }
        if (!personalCode || typeof personalCode !== "string" || !personalCode.trim()) {
            return res.status(400).json({ error: "personalCode is required" });
        }

        const employee = await employeesService.updateEmployee(
            id,
            fullName.trim(),
            position.trim(),
            status,
            personalCode.trim()
        );
        return res.json(employee);
    } catch (err) {
        if (err.message === "Employee not found") {
            return res.status(404).json({ error: err.message });
        }
        if (String(err.message || "").includes("UNIQUE constraint failed")) {
            return res.status(409).json({ error: "Employee with this personalCode already exists" });
        }
        return res.status(500).json({ error: err.message || "Failed to update employee" });
    }
}

async function deleteEmployee(req, res) {
    try {
        const { id } = req.params;
        const employee = await employeesService.deleteEmployee(id);
        return res.json(employee);
    } catch (err) {
        if (err.message === "Employee not found") {
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