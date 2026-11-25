import React from "react";
import { FiClock, FiSettings, FiActivity } from "react-icons/fi";
import { HiSun, HiMoon } from "react-icons/hi2";
import { motion } from "framer-motion";
import useTheme from "../hooks/useTheme";

export default function PendingValidation() {
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
        <div className="absolute -top-[20%] -right-[10%] w-[50%] h-[50%] bg-primary/5 rounded-full blur-[120px]" />
        <div className="absolute -bottom-[20%] -left-[10%] w-[50%] h-[50%] bg-primary/10 rounded-full blur-[120px]" />
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="max-w-xl w-full relative z-10"
      >
        <div className="card shadow-2xl bg-surface/80 backdrop-blur-xl border border-border rounded-[2rem] overflow-hidden p-8 md:p-12 text-center relative">
          
          <div className="w-24 h-24 mx-auto mb-8 relative">
            <div className="absolute inset-0 bg-primary/20 rounded-full animate-ping opacity-75"></div>
            <div className="relative w-full h-full bg-linear-to-br from-primary to-primary-end rounded-full flex items-center justify-center shadow-lg shadow-primary/30">
              <FiSettings className="w-10 h-10 text-white animate-[spin_4s_linear_infinite]" />
            </div>
          </div>

          <h1 className="text-3xl md:text-4xl font-black text-text-primary mb-4 tracking-tight">
            Setting up your profile
          </h1>
          
          <p className="text-text-secondary text-base md:text-lg mb-8 leading-relaxed font-medium">
            Your warehouse profile is currently being configured by our administrative team. We are preparing the necessary validation fields tailored for your facility.
          </p>

          <div className="bg-surface border border-border rounded-2xl p-6 shadow-sm mb-8 text-left">
            <h3 className="text-sm font-bold text-text-primary uppercase tracking-wider mb-4 flex items-center gap-2">
              <FiActivity className="text-primary" /> What happens next?
            </h3>
            <ul className="space-y-4">
              <li className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                  <span className="text-primary text-xs font-bold">1</span>
                </div>
                <p className="text-sm text-text-secondary font-medium">The admin team finalizes the required validation criteria.</p>
              </li>
              <li className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                  <span className="text-primary text-xs font-bold">2</span>
                </div>
                <p className="text-sm text-text-secondary font-medium">You will be notified to complete the onboarding process.</p>
              </li>
              <li className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                  <span className="text-primary text-xs font-bold">3</span>
                </div>
                <p className="text-sm text-text-secondary font-medium">Provide the required documentation to verify your warehouse.</p>
              </li>
            </ul>
          </div>

          <div className="flex items-center justify-center gap-2 text-sm font-bold text-primary bg-primary/5 py-3 px-6 rounded-full inline-flex mx-auto border border-primary/10">
            <FiClock className="animate-pulse" />
            Please check back later
          </div>
        </div>
      </motion.div>
    </div>
  );
}
