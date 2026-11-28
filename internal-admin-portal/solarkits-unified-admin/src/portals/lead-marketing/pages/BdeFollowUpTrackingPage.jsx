import React, { useCallback, useEffect, useState } from 'react';
import {
  FaUserTie,
  FaSyncAlt,
  FaPhoneAlt,
  FaTimes,
  FaCalendarCheck,
  FaCheckCircle,
  FaHistory
} from 'react-icons/fa';
import {
  leadMarketingHttp,
  extractError,
  SEGMENT_LABELS,
  SEGMENT_BADGE_COLORS
} from '../services/leadMarketingApi';

export default function BdeFollowUpTrackingPage() {
  const [meta, setMeta] = useState({
    bdes: [],
    settings: { lead_statuses: [] }
  });
  const [filters, setFilters] = useState({
    primary_segment_key: '',
    bde_id: '',
    lead_status: ''
  });
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [banner, setBanner] = useState(null);

  // Follow-up Log Modal
  const [activeLead, setActiveLead] = useState(null);
  const [activityForm, setActivityForm] = useState({
    activity_type: 'call',
    notes: '',
    outcome: '',
    next_followup_at: '',
    new_status: ''
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    leadMarketingHttp
      .get('/meta')
      .then((res) => {
        if (res.data?.success && res.data?.data) setMeta(res.data.data);
      })
      .catch(() => {});
  }, []);

  const fetchTracking = useCallback(
    async (runSync = false) => {
      if (runSync) setSyncing(true);
      else setLoading(true);
      try {
        const qs = new URLSearchParams();
        if (runSync) qs.append('sync', 'true');
        if (filters.primary_segment_key) qs.append('primary_segment_key', filters.primary_segment_key);
        if (filters.bde_id) qs.append('bde_id', filters.bde_id);
        if (filters.lead_status) qs.append('lead_status', filters.lead_status);

        const res = await leadMarketingHttp.get(`/bde-tracking?${qs.toString()}`);
        if (res.data?.success) setData(res.data.data);
      } catch (err) {
        setBanner({ type: 'error', text: extractError(err, 'Failed loading BDE follow-up tracker') });
      } finally {
        setLoading(false);
        setSyncing(false);
      }
    },
    [filters]
  );

  useEffect(() => {
    fetchTracking(false);
  }, [fetchTracking]);

  const openActivityModal = (lead) => {
    setActiveLead(lead);
    setActivityForm({
      activity_type: 'call',
      notes: '',
      outcome: '',
      next_followup_at: '',
      new_status: lead.lead_status || 'Contacted'
    });
  };

  const handleSaveActivity = async (e) => {
    e.preventDefault();
    if (!activeLead) return;
    setSubmitting(true);
    setBanner(null);
    try {
      const res = await leadMarketingHttp.post(`/leads/${activeLead._id}/activities`, activityForm);
      if (res.data?.success) {
        setBanner({ type: 'success', text: `Logged follow-up for ${activeLead.company_name} (${activeLead.lead_id}).` });
        setActiveLead(null);
        await fetchTracking(false);
      }
    } catch (err) {
      setBanner({ type: 'error', text: extractError(err, 'Failed logging follow-up activity') });
    } finally {
      setSubmitting(false);
    }
  };

  const workload = data?.bde_workload || [];
  const leads = data?.leads || [];
  const recentActivities = data?.recent_activities || [];
  const liveBdeFollowups = data?.live_bde_followups || [];
  const statusNames = (meta.settings?.lead_statuses || []).map((st) => (typeof st === 'string' ? st : st.name));

  const totalPending = workload.reduce((sum, w) => sum + Number(w.pending_followups || 0), 0);
  const totalConverted = workload.reduce((sum, w) => sum + Number(w.converted_leads || 0), 0);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs">
        <div>
          <h1 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2">
            <FaUserTie className="text-teal-600" />
            <span>12 · BDE Follow-up &amp; Lead Tracking</span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Monitor BDE lead ownership, pending follow-ups, call/meeting/proposal activity history &amp; live BDE portal sync.
          </p>
        </div>

        <button
          type="button"
          disabled={syncing}
          onClick={() => fetchTracking(true)}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold cursor-pointer disabled:opacity-60"
        >
          <FaSyncAlt className={syncing ? 'animate-spin' : ''} /> Sync Live Conversions &amp; BDE Feed
        </button>
      </div>

      {banner && (
        <div
          className={`p-3 rounded-xl text-xs font-semibold border ${
            banner.type === 'error'
              ? 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300'
              : 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300'
          }`}
        >
          {banner.text}
        </div>
      )}

      {/* Filter Strip */}
      <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
        <select
          value={filters.primary_segment_key}
          onChange={(e) => setFilters((f) => ({ ...f, primary_segment_key: e.target.value }))}
          className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 font-semibold"
        >
          <option value="">All Primary Segments</option>
          <option value="franchisee_leads">Franchisee Leads</option>
          <option value="epc_signup_leads">EPC Signup Leads</option>
          <option value="epc_sales_leads">EPC Sales Leads</option>
        </select>

        <select
          value={filters.bde_id}
          onChange={(e) => setFilters((f) => ({ ...f, bde_id: e.target.value }))}
          className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 font-semibold"
        >
          <option value="">All Assigned BDEs</option>
          {meta.bdes.map((b) => (
            <option key={b._id} value={b._id}>{b.full_name || b.name || b.email}</option>
          ))}
        </select>

        <select
          value={filters.lead_status}
          onChange={(e) => setFilters((f) => ({ ...f, lead_status: e.target.value }))}
          className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 font-semibold"
        >
          <option value="">All Lead Statuses</option>
          {statusNames.map((name) => (
            <option key={name} value={name}>{name}</option>
          ))}
        </select>

        <button
          type="button"
          onClick={() => setFilters({ primary_segment_key: '', bde_id: '', lead_status: '' })}
          className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-600 font-bold hover:bg-slate-50 dark:hover:bg-slate-700 cursor-pointer"
        >
          Clear Filters
        </button>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        {[
          { label: 'Active BDE Profiles', val: workload.length },
          { label: 'Filtered Lead Queue', val: leads.length },
          { label: 'Pending Follow-ups', val: totalPending },
          { label: 'BDE Converted Leads', val: totalConverted },
          { label: 'Live Portal BDE Leads', val: data?.live_bde_leads_count ?? 0 }
        ].map((c) => (
          <div key={c.label} className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700">
            <div className="text-[11px] font-bold uppercase text-slate-500">{c.label}</div>
            <div className="text-2xl font-black text-slate-900 dark:text-white mt-1">
              {loading ? '—' : Number(c.val).toLocaleString('en-IN')}
            </div>
          </div>
        ))}
      </div>

      {/* BDE Workload Table */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
        <div className="p-4 border-b border-slate-200 dark:border-slate-700 font-black text-sm">
          BDE Lead Workload &amp; Conversion Summary
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 dark:bg-slate-900/60 text-slate-500 uppercase text-[11px]">
              <tr>
                <th className="px-4 py-3">BDE Name</th>
                <th className="px-4 py-3">State</th>
                <th className="px-4 py-3 text-right">Assigned Leads</th>
                <th className="px-4 py-3 text-right">Franchisee</th>
                <th className="px-4 py-3 text-right">EPC Signup</th>
                <th className="px-4 py-3 text-right">EPC Sales</th>
                <th className="px-4 py-3 text-right">Pending Follow-ups</th>
                <th className="px-4 py-3 text-right">Converted</th>
                <th className="px-4 py-3 text-right">Filter</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
              {workload.map((w) => (
                <tr key={w.bde_id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30">
                  <td className="px-4 py-2.5">
                    <div className="font-bold text-slate-900 dark:text-white">{w.full_name}</div>
                    <div className="font-mono text-[10px] text-slate-400">{w.bde_code}</div>
                  </td>
                  <td className="px-4 py-2.5 text-slate-500">{w.state_name || '—'}</td>
                  <td className="px-4 py-2.5 text-right font-black">{w.total_leads}</td>
                  <td className="px-4 py-2.5 text-right">{w.franchisee_leads}</td>
                  <td className="px-4 py-2.5 text-right">{w.epc_signup_leads}</td>
                  <td className="px-4 py-2.5 text-right">{w.epc_sales_leads}</td>
                  <td className="px-4 py-2.5 text-right font-bold text-amber-600">{w.pending_followups}</td>
                  <td className="px-4 py-2.5 text-right font-black text-emerald-600">{w.converted_leads}</td>
                  <td className="px-4 py-2.5 text-right">
                    <button
                      type="button"
                      onClick={() => setFilters((f) => ({ ...f, bde_id: f.bde_id === String(w.bde_id) ? '' : String(w.bde_id) }))}
                      className="text-teal-600 font-bold hover:underline cursor-pointer"
                    >
                      {filters.bde_id === String(w.bde_id) ? 'Showing' : 'Filter Queue'}
                    </button>
                  </td>
                </tr>
              ))}
              {workload.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-4 py-8 text-center text-slate-400">No BDE profiles loaded from BDE Master.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Lead Follow-Up Action Queue */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
        <div className="p-4 border-b border-slate-200 dark:border-slate-700 font-black text-sm flex items-center justify-between">
          <span>Lead Follow-up Action Queue ({leads.length})</span>
        </div>
        <div className="overflow-x-auto max-h-[420px]">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 dark:bg-slate-900/60 text-slate-500 uppercase text-[11px] sticky top-0">
              <tr>
                <th className="px-4 py-2.5">Lead / Company</th>
                <th className="px-4 py-2.5">Segment</th>
                <th className="px-4 py-2.5">Region</th>
                <th className="px-4 py-2.5">Assigned BDE</th>
                <th className="px-4 py-2.5">Status</th>
                <th className="px-4 py-2.5">Next / Last Follow-up</th>
                <th className="px-4 py-2.5 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
              {leads.map((l) => (
                <tr key={l._id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30">
                  <td className="px-4 py-2.5">
                    <div className="font-mono text-[10px] text-teal-600 font-bold">{l.lead_id}</div>
                    <div className="font-bold text-slate-900 dark:text-white">{l.company_name}</div>
                    <div className="text-[11px] text-slate-400">{l.contact_person} {l.mobile_number ? `• ${l.mobile_number}` : ''}</div>
                  </td>
                  <td className="px-4 py-2.5">
                    <span className={`px-2 py-0.5 rounded-full border text-[10px] font-bold ${SEGMENT_BADGE_COLORS[l.primary_segment_key] || ''}`}>
                      {SEGMENT_LABELS[l.primary_segment_key] || l.primary_segment_key}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-slate-500">{[l.state_name, l.district_name].filter(Boolean).join(', ') || '—'}</td>
                  <td className="px-4 py-2.5 font-semibold">{l.assigned_bde_name || 'Unassigned'}</td>
                  <td className="px-4 py-2.5 font-bold">{l.lead_status}</td>
                  <td className="px-4 py-2.5 text-[11px] text-slate-500">
                    {l.next_followup_at ? <div>Next: {new Date(l.next_followup_at).toLocaleDateString('en-IN')}</div> : null}
                    {l.last_followup_at ? <div>Last: {new Date(l.last_followup_at).toLocaleDateString('en-IN')}</div> : 'No follow-up logged'}
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    <button
                      type="button"
                      onClick={() => openActivityModal(l)}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-700 text-white font-bold cursor-pointer"
                    >
                      <FaPhoneAlt /> Log Follow-up
                    </button>
                  </td>
                </tr>
              ))}
              {leads.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-slate-400">No leads matched active filter criteria.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Dual Feed: CRM Activities & Live BDE Portal Followups */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
          <div className="p-4 border-b border-slate-200 dark:border-slate-700 font-black text-sm flex items-center gap-2">
            <FaHistory className="text-teal-600" /> Recent Lead Marketing Activities ({recentActivities.length})
          </div>
          <div className="max-h-80 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-700 text-xs">
            {recentActivities.map((act) => (
              <div key={act._id} className="p-3.5 flex items-start justify-between gap-3">
                <div>
                  <div className="font-bold text-slate-900 dark:text-white">
                    <span className="uppercase text-[10px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-700 mr-1.5">{act.activity_type}</span>
                    {act.lead_code || 'Lead'}
                  </div>
                  <div className="text-slate-600 dark:text-slate-300 mt-1">{act.notes || act.outcome || 'Updated status'}</div>
                  <div className="text-[10px] text-slate-400 mt-0.5">By {act.actor_name || act.bde_name || 'Admin'}</div>
                </div>
                <div className="text-[10px] text-slate-400 whitespace-nowrap">
                  {act.occurred_at ? new Date(act.occurred_at).toLocaleString('en-IN') : ''}
                </div>
              </div>
            ))}
            {recentActivities.length === 0 && (
              <div className="p-8 text-center text-slate-400">No activity logs recorded yet.</div>
            )}
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
          <div className="p-4 border-b border-slate-200 dark:border-slate-700 font-black text-sm flex items-center gap-2">
            <FaCalendarCheck className="text-emerald-600" /> Live BDE Module Follow-Ups Feed ({liveBdeFollowups.length})
          </div>
          <div className="max-h-80 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-700 text-xs">
            {liveBdeFollowups.map((fu) => (
              <div key={fu._id} className="p-3.5 flex items-start justify-between gap-3">
                <div>
                  <div className="font-bold text-slate-900 dark:text-white">
                    {fu.follow_up_type || fu.status || 'BDE Follow-up'}
                  </div>
                  <div className="text-slate-600 dark:text-slate-300 mt-0.5">{fu.notes || fu.remarks || 'Scheduled field/call follow-up'}</div>
                </div>
                <div className="text-[10px] text-slate-400 whitespace-nowrap">
                  {fu.follow_up_date ? new Date(fu.follow_up_date).toLocaleDateString('en-IN') : ''}
                </div>
              </div>
            ))}
            {liveBdeFollowups.length === 0 && (
              <div className="p-8 text-center text-slate-400">No live BDE portal follow-ups recorded yet.</div>
            )}
          </div>
        </div>
      </div>

      {/* Log Activity Modal */}
      {activeLead && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <form
            onSubmit={handleSaveActivity}
            className="bg-white dark:bg-slate-800 w-full max-w-lg rounded-2xl border border-slate-200 dark:border-slate-700 p-5 space-y-4 text-xs shadow-2xl"
          >
            <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-700">
              <div>
                <h3 className="text-sm font-black text-slate-900 dark:text-white">Log Lead Follow-up Activity</h3>
                <div className="text-[11px] text-slate-500">{activeLead.lead_id} · {activeLead.company_name}</div>
              </div>
              <button type="button" onClick={() => setActiveLead(null)} className="p-1.5 rounded-lg hover:bg-slate-100 cursor-pointer">
                <FaTimes />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-bold mb-1">Activity Type</label>
                <select
                  value={activityForm.activity_type}
                  onChange={(e) => setActivityForm((f) => ({ ...f, activity_type: e.target.value }))}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-900"
                >
                  <option value="call">Phone Call</option>
                  <option value="meeting">Meeting Scheduled / Done</option>
                  <option value="proposal_shared">Proposal Shared</option>
                  <option value="quotation_shared">Quotation Shared</option>
                  <option value="note">Internal Note</option>
                </select>
              </div>
              <div>
                <label className="block font-bold mb-1">Update Lead Status</label>
                <select
                  value={activityForm.new_status}
                  onChange={(e) => setActivityForm((f) => ({ ...f, new_status: e.target.value }))}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-900"
                >
                  <option value="">Keep Unchanged</option>
                  {statusNames.map((name) => (
                    <option key={name} value={name}>{name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block font-bold mb-1">Next Follow-up Date &amp; Time</label>
              <input
                type="datetime-local"
                value={activityForm.next_followup_at}
                onChange={(e) => setActivityForm((f) => ({ ...f, next_followup_at: e.target.value }))}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-900"
              />
            </div>

            <div>
              <label className="block font-bold mb-1">Outcome / Summary</label>
              <input
                type="text"
                value={activityForm.outcome}
                onChange={(e) => setActivityForm((f) => ({ ...f, outcome: e.target.value }))}
                placeholder="e.g., Requested 10kW quote for Surat rooftop"
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-900"
              />
            </div>

            <div>
              <label className="block font-bold mb-1">Detailed Notes *</label>
              <textarea
                rows={3}
                required
                value={activityForm.notes}
                onChange={(e) => setActivityForm((f) => ({ ...f, notes: e.target.value }))}
                placeholder="Enter discussion notes..."
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-900"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setActiveLead(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-600 font-bold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold cursor-pointer disabled:opacity-50"
              >
                <FaCheckCircle /> {submitting ? 'Saving...' : 'Save Follow-up'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
