import axios from "axios";
import { authHeaderObj } from "@/app/authHeader";
import { apiRequest } from "./productTemplates";

const API_URL = import.meta.env.VITE_OPERATION_API_URL || import.meta.env.VITE_API_URL;

/**
 * GET /operations/sku-benchmark-info
 * Returns: { status, benchmark_price, currency_code, pending_request }
 * Note: backend does NOT nest result in .data, so we read res.data directly.
 */
export const getSkuBenchmarkInfo = async (skuId, warehouseId, moduleUniqueId) => {
  const res = await axios.get(`${API_URL}/operations/sku-benchmark-info`, {
    headers: authHeaderObj(),
    params: {
      unique_id: moduleUniqueId,
      req_for: "view",
      sku_id: skuId,
      warehouse_id: warehouseId,
    },
  });
  return res.data; // { status, benchmark_price, currency_code, pending_request }
};

/**
 * POST /operations/price-requests/create
 * Uses standard apiRequest (which wraps via normalizeResponse → .data field)
 */
export const createPriceRequest = (payload, moduleUniqueId) =>
  apiRequest("post", "/operations/price-requests/create", moduleUniqueId, "add", { payload });

/**
 * GET /operations/warehouse-stock-report
 * Returns stock levels, awaiting/overdue inwards, completed inwards, price difference checks
 */
export const getWarehouseStockReport = async (warehouseId = "") => {
  const res = await axios.get(`${API_URL}/operations/warehouse-stock-report`, {
    headers: authHeaderObj(),
    params: {
      warehouseId
    }
  });
  return res.data;
};
