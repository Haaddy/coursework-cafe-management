import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import OrderDetailsModal from "./OrderDetailsModal";
import { API_BASE_URL } from "../constants/api";

function getStatusLabel(status) {
  const labels = {
    pending: "Создан",
    ready: "Готов",
    paid: "Оплачен",
    closed: "Закрыт",
  };
  return labels[status] || status;
}

function getPaymentMethodLabel(method) {
  const labels = {
    cash: "Наличные",
    card: "Карта",
    other: "Другое",
  };
  return labels[method] || method;
}

function formatDateToIsoDay(date) {
  return date.toISOString().slice(0, 10);
}

function getStatusFilterFromOrder(status) {
  return status === "pending" || status === "ready" || status === "paid" ? "active" : status;
}

function OrdersPage() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [detailsOrderId, setDetailsOrderId] = useState(null);
  const [statusFilter, setStatusFilter] = useState("active");
  const [dateFilter, setDateFilter] = useState("today");
  const [customDate, setCustomDate] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  const loadOrders = useCallback(() => {
    const query = new URLSearchParams();
    if (dateFilter === "today") {
      query.set("date", "today");
    } else if (dateFilter === "yesterday") {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      query.set("date", formatDateToIsoDay(yesterday));
    } else if (dateFilter === "custom" && customDate) {
      query.set("date", customDate);
    } else if (dateFilter === "all") {
      query.set("includeAll", "true");
    }

    if (searchQuery.trim()) {
      query.set("q", searchQuery.trim());
    }

    setLoading(true);
    setError("");
    fetch(`${API_BASE_URL}/orders?${query.toString()}`)
      .then((res) => {
        if (!res.ok) throw new Error("Не удалось загрузить заказы");
        return res.json();
      })
      .then(setOrders)
      .catch((err) => setError(err.message || "Ошибка загрузки заказов"))
      .finally(() => setLoading(false));
  }, [dateFilter, customDate, searchQuery]);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  const markReady = (orderId) => {
    fetch(`${API_BASE_URL}/orders/${encodeURIComponent(orderId)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "ready" }),
    })
      .then((res) => {
        if (!res.ok) {
          return res.json().then((data) => {
            throw new Error(data?.error || "Не удалось обновить");
          });
        }
        return res.json();
      })
      .then(() => loadOrders())
      .catch((err) => alert(err.message || "Ошибка"));
  };

  const counts = useMemo(() => {
    const draft = { all: orders.length, active: 0, pending: 0, ready: 0, paid: 0, closed: 0 };
    for (const order of orders) {
      const status = order.status || "";
      if (draft[status] != null) {
        draft[status] += 1;
      }
      if (getStatusFilterFromOrder(status) === "active") {
        draft.active += 1;
      }
    }
    return draft;
  }, [orders]);

  const displayedOrders = useMemo(() => {
    if (statusFilter === "all") return orders;
    if (statusFilter === "active") {
      return orders.filter((order) => getStatusFilterFromOrder(order.status) === "active");
    }
    return orders.filter((order) => order.status === statusFilter);
  }, [orders, statusFilter]);

  const openOrderDetails = (orderId) => {
    setDetailsOrderId(orderId);
    setDetailsOpen(true);
  };

  const closeOrderDetails = () => {
    setDetailsOpen(false);
    setDetailsOrderId(null);
  };

  const applySearch = () => {
    setSearchQuery(searchInput.trim());
  };

  const filterButtons = [
    { id: "active", label: `Активные (${counts.active})` },
    { id: "pending", label: `Созданные (${counts.pending})` },
    { id: "ready", label: `Готовые (${counts.ready})` },
    { id: "paid", label: `Оплаченные (${counts.paid})` },
    { id: "closed", label: `Закрытые (${counts.closed})` },
    { id: "all", label: `Все (${counts.all})` },
  ];

  return (
    <section className="orders">
      <Link to="/" className="button button--secondary orders__back">
        ← На главную
      </Link>
      <h2 className="orders__title">Список заказов</h2>

      <div className="orders__controls card">
        <div className="orders__filter-row">
          {filterButtons.map((filter) => (
            <button
              key={filter.id}
              type="button"
              className={`button ${statusFilter === filter.id ? "button--accent" : "button--secondary"}`}
              onClick={() => setStatusFilter(filter.id)}
            >
              {filter.label}
            </button>
          ))}
        </div>

        <div className="orders__filter-row">
          <select
            className="modal__input orders__select"
            value={dateFilter}
            onChange={(event) => setDateFilter(event.target.value)}
          >
            <option value="today">Сегодня</option>
            <option value="yesterday">Вчера</option>
            <option value="custom">Выбрать дату</option>
            <option value="all">За все время</option>
          </select>

          {dateFilter === "custom" && (
            <input
              type="date"
              className="modal__input orders__date"
              value={customDate}
              onChange={(event) => setCustomDate(event.target.value)}
            />
          )}

          <input
            className="modal__input orders__search"
            placeholder="Поиск по номеру заказа"
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") applySearch();
            }}
          />
          <button type="button" className="button button--secondary" onClick={applySearch}>
            Найти
          </button>
          <button type="button" className="button button--secondary" onClick={loadOrders}>
            Обновить
          </button>
        </div>
      </div>

      {loading && <p className="order-details__hint">Загрузка заказов…</p>}
      {!loading && error && (
        <p className="order-details__error" role="alert">
          {error}
        </p>
      )}

      <div className="orders__list">
        {!loading && !error && displayedOrders.length === 0 && (
          <article className="card order-card">
            <div className="order-card__info">
              <span className="order-card__customer">Заказы не найдены</span>
              <span className="order-card__id">Попробуй изменить фильтры или дату</span>
            </div>
          </article>
        )}
        {displayedOrders.map((order) => (
          <article key={order.id} className="card order-card">
            <div className="order-card__info">
              <span className="order-card__customer">Заказ №{order.orderNumber || "—"}</span>
              <span className="order-card__id">Внутренний ID: #{order.id}</span>
              <span className="order-card__id">Создан: {order.createdAt || "—"}</span>
              <span className="order-card__id">
                Оплата: {order.paymentMethod ? getPaymentMethodLabel(order.paymentMethod) : "—"}; закрыт:{" "}
                {order.closedByEmployee?.fullName || "—"}
              </span>
            </div>

            <span className="order-card__status">{getStatusLabel(order.status)}</span>

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
