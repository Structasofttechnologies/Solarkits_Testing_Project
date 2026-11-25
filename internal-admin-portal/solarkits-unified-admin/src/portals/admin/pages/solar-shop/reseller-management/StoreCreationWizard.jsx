import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useDispatch } from "react-redux";
import { motion, AnimatePresence } from "framer-motion";
import axios from "axios";
import { FaStore } from "react-icons/fa";
import {
  FiArrowRight,
  FiArrowLeft,
  FiCheck,
  FiUser,
  FiPhone,
  FiMail,
  FiMapPin,
  FiShield,
  FiLayers,
  FiDollarSign,
  FiFileText,
  FiTruck,
  FiLock,
  FiAlertCircle,
  FiLoader,
} from "react-icons/fi";
import { authHeaderObj } from "@/app/authHeader";
import { setAlert } from "../../../features/alert.slice";

const API_BASE = import.meta.env.VITE_API_URL;

const getOrderTypeDisplay = (type) => {
  let types = [];
  if (Array.isArray(type)) types = type;
  else if (typeof type === "string") types = type === "both" ? ["po_order", "loose_order"] : type.split(",").map((s) => s.trim());
  else types = ["po_order"];

  const map = {
    loose_order: "Loose Order",
    combine_po_order: "Combine PO Order",
    combined_po_orders: "Combine PO Order",
    po_order: "PO Order",
  };

  const labels = types.map((t) => map[t]).filter(Boolean);
  return labels.length > 0 ? labels.join(", ") : "PO Order";
};

