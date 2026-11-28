import { useState, useEffect, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import api from "../services/api";
import {
  FiMail,
  FiLock,
  FiLoader,
  FiKey,
  FiEye,
  FiEyeOff,
  FiZap,
  FiShield,
  FiCheckCircle,
  FiAlertCircle,
  FiSmartphone,
} from "react-icons/fi";
import logoImg from "@/assets/images/logo.png";

// 🔒 Only show demo credentials on localhost — never on live domains
const isLocalhost =
  window.location.hostname === "localhost" ||
  window.location.hostname === "127.0.0.1";

export default function Login() {
  const navigate = useNavigate();
  const [authMode, setAuthMode] = useState(() => {
    return localStorage.getItem("reseller_prefer_pin") === "true" ? "pin" : "password";
  });

  const [email, setEmail] = useState(() => localStorage.getItem("reseller_saved_id") || "");
  const [rememberId, setRememberId] = useState(() => Boolean(localStorage.getItem("reseller_saved_id")));
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // 4-Digit PIN State
  const [pinDigits, setPinDigits] = useState(["", "", "", ""]);
  const [showPin, setShowPin] = useState(false);
  const pinRefs = [useRef(), useRef(), useRef(), useRef()];

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const token = localStorage.getItem("reseller_token");
    const userStr = localStorage.getItem("reseller_user");
    if (token) {
      try {
        const u = userStr ? JSON.parse(userStr) : null;
        if (u?.is_operational === true && u?.activation_status === "active") {
          navigate("/dashboard");
        } else {
          navigate("/onboarding");
        }
      } catch {
        navigate("/onboarding");
      }
    }
  }, [navigate]);

  useEffect(() => {
    if (authMode === "pin") {
      setTimeout(() => {
        const firstEmptyIdx = pinDigits.findIndex((d) => !d);
        const targetIdx = firstEmptyIdx === -1 ? 0 : firstEmptyIdx;
        pinRefs[targetIdx]?.current?.focus();
      }, 100);
    }
  }, [authMode]);

  const handleDigitChange = (value, index) => {
    const char = value.slice(-1);
    if (char && !/^\d$/.test(char)) return;

    const newDigits = [...pinDigits];
    newDigits[index] = char;
    setPinDigits(newDigits);

    if (char && index < 3) {
      pinRefs[index + 1].current?.focus();
    }
  };

  const handleKeyDown = (e, index) => {
    if (e.key === "Backspace" && !pinDigits[index] && index > 0) {
      pinRefs[index - 1].current?.focus();
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 4);
    if (!pasted) return;

    const newDigits = ["", "", "", ""];
    for (let i = 0; i < pasted.length; i++) {
      newDigits[i] = pasted[i];
    }
    setPinDigits(newDigits);
    const targetIdx = Math.min(pasted.length, 3);
    pinRefs[targetIdx]?.current?.focus();
  };

  const saveRememberedId = (id) => {
    if (rememberId) {
      localStorage.setItem("reseller_saved_id", id.trim());
    } else {
      localStorage.removeItem("reseller_saved_id");
    }
  };

  const handlePasswordLogin = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const cleanId = email.trim();
      saveRememberedId(cleanId);
      localStorage.setItem("reseller_prefer_pin", "false");

      const res = await api.post("/india/v1/reseller/auth/login", {
        email_or_mobile: cleanId,
        password: password.trim(),
      });

      if (res.data?.status === "success") {
        const token = res.data.token || res.data.data?.token;
        const reseller = res.data.user || res.data.data?.reseller;
        localStorage.setItem("reseller_token", token);
        localStorage.setItem("reseller_user", JSON.stringify(reseller));

        const isOperational = Boolean(
          reseller?.is_operational === true && reseller?.activation_status === "active"
        );
        if (isOperational) {
          navigate("/dashboard");
        } else {
          navigate("/onboarding");
        }
      } else {
        setError(res.data?.message || "Login failed");
      }
    } catch (err) {
      setError(err.response?.data?.message || "Invalid credentials or account inactive");
    } finally {
      setLoading(false);
    }
  };

  const handlePinLogin = async (e) => {
    e.preventDefault();
    setError("");

    const pinStr = pinDigits.join("");
    if (!email.trim()) {
      setError("Please enter your registered Business Email or Mobile Number.");
      return;
    }
    if (pinStr.length !== 4) {
      setError("Please enter your complete 4-digit Security PIN.");
      const firstEmptyIdx = pinDigits.findIndex((d) => !d);
      pinRefs[firstEmptyIdx === -1 ? 0 : firstEmptyIdx]?.current?.focus();
      return;
    }

    setLoading(true);

    try {
      const cleanId = email.trim();
      saveRememberedId(cleanId);
      localStorage.setItem("reseller_prefer_pin", "true");

      const res = await api.post("/india/v1/reseller/auth/login-pin", {
        email_or_mobile: cleanId,
        pin: pinStr,
      });

      if (res.data?.status === "success") {
        const token = res.data.token || res.data.data?.token;
        const reseller = res.data.user || res.data.data?.reseller;
        localStorage.setItem("reseller_token", token);
        localStorage.setItem("reseller_user", JSON.stringify(reseller));

        const isOperational = Boolean(
          reseller?.is_operational === true && reseller?.activation_status === "active"
        );
        if (isOperational) {
          navigate("/dashboard");
        } else {
          navigate("/onboarding");
        }
      } else {
        setError(res.data?.message || "PIN verification failed");
      }
    } catch (err) {
      if (err.response?.data?.code === "PIN_NOT_SET") {
        setError(
          "4-digit PIN is not configured yet for this account. Please sign in with your Password below to set up your PIN."
        );
        setAuthMode("password");
      } else {
        setError(err.response?.data?.message || "Incorrect 4-digit PIN or account inactive");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleFillDemoPassword = () => {
    setEmail("demo.district@solarkits.in");
    setPassword("Demo@1234");
  };

  const handleFillDemoPin = () => {
    setEmail("demo.district@solarkits.in");
    setPinDigits(["1", "2", "3", "4"]);
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden"
      style={{
        background: "linear-gradient(135deg, #f8fafc 0%, #eef2f7 100%)",
      }}
    >
      {/* Background decorative blobs */}
      <div
        className="absolute top-[-10%] left-[-5%] w-96 h-96 rounded-full blur-3xl opacity-30 pointer-events-none"
        style={{ background: "radial-gradient(circle, #25388040, transparent)" }}
      />
      <div
        className="absolute bottom-[-10%] right-[-5%] w-96 h-96 rounded-full blur-3xl opacity-20 pointer-events-none"
        style={{ background: "radial-gradient(circle, #1d2c6640, transparent)" }}
      />

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="w-full max-w-md rounded-3xl p-5 sm:p-8 space-y-6 relative z-10"
        style={{
          background: "#ffffff",
          border: "1px solid #e5e7eb",
          boxShadow: "0 8px 40px rgba(37, 56, 128, 0.12)",
        }}
      >
        {/* Logo & Heading */}
        <div className="text-center space-y-2.5">
          <div className="flex justify-center">
            <img src={logoImg} alt="SolarKits" className="h-12 w-auto" />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold" style={{ color: "#0f172a" }}>
              Franchisee Business Portal
            </h1>
            <p className="text-xs mt-1 font-medium" style={{ color: "#64748b" }}>
              Sign in to manage your solar business, EPC sub-accounts &amp; wallet
            </p>
          </div>
        </div>

        {/* ── Login Mode Toggle (Password vs 4-Digit PIN) ── */}
        <div className="p-1 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center gap-1 border border-slate-200 dark:border-slate-700">
          <button
            type="button"
            onClick={() => {
              setAuthMode("password");
              setError("");
            }}
            className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 cursor-pointer ${authMode === "password"
              ? "bg-white text-blue-900 shadow-sm border border-slate-200"
              : "text-slate-600 hover:text-slate-900"
              }`}
          >
            <FiLock size={14} className={authMode === "password" ? "text-blue-600" : ""} />
            <span>Password Login</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setAuthMode("pin");
              setError("");
            }}
            className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 cursor-pointer ${authMode === "pin"
              ? "bg-gradient-to-r from-blue-700 to-indigo-700 text-white shadow-md shadow-blue-700/20"
              : "text-slate-600 hover:text-slate-900"
              }`}
          >
            <FiZap size={14} className={authMode === "pin" ? "text-amber-300" : "text-amber-500"} />
            <span>Quick 4-Digit PIN</span>
          </button>
        </div>

        {/* Demo Credentials Card — localhost only */}
        {isLocalhost && (
          <div
            className="p-4 rounded-2xl space-y-2.5"
            style={{
              background: "linear-gradient(135deg, #eff6ff, #dbeafe)",
              border: "2px solid #bfdbfe",
            }}
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span
                className="text-xs font-black uppercase tracking-wider flex items-center gap-1.5"
                style={{ color: "#1d4ed8" }}
              >
                <FiKey size={13} style={{ color: "#3b82f6" }} />
                Demo Franchisee Access
              </span>
              <span
                className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase"
                style={{ background: "#bfdbfe", color: "#1e40af" }}
              >
                Active Demo
              </span>
            </div>

            <div
              className="text-xs font-mono p-2.5 rounded-xl border space-y-1"
              style={{ background: "white", borderColor: "#bfdbfe", color: "#334155" }}
            >
              <div>
                <span className="font-bold font-sans" style={{ color: "#94a3b8" }}>ID: </span>
                structasoftadmin@gmail.com
              </div>
              {authMode === "password" ? (
                <div>
                  <span className="font-bold font-sans" style={{ color: "#94a3b8" }}>Pass: </span>
                  Password@123
                </div>
              ) : (
                <div>
                  <span className="font-bold font-sans" style={{ color: "#94a3b8" }}>PIN: </span>
                  9876 (or 4321)
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={authMode === "password" ? handleFillDemoPassword : handleFillDemoPin}
              className="w-full py-2 text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center justify-center gap-1.5 cursor-pointer"
              style={{
                background: "linear-gradient(135deg, #253880 0%, #1d2c66 100%)",
              }}
            >
              ⚡ Click to Auto-Fill {authMode === "password" ? "Password" : "PIN"} Credentials
            </button>
          </div>
        )}

        {/* Error Notification */}
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-3.5 rounded-xl text-xs font-semibold flex items-start gap-2.5"
            style={{
              background: "#fef2f2",
              color: "#dc2626",
              border: "1px solid #fca5a5",
            }}
          >
            <FiAlertCircle size={16} className="shrink-0 mt-0.5" />
            <span>{error}</span>
          </motion.div>
        )}

        {/* ── Form: Mode 1 - Password Login ── */}
        {authMode === "password" && (
          <form onSubmit={handlePasswordLogin} className="space-y-4">
            {/* Email / Mobile */}
            <div>
              <label
                className="block text-xs font-bold uppercase tracking-wider mb-1.5"
                style={{ color: "#334155" }}
              >
                Business Email / Mobile
              </label>
              <div className="relative">
                <FiMail
                  className="absolute left-3.5 top-1/2 -translate-y-1/2"
                  size={15}
                  style={{ color: "#94a3b8" }}
                />
                <input
                  type="text"
                  required
                  placeholder="franchisee@example.com or mobile"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl text-sm transition-all outline-none"
                  style={{
                    background: "#f8fafc",
                    border: "1px solid #e5e7eb",
                    color: "#0f172a",
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = "#253880";
                    e.target.style.boxShadow = "0 0 0 3px rgba(37,56,128,0.12)";
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = "#e5e7eb";
                    e.target.style.boxShadow = "none";
                  }}
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label
                className="block text-xs font-bold uppercase tracking-wider mb-1.5"
                style={{ color: "#334155" }}
              >
                Password
              </label>
              <div className="relative">
                <FiLock
                  className="absolute left-3.5 top-1/2 -translate-y-1/2"
                  size={15}
                  style={{ color: "#94a3b8" }}
                />
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-10 py-2.5 rounded-xl text-sm transition-all outline-none"
                  style={{
                    background: "#f8fafc",
                    border: "1px solid #e5e7eb",
                    color: "#0f172a",
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = "#253880";
                    e.target.style.boxShadow = "0 0 0 3px rgba(37,56,128,0.12)";
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = "#e5e7eb";
                    e.target.style.boxShadow = "none";
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 cursor-pointer"
                  style={{ color: "#94a3b8" }}
                >
                  {showPassword ? <FiEyeOff size={15} /> : <FiEye size={15} />}
                </button>
              </div>
            </div>

            {/* Remember Me */}
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
              <label className="flex items-center gap-2 cursor-pointer select-none text-slate-600">
                <input
                  type="checkbox"
                  checked={rememberId}
                  onChange={(e) => setRememberId(e.target.checked)}
                  className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                <span>Remember my ID</span>
              </label>

              <button
                type="button"
                onClick={() => setAuthMode("pin")}
                className="font-bold text-blue-700 hover:underline cursor-pointer flex items-center gap-1"
              >
                <FiZap size={12} className="text-amber-500" />
                Login with 4-Digit PIN
              </button>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 text-white font-bold text-sm rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
              style={{
                background: loading
                  ? "#94a3b8"
                  : "linear-gradient(135deg, #253880 0%, #1d2c66 100%)",
                boxShadow: loading ? "none" : "0 4px 16px rgba(37, 56, 128, 0.35)",
              }}
            >
              {loading ? <FiLoader className="animate-spin" size={18} /> : "Sign In with Password"}
            </button>
          </form>
        )}

        {/* ── Form: Mode 2 - Quick 4-Digit PIN Login ── */}
        {authMode === "pin" && (
          <form onSubmit={handlePinLogin} className="space-y-4">
            {/* Email / Mobile */}
            <div>
              <label
                className="block text-xs font-bold uppercase tracking-wider mb-1.5"
                style={{ color: "#334155" }}
              >
                Registered Business Email / Mobile
              </label>
              <div className="relative">
                <FiMail
                  className="absolute left-3.5 top-1/2 -translate-y-1/2"
                  size={15}
                  style={{ color: "#94a3b8" }}
                />
                <input
                  type="text"
                  required
                  placeholder="franchisee@example.com or mobile"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl text-sm transition-all outline-none"
                  style={{
                    background: "#f8fafc",
                    border: "1px solid #e5e7eb",
                    color: "#0f172a",
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = "#253880";
                    e.target.style.boxShadow = "0 0 0 3px rgba(37,56,128,0.12)";
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = "#e5e7eb";
                    e.target.style.boxShadow = "none";
                  }}
                />
              </div>
            </div>

            {/* 4-Digit PIN Boxes */}
            <div>
              <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5">
                <label
                  className="block text-xs font-bold uppercase tracking-wider"
                  style={{ color: "#334155" }}
                >
                  Enter 4-Digit Security PIN
                </label>
                <button
                  type="button"
                  onClick={() => setShowPin(!showPin)}
                  className="text-[11px] font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1 cursor-pointer"
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
                {pinDigits.map((digit, idx) => (
                  <input
                    key={idx}
                    ref={pinRefs[idx]}
                    type={showPin ? "text" : "password"}
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleDigitChange(e.target.value, idx)}
                    onKeyDown={(e) => handleKeyDown(e, idx)}
                    onPaste={handlePaste}
                    className="w-12 h-12 sm:w-14 sm:h-14 text-center text-xl font-black rounded-2xl bg-slate-50 border-2 border-slate-200 text-slate-900 outline-none focus:border-blue-600 focus:bg-white focus:ring-4 focus:ring-blue-600/15 transition-all shadow-inner"
                  />
                ))}
              </div>
            </div>

            {/* Remember Me & Switch */}
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
              <label className="flex items-center gap-2 cursor-pointer select-none text-slate-600">
                <input
                  type="checkbox"
                  checked={rememberId}
                  onChange={(e) => setRememberId(e.target.checked)}
                  className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                <span>Remember ID on this device</span>
              </label>

              <button
                type="button"
                onClick={() => setAuthMode("password")}
                className="font-bold text-blue-700 hover:underline cursor-pointer"
              >
                Forgot PIN? Use Password
              </button>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 text-white font-black text-sm rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
              style={{
                background: loading
                  ? "#94a3b8"
                  : "linear-gradient(135deg, #253880 0%, #1d2c66 100%)",
                boxShadow: loading ? "none" : "0 4px 16px rgba(37, 56, 128, 0.35)",
              }}
            >
              {loading ? (
                <FiLoader className="animate-spin" size={18} />
              ) : (
                <>
                  <FiZap className="text-amber-400" size={16} />
                  <span>Instant PIN Sign In</span>
                </>
              )}
            </button>
          </form>
        )}

        {/* <div className="text-center pt-1 text-xs font-medium" style={{ color: "#64748b" }}>
          Don't have a Franchisee Business Account?{" "}
          <Link
            to="/register"
            className="font-bold hover:underline underline-offset-2"
            style={{ color: "#253880" }}
          >
            Apply Now
          </Link>
        </div> */}
      </motion.div>
    </div>
  );
}
