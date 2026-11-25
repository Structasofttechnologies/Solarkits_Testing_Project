import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  FiLock,
  FiKey,
  FiShield,
  FiCheckCircle,
  FiAlertCircle,
  FiEye,
  FiEyeOff,
  FiX,
  FiLoader,
  FiZap,
} from "react-icons/fi";
import api from "../services/api";

export default function PinSetupModal({
  isOpen,
  onClose,
  onSuccess,
  isChangeMode = false,
  user = null,
}) {
  const [mode, setMode] = useState(isChangeMode ? "change" : "setup");
  const [currentPin, setCurrentPin] = useState(["", "", "", ""]);
  const [pin, setPin] = useState(["", "", "", ""]);
  const [confirmPin, setConfirmPin] = useState(["", "", "", ""]);
  const [currentPassword, setCurrentPassword] = useState("");
  const [showPin, setShowPin] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const currentPinRefs = [useRef(), useRef(), useRef(), useRef()];
  const pinRefs = [useRef(), useRef(), useRef(), useRef()];
  const confirmPinRefs = [useRef(), useRef(), useRef(), useRef()];

  useEffect(() => {
    if (isOpen) {
      setMode(isChangeMode ? "change" : "setup");
      setCurrentPin(["", "", "", ""]);
      setPin(["", "", "", ""]);
      setConfirmPin(["", "", "", ""]);
      setCurrentPassword("");
      setError("");
      setSuccessMsg("");
      setShowPin(false);
      setTimeout(() => {
        if (isChangeMode) {
          currentPinRefs[0].current?.focus();
        } else {
          pinRefs[0].current?.focus();
        }
      }, 150);
    }
  }, [isOpen, isChangeMode]);

  if (!isOpen) return null;

  const handleDigitChange = (value, index, digits, setDigits, nextRefs) => {
    const char = value.slice(-1);
    if (char && !/^\d$/.test(char)) return;

    const newDigits = [...digits];
    newDigits[index] = char;
    setDigits(newDigits);

    if (char && index < 3) {
      nextRefs[index + 1].current?.focus();
    }
  };

  const handleKeyDown = (e, index, digits, setDigits, prevRefs) => {
    if (e.key === "Backspace" && !digits[index] && index > 0) {
      prevRefs[index - 1].current?.focus();
    }
  };

  const handlePaste = (e, setDigits, refs) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 4);
    if (!pasted) return;

    const newDigits = ["", "", "", ""];
    for (let i = 0; i < pasted.length; i++) {
      newDigits[i] = pasted[i];
    }
    setDigits(newDigits);
    const targetIdx = Math.min(pasted.length, 3);
    refs[targetIdx]?.current?.focus();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccessMsg("");

    const pinStr = pin.join("");
    const confirmPinStr = confirmPin.join("");

    if (pinStr.length !== 4) {
      setError("Please enter a complete 4-digit PIN.");
      pinRefs[pinStr.length < 4 ? pinStr.length : 3].current?.focus();
      return;
    }

    if (pinStr !== confirmPinStr) {
      setError("PIN and Confirmation PIN do not match. Please re-check.");
      confirmPinRefs[0].current?.focus();
      return;
    }

    setLoading(true);

    try {
      if (mode === "change") {
        const currPinStr = currentPin.join("");
        const res = await api.post("/india/v1/reseller/auth/pin/change", {
          current_pin: currPinStr || undefined,
          current_password: currentPassword || undefined,
          new_pin: pinStr,
          confirm_new_pin: confirmPinStr,
        });

        if (res.data?.status === "success") {
          setSuccessMsg("4-digit Security PIN updated successfully!");
          const updatedUser = {
            ...(user || {}),
            is_pin_set: true,
            pin_set_at: new Date().toISOString(),
          };
          localStorage.setItem("reseller_user", JSON.stringify(updatedUser));
          if (onSuccess) onSuccess(updatedUser);
          setTimeout(() => {
            onClose();
          }, 1200);
        } else {
          setError(res.data?.message || "Failed to update PIN");
        }
      } else {
        const res = await api.post("/india/v1/reseller/auth/pin/setup", {
          pin: pinStr,
          confirm_pin: confirmPinStr,
        });

        if (res.data?.status === "success") {
          setSuccessMsg("4-digit Security PIN activated! You can now use 1-click Quick Login.");
          const updatedUser = {
            ...(user || {}),
            is_pin_set: true,
            pin_set_at: new Date().toISOString(),
          };
          localStorage.setItem("reseller_user", JSON.stringify(updatedUser));
          if (onSuccess) onSuccess(updatedUser);
          setTimeout(() => {
            onClose();
          }, 1200);
        } else {
          setError(res.data?.message || "Failed to setup PIN");
        }
      }
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "An error occurred while saving your PIN. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleDismiss = () => {
    // Record dismissal for session so it doesn't immediately reappear on every route
    sessionStorage.setItem("reseller_pin_modal_dismissed", "true");
    onClose();
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm"
          onClick={handleDismiss}
        />

        {/* Modal Window */}
        <motion.div
          initial={{ opacity: 0, scale: 0.92, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.92, y: 20 }}
          transition={{ duration: 0.25, ease: "easeOut" }}
          className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden relative z-10"
        >
          {/* Header Banner */}
          <div className="relative p-6 pb-5 text-white bg-gradient-to-r from-blue-700 via-indigo-700 to-blue-800">
            <button
              onClick={handleDismiss}
              className="absolute right-4 top-4 w-8 h-8 rounded-full bg-white/15 hover:bg-white/25 flex items-center justify-center transition-all cursor-pointer text-white"
            >
              <FiX size={18} />
            </button>

            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center text-amber-300 shadow-inner">
                <FiKey size={24} />
              </div>
              <div>
                <span className="text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full bg-amber-400/25 text-amber-300 inline-block mb-1">
                  {mode === "change" ? "Security Settings" : "Fast Login Setup"}
                </span>
                <h3 className="text-lg font-black tracking-tight leading-snug">
                  {mode === "change"
                    ? "Update 4-Digit Security PIN"
                    : "Set Up Your 4-Digit PIN"}
                </h3>
              </div>
            </div>

            <p className="mt-2 text-xs text-blue-100 font-medium leading-relaxed">
              {mode === "change"
                ? "Update your existing 4-digit PIN for continued high-speed login access."
                : "Set a 4-digit numeric PIN to unlock superfast 1-click access to your Franchisee Portal on any device."}
            </p>
          </div>

          {/* Body */}
          <div className="p-6 space-y-5">
            {/* Status Messages */}
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-3.5 rounded-2xl text-xs font-semibold bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800 flex items-start gap-2.5"
              >
                <FiAlertCircle size={16} className="shrink-0 mt-0.5" />
                <span>{error}</span>
              </motion.div>
            )}

            {successMsg && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-3.5 rounded-2xl text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 flex items-center gap-2.5"
              >
                <FiCheckCircle size={18} className="shrink-0 text-emerald-500" />
                <span>{successMsg}</span>
              </motion.div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* If Change Mode: Current PIN or Password */}
              {mode === "change" && (
                <div className="space-y-3 p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700">
                  <label className="block text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300">
                    Current 4-Digit PIN
                  </label>
                  <div className="flex justify-between gap-2.5 max-w-[260px]">
                    {currentPin.map((digit, idx) => (
                      <input
                        key={idx}
                        ref={currentPinRefs[idx]}
                        type={showPin ? "text" : "password"}
                        inputMode="numeric"
                        maxLength={1}
                        value={digit}
                        onChange={(e) =>
                          handleDigitChange(
                            e.target.value,
                            idx,
                            currentPin,
                            setCurrentPin,
                            currentPinRefs
                          )
                        }
                        onKeyDown={(e) =>
                          handleKeyDown(e, idx, currentPin, setCurrentPin, currentPinRefs)
                        }
                        onPaste={(e) =>
                          handlePaste(e, setCurrentPin, currentPinRefs)
                        }
                        className="w-12 h-12 text-center text-lg font-black rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20 transition-all"
                      />
                    ))}
                  </div>

                  <div className="pt-2 border-t border-slate-200 dark:border-slate-700">
                    <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                      Or verify with Account Password if PIN forgotten:
                    </span>
                    <input
                      type="password"
                      placeholder="Account Password"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      className="mt-1.5 w-full px-3.5 py-2 rounded-xl text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white outline-none focus:border-blue-600 transition-all"
                    />
                  </div>
                </div>
              )}

              {/* Enter New 4-Digit PIN */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300">
                    {mode === "change" ? "New 4-Digit PIN" : "Enter 4-Digit PIN"}
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowPin(!showPin)}
                    className="text-[11px] font-bold text-blue-600 hover:text-blue-700 dark:text-blue-400 flex items-center gap-1 cursor-pointer"
                  >
                    {showPin ? (
                      <>
                        <FiEyeOff size={13} /> Hide Digits
                      </>
                    ) : (
                      <>
                        <FiEye size={13} /> Show Digits
                      </>
                    )}
                  </button>
                </div>

                <div className="flex justify-between gap-3">
                  {pin.map((digit, idx) => (
                    <input
                      key={idx}
                      ref={pinRefs[idx]}
                      type={showPin ? "text" : "password"}
                      inputMode="numeric"
                      maxLength={1}
                      value={digit}
                      onChange={(e) =>
                        handleDigitChange(e.target.value, idx, pin, setPin, pinRefs)
                      }
                      onKeyDown={(e) =>
                        handleKeyDown(e, idx, pin, setPin, pinRefs)
                      }
                      onPaste={(e) => handlePaste(e, setPin, pinRefs)}
                      className="w-14 h-14 text-center text-xl font-black rounded-2xl bg-slate-50 dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white outline-none focus:border-blue-600 focus:bg-white dark:focus:bg-slate-900 focus:ring-4 focus:ring-blue-600/15 transition-all shadow-inner"
                    />
                  ))}
                </div>
              </div>

              {/* Confirm 4-Digit PIN */}
              <div className="space-y-1.5 pt-1">
                <label className="block text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  Confirm 4-Digit PIN
                </label>
                <div className="flex justify-between gap-3">
                  {confirmPin.map((digit, idx) => (
                    <input
                      key={idx}
                      ref={confirmPinRefs[idx]}
                      type={showPin ? "text" : "password"}
                      inputMode="numeric"
                      maxLength={1}
                      value={digit}
                      onChange={(e) =>
                        handleDigitChange(
                          e.target.value,
                          idx,
                          confirmPin,
                          setConfirmPin,
                          confirmPinRefs
                        )
                      }
                      onKeyDown={(e) =>
                        handleKeyDown(e, idx, confirmPin, setConfirmPin, confirmPinRefs)
                      }
                      onPaste={(e) =>
                        handlePaste(e, setConfirmPin, confirmPinRefs)
                      }
                      className="w-14 h-14 text-center text-xl font-black rounded-2xl bg-slate-50 dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white outline-none focus:border-blue-600 focus:bg-white dark:focus:bg-slate-900 focus:ring-4 focus:ring-blue-600/15 transition-all shadow-inner"
                    />
                  ))}
                </div>
              </div>

              {/* Features List */}
              <div className="pt-2 text-[11px] text-slate-500 dark:text-slate-400 space-y-1 bg-slate-50 dark:bg-slate-800/40 p-3 rounded-xl">
                <div className="flex items-center gap-1.5 font-semibold text-slate-700 dark:text-slate-300">
                  <FiZap className="text-amber-500" size={13} />
                  <span>Ultra-fast 1-step login on mobile &amp; desktop</span>
                </div>
                <div className="flex items-center gap-1.5 font-semibold text-slate-700 dark:text-slate-300">
                  <FiShield className="text-emerald-500" size={13} />
                  <span>Password login will always stay available as backup</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-3 space-y-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3.5 px-4 rounded-2xl text-white font-black text-sm tracking-wide bg-gradient-to-r from-blue-700 via-indigo-700 to-blue-800 hover:from-blue-800 hover:to-indigo-900 transition-all shadow-lg shadow-blue-700/25 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
                >
                  {loading ? (
                    <FiLoader className="animate-spin" size={18} />
                  ) : (
                    <>
                      <FiCheckCircle size={18} />
                      {mode === "change"
                        ? "Save New 4-Digit PIN"
                        : "Save & Activate 4-Digit PIN"}
                    </>
                  )}
                </button>

                {!isChangeMode && (
                  <button
                    type="button"
                    onClick={handleDismiss}
                    className="w-full py-2.5 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 text-xs font-bold transition-all cursor-pointer text-center"
                  >
                    Remind Me Later / Skip For Now
                  </button>
                )}
              </div>
            </form>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
