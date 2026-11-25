import axios from "axios";
import { authHeaderObj } from "@/app/authHeader";

const API_URL = import.meta.env.VITE_API_URL;

export const getDeliveryOrders = async (params = {}) => {
  const queryParams = new URLSearchParams();
  Object.entries(params).forEach(([key, val]) => {
    if (val !== undefined && val !== null && val !== "") {
      queryParams.append(key, val);
    }
  });
  const res = await axios.get(`${API_URL}/warehouse/delivery-orders?${queryParams.toString()}`, {
    headers: authHeaderObj()
  });
  return res.data;
};

export const getDeliveryOrderById = async (id) => {
  const res = await axios.get(`${API_URL}/warehouse/delivery-orders/${id}`, {
    headers: authHeaderObj()
  });
  return res.data;
};

export const reserveDeliveryInventory = async (id, { sku, allocated_stock }) => {
  const res = await axios.post(`${API_URL}/warehouse/delivery-orders/${id}/reserve-inventory`, {
    sku,
    allocated_stock
  }, {
    headers: authHeaderObj()
  });
  return res.data;
};

export const requestDeliveryOrderProcurement = async (id, { sku, requested_qty, notes, items, kit_capacity, model_name, num_kits } = {}) => {
  const res = await axios.post(`${API_URL}/warehouse/delivery-orders/${id}/request-procurement`, {
    sku,
    requested_qty,
    notes,
    items,
    kit_capacity,
    model_name,
    num_kits
  }, {
    headers: authHeaderObj()
  });
  return res.data;
};

export const inwardDeliveryOrder = async (id, { items, remarks, batch_id, inward_type, inward_mode, scanned_serials, pickup_location_details }) => {
  const res = await axios.post(`${API_URL}/warehouse/delivery-orders/${id}/inward`, {
    items,
    remarks,
    batch_id,
    inward_type,
    inward_mode,
    scanned_serials,
    pickup_location_details
  }, {
    headers: authHeaderObj()
  });
  return res.data;
};

export const saveDeliveryTransportDetails = async (id, transportData) => {
  const res = await axios.post(`${API_URL}/warehouse/delivery-orders/${id}/transport-details`, transportData, {
    headers: authHeaderObj()
  });
  return res.data;
};

export const requestEwayBill = async (id) => {
  const res = await axios.post(`${API_URL}/warehouse/delivery-orders/${id}/request-eway-bill`, {}, {
    headers: authHeaderObj()
  });
  return res.data;
};

export const verifyEwayBill = async (id, ewayData = {}) => {
  const res = await axios.post(`${API_URL}/warehouse/delivery-orders/${id}/verify-eway-bill`, ewayData, {
    headers: authHeaderObj()
  });
  return res.data;
};

export const initiateDeliveryDispatch = async (id, { vehicle_rear_photo, docket_doc }) => {
  const res = await axios.post(`${API_URL}/warehouse/delivery-orders/${id}/initiate-dispatch`, {
    vehicle_rear_photo,
    docket_doc
  }, {
    headers: authHeaderObj()
  });
  return res.data;
};

export const sendDeliveryOtp = async (id) => {
  const res = await axios.post(`${API_URL}/warehouse/delivery-orders/${id}/send-otp`, {}, {
    headers: authHeaderObj()
  });
  return res.data;
};

export const verifyDeliveryOtp = async (id, { otp_code, receiver_name }) => {
  const res = await axios.post(`${API_URL}/warehouse/delivery-orders/${id}/verify-otp`, {
    otp_code,
    receiver_name
  }, {
    headers: authHeaderObj()
  });
  return res.data;
};

export const completeManualDelivery = async (id, { destination_photo, remarks, receiver_name, delivery_datetime }) => {
  const res = await axios.post(`${API_URL}/warehouse/delivery-orders/${id}/complete-manual`, {
    destination_photo,
    remarks,
    receiver_name,
    delivery_datetime
  }, {
    headers: authHeaderObj()
  });
  return res.data;
};

export const uploadDeliveryEvidence = async (file) => {
  const formData = new FormData();
  formData.append("file", file);
  const res = await axios.post(`${API_URL}/warehouse/delivery-orders/upload-evidence`, formData, {
    headers: {
      ...authHeaderObj(),
      "Content-Type": "multipart/form-data"
    }
  });
  return res.data;
};

