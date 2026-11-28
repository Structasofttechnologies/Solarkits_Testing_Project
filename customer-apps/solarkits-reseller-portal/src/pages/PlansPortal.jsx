import { useState, useEffect } from "react";
import { useOutletContext } from "react-router-dom";
import api from "../services/api";
import {
  FiZap, FiCheckCircle, FiLoader, FiCreditCard, FiShield,
  FiAlertCircle, FiX, FiChevronRight, FiChevronLeft,
  FiBriefcase, FiUser, FiHash, FiMapPin, FiSmartphone,
} from "react-icons/fi";

const RAZORPAY_KEY = import.meta.env.VITE_RAZORPAY_KEY_ID || "rzp_test_T8B85UkbvoXBOQ";

const formatOrderTypes = (ot) => {
  let types = [];
  if (Array.isArray(ot)) types = ot;
  else if (typeof ot === "string") types = ot === "both" ? ["po_order", "loose_order"] : ot.split(",").map((s) => s.trim());
  else types = ["po_order"];

  const map = {
    loose_order: "Loose Order",
    combine_po_order: "Combine PO Order",
    po_order: "PO Order",
  };
  const labels = types.map((t) => map[t]).filter(Boolean);
  return labels.length > 0 ? labels.join(", ") : "PO Order";
};

