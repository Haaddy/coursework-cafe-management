const { getManagerByToken } = require("../services/adminAuthService");

function extractBearerToken(authHeader) {
  const rawHeader = String(authHeader || "");
  const [scheme, token] = rawHeader.split(" ");
  if (scheme?.toLowerCase() !== "bearer" || !token) return null;
  return token.trim();
}

async function requireManager(req, res, next) {
  try {
    const token = extractBearerToken(req.headers.authorization);
    if (!token) {
      return res.status(401).json({ error: "Unauthorized", code: "ADMIN_UNAUTHORIZED" });
    }

    const manager = await getManagerByToken(token);
    if (!manager) {
      return res.status(401).json({ error: "Unauthorized", code: "ADMIN_UNAUTHORIZED" });
    }

    req.manager = manager;
    req.managerToken = token;
    return next();
  } catch (err) {
    return res.status(500).json({
      error: err.message || "Authorization check failed",
      code: "ADMIN_AUTH_CHECK_FAILED",
    });
  }
}

module.exports = {
  requireManager,
  extractBearerToken,
};
