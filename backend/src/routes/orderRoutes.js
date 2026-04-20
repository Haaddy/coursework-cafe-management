const express = require("express");
const router = express.Router();

const ordersController = require("../controllers/ordersController");

router.get("/", ordersController.getOrders);
router.get("/:id", ordersController.getOrderById);

router.post("/", ordersController.createOrder);
router.patch("/:id", ordersController.updateOrderStatus);

module.exports = router;