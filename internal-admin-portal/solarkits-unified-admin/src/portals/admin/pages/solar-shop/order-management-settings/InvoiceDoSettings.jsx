import React, { useState, useEffect, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import axios from 'axios';
import {
  FaFileInvoiceDollar,
  FaTruck,
  FaCalendarAlt,
  FaBuilding,
  FaSave,
  FaSyncAlt,
  FaShieldAlt,
  FaCheckCircle,
  FaInfoCircle,
  FaExclamationTriangle,
  FaGlobe,
  FaWarehouse,
  FaPlus,
  FaTrash,
  FaSlidersH,
  FaReceipt,
  FaBarcode,
  FaEye,
  FaPalette,
  FaStamp,
  FaSolarPanel,
  FaUniversity,
  FaCheck,
  FaTimes,
  FaArrowLeft,
  FaSearch,
  FaFilter,
  FaTag
} from 'react-icons/fa';
import { setAlert } from '@/features/alert.slice';
import Button from '@/components/Button';
import Loader from '@/components/Loader';
import CustomInput from '@/components/CustomInput';
import ToggleButton from '@/components/ToggleButton';
import { authHeaderObj } from '@/app/authHeader';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const INDIAN_STATES = [
  "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh", "Delhi NCR",
  "Goa", "Gujarat", "Haryana", "Himachal Pradesh", "Jammu and Kashmir", "Jharkhand",
  "Karnataka", "Kerala", "Madhya Pradesh", "Maharashtra", "Manipur", "Meghalaya",
  "Mizoram", "Nagaland", "Odisha", "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu",
  "Telangana", "Tripura", "Uttar Pradesh", "Uttarakhand", "West Bengal"
];

// Presets for Brand Colors
const COLOR_PRESETS = [
  { name: 'Slate Navy (Corporate)', hex: '#0f172a' },
  { name: 'Solar Orange (Signature)', hex: '#ea580c' },
  { name: 'Royal Blue (Executive)', hex: '#1e40af' },
  { name: 'Clean Emerald (Green Energy)', hex: '#047857' },
  { name: 'Charcoal Grey (Industrial)', hex: '#334155' },
  { name: 'Deep Purple (Premium)', hex: '#6b21a8' },
];

// Presets for Real Solar Kits in System
const SOLAR_KIT_PRESETS = [
  {
    id: 'kit-5kw-ongrid',
    name: 'SolarKits 5kW Commercial Tier-1 On-Grid System Kit',
    capacity_kw: 5,
    panel_brand: 'Waaree Energies 550W TOPCon Bifacial Modules (x9)',
    inverter_brand: 'Growatt 5kW 3-Phase Dual MPPT On-Grid Inverter',
    warranty_terms: '25 Yrs Panel Output Guarantee | 5 Yrs Inverter Warranty',
    structure_type: 'Pre-Galvanized Elevated HDG Structure with Wind Spec 150 km/h',
    bos_included: 'Dual Surge ACDB/DCDB, 4sqmm Solar DC Cable (50m), Chemical Earthing Rods',
    hsn_code: '85414300',
    base_rate: 185000,
    gst_rate: 12,
  },
  {
    id: 'kit-3kw-residential',
    name: 'SolarKits 3kW PM-Surya Ghar Residential Rooftop Kit',
    capacity_kw: 3,
    panel_brand: 'Adani Solar 580W Mono PERC High Efficiency Modules (x5)',
    inverter_brand: 'Havells 3kW Single Phase String Inverter',
    warranty_terms: '25 Yrs Panel Performance Warranty | 5 Yrs Inverter Replacement',
    structure_type: 'Standard Rooftop Non-Penetrating HDG Structure',
    bos_included: 'Solar DC Disconnect, Surge Arrester, ACDB Box, 4sqmm Cables',
    hsn_code: '85414300',
    base_rate: 125000,
    gst_rate: 12,
  },
  {
    id: 'kit-10kw-industrial',
    name: 'SolarKits 10kW Industrial Heavy-Duty Three-Phase Kit',
    capacity_kw: 10,
    panel_brand: 'Tata Power Solar 540W Mono PERC Modules (x19)',
    inverter_brand: 'Deye 10kW 3-Phase On-Grid Inverter with Remote WiFi Monitoring',
    warranty_terms: '25 Yrs Panel Performance | 5 Yrs Complete Inverter Protection',
    structure_type: 'High-Wind Elevated 1.5m Super Structure HDG',
    bos_included: 'Heavy Industrial ACDB/DCDB, Dual SPD Type II, Chemical Earth Compound',
    hsn_code: '85414300',
    base_rate: 345000,
    gst_rate: 12,
  },
];

export default function InvoiceDoSettings() {
  const dispatch = useDispatch();
  const token = useSelector((state) => state.auth?.token);

  const [activeTab, setActiveTab] = useState('invoice_template'); // 'invoice_template' | 'numbering' | 'timing' | 'do_settings' | 'scopes'
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Scope & Workspace State
  const [selectedScopeType, setSelectedScopeType] = useState('global'); // 'global' | 'warehouse'
  const [activeWarehouse, setActiveWarehouse] = useState(null); // specific warehouse being edited, or null for grid
  const [warehouses, setWarehouses] = useState([]);
  const [allScopeSettings, setAllScopeSettings] = useState([]);

  // Warehouse Hub Filters
  const [stateFilter, setStateFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL'); // 'ALL' | 'CONFIGURED' | 'BLOCKED'

  // Main Form Settings State
  const [formData, setFormData] = useState({
    scope_type: 'global',
    scope_id: null,
    scope_name: 'All India (Global Default)',

    // Invoice Numbering
    invoice_prefix: 'SK',
    invoice_suffix: '',
    financial_year_format: 'YYYY-YY',
    current_invoice_sequence: 1000,
    sequence_padding: 4,
    invoice_generation_trigger: 'warehouse_dispatch',
    allow_manual_regeneration: true,
    prevent_duplicate_numbers: true,

    // Company & GST Details
    company_name: 'SolarKits Energy Private Limited',
    trade_name: 'SolarKits India',
    gstin: '07AAAAA0000A1Z5',
    cin: 'U40106DL2026PTC123456',
    pan: 'AAAAA0000A',
    logo_url: '',
    billing_address: 'SolarKits Industrial Tech Hub, Sector 62, Noida, UP - 201301',
    state_name: 'Uttar Pradesh',
    state_code: '09',
    support_phone: '+91 98765 43210',
    support_email: 'billing@solarkits.com',

    // Authorized Signatory & Stamp
    signatory_name: 'Rahil Sunnovative',
    signatory_designation: 'Authorized Signatory & Finance Officer',
    signature_stamp_url: '',

    // Invoice Colors & Formatting
    brand_color: '#0f172a',
    accent_color: '#ea580c',
    invoice_header_title: 'TAX INVOICE',

    // Bank & Payment Details
    bank_name: 'HDFC Bank Ltd',
    bank_account_number: '50200012345678',
    bank_ifsc: 'HDFC0001234',
    bank_branch: 'Sector 62 Industrial Area, Noida',
    upi_id: 'solarkits@hdfcbank',

    // Solar Kit Line Itemization & System Specs
    kit_itemization_mode: 'kit_package', // 'kit_package' | 'detailed_bom'
    selected_preset_kit_id: 'kit-5kw-ongrid',
    kit_name: 'SolarKits 5kW Commercial Tier-1 On-Grid System Kit',
    kit_panel_brand: 'Waaree Energies 550W TOPCon Bifacial Modules (x9)',
    kit_inverter_brand: 'Growatt 5kW 3-Phase Dual MPPT On-Grid Inverter',
    kit_capacity_kw: 5,
    kit_base_rate: 185000,
    kit_gst_rate: 12,
    kit_hsn_code: '85414300',
    show_oem_brands: true,
    show_warranty_terms: true,
    show_hsn_code: true,
    show_component_specs: true,

    terms_and_conditions: [
      'Goods once sold and dispatched will be accepted back only in accordance with SolarKits Replacement Policy.',
      'All disputes are subject to local state/district jurisdiction.',
      'Warranty on solar modules, inverters, and BOS components is provided by the respective OEMs as per their terms.',
      'Interest @ 18% per annum will be charged on payments delayed beyond the agreed payment credit period.'
    ],

    // Delivery Order (DO) Settings
    do_prefix: 'DO',
    do_numbering_format: '{PREFIX}-{WH}-{YYMM}-{SEQ}',
    current_do_sequence: 100,
    do_sequence_padding: 4,
    auto_generate_do_on_payment: true,
    require_cluster_staff_assignment: true,
    prevent_duplicate_do: true,
  });

  const getHeaders = () => {
    const headers = authHeaderObj();
    if (!headers.Authorization && token) {
      headers.Authorization = token.startsWith('Bearer ') ? token : `Bearer ${token}`;
    }
    return headers;
  };

  // 1. Fetch REAL Live Warehouses from database (same official endpoint as Company Warehouses)
  const fetchWarehouses = async () => {
    try {
      // Priority 1: Official admin warehouses route with geolocation populate
      const res = await axios.get(`${API_BASE}/warehouses?unique_id=ADM_WAREHOUSES&req_for=view`, { headers: getHeaders() });
      const list = res.data?.warehouses || res.data?.data || [];
      if (Array.isArray(list) && list.length > 0) {
        setWarehouses(list);
        return;
      }
    } catch (err) {
      console.warn('Notice: Trying invoice-do warehouses route:', err.message);
    }

    try {
      // Priority 2: Direct invoice-do endpoint querying CompanyWarehouse
      const res2 = await axios.get(`${API_BASE}/invoice-do-settings/warehouses`, { headers: getHeaders() });
      const list2 = res2.data?.warehouses || res2.data?.data || [];
      if (Array.isArray(list2)) {
        setWarehouses(list2);
      }
    } catch (e2) {
      console.error('Error fetching warehouses:', e2);
      setWarehouses([]);
    }
  };

  // 2. Fetch Settings for current scope
  const fetchSettings = async (scopeType = selectedScopeType, scopeId = activeWarehouse?._id || activeWarehouse?.id) => {
    setLoading(true);
    try {
      let url = `${API_BASE}/invoice-do-settings?scope_type=${scopeType}`;
      if (scopeType !== 'global' && scopeId) {
        url += `&scope_id=${scopeId}`;
      }

      const res = await axios.get(url, { headers: getHeaders() });
      if (res.data?.status === 'success' && res.data.data) {
        const d = res.data.data;
        setFormData({
          ...d,
          terms_and_conditions: d.terms_and_conditions || [],
          brand_color: d.brand_color || '#0f172a',
          accent_color: d.accent_color || '#ea580c',
          invoice_header_title: d.invoice_header_title || 'TAX INVOICE',
          signatory_name: d.signatory_name || 'Rahil Sunnovative',
          signatory_designation: d.signatory_designation || 'Authorized Signatory & Finance Officer',
          signature_stamp_url: d.signature_stamp_url || '',
          bank_name: d.bank_name || 'HDFC Bank Ltd',
          bank_account_number: d.bank_account_number || '50200012345678',
          bank_ifsc: d.bank_ifsc || 'HDFC0001234',
          bank_branch: d.bank_branch || 'Sector 62 Industrial Area, Noida',
          upi_id: d.upi_id || 'solarkits@hdfcbank',
          kit_itemization_mode: d.kit_itemization_mode || 'kit_package',
          selected_preset_kit_id: d.selected_preset_kit_id || 'kit-5kw-ongrid',
          kit_name: d.kit_name || 'SolarKits 5kW Commercial Tier-1 On-Grid System Kit',
          kit_panel_brand: d.kit_panel_brand || 'Waaree Energies 550W TOPCon Bifacial Modules (x9)',
          kit_inverter_brand: d.kit_inverter_brand || 'Growatt 5kW 3-Phase Dual MPPT On-Grid Inverter',
          kit_capacity_kw: d.kit_capacity_kw || 5,
          kit_base_rate: d.kit_base_rate || 185000,
          kit_gst_rate: d.kit_gst_rate || 12,
          kit_hsn_code: d.kit_hsn_code || '85414300',
          show_oem_brands: d.show_oem_brands !== undefined ? d.show_oem_brands : true,
          show_warranty_terms: d.show_warranty_terms !== undefined ? d.show_warranty_terms : true,
          show_hsn_code: d.show_hsn_code !== undefined ? d.show_hsn_code : true,
          show_component_specs: d.show_component_specs !== undefined ? d.show_component_specs : true,
        });
      }
    } catch (err) {
      console.error('Error loading invoice/DO settings:', err);
      dispatch(setAlert({ type: 'error', message: 'Failed to load invoice & DO settings.' }));
    } finally {
      setLoading(false);
    }
  };

  // 3. Fetch All Scopes List
  const fetchAllScopes = async () => {
    try {
      const res = await axios.get(`${API_BASE}/invoice-do-settings/scopes`, { headers: getHeaders() });
      if (res.data?.status === 'success') {
        setAllScopeSettings(res.data.data || []);
      }
    } catch (e) {
      console.error('Error loading scopes:', e);
    }
  };

  useEffect(() => {
    fetchWarehouses();
    fetchAllScopes();
    fetchSettings('global', null);
  }, []);

  // Compute live preview string dynamically when inputs change
  const livePreviewInvoice = useMemo(() => {
    const prefix = formData.invoice_prefix || 'SK';
    const suffix = formData.invoice_suffix ? `-${formData.invoice_suffix}` : '';
    const now = new Date();
    const curYear = now.getFullYear();
    const curMonth = now.getMonth();
    const startYr = curMonth < 3 ? curYear - 1 : curYear;
    const endYr = startYr + 1;
    let fyStr = '';
    if (formData.financial_year_format === 'YYYY-YY') fyStr = `/${startYr}-${String(endYr).slice(-2)}`;
    else if (formData.financial_year_format === 'YYYY-YYYY') fyStr = `/${startYr}-${endYr}`;
    else if (formData.financial_year_format === 'YY-YY') fyStr = `/${String(startYr).slice(-2)}-${String(endYr).slice(-2)}`;

    const seq = String(formData.current_invoice_sequence || 1000).padStart(formData.sequence_padding || 4, '0');
    return `${prefix}${fyStr}/${seq}${suffix}`;
  }, [formData.invoice_prefix, formData.invoice_suffix, formData.financial_year_format, formData.current_invoice_sequence, formData.sequence_padding]);

  const livePreviewDo = useMemo(() => {
    const prefix = formData.do_prefix || 'DO';
    const now = new Date();
    const yymm = `${String(now.getFullYear()).slice(-2)}${String(now.getMonth() + 1).padStart(2, '0')}`;
    const seq = String(formData.current_do_sequence || 100).padStart(formData.do_sequence_padding || 4, '0');
    let fmt = formData.do_numbering_format || '{PREFIX}-{WH}-{YYMM}-{SEQ}';
    const whCode = activeWarehouse?.warehouse_code || 'MW01';
    return fmt.replace('{PREFIX}', prefix).replace('{WH}', whCode).replace('{YYMM}', yymm).replace('{SEQ}', seq);
  }, [formData.do_prefix, formData.do_numbering_format, formData.current_do_sequence, formData.do_sequence_padding, activeWarehouse]);

  // Tax and Total Calculations for Live Invoice
  const invoiceCalculations = useMemo(() => {
    const base = Number(formData.kit_base_rate) || 185000;
    const gstPct = Number(formData.kit_gst_rate) || 12;
    const isInterState = formData.state_code !== '09'; // Example: intra-state if UP (09)
    const taxAmount = (base * gstPct) / 100;
    const grandTotal = base + taxAmount;

    return {
      baseRate: base,
      gstPct,
      isInterState,
      cgstPct: gstPct / 2,
      cgstAmount: taxAmount / 2,
      sgstPct: gstPct / 2,
      sgstAmount: taxAmount / 2,
      igstPct: gstPct,
      igstAmount: taxAmount,
      taxAmount,
      grandTotal,
    };
  }, [formData.kit_base_rate, formData.kit_gst_rate, formData.state_code]);

  // Save Settings Handler
  const handleSaveSettings = async (e) => {
    if (e) e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        ...formData,
        scope_type: selectedScopeType,
        scope_id: selectedScopeType !== 'global' && activeWarehouse ? (activeWarehouse._id || activeWarehouse.id) : null,
        scope_name:
          selectedScopeType === 'global'
            ? 'All India (Global Default)'
            : (activeWarehouse?.warehouse_name || 'Warehouse Override'),
      };

      const res = await axios.post(`${API_BASE}/invoice-do-settings`, payload, { headers: getHeaders() });
      if (res.data?.status === 'success') {
        dispatch(setAlert({ type: 'success', message: `Invoice & Delivery Order settings saved for ${payload.scope_name}!` }));
        fetchAllScopes();
        fetchSettings(selectedScopeType, payload.scope_id);
      }
    } catch (err) {
      console.error('Error saving settings:', err);
      dispatch(setAlert({ type: 'error', message: err.response?.data?.message || 'Failed to save settings.' }));
    } finally {
      setSaving(false);
    }
  };

  // Terms & Conditions list helpers
  const handleAddTerm = () => {
    setFormData((prev) => ({
      ...prev,
      terms_and_conditions: [...prev.terms_and_conditions, 'New condition clause...'],
    }));
  };

  const handleUpdateTerm = (index, value) => {
    const list = [...formData.terms_and_conditions];
    list[index] = value;
    setFormData((prev) => ({ ...prev, terms_and_conditions: list }));
  };

  const handleRemoveTerm = (index) => {
    setFormData((prev) => ({
      ...prev,
      terms_and_conditions: prev.terms_and_conditions.filter((_, i) => i !== index),
    }));
  };

  const handleDeleteScope = async (id, name) => {
    if (!window.confirm(`Are you sure you want to revert override for ${name}? It will fallback to Global settings.`)) return;
    try {
      await axios.delete(`${API_BASE}/invoice-do-settings/${id}`, { headers: getHeaders() });
      dispatch(setAlert({ type: 'success', message: `Override removed. Restored global settings for ${name}.` }));
      fetchAllScopes();
      if (activeWarehouse?._id === id || activeWarehouse?.id === id) {
        setActiveWarehouse(null);
        setSelectedScopeType('global');
        fetchSettings('global', null);
      }
    } catch (err) {
      dispatch(setAlert({ type: 'error', message: 'Failed to delete scope override.' }));
    }
  };

  // Helper to choose a Solar Kit preset
  const handleSelectKitPreset = (kitId) => {
    const kit = SOLAR_KIT_PRESETS.find(k => k.id === kitId);
    if (kit) {
      setFormData(prev => ({
        ...prev,
        selected_preset_kit_id: kit.id,
        kit_name: kit.name,
        kit_panel_brand: kit.panel_brand,
        kit_inverter_brand: kit.inverter_brand,
        kit_capacity_kw: kit.capacity_kw,
        kit_base_rate: kit.base_rate,
        kit_gst_rate: kit.gst_rate,
        kit_hsn_code: kit.hsn_code,
      }));
    }
  };

  // Filter warehouses for the Warehouse Override Workspace
  const availableStates = useMemo(() => {
    const statesSet = new Set();
    warehouses.forEach(w => {
      const st = w.state || w.state_name || w.location?.state;
      if (st) statesSet.add(st);
    });
    return Array.from(statesSet);
  }, [warehouses]);

  const filteredWarehouses = useMemo(() => {
    return warehouses.filter(wh => {
      const whState = wh.state || wh.state_name || wh.location?.state || '';
      const whName = (wh.warehouse_name || wh.name || '').toLowerCase();
      const whCity = (wh.city || wh.district || '').toLowerCase();
      const whCode = (wh.warehouse_code || wh.code || '').toLowerCase();

      // State Filter
      if (stateFilter !== 'ALL' && whState !== stateFilter) return false;

      // Search Query
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        if (!whName.includes(q) && !whCity.includes(q) && !whCode.includes(q) && !whState.toLowerCase().includes(q)) {
          return false;
        }
      }

      // Status Filter
      const hasOverride = allScopeSettings.some(s => String(s.scope_id) === String(wh._id || wh.id));
      if (statusFilter === 'CONFIGURED' && !hasOverride) return false;
      if (statusFilter === 'BLOCKED' && hasOverride) return false;

      return true;
    });
  }, [warehouses, stateFilter, searchQuery, statusFilter, allScopeSettings]);

  // Start editing a specific warehouse
  const handleStartEditWarehouse = (wh) => {
    setActiveWarehouse(wh);
    setSelectedScopeType('warehouse');
    fetchSettings('warehouse', wh._id || wh.id);
  };

  // Back to All Warehouses Grid
  const handleBackToWarehouseGrid = () => {
    setActiveWarehouse(null);
    setSelectedScopeType('warehouse');
  };

  // Switch to Global Scope
  const handleSelectGlobalScope = () => {
    setSelectedScopeType('global');
    setActiveWarehouse(null);
    fetchSettings('global', null);
  };

  return (
    <div className="space-y-4 pb-12">
      {/* ── TOP HEADER & DYNAMIC SCOPE WORKSPACE SWITCHER ─────────────────────────── */}
      <div className="bg-slate-900 text-white rounded-2xl p-4 shadow-md border border-slate-800">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          {/* Title & Scope Mode Toggle */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <span className="w-10 h-10 rounded-xl bg-orange-500/20 text-orange-400 flex items-center justify-center font-black shrink-0">
              <FaFileInvoiceDollar size={20} />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base md:text-lg font-bold tracking-tight">
                  Dynamic Invoice & Delivery Order Settings
                </h2>
                {activeWarehouse && (
                  <span className="px-2 py-0.5 rounded-full bg-orange-500/30 text-orange-300 text-[10px] font-bold border border-orange-500/50">
                    Warehouse: {activeWarehouse.warehouse_name || activeWarehouse.name}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400">
                Configure legal GST invoice templates, brand styling, Solar Kit pricing items, and state-wise warehouse dispatch gates.
              </p>
            </div>
          </div>

          {/* Scope Mode Switcher & Quick Save */}
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="bg-slate-800 p-1 rounded-xl border border-slate-700 flex items-center gap-1 text-xs font-bold">
              <button
                type="button"
                onClick={handleSelectGlobalScope}
                className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
                  selectedScopeType === 'global' && !activeWarehouse
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <FaGlobe size={12} /> All India (Global Default)
              </button>

              <button
                type="button"
                onClick={() => {
                  setSelectedScopeType('warehouse');
                  setActiveWarehouse(null); // Open Warehouse Hub grid
                }}
                className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
                  selectedScopeType === 'warehouse' && !activeWarehouse
                    ? 'bg-orange-600 text-white shadow-xs'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <FaWarehouse size={12} /> Warehouse Overrides Hub
                <span className="px-1.5 py-0.2 bg-slate-900 text-orange-400 rounded-md text-[10px]">
                  {allScopeSettings.filter(s => s.scope_type !== 'global').length}/{warehouses.length}
                </span>
              </button>
            </div>

            {/* Live Samples in Header */}
            {(!selectedScopeType || selectedScopeType === 'global' || activeWarehouse) && (
              <div className="hidden xl:flex items-center gap-2 text-[11px] font-mono">
                <div className="px-2.5 py-1 bg-slate-800 border border-slate-700 rounded-lg text-emerald-400">
                  INV: <span className="font-bold">{livePreviewInvoice}</span>
                </div>
                <div className="px-2.5 py-1 bg-slate-800 border border-slate-700 rounded-lg text-amber-400">
                  DO: <span className="font-bold">{livePreviewDo}</span>
                </div>
              </div>
            )}

            {/* Save Button */}
            {(!selectedScopeType || selectedScopeType === 'global' || activeWarehouse) && (
              <Button
                type="button"
                onClick={handleSaveSettings}
                disabled={saving}
                className="bg-orange-500 hover:bg-orange-600 text-white font-bold px-4 py-2 rounded-xl text-xs flex items-center gap-1.5 shadow-md transition-all shrink-0"
              >
                {saving ? <Loader size={12} color="text-white" /> : <FaSave size={12} />}
                {saving ? 'Saving...' : 'Save Settings'}
              </Button>
            )}
          </div>
        </div>

        {/* Breadcrumb strip if editing a specific warehouse */}
        {activeWarehouse && (
          <div className="mt-3 pt-3 border-t border-slate-800 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2 text-slate-300">
              <span className="text-orange-400 font-bold">Currently Configuring:</span>
              <span className="font-bold text-white bg-slate-800 px-2 py-0.5 rounded border border-slate-700">
                {activeWarehouse.warehouse_name || activeWarehouse.name} ({activeWarehouse.state || activeWarehouse.state_name || 'State Hub'})
              </span>
              <span className="text-slate-400">| Facility Code: {activeWarehouse.warehouse_code || 'MW01'}</span>
            </div>
            <button
              type="button"
              onClick={handleBackToWarehouseGrid}
              className="text-orange-400 hover:text-orange-300 flex items-center gap-1 font-bold underline"
            >
              <FaArrowLeft size={11} /> Back to Warehouses Grid
            </button>
          </div>
        )}
      </div>

      {/* ══════════════════════════════════════════════════════════════════════════════
          VIEW 1: WAREHOUSE OVERRIDES HUB (When Warehouse Override is clicked in header)
          ══════════════════════════════════════════════════════════════════════════════ */}
      {selectedScopeType === 'warehouse' && !activeWarehouse && (
        <div className="space-y-4 animate-in fade-in duration-300">
          {/* Dispatch Gate & Compliance Notice Banner */}
          <div className="bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-transparent border border-amber-500/30 rounded-2xl p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-xl bg-amber-500 text-white shrink-0 mt-0.5">
                <FaShieldAlt size={16} />
              </div>
              <div>
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wide flex items-center gap-1.5">
                  Zero-Dispatch Compliance Gate Active
                </h3>
                <p className="text-xs text-slate-600 mt-0.5 leading-relaxed">
                  GST rules mandate that stock <strong>cannot be dispatched</strong> and E-Way bills cannot be issued from a state facility until its State GSTIN and series are registered. Choose a warehouse below to configure its custom series or approve global inheritance.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span className="px-3 py-1 bg-emerald-100 text-emerald-800 text-xs font-bold rounded-lg border border-emerald-300">
                {allScopeSettings.filter(s => s.scope_type !== 'global').length} Configured
              </span>
              <span className="px-3 py-1 bg-amber-100 text-amber-800 text-xs font-bold rounded-lg border border-amber-300">
                {Math.max(0, warehouses.length - allScopeSettings.filter(s => s.scope_type !== 'global').length)} Pending Setup
              </span>
            </div>
          </div>

          {/* State Filter Pills & Search Bar */}
          <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs space-y-3">
            <div className="flex flex-col md:flex-row items-center justify-between gap-3">
              {/* Search Bar */}
              <div className="relative w-full md:w-80">
                <FaSearch className="absolute left-3 top-3 text-slate-400 text-xs" />
                <input
                  type="text"
                  placeholder="Search warehouse by name, city, state, or code..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-xs font-medium bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-orange-500"
                />
              </div>

              {/* Status Filter Tabs */}
              <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl text-xs font-bold">
                <button
                  type="button"
                  onClick={() => setStatusFilter('ALL')}
                  className={`px-3 py-1.5 rounded-lg transition-all ${
                    statusFilter === 'ALL' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  All Facilities ({warehouses.length})
                </button>
                <button
                  type="button"
                  onClick={() => setStatusFilter('CONFIGURED')}
                  className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1 ${
                    statusFilter === 'CONFIGURED' ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-600 hover:text-emerald-700'
                  }`}
                >
                  <FaCheckCircle size={10} /> Ready for Dispatch
                </button>
                <button
                  type="button"
                  onClick={() => setStatusFilter('BLOCKED')}
                  className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1 ${
                    statusFilter === 'BLOCKED' ? 'bg-amber-600 text-white shadow-xs' : 'text-slate-600 hover:text-amber-700'
                  }`}
                >
                  <FaExclamationTriangle size={10} /> Pending Override
                </button>
              </div>
            </div>

            {/* State Filter Pills */}
            <div className="pt-2 border-t border-slate-100 flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
              <span className="text-[11px] font-bold text-slate-400 flex items-center gap-1 mr-1 shrink-0">
                <FaFilter size={10} /> Filter by State:
              </span>
              <button
                type="button"
                onClick={() => setStateFilter('ALL')}
                className={`px-3 py-1 rounded-lg font-bold shrink-0 transition-all ${
                  stateFilter === 'ALL'
                    ? 'bg-orange-500 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                All States
              </button>
              {availableStates.map((st) => (
                <button
                  key={st}
                  type="button"
                  onClick={() => setStateFilter(st)}
                  className={`px-3 py-1 rounded-lg font-bold shrink-0 transition-all ${
                    stateFilter === st
                      ? 'bg-orange-500 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>
          </div>

          {/* Warehouse Cards Grid */}
          {filteredWarehouses.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-500 text-xs">
              <FaWarehouse size={32} className="mx-auto text-slate-300 mb-2" />
              No warehouse facilities match the selected state or filter.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredWarehouses.map((wh) => {
                const whId = wh._id || wh.id;
                const overrideConfig = allScopeSettings.find(s => String(s.scope_id) === String(whId));
                const isConfigured = Boolean(overrideConfig);
                const whState = wh.state || wh.state_name || wh.location?.state || 'State Not Set';
                const whCity = wh.city || wh.district || wh.location?.city || '';
                const whCode = wh.warehouse_code || wh.code || 'MW01';

                return (
                  <div
                    key={whId}
                    className={`bg-white rounded-2xl border-2 transition-all p-5 flex flex-col justify-between shadow-xs hover:shadow-md ${
                      isConfigured
                        ? 'border-emerald-200 hover:border-emerald-300'
                        : 'border-slate-200 hover:border-orange-300'
                    }`}
                  >
                    <div className="space-y-3">
                      {/* Top Badges */}
                      <div className="flex items-center justify-between">
                        <span className="px-2 py-0.5 bg-slate-100 text-slate-700 font-mono font-bold text-[10px] rounded-md border border-slate-200">
                          {whCode}
                        </span>

                        {isConfigured ? (
                          <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold flex items-center gap-1 border border-emerald-200">
                            <FaCheckCircle size={10} /> Dispatch Ready
                          </span>
                        ) : (
                          <span className="px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[10px] font-bold flex items-center gap-1 border border-amber-200">
                            <FaExclamationTriangle size={10} /> Pending Override
                          </span>
                        )}
                      </div>

                      {/* Warehouse Info */}
                      <div>
                        <h4 className="font-bold text-slate-900 text-sm">
                          {wh.warehouse_name || wh.name}
                        </h4>
                        <p className="text-xs text-slate-500 mt-0.5">
                          {whCity ? `${whCity}, ` : ''}{whState}
                        </p>
                      </div>

                      {/* Current Series Summary Box */}
                      <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-[11px] space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-slate-500 font-medium">Invoice Series:</span>
                          <span className="font-mono font-bold text-slate-900">
                            {isConfigured ? `${overrideConfig.invoice_prefix}/...` : 'Inherits Global (SK/...)'}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-slate-500 font-medium">State GSTIN:</span>
                          <span className="font-mono text-slate-700 text-[10px]">
                            {isConfigured ? (overrideConfig.gstin || 'Custom GSTIN') : 'Global GSTIN'}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-slate-500 font-medium">DO Format:</span>
                          <span className="font-mono text-slate-700 text-[10px]">
                            {isConfigured ? (overrideConfig.do_prefix || 'DO') : 'DO-Global'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="pt-4 mt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                      <Button
                        type="button"
                        onClick={() => handleStartEditWarehouse(wh)}
                        className={`w-full py-2 px-3 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition-all ${
                          isConfigured
                            ? 'bg-slate-900 hover:bg-slate-800 text-white'
                            : 'bg-orange-500 hover:bg-orange-600 text-white shadow-xs'
                        }`}
                      >
                        <FaSlidersH size={11} />
                        {isConfigured ? 'Edit Custom Series' : 'Configure Warehouse Series'}
                      </Button>

                      {isConfigured && (
                        <button
                          type="button"
                          onClick={() => handleDeleteScope(overrideConfig._id, wh.warehouse_name || wh.name)}
                          title="Revert to Global settings"
                          className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"
                        >
                          <FaTrash size={12} />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════════════
          VIEW 2: FULL 5-TAB SETTINGS EDITOR (For Global Scope or Specific Warehouse)
          ══════════════════════════════════════════════════════════════════════════════ */}
      {(selectedScopeType === 'global' || activeWarehouse) && (
        <div className="space-y-4">
          {/* Sub-Navigation Tabs */}
          <div className="flex flex-wrap items-center gap-1.5 bg-slate-100 p-1.5 rounded-2xl border border-slate-200 text-xs font-bold">
            {[
              { id: 'invoice_template', label: '1. Invoice Template & Branding', icon: <FaPalette /> },
              { id: 'numbering', label: '2. Invoice Numbering & FY Series', icon: <FaReceipt /> },
              { id: 'timing', label: '3. Generation Timing Triggers', icon: <FaCalendarAlt /> },
              { id: 'do_settings', label: '4. Delivery Order (DO) Format', icon: <FaTruck /> },
              { id: 'scopes', label: '5. Overrides Overview', icon: <FaSlidersH /> },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-xl transition-all ${
                  activeTab === tab.id
                    ? 'bg-orange-500 text-white shadow-md'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                }`}
              >
                {tab.icon} {tab.label}
              </button>
            ))}
          </div>

          {/* ════ TAB 1: INVOICE TEMPLATE, BRANDING & SOLAR KIT ITEMS ════ */}
          {activeTab === 'invoice_template' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
              {/* Left Column: Form Controls (7 cols) */}
              <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-6">
                
                {/* 1. Company & Statutory Details */}
                <div>
                  <div className="border-b border-slate-100 pb-2 mb-4 flex items-center justify-between">
                    <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                      <FaBuilding className="text-orange-500" /> Company & Statutory Details
                    </h3>
                    <span className="text-[11px] text-slate-400">Printed on official GST Tax Invoices</span>
                  </div>

                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="text-xs font-bold text-slate-600 mb-1 block">Company Registered Name *</label>
                        <CustomInput
                          value={formData.company_name}
                          onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
                          placeholder="Legal Entity Name"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-bold text-slate-600 mb-1 block">Trade / Brand Name</label>
                        <CustomInput
                          value={formData.trade_name}
                          onChange={(e) => setFormData({ ...formData, trade_name: e.target.value })}
                          placeholder="e.g. SolarKits India"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="text-xs font-bold text-slate-600 mb-1 block">GSTIN Number *</label>
                        <CustomInput
                          value={formData.gstin}
                          onChange={(e) => setFormData({ ...formData, gstin: e.target.value.toUpperCase() })}
                          placeholder="07AAAAA0000A1Z5"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-bold text-slate-600 mb-1 block">PAN Number</label>
                        <CustomInput
                          value={formData.pan}
                          onChange={(e) => setFormData({ ...formData, pan: e.target.value.toUpperCase() })}
                          placeholder="AAAAA0000A"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-bold text-slate-600 mb-1 block">Corporate CIN</label>
                        <CustomInput
                          value={formData.cin}
                          onChange={(e) => setFormData({ ...formData, cin: e.target.value.toUpperCase() })}
                          placeholder="U40106DL2026PTC123456"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="text-xs font-bold text-slate-600 mb-1 block">State & State Code *</label>
                        <div className="flex gap-2">
                          <select
                            value={formData.state_name}
                            onChange={(e) => setFormData({ ...formData, state_name: e.target.value })}
                            className="w-full bg-slate-50 border border-slate-300 text-xs font-bold rounded-xl px-3 py-2.5"
                          >
                            {INDIAN_STATES.map((s) => (
                              <option key={s} value={s}>{s}</option>
                            ))}
                          </select>
                          <CustomInput
                            className="w-24 text-center font-mono font-bold"
                            value={formData.state_code}
                            onChange={(e) => setFormData({ ...formData, state_code: e.target.value })}
                            placeholder="09"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="text-xs font-bold text-slate-600 mb-1 block">Company Logo URL / Asset</label>
                        <CustomInput
                          value={formData.logo_url}
                          onChange={(e) => setFormData({ ...formData, logo_url: e.target.value })}
                          placeholder="https://.../logo.png"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-xs font-bold text-slate-600 mb-1 block">Official Billing Address *</label>
                      <textarea
                        rows={2}
                        value={formData.billing_address}
                        onChange={(e) => setFormData({ ...formData, billing_address: e.target.value })}
                        className="w-full bg-slate-50 border border-slate-300 rounded-xl p-3 text-xs focus:outline-none focus:border-blue-500 font-medium"
                        placeholder="Complete corporate address with PIN code..."
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="text-xs font-bold text-slate-600 mb-1 block">Support Hotline</label>
                        <CustomInput
                          value={formData.support_phone}
                          onChange={(e) => setFormData({ ...formData, support_phone: e.target.value })}
                          placeholder="+91 98765 43210"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-bold text-slate-600 mb-1 block">Billing Support Email</label>
                        <CustomInput
                          value={formData.support_email}
                          onChange={(e) => setFormData({ ...formData, support_email: e.target.value })}
                          placeholder="billing@solarkits.com"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* 2. Color Theme, Styling & Header Formatting */}
                <div className="pt-4 border-t border-slate-100">
                  <div className="border-b border-slate-100 pb-2 mb-4 flex items-center justify-between">
                    <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                      <FaPalette className="text-orange-500" /> Invoice Branding & Color Theme
                    </h3>
                    <span className="text-[11px] text-slate-400">Choose custom colors & invoice title</span>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="text-xs font-bold text-slate-600 mb-2 block">Brand Primary Color (Invoice Top Banner & Accents)</label>
                      <div className="flex flex-wrap items-center gap-2">
                        {COLOR_PRESETS.map((p) => (
                          <button
                            key={p.hex}
                            type="button"
                            onClick={() => setFormData({ ...formData, brand_color: p.hex })}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition-all ${
                              formData.brand_color === p.hex
                                ? 'border-orange-500 bg-orange-50 text-slate-900 shadow-xs ring-2 ring-orange-400/30'
                                : 'border-slate-200 bg-slate-50 text-slate-700 hover:border-slate-300'
                            }`}
                          >
                            <span className="w-3.5 h-3.5 rounded-full shrink-0 border border-black/10" style={{ backgroundColor: p.hex }} />
                            {p.name.split(' ')[0]}
                          </button>
                        ))}
                        {/* Custom Hex Picker */}
                        <div className="flex items-center gap-1 pl-2">
                          <input
                            type="color"
                            value={formData.brand_color || '#0f172a'}
                            onChange={(e) => setFormData({ ...formData, brand_color: e.target.value })}
                            className="w-8 h-8 rounded-lg border border-slate-200 cursor-pointer"
                          />
                          <input
                            type="text"
                            value={formData.brand_color}
                            onChange={(e) => setFormData({ ...formData, brand_color: e.target.value })}
                            placeholder="#0f172a"
                            className="w-24 px-2 py-1.5 text-xs font-mono font-bold bg-slate-50 border border-slate-200 rounded-lg text-center"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="text-xs font-bold text-slate-600 mb-1 block">Invoice Header Title</label>
                        <select
                          value={formData.invoice_header_title}
                          onChange={(e) => setFormData({ ...formData, invoice_header_title: e.target.value })}
                          className="w-full bg-slate-50 border border-slate-300 text-xs font-bold rounded-xl px-3 py-2.5"
                        >
                          <option value="TAX INVOICE">TAX INVOICE (Standard GST)</option>
                          <option value="TAX INVOICE - ORIGINAL FOR RECIPIENT">TAX INVOICE - ORIGINAL FOR RECIPIENT</option>
                          <option value="BILL OF SUPPLY">BILL OF SUPPLY (Composition / Non-Taxable)</option>
                          <option value="COMMERCIAL INVOICE">COMMERCIAL INVOICE</option>
                        </select>
                      </div>

                      <div>
                        <label className="text-xs font-bold text-slate-600 mb-1 block">Highlight Accent Color</label>
                        <div className="flex items-center gap-2">
                          <input
                            type="color"
                            value={formData.accent_color || '#ea580c'}
                            onChange={(e) => setFormData({ ...formData, accent_color: e.target.value })}
                            className="w-9 h-9 rounded-xl border border-slate-200 cursor-pointer"
                          />
                          <CustomInput
                            value={formData.accent_color}
                            onChange={(e) => setFormData({ ...formData, accent_color: e.target.value })}
                            placeholder="#ea580c"
                            className="font-mono text-xs font-bold"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 3. Authorized Signatory & Official Stamp */}
                <div className="pt-4 border-t border-slate-100">
                  <div className="border-b border-slate-100 pb-2 mb-4 flex items-center justify-between">
                    <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                      <FaStamp className="text-orange-500" /> Authorized Signatory & Official Rubber Stamp
                    </h3>
                    <span className="text-[11px] text-slate-400">Printed on invoice footer</span>
                  </div>

                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="text-xs font-bold text-slate-600 mb-1 block">Signatory Name *</label>
                        <CustomInput
                          value={formData.signatory_name}
                          onChange={(e) => setFormData({ ...formData, signatory_name: e.target.value })}
                          placeholder="e.g. Rahil Sunnovative"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-bold text-slate-600 mb-1 block">Signatory Designation</label>
                        <CustomInput
                          value={formData.signatory_designation}
                          onChange={(e) => setFormData({ ...formData, signatory_designation: e.target.value })}
                          placeholder="e.g. Authorized Signatory / Accounts Head"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-xs font-bold text-slate-600 mb-1 block">Signature & Official Rubber Stamp Asset / URL</label>
                      <div className="flex gap-2">
                        <CustomInput
                          value={formData.signature_stamp_url}
                          onChange={(e) => setFormData({ ...formData, signature_stamp_url: e.target.value })}
                          placeholder="https://.../stamp_signature.png (Transparent PNG)"
                          className="flex-1"
                        />
                        <button
                          type="button"
                          onClick={() => setFormData({
                            ...formData,
                            signature_stamp_url: 'https://cdn-icons-png.flaticon.com/512/9623/9623305.png'
                          })}
                          className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl whitespace-nowrap"
                        >
                          Use SolarKits Stamp
                        </button>
                      </div>
                      <span className="text-[10px] text-slate-400 mt-1 block">
                        If left blank, system generates a clean digital verification seal with company name and timestamp.
                      </span>
                    </div>
                  </div>
                </div>

                {/* 4. Bank & Payment QR Details */}
                <div className="pt-4 border-t border-slate-100">
                  <div className="border-b border-slate-100 pb-2 mb-4 flex items-center justify-between">
                    <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                      <FaUniversity className="text-orange-500" /> Bank & Settlement Details (For NEFT / RTGS / UPI)
                    </h3>
                    <span className="text-[11px] text-slate-400">Printed on invoice for customer payment</span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="text-xs font-bold text-slate-600 mb-1 block">Bank Name</label>
                      <CustomInput
                        value={formData.bank_name}
                        onChange={(e) => setFormData({ ...formData, bank_name: e.target.value })}
                        placeholder="e.g. HDFC Bank Ltd"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-slate-600 mb-1 block">Account Number</label>
                      <CustomInput
                        value={formData.bank_account_number}
                        onChange={(e) => setFormData({ ...formData, bank_account_number: e.target.value })}
                        placeholder="50200012345678"
                        className="font-mono"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-slate-600 mb-1 block">IFSC Code</label>
                      <CustomInput
                        value={formData.bank_ifsc}
                        onChange={(e) => setFormData({ ...formData, bank_ifsc: e.target.value.toUpperCase() })}
                        placeholder="HDFC0001234"
                        className="font-mono"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
                    <div>
                      <label className="text-xs font-bold text-slate-600 mb-1 block">Bank Branch</label>
                      <CustomInput
                        value={formData.bank_branch}
                        onChange={(e) => setFormData({ ...formData, bank_branch: e.target.value })}
                        placeholder="Sector 62 Industrial Area, Noida"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-slate-600 mb-1 block">Official UPI ID</label>
                      <CustomInput
                        value={formData.upi_id}
                        onChange={(e) => setFormData({ ...formData, upi_id: e.target.value })}
                        placeholder="solarkits@hdfcbank"
                        className="font-mono"
                      />
                    </div>
                  </div>
                </div>

                {/* 5. Solar Kit Line Itemization & System Pricing Setup */}
                <div className="pt-4 border-t border-slate-100">
                  <div className="border-b border-slate-100 pb-2 mb-4 flex items-center justify-between">
                    <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                      <FaSolarPanel className="text-orange-500" /> Solar Kit Body Itemization & System Pricing
                    </h3>
                    <span className="text-[11px] text-slate-400">Controls how kits appear in invoice body</span>
                  </div>

                  <div className="space-y-4">
                    {/* Choose Sample Preset Kit */}
                    <div>
                      <label className="text-xs font-bold text-slate-600 mb-1 block">Select System Kit Model to Preview / Configure</label>
                      <select
                        value={formData.selected_preset_kit_id}
                        onChange={(e) => handleSelectKitPreset(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-300 text-xs font-bold rounded-xl px-3 py-2.5 focus:outline-none"
                      >
                        {SOLAR_KIT_PRESETS.map((k) => (
                          <option key={k.id} value={k.id}>
                            {k.name} ({k.capacity_kw} kW) — Base Rate: ₹{k.base_rate.toLocaleString('en-IN')}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="text-xs font-bold text-slate-600 mb-1 block">Solar Kit Description / Title *</label>
                        <CustomInput
                          value={formData.kit_name}
                          onChange={(e) => setFormData({ ...formData, kit_name: e.target.value })}
                          placeholder="Kit Name"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-bold text-slate-600 mb-1 block">HSN / SAC Code *</label>
                        <CustomInput
                          value={formData.kit_hsn_code}
                          onChange={(e) => setFormData({ ...formData, kit_hsn_code: e.target.value })}
                          placeholder="85414300"
                          className="font-mono font-bold"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="text-xs font-bold text-slate-600 mb-1 block">Solar Panel OEM Brand & Spec</label>
                        <CustomInput
                          value={formData.kit_panel_brand}
                          onChange={(e) => setFormData({ ...formData, kit_panel_brand: e.target.value })}
                          placeholder="e.g. Waaree Energies 550W TOPCon (x9)"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-bold text-slate-600 mb-1 block">Inverter OEM Brand & Model</label>
                        <CustomInput
                          value={formData.kit_inverter_brand}
                          onChange={(e) => setFormData({ ...formData, kit_inverter_brand: e.target.value })}
                          placeholder="e.g. Growatt 5kW Dual MPPT Inverter"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="text-xs font-bold text-slate-600 mb-1 block">System Capacity (kW)</label>
                        <CustomInput
                          type="number"
                          value={formData.kit_capacity_kw}
                          onChange={(e) => setFormData({ ...formData, kit_capacity_kw: parseFloat(e.target.value) || 1 })}
                          placeholder="5"
                          className="font-bold"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-bold text-slate-600 mb-1 block">Kit Base Rate (INR Excl. GST)</label>
                        <CustomInput
                          type="number"
                          value={formData.kit_base_rate}
                          onChange={(e) => setFormData({ ...formData, kit_base_rate: parseFloat(e.target.value) || 0 })}
                          placeholder="185000"
                          className="font-mono font-bold"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-bold text-slate-600 mb-1 block">Applicable GST Rate</label>
                        <select
                          value={formData.kit_gst_rate}
                          onChange={(e) => setFormData({ ...formData, kit_gst_rate: parseInt(e.target.value) || 12 })}
                          className="w-full bg-slate-50 border border-slate-300 text-xs font-bold rounded-xl px-3 py-2.5 focus:outline-none"
                        >
                          <option value={12}>12% GST (Standard Solar PV)</option>
                          <option value={18}>18% GST (Services / Inverter Individual)</option>
                          <option value={5}>5% Concessional GST</option>
                        </select>
                      </div>
                    </div>

                    {/* Checkbox Options to Show/Hide on Invoice */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
                      <label className="flex items-center gap-2 p-3 bg-slate-50 rounded-xl border border-slate-200 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={formData.show_oem_brands}
                          onChange={(e) => setFormData({ ...formData, show_oem_brands: e.target.checked })}
                          className="rounded text-orange-500 focus:ring-orange-400"
                        />
                        <span className="text-xs font-bold text-slate-700">Print OEM Brands (Waaree/Growatt) on Invoice</span>
                      </label>

                      <label className="flex items-center gap-2 p-3 bg-slate-50 rounded-xl border border-slate-200 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={formData.show_warranty_terms}
                          onChange={(e) => setFormData({ ...formData, show_warranty_terms: e.target.checked })}
                          className="rounded text-orange-500 focus:ring-orange-400"
                        />
                        <span className="text-xs font-bold text-slate-700">Print 25-Yr & 5-Yr Warranty Terms on Line Items</span>
                      </label>

                      <label className="flex items-center gap-2 p-3 bg-slate-50 rounded-xl border border-slate-200 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={formData.show_hsn_code}
                          onChange={(e) => setFormData({ ...formData, show_hsn_code: e.target.checked })}
                          className="rounded text-orange-500 focus:ring-orange-400"
                        />
                        <span className="text-xs font-bold text-slate-700">Include HSN/SAC Column in Item Table</span>
                      </label>

                      <label className="flex items-center gap-2 p-3 bg-slate-50 rounded-xl border border-slate-200 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={formData.show_component_specs}
                          onChange={(e) => setFormData({ ...formData, show_component_specs: e.target.checked })}
                          className="rounded text-orange-500 focus:ring-orange-400"
                        />
                        <span className="text-xs font-bold text-slate-700">Print Structure & BOS Kit Specs Under Kit</span>
                      </label>
                    </div>
                  </div>
                </div>

                {/* 6. Terms & Conditions (Footer Clauses) */}
                <div className="pt-4 border-t border-slate-100 space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-700">Terms & Conditions (Footer Clauses)</label>
                    <button
                      type="button"
                      onClick={handleAddTerm}
                      className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1"
                    >
                      <FaPlus size={10} /> Add Clause
                    </button>
                  </div>
                  <div className="space-y-2">
                    {formData.terms_and_conditions.map((term, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-400 w-5">{idx + 1}.</span>
                        <input
                          type="text"
                          value={term}
                          onChange={(e) => handleUpdateTerm(idx, e.target.value)}
                          className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium focus:outline-none focus:border-blue-500"
                        />
                        <button
                          type="button"
                          onClick={() => handleRemoveTerm(idx)}
                          className="text-red-400 hover:text-red-600 p-1.5"
                        >
                          <FaTrash size={12} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Save Button */}
                <div className="pt-4 border-t border-slate-100">
                  <Button
                    type="button"
                    onClick={handleSaveSettings}
                    disabled={saving}
                    className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold py-3 rounded-xl shadow-md text-xs"
                  >
                    {saving ? 'Saving...' : 'Save Template & Kit Settings'}
                  </Button>
                </div>
              </div>

              {/* Right Column: Ultra-Professional Real-Life Invoice Preview (5 cols) */}
              <div className="lg:col-span-5 space-y-3 sticky top-4">
                <div className="flex items-center justify-between px-1">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
                    <FaEye className="text-blue-500" />
                    <span>Live Official GST Tax Invoice Preview</span>
                  </div>
                  <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 font-mono text-[10px] font-bold border border-emerald-200">
                    Format: {livePreviewInvoice}
                  </span>
                </div>

                {/* Realistic Invoice Sheet Container */}
                <div className="bg-white rounded-2xl border-2 border-slate-300 shadow-xl overflow-hidden font-sans text-slate-800 text-[11px] leading-tight">
                  
                  {/* Top Brand Bar (Rendered in chosen Brand Color) */}
                  <div
                    className="p-4 text-white flex items-center justify-between"
                    style={{ backgroundColor: formData.brand_color || '#0f172a' }}
                  >
                    <div>
                      <h4 className="font-black text-sm uppercase tracking-wider">{formData.company_name}</h4>
                      <p className="text-[10px] text-white/80">{formData.trade_name}</p>
                    </div>
                    <div className="text-right">
                      <span className="px-2.5 py-1 rounded bg-white/20 text-white font-black text-xs uppercase tracking-widest">
                        {formData.invoice_header_title || 'TAX INVOICE'}
                      </span>
                    </div>
                  </div>

                  <div className="p-4 space-y-3">
                    {/* Header Details (Company GSTIN & Invoice Number) */}
                    <div className="grid grid-cols-2 gap-2 pb-3 border-b border-slate-200">
                      <div className="space-y-0.5">
                        <div className="font-bold text-slate-900">{formData.company_name}</div>
                        <div className="text-[10px] text-slate-600 leading-snug">{formData.billing_address}</div>
                        <div className="text-[10px] pt-1">
                          <strong>GSTIN:</strong> <span className="font-mono">{formData.gstin || '07AAAAA0000A1Z5'}</span>
                        </div>
                        <div className="text-[10px]">
                          <strong>PAN:</strong> <span className="font-mono">{formData.pan}</span> | <strong>CIN:</strong> <span className="font-mono text-[9px]">{formData.cin}</span>
                        </div>
                        <div className="text-[10px]">
                          <strong>State:</strong> {formData.state_name} (Code: <span className="font-mono font-bold">{formData.state_code}</span>)
                        </div>
                      </div>

                      <div className="text-right space-y-1">
                        <div className="p-2 bg-slate-50 rounded-lg border border-slate-200 inline-block text-left w-full">
                          <div className="text-[10px] text-slate-500 font-bold">INVOICE NUMBER</div>
                          <div className="font-mono font-black text-xs text-slate-900">{livePreviewInvoice}</div>
                          <div className="text-[10px] text-slate-500 font-bold mt-1">DATE OF ISSUE</div>
                          <div className="font-bold text-slate-800">{new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</div>
                          <div className="text-[10px] text-slate-500 font-bold mt-1">PLACE OF SUPPLY</div>
                          <div className="font-bold text-slate-800">{formData.state_name} ({formData.state_code})</div>
                        </div>
                      </div>
                    </div>

                    {/* Consignee / Billed To & Dispatched From */}
                    <div className="grid grid-cols-2 gap-2 text-[10px] p-2 bg-slate-50/80 rounded-xl border border-slate-200">
                      <div>
                        <span className="font-bold text-slate-500 block mb-0.5 uppercase">Billed To (Customer):</span>
                        <div className="font-bold text-slate-900">M/s Sunshakti Solar EPC Pvt Ltd</div>
                        <div className="text-slate-600">Site: Plot 42, Green Energy Park</div>
                        <div>GSTIN: <span className="font-mono font-bold">07BBBBP1234F1Z1</span></div>
                        <div>State: {formData.state_name} ({formData.state_code})</div>
                      </div>

                      <div>
                        <span className="font-bold text-slate-500 block mb-0.5 uppercase">Dispatched From (Facility):</span>
                        <div className="font-bold text-slate-900">
                          {activeWarehouse ? activeWarehouse.warehouse_name : 'SolarKits Central Facility (MW01)'}
                        </div>
                        <div className="text-slate-600">Logistics Hub, Sector 62, Industrial Area</div>
                        <div>Dispatch State: {formData.state_name}</div>
                        <div>Delivery Order #: <span className="font-mono font-bold text-amber-700">{livePreviewDo}</span></div>
                      </div>
                    </div>

                    {/* Professional Items Table */}
                    <div className="border border-slate-300 rounded-lg overflow-hidden">
                      <table className="w-full text-left text-[10px]">
                        <thead>
                          <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-300">
                            <th className="p-1.5 w-6 text-center">#</th>
                            <th className="p-1.5">Description of Solar Kits & Goods</th>
                            {formData.show_hsn_code && <th className="p-1.5 text-center">HSN</th>}
                            <th className="p-1.5 text-center w-8">Qty</th>
                            <th className="p-1.5 text-right">Rate (₹)</th>
                            <th className="p-1.5 text-right">Taxable (₹)</th>
                            <th className="p-1.5 text-right">Total (₹)</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200">
                          <tr>
                            <td className="p-1.5 text-center font-bold">1</td>
                            <td className="p-1.5">
                              <div className="font-bold text-slate-900">{formData.kit_name}</div>
                              {formData.show_oem_brands && (
                                <div className="text-[9px] text-slate-600 mt-0.5 space-y-0.2">
                                  <div>• <strong>Panels:</strong> {formData.kit_panel_brand}</div>
                                  <div>• <strong>Inverter:</strong> {formData.kit_inverter_brand}</div>
                                </div>
                              )}
                              {formData.show_component_specs && (
                                <div className="text-[9px] text-slate-500 mt-0.5">
                                  Includes: High-Wind Mounting Structure, ACDB/DCDB, Earthing & Solar Cable
                                </div>
                              )}
                              {formData.show_warranty_terms && (
                                <div className="text-[9px] text-emerald-700 font-bold mt-0.5">
                                  ✓ Warranty: 25 Yrs Panel Output Guarantee | 5 Yrs Inverter OEM Warranty
                                </div>
                              )}
                            </td>
                            {formData.show_hsn_code && (
                              <td className="p-1.5 text-center font-mono text-[9px]">{formData.kit_hsn_code}</td>
                            )}
                            <td className="p-1.5 text-center font-bold">1 Kit</td>
                            <td className="p-1.5 text-right font-mono">₹{invoiceCalculations.baseRate.toLocaleString('en-IN')}</td>
                            <td className="p-1.5 text-right font-mono font-bold">₹{invoiceCalculations.baseRate.toLocaleString('en-IN')}</td>
                            <td className="p-1.5 text-right font-mono font-bold text-slate-900">
                              ₹{invoiceCalculations.grandTotal.toLocaleString('en-IN')}
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>

                    {/* Tax Breakdown & Grand Total */}
                    <div className="grid grid-cols-2 gap-3 pt-1">
                      <div className="space-y-1 text-[9px]">
                        <div className="p-2 bg-slate-50 rounded-lg border border-slate-200 space-y-0.5">
                          <span className="font-bold text-slate-700 block uppercase">Settlement Bank Details:</span>
                          <div><strong>Bank:</strong> {formData.bank_name || 'HDFC Bank Ltd'}</div>
                          <div><strong>A/C:</strong> <span className="font-mono font-bold">{formData.bank_account_number}</span></div>
                          <div><strong>IFSC:</strong> <span className="font-mono">{formData.bank_ifsc}</span></div>
                          <div><strong>UPI ID:</strong> <span className="font-mono text-blue-700">{formData.upi_id}</span></div>
                        </div>
                      </div>

                      <div className="space-y-1 text-[10px]">
                        <div className="flex justify-between text-slate-600">
                          <span>Taxable Amount:</span>
                          <span className="font-mono font-bold">₹{invoiceCalculations.baseRate.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                        </div>
                        <div className="flex justify-between text-slate-600">
                          <span>CGST ({invoiceCalculations.cgstPct}%):</span>
                          <span className="font-mono">₹{invoiceCalculations.cgstAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                        </div>
                        <div className="flex justify-between text-slate-600">
                          <span>SGST ({invoiceCalculations.sgstPct}%):</span>
                          <span className="font-mono">₹{invoiceCalculations.sgstAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                        </div>
                        <div className="pt-1 border-t-2 border-slate-900 flex justify-between font-black text-xs text-slate-900">
                          <span>Grand Total (INR):</span>
                          <span className="font-mono text-emerald-700">₹{invoiceCalculations.grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                        </div>
                      </div>
                    </div>

                    {/* Terms & Conditions (Footer) */}
                    <div className="pt-2 border-t border-slate-200 text-[9px]">
                      <span className="font-bold text-slate-700 block mb-0.5">Terms & Conditions:</span>
                      <ol className="list-decimal pl-3 space-y-0.5 text-slate-600 leading-tight">
                        {formData.terms_and_conditions.map((term, i) => (
                          <li key={i}>{term}</li>
                        ))}
                      </ol>
                    </div>

                    {/* Authorized Signatory Block (Right) */}
                    <div className="pt-3 border-t border-slate-200 flex items-end justify-between">
                      <div className="text-[9px] text-slate-400">
                        This is a computer-generated tax invoice verified under Section 31 of CGST Act 2017.
                      </div>

                      <div className="text-center space-y-1">
                        <div className="text-[9px] font-bold text-slate-700">
                          For {formData.company_name}
                        </div>
                        
                        {/* Stamp & Signature Image / Graphic */}
                        <div className="h-14 flex items-center justify-center my-0.5">
                          {formData.signature_stamp_url ? (
                            <img
                              src={formData.signature_stamp_url}
                              alt="Official Stamp & Signature"
                              className="h-12 max-w-[120px] object-contain opacity-90"
                              onError={(e) => { e.target.style.display = 'none'; }}
                            />
                          ) : (
                            <div className="border-2 border-dashed border-blue-600 rounded-full w-14 h-14 flex flex-col items-center justify-center text-[7px] text-blue-700 font-bold rotate-[-6deg] bg-blue-50/50">
                              <span>SOLARKITS</span>
                              <span className="text-[6px]">VERIFIED</span>
                              <span>SEAL</span>
                            </div>
                          )}
                        </div>

                        <div className="font-bold text-[10px] text-slate-900 border-t border-slate-300 pt-0.5">
                          {formData.signatory_name || 'Authorized Signatory'}
                        </div>
                        <div className="text-[9px] text-slate-500">
                          {formData.signatory_designation || 'Accounts & Finance Officer'}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="p-3 bg-blue-50/70 rounded-xl border border-blue-200/70 text-xs text-blue-900 leading-relaxed">
                  <strong>💡 Statutory Guarantee:</strong> The generated invoice header and line items strictly follow Section 31 of CGST Act 2017 with place of supply, GSTIN, HSN, and state codes printed.
                </div>
              </div>
            </div>
          )}

          {/* ════ TAB 2: INVOICE NUMBERING & FY SERIES ════ */}
          {activeTab === 'numbering' && (
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-6 animate-in fade-in duration-300">
              <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                    <FaReceipt className="text-orange-500" /> Invoice Numbering Series & Financial Year Rules
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">Control how sales tax invoices are numbered and reset every financial year.</p>
                </div>
                <span className="px-3 py-1 bg-emerald-50 text-emerald-700 text-xs font-bold rounded-lg border border-emerald-200 font-mono">
                  Sample: {livePreviewInvoice}
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
                <div>
                  <label className="text-xs font-bold text-slate-600 mb-1 block">Invoice Prefix *</label>
                  <CustomInput
                    value={formData.invoice_prefix}
                    onChange={(e) => setFormData({ ...formData, invoice_prefix: e.target.value.toUpperCase() })}
                    placeholder="e.g. SK, INV"
                  />
                  <span className="text-[10px] text-slate-400 mt-1 block">Prefix attached before invoice number</span>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-600 mb-1 block">Financial Year Token</label>
                  <select
                    value={formData.financial_year_format}
                    onChange={(e) => setFormData({ ...formData, financial_year_format: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 text-xs font-bold rounded-xl px-3 py-2.5 focus:outline-none"
                  >
                    <option value="YYYY-YY">YYYY-YY (e.g. 2026-27)</option>
                    <option value="YYYY-YYYY">YYYY-YYYY (e.g. 2026-2027)</option>
                    <option value="YY-YY">YY-YY (e.g. 26-27)</option>
                    <option value="NONE">None (Do not include FY)</option>
                  </select>
                  <span className="text-[10px] text-slate-400 mt-1 block">Automatically computes based on April 1st</span>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-600 mb-1 block">Current Sequence Counter</label>
                  <CustomInput
                    type="number"
                    value={formData.current_invoice_sequence}
                    onChange={(e) => setFormData({ ...formData, current_invoice_sequence: parseInt(e.target.value) || 1 })}
                    placeholder="1000"
                  />
                  <span className="text-[10px] text-slate-400 mt-1 block">Next generated invoice will use this number</span>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-600 mb-1 block">Sequence Digits Padding</label>
                  <select
                    value={formData.sequence_padding}
                    onChange={(e) => setFormData({ ...formData, sequence_padding: parseInt(e.target.value) })}
                    className="w-full bg-slate-50 border border-slate-300 text-xs font-bold rounded-xl px-3 py-2.5 focus:outline-none"
                  >
                    <option value={3}>3 Digits (e.g. 001)</option>
                    <option value={4}>4 Digits (e.g. 0001)</option>
                    <option value={5}>5 Digits (e.g. 00001)</option>
                    <option value={6}>6 Digits (e.g. 000001)</option>
                  </select>
                  <span className="text-[10px] text-slate-400 mt-1 block">Zero-padding for numbers</span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-slate-100">
                <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-200">
                  <div>
                    <h4 className="text-xs font-bold text-slate-800">Prevent Duplicate Numbers</h4>
                    <p className="text-[11px] text-slate-500">Guarantees in database that no two invoices can ever share the same number.</p>
                  </div>
                  <ToggleButton
                    checked={formData.prevent_duplicate_numbers}
                    onChange={(val) => setFormData({ ...formData, prevent_duplicate_numbers: val })}
                  />
                </div>

                <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-200">
                  <div>
                    <h4 className="text-xs font-bold text-slate-800">Allow Manual Regeneration by Accounts</h4>
                    <p className="text-[11px] text-slate-500">Permits authorized Accounts executives to re-print or re-issue with audit log.</p>
                  </div>
                  <ToggleButton
                    checked={formData.allow_manual_regeneration}
                    onChange={(val) => setFormData({ ...formData, allow_manual_regeneration: val })}
                  />
                </div>
              </div>

              <div className="flex justify-end pt-4">
                <Button
                  type="button"
                  onClick={handleSaveSettings}
                  disabled={saving}
                  className="bg-orange-500 hover:bg-orange-600 text-white font-bold px-6 py-2.5 rounded-xl shadow-md text-xs"
                >
                  Save Numbering Settings
                </Button>
              </div>
            </div>
          )}

          {/* ════ TAB 3: GENERATION TIMING TRIGGERS ════ */}
          {activeTab === 'timing' && (
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-6 animate-in fade-in duration-300">
              <div className="border-b border-slate-100 pb-3">
                <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                  <FaCalendarAlt className="text-orange-500" /> Automated Invoice Generation Trigger Timing
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">Define at what exact moment during the order lifecycle the GST Invoice is officially issued.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {[
                  {
                    key: 'warehouse_dispatch',
                    title: 'At Warehouse Dispatch (Recommended)',
                    badge: 'Standard Practice',
                    badgeColor: 'bg-emerald-100 text-emerald-800',
                    desc: 'Invoice is created when the material is loaded on the truck. E-Way Bill and GST Invoice are issued together with verified component serial numbers.',
                  },
                  {
                    key: 'payment_received',
                    title: 'At Payment Received / PG Success',
                    badge: 'Early Billing',
                    badgeColor: 'bg-blue-100 text-blue-800',
                    desc: 'Generated immediately after Razorpay/ICICI webhook confirms payment or Accounts verifies bank transaction.',
                  },
                  {
                    key: 'order_confirmed',
                    title: 'At Order Confirmation',
                    badge: 'Advance Booking',
                    badgeColor: 'bg-purple-100 text-purple-800',
                    desc: 'Generated the moment EPC confirms order. Suitable for advance proforma or immediate booking structures.',
                  },
                  {
                    key: 'delivery_confirmed',
                    title: 'At Delivery Confirmation',
                    badge: 'Post Delivery',
                    badgeColor: 'bg-amber-100 text-amber-800',
                    desc: 'Generated only when customer signs delivery receipt and confirms stock inward.',
                  },
                  {
                    key: 'manual',
                    title: 'Manual Mode by Accounts',
                    badge: 'Manual Control',
                    badgeColor: 'bg-slate-100 text-slate-800',
                    desc: 'System keeps orders in Draft Invoice state. Authorized Accounts user must manually click "Generate Invoice".',
                  },
                ].map((trigger) => {
                  const isSelected = formData.invoice_generation_trigger === trigger.key;
                  return (
                    <div
                      key={trigger.key}
                      onClick={() => setFormData({ ...formData, invoice_generation_trigger: trigger.key })}
                      className={`cursor-pointer rounded-2xl p-5 border-2 transition-all flex flex-col justify-between ${
                        isSelected
                          ? 'border-orange-500 bg-orange-50/30 shadow-md ring-2 ring-orange-400/20'
                          : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-xs'
                      }`}
                    >
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className={`text-[10px] font-black px-2 py-0.5 rounded-full uppercase ${trigger.badgeColor}`}>
                            {trigger.badge}
                          </span>
                          <span className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                            isSelected ? 'border-orange-500 bg-orange-500' : 'border-slate-300'
                          }`}>
                            {isSelected && <FaCheckCircle className="text-white text-[10px]" />}
                          </span>
                        </div>
                        <h4 className="font-bold text-slate-900 text-sm">{trigger.title}</h4>
                        <p className="text-xs text-slate-600 leading-relaxed">{trigger.desc}</p>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="flex justify-end pt-4">
                <Button
                  type="button"
                  onClick={handleSaveSettings}
                  disabled={saving}
                  className="bg-orange-500 hover:bg-orange-600 text-white font-bold px-6 py-2.5 rounded-xl shadow-md text-xs"
                >
                  Save Timing Rules
                </Button>
              </div>
            </div>
          )}

          {/* ════ TAB 4: DELIVERY ORDER (DO) FORMAT ════ */}
          {activeTab === 'do_settings' && (
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-6 animate-in fade-in duration-300">
              <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                    <FaTruck className="text-orange-500" /> Delivery Order (DO) Numbering & Dispatch Authorization
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">Control internal warehouse dispatch authorization challans and numbering series.</p>
                </div>
                <span className="px-3 py-1 bg-amber-50 text-amber-700 text-xs font-bold rounded-lg border border-amber-200 font-mono">
                  Sample: {livePreviewDo}
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                <div>
                  <label className="text-xs font-bold text-slate-600 mb-1 block">DO Prefix</label>
                  <CustomInput
                    value={formData.do_prefix}
                    onChange={(e) => setFormData({ ...formData, do_prefix: e.target.value.toUpperCase() })}
                    placeholder="DO"
                  />
                  <span className="text-[10px] text-slate-400 mt-1 block">Default prefix for Delivery Orders</span>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-600 mb-1 block">DO Numbering Template</label>
                  <CustomInput
                    value={formData.do_numbering_format}
                    onChange={(e) => setFormData({ ...formData, do_numbering_format: e.target.value })}
                    placeholder="{PREFIX}-{WH}-{YYMM}-{SEQ}"
                  />
                  <span className="text-[10px] text-slate-400 mt-1 block">Tokens: {'{PREFIX}'}, {'{WH}'}, {'{YYMM}'}, {'{SEQ}'}</span>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-600 mb-1 block">Current DO Sequence Counter</label>
                  <CustomInput
                    type="number"
                    value={formData.current_do_sequence}
                    onChange={(e) => setFormData({ ...formData, current_do_sequence: parseInt(e.target.value) || 1 })}
                    placeholder="100"
                  />
                  <span className="text-[10px] text-slate-400 mt-1 block">Incremental counter for next DO</span>
                </div>
              </div>

              {/* Security & Operational Rules */}
              <div className="space-y-4 pt-4 border-t border-slate-100">
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Operational & Safety Rules</h4>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-800">Auto-Generate DO on Payment</span>
                      <ToggleButton
                        checked={formData.auto_generate_do_on_payment}
                        onChange={(val) => setFormData({ ...formData, auto_generate_do_on_payment: val })}
                      />
                    </div>
                    <p className="text-[11px] text-slate-500">Automatically creates DO in warehouse queue when payment is verified.</p>
                  </div>

                  <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-800">Cluster Staffing Gate</span>
                      <ToggleButton
                        checked={formData.require_cluster_staff_assignment}
                        onChange={(val) => setFormData({ ...formData, require_cluster_staff_assignment: val })}
                      />
                    </div>
                    <p className="text-[11px] text-slate-500">Blocks DO dispatch if target cluster has 0 operational staff members assigned.</p>
                  </div>

                  <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-800">Prevent Duplicate DOs</span>
                      <ToggleButton
                        checked={formData.prevent_duplicate_do}
                        onChange={(val) => setFormData({ ...formData, prevent_duplicate_do: val })}
                      />
                    </div>
                    <p className="text-[11px] text-slate-500">Enforces uniqueness per warehouse facility to avoid double delivery releases.</p>
                  </div>
                </div>
              </div>

              <div className="flex justify-end pt-4">
                <Button
                  type="button"
                  onClick={handleSaveSettings}
                  disabled={saving}
                  className="bg-orange-500 hover:bg-orange-600 text-white font-bold px-6 py-2.5 rounded-xl shadow-md text-xs"
                >
                  Save DO Settings
                </Button>
              </div>
            </div>
          )}

          {/* ════ TAB 5: OVERRIDES OVERVIEW ════ */}
          {activeTab === 'scopes' && (
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-6 animate-in fade-in duration-300">
              <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                    <FaSlidersH className="text-orange-500" /> Configured Invoice & DO Overrides
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">List of custom invoice series and GST templates configured across warehouses.</p>
                </div>
              </div>

              {allScopeSettings.length === 0 ? (
                <div className="p-8 text-center text-slate-400 text-xs">No custom overrides configured yet. Global settings are active platform-wide.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 text-slate-500 font-bold bg-slate-50">
                        <th className="p-3">Scope Type</th>
                        <th className="p-3">Scope / Facility Name</th>
                        <th className="p-3">Invoice Prefix</th>
                        <th className="p-3">GSTIN</th>
                        <th className="p-3">State</th>
                        <th className="p-3">Updated By</th>
                        <th className="p-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                      {allScopeSettings.map((s) => (
                        <tr key={s._id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="p-3">
                            <span className={`inline-flex px-2 py-0.5 rounded-md font-bold text-[10px] uppercase ${
                              s.scope_type === 'global' ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'
                            }`}>
                              {s.scope_type}
                            </span>
                          </td>
                          <td className="p-3 font-bold text-slate-900">{s.scope_name}</td>
                          <td className="p-3 font-mono font-bold text-emerald-600">{s.invoice_prefix}</td>
                          <td className="p-3 font-mono">{s.gstin || 'Default'}</td>
                          <td className="p-3">{s.state_name || 'All India'}</td>
                          <td className="p-3 text-slate-500">{s.updated_by_name || 'Admin'}</td>
                          <td className="p-3 text-right">
                            {s.scope_type !== 'global' && (
                              <button
                                type="button"
                                onClick={() => handleDeleteScope(s._id, s.scope_name)}
                                className="text-red-500 hover:text-red-700 font-bold text-xs"
                              >
                                Revert to Global
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
