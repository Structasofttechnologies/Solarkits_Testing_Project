import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FaUserPlus,
  FaSearch,
  FaFilter,
  FaEye,
  FaEdit,
  FaMapMarkedAlt,
  FaBullseye,
  FaShieldAlt,
  FaKey,
  FaCheckCircle,
  FaTimesCircle,
  FaBan,
  FaEllipsisV,
  FaUserTie,
  FaPlus,
} from 'react-icons/fa';
import { bdeApi } from '../../../api/bdeApi';
import Loader from '../../../components/Loader';
import KycReviewModal from './KycReviewModal';
import TerritoryModal from './TerritoryModal';
import GoalModal from './GoalModal';
import ResetLoginModal from './ResetLoginModal';

export default function AllBdes({ moduleUniqueId = 'ADM_BDE_MGMT' }) {
  const navigate = useNavigate();

  const [bdes, setBdes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [states, setStates] = useState([]);
  const [districts, setDistricts] = useState([]);

  // Filters & Search
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [kycFilter, setKycFilter] = useState('');
  const [stateFilter, setStateFilter] = useState('');
  const [districtFilter, setDistrictFilter] = useState('');
  const [startDateFilter, setStartDateFilter] = useState('');
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, pages: 1 });

  // Modals
  const [selectedBde, setSelectedBde] = useState(null);
  const [kycModalOpen, setKycModalOpen] = useState(false);
  const [territoryModalOpen, setTerritoryModalOpen] = useState(false);
  const [goalModalOpen, setGoalModalOpen] = useState(false);
  const [resetLoginModalOpen, setResetLoginModalOpen] = useState(false);
  const [actionMenuOpenId, setActionMenuOpenId] = useState(null);

  useEffect(() => {
    fetchStates();
    fetchBdes(1);
  }, []);

  useEffect(() => {
    fetchBdes(1);
  }, [statusFilter, kycFilter, stateFilter, districtFilter, startDateFilter]);

  const fetchStates = async () => {
    try {
      const res = await bdeApi.getStates();
      setStates(res.states || res.data || []);
    } catch (err) {
      console.error('Failed to fetch states', err);
    }
  };

  const fetchDistricts = async (stateId) => {
    try {
      const res = await bdeApi.getDistricts(stateId);
      setDistricts(res.districts || res.data || []);
    } catch (err) {
      console.error('Failed to fetch districts', err);
    }
  };

  const handleStateFilterChange = (e) => {
    const sId = e.target.value;
    setStateFilter(sId);
    setDistrictFilter('');
    if (sId) {
      fetchDistricts(sId);
    } else {
      setDistricts([]);
    }
  };

  const fetchBdes = async (page = 1, isSilent = false) => {
    try {
      if (!isSilent) setLoading(true);
      const params = {
        page,
        limit: pagination.limit,
        search: search.trim() || undefined,
        status: statusFilter || undefined,
        kyc_status: kycFilter || undefined,
        state_id: stateFilter || undefined,
        district_id: districtFilter || undefined,
        start_date: startDateFilter || undefined,
      };

      const res = await bdeApi.listBdes(params, moduleUniqueId);
      setBdes(res.data || []);
      if (res.pagination) {
        setPagination(res.pagination);
      }
    } catch (err) {
      console.error('Failed to load BDEs', err);
    } finally {
      if (!isSilent) setLoading(false);
    }
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchBdes(1);
  };

  const resetFilters = () => {
    setSearch('');
    setStatusFilter('');
    setKycFilter('');
    setStateFilter('');
    setDistrictFilter('');
    setStartDateFilter('');
    setDistricts([]);
  };

  const handleStatusChange = async (bde, newStatus) => {
    if (!window.confirm(`Are you sure you want to change status to "${newStatus}" for BDE ${bde.full_name}?`)) {
      return;
    }
    try {
      await bdeApi.changeStatus(bde._id || bde.id, {
        status: newStatus,
        reason: `Status changed to ${newStatus} by Admin`,
      });
      await fetchBdes(pagination.page, true);
      setActionMenuOpenId(null);
    } catch (err) {
      alert(err.response?.data?.message || err.message || 'Failed to update status');
    }
  };

  const handleKycReviewSuccess = async (data) => {
    if (!selectedBde) return;
    try {
      await bdeApi.reviewKyc(selectedBde._id || selectedBde.id, {
        action: data.action,
        remarks: data.remarks,
        rejection_reason: data.rejection_reason,
      }, moduleUniqueId);
      await fetchBdes(pagination.page, true);
    } catch (err) {
      alert(err.response?.data?.message || err.message || 'Failed to update KYC');
    }
  };

  return (
    <div className="space-y-6 text-slate-900 font-sans">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">All Business Development Executives</h1>
          <p className="text-sm text-slate-500 font-medium mt-0.5">
            Manage, verify KYC, assign territories and track BDE field representatives.
          </p>
        </div>
        <button
          onClick={() => navigate('/admin-panel/bde-management/create')}
          className="px-5 py-2.5 bg-[#0575B8] hover:bg-[#045D93] text-white font-bold rounded-xl text-xs transition flex items-center gap-2 self-start sm:self-auto shadow-md shadow-blue-500/20 cursor-pointer"
        >
          <FaPlus /> Add New BDE
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-5 bg-white rounded-3xl border border-slate-200 shadow-sm space-y-4">
        <form onSubmit={handleSearchSubmit} className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <FaSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-sm" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by BDE Name, Email, Mobile or BDE ID..."
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 text-sm font-semibold focus:outline-none focus:border-[#0575B8] focus:bg-white placeholder-slate-400"
            />
          </div>
          <button
            type="submit"
            className="px-5 py-2.5 bg-[#0575B8] hover:bg-[#045D93] text-white font-bold rounded-xl text-xs transition shadow-sm cursor-pointer"
          >
            Search
          </button>
          <button
            type="button"
            onClick={resetFilters}
            className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 font-bold rounded-xl text-xs transition cursor-pointer"
          >
            Reset
          </button>
        </form>

        {/* Detailed Filter Dropdowns */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 pt-2 border-t border-slate-100">
          <div>
            <label className="text-[10px] font-bold text-slate-500 uppercase">State</label>
            <select
              value={stateFilter}
              onChange={handleStateFilterChange}
              className="w-full mt-1 px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 text-xs font-semibold focus:outline-none focus:border-[#0575B8] focus:bg-white"
            >
              <option value="">All States</option>
              {states.map(s => (
                <option key={s._id || s.id} value={s._id || s.id}>{s.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-[10px] font-bold text-slate-500 uppercase">District</label>
            <select
              value={districtFilter}
              onChange={(e) => setDistrictFilter(e.target.value)}
              disabled={!stateFilter || districts.length === 0}
              className="w-full mt-1 px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 text-xs font-semibold focus:outline-none focus:border-[#0575B8] focus:bg-white disabled:opacity-50"
            >
              <option value="">All Districts</option>
              {districts.map(d => (
                <option key={d._id || d.id} value={d._id || d.id}>{d.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-[10px] font-bold text-slate-500 uppercase">Account Status</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full mt-1 px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 text-xs font-semibold focus:outline-none focus:border-[#0575B8] focus:bg-white"
            >
              <option value="">All Statuses</option>
              <option value="active">Active</option>
              <option value="kyc_pending">KYC Pending</option>
              <option value="inactive">Inactive</option>
              <option value="suspended">Suspended</option>
            </select>
          </div>

          <div>
            <label className="text-[10px] font-bold text-slate-500 uppercase">KYC Status</label>
            <select
              value={kycFilter}
              onChange={(e) => setKycFilter(e.target.value)}
              className="w-full mt-1 px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 text-xs font-semibold focus:outline-none focus:border-[#0575B8] focus:bg-white"
            >
              <option value="">All KYC States</option>
              <option value="verified">Verified</option>
              <option value="pending">Pending</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>

          <div>
            <label className="text-[10px] font-bold text-slate-500 uppercase">Joining Date From</label>
            <input
              type="date"
              value={startDateFilter}
              onChange={(e) => setStartDateFilter(e.target.value)}
              className="w-full mt-1 px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 text-xs font-semibold focus:outline-none focus:border-[#0575B8] focus:bg-white"
            />
          </div>
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="py-20"><Loader text="Loading BDE list..." /></div>
        ) : bdes.length === 0 ? (
          <div className="py-16 text-center text-slate-500 space-y-3">
            <FaUserTie className="text-4xl text-slate-300 mx-auto" />
            <p className="text-base font-bold text-slate-900">No BDE records found</p>
            <p className="text-xs text-slate-500">Try adjusting your filters or create a new BDE executive.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead className="bg-slate-50 text-slate-600 text-xs uppercase font-bold border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3.5">BDE ID</th>
                  <th className="px-4 py-3.5">Name & Email</th>
                  <th className="px-4 py-3.5">Mobile</th>
                  <th className="px-4 py-3.5">State & Districts</th>
                  {/* <th className="px-4 py-3.5">Assigned Plans</th> */}
                  <th className="px-4 py-3.5">KYC Status</th>
                  <th className="px-4 py-3.5">Account Status</th>
                  <th className="px-4 py-3.5">Joining Date</th>
                  <th className="px-4 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {bdes.map((bde) => (
                  <tr key={bde.id || bde._id} className="hover:bg-slate-50/70 transition">
                    {/* BDE ID */}
                    <td className="px-4 py-3.5 font-mono font-bold text-[#0575B8] whitespace-nowrap">
                      {bde.bde_id}
                    </td>

                    {/* Name & Email */}
                    <td className="px-4 py-3.5">
                      <div className="font-bold text-slate-900">{bde.full_name}</div>
                      <div className="text-xs text-slate-500 font-medium truncate max-w-[200px]">{bde.email}</div>
                    </td>

                    {/* Mobile */}
                    <td className="px-4 py-3.5 font-mono text-xs font-semibold text-slate-800 whitespace-nowrap">
                      {bde.mobile_number}
                    </td>

                    {/* State & Districts */}
                    <td className="px-4 py-3.5">
                      <div className="font-bold text-slate-900 text-xs">{bde.state_name || 'Unassigned'}</div>
                      <div className="text-[11px] text-slate-500 font-medium flex items-center gap-1.5 mt-0.5">
                        {bde.assigned_states && bde.assigned_states.length > 1 && (
                          <span className="px-1.5 py-0.5 rounded-md bg-indigo-50 text-indigo-700 font-bold text-[10px] border border-indigo-200">
                            {bde.assigned_states.length} States
                          </span>
                        )}
                        {bde.assigned_districts_count > 0 ? (
                          <span className="text-[#0575B8] font-bold">
                            {bde.assigned_districts_count} District(s)
                          </span>
                        ) : (
                          'No districts'
                        )}
                      </div>
                    </td>

                    {/* Assigned Plans
                    <td className="px-4 py-3.5 text-xs">
                      {bde.assigned_plans_count > 0 ? (
                        <span className="px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 font-bold border border-indigo-200 text-[11px]">
                          {bde.assigned_plans_count} Plan(s)
                        </span>
                      ) : (
                        <span className="text-slate-400 text-xs">None</span>
                      )}
                    </td> */}

                    {/* KYC Status */}
                    <td className="px-4 py-3.5 whitespace-nowrap">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-bold uppercase ${bde.kyc_status === 'verified'
                        ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                        : bde.kyc_status === 'rejected'
                          ? 'bg-rose-100 text-rose-800 border border-rose-300'
                          : 'bg-amber-100 text-amber-900 border border-amber-300'
                        }`}>
                        {bde.kyc_status || 'Pending'}
                      </span>
                    </td>

                    {/* Account Status */}
                    <td className="px-4 py-3.5 whitespace-nowrap">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${bde.status === 'active'
                        ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                        : bde.status === 'suspended'
                          ? 'bg-rose-100 text-rose-800 border border-rose-300'
                          : bde.status === 'inactive'
                            ? 'bg-slate-100 text-slate-700 border border-slate-300'
                            : bde.status === 'kyc_verified'
                              ? 'bg-blue-100 text-blue-800 border border-blue-300'
                              : 'bg-amber-100 text-amber-900 border border-amber-300'
                        }`}>
                        {bde.status === 'active'
                          ? 'Active'
                          : bde.status === 'suspended'
                            ? 'Suspended'
                            : bde.status === 'inactive'
                              ? 'Inactive'
                              : bde.status === 'kyc_verified'
                                ? 'Ready to Activate'
                                : 'Pending Activation'}
                      </span>
                    </td>

                    {/* Joining Date */}
                    <td className="px-4 py-3.5 text-xs text-slate-500 font-medium whitespace-nowrap">
                      {bde.joining_date ? new Date(bde.joining_date).toLocaleDateString() : 'N/A'}
                    </td>

                    {/* Actions Dropdown */}
                    <td className="px-4 py-3.5 text-right relative">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => navigate(`/admin-panel/bde-management/profile/${bde.id || bde._id}`)}
                          className="p-2 text-slate-500 hover:text-[#0575B8] hover:bg-blue-50 rounded-xl transition cursor-pointer"
                          title="View Profile"
                        >
                          <FaEye size={14} />
                        </button>
                        <button
                          onClick={() => {
                            setSelectedBde(bde);
                            setKycModalOpen(true);
                          }}
                          className="p-2 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-xl transition cursor-pointer"
                          title="Verify / Review KYC"
                        >
                          <FaShieldAlt size={14} />
                        </button>
                        <button
                          onClick={() => {
                            setSelectedBde(bde);
                            setTerritoryModalOpen(true);
                          }}
                          className="p-2 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition cursor-pointer"
                          title="Assign Territory"
                        >
                          <FaMapMarkedAlt size={14} />
                        </button>
                        <button
                          onClick={() => {
                            setSelectedBde(bde);
                            setGoalModalOpen(true);
                          }}
                          className="p-2 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition cursor-pointer"
                          title="Assign Goals"
                        >
                          <FaBullseye size={14} />
                        </button>

                        <div className="relative">
                          <button
                            onClick={() => setActionMenuOpenId(actionMenuOpenId === (bde.id || bde._id) ? null : (bde.id || bde._id))}
                            className="p-2 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition cursor-pointer"
                          >
                            <FaEllipsisV size={14} />
                          </button>

                          {actionMenuOpenId === (bde.id || bde._id) && (
                            <div className="absolute right-0 mt-1 w-48 bg-white border border-slate-200 rounded-2xl shadow-xl z-20 py-2 text-xs text-left animate-fadeIn">
                              <button
                                onClick={() => navigate(`/admin-panel/bde-management/edit/${bde.id || bde._id}`)}
                                className="w-full px-3.5 py-2 hover:bg-slate-50 flex items-center gap-2 text-slate-700 font-bold cursor-pointer"
                              >
                                <FaEdit className="text-slate-400" /> Edit Details
                              </button>
                              <button
                                onClick={() => {
                                  setSelectedBde(bde);
                                  setResetLoginModalOpen(true);
                                  setActionMenuOpenId(null);
                                }}
                                className="w-full px-3.5 py-2 hover:bg-slate-50 flex items-center gap-2 text-slate-700 font-bold cursor-pointer"
                              >
                                <FaKey className="text-amber-500" /> Set / Reset PIN
                              </button>
                              <div className="border-t border-slate-100 my-1" />
                              {bde.status === 'active' ? (
                                <button
                                  onClick={() => handleStatusChange(bde, 'suspended')}
                                  className="w-full px-3.5 py-2 hover:bg-rose-50 text-rose-600 flex items-center gap-2 font-bold cursor-pointer"
                                >
                                  <FaBan /> Suspend BDE
                                </button>
                              ) : (
                                <button
                                  onClick={() => handleStatusChange(bde, 'active')}
                                  className="w-full px-3.5 py-2 hover:bg-emerald-50 text-emerald-600 flex items-center gap-2 font-bold cursor-pointer"
                                >
                                  <FaCheckCircle /> Activate BDE
                                </button>
                              )}
                              {bde.status !== 'inactive' && (
                                <button
                                  onClick={() => handleStatusChange(bde, 'inactive')}
                                  className="w-full px-3.5 py-2 hover:bg-slate-100 text-slate-600 flex items-center gap-2 font-bold cursor-pointer"
                                >
                                  <FaBan /> Deactivate BDE
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Bar */}
        {pagination.pages > 1 && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100 bg-slate-50/50 text-xs">
            <span className="text-slate-500 font-medium">
              Showing {((pagination.page - 1) * pagination.limit) + 1} to {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} BDEs
            </span>
            <div className="flex items-center gap-2">
              <button
                disabled={pagination.page <= 1}
                onClick={() => fetchBdes(pagination.page - 1)}
                className="px-3.5 py-1.5 rounded-xl border border-slate-200 bg-white text-slate-700 font-bold disabled:opacity-40 hover:bg-slate-50 transition cursor-pointer"
              >
                Previous
              </button>
              <span className="px-3.5 py-1.5 font-bold text-slate-900 bg-white border border-slate-200 rounded-xl">
                {pagination.page} / {pagination.pages}
              </span>
              <button
                disabled={pagination.page >= pagination.pages}
                onClick={() => fetchBdes(pagination.page + 1)}
                className="px-3.5 py-1.5 rounded-xl border border-slate-200 bg-white text-slate-700 font-bold disabled:opacity-40 hover:bg-slate-50 transition cursor-pointer"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      <KycReviewModal
        isOpen={kycModalOpen}
        onClose={() => setKycModalOpen(false)}
        bde={selectedBde}
        onReviewSuccess={handleKycReviewSuccess}
      />

      <TerritoryModal
        isOpen={territoryModalOpen}
        onClose={() => setTerritoryModalOpen(false)}
        bde={selectedBde}
        onSuccess={() => fetchBdes(pagination.page)}
      />

      <GoalModal
        isOpen={goalModalOpen}
        onClose={() => setGoalModalOpen(false)}
        bde={selectedBde}
        onSuccess={() => fetchBdes(pagination.page)}
      />

      <ResetLoginModal
        isOpen={resetLoginModalOpen}
        onClose={() => setResetLoginModalOpen(false)}
        bde={selectedBde}
        onSuccess={() => fetchBdes(pagination.page)}
      />
    </div>
  );
}
