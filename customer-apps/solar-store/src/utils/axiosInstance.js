/**
 * axiosInstance.js
 *
 * A pre-configured Axios instance that automatically handles:
 *  - Cookie-based auth (withCredentials: true)
 *  - Silent access-token refresh on 401 responses
 *  - Retry of the original failed request after a successful refresh
 *
 * NOTE: We intentionally do NOT redirect to /auth/login here.
 * Redirecting from the interceptor causes an infinite reload loop when
 * the user is on the login page (checkAuth → 401 → refresh fails → redirect
 * → reload → checkAuth → 401 → ...). Instead we just clear stale session
 * data and reject the error; the Redux auth slice sets isAuthenticated=false
 * and the app route guards handle showing the login UI.
 */

import axios from "axios";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

const axiosInstance = axios.create({
  baseURL: API_BASE,
  withCredentials: true, // always send cookies
});

// Helper getters for stored tokens
const getStoredAccessToken = () => {
  if (typeof window === 'undefined') return null;
  return (
    localStorage.getItem('access_token') ||
    sessionStorage.getItem('access_token') ||
    localStorage.getItem('token') ||
    sessionStorage.getItem('token') ||
    localStorage.getItem('epc_token')
  );
};

const getStoredRefreshToken = () => {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('refresh_token') || sessionStorage.getItem('refresh_token');
};

// ─── Request Interceptor ───────────────────────────────────────────────────
axiosInstance.interceptors.request.use(
  (config) => {
    const token = getStoredAccessToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Track whether a token refresh is already in flight so concurrent 401s
// don't all trigger their own refresh requests.
let isRefreshing = false;
let failedQueue = []; // [{ resolve, reject }]

const processQueue = (error) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve();
    }
  });
  failedQueue = [];
};

// ─── Response Interceptor ───────────────────────────────────────────────────
axiosInstance.interceptors.response.use(
  // Pass through successful responses unchanged
  (response) => response,

  async (error) => {
    const originalRequest = error.config;

    // Skip retry logic for:
    //  - Non-401 errors
    //  - Requests that have already been retried (_retry flag)
    //  - Auth endpoints (avoid infinite loops): refresh-token, login, me
    //  - Public endpoints: delivery-cost/calculate, stores, combo-kits, hierarchy
    const isAuthEndpoint =
      originalRequest.url?.includes("/auth/refresh-token") ||
      originalRequest.url?.includes("/auth/login") ||
      originalRequest.url?.includes("/auth/me") ||
      originalRequest.url?.includes("/delivery-cost/calculate") ||
      originalRequest.url?.includes("/inventory-status");

    if (
      error.response?.status === 401 &&
      !originalRequest._retry &&
      !isAuthEndpoint
    ) {
      const storedRefreshToken = getStoredRefreshToken();

      // If there is no refresh token at all, do not fire a guaranteed-to-fail refresh request
      if (!storedRefreshToken) {
        try {
          sessionStorage.removeItem("user");
          sessionStorage.removeItem("access_token");
          sessionStorage.removeItem("refresh_token");
          localStorage.removeItem("access_token");
          localStorage.removeItem("refresh_token");
        } catch (_) {}
        return Promise.reject(error);
      }

      if (isRefreshing) {
        // Another refresh is already in flight — queue this request
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then(() => axiosInstance(originalRequest))
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        // Attempt to get a new access_token using cookie or stored refresh_token
        const refreshResponse = await axios.post(
          `${API_BASE}/india/v1/auth/refresh-token`,
          { refreshToken: storedRefreshToken },
          { 
            withCredentials: true,
            headers: storedRefreshToken ? { 'x-refresh-token': storedRefreshToken } : {}
          }
        );

        if (refreshResponse.data?.accessToken) {
          if (localStorage.getItem('refresh_token')) {
            localStorage.setItem('access_token', refreshResponse.data.accessToken);
            if (refreshResponse.data.refreshToken) {
              localStorage.setItem('refresh_token', refreshResponse.data.refreshToken);
            }
          } else {
            sessionStorage.setItem('access_token', refreshResponse.data.accessToken);
            if (refreshResponse.data.refreshToken) {
              sessionStorage.setItem('refresh_token', refreshResponse.data.refreshToken);
            }
          }
        }

        // Refresh succeeded — flush the queue and retry the original request
        processQueue(null);
        return axiosInstance(originalRequest);
      } catch (refreshError) {
        // Refresh also failed — clear stale session data and reject.
        processQueue(refreshError);
        try {
          sessionStorage.removeItem("user");
          sessionStorage.removeItem("access_token");
          sessionStorage.removeItem("refresh_token");
          localStorage.removeItem("access_token");
          localStorage.removeItem("refresh_token");
        } catch (_) {}

        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

export default axiosInstance;
