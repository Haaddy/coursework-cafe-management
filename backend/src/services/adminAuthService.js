const crypto = require("crypto");
const { get, initializeDatabase } = require("../data/database");

const SESSION_TTL_MS = 1000 * 60 * 60 * 12; // 12h
<<<<<<< HEAD
const OWNER_SESSION_ID = 0;
const sessions = new Map();

function getOwnerEnv() {
  return {
    login: String(process.env.ADMIN_OWNER_LOGIN || "").trim(),
    password: String(process.env.ADMIN_OWNER_PASSWORD || ""),
    name: String(process.env.ADMIN_OWNER_NAME || "Владелец").trim() || "Владелец",
  };
}

function isOwnerConfigured() {
  const { login, password } = getOwnerEnv();
  return Boolean(login && password);
}

function isOwnerCredentials(personalCode, password) {
  if (!isOwnerConfigured()) return false;
  const { login, password: ownerPassword } = getOwnerEnv();
  return personalCode === login && password === ownerPassword;
}

=======
const sessions = new Map();

>>>>>>> e068652616301dcbf4734e70f1897badd5e1af19
class AdminAuthError extends Error {
  constructor(message, statusCode, code) {
    super(message);
    this.name = "AdminAuthError";
    this.statusCode = statusCode;
    this.code = code || "ADMIN_AUTH_ERROR";
  }
}

function isManagerPosition(position) {
  const value = String(position || "").trim().toLowerCase();
  return value === "manager" || value === "менеджер";
}

<<<<<<< HEAD
function isOwnerPosition(position) {
  const value = String(position || "").trim().toLowerCase();
  return value === "owner" || value === "владелец";
}

function canAccessAdmin(position) {
  return isManagerPosition(position) || isOwnerPosition(position);
}

function mapOwner() {
  const { login, name } = getOwnerEnv();
  return {
    id: OWNER_SESSION_ID,
    fullName: name,
    position: "owner",
    status: "active",
    personalCode: login,
  };
}

=======
>>>>>>> e068652616301dcbf4734e70f1897badd5e1af19
function mapManager(row) {
  return {
    id: row.id,
    fullName: row.full_name,
    position: row.position,
    status: row.status,
    personalCode: row.personal_code,
  };
}

<<<<<<< HEAD
function createSession({ employeeId, isOwner = false }) {
  const token = crypto.randomBytes(32).toString("hex");
  sessions.set(token, {
    employeeId: isOwner ? OWNER_SESSION_ID : employeeId,
    isOwner: Boolean(isOwner),
=======
function createSession(employeeId) {
  const token = crypto.randomBytes(32).toString("hex");
  sessions.set(token, {
    employeeId,
>>>>>>> e068652616301dcbf4734e70f1897badd5e1af19
    expiresAt: Date.now() + SESSION_TTL_MS,
  });
  return token;
}

function clearSession(token) {
  sessions.delete(String(token || ""));
}

function getSession(token) {
  const normalizedToken = String(token || "");
  const session = sessions.get(normalizedToken);
  if (!session) return null;
  if (session.expiresAt < Date.now()) {
    sessions.delete(normalizedToken);
    return null;
  }
  return session;
}

async function getManagerByPersonalCode(personalCode) {
  const row = await get(
    `SELECT id, full_name, position, status, personal_code
     FROM employees
     WHERE personal_code = ?`,
    [personalCode]
  );
  if (!row) {
    throw new AdminAuthError("Invalid personal code or password", 401, "ADMIN_INVALID_CREDENTIALS");
  }
  if (row.status !== "active") {
    throw new AdminAuthError("Manager is not active", 403, "ADMIN_INACTIVE");
  }
  if (!isManagerPosition(row.position)) {
    throw new AdminAuthError("Only managers can access admin panel", 403, "ADMIN_ROLE_DENIED");
  }
  return row;
}

async function loginManager(personalCode, password) {
  await initializeDatabase();
  const normalizedCode = String(personalCode || "").trim();
  const normalizedPassword = String(password || "");
  if (!normalizedCode || !normalizedPassword) {
    throw new AdminAuthError("personalCode and password are required", 400, "ADMIN_CREDENTIALS_REQUIRED");
  }

<<<<<<< HEAD
  if (isOwnerCredentials(normalizedCode, normalizedPassword)) {
    const token = createSession({ isOwner: true });
    return {
      token,
      manager: mapOwner(),
    };
  }

=======
>>>>>>> e068652616301dcbf4734e70f1897badd5e1af19
  const adminPassword = String(process.env.ADMIN_PASSWORD || "");
  if (!adminPassword) {
    throw new AdminAuthError("ADMIN_PASSWORD is not configured", 500, "ADMIN_PASSWORD_NOT_CONFIGURED");
  }
  if (normalizedPassword !== adminPassword) {
    throw new AdminAuthError("Invalid personal code or password", 401, "ADMIN_INVALID_CREDENTIALS");
  }

  const managerRow = await getManagerByPersonalCode(normalizedCode);
<<<<<<< HEAD
  const token = createSession({ employeeId: managerRow.id });
=======
  const token = createSession(managerRow.id);
>>>>>>> e068652616301dcbf4734e70f1897badd5e1af19
  return {
    token,
    manager: mapManager(managerRow),
  };
}

async function getManagerByToken(token) {
  await initializeDatabase();
  const session = getSession(token);
  if (!session) return null;

<<<<<<< HEAD
  if (session.isOwner) {
    return isOwnerConfigured() ? mapOwner() : null;
  }

=======
>>>>>>> e068652616301dcbf4734e70f1897badd5e1af19
  const row = await get(
    `SELECT id, full_name, position, status, personal_code
     FROM employees
     WHERE id = ?`,
    [session.employeeId]
  );
<<<<<<< HEAD
  if (!row || row.status !== "active" || !canAccessAdmin(row.position)) {
=======
  if (!row || row.status !== "active" || !isManagerPosition(row.position)) {
>>>>>>> e068652616301dcbf4734e70f1897badd5e1af19
    clearSession(token);
    return null;
  }
  return mapManager(row);
}

module.exports = {
  AdminAuthError,
  SESSION_TTL_MS,
  loginManager,
  getManagerByToken,
  clearSession,
};
