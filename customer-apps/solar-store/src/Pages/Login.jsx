// pages/Login.jsx
import { useState, useEffect, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useDispatch } from "react-redux";
import { motion, AnimatePresence } from "framer-motion";
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
  FiArrowRight,
  FiUser,
  FiChevronDown,
} from "react-icons/fi";
import axios from "axios";
import logoImg from "../assets/images/logo.png";
import { setAlert } from "../features/alert.slice";
import { setUser } from "../features/auth.slice";
import { setSelectedLocation } from "../features/slice";

// Configure axios defaults for cookie-based auth
axios.defaults.withCredentials = true;

// 🔒 Only show demo credentials on localhost — never on live domains
const isLocalhost =
  window.location.hostname === "localhost" ||
  window.location.hostname === "127.0.0.1";

export default function Login() {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

  const [authMode, setAuthMode] = useState(() => {
    return localStorage.getItem("epc_prefer_pin") === "false" ? "password" : "pin";
  });

  const [identifier, setIdentifier] = useState(
    () => localStorage.getItem("epc_saved_id") || ""
  );
  const [rememberId, setRememberId] = useState(
    () => localStorage.getItem("epc_saved_id") !== "false"
  );
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // 4-Digit PIN State (PIN-Only login)
  const [pinDigits, setPinDigits] = useState(["", "", "", ""]);
  const [showPin, setShowPin] = useState(false);
  const pinRefs = [useRef(), useRef(), useRef(), useRef()];

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Testing drawer collapsible state
  const [showTestCreds, setShowTestCreds] = useState(false);

  // Reset PIN modal
  const [showResetPinModal, setShowResetPinModal] = useState(false);
  const [resetPinData, setResetPinData] = useState({
    identifier: "",
    pin: "",
    confirmPin: "",
  });
  const [resetPinLoading, setResetPinLoading] = useState(false);

  const abortControllerRef = useRef(null);

  // Auto-focus PIN box on PIN mode switch
  useEffect(() => {
    if (authMode === "pin") {
      setTimeout(() => {
        const firstEmptyIdx = pinDigits.findIndex((d) => !d);
        const targetIdx = firstEmptyIdx === -1 ? 0 : firstEmptyIdx;
        pinRefs[targetIdx]?.current?.focus();
      }, 80);
    }
  }, [authMode]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort();
    };
  }, []);

  const handleDigitChange = (value, index) => {
    const char = value.slice(-1);
    if (char && !/^\d$/.test(char)) return;

    const newDigits = [...pinDigits];
    newDigits[index] = char;
    setPinDigits(newDigits);

    if (char && index < 3) {
      pinRefs[index + 1]?.current?.focus();
    }
  };

  const handleKeyDown = (e, index) => {
    if (e.key === "Backspace" && !pinDigits[index] && index > 0) {
      pinRefs[index - 1]?.current?.focus();
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
    if (rememberId && id) {
      localStorage.setItem("epc_saved_id", id.trim());
    } else {
      localStorage.removeItem("epc_saved_id");
    }
  };

  // Perform successful login state setting & redirect
  const handleAuthSuccess = (data) => {
    const user = data.account || data.user;
    const { accessToken, refreshToken } = data;

    if (accessToken) {
      localStorage.setItem("access_token", accessToken);
      localStorage.setItem("epc_token", accessToken);
      sessionStorage.setItem("access_token", accessToken);
      sessionStorage.setItem("epc_token", accessToken);
      if (refreshToken) {
        localStorage.setItem("refresh_token", refreshToken);
        sessionStorage.setItem("refresh_token", refreshToken);
      }
    }

    dispatch(setUser(user));

    if (user?.primaryLocation?.state && user?.primaryLocation?.district) {
      dispatch(
        setSelectedLocation({
          selectedState: user.primaryLocation.state,
          selectedDistrict: user.primaryLocation.district,
        })
      );
    }

    localStorage.setItem("user", JSON.stringify(user));
    sessionStorage.setItem("user", JSON.stringify(user));

    dispatch(
      setAlert({
        type: "success",
        message: data.message || "Login successful! Welcome to SolarKits EPC Portal.",
      })
    );

    navigate("/preconfigured-combo-kit");
  };

  // 1. Password Login (requires Email/Mobile + Password)
  const handlePasswordLogin = async (e) => {
    e.preventDefault();
    setError("");

    const cleanId = identifier.trim();
    if (!cleanId) {
      setError("Please enter your registered Business Email or Mobile Number.");
      return;
    }
    if (!password) {
      setError("Please enter your account password.");
      return;
    }

    setLoading(true);
    abortControllerRef.current = new AbortController();

    try {
      saveRememberedId(cleanId);
      localStorage.setItem("epc_prefer_pin", "false");

      const isEmail = cleanId.includes("@");
      const payload = isEmail
        ? { email: cleanId.toLowerCase(), password: password.trim() }
        : { whatsapp: cleanId.replace(/[\s-+]/g, ""), password: password.trim() };

      const res = await axios.post(`${API_URL}/india/v1/auth/login`, payload, {
        signal: abortControllerRef.current.signal,
        timeout: 10000,
        withCredentials: true,
      });

      if (res.data?.success) {
        handleAuthSuccess(res.data);
      } else {
        setError(res.data?.message || "Login failed. Please check credentials.");
      }
    } catch (err) {
      if (err.name === "CanceledError" || err.code === "ERR_CANCELED") return;
      setError(
        err.response?.data?.message || "Invalid credentials or account under verification."
      );
    } finally {
      setLoading(false);
    }
  };

  // 2. PIN-Only Login (Requires ONLY 4-Digit Unique PIN — No Email or Mobile needed!)
  const handlePinLogin = async (e) => {
    e.preventDefault();
    setError("");

    const pinStr = pinDigits.join("");

    if (pinStr.length !== 4) {
      setError("Please enter your complete 4-digit Security PIN.");
      const firstEmptyIdx = pinDigits.findIndex((d) => !d);
      pinRefs[firstEmptyIdx === -1 ? 0 : firstEmptyIdx]?.current?.focus();
      return;
    }

    setLoading(true);
    abortControllerRef.current = new AbortController();

    try {
      localStorage.setItem("epc_prefer_pin", "true");

      // Send PIN alone - backend resolves EPC by unique security_pin
      const payload = { pin: pinStr };

      const res = await axios.post(`${API_URL}/india/v1/auth/login`, payload, {
        signal: abortControllerRef.current.signal,
        timeout: 10000,
        withCredentials: true,
      });

      if (res.data?.success) {
        handleAuthSuccess(res.data);
      } else {
        setError(res.data?.message || "PIN verification failed.");
      }
    } catch (err) {
      if (err.name === "CanceledError" || err.code === "ERR_CANCELED") return;
      setError(
        err.response?.data?.message ||
          "Incorrect 4-digit PIN. If you haven't configured your unique PIN yet, please sign in with password."
      );
    } finally {
      setLoading(false);
    }
  };

  // 🧪 Testing Credentials for Localhost Development (Unique 4-Digit PIN per EPC)
  const testCredentials = [
    {
      role: "Rajkot GST Onboarded EPC (Ravi Harsoda)",
      email: "ravi.s@sunnovative.com",
      password: "1234",
      pin: "1234",
      tag: "Rajkot GST",
    },
    {
      role: "Devbhumi Dwarka EPC Partner",
      email: "dwarka.epc@solarkits.com",
      password: "2345",
      pin: "2345",
      tag: "Dwarka",
    },
    {
      role: "Demo EPC Contractor",
      email: "ravi.s@gmail.com",
      password: "3456",
      pin: "3456",
      tag: "Demo EPC",
    },
    {
      role: "Customer Account",
      email: "customer@solarkits.com",
      password: "4567",
      pin: "4567",
      tag: "Customer",
    },
  ];

  const handleFillDemo = (cred, asPin = true) => {
    setIdentifier(cred.email);
    if (asPin) {
      const pinVal = cred.pin || cred.password;
      const chars = String(pinVal).slice(0, 4).split("");
      while (chars.length < 4) chars.push("1");
      setPinDigits(chars);
      setAuthMode("pin");
    } else {
      setPassword(cred.password);
      setAuthMode("password");
    }
    setError("");
  };

  const handleDirectLogin = async (cred) => {
    setLoading(true);
    try {
      const res = await axios.post(
        `${API_URL}/india/v1/auth/login`,
        { email: cred.email, password: cred.password },
        { withCredentials: true }
      );
      if (res.data?.success) {
        handleAuthSuccess(res.data);
      }
    } catch (err) {
      setError(err.response?.data?.message || "Direct Login failed.");
    } finally {
      setLoading(false);
    }
  };

  // Reset PIN Modal Handler (Enforces unique 4-digit PIN across EPCs)
  const handleResetPinSubmit = async (e) => {
    e.preventDefault();
    if (!resetPinData.identifier.trim()) {
      dispatch(
        setAlert({
          type: "error",
          message: "Please enter your Email or 10-digit Mobile number",
        })
      );
      return;
    }
    if (!/^\d{4}$/.test(resetPinData.pin.trim())) {
      dispatch(
        setAlert({
          type: "error",
          message: "PIN must be exactly 4 numeric digits (e.g. 1234)",
        })
      );
      return;
    }
    if (resetPinData.pin.trim() !== resetPinData.confirmPin.trim()) {
      dispatch(
        setAlert({ type: "error", message: "PIN and Confirm PIN do not match" })
      );
      return;
    }

    setResetPinLoading(true);
    try {
      const res = await axios.post(`${API_URL}/india/v1/auth/reset-pin`, {
        identifier: resetPinData.identifier.trim(),
        pin: resetPinData.pin.trim(),
        confirm_pin: resetPinData.confirmPin.trim(),
      });
      if (res.data?.success) {
        dispatch(
          setAlert({
            type: "success",
            message:
              res.data.message ||
              "Unique 4-Digit PIN set successfully! You can now log in directly using this PIN.",
          })
        );
        setIdentifier(resetPinData.identifier.trim());
        setPinDigits(resetPinData.pin.trim().split(""));
        setAuthMode("pin");
        setShowResetPinModal(false);
        setResetPinData({ identifier: "", pin: "", confirmPin: "" });
      }
    } catch (err) {
      dispatch(
        setAlert({
          type: "error",
          message: err.response?.data?.message || "Failed to set PIN",
        })
      );
    } finally {
      setResetPinLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center p-3 sm:p-4 relative overflow-hidden"
      style={{
        background: "linear-gradient(135deg, #f8fafc 0%, #eef2f7 100%)",
      }}
    >
      {/* Background decorative blobs */}
      <div
        className="absolute top-[-10%] left-[-5%] w-80 h-80 rounded-full blur-3xl opacity-25 pointer-events-none"
        style={{ background: "radial-gradient(circle, #25388040, transparent)" }}
      />
      <div
        className="absolute bottom-[-10%] right-[-5%] w-80 h-80 rounded-full blur-3xl opacity-20 pointer-events-none"
        style={{ background: "radial-gradient(circle, #1d2c6640, transparent)" }}
      />

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: "easeOut" }}
        className="w-full max-w-[400px] rounded-3xl p-5 sm:p-6 space-y-3.5 relative z-10"
        style={{
          background: "#ffffff",
          border: "1px solid #e5e7eb",
          boxShadow: "0 8px 36px rgba(37, 56, 128, 0.10)",
        }}
      >
        {/* Logo & Heading */}
        <div className="text-center space-y-1">
          <div className="flex justify-center mb-0.5">
            <img src={logoImg} alt="SolarKits" className="h-9 w-auto" />
          </div>
          <div>
            <h1 className="text-xl sm:text-[22px] font-extrabold text-slate-900 leading-tight">
              EPC Business Portal
            </h1>
            <p className="text-[11px] font-medium text-slate-500 mt-0.5 leading-tight">
              Sign in to manage your solar projects, wholesale orders &amp; kits
            </p>
          </div>
        </div>

        {/* ── Login Mode Toggle (Password vs 4-Digit PIN) ── */}
        <div className="p-1 rounded-xl bg-slate-100 flex items-center gap-1 border border-slate-200">
          <button
            type="button"
            onClick={() => {
              setAuthMode("password");
              setError("");
            }}
            className={`flex-1 py-2 px-2.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              authMode === "password"
                ? "bg-white text-blue-900 shadow-sm border border-slate-200"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <FiLock
              size={13}
              className={authMode === "password" ? "text-blue-600" : ""}
            />
            <span>Password Login</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setAuthMode("pin");
              setError("");
            }}
            className={`flex-1 py-2 px-2.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              authMode === "pin"
                ? "bg-gradient-to-r from-blue-700 to-indigo-700 text-white shadow-sm shadow-blue-700/20"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <FiZap
              size={13}
              className={authMode === "pin" ? "text-amber-300" : "text-amber-500"}
            />
            <span>Quick 4-Digit PIN</span>
          </button>
        </div>

        {/* Error Notification */}
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-2.5 rounded-xl text-xs font-semibold flex items-start gap-2 bg-rose-50 text-rose-700 border border-rose-200"
          >
            <FiAlertCircle size={15} className="shrink-0 mt-0.5" />
            <span>{error}</span>
          </motion.div>
        )}

        {/* ── Form: Mode 1 - Password Login (with Email/Mobile) ── */}
        {authMode === "password" && (
          <form onSubmit={handlePasswordLogin} className="space-y-3">
            {/* Email / Mobile */}
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 mb-1">
                REGISTERED BUSINESS EMAIL / MOBILE
              </label>
              <div className="relative">
                <FiMail
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                  size={14}
                />
                <input
                  type="text"
                  required
                  placeholder="epc@example.com or mobile"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  className="w-full pl-9 pr-3.5 py-2 rounded-xl text-xs sm:text-sm bg-slate-50 border border-slate-200 text-slate-900 transition-all outline-none focus:border-blue-700 focus:bg-white"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 mb-1">
                Password
              </label>
              <div className="relative">
                <FiLock
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                  size={14}
                />
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-9 pr-9 py-2 rounded-xl text-xs sm:text-sm bg-slate-50 border border-slate-200 text-slate-900 transition-all outline-none focus:border-blue-700 focus:bg-white"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  {showPassword ? <FiEyeOff size={14} /> : <FiEye size={14} />}
                </button>
              </div>
            </div>

            {/* Remember Me & Switch */}
            <div className="flex items-center justify-between text-xs pt-0.5">
              <label className="flex items-center gap-1.5 cursor-pointer select-none text-slate-600 text-[11px]">
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
                className="font-bold text-blue-700 hover:underline cursor-pointer flex items-center gap-1 text-[11px]"
              >
                <FiZap size={11} className="text-amber-500" />
                Login with 4-Digit PIN
              </button>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 text-white font-bold text-xs sm:text-sm rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 bg-gradient-to-r from-[#253880] to-[#1d2c66] hover:from-[#1d2c66] hover:to-[#17224d] shadow-[0_3px_12px_rgba(37,56,128,0.25)]"
            >
              {loading ? (
                <FiLoader className="animate-spin" size={16} />
              ) : (
                "Sign In with Password"
              )}
            </button>
          </form>
        )}

        {/* ── Form: Mode 2 - Quick 4-Digit PIN Login (NO Email/Mobile Required!) ── */}
        {authMode === "pin" && (
          <form onSubmit={handlePinLogin} className="space-y-3.5">
            {/* 4-Digit PIN Boxes (Standalone - Unique PIN identifies the EPC directly) */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700">
                  ENTER 4-DIGIT SECURITY PIN
                </label>
                <button
                  type="button"
                  onClick={() => setShowPin(!showPin)}
                  className="text-[11px] font-bold text-blue-700 hover:text-blue-800 flex items-center gap-1 cursor-pointer"
                >
                  {showPin ? (
                    <>
                      <FiEyeOff size={12} /> Hide Digits
                    </>
                  ) : (
                    <>
                      <FiEye size={12} /> Show Digits
                    </>
                  )}
                </button>
              </div>

              <div className="flex justify-between gap-2.5 my-1">
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
                    className="w-12 h-12 text-center text-lg font-black rounded-xl bg-slate-50 border-2 border-slate-200 text-slate-900 outline-none focus:border-blue-700 focus:bg-white focus:ring-2 focus:ring-blue-600/15 transition-all shadow-inner"
                  />
                ))}
              </div>
            </div>

            {/* Single Clean Link (No multiple confusing links!) */}
            <div className="flex items-center justify-between text-xs pt-0.5">
              <label className="flex items-center gap-1.5 cursor-pointer select-none text-slate-600 text-[11px]">
                <input
                  type="checkbox"
                  checked={rememberId}
                  onChange={(e) => setRememberId(e.target.checked)}
                  className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                <span>Remember on this device</span>
              </label>

              <button
                type="button"
                onClick={() => {
                  setResetPinData((prev) => ({
                    ...prev,
                    identifier: identifier.trim(),
                  }));
                  setShowResetPinModal(true);
                }}
                className="font-bold text-blue-700 hover:underline cursor-pointer text-[11px]"
              >
                First time user? Set PIN / Forgot PIN
              </button>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 text-white font-black text-xs sm:text-sm rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 bg-gradient-to-r from-[#253880] to-[#1d2c66] hover:from-[#1d2c66] hover:to-[#17224d] shadow-[0_3px_12px_rgba(37,56,128,0.25)]"
            >
              {loading ? (
                <FiLoader className="animate-spin" size={16} />
              ) : (
                <>
                  <FiZap className="text-amber-400" size={15} />
                  <span>Instant PIN Sign In</span>
                </>
              )}
            </button>
          </form>
        )}

        {/* 🧪 Collapsible Demo Credentials (Localhost only) */}
        {isLocalhost && (
          <div className="pt-0.5 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setShowTestCreds(!showTestCreds)}
              className="w-full flex items-center justify-between py-1 px-2 rounded-lg text-[10px] font-bold text-blue-700 hover:bg-blue-50 transition-colors cursor-pointer"
            >
              <span className="flex items-center gap-1">
                <FiKey size={11} className="text-blue-600" />
                <span>Quick Test Logins (Localhost)</span>
              </span>
              <FiChevronDown
                size={12}
                className={`transition-transform duration-200 ${
                  showTestCreds ? "rotate-180" : ""
                }`}
              />
            </button>

            {showTestCreds && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-1.5 space-y-1 max-h-36 overflow-y-auto pr-0.5"
              >
                {testCredentials.map((cred, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-1.5 rounded-lg bg-slate-50 border border-slate-200 text-[11px] gap-1.5"
                  >
                    <div className="truncate flex-1 min-w-0">
                      <p className="font-bold text-slate-800 truncate text-[10px]">{cred.role}</p>
                      <p className="text-[10px] text-slate-500 font-mono truncate">
                        PIN: <span className="font-bold text-blue-700">{cred.pin || cred.password}</span> • {cred.email}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleFillDemo(cred, authMode === "pin")}
                        className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-white hover:bg-blue-50 text-slate-700 border border-slate-200 cursor-pointer"
                      >
                        Fill
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDirectLogin(cred)}
                        className="px-2 py-0.5 rounded text-[9px] font-bold bg-blue-700 hover:bg-blue-800 text-white cursor-pointer"
                      >
                        Login
                      </button>
                    </div>
                  </div>
                ))}
              </motion.div>
            )}
          </div>
        )}

        <div className="text-center pt-0.5 text-[11px] font-medium text-slate-500">
          Don't have an EPC Partner Account?{" "}
          <Link
            to="/auth/signup"
            className="font-bold hover:underline underline-offset-2 text-[#253880]"
          >
            Apply Now
          </Link>
        </div>
      </motion.div>

      {/* 🔒 Reset Security PIN Modal (with Unique PIN & Password Login option) */}
      {showResetPinModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white border border-slate-200 rounded-3xl shadow-2xl w-full max-w-md p-6">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Set / Reset Unique 4-Digit PIN
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Each EPC has a unique 4-digit PIN for 1-click passwordless sign in.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowResetPinModal(false)}
                className="text-slate-400 hover:text-slate-700 p-1 rounded-lg cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleResetPinSubmit} className="mt-4 space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Registered Email or 10-Digit Mobile Number
                </label>
                <input
                  type="text"
                  placeholder="e.g. ravi.s@sunnovative.com or 9876543210"
                  value={resetPinData.identifier}
                  onChange={(e) =>
                    setResetPinData((prev) => ({
                      ...prev,
                      identifier: e.target.value,
                    }))
                  }
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-900 text-sm focus:ring-2 focus:ring-blue-600 focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Choose New Unique 4-Digit PIN
                </label>
                <input
                  type="password"
                  maxLength={4}
                  inputMode="numeric"
                  placeholder="e.g. 1234"
                  value={resetPinData.pin}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, "").slice(0, 4);
                    setResetPinData((prev) => ({ ...prev, pin: val }));
                  }}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-900 text-sm focus:ring-2 focus:ring-blue-600 focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Confirm 4-Digit Security PIN
                </label>
                <input
                  type="password"
                  maxLength={4}
                  inputMode="numeric"
                  placeholder="e.g. 1234"
                  value={resetPinData.confirmPin}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, "").slice(0, 4);
                    setResetPinData((prev) => ({ ...prev, confirmPin: val }));
                  }}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-900 text-sm focus:ring-2 focus:ring-blue-600 focus:outline-none"
                  required
                />
              </div>

              <div className="flex items-center justify-between text-xs pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setShowResetPinModal(false);
                    setAuthMode("password");
                  }}
                  className="text-blue-700 font-bold hover:underline cursor-pointer"
                >
                  Or Sign In Using Password →
                </button>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowResetPinModal(false)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-700 font-semibold text-xs hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={resetPinLoading}
                  className="flex-1 py-2.5 rounded-xl bg-blue-700 text-white font-bold text-xs hover:bg-blue-800 disabled:opacity-60 cursor-pointer flex items-center justify-center gap-1.5"
                >
                  {resetPinLoading ? (
                    <FiLoader className="animate-spin" size={14} />
                  ) : (
                    "Save & Lock PIN"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
