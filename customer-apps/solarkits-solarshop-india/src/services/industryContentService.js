import axios from "axios";

const getBaseUrl = () => {
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL.replace(/\/api\/?$/, "");
  }
  return import.meta.env.VITE_BACKEND_URL || "http://localhost:5000";
};

const API_BASE = getBaseUrl();

/**
 * Fetch all active industry types
 */
export const getPublicIndustries = async () => {
  try {
    const res = await axios.get(`${API_BASE}/admin-api/industry-types/public/list`);
    if (res?.data?.status === "success" || res?.data?.success) {
      return res.data.data || [];
    }
  } catch (err) {
    console.warn("[industryContentService] Failed to load industry types:", err);
  }
  return [];
};

/**
 * Fetch published industry media & poster content
 * @param {Object} params - { industry_type_id, industry_slug, content_type, placement, search, sort, page, limit }
 */
export const getPublicIndustryContent = async (params = {}) => {
  try {
    const cleanParams = {};
    if (params.industry_type_id) cleanParams.industry_type_id = params.industry_type_id;
    if (params.industry_slug && params.industry_slug !== "all") cleanParams.industry_slug = params.industry_slug;
    if (params.content_type && params.content_type !== "ALL") cleanParams.content_type = params.content_type;
    if (params.placement) cleanParams.placement = params.placement;
    if (params.search) cleanParams.search = params.search;
    if (params.sort) cleanParams.sort = params.sort;
    if (params.page) cleanParams.page = params.page;
    if (params.limit) cleanParams.limit = params.limit;

    const res = await axios.get(`${API_BASE}/admin-api/industry-content/public/list`, {
      params: cleanParams,
    });

    if (res?.data?.status === "success" || res?.data?.success) {
      return {
        items: res.data.data || [],
        pagination: res.data.pagination || { total: 0, pages: 1, page: 1, limit: 100 },
      };
    }
  } catch (err) {
    console.warn("[industryContentService] Failed to load industry content:", err);
  }
  return { items: [], pagination: { total: 0, pages: 1, page: 1, limit: 100 } };
};

/**
 * Fetch public industry theme tokens (colors, button styles, default visual)
 */
export const getPublicIndustryTheme = async (industry_type_id) => {
  if (!industry_type_id) return null;
  try {
    const res = await axios.get(`${API_BASE}/admin-api/industry-themes/public/get`, {
      params: { industry_type_id },
    });
    if (res?.data?.status === "success" || res?.data?.success) {
      return res.data.data;
    }
  } catch (err) {
    console.warn("[industryContentService] Failed to load industry theme:", err);
  }
  return null;
};

/**
 * Track user interaction event (fire-and-forget)
 */
export const trackIndustryEvent = (payload) => {
  try {
    const data = JSON.stringify(payload);
    const url = `${API_BASE}/admin-api/industry-content/analytics/track`;
    if (navigator.sendBeacon) {
      const blob = new Blob([data], { type: "application/json" });
      navigator.sendBeacon(url, blob);
    } else {
      axios.post(url, payload).catch(() => {});
    }
  } catch (_) {
    // silent
  }
};
