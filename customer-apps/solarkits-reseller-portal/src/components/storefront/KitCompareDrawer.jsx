import { motion, AnimatePresence } from "framer-motion";
import {
  FiX,
  FiCheck,
  FiMinus,
  FiShoppingBag,
  FiDollarSign,
  FiShield,
  FiZap,
} from "react-icons/fi";

export default function KitCompareDrawer({
  compareList = [],
  onRemove,
  onClear,
  onOpenKitDetails,
  onOpenLeadModal,
}) {
  if (compareList.length === 0) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 100, opacity: 0 }}
        className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md text-slate-900 border-t border-slate-300 shadow-2xl p-4 sm:p-5"
      >
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-200 pb-3 mb-3">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-[#F49222] animate-pulse" />
              <h3 className="text-xs sm:text-sm font-black uppercase tracking-wider text-slate-900">
                Compare SolarKits ({compareList.length}/3 selected)
              </h3>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={onClear}
                className="text-xs font-bold text-red-600 hover:text-red-700 transition-colors cursor-pointer"
              >
                Clear All
              </button>
            </div>
          </div>

          {/* Cards Row in Drawer */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {compareList.map((kit) => (
              <div
                key={kit.id}
                className="relative rounded-2xl bg-slate-50 border border-slate-200 p-3.5 flex flex-col justify-between space-y-2 shadow-xs"
              >
                {/* Remove button */}
                <button
                  onClick={() => onRemove(kit.id)}
                  className="absolute top-2 right-2 p-1.5 rounded-lg bg-white hover:bg-red-50 text-slate-400 hover:text-red-600 border border-slate-200 transition-colors cursor-pointer"
                  title="Remove from comparison"
                >
                  <FiX size={13} />
                </button>

                <div>
                  <span className="text-[10px] font-extrabold text-[#253880] uppercase tracking-wider">
                    {kit.capacityDisplay} • {kit.applicationType}
                  </span>
                  <h4 className="text-xs font-black text-slate-900 truncate pr-5 mt-0.5">
                    {kit.name}
                  </h4>
                  <p className="text-[10px] text-slate-500 font-medium">
                    {kit.panelWattage}W × {kit.panelCount} Panels • {kit.dcrStatus}
                  </p>
                </div>

                <div className="flex items-center justify-between border-t border-slate-200/80 pt-2 text-xs">
                  <div>
                    <span className="text-[9px] font-bold text-slate-400 block uppercase">Dealer Rate</span>
                    <span className="font-black text-[#253880]">
                      ₹{kit.wholesalePrice.toLocaleString("en-IN")}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => onOpenKitDetails(kit)}
                      className="px-2.5 py-1 rounded-lg bg-white hover:bg-slate-100 text-[11px] font-bold text-slate-700 border border-slate-200 transition-colors cursor-pointer"
                    >
                      Specs
                    </button>
                    <button
                      onClick={() => onOpenLeadModal({ kitName: kit.name, capacityDisplay: kit.capacityDisplay }, "bulk_price")}
                      className="px-2.5 py-1 rounded-lg bg-[#253880] hover:bg-[#1d2c66] text-[11px] font-black text-white shadow-xs transition-colors cursor-pointer"
                    >
                      Quote
                    </button>
                  </div>
                </div>
              </div>
            ))}

            {/* Empty slot placeholders */}
            {Array.from({ length: 3 - compareList.length }).map((_, idx) => (
              <div
                key={idx}
                className="hidden sm:flex rounded-2xl border border-dashed border-slate-300 bg-slate-50/50 items-center justify-center p-4 text-center text-xs text-slate-400 font-medium"
              >
                + Check "Compare" on another SolarKit
              </div>
            ))}
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
