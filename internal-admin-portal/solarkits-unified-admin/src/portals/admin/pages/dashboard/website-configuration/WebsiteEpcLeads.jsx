import React, { useState, useEffect, useMemo, useCallback } from 'react';
import axios from 'axios';
import {
  FiUsers,
  FiUserCheck,
  FiUserX,
  FiCheckCircle,
  FiFilter,
  FiSearch,
  FiRefreshCw,
  FiPhone,
  FiMapPin,
  FiLayers,
  FiCalendar,
  FiExternalLink,
  FiAlertCircle,
  FiCheckSquare,
  FiSquare,
  FiSend,
  FiUploadCloud,
  FiPlus,
  FiTrash2,
  FiArrowRight,
  FiArrowLeft,
  FiX,
  FiFileText,
  FiDownload,
} from 'react-icons/fi';
import { authHeaderObj } from '../../../app/authHeader';
import SendEpcWelcomeAccessModal from '../../../components/SendEpcWelcomeAccessModal';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const getHeaders = () => ({
  headers: {
    ...authHeaderObj(),
    'Content-Type': 'application/json',
  },
});

export default function WebsiteEpcLeads() {
  const [leads, setLeads] = useState([]);
  const [stats, setStats] = useState({
    total_leads: 0,
    unassigned_count: 0,
    assigned_count: 0,
    converted_count: 0,
  });
  const [availableStates, setAvailableStates] = useState([]);
  const [availableBdes, setAvailableBdes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [toast, setToast] = useState(null);

  // Filters
  const [search, setSearch] = useState('');
  const [stateFilter, setStateFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [bdeFilter, setBdeFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ total: 0, pages: 1, limit: 20 });

  // Multi-Selection State
  const [selectedLeadIds, setSelectedLeadIds] = useState([]);
  const [targetBdeId, setTargetBdeId] = useState('');
  const [showWelcomeModal, setShowWelcomeModal] = useState(false);
  const [selectedLeadForAccess, setSelectedLeadForAccess] = useState(null);

  // Dynamic CSV Import State (Admin Panel Sync)
  const [showAdminImportModal, setShowAdminImportModal] = useState(false);
  const [importStep, setImportStep] = useState(1);
  const [csvFileName, setCsvFileName] = useState('');
  const [csvHeaders, setCsvHeaders] = useState([]);
  const [rawCsvRows, setRawCsvRows] = useState([]);
  const [customFields, setCustomFields] = useState([]);
  const [fieldMappings, setFieldMappings] = useState({
    name: '',
    contactPerson: '',
    phone: '',
    email: '',
    gstin: '',
    state: '',
    cluster: '',
    pincode: '',
    lifetimeOrders: ''
  });
  const [importing, setImporting] = useState(false);

  // Show Toast
  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  // CSV File Parser & Auto Detection
  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setCsvFileName(file.name);
    const reader = new FileReader();

    reader.onload = (event) => {
      const text = event.target?.result;
      if (typeof text !== 'string') return;

      const lines = text.split(/\r\n|\n/).filter((l) => l.trim().length > 0);
      if (lines.length === 0) return;

      const delimiter = lines[0].includes('\t') ? '\t' : (lines[0].includes(';') ? ';' : ',');
      const headers = lines[0].split(delimiter).map((h) => h.trim().replace(/^["']|["']$/g, ''));
      setCsvHeaders(headers);

      const parsedRows = [];
      for (let i = 1; i < lines.length; i++) {
        const parts = lines[i].split(delimiter).map((p) => p.trim().replace(/^["']|["']$/g, ''));
        if (parts.length > 0) {
          const rowObj = {};
          headers.forEach((h, idx) => {
            rowObj[h] = parts[idx] || '';
          });
          parsedRows.push(rowObj);
        }
      }
      setRawCsvRows(parsedRows);

      const autoMap = {
        name: '',
        contactPerson: '',
        phone: '',
        email: '',
        gstin: '',
        state: '',
        cluster: '',
        pincode: '',
        lifetimeOrders: ''
      };

      headers.forEach((h) => {
        const lh = h.toLowerCase();
        if (!autoMap.name && (lh.includes('company') || lh.includes('firm') || lh.includes('epc') || lh.includes('name'))) autoMap.name = h;
        if (!autoMap.contactPerson && (lh.includes('contact') || lh.includes('person') || lh.includes('owner') || lh.includes('proprietor'))) autoMap.contactPerson = h;
        if (!autoMap.phone && (lh.includes('phone') || lh.includes('mobile') || lh.includes('whatsapp') || lh.includes('cell'))) autoMap.phone = h;
        if (!autoMap.email && (lh.includes('email') || lh.includes('mail'))) autoMap.email = h;
        if (!autoMap.gstin && (lh.includes('gst') || lh.includes('gstin') || lh.includes('tax'))) autoMap.gstin = h;
        if (!autoMap.state && (lh.includes('state') || lh.includes('region'))) autoMap.state = h;
        if (!autoMap.cluster && (lh.includes('cluster') || lh.includes('city') || lh.includes('district') || lh.includes('area'))) autoMap.cluster = h;
        if (!autoMap.pincode && (lh.includes('pin') || lh.includes('zip') || lh.includes('postal'))) autoMap.pincode = h;
        if (!autoMap.lifetimeOrders && (lh.includes('order') || lh.includes('orders') || lh.includes('past') || lh.includes('kits') || lh.includes('qty'))) autoMap.lifetimeOrders = h;
      });

      setFieldMappings(autoMap);
      setImportStep(2);
    };

    reader.readAsText(file);
  };

  const handleAddCustomField = () => {
    const key = `custom_${Date.now()}`;
    setCustomFields((prev) => [...prev, { key, label: `Custom Field ${prev.length + 1}`, csvHeader: '' }]);
  };

  const handleRemoveCustomField = (key) => {
    setCustomFields((prev) => prev.filter((f) => f.key !== key));
  };

  // Upload dynamic CSV leads to backend
  const handleUploadAndProcess = async () => {
    if (!fieldMappings.phone && !fieldMappings.name) {
      showToast('Please map at least Company Name or Phone number to import leads', 'error');
      return;
    }

    setImporting(true);
    try {
      const transformedPayload = rawCsvRows.map((row) => {
        const gstinVal = fieldMappings.gstin ? row[fieldMappings.gstin] : null;
        const ordersVal = Number(fieldMappings.lifetimeOrders ? row[fieldMappings.lifetimeOrders] : 0) || 0;

        let epcType = 'Registered EPC';
        if (ordersVal > 0) epcType = 'Buyer EPC';
        else if (gstinVal && String(gstinVal).trim().length >= 8) epcType = 'Verified EPC';

        const customData = {};
        customFields.forEach((f) => {
          if (f.csvHeader && row[f.csvHeader]) {
            customData[f.label] = row[f.csvHeader];
          }
        });

        return {
          name: fieldMappings.name ? (row[fieldMappings.name] || 'EPC Partner') : 'EPC Partner',
          company_name: fieldMappings.name ? (row[fieldMappings.name] || 'EPC Partner') : 'EPC Partner',
          contact_person: fieldMappings.contactPerson ? row[fieldMappings.contactPerson] : '',
          phone: fieldMappings.phone ? String(row[fieldMappings.phone]).replace(/\D/g, '').slice(-10) : '',
          email: fieldMappings.email ? row[fieldMappings.email] : '',
          gst_number: gstinVal,
          gstin: gstinVal,
          state_name: fieldMappings.state ? (row[fieldMappings.state] || 'Maharashtra') : 'Maharashtra',
          district_name: fieldMappings.cluster ? (row[fieldMappings.cluster] || 'Central') : 'Central',
          pincode: fieldMappings.pincode ? row[fieldMappings.pincode] : '',
          lifetimeOrders: ordersVal,
          epc_type: epcType,
          custom_attributes: customData
        };
      });

      const res = await axios.post(`${API_BASE}/website-leads/import`, { leads: transformedPayload }, getHeaders());
      if (res.data?.success) {
        showToast(res.data.message || `Successfully imported ${transformedPayload.length} leads!`, 'success');
        setShowAdminImportModal(false);
        setImportStep(1);
        setRawCsvRows([]);
        fetchLeads();
      }
    } catch (err) {
      console.error('Import leads error:', err);
      showToast(err.response?.data?.message || 'Failed to import leads from CSV', 'error');
    } finally {
      setImporting(false);
    }
  };

  // Download Sample CSV template for testing lead uploads directly in browser
  const handleDownloadSampleCsv = () => {
    const csvContent = `Company Name,Contact Person,Mobile Number,Email Address,GSTIN Number,State,Cluster Area,Pincode,Lifetime Orders,Solar Requirement KW
Surat SunTech Energy Ltd,Karan Patel,9825012345,karan@suntechsurat.in,24AAECS1234B1Z5,Gujarat,Surat Cluster,395001,12,50 KW
Pune Power Grid Solar,Sanjay Kulkarni,9822198765,sanjay@punepowergrid.com,27AABCP5678C1Z8,Maharashtra,Pune Cluster,411001,8,25 KW
Bhiwandi CleanVolt Systems,Aditya Patil,9820055443,aditya@cleanvoltepc.in,27AAACB9988D1Z2,Maharashtra,Bhiwandi Central,421302,0,40 KW
Jaipur Solar Rays Pvt Ltd,Mahendra Rathore,9414077889,mahendra@jaipursolarrays.co.in,08AAECJ3344E1Z9,Rajasthan,Jaipur Central,302001,0,30 KW
Bengaluru Rooftop Solar Works,Naveen Gowda,9845011223,naveen@bengalurusolarworks.com,,Karnataka,Bengaluru South,560001,0,15 KW
Nagpur Solar Solutions,Pramod Joshi,9823044556,pramod@nagpursolarsolutions.in,,Maharashtra,Nagpur East,440001,0,20 KW
Ahmedabad SunPower Engineering,Mehul Vora,9879033445,mehul@sunpowereng.com,,Gujarat,Ahmedabad Industrial,380001,0,35 KW`;

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'sample_epc_leads_template.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Fetch Leads from Backend
  const fetchLeads = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page,
        limit: 20,
      });
      if (search.trim()) params.append('search', search.trim());
      if (stateFilter !== 'all') params.append('state_name', stateFilter);
      if (statusFilter !== 'all') params.append('status', statusFilter);
      if (bdeFilter !== 'all') params.append('bde_id', bdeFilter);

      const res = await axios.get(`${API_BASE}/website-leads/list?${params.toString()}`, getHeaders());
      if (res.data?.success) {
        setLeads(res.data.leads || []);
        if (res.data.stats) setStats(res.data.stats);
        if (res.data.pagination) setPagination(res.data.pagination);
        if (res.data.available_states) setAvailableStates(res.data.available_states);
        if (res.data.available_bdes) setAvailableBdes(res.data.available_bdes);
      }
    } catch (err) {
      console.error('Error fetching website leads:', err);
      showToast(err.response?.data?.message || 'Failed to load website leads', 'error');
    } finally {
      setLoading(false);
    }
  }, [search, stateFilter, statusFilter, bdeFilter, page]);

  useEffect(() => {
    fetchLeads();
  }, [fetchLeads]);

  // Handle Select All
  const handleSelectAll = (e) => {
    if (e.target.checked) {
      const allIds = leads.map((l) => l._id);
      setSelectedLeadIds(allIds);
    } else {
      setSelectedLeadIds([]);
    }
  };

  // Handle Toggle Single Row
  const handleToggleSelect = (id) => {
    setSelectedLeadIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  // Bulk Assign Selected Leads to BDE
  const handleBulkAssign = async () => {
    if (selectedLeadIds.length === 0) {
      showToast('Please select at least one lead to assign', 'error');
      return;
    }
    if (!targetBdeId) {
      showToast('Please select a BDE from the dropdown', 'error');
      return;
    }

    setActionLoading(true);
    try {
      const res = await axios.post(
        `${API_BASE}/website-leads/bulk-assign`,
        {
          lead_ids: selectedLeadIds,
          bde_id: targetBdeId,
        },
        getHeaders()
      );

      if (res.data?.success) {
        showToast(res.data.message || `Successfully assigned ${selectedLeadIds.length} leads!`, 'success');
        setSelectedLeadIds([]);
        setTargetBdeId('');
        fetchLeads();
      }
    } catch (err) {
      console.error('Error bulk assigning leads:', err);
      showToast(err.response?.data?.message || 'Failed to assign leads', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // Single Lead BDE Assignment or Status Change
  const handleUpdateLead = async (leadId, updatePayload) => {
    try {
      const res = await axios.patch(`${API_BASE}/website-leads/${leadId}`, updatePayload, getHeaders());
      if (res.data?.success) {
        showToast('Lead updated successfully', 'success');
        fetchLeads();
      }
    } catch (err) {
      console.error('Error updating lead:', err);
      showToast(err.response?.data?.message || 'Failed to update lead', 'error');
    }
  };

  const isAllSelected = useMemo(() => {
    return leads.length > 0 && leads.every((l) => selectedLeadIds.includes(l._id));
  }, [leads, selectedLeadIds]);

  return (
    <div className="space-y-6 pb-12">
      {/* Toast Alert */}
      {toast && (
        <div
          className={`fixed top-4 right-4 z-50 flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold shadow-2xl transition-all ${
            toast.type === 'error'
              ? 'bg-rose-600 text-white shadow-rose-600/30'
              : 'bg-emerald-600 text-white shadow-emerald-600/30'
          }`}
        >
          {toast.type === 'error' ? <FiAlertCircle /> : <FiCheckCircle />}
          <span>{toast.message}</span>
        </div>
      )}

      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-blue-700 via-indigo-700 to-slate-900 p-6 md:p-8 text-white shadow-xl">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-bold tracking-wider uppercase backdrop-blur-sm">
              <FiLayers className="text-amber-300" />
              Website EPC Lead Acquisition Engine
            </div>
            <h1 className="mt-2 text-2xl md:text-3xl font-extrabold tracking-tight">
              Website EPC Leads & Bulk Kit Inquiries
            </h1>
            <p className="mt-1 text-xs md:text-sm text-blue-100 max-w-2xl leading-relaxed">
              Real-time B2B bulk kit inquiries submitted by EPC contractors from the Solar Store banner. Multi-select and assign directly to active regional BDEs.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleDownloadSampleCsv}
              className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl border border-white/20 bg-white/10 hover:bg-white/20 text-xs font-bold text-white transition-all backdrop-blur-md cursor-pointer"
              title="Download test leads CSV"
            >
              <FiDownload className="text-sm" />
              Download Sample CSV
            </button>
            <button
              onClick={() => {
                setImportStep(1);
                setShowAdminImportModal(true);
              }}
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 px-4 py-2.5 text-xs font-bold text-white transition-all shadow-md cursor-pointer"
            >
              <FiUploadCloud className="text-sm" />
              Import Leads (CSV / Excel)
            </button>
            <button
              onClick={fetchLeads}
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 px-4 py-2.5 text-xs font-bold text-white transition-all backdrop-blur-md cursor-pointer disabled:opacity-50"
            >
              <FiRefreshCw className={loading ? 'animate-spin' : ''} />
              Refresh Data
            </button>
          </div>
        </div>
      </div>

      {/* Metric Cards Ribbon */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {/* Total Leads */}
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Total EPC Leads
            </span>
            <div className="rounded-xl bg-blue-50 dark:bg-blue-950/50 p-2 text-blue-600 dark:text-blue-400">
              <FiUsers className="text-lg" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900 dark:text-white">
              {stats.total_leads}
            </span>
            <span className="text-xs font-medium text-slate-500">Website queries</span>
          </div>
        </div>

        {/* Unassigned Leads */}
        <div className="rounded-2xl border border-amber-200 dark:border-amber-900/50 bg-amber-50/50 dark:bg-amber-950/20 p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-amber-700 dark:text-amber-400 uppercase tracking-wider">
              Awaiting BDE
            </span>
            <div className="rounded-xl bg-amber-100 dark:bg-amber-900/50 p-2 text-amber-600 dark:text-amber-400">
              <FiUserX className="text-lg" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-amber-700 dark:text-amber-300">
              {stats.unassigned_count}
            </span>
            <span className="text-xs font-bold text-amber-600 dark:text-amber-400">Pending Assignment</span>
          </div>
        </div>

        {/* Assigned Leads */}
        <div className="rounded-2xl border border-indigo-200 dark:border-indigo-900/50 bg-indigo-50/50 dark:bg-indigo-950/20 p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-indigo-700 dark:text-indigo-400 uppercase tracking-wider">
              Assigned to BDE
            </span>
            <div className="rounded-xl bg-indigo-100 dark:bg-indigo-900/50 p-2 text-indigo-600 dark:text-indigo-400">
              <FiUserCheck className="text-lg" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-indigo-700 dark:text-indigo-300">
              {stats.assigned_count}
            </span>
            <span className="text-xs font-medium text-indigo-600">Under follow-up</span>
          </div>
        </div>

        {/* Onboarded by BDE */}
        <div className="rounded-2xl border border-emerald-200 dark:border-emerald-900/50 bg-emerald-50/50 dark:bg-emerald-950/20 p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider">
              Onboarded EPCs
            </span>
            <div className="rounded-xl bg-emerald-100 dark:bg-emerald-900/50 p-2 text-emerald-600 dark:text-emerald-400">
              <FiCheckCircle className="text-lg" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-emerald-700 dark:text-emerald-300">
              {stats.onboarded_count || stats.converted_count || 0}
            </span>
            <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">By BDE Panel</span>
          </div>
        </div>
      </div>

      {/* Bulk Action Bar (appears when 1 or more leads are checked) */}
      {selectedLeadIds.length > 0 && (
        <div className="sticky top-4 z-40 flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950 to-blue-900 p-4 text-white shadow-2xl border border-indigo-500/30">
          <div className="flex items-center gap-3">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-500 text-sm font-black text-white">
              {selectedLeadIds.length}
            </span>
            <div>
              <span className="font-bold text-sm">
                {selectedLeadIds.length} Lead{selectedLeadIds.length > 1 ? 's' : ''} Selected
              </span>
              <p className="text-xs text-slate-300">
                Choose a BDE to assign these leads in bulk.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <select
              value={targetBdeId}
              onChange={(e) => setTargetBdeId(e.target.value)}
              className="rounded-xl border border-white/20 bg-white/10 px-3.5 py-2 text-xs font-semibold text-white outline-none focus:ring-2 focus:ring-indigo-400 cursor-pointer"
            >
              <option value="" className="text-slate-900">
                -- Select BDE to Assign --
              </option>
              {availableBdes.map((bde) => (
                <option key={bde._id} value={bde._id} className="text-slate-900">
                  {bde.full_name} ({bde.bde_id}) - {bde.state_names?.length > 0 ? bde.state_names.join(', ') : 'Unassigned State'}
                </option>
              ))}
            </select>

            <button
              onClick={handleBulkAssign}
              disabled={actionLoading || !targetBdeId}
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 to-blue-600 hover:from-indigo-600 hover:to-blue-700 px-4 py-2 text-xs font-bold text-white shadow-md transition-all cursor-pointer disabled:opacity-50"
            >
              {actionLoading ? (
                <>
                  <span className="h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  Assigning...
                </>
              ) : (
                <>
                  <FiSend className="text-xs" />
                  ⚡ Assign Selected Leads
                </>
              )}
            </button>

            <button
              onClick={() => setSelectedLeadIds([])}
              className="rounded-xl border border-white/20 px-3 py-2 text-xs font-medium text-slate-300 hover:bg-white/10 transition-colors cursor-pointer"
            >
              Deselect All
            </button>
          </div>
        </div>
      )}

      {/* Filter & Search Toolbar */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-sm">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3">
          {/* Search */}
          <div className="relative md:col-span-2">
            <FiSearch className="absolute left-3.5 top-3 text-slate-400 text-sm" />
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Search by Contractor Name, Phone, Lead ID..."
              className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 pl-10 pr-4 py-2 text-xs text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* State Filter */}
          <div>
            <select
              value={stateFilter}
              onChange={(e) => {
                setStateFilter(e.target.value);
                setPage(1);
              }}
              className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2 text-xs text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
            >
              <option value="all">All States (Scope)</option>
              {availableStates.map((st) => (
                <option key={st} value={st}>
                  {st}
                </option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2 text-xs text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
            >
              <option value="all">All Statuses</option>
              <option value="unassigned">⚠️ Unassigned / New</option>
              <option value="assigned">⚡ Assigned to BDE</option>
              <option value="contacted">📞 Contacted</option>
              <option value="in_progress">🔄 In Progress</option>
              <option value="onboarded">🎉 Onboarded</option>
              <option value="converted">✅ Converted</option>
              <option value="rejected">❌ Closed / Rejected</option>
            </select>
          </div>

          {/* Assigned BDE Filter */}
          <div>
            <select
              value={bdeFilter}
              onChange={(e) => {
                setBdeFilter(e.target.value);
                setPage(1);
              }}
              className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2 text-xs text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
            >
              <option value="all">All Assigned BDEs</option>
              <option value="unassigned">⚠️ Unassigned</option>
              {availableBdes.map((bde) => (
                <option key={bde._id} value={bde._id}>
                  {bde.full_name} ({bde.bde_id})
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Leads Table */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/50 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                <th className="py-3.5 px-4 w-10 text-center">
                  <input
                    type="checkbox"
                    checked={isAllSelected}
                    onChange={handleSelectAll}
                    className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                  />
                </th>
                <th className="py-3.5 px-4">Lead ID & Time</th>
                <th className="py-3.5 px-4">Contractor / EPC Info</th>
                <th className="py-3.5 px-4">Target Region</th>
                <th className="py-3.5 px-4">Kit Requirement</th>
                <th className="py-3.5 px-4">Assigned BDE</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    <div className="inline-flex items-center gap-2 font-medium">
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
                      Loading website EPC leads...
                    </div>
                  </td>
                </tr>
              ) : leads.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <FiLayers className="text-3xl text-slate-300 dark:text-slate-600" />
                      <p className="font-semibold text-sm">No website EPC leads found.</p>
                      <p className="text-xs text-slate-400">
                        Inquiries submitted from the Solar Store website bottom banner will appear here automatically.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                leads.map((lead) => {
                  const isSelected = selectedLeadIds.includes(lead._id);
                  const isUnassigned = !lead.assigned_bde_id && lead.status === 'new';

                  return (
                    <tr
                      key={lead._id}
                      className={`transition-colors hover:bg-slate-50/70 dark:hover:bg-slate-800/40 ${
                        isSelected ? 'bg-indigo-50/50 dark:bg-indigo-950/30' : ''
                      }`}
                    >
                      {/* Checkbox */}
                      <td className="py-3.5 px-4 text-center">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleToggleSelect(lead._id)}
                          className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                        />
                      </td>

                      {/* Lead ID & Date */}
                      <td className="py-3.5 px-4">
                        <div className="font-mono font-bold text-slate-900 dark:text-white">
                          {lead.lead_id}
                        </div>
                        <div className="mt-0.5 flex items-center gap-1 text-[10px] text-slate-400">
                          <FiCalendar className="text-[9px]" />
                          {new Date(lead.created_at).toLocaleDateString('en-IN', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </div>
                      </td>

                      {/* Contractor / EPC Name & Phone */}
                      <td className="py-3.5 px-4">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="font-bold text-slate-900 dark:text-white text-xs">
                            {lead.name}
                          </span>

                          {/* Boss's 3-Type EPC Category Badge */}
                          {(() => {
                            const epcType = lead.epc_type || (
                              (Number(lead.lifetime_orders) > 0 || lead.status === 'converted' || lead.status === 'onboarded')
                                ? 'Buyer EPC'
                                : ((lead.gst_number || lead.gstin) ? 'Verified EPC' : 'Registered EPC')
                            );

                            if (epcType === 'Buyer EPC') {
                              return (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                                  🟢 Buyer EPC
                                </span>
                              );
                            }
                            if (epcType === 'Verified EPC') {
                              return (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 dark:bg-blue-950/70 dark:text-blue-300 border border-blue-300 dark:border-blue-800">
                                  🔵 Verified EPC
                                </span>
                              );
                            }
                            return (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/70 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
                                🟠 Registered EPC
                              </span>
                            );
                          })()}

                          {/* GST Status Badge as per Boss's rule */}
                          {lead.gst_verification_status === 'verified_automatic' ? (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                              ✓ Auto Verified (Database)
                            </span>
                          ) : (lead.gst_verification_status === 'verified_admin' || lead.status === 'converted' || lead.status === 'approved') && (lead.gst_number || lead.gstin) ? (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-300 dark:border-blue-800">
                              ✓ Verified by Admin ({lead.gst_number || lead.gstin})
                            </span>
                          ) : (lead.gst_number || lead.gstin) ? (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
                              ⏳ GST: {lead.gst_number || lead.gstin} (Verify on Approve)
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-medium bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                              ⚠️ GST at Checkout
                            </span>
                          )}
                        </div>
                        <div className="mt-1 flex items-center gap-2 text-xs">
                          <a
                            href={`tel:+91${lead.phone}`}
                            className="inline-flex items-center gap-1 font-mono font-semibold text-blue-600 dark:text-blue-400 hover:underline"
                          >
                            <FiPhone className="text-[10px]" /> +91 {lead.phone}
                          </a>
                          <a
                            href={`https://wa.me/91${lead.phone}?text=Hello%20${encodeURIComponent(
                              lead.name
                            )},%20thank%20you%20for%20your%20bulk%20solar%20kits%20inquiry%20on%20SolarKits!`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="rounded-md bg-emerald-50 dark:bg-emerald-950/60 px-1.5 py-0.5 text-[10px] font-bold text-emerald-700 dark:text-emerald-400 hover:bg-emerald-100"
                          >
                            WhatsApp
                          </a>
                        </div>
                      </td>

                      {/* Region (State & Pincode) */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-1.5 font-semibold text-slate-800 dark:text-slate-200">
                          <FiMapPin className="text-amber-500 shrink-0 text-xs" />
                          <span>{lead.state_name}</span>
                        </div>
                        {lead.pincode && (
                          <div className="mt-0.5 text-[10px] font-mono text-slate-400 pl-4">
                            PIN: {lead.pincode}
                          </div>
                        )}
                      </td>

                      {/* Kit Requirement */}
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-slate-800 dark:text-slate-200">
                          {lead.project_type || 'Bulk Solar Kits'}
                        </div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400">
                          {lead.estimated_quantity || 'Bulk Order'}
                        </div>
                      </td>

                      {/* Assigned BDE */}
                      <td className="py-3.5 px-4">
                        {lead.assigned_bde_id ? (
                          <div>
                            <div className="inline-flex items-center gap-1 font-bold text-indigo-700 dark:text-indigo-300">
                              <FiUserCheck className="text-xs" />
                              {lead.assigned_bde_name || lead.assigned_bde_id.full_name}
                            </div>
                            <div className="text-[10px] font-mono text-slate-400">
                              {lead.assigned_bde_phone || lead.assigned_bde_id.mobile_number}
                            </div>
                          </div>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 dark:bg-amber-950/60 px-2.5 py-0.5 text-[10px] font-bold text-amber-700 dark:text-amber-400">
                            <FiAlertCircle className="text-[9px]" /> Awaiting BDE
                          </span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4">
                        {(() => {
                          const isApproved = lead.status === 'converted' || lead.status === 'approved' || lead.status === 'onboarded';
                          const hasBde = Boolean(lead.assigned_bde_id && (typeof lead.assigned_bde_id === 'object' ? lead.assigned_bde_id._id : lead.assigned_bde_id));

                          if (isApproved) {
                            return (
                              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 shadow-2xs whitespace-nowrap">
                                ✓ Converted & Approved
                              </span>
                            );
                          }

                          if (hasBde) {
                            return (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 border border-blue-200 dark:border-blue-800 whitespace-nowrap">
                                ⚡ BDE Assigned (Pending Approval)
                              </span>
                            );
                          }

                          return (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border border-amber-200 dark:border-amber-800 whitespace-nowrap">
                              ⏳ New / Pending
                            </span>
                          );
                        })()}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {(() => {
                            const isApproved = lead.status === 'converted' || lead.status === 'approved' || lead.status === 'onboarded';
                            const hasBde = Boolean(lead.assigned_bde_id && (typeof lead.assigned_bde_id === 'object' ? lead.assigned_bde_id._id : lead.assigned_bde_id));

                            const leadState = (lead.state_name || lead.state || '').trim().toLowerCase();
                            const stateMatchedBdes = availableBdes.filter((bde) => {
                              if (!leadState) return true;
                              return (bde.state_names || []).some((s) => s.toLowerCase() === leadState);
                            });

                            // 1. STEP 1: If not approved yet -> ONLY show "✓ Approve EPC" button
                            if (!isApproved) {
                              return (
                                <button
                                  type="button"
                                  onClick={() => handleUpdateLead(lead._id, { status: 'converted' })}
                                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 shadow-sm transition-all cursor-pointer whitespace-nowrap active:scale-95"
                                  title="Step 1: Approve this EPC Contractor"
                                >
                                  <span>✓ Approve EPC</span>
                                </button>
                              );
                            }

                            // 2. STEP 2: If Approved, BUT BDE is not yet assigned -> ONLY show BDE Assign Dropdown
                            if (isApproved && !hasBde) {
                              return (
                                <div className="flex items-center gap-2">
                                  <span className="text-[10.5px] font-bold text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/50 px-2 py-1 rounded-md border border-amber-200 whitespace-nowrap">
                                    Step 2: Assign BDE
                                  </span>
                                  <select
                                    value=""
                                    onChange={(e) => {
                                      if (e.target.value) handleUpdateLead(lead._id, { assigned_bde_id: e.target.value });
                                    }}
                                    className="rounded-xl border-2 border-indigo-400 dark:border-indigo-600 bg-white dark:bg-slate-800 px-3 py-1.5 text-xs font-bold text-indigo-700 dark:text-indigo-300 outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer shadow-xs"
                                  >
                                    <option value="">+ Assign BDE</option>
                                    {stateMatchedBdes.map((bde) => (
                                      <option key={bde._id} value={bde._id}>
                                        {bde.full_name} ({bde.bde_id})
                                      </option>
                                    ))}
                                  </select>
                                </div>
                              );
                            }

                            // 3. STEP 3: If Approved AND BDE Assigned -> SHOW "Send Access" button!
                            return (
                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSelectedLeadForAccess({
                                      company_name: lead.name,
                                      name: lead.name,
                                      email: lead.email || '',
                                      whatsapp: lead.phone,
                                      phone_number: lead.phone,
                                      assigned_bde_name: lead.assigned_bde_name || lead.assigned_bde_id?.full_name,
                                      assigned_bde_phone: lead.assigned_bde_phone || lead.assigned_bde_id?.mobile_number
                                    });
                                    setShowWelcomeModal(true);
                                  }}
                                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-extrabold text-white bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 hover:from-emerald-700 hover:to-teal-800 shadow-md shadow-emerald-600/25 transition-all cursor-pointer whitespace-nowrap active:scale-95"
                                  title="Step 3: Send Welcome Login Access & PIN Setup"
                                >
                                  <FiSend className="text-xs" />
                                  <span>Send Access</span>
                                </button>

                                <select
                                  value={lead.assigned_bde_id?._id || ''}
                                  onChange={(e) => {
                                    if (e.target.value === 'unassign') handleUpdateLead(lead._id, { assigned_bde_id: 'unassign' });
                                    else if (e.target.value) handleUpdateLead(lead._id, { assigned_bde_id: e.target.value });
                                  }}
                                  className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-2 py-1 text-[11px] text-slate-600 dark:text-slate-300 outline-none cursor-pointer"
                                  title="Change BDE if needed"
                                >
                                  <option value={lead.assigned_bde_id?._id || ''}>Change BDE</option>
                                  {stateMatchedBdes.map((bde) => (
                                    <option key={bde._id} value={bde._id}>
                                      {bde.full_name}
                                    </option>
                                  ))}
                                </select>
                              </div>
                            );
                          })()}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        {pagination.pages > 1 && (
          <div className="flex items-center justify-between border-t border-slate-200 dark:border-slate-800 px-4 py-3 text-xs text-slate-500">
            <span>
              Showing page <strong className="text-slate-900 dark:text-white">{page}</strong> of{' '}
              <strong className="text-slate-900 dark:text-white">{pagination.pages}</strong> ({pagination.total} leads)
            </span>
            <div className="flex gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
                className="rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-1 text-xs font-semibold disabled:opacity-40 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800"
              >
                Previous
              </button>
              <button
                disabled={page >= pagination.pages}
                onClick={() => setPage((p) => p + 1)}
                className="rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-1 text-xs font-semibold disabled:opacity-40 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Dynamic CSV Import Modal for Admin Panel */}
      {showAdminImportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white dark:bg-slate-800 rounded-3xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-700 max-h-[90vh] overflow-y-auto">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-700">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600">
                  <FiUploadCloud className="text-xl" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">Import EPC Leads (Dynamic Field Mapping)</h3>
                  <p className="text-[11px] text-slate-500">Upload CSV with custom column headers and dynamically match or alter fields</p>
                </div>
              </div>
              <button
                onClick={() => setShowAdminImportModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
              >
                <FiX />
              </button>
            </div>

            {/* Modal Body */}
            <div className="py-4 space-y-4">
              {importStep === 1 ? (
                /* Step 1: Upload File */
                <div className="border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-2xl p-8 text-center bg-slate-50/50 dark:bg-slate-900/30">
                  <FiFileText className="text-4xl text-emerald-500 mx-auto mb-3" />
                  <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">Select EPC Leads CSV / Text File</h4>
                  <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
                    Export your leads from Excel, CRM, or marketing tools. You can customize and remap headers in the next step.
                  </p>
                  <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
                    <label className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white text-xs font-bold cursor-pointer shadow-md">
                      <FiUploadCloud />
                      <span>Choose File (.csv, .txt)</span>
                      <input
                        type="file"
                        accept=".csv,text/csv,text/plain"
                        onChange={handleFileChange}
                        className="hidden"
                      />
                    </label>
                    <button
                      type="button"
                      onClick={handleDownloadSampleCsv}
                      className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-emerald-300 dark:border-emerald-700 bg-white dark:bg-slate-800 text-emerald-700 dark:text-emerald-300 text-xs font-bold hover:bg-emerald-50 cursor-pointer shadow-xs"
                    >
                      <FiDownload />
                      <span>Download Sample CSV</span>
                    </button>
                  </div>
                </div>
              ) : (
                /* Step 2: Dynamic Field Mapping & Live Preview */
                <div className="space-y-4">
                  <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 rounded-xl p-3 flex items-center justify-between text-xs">
                    <div>
                      <span className="font-bold text-emerald-900 dark:text-emerald-300">File: {csvFileName}</span>
                      <span className="text-emerald-700 dark:text-emerald-400 ml-2">({rawCsvRows.length} rows loaded, {csvHeaders.length} headers detected)</span>
                    </div>
                    <button
                      onClick={() => setImportStep(1)}
                      className="text-emerald-700 dark:text-emerald-400 hover:underline font-semibold cursor-pointer"
                    >
                      Change File
                    </button>
                  </div>

                  {/* Standard Fields Configurator */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">System Field Mapping</h4>
                      <span className="text-[11px] text-slate-400">Match your CSV header to SolarKits fields</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                      {/* Name */}
                      <div>
                        <label className="block text-slate-600 dark:text-slate-400 font-semibold mb-1">Company / EPC Name *</label>
                        <select
                          value={fieldMappings.name}
                          onChange={(e) => setFieldMappings(prev => ({ ...prev, name: e.target.value }))}
                          className="w-full rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-1.5 text-xs text-slate-900 dark:text-white"
                        >
                          <option value="">-- Choose CSV Column --</option>
                          {csvHeaders.map(h => <option key={h} value={h}>{h}</option>)}
                        </select>
                      </div>

                      {/* Contact Person */}
                      <div>
                        <label className="block text-slate-600 dark:text-slate-400 font-semibold mb-1">Contact Person</label>
                        <select
                          value={fieldMappings.contactPerson}
                          onChange={(e) => setFieldMappings(prev => ({ ...prev, contactPerson: e.target.value }))}
                          className="w-full rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-1.5 text-xs text-slate-900 dark:text-white"
                        >
                          <option value="">-- Choose CSV Column --</option>
                          {csvHeaders.map(h => <option key={h} value={h}>{h}</option>)}
                        </select>
                      </div>

                      {/* Phone */}
                      <div>
                        <label className="block text-slate-600 dark:text-slate-400 font-semibold mb-1">Mobile / WhatsApp *</label>
                        <select
                          value={fieldMappings.phone}
                          onChange={(e) => setFieldMappings(prev => ({ ...prev, phone: e.target.value }))}
                          className="w-full rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-1.5 text-xs text-slate-900 dark:text-white"
                        >
                          <option value="">-- Choose CSV Column --</option>
                          {csvHeaders.map(h => <option key={h} value={h}>{h}</option>)}
                        </select>
                      </div>

                      {/* Email */}
                      <div>
                        <label className="block text-slate-600 dark:text-slate-400 font-semibold mb-1">Email Address</label>
                        <select
                          value={fieldMappings.email}
                          onChange={(e) => setFieldMappings(prev => ({ ...prev, email: e.target.value }))}
                          className="w-full rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-1.5 text-xs text-slate-900 dark:text-white"
                        >
                          <option value="">-- Choose CSV Column --</option>
                          {csvHeaders.map(h => <option key={h} value={h}>{h}</option>)}
                        </select>
                      </div>

                      {/* GSTIN */}
                      <div>
                        <label className="block text-slate-600 dark:text-slate-400 font-semibold mb-1">GSTIN (for Verified Status)</label>
                        <select
                          value={fieldMappings.gstin}
                          onChange={(e) => setFieldMappings(prev => ({ ...prev, gstin: e.target.value }))}
                          className="w-full rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-1.5 text-xs text-slate-900 dark:text-white"
                        >
                          <option value="">-- Choose CSV Column (Optional) --</option>
                          {csvHeaders.map(h => <option key={h} value={h}>{h}</option>)}
                        </select>
                      </div>

                      {/* Lifetime Orders */}
                      <div>
                        <label className="block text-slate-600 dark:text-slate-400 font-semibold mb-1">Lifetime Orders / Kits (Buyer EPC)</label>
                        <select
                          value={fieldMappings.lifetimeOrders}
                          onChange={(e) => setFieldMappings(prev => ({ ...prev, lifetimeOrders: e.target.value }))}
                          className="w-full rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-1.5 text-xs text-slate-900 dark:text-white"
                        >
                          <option value="">-- Choose CSV Column (Optional) --</option>
                          {csvHeaders.map(h => <option key={h} value={h}>{h}</option>)}
                        </select>
                      </div>

                      {/* State */}
                      <div>
                        <label className="block text-slate-600 dark:text-slate-400 font-semibold mb-1">State</label>
                        <select
                          value={fieldMappings.state}
                          onChange={(e) => setFieldMappings(prev => ({ ...prev, state: e.target.value }))}
                          className="w-full rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-1.5 text-xs text-slate-900 dark:text-white"
                        >
                          <option value="">-- Choose CSV Column --</option>
                          {csvHeaders.map(h => <option key={h} value={h}>{h}</option>)}
                        </select>
                      </div>

                      {/* Cluster */}
                      <div>
                        <label className="block text-slate-600 dark:text-slate-400 font-semibold mb-1">Cluster / District</label>
                        <select
                          value={fieldMappings.cluster}
                          onChange={(e) => setFieldMappings(prev => ({ ...prev, cluster: e.target.value }))}
                          className="w-full rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-1.5 text-xs text-slate-900 dark:text-white"
                        >
                          <option value="">-- Choose CSV Column --</option>
                          {csvHeaders.map(h => <option key={h} value={h}>{h}</option>)}
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Dynamic Custom Fields Section */}
                  <div className="pt-2 border-t border-slate-200 dark:border-slate-700">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Custom Dynamic Fields</span>
                      <button
                        type="button"
                        onClick={handleAddCustomField}
                        className="text-xs text-emerald-600 hover:text-emerald-700 font-bold inline-flex items-center gap-1 cursor-pointer"
                      >
                        <FiPlus /> Add Dynamic Field
                      </button>
                    </div>

                    {customFields.length === 0 ? (
                      <p className="text-[11px] text-slate-400 italic">No extra custom fields. Click "+ Add Dynamic Field" to include specific CSV columns.</p>
                    ) : (
                      <div className="space-y-2">
                        {customFields.map((cf) => (
                          <div key={cf.key} className="flex items-center gap-2">
                            <input
                              type="text"
                              value={cf.label}
                              onChange={(e) => {
                                const val = e.target.value;
                                setCustomFields(prev => prev.map(f => f.key === cf.key ? { ...f, label: val } : f));
                              }}
                              placeholder="Field Name"
                              className="w-1/2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-1.5 text-xs text-slate-900 dark:text-white"
                            />
                            <select
                              value={cf.csvHeader}
                              onChange={(e) => {
                                const val = e.target.value;
                                setCustomFields(prev => prev.map(f => f.key === cf.key ? { ...f, csvHeader: val } : f));
                              }}
                              className="w-1/2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-1.5 text-xs text-slate-900 dark:text-white"
                            >
                              <option value="">-- Select Header --</option>
                              {csvHeaders.map(h => <option key={h} value={h}>{h}</option>)}
                            </select>
                            <button
                              type="button"
                              onClick={() => handleRemoveCustomField(cf.key)}
                              className="text-rose-500 hover:text-rose-700 p-1 cursor-pointer"
                            >
                              <FiTrash2 />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* 3-Type EPC Rule Explanation */}
                  <div className="rounded-xl bg-slate-100 dark:bg-slate-700/50 p-2.5 text-[11px] text-slate-600 dark:text-slate-300 space-y-1">
                    <p className="font-bold text-slate-800 dark:text-slate-200">Automatic EPC Classification Rule:</p>
                    <p>🟢 <strong>Buyer EPC</strong>: Lifetime orders &gt; 0 (Purchased solar kit)</p>
                    <p>🔵 <strong>Verified EPC</strong>: Has valid GSTIN submitted, but 0 orders</p>
                    <p>🟠 <strong>Registered EPC</strong>: No GSTIN provided (remains registered until GSTIN provided)</p>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-700">
              <button
                onClick={() => setShowAdminImportModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer"
              >
                Cancel
              </button>
              {importStep === 2 && (
                <button
                  onClick={handleUploadAndProcess}
                  disabled={importing}
                  className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 disabled:opacity-50 cursor-pointer shadow-md inline-flex items-center gap-1.5"
                >
                  {importing ? (
                    <>
                      <span className="h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent" />
                      Importing to Database...
                    </>
                  ) : (
                    <>
                      <FiCheckCircle />
                      Import {rawCsvRows.length} Leads
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      <SendEpcWelcomeAccessModal
        isOpen={showWelcomeModal}
        onClose={() => setShowWelcomeModal(false)}
        epc={selectedLeadForAccess}
      />
    </div>
  );
}
