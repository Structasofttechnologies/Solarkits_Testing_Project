import { useState, useEffect, useCallback, useMemo } from "react";
import { Link, useSearchParams, useOutletContext } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  FiShoppingCart,
  FiPlus,
  FiCheckCircle,
  FiClock,
  FiAlertCircle,
  FiLoader,
  FiSearch,
  FiFileText,
  FiLayers,
  FiUsers,
  FiBox,
  FiDollarSign,
  FiX,
  FiCheck,
  FiChevronRight,
  FiShield,
  FiArrowRight,
  FiInfo,
  FiCalendar,
  FiGrid,
  FiList,
  FiEye,
  FiRefreshCw,
  FiTarget,
  FiTrendingUp,
  FiUploadCloud,
  FiCopy,
  FiMapPin,
  FiExternalLink,
  FiLock,
  FiAward,
} from "react-icons/fi";
import { FaSolarPanel, FaWarehouse, FaBuilding, FaBolt } from "react-icons/fa";
import api from "../services/api";

const STATUS_CONFIG = {
  DRAFT: { label: "Draft", bg: "bg-slate-100 dark:bg-slate-800", text: "text-slate-600 dark:text-slate-300", icon: FiFileText },
  SUBMITTED: { label: "Submitted", bg: "bg-blue-50 dark:bg-blue-900/30", text: "text-blue-600 dark:text-blue-400", icon: FiClock },
  PENDING_APPROVAL: { label: "Pending Approval", bg: "bg-amber-50 dark:bg-amber-900/30", text: "text-amber-600 dark:text-amber-400", icon: FiClock },
  CHANGES_REQUESTED: { label: "Changes Requested", bg: "bg-orange-50 dark:bg-orange-900/30", text: "text-orange-600 dark:text-orange-400", icon: FiAlertCircle },
  APPROVED: { label: "Approved", bg: "bg-emerald-50 dark:bg-emerald-900/30", text: "text-emerald-600 dark:text-emerald-400", icon: FiCheckCircle },
  REJECTED: { label: "Rejected", bg: "bg-red-50 dark:bg-red-900/30", text: "text-red-600 dark:text-red-400", icon: FiX },
  AWAITING_PAYMENT: { label: "Awaiting Payment", bg: "bg-indigo-50 dark:bg-indigo-900/30", text: "text-indigo-600 dark:text-indigo-400", icon: FiDollarSign },
  PAID: { label: "Paid & Verified", bg: "bg-emerald-50 dark:bg-emerald-900/30", text: "text-emerald-600 dark:text-emerald-400", icon: FiCheckCircle },
  PROCESSING: { label: "Processing & Packing", bg: "bg-cyan-50 dark:bg-cyan-900/30", text: "text-cyan-600 dark:text-cyan-400", icon: FiRefreshCw },
  DISPATCHED: { label: "Dispatched", bg: "bg-purple-50 dark:bg-purple-900/30", text: "text-purple-600 dark:text-purple-400", icon: FiBox },
  DELIVERED: { label: "Delivered", bg: "bg-emerald-50 dark:bg-emerald-900/30", text: "text-emerald-600 dark:text-emerald-400", icon: FiCheckCircle },
  COMPLETED: { label: "Completed", bg: "bg-emerald-50 dark:bg-emerald-900/30", text: "text-emerald-600 dark:text-emerald-400", icon: FiCheckCircle },
  CANCELLED: { label: "Cancelled", bg: "bg-rose-50 dark:bg-rose-900/30", text: "text-rose-600 dark:text-rose-400", icon: FiX },
};

