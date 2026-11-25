import { apiRequest } from "./productTemplates";

export const getProducts = (templateId, subtypeId, moduleUniqueId) => 
  apiRequest("get", "/products/get-products", moduleUniqueId, "view", { params: { template_id: templateId, subtype_id: subtypeId } });

export const getSkusByProduct = (productId, moduleUniqueId) => 
  apiRequest("get", "/products/get-skus-by-product", moduleUniqueId, "view", { params: { product_id: productId } });

export const deleteProduct = (payload, moduleUniqueId) => 
  apiRequest("delete", "/products/delete-product", moduleUniqueId, "delete", { payload });

export const deleteSku = (payload, moduleUniqueId) => 
  apiRequest("delete", "/products/delete-sku", moduleUniqueId, "delete", { payload });

export const searchSkus = (term, moduleUniqueId) =>
  apiRequest("get", "/products/search-skus", moduleUniqueId, "view", { params: { term } });
