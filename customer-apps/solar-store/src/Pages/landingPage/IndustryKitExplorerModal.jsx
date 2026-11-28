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

export default function IndustryKitExplorerModal({ isOpen, onClose, industry }) {
  const [hierarchyData, setHierarchyData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [selectedCatIdx, setSelectedCatIdx] = useState(0);

  useEffect(() => {
    if (!isOpen || !industry) return;
    setSelectedCatIdx(0);

    const slug = (industry.industry_slug || industry.slug || industry.id || "").toLowerCase();

    setLoading(true);
    axios
      .get(`${API_BASE}/admin-api/project-types/public-hierarchy`)
      .then((res) => {
        if (res.data?.status === "success" && Array.isArray(res.data.data)) {
          const matched = res.data.data.find(
            (ind) =>
              (ind.slug && ind.slug.toLowerCase() === slug) ||
              (ind.name && ind.name.toLowerCase().includes((industry.name || "").toLowerCase()))
          );
          if (matched && matched.categories?.length > 0) {
            setHierarchyData({
              name: matched.name,
              description: industry.desc || matched.description || "",
              categories: matched.categories.map((c) => ({
                name: c.name,
                subcategories: (c.subcategories || []).map((sc) => ({
                  name: sc.name,
                  types: (sc.mappedTypes || []).map((t) => t.name),
                  capacity: sc.mappedTypes?.[0]?.ranges?.[0]
                    ? `${sc.mappedTypes[0].ranges[0].min_value} - ${sc.mappedTypes[0].ranges[0].max_value} ${sc.mappedTypes[0].ranges[0].unit_symbol}`
                    : ""
                })),
                sampleKits: c.sampleKits || []
              }))
            });
            return;
          }
        }
        setHierarchyData({
          name: industry.name || "Industry Solutions",
          description: industry.desc || "",
          categories: []
        });
      })
      .catch(() => {
        setHierarchyData({
          name: industry.name || "Industry Solutions",
          description: industry.desc || "",
          categories: []
        });
      })
      .finally(() => {
        setLoading(false);
      });
  }, [isOpen, industry]);

  if (!isOpen || !industry) return null;

  const data = hierarchyData || { name: industry.name, description: industry.desc, categories: [] };
  const activeCategory = data.categories?.[selectedCatIdx] || data.categories?.[0] || null;

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
            {loading ? (
              <div className="py-16 text-center text-xs text-slate-400 font-bold animate-pulse">
                Loading industry specifications...
              </div>
            ) : !data.categories || data.categories.length === 0 ? (
              <div className="bg-white p-10 rounded-2xl border border-slate-200 text-center space-y-2">
                <FiPackage size={36} className="mx-auto text-slate-300" />
                <h4 className="font-heading text-sm font-extrabold text-navy">
                  No Categories Configured Yet
                </h4>
                <p className="text-xs text-slate-400 max-w-sm mx-auto">
                  Project categories, system types, and kits configured in the Admin Portal will dynamically appear here.
                </p>
              </div>
            ) : (
              <>
                {/* Project Categories Tabs */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                      Select Project Category / Application
                    </span>
                    <span className="text-xs text-amber-600 font-semibold">
                      {data.categories.length} Categories Configured
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {data.categories.map((cat, idx) => {
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
              </>
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