function StatusBadge({ status }) {
  const normalized = String(status || "SUBMITTED").toUpperCase();
  const cfg = STATUS_CONFIG[normalized] || STATUS_CONFIG.SUBMITTED;
  const Icon = cfg.icon;
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold border border-current/20 ${cfg.bg} ${cfg.text}`}>
      <Icon size={11} /> {cfg.label}
    </span>
  );
}

export default function LooseOrder() {
  const [searchParams] = useSearchParams();
  const queryPoId = searchParams.get("po_id");

  const outletContext = useOutletContext?.() || {};
  const rawAllowed = outletContext?.allowedOrderTypes || outletContext?.allowedOrderType || planData?.plan?.order_type_allowed || outletContext?.reseller?.order_type_allowed || "po_order";
  const allowedOrderTypes = Array.isArray(rawAllowed)
    ? rawAllowed
    : typeof rawAllowed === "string"
      ? (rawAllowed === "both" ? ["po_order", "loose_order"] : rawAllowed.split(",").map((s) => s.trim()))
      : ["po_order"];

  const allowsLoose = allowedOrderTypes.includes("loose_order");

  const [loading, setLoading] = useState(true);
  const [planData, setPlanData] = useState(null);
  const [epcBuyers, setEpcBuyers] = useState([]);
  const [orders, setOrders] = useState([]);
  const [activePos, setActivePos] = useState([]);
  const [goalData, setGoalData] = useState(null);
  const [viewMode, setViewMode] = useState("table"); // "table" | "card"
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  // Create Loose Order Modal State
  const [createModal, setCreateModal] = useState(false);
  const [deductFromPo, setDeductFromPo] = useState(true);
  const [selectedParentPoId, setSelectedParentPoId] = useState("");
  const [selectedKitId, setSelectedKitId] = useState("");
  const [looseQuantity, setLooseQuantity] = useState(10);
  const [destinationMode, setDestinationMode] = useState("hub_stock"); // "hub_stock" | "epc_allocation"
  const [allocations, setAllocations] = useState({}); // { [epcBuyerId]: quantity }
  const [destinationAddress, setDestinationAddress] = useState("");
  const [destinationPincode, setDestinationPincode] = useState("");
  const [epcSearch, setEpcSearch] = useState("");

  // Payment Form State
  const [utrNumber, setUtrNumber] = useState("");
  const [amountPaid, setAmountPaid] = useState("");
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().slice(0, 10));
  const [senderBankName, setSenderBankName] = useState("");
  const [receiptFile, setReceiptFile] = useState(null);
  const [receiptPreview, setReceiptPreview] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");

  // Order Details Modal
  const [selectedOrder, setSelectedOrder] = useState(null);

  // Escrow Bank Details
  const bankDetails = {
    account_name: "SolarKits Technologies Pvt Ltd",
    bank_name: "ICICI Bank Corporate Banking",
    account_number: "000205018899",
    ifsc_code: "ICIC0000002",
    branch_name: "Bandra Kurla Complex, Mumbai",
    upi_id: "solarkits.token@icici",
  };
  const [copiedField, setCopiedField] = useState("");

  const handleCopyText = (text, fieldName) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    setTimeout(() => setCopiedField(""), 2000);
  };

  // Fetch Authorized Solar Kits, EPC Buyers, Orders, Active PO Quotas & Goal Data
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [settingsRes, buyersRes, ordersRes, activePosRes, goalRes] = await Promise.all([
        api.get("/india/v1/reseller/po/plan-settings").catch(() => ({ data: { status: "error" } })),
        api.get("/india/v1/reseller/epc-buyers/list").catch(() => ({ data: { data: [] } })),
        api.get("/india/v1/reseller/po/my-orders").catch(() => ({ data: { data: [] } })),
        api.get("/india/v1/reseller/po/active-quotas").catch(() => ({ data: { data: [] } })),
        api.get("/india/v1/reseller/goals/my-goal").catch(() => ({ data: { data: null } })),
      ]);

      if (settingsRes.data?.status === "success") {
        setPlanData(settingsRes.data.data);
        if (settingsRes.data.data?.combo_kits?.length > 0) {
          const firstKit = settingsRes.data.data.combo_kits[0];
          setSelectedKitId(firstKit._id || firstKit.id);
        }
      }
      if (buyersRes.data?.status === "success") {
        setEpcBuyers(buyersRes.data.data || []);
      }
      if (ordersRes.data?.status === "success") {
        setOrders(ordersRes.data.data || []);
      }
      if (activePosRes.data?.status === "success") {
        const pos = activePosRes.data.data || [];
        setActivePos(pos);

        if (queryPoId) {
          const matched = pos.find((p) => String(p._id) === String(queryPoId));
          if (matched) {
            setSelectedParentPoId(matched._id);
            setDeductFromPo(true);
            setCreateModal(true);
          } else if (pos.length > 0) {
            setSelectedParentPoId(pos[0]._id);
          }
        } else if (pos.length > 0) {
          setSelectedParentPoId(pos[0]._id);
        }
      }
      if (goalRes.data?.status === "success" && goalRes.data.data) {
        setGoalData(goalRes.data.data);
      }
    } catch (err) {
      console.error("Failed to load loose order context:", err);
    } finally {
      setLoading(false);
    }
  }, [queryPoId]);

  useEffect(() => {
    fetchData();

    // Real-time listener for ICICI Loose Order payments
    const rawApiUrl = import.meta.env.VITE_API_URL || "http://localhost:5000";
    const baseUrl = rawApiUrl.replace(/\/api\/?$/, "").replace(/\/+$/, "");
    let resellerId = null;
    try {
      const saved = localStorage.getItem("reseller_user");
      if (saved) resellerId = JSON.parse(saved)?._id || JSON.parse(saved)?.id;
    } catch (_e) { }

    const streamUrl = `${baseUrl}/api/v1/payments/icici/stream?role=reseller&reseller_id=${resellerId || ""}`;
    const es = new EventSource(streamUrl);

    es.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === "ICICI_PAYMENT_CREDITED") {
          console.log("⚡ Loose Orders auto-refreshing on ICICI payment credit:", data);
          fetchData();
        }
      } catch (err) {
        console.error(err);
      }
    };

    return () => es.close();
  }, [fetchData]);

  // Selected Active Parent PO Object
  const selectedParentPo = useMemo(() => {
    if (!deductFromPo || !selectedParentPoId) return null;
    return activePos.find((p) => String(p._id) === String(selectedParentPoId)) || null;
  }, [deductFromPo, selectedParentPoId, activePos]);

  // Quota remaining on selected Parent PO
  const parentRemainingQuota = useMemo(() => {
    if (!selectedParentPo) return null;
    return selectedParentPo.remaining_quantity != null
      ? selectedParentPo.remaining_quantity
      : (selectedParentPo.total_booked_quantity || 0);
  }, [selectedParentPo]);

  // When parent PO changes, sync selected kit with parent PO's kit
  useEffect(() => {
    if (selectedParentPo && selectedParentPo.items?.[0]) {
      const parentKit = selectedParentPo.items[0].kit_id;
      const parentKitId = parentKit?._id || parentKit?.id || parentKit;
      if (parentKitId) {
        setSelectedKitId(String(parentKitId));
      }
    }
  }, [selectedParentPo]);

  // Selected Authorized Solar Kit Object
  const selectedKit = useMemo(() => {
    if (!planData?.combo_kits || !selectedKitId) return null;
    return (
      planData.combo_kits.find(
        (k) => (k._id || k.id)?.toString() === selectedKitId?.toString()
      ) || null
    );
  }, [planData, selectedKitId]);

  // Dynamic Loose Order Quantity Variations for Selected Kit
  const kitLooseQuantities = useMemo(() => {
    if (parentRemainingQuota != null && parentRemainingQuota > 0) {
      const presets = [10, 25, 50, 100].filter((q) => q < parentRemainingQuota);
      presets.push(parentRemainingQuota); // Always include remaining quota for full final settlement!
      return Array.from(new Set(presets)).sort((a, b) => a - b);
    }
    if (!selectedKit) return [5, 10, 15, 20, 25, 30, 50];
    const raw = selectedKit.loose_order_quantities || selectedKit.looseOrderQuantities;
    if (Array.isArray(raw) && raw.length > 0) {
      const valid = raw.map(Number).filter((n) => !isNaN(n) && n > 0).sort((a, b) => a - b);
      if (valid.length > 0) return valid;
    }
    return [5, 10, 15, 20, 25, 30, 50];
  }, [selectedKit, parentRemainingQuota]);

  // Filter onboarded EPC buyers for the allocation modal
  const filteredEpcBuyers = useMemo(() => {
    if (!epcSearch.trim()) return epcBuyers;
    const q = epcSearch.toLowerCase().trim();
    return epcBuyers.filter((b) => {
      const name = (b.name || "").toLowerCase();
      const comp = (b.company_name || "").toLowerCase();
      const gstin = (b.gstin || "").toLowerCase();
      const mob = (b.mobile || "").toLowerCase();
      const city = (b.city || "").toLowerCase();
      return name.includes(q) || comp.includes(q) || gstin.includes(q) || mob.includes(q) || city.includes(q);
    });
  }, [epcBuyers, epcSearch]);

  // Total Quantity determination based on destination mode
  const totalLooseQuantity = useMemo(() => {
    if (destinationMode === "epc_allocation") {
      return Object.values(allocations).reduce((sum, q) => sum + (parseInt(q, 10) || 0), 0);
    }
    return Math.max(1, parseInt(looseQuantity, 10) || 1);
  }, [destinationMode, looseQuantity, allocations]);

  // Unit Price Calculation
  const unitPriceINR = useMemo(() => {
    // If drawing from locked PO, use PO's locked unit price
    if (selectedParentPo?.items?.[0]?.unit_price_paise) {
      return selectedParentPo.items[0].unit_price_paise / 100;
    }
    if (!selectedKit) return 0;

    // Check separate Loose Order Tier Pricing
    const loosePricing = selectedKit.loose_order_pricing || selectedKit.looseOrderPricing;
    if (Array.isArray(loosePricing) && loosePricing.length > 0) {
      const matchedTier = loosePricing.find(
        (t) => Number(t.quantity) === Number(totalLooseQuantity)
      );
      if (matchedTier && matchedTier.price_per_kit > 0) {
        return matchedTier.price_per_kit;
      }
      // If not an exact match, find highest tier where quantity <= totalLooseQuantity
      const lowerTiers = loosePricing
        .filter((t) => Number(t.quantity) <= Number(totalLooseQuantity) && t.price_per_kit > 0)
        .sort((a, b) => Number(b.quantity) - Number(a.quantity));
      if (lowerTiers.length > 0) {
        return lowerTiers[0].price_per_kit;
      }
    }

    if (selectedKit.dealer_price) return selectedKit.dealer_price;
    if (selectedKit.selling_price_cached) return selectedKit.selling_price_cached;
    if (selectedKit.base_price_cached) return selectedKit.base_price_cached;
    if (selectedKit.unit_price) return selectedKit.unit_price;
    if (selectedKit.price) return selectedKit.price;
    if (selectedKit.base_price) return selectedKit.base_price;
    return 0;
  }, [selectedParentPo, selectedKit, totalLooseQuantity]);

  const gstRatePercent = selectedKit?.gst_rate != null ? Number(selectedKit.gst_rate) : (selectedKit?.tax_pct != null ? Number(selectedKit.tax_pct) : (selectedKit?.common_gst_rate != null ? Number(selectedKit.common_gst_rate) : 0));
  const subtotalINR = totalLooseQuantity * unitPriceINR;
  const taxINR = Math.round((subtotalINR * gstRatePercent) / 100);
  const grandTotalINR = subtotalINR + taxINR;

  // ── Final PO Settlement & Token Amount Adjustment Mechanics ─────────────────
  const isFinalSettlement = useMemo(() => {
    return Boolean(
      deductFromPo &&
      selectedParentPo &&
      parentRemainingQuota != null &&
      totalLooseQuantity === parentRemainingQuota
    );
  }, [deductFromPo, selectedParentPo, parentRemainingQuota, totalLooseQuantity]);

  const tokenAvailableINR = useMemo(() => {
    if (!selectedParentPo) return 0;
    const tokenPaise = selectedParentPo.token_amount_paise || selectedParentPo.token_paid_paise || 0;
    return Math.round(tokenPaise / 100);
  }, [selectedParentPo]);

  const tokenAdjustedINR = useMemo(() => {
    if (!isFinalSettlement) return 0;
    return Math.min(tokenAvailableINR, grandTotalINR);
  }, [isFinalSettlement, tokenAvailableINR, grandTotalINR]);

  const netPayableINR = useMemo(() => {
    return Math.max(0, grandTotalINR - tokenAdjustedINR);
  }, [grandTotalINR, tokenAdjustedINR]);

  // Auto-fill amount paid with netPayableINR
  useEffect(() => {
    if (netPayableINR >= 0) {
      setAmountPaid(netPayableINR);
    }
  }, [netPayableINR]);

  // EPC Allocation Handlers
  const handleQuantityChange = (buyerId, val) => {
    const qty = Math.max(0, parseInt(val, 10) || 0);
    setAllocations((prev) => {
      const next = { ...prev };
      if (qty === 0) {
        delete next[buyerId];
      } else {
        next[buyerId] = qty;
      }
      return next;
    });
    setFormError("");
  };

  const handleStepQty = (buyerId, delta) => {
    const current = allocations[buyerId] || 0;
    handleQuantityChange(buyerId, current + delta);
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setReceiptFile(file);
      if (file.type.startsWith("image/")) {
        const reader = new FileReader();
        reader.onload = (ev) => setReceiptPreview(ev.target.result);
        reader.readAsDataURL(file);
      } else {
        setReceiptPreview(null);
      }
    }
  };

  // Submit Loose Solar Kit Order
  const handleCreateLooseOrder = async (e) => {
    e.preventDefault();
    setFormError("");

    if (!selectedKit) {
      setFormError("Please select an authorized Solar Kit.");
      return;
    }
    if (totalLooseQuantity <= 0) {
      setFormError("Please enter a valid loose quantity.");
      return;
    }

    if (deductFromPo && selectedParentPo && parentRemainingQuota != null) {
      if (totalLooseQuantity > parentRemainingQuota) {
        setFormError(
          `Requested quantity (${totalLooseQuantity} kits) exceeds available PO quota (${parentRemainingQuota} kits).`
        );
        return;
      }
    }

    if (destinationMode === "epc_allocation") {
      if (totalLooseQuantity <= 0) {
        setFormError("Please allocate quantities to at least one onboarded EPC Buyer.");
        return;
      }
    } else {
      // Franchise Hub Stock requires franchise payment UTR
      if (!utrNumber.trim()) {
        setFormError("Please enter the UTR / Transaction Reference Number.");
        return;
      }
      if (netPayableINR > 0 && (!amountPaid || Number(amountPaid) <= 0)) {
        setFormError("Please enter a valid payment amount.");
        return;
      }
    }

    const epcAllocationsList =
      destinationMode === "epc_allocation"
        ? Object.entries(allocations).map(([buyerId, qty]) => {
          const buyer = epcBuyers.find((b) => (b._id || b.id)?.toString() === buyerId?.toString());
          return {
            epc_buyer_id: buyerId,
            company_name: buyer?.company_name || buyer?.name || "EPC Buyer",
            buyer_name: buyer?.name || buyer?.company_name || "EPC Buyer",
            gstin: buyer?.gstin || null,
            allocated_quantity: qty,
            payment_status: "PENDING",
          };
        })
        : [];

    const itemPayload = {
      kit_id: selectedKit._id || selectedKit.id,
      item_name: selectedKit.name || selectedKit.kit_name || "Solar Kit Package",
      item_code: selectedKit.kit_code || selectedKit.code || null,
      quantity: totalLooseQuantity,
      unit_price_paise: Math.round(unitPriceINR * 100),
      gst_rate: gstRatePercent,
      epc_allocations: epcAllocationsList,
    };

    setSubmitting(true);
    try {
      const payload = {
        order_type: "loose_kit_order",
        parent_po_id: deductFromPo && selectedParentPoId ? selectedParentPoId : null,
        destination_type: destinationMode,
        destination_address: destinationAddress || (destinationMode === "epc_allocation" ? "Direct Dispatch to Allocated EPC Contractor Site" : "Franchise Regional Hub Warehouse"),
        destination_pincode: destinationPincode || "380001",
        items: [itemPayload],
        offline_payment: destinationMode === "hub_stock" ? {
          payment_method: "offline_bank_transfer",
          utr_number: utrNumber.trim().toUpperCase(),
          amount_paid: Number(amountPaid),
          payment_date: paymentDate,
          sender_bank_name: senderBankName || "Bank Transfer",
        } : null,
        auto_submit: true,
      };

      const res = await api.post("/india/v1/reseller/po/create", payload);
      if (res.data?.status === "success") {
        setCreateModal(false);
        setAllocations({});
        setLooseQuantity(10);
        setUtrNumber("");
        setReceiptFile(null);
        setEpcSearch("");
        setDestinationAddress("");
        setDestinationPincode("");
        fetchData();
      } else {
        setFormError(res.data?.message || "Failed to submit Loose Solar Kit Order.");
      }
    } catch (err) {
      console.error("Error submitting loose order:", err);
      setFormError(err.response?.data?.message || "Failed to submit Loose Solar Kit Order.");
    } finally {
      setSubmitting(false);
    }
  };

  // Filtered Orders List
  const filteredOrders = useMemo(() => {
    return orders.filter((o) => {
      // Show loose kit orders or orders linked to PO
      const isLoose = o.order_type === "loose_kit_order" || Boolean(o.parent_po_id);
      if (!isLoose) return false;
      if (statusFilter && (o.status || o.order_status) !== statusFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        const num = (o.po_number || o.order_number || "").toLowerCase();
        const kitName = (o.items?.[0]?.item_name || "").toLowerCase();
        return num.includes(q) || kitName.includes(q);
      }
      return true;
    });
  }, [orders, statusFilter, search]);

  return (
    <div className="space-y-6 pb-24 max-w-7xl mx-auto">
      {/* ── Top Header Banner ─────────────────────────────────────────────────── */}
      <div
        className="relative rounded-3xl p-6 sm:p-8 text-white shadow-xl overflow-hidden"
        style={{ background: "linear-gradient(135deg, #0f172a 0%, #1e3a8a 50%, #2563eb 100%)" }}
      >
        <div className="absolute top-0 right-0 w-96 h-96 bg-cyan-400/10 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black tracking-wider uppercase bg-white/20 backdrop-blur-md border border-white/20 text-white">
                <FiShield size={12} /> Franchisee Loose Delivery Ordering
              </span>
              {planData?.plan?.name && (
                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-amber-400/30 text-amber-200 border border-amber-400/40">
                  ★ {planData.plan.name}
                </span>
              )}
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
              Loose Orders & PO Quota Consumption
            </h1>
            <p className="text-white/80 text-xs sm:text-sm max-w-xl">
              Order flexible kit quantities against your booked PO. Loose orders decrement your locked quota, and your <strong>Token Deposit is auto-adjusted on your final settlement order</strong>.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={fetchData}
              className="p-3 rounded-2xl bg-white/10 hover:bg-white/20 text-white border border-white/20 transition-all cursor-pointer"
              title="Refresh Data"
            >
              <FiRefreshCw size={17} className={loading ? "animate-spin" : ""} />
            </button>
            {allowsLoose ? (
              <button
                onClick={() => {
                  setFormError("");
                  setCreateModal(true);
                }}
                disabled={!planData?.has_active_plan && !planData?.combo_kits?.length}
                className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-white text-blue-900 hover:bg-white/90 text-sm font-black shadow-lg transition-all transform active:scale-95 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <FiPlus size={18} />
                <span>Place Loose Solar Kit Order</span>
              </button>
            ) : (
              <Link
                to="/po-order"
                className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-white text-blue-900 hover:bg-white/90 text-sm font-black shadow-lg transition-all transform active:scale-95"
              >
                <FiArrowRight size={18} />
                <span>Go to PO Orders</span>
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* ── Advisory Banner for Non-Loose Order Stores ───────────────────────── */}
      {!allowsLoose && (
        <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-200 flex items-center justify-between gap-3 text-xs font-semibold">
          <div className="flex items-center gap-2">
            <FiAlertCircle size={18} className="text-amber-600 shrink-0" />
            <span>Your store is configured for Purchase Orders only. Direct Loose Order creation is not permitted for your Store Type.</span>
          </div>
          <Link to="/po-order" className="px-3.5 py-1.5 rounded-xl bg-blue-600 text-white font-bold hover:bg-blue-500 transition-colors shrink-0">
            Open PO Orders
          </Link>
        </div>
      )}

      {/* ── ACTIVE PRICE-LOCKED PO QUOTA BANNER ───────────────────────────────── */}
      {activePos.length > 0 && (
        <div className="p-5 rounded-3xl bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-blue-500/10 border-2 border-emerald-500/30 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-md">
              <FiLock size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[10px] font-black uppercase tracking-wider text-emerald-800 dark:text-emerald-300">
                  Active Price-Locked PO Found
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-600 text-white">
                  {activePos.length} Locked PO(s)
                </span>
              </div>
              <h3 className="text-sm sm:text-base font-black text-text-primary mt-0.5">
                {activePos[0]?.po_number} ({activePos[0]?.remaining_quantity || activePos[0]?.total_booked_quantity} Kits Remaining)
              </h3>
              <p className="text-xs text-text-muted mt-0.5">
                Token Deposit: <strong>₹{Math.round(((activePos[0]?.token_amount_paise || activePos[0]?.token_paid_paise || 0) / 100)).toLocaleString("en-IN")}</strong> held safely in escrow. Deducts automatically when you order your final kits!
              </p>
            </div>
          </div>

          <button
            onClick={() => {
              setSelectedParentPoId(activePos[0]._id);
              setDeductFromPo(true);
              setFormError("");
              setCreateModal(true);
            }}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black shadow-md transition-all cursor-pointer shrink-0"
          >
            <span>Order from this PO</span>
            <FiArrowRight size={14} />
          </button>
        </div>
      )}

      {/* ── Search & Filter Controls ────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <FiSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted" size={16} />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by Loose Order Number or Kit..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl text-xs font-semibold border transition-all"
            style={{
              background: "var(--color-surface)",
              borderColor: "var(--color-border)",
              color: "var(--color-text-primary)",
            }}
          />
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2.5 rounded-xl text-xs font-semibold border cursor-pointer"
            style={{
              background: "var(--color-surface)",
              borderColor: "var(--color-border)",
              color: "var(--color-text-primary)",
            }}
          >
            <option value="">All Statuses</option>
            <option value="SUBMITTED">Submitted</option>
            <option value="PENDING_APPROVAL">Pending Approval</option>
            <option value="APPROVED">Approved</option>
            <option value="AWAITING_PAYMENT">Awaiting Payment</option>
            <option value="PAID">Paid</option>
            <option value="PROCESSING">Processing</option>
            <option value="DISPATCHED">Dispatched</option>
            <option value="DELIVERED">Delivered</option>
          </select>

          <div
            className="flex items-center bg-surface border border-border rounded-xl p-1 shrink-0"
          >
            <button
              onClick={() => setViewMode("table")}
              className={`p-1.5 rounded-lg text-xs transition-colors cursor-pointer ${viewMode === "table" ? "bg-primary text-white shadow-xs" : "text-text-muted hover:text-text-primary"
                }`}
              title="Table View"
            >
              <FiList size={15} />
            </button>
            <button
              onClick={() => setViewMode("card")}
              className={`p-1.5 rounded-lg text-xs transition-colors cursor-pointer ${viewMode === "card" ? "bg-primary text-white shadow-xs" : "text-text-muted hover:text-text-primary"
                }`}
              title="Card Grid View"
            >
              <FiGrid size={15} />
            </button>
          </div>
        </div>
      </div>

      {/* ── Orders Feed / Table ─────────────────────────────────────────────── */}
      {loading ? (
        <div className="py-24 text-center space-y-3">
          <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs font-bold text-text-secondary">Loading authorized solar kits &amp; loose orders...</p>
        </div>
      ) : filteredOrders.length === 0 ? (
        <div className="py-20 text-center bg-surface rounded-3xl border border-border p-8 space-y-4 shadow-xs">
          <div className="w-16 h-16 rounded-full bg-blue-50 dark:bg-blue-900/20 text-blue-600 flex items-center justify-center mx-auto">
            <FaSolarPanel size={28} />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-black text-text-primary">No Loose Solar Kit Orders Placed Yet</h3>
            <p className="text-xs text-text-secondary max-w-md mx-auto">
              Place loose quantity purchase orders against your active booked PO to consume your quota and adjust your token amount.
            </p>
          </div>
          <button
            onClick={() => setCreateModal(true)}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md transition-all cursor-pointer"
          >
            <FiPlus size={15} /> Place Loose Solar Kit Order
          </button>
        </div>
      ) : viewMode === "table" ? (
        <div className="bg-surface rounded-2xl border border-border shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-surface-hover/60 border-b border-border text-text-secondary uppercase font-black tracking-wider">
                <tr>
                  <th className="px-6 py-4">PO Number &amp; Date</th>
                  <th className="px-6 py-4">Linked Parent PO</th>
                  <th className="px-6 py-4">Authorized Solar Kit</th>
                  <th className="px-6 py-4 text-center">Loose Qty</th>
                  <th className="px-6 py-4">Destination</th>
                  <th className="px-6 py-4 text-right">Net Payable</th>
                  <th className="px-6 py-4 text-center">Status</th>
                  <th className="px-6 py-4 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredOrders.map((order) => {
                  const firstItem = order.items?.[0] || {};
                  const totalQty = (order.items || []).reduce((sum, i) => sum + (i.quantity || 1), 0);
                  const orderTotal =
                    order.net_payable_paise != null
                      ? order.net_payable_paise / 100
                      : order.grand_total_inr ||
                      (order.grand_total_paise ? order.grand_total_paise / 100 : order.total_amount) ||
                      0;

                  const parentPo = order.parent_po_id;

                  return (
                    <tr key={order._id || order.id} className="hover:bg-surface-hover/50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="font-mono font-black text-text-primary text-xs">
                          {order.po_number || order.order_number || `#LPO-${String(order._id).slice(-6).toUpperCase()}`}
                        </div>
                        <div className="text-[11px] text-text-muted mt-0.5">
                          {new Date(order.created_at || order.createdAt).toLocaleDateString("en-IN", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })}
                        </div>
                      </td>

                      <td className="px-6 py-4">
                        {parentPo ? (
                          <div className="space-y-1">
                            <span className="inline-flex items-center gap-1 font-mono font-bold text-xs text-primary">
                              <FiLock size={11} /> {parentPo.po_number || "Parent PO"}
                            </span>
                            {order.is_final_po_settlement && (
                              <div>
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300">
                                  🎉 Token -₹{Math.round((order.token_adjusted_paise || 0) / 100).toLocaleString("en-IN")} Adjusted
                                </span>
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-[11px] text-text-muted">Standalone Order</span>
                        )}
                      </td>

                      <td className="px-6 py-4">
                        <div className="font-extrabold text-text-primary text-xs">
                          {firstItem.item_name || "Authorized Solar Combo Kit"}
                        </div>
                        <div className="text-[10px] text-text-muted font-mono mt-0.5">
                          SKU: {firstItem.item_code || "KIT-STD"}
                        </div>
                      </td>

                      <td className="px-6 py-4 text-center">
                        <span className="font-black text-sm text-primary font-mono bg-primary/10 px-2.5 py-1 rounded-lg">
                          {totalQty} Kits
                        </span>
                      </td>

                      <td className="px-6 py-4">
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-text-secondary bg-surface-hover px-2 py-1 rounded-md">
                          <FaWarehouse size={11} className="text-primary" />
                          {order.destination_type === "epc_allocation" || firstItem.epc_allocations?.length
                            ? `Allocated to ${firstItem.epc_allocations?.length || 1} EPC(s)`
                            : "Franchise Hub Stock"}
                        </span>
                      </td>

                      <td className="px-6 py-4 text-right">
                        <div className="font-black text-text-primary text-sm">
                          ₹{orderTotal.toLocaleString("en-IN")}
                        </div>
                        {order.token_adjusted_paise > 0 && (
                          <div className="text-[10px] text-emerald-600 font-bold">
                            Token Adjusted ✓
                          </div>
                        )}
                      </td>

                      <td className="px-6 py-4 text-center">
                        <StatusBadge status={order.status || order.order_status} />
                      </td>

                      <td className="px-6 py-4 text-center">
                        <button
                          onClick={() => setSelectedOrder(order)}
                          className="px-3 py-1.5 bg-surface-hover hover:bg-primary hover:text-white text-primary rounded-xl font-extrabold text-xs transition-all cursor-pointer inline-flex items-center gap-1"
                        >
                          <FiEye /> View Details
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* Card Grid View */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredOrders.map((order) => {
            const firstItem = order.items?.[0] || {};
            const totalQty = (order.items || []).reduce((sum, i) => sum + (i.quantity || 1), 0);
            const orderTotal =
              order.net_payable_paise != null
                ? order.net_payable_paise / 100
                : order.grand_total_inr ||
                (order.grand_total_paise ? order.grand_total_paise / 100 : order.total_amount) ||
                0;
            const parentPo = order.parent_po_id;

            return (
              <div
                key={order._id || order.id}
                className="p-5 rounded-3xl bg-surface border border-border shadow-xs hover:border-primary/40 transition-all flex flex-col justify-between space-y-4"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-2 border-b border-border pb-3">
                    <div>
                      <span className="font-mono font-black text-xs text-text-primary block">
                        {order.po_number || order.order_number || `#LPO-${String(order._id).slice(-6).toUpperCase()}`}
                      </span>
                      <span className="text-[11px] text-text-muted">
                        {new Date(order.created_at || order.createdAt).toLocaleDateString("en-IN", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </span>
                    </div>
                    <StatusBadge status={order.status || order.order_status} />
                  </div>

                  <div>
                    <h4 className="font-extrabold text-sm text-text-primary">
                      {firstItem.item_name || "Authorized Solar Kit Package"}
                    </h4>
                    <p className="text-xs text-text-muted mt-0.5">
                      Procured Quantity: <strong className="text-primary font-mono">{totalQty} Kits</strong>
                    </p>
                  </div>

                  {parentPo && (
                    <div className="p-3 rounded-2xl bg-surface-hover/80 border border-border text-xs space-y-1">
                      <div className="flex items-center justify-between text-[11px] font-bold">
                        <span className="text-text-muted">Deducted from PO:</span>
                        <span className="font-mono text-primary font-black">{parentPo.po_number}</span>
                      </div>
                      {order.is_final_po_settlement && (
                        <div className="text-[10px] font-black text-emerald-600 flex items-center gap-1">
                          <FiCheckCircle size={12} /> Final PO Settlement Order (Token Adjusted)
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div className="pt-3 border-t border-border flex items-center justify-between">
                  <div>
                    <span className="text-[10px] text-text-muted block">Net Payable</span>
                    <span className="font-black text-base text-text-primary">
                      ₹{orderTotal.toLocaleString("en-IN")}
                    </span>
                  </div>

                  <button
                    onClick={() => setSelectedOrder(order)}
                    className="px-3.5 py-1.5 bg-primary text-white hover:bg-primary-hover rounded-xl text-xs font-bold shadow-xs cursor-pointer inline-flex items-center gap-1"
                  >
                    <FiEye /> View Order
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── CREATE LOOSE SOLAR KIT ORDER MODAL ──────────────────────────────── */}
      {createModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-surface rounded-3xl border border-border shadow-2xl max-w-4xl w-full p-6 space-y-6 max-h-[92vh] overflow-y-auto animate-in fade-in zoom-in-95">
            {/* Modal Header */}
            <div className="flex justify-between items-center border-b border-border pb-4">
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 bg-blue-500/15 text-blue-600 rounded-full">
                  Flexible Delivery Order
                </span>
                <h3 className="text-xl font-black text-text-primary mt-1 flex items-center gap-2">
                  <FaSolarPanel className="text-primary" /> Place Loose Solar Kit Delivery Order
                </h3>
              </div>
              <button
                onClick={() => setCreateModal(false)}
                className="p-2 text-text-muted hover:text-text-primary rounded-xl hover:bg-surface-hover cursor-pointer transition-colors"
              >
                <FiX size={20} />
              </button>
            </div>

            <form onSubmit={handleCreateLooseOrder} className="space-y-5">
              {/* Step 0: Active PO Quota Deduction Selector */}
              {activePos.length > 0 && (
                <div className="space-y-3 p-4 rounded-2xl bg-gradient-to-r from-blue-500/5 via-emerald-500/5 to-teal-500/5 border-2 border-emerald-500/30">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-black uppercase tracking-wider text-text-primary flex items-center gap-2">
                      <FiLock className="text-emerald-500" /> Deduct from Active Price-Locked PO Quota?
                    </label>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setDeductFromPo(true)}
                        className={`px-3 py-1 rounded-xl text-xs font-black transition-all cursor-pointer ${deductFromPo
                            ? "bg-emerald-600 text-white shadow-xs"
                            : "bg-surface hover:bg-surface-hover text-text-muted border border-border"
                          }`}
                      >
                        Yes, Deduct from PO
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeductFromPo(false)}
                        className={`px-3 py-1 rounded-xl text-xs font-black transition-all cursor-pointer ${!deductFromPo
                            ? "bg-slate-800 text-white shadow-xs"
                            : "bg-surface hover:bg-surface-hover text-text-muted border border-border"
                          }`}
                      >
                        Standalone Order
                      </button>
                    </div>
                  </div>

                  {deductFromPo && (
                    <div className="space-y-3 pt-2">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {activePos.map((po) => {
                          const isSelected = selectedParentPoId === po._id;
                          const rem = po.remaining_quantity != null ? po.remaining_quantity : po.total_booked_quantity;
                          const tok = Math.round(((po.token_amount_paise || po.token_paid_paise || 0) / 100));

                          return (
                            <div
                              key={po._id}
                              onClick={() => setSelectedParentPoId(po._id)}
                              className={`p-3.5 rounded-2xl border-2 transition-all cursor-pointer space-y-1.5 ${isSelected
                                  ? "border-emerald-600 bg-emerald-500/10 shadow-xs"
                                  : "border-border bg-surface hover:border-emerald-400"
                                }`}
                            >
                              <div className="flex items-center justify-between">
                                <span className="font-mono font-black text-xs text-text-primary">
                                  {po.po_number}
                                </span>
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-600 text-white">
                                  {rem} Kits Remaining
                                </span>
                              </div>
                              <div className="text-[11px] text-text-muted truncate">
                                {po.items?.[0]?.item_name || "Solar Kit Package"}
                              </div>
                              <div className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400">
                                💰 Escrow Token: ₹{tok.toLocaleString("en-IN")}
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {selectedParentPo && (
                        <div className="p-3 rounded-xl bg-surface border border-border text-xs flex items-center justify-between">
                          <span className="text-text-muted">Quota Consumption Visualizer:</span>
                          <span className="font-black text-text-primary">
                            Current: <strong>{parentRemainingQuota} kits</strong> → After order:{" "}
                            <strong className="text-emerald-600">
                              {Math.max(0, (parentRemainingQuota || 0) - totalLooseQuantity)} kits left
                            </strong>
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Step 1: Select Authorized Solar Kit */}
              <div className="space-y-2">
                <label className="block text-xs font-black uppercase tracking-wider text-text-primary">
                  Step 1: Select Solar Combo Kit
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {(planData?.combo_kits || []).length === 0 ? (
                    <div className="col-span-full p-6 text-center rounded-2xl border-2 border-dashed border-border flex flex-col items-center justify-center gap-2 bg-surface">
                      <FiAlertCircle size={22} className="text-amber-500" />
                      <p className="text-xs font-bold text-text-primary">No Combo Kits Available</p>
                      <p className="text-[11px] text-text-muted">Kits must be active in warehouse with pricing configured to appear for loose orders.</p>
                    </div>
                  ) : (
                    (planData?.combo_kits || []).map((kit) => {
                      const kitId = kit._id || kit.id;
                      const isSelected = selectedKitId?.toString() === kitId?.toString();
                      const kitPrice =
                        selectedParentPo?.items?.[0]?.unit_price_paise
                          ? selectedParentPo.items[0].unit_price_paise / 100
                          : (kit.dealer_price || kit.selling_price_cached || kit.base_price_cached || 0);

                      return (
                        <div
                          key={kitId}
                          onClick={() => setSelectedKitId(kitId)}
                          className={`p-4 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between ${isSelected
                              ? "bg-primary/10 border-primary shadow-sm"
                              : "bg-surface hover:bg-surface-hover border-border"
                            }`}
                        >
                          <div className="space-y-1">
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] font-bold text-primary uppercase font-mono">
                                {kit.capacityKW ? `${kit.capacityKW} kW Kit` : (kit.capacity ? `${kit.capacity} kW Kit` : "Solar Combo")}
                              </span>
                              {isSelected && <FiCheck className="text-primary font-black" />}
                            </div>
                            <h5 className="font-extrabold text-text-primary text-xs leading-tight">
                              {kit.name || kit.kit_name || "Solar Kit Package"}
                            </h5>
                            <p className="text-[11px] text-text-muted">
                              {kit.brandName || "Tier-1 Components"} • {kit.phase || "Single"} Phase
                            </p>
                          </div>

                          <div className="pt-2 mt-2 border-t border-border flex justify-between items-baseline">
                            <span className="text-[10px] text-text-muted">Unit Rate</span>
                            <span className="font-black text-text-primary text-sm">
                              {kitPrice > 0 ? `₹${kitPrice.toLocaleString("en-IN")}` : "Price Pending"}
                            </span>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Step 2: Loose Quantity Selection & Presets */}
              <div className="space-y-3 p-4 bg-surface-hover/50 rounded-2xl border border-border">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div>
                    <label className="text-xs font-black uppercase tracking-wider text-text-primary block">
                      Step 2: Enter Order Quantity (Units / Kits)
                    </label>
                    {parentRemainingQuota != null && deductFromPo && (
                      <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 mt-0.5">
                        Max available from PO quota: <strong>{parentRemainingQuota} kits</strong>.
                      </p>
                    )}
                  </div>

                  {destinationMode === "hub_stock" ? (
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setLooseQuantity(Math.max(1, looseQuantity - 5))}
                        className="w-8 h-8 rounded-xl bg-surface border border-border font-bold text-sm flex items-center justify-center cursor-pointer hover:bg-surface-hover"
                      >
                        -
                      </button>
                      <input
                        type="number"
                        min={1}
                        max={deductFromPo && parentRemainingQuota ? parentRemainingQuota : undefined}
                        value={looseQuantity}
                        onChange={(e) => {
                          const val = Math.max(1, parseInt(e.target.value, 10) || 1);
                          setLooseQuantity(val);
                        }}
                        className="w-20 py-1.5 text-center font-mono font-black text-sm bg-surface border border-border rounded-xl text-primary"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const nextVal = looseQuantity + 5;
                          if (deductFromPo && parentRemainingQuota && nextVal > parentRemainingQuota) {
                            setLooseQuantity(parentRemainingQuota);
                          } else {
                            setLooseQuantity(nextVal);
                          }
                        }}
                        className="w-8 h-8 rounded-xl bg-surface border border-border font-bold text-sm flex items-center justify-center cursor-pointer hover:bg-surface-hover"
                      >
                        +
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-bold text-text-muted">Total Allocated:</span>
                      <span className="px-3 py-1 bg-primary/10 text-primary font-black font-mono text-sm rounded-xl border border-primary/20">
                        {totalLooseQuantity} Kits
                      </span>
                    </div>
                  )}
                </div>

                {destinationMode === "hub_stock" ? (
                  <div className="flex flex-wrap gap-2 pt-1">
                    {kitLooseQuantities.map((presetQty) => (
                      <button
                        key={presetQty}
                        type="button"
                        onClick={() => setLooseQuantity(presetQty)}
                        className={`py-2 px-3 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${looseQuantity === presetQty
                            ? "bg-primary text-white shadow-sm"
                            : "bg-surface hover:bg-surface-hover text-text-primary border border-border"
                          }`}
                      >
                        {presetQty} Kits {presetQty === parentRemainingQuota && "(Final Settle)"}
                      </button>
                    ))}
                  </div>
                ) : (
                  <p className="text-[11px] text-text-muted flex items-center gap-1.5 pt-1 border-t border-border/50">
                    <FiUsers className="text-primary shrink-0" />
                    <span>Assign loose quantities across onboarded EPC partners below in <strong>Step 3</strong>.</span>
                  </p>
                )}
              </div>

              {/* Step 3: Destination Mode (Hub Stock vs Multi-EPC Allocation) */}
              <div className="space-y-3">
                <label className="block text-xs font-black uppercase tracking-wider text-text-primary">
                  Step 3: Fulfillment Destination
                </label>

                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setDestinationMode("hub_stock")}
                    className={`p-3.5 rounded-2xl border text-xs font-bold transition-all text-left flex items-center gap-3 cursor-pointer ${destinationMode === "hub_stock"
                        ? "bg-primary/10 border-primary text-primary"
                        : "bg-surface hover:bg-surface-hover border-border text-text-secondary"
                      }`}
                  >
                    <FaWarehouse size={20} className="shrink-0" />
                    <div>
                      <p className="font-extrabold text-sm text-text-primary">Franchise Hub Stock</p>
                      <p className="text-[11px] text-text-muted">Replenish local buffer stock</p>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setDestinationMode("epc_allocation")}
                    className={`p-3.5 rounded-2xl border text-xs font-bold transition-all text-left flex items-center gap-3 cursor-pointer ${destinationMode === "epc_allocation"
                        ? "bg-primary/10 border-primary text-primary"
                        : "bg-surface hover:bg-surface-hover border-border text-text-secondary"
                      }`}
                  >
                    <FiUsers size={20} className="shrink-0" />
                    <div>
                      <p className="font-extrabold text-sm text-text-primary">Allocate to EPC Buyers</p>
                      <p className="text-[11px] text-text-muted">Direct dispatch to contractors</p>
                    </div>
                  </button>
                </div>

                {/* EPC Allocation Selector Section */}
                {destinationMode === "epc_allocation" && (
                  <div className="space-y-3 pt-2">
                    {/* Header with Search and Quota Tracker */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 bg-surface-hover/70 rounded-2xl border border-border">
                      <div className="relative flex-1">
                        <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" size={14} />
                        <input
                          type="text"
                          value={epcSearch}
                          onChange={(e) => setEpcSearch(e.target.value)}
                          placeholder="Search onboarded EPC by company, name, GSTIN..."
                          className="w-full pl-8 pr-3 py-1.5 text-xs bg-surface border border-border rounded-xl focus:outline-none focus:border-primary text-text-primary"
                        />
                      </div>
                      <div className="flex items-center gap-3 shrink-0 text-xs">
                        <span className="text-text-muted">
                          Total Allocated: <strong className="text-primary font-mono">{totalLooseQuantity} Kits</strong>
                        </span>
                        {deductFromPo && parentRemainingQuota != null && (
                          <span
                            className={`px-2.5 py-0.5 rounded-lg font-bold text-[11px] ${totalLooseQuantity > parentRemainingQuota
                                ? "bg-red-500/20 text-red-600 border border-red-500/30"
                                : "bg-emerald-500/15 text-emerald-600 border border-emerald-500/20"
                              }`}
                          >
                            {totalLooseQuantity > parentRemainingQuota
                              ? `Exceeds Quota by ${totalLooseQuantity - parentRemainingQuota}`
                              : `${Math.max(0, parentRemainingQuota - totalLooseQuantity)} Kits Left in PO`}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Onboarded EPC List */}
                    {filteredEpcBuyers.length === 0 ? (
                      <div className="p-6 text-center bg-surface-hover/40 rounded-2xl border border-dashed border-border text-xs text-text-muted space-y-1">
                        <FiUsers className="mx-auto text-text-muted/60" size={24} />
                        <p className="font-bold">No Onboarded EPC Partners Found</p>
                        <p className="text-[11px]">
                          {epcSearch
                            ? "No EPC matches your search query."
                            : "No EPC buyers are currently registered under your franchise."}
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
                        {filteredEpcBuyers.map((buyer) => {
                          const bId = (buyer._id || buyer.id)?.toString();
                          const allocatedQty = allocations[bId] || 0;
                          const isAllocated = allocatedQty > 0;
                          const buyerName = buyer.company_name || buyer.name || "EPC Contractor";
                          const contactPerson =
                            buyer.name && buyer.name !== buyer.company_name ? buyer.name : buyer.contact_person;
                          const currentRemaining =
                            deductFromPo && parentRemainingQuota != null
                              ? Math.max(0, parentRemainingQuota - (totalLooseQuantity - allocatedQty))
                              : 999;

                          return (
                            <div
                              key={bId}
                              className={`p-3.5 rounded-2xl border transition-all text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${isAllocated
                                  ? "bg-primary/5 dark:bg-primary/10 border-primary shadow-xs"
                                  : "bg-surface hover:bg-surface-hover/80 border-border"
                                }`}
                            >
                              <div className="min-w-0 flex-1 space-y-1">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="font-extrabold text-text-primary text-sm truncate">
                                    {buyerName}
                                  </span>
                                  {buyer.gstin ? (
                                    <span className="px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-600 text-[10px] font-bold font-mono">
                                      GSTIN: {buyer.gstin}
                                    </span>
                                  ) : (
                                    <span className="px-2 py-0.5 rounded-md bg-slate-500/10 text-text-muted text-[10px] font-semibold">
                                      Direct Partner
                                    </span>
                                  )}
                                  {buyer.city && (
                                    <span className="px-2 py-0.5 rounded-md bg-surface text-text-muted text-[10px] flex items-center gap-1 border border-border">
                                      <FiMapPin size={10} /> {buyer.city}
                                    </span>
                                  )}
                                </div>
                                <div className="text-[11px] text-text-muted flex items-center gap-3 flex-wrap">
                                  {contactPerson && (
                                    <span>
                                      Contact: <strong>{contactPerson}</strong>
                                    </span>
                                  )}
                                  {buyer.mobile && (
                                    <span>
                                      Ph: <strong>{buyer.mobile}</strong>
                                    </span>
                                  )}
                                  {isAllocated && (
                                    <span className="text-primary font-bold">
                                      Billed: ₹
                                      {(
                                        unitPriceINR *
                                        allocatedQty *
                                        (1 + gstRatePercent / 100)
                                      ).toLocaleString("en-IN", { maximumFractionDigits: 0 })}
                                    </span>
                                  )}
                                </div>
                              </div>

                              {/* Stepper & Quick Presets */}
                              <div className="flex items-center gap-2 shrink-0 flex-wrap">
                                <div className="flex items-center gap-1">
                                  {[5, 10, 25].map((preset) => (
                                    <button
                                      key={preset}
                                      type="button"
                                      onClick={() => {
                                        const newQty = allocatedQty + preset;
                                        const maxAllowed =
                                          deductFromPo && parentRemainingQuota != null ? currentRemaining : 999;
                                        handleQuantityChange(bId, Math.min(newQty, maxAllowed));
                                      }}
                                      className="px-2 py-1 rounded-lg text-[10px] font-bold bg-surface-hover hover:bg-surface border border-border text-text-secondary hover:text-text-primary cursor-pointer transition-all"
                                    >
                                      +{preset}
                                    </button>
                                  ))}
                                  {deductFromPo && currentRemaining > 0 && (
                                    <button
                                      key="max"
                                      type="button"
                                      onClick={() => handleQuantityChange(bId, currentRemaining)}
                                      className="px-2 py-1 rounded-lg text-[10px] font-black bg-blue-500/10 hover:bg-blue-500/20 text-blue-600 border border-blue-500/30 cursor-pointer transition-all"
                                    >
                                      Max
                                    </button>
                                  )}
                                </div>

                                <div className="flex items-center gap-1">
                                  <button
                                    type="button"
                                    onClick={() => handleStepQty(bId, -1)}
                                    disabled={allocatedQty <= 0}
                                    className="w-7 h-7 rounded-lg bg-surface border border-border font-bold text-xs flex items-center justify-center hover:bg-surface-hover disabled:opacity-30 cursor-pointer"
                                  >
                                    -
                                  </button>
                                  <input
                                    type="number"
                                    min={0}
                                    max={deductFromPo && parentRemainingQuota != null ? currentRemaining : undefined}
                                    value={allocatedQty || ""}
                                    placeholder="0"
                                    onChange={(e) => {
                                      const val = Math.max(0, parseInt(e.target.value, 10) || 0);
                                      const maxAllowed =
                                        deductFromPo && parentRemainingQuota != null ? currentRemaining : 999;
                                      handleQuantityChange(bId, Math.min(val, maxAllowed));
                                    }}
                                    className="w-14 py-1 text-center font-mono font-black text-xs bg-surface border border-border rounded-lg text-primary focus:outline-none focus:border-primary"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => {
                                      if (
                                        deductFromPo &&
                                        parentRemainingQuota != null &&
                                        allocatedQty >= currentRemaining
                                      ) {
                                        return;
                                      }
                                      handleStepQty(bId, 1);
                                    }}
                                    disabled={
                                      deductFromPo &&
                                      parentRemainingQuota != null &&
                                      allocatedQty >= currentRemaining
                                    }
                                    className="w-7 h-7 rounded-lg bg-surface border border-border font-bold text-xs flex items-center justify-center hover:bg-surface-hover disabled:opacity-30 cursor-pointer"
                                  >
                                    +
                                  </button>
                                  <span className="text-[10px] font-bold text-text-muted">Kits</span>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* Site Delivery Address & Destination Details */}
                    <div className="p-3.5 rounded-2xl bg-surface-hover/50 border border-border space-y-2 text-xs">
                      <label className="block text-[11px] font-bold uppercase tracking-wider text-text-primary">
                        EPC Site Dispatch / Delivery Address (Optional)
                      </label>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                        <input
                          type="text"
                          value={destinationAddress}
                          onChange={(e) => setDestinationAddress(e.target.value)}
                          placeholder="e.g. Site Plot #42, Industrial Area / EPC Warehouse"
                          className="sm:col-span-2 p-2 text-xs bg-surface border border-border rounded-xl focus:outline-none focus:border-primary text-text-primary"
                        />
                        <input
                          type="text"
                          maxLength={6}
                          value={destinationPincode}
                          onChange={(e) => setDestinationPincode(e.target.value)}
                          placeholder="Pincode (e.g. 380001)"
                          className="p-2 text-xs bg-surface border border-border rounded-xl font-mono focus:outline-none focus:border-primary text-text-primary"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Step 4: Live Invoice Breakdown & Final Settlement Token Adjustment */}
              <div className="space-y-3 pt-2 border-t border-border">
                <label className="block text-xs font-black uppercase tracking-wider text-text-primary">
                  Step 4: Invoice Calculation &amp; Token Adjustment
                </label>

                {/* THE CELEBRATORY MAGIC MOMENT BANNER FOR FINAL SETTLEMENT */}
                {isFinalSettlement ? (
                  <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-500/20 via-teal-500/20 to-blue-500/20 border-2 border-emerald-500 shadow-sm flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-sm">
                      <FiAward size={20} />
                    </div>
                    <div>
                      <div className="font-black text-sm text-emerald-800 dark:text-emerald-300">
                        🎉 Final PO Settlement Order!
                      </div>
                      <p className="text-xs text-text-primary font-medium mt-0.5">
                        This order fulfills the remaining <strong>{totalLooseQuantity} kits</strong> of PO {selectedParentPo?.po_number}. Your previously paid Token Deposit of <strong>₹{tokenAdjustedINR.toLocaleString("en-IN")}</strong> is being automatically deducted from this invoice!
                      </p>
                    </div>
                  </div>
                ) : deductFromPo && selectedParentPo ? (
                  <div className="p-3.5 rounded-2xl bg-surface-hover border border-border text-xs flex items-center justify-between">
                    <span className="text-text-muted">Intermediate Loose Order:</span>
                    <span className="text-text-primary font-medium">
                      Token deposit of <strong>₹{tokenAvailableINR.toLocaleString("en-IN")}</strong> remains safely held in escrow and will auto-deduct when you order your final remaining {Math.max(0, (parentRemainingQuota || 0) - totalLooseQuantity)} kits.
                    </span>
                  </div>
                ) : null}

                {/* Financial Summary Breakdown */}
                <div className="p-5 bg-surface-hover/60 rounded-3xl border border-border space-y-2.5 text-xs">
                  <div className="flex justify-between text-text-secondary">
                    <span>Kit Unit Price (Base):</span>
                    <span className="font-bold text-text-primary">₹{unitPriceINR.toLocaleString("en-IN")}</span>
                  </div>
                  <div className="flex justify-between text-text-secondary">
                    <span>Quantity ({totalLooseQuantity} kits):</span>
                    <span className="font-black text-primary font-mono">{totalLooseQuantity} Kits</span>
                  </div>
                  <div className="flex justify-between text-text-secondary">
                    <span>Subtotal:</span>
                    <span className="font-bold text-text-primary">₹{subtotalINR.toLocaleString("en-IN")}</span>
                  </div>
                  <div className="flex justify-between text-text-secondary">
                    <span>GST ({gstRatePercent}%):</span>
                    <span className="font-bold text-text-primary">₹{taxINR.toLocaleString("en-IN")}</span>
                  </div>
                  <div className="flex justify-between text-text-secondary pt-1 border-t border-border">
                    <span>Gross Order Total:</span>
                    <span className="font-black text-text-primary">₹{grandTotalINR.toLocaleString("en-IN")}</span>
                  </div>

                  {/* Token Adjustment Line */}
                  {tokenAdjustedINR > 0 && (
                    <div className="flex justify-between text-emerald-600 dark:text-emerald-400 font-black text-sm pt-1 border-t border-emerald-500/20">
                      <span className="flex items-center gap-1">
                        <FiCheckCircle size={14} /> (-) Token Amount Adjusted:
                      </span>
                      <span>-₹{tokenAdjustedINR.toLocaleString("en-IN")}</span>
                    </div>
                  )}

                  {/* Payment Responsibility Split Banner */}
                  {destinationMode === "epc_allocation" ? (
                    <div className="pt-2 border-t border-border space-y-2">
                      <div className="flex justify-between items-center p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-300">
                        <span className="font-bold flex items-center gap-1.5 text-xs">
                          <FiCheckCircle size={16} /> Franchise Payable Now:
                        </span>
                        <span className="text-xl font-black font-mono">₹0</span>
                      </div>
                      <div className="flex justify-between items-center text-xs text-text-muted px-1">
                        <span>Allocated EPC Billed Total:</span>
                        <span className="font-black text-text-primary font-mono text-sm">
                          ₹{netPayableINR.toLocaleString("en-IN")}
                        </span>
                      </div>
                      <p className="text-[11px] text-text-muted">
                        Invoiced and collected directly from allocated EPC Contractor(s).
                      </p>
                    </div>
                  ) : (
                    <div className="flex justify-between items-baseline pt-2 border-t border-border text-base">
                      <span className="font-black text-text-primary">Net Payable to Pay Now:</span>
                      <span className="text-2xl font-black text-primary">
                        ₹{netPayableINR.toLocaleString("en-IN")}
                      </span>
                    </div>
                  )}
                </div>

                {/* Escrow Bank Account Details Card (Hub stock only) */}
                {destinationMode === "hub_stock" && (
                  <div className="p-4 bg-blue-500/10 rounded-2xl border border-blue-500/20 text-xs space-y-2 text-text-primary">
                    <div className="flex justify-between items-center">
                      <span className="font-black text-blue-700 dark:text-blue-300 uppercase tracking-wider text-[11px]">
                        Deposit Net Amount to Official Escrow Account
                      </span>
                      <span className="text-[10px] bg-blue-500/20 text-blue-700 dark:text-blue-300 font-bold px-2 py-0.5 rounded">
                        RTGS / NEFT / IMPS
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-[11px]">
                      <div>
                        <span className="text-text-muted block">Bank</span>
                        <strong>{bankDetails.bank_name}</strong>
                      </div>
                      <div>
                        <span className="text-text-muted block">Account No.</span>
                        <strong className="font-mono text-primary">{bankDetails.account_number}</strong>
                      </div>
                      <div>
                        <span className="text-text-muted block">IFSC Code</span>
                        <strong className="font-mono">{bankDetails.ifsc_code}</strong>
                      </div>
                      <div>
                        <span className="text-text-muted block">UPI ID</span>
                        <strong className="font-mono text-primary">{bankDetails.upi_id}</strong>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Step 5: Payment Routing & Submission */}
              {destinationMode === "epc_allocation" ? (
                <div className="space-y-3 pt-2 border-t border-border">
                  <label className="block text-xs font-black uppercase tracking-wider text-text-primary">
                    Step 5: EPC Direct Billing &amp; Dispatch Routing
                  </label>
                  <div className="p-4 rounded-2xl bg-gradient-to-r from-blue-500/10 to-indigo-500/10 border border-blue-500/20 space-y-2">
                    <div className="flex items-center gap-2 text-blue-700 dark:text-blue-300 font-bold text-xs">
                      <FiCheckCircle className="text-blue-500 shrink-0" size={16} />
                      <span>Zero Franchise Payment Required</span>
                    </div>
                    <p className="text-xs text-text-secondary leading-relaxed">
                      Payment for this loose delivery order will be completed directly by the allocated EPC Contractor(s) from their portal or via RTGS/NEFT to SolarKits escrow. This order will be submitted with status <strong>Awaiting EPC Payment</strong> and will be processed for dispatch once verified by SolarKits Accounts.
                    </p>
                    <div className="flex flex-wrap gap-2 pt-1 text-[11px] text-text-muted">
                      <span className="px-2 py-0.5 rounded bg-surface border border-border">
                        Allocated EPCs: <strong>{Object.keys(allocations).length}</strong>
                      </span>
                      <span className="px-2 py-0.5 rounded bg-surface border border-border">
                        Total Units: <strong>{totalLooseQuantity} Kits</strong>
                      </span>
                      <span className="px-2 py-0.5 rounded bg-surface border border-border">
                        EPC Billed Value: <strong>₹{netPayableINR.toLocaleString("en-IN")}</strong>
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-3 pt-2 border-t border-border">
                  <label className="block text-xs font-black uppercase tracking-wider text-text-primary">
                    Step 5: Bank Transfer (UTR) &amp; Proof
                  </label>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-text-primary mb-1">
                        UTR / Transaction Ref No. <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. ICICR24098123456"
                        value={utrNumber}
                        onChange={(e) => setUtrNumber(e.target.value.toUpperCase())}
                        className="w-full p-2.5 text-xs bg-surface border border-border rounded-xl font-mono uppercase font-bold focus:outline-none focus:border-primary"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-text-primary mb-1">
                        Amount Paid (₹) <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="number"
                        required
                        placeholder="Net Payable"
                        value={amountPaid}
                        onChange={(e) => setAmountPaid(e.target.value)}
                        className="w-full p-2.5 text-xs bg-surface border border-border rounded-xl font-mono font-bold focus:outline-none focus:border-primary"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-text-primary mb-1">
                        Payment Date <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="date"
                        required
                        value={paymentDate}
                        onChange={(e) => setPaymentDate(e.target.value)}
                        className="w-full p-2.5 text-xs bg-surface border border-border rounded-xl focus:outline-none focus:border-primary"
                      />
                    </div>
                  </div>
                </div>
              )}

              {formError && (
                <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-xs font-bold text-red-600">
                  {formError}
                </div>
              )}

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setCreateModal(false)}
                  className="px-4 py-2.5 rounded-xl border border-border text-text-secondary hover:bg-surface-hover text-xs font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting || totalLooseQuantity <= 0}
                  className="px-6 py-2.5 bg-primary hover:bg-primary-hover text-white rounded-xl text-xs font-black shadow-md transition-all cursor-pointer disabled:opacity-50"
                >
                  {submitting
                    ? "Submitting Loose Order..."
                    : destinationMode === "epc_allocation"
                      ? `Submit & Allocate to EPC(s) (₹0 Franchise Payable)`
                      : `Submit Order (Pay ₹${netPayableINR.toLocaleString("en-IN")})`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── VIEW ORDER DETAILS MODAL ────────────────────────────────────────── */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-surface rounded-3xl border border-border shadow-2xl max-w-2xl w-full p-6 space-y-5 max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in-95">
            <div className="flex justify-between items-center border-b border-border pb-3">
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 bg-blue-500/15 text-blue-600 rounded-full">
                  Loose Solar Kit Order
                </span>
                <h3 className="text-lg font-black text-text-primary mt-1 font-mono">
                  {selectedOrder.po_number || selectedOrder.order_number || `#LPO-${String(selectedOrder._id).slice(-6).toUpperCase()}`}
                </h3>
              </div>
              <button
                onClick={() => setSelectedOrder(null)}
                className="p-1.5 text-text-muted hover:text-text-primary rounded-lg hover:bg-surface-hover cursor-pointer"
              >
                <FiX size={20} />
              </button>
            </div>

            {/* Parent PO Reference if linked */}
            {selectedOrder.parent_po_id && (
              <div className="p-4 rounded-2xl bg-surface-hover border border-border text-xs space-y-1.5">
                <div className="flex items-center justify-between font-bold">
                  <span className="text-text-muted">Linked Parent PO:</span>
                  <span className="font-mono text-primary font-black">
                    {selectedOrder.parent_po_id.po_number || selectedOrder.parent_po_id}
                  </span>
                </div>
                {selectedOrder.is_final_po_settlement && (
                  <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 font-bold flex items-center gap-1.5">
                    <FiAward size={15} /> Final PO Settlement Order — ₹{Math.round((selectedOrder.token_adjusted_paise || 0) / 100).toLocaleString("en-IN")} Token Adjusted!
                  </div>
                )}
              </div>
            )}

            {/* Solar Kit Summary */}
            <div className="space-y-2">
              <span className="text-xs font-black uppercase tracking-wider text-text-primary block">
                Procured Solar Kit Package
              </span>
              <div className="p-4 bg-surface-hover rounded-2xl border border-border space-y-2 text-xs">
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-extrabold text-sm text-text-primary">
                      {selectedOrder.items?.[0]?.item_name || "Authorized Solar Combo Kit"}
                    </h4>
                    <p className="text-text-muted text-[11px] mt-0.5">
                      Total Quantity: <strong className="text-primary font-mono">{(selectedOrder.items || []).reduce((sum, i) => sum + (i.quantity || 1), 0)} Kits</strong>
                    </p>
                  </div>
                  <StatusBadge status={selectedOrder.status || selectedOrder.order_status} />
                </div>
              </div>
            </div>

            {/* EPC Contractor Allocations */}
            {(selectedOrder.items?.[0]?.epc_allocations || []).length > 0 && (
              <div className="space-y-2">
                <span className="text-xs font-black uppercase tracking-wider text-text-primary block">
                  Allocated EPC Contractors
                </span>
                <div className="p-3 bg-surface-hover rounded-2xl border border-border space-y-2 text-xs">
                  {selectedOrder.items[0].epc_allocations.map((alloc, idx) => (
                    <div key={idx} className="flex justify-between items-center p-2 rounded-xl bg-surface border border-border">
                      <div>
                        <div className="font-bold text-text-primary">{alloc.company_name || alloc.buyer_name || "EPC Contractor"}</div>
                        {alloc.gstin && <div className="text-[10px] text-text-muted font-mono">GSTIN: {alloc.gstin}</div>}
                      </div>
                      <div className="text-right">
                        <span className="font-black text-primary font-mono">{alloc.allocated_quantity} Kits</span>
                        <div className="text-[10px] text-text-muted font-semibold capitalize">{alloc.payment_status || "Pending Payment"}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Financial Summary */}
            <div className="p-4 bg-surface-hover rounded-2xl border border-border space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-text-muted">Gross PO Total:</span>
                <span className="font-bold">
                  ₹{((selectedOrder.grand_total_inr || selectedOrder.grand_total_paise / 100 || selectedOrder.total_amount) || 0).toLocaleString("en-IN")}
                </span>
              </div>
              {selectedOrder.token_adjusted_paise > 0 && (
                <div className="flex justify-between text-emerald-600 font-black">
                  <span>(-) Token Amount Adjusted:</span>
                  <span>-₹{Math.round(selectedOrder.token_adjusted_paise / 100).toLocaleString("en-IN")}</span>
                </div>
              )}
              {selectedOrder.destination_type === "epc_allocation" ? (
                <>
                  <div className="flex justify-between items-center pt-2 border-t border-border font-black text-sm text-emerald-600">
                    <span>Franchise Payable:</span>
                    <span>₹0</span>
                  </div>
                  <div className="flex justify-between items-center text-xs text-text-muted">
                    <span>Payable by Allocated EPC(s):</span>
                    <span className="font-bold text-text-primary">
                      ₹{Math.round(((selectedOrder.net_payable_paise != null ? selectedOrder.net_payable_paise : selectedOrder.grand_total_paise) || 0) / 100).toLocaleString("en-IN")}
                    </span>
                  </div>
                </>
              ) : (
                <div className="flex justify-between items-center pt-2 border-t border-border font-black text-sm">
                  <span>Net Payable:</span>
                  <span className="text-primary">
                    ₹{Math.round(((selectedOrder.net_payable_paise != null ? selectedOrder.net_payable_paise : selectedOrder.grand_total_paise) || 0) / 100).toLocaleString("en-IN")}
                  </span>
                </div>
              )}
            </div>

            {/* Payment & Settlement Status */}
            {selectedOrder.destination_type === "epc_allocation" ? (
              <div className="p-3.5 bg-blue-500/10 rounded-xl border border-blue-500/20 space-y-1 text-xs text-text-primary">
                <span className="font-bold text-blue-700 dark:text-blue-300 uppercase tracking-wider text-[11px] block">
                  EPC Direct Billing &amp; Collection
                </span>
                <p>
                  Payment responsibility is allocated to the registered EPC Contractor(s).
                </p>
                <p>
                  Payment Status: <strong className="capitalize">{selectedOrder.payment_status || "Awaiting EPC Payment"}</strong>
                </p>
              </div>
            ) : (
              <div className="p-3.5 bg-blue-500/10 rounded-xl border border-blue-500/20 space-y-1 text-xs text-text-primary">
                <span className="font-bold text-blue-700 dark:text-blue-300 uppercase tracking-wider text-[11px] block">
                  Offline Bank Transfer Verification
                </span>
                <p className="font-mono">
                  UTR Number: <strong>{selectedOrder.offline_payment?.utr_number || selectedOrder.payment_reference || "N/A"}</strong>
                </p>
                <p>
                  Payment Status: <strong className="capitalize">{selectedOrder.payment_status || "In Verification"}</strong>
                </p>
              </div>
            )}

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setSelectedOrder(null)}
                className="px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}