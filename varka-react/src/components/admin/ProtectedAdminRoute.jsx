import { Navigate } from "react-router-dom";
import { useAdminAuth } from "../../auth/AdminAuthContext";

function ProtectedAdminRoute({ children }) { // ! защита админ-маршрутов
  const { isLoading, isAuthenticated } = useAdminAuth(); // ! состояние авторизации

  if (isLoading) {
    return (
      <section className="admin-page">
        <p>Проверка доступа...</p>
      </section>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/admin/login" replace />;
  }

  return children;
}

export default ProtectedAdminRoute;
