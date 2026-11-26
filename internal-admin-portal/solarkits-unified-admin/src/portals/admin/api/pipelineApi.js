import axios from 'axios';
import { authHeaderObj } from '@/app/authHeader';
import { getAdminApiBaseUrl } from '@/utils/resolveApiUrl';

const API_BASE = getAdminApiBaseUrl();

/**
 * Fetch solarshop connected pipeline status (checks Combo Kits pending Margin & Warehouse Activation)
 */
export const fetchPipelineStatus = async (country = 'india') => {
  try {
    const res = await axios.get(`${API_BASE}/solarshop/pipeline-status?country=${encodeURIComponent(country)}`, {
      headers: authHeaderObj(),
      timeout: 8000,
    });
    return res.data?.data || null;
  } catch (error) {
    console.warn('[pipelineApi] Pipeline status unavailable:', error.message || error);
    return null;
  }
};

/**
 * Fetch real-time movement and pending counts for all connected Solar Shop sidebar modules
 */
export const fetchSidebarCounts = async (country = 'india') => {
  try {
    const res = await axios.get(`${API_BASE}/solarshop/sidebar-counts?country=${encodeURIComponent(country)}`, {
      headers: authHeaderObj(),
      timeout: 8000,
    });
    return res.data?.data || null;
  } catch (error) {
    console.warn('[pipelineApi] Sidebar counts unavailable:', error.message || error);
    return null;
  }
};

