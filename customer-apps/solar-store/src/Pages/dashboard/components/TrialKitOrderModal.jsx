import { useState, useEffect, useMemo, useCallback } from "react";
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
  const dispatch = useDispatch();
  const { isAuthenticated, user } = useSelector((state) => state.auth_slice);
  const selectedDistrict = useSelector((state) => state.slice.selectedDistrict);

  // Trial Quantity: configured by admin (default 10)
  const defaultTrialQty = Number(kit?.trial_kit_quantity || 10);
  const [trialQty, setTrialQty] = useState(defaultTrialQty);

  const trialLimit = Number(kit?.trial_kit_max_orders_per_buyer ?? kit?.trialKitMaxOrdersPerBuyer ?? 1);
  const purchasedTrialCount = Number(kit?.trial_kit_purchased_count ?? kit?.trialKitPurchasedCount ?? 0);
  const isTrialLimitReached = Boolean(kit?.trial_kit_limit_reached ?? kit?.trialKitLimitReached) ||
    (trialLimit > 0 && purchasedTrialCount >= trialLimit);

  // Pincode input & calculation state
  const [pincode, setPincode] = useState(user?.pincode || "");
  const [loading, setLoading] = useState(false);
  const [deliveryData, setDeliveryData] = useState(null);
  const [errorMsg, setErrorMsg] = useState("");

  // Sync trial quantity when kit changes
  useEffect(() => {
    if (kit?.trial_kit_quantity) {
      setTrialQty(Number(kit.trial_kit_quantity));
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
          "Unable to calculate freight for this PIN code. Please try again."
        );
      } finally {
        setLoading(false);
      }
    },
    [pincode, kit?._id, kit?.id, trialQty, unitPrice, currentVariant, kit]
  );

  // Auto-calculate if 6-digit pin is present on open
  useEffect(() => {
    if (isOpen && pincode && /^\d{6}$/.test(pincode)) {
      handleCalculateFreight(pincode);
    }
  }, [isOpen]);

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

  // Handle Add to Cart
  const handleConfirmAddToCart = () => {
    if (!isAuthenticated) {
      dispatch(setShowAuthDialog(true));
      return;
    }

    if (isTrialLimitReached) {
      setErrorMsg(`Maximum trial kit purchase limit (${trialLimit} order(s)) has been reached for this product.`);
      return;
    }

    if (!deliveryData) {
      setErrorMsg("Please calculate delivery freight with a valid PIN code first.");
      return;
    }

    dispatch(
      addToCart({
        id: kit.id || kit._id,
        variantIndex: selectedVariantIndex,
        qty: trialQty,
        is_trial_kit: true,
        order_type: "trial",
        trial_kit_quantity: trialQty,
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
          message: `${trialQty} Trial Kits added to cart with ₹${deliveryFreight.toLocaleString("en-IN")} freight for PIN ${pincode}!`,
        })
      );
    }

    onClose();
  };

  if (!isOpen) return null;

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title={`Trial Kit Order (${trialQty} Kits) • ${kit?.kitName || "Solar Kit"}`}
      size="lg"
    >
      <div className="p-6 space-y-6 text-text-primary">
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

        {/* Configuration Row: Quantity & Pincode */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
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
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-border">
          <Button variant="ghost" size="md" onClick={onClose} className="font-bold">
            Cancel
          </Button>
          <Button
            variant="primary"
            size="lg"
            onClick={handleConfirmAddToCart}
            disabled={!deliveryData || loading || isTrialLimitReached}
            leftIcon={<FaShoppingCart />}
            className="font-black px-6 bg-gradient-to-r from-primary to-primary-end shadow-md hover:shadow-lg transition-all"
          >
            Add to Cart
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
