import { Link } from "react-router-dom";

function AdminSectionHeader({ title, subtitle, backTo = "/" }) {
  return (
    <header className="admin-section-header">
      <Link to={backTo} className="button button--secondary admin-section-header__back">
        Назад
      </Link>
      <div>
        <h2 className="admin-section-header__title">{title}</h2>
        <p className="admin-section-header__subtitle">{subtitle}</p>
      </div>
    </header>
  );
}

export default AdminSectionHeader;
