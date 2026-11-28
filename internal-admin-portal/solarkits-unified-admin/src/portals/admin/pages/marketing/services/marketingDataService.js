import axios from 'axios';
import { authHeaderObj } from '../../../app/authHeader';
import { getAdminApiBaseUrl } from '../../../utils/resolveApiUrl';
import { marketingHttp } from './marketingApi';

export const API_BASE_URL = getAdminApiBaseUrl();

// ── 1. Unified Campaign Objectives ──────────────────────────────────────
export const CAMPAIGN_OBJECTIVES = [
  { id: 'seasonal_coupon', label: 'Discount Coupon & Promotional Offer', name: 'Discount Coupon & Promotional Offer', kpi: 'Coupons redeemed, kit orders', desc: 'Distribute discount coupon vouchers for eligible solar kits' },
  { id: 'sales', label: 'Kit Sales & Repeat Orders', name: 'Kit Sales & Repeat Orders', kpi: 'Kits sold, sales revenue', desc: 'Direct commercial kit sales & bulk orders' },
  { id: 'govt_tender_promotion', label: 'Government & PSU Tender Kits Promotion', name: 'Government & PSU Tender Kits Promotion', kpi: 'Tender kit inquiries, state bids', desc: 'Promote state-specific approved Government & PSU tender solar kits to regional EPC contractors' },
  { id: 'lead_generation', label: 'Lead Generation & Bulk Inquiries', name: 'Lead Generation & Bulk Inquiries', kpi: 'Qualified leads, quotes', desc: 'Capture new EPC commercial bulk kit inquiries' },
  { id: 'epc_onboarding', label: 'EPC Onboarding & KYC Verification Drive', name: 'EPC Onboarding & KYC Verification Drive', kpi: 'KYC verified EPCs', desc: 'Accelerate GST & EPC onboarding verifications' },
  { id: 'store_visits', label: 'Franchisee Store Visits', name: 'Franchisee Store Visits', kpi: 'Verified check-ins', desc: 'Drive local EPC traffic to regional franchise depots' },
  { id: 'product_promotion', label: 'Product Promotion & Awareness', name: 'Product Promotion & Awareness', kpi: 'Product page views', desc: 'Highlight TopCon bifacial & hybrid string inverters' },
  { id: 'add_to_cart', label: 'Add to Cart & Quotation Push', name: 'Add to Cart & Quotation Push', kpi: 'Carts & quote requests', desc: 'Follow up with ready buyers to confirm kit orders' },
  { id: 'epc_activation', label: 'Inactive EPC Reactivation', name: 'Inactive EPC Reactivation', kpi: 'Reactivated buyers', desc: 'Re-engage EPCs who have not ordered recently' }
];

let resourcesCache = null;
let resourcesFetchedAt = 0;

/**
 * Load all dynamic master resources (states, clusters, warehouses, kits, industries, epcTypes, owners, coupons)
 * directly from MongoDB via `/admin-api/marketing/resources`.
 */
export async function fetchMarketingMasterResources(forceRefresh = false) {
  if (!forceRefresh && resourcesCache && Date.now() - resourcesFetchedAt < 30000) {
    return resourcesCache;
  }
  const res = await marketingHttp.get('/resources');
  if (res.data?.success && res.data?.data) {
    resourcesCache = res.data.data;
    resourcesFetchedAt = Date.now();
    return resourcesCache;
  }
  return {
    states: [],
    districts: [],
    clusters: [],
    warehouses: [],
    kits: [],
    industries: [],
    epcTypes: [],
    owners: [],
    coupons: []
  };
}

export async function fetchLiveActiveStates(forceRefresh = false) {
  try {
    const data = await fetchMarketingMasterResources(forceRefresh);
    return (data.states || []).map((s) => ({
      _id: String(s._id || s.id),
      id: String(s._id || s.id),
      name: s.name
    }));
  } catch (err) {
    console.error('[marketingDataService] Failed to fetch active states:', err.message);
    return [];
  }
}

