const jwt = require("jsonwebtoken");

function unlock(req, res) {
  const { pin } = req.body || {};

  if (!pin || typeof pin !== "string") {
    return res.status(400).json({ error: "pin is required" });
  }

  const cleanPin = pin.trim();
  if (!/^\d{4,6}$/.test(cleanPin)) {
    return res.status(400).json({ error: "pin must be 4-6 digits" });
  }

  const adminPin = process.env.ADMIN_PIN;
  const jwtSecret = process.env.JWT_SECRET;

  if (!adminPin || !jwtSecret) {
    return res.status(500).json({ error: "auth env is not configured" });
  }

  if (cleanPin !== adminPin) {
    return res.status(401).json({ error: "invalid pin" });
  }

  const token = jwt.sign(
    { role: "admin" },
    jwtSecret,
    { expiresIn: process.env.JWT_EXPIRES_IN || "12h" }
  );

  return res.json({ token });
}

module.exports = { unlock };