// ─── Load Razorpay Script ──────────────────────────────────────────────────────
function loadRazorpayScript() {
  return new Promise((resolve) => {
    if (window.Razorpay) return resolve(true);
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

// ─── Bank Details Form ────────────────────────────────────────────────────────
function BankDetailsForm({ bankForm, setBankForm, errors }) {
  const field = (label, name, placeholder, icon, extra = {}) => (
    <div>
      <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wider">
        {label} {extra.required && <span className="text-red-500">*</span>}
      </label>
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
          {icon}
        </span>
        <input
          type={extra.type || "text"}
          value={bankForm[name] || ""}
          onChange={(e) =>
            setBankForm((prev) => ({
              ...prev,
              [name]: extra.upper ? e.target.value.toUpperCase() : e.target.value,
            }))
          }
          placeholder={placeholder}
          className={`w-full pl-9 pr-4 py-2.5 rounded-xl border text-sm font-medium transition-all outline-none focus:ring-2 focus:ring-blue-500 ${
            errors?.[name]
              ? "border-red-400 bg-red-50 text-red-900"
              : "border-slate-200 bg-white text-slate-800 hover:border-slate-300"
          }`}
        />
      </div>
      {errors?.[name] && (
        <p className="mt-1 text-xs text-red-600 font-semibold flex items-center gap-1">
          <FiAlertCircle size={11} /> {errors[name]}
        </p>
      )}
    </div>
  );

  return (
    <div className="space-y-4">
      {field("Bank Name", "bank_name", "e.g. State Bank of India", <FiBriefcase size={14} />, { required: true })}
      {field("Account Holder Name", "account_holder_name", "As per bank records", <FiUser size={14} />, { required: true })}
      {field("Account Number", "account_number", "Enter account number", <FiHash size={14} />, { required: true })}
      {field("IFSC Code", "ifsc_code", "e.g. SBIN0001234", <FiHash size={14} />, { required: true, upper: true })}
      {field("Branch (Optional)", "branch", "Branch name or city", <FiMapPin size={14} />)}
      {field("UPI ID (Optional)", "upi_id", "e.g. name@upi", <FiSmartphone size={14} />)}
    </div>
  );
}

// ─── Plan Card ────────────────────────────────────────────────────────────────
function PlanCard({ plan, onSelect, isActive, activePlanId }) {
  const isCurrent = plan.id === activePlanId;
  return (
    <div
      className={`relative bg-white rounded-3xl border-2 transition-all duration-200 flex flex-col justify-between overflow-hidden ${
        isCurrent
          ? "border-emerald-500 shadow-lg shadow-emerald-500/10"
          : plan.is_popular
          ? "border-blue-500 shadow-lg shadow-blue-500/10"
          : "border-slate-200 hover:border-blue-300 hover:shadow-md"
      }`}
    >
      {/* Popular / Current badge */}
      {(plan.is_popular || isCurrent) && (
        <div className={`absolute top-0 left-0 right-0 py-1.5 text-center text-[11px] font-black uppercase tracking-widest ${
          isCurrent ? "bg-emerald-500 text-white" : "bg-blue-600 text-white"
        }`}>
          {isCurrent ? "✓ Current Plan" : "⭐ Most Popular"}
        </div>
      )}

      <div className={`p-7 space-y-5 ${plan.is_popular || isCurrent ? "pt-10" : ""}`}>
        {/* Name + Price */}
        <div>
          <h3 className="text-xl font-extrabold text-slate-900">{plan.plan_name}</h3>
          <div className="mt-2 flex items-baseline gap-1">
            <span className="text-3xl font-black text-blue-600">
              ₹{(plan.annual_fee || 0).toLocaleString("en-IN")}
            </span>
            <span className="text-sm text-slate-500 font-semibold">/year</span>
          </div>
          <p className="text-xs text-slate-500 mt-1.5 font-medium leading-relaxed">
            {plan.description || "Standard franchisee partner plan"}
          </p>
        </div>

        {/* Features */}
        <div className="space-y-2.5 text-xs font-semibold border-t border-slate-100 pt-4">
          {[
            ["Territory Scope", plan.max_states_allowed || "District Level", "text-blue-700"],
            ["MOQ Capacity", `${Number(plan.moq_capacity_kw || 10000).toLocaleString("en-IN")} kW (${plan.moq_kits_count || 1} Kit MOQ)`, "text-amber-600"],
            ["Project Types", plan.project_types_display || "All Types", "text-slate-700"],
            ["Order Types", formatOrderTypes(plan.order_type_allowed), "text-purple-700"],
            ["Warehouse", plan.warehouse_required ? `${plan.warehouse_count || 1} Hub (${Number(plan.warehouse_space_sqft || 0).toLocaleString("en-IN")} sqft)` : "No WH Required", "text-slate-700"],
          ].map(([label, value, color]) => (
            <div key={label} className="flex items-start gap-2 text-slate-700">
              <FiCheckCircle className="text-emerald-500 shrink-0 mt-0.5" size={14} />
              <span>
                {label}: <strong className={color}>{value}</strong>
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* CTA */}
      <div className="px-7 pb-7">
        {isCurrent ? (
          <div className="w-full py-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 font-bold text-sm text-center">
            ✓ Active Plan
          </div>
        ) : (
          <button
            onClick={() => onSelect(plan)}
            className="w-full py-3.5 rounded-xl font-bold text-sm transition-all cursor-pointer shadow-md"
            style={{
              background: plan.is_popular ? "#2563eb" : "#1e293b",
              color: "#ffffff",
              boxShadow: plan.is_popular ? "0 4px 14px rgba(37,99,235,0.35)" : "0 4px 14px rgba(30,41,59,0.2)",
            }}
          >
            {plan.is_popular ? "⚡ Subscribe Now" : "Subscribe / Upgrade"}
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function PlansPortal() {
  const { reseller } = useOutletContext();
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);

  // Payment flow state
  const [step, setStep] = useState("plans"); // "plans" | "bank" | "paying" | "success"
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [bankForm, setBankForm] = useState({
    bank_name: "", account_holder_name: "", account_number: "",
    ifsc_code: "", branch: "", upi_id: "",
  });
  const [formErrors, setFormErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [alertMsg, setAlertMsg] = useState(null); // { type: "error"|"success", text }
  const [successData, setSuccessData] = useState(null);

  // Detect current active plan from reseller context
  const activePlanId = reseller?.active_subscription?.plan_id?._id
    || reseller?.active_subscription?.plan_id
    || null;

  useEffect(() => {
    api.get("/india/v1/reseller/plans/list")
      .then((res) => { if (res.data?.status === "success") setPlans(res.data.data); })
      .catch(() => {})
      .finally(() => setLoading(false));

    // Pre-fill bank form if already saved
    api.get("/india/v1/reseller/profile/bank-details")
      .then((res) => {
        const bd = res.data?.data;
        if (bd) {
          setBankForm({
            bank_name:           bd.bank_name || "",
            account_holder_name: bd.account_holder_name || "",
            account_number:      bd.account_number || "",
            ifsc_code:           bd.ifsc_code || "",
            branch:              bd.branch || "",
            upi_id:              bd.upi_id || "",
          });
        }
      })
      .catch(() => {});
  }, []);

  const showAlert = (type, text) => {
    setAlertMsg({ type, text });
    setTimeout(() => setAlertMsg(null), 5000);
  };

  // ── Step 1: User selects plan → go to bank details form ─────────────────────
  const handleSelectPlan = (plan) => {
    setSelectedPlan(plan);
    setFormErrors({});
    setStep("bank");
  };

  // ── Step 2: Validate bank form → proceed to payment ─────────────────────────
  const validateBankForm = () => {
    const errors = {};
    if (!bankForm.bank_name?.trim()) errors.bank_name = "Bank Name is required";
    if (!bankForm.account_holder_name?.trim()) errors.account_holder_name = "Account Holder Name is required";
    if (!bankForm.account_number?.trim()) errors.account_number = "Account Number is required";
    if (!bankForm.ifsc_code?.trim()) errors.ifsc_code = "IFSC Code is required";
    const ifscRegex = /^[A-Z]{4}0[A-Z0-9]{6}$/;
    if (bankForm.ifsc_code && !ifscRegex.test(bankForm.ifsc_code.trim().toUpperCase())) {
      errors.ifsc_code = "Invalid IFSC format. Example: SBIN0001234";
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // ── Step 3: Proceed to Razorpay payment ──────────────────────────────────────
  const handleProceedToPayment = async () => {
    if (!validateBankForm()) return;
    setSubmitting(true);

    try {
      // a. Load Razorpay SDK
      const sdkLoaded = await loadRazorpayScript();
      if (!sdkLoaded) {
        showAlert("error", "Razorpay SDK failed to load. Check your internet connection.");
        setSubmitting(false);
        return;
      }

      // b. Create Razorpay order on server (includes bank details save)
      const orderRes = await api.post("/india/v1/reseller/plans/create-order", {
        plan_id:     selectedPlan.id,
        bank_details: {
          bank_name:           bankForm.bank_name?.trim(),
          account_number:      bankForm.account_number?.trim(),
          ifsc_code:           bankForm.ifsc_code?.trim().toUpperCase(),
          account_holder_name: bankForm.account_holder_name?.trim(),
          branch:              bankForm.branch?.trim() || null,
          upi_id:              bankForm.upi_id?.trim() || null,
        },
      });

      if (orderRes.data?.status !== "success") {
        throw new Error(orderRes.data?.message || "Failed to create payment order");
      }

      const { razorpay_order_id, amount_paise, currency, key_id } = orderRes.data.data;

      // c. Open Razorpay checkout modal
      const options = {
        key:         key_id || RAZORPAY_KEY,
        amount:      amount_paise,
        currency:    currency || "INR",
        name:        "SolarKits",
        description: `${selectedPlan.plan_name} — Franchisee Plan Subscription`,
        order_id:    razorpay_order_id,
        prefill: {
          name:    reseller?.business_name || "",
          email:   reseller?.email || "",
          contact: reseller?.mobile || "",
        },
        notes: {
          plan_id:   selectedPlan.id,
          plan_name: selectedPlan.plan_name,
        },
        theme: { color: "#2563EB" },
        handler: async function (response) {
          setStep("paying");
          try {
            // d. Verify payment signature on server → activate plan
            const verifyRes = await api.post("/india/v1/reseller/plans/verify-payment", {
              plan_id:             selectedPlan.id,
              razorpay_order_id:   response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature:  response.razorpay_signature,
              bank_details: {
                bank_name:           bankForm.bank_name?.trim(),
                account_number:      bankForm.account_number?.trim(),
                ifsc_code:           bankForm.ifsc_code?.trim().toUpperCase(),
                account_holder_name: bankForm.account_holder_name?.trim(),
                branch:              bankForm.branch?.trim() || null,
                upi_id:              bankForm.upi_id?.trim() || null,
              },
            });

            if (verifyRes.data?.status === "success") {
              setSuccessData({
                plan_name:     selectedPlan.plan_name,
                payment_id:    response.razorpay_payment_id,
                amount_inr:    selectedPlan.annual_fee,
                expiry_date:   verifyRes.data.data?.expiry_date,
              });
              setStep("success");
            } else {
              throw new Error(verifyRes.data?.message || "Payment verification failed");
            }
          } catch (err) {
            showAlert("error", err.response?.data?.message || err.message || "Payment verification failed. Contact support.");
            setStep("bank");
          } finally {
            setSubmitting(false);
          }
        },
        modal: {
          ondismiss: () => {
            setSubmitting(false);
            setStep("bank");
            showAlert("error", "Payment cancelled. Please try again.");
          },
        },
      };

      const rzp = new window.Razorpay(options);
      rzp.open();

    } catch (err) {
      showAlert("error", err.response?.data?.message || err.message || "Payment initialization failed.");
      setSubmitting(false);
    }
  };

  // ─── Render: Loading ─────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex items-center justify-center py-24 gap-3 text-slate-500 font-bold">
        <FiLoader className="animate-spin text-blue-600" size={24} />
        Loading subscription plans...
      </div>
    );
  }

  // ─── Render: Paying / Verifying ──────────────────────────────────────────────
  if (step === "paying") {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4">
        <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center">
          <FiLoader className="animate-spin text-blue-600" size={28} />
        </div>
        <h2 className="text-xl font-black text-slate-800">Verifying Payment...</h2>
        <p className="text-sm text-slate-500 font-medium">Please wait while we confirm your payment securely.</p>
      </div>
    );
  }

  // ─── Render: Success ─────────────────────────────────────────────────────────
  if (step === "success" && successData) {
    return (
      <div className="max-w-lg mx-auto py-12">
        <div className="bg-white rounded-3xl border border-emerald-200 shadow-xl p-10 text-center space-y-5">
          <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto">
            <FiCheckCircle className="text-emerald-600" size={38} />
          </div>
          <div>
            <h2 className="text-2xl font-black text-slate-900">Payment Successful! 🎉</h2>
            <p className="text-sm text-slate-600 mt-2 font-medium">
              Your <strong>{successData.plan_name}</strong> plan is now active.
              Commission payouts will be transferred to your registered bank account.
            </p>
          </div>
          <div className="bg-slate-50 rounded-2xl p-4 text-left space-y-2 text-xs font-semibold text-slate-700">
            <div className="flex justify-between">
              <span className="text-slate-500">Plan Subscribed</span>
              <span className="font-black">{successData.plan_name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Amount Paid</span>
              <span className="font-black text-blue-700">₹{Number(successData.amount_inr || 0).toLocaleString("en-IN")}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Payment ID</span>
              <span className="font-mono text-[11px] text-slate-600">{successData.payment_id}</span>
            </div>
            {successData.expiry_date && (
              <div className="flex justify-between">
                <span className="text-slate-500">Valid Until</span>
                <span className="font-black text-emerald-700">
                  {new Date(successData.expiry_date).toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric" })}
                </span>
              </div>
            )}
          </div>
          <div className="flex items-center gap-2 text-xs text-blue-700 font-bold justify-center">
            <FiShield size={13} />
            100% payment secured → SolarKits Admin Account
          </div>
          <button
            onClick={() => { setStep("plans"); setSuccessData(null); window.location.reload(); }}
            className="w-full py-3 rounded-xl bg-blue-600 text-white font-bold text-sm hover:bg-blue-700 transition cursor-pointer"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  // ─── Render: Bank Details Form (Step 2) ──────────────────────────────────────
  if (step === "bank" && selectedPlan) {
    return (
      <div className="max-w-xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setStep("plans")}
            className="p-2 rounded-xl border border-slate-200 hover:bg-slate-100 transition cursor-pointer"
          >
            <FiChevronLeft size={18} className="text-slate-600" />
          </button>
          <div>
            <h1 className="text-xl font-black text-slate-900">Bank Details for Commission Payouts</h1>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Your commission earnings will be transferred to this bank account via NEFT/RTGS.
            </p>
          </div>
        </div>

        {/* Alert */}
        {alertMsg && (
          <div className={`flex items-start gap-3 p-4 rounded-2xl text-sm font-semibold ${
            alertMsg.type === "error" ? "bg-red-50 border border-red-200 text-red-700" : "bg-emerald-50 border border-emerald-200 text-emerald-700"
          }`}>
            {alertMsg.type === "error" ? <FiAlertCircle size={16} className="shrink-0 mt-0.5" /> : <FiCheckCircle size={16} className="shrink-0 mt-0.5" />}
            {alertMsg.text}
            <button onClick={() => setAlertMsg(null)} className="ml-auto shrink-0 cursor-pointer"><FiX size={14} /></button>
          </div>
        )}

        {/* Plan Summary */}
        <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-blue-600 uppercase tracking-wider">Selected Plan</p>
            <p className="text-lg font-black text-slate-900 mt-0.5">{selectedPlan.plan_name}</p>
          </div>
          <div className="text-right">
            <p className="text-xs font-bold text-slate-500">Annual Fee</p>
            <p className="text-2xl font-black text-blue-600">₹{Number(selectedPlan.annual_fee || 0).toLocaleString("en-IN")}</p>
          </div>
        </div>

        {/* Bank Details Form */}
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 space-y-5">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
            <FiBriefcase className="text-blue-600" size={18} />
            <h2 className="text-sm font-extrabold text-slate-800 uppercase tracking-wider">
              Bank Account Information
            </h2>
          </div>
          <BankDetailsForm bankForm={bankForm} setBankForm={setBankForm} errors={formErrors} />
        </div>

        {/* Security Note */}
        <div className="flex items-start gap-2.5 p-4 rounded-2xl bg-amber-50 border border-amber-200 text-xs text-amber-800 font-semibold">
          <FiShield size={14} className="shrink-0 mt-0.5 text-amber-600" />
          <span>
            Bank details are securely stored and used <strong>only for commission payouts</strong> via manual NEFT/RTGS by our Accounts team. 
            Payment of ₹{Number(selectedPlan.annual_fee || 0).toLocaleString("en-IN")} goes 100% to SolarKits Admin account.
          </span>
        </div>

        {/* Action Button */}
        <button
          onClick={handleProceedToPayment}
          disabled={submitting}
          className={`w-full py-4 rounded-2xl font-bold text-sm flex items-center justify-center gap-2.5 transition-all cursor-pointer shadow-lg ${
            submitting ? "bg-slate-300 text-slate-500 cursor-not-allowed" : "bg-blue-600 hover:bg-blue-700 text-white shadow-blue-500/30"
          }`}
        >
          {submitting ? (
            <><FiLoader className="animate-spin" size={16} /> Creating Payment Order...</>
          ) : (
            <><FiCreditCard size={16} /> Pay ₹{Number(selectedPlan.annual_fee || 0).toLocaleString("en-IN")} <FiChevronRight size={16} /></>
          )}
        </button>
      </div>
    );
  }

  // ─── Render: Plans List (Step 1) ─────────────────────────────────────────────
  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-slate-900 flex items-center gap-2.5">
          <FiZap className="text-blue-600" size={28} />
          Franchisee Subscription Plans
        </h1>
        <p className="text-sm font-medium text-slate-600 mt-1">
          Choose your partner plan to activate your franchisee account and start earning commissions
        </p>
      </div>

      {/* Alert */}
      {alertMsg && (
        <div className={`flex items-start gap-3 p-4 rounded-2xl text-sm font-semibold ${
          alertMsg.type === "error" ? "bg-red-50 border border-red-200 text-red-700" : "bg-emerald-50 border border-emerald-200 text-emerald-700"
        }`}>
          {alertMsg.type === "error" ? <FiAlertCircle size={16} className="shrink-0" /> : <FiCheckCircle size={16} className="shrink-0" />}
          {alertMsg.text}
          <button onClick={() => setAlertMsg(null)} className="ml-auto cursor-pointer"><FiX size={14} /></button>
        </div>
      )}

      {/* Payment security note */}
      <div className="flex items-center gap-2.5 px-4 py-3 rounded-2xl bg-blue-50 border border-blue-200 text-xs font-bold text-blue-700">
        <FiShield size={14} className="text-blue-600 shrink-0" />
        All payments flow 100% to SolarKits Admin. Commissions are transferred manually via NEFT/RTGS after verification.
      </div>

      {/* Plans Grid */}
      {plans.length === 0 ? (
        <div className="py-16 text-center text-slate-500 font-semibold text-sm">
          No active plans available at the moment. Please check back later.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {plans.map((p) => (
            <PlanCard
              key={p.id}
              plan={p}
              onSelect={handleSelectPlan}
              activePlanId={activePlanId}
            />
          ))}
        </div>
      )}
    </div>
  );
}
