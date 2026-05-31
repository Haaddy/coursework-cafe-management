const {
  AdminAuthError,
  clearSession,
  loginManager,
} = require("../services/adminAuthService"); // ! импорт сервиса авторизации менеджера

function sendAuthError(res, err, fallbackMessage) { // ! функция отправки ошибки авторизации менеджера
  const statusCode = Number(err?.statusCode) || 500; // ! получение статуса ошибки
  return res.status(statusCode).json({ // ! отправка ошибки авторизации менеджера
    error: err?.message || fallbackMessage, // ! получение сообщения ошибки
    code: err?.code || "ADMIN_AUTH_ERROR", // ! получение кода ошибки
  });
}

async function login(req, res) { // ! функция авторизации менеджера
  try {
    const { personalCode, password } = req.body || {}; // ! получение данных из тела запроса
    const { token, manager } = await loginManager(personalCode, password); // ! авторизация менеджера
    return res.json({ token, manager });
  } catch (err) {
    if (err instanceof AdminAuthError) {
      return sendAuthError(res, err, "Login failed"); // ! отправка ошибки авторизации менеджера
    }
    return sendAuthError(res, err, "Login failed"); // ! отправка ошибки авторизации менеджера
  }
}

async function me(req, res) { // ! функция получения информации о менеджере
  return res.json({ manager: req.manager }); // ! отправка информации о менеджере
}

async function logout(req, res) { // ! функция выхода из аккаунта менеджера
  clearSession(req.managerToken); // ! очистка сессии менеджера
  return res.status(204).send(); // ! отправка статуса 204
}

module.exports = {
  login,
  me,
  logout,
};
