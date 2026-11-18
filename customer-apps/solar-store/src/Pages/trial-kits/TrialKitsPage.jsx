import { useEffect, useState, useCallback } from "react";
import { useSelector } from "react-redux";
import axiosInstance from "@/utils/axiosInstance";
import {
  FiPackage,
  FiCheckCircle,
  FiAlertCircle,
  FiTruck,
  FiStar,
  FiClock,
  FiMapPin,
  FiLock,
  FiInfo,
  FiX,
  FiPhone,
  FiCalendar
} from "react-icons/fi";
import { FaBoxes, FaSolarPanel } from "react-icons/fa";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

const resolveImageUrl = (url) => {
  if (!url) return null;
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  const clean = url.startsWith("/") ? url : `/${url}`;
  return `${API_BASE_URL}${clean}`;
};

export default function TrialKitsPage() {
  const { user } = useSelector((state) => state.auth_slice);
  const [loading, setLoading] = useState(true);
  const [kits, setKits] = useState([]);
  const [epcGstin, setEpcGstin] = useState("");
  const [myOrders, setMyOrders] = useState([]);
  const [activeTab, setActiveTab] = useState("available"); // 'available' | 'orders'

  // Order Modal State
  const [selectedKit, setSelectedKit] = useState(null);
  const [isOrderModalOpen, setIsOrderModalOpen] = useState(false);
  const [submittingOrder, setSubmittingOrder] = useState(false);
  const [orderError, setOrderError] = useState("");
  const [orderSuccess, setOrderSuccess] = useState("");

  const [shippingForm, setShippingForm] = useState({
    address: "",
    state: "",
    district: "",
    pincode: "",
    contact_name: "",
    phone: "",
    gst_number: ""
  });

  // Feedback Modal State
  const [feedbackOrder, setFeedbackOrder] = useState(null);
  const [isFeedbackModalOpen, setIsFeedbackModalOpen] = useState(false);
  const [submittingFeedback, setSubmittingFeedback] = useState(false);
  const [feedbackError, setFeedbackError] = useState("");
  const [feedbackSuccess, setFeedbackSuccess] = useState("");

  const [feedbackForm, setFeedbackForm] = useState({
    trial_kit_received_confirmation: true,
    product_quality_rating: 5,
    installation_testing_experience: "",
    inverter_module_performance: "",
    technical_issue_complaint: "",
    future_purchase_requirement: "within_1_month",
    expected_monthly_kit_purchase_quantity: 5,
    next_followup_date: ""
  });

  // Fetch Availability
  const fetchAvailability = useCallback(async () => {
    try {
      setLoading(true);
      const res = await axiosInstance.get("/india/v1/shop/trial-kits/availability");
      if (res.data?.success) {
        setKits(res.data.data.kits || []);
        setEpcGstin(res.data.data.epc_gstin || user?.gstin || "");
      }
    } catch (err) {
      console.error("Failed to load trial kits availability:", err);
    } finally {
      setLoading(false);
    }
  }, [user?.gstin]);

  // Fetch My Orders
  const fetchMyOrders = useCallback(async () => {
    try {
      const res = await axiosInstance.get("/india/v1/shop/trial-kits/my-orders");
      if (res.data?.success) {
        setMyOrders(res.data.data || []);
      }
    } catch (err) {
      console.error("Failed to load trial kit orders:", err);
    }
  }, []);

  useEffect(() => {
    fetchAvailability();
    fetchMyOrders();
  }, [fetchAvailability, fetchMyOrders]);

  // Open Order Modal
  const handleOpenOrderModal = (kit) => {
    setSelectedKit(kit);
    setOrderError("");
    setOrderSuccess("");
    setShippingForm({
      address: user?.address || "",
      state: user?.state_name || "",
      district: user?.district_name || "",
      pincode: user?.pincode || "",
      contact_name: user?.name || "",
      phone: user?.whatsapp || "",
      gst_number: epcGstin || user?.gstin || ""
    });
    setIsOrderModalOpen(true);
  };

  // Submit Order
  const handlePlaceOrder = async (e) => {
    e.preventDefault();
    if (!shippingForm.gst_number?.trim()) {
      setOrderError("GSTIN is mandatory to place a trial kit order.");
      return;
    }
    if (!shippingForm.address || !shippingForm.pincode || !shippingForm.phone) {
      setOrderError("Please fill address, pincode, and contact phone.");
      return;
    }

    try {
      setSubmittingOrder(true);
      setOrderError("");
      const payload = {
        combo_kit_id: selectedKit.combo_kit_id || selectedKit._id,
        kit_type: selectedKit.name || selectedKit.kit_type,
        shipping_address: shippingForm
      };
      const res = await axiosInstance.post("/india/v1/shop/trial-kits/order", payload);
      if (res.data?.success) {
        setOrderSuccess(res.data.message || "Trial kit order confirmed!");
        setTimeout(() => {
          setIsOrderModalOpen(false);
          fetchAvailability();
          fetchMyOrders();
          setActiveTab("orders");
        }, 1500);
      }
    } catch (err) {
      setOrderError(err.response?.data?.message || "Failed to place trial kit order.");
    } finally {
      setSubmittingOrder(false);
    }
  };

  // Open Feedback Modal
  const handleOpenFeedbackModal = (order) => {
    setFeedbackOrder(order);
    setFeedbackError("");
    setFeedbackSuccess("");
    setFeedbackForm({
      trial_kit_received_confirmation: true,
      product_quality_rating: order.feedback?.product_quality_rating || 5,
      installation_testing_experience: order.feedback?.installation_testing_experience || "",
      inverter_module_performance: order.feedback?.inverter_module_performance || "",
      technical_issue_complaint: order.feedback?.technical_issue_complaint || "",
      future_purchase_requirement: order.feedback?.future_purchase_requirement || "within_1_month",
      expected_monthly_kit_purchase_quantity: order.feedback?.expected_monthly_kit_purchase_quantity || 5,
      next_followup_date: order.feedback?.next_followup_date
        ? new Date(order.feedback.next_followup_date).toISOString().split("T")[0]
        : ""
    });
    setIsFeedbackModalOpen(true);
  };

  // Submit Feedback
  const handleSubmitFeedback = async (e) => {
    e.preventDefault();
    try {
      setSubmittingFeedback(true);
      setFeedbackError("");
      const res = await axiosInstance.post(
        `/india/v1/shop/trial-kits/my-orders/${feedbackOrder._id}/feedback`,
        feedbackForm
      );
      if (res.data?.success) {
        setFeedbackSuccess("Feedback submitted successfully. Thank you!");
        setTimeout(() => {
          setIsFeedbackModalOpen(false);
          fetchMyOrders();
        }, 1500);
      }
    } catch (err) {
      setFeedbackError(err.response?.data?.message || "Failed to submit feedback.");
    } finally {
      setSubmittingFeedback(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between pb-6 border-b border-gray-200 dark:border-gray-800 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <FaBoxes className="text-blue-600 dark:text-blue-400" />
            SolarKits Trial Kit Management
          </h1>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Test high-efficiency solar kits before commercial orders. One trial kit per EPC GST number.
          </p>
        </div>

        {/* GST Badge */}
        {epcGstin && (
          <div className="flex items-center gap-2 bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 px-3 py-1.5 rounded-lg text-xs font-semibold text-blue-800 dark:text-blue-300">
            <FiLock className="w-3.5 h-3.5" />
            <span>EPC GSTIN: {epcGstin}</span>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-4 mt-6 border-b border-gray-200 dark:border-gray-800">
        <button
          onClick={() => setActiveTab("available")}
          className={`pb-3 text-sm font-semibold border-b-2 transition-colors ${activeTab === "available"
              ? "border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400"
              : "border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400"
            }`}
        >
          Trial Kit Availability
        </button>
        <button
          onClick={() => setActiveTab("orders")}
          className={`pb-3 text-sm font-semibold border-b-2 transition-colors flex items-center gap-2 ${activeTab === "orders"
              ? "border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400"
              : "border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400"
            }`}
        >
          My Trial Orders
          {myOrders.length > 0 && (
            <span className="bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300 text-xs px-2 py-0.5 rounded-full">
              {myOrders.length}
            </span>
          )}
        </button>
      </div>

      {/* TAB 1: TRIAL KIT AVAILABILITY */}
      {activeTab === "available" && (
        <div className="mt-6">
          {loading ? (
            <div className="py-20 text-center text-gray-500">Loading trial kit availability...</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {kits.map((kit) => {
                const isAlreadyOrdered = kit.status === "already_ordered";
                const isAvailable = kit.status === "available";
                const isOutOfStock = kit.status === "out_of_stock";
                const coverUrl = resolveImageUrl(kit.kit_image);
                const kitTitle = kit.name || kit.kit_type;

                return (
                  <div
                    key={kit.combo_kit_id || kit._id || kit.kit_type}
                    className={`rounded-2xl border transition-all p-5 flex flex-col justify-between ${isAlreadyOrdered
                        ? "bg-gray-100 border-gray-300 text-gray-500 dark:bg-gray-800/60 dark:border-gray-700"
                        : isAvailable
                          ? "bg-white border-blue-200 dark:bg-gray-900 dark:border-gray-800 shadow-sm hover:shadow-md"
                          : "bg-white border-orange-200 dark:bg-gray-900 dark:border-gray-800"
                      }`}
                  >
                    <div>
                      {/* Top image & status badge */}
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <div className="w-14 h-14 rounded-xl border border-gray-200 bg-white p-1 flex items-center justify-center shrink-0 overflow-hidden shadow-xs">
                          {coverUrl ? (
                            <img
                              src={coverUrl}
                              alt={kitTitle}
                              className="w-full h-full object-contain"
                              onError={(e) => { e.target.style.display = 'none'; }}
                            />
                          ) : (
                            <FaBoxes className="text-xl text-blue-500 opacity-60" />
                          )}
                        </div>

                        <div className="text-right">
                          <span className="text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400 block">
                            {kit.capacity} System
                          </span>
                          {isAvailable && (
                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 mt-1">
                              <FiCheckCircle className="w-3 h-3" /> Available
                            </span>
                          )}
                          {isAlreadyOrdered && (
                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300 mt-1">
                              <FiLock className="w-3 h-3" /> Already Ordered
                            </span>
                          )}
                          {isOutOfStock && (
                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 mt-1">
                              <FiAlertCircle className="w-3 h-3" /> Out of Stock
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Kit Title */}
                      <h3
                        className={`text-base font-bold tracking-tight ${isAlreadyOrdered
                            ? "text-gray-600 dark:text-gray-400"
                            : "text-gray-900 dark:text-white"
                          }`}
                      >
                        {kitTitle}
                      </h3>
                      {kit.blueprint_name && (
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 font-medium">
                          {kit.blueprint_name}
                        </p>
                      )}

                      {/* Trial MOQ Tag & Configured Brands */}
                      <div className="flex flex-wrap items-center gap-1.5 mt-2.5">
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:border-emerald-800 dark:text-emerald-300">
                          ✓ TRIAL: {kit.trial_moq || 1} KITS
                        </span>
                        {kit.configured_brands?.map((b) => (
                          <span
                            key={b}
                            className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300 border border-gray-200 dark:border-gray-700"
                          >
                            {b}
                          </span>
                        ))}
                      </div>

                      {/* Stock Info */}
                      <div className="mt-4 pt-3 border-t border-gray-200/80 dark:border-gray-800 text-xs">
                        {isAvailable && (
                          <div>
                            <div className="text-emerald-700 dark:text-emerald-400 font-bold">
                              Stock Available: {kit.available_stock} Units
                            </div>
                            {kit.eligible_warehouses && kit.eligible_warehouses.length > 0 && (
                              <div className="text-[11px] text-gray-500 mt-1 flex flex-wrap gap-1">
                                <span>Warehouses:</span>
                                {kit.eligible_warehouses.map(w => (
                                  <span key={w.warehouse_id} className="font-semibold text-gray-700 dark:text-gray-300">
                                    {w.warehouse_name} ({w.available_stock})
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                        {isAlreadyOrdered && (
                          <div className="text-gray-500 italic">
                            {kit.status_message}
                          </div>
                        )}
                        {isOutOfStock && (
                          <div className="text-amber-700 dark:text-amber-400 font-medium">
                            {kit.status_message}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Action Button: No Add to Kit, Only Direct Trial Order */}
                    <div className="mt-5">
                      {isAvailable && (
                        <button
                          onClick={() => handleOpenOrderModal(kit)}
                          className="w-full py-2.5 px-4 rounded-xl font-semibold text-sm bg-blue-600 hover:bg-blue-700 text-white shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer"
                        >
                          <FiPackage className="w-4 h-4" />
                          Order Trial Kit
                        </button>
                      )}
                      {isAlreadyOrdered && (
                        <button
                          disabled
                          className="w-full py-2.5 px-4 rounded-xl font-semibold text-sm bg-gray-200 text-gray-500 dark:bg-gray-700 dark:text-gray-400 cursor-not-allowed flex items-center justify-center gap-2"
                        >
                          <FiLock className="w-4 h-4" />
                          Already Ordered
                        </button>
                      )}
                      {isOutOfStock && (
                        <button
                          disabled
                          className="w-full py-2.5 px-4 rounded-xl font-semibold text-sm bg-gray-100 text-gray-400 dark:bg-gray-800 dark:text-gray-500 border border-gray-200 dark:border-gray-700 cursor-not-allowed"
                        >
                          OUT OF STOCK
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: MY TRIAL ORDERS */}
      {activeTab === "orders" && (
        <div className="mt-6 space-y-4">
          {myOrders.length === 0 ? (
            <div className="text-center py-16 bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800">
              <FiPackage className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <h3 className="text-base font-semibold text-gray-900 dark:text-white">No Trial Orders Yet</h3>
              <p className="text-sm text-gray-500 mt-1">Order your eligible trial kit to test our technology.</p>
            </div>
          ) : (
            myOrders.map((order) => {
              const isDelivered = order.order_status === "delivered";
              const isDispatched = order.order_status === "dispatched";
              const isConfirmed = order.order_status === "confirmed";
              const isCancelled = order.order_status === "cancelled";
              const feedbackPending = order.feedback?.feedback_status === "pending";

              return (
                <div
                  key={order._id}
                  className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-5 shadow-sm"
                >
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-gray-100 dark:border-gray-800">
                    <div>
                      <div className="flex items-center gap-3">
                        <span className="font-bold text-gray-900 dark:text-white">
                          {order.order_number}
                        </span>
                        <span
                          className={`text-xs font-semibold px-2.5 py-0.5 rounded-full uppercase tracking-wider ${isDelivered
                              ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                              : isDispatched
                                ? "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300"
                                : isCancelled
                                  ? "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300"
                                  : "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                            }`}
                        >
                          {order.order_status}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        Ordered on {new Date(order.order_date).toLocaleDateString()} &bull; GSTIN: {order.gst_number}
                      </p>
                    </div>

                    {/* Delivery & Feedback actions */}
                    <div>
                      {isDelivered && feedbackPending && (
                        <button
                          onClick={() => handleOpenFeedbackModal(order)}
                          className="px-4 py-2 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm flex items-center gap-1.5"
                        >
                          <FiStar className="w-3.5 h-3.5" />
                          Submit Feedback
                        </button>
                      )}
                      {isDelivered && !feedbackPending && (
                        <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1">
                          <FiCheckCircle /> Feedback Submitted
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Order Details Body */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 text-xs">
                    <div>
                      <span className="text-gray-400 uppercase font-semibold">Kit Type</span>
                      <p className="font-medium text-gray-800 dark:text-gray-200 mt-0.5">{order.kit_type}</p>
                    </div>
                    <div>
                      <span className="text-gray-400 uppercase font-semibold">Allocated Warehouse</span>
                      <p className="font-medium text-gray-800 dark:text-gray-200 mt-0.5">{order.warehouse_name || "Central Warehouse"}</p>
                    </div>
                    <div>
                      <span className="text-gray-400 uppercase font-semibold">Shipping Address</span>
                      <p className="font-medium text-gray-800 dark:text-gray-200 mt-0.5 truncate">
                        {order.delivery_details?.shipping_address?.address}, {order.delivery_details?.shipping_address?.district} ({order.delivery_details?.shipping_address?.pincode})
                      </p>
                    </div>
                  </div>

                  {/* Tracking info if dispatched */}
                  {order.delivery_details?.tracking_number && (
                    <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-xl flex items-center justify-between text-xs text-blue-900 dark:text-blue-300">
                      <div className="flex items-center gap-2">
                        <FiTruck className="w-4 h-4" />
                        <span>
                          Courier: <strong>{order.delivery_details.courier_name || "Logistics"}</strong> &bull; Tracking: <strong>{order.delivery_details.tracking_number}</strong>
                        </span>
                      </div>
                      {order.delivery_details.tracking_url && (
                        <a
                          href={order.delivery_details.tracking_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-semibold underline hover:text-blue-700"
                        >
                          Track Shipment &rarr;
                        </a>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}

      {/* MODAL 1: ORDER CONFIRMATION */}
      {isOrderModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-900 rounded-3xl max-w-lg w-full p-6 border border-gray-200 dark:border-gray-800 shadow-2xl">
            <div className="flex items-center justify-between pb-4 border-b border-gray-100 dark:border-gray-800">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <FiPackage className="text-blue-600" />
                Confirm Trial Kit Order
              </h2>
              <button
                onClick={() => setIsOrderModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
              >
                <FiX className="w-5 h-5" />
              </button>
            </div>

            {orderError && (
              <div className="mt-4 p-3 rounded-xl bg-red-50 text-red-700 dark:bg-red-950/50 dark:text-red-300 text-xs flex items-center gap-2">
                <FiAlertCircle /> {orderError}
              </div>
            )}
            {orderSuccess && (
              <div className="mt-4 p-3 rounded-xl bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 text-xs flex items-center gap-2">
                <FiCheckCircle /> {orderSuccess}
              </div>
            )}

            <form onSubmit={handlePlaceOrder} className="mt-4 space-y-4 text-xs">
              <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-xl text-blue-900 dark:text-blue-300">
                <p className="font-semibold text-sm">{selectedKit?.name || selectedKit?.kit_type}</p>
                {selectedKit?.blueprint_name && (
                  <p className="text-xs text-blue-700 dark:text-blue-400 mt-0.5">{selectedKit.blueprint_name}</p>
                )}
                <p className="mt-1">
                  <strong>Notice:</strong> Once confirmed, this kit type will be permanently locked for GSTIN <strong>{shippingForm.gst_number}</strong>.
                </p>
              </div>

              <div>
                <label className="block text-gray-700 dark:text-gray-300 font-semibold mb-1">
                  EPC GSTIN Number (Mandatory)
                </label>
                <input
                  type="text"
                  required
                  value={shippingForm.gst_number}
                  onChange={(e) => setShippingForm({ ...shippingForm, gst_number: e.target.value.toUpperCase() })}
                  className="w-full px-3 py-2 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white font-mono"
                  placeholder="24AAAAA0000A1Z5"
                />
              </div>

              <div>
                <label className="block text-gray-700 dark:text-gray-300 font-semibold mb-1">
                  Delivery Site / Warehouse Address
                </label>
                <input
                  type="text"
                  required
                  value={shippingForm.address}
                  onChange={(e) => setShippingForm({ ...shippingForm, address: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                  placeholder="Street / Industrial Area address"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-gray-700 dark:text-gray-300 font-semibold mb-1">
                    District
                  </label>
                  <input
                    type="text"
                    required
                    value={shippingForm.district}
                    onChange={(e) => setShippingForm({ ...shippingForm, district: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-gray-700 dark:text-gray-300 font-semibold mb-1">
                    Pincode
                  </label>
                  <input
                    type="text"
                    required
                    value={shippingForm.pincode}
                    onChange={(e) => setShippingForm({ ...shippingForm, pincode: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                    placeholder="380001"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-gray-700 dark:text-gray-300 font-semibold mb-1">
                    Site Contact Person
                  </label>
                  <input
                    type="text"
                    required
                    value={shippingForm.contact_name}
                    onChange={(e) => setShippingForm({ ...shippingForm, contact_name: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-gray-700 dark:text-gray-300 font-semibold mb-1">
                    Contact Phone (WhatsApp)
                  </label>
                  <input
                    type="text"
                    required
                    value={shippingForm.phone}
                    onChange={(e) => setShippingForm({ ...shippingForm, phone: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                  />
                </div>
              </div>

              <div className="pt-4 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsOrderModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-gray-700 dark:text-gray-300 font-semibold hover:bg-gray-100 dark:hover:bg-gray-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingOrder}
                  className="px-5 py-2 rounded-xl text-white font-semibold bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
                >
                  {submittingOrder ? "Confirming..." : "Confirm Trial Kit Order"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: FEEDBACK SUBMISSION (Section 5 - 8 Specific Fields) */}
      {isFeedbackModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-900 rounded-3xl max-w-lg w-full p-6 border border-gray-200 dark:border-gray-800 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-gray-100 dark:border-gray-800">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <FiStar className="text-amber-500" />
                Trial Kit Performance Feedback
              </h2>
              <button
                onClick={() => setIsFeedbackModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
              >
                <FiX className="w-5 h-5" />
              </button>
            </div>

            {feedbackError && (
              <div className="mt-4 p-3 rounded-xl bg-red-50 text-red-700 text-xs flex items-center gap-2">
                <FiAlertCircle /> {feedbackError}
              </div>
            )}
            {feedbackSuccess && (
              <div className="mt-4 p-3 rounded-xl bg-emerald-50 text-emerald-700 text-xs flex items-center gap-2">
                <FiCheckCircle /> {feedbackSuccess}
              </div>
            )}

            <form onSubmit={handleSubmitFeedback} className="mt-4 space-y-4 text-xs">
              {/* Field 1: Received Confirmation */}
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="rcv"
                  checked={feedbackForm.trial_kit_received_confirmation}
                  onChange={(e) => setFeedbackForm({ ...feedbackForm, trial_kit_received_confirmation: e.target.checked })}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <label htmlFor="rcv" className="text-gray-700 dark:text-gray-300 font-semibold">
                  Trial kit received in good condition
                </label>
              </div>

              {/* Field 2: Product Quality Rating */}
              <div>
                <label className="block text-gray-700 dark:text-gray-300 font-semibold mb-1">
                  Product Quality Rating (1 - 5 Stars)
                </label>
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      type="button"
                      key={star}
                      onClick={() => setFeedbackForm({ ...feedbackForm, product_quality_rating: star })}
                      className={`p-2 rounded-lg border flex items-center gap-1 font-bold ${feedbackForm.product_quality_rating >= star
                          ? "bg-amber-50 border-amber-300 text-amber-600"
                          : "border-gray-200 text-gray-400"
                        }`}
                    >
                      <FiStar className="w-4 h-4 fill-current" /> {star}
                    </button>
                  ))}
                </div>
              </div>

              {/* Field 3: Installation & Testing Experience */}
              <div>
                <label className="block text-gray-700 dark:text-gray-300 font-semibold mb-1">
                  Installation / Testing Experience
                </label>
                <textarea
                  rows={2}
                  required
                  value={feedbackForm.installation_testing_experience}
                  onChange={(e) => setFeedbackForm({ ...feedbackForm, installation_testing_experience: e.target.value })}
                  placeholder="How was the assembly, plug-and-play wiring, and testing process?"
                  className="w-full px-3 py-2 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                />
              </div>

              {/* Field 4: Inverter & Module Performance */}
              <div>
                <label className="block text-gray-700 dark:text-gray-300 font-semibold mb-1">
                  Inverter and Module Performance Feedback
                </label>
                <textarea
                  rows={2}
                  required
                  value={feedbackForm.inverter_module_performance}
                  onChange={(e) => setFeedbackForm({ ...feedbackForm, inverter_module_performance: e.target.value })}
                  placeholder="Output generation, grid synchronization, temperature coefficient, etc."
                  className="w-full px-3 py-2 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                />
              </div>

              {/* Field 5: Technical Issues / Complaints */}
              <div>
                <label className="block text-gray-700 dark:text-gray-300 font-semibold mb-1">
                  Any Technical Issue or Complaint
                </label>
                <input
                  type="text"
                  value={feedbackForm.technical_issue_complaint}
                  onChange={(e) => setFeedbackForm({ ...feedbackForm, technical_issue_complaint: e.target.value })}
                  placeholder="None / specify if any component was missing or damaged"
                  className="w-full px-3 py-2 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                />
              </div>

              {/* Field 6: Future Purchase Requirement */}
              <div>
                <label className="block text-gray-700 dark:text-gray-300 font-semibold mb-1">
                  Future Purchase Requirement
                </label>
                <select
                  value={feedbackForm.future_purchase_requirement}
                  onChange={(e) => setFeedbackForm({ ...feedbackForm, future_purchase_requirement: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                >
                  <option value="immediate">Immediate (Ready for Commercial Quote)</option>
                  <option value="within_1_month">Within 1 Month</option>
                  <option value="within_3_months">Within 3 Months</option>
                  <option value="none">Not at this time</option>
                </select>
              </div>

              {/* Field 7: Expected Monthly Purchase Quantity */}
              <div>
                <label className="block text-gray-700 dark:text-gray-300 font-semibold mb-1">
                  Expected Monthly Kit Purchase Quantity
                </label>
                <input
                  type="number"
                  min="0"
                  required
                  value={feedbackForm.expected_monthly_kit_purchase_quantity}
                  onChange={(e) => setFeedbackForm({ ...feedbackForm, expected_monthly_kit_purchase_quantity: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                />
              </div>

              {/* Field 8: Next Follow-up Date */}
              <div>
                <label className="block text-gray-700 dark:text-gray-300 font-semibold mb-1">
                  Preferred Next Follow-up Date
                </label>
                <input
                  type="date"
                  value={feedbackForm.next_followup_date}
                  onChange={(e) => setFeedbackForm({ ...feedbackForm, next_followup_date: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                />
              </div>

              <div className="pt-4 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsFeedbackModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-gray-700 dark:text-gray-300 font-semibold hover:bg-gray-100 dark:hover:bg-gray-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingFeedback}
                  className="px-5 py-2 rounded-xl text-white font-semibold bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50"
                >
                  {submittingFeedback ? "Submitting..." : "Submit Feedback"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