export const claimIncomingShipment = async (id, { dock_bay, remarks } = {}) => {
  const res = await axios.post(`${API_URL}/warehouse/delivery-orders/${id}/claim-incoming-shipment`, {
    dock_bay,
    remarks
  }, {
    headers: authHeaderObj()
  });
  return res.data;
};

export const sendOrderForDelivery = async (id) => {
  const res = await axios.post(`${API_URL}/warehouse/delivery-orders/${id}/send-for-delivery`, {}, {
    headers: authHeaderObj()
  });
  return res.data;
};

export const toggleUngroupOrder = async (id) => {
  const res = await axios.post(`${API_URL}/warehouse/delivery-orders/${id}/toggle-ungroup`, {}, {
    headers: authHeaderObj()
  });
  return res.data;
};

export const accountRemoveEpc = async (id, { epc_id, reason }) => {
  const res = await axios.post(`${API_URL}/warehouse/delivery-orders/${id}/account-remove-epc`, {
    epc_id,
    reason
  }, {
    headers: authHeaderObj()
  });
  return res.data;
};

export const verifyEpcPayment = async (id, { epc_id, payment_phase = 'second', status = 'done', amount }) => {
  const res = await axios.post(`${API_URL}/warehouse/delivery-orders/${id}/verify-epc-payment`, {
    epc_id,
    payment_phase,
    status,
    amount
  }, {
    headers: authHeaderObj()
  });
  return res.data;
};

export const dispatchOrderForDelivery = async (id, { vehicle_rear_photo, docket_doc, notes } = {}) => {
  const res = await axios.post(`${API_URL}/warehouse/delivery-orders/${id}/dispatch-for-delivery`, {
    vehicle_rear_photo,
    docket_doc,
    notes
  }, {
    headers: authHeaderObj()
  });
  return res.data;
};

export const recordInwardDiscrepancy = async (id, { sku, received_qty, damaged_qty, missing_qty, remarks, batch_id }) => {
  const res = await axios.post(`${API_URL}/warehouse/delivery-orders/${id}/inward-discrepancy`, {
    sku,
    received_qty,
    damaged_qty,
    missing_qty,
    remarks,
    batch_id
  }, {
    headers: authHeaderObj()
  });
  return res.data;
};

export const updateSupplyStatus = async (id, { sku, status, actual_date, notes }) => {
  const res = await axios.post(`${API_URL}/warehouse/delivery-orders/${id}/supply-status`, {
    sku,
    status,
    actual_date,
    notes
  }, {
    headers: authHeaderObj()
  });
  return res.data;
};

export const updateKitAssembly = async (id, { stage, kit_serial_barcode, notes }) => {
  const res = await axios.post(`${API_URL}/warehouse/delivery-orders/${id}/kit-assembly`, {
    stage,
    kit_serial_barcode,
    notes
  }, {
    headers: authHeaderObj()
  });
  return res.data;
};

export const allocatePreassembledKit = async (id, { kit_model_name, batch_code, notes } = {}) => {
  const res = await axios.post(`${API_URL}/warehouse/delivery-orders/${id}/allocate-preassembled-kit`, {
    kit_model_name,
    batch_code,
    notes
  }, {
    headers: authHeaderObj()
  });
  return res.data;
};

export const getBosKitCatalog = async () => {
  const res = await axios.get(`${API_URL}/warehouse/delivery-orders/bos-kit-catalog`, {
    headers: authHeaderObj()
  });
  return res.data;
};

export const getVehiclePresets = async () => {
  const res = await axios.get(`${API_URL}/warehouse/delivery-orders/vehicle-presets`, {
    headers: authHeaderObj()
  });
  return res.data;
};

export const getWarehouseDashboardOverview = async (params = {}) => {
  const queryParams = new URLSearchParams();
  Object.entries(params).forEach(([key, val]) => {
    if (val !== undefined && val !== null && val !== "") {
      queryParams.append(key, val);
    }
  });
  const res = await axios.get(`${API_URL}/warehouse/dashboard-overview?${queryParams.toString()}`, {
    headers: authHeaderObj()
  });
  return res.data;
};

export const updateWarehouseDashboardTaskStatus = async (taskId, { status, remarks } = {}) => {
  const res = await axios.post(`${API_URL}/warehouse/dashboard-tasks/${taskId}/status`, {
    status,
    remarks
  }, {
    headers: authHeaderObj()
  });
  return res.data;
};





