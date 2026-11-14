import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { INDIAN_STATES_DISTRICTS } from '../data/territoryData';
import {
  Users,
  Plus,
  Search,
  Filter,
  Calendar,
  Clock,
  RotateCw,
  ArrowRight,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  LayoutGrid,
  List,
  Eye,
  X,
  MapPin,
  Phone,
  Mail,
  Send,
  MessageSquare,
  ShieldCheck,
  Zap,
  Building2,
  Store,
  ChevronRight,
  Edit3,
  CalendarPlus,
  ArrowUpRight,
  Lock,
  Check,
  Loader2,
  UploadCloud,
  FileSpreadsheet,
  Download,
  Trash2,
  AlertCircle,
  FileText,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import api from '../services/api';
import { useBdeAuth } from '../context/BdeAuthContext';

const STAGES = [
  'New',
  'Contacted',
  'Interested',
  'Follow-up',
  'Onboarding Started',
  'GST Verification Pending',
  'Onboarded',
  'Assigned to Franchisee',
  'Not Interested',
  'Closed',
];

const LEAD_SOURCES = [
  { label: 'Direct Field Visit', value: 'direct_visit' },
  { label: 'Phone Call', value: 'phone_call' },
  { label: 'Referral', value: 'referral' },
  { label: 'Trade Show / Expo', value: 'trade_show' },
  { label: 'Digital / Social', value: 'digital' },
  { label: 'Cold Outreach', value: 'cold_outreach' },
  { label: 'Inbound Portal', value: 'portal' },
  { label: 'Head Office Assigned', value: 'head_office_assigned' },
];

const PRODUCT_TYPES = [
  'Residential On-Grid',
  'Commercial On-Grid',
  'Industrial Rooftop',
  'Solar Water Pump',
  'Off-Grid Hybrid Kit',
  'Solar Combo Kits',
];

function getStageBadge(stage) {
  const map = {
    New: 'bg-blue-50 text-blue-700 border-blue-200',
    Contacted: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    Interested: 'bg-amber-50 text-amber-700 border-amber-200',
    'Follow-up': 'bg-purple-50 text-purple-700 border-purple-200',
    'Onboarding Started': 'bg-teal-50 text-teal-700 border-teal-200',
    'GST Verification Pending': 'bg-amber-100 text-amber-900 border-amber-300',
    Onboarded: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    'Assigned to Franchisee': 'bg-emerald-100 text-emerald-800 border-emerald-300 font-bold',
    'Not Interested': 'bg-slate-100 text-slate-600 border-slate-200',
    Closed: 'bg-rose-50 text-rose-700 border-rose-200',
  };
  return map[stage] || 'bg-slate-50 text-slate-600 border-slate-200';
}

const BADGE_COLOR_MAP = {
  purple: 'bg-purple-50 text-purple-800 border-purple-200',
  blue: 'bg-blue-50 text-blue-800 border-blue-200',
  amber: 'bg-amber-50 text-amber-800 border-amber-200',
  emerald: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  green: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  rose: 'bg-rose-50 text-rose-800 border-rose-200',
  red: 'bg-rose-50 text-rose-800 border-rose-200',
  indigo: 'bg-indigo-50 text-indigo-800 border-indigo-200',
  teal: 'bg-teal-50 text-teal-800 border-teal-200',
  cyan: 'bg-cyan-50 text-cyan-800 border-cyan-200',
  orange: 'bg-orange-50 text-orange-800 border-orange-200',
  slate: 'bg-slate-100 text-slate-700 border-slate-200',
};

function getEpcTypeBadge(type, typeList = []) {
  if (!type) return 'bg-slate-50 text-slate-600 border-slate-200';
  const matched = (typeList || []).find(
    (t) => (t.name || '').toLowerCase() === String(type).trim().toLowerCase()
  );
  if (matched?.badge_color && BADGE_COLOR_MAP[matched.badge_color]) {
    return BADGE_COLOR_MAP[matched.badge_color];
  }
  switch ((type || '').toLowerCase()) {
    case 'government contractor':
      return 'bg-purple-50 text-purple-800 border-purple-200';
    case 'tender bidder':
      return 'bg-blue-50 text-blue-800 border-blue-200';
    case 'experienced epc':
      return 'bg-amber-50 text-amber-800 border-amber-200';
    case 'new epc':
      return 'bg-emerald-50 text-emerald-800 border-emerald-200';
    default:
      return 'bg-blue-50 text-blue-800 border-blue-200';
  }
}

export default function BdeEpcLeads() {
  const { canOnboardEpc, canOnboardFranchise } = useBdeAuth();
  const navigate = useNavigate();
  const [leads, setLeads] = useState([]);
  const [stageCounts, setStageCounts] = useState({});
  const [totalAllCount, setTotalAllCount] = useState(0);
  const [companyAssignedCount, setCompanyAssignedCount] = useState(0);
  const [territory, setTerritory] = useState(null);
  const [territories, setTerritories] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [viewMode, setViewMode] = useState('table'); // 'table' | 'kanban'
  const [search, setSearch] = useState('');
  const [stageFilter, setStageFilter] = useState('all');
  const [districtFilter, setDistrictFilter] = useState('all');
  const [epcTypeFilter, setEpcTypeFilter] = useState('all');
  const [epcTypeCounts, setEpcTypeCounts] = useState({});
  const [epcTypes, setEpcTypes] = useState([]);

  // Modals & Drawers
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editLead, setEditLead] = useState(null);
  const [detailLead, setDetailLead] = useState(null);
  const [followUpModalLead, setFollowUpModalLead] = useState(null);
  const [followUpDate, setFollowUpDate] = useState('');
  const [followUpNotes, setFollowUpNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formErrors, setFormErrors] = useState({});

  // Bulk Upload State
  const [bulkModalOpen, setBulkModalOpen] = useState(false);
  const [bulkSettings, setBulkSettings] = useState({
    state_name: '',
    district_name: '',
    lead_source: 'direct_visit',
    epc_type: '',
    epc_type_id: null,
    follow_up_date: '',
    interested_products: ['Residential On-Grid'],
    remarks: '',
  });
  const [showBulkDefaults, setShowBulkDefaults] = useState(true);
  const [parsedRows, setParsedRows] = useState([]);
  const [bulkFilter, setBulkFilter] = useState('all'); // 'all' | 'ready' | 'errors'
  const [bulkDragOver, setBulkDragOver] = useState(false);
  const [bulkSubmitting, setBulkSubmitting] = useState(false);
  const [bulkResult, setBulkResult] = useState(null);

  // Assign Franchisee Modal State
  const [assignModalLead, setAssignModalLead] = useState(null);
  const [eligibleFranchisees, setEligibleFranchisees] = useState([]);
  const [loadingFranchisees, setLoadingFranchisees] = useState(false);
  const [franchiseeSearch, setFranchiseeSearch] = useState('');
  const [selectedFranchisee, setSelectedFranchisee] = useState(null);
  const [assigningLoading, setAssigningLoading] = useState(false);
  const [assignError, setAssignError] = useState('');

  // Form State for Add / Edit
  const [formData, setFormData] = useState({
    company_name: '',
    contact_person: '',
    mobile_number: '',
    email: '',
    gst_number: '',
    state_name: 'Gujarat',
    district_name: 'Ahmedabad',
    pincode: '',
    address_line: '',
    lead_source: 'direct_visit',
    interested_products: ['Residential On-Grid'],
    epc_type: '',
    follow_up_date: '',
    remarks: '',
  });

  // Fetch Dynamic Active EPC Classification Types from Admin Master
  const fetchActiveEpcTypes = useCallback(async () => {
    try {
      const res = await api.get('/epc-types/active');
      if (res.data?.status === 'success' && Array.isArray(res.data.data)) {
        setEpcTypes(res.data.data);
      }
    } catch (err) {
      console.error('Failed to load active EPC types:', err);
    }
  }, []);

  const fetchLeads = useCallback(async () => {
    setLoading(true);
    fetchActiveEpcTypes();
    try {
      const res = await api.get('/epc-leads/list', {
        params: {
          search,
          status: stageFilter,
          district: districtFilter,
          epc_type: epcTypeFilter !== 'all' ? epcTypeFilter : undefined,
          limit: 100,
        },
      });
      if (res.data?.status === 'success') {
        setLeads(res.data.data || []);
        setStageCounts(res.data.stage_counts || {});
        setEpcTypeCounts(res.data.epc_type_counts || {});
        setTotalAllCount(res.data.total_all_leads || res.data.pagination?.total || 0);
        setCompanyAssignedCount(res.data.company_assigned_count || 0);

        const activeTerritories = Array.isArray(res.data.territories) && res.data.territories.length > 0
          ? res.data.territories
          : (res.data.territory && res.data.territory.state_name ? [res.data.territory] : []);
        setTerritories(activeTerritories);
        setTerritory(res.data.territory || activeTerritories[0] || null);

        if (activeTerritories.length > 0) {
          const firstT = activeTerritories[0];
          setFormData((prev) => ({
            ...prev,
            state_name: prev.state_name || firstT.state_name,
            district_name: prev.district_name || firstT.district_names?.[0] || '',
          }));
        }
      }
    } catch (err) {
      console.error('Failed to load EPC leads', err);
    } finally {
      setLoading(false);
    }
  }, [search, stageFilter, districtFilter, epcTypeFilter, fetchActiveEpcTypes]);

  useEffect(() => {
    fetchLeads();
  }, [fetchLeads]);

  useEffect(() => {
    fetchActiveEpcTypes();
  }, [fetchActiveEpcTypes]);

  // Keep Form Data & Bulk Settings default EPC Type aligned with active master types
  useEffect(() => {
    if (epcTypes.length > 0) {
      setFormData((prev) => (!prev.epc_type ? { ...prev, epc_type: epcTypes[0].name } : prev));
      setBulkSettings((prev) => (!prev.epc_type ? {
        ...prev,
        epc_type: epcTypes[0].name,
        epc_type_id: epcTypes[0].id || epcTypes[0]._id || null,
      } : prev));
    }
  }, [epcTypes]);

  // Derive districts for the currently selected state in formData
  const availableDistricts = useMemo(() => {
    const curState = (formData.state_name || '').trim();
    if (!curState) return [];

    // 1. Check if BDE assigned territory matches this state
    const matched = territories.find(
      (t) => t.state_name?.toLowerCase() === curState.toLowerCase()
    );
    if (matched && Array.isArray(matched.district_names) && matched.district_names.length > 0) {
      return matched.district_names;
    }

    // 2. Check INDIAN_STATES_DISTRICTS master list for this state
    const stateKey = Object.keys(INDIAN_STATES_DISTRICTS).find(
      (k) => k.toLowerCase() === curState.toLowerCase()
    );
    if (stateKey && Array.isArray(INDIAN_STATES_DISTRICTS[stateKey]) && INDIAN_STATES_DISTRICTS[stateKey].length > 0) {
      const list = [...INDIAN_STATES_DISTRICTS[stateKey]];
      if (formData.district_name && !list.includes(formData.district_name)) {
        list.unshift(formData.district_name);
      }
      return list;
    }

    if (formData.district_name) {
      return [formData.district_name];
    }
    return [];
  }, [formData.state_name, formData.district_name, territories]);

  // Derive districts and territories for bulkSettings
  const bulkSelectedStateTerritory = territories.find(
    (t) => t.state_name?.toLowerCase() === bulkSettings.state_name?.toLowerCase()
  ) || (territories.length === 1 ? territories[0] : null);

  const bulkAvailableDistricts = bulkSelectedStateTerritory?.district_names || territory?.district_names || [];

  const handleBulkStateSelect = (selectedState) => {
    const matchedTerritory = territories.find((t) => t.state_name === selectedState);
    const firstDistrict = matchedTerritory?.district_names?.[0] || '';
    setBulkSettings((prev) => ({
      ...prev,
      state_name: selectedState,
      district_name: firstDistrict,
    }));
  };

  const handleBulkToggleProduct = (product) => {
    setBulkSettings((prev) => {
      const exists = prev.interested_products.includes(product);
      return {
        ...prev,
        interested_products: exists
          ? prev.interested_products.filter((p) => p !== product)
          : [...prev.interested_products, product],
      };
    });
  };

  const handleStateSelect = (selectedState) => {
    const matchedTerritory = territories.find((t) => t.state_name === selectedState);
    let firstDistrict = matchedTerritory?.district_names?.[0] || '';
    if (!firstDistrict) {
      const stateKey = Object.keys(INDIAN_STATES_DISTRICTS).find((k) => k.toLowerCase() === selectedState?.toLowerCase());
      firstDistrict = stateKey && INDIAN_STATES_DISTRICTS[stateKey]?.[0] ? INDIAN_STATES_DISTRICTS[stateKey][0] : '';
    }
    setFormData((prev) => ({
      ...prev,
      state_name: selectedState,
      district_name: firstDistrict,
    }));
    if (formErrors.state_name) setFormErrors((prev) => ({ ...prev, state_name: null }));
    if (formErrors.district_name) setFormErrors((prev) => ({ ...prev, district_name: null }));
  };

  const handleMobileChange = (e) => {
    const numeric = e.target.value.replace(/\D/g, '').slice(0, 10);
    setFormData((prev) => ({ ...prev, mobile_number: numeric }));
    if (!numeric) {
      setFormErrors((prev) => ({ ...prev, mobile_number: 'Mobile number is required' }));
    } else if (numeric.length < 10) {
      setFormErrors((prev) => ({ ...prev, mobile_number: `Please enter full 10 digits (${numeric.length}/10 entered)` }));
    } else if (!/^[6-9]\d{9}$/.test(numeric)) {
      setFormErrors((prev) => ({ ...prev, mobile_number: 'Indian mobile number must start with 6, 7, 8, or 9' }));
    } else {
      setFormErrors((prev) => ({ ...prev, mobile_number: null }));
    }
  };

  const handleEmailChange = (e) => {
    const val = e.target.value.trim();
    setFormData((prev) => ({ ...prev, email: val }));
    if (!val) {
      setFormErrors((prev) => ({ ...prev, email: 'Email address is required' }));
    } else if (!/^\S+@\S+\.\S+$/.test(val)) {
      setFormErrors((prev) => ({ ...prev, email: 'Please enter a valid email address' }));
    } else {
      setFormErrors((prev) => ({ ...prev, email: null }));
    }
  };

  const handlePincodeChange = (e) => {
    const numeric = e.target.value.replace(/\D/g, '').slice(0, 6);
    setFormData((prev) => ({ ...prev, pincode: numeric }));
    if (numeric && numeric.length < 6) {
      setFormErrors((prev) => ({ ...prev, pincode: 'Pincode must be exactly 6 digits' }));
    } else {
      setFormErrors((prev) => ({ ...prev, pincode: null }));
    }
  };

  const handleGstChange = (e) => {
    const val = e.target.value.toUpperCase().trim().slice(0, 15);
    setFormData((prev) => ({ ...prev, gst_number: val }));
    if (val && !/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(val)) {
      setFormErrors((prev) => ({ ...prev, gst_number: 'Invalid GSTIN format (e.g. 27ABCDE1234F1Z5)' }));
    } else {
      setFormErrors((prev) => ({ ...prev, gst_number: null }));
    }
  };

  const validateForm = () => {
    const errors = {};
    if (!formData.company_name.trim()) errors.company_name = 'EPC Company Name is required';
    if (!formData.contact_person.trim()) errors.contact_person = 'Contact Person Name is required';

    if (!formData.mobile_number) {
      errors.mobile_number = 'Mobile number is required';
    } else if (!/^[6-9]\d{9}$/.test(formData.mobile_number)) {
      errors.mobile_number = 'Please enter a valid 10-digit Indian mobile number (starting with 6, 7, 8, or 9)';
    }

    if (!formData.email) {
      errors.email = 'Email address is required';
    } else if (!/^\S+@\S+\.\S+$/.test(formData.email)) {
      errors.email = 'Please enter a valid email address';
    }

    if (!formData.state_name) errors.state_name = 'State is required';
    if (!formData.district_name) errors.district_name = 'District is required';

    if (formData.pincode && !/^\d{6}$/.test(formData.pincode)) {
      errors.pincode = 'Pincode must be exactly 6 digits';
    }

    if (formData.gst_number && !/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(formData.gst_number)) {
      errors.gst_number = 'Invalid GSTIN format (e.g. 27ABCDE1234F1Z5)';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleOpenCreateModal = () => {
    setEditLead(null);
    setFormErrors({});
    const initialTerritory = territories[0] || territory;
    const initialState = initialTerritory?.state_name || 'Gujarat';
    const initialDistrict = initialTerritory?.district_names?.[0] || '';
    setFormData({
      company_name: '',
      contact_person: '',
      mobile_number: '',
      email: '',
      gst_number: '',
      state_name: initialState,
      district_name: initialDistrict,
      pincode: '',
      address_line: '',
      lead_source: 'direct_visit',
      interested_products: ['Residential On-Grid'],
      epc_type: epcTypes[0]?.name || '',
      follow_up_date: '',
      remarks: '',
    });
    setCreateModalOpen(true);
  };

  const handleOpenBulkModal = () => {
    const initialTerritory = territories[0] || territory;
    const defaultState = formData.state_name || initialTerritory?.state_name || 'Gujarat';
    const defaultDist = formData.district_name || initialTerritory?.district_names?.[0] || '';
    setBulkSettings({
      state_name: defaultState,
      district_name: defaultDist,
      lead_source: 'direct_visit',
      epc_type: epcTypes[0]?.name || '',
      epc_type_id: epcTypes[0]?.id || epcTypes[0]?._id || null,
      follow_up_date: '',
      interested_products: ['Residential On-Grid'],
      remarks: '',
    });
    setParsedRows([]);
    setBulkFilter('all');
    setBulkResult(null);
    setShowBulkDefaults(true);
    setBulkModalOpen(true);
  };

  const handleDownloadSampleTemplate = (format = 'xlsx') => {
    const headers = [
      'EPC Company Name *',
      'Contact Person Name *',
      'Mobile Number *',
      'Email Address *',
      'GST Number (Optional)',
      'State *',
      'District *',
      'Pincode',
      'Address Line',
      'Lead Source',
      'EPC Classification Type',
      'Interested Products',
      'Follow-up Date (YYYY-MM-DD)',
      'Remarks & Requirements',
    ];

    const sampleRow1 = [
      'Apex Solar Tech Pvt Ltd',
      'Rajesh Sharma',
      '9876543210',
      'contact@apexsolar.in',
      '24ABCDE1234F1Z5',
      bulkSettings.state_name || 'Gujarat',
      bulkSettings.district_name || 'Ahmedabad',
      '380001',
      '101 Titanium City Centre, Prahladnagar',
      'direct_visit',
      'New EPC',
      'Residential On-Grid, Commercial On-Grid',
      '2026-11-25',
      'Met at Gujarat Solar Expo 2026',
    ];

    const sampleRow2 = [
      'Surat Power Solutions',
      'Pravin Patel',
      '9825001122',
      'info@suratpower.com',
      '',
      bulkSettings.state_name || 'Gujarat',
      'Surat',
      '395001',
      'Ring Road Industrial Area',
      'referral',
      'Experienced EPC',
      'Commercial On-Grid, Industrial Rooftop',
      '2026-11-30',
      'Interested in 50kW solar inverters',
    ];

    if (format === 'csv') {
      const csvData = [headers, sampleRow1, sampleRow2]
        .map(row => row.map(val => `"${String(val || '').replace(/"/g, '""')}"`).join(','))
        .join('\r\n');
      const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'EPC_Leads_Bulk_Upload_Sample.csv');
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else {
      const ws = XLSX.utils.aoa_to_sheet([headers, sampleRow1, sampleRow2]);
      ws['!cols'] = [
        { wch: 26 },
        { wch: 22 },
        { wch: 16 },
        { wch: 24 },
        { wch: 20 },
        { wch: 16 },
        { wch: 16 },
        { wch: 12 },
        { wch: 35 },
        { wch: 16 },
        { wch: 24 },
        { wch: 32 },
        { wch: 20 },
        { wch: 30 },
      ];
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'EPC Leads');
      XLSX.writeFile(wb, 'EPC_Leads_Bulk_Upload_Sample.xlsx');
    }
  };

  const handleProcessWorkbook = (dataBinary) => {
    try {
      const workbook = XLSX.read(dataBinary, { type: 'binary', cellDates: true });
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      const rows = XLSX.utils.sheet_to_json(sheet, { defval: '', raw: false });

      if (!rows || rows.length === 0) {
        alert('The uploaded file does not contain any data rows.');
        return;
      }

      const allowedStates = territories.map(t => (t.state_name || '').toLowerCase());

      const mapped = rows.map((rawRow, idx) => {
        const normalized = {};
        Object.entries(rawRow).forEach(([k, v]) => {
          const normKey = String(k || '').toLowerCase().replace(/[^a-z0-9]/g, '');
          if (normKey.includes('company') || normKey.includes('firm') || normKey.includes('contractor') || normKey === 'name') {
            if (!normalized.company_name) normalized.company_name = v;
          } else if (normKey.includes('contactperson') || normKey.includes('contactname') || normKey.includes('person') || normKey.includes('owner')) {
            if (!normalized.contact_person) normalized.contact_person = v;
          } else if (normKey.includes('mobile') || normKey.includes('phone') || normKey.includes('contactno') || normKey.includes('cell')) {
            if (!normalized.mobile_number) normalized.mobile_number = v;
          } else if (normKey.includes('email') || normKey.includes('mail')) {
            if (!normalized.email) normalized.email = v;
          } else if (normKey.includes('gst') || normKey.includes('gstin')) {
            if (!normalized.gst_number) normalized.gst_number = v;
          } else if (normKey.includes('district') || normKey.includes('city')) {
            if (!normalized.district_name) normalized.district_name = v;
          } else if (normKey.includes('state')) {
            if (!normalized.state_name) normalized.state_name = v;
          } else if (normKey.includes('pin') || normKey.includes('zip')) {
            if (!normalized.pincode) normalized.pincode = v;
          } else if (normKey.includes('address') || normKey.includes('location')) {
            if (!normalized.address_line) normalized.address_line = v;
          } else if (normKey.includes('source')) {
            if (!normalized.lead_source) normalized.lead_source = v;
          } else if (normKey.includes('classification') || normKey.includes('type') || normKey.includes('epctype')) {
            if (!normalized.epc_type) normalized.epc_type = v;
          } else if (normKey.includes('product') || normKey.includes('project')) {
            if (!normalized.interested_products) normalized.interested_products = v;
          } else if (normKey.includes('followup') || normKey.includes('follow')) {
            if (!normalized.follow_up_date) normalized.follow_up_date = v;
          } else if (normKey.includes('remark') || normKey.includes('note') || normKey.includes('requirement')) {
            if (!normalized.remarks) normalized.remarks = v;
          }
        });

        const company = String(normalized.company_name || '').trim();
        const contact = String(normalized.contact_person || company || '').trim();
        const mobile = String(normalized.mobile_number || '').trim().replace(/\D/g, '');
        const email = String(normalized.email || '').trim().toLowerCase();
        const state = String(normalized.state_name || bulkSettings.state_name || '').trim();
        const district = String(normalized.district_name || bulkSettings.district_name || '').trim();
        const gst = normalized.gst_number ? String(normalized.gst_number).trim().toUpperCase() : '';
        const pin = normalized.pincode ? String(normalized.pincode).trim().replace(/\D/g, '') : '';
        const address = normalized.address_line ? String(normalized.address_line).trim() : '';
        const source = normalized.lead_source ? String(normalized.lead_source).trim() : bulkSettings.lead_source;
        const epcType = normalized.epc_type ? String(normalized.epc_type).trim() : bulkSettings.epc_type;

        let products = bulkSettings.interested_products;
        if (normalized.interested_products) {
          if (Array.isArray(normalized.interested_products)) {
            products = normalized.interested_products;
          } else if (typeof normalized.interested_products === 'string' && normalized.interested_products.trim()) {
            products = normalized.interested_products.split(',').map(s => s.trim()).filter(Boolean);
          }
        }

        const followUp = normalized.follow_up_date ? String(normalized.follow_up_date).trim() : bulkSettings.follow_up_date;
        const remarks = normalized.remarks ? String(normalized.remarks).trim() : bulkSettings.remarks;

        const rowErrors = [];
        if (!company) rowErrors.push('Missing Company Name');
        if (!contact) rowErrors.push('Missing Contact Person');
        if (!mobile || !/^[6-9]\d{9}$/.test(mobile)) rowErrors.push('Invalid 10-digit Mobile (must start with 6-9)');
        if (!email || !/^\S+@\S+\.\S+$/.test(email)) rowErrors.push('Invalid Email');
        if (!state) rowErrors.push('Missing State');
        if (!district) rowErrors.push('Missing District');
        if (allowedStates.length > 0 && !allowedStates.includes(state.toLowerCase())) {
          rowErrors.push(`State "${state}" outside territory`);
        }
        if (gst && !/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(gst)) {
          rowErrors.push('Invalid 15-char GSTIN format');
        }
        if (pin && !/^\d{6}$/.test(pin)) {
          rowErrors.push('Pincode must be 6 digits');
        }

        return {
          _id_temp: `temp_${idx}_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
          company_name: company,
          contact_person: contact,
          mobile_number: mobile,
          email: email,
          gst_number: gst,
          state_name: state,
          district_name: district,
          pincode: pin,
          address_line: address,
          lead_source: source,
          epc_type: epcType,
          interested_products: products,
          follow_up_date: followUp,
          remarks: remarks,
          _errors: rowErrors,
          _isValid: rowErrors.length === 0,
        };
      });

      setParsedRows(mapped);
    } catch (err) {
      console.error('File parsing error', err);
      alert('Failed to parse file: ' + err.message);
    }
  };

  const handleFileDrop = (e) => {
    e.preventDefault();
    setBulkDragOver(false);
    const files = e.dataTransfer?.files;
    if (files && files[0]) {
      handleFileSelected(files[0]);
    }
  };

  const handleFileSelected = (file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      handleProcessWorkbook(e.target.result);
    };
    reader.readAsBinaryString(file);
  };

  const handleUpdateParsedRow = (idTemp, field, value) => {
    const allowedStates = territories.map(t => (t.state_name || '').toLowerCase());
    setParsedRows(prev =>
      prev.map(row => {
        if (row._id_temp !== idTemp) return row;
        const updated = { ...row, [field]: value };

        const errors = [];
        const company = (updated.company_name || '').trim();
        const contact = (updated.contact_person || company || '').trim();
        const mobile = String(updated.mobile_number || '').trim().replace(/\D/g, '');
        const email = String(updated.email || '').trim().toLowerCase();
        const state = (updated.state_name || '').trim();
        const district = (updated.district_name || '').trim();
        const gst = updated.gst_number ? String(updated.gst_number).trim().toUpperCase() : '';
        const pin = updated.pincode ? String(updated.pincode).trim().replace(/\D/g, '') : '';

        if (!company) errors.push('Missing Company Name');
        if (!contact) errors.push('Missing Contact Person');
        if (!mobile || !/^[6-9]\d{9}$/.test(mobile)) errors.push('Invalid 10-digit Mobile (must start with 6-9)');
        if (!email || !/^\S+@\S+\.\S+$/.test(email)) errors.push('Invalid Email');
        if (!state) errors.push('Missing State');
        if (!district) errors.push('Missing District');
        if (allowedStates.length > 0 && !allowedStates.includes(state.toLowerCase())) {
          errors.push(`State "${state}" outside territory`);
        }
        if (gst && !/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(gst)) {
          errors.push('Invalid 15-char GSTIN format');
        }
        if (pin && !/^\d{6}$/.test(pin)) {
          errors.push('Pincode must be 6 digits');
        }

        return {
          ...updated,
          company_name: company,
          contact_person: contact,
          mobile_number: mobile,
          email: email,
          state_name: state,
          district_name: district,
          gst_number: gst,
          pincode: pin,
          _errors: errors,
          _isValid: errors.length === 0,
        };
      })
    );
  };

  const handleDeleteParsedRow = (idTemp) => {
    setParsedRows(prev => prev.filter(r => r._id_temp !== idTemp));
  };

  const handleSubmitBulkUpload = async () => {
    const validRows = parsedRows.filter(r => r._isValid);
    if (validRows.length === 0) {
      alert('There are no valid leads ready to import. Please review and fix any errors first.');
      return;
    }

    setBulkSubmitting(true);
    try {
      const payload = {
        leads: validRows,
        default_settings: bulkSettings,
      };
      const res = await api.post('/epc-leads/bulk-create', payload);
      if (res.data?.status === 'success') {
        setBulkResult(res.data.data);
        fetchLeads();
      }
    } catch (err) {
      alert(err.response?.data?.message || err.message || 'Bulk upload failed');
    } finally {
      setBulkSubmitting(false);
    }
  };

  const handleOpenEditModal = (lead) => {
    setEditLead(lead);
    setFormErrors({});
    const leadState = lead.state_name || lead.state || (territories[0]?.state_name || '');
    
    // Resolve initial district from lead, or state's first district, NOT defaulting to another state's district
    let initialDistrict = lead.district_name || lead.district || '';
    if (!initialDistrict) {
      const matched = territories.find((t) => t.state_name?.toLowerCase() === leadState.toLowerCase());
      if (matched && matched.district_names?.[0]) {
        initialDistrict = matched.district_names[0];
      } else {
        const stateKey = Object.keys(INDIAN_STATES_DISTRICTS).find((k) => k.toLowerCase() === leadState.toLowerCase());
        if (stateKey && INDIAN_STATES_DISTRICTS[stateKey]?.[0]) {
          initialDistrict = INDIAN_STATES_DISTRICTS[stateKey][0];
        }
      }
    }

    setFormData({
      company_name: lead.company_name || '',
      contact_person: lead.contact_person || '',
      mobile_number: lead.mobile_number || '',
      email: lead.email || '',
      gst_number: lead.gst_number || '',
      state_name: leadState,
      district_name: initialDistrict,
      pincode: lead.pincode || '',
      address_line: lead.address_line || '',
      lead_source: lead.lead_source || 'direct_visit',
      interested_products: lead.interested_products || ['Residential On-Grid'],
      epc_type: lead.epc_type || epcTypes[0]?.name || '',
      follow_up_date: lead.follow_up_date ? lead.follow_up_date.split('T')[0] : '',
      remarks: lead.remarks || '',
    });
    setCreateModalOpen(true);
  };

  const handleSubmitLeadForm = async (e) => {
    e.preventDefault();
    if (!validateForm()) {
      return;
    }
    setSubmitting(true);
    try {
      if (editLead) {
        const res = await api.put(`/epc-leads/update/${editLead._id}`, formData);
        if (res.data?.status === 'success') {
          alert('EPC Lead updated successfully!');
          setCreateModalOpen(false);
          if (detailLead && (detailLead._id === editLead._id || detailLead.id === editLead._id)) {
            setDetailLead(prev => ({ ...prev, ...formData, ...(res.data?.data || {}) }));
          }
          fetchLeads();
        }
      } else {
        const res = await api.post('/epc-leads/create', formData);
        if (res.data?.status === 'success') {
          alert(`EPC Lead ${res.data.data.lead_id} created successfully!`);
          setCreateModalOpen(false);
          fetchLeads();
        }
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Operation failed');
    } finally {
      setSubmitting(false);
    }
  };

  const handleScheduleFollowUp = async (e) => {
    e.preventDefault();
    if (!followUpDate) {
      alert('Please select a follow up date');
      return;
    }
    setSubmitting(true);
    try {
      const res = await api.post(`/epc-leads/follow-up/${followUpModalLead._id}`, {
        follow_up_date: followUpDate,
        notes: followUpNotes,
      });
      if (res.data?.status === 'success') {
        alert('Follow-up scheduled successfully!');
        setFollowUpModalLead(null);
        setFollowUpDate('');
        setFollowUpNotes('');
        fetchLeads();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to schedule follow-up');
    } finally {
      setSubmitting(false);
    }
  };

  const handleStartOnboarding = (lead) => {
    if (canOnboardEpc === false) {
      alert('EPC Onboarding is restricted for your BDE account by Administrator.');
      return;
    }
    // Navigate to GST Onboarding Wizard with lead info passed in state
    navigate('/epc-onboarding', { state: { lead } });
  };

  const handleOpenAssignModal = async (lead) => {
    setAssignModalLead(lead);
    setSelectedFranchisee(null);
    setFranchiseeSearch('');
    setAssignError('');
    setLoadingFranchisees(true);
    try {
      const res = await api.get('/epc/eligible-franchisees', {
        params: {
          state_name: lead.state_name,
          district_name: lead.district_name,
        },
      });
      if (res.data?.status === 'success' && Array.isArray(res.data.data)) {
        setEligibleFranchisees(res.data.data);
      } else {
        const fallbackRes = await api.get('/epc/franchise-partners');
        setEligibleFranchisees(fallbackRes.data?.data || []);
      }
    } catch (err) {
      try {
        const fallbackRes = await api.get('/epc/franchise-partners');
        setEligibleFranchisees(fallbackRes.data?.data || []);
      } catch (err2) {
        setAssignError('Failed to load eligible franchise partners');
      }
    } finally {
      setLoadingFranchisees(false);
    }
  };

  const handleConfirmAssignment = async () => {
    if (!selectedFranchisee || !assignModalLead) {
      setAssignError('Please select a franchisee partner to assign');
      return;
    }
    setAssigningLoading(true);
    setAssignError('');
    try {
      const res = await api.post('/epc/assign-franchisee', {
        lead_id: assignModalLead._id,
        epc_account_id: assignModalLead.onboarded_epc_account_id || undefined,
        reseller_id: selectedFranchisee.id || selectedFranchisee._id,
      });

      if (res.data?.status === 'success') {
        const assignedData = {
          _id: selectedFranchisee.id || selectedFranchisee._id,
          business_name: selectedFranchisee.business_name,
          reseller_code: selectedFranchisee.reseller_code,
          mobile: selectedFranchisee.mobile,
        };

        setLeads((prev) =>
          prev.map((l) =>
            l._id === assignModalLead._id
              ? {
                ...l,
                lead_status: 'Assigned to Franchisee',
                assigned_franchisee_id: assignedData,
                assigned_franchisee_name: selectedFranchisee.business_name,
              }
              : l
          )
        );

        if (detailLead && detailLead._id === assignModalLead._id) {
          setDetailLead((prev) => ({
            ...prev,
            lead_status: 'Assigned to Franchisee',
            assigned_franchisee_id: assignedData,
            assigned_franchisee_name: selectedFranchisee.business_name,
          }));
        }

        setAssignModalLead(null);
        fetchLeads();
      } else {
        setAssignError(res.data?.message || 'Failed to assign franchisee');
      }
    } catch (err) {
      setAssignError(err.response?.data?.message || 'Failed to assign franchisee');
    } finally {
      setAssigningLoading(false);
    }
  };

  const handleToggleProduct = (product) => {
    setFormData((prev) => {
      const exists = prev.interested_products.includes(product);
      return {
        ...prev,
        interested_products: exists
          ? prev.interested_products.filter((p) => p !== product)
          : [...prev.interested_products, product],
      };
    });
  };

  const totalLeadsCount = totalAllCount || (stageCounts ? Object.values(stageCounts).reduce((a, b) => a + b, 0) : leads.length);
  const onboardedCount = (stageCounts['Onboarded'] || 0) + (stageCounts['Assigned to Franchisee'] || 0);
  const assignedCount = stageCounts['Assigned to Franchisee'] || 0;
  const followUpCount = stageCounts['Follow-up'] || 0;

  return (
    <div className="space-y-6">
      {/* Lead Category Switcher */}
      <div className="flex items-center gap-2 bg-slate-100 p-1.5 rounded-2xl w-fit border border-slate-200">
        {canOnboardFranchise !== false && (
          <button
            type="button"
            onClick={() => navigate('/leads')}
            className="px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 text-slate-600 hover:text-slate-900"
          >
            <Building2 className="w-4 h-4 text-blue-600" />
            <span>Franchisee Partner Leads (HO Assigned)</span>
          </button>
        )}

        <button
          type="button"
          onClick={() => navigate('/epc-leads')}
          className="px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 bg-white text-blue-700 shadow-sm border border-blue-200/80"
        >
          <Zap className="w-4 h-4 text-amber-500" />
          <span>EPC Contractor Leads (Field Pipeline)</span>
          <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-blue-100 text-blue-800 font-black">
            {totalLeadsCount}
          </span>
        </button>
      </div>

      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 bg-blue-100 text-blue-800 text-[11px] font-bold rounded-full uppercase">
              EPC Pipeline
            </span>
            {territory?.state_name && (
              <span className="text-xs font-semibold text-slate-500 flex items-center gap-1">
                <MapPin className="w-3 h-3 text-slate-400" /> {territory.state_name}
              </span>
            )}
          </div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900 mt-1">
            EPC Leads & Prospect Management
          </h1>
          <p className="text-xs text-slate-500">
            Generate EPC contractor leads, track 10-stage follow-ups, and initiate GST-based onboarding.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={fetchLeads}
            className="p-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 transition"
            title="Refresh Leads"
          >
            <RotateCw className="w-4 h-4" />
          </button>
          {canOnboardEpc !== false && (
            <button
              onClick={() => navigate('/epc-onboarding')}
              className="px-4 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold rounded-xl text-xs transition shadow-md shadow-emerald-600/20 flex items-center gap-2"
            >
              <ShieldCheck className="w-4 h-4" /> GST Onboarding Wizard
            </button>
          )}
          <button
            onClick={handleOpenBulkModal}
            className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs transition shadow-md shadow-indigo-600/20 flex items-center gap-2"
            title="Bulk Upload 100-200 EPC Leads via Excel / CSV"
          >
            <UploadCloud className="w-4 h-4" /> Bulk Upload Leads
          </button>
          <button
            onClick={handleOpenCreateModal}
            className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs transition shadow-md shadow-blue-600/20 flex items-center gap-2"
          >
            <Plus className="w-4 h-4" /> Add EPC Lead
          </button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs space-y-1">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total EPC Leads</span>
          <div className="text-2xl font-black text-slate-900">{totalLeadsCount}</div>
          <span className="text-[10px] text-slate-500 font-medium">In your territory</span>
        </div>
        <div className="p-4 bg-white rounded-2xl border border-purple-100 shadow-xs space-y-1">
          <span className="text-[11px] font-bold text-purple-600 uppercase tracking-wider">Follow-ups Due</span>
          <div className="text-2xl font-black text-purple-700">{followUpCount}</div>
          <span className="text-[10px] text-purple-600 font-medium">Scheduled contacts</span>
        </div>
        <div className="p-4 bg-white rounded-2xl border border-teal-100 shadow-xs space-y-1">
          <span className="text-[11px] font-bold text-teal-600 uppercase tracking-wider">GST Onboarded</span>
          <div className="text-2xl font-black text-teal-700">{onboardedCount}</div>
          <span className="text-[10px] text-teal-600 font-medium">Verified accounts</span>
        </div>
        <div className="p-4 bg-white rounded-2xl border border-emerald-100 shadow-xs space-y-1">
          <span className="text-[11px] font-bold text-emerald-600 uppercase tracking-wider">Assigned to Franchisee</span>
          <div className="text-2xl font-black text-emerald-700">{assignedCount}</div>
          <span className="text-[10px] text-emerald-600 font-medium">Active partners</span>
        </div>
      </div>

      {/* Filter & View Control Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Search */}
          <div className="flex-1 flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2">
            <Search className="w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search EPC leads by company name, contact, mobile, email, or GSTIN..."
              className="w-full bg-transparent text-xs text-slate-800 focus:outline-none placeholder-slate-400"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* District Filter */}
            {territory?.district_names && territory.district_names.length > 0 && (
              <select
                value={districtFilter}
                onChange={(e) => setDistrictFilter(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 focus:outline-none"
              >
                <option value="all">All Districts</option>
                {territory.district_names.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            )}

            {/* EPC Type Filter */}
            <select
              value={epcTypeFilter}
              onChange={(e) => setEpcTypeFilter(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 focus:outline-none"
            >
              <option value="all">All EPC Types</option>
              {epcTypes.map((t) => (
                <option key={t.id || t.code || t.name} value={t.name}>
                  {t.name}
                </option>
              ))}
            </select>

            {/* View Mode Toggle */}
            <div className="flex items-center bg-slate-100 p-1 rounded-xl">
              <button
                onClick={() => setViewMode('table')}
                className={`p-1.5 rounded-lg text-xs font-bold transition ${viewMode === 'table' ? 'bg-white text-blue-700 shadow-xs' : 'text-slate-500 hover:text-slate-900'
                  }`}
                title="Table View"
              >
                <List className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('kanban')}
                className={`p-1.5 rounded-lg text-xs font-bold transition ${viewMode === 'kanban' ? 'bg-white text-blue-700 shadow-xs' : 'text-slate-500 hover:text-slate-900'
                  }`}
                title="Kanban Pipeline"
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* 10-Stage Quick Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
          <button
            onClick={() => setStageFilter('all')}
            className={`px-3 py-1 rounded-lg font-bold shrink-0 transition ${stageFilter === 'all' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
          >
            All Leads ({totalLeadsCount})
          </button>
          <button
            onClick={() => setStageFilter('company_assigned')}
            className={`px-3 py-1 rounded-lg font-bold shrink-0 transition flex items-center gap-1.5 ${stageFilter === 'company_assigned' ? 'bg-blue-600 text-white shadow-xs' : 'bg-blue-50 border border-blue-200 text-blue-700 hover:bg-blue-100'
              }`}
          >
            <Sparkles className="w-3 h-3 text-amber-400" />
            <span>Company Assigned</span>
            <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-black ${stageFilter === 'company_assigned' ? 'bg-white/20 text-white' : 'bg-blue-200 text-blue-900'}`}>
              {companyAssignedCount}
            </span>
          </button>
          {STAGES.map((st) => (
            <button
              key={st}
              onClick={() => setStageFilter(st)}
              className={`px-3 py-1 rounded-lg font-bold shrink-0 transition flex items-center gap-1.5 ${stageFilter === st ? 'bg-blue-600 text-white shadow-xs' : 'bg-slate-50 border border-slate-200 text-slate-600 hover:bg-slate-100'
                }`}
            >
              <span>{st}</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-black ${stageFilter === st ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'}`}>
                {stageCounts[st] || 0}
              </span>
            </button>
          ))}
        </div>

        {/* EPC Types Quick Filter & Live Metrics Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pt-2 border-t border-slate-100 text-xs">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider shrink-0 mr-1">
            EPC Type:
          </span>
          <button
            onClick={() => setEpcTypeFilter('all')}
            className={`px-2.5 py-1 rounded-lg font-bold shrink-0 transition text-[11px] ${epcTypeFilter === 'all'
              ? 'bg-slate-800 text-white shadow-xs'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
          >
            All Types ({totalLeadsCount})
          </button>
          {epcTypes.map((t) => {
            const count = epcTypeCounts[t.name] || 0;
            return (
              <button
                key={t.id || t.code || t.name}
                onClick={() => setEpcTypeFilter(t.name)}
                className={`px-2.5 py-1 rounded-lg font-bold shrink-0 transition text-[11px] flex items-center gap-1.5 ${epcTypeFilter === t.name
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-slate-50 border border-slate-200 text-slate-600 hover:bg-slate-100'
                  }`}
              >
                <span>{t.name}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-black ${epcTypeFilter === t.name ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'
                    }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Content Area */}
      {loading ? (
        <div className="p-12 text-center bg-white rounded-3xl border border-slate-200">
          <RotateCw className="w-8 h-8 text-blue-600 animate-spin mx-auto mb-3" />
          <p className="text-xs font-bold text-slate-500">Loading EPC leads...</p>
        </div>
      ) : leads.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-3xl border border-slate-200 space-y-3">
          <Building2 className="w-12 h-12 text-slate-300 mx-auto" />
          <h3 className="text-base font-bold text-slate-800">No EPC Leads Found</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            {stageFilter !== 'all' || search
              ? 'No EPC leads match your active filters.'
              : 'You haven\'t added any EPC contractor leads yet. Click "Add EPC Lead" to get started.'}
          </p>
          <button
            onClick={handleOpenCreateModal}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl"
          >
            Add New EPC Lead
          </button>
        </div>
      ) : viewMode === 'table' ? (
        /* TABLE VIEW */
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-500 uppercase font-bold tracking-wider">
                <tr>
                  <th className="px-4 py-3.5">Lead ID / EPC Company</th>
                  <th className="px-4 py-3.5">Contact Person</th>
                  <th className="px-4 py-3.5">District / Territory</th>
                  <th className="px-4 py-3.5">GST Details</th>
                  <th className="px-4 py-3.5">Lead Status</th>
                  <th className="px-4 py-3.5">Assigned Franchisee</th>
                  <th className="px-4 py-3.5">Follow-up Date</th>
                  <th className="px-4 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {leads.map((lead) => (
                  <tr key={lead._id} className="hover:bg-slate-50/80 transition">
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-mono text-[11px] text-blue-600 font-bold">{lead.lead_id}</span>
                        {lead.epc_type && (
                          <span className={`px-2 py-0.2 rounded-full text-[9px] font-black border uppercase tracking-wider ${getEpcTypeBadge(lead.epc_type, epcTypes)}`}>
                            {lead.epc_type}
                          </span>
                        )}
                      </div>
                      <div className="font-bold text-slate-900 text-sm mt-0.5">{lead.company_name}</div>
                      {lead.interested_products?.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {lead.interested_products.slice(0, 2).map((p, i) => (
                            <span key={i} className="px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded text-[9px] font-semibold">
                              {p}
                            </span>
                          ))}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="font-semibold text-slate-800">{lead.contact_person}</div>
                      <div className="text-slate-500 font-mono text-[11px] flex items-center gap-1 mt-0.5">
                        <Phone className="w-3 h-3 text-slate-400" /> {lead.mobile_number}
                      </div>
                      <div className="text-slate-400 text-[11px] truncate max-w-[150px]">{lead.email}</div>
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="font-bold text-slate-800">{lead.district_name}</div>
                      <div className="text-slate-500 text-[11px]">{lead.state_name}</div>
                    </td>
                    <td className="px-4 py-3.5">
                      {lead.gst_number ? (
                        <div>
                          <div className="font-mono font-bold text-slate-700 text-[11px]">{lead.gst_number}</div>
                          <span
                            className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold mt-1 ${lead.gst_verified
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-amber-50 text-amber-700 border border-amber-200'
                              }`}
                          >
                            {lead.gst_verified ? 'Verified' : 'Pending Verification'}
                          </span>
                        </div>
                      ) : (
                        <span className="text-slate-400 italic text-[11px]">No GST entered</span>
                      )}
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex flex-col gap-1 items-start">
                        <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold border inline-block ${getStageBadge(lead.lead_status)}`}>
                          {lead.lead_status}
                        </span>
                        {lead.lead_status === 'Onboarded' && (
                          <span className="text-[10px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200 inline-flex items-center gap-1">
                            <Zap className="w-2.5 h-2.5 text-blue-600" /> Store Access Active
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      {lead.assigned_franchisee_id ? (
                        <div className="font-semibold text-emerald-800 flex items-center gap-1.5">
                          <Store className="w-3.5 h-3.5 text-emerald-600" />
                          <span>{lead.assigned_franchisee_id.business_name || lead.assigned_franchisee_name}</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5">
                          <span className="text-slate-400 italic">Not Assigned</span>
                          {lead.lead_status === 'Onboarded' && (
                            <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200">
                              Direct Store
                            </span>
                          )}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3.5">
                      {lead.follow_up_date ? (
                        <div className="flex items-center gap-1 text-slate-700 font-medium">
                          <Calendar className="w-3.5 h-3.5 text-purple-500" />
                          <span>{new Date(lead.follow_up_date).toLocaleDateString()}</span>
                        </div>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {lead.lead_status !== 'Onboarded' && lead.lead_status !== 'Assigned to Franchisee' && (
                          <button
                            onClick={() => handleStartOnboarding(lead)}
                            className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold rounded-lg text-[11px] transition flex items-center gap-1"
                            title="Start GST Onboarding"
                          >
                            <ShieldCheck className="w-3.5 h-3.5" /> Onboard
                          </button>
                        )}
                        {lead.lead_status === 'Onboarded' && (
                          <button
                            onClick={() => handleOpenAssignModal(lead)}
                            className="px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold rounded-lg text-[11px] transition flex items-center gap-1 shadow-2xs"
                            title="Assign to Franchisee Partner"
                          >
                            <Store className="w-3.5 h-3.5 text-blue-600" /> Assign Franchisee
                          </button>
                        )}
                        {lead.lead_status === 'Assigned to Franchisee' && (
                          <button
                            onClick={() => handleOpenAssignModal(lead)}
                            className="p-1.5 hover:bg-blue-50 text-blue-600 rounded-lg transition"
                            title="Reassign Franchisee Partner"
                          >
                            <Store className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          onClick={() => {
                            setFollowUpModalLead(lead);
                            setFollowUpDate(lead.follow_up_date ? lead.follow_up_date.split('T')[0] : '');
                            setFollowUpNotes('');
                          }}
                          className="p-1.5 hover:bg-purple-50 text-purple-600 rounded-lg transition"
                          title="Schedule Follow-up"
                        >
                          <CalendarPlus className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleOpenEditModal(lead)}
                          className="p-1.5 hover:bg-slate-100 text-slate-600 rounded-lg transition"
                          title="Edit Lead"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setDetailLead(lead)}
                          className="p-1.5 hover:bg-blue-50 text-blue-600 rounded-lg transition"
                          title="View Details & History"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* KANBAN VIEW */
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 overflow-x-auto pb-4">
          {STAGES.slice(0, 5).map((stage) => {
            const stageLeads = leads.filter((l) => l.lead_status === stage);
            return (
              <div key={stage} className="bg-slate-100/80 p-3 rounded-2xl border border-slate-200 min-w-[260px] space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700">{stage}</span>
                  <span className="px-2 py-0.5 bg-white text-slate-700 font-black rounded-full text-[10px] shadow-xs">
                    {stageLeads.length}
                  </span>
                </div>

                <div className="space-y-2.5 max-h-[600px] overflow-y-auto pr-1">
                  {stageLeads.map((l) => (
                    <div key={l._id} className="p-3 bg-white rounded-xl border border-slate-200 shadow-xs hover:shadow-md transition space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-mono text-blue-600 font-bold">{l.lead_id}</span>
                        <div className="flex items-center gap-1">
                          {l.epc_type && (
                            <span className={`px-1.5 py-0.2 rounded-full text-[9px] font-black border ${getEpcTypeBadge(l.epc_type, epcTypes)}`}>
                              {l.epc_type}
                            </span>
                          )}
                          <span className="text-[10px] font-semibold text-slate-400">{l.district_name}</span>
                        </div>
                      </div>
                      <h4 className="text-xs font-bold text-slate-900 leading-tight">{l.company_name}</h4>
                      <p className="text-[11px] text-slate-500 font-medium">Contact: {l.contact_person}</p>
                      {l.gst_number && (
                        <div className="text-[10px] font-mono bg-slate-50 p-1 rounded border border-slate-100 text-slate-600 truncate">
                          GST: {l.gst_number}
                        </div>
                      )}
                      <div className="pt-1 border-t border-slate-100 flex items-center justify-between gap-1">
                        <button
                          onClick={() => setDetailLead(l)}
                          className="text-[10px] font-bold text-blue-600 hover:underline"
                        >
                          View Details
                        </button>
                        {l.lead_status !== 'Onboarded' && l.lead_status !== 'Assigned to Franchisee' ? (
                          <button
                            onClick={() => handleStartOnboarding(l)}
                            className="px-2 py-0.5 bg-emerald-600 text-white rounded text-[10px] font-bold hover:bg-emerald-700 flex items-center gap-1"
                          >
                            <ShieldCheck className="w-3 h-3" /> Onboard
                          </button>
                        ) : (
                          <button
                            onClick={() => handleOpenAssignModal(l)}
                            className="px-2 py-0.5 bg-blue-600 text-white rounded text-[10px] font-bold hover:bg-blue-700 flex items-center gap-1"
                          >
                            <Store className="w-3 h-3" /> Assign
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                  {stageLeads.length === 0 && (
                    <div className="p-4 text-center text-slate-400 text-xs italic">No leads in this stage</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* MODAL: Bulk Upload EPC Leads */}
      {bulkModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3 sm:p-6">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-6xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold shadow-xs">
                  <FileSpreadsheet className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-black text-slate-900">Bulk Upload EPC Leads</h3>
                    <span className="text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-full">
                      100 – 200+ Leads Support
                    </span>
                  </div>
                  <p className="text-xs text-slate-500">
                    Import contractor leads in bulk via Excel or CSV with dynamic batch defaults and live data correction
                  </p>
                </div>
              </div>
              <button
                onClick={() => setBulkModalOpen(false)}
                className="p-2 rounded-xl text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* If Bulk Upload Completed (Result View) */}
            {bulkResult ? (
              <div className="flex-1 overflow-y-auto p-6 sm:p-8 flex flex-col items-center justify-center text-center">
                <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mb-4">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <h4 className="text-xl font-black text-slate-900 mb-1">Bulk Lead Import Complete!</h4>
                <p className="text-sm text-slate-500 mb-6 max-w-md">
                  Your EPC contractor prospects have been imported into the pipeline with territory assignment and follow-up tracking.
                </p>

                <div className="grid grid-cols-3 gap-4 w-full max-w-lg mb-6">
                  <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 text-center">
                    <div className="text-xs font-bold text-slate-500">Total Uploaded</div>
                    <div className="text-2xl font-black text-slate-900 mt-1">{bulkResult.total_received || 0}</div>
                  </div>
                  <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 text-center">
                    <div className="text-xs font-bold text-emerald-700">Successfully Created</div>
                    <div className="text-2xl font-black text-emerald-600 mt-1">{bulkResult.created_count || 0}</div>
                  </div>
                  <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-center">
                    <div className="text-xs font-bold text-amber-700">Skipped (Duplicate)</div>
                    <div className="text-2xl font-black text-amber-600 mt-1">{bulkResult.skipped_count || 0}</div>
                  </div>
                </div>

                {bulkResult.skipped_details && bulkResult.skipped_details.length > 0 && (
                  <div className="w-full max-w-lg bg-amber-50/70 border border-amber-200 rounded-2xl p-4 text-left mb-6 max-h-48 overflow-y-auto">
                    <div className="text-xs font-bold text-amber-900 mb-2 flex items-center gap-1.5">
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                      Skipped Rows ({bulkResult.skipped_details.length}):
                    </div>
                    <ul className="text-[11px] text-amber-800 space-y-1 list-disc list-inside">
                      {bulkResult.skipped_details.map((s, idx) => (
                        <li key={idx}>
                          <span className="font-semibold">{s.company_name || 'Row ' + s.row}</span> ({s.mobile_number}): {s.reason}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="flex items-center gap-3">
                  <button
                    onClick={() => {
                      setBulkResult(null);
                      setParsedRows([]);
                    }}
                    className="px-5 py-2.5 bg-slate-100 text-slate-700 rounded-xl font-bold hover:bg-slate-200 transition text-xs"
                  >
                    Upload Another Batch
                  </button>
                  <button
                    onClick={() => setBulkModalOpen(false)}
                    className="px-6 py-2.5 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition text-xs shadow-xs"
                  >
                    Done & View EPC Pipeline
                  </button>
                </div>
              </div>
            ) : (
              /* Main Bulk Upload Work Area */
              <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5 text-xs">
                {/* 1. Dynamic Batch Defaults (Collapsible) */}
                <div className="border border-blue-200/80 bg-blue-50/40 rounded-2xl p-4 transition-all">
                  <button
                    type="button"
                    onClick={() => setShowBulkDefaults(!showBulkDefaults)}
                    className="w-full flex items-center justify-between text-left group"
                  >
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-blue-600" />
                      <div>
                        <span className="font-black text-slate-900 text-xs group-hover:text-blue-700 transition">
                          Dynamic Batch Defaults (Fallback for Missing Row Values)
                        </span>
                        <p className="text-[11px] text-slate-500 font-normal">
                          Set default territory, classification, and source automatically applied when file rows omit these fields
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 text-blue-600 font-bold text-xs bg-white px-2.5 py-1 rounded-lg border border-blue-200 shadow-xs">
                      <span>{showBulkDefaults ? 'Collapse' : 'Configure Defaults'}</span>
                      {showBulkDefaults ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                    </div>
                  </button>

                  {showBulkDefaults && (
                    <div className="mt-4 pt-4 border-t border-blue-100 grid grid-cols-1 sm:grid-cols-3 gap-3.5 text-xs">
                      {/* State */}
                      <div>
                        <label className="block font-bold text-slate-700 mb-1">Default State *</label>
                        {territories.length > 1 ? (
                          <select
                            value={bulkSettings.state_name}
                            onChange={(e) => handleBulkStateSelect(e.target.value)}
                            className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-slate-800 font-bold focus:outline-none focus:border-blue-500"
                          >
                            {territories.map((t) => (
                              <option key={t.id || t.state_id || t.state_name} value={t.state_name}>
                                {t.state_name} ({t.district_names?.length || 0} Districts)
                              </option>
                            ))}
                          </select>
                        ) : (
                          <input
                            type="text"
                            readOnly
                            disabled
                            value={bulkSettings.state_name}
                            className="w-full bg-slate-100 border border-slate-200 rounded-xl px-3 py-2 text-slate-700 font-bold cursor-not-allowed"
                          />
                        )}
                      </div>

                      {/* District */}
                      <div>
                        <label className="block font-bold text-slate-700 mb-1">Default District *</label>
                        {bulkAvailableDistricts && bulkAvailableDistricts.length > 0 ? (
                          <select
                            value={bulkSettings.district_name}
                            onChange={(e) => setBulkSettings({ ...bulkSettings, district_name: e.target.value })}
                            className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-slate-800 font-bold focus:outline-none focus:border-blue-500"
                          >
                            <option value="">Select District</option>
                            {bulkAvailableDistricts.map((d) => (
                              <option key={d} value={d}>
                                {d}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <input
                            type="text"
                            placeholder="e.g. Ahmedabad"
                            value={bulkSettings.district_name}
                            onChange={(e) => setBulkSettings({ ...bulkSettings, district_name: e.target.value })}
                            className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:outline-none focus:border-blue-500"
                          />
                        )}
                      </div>

                      {/* Lead Source */}
                      <div>
                        <label className="block font-bold text-slate-700 mb-1">Default Lead Source</label>
                        <select
                          value={bulkSettings.lead_source}
                          onChange={(e) => setBulkSettings({ ...bulkSettings, lead_source: e.target.value })}
                          className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:outline-none focus:border-blue-500"
                        >
                          {LEAD_SOURCES.map((s) => (
                            <option key={s.value} value={s.value}>
                              {s.label}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* EPC Classification Type */}
                      <div>
                        <label className="block font-bold text-slate-700 mb-1">Default Classification Type</label>
                        <select
                          value={bulkSettings.epc_type}
                          onChange={(e) => {
                            const matched = epcTypes.find(t => t.name === e.target.value);
                            setBulkSettings({
                              ...bulkSettings,
                              epc_type: e.target.value,
                              epc_type_id: matched?.id || matched?._id || null,
                            });
                          }}
                          className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-slate-800 font-bold focus:outline-none focus:border-blue-500"
                        >
                          {!bulkSettings.epc_type && <option value="">Select Default EPC Type</option>}
                          {epcTypes.map((t) => (
                            <option key={t.id || t._id || t.code || t.name} value={t.name}>
                              {t.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Follow-up Date */}
                      <div>
                        <label className="block font-bold text-slate-700 mb-1">Default Follow-up Date</label>
                        <input
                          type="date"
                          value={bulkSettings.follow_up_date}
                          onChange={(e) => setBulkSettings({ ...bulkSettings, follow_up_date: e.target.value })}
                          className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:outline-none focus:border-blue-500"
                        />
                      </div>

                      {/* Campaign Note */}
                      <div>
                        <label className="block font-bold text-slate-700 mb-1">Batch / Campaign Note</label>
                        <input
                          type="text"
                          placeholder="e.g. Gujarat Solar Expo 2026 contractor leads"
                          value={bulkSettings.remarks}
                          onChange={(e) => setBulkSettings({ ...bulkSettings, remarks: e.target.value })}
                          className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:outline-none focus:border-blue-500"
                        />
                      </div>

                      {/* Interested Products Pills */}
                      <div className="sm:col-span-3 pt-1">
                        <label className="block font-bold text-slate-700 mb-1">Default Products of Interest</label>
                        <div className="flex flex-wrap gap-1.5">
                          {PRODUCT_TYPES.map((p) => {
                            const isSelected = bulkSettings.interested_products.includes(p);
                            return (
                              <button
                                type="button"
                                key={p}
                                onClick={() => handleBulkToggleProduct(p)}
                                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition ${isSelected
                                  ? 'bg-blue-600 text-white shadow-xs'
                                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                                  }`}
                              >
                                {p}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* 2. Upload Box & Template Downloads */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                  {/* Left Column: Template Download Card */}
                  <div className="border border-slate-200 rounded-2xl p-4 bg-slate-50/60 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                        <h4 className="font-bold text-slate-800 text-xs">Standard Bulk Templates</h4>
                      </div>
                      <p className="text-[11px] text-slate-500 mb-3">
                        Download pre-formatted templates matching EPC database columns with sample contractor data:
                      </p>
                      <ul className="text-[10px] text-slate-500 space-y-1 mb-4 list-disc list-inside">
                        <li>Handles 100 to 200+ contractor rows</li>
                        <li>Includes column validation instructions</li>
                        <li>Supports optional GSTIN and Pincode</li>
                      </ul>
                    </div>
                    <div className="space-y-2">
                      <button
                        type="button"
                        onClick={() => handleDownloadSampleTemplate('xlsx')}
                        className="w-full py-2 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold flex items-center justify-center gap-1.5 shadow-xs transition text-xs"
                      >
                        <Download className="w-3.5 h-3.5" /> Download Excel Template (.xlsx)
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDownloadSampleTemplate('csv')}
                        className="w-full py-2 px-3 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl font-bold flex items-center justify-center gap-1.5 transition text-xs"
                      >
                        <Download className="w-3.5 h-3.5" /> Download CSV Template (.csv)
                      </button>
                    </div>
                  </div>

                  {/* Right Column (2 spans): Dropzone */}
                  <div
                    onDragOver={(e) => {
                      e.preventDefault();
                      setBulkDragOver(true);
                    }}
                    onDragLeave={() => setBulkDragOver(false)}
                    onDrop={handleFileDrop}
                    className={`lg:col-span-2 border-2 border-dashed rounded-2xl p-6 flex flex-col items-center justify-center text-center transition cursor-pointer ${bulkDragOver
                      ? 'border-blue-500 bg-blue-50/50 scale-[0.99]'
                      : 'border-slate-300 hover:border-blue-400 bg-slate-50/30'
                      }`}
                    onClick={() => document.getElementById('epc-bulk-file-input')?.click()}
                  >
                    <input
                      id="epc-bulk-file-input"
                      type="file"
                      accept=".xlsx, .xls, .csv"
                      className="hidden"
                      onChange={(e) => {
                        if (e.target.files && e.target.files[0]) {
                          handleFileSelected(e.target.files[0]);
                          e.target.value = '';
                        }
                      }}
                    />
                    <div className="w-12 h-12 rounded-2xl bg-blue-100 text-blue-600 flex items-center justify-center mb-3">
                      <UploadCloud className="w-6 h-6" />
                    </div>
                    <p className="font-bold text-slate-800 text-sm mb-1">
                      Click to choose file or drag & drop here
                    </p>
                    <p className="text-[11px] text-slate-500 max-w-sm mb-3">
                      Supports Excel (<span className="font-mono font-semibold">.xlsx, .xls</span>) and Comma-Separated Values (<span className="font-mono font-semibold">.csv</span>). Designed for 100 to 200+ contractor rows.
                    </p>
                    <span className="inline-block px-3 py-1 bg-white border border-slate-200 rounded-lg text-[10px] font-bold text-slate-600 shadow-xs">
                      Browse Computer
                    </span>
                  </div>
                </div>

                {/* 3. Interactive Review & Inline Edit Grid */}
                {parsedRows.length > 0 && (
                  <div className="space-y-3 pt-2">
                    {/* Filter & Toolbar */}
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                      <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl">
                        <button
                          type="button"
                          onClick={() => setBulkFilter('all')}
                          className={`px-3 py-1 rounded-lg text-xs font-bold transition ${bulkFilter === 'all'
                            ? 'bg-white text-slate-900 shadow-xs'
                            : 'text-slate-600 hover:text-slate-900'
                            }`}
                        >
                          All Leads ({parsedRows.length})
                        </button>
                        <button
                          type="button"
                          onClick={() => setBulkFilter('ready')}
                          className={`px-3 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${bulkFilter === 'ready'
                            ? 'bg-emerald-600 text-white shadow-xs'
                            : 'text-emerald-700 hover:bg-emerald-50'
                            }`}
                        >
                          <span>Ready to Import</span>
                          <span className="px-1.5 py-0.2 bg-white/20 rounded-full text-[10px]">
                            {parsedRows.filter(r => r._isValid).length}
                          </span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setBulkFilter('errors')}
                          className={`px-3 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${bulkFilter === 'errors'
                            ? 'bg-rose-600 text-white shadow-xs'
                            : 'text-rose-700 hover:bg-rose-50'
                            }`}
                        >
                          <span>Needs Correction</span>
                          <span className="px-1.5 py-0.2 bg-white/20 rounded-full text-[10px]">
                            {parsedRows.filter(r => !r._isValid).length}
                          </span>
                        </button>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setParsedRows([])}
                          className="px-3 py-1 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg text-xs font-bold transition flex items-center gap-1"
                        >
                          <Trash2 className="w-3.5 h-3.5" /> Clear All Rows
                        </button>
                      </div>
                    </div>

                    {/* Table Container */}
                    <div className="border border-slate-200 rounded-2xl overflow-hidden bg-white shadow-xs">
                      <div className="max-h-[360px] overflow-x-auto overflow-y-auto">
                        <table className="w-full text-left border-collapse text-[11px]">
                          <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider sticky top-0 z-10 border-b border-slate-200">
                            <tr>
                              <th className="py-2.5 px-3 w-10 text-center">#</th>
                              <th className="py-2.5 px-3 w-28">Status</th>
                              <th className="py-2.5 px-3 min-w-[180px]">Company Name *</th>
                              <th className="py-2.5 px-3 min-w-[150px]">Contact Person *</th>
                              <th className="py-2.5 px-3 min-w-[130px]">Mobile Number *</th>
                              <th className="py-2.5 px-3 min-w-[170px]">Email Address *</th>
                              <th className="py-2.5 px-3 min-w-[140px]">GSTIN (Opt)</th>
                              <th className="py-2.5 px-3 min-w-[120px]">District *</th>
                              <th className="py-2.5 px-3 min-w-[140px]">Classification</th>
                              <th className="py-2.5 px-3 w-12 text-center">Del</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 font-normal">
                            {parsedRows
                              .filter((r) => {
                                if (bulkFilter === 'ready') return r._isValid;
                                if (bulkFilter === 'errors') return !r._isValid;
                                return true;
                              })
                              .map((row, idx) => {
                                const rowErrors = row._errors || [];
                                const isValid = row._isValid;
                                return (
                                  <tr
                                    key={row._id_temp}
                                    className={`hover:bg-slate-50/80 transition ${!isValid ? 'bg-rose-50/30' : ''}`}
                                  >
                                    <td className="py-2 px-3 text-center text-slate-400 font-mono">
                                      {idx + 1}
                                    </td>
                                    <td className="py-2 px-3">
                                      {isValid ? (
                                        <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-full">
                                          <Check className="w-2.5 h-2.5" /> Valid
                                        </span>
                                      ) : (
                                        <div
                                          className="inline-flex items-center gap-1 text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200 px-2 py-0.5 rounded-full cursor-help"
                                          title={rowErrors.join(' • ')}
                                        >
                                          <AlertCircle className="w-2.5 h-2.5" />
                                          <span>{rowErrors.length} Issue{rowErrors.length > 1 ? 's' : ''}</span>
                                        </div>
                                      )}
                                    </td>
                                    {/* Company Name */}
                                    <td className="py-2 px-3">
                                      <input
                                        type="text"
                                        value={row.company_name}
                                        onChange={(e) => handleUpdateParsedRow(row._id_temp, 'company_name', e.target.value)}
                                        placeholder="Company Name"
                                        className={`w-full bg-transparent border rounded-lg px-2 py-1 text-slate-900 font-semibold focus:bg-white focus:outline-none ${!row.company_name ? 'border-rose-400 bg-rose-50/50' : 'border-slate-200 focus:border-blue-500'}`}
                                      />
                                    </td>
                                    {/* Contact Person */}
                                    <td className="py-2 px-3">
                                      <input
                                        type="text"
                                        value={row.contact_person}
                                        onChange={(e) => handleUpdateParsedRow(row._id_temp, 'contact_person', e.target.value)}
                                        placeholder="Contact Person"
                                        className={`w-full bg-transparent border rounded-lg px-2 py-1 text-slate-800 focus:bg-white focus:outline-none ${!row.contact_person ? 'border-rose-400 bg-rose-50/50' : 'border-slate-200 focus:border-blue-500'}`}
                                      />
                                    </td>
                                    {/* Mobile */}
                                    <td className="py-2 px-3">
                                      <input
                                        type="text"
                                        maxLength={10}
                                        value={row.mobile_number}
                                        onChange={(e) => handleUpdateParsedRow(row._id_temp, 'mobile_number', e.target.value)}
                                        placeholder="10 digits"
                                        className={`w-full bg-transparent border rounded-lg px-2 py-1 font-mono text-slate-800 focus:bg-white focus:outline-none ${!row.mobile_number || !/^[6-9]\d{9}$/.test(row.mobile_number) ? 'border-rose-400 bg-rose-50/50' : 'border-slate-200 focus:border-blue-500'}`}
                                      />
                                    </td>
                                    {/* Email */}
                                    <td className="py-2 px-3">
                                      <input
                                        type="email"
                                        value={row.email}
                                        onChange={(e) => handleUpdateParsedRow(row._id_temp, 'email', e.target.value)}
                                        placeholder="Email"
                                        className={`w-full bg-transparent border rounded-lg px-2 py-1 text-slate-800 focus:bg-white focus:outline-none ${!row.email || !/^\S+@\S+\.\S+$/.test(row.email) ? 'border-rose-400 bg-rose-50/50' : 'border-slate-200 focus:border-blue-500'}`}
                                      />
                                    </td>
                                    {/* GSTIN */}
                                    <td className="py-2 px-3">
                                      <input
                                        type="text"
                                        maxLength={15}
                                        value={row.gst_number || ''}
                                        onChange={(e) => handleUpdateParsedRow(row._id_temp, 'gst_number', e.target.value)}
                                        placeholder="Optional GSTIN"
                                        className={`w-full bg-transparent border rounded-lg px-2 py-1 font-mono uppercase text-slate-800 focus:bg-white focus:outline-none ${row.gst_number && !/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(row.gst_number) ? 'border-rose-400 bg-rose-50/50' : 'border-slate-200 focus:border-blue-500'}`}
                                      />
                                    </td>
                                    {/* District */}
                                    <td className="py-2 px-3">
                                      <input
                                        type="text"
                                        value={row.district_name || ''}
                                        onChange={(e) => handleUpdateParsedRow(row._id_temp, 'district_name', e.target.value)}
                                        placeholder="District"
                                        className={`w-full bg-transparent border rounded-lg px-2 py-1 text-slate-800 focus:bg-white focus:outline-none ${!row.district_name ? 'border-rose-400 bg-rose-50/50' : 'border-slate-200 focus:border-blue-500'}`}
                                      />
                                    </td>
                                    {/* Classification */}
                                    <td className="py-2 px-3">
                                      <select
                                        value={row.epc_type || bulkSettings.epc_type}
                                        onChange={(e) => handleUpdateParsedRow(row._id_temp, 'epc_type', e.target.value)}
                                        className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1 text-slate-800 focus:outline-none focus:border-blue-500"
                                      >
                                        {row.epc_type && !epcTypes.some(t => t.name === row.epc_type) && (
                                          <option value={row.epc_type}>{row.epc_type}</option>
                                        )}
                                        {epcTypes.map((t) => (
                                          <option key={t.id || t._id || t.code || t.name} value={t.name}>
                                            {t.name}
                                          </option>
                                        ))}
                                      </select>
                                    </td>
                                    {/* Action */}
                                    <td className="py-2 px-3 text-center">
                                      <button
                                        type="button"
                                        onClick={() => handleDeleteParsedRow(row._id_temp)}
                                        className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition"
                                        title="Delete Row"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                    </td>
                                  </tr>
                                );
                              })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Modal Footer (Only shown when not showing result screen) */}
            {!bulkResult && (
              <div className="p-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-50/50">
                <div className="flex items-center gap-3 text-xs text-slate-500">
                  {parsedRows.length > 0 ? (
                    <>
                      <span>
                        Total Rows: <strong className="text-slate-900">{parsedRows.length}</strong>
                      </span>
                      <span>•</span>
                      <span className="text-emerald-700 font-bold">
                        Ready: {parsedRows.filter(r => r._isValid).length}
                      </span>
                      {parsedRows.some(r => !r._isValid) && (
                        <>
                          <span>•</span>
                          <span className="text-rose-600 font-bold">
                            Errors: {parsedRows.filter(r => !r._isValid).length}
                          </span>
                        </>
                      )}
                    </>
                  ) : (
                    <span>No file chosen yet. Download sample template above or drop your leads file.</span>
                  )}
                </div>

                <div className="flex items-center gap-2.5">
                  <button
                    type="button"
                    onClick={() => setBulkModalOpen(false)}
                    className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl font-bold hover:bg-slate-100 text-xs transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={parsedRows.filter(r => r._isValid).length === 0 || bulkSubmitting}
                    onClick={handleSubmitBulkUpload}
                    className="px-5 py-2 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed shadow-xs flex items-center gap-2 text-xs transition"
                  >
                    {bulkSubmitting ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Importing Leads...</span>
                      </>
                    ) : (
                      <>
                        <UploadCloud className="w-3.5 h-3.5" />
                        <span>
                          Import {parsedRows.filter(r => r._isValid).length > 0 ? parsedRows.filter(r => r._isValid).length : ''} Leads
                        </span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL: Add / Edit EPC Lead */}
      {createModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-base font-black text-slate-900">
                  {editLead ? 'Edit EPC Lead' : 'Add New EPC Lead'}
                </h3>
                <p className="text-xs text-slate-500">Capture contractor prospects and project requirements</p>
              </div>
              <button
                onClick={() => setCreateModalOpen(false)}
                className="p-2 rounded-xl text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmitLeadForm} className="flex-1 overflow-y-auto p-6 space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">EPC Company Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.company_name}
                    onChange={(e) => {
                      setFormData({ ...formData, company_name: e.target.value });
                      if (formErrors.company_name) setFormErrors((prev) => ({ ...prev, company_name: null }));
                    }}
                    placeholder="e.g. Apex Solar Tech Pvt Ltd"
                    className={`w-full bg-slate-50 border rounded-xl px-3 py-2 text-slate-800 focus:outline-none transition ${formErrors.company_name ? 'border-rose-400 focus:border-rose-500 bg-rose-50/20' : 'border-slate-200 focus:border-blue-500'
                      }`}
                  />
                  {formErrors.company_name && (
                    <p className="text-[11px] text-rose-600 mt-1 font-semibold flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3 shrink-0" /> {formErrors.company_name}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Contact Person Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.contact_person}
                    onChange={(e) => {
                      setFormData({ ...formData, contact_person: e.target.value });
                      if (formErrors.contact_person) setFormErrors((prev) => ({ ...prev, contact_person: null }));
                    }}
                    placeholder="e.g. Rajesh Sharma"
                    className={`w-full bg-slate-50 border rounded-xl px-3 py-2 text-slate-800 focus:outline-none transition ${formErrors.contact_person ? 'border-rose-400 focus:border-rose-500 bg-rose-50/20' : 'border-slate-200 focus:border-blue-500'
                      }`}
                  />
                  {formErrors.contact_person && (
                    <p className="text-[11px] text-rose-600 mt-1 font-semibold flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3 shrink-0" /> {formErrors.contact_person}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1 flex items-center justify-between">
                    <span>Mobile Number *</span>
                    <span className="text-[10px] text-slate-400 font-mono">10 digits</span>
                  </label>
                  <input
                    type="tel"
                    required
                    maxLength={10}
                    value={formData.mobile_number}
                    onChange={handleMobileChange}
                    placeholder="e.g. 9876543210"
                    className={`w-full bg-slate-50 border rounded-xl px-3 py-2 text-slate-800 font-mono focus:outline-none transition ${formErrors.mobile_number ? 'border-rose-400 focus:border-rose-500 bg-rose-50/20' : 'border-slate-200 focus:border-blue-500'
                      }`}
                  />
                  {formErrors.mobile_number && (
                    <p className="text-[11px] text-rose-600 mt-1 font-semibold flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3 shrink-0" /> {formErrors.mobile_number}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Email Address *</label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={handleEmailChange}
                    placeholder="e.g. contact@apexsolar.in"
                    className={`w-full bg-slate-50 border rounded-xl px-3 py-2 text-slate-800 focus:outline-none transition ${formErrors.email ? 'border-rose-400 focus:border-rose-500 bg-rose-50/20' : 'border-slate-200 focus:border-blue-500'
                      }`}
                  />
                  {formErrors.email && (
                    <p className="text-[11px] text-rose-600 mt-1 font-semibold flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3 shrink-0" /> {formErrors.email}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1 flex items-center justify-between">
                    <span>GST Number (Optional)</span>
                    <span className="text-[10px] text-slate-400 font-mono">15 chars</span>
                  </label>
                  <input
                    type="text"
                    maxLength={15}
                    value={formData.gst_number}
                    onChange={handleGstChange}
                    placeholder="e.g. 27ABCDE1234F1Z5"
                    className={`w-full bg-slate-50 border rounded-xl px-3 py-2 text-slate-800 font-mono uppercase focus:outline-none transition ${formErrors.gst_number ? 'border-rose-400 focus:border-rose-500 bg-rose-50/20' : 'border-slate-200 focus:border-blue-500'
                      }`}
                  />
                  {formErrors.gst_number && (
                    <p className="text-[11px] text-rose-600 mt-1 font-semibold flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3 shrink-0" /> {formErrors.gst_number}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Lead Source</label>
                  <select
                    value={formData.lead_source}
                    onChange={(e) => setFormData({ ...formData, lead_source: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:outline-none focus:border-blue-500 cursor-pointer"
                  >
                    {LEAD_SOURCES.map((s) => (
                      <option key={s.value} value={s.value}>
                        {s.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* State Field: Dropdown if multiple assigned states; Locked input if exactly 1 assigned state */}
                <div>
                  {territories.length > 1 ? (
                    <>
                      <label className="block font-bold text-slate-700 mb-1 flex items-center justify-between">
                        <span>State *</span>
                        <span className="text-[10px] text-blue-700 font-bold bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">
                          {territories.length} Assigned States
                        </span>
                      </label>
                      <select
                        required
                        value={formData.state_name}
                        onChange={(e) => handleStateSelect(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 font-bold focus:outline-none focus:border-blue-500 cursor-pointer"
                      >
                        {territories.map((t) => (
                          <option key={t.id || t.state_id || t.state_name} value={t.state_name}>
                            {t.state_name} ({t.district_names?.length || 0} Districts)
                          </option>
                        ))}
                      </select>
                    </>
                  ) : territories.length === 1 ? (
                    <>
                      <label className="block font-bold text-slate-700 mb-1 flex items-center justify-between">
                        <span>State *</span>
                        <span className="text-[10px] text-indigo-700 font-bold flex items-center gap-1 bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-200">
                          <Lock className="w-2.5 h-2.5" /> Assigned State (Locked)
                        </span>
                      </label>
                      <div className="relative">
                        <input
                          type="text"
                          readOnly
                          disabled
                          value={formData.state_name || territories[0].state_name}
                          className="w-full bg-slate-100 border border-slate-200 rounded-xl px-3 py-2 text-slate-700 font-bold cursor-not-allowed select-none pl-8"
                        />
                        <Lock className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                      </div>
                    </>
                  ) : (
                    <>
                      <label className="block font-bold text-slate-700 mb-1">State *</label>
                      <input
                        type="text"
                        required
                        value={formData.state_name}
                        onChange={(e) => setFormData({ ...formData, state_name: e.target.value })}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:outline-none focus:border-blue-500"
                      />
                    </>
                  )}
                  {formErrors.state_name && (
                    <p className="text-[11px] text-rose-600 mt-1 font-semibold">{formErrors.state_name}</p>
                  )}
                </div>

                {/* District Field: Dynamically filtered by selected state */}
                <div>
                  <label className="block font-bold text-slate-700 mb-1">District *</label>
                  {availableDistricts && availableDistricts.length > 0 ? (
                    <select
                      required
                      value={formData.district_name}
                      onChange={(e) => {
                        setFormData({ ...formData, district_name: e.target.value });
                        if (formErrors.district_name) setFormErrors((prev) => ({ ...prev, district_name: null }));
                      }}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 font-semibold focus:outline-none focus:border-blue-500 cursor-pointer"
                    >
                      {availableDistricts.map((d) => (
                        <option key={d} value={d}>
                          {d}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type="text"
                      required
                      placeholder="Enter district"
                      value={formData.district_name}
                      onChange={(e) => {
                        setFormData({ ...formData, district_name: e.target.value });
                        if (formErrors.district_name) setFormErrors((prev) => ({ ...prev, district_name: null }));
                      }}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:outline-none focus:border-blue-500"
                    />
                  )}
                  {formErrors.district_name && (
                    <p className="text-[11px] text-rose-600 mt-1 font-semibold">{formErrors.district_name}</p>
                  )}
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1 flex items-center justify-between">
                    <span>Pincode</span>
                    <span className="text-[10px] text-slate-400 font-mono">6 digits</span>
                  </label>
                  <input
                    type="text"
                    maxLength={6}
                    value={formData.pincode}
                    onChange={handlePincodeChange}
                    placeholder="e.g. 411001"
                    className={`w-full bg-slate-50 border rounded-xl px-3 py-2 text-slate-800 font-mono focus:outline-none transition ${formErrors.pincode ? 'border-rose-400 focus:border-rose-500 bg-rose-50/20' : 'border-slate-200 focus:border-blue-500'
                      }`}
                  />
                  {formErrors.pincode && (
                    <p className="text-[11px] text-rose-600 mt-1 font-semibold flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3 shrink-0" /> {formErrors.pincode}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Follow-up Date</label>
                  <input
                    type="date"
                    value={formData.follow_up_date}
                    onChange={(e) => setFormData({ ...formData, follow_up_date: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:outline-none focus:border-blue-500"
                  />
                </div>

                {/* EPC Classification Tier */}
                <div className="sm:col-span-2 p-3 bg-blue-50/60 border border-blue-200/70 rounded-2xl">
                  <label className="block font-black text-slate-800 mb-1">
                    EPC Classification Type <span className="text-rose-500">*</span>
                  </label>
                  <select
                    required
                    value={formData.epc_type}
                    onChange={(e) => setFormData({ ...formData, epc_type: e.target.value })}
                    className="w-full bg-white border border-blue-300 rounded-xl px-3 py-2 text-slate-800 font-bold focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-xs shadow-xs"
                  >
                    {!formData.epc_type && <option value="">Select EPC Classification Type</option>}
                    {/* If editing an existing lead whose type was subsequently deactivated in Admin */}
                    {editLead && formData.epc_type && !epcTypes.some(t => t.name === formData.epc_type) && (
                      <option value={formData.epc_type}>
                        {formData.epc_type} (Inactive Master Type)
                      </option>
                    )}
                    {epcTypes.map((t) => (
                      <option key={t.id || t._id || t.code || t.name} value={t.name}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                  <p className="text-[10px] text-slate-500 mt-1">
                    Select contractor classification configured in Admin Master Settings.
                  </p>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1.5">Interested Product / Project Types</label>
                <div className="flex flex-wrap gap-2">
                  {PRODUCT_TYPES.map((p) => {
                    const isSelected = formData.interested_products.includes(p);
                    return (
                      <button
                        type="button"
                        key={p}
                        onClick={() => handleToggleProduct(p)}
                        className={`px-3 py-1.5 rounded-xl font-semibold transition ${isSelected
                          ? 'bg-blue-600 text-white shadow-xs'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                          }`}
                      >
                        {p}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Remarks & Requirements</label>
                <textarea
                  rows={2}
                  value={formData.remarks}
                  onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                  placeholder="Notes from initial conversation..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-slate-800 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setCreateModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl font-bold hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 shadow-md shadow-blue-600/20 disabled:opacity-50"
                >
                  {submitting ? 'Saving...' : editLead ? 'Update Lead' : 'Create Lead'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Schedule Follow-up */}
      {followUpModalLead && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-base font-black text-slate-900">Schedule Follow-up</h3>
                <p className="text-xs text-slate-500">{followUpModalLead.company_name}</p>
              </div>
              <button
                onClick={() => setFollowUpModalLead(null)}
                className="p-2 rounded-xl text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleScheduleFollowUp} className="p-6 space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Follow-up Date *</label>
                <input
                  type="date"
                  required
                  value={followUpDate}
                  onChange={(e) => setFollowUpDate(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Follow-up Notes / Agenda</label>
                <textarea
                  rows={3}
                  value={followUpNotes}
                  onChange={(e) => setFollowUpNotes(e.target.value)}
                  placeholder="e.g. Call regarding 2.2kW combo kit quotation..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-slate-800 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setFollowUpModalLead(null)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl font-bold hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-purple-600 text-white rounded-xl font-bold hover:bg-purple-700 shadow-md shadow-purple-600/20 disabled:opacity-50"
                >
                  {submitting ? 'Saving...' : 'Save Follow-up'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DRAWER: Lead Details & Activity History */}
      {detailLead && (
        <div className="fixed inset-0 z-50 flex items-center justify-end bg-black/40 backdrop-blur-xs">
          <div className="bg-white w-full max-w-lg h-full shadow-2xl flex flex-col overflow-hidden animate-slideLeft">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div>
                <span className="font-mono text-xs text-blue-600 font-bold">{detailLead.lead_id}</span>
                <h3 className="text-base font-black text-slate-900">{detailLead.company_name}</h3>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleOpenEditModal(detailLead)}
                  className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-xl font-bold text-xs flex items-center gap-1.5 transition cursor-pointer"
                  title="Edit Full EPC Profile"
                >
                  <Edit3 className="w-3.5 h-3.5" /> Edit Profile
                </button>
                <button
                  onClick={() => setDetailLead(null)}
                  className="p-2 rounded-xl text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-5 text-xs">
              {/* Status & Actions */}
              <div className="p-4 bg-blue-50/60 rounded-2xl border border-blue-100 flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold text-blue-600 uppercase">Current Stage</span>
                  <div className="mt-0.5">
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border inline-block ${getStageBadge(detailLead.lead_status)}`}>
                      {detailLead.lead_status}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {detailLead.lead_status !== 'Onboarded' && detailLead.lead_status !== 'Assigned to Franchisee' ? (
                    <button
                      onClick={() => handleStartOnboarding(detailLead)}
                      className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs shadow-xs flex items-center gap-1.5"
                    >
                      <ShieldCheck className="w-4 h-4" /> Start Onboarding
                    </button>
                  ) : (
                    <button
                      onClick={() => handleOpenAssignModal(detailLead)}
                      className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-xs shadow-xs flex items-center gap-1.5"
                    >
                      <Store className="w-4 h-4" />
                      {detailLead.assigned_franchisee_id ? 'Reassign Franchisee' : 'Assign to Franchisee'}
                    </button>
                  )}
                </div>
              </div>

              {/* Lead Info */}
              <div className="space-y-2.5">
                <h4 className="font-bold text-slate-900 uppercase text-[11px] tracking-wider text-slate-400">
                  Lead Information
                </h4>
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 space-y-2 text-slate-700">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Contact Person:</span>
                    <span className="font-semibold text-slate-900">{detailLead.contact_person}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Mobile:</span>
                    <span className="font-mono font-semibold text-slate-900">{detailLead.mobile_number}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Email:</span>
                    <span className="font-semibold text-slate-900">{detailLead.email}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">GST Number:</span>
                    <span className="font-mono font-bold text-slate-900">{detailLead.gst_number || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Territory:</span>
                    <span className="font-semibold text-slate-900">
                      {detailLead.district_name}, {detailLead.state_name}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Lead Source:</span>
                    <span className="capitalize font-semibold text-slate-900">{detailLead.lead_source?.replace('_', ' ')}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Assigned Franchisee:</span>
                    {detailLead.assigned_franchisee_id ? (
                      <span className="font-semibold text-emerald-800 flex items-center gap-1">
                        <Store className="w-3.5 h-3.5 text-emerald-600" />
                        {detailLead.assigned_franchisee_id.business_name || detailLead.assigned_franchisee_name}
                      </span>
                    ) : (
                      <span className="font-semibold text-slate-500 italic">
                        Not Assigned {detailLead.lead_status === 'Onboarded' ? '(Direct Store Access)' : ''}
                      </span>
                    )}
                  </div>
                  {(detailLead.lead_status === 'Onboarded' || detailLead.lead_status === 'Assigned to Franchisee') && (
                    <div className="flex justify-between">
                      <span className="text-slate-400">Store Access:</span>
                      <span className="font-bold text-emerald-700 flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Active (Solar Store)
                      </span>
                    </div>
                  )}
                  <div className="pt-2 border-t border-slate-200/80 flex items-center justify-between">
                    <span className="text-[11px] text-slate-500">Need to update info, address or contact?</span>
                    <button
                      type="button"
                      onClick={() => handleOpenEditModal(detailLead)}
                      className="px-2.5 py-1 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-lg font-bold text-[11px] flex items-center gap-1 transition cursor-pointer"
                    >
                      <Edit3 className="w-3 h-3" /> Update Profile
                    </button>
                  </div>
                </div>
              </div>

              {/* Activity History Timeline */}
              <div className="space-y-2.5">
                <h4 className="font-bold text-slate-900 uppercase text-[11px] tracking-wider text-slate-400">
                  Activity Timeline & Notes
                </h4>
                <div className="space-y-3 pl-2 border-l-2 border-slate-100">
                  {detailLead.history && detailLead.history.length > 0 ? (
                    detailLead.history.map((act, i) => (
                      <div key={i} className="relative pl-4 space-y-1">
                        <div className="absolute -left-[17px] top-1 w-2.5 h-2.5 rounded-full bg-blue-600 ring-4 ring-white" />
                        <div className="flex items-center justify-between text-[10px] text-slate-400 font-semibold">
                          <span>{act.actor_name || 'BDE Executive'}</span>
                          <span>{new Date(act.created_at).toLocaleString()}</span>
                        </div>
                        <p className="text-slate-700 bg-slate-50 p-2.5 rounded-xl border border-slate-100 font-medium">
                          {act.notes}
                        </p>
                      </div>
                    ))
                  ) : (
                    <p className="text-slate-400 italic">No activity entries recorded yet.</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Assign Franchisee Partner */}
      {assignModalLead && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-100 flex items-start justify-between bg-slate-50/70">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center font-bold">
                    <Store className="w-4 h-4" />
                  </div>
                  <h3 className="text-base font-black text-slate-900">
                    Assign Franchisee Partner
                  </h3>
                </div>
                <p className="text-xs text-slate-500">
                  Select an operational franchisee to manage fulfillment and orders for this contractor.
                </p>
              </div>
              <button
                onClick={() => setAssignModalLead(null)}
                className="p-2 rounded-xl text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Target EPC Details Card */}
            <div className="p-4 mx-6 mt-4 bg-gradient-to-r from-blue-50/80 to-indigo-50/70 border border-blue-200/80 rounded-2xl grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block">EPC Contractor</span>
                <span className="font-bold text-slate-900">{assignModalLead.company_name}</span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block">GSTIN / Territory</span>
                <span className="font-mono font-bold text-slate-800">{assignModalLead.gst_number || 'No GST'}</span>
                <span className="text-[10px] text-slate-500 block">{assignModalLead.district_name}, {assignModalLead.state_name}</span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Store Status</span>
                <span className="text-emerald-700 font-bold flex items-center gap-1">
                  <Zap className="w-3 h-3 text-emerald-600" /> Active Store Access
                </span>
              </div>
            </div>

            {/* Franchisee Search Bar */}
            <div className="px-6 pt-4 pb-2">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type="text"
                  value={franchiseeSearch}
                  onChange={(e) => setFranchiseeSearch(e.target.value)}
                  placeholder="Search franchise partners by business name, code, contact, mobile..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-4 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-blue-500 font-medium"
                />
              </div>
            </div>

            {/* Error Message */}
            {assignError && (
              <div className="mx-6 my-2 p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                <span>{assignError}</span>
              </div>
            )}

            {/* Franchisees List */}
            <div className="flex-1 overflow-y-auto px-6 py-2 space-y-2.5">
              {loadingFranchisees ? (
                <div className="p-8 text-center text-xs text-slate-400 flex flex-col items-center gap-2">
                  <RotateCw className="w-5 h-5 animate-spin text-blue-600" />
                  <span>Loading eligible franchise partners...</span>
                </div>
              ) : (
                (() => {
                  const filtered = eligibleFranchisees.filter((f) => {
                    if (!franchiseeSearch.trim()) return true;
                    const q = franchiseeSearch.toLowerCase().trim();
                    return (
                      (f.business_name || '').toLowerCase().includes(q) ||
                      (f.reseller_code || '').toLowerCase().includes(q) ||
                      (f.contact_person || '').toLowerCase().includes(q) ||
                      (f.mobile || '').includes(q) ||
                      (f.district || '').toLowerCase().includes(q)
                    );
                  });

                  if (filtered.length === 0) {
                    return (
                      <div className="p-8 text-center text-xs text-slate-400 border border-dashed border-slate-200 rounded-2xl">
                        No franchise partners found for this territory or search query.
                      </div>
                    );
                  }

                  return filtered.map((f) => {
                    const isSelected = selectedFranchisee && (selectedFranchisee.id === f.id || selectedFranchisee._id === f.id || selectedFranchisee.id === f._id || selectedFranchisee._id === f._id);
                    return (
                      <div
                        key={f.id || f._id}
                        onClick={() => setSelectedFranchisee(f)}
                        className={`p-3.5 rounded-2xl border cursor-pointer transition text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${isSelected
                          ? 'bg-blue-50/80 border-blue-500 ring-2 ring-blue-500/20 shadow-xs'
                          : 'bg-white hover:bg-slate-50 border-slate-200'
                          }`}
                      >
                        <div className="space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-black text-slate-900 text-sm">
                              {f.business_name}
                            </span>
                            <span className="font-mono text-[10px] font-bold text-blue-700 bg-blue-100 px-1.5 py-0.5 rounded">
                              {f.reseller_code || 'FRANCHISE'}
                            </span>
                            {f.is_district_match && (
                              <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full flex items-center gap-1">
                                <CheckCircle2 className="w-3 h-3 text-emerald-600" /> District Match ({assignModalLead.district_name})
                              </span>
                            )}
                            {f.is_operational && (
                              <span className="text-[10px] font-bold text-teal-800 bg-teal-100 px-2 py-0.5 rounded-full">
                                Operational
                              </span>
                            )}
                          </div>
                          <div className="text-slate-500 text-[11px] flex flex-wrap items-center gap-x-4 gap-y-1">
                            <span>Contact: <strong className="text-slate-700">{f.contact_person || 'Authorized Rep'}</strong></span>
                            <span>Phone: <strong className="text-slate-700">{f.mobile || '-'}</strong></span>
                            <span>Territory: <strong className="text-slate-700">{f.district || f.address?.district_name || 'Regional'}, {f.state || f.address?.state_name}</strong></span>
                            {f.assigned_epc_count != null && (
                              <span>Assigned EPCs: <strong className="text-blue-700">{f.assigned_epc_count}</strong></span>
                            )}
                          </div>
                        </div>

                        <div className="shrink-0 flex items-center gap-2">
                          {isSelected ? (
                            <span className="px-3 py-1 bg-blue-600 text-white font-bold rounded-xl text-xs flex items-center gap-1 shadow-xs">
                              <Check className="w-3.5 h-3.5" /> Selected
                            </span>
                          ) : (
                            <span className="px-3 py-1 bg-slate-100 text-slate-600 hover:bg-slate-200 font-bold rounded-xl text-xs">
                              Select
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  });
                })()
              )}
            </div>

            {/* Modal Actions */}
            <div className="p-5 border-t border-slate-100 flex items-center justify-between bg-slate-50/70">
              <span className="text-xs text-slate-500">
                {selectedFranchisee ? (
                  <span>Selected: <strong className="text-blue-700 font-bold">{selectedFranchisee.business_name}</strong></span>
                ) : (
                  <span>Select a franchisee above to assign</span>
                )}
              </span>
              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => setAssignModalLead(null)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl font-bold hover:bg-white text-xs transition"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmAssignment}
                  disabled={!selectedFranchisee || assigningLoading}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold rounded-xl text-xs shadow-md shadow-blue-600/20 flex items-center gap-1.5 transition"
                >
                  {assigningLoading ? (
                    <>
                      <RotateCw className="w-3.5 h-3.5 animate-spin" /> Assigning...
                    </>
                  ) : (
                    <>
                      <Store className="w-3.5 h-3.5" /> Confirm Assignment
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
