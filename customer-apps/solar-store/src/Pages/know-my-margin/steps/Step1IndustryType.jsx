import React from "react";
import { FiCheck, FiSun, FiHome, FiBriefcase, FiCompass } from "react-icons/fi";

const getIndustryIcon = (name = "") => {
  const lower = name.toLowerCase();
  if (lower.includes("resident") || lower.includes("home")) return <FiHome className="w-6 h-6" />;
  if (lower.includes("commerc") || lower.includes("office")) return <FiBriefcase className="w-6 h-6" />;
  if (lower.includes("agricult") || lower.includes("farm")) return <FiCompass className="w-6 h-6" />;
  return <FiSun className="w-6 h-6" />;
};

export default function Step1IndustryType({
  industries = [],
  selectedIndustry,
  onSelect,
}) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">
          Step 1: Select Industry Type
        </h2>
        <p className="text-sm text-slate-500 mt-1">
          Choose the market sector for your solar project to load eligible configurations and subsidies
        </p>
      </div>

      {industries.length === 0 ? (
        <div className="py-16 text-center text-slate-400">Loading industry sectors...</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {industries.map((ind) => {
            const isSelected = selectedIndustry && String(selectedIndustry._id || selectedIndustry.id) === String(ind._id || ind.id);

            return (
              <div
                key={ind._id || ind.id}
                onClick={() => onSelect(ind)}
                className={`p-6 rounded-2xl border-2 cursor-pointer transition-all duration-200 relative group flex flex-col justify-between ${
                  isSelected
                    ? "border-primary bg-primary/5 dark:bg-primary/10 shadow-md shadow-primary/10"
                    : "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-primary/40 dark:hover:border-primary/40 hover:shadow-sm"
                }`}
              >
                {isSelected && (
                  <div className="absolute top-4 right-4 w-6 h-6 rounded-full bg-primary text-white flex items-center justify-center shadow">
                    <FiCheck className="w-3.5 h-3.5 stroke-[3]" />
                  </div>
                )}

                <div className="space-y-4">
                  <div
                    className={`w-12 h-12 rounded-xl flex items-center justify-center transition-colors ${
                      isSelected
                        ? "bg-primary text-white"
                        : "bg-primary/10 dark:bg-primary/20 text-primary dark:text-blue-400 group-hover:bg-primary group-hover:text-white"
                    }`}
                  >
                    {getIndustryIcon(ind.name)}
                  </div>

                  <div>
                    <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                      {ind.name}
                    </h3>
                    <p className="text-xs text-slate-500 mt-1 line-clamp-2">
                      {ind.description || "Standard industry sector project configurations"}
                    </p>
                  </div>
                </div>

                <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800/60 flex items-center justify-between text-xs">
                  <span className="text-slate-400 font-mono">{ind.code || "SEC-01"}</span>
                  <span
                    className={`font-semibold ${
                      isSelected ? "text-primary dark:text-blue-400" : "text-slate-400 group-hover:text-primary"
                    }`}
                  >
                    {isSelected ? "Selected" : "Select & Proceed →"}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
