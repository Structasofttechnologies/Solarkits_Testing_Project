import React from "react";

export default function PopupDataLoader({ 
  text = "Loading configurations...", 
  size = "md",
  className = "" 
}) {
  const sizeClasses = {
    sm: "w-6 h-6 border-2",
    md: "w-10 h-10 border-4",
    lg: "w-16 h-16 border-4"
  };

  return (
    <div className={`flex flex-col items-center justify-center min-h-[350px] w-full p-8 animate-in fade-in duration-300 ${className}`}>
      <div className="relative flex items-center justify-center mb-5">
        {/* Glowing pulsing background ring */}
        <div className="absolute -inset-2 rounded-full bg-primary/5 animate-pulse" />
        {/* Core spinner */}
        <div className={`rounded-full border-primary border-t-transparent animate-spin ${sizeClasses[size] || sizeClasses.md}`} />
      </div>
      <p className="text-[10px] font-black text-text-secondary uppercase tracking-[0.22em] animate-pulse text-center max-w-xs leading-relaxed">
        {text}
      </p>
    </div>
  );
}
