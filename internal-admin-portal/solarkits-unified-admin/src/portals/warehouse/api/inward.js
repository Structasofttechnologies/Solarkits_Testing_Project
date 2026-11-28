import axios from "axios";
import { authHeaderObj } from "@/app/authHeader";

const API_URL = import.meta.env.VITE_API_URL;

export const getInwardActiveSkus = async (moduleUniqueId) => {
  const res = await axios.get(
    `${API_URL}/warehouse/inward/active-skus?unique_id=${moduleUniqueId}&req_for=view`,
    { headers: authHeaderObj() }
  );
  return res.data;
};

export const saveInward = async (data, moduleUniqueId) => {
  const res = await axios.post(
    `${API_URL}/warehouse/inward/save?unique_id=${moduleUniqueId}&req_for=add`,
    data,
    { headers: authHeaderObj() }
  );
  return res.data;
};

export const getInwardLogs = async (moduleUniqueId) => {
  const res = await axios.get(
    `${API_URL}/warehouse/inward/logs?unique_id=${moduleUniqueId}&req_for=view`,
    { headers: authHeaderObj() }
  );
  return res.data;
};

export const getInwardStockStatus = async (moduleUniqueId) => {
  const res = await axios.get(
    `${API_URL}/warehouse/inward/stock-status?unique_id=${moduleUniqueId}&req_for=view`,
    { headers: authHeaderObj() }
  );
  return res.data;
};

export const getWarehousePurchaseOrders = async (moduleUniqueId) => {
  const res = await axios.get(
    `${API_URL}/warehouse/inward/purchase-orders?unique_id=${moduleUniqueId}&req_for=view`,
    { headers: authHeaderObj() }
  );
  return res.data;
};

export const markPurchaseOrderDelivered = async (id, invoiceData, moduleUniqueId) => {
  const res = await axios.post(
    `${API_URL}/warehouse/inward/purchase-orders/${id}/deliver?unique_id=${moduleUniqueId}&req_for=add`,
    invoiceData,
    { headers: authHeaderObj() }
  );
  return res.data;
};

export const uploadTaxInvoice = async (file, moduleUniqueId) => {
  const formData = new FormData();
  formData.append("file", file);
  const res = await axios.post(
    `${API_URL}/warehouse/inward/upload-tax-invoice?unique_id=${moduleUniqueId}&req_for=add`,
    formData,
    {
      headers: {
        ...authHeaderObj(),
        "Content-Type": "multipart/form-data"
      }
    }
  );
  return res.data;
};

export const getSalesOrders = async () => {
  const res = await axios.get(
    `${API_URL}/warehouse/sales-orders`,
    { headers: authHeaderObj() }
  );
  return res.data;
};

export const deliverSalesOrder = async (id) => {
  const res = await axios.post(
    `${API_URL}/warehouse/sales-orders/${id}/deliver`,
    {},
    { headers: authHeaderObj() }
  );
  return res.data;
};

export const updateSalesOrderTracking = async (id, trackingData) => {
  const payload = typeof trackingData === 'string' ? { tracking_status: trackingData } : trackingData;
  const res = await axios.post(
    `${API_URL}/warehouse/sales-orders/${id}/tracking`,
    payload,
    { headers: authHeaderObj() }
  );
  return res.data;
};

export const createPoRequest = async (items) => {
  const res = await axios.post(
    `${API_URL}/warehouse/po-requests`,
    { items },
    { headers: authHeaderObj() }
  );
  return res.data;
};

export const getPoRequests = async (skuId = null) => {
  const url = skuId 
    ? `${API_URL}/warehouse/po-requests?sku_id=${skuId}`
    : `${API_URL}/warehouse/po-requests`;
  const res = await axios.get(url, { headers: authHeaderObj() });
  return res.data;
};

export const getOrderInwardFulfillment = async (warehouseId = null, moduleUniqueId = "WH_MAT_INWARD") => {
  let url = `${API_URL}/warehouse/inward/order-fulfillment?unique_id=${moduleUniqueId}&req_for=view`;
  if (warehouseId) url += `&warehouse_id=${warehouseId}`;
  const res = await axios.get(url, { headers: authHeaderObj() });
  return res.data;
};
