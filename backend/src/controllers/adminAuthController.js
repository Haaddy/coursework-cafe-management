const {
  AdminAuthError,
  clearSession,
  loginManager,
} = require("../services/adminAuthService");

function sendAuthError(res, err, fallbackMessage) {
  const statusCode = Number(err?.statusCode) || 500;
  return res.status(statusCode).json({
    error: err?.message || fallbackMessage,
    code: err?.code || "ADMIN_AUTH_ERROR",
  });
}

async function login(req, res) {
  try {
    const { personalCode, password } = req.body || {};
    const { token, manager } = await loginManager(personalCode, password);
    return res.json({ token, manager });
  } catch (err) {
    if (err instanceof AdminAuthError) {
      return sendAuthError(res, err, "Login failed");
    }
    return sendAuthError(res, err, "Login failed");
  }
}

async function me(req, res) {
  return res.json({ manager: req.manager });
}

async function logout(req, res) {
  clearSession(req.managerToken);
  return res.status(204).send();
}

module.exports = {
  login,
  me,
  logout,
};
