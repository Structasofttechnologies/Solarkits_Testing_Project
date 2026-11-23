import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  FileText,
  Plus,
  Box,
  Search,
  Calendar,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Download,
  Share2,
  Phone,
  Mail,
  Eye,
  RotateCw,
  TrendingUp,
  DollarSign,
  Layers,
  Users,
  Send,
  Building2,
  Store,
  ChevronRight,
  X,
  ShieldAlert,
} from 'lucide-react';
import api from '../services/api';

const STATUS_CONFIG = {
  draft: { label: 'Draft', bg: 'bg-slate-100 text-slate-700 border-slate-200' },
  generated: { label: 'Generated', bg: 'bg-blue-50 text-blue-700 border-blue-200' },
  sent: { label: 'Sent', bg: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
  viewed: { label: 'Viewed', bg: 'bg-purple-50 text-purple-700 border-purple-200' },
  follow_up_pending: { label: 'Follow-up Pending', bg: 'bg-amber-50 text-amber-700 border-amber-200' },
  interested: { label: 'Interested', bg: 'bg-cyan-50 text-cyan-700 border-cyan-200' },
  negotiation: { label: 'Negotiation', bg: 'bg-orange-50 text-orange-700 border-orange-200' },
  order_expected: { label: 'Order Expected', bg: 'bg-teal-50 text-teal-700 border-teal-200' },
  converted: { label: 'Converted', bg: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  expired: { label: 'Expired', bg: 'bg-rose-50 text-rose-700 border-rose-200' },
  lost: { label: 'Lost', bg: 'bg-red-50 text-red-700 border-red-200' },
  revised: { label: 'Revised', bg: 'bg-gray-100 text-gray-600 border-gray-200' },
};

function formatINR(paise) {
  if (paise == null || isNaN(paise)) return '₹0';
  const rupees = Math.round(paise / 100);
  return '₹' + rupees.toLocaleString('en-IN');
}

export default function BdeEpcQuotes() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('quotes'); // quotes | followups | analytics
  const [loading, setLoading] = useState(true);
  const [quotes, setQuotes] = useState([]);
  const [dashboardData, setDashboardData] = useState(null);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 1 });

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [sourceFilter, setSourceFilter] = useState('');
  const [sortOrder, setSortOrder] = useState('-created_at');

  // Follow-ups state
  const [followupFilter, setFollowupFilter] = useState('all');
  const [followups, setFollowups] = useState([]);
  const [followupsLoading, setFollowupsLoading] = useState(false);

  // Modals
  const [shareModalQuote, setShareModalQuote] = useState(null);
  const [shareMethod, setShareMethod] = useState('email');
  const [shareRecipient, setShareRecipient] = useState('');
  const [sharing, setSharing] = useState(false);

  const [fuModalQuote, setFuModalQuote] = useState(null);
  const [fuForm, setFuForm] = useState({
    next_follow_up_date: '',
    follow_up_mode: 'call',
    remarks: '',
    expected_quantity: 1,
    expected_order_date: '',
    expected_order_value_inr: '',
    probability_pct: 60,
    status: 'pending',
  });
  const [savingFu, setSavingFu] = useState(false);

  const [convertModalQuote, setConvertModalQuote] = useState(null);
  const [orderType, setOrderType] = useState('epc_order');
  const [converting, setConverting] = useState(false);

  // Fetch Quotes
  const fetchQuotes = useCallback(async () => {
    setLoading(true);
    try {
      const params = {
        page: pagination.page,
        limit: pagination.limit,
        sort: sortOrder,
      };
      if (search.trim()) params.search = search.trim();
      if (statusFilter) params.status = statusFilter;
      if (sourceFilter) params.quote_source = sourceFilter;

      const res = await api.get('/quotes', { params });
      if (res.data?.status === 'success') {
        const rawQuotes = res.data.data?.quotes || (Array.isArray(res.data.data) ? res.data.data : []);
        setQuotes(rawQuotes);
        setPagination((prev) => ({
          ...prev,
          page: res.data.data?.page || 1,
          total: res.data.data?.total || 0,
          totalPages: res.data.data?.totalPages || 1,
        }));
      }
    } catch (err) {
      console.error('Failed to load BDE quotes:', err);
      setQuotes([]);
    } finally {
      setLoading(false);
    }
  }, [pagination.page, pagination.limit, search, statusFilter, sourceFilter, sortOrder]);

  // Fetch Dashboard Stats
  const fetchDashboard = useCallback(async () => {
    try {
      const res = await api.get('/quotes/dashboard');
      if (res.data?.status === 'success') {
        setDashboardData(res.data.data);
      }
    } catch (err) {
      console.error('Failed to load quote dashboard:', err);
    }
  }, []);

  // Fetch Follow-ups
  const fetchFollowups = useCallback(async () => {
    setFollowupsLoading(true);
    try {
      const params = {};
      if (followupFilter !== 'all') params.date_filter = followupFilter;
      const res = await api.get('/quotes/follow-ups/list', { params });
      if (res.data?.status === 'success') {
        const raw = res.data.data;
        const list = Array.isArray(raw)
          ? raw
          : Array.isArray(raw?.followups)
            ? raw.followups
            : Array.isArray(res.data?.followups)
              ? res.data.followups
              : [];
        setFollowups(list);
      } else {
        setFollowups([]);
      }
    } catch (err) {
      console.error('Failed to load follow-ups:', err);
      setFollowups([]);
    } finally {
      setFollowupsLoading(false);
    }
  }, [followupFilter]);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  useEffect(() => {
    if (activeTab === 'quotes') {
      fetchQuotes();
    } else if (activeTab === 'followups') {
      fetchFollowups();
    }
  }, [activeTab, fetchQuotes, fetchFollowups]);

  // Download PDF
  const handleDownloadPdf = async (quoteId, quoteNumber) => {
    try {
      const res = await api.get(`/quotes/${quoteId}/pdf`, { responseType: 'blob' });
      const blob = new Blob([res.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${quoteNumber || 'Quotation'}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      alert('Failed to download PDF.');
    }
  };

  // Quick Share Submit
  const handleShareSubmit = async (e) => {
    e.preventDefault();
    setSharing(true);
    try {
      const res = await api.post(`/quotes/${shareModalQuote._id}/share`, {
        method: shareMethod,
        recipient: shareRecipient.trim(),
      });
      if (res.data?.status === 'success') {
        alert('Quotation shared successfully!');
        setShareModalQuote(null);
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to share quotation.');
    } finally {
      setSharing(false);
    }
  };

  // Quick Follow-up Submit
  const handleFollowupSubmit = async (e) => {
    e.preventDefault();
    setSavingFu(true);
    try {
      const payload = {
        ...fuForm,
        expected_order_value_paise: fuForm.expected_order_value_inr ? Number(fuForm.expected_order_value_inr) * 100 : undefined,
      };
      delete payload.expected_order_value_inr;

      const res = await api.post(`/quotes/${fuModalQuote._id}/follow-ups`, payload);
      if (res.data?.status === 'success') {
        setFuModalQuote(null);
        fetchQuotes();
        if (activeTab === 'followups') fetchFollowups();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to record follow-up.');
    } finally {
      setSavingFu(false);
    }
  };

  // Quick Convert Submit
  const handleConvertSubmit = async (e) => {
    e.preventDefault();
    setConverting(true);
    try {
      const res = await api.post(`/quotes/${convertModalQuote._id}/convert-order`, {
        order_type: orderType,
      });
      if (res.data?.status === 'success') {
        setConvertModalQuote(null);
        alert(`Quote successfully converted to order #${res.data.data.order_number}!`);
        fetchQuotes();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to convert quote to order.');
    } finally {
      setConverting(false);
    }
  };

  const summary = dashboardData?.summary || dashboardData || {};
  const stats = {
    total_quotes: summary.total_quotes ?? summary.total ?? 0,
    converted_quotes: summary.converted_quotes ?? summary.converted ?? 0,
    total_pipeline_value_paise: summary.total_pipeline_value_paise ?? summary.pipeline_value_paise ?? 0,
    total_converted_value_paise: summary.total_converted_value_paise ?? summary.total_converted_paise ?? 0,
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2.5">
            <span className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
              <FileText className="w-6 h-6" />
            </span>
            EPC Quotations & Territory Pipeline
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Manage quotations, pipeline negotiations, and deal closures across your assigned territory
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              fetchDashboard();
              if (activeTab === 'quotes') fetchQuotes();
              if (activeTab === 'followups') fetchFollowups();
            }}
            className="p-2.5 rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 transition shadow-sm"
            title="Refresh"
          >
            <RotateCw className="w-4 h-4" />
          </button>

          <Link
            to="/trial-kit-quotes/create"
            className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-purple-700 hover:bg-purple-800 text-white rounded-xl font-bold text-sm shadow-sm transition active:scale-95"
          >
            <Box className="w-4 h-4" />
            Create Trial Kit Quote
          </Link>

          <Link
            to="/epc-quotes/create"
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-semibold text-sm shadow-sm transition active:scale-95"
          >
            <Plus className="w-4 h-4" />
            Create Quotation
          </Link>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Quotes</span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <FileText className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-bold text-slate-900">{stats.total_quotes || 0}</div>
          <div className="mt-1 text-xs text-slate-400">Territory issued quotes</div>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Active Pipeline</span>
            <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-bold text-slate-900">
            {formatINR(stats.total_pipeline_value_paise || 0)}
          </div>
          <div className="mt-1 text-xs text-slate-400">In negotiation or pending</div>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Converted Value</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-bold text-emerald-600">
            {formatINR(stats.total_converted_value_paise || 0)}
          </div>
          <div className="mt-1 text-xs text-slate-400">{stats.converted_quotes || 0} converted orders</div>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Follow-ups Today</span>
            <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-bold text-slate-900">
            {dashboardData?.followups_today ?? dashboardData?.follow_ups_today ?? 0}
          </div>
          <div className="mt-1 text-xs text-slate-400">Scheduled client tasks</div>
        </div>
      </div>

      {/* Main Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200">
        <button
          onClick={() => setActiveTab('quotes')}
          className={`px-4 py-3 text-sm font-semibold border-b-2 transition flex items-center gap-2 ${activeTab === 'quotes'
            ? 'border-indigo-600 text-indigo-600'
            : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
        >
          <FileText className="w-4 h-4" />
          <span>All Quotes</span>
          <span className="ml-1 px-2 py-0.5 rounded-full text-xs bg-slate-100 text-slate-600 font-medium">
            {pagination.total}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('followups')}
          className={`px-4 py-3 text-sm font-semibold border-b-2 transition flex items-center gap-2 ${activeTab === 'followups'
            ? 'border-indigo-600 text-indigo-600'
            : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
        >
          <Calendar className="w-4 h-4" />
          <span>Follow-up Pipeline</span>
        </button>

        <button
          onClick={() => setActiveTab('analytics')}
          className={`px-4 py-3 text-sm font-semibold border-b-2 transition flex items-center gap-2 ${activeTab === 'analytics'
            ? 'border-indigo-600 text-indigo-600'
            : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
        >
          <TrendingUp className="w-4 h-4" />
          <span>Territory Insights</span>
        </button>
      </div>

      {/* ── TAB 1: ALL QUOTES ─────────────────────────────────────────────── */}
      {activeTab === 'quotes' && (
        <div className="space-y-4">
          {/* Filters */}
          <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm flex flex-col md:flex-row items-center gap-3">
            <div className="relative flex-1 w-full">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by quote number, EPC buyer, contact person..."
                className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 bg-slate-50 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              />
            </div>

            <div className="flex items-center gap-2 w-full md:w-auto">
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setPagination((p) => ({ ...p, page: 1 }));
                }}
                className="px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              >
                <option value="">All Statuses</option>
                {Object.keys(STATUS_CONFIG).map((s) => (
                  <option key={s} value={s}>
                    {STATUS_CONFIG[s].label}
                  </option>
                ))}
              </select>

              <select
                value={sourceFilter}
                onChange={(e) => {
                  setSourceFilter(e.target.value);
                  setPagination((p) => ({ ...p, page: 1 }));
                }}
                className="px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              >
                <option value="">All Sources</option>
                <option value="bde_direct">BDE Direct</option>
                <option value="bde_for_franchisee">BDE for Franchisee</option>
                <option value="franchisee_generated">Franchisee Generated</option>
              </select>

              <select
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value)}
                className="px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              >
                <option value="-created_at">Newest First</option>
                <option value="created_at">Oldest First</option>
                <option value="-total_amount_paise">Highest Value</option>
              </select>
            </div>
          </div>

          {/* Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            {loading ? (
              <div className="py-20 text-center">
                <div className="inline-block w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                <p className="mt-2 text-xs text-slate-500">Loading quotations...</p>
              </div>
            ) : quotes.length === 0 ? (
              <div className="py-16 text-center px-4">
                <FileText className="w-12 h-12 mx-auto text-slate-300 mb-2" />
                <h3 className="text-base font-bold text-slate-800">No Quotations Found</h3>
                <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                  {search || statusFilter || sourceFilter
                    ? 'No quotations match your current filter conditions.'
                    : 'Generate your first quotation to kickstart deal closures.'}
                </p>
                <div className="mt-4 flex items-center justify-center gap-2">
                  <Link
                    to="/trial-kit-quotes/create"
                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-purple-700 text-white rounded-xl text-xs font-semibold shadow-sm hover:bg-purple-800 transition"
                  >
                    <Box className="w-4 h-4" /> Create Trial Kit Quote
                  </Link>
                  <Link
                    to="/epc-quotes/create"
                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-semibold shadow-sm hover:bg-indigo-700 transition"
                  >
                    <Plus className="w-4 h-4" /> Create Commercial Quote
                  </Link>
                </div>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-sm">
                  <thead>
                    <tr className="bg-slate-50/75 border-b border-slate-200 text-slate-500 text-xs font-bold uppercase tracking-wider">
                      <th className="py-3 px-4">Quote Number</th>
                      <th className="py-3 px-4">EPC Buyer</th>
                      <th className="py-3 px-4">Franchisee</th>
                      <th className="py-3 px-4">ComboKit & KW</th>
                      <th className="py-3 px-4 text-center">Qty</th>
                      <th className="py-3 px-4 text-right">Total Amount</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {quotes.map((q) => {
                      const stCfg = STATUS_CONFIG[q.status] || STATUS_CONFIG.draft;
                      return (
                        <tr key={q._id} className="hover:bg-slate-50/70 transition group">
                          <td className="py-3 px-4 font-mono font-bold whitespace-nowrap">
                            <Link
                              to={`/epc-quotes/${q._id}`}
                              className="text-indigo-600 hover:underline flex items-center gap-1.5 flex-wrap"
                            >
                              <span>{q.quote_number || `DRAFT-${q._id?.slice(-6)?.toUpperCase() || 'NEW'}`}</span>
                              {q.is_trial_kit && (
                                <span className="px-1.5 py-0.5 rounded text-[10px] font-black bg-purple-100 text-purple-800 border border-purple-200">
                                  Trial Kit ({q.trial_kit_quantity || q.quantity})
                                </span>
                              )}
                              {q.revision_number > 0 && (
                                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-600">
                                  R{q.revision_number}
                                </span>
                              )}
                            </Link>
                            <div className="text-[11px] font-sans font-normal text-slate-400 mt-0.5">
                              {new Date(q.created_at).toLocaleDateString('en-IN', {
                                day: '2-digit',
                                month: 'short',
                                year: 'numeric',
                              })}
                            </div>
                          </td>

                          <td className="py-3 px-4">
                            <div className="font-semibold text-slate-900 line-clamp-1">
                              {q.epc_snapshot?.company_name || 'EPC Client'}
                            </div>
                            <div className="text-xs text-slate-400 mt-0.5">
                              {q.epc_snapshot?.contact_person || q.epc_snapshot?.gstin}
                            </div>
                          </td>

                          <td className="py-3 px-4">
                            {q.franchisee_snapshot?.business_name ? (
                              <div className="flex items-center gap-1 text-xs font-medium text-slate-700">
                                <Store className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                                <span className="truncate max-w-[140px]">{q.franchisee_snapshot.business_name}</span>
                              </div>
                            ) : (
                              <span className="text-xs text-slate-400 font-medium">BDE Direct</span>
                            )}
                          </td>

                          <td className="py-3 px-4">
                            <div className="font-medium text-slate-800 line-clamp-1 max-w-[180px]">
                              {q.combo_kit_snapshot?.name || 'Solar Kit'}
                            </div>
                            <div className="text-xs text-indigo-600 font-semibold mt-0.5">
                              {q.kit_capacity_kw || q.combo_kit_snapshot?.capacity || 10} kW System
                            </div>
                          </td>

                          <td className="py-3 px-4 text-center font-bold text-slate-700">
                            {q.quantity}
                          </td>

                          <td className="py-3 px-4 text-right">
                            <div className="font-bold text-slate-900">{formatINR(q.total_amount_paise)}</div>
                            <div className="text-[10px] text-slate-400">Tax inclusive</div>
                          </td>

                          <td className="py-3 px-4">
                            <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold border ${stCfg.bg}`}>
                              {stCfg.label}
                            </span>
                          </td>

                          <td className="py-3 px-4 text-center whitespace-nowrap">
                            <div className="flex items-center justify-center gap-1">
                              <Link
                                to={`/epc-quotes/${q._id}`}
                                className="p-1.5 rounded-lg text-slate-600 hover:bg-slate-100 transition"
                                title="View Details"
                              >
                                <Eye className="w-4 h-4" />
                              </Link>

                              <button
                                onClick={() => handleDownloadPdf(q._id, q.quote_number)}
                                className="p-1.5 rounded-lg text-blue-600 hover:bg-blue-50 transition"
                                title="Download PDF"
                              >
                                <Download className="w-4 h-4" />
                              </button>

                              <button
                                onClick={() => {
                                  setShareModalQuote(q);
                                  setShareRecipient(q.epc_snapshot?.email || '');
                                }}
                                className="p-1.5 rounded-lg text-indigo-600 hover:bg-indigo-50 transition"
                                title="Share"
                              >
                                <Share2 className="w-4 h-4" />
                              </button>

                              <button
                                onClick={() => {
                                  setFuModalQuote(q);
                                  setFuForm({
                                    next_follow_up_date: new Date(Date.now() + 3 * 86400000).toISOString().split('T')[0],
                                    follow_up_mode: 'call',
                                    remarks: '',
                                    expected_quantity: q.quantity || 1,
                                    expected_order_date: q.valid_until ? new Date(q.valid_until).toISOString().split('T')[0] : '',
                                    expected_order_value_inr: q.total_amount_paise ? Math.round(q.total_amount_paise / 100) : '',
                                    probability_pct: 60,
                                    status: 'pending',
                                  });
                                }}
                                className="p-1.5 rounded-lg text-amber-600 hover:bg-amber-50 transition"
                                title="Schedule Follow-up"
                              >
                                <Calendar className="w-4 h-4" />
                              </button>

                              {q.status !== 'converted' && !q.converted_order_id && (
                                <button
                                  onClick={() => {
                                    setConvertModalQuote(q);
                                    setOrderType('epc_order');
                                  }}
                                  className="p-1.5 rounded-lg text-emerald-600 hover:bg-emerald-50 transition"
                                  title="Convert to Order"
                                >
                                  <CheckCircle2 className="w-4 h-4" />
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

            {pagination.totalPages > 1 && (
              <div className="py-3 px-4 bg-slate-50/50 border-t border-slate-200 flex items-center justify-between text-xs">
                <span className="text-slate-500">
                  Page {pagination.page} of {pagination.totalPages} ({pagination.total} records)
                </span>
                <div className="flex items-center gap-2">
                  <button
                    disabled={pagination.page <= 1}
                    onClick={() => setPagination((p) => ({ ...p, page: p.page - 1 }))}
                    className="px-3 py-1.5 rounded-lg border border-slate-200 disabled:opacity-40 hover:bg-white"
                  >
                    Previous
                  </button>
                  <button
                    disabled={pagination.page >= pagination.totalPages}
                    onClick={() => setPagination((p) => ({ ...p, page: p.page + 1 }))}
                    className="px-3 py-1.5 rounded-lg border border-slate-200 disabled:opacity-40 hover:bg-white"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── TAB 2: FOLLOW-UP PIPELINE ────────────────────────────────────── */}
      {activeTab === 'followups' && (
        <div className="space-y-4">
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            {[
              { id: 'all', label: 'All Tasks' },
              { id: 'today', label: 'Due Today' },
              { id: 'tomorrow', label: 'Due Tomorrow' },
              { id: 'this_week', label: 'This Week' },
              { id: 'overdue', label: 'Overdue' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setFollowupFilter(tab.id)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition ${followupFilter === tab.id
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4">
            {followupsLoading ? (
              <div className="py-20 text-center">
                <div className="inline-block w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                <p className="mt-2 text-xs text-slate-400">Loading follow-ups...</p>
              </div>
            ) : (!Array.isArray(followups) || followups.length === 0) ? (
              <div className="py-16 text-center">
                <Calendar className="w-10 h-10 mx-auto text-slate-300 mb-2" />
                <h3 className="text-sm font-bold text-slate-800">No Follow-ups Found</h3>
                <p className="text-xs text-slate-400 mt-1">Schedule follow-ups on quotes to keep deal momentum high.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {(Array.isArray(followups) ? followups : []).map((fu) => {
                  const isOverdue = fu.next_follow_up_date && new Date(fu.next_follow_up_date) < new Date();
                  return (
                    <div
                      key={fu._id}
                      className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 flex flex-col justify-between hover:shadow-sm transition"
                    >
                      <div>
                        <div className="flex items-center justify-between gap-2 mb-2">
                          <span className="text-xs font-mono font-bold text-indigo-600">
                            {fu.quote_id?.quote_number || 'Quotation'}
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${isOverdue ? 'bg-red-50 text-red-600' : 'bg-blue-50 text-blue-600'
                              }`}
                          >
                            {isOverdue ? 'Overdue' : fu.status}
                          </span>
                        </div>

                        <div className="font-bold text-slate-900 text-sm">
                          {fu.epc_id?.company_name || fu.quote_id?.epc_snapshot?.company_name || 'EPC Buyer'}
                        </div>

                        <div className="text-xs text-slate-500 mt-2 flex items-center gap-2">
                          <span className="capitalize font-medium text-slate-700">Mode: {fu.follow_up_mode}</span>
                          <span>•</span>
                          <span>
                            Due: {new Date(fu.next_follow_up_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                          </span>
                        </div>

                        {fu.remarks && (
                          <p className="text-xs text-slate-600 mt-2 bg-white p-2.5 rounded-lg border border-slate-100 line-clamp-3">
                            "{fu.remarks}"
                          </p>
                        )}
                      </div>

                      <div className="mt-4 pt-3 border-t border-slate-200 flex items-center justify-between">
                        <Link
                          to={`/epc-quotes/${fu.quote_id?._id || fu.quote_id}`}
                          className="text-xs font-bold text-indigo-600 hover:underline flex items-center gap-1"
                        >
                          <span>View Quote</span>
                          <ChevronRight className="w-3.5 h-3.5" />
                        </Link>

                        <button
                          onClick={() => {
                            setFuModalQuote(fu.quote_id || { _id: fu.quote_id });
                          }}
                          className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-indigo-50 text-indigo-700 hover:bg-indigo-100 transition"
                        >
                          Log Update
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── TAB 3: TERRITORY INSIGHTS ────────────────────────────────────── */}
      {activeTab === 'analytics' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm">
            <h3 className="text-base font-bold text-slate-900 mb-4 flex items-center gap-2">
              <Layers className="w-5 h-5 text-indigo-600" />
              <span>Pipeline Breakdown by Stage</span>
            </h3>
            <div className="space-y-3">
              {Object.keys(STATUS_CONFIG).map((st) => {
                const count = dashboardData?.by_status?.[st] || 0;
                const total = stats.total_quotes || 1;
                const pct = Math.round((count / total) * 100);
                return (
                  <div key={st} className="space-y-1">
                    <div className="flex justify-between text-xs font-semibold">
                      <span className="text-slate-700">{STATUS_CONFIG[st].label}</span>
                      <span className="text-slate-500">
                        {count} ({pct}%)
                      </span>
                    </div>
                    <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full bg-indigo-600 rounded-full transition-all" style={{ width: `${pct}%` }}></div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex flex-col justify-between">
            <div>
              <h3 className="text-base font-bold text-slate-900 mb-4 flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-emerald-600" />
                <span>Commercial Achievement</span>
              </h3>

              <div className="space-y-4">
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Total Pipeline Value</span>
                  <div className="text-2xl font-bold text-slate-900 mt-1">
                    {formatINR(stats.total_pipeline_value_paise)}
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200">
                  <span className="text-xs text-emerald-700 uppercase tracking-wider font-semibold">Converted Orders</span>
                  <div className="text-2xl font-bold text-emerald-700 mt-1">
                    {formatINR(stats.total_converted_value_paise)}
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-blue-50 border border-blue-200">
                  <span className="text-xs text-blue-700 uppercase tracking-wider font-semibold">Conversion Rate</span>
                  <div className="text-2xl font-bold text-blue-700 mt-1">
                    {stats.total_quotes > 0
                      ? `${Math.round(((stats.converted_quotes || 0) / stats.total_quotes) * 100)}%`
                      : '0%'}
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-200">
              <Link
                to="/epc-quotes/create"
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm rounded-xl shadow-sm transition"
              >
                <Plus className="w-4 h-4" /> Create Quotation Now
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Share Modal */}
      {shareModalQuote && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900">Share Quotation</h3>
              <button onClick={() => setShareModalQuote(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleShareSubmit} className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setShareMethod('email')}
                  className={`p-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 ${shareMethod === 'email' ? 'border-indigo-600 bg-indigo-50 text-indigo-700' : 'border-slate-200 text-slate-600'
                    }`}
                >
                  <Mail className="w-4 h-4" /> Email PDF
                </button>
                <button
                  type="button"
                  onClick={() => setShareMethod('whatsapp')}
                  className={`p-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 ${shareMethod === 'whatsapp' ? 'border-emerald-600 bg-emerald-50 text-emerald-700' : 'border-slate-200 text-slate-600'
                    }`}
                >
                  <Send className="w-4 h-4" /> WhatsApp
                </button>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Recipient {shareMethod === 'email' ? 'Email' : 'Phone'}
                </label>
                <input
                  type={shareMethod === 'email' ? 'email' : 'text'}
                  value={shareRecipient}
                  onChange={(e) => setShareRecipient(e.target.value)}
                  required
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShareModalQuote(null)}
                  className="px-4 py-2 border rounded-xl text-xs font-bold text-slate-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={sharing}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-sm"
                >
                  {sharing ? 'Sending...' : 'Send'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Follow-up Modal */}
      {fuModalQuote && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-slate-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900">Schedule EPC Follow-up</h3>
              <button onClick={() => setFuModalQuote(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleFollowupSubmit} className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Follow-up Date *
                  </label>
                  <input
                    type="date"
                    value={fuForm.next_follow_up_date}
                    onChange={(e) => setFuForm({ ...fuForm, next_follow_up_date: e.target.value })}
                    required
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Mode
                  </label>
                  <select
                    value={fuForm.follow_up_mode}
                    onChange={(e) => setFuForm({ ...fuForm, follow_up_mode: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs"
                  >
                    <option value="call">Phone Call</option>
                    <option value="whatsapp">WhatsApp</option>
                    <option value="email">Email</option>
                    <option value="meeting">In-Person Meeting</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Discussion Points & Feedback *
                </label>
                <textarea
                  rows={3}
                  value={fuForm.remarks}
                  onChange={(e) => setFuForm({ ...fuForm, remarks: e.target.value })}
                  required
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs"
                ></textarea>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Probability ({fuForm.probability_pct}%)
                  </label>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    step={5}
                    value={fuForm.probability_pct}
                    onChange={(e) => setFuForm({ ...fuForm, probability_pct: Number(e.target.value) })}
                    className="w-full accent-indigo-600 mt-2"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Stage
                  </label>
                  <select
                    value={fuForm.status}
                    onChange={(e) => setFuForm({ ...fuForm, status: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs"
                  >
                    <option value="pending">Pending</option>
                    <option value="interested">Interested</option>
                    <option value="negotiation">Negotiation</option>
                    <option value="order_expected">Order Expected</option>
                    <option value="lost">Lost</option>
                  </select>
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setFuModalQuote(null)}
                  className="px-4 py-2 border rounded-xl text-xs font-bold text-slate-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingFu}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-sm"
                >
                  {savingFu ? 'Saving...' : 'Save Follow-up'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Convert Modal */}
      {convertModalQuote && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900">Convert to Official Order</h3>
              <button onClick={() => setConvertModalQuote(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="my-4 p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">EPC Buyer:</span>
                <span className="font-bold">{convertModalQuote.epc_snapshot?.company_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">ComboKit:</span>
                <span className="font-medium">{convertModalQuote.combo_kit_snapshot?.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Payable Amount:</span>
                <span className="font-bold text-emerald-600">{formatINR(convertModalQuote.total_amount_paise)}</span>
              </div>
            </div>

            <form onSubmit={handleConvertSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  Order Type
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setOrderType('epc_order')}
                    className={`p-3 rounded-xl border text-xs font-bold text-left ${orderType === 'epc_order' ? 'border-emerald-600 bg-emerald-50 text-emerald-700' : 'border-slate-200 text-slate-600'
                      }`}
                  >
                    EPC Direct Order
                  </button>
                  <button
                    type="button"
                    onClick={() => setOrderType('fpo_order')}
                    className={`p-3 rounded-xl border text-xs font-bold text-left ${orderType === 'fpo_order' ? 'border-emerald-600 bg-emerald-50 text-emerald-700' : 'border-slate-200 text-slate-600'
                      }`}
                  >
                    Franchisee PO
                  </button>
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setConvertModalQuote(null)}
                  className="px-4 py-2 border rounded-xl text-xs font-bold text-slate-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={converting}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-sm"
                >
                  {converting ? 'Processing...' : 'Confirm Conversion'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
