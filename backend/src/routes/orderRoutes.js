const express = require("express");
const router = express.Router();

const ordersController = require("../controllers/ordersController");

router.get("/", ordersController.getOrders); // ! маршрут получения списка заказов
router.get("/:id", ordersController.getOrderById); // ! маршрут получения заказа по ID

router.post("/", ordersController.createOrder);
router.post("/:id/pay", ordersController.payOrder); // ! маршрут оплаты заказа
router.post("/:id/close", ordersController.closeOrder); // ! маршрут закрытия заказа
router.patch("/:id", ordersController.updateOrderStatus); // ! маршрут обновления статуса заказа

module.exports = router;