import AdminSectionHeader from "./AdminSectionHeader";

import { useState, useEffect } from "react";
import { adminFetch } from "../../utils/adminApi";

function AdminMenuPage() {
  const [menu, setMenu] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [createError, setCreateError] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editError, setEditError] = useState("");
  const [editingItemId, setEditingItemId] = useState(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isDeletingId, setIsDeletingId] = useState(null);
  const [newItem, setNewItem] = useState({
    name: "",
    category: "coffee",
    isVolumes: false,
    priceSingle: "",
    price250: "",
    price350: "",
    price500: "",
  });

  const loadMenu = () => {
    setLoading(true);
    adminFetch("/menu")
      .then((res) => {
        if (!res.ok) {
          throw new Error("Failed to fetch menu");
        }
        return res.json();
      })
      .then((data) => {
        setMenu(data);
        setError(null);
      })
      .catch((err) => {
        setError(err.message);
      })
      .finally(() => {
        setLoading(false);
      });
  };

  useEffect(() => {
    loadMenu();
  }, []);

  const formatPrice = (price) => {
    if (typeof price === "number") {
      return `${price} BYN`;
    }

    if (typeof price === "object" && price !== null) {
      const values = Object.values(price)
        .map((value) => Number(value))
        .filter((value) => !Number.isNaN(value));

      if (values.length === 0) {
        return "—";
      }

      const min = Math.min(...values);
      const max = Math.max(...values);
      return min === max ? `${min} BYN` : `${min}-${max} BYN`;
    }

    return "—";
  };

  const formatVolumes = (price) => {
    if (typeof price !== "object" || price === null) {
      return "";
    }

    const volumes = Object.keys(price)
      .map((value) => Number(value))
      .filter((value) => !Number.isNaN(value))
      .sort((a, b) => a - b);

    if (volumes.length === 0) {
      return "";
    }

    return `${volumes.join("/")} мл`;
  };

  const resetCreateForm = () => {
    setNewItem({
      name: "",
      category: "coffee",
      isVolumes: false,
      priceSingle: "",
      price250: "",
      price350: "",
      price500: "",
    });
    setCreateError("");
  };

  const openCreateModal = () => {
    resetCreateForm();
    setIsCreateModalOpen(true);
  };

  const closeCreateModal = (force = false) => {
    if (isSaving && !force) return;
    setIsCreateModalOpen(false);
    setCreateError("");
  };

  const onCreateInputChange = (event) => {
    const { name, value, type, checked } = event.target;
    setNewItem((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const fillFormFromItem = (item) => {
    if (item.isVolumes && typeof item.price === "object" && item.price !== null) {
      setNewItem({
        name: item.name || "",
        category: item.category || "coffee",
        isVolumes: true,
        priceSingle: "",
        price250: item.price?.["250"] ?? "",
        price350: item.price?.["350"] ?? "",
        price500: item.price?.["500"] ?? "",
      });
      return;
    }

    setNewItem({
      name: item.name || "",
      category: item.category || "coffee",
      isVolumes: false,
      priceSingle: item.price ?? "",
      price250: "",
      price350: "",
      price500: "",
    });
  };

  const onSubmitCreateItem = (event) => {
    event.preventDefault();
    setCreateError("");

    if (!newItem.name.trim()) {
      setCreateError("Введите название товара.");
      return;
    }

    const payload = {
      name: newItem.name.trim(),
      category: newItem.category.trim() || "other",
      isVolumes: newItem.isVolumes,
      price: 0,
    };

    if (newItem.isVolumes) {
      const price250 = Number(newItem.price250);
      const price350 = Number(newItem.price350);
      const price500 = Number(newItem.price500);

      if (!price250 || !price350 || !price500) {
        setCreateError("Укажите цены для 250/350/500 мл.");
        return;
      }

      payload.price = {
        250: price250,
        350: price350,
        500: price500,
      };
    } else {
      const priceSingle = Number(newItem.priceSingle);
      if (!priceSingle) {
        setCreateError("Укажите цену товара.");
        return;
      }
      payload.price = priceSingle;
    }

    setIsSaving(true);
    adminFetch("/menu", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data?.error || "Не удалось добавить товар.");
        }
        return data;
      })
      .then(() => {
        closeCreateModal(true);
        loadMenu();
      })
      .catch((err) => {
        setCreateError(err.message || "Ошибка сети");
      })
      .finally(() => {
        setIsSaving(false);
      });
  };

  const openEditModal = (item) => {
    setEditError("");
    setEditingItemId(item.id);
    fillFormFromItem(item);
    setIsEditModalOpen(true);
  };

  const closeEditModal = (force = false) => {
    if (isUpdating && !force) return;
    setIsEditModalOpen(false);
    setEditError("");
    setEditingItemId(null);
  };

  const onSubmitEditItem = (event) => {
    event.preventDefault();
    setEditError("");

    if (!newItem.name.trim()) {
      setEditError("Введите название товара.");
      return;
    }

    const payload = {
      name: newItem.name.trim(),
      category: newItem.category.trim() || "other",
      isVolumes: newItem.isVolumes,
      price: 0,
    };

    if (newItem.isVolumes) {
      const price250 = Number(newItem.price250);
      const price350 = Number(newItem.price350);
      const price500 = Number(newItem.price500);

      if (!price250 || !price350 || !price500) {
        setEditError("Укажите цены для 250/350/500 мл.");
        return;
      }

      payload.price = {
        250: price250,
        350: price350,
        500: price500,
      };
    } else {
      const priceSingle = Number(newItem.priceSingle);
      if (!priceSingle) {
        setEditError("Укажите цену товара.");
        return;
      }
      payload.price = priceSingle;
    }

    setIsUpdating(true);
    adminFetch(`/menu/${encodeURIComponent(editingItemId)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data?.error || "Не удалось обновить товар.");
        }
        return data;
      })
      .then(() => {
        closeEditModal(true);
        loadMenu();
      })
      .catch((err) => {
        setEditError(err.message || "Ошибка сети");
      })
      .finally(() => {
        setIsUpdating(false);
      });
  };

  const onDeleteItem = (item) => {
    const isConfirmed = window.confirm(`Удалить "${item.name}" из меню?`);
    if (!isConfirmed) {
      return;
    }

    setIsDeletingId(item.id);
    adminFetch(`/menu/${encodeURIComponent(item.id)}`, {
      method: "DELETE",
    })
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data?.error || "Не удалось удалить товар.");
        }
        return data;
      })
      .then(() => {
        loadMenu();
      })
      .catch((err) => {
        setError(err.message || "Ошибка сети");
      })
      .finally(() => {
        setIsDeletingId(null);
      });
  };
  
  return (
    <section className="admin-page admin-menu-page">
      <AdminSectionHeader
        title="Управление меню"
        subtitle="Из этого экрана можно добавлять позиции, скрывать товары и менять цены."
        backTo="/admin"
      />

      <div className="admin-toolbar">
        <button type="button" className="button button--accent" onClick={openCreateModal}>
          Добавить позицию
        </button>
        <button type="button" className="button button--secondary">
          Категории
        </button>
        <button type="button" className="button button--secondary">
          Стоп-лист
        </button>
      </div>

      {loading && <p className="loading">Loading...</p>}

      {error && <p className="error">{error}</p>}

      <div className="admin-list">
        {menu.map(item => (
          <article className="card admin-list-item" key={item.id}>
            <div>
              <h3 className="admin-list-item__title">{item.name}</h3>
              <p className="admin-list-item__meta">{item.category}</p>
            </div>
            <div className="admin-list-item__actions">
              <span className="admin-list-item__price">{formatPrice(item.price)}</span>
              {formatVolumes(item.price) ? (
                <span className="admin-list-item__price">{formatVolumes(item.price)}</span>
              ) : null}
              <button
                type="button"
                className="button button--secondary"
                onClick={() => openEditModal(item)}
              >
                Редактировать
              </button>
              <button
                type="button"
                className="button button--secondary admin-delete-button"
                onClick={() => onDeleteItem(item)}
                disabled={isDeletingId === item.id}
              >
                {isDeletingId === item.id ? "Удаление..." : "Удалить"}
              </button>
            </div>
          </article>
        ))}
      </div>

      <div className={`modal ${isCreateModalOpen ? "modal--active" : ""}`}>
        <div className="modal__overlay" onClick={closeCreateModal} />

        <div
          className="modal__content admin-create-modal"
          onClick={(event) => event.stopPropagation()}
        >
          <h3 className="modal__title">Новый товар</h3>

          <form className="admin-create-modal__form" onSubmit={onSubmitCreateItem}>
            <input
              className="admin-unlock-modal__input"
              name="name"
              placeholder="Название"
              value={newItem.name}
              onChange={onCreateInputChange}
            />

            <input
              className="admin-unlock-modal__input"
              name="category"
              placeholder="Категория (coffee/dessert/drink)"
              value={newItem.category}
              onChange={onCreateInputChange}
            />

            <label className="admin-create-modal__checkbox">
              <input
                type="checkbox"
                name="isVolumes"
                checked={newItem.isVolumes}
                onChange={onCreateInputChange}
              />
              <span>Позиция с объемами</span>
            </label>

            {newItem.isVolumes ? (
              <div className="admin-create-modal__volumes">
                <input
                  className="admin-unlock-modal__input"
                  name="price250"
                  type="number"
                  min="0"
                  placeholder="Цена 250 мл"
                  value={newItem.price250}
                  onChange={onCreateInputChange}
                />
                <input
                  className="admin-unlock-modal__input"
                  name="price350"
                  type="number"
                  min="0"
                  placeholder="Цена 350 мл"
                  value={newItem.price350}
                  onChange={onCreateInputChange}
                />
                <input
                  className="admin-unlock-modal__input"
                  name="price500"
                  type="number"
                  min="0"
                  placeholder="Цена 500 мл"
                  value={newItem.price500}
                  onChange={onCreateInputChange}
                />
              </div>
            ) : (
              <input
                className="admin-unlock-modal__input"
                name="priceSingle"
                type="number"
                min="0"
                placeholder="Цена"
                value={newItem.priceSingle}
                onChange={onCreateInputChange}
              />
            )}

            {createError ? <p className="admin-unlock-modal__error">{createError}</p> : null}

            <div className="admin-unlock-modal__actions">
              <button
                type="button"
                className="button button--secondary"
                onClick={closeCreateModal}
                disabled={isSaving}
              >
                Отмена
              </button>
              <button type="submit" className="button button--accent" disabled={isSaving}>
                {isSaving ? "Сохранение..." : "Сохранить"}
              </button>
            </div>
          </form>
        </div>
      </div>

      <div className={`modal ${isEditModalOpen ? "modal--active" : ""}`}>
        <div className="modal__overlay" onClick={closeEditModal} />

        <div
          className="modal__content admin-create-modal"
          onClick={(event) => event.stopPropagation()}
        >
          <h3 className="modal__title">Редактировать товар</h3>

          <form className="admin-create-modal__form" onSubmit={onSubmitEditItem}>
            <input
              className="admin-unlock-modal__input"
              name="name"
              placeholder="Название"
              value={newItem.name}
              onChange={onCreateInputChange}
            />

            <input
              className="admin-unlock-modal__input"
              name="category"
              placeholder="Категория (coffee/dessert/drink)"
              value={newItem.category}
              onChange={onCreateInputChange}
            />

            <label className="admin-create-modal__checkbox">
              <input
                type="checkbox"
                name="isVolumes"
                checked={newItem.isVolumes}
                onChange={onCreateInputChange}
              />
              <span>Позиция с объемами</span>
            </label>

            {newItem.isVolumes ? (
              <div className="admin-create-modal__volumes">
                <input
                  className="admin-unlock-modal__input"
                  name="price250"
                  type="number"
                  min="0"
                  placeholder="Цена 250 мл"
                  value={newItem.price250}
                  onChange={onCreateInputChange}
                />
                <input
                  className="admin-unlock-modal__input"
                  name="price350"
                  type="number"
                  min="0"
                  placeholder="Цена 350 мл"
                  value={newItem.price350}
                  onChange={onCreateInputChange}
                />
                <input
                  className="admin-unlock-modal__input"
                  name="price500"
                  type="number"
                  min="0"
                  placeholder="Цена 500 мл"
                  value={newItem.price500}
                  onChange={onCreateInputChange}
                />
              </div>
            ) : (
              <input
                className="admin-unlock-modal__input"
                name="priceSingle"
                type="number"
                min="0"
                placeholder="Цена"
                value={newItem.priceSingle}
                onChange={onCreateInputChange}
              />
            )}

            {editError ? <p className="admin-unlock-modal__error">{editError}</p> : null}

            <div className="admin-unlock-modal__actions">
              <button
                type="button"
                className="button button--secondary"
                onClick={closeEditModal}
                disabled={isUpdating}
              >
                Отмена
              </button>
              <button type="submit" className="button button--accent" disabled={isUpdating}>
                {isUpdating ? "Сохранение..." : "Сохранить"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </section>
  );
}

export default AdminMenuPage;
