import AdminSectionHeader from "./AdminSectionHeader";

const demoRows = [
  { id: 1, name: "Кофейные зерна арабика", itemType: "ingredient", unit: "кг", qty: 8.5 },
  { id: 2, name: "Сливки 20%", itemType: "ingredient", unit: "л", qty: 6 },
  { id: 3, name: "Чизкейк классический", itemType: "finished_good", unit: "шт", qty: 0 },
];

function AdminInventoryPage() {
  return (
    <section className="admin-page admin-inventory-page">
      <AdminSectionHeader
        title="Склад"
        subtitle="Управляйте остатками ингредиентов и товаров для продажи."
        backTo="/admin"
      />

      <div className="card admin-inventory-page__form">
        <h2 className="admin-card__title">Добавить позицию на склад</h2>
        <div className="admin-inventory-page__grid">
          <label className="admin-stats-page__filter">
            Наименование
            <input className="admin-input" type="text" placeholder="Например, Молоко 3.2%" />
          </label>
          <label className="admin-stats-page__filter">
            Тип
            <select className="admin-input">
              <option>ingredient</option>
              <option>finished_good</option>
            </select>
          </label>
          <label className="admin-stats-page__filter">
            Ед. измерения
            <input className="admin-input" type="text" placeholder="шт / кг / л" />
          </label>
          <label className="admin-stats-page__filter">
            Начальный остаток
            <input className="admin-input" type="number" placeholder="0" />
          </label>
        </div>
        <div className="admin-toolbar">
          <button className="button button--accent" type="button">
            Добавить в склад
          </button>
        </div>
      </div>

      <div className="card admin-inventory-page__table-wrap">
        <h2 className="admin-card__title">Текущие остатки</h2>
        <table className="admin-inventory-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Наименование</th>
              <th>Тип</th>
              <th>Остаток</th>
              <th>Действия</th>
            </tr>
          </thead>
          <tbody>
            {demoRows.map((row) => (
              <tr key={row.id}>
                <td>{row.id}</td>
                <td>{row.name}</td>
                <td>{row.itemType}</td>
                <td>
                  {row.qty} {row.unit}
                </td>
                <td className="admin-inventory-table__actions">
                  <button type="button" className="button button--ghost">
                    Пополнить
                  </button>
                  <button type="button" className="button admin-delete-button">
                    Удалить
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export default AdminInventoryPage;
