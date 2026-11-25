import axios from "axios";
import { authHeaderObj } from "@/app/authHeader";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/admin-api";

// Helper to build admin URL
const buildUrl = (path, moduleUniqueId = "ADM_WEBSITE_CONFIG", reqFor = "view") => {
  const separator = path.includes("?") ? "&" : "?";
  const uniqueIdParam = `unique_id=${moduleUniqueId}`;
  const reqForParam = reqFor ? `&req_for=${reqFor}` : "";
  
  // Prevent duplicate /admin-api if API_URL already includes it
  let base = API_URL.replace(/\/$/, "");
  let cleanPath = path;
  if (base.endsWith("/admin-api") && cleanPath.startsWith("/admin-api/")) {
    cleanPath = cleanPath.replace("/admin-api", "");
  }
  if (!cleanPath.startsWith("/")) cleanPath = "/" + cleanPath;
  
  return `${base}${cleanPath}${separator}${uniqueIdParam}${reqForParam}`;
};

export const getWebsiteContent = async (websiteKey = "franchise") => {
  const res = await axios.get(
    buildUrl(`/website-content/${websiteKey}`, "ADM_WEBSITE_CONFIG", "view"),
    { headers: authHeaderObj() }
  );
  return res.data;
};

export const updateWebsiteContent = async (websiteKey = "franchise", sections = {}) => {
  const res = await axios.put(
    buildUrl(`/website-content/${websiteKey}`, "ADM_WEBSITE_CONFIG", "edit"),
    { sections },
    { headers: authHeaderObj() }
  );
  return res.data;
};

export const resetWebsiteContent = async (websiteKey = "franchise") => {
  const res = await axios.post(
    buildUrl(`/website-content/${websiteKey}/reset`, "ADM_WEBSITE_CONFIG", "edit"),
    {},
    { headers: authHeaderObj() }
  );
  return res.data;
};

export const uploadWebsiteImage = async (formData) => {
  const res = await axios.post(
    buildUrl(`/website-content/upload-image`, "ADM_WEBSITE_CONFIG", "edit"),
    formData,
    {
      headers: {
        ...authHeaderObj(),
        "Content-Type": "multipart/form-data",
      },
    }
  );
  return res.data;
};
