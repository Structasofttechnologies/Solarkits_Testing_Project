import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { useDispatch } from 'react-redux';
import { setAlert } from '@/features/alert.slice';
import { authHeaderObj } from '@/app/authHeader';
import {
  FiLayers,
  FiPlus,
  FiSearch,
  FiFilter,
  FiEdit2,
  FiTrash2,
  FiCheckCircle,
  FiAlertCircle,
  FiMapPin,
  FiDollarSign,
  FiClock,
  FiUsers,
  FiShield,
  FiX,
  FiInfo,
  FiCheck,
  FiChevronRight,
} from 'react-icons/fi';
import Button from '@/components/Button';
import CustomInput from '@/components/CustomInput';
import Dropdown from '@/components/Dropdown';
import DropdownWithSearchInput from '@/components/DropdownWithSearchInput';
import MultiSelectDropdownWithSearchInput from '@/components/MultiSelectDropdownWithSearchInput';
import ConfirmationPopup from '@/components/ConfirmationPopup';
import Loader from '@/components/Loader';
import PageHeader from '@/components/PageHeader';

export default function ClusterManagement({ onOpenMapWithDistrict }) {
  const dispatch = useDispatch();
  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

  // Clusters list
  const [clusters, setClusters] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [selectedStateFilter, setSelectedStateFilter] = useState('');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Dropdown options
  const [states, setStates] = useState([]);
  const [availableDistricts, setAvailableDistricts] = useState([]);
  const [districtsLoading, setDistrictsLoading] = useState(false);
  const [resellers, setResellers] = useState([]);
  const [bdes, setBdes] = useState([]);

  // Create / Edit Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCluster, setEditingCluster] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // Form State
  const [clusterName, setClusterName] = useState('');
  const [selectedState, setSelectedState] = useState('');
  const [selectedDistricts, setSelectedDistricts] = useState([]);
  const [clusterStatus, setClusterStatus] = useState('available');
  const [assignedFranchisee, setAssignedFranchisee] = useState('');
  const [primaryBde, setPrimaryBde] = useState('');
  const [supportBdes, setSupportBdes] = useState([]);
  const [agreementYears, setAgreementYears] = useState(2);
  const [isSharedAllowed, setIsSharedAllowed] = useState(false);
  const [auditReason, setAuditReason] = useState('');

  // Setup Fee Breakdown
  const [setupFee, setSetupFee] = useState(100000);
  const [renewalFee, setRenewalFee] = useState(10000);
  const [securityDeposit, setSecurityDeposit] = useState(25000);
  const [waiverAmount, setWaiverAmount] = useState(0);
  const [additionalCharges, setAdditionalCharges] = useState([]);
  const [paymentStatus, setPaymentStatus] = useState('pending');

  // Confirmation / Delete popup
  const [deletePopup, setDeletePopup] = useState({ isOpen: false, cluster: null });

  // Fee Details Modal
  const [feeModalCluster, setFeeModalCluster] = useState(null);

  // Audit History Modal
  const [auditModalCluster, setAuditModalCluster] = useState(null);

  // Load States, Resellers, BDEs
  useEffect(() => {
    fetchStates();
    fetchResellers();
    fetchBdes();
    fetchClusters();
  }, []);

  const fetchStates = async () => {
    try {
      let res = await axios.get(`${API_URL}/franchise-clusters/states`, authHeaderObj()).catch(() => null);
      if (!res || !res.data?.data) {
        res = await axios.get(`${API_URL}/geolocation/get-states`, authHeaderObj()).catch(() => null);
      }
      if (!res || !res.data?.data) {
        res = await axios.get(`${API_URL}/geolocation/states`, authHeaderObj()).catch(() => null);
      }
      if (!res || !res.data?.data) {
        res = await axios.get(`${API_URL}/geolocation/get-active-states`, authHeaderObj()).catch(() => null);
      }
      const list = res?.data?.states || res?.data?.data || [];
      if (Array.isArray(list) && list.length > 0) {
        setStates(list);
      }
    } catch (err) {
      console.error('Error loading states:', err);
    }
  };

  const fetchResellers = async () => {
    try {
      let res = await axios.get(`${API_URL}/franchise-clusters/resellers`, authHeaderObj()).catch(() => null);
      if (!res || !res.data?.data) {
        res = await axios.get(`${API_URL}/resellers/list?unique_id=RSL_MGMT&req_for=view&limit=500`, authHeaderObj()).catch(() => null);
      }
      if (!res || !res.data?.data) {
        res = await axios.get(`${API_URL}/reseller-mgmt/list?unique_id=RSL_MGMT&req_for=view&limit=500`, authHeaderObj()).catch(() => null);
      }
      const list = res?.data?.data || res?.data?.resellers || [];
      if (Array.isArray(list)) {
        setResellers(list);
      }
    } catch (err) {
      console.error('Error loading resellers:', err);
    }
  };

  const fetchBdes = async () => {
    try {
      let res = await axios.get(`${API_URL}/franchise-clusters/bdes`, authHeaderObj()).catch(() => null);
      if (!res || !res.data?.data) {
        res = await axios.get(`${API_URL}/franchise-clusters/bde/mappings`, authHeaderObj()).catch(() => null);
      }
      if (!res || !res.data?.data) {
        res = await axios.get(`${API_URL}/store-management/bde/list?unique_id=RSL_MGMT&req_for=view`, authHeaderObj()).catch(() => null);
      }
      if (!res || !res.data?.data) {
        res = await axios.get(`${API_URL}/bde/list?unique_id=ADM_BDE_MGMT&req_for=view&limit=500`, authHeaderObj()).catch(() => null);
      }
      const list = res?.data?.data || res?.data?.bdes || [];
      if (Array.isArray(list)) {
        setBdes(list);
      }
    } catch (err) {
      console.error('Error loading BDEs:', err);
    }
  };

  const fetchClusters = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API_URL}/franchise-clusters/list`, authHeaderObj());
      if (res.data?.status === 'success') {
        setClusters(res.data.data || []);
      }
    } catch (err) {
      console.error('Error loading clusters:', err);
      dispatch(setAlert({ title: 'Error', message: 'Failed to load clusters', type: 'error' }));
    } finally {
      setLoading(false);
    }
  };

  // Fetch districts when state is selected in Create/Edit modal
  useEffect(() => {
    if (!selectedState) {
      setAvailableDistricts([]);
      return;
    }
    setDistrictsLoading(true);
    axios
      .get(`${API_URL}/franchise-clusters/available-districts/${selectedState}`, authHeaderObj())
      .then((res) => {
        const list = res.data?.data || res.data?.districts || [];
        if (Array.isArray(list) && list.length > 0) {
          setAvailableDistricts(list);
        } else {
          return axios
            .get(`${API_URL}/geolocation/get-districts?state_id=${selectedState}`, authHeaderObj())
            .then((gRes) => {
              const gList = gRes.data?.districts || gRes.data?.data || [];
              setAvailableDistricts(
                gList.map((d) => ({
                  id: d._id || d.id,
                  _id: d._id || d.id,
                  name: d.name,
                  is_allotted: false,
                  is_reserved: false,
                  is_in_cluster: false,
                }))
              );
            });
        }
      })
      .catch((err) => {
        console.error('Error fetching districts:', err);
        axios
          .get(`${API_URL}/geolocation/get-districts?state_id=${selectedState}`, authHeaderObj())
          .then((gRes) => {
            const gList = gRes.data?.districts || gRes.data?.data || [];
            setAvailableDistricts(
              gList.map((d) => ({
                id: d._id || d.id,
                _id: d._id || d.id,
                name: d.name,
                is_allotted: false,
                is_reserved: false,
                is_in_cluster: false,
              }))
            );
          })
          .catch(() => setAvailableDistricts([]));
      })
      .finally(() => setDistrictsLoading(false));
  }, [selectedState]);

  // Total payable calculation
  const calculatedTotalPayable = useMemo(() => {
    const fee = Number(setupFee || 0);
    const renewal = Number(renewalFee || 0);
    const deposit = Number(securityDeposit || 0);
    const extras = additionalCharges.reduce((sum, item) => sum + Number(item.amount || 0), 0);
    const waiver = Number(waiverAmount || 0);
    return Math.max(0, fee + renewal + deposit + extras - waiver);
  }, [setupFee, renewalFee, securityDeposit, additionalCharges, waiverAmount]);

  // Open Create Modal
  const handleOpenCreateModal = () => {
    setEditingCluster(null);
    setClusterName('');
    setSelectedState('');
    setSelectedDistricts([]);
    setClusterStatus('available');
    setAssignedFranchisee('');
    setPrimaryBde('');
    setSupportBdes([]);
    setAgreementYears(2);
    setIsSharedAllowed(false);
    setAuditReason('');
    setSetupFee(100000);
    setRenewalFee(10000);
    setSecurityDeposit(25000);
    setWaiverAmount(0);
    setAdditionalCharges([]);
    setPaymentStatus('pending');
    setIsModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEditModal = (cluster) => {
    setEditingCluster(cluster);
    setClusterName(cluster.cluster_name);
    setSelectedState(cluster.state_id?._id || cluster.state_id);
    setSelectedDistricts(cluster.district_ids?.map((d) => d._id || d) || []);
    setClusterStatus(cluster.status);
    setAssignedFranchisee(cluster.assigned_franchisee_id?._id || '');
    setPrimaryBde(cluster.primary_bde_id?._id || '');
    setSupportBdes(cluster.support_bde_ids?.map((b) => b._id || b) || []);
    setAgreementYears(cluster.setup_fee_config?.agreement_duration_years || 2);
    setIsSharedAllowed(Boolean(cluster.is_shared_territory_allowed));
    setAuditReason('');
    setSetupFee(cluster.setup_fee_config?.setup_fee || 100000);
    setRenewalFee(cluster.setup_fee_config?.renewal_fee || 10000);
    setSecurityDeposit(cluster.setup_fee_config?.security_deposit || 25000);
    setWaiverAmount(cluster.setup_fee_config?.waiver_discount?.amount || 0);
    setAdditionalCharges(cluster.setup_fee_config?.additional_charges || []);
    setPaymentStatus(cluster.payment_status || 'pending');
    setIsModalOpen(true);
  };

  // Submit Create or Edit
  const handleSubmitCluster = async (e) => {
    e.preventDefault();
    if (!clusterName.trim()) {
      dispatch(setAlert({ title: 'Validation', message: 'Cluster Name is required', type: 'error' }));
      return;
    }
    if (!selectedState) {
      dispatch(setAlert({ title: 'Validation', message: 'Please select a State', type: 'error' }));
      return;
    }
    if (selectedDistricts.length === 0) {
      dispatch(setAlert({ title: 'Validation', message: 'Please select at least one District', type: 'error' }));
      return;
    }

    // If editing cluster with active franchisee and territory changes, require audit reason
    if (editingCluster && editingCluster.assigned_franchisee_id && !auditReason.trim()) {
      dispatch(
        setAlert({
          title: 'Reason Required',
          message: 'This cluster has an active franchisee. An audit reason is mandatory for territory/configuration changes.',
          type: 'warning',
        })
      );
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        cluster_name: clusterName.trim(),
        state_id: selectedState,
        district_ids: selectedDistricts,
        franchisee_store_type: 'district_wise_franchisee_store',
        status: clusterStatus,
        assigned_franchisee_id: assignedFranchisee || null,
        primary_bde_id: primaryBde || null,
        support_bde_ids: supportBdes,
        agreement_period_years: Number(agreementYears),
        is_shared_territory_allowed: isSharedAllowed,
        setup_fee_config: {
          setup_fee: Number(setupFee),
          agreement_duration_years: Number(agreementYears),
          renewal_fee: Number(renewalFee),
          security_deposit: Number(securityDeposit),
          additional_charges: additionalCharges,
          total_payable: calculatedTotalPayable,
          waiver_discount: {
            amount: Number(waiverAmount),
            reason: auditReason || 'Admin approved waiver',
          },
        },
        reason: auditReason || (editingCluster ? 'Updated cluster configuration' : 'Initial cluster creation'),
      };

      if (editingCluster) {
        await axios.put(`${API_URL}/franchise-clusters/${editingCluster._id}`, payload, authHeaderObj());
        dispatch(setAlert({ title: 'Success', message: 'Cluster updated successfully', type: 'success' }));
      } else {
        await axios.post(`${API_URL}/franchise-clusters/create`, payload, authHeaderObj());
        dispatch(setAlert({ title: 'Success', message: 'Franchisee cluster created successfully', type: 'success' }));
      }

      setIsModalOpen(false);
      fetchClusters();
    } catch (err) {
      console.error('Error saving cluster:', err);
      dispatch(
        setAlert({
          title: 'Error',
          message: err.response?.data?.message || err.message || 'Failed to save cluster',
          type: 'error',
        })
      );
    } finally {
      setSubmitting(false);
    }
  };

  // Delete Cluster Confirmation
  const handleDeleteCluster = async () => {
    if (!deletePopup.cluster) return;
    try {
      await axios.delete(`${API_URL}/franchise-clusters/${deletePopup.cluster._id}`, authHeaderObj());
      dispatch(setAlert({ title: 'Deleted', message: 'Cluster deleted successfully', type: 'success' }));
      setDeletePopup({ isOpen: false, cluster: null });
      fetchClusters();
    } catch (err) {
      console.error('Error deleting cluster:', err);
      dispatch(
        setAlert({
          title: 'Error',
          message: err.response?.data?.message || err.message || 'Cannot delete cluster',
          type: 'error',
        })
      );
    }
  };

  // Filtered clusters
  const filteredClusters = useMemo(() => {
    return clusters.filter((c) => {
      if (selectedStateFilter && String(c.state_id?._id || c.state_id) !== selectedStateFilter) {
        return false;
      }
      if (selectedStatusFilter !== 'all' && c.status !== selectedStatusFilter) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const nameMatch = c.cluster_name?.toLowerCase().includes(q);
        const codeMatch = c.cluster_code?.toLowerCase().includes(q);
        const stateMatch = c.state_name?.toLowerCase().includes(q);
        const districtMatch = (c.district_names || []).some((d) => d?.toLowerCase().includes(q));
        const franchiseeMatch = c.assigned_franchisee_id?.business_name?.toLowerCase().includes(q);
        if (!nameMatch && !codeMatch && !stateMatch && !districtMatch && !franchiseeMatch) {
          return false;
        }
      }
      return true;
    });
  }, [clusters, selectedStateFilter, selectedStatusFilter, searchQuery]);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center font-bold">
              <FiLayers size={22} />
            </div>
            <div>
              <h1 className="text-xl font-black text-slate-900">Franchisee Cluster Management</h1>
              <p className="text-xs font-semibold text-slate-500">
                Configure district-wise franchisee clusters across India, setup fees, and territory assignments
              </p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            onClick={handleOpenCreateModal}
            className="flex items-center gap-2 px-4 py-2.5 bg-orange-600 hover:bg-orange-700 text-white rounded-xl font-bold text-sm shadow-sm transition-all"
          >
            <FiPlus size={16} /> Create Cluster
          </Button>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
        {/* Search */}
        <div className="relative">
          <FiSearch className="absolute left-3.5 top-3 text-slate-400" size={16} />
          <input
            type="text"
            placeholder="Search clusters, codes, districts..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:bg-white"
          />
        </div>

        {/* State Filter */}
        <div>
          <select
            value={selectedStateFilter}
            onChange={(e) => setSelectedStateFilter(e.target.value)}
            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-orange-500"
          >
            <option value="">All Indian States</option>
            {states.map((st) => (
              <option key={st._id || st.id} value={st._id || st.id}>
                {st.name || st.state_name}
              </option>
            ))}
          </select>
        </div>

        {/* Status Filter */}
        <div>
          <select
            value={selectedStatusFilter}
            onChange={(e) => setSelectedStatusFilter(e.target.value)}
            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-orange-500"
          >
            <option value="all">All Statuses</option>
            <option value="available">🟢 Available (Pending Onboarding)</option>
            <option value="allotted">🔵 Allotted (Active Franchisee)</option>
            <option value="reserved">🟡 Reserved (Application in Progress)</option>
            <option value="inactive">⚪ Inactive</option>
          </select>
        </div>

        {/* Total Cluster Summary Badge */}
        <div className="flex items-center justify-end px-3 py-2 text-xs font-bold text-slate-600 bg-slate-100 rounded-lg">
          Showing <span className="text-orange-600 mx-1 font-extrabold">{filteredClusters.length}</span> of {clusters.length} Clusters
        </div>
      </div>

      {/* Clusters Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center text-slate-500 gap-3">
            <Loader text="Loading Clusters across India..." />
          </div>
        ) : filteredClusters.length === 0 ? (
          <div className="py-16 text-center text-slate-500">
            <FiLayers size={40} className="mx-auto text-slate-300 mb-2" />
            <p className="font-bold text-slate-700">No Franchisee Clusters Found</p>
            <p className="text-xs text-slate-400 mt-1">Create your first cluster or adjust your search filters.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 border-b border-slate-200 text-xs font-black text-slate-500 uppercase tracking-wider">
                <tr>
                  <th className="px-5 py-4">Cluster Details</th>
                  <th className="px-5 py-4">State & Territory</th>
                  <th className="px-5 py-4">Franchisee Store</th>
                  <th className="px-5 py-4">Assigned BDE</th>
                  <th className="px-5 py-4">Setup Fee & Terms</th>
                  <th className="px-5 py-4 text-center">Status</th>
                  <th className="px-5 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredClusters.map((cluster) => {
                  const statusColors = {
                    available: 'bg-emerald-50 text-emerald-700 border-emerald-200',
                    allotted: 'bg-blue-50 text-blue-700 border-blue-200',
                    reserved: 'bg-amber-50 text-amber-700 border-amber-200',
                    inactive: 'bg-slate-100 text-slate-600 border-slate-200',
                  };

                  return (
                    <tr key={cluster._id} className="hover:bg-slate-50/70 transition-colors">
                      {/* Cluster Name & Code */}
                      <td className="px-5 py-4">
                        <div className="font-extrabold text-slate-900">{cluster.cluster_name}</div>
                        <div className="inline-flex items-center gap-1 mt-1 text-[11px] font-mono font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                          {cluster.cluster_code}
                        </div>
                      </td>

                      {/* State & Districts */}
                      <td className="px-5 py-4">
                        <div className="font-bold text-slate-800 flex items-center gap-1.5">
                          <FiMapPin className="text-orange-500 shrink-0" size={13} />
                          {cluster.state_name}
                        </div>
                        <div className="text-xs text-slate-500 mt-1 font-medium line-clamp-1" title={(cluster.district_names || []).join(', ')}>
                          <span className="font-bold text-slate-700">{(cluster.district_names || []).length} Districts:</span>{' '}
                          {(cluster.district_names || []).slice(0, 3).join(', ')}
                          {(cluster.district_names || []).length > 3 && ` +${(cluster.district_names || []).length - 3} more`}
                        </div>
                      </td>

                      {/* Assigned Franchisee */}
                      <td className="px-5 py-4">
                        {cluster.assigned_franchisee_id ? (
                          <div>
                            <div className="font-extrabold text-slate-900">{cluster.assigned_franchisee_id.business_name}</div>
                            <div className="text-xs text-slate-500 font-medium">{cluster.assigned_franchisee_id.mobile}</div>
                          </div>
                        ) : (
                          <span className="text-xs italic text-slate-400 font-medium">Open for Allocation</span>
                        )}
                      </td>

                      {/* Assigned BDE */}
                      <td className="px-5 py-4">
                        {cluster.primary_bde_id ? (
                          <div>
                            <div className="font-bold text-slate-800">{cluster.primary_bde_id.full_name}</div>
                            <div className="text-[11px] font-mono text-slate-500">{cluster.primary_bde_id.bde_id}</div>
                          </div>
                        ) : (
                          <span className="text-xs italic text-slate-400">Not Assigned</span>
                        )}
                      </td>

                      {/* Setup Fee & Terms */}
                      <td className="px-5 py-4">
                        <button
                          onClick={() => setFeeModalCluster(cluster)}
                          className="text-left group hover:opacity-80 transition-opacity"
                        >
                          <div className="font-extrabold text-slate-900 flex items-center gap-1">
                            ₹{(cluster.setup_fee_config?.total_payable || 0).toLocaleString('en-IN')}
                            <FiInfo size={12} className="text-slate-400 group-hover:text-orange-600" />
                          </div>
                          <div className="text-xs text-slate-500 font-medium">
                            {cluster.setup_fee_config?.agreement_duration_years || 2} Years Agreement
                          </div>
                        </button>
                      </td>

                      {/* Status */}
                      <td className="px-5 py-4 text-center">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-black border capitalize ${
                            statusColors[cluster.status] || 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {cluster.status}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="px-5 py-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => setAuditModalCluster(cluster)}
                            title="Audit History"
                            className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
                          >
                            <FiClock size={15} />
                          </button>
                          <button
                            onClick={() => handleOpenEditModal(cluster)}
                            title="Edit Cluster"
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          >
                            <FiEdit2 size={15} />
                          </button>
                          <button
                            onClick={() => setDeletePopup({ isOpen: true, cluster })}
                            title="Delete Cluster"
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          >
                            <FiTrash2 size={15} />
                          </button>
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

      {/* ── CREATE / EDIT CLUSTER MODAL ────────────────────────────────────── */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-3xl w-full shadow-2xl border border-slate-200 overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50/50">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-orange-100 text-orange-600 flex items-center justify-center font-bold">
                  <FiLayers size={18} />
                </div>
                <div>
                  <h3 className="font-black text-slate-900 text-base">
                    {editingCluster ? `Edit Cluster (${editingCluster.cluster_code})` : 'Create New Franchisee Cluster'}
                  </h3>
                  <p className="text-xs text-slate-500">Configure districts, assigned partners, and setup fees</p>
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100"
              >
                <FiX size={18} />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSubmitCluster} className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
              {/* Section 1: Basic Info */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Cluster Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Rajkot Cluster"
                    value={clusterName}
                    onChange={(e) => setClusterName(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    State <span className="text-red-500">*</span>
                  </label>
                  <select
                    required
                    disabled={Boolean(editingCluster)}
                    value={selectedState}
                    onChange={(e) => {
                      setSelectedState(e.target.value);
                      setSelectedDistricts([]);
                    }}
                    className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-orange-500 disabled:bg-slate-100"
                  >
                    <option value="">Select Indian State</option>
                    {states.map((st) => (
                      <option key={st._id || st.id} value={st._id || st.id}>
                        {st.name || st.state_name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Section 2: District Selection */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold text-slate-700 uppercase">
                    Select Districts for this Cluster <span className="text-red-500">*</span>
                  </label>
                  <span className="text-xs font-bold text-orange-600">
                    {selectedDistricts.length} Selected
                  </span>
                </div>

                {districtsLoading ? (
                  <div className="py-4 text-center text-xs text-slate-400 font-semibold">Loading districts...</div>
                ) : availableDistricts.length === 0 ? (
                  <div className="py-4 text-center text-xs text-slate-400 font-medium bg-slate-50 rounded-lg">
                    {selectedState ? 'No districts available for this state' : 'Please select a state first'}
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-48 overflow-y-auto p-2 bg-slate-50 rounded-xl border border-slate-200">
                    {availableDistricts.map((d) => {
                      const dId = String(d.id || d._id);
                      const isSelected = selectedDistricts.includes(dId);
                      const isConflict = !isSelected && d.is_in_cluster && !isSharedAllowed;

                      return (
                        <label
                          key={dId}
                          className={`flex items-center gap-2 p-2 rounded-lg border text-xs cursor-pointer select-none transition-all ${
                            isSelected
                              ? 'bg-orange-50 border-orange-300 font-extrabold text-orange-950'
                              : isConflict
                              ? 'opacity-50 bg-slate-100 border-slate-200 cursor-not-allowed text-slate-400'
                              : 'bg-white border-slate-200 hover:border-slate-300 text-slate-700'
                          }`}
                        >
                          <input
                            type="checkbox"
                            disabled={isConflict}
                            checked={isSelected}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedDistricts([...selectedDistricts, dId]);
                              } else {
                                setSelectedDistricts(selectedDistricts.filter((id) => id !== dId));
                              }
                            }}
                            className="rounded text-orange-600 focus:ring-orange-500"
                          />
                          <span className="truncate">{d.name}</span>
                          {d.is_allotted && <span className="ml-auto text-[9px] px-1 py-0.5 bg-blue-100 text-blue-700 rounded font-black">Allotted</span>}
                        </label>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Section 3: Franchisee & BDE Assignment */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Assign Franchisee Store
                  </label>
                  <select
                    value={assignedFranchisee}
                    onChange={(e) => {
                      setAssignedFranchisee(e.target.value);
                      if (e.target.value && clusterStatus === 'available') {
                        setClusterStatus('allotted');
                      }
                    }}
                    className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-orange-500"
                  >
                    <option value="">Open / Unassigned</option>
                    {resellers.map((r) => (
                      <option key={r._id || r.id} value={r._id || r.id}>
                        {r.business_name || r.name} {r.mobile ? `(${r.mobile})` : ''}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Assign Primary BDE
                  </label>
                  <select
                    value={primaryBde}
                    onChange={(e) => setPrimaryBde(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-orange-500"
                  >
                    <option value="">Unassigned</option>
                    {bdes.map((b) => (
                      <option key={b._id || b.id || b.bde_id} value={b._id || b.id || b.bde_id}>
                        {b.full_name || b.name} {b.bde_id || b.bde_code || b.employee_id ? `(${b.bde_id || b.bde_code || b.employee_id})` : ''}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Section 4: Cluster Status & Exclusivity */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Cluster Status
                  </label>
                  <select
                    value={clusterStatus}
                    onChange={(e) => setClusterStatus(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-orange-500"
                  >
                    <option value="available">Available (Open for Onboarding)</option>
                    <option value="reserved">Reserved (Application in Progress)</option>
                    <option value="allotted">Allotted (Active Franchisee)</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Agreement Duration
                  </label>
                  <select
                    value={agreementYears}
                    onChange={(e) => setAgreementYears(Number(e.target.value))}
                    className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-orange-500"
                  >
                    <option value={1}>1 Year</option>
                    <option value={2}>2 Years (Standard)</option>
                    <option value={3}>3 Years</option>
                    <option value={5}>5 Years</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Territory Rule
                  </label>
                  <label className="flex items-center gap-2 mt-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={isSharedAllowed}
                      onChange={(e) => setIsSharedAllowed(e.target.checked)}
                      className="rounded text-orange-600 focus:ring-orange-500"
                    />
                    <span className="text-xs font-bold text-slate-700">Allow Shared Territory</span>
                  </label>
                </div>
              </div>

              {/* Section 5: Setup Fee Configuration */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-black text-slate-800 uppercase flex items-center gap-1.5">
                    <FiDollarSign className="text-emerald-600" size={14} /> Cluster Setup Fee Configuration
                  </h4>
                  <span className="text-xs font-extrabold text-emerald-700">
                    Total Payable: ₹{calculatedTotalPayable.toLocaleString('en-IN')}
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div>
                    <label className="block font-bold text-slate-600 mb-1">Setup Fee (₹)</label>
                    <input
                      type="number"
                      value={setupFee}
                      onChange={(e) => setSetupFee(Number(e.target.value))}
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded font-bold text-slate-800 focus:ring-2 focus:ring-orange-500"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-600 mb-1">Renewal Fee (₹)</label>
                    <input
                      type="number"
                      value={renewalFee}
                      onChange={(e) => setRenewalFee(Number(e.target.value))}
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded font-bold text-slate-800 focus:ring-2 focus:ring-orange-500"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-600 mb-1">Security Deposit (₹)</label>
                    <input
                      type="number"
                      value={securityDeposit}
                      onChange={(e) => setSecurityDeposit(Number(e.target.value))}
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded font-bold text-slate-800 focus:ring-2 focus:ring-orange-500"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-600 mb-1">Fee Waiver/Discount (₹)</label>
                    <input
                      type="number"
                      value={waiverAmount}
                      onChange={(e) => setWaiverAmount(Number(e.target.value))}
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded font-bold text-slate-800 focus:ring-2 focus:ring-orange-500"
                    />
                  </div>
                </div>
              </div>

              {/* Audit Reason (Mandatory when editing active cluster) */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Change Reason / Audit Note {editingCluster?.assigned_franchisee_id && <span className="text-red-500">*</span>}
                </label>
                <input
                  type="text"
                  placeholder={
                    editingCluster?.assigned_franchisee_id
                      ? 'Mandatory: Reason for modifying this active cluster...'
                      : 'Optional audit note...'
                  }
                  value={auditReason}
                  onChange={(e) => setAuditReason(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>

              {/* Modal Footer */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
                <Button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-700 rounded-lg font-bold text-xs hover:bg-slate-50"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg font-bold text-xs shadow-sm"
                >
                  {submitting ? 'Saving...' : editingCluster ? 'Update Cluster' : 'Create Cluster'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── SETUP FEE DETAILS MODAL ────────────────────────────────────────── */}
      {feeModalCluster && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-extrabold text-slate-900 text-base">Setup Fee Breakdown</h3>
              <button onClick={() => setFeeModalCluster(null)} className="text-slate-400 hover:text-slate-700">
                <FiX size={18} />
              </button>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between py-1 border-b border-slate-50 text-slate-600">
                <span>Cluster Name</span>
                <span className="font-bold text-slate-900">{feeModalCluster.cluster_name}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-50 text-slate-600">
                <span>Franchisee Setup Fee</span>
                <span className="font-bold text-slate-900">₹{(feeModalCluster.setup_fee_config?.setup_fee || 0).toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-50 text-slate-600">
                <span>Agreement Duration</span>
                <span className="font-bold text-slate-900">{feeModalCluster.setup_fee_config?.agreement_duration_years || 2} Years</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-50 text-slate-600">
                <span>Renewal Fee</span>
                <span className="font-bold text-slate-900">₹{(feeModalCluster.setup_fee_config?.renewal_fee || 0).toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-50 text-slate-600">
                <span>Security Deposit</span>
                <span className="font-bold text-slate-900">₹{(feeModalCluster.setup_fee_config?.security_deposit || 0).toLocaleString('en-IN')}</span>
              </div>
              {feeModalCluster.setup_fee_config?.waiver_discount?.amount > 0 && (
                <div className="flex justify-between py-1 border-b border-slate-50 text-emerald-600 font-bold">
                  <span>Approved Waiver</span>
                  <span>-₹{feeModalCluster.setup_fee_config.waiver_discount.amount.toLocaleString('en-IN')}</span>
                </div>
              )}
              <div className="flex justify-between pt-2 text-base font-black text-slate-900">
                <span>Total Payable</span>
                <span className="text-orange-600">₹{(feeModalCluster.setup_fee_config?.total_payable || 0).toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between pt-1 text-xs font-semibold text-slate-500">
                <span>Payment Status</span>
                <span className="uppercase font-bold text-slate-800">{feeModalCluster.payment_status || 'Pending'}</span>
              </div>
            </div>
            <div className="pt-2">
              <Button
                onClick={() => setFeeModalCluster(null)}
                className="w-full py-2 bg-slate-900 text-white rounded-xl font-bold text-xs"
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ── AUDIT HISTORY MODAL ────────────────────────────────────────────── */}
      {auditModalCluster && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="font-extrabold text-slate-900 text-base">Cluster Audit History</h3>
                <p className="text-xs text-slate-500">{auditModalCluster.cluster_name} ({auditModalCluster.cluster_code})</p>
              </div>
              <button onClick={() => setAuditModalCluster(null)} className="text-slate-400 hover:text-slate-700">
                <FiX size={18} />
              </button>
            </div>

            <div className="space-y-3 max-h-72 overflow-y-auto text-xs">
              {(auditModalCluster.audit_history || []).length === 0 ? (
                <div className="text-slate-400 text-center py-6">No historical records logged.</div>
              ) : (
                auditModalCluster.audit_history.map((log, idx) => (
                  <div key={idx} className="p-3 rounded-xl bg-slate-50 border border-slate-200/60 space-y-1">
                    <div className="flex items-center justify-between font-bold text-slate-800">
                      <span className="uppercase text-[11px] px-1.5 py-0.5 rounded bg-orange-100 text-orange-700">
                        {log.action}
                      </span>
                      <span className="text-[10px] text-slate-400 font-medium">
                        {new Date(log.timestamp).toLocaleString()}
                      </span>
                    </div>
                    <div className="text-slate-600 font-medium">
                      By: <span className="font-bold text-slate-800">{log.user_name || 'Admin'}</span>
                    </div>
                    {log.reason && (
                      <div className="text-slate-500 italic">
                        Reason: {log.reason}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>

            <Button
              onClick={() => setAuditModalCluster(null)}
              className="w-full py-2 bg-slate-900 text-white rounded-xl font-bold text-xs"
            >
              Close
            </Button>
          </div>
        </div>
      )}

      {/* ── DELETE CONFIRMATION POPUP ──────────────────────────────────────── */}
      <ConfirmationPopup
        isOpen={deletePopup.isOpen}
        title="Delete Cluster"
        message={`Are you sure you want to delete "${deletePopup.cluster?.cluster_name}"? This action cannot be undone.`}
        onConfirm={handleDeleteCluster}
        onCancel={() => setDeletePopup({ isOpen: false, cluster: null })}
        confirmButtonText="Delete"
        variant="danger"
      />
    </div>
  );
}
