import axios from 'axios';
import { authHeaderObj } from '../../app/authHeader';

const ADMIN_API_BASE = import.meta.env.VITE_ADMIN_API_URL || import.meta.env.VITE_API_URL || 'http://localhost:5000/admin-api';

const reqConfig = (params = undefined) => ({
  params,
  headers: authHeaderObj(),
});

/**
 * Loads live GeoLevel1 States directly from MongoDB. Zero static lists.
 */
export async function fetchBulkUploadStates() {
  try {
    const res = await axios.get(`${ADMIN_API_BASE}/marketing/locations/states`, reqConfig());
    const rows = res.data?.data || res.data?.states || [];
    if (rows.length > 0) return rows;
  } catch (_) {
    // Try secondary EPC states endpoint if permission scoped
  }
  try {
    const res = await axios.get(`${ADMIN_API_BASE}/epcs/in/states`, reqConfig());
    const list = res.data?.states || res.data?.data || [];
    return list.map((s) => ({ _id: s.id || s._id, name: s.name }));
  } catch (_) {
    return [];
  }
}

/**
 * Loads cascading GeoLevel2 Districts directly from MongoDB for a given State.
 */
export async function fetchBulkUploadDistricts({ stateId, stateName }) {
  if (!stateId && !stateName) return [];
  try {
    const params = {};
    if (stateId) params.state_id = stateId;
    if (stateName) params.state_name = stateName;
    const res = await axios.get(`${ADMIN_API_BASE}/marketing/locations/districts`, reqConfig(params));
    return res.data?.data || [];
  } catch (_) {
    return [];
  }
}

/**
 * Loads cascading Franchisee Clusters directly from MongoDB for a given State.
 */
export async function fetchBulkUploadClusters({ stateId, stateName } = {}) {
  if (!stateId && !stateName) return [];
  try {
    const params = {};
    if (stateId) params.state_id = stateId;
    if (stateName) params.state_name = stateName;
    const res = await axios.get(`${ADMIN_API_BASE}/marketing/locations/clusters`, reqConfig(params));
    return res.data?.data || [];
  } catch (_) {
    return [];
  }
}

/**
 * Loads all active Franchisee Clusters across India from MongoDB for client-side District -> Cluster auto-preview.
 */
export async function fetchBulkUploadAllClusters() {
  try {
    const res = await axios.get(`${ADMIN_API_BASE}/marketing/locations/clusters`, reqConfig());
    return res.data?.data || [];
  } catch (_) {
    return [];
  }
}

/**
 * Loads active EPC Classification Types from MongoDB (/admin-api/epc-types/active).
 */
export async function fetchBulkUploadEpcTypes() {
  try {
    const res = await axios.get(`${ADMIN_API_BASE}/epc-types/active`, reqConfig());
    return res.data?.data || [];
  } catch (_) {
    return [];
  }
}

/**
 * Loads dynamic Lead Sources & Form Mappings from MongoDB.
 */
export async function fetchBulkUploadLeadSources() {
  try {
    const res = await axios.get(`${ADMIN_API_BASE}/marketing/lead-sources`, reqConfig());
    return res.data?.data || [];
  } catch (_) {
    return [];
  }
}
