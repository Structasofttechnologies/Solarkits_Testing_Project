import { useState, useEffect } from "react";
import {
  FaCheck,
  FaTimes,
  FaTruck,
  FaBoxes,
  FaBolt,
  FaRoute,
  FaCheckCircle,
  FaMapMarkerAlt,
  FaBuilding,
  FaClock,
  FaShieldAlt,
  FaExternalLinkAlt,
  FaUserCheck,
  FaWarehouse,
  FaExclamationTriangle,
  FaLock,
} from "react-icons/fa";
import {
  MdLocalShipping,
  MdCheckCircle,
  MdInventory2,
  MdDirectionsCar,
  MdFactCheck,
  MdAssignment,
  MdDoneAll,
  MdLocationOn
} from "react-icons/md";
import {
  advanceOrderStage,
  updateOrderDeliveryEta,
  assignOrderVehicle,
  getWarehouseVehicles,
  stageFpoOrder,
  assignFpoVehicle,
  getOrderStageDetails,
} from "../api/solarshopAccounts";

export const STAGES_LIST = [
  {
    key: "CONFIRMED",
    num: 1,
    title: "Confirmed",
    sub: "Payment Verified",
    desc: "Commercial funds verified by Accounts. Order locked and queued for fulfillment.",
    icon: <FaCheckCircle size={16} />,
  },
  {
    key: "PROCESSING",
    num: 2,
    title: "Processing",
    sub: "Picking & Packing",
    desc: "Warehouse inventory allocated. Physical kits picked and assembled for shipment.",
    icon: <MdInventory2 size={18} />,
  },
  {
    key: "VEHICLE_ASSIGNED",
    num: 3,
    title: "Vehicle Assigned",
    sub: "Fleet Allocated",
    desc: "Dedicated logistics carrier and verified driver assigned to the load.",
    icon: <FaTruck size={16} />,
  },
  {
    key: "READY_FOR_DISPATCH",
    num: 4,
    title: "Ready for Dispatch",
    sub: "Staged at Gate",
    desc: "Quality inspection cleared and cargo staged at the warehouse loading dock.",
    icon: <MdFactCheck size={18} />,
  },
  {
    key: "DISPATCHED",
    num: 5,
    title: "Dispatched",
    sub: "Left Warehouse",
    desc: "Transport vehicle departed warehouse gate. LR/Consignment number registered.",
    icon: <MdLocalShipping size={18} />,
  },
  {
    key: "IN_TRANSIT",
    num: 6,
    title: "In Transit",
    sub: "En Route to Site",
    desc: "Shipment moving through regional transit corridors with waypoint updates.",
    icon: <FaRoute size={16} />,
  },
  {
    key: "REACHED_DESTINATION",
    num: 7,
    title: "Reached Dest.",
    sub: "Arrived at Hub/Site",
    desc: "Carrier reached target delivery hub, installation site, or customer facility.",
    icon: <FaMapMarkerAlt size={16} />,
  },
  {
    key: "DELIVERED",
    num: 8,
    title: "Delivered",
    sub: "Completed & Signed",
    desc: "Consignment verified and accepted by buyer. Fulfillment lifecycle completed.",
    icon: <MdDoneAll size={18} />,
  },
];

// Safely extract numeric capacity in kW from any representation (numbers, "2 kW", "2 K.W.", or item name)
const extractCapacityKw = (rawVal, fallbackText = "") => {
  if (typeof rawVal === "number" && !isNaN(rawVal) && rawVal > 0) {
    return rawVal;
  }
  if (rawVal != null) {
    const s = String(rawVal).trim();
    if (s && !["nan", "null", "undefined"].includes(s.toLowerCase())) {
      const match = s.match(/(\d+(?:\.\d+)?)/);
      if (match) {
        const num = parseFloat(match[1]);
        if (!isNaN(num) && num > 0) return num;
      }
    }
  }
  if (fallbackText) {
    const nameStr = String(fallbackText);
    const kwMatch = nameStr.match(/(\d+(?:\.\d+)?)\s*(?:k\.?\s*w\.?|kw|kilowatt)/i);
    if (kwMatch) {
      const num = parseFloat(kwMatch[1]);
      if (!isNaN(num) && num > 0) return num;
    }
    const anyMatch = nameStr.match(/(\d+(?:\.\d+)?)/);
    if (anyMatch) {
      const num = parseFloat(anyMatch[1]);
      if (!isNaN(num) && num > 0) return num;
    }
  }
  return 3;
};

