import AdminSectionHeader from "./AdminSectionHeader";

function AdminStatsPage() {
  return (
    <section className="admin-page admin-stats-page">
      <AdminSectionHeader
        title="Статистика"
        subtitle="Здесь будут метрики продаж и заказов по выбранному периоду."
        backTo="/admin"
      />

      <div className="admin-stats-page__filters card">
        <label className="admin-stats-page__filter">
          От
          <input type="date" className="admin-input" />
        </label>
        <label className="admin-stats-page__filter">
          До
          <input type="date" className="admin-input" />
        </label>
        <button type="button" className="button button--accent">
          Применить
        </button>
      </div>

      <div className="admin-stats-grid">
        <article className="card admin-stat-card">
          <p className="admin-stat-card__label">Заказов за смену</p>
          <p className="admin-stat-card__value">128</p>
        </article>
        <article className="card admin-stat-card">
          <p className="admin-stat-card__label">Выручка</p>
          <p className="admin-stat-card__value">27 450 c</p>
        </article>
        <article className="card admin-stat-card">
          <p className="admin-stat-card__label">Средний чек</p>
          <p className="admin-stat-card__value">214 c</p>
        </article>
      </div>
    </section>
  );
}

export default AdminStatsPage;
