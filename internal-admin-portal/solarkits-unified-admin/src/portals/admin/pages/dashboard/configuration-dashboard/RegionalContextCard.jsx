/**
 * RegionalContextCard.jsx
 *
 * Appears dynamically when a State or District is selected in the filter bar.
 * Surfaces regional intelligence (BDEs, Warehouses, Franchisees in that region)
 * and provides direct quick-actions targeting that geographic territory.
 */

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { FiMapPin, FiUsers, FiShoppingBag, FiArrowRight, FiCheckCircle, FiX } from 'react-icons/fi';
import { MdWarehouse, MdLocationOn } from 'react-icons/md';
import { FaUserPlus, FaTruck, FaStore } from 'react-icons/fa';

export default function RegionalContextCard({
  selectedState,
  selectedDistrict,
  regionalStats,
  onClearRegion,
}) {
  const navigate = useNavigate();

  if (!selectedState) return null;

  const locationTitle = selectedDistrict
    ? `${selectedDistrict.name}, ${selectedState.name}`
    : `${selectedState.name}`;

  return (
    <div className="card p-5 rounded-2xl bg-gradient-to-r from-primary/10 via-card to-primary/5 border border-primary/25 shadow-sm relative overflow-hidden">
      {/* Background ambient accent */}
      <div className="absolute right-0 top-0 w-64 h-full bg-radial from-primary/10 to-transparent pointer-events-none" />

      <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">
        
        {/* Left: Location Headline & Live Counters */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1 text-xs font-bold uppercase tracking-wider text-primary bg-primary/10 px-2.5 py-1 rounded-full border border-primary/20">
              <MdLocationOn size={13} />
              <span>Regional Focus Active</span>
            </span>
            <button
              onClick={onClearRegion}
              className="text-xs text-text-muted hover:text-danger flex items-center gap-1 transition-colors px-1.5 py-0.5 rounded-md hover:bg-danger-soft"
              title="Clear State/District selection"
            >
              <FiX size={12} /> Clear Region
            </button>
          </div>

          <div>
            <h3 className="text-xl font-extrabold text-text-primary flex items-center gap-2">
              <span>{locationTitle}</span>
              <span className="text-xs font-medium text-text-muted px-2 py-0.5 rounded-md bg-border/60">
                {selectedDistrict ? 'District View' : 'State Level View'}
              </span>
            </h3>
            <p className="text-xs text-text-secondary mt-0.5">
              Live operational metrics & configuration readiness for this geographic area.
            </p>
          </div>

          {/* Metric Badges */}
          <div className="flex flex-wrap items-center gap-3 pt-1">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-bg border border-border/80 text-xs">
              <FiUsers className="text-blue-500" size={14} />
              <span className="text-text-secondary">Assigned BDEs:</span>
              <span className="font-bold text-text-primary">
                {regionalStats.loading ? '...' : regionalStats.bdeCount}
              </span>
            </div>

            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-bg border border-border/80 text-xs">
              <MdWarehouse className="text-emerald-500" size={15} />
              <span className="text-text-secondary">Warehouses:</span>
              <span className="font-bold text-text-primary">
                {regionalStats.loading ? '...' : regionalStats.warehouseCount}
              </span>
            </div>

            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-bg border border-border/80 text-xs">
              <FaStore className="text-amber-500" size={13} />
              <span className="text-text-secondary">Franchisees:</span>
              <span className="font-bold text-text-primary">
                {regionalStats.loading ? '...' : regionalStats.franchiseeCount}
              </span>
            </div>
          </div>
        </div>

        {/* Right: Quick Action Shortcuts for this Region */}
        <div className="flex flex-wrap sm:flex-nowrap items-center gap-2.5 shrink-0">
          <button
            onClick={() => navigate('/admin-panel/bde-management/territory-assignment')}
            className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-primary text-white hover:bg-primary-hover shadow-sm shadow-primary/25 transition-all"
          >
            <FaUserPlus size={12} />
            <span>Assign BDE Territory</span>
            <FiArrowRight size={12} />
          </button>

          <button
            onClick={() => navigate('/admin-panel/operations/company-warehouses')}
            className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-bg text-text-primary border border-border hover:border-primary/40 hover:text-primary transition-all"
          >
            <MdWarehouse size={14} />
            <span>Warehouses</span>
          </button>

          <button
            onClick={() => navigate('/admin-panel/solar-shop/combokit-configurations/pincode-delivery-costs')}
            className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-bg text-text-primary border border-border hover:border-primary/40 hover:text-primary transition-all"
          >
            <FaTruck size={12} />
            <span>Pincode Freight</span>
          </button>

          <button
            onClick={() => navigate('/admin-panel/settings/location-setting/setup-location')}
            className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-bg text-text-primary border border-border hover:border-primary/40 hover:text-primary transition-all"
          >
            <MdLocationOn size={14} />
            <span>Location Setup</span>
          </button>
        </div>

      </div>
    </div>
  );
}
