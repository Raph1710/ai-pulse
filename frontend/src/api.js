const BASE = import.meta.env.VITE_API_URL || "http://localhost:8000";

export function getToken() {
  return sessionStorage.getItem("token") || localStorage.getItem("token");
}

export function setToken(t) {
  if (t) {
    sessionStorage.setItem("token", t);
    localStorage.removeItem("token"); // Clean up shared localStorage to prevent cross-tab contamination
  } else {
    sessionStorage.removeItem("token");
    localStorage.removeItem("token");
  }
}

export async function api(path, options = {}) {
  const token = getToken();
  const res = await fetch(BASE + path, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.detail || "Request failed");
  return data;
}