export async function fetchLiveGovtTenderConfigs() {
  try {
    const authHeaders = authHeaderObj();
    const res = await axios.get(
      `${API_BASE_URL}/govt-tender-configs?status=active&limit=100&unique_id=ADM_COMBO_KITS&req_for=view`,
      {
        headers: authHeaders,
        timeout: 15000
      }
    );
    if (res.data?.status === 'success' && Array.isArray(res.data.data)) {
      return res.data.data;
    }
    return [];
  } catch (err) {
    console.warn('Failed to fetch live govt tender configs:', err.message);
    return [];
  }
}

export async function fetchLiveClusters(forceRefresh = false) {
  try {
    const data = await fetchMarketingMasterResources(forceRefresh);
    return (data.clusters || []).map((c) => ({
      _id: String(c._id || c.id),
      id: String(c._id || c.id),
      cluster_name: c.cluster_name,
      name: c.cluster_name,
      cluster_code: c.cluster_code,
      code: c.cluster_code,
      state_id: c.state_id ? String(c.state_id) : null,
      state_name: c.state_name || '',
      state: c.state_name || '',
      district_ids: c.district_ids || [],
      districts: c.district_names || [],
      status: c.status || 'available'
    }));
  } catch (err) {
    console.error('[marketingDataService] Failed to fetch clusters:', err.message);
    return [];
  }
}

export async function fetchLiveWarehouses(forceRefresh = false) {
  try {
    const data = await fetchMarketingMasterResources(forceRefresh);
    return (data.warehouses || []).map((w) => ({
      _id: String(w._id || w.id),
      id: String(w._id || w.id),
      warehouse_name: w.warehouse_name || w.warehouse_code,
      name: w.warehouse_name || w.warehouse_code,
      warehouse_code: w.warehouse_code,
      code: w.warehouse_code,
      warehouse_type: w.warehouse_type || 'company',
      partner_type: w.warehouse_type === '3pl' ? '3PL PARTNER' : 'COMPANY OWNED',
      state_id: w.level_1 ? String(w.level_1) : null,
      state_name: w.state_name || '',
      state: w.state_name || '',
      clusters: w.clusters || [],
      address: w.address || '',
      status: w.status_code || 'active'
    }));
  } catch (err) {
    console.error('[marketingDataService] Failed to fetch warehouses:', err.message);
    return [];
  }
}

export async function fetchLiveAudiencePreview(params = {}) {
  try {
    const res = await marketingHttp.post('/audience/preview', params);
    return res.data?.success ? res.data.data : null;
  } catch (err) {
    console.warn('[marketingDataService] Failed to fetch live audience preview:', err.message);
    return null;
  }
}

export async function fetchLiveComboKits(forceRefresh = false) {
  try {
    const data = await fetchMarketingMasterResources(forceRefresh);
    return (data.kits || []).map((k) => {
      const id = String(k._id || k.id);
      const price = Number(k.selling_price_cached || k.base_price_cached || 0);
      const looseList = Array.isArray(k.loose_order_quantities) ? k.loose_order_quantities : [];
      const orderList = Array.isArray(k.order_quantities) ? k.order_quantities : [];
      const moq = Number(looseList[0] || orderList[0] || 1);
      return {
        ...k,
        id,
        _id: id,
        name: k.name || 'Solar Combo Kit',
        kit_name: k.name || 'Solar Combo Kit',
        sub_title: k.description || `${k.capacity || ''} kW Solar Kit`.trim(),
        capacity: k.capacity || 0,
        state_id: k.state_id ? String(k.state_id) : null,
        cluster_id: k.cluster_id ? String(k.cluster_id) : null,
        warehouse_id: k.warehouse_id ? String(k.warehouse_id) : null,
        base_price: price,
        defaultPrice: price,
        price,
        moq,
        loose_order_quantities: looseList,
        po_order_quantities: orderList,
        allow_trial_kit: Boolean(k.allow_trial_kit),
        kit_image: k.kit_image || '',
        image: k.kit_image || '',
        available_photos: Array.isArray(k.available_photos) ? k.available_photos : [],
        base_components_details: Array.isArray(k.base_components_details) ? k.base_components_details : [],
        bos_kits_details: Array.isArray(k.bos_kits_details) ? k.bos_kits_details : []
      };
    });
  } catch (err) {
    console.error('[marketingDataService] Failed to fetch combo kits:', err.message);
    return [];
  }
}

