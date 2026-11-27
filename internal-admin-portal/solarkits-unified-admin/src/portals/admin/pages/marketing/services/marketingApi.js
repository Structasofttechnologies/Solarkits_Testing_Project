import axios from 'axios';
import { getAuthToken } from '../../../app/authHeader';

const rawAdminBase =
  import.meta.env.VITE_ADMIN_API_URL ||
  import.meta.env.VITE_API_URL ||
  'http://localhost:5000/admin-api';

export const ADMIN_API_BASE = String(rawAdminBase).replace(/\/+$/, '');
export const MARKETING_API_BASE = `${ADMIN_API_BASE}/marketing`;

const rawBackendBase =
  import.meta.env.VITE_BACKEND_URL ||
  ADMIN_API_BASE.replace(/\/(admin-api|api\/admin-api|api)$/i, '') ||
  'http://localhost:5000';

export const BACKEND_PUBLIC_BASE = String(rawBackendBase).replace(/\/+$/, '');

export function buildShortTrackingUrl(shortCode) {
  return `${BACKEND_PUBLIC_BASE}/api/marketing/t/${shortCode}`;
}

export function buildUnsubscribePreviewUrl(email = 'partner@example.com') {
  return `${BACKEND_PUBLIC_BASE}/api/marketing/unsubscribe?email=${encodeURIComponent(email)}`;
}

export const marketingHttp = axios.create({
  baseURL: MARKETING_API_BASE,
  timeout: 30000
});

marketingHttp.interceptors.request.use((config) => {
  const token = getAuthToken();
  if (token) {
    config.headers = config.headers || {};
    config.headers.Authorization = token;
  }
  return config;
});

export function extractApiError(err, fallback = 'Request failed') {
  return (
    err?.response?.data?.error ||
    err?.response?.data?.message ||
    err?.message ||
    fallback
  );
}
