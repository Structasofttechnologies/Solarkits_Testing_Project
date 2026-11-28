import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  FiArrowLeft,
  FiDownload,
  FiCalendar,
  FiPackage,
  FiLayers,
  FiTruck,
  FiShield,
  FiUser,
  FiPhone,
  FiMail,
  FiCheckCircle,
  FiAlertCircle,
  FiClock,
  FiFileText,
  FiDollarSign,
  FiRefreshCw,
  FiExternalLink,
  FiHelpCircle,
  FiInfo,
  FiCheck,
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

export default function EpcQuoteDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [quote, setQuote] = useState(null);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState('');

  // Fetch Quote Detail with auto-retry on transient restart
  const fetchQuote = useCallback(async (retryCount = 0) => {
    setLoading(true);
    setError('');
    try {
      const res = await axiosInstance.get(`/india/v1/shop/quotes/${id}`);
      if (res.data?.status === 'success' && res.data.data) {
        setQuote(res.data.data);
      } else {
        setError('Quotation details could not be retrieved.');
      }
    } catch (err) {
      console.error('Failed to load quote detail:', err);
      if (retryCount === 0 && (err.message === 'Network Error' || err.code === 'ERR_NETWORK')) {
        setTimeout(() => fetchQuote(1), 1500);
        return;
      }
      setError(err.message === 'Network Error' ? 'Server connection error. Please verify the backend is running.' : (err.response?.data?.message || 'Quotation not found or you do not have permission to view it.'));
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchQuote();
  }, [fetchQuote]);

  // Handle PDF Download
  const handleDownloadPdf = async () => {
    if (!quote) return;
    const refNumber = quote.quote_number || `DRAFT-${quote._id.slice(-6).toUpperCase()}`;
    setDownloading(true);
    const toastId = toast.loading(`Generating PDF for ${refNumber}...`);

    try {
      const response = await axiosInstance.get(`/india/v1/shop/quotes/${quote._id}/pdf`, {
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
      toast.error('Failed to download quotation PDF.', { id: toastId });
    } finally {
      setDownloading(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto p-12 text-center">
        <FiRefreshCw className="w-8 h-8 text-primary animate-spin mx-auto mb-3" />
        <p className="text-text-secondary font-medium">Loading quotation details...</p>
      </div>
    );
  }

  if (error || !quote) {
    return (
      <div className="max-w-xl mx-auto p-8 bg-surface rounded-2xl border border-border text-center my-12">
        <div className="w-12 h-12 rounded-xl bg-red-50 text-red-600 flex items-center justify-center mx-auto mb-3">
          <FiAlertCircle size={24} />
        </div>
        <h3 className="text-lg font-bold text-text-primary">Quotation Not Available</h3>
        <p className="text-sm text-text-secondary mt-1 mb-6">{error || 'This quote does not exist or has expired.'}</p>
        <button
          onClick={() => navigate('/my-quotes')}
          className="px-4 py-2 rounded-xl bg-primary text-white text-xs font-bold hover:bg-primary-hover transition"
        >
          Back to My Quotations
        </button>
      </div>
    );
  }

  const stCfg = STATUS_CONFIG[quote.status] || STATUS_CONFIG.draft;
  const refNumber = quote.quote_number || `DRAFT-${quote._id.slice(-6).toUpperCase()}`;
  const isDraft = quote.status === 'draft';
  const bdeName = quote.bde_snapshot?.full_name || 'Assigned SolarKits BDE';
  const bdeMobile = quote.bde_snapshot?.mobile || '';
  const bdeEmail = quote.bde_snapshot?.email || '';
  const bdeCode = quote.bde_snapshot?.bde_id_code || '';
  const franchiseeName = quote.franchisee_snapshot?.business_name || null;
  const kitSnap = quote.combo_kit_snapshot || {};
  const kitName = kitSnap.name || `${quote.kit_capacity_kw || 0} kW Solar Combo Kit`;
  const totalKw = quote.total_kw || ((quote.kit_capacity_kw || 0) * (quote.quantity || 1));

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-16 px-2 sm:px-4">
      {/* Top Navigation Strip */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <Link
          to="/my-quotes"
          className="inline-flex items-center gap-2 text-sm font-semibold text-text-secondary hover:text-primary transition"
        >
          <FiArrowLeft className="w-4 h-4" />
          <span>Back to All Quotations</span>
        </Link>

        <div className="flex flex-wrap items-center gap-2">
          {bdeMobile && (
            <a
              href={`https://wa.me/91${bdeMobile.replace(/\D/g, '')}?text=Hi%20${encodeURIComponent(bdeName)},%20I%20am%20reviewing%20Quotation%20${encodeURIComponent(refNumber)}.`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 transition"
            >
              <FaWhatsapp className="w-4 h-4" />
              <span>Contact BDE</span>
            </a>
          )}

          <button
            onClick={handleDownloadPdf}
            disabled={downloading}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold bg-surface text-text-primary hover:bg-bg border border-border shadow-xs transition"
          >
            {downloading ? <FiRefreshCw className="w-4 h-4 animate-spin text-primary" /> : <FiDownload className="w-4 h-4 text-primary" />}
            <span>Download PDF</span>
          </button>

          {/* Accept & Checkout CTA */}
          {quote.status === 'converted' ? (
            <span className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
              <FiCheckCircle className="w-4 h-4 text-emerald-600" />
              <span>Order Converted</span>
            </span>
          ) : quote.status === 'expired' ? (
            <span className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-rose-50 text-rose-600 border border-rose-200">
              <FiClock className="w-4 h-4" />
              <span>Proposal Expired</span>
            </span>
          ) : isDraft ? (
            <span className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-slate-100 text-slate-600 border border-slate-200">
              <span>BDE Preparing</span>
            </span>
          ) : (
            <button
              onClick={() => navigate(`/checkout?quote_id=${quote._id}`)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black bg-primary hover:bg-primary-hover text-white shadow-sm transition transform active:scale-95"
            >
              <FiShoppingCart className="w-4 h-4" />
              <span>Accept & Checkout</span>
            </button>
          )}
        </div>
      </div>

      {/* Trial Kit Proposal Notice Banner if applicable */}
      {(quote.is_trial_kit || quote.quote_type === 'trial_kit') && (
        <div className="bg-gradient-to-r from-purple-50 via-indigo-50 to-purple-50 dark:from-purple-950/40 dark:via-indigo-950/40 dark:to-purple-950/40 border border-purple-200 dark:border-purple-800 rounded-2xl p-4 flex items-start gap-3 shadow-xs">
          <div className="w-9 h-9 rounded-xl bg-purple-600 text-white flex items-center justify-center shrink-0 shadow-xs">
            <FiPackage className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="text-sm font-bold text-purple-950 dark:text-purple-200">
              Official SolarKits Trial Kit Evaluation Proposal
            </h4>
            <p className="text-xs text-purple-900/80 dark:text-purple-300/80 mt-0.5 leading-relaxed">
              This quotation has been customized by your assigned BDE specifically for field testing & evaluation. The trial kit quantity (<strong>{quote.trial_kit_quantity || quote.quantity} Kits</strong>) is pre-configured according to SolarKits Admin Trial guidelines to allow your team to verify assembly, performance, and BOP integration.
            </p>
          </div>
        </div>
      )}

      {/* Main Quote Title Card */}
      <div className="bg-surface rounded-2xl border border-border p-6 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-border">
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <span className="font-mono text-xl sm:text-2xl font-black text-text-primary tracking-wide">
                {refNumber}
              </span>
              {(quote.is_trial_kit || quote.quote_type === 'trial_kit') && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-purple-100 text-purple-900 border border-purple-300 dark:bg-purple-900/40 dark:text-purple-300 dark:border-purple-800">
                  <FiPackage className="w-3.5 h-3.5 text-purple-700" />
                  Trial Kit Proposal ({quote.trial_kit_quantity || quote.quantity} Kits)
                </span>
              )}
              {quote.revision_number > 0 && (
                <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                  Revision {quote.revision_number}
                </span>
              )}
              <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${stCfg.bg}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${stCfg.dot}`} />
                {stCfg.label}
              </span>
              {isDraft && (
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/40 dark:text-amber-400">
                  Draft Proposal for Review
                </span>
              )}
            </div>
            <p className="text-xs text-text-muted flex items-center gap-2">
              <FiCalendar />
              <span>Issued on {new Date(quote.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })}</span>
              {quote.valid_until && (
                <>
                  <span>•</span>
                  <span>Valid until {new Date(quote.valid_until).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })}</span>
                </>
              )}
            </p>
          </div>

          <div className="text-left md:text-right">
            <span className="text-xs text-text-muted font-medium">Total Proposal Amount</span>
            <div className="text-3xl font-black text-text-primary">
              {formatINR(quote.total_amount_paise)}
            </div>
            <span className="text-xs text-emerald-600 font-semibold">
              Tax inclusive (GST {quote.gst_rate != null ? quote.gst_rate : 5}%)
            </span>
          </div>
        </div>

        {/* Assigned BDE & Channel Partner Strip */}
        <div className="pt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-3.5 rounded-xl bg-bg border border-border flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary-50 dark:bg-primary-900/30 text-primary flex items-center justify-center shrink-0">
              <FiUser className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[11px] font-bold text-text-muted uppercase tracking-wider">
                Prepared by Your BDE
              </div>
              <div className="font-bold text-text-primary text-sm truncate">
                {bdeName} {bdeCode && <span className="text-xs text-text-muted font-normal">({bdeCode})</span>}
              </div>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-xs text-text-secondary">
                {bdeMobile && (
                  <a href={`tel:${bdeMobile}`} className="hover:text-primary transition flex items-center gap-1">
                    <FiPhone className="w-3 h-3 text-text-muted" />
                    <span>{bdeMobile}</span>
                  </a>
                )}
                {bdeEmail && (
                  <a href={`mailto:${bdeEmail}`} className="hover:text-primary transition flex items-center gap-1 truncate">
                    <FiMail className="w-3 h-3 text-text-muted" />
                    <span className="truncate">{bdeEmail}</span>
                  </a>
                )}
              </div>
            </div>
          </div>

          {franchiseeName ? (
            <div className="p-3.5 rounded-xl bg-bg border border-border flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-accent-50 dark:bg-accent-900/30 text-accent flex items-center justify-center shrink-0">
                <FiPackage className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[11px] font-bold text-text-muted uppercase tracking-wider">
                  Assigned Franchisee Partner
                </div>
                <div className="font-bold text-text-primary text-sm truncate">
                  {franchiseeName}
                </div>
                <div className="text-xs text-text-secondary mt-1">
                  {quote.franchisee_snapshot?.mobile || 'Authorized SolarKits District Partner'}
                </div>
              </div>
            </div>
          ) : (
            <div className="p-3.5 rounded-xl bg-bg border border-border flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-900/30 text-blue-600 flex items-center justify-center shrink-0">
                <FiShield className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[11px] font-bold text-text-muted uppercase tracking-wider">
                  Fulfillment Channel
                </div>
                <div className="font-bold text-text-primary text-sm truncate">
                  SolarKits Direct Distribution
                </div>
                <div className="text-xs text-text-secondary mt-1">
                  Dispatched directly from Company Hub Warehouse
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Two Column Layout: Commercials & Technical Specs */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (2 cols): Combo Kit & BOM Specifications */}
        <div className="lg:col-span-2 space-y-6">
          {/* Combo Kit Overview */}
          <div className="bg-surface rounded-2xl border border-border p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-text-primary flex items-center gap-2">
                <FiPackage className="text-primary" />
                <span>Combo Kit Specifications</span>
              </h3>
              <span className="px-2.5 py-1 rounded-lg bg-primary-50 dark:bg-primary-900/30 text-primary font-bold text-xs">
                {quote.kit_capacity_kw || kitSnap.capacity_kw || 0} kW System
              </span>
            </div>

            <div className="p-4 rounded-xl bg-bg border border-border">
              <h4 className="font-bold text-base text-text-primary">{kitName}</h4>
              <p className="text-xs text-text-secondary mt-1">
                {kitSnap.description || 'Pre-engineered, tested and authorized complete solar kit with guaranteed electrical compatibility.'}
              </p>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 pt-4 border-t border-border text-center">
                <div className="p-2 rounded-lg bg-surface border border-border/60">
                  <span className="text-[10px] text-text-muted font-bold uppercase">System Size</span>
                  <div className="font-black text-sm text-text-primary">{quote.kit_capacity_kw || 0} kW</div>
                </div>
                <div className="p-2 rounded-lg bg-surface border border-border/60">
                  <span className="text-[10px] text-text-muted font-bold uppercase">
                    {(quote.is_trial_kit || quote.quote_type === 'trial_kit') ? 'Trial Quantity' : 'Quantity'}
                  </span>
                  <div className="font-black text-sm text-text-primary">
                    {quote.trial_kit_quantity || quote.quantity || 1} Units
                    {(quote.is_trial_kit || quote.quote_type === 'trial_kit') && (
                      <span className="block text-[10px] text-purple-600 font-bold">Admin Pack</span>
                    )}
                  </div>
                </div>
                <div className="p-2 rounded-lg bg-surface border border-border/60">
                  <span className="text-[10px] text-text-muted font-bold uppercase">Total Capacity</span>
                  <div className="font-black text-sm text-text-primary">{totalKw} kW</div>
                </div>
                <div className="p-2 rounded-lg bg-surface border border-border/60">
                  <span className="text-[10px] text-text-muted font-bold uppercase">Rate per Kit</span>
                  <div className="font-black text-sm text-text-primary">{formatINR(quote.price_per_kit_paise)}</div>
                </div>
              </div>
            </div>

            {/* Bill of Materials (BOM) Sub-Components */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-text-muted">
                Key Components Included in This Combo Kit
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Solar Panels */}
                <div className="p-3.5 rounded-xl border border-border bg-surface flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                    <FiLayers className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-text-muted uppercase">Solar PV Modules</span>
                    <div className="font-bold text-xs text-text-primary">
                      {kitSnap.panel_brand || 'Tier-1 Mono PERC / TOPCon'}
                    </div>
                    <div className="text-[11px] text-text-secondary mt-0.5">
                      High-efficiency DCR compliant modules
                    </div>
                  </div>
                </div>

                {/* Solar Inverter */}
                <div className="p-3.5 rounded-xl border border-border bg-surface flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                    <FiPackage className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-text-muted uppercase">Grid-Tie Inverter</span>
                    <div className="font-bold text-xs text-text-primary">
                      {kitSnap.inverter_brand || 'Smart MPPT Solar Inverter'}
                    </div>
                    <div className="text-[11px] text-text-secondary mt-0.5">
                      Built-in protection with Wi-Fi monitoring
                    </div>
                  </div>
                </div>

                {/* BOS & Protection Kit */}
                <div className="p-3.5 rounded-xl border border-border bg-surface flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                    <FiShield className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-text-muted uppercase">BOS & Protection</span>
                    <div className="font-bold text-xs text-text-primary">
                      ACDB / DCDB, Solar Cable & MC4
                    </div>
                    <div className="text-[11px] text-text-secondary mt-0.5">
                      {kitSnap.bos_details || 'Full electrical balance-of-system kit included'}
                    </div>
                  </div>
                </div>

                {/* Structure / Mounting */}
                <div className="p-3.5 rounded-xl border border-border bg-surface flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
                    <FiCheckCircle className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-text-muted uppercase">Warranty & Assurance</span>
                    <div className="font-bold text-xs text-text-primary">
                      {quote.warranty_snapshot?.name || 'Standard Manufacturer Warranty'}
                    </div>
                    <div className="text-[11px] text-text-secondary mt-0.5">
                      25-year panel performance, 5-8 year inverter warranty
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Delivery & Site Information */}
          <div className="bg-surface rounded-2xl border border-border p-6 shadow-xs">
            <h3 className="text-base font-bold text-text-primary flex items-center gap-2 mb-4">
              <FiTruck className="text-primary" />
              <span>Delivery Site & Dispatch Details</span>
            </h3>

            <div className="p-4 rounded-xl bg-bg border border-border text-sm space-y-2">
              <div className="flex items-start gap-2">
                <span className="font-semibold text-text-primary min-w-28">Destination:</span>
                <span className="text-text-secondary">
                  {quote.delivery_address_snapshot?.shipping_address_line1 || quote.delivery_address_snapshot?.address || 'Site Address as per Onboarding Record'}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-semibold text-text-primary min-w-28">District / State:</span>
                <span className="text-text-secondary">
                  {quote.delivery_address_snapshot?.district_name || quote.territory?.district_name || 'N/A'}, {quote.delivery_address_snapshot?.state_name || quote.territory?.state_name || 'N/A'} - {quote.delivery_address_snapshot?.pincode || 'N/A'}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-semibold text-text-primary min-w-28">Contact Person:</span>
                <span className="text-text-secondary">
                  {quote.delivery_address_snapshot?.contact_person || quote.epc_snapshot?.contact_person || 'Client Incharge'} ({quote.delivery_address_snapshot?.mobile || quote.epc_snapshot?.mobile || 'N/A'})
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-semibold text-text-primary min-w-28">Dispatch Mode:</span>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-primary-50 text-primary">
                  {quote.delivery_type === 'franchisee_warehouse' ? 'Franchisee Hub Pickup' : 'Direct EPC Site Delivery'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column (1 col): Commercial Breakdown & Terms */}
        <div className="space-y-6">
          {/* Price Breakdown Card */}
          <div className="bg-surface rounded-2xl border border-border p-6 shadow-xs space-y-4">
            <h3 className="text-base font-bold text-text-primary flex items-center gap-2">
              <FiDollarSign className="text-primary" />
              <span>Commercial Breakdown</span>
            </h3>

            <div className="space-y-3 text-sm divide-y divide-border">
              <div className="flex justify-between items-center pt-2">
                <span className="text-text-secondary">Combo Kit Rate (Base):</span>
                <span className="font-semibold text-text-primary">{formatINR(quote.price_per_kit_paise)}</span>
              </div>

              <div className="flex justify-between items-center pt-2">
                <span className="text-text-secondary">Quantity:</span>
                <span className="font-semibold text-text-primary">{quote.quantity || 1} Units</span>
              </div>

              <div className="flex justify-between items-center pt-2">
                <span className="text-text-secondary">Product Subtotal:</span>
                <span className="font-semibold text-text-primary">{formatINR(quote.product_subtotal_paise)}</span>
              </div>

              <div className="flex justify-between items-center pt-2">
                <span className="text-text-secondary">Warranty Option:</span>
                <span className="font-semibold text-text-primary">{formatINR(quote.warranty_charges_paise || 0)}</span>
              </div>

              <div className="flex justify-between items-center pt-2">
                <span className="text-text-secondary">Freight & Delivery:</span>
                <span className="font-semibold text-text-primary">{formatINR(quote.delivery_charges_paise || 0)}</span>
              </div>

              <div className="flex justify-between items-center pt-2 font-bold">
                <span className="text-text-primary">Taxable Amount:</span>
                <span className="text-text-primary">{formatINR(quote.taxable_amount_paise)}</span>
              </div>

              <div className="flex justify-between items-center pt-2 text-text-secondary">
                <span>Applicable GST ({quote.gst_rate != null ? quote.gst_rate : 5}%):</span>
                <span className="font-semibold text-text-primary">{formatINR(quote.gst_amount_paise)}</span>
              </div>

              <div className="flex justify-between items-center pt-3 font-black text-lg text-primary">
                <span>Total Amount:</span>
                <span>{formatINR(quote.total_amount_paise)}</span>
              </div>
            </div>

            {/* Accept & Checkout Proposal Button */}
            {quote.status === 'converted' ? (
              <div className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200 font-bold text-xs mt-4">
                <FiCheckCircle className="w-4 h-4 text-emerald-600" />
                <span>Proposal Converted to Order</span>
              </div>
            ) : quote.status === 'expired' ? (
              <div className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-rose-50 text-rose-700 border border-rose-200 font-bold text-xs mt-4">
                <FiClock className="w-4 h-4" />
                <span>Quotation Expired</span>
              </div>
            ) : isDraft ? (
              <div className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-amber-50 text-amber-800 border border-amber-200 font-bold text-xs mt-4">
                <FiAlertCircle className="w-4 h-4 text-amber-600" />
                <span>Draft Preview (BDE is finalizing)</span>
              </div>
            ) : (
              <button
                onClick={() => navigate(`/checkout?quote_id=${quote._id}`)}
                className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-primary hover:bg-primary-hover text-white font-extrabold text-sm shadow-md transition transform active:scale-95 mt-4"
              >
                <FiShoppingCart className="w-4 h-4" />
                <span>Accept & Proceed to Checkout</span>
              </button>
            )}

            {/* Download PDF Action */}
            <button
              onClick={handleDownloadPdf}
              disabled={downloading}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-surface hover:bg-bg border border-border text-text-primary font-bold text-xs shadow-2xs transition mt-2"
            >
              {downloading ? (
                <FiRefreshCw className="w-4 h-4 animate-spin text-primary" />
              ) : (
                <FiDownload className="w-4 h-4 text-primary" />
              )}
              <span>Download PDF Quotation</span>
            </button>
          </div>

          {/* Terms & Validity Card */}
          <div className="bg-surface rounded-2xl border border-border p-6 shadow-xs space-y-3">
            <h3 className="text-sm font-bold uppercase tracking-wider text-text-muted flex items-center gap-2">
              <FiInfo className="text-primary" />
              <span>Proposal Terms</span>
            </h3>

            <div className="space-y-3 text-xs text-text-secondary">
              <div>
                <strong className="text-text-primary block mb-0.5">Payment Terms:</strong>
                <p>{quote.terms_snapshot?.payment_terms || '100% advance payment against proforma invoice before dispatch.'}</p>
              </div>

              <div>
                <strong className="text-text-primary block mb-0.5">Delivery Timeline:</strong>
                <p>{quote.terms_snapshot?.delivery_terms || 'Dispatched within 3-5 business days upon payment confirmation.'}</p>
              </div>

              <div>
                <strong className="text-text-primary block mb-0.5">Quotation Validity:</strong>
                <p>Prices quoted are valid for 15 days from issuance date.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

