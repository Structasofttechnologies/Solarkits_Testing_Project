import React from "react";
import { FiLock, FiLogOut } from "react-icons/fi";
import { HiSun, HiMoon } from "react-icons/hi2";
import { motion } from "framer-motion";
import { useDispatch } from "react-redux";
import useTheme from "../hooks/useTheme";
import { logout } from "../features/auth.slice";
import Button from "../components/Button";

export default function UnauthorizedRole() {
  const dispatch = useDispatch();
  const { theme, toggleTheme } = useTheme();
  
  const handleLogout = () => {
      dispatch(logout());
  };

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
        <div className="absolute -top-[20%] -right-[10%] w-[50%] h-[50%] bg-slate-500/5 rounded-full blur-[120px]" />
        <div className="absolute -bottom-[20%] -left-[10%] w-[50%] h-[50%] bg-slate-500/10 rounded-full blur-[120px]" />
      </div>

      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="max-w-xl w-full relative z-10"
      >
        <div className="card shadow-2xl bg-surface/80 backdrop-blur-xl border border-border rounded-[2rem] overflow-hidden p-8 md:p-12 text-center relative">
          
          <div className="w-24 h-24 mx-auto mb-8 relative">
             <div className="absolute inset-0 bg-slate-500/10 rounded-full scale-110"></div>
             <div className="relative w-full h-full bg-linear-to-br from-slate-600 to-slate-700 rounded-full flex items-center justify-center shadow-lg shadow-slate-500/30 z-10">
              <FiLock className="w-10 h-10 text-white" />
            </div>
          </div>

          <h1 className="text-3xl md:text-4xl font-black text-text-primary mb-4 tracking-tight">
            Access Restricted
          </h1>
          
          <p className="text-text-secondary text-base md:text-lg mb-8 leading-relaxed font-medium">
            You do not have the required permissions to perform warehouse operations. Only users with the <strong className="text-text-primary">Manager</strong> role can access this panel.
          </p>

          <Button 
            onClick={handleLogout}
            variant="outline"
            className="w-full sm:w-auto px-8"
            leftIcon={<FiLogOut />}
          >
             Sign Out
          </Button>

        </div>
      </motion.div>
    </div>
  );
}
