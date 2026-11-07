// pages/Login.jsx
import { useState, useEffect, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useDispatch } from "react-redux";
import { FiMail, FiPhone, FiEye, FiEyeOff, FiArrowRight, FiHome, FiPackage, FiTrendingUp, FiUser } from "react-icons/fi";
import axios from "axios";
import Button from "../Components/Button";
import CustomInput from "../Components/CustomInput";
import IconButton from "../Components/IconButton";
import { setAlert } from "../features/alert.slice";
import { setUser } from "../features/auth.slice";
import { setSelectedLocation } from "../features/slice";

// Configure axios defaults for cookie-based auth
axios.defaults.withCredentials = true;

export default function Login() {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loginMethod, setLoginMethod] = useState("email");
  const [showResetPinModal, setShowResetPinModal] = useState(false);
  const [resetPinData, setResetPinData] = useState({ identifier: "", pin: "", confirmPin: "" });
  const [resetPinLoading, setResetPinLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [formData, setFormData] = useState({
    email: "",
    phoneNumber: "",
    password: "",
  });
  const [errors, setErrors] = useState({});
  const [loginAttempts, setLoginAttempts] = useState({
    count: 0,
    lastAttempt: 0,
    lockedUntil: null
  });

  // 🔒 Only show demo credentials on localhost / 127.0.0.1 — never on live domains
  const isLocalhost =
    window.location.hostname === "localhost" ||
    window.location.hostname === "127.0.0.1";

  // 🧪 Testing Credentials with default fallbacks & env support
  const testCredentials = (() => {
    const defaultAccounts = [
      {
        role: "Rajkot GST Onboarded EPC (Ravi Harsoda)",
        email: "ravi.s@sunnovative.com",
        password: "1234",
        tag: "Gujarat - Rajkot (GST 24AHUPH9736P2ZB)"
      },
      {
        role: "Devbhumi Dwarka EPC Partner",
        email: "dwarka.epc@solarkits.com",
        password: "1234",
        tag: "Gujarat - Devbhumi Dwarka"
      },
      {
        role: "Demo EPC Contractor",
        email: "ravi.s@gmail.com",
        password: "1234",
        tag: "Franchise / EPC"
      }
    ];

    try {
      const creds = import.meta.env.VITE_LOGIN_CREDENTIALS;
      if (creds) {
        const parsed = JSON.parse(creds.replace(/'/g, '"'));
        if (Array.isArray(parsed) && parsed.length > 0) {
          const rest = parsed.filter(
            (c) => c.email?.toLowerCase() !== "ravi.s@gmail.com"
          );
          return [...defaultAccounts, ...rest];
        }
      }
    } catch (e) {
      console.error("Failed to parse VITE_LOGIN_CREDENTIALS", e);
    }

    return [
      ...defaultAccounts,
      {
        role: "Customer Account",
        email: "customer@solarkits.com",
        password: "your_password",
        tag: "Customer"
      }
    ];
  })();

  const abortControllerRef = useRef(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort();
    };
  }, []);

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;

    if (type === "checkbox") {
      setRememberMe(checked);
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }

    // Clear error for this field
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: "" }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (loginMethod === "email") {
      if (!formData.email.trim()) {
        newErrors.email = "Email is required";
      } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
        newErrors.email = "Please enter a valid email";
      }
    } else {
      if (!formData.phoneNumber.trim()) {
        newErrors.phoneNumber = "Phone number is required";
      } else if (!/^\d{10}$/.test(formData.phoneNumber.replace(/[\s-]/g, ''))) {
        newErrors.phoneNumber = "Please enter 10-digit phone number";
      }
    }

    if (!formData.password) {
      newErrors.password = "4-digit Security PIN is required";
    } else if (!/^\d{4}$/.test(formData.password.trim())) {
      newErrors.password = "PIN must be exactly 4 numeric digits (e.g. 1234)";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Rate limiting check
  const checkRateLimit = () => {
    const now = Date.now();
    const { count, lastAttempt, lockedUntil } = loginAttempts;

    // Check if account is locked
    if (lockedUntil && now < lockedUntil) {
      const minutesLeft = Math.ceil((lockedUntil - now) / (60 * 1000));
      dispatch(setAlert({
        type: "warning",
        message: `Too many login attempts. Please try again in ${minutesLeft} minutes.`
      }));
      return false;
    }

    // Reset count if last attempt was more than 15 minutes ago
    if (now - lastAttempt > 15 * 60 * 1000) {
      setLoginAttempts({
        count: 0,
        lastAttempt: now,
        lockedUntil: null
      });
      return true;
    }

    if (count >= 5) {
      setLoginAttempts(prev => ({
        ...prev,
        lockedUntil: now + 15 * 60 * 1000 // Lock for 15 minutes
      }));
      dispatch(setAlert({
        type: "warning",
        message: "Too many login attempts. Please try again in 15 minutes."
      }));
      return false;
    }

    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validate form
    if (!validateForm()) {
      // Show first error as alert
      const firstError = Object.values(errors)[0];
      if (firstError) {
        dispatch(setAlert({ type: "error", message: firstError }));
      }
      return;
    }

    // Check rate limit
    if (!checkRateLimit()) {
      return;
    }

    setLoading(true);

    // Create abort controller for this request
    abortControllerRef.current = new AbortController();

    try {
      // Prepare payload based on login method
      const payload = loginMethod === "email"
        ? {
          email: formData.email.trim().toLowerCase(),
          password: formData.password,
        }
        : {
          whatsapp: formData.phoneNumber.replace(/\s/g, ''),
          password: formData.password,
        };
      // Make API call with credentials included
      const response = await axios.post(`${API_URL}/india/v1/auth/login`,
        payload,
        {
          signal: abortControllerRef.current.signal,
          timeout: 10000, // 10 second timeout
          withCredentials: true // Ensure credentials are sent
        }
      );

      // Update login attempts on success
      setLoginAttempts({
        count: 0,
        lastAttempt: Date.now(),
        lockedUntil: null
      });

      // Handle successful login
      if (response.data.success) {
        const user = response.data.account || response.data.user;

        const { accessToken, refreshToken } = response.data;
        if (accessToken) {
          if (rememberMe) {
            localStorage.setItem('access_token', accessToken);
            if (refreshToken) localStorage.setItem('refresh_token', refreshToken);
          } else {
            sessionStorage.setItem('access_token', accessToken);
            if (refreshToken) sessionStorage.setItem('refresh_token', refreshToken);
          }
        }

        dispatch(setUser(user));

        if (user?.primaryLocation?.state && user?.primaryLocation?.district) {
          dispatch(setSelectedLocation({
            selectedState: user.primaryLocation.state,
            selectedDistrict: user.primaryLocation.district
          }));
        }

        if (rememberMe) {
          localStorage.setItem('user', JSON.stringify(user));
        } else {
          sessionStorage.setItem('user', JSON.stringify(user));
        }

        // Show success message
        dispatch(setAlert({
          type: "success",
          message: response.data.message || "Login successful! Welcome back."
        }));

        // Redirect to Solar Combo Kit dashboard page
        navigate("/preconfigured-combo-kit");
      }
    } catch (error) {
      // Handle request cancellation
      if (error.name === 'CanceledError' || error.code === 'ERR_CANCELED') {
        console.log('Request canceled');
        return;
      }

      // Update login attempts on failure
      setLoginAttempts(prev => ({
        count: prev.count + 1,
        lastAttempt: Date.now(),
        lockedUntil: prev.lockedUntil
      }));

      // Handle different error scenarios
      let errorMessage = "Login failed. Please try again.";

      if (error.code === 'ECONNABORTED') {
        errorMessage = "Request timeout. Please check your connection and try again.";
      } else if (error.response) {
        // Server responded with error
        const res = error.response.data;

        switch (error.response.status) {
          case 400:
            errorMessage = res.message || "Invalid request format";
            break;
          case 401:
            errorMessage = res.message || "Invalid email/phone or password";
            // Clear password field on auth error
            setFormData(prev => ({ ...prev, password: '' }));
            break;
          case 403:
            if (res.status === "pending") {
              errorMessage = res.message || "Your account is under verification. Please wait for approval.";
            } else if (res.status === "rejected") {
              errorMessage = res.message || "Your account has been rejected. Please contact support.";
            } else {
              errorMessage = res.message || "Access denied. Please contact support.";
            }
            break;
          case 404:
            errorMessage = res.message || "Account not found";
            break;
          case 429:
            errorMessage = res.message || "Too many attempts. Please try again later.";
            break;
          default:
            errorMessage = res.message || "Server error. Please try again later.";
        }
      } else if (error.request) {
        // Request made but no response
        errorMessage = "Network error. Please check your internet connection.";
      }

      // Show error alert
      dispatch(setAlert({ type: "error", message: errorMessage }));

      // Log error for debugging
      console.error("Login error:", error.response?.data || error.message);

    } finally {
      setLoading(false);
      abortControllerRef.current = null;
    }
  };

  // 🧪 Auto-fill Credentials into Form
  const handleFillCredentials = (cred) => {
    setLoginMethod("email");
    setFormData(prev => ({
      ...prev,
      email: cred.email,
      password: cred.password
    }));
    setErrors({});
    dispatch(setAlert({
      type: "info",
      message: `Form filled with ${cred.email} (${cred.role || "Test Account"}).`
    }));
  };

  // 🧪 Direct Login Handler
  const handleDirectLogin = async (cred) => {
    setLoading(true);
    try {
      // 1. Update UI for visual feedback
      setLoginMethod("email");
      setFormData(prev => ({
        ...prev,
        email: cred.email,
        password: cred.password
      }));

      // 2. Direct API Call
      const response = await axios.post(`${API_URL}/india/v1/auth/login`,
        {
          email: cred.email,
          password: cred.password,
        },
        { withCredentials: true }
      );

      if (response.data.success) {
        const user = response.data.account || response.data.user;
        const { accessToken, refreshToken } = response.data;
        if (accessToken) {
          sessionStorage.setItem('access_token', accessToken);
          if (refreshToken) sessionStorage.setItem('refresh_token', refreshToken);
        }
        dispatch(setUser(user));
        if (user?.primaryLocation?.state && user?.primaryLocation?.district) {
          dispatch(setSelectedLocation({
            selectedState: user.primaryLocation.state,
            selectedDistrict: user.primaryLocation.district
          }));
        }
        sessionStorage.setItem('user', JSON.stringify(user));
        dispatch(setAlert({ type: "success", message: "Direct Login successful! Welcome back." }));
        navigate("/preconfigured-combo-kit");
      }
    } catch (error) {
      const msg = error.response?.data?.message || "Login failed. Please check credentials.";
      dispatch(setAlert({ type: "error", message: msg }));
    } finally {
      setLoading(false);
    }
  };

  const DirectLoginCard = () => {
    // Hide entirely on live/production domains
    if (!isLocalhost) return null;
    if (!testCredentials || testCredentials.length === 0) return null;

    return (
      <div className="px-6 pb-6 pt-3 border-t border-border/50 bg-primary/5">
        <div className="flex items-center justify-between mb-3">
          <p className="text-[11px] uppercase tracking-wider text-primary/80 font-bold flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-primary inline-block"></span>
            Quick Access (Testing Only)
          </p>
          <span className="text-[10px] text-text-muted font-medium bg-surface px-2 py-0.5 rounded-full border border-border">
            1-Click Login / Auto-Fill
          </span>
        </div>

        <div className="space-y-2.5">
          {testCredentials.map((cred, idx) => (
            <div
              key={idx}
              className="w-full flex items-center justify-between gap-3 p-3 rounded-xl bg-surface border border-primary/25 hover:border-primary hover:shadow-md transition-all group"
            >
              <button
                type="button"
                onClick={() => handleDirectLogin(cred)}
                disabled={loading}
                className="flex items-center gap-3 flex-1 min-w-0 text-left cursor-pointer"
              >
                <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center text-primary dark:text-info group-hover:bg-primary group-hover:text-white transition-colors shrink-0">
                  <FiUser size={18} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-xs font-bold text-text-primary dark:text-info truncate">
                      {cred.role || "Developer Account"}
                    </p>
                    {cred.tag && (
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-primary/15 text-primary">
                        {cred.tag}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-text-secondary truncate mt-0.5">
                    {cred.email}
                  </p>
                  <p className="text-[11px] text-text-muted font-mono">
                    PIN: <span className="text-text-secondary font-semibold font-mono tracking-wider">{cred.password}</span>
                  </p>
                </div>
              </button>

              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  title="Auto-fill form inputs only"
                  onClick={() => handleFillCredentials(cred)}
                  className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-surface-hover hover:bg-primary/10 text-text-secondary hover:text-primary border border-border transition-all cursor-pointer"
                >
                  Fill
                </button>
                <button
                  type="button"
                  title="1-Click instant login"
                  onClick={() => handleDirectLogin(cred)}
                  disabled={loading}
                  className="px-3 py-1.5 rounded-lg text-xs font-bold bg-primary hover:bg-primary/90 text-white shadow-sm transition-all flex items-center gap-1 cursor-pointer disabled:opacity-50"
                >
                  <span>Login</span>
                  <FiArrowRight size={13} className="group-hover:translate-x-0.5 transition-transform" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  
  const handleResetPinSubmit = async (e) => {
    e.preventDefault();
    if (!resetPinData.identifier.trim()) {
      dispatch(setAlert({ type: "error", message: "Please enter your Email or 10-digit Mobile number" }));
      return;
    }
    if (!/^\d{4}$/.test(resetPinData.pin.trim())) {
      dispatch(setAlert({ type: "error", message: "PIN must be exactly 4 numeric digits (e.g. 1234)" }));
      return;
    }
    if (resetPinData.pin.trim() !== resetPinData.confirmPin.trim()) {
      dispatch(setAlert({ type: "error", message: "PIN and Confirm PIN do not match" }));
      return;
    }

    setResetPinLoading(true);
    try {
      const res = await axios.post(`${API_URL}/india/v1/auth/reset-pin`, {
        identifier: resetPinData.identifier.trim(),
        pin: resetPinData.pin.trim(),
        confirm_pin: resetPinData.confirmPin.trim(),
      });
      if (res.data.success) {
        dispatch(setAlert({ type: "success", message: res.data.message || "4-Digit PIN reset successfully! You can now log in." }));
        setFormData(prev => ({ ...prev, password: resetPinData.pin.trim() }));
        setShowResetPinModal(false);
        setResetPinData({ identifier: "", pin: "", confirmPin: "" });
      }
    } catch (err) {
      dispatch(setAlert({ type: "error", message: err.response?.data?.message || "Failed to reset PIN" }));
    } finally {
      setResetPinLoading(false);
    }
  };

  const handleForgotPassword = () => {
    setShowResetPinModal(true);
    return;
    navigate("/auth/forgot-password");
  };

  const setEmailMethod = () => {
    setLoginMethod("email");
    setErrors({});
    setFormData(prev => ({ ...prev, email: "", phoneNumber: "" }));
  };

  const setPhoneMethod = () => {
    setLoginMethod("phone");
    setErrors({});
    setFormData(prev => ({ ...prev, email: "", phoneNumber: "" }));
  };

  return (
    <div className="min-h-screen bg-gradient-bg-subtle">
      {/* Header with gradient */}
      <div className="bg-gradient-to-r from-primary to-primary-end rounded-b-3xl shadow-lg mb-8">
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="text-center">
            <h1 className="text-3xl lg:text-4xl font-bold text-white mb-2">
              Welcome Back
            </h1>
            <p className="text-white/90 text-lg">
              Sign in to continue your solar journey
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 pb-16">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Left Column - Benefits */}
          <div className="lg:w-1/3">
            <div className="bg-surface rounded-2xl shadow-lg border border-border p-6 sticky top-4">
              <h2 className="text-xl font-bold text-text-primary dark:text-info mb-4">
                Why Choose SolarMarket?
              </h2>

              <div className="space-y-4">
                <div className="flex gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <FiPackage className="text-primary dark:text-info" size={20} />
                  </div>
                  <div>
                    <h3 className="font-semibold text-text-primary dark:text-info">Pre-configured Solar Kits</h3>
                    <p className="text-sm text-text-secondary">Access our curated selection of solar solutions</p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <div className="w-10 h-10 rounded-full bg-success/10 flex items-center justify-center flex-shrink-0">
                    <FiTrendingUp className="text-success" size={20} />
                  </div>
                  <div>
                    <h3 className="font-semibold text-text-primary dark:text-info">Best Price Guarantee</h3>
                    <p className="text-sm text-text-secondary">Competitive pricing on all solar equipment</p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <div className="w-10 h-10 rounded-full bg-warning/10 flex items-center justify-center flex-shrink-0">
                    <FiHome className="text-warning" size={20} />
                  </div>
                  <div>
                    <h3 className="font-semibold text-text-primary dark:text-info">Expert Support</h3>
                    <p className="text-sm text-text-secondary">Get help from solar professionals</p>
                  </div>
                </div>
              </div>

              {/* Testimonial */}
              <div className="mt-6 p-4 bg-surface-hover rounded-xl border border-border">
                <p className="text-sm text-text-secondary italic">"SolarMarket made it incredibly easy to find and compare solar kits for my home. The pre-configured options saved me hours of research!"
                </p>
                <div className="mt-2 flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center text-sm font-bold">
                    JD
                  </div>
                  <div>
                    <p className="font-semibold text-text-primary dark:text-info text-sm">John Doe</p>
                    <p className="text-xs text-text-muted">Homeowner</p>
                  </div>
                </div>
              </div>

              {/* Stats */}
              <div className="mt-6 grid grid-cols-2 gap-3">
                <div className="text-center p-3 bg-surface-hover rounded-xl border border-border">
                  <p className="text-2xl font-bold gradient-text-primary dark:text-info">10K+</p>
                  <p className="text-xs text-text-secondary">Happy Customers</p>
                </div>
                <div className="text-center p-3 bg-surface-hover rounded-xl border border-border">
                  <p className="text-2xl font-bold gradient-text-primary dark:text-info">50+</p>
                  <p className="text-xs text-text-secondary">Solar Kits</p>
                </div>
              </div>

              {/* New User Prompt */}
              <div className="mt-6 p-4 bg-primary/5 rounded-xl border border-primary/20">
                <p className="text-sm text-text-primary dark:text-info mb-2">
                  New to SolarMarket?
                </p>
                <Link to="/auth/signup">
                  <Button variant="outline" size="sm" fullWidth>
                    Create an Account
                  </Button>
                </Link>
              </div>
            </div>
          </div>

          {/* Right Column - Login Form */}
          <div className="lg:w-2/3">
            <div className="bg-surface rounded-2xl shadow-lg border border-border overflow-hidden">
              {/* Form Header */}
              <div className="bg-gradient-bg-subtle px-6 py-4 border-b border-border">
                <h2 className="text-xl font-bold text-text-primary dark:text-info">Sign In</h2>
                <p className="text-sm text-text-secondary">Access your account to manage your solar projects</p>
              </div>

              <form onSubmit={handleSubmit} className="p-6">
                {/* Login Method Toggle */}
                <div className="mb-6">
                  <label className="block text-text-primary dark:text-info font-medium mb-2">
                    Login with
                  </label>
                  <div className="flex gap-3">
                    <Button
                      type="button"
                      onClick={setEmailMethod}
                      variant={loginMethod === "email" ? "primary" : "secondary"}
                      size="sm"
                      leftIcon={<FiMail size={18} />}
                      className={`flex-1 ${loginMethod === "email" ? "" : "border-border"}`}
                    >
                      Email
                    </Button>
                    <Button
                      type="button"
                      onClick={setPhoneMethod}
                      variant={loginMethod === "phone" ? "primary" : "secondary"}
                      size="sm"
                      leftIcon={<FiPhone size={18} />}
                      className={`flex-1 ${loginMethod === "phone" ? "" : "border-border"}`}
                    >
                      Phone
                    </Button>
                  </div>
                </div>

                <div className="space-y-4">
                  {/* Dynamic Field - Email or Phone */}
                  {loginMethod === "email" ? (
                    // Email Field
                    <div>
                      <CustomInput
                        name="email"
                        label="Email Address"
                        placeholder="Enter your email"
                        value={formData.email}
                        onChange={handleInputChange}
                        type="email"
                        error={errors.email}
                        required
                      />
                      {errors.email && (
                        <p className="mt-1 text-sm text-red-600">{errors.email}</p>
                      )}
                    </div>
                  ) : (
                    // Phone Field
                    <div>
                      <CustomInput
                        name="phoneNumber"
                        label="Phone Number"
                        placeholder="Enter 10-digit phone number"
                        value={formData.phoneNumber}
                        onChange={handleInputChange}
                        type="tel"
                        maxLength={10}
                        error={errors.phoneNumber}
                        required
                      />
                      {errors.phoneNumber && (
                        <p className="mt-1 text-sm text-red-600">{errors.phoneNumber}</p>
                      )}
                    </div>
                  )}

                  {/* Password */}
                  <div>
                    <div className="relative">
                      <CustomInput
                        name="password"
                        label="4-Digit Security PIN"
                        placeholder="Enter 4-digit PIN (e.g. 1234)"
                        value={formData.password}
                        onChange={(e) => {
                          const val = e.target.value.replace(/\D/g, '').slice(0, 4);
                          handleInputChange({ target: { name: 'password', value: val } });
                        }}
                        type={showPassword ? "text" : "password"}
                        maxLength={4}
                        inputMode="numeric"
                        error={errors.password}
                        required
                      />
                      <IconButton
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        variant="ghost"
                        size="sm"
                        className="absolute right-3 top-9"
                      >
                        {showPassword ? <FiEyeOff size={18} /> : <FiEye size={18} />}
                      </IconButton>
                    </div>
                    {errors.password && (
                      <p className="mt-1 text-sm text-red-600">{errors.password}</p>
                    )}
                  </div>

                  {/* Forgot Password */}
                  <div className="flex items-center justify-end">
                    <Button
                      type="button"
                      onClick={handleForgotPassword}
                      variant="link"
                      size="sm"
                      className="text-primary dark:text-info font-medium"
                    >
                      Forgot / Reset PIN?
                    </Button>
                  </div>
                </div>

                {/* Submit Button */}
                <div className="mt-6">
                  <Button
                    type="submit"
                    variant="primary"
                    size="md"
                    loading={loading}
                    fullWidth
                    rightIcon={<FiArrowRight size={18} />}
                  >
                    Sign In with {loginMethod === "email" ? "Email" : "Phone"}
                  </Button>
                </div>

                {/* Sign Up Link for Mobile */}
                <p className="mt-6 text-center text-sm text-text-secondary lg:hidden">
                  Don't have an account?{""}
                  <Link to="/auth/signup" className="text-primary dark:text-info hover:underline font-medium">
                    Sign up
                  </Link>
                </p>
              </form>

              {/* 🧪 Testing Card */}
              <DirectLoginCard />

              {/* Additional Features Card */}
              <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-3 bg-surface-hover border-t border-border">
                <div className="text-center">
                  <p className="text-xs text-text-secondary">Member since</p>
                  <p className="text-sm font-semibold text-text-primary dark:text-info">2024</p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-text-secondary">Active Projects</p>
                  <p className="text-sm font-semibold text-text-primary dark:text-info">1.2K+</p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-text-secondary">Support 24/7</p>
                  <p className="text-sm font-semibold text-text-primary dark:text-info">Live Chat</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    
      {/* 🔒 Reset Security PIN Modal */}
      {showResetPinModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-surface border border-border rounded-2xl shadow-2xl w-full max-w-md p-6 animate-fadeIn">
            <div className="flex items-center justify-between pb-4 border-b border-border">
              <h3 className="text-base font-bold text-text-primary">Reset 4-Digit Security PIN</h3>
              <button
                type="button"
                onClick={() => setShowResetPinModal(false)}
                className="text-text-muted hover:text-text-primary p-1 rounded-lg"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleResetPinSubmit} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-text-secondary mb-1">
                  Registered Email or 10-Digit Mobile Number
                </label>
                <input
                  type="text"
                  placeholder="e.g. ravi.s@sunnovative.com or 9876543210"
                  value={resetPinData.identifier}
                  onChange={(e) => setResetPinData(prev => ({ ...prev, identifier: e.target.value }))}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-surface text-text-primary text-sm focus:ring-2 focus:ring-primary focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-text-secondary mb-1">
                  New 4-Digit Security PIN
                </label>
                <input
                  type="password"
                  maxLength={4}
                  inputMode="numeric"
                  placeholder="e.g. 1234"
                  value={resetPinData.pin}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, '').slice(0, 4);
                    setResetPinData(prev => ({ ...prev, pin: val }));
                  }}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-surface text-text-primary text-sm font-mono tracking-widest text-center focus:ring-2 focus:ring-primary focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-text-secondary mb-1">
                  Confirm 4-Digit PIN
                </label>
                <input
                  type="password"
                  maxLength={4}
                  inputMode="numeric"
                  placeholder="Re-enter 4-digit PIN"
                  value={resetPinData.confirmPin}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, '').slice(0, 4);
                    setResetPinData(prev => ({ ...prev, confirmPin: val }));
                  }}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-surface text-text-primary text-sm font-mono tracking-widest text-center focus:ring-2 focus:ring-primary focus:outline-none"
                  required
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowResetPinModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold border border-border hover:bg-surface-hover transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={resetPinLoading}
                  className="px-5 py-2 rounded-xl text-xs font-bold gradient-primary text-white shadow-sm hover:opacity-95 transition disabled:opacity-50"
                >
                  {resetPinLoading ? "Resetting..." : "Save New PIN"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}