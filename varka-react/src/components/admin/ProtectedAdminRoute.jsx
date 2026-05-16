import { Navigate } from "react-router-dom";
import { useAdminAuth } from "../../auth/AdminAuthContext";

function ProtectedAdminRoute({ children }) {
  const { isLoading, isAuthenticated } = useAdminAuth();

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