export default function StoreCreationWizard() {
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Loaded Options
  const [plans, setPlans] = useState([]);
  const [subtypes, setSubtypes] = useState([]);
  const [bdes, setBdes] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [clusters, setClusters] = useState([]);

  // Form State
  const [formData, setFormData] = useState({
    store_category: "franchisee_store", // "franchisee_store" | "company_store"
    franchisee_subtype_id: "",
    plan_id: "",
    cluster_id: "",
    business_name: "",
    contact_person: "",
    mobile: "",
    email: "",
    gst_number: "",
    pan_number: "",
    aadhaar_masked: "",
    password: "Store@1234",
    security_pin: "1234",
    address_line: "",
    city: "",
    pincode: "",
    company_store_bde_id: "",
    bde_id: "",
    warehouse_id: "",
  });

  // Fetch initial master data
  useEffect(() => {
    const fetchMasterData = async () => {
      setLoading(true);
      try {
        const headers = authHeaderObj();
        const [plansRes, subtypesRes, bdesRes, whRes, clustersRes] = await Promise.all([
          axios.get(`${API_BASE}/resellers/plans/list?active_only=true`, { headers }),
          axios.get(`${API_BASE}/store-management/subtypes/list?active_only=true`, { headers }),
          axios
            .get(`${API_BASE}/store-management/bde/list?unique_id=RSL_MGMT&req_for=view`, { headers })
            .catch(() =>
              axios.get(`${API_BASE}/bde/list?unique_id=RSL_MGMT&req_for=view&limit=100`, { headers }).catch(() => null)
            ),
          axios.get(`${API_BASE}/store-management/warehouses/list?active_only=true`, { headers }),
          axios
            .get(`${API_BASE}/franchise-clusters/list`, { headers })
            .catch(() => ({ data: { data: [] } })),
        ]);

        if (plansRes?.data?.data) setPlans(plansRes.data.data);
        if (subtypesRes?.data?.data) setSubtypes(subtypesRes.data.data);
        const loadedBdes = bdesRes?.data?.data || bdesRes?.data?.coordinators || [];
        if (loadedBdes) setBdes(loadedBdes);
        if (whRes?.data?.data) setWarehouses(whRes.data.data);
        if (clustersRes?.data?.data) setClusters(clustersRes.data.data);
      } catch (err) {
        console.error("Failed to load setup metadata:", err);
        dispatch(
          setAlert({
            show: true,
            type: "error",
            message: "Failed to load master configuration options.",
          })
        );
      } finally {
        setLoading(false);
      }
    };

    fetchMasterData();
  }, [dispatch]);

  // Filter plans based on selected store category
  const filteredPlans = plans.filter((p) => {
    if (formData.store_category === "company_store") {
      return p.store_category === "company_store";
    }
    return !p.store_category || p.store_category === "franchisee_store";
  });

  const selectedPlan = plans.find((p) => (p.id || p._id) === formData.plan_id);
  const selectedCluster = clusters.find((c) => String(c._id || c.id) === String(formData.cluster_id));

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
      // If store category changes, reset plan selection
      ...(name === "store_category" ? { plan_id: "", franchisee_subtype_id: "" } : {}),
    }));
  };

  const validateStep = (step) => {
    if (step === 1) {
      if (!formData.plan_id) {
        dispatch(setAlert({ show: true, type: "error", message: "Please select a Commercial Plan." }));
        return false;
      }
      return true;
    }
    if (step === 2) {
      if (!formData.business_name.trim()) {
        dispatch(setAlert({ show: true, type: "error", message: "Business / Store name is required." }));
        return false;
      }
      if (!formData.mobile.trim() || formData.mobile.length < 10) {
        dispatch(setAlert({ show: true, type: "error", message: "Valid 10-digit mobile number is required." }));
        return false;
      }
      if (!formData.email.trim() || !formData.email.includes("@")) {
        dispatch(setAlert({ show: true, type: "error", message: "Valid email address is required." }));
        return false;
      }
      return true;
    }
    if (step === 3) {
      if (!formData.address_line.trim()) {
        dispatch(setAlert({ show: true, type: "error", message: "Store address is required." }));
        return false;
      }
      if (!formData.city.trim()) {
        dispatch(setAlert({ show: true, type: "error", message: "City is required." }));
        return false;
      }
      if (!formData.pincode.trim() || formData.pincode.length < 6) {
        dispatch(setAlert({ show: true, type: "error", message: "Valid 6-digit pincode is required." }));
        return false;
      }
      return true;
    }
    if (step === 4) {
      if (formData.store_category === "company_store" && selectedPlan?.bde_assignment_mandatory && !formData.company_store_bde_id) {
        dispatch(setAlert({ show: true, type: "error", message: "Direct BDE assignment is mandatory for this Company Store plan." }));
        return false;
      }
      return true;
    }
    return true;
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      setCurrentStep((prev) => Math.min(prev + 1, 5));
    }
  };

  const handleBack = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 1));
  };

  const handleSubmit = async () => {
    if (!validateStep(4)) return;
    setSubmitting(true);

    try {
      const payload = {
        store_category: formData.store_category,
        franchisee_subtype_id: formData.franchisee_subtype_id || undefined,
        plan_id: formData.plan_id,
        cluster_id: formData.cluster_id || undefined,
        business_name: formData.business_name.trim(),
        contact_person: formData.contact_person.trim() || undefined,
        mobile: formData.mobile.trim(),
        email: formData.email.trim().toLowerCase(),
        gst_number: formData.gst_number.trim().toUpperCase() || undefined,
        pan_number: formData.pan_number.trim().toUpperCase() || undefined,
        aadhaar_masked: formData.aadhaar_masked.trim() || undefined,
        password: formData.password || "Store@1234",
        security_pin: formData.security_pin || "1234",
        address: {
          line: formData.address_line.trim(),
          city: formData.city.trim(),
          pincode: formData.pincode.trim(),
        },
        company_store_bde_id: formData.company_store_bde_id || undefined,
        bde_id: formData.bde_id || undefined,
        warehouse_id: formData.warehouse_id || undefined,
      };

      const res = await axios.post(
        `${API_BASE}/store-management/onboarding/create?unique_id=RSL_MGMT&req_for=add`,
        payload,
        { headers: authHeaderObj() }
      );

      if (res.data?.status === "success") {
        dispatch(
          setAlert({
            show: true,
            type: "success",
            message: `Store "${formData.business_name}" initialized successfully!`,
          })
        );
        navigate("/admin-panel/solar-shop/reseller-management/onboarding");
      }
    } catch (err) {
      console.error("Store creation failed:", err);
      const errorMsg = err.response?.data?.message || "Failed to initialize store.";
      dispatch(
        setAlert({
          show: true,
          type: "error",
          message: errorMsg,
        })
      );
      if (err.response?.status === 409) {
        // Conflict on mobile or email: switch user back to Step 2 to fix it
        setCurrentStep(2);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const steps = [
    { number: 1, title: "Category & Plan", icon: <FiLayers /> },
    { number: 2, title: "Business Identity", icon: <FiUser /> },
    { number: 3, title: "Location Details", icon: <FiMapPin /> },
    { number: 4, title: "Fulfillment & BDE", icon: <FiTruck /> },
    { number: 5, title: "Review & Confirm", icon: <FiCheck /> },
  ];

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-6 text-slate-800 dark:text-slate-100">
      {/* Header */}
      <div className="max-w-5xl mx-auto mb-8">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-gradient-to-tr from-amber-500 to-orange-500 text-white shadow-lg shadow-amber-500/20">
                <FaStore className="text-2xl" />
              </div>
              <div>
                <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                  Onboard New Store
                </h1>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Step-by-step wizard to initialize Company and Franchisee Stores with commercial rules
                </p>
              </div>
            </div>
          </div>
          <button
            onClick={() => navigate("/admin-panel/solar-shop/reseller-management/onboarding")}
            className="px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg transition"
          >
            Cancel & Back
          </button>
        </div>

        {/* Stepper Header */}
        <div className="mt-8 grid grid-cols-5 gap-2">
          {steps.map((s) => {
            const isActive = currentStep === s.number;
            const isCompleted = currentStep > s.number;
            return (
              <div
                key={s.number}
                className={`flex flex-col items-center p-3 rounded-xl border transition-all ${
                  isActive
                    ? "bg-amber-50 dark:bg-amber-950/40 border-amber-500 text-amber-700 dark:text-amber-400 font-semibold shadow-sm"
                    : isCompleted
                    ? "bg-emerald-50 dark:bg-emerald-950/30 border-emerald-400 text-emerald-700 dark:text-emerald-400"
                    : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-400"
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-base">{s.icon}</span>
                  <span className="text-xs uppercase tracking-wider">Step {s.number}</span>
                </div>
                <span className="text-xs text-center truncate w-full">{s.title}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Main Form Content */}
      <div className="max-w-5xl mx-auto bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-8">
        {loading ? (
          <div className="py-24 text-center">
            <FiLoader className="text-4xl text-amber-500 animate-spin mx-auto mb-4" />
            <p className="text-slate-500 dark:text-slate-400">Loading store configuration data...</p>
          </div>
        ) : (
          <AnimatePresence mode="wait">
            {/* STEP 1: CATEGORY & PLAN */}
            {currentStep === 1 && (
              <motion.div
                key="step1"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div>
                  <h2 className="text-lg font-bold text-slate-900 dark:text-white">Store Category & Commercial Plan</h2>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    Select whether this store is directly operated by SolarKits or an authorized Franchisee Partner
                  </p>
                </div>

                {/* Category Radio Cards */}
                <div className="grid grid-cols-2 gap-4">
                  <label
                    className={`flex items-start p-5 rounded-xl border-2 cursor-pointer transition-all ${
                      formData.store_category === "franchisee_store"
                        ? "border-amber-500 bg-amber-50/50 dark:bg-amber-950/20 shadow-md shadow-amber-500/5"
                        : "border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700"
                    }`}
                  >
                    <input
                      type="radio"
                      name="store_category"
                      value="franchisee_store"
                      checked={formData.store_category === "franchisee_store"}
                      onChange={handleChange}
                      className="mt-1 text-amber-600 focus:ring-amber-500"
                    />
                    <div className="ml-3">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900 dark:text-white">Franchisee Store</span>
                        <span className="px-2 py-0.5 text-[11px] font-semibold bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300 rounded-full">
                          Commercial Partner
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                        Third-party investor / entrepreneur with commission incentives, setup fees, and formal Franchise Agreement.
                      </p>
                    </div>
                  </label>

                  <label
                    className={`flex items-start p-5 rounded-xl border-2 cursor-pointer transition-all ${
                      formData.store_category === "company_store"
                        ? "border-amber-500 bg-amber-50/50 dark:bg-amber-950/20 shadow-md shadow-amber-500/5"
                        : "border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700"
                    }`}
                  >
                    <input
                      type="radio"
                      name="store_category"
                      value="company_store"
                      checked={formData.store_category === "company_store"}
                      onChange={handleChange}
                      className="mt-1 text-amber-600 focus:ring-amber-500"
                    />
                    <div className="ml-3">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900 dark:text-white">Company Store</span>
                        <span className="px-2 py-0.5 text-[11px] font-semibold bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-300 rounded-full">
                          SolarKits Direct
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                        Direct company retail outlet managed by dedicated BDE, zero setup fees, and direct corporate fulfillment.
                      </p>
                    </div>
                  </label>
                </div>

                {/* Subtype Dropdown (Franchisee Only) */}
                {formData.store_category === "franchisee_store" && (
                  <div>
                    <label className="block text-sm font-semibold mb-2">
                      Franchisee Subtype <span className="text-slate-400 font-normal">(Optional classification)</span>
                    </label>
                    <select
                      name="franchisee_subtype_id"
                      value={formData.franchisee_subtype_id}
                      onChange={handleChange}
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 focus:ring-2 focus:ring-amber-500 outline-none text-sm"
                    >
                      <option value="">-- Select Subtype / Category --</option>
                      {subtypes.map((st) => (
                        <option key={st.id || st._id} value={st.id || st._id}>
                          {st.name} {st.category_level ? `(${st.category_level})` : ""}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Commercial Plan Selection */}
                <div>
                  <label className="block text-sm font-semibold mb-2">
                    Commercial Plan <span className="text-red-500">*</span>
                  </label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {filteredPlans.map((p) => {
                      const isSelected = formData.plan_id === (p.id || p._id);
                      const feeAmount = p.setup_cost_amount != null ? Number(p.setup_cost_amount) : Number(p.one_time_fee || 0);
                      const hasSetupCost = p.setup_cost_enabled !== false && feeAmount > 0;
                      const isCommissionOn = p.commission_enabled !== false;

                      return (
                        <div
                          key={p.id || p._id}
                          onClick={() => setFormData((prev) => ({ ...prev, plan_id: p.id || p._id }))}
                          className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                            isSelected
                              ? "border-amber-500 bg-amber-50/40 dark:bg-amber-950/20 shadow-sm"
                              : "border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-slate-900"
                          }`}
                        >
                          <div className="flex items-center justify-between mb-2 gap-2">
                            <div>
                              <div className="font-bold text-slate-900 dark:text-white">{p.name}</div>
                              {p.slug && <div className="text-[11px] text-slate-400 font-mono">{p.slug}</div>}
                            </div>
                            <span
                              className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full shrink-0 border ${
                                formData.store_category === "company_store"
                                  ? "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700"
                                  : "bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 border-blue-200 dark:border-blue-800"
                              }`}
                            >
                              {formData.store_category === "company_store" ? "Fee: Waived" : "Fee: Cluster-Based"}
                            </span>
                          </div>

                          <div className="grid grid-cols-2 gap-2 text-xs text-slate-600 dark:text-slate-400 mt-3 pt-3 border-t border-slate-200 dark:border-slate-800">
                            <div>
                              <span className="text-slate-400">Commission:</span>{" "}
                              <span className={`font-semibold ${isCommissionOn ? "text-emerald-600 dark:text-emerald-400" : "text-slate-500"}`}>
                                {isCommissionOn ? "Enabled" : "Disabled"}
                              </span>
                            </div>
                            <div>
                              <span className="text-slate-400">Order Allocation:</span>{" "}
                              <span className="font-semibold">{getOrderTypeDisplay(p.order_type_allowed || p.order_type_allocation)}</span>
                            </div>
                            <div>
                              <span className="text-slate-400">EPC Scope:</span>{" "}
                              <span className="font-semibold capitalize">{p.epc_onboarding_scope || p.territory_level || "District"}</span>
                            </div>
                            <div>
                              <span className="text-slate-400">Warehouse Req:</span>{" "}
                              <span className="font-semibold">
                                {p.warehouse_required
                                  ? `${p.warehouse_count || 1} WH${p.warehouse_space_sqft > 0 ? ` (${Number(p.warehouse_space_sqft).toLocaleString("en-IN")} sq.ft.)` : ""}`
                                  : "No WH Req."}
                              </span>
                            </div>
                            <div className="col-span-2 pt-1 border-t border-slate-100 dark:border-slate-800/60 flex items-center justify-between text-[11px]">
                              <span className="text-slate-400">Plan Validity:</span>{" "}
                              <span className="font-medium text-slate-600 dark:text-slate-300">
                                {p.validity_value ? `${p.validity_value} ${p.validity_unit || "years"}` : (p.billing_cycle || "Annual")}
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  {filteredPlans.length === 0 && (
                    <p className="text-sm text-red-500 mt-2">
                      No commercial plans available for this store category. Please configure plans in Store Type Settings first.
                    </p>
                  )}
                </div>

                {/* Franchisee Cluster Selection (Cluster-Wise Pricing Model) */}
                {formData.store_category === "franchisee_store" && (
                  <div className="pt-2">
                    <label className="block text-sm font-semibold mb-2 flex items-center justify-between">
                      <span>Assign Franchisee Cluster (Territory & Setup Fee)</span>
                      <span className="text-xs text-amber-600 font-bold">New Business Model</span>
                    </label>
                    <select
                      name="cluster_id"
                      value={formData.cluster_id}
                      onChange={(e) => {
                        const cId = e.target.value;
                        const clu = clusters.find((c) => String(c._id || c.id) === cId);
                        setFormData((prev) => ({
                          ...prev,
                          cluster_id: cId,
                          ...(clu?.primary_bde_id && !prev.bde_id ? { bde_id: clu.primary_bde_id._id || clu.primary_bde_id } : {}),
                        }));
                      }}
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 focus:ring-2 focus:ring-amber-500 outline-none text-sm font-semibold"
                    >
                      <option value="">-- Select Franchisee Cluster (or Assign Later) --</option>
                      {clusters.map((c) => (
                        <option key={c._id || c.id} value={c._id || c.id}>
                          {c.cluster_name} ({c.cluster_code}) • {c.state_id?.name || 'India'} • Total Payable: ₹{Number(c.total_payable || c.setup_fee || 0).toLocaleString('en-IN')} [{c.status}]
                        </option>
                      ))}
                    </select>

                    {/* Selected Cluster Details Micro-Card */}
                    {selectedCluster && (
                      <div className="mt-3 p-4 bg-emerald-50/70 dark:bg-emerald-950/30 rounded-2xl border border-emerald-200 dark:border-emerald-800 text-xs">
                        <div className="flex items-center justify-between pb-2 border-b border-emerald-200/60 dark:border-emerald-800/60">
                          <span className="font-extrabold text-emerald-900 dark:text-emerald-200 text-sm">
                            {selectedCluster.cluster_name} ({selectedCluster.cluster_code})
                          </span>
                          <span className="px-2 py-0.5 rounded-md font-bold uppercase text-[10px] bg-emerald-200 text-emerald-900">
                            {selectedCluster.status}
                          </span>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mt-2.5 text-slate-700 dark:text-slate-300">
                          <div>
                            <span className="text-[11px] text-slate-400 block">Franchise Setup Fee</span>
                            <span className="font-bold text-slate-900 dark:text-white">₹{Number(selectedCluster.setup_fee || 0).toLocaleString('en-IN')}</span>
                          </div>
                          <div>
                            <span className="text-[11px] text-slate-400 block">Security Deposit</span>
                            <span className="font-bold text-slate-900 dark:text-white">₹{Number(selectedCluster.security_deposit || 0).toLocaleString('en-IN')}</span>
                          </div>
                          <div>
                            <span className="text-[11px] text-slate-400 block">Renewal Fee</span>
                            <span className="font-bold text-slate-900 dark:text-white">₹{Number(selectedCluster.renewal_fee || 0).toLocaleString('en-IN')}</span>
                          </div>
                          <div>
                            <span className="text-[11px] text-emerald-700 dark:text-emerald-400 font-bold block">Total Payable</span>
                            <span className="font-black text-sm text-emerald-600 dark:text-emerald-300">₹{Number(selectedCluster.total_payable || selectedCluster.setup_fee || 0).toLocaleString('en-IN')}</span>
                          </div>
                        </div>
                        <div className="mt-2 text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-2">
                          <span>Agreement Duration: <strong>{selectedCluster.agreement_period_years || 2} Years</strong></span>
                          {selectedCluster.primary_bde_id && (
                            <span>• Primary BDE: <strong>{selectedCluster.primary_bde_id.full_name || selectedCluster.primary_bde_id.name || 'Assigned'}</strong></span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </motion.div>
            )}

            {/* STEP 2: BUSINESS IDENTITY */}
            {currentStep === 2 && (
              <motion.div
                key="step2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div>
                  <h2 className="text-lg font-bold text-slate-900 dark:text-white">Store Identity & Legal Details</h2>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    Enter the authorized business entity details, contact information, and initial credentials
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold mb-1">
                      Store / Business Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="business_name"
                      value={formData.business_name}
                      onChange={handleChange}
                      placeholder="e.g. SolarKits Green Energy Hub"
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 focus:ring-2 focus:ring-amber-500 outline-none text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold mb-1">Contact Person</label>
                    <input
                      type="text"
                      name="contact_person"
                      value={formData.contact_person}
                      onChange={handleChange}
                      placeholder="e.g. Rajesh Kumar"
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 focus:ring-2 focus:ring-amber-500 outline-none text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold mb-1">
                      Mobile Number <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="mobile"
                      value={formData.mobile}
                      onChange={handleChange}
                      placeholder="10-digit mobile number"
                      maxLength={10}
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 focus:ring-2 focus:ring-amber-500 outline-none text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold mb-1">
                      Email Address <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      placeholder="store@domain.com"
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 focus:ring-2 focus:ring-amber-500 outline-none text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold mb-1">GST Number</label>
                    <input
                      type="text"
                      name="gst_number"
                      value={formData.gst_number}
                      onChange={handleChange}
                      placeholder="22AAAAA0000A1Z5"
                      maxLength={15}
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 focus:ring-2 focus:ring-amber-500 outline-none text-sm uppercase"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold mb-1">PAN Number</label>
                    <input
                      type="text"
                      name="pan_number"
                      value={formData.pan_number}
                      onChange={handleChange}
                      placeholder="ABCDE1234F"
                      maxLength={10}
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 focus:ring-2 focus:ring-amber-500 outline-none text-sm uppercase"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold mb-1">Default Password</label>
                    <input
                      type="text"
                      name="password"
                      value={formData.password}
                      onChange={handleChange}
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 focus:ring-2 focus:ring-amber-500 outline-none text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold mb-1">4-Digit Security PIN</label>
                    <input
                      type="text"
                      name="security_pin"
                      value={formData.security_pin}
                      onChange={handleChange}
                      maxLength={4}
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 focus:ring-2 focus:ring-amber-500 outline-none text-sm"
                    />
                  </div>
                </div>
              </motion.div>
            )}

            {/* STEP 3: LOCATION DETAILS */}
            {currentStep === 3 && (
              <motion.div
                key="step3"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div>
                  <h2 className="text-lg font-bold text-slate-900 dark:text-white">Store Physical Location</h2>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    Enter the complete retail store address and regional coordinates
                  </p>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold mb-1">
                      Shop / Premise Address <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      name="address_line"
                      value={formData.address_line}
                      onChange={handleChange}
                      rows={3}
                      placeholder="Shop No., Commercial Complex, Main Road..."
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 focus:ring-2 focus:ring-amber-500 outline-none text-sm"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold mb-1">
                        City / Town <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        name="city"
                        value={formData.city}
                        onChange={handleChange}
                        placeholder="e.g. Pune"
                        className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 focus:ring-2 focus:ring-amber-500 outline-none text-sm"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-semibold mb-1">
                        Pincode <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        name="pincode"
                        value={formData.pincode}
                        onChange={handleChange}
                        placeholder="e.g. 411001"
                        maxLength={6}
                        className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 focus:ring-2 focus:ring-amber-500 outline-none text-sm"
                      />
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* STEP 4: FULFILLMENT & BDE ASSIGNMENT */}
            {currentStep === 4 && (
              <motion.div
                key="step4"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div>
                  <h2 className="text-lg font-bold text-slate-900 dark:text-white">Fulfillment & Operations Setup</h2>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    Assign dedicated BDE and allocate primary warehouse for inventory supply
                  </p>
                </div>

                <div className="space-y-5">
                  {/* BDE Assignment */}
                  <div>
                    <label className="block text-sm font-semibold mb-1">
                      {formData.store_category === "company_store"
                        ? "Company Store Dedicated BDE"
                        : "Attributed BDE / Account Manager"}
                      {formData.store_category === "company_store" && selectedPlan?.bde_assignment_mandatory && (
                        <span className="text-red-500"> * (Mandatory for this plan)</span>
                      )}
                    </label>
                    <select
                      name={formData.store_category === "company_store" ? "company_store_bde_id" : "bde_id"}
                      value={
                        formData.store_category === "company_store"
                          ? formData.company_store_bde_id
                          : formData.bde_id
                      }
                      onChange={handleChange}
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 focus:ring-2 focus:ring-amber-500 outline-none text-sm"
                    >
                      <option value="">-- Select BDE Profile --</option>
                      {bdes.map((b) => (
                        <option key={b.id || b._id} value={b.id || b._id}>
                          {b.name || b.full_name} ({b.employee_id || b.bde_id || "BDE"}){b.mobile || b.mobile_number ? ` — ${b.mobile || b.mobile_number}` : ""}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Warehouse Allocation */}
                  <div>
                    <label className="block text-sm font-semibold mb-1">
                      Primary Supply Warehouse <span className="text-slate-400 font-normal">(Optional during creation)</span>
                    </label>
                    <select
                      name="warehouse_id"
                      value={formData.warehouse_id}
                      onChange={handleChange}
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 focus:ring-2 focus:ring-amber-500 outline-none text-sm"
                    >
                      <option value="">-- Allocate Warehouse Later --</option>
                      {warehouses.map((w) => (
                        <option key={w.id || w._id} value={w.id || w._id}>
                          {w.warehouse_code} — {w.address || "Main Depot"} ({w.pincode})
                        </option>
                      ))}
                    </select>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                      Stores must have a verified allocated warehouse before final operational activation.
                    </p>
                  </div>
                </div>
              </motion.div>
            )}

            {/* STEP 5: REVIEW & CONFIRM */}
            {currentStep === 5 && (
              <motion.div
                key="step5"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div>
                  <h2 className="text-lg font-bold text-slate-900 dark:text-white">Review & Confirm Store Onboarding</h2>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    Verify all Commercial rules, identity credentials, and operational allocations before creation
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Category & Plan Summary */}
                  <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 space-y-2 text-sm">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Commercial Setup</span>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Category:</span>
                      <span className="font-semibold capitalize">{formData.store_category.replace("_", " ")}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Commercial Plan:</span>
                      <span className="font-semibold">{selectedPlan?.name || "N/A"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Franchisee Setup Fee:</span>
                      <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                        {formData.store_category === "company_store"
                          ? "Zero Fee (Company Owned)"
                          : selectedCluster
                          ? `₹${Number(selectedCluster.total_payable || selectedCluster.setup_fee || 0).toLocaleString("en-IN")} (${selectedCluster.cluster_name})`
                          : "Cluster-Configured Fee"}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Commission:</span>
                      <span className="font-semibold">{selectedPlan?.commission_enabled !== false ? "Enabled" : "Disabled"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Order Allocation:</span>
                      <span className="font-semibold">{getOrderTypeDisplay(selectedPlan?.order_type_allowed || selectedPlan?.order_type_allocation)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Warehouse Req:</span>
                      <span className="font-semibold">
                        {selectedPlan?.warehouse_required
                          ? `${selectedPlan.warehouse_count || 1} WH${selectedPlan.warehouse_space_sqft > 0 ? ` (${Number(selectedPlan.warehouse_space_sqft).toLocaleString("en-IN")} sq.ft.)` : ""}`
                          : "No WH Req."}
                      </span>
                    </div>
                  </div>

                  {/* Identity Summary */}
                  <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 space-y-2 text-sm">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Store Identity</span>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Business Name:</span>
                      <span className="font-semibold">{formData.business_name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Mobile:</span>
                      <span className="font-semibold">{formData.mobile}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Email:</span>
                      <span className="font-semibold">{formData.email}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">GST:</span>
                      <span className="font-semibold">{formData.gst_number || "Not provided"}</span>
                    </div>
                  </div>

                  {/* Location Summary */}
                  <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 space-y-2 text-sm">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Store Address</span>
                    <p className="text-slate-700 dark:text-slate-300 font-medium">{formData.address_line}</p>
                    <p className="text-slate-500 text-xs">
                      {formData.city}, Pincode: {formData.pincode}
                    </p>
                  </div>

                  {/* Operations Summary */}
                  <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 space-y-2 text-sm">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Operations & Logistics</span>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Assigned BDE:</span>
                      <span className="font-semibold">
                        {bdes.find((b) => (b.id || b._id) === (formData.company_store_bde_id || formData.bde_id))?.name ||
                         bdes.find((b) => (b.id || b._id) === (formData.company_store_bde_id || formData.bde_id))?.full_name ||
                         "Pending Assignment"}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Supply Warehouse:</span>
                      <span className="font-semibold">
                        {warehouses.find((w) => (w.id || w._id) === formData.warehouse_id)?.warehouse_code || "Pending Allocation"}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Initial State:</span>
                      <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300">
                        store_created
                      </span>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        )}

        {/* Footer Navigation Buttons */}
        <div className="flex items-center justify-between pt-6 mt-8 border-t border-slate-200 dark:border-slate-800">
          <button
            type="button"
            disabled={currentStep === 1 || submitting}
            onClick={handleBack}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-medium text-sm transition ${
              currentStep === 1
                ? "opacity-40 cursor-not-allowed text-slate-400"
                : "text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
            }`}
          >
            <FiArrowLeft /> Back
          </button>

          {currentStep < 5 ? (
            <button
              type="button"
              onClick={handleNext}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl font-semibold text-sm bg-amber-500 hover:bg-amber-600 text-white shadow-md shadow-amber-500/20 transition"
            >
              Next Step <FiArrowRight />
            </button>
          ) : (
            <button
              type="button"
              disabled={submitting}
              onClick={handleSubmit}
              className="flex items-center gap-2 px-7 py-2.5 rounded-xl font-semibold text-sm bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-600/20 transition disabled:opacity-50"
            >
              {submitting ? (
                <>
                  <FiLoader className="animate-spin" /> Creating Store...
                </>
              ) : (
                <>
                  <FiCheck /> Confirm & Initialize Store
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
