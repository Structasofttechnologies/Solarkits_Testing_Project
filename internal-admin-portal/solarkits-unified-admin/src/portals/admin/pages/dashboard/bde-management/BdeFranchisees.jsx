import React, { useState, useEffect, useCallback } from 'react';
import { 
  Store, 
  Search, 
  Filter, 
  RotateCw, 
  UserPlus, 
  CheckCircle2, 
  Clock, 
  Zap, 
  ChevronLeft, 
  ChevronRight,
  X,
  MapPin,
  Users
} from 'lucide-react';
import { bdeApi } from '../../../api/bdeApi';

export default function BdeFranchisees({ moduleUniqueId = 'ADM_BDE_MGMT' }) {
  const [franchisees, setFranchisees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, pages: 1 });
  const [bdes, setBdes] = useState([]);

  // Filter States
  const [search, setSearch] = useState('');
  const [selectedBde, setSelectedBde] = useState('');
  const [selectedState, setSelectedState] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');

  // Reassign Modal
  const [reassignModalPartner, setReassignModalPartner] = useState(null);
  const [newBdeId, setNewBdeId] = useState('');
  const [reassignReason, setReassignReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchBdes = async () => {
    try {
      const res = await bdeApi.listBdes({ limit: 100 }, moduleUniqueId);
      if (res?.status === 'success') {
        setBdes(res.data?.bdes || res.data || []);
      }
    } catch (err) {
      console.error('Failed to load BDEs', err);
    }
  };

  const fetchFranchisees = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const params = { page, limit: 10 };
      if (search.trim()) params.search = search.trim();
      if (selectedBde) params.bde_id = selectedBde;
      if (selectedState) params.state_name = selectedState;
      if (selectedStatus) params.activation_status = selectedStatus;

      const res = await bdeApi.listAttributedFranchisees(params, moduleUniqueId);
      if (res?.status === 'success') {
        setFranchisees(res.data || []);
        if (res.pagination) {
          setPagination(res.pagination);
        }
      }
    } catch (err) {
      console.error('Failed to list attributed franchisees', err);
    } finally {
      setLoading(false);
    }
  }, [search, selectedBde, selectedState, selectedStatus, moduleUniqueId]);

  useEffect(() => {
    fetchBdes();
  }, []);

  useEffect(() => {
    fetchFranchisees(1);
  }, [fetchFranchisees]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchFranchisees(1);
  };

  const handleReset = () => {
    setSearch('');
    setSelectedBde('');
    setSelectedState('');
    setSelectedStatus('');
  };

  const handleReassignSubmit = async (e) => {
    e.preventDefault();
    if (!newBdeId || !reassignReason.trim()) {
      alert('Please select target BDE and provide mandatory reassignment reason.');
      return;
    }
    setSubmitting(true);
    try {
      const res = await bdeApi.reassignFranchisee(reassignModalPartner._id, {
        new_bde_id: newBdeId,
        reason: reassignReason,
      }, moduleUniqueId);

      if (res?.status === 'success') {
        alert(res.message || 'Franchisee partner reassigned successfully.');
        setReassignModalPartner(null);
        setNewBdeId('');
        setReassignReason('');
        fetchFranchisees(pagination.page);
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to reassign franchisee');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
          <Store className="w-5 h-5 text-amber-600" />
          BDE Attributed Franchisee Network
        </h2>
        <p className="text-xs text-slate-500 mt-0.5">
          Permanent field sales attribution, origin vs current account managers, and live partner status
        </p>
      </div>

      {/* Filter Bar */}
      <div className="p-5 bg-white border border-slate-200 rounded-3xl space-y-4 shadow-sm">
        <form onSubmit={handleSearchSubmit} className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by Partner Code (RES-...), Business Name, Contact Person, Mobile, or GST..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-amber-500"
            />
          </div>

          <div className="flex items-center gap-2">
            <button
              type="submit"
              className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded-xl text-xs transition-all shadow-sm"
            >
              Search
            </button>
            <button
              type="button"
              onClick={handleReset}
              className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl text-xs transition-all"
            >
              Reset
            </button>
          </div>
        </form>

        <div className="flex flex-wrap items-center gap-3 pt-3 border-t border-slate-100 text-xs">
          <div className="flex items-center gap-1.5 text-slate-400 font-semibold">
            <Filter className="w-3.5 h-3.5" />
            Filters:
          </div>

          <select
            value={selectedBde}
            onChange={(e) => setSelectedBde(e.target.value)}
            className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 focus:outline-none focus:border-amber-500"
          >
            <option value="">All BDE Officers</option>
            {bdes.map((b) => (
              <option key={b._id || b.id} value={b._id || b.id}>
                {b.full_name} ({b.bde_id})
              </option>
            ))}
          </select>

          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 focus:outline-none focus:border-amber-500"
          >
            <option value="">All Partner States</option>
            <option value="active">Active & Verified</option>
            <option value="pending">Pending Onboarding</option>
          </select>
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-100 text-slate-400 uppercase font-semibold bg-slate-50/80">
                <th className="py-3.5 px-4">Partner Code & Business</th>
                <th className="py-3.5 px-4">Territory</th>
                <th className="py-3.5 px-4">Assigned BDE</th>
                <th className="py-3.5 px-4">Original BDE</th>
                <th className="py-3.5 px-4">Onboarding Milestones</th>
                <th className="py-3.5 px-4">Lifecycle Status</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <RotateCw className="w-6 h-6 text-amber-500 animate-spin mx-auto mb-2" />
                    Loading franchisee partners...
                  </td>
                </tr>
              ) : franchisees.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    No franchisee partners attributed to BDEs yet.
                  </td>
                </tr>
              ) : (
                franchisees.map((f) => {
                  const isReassigned = f.original_bde_id && f.bde_id && f.original_bde_id._id !== f.bde_id._id;

                  return (
                    <tr key={f._id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-900">{f.business_name}</div>
                        <div className="text-xs text-amber-600 font-mono font-bold mt-0.5">{f.reseller_code}</div>
                        <div className="text-[11px] text-slate-500">{f.contact_person} &bull; {f.mobile}</div>
                      </td>

                      <td className="py-3.5 px-4 text-slate-600">
                        <div className="font-semibold text-slate-800">{f.address?.district_name || 'Regional'}</div>
                        <div className="text-slate-400 text-[11px]">{f.address?.state_name || 'State'}</div>
                      </td>

                      <td className="py-3.5 px-4 text-slate-600">
                        <div className="font-semibold text-slate-800">{f.bde_id?.full_name || 'Unassigned'}</div>
                        <div className="text-[11px] text-slate-400 font-mono">{f.bde_id?.bde_id}</div>
                      </td>

                      <td className="py-3.5 px-4 text-slate-500">
                        <div className="font-semibold text-slate-700">{f.original_bde_id?.full_name || f.bde_id?.full_name || 'Direct / HO'}</div>
                        {isReassigned && (
                          <span className="text-[10px] text-purple-700 bg-purple-50 px-1.5 py-0.5 rounded border border-purple-200 inline-block mt-0.5">
                            Reassigned Partner
                          </span>
                        )}
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-1.5">
                            <span className={`w-2 h-2 rounded-full ${f.agreement_status === 'signed' ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                            <span className="text-slate-700 text-[11px]">Agreement: {f.agreement_status || 'pending'}</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span className={`w-2 h-2 rounded-full ${f.fee_payment_status === 'verified' ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                            <span className="text-slate-700 text-[11px]">Fee: {f.fee_payment_status || 'unpaid'}</span>
                          </div>
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <span className={`px-2.5 py-0.5 text-[11px] font-semibold rounded-full border ${
                          f.is_operational
                            ? 'bg-emerald-100 text-emerald-800 border-emerald-300 font-bold'
                            : f.activation_status === 'active'
                            ? 'bg-teal-50 text-teal-700 border-teal-200'
                            : 'bg-amber-50 text-amber-700 border-amber-200'
                        }`}>
                          {f.is_operational ? 'OPERATIONS LIVE' : f.activation_status.toUpperCase()}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <button
                          onClick={() => {
                            setReassignModalPartner(f);
                            setNewBdeId('');
                            setReassignReason('');
                          }}
                          className="px-2.5 py-1.5 bg-purple-50 hover:bg-purple-100 text-purple-700 rounded-xl text-xs font-semibold border border-purple-200 transition-all inline-flex items-center gap-1"
                        >
                          <UserPlus className="w-3 h-3" />
                          Reassign BDE
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {pagination.pages > 1 && (
          <div className="flex items-center justify-between p-4 bg-slate-50/80 border-t border-slate-100 text-xs text-slate-500">
            <div>
              Showing Page <span className="text-slate-900 font-bold">{pagination.page}</span> of{' '}
              <span className="text-slate-900 font-bold">{pagination.pages}</span> ({pagination.total} partners)
            </div>
            <div className="flex items-center gap-1.5">
              <button
                disabled={pagination.page <= 1}
                onClick={() => fetchFranchisees(pagination.page - 1)}
                className="p-1.5 rounded-lg bg-white border border-slate-200 text-slate-600 disabled:opacity-40 hover:bg-slate-50"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                disabled={pagination.page >= pagination.pages}
                onClick={() => fetchFranchisees(pagination.page + 1)}
                className="p-1.5 rounded-lg bg-white border border-slate-200 text-slate-600 disabled:opacity-40 hover:bg-slate-50"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Reassign Franchisee Modal */}
      {reassignModalPartner && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-md p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900">Reassign Franchisee Partner Account</h3>
              <button onClick={() => setReassignModalPartner(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3 bg-slate-50 rounded-2xl text-xs text-slate-700 space-y-1">
              <div><strong>Partner:</strong> {reassignModalPartner.business_name} ({reassignModalPartner.reseller_code})</div>
              <div><strong>Current BDE:</strong> {reassignModalPartner.bde_id?.full_name}</div>
              <div><strong>Original BDE:</strong> {reassignModalPartner.original_bde_id?.full_name || reassignModalPartner.bde_id?.full_name} (Preserved)</div>
            </div>

            <form onSubmit={handleReassignSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1.5">Select New Managing BDE</label>
                <select
                  required
                  value={newBdeId}
                  onChange={(e) => setNewBdeId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:border-amber-500"
                >
                  <option value="">Select BDE...</option>
                  {bdes
                    .filter((b) => b._id !== reassignModalPartner.bde_id?._id)
                    .map((b) => (
                      <option key={b._id || b.id} value={b._id || b.id}>
                        {b.full_name} ({b.bde_id} &bull; {b.state || 'General'})
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1.5">Reassignment Reason (Mandatory Audit)</label>
                <textarea
                  required
                  rows={3}
                  value={reassignReason}
                  onChange={(e) => setReassignReason(e.target.value)}
                  placeholder="e.g. Account manager transfer, regional coverage handover..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setReassignModalPartner(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold rounded-xl shadow-sm"
                >
                  {submitting ? 'Reassigning...' : 'Confirm Reassignment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
