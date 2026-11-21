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
  FiZap,
  FiSun,
  FiPackage,
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

export default function TrialKitQuoteDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [quote, setQuote] = useState(null);
  const [activities, setActivities] = useState([]);
  const [followups, setFollowups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState("followups");

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
    expected_quantity: 10,
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
      setError(err.response?.data?.message || "Failed to load trial kit quote details.");
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
      a.download = `TrialKit_${quote?.quote_number || "Quotation"}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      alert("Failed to download PDF.");
    }
  };

  // Officially Generate Draft
  const handleGenerateOfficial = async () => {
    if (!window.confirm("Generate official Trial Kit quotation? This will lock pricing and create the official proposal document.")) {
      return;
    }
    try {
      const res = await api.post(`/india/v1/reseller/quotes/${id}/generate`);
      if (res.data?.status === "success") {
        fetchQuoteDetail();
      } else {
        alert(res.data?.message || "Failed to generate quotation.");
      }
    } catch (err) {
      alert(err.response?.data?.message || "Failed to generate quotation.");
    }
  };

  // Submit Share
  const handleShareSubmit = async (e) => {
    e.preventDefault();
    setSharing(true);
    setShareMsg("");
    try {
      const payload = {
        method: shareMethod,
        recipient: shareRecipient.trim(),
      };
      const res = await api.post(`/india/v1/reseller/quotes/${id}/share`, payload);
      if (res.data?.status === "success") {
        setShareMsg("Quotation successfully shared!");
        setTimeout(() => {
          setShowShareModal(false);
          fetchQuoteDetail();
        }, 1200);
      } else {
        setShareMsg(res.data?.message || "Failed to share.");
      }
    } catch (err) {
      setShareMsg(err.response?.data?.message || "Failed to share.");
    } finally {
      setSharing(false);
    }
  };

  // Submit Follow-up
  const handleFollowupSubmit = async (e) => {
    e.preventDefault();
    setSavingFu(true);
    try {
      const payload = {
        next_follow_up_date: fuForm.next_follow_up_date,
        follow_up_mode: fuForm.follow_up_mode,
        remarks: fuForm.remarks,
        expected_quantity: fuForm.expected_quantity ? Number(fuForm.expected_quantity) : undefined,
        expected_order_date: fuForm.expected_order_date || undefined,
        expected_order_value_paise: fuForm.expected_order_value_inr
          ? Math.round(Number(fuForm.expected_order_value_inr) * 100)
          : undefined,
        probability_pct: Number(fuForm.probability_pct),
      };
      const res = await api.post(`/india/v1/reseller/quotes/${id}/follow-ups`, payload);
      if (res.data?.status === "success") {
        setShowFuModal(false);
        fetchQuoteDetail();
      } else {
        alert(res.data?.message || "Failed to log follow-up.");
      }
    } catch (err) {
      alert(err.response?.data?.message || "Failed to log follow-up.");
    } finally {
      setSavingFu(false);
    }
  };

  // Submit Order Conversion
  const handleConvertSubmit = async (e) => {
    e.preventDefault();
    setConverting(true);
    try {
      const res = await api.post(`/india/v1/reseller/quotes/${id}/convert-order`, {
        order_type: orderType,
      });
      if (res.data?.status === "success") {
        alert("Trial quote successfully converted to order!");
        setShowConvertModal(false);
        fetchQuoteDetail();
      } else {
        alert(res.data?.message || "Failed to convert quote.");
      }
    } catch (err) {
      alert(err.response?.data?.message || "Failed to convert quote.");
    } finally {
      setConverting(false);
    }
  };

  if (loading) {
    return (
      <div className="p-12 text-center text-slate-400">
        <div className="w-8 h-8 border-2 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
        <p className="text-xs font-semibold">Loading trial kit quotation details...</p>
      </div>
    );
  }

  if (error || !quote) {
    return (
      <div className="p-8 max-w-lg mx-auto text-center">
        <div className="w-12 h-12 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto mb-3">
          <FiAlertCircle size={22} />
        </div>
        <h3 className="font-bold text-sm text-slate-900 dark:text-white mb-1">Quote Not Found</h3>
        <p className="text-xs text-slate-500 mb-4">{error || "Could not retrieve quote details."}</p>
        <Link
          to="/trial-kit-quotes"
          className="px-4 py-2 rounded-xl bg-purple-600 text-white text-xs font-bold shadow"
        >
          Back to Trial Kit Quotes
        </Link>
      </div>
    );
  }

  const statusCfg = STATUS_CONFIG[quote.status] || STATUS_CONFIG.draft;
  const trialQty = quote.trial_kit_quantity || quote.quantity || 10;

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6">
      {/* Top Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-700">
        <div className="flex items-center gap-3">
          <Link
            to="/trial-kit-quotes"
            className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 transition"
          >
            <FiArrowLeft size={16} />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl md:text-2xl font-black text-slate-900 dark:text-white">
                {quote.quote_number || "Draft Trial Proposal"}
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-purple-100 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                Trial Kit Proposal
              </span>
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${statusCfg.bg} ${statusCfg.text} ${statusCfg.border}`}>
                {statusCfg.label}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Created on {new Date(quote.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}
              {quote.valid_until && ` • Valid until ${new Date(quote.valid_until).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}`}
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {quote.status === "draft" && (
            <button
              onClick={handleGenerateOfficial}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold shadow-md transition"
            >
              <FiFileText size={14} />
              <span>Generate Official Quote</span>
            </button>
          )}

          <button
            onClick={handleDownloadPdf}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition"
          >
            <FiDownload size={14} />
            <span>Download PDF</span>
          </button>

          <button
            onClick={() => setShowShareModal(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition"
          >
            <FiShare2 size={14} />
            <span>Share Proposal</span>
          </button>

          <button
            onClick={() => setShowFuModal(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-amber-700 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/20 transition"
          >
            <FiCalendar size={14} />
            <span>Schedule Follow-up</span>
          </button>

          {quote.status !== "converted" && quote.status !== "draft" && (
            <button
              onClick={() => setShowConvertModal(true)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md transition"
            >
              <FiCheckCircle size={14} />
              <span>Convert to Order</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Grid: Details & Commercials */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Deal Information */}
        <div className="lg:col-span-2 space-y-6">
          {/* Target EPC & Delivery */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-5 rounded-3xl bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700/80 shadow-xs space-y-2">
              <div className="flex items-center gap-2 text-slate-400 text-xs font-bold uppercase tracking-wider">
                <FiUsers size={14} className="text-purple-600" />
                <span>Target EPC Partner</span>
              </div>
              <div className="font-bold text-sm text-slate-900 dark:text-white">
                {quote.epc_snapshot?.company_name || "EPC Client"}
              </div>
              <div className="text-xs text-slate-500 space-y-0.5">
                <div>GSTIN: <span className="font-mono text-slate-700 dark:text-slate-300">{quote.epc_snapshot?.gstin || "—"}</span></div>
                <div>Contact: {quote.epc_snapshot?.contact_person || quote.epc_snapshot?.name || "—"}</div>
                <div>Mobile: {quote.epc_snapshot?.mobile || "—"}</div>
                <div>Email: {quote.epc_snapshot?.email || "—"}</div>
              </div>
            </div>

            <div className="p-5 rounded-3xl bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700/80 shadow-xs space-y-2">
              <div className="flex items-center gap-2 text-slate-400 text-xs font-bold uppercase tracking-wider">
                <FiTruck size={14} className="text-purple-600" />
                <span>Delivery & Dispatch Site</span>
              </div>
              <div className="font-bold text-sm text-slate-900 dark:text-white">
                {quote.delivery_type === "epc_location" ? "Direct Site Delivery" : "Warehouse Self-Pickup"}
              </div>
              <div className="text-xs text-slate-500 space-y-0.5">
                <div>{quote.delivery_address_snapshot?.shipping_address_line1 || quote.delivery_address_snapshot?.address_line || "—"}</div>
                <div>{quote.delivery_address_snapshot?.district_name}, {quote.delivery_address_snapshot?.state_name} - {quote.delivery_address_snapshot?.pincode}</div>
                <div>Site Contact: {quote.delivery_address_snapshot?.contact_person || "—"} ({quote.delivery_address_snapshot?.mobile || "—"})</div>
              </div>
            </div>
          </div>

          {/* Product Specifications */}
          <div className="p-5 rounded-3xl bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700/80 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-700">
              <div className="flex items-center gap-2">
                <FiBox size={16} className="text-purple-600" />
                <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                  ComboKit System Configuration
                </h3>
              </div>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300 border border-purple-200">
                Admin Trial Pack: {trialQty} Kits
              </span>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h4 className="font-bold text-sm text-slate-900 dark:text-white">
                  {quote.combo_kit_snapshot?.name || "Solar ComboKit"}
                </h4>
                <div className="text-xs text-slate-500 mt-1 flex items-center gap-2">
                  <span>Capacity: <strong className="text-slate-700 dark:text-slate-300">{quote.capacity_kw || quote.combo_kit_snapshot?.capacity || 1} kW</strong></span>
                  <span>•</span>
                  <span>Brand: <strong className="text-slate-700 dark:text-slate-300">{quote.combo_kit_snapshot?.brand_name || "SolarKits"}</strong></span>
                  <span>•</span>
                  <span>Warranty: <strong className="text-slate-700 dark:text-slate-300">{quote.warranty_years || 12} Years</strong></span>
                </div>
              </div>

              <div className="text-right sm:border-l sm:border-slate-200 dark:sm:border-slate-700 sm:pl-4">
                <span className="text-[10px] text-slate-400 font-bold uppercase block">Trial Unit Price</span>
                <span className="text-base font-black text-slate-900 dark:text-white">
                  {formatINR(quote.price_per_kit_paise)}
                </span>
                <span className="text-[10px] text-slate-500 block">/ kit</span>
              </div>
            </div>

            {/* Admin Enforced Quantity Notice */}
            <div className="p-3 rounded-2xl bg-purple-50/70 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800 text-xs text-purple-900 dark:text-purple-300 flex items-center justify-between">
              <div>
                <strong className="font-bold">Evaluation Batch Size:</strong> {trialQty} Full System Kits
              </div>
              <span className="text-[10px] font-bold text-slate-500 uppercase">
                Admin Locked
              </span>
            </div>
          </div>

          {/* Interactive Follow-ups & Activity Tabs */}
          <div className="bg-white dark:bg-slate-800 rounded-3xl p-5 border border-slate-200/80 dark:border-slate-700/80 shadow-xs space-y-4">
            <div className="flex border-b border-slate-100 dark:border-slate-700">
              <button
                onClick={() => setActiveTab("followups")}
                className={`pb-2.5 px-3 text-xs font-bold border-b-2 transition ${
                  activeTab === "followups"
                    ? "border-purple-600 text-purple-600 font-black"
                    : "border-transparent text-slate-500 hover:text-slate-800"
                }`}
              >
                Follow-up History ({followups.length})
              </button>
              <button
                onClick={() => setActiveTab("activity")}
                className={`pb-2.5 px-3 text-xs font-bold border-b-2 transition ${
                  activeTab === "activity"
                    ? "border-purple-600 text-purple-600 font-black"
                    : "border-transparent text-slate-500 hover:text-slate-800"
                }`}
              >
                Audit Trail ({activities.length})
              </button>
            </div>

            {activeTab === "followups" && (
              <div className="space-y-3">
                {followups.length === 0 ? (
                  <div className="p-6 text-center text-slate-400 text-xs">
                    No follow-ups recorded yet. Click "Schedule Follow-up" to plan the next client contact.
                  </div>
                ) : (
                  followups.map((fu) => (
                    <div
                      key={fu._id}
                      className="p-3 rounded-xl border border-slate-200 dark:border-slate-700 text-xs space-y-1 hover:bg-slate-50 dark:hover:bg-slate-900/30 transition"
                    >
                      <div className="flex items-center justify-between font-semibold">
                        <span className="text-purple-600 capitalize">{fu.follow_up_mode} Follow-up</span>
                        <span className="text-slate-400">
                          {new Date(fu.next_follow_up_date).toLocaleDateString("en-IN", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })}
                        </span>
                      </div>
                      {fu.remarks && <p className="text-slate-600 dark:text-slate-300">"{fu.remarks}"</p>}
                      <div className="text-[10px] text-slate-400">Status: {fu.status}</div>
                    </div>
                  ))
                )}
              </div>
            )}

            {activeTab === "activity" && (
              <div className="space-y-2">
                {activities.length === 0 ? (
                  <div className="p-6 text-center text-slate-400 text-xs">No activity logs recorded.</div>
                ) : (
                  activities.map((act) => (
                    <div
                      key={act._id}
                      className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/40 text-xs flex items-center justify-between"
                    >
                      <div>
                        <span className="font-semibold text-slate-800 dark:text-slate-200">{act.activity_type}</span>
                        <span className="text-slate-500 ml-2">{act.notes}</span>
                      </div>
                      <span className="text-[10px] text-slate-400">
                        {new Date(act.created_at).toLocaleString("en-IN", {
                          day: "numeric",
                          month: "short",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right 1 Col: Financial Summary */}
        <div className="space-y-5">
          <div className="p-5 rounded-3xl bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700/80 shadow-xs space-y-4">
            <h3 className="font-black text-xs text-slate-900 dark:text-white uppercase tracking-wider pb-2 border-b border-slate-100 dark:border-slate-700">
              Commercial Summary
            </h3>

            <div className="space-y-3 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">Trial Pack Quantity:</span>
                <span className="font-black text-purple-600 dark:text-purple-400">{trialQty} Kits</span>
              </div>

              <div className="flex justify-between">
                <span className="text-slate-500">Unit Price:</span>
                <span className="font-bold text-slate-900 dark:text-white">{formatINR(quote.price_per_kit_paise)}</span>
              </div>

              <div className="flex justify-between">
                <span className="text-slate-500">Product Subtotal:</span>
                <span className="font-bold text-slate-900 dark:text-white">{formatINR(quote.product_subtotal_paise)}</span>
              </div>

              {quote.warranty_charges_paise > 0 && (
                <div className="flex justify-between text-purple-600">
                  <span>Warranty Add-on:</span>
                  <span className="font-bold">+{formatINR(quote.warranty_charges_paise)}</span>
                </div>
              )}

              <div className="flex justify-between">
                <span className="text-slate-500">Freight & Logistics:</span>
                <span className="font-bold text-slate-900 dark:text-white">
                  {quote.delivery_charges_paise === 0 ? "FREE" : formatINR(quote.delivery_charges_paise)}
                </span>
              </div>

              <div className="flex justify-between pt-2 border-t border-slate-100 dark:border-slate-700 font-semibold">
                <span className="text-slate-600">Taxable Amount:</span>
                <span className="text-slate-900 dark:text-white">{formatINR(quote.taxable_amount_paise)}</span>
              </div>

              <div className="flex justify-between text-emerald-600">
                <span>GST ({quote.gst_rate}%):</span>
                <span className="font-bold">+{formatINR(quote.gst_amount_paise)}</span>
              </div>

              <div className="flex justify-between pt-3 border-t-2 border-slate-200 dark:border-slate-700 text-sm">
                <span className="font-black text-slate-900 dark:text-white">Grand Total:</span>
                <span className="font-black text-purple-600 dark:text-purple-400 text-lg">
                  {formatINR(quote.total_amount_paise)}
                </span>
              </div>
            </div>

            <div className="pt-2">
              <button
                onClick={handleDownloadPdf}
                className="w-full py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-black shadow transition flex items-center justify-center gap-2"
              >
                <FiDownload size={14} />
                <span>Download Official PDF</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* SHARE MODAL */}
      <AnimatePresence>
        {showShareModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md bg-white dark:bg-slate-800 rounded-3xl p-6 shadow-2xl border border-slate-200 dark:border-slate-700"
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-700">
                <h3 className="font-black text-sm text-slate-900 dark:text-white">
                  Share Trial Kit Proposal
                </h3>
                <button onClick={() => setShowShareModal(false)} className="text-slate-400">
                  <FiX size={16} />
                </button>
              </div>

              {shareMsg && (
                <div className="p-3 my-2 rounded-xl bg-emerald-50 text-emerald-700 text-xs font-semibold">
                  {shareMsg}
                </div>
              )}

              <form onSubmit={handleShareSubmit} className="space-y-4 mt-4">
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: "email", label: "Email", icon: FiMail },
                    { id: "whatsapp", label: "WhatsApp", icon: FiPhone },
                    { id: "link_copy", label: "Copy Link", icon: FiCopy },
                  ].map((m) => {
                    const Icon = m.icon;
                    return (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => setShareMethod(m.id)}
                        className={`p-3 rounded-xl border text-xs font-bold flex flex-col items-center gap-1.5 transition ${
                          shareMethod === m.id
                            ? "border-purple-600 bg-purple-50 text-purple-700"
                            : "border-slate-200 text-slate-600"
                        }`}
                      >
                        <Icon size={16} />
                        <span>{m.label}</span>
                      </button>
                    );
                  })}
                </div>

                {shareMethod !== "link_copy" && (
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Recipient {shareMethod === "email" ? "Email" : "WhatsApp"}
                    </label>
                    <input
                      type={shareMethod === "email" ? "email" : "text"}
                      value={shareRecipient}
                      onChange={(e) => setShareRecipient(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs"
                    />
                  </div>
                )}

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowShareModal(false)}
                    className="px-4 py-2 rounded-xl border text-xs font-bold text-slate-600"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={sharing}
                    className="px-5 py-2 rounded-xl bg-purple-600 text-white text-xs font-bold shadow"
                  >
                    Send Proposal
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* SCHEDULE FOLLOW-UP MODAL */}
      <AnimatePresence>
        {showFuModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md bg-white dark:bg-slate-800 rounded-3xl p-6 shadow-2xl border border-slate-200 dark:border-slate-700"
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-700">
                <h3 className="font-black text-sm text-slate-900 dark:text-white">
                  Schedule Follow-up Interaction
                </h3>
                <button onClick={() => setShowFuModal(false)} className="text-slate-400">
                  <FiX size={16} />
                </button>
              </div>

              <form onSubmit={handleFollowupSubmit} className="space-y-3 mt-3 text-xs">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Next Follow-up Date *</label>
                  <input
                    type="date"
                    required
                    value={fuForm.next_follow_up_date}
                    onChange={(e) => setFuForm({ ...fuForm, next_follow_up_date: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Mode</label>
                  <select
                    value={fuForm.follow_up_mode}
                    onChange={(e) => setFuForm({ ...fuForm, follow_up_mode: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200"
                  >
                    <option value="call">Phone Call</option>
                    <option value="whatsapp">WhatsApp</option>
                    <option value="meeting">In-Person Meeting</option>
                    <option value="site_visit">Site Visit</option>
                    <option value="email">Email</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Remarks</label>
                  <textarea
                    rows={3}
                    value={fuForm.remarks}
                    onChange={(e) => setFuForm({ ...fuForm, remarks: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowFuModal(false)}
                    className="px-4 py-2 rounded-xl border text-xs font-bold text-slate-600"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={savingFu}
                    className="px-5 py-2 rounded-xl bg-purple-600 text-white text-xs font-bold shadow"
                  >
                    Save Follow-up
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* CONVERT MODAL */}
      <AnimatePresence>
        {showConvertModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md bg-white dark:bg-slate-800 rounded-3xl p-6 shadow-2xl border border-slate-200 dark:border-slate-700"
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-700">
                <h3 className="font-black text-sm text-slate-900 dark:text-white">
                  Convert Trial Quote to Order
                </h3>
                <button onClick={() => setShowConvertModal(false)} className="text-slate-400">
                  <FiX size={16} />
                </button>
              </div>

              <div className="my-3 p-3.5 rounded-xl bg-slate-50 text-xs space-y-1.5 border border-slate-200">
                <div>Kit: <strong className="text-slate-900">{quote.combo_kit_snapshot?.name}</strong></div>
                <div>Admin Trial Quantity: <strong className="text-purple-600">{trialQty} Kits</strong></div>
                <div>Total Amount: <strong className="text-emerald-600">{formatINR(quote.total_amount_paise)}</strong></div>
              </div>

              <form onSubmit={handleConvertSubmit} className="space-y-3">
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <button
                    type="button"
                    onClick={() => setOrderType("epc_order")}
                    className={`p-3 rounded-xl border text-left font-bold ${
                      orderType === "epc_order" ? "border-emerald-500 bg-emerald-50 text-emerald-700" : "border-slate-200"
                    }`}
                  >
                    <div>EPC Trial Order</div>
                    <div className="text-[10px] font-normal text-slate-400">Direct client dispatch</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setOrderType("fpo_order")}
                    className={`p-3 rounded-xl border text-left font-bold ${
                      orderType === "fpo_order" ? "border-emerald-500 bg-emerald-50 text-emerald-700" : "border-slate-200"
                    }`}
                  >
                    <div>Franchisee PO</div>
                    <div className="text-[10px] font-normal text-slate-400">Buffer inventory</div>
                  </button>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowConvertModal(false)}
                    className="px-4 py-2 rounded-xl border text-xs font-bold text-slate-600"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={converting}
                    className="px-5 py-2 rounded-xl bg-emerald-600 text-white text-xs font-bold shadow"
                  >
                    Confirm Order
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
