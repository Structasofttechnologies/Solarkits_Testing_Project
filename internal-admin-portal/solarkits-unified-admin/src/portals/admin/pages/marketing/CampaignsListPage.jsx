import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { authHeaderObj } from '../../app/authHeader';
import { API_BASE_URL } from './services/marketingDataService';
import {
  FaBullhorn, FaPlus, FaPlay, FaPause, FaTrash, FaCopy,
  FaEnvelope, FaWhatsapp, FaFilter, FaSearch, FaCheckCircle,
  FaClock, FaBan, FaListAlt, FaTimes, FaExclamationTriangle
} from 'react-icons/fa';
import { marketingHttp, buildShortTrackingUrl, extractApiError } from './services/marketingApi';

export default function CampaignsListPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [campaigns, setCampaigns] = useState([]);
  const [filterType, setFilterType] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterObjective, setFilterObjective] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedId, setCopiedId] = useState(null);
  const [banner, setBanner] = useState(null);
  const [logsModal, setLogsModal] = useState(null);
  const [logsLoading, setLogsLoading] = useState(false);

  const fetchCampaigns = async () => {
    setLoading(true);
    try {
      const res = await marketingHttp.get('/campaigns');
      if (res.data?.success) {
        setCampaigns(res.data.data || []);
      }
    } catch (err) {
      setBanner({ type: 'error', text: extractApiError(err, 'Failed to fetch campaigns') });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCampaigns();
  }, []);

  useEffect(() => {
    const hasRunning = campaigns.some((c) => c.status === 'running');
    if (!hasRunning) return undefined;
    const timer = setInterval(() => {
      fetchCampaigns();
    }, 5000);
    return () => clearInterval(timer);
  }, [campaigns]);

  const handleLifecycleAction = async (id, action) => {
    setBanner(null);
    try {
      let res;
      if (action === 'launch') res = await marketingHttp.post(`/campaigns/${id}/launch`);
      else if (action === 'resume') res = await marketingHttp.post(`/campaigns/${id}/resume`);
      else if (action === 'pause') res = await marketingHttp.post(`/campaigns/${id}/pause`);
      else if (action === 'cancel') res = await marketingHttp.post(`/campaigns/${id}/cancel`);
      else if (action === 'delete') {
        if (!window.confirm('Delete this campaign?')) return;
        res = await marketingHttp.delete(`/campaigns/${id}`);
      }
      setBanner({ type: 'success', text: res?.data?.message || `Campaign ${action} executed.` });
      await fetchCampaigns();
    } catch (err) {
      setBanner({ type: 'error', text: extractApiError(err, `Failed to ${action} campaign`) });
    }
  };

  const openLogsDrawer = async (campaign) => {
    setLogsLoading(true);
    setLogsModal({ campaign, recipients: [], deliveryLogs: [] });
    try {
      const res = await marketingHttp.get(`/campaigns/${campaign._id}/logs`);
      if (res.data?.success) {
        setLogsModal(res.data.data);
      }
    } catch (err) {
      setBanner({ type: 'error', text: extractApiError(err, 'Failed to load campaign delivery logs') });
      setLogsModal(null);
    } finally {
      setLogsLoading(false);
    }
  };

  const handleCopyLink = (code) => {
    const url = buildShortTrackingUrl(code);
    navigator.clipboard.writeText(url);
    setCopiedId(code);
    setTimeout(() => setCopiedId(null), 2500);
  };

  const filtered = campaigns.filter((c) => {
    if (filterType !== 'all' && c.campaign_type !== filterType) return false;
    if (filterStatus !== 'all' && c.status !== filterStatus) return false;
    if (filterObjective !== 'all' && c.campaign_objective !== filterObjective) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        (c.campaign_name || '').toLowerCase().includes(q) ||
        (c.campaign_code || '').toLowerCase().includes(q)
      );
    }
    return true;
  });

  const getStatusBadge = (status) => {
    switch (status) {
      case 'running':
        return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 flex items-center gap-1 w-max"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span> Running</span>;
      case 'scheduled':
        return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-blue-500/10 text-blue-600 border border-blue-500/20 flex items-center gap-1 w-max"><FaClock className="w-2.5 h-2.5" /> Scheduled</span>;
      case 'completed':
        return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-slate-500/10 text-slate-600 dark:text-slate-300 border border-slate-500/20 flex items-center gap-1 w-max"><FaCheckCircle className="w-2.5 h-2.5" /> Completed</span>;
      case 'paused':
        return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-500/10 text-amber-600 border border-amber-500/20 w-max">Paused</span>;
      case 'cancelled':
        return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-rose-500/10 text-rose-600 border border-rose-500/20 w-max">Cancelled</span>;
      default:
        return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-300 w-max capitalize">{status}</span>;
    }
  };

  return (
    <div className="space-y-6 text-slate-800 dark:text-slate-100 w-full">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">Campaign Management</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Create, launch, pause, cancel, and inspect live delivery logs for every campaign in MongoDB.
          </p>
        </div>

        <button
          onClick={() => navigate('/marketing-panel/create-campaign')}
          className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white text-sm font-bold shadow-md shadow-indigo-500/20 cursor-pointer flex items-center gap-2 w-max"
        >
          <FaPlus />
          <span>New Campaign</span>
        </button>
      </div>

      {banner && (
        <div
          className={`p-4 rounded-2xl border text-sm font-semibold flex items-center gap-2 ${
            banner.type === 'error'
              ? 'bg-rose-50 dark:bg-rose-950/60 border-rose-200 text-rose-800'
              : 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-200 text-emerald-800'
          }`}
        >
          {banner.type === 'error' ? <FaExclamationTriangle className="shrink-0" /> : <FaCheckCircle className="shrink-0" />}
          <span>{banner.text}</span>
        </div>
      )}

      {/* Filter Bar */}
      <div className="p-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-1 min-w-[240px]">
          <FaSearch className="text-slate-400" />
          <input
            type="text"
            placeholder="Search campaign name or code..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-transparent border-none outline-hidden text-sm placeholder:text-slate-400"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1.5 text-xs text-slate-500">
            <FaFilter className="w-3 h-3" />
            <span>Filters:</span>
          </div>
          <select value={filterType} onChange={(e) => setFilterType(e.target.value)} className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 cursor-pointer">
            <option value="all">All Channels</option>
            <option value="email">Email</option>
            <option value="whatsapp">WhatsApp</option>
            <option value="both">Both</option>
          </select>

          <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 cursor-pointer">
            <option value="all">All Statuses</option>
            <option value="draft">Draft</option>
            <option value="scheduled">Scheduled</option>
            <option value="running">Running</option>
            <option value="paused">Paused</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>

          <select value={filterObjective} onChange={(e) => setFilterObjective(e.target.value)} className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 cursor-pointer">
            <option value="all">All Objectives</option>
            <option value="lead_generation">Lead Generation</option>
            <option value="sales">Sales & Orders</option>
            <option value="seasonal_coupon">Seasonal Coupon Offer</option>
            <option value="add_to_cart">Add to Cart Push</option>
            <option value="epc_onboarding">EPC Onboarding</option>
            <option value="epc_activation">EPC Activation</option>
            <option value="product_promotion">Product Promotion</option>
            <option value="govt_tender_promotion">Govt Tender Promotion</option>
            <option value="store_visits">Store Visits</option>
          </select>
        </div>
      </div>

      {/* Campaigns Table */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs overflow-hidden">
        {loading ? (
          <div className="py-12 text-center text-xs text-slate-400">Loading campaigns from MongoDB...</div>
        ) : filtered.length === 0 ? (
          <div className="py-12 text-center space-y-3">
            <div className="text-sm font-bold text-slate-600 dark:text-slate-300">No campaigns matched</div>
            <button onClick={() => navigate('/marketing-panel/create-campaign')} className="px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-bold cursor-pointer">
              + Create First Campaign
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs md:text-sm">
              <thead className="bg-slate-50 dark:bg-slate-900/60 border-b border-slate-200 dark:border-slate-700 text-slate-500 uppercase font-bold text-[11px] tracking-wider">
                <tr>
                  <th className="py-3.5 px-4">Campaign Name & ID</th>
                  <th className="py-3.5 px-4">Channel</th>
                  <th className="py-3.5 px-4">Audience / Sent / Failed</th>
                  <th className="py-3.5 px-4">Schedule</th>
                  <th className="py-3.5 px-4">Budget</th>
                  <th className="py-3.5 px-4">Owner</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60 font-medium">
                {filtered.map((c) => (
                  <tr key={c._id} className="hover:bg-slate-50/80 dark:hover:bg-slate-700/30 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-slate-900 dark:text-white">{c.campaign_name}</div>
                      <div className="text-[11px] font-mono text-indigo-600 dark:text-indigo-400 mt-0.5">{c.campaign_code}</div>
                      {c.last_error && (
                        <div className="text-[11px] text-rose-600 font-semibold mt-1 line-clamp-1" title={c.last_error}>
                          Error: {c.last_error}
                        </div>
                      )}
                    </td>

                    <td className="py-3.5 px-4">
                      {c.campaign_type === 'email' && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-50 text-blue-600 font-semibold text-xs">
                          <FaEnvelope className="w-3 h-3" /> Email
                        </span>
                      )}
                      {c.campaign_type === 'whatsapp' && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-600 font-semibold text-xs">
                          <FaWhatsapp className="w-3 h-3" /> WhatsApp
                        </span>
                      )}
                      {c.campaign_type === 'both' && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-purple-50 text-purple-600 font-semibold text-xs">
                          <FaBullhorn className="w-3 h-3" /> Both
                        </span>
                      )}
                    </td>

                    <td className="py-3.5 px-4 text-xs">
                      <div className="font-bold text-slate-800 dark:text-slate-200">{c.total_recipients || 0} targeted</div>
                      <div className="text-[11px] space-x-2">
                        <span className="text-emerald-600">{c.stats?.messages_sent || 0} sent</span>
                        <span className="text-rose-600">{c.stats?.failed || 0} failed</span>
                        <span className="text-indigo-600">{c.stats?.link_clicks || 0} clicks</span>
                      </div>
                    </td>

                    <td className="py-3.5 px-4 text-xs">
                      <div>{c.start_date ? new Date(c.start_date).toLocaleDateString('en-IN') : 'Immediate'}</div>
                      <div className="text-slate-400 text-[10px]">to {c.end_date ? new Date(c.end_date).toLocaleDateString('en-IN') : 'No End'}</div>
                    </td>

                    <td className="py-3.5 px-4 font-bold text-slate-800 dark:text-slate-200">
                      ₹{Number(c.budget || 0).toLocaleString('en-IN')}
                    </td>

                    <td className="py-3.5 px-4 text-xs text-slate-600 dark:text-slate-300">
                      {c.assigned_manager?.name || 'Admin'}
                    </td>

                    <td className="py-3.5 px-4">{getStatusBadge(c.status)}</td>

                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {['draft', 'scheduled'].includes(c.status) && (
                          <button onClick={() => handleLifecycleAction(c._id, 'launch')} title="Launch Now" className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-100 cursor-pointer">
                            <FaPlay className="w-3 h-3" />
                          </button>
                        )}
                        {c.status === 'paused' && (
                          <button onClick={() => handleLifecycleAction(c._id, 'resume')} title="Resume Campaign" className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-100 cursor-pointer">
                            <FaPlay className="w-3 h-3" />
                          </button>
                        )}
                        {['running', 'scheduled'].includes(c.status) && (
                          <button onClick={() => handleLifecycleAction(c._id, 'pause')} title="Pause Campaign" className="p-1.5 rounded-lg bg-amber-50 text-amber-600 hover:bg-amber-100 cursor-pointer">
                            <FaPause className="w-3 h-3" />
                          </button>
                        )}
                        {['draft', 'scheduled', 'running', 'paused'].includes(c.status) && (
                          <button onClick={() => handleLifecycleAction(c._id, 'cancel')} title="Cancel Campaign" className="p-1.5 rounded-lg bg-rose-50 text-rose-600 hover:bg-rose-100 cursor-pointer">
                            <FaBan className="w-3 h-3" />
                          </button>
                        )}
                        <button onClick={() => openLogsDrawer(c)} title="View Delivery & Error Logs" className="p-1.5 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 cursor-pointer">
                          <FaListAlt className="w-3 h-3" />
                        </button>
                        {c.tracking_short_code && (
                          <button onClick={() => handleCopyLink(c.tracking_short_code)} title="Copy Tracking Link" className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 cursor-pointer">
                            {copiedId === c.tracking_short_code ? <span className="text-[10px] font-bold text-emerald-600">✓</span> : <FaCopy className="w-3 h-3" />}
                          </button>
                        )}
                        {c.status !== 'running' && (
                          <button onClick={() => handleLifecycleAction(c._id, 'delete')} title="Delete Campaign" className="p-1.5 rounded-lg bg-slate-100 hover:bg-rose-50 hover:text-rose-600 dark:bg-slate-700 cursor-pointer">
                            <FaTrash className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Campaign Delivery & Error Logs Modal */}
      {logsModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-700 max-w-4xl w-full max-h-[88vh] flex flex-col p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 pb-3 mb-4">
              <div>
                <h3 className="font-bold text-lg">{logsModal.campaign?.campaign_name} — Delivery & Error Logs</h3>
                <p className="text-xs text-slate-500">
                  Sent: {logsModal.campaign?.stats?.messages_sent || 0} | Failed: {logsModal.campaign?.stats?.failed || 0} | Unsubscribed Skipped: {logsModal.campaign?.stats?.unsubscribed || 0}
                </p>
              </div>
              <button onClick={() => setLogsModal(null)} className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center cursor-pointer">
                <FaTimes />
              </button>
            </div>

            {logsLoading ? (
              <div className="py-12 text-center text-xs text-slate-400">Fetching delivery logs...</div>
            ) : (
              <div className="overflow-y-auto flex-1 space-y-4">
                {(logsModal.deliveryLogs || []).length === 0 && (logsModal.recipients || []).length === 0 ? (
                  <div className="text-xs text-slate-500 text-center py-8">No dispatch logs recorded for this campaign yet.</div>
                ) : (
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 dark:bg-slate-800 text-slate-500 uppercase">
                      <tr>
                        <th className="py-2 px-3">Recipient</th>
                        <th className="py-2 px-3">Channel / Provider</th>
                        <th className="py-2 px-3">Status</th>
                        <th className="py-2 px-3">Message ID / Error</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {(logsModal.deliveryLogs?.length > 0 ? logsModal.deliveryLogs : logsModal.recipients).map((row, i) => (
                        <tr key={row._id || i}>
                          <td className="py-2 px-3">
                            <div className="font-bold">{row.recipient_name || row.name}</div>
                            <div className="text-slate-500">{row.recipient_email || row.email || row.recipient_phone || row.phone}</div>
                          </td>
                          <td className="py-2 px-3 uppercase font-mono">{row.provider || row.email_provider || row.channel}</td>
                          <td className="py-2 px-3">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${row.status === 'failed' ? 'bg-rose-100 text-rose-700' : row.status === 'sent' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-700'}`}>
                              {row.status}
                            </span>
                          </td>
                          <td className="py-2 px-3 text-slate-600 dark:text-slate-300">
                            {row.error_message ? (
                              <span className="text-rose-600 font-semibold">{row.error_code ? `[${row.error_code}] ` : ''}{row.error_message}</span>
                            ) : (
                              <span className="font-mono text-[11px]">{row.message_id || row.email_message_id || row.wa_message_id || '-'}</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
