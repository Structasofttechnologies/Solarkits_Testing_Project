import axios from "axios";
import { authHeaderObj } from "@/app/authHeader";

const API_URL = import.meta.env.VITE_API_URL;

export const getVehicles = async () => {
  const res = await axios.get(
    `${API_URL}/warehouse/vehicles`,
    { headers: authHeaderObj() }
  );
  return res.data;
};

export const addVehicle = async (data) => {
  const res = await axios.post(
    `${API_URL}/warehouse/vehicles`,
    data,
    { headers: authHeaderObj() }
  );
  return res.data;
};

export const updateVehicle = async (id, data) => {
  const res = await axios.put(
    `${API_URL}/warehouse/vehicles/${id}`,
    data,
    { headers: authHeaderObj() }
  );
  return res.data;
};

export const deleteVehicle = async (id) => {
  const res = await axios.delete(
    `${API_URL}/warehouse/vehicles/${id}`,
    { headers: authHeaderObj() }
  );
  return res.data;
};

export const getDrivers = async () => {
  const res = await axios.get(
    `${API_URL}/warehouse/drivers`,
    { headers: authHeaderObj() }
  );
  return res.data;
};

export const addDriver = async (data) => {
  const res = await axios.post(
    `${API_URL}/warehouse/drivers`,
    data,
    { headers: authHeaderObj() }
  );
  return res.data;
};

export const updateDriver = async (id, data) => {
  const res = await axios.put(
    `${API_URL}/warehouse/drivers/${id}`,
    data,
    { headers: authHeaderObj() }
  );
  return res.data;
};

export const deleteDriver = async (id) => {
  const res = await axios.delete(
    `${API_URL}/warehouse/drivers/${id}`,
    { headers: authHeaderObj() }
  );
  return res.data;
};

export const compareVehicles = async () => {
  const res = await axios.get(
    `${API_URL}/warehouse/vehicles/compare`,
    { headers: authHeaderObj() }
  );
  return res.data;
};

export const recommendVehicleForOrder = async (orderId) => {
  const res = await axios.get(
    `${API_URL}/warehouse/vehicles/recommend-for-order?order_id=${orderId}`,
    { headers: authHeaderObj() }
  );
  return res.data;
};
