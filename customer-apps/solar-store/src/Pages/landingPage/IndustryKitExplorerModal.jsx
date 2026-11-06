import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  FiX,
  FiCheckCircle,
  FiArrowRight,
  FiSun,
  FiZap,
  FiPackage,
  FiGrid,
  FiSliders,
  FiExternalLink,
  FiChevronRight
} from "react-icons/fi";
import { MdAgriculture, MdOutlineFactory } from "react-icons/md";
import axios from "axios";

const getBaseUrl = () => {
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL.replace(/\/api\/?$/, "");
  }
  return import.meta.env.VITE_BACKEND_URL || "http://localhost:5000";
};

const API_BASE = getBaseUrl();

// Fallback hierarchy if backend is loading or in offline mode
const FALLBACK_HIERARCHIES = {
  "solar-pv": {
    name: "Solar PV Ecosystem",
    description: "Complete rooftop and ground-mounted solar PV systems with net-metering and PM Surya Ghar subsidy compliance.",
    categories: [
      {
        name: "Residential Solar",
        subcategories: [
          { name: "Individual Home", types: ["On-Grid", "Hybrid"], capacity: "1 - 10 kW" },
          { name: "Housing Society (GHS)", types: ["On-Grid"], capacity: "11 - 100 kW" },
          { name: "Rooftop Rental / Off-Grid Cabin", types: ["Off-Grid", "Hybrid"], capacity: "2 - 10 kW" }
        ],
        sampleKits: [
          { name: "3 KW Solarkits DCR Complete Home Combo Kit", watt: "3kW Kit", price: 79498.75, mrp: 98000, type: "On-Grid", badge: "PM Surya Ghar #1" },
          { name: "2 K.W. Solarkits DCR Rooftop Combo Kit", watt: "2kW Kit", price: 57548.75, mrp: 72000, type: "On-Grid", badge: "High Demand" },
          { name: "1 K.W. Solarkits DCR Kit", watt: "1kW Kit", price: 31324.25, mrp: 42000, type: "On-Grid", badge: "Subsidy Eligible" }
        ]
      },
      {
        name: "Commercial & Industrial Solar",
        subcategories: [
          { name: "Factory Shed Rooftop", types: ["On-Grid", "Zero-Export"], capacity: "25 - 500 kW" },
          { name: "Commercial Office Building", types: ["On-Grid", "Hybrid"], capacity: "10 - 50 kW" },
          { name: "Institutional & School Rooftop", types: ["On-Grid"], capacity: "10 - 100 kW" }
        ],
        sampleKits: [
          { name: "10 KW Solarkits Commercial 3-Phase Kit", watt: "10kW Kit", price: 490000, mrp: 620000, type: "On-Grid 3-Phase", badge: "High ROI" },
          { name: "5 KW Heavy Duty Hybrid Solar Kit", watt: "5kW Kit", price: 265000, mrp: 340000, type: "Hybrid BESS", badge: "Battery Backup" }
        ]
      }
    ]
  },
  "solar-agriculture": {
    name: "Solar Agriculture & PM KUSUM",
    description: "Solar pumping, cold storage, and decentralized solar mini-grids engineered for Indian agricultural requirements.",
    categories: [
      {
        name: "Solar Water Pumping",
        subcategories: [
          { name: "Submersible DC Solar Pump", types: ["DC Surface", "DC Submersible"], capacity: "3 HP - 10 HP" },
          { name: "AC Solar Water Pump with VFD", types: ["AC VFD Driven"], capacity: "5 HP - 20 HP" }
        ],
        sampleKits: [
          { name: "5 HP DC Solar Agriculture Pump Kit", watt: "5 HP / 4.8kW", price: 185000, mrp: 235000, type: "PM KUSUM Component B", badge: "High Discharge" },
          { name: "3 HP Solar Submersible Tube-well Kit", watt: "3 HP / 3.2kW", price: 125000, mrp: 160000, type: "PM KUSUM", badge: "Govt Subsidy" }
        ]
      },
      {
        name: "Agri-Cold Storage & Processing",
        subcategories: [
          { name: "Solar Cold Storage Room", types: ["Thermal Storage", "LFP BESS"], capacity: "5 MT - 20 MT" },
          { name: "Solar Flour & Spice Agro Mill", types: ["Hybrid Off-Grid"], capacity: "5 kW - 15 kW" }
        ],
        sampleKits: [
          { name: "10 MT Solar Cold Room Complete Combo", watt: "10kW + Thermal BESS", price: 450000, mrp: 580000, type: "Cold Chain", badge: "Farmer Friendly" }
        ]
      }
    ]
  },
  "solar-ev": {
    name: "Solar EV Infrastructure",
    description: "Solar-integrated EV carports, smart fleet charging stations, and grid-buffered EV charging solutions.",
    categories: [
      {
        name: "EV Charging Infrastructure",
        subcategories: [
          { name: "Commercial Solar Carport", types: ["Grid-Tied", "BESS Buffered"], capacity: "10 kW - 100 kW" },
          { name: "2W/3W Fleet Battery Swapping Hub", types: ["DC Fast Charge"], capacity: "15 kW - 50 kW" }
        ],
        sampleKits: [
          { name: "15 kW Solar EV Carport 4-Bay Kit", watt: "15kW Array", price: 680000, mrp: 850000, type: "Carport Combo", badge: "Dual Charger" },
          { name: "7.4 kW AC Smart Solar EV Charger Kit", watt: "7.4kW AC", price: 85000, mrp: 115000, type: "Type-2 Charger", badge: "Smart App" }
        ]
      }
    ]
  },
  "energy-storage": {
    name: "Energy Storage Systems (BESS)",
    description: "High-density Lithium Ferro Phosphate (LFP) energy storage for peak shaving, diesel generator replacement, and 24x7 off-grid power.",
    categories: [
      {
        name: "Battery Energy Storage (BESS)",
        subcategories: [
          { name: "Residential Wall-Mounted BESS", types: ["48V / 51.2V LFP"], capacity: "5 kWh - 20 kWh" },
          { name: "Commercial & Industrial Container BESS", types: ["High Voltage LFP"], capacity: "50 kWh - 500 kWh" }
        ],
        sampleKits: [
          { name: "10 kWh Smart LFP Lithium Storage Kit", watt: "10 kWh ESS", price: 215000, mrp: 280000, type: "LFP Wall Mount", badge: "6000 Cycles" },
          { name: "5 kW Hybrid Inverter + 5.12 kWh Battery Combo", watt: "5kW / 5.12kWh", price: 245000, mrp: 310000, type: "Turnkey ESS", badge: "Zero DG" }
        ]
      }
    ]
  },
  "solar-lighting": {
    name: "Solar Lighting & Security",
    description: "All-in-one autonomous solar streetlights, semi-integrated floodlights, and surveillance towers for rural and industrial campuses.",
    categories: [
      {
        name: "Smart Solar Lighting",
        subcategories: [
          { name: "All-In-One Integrated Solar Streetlight", types: ["LiFePO4 MPPT"], capacity: "20W - 120W" },
          { name: "High-Mast Commercial Floodlighting", types: ["Split System"], capacity: "150W - 400W" }
        ],
        sampleKits: [
          { name: "40W All-In-One Smart Solar Streetlight (Pack of 10)", watt: "40W x 10 Units", price: 68000, mrp: 92000, type: "PIR Sensor", badge: "3-Night Backup" },
          { name: "90W High Lumen Semi-Integrated Streetlight Kit", watt: "90W LED", price: 12500, mrp: 16500, type: "Industrial", badge: "IP66 Rated" }
        ]
      }
    ]
  },
  "solar-thermal": {
    name: "Solar Thermal & Heating",
    description: "High-temperature pressurized and evacuated tube solar water heating systems for commercial, hospitality, and residential needs.",
    categories: [
      {
        name: "Solar Water Heating Systems",
        subcategories: [
          { name: "Domestic ETC Solar Water Heater", types: ["Non-Pressurized"], capacity: "100 LPD - 500 LPD" },
          { name: "Commercial FPC Pressurized System", types: ["Pressurized Manifold"], capacity: "1000 LPD - 10000 LPD" }
        ],
        sampleKits: [
          { name: "200 LPD Evacuated Tube Solar Water Heater Kit", watt: "200 Litres/Day", price: 28500, mrp: 36000, type: "Glass Lined", badge: "Hard Water Ready" },
          { name: "1000 LPD Commercial Industrial Solar Boiler Pre-Heater", watt: "1000 LPD", price: 165000, mrp: 210000, type: "Copper FPC", badge: "High Temp" }
        ]
      }
    ]
  },
  "rural-solar": {
    name: "Rural Solar Solutions",
    description: "Decentralized solar microgrids, off-grid solar home lighting systems, community drinking water pumps, and rural livelihood applications.",
    categories: [
      {
        name: "Rural Electrification & Lighting",
        subcategories: [
          { name: "Solar Home Lighting System (SHS)", types: ["DC Solar Home System"], capacity: "100W - 1000W" },
          { name: "Village DC/AC Mini-Grid", types: ["Microgrid BESS"], capacity: "5 kW - 50 kW" }
        ],
        sampleKits: [
          { name: "500W Solar Home Lighting Kit with 3 LED + Fan", watt: "500W Kit", price: 16500, mrp: 22000, type: "Off-Grid DC", badge: "Rural Electrification" },
          { name: "10 kW Village Community Solar Microgrid Combo", watt: "10kW Microgrid", price: 420000, mrp: 540000, type: "Microgrid", badge: "Off-Grid Power" }
        ]
      },
      {
        name: "Community Solar Drinking Water",
        subcategories: [
          { name: "Solar RO & Water Purification Kiosk", types: ["Solar Powered RO"], capacity: "1000 LPH - 5000 LPH" },
          { name: "Jal Jeevan Mission Solar Pump", types: ["DC Submersible"], capacity: "2 HP - 7.5 HP" }
        ],
        sampleKits: [
          { name: "Solar Jal Jeevan Community Water Pumping Combo", watt: "3 HP Submersible", price: 145000, mrp: 185000, type: "Drinking Water", badge: "Jal Jeevan Mission" }
        ]
      }
    ]
  }
};

