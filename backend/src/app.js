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

const adminAuthRoutes = require("./routes/adminAuthRoutes");
app.use("/admin/auth", adminAuthRoutes);

module.exports = app;