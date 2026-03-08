import axios from "axios";
const api = axios.create({
  baseURL: "https://bellytalk.onrender.com/api",
  headers: {
    "Content-Type": "application/json",
  },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("access_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      const requestUrl = error.config?.url || "";
      const pathname = window.location.pathname;

      // Login/register failures should stay on the page and show local error UI.
      const isAuthRequest =
        requestUrl.includes("/auth/login") ||
        requestUrl.includes("/auth/register") ||
        requestUrl.includes("/auth/refresh");

      const isOnAuthPage = pathname === "/login" || pathname === "/register";

      if (!isAuthRequest && !isOnAuthPage) {
        localStorage.removeItem("access_token");
        localStorage.removeItem("refresh_token");
        window.location.assign("/login");
      }
    }
    return Promise.reject(error);
  },
);

export default api;
