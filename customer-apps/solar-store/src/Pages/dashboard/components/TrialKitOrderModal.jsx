import { useState, useEffect, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  FaTruck,
  FaMapMarkerAlt,
  FaBoxOpen,
  FaRupeeSign,
  FaCheckCircle,
  FaExclamationCircle,
  FaClock,
  FaShoppingCart,
  FaShieldAlt,
  FaTag,
  FaWarehouse,
  FaClipboardList,
  FaLayerGroup,
  FaCalendarAlt,
  FaBoxes,
} from "react-icons/fa";
import { useDispatch, useSelector } from "react-redux";
import Dialog from "@/Components/Dialog";
import Button from "@/Components/Button";
import axiosInstance from "@/utils/axiosInstance";
import { addToCart, setAlert, setShowAuthDialog } from "@/features/slice";

export default function TrialKitOrderModal({
  isOpen,
  onClose,
  kit,
  currentVariant,
  selectedVariantIndex = 0,
}) {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { isAuthenticated, user } = useSelector((state) => state.auth_slice);

  // Trial kit default quantity (typically 1 Kit)
  const defaultTrialQty = kit?.trial_kit_quantity !== undefined && kit?.trial_kit_quantity !== null
    ? Math.max(1, Number(kit.trial_kit_quantity) || 1)
    : 1;
  const [trialQty, setTrialQty] = useState(defaultTrialQty);

  const trialLimit = Number(kit?.trial_kit_max_orders_per_buyer ?? kit?.trialKitMaxOrdersPerBuyer ?? 1);
  const purchasedTrialCount = Number(kit?.trial_kit_purchased_count ?? kit?.trialKitPurchasedCount ?? 0);
  const isTrialLimitReached = Boolean(kit?.trial_kit_limit_reached ?? kit?.trialKitLimitReached) ||
    (trialLimit > 0 && purchasedTrialCount >= trialLimit);

  // Live buffer stock from TrialKitInventory
  const trialStock = Number(
    kit?.trial_kit_available_stock ??
    kit?.trialKitAvailableStock ??
    kit?.available_stock ??
    0
  );
  const isTrialInStock = Boolean(
    (kit?.is_trial_in_stock ?? kit?.isTrialInStock) !== undefined
      ? (kit?.is_trial_in_stock ?? kit?.isTrialInStock)
      : (trialStock >= trialQty && trialStock > 0)
  );

  // Pincode input & calculation state
  const [pincode, setPincode] = useState(user?.pincode || "");
  const [loading, setLoading] = useState(false);
  const [deliveryData, setDeliveryData] = useState(null);
  const [errorMsg, setErrorMsg] = useState("");

  // Admin-configured loose order quantities (e.g. 25, 50, 100 or 45, 75, 105 kits)
  const looseOrderQuantities = useMemo(() => {
    const rawLoose = kit?.looseOrderQuantities || kit?.loose_order_quantities || [];
    const fromPricing = (kit?.loose_order_pricing || []).map((t) => Number(t.quantity)).filter((n) => !isNaN(n) && n > 0);
    const combined = [...new Set([...(Array.isArray(rawLoose) ? rawLoose.map(Number) : []), ...fromPricing])]
      .filter((n) => !isNaN(n) && n > 0)
      .sort((a, b) => a - b);
    return combined.length > 0 ? combined : [25, 50, 100];
  }, [kit?.looseOrderQuantities, kit?.loose_order_quantities, kit?.loose_order_pricing]);

  // Admin-configured Bulk PO quantities (e.g. 200, 500 or 500, 1000 kits)
  const poOrderQuantities = useMemo(() => {
    const rawPo = kit?.orderQuantities || kit?.order_quantities || [];
    const fromPricing = (kit?.po_order_pricing || []).map((t) => Number(t.quantity)).filter((n) => !isNaN(n) && n > 0);
    const combined = [...new Set([...(Array.isArray(rawPo) ? rawPo.map(Number) : []), ...fromPricing])]
      .filter((n) => !isNaN(n) && n > 0)
      .sort((a, b) => a - b);
    return combined.length > 0 ? combined : [200, 500, 1000];
  }, [kit?.orderQuantities, kit?.order_quantities, kit?.po_order_pricing]);

  // Future Purchase Intent Questionnaire State (Trial Kit Special Form - Only 'loose' or 'bulk_po')
  const [purchaseMode, setPurchaseMode] = useState("loose"); // 'loose' | 'bulk_po'
  const [selectedQuantity, setSelectedQuantity] = useState(() => looseOrderQuantities[0] || 25);
  const [timeline, setTimeline] = useState("within_15_days");
  const [remarks, setRemarks] = useState("");

  const handleSelectMode = (mode) => {
    setPurchaseMode(mode);
    if (mode === "loose") {
      setSelectedQuantity(looseOrderQuantities[0] || 25);
    } else {
      setSelectedQuantity(poOrderQuantities[0] || 200);
    }
  };

  useEffect(() => {
    if (purchaseMode === "loose") {
      if (!looseOrderQuantities.includes(selectedQuantity)) {
        setSelectedQuantity(looseOrderQuantities[0] || 25);
      }
    } else {
      if (!poOrderQuantities.includes(selectedQuantity)) {
        setSelectedQuantity(poOrderQuantities[0] || 200);
      }
    }
  }, [purchaseMode, looseOrderQuantities, poOrderQuantities]);

  // Sync trial quantity when kit changes
  useEffect(() => {
    if (kit?.trial_kit_quantity !== undefined && kit?.trial_kit_quantity !== null) {
      setTrialQty(Math.max(1, Number(kit.trial_kit_quantity) || 1));
    }
  }, [kit?.trial_kit_quantity, kit?.id]);

  // Derived variant pricing
  const unitPrice = useMemo(() => {
    return Number(
      currentVariant?.ourPrice ||
      kit?.ourPrice ||
      kit?.selling_price_inr ||
      kit?.price ||
      0
    );
  }, [currentVariant, kit]);

  const kitSubtotal = useMemo(() => {
    return unitPrice * trialQty;
  }, [unitPrice, trialQty]);

  // Function to calculate delivery cost from backend
  const handleCalculateFreight = useCallback(
    async (pinToUse) => {
      const pin = String(pinToUse || pincode).trim();
      if (!/^\d{6}$/.test(pin)) {
        setErrorMsg("Please enter a valid 6-digit PIN code.");
        setDeliveryData(null);
        return;
      }

      setErrorMsg("");
      setLoading(true);
      try {
        const res = await axiosInstance.get(
          `/india/v1/shop/delivery-cost/calculate`,
          {
            params: {
              pincode: pin,
              kit_id: kit?._id || kit?.id,
              quantity: trialQty,
              order_type: "trial",
              unit_price: unitPrice,
              gst_rate:
                currentVariant?.gstRate ??
                currentVariant?.gst_rate ??
                kit?.gstRate ??
                kit?.gst_rate ??
                kit?.pricing?.gstRate ??
                kit?.pricing?.gst_rate,
            },
          }
        );

        if (res.data?.success && res.data?.data) {
          setDeliveryData(res.data.data);
        } else {
          setErrorMsg(res.data?.message || "Failed to fetch freight calculation.");
        }
      } catch (err) {
        console.error("Delivery freight calculation error:", err);
        setErrorMsg(
          err.response?.data?.message ||
          "Could not compute freight for this PIN. Please check internet connection."
        );
      } finally {
        setLoading(false);
      }
    },
    [pincode, kit, trialQty, unitPrice, currentVariant]
  );

  // Auto-calculate freight if user has default pincode
  useEffect(() => {
    if (user?.pincode && /^\d{6}$/.test(String(user.pincode).trim()) && isOpen && !deliveryData) {
      handleCalculateFreight(user.pincode);
    }
  }, [user?.pincode, isOpen, handleCalculateFreight, deliveryData]);

  const handlePincodeChange = (e) => {
    const val = e.target.value.replace(/\D/g, "").slice(0, 6);
    setPincode(val);
    if (val.length === 6) {
      handleCalculateFreight(val);
    } else {
      setDeliveryData(null);
      setErrorMsg("");
    }
  };

  // Grand total calculation
  const deliveryFreight = deliveryData ? Number(deliveryData.delivery_cost || 0) : 0;
  const grandTotal = kitSubtotal + deliveryFreight;
  const gstRate = useMemo(() => {
    const rawRate =
      deliveryData?.pricing?.gst_rate ??
      currentVariant?.gstRate ??
      currentVariant?.gst_rate ??
      kit?.gstRate ??
      kit?.gst_rate ??
      kit?.pricing?.gstRate ??
      kit?.pricing?.gst_rate;
    return rawRate !== undefined && rawRate !== null && !isNaN(Number(rawRate))
      ? Number(rawRate)
      : 13.8;
  }, [deliveryData, currentVariant, kit]);

  const gstIncludedAmount =
    grandTotal > 0 ? Math.round(grandTotal - grandTotal / (1 + gstRate / 100)) : 0;

  // Handle Add to Cart / Checkout
  const handleConfirmAddToCart = (goToCheckout = false) => {
    if (!isAuthenticated) {
      dispatch(setShowAuthDialog(true));
      return;
    }

    if (isTrialLimitReached) {
      setErrorMsg(`Only 1 trial kit per product is permitted per registered GST number. You have already ordered a trial kit for "${kit?.name || kit?.kitName || 'this combo kit'}".`);
      return;
    }

    if (!isTrialInStock) {
      setErrorMsg("Trial kit is currently out of stock in warehouse buffer. Please contact your BDE or SolarKits support.");
      return;
    }

    if (!deliveryData) {
      setErrorMsg("Please calculate delivery freight with a valid PIN code first.");
      return;
    }

    const effectiveQty = Number(selectedQuantity) || (purchaseMode === "loose" ? looseOrderQuantities[0] : poOrderQuantities[0]) || 25;

    const futureIntentPayload = {
      future_purchase_mode: purchaseMode,
      expected_quantity: effectiveQty,
      loose_quantity: purchaseMode === "loose" ? effectiveQty : 0,
      po_quantity: purchaseMode === "bulk_po" ? effectiveQty : 0,
      estimated_timeline:
        timeline === "within_15_days"
          ? "Within 15 Days"
          : timeline === "15_to_30_days"
            ? "15 - 30 Days"
            : timeline === "1_to_3_months"
              ? "1 - 3 Months"
              : "3+ Months",
      remarks: remarks.trim(),
    };

    dispatch(
      addToCart({
        id: kit.id || kit._id,
        variantIndex: selectedVariantIndex,
        qty: trialQty,
        is_trial_kit: true,
        order_type: "trial",
        trial_kit_quantity: trialQty,
        future_intent: futureIntentPayload,
        delivery_cost: deliveryFreight,
        delivery_pincode: pincode,
        delivery_district: deliveryData.district_name || selectedDistrict?.name || "",
        delivery_state: deliveryData.state_name || "",
        delivery_estimated_days: deliveryData.estimated_timeline || "3-5 Business Days",
      })
    );

    if (dispatch(setAlert)) {
      dispatch(
        setAlert({
          status: "success",
          message: `${trialQty} Trial Kits added for PIN ${pincode}! Proceeding to trial checkout.`,
        })
      );
    }

    onClose();
    if (goToCheckout) {
      navigate("/checkout");
    }
  };

  if (!isOpen) return null;

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title={`Trial Kit Order (${trialQty} Kits) • ${kit?.kitName || "Solar Kit"}`}
      size="lg"
    >
      <div className="p-6 space-y-5 text-text-primary">
        {/* Banner Card */}
        <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent p-4 rounded-2xl border border-primary/20 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-xl bg-primary text-white flex items-center justify-center shrink-0 shadow-md">
              <FaBoxOpen size={24} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-black uppercase tracking-wider text-primary bg-primary/10 px-2.5 py-0.5 rounded-full">
                  Trial Kit Package
                </span>
                <span className="text-xs font-bold text-text-muted">
                  {currentVariant?.productTier || "Tier-1 Efficiency"}
                </span>
              </div>
              <h3 className="text-lg font-black text-text-primary mt-0.5">
                {kit?.kitName}
              </h3>
            </div>
          </div>

          <div className="text-right">
            <span className="text-[10px] text-text-muted font-bold uppercase tracking-wider block">
              Unit Kit Price
            </span>
            <span className="text-xl font-extrabold text-primary">
              ₹{unitPrice.toLocaleString("en-IN")}
            </span>
            <span className="text-[10px] text-text-muted block">per single kit</span>
          </div>
        </div>

        {/* GSTIN & Strict Policy Notice */}
        <div className="bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200/80 dark:border-blue-800/40 p-3.5 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs">
          <div className="flex items-center gap-2 text-blue-900 dark:text-blue-300 font-semibold">
            <FaShieldAlt className="text-blue-600 dark:text-blue-400 shrink-0 text-sm" />
            <span>Policy: Strictly 1 Trial Kit Per Product Per EPC GST Number</span>
          </div>
          <div className="font-mono text-xs font-bold text-blue-800 dark:text-blue-200 bg-blue-100/80 dark:bg-blue-900/50 px-3 py-1 rounded-xl border border-blue-200 dark:border-blue-800 self-start sm:self-auto">
            {user?.gstin ? `EPC GSTIN: ${user.gstin}` : "Verified at Order Checkout"}
          </div>
        </div>

        {/* 1 Trial Kit Per Product Limit Reached Warning */}
        {isTrialLimitReached && (
          <div className="bg-amber-500/15 border border-amber-500/40 p-3.5 rounded-2xl flex items-center justify-between text-xs animate-in fade-in">
            <div className="flex items-center gap-2.5 text-amber-900 dark:text-amber-200 font-semibold">
              <FaShieldAlt className="text-amber-600 dark:text-amber-400 shrink-0 text-base" />
              <div>
                <span className="block font-black text-amber-900 dark:text-amber-200 uppercase tracking-wide">
                  1 Trial Kit Per Product Limit Reached
                </span>
                <span className="text-[11px] font-medium text-amber-800 dark:text-amber-300">
                  A trial kit for this product has already been ordered under your registered GST. You cannot place another trial kit order for this product.
                </span>
              </div>
            </div>
            <span className="font-mono text-xs font-black text-amber-800 dark:text-amber-200 bg-amber-100 dark:bg-amber-900/60 px-3 py-1 rounded-xl border border-amber-300 dark:border-amber-700 shrink-0">
              1/1 Ordered
            </span>
          </div>
        )}

        {/* Warehouse Buffer Stock Status */}
        {isTrialInStock ? (
          <div className="bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200/80 dark:border-emerald-800/40 p-3 rounded-2xl flex items-center justify-between text-xs">
            <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-300 font-semibold">
              <FaCheckCircle className="text-emerald-600 dark:text-emerald-400 shrink-0 text-sm" />
              <span>Trial Buffer Stock Available: {trialStock} Kits in Warehouse</span>
            </div>
            <span className="font-mono text-xs font-bold text-emerald-800 dark:text-emerald-200 bg-emerald-100 dark:bg-emerald-900/50 px-2.5 py-0.5 rounded-lg border border-emerald-300 dark:border-emerald-700">
              In Stock
            </span>
          </div>
        ) : (
          <div className="bg-rose-50/80 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 p-3.5 rounded-2xl flex items-center justify-between text-xs">
            <div className="flex items-center gap-2.5 text-rose-800 dark:text-rose-300 font-semibold">
              <FaExclamationCircle className="text-rose-600 dark:text-rose-400 shrink-0 text-base" />
              <div>
                <span className="block font-black text-rose-900 dark:text-rose-200">OUT OF STOCK IN WAREHOUSE BUFFER</span>
                <span className="text-[11px] font-medium text-rose-700 dark:text-rose-400">
                  Trial kit stock is 0 Kits. New orders cannot be placed until stock is replenished by Admin.
                </span>
              </div>
            </div>
            <span className="font-mono text-xs font-black text-rose-800 dark:text-rose-200 bg-rose-100 dark:bg-rose-900/60 px-3 py-1 rounded-xl border border-rose-300 dark:border-rose-700 shrink-0">
              0 Kits Available
            </span>
          </div>
        )}

        {/* Configuration Row: Quantity & Pincode */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Trial Quantity Section */}
          <div className="bg-surface-hover/60 border border-border p-4 rounded-2xl">
            <label className="text-xs font-black text-text-secondary uppercase tracking-wider block mb-2">
              Configured Trial Order Quantity
            </label>
            <div className="flex items-center gap-3">
              <div className="flex-1 bg-surface border border-border rounded-xl px-4 py-2.5 flex items-center justify-between shadow-xs">
                <span className="font-extrabold text-lg text-text-primary">
                  {trialQty} Kits
                </span>
                <span className="text-[11px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-md">
                  Admin Preset
                </span>
              </div>
            </div>
            <p className="text-[11px] text-text-muted mt-2">
              This kit is configured for trial orders of{" "}
              <strong className="text-text-primary">{trialQty} kits</strong> to test quality and compatibility on field.
            </p>
          </div>

          {/* Delivery Pincode Input */}
          <div className="bg-surface-hover/60 border border-border p-4 rounded-2xl">
            <label className="text-xs font-black text-text-secondary uppercase tracking-wider block mb-2">
              Delivery Pincode (District Wise Freight)
            </label>
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <FaMapMarkerAlt
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-primary text-sm"
                />
                <input
                  type="text"
                  value={pincode}
                  onChange={handlePincodeChange}
                  maxLength={6}
                  placeholder="Enter 6-digit PIN code (e.g. 361320)"
                  className="w-full pl-9 pr-3 py-2.5 bg-surface border border-border rounded-xl text-sm font-bold text-text-primary focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                />
              </div>
              <Button
                type="button"
                variant="primary"
                size="md"
                onClick={() => handleCalculateFreight(pincode)}
                disabled={loading || pincode.length !== 6}
                leftIcon={<FaTruck className={loading ? "animate-bounce" : ""} />}
                className="shrink-0 font-bold px-4"
              >
                {loading ? "Checking..." : "Check Delivery Cost"}
              </Button>
            </div>
            <p className="text-[11px] text-text-muted mt-2">
              Freight rate is calculated dynamically per State, District & PIN code.
            </p>
          </div>
        </div>

        {/* ── Future Purchase Intent Questionnaire (Trial Kits Exclusive) ── */}
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-4 sm:p-5 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-amber-500/20">
            <div className="flex items-center gap-2.5">
              <span className="p-2 rounded-xl bg-amber-500/20 text-amber-600 dark:text-amber-400">
                <FaClipboardList size={18} />
              </span>
              <div>
                <h4 className="text-xs sm:text-sm font-black text-text-primary flex items-center gap-2">
                  <span>Pre-Order Future Purchase Intent</span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500 text-white uppercase tracking-wider">
                    Trial Kits Exclusive
                  </span>
                </h4>
                <p className="text-[11px] text-text-muted mt-0.5">
                  Which purchase model and quantities do you plan to buy once this trial kit is tested?
                </p>
              </div>
            </div>
            <div className="text-right hidden sm:block">
              <span className="text-[10px] font-bold text-amber-800 dark:text-amber-300 uppercase block">
                Planned Future Stock
              </span>
              <span className="text-sm font-black text-amber-600 dark:text-amber-400">
                {selectedQuantity} Kits
              </span>
            </div>
          </div>

          {/* Question 1: Loose vs Bulk PO */}
          <div>
            <label className="text-xs font-black text-text-secondary uppercase tracking-wider block mb-2 flex items-center gap-1.5">
              <FaLayerGroup className="text-amber-500" />
              1. Which Purchase Option Will You Choose in the Future? *
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => handleSelectMode("loose")}
                className={`p-3 rounded-xl border text-left transition-all ${
                  purchaseMode === "loose"
                    ? "bg-amber-500/15 border-amber-500 text-amber-900 dark:text-amber-200 ring-2 ring-amber-500/20 shadow-xs"
                    : "bg-surface border-border hover:bg-surface-hover text-text-secondary"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-extrabold text-xs">Loose Kits</span>
                  {purchaseMode === "loose" && <FaCheckCircle className="text-amber-600 dark:text-amber-400 text-xs" />}
                </div>
                <p className="text-[10px] text-text-muted mt-1">
                  Flexible on-demand order ({looseOrderQuantities[0]} - {looseOrderQuantities[looseOrderQuantities.length - 1]} Kits)
                </p>
              </button>

              <button
                type="button"
                onClick={() => handleSelectMode("bulk_po")}
                className={`p-3 rounded-xl border text-left transition-all ${
                  purchaseMode === "bulk_po"
                    ? "bg-amber-500/15 border-amber-500 text-amber-900 dark:text-amber-200 ring-2 ring-amber-500/20 shadow-xs"
                    : "bg-surface border-border hover:bg-surface-hover text-text-secondary"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-extrabold text-xs">Bulk PO</span>
                  {purchaseMode === "bulk_po" && <FaCheckCircle className="text-amber-600 dark:text-amber-400 text-xs" />}
                </div>
                <p className="text-[10px] text-text-muted mt-1">
                  Commercial Bulk PO ({poOrderQuantities[0]}+ Kits scheduled deliveries)
                </p>
              </button>
            </div>
          </div>

          {/* Question 2: Expected Quantities (Configured Pills Only - No Manual Text Input) */}
          <div className="space-y-3 pt-1">
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-black text-text-secondary uppercase tracking-wider block flex items-center gap-1.5">
                  <FaBoxes className="text-amber-500" />
                  2. Select {purchaseMode === "loose" ? "Loose Order" : "Bulk PO"} Quantity *
                </label>
                <span className="text-[11px] font-bold text-amber-600 dark:text-amber-400">
                  Selected: {selectedQuantity} Kits
                </span>
              </div>
              <div className="flex flex-wrap gap-2.5">
                {(purchaseMode === "loose" ? looseOrderQuantities : poOrderQuantities).map((qty) => {
                  const isSelected = selectedQuantity === qty;
                  return (
                    <button
                      key={qty}
                      type="button"
                      onClick={() => setSelectedQuantity(qty)}
                      className={`px-4 py-2.5 rounded-xl font-black text-xs transition-all flex items-center gap-2 border shadow-xs ${
                        isSelected
                          ? "bg-amber-500 text-white border-amber-600 ring-2 ring-amber-500/30 scale-[1.02]"
                          : "bg-surface hover:bg-surface-hover text-text-primary border-border"
                      }`}
                    >
                      <span>{qty} Kits</span>
                      {isSelected && <FaCheckCircle className="text-white text-xs" />}
                    </button>
                  );
                })}
              </div>
              <p className="text-[10px] text-text-muted mt-1.5">
                {purchaseMode === "loose"
                  ? "Admin-configured loose batch sizes available for instant dispatch."
                  : "Admin-configured commercial bulk PO volumes for scheduled factory fulfillment."}
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div>
                <label className="text-xs font-black text-text-secondary uppercase tracking-wider block mb-1.5 flex items-center gap-1.5">
                  <FaCalendarAlt className="text-amber-500" />
                  Estimated Purchase Timeline *
                </label>
                <select
                  value={timeline}
                  onChange={(e) => setTimeline(e.target.value)}
                  className="w-full px-3 py-2 bg-surface border border-border rounded-xl text-xs font-bold text-text-primary focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 transition-all"
                >
                  <option value="within_15_days">Within 15 Days after Trial Delivery</option>
                  <option value="15_to_30_days">15 - 30 Days (Next Month Project)</option>
                  <option value="1_to_3_months">1 - 3 Months (Quarterly Pipeline)</option>
                  <option value="3_plus_months">3+ Months (Future Tender/Tied)</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-black text-text-secondary uppercase tracking-wider block mb-1.5">
                  Remarks / Project Scope (Optional)
                </label>
                <input
                  type="text"
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  placeholder="e.g. Residential 50 kW rooftop, EPC tender"
                  className="w-full px-3 py-2 bg-surface border border-border rounded-xl text-xs font-medium text-text-primary focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 transition-all"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Error message */}
        {errorMsg && (
          <div className="bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 p-3.5 rounded-xl flex items-center gap-2.5 text-rose-600 dark:text-rose-400 text-xs font-semibold">
            <FaExclamationCircle size={16} className="shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Freight & Location Result */}
        {deliveryData && (
          <div className="bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/40 rounded-2xl p-5 space-y-4 animate-in fade-in duration-300">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-emerald-200/60 dark:border-emerald-800/30">
              <div className="flex items-center gap-2.5">
                <FaCheckCircle className="text-emerald-500 text-lg shrink-0" />
                <div>
                  <span className="text-xs font-black text-emerald-800 dark:text-emerald-300 block">
                    Serviceable Location
                  </span>
                  <span className="text-sm font-bold text-text-primary">
                    {deliveryData.district_name ? `${deliveryData.district_name}, ` : ""}
                    {deliveryData.state_name || "India"} ({deliveryData.pincode})
                  </span>
                  {deliveryData.warehouse && (
                    <div className="flex items-center gap-1.5 text-[11px] text-emerald-700 dark:text-emerald-400 font-semibold mt-0.5">
                      <FaWarehouse size={10} className="shrink-0" />
                      <span>Fulfillment: {deliveryData.warehouse.name}</span>
                      {deliveryData.distance_km > 0 && (
                        <span className="font-mono text-[10px] bg-emerald-500/20 px-1.5 py-0.2 rounded font-bold">
                          ~{deliveryData.distance_km} km
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2 bg-surface px-3 py-1.5 rounded-xl border border-border text-xs font-bold text-text-secondary shadow-xs self-start sm:self-auto">
                <FaClock className="text-primary text-xs" />
                <span>{deliveryData.estimated_timeline || "3 - 5 Business Days"}</span>
              </div>
            </div>

            {/* Price Breakdown Table */}
            <div className="space-y-2 text-xs">
              <div className="flex justify-between items-center text-text-secondary">
                <span>
                  Kits Subtotal ({trialQty} × ₹{unitPrice.toLocaleString("en-IN")})
                </span>
                <span className="font-bold text-text-primary">
                  ₹{kitSubtotal.toLocaleString("en-IN")}
                </span>
              </div>

              <div className="flex justify-between items-center text-text-secondary">
                <span className="flex items-center gap-1.5">
                  <FaTruck className="text-primary text-xs" />
                  Delivery Charge ({deliveryData.pincode}):
                </span>
                <span className="font-extrabold text-emerald-600 dark:text-emerald-400 text-sm">
                  {deliveryData.delivery_cost > 0
                    ? `+₹${deliveryData.delivery_cost.toLocaleString("en-IN")}`
                    : "FREE Delivery"}
                </span>
              </div>

              <div className="flex justify-between items-center text-text-secondary pt-1 border-t border-dashed border-border">
                <span>Estimated GST Included ({gstRate}%):</span>
                <span className="font-medium text-text-muted">
                  ₹{gstIncludedAmount.toLocaleString("en-IN")}
                </span>
              </div>

              <div className="flex justify-between items-center pt-2 border-t border-emerald-300 dark:border-emerald-800 text-sm">
                <span className="font-black text-text-primary">Grand Total Landed Cost:</span>
                <span className="text-xl font-black text-primary">
                  ₹{grandTotal.toLocaleString("en-IN")}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Benefits Note */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-2 text-center text-[11px] text-text-muted font-semibold">
          <div className="bg-surface-hover/40 p-2.5 rounded-xl border border-border flex items-center justify-center gap-1.5">
            <FaShieldAlt className="text-primary" /> Genuine Tier-1 Hardware
          </div>
          <div className="bg-surface-hover/40 p-2.5 rounded-xl border border-border flex items-center justify-center gap-1.5">
            <FaTruck className="text-emerald-500" /> Direct Warehouse Dispatch
          </div>
          <div className="bg-surface-hover/40 p-2.5 rounded-xl border border-border flex items-center justify-center gap-1.5">
            <FaTag className="text-amber-500" /> B2B EPC Pricing
          </div>
          <div className="bg-emerald-500/10 p-2.5 rounded-xl border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 flex items-center justify-center gap-1.5 font-bold">
            <FaCheckCircle className="text-emerald-500" /> 100% Full Payment
          </div>
        </div>

        {/* Modal Action Buttons */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-3 pt-4 border-t border-border">
          <Button variant="ghost" size="md" onClick={onClose} className="font-bold">
            Cancel
          </Button>
          <Button
            variant="outline"
            size="md"
            onClick={() => handleConfirmAddToCart(false)}
            disabled={!deliveryData || loading || isTrialLimitReached || !isTrialInStock}
            leftIcon={<FaShoppingCart />}
            className="font-bold px-4 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Add to Cart
          </Button>
          <Button
            variant="primary"
            size="lg"
            onClick={() => handleConfirmAddToCart(true)}
            disabled={!deliveryData || loading || isTrialLimitReached || !isTrialInStock}
            leftIcon={<FaTruck className="text-white" />}
            className="font-black px-6 bg-gradient-to-r from-amber-600 via-amber-500 to-amber-600 hover:from-amber-700 hover:to-amber-600 text-white shadow-md hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isTrialLimitReached
              ? "Already Ordered (1/GST Limit)"
              : !isTrialInStock
                ? "Out of Stock (Trial Kit)"
                : "Order Trial Kit (Checkout)"}
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