export default function Product8StageJourneyModal({
  isOpen,
  onClose,
  order: initialOrder,
  product = null,
  orderType = "po", // "po" | "loose" | "direct_epc" | "onboarded_epc"
  onStageUpdated,
}) {
  const [order, setOrder] = useState(initialOrder);
  const [loading, setLoading] = useState(false);
  const [alert, setAlert] = useState(null);

  useEffect(() => {
    setOrder(initialOrder);
    if (isOpen && (initialOrder?._id || initialOrder?.id)) {
      loadFreshStageDetails();
    }
  }, [isOpen, initialOrder?._id, initialOrder?.id]);

  const loadFreshStageDetails = async () => {
    try {
      const orderId = order?._id || order?.id || initialOrder?._id || initialOrder?.id;
      if (!orderId) return;
      const res = await getOrderStageDetails(orderType, orderId);
      if (res?.status === "success" && res?.data) {
        const d = res.data;
        setOrder((prev) => ({
          ...prev,
          status: d.status || prev.status,
          order_status: d.order_status || prev.order_status,
          assigned_vehicle: d.assigned_vehicle || prev.assigned_vehicle,
          dispatch_tracking: d.dispatch_tracking || prev.dispatch_tracking,
          milestones: d.milestones || prev.milestones,
        }));
      }
    } catch (err) {
      console.warn("Could not load fresh stage details:", err.message);
    }
  };

  // Sub-forms state
  const [vehicles, setVehicles] = useState([]);
  const [loadingVehicles, setLoadingVehicles] = useState(false);
  const [selectedVehicleId, setSelectedVehicleId] = useState("");
  const [overrideReason, setOverrideReason] = useState("");

  // Dispatch fields
  const [courierName, setCourierName] = useState("");
  const [trackingNumber, setTrackingNumber] = useState("");
  const [trackingUrl, setTrackingUrl] = useState("");
  const [estimatedDelivery, setEstimatedDelivery] = useState("");

  // Milestone fields
  const [milestoneStatus, setMilestoneStatus] = useState("Crossed Transit Hub");
  const [milestoneDesc, setMilestoneDesc] = useState("");

  // Auto-sync courier & dispatch tracking from assigned vehicle or previous dispatch
  useEffect(() => {
    if (order?.dispatch_tracking?.courier_name) {
      setCourierName(order.dispatch_tracking.courier_name);
    } else if (order?.assigned_vehicle?.vehicle_name) {
      const vName = order.assigned_vehicle.vehicle_name;
      const vReg = order.assigned_vehicle.registration_number;
      setCourierName(vReg ? `${vName} (${vReg})` : vName);
    }
    if (order?.dispatch_tracking?.tracking_number) {
      setTrackingNumber(order.dispatch_tracking.tracking_number);
    }
    if (order?.dispatch_tracking?.tracking_url) {
      setTrackingUrl(order.dispatch_tracking.tracking_url);
    }
    // Auto-sync estimatedDelivery
    if (order?.dispatch_tracking?.estimated_delivery) {
      try {
        const d = new Date(order.dispatch_tracking.estimated_delivery);
        if (!isNaN(d.getTime())) {
          const pad = (n) => String(n).padStart(2, '0');
          const localStr = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
          setEstimatedDelivery(localStr);
        }
      } catch (e) {
        console.warn('Could not parse estimated_delivery:', e);
      }
    }
  }, [order?.assigned_vehicle, order?.dispatch_tracking]);

  // Determine current active stage index
  const getRawStatus = () => {
    if (!order) return "CONFIRMED";
    return String(order.order_status || order.status || order.payment_status || "CONFIRMED").toUpperCase();
  };

  const rawStatus = getRawStatus();

  const getActiveIndex = () => {
    const map = {
      SUBMITTED: 0,
      PENDING_APPROVAL: 0,
      APPROVED: 0,
      AWAITING_PAYMENT: 0,
      PARTIALLY_PAID: 0,
      PAID: 0,
      CONFIRMED: 0,
      STOCK_ALLOCATED: 1,
      PROCESSING: 1,
      VEHICLE_ASSIGNED: 2,
      READY_FOR_DISPATCH: 3,
      PARTIALLY_DISPATCHED: 4,
      DISPATCHED: 4,
      IN_TRANSIT: 5,
      REACHED_DESTINATION: 6,
      PARTIALLY_DELIVERED: 7,
      DELIVERED: 7,
      COMPLETED: 7,
    };
    return map[rawStatus] ?? 0;
  };

  const activeIdx = getActiveIndex();
  const currentStage = STAGES_LIST[activeIdx] || STAGES_LIST[0];
  const nextStage = activeIdx < STAGES_LIST.length - 1 ? STAGES_LIST[activeIdx + 1] : null;

  // Normalized product details
  const item = product || order?.items?.[0] || {};
  const itemName =
    item.item_name ||
    item.product_name ||
    order?.order_name ||
    order?.product_name ||
    "High-Efficiency Solar Kit System";
  const itemBrand = item.brand_name || order?.brand_name || "Tata Power Solar";
  const rawCapacity = item.capacity ?? item.capacity_kw ?? order?.primary_capacity ?? order?.capacity ?? order?.system_capacity ?? order?.capacity_kw;
  const itemCapacity = extractCapacityKw(rawCapacity, itemName);
  const rawQty = order?.total_quantity ?? order?.total_booked_quantity ?? item.quantity ?? order?.quantity ?? 1;
  const itemQty = Math.max(1, parseInt(rawQty, 10) || 1);
  const calcTotal = Math.round(itemCapacity * itemQty * 10) / 10;
  const totalKw = isNaN(calcTotal) ? "0" : Number.isInteger(calcTotal) ? calcTotal.toString() : calcTotal.toFixed(1);
  const orderNumber = order?.po_number || order?.order_number || order?.transaction_id || "PO-REF";
  const partnerName =
    order?.franchisee_id?.business_name ||
    order?.franchise_partner_name ||
    order?.reseller?.business_name ||
    order?.customer_name ||
    order?.epc_name ||
    "Authorized Franchise Partner";

  const rawGrandTotal =
    order?.grand_total_paise != null
      ? order.grand_total_paise / 100
      : order?.grand_total_inr || order?.total_transaction_amount || order?.grand_total || order?.total_amount || 0;
  const grandTotal = isNaN(Number(rawGrandTotal)) ? 0 : Number(rawGrandTotal);

  // Load vehicles when entering stage 2 (ready for vehicle assignment)
  useEffect(() => {
    if (isOpen && activeIdx === 1) {
      loadFleetVehicles();
    }
  }, [isOpen, activeIdx, order?._id, order?.id]);

  const loadFleetVehicles = async () => {
    setLoadingVehicles(true);
    try {
      const warehouseId = order?.warehouse_id || order?.assigned_warehouse_id || order?.warehouse?._id;
      const res = await getWarehouseVehicles(warehouseId ? { warehouse_id: warehouseId } : {});
      const list = res?.data || [];
      setVehicles(list);
      if (list.length > 0) {
        const existingVehicleId = order?.assigned_vehicle?.vehicle_id || selectedVehicleId;
        const matched = list.find((v) => (v._id || v.id) === existingVehicleId);
        setSelectedVehicleId(matched ? (matched._id || matched.id) : (list[0]._id || list[0].id));
      }
    } catch (err) {
      console.warn("Could not load vehicles list:", err.message);
    } finally {
      setLoadingVehicles(false);
    }
  };

  // Helper for API call
  const callAdvance = async (stageKey, payload = {}) => {
    setLoading(true);
    setAlert(null);
    try {
      const orderId = order._id || order.id;
      const isFpo = orderType === "po" || !!order.po_number;
      let updatedData = null;

      if (isFpo) {
        const res = await stageFpoOrder(orderId, stageKey.toLowerCase(), payload);
        updatedData = res?.data;
      } else {
        const res = await advanceOrderStage("epc", orderId, stageKey.toLowerCase(), payload);
        updatedData = res?.data;
      }

      setOrder((prev) => ({
        ...prev,
        status: updatedData?.status || updatedData?.order_status || stageKey,
        order_status: updatedData?.order_status || updatedData?.status || stageKey,
        dispatch_tracking: updatedData?.dispatch_tracking || prev?.dispatch_tracking,
        milestones: updatedData?.milestones || prev?.milestones,
      }));

      setAlert({
        type: "success",
        text: `Successfully advanced to Stage ${stageKey.replace(/_/g, " ")}!`,
      });

      if (onStageUpdated) onStageUpdated();
    } catch (err) {
      setAlert({
        type: "error",
        text: err.response?.data?.message || err.message || "Failed to advance stage.",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAssignVehicle = async (e) => {
    e.preventDefault();
    if (!selectedVehicleId) {
      setAlert({ type: "error", text: "Please select a vehicle from the fleet." });
      return;
    }
    setLoading(true);
    setAlert(null);
    try {
      const orderId = order._id || order.id;
      const isFpo = orderType === "po" || !!order.po_number;
      const payload = {
        vehicle_id: selectedVehicleId,
        override_reason: overrideReason || undefined,
        is_recommended: !overrideReason,
      };

      let updatedData = null;
      if (isFpo) {
        const res = await assignFpoVehicle(orderId, payload);
        updatedData = res?.data;
      } else {
        const res = await assignOrderVehicle("epc", orderId, payload);
        updatedData = res?.data;
      }

      const vObj = vehicles.find((v) => (v._id || v.id) === selectedVehicleId);
      setOrder((prev) => ({
        ...prev,
        status: updatedData?.status || updatedData?.order_status || "VEHICLE_ASSIGNED",
        order_status: updatedData?.order_status || updatedData?.status || "VEHICLE_ASSIGNED",
        assigned_vehicle: updatedData?.assigned_vehicle || {
          vehicle_id: selectedVehicleId,
          vehicle_name: vObj?.name || "Delivery Vehicle",
          registration_number: vObj?.registration_number || "",
          vehicle_type: vObj?.vehicle_type || "Fleet",
          is_recommended: !overrideReason,
          driver_name: vObj?.assigned_driver_id?.name || "Assigned Driver",
          driver_contact: vObj?.assigned_driver_id?.contact || null,
        },
      }));

      setAlert({ type: "success", text: "Stage 3: Vehicle assigned successfully!" });
      if (onStageUpdated) onStageUpdated();
    } catch (err) {
      setAlert({
        type: "error",
        text: err.response?.data?.message || err.message || "Failed to assign vehicle.",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDispatch = async (e) => {
    e.preventDefault();
    if (!trackingNumber.trim()) {
      setAlert({ type: "error", text: "Please enter LR / Courier tracking number." });
      return;
    }
    await callAdvance("DISPATCHED", {
      dispatch_data: {
        courier_name: courierName || "Company Fleet Logistics",
        tracking_number: trackingNumber.trim(),
        tracking_url: trackingUrl.trim() || null,
        estimated_delivery: estimatedDelivery ? new Date(estimatedDelivery).toISOString() : null,
      },
    });
  };

  const handleQuickUpdateEta = async (e) => {
    if (e) e.preventDefault();
    if (!estimatedDelivery) {
      setAlert({ type: "error", text: "Please select an estimated delivery date & time." });
      return;
    }
    setLoading(true);
    setAlert(null);
    try {
      const orderId = order._id || order.id;
      const res = await updateOrderDeliveryEta(orderType, orderId, {
        estimated_delivery: new Date(estimatedDelivery).toISOString(),
      });
      if (res?.status === "success") {
        setAlert({ type: "success", text: "Estimated delivery ETA saved and updated live!" });
        setOrder((prev) => ({
          ...prev,
          dispatch_tracking: {
            ...prev?.dispatch_tracking,
            estimated_delivery: new Date(estimatedDelivery).toISOString(),
          },
        }));
        if (onStageUpdated) onStageUpdated();
      }
    } catch (err) {
      setAlert({ type: "error", text: err.response?.data?.message || "Failed to update estimated delivery date." });
    } finally {
      setLoading(false);
    }
  };

  const handleMilestone = async (e) => {
    e.preventDefault();
    const finalDesc = milestoneDesc || `Order passed ${milestoneStatus} checkpoint.`;
    await callAdvance("IN_TRANSIT", {
      milestone_status: milestoneStatus,
      status: milestoneStatus,
      description: finalDesc,
      milestone: {
        status: milestoneStatus,
        description: finalDesc,
      },
    });
    setMilestoneDesc("");
  };

  if (!isOpen || !order) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl max-h-[94vh] flex flex-col rounded-3xl bg-surface border border-border shadow-2xl overflow-hidden">

        {/* ── Modal Header Banner ───────────────────────────────────────────── */}
        <div className="px-6 py-4 bg-gradient-to-r from-blue-700 via-indigo-700 to-primary text-white flex items-center justify-between shadow-md">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/15 border border-white/25 flex items-center justify-center text-white backdrop-blur-sm shadow-xs">
              <FaTruck size={18} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black tracking-tight text-white">
                  Product 8-Stage Lifecycle Journey
                </h2>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-white/20 border border-white/30 text-white uppercase tracking-wider">
                  Live Accounts & Admin Sync
                </span>
              </div>
              <p className="text-xs text-blue-100 mt-0.5">
                Order ID: <strong className="font-mono text-white">{orderNumber}</strong> • Partner: <strong className="text-white">{partnerName}</strong>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
            title="Close"
          >
            <FaTimes size={16} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5 text-xs">
          {/* Feedback Alert */}
          {alert && (
            <div
              className={`p-3.5 rounded-2xl border text-xs font-bold flex items-center justify-between ${alert.type === "success"
                  ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-300"
                  : "bg-red-500/10 border-red-500/30 text-red-600 dark:text-red-400"
                }`}
            >
              <span>{alert.text}</span>
              <button onClick={() => setAlert(null)} className="cursor-pointer font-black text-sm">✕</button>
            </div>
          )}

          {/* ── 1. Product Summary Card ───────────────────────────────────────── */}
          <div className="p-4 sm:p-5 rounded-2xl bg-surface-hover/40 border border-border shadow-2xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl overflow-hidden border border-border bg-surface shrink-0 flex items-center justify-center shadow-xs">
                {item.image || order.primary_image ? (
                  <img
                    src={item.image || order.primary_image}
                    alt={itemName}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.target.onerror = null;
                      e.target.src = "https://placehold.co/120x120?text=Solar+Kit";
                    }}
                  />
                ) : (
                  <div className="w-full h-full bg-primary/10 flex items-center justify-center text-primary">
                    <FaBoxes size={24} />
                  </div>
                )}
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="px-2 py-0.5 rounded-md text-[10px] font-black bg-primary/10 text-primary border border-primary/20">
                    {itemBrand}
                  </span>
                  <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 border border-blue-200">
                    <FaBolt className="inline mr-1" size={9} /> {itemCapacity} kW / Unit
                  </span>
                </div>
                <h3 className="font-black text-sm sm:text-base text-text-primary leading-snug line-clamp-2">
                  {itemName}
                </h3>
                <div className="text-xs text-text-muted flex items-center gap-3 flex-wrap">
                  <span>Quantity: <strong className="text-text-primary font-black">{itemQty} Units</strong></span>
                  <span>Total System Power: <strong className="text-primary font-black">{totalKw} kW</strong></span>
                </div>
              </div>
            </div>

            <div className="sm:text-right shrink-0 border-t sm:border-t-0 pt-2 sm:pt-0 border-border w-full sm:w-auto flex sm:flex-col justify-between sm:justify-center">
              <span className="text-[10px] font-black uppercase tracking-wider text-text-muted">Total Order Value</span>
              <span className="text-base sm:text-lg font-black text-emerald-600">
                ₹{grandTotal.toLocaleString("en-IN")}
              </span>
              <span className="text-[10px] text-text-muted hidden sm:inline-block">Landed Cost Incl. GST</span>
            </div>
          </div>

          {/* ── Estimated Delivery ETA Bar (Live Sync with Customer Store) ── */}
          <div className="p-3.5 sm:p-4 rounded-2xl bg-primary/5 border border-primary/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <span className="p-2 rounded-xl bg-primary/10 text-primary shrink-0">
                <FaClock size={16} />
              </span>
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-text-muted block">
                  Customer Estimated Delivery (Live ETA)
                </span>
                <p className="text-xs font-bold text-text-primary">
                  {order?.dispatch_tracking?.estimated_delivery ? (
                    <span className="text-emerald-700 dark:text-emerald-300 font-black">
                      📅 {new Date(order.dispatch_tracking.estimated_delivery).toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  ) : (
                    <span className="text-amber-700 dark:text-amber-400">
                      Standard SLA (3-5 Business Days) — Not yet explicitly scheduled
                    </span>
                  )}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="datetime-local"
                value={estimatedDelivery}
                onChange={(e) => setEstimatedDelivery(e.target.value)}
                className="px-2.5 py-1.5 rounded-xl text-xs font-bold border border-border bg-surface text-text-primary cursor-pointer"
                title="Select Estimated Delivery Date & Time"
              />
              <button
                type="button"
                onClick={handleQuickUpdateEta}
                disabled={loading || !estimatedDelivery}
                className="px-3 py-1.5 rounded-xl bg-primary hover:bg-primary/90 text-white font-bold text-xs cursor-pointer shadow-xs disabled:opacity-50 shrink-0"
              >
                Set / Update ETA
              </button>
            </div>
          </div>

          {/* ── 2. Interactive 8-Stage Stepper Bar ─────────────────────────────── */}
          <div className="p-4 sm:p-5 rounded-2xl bg-surface border border-border shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-border">
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-lg bg-primary/10 text-primary">
                  <FaRoute size={14} />
                </span>
                <div>
                  <div className="text-xs font-black uppercase tracking-wider text-text-primary">
                    Live Journey Progress: Stage {activeIdx + 1} of 8
                  </div>
                  <div className="text-[11px] text-primary font-extrabold">
                    {currentStage.title} — {currentStage.sub}
                  </div>
                </div>
              </div>

              <span className="px-3 py-1 rounded-full text-xs font-black bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                {activeIdx === 7 ? "Delivered ✓" : `Next: ${nextStage?.title || "Completion"}`}
              </span>
            </div>

            {/* Stepper Timeline */}
            <div className="overflow-x-auto pb-3 pt-2">
              <div className="flex items-start justify-between min-w-[720px] relative px-2">
                {/* Connecting Line */}
                <div className="absolute top-4 left-8 right-8 h-1 bg-border -z-0">
                  <div
                    className="h-full bg-emerald-500 transition-all duration-500"
                    style={{ width: `${(activeIdx / (STAGES_LIST.length - 1)) * 100}%` }}
                  />
                </div>

                {STAGES_LIST.map((stage, idx) => {
                  const isCompleted = idx < activeIdx;
                  const isCurrent = idx === activeIdx;

                  return (
                    <div key={stage.key} className="flex flex-col items-center text-center relative z-10 w-20">
                      <div
                        className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs shadow-md transition-all ${isCompleted
                            ? "bg-emerald-600 text-white"
                            : isCurrent
                              ? "bg-primary text-white ring-4 ring-primary/20 scale-110 animate-pulse"
                              : "bg-surface border-2 border-border text-text-muted"
                          }`}
                      >
                        {isCompleted ? <FaCheck size={12} /> : idx + 1}
                      </div>
                      <p className={`text-[10px] font-bold mt-2 leading-tight ${isCurrent ? "text-primary font-black" : isCompleted ? "text-emerald-700 dark:text-emerald-400" : "text-text-muted"}`}>
                        {stage.title}
                      </p>
                      <p className="text-[9px] text-text-muted mt-0.5 hidden sm:block">{stage.sub}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* ── 3. Stage Details & Completed Milestones ───────────────────────── */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Vehicle & Fleet Info */}
            <div className={`p-4 rounded-2xl border transition-all ${order.assigned_vehicle?.registration_number || order.assigned_vehicle?.vehicle_name
                ? "bg-emerald-50/40 dark:bg-emerald-950/20 border-emerald-300 dark:border-emerald-800"
                : "bg-surface-hover/30 border-border"
              } space-y-2`}>
              <div className="flex items-center justify-between text-xs font-black uppercase text-text-muted">
                <span className="flex items-center gap-1.5"><FaTruck className="text-primary" /> Delivery Vehicle</span>
                <div className="flex items-center gap-1.5">
                  {(order.assigned_vehicle?.registration_number || order.assigned_vehicle?.vehicle_name) && (
                    <span className="px-2 py-0.5 rounded-md text-[10px] bg-emerald-600 text-white font-black flex items-center gap-1 shadow-sm tracking-wide">
                      <FaLock size={9} /> Fleet Vehicle Locked
                    </span>
                  )}
                  {order.assigned_vehicle?.is_recommended && (
                    <span className="px-2 py-0.5 rounded text-[9px] bg-emerald-100 text-emerald-800 font-bold">AI Recommended</span>
                  )}
                </div>
              </div>
              {order.assigned_vehicle?.registration_number || order.assigned_vehicle?.vehicle_name ? (
                <div className="space-y-1.5 pt-1 text-xs">
                  <div className="flex items-center justify-between">
                    <div className="font-black text-text-primary text-sm flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded-md bg-primary/10 text-primary text-xs font-black uppercase">
                        {order.assigned_vehicle.vehicle_name}
                      </span>
                      <span className="font-mono tracking-wider font-bold text-xs bg-surface border border-border px-2 py-0.5 rounded-md">
                        {order.assigned_vehicle.registration_number}
                      </span>
                    </div>
                    <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-100/70 dark:bg-emerald-900/30 px-2 py-0.5 rounded-md border border-emerald-300 dark:border-emerald-800">
                      ✓ Allocated & Locked
                    </span>
                  </div>
                  <div className="text-text-secondary flex items-center gap-2 pt-0.5">
                    <span>Type: <strong className="text-text-primary">{order.assigned_vehicle.vehicle_type || "Heavy Commercial"}</strong></span>
                    {order.assigned_vehicle.assigned_at && (
                      <span className="text-[10px] text-text-muted">
                        • Assigned on {new Date(order.assigned_vehicle.assigned_at).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                  <div className="text-text-secondary pt-0.5 flex items-center gap-1.5">
                    <span>Driver:</span>
                    <span className="font-bold text-text-primary">
                      {order.assigned_vehicle.driver_name || "Warehouse Verified Driver"}
                    </span>
                    {order.assigned_vehicle.driver_contact && (
                      <span className="font-mono text-primary font-semibold ml-1">
                        • Tel: {order.assigned_vehicle.driver_contact}
                      </span>
                    )}
                  </div>
                </div>
              ) : (
                <p className="text-text-muted italic pt-1">No delivery vehicle assigned yet (Allocated in Stage 3).</p>
              )}
            </div>

            {/* Courier & Tracking Info */}
            <div className="p-4 rounded-2xl bg-surface-hover/30 border border-border space-y-2">
              <div className="flex items-center justify-between text-xs font-black uppercase text-text-muted">
                <span className="flex items-center gap-1.5"><MdLocalShipping className="text-purple-600" /> Dispatch & Waybill</span>
                {order.dispatch_tracking?.tracking_number && (
                  <span className="px-2 py-0.5 rounded text-[9px] bg-purple-100 text-purple-800 font-bold">Waybill Active</span>
                )}
              </div>
              {order.dispatch_tracking?.tracking_number ? (
                <div className="space-y-1 pt-1 text-xs">
                  <div className="font-black text-text-primary text-sm">
                    {order.dispatch_tracking.courier_name || "Company Fleet Logistics"}
                  </div>
                  <div className="text-text-secondary font-mono">
                    LR / Waybill: <span className="font-bold text-primary">{order.dispatch_tracking.tracking_number}</span>
                  </div>
                  {order.dispatch_tracking.tracking_url && (
                    <a
                      href={order.dispatch_tracking.tracking_url}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-primary hover:underline font-bold text-[11px]"
                    >
                      Track Shipment Online <FaExternalLinkAlt size={9} />
                    </a>
                  )}
                </div>
              ) : (
                <p className="text-text-muted italic pt-1">No dispatch tracking registered yet (Generated in Stage 5).</p>
              )}
            </div>
          </div>

          {/* In-Transit Waypoints / Milestones */}
          {order.milestones && order.milestones.length > 0 && (
            <div className="p-4 rounded-2xl bg-blue-50/50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/40 space-y-2">
              <div className="text-xs font-black uppercase text-blue-800 dark:text-blue-300 flex items-center gap-1.5">
                <FaRoute /> In-Transit Waypoints & Updates
              </div>
              <div className="divide-y divide-border/60">
                {order.milestones.map((m, idx) => (
                  <div key={idx} className="py-2 flex items-center justify-between text-xs">
                    <div>
                      <span className="font-bold text-text-primary">{m.status}</span>
                      {m.description && <span className="text-text-muted ml-2">— {m.description}</span>}
                    </div>
                    <span className="text-[10px] text-text-muted">
                      {new Date(m.recorded_at).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── 4. Stage Progression Control Panel ────────────────────────────── */}
          <div className="p-5 rounded-2xl bg-gradient-to-br from-primary/5 via-surface to-surface border border-primary/20 space-y-4">
            <div>
              <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-md bg-primary text-white">
                Accounts Stage Controller
              </span>
              <h4 className="text-sm font-black text-text-primary mt-1">
                Advance Order to Next Stage: <span className="text-primary">{nextStage?.title || "Complete"}</span>
              </h4>
              <p className="text-xs text-text-muted mt-0.5">
                {nextStage?.desc || "All 8 stages completed. Order has been delivered and financial records settled."}
              </p>
            </div>

            {/* Stage 1 -> 2: Move to Processing */}
            {activeIdx === 0 && (
              <div className="flex items-center justify-between pt-2">
                <p className="text-xs text-text-secondary">
                  Confirm order picked by warehouse operations to start assembly and packaging.
                </p>
                <button
                  disabled={loading}
                  onClick={() => callAdvance("PROCESSING")}
                  className="px-5 py-2.5 rounded-xl bg-primary hover:opacity-90 text-white font-black text-xs cursor-pointer shadow-md transition-all flex items-center gap-2 shrink-0 disabled:opacity-50"
                >
                  {loading ? "Processing..." : "✓ Move to Stage 2: Processing"}
                </button>
              </div>
            )}

            {/* Stage 2 -> 3: Assign Vehicle Form */}
            {activeIdx === 1 && (
              <form onSubmit={handleAssignVehicle} className="space-y-3 pt-2">
                {order.assigned_vehicle?.registration_number && (
                  <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-300 dark:border-emerald-800 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <FaLock className="text-emerald-600" />
                      <span className="font-bold text-emerald-900 dark:text-emerald-300">
                        Current Assigned Vehicle: {order.assigned_vehicle.vehicle_name} ({order.assigned_vehicle.registration_number})
                      </span>
                    </div>
                    <span className="text-[10px] font-black uppercase text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded">Locked</span>
                  </div>
                )}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block font-bold text-text-muted text-[11px] uppercase">
                        Select Delivery Fleet Vehicle
                      </label>
                      <button
                        type="button"
                        onClick={loadFleetVehicles}
                        disabled={loadingVehicles}
                        className="text-[10px] font-bold text-primary hover:underline cursor-pointer flex items-center gap-1 disabled:opacity-50"
                        title="Reload available vehicles from fleet"
                      >
                        {loadingVehicles ? "Loading..." : "↻ Refresh Fleet"}
                      </button>
                    </div>
                    <select
                      value={selectedVehicleId}
                      onChange={(e) => setSelectedVehicleId(e.target.value)}
                      disabled={loadingVehicles || loading}
                      className="w-full px-3 py-2.5 rounded-xl text-xs font-bold border border-border bg-surface text-text-primary cursor-pointer"
                    >
                      {loadingVehicles ? (
                        <option>Loading fleet vehicles...</option>
                      ) : vehicles.length === 0 ? (
                        <option value="">No vehicles found in warehouse</option>
                      ) : (
                        vehicles.map((v) => (
                          <option key={v._id || v.id} value={v._id || v.id}>
                            {v.name} ({v.registration_number}) — {v.vehicle_type || "Fleet"} [Max: {v.max_kits || 100} Kits]
                          </option>
                        ))
                      )}
                    </select>
                  </div>

                  <div>
                    <label className="block font-bold text-text-muted text-[11px] uppercase mb-1">
                      Override Reason (Optional)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Dedicated emergency vehicle override"
                      value={overrideReason}
                      onChange={(e) => setOverrideReason(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-xl text-xs border border-border bg-surface text-text-primary"
                    />
                  </div>
                </div>

                <div className="flex justify-end pt-1">
                  <button
                    type="submit"
                    disabled={loading || loadingVehicles || !selectedVehicleId}
                    className="px-5 py-2.5 rounded-xl bg-primary hover:opacity-90 text-white font-black text-xs cursor-pointer shadow-md flex items-center gap-2 disabled:opacity-50"
                  >
                    {loading ? "Assigning..." : "✓ Assign Vehicle & Move to Stage 3"}
                  </button>
                </div>
              </form>
            )}

            {/* Stage 3 -> 4: Mark Ready for Dispatch */}
            {activeIdx === 2 && (
              <div className="flex items-center justify-between pt-2">
                <p className="text-xs text-text-secondary">
                  Vehicle has been assigned. Confirm items are packed, labeled, and staged at the warehouse dock.
                </p>
                <button
                  disabled={loading}
                  onClick={() => callAdvance("READY_FOR_DISPATCH")}
                  className="px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-black text-xs cursor-pointer shadow-md flex items-center gap-2 shrink-0 disabled:opacity-50"
                >
                  {loading ? "Updating..." : "✓ Mark Ready for Dispatch (Stage 4)"}
                </button>
              </div>
            )}

            {/* Stage 4 -> 5: Dispatch Order Form */}
            {activeIdx === 3 && (
              <form onSubmit={handleDispatch} className="space-y-3 pt-2">
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                  <div>
                    <label className="block font-bold text-text-muted text-[11px] uppercase mb-1">
                      Courier / Transport Name
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. SolarKits Express Fleet"
                      value={courierName}
                      onChange={(e) => setCourierName(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-xl text-xs border border-border bg-surface text-text-primary"
                      required
                    />
                    {order.assigned_vehicle?.vehicle_name && (
                      <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold mt-1 flex items-center gap-1">
                        <FaLock size={8} /> Pre-filled from locked vehicle: {order.assigned_vehicle.vehicle_name} ({order.assigned_vehicle.registration_number})
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="block font-bold text-text-muted text-[11px] uppercase mb-1">
                      LR / Waybill Number
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. LR-2026-88992"
                      value={trackingNumber}
                      onChange={(e) => setTrackingNumber(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-xl text-xs font-mono font-bold border border-border bg-surface text-text-primary"
                      required
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-text-muted text-[11px] uppercase mb-1">
                      Estimated Delivery Date & Time
                    </label>
                    <input
                      type="datetime-local"
                      value={estimatedDelivery}
                      onChange={(e) => setEstimatedDelivery(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-xl text-xs font-bold border border-border bg-surface text-text-primary cursor-pointer"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-text-muted text-[11px] uppercase mb-1">
                      Tracking URL (Optional)
                    </label>
                    <input
                      type="url"
                      placeholder="https://track.logistics.com/..."
                      value={trackingUrl}
                      onChange={(e) => setTrackingUrl(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-xl text-xs border border-border bg-surface text-text-primary"
                    />
                  </div>
                </div>

                <div className="flex justify-end pt-1">
                  <button
                    type="submit"
                    disabled={loading}
                    className="px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-black text-xs cursor-pointer shadow-md flex items-center gap-2 disabled:opacity-50"
                  >
                    {loading ? "Dispatching..." : "✓ Confirm Dispatch & Move to Stage 5"}
                  </button>
                </div>
              </form>
            )}

            {/* Stage 5 -> 6 / Add Milestone: In-Transit */}
            {activeIdx === 4 && (
              <form onSubmit={handleMilestone} className="space-y-3 pt-2">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-text-muted text-[11px] uppercase mb-1">
                      Milestone Checkpoint
                    </label>
                    <input
                      type="text"
                      value={milestoneStatus}
                      onChange={(e) => setMilestoneStatus(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-xl text-xs font-bold border border-border bg-surface text-text-primary"
                      required
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-text-muted text-[11px] uppercase mb-1">
                      Checkpoint Description
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Departed Regional Hub Ahmedabad en route to Surat"
                      value={milestoneDesc}
                      onChange={(e) => setMilestoneDesc(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-xl text-xs border border-border bg-surface text-text-primary"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-1">
                  <button
                    type="submit"
                    disabled={loading}
                    className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-black text-xs cursor-pointer shadow-md flex items-center gap-2 disabled:opacity-50"
                  >
                    {loading ? "Updating..." : "✓ Record In-Transit Milestone (Stage 6)"}
                  </button>
                </div>
              </form>
            )}

            {/* Stage 6 -> 7: Reached Destination */}
            {activeIdx === 5 && (
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
                <p className="text-xs text-text-secondary">
                  Vehicle has arrived at the destination city/hub. Record destination arrival.
                </p>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    disabled={loading}
                    onClick={() => callAdvance("REACHED_DESTINATION")}
                    className="px-5 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-black text-xs cursor-pointer shadow-md flex items-center gap-2 disabled:opacity-50"
                  >
                    {loading ? "Updating..." : "✓ Mark Reached Destination (Stage 7)"}
                  </button>
                </div>
              </div>
            )}

            {/* Stage 7 -> 8: Delivered */}
            {activeIdx === 6 && (
              <div className="flex items-center justify-between pt-2">
                <p className="text-xs text-text-secondary">
                  Confirm delivery receipt, sign-off from franchisee/buyer, and finalize commercial settlement.
                </p>
                <button
                  disabled={loading}
                  onClick={() => callAdvance("DELIVERED")}
                  className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs cursor-pointer shadow-md flex items-center gap-2 shrink-0 disabled:opacity-50"
                >
                  {loading ? "Completing..." : "✓ Confirm Delivery & Settle Order (Stage 8)"}
                </button>
              </div>
            )}

            {/* Stage 8 Completed */}
            {activeIdx === 7 && (
              <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 font-bold flex items-center gap-2.5">
                <FaCheckCircle size={18} className="text-emerald-600 shrink-0" />
                <span>
                  This product has completed all 8 lifecycle stages and is fully delivered & settled. Both Accounts and Admin records are synchronized.
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3.5 bg-surface-hover/30 border-t border-border flex items-center justify-between text-xs">
          <span className="text-text-muted">
            SolarKits System Ref: {order._id || order.id}
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-bold bg-surface border border-border hover:bg-surface-hover text-text-primary cursor-pointer transition-all"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
