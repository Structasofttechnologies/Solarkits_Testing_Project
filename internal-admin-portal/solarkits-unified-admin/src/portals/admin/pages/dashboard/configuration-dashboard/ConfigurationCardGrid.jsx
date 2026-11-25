/**
 * ConfigurationCardGrid.jsx
 *
 * Clickable Configuration Cards Grid:
 * - Direct redirection to the respective configuration page on click
 * - Visual badges for domain and regional dependency
 * - Clear action triggers (e.g. "Create New BDE", "Assign Territories", "Configure Solar Kits")
 * - Search highlighting and empty state
 */

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  FiArrowRight,
  FiExternalLink,
  FiSliders,
  FiTag,
  FiTarget,
  FiDollarSign,
  FiFileText,
  FiSettings,
  FiUsers,
  FiMapPin,
  FiTool,
  FiShield,
  FiBarChart2,
  FiPackage,
} from 'react-icons/fi';
import {
  FaUserPlus,
  FaUserTie,
  FaUsers,
  FaCoins,
  FaRulerCombined,
  FaBoxes,
  FaTruck,
  FaAward,
  FaPercent,
  FaToggleOn,
  FaStore,
  FaIndustry,
  FaUserShield,
  FaGlobe,
  FaUserCheck,
  FaFileInvoiceDollar,
  FaWallet,
} from 'react-icons/fa';
import { FaMapLocationDot, FaMagnifyingGlassLocation } from 'react-icons/fa6';
import { HiCube, HiOutlineTemplate } from 'react-icons/hi';
import { GoProject } from 'react-icons/go';
import { MdQrCode2, MdWarehouse, MdAccountTree, MdTune, MdLocationOn } from 'react-icons/md';
import { BiSolidLayerPlus } from 'react-icons/bi';

// Helper icon resolver
const renderIcon = (iconName) => {
  const iconProps = { size: 18, className: 'text-primary' };
  switch (iconName) {
    case 'FaUserPlus': return <FaUserPlus {...iconProps} />;
    case 'FaUserTie': return <FaUserTie {...iconProps} />;
    case 'FaUsers': return <FaUsers {...iconProps} />;
    case 'FaUserCheck': return <FaUserCheck {...iconProps} />;
    case 'FaFileInvoiceDollar': return <FaFileInvoiceDollar {...iconProps} />;
    case 'FaWallet': return <FaWallet {...iconProps} />;
    case 'FaMapLocationDot': return <FaMapLocationDot {...iconProps} />;
    case 'FaCoins': return <FaCoins {...iconProps} />;
    case 'HiCube': return <HiCube {...iconProps} />;
    case 'GoProject': return <GoProject {...iconProps} />;
    case 'HiOutlineTemplate': return <HiOutlineTemplate {...iconProps} />;
    case 'MdQrCode2': return <MdQrCode2 {...iconProps} />;
    case 'FaRulerCombined': return <FaRulerCombined {...iconProps} />;
    case 'FaBoxes': return <FaBoxes {...iconProps} />;
    case 'FaTruck': return <FaTruck {...iconProps} />;
    case 'FaAward': return <FaAward {...iconProps} />;
    case 'FaPercent': return <FaPercent {...iconProps} />;
    case 'FiTag': return <FiTag {...iconProps} />;
    case 'FiTarget': return <FiTarget {...iconProps} />;
    case 'FaToggleOn': return <FaToggleOn {...iconProps} />;
    case 'FiSliders': return <FiSliders {...iconProps} />;
    case 'FiDollarSign': return <FiDollarSign {...iconProps} />;
    case 'FiFileText': return <FiFileText {...iconProps} />;
    case 'FaStore': return <FaStore {...iconProps} />;
    case 'FiSettings': return <FiSettings {...iconProps} />;
    case 'MdWarehouse': return <MdWarehouse {...iconProps} />;
    case 'FiUsers': return <FiUsers {...iconProps} />;
    case 'FaIndustry': return <FaIndustry {...iconProps} />;
    case 'BiSolidLayerPlus': return <BiSolidLayerPlus {...iconProps} />;
    case 'FaMagnifyingGlassLocation': return <FaMagnifyingGlassLocation {...iconProps} />;
    case 'FaUserShield': return <FaUserShield {...iconProps} />;
    case 'MdAccountTree': return <MdAccountTree {...iconProps} />;
    case 'FaGlobe': return <FaGlobe {...iconProps} />;
    case 'FiTool': return <FiTool {...iconProps} />;
    case 'FiShield': return <FiShield {...iconProps} />;
    case 'FiBarChart2': return <FiBarChart2 {...iconProps} />;
    case 'FiPackage': return <FiPackage {...iconProps} />;
    default: return <MdTune {...iconProps} />;
  }
};

