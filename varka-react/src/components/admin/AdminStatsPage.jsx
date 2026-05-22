import { useState, useEffect, useCallback } from "react";
import AdminSectionHeader from "./AdminSectionHeader";
import { adminFetch } from "../../utils/adminApi";

function formatLocalYmd(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function defaultDateRange() {
  const to = new Date();
  const from = new Date(to.getFullYear(), to.getMonth(), 1);
  return { from: formatLocalYmd(from), to: formatLocalYmd(to) };
}

const moneyFormatter = new Intl.NumberFormat("ru-BY", {
  style: "currency",
  currency: "BYN",
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

function formatMoney(value) {
  if (value == null || Number.isNaN(value)) {
    return "—";
  }
  return moneyFormatter.format(value);
}

function groupByLabel(groupBy) {
  if (groupBy === "day") return "По дням";
  if (groupBy === "week") return "По неделям";
  if (groupBy === "month") return "По месяцам";
  return "";
}

function AdminStatsPage() {
  const [{ from, to }, setRange] = useState(defaultDateRange);
  const [groupBy, setGroupBy] = useState("day");
  const [summary, setSummary] = useState(null);
  const [buckets, setBuckets] = useState(null);
  const [topProducts, setTopProducts] = useState(null);
  const [peakHour, setPeakHour] = useState(null);
  const [salesByHour, setSalesByHour] = useState(null);
  const [resolvedGroupBy, setResolvedGroupBy] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [legacyApi, setLegacyApi] = useState(false);

  const loadStats = useCallback(() => {
    if (!from || !to) {
      setError("Укажите даты «От» и «До»");
      return;
    }

    const params = new URLSearchParams({ from, to });
    if (groupBy) {
      params.set("groupBy", groupBy);
    }

    setIsLoading(true);
    setError("");

    adminFetch(`/analytics/orders?${params.toString()}`)
      .then(async (res) => {
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          throw new Error(data.error || `Ошибка ${res.status}`);
        }
        return data;
      })
      .then((data) => {
        const hasExtendedStats =
          Array.isArray(data.topProducts) && Array.isArray(data.salesByHour);
        setLegacyApi(!hasExtendedStats && Number(data.summary?.orderCount) > 0);
        setSummary(data.summary || null);
        setBuckets(data.buckets ?? null);
        setTopProducts(Array.isArray(data.topProducts) ? data.topProducts : null);
        setPeakHour(data.peakHour ?? null);
        setSalesByHour(Array.isArray(data.salesByHour) ? data.salesByHour : null);
        setResolvedGroupBy(data.groupBy || null);
      })
      .catch((err) => {
        setLegacyApi(false);
        setSummary(null);
        setBuckets(null);
        setTopProducts(null);
        setPeakHour(null);
        setSalesByHour(null);
        setResolvedGroupBy(null);
        setError(err.message || "Не удалось загрузить статистику");
      })
      .finally(() => setIsLoading(false));
  }, [from, to, groupBy]);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  return (
    <section className="admin-page admin-stats-page">
      <AdminSectionHeader
        title="Статистика"
        subtitle="Метрики продаж и заказов по выбранному периоду (данные с сервера)."
        backTo="/admin"
      />

      <div className="admin-stats-page__filters card">
        <label className="admin-stats-page__filter">
          От
          <input
            type="date"
            className="admin-input"
            value={from}
            onChange={(e) => setRange((r) => ({ ...r, from: e.target.value }))}
          />
        </label>
        <label className="admin-stats-page__filter">
          До
          <input
            type="date"
            className="admin-input"
            value={to}
            onChange={(e) => setRange((r) => ({ ...r, to: e.target.value }))}
          />
        </label>
        <label className="admin-stats-page__filter">
          Детализация
          <select
            className="admin-input"
            value={groupBy}
            onChange={(e) => setGroupBy(e.target.value)}
          >
            <option value="">Только итог</option>
            <option value="day">По дням</option>
            <option value="week">По неделям</option>
            <option value="month">По месяцам</option>
          </select>
        </label>
        <button
          type="button"
          className="button button--accent"
          onClick={loadStats}
          disabled={isLoading}
        >
          {isLoading ? "Загрузка…" : "Применить"}
        </button>
      </div>

      {error && (
        <p className="admin-stats-page__error" style={{ color: "var(--color-danger, #e85d5d)" }}>
          {error}
        </p>
      )}

      <div className="admin-stats-grid">
        <article className="card admin-stat-card">
          <p className="admin-stat-card__label">Заказов за период</p>
          <p className="admin-stat-card__value">
            {summary ? summary.orderCount : isLoading ? "…" : "—"}
          </p>
        </article>
        <article className="card admin-stat-card">
          <p className="admin-stat-card__label">Выручка</p>
          <p className="admin-stat-card__value">
            {summary ? formatMoney(summary.totalRevenue) : isLoading ? "…" : "—"}
          </p>
        </article>
        <article className="card admin-stat-card">
          <p className="admin-stat-card__label">Средний чек</p>
          <p className="admin-stat-card__value">
            {summary
              ? summary.averageCheck != null
                ? formatMoney(summary.averageCheck)
                : "—"
              : isLoading
                ? "…"
                : "—"}
          </p>
        </article>
        <article className="card admin-stat-card">
          <p className="admin-stat-card__label">Пик продаж</p>
          <p className="admin-stat-card__value">
            {peakHour
              ? peakHour.label
              : isLoading
                ? "…"
                : legacyApi
                  ? "—"
                  : summary?.orderCount > 0
                    ? "Нет данных"
                    : "—"}
          </p>
          {peakHour ? (
            <p className="admin-stat-card__hint">
              {peakHour.orderCount}{" "}
              {peakHour.orderCount === 1 ? "заказ" : peakHour.orderCount < 5 ? "заказа" : "заказов"}
            </p>
          ) : legacyApi ? (
            <p className="admin-stat-card__hint">Перезапустите backend (npm start)</p>
          ) : null}
        </article>
      </div>

      {legacyApi && (
        <p className="admin-stats-page__notice card" style={{ marginTop: 12, padding: 12 }}>
          Заказы есть, но сервер отдал старый ответ без топа товаров и пика по часам. Остановите
          backend и снова запустите <code>npm start</code> в папке <code>backend</code>, затем
          нажмите «Применить».
        </p>
      )}

      {(topProducts?.length > 0 || (summary?.orderCount > 0 && !isLoading && !legacyApi)) && (
        <div className="card admin-inventory-page__table-wrap" style={{ marginTop: 16 }}>
          <h2 className="admin-card__title">Популярные товары</h2>
          <p className="admin-card__description">
            По числу позиций в заказах за выбранный период (одна строка корзины = 1 единица).
          </p>
          <table className="admin-inventory-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Товар</th>
                <th>Заказано раз</th>
                <th>Выручка по позициям</th>
              </tr>
            </thead>
            <tbody>
              {topProducts.map((row) => (
                <tr key={`${row.menuId ?? "n"}-${row.name}`}>
                  <td>{row.rank}</td>
                  <td>{row.name}</td>
                  <td>{row.orderCount}</td>
                  <td>{formatMoney(row.revenue)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {topProducts?.length === 0 && !isLoading && summary?.orderCount > 0 && !legacyApi && (
        <p className="admin-stats-page__empty" style={{ marginTop: 12, color: "var(--color-muted)" }}>
          Нет позиций в заказах за период.
        </p>
      )}

      {salesByHour && salesByHour.some((row) => row.orderCount > 0) && (
        <div className="card admin-inventory-page__table-wrap" style={{ marginTop: 16 }}>
          <h2 className="admin-card__title">Заказы по часам</h2>
          <p className="admin-card__description">Локальное время сервера. Пик: {peakHour?.label ?? "—"}.</p>
          <table className="admin-inventory-table">
            <thead>
              <tr>
                <th>Интервал</th>
                <th>Заказов</th>
              </tr>
            </thead>
            <tbody>
              {salesByHour
                .filter((row) => row.orderCount > 0)
                .sort((a, b) => b.orderCount - a.orderCount || a.hour - b.hour)
                .map((row) => (
                  <tr key={row.hour} className={peakHour?.hour === row.hour ? "admin-stats-page__peak-row" : undefined}>
                    <td>{row.label}</td>
                    <td>{row.orderCount}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      )}

      {buckets && buckets.length > 0 && (
        <div className="card admin-inventory-page__table-wrap" style={{ marginTop: 16 }}>
          <h2 className="admin-card__title">{groupByLabel(resolvedGroupBy)}</h2>
          <table className="admin-inventory-table">
            <thead>
              <tr>
                <th>Период</th>
                <th>Заказов</th>
                <th>Выручка</th>
                <th>Средний чек</th>
              </tr>
            </thead>
            <tbody>
              {buckets.map((row) => (
                <tr key={row.period}>
                  <td>{row.period}</td>
                  <td>{row.orderCount}</td>
                  <td>{formatMoney(row.revenue)}</td>
                  <td>{row.averageCheck != null ? formatMoney(row.averageCheck) : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {buckets && buckets.length === 0 && !isLoading && summary && (
        <p className="admin-stats-page__empty" style={{ marginTop: 12, color: "var(--color-muted)" }}>
          За выбранный период нет заказов.
        </p>
      )}
    </section>
  );
}

export default AdminStatsPage;
