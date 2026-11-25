import React from "react";
import { FiFileText, FiCheckCircle, FiSearch } from "react-icons/fi";
import { HiSun, HiMoon } from "react-icons/hi2";
import { motion } from "framer-motion";
import useTheme from "../hooks/useTheme";

export default function InReview() {
  const { theme, toggleTheme } = useTheme();

  return (
    <div className="min-h-screen bg-bg flex items-center justify-center p-6 relative overflow-hidden transition-colors duration-300">
      {/* Theme Toggle */}
      <button
        onClick={toggleTheme}
        className="fixed top-6 right-6 z-50 p-2.5 rounded-2xl bg-surface/80 backdrop-blur-sm border border-border/50 text-text-secondary hover:text-primary hover:border-primary/30 transition-all duration-300 shadow-sm"
        aria-label="Toggle theme"
      >
        {theme === 'dark' ? (
          <HiSun className="w-5 h-5" />
        ) : (
          <HiMoon className="w-5 h-5" />
        )}
      </button>

      {/* Background Ornaments */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0 pointer-events-none">
        <div className="absolute -top-[20%] -right-[10%] w-[50%] h-[50%] bg-blue-500/5 rounded-full blur-[120px]" />
        <div className="absolute -bottom-[20%] -left-[10%] w-[50%] h-[50%] bg-blue-500/10 rounded-full blur-[120px]" />
      </div>

      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="max-w-xl w-full relative z-10"
      >
        <div className="card shadow-2xl bg-surface/80 backdrop-blur-xl border border-border rounded-[2rem] overflow-hidden p-8 md:p-12 text-center relative">
          
          <div className="w-24 h-24 mx-auto mb-8 relative">
             {/* Scanner animation */}
             <div className="absolute inset-0 rounded-full border-4 border-blue-500/20 overflow-hidden">
                <div className="w-full h-full bg-blue-500/20 absolute -top-full animate-[scan_2s_ease-in-out_infinite]" />
             </div>
             <div className="relative w-full h-full bg-linear-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center shadow-lg shadow-blue-500/30 z-10">
              <FiFileText className="w-10 h-10 text-white" />
            </div>
          </div>

          <h1 className="text-3xl md:text-4xl font-black text-text-primary mb-4 tracking-tight">
            Under Review
          </h1>
          
          <p className="text-text-secondary text-base md:text-lg mb-8 leading-relaxed font-medium">
            Thank you for submitting your warehouse details. Our compliance team is currently reviewing your information to ensure it meets our platform standards.
          </p>

          <div className="bg-surface border border-border rounded-2xl p-6 shadow-sm mb-8 text-left">
            <div className="flex items-center gap-4 mb-4 pb-4 border-b border-border">
                <div className="w-10 h-10 rounded-full bg-green-500/10 flex items-center justify-center text-green-500 shrink-0">
                    <FiCheckCircle className="w-5 h-5" />
                </div>
                <div>
                    <h4 className="font-bold text-text-primary text-sm">Submission Received</h4>
                    <p className="text-xs text-text-secondary font-medium">Your onboarding data was successfully submitted.</p>
                </div>
            </div>
            <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-500 shrink-0 relative overflow-hidden">
                    <FiSearch className="w-5 h-5 relative z-10" />
                </div>
                <div>
                    <h4 className="font-bold text-text-primary text-sm">Verification in Progress</h4>
                    <p className="text-xs text-text-secondary font-medium">Administrators are verifying your documents.</p>
                </div>
            </div>
          </div>

          <div className="flex items-center justify-center gap-2 text-sm font-bold text-blue-600 bg-blue-500/5 py-3 px-6 rounded-full inline-flex mx-auto border border-blue-500/10">
            We will notify you once the review is complete.
          </div>
        </div>
      </motion.div>
    </div>
  );
}
