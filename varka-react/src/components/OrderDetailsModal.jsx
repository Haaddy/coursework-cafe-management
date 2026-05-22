import { useEffect, useState } from "react";
import { API_BASE_URL } from "../constants/api";

function formatVolume(volume) {
  if (volume == null || volume === "") return "—";
  return `${volume} мл`;
}

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

function OrderDetailsModal({ isOpen, onClose, orderId, onStatusChanged }) {
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [employeeCode, setEmployeeCode] = useState("");
  const [actionError, setActionError] = useState("");
  const [actionSuccess, setActionSuccess] = useState("");

  useEffect(() => {
    if (!isOpen || !orderId) {
      setOrder(null);
      setError(null);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);
    setOrder(null);
    setActionError("");
    setActionSuccess("");

    setPaymentMethod("cash");
    setEmployeeCode("");

    fetch(`${API_BASE_URL}/orders/${encodeURIComponent(orderId)}`)
      .then((res) => {
        if (res.status === 404) {
          throw new Error("Заказ не найден");
        }
        if (!res.ok) {
          throw new Error("Не удалось загрузить заказ");
        }
        return res.json();
      })
      .then((data) => {
        if (!cancelled) setOrder(data);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message || "Ошибка загрузки");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [isOpen, orderId]);

  const markReady = () => {
    if (!orderId) return;
    setActionError("");
    setActionSuccess("");
    setSaving(true);
    fetch(`${API_BASE_URL}/orders/${encodeURIComponent(orderId)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "ready" }),
    })
      .then((res) => {
        if (!res.ok) {
          return res.json().then((data) => {
            throw new Error(data?.error || "Не удалось обновить статус");
          });
        }
        return res.json();
      })
      .then((updated) => {
        setOrder(updated);
        setActionSuccess("Статус заказа обновлен: Готов.");
        onStatusChanged?.();
      })
      .catch((err) => setActionError(err.message || "Ошибка"))
      .finally(() => setSaving(false));
  };

  const payOrder = () => {
    if (!orderId) return;
    setActionError("");
    setActionSuccess("");
    setSaving(true);
    fetch(`${API_BASE_URL}/orders/${encodeURIComponent(orderId)}/pay`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ paymentMethod }),
    })
      .then((res) => {
        if (!res.ok) {
          return res.json().then((data) => {
            throw new Error(data?.error || "Не удалось провести оплату");
          });
        }
        return res.json();
      })
      .then((updated) => {
        setOrder(updated);
        setActionSuccess("Оплата успешно проведена.");
        onStatusChanged?.();
      })
      .catch((err) => setActionError(err.message || "Ошибка оплаты"))
      .finally(() => setSaving(false));
  };

  const closeOrder = () => {
    if (!orderId) return;
    if (!employeeCode.trim()) {
      setActionError("Введите код сотрудника");
      return;
    }

    setActionError("");
    setActionSuccess("");
    setSaving(true);
    fetch(`${API_BASE_URL}/orders/${encodeURIComponent(orderId)}/close`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ employeeCode: employeeCode.trim() }),
    })
      .then((res) => {
        if (!res.ok) {
          return res.json().then((data) => {
            throw new Error(data?.error || "Не удалось закрыть чек");
          });
        }
        return res.json();
      })
      .then((updated) => {
        setOrder(updated);
        setEmployeeCode("");
        setActionSuccess(
          `Чек закрыт сотрудником: ${updated.closedByEmployee?.fullName || "неизвестно"}`
        );
        onStatusChanged?.();
      })
      .catch((err) => setActionError(err.message || "Ошибка закрытия чека"))
      .finally(() => setSaving(false));
  };

  return (
    <div className={`modal ${isOpen ? "modal--active" : ""}`}>
      <div className="modal__overlay" onClick={onClose} aria-hidden="true" />

      <div
        className="modal__content modal__content--order-details"
        role="dialog"
        aria-modal="true"
        aria-labelledby="order-details-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="order-details__header">
          <h3 className="modal__title order-details__title" id="order-details-title">
            Заказ №{order?.orderNumber || "—"}
          </h3>
          <button
            type="button"
            className="order-details__close"
            onClick={onClose}
            aria-label="Закрыть"
          >
            ×
          </button>
        </div>

        {loading && <p className="order-details__hint">Загрузка…</p>}

        {error && !loading && (
          <p className="order-details__error" role="alert">
            {error}
          </p>
        )}

        {!loading && !error && order && (
          <>
            <dl className="order-details__meta">
              <div className="order-details__row">
                <dt className="order-details__label">Внутренний ID</dt>
                <dd className="order-details__value">#{order.id}</dd>
              </div>
              <div className="order-details__row">
                <dt className="order-details__label">Номер заказа</dt>
                <dd className="order-details__value">{order.orderNumber || "—"}</dd>
              </div>
              <div className="order-details__row">
                <dt className="order-details__label">Статус</dt>
                <dd className="order-details__value">
                  <span className="order-details__status">{getStatusLabel(order.status)}</span>
                </dd>
              </div>
              <div className="order-details__row">
                <dt className="order-details__label">Цена</dt>
                <dd className="order-details__value order-details__value--price">
                  {order.totalPrice}&nbsp;BYN
                </dd>
              </div>
              <div className="order-details__row">
                <dt className="order-details__label">Оплата</dt>
                <dd className="order-details__value">
                  {order.paymentMethod
                    ? `${getPaymentMethodLabel(order.paymentMethod)} (${order.paidAt || "—"})`
                    : "—"}
                </dd>
              </div>
              <div className="order-details__row">
                <dt className="order-details__label">Закрыл чек</dt>
                <dd className="order-details__value">
                  {order.closedByEmployee?.fullName || "—"}
                </dd>
              </div>
            </dl>

            <div className="order-details__section">
              <h4 className="order-details__section-title">Состав заказа</h4>
              {Array.isArray(order.items) && order.items.length > 0 ? (
                <ul className="order-details__items">
                  {order.items.map((item, index) => (
                    <li
                      key={`${item.id}-${index}`}
                      className="order-details__item"
                    >
                      <span className="order-details__item-name">{item.name}</span>
                      <span className="order-details__item-meta">
                        {formatVolume(item.volume)}
                      </span>
                      <span className="order-details__item-price">
                        {item.price}&nbsp;BYN
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="order-details__hint">В заказе нет позиций</p>
              )}
            </div>
          </>
        )}

        <div className="order-details__section order-details__section--actions">
          <h4 className="order-details__section-title">Действия</h4>
          {actionError && (
            <p className="order-details__error" role="alert">
              {actionError}
            </p>
          )}
          {actionSuccess && <p className="order-details__success">{actionSuccess}</p>}

          <div className="order-details__footer">
          {order && order.status === "pending" && (
            <button
              type="button"
              className="button button--accent"
              onClick={markReady}
              disabled={saving}
            >
              {saving ? "Сохраняю…" : "Отметить готовым"}
            </button>
          )}
          {order && order.status === "ready" && (
            <>
              <select
                className="modal__input order-details__input"
                value={paymentMethod}
                onChange={(event) => setPaymentMethod(event.target.value)}
                disabled={saving}
              >
                <option value="cash">Наличные</option>
                <option value="card">Карта</option>
                <option value="other">Другое</option>
              </select>
              <button
                type="button"
                className="button button--accent"
                onClick={payOrder}
                disabled={saving}
              >
                {saving ? "Сохраняю…" : "Провести оплату"}
              </button>
            </>
          )}
          {order && order.status === "paid" && (
            <div className="order-details__close-checkout">
              <p className="order-details__hint">
                Для закрытия чека введите код сотрудника, который выдаёт заказ.
              </p>
              <input
                className="modal__input order-details__input"
                placeholder="Код сотрудника"
                value={employeeCode}
                onChange={(event) => setEmployeeCode(event.target.value)}
                disabled={saving}
              />
              <button
                type="button"
                className="button button--accent"
                onClick={closeOrder}
                disabled={saving || !employeeCode.trim()}
              >
                {saving ? "Сохраняю…" : "Закрыть чек"}
              </button>
            </div>
          )}
          <button
            type="button"
            className="button button--secondary order-details__done"
            onClick={onClose}
          >
            Закрыть окно
          </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default OrderDetailsModal;
