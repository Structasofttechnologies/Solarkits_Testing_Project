import React from "react";
import { FiCheck, FiArrowLeft, FiLayers } from "react-icons/fi";

export default function Step3ProjectSubType({
  projectSubTypes = [],
  selectedProjectSubType,
  selectedProjectType,
  onSelect,
  onBack,
}) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">
            Step 3: Select Installation / Sub-Type
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            Installation mounting structure for <span className="font-semibold text-primary dark:text-blue-400">{selectedProjectType?.name}</span>
          </p>
        </div>
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition cursor-pointer"
        >
          <FiArrowLeft className="w-3.5 h-3.5" /> Back
        </button>
      </div>

      {projectSubTypes.length === 0 ? (
        <div className="py-16 text-center text-slate-400">Loading installation sub-types...</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {projectSubTypes.map((sub) => {
            const isSelected = selectedProjectSubType && String(selectedProjectSubType._id || selectedProjectSubType.id) === String(sub._id || sub.id);

            return (
              <div
                key={sub._id || sub.id}
                onClick={() => onSelect(sub)}
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

                <div className="space-y-3">
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${
                      isSelected
                        ? "bg-primary text-white"
                        : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 group-hover:bg-primary group-hover:text-white"
                    }`}
                  >
                    <FiLayers className="w-5 h-5" />
                  </div>

                  <div>
                    <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                      {sub.name}
                    </h3>
                    <p className="text-xs text-slate-500 mt-1 line-clamp-2">
                      {sub.description || "Mounting & civil structure profile"}
                    </p>
                  </div>
                </div>

                <div className="mt-6 pt-3 border-t border-slate-100 dark:border-slate-800/60 flex items-center justify-between text-xs">
                  <span className="text-slate-400 font-mono">{sub.code || "SUB-01"}</span>
                  <span
                    className={`font-semibold ${
                      isSelected ? "text-primary dark:text-blue-400" : "text-slate-400 group-hover:text-primary"
                    }`}
                  >
                    {isSelected ? "Selected" : "Select Solutions →"}
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
