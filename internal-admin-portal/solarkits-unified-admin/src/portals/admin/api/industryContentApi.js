import axios from "axios";
import { authHeaderObj } from "@/app/authHeader";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

// Helper to append unique_id and req_for for permission checking
const buildUrl = (path, moduleUniqueId, reqFor) => {
  const separator = path.includes("?") ? "&" : "?";
  const uniqueIdParam = moduleUniqueId ? `unique_id=${moduleUniqueId}` : "unique_id=ADM_INDUSTRY_CONTENT";
  const reqForParam = reqFor ? `&req_for=${reqFor}` : "";
  return `${API_URL}${path}${separator}${uniqueIdParam}${reqForParam}`;
};

// ── Industry Types API ────────────────────────────────────────────────────────
export const getIndustryTypes = async (params = {}, moduleUniqueId = "ADM_INDUSTRY_TYPES") => {
  const queryStr = new URLSearchParams(params).toString();
  const path = `/industry-types/list${queryStr ? `?${queryStr}` : ""}`;
  const res = await axios.get(buildUrl(path, moduleUniqueId, "view"), { headers: authHeaderObj() });
  return res.data;
};

export const createIndustryType = async (data, moduleUniqueId = "ADM_INDUSTRY_TYPES") => {
  const res = await axios.post(buildUrl("/industry-types/create", moduleUniqueId, "add"), data, {
    headers: authHeaderObj(),
  });
  return res.data;
};

export const updateIndustryType = async (data, moduleUniqueId = "ADM_INDUSTRY_TYPES") => {
  const res = await axios.put(buildUrl("/industry-types/update", moduleUniqueId, "edit"), data, {
    headers: authHeaderObj(),
  });
  return res.data;
};

export const toggleIndustryTypeStatus = async (data, moduleUniqueId = "ADM_INDUSTRY_TYPES") => {
  const res = await axios.put(buildUrl("/industry-types/toggle-status", moduleUniqueId, "edit"), data, {
    headers: authHeaderObj(),
  });
  return res.data;
};

export const deleteIndustryType = async (data, moduleUniqueId = "ADM_INDUSTRY_TYPES") => {
  const res = await axios.delete(buildUrl("/industry-types/delete", moduleUniqueId, "delete"), {
    data,
    headers: authHeaderObj(),
  });
  return res.data;
};

// ── User Industry Assignments ────────────────────────────────────────────────
export const assignUserToIndustry = async (data, moduleUniqueId = "ADM_INDUSTRY_TYPES") => {
  const res = await axios.post(buildUrl("/industry-types/user-assign", moduleUniqueId, "add"), data, {
    headers: authHeaderObj(),
  });
  return res.data;
};

export const revokeUserFromIndustry = async (data, moduleUniqueId = "ADM_INDUSTRY_TYPES") => {
  const res = await axios.post(buildUrl("/industry-types/user-revoke", moduleUniqueId, "edit"), data, {
    headers: authHeaderObj(),
  });
  return res.data;
};

export const getUserIndustryAssignments = async (params = {}, moduleUniqueId = "ADM_INDUSTRY_TYPES") => {
  const queryStr = new URLSearchParams(params).toString();
  const path = `/industry-types/user-assignments${queryStr ? `?${queryStr}` : ""}`;
  const res = await axios.get(buildUrl(path, moduleUniqueId, "view"), { headers: authHeaderObj() });
  return res.data;
};

// ── Industry Content CMS API ──────────────────────────────────────────────────
export const listIndustryContent = async (params = {}, moduleUniqueId = "ADM_INDUSTRY_CONTENT") => {
  const queryStr = new URLSearchParams(params).toString();
  const path = `/industry-content/list${queryStr ? `?${queryStr}` : ""}`;
  const res = await axios.get(buildUrl(path, moduleUniqueId, "view"), { headers: authHeaderObj() });
  return res.data;
};

export const getIndustryContentDetail = async (id, moduleUniqueId = "ADM_INDUSTRY_CONTENT") => {
  const res = await axios.get(buildUrl(`/industry-content/detail/${id}`, moduleUniqueId, "view"), {
    headers: authHeaderObj(),
  });
  return res.data;
};

export const createIndustryContent = async (data, moduleUniqueId = "ADM_INDUSTRY_CONTENT") => {
  const res = await axios.post(buildUrl("/industry-content/create", moduleUniqueId, "add"), data, {
    headers: authHeaderObj(),
  });
  return res.data;
};

export const updateIndustryContent = async (id, data, moduleUniqueId = "ADM_INDUSTRY_CONTENT") => {
  const res = await axios.put(buildUrl(`/industry-content/update/${id}`, moduleUniqueId, "edit"), data, {
    headers: authHeaderObj(),
  });
  return res.data;
};

export const uploadContentMedia = async (id, formData, moduleUniqueId = "ADM_INDUSTRY_CONTENT") => {
  const res = await axios.post(buildUrl(`/industry-content/upload-media/${id}`, moduleUniqueId, "edit"), formData, {
    headers: {
      ...authHeaderObj(),
      "Content-Type": "multipart/form-data",
    },
  });
  return res.data;
};

export const deleteContentMedia = async (mediaId, moduleUniqueId = "ADM_INDUSTRY_CONTENT") => {
  const res = await axios.delete(buildUrl(`/industry-content/delete-media/${mediaId}`, moduleUniqueId, "delete"), {
    headers: authHeaderObj(),
  });
  return res.data;
};

