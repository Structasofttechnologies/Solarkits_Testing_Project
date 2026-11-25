import React, { useState, useEffect, useCallback } from 'react';
import { 
  Users, 
  Search, 
  Filter, 
  RotateCw, 
  Eye, 
  UserCheck, 
  Calendar, 
  Clock, 
  ArrowRight,
  ChevronLeft, 
  ChevronRight,
  AlertTriangle,
  X,
  FileText,
  UserPlus
} from 'lucide-react';
import { bdeApi } from '../../../api/bdeApi';

export default function BdeLeads({ moduleUniqueId = 'ADM_BDE_MGMT' }) {
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, pages: 1 });
  const [bdes, setBdes] = useState([]);

  // Filter States
  const [search, setSearch] = useState('');
  const [selectedBde, setSelectedBde] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [selectedState, setSelectedState] = useState('');

  // Modals & Drawers
  const [detailLead, setDetailLead] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [reassignModalLead, setReassignModalLead] = useState(null);
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

  const fetchLeads = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const params = { page, limit: 10 };
      if (search.trim()) params.search = search.trim();
      if (selectedBde) params.bde_id = selectedBde;
      if (selectedStatus) params.lead_status = selectedStatus;
      if (selectedState) params.state_name = selectedState;

      const res = await bdeApi.listLeads(params, moduleUniqueId);
      if (res?.status === 'success') {
        setLeads(res.data || []);
        if (res.pagination) {
          setPagination(res.pagination);
        }
      }
    } catch (err) {
      console.error('Failed to list BDE leads', err);
    } finally {
      setLoading(false);
    }
  }, [search, selectedBde, selectedStatus, selectedState, moduleUniqueId]);

  useEffect(() => {
    fetchBdes();
  }, []);

  useEffect(() => {
    fetchLeads(1);
  }, [fetchLeads]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchLeads(1);
  };

  const handleReset = () => {
    setSearch('');
    setSelectedBde('');
    setSelectedStatus('');
    setSelectedState('');
  };

  const handleViewDetail = async (leadId) => {
    setDetailLoading(true);
    try {
      const res = await bdeApi.getLeadDetail(leadId, moduleUniqueId);
      if (res?.status === 'success') {
        setDetailLead(res.data);
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to load lead details');
    } finally {
      setDetailLoading(false);
    }
  };

  const handleReassignSubmit = async (e) => {
    e.preventDefault();
    if (!newBdeId || !reassignReason.trim()) {
      alert('Please select a target BDE and provide a mandatory reassignment reason.');
      return;
    }
    setSubmitting(true);
    try {
      const res = await bdeApi.reassignLead(reassignModalLead._id, {
        new_bde_id: newBdeId,
        reason: reassignReason,
      }, moduleUniqueId);

      if (res?.status === 'success') {
        alert(res.message || 'Lead successfully reassigned.');
        setReassignModalLead(null);
        setNewBdeId('');
        setReassignReason('');
        fetchLeads(pagination.page);
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to reassign lead');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Users className="w-5 h-5 text-amber-600" />
            BDE Generated Franchisee Leads
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Prospecting pipeline, territory assignments, follow-ups, and onboarding attribution
          </p>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="p-5 bg-white border border-slate-200 rounded-3xl space-y-4 shadow-sm">
        <form onSubmit={handleSearchSubmit} className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by Lead ID (LD-...), Prospect Name, Company, Mobile, or GST..."
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
            <option value="">All Pipeline Stages</option>
            <option value="new_lead">New Lead</option>
            <option value="contacted">Contacted</option>
            <option value="follow_up_scheduled">Follow-up Scheduled</option>
            <option value="interested">Interested</option>
            <option value="signup_started">Signup Started</option>
            <option value="gst_verification_pending">GST Verification Pending</option>
            <option value="admin_review_pending">Admin Review Pending</option>
            <option value="approved">Approved</option>
            <option value="agreement_signed">Agreement Signed</option>
            <option value="fee_paid">Fee Paid (Converted)</option>
            <option value="rejected">Rejected</option>
            <option value="lost">Lost</option>
          </select>
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-100 text-slate-400 uppercase font-semibold bg-slate-50/80">
                <th className="py-3.5 px-4">Lead ID & Prospect</th>
                <th className="py-3.5 px-4">Location</th>
                <th className="py-3.5 px-4">Assigned BDE</th>
                <th className="py-3.5 px-4">Interested Plan</th>
                <th className="py-3.5 px-4">Follow-up Date</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <RotateCw className="w-6 h-6 text-amber-500 animate-spin mx-auto mb-2" />
                    Loading BDE leads...
                  </td>
                </tr>
              ) : leads.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    No leads found matching criteria.
                  </td>
                </tr>
              ) : (
                leads.map((lead) => {
                  const isReassigned = lead.original_bde_id && lead.current_bde_id && lead.original_bde_id._id !== lead.current_bde_id._id;

                  return (
                    <tr key={lead._id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-900">{lead.company_name}</div>
                        <div className="text-xs text-amber-600 font-mono font-bold mt-0.5">{lead.lead_id}</div>
                        <div className="text-[11px] text-slate-500">{lead.prospect_name} &bull; {lead.mobile_number}</div>
                      </td>

                      <td className="py-3.5 px-4 text-slate-600">
                        <div className="font-semibold text-slate-800">{lead.district_name}</div>
                        <div className="text-slate-400 text-[11px]">{lead.state_name}</div>
                      </td>

                      <td className="py-3.5 px-4 text-slate-600">
                        <div className="font-semibold text-slate-800">{lead.current_bde_id?.full_name || 'Unassigned'}</div>
                        <div className="text-[11px] text-slate-400 font-mono">{lead.current_bde_id?.bde_id}</div>
                        {isReassigned && (
                          <span className="text-[10px] text-purple-700 bg-purple-50 px-1.5 py-0.5 rounded border border-purple-200 inline-block mt-0.5">
                            Reassigned (Orig: {lead.original_bde_id?.full_name})
                          </span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-slate-600">
                        {lead.interested_plan_id?.name || lead.interested_plan_name || 'Standard Franchisee'}
                      </td>

                      <td className="py-3.5 px-4">
                        {lead.next_follow_up_date ? (
                          <div className="text-slate-700 flex items-center gap-1 font-medium">
                            <Calendar className="w-3.5 h-3.5 text-slate-400" />
                            {new Date(lead.next_follow_up_date).toLocaleDateString()}
                          </div>
                        ) : (
                          <span className="text-slate-400 italic">None</span>
                        )}
                      </td>

                      <td className="py-3.5 px-4">
                        <LeadStatusBadge status={lead.lead_status} />
                      </td>

                      <td className="py-3.5 px-4 text-right space-x-2">
                        <button
                          onClick={() => handleViewDetail(lead._id)}
                          className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold border border-slate-200 transition-all inline-flex items-center gap-1"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          View
                        </button>
                        <button
                          onClick={() => {
                            setReassignModalLead(lead);
                            setNewBdeId('');
                            setReassignReason('');
                          }}
                          className="px-2.5 py-1.5 bg-purple-50 hover:bg-purple-100 text-purple-700 rounded-xl text-xs font-semibold border border-purple-200 transition-all inline-flex items-center gap-1"
                        >
                          <UserPlus className="w-3.5 h-3.5" />
                          Reassign
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
              <span className="text-slate-900 font-bold">{pagination.pages}</span> ({pagination.total} leads)
            </div>
            <div className="flex items-center gap-1.5">
              <button
                disabled={pagination.page <= 1}
                onClick={() => fetchLeads(pagination.page - 1)}
                className="p-1.5 rounded-lg bg-white border border-slate-200 text-slate-600 disabled:opacity-40 hover:bg-slate-50"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                disabled={pagination.page >= pagination.pages}
                onClick={() => fetchLeads(pagination.page + 1)}
                className="p-1.5 rounded-lg bg-white border border-slate-200 text-slate-600 disabled:opacity-40 hover:bg-slate-50"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── MODALS ── */}

      {/* 1. Lead Detail Drawer / Modal */}
      {detailLead && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-2xl p-6 space-y-5 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <span className="text-xs font-mono font-bold text-amber-600">{detailLead.lead.lead_id}</span>
                <h3 className="text-lg font-bold text-slate-900">{detailLead.lead.company_name}</h3>
              </div>
              <button onClick={() => setDetailLead(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4 text-xs bg-slate-50 p-4 rounded-2xl border border-slate-100">
              <div>
                <span className="text-slate-400 block">Prospect Contact</span>
                <strong className="text-slate-800">{detailLead.lead.prospect_name} ({detailLead.lead.mobile_number})</strong>
              </div>
              <div>
                <span className="text-slate-400 block">Email & GST</span>
                <strong className="text-slate-800">{detailLead.lead.email} &bull; {detailLead.lead.gst_number || 'No GST'}</strong>
              </div>
              <div>
                <span className="text-slate-400 block">Territory</span>
                <strong className="text-slate-800">{detailLead.lead.district_name}, {detailLead.lead.state_name}</strong>
              </div>
              <div>
                <span className="text-slate-400 block">Assigned BDE</span>
                <strong className="text-slate-800">{detailLead.lead.current_bde_id?.full_name} ({detailLead.lead.current_bde_id?.bde_id})</strong>
              </div>
            </div>

            {/* Timeline Activities */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Activity History ({detailLead.activities?.length || 0})</h4>
              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {detailLead.activities?.map((act, idx) => (
                  <div key={idx} className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-xs space-y-1">
                    <div className="flex items-center justify-between text-slate-400 text-[11px]">
                      <span className="font-bold text-slate-800">{act.title}</span>
                      <span>{new Date(act.created_at).toLocaleString()}</span>
                    </div>
                    <p className="text-slate-600">{act.notes}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-end">
              <button
                onClick={() => setDetailLead(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. Reassign Lead Modal */}
      {reassignModalLead && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-md p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900">Reassign Franchisee Lead</h3>
              <button onClick={() => setReassignModalLead(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3 bg-slate-50 rounded-2xl text-xs text-slate-700 space-y-1">
              <div><strong>Lead ID:</strong> {reassignModalLead.lead_id} ({reassignModalLead.company_name})</div>
              <div><strong>Current BDE:</strong> {reassignModalLead.current_bde_id?.full_name}</div>
            </div>

            <form onSubmit={handleReassignSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1.5">Select Target BDE Officer</label>
                <select
                  required
                  value={newBdeId}
                  onChange={(e) => setNewBdeId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:border-amber-500"
                >
                  <option value="">Select BDE...</option>
                  {bdes
                    .filter((b) => b._id !== reassignModalLead.current_bde_id?._id)
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
                  placeholder="e.g. Territory realignment, BDE reassigned, or prospect requested local regional contact..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setReassignModalLead(null)}
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

function LeadStatusBadge({ status }) {
  const configs = {
    new_lead: { label: 'New Lead', bg: 'bg-blue-50 text-blue-700 border-blue-200' },
    contacted: { label: 'Contacted', bg: 'bg-cyan-50 text-cyan-700 border-cyan-200' },
    follow_up_scheduled: { label: 'Follow-up Scheduled', bg: 'bg-amber-50 text-amber-700 border-amber-200' },
    interested: { label: 'Interested', bg: 'bg-teal-50 text-teal-700 border-teal-200' },
    signup_started: { label: 'Signup Started', bg: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
    gst_verification_pending: { label: 'GST Pending', bg: 'bg-orange-50 text-orange-700 border-orange-200' },
    admin_review_pending: { label: 'Admin Review', bg: 'bg-purple-50 text-purple-700 border-purple-200' },
    approved: { label: 'Approved', bg: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
    agreement_pending: { label: 'Agreement Pending', bg: 'bg-amber-50 text-amber-700 border-amber-200' },
    agreement_signed: { label: 'Agreement Signed', bg: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
    fee_payment_pending: { label: 'Fee Pending', bg: 'bg-orange-50 text-orange-700 border-orange-200' },
    fee_paid: { label: 'Fee Paid (Converted)', bg: 'bg-emerald-100 text-emerald-800 border-emerald-300 font-bold' },
    completed: { label: 'Completed (Converted)', bg: 'bg-emerald-100 text-emerald-800 border-emerald-300 font-bold' },
    converted: { label: 'Converted', bg: 'bg-emerald-100 text-emerald-800 border-emerald-300 font-bold' },
    onboarded: { label: 'Onboarded', bg: 'bg-emerald-100 text-emerald-800 border-emerald-300 font-bold' },
    rejected: { label: 'Rejected', bg: 'bg-rose-50 text-rose-700 border-rose-200' },
    lost: { label: 'Lost', bg: 'bg-slate-100 text-slate-500 border-slate-200' },
  };

  const c = configs[status] || { label: status, bg: 'bg-slate-100 text-slate-600 border-slate-200' };

  return (
    <span className={`px-2.5 py-0.5 text-[11px] font-semibold rounded-full border ${c.bg}`}>
      {c.label}
    </span>
  );
}
