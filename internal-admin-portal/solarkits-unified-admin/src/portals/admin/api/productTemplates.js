import axios from "axios";
import { authHeaderObj } from "@/app/authHeader";

const API_URL = import.meta.env.VITE_API_URL;

/**
 * Core Helpers
 */
const normalizeResponse = (res) => {
  if (!res?.data) {
    return { status: "error", message: "Unexpected server response", data: null, errors: [] };
  }
  return {
    status: res.data.status,
    message: res.data.message || "",
    data: res.data.data ?? null,
    errors: res.data.errors || [],
  };
};

const handleError = (error) => {
  const data = error?.response?.data || {};
  return {
    status: "error",
    message: data.message || error.message || "Request failed",
    data: null,
    errors: data.errors || []
  };
};

/**
 * Reusable Request Handler
 */
export const apiRequest = async (method, endpoint, uniqueId, reqFor, { payload = null, params = {} } = {}) => {
  try {
    const response = await axios({
      method,
      url: `${API_URL}${endpoint}`,
      headers: authHeaderObj(),
      params: {
        unique_id: uniqueId,
        req_for: reqFor,
        ...params,
      },
      data: payload,
    });
    return normalizeResponse(response);
  } catch (error) {
    return handleError(error);
  }
};

/**
 * PRODUCT TEMPLATES
 */
export const getTemplates = async (moduleUniqueId) => 
  await apiRequest("get", "/product-templates/get-templates", moduleUniqueId, "view");

export const getTemplatesByScope = async (subcategoryTypeId, moduleUniqueId) =>
  await apiRequest("get", "/product-templates/get-templates-by-scope", moduleUniqueId, "view", {
    params: { subcategory_type_id: subcategoryTypeId }
  });

export const addTemplate = async (payload, moduleUniqueId) => 
  await apiRequest("post", "/product-templates/add-template", moduleUniqueId, "add", { payload });

export const updateTemplate = async (payload, moduleUniqueId) => 
  await apiRequest("put", "/product-templates/update-template", moduleUniqueId, "edit", { payload });

/**
 * SUBTYPES & SCOPES
 */
export const getSubtypes = async (templateId, moduleUniqueId) => 
  await apiRequest("get", "/product-templates/get-subtypes", moduleUniqueId, "view", { params: { template_id: templateId } });

export const addSubtype = async (payload, moduleUniqueId) => 
  await apiRequest("post", "/product-templates/add-subtype", moduleUniqueId, "add", { payload });

export const updateSubtype = async (payload, moduleUniqueId) => 
  await apiRequest("put", "/product-templates/update-subtype", moduleUniqueId, "edit", { payload });

export const getSubtypeScopes = async (templateId, moduleUniqueId) => 
  await apiRequest("get", "/product-templates/get-subtype-scope", moduleUniqueId, "view", { params: { template_id: templateId } });

export const addSubtypeScope = async (payload, moduleUniqueId) => 
  await apiRequest("post", "/product-templates/add-subtype-scope", moduleUniqueId, "add", { payload });

export const deleteSubtypeScope = async (payload, moduleUniqueId) => 
  await apiRequest("delete", "/product-templates/delete-subtype-scope", moduleUniqueId, "delete", { 
    payload, 
    params: { id: payload?.id } 
  });

/**
 * ATTRIBUTE GROUPS
 */
export const getAttributeGroups = async (templateId, moduleUniqueId) => 
  await apiRequest("get", "/product-templates/get-attribute-groups", moduleUniqueId, "view", { params: { template_id: templateId } });

export const addAttributeGroup = async (payload, moduleUniqueId) => 
  await apiRequest("post", "/product-templates/add-attribute-group", moduleUniqueId, "add", { payload });

export const updateAttributeGroup = async (payload, moduleUniqueId) => 
  await apiRequest("put", "/product-templates/update-attribute-group", moduleUniqueId, "edit", { payload });

/**
 * ATTRIBUTES & VALUES
 */
export const getAttributes = async (templateId, moduleUniqueId) => 
  await apiRequest("get", "/product-templates/get-attributes", moduleUniqueId, "view", { params: { template_id: templateId } });

export const addAttribute = async (payload, moduleUniqueId) => 
  await apiRequest("post", "/product-templates/add-attribute", moduleUniqueId, "add", { payload });

export const updateAttribute = async (payload, moduleUniqueId) => 
  await apiRequest("put", "/product-templates/update-attribute", moduleUniqueId, "edit", { payload });

export const getAttributeValues = async (attributeId, moduleUniqueId) => 
  await apiRequest("get", "/product-templates/get-attribute-values", moduleUniqueId, "view", { params: { attribute_id: attributeId } });

export const addAttributeValue = async (payload, moduleUniqueId) => 
  await apiRequest("post", "/product-templates/add-attribute-value", moduleUniqueId, "add", { payload });

export const updateAttributeValue = async (payload, moduleUniqueId) => 
  await apiRequest("put", "/product-templates/update-attribute-value", moduleUniqueId, "edit", { payload });

export const deleteAttributeValue = async (payload, moduleUniqueId) => 
  await apiRequest("delete", "/product-templates/delete-attribute-value", moduleUniqueId, "delete", { payload });

export const updateAttributeValuesOrder = async (payload, moduleUniqueId) => 
  await apiRequest("post", "/product-templates/update-attribute-values-order", moduleUniqueId, "add", { payload });

export const updateAttributesOrder = async (payload, moduleUniqueId) => 
  await apiRequest("post", "/product-templates/update-attributes-order", moduleUniqueId, "add", { payload });

export const updateAttributeGroupsOrder = async (payload, moduleUniqueId) => 
  await apiRequest("post", "/product-templates/update-attribute-groups-order", moduleUniqueId, "add", { payload });

/**
 * BRANDS
 */
export const getBrandsByTemplate = async (templateId, moduleUniqueId) => 
  await apiRequest("get", "/product-templates/get-brands-by-template", moduleUniqueId, "view", { params: { template_id: templateId } });

export const getBrandsByTemplateFlat = async (templateId, moduleUniqueId) => 
  await apiRequest("get", "/product-templates/get-brands-by-template-flat", moduleUniqueId, "view", { params: { template_id: templateId } });

export const getBrandsBySubtype = async (subtypeId, moduleUniqueId) => 
  await apiRequest("get", "/product-templates/get-brands-by-subtype", moduleUniqueId, "view", { params: { subtype_id: subtypeId } });

export const getAllBrands = async (moduleUniqueId) => 
  await apiRequest("get", "/brand-manufacturer/get-brands-with-logo-name-only", moduleUniqueId, "view");

export const mapBrandTemplate = async (payload, moduleUniqueId) => 
  await apiRequest("post", "/product-templates/map-brand-template", moduleUniqueId, "add", { payload });

export const deleteBrandMapping = async (payload, moduleUniqueId) => 
  await apiRequest("delete", "/product-templates/delete-brand-mapping", moduleUniqueId, "delete", { 
    payload, 
    params: { id: payload?.id } 
  });

/**
 * MISCELLANEOUS (PROJECT TYPES & UNITS)
 */
export const getProjectHierarchy = async (moduleUniqueId) => 
  await apiRequest("get", "/project-types/get-all-hierarchy", moduleUniqueId, "view");

export const getUnitGroups = async (moduleUniqueId) => 
  await apiRequest("get", "/units/groups", moduleUniqueId, "view");

export const getUnits = async (groupId, moduleUniqueId) => {
  const params = groupId ? { group_id: groupId } : {};
  return await apiRequest("get", "/units/", moduleUniqueId, "view", { params });
};
