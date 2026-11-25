import { useState, useRef } from "react";
import {
  FaCheck,
  FaTimes,
  FaExclamationTriangle,
  FaShieldAlt,
  FaLock
} from "react-icons/fa";
import OTPInput from "./OTPInput";
import Button from "./Button";
import IconButton from "./IconButton";

export default function ConfirmationPopup({
  isOpen,
  title,
  message,
  mode = "text",
  otpLength = 6,
  onConfirm,
  onCancel,
  onClose,
  confirmText = "Confirm",
  cancelText = "Cancel",
  isLoading = false,
  variant = "info",
  otpMessage = "Enter OTP sent to your registered contact",
  showIcon = true,
  customContent = null,
  confirmButtonProps = {},
  cancelButtonProps = {}
}) {
  const [otp, setOtp] = useState("");
  const [otpError, setOtpError] = useState("");
  const mouseDownOnBackdrop = useRef(false);

  if (!isOpen) return null;

  // Variant-specific configurations with premium gradients
  const variantConfig = {
    warning: {
      bg: "bg-warning/5",
      gradient: "var(--gradient-warning)",
      softGradient: "var(--gradient-warning-soft)",
      iconBg: "bg-warning/10",
      iconColor: "text-warning",
      icon: FaExclamationTriangle,
      buttonVariant: "warning",
      border: "border-warning/30",
      shadow: "shadow-warning/20",
    },
    danger: {
      bg: "bg-danger/5",
      gradient: "var(--gradient-danger)",
      softGradient: "var(--gradient-danger-soft)",
      iconBg: "bg-danger/10",
      iconColor: "text-danger",
      icon: FaExclamationTriangle,
      buttonVariant: "danger",
      border: "border-danger/30",
      shadow: "shadow-danger/20",
    },
    success: {
      bg: "bg-success/5",
      gradient: "var(--gradient-success)",
      softGradient: "var(--gradient-success-soft)",
      iconBg: "bg-success/10",
      iconColor: "text-success",
      icon: FaCheck,
      buttonVariant: "success",
      border: "border-success/30",
      shadow: "shadow-success/20",
    },
    info: {
      bg: "bg-primary/5",
      gradient: "var(--gradient-primary)",
      softGradient: "var(--gradient-primary-soft)",
      iconBg: "bg-primary/10",
      iconColor: "text-primary",
      icon: FaShieldAlt,
      buttonVariant: "primary",
      border: "border-primary/30",
      shadow: "shadow-primary/20",
    },
    secure: {
      bg: "bg-primary/5",
      gradient: "var(--gradient-primary)",
      softGradient: "var(--gradient-primary-soft)",
      iconBg: "gradient-primary",
      iconColor: "text-white",
      icon: FaLock,
      buttonVariant: "primary",
      border: "border-primary/30",
      shadow: "shadow-primary/30",
    }
  };

  const config = variantConfig[variant] || variantConfig.info;

  const handleOTPChange = (value) => {
    setOtp(value);
    setOtpError("");
  };

  const handleConfirm = () => {
    if (mode === "otp") {
      if (otp.length !== otpLength) {
        setOtpError(`OTP must be ${otpLength} digits`);
        return;
      }
      onConfirm?.(otp);
      setOtp("");
      setOtpError("");
    } else {
      onConfirm?.();
    }
  };

  const handleCancel = () => {
    setOtp("");
    setOtpError("");
    onCancel?.();
    onClose?.();
  };

  // Backdrop close: only fire when both mousedown AND mouseup land on backdrop
  const handleBackdropMouseDown = (e) => {
    mouseDownOnBackdrop.current = e.target === e.currentTarget;
  };

  const handleBackdropMouseUp = (e) => {
    if (mouseDownOnBackdrop.current && e.target === e.currentTarget) {
      handleCancel();
    }
    mouseDownOnBackdrop.current = false;
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-500"
      onMouseDown={handleBackdropMouseDown}
      onMouseUp={handleBackdropMouseUp}
    >
      <div
        className={`relative w-full max-w-md overflow-hidden rounded-2xl border ${config.border} bg-surface shadow-2xl animate-in zoom-in-95 slide-in-from-bottom-8 duration-500 ${config.shadow}`}
        onMouseDown={(e) => e.stopPropagation()}
        onMouseUp={(e) => e.stopPropagation()}
      >
        
        {/* Background Mesh Glow */}
        <div className="absolute -top-24 -right-24 w-64 h-64 blur-[100px] opacity-20 rounded-full" style={{ background: config.gradient }} />
        <div className="absolute -bottom-24 -left-24 w-64 h-64 blur-[100px] opacity-10 rounded-full" style={{ background: config.gradient }} />

        {/* Decorative Header */}
        <div className="relative pt-8 pb-5 px-6 flex flex-col items-center text-center">
          {showIcon && (
            <div className="relative mb-4">
              <div
                className="absolute inset-0 blur-2xl opacity-40 rounded-full"
                style={{ background: config.gradient }}
              />
              <div className={`relative w-16 h-16 rounded-2xl ${variant === "secure" ? "gradient-primary" : "bg-surface border " + config.border} shadow-lg flex items-center justify-center transition-transform duration-700 hover:rotate-6`}>
                <config.icon className={`text-3xl ${variant === "secure" ? "text-white" : config.iconColor}`} />
              </div>
              {/* Secondary pulsing ring */}
              <div className={`absolute -inset-1.5 rounded-2xl border-2 ${config.border} opacity-20 animate-ping`} />
            </div>
          )}

          <h2 className="text-xl font-black text-text-primary tracking-tight uppercase mb-1.5">
            {title}
          </h2>
          <p className="text-sm text-text-secondary font-medium leading-relaxed px-2">
            {message}
          </p>

          <IconButton
            variant="ghost"
            size="sm"
            onClick={handleCancel}
            disabled={isLoading}
            className="absolute top-4 right-4 w-9 h-9 rounded-full hover:bg-surface-hover hover:rotate-90 transition-all duration-300"
          >
            <FaTimes className="text-text-muted" />
          </IconButton>
        </div>

        {/* Action Area */}
        <div className="relative p-6 pt-1 bg-gradient-to-b from-transparent to-surface-hover/30">
          
          {mode === "custom" && (
            <div className="mb-6 p-4 rounded-xl bg-surface/50 border border-border backdrop-blur-sm shadow-inner">
              {customContent}
            </div>
          )}

          {/* OTP Input Section with Premium Styling */}
          {mode === "otp" && (
            <div className="mb-6">
              <div className="flex items-center gap-3 mb-5 justify-center">
                <div className="p-2 rounded-lg bg-primary/10 text-primary shadow-sm shadow-primary/10">
                  <FaLock size={12} />
                </div>
                <p className="text-[10px] font-black text-text-muted uppercase tracking-widest">{otpMessage}</p>
              </div>
              
              <div className="flex justify-center scale-105 mb-5">
                <OTPInput
                  length={otpLength}
                  onChange={handleOTPChange}
                />
              </div>
              
              {otpError && (
                <div className="flex items-center gap-2 justify-center py-2 px-3 rounded-lg bg-danger/10 text-danger animate-bounce">
                  <FaExclamationTriangle size={12} />
                  <p className="text-[10px] font-black uppercase tracking-tight">{otpError}</p>
                </div>
              )}
            </div>
          )}

          {/* Buttons with Premium Design System */}
          <div className="flex flex-col sm:flex-row gap-3">
            <Button
              onClick={handleCancel}
              disabled={isLoading}
              variant="secondary"
              size="md"
              fullWidth
              className="order-2 sm:order-1 rounded-xl font-black uppercase tracking-widest text-[9px] h-12 border-2 border-border hover:bg-surface-hover transition-all duration-300"
              {...cancelButtonProps}
            >
              {cancelText}
            </Button>
            
            <Button
              onClick={handleConfirm}
              disabled={isLoading || (mode === "otp" && otp.length !== otpLength)}
              variant={config.buttonVariant}
              size="md"
              fullWidth
              loading={isLoading}
              className={`order-1 sm:order-2 rounded-xl font-black uppercase tracking-widest text-[9px] h-12 shadow-lg transition-all duration-300 hover:scale-[1.02] active:scale-95`}
              {...confirmButtonProps}
            >
              {isLoading ? "Synchronizing..." : confirmText}
            </Button>
          </div>

          {/* Footer Security Badge */}
          {mode === "otp" && (
            <div className="mt-6 flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg bg-primary/5 border border-primary/10">
              <FaShieldAlt className="text-primary text-xs" />
              <span className="text-[9px] font-black text-primary/60 uppercase tracking-tight">Encrypted Session • OTP Expires in 5m</span>
            </div>
          )}
        </div>

        {/* Bottom Decorative Bar */}
        <div className="h-1.5 w-full opacity-60" style={{ background: config.gradient }} />
      </div>
    </div>
  );
}
