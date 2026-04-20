import { useEffect, useState } from "react";

const API_BASE = "http://localhost:3001";

function formatVolume(volume) {
  if (volume == null || volume === "") return "—";
  return `${volume} мл`;
}

function OrderDetailsModal({ isOpen, onClose, orderId, onStatusChanged }) {
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);

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

    fetch(`${API_BASE}/orders/${encodeURIComponent(orderId)}`)
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
    setSaving(true);
    fetch(`${API_BASE}/orders/${encodeURIComponent(orderId)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "готово" }),
    })
      .then((res) => {
        if (!res.ok) throw new Error("Не удалось обновить статус");
        return res.json();
      })
      .then((updated) => {
        setOrder(updated);
        onStatusChanged?.();
      })
      .catch((err) => alert(err.message || "Ошибка"))
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
            Заказ #{orderId ?? "—"}
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
                <dt className="order-details__label">ID</dt>
                <dd className="order-details__value">#{order.id}</dd>
              </div>
              <div className="order-details__row">
                <dt className="order-details__label">Заказчик</dt>
                <dd className="order-details__value">{order.name}</dd>
              </div>
              <div className="order-details__row">
                <dt className="order-details__label">Статус</dt>
                <dd className="order-details__value">
                  <span className="order-details__status">{order.status}</span>
                </dd>
              </div>
              <div className="order-details__row">
                <dt className="order-details__label">Цена</dt>
                <dd className="order-details__value order-details__value--price">
                  {order.totalPrice}&nbsp;BYN
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
          <button
            type="button"
            className="button button--secondary order-details__done"
            onClick={onClose}
          >
            Закрыть
          </button>
        </div>
      </div>
    </div>
  );
}

export default OrderDetailsModal;
