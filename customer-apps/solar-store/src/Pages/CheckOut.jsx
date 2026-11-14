import React, { useState, useEffect, useMemo } from "react";
import { useSelector, useDispatch } from "react-redux";
import { useNavigate, useSearchParams } from "react-router-dom";
import axios from "axios";
import {
  FiClock, FiTag, FiCheckCircle, FiAlertTriangle, FiShoppingCart,
  FiLock, FiAward, FiMapPin, FiUsers, FiUploadCloud, FiCopy,
  FiFileText, FiDollarSign, FiCalendar, FiCreditCard, FiCheck
} from "react-icons/fi";
import { clearCart, removeItemsFromCart, syncCartWithBackend } from "@/features/slice";
import { setAlert } from "@/features/alert.slice";
import Button from "@/Components/Button";
import Loader from "@/Components/Loader";
import CustomInput from "@/Components/CustomInput";
import GstVerificationDialog from "@/Components/GstVerificationDialog";
import { hasPermission } from "@/utils/permissions";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

export default function CheckOut() {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [searchParams] = useSearchParams();
  const milestoneGroupParam = searchParams.get("milestone_group");
  const cart = useSelector((state) => state.slice.cart);
  const selectedDistrict = useSelector((state) => state.slice.selectedDistrict);
  const { user } = useSelector((state) => state.auth_slice);

  // Filter items if checking out a specific milestone group / card
  const checkoutItems = useMemo(() => {
    if (!cart || cart.length === 0) return [];
    if (!milestoneGroupParam) return cart;
    const filtered = cart.filter((item) => (item.milestone_group_key || `adv_${item.payment_milestones?.advance_percentage || 30}_rem_${item.payment_milestones?.remaining_percentage || 70}`) === milestoneGroupParam);
    return filtered.length > 0 ? filtered : cart;
  }, [cart, milestoneGroupParam]);

  // Settings & Status
  const [loading, setLoading] = useState(true);
  const [_reserving, setReserving] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // GST State Verification
  const selectedState = useSelector((state) => state.slice.selectedState);
  const [showGstDialog, setShowGstDialog] = useState(false);
  const [gstStateId, setGstStateId] = useState("");
  const [verifiedGstInfo, setVerifiedGstInfo] = useState(null);

  // Company Bank Details
  const [bankDetails, setBankDetails] = useState({
    account_name: "SolarKits Technologies Pvt Ltd",
    bank_name: "HDFC Bank",
    account_number: "50200088991122",
    ifsc_code: "HDFC0001234",
    branch_name: "Corporate Financial Center, Mumbai",
    account_type: "Current Account",
    upi_id: "solarkits.pay@hdfcbank",
  });
  const [copiedField, setCopiedField] = useState("");
  const [iciciVanDetails, setIciciVanDetails] = useState(null);

  // ── Region Payment Configuration ──────────────────────────────────────────
  const [regionConfig, setRegionConfig] = useState(null);
  const [effectivePaymentMode, setEffectivePaymentMode] = useState("offline"); // 'offline' | 'online' | 'both'
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState("offline"); // 'offline' | 'online'
  const [_loadingConfig, setLoadingConfig] = useState(false);

  // Offline Payment Form State
  const [utrNumber, setUtrNumber] = useState("");
  const [amountPaid, setAmountPaid] = useState("");
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().slice(0, 10));
  const [senderBankName, setSenderBankName] = useState("");
  const [accountHolderName, _setAccountHolderName] = useState("");
  const [receiptFile, setReceiptFile] = useState(null);
  const [receiptPreview, setReceiptPreview] = useState(null);

  // ── Payment Milestone Configuration ───────────────────────────────────────
  const [milestoneConfig, setMilestoneConfig] = useState(null);
  const [payFullAmount, setPayFullAmount] = useState(false);

  // Detect whether current checkout contains a trial kit order
  const isTrialOrder = useMemo(() => {
    return Boolean(checkoutItems?.some((item) => item?.is_trial_kit));
  }, [checkoutItems]);

  // If trial kit order, strictly enforce 100% full upfront payment
  useEffect(() => {
    if (isTrialOrder) {
      setPayFullAmount(true);
    }
  }, [isTrialOrder]);

  // Timer State
  const [timerEnabled, setTimerEnabled] = useState(true);
  const [timeLeft, setTimeLeft] = useState(0);
  const [expiryTime, setExpiryTime] = useState(null);

  // Checkout Settings (dynamic from API with fallback)
  const [checkoutSettings, setCheckoutSettings] = useState({
    enable_checkout_timer: true,
    checkout_timer_duration: 20,
    gst_rate: 13.8,
  });

  // Offers and Coupons
  const [activeOffers, setActiveOffers] = useState([]);
  const [couponCodeInput, setCouponCodeInput] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState(null);
  const [couponError, setCouponError] = useState("");
  const [showCouponInput, setShowCouponInput] = useState(false); // collapsed by default

  // Fetch dynamic Checkout Settings (GST rate, timer, etc.)
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const res = await axios.get(`${API_URL}/india/v1/shop/checkout-settings`);
        if (res.data?.success && res.data.data) {
          setCheckoutSettings(res.data.data);
        }
      } catch (err) {
        console.error("Failed to load checkout settings:", err);
      }
    };
    fetchSettings();
  }, []);

  // Fetch dynamic Active Offers
  useEffect(() => {
    const fetchActiveOffers = async () => {
      try {
        const distId = selectedDistrict?._id || selectedDistrict?.id || "";
        const res = await axios.get(`${API_URL}/india/v1/shop/active-offers?district_id=${distId}`);
        if (res.data?.success) {
          setActiveOffers(res.data.data || []);
        }
      } catch (error) {
        console.error("Error loading offers in checkout:", error);
      }
    };
    fetchActiveOffers();
  }, [selectedDistrict]);

  // Submission State
  const [submitting, setSubmitting] = useState(false);
  const [orderConfirmed, setOrderConfirmed] = useState(false);
  const [confirmedOrderData, setConfirmedOrderData] = useState(null);

  // Multi-district delivery addresses
  const _groupedCart = useMemo(() => {
    const groups = {};
    cart.forEach((item) => {
      const distId = item.districtId || "default";
      const distName = item.districtName || "Standard";
      if (!groups[distId]) {
        groups[distId] = {
          districtId: distId,
          districtName: distName,
          items: [],
        };
      }
      groups[distId].items.push(item);
    });
    return Object.values(groups);
  }, [cart]);

  // Delivery Address State
  const [deliveryAddress, setDeliveryAddress] = useState({
    line: "",
    pincode: "",
    district_name: "",
    state_name: "",
    contact_name: "",
    contact_phone: "",
  });

  // ── Module 1.1: Fulfillment Modes & Live Warehouse Capacity Check ──────────
  const [fulfillmentMode, setFulfillmentMode] = useState("direct_site"); // 'direct_site' | 'epc_warehouse'
  const [capacityChecking, setCapacityChecking] = useState(false);
  const [capacityResult, setCapacityResult] = useState(null);

  // Compute Order Load Metrics — must use item.qty (Redux cart field), NOT item.quantity (undefined for EPC catalogue items)
  const orderLoadMetrics = useMemo(() => {
    return checkoutItems.reduce((acc, item) => {
      const qty = Number(item.qty || 1);  // ← item.qty is the Redux cart quantity field
      let kw = Number(item.kw || item.capacity_kw || (item.capacity ? parseFloat(item.capacity) : 0) || (item.capacityKW || 0)) || 0;
      if (kw === 0) {
        const m = (item.kitName || item.name || item.title || '').match(/(\d+(?:\.\d+)?)\s*k?w\b/i);
        if (m) kw = parseFloat(m[1]) || 0;
      }
      const weight = Number(item.weight_kg || item.weight) || (kw > 0 ? Math.round(kw * 75) : 150);
      acc.total_kits += qty;
      acc.total_kw += qty * kw;
      acc.total_weight_kg += qty * weight;
      return acc;
    }, { total_kits: 0, total_kw: 0, total_weight_kg: 0 });
  }, [checkoutItems]);

  // Live Warehouse Capacity Check
  useEffect(() => {
    if (checkoutItems.length === 0) return;
    if (fulfillmentMode === "direct_site") {
      setCapacityResult({ allowed: true, message: "Direct site delivery: no warehouse capacity limits apply." });
      return;
    }

    const verifyCapacity = async () => {
      setCapacityChecking(true);
      try {
        const cartItemsParam = checkoutItems.map(item => {
          let kw = Number(item.kw || item.capacity_kw || (item.capacity ? parseFloat(item.capacity) : 0) || (item.capacityKW || 0)) || 0;
          if (kw === 0) {
            const m = (item.kitName || item.name || item.title || '').match(/(\d+(?:\.\d+)?)\s*k?w\b/i);
            if (m) kw = parseFloat(m[1]) || 0;
          }
          return {
            quantity: item.qty || 1,  // ← use item.qty (Redux cart field), not item.quantity
            kw_per_kit: kw,
            weight_kg_per_kit: Number(item.weight_kg || item.weight) || (kw > 0 ? Math.round(kw * 75) : 250),
          };
        });

        const res = await axios.get(
          `${API_URL}/india/v1/shop/checkout/warehouse-capacity-check`,
          {
            params: {
              fulfillment_mode: fulfillmentMode,
              cart_items: JSON.stringify(cartItemsParam),
              district_id: selectedDistrict?.id || selectedDistrict?._id,
              franchisee_id: user?.primary_reseller_id || user?.reseller_id || undefined,
            },
            withCredentials: true,
          }
        );

        if (res.data?.success && res.data?.data) {
          setCapacityResult(res.data.data);
        } else {
          setCapacityResult({ allowed: true });
        }
      } catch (err) {
        console.warn("Capacity check warning:", err);
        setCapacityResult({ allowed: true, note: "Offline capacity check fallback" });
      } finally {
        setCapacityChecking(false);
      }
    };

    verifyCapacity();
  }, [cart, fulfillmentMode, selectedDistrict]);

  useEffect(() => {
    if (user || selectedState || selectedDistrict || cart.length > 0) {
      const pinFromCart = cart.find((k) => k.delivery_pincode)?.delivery_pincode;
      setDeliveryAddress((prev) => ({
        line: prev.line || user?.address || "",
        pincode: pinFromCart || prev.pincode || user?.pincode || "380001",
        district_name: prev.district_name || selectedDistrict?.name || user?.district_name || "",
        state_name: prev.state_name || selectedState?.name || user?.state_name || "",
        contact_name: prev.contact_name || user?.name || "EPC Contractor",
        contact_phone: prev.contact_phone || user?.whatsapp || user?.mobile || "",
      }));
    }
  }, [user, selectedState, selectedDistrict, cart]);

  // Fetch ICICI Virtual Account details and listen for real-time payment confirmation
  useEffect(() => {
    const rawApiUrl = import.meta.env.VITE_API_URL || "http://localhost:5000";
    const baseUrl = rawApiUrl.replace(/\/api\/?$/, "").replace(/\/+$/, "");
    const userPhone = user?.whatsapp || user?.registered_whatsapp || user?.mobile || "7777939842";

    axios.get(`${baseUrl}/api/v1/payments/icici/van-details?phone=${userPhone}`)
      .then((res) => {
        if (res.data?.success) setIciciVanDetails(res.data.data);
      })
      .catch((err) => console.warn("Could not load ICICI VAN details:", err));

    const epcId = user?._id || user?.id;
    const streamUrl = `${baseUrl}/api/v1/payments/icici/stream?role=epc&epc_id=${epcId || ""}`;
    const es = new EventSource(streamUrl);

    es.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === "ICICI_PAYMENT_CREDITED") {
          console.log("⚡ Auto-detected ICICI Payment credit during checkout!", data);
          dispatch(setAlert({
            type: "success",
            message: `Payment of ${data.amountFormatted || ('₹' + data.amount)} confirmed via ICICI UTR: ${data.utr}!`
          }));
          setUtrNumber(data.utr);
          setAmountPaid(String(data.amount));
          setOrderConfirmed(true);
          setConfirmedOrderData((prev) => ({
            ...(prev || {}),
            order_number: data.orderNumber || "CONFIRMED",
            utr_number: data.utr,
            status: "confirmed"
          }));
          dispatch(clearCart());
        }
      } catch (err) {
        console.error(err);
      }
    };

    return () => es.close();
  }, [user, dispatch]);

  // ── Fetch Region-wise Payment Gateway Configuration ───────────────────────
  useEffect(() => {
    const distId =
      selectedDistrict?.id ||
      selectedDistrict?._id ||
      (cart[0]?.districtId && cart[0].districtId !== "default" ? cart[0].districtId : null);
    const stateId = selectedState?.id || selectedState?._id;

    if (!distId && !stateId) return;

    const params = new URLSearchParams();
    if (distId) params.append("district_id", distId);
    if (stateId) params.append("state_id", stateId);
    params.append("order_type", "epc_order");

    setLoadingConfig(true);
    axios
      .get(`${API_URL}/payment-config/resolve?${params.toString()}`)
      .then((res) => {
        const cfg = res.data?.config;
        if (cfg) {
          setRegionConfig(cfg);
          const mode = cfg.payment_mode || "offline";
          setEffectivePaymentMode(mode);
          if (mode === "online") {
            setSelectedPaymentMethod("online");
          } else {
            setSelectedPaymentMethod("offline");
          }
        }
      })
      .catch((err) => {
        console.warn("Could not resolve region payment config, defaulting to offline:", err);
      })
      .finally(() => setLoadingConfig(false));
  }, [selectedDistrict, selectedState, cart]);

  // ── Resolve Product Payment Milestone Configuration ───────────────────────
  useEffect(() => {
    if (!checkoutItems || checkoutItems.length === 0) return;
    const primaryKit = checkoutItems.find((item) => item.id || item.kit_id);

    // If kit already carries payment_milestones metadata, pre-fill instantly
    if (primaryKit?.payment_milestones) {
      const pm = primaryKit.payment_milestones;
      setMilestoneConfig({
        ...pm,
        milestones: pm.milestones || [
          { milestone_number: 1, title: "Milestone 1 — Advance Payment", percentage: pm.advance_percentage },
          { milestone_number: 2, title: "Milestone 2 — Final Payment", percentage: pm.remaining_percentage },
        ],
      });
    }

    const kitId = primaryKit?.kit_id || primaryKit?.id;
    const url = kitId
      ? `${API_URL}/india/v1/shop/payment-milestones/resolve?kit_id=${kitId}`
      : `${API_URL}/india/v1/shop/payment-milestones/resolve`;

    axios
      .get(url)
      .then((res) => {
        if (res.data?.success && res.data?.milestone_config) {
          setMilestoneConfig(res.data.milestone_config);
        }
      })
      .catch((err) => {
        console.warn("Could not resolve payment milestones, defaulting:", err);
      });
  }, [checkoutItems]);

  const checkGstStatus = async () => {
    const stateId = selectedState?.id || selectedState?._id || selectedDistrict?.parent_id || selectedDistrict?.state_id || selectedDistrict?.stateId || user?.primaryLocation?.state?._id || user?.primaryLocation?.state || "";
    try {
      const res = await axios.get(`${API_URL}/india/v1/shop/gst/status?state_id=${stateId}`, { withCredentials: true });
      if (res.data?.success && !res.data.verified) {
        setGstStateId(stateId);
        setShowGstDialog(true);
      }
    } catch (err) {
      console.error("Failed to check GST status:", err);
    }
  };

  // Stock reservation on mount
  const handleReserveStock = async () => {
    if (orderConfirmed || !checkoutItems || checkoutItems.length === 0) return;
    setReserving(true);
    setErrorMsg("");
    try {
      const payloadItems = checkoutItems.map((item) => ({
        id: item.id,
        qty: item.qty,
        is_custom: item.is_custom || false,
      }));

      if (payloadItems.length === 0) {
        setReserving(false);
        setLoading(false);
        return;
      }

      const res = await axios.post(
        `${API_URL}/india/v1/shop/reserve-stock`,
        { items: payloadItems },
        { withCredentials: true }
      );

      if (res.data?.success) {
        if (res.data.timer_enabled || res.data.expiry_time) {
          setTimerEnabled(true);
          const expTime = new Date(res.data.expiry_time);
          setExpiryTime(expTime);
          const diffSeconds = Math.max(0, Math.floor((expTime.getTime() - Date.now()) / 1000));
          setTimeLeft(diffSeconds);
        } else {
          setTimerEnabled(false);
        }
      }
    } catch (error) {
      console.error("Reservation failed:", error);
      if (!orderConfirmed) {
        setErrorMsg(error.response?.data?.message || "Stock reservation failed. Some items may no longer be available in warehouse.");
      }
    } finally {
      setReserving(false);
      setLoading(false);
    }
  };

  const fetchActiveOffers = async () => {
    try {
      const distId = selectedDistrict?._id || selectedDistrict?.id || "";
      const res = await axios.get(`${API_URL}/india/v1/shop/active-offers?district_id=${distId}`);
      if (res.data?.success) {
        setActiveOffers(res.data.data || []);
      }
    } catch (error) {
      console.error("Error loading offers:", error);
    }
  };

  const fetchBankDetails = async () => {
    try {
      const res = await axios.get(`${API_URL}/india/v1/shop/bank-details`);
      if (res.data?.success && res.data.data) {
        setBankDetails(res.data.data);
      }
    } catch (err) {
      console.error("Error fetching bank details:", err);
    }
  };

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const res = await axios.get(`${API_URL}/india/v1/shop/checkout-settings`);
        if (res.data?.success && res.data.data) {
          setCheckoutSettings(res.data.data);
        }
      } catch (err) {
        console.error("Failed to load checkout settings", err);
      }
    };
    fetchSettings();
    fetchBankDetails();
  }, []);

  useEffect(() => {
    if (orderConfirmed) return;
    if (user && !hasPermission(user, "can_checkout")) {
      dispatch(
        setAlert({
          type: "error",
          message: "Your sub-user account is not authorized to checkout orders. Please contact your EPC Administrator.",
        })
      );
      navigate("/cart");
      return;
    }
    if (cart.length === 0) {
      navigate("/cart");
      return;
    }
    handleReserveStock();
    fetchActiveOffers();
    checkGstStatus();
  }, [cart, navigate, selectedDistrict, selectedState, orderConfirmed, user, dispatch]);

  // Countdown timer logic
  useEffect(() => {
    if (!timerEnabled || !expiryTime || timeLeft <= 0) return;

    const interval = setInterval(() => {
      const diff = Math.max(0, Math.floor((expiryTime.getTime() - Date.now()) / 1000));
      setTimeLeft(diff);

      if (diff <= 0) {
        clearInterval(interval);
        dispatch(setAlert({ type: "warning", message: "Checkout session reservation expired! Your items have been released." }));
        navigate("/cart");
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [timerEnabled, expiryTime, timeLeft, navigate]);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  };

  const getTaxBreakdown = (amount) => {
    const fallbackRate = Number(checkoutSettings.gst_rate ?? 13.8);
    let taxable = 0;
    let gstAmount = 0;

    cart.forEach((item) => {
      const itemValue = item.qty * item.ourPrice;
      const itemGstRate = Number(item.gstRate ?? item.gst_rate ?? item.pricing?.gstRate ?? item.pricing?.gst_rate ?? item.tax_pct ?? fallbackRate);
      const itemTaxable = Math.round(itemValue / (1 + itemGstRate / 100));
      const itemGst = Math.max(0, itemValue - itemTaxable);
      taxable += itemTaxable;
      gstAmount += itemGst;
    });

    const effectiveRate = taxable > 0 ? Number(((gstAmount / taxable) * 100).toFixed(2)) : fallbackRate;
    const computedTaxable = Math.round(amount > 0 ? amount / (1 + effectiveRate / 100) : taxable);
    const computedGstAmount = Math.max(0, amount - computedTaxable);

    return {
      taxable: computedTaxable,
      gstAmount: computedGstAmount,
      gstRate: effectiveRate,
    };
  };

  const subtotal = useMemo(() => {
    return checkoutItems.reduce((sum, item) => sum + item.qty * item.ourPrice, 0);
  }, [checkoutItems]);

  const totalKitsQuantity = useMemo(() => {
    return checkoutItems.reduce((sum, item) => sum + item.qty, 0);
  }, [checkoutItems]);

  const totalCapacityKW = useMemo(() => {
    return checkoutItems.reduce((sum, item) => sum + (item.capacityKW || 0) * item.qty, 0);
  }, [checkoutItems]);

  // Dynamic Discounts & Priority Logic Calculations
  const calculatedDiscounts = useMemo(() => {
    let flashSaleDiscount = 0;
    let bundleDiscount = 0;
    let couponDiscount = 0;
    let standardDiscount = 0;

    let activeOfferName = "None";
    let activeOfferType = "";

    const activeFlashSales = checkoutItems.map((item) => item.flashSale).filter(Boolean);
    if (activeFlashSales.length > 0) {
      const fs = activeFlashSales[0];
      activeOfferName = fs.name;
      activeOfferType = "Flash Sale";
      checkoutItems.forEach((item) => {
        if (item.flashSale) {
          if (fs.discountType === "percent") {
            flashSaleDiscount += Math.round(item.qty * item.ourPrice * (fs.discountValue / 100));
          } else {
            flashSaleDiscount += item.qty * fs.discountValue;
          }
        }
      });
    }

    const bundleOffer = activeOffers.find((o) => o.offer_type === "bundle");
    const minQty = bundleOffer && bundleOffer.max_qty ? bundleOffer.max_qty : 5;
    const bundleCartItems =
      bundleOffer && bundleOffer.products_applicable && bundleOffer.products_applicable.length > 0
        ? checkoutItems.filter((item) => bundleOffer.products_applicable.some((pId) => pId.toString() === item.id.toString()))
        : checkoutItems;
    const bundleKitsQuantity = bundleCartItems.reduce((sum, item) => sum + item.qty, 0);
    const bundleCapacityKW = bundleCartItems.reduce((sum, item) => sum + (item.capacityKW || 0) * item.qty, 0);

    if (bundleOffer && bundleKitsQuantity >= minQty) {
      bundleDiscount = bundleCapacityKW * bundleOffer.discount_value;
    }
    // NOTE: No fallback hardcoded discount — only apply when admin has configured a Bundle Offer

    if (appliedCoupon) {
      const applicableSubtotal =
        appliedCoupon.products_applicable && appliedCoupon.products_applicable.length > 0
          ? checkoutItems
            .filter((item) => appliedCoupon.products_applicable.some((pId) => pId.toString() === item.id.toString()))
            .reduce((sum, item) => sum + item.qty * item.ourPrice, 0)
          : subtotal;

      if (applicableSubtotal > 0) {
        if (appliedCoupon.discount_type === "percent") {
          couponDiscount = Math.round(applicableSubtotal * (appliedCoupon.discount_value / 100));
        } else {
          couponDiscount = appliedCoupon.discount_value;
        }
      }
    }

    const discountOffers = activeOffers.filter((o) => o.offer_type === "discount");
    checkoutItems.forEach((item) => {
      const itemOffer = discountOffers.find(
        (o) => o.products_applicable && o.products_applicable.some((pId) => pId.toString() === item.id.toString())
      );
      if (itemOffer) {
        if (itemOffer.discount_type === "percent") {
          standardDiscount += Math.round(item.qty * item.ourPrice * (itemOffer.discount_value / 100));
        } else {
          standardDiscount += item.qty * itemOffer.discount_value;
        }
      }
    });

    let appliedDiscountValue = 0;
    let selectedOffers = [];

    const hasFlashSale = flashSaleDiscount > 0;
    const hasBundle = bundleDiscount > 0;
    const hasCoupon = couponDiscount > 0;
    const hasStandard = standardDiscount > 0;

    if (hasFlashSale) {
      appliedDiscountValue += flashSaleDiscount;
      selectedOffers.push(`Flash Sale: -₹${flashSaleDiscount.toLocaleString("en-IN")}`);
      activeOfferName = activeFlashSales[0].name;
      activeOfferType = "Flash Sale";
    } else if (hasBundle) {
      appliedDiscountValue += bundleDiscount;
      selectedOffers.push(`Buy Pack Offer: -₹${bundleDiscount.toLocaleString("en-IN")}`);
      activeOfferName = bundleOffer?.offer_name || "Buy Pack Offer";
      activeOfferType = "Bundle";
    } else if (hasCoupon) {
      appliedDiscountValue += couponDiscount;
      selectedOffers.push(`Coupon (${appliedCoupon.coupon_code}): -₹${couponDiscount.toLocaleString("en-IN")}`);
      activeOfferName = `Coupon: ${appliedCoupon.coupon_code}`;
      activeOfferType = "Coupon";
    } else if (hasStandard) {
      appliedDiscountValue += standardDiscount;
      selectedOffers.push(`Standard Discount: -₹${standardDiscount.toLocaleString("en-IN")}`);
      activeOfferName = "Standard Discount";
      activeOfferType = "Discount";
    }

    const totalDeliveryFreight = checkoutItems.reduce((sum, item) => sum + (Number(item.delivery_cost) || 0), 0);
    const discountedSubtotal = Math.max(0, subtotal - appliedDiscountValue);

    // Selling price (ourPrice) is already GST-inclusive, extract exact base and GST amounts
    const { taxable: baseSubtotalExclGst, gstAmount: computedGst, gstRate: dynamicGstRate } = getTaxBreakdown(discountedSubtotal);
    const finalTotal = discountedSubtotal + totalDeliveryFreight;

    return {
      discountAmount: appliedDiscountValue,
      offersApplied: selectedOffers,
      offerName: activeOfferName,
      offerType: activeOfferType,
      totalDeliveryFreight,
      discountedSubtotal,
      baseSubtotalExclGst,
      computedGst,
      gstRate: dynamicGstRate,
      finalTotal,
    };
  }, [checkoutItems, totalKitsQuantity, totalCapacityKW, appliedCoupon, activeOffers, subtotal, checkoutSettings]);

  // ── Calculate Milestone Breakdown ──────────────────────────────────────────
  const milestoneBreakdown = useMemo(() => {
    const m1 = milestoneConfig?.milestones?.[0] || {
      percentage: 30,
      title: "Milestone 1 — Advance Payment",
      description: "Advance payment to confirm order & reserve inventory",
    };
    const m2 = milestoneConfig?.milestones?.[1] || {
      percentage: 70,
      title: "Milestone 2 — Final Payment",
      description: "Remaining balance payable before warehouse dispatch clearance",
    };
    const total = calculatedDiscounts.finalTotal || 0;

    // Trial kits require 100% upfront payment (zero remaining balance)
    const m1Pct = isTrialOrder ? 100 : (Number(m1.percentage) || 30);
    const m2Pct = isTrialOrder ? 0 : (Number(m2.percentage) || (100 - m1Pct));
    const advanceAmount = isTrialOrder ? total : Math.round((total * m1Pct) / 100);
    const remainingAmount = isTrialOrder ? 0 : Math.max(0, total - advanceAmount);

    return {
      m1Pct,
      m1Title: isTrialOrder ? "100% Full Payment (Trial Kit)" : (m1.title || "Milestone 1 — Advance Payment"),
      m1Desc: isTrialOrder ? "Full order payment at checkout for trial kit" : (m1.description || "Advance payment at order placement"),
      advanceAmount,
      m2Pct,
      m2Title: m2.title || "Milestone 2 — Final Payment",
      m2Desc: m2.description || "Payable before warehouse dispatch",
      remainingAmount,
      totalAmount: total,
      stages: milestoneConfig?.order_stages_config || [],
    };
  }, [milestoneConfig, calculatedDiscounts.finalTotal, isTrialOrder]);

  // Set default amount paid based on milestone advance or full amount
  useEffect(() => {
    if (calculatedDiscounts.finalTotal > 0) {
      if (isTrialOrder || payFullAmount) {
        setAmountPaid(String(calculatedDiscounts.finalTotal));
      } else if (milestoneBreakdown.advanceAmount > 0) {
        setAmountPaid(String(milestoneBreakdown.advanceAmount));
      }
    }
  }, [calculatedDiscounts.finalTotal, milestoneBreakdown.advanceAmount, payFullAmount, isTrialOrder]);

  const handleCopyText = (text, fieldName) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    setTimeout(() => setCopiedField(""), 2000);
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        dispatch(setAlert({ type: "error", message: "File size exceeds 10MB limit." }));
        return;
      }
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

  const handleApplyCoupon = () => {
    setCouponError("");
    if (!couponCodeInput) return;

    const matched = activeOffers.find(
      (o) => o.offer_type === "coupon" && o.coupon_code.toUpperCase() === couponCodeInput.toUpperCase()
    );

    if (!matched) {
      setCouponError("Invalid or expired coupon code.");
      return;
    }
    setAppliedCoupon(matched);
    setCouponCodeInput("");
  };

  const handleRemoveCoupon = () => {
    setAppliedCoupon(null);
  };

  // Submit Offline Bank Transfer Checkout
  const handleSubmitOfflineOrder = async (e) => {
    e.preventDefault();

    if (!utrNumber.trim()) {
      dispatch(setAlert({ type: "error", message: "Please enter the UTR / Transaction Reference Number." }));
      return;
    }

    if (!amountPaid || Number(amountPaid) <= 0) {
      dispatch(setAlert({ type: "error", message: "Please enter a valid payment amount." }));
      return;
    }

    if (!receiptFile) {
      dispatch(setAlert({ type: "error", message: "Please upload the payment transfer receipt / screenshot." }));
      return;
    }

    // Re-verify GST status
    const stateId = selectedState?.id || selectedState?._id || selectedDistrict?.parent_id || selectedDistrict?.state_id || selectedDistrict?.stateId || user?.primaryLocation?.state?._id || user?.primaryLocation?.state || "";
    if (true) {
      try {
        const res = await axios.get(`${API_URL}/india/v1/shop/gst/status?state_id=${stateId}`, { withCredentials: true });
        if (res.data?.success && !res.data.verified) {
          setGstStateId(stateId);
          setShowGstDialog(true);
          return;
        }
      } catch (err) {
        console.error("GST confirm re-check failed:", err);
      }
    }

    setSubmitting(true);
    try {
      const itemsPayload = checkoutItems.map((item) => ({
        scope_type: item.is_custom ? "product" : "kit",
        product_id: item.is_custom ? item.id : null,
        kit_id: item.is_custom ? null : item.id,
        item_name: item.kitName || item.name || "Solar Kit",
        image: item.image || item.kit_image || item.img || (item.images && item.images[0]) || null,
        capacity: (() => {
          if (item.capacity) return String(item.capacity).includes('kW') ? String(item.capacity) : `${item.capacity} kW`;
          if (item.capacity_kw) return `${item.capacity_kw} kW`;
          if (item.kw) return `${item.kw} kW`;
          if (item.capacityKW) return `${item.capacityKW} kW`;
          const m = (item.kitName || item.name || item.title || '').match(/(\d+(?:\.\d+)?)\s*k?w\b/i);
          return m ? `${m[1]} kW` : null;
        })(),
        description: item.description || null,
        quantity: item.qty || 1,
        ourPrice: item.ourPrice,
        gstRate: Number(item.gstRate ?? item.gst_rate ?? item.pricing?.gstRate ?? item.pricing?.gst_rate ?? checkoutSettings.gst_rate ?? 13.8),
        districtId: item.districtId,
        is_trial_kit: Boolean(item.is_trial_kit),
        delivery_cost: Number(item.delivery_cost || 0),
        delivery_pincode: item.delivery_pincode || null,
        warehouse_name: item.warehouse_name || null,
        fulfillment_source: item.fulfillment_source || null,
      }));

      if (user && !hasPermission(user, "can_checkout")) {
        dispatch(
          setAlert({
            type: "error",
            message: "Your sub-user account is not authorized to checkout orders. Please contact your EPC Administrator.",
          })
        );
        return;
      }

      if (!deliveryAddress.line || !deliveryAddress.line.trim()) {
        dispatch(setAlert({ type: "error", message: "Please provide Delivery / Installation Site Address." }));
        return;
      }
      if (!deliveryAddress.pincode || deliveryAddress.pincode.trim().length < 6) {
        dispatch(setAlert({ type: "error", message: "Please enter a valid 6-digit Delivery PIN Code." }));
        return;
      }

      const addressData = {
        line: deliveryAddress.line.trim(),
        address_line: deliveryAddress.line.trim(),
        pincode: deliveryAddress.pincode.trim(),
        district_name: deliveryAddress.district_name?.trim() || selectedDistrict?.name || "",
        district_id: selectedDistrict?.id || selectedDistrict?._id || null,
        state_name: deliveryAddress.state_name?.trim() || selectedState?.name || "",
        state_id: selectedState?.id || selectedState?._id || null,
        contact_name: deliveryAddress.contact_name?.trim() || user?.name || "EPC Contractor",
        contact_phone: deliveryAddress.contact_phone?.trim() || user?.whatsapp || user?.mobile || "",
      };

      // Capacity Guard Validation
      if (fulfillmentMode === "epc_warehouse" && capacityResult && capacityResult.allowed === false) {
        dispatch(
          setAlert({
            type: "error",
            message: "EPC warehouse is at capacity limit. Please select Direct Site Delivery to proceed.",
          })
        );
        setSubmitting(false);
        return;
      }

      const formData = new FormData();
      formData.append("items", JSON.stringify(itemsPayload));
      formData.append("delivery_address", JSON.stringify(addressData));
      formData.append("fulfillment_mode", fulfillmentMode);
      formData.append("order_load_metrics", JSON.stringify(orderLoadMetrics));
      formData.append(
        "offline_payment_data",
        JSON.stringify({
          utr_number: utrNumber.trim().toUpperCase(),
          amount_paid: Number(amountPaid),
          payment_date: paymentDate,
          sender_bank_name: senderBankName,
          account_holder_name: accountHolderName,
          payment_method: selectedPaymentMethod === "online" ? "icici_ecollection" : "offline_bank_transfer",
          payment_gateway_used: selectedPaymentMethod === "online" ? "icici_ecollection" : "bank_transfer",
        })
      );
      formData.append("payment_method", selectedPaymentMethod === "online" ? "icici_ecollection" : "offline_bank_transfer");
      formData.append("payment_gateway_used", selectedPaymentMethod === "online" ? "icici_ecollection" : "bank_transfer");
      formData.append("payment_receipt", receiptFile);

      const res = await axios.post(`${API_URL}/india/v1/shop/offline-checkout/create`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
        withCredentials: true,
      });

      if (res.data?.success) {
        const orderData = res.data.data?.order || res.data.data;
        setConfirmedOrderData(orderData);
        setOrderConfirmed(true);
        setErrorMsg("");
        setLoading(false);
        const isOnlineOrder = selectedPaymentMethod === "online" ||
          orderData.payment_method === "icici_ecollection" ||
          orderData.payment_gateway_used === "icici_ecollection";

        // Remove only the checked-out items from cart, keeping other milestone cards safe!
        const orderedIds = checkoutItems.map(it => it.cartItemId);
        dispatch(removeItemsFromCart(orderedIds));
        dispatch(syncCartWithBackend());

        dispatch(
          setAlert({
            type: "success",
            message: "Order submitted successfully! Payment details have been submitted for verification.",
          })
        );
      } else {
        throw new Error(res.data?.message || "Failed to place offline order.");
      }
    } catch (err) {
      console.error("Offline order creation error:", err);
      dispatch(
        setAlert({
          type: "error",
          message: err.response?.data?.message || err.message || "Failed to submit offline order. Please check inputs.",
        })
      );
    } finally {
      setSubmitting(false);
    }
  };

  // ── Success State: Order Submitted (Render First) ──────────────
  if (orderConfirmed && confirmedOrderData) {
    const isVerifiedSuccess = confirmedOrderData.payment_status === "captured" ||
      confirmedOrderData.offline_payment?.verification_status === "approved" ||
      confirmedOrderData.order_status === "confirmed";

    return (
      <div className="max-w-xl mx-auto my-10 bg-surface p-8 rounded-3xl border border-border shadow-2xl text-center space-y-6 animate-in fade-in zoom-in-95 duration-300">
        <div className="w-20 h-20 bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 rounded-full flex items-center justify-center mx-auto shadow-inner border border-emerald-500/20">
          <FiCheckCircle size={44} />
        </div>

        <div>
          <span className="inline-block px-3 py-1 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 rounded-full text-xs font-black uppercase tracking-wider mb-2">
            ✓ Order Placed Successfully
          </span>
          <h2 className="text-3xl font-black text-text-primary dark:text-white">Order Confirmed!</h2>
          <p className="text-sm text-text-secondary mt-1.5 max-w-md mx-auto">
            {isVerifiedSuccess ? (
              <>
                Aapka Order Confirm Ho Gaya Hai! Your payment has been <strong>verified</strong>. Materials are moving to warehouse assembly.
              </>
            ) : (
              <>
                Aapka Order Confirm Ho Gaya Hai! Your payment receipt & UTR reference have been forwarded to our <strong>Accounts Department</strong> for authorization.
              </>
            )}
          </p>
        </div>

        <div className="bg-surface-hover p-5 rounded-2xl border border-border text-left space-y-3 text-sm">
          <div className="flex justify-between items-center pb-2 border-b border-border">
            <span className="text-text-secondary font-medium">Order Number:</span>
            <span className="font-mono font-black text-primary text-base">{confirmedOrderData.order_number}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-text-secondary">UTR Reference:</span>
            <span className="font-mono font-bold text-text-primary dark:text-white">
              {confirmedOrderData.offline_payment?.utr_number || utrNumber}
            </span>
          </div>
          {isTrialOrder || confirmedOrderData?.is_trial_order ? (
            <>
              <div className="flex justify-between items-center">
                <span className="text-text-secondary">Total Amount Paid:</span>
                <span className="font-black text-emerald-600 dark:text-emerald-400">
                  ₹{(confirmedOrderData.offline_payment?.amount_paid || calculatedDiscounts.finalTotal).toLocaleString("en-IN")} (100% Full Payment)
                </span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-text-secondary">Payment Terms:</span>
                <span className="font-bold text-emerald-600 dark:text-emerald-400">
                  Trial Kit Order (Full Upfront Paid • Zero Balance Due)
                </span>
              </div>
            </>
          ) : (
            <>
              <div className="flex justify-between items-center">
                <span className="text-text-secondary">Milestone 1 Advance Paid:</span>
                <span className="font-black text-emerald-600 dark:text-emerald-400">
                  ₹{(confirmedOrderData.offline_payment?.amount_paid || milestoneBreakdown.advanceAmount).toLocaleString("en-IN")} ({milestoneBreakdown.m1Pct}%)
                </span>
              </div>
              {milestoneBreakdown.remainingAmount > 0 && !payFullAmount && (
                <div className="flex justify-between items-center text-xs">
                  <span className="text-text-secondary">Milestone 2 Due Before Dispatch:</span>
                  <span className="font-bold text-amber-600 dark:text-amber-400">
                    ₹{milestoneBreakdown.remainingAmount.toLocaleString("en-IN")} ({milestoneBreakdown.m2Pct}%)
                  </span>
                </div>
              )}
            </>
          )}
          <div className="flex justify-between items-center">
            <span className="text-text-secondary">Verification Status:</span>
            {isOnlineSuccess ? (
              <span className="inline-flex items-center gap-1.5 text-xs font-extrabold px-2.5 py-1 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-300">
                <FiCheckCircle size={12} /> Auto-Verified (ICICI Instant)
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 text-xs font-extrabold px-2.5 py-1 rounded-full bg-amber-500/15 text-amber-700 dark:text-amber-300">
                <FiClock size={12} /> Pending Accounts Verification
              </span>
            )}
          </div>
          <div className="flex justify-between items-center">
            <span className="text-text-secondary">Warehouse Stock:</span>
            <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">Reserved (Assembly Stage)</span>
          </div>
          {deliveryAddress.pincode && (
            <div className="flex justify-between items-center pt-2 border-t border-border text-xs">
              <span className="text-text-secondary flex items-center gap-1">
                <FiMapPin size={12} className="text-primary" /> Delivery PIN:
              </span>
              <span className="font-mono font-bold text-text-primary dark:text-white">
                {deliveryAddress.pincode}
              </span>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
          <Button
            onClick={() =>
              navigate("/track-status", {
                state: {
                  orderNumber: confirmedOrderData?.order_number,
                  orderId: confirmedOrderData?._id || confirmedOrderData?.id,
                },
              })
            }
            variant="primary"
            className="py-3.5 shadow-md font-bold text-sm"
          >
            Track Order Delivery Status
          </Button>
          <Button
            onClick={() => navigate("/preconfigured-combo-kit")}
            variant="secondary"
            className="py-3.5 text-sm font-semibold"
          >
            Return to Product Catalogue
          </Button>
        </div>

        {cart.length > 0 && (
          <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-left space-y-2.5 mt-4">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse"></span>
              <p className="text-xs font-bold text-amber-800 dark:text-amber-300">
                You have {cart.length} more {cart.length === 1 ? 'kit' : 'kits'} remaining in another checkout card
              </p>
            </div>
            <Button
              onClick={() => navigate('/cart')}
              variant="primary"
              size="md"
              fullWidth
              className="py-3 font-bold text-xs"
            >
              Proceed to Next Checkout Card →
            </Button>
          </div>
        )}
      </div>
    );
  }

  if (loading) {
    return <Loader text="Securing warehouse inventory and loading checkout..." />;
  }

  if (errorMsg) {
    return (
      <div className="max-w-md mx-auto my-12 bg-surface p-8 rounded-2xl border border-border shadow-lg text-center space-y-4">
        <div className="w-16 h-16 bg-red-100 dark:bg-red-950/40 text-red-500 rounded-full flex items-center justify-center mx-auto">
          <FiAlertTriangle size={32} />
        </div>
        <h3 className="text-xl font-bold text-text-primary dark:text-white">Inventory Lock Blocked</h3>
        <p className="text-sm text-text-secondary">{errorMsg}</p>
        <Button onClick={() => navigate("/cart")} variant="secondary" className="w-full">
          Return to Cart
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-12">
      {/* Checkout timer bar */}
      {timerEnabled && (
        <div className="bg-amber-500/10 border border-amber-500/25 p-4 rounded-2xl flex items-center justify-between gap-4 shadow-sm">
          <div className="flex items-center gap-2.5 text-amber-600 dark:text-amber-400 text-sm font-semibold">
            <FiClock size={18} className="shrink-0" />
            <span>Stock reserved in warehouse! Complete bank transfer details before reservation session expires.</span>
          </div>
          <span className="bg-amber-500 text-white font-mono font-extrabold px-3 py-1.5 rounded-xl text-xs shrink-0 shadow">
            {formatTime(timeLeft)} Remaining
          </span>
        </div>
      )}

      {/* Franchise Attribution Banner */}
      {user?.reseller?.business_name && (
        <div className="bg-emerald-500/10 border border-emerald-500/25 p-4 rounded-2xl flex items-center gap-3 text-emerald-700 dark:text-emerald-300 shadow-sm">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center shrink-0 text-emerald-600 dark:text-emerald-400">
            <FiUsers size={20} />
          </div>
          <div className="text-xs">
            <p className="font-extrabold text-sm text-emerald-800 dark:text-emerald-200">
              Franchise Partner Network: {user.reseller.business_name}
            </p>
            <p className="mt-0.5 opacity-90">
              This order will be fulfilled and attributed through your authorized Franchise Partner (
              <strong>{user.reseller.business_name}</strong>).
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Columns: Order Review & Official Bank Transfer Upload Form */}
        <div className="lg:col-span-2 space-y-6">
          {/* Milestone Card Separation Notice */}
          {cart.length > checkoutItems.length && (
            <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-amber-500/15 via-amber-500/10 to-primary/10 border border-amber-500/30 flex items-center justify-between gap-4 shadow-xs">
              <div className="flex items-center gap-3.5">
                <span className="px-3 py-1.5 rounded-xl bg-amber-500 text-white font-black text-xs uppercase tracking-wider shrink-0 shadow-xs">
                  Card {milestoneBreakdown.m1Pct}% Adv
                </span>
                <div>
                  <h4 className="text-sm font-bold text-gray-900 dark:text-gray-100">
                    Checking out {checkoutItems.length} {checkoutItems.length === 1 ? 'kit' : 'kits'} ({milestoneBreakdown.m1Pct}% Advance Policy)
                  </h4>
                  <p className="text-xs text-text-secondary mt-0.5">
                    {cart.length - checkoutItems.length} other items with different milestones remain in your cart and can be checked out next.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => navigate('/cart')}
                className="px-3.5 py-1.5 rounded-xl border border-amber-500/40 text-amber-700 dark:text-amber-300 text-xs font-bold hover:bg-amber-500/10 transition-colors shrink-0"
              >
                View Cart Cards
              </button>
            </div>
          )}

          {/* Order Items Review */}
          <div className="bg-surface p-6 rounded-2xl border border-border shadow-sm">
            <h3 className="text-lg font-black text-text-primary dark:text-white mb-4 flex items-center gap-2 border-b border-border pb-3">
              <FiShoppingCart className="text-primary" /> Review Selected Solar Kits ({totalKitsQuantity} Units)
            </h3>

            <div className="divide-y divide-border">
              {checkoutItems.map((item) => (
                <div key={item.cartItemId} className="py-4 flex gap-4 items-center">
                  <div className="w-16 h-16 bg-surface-hover border border-border rounded-xl flex items-center justify-center overflow-hidden shrink-0">
                    <img src={item.kitImage} alt={item.kitName} className="object-contain w-12 h-12" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <h4 className="font-bold text-sm text-text-primary dark:text-white truncate">{item.kitName}</h4>
                      {item.is_trial_kit && (
                        <span className="inline-block bg-amber-500/15 text-amber-700 dark:text-amber-300 text-[10px] font-black px-2 py-0.5 rounded-md border border-amber-500/30">
                          Trial Order ({item.qty} Units • PIN: {item.delivery_pincode || 'Specified'})
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-text-secondary mt-0.5 flex items-center gap-1.5 flex-wrap">
                      <span>{item.is_custom ? "Custom Configured" : `${item.productTier || "Standard"} Kit`} • {item.capacityKW} kW</span>
                      {item.districtName && (
                        <span className="inline-flex items-center gap-0.5 ml-1">
                          • <FiMapPin size={11} className="text-primary" /> {item.districtName}
                        </span>
                      )}
                    </p>
                    {item.flashSale && (
                      <span className="inline-block bg-amber-500/15 text-amber-600 text-[10px] font-bold px-2 py-0.5 rounded-md border border-amber-500/20 mt-1">
                        ⚡ Flash Sale Applied
                      </span>
                    )}
                  </div>
                  <div className="text-right shrink-0">
                    <div className="font-black text-text-primary dark:text-white">
                      ₹{(item.qty * item.ourPrice).toLocaleString("en-IN")}
                    </div>
                    <div className="text-xs text-text-muted">Qty: {item.qty}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ── Region-wise Payment Gateway Selection ───────────────────────────── */}
          <div className="space-y-4">
            {/* Mode Switcher Tabs (Shown when mode is 'both') */}
            {effectivePaymentMode === "both" && (
              <div className="bg-surface p-2 rounded-2xl border border-border shadow-sm flex flex-col sm:flex-row gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedPaymentMethod("online")}
                  className={`flex-1 py-3 px-4 rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 transition-all ${selectedPaymentMethod === "online"
                    ? "bg-[#264baa] text-white shadow-md shadow-[#264baa]/30"
                    : "text-text-secondary hover:text-text-primary hover:bg-surface-hover"
                    }`}
                >
                  <FiDollarSign className="text-base" />
                  <span>Instant Online Transfer (ICICI VAN)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedPaymentMethod("offline")}
                  className={`flex-1 py-3 px-4 rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 transition-all ${selectedPaymentMethod === "offline"
                    ? "bg-primary text-white shadow-md shadow-primary/30"
                    : "text-text-secondary hover:text-text-primary hover:bg-surface-hover"
                    }`}
                >
                  <FiUploadCloud className="text-base" />
                  <span>Offline Bank Transfer (UTR + Receipt)</span>
                </button>
              </div>
            )}

            {/* Online ICICI Virtual Account (VAN) Details Card */}
            {(selectedPaymentMethod === "online" || effectivePaymentMode === "online") && (
              <div className="bg-gradient-to-br from-[#264baa]/10 via-surface to-[#264baa]/5 p-5 sm:p-6 rounded-2xl border-2 border-[#264baa]/40 shadow-md space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#264baa]/20 pb-3.5">
                  <div>
                    <span className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider px-2.5 py-1 bg-[#264baa]/15 text-[#264baa] dark:text-blue-300 rounded-md border border-[#264baa]/25">
                      <span className="flex h-1.5 w-1.5 relative">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#264baa] opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-[#264baa]"></span>
                      </span>
                      Official ICICI Bank eCollection Virtual Account (VAN)
                    </span>
                    <h3 className="text-lg sm:text-xl font-black text-text-primary dark:text-white mt-1.5 flex items-center gap-2">
                      <FiDollarSign className="text-[#264baa] dark:text-blue-400" /> Transfer to ICICI Virtual Account
                    </h3>
                  </div>
                  <span className="text-xs font-bold text-[#264baa] dark:text-blue-300 bg-[#264baa]/10 px-3 py-1.5 rounded-lg border border-[#264baa]/30 shadow-sm">
                    Zero Gateway Fees • Real-Time Auto Confirmation
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 text-xs">
                  <div className="bg-surface p-3.5 rounded-xl border border-border flex justify-between items-center">
                    <div>
                      <span className="text-text-muted block text-[11px] font-medium">Beneficiary Name</span>
                      <span className="font-bold text-text-primary dark:text-white text-sm">
                        {iciciVanDetails?.beneficiary_name || "SolarKits Technologies Pvt Ltd"}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleCopyText(iciciVanDetails?.beneficiary_name || "SolarKits Technologies Pvt Ltd", "name")}
                      className="p-1.5 text-text-secondary hover:text-[#264baa] rounded-lg hover:bg-surface-hover transition-colors"
                      title="Copy Beneficiary Name"
                    >
                      {copiedField === "name" ? <FiCheck className="text-emerald-500" /> : <FiCopy />}
                    </button>
                  </div>

                  <div className="bg-surface p-3.5 rounded-xl border border-border flex justify-between items-center">
                    <div>
                      <span className="text-text-muted block text-[11px] font-medium">Bank & Branch</span>
                      <span className="font-bold text-text-primary dark:text-white text-sm">
                        {iciciVanDetails?.bank_name || "ICICI Bank"}, {iciciVanDetails?.branch_name || "CMS Branch, Mumbai"}
                      </span>
                    </div>
                  </div>

                  <div className="bg-[#264baa]/10 dark:bg-[#264baa]/20 p-4 rounded-xl border-2 border-[#264baa]/50 flex justify-between items-center shadow-sm md:col-span-2">
                    <div>
                      <span className="text-[#264baa] dark:text-blue-300 block text-[11px] font-extrabold uppercase tracking-wide">
                        Your Unique Virtual Account No (VAN)
                      </span>
                      <span className="font-mono font-black text-[#264baa] dark:text-blue-200 text-lg tracking-wider">
                        {iciciVanDetails?.virtual_account_number || `SLRK${(user?.whatsapp || user?.mobile || '7777939842').slice(-10)}`}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleCopyText(iciciVanDetails?.virtual_account_number || `SLRK${(user?.whatsapp || user?.mobile || '7777939842').slice(-10)}`, "van")}
                      className="px-3 py-2 bg-[#264baa] hover:bg-[#1f3f91] text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-md shadow-[#264baa]/30 transition-all active:scale-95"
                    >
                      {copiedField === "van" ? <FiCheck /> : <FiCopy />}
                      <span>{copiedField === "van" ? "Copied" : "Copy VAN"}</span>
                    </button>
                  </div>

                  <div className="bg-surface p-3.5 rounded-xl border border-border flex justify-between items-center md:col-span-2">
                    <div>
                      <span className="text-text-muted block text-[11px] font-medium">IFSC Code</span>
                      <span className="font-mono font-black text-text-primary dark:text-white text-base">
                        {iciciVanDetails?.ifsc_code || "ICIC0000104"}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleCopyText(iciciVanDetails?.ifsc_code || "ICIC0000104", "ifsc")}
                      className="p-1.5 text-text-secondary hover:text-[#264baa] rounded-lg hover:bg-surface-hover transition-colors"
                      title="Copy IFSC Code"
                    >
                      {copiedField === "ifsc" ? <FiCheck className="text-emerald-500" /> : <FiCopy />}
                    </button>
                  </div>
                </div>

                {/* Real-time SSE Listening Notice */}
                <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl flex items-center gap-3 text-xs text-emerald-800 dark:text-emerald-300">
                  <span className="flex h-2.5 w-2.5 relative shrink-0">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-600"></span>
                  </span>
                  <span>
                    <strong>Real-time Payment Listener Active:</strong> Transfer ₹{calculatedDiscounts.finalTotal.toLocaleString("en-IN")} directly from your net banking / UPI app to the VAN above. Your order will be detected and confirmed automatically.
                  </span>
                </div>
              </div>
            )}

            {/* Offline Company Bank Transfer Details Card */}
            {(selectedPaymentMethod === "offline" || effectivePaymentMode === "offline") && (
              <div className="bg-surface p-5 sm:p-6 rounded-2xl border border-border shadow-sm space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-3">
                  <div>
                    <h3 className="text-lg font-black text-text-primary dark:text-white flex items-center gap-2">
                      <FiUploadCloud className="text-primary" /> Company Escrow Bank Account Details
                    </h3>
                    <p className="text-xs text-text-secondary mt-0.5">
                      Transfer exact order amount to our verified current account via RTGS / NEFT / IMPS
                    </p>
                  </div>
                  <span className="text-xs font-bold text-amber-600 dark:text-amber-400 bg-amber-500/10 px-3 py-1 rounded-lg border border-amber-500/20">
                    Accounts Team Verification Required
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 text-xs">
                  <div className="bg-surface-hover p-3.5 rounded-xl border border-border flex justify-between items-center">
                    <div>
                      <span className="text-text-muted block text-[11px] font-medium">Beneficiary Name</span>
                      <span className="font-bold text-text-primary dark:text-white text-sm">{bankDetails.account_name}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleCopyText(bankDetails.account_name, "acc_name")}
                      className="p-1.5 text-text-secondary hover:text-primary rounded-lg transition-colors"
                    >
                      {copiedField === "acc_name" ? <FiCheck className="text-emerald-500" /> : <FiCopy />}
                    </button>
                  </div>

                  <div className="bg-surface-hover p-3.5 rounded-xl border border-border flex justify-between items-center">
                    <div>
                      <span className="text-text-muted block text-[11px] font-medium">Bank Name</span>
                      <span className="font-bold text-text-primary dark:text-white text-sm">{bankDetails.bank_name}</span>
                    </div>
                  </div>

                  <div className="bg-surface-hover p-3.5 rounded-xl border border-border flex justify-between items-center">
                    <div>
                      <span className="text-text-muted block text-[11px] font-medium">Account Number</span>
                      <span className="font-mono font-black text-text-primary dark:text-white text-base">
                        {bankDetails.account_number}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleCopyText(bankDetails.account_number, "acc_no")}
                      className="p-1.5 text-text-secondary hover:text-primary rounded-lg transition-colors"
                    >
                      {copiedField === "acc_no" ? <FiCheck className="text-emerald-500" /> : <FiCopy />}
                    </button>
                  </div>

                  <div className="bg-surface-hover p-3.5 rounded-xl border border-border flex justify-between items-center">
                    <div>
                      <span className="text-text-muted block text-[11px] font-medium">IFSC Code</span>
                      <span className="font-mono font-black text-text-primary dark:text-white text-base">
                        {bankDetails.ifsc_code}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleCopyText(bankDetails.ifsc_code, "ifsc_offline")}
                      className="p-1.5 text-text-secondary hover:text-primary rounded-lg transition-colors"
                    >
                      {copiedField === "ifsc_offline" ? <FiCheck className="text-emerald-500" /> : <FiCopy />}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Checkout Submission Form */}
          <form onSubmit={handleSubmitOfflineOrder} className="space-y-6">
            {/* Step 1: Delivery & Installation Site Address */}
            <div className="bg-surface p-6 rounded-2xl border border-border shadow-sm space-y-4">
              <div className="border-b border-border pb-3 flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-black text-text-primary dark:text-white flex items-center gap-2">
                    <FiMapPin className="text-primary" /> Step 1: Delivery Site Address
                  </h3>
                  <p className="text-xs text-text-secondary mt-0.5">
                    Physical site location where the solar kit equipment will be dispatched and delivered.
                  </p>
                </div>
                <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 bg-primary/10 text-primary rounded-md">
                  Required
                </span>
              </div>

              <div className="space-y-4">
                {/* ── Module 1.1: Fulfillment Modes Selection ── */}
                <div className="space-y-3 pb-3 border-b border-border">
                  <label className="block text-xs font-black uppercase tracking-wider text-text-secondary">
                    Select Delivery Fulfillment Mode <span className="text-red-500">*</span>
                  </label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {/* Mode 1: Direct Site Address / Pincode Delivery */}
                    <div
                      onClick={() => setFulfillmentMode("direct_site")}
                      className={`p-4 rounded-2xl border-2 transition-all cursor-pointer relative flex flex-col justify-between ${fulfillmentMode === "direct_site"
                        ? "border-primary bg-primary/5 shadow-md ring-2 ring-primary/20"
                        : "border-border bg-surface hover:border-primary/50"
                        }`}
                    >
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="text-2xl">🚚</span>
                          <span className={`w-4 h-4 rounded-full border flex items-center justify-center ${fulfillmentMode === "direct_site" ? "border-primary bg-primary text-white" : "border-border"
                            }`}>
                            {fulfillmentMode === "direct_site" && <FiCheck size={10} />}
                          </span>
                        </div>
                        <h4 className="font-extrabold text-sm text-text-primary">Direct Site Delivery</h4>
                        <p className="text-[11px] text-text-secondary leading-relaxed">
                          Transport directly unloaded at the installation site address or pincode.
                        </p>
                      </div>
                      <div className="mt-3 pt-2 border-t border-border/60 text-[10px] text-emerald-600 font-bold flex items-center gap-1">
                        <FiCheckCircle /> Site Pincode Delivery
                      </div>
                    </div>

                    {/* Mode 2: EPC Warehouse / Self Warehouse */}
                    <div
                      onClick={() => setFulfillmentMode("epc_warehouse")}
                      className={`p-4 rounded-2xl border-2 transition-all cursor-pointer relative flex flex-col justify-between ${fulfillmentMode === "epc_warehouse"
                        ? "border-primary bg-primary/5 shadow-md ring-2 ring-primary/20"
                        : "border-border bg-surface hover:border-primary/50"
                        }`}
                    >
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="text-2xl">🏭</span>
                          <span className={`w-4 h-4 rounded-full border flex items-center justify-center ${fulfillmentMode === "epc_warehouse" ? "border-primary bg-primary text-white" : "border-border"
                            }`}>
                            {fulfillmentMode === "epc_warehouse" && <FiCheck size={10} />}
                          </span>
                        </div>
                        <h4 className="font-extrabold text-sm text-text-primary">EPC Warehouse / Self Depot</h4>
                        <p className="text-[11px] text-text-secondary leading-relaxed">
                          Direct bulk dispatch to your company depot or contractor warehouse.
                        </p>
                      </div>
                      <div className="mt-3 pt-2 border-t border-border/60 text-[10px] text-text-muted">
                        Central Direct Dispatch
                      </div>
                    </div>
                  </div>

                  {/* Capacity Warning Banner if EPC Warehouse is full */}
                  {fulfillmentMode === "epc_warehouse" && capacityResult?.allowed === false && (
                    <div className="p-3 bg-amber-500/10 border-2 border-amber-500/30 rounded-xl text-xs text-amber-800 dark:text-amber-300 flex items-start gap-2 animate-in fade-in duration-200">
                      <FiAlertTriangle className="text-amber-600 text-base shrink-0 mt-0.5" />
                      <div>
                        <strong className="block font-bold">EPC Warehouse at capacity limit.</strong>
                        <span>
                          {capacityResult?.reason || "Current stored inventory and incoming reserved commitments have reached storage limits."} Please select <strong>Direct Site Delivery</strong> above.
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Order Load Metrics Pill */}
                  <div className="bg-surface-hover/60 p-2.5 rounded-xl border border-border flex flex-wrap items-center justify-between gap-2 text-xs">
                    <span className="text-text-muted font-medium">Order Load Metrics:</span>
                    <div className="flex items-center gap-3 font-semibold text-text-primary">
                      <span>📦 <strong>{orderLoadMetrics.total_kits}</strong> Kits</span>
                      <span>⚡ <strong>{orderLoadMetrics.total_kw.toFixed(1)}</strong> kW</span>
                      <span>⚖️ <strong>{orderLoadMetrics.total_weight_kg.toFixed(0)}</strong> kg Payload</span>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-text-primary dark:text-white mb-1.5">
                    Site Street Address / Plot / Industrial Area <span className="text-red-500">*</span>
                  </label>
                  <CustomInput
                    placeholder="e.g. Survey No. 42, GIDC Industrial Estate, Ring Road"
                    value={deliveryAddress.line}
                    onChange={(e) => setDeliveryAddress((prev) => ({ ...prev, line: e.target.value }))}
                    required
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-text-primary dark:text-white mb-1.5">
                      Delivery PIN Code <span className="text-red-500">*</span>
                    </label>
                    <CustomInput
                      placeholder="e.g. 380001"
                      value={deliveryAddress.pincode}
                      maxLength={6}
                      onChange={(e) => setDeliveryAddress((prev) => ({ ...prev, pincode: e.target.value.replace(/\D/g, '') }))}
                      required
                      className="font-mono font-bold"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-text-primary dark:text-white mb-1.5">
                      District / City
                    </label>
                    <CustomInput
                      placeholder="e.g. Ahmedabad"
                      value={deliveryAddress.district_name}
                      onChange={(e) => setDeliveryAddress((prev) => ({ ...prev, district_name: e.target.value }))}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-text-primary dark:text-white mb-1.5">
                      State
                    </label>
                    <CustomInput
                      placeholder="e.g. Gujarat"
                      value={deliveryAddress.state_name}
                      onChange={(e) => setDeliveryAddress((prev) => ({ ...prev, state_name: e.target.value }))}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-text-primary dark:text-white mb-1.5">
                      Site Contact Person
                    </label>
                    <CustomInput
                      placeholder="Receiver / Site Engineer Name"
                      value={deliveryAddress.contact_name}
                      onChange={(e) => setDeliveryAddress((prev) => ({ ...prev, contact_name: e.target.value }))}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-text-primary dark:text-white mb-1.5">
                      Site Contact Phone / WhatsApp <span className="text-red-500">*</span>
                    </label>
                    <CustomInput
                      placeholder="e.g. 7777939842"
                      value={deliveryAddress.contact_phone}
                      onChange={(e) => setDeliveryAddress((prev) => ({ ...prev, contact_phone: e.target.value }))}
                      required
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Step 2: Payment Receipt Upload & UTR Submission Form */}
            <div className="bg-surface p-6 rounded-2xl border border-border shadow-sm space-y-5">
              <div className="border-b border-border pb-3">
                <h3 className="text-lg font-black text-text-primary dark:text-white flex items-center gap-2">
                  <FiUploadCloud className="text-primary" /> {isTrialOrder ? "Step 2: Full Payment & Receipt Upload (Trial Order)" : "Step 2: Payment Milestones & Receipt Upload"}
                </h3>
                <p className="text-xs text-text-secondary mt-0.5">
                  {isTrialOrder
                    ? "Trial kit orders require 100% upfront payment (materials + freight). Payment milestones do not apply."
                    : "Admin-configured payment milestones applied. Pay advance to confirm order; remaining balance due before warehouse dispatch."}
                </p>
              </div>

              {/* ── Payment Policy Card: Trial Kit (100% Full) vs Milestone Breakdown ── */}
              {isTrialOrder ? (
                <div className="bg-gradient-to-br from-emerald-500/10 via-surface to-amber-500/10 p-4 sm:p-5 rounded-2xl border border-emerald-500/30 space-y-3.5">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/60 pb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-1 bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 rounded-md border border-emerald-500/30 flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                        Trial Kit Order Policy • 100% Upfront Payment
                      </span>
                    </div>
                    <span className="text-xs font-bold text-text-secondary bg-surface px-3 py-1 rounded-lg border border-border">
                      Total Order Value: <strong className="text-text-primary dark:text-white">₹{milestoneBreakdown.totalAmount.toLocaleString("en-IN")}</strong>
                    </span>
                  </div>

                  <div className="p-4 rounded-xl bg-surface border border-emerald-500/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                    <div>
                      <h4 className="text-sm font-extrabold text-text-primary dark:text-white flex items-center gap-1.5">
                        <span className="text-emerald-600 dark:text-emerald-400">✓</span> Single Full Payment (No Milestone Split)
                      </h4>
                      <p className="text-xs text-text-secondary mt-1 max-w-xl">
                        Trial kit orders are shipped directly from warehouse buffer stock for field quality testing. As per policy, partial milestone payments are not applicable. 100% payment is collected upfront for immediate dispatch clearance.
                      </p>
                    </div>
                    <div className="text-right shrink-0 bg-emerald-500/10 border border-emerald-500/30 px-3.5 py-2 rounded-xl">
                      <span className="text-[10px] uppercase font-bold text-emerald-700 dark:text-emerald-300 block">Payable Today</span>
                      <span className="text-base font-black text-emerald-800 dark:text-emerald-200">
                        ₹{milestoneBreakdown.totalAmount.toLocaleString("en-IN")}
                      </span>
                      <span className="text-[10px] text-text-muted block">Zero balance due later</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-gradient-to-br from-amber-500/10 via-surface to-blue-500/10 p-4 sm:p-5 rounded-2xl border border-amber-500/30 space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/60 pb-3">
                    <div>
                      <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 bg-amber-500/20 text-amber-700 dark:text-amber-300 rounded-md">
                        Official Payment Milestone Policy
                      </span>
                      <h4 className="text-sm font-black text-text-primary dark:text-white mt-1">
                        {milestoneConfig?.rule_name || "Product Payment Milestone Schedule"}
                      </h4>
                    </div>
                    <span className="text-xs font-bold text-text-secondary bg-surface px-2.5 py-1 rounded-lg border border-border">
                      Total Order Value: <strong className="text-text-primary dark:text-white">₹{milestoneBreakdown.totalAmount.toLocaleString("en-IN")}</strong>
                    </span>
                  </div>

                  {/* Milestone Stepper */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    {/* Milestone 1 (Advance) */}
                    <div className={`p-3.5 rounded-xl border-2 transition-all ${!payFullAmount ? "bg-amber-500/10 border-amber-500 ring-2 ring-amber-500/20 shadow-sm" : "bg-surface border-border"}`}>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="font-extrabold uppercase tracking-wider text-[11px] text-amber-700 dark:text-amber-300 flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
                          {milestoneBreakdown.m1Title} ({milestoneBreakdown.m1Pct}%)
                        </span>
                        <span className="font-black text-amber-800 dark:text-amber-200 text-sm">
                          ₹{milestoneBreakdown.advanceAmount.toLocaleString("en-IN")}
                        </span>
                      </div>
                      <p className="text-[11px] text-text-secondary leading-relaxed">
                        {milestoneBreakdown.m1Desc}
                      </p>
                      <div className="mt-2 text-[10px] font-bold text-amber-700 dark:text-amber-400">
                        ● Status: Due Now at Order Placement
                      </div>
                    </div>

                    {/* Milestone 2 (Before Dispatch) */}
                    <div className={`p-3.5 rounded-xl border transition-all ${payFullAmount ? "bg-blue-500/10 border-blue-500 ring-2 ring-blue-500/20 shadow-sm" : "bg-surface border-border"}`}>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="font-extrabold uppercase tracking-wider text-[11px] text-blue-700 dark:text-blue-300 flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                          {milestoneBreakdown.m2Title} ({milestoneBreakdown.m2Pct}%)
                        </span>
                        <span className="font-black text-blue-800 dark:text-blue-200 text-sm">
                          ₹{milestoneBreakdown.remainingAmount.toLocaleString("en-IN")}
                        </span>
                      </div>
                      <p className="text-[11px] text-text-secondary leading-relaxed">
                        {milestoneBreakdown.m2Desc}
                      </p>
                      <div className="mt-2 text-[10px] font-bold text-blue-700 dark:text-blue-400">
                        ○ Status: Due Before Warehouse Dispatch
                      </div>
                    </div>
                  </div>

                  {/* Payment Selection Options */}
                  <div className="pt-2 border-t border-border/60 flex flex-col sm:flex-row gap-3">
                    <label
                      onClick={() => setPayFullAmount(false)}
                      className={`flex-1 flex items-center gap-2.5 p-3 rounded-xl border cursor-pointer transition-all ${!payFullAmount ? "border-amber-500 bg-amber-500/5 font-bold text-amber-900 dark:text-amber-200" : "border-border bg-surface text-text-secondary"}`}
                    >
                      <input
                        type="radio"
                        name="payment_plan"
                        checked={!payFullAmount}
                        onChange={() => setPayFullAmount(false)}
                        className="text-amber-600 focus:ring-amber-500"
                      />
                      <div className="text-xs">
                        <span className="block font-bold">Pay {milestoneBreakdown.m1Pct}% Advance (₹{milestoneBreakdown.advanceAmount.toLocaleString("en-IN")})</span>
                        <span className="text-[10px] font-normal opacity-80">Remaining ₹{milestoneBreakdown.remainingAmount.toLocaleString("en-IN")} payable before dispatch</span>
                      </div>
                    </label>

                    <label
                      onClick={() => setPayFullAmount(true)}
                      className={`flex-1 flex items-center gap-2.5 p-3 rounded-xl border cursor-pointer transition-all ${payFullAmount ? "border-blue-500 bg-blue-500/5 font-bold text-blue-900 dark:text-blue-200" : "border-border bg-surface text-text-secondary"}`}
                    >
                      <input
                        type="radio"
                        name="payment_plan"
                        checked={payFullAmount}
                        onChange={() => setPayFullAmount(true)}
                        className="text-blue-600 focus:ring-blue-500"
                      />
                      <div className="text-xs">
                        <span className="block font-bold">Pay 100% Full Order (₹{milestoneBreakdown.totalAmount.toLocaleString("en-IN")})</span>
                        <span className="text-[10px] font-normal opacity-80">Clear full payment now for direct express dispatch</span>
                      </div>
                    </label>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-text-primary dark:text-white mb-1.5">
                    UTR / Transaction Ref No. <span className="text-red-500">*</span>
                  </label>
                  <CustomInput
                    placeholder="e.g. HDFC0001928374 or 239847192834"
                    value={utrNumber}
                    onChange={(e) => setUtrNumber(e.target.value.toUpperCase())}
                    required
                    className="font-mono uppercase font-bold"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-bold text-text-primary dark:text-white">
                      Amount Paid (₹) <span className="text-red-500">*</span>
                    </label>
                    <span className="text-[10px] text-text-muted font-bold flex items-center gap-1">
                      🔒 Fixed / System Calculated
                    </span>
                  </div>
                  <CustomInput
                    type="number"
                    placeholder="Order Total Amount"
                    value={amountPaid}
                    readOnly
                    className="font-bold font-mono"
                  />
                  <p className="text-[10px] text-text-secondary mt-1">
                    {isTrialOrder
                      ? "✓ Locked at 100% Full Payment for Trial Kit (No balance due)."
                      : `Amount is locked based on your selected preference (${!payFullAmount ? `${milestoneBreakdown.m1Pct}% Advance` : "100% Full Payment"}).`}
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-text-primary dark:text-white mb-1.5">
                    Payment Date <span className="text-red-500">*</span>
                  </label>
                  <CustomInput
                    type="date"
                    value={paymentDate}
                    onChange={(e) => setPaymentDate(e.target.value)}
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-text-primary dark:text-white mb-1.5">
                    Sender Bank Name
                  </label>
                  <CustomInput
                    placeholder="e.g. State Bank of India / ICICI"
                    value={senderBankName}
                    onChange={(e) => setSenderBankName(e.target.value)}
                  />
                </div>
              </div>

              {/* Receipt Upload Box */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-text-primary dark:text-white">
                  Upload Payment Transfer Receipt / Screenshot <span className="text-red-500">*</span>
                </label>

                <div className="border-2 border-dashed border-border hover:border-primary rounded-2xl p-5 text-center transition-colors bg-surface-hover cursor-pointer relative">
                  <input
                    type="file"
                    accept="image/*,application/pdf"
                    onChange={handleFileChange}
                    required={!receiptFile}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                  {receiptPreview ? (
                    <div className="space-y-2">
                      <img src={receiptPreview} alt="Receipt preview" className="max-h-36 mx-auto rounded-lg object-contain border border-border" />
                      <p className="text-xs font-bold text-primary">{receiptFile?.name}</p>
                      <p className="text-[11px] text-text-muted">Click to change receipt file</p>
                    </div>
                  ) : receiptFile ? (
                    <div className="flex items-center justify-center gap-2 text-primary font-bold text-sm">
                      <FiFileText size={24} />
                      <span>{receiptFile.name} (Ready to upload)</span>
                    </div>
                  ) : (
                    <div className="space-y-1.5">
                      <FiUploadCloud size={32} className="mx-auto text-primary" />
                      <p className="text-xs font-bold text-text-primary dark:text-white">
                        Drag & Drop payment receipt or <span className="text-primary underline">browse</span>
                      </p>
                      <p className="text-[11px] text-text-muted">Supports JPG, PNG, PDF (Max 10MB)</p>
                    </div>
                  )}
                </div>
              </div>

              <Button
                type="submit"
                variant="primary"
                size="lg"
                fullWidth
                loading={submitting}
                className="py-4 shadow-lg font-black text-base"
              >
                Submit Payment for Accounts Verification
              </Button>
            </div>
          </form>
        </div>

        {/* Right Column: Totals Summary & Coupon */}
        <div className="space-y-6">
          <div className="bg-surface p-6 rounded-2xl border border-border shadow-sm space-y-4">
            <h3 className="text-lg font-black text-text-primary dark:text-white border-b border-border pb-3">
              Order Pricing Summary
            </h3>

            {/* Items in this order */}
            <div className="space-y-2.5 max-h-48 overflow-y-auto pr-1 divide-y divide-border/60 border-b border-border pb-3">
              {checkoutItems.map((item) => (
                <div key={item.cartItemId || item.id} className="pt-2 first:pt-0 flex items-center justify-between text-xs">
                  <div className="flex-1 pr-2">
                    <p className="font-bold text-text-primary dark:text-white truncate">{item.kitName || item.title || "Solar Kit"}</p>
                    <p className="text-[11px] text-text-muted font-medium">
                      {item.qty} {item.qty === 1 ? 'kit' : 'kits'} × ₹{Number(item.ourPrice || 0).toLocaleString("en-IN")} / kit
                    </p>
                  </div>
                  <span className="font-black text-text-primary dark:text-white">
                    ₹{(Number(item.qty || 1) * Number(item.ourPrice || 0)).toLocaleString("en-IN")}
                  </span>
                </div>
              ))}
            </div>

            <div className="space-y-2 text-sm border-b border-border pb-3">
              <div className="flex justify-between text-text-secondary">
                <span>Items Base Subtotal (Excl. GST):</span>
                <span className="font-semibold text-text-primary dark:text-white">
                  ₹{(calculatedDiscounts.baseSubtotalExclGst || 0).toLocaleString("en-IN")}
                </span>
              </div>
              <div className="flex justify-between text-text-secondary">
                <span>GST ({calculatedDiscounts.gstRate}%):</span>
                <span className="font-semibold text-text-primary dark:text-white">
                  +₹{(calculatedDiscounts.computedGst || 0).toLocaleString("en-IN")}
                </span>
              </div>
              <div className="flex justify-between text-text-secondary border-t border-border pt-2">
                <span>Subtotal (Incl. GST):</span>
                <span className="font-black text-text-primary dark:text-white">
                  ₹{(calculatedDiscounts.discountedSubtotal || 0).toLocaleString("en-IN")}
                </span>
              </div>
              <div className="flex justify-between text-text-secondary">
                <span>Total Capacity:</span>
                <span className="font-bold text-text-primary dark:text-white">{totalCapacityKW} KW</span>
              </div>

              {calculatedDiscounts.discountAmount > 0 && (
                <div className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 p-3 rounded-xl border border-emerald-500/20 space-y-1.5 mt-2">
                  <div className="text-xs font-bold flex items-center gap-1">
                    <FiAward /> Applied Discounts:
                  </div>
                  {calculatedDiscounts.offersApplied.map((offerStr, idx) => (
                    <div key={idx} className="flex justify-between text-xs">
                      <span>{offerStr.split(":")[0]}</span>
                      <span className="font-bold">{offerStr.split(":")[1]}</span>
                    </div>
                  ))}
                </div>
              )}
              {calculatedDiscounts.totalDeliveryFreight > 0 && (
                <div className="flex justify-between text-text-secondary text-emerald-600 dark:text-emerald-400 font-bold border-t border-dashed border-border pt-2">
                  <span>Delivery Charge:</span>
                  <span>+₹{calculatedDiscounts.totalDeliveryFreight.toLocaleString("en-IN")}</span>
                </div>
              )}
            </div>

            <div className="space-y-2 pt-2 border-t border-border">
              <div className="flex justify-between items-baseline">
                <span className="text-xs text-text-secondary">Total Order Value:</span>
                <span className="text-sm font-bold text-text-primary dark:text-white">
                  ₹{calculatedDiscounts.finalTotal.toLocaleString("en-IN")}
                </span>
              </div>
              {isTrialOrder ? (
                <div className="p-3 bg-emerald-500/10 rounded-xl border border-emerald-500/20 space-y-1">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-bold text-emerald-800 dark:text-emerald-300">
                      Trial Order Payment Plan:
                    </span>
                    <span className="font-black text-emerald-800 dark:text-emerald-300 text-xs uppercase">
                      100% Upfront (No Milestones)
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-[11px] text-text-secondary pt-1 border-t border-emerald-500/10">
                    <span>Balance Due Before Dispatch:</span>
                    <span className="font-bold text-emerald-600 dark:text-emerald-400">₹0 (Zero)</span>
                  </div>
                </div>
              ) : (
                <div className="p-3 bg-amber-500/10 rounded-xl border border-amber-500/20 space-y-1">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-bold text-amber-800 dark:text-amber-200">
                      Milestone 1 Advance Due Now ({milestoneBreakdown.m1Pct}%):
                    </span>
                    <span className="font-black text-amber-800 dark:text-amber-200 text-sm">
                      ₹{milestoneBreakdown.advanceAmount.toLocaleString("en-IN")}
                    </span>
                  </div>
                  {!payFullAmount && (
                    <div className="flex justify-between items-center text-[11px] text-text-secondary pt-1 border-t border-amber-500/10">
                      <span>Milestone 2 Before Dispatch ({milestoneBreakdown.m2Pct}%):</span>
                      <span className="font-bold text-text-primary dark:text-white">
                        ₹{milestoneBreakdown.remainingAmount.toLocaleString("en-IN")}
                      </span>
                    </div>
                  )}
                </div>
              )}
              <div className="flex justify-between items-baseline pt-1">
                <span className="font-black text-text-primary dark:text-white">Amount Due Today:</span>
                <span className="text-2xl font-black text-primary">
                  ₹{(isTrialOrder || payFullAmount ? calculatedDiscounts.finalTotal : milestoneBreakdown.advanceAmount).toLocaleString("en-IN")}
                </span>
              </div>
            </div>
          </div>

          {/* Coupon Code Entry — collapsed by default */}
          <div className="bg-surface px-5 py-4 rounded-2xl border border-border shadow-sm">
            {appliedCoupon ? (
              /* Applied state — always visible when active */
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-sm">
                  <FiTag className="text-primary" />
                  <span className="font-bold text-primary font-mono">{appliedCoupon.coupon_code}</span>
                  <span className="text-text-muted text-xs">applied</span>
                </div>
                <button
                  onClick={() => { handleRemoveCoupon(); setShowCouponInput(false); }}
                  className="text-text-secondary hover:text-red-500 font-bold text-lg leading-none"
                  title="Remove coupon"
                >
                  &times;
                </button>
              </div>
            ) : (
              <>
                {/* Toggle link */}
                <button
                  type="button"
                  onClick={() => setShowCouponInput((v) => !v)}
                  className="flex items-center gap-1.5 text-sm text-text-secondary hover:text-primary transition-colors w-full text-left"
                >
                  <FiTag size={14} className="text-primary" />
                  <span className="font-medium">Have a coupon code?</span>
                  <span className="ml-auto text-xs text-text-muted">{showCouponInput ? "▲ Hide" : "▼ Enter code"}</span>
                </button>

                {/* Expandable input */}
                {showCouponInput && (
                  <div className="mt-3 space-y-2">
                    <div className="flex gap-2">
                      <CustomInput
                        placeholder="Enter coupon code"
                        value={couponCodeInput}
                        onChange={(e) => setCouponCodeInput(e.target.value)}
                        className="flex-1 uppercase font-mono"
                      />
                      <Button onClick={handleApplyCoupon} variant="primary" className="py-2.5 px-4 shadow-sm">
                        Apply
                      </Button>
                    </div>
                    {couponError && (
                      <div className="text-xs text-red-500 font-semibold bg-red-500/10 p-2.5 rounded-lg border border-red-500/20 flex items-center gap-1">
                        <FiAlertTriangle /> {couponError}
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      <GstVerificationDialog
        isOpen={showGstDialog}
        onClose={() => {
          setShowGstDialog(false);
          navigate("/cart");
        }}
        stateId={gstStateId}
        onVerified={() => setShowGstDialog(false)}
      />
    </div>
  );
}
