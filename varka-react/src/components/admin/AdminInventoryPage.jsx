import { useState, useEffect, useCallback } from "react";
import AdminSectionHeader from "./AdminSectionHeader";

const API_BASE = "http://localhost:3001";

function formatLocalYmd(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function defaultMovementsDateRange() {
  const to = new Date();
  const from = new Date(to.getFullYear(), to.getMonth(), 1);
  return { from: formatLocalYmd(from), to: formatLocalYmd(to) };
}

function movementTypeLabel(type) {
  if (type === "in") return "Приход";
  if (type === "out") return "Расход";
  return type;
}

function formatDateTime(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString("ru-RU");
}

function AdminInventoryPage() {
  const [inventoryItems, setInventoryItems] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const [itemName, setItemName] = useState("");
  const [itemType, setItemType] = useState("ingredient");
  const [itemUnit, setItemUnit] = useState("pcs");
  const [initialQuantity, setInitialQuantity] = useState(0);

  const [{ from: movFrom, to: movTo }, setMovRange] = useState(defaultMovementsDateRange);
  const [movItemId, setMovItemId] = useState("");
  const [movType, setMovType] = useState("");
  const [movRefType, setMovRefType] = useState("");
  const [movements, setMovements] = useState([]);
  const [movementsLoading, setMovementsLoading] = useState(false);
  const [movementsError, setMovementsError] = useState("");

  const loadInventory = () => {
    setIsLoading(true);
    fetch(`${API_BASE}/inventory`)
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

  const loadMovements = useCallback(() => {
    const params = new URLSearchParams();
    if (movFrom) params.set("from", movFrom);
    if (movTo) params.set("to", movTo);
    if (movItemId) params.set("itemId", movItemId);
    if (movType) params.set("movementType", movType);
    if (movRefType) params.set("referenceType", movRefType);
    params.set("limit", "500");

    setMovementsLoading(true);
    setMovementsError("");
    fetch(`${API_BASE}/inventory/movements?${params.toString()}`)
      .then(async (res) => {
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          throw new Error(data.error || `Ошибка журнала: ${res.status}`);
        }
        return data;
      })
      .then((data) => setMovements(Array.isArray(data) ? data : []))
      .catch((err) => {
        setMovements([]);
        setMovementsError(err.message);
      })
      .finally(() => setMovementsLoading(false));
  }, [movFrom, movTo, movItemId, movType, movRefType]);

  useEffect(() => {
    loadInventory();
  }, []);

  useEffect(() => {
    loadMovements();
  }, [loadMovements]);

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
    fetch(`${API_BASE}/inventory`, {
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
        loadMovements();
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
    fetch(`${API_BASE}/inventory/${id}/restock`, {
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
      .then(() => {
        loadInventory();
        loadMovements();
      })
      .catch((err) => setError(err.message))
      .finally(() => setIsLoading(false));
  };

  const handleDeleteItem = (id, name) => {
    const isConfirmed = window.confirm(`Удалить позицию "${name}"?`);
    if (!isConfirmed) return;

    setIsLoading(true);
    setError("");
    fetch(`${API_BASE}/inventory/${id}`, {
      method: "DELETE",
    })
      .then((res) => {
        if (!res.ok) {
          throw new Error(`Ошибка удаления: ${res.status}`);
        }
      })
      .then(() => {
        loadInventory();
        loadMovements();
      })
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

      <div className="card admin-inventory-page__table-wrap">
        <h2 className="admin-card__title">Журнал движений</h2>
        <p style={{ marginTop: 0, color: "var(--color-muted)", fontSize: 14 }}>
          Приходы и списания по складу. Данные с сервера с учётом фильтров (до 500 записей).
        </p>
        <div className="admin-stats-page__filters card" style={{ marginBottom: 12, padding: 14 }}>
          <label className="admin-stats-page__filter">
            От
            <input
              type="date"
              className="admin-input"
              value={movFrom}
              onChange={(e) => setMovRange((r) => ({ ...r, from: e.target.value }))}
            />
          </label>
          <label className="admin-stats-page__filter">
            До
            <input
              type="date"
              className="admin-input"
              value={movTo}
              onChange={(e) => setMovRange((r) => ({ ...r, to: e.target.value }))}
            />
          </label>
          <label className="admin-stats-page__filter">
            Позиция
            <select
              className="admin-input"
              value={movItemId}
              onChange={(e) => setMovItemId(e.target.value)}
            >
              <option value="">Все</option>
              {inventoryItems.map((row) => (
                <option key={row.id} value={String(row.id)}>
                  {row.name}
                </option>
              ))}
            </select>
          </label>
          <label className="admin-stats-page__filter">
            Тип движения
            <select
              className="admin-input"
              value={movType}
              onChange={(e) => setMovType(e.target.value)}
            >
              <option value="">Все</option>
              <option value="in">Приход</option>
              <option value="out">Расход</option>
            </select>
          </label>
          <label className="admin-stats-page__filter">
            Основание
            <select
              className="admin-input"
              value={movRefType}
              onChange={(e) => setMovRefType(e.target.value)}
            >
              <option value="">Все</option>
              <option value="order">Заказ</option>
              <option value="manual">Вручную</option>
            </select>
          </label>
          <button
            type="button"
            className="button button--accent"
            onClick={loadMovements}
            disabled={movementsLoading}
          >
            {movementsLoading ? "Загрузка…" : "Обновить"}
          </button>
        </div>
        {movementsError && (
          <p style={{ color: "var(--color-danger, #e85d5d)" }}>{movementsError}</p>
        )}
        {movementsLoading && !movements.length ? <p>Загрузка журнала...</p> : null}
        <div style={{ overflowX: "auto" }}>
          <table className="admin-inventory-table">
            <thead>
              <tr>
                <th>Дата</th>
                <th>Позиция</th>
                <th>Тип</th>
                <th>Кол-во</th>
                <th>Причина</th>
                <th>Основание</th>
                <th>Связь</th>
              </tr>
            </thead>
            <tbody>
              {movements.map((row) => (
                <tr key={row.id}>
                  <td>{formatDateTime(row.createdAt)}</td>
                  <td>{row.itemName}</td>
                  <td>{movementTypeLabel(row.movementType)}</td>
                  <td>{row.quantity}</td>
                  <td>{row.reason ?? "—"}</td>
                  <td>{row.referenceType ?? "—"}</td>
                  <td className="admin-list-item__price">{row.referenceId ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!movementsLoading && movements.length === 0 && !movementsError ? (
          <p style={{ color: "var(--color-muted)" }}>Нет записей за выбранные условия.</p>
        ) : null}
      </div>
    </section>
  );
}

export default AdminInventoryPage;
