import axios from "axios";
import { supabase } from "./supabase";

const API_ORIGIN =
  (import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace(
    /\/+$/,
    "",
  ) || "https://api.bellytalkapp.com";

let refreshRequest: Promise<string | null> | null = null;

const clearAuthAndRedirectToLogin = () => {
  localStorage.removeItem("access_token");
  localStorage.removeItem("refresh_token");
  window.location.assign("/login");
};

const refreshAccessToken = async (): Promise<string | null> => {
  if (refreshRequest) {
    return refreshRequest;
  }

  refreshRequest = (async () => {
    const refreshToken = localStorage.getItem("refresh_token");
    const accessToken = localStorage.getItem("access_token") || "";

    if (!refreshToken) {
      return null;
    }

    const { data, error } = await supabase.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken,
    });

    if (error || !data.session?.access_token) {
      return null;
    }

    localStorage.setItem("access_token", data.session.access_token);
    if (data.session.refresh_token) {
      localStorage.setItem("refresh_token", data.session.refresh_token);
    }

    return data.session.access_token;
  })();

  try {
    return await refreshRequest;
  } finally {
    refreshRequest = null;
  }
};

const api = axios.create({
  baseURL: `${API_ORIGIN}/api`,
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
  async (error) => {
    if (error.response?.status === 401) {
      const requestUrl = error.config?.url || "";
      const pathname = window.location.pathname;

      // Login/register failures should stay on the page and show local error UI.
      const isAuthRequest =
        requestUrl.includes("/auth/login") ||
        requestUrl.includes("/auth/register") ||
        requestUrl.includes("/auth/refresh");

      const isOnAuthPage = pathname === "/login" || pathname === "/register";

      const originalRequest = error.config as
        | (typeof error.config & { _retry?: boolean })
        | undefined;

      if (
        !isAuthRequest &&
        !isOnAuthPage &&
        originalRequest &&
        !originalRequest._retry
      ) {
        originalRequest._retry = true;
        const newToken = await refreshAccessToken();

        if (newToken) {
          originalRequest.headers = {
            ...(originalRequest.headers || {}),
            Authorization: `Bearer ${newToken}`,
          };
          return api(originalRequest);
        }
      }

      if (!isAuthRequest && !isOnAuthPage) {
        clearAuthAndRedirectToLogin();
      }
    }
    return Promise.reject(error);
  },
);

export default api;
