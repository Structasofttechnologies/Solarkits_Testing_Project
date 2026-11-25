// Verify.jsx (updated)
import { useState, useEffect } from "react";
import CustomInput from "../components/CustomInput";
import { Link, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { setAlert } from "../features/alert.slice";
import axios from "axios";
import OTPInput from "../components/OTPInput";
import ReactCountryFlag from "react-country-flag";
import DropdownWithSearchInput from "../components/DropdownWithSearchInput";
import AuthLayout from "../components/auth/AuthLayout";
import Button from "../components/Button";
import { fetchCountries } from "../features/countries.slice";
import { HiEnvelope, HiPhone, HiGlobeAlt, HiInformationCircle, HiCheckCircle, HiShieldCheck, HiArrowLeft, HiArrowRight } from "react-icons/hi2";

export default function Verify() {
  const [form, setForm] = useState({
    verification_type: 'email',
    email: '',
    phone: '',
    country_id: null,
    phone_code: '',
    min_phone_length: null,
    max_phone_length: null,
  });
  const [otpSent, setOtpSent] = useState(false);
  const [expireTime, setExpireTime] = useState(null);
  const [verificationToken, setVerificationToken] = useState(null);
  const [otp, setOtp] = useState("");
  const [timeLeft, setTimeLeft] = useState(0);
  const [loading, setLoading] = useState(false);
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const { items: countries, status: countriesStatus } = useSelector((state) => state.countries);

  const isDisabled = (expireTime && Date.now() < expireTime) || loading;

  useEffect(() => {
    if (form.verification_type === "phone" && countriesStatus === 'idle') {
      dispatch(fetchCountries()).unwrap().catch(err => {
        dispatch(setAlert({ type: "error", message: err }));
      });
    }
  }, [form.verification_type, countriesStatus, dispatch]);

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

  const changeInput = (e) => {
    if (e.target.name === 'verification_type' && e.target.value === 'phone' && countriesStatus === 'idle') {
      dispatch(fetchCountries()).unwrap().catch(err => {
        dispatch(setAlert({ type: "error", message: err }));
      });
    }
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  // Auth Type Toggle Component
  const VerificationTypeToggle = () => (
    <div className="flex gap-2 p-1 bg-surface-hover rounded-lg mb-4">
      <Button
        onClick={() => changeInput({ target: { name: 'verification_type', value: 'email' } })}
        className={`flex-1 transition-all ${form.verification_type === 'email' ? 'bg-surface shadow-sm border border-border' : 'bg-transparent'}`}
        variant={form.verification_type === 'email' ? 'primary' : 'ghost'}
        size="md"
      >
        <div className="flex items-center justify-center gap-2">
          <HiEnvelope className="w-4 h-4" />
          Email
        </div>
      </Button>
      <Button
        onClick={() => changeInput({ target: { name: 'verification_type', value: 'phone' } })}
        className={`flex-1 transition-all ${form.verification_type === 'phone' ? 'bg-surface shadow-sm border border-border' : 'bg-transparent'}`}
        variant={form.verification_type === 'phone' ? 'primary' : 'ghost'}
        size="md"
      >
        <div className="flex items-center justify-center gap-2">
          <HiPhone className="w-4 h-4" />
          Phone
        </div>
      </Button>
    </div>
  );

  // Render auth input based on type
  const renderAuthInput = () => {
    if (form.verification_type === "email") {
      return (
        <CustomInput
          name="email"
          type="email"
          placeholder="Enter your email address"
          label="Email Address"
          onChange={changeInput}
          value={form.email}
          disabled={isDisabled}
          icon={
            <HiEnvelope className="w-4 h-4 text-text-secondary" />
          }
        />
      );
    }

    return (
      <div className="space-y-3">
        <DropdownWithSearchInput
          label="Country"
          options={countries.map(c => ({
            value: c.id,
            text: (
              <span className="flex items-center gap-2">
                <ReactCountryFlag countryCode={c.iso2} svg className="w-5 h-5" />
                {c.phone_code} • {c.name}
              </span>
            )
          }))}
          value={form.country_id}
          onChange={handleCountrySelect}
          placeholder="Search country..."
          disabled={isDisabled}
          icon={
            <HiGlobeAlt className="w-4 h-4 text-text-secondary" />
          }
          className='w-full'
        />

        <CustomInput
          name="phone"
          type="tel"
          placeholder={form.min_phone_length ? `Phone number (${form.min_phone_length}-${form.max_phone_length} digits)` : 'Phone number'}
          label="Phone Number"
          onChange={handlePhoneChange}
          value={form.phone}
          disabled={isDisabled || !form.country_id}
          prefix={form.phone_code ? `${form.phone_code}` : null}
          icon={
            <HiPhone className="w-4 h-4 text-text-secondary" />
          }
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

  const getVerificationCode = async (e) => {
    e.preventDefault();
    
    if (form.verification_type === "phone" && (!form.country_id || !form.phone)) {
      return dispatch(setAlert({ type: "error", message: "Please select a country and enter your phone number" }));
    }
    
    if (form.verification_type === "email" && !form.email) {
      return dispatch(setAlert({ type: "error", message: "Please enter your email address" }));
    }

    try {
      setLoading(true);
      const res = await axios.post(`${import.meta.env.VITE_AUTH_API_URL || import.meta.env.VITE_API_URL}/request-verify-account-otp`, {
        verification_type: form.verification_type,
        email: form.verification_type === "email" ? form.email : undefined,
        phone: form.verification_type === "phone" ? form.phone : undefined,
        phone_code: form.phone_code
      });

      const { message, status, expire_time, token } = res.data;
      setExpireTime(new Date(expire_time).getTime());
      setVerificationToken(token);
      setOtpSent(true);
      dispatch(setAlert({ message, type: status }));
    } catch (err) {
      const msg = err.response?.data?.message || err.message || "Failed to send verification code";
      dispatch(setAlert({ type: "error", message: msg }));
    } finally {
      setLoading(false);
    }
  };

  const verifyOtp = async () => {
    if (otp.length !== 6) {
      dispatch(setAlert({ type: "error", message: "Please enter a valid 6-digit OTP" }));
      return;
    }

    try {
      setLoading(true);
      const res = await axios.post(`${import.meta.env.VITE_AUTH_API_URL || import.meta.env.VITE_API_URL}/verify-otp`, {
        token: verificationToken,
        otp
      });

      const { message, status, token } = res.data;
      localStorage.setItem("passcodeToken", JSON.stringify({ token }));
      dispatch(setAlert({ message, type: status }));
      navigate('/set-passcode');
    } catch (err) {
      const msg = err.response?.data?.message || "Verification failed. Please try again.";
      // If tries are exceeded, reset the OTP flow
      if (err.response?.status === 429 || msg.toLowerCase().includes('too many')) {
        dispatch(setAlert({ type: "error", message: `${msg} Please request a new code.` }));
        setOtpSent(false);
        setExpireTime(null);
        setVerificationToken(null);
        setOtp("");
        return;
      }
      dispatch(setAlert({ type: "error", message: msg }));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!expireTime) return;
    const interval = setInterval(() => {
      const diff = Math.max(0, expireTime - Date.now());
      setTimeLeft(diff);
      if (diff <= 0) {
        clearInterval(interval);
        setOtpSent(false);
        setExpireTime(null);
        setVerificationToken(null);
        dispatch(setAlert({ type: "warning", message: "Verification code has expired" }));
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [expireTime, dispatch]);

  const formatTime = (ms) => {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const renderFormContent = () => {
    if (!otpSent) {
      return (
        <form onSubmit={getVerificationCode} className="space-y-4">
          <VerificationTypeToggle />
          
          {renderAuthInput()}
          
          <Button
            type="submit"
            disabled={isDisabled || loading}
            loading={loading}
            fullWidth
            size="lg"
            leftIcon={!loading && (
              <HiInformationCircle className="w-4 h-4" />
            )}
          >
            {loading ? 'Sending Code...' : 'Get Verification Code'}
          </Button>
        </form>
      );
    }

    return (
      <div className="space-y-4">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-success/10 mb-3">
            <HiCheckCircle className="w-6 h-6 text-success" />
          </div>
          <h3 className="text-lg font-bold text-text-primary mb-1">
            Verification Code Sent
          </h3>
          <p className="text-text-secondary text-sm">
            Enter the 6-digit code sent to your {form.verification_type}
          </p>
        </div>

        <div className="space-y-3">
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <label className="text-sm font-medium text-text-primary">
                6-Digit Verification Code
              </label>
              {timeLeft > 0 && (
                <span className="text-sm font-medium text-danger">
                  Expires in {formatTime(timeLeft)}
                </span>
              )}
            </div>
            <OTPInput 
              length={6} 
              onChange={setOtp}
              disabled={loading}
              className="justify-center"
            />
          </div>

          <Button
            onClick={verifyOtp}
            disabled={loading || otp.length !== 6}
            loading={loading}
            fullWidth
            size="lg"
            leftIcon={!loading && (
              <HiShieldCheck className="w-4 h-4" />
            )}
          >
            {loading ? 'Verifying...' : 'Verify OTP'}
          </Button>
        </div>

        <div className="text-center">
          <Button
            variant="link"
            onClick={() => {
              setOtpSent(false);
              setOtp("");
            }}
            leftIcon={(
              <HiArrowLeft className="w-3 h-3" />
            )}
          >
            Back to verification method
          </Button>
        </div>
      </div>
    );
  };

  return (
    <AuthLayout
      title="Account Verification"
      subtitle="Verify your identity to access secure features and set up your account"
      footerText="Already have an account?"
      footerLink="/login"
      footerLinkText="Sign In"
    >
      {renderFormContent()}

      {/* Divider & Links */}
      <div className="relative my-4">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-border"></div>
        </div>
        <div className="relative flex justify-center text-sm">
          <span className="px-3 bg-surface text-text-muted text-xs">
            Have an account?
          </span>
        </div>
      </div>

      <div className="text-center">
        <Link
          to="/login"
          className="inline-flex items-center gap-2 text-primary hover:text-primary-hover font-medium transition-colors group text-sm"
        >
          <span>Sign in to existing account</span>
          <HiArrowRight className="w-3 h-3 transform group-hover:translate-x-1 transition-transform" />
        </Link>
      </div>
    </AuthLayout>
  );
}