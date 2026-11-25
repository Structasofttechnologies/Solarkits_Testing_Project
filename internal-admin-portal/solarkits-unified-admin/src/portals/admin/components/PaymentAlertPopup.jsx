import React, { useState, useEffect, useRef } from "react";
import { FiCheckCircle, FiCopy, FiCheck, FiExternalLink, FiX, FiDollarSign, FiShield } from "react-icons/fi";
import { useNavigate } from "react-router-dom";

/**
 * Synthesizes an elegant notification chime using the Web Audio API
 */
function playPaymentChime() {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();

    const now = ctx.currentTime;
    
    // Note 1: E5 (659.25 Hz)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = "sine";
    osc1.frequency.setValueAtTime(659.25, now);
    gain1.gain.setValueAtTime(0.15, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.35);

    // Note 2: B5 (987.77 Hz)
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = "sine";
    osc2.frequency.setValueAtTime(987.77, now + 0.12);
    gain2.gain.setValueAtTime(0.2, now + 0.12);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.65);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now + 0.12);
    osc2.stop(now + 0.65);
  } catch (_e) {
    // Audio context may be restricted before first user interaction
  }
}

export default function PaymentAlertPopup({ role = "admin" }) {
  const [activeAlert, setActiveAlert] = useState(null);
  const [copied, setCopied] = useState(false);
  const eventSourceRef = useRef(null);
  const dismissTimerRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    const backendOrigin = import.meta.env.VITE_BACKEND_URL ||
      (() => {
        try {
          return new URL(import.meta.env.VITE_API_URL || "http://localhost:5000").origin;
        } catch (_e) {
          return "http://localhost:5000";
        }
      })();
    const streamUrl = `${backendOrigin}/api/v1/payments/icici/stream?role=${role}`;

    console.log(`📡 [PaymentAlert] Connecting to ICICI payment stream: ${streamUrl}`);
    const es = new EventSource(streamUrl);
    eventSourceRef.current = es;

    es.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === "ICICI_PAYMENT_CREDITED") {
          console.log("💰 [PaymentAlert] Payment Credited Event Received:", data);
          playPaymentChime();
          setActiveAlert(data);
          setCopied(false);

          // Dispatch global DOM event for tables/screens to auto-refresh
          window.dispatchEvent(new CustomEvent("ICICI_PAYMENT_RECEIVED", { detail: data }));

          // Auto dismiss after 25 seconds
          if (dismissTimerRef.current) clearTimeout(dismissTimerRef.current);
          dismissTimerRef.current = setTimeout(() => {
            setActiveAlert(null);
          }, 25000);
        }
      } catch (err) {
        console.error("Error parsing payment stream data:", err);
      }
    };

    es.onerror = (err) => {
      console.warn("⚠️ [PaymentAlert] Stream disconnected or waiting for retry", err);
    };

    return () => {
      if (es) es.close();
      if (dismissTimerRef.current) clearTimeout(dismissTimerRef.current);
    };
  }, [role]);

  const handleCopyUtr = () => {
    if (!activeAlert?.utr) return;
    navigator.clipboard.writeText(activeAlert.utr);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleClose = () => {
    if (dismissTimerRef.current) clearTimeout(dismissTimerRef.current);
    setActiveAlert(null);
  };

  const handleViewOrder = (e) => {
    if (e && typeof e.preventDefault === "function") {
      e.preventDefault();
      e.stopPropagation();
    }
    if (!activeAlert) return;
    const alertType = activeAlert.eventType;
    handleClose();

    if (alertType === "PO_ORDER_PAYMENT") {
      navigate("/admin-panel/solar-shop/po-orders");
    } else {
      navigate("/admin-panel/solar-shop/home");
    }
  };

  if (!activeAlert) return null;

  const isFranchiseEpc = activeAlert.eventType === "ONBOARDED_EPC_PAYMENT";
  const isPoOrder = activeAlert.eventType === "PO_ORDER_PAYMENT";

  return (
    <div
      style={{ position: "fixed", top: "20px", right: "20px", zIndex: 99999999, maxWidth: "440px", width: "100%" }}
      className="max-w-md w-full"
    >
      <div className="bg-slate-900 border-2 border-emerald-500 rounded-2xl shadow-2xl overflow-hidden text-white backdrop-blur-md">
        {/* Glowing Top Banner */}
        <div className="bg-gradient-to-r from-emerald-600 to-teal-700 px-4 py-2.5 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className="flex h-3 w-3 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-300 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-white"></span>
            </span>
            <span className="font-bold text-xs uppercase tracking-wider text-emerald-100 flex items-center gap-1.5">
              <FiShield className="text-sm" /> ICICI E-Collection Payment Received
            </span>
          </div>
          <button
            onClick={handleClose}
            className="text-emerald-200 hover:text-white transition-colors p-1 rounded-lg hover:bg-emerald-800/40"
            title="Dismiss"
          >
            <FiX className="text-lg" />
          </button>
        </div>

        {/* Card Body */}
        <div className="p-5 space-y-4">
          {/* Amount Display */}
          <div className="flex items-baseline justify-between border-b border-slate-800 pb-3">
            <div>
              <span className="text-xs text-slate-400 font-medium uppercase tracking-wider">Amount Credited</span>
              <div className="text-2xl font-black text-emerald-400 tracking-tight flex items-center gap-1">
                {activeAlert.amountFormatted || `₹${activeAlert.amount}`}
              </div>
            </div>
            <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
              {activeAlert.mode || "RTGS"} Confirmed
            </span>
          </div>

          {/* Details Grid */}
          <div className="space-y-2.5 text-xs">
            {/* UTR Number */}
            <div className="bg-slate-800/80 rounded-xl p-2.5 flex items-center justify-between border border-slate-700/60">
              <div>
                <div className="text-[11px] text-slate-400 font-medium">Bank UTR Number</div>
                <div className="font-mono text-sm font-bold text-amber-300 tracking-wide">{activeAlert.utr || "N/A"}</div>
              </div>
              <button
                onClick={handleCopyUtr}
                className="px-2.5 py-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-200 text-xs font-semibold flex items-center gap-1 transition-all"
              >
                {copied ? <FiCheck className="text-emerald-400" /> : <FiCopy />}
                <span>{copied ? "Copied" : "Copy"}</span>
              </button>
            </div>

            {/* Buyer Info */}
            <div className="flex justify-between items-center py-1 border-b border-slate-800/60">
              <span className="text-slate-400 font-medium">Payer / Remitter:</span>
              <span className="font-semibold text-white truncate max-w-[210px]" title={activeAlert.buyerName}>
                {activeAlert.buyerName || "EPC Buyer"}
              </span>
            </div>

            {/* Virtual Account */}
            <div className="flex justify-between items-center py-1 border-b border-slate-800/60">
              <span className="text-slate-400 font-medium">Virtual Account (VAN):</span>
              <span className="font-mono font-medium text-slate-300">{activeAlert.virtualAccountNumber || "-"}</span>
            </div>

            {/* Order Ref */}
            <div className="flex justify-between items-center py-1 border-b border-slate-800/60">
              <span className="text-slate-400 font-medium">Order Number:</span>
              <span className="font-semibold text-cyan-400">{activeAlert.orderNumber || "Wallet Credit"}</span>
            </div>

            {/* Attribution Badge */}
            {isFranchiseEpc && (
              <div className="bg-blue-950/60 border border-blue-800/60 rounded-lg p-2 text-blue-300 flex items-center justify-between">
                <span>Franchise Partner:</span>
                <span className="font-bold text-white">{activeAlert.franchisePartnerName || "Territory Franchise"}</span>
              </div>
            )}

            {isPoOrder && (
              <div className="bg-purple-950/60 border border-purple-800/60 rounded-lg p-2 text-purple-300 flex items-center justify-between">
                <span>Transaction Type:</span>
                <span className="font-bold text-white">Franchise PO Order</span>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="pt-2 flex items-center gap-2">
            <button
              type="button"
              onClick={handleViewOrder}
              className="flex-1 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-bold py-2.5 px-3 rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-lg shadow-emerald-900/40 transition-all cursor-pointer"
            >
              <FiExternalLink className="text-sm" />
              <span>{role === "accounts" ? "View in Accounts" : "View Order"}</span>
            </button>
            <button
              type="button"
              onClick={handleClose}
              className="px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-all cursor-pointer"
            >
              Dismiss
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
