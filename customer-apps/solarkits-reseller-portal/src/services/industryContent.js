/**
 * industryContent.js
 *
 * API service layer for Industry Content feature (Reseller Portal).
 * All requests use the existing `api` axios instance (Bearer token auto-attached).
 */

import api from './api';

// ── Industries ────────────────────────────────────────────────────────────────

/** Returns the reseller's approved industries */
export const getMyIndustries = () =>
  api.get('/india/v1/reseller/industry/my-industries');

/** Confirm selected industry (optional server-side persistence) */
export const selectIndustry = (industry_type_id) =>
  api.post('/india/v1/reseller/industry/select', { industry_type_id });

// ── Content ───────────────────────────────────────────────────────────────────

/**
 * Fetch published content for a given industry + optional placement filter.
 * @param {string} industry_type_id
 * @param {string|null} placement - e.g. 'DASHBOARD_TOP'
 */
export const getDashboardContent = (industry_type_id, placement = null) => {
  const params = { industry_type_id };
  if (placement) params.placement = placement;
  return api.get('/india/v1/reseller/industry/dashboard-content', { params });
};

/** Fetch industry-specific design theme */
export const getIndustryTheme = (industry_type_id) =>
  api.get('/india/v1/reseller/industry/theme', { params: { industry_type_id } });

/** Fetch related products for selected industry */
export const getRelatedProducts = (industry_type_id, page = 1, limit = 20) =>
  api.get('/india/v1/reseller/industry/related-products', { params: { industry_type_id, page, limit } });

// ── Analytics (fire-and-forget) ───────────────────────────────────────────────

const BACKEND_BASE = (import.meta.env.VITE_API_URL || 'http://localhost:5000').replace(/\/api\/?$/, '');
const ADMIN_API_BASE = import.meta.env.VITE_ADMIN_API_URL || `${BACKEND_BASE}/admin-api`;

/**
 * Track content interaction event. Silently fails if request errors.
 * @param {object} payload - { content_id, industry_type_id, event_type, placement, device_type }
 */
export const trackContentEvent = (payload) => {
  // Fire-and-forget — use navigator.sendBeacon if available for better reliability
  try {
    const data = JSON.stringify(payload);
    if (navigator.sendBeacon) {
      const blob = new Blob([data], { type: 'application/json' });
      navigator.sendBeacon(`${ADMIN_API_BASE}/industry-content/analytics/track`, blob);
    } else {
      api.post(`${ADMIN_API_BASE}/industry-content/analytics/track`, payload).catch(() => {});
    }
  } catch (_) { /* silent */ }
};
