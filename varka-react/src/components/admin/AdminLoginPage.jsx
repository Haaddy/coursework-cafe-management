import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAdminAuth } from "../../auth/AdminAuthContext";

function AdminLoginPage() {
  const navigate = useNavigate();
  const { login } = useAdminAuth();

  const [personalCode, setPersonalCode] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const onSubmit = async (event) => {
    event.preventDefault();
    setError("");
    const normalizedCode = personalCode.trim();
    if (!normalizedCode || !password.trim()) {
      setError("Введите код сотрудника и пароль");
      return;
    }

    setIsSubmitting(true);
    try {
      await login(normalizedCode, password);
      navigate("/admin", { replace: true });
    } catch (err) {
      setError(err.message || "Не удалось войти");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="admin-page">
      <Link to="/" className="button button--secondary orders__back">
        ← На главную
      </Link>

      <div className="card admin-login-card">
        <h2 className="admin-card__title">Вход в админ-панель</h2>
        <p className="admin-card__description">
<<<<<<< HEAD
          Менеджер: код сотрудника из БД и пароль ADMIN_PASSWORD. Владелец: логин и пароль из ADMIN_OWNER_* в .env.
=======
          Войдите как менеджер: код сотрудника + пароль администратора.
>>>>>>> e068652616301dcbf4734e70f1897badd5e1af19
        </p>

        <form className="admin-create-modal__form" onSubmit={onSubmit}>
          <input
            className="admin-unlock-modal__input"
<<<<<<< HEAD
            placeholder="Код сотрудника или логин владельца"
=======
            placeholder="Код сотрудника"
>>>>>>> e068652616301dcbf4734e70f1897badd5e1af19
            value={personalCode}
            onChange={(event) => setPersonalCode(event.target.value)}
          />
          <input
            className="admin-unlock-modal__input"
            placeholder="Пароль"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />

          {error ? (
            <p className="admin-unlock-modal__error" role="alert">
              {error}
            </p>
          ) : null}

          <button className="button button--accent" type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Входим..." : "Войти"}
          </button>
        </form>
      </div>
    </section>
  );
}

export default AdminLoginPage;
