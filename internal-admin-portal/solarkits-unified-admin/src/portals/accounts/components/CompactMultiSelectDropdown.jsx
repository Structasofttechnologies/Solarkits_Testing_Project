import React, { useState, useRef, useEffect, useMemo } from "react";
import { FaChevronDown, FaSearch, FaTimes, FaCheck } from "react-icons/fa";

export default function CompactMultiSelectDropdown({
  label,
  values = [],
  onChange,
  options = [], // [{ value: string, label: string, count?: number }]
  placeholder = "Select...",
  searchPlaceholder = "Search...",
  icon: Icon = null,
  badgeColor = "emerald",
  disabled = false,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const containerRef = useRef(null);

  // Close when clicked outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  // Filter options based on search query
  const filteredOptions = useMemo(() => {
    if (!searchTerm.trim()) return options;
    const term = searchTerm.toLowerCase();
    return options.filter((opt) => (opt.label || "").toLowerCase().includes(term));
  }, [options, searchTerm]);

  // Handle toggling single item
  const handleToggle = (val) => {
    if (values.includes(val)) {
      onChange(values.filter((v) => v !== val));
    } else {
      onChange([...values, val]);
    }
  };

  // Handle Select All
  const handleSelectAll = (e) => {
    e.stopPropagation();
    const visibleVals = filteredOptions.map((o) => o.value);
    const combined = Array.from(new Set([...values, ...visibleVals]));
    onChange(combined);
  };

  // Handle Clear All
  const handleClearAll = (e) => {
    e.stopPropagation();
    onChange([]);
  };

  // Color mappings
  const colorMap = {
    emerald: {
      badge: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300",
      activeBorder: "focus:border-emerald-500 focus:ring-emerald-500/20",
      checkbox: "text-emerald-600 focus:ring-emerald-500",
      selectedRow: "bg-emerald-50/70 dark:bg-emerald-950/30 text-emerald-900 dark:text-emerald-200",
      pill: "bg-emerald-600 text-white",
    },
    blue: {
      badge: "bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300",
      activeBorder: "focus:border-blue-500 focus:ring-blue-500/20",
      checkbox: "text-blue-600 focus:ring-blue-500",
      selectedRow: "bg-blue-50/70 dark:bg-blue-950/30 text-blue-900 dark:text-blue-200",
      pill: "bg-blue-600 text-white",
    },
  };
  const theme = colorMap[badgeColor] || colorMap.emerald;

  // Display text summary on button
  const displaySummary = useMemo(() => {
    if (!values || values.length === 0) return null;
    const firstOpt = options.find((o) => o.value === values[0]);
    const firstLabel = firstOpt ? firstOpt.label : values[0];
    if (values.length === 1) return firstLabel;
    return `${firstLabel} (+${values.length - 1})`;
  }, [values, options]);

  return (
    <div className="relative w-full" ref={containerRef}>
      {label && (
        <label className="block text-[10px] font-bold text-text-muted uppercase mb-1">
          {label}
        </label>
      )}

      {/* Dropdown Button */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen((prev) => !prev)}
        className={`w-full text-xs py-1.5 px-2 bg-surface border border-border rounded-lg text-text-primary flex items-center justify-between gap-1.5 transition-all text-left shadow-2xs cursor-pointer ${
          isOpen ? `border-current ring-2 ${theme.activeBorder}` : "hover:border-border-hover"
        } ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
      >
        <div className="flex items-center gap-1.5 overflow-hidden flex-1 min-w-0">
          {Icon && <Icon className="w-3 h-3 text-text-muted shrink-0" />}
          {displaySummary ? (
            <span className="font-semibold text-text-primary truncate">{displaySummary}</span>
          ) : (
            <span className="text-text-muted truncate">{placeholder}</span>
          )}
        </div>

        <div className="flex items-center gap-1 shrink-0">
          {values.length > 0 && (
            <>
              <span className={`px-1.5 py-0.2 rounded-full text-[9px] font-black ${theme.pill}`}>
                {values.length}
              </span>
              <span
                role="button"
                title="Clear selection"
                onClick={handleClearAll}
                className="p-0.5 rounded hover:bg-surface-hover text-text-muted hover:text-text-primary cursor-pointer transition-colors"
              >
                <FaTimes className="w-2.5 h-2.5" />
              </span>
            </>
          )}
          <FaChevronDown
            className={`w-2.5 h-2.5 text-text-muted transition-transform duration-200 ${
              isOpen ? "rotate-180" : ""
            }`}
          />
        </div>
      </button>

      {/* Dropdown Menu Panel */}
      {isOpen && (
        <div className="absolute left-0 right-0 top-full mt-1.5 z-50 bg-surface border border-border rounded-xl shadow-xl p-2 animate-in fade-in zoom-in-95 duration-100 min-w-[240px]">
          {/* Search Box */}
          <div className="relative mb-2">
            <FaSearch className="absolute left-2.5 top-2 text-[10px] text-text-muted" />
            <input
              type="text"
              autoFocus
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={searchPlaceholder}
              className="w-full text-xs pl-7 pr-6 py-1 bg-surface-hover/60 border border-border rounded-lg text-text-primary outline-none focus:ring-1 focus:ring-emerald-500"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm("")}
                className="absolute right-2 top-1.5 text-text-muted hover:text-text-primary"
              >
                <FaTimes className="w-2.5 h-2.5" />
              </button>
            )}
          </div>

          {/* Quick Actions (Select All / Clear All) */}
          <div className="flex items-center justify-between pb-1.5 mb-1.5 border-b border-border/70 text-[10px]">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleSelectAll}
                className="font-bold text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer"
              >
                Select All
              </button>
              <span className="text-border">|</span>
              <button
                type="button"
                onClick={handleClearAll}
                className="font-bold text-text-muted hover:text-red-500 cursor-pointer"
              >
                Clear
              </button>
            </div>
            <span className="text-text-secondary font-medium">
              {values.length} of {options.length} selected
            </span>
          </div>

          {/* Options List */}
          <div className="max-h-52 overflow-y-auto space-y-0.5 pr-0.5 custom-scrollbar text-xs">
            {filteredOptions.length === 0 ? (
              <div className="py-4 text-center text-text-muted text-[11px]">
                No options match "{searchTerm}"
              </div>
            ) : (
              filteredOptions.map((opt) => {
                const isChecked = values.includes(opt.value);
                return (
                  <div
                    key={opt.value}
                    onClick={() => handleToggle(opt.value)}
                    className={`flex items-center justify-between px-2 py-1.5 rounded-lg cursor-pointer transition-colors ${
                      isChecked
                        ? theme.selectedRow
                        : "hover:bg-surface-hover text-text-primary"
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate mr-2">
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => {}} // handled by parent div onClick
                        className={`rounded border-border cursor-pointer ${theme.checkbox}`}
                      />
                      <span className={`truncate text-xs ${isChecked ? "font-bold" : "font-medium"}`}>
                        {opt.label}
                      </span>
                    </div>

                    {/* Order count pill */}
                    <span
                      className={`px-1.5 py-0.5 rounded-full text-[10px] font-black shrink-0 ${
                        (opt.count || 0) > 0 ? theme.badge : "bg-surface-hover text-text-muted"
                      }`}
                    >
                      {opt.count || 0}
                    </span>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
