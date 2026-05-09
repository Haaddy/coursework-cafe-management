const { all, get, run, initializeDatabase } = require("../data/database");

function mapEmployeeRow(row) {
    return {
        id: row.id,
        fullName: row.full_name,
        position: row.position,
        status: row.status,
        personalCode: row.personal_code,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
    };
}

async function getEmployeeRowById(id) {
    return get(
        "SELECT id, full_name, position, status, personal_code, created_at, updated_at FROM employees WHERE id = ?",
        [id]
    );
}

async function getEmployees() {
    await initializeDatabase();
    const rows = await all(
        "SELECT id, full_name, position, status, personal_code, created_at, updated_at FROM employees ORDER BY id ASC"
    );
    return rows.map(mapEmployeeRow);
}

async function createEmployee(fullName, position, status, personalCode) {
    await initializeDatabase();
    const createdAt = new Date().toISOString();
    const updatedAt = createdAt;
    const insertResult = await run(
        "INSERT INTO employees (full_name, position, status, personal_code, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)",
        [fullName, position, status, personalCode, createdAt, updatedAt]
    );

    const row = await getEmployeeRowById(insertResult.lastID);
    return mapEmployeeRow(row);
}


async function updateEmployee(id, fullName, position, status, personalCode) {
    await initializeDatabase();
    const existing = await getEmployeeRowById(id);
    if (!existing) {
        throw new Error("Employee not found");
    }

    const updatedAt = new Date().toISOString();
    await run(
        "UPDATE employees SET full_name = ?, position = ?, status = ?, personal_code = ?, updated_at = ? WHERE id = ?",
        [fullName, position, status, personalCode, updatedAt, id]
    );

    const updated = await getEmployeeRowById(id);
    return mapEmployeeRow(updated);
}

async function deleteEmployee(id) {
    await initializeDatabase();
    const existing = await getEmployeeRowById(id);
    if (!existing) {
        throw new Error("Employee not found");
    }

    await run("DELETE FROM employees WHERE id = ?", [id]);
    return mapEmployeeRow(existing);
}

module.exports = {
    getEmployees,
    createEmployee,
    updateEmployee,
    deleteEmployee,
};