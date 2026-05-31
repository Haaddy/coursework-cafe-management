const crypto = require("crypto");
const { get, initializeDatabase } = require("../data/database");

const SESSION_TTL_MS = 1000 * 60 * 60 * 12; // ! время жизни сессии
const OWNER_SESSION_ID = 0; // ! ID сессии владельца
const sessions = new Map(); // ! масса сессий

function getOwnerEnv() { // ! функция получения данных владельца
  return {
    login: String(process.env.ADMIN_OWNER_LOGIN || "").trim(),
    password: String(process.env.ADMIN_OWNER_PASSWORD || ""),
    name: String(process.env.ADMIN_OWNER_NAME || "Владелец").trim() || "Владелец",
  };
}

function isOwnerConfigured() { // ! функция проверки настроек владельца
  const { login, password } = getOwnerEnv(); // ! получение данных владельца
  return Boolean(login && password); // ! возвращение true если настройки владельца установлены
}

function isOwnerCredentials(personalCode, password) { // ! функция проверки credentials владельца
  if (!isOwnerConfigured()) return false;
  const { login, password: ownerPassword } = getOwnerEnv(); // ! получение данных владельца
  return personalCode === login && password === ownerPassword; // ! возвращение true если credentials владельца установлены
}

class AdminAuthError extends Error { // ! класс ошибки авторизации
  constructor(message, statusCode, code) { // ! конструктор класса ошибки авторизации
    super(message);
    this.name = "AdminAuthError"; // ! имя ошибки
    this.statusCode = statusCode; // ! статус код ошибки
    this.code = code || "ADMIN_AUTH_ERROR"; // ! код ошибки
  }
}

function isManagerPosition(position) { // ! функция проверки позиции менеджера
  const value = String(position || "").trim().toLowerCase(); // ! получение позиции менеджера
  return value === "manager" || value === "менеджер"; // ! возвращение true если позиция менеджера установлена
}

function isOwnerPosition(position) { // ! функция проверки позиции владельца
  const value = String(position || "").trim().toLowerCase(); // ! получение позиции владельца
  return value === "owner" || value === "владелец"; // ! возвращение true если позиция владельца установлена
}

function canAccessAdmin(position) { // ! функция проверки доступа к админке
  return isManagerPosition(position) || isOwnerPosition(position); // ! возвращение true если доступ к админке установлен
}

function mapOwner() { // ! функция преобразования данных владельца
  const { login, name } = getOwnerEnv(); // ! получение данных владельца
  return { // ! возвращение данных владельца
    id: OWNER_SESSION_ID,
    fullName: name,
    position: "owner",
    status: "active",
    personalCode: login,
  };
}

function mapManager(row) { // ! функция преобразования данных менеджера
  return {
    id: row.id,
    fullName: row.full_name,
    position: row.position,
    status: row.status,
    personalCode: row.personal_code,
  };
}

function createSession({ employeeId, isOwner = false }) { // ! функция создания сессии  
  const token = crypto.randomBytes(32).toString("hex"); // ! получение токена
  sessions.set(token, { // ! добавление сессии в массу сессий
    employeeId: isOwner ? OWNER_SESSION_ID : employeeId,
    isOwner: Boolean(isOwner), // ! возвращение true если сессия владельца
    expiresAt: Date.now() + SESSION_TTL_MS, // ! получение времени истечения сессии
  });
  return token; // ! возвращение токена
}

function clearSession(token) { // ! функция удаления сессии
  sessions.delete(String(token || ""));
}

function getSession(token) { // ! функция получения сессии
  const normalizedToken = String(token || ""); // ! получение токена
  const session = sessions.get(normalizedToken); // ! получение сессии из массы сессий
  if (!session) return null;
  if (session.expiresAt < Date.now()) { // ! если время истечения сессии меньше текущего времени
    sessions.delete(normalizedToken);
    return null; // ! возвращение null если сессия не найдена
  }
  return session; // ! возвращение сессии
}

async function getManagerByPersonalCode(personalCode) { // ! функция получения менеджера по personal_code
  const row = await get(
    `SELECT id, full_name, position, status, personal_code
     FROM employees
     WHERE personal_code = ?`,
    [personalCode]
  );
  if (!row) { // ! если менеджер не найден
    throw new AdminAuthError("Invalid personal code or password", 401, "ADMIN_INVALID_CREDENTIALS");
  }
  if (row.status !== "active") {
    throw new AdminAuthError("Manager is not active", 403, "ADMIN_INACTIVE"); // ! если менеджер не активен
  }
  if (!isManagerPosition(row.position)) {
    throw new AdminAuthError("Only managers can access admin panel", 403, "ADMIN_ROLE_DENIED"); // ! если менеджер не имеет доступа к админке
  }
  return row; // ! возвращение менеджера
}

async function loginManager(personalCode, password) { // ! функция входа в админку
  await initializeDatabase();
  const normalizedCode = String(personalCode || "").trim(); // ! получение токена
  const normalizedPassword = String(password || ""); // ! получение пароля
  if (!normalizedCode || !normalizedPassword) {
    throw new AdminAuthError("personalCode and password are required", 400, "ADMIN_CREDENTIALS_REQUIRED"); // ! если токен или пароль не установлены
  }

  if (isOwnerCredentials(normalizedCode, normalizedPassword)) { // ! если credentials владельца установлены
    const token = createSession({ isOwner: true }); // ! создание сессии владельца
    return {
      token,
      manager: mapOwner(), // ! возвращение данных владельца
    };
  }

  const adminPassword = String(process.env.ADMIN_PASSWORD || ""); // ! получение пароля администратора
  if (!adminPassword) {
    throw new AdminAuthError("ADMIN_PASSWORD is not configured", 500, "ADMIN_PASSWORD_NOT_CONFIGURED"); // ! если пароль администратора не установлен
  }
  if (normalizedPassword !== adminPassword) {
    throw new AdminAuthError("Invalid personal code or password", 401, "ADMIN_INVALID_CREDENTIALS"); // ! если пароль администратора не совпадает
  }

  const managerRow = await getManagerByPersonalCode(normalizedCode); // ! получение менеджера по personal_code
  const token = createSession({ employeeId: managerRow.id }); // ! создание сессии менеджера
  return { // ! возвращение данных менеджера
    token,
    manager: mapManager(managerRow), 
  };
}

async function getManagerByToken(token) { // ! функция получения менеджера по токену
  await initializeDatabase();
  const session = getSession(token); // ! получение сессии из массы сессий
  if (!session) return null; // ! возвращение null если сессия не найдена

  if (session.isOwner) {
    return isOwnerConfigured() ? mapOwner() : null; // ! возвращение данных владельца
  }

  const row = await get( // ! получение менеджера по ID
    `SELECT id, full_name, position, status, personal_code
     FROM employees
     WHERE id = ?`,
    [session.employeeId]
  );
  if (!row || row.status !== "active" || !canAccessAdmin(row.position)) { // ! если менеджер не найден или не активен или не имеет доступа к админке
    clearSession(token);
    return null; // ! возвращение null если менеджер не найден или не активен или не имеет доступа к админке
  }
  return mapManager(row); // ! возвращение данных менеджера
}

module.exports = {
  AdminAuthError,
  SESSION_TTL_MS,
  loginManager,
  getManagerByToken,
  clearSession,
};
