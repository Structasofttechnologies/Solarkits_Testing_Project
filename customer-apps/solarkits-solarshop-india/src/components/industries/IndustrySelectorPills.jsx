import React from "react";
import { motion } from "framer-motion";
import { FiGrid, FiCheck } from "react-icons/fi";

export default function IndustrySelectorPills({
  industries = [],
  selectedIndustryId = "ALL",
  onSelectIndustry,
  countsByIndustry = {},
  totalCount = 0,
}) {
  return (
    <div className="w-full">
      <div className="flex items-center gap-2.5 overflow-x-auto pb-3 pt-1 scrollbar-none no-scrollbar">
        {/* All Industries Pill */}
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => onSelectIndustry("ALL")}
          className={`flex items-center gap-2.5 px-4 py-2.5 rounded-full text-sm font-semibold whitespace-nowrap transition-all duration-200 cursor-pointer flex-shrink-0 ${
            selectedIndustryId === "ALL"
              ? "bg-slate-900 text-white shadow-lg shadow-slate-900/20 ring-2 ring-slate-900/10"
              : "bg-slate-100/90 text-slate-700 hover:bg-slate-200/80 hover:text-slate-900 border border-slate-200/70"
          }`}
        >
          <span className="flex items-center justify-center w-6 h-6 rounded-full bg-white/20 text-xs">
            <FiGrid className={selectedIndustryId === "ALL" ? "text-amber-400" : "text-slate-600"} />
          </span>
          <span>All Industries</span>
          {totalCount > 0 && (
            <span
              className={`text-xs px-2 py-0.5 rounded-full font-bold ${
                selectedIndustryId === "ALL"
                  ? "bg-white/20 text-white"
                  : "bg-slate-200 text-slate-700"
              }`}
            >
              {totalCount}
            </span>
          )}
        </motion.button>

        {/* Specific Industry Pills */}
        {industries.map((ind) => {
          const id = ind.id || ind._id;
          const isSelected = selectedIndustryId === id;
          const count = countsByIndustry[id] || 0;

          return (
            <motion.button
              key={id}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => onSelectIndustry(id, ind)}
              className={`flex items-center gap-2.5 px-4 py-2.5 rounded-full text-sm font-semibold whitespace-nowrap transition-all duration-200 cursor-pointer flex-shrink-0 ${
                isSelected
                  ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-500/25 ring-2 ring-blue-500/30"
                  : "bg-white text-slate-700 hover:bg-slate-50 hover:text-slate-900 border border-slate-200/80 shadow-sm"
              }`}
            >
              <span className="text-base">{ind.icon || "☀️"}</span>
              <span>{ind.name}</span>
              {count > 0 && (
                <span
                  className={`text-xs px-2 py-0.5 rounded-full font-bold ${
                    isSelected
                      ? "bg-white/25 text-white"
                      : "bg-slate-100 text-slate-600 border border-slate-200"
                  }`}
                >
                  {count}
                </span>
              )}
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
