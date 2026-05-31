const { all, get, run, initializeDatabase } = require("../data/database");

function mapEmployeeRow(row) { // ! функция преобразования строки сотрудника в объект
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

async function getEmployeeRowById(id) { // ! функция получения строки сотрудника по ID
    return get(
        "SELECT id, full_name, position, status, personal_code, created_at, updated_at FROM employees WHERE id = ?",
        [id]
    );
}

async function getEmployees() { // ! функция получения списка сотрудников
    await initializeDatabase();
    const rows = await all( // ! получение строк сотрудников
        "SELECT id, full_name, position, status, personal_code, created_at, updated_at FROM employees ORDER BY id ASC"
    );
    return rows.map(mapEmployeeRow); // ! возвращение списка сотрудников
}

async function createEmployee(fullName, position, status, personalCode) { // ! функция создания сотрудника
    await initializeDatabase();
    const createdAt = new Date().toISOString(); // ! получение даты создания
    const updatedAt = createdAt; // ! получение даты обновления
    const insertResult = await run( // ! добавление сотрудника в базу данных
        "INSERT INTO employees (full_name, position, status, personal_code, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)",
        [fullName, position, status, personalCode, createdAt, updatedAt]
    );

    const row = await getEmployeeRowById(insertResult.lastID); // ! получение строки сотрудника по ID
    return mapEmployeeRow(row); // ! возвращение сотрудника
}


async function updateEmployee(id, fullName, position, status, personalCode) { // ! функция обновления сотрудника
    await initializeDatabase();
    const existing = await getEmployeeRowById(id); // ! получение строки сотрудника по ID
    if (!existing) {
        throw new Error("Employee not found"); // ! отправка ошибки если сотрудник не найден
    }

    const updatedAt = new Date().toISOString(); // ! получение даты обновления
    await run( // ! обновление сотрудника в базе данных
        "UPDATE employees SET full_name = ?, position = ?, status = ?, personal_code = ?, updated_at = ? WHERE id = ?",
        [fullName, position, status, personalCode, updatedAt, id]
    );

    const updated = await getEmployeeRowById(id); // ! получение строки сотрудника по ID
    return mapEmployeeRow(updated); // ! возвращение сотрудника
}

async function deleteEmployee(id) { // ! функция удаления сотрудника
    await initializeDatabase();
    const existing = await getEmployeeRowById(id); // ! получение строки сотрудника по ID
    if (!existing) {
        throw new Error("Employee not found"); // ! отправка ошибки если сотрудник не найден
    }

    await run("DELETE FROM employees WHERE id = ?", [id]); // ! удаление сотрудника из базы данных
    return mapEmployeeRow(existing); // ! возвращение сотрудника
}

module.exports = {
    getEmployees,
    createEmployee,
    updateEmployee,
    deleteEmployee,
};