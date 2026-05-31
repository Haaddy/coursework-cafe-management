import { API_BASE_URL } from "../constants/api";

export const ADMIN_TOKEN_KEY = "adminToken";

export function getAdminToken() { // ! получение токена
  return localStorage.getItem(ADMIN_TOKEN_KEY) || "";
}

export function setAdminToken(token) { // ! установка токена
  localStorage.setItem(ADMIN_TOKEN_KEY, token);
}

export function clearAdminToken() { // ! удаление токена
  localStorage.removeItem(ADMIN_TOKEN_KEY);
}

export function adminFetch(path, options = {}) { // ! запрос к API
  const token = getAdminToken();
  const headers = new Headers(options.headers || {});
  if (token) { // ! если токен установлен
    headers.set("Authorization", `Bearer ${token}`);
  }

  return fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
  }).then((response) => {
    if (response.status === 401 && window.location.pathname.startsWith("/admin")) { // ! если токен не установлен
      clearAdminToken();
      window.location.assign("/admin/login");
    }
    return response; // ! возвращение ответа
  });
}
