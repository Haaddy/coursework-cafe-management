import { Link } from "react-router-dom";
import { useNavigate } from "react-router-dom";
import { useAdminAuth } from "../../auth/AdminAuthContext";

function AdminSectionHeader({ title, subtitle, backTo = "/" }) {
  const navigate = useNavigate();
  const { logout } = useAdminAuth();

  const onLogout = async () => {
    await logout();
    navigate("/admin/login", { replace: true });
  };

  return (
    <header className="admin-section-header">
      <Link to={backTo} className="button button--secondary admin-section-header__back">
        Назад
      </Link>
      <div>
        <h2 className="admin-section-header__title">{title}</h2>
        <p className="admin-section-header__subtitle">{subtitle}</p>
      </div>
      <button type="button" className="button button--secondary" onClick={onLogout}>
        Выйти
      </button>
    </header>
  );
}

export default AdminSectionHeader;
