import axios from 'axios';

const rawApiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

// Normalize: dynamically ensure it routes to the BDE API endpoint (/api/bde/v1)
const getApiBase = () => {
  const base = rawApiUrl.replace(/\/+$/, '');
  if (base.endsWith('/bde/v1') || base.endsWith('/bde')) {
    return base;
  }
  return `${base}/bde/v1`;
};

const API_BASE = getApiBase();

const api = axios.create({
  baseURL: API_BASE,
  withCredentials: true,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('bde_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const isLoginEndpoint = error.config?.url?.includes('/auth/login');
    if (error.response && error.response.status === 401 && !isLoginEndpoint) {
      // Clear token on 401 unauthorized
      localStorage.removeItem('bde_token');
      localStorage.removeItem('bde_user');
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;
