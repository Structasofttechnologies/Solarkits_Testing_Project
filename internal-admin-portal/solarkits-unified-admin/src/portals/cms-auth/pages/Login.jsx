// Login.jsx (mobile optimized)
import { useState, useEffect } from "react";
import CustomInput from "../components/CustomInput";
import { Link, useNavigate } from "react-router-dom";
import OTPInput from "../components/OTPInput";
import { setAlert } from "../features/alert.slice";
import { useDispatch, useSelector } from "react-redux";
import ReactCountryFlag from "react-country-flag";
import DropdownWithSearchInput from "../components/DropdownWithSearchInput";
import AuthLayout from "../components/auth/AuthLayout";
import { fetchCountries } from "../features/countries.slice";
import { loginUser } from "../features/auth.slice";
import Button from "../components/Button";
import { HiEnvelope, HiPhone, HiGlobeAlt, HiArrowLeftOnRectangle, HiArrowRight, HiUserCircle } from "react-icons/hi2";

// 🔒 Only show developer testing access on localhost — never on live production domains
const isLocalhost = (() => {
  if (typeof window === "undefined") return false;
  const hostname = window.location.hostname.toLowerCase();

  // Strict check: never show on production or any domain containing solarkits.in
  if (
    hostname.includes("solarkits.in") ||
    import.meta.env.VITE_APP_ENV === "production"
  ) {
    return false;
  }

  // Must be localhost or local loopback IP
  return (
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname === "[::1]" ||
    hostname.endsWith(".localhost")
  );
})();