export const setContentIndustries = async (id, data, moduleUniqueId = "ADM_INDUSTRY_CONTENT") => {
  const ids = data.industry_ids || data.industry_type_ids || (Array.isArray(data) ? data : []);
  const payload = {
    industry_ids: ids,
    industry_type_ids: ids,
  };
  const res = await axios.post(buildUrl(`/industry-content/set-industries/${id}`, moduleUniqueId, "edit"), payload, {
    headers: authHeaderObj(),
  });
  return res.data;
};

export const publishContent = async (id, data = {}, moduleUniqueId = "ADM_INDUSTRY_CONTENT") => {
  const res = await axios.put(buildUrl(`/industry-content/publish/${id}`, moduleUniqueId, "edit"), data, {
    headers: authHeaderObj(),
  });
  return res.data;
};

export const unpublishContent = async (id, moduleUniqueId = "ADM_INDUSTRY_CONTENT") => {
  const res = await axios.put(buildUrl(`/industry-content/unpublish/${id}`, moduleUniqueId, "edit"), {}, {
    headers: authHeaderObj(),
  });
  return res.data;
};

export const scheduleContent = async (id, data, moduleUniqueId = "ADM_INDUSTRY_CONTENT") => {
  const res = await axios.put(buildUrl(`/industry-content/schedule/${id}`, moduleUniqueId, "edit"), data, {
    headers: authHeaderObj(),
  });
  return res.data;
};

export const archiveContent = async (id, moduleUniqueId = "ADM_INDUSTRY_CONTENT") => {
  const res = await axios.put(buildUrl(`/industry-content/archive/${id}`, moduleUniqueId, "edit"), {}, {
    headers: authHeaderObj(),
  });
  return res.data;
};

export const toggleActiveIndustryContent = async (id, moduleUniqueId = "ADM_INDUSTRY_CONTENT") => {
  const res = await axios.put(buildUrl(`/industry-content/toggle-active/${id}`, moduleUniqueId, "edit"), {}, {
    headers: authHeaderObj(),
  });
  return res.data;
};

export const duplicateIndustryContent = async (id, moduleUniqueId = "ADM_INDUSTRY_CONTENT") => {
  const res = await axios.post(buildUrl(`/industry-content/duplicate/${id}`, moduleUniqueId, "add"), {}, {
    headers: authHeaderObj(),
  });
  return res.data;
};

export const bulkActionIndustryContent = async (data, moduleUniqueId = "ADM_INDUSTRY_CONTENT") => {
  const res = await axios.post(buildUrl("/industry-content/bulk-action", moduleUniqueId, "edit"), data, {
    headers: authHeaderObj(),
  });
  return res.data;
};

export const previewContent = async (id, moduleUniqueId = "ADM_INDUSTRY_CONTENT") => {
  const res = await axios.get(buildUrl(`/industry-content/preview/${id}`, moduleUniqueId, "view"), {
    headers: authHeaderObj(),
  });
  return res.data;
};

// ── Industry Theme API ────────────────────────────────────────────────────────
export const getIndustryTheme = async (industryTypeId, moduleUniqueId = "ADM_INDUSTRY_CONTENT") => {
  const res = await axios.get(buildUrl(`/industry-themes/get?industry_type_id=${industryTypeId}`, moduleUniqueId, "view"), {
    headers: authHeaderObj(),
  });
  return res.data;
};

export const upsertIndustryTheme = async (data, moduleUniqueId = "ADM_INDUSTRY_CONTENT") => {
  const res = await axios.post(buildUrl("/industry-themes/upsert", moduleUniqueId, "edit"), data, {
    headers: authHeaderObj(),
  });
  return res.data;
};

export const deleteIndustryTheme = async (industryTypeId, moduleUniqueId = "ADM_INDUSTRY_CONTENT") => {
  const res = await axios.delete(buildUrl("/industry-themes/delete", moduleUniqueId, "edit"), {
    data: { industry_type_id: industryTypeId },
    headers: authHeaderObj(),
  });
  return res.data;
};

// ── Geo & Solar Kits for Content Targeting ──────────────────────────────────
export const getActiveStatesList = async () => {
  try {
    const res = await axios.get(`${API_URL}/geolocation/get-active-states`, { headers: authHeaderObj() });
    return res.data?.states || res.data?.data || [];
  } catch (_) {
    try {
      const res = await axios.get(`${API_URL}/geolocation/get-states`, { headers: authHeaderObj() });
      return res.data?.states || res.data?.data || [];
    } catch (_) {
      return [];
    }
  }
};

export const getDistrictsByState = async (stateId) => {
  if (!stateId) return [];
  try {
    const res = await axios.get(`${API_URL}/geolocation/get-districts?state_id=${stateId}`, { headers: authHeaderObj() });
    return res.data?.districts || res.data?.data || [];
  } catch (_) {
    return [];
  }
};

export const getProductConfigKits = async (moduleUniqueId = "ADM_SOLAR_KITS") => {
  try {
    const res = await axios.get(`${API_URL}/solar-kits/get-kits?unique_id=${moduleUniqueId}&req_for=view`, { headers: authHeaderObj() });
    return res.data?.data || res.data?.kits || res.data || [];
  } catch (_) {
    return [];
  }
};
