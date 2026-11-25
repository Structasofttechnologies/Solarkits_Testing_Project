import api from "./api";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

export const getFranchiseLandingContent = async () => {
  try {
    const res = await api.get("/india/v1/reseller/landing-content");
    if (res && res.data && res.data.data) {
      return res.data.data;
    }
  } catch (err) {
    console.warn("Could not fetch landing content from API, using fallback:", err);
  }
  return null;
};
