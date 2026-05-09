import { Link } from "react-router-dom";
import AdminSectionHeader from "./AdminSectionHeader";

const dashboardCards = [
  {
    id: "menu",
    title: "Управление меню",
    description:
      "Добавляйте позиции, обновляйте цены и включайте стоп-лист на смену.",
    to: "/admin/menu",
    buttonLabel: "Открыть меню",
  },
  {
    id: "stats",
    title: "Статистика",
    description:
      "Смотрите выручку, количество заказов и средний чек за нужный период.",
    to: "/admin/stats",
    buttonLabel: "Открыть статистику",
  },
  {
    id: "inventory",
    title: "Склад",
    description:
      "Контролируйте остатки ингредиентов и товаров для продажи, отмечайте пополнения.",
    to: "/admin/inventory",
    buttonLabel: "Открыть склад",
  },
  {
    id: "recipes",
    title: "Рецепты списания",
    description:
      "Настройте связь товаров меню с ингредиентами склада для автосписания при заказе.",
    to: "/admin/recipes",
    buttonLabel: "Открыть рецепты",
  },
  {
    id: "employees",
    title: "Сотрудники",
    description:
      "Добавляйте сотрудников, меняйте их статус и управляйте персоналом смены.",
    to: "/admin/employees",
    buttonLabel: "Открыть сотрудников",
  },
];

function AdminDashboardPage() {
  return (
    <section className="admin-page admin-dashboard">
      <AdminSectionHeader
        title="Админ-панель"
        subtitle="Управляйте меню и контролируйте ключевые метрики кофейни."
        backTo="/"
      />

      <div className="admin-dashboard__grid">
        {dashboardCards.map((card) => (
          <article key={card.id} className="card admin-card">
            <h2 className="admin-card__title">{card.title}</h2>
            <p className="admin-card__description">{card.description}</p>
            <Link to={card.to} className="button button--accent admin-card__link">
              {card.buttonLabel}
            </Link>
          </article>
        ))}
      </div>
    </section>
  );
}

export default AdminDashboardPage;
