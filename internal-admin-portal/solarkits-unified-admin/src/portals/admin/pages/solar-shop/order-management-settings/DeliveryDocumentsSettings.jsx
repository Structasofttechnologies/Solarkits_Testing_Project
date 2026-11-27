import React, { useState, useEffect, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import axios from 'axios';
import {
  FaTruck,
  FaFileAlt,
  FaQrcode,
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
  FaEye,
  FaStamp,
  FaCamera,
  FaMobileAlt,
  FaCheck,
  FaTimes,
  FaSignature,
  FaBoxes,
  FaSolarPanel,
  FaClipboardCheck,
  FaKey,
  FaFileSignature
} from 'react-icons/fa';
import { FiSliders, FiCheckSquare, FiAlertCircle } from 'react-icons/fi';
import { setAlert } from '@/features/alert.slice';
import Button from '@/components/Button';
import Loader from '@/components/Loader';
import CustomInput from '@/components/CustomInput';
import ToggleButton from '@/components/ToggleButton';
import { authHeaderObj } from '@/app/authHeader';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export default function DeliveryDocumentsSettings() {
  const dispatch = useDispatch();
  const token = useSelector((state) => state.auth?.token);

  const [activeTab, setActiveTab] = useState('schedule'); // 'schedule' | 'driver_acceptance' | 'pod' | 'inspection' | 'preview'
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Scope & Warehouse State
  const [selectedScopeType, setSelectedScopeType] = useState('global');
  const [warehouses, setWarehouses] = useState([]);
  const [selectedWarehouseId, setSelectedWarehouseId] = useState('');
  const [allScopes, setAllScopes] = useState([]);

  // Live recent orders for 100% dynamic simulation
  const [recentOrders, setRecentOrders] = useState([]);
  const [selectedOrderId, setSelectedOrderId] = useState('');

  // Preview simulator states
  const [previewMode, setPreviewMode] = useState('document'); // 'document' | 'mobile_otp' | 'mobile_photo'
  const [simulatedOtp, setSimulatedOtp] = useState('');
  const [simulatedOtpVerified, setSimulatedOtpVerified] = useState(false);
  const [simulatedPhotoUploaded, setSimulatedPhotoUploaded] = useState(false);
  const [simulatedBypassReason, setSimulatedBypassReason] = useState('No Network / Phone Unreachable at Site');

  // Main Form Settings State
  const [formData, setFormData] = useState({
    scope_type: 'global',
    scope_id: null,
    scope_name: 'All India (Global Default)',
    is_active: true,

    // Document 1: Delivery Schedule & Dispatch Plan
    doc_schedule: {
      is_enabled: true,
      is_mandatory: true,
      title: 'Delivery Schedule & Dispatch Order',
      code: 'DEL_DOC_SCHEDULE',
      party_type: 'system',
      generation_trigger: 'dispatched',
      auto_generate_pdf: true,
      include_qr_code: true,
      include_item_specifications: true,
      header_title: 'SOLARKITS DISPATCH & DELIVERY SCHEDULE',
      terms_and_conditions: [
        'Consignee must verify outer packaging, carton integrity, and seal numbers before unloading.',
        'Any in-transit breakage, physical transit damage, or package discrepancy must be noted immediately on the Handover Checklist.',
        'Delivery is deemed complete only after physical verification and signing of POD & Material Inspection.',
        'All disputes are subject to the jurisdiction of the dispatching warehouse state.',
      ],
    },

    // Document 2: Driver Acceptance & LR Bilty
    doc_driver_acceptance: {
      is_enabled: true,
      is_mandatory: true,
      title: 'Driver Delivery Acceptance & LR Bilty Form',
      code: 'DEL_DOC_DRIVER_ACCEPTANCE',
      party_type: 'driver',
      stage_trigger: 'loading',
      require_driver_license: true,
      require_odometer_start: true,
      require_vehicle_fitment_check: true,
      require_seal_number: true,
      declaration_text:
        'I hereby declare that I have physically inspected and safely loaded all solar kits, panels, inverters, and BOS items listed herein in sound condition and accept full transit custody.',
    },

    // Document 3: Proof of Delivery (POD) & Dual Verification
    doc_pod: {
      is_enabled: true,
      is_mandatory: true,
      title: 'Proof of Delivery (POD) & Receiving Acknowledgment',
      code: 'DEL_DOC_POD',
      party_type: 'buyer',
      stage_trigger: 'delivered',
      allow_otp_verification: true,
      allow_manual_photo_verification: true,
      default_verification_mode: 'either',
      require_site_cargo_photo: true,
      require_signed_paper_photo: true,
      require_receiver_stamp: false,
      otp_bypass_reasons: [
        'No Network / Phone Unreachable at Site',
        'Customer Phone Switched Off / Battery Dead',
        'Customer Requested Physical Paper Sign & Stamp',
        'Emergency Unloading / Rush Site Condition',
      ],
      acknowledgment_text:
        'We hereby acknowledge receipt of the consignment in stated quantity and outer packing condition. Physical inspection report attached.',
    },

    // Document 4: Material Inspection & Handover
    doc_inspection_handover: {
      is_enabled: true,
      is_mandatory: true,
      title: 'Material Inspection & Handover Checklist',
      code: 'DEL_DOC_INSPECTION_HANDOVER',
      party_type: 'joint',
      stage_trigger: 'delivered',
      check_panel_cracks: true,
      check_panel_count: true,
      check_inverter_serial: true,
      check_inverter_seal: true,
      check_bos_cables_earthing: true,
      check_structure_hdg: true,
      allow_damage_shortage_logging: true,
      require_damage_photos: true,
      disclaimer_text:
        'Any transit damages or component shortages must be logged on this inspection checklist at the time of unloading and signed by both the consignee and the driver.',
    },

    // Branding & Header
    company_name: 'SolarKits Energy Private Limited',
    trade_name: 'SolarKits India',
    support_phone: '+91 92748 63608',
    support_email: 'support@solarkits.in',
    logo_url: '',
    signatory_name: 'Authorized Logistics Officer',
    signatory_designation: 'Supply Chain & Logistics Lead',
  });

  const [newTerm, setNewTerm] = useState('');
  const [newBypassReason, setNewBypassReason] = useState('');

  // Headers helper
  const getHeaders = () => ({
    ...authHeaderObj(),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  });

  // Fetch Settings
  const fetchSettings = async (scopeType = selectedScopeType, scopeId = selectedWarehouseId) => {
    try {
      setLoading(true);
      let url = `${API_BASE}/delivery-document-settings?scope_type=${scopeType}`;
      if (scopeType === 'warehouse' && scopeId) {
        url += `&scope_id=${scopeId}`;
      }
      const res = await axios.get(url, { headers: getHeaders() });
      if (res.data?.status === 'success' && res.data.data) {
        setFormData((prev) => ({
          ...prev,
          ...res.data.data,
        }));
      }
    } catch (err) {
      console.error('Error fetching delivery document settings:', err);
      dispatch(
        setAlert({
          type: 'danger',
          message: 'Failed to load delivery document settings. Loaded defaults.',
        })
      );
    } finally {
      setLoading(false);
    }
  };

  // Fetch Warehouses & Scopes & Live Orders
  const fetchWarehousesAndScopes = async () => {
    try {
      const [whRes, scRes, ordRes] = await Promise.all([
        axios.get(`${API_BASE}/delivery-document-settings/warehouses`, { headers: getHeaders() }).catch(() => ({ data: { data: [] } })),
        axios.get(`${API_BASE}/delivery-document-settings/scopes`, { headers: getHeaders() }).catch(() => ({ data: { data: [] } })),
        axios.get(`${API_BASE}/delivery-document-settings/recent-orders`, { headers: getHeaders() }).catch(() => ({ data: { data: [] } })),
      ]);
      if (whRes.data?.data) {
        setWarehouses(whRes.data.data);
      }
      if (scRes.data?.data) {
        setAllScopes(scRes.data.data);
      }
      if (ordRes.data?.data && ordRes.data.data.length > 0) {
        setRecentOrders(ordRes.data.data);
        setSelectedOrderId(ordRes.data.data[0]._id);
      }
    } catch (e) {
      console.error('Failed to load warehouses / scopes / orders:', e);
    }
  };

  const activeWh = useMemo(() => {
    if (selectedScopeType === 'warehouse' && selectedWarehouseId) {
      return warehouses.find((w) => String(w._id) === String(selectedWarehouseId)) || warehouses[0] || null;
    }
    return warehouses[0] || null;
  }, [warehouses, selectedScopeType, selectedWarehouseId]);

  const selectedOrder = useMemo(() => {
    if (selectedOrderId) {
      return recentOrders.find((o) => String(o._id) === String(selectedOrderId)) || null;
    }
    return recentOrders[0] || null;
  }, [recentOrders, selectedOrderId]);

  useEffect(() => {
    fetchWarehousesAndScopes();
    fetchSettings('global', null);
  }, []);

  const handleScopeChange = (type, whId = null) => {
    setSelectedScopeType(type);
    if (type === 'warehouse') {
      setSelectedWarehouseId(whId || warehouses[0]?._id || '');
      fetchSettings('warehouse', whId || warehouses[0]?._id || '');
    } else {
      setSelectedWarehouseId('');
      fetchSettings('global', null);
    }
  };

  // Save Settings
  const handleSave = async () => {
    try {
      setSaving(true);
      const payload = {
        ...formData,
        scope_type: selectedScopeType,
        scope_id: selectedScopeType === 'warehouse' ? selectedWarehouseId : null,
        scope_name:
          selectedScopeType === 'warehouse'
            ? warehouses.find((w) => w._id === selectedWarehouseId)?.name || 'Warehouse Specific'
            : 'All India (Global Default)',
      };

      const res = await axios.post(`${API_BASE}/delivery-document-settings`, payload, {
        headers: getHeaders(),
      });

      if (res.data?.status === 'success') {
        dispatch(
          setAlert({
            type: 'success',
            message: 'Delivery document settings saved successfully!',
          })
        );
        fetchWarehousesAndScopes();
      }
    } catch (err) {
      console.error('Error saving settings:', err);
      dispatch(
        setAlert({
          type: 'danger',
          message: err.response?.data?.message || 'Failed to save delivery document settings',
        })
      );
    } finally {
      setSaving(false);
    }
  };

  // Terms helpers
  const handleAddTerm = () => {
    if (!newTerm.trim()) return;
    setFormData((prev) => ({
      ...prev,
      doc_schedule: {
        ...prev.doc_schedule,
        terms_and_conditions: [...(prev.doc_schedule.terms_and_conditions || []), newTerm.trim()],
      },
    }));
    setNewTerm('');
  };

  const handleRemoveTerm = (index) => {
    setFormData((prev) => ({
      ...prev,
      doc_schedule: {
        ...prev.doc_schedule,
        terms_and_conditions: prev.doc_schedule.terms_and_conditions.filter((_, i) => i !== index),
      },
    }));
  };

  // Bypass reason helpers
  const handleAddBypassReason = () => {
    if (!newBypassReason.trim()) return;
    setFormData((prev) => ({
      ...prev,
      doc_pod: {
        ...prev.doc_pod,
        otp_bypass_reasons: [...(prev.doc_pod.otp_bypass_reasons || []), newBypassReason.trim()],
      },
    }));
    setNewBypassReason('');
  };

  const handleRemoveBypassReason = (index) => {
    setFormData((prev) => ({
      ...prev,
      doc_pod: {
        ...prev.doc_pod,
        otp_bypass_reasons: prev.doc_pod.otp_bypass_reasons.filter((_, i) => i !== index),
      },
    }));
  };

  // Calculation of stats
  const activeDocsCount = useMemo(() => {
    let count = 0;
    if (formData.doc_schedule?.is_enabled) count++;
    if (formData.doc_driver_acceptance?.is_enabled) count++;
    if (formData.doc_pod?.is_enabled) count++;
    if (formData.doc_inspection_handover?.is_enabled) count++;
    return count;
  }, [formData]);

  return (
    <div className="p-4 md:p-6 bg-slate-50 min-h-screen">
      {/* Top Header */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm mb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-1 bg-amber-100 text-amber-800 text-xs font-semibold rounded-full flex items-center gap-1.5">
              <FaTruck className="text-amber-600" /> Delivery Management
            </span>
            <span className="px-2.5 py-1 bg-blue-100 text-blue-800 text-xs font-semibold rounded-full flex items-center gap-1">
              <FaShieldAlt className="text-blue-600" /> Dual Verification (OTP + Photo Proof)
            </span>
          </div>
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight flex items-center gap-2.5">
            <FaFileAlt className="text-amber-500" /> Delivery Documents Settings
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Configure dynamic delivery manifests, driver LR acceptance, proof of delivery (POD), and material inspection checklists.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            type="button"
            className="px-4 py-2 border border-slate-300 text-slate-700 hover:bg-slate-100 text-sm font-medium rounded-lg flex items-center gap-2 transition"
            onClick={() => fetchSettings(selectedScopeType, selectedWarehouseId)}
            disabled={loading || saving}
          >
            <FaSyncAlt className={loading ? 'animate-spin' : ''} /> Refresh
          </Button>
          <Button
            type="button"
            className="px-5 py-2 bg-amber-500 hover:bg-amber-600 text-white text-sm font-semibold rounded-lg shadow-sm flex items-center gap-2 transition"
            onClick={handleSave}
            disabled={saving}
          >
            <FaSave /> {saving ? 'Saving...' : 'Save Settings'}
          </Button>
        </div>
      </div>

      {/* Scope Selector Bar */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3 flex-wrap">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Configuration Scope:</span>
          <div className="inline-flex rounded-lg border border-slate-200 p-1 bg-slate-100/70">
            <button
              type="button"
              onClick={() => handleScopeChange('global')}
              className={`px-3.5 py-1.5 rounded-md text-xs font-semibold transition flex items-center gap-2 ${
                selectedScopeType === 'global'
                  ? 'bg-white text-slate-800 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <FaGlobe className={selectedScopeType === 'global' ? 'text-amber-500' : 'text-slate-400'} />
              Global Default (All India)
            </button>
            <button
              type="button"
              onClick={() => handleScopeChange('warehouse')}
              className={`px-3.5 py-1.5 rounded-md text-xs font-semibold transition flex items-center gap-2 ${
                selectedScopeType === 'warehouse'
                  ? 'bg-white text-slate-800 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <FaWarehouse className={selectedScopeType === 'warehouse' ? 'text-blue-500' : 'text-slate-400'} />
              Warehouse Specific
            </button>
          </div>

          {selectedScopeType === 'warehouse' && (
            <select
              value={selectedWarehouseId}
              onChange={(e) => handleScopeChange('warehouse', e.target.value)}
              className="text-xs font-medium border border-slate-300 rounded-lg px-3 py-1.5 bg-white text-slate-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
            >
              {warehouses.map((wh) => (
                <option key={wh._id} value={wh._id}>
                  {wh.name} ({wh.city || wh.state_name || 'Hub'})
                </option>
              ))}
            </select>
          )}
        </div>

        {/* Stats Pill */}
        <div className="flex items-center gap-2">
          <div className="text-xs text-slate-600 bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200 font-medium flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            <span>Active Documents: <strong>{activeDocsCount} / 4</strong></span>
          </div>
          <div className="text-xs text-slate-600 bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200 font-medium flex items-center gap-2">
            <FaCheckCircle className="text-blue-500 text-xs" />
            <span>Fallback: <strong>Photo Upload Active</strong></span>
          </div>
        </div>
      </div>

      {/* Main Tabs Navigation */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 mb-6 border-b border-slate-200">
        <button
          onClick={() => setActiveTab('schedule')}
          className={`px-4 py-2.5 rounded-t-lg font-medium text-sm flex items-center gap-2 whitespace-nowrap transition border-b-2 ${
            activeTab === 'schedule'
              ? 'border-amber-500 text-amber-600 bg-white font-semibold shadow-sm'
              : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-100/60'
          }`}
        >
          <FaFileAlt /> 1. Delivery Schedule & Dispatch
          {formData.doc_schedule?.is_enabled && (
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('driver_acceptance')}
          className={`px-4 py-2.5 rounded-t-lg font-medium text-sm flex items-center gap-2 whitespace-nowrap transition border-b-2 ${
            activeTab === 'driver_acceptance'
              ? 'border-amber-500 text-amber-600 bg-white font-semibold shadow-sm'
              : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-100/60'
          }`}
        >
          <FaTruck /> 2. Driver Acceptance & LR
          {formData.doc_driver_acceptance?.is_enabled && (
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('pod')}
          className={`px-4 py-2.5 rounded-t-lg font-medium text-sm flex items-center gap-2 whitespace-nowrap transition border-b-2 ${
            activeTab === 'pod'
              ? 'border-amber-500 text-amber-600 bg-white font-semibold shadow-sm'
              : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-100/60'
          }`}
        >
          <FaClipboardCheck /> 3. Proof of Delivery (POD)
          <span className="px-1.5 py-0.5 bg-blue-100 text-blue-700 text-[10px] rounded font-bold">Dual Mode</span>
        </button>

        <button
          onClick={() => setActiveTab('inspection')}
          className={`px-4 py-2.5 rounded-t-lg font-medium text-sm flex items-center gap-2 whitespace-nowrap transition border-b-2 ${
            activeTab === 'inspection'
              ? 'border-amber-500 text-amber-600 bg-white font-semibold shadow-sm'
              : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-100/60'
          }`}
        >
          <FiCheckSquare /> 4. Material Inspection
          {formData.doc_inspection_handover?.is_enabled && (
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('preview')}
          className={`px-4 py-2.5 rounded-t-lg font-medium text-sm flex items-center gap-2 whitespace-nowrap transition border-b-2 ${
            activeTab === 'preview'
              ? 'border-amber-500 text-amber-600 bg-white font-semibold shadow-sm'
              : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-100/60'
          }`}
        >
          <FaEye /> 5. Live Preview & Simulator
        </button>
      </div>

      {loading ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
          <Loader text="Loading Delivery Documents Settings..." />
        </div>
      ) : (
        <div className="space-y-6">
          {/* TAB 1: Delivery Schedule & Dispatch Plan */}
          {activeTab === 'schedule' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 space-y-6">
                <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
                  <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4">
                    <div>
                      <h3 className="font-semibold text-slate-800 text-base flex items-center gap-2">
                        <FaFileAlt className="text-amber-500" /> Document Configuration
                      </h3>
                      <p className="text-xs text-slate-500">Auto-generated manifest ready for 1-click download when order is dispatched.</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-semibold text-slate-600">Document Enabled:</span>
                      <ToggleButton
                        checked={formData.doc_schedule?.is_enabled}
                        onChange={(val) =>
                          setFormData((prev) => ({
                            ...prev,
                            doc_schedule: { ...prev.doc_schedule, is_enabled: val },
                          }))
                        }
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1">Document Display Title</label>
                      <input
                        type="text"
                        value={formData.doc_schedule?.title || ''}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            doc_schedule: { ...prev.doc_schedule, title: e.target.value },
                          }))
                        }
                        className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-amber-500 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1">Internal Document Code</label>
                      <input
                        type="text"
                        value={formData.doc_schedule?.code || ''}
                        disabled
                        className="w-full text-sm border border-slate-200 bg-slate-100 rounded-lg px-3 py-2 text-slate-500 cursor-not-allowed"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1">Generation Trigger Stage</label>
                      <select
                        value={formData.doc_schedule?.generation_trigger || 'dispatched'}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            doc_schedule: { ...prev.doc_schedule, generation_trigger: e.target.value },
                          }))
                        }
                        className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 bg-white focus:ring-2 focus:ring-amber-500 focus:outline-none"
                      >
                        <option value="ready_for_dispatch">Ready for Dispatch (Vehicle Assigned)</option>
                        <option value="dispatched">Dispatched (Loading Completed)</option>
                        <option value="vehicle_assigned">Immediately on Vehicle Allocation</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1">Header Title on PDF</label>
                      <input
                        type="text"
                        value={formData.doc_schedule?.header_title || ''}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            doc_schedule: { ...prev.doc_schedule, header_title: e.target.value },
                          }))
                        }
                        className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-amber-500 focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="mt-5 pt-4 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <label className="flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.doc_schedule?.is_mandatory}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            doc_schedule: { ...prev.doc_schedule, is_mandatory: e.target.checked },
                          }))
                        }
                        className="rounded text-amber-500 focus:ring-amber-400"
                      />
                      <span>Mandatory for Dispatch</span>
                    </label>

                    <label className="flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.doc_schedule?.include_qr_code}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            doc_schedule: { ...prev.doc_schedule, include_qr_code: e.target.checked },
                          }))
                        }
                        className="rounded text-amber-500 focus:ring-amber-400"
                      />
                      <span>Include Tracking QR Code</span>
                    </label>

                    <label className="flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.doc_schedule?.include_item_specifications}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            doc_schedule: { ...prev.doc_schedule, include_item_specifications: e.target.checked },
                          }))
                        }
                        className="rounded text-amber-500 focus:ring-amber-400"
                      />
                      <span>Show Kit BOM Specifications</span>
                    </label>
                  </div>
                </div>

                {/* Terms and Conditions */}
                <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
                  <h3 className="font-semibold text-slate-800 text-sm mb-2 flex items-center gap-2">
                    <FaInfoCircle className="text-slate-400" /> Dispatch Instructions & Terms
                  </h3>
                  <p className="text-xs text-slate-500 mb-4">
                    Printed at the footer of the generated Delivery Schedule PDF.
                  </p>

                  <div className="space-y-2 mb-4">
                    {(formData.doc_schedule?.terms_and_conditions || []).map((term, idx) => (
                      <div key={idx} className="flex items-center justify-between p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 gap-3">
                        <span className="font-mono text-slate-400 text-[11px]">{idx + 1}.</span>
                        <span className="flex-1">{term}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveTerm(idx)}
                          className="text-rose-500 hover:text-rose-700 p-1 transition"
                        >
                          <FaTrash className="text-xs" />
                        </button>
                      </div>
                    ))}
                  </div>

                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Add a new delivery instruction or condition..."
                      value={newTerm}
                      onChange={(e) => setNewTerm(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddTerm())}
                      className="flex-1 text-xs border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-amber-500 focus:outline-none"
                    />
                    <Button
                      type="button"
                      onClick={handleAddTerm}
                      className="px-3 py-2 bg-slate-800 text-white rounded-lg text-xs font-semibold hover:bg-slate-900 transition flex items-center gap-1.5"
                    >
                      <FaPlus /> Add
                    </Button>
                  </div>
                </div>
              </div>

              {/* Sidebar Quick Summary */}
              <div className="space-y-4">
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                  <h4 className="font-bold text-amber-900 text-xs uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <FaInfoCircle /> Document 1 Flow
                  </h4>
                  <p className="text-xs text-amber-800 leading-relaxed">
                    This document is generated automatically by the backend server when an order is packed and dispatched. It includes warehouse address, vehicle registration, consignee address, and exact itemized weights.
                  </p>
                  <div className="mt-3 text-[11px] text-amber-700 bg-amber-100/60 p-2.5 rounded-lg border border-amber-200">
                    <strong>Responsible Party:</strong> System (Auto-Generated)
                    <br />
                    <strong>Format:</strong> High-resolution Vector PDF
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: Driver Delivery Acceptance & LR Bilty */}
          {activeTab === 'driver_acceptance' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 space-y-6">
                <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
                  <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4">
                    <div>
                      <h3 className="font-semibold text-slate-800 text-base flex items-center gap-2">
                        <FaTruck className="text-blue-500" /> Driver Delivery Acceptance & LR Form
                      </h3>
                      <p className="text-xs text-slate-500">Filled and signed by the transporter/driver at warehouse dispatch pickup.</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-semibold text-slate-600">Document Enabled:</span>
                      <ToggleButton
                        checked={formData.doc_driver_acceptance?.is_enabled}
                        onChange={(val) =>
                          setFormData((prev) => ({
                            ...prev,
                            doc_driver_acceptance: { ...prev.doc_driver_acceptance, is_enabled: val },
                          }))
                        }
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1">Document Display Title</label>
                      <input
                        type="text"
                        value={formData.doc_driver_acceptance?.title || ''}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            doc_driver_acceptance: { ...prev.doc_driver_acceptance, title: e.target.value },
                          }))
                        }
                        className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-amber-500 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1">Internal Code</label>
                      <input
                        type="text"
                        value={formData.doc_driver_acceptance?.code || ''}
                        disabled
                        className="w-full text-sm border border-slate-200 bg-slate-100 rounded-lg px-3 py-2 text-slate-500 cursor-not-allowed"
                      />
                    </div>
                  </div>

                  <div className="border-t border-slate-100 pt-4">
                    <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-3">Driver Checklist Requirements</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <label className="flex items-center gap-2.5 p-3 rounded-lg border border-slate-200 bg-slate-50 cursor-pointer hover:bg-slate-100/50 transition">
                        <input
                          type="checkbox"
                          checked={formData.doc_driver_acceptance?.require_driver_license}
                          onChange={(e) =>
                            setFormData((prev) => ({
                              ...prev,
                              doc_driver_acceptance: { ...prev.doc_driver_acceptance, require_driver_license: e.target.checked },
                            }))
                          }
                          className="rounded text-amber-500"
                        />
                        <div>
                          <p className="text-xs font-semibold text-slate-800">Driver License & Mobile Verification</p>
                          <p className="text-[11px] text-slate-500">Requires recording driver DL number and active mobile phone.</p>
                        </div>
                      </label>

                      <label className="flex items-center gap-2.5 p-3 rounded-lg border border-slate-200 bg-slate-50 cursor-pointer hover:bg-slate-100/50 transition">
                        <input
                          type="checkbox"
                          checked={formData.doc_driver_acceptance?.require_odometer_start}
                          onChange={(e) =>
                            setFormData((prev) => ({
                              ...prev,
                              doc_driver_acceptance: { ...prev.doc_driver_acceptance, require_odometer_start: e.target.checked },
                            }))
                          }
                          className="rounded text-amber-500"
                        />
                        <div>
                          <p className="text-xs font-semibold text-slate-800">Starting Odometer Reading</p>
                          <p className="text-[11px] text-slate-500">Driver logs vehicle odometer reading before leaving warehouse.</p>
                        </div>
                      </label>

                      <label className="flex items-center gap-2.5 p-3 rounded-lg border border-slate-200 bg-slate-50 cursor-pointer hover:bg-slate-100/50 transition">
                        <input
                          type="checkbox"
                          checked={formData.doc_driver_acceptance?.require_vehicle_fitment_check}
                          onChange={(e) =>
                            setFormData((prev) => ({
                              ...prev,
                              doc_driver_acceptance: { ...prev.doc_driver_acceptance, require_vehicle_fitment_check: e.target.checked },
                            }))
                          }
                          className="rounded text-amber-500"
                        />
                        <div>
                          <p className="text-xs font-semibold text-slate-800">Cargo Lashing & Weather Tarp Check</p>
                          <p className="text-[11px] text-slate-500">Confirms solar modules are securely tied with tarpaulin protection.</p>
                        </div>
                      </label>

                      <label className="flex items-center gap-2.5 p-3 rounded-lg border border-slate-200 bg-slate-50 cursor-pointer hover:bg-slate-100/50 transition">
                        <input
                          type="checkbox"
                          checked={formData.doc_driver_acceptance?.require_seal_number}
                          onChange={(e) =>
                            setFormData((prev) => ({
                              ...prev,
                              doc_driver_acceptance: { ...prev.doc_driver_acceptance, require_seal_number: e.target.checked },
                            }))
                          }
                          className="rounded text-amber-500"
                        />
                        <div>
                          <p className="text-xs font-semibold text-slate-800">Vehicle Seal Number Tracking</p>
                          <p className="text-[11px] text-slate-500">Logs tamper-evident container or truck door seal number.</p>
                        </div>
                      </label>
                    </div>
                  </div>

                  <div className="mt-4 pt-4 border-t border-slate-100">
                    <label className="block text-xs font-medium text-slate-700 mb-1">Driver Legal Declaration Statement</label>
                    <textarea
                      rows={3}
                      value={formData.doc_driver_acceptance?.declaration_text || ''}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          doc_driver_acceptance: { ...prev.doc_driver_acceptance, declaration_text: e.target.value },
                        }))
                      }
                      className="w-full text-xs border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-amber-500 focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Sidebar Quick Summary */}
              <div className="space-y-4">
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                  <h4 className="font-bold text-blue-900 text-xs uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <FaTruck /> Transporter Custody Handover
                  </h4>
                  <p className="text-xs text-blue-800 leading-relaxed">
                    Once the vehicle is loaded, the driver signs this acceptance slip or uploads their transport Lorry Receipt (LR). This transfers transit liability to the carrier.
                  </p>
                  <div className="mt-3 text-[11px] text-blue-700 bg-blue-100/60 p-2.5 rounded-lg border border-blue-200">
                    <strong>Responsible Party:</strong> Driver / Transporter
                    <br />
                    <strong>Stage:</strong> Loading & Dispatch
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: Proof of Delivery (POD) & Dual Verification Mode */}
          {activeTab === 'pod' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 space-y-6">
                {/* Dual Mode Spotlight Card */}
                <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white rounded-xl p-5 shadow-md">
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="px-2.5 py-1 bg-amber-400 text-amber-950 text-[11px] font-bold rounded-full uppercase tracking-wider">
                        Key User Enhancement
                      </span>
                      <h3 className="text-lg font-bold mt-2 flex items-center gap-2">
                        <FaShieldAlt className="text-amber-400" /> Dual Verification Mode (OTP + Manual Photo Proof)
                      </h3>
                      <p className="text-xs text-slate-300 mt-1 max-w-xl">
                        At customer site delivery, if mobile network drops or customer phone is unavailable for OTP, the driver can immediately switch to <strong>Manual Photo Verification</strong> by uploading the unloaded cargo photo & physical signed paper slip.
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-5 pt-4 border-t border-slate-800">
                    <div className="bg-white/10 rounded-lg p-3 border border-white/10">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                          <FaMobileAlt /> Mode A: Instant OTP
                        </span>
                        <ToggleButton
                          checked={formData.doc_pod?.allow_otp_verification}
                          onChange={(val) =>
                            setFormData((prev) => ({
                              ...prev,
                              doc_pod: { ...prev.doc_pod, allow_otp_verification: val },
                            }))
                          }
                        />
                      </div>
                      <p className="text-[11px] text-slate-300">
                        Sends a 6-digit delivery passcode to the Buyer's registered phone. Driver enters OTP to complete delivery.
                      </p>
                    </div>

                    <div className="bg-white/10 rounded-lg p-3 border border-white/10">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-xs font-bold text-emerald-300 flex items-center gap-1.5">
                          <FaCamera /> Mode B: Manual Photo Proof (Fallback)
                        </span>
                        <ToggleButton
                          checked={formData.doc_pod?.allow_manual_photo_verification}
                          onChange={(val) =>
                            setFormData((prev) => ({
                              ...prev,
                              doc_pod: { ...prev.doc_pod, allow_manual_photo_verification: val },
                            }))
                          }
                        />
                      </div>
                      <p className="text-[11px] text-slate-300">
                        Driver takes photo of goods placed at site and photo of buyer's physical signature on paper challan.
                      </p>
                    </div>
                  </div>
                </div>

                {/* POD Settings Form */}
                <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                    <h3 className="font-semibold text-slate-800 text-sm flex items-center gap-2">
                      <FaClipboardCheck className="text-amber-500" /> Proof of Delivery Options & Rules
                    </h3>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-slate-600">Document Active:</span>
                      <ToggleButton
                        checked={formData.doc_pod?.is_enabled}
                        onChange={(val) =>
                          setFormData((prev) => ({
                            ...prev,
                            doc_pod: { ...prev.doc_pod, is_enabled: val },
                          }))
                        }
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1">Document Display Title</label>
                      <input
                        type="text"
                        value={formData.doc_pod?.title || ''}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            doc_pod: { ...prev.doc_pod, title: e.target.value },
                          }))
                        }
                        className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-amber-500 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1">Default Driver Choice at Site</label>
                      <select
                        value={formData.doc_pod?.default_verification_mode || 'either'}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            doc_pod: { ...prev.doc_pod, default_verification_mode: e.target.value },
                          }))
                        }
                        className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 bg-white focus:ring-2 focus:ring-amber-500 focus:outline-none"
                      >
                        <option value="either">Either (Driver Chooses: OTP or Photo)</option>
                        <option value="otp">OTP Primary (Photo Fallback only if OTP fails)</option>
                        <option value="manual_photo">Photo Verification Always Required</option>
                      </select>
                    </div>
                  </div>

                  {/* Manual Photo Requirements */}
                  <div className="pt-3 border-t border-slate-100">
                    <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2.5">
                      Manual Photo Evidence Mandatory Checks
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <label className="flex items-center gap-2 p-3 rounded-lg border border-slate-200 bg-slate-50 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={formData.doc_pod?.require_site_cargo_photo}
                          onChange={(e) =>
                            setFormData((prev) => ({
                              ...prev,
                              doc_pod: { ...prev.doc_pod, require_site_cargo_photo: e.target.checked },
                            }))
                          }
                          className="rounded text-amber-500"
                        />
                        <span className="text-xs text-slate-700 font-medium">Require Site Cargo Photo</span>
                      </label>

                      <label className="flex items-center gap-2 p-3 rounded-lg border border-slate-200 bg-slate-50 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={formData.doc_pod?.require_signed_paper_photo}
                          onChange={(e) =>
                            setFormData((prev) => ({
                              ...prev,
                              doc_pod: { ...prev.doc_pod, require_signed_paper_photo: e.target.checked },
                            }))
                          }
                          className="rounded text-amber-500"
                        />
                        <span className="text-xs text-slate-700 font-medium">Require Signed Paper Slip</span>
                      </label>

                      <label className="flex items-center gap-2 p-3 rounded-lg border border-slate-200 bg-slate-50 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={formData.doc_pod?.require_receiver_stamp}
                          onChange={(e) =>
                            setFormData((prev) => ({
                              ...prev,
                              doc_pod: { ...prev.doc_pod, require_receiver_stamp: e.target.checked },
                            }))
                          }
                          className="rounded text-amber-500"
                        />
                        <span className="text-xs text-slate-700 font-medium">Require Receiver Stamp</span>
                      </label>
                    </div>
                  </div>

                  {/* Configurable OTP Bypass Reasons */}
                  <div className="pt-3 border-t border-slate-100">
                    <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                      Allowed Reasons for OTP Bypass (Driver Dropdown)
                    </h4>
                    <p className="text-xs text-slate-500 mb-3">
                      When the driver switches from OTP to Photo Proof, they select one of these approved audit reasons:
                    </p>

                    <div className="space-y-2 mb-3">
                      {(formData.doc_pod?.otp_bypass_reasons || []).map((reason, idx) => (
                        <div key={idx} className="flex items-center justify-between p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700">
                          <span>{reason}</span>
                          <button
                            type="button"
                            onClick={() => handleRemoveBypassReason(idx)}
                            className="text-rose-500 hover:text-rose-700 p-1"
                          >
                            <FaTrash className="text-xs" />
                          </button>
                        </div>
                      ))}
                    </div>

                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="Add another bypass reason..."
                        value={newBypassReason}
                        onChange={(e) => setNewBypassReason(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddBypassReason())}
                        className="flex-1 text-xs border border-slate-300 rounded-lg px-3 py-1.5 focus:ring-2 focus:ring-amber-500 focus:outline-none"
                      />
                      <Button
                        type="button"
                        onClick={handleAddBypassReason}
                        className="px-3 py-1.5 bg-slate-800 text-white rounded-lg text-xs font-semibold hover:bg-slate-900 transition flex items-center gap-1"
                      >
                        <FaPlus /> Add Reason
                      </Button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Sidebar Flow Help */}
              <div className="space-y-4">
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
                  <h4 className="font-bold text-emerald-900 text-xs uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <FaCheckCircle /> Zero Stuck Drivers
                  </h4>
                  <p className="text-xs text-emerald-800 leading-relaxed">
                    By providing the Manual Photo Verification fallback, deliveries will never get blocked if a customer is temporarily offline or in a basement/remote rooftop without cellular reception.
                  </p>
                  <div className="mt-3 text-[11px] text-emerald-700 bg-emerald-100/60 p-2.5 rounded-lg border border-emerald-200">
                    <strong>Responsible Party:</strong> Buyer / EPC + Driver
                    <br />
                    <strong>Audit Trail:</strong> GPS coordinates, photo timestamps, and bypass justification logged.
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: Material Inspection & Handover Checklist */}
          {activeTab === 'inspection' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 space-y-6">
                <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                    <div>
                      <h3 className="font-semibold text-slate-800 text-base flex items-center gap-2">
                        <FiCheckSquare className="text-amber-500" /> Material Inspection & Handover Checklist
                      </h3>
                      <p className="text-xs text-slate-500">Component-by-component joint physical check upon unloading.</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-semibold text-slate-600">Document Enabled:</span>
                      <ToggleButton
                        checked={formData.doc_inspection_handover?.is_enabled}
                        onChange={(val) =>
                          setFormData((prev) => ({
                            ...prev,
                            doc_inspection_handover: { ...prev.doc_inspection_handover, is_enabled: val },
                          }))
                        }
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1">Document Display Title</label>
                      <input
                        type="text"
                        value={formData.doc_inspection_handover?.title || ''}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            doc_inspection_handover: { ...prev.doc_inspection_handover, title: e.target.value },
                          }))
                        }
                        className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-amber-500 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1">Internal Code</label>
                      <input
                        type="text"
                        value={formData.doc_inspection_handover?.code || ''}
                        disabled
                        className="w-full text-sm border border-slate-200 bg-slate-100 rounded-lg px-3 py-2 text-slate-500 cursor-not-allowed"
                      />
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-100">
                    <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-3">Component Verification Rules</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <label className="flex items-start gap-2.5 p-3 rounded-lg border border-slate-200 bg-slate-50 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={formData.doc_inspection_handover?.check_panel_cracks}
                          onChange={(e) =>
                            setFormData((prev) => ({
                              ...prev,
                              doc_inspection_handover: { ...prev.doc_inspection_handover, check_panel_cracks: e.target.checked },
                            }))
                          }
                          className="rounded text-amber-500 mt-0.5"
                        />
                        <div>
                          <p className="text-xs font-semibold text-slate-800">Solar Panel Glass Crack & Micro-Damage Check</p>
                          <p className="text-[11px] text-slate-500">Requires inspecting module glass surface for micro-cracks before signoff.</p>
                        </div>
                      </label>

                      <label className="flex items-start gap-2.5 p-3 rounded-lg border border-slate-200 bg-slate-50 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={formData.doc_inspection_handover?.check_inverter_serial}
                          onChange={(e) =>
                            setFormData((prev) => ({
                              ...prev,
                              doc_inspection_handover: { ...prev.doc_inspection_handover, check_inverter_serial: e.target.checked },
                            }))
                          }
                          className="rounded text-amber-500 mt-0.5"
                        />
                        <div>
                          <p className="text-xs font-semibold text-slate-800">Inverter Serial Number & Box Seal Check</p>
                          <p className="text-[11px] text-slate-500">Verifies OEM inverter serial barcode against dispatch invoice.</p>
                        </div>
                      </label>

                      <label className="flex items-start gap-2.5 p-3 rounded-lg border border-slate-200 bg-slate-50 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={formData.doc_inspection_handover?.check_bos_cables_earthing}
                          onChange={(e) =>
                            setFormData((prev) => ({
                              ...prev,
                              doc_inspection_handover: { ...prev.doc_inspection_handover, check_bos_cables_earthing: e.target.checked },
                            }))
                          }
                          className="rounded text-amber-500 mt-0.5"
                        />
                        <div>
                          <p className="text-xs font-semibold text-slate-800">BOS Cables, ACDB/DCDB & Earthing Verification</p>
                          <p className="text-[11px] text-slate-500">Itemizes wiring, conduit, combiner boxes, and earthing electrodes.</p>
                        </div>
                      </label>

                      <label className="flex items-start gap-2.5 p-3 rounded-lg border border-slate-200 bg-slate-50 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={formData.doc_inspection_handover?.allow_damage_shortage_logging}
                          onChange={(e) =>
                            setFormData((prev) => ({
                              ...prev,
                              doc_inspection_handover: { ...prev.doc_inspection_handover, allow_damage_shortage_logging: e.target.checked },
                            }))
                          }
                          className="rounded text-amber-500 mt-0.5"
                        />
                        <div>
                          <p className="text-xs font-semibold text-slate-800">Damage & Shortage Claim Logging</p>
                          <p className="text-[11px] text-slate-500">Allows customer to flag damaged packages and trigger replacement ticket.</p>
                        </div>
                      </label>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-100">
                    <label className="block text-xs font-medium text-slate-700 mb-1">Joint Handover Legal Disclaimer</label>
                    <textarea
                      rows={3}
                      value={formData.doc_inspection_handover?.disclaimer_text || ''}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          doc_inspection_handover: { ...prev.doc_inspection_handover, disclaimer_text: e.target.value },
                        }))
                      }
                      className="w-full text-xs border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-amber-500 focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Sidebar Quick Summary */}
              <div className="space-y-4">
                <div className="bg-slate-100 border border-slate-300 rounded-xl p-4">
                  <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <FiCheckSquare /> Dispute Prevention
                  </h4>
                  <p className="text-xs text-slate-700 leading-relaxed">
                    By documenting glass integrity and inverter seals right at unloading, false transit claims and post-delivery arguments between EPC and transporter are eliminated.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: Live Preview & Verification Simulator */}
          {activeTab === 'preview' && (
            <div className="space-y-6">
              <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex flex-wrap items-center justify-between gap-4">
                <div className="flex flex-wrap items-center gap-3">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Preview Mode:</span>
                  <div className="inline-flex rounded-lg border border-slate-200 p-1 bg-slate-100">
                    <button
                      type="button"
                      onClick={() => setPreviewMode('document')}
                      className={`px-3 py-1.5 rounded-md text-xs font-semibold transition ${
                        previewMode === 'document' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'
                      }`}
                    >
                      <FaFileAlt className="inline mr-1 text-amber-500" /> Printable PDF Template
                    </button>
                    <button
                      type="button"
                      onClick={() => setPreviewMode('mobile_otp')}
                      className={`px-3 py-1.5 rounded-md text-xs font-semibold transition ${
                        previewMode === 'mobile_otp' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'
                      }`}
                    >
                      <FaMobileAlt className="inline mr-1 text-blue-500" /> Driver Mobile (OTP Screen)
                    </button>
                    <button
                      type="button"
                      onClick={() => setPreviewMode('mobile_photo')}
                      className={`px-3 py-1.5 rounded-md text-xs font-semibold transition ${
                        previewMode === 'mobile_photo' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'
                      }`}
                    >
                      <FaCamera className="inline mr-1 text-emerald-500" /> Driver Mobile (Photo Proof Screen)
                    </button>
                  </div>
                </div>

                {/* Live Real Order Selector */}
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-700">Preview Live Order:</span>
                  <select
                    value={selectedOrderId}
                    onChange={(e) => setSelectedOrderId(e.target.value)}
                    className="text-xs border border-slate-300 rounded-lg px-2.5 py-1.5 bg-white font-medium text-slate-800 focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  >
                    {recentOrders.length > 0 ? (
                      recentOrders.map((ord) => (
                        <option key={ord._id} value={ord._id}>
                          {ord.delivery_number || ord.order_number || ord._id} - {ord.stops?.[0]?.recipient_name || 'Consignee'}
                        </option>
                      ))
                    ) : (
                      <option value="">Scope: {formData.scope_name}</option>
                    )}
                  </select>
                </div>
              </div>

              {/* View 1: Printable Document */}
              {previewMode === 'document' && (
                <div className="bg-white border border-slate-300 rounded-xl p-8 max-w-4xl mx-auto shadow-md font-sans">
                  {/* Header */}
                  <div className="flex items-start justify-between border-b-2 border-slate-900 pb-5 mb-6">
                    <div>
                      <h2 className="text-xl font-black text-slate-900 tracking-tight">{formData.company_name}</h2>
                      <p className="text-xs text-slate-500">{formData.trade_name} • Central Logistics & Fulfillment Division</p>
                      <p className="text-xs text-slate-600 mt-1">Helpline: {formData.support_phone} | Email: {formData.support_email}</p>
                    </div>
                    <div className="text-right">
                      <span className="px-3 py-1 bg-amber-500 text-white text-xs font-bold rounded">
                        {formData.doc_schedule?.header_title || 'OFFICIAL DELIVERY MANIFEST'}
                      </span>
                      <p className="text-xs font-mono font-bold text-slate-800 mt-2">
                        DOC REF: {selectedOrder?.delivery_number || selectedOrder?.order_number || (activeWh?.code ? `DOC-${activeWh.code}` : 'NO-LIVE-ORDER')}
                      </p>
                      <p className="text-[11px] text-slate-500">
                        Date: {selectedOrder?.created_at ? new Date(selectedOrder.created_at).toLocaleDateString('en-IN') : new Date().toLocaleDateString('en-IN')}
                      </p>
                    </div>
                  </div>

                  {/* Order & Route Details Table */}
                  <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-lg border border-slate-200 text-xs mb-6">
                    <div>
                      <p className="font-bold text-slate-900 uppercase tracking-wider text-[11px] mb-1">Dispatching Warehouse</p>
                      <p className="font-semibold text-slate-800">
                        {selectedOrder?.warehouse_id?.name || selectedOrder?.warehouse_id?.warehouse_name || activeWh?.name || 'Not Assigned'}
                      </p>
                      <p className="text-slate-600">
                        {selectedOrder?.warehouse_id?.address || activeWh?.address || ([activeWh?.city, activeWh?.state_name, activeWh?.dispatch_pincode].filter(Boolean).join(', ') || 'Select a Warehouse / Order')}
                      </p>
                      <p className="text-slate-600 mt-0.5">
                        Dispatch Officer: {formData.signatory_name || activeWh?.manager?.name || 'Authorized Officer'} ({formData.signatory_designation})
                      </p>
                    </div>
                    <div>
                      <p className="font-bold text-slate-900 uppercase tracking-wider text-[11px] mb-1">Consignee & Delivery Site</p>
                      <p className="font-semibold text-slate-800">
                        {selectedOrder?.stops?.[0]?.recipient_name || selectedOrder?.customer_name || 'No Consignee Selected'}
                      </p>
                      <p className="text-slate-600">
                        {selectedOrder?.stops?.[0]?.destination?.address ||
                          ([selectedOrder?.stops?.[0]?.destination?.district_name, selectedOrder?.stops?.[0]?.destination?.state_name].filter(Boolean).join(', ') || 'No Delivery Address Available')}
                      </p>
                      <p className="text-slate-600 mt-0.5">
                        Site Contact: {selectedOrder?.stops?.[0]?.recipient_contact || selectedOrder?.stops?.[0]?.destination?.contact_phone || 'Not Available'}
                      </p>
                    </div>
                  </div>

                  {/* Transporter Details */}
                  <div className="grid grid-cols-4 gap-3 bg-amber-50 border border-amber-200 p-3 rounded-lg text-xs mb-6">
                    <div>
                      <span className="text-[10px] text-amber-800 uppercase font-bold">Transporter</span>
                      <p className="font-semibold text-slate-900">
                        {selectedOrder?.service_provider_id?.name || selectedOrder?.service_provider_id?.provider_name || 'Pending Assignment'}
                      </p>
                    </div>
                    <div>
                      <span className="text-[10px] text-amber-800 uppercase font-bold">Vehicle Reg No</span>
                      <p className="font-semibold text-slate-900">
                        {selectedOrder?.vehicles_allocated?.[0]?.registration_number || selectedOrder?.vehicles_allocated?.[0]?.vehicle_number || 'Pending Assignment'}
                      </p>
                    </div>
                    <div>
                      <span className="text-[10px] text-amber-800 uppercase font-bold">Driver Name & DL</span>
                      <p className="font-semibold text-slate-900">
                        {selectedOrder?.vehicles_allocated?.[0]?.driver_name
                          ? `${selectedOrder.vehicles_allocated[0].driver_name}${selectedOrder.vehicles_allocated[0].driver_license ? ` (${selectedOrder.vehicles_allocated[0].driver_license})` : ''}`
                          : 'Pending Assignment'}
                      </p>
                    </div>
                    <div>
                      <span className="text-[10px] text-amber-800 uppercase font-bold">Seal Number</span>
                      <p className="font-semibold text-slate-900 font-mono">
                        {selectedOrder?.vehicles_allocated?.[0]?.seal_number || 'Pending Seal'}
                      </p>
                    </div>
                  </div>

                  {/* Solar Kit Packages Table */}
                  <table className="w-full text-xs border border-slate-300 rounded mb-6">
                    <thead className="bg-slate-100 text-slate-800 border-b border-slate-300 font-bold">
                      <tr>
                        <th className="p-2.5 text-left">Item #</th>
                        <th className="p-2.5 text-left">Kit Description & Specifications</th>
                        <th className="p-2.5 text-center">Qty (Kits)</th>
                        <th className="p-2.5 text-center">Total Panels</th>
                        <th className="p-2.5 text-right">Gross Wt (Kg)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {(selectedOrder?.stops?.[0]?.cargo?.kit_items || selectedOrder?.items || []).length > 0 ? (
                        (selectedOrder?.stops?.[0]?.cargo?.kit_items || selectedOrder?.items || []).map((kit, idx) => (
                          <tr key={idx}>
                            <td className="p-2.5 font-mono">{idx + 1}</td>
                            <td className="p-2.5">
                              <strong>{kit.item_name || kit.name || 'Solarkits Pre-Configured Combo Kit'}</strong>
                              <p className="text-[11px] text-slate-500">
                                {kit.description || `${kit.capacity || 'Solar'} Modules + Inverter + BOS Structure`}
                              </p>
                            </td>
                            <td className="p-2.5 text-center font-bold">{kit.quantity || 1} Kit(s)</td>
                            <td className="p-2.5 text-center">
                              {kit.total_panels || ((kit.capacity?.includes('3') ? 6 : (kit.capacity?.includes('2') ? 4 : 2)) * (kit.quantity || 1))} Panels
                            </td>
                            <td className="p-2.5 text-right font-mono">
                              {(kit.total_weight_kg || (kit.quantity || 1) * 150).toLocaleString()} Kg
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={5} className="p-4 text-center text-slate-500 italic">
                            No line items available for this preview. Select a live order above to populate real kit items.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>

                  {/* Terms and Conditions from Tab 1 */}
                  {formData.doc_schedule?.terms_and_conditions?.length > 0 && (
                    <div className="mb-6 p-3 bg-slate-50 border border-slate-200 rounded-lg text-slate-700">
                      <p className="font-bold text-[11px] uppercase tracking-wider text-slate-800 mb-1.5">
                        Terms & Delivery Instructions
                      </p>
                      <ol className="list-decimal list-inside space-y-1 text-[11px]">
                        {formData.doc_schedule.terms_and_conditions.map((term, i) => (
                          <li key={i}>{term}</li>
                        ))}
                      </ol>
                    </div>
                  )}

                  {/* Dual Signatures & Stamp Box */}
                  <div className="grid grid-cols-2 gap-8 pt-6 border-t-2 border-slate-200">
                    <div className="border border-dashed border-slate-300 rounded-lg p-4 text-center">
                      <div className="h-16 flex items-center justify-center text-slate-300">
                        <FaSignature className="text-3xl text-slate-400" />
                      </div>
                      <p className="text-xs font-bold text-slate-800 border-t border-slate-200 pt-2">Driver / Transporter Signature</p>
                      <p className="text-[11px] text-slate-500">I confirm loading in sound condition.</p>
                    </div>

                    <div className="border border-dashed border-slate-300 rounded-lg p-4 text-center">
                      <div className="h-16 flex items-center justify-center text-slate-300">
                        <FaStamp className="text-3xl text-amber-500" />
                      </div>
                      <p className="text-xs font-bold text-slate-800 border-t border-slate-200 pt-2">Consignee / Buyer Official Seal & Sign</p>
                      <p className="text-[11px] text-slate-500">Received & inspected at site.</p>
                    </div>
                  </div>
                </div>
              )}

              {/* View 2: Driver Mobile OTP Simulation */}
              {previewMode === 'mobile_otp' && (
                <div className="max-w-md mx-auto bg-slate-900 rounded-3xl p-3 shadow-2xl border-4 border-slate-800">
                  <div className="bg-white rounded-2xl p-5 min-h-[500px] flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
                        <span className="text-[10px] font-bold text-slate-400 uppercase">Driver Delivery App</span>
                        <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded">
                          Order #{selectedOrder?.delivery_number || selectedOrder?.order_number || 'NO-ORDER'}
                        </span>
                      </div>

                      <div className="text-center mb-6">
                        <div className="w-14 h-14 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-3 text-2xl">
                          <FaMobileAlt />
                        </div>
                        <h3 className="font-bold text-slate-900 text-lg">Verify via Customer OTP</h3>
                        <p className="text-xs text-slate-500 mt-1">
                          6-digit delivery OTP has been sent to Buyer&apos;s mobile ({selectedOrder?.stops?.[0]?.recipient_contact || selectedOrder?.customer_phone || 'Not Available'}).
                        </p>
                      </div>

                      <div className="space-y-4">
                        <div>
                          <label className="block text-xs font-bold text-slate-700 text-center mb-2">Enter 6-Digit Delivery Code</label>
                          <input
                            type="text"
                            maxLength={6}
                            value={simulatedOtp}
                            placeholder="• • • • • •"
                            onChange={(e) => {
                              const val = e.target.value;
                              setSimulatedOtp(val);
                              const targetCode = selectedOrder?.stops?.[0]?.pod?.otp_code || selectedOrder?.otp_verification?.otp_code || '';
                              if (targetCode && val === targetCode) {
                                setSimulatedOtpVerified(true);
                              } else {
                                setSimulatedOtpVerified(false);
                              }
                            }}
                            className="w-full text-center font-mono text-2xl tracking-widest border-2 border-blue-400 rounded-xl py-3 focus:outline-none focus:ring-4 focus:ring-blue-100"
                          />
                          <p className="text-[11px] text-slate-400 text-center mt-1">
                            {selectedOrder?.stops?.[0]?.pod?.otp_code || selectedOrder?.otp_verification?.otp_code ? (
                              <>Live Order OTP: <strong>{selectedOrder?.stops?.[0]?.pod?.otp_code || selectedOrder?.otp_verification?.otp_code}</strong></>
                            ) : (
                              'No live OTP generated on this order yet. Generate OTP from Track Delivery screen.'
                            )}
                          </p>
                        </div>

                        {simulatedOtpVerified && (
                          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-center text-xs text-emerald-800 font-semibold flex items-center justify-center gap-2">
                            <FaCheckCircle className="text-emerald-600" /> OTP Verified! Delivery Complete.
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="pt-4 border-t border-slate-100">
                      <p className="text-xs text-slate-500 text-center mb-2">Having network issue or customer phone unreachable?</p>
                      <button
                        type="button"
                        onClick={() => setPreviewMode('mobile_photo')}
                        className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2"
                      >
                        <FaCamera className="text-emerald-600" /> Switch to Manual Photo Proof
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* View 3: Driver Mobile Photo Fallback Simulation */}
              {previewMode === 'mobile_photo' && (
                <div className="max-w-md mx-auto bg-slate-900 rounded-3xl p-3 shadow-2xl border-4 border-slate-800">
                  <div className="bg-white rounded-2xl p-5 min-h-[500px] flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
                        <span className="text-[10px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded uppercase">Manual Photo Verification</span>
                        <span className="text-xs font-bold text-slate-700">
                          Order #{selectedOrder?.delivery_number || selectedOrder?.order_number || 'NO-ORDER'}
                        </span>
                      </div>

                      <div className="mb-4">
                        <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                          <FaCamera className="text-emerald-500" /> Upload Site Delivery Proof
                        </h3>
                        <p className="text-xs text-slate-500">
                          Use this mode when customer OTP cannot be received at site.
                        </p>
                      </div>

                      <div className="space-y-3">
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-700 mb-1">Reason for OTP Bypass</label>
                          <select
                            value={simulatedBypassReason}
                            onChange={(e) => setSimulatedBypassReason(e.target.value)}
                            className="w-full text-xs border border-slate-300 rounded-lg p-2 bg-white"
                          >
                            {(formData.doc_pod?.otp_bypass_reasons || []).map((r, i) => (
                              <option key={i} value={r}>{r}</option>
                            ))}
                          </select>
                        </div>

                        {/* Photo 1: Cargo at Site */}
                        <label
                          className={`block p-3 border-2 border-dashed rounded-xl text-center cursor-pointer transition ${
                            simulatedPhotoUploaded ? 'border-emerald-500 bg-emerald-50/50' : 'border-slate-300 hover:border-slate-400 bg-slate-50'
                          }`}
                        >
                          <FaCamera className={`mx-auto text-xl mb-1 ${simulatedPhotoUploaded ? 'text-emerald-600' : 'text-slate-400'}`} />
                          <p className="text-xs font-bold text-slate-800">
                            {simulatedPhotoUploaded ? '✓ Site Cargo Photo Uploaded' : '1. Photo of Unloaded Solar Kits at Site'}
                          </p>
                          <p className="text-[10px] text-slate-500">Select actual image file to test upload</p>
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={async (e) => {
                              const file = e.target.files?.[0];
                              if (!file) return;
                              try {
                                const fd = new FormData();
                                fd.append('file', file);
                                fd.append('folder', 'delivery_pod');
                                const upRes = await axios.post(`${API_BASE}/delivery-document-settings/upload`, fd, { headers: getHeaders() });
                                if (upRes.data?.status === 'success') {
                                  setSimulatedPhotoUploaded(true);
                                  dispatch(setAlert({ type: 'success', message: `Photo uploaded: ${upRes.data.url}` }));
                                }
                              } catch (err) {
                                dispatch(setAlert({ type: 'danger', message: err.response?.data?.message || 'Photo upload failed' }));
                              }
                            }}
                          />
                        </label>

                        {/* Photo 2: Physical Signed Slip */}
                        <div className="p-3 border-2 border-dashed border-slate-300 rounded-xl text-center bg-slate-50">
                          <FaFileSignature className="mx-auto text-xl text-slate-400 mb-1" />
                          <p className="text-xs font-bold text-slate-800">2. Photo of Signed Physical Slip / POD</p>
                          <p className="text-[10px] text-slate-500">Uploaded during actual delivery verification</p>
                        </div>

                        <div>
                          <label className="block text-[11px] font-semibold text-slate-700 mb-1">Receiver Name & Mobile</label>
                          <input
                            type="text"
                            key={selectedOrder?._id || 'no-order'}
                            defaultValue={
                              selectedOrder
                                ? `${selectedOrder?.stops?.[0]?.recipient_name || selectedOrder?.customer_name || ''} ${selectedOrder?.stops?.[0]?.recipient_contact || selectedOrder?.customer_phone || ''}`.trim()
                                : ''
                            }
                            placeholder="Receiver Name & Mobile (from live order)"
                            className="w-full text-xs border border-slate-300 rounded-lg p-2"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="pt-4 border-t border-slate-100">
                      <Button
                        type="button"
                        onClick={() => {
                          dispatch(
                            setAlert({
                              type: 'success',
                              message: 'Delivery Verified via Manual Photo Evidence!',
                            })
                          );
                        }}
                        className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md transition flex items-center justify-center gap-2"
                      >
                        <FaCheckCircle /> Confirm Delivery via Photo Proof
                      </Button>
                      <button
                        type="button"
                        onClick={() => setPreviewMode('mobile_otp')}
                        className="w-full text-center text-[11px] text-blue-600 font-semibold mt-2 hover:underline"
                      >
                        ← Back to OTP Verification
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
