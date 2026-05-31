import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import OrderDetailsModal from "./OrderDetailsModal";
import { API_BASE_URL } from "../constants/api";

function getStatusLabel(status) { // ! получение статуса заказа
  const labels = {
    pending: "Создан",
    ready: "Готов",
    paid: "Оплачен",
    closed: "Закрыт",
  };
  return labels[status] || status; // ! возвращение статуса заказа
}

function getPaymentMethodLabel(method) { // ! получение метода оплаты
  const labels = {
    cash: "Наличные",
    card: "Карта",
    other: "Другое",
  };
  return labels[method] || method; // ! возвращение метода оплаты
}

function formatDateToIsoDay(date) { // ! форматирование даты
  return date.toISOString().slice(0, 10);
}

function getStatusFilterFromOrder(status) { // ! получение статуса фильтра заказа
  return status === "pending" || status === "ready" || status === "paid" ? "active" : status;
}

function OrdersPage() { // ! страница списка заказов
  const [orders, setOrders] = useState([]); // ! заказы
  const [loading, setLoading] = useState(false); // ! загрузка
  const [error, setError] = useState(""); // ! ошибка загрузки
  const [detailsOpen, setDetailsOpen] = useState(false); // ! открытие деталей заказа
  const [detailsOrderId, setDetailsOrderId] = useState(null); // ! ID заказа
  const [statusFilter, setStatusFilter] = useState("active"); // ! фильтр по статусу
  const [dateFilter, setDateFilter] = useState("today"); // ! фильтр даты
  const [customDate, setCustomDate] = useState(""); // ! дата для фильтра «выбрать дату»
  const [searchInput, setSearchInput] = useState(""); // ! поиск
  const [searchQuery, setSearchQuery] = useState(""); // ! поиск заказа

  const loadOrders = useCallback(() => { // ! загрузка заказов
    const query = new URLSearchParams(); // ! query-параметры
    if (dateFilter === "today") { // ! если фильтр даты сегодня
      query.set("date", "today");
    } else if (dateFilter === "yesterday") { // ! если фильтр даты вчера
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      query.set("date", formatDateToIsoDay(yesterday));
    } else if (dateFilter === "custom" && customDate) { // ! если фильтр даты вручную
      query.set("date", customDate);
    } else if (dateFilter === "all") { // ! если фильтр даты все
      query.set("includeAll", "true");
    }

    if (searchQuery.trim()) { // ! если поиск не пустой
      query.set("q", searchQuery.trim()); // ! установка поиска
    }

    setLoading(true); // ! установка загрузки
    setError(""); // ! установка ошибки
    fetch(`${API_BASE_URL}/orders?${query.toString()}`) // ! запрос к API
      .then((res) => { 
        if (!res.ok) throw new Error("Не удалось загрузить заказы"); // ! ошибка загрузки заказов
        return res.json();
      })
      .then(setOrders) // ! установка заказов
      .catch((err) => setError(err.message || "Ошибка загрузки заказов")) // ! установка ошибки
      .finally(() => setLoading(false));
  }, [dateFilter, customDate, searchQuery]);

  useEffect(() => { // ! эффект
    loadOrders(); // ! загрузка заказов
  }, [loadOrders]);

  const markReady = (orderId) => { // ! отметить заказ готовым
    fetch(`${API_BASE_URL}/orders/${encodeURIComponent(orderId)}`, {
      method: "PATCH", // ! метод запроса
      headers: { "Content-Type": "application/json" }, // ! заголовки запроса
      body: JSON.stringify({ status: "ready" }), // ! тело запроса
    })
      .then((res) => { // ! обработка ответа
        if (!res.ok) { // ! если ошибка
          return res.json().then((data) => { // ! обработка ответа
            throw new Error(data?.error || "Не удалось обновить");
          });
        }
        return res.json();
      })
      .then(() => loadOrders()) // ! загрузка заказов
      .catch((err) => alert(err.message || "Ошибка")); // ! обработка ошибки
  };

  const counts = useMemo(() => { // ! подсчет заказов
    const draft = { all: orders.length, active: 0, pending: 0, ready: 0, paid: 0, closed: 0 };
    for (const order of orders) { // ! обработка заказов
      const status = order.status || "";
      if (draft[status] != null) { // ! если статус не пустой
        draft[status] += 1;
      }
      if (getStatusFilterFromOrder(status) === "active") {
        draft.active += 1; // ! увеличение счетчика активных заказов
      }
    }
    return draft;
  }, [orders]); // ! зависимость

  const displayedOrders = useMemo(() => { // ! отображаемые заказы    
    if (statusFilter === "all") return orders;
    if (statusFilter === "active") {
      return orders.filter((order) => getStatusFilterFromOrder(order.status) === "active");
    }
    return orders.filter((order) => order.status === statusFilter);
  }, [orders, statusFilter]);

  const openOrderDetails = (orderId) => { // ! открыть модалку деталей заказа
    setDetailsOrderId(orderId);
    setDetailsOpen(true);
  };

  const closeOrderDetails = () => { // ! закрыть модалку деталей
    setDetailsOpen(false);
    setDetailsOrderId(null);
  };

  const applySearch = () => { // ! применить поиск по номеру заказа
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
