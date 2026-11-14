import { useState, useRef, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import Dialog from "./Dialog";
import Button from "./Button";
import { setShowAuthDialog, fetchCart, setSelectedLocation } from "@/features/slice";
import { setUser } from "@/features/auth.slice";
import { setAlert } from "@/features/alert.slice";
import { 
  FiMail, 
  FiLock, 
  FiEye, 
  FiEyeOff, 
  FiLogIn, 
  FiUserPlus, 
  FiAlertCircle, 
  FiZap 
} from "react-icons/fi";
import axios from "axios";

// 🔒 Only show demo fill on localhost — never on live domains
const isLocalhost =
  window.location.hostname === "localhost" ||
  window.location.hostname === "127.0.0.1";

export default function AuthDialog() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const showAuthDialog = useSelector((state) => state.slice.showAuthDialog);
  const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

  const [emailOrPhone, setEmailOrPhone] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const abortControllerRef = useRef(null);

  // Reset form when dialog opens/closes
  useEffect(() => {
    if (showAuthDialog) {
      setErrorMessage("");
      setLoading(false);
    } else {
      abortControllerRef.current?.abort();
    }
  }, [showAuthDialog]);

  const handleClose = () => {
    dispatch(setShowAuthDialog(false));
  };

  const fillDemoCredentials = () => {
    setEmailOrPhone("customer@solarkits.com");
    setPassword("1234");
    setErrorMessage("");
  };

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage("");

    const identifier = emailOrPhone.trim();
    if (!identifier) {
      setErrorMessage("Please enter your registered email or phone number.");
      return;
    }
    if (!password) {
      setErrorMessage("Please enter your account password.");
      return;
    }

    setLoading(true);
    abortControllerRef.current = new AbortController();

    try {
      const isEmail = identifier.includes("@");
      const payload = isEmail
        ? { email: identifier.toLowerCase(), password }
        : { whatsapp: identifier.replace(/[\s-+]/g, ""), password };

      const response = await axios.post(
        `${API_URL}/india/v1/auth/login`,
        payload,
        {
          signal: abortControllerRef.current.signal,
          timeout: 10000,
          withCredentials: true,
        }
      );

      if (response.data.success) {
        const loggedUser = response.data.account || response.data.user;
        const { accessToken, refreshToken } = response.data;

        if (accessToken) {
          if (rememberMe) {
            localStorage.setItem("access_token", accessToken);
            if (refreshToken) localStorage.setItem("refresh_token", refreshToken);
            localStorage.setItem("user", JSON.stringify(loggedUser));
          } else {
            sessionStorage.setItem("access_token", accessToken);
            if (refreshToken) sessionStorage.setItem("refresh_token", refreshToken);
            sessionStorage.setItem("user", JSON.stringify(loggedUser));
          }
        }

        dispatch(setUser(loggedUser));
        if (loggedUser?.primaryLocation?.state && loggedUser?.primaryLocation?.district) {
          dispatch(setSelectedLocation({
            selectedState: loggedUser.primaryLocation.state,
            selectedDistrict: loggedUser.primaryLocation.district
          }));
        }
        dispatch(fetchCart());
        dispatch(
          setAlert({
            type: "success",
            message: `Welcome back, ${loggedUser.name || "Customer"}! You can now add kits to your cart.`,
          })
        );

        handleClose();
      } else {
        setErrorMessage(response.data.message || "Invalid credentials. Please verify and try again.");
      }
    } catch (err) {
      if (err.name === "CanceledError" || err.code === "ERR_CANCELED") return;
      console.error("Login popup error:", err);
      const serverMsg = err.response?.data?.message || err.message;
      setErrorMessage(
        serverMsg || "Unable to sign in. Please check your credentials or try again later."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleNavigateToAuth = (path) => {
    handleClose();
    navigate(path);
  };

  return (
    <Dialog
      isOpen={showAuthDialog}
      onClose={handleClose}
      title="Solar Store — Sign In to Continue"
      size="sm"
    >
      <div className="space-y-4 pt-1">
        {/* Top header banner */}
        <div className="flex items-center gap-3 p-3 bg-primary-50 dark:bg-primary-950/40 border border-primary-200/60 dark:border-primary-800/40 rounded-xl">
          <div className="w-10 h-10 rounded-lg bg-primary-600 text-white flex items-center justify-center shrink-0 shadow-sm">
            <FiLogIn className="text-xl" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-gray-900 dark:text-gray-100 leading-snug">
              Account Required for Cart & Checkout
            </h4>
            <p className="text-[11px] text-gray-500 dark:text-gray-400 leading-tight mt-0.5">
              Please sign in to add complete combo kits to your cart and place orders.
            </p>
          </div>
        </div>

        {/* Error message alert */}
        {errorMessage && (
          <div className="flex items-start gap-2.5 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 text-rose-700 dark:text-rose-300 text-xs animate-in fade-in duration-150">
            <FiAlertCircle className="text-rose-500 text-base shrink-0 mt-0.5" />
            <span className="flex-1 font-medium">{errorMessage}</span>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleLoginSubmit} className="space-y-3.5">
          {/* Email or Phone */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
              Email Address or WhatsApp Number
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                <FiMail className="text-sm" />
              </div>
              <input
                type="text"
                value={emailOrPhone}
                onChange={(e) => {
                  setEmailOrPhone(e.target.value);
                  if (errorMessage) setErrorMessage("");
                }}
                placeholder="customer@solarkits.com or 7777939842"
                className="w-full pl-9 pr-3 py-2.5 text-xs bg-surface-hover dark:bg-slate-800/80 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-text-primary transition-all"
                autoFocus
              />
            </div>
          </div>

          {/* Password */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                Password
              </label>
              <button
                type="button"
                onClick={() => handleNavigateToAuth("/auth/forgot-password")}
                className="text-[11px] font-semibold text-primary-600 hover:text-primary-700 dark:text-primary-400 hover:underline"
              >
                Forgot Password?
              </button>
            </div>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                <FiLock className="text-sm" />
              </div>
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (errorMessage) setErrorMessage("");
                }}
                placeholder="Enter account password"
                className="w-full pl-9 pr-10 py-2.5 text-xs bg-surface-hover dark:bg-slate-800/80 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-text-primary transition-all"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 transition-colors cursor-pointer"
              >
                {showPassword ? <FiEyeOff className="text-sm" /> : <FiEye className="text-sm" />}
              </button>
            </div>
          </div>

          {/* Remember me & Demo quick fill */}
          <div className="flex items-center justify-between pt-0.5">
            <label className="flex items-center gap-2 cursor-pointer text-xs text-gray-600 dark:text-gray-400 select-none">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="rounded text-primary focus:ring-primary h-3.5 w-3.5"
              />
              <span>Remember me</span>
            </label>

            {/* Demo Fill — localhost only */}
            {isLocalhost && (
              <button
                type="button"
                onClick={fillDemoCredentials}
                className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-700 dark:text-amber-400 hover:underline bg-amber-50 dark:bg-amber-950/40 px-2 py-0.5 rounded border border-amber-200/70 cursor-pointer"
                title="Click to auto-fill verified demo customer credentials"
              >
                <FiZap className="text-amber-500" />
                Demo Fill
              </button>
            )}
          </div>

          {/* Submit Button */}
          <Button
            type="submit"
            variant="primary"
            size="md"
            fullWidth
            disabled={loading}
            className="py-2.5 rounded-xl font-bold shadow-md hover:shadow-lg transition-all"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin h-4 w-4 text-white" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Authenticating...
              </span>
            ) : (
              <span className="flex items-center justify-center gap-1.5">
                <FiLogIn className="text-base" />
                Sign In & Continue
              </span>
            )}
          </Button>
        </form>

        {/* Divider */}
        <div className="relative my-3">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-border" />
          </div>
          <div className="relative flex justify-center text-[10px] uppercase font-bold text-text-muted bg-surface px-2">
            <span>New to SolarKits?</span>
          </div>
        </div>

        {/* Bottom Signup Button */}
        <div className="text-center space-y-2">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            fullWidth
            onClick={() => handleNavigateToAuth("/auth/signup")}
            leftIcon={<FiUserPlus />}
            className="rounded-xl font-semibold"
          >
            Create a New Account
          </Button>
          
          <div className="flex items-center justify-center gap-3 pt-1">
            <button
              type="button"
              onClick={() => handleNavigateToAuth("/auth/login")}
              className="text-[11px] text-primary-600 hover:text-primary-700 dark:text-primary-400 font-semibold hover:underline cursor-pointer"
            >
              Open Full Sign In Page →
            </button>
            <span className="text-gray-300 dark:text-gray-600">•</span>
            <button
              type="button"
              onClick={handleClose}
              className="text-[11px] text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 font-medium cursor-pointer"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </Dialog>
  );
}
