// pages/ForgotPassword.jsx
import { useState } from"react";
import { useNavigate, Link } from"react-router-dom";
import { useDispatch } from"react-redux";
import { FiMail, FiPhone, FiArrowLeft, FiArrowRight, FiCheckCircle, FiClock, FiShield, FiEye, FiEyeOff, FiSun, FiMoon } from"react-icons/fi";
import Button from "../Components/Button";
import CustomInput from "../Components/CustomInput";
import IconButton from "../Components/IconButton";
import OTPInput from "../Components/OTPInput";
import { setAlert } from"../features/alert.slice";
import axios from"axios";
import { useTheme } from"../hooks/useTheme";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

export default function ForgotPassword() {
  const { toggleTheme, isDark } = useTheme();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [loading, setLoading] = useState(false);
  const [resetMethod, setResetMethod] = useState("email");
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState({
    email:"",
    phoneNumber:"",
    otp:"",
    newPassword:"",
    confirmPassword:"",
  });
  const [errors, setErrors] = useState({});
  const [timer, setTimer] = useState(60);
  const [canResend, setCanResend] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));

    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]:"" }));
    }
  };

  const handleOTPChange = (otp) => {
    setFormData(prev => ({ ...prev, otp }));
    if (errors.otp) {
      setErrors(prev => ({ ...prev, otp:"" }));
    }
  };

  const validateStep1 = () => {
    let hasError = false;

    if (resetMethod ==="email") {
      if (!formData.email.trim()) {
        dispatch(setAlert({ type:"error", message:"Email is required" }));
        hasError = true;
      } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
        dispatch(setAlert({ type:"error", message:"Please enter a valid email" }));
        hasError = true;
      }
    } else {
      if (!formData.phoneNumber.trim()) {
        dispatch(setAlert({ type:"error", message:"Phone number is required" }));
        hasError = true;
      } else if (!/^\d{10}$/.test(formData.phoneNumber.replace(/[\s-]/g, ''))) {
        dispatch(setAlert({ type:"error", message:"Please enter a valid 10-digit phone number" }));
        hasError = true;
      }
    }

    return !hasError;
  };

  const validateStep3 = () => {
    let hasError = false;

    if (!formData.newPassword) {
      dispatch(setAlert({ type:"error", message:"New password is required" }));
      hasError = true;
    } else if (formData.newPassword.length < 8) {
      dispatch(setAlert({ type:"error", message:"Password must be at least 8 characters" }));
      hasError = true;
    }

    if (formData.newPassword !== formData.confirmPassword) {
      dispatch(setAlert({ type:"error", message:"Passwords do not match" }));
      hasError = true;
    }

    return !hasError;
  };

  const handleRequestOTP = async (e) => {
    e?.preventDefault();
    if (!validateStep1()) return;

    setLoading(true);

    try {
      const payload = resetMethod ==="email" 
        ? { email: formData.email }
        : { whatsapp: formData.phoneNumber };
      
      await axios.post(`${API_BASE_URL}/india/v1/auth/forgot-password/send-otp`, payload, {
        withCredentials: true
      });
      
      setLoading(false);
      setCurrentStep(2);
      startTimer();
      
      const identifier = resetMethod ==="email" 
        ? formData.email 
        : formData.phoneNumber;
      
      dispatch(setAlert({
        type:"success",
        message:`Verification code sent to ${identifier}`
      }));
      
    } catch (error) {
      setLoading(false);
      const errorMessage = error.response?.data?.message ||"Failed to send verification code. Please try again.";
      dispatch(setAlert({ type:"error", message: errorMessage }));
    }
  };

  const handleVerifyOTP = async (e) => {
    e?.preventDefault();

    if (!formData.otp || formData.otp.length < 6) {
      dispatch(setAlert({ type:"error", message:"Please enter complete OTP" }));
      return;
    }

    setLoading(true);

    try {
      const payload = resetMethod ==="email"
        ? { email: formData.email, otp: formData.otp }
        : { whatsapp: formData.phoneNumber, otp: formData.otp };
      
      await axios.post(`${API_BASE_URL}/india/v1/auth/forgot-password/verify-otp`, payload, {
        withCredentials: true
      });
      
      setLoading(false);
      setCurrentStep(3);
      
      dispatch(setAlert({
        type:"success",
        message:"OTP verified successfully! You can now reset your password."
      }));
      
    } catch (error) {
      setLoading(false);
      const errorMessage = error.response?.data?.message ||"Invalid OTP. Please try again.";
      dispatch(setAlert({ type:"error", message: errorMessage }));
    }
  };

  const handleResetPassword = async (e) => {
    e?.preventDefault();
    if (!validateStep3()) return;

    setLoading(true);

    try {
      const payload = {
        newPassword: formData.newPassword
      };
      
      await axios.post(`${API_BASE_URL}/india/v1/auth/forgot-password/reset-password`, payload, {
        withCredentials: true
      });
      
      setLoading(false);
      
      dispatch(setAlert({
        type:"success",
        message:"Password reset successfully! Please login with your new password."
      }));
      
      navigate("/auth/login");
      
    } catch (error) {
      setLoading(false);
      const errorMessage = error.response?.data?.message ||"Failed to reset password. Please try again.";
      dispatch(setAlert({ type:"error", message: errorMessage }));
    }
  };

  const startTimer = () => {
    setTimer(60);
    setCanResend(false);

    const interval = setInterval(() => {
      setTimer(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          setCanResend(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const handleResendOTP = async () => {
    if (!canResend) {
      dispatch(setAlert({
        type:"warning",
        message:`Please wait ${timer} seconds before resending`
      }));
      return;
    }
    
    setFormData(prev => ({ ...prev, otp:"" }));
    setLoading(true);

    try {
      const payload = resetMethod ==="email" 
        ? { email: formData.email }
        : { whatsapp: formData.phoneNumber };
      
      await axios.post(`${API_BASE_URL}/india/v1/auth/forgot-password/send-otp`, payload, {
        withCredentials: true
      });
      
      setLoading(false);
      startTimer();
      
      const identifier = resetMethod ==="email" 
        ? formData.email 
        : formData.phoneNumber;
      
      dispatch(setAlert({
        type:"info",
        message:`New verification code sent to ${identifier}`
      }));
      
    } catch (error) {
      setLoading(false);
      const errorMessage = error.response?.data?.message ||"Failed to resend code. Please try again.";
      dispatch(setAlert({ type:"error", message: errorMessage }));
    }
  };

  const setEmailMethod = () => {
    setResetMethod("email");
    setErrors({});
  };

  const setPhoneMethod = () => {
    setResetMethod("phone");
    setErrors({});
  };

  const goBack = () => {
    if (currentStep > 1) {
      setCurrentStep(prev => prev - 1);
      setErrors({});
    } else {
      navigate("/auth/login");
    }
  };

  const getIdentifier = () => {
    return resetMethod ==="email"
      ? formData.email
      : formData.phoneNumber;
  };

  return (
    <div className="min-h-screen bg-gradient-bg-subtle transition-colors duration-300">
      {/* Header with gradient */}
      <div className="bg-gradient-to-r from-primary to-primary-end rounded-b-3xl shadow-lg mb-8 relative">
        <div className="absolute top-4 right-4 z-10">
          <button
            type="button"
            onClick={toggleTheme}
            className="flex items-center justify-center w-10 h-10 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-all duration-300 shadow-sm border border-white/20 hover:rotate-12 active:scale-95 cursor-pointer"
            title={isDark ?"Switch to Light Mode" :"Switch to Dark Mode"}
          >
            {isDark ? <FiSun size={18} /> : <FiMoon size={18} />}
          </button>
        </div>
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="text-center">
            <h1 className="text-3xl lg:text-4xl font-bold text-white mb-2">
              {currentStep === 1 &&"Forgot Password"}
              {currentStep === 2 &&"Verify OTP"}
              {currentStep === 3 &&"Create New Password"}
            </h1>
            <p className="text-white/90 text-lg">
              {currentStep === 1 &&"We'll send you a verification code"}
              {currentStep === 2 &&`Enter the code sent to ${getIdentifier()}`}
              {currentStep === 3 &&"Choose a strong password for your account"}
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
                Need Help?
              </h2>

              <div className="space-y-4">
                <div className="flex gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <FiShield className="text-primary dark:text-info" size={20} />
                  </div>
                  <div>
                    <h3 className="font-semibold text-text-primary dark:text-info">Secure Recovery</h3>
                    <p className="text-sm text-text-secondary">Your account security is our top priority</p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <div className="w-10 h-10 rounded-full bg-success/10 flex items-center justify-center flex-shrink-0">
                    <FiClock className="text-success" size={20} />
                  </div>
                  <div>
                    <h3 className="font-semibold text-text-primary dark:text-info">Quick Process</h3>
                    <p className="text-sm text-text-secondary">Reset your password in minutes</p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <div className="w-10 h-10 rounded-full bg-warning/10 flex items-center justify-center flex-shrink-0">
                    <FiCheckCircle className="text-warning" size={20} />
                  </div>
                  <div>
                    <h3 className="font-semibold text-text-primary dark:text-info">24/7 Support</h3>
                    <p className="text-sm text-text-secondary">Contact us if you need assistance</p>
                  </div>
                </div>
              </div>

              {/* Progress Steps */}
              <div className="mt-6 p-4 bg-surface-hover rounded-xl border border-border">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-text-secondary">Step {currentStep} of 3</span>
                  <span className="text-xs font-medium text-primary dark:text-info">
                    {currentStep === 1 &&"Request"}
                    {currentStep === 2 &&"Verify"}
                    {currentStep === 3 &&"Reset"}
                  </span>
                </div>
                <div className="w-full bg-border rounded-full h-1.5">
                  <div
                    className="bg-primary h-1.5 rounded-full transition-all duration-300"
                    style={{ width:`${(currentStep / 3) * 100}%` }}
                  ></div>
                </div>
              </div>

              {/* Help Text */}
              <div className="mt-6 p-4 bg-primary/5 rounded-xl border border-primary/20">
                <p className="text-xs text-text-secondary">
                  Having trouble? Contact our support team at{""}
                  <a href="mailto:support@solarmarket.com" className="text-primary dark:text-info hover:underline">
                    support@solarmarket.com
                  </a>
                </p>
              </div>
            </div>
          </div>

          {/* Right Column - Form */}
          <div className="lg:w-2/3">
            <div className="bg-surface rounded-2xl shadow-lg border border-border overflow-hidden">
              {/* Form Header with Back Button */}
              <div className="bg-gradient-bg-subtle px-6 py-4 border-b border-border flex items-center gap-3">
                <IconButton
                  type="button"
                  onClick={goBack}
                  variant="ghost"
                  size="sm"
                  className="hover:bg-surface-hover"
                >
                  <FiArrowLeft size={18} />
                </IconButton>
                <div>
                  <h2 className="text-xl font-bold text-text-primary dark:text-info">
                    {currentStep === 1 &&"Reset Password"}
                    {currentStep === 2 &&"Enter Verification Code"}
                    {currentStep === 3 &&"Set New Password"}
                  </h2>
                  <p className="text-sm text-text-secondary">
                    {currentStep === 1 &&"Choose how you want to reset your password"}
                    {currentStep === 2 &&`We've sent a 6-digit code to your ${resetMethod}`}
                    {currentStep === 3 &&"Your new password must be different from previous ones"}
                  </p>
                </div>
              </div>

              <form onSubmit={
                currentStep === 1 ? handleRequestOTP :
                  currentStep === 2 ? handleVerifyOTP :
                    handleResetPassword
              } className="p-6">
                {currentStep === 1 && (
                  <div className="space-y-4">
                    {/* Method Toggle */}
                    <div className="mb-6">
                      <label className="block text-text-primary dark:text-info font-medium mb-2">
                        Reset via
                      </label>
                      <div className="flex gap-3">
                        <Button
                          type="button"
                          onClick={setEmailMethod}
                          variant={resetMethod ==="email" ?"primary" :"secondary"}
                          size="sm"
                          leftIcon={<FiMail size={16} />}
                          className={`flex-1 ${resetMethod ==="email" ?"" :"border-border"}`}
                        >
                          Email
                        </Button>
                        <Button
                          type="button"
                          onClick={setPhoneMethod}
                          variant={resetMethod ==="phone" ?"primary" :"secondary"}
                          size="sm"
                          leftIcon={<FiPhone size={16} />}
                          className={`flex-1 ${resetMethod ==="phone" ?"" :"border-border"}`}
                        >
                          Phone
                        </Button>
                      </div>
                    </div>

                    {/* Dynamic Field - Email or Phone */}
                    {resetMethod ==="email" ? (
                      <CustomInput
                        name="email"
                        label="Email Address"
                        placeholder="Enter your registered email"
                        value={formData.email}
                        onChange={handleInputChange}
                        type="email"
                        className={errors.email ?"border-danger" :""}
                      />
                    ) : (
                      <CustomInput
                        name="phoneNumber"
                        label="Phone Number"
                        placeholder="Enter 10-digit phone number"
                        value={formData.phoneNumber}
                        onChange={handleInputChange}
                        type="tel"
                        maxLength={10}
                        className={errors.phoneNumber ?"border-danger" :""}
                      />
                    )}

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
                        Send Reset Code
                      </Button>
                    </div>
                  </div>
                )}

                {currentStep === 2 && (
                  <div className="space-y-6">
                    {/* OTP Input */}
                    <div>
                      <label className="block text-text-primary dark:text-info font-medium mb-3">
                        Enter 6-digit Code
                      </label>
                      <OTPInput length={6} onChange={handleOTPChange} />
                    </div>

                    {/* Resend Timer */}
                    <div className="flex items-center justify-between">
                      <p className="text-sm text-text-secondary">
                        Didn't receive the code?
                      </p>
                      {canResend ? (
                        <Button
                          type="button"
                          onClick={handleResendOTP}
                          variant="link"
                          size="sm"
                          className="text-primary dark:text-info font-medium"
                        >
                          Resend Code
                        </Button>
                      ) : (
                        <span className="text-sm text-text-secondary">
                          Resend in {timer}s
                        </span>
                      )}
                    </div>

                    {/* Verify Button */}
                    <div className="mt-6">
                      <Button
                        type="submit"
                        variant="primary"
                        size="md"
                        loading={loading}
                        fullWidth
                        rightIcon={<FiArrowRight size={18} />}
                      >
                        Verify Code
                      </Button>
                    </div>
                  </div>
                )}

                {currentStep === 3 && (
                  <div className="space-y-4">
                    {/* New Password */}
                    <div className="relative">
                      <CustomInput
                        name="newPassword"
                        label="New Password"
                        placeholder="Enter new password"
                        value={formData.newPassword}
                        onChange={handleInputChange}
                        type={showNewPassword ?"text" :"password"}
                        className={errors.newPassword ?"border-danger" :""}
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPassword(!showNewPassword)}
                        className="absolute right-3 top-9 text-text-secondary hover:text-text-primary dark:text-info transition-colors"
                      >
                        {showNewPassword ? <FiEyeOff size={18} /> : <FiEye size={18} />}
                      </button>
                    </div>

                    {/* Confirm Password */}
                    <div className="relative">
                      <CustomInput
                        name="confirmPassword"
                        label="Confirm Password"
                        placeholder="Re-enter new password"
                        value={formData.confirmPassword}
                        onChange={handleInputChange}
                        type={showConfirmPassword ?"text" :"password"}
                        className={errors.confirmPassword ?"border-danger" :""}
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-3 top-9 text-text-secondary hover:text-text-primary dark:text-info transition-colors"
                      >
                        {showConfirmPassword ? <FiEyeOff size={18} /> : <FiEye size={18} />}
                      </button>
                    </div>

                    {/* Password Strength Indicator */}
                    <div className="bg-surface-hover p-3 rounded-lg border border-border">
                      <p className="text-xs text-text-secondary mb-2">Password must contain:</p>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="flex items-center gap-1">
                          <div className={`w-2 h-2 rounded-full ${formData.newPassword.length >= 8 ?"bg-success" :"bg-gray-300"}`}></div>
                          <span className="text-xs text-text-secondary">8+ characters</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <div className={`w-2 h-2 rounded-full ${/[A-Z]/.test(formData.newPassword) ?"bg-success" :"bg-gray-300"}`}></div>
                          <span className="text-xs text-text-secondary">Uppercase letter</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <div className={`w-2 h-2 rounded-full ${/[0-9]/.test(formData.newPassword) ?"bg-success" :"bg-gray-300"}`}></div>
                          <span className="text-xs text-text-secondary">Number</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <div className={`w-2 h-2 rounded-full ${/[!@#$%^&*]/.test(formData.newPassword) ?"bg-success" :"bg-gray-300"}`}></div>
                          <span className="text-xs text-text-secondary">Special character</span>
                        </div>
                      </div>
                    </div>

                    {/* Reset Button */}
                    <div className="mt-6">
                      <Button
                        type="submit"
                        variant="primary"
                        size="md"
                        loading={loading}
                        fullWidth
                        rightIcon={<FiArrowRight size={18} />}
                      >
                        Reset Password
                      </Button>
                    </div>
                  </div>
                )}

                {/* Back to Login Link */}
                <p className="mt-6 text-center text-sm text-text-secondary">
                  Remember your password?{""}
                  <Link to="/auth/login" className="text-primary dark:text-info hover:underline font-medium">
                    Sign in
                  </Link>
                </p>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}