export default function IndustryKitExplorerModal({ isOpen, onClose, industry }) {
  const [hierarchyData, setHierarchyData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [selectedCatIdx, setSelectedCatIdx] = useState(0);

  useEffect(() => {
    if (!isOpen || !industry) return;
    setSelectedCatIdx(0);

    const slug = (industry.industry_slug || industry.id || "").toLowerCase();
    const fallback = FALLBACK_HIERARCHIES[slug] || FALLBACK_HIERARCHIES["solar-pv"];

    setLoading(true);
    axios
      .get(`${API_BASE}/admin-api/project-types/public-hierarchy`)
      .then((res) => {
        if (res.data?.status === "success" && Array.isArray(res.data.data)) {
          const matched = res.data.data.find(
            (ind) =>
              (ind.slug && ind.slug.toLowerCase() === slug) ||
              (ind.name && ind.name.toLowerCase().includes(industry.name.toLowerCase()))
          );
          if (matched && matched.categories?.length > 0) {
            setHierarchyData({
              name: matched.name,
              description: industry.desc || fallback.description,
              categories: matched.categories.map((c) => ({
                name: c.name,
                subcategories: (c.subcategories || []).map((sc) => ({
                  name: sc.name,
                  types: (sc.mappedTypes || []).map((t) => t.name),
                  capacity: sc.mappedTypes?.[0]?.ranges?.[0]
                    ? `${sc.mappedTypes[0].ranges[0].min_value} - ${sc.mappedTypes[0].ranges[0].max_value} ${sc.mappedTypes[0].ranges[0].unit_symbol}`
                    : "1 - 10 kW"
                })),
                sampleKits: fallback.categories?.[0]?.sampleKits || fallback.categories?.[selectedCatIdx]?.sampleKits || []
              }))
            });
            return;
          }
        }
        setHierarchyData(fallback);
      })
      .catch(() => {
        setHierarchyData(fallback);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [isOpen, industry]);

  if (!isOpen || !industry) return null;

  const data = hierarchyData || FALLBACK_HIERARCHIES["solar-pv"];
  const activeCategory = data.categories?.[selectedCatIdx] || data.categories?.[0];

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm"
        />

        {/* Modal Window */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ type: "spring", duration: 0.4 }}
          className="relative w-full max-w-4xl bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-200 z-10 my-8 max-h-[90vh] flex flex-col"
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-navy via-slate-900 to-navy text-white px-6 py-5 flex items-center justify-between border-b border-white/10 shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-400/30 flex items-center justify-center text-amber-400 text-2xl shadow-inner">
                {industry.name?.toLowerCase().includes("agri") ? (
                  <MdAgriculture />
                ) : industry.name?.toLowerCase().includes("ev") ? (
                  <FiZap />
                ) : industry.name?.toLowerCase().includes("storage") ? (
                  <FiPackage />
                ) : (
                  <FiSun />
                )}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-heading text-xl font-black text-white">
                    {industry.name}
                  </h3>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-400/20 text-amber-300 border border-amber-400/30">
                    Live Industry Ecosystem
                  </span>
                </div>
                <p className="text-xs text-slate-300 mt-0.5 line-clamp-1 max-w-xl">
                  {data.description || industry.desc}
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer"
            >
              <FiX size={18} />
            </button>
          </div>

          {/* Modal Body */}
          <div className="p-6 overflow-y-auto space-y-6 flex-1 bg-slate-50/50">
            {/* Project Categories Tabs */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Select Project Category / Application
                </span>
                <span className="text-xs text-amber-600 font-semibold">
                  {data.categories?.length || 0} Categories Configured
                </span>
              </div>

              <div className="flex flex-wrap gap-2">
                {(data.categories || []).map((cat, idx) => {
                  const isActive = idx === selectedCatIdx;
                  return (
                    <button
                      key={cat.name || idx}
                      onClick={() => setSelectedCatIdx(idx)}
                      className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 border ${
                        isActive
                          ? "bg-navy text-white border-navy shadow-md ring-2 ring-navy/20"
                          : "bg-white text-slate-700 border-slate-200 hover:border-slate-300 hover:bg-slate-50"
                      }`}
                    >
                      <FiCheckCircle
                        className={`text-xs ${isActive ? "text-amber-400" : "text-slate-300"}`}
                      />
                      <span>{cat.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Sub-categories & Technical System Types */}
            {activeCategory && (
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div>
                    <h4 className="font-heading text-sm font-extrabold text-navy">
                      Sub-Categories & Operational System Types
                    </h4>
                    <p className="text-[11px] text-slate-500">
                      Configured in Product Configuration &gt; Project Types
                    </p>
                  </div>
                  <span className="px-3 py-1 rounded-lg text-xs font-bold bg-blue-50 text-blue-600 border border-blue-100">
                    {activeCategory.name}
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {(activeCategory.subcategories || []).map((sub, sIdx) => (
                    <div
                      key={sub.name || sIdx}
                      className="p-3.5 rounded-xl border border-slate-100 bg-slate-50/70 hover:bg-slate-50 transition-colors space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-xs text-navy line-clamp-1">
                          {sub.name}
                        </span>
                        <span className="text-[10px] font-bold text-slate-400">
                          #{sIdx + 1}
                        </span>
                      </div>

                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {(sub.types || ["On-Grid", "Hybrid"]).map((t, tIdx) => (
                          <span
                            key={tIdx}
                            className="px-2 py-0.5 rounded text-[10px] font-bold bg-white text-slate-700 border border-slate-200 shadow-2xs"
                          >
                            {t}
                          </span>
                        ))}
                      </div>

                      {sub.capacity && (
                        <div className="text-[10px] text-slate-500 font-medium flex items-center gap-1">
                          <FiSliders className="text-amber-500" />
                          <span>Capacity: {sub.capacity}</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Available Pre-Engineered Solar Combo Kits */}
            {activeCategory?.sampleKits && activeCategory.sampleKits.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    Pre-Configured Combo Kits Available for {activeCategory.name}
                  </h4>
                  <a
                    href="#products"
                    onClick={onClose}
                    className="text-xs font-bold text-primary-600 hover:text-primary-700 flex items-center gap-1"
                  >
                    <span>View All in Store</span>
                    <FiChevronRight />
                  </a>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {activeCategory.sampleKits.map((kit, kIdx) => (
                    <div
                      key={kIdx}
                      className="p-4 rounded-2xl border border-slate-200 bg-white shadow-xs hover:shadow-md transition-shadow flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex items-center justify-between gap-2 mb-2">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-100 text-amber-800 border border-amber-200">
                            {kit.badge || "Certified Kit"}
                          </span>
                          <span className="text-[11px] font-bold text-slate-500">
                            {kit.watt}
                          </span>
                        </div>

                        <h5 className="font-heading text-xs font-extrabold text-navy leading-snug line-clamp-2">
                          {kit.name}
                        </h5>

                        <span className="inline-block mt-1 text-[10px] text-slate-500 font-semibold">
                          System: {kit.type || "On-Grid Solar"}
                        </span>
                      </div>

                      <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                        <div>
                          <div className="text-sm font-black text-navy">
                            ₹{Number(Math.round(kit.price)).toLocaleString("en-IN")}
                          </div>
                          {kit.mrp && (
                            <div className="text-[10px] text-slate-400 line-through">
                              ₹{Number(Math.round(kit.mrp)).toLocaleString("en-IN")}
                            </div>
                          )}
                        </div>

                        <a
                          href="#products"
                          onClick={onClose}
                          className="px-3 py-1.5 rounded-xl bg-primary-500 hover:bg-primary-600 text-white font-bold text-[11px] transition-colors shadow-xs"
                        >
                          View Kit
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Footer Actions */}
          <div className="bg-white px-6 py-4 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
            <div className="text-xs text-slate-500">
              <span className="font-bold text-navy">EPC Note:</span> All kits include pre-wired BOS, SLD drawings & DISCOM net-metering paperwork.
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <a
                href={`/browse/industry?slug=${industry.industry_slug || industry.id}`}
                className="w-full sm:w-auto px-4 py-2 rounded-xl border border-slate-200 hover:border-slate-300 bg-white text-slate-700 font-bold text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <span>Full Industry Brochure</span>
                <FiExternalLink />
              </a>

              <a
                href="#products"
                onClick={onClose}
                className="w-full sm:w-auto px-5 py-2 rounded-xl bg-navy hover:bg-navy/90 text-white font-bold text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
              >
                <span>Order Solar Kits</span>
                <FiArrowRight />
              </a>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

