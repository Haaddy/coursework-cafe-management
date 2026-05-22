import { useEffect, useState } from "react";
import AdminSectionHeader from "./AdminSectionHeader";
import { adminFetch } from "../../utils/adminApi";

function createEmptyRow() {
  return {
    inventoryItemId: "",
    qtyPerUnit: "",
    volume: "",
  };
}

function AdminRecipesPage() {
  const [menuItems, setMenuItems] = useState([]);
  const [inventoryItems, setInventoryItems] = useState([]);
  const [selectedMenuId, setSelectedMenuId] = useState("");
  const [recipeRows, setRecipeRows] = useState([createEmptyRow()]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  useEffect(() => {
    setIsLoading(true);
    Promise.all([
      adminFetch("/menu").then((res) => {
        if (!res.ok) throw new Error("Не удалось загрузить меню");
        return res.json();
      }),
      adminFetch("/inventory").then((res) => {
        if (!res.ok) throw new Error("Не удалось загрузить склад");
        return res.json();
      }),
    ])
      .then(([menuData, inventoryData]) => {
        setMenuItems(menuData);
        setInventoryItems(inventoryData);
        setError("");
      })
      .catch((err) => setError(err.message || "Ошибка загрузки"))
      .finally(() => setIsLoading(false));
  }, []);

  const onSelectMenuItem = (event) => {
    const menuId = event.target.value;
    setSelectedMenuId(menuId);
    setSuccessMessage("");
    setError("");

    if (!menuId) {
      setRecipeRows([createEmptyRow()]);
      return;
    }

    setIsLoading(true);
    adminFetch(`/menu/${menuId}/ingredients`)
      .then((res) => {
        if (!res.ok) throw new Error("Не удалось загрузить рецепт");
        return res.json();
      })
      .then((data) => {
        if (!Array.isArray(data) || data.length === 0) {
          setRecipeRows([createEmptyRow()]);
          return;
        }

        setRecipeRows(
          data.map((item) => ({
            inventoryItemId: String(item.inventoryItemId),
            qtyPerUnit: String(item.qtyPerUnit),
            volume: item.volume || "",
          }))
        );
      })
      .catch((err) => setError(err.message || "Ошибка загрузки рецепта"))
      .finally(() => setIsLoading(false));
  };

  const onChangeRow = (index, field, value) => {
    setRecipeRows((prev) =>
      prev.map((row, rowIndex) => (rowIndex === index ? { ...row, [field]: value } : row))
    );
  };

  const addRow = () => {
    setRecipeRows((prev) => [...prev, createEmptyRow()]);
  };

  const removeRow = (index) => {
    setRecipeRows((prev) => {
      if (prev.length === 1) return [createEmptyRow()];
      return prev.filter((_, rowIndex) => rowIndex !== index);
    });
  };

  const onSaveRecipe = () => {
    if (!selectedMenuId) {
      setError("Сначала выберите товар меню");
      return;
    }

    const cleaned = recipeRows
      .filter((row) => row.inventoryItemId && row.qtyPerUnit)
      .map((row) => ({
        inventoryItemId: Number(row.inventoryItemId),
        qtyPerUnit: Number(row.qtyPerUnit),
        volume: row.volume.trim() || null,
      }));

    const hasInvalid = cleaned.some(
      (row) => !Number.isFinite(row.qtyPerUnit) || row.qtyPerUnit <= 0
    );
    if (hasInvalid) {
      setError("qtyPerUnit должен быть больше 0");
      return;
    }

    setIsSaving(true);
    setError("");
    setSuccessMessage("");
    adminFetch(`/menu/${selectedMenuId}/ingredients`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ingredients: cleaned }),
    })
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error || "Не удалось сохранить рецепт");
        return data;
      })
      .then(() => setSuccessMessage("Рецепт сохранен"))
      .catch((err) => setError(err.message || "Ошибка сохранения"))
      .finally(() => setIsSaving(false));
  };

  return (
    <section className="admin-page admin-recipes-page">
      <AdminSectionHeader
        title="Связи товар - ингредиенты"
        subtitle="Задайте рецепт для товара меню, чтобы при заказе ингредиенты списывались автоматически."
        backTo="/admin"
      />

      <div className="card admin-recipes-page__controls">
        <label className="admin-stats-page__filter">
          Товар меню
          <select className="admin-input" value={selectedMenuId} onChange={onSelectMenuItem}>
            <option value="">Выберите товар</option>
            {menuItems.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="card admin-recipes-page__table-wrap">
        <h2 className="admin-card__title">Рецепт</h2>
        {isLoading && <p>Загрузка...</p>}
        {error && <p className="admin-unlock-modal__error">{error}</p>}
        {successMessage && <p>{successMessage}</p>}

        <table className="admin-inventory-table">
          <thead>
            <tr>
              <th>Ингредиент</th>
              <th>Количество на порцию</th>
              <th>Объем (опц.)</th>
              <th>Действия</th>
            </tr>
          </thead>
          <tbody>
            {recipeRows.map((row, index) => (
              <tr key={`recipe-row-${index}`}>
                <td>
                  <select
                    className="admin-input"
                    value={row.inventoryItemId}
                    onChange={(event) => onChangeRow(index, "inventoryItemId", event.target.value)}
                  >
                    <option value="">Выберите ингредиент</option>
                    {inventoryItems.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name} ({item.unit})
                      </option>
                    ))}
                  </select>
                </td>
                <td>
                  <input
                    className="admin-input"
                    type="number"
                    min="0"
                    step="0.001"
                    value={row.qtyPerUnit}
                    onChange={(event) => onChangeRow(index, "qtyPerUnit", event.target.value)}
                    placeholder="Например, 0.018"
                  />
                </td>
                <td>
                  <input
                    className="admin-input"
                    type="text"
                    value={row.volume}
                    onChange={(event) => onChangeRow(index, "volume", event.target.value)}
                    placeholder="250 / 350 / пусто"
                  />
                </td>
                <td className="admin-inventory-table__actions">
                  <button
                    type="button"
                    className="button button--secondary admin-delete-button"
                    onClick={() => removeRow(index)}
                  >
                    Удалить
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="admin-toolbar">
          <button type="button" className="button button--secondary" onClick={addRow}>
            Добавить ингредиент
          </button>
          <button
            type="button"
            className="button button--accent"
            onClick={onSaveRecipe}
            disabled={isSaving || isLoading || !selectedMenuId}
          >
            {isSaving ? "Сохранение..." : "Сохранить рецепт"}
          </button>
        </div>
      </div>
    </section>
  );
}

export default AdminRecipesPage;
