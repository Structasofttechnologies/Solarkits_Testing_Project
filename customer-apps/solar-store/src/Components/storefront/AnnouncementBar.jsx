import React from "react";
import { Link } from "react-router-dom";
import { FiTruck, FiFileText, FiPhoneCall, FiCheckCircle, FiMapPin } from "react-icons/fi";

export default function AnnouncementBar({ onOpenExpertHelp }) {
  return (
    <div className="bg-gradient-to-r from-sky-50 via-white to-amber-50/60 text-slate-700 text-[11px] sm:text-xs border-b border-slate-200/80 shadow-xs transition-colors">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 py-1.5 sm:py-2 flex items-center justify-between gap-2">
        {/* Left: Value propositions / claims */}
        <div className="flex items-center gap-2.5 sm:gap-6 min-w-0">
          <span className="flex items-center gap-1.5 text-slate-700 font-bold truncate">
            <FiTruck className="text-secondary shrink-0" size={13} />
            <span className="truncate">Pan-India Delivery</span>
          </span>
          <span className="hidden md:flex items-center gap-1.5 text-slate-700 font-semibold">
            <FiFileText className="text-primary shrink-0" size={13} />
            <span>GST Tax Invoices</span>
          </span>
          <span className="hidden lg:flex items-center gap-1.5 text-slate-700 font-semibold">
            <FiCheckCircle className="text-emerald-600 shrink-0" size={13} />
            <span>Certified Complete Solar Power Kits</span>
          </span>
        </div>

        {/* Right: Store Locator & Expert help link */}
        <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
          <Link
            to="/store-locator"
            className="flex items-center gap-1 text-primary hover:text-blue-700 font-bold transition-colors bg-blue-50/90 hover:bg-blue-100/80 px-2 sm:px-3 py-0.5 sm:py-1 rounded-full border border-blue-200/80 shadow-xs text-[10px] sm:text-xs"
          >
            <FiMapPin size={11} className="text-secondary shrink-0" />
            <span className="whitespace-nowrap">Stores</span>
          </Link>

          {onOpenExpertHelp && (
            <button
              onClick={onOpenExpertHelp}
              className="flex items-center gap-1 text-secondary hover:text-amber-600 font-bold transition-colors cursor-pointer bg-white px-2 sm:px-3 py-0.5 sm:py-1 rounded-full border border-amber-200/80 shadow-xs text-[10px] sm:text-xs"
            >
              <FiPhoneCall size={11} className="shrink-0" />
              <span className="whitespace-nowrap">Expert</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

