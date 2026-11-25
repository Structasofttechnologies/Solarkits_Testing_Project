import React, { useState } from "react";
import axios from "axios";
import {
  FiCheckCircle,
  FiAlertTriangle,
  FiArrowLeft,
  FiKey,
  FiPhone,
  FiShield,
} from "react-icons/fi";
import Dialog from "./Dialog";
import Button from "./Button";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

/**
 * GstVerificationDialog
 *
 * EPC Direct Product Checkout – GST + Phone OTP Verification Flow:
 *   Step 1 → Enter GSTIN + Mobile number → "Verify GST & Send OTP"
 *   Step 2 → Enter OTP received on that mobile → "Verify OTP"
 *   Step 3 → Success screen → "Continue to Checkout"
 */
export default function GstVerificationDialog({ isOpen, onClose, stateId, onVerified }) {
  const [step, setStep] = useState(1); // 1 | 2 | 3
  const [gstin, setGstin] = useState("");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [requestId, setRequestId] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [companyDetails, setCompanyDetails] = useState(null);
  const [resendTimer, setResendTimer] = useState(0);

  // ── Countdown timer for resend button ─────────────────────────────────────
  const startResendTimer = () => {
    setResendTimer(30);
    const interval = setInterval(() => {
      setResendTimer((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  // ── Step 1: Validate GSTIN + phone, then send OTP via mobile OTP API ─────
  const handleSendOtp = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    setErrorMsg("");

    const formattedGstin = gstin.trim().toUpperCase();
    const formattedPhone = phone.trim().replace(/\D/g, "");

    if (formattedGstin.length !== 15) {
      setErrorMsg("GSTIN must be exactly 15 characters.");
      return;
    }
    if (!/^[6-9]\d{9}$/.test(formattedPhone)) {
      setErrorMsg("Please enter a valid 10-digit Indian mobile number.");
      return;
    }

    setLoading(true);
    try {
      // Calls the unified mobile OTP verification endpoint (YourBulkSMS + Twilio WhatsApp)
      const response = await axios.post(
        `${API_URL}/india/v1/shop/gst/generate-otp`,
        { gstin: formattedGstin, phone: formattedPhone },
        { withCredentials: true }
      );

      if (response.data?.success || response.data?.status === "success") {
        const reqId = response.data?.request_id || response.data?.data?.request_id || "";
        setRequestId(reqId);
        startResendTimer();
        setStep(2);
      } else {
        setErrorMsg(response.data?.message || "Failed to send OTP. Please try again.");
      }
    } catch (err) {
      setErrorMsg(
        err.response?.data?.message ||
          "Failed to send OTP. Please verify your details and try again."
      );
    } finally {
      setLoading(false);
    }
  };

  // ── Step 2: Verify OTP and Register GST for Checkout ───────────────────────
  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    setErrorMsg("");

    if (!otp || otp.trim().length < 4) {
      setErrorMsg("Please enter a valid OTP.");
      return;
    }

    const formattedPhone = phone.trim().replace(/\D/g, "");
    const formattedGstin = gstin.trim().toUpperCase();

    setLoading(true);
    try {
      const gstRes = await axios.post(
        `${API_URL}/india/v1/shop/gst/verify-otp`,
        {
          request_id: requestId || `req_${Date.now()}`,
          otp: otp.trim(),
          gstin: formattedGstin,
          phone: formattedPhone,
          state_id: stateId,
        },
        { withCredentials: true }
      );

      if (gstRes.data?.success || gstRes.data?.status === "success") {
        setCompanyDetails(gstRes.data.data);
        setStep(3);
        if (onVerified) onVerified(gstRes.data.data);
      } else {
        setErrorMsg(gstRes.data?.message || "GST verification failed.");
      }
    } catch (err) {
      setErrorMsg(
        err.response?.data?.message || "Verification failed. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  // ── Reset all state ────────────────────────────────────────────────────────
  const handleReset = () => {
    setStep(1);
    setGstin("");
    setPhone("");
    setOtp("");
    setRequestId("");
    setErrorMsg("");
    setCompanyDetails(null);
    setResendTimer(0);
  };

  const stepLabels = ["GST + Phone", "Verify OTP", "Verified!"];

  return (
    <Dialog
      isOpen={isOpen}
      onClose={() => { handleReset(); onClose(); }}
      title="GST Tax Compliance Verification"
      size="sm"
    >
      <div className="py-2">

        {/* ── Step Progress Indicator ──────────────────────────────────── */}
        <div className="flex items-center gap-2 mb-6 px-1">
          {stepLabels.map((label, i) => {
            const idx = i + 1;
            const isActive = step === idx;
            const isDone = step > idx;
            return (
              <React.Fragment key={idx}>
                <div className="flex flex-col items-center gap-1 flex-shrink-0">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-black transition-all duration-300 ${
                      isDone
                        ? "bg-success text-white shadow-sm"
                        : isActive
                        ? "bg-primary text-white shadow-md ring-2 ring-primary/30"
                        : "bg-surface-hover text-text-muted border border-border"
                    }`}
                  >
                    {isDone ? <FiCheckCircle size={14} /> : idx}
                  </div>
                  <span
                    className={`text-[10px] font-bold whitespace-nowrap ${
                      isActive ? "text-primary" : isDone ? "text-success" : "text-text-muted"
                    }`}
                  >
                    {label}
                  </span>
                </div>
                {i < stepLabels.length - 1 && (
                  <div
                    className={`flex-1 h-0.5 mb-4 rounded-full transition-all duration-500 ${
                      step > idx ? "bg-success" : "bg-border"
                    }`}
                  />
                )}
              </React.Fragment>
            );
          })}
        </div>

        {/* ── Error Banner ─────────────────────────────────────────────── */}
        {errorMsg && (
          <div className="p-3 mb-4 rounded-xl bg-danger/10 border border-danger/30 text-danger text-sm font-semibold flex items-center gap-2 animate-in fade-in duration-200">
            <FiAlertTriangle className="shrink-0" size={18} />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════ */}
        {/* STEP 1 – GSTIN + Mobile Number                                */}
        {/* ══════════════════════════════════════════════════════════════ */}
        {step === 1 && (
          <form onSubmit={handleSendOtp} className="space-y-4">
            <div className="text-center mb-2">
              <div className="w-14 h-14 bg-primary/10 text-primary rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-sm">
                <FiShield size={26} />
              </div>
              <h3 className="text-base font-black text-text-primary">
                Verify Your GST Details
              </h3>
              <p className="text-text-secondary text-xs mt-1 leading-relaxed">
                Enter your GSTIN and mobile number. An OTP will be sent to that number to proceed with checkout.
              </p>
            </div>

            {/* GSTIN Field */}
            <div>
              <label className="text-xs font-black text-text-secondary uppercase tracking-wider block mb-1.5">
                GSTIN Number <span className="text-danger">*</span>
              </label>
              <input
                type="text"
                value={gstin}
                onChange={(e) => setGstin(e.target.value.toUpperCase())}
                maxLength={15}
                placeholder="e.g. 24AAAEE1234A1Z5"
                required
                className="w-full px-3.5 py-2.5 bg-surface border border-border rounded-xl text-sm font-mono font-bold text-text-primary focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all placeholder:font-sans placeholder:font-normal tracking-widest"
              />
              <p className="text-[10px] text-text-muted mt-1">
                15-character GST Identification Number
              </p>
            </div>

            {/* Phone Number Field */}
            <div>
              <label className="text-xs font-black text-text-secondary uppercase tracking-wider block mb-1.5">
                Mobile Number <span className="text-danger">*</span>
              </label>
              <div className="relative">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5 pointer-events-none">
                  <FiPhone className="text-primary text-sm" />
                  <span className="text-xs font-bold text-text-muted border-r border-border pr-2 leading-none">
                    +91
                  </span>
                </div>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
                  maxLength={10}
                  placeholder="10-digit mobile number"
                  required
                  className="w-full pl-16 pr-3.5 py-2.5 bg-surface border border-border rounded-xl text-sm font-bold text-text-primary focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all placeholder:font-normal"
                />
              </div>
              <p className="text-[10px] text-text-muted mt-1">
                OTP will be sent to this number for checkout verification
              </p>
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              variant="primary"
              fullWidth
              disabled={loading || gstin.length !== 15 || phone.length !== 10}
              leftIcon={loading ? null : <FiPhone size={16} />}
              className="py-3 bg-gradient-to-r from-primary to-primary-end font-bold rounded-xl mt-2"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin inline-block" />
                  Sending OTP...
                </span>
              ) : (
                "Verify GST & Send OTP"
              )}
            </Button>
          </form>
        )}

        {/* ══════════════════════════════════════════════════════════════ */}
        {/* STEP 2 – Enter OTP                                            */}
        {/* ══════════════════════════════════════════════════════════════ */}
        {step === 2 && (
          <form onSubmit={handleVerifyOtp} className="space-y-4">
            <div className="text-center mb-2">
              <div className="w-14 h-14 bg-warning/10 text-warning rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-sm">
                <FiKey size={26} />
              </div>
              <h3 className="text-base font-black text-text-primary">
                Enter Verification Code
              </h3>
              <p className="text-text-secondary text-xs mt-1 leading-relaxed">
                OTP sent via <span className="font-black text-primary">SMS & WhatsApp</span> to{" "}
                <span className="font-black text-text-primary">
                  +91 {phone.replace(/(\d{5})(\d{5})/, "$1 $2")}
                </span>{" "}
                for GSTIN{" "}
                <span className="font-mono font-bold text-primary">{gstin}</span>
              </p>
            </div>

            {/* OTP Input */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-black text-text-secondary uppercase tracking-wider block">
                  OTP Code <span className="text-danger">*</span>
                </label>
                <span className="text-[11px] font-bold text-text-muted bg-surface-hover px-2 py-0.5 rounded-md border border-border">
                  Simulator / Test: <span className="font-mono text-primary font-black">1234</span>
                </span>
              </div>
              <input
                type="text"
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                maxLength={6}
                placeholder="Enter OTP (Test: 1234)"
                autoFocus
                required
                className="w-full px-3.5 py-3 bg-surface border border-border rounded-xl text-xl font-mono font-black text-text-primary text-center tracking-[0.3em] focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all placeholder:text-sm placeholder:tracking-normal placeholder:font-normal placeholder:text-center"
              />
            </div>

            {/* Back + Verify Buttons */}
            <div className="flex gap-3">
              <Button
                type="button"
                variant="ghost"
                onClick={() => { setStep(1); setOtp(""); setErrorMsg(""); }}
                disabled={loading}
                leftIcon={<FiArrowLeft />}
                className="flex-1 border border-border"
              >
                Back
              </Button>
              <Button
                type="submit"
                variant="primary"
                disabled={loading || otp.length < 4}
                className="flex-1 bg-gradient-to-r from-primary to-primary-end font-bold rounded-xl"
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin inline-block" />
                    Verifying...
                  </span>
                ) : (
                  "Verify OTP"
                )}
              </Button>
            </div>

            {/* Resend OTP */}
            <div className="text-center pt-1">
              {resendTimer > 0 ? (
                <p className="text-xs text-text-muted font-semibold">
                  Resend OTP in{" "}
                  <span className="text-primary font-black">{resendTimer}s</span>
                </p>
              ) : (
                <button
                  type="button"
                  onClick={handleSendOtp}
                  disabled={loading}
                  className="text-primary hover:text-primary-end text-xs font-bold underline underline-offset-2 disabled:opacity-50"
                >
                  Didn&apos;t receive OTP? Resend
                </button>
              )}
            </div>
          </form>
        )}

        {/* ══════════════════════════════════════════════════════════════ */}
        {/* STEP 3 – Verification Successful                              */}
        {/* ══════════════════════════════════════════════════════════════ */}
        {step === 3 && (
          <div className="text-center space-y-4 animate-in fade-in duration-300">
            <div className="w-16 h-16 bg-success/15 text-success rounded-full flex items-center justify-center mx-auto mb-1 shadow-sm">
              <FiCheckCircle size={32} />
            </div>
            <div>
              <h3 className="text-lg font-black text-text-primary">
                GST Verified Successfully!
              </h3>
              <p className="text-text-secondary text-sm mt-1">
                Your business credentials are verified. You can now proceed to checkout.
              </p>
            </div>

            {/* Verified Company Details */}
            {companyDetails && (
              <div className="bg-surface-hover border border-border rounded-xl p-4 text-left space-y-2.5 text-xs">
                <div className="flex justify-between items-start gap-2">
                  <span className="text-text-muted font-semibold shrink-0">Legal Name</span>
                  <span className="font-bold text-text-primary text-right">{companyDetails.legal_name}</span>
                </div>
                {companyDetails.trade_name && (
                  <div className="flex justify-between items-start gap-2">
                    <span className="text-text-muted font-semibold shrink-0">Trade Name</span>
                    <span className="font-bold text-text-primary text-right">{companyDetails.trade_name}</span>
                  </div>
                )}
                <div className="flex justify-between items-start gap-2">
                  <span className="text-text-muted font-semibold shrink-0">GST Number</span>
                  <span className="font-mono font-bold text-primary text-right">{companyDetails.gst_number || gstin}</span>
                </div>
                <div className="flex justify-between items-start gap-2">
                  <span className="text-text-muted font-semibold shrink-0">Verified Mobile</span>
                  <span className="font-bold text-text-primary text-right">
                    +91 {phone.replace(/(\d{5})(\d{5})/, "$1 $2")}
                  </span>
                </div>
              </div>
            )}

            <Button
              onClick={() => { handleReset(); onClose(); }}
              variant="primary"
              fullWidth
              leftIcon={<FiCheckCircle size={16} />}
              className="py-3 bg-gradient-to-r from-primary to-primary-end font-bold rounded-xl"
            >
              Continue to Checkout
            </Button>
          </div>
        )}
      </div>
    </Dialog>
  );
}
