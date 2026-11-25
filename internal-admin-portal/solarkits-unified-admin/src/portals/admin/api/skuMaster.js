import { apiRequest } from "./productTemplates";

// API Call: GET /products/get-products - Fetch products by template and subtype
export const getProducts = (templateId, subtypeId, moduleUniqueId) => 
  apiRequest("get", "/products/get-products", moduleUniqueId, "view", { params: { template_id: templateId, subtype_id: subtypeId } });

// API Call: GET /products/get-skus-by-product - Fetch SKUs by product ID
export const getSkusByProduct = (productId, moduleUniqueId) => 
  apiRequest("get", "/products/get-skus-by-product", moduleUniqueId, "view", { params: { product_id: productId } });

// API Call: DELETE /products/delete-product - Delete a product
export const deleteProduct = (payload, moduleUniqueId) => 
  apiRequest("delete", "/products/delete-product", moduleUniqueId, "delete", { payload });

// API Call: DELETE /products/delete-sku - Delete a SKU
export const deleteSku = (payload, moduleUniqueId) => 
  apiRequest("delete", "/products/delete-sku", moduleUniqueId, "delete", { payload });

// API Call: GET /products/search-skus - Search SKUs by search term
export const searchSkus = (term, moduleUniqueId) =>
  apiRequest("get", "/products/search-skus", moduleUniqueId, "view", { params: { term } });
