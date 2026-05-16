// app.js
const express = require("express");
const cors = require("cors");

const app = express();
const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN || "http://localhost:5173";

app.use(
  cors({
    origin: FRONTEND_ORIGIN,
  })
);
app.use(express.json()); 

//  ? дял проверии сервера
app.get("/health", (req, res) => {
  res.json({ ok: true });
});


const orderRoutes = require("./routes/orderRoutes");
app.use("/orders", orderRoutes);

const menuRoutes = require("./routes/menuRoutes");
app.use("/menu", menuRoutes);

const inventoryRoutes = require("./routes/inventoryRoutes");
app.use("/inventory", inventoryRoutes);

const employeesRoutes = require("./routes/employeesRoutes");
app.use("/employees", employeesRoutes);

const analyticsRoutes = require("./routes/analyticsRoutes");
app.use("/analytics", analyticsRoutes);

const adminAuthRoutes = require("./routes/adminAuthRoutes");
app.use("/admin/auth", adminAuthRoutes);

module.exports = app;