export default function Login() {
  const [form, setForm] = useState({
    auth_type: "email",
    email: "",
    phone: "",
    country_id: null,
    phone_code: "",
    min_phone_length: null,
    max_phone_length: null
  });

  const [passcode, setPasscode] = useState("");
  const dispatch = useDispatch();
  const navigate = useNavigate();

  // 🧪 Testing Credentials - only loaded in localhost environment
  const testCredentials = (() => {
    if (!isLocalhost) return [];
    try {
      const creds = import.meta.env.VITE_LOGIN_CREDENTIALS;
      if (creds) return JSON.parse(creds.replace(/'/g, '"'));
    } catch (e) {
      console.error("Failed to parse VITE_LOGIN_CREDENTIALS", e);
    }
    return [
      { email: "ravi.s@sunnovative.com", password: "4404", role: "Super Admin" },
      { email: "sushilpiprotar@gmail.com", password: "1234", role: "Accountant" },
      { email: "rahil@solarkits.com", password: "1234", role: "Account Manager" }
    ];
  })();

  const { status: authStatus } = useSelector((state) => state.auth);
  const { items: countries, status: countriesStatus } = useSelector((state) => state.countries);

  useEffect(() => {
    if (form.auth_type === 'phone' && countriesStatus === 'idle') {
      dispatch(fetchCountries());
    }
  }, [form.auth_type, countriesStatus, dispatch]);

  // 🔹 Handle input change
  const changeInput = (e) => {
    if (e.target.name === 'auth_type' && e.target.value === 'phone' && countries.length === 0) {
      if (countriesStatus === 'idle') {
        dispatch(fetchCountries());
      }
    }
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  // 🔹 Handle country selection
  const handleCountrySelect = (countryId) => {
    const selected = countries.find(c => c.id === countryId);
    if (selected) {
      setForm(prev => ({
        ...prev,
        country_id: selected.id,
        phone_code: selected.phone_code,
        min_phone_length: selected.min_phone_length,
        max_phone_length: selected.max_phone_length,
        phone: ""
      }));
    }
  };

  const handlePhoneChange = (e) => {
    const value = e.target.value.replace(/\D/g, "");
    if (!form.max_phone_length || value.length <= form.max_phone_length) {
      setForm(prev => ({ ...prev, phone: value }));
    }
  };

  // Auth Type Toggle Component
  const AuthTypeToggle = () => (
    <div className="flex gap-1 md:gap-2 p-1 bg-surface-hover rounded-lg mb-3 md:mb-4">
      <Button
        onClick={() => changeInput({ target: { name: 'auth_type', value: 'email' } })}
        className={`flex-1 transition-all ${form.auth_type === 'email' ? 'bg-surface shadow-sm border border-border' : 'bg-transparent'}`}
        variant={form.auth_type === 'email' ? 'primary' : 'ghost'}
        size="md"
      >
        <div className="flex items-center justify-center gap-1 md:gap-2">
          <HiEnvelope className="w-3 h-3 md:w-4 md:h-4" />
          <span className="text-xs md:text-sm">Email</span>
        </div>
      </Button>
      <Button
        onClick={() => changeInput({ target: { name: 'auth_type', value: 'phone' } })}
        className={`flex-1 transition-all ${form.auth_type === 'phone' ? 'bg-surface shadow-sm border border-border' : 'bg-transparent'}`}
        variant={form.auth_type === 'phone' ? 'primary' : 'ghost'}
        size="md"
      >
        <div className="flex items-center justify-center gap-1 md:gap-2">
          <HiPhone className="w-3 h-3 md:w-4 md:h-4" />
          <span className="text-xs md:text-sm">Phone</span>
        </div>
      </Button>
    </div>
  );

  // 🔹 Input fields for email & phone
  const renderAuthInput = () => {
    if (form.auth_type === "email") {
      return (
        <CustomInput
          name="email"
          type="email"
          placeholder="Enter your email"
          label="Email Address"
          onChange={changeInput}
          value={form.email}
          disabled={authStatus === 'loading'}
          icon={
            <HiEnvelope className="w-3 h-3 md:w-4 md:h-4 text-text-secondary" />
          }
          labelClassName="text-sm"
          inputClassName="text-sm md:text-base"
        />
      );
    }

    return (
      <div className="space-y-2 md:space-y-3">
        <DropdownWithSearchInput
          label="Country"
          options={countries.map(c => ({
            value: c.id,
            text: (
              <span className="flex items-center gap-1 md:gap-2 text-sm">
                <ReactCountryFlag countryCode={c.iso2} svg className="w-4 h-4 md:w-5 md:h-5" />
                {c.phone_code} • {c.name}
              </span>
            )
          }))}
          value={form.country_id}
          onChange={handleCountrySelect}
          placeholder="Search country..."
          disabled={authStatus === 'loading'}
          icon={
            <HiGlobeAlt className="w-3 h-3 md:w-4 md:h-4 text-text-secondary" />
          }
          labelClassName="text-sm"
          inputClassName="text-sm md:text-base"
          className='w-full'
        />

        <CustomInput
          name="phone"
          type="tel"
          placeholder={form.min_phone_length ? `Phone number (${form.min_phone_length}-${form.max_phone_length} digits)` : 'Phone number'}
          label="Phone Number"
          onChange={handlePhoneChange}
          value={form.phone}
          disabled={authStatus === 'loading' || !form.country_id}
          prefix={form.phone_code ? `${form.phone_code}` : null}
          icon={
            <HiPhone className="w-3 h-3 md:w-4 md:h-4 text-text-secondary" />
          }
          labelClassName="text-sm"
          inputClassName="text-sm md:text-base"
        />

        {form.min_phone_length && (
          <p className="text-xs text-text-muted">
            {form.min_phone_length === form.max_phone_length
              ? `Must be exactly ${form.min_phone_length} digits`
              : `Must be between ${form.min_phone_length} and ${form.max_phone_length} digits`}
          </p>
        )}
      </div>
    );
  };

  // 🔹 Login handler
  const login = async (e) => {
    e.preventDefault();

    if (passcode.length < 4) {
      dispatch(setAlert({ type: 'error', message: 'Enter 4-digit passcode' }));
      return;
    }

    const phoneLength = form.phone.length;
    if (form.auth_type === "phone" && (phoneLength < form.min_phone_length || phoneLength > form.max_phone_length)) {
      dispatch(setAlert({ type: "error", message: `Phone number must be between ${form.min_phone_length} and ${form.max_phone_length} digits` }));
      return;
    }

    try {
      const resultAction = await dispatch(loginUser({
        auth_type: form.auth_type,
        email: form.auth_type === "email" ? form.email : undefined,
        phone: form.auth_type === "phone" ? form.phone : undefined,
        phone_code: form.auth_type === "phone" ? form.phone_code : undefined,
        passcode,
      }));

      if (loginUser.fulfilled.match(resultAction)) {
        const payload = resultAction.payload || {};
        dispatch(setAlert({ type: 'success', message: 'Login successful!' }));

        const allowedPanels = payload.allowed_panels || [];
        if (allowedPanels.length > 1) {
          navigate('/choose-panel');
        } else if (allowedPanels.length === 1) {
          window.location.replace(`${allowedPanels[0].url_prefix}/`);
        } else {
          const panel = payload.url_prefix || null;
          if (panel) {
            window.location.replace(`${panel}/`);
          } else {
            dispatch(setAlert({ type: 'error', message: 'No panel access found for this user.' }));
          }
        }
      } else {
        const errorMessage = resultAction.payload || "Something went wrong. Please try again.";
        dispatch(setAlert({ message: errorMessage, type: "error" }));
      }
    } catch (err) {
      console.error("Login Handler Error:", err);
      dispatch(setAlert({ message: 'An unexpected error occurred.', type: "error" }));
    }
  };

  // 🧪 Direct Login Handler
  const handleDirectLogin = async (cred) => {
    try {
      // 1. Update UI State for visual feedback
      setForm(prev => ({
        ...prev,
        auth_type: 'email',
        email: cred.email
      }));
      setPasscode(cred.password); // In this app, password field in JSON maps to passcode

      // 2. Dispatch Login
      const resultAction = await dispatch(loginUser({
        auth_type: 'email',
        email: cred.email,
        passcode: cred.password,
      }));

      if (loginUser.fulfilled.match(resultAction)) {
        const payload = resultAction.payload || {};
        dispatch(setAlert({ type: 'success', message: 'Direct Login successful!' }));

        const allowedPanels = payload.allowed_panels || [];
        if (allowedPanels.length > 1) {
          navigate('/choose-panel');
        } else if (allowedPanels.length === 1) {
          window.location.replace(`${allowedPanels[0].url_prefix}/`);
        } else {
          const panel = payload.url_prefix || null;
          if (panel) {
            window.location.replace(`${panel}/`);
          } else {
            dispatch(setAlert({ type: 'error', message: 'No panel access found for this user.' }));
          }
        }
      } else {
        const errorMessage = resultAction.payload || "Direct Login failed.";
        dispatch(setAlert({ message: errorMessage, type: "error" }));
      }
    } catch (err) {
      console.error("Direct Login Handler Error:", err);
      dispatch(setAlert({ message: 'An unexpected error occurred during direct login.', type: "error" }));
    }
  };

  const DirectLoginCard = () => {
    // 🔒 Never render on live production domains
    if (!isLocalhost || !testCredentials || testCredentials.length === 0) return null;

    return (
      <div className="mt-6 pt-4 border-t border-border/50">
        <div className="flex items-center justify-between mb-3 px-1">
          <p className="text-[10px] uppercase tracking-wider text-amber-500 font-bold">
            ⚡ Developer Testing Access (Localhost Only)
          </p>
          <span className="text-[10px] bg-amber-500/10 text-amber-500 font-mono font-semibold px-2 py-0.5 rounded-full border border-amber-500/20">
            Dev Only
          </span>
        </div>
        <div className="grid grid-cols-1 gap-2">
          {testCredentials.map((cred, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => handleDirectLogin(cred)}
              className="flex items-center gap-3 p-2.5 rounded-xl bg-surface-hover/50 border border-border/50 hover:border-primary/40 hover:bg-primary/5 transition-all group text-left"
            >
              <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center text-primary group-hover:scale-110 transition-transform shrink-0">
                <HiUserCircle className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-1">
                  <h6 className="font-semibold text-xs text-text-primary truncate">{cred.role}</h6>
                  <span className="text-[10px] font-mono font-semibold bg-surface px-1.5 py-0.5 rounded border border-border text-text-secondary shrink-0">
                    PIN: {cred.password}
                  </span>
                </div>
                <p className="text-xs font-medium text-text-secondary truncate mt-0.5">
                  <span className="text-[10px] text-text-muted font-normal mr-1">ID:</span>
                  {cred.email}
                </p>
                <p className="text-[10px] text-primary/80 group-hover:text-primary mt-0.5 font-medium">Click for instant access →</p>
              </div>
              <HiArrowRight className="w-3.5 h-3.5 text-text-muted group-hover:text-primary group-hover:translate-x-0.5 transition-all shrink-0" />
            </button>
          ))}
        </div>
      </div>
    );
  };

  return (
    <AuthLayout
      title="Welcome Back"
      subtitle="Secure access to your account with our advanced authentication system"
      footerText="New to platform?"
      footerLink="/verify"
      footerLinkText="Verify"
    >
      <form onSubmit={login} className="space-y-3 md:space-y-4">
        <AuthTypeToggle />

        {renderAuthInput()}

        {/* Passcode */}
        <div className="space-y-1 md:space-y-2">
          <div className="flex justify-between items-center">
            <label className="text-sm font-medium text-text-primary">
              4-Digit Passcode
            </label>
            <Link
              to="/forgot-password"
              className="text-xs text-primary hover:text-primary-hover font-medium transition-colors"
            >
              Forgot Passcode?
            </Link>
          </div>
          <OTPInput
            length={4}
            onChange={setPasscode}
            disabled={authStatus === 'loading'}
            className="justify-center"
            inputClassName="w-10 h-10 md:w-12 md:h-12 text-base md:text-lg"
          />
        </div>

        {/* Submit Button */}
        <Button
          type="submit"
          loading={authStatus === 'loading'}
          fullWidth
          size="lg"
          className="mt-2 md:mt-3"
          leftIcon={authStatus !== 'loading' && (
            <HiArrowLeftOnRectangle className="w-4 h-4" />
          )}
        >
          <span className="text-xs md:text-sm">{authStatus === 'loading' ? 'Authenticating...' : 'Sign In'}</span>
        </Button>

        {/* Divider */}
        <div className="relative my-3 md:my-4">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-border"></div>
          </div>
          <div className="relative flex justify-center">
            <span className="px-2 md:px-3 bg-surface text-text-muted text-xs md:text-sm">
              First time here?
            </span>
          </div>
        </div>

        {/* Sign Up Link */}
        <div className="text-center mt-2">
          <Link
            to="/verify"
            className="inline-flex items-center gap-1 md:gap-2 text-primary hover:text-primary-hover font-medium transition-colors group text-xs md:text-sm"
          >
            <span>Verify your account</span>
            <HiArrowRight className="w-2.5 h-2.5 md:w-3 md:h-3 transform group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>

        {/* 🧪 Testing Card */}
        <DirectLoginCard />
      </form>
    </AuthLayout>
  );
}