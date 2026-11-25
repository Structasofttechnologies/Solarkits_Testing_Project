import React, { useState, useEffect, useRef } from "react";
import { FiCheckCircle, FiCopy, FiCheck, FiExternalLink, FiX, FiDollarSign, FiAward, FiShield } from "react-icons/fi";
import { useNavigate } from "react-router-dom";

function playPaymentChime() {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();
    const now = ctx.currentTime;
    
    // Upbeat celebratory chime
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = "sine";
    osc1.frequency.setValueAtTime(523.25, now); // C5
    gain1.gain.setValueAtTime(0.2, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.3);

    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = "sine";
    osc2.frequency.setValueAtTime(659.25, now + 0.1); // E5
    gain2.gain.setValueAtTime(0.2, now + 0.1);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now + 0.1);
    osc2.stop(now + 0.4);

    const osc3 = ctx.createOscillator();
    const gain3 = ctx.createGain();
    osc3.type = "sine";
    osc3.frequency.setValueAtTime(1046.5, now + 0.2); // C6
    gain3.gain.setValueAtTime(0.25, now + 0.2);
    gain3.gain.exponentialRampToValueAtTime(0.001, now + 0.7);
    osc3.connect(gain3);
    gain3.connect(ctx.destination);
    osc3.start(now + 0.2);
    osc3.stop(now + 0.7);
  } catch (_e) {}
}

export default function FranchisePaymentPopup({ resellerId }) {
  const [activeAlert, setActiveAlert] = useState(null);
  const [copied, setCopied] = useState(false);
  const eventSourceRef = useRef(null);
  const dismissTimerRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (!resellerId) return;

    const backendOrigin = import.meta.env.VITE_BACKEND_URL ||
      (() => {
        try {
          return new URL(import.meta.env.VITE_API_URL || "http://localhost:5000").origin;
        } catch (_e) {
          return "http://localhost:5000";
        }
      })();
    const streamUrl = `${backendOrigin}/api/v1/payments/icici/stream?role=reseller&reseller_id=${resellerId}`;

    console.log(`📡 [FranchisePaymentPopup] Listening on: ${streamUrl}`);
    const es = new EventSource(streamUrl);
    eventSourceRef.current = es;

    es.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === "ICICI_PAYMENT_CREDITED") {
          console.log("🎉 [FranchisePaymentPopup] Credited Event:", data);
          playPaymentChime();
          setActiveAlert(data);
          setCopied(false);

          if (dismissTimerRef.current) clearTimeout(dismissTimerRef.current);
          dismissTimerRef.current = setTimeout(() => {
            setActiveAlert(null);
          }, 25000);
        }
      } catch (err) {
        console.error("Error in Franchise stream event:", err);
      }
    };

    es.onerror = (err) => {
      console.warn("⚠️ [FranchisePaymentPopup] Stream retry", err);
    };

    return () => {
      if (es) es.close();
      if (dismissTimerRef.current) clearTimeout(dismissTimerRef.current);
    };
  }, [resellerId]);

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

  const handleAction = () => {
    if (!activeAlert) return;
    handleClose();
    if (activeAlert.eventType === "PO_ORDER_PAYMENT") {
      navigate("/po-order");
    } else {
      navigate("/wallet");
    }
  };

  if (!activeAlert) return null;

  const isPoOrder = activeAlert.eventType === "PO_ORDER_PAYMENT" || activeAlert.eventType === "LOOSE_ORDER_PAYMENT";

  return (
    <div
      style={{ position: "fixed", top: "20px", right: "20px", zIndex: 99999999, maxWidth: "440px", width: "100%" }}
      className="max-w-md w-full"
    >
      <div className="bg-slate-900 border-2 border-emerald-400 rounded-2xl shadow-2xl overflow-hidden text-white backdrop-blur-md">
        {/* Banner */}
        <div className="bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-700 px-4 py-3 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className="flex h-3 w-3 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-200 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-white"></span>
            </span>
            <span className="font-black text-xs uppercase tracking-wider text-white flex items-center gap-1.5">
              {isPoOrder ? <FiShield className="text-base" /> : <FiAward className="text-base" />}
              {isPoOrder ? "PO Order Payment Verified" : "EPC Buyer Payment Received!"}
            </span>
          </div>
          <button
            onClick={handleClose}
            className="text-white/80 hover:text-white transition-colors p-1 rounded-lg hover:bg-white/10"
            title="Dismiss"
          >
            <FiX className="text-lg" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4">
          <div className="flex items-baseline justify-between border-b border-slate-800 pb-3">
            <div>
              <span className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider">
                {isPoOrder ? "Amount Confirmed" : "Order Payment Value"}
              </span>
              <div className="text-2xl font-black text-emerald-400 tracking-tight">
                {activeAlert.amountFormatted || `₹${activeAlert.amount}`}
              </div>
            </div>
            <span className="px-3 py-1 text-xs font-bold rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
              {activeAlert.mode || "RTGS"} via ICICI
            </span>
          </div>

          <div className="space-y-2.5 text-xs">
            <div className="bg-slate-800/80 rounded-xl p-2.5 flex items-center justify-between border border-slate-700/60">
              <div>
                <div className="text-[11px] text-slate-400 font-medium">Bank UTR Reference</div>
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

            {!isPoOrder ? (
              <>
                <div className="flex justify-between items-center py-1 border-b border-slate-800/60">
                  <span className="text-slate-400 font-medium">Your Onboarded EPC:</span>
                  <span className="font-bold text-white truncate max-w-[210px]">{activeAlert.buyerName || "EPC Buyer"}</span>
                </div>
                <div className="flex justify-between items-center py-1 border-b border-slate-800/60">
                  <span className="text-slate-400 font-medium">Order Number:</span>
                  <span className="font-semibold text-cyan-400">{activeAlert.orderNumber || "Direct Order"}</span>
                </div>
                <div className="bg-emerald-950/40 border border-emerald-800/50 rounded-xl p-2.5 text-emerald-300 text-[11px] flex items-center gap-2">
                  <FiCheckCircle className="text-emerald-400 text-base shrink-0" />
                  <span>Your reseller margin on this order has been auto-calculated and added to your wallet!</span>
                </div>
              </>
            ) : (
              <div className="flex justify-between items-center py-1 border-b border-slate-800/60">
                <span className="text-slate-400 font-medium">PO Order Ref:</span>
                <span className="font-semibold text-cyan-400">{activeAlert.orderNumber || "PO Order"}</span>
              </div>
            )}
          </div>

          <div className="pt-2 flex items-center gap-2">
            <button
              onClick={handleAction}
              className="flex-1 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-bold py-2.5 px-3 rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-lg shadow-emerald-900/40 transition-all"
            >
              <FiExternalLink className="text-sm" />
              <span>{isPoOrder ? "View PO Order" : "Check Earnings Wallet"}</span>
            </button>
            <button
              onClick={handleClose}
              className="px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-all"
            >
              Dismiss
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
