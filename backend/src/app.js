// app.js
const express = require("express");
const cors = require("cors");

const app = express();

app.use(cors());
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

module.exports = app;