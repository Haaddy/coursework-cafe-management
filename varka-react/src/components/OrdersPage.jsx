import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import OrderDetailsModal from "./OrderDetailsModal";

function OrdersPage() {
  const [orders, setOrders] = useState([]);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [detailsOrderId, setDetailsOrderId] = useState(null);

  const loadOrders = () => {
    fetch("http://localhost:3001/orders")
      .then((res) => res.json())
      .then(setOrders);
  };

  useEffect(() => {
    loadOrders();
  }, []);

  const markReady = (orderId) => {
    fetch(`http://localhost:3001/orders/${encodeURIComponent(orderId)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "готово" }),
    })
      .then((res) => {
        if (!res.ok) throw new Error("Не удалось обновить");
        return res.json();
      })
      .then(() => loadOrders())
      .catch((err) => alert(err.message || "Ошибка"));
  };

  const openOrderDetails = (orderId) => {
    setDetailsOrderId(orderId);
    setDetailsOpen(true);
  };

  const closeOrderDetails = () => {
    setDetailsOpen(false);
    setDetailsOrderId(null);
  };
  return (
    <section className="orders">
      <Link to="/" className="button button--secondary orders__back">
        ← На главную
      </Link>
      <h2 className="orders__title">Список заказов</h2>

      <div className="orders__list">
        {orders.map((order) => (
          <article key={order.id} className="card order-card">
            <div className="order-card__info">
              <span className="order-card__customer">{order.name}</span>
              <span className="order-card__id">ID: #{order.id}</span>
            </div>

            <span className="order-card__status">{order.status}</span>

            <div className="order-card__actions">
              <button
                type="button"
                className="button button--secondary"
                onClick={() => openOrderDetails(order.id)}
              >
                Подробнее о заказе
              </button>
              {order.status === "pending" ? (
                <button
                  type="button"
                  className="button button--accent"
                  onClick={() => markReady(order.id)}
                >
                  Отметить готовым
                </button>
              ) : null}
            </div>
          </article>
        ))}
      </div>

      <OrderDetailsModal
        isOpen={detailsOpen}
        onClose={closeOrderDetails}
        orderId={detailsOrderId}
        onStatusChanged={loadOrders}
      />
    </section>
  );
}

export default OrdersPage;
