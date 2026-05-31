import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { API_BASE_URL } from "../constants/api";
import { adminFetch, clearAdminToken, getAdminToken, setAdminToken } from "../utils/adminApi";

const AdminAuthContext = createContext(null); // ! контекст авторизации админки

export function AdminAuthProvider({ children }) { // ! провайдер контекста
  const [manager, setManager] = useState(null); // ! текущий менеджер
  const [isLoading, setIsLoading] = useState(true); // ! проверка сессии при старте

  const refreshMe = () => { // ! проверка токена через /admin/auth/me
    const token = getAdminToken();
    if (!token) { // ! если токен не установлен
      setManager(null);
      setIsLoading(false);
      return Promise.resolve(null);
    }

    return adminFetch("/admin/auth/me") // ! запрос к API
      .then((res) => {
        if (!res.ok) {
          clearAdminToken(); // ! удаление токена
          setManager(null);
          setIsLoading(false);
          return null;
        }
        return res.json().then((data) => {
          setManager(data.manager || null); // ! установка данных менеджера
          setIsLoading(false);
          return data.manager || null;
        });
      })
      .catch(() => {
        clearAdminToken(); // ! удаление токена
        setManager(null);
        setIsLoading(false);
        return null;
      });
  };

  useEffect(() => { // ! проверка сессии при монтировании
    refreshMe();
  }, []);

  const login = (personalCode, password) => { // ! вход в админку
    return fetch(`${API_BASE_URL}/admin/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ personalCode, password }),
    })
      .then((res) =>
        res.json().catch(() => ({})).then((data) => {
          if (!res.ok) {
            throw new Error(data?.error || "Login failed");
          }
          setAdminToken(data.token || ""); // ! сохранение токена
          setManager(data.manager || null);
          return data.manager || null;
        })
      );
  };

  const logout = () => { // ! выход из админки
    return adminFetch("/admin/auth/logout", { method: "POST" })
      .catch(() => {
        // best effort logout
      })
      .then(() => {
        clearAdminToken();
        setManager(null);
      });
  };

  const value = useMemo( // ! значение контекста
    () => ({
      manager,
      isLoading,
      isAuthenticated: Boolean(manager),
      login,
      logout,
      refreshMe,
    }),
    [manager, isLoading]
  );

  return <AdminAuthContext.Provider value={value}>{children}</AdminAuthContext.Provider>;
}

export function useAdminAuth() { // ! хук доступа к контексту авторизации
  const context = useContext(AdminAuthContext);
  if (!context) {
    throw new Error("useAdminAuth must be used within AdminAuthProvider");
  }
  return context;
}
