import React from "react";
import { FiXCircle, FiAlertTriangle, FiArrowRight } from "react-icons/fi";
import { HiSun, HiMoon } from "react-icons/hi2";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import useTheme from "../hooks/useTheme";
import Button from "../components/Button";

export default function Rejected() {
  const navigate = useNavigate();
  const { user } = useSelector((state) => state.user_slice);
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
        <div className="absolute -top-[20%] -right-[10%] w-[50%] h-[50%] bg-danger/5 rounded-full blur-[120px]" />
        <div className="absolute -bottom-[20%] -left-[10%] w-[50%] h-[50%] bg-danger/10 rounded-full blur-[120px]" />
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="max-w-xl w-full relative z-10"
      >
        <div className="card shadow-2xl bg-surface/80 backdrop-blur-xl border border-border rounded-[2rem] overflow-hidden p-8 md:p-12 text-center relative">
          
          <div className="w-24 h-24 mx-auto mb-8 relative">
             <div className="absolute inset-0 bg-danger/20 rounded-full animate-pulse opacity-75"></div>
             <div className="relative w-full h-full bg-linear-to-br from-danger to-red-600 rounded-full flex items-center justify-center shadow-lg shadow-danger/30 z-10">
              <FiXCircle className="w-10 h-10 text-white" />
            </div>
          </div>

          <h1 className="text-3xl md:text-4xl font-black text-text-primary mb-4 tracking-tight">
            Validation Rejected
          </h1>
          
          <p className="text-text-secondary text-base md:text-lg mb-8 leading-relaxed font-medium">
            Unfortunately, your warehouse validation submission has been rejected. Please review the feedback below and update your details to resubmit.
          </p>

          <div className="bg-danger/5 border border-danger/20 rounded-2xl p-6 shadow-sm mb-8 text-left relative overflow-hidden">
             <div className="absolute top-0 right-0 w-32 h-32 bg-danger/10 rounded-bl-full -mr-16 -mt-16 z-0"></div>
            <div className="relative z-10">
                <h3 className="text-sm font-bold text-danger uppercase tracking-wider mb-3 flex items-center gap-2">
                <FiAlertTriangle className="text-danger" /> Rejection Reason
                </h3>
                <div className="bg-white/50 backdrop-blur-sm rounded-xl p-4 border border-danger/10">
                    <p className="text-sm text-text-primary font-medium leading-relaxed whitespace-pre-wrap">
                        {user?.rejection_reason || "No specific reason provided. Please ensure all submitted documents and details are accurate and complete."}
                    </p>
                </div>
            </div>
          </div>

          <Button 
            onClick={() => navigate("/warehouse-profile")}
            variant="primary"
            className="w-full sm:w-auto px-8 bg-linear-to-r from-danger to-red-600 hover:from-red-600 hover:to-danger shadow-lg shadow-danger/25"
            rightIcon={<FiArrowRight />}
          >
             Update & Resubmit
          </Button>

        </div>
      </motion.div>
    </div>
  );
}