export function fetchAreaKits(warehouseIds = [], catalog = []) {
  const list = Array.isArray(catalog) ? catalog : [];
  if (!Array.isArray(warehouseIds) || warehouseIds.length === 0) {
    return list;
  }
  const matching = list.filter((k) => k.warehouse_id && warehouseIds.includes(String(k.warehouse_id)));
  return matching.length > 0 ? matching : list;
}

export async function fetchLiveOwners(forceRefresh = false) {
  try {
    const data = await fetchMarketingMasterResources(forceRefresh);
    return data.owners || [];
  } catch (err) {
    console.error('[marketingDataService] Failed to fetch owners:', err.message);
    return [];
  }
}

export async function fetchLiveIndustries(forceRefresh = false) {
  try {
    const data = await fetchMarketingMasterResources(forceRefresh);
    return data.industries || [];
  } catch (err) {
    console.error('[marketingDataService] Failed to fetch industries:', err.message);
    return [];
  }
}

export async function fetchLiveEpcTypes(forceRefresh = false) {
  try {
    const data = await fetchMarketingMasterResources(forceRefresh);
    return data.epcTypes || [];
  } catch (err) {
    console.error('[marketingDataService] Failed to fetch EPC types:', err.message);
    return [];
  }
}

export async function fetchLiveQueueStatus() {
  try {
    const res = await marketingHttp.get('/queue/status');
    return res.data?.queue || null;
  } catch {
    return null;
  }
}

// ── Live MongoDB Coupons (OfferMaster) ──
export async function fetchLiveCoupons() {
  const res = await marketingHttp.get('/coupons');
  return res.data?.data || [];
}

export async function createLiveCoupon(payload) {
  const res = await marketingHttp.post('/coupons', payload);
  return res.data?.data;
}

export async function updateLiveCoupon(id, payload) {
  const res = await marketingHttp.put(`/coupons/${id}`, payload);
  return res.data?.data;
}

export async function toggleLiveCoupon(id) {
  const res = await marketingHttp.patch(`/coupons/${id}/toggle`);
  return res.data?.data;
}

export async function deleteLiveCoupon(id) {
  const res = await marketingHttp.delete(`/coupons/${id}`);
  return res.data;
}

// ── Live Filter-Based Audience Segments (/audience/segments) ──
export async function fetchAudienceSegments() {
  const res = await marketingHttp.get('/audience/segments');
  return res.data?.data || [];
}

export async function createAudienceSegment(payload) {
  const res = await marketingHttp.post('/audience/segments', payload);
  return res.data?.data;
}

export async function updateAudienceSegment(id, payload) {
  const res = await marketingHttp.put(`/audience/segments/${id}`, payload);
  return res.data?.data;
}

export async function deleteAudienceSegment(id) {
  const res = await marketingHttp.delete(`/audience/segments/${id}`);
  return res.data;
}

// ── 9. Marketing Locations, Isolated Segment Groups & Campaign API Helpers ──
const marketingHeaders = () => ({
  ...authHeaderObj(),
  'Content-Type': 'application/json'
});

export async function fetchMarketingStates() {
  const res = await axios.get(`${API_BASE_URL}/marketing/locations/states`, {
    headers: authHeaderObj()
  });
  return res.data?.data || [];
}

export async function fetchMarketingDistricts({ stateId = '', stateName = '' } = {}) {
  const params = {};
  if (stateId) params.state_id = stateId;
  if (stateName) params.state_name = stateName;
  const res = await axios.get(`${API_BASE_URL}/marketing/locations/districts`, {
    params,
    headers: authHeaderObj()
  });
  return res.data?.data || [];
}

export async function fetchSegments(params = {}) {
  const res = await axios.get(`${API_BASE_URL}/marketing/segments`, {
    params,
    headers: authHeaderObj()
  });
  return {
    segments: res.data?.data || [],
    purposes: res.data?.purposes || []
  };
}

export async function fetchMarketingClusters({ stateId = '', stateName = '' } = {}) {
  const params = {};
  if (stateId) params.state_id = stateId;
  if (stateName) params.state_name = stateName;
  const res = await axios.get(`${API_BASE_URL}/marketing/locations/clusters`, {
    params,
    headers: authHeaderObj()
  });
  return res.data?.data || [];
}

