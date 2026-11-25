import { useRef } from "react";

export default function OTPInput({ length = 6, onChange, disabled = false, className = "", inputClassName = "" }) {
  const inputs = useRef([]);

  const handleChange = (e, index) => {
    const value = e.target.value.replace(/[^0-9]/g, "");
    e.target.value = value;

    if (value && index < length - 1) {
      inputs.current[index + 1].focus();
    }

    const otp = inputs.current.map((input) => input.value).join("");
    onChange?.(otp);
  };

  const handleKeyDown = (e, index) => {
    if (e.key === "Backspace" && !e.target.value && index > 0) {
      inputs.current[index - 1].focus();
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pastedData = e.clipboardData
      .getData("Text")
      .replace(/[^0-9]/g, "")
      .slice(0, length);

    pastedData.split("").forEach((char, i) => {
      if (inputs.current[i]) inputs.current[i].value = char;
    });

    const otp = inputs.current.map((input) => input.value).join("");
    onChange?.(otp);

    const nextIndex = Math.min(pastedData.length, length - 1);
    inputs.current[nextIndex]?.focus();
  };

  return (
    <div className={`flex justify-start gap-2.5 ${className}`}>
      {Array.from({ length }).map((_, i) => (
        <input
          key={i}
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          maxLength="1"
          disabled={disabled}
          ref={(el) => (inputs.current[i] = el)}
          onChange={(e) => handleChange(e, i)}
          onKeyDown={(e) => handleKeyDown(e, i)}
          onPaste={handlePaste}
          className={`
            w-11 h-11 text-center text-lg font-bold
            rounded-xl border-2 border-border
            text-text-primary bg-surface
            focus:outline-none focus:ring-2 focus:ring-ring focus:border-primary
            disabled:opacity-50 disabled:cursor-not-allowed
            transition-all duration-200
            hover:border-primary/40 hover:bg-surface-hover
            ${inputClassName}
          `}
        />
      ))}
    </div>
  );
}
