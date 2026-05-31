const { getManagerByToken } = require("../services/adminAuthService");

function extractBearerToken(authHeader) { // ! функция извлечения токена из заголовка авторизации
  const rawHeader = String(authHeader || ""); // ! получение заголовка авторизации
  const [scheme, token] = rawHeader.split(" "); // ! извлечение токена из заголовка авторизации
  if (scheme?.toLowerCase() !== "bearer" || !token) return null; // ! возвращение null если токен не найден
  return token.trim(); // ! возвращение токена
}

async function requireManager(req, res, next) { // ! функция проверки доступа к админке
  try {
    const token = extractBearerToken(req.headers.authorization); // ! извлечение токена из заголовка авторизации
    if (!token) { // ! возвращение null если токен не найден
      return res.status(401).json({ error: "Unauthorized", code: "ADMIN_UNAUTHORIZED" }); // ! возвращение ошибки авторизации
    }

    const manager = await getManagerByToken(token); // ! получение менеджера по токену
    if (!manager) { // ! возвращение null если менеджер не найден
      return res.status(401).json({ error: "Unauthorized", code: "ADMIN_UNAUTHORIZED" }); // ! возвращение ошибки авторизации
    }

    req.manager = manager; // ! добавление менеджера в request
    req.managerToken = token; // ! добавление токена в request
    return next(); // ! переход к следующему middleware
  } catch (err) {
    return res.status(500).json({ // ! возвращение ошибки авторизации
      error: err.message || "Authorization check failed", // ! получение сообщения ошибки
      code: "ADMIN_AUTH_CHECK_FAILED", // ! получение кода ошибки
    }); 
  }
}

module.exports = {
  requireManager,
  extractBearerToken,
};