export async function fetchMarketingKits() {
  const res = await axios.get(`${API_BASE_URL}/marketing/kits`, {
    headers: authHeaderObj()
  });
  return res.data?.data || [];
}

export async function fetchSegmentTerritorySummary(params = {}) {
  const res = await axios.get(`${API_BASE_URL}/marketing/segments/territory-summary`, {
    params,
    headers: authHeaderObj()
  });
  return res.data;
}

export async function createSegment(payload) {
  const res = await axios.post(`${API_BASE_URL}/marketing/segments`, payload, {
    headers: marketingHeaders()
  });
  return res.data?.data;
}

export async function updateSegment(id, payload) {
  const res = await axios.put(`${API_BASE_URL}/marketing/segments/${id}`, payload, {
    headers: marketingHeaders()
  });
  return res.data?.data;
}

export async function deleteSegment(id) {
  const res = await axios.delete(`${API_BASE_URL}/marketing/segments/${id}`, {
    headers: authHeaderObj()
  });
  return res.data;
}

export async function fetchSegmentContacts(segmentId, params = {}) {
  const res = await axios.get(`${API_BASE_URL}/marketing/segments/${segmentId}/contacts`, {
    params,
    headers: authHeaderObj()
  });
  return res.data;
}

export async function uploadSegmentCsv(segmentId, payload) {
  const res = await axios.post(`${API_BASE_URL}/marketing/segments/${segmentId}/upload-csv`, payload, {
    headers: marketingHeaders()
  });
  return res.data;
}

export async function deleteSegmentContact(segmentId, contactId) {
  const res = await axios.delete(`${API_BASE_URL}/marketing/segments/${segmentId}/contacts/${contactId}`, {
    headers: authHeaderObj()
  });
  return res.data;
}

export async function clearSegmentContacts(segmentId, resetFields = true) {
  const res = await axios.delete(`${API_BASE_URL}/marketing/segments/${segmentId}/contacts`, {
    params: { reset_fields: resetFields ? 'true' : 'false' },
    headers: authHeaderObj()
  });
  return res.data;
}

export async function fetchSegmentAnalytics(params = {}) {
  const res = await axios.get(`${API_BASE_URL}/marketing/segments/analytics`, {
    params,
    headers: authHeaderObj()
  });
  return res.data?.data || res.data;
}

export async function fetchMarketingDashboardAnalytics(params = {}) {
  const res = await axios.get(`${API_BASE_URL}/marketing/analytics`, {
    params,
    headers: authHeaderObj()
  });
  return res.data?.data || res.data;
}

export async function fetchMarketingTerritoryMap(params = {}) {
  const res = await axios.get(`${API_BASE_URL}/marketing/territory-map`, {
    params,
    headers: authHeaderObj()
  });
  return res.data?.data || res.data;
}

export async function fetchMarketingCampaigns(params = {}) {
  const res = await axios.get(`${API_BASE_URL}/marketing/campaigns`, {
    params,
    headers: authHeaderObj()
  });
  return res.data?.data || [];
}

export async function syncVerifiedEpcsWithSegments(segmentId = null) {
  const res = await axios.post(
    `${API_BASE_URL}/marketing/segments/sync-verified-epcs`,
    segmentId ? { segment_id: segmentId } : {},
    { headers: marketingHeaders() }
  );
  return res.data;
}

export async function previewMarketingAudience(payload) {
  const res = await axios.post(`${API_BASE_URL}/marketing/audience/preview`, payload, {
    headers: marketingHeaders()
  });
  return res.data?.data;
}

export async function createMarketingCampaign(payload) {
  const res = await axios.post(`${API_BASE_URL}/marketing/campaigns`, payload, {
    headers: marketingHeaders()
  });
  return res.data?.data;
}

export async function launchMarketingCampaign(campaignId) {
  const res = await axios.post(`${API_BASE_URL}/marketing/campaigns/${campaignId}/launch`, {}, {
    headers: marketingHeaders()
  });
  return res.data;
}

export async function fetchMarketingLeadSources() {
  const res = await marketingHttp.get('/lead-sources?scope=epc_leads');
  return Array.isArray(res.data?.data) ? res.data.data : [];
}
