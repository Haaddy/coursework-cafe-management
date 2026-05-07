import { useState, useEffect } from "react";
import AdminSectionHeader from "./AdminSectionHeader";

function AdminInventoryPage() {
  const [inventoryItems, setInventoryItems] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const [itemName, setItemName] = useState("");
  const [itemType, setItemType] = useState("ingredient");
  const [itemUnit, setItemUnit] = useState("pcs");
  const [initialQuantity, setInitialQuantity] = useState(0);

  const loadInventory = () => {
    setIsLoading(true);
    fetch("http://localhost:3001/inventory")
      .then((res) => {
        if (!res.ok) {
          throw new Error(`Ошибка загрузки: ${res.status}`);
        }
        return res.json();
      })
      .then((data) => {
        setInventoryItems(data);
        setError("");
      })
      .catch((err) => setError(err.message))
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    loadInventory();
  }, []);

  const handleCreateItem = () => {
    const normalizedName = itemName.trim();
    const normalizedUnit = itemUnit.trim() || "pcs";
    const normalizedQuantity = Number(initialQuantity) || 0;

    if (!normalizedName) {
      setError("Введите наименование позиции");
      return;
    }
    if (normalizedQuantity < 0) {
      setError("Количество не может быть отрицательным");
      return;
    }

    setIsLoading(true);
    setError("");
    fetch("http://localhost:3001/inventory", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: normalizedName,
        itemType,
        unit: normalizedUnit,
        quantity: normalizedQuantity,
      }),
    })
      .then((res) => {
        if (!res.ok) {
          throw new Error(`Ошибка создания: ${res.status}`);
        }
        return res.json();
      })
      .then(() => {
        setItemName("");
        setItemType("ingredient");
        setItemUnit("pcs");
        setInitialQuantity(0);
        loadInventory();
      })
      .catch((err) => setError(err.message))
      .finally(() => setIsLoading(false));
  };

  const handleRestockItem = (id) => {
    const rawQuantity = window.prompt("Введите количество для пополнения:", "1");
    if (rawQuantity == null) return;

    const quantity = Number(rawQuantity);
    if (!Number.isFinite(quantity) || quantity <= 0) {
      setError("Количество пополнения должно быть больше 0");
      return;
    }

    setIsLoading(true);
    setError("");
    fetch(`http://localhost:3001/inventory/${id}/restock`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        quantity,
        reason: "manual_restock",
      }),
    })
      .then((res) => {
        if (!res.ok) {
          throw new Error(`Ошибка пополнения: ${res.status}`);
        }
        return res.json();
      })
      .then(() => loadInventory())
      .catch((err) => setError(err.message))
      .finally(() => setIsLoading(false));
  };

  const handleDeleteItem = (id, name) => {
    const isConfirmed = window.confirm(`Удалить позицию "${name}"?`);
    if (!isConfirmed) return;

    setIsLoading(true);
    setError("");
    fetch(`http://localhost:3001/inventory/${id}`, {
      method: "DELETE",
    })
      .then((res) => {
        if (!res.ok) {
          throw new Error(`Ошибка удаления: ${res.status}`);
        }
      })
      .then(() => loadInventory())
      .catch((err) => setError(err.message))
      .finally(() => setIsLoading(false));
  };

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
            <input
              className="admin-input"
              type="text"
              placeholder="Например, Молоко 3.2%"
              value={itemName}
              onChange={(event) => setItemName(event.target.value)}
            />
          </label>
          <label className="admin-stats-page__filter">
            Тип
            <select
              className="admin-input"
              value={itemType}
              onChange={(event) => setItemType(event.target.value)}
            >
              <option>ingredient</option>
              <option>finished_good</option>
            </select>
          </label>
          <label className="admin-stats-page__filter">
            Ед. измерения
            <input
              className="admin-input"
              type="text"
              placeholder="шт / кг / л"
              value={itemUnit}
              onChange={(event) => setItemUnit(event.target.value)}
            />
          </label>
          <label className="admin-stats-page__filter">
            Начальный остаток
            <input
              className="admin-input"
              type="number"
              placeholder="0"
              value={initialQuantity}
              onChange={(event) => setInitialQuantity(Number(event.target.value))}
            />
          </label>
        </div>
        <div className="admin-toolbar">
          <button
            className="button button--accent"
            type="button"
            onClick={handleCreateItem}
            disabled={isLoading}
          >
            Добавить в склад
          </button>
        </div>
      </div>

      <div className="card admin-inventory-page__table-wrap">
        <h2 className="admin-card__title">Текущие остатки</h2>
        {isLoading && <p>Загрузка...</p>}
        {error && <p>{error}</p>}
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
            {inventoryItems.map((row) => (
              <tr key={row.id}>
                <td>{row.id}</td>
                <td>{row.name}</td>
                <td>{row.itemType}</td>
                <td>
                  {row.quantity} {row.unit}
                </td>
                <td className="admin-inventory-table__actions">
                  <button
                    type="button"
                    className="button button--ghost"
                    onClick={() => handleRestockItem(row.id)}
                    disabled={isLoading}
                  >
                    Пополнить
                  </button>
                  <button
                    type="button"
                    className="button button--secondary admin-delete-button"
                    onClick={() => handleDeleteItem(row.id, row.name)}
                    disabled={isLoading}
                  >
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
