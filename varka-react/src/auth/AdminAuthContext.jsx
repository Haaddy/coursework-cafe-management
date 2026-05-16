import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { API_BASE_URL } from "../constants/api";
import { adminFetch, clearAdminToken, getAdminToken, setAdminToken } from "../utils/adminApi";

const AdminAuthContext = createContext(null);

export function AdminAuthProvider({ children }) {
  const [manager, setManager] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  const refreshMe = async () => {
    const token = getAdminToken();
    if (!token) {
      setManager(null);
      setIsLoading(false);
      return null;
    }

    try {
      const res = await adminFetch("/admin/auth/me");
      if (!res.ok) {
        clearAdminToken();
        setManager(null);
        setIsLoading(false);
        return null;
      }
      const data = await res.json();
      setManager(data.manager || null);
      setIsLoading(false);
      return data.manager || null;
    } catch {
      clearAdminToken();
      setManager(null);
      setIsLoading(false);
      return null;
    }
  };

  useEffect(() => {
    refreshMe();
  }, []);

  const login = async (personalCode, password) => {
    const res = await fetch(`${API_BASE_URL}/admin/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ personalCode, password }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data?.error || "Login failed");
    }

    setAdminToken(data.token || "");
    setManager(data.manager || null);
    return data.manager || null;
  };

  const logout = async () => {
    try {
      await adminFetch("/admin/auth/logout", { method: "POST" });
    } catch {
      // best effort logout
    }
    clearAdminToken();
    setManager(null);
  };

  const value = useMemo(
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

export function useAdminAuth() {
  const context = useContext(AdminAuthContext);
  if (!context) {
    throw new Error("useAdminAuth must be used within AdminAuthProvider");
  }
  return context;
}
