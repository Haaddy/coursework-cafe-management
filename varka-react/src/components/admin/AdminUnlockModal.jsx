import { useState } from "react";

function AdminUnlockModal({ isOpen, errorText = "", onClose, onSubmit }) {
  const [keyValue, setKeyValue] = useState("");

  if (!isOpen) {
    return null;
  }

  const handleSubmit = (event) => {
    event.preventDefault();
    onSubmit?.(keyValue.trim());
  };

  const handleClose = () => {
    setKeyValue("");
    onClose?.();
  };

  return (
    <div className="modal modal--active admin-unlock-modal">
      <div className="modal__overlay" onClick={handleClose} />
      <div
        className="modal__content admin-unlock-modal__content"
        onClick={(event) => event.stopPropagation()}
      >
        <button
          type="button"
          className="modal__close"
          onClick={handleClose}
          aria-label="Закрыть модальное окно"
        >
          x
        </button>

        <h2 className="admin-unlock-modal__title">Вход в админ-панель</h2>
        <p className="admin-unlock-modal__subtitle">
          Введите ключ администратора, чтобы открыть панель управления.
        </p>

        <form className="admin-unlock-modal__form" onSubmit={handleSubmit}>
          <label className="admin-unlock-modal__label" htmlFor="adminKey">
            Ключ администратора
          </label>
          <input
            id="adminKey"
            type="password"
            className="admin-unlock-modal__input"
            placeholder="Введите ключ"
            value={keyValue}
            onChange={(event) => setKeyValue(event.target.value)}
            autoComplete="off"
          />

          {errorText ? (
            <p className="admin-unlock-modal__error" role="alert">
              {errorText}
            </p>
          ) : null}

          <div className="admin-unlock-modal__actions">
            <button
              type="button"
              className="button button--secondary"
              onClick={handleClose}
            >
              Отмена
            </button>
            <button type="submit" className="button button--accent">
              Войти
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default AdminUnlockModal;
