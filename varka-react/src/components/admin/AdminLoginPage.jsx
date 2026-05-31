import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAdminAuth } from "../../auth/AdminAuthContext";

function AdminLoginPage() { // ! страница входа в админку
  const navigate = useNavigate();
  const { login } = useAdminAuth();

  const [personalCode, setPersonalCode] = useState(""); // ! код сотрудника
  const [password, setPassword] = useState(""); // ! пароль
  const [error, setError] = useState(""); // ! ошибка входа
  const [isSubmitting, setIsSubmitting] = useState(false); // ! отправка формы

  const onSubmit = (event) => { // ! отправка формы входа
    event.preventDefault();
    setError("");
    const normalizedCode = personalCode.trim();
    if (!normalizedCode || !password.trim()) {
      setError("Введите код сотрудника и пароль");
      return;
    }

    setIsSubmitting(true);
    login(normalizedCode, password)
      .then(() => navigate("/admin", { replace: true }))
      .catch((err) => setError(err.message || "Не удалось войти"))
      .finally(() => setIsSubmitting(false));
  };

  return (
    <section className="admin-login-page">
      <Link to="/" className="button button--secondary admin-login-page__back">
        ← На главную
      </Link>

      <div className="card admin-login-card">
        <h2 className="admin-login-card__title">Вход в админ-панель</h2>

        <form className="admin-login-card__form" onSubmit={onSubmit}>
          <input
            className="admin-unlock-modal__input"
            placeholder="Код сотрудника или логин владельца"
            value={personalCode}
            onChange={(event) => setPersonalCode(event.target.value)}
            autoComplete="username"
          />
          <input
            className="admin-unlock-modal__input"
            placeholder="Пароль"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete="current-password"
          />

          {error ? (
            <p className="admin-unlock-modal__error" role="alert">
              {error}
            </p>
          ) : null}

          <button className="button button--accent admin-login-card__submit" type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Входим..." : "Войти"}
          </button>
        </form>
      </div>
    </section>
  );
}

export default AdminLoginPage;
