import React, { useState, useEffect } from "react";
import { useSelector } from "react-redux";
import { useLocation, useNavigate } from "react-router-dom";
import axiosInstance from "@/utils/axiosInstance";
import {
  FaShoppingCart, FaEye, FaRegClock, FaCheckCircle,
  FaTimesCircle, FaMapMarkerAlt, FaEdit, FaTimes, FaTruck,
  FaWarehouse, FaTruckLoading, FaFileInvoice, FaRedo, FaUpload,
  FaBuilding, FaExclamationTriangle, FaCopy, FaCheck, FaExternalLinkAlt,
  FaSearch, FaBoxOpen, FaRoute, FaBolt, FaUniversity,
  FaLayerGroup, FaBoxes, FaPhone, FaInfoCircle
} from "react-icons/fa";
import { BsArrowRepeat } from "react-icons/bs";
import Button from "@/Components/Button";
import CustomInput from "@/Components/CustomInput";
import MapLocationPicker from "@/Components/MapLocationPicker";

export default function ProjectOrderStatus() {
  const location = useLocation();
  const { user } = useSelector((state) => state.auth_slice || {});
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  const [expandedOrderId, setExpandedOrderId] = useState(null);

  // Search & Copy state
  const [searchQuery, setSearchQuery] = useState(location.state?.orderNumber || "");
  const [copiedKey, setCopiedKey] = useState(null);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const tabParam = params.get("tab");
    const searchParam = params.get("search");
    if (tabParam === "po_allocations" || tabParam === "direct") {
      setMainTab(tabParam);
    }
    if (searchParam) {
      setSearchQuery(searchParam);
    } else if (location.state?.orderNumber) {
      setSearchQuery(location.state.orderNumber);
    }
  }, [location.search, location.state]);

  const handleCopy = (text, key) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  // Re-submit payment proof modal state
  const [resubmittingOrder, setResubmittingOrder] = useState(null);
  const [newUtr, setNewUtr] = useState("");
  const [newAmount, setNewAmount] = useState("");
  const [newDate, setNewDate] = useState(new Date().toISOString().slice(0, 10));
  const [newBank, setNewBank] = useState("");
  const [newReceiptFile, setNewReceiptFile] = useState(null);
  const [newReceiptPreview, setNewReceiptPreview] = useState(null);
  const [resubmitLoading, setResubmitLoading] = useState(false);
  const [resubmitError, setResubmitError] = useState("");

  // ── Milestone 2 Payment Modal State ─────────────────────────────────────────
  const [milestonePaymentModalOrder, setMilestonePaymentModalOrder] = useState(null);
  const [milestonePaymentGateway, setMilestonePaymentGateway] = useState("icici"); // 'icici' | 'offline'
  const [regionPaymentMode, setRegionPaymentMode] = useState("both"); // 'online' | 'offline' | 'both'
  const [firstPaymentMethodUsed, setFirstPaymentMethodUsed] = useState("icici"); // 'icici' | 'offline'
  const [isRegionOnlineEnabled, setIsRegionOnlineEnabled] = useState(true);
  const [isRegionOfflineEnabled, setIsRegionOfflineEnabled] = useState(true);
  const [iciciVanDetails, setIciciVanDetails] = useState(null);
  const [vanLoading, setVanLoading] = useState(false);
  const [copiedModalField, setCopiedModalField] = useState(null);
  const [milestoneUtr, setMilestoneUtr] = useState("");
  const [milestoneAmount, setMilestoneAmount] = useState("");
  const [milestoneDate, setMilestoneDate] = useState(new Date().toISOString().slice(0, 10));
  const [milestoneBank, setMilestoneBank] = useState("");
  const [milestoneReceiptFile, setMilestoneReceiptFile] = useState(null);
  const [milestoneReceiptPreview, setMilestoneReceiptPreview] = useState(null);
  const [milestoneSubmitting, setMilestoneSubmitting] = useState(false);
  const [milestoneError, setMilestoneError] = useState("");

  const handleCopyModalText = (text, fieldKey) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedModalField(fieldKey);
    setTimeout(() => setCopiedModalField(null), 2000);
  };

  // Invoice view modal state
  const [viewingInvoice, setViewingInvoice] = useState(null);
  const [invoiceLoading, setInvoiceLoading] = useState(false);

  // Address edit modal state
  const [editingOrder, setEditingOrder] = useState(null);
  const [statesList, setStatesList] = useState([]);
  const [districtsList, setDistrictsList] = useState([]);
  const [selectedStateId, setSelectedStateId] = useState("");
  const [selectedDistrictId, setSelectedDistrictId] = useState("");
  const [streetAddress, setStreetAddress] = useState("");
  const [pincode, setPincode] = useState("");
  const [contactNumber, setContactNumber] = useState("");
  const [contactName, setContactName] = useState("");
  const [selectedLat, setSelectedLat] = useState("");
  const [selectedLng, setSelectedLng] = useState("");
  const [modalError, setModalError] = useState("");
  const [savingAddress, setSavingAddress] = useState(false);
  const [boundaries, setBoundaries] = useState([]);

  // PO Allocations state
  const [poAllocations, setPoAllocations] = useState([]);
  const [poLoading, setPoLoading] = useState(false);
  const [mainTab, setMainTab] = useState("direct"); // "direct" | "po_allocations"
  const [selectedPoForUpload, setSelectedPoForUpload] = useState(null);
  const [poReceiptFile, setPoReceiptFile] = useState(null);
  const [poUploading, setPoUploading] = useState(false);
  const [poUploadMsg, setPoUploadMsg] = useState("");

  // Fetch orders
  const fetchOrders = async () => {
    setLoading(true);
    try {
      const res = await axiosInstance.get("/india/v1/shop/orders");
      if (res.data?.success) {
        const fetched = res.data.data || [];
        setOrders(fetched);
        return fetched;
      } else {
        setErrorMsg("Failed to load orders.");
        return [];
      }
    } catch (err) {
      console.error("Failed to load orders:", err);
      setErrorMsg(err.response?.data?.message || "Error fetching order list. Please try again.");
      return [];
    } finally {
      setLoading(false);
    }
  };

  const fetchPoAllocations = async () => {
    setPoLoading(true);
    try {
      const res = await axiosInstance.get("/india/v1/shop/po-allocations");
      if (res.data?.success || res.data?.status === "success") {
        const fetched = res.data.data || [];
        setPoAllocations(fetched);
        return fetched;
      }
      return [];
    } catch (err) {
      console.error("Failed to load PO allocations:", err);
      return [];
    } finally {
      setPoLoading(false);
    }
  };

  const handlePoReceiptUpload = async (poId) => {
    if (!poReceiptFile) {
      setPoUploadMsg("Please select a receipt image or PDF to upload.");
      return;
    }
    const formData = new FormData();
    formData.append("files", poReceiptFile);
    setPoUploading(true);
    setPoUploadMsg("");
    try {
      const res = await axiosInstance.post(`/india/v1/shop/po-allocations/${poId}/upload-receipt`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      if (res.data?.success || res.data?.status === "success") {
        setSelectedPoForUpload(null);
        setPoReceiptFile(null);
        fetchPoAllocations();
      } else {
        setPoUploadMsg(res.data?.message || "Failed to upload receipt.");
      }
    } catch (err) {
      setPoUploadMsg(err.response?.data?.message || "Failed to upload receipt.");
    } finally {
      setPoUploading(false);
    }
  };

  useEffect(() => {
    Promise.all([fetchOrders(), fetchPoAllocations()]).then(([directList, poList]) => {
      const params = new URLSearchParams(location.search);
      if (!params.get("tab")) {
        if ((!directList || directList.length === 0) && (poList && poList.length > 0)) {
          setMainTab("po_allocations");
        }
      }
    });
    fetchStates();

    // Listen for ICICI real-time payment credits to auto-refresh order statuses
    const rawApiUrl = import.meta.env.VITE_API_URL || "http://localhost:5000";
    const baseUrl = rawApiUrl.replace(/\/api\/?$/, "").replace(/\/+$/, "");
    const streamUrl = `${baseUrl}/api/v1/payments/icici/stream?role=epc`;
    const es = new EventSource(streamUrl);

    es.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === "ICICI_PAYMENT_CREDITED") {
          console.log("⚡ Auto-refreshing orders due to ICICI payment credit:", data);
          fetchOrders();
          fetchPoAllocations();
        }
      } catch (err) {
        console.error(err);
      }
    };

    return () => es.close();
  }, []);

  const fetchStates = async () => {
    try {
      const response = await axiosInstance.get(`/india/v1/geo/states`);
      if (response.data?.states) {
        setStatesList(response.data.states);
      }
    } catch (error) {
      console.error("Error fetching states:", error);
    }
  };

  // Open Re-submit Payment Modal
  const handleOpenResubmit = (order) => {
    setResubmittingOrder(order);
    setNewUtr(order.offline_payment?.utr_number || order.payment_reference || "");
    setNewAmount(order.offline_payment?.amount_paid || order.total_amount || "");
    setNewDate(new Date().toISOString().slice(0, 10));
    setNewBank(order.offline_payment?.sender_bank_name || "");
    setNewReceiptFile(null);
    setNewReceiptPreview(null);
    setResubmitError("");
  };

  const handleResubmitFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setNewReceiptFile(file);
      if (file.type.startsWith("image/")) {
        const reader = new FileReader();
        reader.onload = (ev) => setNewReceiptPreview(ev.target.result);
        reader.readAsDataURL(file);
      } else {
        setNewReceiptPreview(null);
      }
    }
  };

  const handleConfirmResubmit = async (e) => {
    e.preventDefault();
    if (!newUtr.trim()) {
      setResubmitError("Please enter a valid UTR number.");
      return;
    }
    if (!newAmount || Number(newAmount) <= 0) {
      setResubmitError("Please enter a valid payment amount.");
      return;
    }

    setResubmitLoading(true);
    setResubmitError("");
    try {
      const formData = new FormData();
      formData.append("utr_number", newUtr.trim().toUpperCase());
      formData.append("amount_paid", newAmount);
      formData.append("payment_date", newDate);
      formData.append("sender_bank_name", newBank);
      if (newReceiptFile) {
        formData.append("payment_receipt", newReceiptFile);
      }

      const res = await axiosInstance.post(
        `/india/v1/shop/offline-checkout/${resubmittingOrder.id || resubmittingOrder._id}/resubmit`,
        formData,
        { headers: { "Content-Type": "multipart/form-data" } }
      );

      if (res.data?.success) {
        setResubmittingOrder(null);
        fetchOrders();
      } else {
        setResubmitError(res.data?.message || "Failed to re-submit payment proof.");
      }
    } catch (err) {
      setResubmitError(err.response?.data?.message || "Re-submission failed. Please try again.");
    } finally {
      setResubmitLoading(false);
    }
  };

  // Open Tax Invoice View Modal
  const handleViewInvoice = async (order) => {
    setViewingInvoice(order);
    setInvoiceLoading(true);
    try {
      const res = await axiosInstance.get(`/india/v1/shop/orders/${order.id || order._id}/invoice-data`);
      if (res.data?.success) {
        setViewingInvoice(res.data.data);
      }
    } catch (err) {
      console.error("Error fetching invoice:", err);
    } finally {
      setInvoiceLoading(false);
    }
  };

  // ── Milestone 2 Payment Handlers ──────────────────────────────────────────
  const handleOpenMilestonePay = async (order) => {
    const totalOrderAmt = order.total_amount || Math.round((order.net_payable_paise || order.grand_total_paise || 0) / 100);
    const remPct = order.payment_milestones?.remaining_percentage ?? (order.payment_milestones?.milestones?.find(m => m.milestone_number === 2)?.percentage || (100 - (order.payment_milestones?.advance_percentage || 30)));
    const remaining = order.payment_milestones?.remaining_amount || Math.round((totalOrderAmt || 0) * (remPct / 100));
    setMilestonePaymentModalOrder(order);
    setMilestoneUtr("");
    setMilestoneAmount(String(remaining));
    setMilestoneDate(new Date().toISOString().slice(0, 10));
    setMilestoneBank("");
    setMilestoneReceiptFile(null);
    setMilestoneReceiptPreview(null);
    setMilestoneError("");
    setCopiedModalField(null);

    // 1. Detect if the first payment was made via ICICI e-Collection
    const firstPaymentWasIcici = Boolean(
      order.is_online ||
      order.payment_method === "icici_ecollection" ||
      order.payment_gateway_used === "icici_ecollection" ||
      order.payment_gateway_used === "icici" ||
      order.payment_info?.payment_method === "icici_ecollection" ||
      order.payment_info?.payment_gateway_used === "icici_ecollection" ||
      order.offline_payment?.payment_method === "icici_ecollection" ||
      order.offline_payment?.payment_gateway_used === "icici_ecollection" ||
      order.offline_payment?.admin_remarks?.toLowerCase().includes("icici") ||
      order.offline_payment?.sender_bank_name?.toLowerCase().includes("icici")
    );

    setFirstPaymentMethodUsed(firstPaymentWasIcici ? "icici" : "offline");
    // Default gateway selection strictly based on first payment
    let initialGateway = firstPaymentWasIcici ? "icici" : "offline";
    setMilestonePaymentGateway(initialGateway);

    // 2. Check region payment configuration
    const districtId = order.delivery_address?.district_id || order.delivery_address?.district;
    const stateId = order.delivery_address?.state_id || order.delivery_address?.state;
    if (districtId) {
      try {
        const cfgRes = await axiosInstance.get(`/payment-config/resolve?district_id=${districtId}&state_id=${stateId || ""}&order_type=epc_order`);
        const cfg = cfgRes.data?.config;
        if (cfg) {
          const onlineOn = Boolean(cfg.online_enabled || cfg.payment_mode === "online" || cfg.payment_mode === "both");
          const offlineOn = Boolean(cfg.offline_enabled || cfg.payment_mode === "offline" || cfg.payment_mode === "both");
          setIsRegionOnlineEnabled(onlineOn);
          setIsRegionOfflineEnabled(offlineOn);

          const mode = (onlineOn && offlineOn) ? "both" : onlineOn ? "online" : "offline";
          setRegionPaymentMode(mode);

          if (onlineOn && !offlineOn) {
            // Region ONLY has ICICI / online enabled
            setMilestonePaymentGateway("icici");
          } else if (!onlineOn && offlineOn) {
            // Region ONLY has offline enabled
            setMilestonePaymentGateway("offline");
          } else {
            // Region supports both: keep what was used in first payment
            setMilestonePaymentGateway(firstPaymentWasIcici ? "icici" : "offline");
          }
        }
      } catch (err) {
        console.warn("Could not resolve region payment config for milestone pay:", err);
      }
    }

    // 3. Fetch ICICI Virtual Account (VAN) details
    const userPhone = order.delivery_address?.contact_phone || order.buyer_phone || user?.whatsapp || user?.mobile || "9876543210";
    const cleanPhone = String(userPhone).replace(/\D/g, "");
    setVanLoading(true);
    try {
      const rawApiUrl = import.meta.env.VITE_API_URL || "http://localhost:5000";
      const baseUrl = rawApiUrl.replace(/\/api\/?$/, "").replace(/\/+$/, "");
      const res = await fetch(`${baseUrl}/api/v1/payments/icici/van-details?phone=${cleanPhone || "9876543210"}`);
      const d = await res.json();
      if (d?.success && d.data) {
        setIciciVanDetails(d.data);
      } else {
        setIciciVanDetails({
          beneficiary_name: "SolarKits Technologies Pvt Ltd",
          virtual_account_number: `SLRK${cleanPhone.slice(-10)}`,
          ifsc_code: "ICIC0000104",
          bank_name: "ICICI Bank",
          branch_name: "CMS Branch, Mumbai",
          upi_handle: `SLRK${cleanPhone.slice(-10)}@icici`,
        });
      }
    } catch (err) {
      setIciciVanDetails({
        beneficiary_name: "SolarKits Technologies Pvt Ltd",
        virtual_account_number: `SLRK${cleanPhone.slice(-10)}`,
        ifsc_code: "ICIC0000104",
        bank_name: "ICICI Bank",
        branch_name: "CMS Branch, Mumbai",
        upi_handle: `SLRK${cleanPhone.slice(-10)}@icici`,
      });
    } finally {
      setVanLoading(false);
    }
  };

  const handleMilestoneFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setMilestoneReceiptFile(file);
      if (file.type.startsWith("image/")) {
        const reader = new FileReader();
        reader.onload = (ev) => setMilestoneReceiptPreview(ev.target.result);
        reader.readAsDataURL(file);
      } else {
        setMilestoneReceiptPreview(null);
      }
    }
  };

  const handleSubmitMilestonePayment = async (e) => {
    e.preventDefault();
    if (!milestoneUtr.trim()) {
      setMilestoneError("Please enter the UTR / Transaction Reference Number.");
      return;
    }
    // For offline payment, receipt is mandatory. For ICICI online VAN, receipt is optional
    if (!milestoneReceiptFile && milestonePaymentGateway === "offline") {
      setMilestoneError("Please upload the payment transfer receipt / screenshot.");
      return;
    }

    setMilestoneSubmitting(true);
    setMilestoneError("");

    try {
      const formData = new FormData();
      formData.append("milestone_number", 2);
      formData.append("utr_number", milestoneUtr.trim().toUpperCase());
      formData.append("amount_paid", Number(milestoneAmount));
      formData.append("payment_date", milestoneDate);
      formData.append("sender_bank_name", milestoneBank || (milestonePaymentGateway === "icici" ? "ICICI eCollection / UPI" : ""));
      formData.append("payment_method", milestonePaymentGateway === "icici" ? "icici_ecollection" : "offline_bank_transfer");
      formData.append("payment_gateway_used", milestonePaymentGateway === "icici" ? "icici_ecollection" : "bank_transfer");
      if (milestoneReceiptFile) {
        formData.append("payment_receipt", milestoneReceiptFile);
      }

      const targetId = milestonePaymentModalOrder._id || milestonePaymentModalOrder.id;
      const res = await axiosInstance.post(
        `/india/v1/shop/orders/${targetId}/milestone-payment`,
        formData,
        { headers: { "Content-Type": "multipart/form-data" } }
      );

      if (res.data?.success) {
        setMilestonePaymentModalOrder(null);
        fetchOrders();
        fetchPoAllocations();
      } else {
        setMilestoneError(res.data?.message || "Failed to submit milestone payment.");
      }
    } catch (err) {
      console.error("Milestone payment submit error:", err);
      setMilestoneError(err.response?.data?.message || "Error submitting payment. Please try again.");
    } finally {
      setMilestoneSubmitting(false);
    }
  };

  // Filter orders by search query across Order #, UTR, kit name, and tracking LR
  const filteredOrders = orders.filter((o) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    const orderNum = (o.order_number || o.id || o._id || "").toLowerCase();
    const utr = (o.offline_payment?.utr_number || o.payment_reference || "").toLowerCase();
    const kitName = (o.combo_kit_id?.name || o.combo_kit_id?.kitName || (o.items?.[0] && o.items[0].item_name) || "").toLowerCase();
    const lr = (o.dispatch_tracking?.tracking_number || "").toLowerCase();
    const courier = (o.dispatch_tracking?.courier_name || "").toLowerCase();
    return orderNum.includes(q) || utr.includes(q) || kitName.includes(q) || lr.includes(q) || courier.includes(q);
  });

  const totalRepeatOrders = poAllocations.reduce((acc, po) => acc + (po.linked_repeat_orders?.length || 0), 0);

  const filteredPoAllocations = poAllocations.map((po) => {
    if (!searchQuery.trim()) return po;
    const q = searchQuery.toLowerCase().trim();
    const poNum = (po.po_number || po.id || po._id || "").toLowerCase();
    const franchisee = (po.franchisee_id?.business_name || po.franchisee_id?.contact_person || "").toLowerCase();
    const parentKitName = (po.items?.[0]?.item_name || "").toLowerCase();
    const parentUtr = (po.items?.[0]?.epc_allocations?.[0]?.payment_utr || po.offline_payment?.utr_number || "").toLowerCase();

    const parentMatches = poNum.includes(q) || franchisee.includes(q) || parentKitName.includes(q) || parentUtr.includes(q);

    const matchedChildren = (po.linked_repeat_orders || []).filter((child) => {
      const childNum = (child.po_number || child.id || child._id || "").toLowerCase();
      const childUtr = (child.payment_utr || child.offline_payment?.utr_number || "").toLowerCase();
      const childKit = (child.items?.[0]?.item_name || "").toLowerCase();
      const lr = (child.dispatch_tracking?.tracking_number || "").toLowerCase();
      const courier = (child.dispatch_tracking?.courier_name || "").toLowerCase();
      const vehicle = (child.assigned_vehicle?.registration_number || child.assigned_vehicle?.vehicle_name || "").toLowerCase();
      const driver = (child.assigned_vehicle?.driver_name || "").toLowerCase();
      return childNum.includes(q) || childUtr.includes(q) || childKit.includes(q) || lr.includes(q) || courier.includes(q) || vehicle.includes(q) || driver.includes(q);
    });

    if (parentMatches) return po;
    if (matchedChildren.length > 0) return { ...po, linked_repeat_orders: matchedChildren };
    return null;
  }).filter(Boolean);

  const modalRemPct = milestonePaymentModalOrder
    ? (milestonePaymentModalOrder.payment_milestones?.remaining_percentage ?? (milestonePaymentModalOrder.payment_milestones?.milestones?.find(m => m.milestone_number === 2)?.percentage || (100 - (milestonePaymentModalOrder.payment_milestones?.advance_percentage || 30))))
    : 70;

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-4">
        <div>
          <h1 className="text-2xl font-black text-text-primary dark:text-white flex items-center gap-2.5">
            <FaShoppingCart className="text-primary" /> My Solar Kit Orders & Live Tracking
          </h1>
          <p className="text-xs text-text-secondary mt-1">
            Real-time status tracking for Direct EPC and Franchise-attributed purchase orders.
          </p>
        </div>

        <button
          onClick={() => {
            fetchOrders();
            fetchPoAllocations();
          }}
          className="inline-flex items-center gap-2 px-3.5 py-2 bg-surface hover:bg-surface-hover border border-border rounded-xl text-xs font-bold text-text-primary transition-colors shadow-sm self-start cursor-pointer"
        >
          <BsArrowRepeat className={(loading || poLoading) ? "animate-spin text-primary" : ""} /> Refresh
        </button>
      </div>

      {/* ── Segment Switcher: Direct Orders vs Franchisee PO Allocations ──────── */}
      <div className="flex items-center gap-2 p-1.5 bg-surface border border-border rounded-2xl w-fit shadow-xs">
        <button
          onClick={() => {
            setMainTab("direct");
            navigate("/track-status?tab=direct", { replace: true });
          }}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${mainTab === "direct"
            ? "bg-primary text-white shadow-sm"
            : "text-text-secondary hover:text-text-primary"
            }`}
        >
          <FaShoppingCart size={13} />
          <span>Direct Kit Orders ({orders.length})</span>
        </button>
        <button
          onClick={() => {
            setMainTab("po_allocations");
            navigate("/track-status?tab=po_allocations", { replace: true });
          }}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${mainTab === "po_allocations"
            ? "bg-primary text-white shadow-sm"
            : "text-text-secondary hover:text-text-primary"
            }`}
        >
          <FaBuilding size={13} />
          <span>Franchisee PO Allocations ({poAllocations.length}{totalRepeatOrders > 0 ? ` • ${totalRepeatOrders} Orders` : ""})</span>
          {poAllocations.some((o) =>
            (o.items || []).some((i) =>
              (i.epc_allocations || []).some((a) => a.payment_status === "RECEIPT_SUBMITTED")
            )
          ) && (
              <span className="w-2 h-2 rounded-full bg-blue-500 animate-ping" />
            )}
        </button>
      </div>

      {mainTab === "direct" ? (
        <>

          {/* Search & Stats Bar (Status Filter Pills Removed as requested) */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-surface p-3 rounded-2xl border border-border shadow-xs">
            <div className="relative flex-1">
              <FaSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted text-xs" />
              <input
                type="text"
                placeholder="Search by Order #, UTR number, Kit package, or Waybill/LR..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-8 py-2 bg-surface-hover/50 hover:bg-surface-hover border border-border rounded-xl text-xs text-text-primary placeholder:text-text-muted focus:outline-none focus:border-primary/50 transition-colors"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary p-0.5"
                >
                  <FaTimes size={11} />
                </button>
              )}
            </div>
            <div className="flex items-center gap-2 text-xs font-bold text-text-secondary px-2">
              <span>
                Showing <strong className="text-text-primary dark:text-white">{filteredOrders.length}</strong> of {orders.length} order{orders.length === 1 ? "" : "s"}
              </span>
            </div>
          </div>

          {/* Loading & Empty States */}
          {loading ? (
            <div className="py-20 text-center space-y-3">
              <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-xs font-bold text-text-secondary">Loading your order history & live tracking...</p>
            </div>
          ) : filteredOrders.length === 0 ? (
            <div className="py-20 text-center bg-surface rounded-3xl border border-border shadow-sm p-8 space-y-3">
              <FaShoppingCart className="mx-auto text-text-muted text-4xl" />
              <h3 className="text-base font-bold text-text-primary dark:text-white">
                {searchQuery ? "No Matching Orders Found" : "No Orders Placed Yet"}
              </h3>
              <p className="text-xs text-text-secondary max-w-sm mx-auto">
                {searchQuery
                  ? `No purchase orders match your search query "${searchQuery}".`
                  : "When you place an order for Solar Combo Kits, real-time live journey tracking will appear here."}
              </p>
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="px-4 py-1.5 rounded-xl bg-primary text-white text-xs font-bold hover:opacity-90 transition-opacity"
                >
                  Clear Search
                </button>
              )}
            </div>
          ) : (
            /* Orders List */
            <div className="space-y-6">
              {filteredOrders.map((order) => {
                const isEpcOrder = order.is_epc_order || order.order_type === "offline_epc_order";
                const orderId = order.order_number || order.id || order._id;
                const items = order.items || [];

                const isIciciPayment = Boolean(
                  order.is_online ||
                  order.payment_method === "icici_ecollection" ||
                  order.payment_gateway_used === "icici_ecollection" ||
                  order.payment_gateway_used === "icici" ||
                  order.payment_info?.payment_method === "icici_ecollection" ||
                  order.payment_info?.payment_gateway_used === "icici_ecollection" ||
                  order.offline_payment?.payment_method === "icici_ecollection" ||
                  order.offline_payment?.payment_gateway_used === "icici_ecollection" ||
                  order.offline_payment?.admin_remarks?.toLowerCase().includes("icici") ||
                  order.offline_payment?.sender_bank_name?.toLowerCase().includes("icici")
                );

                const isApproved =
                  order.offline_payment?.verification_status === "approved" ||
                  order.offline_payment?.admin_approval_status === "approved" ||
                  order.payment_milestones?.milestone_verification_status === "advance_verified" ||
                  order.payment_milestones?.milestone_verification_status === "fully_paid" ||
                  order.payment_status === "captured" ||
                  order.status === "confirmed" ||
                  order.order_status === "confirmed";

                const isDispatched = order.order_status === "dispatched" || order.status === "dispatched" || Boolean(order.dispatch_tracking?.tracking_number);
                const isDelivered = order.order_status === "delivered" || order.status === "completed" || order.status === "delivered";
                const isRejected = order.payment_status === "rejected" || order.status === "rejected" || order.offline_payment?.verification_status === "rejected";

                const isPendingVerification = !isRejected && !isApproved && (
                  order.payment_status === "pending_verification" ||
                  order.payment_status === "pending" ||
                  order.status === "pending" ||
                  order.status === "pending_verification" ||
                  order.order_status === "pending" ||
                  order.offline_payment?.verification_status === "pending" ||
                  order.payment_milestones?.milestone_verification_status === "awaiting_advance" ||
                  order.payment_milestones?.milestone_verification_status === "pending_verification"
                );

                // Determine timeline step progression (1: Order Placed, 2: Verification, 3: Approved & Packaged, 4: Dispatched & In Transit, 5: Delivered)
                let step = 1;
                if (isDelivered) step = 5;
                else if (isDispatched) step = 4;
                else if (isApproved) step = 3;
                else if (isPendingVerification) step = 2;

                const orderNumStr = order.order_number || `#${String(order._id).slice(-8).toUpperCase()}`;
                const utrStr = order.offline_payment?.utr_number || order.payment_reference || "N/A";
                const courierName = order.dispatch_tracking?.courier_name || "Express Logistics";
                const lrNumber = order.dispatch_tracking?.tracking_number || "";
                const trackingUrl = order.dispatch_tracking?.tracking_url || "";
                const dispatchedDate = order.dispatch_tracking?.dispatched_at;

                // Resolve dynamic Admin Turnaround Time (TAT) and Delivery SLA
                const totalSlaDays = Number(order.total_sla_days) || Number(order.payment_milestones?.total_sla_days) || 12;
                const effectiveEstimatedDate = order.dispatch_tracking?.estimated_delivery || order.estimated_delivery_date || (
                  order.created_at ? new Date(new Date(order.created_at).getTime() + totalSlaDays * 86400000).toISOString() : null
                );
                const estimatedDate = effectiveEstimatedDate;

                return (
                  <div
                    key={orderId}
                    className="bg-surface rounded-3xl border border-border shadow-sm overflow-hidden transition-all hover:border-primary/40"
                  >
                    {/* ── Order Top Header ────────────────────────────────────── */}
                    <div className="p-5 sm:p-6 border-b border-border flex flex-col md:flex-row md:items-center justify-between gap-4 bg-surface-hover/30">
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono font-black text-base text-text-primary dark:text-white">
                            {orderNumStr}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleCopy(orderNumStr, `order-${orderId}`)}
                            className="p-1 text-text-secondary hover:text-primary transition-colors cursor-pointer"
                            title="Copy Order Number"
                          >
                            {copiedKey === `order-${orderId}` ? (
                              <span className="text-[10px] font-bold text-emerald-600 flex items-center gap-0.5">
                                <FaCheck size={9} /> Copied
                              </span>
                            ) : (
                              <FaCopy size={12} />
                            )}
                          </button>

                          {isEpcOrder && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/15 text-amber-700 dark:text-amber-300">
                              Direct EPC Order
                            </span>
                          )}

                          {order.reseller?.business_name ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/15 text-emerald-700 dark:text-emerald-300">
                              <FaBuilding size={10} /> Franchise: {order.reseller.business_name}
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-500/15 text-blue-700 dark:text-blue-300">
                              <FaWarehouse size={10} /> Central Company Fulfillment
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-text-secondary">
                          Ordered on {new Date(order.created_at).toLocaleDateString("en-IN", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </p>

                        {/* Prominent Estimated Delivery Badge from Admin */}
                        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-black bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/25 mt-1.5 shadow-2xs">
                          <FaTruck className="text-emerald-600 animate-pulse" size={13} />
                          <span>
                            Est. Delivery:{" "}
                            {estimatedDate ? (
                              <span className="font-extrabold text-emerald-800 dark:text-emerald-200">
                                {new Date(estimatedDate).toLocaleDateString("en-IN", {
                                  day: "numeric",
                                  month: "short",
                                  year: "numeric",
                                })}
                                <span className="ml-1.5 text-[11px] font-semibold opacity-85">
                                  ({totalSlaDays} Days SLA)
                                </span>
                              </span>
                            ) : (
                              <span className="font-semibold text-emerald-800 dark:text-emerald-200">
                                Within {totalSlaDays} Business Days
                              </span>
                            )}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 flex-wrap">
                        {/* Live Order Status Badge */}
                        {isRejected ? (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-black bg-red-500/15 text-red-600 dark:text-red-400 border border-red-500/20">
                            <FaTimesCircle /> Payment Rejected
                          </span>
                        ) : isPendingVerification ? (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-black bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                            <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
                            <FaRegClock /> Accounts Verification Pending
                          </span>
                        ) : isApproved && !isDispatched && !isDelivered ? (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-black bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                            <FaCheckCircle /> Payment Approved • Packing
                          </span>
                        ) : isDispatched && !isDelivered ? (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-black bg-purple-500/15 text-purple-600 dark:text-purple-400 border border-purple-500/20">
                            <span className="w-2 h-2 rounded-full bg-purple-600 animate-ping" />
                            <FaTruck /> Dispatched & In Transit
                          </span>
                        ) : isDelivered ? (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-black bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                            <FaCheckCircle /> Delivered & Completed
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-black bg-surface text-text-secondary border border-border">
                            {order.status}
                          </span>
                        )}

                        <div className="text-right">
                          <span className="text-base font-black text-text-primary dark:text-white block">
                            ₹{(order.total_amount || order.selling_price_snapshot || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                          <span className="text-[10px] text-text-muted font-semibold">Incl. of GST</span>
                        </div>
                      </div>
                    </div>

                    {/* ── Industry Standard Order Journey Stepper ─────────────── */}
                    {!isRejected && (
                      <div className="p-6 border-b border-border bg-surface">
                        <div className="relative max-w-5xl mx-auto">
                          {(() => {
                            const STAGE_ORDER = [
                              { key: "confirmed", label: "1. Confirmed", sub: "Payment verified" },
                              { key: "processing", label: "2. Processing", sub: "Warehouse picking" },
                              { key: "vehicle_assigned", label: "3. Fleet Assigned", sub: "Vehicle & Driver" },
                              { key: "ready_for_dispatch", label: "4. Ready", sub: "Staged at gate" },
                              { key: "dispatched", label: "5. Dispatched", sub: "Out for delivery" },
                              { key: "in_transit", label: "6. In Transit", sub: "En route" },
                              { key: "reached_destination", label: "7. Arrived", sub: "At site / hub" },
                              { key: "delivered", label: "8. Delivered", sub: "Delivery complete" },
                            ];

                            const rawStatus = String(order.order_status || order.status || "").toLowerCase();
                            let stageIndex = 0;
                            if (rawStatus === "delivered" || rawStatus === "completed") stageIndex = 7;
                            else if (rawStatus === "reached_destination") stageIndex = 6;
                            else if (rawStatus === "in_transit") stageIndex = 5;
                            else if (rawStatus === "dispatched" || Boolean(order.dispatch_tracking?.tracking_number)) stageIndex = 4;
                            else if (rawStatus === "ready_for_dispatch") stageIndex = 3;
                            else if (rawStatus === "vehicle_assigned" || Boolean(order.assigned_vehicle?.vehicle_id || order.assigned_vehicle?.vehicle_name)) stageIndex = 2;
                            else if (rawStatus === "processing") stageIndex = 1;
                            else if (rawStatus === "confirmed" || order.payment_status === "captured" || order.payment_status === "paid") stageIndex = 0;
                            else stageIndex = 0;

                            const stagesConfig = Array.isArray(order.order_stages_config) && order.order_stages_config.length > 0
                              ? order.order_stages_config
                              : (order.payment_milestones?.order_stages_config || []);

                            const orderStartTime = order.created_at ? new Date(order.created_at).getTime() : Date.now();

                            // Calculate running cumulative days for each stage from Admin configuration
                            let runningDays = 0;
                            const enrichedStages = STAGE_ORDER.map((st, sIdx) => {
                              const matchConfig = stagesConfig.find(
                                (cfg) => (cfg.stage_key || "").toUpperCase() === st.key.toUpperCase()
                              );

                              const fallbackDays = [1, 2, 1, 2, 1, 3, 1, 1][sIdx];
                              const stepDays = matchConfig?.tat_days !== undefined && matchConfig?.tat_days !== null && matchConfig?.tat_days !== ""
                                ? Number(matchConfig.tat_days)
                                : (matchConfig?.tat_hours ? Math.max(1, Math.round(Number(matchConfig.tat_hours) / 24)) : fallbackDays);

                              runningDays += stepDays;
                              const targetDate = new Date(orderStartTime + runningDays * 86400000);

                              return {
                                ...st,
                                matchConfig,
                                stepDays,
                                targetDate,
                                runningDays,
                                displayName: matchConfig?.stage_name || st.sub,
                              };
                            });

                            return (
                              <div className="space-y-4">
                                {/* Top SLA & Estimated Delivery Summary Header */}
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2.5 border-b border-border/60 text-xs">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className="font-extrabold text-text-primary dark:text-white flex items-center gap-1.5">
                                      <FaRegClock className="text-primary" /> Live 8-Stage Fulfillment Timeline
                                    </span>
                                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-black bg-blue-500/10 text-blue-700 dark:text-blue-300 border border-blue-500/20">
                                      Total SLA: {totalSlaDays} Days
                                    </span>
                                  </div>
                                  <div className="text-[11px] text-text-secondary flex items-center gap-1.5">
                                    <span>Target Final Delivery:</span>
                                    <strong className="font-black text-emerald-700 dark:text-emerald-300">
                                      {effectiveEstimatedDate
                                        ? new Date(effectiveEstimatedDate).toLocaleDateString("en-IN", {
                                            day: "numeric",
                                            month: "short",
                                            year: "numeric",
                                          })
                                        : `Within ${totalSlaDays} Days`}
                                    </strong>
                                  </div>
                                </div>

                                {/* Connecting Progress Track & Steps */}
                                <div className="overflow-x-auto pb-3">
                                  <div className="relative min-w-[760px]">
                                    <div className="absolute top-4 left-6 right-6 h-1 bg-border rounded-full -z-0" />
                                    <div
                                      className="absolute top-4 left-6 h-1 bg-gradient-to-r from-primary via-indigo-600 to-emerald-500 rounded-full transition-all duration-500 -z-0"
                                      style={{ width: `${Math.min(100, Math.max(0, (stageIndex / (STAGE_ORDER.length - 1)) * 100))}%` }}
                                    />

                                    <div className="grid grid-cols-8 gap-2 relative z-10">
                                      {enrichedStages.map((st, sIdx) => {
                                        const isCompleted = sIdx < stageIndex;
                                        const isCurrent = sIdx === stageIndex;

                                        return (
                                          <div key={st.key} className="flex flex-col items-center text-center space-y-1 px-0.5">
                                            <div
                                              className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-black transition-all ${isCompleted
                                                  ? "bg-emerald-600 text-white shadow-md shadow-emerald-600/25"
                                                  : isCurrent
                                                    ? "bg-primary text-white shadow-md shadow-primary/30 ring-4 ring-primary/20 scale-110 animate-pulse"
                                                    : "bg-surface-hover border border-border text-text-muted"
                                                }`}
                                            >
                                              {isCompleted ? "✓" : sIdx + 1}
                                            </div>
                                            <p className={`text-[11px] font-bold leading-tight ${isCurrent ? "text-primary font-black" : isCompleted ? "text-emerald-700 dark:text-emerald-300" : "text-text-primary dark:text-slate-200"}`}>
                                              {st.label.replace(/^\d+\.\s*/, "")}
                                            </p>
                                            <p className="text-[9px] text-text-muted leading-tight line-clamp-1" title={st.displayName}>
                                              {st.displayName}
                                            </p>

                                            {/* Number of Days Badge from Admin */}
                                            <div className="pt-0.5">
                                              <span
                                                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold whitespace-nowrap border ${isCompleted
                                                    ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20"
                                                    : isCurrent
                                                      ? "bg-primary/10 text-primary border-primary/30 shadow-2xs"
                                                      : "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/25"
                                                  }`}
                                                title={`Turnaround Time configured by Admin: ${st.stepDays} Day${st.stepDays > 1 ? "s" : ""}`}
                                              >
                                                ⏱️ {st.stepDays} Day{st.stepDays > 1 ? "s" : ""}
                                              </span>
                                            </div>

                                            {/* Cumulative Target Date */}
                                            <div className="text-[9px] font-semibold leading-tight pt-0.5">
                                              {isCompleted ? (
                                                <span className="text-emerald-600 dark:text-emerald-400 font-bold">✓ Completed</span>
                                              ) : isCurrent ? (
                                                <span className="text-primary font-black">
                                                  Est: {st.targetDate.toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                                                </span>
                                              ) : (
                                                <span className="text-text-muted">
                                                  Est: {st.targetDate.toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                                                </span>
                                              )}
                                            </div>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  </div>
                                </div>

                                {/* Assigned Fleet & Logistics Card if vehicle assigned */}
                                {order.assigned_vehicle?.vehicle_name && (
                                  <div className="p-3.5 bg-primary/5 rounded-2xl border border-primary/20 flex flex-wrap items-center justify-between gap-3 text-xs">
                                    <div className="flex items-center gap-3">
                                      <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                                        <FaTruck size={18} />
                                      </div>
                                      <div>
                                        <div className="flex items-center gap-2">
                                          <span className="font-black text-text-primary">
                                            🚚 {order.assigned_vehicle.vehicle_name}
                                          </span>
                                          <span className="font-mono text-xs px-2 py-0.5 rounded bg-surface border border-border text-primary font-bold">
                                            {order.assigned_vehicle.vehicle_registration}
                                          </span>
                                          {order.assigned_vehicle.is_recommended && (
                                            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-700">
                                              Optimal Fit Fleet
                                            </span>
                                          )}
                                        </div>
                                        <p className="text-[11px] text-text-secondary mt-0.5">
                                          Driver: <strong>{order.assigned_vehicle.driver_name || "Assigned Driver"}</strong>
                                          {order.assigned_vehicle.driver_contact && (
                                            <span className="ml-2 font-mono text-text-primary">📞 {order.assigned_vehicle.driver_contact}</span>
                                          )}
                                        </p>
                                      </div>
                                    </div>

                                    {order.dispatch_tracking?.tracking_number && (
                                      <div className="text-right">
                                        <span className="text-[10px] text-text-muted block">Tracking / LR Number</span>
                                        <span className="font-mono font-black text-primary text-xs">
                                          {order.dispatch_tracking.tracking_number}
                                        </span>
                                      </div>
                                    )}
                                  </div>
                                )}

                                {/* In-transit Milestones if recorded */}
                                {order.milestones && order.milestones.length > 0 && (
                                  <div className="p-3 bg-surface-hover/60 rounded-xl border border-border text-xs space-y-1.5">
                                    <span className="text-[10px] font-bold uppercase tracking-wider text-text-muted block">
                                      Transit Milestones & Checkpoints:
                                    </span>
                                    <div className="space-y-1">
                                      {order.milestones.map((ms, mIdx) => (
                                        <div key={mIdx} className="flex items-center justify-between text-[11px] text-text-secondary bg-surface px-2.5 py-1 rounded-lg border border-border/50">
                                          <span className="flex items-center gap-1.5">
                                            <FaRoute className="text-primary" size={11} /> {ms.description || ms.status}
                                          </span>
                                          <span className="text-[10px] text-text-muted">
                                            {new Date(ms.recorded_at).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
                                          </span>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>
                            );
                          })()}
                        </div>
                      </div>
                    )}

                    {/* ── High-visibility Rejection Notice if Accounts Rejected Payment ── */}
                    {isRejected && (
                      <div className="p-6 bg-red-500/10 border-b border-red-500/20 text-red-800 dark:text-red-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                        <div className="flex items-start gap-3">
                          <FaExclamationTriangle className="text-red-500 text-2xl shrink-0 mt-0.5" />
                          <div>
                            <h4 className="font-extrabold text-sm text-red-600 dark:text-red-400">
                              Payment Verification Rejected by Accounts
                            </h4>
                            <p className="text-xs mt-0.5 text-text-secondary">
                              <strong>Reason:</strong> {order.offline_payment?.rejection_reason || "Payment amount or UTR could not be verified."}
                            </p>
                            <p className="text-[11px] text-text-muted mt-1">
                              Please verify your bank transaction and re-upload the receipt with the correct UTR number.
                            </p>
                          </div>
                        </div>

                        <Button
                          onClick={() => handleOpenResubmit(order)}
                          variant="primary"
                          className="py-2.5 px-4 text-xs font-black shrink-0 shadow bg-red-600 hover:bg-red-700 border-none cursor-pointer"
                        >
                          <FaRedo className="mr-1.5" /> Re-submit Receipt & UTR
                        </Button>
                      </div>
                    )}

                    {/* ── DEDICATED LOGISTICS & DISPATCH TRACKING CARD (Industry Standard) ── */}
                    {(isDispatched || lrNumber) && (
                      <div className="p-5 sm:p-6 bg-gradient-to-r from-purple-500/10 via-indigo-500/10 to-blue-500/10 border-b border-purple-500/25 text-xs space-y-4">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <span className="p-2.5 rounded-2xl bg-purple-600 text-white shadow-md shadow-purple-600/30 shrink-0">
                              <FaTruck size={16} />
                            </span>
                            <div>
                              <div className="flex items-center gap-2 flex-wrap">
                                <h4 className="font-black text-sm text-purple-950 dark:text-purple-100">
                                  Logistics & Waybill Tracking
                                </h4>
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-purple-500/20 text-purple-700 dark:text-purple-300 border border-purple-500/30">
                                  <span className="w-1.5 h-1.5 rounded-full bg-purple-600 animate-ping" />
                                  {isDelivered ? "Delivered" : "In Transit with Courier"}
                                </span>
                              </div>
                              <p className="text-[11px] text-text-secondary mt-0.5">
                                Official transport consignment recorded by Operations & Warehouse team
                              </p>
                            </div>
                          </div>

                          {trackingUrl && (
                            <a
                              href={trackingUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black bg-purple-600 hover:bg-purple-700 text-white shadow-md shadow-purple-600/25 transition-all self-start sm:self-auto cursor-pointer shrink-0"
                            >
                              <span>Track Live on Courier Portal</span>
                              <FaExternalLinkAlt size={11} />
                            </a>
                          )}
                        </div>

                        {/* 4-Column Shipment Grid */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                          {/* Courier Partner */}
                          <div className="bg-surface/90 backdrop-blur-sm p-3.5 rounded-2xl border border-purple-500/20 space-y-1">
                            <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider block">
                              Logistics Partner
                            </span>
                            <p className="font-black text-sm text-text-primary dark:text-white flex items-center gap-1.5">
                              <FaRoute className="text-purple-600" />
                              {courierName}
                            </p>
                            <span className="text-[10px] text-text-secondary block">Express Road Transport</span>
                          </div>

                          {/* LR / Tracking Number with One-Click Copy */}
                          <div className="bg-surface/90 backdrop-blur-sm p-3.5 rounded-2xl border border-purple-500/20 space-y-1">
                            <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider block">
                              LR / Consignment No.
                            </span>
                            <div className="flex items-center justify-between gap-2">
                              <span className="font-mono font-black text-sm text-purple-700 dark:text-purple-300">
                                {lrNumber || "Pending Entry"}
                              </span>
                              {lrNumber && (
                                <button
                                  type="button"
                                  onClick={() => handleCopy(lrNumber, `lr-${orderId}`)}
                                  className="p-1 rounded-lg text-text-secondary hover:text-purple-600 hover:bg-purple-500/10 transition-colors cursor-pointer"
                                  title="Copy LR / Tracking Number"
                                >
                                  {copiedKey === `lr-${orderId}` ? (
                                    <span className="text-[10px] font-bold text-emerald-600 flex items-center gap-0.5">
                                      <FaCheck size={9} /> Copied
                                    </span>
                                  ) : (
                                    <FaCopy size={13} />
                                  )}
                                </button>
                              )}
                            </div>
                            <span className="text-[10px] text-text-secondary block">Docket Reference ID</span>
                          </div>

                          {/* Dispatched Date */}
                          <div className="bg-surface/90 backdrop-blur-sm p-3.5 rounded-2xl border border-purple-500/20 space-y-1">
                            <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider block">
                              Dispatched On
                            </span>
                            <p className="font-extrabold text-xs text-text-primary dark:text-white">
                              {dispatchedDate
                                ? new Date(dispatchedDate).toLocaleDateString("en-IN", {
                                  day: "numeric",
                                  month: "short",
                                  year: "numeric",
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })
                                : "Handed over to carrier"}
                            </p>
                            <span className="text-[10px] text-text-secondary block">Warehouse Exit Timestamp</span>
                          </div>

                          {/* Estimated Delivery */}
                          <div className="bg-surface/90 backdrop-blur-sm p-3.5 rounded-2xl border border-purple-500/20 space-y-1">
                            <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider block">
                              Estimated Delivery
                            </span>
                            <p className="font-extrabold text-xs text-emerald-600 dark:text-emerald-400">
                              {estimatedDate
                                ? new Date(estimatedDate).toLocaleDateString("en-IN", {
                                  day: "numeric",
                                  month: "short",
                                  year: "numeric",
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })
                                : `Within ${totalSlaDays} Business Days`}
                            </p>
                            <span className="text-[10px] text-text-secondary block">Destination Site ETA ({totalSlaDays}d SLA)</span>
                          </div>
                        </div>

                        {order.dispatch_tracking?.dispatch_notes && (
                          <div className="p-3 rounded-xl bg-surface/70 border border-purple-500/20 text-xs text-text-secondary">
                            <strong className="text-text-primary font-bold">Consignment Notes / Remarks:</strong>{" "}
                            {order.dispatch_tracking.dispatch_notes}
                          </div>
                        )}
                      </div>
                    )}

                    {/* ── Order Details & Site Address Body ───────────────────── */}
                    <div className="p-6 space-y-4 text-xs">
                      {/* Equipment & Payment Details Grid */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-text-secondary block">Ordered Equipment / Kit:</span>
                            {(items.length > 1) && (
                              <span className="text-[11px] font-semibold text-text-muted">
                                {items.length} Items
                              </span>
                            )}
                          </div>

                          {(() => {
                            const displayItems = items && items.length > 0
                              ? items
                              : [
                                {
                                  item_name: order.combo_kit_id?.name || order.combo_kit_id?.kitName || "Solar Kit Package",
                                  image: order.combo_kit_id?.image || order.combo_kit_id?.kit_image || null,
                                  capacity: order.combo_kit_id?.capacity || null,
                                  description: order.combo_kit_id?.description || null,
                                  quantity: order.total_kits || 1,
                                  scope_type: "kit",
                                },
                              ];

                            return (
                              <div className="bg-surface-hover/70 rounded-2xl border border-border overflow-hidden divide-y divide-border/60">
                                {displayItems.map((item, idx) => {
                                  const itemImg = item.image || item.kit_image || (idx === 0 && (order.combo_kit_id?.image || order.combo_kit_id?.kit_image));
                                  const itemName = item.item_name || (idx === 0 && (order.combo_kit_id?.name || order.combo_kit_id?.kitName)) || "Solar Kit Package";
                                  const itemCapacity = item.capacity || (idx === 0 && order.combo_kit_id?.capacity);
                                  const itemDesc = item.description || (idx === 0 && order.combo_kit_id?.description);
                                  const itemQty = item.quantity || (idx === 0 ? order.total_kits : 1) || 1;
                                  const scope = item.scope_type || (item.kit_id ? "kit" : "product");

                                  return (
                                    <div key={idx} className="p-3.5 sm:p-4 flex gap-3.5 items-start">
                                      {/* Product / Kit Image */}
                                      <div className="relative w-16 h-16 sm:w-20 sm:h-20 shrink-0 rounded-xl overflow-hidden border border-border bg-surface shadow-xs flex items-center justify-center">
                                        {itemImg ? (
                                          <img
                                            src={itemImg}
                                            alt={itemName}
                                            className="w-full h-full object-cover rounded-xl transition-transform hover:scale-105 duration-300"
                                            onError={(e) => {
                                              e.currentTarget.style.display = "none";
                                              if (e.currentTarget.nextSibling) {
                                                e.currentTarget.nextSibling.style.display = "flex";
                                              }
                                            }}
                                          />
                                        ) : null}
                                        <div
                                          className="w-full h-full flex items-center justify-center bg-primary/5 text-primary"
                                          style={{ display: itemImg ? "none" : "flex" }}
                                        >
                                          <FaBoxOpen size={24} />
                                        </div>
                                      </div>

                                      {/* Details Column */}
                                      <div className="flex-1 min-w-0 space-y-1.5">
                                        <h4
                                          className="font-black text-sm text-text-primary dark:text-white leading-snug line-clamp-2"
                                          title={itemName}
                                        >
                                          {itemName}
                                        </h4>

                                        <div className="flex items-center gap-1.5 flex-wrap">
                                          {itemCapacity && (
                                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-black bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/25">
                                              ⚡ {itemCapacity}
                                            </span>
                                          )}
                                          <span className="inline-block px-2 py-0.5 rounded-md text-[10px] font-bold bg-primary/10 text-primary uppercase tracking-wide border border-primary/20">
                                            Scope: {scope}
                                          </span>
                                          <span className="text-xs text-text-secondary">
                                            Qty: <strong className="text-text-primary font-bold">{itemQty} {scope === "kit" ? "Kit(s)" : "Unit(s)"}</strong>
                                          </span>
                                        </div>

                                        {itemDesc && (
                                          <p className="text-[11px] text-text-secondary/80 line-clamp-2 leading-relaxed">
                                            {itemDesc}
                                          </p>
                                        )}
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            );
                          })()}
                        </div>

                        {/* ── Product Payment Milestones Progress ── */}
                        {(() => {
                          const isTrialOrder = Boolean(
                            order.is_trial_order ||
                            order.order_type === "trial_order" ||
                            order.fulfillment_bifurcation?.order_type === "trial_order" ||
                            order.items?.some(it => it.is_trial_kit || /trial/i.test(it.item_name || "")) ||
                            order.payment_milestones?.remaining_percentage === 0 ||
                            (order.payment_milestones?.remaining_amount === 0 && order.payment_milestones?.milestones?.length === 1)
                          );

                          return (
                            <div className="space-y-3">
                              <div className="flex items-center justify-between">
                                <span className="font-extrabold text-xs text-text-primary dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                                  <span className={`w-2 h-2 rounded-full ${isTrialOrder ? "bg-emerald-500" : "bg-amber-500"}`}></span>
                                  {isTrialOrder ? "Trial Kit Order Payment (100% Upfront)" : "Payment Milestones Schedule"}
                                </span>
                                <span className="text-[11px] font-bold text-text-muted">
                                  Total: ₹{(order.total_amount || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </span>
                              </div>

                              {isTrialOrder ? (
                                <div className="p-4 rounded-2xl border transition-all bg-emerald-500/5 border-emerald-500/30 space-y-2">
                                  <div className="flex items-center justify-between">
                                    <span className="text-[11px] font-black uppercase tracking-wider px-2.5 py-1 rounded-md bg-emerald-500/15 text-emerald-700 dark:text-emerald-300">
                                      Trial Kit Order • Single 100% Full Payment
                                    </span>
                                    <span className="font-black text-sm text-text-primary dark:text-white">
                                      ₹{Number(order.total_amount || (order.grand_total_paise || 0) / 100 || 0).toLocaleString("en-IN")}
                                    </span>
                                  </div>
                                  <p className="text-xs text-text-secondary leading-relaxed">
                                    Trial kits are promotional verification orders with 100% upfront payment (zero remaining balance).
                                  </p>
                                  <div className="flex items-center justify-between pt-2 border-t border-emerald-500/20 text-xs">
                                    <span className="font-mono text-text-secondary text-[11px]">UTR: {utrStr}</span>
                                    {order.payment_status === "captured" ||
                                      order.payment_status === "paid" ||
                                      order.payment_milestones?.milestone_verification_status === "fully_paid" ||
                                      order.offline_payment?.verification_status === "approved" ||
                                      ["processing", "vehicle_assigned", "ready_for_dispatch", "dispatched", "in_transit", "reached_destination", "delivered"].includes(order.order_status || order.status) ? (
                                      <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-300">
                                        <FaCheckCircle size={10} /> 100% Full Payment Verified
                                      </span>
                                    ) : order.payment_status === "rejected" ? (
                                      <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-500/15 text-red-600">
                                        <FaTimesCircle size={10} /> Payment Rejected
                                      </span>
                                    ) : (
                                      <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-700">
                                        <FaRegClock size={10} /> Accounts Reviewing Full Payment
                                      </span>
                                    )}
                                  </div>
                                </div>
                              ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                  {/* Milestone 1: Advance */}
                                  {(() => {
                                    const m1 = order.payment_milestones?.milestones?.find(m => m.milestone_number === 1);
                                    const isM1Verified =
                                      m1?.payment_status === "verified" ||
                                      m1?.payment_status === "approved" ||
                                      order.payment_milestones?.milestone_verification_status === "advance_verified" ||
                                      order.payment_milestones?.milestone_verification_status === "fully_paid" ||
                                      order.offline_payment?.verification_status === "approved" ||
                                      order.offline_payment?.admin_approval_status === "approved" ||
                                      ["processing", "vehicle_assigned", "ready_for_dispatch", "dispatched", "in_transit", "reached_destination", "delivered"].includes(order.order_status || order.status);
                                    const isM1Rejected = order.payment_status === "rejected" || m1?.payment_status === "rejected";
                                    const advPct = order.payment_milestones?.advance_percentage ?? (m1?.percentage || 30);
                                    const m1Amount = order.payment_milestones?.advance_amount || order.offline_payment?.amount_paid || Math.round((order.total_amount || 0) * (advPct / 100));
                                    const m1Utr = m1?.utr_number || order.offline_payment?.utr_number || utrStr;

                                    return (
                                      <div className={`p-3.5 rounded-2xl border transition-all ${isM1Verified ? "bg-emerald-500/5 border-emerald-500/30" : isM1Rejected ? "bg-red-500/5 border-red-500/30" : "bg-amber-500/5 border-amber-500/30"}`}>
                                        <div className="flex items-center justify-between mb-1">
                                          <span className="text-[11px] font-black uppercase tracking-wider text-amber-700 dark:text-amber-300">
                                            Milestone 1 — Advance ({advPct}%)
                                          </span>
                                          <span className="font-black text-sm text-text-primary dark:text-white">
                                            ₹{Number(m1Amount).toLocaleString("en-IN")}
                                          </span>
                                        </div>
                                        <div className="flex items-center justify-between mt-1.5 text-xs">
                                          <span className="text-[11px] text-text-secondary font-mono">UTR: {m1Utr}</span>
                                          {isM1Verified ? (
                                            <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-300">
                                              <FaCheckCircle size={10} /> Advance Verified
                                            </span>
                                          ) : isM1Rejected ? (
                                            <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-500/15 text-red-600">
                                              <FaTimesCircle size={10} /> Rejected
                                            </span>
                                          ) : (
                                            <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-700">
                                              <FaRegClock size={10} /> Accounts Reviewing
                                            </span>
                                          )}
                                        </div>
                                      </div>
                                    );
                                  })()}

                                  {/* Milestone 2: Remaining Balance */}
                                  {(() => {
                                    const m2 = order.payment_milestones?.milestones?.find(m => m.milestone_number === 2);
                                    const hasMilestones = Boolean(order.payment_milestones?.milestones?.length > 1 || (order.payment_milestones?.remaining_amount > 0 && order.payment_milestones?.advance_amount > 0));
                                    const isM2Verified = hasMilestones
                                      ? Boolean(
                                        (m2?.payment_status === "verified" || m2?.payment_status === "approved") ||
                                        (order.payment_milestones?.milestone_verification_status === "fully_paid" && m2?.payment_status !== "unpaid" && m2?.payment_status !== "pending_verification")
                                      )
                                      : (order.payment_status === "captured" || order.payment_status === "paid");
                                    const isM2Pending = !isM2Verified && (
                                      m2?.payment_status === "pending_verification" ||
                                      order.payment_milestones?.milestone_verification_status === "final_payment_pending_verification" ||
                                      Boolean(m2?.utr_number && m2?.payment_status !== "unpaid")
                                    );
                                    const remPct = order.payment_milestones?.remaining_percentage ?? (m2?.percentage || (100 - (order.payment_milestones?.advance_percentage || 30)));
                                    const m2Amount = order.payment_milestones?.remaining_amount || Math.max(0, Math.round((order.total_amount || 0) * (remPct / 100)));
                                    const m2Utr = m2?.utr_number;

                                    return (
                                      <div className={`p-3.5 rounded-2xl border transition-all flex flex-col justify-between ${isM2Verified ? "bg-emerald-500/5 border-emerald-500/30" : isM2Pending ? "bg-blue-500/5 border-blue-500/30" : "bg-purple-500/5 border-purple-500/30"}`}>
                                        <div>
                                          <div className="flex items-center justify-between mb-1">
                                            <span className="text-[11px] font-black uppercase tracking-wider text-purple-700 dark:text-purple-300">
                                              Milestone 2 — Before Dispatch ({remPct}%)
                                            </span>
                                            <span className="font-black text-sm text-text-primary dark:text-white">
                                              ₹{Number(m2Amount).toLocaleString("en-IN")}
                                            </span>
                                          </div>
                                          <p className="text-[10px] text-text-secondary leading-tight mt-0.5">
                                            Required before materials are released from warehouse for courier transit.
                                          </p>
                                        </div>

                                        <div className="flex items-center justify-between mt-1.5 text-xs">
                                          {isM2Verified ? (
                                            <>
                                              <span className="text-[11px] text-text-secondary font-mono">{m2Utr ? `UTR: ${m2Utr}` : "Fully Cleared"}</span>
                                              <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-300">
                                                <FaCheckCircle size={10} /> Fully Paid & Cleared
                                              </span>
                                            </>
                                          ) : isM2Pending ? (
                                            <>
                                              <span className="text-[11px] text-text-secondary font-mono">{m2Utr ? `UTR: ${m2Utr}` : "Payment Submitted"}</span>
                                              <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-500/15 text-blue-700 dark:text-blue-300">
                                                <FaRegClock size={10} /> Accounts Reviewing
                                              </span>
                                            </>
                                          ) : (
                                            <div className="flex items-center justify-between w-full">
                                              <span className="text-[10px] font-bold text-amber-700 dark:text-amber-400">
                                                ● Balance Due
                                              </span>
                                              <button
                                                type="button"
                                                onClick={() => handleOpenMilestonePay(order)}
                                                className="px-3 py-1.5 bg-primary hover:bg-primary/90 text-white rounded-lg text-xs font-black shadow-sm flex items-center gap-1.5 transition-all cursor-pointer"
                                              >
                                                <span>Pay {remPct}% Balance (₹{Number(m2Amount).toLocaleString("en-IN")})</span>
                                              </button>
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                    );
                                  })()}
                                </div>
                              )}
                            </div>
                          );
                        })()}
                      </div>

                      {/* Delivery / Installation Site Address */}
                      {order.delivery_address && (order.delivery_address.line || order.delivery_address.district_name || order.delivery_address.state_name) && (
                        <div className="bg-surface-hover/60 p-4 rounded-2xl border border-border flex items-start gap-3">
                          <div className="p-2 rounded-xl bg-primary/10 text-primary shrink-0 mt-0.5">
                            <FaMapMarkerAlt size={14} />
                          </div>
                          <div className="space-y-0.5 flex-1 min-w-0">
                            <div className="flex items-center justify-between flex-wrap gap-1">
                              <span className="font-extrabold text-xs text-text-primary dark:text-white">
                                Delivery Destination
                              </span>
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/20">
                                  <FaRegClock size={10} />
                                  Estimated Delivery:{" "}
                                  <strong className="font-black">
                                    {estimatedDate
                                      ? `${new Date(estimatedDate).toLocaleDateString("en-IN", {
                                          day: "numeric",
                                          month: "short",
                                          year: "numeric",
                                        })} (${totalSlaDays} Business Days SLA)`
                                      : `${totalSlaDays} Business Days`}
                                  </strong>
                                </span>
                                {order.delivery_address.pincode && (
                                  <span className="text-[11px] font-mono font-bold text-text-muted bg-surface px-2 py-0.5 rounded border border-border">
                                    PIN: {order.delivery_address.pincode}
                                  </span>
                                )}
                              </div>
                            </div>
                            <p className="text-xs text-text-secondary">
                              {order.delivery_address.line}
                              {order.delivery_address.district_name ? `, ${order.delivery_address.district_name}` : ""}
                              {order.delivery_address.state_name ? `, ${order.delivery_address.state_name}` : ""}
                            </p>
                            {(order.delivery_address.contact_name || order.delivery_address.contact_phone) && (
                              <p className="text-[11px] text-text-muted pt-0.5">
                                Site Contact: <strong>{order.delivery_address.contact_name || "Site Supervisor"}</strong>
                                {order.delivery_address.contact_phone ? ` • Phone: ${order.delivery_address.contact_phone}` : ""}
                              </p>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Actions & Documents Row */}
                      <div className="flex items-center justify-between pt-3 border-t border-border flex-wrap gap-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          {order.invoice?.invoice_number && (
                            <button
                              onClick={() => handleViewInvoice(order)}
                              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-primary/10 hover:bg-primary/20 border border-primary/30 rounded-xl text-xs font-bold text-primary transition-colors cursor-pointer"
                            >
                              <FaFileInvoice /> View Tax Invoice ({order.invoice.invoice_number})
                            </button>
                          )}
                          {order.offline_payment?.receipt_url && (
                            <a
                              href={order.offline_payment.receipt_url}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-surface hover:bg-surface-hover border border-border rounded-xl text-xs font-semibold text-text-secondary transition-colors cursor-pointer"
                            >
                              <FaEye /> View Uploaded Receipt
                            </a>
                          )}
                        </div>

                        <span className="text-text-muted text-[11px]">
                          Fulfillment: {order.fulfillment_source === "franchise_warehouse" ? "Franchise Partner Stock" : "Central Company Hub"}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      ) : (
        /* ── Franchisee PO Allocations & Orders Tracking Tab ────────────────── */
        <div className="space-y-6">
          {/* Search & Stats Bar for PO Allocations */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-surface p-3 rounded-2xl border border-border shadow-xs">
            <div className="relative flex-1">
              <FaSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted text-xs" />
              <input
                type="text"
                placeholder="Search by PO #, Drawdown Order #, UTR number, Kit package, or Waybill/LR..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-8 py-2 bg-surface-hover/50 hover:bg-surface-hover border border-border rounded-xl text-xs text-text-primary placeholder:text-text-muted focus:outline-none focus:border-primary/50 transition-colors"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary p-0.5"
                >
                  <FaTimes size={11} />
                </button>
              )}
            </div>
            <div className="flex items-center gap-2 text-xs font-bold text-text-secondary px-2">
              <span>
                Showing <strong className="text-text-primary dark:text-white">{filteredPoAllocations.length}</strong> of {poAllocations.length} allocation{poAllocations.length === 1 ? "" : "s"}
                {totalRepeatOrders > 0 && ` (${totalRepeatOrders} placed orders)`}
              </span>
            </div>
          </div>

          {/* Loading & Empty States */}
          {poLoading ? (
            <div className="py-20 text-center space-y-3">
              <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-xs font-bold text-text-secondary">Loading Franchisee PO Allocations & Live Tracking...</p>
            </div>
          ) : filteredPoAllocations.length === 0 ? (
            <div className="py-20 text-center bg-surface rounded-3xl border border-border shadow-sm p-8 space-y-3">
              <FaBuilding className="mx-auto text-text-muted text-4xl" />
              <h3 className="text-base font-bold text-text-primary dark:text-white">
                {searchQuery ? "No Matching PO Allocations Found" : "No Franchisee PO Allocations"}
              </h3>
              <p className="text-xs text-text-secondary max-w-md mx-auto">
                {searchQuery
                  ? `No purchase orders or repeat drawdowns match "${searchQuery}".`
                  : "When your Franchise Partner creates a Purchase Order and allocates solar combo kits to your company, they will appear here for payment upload and live tracking."}
              </p>
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="px-4 py-1.5 rounded-xl bg-primary text-white text-xs font-bold hover:opacity-90 transition-opacity"
                >
                  Clear Search
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-8">
              {filteredPoAllocations.map((order) => {
                const item = order.items?.[0] || {};
                const epcAlloc = item.epc_allocations?.[0] || {};
                const allocQty = order.total_booked_quantity || epcAlloc.allocated_quantity || item.quantity || 1;
                const repeatOrders = order.linked_repeat_orders || [];
                const fulfilledQty = order.fulfilled_quantity || repeatOrders.reduce((sum, ch) => {
                  const isCounted = !["CANCELLED", "REJECTED", "DRAFT"].includes(ch.status);
                  return sum + (isCounted ? (ch.items?.[0]?.quantity || ch.total_quantity || 0) : 0);
                }, 0);
                const remainingQty = Math.max(0, allocQty - fulfilledQty);
                const unitRate = Math.round((item.unit_price_paise || 0) / 100);
                const totalLanded = Math.round((order.grand_total_paise || 0) / 100) || Math.round((item.total_price_paise || 0) / 100);
                const tokenDeposit = Math.round((order.token_amount_paise || epcAlloc.token_amount_paise || 0) / 100);
                const tokenPaid = Math.round((order.token_paid_paise || epcAlloc.token_paid_paise || 0) / 100);
                const payStatus = epcAlloc.payment_status || order.token_payment_status || "PENDING";
                const isTokenVerified = payStatus === "VERIFIED" || order.token_payment_status === "PAID" || (tokenDeposit > 0 && tokenPaid >= tokenDeposit);
                const isPoPaid = isTokenVerified || ["PAID", "STOCK_ALLOCATED", "PROCESSING", "DISPATCHED", "DELIVERED", "COMPLETED"].includes(order.status);
                const isDelivered = remainingQty === 0 && repeatOrders.length > 0 && repeatOrders.every(ch => ["DELIVERED", "COMPLETED"].includes(ch.status));
                const isDispatched = repeatOrders.some(ch => ["DISPATCHED", "IN_TRANSIT", "REACHED_DESTINATION", "DELIVERED", "COMPLETED"].includes(ch.status)) || Boolean(order.dispatch_tracking?.tracking_number);

                // Parent PO Stepper Progression
                let parentStep = 1;
                if (isDelivered) parentStep = 5;
                else if (isDispatched) parentStep = 4;
                else if (repeatOrders.length > 0) parentStep = 3;
                else if (isTokenVerified || payStatus === "RECEIPT_SUBMITTED") parentStep = 2;

                return (
                  <div
                    key={order._id}
                    className="bg-surface rounded-3xl border border-border shadow-sm overflow-hidden transition-all hover:border-primary/40 space-y-0"
                  >
                    {/* ── Parent PO Top Header ── */}
                    <div className="p-5 sm:p-6 border-b border-border bg-surface-hover/30 flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono font-black text-base text-text-primary dark:text-white">
                            PO: {order.po_number}
                          </span>
                          <button
                            onClick={() => handleCopy(order.po_number, `po-${order._id}`)}
                            className="p-1 text-text-muted hover:text-text-primary rounded"
                            title="Copy PO Number"
                          >
                            {copiedKey === `po-${order._id}` ? <FaCheck className="text-emerald-500 text-xs" /> : <FaCopy className="text-xs" />}
                          </button>
                          <span className="text-xs text-text-muted">
                            • {new Date(order.created_at || order.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                          </span>
                          {isTokenVerified && (
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                              <FaCheckCircle size={10} /> TOKEN PAID & PO STARTED
                            </span>
                          )}
                          {(order.payment_utr || epcAlloc.payment_utr) && (
                            <span className="text-[11px] font-mono font-bold text-text-secondary bg-surface px-2 py-0.5 rounded-md border border-border">
                              UTR: {order.payment_utr || epcAlloc.payment_utr}
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-text-secondary">
                          Franchise Partner: <strong className="text-text-primary">{order.franchisee_id?.business_name || "Franchise Partner"}</strong>
                          {order.franchisee_id?.mobile && ` (${order.franchisee_id.mobile})`}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <span className="px-3 py-1 rounded-full text-xs font-black bg-indigo-50 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                          PO Status: {order.status}
                        </span>
                      </div>
                    </div>

                    {/* ── Allocation & Token Details Summary Bar ── */}
                    <div className="p-5 sm:p-6 border-b border-border bg-surface grid grid-cols-1 lg:grid-cols-12 gap-5">
                      <div className="lg:col-span-6 space-y-3">
                        <span className="text-[10px] font-black tracking-wider uppercase text-text-muted block">
                          Allocation & Token Details
                        </span>
                        <div className="grid grid-cols-2 gap-3 text-xs">
                          <div>
                            <span className="text-text-secondary block">Allocated Quantity:</span>
                            <span className="text-text-primary font-bold font-mono text-sm">{allocQty} Kits</span>
                          </div>
                          <div>
                            <span className="text-text-secondary block">Remaining Quota:</span>
                            <span className="text-primary font-bold font-mono text-sm">{remainingQty} Kits</span>
                          </div>
                        </div>
                        <div className="flex items-center justify-between p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/40 text-xs">
                          <span className="text-emerald-800 dark:text-emerald-300 font-bold flex items-center gap-1.5">
                            🔒 Guaranteed Locked Price:
                          </span>
                          <span className="font-mono font-black text-emerald-700 dark:text-emerald-300 text-sm">
                            ₹{unitRate > 0 ? unitRate.toLocaleString("en-IN") : "78,399"}/kit
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-xs pt-1 text-text-secondary">
                          <span>Total Landed Amount: <strong className="text-text-primary font-mono font-bold">₹{totalLanded > 0 ? totalLanded.toLocaleString("en-IN") : "1,64,63,790"}</strong></span>
                          <span>One-Time Token: <strong className="text-emerald-600 font-mono font-bold">₹{tokenDeposit > 0 ? tokenDeposit.toLocaleString("en-IN") : "80,000"} ({isTokenVerified ? "Paid ✓" : "Pending"})</strong></span>
                        </div>
                      </div>

                      <div className="lg:col-span-6 flex flex-col justify-between p-4 rounded-2xl bg-surface-hover/50 border border-border space-y-3">
                        <div>
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="text-xs font-black text-text-primary dark:text-white flex items-center gap-1.5">
                              <FaBolt className="text-amber-500" /> Rate Lock & Quota Active
                            </span>
                            <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                              {isTokenVerified ? "Token Deposit Verified ✓" : "Token Under Review"}
                            </span>
                          </div>
                          <p className="text-[11px] text-text-secondary">
                            Your price lock is guaranteed. Draw repeat kit orders anytime using the <strong>"+ Reorder Kits"</strong> button in PO Orders.
                          </p>
                        </div>
                        <div className="space-y-1.5 pt-2 border-t border-border/80">
                          <div className="flex justify-between text-xs font-bold">
                            <span className="text-emerald-600 dark:text-emerald-400">Fulfilled: {fulfilledQty} Kits</span>
                            <span className="text-text-primary dark:text-white">Remaining: {remainingQty} Kits</span>
                          </div>
                          <div className="w-full h-2 bg-surface rounded-full overflow-hidden border border-border">
                            <div
                              className="h-full bg-emerald-500 transition-all duration-500 rounded-full"
                              style={{ width: `${Math.min(100, (fulfilledQty / Math.max(1, allocQty)) * 100)}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* ── Parent PO Journey Stepper ── */}
                    <div className="p-5 sm:p-6 border-b border-border bg-surface-hover/10">
                      <div className="relative flex justify-between items-center max-w-3xl mx-auto">
                        <div className="absolute top-1/2 left-0 right-0 -translate-y-1/2 h-1 bg-border -z-0" />
                        <div
                          className="absolute top-1/2 left-0 -translate-y-1/2 h-1 bg-primary transition-all duration-500 -z-0"
                          style={{ width: `${((parentStep - 1) / 4) * 100}%` }}
                        />

                        {[
                          { title: "Allocated", desc: `${allocQty} Kits Assigned` },
                          { title: "Token Paid", desc: isTokenVerified ? "Verified ✓" : "Token Pending" },
                          { title: "Quota Active", desc: `${fulfilledQty} Kits Drawn` },
                          { title: "In Transit", desc: isDispatched ? "Consignments Moving" : "Warehouse Queue" },
                          { title: "Quota Fulfilled", desc: isDelivered ? "Completed 🎉" : `${remainingQty} Left` },
                        ].map((s, idx) => {
                          const num = idx + 1;
                          const isDone = num <= parentStep;
                          return (
                            <div key={idx} className="flex flex-col items-center gap-1.5 relative z-10 bg-surface px-1">
                              <div
                                className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-black transition-all ${isDone
                                  ? "bg-primary text-white shadow-md shadow-primary/20 scale-105"
                                  : "bg-surface-hover text-text-muted border border-border"
                                  }`}
                              >
                                {isDone ? "✓" : num}
                              </div>
                              <span className={`text-[11px] font-black ${isDone ? "text-text-primary dark:text-white" : "text-text-muted"}`}>
                                {s.title}
                              </span>
                              <span className="text-[9px] text-text-muted text-center hidden sm:block">
                                {s.desc}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* ── Token Upload Fallback (If not paid) ── */}
                    {!isTokenVerified && payStatus === "PENDING" && (
                      <div className="p-5 border-b border-border bg-amber-500/5">
                        <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 space-y-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2 text-amber-700 dark:text-amber-300 font-black text-xs">
                              <FaExclamationTriangle size={15} />
                              <span>Token Deposit Payment Required to Activate Rate Lock</span>
                            </div>
                            <span className="px-2.5 py-1 rounded-full text-[10px] font-black bg-amber-500/20 text-amber-800 dark:text-amber-200">
                              Payment Pending
                            </span>
                          </div>

                          {selectedPoForUpload === order._id ? (
                            <div className="space-y-3 pt-2">
                              <input
                                type="file"
                                accept="image/*,.pdf"
                                onChange={(e) => setPoReceiptFile(e.target.files[0])}
                                className="block w-full text-xs text-text-secondary file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-primary/10 file:text-primary hover:file:bg-primary/20"
                              />
                              {poUploadMsg && (
                                <p className="text-red-500 text-xs font-bold">{poUploadMsg}</p>
                              )}
                              <div className="flex gap-2">
                                <button
                                  disabled={poUploading}
                                  onClick={() => handlePoReceiptUpload(order._id)}
                                  className="px-4 py-2 rounded-xl bg-primary text-white font-bold text-xs hover:opacity-90 disabled:opacity-50 cursor-pointer"
                                >
                                  {poUploading ? "Uploading..." : "Submit Receipt for Verification"}
                                </button>
                                <button
                                  onClick={() => { setSelectedPoForUpload(null); setPoReceiptFile(null); setPoUploadMsg(""); }}
                                  className="px-4 py-2 rounded-xl bg-surface border border-border text-text-secondary font-bold text-xs hover:bg-surface-hover cursor-pointer"
                                >
                                  Cancel
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div className="flex items-center justify-between pt-1">
                              <p className="text-xs text-text-secondary">
                                Deposit ₹{tokenDeposit.toLocaleString("en-IN")} token payment into the Franchisee bank account and upload proof.
                              </p>
                              <button
                                onClick={() => setSelectedPoForUpload(order._id)}
                                className="px-4 py-2 rounded-xl bg-primary text-white font-black text-xs hover:opacity-90 cursor-pointer shadow-xs inline-flex items-center gap-1.5 shrink-0"
                              >
                                <FaUpload size={12} /> Upload Receipt
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* ══════════════════════════════════════════════════════════════ */}
                    {/* ── EPC PLACED ORDERS & DRAWDOWNS LIVE TRACKING SECTION ───── */}
                    {/* ══════════════════════════════════════════════════════════════ */}
                    <div className="p-5 sm:p-6 bg-surface space-y-5">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border pb-3">
                        <div className="flex items-center gap-2.5">
                          <div className="p-2 rounded-xl bg-primary/10 text-primary">
                            <FaLayerGroup size={16} />
                          </div>
                          <div>
                            <h3 className="font-black text-sm text-text-primary dark:text-white flex items-center gap-2">
                              Reorders & Drawdowns Placed Under PO: <span className="font-mono text-primary">{order.po_number}</span>
                            </h3>
                            <p className="text-[11px] text-text-secondary">
                              Real-time live status and dispatch tracking for all kit orders drawn against this PO quota.
                            </p>
                          </div>
                        </div>

                        <span className="px-3 py-1 rounded-full text-xs font-black bg-primary/10 text-primary border border-primary/20 self-start sm:self-center">
                          {repeatOrders.length} Order{repeatOrders.length === 1 ? "" : "s"} Placed
                        </span>
                      </div>

                      {repeatOrders.length === 0 ? (
                        <div className="p-6 rounded-2xl bg-surface-hover/40 border border-dashed border-border text-center space-y-2">
                          <FaBoxes className="mx-auto text-text-muted text-2xl" />
                          <p className="text-xs font-bold text-text-primary dark:text-white">
                            No repeat orders placed against this PO yet
                          </p>
                          <p className="text-[11px] text-text-muted max-w-md mx-auto">
                            You have <strong className="text-primary">{remainingQty} Kits</strong> remaining in your guaranteed price lock quota. Place repeat kit orders anytime from the PO Orders screen.
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-6">
                          {repeatOrders.map((child, cIdx) => {
                            const childItem = child.items?.[0] || item || {};
                            const childQty = child.items?.[0]?.quantity || child.total_quantity || 1;
                            const childTokenAdj = Math.round((child.token_adjusted_paise || 0) / 100);
                            const childTotalPayable = Math.round((child.net_payable_paise || child.grand_total_paise || 0) / 100);
                            const childRate = Math.round((childItem.unit_price_paise || 0) / 100) || unitRate;
                            const childBaseAmt = (childRate * childQty);
                            const childGstPct = childItem.gst_rate || 5;
                            const childGstAmt = Math.round((childBaseAmt * childGstPct) / 100);

                            // Milestone Breakdown & Verification Status
                            const childMilestones = child.payment_milestones?.milestones || [];
                            const m1 = childMilestones.find(m => m.milestone_number === 1);
                            const m2 = childMilestones.find(m => m.milestone_number === 2);
                            const childAdvPct = child.payment_milestones?.advance_percentage || m1?.percentage || 30;
                            const childRemPct = child.payment_milestones?.remaining_percentage || m2?.percentage || (100 - childAdvPct);
                            const m1Amount = child.payment_milestones?.advance_amount || Math.round(childTotalPayable * (childAdvPct / 100));
                            const m2Amount = child.payment_milestones?.remaining_amount || Math.max(0, childTotalPayable - m1Amount);

                            const m1Utr = m1?.utr_number || child.payment_utr || child.offline_payment?.utr_number || "—";
                            const m2Utr = m2?.utr_number || child.offline_payment_m2?.utr_number;

                            // Status & Progression
                            const isChildDelivered = ["DELIVERED", "COMPLETED"].includes(child.status);
                            const isChildDispatched = ["DISPATCHED", "IN_TRANSIT", "REACHED_DESTINATION", "DELIVERED", "COMPLETED"].includes(child.status) || Boolean(child.dispatch_tracking?.tracking_number || child.dispatch_tracking?.dispatched_at);
                            const isChildStockAllocated = ["STOCK_ALLOCATED", "PROCESSING", "VEHICLE_ASSIGNED", "READY_FOR_DISPATCH", "DISPATCHED", "IN_TRANSIT", "REACHED_DESTINATION", "DELIVERED", "COMPLETED"].includes(child.status);

                            const isM1Verified = ["PAID", "CONFIRMED", "ADVANCE_PAID", "STOCK_ALLOCATED", "PROCESSING", "VEHICLE_ASSIGNED", "READY_FOR_DISPATCH", "DISPATCHED", "IN_TRANSIT", "REACHED_DESTINATION", "DELIVERED", "COMPLETED"].includes(child.status) ||
                              m1?.payment_status === "approved" ||
                              m1?.payment_status === "verified" ||
                              child.payment_status === "advance_paid" ||
                              child.payment_status === "paid" ||
                              child.offline_payment?.verification_status === "approved" ||
                              child.payment_milestones?.milestone_verification_status === "advance_verified" ||
                              child.payment_milestones?.milestone_verification_status === "fully_paid";

                            const isM1Pending = !isM1Verified && (
                              child.status === "SUBMITTED" ||
                              m1?.payment_status === "pending_verification" ||
                              child.offline_payment?.verification_status === "pending" ||
                              Boolean(child.payment_utr || child.offline_payment?.utr_number)
                            );

                            const isM2Verified = child.status === "PAID" ||
                              m2?.payment_status === "approved" ||
                              m2?.payment_status === "verified" ||
                              child.payment_status === "paid" ||
                              child.payment_milestones?.milestone_verification_status === "fully_paid";

                            const isM2Pending = !isM2Verified && (
                              m2?.payment_status === "pending_verification" ||
                              child.milestone_verification_status === "final_payment_pending_verification" ||
                              child.payment_milestones?.milestone_verification_status === "final_payment_pending_verification" ||
                              child.status === "FINAL_PAYMENT_SUBMITTED" ||
                              Boolean(m2?.utr_number || child.offline_payment_m2?.utr_number)
                            );

                            const isM2Due = isM1Verified && !isM2Verified && !isM2Pending && !isChildDelivered;

                            let childStep = 1;
                            if (isChildDelivered) childStep = 5;
                            else if (isChildDispatched) childStep = 4;
                            else if (isChildStockAllocated) childStep = 3;
                            else if (isM2Verified || isM1Verified || isM1Pending) childStep = 2;

                            const hasLogistics = isChildDispatched || child.dispatch_tracking?.courier_name || child.dispatch_tracking?.tracking_number || child.assigned_vehicle?.driver_name || child.assigned_vehicle?.vehicle_name;

                            return (
                              <div
                                key={child._id || cIdx}
                                className="bg-surface rounded-2xl border border-border/90 shadow-2xs overflow-hidden transition-all hover:border-primary/50"
                              >
                                {/* Child Order Top Header */}
                                <div className="p-4 sm:p-5 border-b border-border bg-surface-hover/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                  <div className="space-y-1">
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <span className="font-mono font-black text-sm text-text-primary dark:text-white">
                                        {child.po_number || `ORD-R${cIdx + 1}`}
                                      </span>
                                      <button
                                        onClick={() => handleCopy(child.po_number, `ch-${child._id || cIdx}`)}
                                        className="p-1 text-text-muted hover:text-text-primary rounded"
                                        title="Copy Order #"
                                      >
                                        {copiedKey === `ch-${child._id || cIdx}` ? <FaCheck className="text-emerald-500 text-xs" /> : <FaCopy className="text-xs" />}
                                      </button>
                                      <span className="text-xs text-text-muted">
                                        • {new Date(child.created_at || child.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                                      </span>
                                      <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-primary/10 text-primary border border-primary/20">
                                        Drawdown from {order.po_number}
                                      </span>
                                    </div>
                                    <div className="text-xs text-text-secondary flex items-center gap-2 flex-wrap">
                                      <span>Quantity Drawn: <strong className="text-text-primary font-mono">{childQty} Kits</strong></span>
                                      <span>•</span>
                                      <span>Total: <strong className="text-text-primary font-mono font-bold">₹{childTotalPayable.toLocaleString("en-IN")}</strong></span>
                                      <span>•</span>
                                      {isM2Verified ? (
                                        <span className="inline-flex items-center gap-1 font-bold text-emerald-600 dark:text-emerald-400">
                                          <FaCheckCircle size={10} /> Fully Paid (100%)
                                        </span>
                                      ) : isM1Verified ? (
                                        <span className="inline-flex items-center gap-1 font-bold text-blue-600 dark:text-blue-400">
                                          <FaCheckCircle size={10} /> Advance Paid ({childAdvPct}%) • Balance ₹{Number(m2Amount).toLocaleString("en-IN")} Due
                                        </span>
                                      ) : isM1Pending ? (
                                        <span className="inline-flex items-center gap-1 font-bold text-amber-600 dark:text-amber-400">
                                          <FaRegClock size={10} /> Advance In Review (₹{Number(m1Amount).toLocaleString("en-IN")})
                                        </span>
                                      ) : (
                                        <span className="text-text-muted">Payment Pending</span>
                                      )}
                                    </div>
                                  </div>

                                  <div className="flex items-center gap-2">
                                    <span
                                      className={`px-3 py-1 rounded-full text-xs font-black border ${isChildDelivered
                                        ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30"
                                        : isChildDispatched
                                          ? "bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-500/30"
                                          : isChildPaid
                                            ? "bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/30"
                                            : child.status === "DRAFT"
                                              ? "bg-gray-500/10 text-gray-700 dark:text-gray-300 border-gray-500/30"
                                              : "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30"
                                        }`}
                                    >
                                      {child.status}
                                    </span>
                                  </div>
                                </div>

                                {/* Child Order Live Journey Stepper */}
                                <div className="p-5 border-b border-border bg-surface">
                                  <div className="relative flex justify-between items-center max-w-2xl mx-auto">
                                    <div className="absolute top-1/2 left-0 right-0 -translate-y-1/2 h-1 bg-border -z-0" />
                                    <div
                                      className="absolute top-1/2 left-0 -translate-y-1/2 h-1 bg-primary transition-all duration-500 -z-0"
                                      style={{ width: `${((childStep - 1) / 4) * 100}%` }}
                                    />

                                    {[
                                      { title: "Order Placed", desc: `${childQty} Kits Drawn` },
                                      { title: "Payment", desc: isM2Verified ? "Fully Paid ✓" : isM1Verified ? "Advance 30% ✓" : isM1Pending ? "In Review ⏳" : "Pending UTR" },
                                      { title: "Stock Allocation", desc: isChildStockAllocated ? "Kits Booked ✓" : "Queue" },
                                      { title: "In Transit", desc: isChildDispatched ? "On Route 🚚" : "Warehouse" },
                                      { title: "Delivered", desc: isChildDelivered ? "Delivered 🎉" : "Destination" },
                                    ].map((s, idx) => {
                                      const num = idx + 1;
                                      const isDone = num <= childStep;
                                      return (
                                        <div key={idx} className="flex flex-col items-center gap-1.5 relative z-10 bg-surface px-1">
                                          <div
                                            className={`w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-black transition-all ${isDone
                                              ? "bg-primary text-white shadow-md shadow-primary/20 scale-105"
                                              : "bg-surface-hover text-text-muted border border-border"
                                              }`}
                                          >
                                            {isDone ? "✓" : num}
                                          </div>
                                          <span className={`text-[10px] font-black ${isDone ? "text-text-primary dark:text-white" : "text-text-muted"}`}>
                                            {s.title}
                                          </span>
                                          <span className="text-[9px] text-text-muted text-center hidden sm:block">
                                            {s.desc}
                                          </span>
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>

                                {/* Real-time Live Dispatch & Logistics Card */}
                                {hasLogistics && (
                                  <div className="p-4 sm:p-5 border-b border-border bg-purple-500/5">
                                    <div className="p-4 rounded-2xl bg-surface border border-purple-500/30 space-y-3">
                                      <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2 text-purple-700 dark:text-purple-300 font-black text-xs">
                                          <FaTruck size={15} />
                                          <span>Live Dispatch & Logistics Tracking</span>
                                        </div>
                                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-purple-500/20 text-purple-800 dark:text-purple-200">
                                          {isChildDelivered ? "Delivered" : "In Transit"}
                                        </span>
                                      </div>

                                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                                        <div className="space-y-1.5 p-3 rounded-xl bg-surface-hover/70 border border-border">
                                          <div className="flex justify-between">
                                            <span className="text-text-secondary">Courier / Transporter:</span>
                                            <strong className="text-text-primary">{child.dispatch_tracking?.courier_name || "Express Logistics Fleet"}</strong>
                                          </div>
                                          {child.dispatch_tracking?.tracking_number && (
                                            <div className="flex justify-between items-center">
                                              <span className="text-text-secondary">Waybill / LR Number:</span>
                                              <span className="font-mono font-bold text-primary select-all">
                                                {child.dispatch_tracking.tracking_number}
                                              </span>
                                            </div>
                                          )}
                                          {child.dispatch_tracking?.dispatched_at && (
                                            <div className="flex justify-between">
                                              <span className="text-text-secondary">Dispatched At:</span>
                                              <span className="text-text-muted">
                                                {new Date(child.dispatch_tracking.dispatched_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                                              </span>
                                            </div>
                                          )}
                                          {child.dispatch_tracking?.estimated_delivery && (
                                            <div className="flex justify-between">
                                              <span className="text-text-secondary">Estimated Delivery:</span>
                                              <span className="text-emerald-600 font-bold">
                                                {String(child.dispatch_tracking.estimated_delivery)}
                                              </span>
                                            </div>
                                          )}
                                          {child.dispatch_tracking?.tracking_url && (
                                            <div className="pt-1.5 border-t border-border">
                                              <a
                                                href={child.dispatch_tracking.tracking_url}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-primary text-white hover:opacity-90 transition-opacity cursor-pointer"
                                              >
                                                <FaExternalLinkAlt size={10} /> Track Consignment Live
                                              </a>
                                            </div>
                                          )}
                                        </div>

                                        <div className="space-y-1.5 p-3 rounded-xl bg-surface-hover/70 border border-border">
                                          {(child.assigned_vehicle?.driver_name || child.assigned_vehicle?.vehicle_name) ? (
                                            <>
                                              <div className="flex justify-between">
                                                <span className="text-text-secondary">Assigned Vehicle:</span>
                                                <strong className="text-text-primary">
                                                  {child.assigned_vehicle.vehicle_name || "Delivery Vehicle"} ({child.assigned_vehicle.registration_number || "Verified"})
                                                </strong>
                                              </div>
                                              <div className="flex justify-between items-center">
                                                <span className="text-text-secondary">Driver:</span>
                                                <span className="font-bold text-text-primary">
                                                  {child.assigned_vehicle.driver_name || "Assigned Driver"}
                                                </span>
                                              </div>
                                              {child.assigned_vehicle.driver_contact && (
                                                <div className="flex justify-between items-center pt-1">
                                                  <span className="text-text-secondary">Driver Phone:</span>
                                                  <a
                                                    href={`tel:${child.assigned_vehicle.driver_contact}`}
                                                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-bold bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/20"
                                                  >
                                                    <FaPhone size={10} /> {child.assigned_vehicle.driver_contact}
                                                  </a>
                                                </div>
                                              )}
                                            </>
                                          ) : (
                                            <div>
                                              <span className="text-text-secondary block font-bold text-[11px]">
                                                {child.delivery_address?.line ? `Site Delivery Address (${child.fulfillment_mode === "warehouse_pickup" ? "EPC Depot" : "Direct Installation Site"}):` : "Destination Delivery Address:"}
                                              </span>
                                              <p className="text-text-primary font-semibold text-xs mt-0.5">
                                                {child.delivery_address?.line ? (
                                                  `${child.delivery_address.line}, ${child.delivery_address.district_name || ""}, ${child.delivery_address.state_name || ""} - ${child.delivery_address.pincode || ""}`
                                                ) : (
                                                  `${child.destination_address || order.destination_address || "Client Project Destination"}${child.destination_pincode ? ` - ${child.destination_pincode}` : ""}`
                                                )}
                                              </p>
                                              {child.delivery_address?.contact_person && (
                                                <span className="text-[11px] text-text-muted mt-0.5 block">
                                                  Contact: {child.delivery_address.contact_person} ({child.delivery_address.contact_phone || ""})
                                                </span>
                                              )}
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                )}

                                {/* Child Card Body: Kit Details & Commercial Breakdown */}
                                <div className="p-5 space-y-4 text-xs">
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                      <span className="font-bold text-text-secondary block">Drawn Kit Package:</span>
                                      <div className="bg-surface-hover/70 p-3.5 rounded-2xl border border-border flex gap-3.5 items-start">
                                        <div className="relative w-14 h-14 shrink-0 rounded-xl overflow-hidden border border-border bg-surface flex items-center justify-center">
                                          {(childItem.image || childItem.kit_image) ? (
                                            <img
                                              src={childItem.image || childItem.kit_image}
                                              alt={childItem.item_name}
                                              className="w-full h-full object-cover rounded-xl"
                                              onError={(e) => {
                                                e.currentTarget.style.display = "none";
                                                if (e.currentTarget.nextSibling) e.currentTarget.nextSibling.style.display = "flex";
                                              }}
                                            />
                                          ) : null}
                                          <div
                                            className="w-full h-full flex items-center justify-center bg-primary/5 text-primary"
                                            style={{ display: (childItem.image || childItem.kit_image) ? "none" : "flex" }}
                                          >
                                            <FaBoxOpen size={20} />
                                          </div>
                                        </div>
                                        <div className="flex-1 min-w-0 space-y-1">
                                          <p className="font-black text-sm text-text-primary dark:text-white leading-snug line-clamp-2">
                                            {childItem.item_name || item.item_name || "3 KW Solarkits DCR Combokit"}
                                          </p>
                                          <div className="flex justify-between text-text-secondary text-[11px] pt-0.5">
                                            <span>Quantity Drawn:</span>
                                            <strong className="text-text-primary font-mono font-bold bg-primary/10 px-1.5 py-0.2 rounded text-primary">
                                              {childQty} Kit(s)
                                            </strong>
                                          </div>
                                          <div className="flex justify-between text-text-secondary text-[11px]">
                                            <span>Locked Rate per Kit:</span>
                                            <span className="font-mono font-bold text-text-primary">₹{childRate.toLocaleString("en-IN")}</span>
                                          </div>
                                        </div>
                                      </div>
                                    </div>

                                    <div className="space-y-2">
                                      <span className="font-bold text-text-secondary block">Payment & Commercial Breakdown:</span>
                                      <div className="bg-surface-hover p-4 rounded-2xl border border-border space-y-1.5">
                                        <div className="flex justify-between text-text-secondary">
                                          <span>Base Amount ({childQty} kits):</span>
                                          <span className="font-mono">₹{childBaseAmt.toLocaleString("en-IN")}</span>
                                        </div>
                                        <div className="flex justify-between text-text-secondary">
                                          <span>GST ({childGstPct}%):</span>
                                          <span className="font-mono">₹{childGstAmt.toLocaleString("en-IN")}</span>
                                        </div>
                                        {childTokenAdj > 0 && (
                                          <div className="flex justify-between text-emerald-600 dark:text-emerald-400 font-bold">
                                            <span>Token Adjusted Pro-Rata:</span>
                                            <span className="font-mono">-₹{childTokenAdj.toLocaleString("en-IN")}</span>
                                          </div>
                                        )}
                                        <div className="flex justify-between text-text-primary font-black text-sm pt-2 border-t border-border">
                                          <span>Total Order Value:</span>
                                          <span className="text-primary font-mono text-base">₹{childTotalPayable.toLocaleString("en-IN")}</span>
                                        </div>
                                      </div>
                                    </div>
                                  </div>

                                  {/* ── Product Payment Milestone Stepper & Pay Milestone 2 Action ── */}
                                  <div className="space-y-3 pt-2">
                                    <div className="flex items-center justify-between">
                                      <span className="font-black text-xs uppercase tracking-wider text-text-primary flex items-center gap-1.5">
                                        <FaLayerGroup className="text-primary" /> Product Payment Milestone Schedule
                                      </span>
                                      {isM2Verified ? (
                                        <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-300">
                                          <FaCheckCircle size={11} /> 100% Fully Cleared
                                        </span>
                                      ) : isM1Verified ? (
                                        <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-blue-500/15 text-blue-700 dark:text-blue-300">
                                          <FaInfoCircle size={11} /> Milestone 1 Cleared • Final Due Before Dispatch
                                        </span>
                                      ) : (
                                        <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-amber-500/15 text-amber-700 dark:text-amber-300">
                                          <FaRegClock size={11} /> Milestone 1 In Review
                                        </span>
                                      )}
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                      {/* Milestone 1: Advance Payment (30%) */}
                                      <div className={`p-3.5 rounded-2xl border transition-all ${isM1Verified ? "bg-emerald-500/5 border-emerald-500/30" : "bg-amber-500/5 border-amber-500/30"
                                        }`}>
                                        <div className="flex items-center justify-between mb-1">
                                          <span className="text-[11px] font-black uppercase tracking-wider text-amber-700 dark:text-amber-300">
                                            Milestone 1 — Advance ({childAdvPct}%)
                                          </span>
                                          <span className="font-black text-sm text-text-primary dark:text-white">
                                            ₹{Number(m1Amount).toLocaleString("en-IN")}
                                          </span>
                                        </div>
                                        <p className="text-[10px] text-text-secondary leading-tight mt-0.5">
                                          Order confirmed & supplier procurement initiated upon verification.
                                        </p>
                                        <div className="flex items-center justify-between mt-2 text-xs">
                                          <span className="text-[11px] text-text-secondary font-mono">UTR: {m1Utr}</span>
                                          {isM1Verified ? (
                                            <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-300">
                                              <FaCheckCircle size={10} /> Advance Paid & Cleared
                                            </span>
                                          ) : (
                                            <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-700 dark:text-amber-300">
                                              <FaRegClock size={10} /> Accounts Reviewing
                                            </span>
                                          )}
                                        </div>
                                      </div>

                                      {/* Milestone 2: Remaining Balance (70%) */}
                                      <div className={`p-3.5 rounded-2xl border transition-all flex flex-col justify-between ${isM2Verified ? "bg-emerald-500/5 border-emerald-500/30" : isM2Pending ? "bg-blue-500/5 border-blue-500/30" : "bg-purple-500/5 border-purple-500/30"
                                        }`}>
                                        <div>
                                          <div className="flex items-center justify-between mb-1">
                                            <span className="text-[11px] font-black uppercase tracking-wider text-purple-700 dark:text-purple-300">
                                              Milestone 2 — Before Dispatch ({childRemPct}%)
                                            </span>
                                            <span className="font-black text-sm text-text-primary dark:text-white">
                                              ₹{Number(m2Amount).toLocaleString("en-IN")}
                                            </span>
                                          </div>
                                          <p className="text-[10px] text-text-secondary leading-tight mt-0.5">
                                            Required before materials are released from warehouse for courier transit.
                                          </p>
                                        </div>

                                        <div className="flex items-center justify-between mt-2 text-xs">
                                          {isM2Verified ? (
                                            <>
                                              <span className="text-[11px] text-text-secondary font-mono">{m2Utr ? `UTR: ${m2Utr}` : "Fully Cleared"}</span>
                                              <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-300">
                                                <FaCheckCircle size={10} /> Fully Paid & Cleared
                                              </span>
                                            </>
                                          ) : isM2Pending ? (
                                            <>
                                              <span className="text-[11px] text-text-secondary font-mono">{m2Utr ? `UTR: ${m2Utr}` : "Payment Submitted"}</span>
                                              <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-500/15 text-blue-700 dark:text-blue-300">
                                                <FaRegClock size={10} /> Accounts Reviewing
                                              </span>
                                            </>
                                          ) : (
                                            <div className="flex items-center justify-between w-full pt-1">
                                              <span className="text-[10px] font-bold text-amber-700 dark:text-amber-400">
                                                ● Balance Due Before Dispatch
                                              </span>
                                              <button
                                                type="button"
                                                onClick={() => handleOpenMilestonePay(child)}
                                                className="px-3.5 py-1.5 bg-primary hover:bg-primary/90 text-white rounded-lg text-xs font-black shadow-sm flex items-center gap-1.5 transition-all cursor-pointer"
                                              >
                                                <span>Pay {childRemPct}% Balance (₹{Number(m2Amount).toLocaleString("en-IN")})</span>
                                              </button>
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                  </div>

                                  {/* Payment Proof / Resubmit Footer */}
                                  <div className="pt-2 flex flex-wrap items-center justify-between gap-2 border-t border-border/60">
                                    <div className="flex items-center gap-3 flex-wrap">
                                      <div className="flex items-center gap-1.5 text-xs">
                                        <span className="text-text-secondary">M1 UTR:</span>
                                        <span className="font-mono font-bold text-text-primary select-all bg-surface px-2 py-0.5 rounded border border-border">
                                          {m1Utr}
                                        </span>
                                      </div>
                                      {m2Utr && (
                                        <div className="flex items-center gap-1.5 text-xs">
                                          <span className="text-text-secondary">M2 UTR:</span>
                                          <span className="font-mono font-bold text-text-primary select-all bg-surface px-2 py-0.5 rounded border border-border">
                                            {m2Utr}
                                          </span>
                                        </div>
                                      )}
                                    </div>

                                    <div className="flex items-center gap-2">
                                      {(child.payment_receipt_url || child.offline_payment?.receipt_url) && (
                                        <a
                                          href={
                                            (child.payment_receipt_url || child.offline_payment?.receipt_url).startsWith("http")
                                              ? (child.payment_receipt_url || child.offline_payment?.receipt_url)
                                              : `${(import.meta.env.VITE_API_URL || "http://localhost:5000/api").replace(/\/api\/?$/, "")}${(child.payment_receipt_url || child.offline_payment?.receipt_url).startsWith("/") ? "" : "/"}${child.payment_receipt_url || child.offline_payment?.receipt_url}`
                                          }
                                          target="_blank"
                                          rel="noreferrer"
                                          className="px-3 py-1.5 rounded-xl text-xs font-bold bg-surface border border-border text-primary hover:bg-surface-hover inline-flex items-center gap-1 cursor-pointer"
                                        >
                                          <FaEye size={12} /> View M1 Receipt
                                        </a>
                                      )}

                                      {(child.offline_payment_m2?.receipt_url || m2?.receipt_url) && (
                                        <a
                                          href={
                                            (child.offline_payment_m2?.receipt_url || m2?.receipt_url).startsWith("http")
                                              ? (child.offline_payment_m2?.receipt_url || m2?.receipt_url)
                                              : `${(import.meta.env.VITE_API_URL || "http://localhost:5000/api").replace(/\/api\/?$/, "")}${(child.offline_payment_m2?.receipt_url || m2?.receipt_url).startsWith("/") ? "" : "/"}${child.offline_payment_m2?.receipt_url || m2?.receipt_url}`
                                          }
                                          target="_blank"
                                          rel="noreferrer"
                                          className="px-3 py-1.5 rounded-xl text-xs font-bold bg-purple-500/10 border border-purple-500/30 text-purple-700 dark:text-purple-300 hover:bg-purple-500/20 inline-flex items-center gap-1 cursor-pointer"
                                        >
                                          <FaEye size={12} /> View M2 Receipt
                                        </a>
                                      )}

                                      {child.status === "DRAFT" && (
                                        <button
                                          onClick={() => navigate(`/po-orders`)}
                                          className="px-3 py-1.5 rounded-xl text-xs font-bold bg-primary text-white hover:opacity-90 inline-flex items-center gap-1 cursor-pointer"
                                        >
                                          Complete Payment in PO Orders ↗
                                        </button>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── Re-submit Payment Proof Modal ────────────────────────────────────── */}
      {resubmittingOrder && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-surface rounded-3xl border border-border shadow-2xl max-w-lg w-full p-6 space-y-5 animate-in fade-in zoom-in-95">
            <div className="flex justify-between items-center border-b border-border pb-3">
              <div>
                <h3 className="text-lg font-black text-text-primary dark:text-white">
                  Re-submit Payment Proof & UTR
                </h3>
                <p className="text-xs text-text-secondary mt-0.5">
                  Order #{resubmittingOrder.order_number}
                </p>
              </div>
              <button onClick={() => setResubmittingOrder(null)} className="text-text-secondary hover:text-text-primary p-1">
                <FaTimes size={18} />
              </button>
            </div>

            <form onSubmit={handleConfirmResubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-text-primary dark:text-white mb-1">
                  Correct UTR / Transaction Ref No. <span className="text-red-500">*</span>
                </label>
                <CustomInput
                  value={newUtr}
                  onChange={(e) => setNewUtr(e.target.value.toUpperCase())}
                  required
                  placeholder="e.g. HDFC0001928374"
                  className="font-mono uppercase font-bold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-bold text-text-primary dark:text-white">
                      Amount Paid (₹) <span className="text-red-500">*</span>
                    </label>
                    <span className="text-[10px] text-text-muted font-bold flex items-center gap-1">
                      🔒 Fixed Amount
                    </span>
                  </div>
                  <CustomInput
                    type="number"
                    value={newAmount}
                    readOnly
                    className="font-bold font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-text-primary dark:text-white mb-1">
                    Payment Date
                  </label>
                  <CustomInput
                    type="date"
                    value={newDate}
                    onChange={(e) => setNewDate(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-text-primary dark:text-white mb-1">
                  Upload Fresh Receipt / Screenshot
                </label>
                <div className="border-2 border-dashed border-border rounded-xl p-4 text-center cursor-pointer relative bg-surface-hover">
                  <input
                    type="file"
                    accept="image/*,application/pdf"
                    onChange={handleResubmitFileChange}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                  {newReceiptPreview ? (
                    <img src={newReceiptPreview} alt="Preview" className="max-h-28 mx-auto rounded object-contain" />
                  ) : (
                    <p className="text-xs text-text-secondary">
                      {newReceiptFile ? newReceiptFile.name : "Click to browse new payment screenshot"}
                    </p>
                  )}
                </div>
              </div>

              {resubmitError && (
                <div className="text-xs text-red-500 font-bold p-2 bg-red-500/10 rounded-lg">
                  {resubmitError}
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="secondary" onClick={() => setResubmittingOrder(null)}>
                  Cancel
                </Button>
                <Button type="submit" variant="primary" loading={resubmitLoading}>
                  Submit for Re-verification
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Tax Invoice View Modal ───────────────────────────────────────────── */}
      {viewingInvoice && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-surface rounded-3xl border border-border shadow-2xl max-w-2xl w-full p-6 space-y-5 animate-in fade-in zoom-in-95 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-border pb-3">
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 bg-emerald-500/15 text-emerald-600 rounded">
                  Official Tax Invoice
                </span>
                <h3 className="text-lg font-black text-text-primary dark:text-white mt-1">
                  Invoice #{viewingInvoice.invoice_number || "INV-SK-2026-001"}
                </h3>
              </div>
              <button onClick={() => setViewingInvoice(null)} className="text-text-secondary hover:text-text-primary p-1">
                <FaTimes size={18} />
              </button>
            </div>

            {invoiceLoading ? (
              <div className="py-12 text-center">
                <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
              </div>
            ) : (
              <div className="space-y-4 text-xs">
                {/* Seller & Buyer Header */}
                <div className="grid grid-cols-2 gap-4 p-4 bg-surface-hover rounded-2xl border border-border">
                  <div>
                    <span className="text-[10px] font-bold text-text-muted uppercase">Seller</span>
                    <p className="font-extrabold text-text-primary dark:text-white mt-0.5">SolarKits Technologies Pvt Ltd</p>
                    <p className="text-text-secondary">GSTIN: 27AABCS1234F1Z5</p>
                    <p className="text-text-secondary text-[11px]">Mumbai, Maharashtra</p>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-text-muted uppercase">Billed To (EPC)</span>
                    <p className="font-extrabold text-text-primary dark:text-white mt-0.5">
                      {viewingInvoice.buyer?.company_name || viewingInvoice.buyer?.name}
                    </p>
                    <p className="text-text-secondary">GSTIN: {viewingInvoice.buyer?.gstin || "N/A"}</p>
                    <p className="text-text-secondary text-[11px]">{viewingInvoice.buyer?.email}</p>
                  </div>
                </div>

                {/* Items Table */}
                <div className="border border-border rounded-xl overflow-hidden">
                  <table className="w-full text-left">
                    <thead className="bg-surface-hover border-b border-border text-[11px] font-bold text-text-secondary">
                      <tr>
                        <th className="p-2.5">Item Description</th>
                        <th className="p-2.5 text-center">Qty</th>
                        <th className="p-2.5 text-right">Taxable</th>
                        <th className="p-2.5 text-right">GST ({viewingInvoice.items?.[0]?.gst_rate || viewingInvoice.financials?.gst_rate || 13.8}%)</th>
                        <th className="p-2.5 text-right">Total (₹)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {(viewingInvoice.items || []).map((item, idx) => (
                        <tr key={idx}>
                          <td className="p-2.5 font-bold text-text-primary dark:text-white">{item.item_name}</td>
                          <td className="p-2.5 text-center">{item.quantity}</td>
                          <td className="p-2.5 text-right">₹{(item.taxable_amount || 0).toLocaleString("en-IN")}</td>
                          <td className="p-2.5 text-right">₹{(item.tax_amount || 0).toLocaleString("en-IN")}</td>
                          <td className="p-2.5 text-right font-bold">₹{(item.total_amount || 0).toLocaleString("en-IN")}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Total */}
                <div className="flex justify-between items-center p-3 bg-surface-hover rounded-xl font-bold text-sm">
                  <span>Grand Total (Incl. GST):</span>
                  <span className="text-lg font-black text-primary">
                    ₹{(viewingInvoice.financials?.grand_total || 0).toLocaleString("en-IN")}
                  </span>
                </div>

                {/* Payment Receipt Info */}
                <div className="p-3 border border-border rounded-xl flex justify-between items-center text-xs font-mono">
                  <span>UTR Reference: {viewingInvoice.payment?.utr_number}</span>
                  <span className="text-emerald-600 font-sans font-bold">Payment Verified & Settled</span>
                </div>

                <div className="flex justify-end pt-2">
                  <Button variant="secondary" onClick={() => window.print()} className="text-xs">
                    Print Invoice
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Milestone 2 (Remaining 70%) Payment Submission Modal ────────────────── */}
      {milestonePaymentModalOrder && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-surface rounded-3xl border border-border shadow-2xl max-w-lg w-full p-6 space-y-5 animate-in fade-in zoom-in-95 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-border pb-3">
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 bg-purple-500/15 text-purple-600 rounded">
                  Milestone 2 Payment Clearance
                </span>
                <h3 className="text-lg font-black text-text-primary dark:text-white mt-1">
                  Pay Remaining {modalRemPct}% Balance (Before Dispatch)
                </h3>
              </div>
              <button
                onClick={() => setMilestonePaymentModalOrder(null)}
                className="text-text-secondary hover:text-text-primary p-1 cursor-pointer"
              >
                <FaTimes size={18} />
              </button>
            </div>

            {/* Order & Bank Summary */}
            <div className="p-4 bg-purple-500/10 rounded-2xl border border-purple-500/20 text-xs space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-text-secondary">Order Reference:</span>
                <span className="font-mono font-black text-primary">
                  {milestonePaymentModalOrder.order_number || milestonePaymentModalOrder.po_number || milestonePaymentModalOrder._id}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-text-secondary">Milestone 1 Advance Status:</span>
                <span className="font-bold text-emerald-600">✓ Verified & Confirmed</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-text-secondary">First Payment Method Used:</span>
                <span className="font-bold text-primary flex items-center gap-1">
                  {firstPaymentMethodUsed === "icici" ? "⚡ ICICI eCollection (VAN)" : "🏦 Company Escrow Bank"}
                </span>
              </div>
              {milestonePaymentModalOrder.delivery_address?.district_name && (
                <div className="flex justify-between items-center">
                  <span className="text-text-secondary">Delivery Region Gateway:</span>
                  <span className="font-bold text-text-primary">
                    {milestonePaymentModalOrder.delivery_address.district_name} ({isRegionOnlineEnabled && !isRegionOfflineEnabled ? "ICICI Online Only" : !isRegionOnlineEnabled && isRegionOfflineEnabled ? "Escrow Bank Only" : "ICICI & Escrow Active"})
                  </span>
                </div>
              )}
              <div className="flex justify-between items-center text-sm font-bold border-t border-purple-500/20 pt-1.5">
                <span className="text-purple-900 dark:text-purple-200">Remaining Balance Payable:</span>
                <span className="text-base font-black text-purple-700 dark:text-purple-300">
                  ₹{Number(milestoneAmount).toLocaleString("en-IN")}
                </span>
              </div>
            </div>

            {/* Payment Gateway Mode Selector Tabs (Shown if both are available in region, or informative header if single gateway) */}
            {isRegionOnlineEnabled && isRegionOfflineEnabled ? (
              <div className="flex rounded-xl bg-surface-hover p-1 border border-border">
                <button
                  type="button"
                  onClick={() => setMilestonePaymentGateway("icici")}
                  className={`flex-1 py-2 px-3 rounded-lg text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer ${milestonePaymentGateway === "icici"
                      ? "bg-[#264baa] text-white shadow-md shadow-[#264baa]/30"
                      : "text-text-secondary hover:text-text-primary"
                    }`}
                >
                  <span>⚡ ICICI eCollection (VAN)</span>
                  {firstPaymentMethodUsed === "icici" ? (
                    <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-emerald-400/30 text-emerald-100 font-bold">1st Payment Used</span>
                  ) : (
                    <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-white/20 font-bold">Instant</span>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setMilestonePaymentGateway("offline")}
                  className={`flex-1 py-2 px-3 rounded-lg text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer ${milestonePaymentGateway === "offline"
                      ? "bg-amber-600 text-white shadow-md shadow-amber-600/30"
                      : "text-text-secondary hover:text-text-primary"
                    }`}
                >
                  <span>🏦 Company Escrow Bank</span>
                  {firstPaymentMethodUsed === "offline" ? (
                    <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-amber-200/30 text-amber-100 font-bold">1st Payment Used</span>
                  ) : (
                    <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-white/20 font-bold">Manual</span>
                  )}
                </button>
              </div>
            ) : isRegionOnlineEnabled ? (
              <div className="flex items-center justify-between p-3 rounded-xl bg-[#264baa]/10 border border-[#264baa]/30 text-xs">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#264baa] animate-pulse" />
                  <span className="font-black text-[#264baa] dark:text-blue-300">
                    Payment Gateway: ICICI Bank eCollection (Virtual Account)
                  </span>
                </div>
                <span className="text-[10px] font-extrabold bg-[#264baa] text-white px-2.5 py-0.5 rounded-md">
                  {firstPaymentMethodUsed === "icici" ? "First Payment Gateway" : "Region Active"}
                </span>
              </div>
            ) : (
              <div className="flex items-center justify-between p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-600" />
                  <span className="font-black text-amber-900 dark:text-amber-200">
                    Payment Gateway: SolarKits Company Escrow Bank Transfer
                  </span>
                </div>
                <span className="text-[10px] font-extrabold bg-amber-600 text-white px-2.5 py-0.5 rounded-md">
                  {firstPaymentMethodUsed === "offline" ? "First Payment Gateway" : "Region Active"}
                </span>
              </div>
            )}

            {/* Dynamic Payment Gateway Details Card */}
            {milestonePaymentGateway === "icici" ? (
              <div className="bg-gradient-to-br from-[#264baa]/10 via-surface to-[#264baa]/5 p-4 sm:p-5 rounded-2xl border-2 border-[#264baa]/40 shadow-sm space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#264baa]/20 pb-2.5">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
                    <span className="text-xs font-black text-[#264baa] dark:text-blue-300">
                      Official ICICI Bank eCollection Virtual Account (VAN)
                    </span>
                  </div>
                  <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-500/15 px-2.5 py-0.5 rounded-full border border-emerald-500/30">
                    Auto-Reconciled
                  </span>
                </div>

                <div className="space-y-2 text-xs">
                  <div className="bg-surface p-2.5 rounded-xl border border-border flex justify-between items-center">
                    <div>
                      <span className="text-text-muted text-[10px] block font-medium">Beneficiary Name</span>
                      <span className="font-bold text-text-primary dark:text-white">
                        {iciciVanDetails?.beneficiary_name || "SolarKits Technologies Pvt Ltd"}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleCopyModalText(iciciVanDetails?.beneficiary_name || "SolarKits Technologies Pvt Ltd", "modal_ben")}
                      className="p-1.5 text-text-secondary hover:text-[#264baa] transition-colors cursor-pointer"
                      title="Copy Beneficiary Name"
                    >
                      {copiedModalField === "modal_ben" ? <FaCheck className="text-emerald-500" size={12} /> : <FaCopy size={12} />}
                    </button>
                  </div>

                  <div className="bg-surface p-2.5 rounded-xl border border-border flex justify-between items-center">
                    <div>
                      <span className="text-text-muted text-[10px] block font-medium">Bank & Branch</span>
                      <span className="font-bold text-text-primary dark:text-white">
                        {iciciVanDetails?.bank_name || "ICICI Bank"}, {iciciVanDetails?.branch_name || "CMS Branch, Mumbai"}
                      </span>
                    </div>
                  </div>

                  <div className="bg-[#264baa]/10 p-3 rounded-xl border-2 border-[#264baa]/50 flex justify-between items-center shadow-xs">
                    <div>
                      <span className="text-[#264baa] dark:text-blue-300 text-[10px] font-extrabold uppercase tracking-wide block">
                        Your Unique Virtual Account No. (VAN)
                      </span>
                      <span className="font-mono font-black text-[#264baa] dark:text-blue-200 text-base tracking-wider">
                        {iciciVanDetails?.virtual_account_number || `SLRK${(milestonePaymentModalOrder.delivery_address?.contact_phone || user?.whatsapp || '9876543210').slice(-10)}`}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleCopyModalText(iciciVanDetails?.virtual_account_number || `SLRK${(milestonePaymentModalOrder.delivery_address?.contact_phone || user?.whatsapp || '9876543210').slice(-10)}`, "modal_van")}
                      className="px-2.5 py-1.5 bg-[#264baa] hover:bg-[#1f3f91] text-white rounded-lg text-xs font-bold flex items-center gap-1 shadow-sm transition-all cursor-pointer"
                    >
                      {copiedModalField === "modal_van" ? <FaCheck size={11} /> : <FaCopy size={11} />}
                      <span>{copiedModalField === "modal_van" ? "Copied" : "Copy VAN"}</span>
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div className="bg-surface p-2.5 rounded-xl border border-border flex justify-between items-center">
                      <div>
                        <span className="text-text-muted text-[10px] block font-medium">IFSC Code</span>
                        <span className="font-mono font-black text-text-primary dark:text-white text-xs">
                          {iciciVanDetails?.ifsc_code || "ICIC0000104"}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleCopyModalText(iciciVanDetails?.ifsc_code || "ICIC0000104", "modal_ifsc")}
                        className="p-1 text-text-secondary hover:text-[#264baa] transition-colors cursor-pointer"
                      >
                        {copiedModalField === "modal_ifsc" ? <FaCheck className="text-emerald-500" size={11} /> : <FaCopy size={11} />}
                      </button>
                    </div>

                    <div className="bg-surface p-2.5 rounded-xl border border-border flex justify-between items-center">
                      <div>
                        <span className="text-text-muted text-[10px] block font-medium">UPI ID</span>
                        <span className="font-mono font-bold text-text-primary dark:text-white text-xs truncate max-w-[130px]" title={iciciVanDetails?.upi_handle || `SLRK${(milestonePaymentModalOrder.delivery_address?.contact_phone || user?.whatsapp || '9876543210').slice(-10)}@icici`}>
                          {iciciVanDetails?.upi_handle || `SLRK${(milestonePaymentModalOrder.delivery_address?.contact_phone || user?.whatsapp || '9876543210').slice(-10)}@icici`}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleCopyModalText(iciciVanDetails?.upi_handle || `SLRK${(milestonePaymentModalOrder.delivery_address?.contact_phone || user?.whatsapp || '9876543210').slice(-10)}@icici`, "modal_upi")}
                        className="p-1 text-text-secondary hover:text-[#264baa] transition-colors cursor-pointer"
                      >
                        {copiedModalField === "modal_upi" ? <FaCheck className="text-emerald-500" size={11} /> : <FaCopy size={11} />}
                      </button>
                    </div>
                  </div>
                </div>

                <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-[11px] text-emerald-800 dark:text-emerald-300 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping shrink-0" />
                  <span>
                    <strong>Instant Auto-Reconciled:</strong> Transfer ₹{Number(milestoneAmount).toLocaleString("en-IN")} via NetBanking (RTGS / NEFT / IMPS) or UPI to the VAN above.
                  </span>
                </div>
              </div>
            ) : (
              <div className="p-4 bg-amber-500/10 rounded-2xl border border-amber-500/25 text-xs space-y-2.5">
                <div className="flex justify-between items-center border-b border-amber-500/20 pb-2">
                  <div className="font-bold text-amber-900 dark:text-amber-200">SolarKits Escrow Bank Account:</div>
                  <span className="text-[10px] font-bold text-amber-700 bg-amber-500/20 px-2 py-0.5 rounded">Accounts Verification Required</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                  <div className="bg-surface p-2 rounded-lg border border-border flex justify-between items-center">
                    <div>
                      <span className="text-text-muted text-[10px] block">Account Name</span>
                      <span className="font-bold text-text-primary">SolarKits Technologies Pvt Ltd</span>
                    </div>
                  </div>
                  <div className="bg-surface p-2 rounded-lg border border-border flex justify-between items-center">
                    <div>
                      <span className="text-text-muted text-[10px] block">Bank Name</span>
                      <span className="font-bold text-text-primary">HDFC Bank</span>
                    </div>
                  </div>
                  <div className="bg-surface p-2 rounded-lg border border-border flex justify-between items-center">
                    <div>
                      <span className="text-text-muted text-[10px] block">A/C Number</span>
                      <span className="font-mono font-black text-text-primary">50200088991122</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleCopyModalText("50200088991122", "modal_off_acc")}
                      className="p-1 text-text-secondary hover:text-primary transition-colors cursor-pointer"
                    >
                      {copiedModalField === "modal_off_acc" ? <FaCheck className="text-emerald-500" size={11} /> : <FaCopy size={11} />}
                    </button>
                  </div>
                  <div className="bg-surface p-2 rounded-lg border border-border flex justify-between items-center">
                    <div>
                      <span className="text-text-muted text-[10px] block">IFSC Code</span>
                      <span className="font-mono font-black text-text-primary">HDFC0001234</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleCopyModalText("HDFC0001234", "modal_off_ifsc")}
                      className="p-1 text-text-secondary hover:text-primary transition-colors cursor-pointer"
                    >
                      {copiedModalField === "modal_off_ifsc" ? <FaCheck className="text-emerald-500" size={11} /> : <FaCopy size={11} />}
                    </button>
                  </div>
                </div>
              </div>
            )}

            <form onSubmit={handleSubmitMilestonePayment} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-text-primary dark:text-white mb-1">
                  UTR / Transaction Ref No. <span className="text-red-500">*</span>
                </label>
                <CustomInput
                  value={milestoneUtr}
                  onChange={(e) => setMilestoneUtr(e.target.value.toUpperCase())}
                  required
                  placeholder={milestonePaymentGateway === "icici" ? "e.g. ICIC0001928374 or UPI Ref" : "e.g. HDFC0001928374 or 239847192834"}
                  className="font-mono uppercase font-bold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-bold text-text-primary dark:text-white">
                      Amount Paid (₹) <span className="text-red-500">*</span>
                    </label>
                    <span className="text-[10px] text-text-muted font-bold flex items-center gap-1">
                      🔒 Fixed Balance Due
                    </span>
                  </div>
                  <CustomInput
                    type="number"
                    value={milestoneAmount}
                    readOnly
                    className="font-bold font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-text-primary dark:text-white mb-1">
                    Payment Date <span className="text-red-500">*</span>
                  </label>
                  <CustomInput
                    type="date"
                    value={milestoneDate}
                    onChange={(e) => setMilestoneDate(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-text-primary dark:text-white mb-1">
                  Sender Bank Name
                </label>
                <CustomInput
                  value={milestoneBank}
                  onChange={(e) => setMilestoneBank(e.target.value)}
                  placeholder={milestonePaymentGateway === "icici" ? "e.g. ICICI Bank / HDFC / GPay / PhonePe" : "e.g. State Bank of India"}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-text-primary dark:text-white mb-1">
                  Upload Payment Transfer Receipt / Screenshot {milestonePaymentGateway === "offline" && <span className="text-red-500">*</span>}
                </label>
                <div className="border-2 border-dashed border-border rounded-xl p-4 text-center cursor-pointer relative bg-surface-hover">
                  <input
                    type="file"
                    accept="image/*,application/pdf"
                    onChange={handleMilestoneFileChange}
                    required={milestonePaymentGateway === "offline" && !milestoneReceiptFile}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                  {milestoneReceiptPreview ? (
                    <img src={milestoneReceiptPreview} alt="Preview" className="max-h-28 mx-auto rounded object-contain" />
                  ) : (
                    <p className="text-xs text-text-secondary">
                      {milestoneReceiptFile ? milestoneReceiptFile.name : "Click to attach payment transfer receipt or bank screenshot"}
                    </p>
                  )}
                </div>
              </div>

              {milestoneError && (
                <div className="text-xs text-red-500 font-bold p-2.5 bg-red-500/10 border border-red-500/20 rounded-lg">
                  {milestoneError}
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2 border-t border-border">
                <Button type="button" variant="secondary" onClick={() => setMilestonePaymentModalOrder(null)}>
                  Cancel
                </Button>
                <Button type="submit" variant="primary" loading={milestoneSubmitting}>
                  {milestonePaymentGateway === "icici" ? `Confirm ICICI ${modalRemPct}% Payment Reference` : `Submit ${modalRemPct}% Payment for Verification`}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}