export default function ConfigurationCardGrid({
  modules,
  selectedState,
  selectedDistrict,
  searchQuery,
}) {
  const navigate = useNavigate();

  if (modules.length === 0) {
    return (
      <div className="card p-12 text-center rounded-2xl border border-dashed border-border bg-card/50">
        <div className="w-12 h-12 rounded-2xl bg-border/60 flex items-center justify-center mx-auto mb-3 text-text-muted">
          <MdTune size={24} />
        </div>
        <h4 className="text-base font-bold text-text-primary">No configuration modules match your criteria</h4>
        <p className="text-xs text-text-secondary mt-1 max-w-sm mx-auto">
          Try clearing your search keyword, disabling "Regional Only", or choosing another domain category.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {modules.map((mod) => {
        const isRegionalActive = (selectedState || selectedDistrict) && mod.isRegional;

        return (
          <motion.div
            key={mod.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
            onClick={() => navigate(mod.route)}
            className={`card p-4 rounded-2xl border transition-all duration-200 cursor-pointer flex flex-col justify-between group hover:-translate-y-1 hover:shadow-md ${
              isRegionalActive
                ? 'border-primary/40 bg-gradient-to-b from-primary/5 via-card to-card ring-1 ring-primary/20 shadow-xs'
                : 'border-border/80 bg-card hover:border-primary/30'
            }`}
          >
            {/* Top row: Icon + Badges */}
            <div>
              <div className="flex items-start justify-between gap-2 mb-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/15 flex items-center justify-center shrink-0 group-hover:scale-105 group-hover:bg-primary/15 transition-all">
                  {renderIcon(mod.icon)}
                </div>

                <div className="flex flex-wrap items-center justify-end gap-1.5">
                  {mod.isRegional && (
                    <span
                      className={`text-[10px] font-semibold px-2 py-0.5 rounded-md flex items-center gap-1 border ${
                        isRegionalActive
                          ? 'bg-primary text-white border-primary shadow-2xs font-bold'
                          : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20'
                      }`}
                      title="This configuration has State/District dependencies"
                    >
                      <FiMapPin size={9} />
                      <span>Regional</span>
                    </span>
                  )}

                  <span className="text-[10px] font-medium text-text-muted bg-border/50 px-2 py-0.5 rounded-md">
                    {mod.categoryLabel}
                  </span>
                </div>
              </div>

              {/* Title & Description */}
              <h4 className="text-sm font-bold text-text-primary group-hover:text-primary transition-colors line-clamp-1">
                {mod.title}
              </h4>
              <p className="text-xs text-text-secondary mt-1 line-clamp-2 leading-relaxed">
                {mod.description}
              </p>

              {/* Regional Context Tag if location filter active */}
              {isRegionalActive && (
                <div className="mt-2.5 px-2.5 py-1.5 rounded-lg bg-primary/10 border border-primary/15 text-[11px] text-primary flex items-center gap-1.5 font-medium">
                  <FiMapPin size={11} className="shrink-0" />
                  <span className="line-clamp-1">
                    Affects {selectedDistrict ? selectedDistrict.name : selectedState.name}
                  </span>
                </div>
              )}
            </div>

            {/* Bottom Action Footer */}
            <div className="pt-4 mt-3 border-t border-border/50 flex items-center justify-between gap-2">
              <span className="text-[11px] font-mono text-text-muted line-clamp-1">
                {mod.route.replace('/admin-panel/', '')}
              </span>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  navigate(mod.route);
                }}
                className="flex items-center gap-1 text-xs font-semibold text-primary group-hover:translate-x-0.5 transition-transform shrink-0"
              >
                <span>{mod.primaryAction}</span>
                <FiArrowRight size={13} />
              </button>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}
