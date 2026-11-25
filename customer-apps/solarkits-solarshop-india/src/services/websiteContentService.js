import axios from "axios";

const getBaseUrl = () => {
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL.replace(/\/api\/?$/, "");
  }
  return import.meta.env.VITE_BACKEND_URL || "http://localhost:5000";
};

const API_BASE = getBaseUrl();

export const getWebsiteLandingContent = async () => {
  try {
    const res = await axios.get(`${API_BASE}/admin-api/website-content/public/solar-kits`);
    if (res && res.data && res.data.data) {
      return res.data.data.sections || res.data.data;
    }
  } catch (err) {
    console.warn("Could not load dynamic website content for SolarKits, using defaults:", err);
  }
  return null;
};
