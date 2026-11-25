import { useState } from "react";
import { useSelector, useDispatch } from "react-redux";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import axios from "axios";
import {
  FiZap,
  FiX,
  FiCheckCircle,
  FiPlusCircle,
  FiShoppingCart,
  FiCheck,
  FiChevronLeft,
  FiChevronRight,
  FiAward,
  FiLayers,
  FiTag,
  FiInfo
} from "react-icons/fi";
import { FaSolarPanel } from "react-icons/fa";
import { setAlert } from "../features/alert.slice";

export default function NewKitIntroductionModal({ isOpen, newKits = [], onClose, onAdded }) {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth_slice);
  const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

  const [currentIndex, setCurrentIndex] = useState(0);
  const [adding, setAdding] = useState(false);
  const [addedKitsMap, setAddedKitsMap] = useState({});

  if (!isOpen || !newKits || newKits.length === 0) return null;

  const currentKit = newKits[currentIndex] || newKits[0];
  const isAdded = Boolean(addedKitsMap[currentKit?.id]);

  // Handle "Add to preferences"
  const handleAddKitToPreferences = async () => {
    if (!currentKit?.id || isAdded) return;
    try {
      setAdding(true);
      const res = await axios.post(
        `${API_URL}/india/v1/epc/preferences/add-kit-preference`,
        {
          epc_id: user?._id || user?.account_id || user?.id,
          kit_id: currentKit.id
        },
        { withCredentials: true }
      );

      if (res.data?.status === "success") {
        setAddedKitsMap((prev) => ({ ...prev, [currentKit.id]: true }));
        dispatch(
          setAlert({
            type: "success",
            message: `"${currentKit.name}" has been added to your kit preferences!`
          })
        );
        if (onAdded) onAdded(currentKit);

        // If multiple new kits exist, advance after brief delay
        if (currentIndex < newKits.length - 1) {
          setTimeout(() => {
            setCurrentIndex((idx) => idx + 1);
          }, 1200);
        } else {
          setTimeout(() => {
            if (onClose) onClose();
          }, 1500);
        }
      }
    } catch (err) {
      console.error("Failed to add kit to preferences:", err);
      dispatch(
        setAlert({
          type: "error",
          message: err.response?.data?.message || "Failed to add kit to preferences."
        })
      );
    } finally {
      setAdding(false);
    }
  };

  // Handle "Buy This Kit Now" -> Redirects directly to Solar Store kit purchase page
  const handleBuyKitNow = () => {
    if (!currentKit?.id) return;
    // Add to preferences in background if not already added
    if (!isAdded) {
      axios.post(
        `${API_URL}/india/v1/epc/preferences/add-kit-preference`,
        {
          epc_id: user?._id || user?.account_id || user?.id,
          kit_id: currentKit.id
        },
        { withCredentials: true }
      ).catch(() => {});
    }

    if (onClose) onClose();
    // Redirect directly to combo kit page with the specific kit selected
    navigate(`/preconfigured-combo-kit?kit=${currentKit.id}&kit_id=${currentKit.id}`);
  };

  // Handle Dismiss alert
  const handleDismiss = async () => {
    try {
      await axios.post(
        `${API_URL}/india/v1/epc/preferences/dismiss-kit-alert`,
        { epc_id: user?._id || user?.account_id || user?.id },
        { withCredentials: true }
      );
    } catch (e) {
      console.error("Dismiss kit alert failed:", e);
    } finally {
      if (onClose) onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/80 backdrop-blur-md overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.94, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.94, y: 20 }}
        className="relative w-full max-w-4xl lg:max-w-5xl bg-slate-900 text-slate-100 rounded-3xl shadow-2xl border-2 border-slate-700/80 overflow-hidden flex flex-col my-auto max-h-[94vh]"
      >
        {/* Top Announcement Ribbon */}
        <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white px-6 py-4 flex items-center justify-between shrink-0 relative overflow-hidden border-b border-slate-800">
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-400 text-slate-950 text-xs font-black uppercase tracking-wider shadow-sm">
              <FiZap className="w-3.5 h-3.5 fill-slate-950" />
              New Kit Launch
            </span>
            <span className="hidden sm:inline-block text-xs text-blue-200 font-semibold">
              Exclusive wholesale opportunity for registered solar EPCs
            </span>
          </div>

          <div className="flex items-center gap-3">
            {newKits.length > 1 && (
              <div className="flex items-center gap-1 text-xs font-bold text-blue-200">
                <span>{currentIndex + 1} / {newKits.length}</span>
                <button
                  type="button"
                  disabled={currentIndex === 0}
                  onClick={() => setCurrentIndex((i) => i - 1)}
                  className="p-1 rounded-md hover:bg-white/10 disabled:opacity-30 cursor-pointer"
                >
                  <FiChevronLeft size={16} />
                </button>
                <button
                  type="button"
                  disabled={currentIndex === newKits.length - 1}
                  onClick={() => setCurrentIndex((i) => i + 1)}
                  className="p-1 rounded-md hover:bg-white/10 disabled:opacity-30 cursor-pointer"
                >
                  <FiChevronRight size={16} />
                </button>
              </div>
            )}

            <button
              onClick={handleDismiss}
              className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 cursor-pointer transition-colors"
              title="Close"
            >
              <FiX className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Main Body (Spacious 2-Column Responsive Layout) */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-7 grid grid-cols-1 md:grid-cols-12 gap-6 bg-slate-950">
          {/* Left Column: Big Kit Photo & Super Hierarchy Tags */}
          <div className="md:col-span-5 flex flex-col space-y-3">
            {/* Super Hierarchy Badges (Industry -> Project Category -> Sub-Category) */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-2.5 py-1 rounded-lg text-xs font-black bg-blue-950 text-blue-300 border border-blue-800 flex items-center gap-1">
                <FiLayers className="w-3.5 h-3.5" />
                Industry: {currentKit.industry_name || "Solar PV"}
              </span>
              <span className="px-2.5 py-1 rounded-lg text-xs font-black bg-amber-950 text-amber-300 border border-amber-800 flex items-center gap-1">
                <FiTag className="w-3.5 h-3.5" />
                Category: {currentKit.category_name || "Residential Solar"}
              </span>
              <span className="px-2.5 py-1 rounded-lg text-xs font-black bg-purple-950 text-purple-300 border border-purple-800 flex items-center gap-1">
                <FiTag className="w-3.5 h-3.5" />
                Sub-Category: {currentKit.subcategory_name || "Individual Home"}
              </span>
            </div>

            {/* Large Kit Photo */}
            <div className="relative rounded-2xl overflow-hidden border border-slate-800 bg-slate-900 min-h-[240px] md:min-h-[300px] flex items-center justify-center shadow-inner group">
              {currentKit.kit_image ? (
                <img
                  src={currentKit.kit_image}
                  alt={currentKit.name}
                  className="w-full h-64 md:h-80 object-cover group-hover:scale-105 transition-transform duration-300"
                />
              ) : (
                <div className="flex flex-col items-center justify-center p-8 text-blue-400">
                  <FaSolarPanel className="w-20 h-20 mb-3" />
                  <span className="text-xl font-black">{currentKit.capacity || "KW"} kW Kit</span>
                </div>
              )}

              {/* Floating Capacity Ribbon on Image */}
              <div className="absolute top-3 left-3 px-3 py-1.5 rounded-xl bg-slate-900/90 text-white backdrop-blur-md text-xs font-black flex items-center gap-1.5 border border-white/20 shadow-lg">
                <FiZap className="text-amber-400" />
                <span>{currentKit.capacity} kW System</span>
              </div>
            </div>

            {/* Blueprint / System Type Spec */}
            <div className="bg-slate-900 p-3 rounded-xl border border-slate-800 text-xs text-slate-300 flex items-center justify-between">
              <span className="font-semibold text-slate-400">System Blueprint:</span>
              <span className="font-black text-white truncate max-w-[200px]">
                {currentKit.blueprint_name || currentKit.name}
              </span>
            </div>
          </div>

          {/* Right Column: Commercial Details, Rates, MOQ & Description */}
          <div className="md:col-span-7 flex flex-col justify-between space-y-4">
            <div className="space-y-4">
              {/* Title & Description */}
              <div>
                <h3 className="text-xl sm:text-2xl font-black text-white leading-tight">
                  {currentKit.name}
                </h3>
                <p className="text-xs sm:text-sm text-slate-300 mt-2 leading-relaxed">
                  {currentKit.description ||
                    "Complete pre-engineered solar combo kit including DCR-certified panels, high-efficiency grid-tied inverter, structure, and essential BOS electrical hardware."}
                </p>
              </div>

              {/* Commercial Specs Cards: Price, Capacity & Rate */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div className="bg-blue-950/60 p-3.5 rounded-xl border border-blue-800">
                  <span className="text-[10px] font-black text-blue-300 uppercase tracking-wider block">
                    Capacity
                  </span>
                  <div className="text-xl font-black text-white mt-0.5">
                    {currentKit.capacity} kW
                  </div>
                  <span className="text-[10px] font-bold text-blue-400">
                    {currentKit.system_type || "On-Grid / DCR"}
                  </span>
                </div>

                <div className="bg-emerald-950/60 p-3.5 rounded-xl border border-emerald-800">
                  <span className="text-[10px] font-black text-emerald-300 uppercase tracking-wider block">
                    Wholesale Price
                  </span>
                  <div className="text-xl font-black text-white mt-0.5">
                    {currentKit.selling_price ? `₹${Math.round(Number(currentKit.selling_price)).toLocaleString("en-IN")}` : "On Quotation"}
                  </div>
                  {currentKit.rate_per_kw > 0 && (
                    <span className="text-[10px] font-bold text-emerald-400">
                      ₹{Math.round(Number(currentKit.rate_per_kw)).toLocaleString("en-IN")}/kW
                    </span>
                  )}
                </div>

                <div className="bg-amber-950/60 p-3.5 rounded-xl border border-amber-800 col-span-2 sm:col-span-1">
                  <span className="text-[10px] font-black text-amber-300 uppercase tracking-wider block">
                    PO Order MOQ
                  </span>
                  <div className="text-xl font-black text-white mt-0.5">
                    {currentKit.moq || 200} Kits
                  </div>
                  <span className="text-[10px] font-bold text-amber-400">
                    Loose MOQ: {currentKit.loose_moq || 25} Kits
                  </span>
                </div>
              </div>

              {/* Order Quantity Tiers & Trial Kit Specs */}
              <div className="bg-slate-900 p-4 rounded-2xl border border-slate-800 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-white flex items-center gap-1.5">
                    <FiAward className="text-amber-400" />
                    Trial Kits Available:
                  </span>
                  <span className="font-black text-emerald-300 bg-emerald-950 border border-emerald-800 px-2.5 py-0.5 rounded-md text-[11px]">
                    ✓ Trial Limit: 10x per EPC Buyer
                  </span>
                </div>
                <div className="text-xs text-slate-300 leading-relaxed">
                  Bulk dispatch available directly from Surat / Bhiwandi regional fulfillment warehouses. 
                  Pre-configured brands include Solarkits, Polycab, L&T, and Reputed Tier-1 ALMM modules.
                </div>
              </div>

              {/* Synchronization Note */}
              <div className="bg-blue-950/40 p-3.5 rounded-xl border border-blue-900 text-xs text-slate-200 flex items-start gap-2.5">
                <FiInfo className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
                <p className="text-xs leading-relaxed text-slate-200">
                  <strong className="text-white">Add to preferences:</strong> Saving this kit registers your interest in this category so you receive instant promotional discounts and regional depot allocations first.
                </p>
              </div>
            </div>

            {/* Modal Bottom Action Bar */}
            <div className="pt-3 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
              <button
                type="button"
                onClick={handleDismiss}
                className="w-full sm:w-auto px-4 py-2.5 text-xs font-bold text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl cursor-pointer order-3 sm:order-1 transition-colors text-center"
              >
                Dismiss / Maybe Later
              </button>

              <div className="w-full sm:w-auto flex flex-col sm:flex-row items-center gap-2.5 order-1 sm:order-2">
                {/* 1. Add to preferences Button (Label requested: "Add to preferences") */}
                <button
                  type="button"
                  onClick={handleAddKitToPreferences}
                  disabled={adding || isAdded}
                  className={`w-full sm:w-auto px-5 py-3 rounded-xl font-black text-xs flex items-center justify-center gap-2 shadow-md transition-all active:scale-95 cursor-pointer ${
                    isAdded
                      ? "bg-emerald-600 text-white shadow-emerald-600/30"
                      : "bg-blue-600 hover:bg-blue-500 text-white shadow-blue-600/40"
                  }`}
                >
                  {adding ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Adding to Preferences...</span>
                    </>
                  ) : isAdded ? (
                    <>
                      <FiCheck className="w-4 h-4 stroke-[3]" />
                      <span>Added to Preferences!</span>
                    </>
                  ) : (
                    <>
                      <FiPlusCircle className="w-4 h-4" />
                      <span>Add to preferences</span>
                    </>
                  )}
                </button>

                {/* 2. Direct Buy Button (Redirects to Solar Store combo kit purchase page) */}
                <button
                  type="button"
                  onClick={handleBuyKitNow}
                  className="w-full sm:w-auto px-5 py-3 rounded-xl font-black text-xs bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white shadow-md shadow-amber-500/30 flex items-center justify-center gap-2 transition-transform active:scale-95 cursor-pointer"
                >
                  <FiShoppingCart className="w-4 h-4" />
                  <span>Buy This Kit Now →</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
