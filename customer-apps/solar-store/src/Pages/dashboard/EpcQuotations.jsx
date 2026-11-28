import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FiFileText,
  FiDownload,
  FiEye,
  FiSearch,
  FiRefreshCw,
  FiClock,
  FiCheckCircle,
  FiAlertCircle,
  FiPhone,
  FiMail,
  FiArrowRight,
  FiDollarSign,
  FiPackage,
  FiLayers,
  FiCalendar,
  FiUser,
  FiShield,
  FiExternalLink,
  FiShoppingCart,
} from 'react-icons/fi';
import { FaWhatsapp } from 'react-icons/fa';
import toast from 'react-hot-toast';
import axiosInstance from '@/utils/axiosInstance';

const STATUS_CONFIG = {
  draft: { label: 'Draft Proposal', bg: 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300', dot: 'bg-slate-400' },
  generated: { label: 'Official Proposal', bg: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400', dot: 'bg-blue-500' },
  sent: { label: 'Issued to You', bg: 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-900/30 dark:text-indigo-400', dot: 'bg-indigo-500' },
  viewed: { label: 'Reviewed', bg: 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-900/30 dark:text-purple-400', dot: 'bg-purple-500' },
  follow_up_pending: { label: 'In Negotiation', bg: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400', dot: 'bg-amber-500' },
  interested: { label: 'Interested', bg: 'bg-cyan-50 text-cyan-700 border-cyan-200 dark:bg-cyan-900/30 dark:text-cyan-400', dot: 'bg-cyan-500' },
  negotiation: { label: 'Commercial Review', bg: 'bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-900/30 dark:text-orange-400', dot: 'bg-orange-500' },
  order_expected: { label: 'Order Expected', bg: 'bg-teal-50 text-teal-700 border-teal-200 dark:bg-teal-900/30 dark:text-teal-400', dot: 'bg-teal-500' },
  converted: { label: 'Converted to Order', bg: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400', dot: 'bg-emerald-500' },
  expired: { label: 'Expired', bg: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-900/30 dark:text-rose-400', dot: 'bg-rose-500' },
  lost: { label: 'Archived', bg: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400', dot: 'bg-red-500' },
  revised: { label: 'Superseded (Revised)', bg: 'bg-gray-100 text-gray-600 border-gray-200 dark:bg-gray-800 dark:text-gray-400', dot: 'bg-gray-400' },
};

function formatINR(paise) {
  if (paise == null || isNaN(paise)) return '₹0';
  const rupees = Math.round(paise / 100);
  return '₹' + rupees.toLocaleString('en-IN');
}

export default function EpcQuotations() {
  const navigate = useNavigate();
  const [quotes, setQuotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [downloadingId, setDownloadingId] = useState(null);
  const [search, setSearch] = useState('');
  const [statusTab, setStatusTab] = useState('all'); // all | drafts | active | converted
  const [errorState, setErrorState] = useState(null);

  // Fetch Quotes with auto-retry on transient network restart
  const fetchQuotes = useCallback(async (retryCount = 0) => {
    setLoading(true);
    setErrorState(null);
    try {
      const res = await axiosInstance.get('/india/v1/shop/quotes', {
        params: { limit: 100, sort_by: 'created_at', sort_dir: -1 }
      });
      if (res.data?.status === 'success' && res.data.data?.quotes) {
        setQuotes(res.data.data.quotes);
      } else {
        setQuotes([]);
      }
    } catch (err) {
      console.error('Failed to load EPC quotes:', err);
      // If backend was restarting (ERR_CONNECTION_REFUSED / Network Error), retry once after 1.5s
      if (retryCount === 0 && (err.message === 'Network Error' || err.code === 'ERR_NETWORK')) {
        setTimeout(() => fetchQuotes(1), 1500);
        return;
      }
      setErrorState(err.message === 'Network Error' ? 'Backend server connection refused. Please ensure backend is running on port 5000.' : (err.response?.data?.message || 'Unable to fetch your quotations.'));
      setQuotes([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchQuotes();
  }, [fetchQuotes]);

  // Handle PDF Download
  const handleDownloadPdf = async (e, quote) => {
    e.stopPropagation();
    const quoteId = quote._id;
    const refNumber = quote.quote_number || `DRAFT-${quoteId.slice(-6).toUpperCase()}`;

    setDownloadingId(quoteId);
    const toastId = toast.loading(`Generating PDF for ${refNumber}...`);

    try {
      const response = await axiosInstance.get(`/india/v1/shop/quotes/${quoteId}/pdf`, {
        responseType: 'blob',
      });

      const blob = new Blob([response.data], { type: 'application/pdf' });
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = `SolarKits-Quote-${refNumber}.pdf`;
      document.body.appendChild(link);
      link.click();
      window.URL.revokeObjectURL(downloadUrl);
      document.body.removeChild(link);

      toast.success(`Quotation ${refNumber} downloaded successfully!`, { id: toastId });
    } catch (err) {
      console.error('PDF download error:', err);
      toast.error('Failed to generate or download quotation PDF.', { id: toastId });
    } finally {
      setDownloadingId(null);
    }
  };

  // KPI Calculations
  const stats = useMemo(() => {
    const total = quotes.length;
    const drafts = quotes.filter(q => q.status === 'draft');
    const active = quotes.filter(q => !['converted', 'expired', 'lost', 'revised', 'draft'].includes(q.status));
    const converted = quotes.filter(q => q.status === 'converted');
    const trialKitsCount = quotes.filter(q => q.is_trial_kit || q.quote_type === 'trial_kit').length;

    const totalPipelineValue = quotes
      .filter(q => !['expired', 'lost', 'revised'].includes(q.status))
      .reduce((sum, q) => sum + (q.total_amount_paise || 0), 0);

    return {
      total,
      draftCount: drafts.length,
      activeCount: active.length,
      convertedCount: converted.length,
      trialKitsCount,
      totalPipelineValue,
    };
  }, [quotes]);

  // Filtered list
  const filteredQuotes = useMemo(() => {
    return quotes.filter(q => {
      // Tab filter
      if (statusTab === 'drafts' && q.status !== 'draft') return false;
      if (statusTab === 'active' && ['converted', 'expired', 'lost', 'revised', 'draft'].includes(q.status)) return false;
      if (statusTab === 'converted' && q.status !== 'converted') return false;
      if (statusTab === 'trial' && !q.is_trial_kit && q.quote_type !== 'trial_kit') return false;

      // Text search
      if (search.trim()) {
        const query = search.toLowerCase();
        const refNo = (q.quote_number || `DRAFT-${q._id.slice(-6)}`).toLowerCase();
        const kitName = (q.combo_kit_snapshot?.name || '').toLowerCase();
        const bdeName = (q.bde_snapshot?.full_name || '').toLowerCase();
        const franchiseeName = (q.franchisee_snapshot?.business_name || '').toLowerCase();
        const isTrialMatch = (q.is_trial_kit || q.quote_type === 'trial_kit') && 'trial'.includes(query);
        return refNo.includes(query) || kitName.includes(query) || bdeName.includes(query) || franchiseeName.includes(query) || isTrialMatch;
      }
      return true;
    });
  }, [quotes, statusTab, search]);

  return (
    <div className="space-y-6 pb-12 max-w-7xl mx-auto px-2 sm:px-4">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-primary via-primary-end to-primary rounded-2xl p-6 text-white shadow-md relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 opacity-10 pointer-events-none flex items-center pr-8">
          <FiFileText size={180} />
        </div>
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-sm text-xs font-semibold text-white/90 mb-2">
              <FiShield className="text-accent" /> Verified SolarKits Commercial Proposals
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              My Quotations & Project Proposals
            </h1>
            <p className="text-sm text-white/80 max-w-2xl mt-1">
              Review and download official quotations and draft estimates drafted specifically for your projects by your assigned SolarKits BDEs and Franchisee Partners.
            </p>
          </div>
          <button
            onClick={fetchQuotes}
            disabled={loading}
            className="self-start md:self-auto inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/15 hover:bg-white/25 backdrop-blur-sm transition font-semibold text-sm border border-white/20 shrink-0"
          >
            <FiRefreshCw className={loading ? 'animate-spin' : ''} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-surface p-4 rounded-xl border border-border shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-text-secondary uppercase tracking-wider">Total Received</span>
            <div className="w-8 h-8 rounded-lg bg-primary-50 dark:bg-primary-900/30 text-primary flex items-center justify-center">
              <FiFileText className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-black text-text-primary">{stats.total}</span>
            <span className="text-xs text-text-muted">Proposals</span>
          </div>
        </div>

        <div className="bg-surface p-4 rounded-xl border border-border shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-text-secondary uppercase tracking-wider">Draft Estimates</span>
            <div className="w-8 h-8 rounded-lg bg-amber-50 dark:bg-amber-900/30 text-amber-600 flex items-center justify-center">
              <FiAlertCircle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-black text-amber-600">{stats.draftCount}</span>
            <span className="text-xs text-amber-600/80 font-medium">BDE Prepared</span>
          </div>
        </div>

        <div className="bg-surface p-4 rounded-xl border border-border shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-text-secondary uppercase tracking-wider">Active Proposals</span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-900/30 text-blue-600 flex items-center justify-center">
              <FiClock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-black text-blue-600">{stats.activeCount}</span>
            <span className="text-xs text-blue-600/80 font-medium">Ready to order</span>
          </div>
        </div>

        <div className="bg-surface p-4 rounded-xl border border-border shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-text-secondary uppercase tracking-wider">Total Proposal Value</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 flex items-center justify-center">
              <FiDollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-xl font-black text-emerald-600">{formatINR(stats.totalPipelineValue)}</span>
            <span className="text-xs text-emerald-600/80 font-medium">Incl. Taxes</span>
          </div>
        </div>
      </div>

      {/* Filter Tabs & Search Controls */}
      <div className="bg-surface p-4 rounded-xl border border-border shadow-xs flex flex-col md:flex-row gap-4 items-center justify-between">
        {/* Status Filter Tabs */}
        <div className="flex items-center gap-1.5 p-1 bg-bg rounded-xl border border-border w-full md:w-auto overflow-x-auto">
          {[
            { id: 'all', label: `All Quotes (${stats.total})` },
            { id: 'drafts', label: `Drafts (${stats.draftCount})` },
            { id: 'active', label: `Active (${stats.activeCount})` },
            { id: 'trial', label: `Trial Kits (${stats.trialKitsCount})` },
            { id: 'converted', label: `Converted (${stats.convertedCount})` },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setStatusTab(tab.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition whitespace-nowrap ${statusTab === tab.id
                  ? 'bg-primary text-white shadow-xs'
                  : 'text-text-secondary hover:text-text-primary hover:bg-surface'
                }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search Bar */}
        <div className="relative w-full md:w-80">
          <FiSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by quote ref, kit name, BDE..."
            className="w-full pl-9 pr-4 py-2 bg-bg border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-text-primary placeholder:text-text-muted"
          />
        </div>
      </div>

      {/* Quotations List */}
      {loading ? (
        <div className="bg-surface rounded-2xl border border-border p-12 text-center">
          <FiRefreshCw className="w-8 h-8 text-primary animate-spin mx-auto mb-3" />
          <p className="text-text-secondary font-medium">Fetching your quotations...</p>
        </div>
      ) : errorState ? (
        <div className="bg-surface rounded-2xl border border-border p-12 text-center max-w-lg mx-auto">
          <div className="w-16 h-16 rounded-2xl bg-amber-50 dark:bg-amber-900/30 text-amber-600 flex items-center justify-center mx-auto mb-4">
            <FiAlertCircle size={32} />
          </div>
          <h3 className="text-lg font-bold text-text-primary">Server Connection Error</h3>
          <p className="text-sm text-text-secondary mt-1 mb-6">{errorState}</p>
          <button
            onClick={() => fetchQuotes(0)}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-white text-xs font-bold hover:bg-primary-hover transition shadow-sm"
          >
            <FiRefreshCw className="w-4 h-4" />
            <span>Retry Connection</span>
          </button>
        </div>
      ) : filteredQuotes.length === 0 ? (
        <div className="bg-surface rounded-2xl border border-border p-12 text-center max-w-lg mx-auto">
          <div className="w-16 h-16 rounded-2xl bg-primary-50 dark:bg-primary-900/30 text-primary flex items-center justify-center mx-auto mb-4">
            <FiFileText size={32} />
          </div>
          <h3 className="text-lg font-bold text-text-primary">No Quotations Found</h3>
          <p className="text-sm text-text-secondary mt-1 mb-6">
            {search.trim()
              ? 'No quotations matched your search criteria.'
              : statusTab !== 'all'
                ? `You currently do not have any ${statusTab} quotations.`
                : 'Your SolarKits BDE has not issued any quotations yet. When a BDE drafts or issues a quotation for you, it will appear here.'}
          </p>
          <button
            onClick={() => { setSearch(''); setStatusTab('all'); }}
            className="px-4 py-2 rounded-xl bg-primary text-white text-xs font-bold hover:bg-primary-hover transition"
          >
            Clear Filters
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredQuotes.map((q) => {
            const stCfg = STATUS_CONFIG[q.status] || STATUS_CONFIG.draft;
            const refNumber = q.quote_number || `DRAFT-${q._id.slice(-6).toUpperCase()}`;
            const isDraft = q.status === 'draft';
            const bdeName = q.bde_snapshot?.full_name || 'Assigned SolarKits BDE';
            const bdeMobile = q.bde_snapshot?.mobile || '';
            const kitSnap = q.combo_kit_snapshot || {};
            const kitName = kitSnap.name || `${q.kit_capacity_kw || 0} kW Solar Combo Kit`;
            const totalKw = q.total_kw || ((q.kit_capacity_kw || 0) * (q.quantity || 1));

            return (
              <motion.div
                key={q._id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-surface rounded-2xl border border-border hover:border-primary/40 hover:shadow-md transition-all duration-200 overflow-hidden"
              >
                <div className="p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-5">
                  {/* Left: Quote Reference, Badges & Combo Kit */}
                  <div className="space-y-3 flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-sm sm:text-base font-extrabold text-text-primary tracking-wide">
                        {refNumber}
                      </span>
                      {q.revision_number > 0 && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                          Rev {q.revision_number}
                        </span>
                      )}
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold border ${stCfg.bg}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${stCfg.dot}`} />
                        {stCfg.label}
                      </span>
                      {(q.is_trial_kit || q.quote_type === 'trial_kit') && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-black bg-purple-100 text-purple-900 border border-purple-300 dark:bg-purple-900/40 dark:text-purple-300 dark:border-purple-800">
                          <FiPackage className="w-3.5 h-3.5 text-purple-700" />
                          Trial Kit Proposal ({q.trial_kit_quantity || q.quantity} Kits)
                        </span>
                      )}
                      {isDraft && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/40 dark:text-amber-400">
                          BDE Draft Preview
                        </span>
                      )}
                    </div>

                    {/* Kit Details */}
                    <div>
                      <h4 className="text-base font-bold text-text-primary line-clamp-1 flex items-center gap-2">
                        <FiPackage className="text-primary shrink-0" />
                        <span>{kitName}</span>
                      </h4>
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1 text-xs text-text-secondary">
                        <span className="flex items-center gap-1">
                          <FiLayers className="text-text-muted" />
                          <span><strong>{q.quantity || 1}</strong> Units ({totalKw} kW Total)</span>
                        </span>
                        {q.delivery_address_snapshot?.district_name && (
                          <span>
                            📍 Delivery: {q.delivery_address_snapshot.district_name}, {q.delivery_address_snapshot.state_name}
                          </span>
                        )}
                        <span className="flex items-center gap-1 text-text-muted">
                          <FiCalendar />
                          <span>Issued: {new Date(q.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                        </span>
                      </div>
                    </div>

                    {/* BDE Contact info strip */}
                    <div className="inline-flex flex-wrap items-center gap-3 px-3 py-1.5 rounded-xl bg-bg border border-border text-xs text-text-secondary">
                      <span className="font-semibold text-text-primary flex items-center gap-1.5">
                        <FiUser className="text-accent" />
                        {bdeName}
                      </span>
                      {bdeMobile && (
                        <>
                          <span className="text-border">|</span>
                          <a
                            href={`tel:${bdeMobile}`}
                            onClick={(e) => e.stopPropagation()}
                            className="hover:text-primary transition flex items-center gap-1"
                          >
                            <FiPhone className="w-3 h-3 text-text-muted" />
                            <span>{bdeMobile}</span>
                          </a>
                          <a
                            href={`https://wa.me/91${bdeMobile.replace(/\D/g, '')}?text=Hi%20${encodeURIComponent(bdeName)},%20I%20am%20reviewing%20Quotation%20${encodeURIComponent(refNumber)}.`}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="text-emerald-600 hover:text-emerald-700 transition flex items-center gap-1 font-semibold"
                            title="Chat on WhatsApp"
                          >
                            <FaWhatsapp className="w-3.5 h-3.5" />
                            <span>WhatsApp</span>
                          </a>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Right: Commercials & Action Buttons */}
                  <div className="flex flex-col sm:flex-row lg:flex-col items-start sm:items-center lg:items-end justify-between gap-4 shrink-0 pt-4 lg:pt-0 border-t lg:border-t-0 border-border">
                    <div className="text-left lg:text-right">
                      <div className="text-xs text-text-muted font-medium">Total Commercial Value</div>
                      <div className="text-2xl font-black text-text-primary">
                        {formatINR(q.total_amount_paise)}
                      </div>
                      <div className="text-[11px] text-text-secondary">
                        Incl. GST ({q.gst_rate != null ? q.gst_rate : 5}%) & Delivery
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                      {/* Download PDF button */}
                      <button
                        onClick={(e) => handleDownloadPdf(e, q)}
                        disabled={downloadingId === q._id}
                        className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-primary-50 text-primary hover:bg-primary-100 dark:bg-primary-900/30 dark:hover:bg-primary-900/50 transition border border-primary/20 shadow-2xs"
                        title="Download official PDF quotation"
                      >
                        {downloadingId === q._id ? (
                          <FiRefreshCw className="w-3.5 h-3.5 animate-spin text-primary" />
                        ) : (
                          <FiDownload className="w-3.5 h-3.5 text-primary" />
                        )}
                        <span>PDF</span>
                      </button>

                      {/* View Details */}
                      <button
                        onClick={() => navigate(`/my-quotes/${q._id}`)}
                        className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-surface text-text-primary hover:bg-bg border border-border transition shadow-2xs"
                        title="View complete proposal details"
                      >
                        <FiEye className="w-3.5 h-3.5 text-text-muted" />
                        <span>Details</span>
                      </button>

                      {/* Checkout Quotation Button */}
                      {q.status === 'converted' ? (
                        <span className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1 px-3 py-2 rounded-xl text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <FiCheckCircle className="w-3.5 h-3.5" />
                          <span>Ordered</span>
                        </span>
                      ) : q.status === 'expired' ? (
                        <span className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1 px-3 py-2 rounded-xl text-xs font-semibold bg-rose-50 text-rose-600 border border-rose-200">
                          <FiClock className="w-3.5 h-3.5" />
                          <span>Expired</span>
                        </span>
                      ) : isDraft ? (
                        <span className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1 px-3 py-2 rounded-xl text-xs font-medium bg-slate-100 text-slate-600 border border-slate-200">
                          <span>BDE Review</span>
                        </span>
                      ) : (
                        <button
                          onClick={() => navigate(`/checkout?quote_id=${q._id}`)}
                          className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-extrabold bg-primary hover:bg-primary-hover text-white transition shadow-sm hover:shadow active:scale-95"
                          title="Checkout this quotation"
                        >
                          <FiShoppingCart className="w-3.5 h-3.5" />
                          <span>Checkout</span>
                          <FiArrowRight className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}

