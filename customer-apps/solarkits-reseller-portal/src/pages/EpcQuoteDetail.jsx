import { useState, useEffect, useCallback } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  FiArrowLeft,
  FiDownload,
  FiShare2,
  FiCalendar,
  FiCheckCircle,
  FiAlertCircle,
  FiRepeat,
  FiXCircle,
  FiFileText,
  FiUsers,
  FiTruck,
  FiBox,
  FiShield,
  FiClock,
  FiDollarSign,
  FiCheck,
  FiX,
  FiMail,
  FiSend,
  FiCopy,
} from "react-icons/fi";
import api from "../services/api";

const STATUS_CONFIG = {
  draft: { label: "Draft", bg: "bg-slate-100", text: "text-slate-700", border: "border-slate-300" },
  generated: { label: "Generated", bg: "bg-blue-50", text: "text-blue-700", border: "border-blue-300" },
  sent: { label: "Sent", bg: "bg-indigo-50", text: "text-indigo-700", border: "border-indigo-300" },
  viewed: { label: "Viewed", bg: "bg-purple-50", text: "text-purple-700", border: "border-purple-300" },
  follow_up_pending: { label: "Follow-up Pending", bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-300" },
  interested: { label: "Interested", bg: "bg-cyan-50", text: "text-cyan-700", border: "border-cyan-300" },
  negotiation: { label: "Negotiation", bg: "bg-orange-50", text: "text-orange-700", border: "border-orange-300" },
  order_expected: { label: "Order Expected", bg: "bg-teal-50", text: "text-teal-700", border: "border-teal-300" },
  converted: { label: "Converted", bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-300" },
  expired: { label: "Expired", bg: "bg-rose-50", text: "text-rose-700", border: "border-rose-300" },
  lost: { label: "Lost", bg: "bg-red-50", text: "text-red-700", border: "border-red-300" },
  revised: { label: "Revised", bg: "bg-gray-100", text: "text-gray-600", border: "border-gray-300" },
};

function formatINR(paise) {
  if (paise == null || isNaN(paise)) return "₹0";
  const rupees = Math.round(paise / 100);
  return "₹" + rupees.toLocaleString("en-IN");
}

export default function EpcQuoteDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [quote, setQuote] = useState(null);
  const [activities, setActivities] = useState([]);
  const [followups, setFollowups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState("followups"); // followups | activity

  // Modals
  const [showShareModal, setShowShareModal] = useState(false);
  const [shareMethod, setShareMethod] = useState("email");
  const [shareRecipient, setShareRecipient] = useState("");
  const [sharing, setSharing] = useState(false);
  const [shareMsg, setShareMsg] = useState("");

  const [showFuModal, setShowFuModal] = useState(false);
  const [fuForm, setFuForm] = useState({
    next_follow_up_date: new Date(Date.now() + 3 * 86400000).toISOString().split("T")[0],
    follow_up_mode: "call",
    remarks: "",
    expected_quantity: 1,
    expected_order_date: "",
    expected_order_value_inr: "",
    probability_pct: 60,
    status: "pending",
  });
  const [savingFu, setSavingFu] = useState(false);

  const [showConvertModal, setShowConvertModal] = useState(false);
  const [orderType, setOrderType] = useState("epc_order");
  const [converting, setConverting] = useState(false);

  const fetchQuoteDetail = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await api.get(`/india/v1/reseller/quotes/${id}`);
      if (res.data?.status === "success") {
        setQuote(res.data.data?.quote || res.data.data);
        setActivities(Array.isArray(res.data.data?.activities) ? res.data.data.activities : []);
        setFollowups(Array.isArray(res.data.data?.followups) ? res.data.data.followups : []);
        if (res.data.data?.quote?.epc_snapshot?.email) {
          setShareRecipient(res.data.data.quote.epc_snapshot.email);
        }
      }
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load quote details.");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchQuoteDetail();
  }, [fetchQuoteDetail]);

  // Download PDF
  const handleDownloadPdf = async () => {
    try {
      const res = await api.get(`/india/v1/reseller/quotes/${id}/pdf`, { responseType: "blob" });
      const blob = new Blob([res.data], { type: "application/pdf" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${quote?.quote_number || "Quotation"}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      alert("Failed to download PDF.");
    }
  };

  // Share submit
  const handleShareSubmit = async (e) => {
    e.preventDefault();
    setSharing(true);
    setShareMsg("");
    try {
      const res = await api.post(`/india/v1/reseller/quotes/${id}/share`, {
        method: shareMethod,
        recipient: shareRecipient.trim(),
      });
      if (res.data?.status === "success") {
        setShareMsg("Quote sent successfully!");
        setTimeout(() => setShowShareModal(false), 1500);
        fetchQuoteDetail();
      }
    } catch (err) {
      alert(err.response?.data?.message || "Share failed.");
    } finally {
      setSharing(false);
    }
  };

  // Follow-up submit
  const handleFollowupSubmit = async (e) => {
    e.preventDefault();
    setSavingFu(true);
    try {
      const payload = {
        ...fuForm,
        expected_order_value_paise: fuForm.expected_order_value_inr ? Number(fuForm.expected_order_value_inr) * 100 : undefined,
      };
      delete payload.expected_order_value_inr;

      const res = await api.post(`/india/v1/reseller/quotes/${id}/follow-ups`, payload);
      if (res.data?.status === "success") {
        setShowFuModal(false);
        fetchQuoteDetail();
      }
    } catch (err) {
      alert(err.response?.data?.message || "Failed to schedule follow-up.");
    } finally {
      setSavingFu(false);
    }
  };

  // Revise Quote
  const handleReviseQuote = async () => {
    if (!window.confirm("Do you want to create a new revision of this quote? The current quote will be marked as Revised.")) return;
    try {
      const res = await api.post(`/india/v1/reseller/quotes/${id}/revise`, {
        reason: "Commercial terms revision requested by client",
      });
      if (res.data?.status === "success") {
        alert("New quote revision generated!");
        navigate(`/epc-quotes/${res.data.data._id}`);
      }
    } catch (err) {
      alert(err.response?.data?.message || "Failed to revise quote.");
    }
  };

  // Convert to Order submit
  const handleConvertSubmit = async (e) => {
    e.preventDefault();
    setConverting(true);
    try {
      const res = await api.post(`/india/v1/reseller/quotes/${id}/convert-order`, {
        order_type: orderType,
      });
      if (res.data?.status === "success") {
        setShowConvertModal(false);
        alert(`Quote successfully converted to order #${res.data.data.order_number}!`);
        fetchQuoteDetail();
      }
    } catch (err) {
      alert(err.response?.data?.message || "Failed to convert quote to order.");
    } finally {
      setConverting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center">
        <div className="inline-block w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (error || !quote) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 py-12 px-4 text-center font-sans">
        <FiAlertCircle size={40} className="mx-auto text-red-500 mb-3" />
        <h2 className="text-lg font-bold text-slate-900 dark:text-white">Quotation Not Found</h2>
        <p className="text-xs text-slate-500 mt-1">{error || "The requested quote does not exist or you do not have permission to view it."}</p>
        <div className="mt-4">
          <Link to="/epc-quotes" className="px-4 py-2 bg-amber-500 text-white rounded-xl text-xs font-bold shadow">
            Return to Quotes
          </Link>
        </div>
      </div>
    );
  }

  const isExpired = quote.valid_until && new Date(quote.valid_until) < new Date() && quote.status !== "converted";
  const statusCfg = STATUS_CONFIG[quote.status] || STATUS_CONFIG.draft;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 py-6 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Top Back Link */}
        <div className="flex items-center justify-between">
          <Link
            to="/epc-quotes"
            className="inline-flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-slate-800 dark:hover:text-white transition"
          >
            <FiArrowLeft size={16} />
            <span>Back to Quotations</span>
          </Link>

          <span className="text-xs text-slate-400">
            Created: {new Date(quote.created_at).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
          </span>
        </div>

        {/* Header Card */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-black font-mono text-slate-900 dark:text-white">
                {quote.quote_number}
              </h1>
              {quote.revision_number > 0 && (
                <span className="px-2 py-0.5 rounded text-xs font-bold bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                  Revision {quote.revision_number}
                </span>
              )}
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${statusCfg.bg} ${statusCfg.text} ${statusCfg.border}`}>
                {statusCfg.label}
              </span>
            </div>

            <p className="text-xs text-slate-500 mt-1">
              EPC Client: <strong className="text-slate-700 dark:text-slate-300">{quote.epc_snapshot?.company_name}</strong>
              {quote.valid_until && (
                <span>
                  {" "}• Valid until:{" "}
                  <strong className={isExpired ? "text-red-500" : "text-slate-700 dark:text-slate-300"}>
                    {new Date(quote.valid_until).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                    {isExpired && " (Expired)"}
                  </strong>
                </span>
              )}
            </p>
          </div>

          {/* Action Button Group */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleDownloadPdf}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 transition shadow-sm"
            >
              <FiDownload size={15} />
              <span>PDF</span>
            </button>

            <button
              onClick={() => setShowShareModal(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 transition shadow-sm"
            >
              <FiShare2 size={15} />
              <span>Share</span>
            </button>

            <button
              onClick={() => setShowFuModal(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 text-xs font-bold hover:bg-amber-100 transition border border-amber-200 dark:border-amber-800"
            >
              <FiCalendar size={15} />
              <span>Add Follow-up</span>
            </button>

            {quote.status !== "converted" && (
              <button
                onClick={handleReviseQuote}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-600 hover:bg-slate-50 transition"
                title="Create a revised version with adjusted pricing or quantity"
              >
                <FiRepeat size={14} />
                <span>Revise</span>
              </button>
            )}

            {quote.status !== "converted" && !quote.converted_order_id && (
              <button
                onClick={() => setShowConvertModal(true)}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow transition"
              >
                <FiCheckCircle size={15} />
                <span>Convert to Order</span>
              </button>
            )}
          </div>
        </div>

        {/* Converted Order Banner */}
        {quote.converted_order_id && (
          <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500 text-white flex items-center justify-center">
                <FiCheckCircle size={22} />
              </div>
              <div>
                <h4 className="font-bold text-sm text-emerald-900 dark:text-emerald-200">
                  Deal Closed & Converted to Official Order
                </h4>
                <p className="text-xs text-emerald-700 dark:text-emerald-400 mt-0.5">
                  Order Reference: <strong className="font-mono">{quote.converted_order_id}</strong> ({quote.converted_order_type})
                </p>
              </div>
            </div>
            <Link
              to="/orders"
              className="px-3.5 py-1.5 rounded-xl bg-emerald-600 text-white text-xs font-bold shadow hover:bg-emerald-700 transition"
            >
              Track Order
            </Link>
          </div>
        )}

        {/* 4 Details Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* EPC Account Info */}
          <div className="p-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm space-y-2">
            <div className="flex items-center gap-2 text-slate-400 text-xs font-bold uppercase tracking-wider">
              <FiUsers size={14} />
              <span>EPC Client</span>
            </div>
            <div className="font-bold text-sm text-slate-900 dark:text-white">
              {quote.epc_snapshot?.company_name}
            </div>
            <div className="text-xs text-slate-500 space-y-1">
              <div>GSTIN: <span className="font-mono">{quote.epc_snapshot?.gstin || "—"}</span></div>
              <div>Contact: {quote.epc_snapshot?.contact_person || "—"}</div>
              <div>Phone: {quote.epc_snapshot?.mobile || "—"}</div>
              <div>Email: {quote.epc_snapshot?.email || "—"}</div>
            </div>
          </div>

          {/* Delivery Details */}
          <div className="p-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm space-y-2">
            <div className="flex items-center gap-2 text-slate-400 text-xs font-bold uppercase tracking-wider">
              <FiTruck size={14} />
              <span>Dispatch & Site</span>
            </div>
            <div className="font-bold text-sm text-slate-900 dark:text-white">
              {quote.delivery_type === "franchisee_warehouse" ? "Franchisee Store Pickup" : "EPC Registered Address"}
            </div>
            <div className="text-xs text-slate-500 space-y-1">
              <div className="line-clamp-2">
                Address: {quote.delivery_address_snapshot?.shipping_address_line1 || quote.delivery_address_snapshot?.address || quote.delivery_address_snapshot?.street_address || (quote.delivery_type === "franchisee_warehouse" ? quote.franchisee_snapshot?.address?.line : quote.epc_snapshot?.address) || "—"}
              </div>
              <div>Pincode: {quote.delivery_address_snapshot?.pincode || (quote.delivery_type === "franchisee_warehouse" ? quote.franchisee_snapshot?.address?.pincode : quote.epc_snapshot?.pincode) || "—"}</div>
              <div>Receiver: {quote.delivery_address_snapshot?.contact_person || quote.delivery_address_snapshot?.mobile || (quote.delivery_type === "franchisee_warehouse" ? quote.franchisee_snapshot?.business_name : quote.epc_snapshot?.contact_person || quote.epc_snapshot?.mobile) || "—"}</div>
            </div>
          </div>

          {/* ComboKit Specifications */}
          <div className="p-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm space-y-2">
            <div className="flex items-center gap-2 text-slate-400 text-xs font-bold uppercase tracking-wider">
              <FiBox size={14} />
              <span>Solar ComboKit</span>
            </div>
            <div className="font-bold text-sm text-slate-900 dark:text-white line-clamp-1">
              {quote.combo_kit_snapshot?.name || "ComboKit"}
            </div>
            <div className="text-xs text-slate-500 space-y-1">
              <div>System: <strong className="text-amber-600 font-bold">{quote.kit_capacity_kw || quote.combo_kit_snapshot?.capacity || 10} kW</strong></div>
              <div>Quantity: <strong>{quote.quantity} Units</strong> (Total: {quote.total_kw} kW)</div>
              <div>Panel Brand: {quote.combo_kit_snapshot?.panel_brand || "Tier-1"}</div>
              <div>Inverter Brand: {quote.combo_kit_snapshot?.inverter_brand || "High-Efficiency"}</div>
            </div>
          </div>

          {/* Warranty & Terms */}
          <div className="p-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm space-y-2">
            <div className="flex items-center gap-2 text-slate-400 text-xs font-bold uppercase tracking-wider">
              <FiShield size={14} />
              <span>Warranty & Terms</span>
            </div>
            <div className="font-bold text-sm text-slate-900 dark:text-white">
              {quote.warranty_snapshot?.name || "Standard OEM"}
            </div>
            <div className="text-xs text-slate-500 space-y-1">
              <div>Coverage: {quote.warranty_snapshot?.duration_months ? `${quote.warranty_snapshot.duration_months} Months` : "Manufacturer Default"}</div>
              <div>Payment: {quote.terms_snapshot?.payment_terms || "100% advance against PI"}</div>
              <div>Validity: 15 days from quote issuance</div>
            </div>
          </div>
        </div>

        {/* Commercial Price Table */}
        <div className="p-6 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm">
          <h3 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider pb-3 border-b border-slate-100 dark:border-slate-700">
            Commercial Price Breakdown
          </h3>

          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-3 text-xs">
              <div className="flex justify-between text-slate-600 dark:text-slate-300">
                <span>Unit Price (Base Kit):</span>
                <span className="font-mono font-bold">{formatINR(quote.price_per_kit_paise)}</span>
              </div>

              <div className="flex justify-between text-slate-600 dark:text-slate-300">
                <span>Product Subtotal ({quote.quantity} Units):</span>
                <span className="font-mono font-bold">{formatINR(quote.product_subtotal_paise)}</span>
              </div>

              <div className="flex justify-between text-slate-600 dark:text-slate-300">
                <span>Warranty / Protection Charges:</span>
                <span className="font-mono font-bold">{formatINR(quote.warranty_charges_paise)}</span>
              </div>

              <div className="flex justify-between text-slate-600 dark:text-slate-300">
                <span>Logistics / Delivery Charges:</span>
                <span className="font-mono font-bold">{formatINR(quote.delivery_charges_paise)}</span>
              </div>
            </div>

            <div className="space-y-3 text-xs bg-slate-50 dark:bg-slate-900/50 p-4 rounded-xl border border-slate-200 dark:border-slate-700">
              <div className="flex justify-between font-bold text-slate-800 dark:text-slate-200">
                <span>Taxable Amount:</span>
                <span className="font-mono font-black">{formatINR(quote.taxable_amount_paise)}</span>
              </div>

              <div className="flex justify-between text-slate-600 dark:text-slate-300">
                <span>GST ({quote.gst_rate || 13.8}%):</span>
                <span className="font-mono font-bold">{formatINR(quote.gst_amount_paise)}</span>
              </div>

              <div className="flex justify-between text-base font-black text-slate-900 dark:text-white pt-2 border-t border-slate-200 dark:border-slate-700">
                <span>Total Quotation Value:</span>
                <span className="font-mono text-emerald-600 dark:text-emerald-400">
                  {formatINR(quote.total_amount_paise)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs: Follow-up Timeline & Activity Logs */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
          <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-700 px-6 pt-3">
            <button
              onClick={() => setActiveTab("followups")}
              className={`pb-3 text-xs font-bold border-b-2 transition flex items-center gap-1.5 ${
                activeTab === "followups"
                  ? "border-amber-500 text-amber-600 dark:text-amber-400"
                  : "border-transparent text-slate-500 hover:text-slate-800"
              }`}
            >
              <FiCalendar size={14} />
              <span>Follow-up History ({followups.length})</span>
            </button>

            <button
              onClick={() => setActiveTab("activity")}
              className={`pb-3 text-xs font-bold border-b-2 transition flex items-center gap-1.5 ${
                activeTab === "activity"
                  ? "border-amber-500 text-amber-600 dark:text-amber-400"
                  : "border-transparent text-slate-500 hover:text-slate-800"
              }`}
            >
              <FiClock size={14} />
              <span>Activity Audit Trail ({activities.length})</span>
            </button>
          </div>

          <div className="p-6">
            {activeTab === "followups" && (
              <div>
                {followups.length === 0 ? (
                  <div className="text-center py-8 text-xs text-slate-400">
                    No follow-ups recorded yet for this quotation.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {followups.map((fu) => (
                      <div
                        key={fu._id}
                        className="p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/30 space-y-2"
                      >
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-bold text-slate-800 dark:text-slate-200 capitalize">
                            Mode: {fu.follow_up_mode} • Status: {fu.status}
                          </span>
                          <span className="text-slate-400 font-mono">
                            Scheduled: {new Date(fu.next_follow_up_date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                          </span>
                        </div>
                        <p className="text-xs text-slate-600 dark:text-slate-300">"{fu.remarks}"</p>
                        {fu.probability_pct != null && (
                          <div className="flex items-center gap-2 text-[11px] text-slate-400">
                            <span>Win Probability:</span>
                            <span className="font-bold text-slate-700 dark:text-slate-300">{fu.probability_pct}%</span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === "activity" && (
              <div>
                {activities.length === 0 ? (
                  <div className="text-center py-8 text-xs text-slate-400">
                    No activities recorded yet.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {activities.map((act) => (
                      <div
                        key={act._id}
                        className="flex items-start gap-3 p-3 rounded-xl border border-slate-100 dark:border-slate-700 text-xs"
                      >
                        <div className="w-7 h-7 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                          <FiCheck size={14} />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-slate-800 dark:text-slate-200">{act.action}</span>
                            <span className="text-[11px] text-slate-400">
                              {new Date(act.created_at).toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
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
      </div>

      {/* Share Modal */}
      <AnimatePresence>
        {showShareModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-700"
            >
              <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-700">
                <h3 className="text-base font-bold text-slate-900 dark:text-white">Share Quotation</h3>
                <button onClick={() => setShowShareModal(false)} className="text-slate-400 hover:text-slate-600">
                  <FiX size={18} />
                </button>
              </div>

              {shareMsg && (
                <div className="my-3 p-3 rounded-xl bg-emerald-50 text-emerald-700 text-xs font-semibold flex items-center gap-2">
                  <FiCheck size={15} /> {shareMsg}
                </div>
              )}

              <form onSubmit={handleShareSubmit} className="space-y-4 mt-4">
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setShareMethod("email");
                      setShareRecipient(quote.epc_snapshot?.email || "");
                    }}
                    className={`p-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 ${
                      shareMethod === "email" ? "border-amber-500 bg-amber-50 text-amber-700" : "border-slate-200 text-slate-600"
                    }`}
                  >
                    <FiMail size={16} /> Email PDF
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShareMethod("whatsapp");
                      setShareRecipient(quote.epc_snapshot?.mobile || "");
                    }}
                    className={`p-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 ${
                      shareMethod === "whatsapp" ? "border-emerald-500 bg-emerald-50 text-emerald-700" : "border-slate-200 text-slate-600"
                    }`}
                  >
                    <FiSend size={16} /> WhatsApp
                  </button>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                    {shareMethod === "email" ? "Recipient Email" : "Mobile (+91...)"}
                  </label>
                  <input
                    type={shareMethod === "email" ? "email" : "text"}
                    value={shareRecipient}
                    onChange={(e) => setShareRecipient(e.target.value)}
                    required
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs"
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
                    className="px-5 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-bold shadow"
                  >
                    {sharing ? "Sending..." : "Send"}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Follow-up Modal */}
      <AnimatePresence>
        {showFuModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-700"
            >
              <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-700">
                <h3 className="text-base font-bold text-slate-900 dark:text-white">Record EPC Follow-up</h3>
                <button onClick={() => setShowFuModal(false)} className="text-slate-400 hover:text-slate-600">
                  <FiX size={18} />
                </button>
              </div>

              <form onSubmit={handleFollowupSubmit} className="space-y-4 mt-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                      Next Follow-up Date *
                    </label>
                    <input
                      type="date"
                      value={fuForm.next_follow_up_date}
                      onChange={(e) => setFuForm({ ...fuForm, next_follow_up_date: e.target.value })}
                      required
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                      Mode
                    </label>
                    <select
                      value={fuForm.follow_up_mode}
                      onChange={(e) => setFuForm({ ...fuForm, follow_up_mode: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs"
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
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                    Discussion Notes *
                  </label>
                  <textarea
                    rows={3}
                    value={fuForm.remarks}
                    onChange={(e) => setFuForm({ ...fuForm, remarks: e.target.value })}
                    required
                    placeholder="Enter key points discussed with the client..."
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs"
                  ></textarea>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                      Probability ({fuForm.probability_pct}%)
                    </label>
                    <input
                      type="range"
                      min={0}
                      max={100}
                      step={5}
                      value={fuForm.probability_pct}
                      onChange={(e) => setFuForm({ ...fuForm, probability_pct: Number(e.target.value) })}
                      className="w-full accent-amber-500 mt-2"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                      Status
                    </label>
                    <select
                      value={fuForm.status}
                      onChange={(e) => setFuForm({ ...fuForm, status: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs"
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
                    className="px-5 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-bold shadow"
                  >
                    {savingFu ? "Saving..." : "Save Follow-up"}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Convert to Order Modal */}
      <AnimatePresence>
        {showConvertModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-700"
            >
              <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-700">
                <div className="flex items-center gap-2">
                  <FiCheckCircle className="text-emerald-500" size={20} />
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">Convert to Official Order</h3>
                </div>
                <button onClick={() => setShowConvertModal(false)} className="text-slate-400 hover:text-slate-600">
                  <FiX size={18} />
                </button>
              </div>

              <div className="my-4 p-4 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-500">Client:</span>
                  <span className="font-bold">{quote.epc_snapshot?.company_name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">ComboKit:</span>
                  <span className="font-semibold">{quote.combo_kit_snapshot?.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Order Amount:</span>
                  <span className="font-black text-emerald-600">{formatINR(quote.total_amount_paise)}</span>
                </div>
              </div>

              <form onSubmit={handleConvertSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
                    Order System
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setOrderType("epc_order")}
                      className={`p-3 rounded-xl border text-xs font-bold text-left ${
                        orderType === "epc_order" ? "border-emerald-500 bg-emerald-50 text-emerald-700" : "border-slate-200 text-slate-600"
                      }`}
                    >
                      EPC Direct Order
                    </button>
                    <button
                      type="button"
                      onClick={() => setOrderType("fpo_order")}
                      className={`p-3 rounded-xl border text-xs font-bold text-left ${
                        orderType === "fpo_order" ? "border-emerald-500 bg-emerald-50 text-emerald-700" : "border-slate-200 text-slate-600"
                      }`}
                    >
                      Franchisee PO
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
                    className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow"
                  >
                    {converting ? "Processing..." : "Confirm & Convert"}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
