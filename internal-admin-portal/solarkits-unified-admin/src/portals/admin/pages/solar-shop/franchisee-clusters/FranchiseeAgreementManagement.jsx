import React, { useState, useEffect, useMemo, useRef } from 'react';
import axios from 'axios';
import { useDispatch } from 'react-redux';
import { setAlert } from '@/features/alert.slice';
import { authHeaderObj } from '@/app/authHeader';
import {
  FiFileText,
  FiPlus,
  FiSearch,
  FiFilter,
  FiRefreshCw,
  FiAlertTriangle,
  FiCheckCircle,
  FiClock,
  FiXCircle,
  FiEye,
  FiDownload,
  FiSlash,
  FiX,
  FiShield,
  FiLayers,
  FiPhone,
  FiUploadCloud,
  FiTrash2,
} from 'react-icons/fi';
import Button from '@/components/Button';
import Loader from '@/components/Loader';
import ConfirmationPopup from '@/components/ConfirmationPopup';

export default function FranchiseeAgreementManagement() {
  const dispatch = useDispatch();
  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

  const resolveDocUrl = (url) => {
    if (!url) return '#';
    if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('blob:') || url.startsWith('data:')) {
      return url;
    }
    const cleanPath = url.replace(/^[\\/]+/, '').replace(/\\/g, '/');
    const baseUrl = (API_URL || '').replace(/\/admin-api\/?$/, '');
    return `${baseUrl}/${cleanPath}`;
  };

  const [agreements, setAgreements] = useState([]);
  const [counts, setCounts] = useState({
    all: 0,
    active: 0,
    expiring_soon: 0,
    expired: 0,
    renewal_pending: 0,
    renewed: 0,
    terminated: 0,
  });
  const [loading, setLoading] = useState(true);

  // Status Tab
  const [activeTab, setActiveTab] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterAgreementType, setFilterAgreementType] = useState('all');

  // Masters
  const [clusters, setClusters] = useState([]);
  const [resellers, setResellers] = useState([]);
  const [bdes, setBdes] = useState([]);
  const [storeTypes, setStoreTypes] = useState([]);
  const [agreementTypes, setAgreementTypes] = useState([
    {
      type_key: 'district_franchise_agreement',
      name: 'District Franchise Agreement',
      store_type_name: 'District Franchise Store',
      title: 'SolarKits Authorized District Franchise Partner Agreement',
      version: '2.0',
      default_duration_years: 2,
      document_url: null,
      document_name: null,
      renewal_conditions: 'Standard renewal subject to annual EPC onboarding goal and monthly kit sales quota achievement.',
    },
    {
      type_key: 'flagship_agreement',
      name: 'Flagship Store Agreement',
      store_type_name: 'Flagship store',
      title: 'SolarKits Flagship Franchise Partner & Institutional Agreement',
      version: '2.0',
      default_duration_years: 3,
      document_url: null,
      document_name: null,
      renewal_conditions: 'Exclusive flagship territory renewal subject to regional warehouse operations, institutional compliance, and tender fulfillment targets.',
    },
    {
      type_key: 'company_store_agreement',
      name: 'Company Store Operational Agreement',
      store_type_name: 'Company Store',
      title: 'SolarKits Company Store Operational Governance & MoU',
      version: '1.0',
      default_duration_years: 1,
      document_url: null,
      document_name: null,
      renewal_conditions: 'Annual company store operational review, inventory audit, and compliance check.',
    },
  ]);

  // Create Agreement Modal
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createSubmitting, setCreateSubmitting] = useState(false);
  const [selectedClusterId, setSelectedClusterId] = useState('');
  const [selectedFranchiseeId, setSelectedFranchiseeId] = useState('');
  const [selectedAgreementTypeKey, setSelectedAgreementTypeKey] = useState('district_franchise_agreement');
  const [selectedAgreementTypeName, setSelectedAgreementTypeName] = useState('District Franchise Agreement');
  const [detectedFranchiseType, setDetectedFranchiseType] = useState('District Franchise Store');
  const [detectedStoreTypeId, setDetectedStoreTypeId] = useState(null);
  const [agreementTitle, setAgreementTitle] = useState('SolarKits Authorized District Franchise Partner Agreement');
  const [agreementVersion, setAgreementVersion] = useState('2.0');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(
    new Date(Date.now() + 2 * 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  );
  const [durationYears, setDurationYears] = useState(2);
  const [setupFeeAmount, setSetupFeeAmount] = useState(250000);
  const [renewalFeeAmount, setRenewalFeeAmount] = useState(25000);
  const [agreementPdfFile, setAgreementPdfFile] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const createFileInputRef = useRef(null);
  const [selectedBdeId, setSelectedBdeId] = useState('');
  const [renewalConditions, setRenewalConditions] = useState(
    'Standard renewal subject to annual EPC onboarding goal and monthly kit sales quota achievement.'
  );

  const selectedPartner = useMemo(() => {
    if (!selectedFranchiseeId) return null;
    return resellers.find((r) => String(r._id || r.id) === String(selectedFranchiseeId)) || null;
  }, [selectedFranchiseeId, resellers]);

  const handleFranchiseeSelect = (partnerId) => {
    setSelectedFranchiseeId(partnerId);
    if (!partnerId) {
      setSelectedClusterId('');
      return;
    }
    const partner = resellers.find((r) => String(r._id || r.id) === String(partnerId));
    if (partner) {
      // 1. Detect Franchise Store Type
      let franchiseType = 'District Franchise Store';
      if (partner.store_category === 'company_store') {
        franchiseType = 'Company Store';
      } else if (partner.franchisee_subtype_id?.name) {
        franchiseType = partner.franchisee_subtype_id.name;
      } else if (partner.store_type_name) {
        franchiseType = partner.store_type_name;
      } else if (partner.plan_name) {
        franchiseType = partner.plan_name;
      }
      setDetectedFranchiseType(franchiseType);

      // Match with Store Types list if available
      const matchedStore = storeTypes.find(
        (st) =>
          st.name?.toLowerCase() === franchiseType.toLowerCase() ||
          st.slug === partner.store_type_slug ||
          (partner.store_category === 'company_store' && st.store_category === 'company_store')
      );
      if (matchedStore) {
        setDetectedStoreTypeId(matchedStore.id || matchedStore._id);
      }

      // 2. Auto-select matching Agreement Type defined for this Franchise Store Type
      const matchedAgType = agreementTypes.find(
        (t) =>
          (t.store_type_name && t.store_type_name.toLowerCase() === franchiseType.toLowerCase()) ||
          (t.store_type_slug && partner.store_type_slug && t.store_type_slug === partner.store_type_slug) ||
          (partner.store_category === 'company_store' && t.type_key.includes('company'))
      ) || agreementTypes[0];

      if (matchedAgType) {
        setSelectedAgreementTypeKey(matchedAgType.type_key);
        setSelectedAgreementTypeName(matchedAgType.name);
        setAgreementTitle(matchedAgType.title || `SolarKits Authorized ${matchedAgType.name}`);
        setAgreementVersion(matchedAgType.version || '2.0');
        if (matchedAgType.default_duration_years) {
          handleDurationChange(matchedAgType.default_duration_years);
        }
        if (matchedAgType.renewal_conditions) {
          setRenewalConditions(matchedAgType.renewal_conditions);
        }
      }

      // 3. Cluster association & cluster fee configuration (Fees are defined Cluster-wise)
      if (partner.cluster_id) {
        const clusterIdStr = String(partner.cluster_id._id || partner.cluster_id);
        setSelectedClusterId(clusterIdStr);
        const clu = clusters.find((c) => String(c._id) === clusterIdStr);
        if (clu?.setup_fee_config?.setup_fee !== undefined) {
          setSetupFeeAmount(clu.setup_fee_config.setup_fee);
        } else if (partner.cluster_setup_fee !== undefined) {
          setSetupFeeAmount(partner.cluster_setup_fee);
        }
        if (clu?.setup_fee_config?.renewal_fee !== undefined) {
          setRenewalFeeAmount(clu.setup_fee_config.renewal_fee);
        } else if (partner.cluster_renewal_fee !== undefined) {
          setRenewalFeeAmount(partner.cluster_renewal_fee);
        }
        if (clu?.assigned_bde_id || partner.cluster_assigned_bde_id) {
          setSelectedBdeId(clu?.assigned_bde_id?._id || clu?.assigned_bde_id || partner.cluster_assigned_bde_id);
        }
      }
    }
  };

  const handleAgreementTypeChange = (typeKey) => {
    setSelectedAgreementTypeKey(typeKey);
    const agType = agreementTypes.find((t) => t.type_key === typeKey);
    if (agType) {
      setSelectedAgreementTypeName(agType.name);
      setAgreementTitle(agType.title || `SolarKits Authorized ${agType.name}`);
      setAgreementVersion(agType.version || '2.0');
      if (agType.default_duration_years) {
        handleDurationChange(agType.default_duration_years);
      }
      if (agType.renewal_conditions) {
        setRenewalConditions(agType.renewal_conditions);
      }
    }
  };

  // Renew Modal
  const [renewingAgreement, setRenewingAgreement] = useState(null);
  const [renewSubmitting, setRenewSubmitting] = useState(false);
  const [renewStartDate, setRenewStartDate] = useState('');
  const [renewEndDate, setRenewEndDate] = useState('');
  const [renewFeePaid, setRenewFeePaid] = useState(10000);
  const [renewPaymentRef, setRenewPaymentRef] = useState('');
  const [renewRemarks, setRenewRemarks] = useState('');
  const [renewPdfFile, setRenewPdfFile] = useState(null);
  const renewFileInputRef = useRef(null);

  // Details / Version History Drawer
  const [selectedAgreementDetail, setSelectedAgreementDetail] = useState(null);

  // Terminate Popup
  const [terminatePopup, setTerminatePopup] = useState({ isOpen: false, agreement: null, reason: '' });

  useEffect(() => {
    fetchMasters();
    fetchAgreements();
  }, [activeTab]);

  const fetchMasters = async () => {
    try {
      const [cluRes, resRes, bdeRes, settingsRes, plansRes] = await Promise.all([
        axios.get(`${API_URL}/franchise-clusters/list`, authHeaderObj()).catch(() => ({ data: { data: [] } })),
        axios
          .get(`${API_URL}/franchise-clusters/resellers`, authHeaderObj())
          .catch(() => axios.get(`${API_URL}/resellers/list?unique_id=RSL_MGMT&req_for=view&limit=500`, authHeaderObj()))
          .catch(() => axios.get(`${API_URL}/reseller-mgmt/list?unique_id=RSL_MGMT&req_for=view&limit=500`, authHeaderObj())),
        axios
          .get(`${API_URL}/franchise-clusters/bdes`, authHeaderObj())
          .catch(() => axios.get(`${API_URL}/franchise-clusters/bde/mappings`, authHeaderObj()))
          .catch(() => axios.get(`${API_URL}/store-management/bde/list?unique_id=RSL_MGMT&req_for=view`, authHeaderObj()))
          .catch(() => axios.get(`${API_URL}/bde/list?unique_id=ADM_BDE_MGMT&req_for=view&limit=500`, authHeaderObj())),
        axios.get(`${API_URL}/reseller-mgmt/settings`, authHeaderObj()).catch(() => null),
        axios.get(`${API_URL}/resellers/plans/list?req_for=view&unique_id=RSL_PLAN`, authHeaderObj()).catch(() => null),
      ]);
      if (cluRes?.data?.data) setClusters(cluRes.data.data);
      const rList = resRes?.data?.data || resRes?.data?.resellers || [];
      if (Array.isArray(rList)) setResellers(rList);
      const bList = bdeRes?.data?.data || bdeRes?.data?.bdes || [];
      if (Array.isArray(bList)) setBdes(bList);
      if (settingsRes?.data?.data?.franchise_agreement_types && Array.isArray(settingsRes.data.data.franchise_agreement_types)) {
        setAgreementTypes(settingsRes.data.data.franchise_agreement_types);
      }
      if (plansRes?.data?.data && Array.isArray(plansRes.data.data)) {
        setStoreTypes(plansRes.data.data);
      }
    } catch (err) {
      console.error('Error fetching masters:', err);
    }
  };

  const fetchAgreements = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (activeTab !== 'all') params.append('status', activeTab);
      if (searchQuery.trim()) params.append('search', searchQuery.trim());

      const res = await axios.get(
        `${API_URL}/franchise-clusters/agreements/list?${params.toString()}`,
        authHeaderObj()
      );
      if (res.data?.status === 'success') {
        setAgreements(res.data.data || []);
        if (res.data.counts) setCounts(res.data.counts);
      }
    } catch (err) {
      console.error('Error loading agreements:', err);
      dispatch(setAlert({ title: 'Error', message: 'Failed to load agreements', type: 'error' }));
    } finally {
      setLoading(false);
    }
  };

  // Duration auto-calculates end date
  const handleDurationChange = (years) => {
    setDurationYears(years);
    const start = new Date(startDate);
    const end = new Date(start.setFullYear(start.getFullYear() + Number(years)));
    setEndDate(end.toISOString().split('T')[0]);
  };

  // Helper for PDF file validation
  const handlePdfSelect = (file) => {
    if (!file) return;
    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
      dispatch(
        setAlert({
          title: 'Invalid File',
          message: 'Please select a valid PDF agreement file (.pdf)',
          type: 'error',
        })
      );
      return;
    }
    if (file.size > 25 * 1024 * 1024) {
      dispatch(
        setAlert({
          title: 'File Too Large',
          message: 'Agreement PDF size must be less than 25 MB',
          type: 'error',
        })
      );
      return;
    }
    setAgreementPdfFile(file);
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Submit Create Agreement
  const handleCreateAgreement = async (e) => {
    e.preventDefault();
    if (!selectedClusterId || !selectedFranchiseeId || !startDate || !endDate) {
      dispatch(setAlert({ title: 'Validation', message: 'Please fill all required fields', type: 'error' }));
      return;
    }

    setCreateSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('cluster_id', selectedClusterId);
      formData.append('franchisee_id', selectedFranchiseeId);
      formData.append('start_date', startDate);
      formData.append('end_date', endDate);
      formData.append('agreement_duration_type', `${durationYears}_years`);
      formData.append('duration_months', Number(durationYears) * 12);
      formData.append('setup_fee', Number(setupFeeAmount));
      formData.append('renewal_fee', Number(renewalFeeAmount));
      formData.append('agreement_type', selectedAgreementTypeName);
      formData.append('agreement_type_key', selectedAgreementTypeKey);
      formData.append('franchise_type', detectedFranchiseType);
      if (detectedStoreTypeId) formData.append('store_type_id', detectedStoreTypeId);
      if (agreementTitle) formData.append('title', agreementTitle);
      if (agreementVersion) formData.append('version', agreementVersion);
      if (selectedBdeId) formData.append('assigned_bde_id', selectedBdeId);
      formData.append('renewal_conditions', renewalConditions);
      const matchedAgType = agreementTypes.find((t) => t.type_key === selectedAgreementTypeKey);
      if (agreementPdfFile) {
        formData.append('agreement_pdf', agreementPdfFile);
      } else if (matchedAgType?.document_url) {
        formData.append('document_url', matchedAgType.document_url);
        if (matchedAgType.document_name) {
          formData.append('document_name', matchedAgType.document_name);
        }
      }

      await axios.post(`${API_URL}/franchise-clusters/agreements/create`, formData, {
        headers: {
          ...authHeaderObj(),
          'Content-Type': 'multipart/form-data',
        },
      });
      dispatch(setAlert({ title: 'Success', message: 'Agreement created successfully', type: 'success' }));
      setIsCreateOpen(false);
      setAgreementPdfFile(null);
      if (createFileInputRef.current) createFileInputRef.current.value = '';
      fetchAgreements();
    } catch (err) {
      console.error('Error creating agreement:', err);
      dispatch(setAlert({ title: 'Error', message: err.response?.data?.message || err.message, type: 'error' }));
    } finally {
      setCreateSubmitting(false);
    }
  };

  // Submit Renewal
  const handleRenewAgreement = async (e) => {
    e.preventDefault();
    if (!renewingAgreement || !renewEndDate) return;

    setRenewSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('new_start_date', renewStartDate || renewingAgreement.end_date);
      formData.append('new_end_date', renewEndDate);
      formData.append('renewal_fee_paid', Number(renewFeePaid));
      formData.append('payment_reference', renewPaymentRef || '');
      formData.append('remarks', renewRemarks || '');
      if (renewPdfFile) {
        formData.append('agreement_pdf', renewPdfFile);
      }

      await axios.post(
        `${API_URL}/franchise-clusters/agreements/${renewingAgreement._id}/renew`,
        formData,
        {
          headers: {
            ...authHeaderObj(),
            'Content-Type': 'multipart/form-data',
          },
        }
      );
      dispatch(setAlert({ title: 'Renewed', message: 'Agreement renewed successfully', type: 'success' }));
      setRenewingAgreement(null);
      setRenewPdfFile(null);
      if (renewFileInputRef.current) renewFileInputRef.current.value = '';
      fetchAgreements();
    } catch (err) {
      console.error('Error renewing agreement:', err);
      dispatch(setAlert({ title: 'Error', message: err.response?.data?.message || err.message, type: 'error' }));
    } finally {
      setRenewSubmitting(false);
    }
  };

  // Submit Termination
  const handleTerminateAgreement = async () => {
    if (!terminatePopup.agreement) return;
    try {
      await axios.post(
        `${API_URL}/franchise-clusters/agreements/${terminatePopup.agreement._id}/terminate`,
        { reason: terminatePopup.reason },
        authHeaderObj()
      );
      dispatch(setAlert({ title: 'Terminated', message: 'Agreement terminated', type: 'success' }));
      setTerminatePopup({ isOpen: false, agreement: null, reason: '' });
      fetchAgreements();
    } catch (err) {
      console.error('Error terminating agreement:', err);
      dispatch(setAlert({ title: 'Error', message: err.response?.data?.message || err.message, type: 'error' }));
    }
  };

  // Filtered agreements
  const filteredAgreements = useMemo(() => {
    return agreements.filter((ag) => {
      if (filterAgreementType !== 'all') {
        const agType = (ag.agreement_type || '').toLowerCase();
        const fType = (ag.franchise_type || '').toLowerCase();
        const target = filterAgreementType.toLowerCase();
        if (!agType.includes(target) && !fType.includes(target)) {
          return false;
        }
      }
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      const numMatch = ag.agreement_number?.toLowerCase().includes(q);
      const nameMatch = ag.franchisee_id?.business_name?.toLowerCase().includes(q);
      const cluMatch = ag.cluster_id?.cluster_name?.toLowerCase().includes(q);
      const typeMatch = ag.agreement_type?.toLowerCase().includes(q);
      const storeMatch = ag.franchise_type?.toLowerCase().includes(q);
      return numMatch || nameMatch || cluMatch || typeMatch || storeMatch;
    });
  }, [agreements, searchQuery, filterAgreementType]);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
            <FiFileText size={22} />
          </div>
          <div>
            <h1 className="text-xl font-black text-slate-900">Franchisee Agreement Management</h1>
            <p className="text-xs font-semibold text-slate-500">
              Track contract validity, year-wise terms, renewal chains, and expiry alerts
            </p>
          </div>
        </div>
        <Button
          onClick={() => {
            setSelectedClusterId('');
            setSelectedFranchiseeId('');
            setIsCreateOpen(true);
          }}
          className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-sm shadow-sm transition-all"
        >
          <FiPlus size={16} /> Setup Agreement
        </Button>
      </div>

      {/* ── Section 3.2: Status Tabs ────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 pb-2">
        {[
          { key: 'all', label: 'All Agreements', count: counts.all, color: 'text-slate-800' },
          { key: 'active', label: 'Active', count: counts.active, color: 'text-emerald-700' },
          { key: 'expiring_soon', label: 'Expiring Soon', count: counts.expiring_soon, color: 'text-amber-700' },
          { key: 'expired', label: 'Expired', count: counts.expired, color: 'text-red-700' },
          { key: 'renewal_pending', label: 'Renewal Pending', count: counts.renewal_pending, color: 'text-blue-700' },
          { key: 'renewed', label: 'Renewed', count: counts.renewed, color: 'text-purple-700' },
          { key: 'terminated', label: 'Terminated', count: counts.terminated, color: 'text-slate-500' },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${activeTab === tab.key
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200/80'
              }`}
          >
            <span>{tab.label}</span>
            <span
              className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${activeTab === tab.key ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-700'
                }`}
            >
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* ── Search & Agreement Type Filter Bar ─────────────────────────────── */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-slate-200 shadow-xs">
        <div className="relative flex-1">
          <FiSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search agreement #, store name, agreement type, cluster..."
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-slate-500 whitespace-nowrap flex items-center gap-1">
            <FiLayers size={14} className="text-blue-600" /> Agreement Type:
          </span>
          <select
            value={filterAgreementType}
            onChange={(e) => setFilterAgreementType(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Agreement Types</option>
            {agreementTypes.map((t) => (
              <option key={t.type_key} value={t.name}>
                {t.name} ({t.store_type_name || 'Store'})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Agreements Data Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {loading ? (
          <div className="py-20 flex justify-center">
            <Loader text="Loading Franchisee Agreements..." />
          </div>
        ) : filteredAgreements.length === 0 ? (
          <div className="py-16 text-center text-slate-500">
            <FiFileText size={40} className="mx-auto text-slate-300 mb-2" />
            <p className="font-bold text-slate-700">No Franchisee Agreements Found</p>
            <p className="text-xs text-slate-400 mt-1">Setup an agreement or change your tab filter.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 border-b border-slate-200 text-xs font-black text-slate-500 uppercase tracking-wider">
                <tr>
                  <th className="px-5 py-4">Agreement No. & Version</th>
                  <th className="px-5 py-4">Franchisee Store & Type</th>
                  <th className="px-5 py-4">Cluster & Territory</th>
                  <th className="px-5 py-4">Validity Period</th>
                  <th className="px-5 py-4">Status & SLA</th>
                  <th className="px-5 py-4">Setup Fee</th>
                  <th className="px-5 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredAgreements.map((ag) => {
                  const statusBadges = {
                    active: 'bg-emerald-50 text-emerald-700 border-emerald-200',
                    expiring_soon: 'bg-amber-50 text-amber-700 border-amber-200 animate-pulse',
                    expired: 'bg-red-50 text-red-700 border-red-200',
                    renewal_pending: 'bg-blue-50 text-blue-700 border-blue-200',
                    renewed: 'bg-purple-50 text-purple-700 border-purple-200',
                    terminated: 'bg-slate-100 text-slate-600 border-slate-200',
                  };

                  const computedStatus = ag.computed_status || ag.status;

                  return (
                    <tr key={ag._id} className="hover:bg-slate-50/70 transition-colors">
                      {/* Agreement Number & Version */}
                      <td className="px-5 py-4">
                        <div className="font-extrabold text-slate-900">{ag.agreement_number}</div>
                        <div className="inline-flex items-center gap-1 mt-1 text-[11px] font-mono font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                          v{ag.version || '1.0'} • {ag.agreement_duration_type?.replace(/_/g, ' ') || '2 Years'}
                        </div>
                        {ag.document_url ? (
                          <div className="mt-1">
                            <a
                              href={resolveDocUrl(ag.document_url)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-600 hover:text-blue-800 hover:underline"
                              title={ag.document_name || 'Open Signed Agreement PDF'}
                            >
                              <FiFileText size={12} className="text-red-500" />
                              <span className="truncate max-w-[130px]">{ag.document_name || 'View PDF'}</span>
                            </a>
                          </div>
                        ) : (
                          <div className="mt-1 text-[10px] text-slate-400 italic">No PDF attached</div>
                        )}
                      </td>

                      {/* Franchisee Store & Type */}
                      <td className="px-5 py-4">
                        <div className="font-extrabold text-slate-900">
                          {ag.franchisee_id?.business_name || 'Unassigned'}
                        </div>
                        <div className="text-xs text-slate-500 font-medium">{ag.franchisee_id?.mobile}</div>
                        <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-blue-50 text-blue-700 border border-blue-200">
                            {ag.agreement_type || 'District Franchise Agreement'}
                          </span>
                          <span className="px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
                            {ag.franchise_type || (ag.franchisee_id?.store_category === 'company_store' ? 'Company Store' : 'District Franchise Store')}
                          </span>
                        </div>
                      </td>

                      {/* Cluster */}
                      <td className="px-5 py-4">
                        <div className="font-bold text-slate-800">{ag.cluster_id?.cluster_name || 'N/A'}</div>
                        <div className="text-xs text-slate-500 font-medium">
                          {ag.cluster_id?.state_name} • {(ag.cluster_id?.district_names || []).length} Districts
                        </div>
                      </td>

                      {/* Validity Period */}
                      <td className="px-5 py-4">
                        <div className="text-xs font-bold text-slate-800">
                          {new Date(ag.start_date).toLocaleDateString()} – {new Date(ag.end_date).toLocaleDateString()}
                        </div>
                        <div className="text-[11px] text-slate-400 mt-0.5 font-medium">
                          Expires in{' '}
                          <span className="font-bold text-slate-700">
                            {Math.ceil((new Date(ag.end_date) - new Date()) / (1000 * 60 * 60 * 24))} days
                          </span>
                        </div>
                      </td>

                      {/* Status */}
                      <td className="px-5 py-4">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-black border uppercase tracking-wider ${statusBadges[computedStatus] || 'bg-slate-100 text-slate-600'
                            }`}
                        >
                          {computedStatus.replace(/_/g, ' ')}
                        </span>
                      </td>

                      {/* Setup Fee */}
                      <td className="px-5 py-4">
                        <div className="font-extrabold text-slate-900">
                          ₹{(ag.setup_fee || 0).toLocaleString('en-IN')}
                        </div>
                        <div className="text-xs text-slate-400 font-medium">
                          Renewal: ₹{(ag.renewal_fee || 0).toLocaleString('en-IN')}
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="px-5 py-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          {ag.document_url && (
                            <a
                              href={ag.document_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              title="Download / View Signed Agreement PDF"
                              className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                            >
                              <FiDownload size={15} />
                            </a>
                          )}
                          <button
                            onClick={() => setSelectedAgreementDetail(ag)}
                            title="View Agreement & Version History"
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          >
                            <FiEye size={15} />
                          </button>
                          <button
                            onClick={() => {
                              setRenewingAgreement(ag);
                              setRenewStartDate(new Date(ag.end_date).toISOString().split('T')[0]);
                              const nextEnd = new Date(ag.end_date);
                              nextEnd.setFullYear(nextEnd.getFullYear() + 2);
                              setRenewEndDate(nextEnd.toISOString().split('T')[0]);
                              setRenewFeePaid(ag.renewal_fee || 10000);
                            }}
                            title="Renew Agreement"
                            className="p-2 text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                          >
                            <FiRefreshCw size={15} />
                          </button>
                          {computedStatus !== 'terminated' && (
                            <button
                              onClick={() => setTerminatePopup({ isOpen: true, agreement: ag, reason: '' })}
                              title="Terminate Agreement"
                              className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            >
                              <FiSlash size={15} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── CREATE AGREEMENT MODAL ─────────────────────────────────────────── */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center font-bold">
                  <FiFileText size={18} />
                </div>
                <h3 className="font-black text-slate-900 text-base">Setup New Franchisee Agreement</h3>
              </div>
              <button
                onClick={() => {
                  setIsCreateOpen(false);
                  setAgreementPdfFile(null);
                  if (createFileInputRef.current) createFileInputRef.current.value = '';
                }}
                className="text-slate-400 hover:text-slate-700"
              >
                <FiX size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateAgreement} className="space-y-4 text-xs font-semibold">
              {/* 1. Select Franchisee Store First */}
              <div>
                <label className="block text-slate-700 uppercase mb-1 font-bold flex items-center justify-between">
                  <span>Select Franchisee Store *</span>
                  {selectedPartner?.city && (
                    <span className="text-[11px] text-blue-600 font-semibold normal-case">
                      Territory: {selectedPartner.city}{selectedPartner.state ? `, ${selectedPartner.state}` : ''}
                    </span>
                  )}
                </label>
                <select
                  required
                  value={selectedFranchiseeId}
                  onChange={(e) => handleFranchiseeSelect(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Choose Partner</option>
                  {resellers.map((r) => (
                    <option key={r._id || r.id} value={r._id || r.id}>
                      {r.business_name || r.name} {r.mobile ? `(${r.mobile})` : ''} {r.cluster_name ? `• [${r.cluster_name}]` : ''}
                    </option>
                  ))}
                </select>

                {/* Auto-detect Notification Badge */}
                {selectedPartner && (
                  <div className="space-y-1.5 mt-2">
                    <div className="p-2.5 rounded-xl bg-blue-50 border border-blue-200/80 text-[11px] flex items-center justify-between">
                      {selectedPartner.cluster_name ? (
                        <div className="flex items-center gap-1.5 text-blue-900">
                          <FiCheckCircle className="text-emerald-600 shrink-0" size={14} />
                          <span>
                            <strong>Applicant's Chosen Cluster:</strong> {selectedPartner.cluster_name}{' '}
                            {selectedPartner.cluster_code ? `(${selectedPartner.cluster_code})` : ''} —{' '}
                            <span className="text-emerald-700 font-bold">Auto Selected</span>
                          </span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5 text-slate-600">
                          <FiAlertTriangle className="text-amber-500 shrink-0" size={14} />
                          <span>Applicant did not pre-select a cluster. Please choose a cluster below.</span>
                        </div>
                      )}
                    </div>

                    {/* Detected Franchise Store Type Badge */}
                    <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-[11px] flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-emerald-900">Store Franchise Type:</span>
                        <span className="px-2.5 py-0.5 rounded-md text-xs font-black bg-emerald-600 text-white shadow-xs">
                          {detectedFranchiseType}
                        </span>
                      </div>
                      <span className="text-emerald-700 font-semibold text-[10px]">
                        Auto-detected from Partner Profile
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* 2. Select Franchise Agreement Type (Configured per Franchise Type) */}
              <div>
                <label className="block text-slate-700 uppercase mb-1 font-bold flex items-center justify-between">
                  <span>Franchise Agreement Type *</span>
                  <span className="text-[11px] text-blue-600 font-semibold normal-case">
                    Terms defined per Franchise Type
                  </span>
                </label>
                <select
                  required
                  value={selectedAgreementTypeKey}
                  onChange={(e) => handleAgreementTypeChange(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 font-bold"
                >
                  {agreementTypes.map((t) => (
                    <option key={t.type_key} value={t.type_key}>
                      {t.name} (Mapped: {t.store_type_name || 'General Franchise Store'})
                    </option>
                  ))}
                </select>
              </div>

              {/* 2b. Agreement Title & Version */}
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <label className="block text-slate-700 uppercase mb-1 font-bold">Formal Agreement Title</label>
                  <input
                    type="text"
                    value={agreementTitle}
                    onChange={(e) => setAgreementTitle(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-800"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 uppercase mb-1 font-bold">Version</label>
                  <input
                    type="text"
                    value={agreementVersion}
                    onChange={(e) => setAgreementVersion(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-800"
                  />
                </div>
              </div>

              {/* 3. Select Cluster (Auto-populated or Manually Chosen) */}
              <div>
                <label className="block text-slate-700 uppercase mb-1 font-bold flex items-center justify-between">
                  <span>Select Cluster *</span>
                  {selectedClusterId && (
                    <span className="text-emerald-600 text-[11px] font-semibold normal-case">
                      ✓ Cluster linked
                    </span>
                  )}
                </label>
                <select
                  required
                  value={selectedClusterId}
                  onChange={(e) => {
                    const cid = e.target.value;
                    setSelectedClusterId(cid);
                    const clu = clusters.find((c) => String(c._id) === String(cid));
                    if (clu?.setup_fee_config?.setup_fee) {
                      setSetupFeeAmount(clu.setup_fee_config.setup_fee);
                    }
                    if (clu?.setup_fee_config?.renewal_fee) {
                      setRenewalFeeAmount(clu.setup_fee_config.renewal_fee);
                    }
                    if (clu?.assigned_bde_id) {
                      setSelectedBdeId(clu.assigned_bde_id._id || clu.assigned_bde_id);
                    }
                  }}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Choose Franchisee Cluster</option>
                  {clusters.map((c) => (
                    <option key={c._id} value={c._id}>
                      {c.cluster_name} ({c.cluster_code}) - {c.state_name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-700 uppercase mb-1 font-bold">Duration</label>
                  <select
                    value={durationYears}
                    onChange={(e) => handleDurationChange(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-800"
                  >
                    <option value={1}>1 Year</option>
                    <option value={2}>2 Years (Standard)</option>
                    <option value={3}>3 Years</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-700 uppercase mb-1 font-bold">Start Date</label>
                  <input
                    type="date"
                    required
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-800"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 uppercase mb-1 font-bold">End Date</label>
                  <input
                    type="date"
                    required
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-800"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 uppercase mb-1 font-bold">Franchisee Setup Fee (₹)</label>
                  <input
                    type="number"
                    value={setupFeeAmount}
                    onChange={(e) => setSetupFeeAmount(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-800"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 uppercase mb-1 font-bold">Renewal Fee (₹)</label>
                  <input
                    type="number"
                    value={renewalFeeAmount}
                    onChange={(e) => setRenewalFeeAmount(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-800"
                  />
                </div>
              </div>

              {/* Agreement PDF Upload Zone */}
              <div>
                <label className="block text-slate-700 uppercase mb-1 font-bold">
                  Agreement PDF Document <span className="text-slate-400 font-normal lowercase">(PDF only, max 25MB)</span>
                </label>

                {(() => {
                  const matchedAgType = agreementTypes.find((t) => t.type_key === selectedAgreementTypeKey);
                  if (matchedAgType?.document_url && !agreementPdfFile) {
                    return (
                      <div className="mb-2.5 p-2.5 rounded-xl bg-blue-50/80 border border-blue-200 flex items-center justify-between">
                        <div className="flex items-center gap-2 overflow-hidden">
                          <FiFileText className="text-red-500 shrink-0" size={16} />
                          <div className="min-w-0">
                            <span className="font-bold text-blue-900 text-xs truncate block" title={matchedAgType.document_name || 'Official Template.pdf'}>
                              Default Template Attached: {matchedAgType.document_name || 'Official Template.pdf'}
                            </span>
                            <span className="text-[10px] text-blue-600">
                              Linked from {matchedAgType.name}. Upload signed copy below to override.
                            </span>
                          </div>
                        </div>
                        <a
                          href={resolveDocUrl(matchedAgType.document_url)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-[10px] font-bold shrink-0 inline-flex items-center gap-1 transition"
                        >
                          <FiEye size={11} /> View Template
                        </a>
                      </div>
                    );
                  }
                  return null;
                })()}

                {!agreementPdfFile ? (
                  <div
                    onDragOver={(e) => {
                      e.preventDefault();
                      setIsDragging(true);
                    }}
                    onDragLeave={() => setIsDragging(false)}
                    onDrop={(e) => {
                      e.preventDefault();
                      setIsDragging(false);
                      const file = e.dataTransfer.files?.[0];
                      if (file) handlePdfSelect(file);
                    }}
                    onClick={() => createFileInputRef.current?.click()}
                    className={`border-2 border-dashed rounded-xl p-4 text-center transition-all cursor-pointer ${isDragging
                        ? 'border-blue-500 bg-blue-50/70 scale-[1.01]'
                        : 'border-slate-300 hover:border-blue-400 bg-slate-50/70 hover:bg-blue-50/20'
                      }`}
                  >
                    <input
                      type="file"
                      ref={createFileInputRef}
                      accept="application/pdf,.pdf"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handlePdfSelect(file);
                      }}
                    />
                    <div className="flex flex-col items-center justify-center gap-1.5 py-1">
                      <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center">
                        <FiUploadCloud size={20} />
                      </div>
                      <div className="font-bold text-slate-800 text-xs">
                        Click to upload Agreement PDF or drag & drop
                      </div>
                      <p className="text-[11px] text-slate-400">
                        Upload stamped & signed franchisee partner agreement (.pdf)
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="p-3 bg-blue-50/60 border border-blue-200 rounded-xl flex items-center justify-between">
                    <div className="flex items-center gap-3 overflow-hidden">
                      <div className="w-9 h-9 rounded-lg bg-red-100 text-red-600 flex items-center justify-center shrink-0 font-bold">
                        <FiFileText size={20} />
                      </div>
                      <div className="min-w-0">
                        <div className="font-bold text-slate-900 text-xs truncate max-w-xs" title={agreementPdfFile.name}>
                          {agreementPdfFile.name}
                        </div>
                        <div className="text-[11px] text-slate-500 flex items-center gap-2">
                          <span>{formatFileSize(agreementPdfFile.size)}</span>
                          <span className="inline-flex items-center gap-1 text-emerald-600 font-bold">
                            <FiCheckCircle size={12} /> Ready to upload
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => createFileInputRef.current?.click()}
                        className="px-2.5 py-1 text-[11px] font-bold text-blue-600 hover:bg-blue-100 rounded-md transition-colors"
                      >
                        Change
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setAgreementPdfFile(null);
                          if (createFileInputRef.current) createFileInputRef.current.value = '';
                        }}
                        className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                        title="Remove file"
                      >
                        <FiTrash2 size={15} />
                      </button>
                      <input
                        type="file"
                        ref={createFileInputRef}
                        accept="application/pdf,.pdf"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handlePdfSelect(file);
                        }}
                      />
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-slate-700 uppercase mb-1 font-bold">Renewal Conditions</label>
                <textarea
                  rows={2}
                  value={renewalConditions}
                  onChange={(e) => setRenewalConditions(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-800"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-200">
                <Button
                  type="button"
                  onClick={() => {
                    setIsCreateOpen(false);
                    setAgreementPdfFile(null);
                    if (createFileInputRef.current) createFileInputRef.current.value = '';
                  }}
                  className="px-4 py-2 border border-slate-200 rounded-lg font-bold text-slate-600"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={createSubmitting}
                  className="px-5 py-2 bg-blue-600 text-white rounded-lg font-bold"
                >
                  {createSubmitting ? 'Creating...' : 'Create Agreement'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── RENEW AGREEMENT MODAL ──────────────────────────────────────────── */}
      {renewingAgreement && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h3 className="font-extrabold text-slate-900 text-base">
                Renew Agreement ({renewingAgreement.agreement_number})
              </h3>
              <button
                onClick={() => {
                  setRenewingAgreement(null);
                  setRenewPdfFile(null);
                  if (renewFileInputRef.current) renewFileInputRef.current.value = '';
                }}
                className="text-slate-400 hover:text-slate-700"
              >
                <FiX size={18} />
              </button>
            </div>

            <form onSubmit={handleRenewAgreement} className="space-y-3 text-xs font-semibold">
              <div className="p-3 bg-slate-50 rounded-xl space-y-1">
                <div className="font-bold text-slate-800">{renewingAgreement.franchisee_id?.business_name}</div>
                <div className="text-slate-500">
                  Current: {new Date(renewingAgreement.start_date).toLocaleDateString()} –{' '}
                  {new Date(renewingAgreement.end_date).toLocaleDateString()} (v{renewingAgreement.version || '1.0'})
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 uppercase mb-1 font-bold">New Start Date</label>
                  <input
                    type="date"
                    required
                    value={renewStartDate}
                    onChange={(e) => setRenewStartDate(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded text-sm text-slate-800"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 uppercase mb-1 font-bold">New Expiry Date</label>
                  <input
                    type="date"
                    required
                    value={renewEndDate}
                    onChange={(e) => setRenewEndDate(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded text-sm text-slate-800"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 uppercase mb-1 font-bold">Renewal Fee Paid (₹)</label>
                <input
                  type="number"
                  value={renewFeePaid}
                  onChange={(e) => setRenewFeePaid(Number(e.target.value))}
                  className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded text-sm text-slate-800"
                />
              </div>

              <div>
                <label className="block text-slate-700 uppercase mb-1 font-bold">Payment Reference / UTR</label>
                <input
                  type="text"
                  placeholder="e.g. UTR12345678"
                  value={renewPaymentRef}
                  onChange={(e) => setRenewPaymentRef(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded text-sm text-slate-800"
                />
              </div>

              <div>
                <label className="block text-slate-700 uppercase mb-1 font-bold">Renewal Remarks</label>
                <textarea
                  rows={2}
                  placeholder="Terms or review notes..."
                  value={renewRemarks}
                  onChange={(e) => setRenewRemarks(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded text-sm text-slate-800"
                />
              </div>

              {/* Renew Agreement PDF Upload */}
              <div>
                <label className="block text-slate-700 uppercase mb-1 font-bold">
                  Upload Renewed Agreement PDF <span className="text-slate-400 font-normal lowercase">(Optional, PDF only)</span>
                </label>
                {!renewPdfFile ? (
                  <div
                    onClick={() => renewFileInputRef.current?.click()}
                    className="border border-dashed border-slate-300 rounded-lg p-2.5 text-center cursor-pointer hover:border-purple-400 hover:bg-purple-50/30 transition-colors"
                  >
                    <input
                      type="file"
                      ref={renewFileInputRef}
                      accept="application/pdf,.pdf"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
                          dispatch(
                            setAlert({
                              title: 'Invalid File',
                              message: 'Please select a valid PDF agreement file (.pdf)',
                              type: 'error',
                            })
                          );
                          return;
                        }
                        if (file.size > 25 * 1024 * 1024) {
                          dispatch(
                            setAlert({
                              title: 'File Too Large',
                              message: 'Agreement PDF size must be less than 25 MB',
                              type: 'error',
                            })
                          );
                          return;
                        }
                        setRenewPdfFile(file);
                      }}
                    />
                    <div className="flex items-center justify-center gap-2 text-slate-600 text-xs font-semibold">
                      <FiUploadCloud size={16} className="text-purple-600" />
                      <span>Attach new renewed agreement PDF</span>
                    </div>
                  </div>
                ) : (
                  <div className="p-2.5 bg-purple-50 border border-purple-200 rounded-lg flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2 truncate">
                      <FiFileText className="text-red-600 shrink-0" size={16} />
                      <span className="font-bold text-slate-800 truncate">{renewPdfFile.name}</span>
                      <span className="text-[10px] text-slate-400 shrink-0">({formatFileSize(renewPdfFile.size)})</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setRenewPdfFile(null);
                        if (renewFileInputRef.current) renewFileInputRef.current.value = '';
                      }}
                      className="text-slate-400 hover:text-red-600 ml-2 p-1"
                    >
                      <FiTrash2 size={14} />
                    </button>
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-200">
                <Button
                  type="button"
                  onClick={() => {
                    setRenewingAgreement(null);
                    setRenewPdfFile(null);
                    if (renewFileInputRef.current) renewFileInputRef.current.value = '';
                  }}
                  className="px-4 py-2 border border-slate-200 rounded-lg font-bold text-slate-600"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={renewSubmitting}
                  className="px-5 py-2 bg-purple-600 text-white rounded-lg font-bold"
                >
                  {renewSubmitting ? 'Renewing...' : 'Activate Renewal'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── DETAILS & VERSION HISTORY DRAWER ───────────────────────────────── */}
      {selectedAgreementDetail && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex justify-end">
          <div className="bg-white w-full max-w-lg h-full shadow-2xl border-l border-slate-200 flex flex-col animate-in slide-in-from-right duration-200">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div>
                <h3 className="font-black text-slate-900 text-base">{selectedAgreementDetail.agreement_number}</h3>
                <p className="text-xs text-slate-500 font-medium">Version {selectedAgreementDetail.version || '1.0'}</p>
              </div>
              <button
                onClick={() => setSelectedAgreementDetail(null)}
                className="p-2 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100"
              >
                <FiX size={18} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-4 text-xs font-semibold text-slate-700">
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/80 space-y-2">
                <div className="flex justify-between py-1 border-b border-slate-200/50">
                  <span className="text-slate-500">Agreement Type</span>
                  <span className="font-extrabold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                    {selectedAgreementDetail.agreement_type || 'District Franchise Agreement'}
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-200/50">
                  <span className="text-slate-500">Franchise Store Type</span>
                  <span className="font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                    {selectedAgreementDetail.franchise_type || (selectedAgreementDetail.franchisee_id?.store_category === 'company_store' ? 'Company Store' : 'District Franchise Store')}
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-200/50">
                  <span className="text-slate-500">Franchisee</span>
                  <span className="font-extrabold text-slate-900">{selectedAgreementDetail.franchisee_id?.business_name}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-200/50">
                  <span className="text-slate-500">Cluster</span>
                  <span className="font-extrabold text-slate-900">{selectedAgreementDetail.cluster_id?.cluster_name}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-200/50">
                  <span className="text-slate-500">Start Date</span>
                  <span className="font-bold text-slate-800">{new Date(selectedAgreementDetail.start_date).toLocaleDateString()}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-200/50">
                  <span className="text-slate-500">Expiry Date</span>
                  <span className="font-bold text-slate-800">{new Date(selectedAgreementDetail.end_date).toLocaleDateString()}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-200/50">
                  <span className="text-slate-500">Status</span>
                  <span className="font-black uppercase text-blue-600">{selectedAgreementDetail.status}</span>
                </div>
              </div>

              {/* Agreement Document Card */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/80 space-y-2">
                <div className="font-black uppercase tracking-wider text-slate-500 text-[11px]">
                  Signed Agreement Document
                </div>
                {selectedAgreementDetail.document_url ? (
                  <div className="flex items-center justify-between p-3 bg-white rounded-lg border border-slate-200">
                    <div className="flex items-center gap-2.5 overflow-hidden">
                      <div className="w-8 h-8 rounded-lg bg-red-100 text-red-600 flex items-center justify-center shrink-0">
                        <FiFileText size={18} />
                      </div>
                      <div className="min-w-0">
                        <p
                          className="font-bold text-slate-900 text-xs truncate max-w-[200px]"
                          title={selectedAgreementDetail.document_name || 'Signed_Agreement.pdf'}
                        >
                          {selectedAgreementDetail.document_name || 'Signed_Agreement.pdf'}
                        </p>
                        <p className="text-[10px] text-slate-400 font-medium">Uploaded PDF Document</p>
                      </div>
                    </div>
                    <a
                      href={resolveDocUrl(selectedAgreementDetail.document_url)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold text-xs inline-flex items-center gap-1.5 transition-colors shrink-0"
                    >
                      <FiDownload size={13} /> View PDF
                    </a>
                  </div>
                ) : (
                  <div className="p-3 bg-white rounded-lg border border-slate-200 text-center text-slate-400 italic text-xs">
                    No PDF document attached to this agreement.
                  </div>
                )}
              </div>

              {/* Renewal History Timeline */}
              <div>
                <h4 className="font-black uppercase tracking-wider text-slate-500 mb-2">Previous Versions & Renewals</h4>
                {(selectedAgreementDetail.renewal_history || []).length === 0 ? (
                  <div className="p-4 bg-slate-50 rounded-xl text-center text-slate-400 italic">
                    Original agreement version (no previous renewals).
                  </div>
                ) : (
                  <div className="space-y-2">
                    {selectedAgreementDetail.renewal_history.map((h, i) => (
                      <div key={i} className="p-3 bg-slate-50 rounded-xl border border-slate-200/70 space-y-1">
                        <div className="flex justify-between font-bold text-slate-800">
                          <span>Renewal #{i + 1}</span>
                          <span className="text-[10px] text-slate-400">{new Date(h.renewed_at).toLocaleDateString()}</span>
                        </div>
                        <div className="text-slate-600">
                          Period: {new Date(h.previous_start_date).toLocaleDateString()} – {new Date(h.previous_end_date).toLocaleDateString()}
                        </div>
                        <div className="text-slate-500 text-[11px]">Fee Paid: ₹{h.renewal_fee_paid?.toLocaleString('en-IN')}</div>
                        {h.document_url && (
                          <div className="pt-1">
                            <a
                              href={resolveDocUrl(h.document_url)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:underline inline-flex items-center gap-1 text-[11px] font-semibold"
                            >
                              <FiDownload size={11} /> Version PDF ({h.document_name || 'View document'})
                            </a>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="p-4 border-t border-slate-100 bg-slate-50/50">
              <Button
                onClick={() => setSelectedAgreementDetail(null)}
                className="w-full py-2 bg-slate-900 text-white rounded-xl font-bold"
              >
                Close View
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ── TERMINATE CONFIRMATION POPUP ──────────────────────────────────── */}
      {terminatePopup.isOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <h3 className="font-extrabold text-red-600 text-base">Terminate Franchisee Agreement</h3>
            <p className="text-xs text-slate-600">
              Are you sure you want to terminate agreement{' '}
              <span className="font-bold">{terminatePopup.agreement?.agreement_number}</span>? This will close operational
              authorization for this territory.
            </p>
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Termination Reason *</label>
              <textarea
                required
                rows={2}
                placeholder="Specify regulatory, compliance or business reason..."
                value={terminatePopup.reason}
                onChange={(e) => setTerminatePopup({ ...terminatePopup, reason: e.target.value })}
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg text-slate-800"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button
                onClick={() => setTerminatePopup({ isOpen: false, agreement: null, reason: '' })}
                className="px-4 py-2 border rounded-lg font-bold text-xs text-slate-600"
              >
                Cancel
              </Button>
              <Button onClick={handleTerminateAgreement} className="px-4 py-2 bg-red-600 text-white rounded-lg font-bold text-xs">
                Confirm Termination
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
