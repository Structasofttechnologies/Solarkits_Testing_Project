import axios from "axios";
import { authHeaderObj } from "@/app/authHeader";

const API_URL = import.meta.env.VITE_API_URL;

export const createKit = async (data, moduleUniqueId) => {
    const res = await axios.post(`${API_URL}/solar-kits/create-kit?unique_id=${moduleUniqueId}&req_for=add`, data, { headers: authHeaderObj() });
    return res.data;
};

export const getKits = async (moduleUniqueId) => {
    const res = await axios.get(`${API_URL}/solar-kits/get-kits?unique_id=${moduleUniqueId}&req_for=view`, { headers: authHeaderObj() });
    return res.data;
};

export const updateKit = async (data, moduleUniqueId) => {
    const res = await axios.put(`${API_URL}/solar-kits/update-kit?unique_id=${moduleUniqueId}&req_for=edit`, data, { headers: authHeaderObj() });
    return res.data;
};

export const deleteKit = async (data, moduleUniqueId) => {
    const res = await axios.delete(`${API_URL}/solar-kits/delete-kit?unique_id=${moduleUniqueId}&req_for=delete`, { data, headers: authHeaderObj() });
    return res.data;
};
