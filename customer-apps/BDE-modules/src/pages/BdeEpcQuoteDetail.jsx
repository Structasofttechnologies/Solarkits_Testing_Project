import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Download,
  Share2,
  Calendar,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  FileText,
  Users,
  Truck,
  Box,
  ShieldCheck,
  Clock,
  DollarSign,
  Check,
  X,
  Mail,
  Send,
  Store,
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

export default function BdeEpcQuoteDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [quote, setQuote] = useState(null);
  const [activities, setActivities] = useState([]);
  const [followups, setFollowups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('followups');

  // Modals
  const [showShareModal, setShowShareModal] = useState(false);
  const [shareMethod, setShareMethod] = useState('email');
  const [shareRecipient, setShareRecipient] = useState('');
  const [sharing, setSharing] = useState(false);

  const [showFuModal, setShowFuModal] = useState(false);
  const [fuForm, setFuForm] = useState({
    next_follow_up_date: new Date(Date.now() + 3 * 86400000).toISOString().split('T')[0],
    follow_up_mode: 'call',
    remarks: '',
    expected_quantity: 1,
    expected_order_date: '',
    expected_order_value_inr: '',
    probability_pct: 60,
    status: 'pending',
  });
  const [savingFu, setSavingFu] = useState(false);

  const [showConvertModal, setShowConvertModal] = useState(false);
  const [orderType, setOrderType] = useState('epc_order');
  const [converting, setConverting] = useState(false);

  const fetchQuoteDetail = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.get(`/quotes/${id}`);
      if (res.data?.status === 'success') {
        setQuote(res.data.data?.quote || res.data.data);
        setActivities(Array.isArray(res.data.data?.activities) ? res.data.data.activities : []);
        setFollowups(Array.isArray(res.data.data?.followups) ? res.data.data.followups : []);
        if (res.data.data?.quote?.epc_snapshot?.email) {
          setShareRecipient(res.data.data.quote.epc_snapshot.email);
        }
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load quotation.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchQuoteDetail();
  }, [fetchQuoteDetail]);

  const handleDownloadPdf = async () => {
    try {
      const res = await api.get(`/quotes/${id}/pdf`, { responseType: 'blob' });
      const blob = new Blob([res.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${quote?.quote_number || 'Quotation'}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      alert('Failed to download PDF.');
    }
  };

  const handleShareSubmit = async (e) => {
    e.preventDefault();
    setSharing(true);
    try {
      const res = await api.post(`/quotes/${id}/share`, {
        method: shareMethod,
        recipient: shareRecipient.trim(),
      });
      if (res.data?.status === 'success') {
        alert('Quotation shared successfully!');
        setShowShareModal(false);
        fetchQuoteDetail();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to share quote.');
    } finally {
      setSharing(false);
    }
  };

  const handleFollowupSubmit = async (e) => {
    e.preventDefault();
    setSavingFu(true);
    try {
      const payload = {
        ...fuForm,
        expected_order_value_paise: fuForm.expected_order_value_inr ? Number(fuForm.expected_order_value_inr) * 100 : undefined,
      };
      delete payload.expected_order_value_inr;

      const res = await api.post(`/quotes/${id}/follow-ups`, payload);
      if (res.data?.status === 'success') {
        setShowFuModal(false);
        fetchQuoteDetail();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to schedule follow-up.');
    } finally {
      setSavingFu(false);
    }
  };

  const handleReviseQuote = async () => {
    if (!window.confirm('Generate a revised version of this quote? The current quote will be marked as Revised.')) return;
    try {
      const res = await api.post(`/quotes/${id}/revise`, {
        reason: 'Commercial terms updated by BDE',
      });
      if (res.data?.status === 'success') {
        alert('New revision created!');
        navigate(`/epc-quotes/${res.data.data._id}`);
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to revise quotation.');
    }
  };

  const handleConvertSubmit = async (e) => {
    e.preventDefault();
    setConverting(true);
    try {
      const res = await api.post(`/quotes/${id}/convert-order`, {
        order_type: orderType,
      });
      if (res.data?.status === 'success') {
        setShowConvertModal(false);
        alert(`Quote successfully converted to order #${res.data.data.order_number}!`);
        fetchQuoteDetail();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to convert quote.');
    } finally {
      setConverting(false);
    }
  };

  if (loading) {
    return (
      <div className="py-20 text-center">
        <div className="inline-block w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (error || !quote) {
    return (
      <div className="py-16 text-center space-y-3">
        <AlertTriangle className="w-10 h-10 text-red-500 mx-auto" />
        <h2 className="text-base font-bold text-slate-800">Quotation Not Found</h2>
        <p className="text-xs text-slate-400">{error || 'Quote record unavailable or unauthorized.'}</p>
        <Link to="/epc-quotes" className="inline-block px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-semibold">
          Return to Quotes
        </Link>
      </div>
    );
  }

  const stCfg = STATUS_CONFIG[quote.status] || STATUS_CONFIG.draft;
  const isExpired = quote.valid_until && new Date(quote.valid_until) < new Date() && quote.status !== 'converted';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Link
          to="/epc-quotes"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 transition"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Quotations
        </Link>
        <span className="text-xs text-slate-400 font-medium">
          Created: {new Date(quote.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
        </span>
      </div>

      {/* Header Bar */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-2xl font-bold font-mono text-slate-900">{quote.quote_number}</h1>
            {quote.is_trial_kit && (
              <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-purple-100 text-purple-900 border border-purple-200">
                Trial Kit Proposal ({quote.trial_kit_quantity || quote.quantity} Kits)
              </span>
            )}
            {quote.revision_number > 0 && (
              <span className="px-2 py-0.5 rounded text-xs font-bold bg-slate-100 text-slate-600">
                Revision {quote.revision_number}
              </span>
            )}
            <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${stCfg.bg}`}>
              {stCfg.label}
            </span>
          </div>

          <p className="text-xs text-slate-500 mt-1">
            Client: <strong className="text-slate-800">{quote.epc_snapshot?.company_name}</strong>
            {quote.valid_until && (
              <span>
                {' '}• Valid until:{' '}
                <strong className={isExpired ? 'text-red-600 font-bold' : 'text-slate-800'}>
                  {new Date(quote.valid_until).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                  {isExpired && ' (Expired)'}
                </strong>
              </span>
            )}
          </p>
        </div>

        {/* Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleDownloadPdf}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs font-bold text-slate-700 hover:bg-slate-100 transition shadow-sm"
          >
            <Download className="w-4 h-4" /> PDF
          </button>

          <button
            onClick={() => setShowShareModal(true)}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs font-bold text-slate-700 hover:bg-slate-100 transition shadow-sm"
          >
            <Share2 className="w-4 h-4" /> Share
          </button>

          <button
            onClick={() => setShowFuModal(true)}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-amber-50 text-amber-700 text-xs font-bold hover:bg-amber-100 transition border border-amber-200"
          >
            <Calendar className="w-4 h-4" /> Add Follow-up
          </button>

          {quote.status !== 'converted' && (
            <button
              onClick={handleReviseQuote}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 transition"
            >
              <RotateCcw className="w-3.5 h-3.5" /> Revise
            </button>
          )}

          {quote.status !== 'converted' && !quote.converted_order_id && (
            <button
              onClick={() => setShowConvertModal(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-sm transition"
            >
              <CheckCircle2 className="w-4 h-4" /> Convert to Order
            </button>
          )}
        </div>
      </div>

      {/* Converted Order Info */}
      {quote.converted_order_id && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-bold text-sm text-emerald-900">Converted to Official Order</h4>
              <p className="text-xs text-emerald-700 mt-0.5">
                Reference: <span className="font-mono font-bold">{quote.converted_order_id}</span> ({quote.converted_order_type})
              </p>
            </div>
          </div>
          <Link
            to="/order-history"
            className="px-3.5 py-1.5 rounded-xl bg-emerald-600 text-white text-xs font-bold shadow-sm hover:bg-emerald-700 transition"
          >
            View in Orders
          </Link>
        </div>
      )}

      {/* 5 Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-2">
          <div className="flex items-center gap-2 text-slate-400 text-xs font-bold uppercase tracking-wider">
            <Users className="w-4 h-4" />
            <span>EPC Client</span>
          </div>
          <div className="font-bold text-sm text-slate-900">{quote.epc_snapshot?.company_name}</div>
          <div className="text-xs text-slate-500 space-y-0.5">
            <div>GSTIN: <span className="font-mono">{quote.epc_snapshot?.gstin || '—'}</span></div>
            <div>Contact: {quote.epc_snapshot?.contact_person || '—'}</div>
            <div>Phone: {quote.epc_snapshot?.mobile || '—'}</div>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-2">
          <div className="flex items-center gap-2 text-slate-400 text-xs font-bold uppercase tracking-wider">
            <Truck className="w-4 h-4" />
            <span>Dispatch & Site</span>
          </div>
          <div className="font-bold text-sm text-slate-900">
            {quote.delivery_type === 'franchisee_warehouse' ? 'Franchisee Store Pickup' : 'EPC Registered Address'}
          </div>
          <div className="text-xs text-slate-500 space-y-0.5">
            <div className="line-clamp-2">Address: {quote.delivery_address_snapshot?.shipping_address_line1 || quote.delivery_address_snapshot?.address || quote.delivery_address_snapshot?.street_address || (quote.delivery_type === 'franchisee_warehouse' ? quote.franchisee_snapshot?.address?.line : quote.epc_snapshot?.address) || '—'}</div>
            <div>Pincode: {quote.delivery_address_snapshot?.pincode || (quote.delivery_type === 'franchisee_warehouse' ? quote.franchisee_snapshot?.address?.pincode : quote.epc_snapshot?.pincode) || '—'}</div>
            <div>Receiver: {quote.delivery_address_snapshot?.contact_person || quote.delivery_address_snapshot?.mobile || (quote.delivery_type === 'franchisee_warehouse' ? quote.franchisee_snapshot?.business_name : quote.epc_snapshot?.contact_person || quote.epc_snapshot?.mobile) || '—'}</div>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-2">
          <div className="flex items-center gap-2 text-slate-400 text-xs font-bold uppercase tracking-wider">
            <Store className="w-4 h-4" />
            <span>Attribution & Partner</span>
          </div>
          <div className="font-bold text-sm text-slate-900">
            {quote.franchisee_snapshot?.business_name || 'BDE Direct Deal'}
          </div>
          <div className="text-xs text-slate-500 space-y-0.5">
            <div>Source: <span className="font-mono">{quote.quote_source}</span></div>
            <div>BDE: {quote.bde_snapshot?.full_name || 'BDE Assigned'}</div>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-2">
          <div className="flex items-center gap-2 text-slate-400 text-xs font-bold uppercase tracking-wider">
            <Box className="w-4 h-4" />
            <span>Solar ComboKit</span>
          </div>
          <div className="font-bold text-sm text-slate-900 line-clamp-1">{quote.combo_kit_snapshot?.name}</div>
          <div className="text-xs text-slate-500 space-y-0.5">
            <div>Capacity: <strong className="text-indigo-600 font-bold">{quote.kit_capacity_kw || 10} kW</strong></div>
            <div>Quantity: {quote.quantity} Units (Total {quote.total_kw} kW)</div>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-2">
          <div className="flex items-center gap-2 text-slate-400 text-xs font-bold uppercase tracking-wider">
            <ShieldCheck className="w-4 h-4" />
            <span>Warranty Package</span>
          </div>
          <div className="font-bold text-sm text-slate-900">{quote.warranty_snapshot?.name || 'Standard OEM'}</div>
          <div className="text-xs text-slate-500 space-y-0.5">
            <div>Duration: {quote.warranty_snapshot?.duration_months ? `${quote.warranty_snapshot.duration_months} M` : 'Standard'}</div>
            <div>Payment Terms: 100% Advance</div>
          </div>
        </div>
      </div>

      {/* Commercial Breakdown */}
      <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-sm">
        <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider pb-3 border-b border-slate-100">
          Commercial Pricing Breakdown
        </h3>

        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-3 text-xs">
            <div className="flex justify-between text-slate-600">
              <span>Unit Price (Base Kit):</span>
              <span className="font-mono font-bold">{formatINR(quote.price_per_kit_paise)}</span>
            </div>

            <div className="flex justify-between text-slate-600">
              <span>Product Subtotal ({quote.quantity} Units):</span>
              <span className="font-mono font-bold">{formatINR(quote.product_subtotal_paise)}</span>
            </div>

            <div className="flex justify-between text-slate-600">
              <span>Warranty / Protection:</span>
              <span className="font-mono font-bold">{formatINR(quote.warranty_charges_paise)}</span>
            </div>

            <div className="flex justify-between text-slate-600">
              <span>Logistics / Freight:</span>
              <span className="font-mono font-bold">{formatINR(quote.delivery_charges_paise)}</span>
            </div>
          </div>

          <div className="space-y-3 text-xs bg-slate-50 p-4 rounded-xl border border-slate-200">
            <div className="flex justify-between font-bold text-slate-800">
              <span>Taxable Amount:</span>
              <span className="font-mono font-bold">{formatINR(quote.taxable_amount_paise)}</span>
            </div>

            <div className="flex justify-between text-slate-600">
              <span>GST ({quote.gst_rate != null ? quote.gst_rate : 5}%):</span>
              <span className="font-mono font-bold">{formatINR(quote.gst_amount_paise)}</span>
            </div>

            <div className="flex justify-between text-base font-bold text-slate-900 pt-2 border-t border-slate-200">
              <span>Total Payable Amount:</span>
              <span className="font-mono text-emerald-600">{formatINR(quote.total_amount_paise)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="flex items-center gap-2 border-b border-slate-200 px-6 pt-3">
          <button
            onClick={() => setActiveTab('followups')}
            className={`pb-3 text-xs font-bold border-b-2 transition flex items-center gap-1.5 ${activeTab === 'followups'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-900'
              }`}
          >
            <Calendar className="w-3.5 h-3.5" /> Follow-up History ({followups.length})
          </button>

          <button
            onClick={() => setActiveTab('activity')}
            className={`pb-3 text-xs font-bold border-b-2 transition flex items-center gap-1.5 ${activeTab === 'activity'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-900'
              }`}
          >
            <Clock className="w-3.5 h-3.5" /> Activity Audit Trail ({activities.length})
          </button>
        </div>

        <div className="p-6">
          {activeTab === 'followups' && (
            <div>
              {followups.length === 0 ? (
                <div className="text-center py-8 text-xs text-slate-400">No follow-ups recorded yet.</div>
              ) : (
                <div className="space-y-3">
                  {followups.map((fu) => (
                    <div key={fu._id} className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-slate-800 capitalize">
                          Mode: {fu.follow_up_mode} • Status: {fu.status}
                        </span>
                        <span className="text-slate-400 font-mono">
                          {new Date(fu.next_follow_up_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                        </span>
                      </div>
                      <p className="text-xs text-slate-600">"{fu.remarks}"</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'activity' && (
            <div>
              {activities.length === 0 ? (
                <div className="text-center py-8 text-xs text-slate-400">No activities recorded yet.</div>
              ) : (
                <div className="space-y-3">
                  {activities.map((act) => (
                    <div key={act._id} className="flex items-start gap-3 p-3 rounded-xl border border-slate-100 text-xs">
                      <div className="w-6 h-6 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                        <Check className="w-3.5 h-3.5" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-slate-800">{act.action}</span>
                          <span className="text-[11px] text-slate-400">
                            {new Date(act.created_at).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        {act.remarks && <p className="text-slate-500 mt-0.5">{act.remarks}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Share Modal */}
      {showShareModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900">Share Quotation</h3>
              <button onClick={() => setShowShareModal(false)} className="text-slate-400 hover:text-slate-600">
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
                  onClick={() => setShowShareModal(false)}
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
      {showFuModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-slate-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900">Record Follow-up</h3>
              <button onClick={() => setShowFuModal(false)} className="text-slate-400 hover:text-slate-600">
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
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Mode</label>
                  <select
                    value={fuForm.follow_up_mode}
                    onChange={(e) => setFuForm({ ...fuForm, follow_up_mode: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs"
                  >
                    <option value="call">Phone Call</option>
                    <option value="whatsapp">WhatsApp</option>
                    <option value="email">Email</option>
                    <option value="meeting">Meeting</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Discussion Notes *
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
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Status</label>
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
                  onClick={() => setShowFuModal(false)}
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
      {showConvertModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900">Convert to Official Order</h3>
              <button onClick={() => setShowConvertModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="my-4 p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">EPC Client:</span>
                <span className="font-bold">{quote.epc_snapshot?.company_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Payable Amount:</span>
                <span className="font-bold text-emerald-600">{formatINR(quote.total_amount_paise)}</span>
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
                    disabled={!quote.franchisee_id}
                    onClick={() => quote.franchisee_id && setOrderType('fpo_order')}
                    className={`p-3 rounded-xl border text-xs font-bold text-left ${!quote.franchisee_id
                        ? 'border-slate-100 bg-slate-50 text-slate-400 cursor-not-allowed'
                        : orderType === 'fpo_order'
                          ? 'border-emerald-600 bg-emerald-50 text-emerald-700'
                          : 'border-slate-200 text-slate-600'
                      }`}
                    title={!quote.franchisee_id ? 'Franchisee PO requires franchisee attribution' : ''}
                  >
                    Franchisee PO {!quote.franchisee_id && '(Partner only)'}
                  </button>
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowConvertModal(false)}
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
