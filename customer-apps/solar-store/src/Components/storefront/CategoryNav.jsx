import React from "react";
import { Link, useLocation } from "react-router-dom";
import { MdOutlineAccountBalance } from "react-icons/md";
import {
  FiGrid,
  FiSun,
  FiZap,
  FiBatteryCharging,
  FiHome,
  FiBriefcase,
  FiHelpCircle,
  FiLayers,
  FiSliders,
  FiBarChart2,
  FiMapPin
} from "react-icons/fi";

export const CATEGORY_LINKS = [
  { name: "All Solar Kits", path: "/shop", icon: FiGrid },
  { name: "Govt. Tender Kits", path: "/preconfigured-combo-kit?filter=govt-tender", icon: MdOutlineAccountBalance, highlight: true },
  { name: "Find Nearby Store", path: "/store-locator", icon: FiMapPin, highlight: false },
  { name: "On-Grid Kits", path: "/shop?type=on-grid", icon: FiSun },
  { name: "Off-Grid Kits", path: "/shop?type=off-grid", icon: FiBatteryCharging },
  { name: "Hybrid Kits", path: "/shop?type=hybrid", icon: FiZap },
  { name: "Residential", path: "/shop?application=residential", icon: FiHome },
  { name: "Commercial", path: "/shop?application=commercial", icon: FiBriefcase },
  { name: "Shop by Capacity", path: "/shop?view=capacity", icon: FiBarChart2 },
  { name: "Find Your Solar Kit", path: "/kit-finder", icon: FiSliders },
  { name: "Compare Kits", path: "/compare", icon: FiLayers },
  { name: "Kit Buying Guide", path: "/guide", icon: FiHelpCircle },
];

export default function CategoryNav({ className = "" }) {
  const location = useLocation();

  const isCurrentActive = (linkPath) => {
    if (linkPath === "/shop" && (location.pathname === "/shop" || location.pathname === "/preconfigured-combo-kit") && !location.search) {
      return true;
    }
    const currentFull = location.pathname + location.search;
    return currentFull === linkPath || (location.pathname === linkPath && !linkPath.includes("?"));
  };

  return (
    <nav
      className={`bg-surface border-b border-border shadow-xs overflow-x-auto scrollbar-none no-scrollbar transition-colors overscroll-x-contain ${className}`}
      aria-label="Solar Kit Categories"
    >
      <div className="max-w-7xl mx-auto px-3 sm:px-6 flex items-center gap-1.5 sm:gap-2 py-1.5 sm:py-2">
        {CATEGORY_LINKS.map((item) => {
          const Icon = item.icon;
          const isActive = isCurrentActive(item.path);

          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl text-[11px] sm:text-xs font-semibold whitespace-nowrap transition-all duration-150 shrink-0 select-none ${item.highlight
                ? "bg-secondary-soft text-amber-700 hover:bg-amber-100/80 font-bold border border-secondary/30"
                : isActive
                  ? "bg-primary text-white font-bold shadow-xs"
                  : "text-text-secondary hover:text-primary hover:bg-primary-soft bg-surface-hover/60 sm:bg-transparent"
                }`}
            >
              {Icon && <Icon size={13} className={isActive ? "text-white" : item.highlight ? "text-secondary" : "text-primary/70"} />}
              <span>{item.name}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

