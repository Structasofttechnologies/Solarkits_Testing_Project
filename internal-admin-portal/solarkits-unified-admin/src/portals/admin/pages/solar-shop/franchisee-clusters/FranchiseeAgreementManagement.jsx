import React, { useState, useEffect, useMemo } from 'react';
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
} from 'react-icons/fi';
import Button from '@/components/Button';
import Loader from '@/components/Loader';
import ConfirmationPopup from '@/components/ConfirmationPopup';

export default function FranchiseeAgreementManagement() {
  const dispatch = useDispatch();
  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

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

  // Masters
  const [clusters, setClusters] = useState([]);
  const [resellers, setResellers] = useState([]);
  const [bdes, setBdes] = useState([]);

  // Create Agreement Modal
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createSubmitting, setCreateSubmitting] = useState(false);
  const [selectedClusterId, setSelectedClusterId] = useState('');
  const [selectedFranchiseeId, setSelectedFranchiseeId] = useState('');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(
    new Date(Date.now() + 2 * 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  );
  const [durationYears, setDurationYears] = useState(2);
  const [setupFeeAmount, setSetupFeeAmount] = useState(100000);
  const [renewalFeeAmount, setRenewalFeeAmount] = useState(10000);
  const [documentUrl, setDocumentUrl] = useState('');
  const [selectedBdeId, setSelectedBdeId] = useState('');
  const [renewalConditions, setRenewalConditions] = useState(
    'Standard renewal subject to annual EPC onboarding goal and monthly kit sales quota achievement.'
  );

  // Renew Modal
  const [renewingAgreement, setRenewingAgreement] = useState(null);
  const [renewSubmitting, setRenewSubmitting] = useState(false);
  const [renewStartDate, setRenewStartDate] = useState('');
  const [renewEndDate, setRenewEndDate] = useState('');
  const [renewFeePaid, setRenewFeePaid] = useState(10000);
  const [renewPaymentRef, setRenewPaymentRef] = useState('');
  const [renewRemarks, setRenewRemarks] = useState('');

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
      const [cluRes, resRes, bdeRes] = await Promise.all([
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
      ]);
      if (cluRes?.data?.data) setClusters(cluRes.data.data);
      const rList = resRes?.data?.data || resRes?.data?.resellers || [];
      if (Array.isArray(rList)) setResellers(rList);
      const bList = bdeRes?.data?.data || bdeRes?.data?.bdes || [];
      if (Array.isArray(bList)) setBdes(bList);
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

  // Submit Create Agreement
  const handleCreateAgreement = async (e) => {
    e.preventDefault();
    if (!selectedClusterId || !selectedFranchiseeId || !startDate || !endDate) {
      dispatch(setAlert({ title: 'Validation', message: 'Please fill all required fields', type: 'error' }));
      return;
    }

    setCreateSubmitting(true);
    try {
      const payload = {
        cluster_id: selectedClusterId,
        franchisee_id: selectedFranchiseeId,
        start_date: startDate,
        end_date: endDate,
        agreement_duration_type: `${durationYears}_years`,
        duration_months: Number(durationYears) * 12,
        setup_fee: Number(setupFeeAmount),
        renewal_fee: Number(renewalFeeAmount),
        document_url: documentUrl.trim() || null,
        assigned_bde_id: selectedBdeId || null,
        renewal_conditions: renewalConditions,
      };

      await axios.post(`${API_URL}/franchise-clusters/agreements/create`, payload, authHeaderObj());
      dispatch(setAlert({ title: 'Success', message: 'Agreement created successfully', type: 'success' }));
      setIsCreateOpen(false);
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
      const payload = {
        new_start_date: renewStartDate || renewingAgreement.end_date,
        new_end_date: renewEndDate,
        renewal_fee_paid: Number(renewFeePaid),
        payment_reference: renewPaymentRef,
        remarks: renewRemarks,
      };

      await axios.post(
        `${API_URL}/franchise-clusters/agreements/${renewingAgreement._id}/renew`,
        payload,
        authHeaderObj()
      );
      dispatch(setAlert({ title: 'Renewed', message: 'Agreement renewed successfully', type: 'success' }));
      setRenewingAgreement(null);
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
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      const numMatch = ag.agreement_number?.toLowerCase().includes(q);
      const nameMatch = ag.franchisee_id?.business_name?.toLowerCase().includes(q);
      const cluMatch = ag.cluster_id?.cluster_name?.toLowerCase().includes(q);
      return numMatch || nameMatch || cluMatch;
    });
  }, [agreements, searchQuery]);

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
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === tab.key
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200/80'
            }`}
          >
            <span>{tab.label}</span>
            <span
              className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
                activeTab === tab.key ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-700'
              }`}
            >
              {tab.count}
            </span>
          </button>
        ))}
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
                  <th className="px-5 py-4">Franchisee Store</th>
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
                      </td>

                      {/* Franchisee Store */}
                      <td className="px-5 py-4">
                        <div className="font-extrabold text-slate-900">
                          {ag.franchisee_id?.business_name || 'Unassigned'}
                        </div>
                        <div className="text-xs text-slate-500 font-medium">{ag.franchisee_id?.mobile}</div>
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
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-black border uppercase tracking-wider ${
                            statusBadges[computedStatus] || 'bg-slate-100 text-slate-600'
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
              <button onClick={() => setIsCreateOpen(false)} className="text-slate-400 hover:text-slate-700">
                <FiX size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateAgreement} className="space-y-4 text-xs font-semibold">
              <div>
                <label className="block text-slate-700 uppercase mb-1 font-bold">Select Cluster *</label>
                <select
                  required
                  value={selectedClusterId}
                  onChange={(e) => {
                    setSelectedClusterId(e.target.value);
                    const clu = clusters.find((c) => c._id === e.target.value);
                    if (clu?.assigned_franchisee_id?._id) {
                      setSelectedFranchiseeId(clu.assigned_franchisee_id._id);
                    }
                    if (clu?.setup_fee_config?.setup_fee) {
                      setSetupFeeAmount(clu.setup_fee_config.setup_fee);
                    }
                    if (clu?.setup_fee_config?.renewal_fee) {
                      setRenewalFeeAmount(clu.setup_fee_config.renewal_fee);
                    }
                  }}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-800"
                >
                  <option value="">Choose Franchisee Cluster</option>
                  {clusters.map((c) => (
                    <option key={c._id} value={c._id}>
                      {c.cluster_name} ({c.cluster_code}) - {c.state_name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-700 uppercase mb-1 font-bold">Select Franchisee Store *</label>
                <select
                  required
                  value={selectedFranchiseeId}
                  onChange={(e) => setSelectedFranchiseeId(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-800"
                >
                  <option value="">Choose Partner</option>
                  {resellers.map((r) => (
                    <option key={r._id || r.id} value={r._id || r.id}>
                      {r.business_name || r.name} {r.mobile ? `(${r.mobile})` : ''}
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

              <div>
                <label className="block text-slate-700 uppercase mb-1 font-bold">Agreement PDF Storage Key / URL</label>
                <input
                  type="text"
                  placeholder="https://... or S3 / local key"
                  value={documentUrl}
                  onChange={(e) => setDocumentUrl(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-800"
                />
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
                  onClick={() => setIsCreateOpen(false)}
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
              <button onClick={() => setRenewingAgreement(null)} className="text-slate-400 hover:text-slate-700">
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

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-200">
                <Button
                  type="button"
                  onClick={() => setRenewingAgreement(null)}
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
