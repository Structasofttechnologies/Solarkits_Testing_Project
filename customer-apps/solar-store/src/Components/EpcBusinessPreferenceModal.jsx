import { useState, useEffect } from "react";
import { useSelector, useDispatch } from "react-redux";
import { motion, AnimatePresence } from "framer-motion";
import axios from "axios";
import {
  FiCheck,
  FiX,
  FiZap,
  FiMail,
  FiMessageSquare,
  FiLayers,
  FiChevronRight,
  FiInfo,
  FiArrowRight,
  FiSun,
  FiCheckSquare,
  FiSquare
} from "react-icons/fi";
import {
  FaBuilding,
  FaSolarPanel,
  FaIndustry,
  FaChargingStation,
  FaLeaf,
  FaLightbulb,
  FaBoxes
} from "react-icons/fa";
import { setAlert } from "../features/alert.slice";

const getIndustryIcon = (name = "") => {
  const n = name.toLowerCase();
  if (n.includes("agri") || n.includes("pump")) return <FaLeaf className="text-emerald-500" />;
  if (n.includes("ev") || n.includes("charg")) return <FaChargingStation className="text-cyan-500" />;
  if (n.includes("storage") || n.includes("battery")) return <FiZap className="text-amber-500" />;
  if (n.includes("light")) return <FaLightbulb className="text-yellow-500" />;
  if (n.includes("thermal") || n.includes("heat")) return <FiSun className="text-orange-500" />;
  if (n.includes("industrial") || n.includes("commercial")) return <FaIndustry className="text-indigo-500" />;
  return <FaSolarPanel className="text-blue-500" />;
};

export default function EpcBusinessPreferenceModal({ isOpen, onClose, onSubmitted }) {
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth_slice);
  const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [industriesData, setIndustriesData] = useState([]);

  // Active industry tab in the vertical sidebar
  const [activeIndustryId, setActiveIndustryId] = useState(null);

  // Selections
  const [selectedIndustryIds, setSelectedIndustryIds] = useState([]);
  const [selectedCategoryIds, setSelectedCategoryIds] = useState([]);
  const [selectedSubcategoryIds, setSelectedSubcategoryIds] = useState([]);

  // Fetch dynamic hierarchy from Admin configurations
  useEffect(() => {
    if (!isOpen) return;
    const fetchOptions = async () => {
      try {
        setLoading(true);
        const res = await axios.get(`${API_URL}/india/v1/epc/preferences/config-options`, {
          withCredentials: true
        });
        if (res.data?.status === "success" && Array.isArray(res.data.data?.industries)) {
          const industries = res.data.data.industries;
          setIndustriesData(industries);
          if (industries.length > 0 && !activeIndustryId) {
            setActiveIndustryId(industries[0].id);
          }
        }
      } catch (err) {
        console.error("Failed to fetch preference config options:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchOptions();
  }, [isOpen, API_URL]);

  // Toggle single subcategory
  const toggleSubcategory = (subId, catId, indId) => {
    setSelectedSubcategoryIds((prev) => {
      const exists = prev.includes(subId);
      const newSubIds = exists ? prev.filter((id) => id !== subId) : [...prev, subId];

      // Auto ensure parent industry and category are in selected arrays
      if (!exists) {
        setSelectedCategoryIds((cPrev) => (cPrev.includes(catId) ? cPrev : [...cPrev, catId]));
        setSelectedIndustryIds((iPrev) => (iPrev.includes(indId) ? iPrev : [...iPrev, indId]));
      }
      return newSubIds;
    });
  };

  // Toggle all subcategories under a specific project category
  const toggleAllSubcategoriesInCategory = (category, indId) => {
    const subIds = (category.subcategories || []).map((s) => s.id);
    if (subIds.length === 0) {
      // If category has no subcategories, toggle category itself
      setSelectedCategoryIds((prev) =>
        prev.includes(category.id) ? prev.filter((id) => id !== category.id) : [...prev, category.id]
      );
      setSelectedIndustryIds((prev) =>
        prev.includes(indId) ? prev : [...prev, indId]
      );
      return;
    }

    const allSelected = subIds.every((id) => selectedSubcategoryIds.includes(id));

    if (allSelected) {
      setSelectedSubcategoryIds((prev) => prev.filter((id) => !subIds.includes(id)));
    } else {
      setSelectedSubcategoryIds((prev) => Array.from(new Set([...prev, ...subIds])));
      setSelectedCategoryIds((prev) => (prev.includes(category.id) ? prev : [...prev, category.id]));
      setSelectedIndustryIds((prev) => (prev.includes(indId) ? prev : [...prev, indId]));
    }
  };

  // Toggle entire industry (selects or deselects all categories & subcategories inside it)
  const toggleEntireIndustry = (ind) => {
    const indId = ind.id;
    const isIndSelected = selectedIndustryIds.includes(indId);

    const allCatIds = (ind.categories || []).map((c) => c.id);
    const allSubIds = (ind.categories || []).flatMap((c) => (c.subcategories || []).map((s) => s.id));

    if (isIndSelected) {
      // Deselect industry, its categories and subcategories
      setSelectedIndustryIds((prev) => prev.filter((id) => id !== indId));
      setSelectedCategoryIds((prev) => prev.filter((id) => !allCatIds.includes(id)));
      setSelectedSubcategoryIds((prev) => prev.filter((id) => !allSubIds.includes(id)));
    } else {
      // Select industry, its categories and subcategories
      setSelectedIndustryIds((prev) => [...prev, indId]);
      setSelectedCategoryIds((prev) => Array.from(new Set([...prev, ...allCatIds])));
      setSelectedSubcategoryIds((prev) => Array.from(new Set([...prev, ...allSubIds])));
    }
  };

  // Submit preferences
  const handleSubmit = async () => {
    try {
      setSubmitting(true);

      // Auto ensure all selected subcategories have their parent category and industry ids
      const finalIndIds = new Set(selectedIndustryIds);
      const finalCatIds = new Set(selectedCategoryIds);

      industriesData.forEach((ind) => {
        (ind.categories || []).forEach((cat) => {
          const hasSelectedSub = (cat.subcategories || []).some((s) =>
            selectedSubcategoryIds.includes(s.id)
          );
          if (hasSelectedSub) {
            finalCatIds.add(cat.id);
            finalIndIds.add(ind.id);
          }
        });
      });

      const payload = {
        epc_id: user?._id || user?.account_id || user?.id,
        selected_industry_ids: Array.from(finalIndIds),
        selected_category_ids: Array.from(finalCatIds),
        selected_subcategory_ids: selectedSubcategoryIds
      };

      const res = await axios.post(`${API_URL}/india/v1/epc/preferences/submit`, payload, {
        withCredentials: true
      });

      if (res.data?.status === "success") {
        dispatch(
          setAlert({
            type: "success",
            message: "Thank you! Your solar business industry & project preferences have been saved."
          })
        );
        if (onSubmitted) onSubmitted();
        if (onClose) onClose();
      }
    } catch (err) {
      console.error("Error submitting preferences:", err);
      dispatch(
        setAlert({
          type: "error",
          message: err.response?.data?.message || "Failed to save preferences. Please try again."
        })
      );
    } finally {
      setSubmitting(false);
    }
  };

  // Skip preference selection (non-blocking, records skipped in backend)
  const handleSkip = async () => {
    try {
      setSubmitting(true);
      await axios.post(
        `${API_URL}/india/v1/epc/preferences/skip`,
        { epc_id: user?._id || user?.account_id || user?.id },
        { withCredentials: true }
      );
      dispatch(
        setAlert({
          type: "info",
          message: "Preferences skipped. You can configure your business verticals anytime from your account profile."
        })
      );
      if (onClose) onClose();
    } catch (err) {
      console.error("Error skipping preferences:", err);
      if (onClose) onClose();
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  const activeIndustry = industriesData.find((i) => i.id === activeIndustryId) || industriesData[0];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-5 bg-slate-950/85 backdrop-blur-md overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        className="relative w-full max-w-5xl lg:max-w-6xl bg-slate-900 text-slate-100 rounded-3xl shadow-2xl border border-slate-700/80 overflow-hidden flex flex-col my-auto max-h-[92vh]"
      >
        {/* Top Header Bar */}
        <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white p-5 sm:p-6 shrink-0 relative overflow-hidden border-b border-slate-800">
          <div className="flex items-start justify-between gap-3 relative z-10">
            <div className="space-y-1">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 border border-blue-400/40 text-[11px] font-bold text-blue-200 uppercase tracking-wider">
                <FiZap className="w-3.5 h-3.5 text-amber-400" />
                <span>EPC Onboarding & Business Specialization</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white">
                Tell us about your solar business
              </h2>
              <p className="text-xs sm:text-sm text-slate-300 max-w-3xl leading-relaxed">
                Select the industry verticals you serve, project categories, and target sub-categories. We will curate relevant products, wholesale pricing, and verified dispatch allocations.
              </p>
            </div>

            <button
              onClick={handleSkip}
              className="text-slate-400 hover:text-white p-2 rounded-xl hover:bg-white/10 transition-colors cursor-pointer"
              title="Skip for now"
            >
              <FiX className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Center Layout: Left Vertical Industry Sidebar + Center Project Categories & Sub-Categories */}
        <div className="flex-1 overflow-hidden grid grid-cols-1 md:grid-cols-12 min-h-0 bg-slate-950">
          {/* ── LEFT VERTICAL COLUMN: INDUSTRY TYPES ─────────────────────── */}
          <div className="md:col-span-4 lg:col-span-3 border-r border-slate-800 bg-slate-900/90 overflow-y-auto p-3 space-y-2 flex flex-col">
            <div className="px-2 py-1.5 text-xs font-black uppercase tracking-wider text-slate-300 flex items-center justify-between">
              <span>Industry Types</span>
              <span className="text-[10px] bg-slate-800 text-slate-300 border border-slate-700 px-2 py-0.5 rounded font-black">
                {industriesData.length} Roots
              </span>
            </div>

            {loading ? (
              <div className="py-8 text-center space-y-2">
                <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto" />
                <span className="text-xs text-slate-400">Loading industries...</span>
              </div>
            ) : (
              industriesData.map((ind) => {
                const isActive = activeIndustry?.id === ind.id;
                const isSelected = selectedIndustryIds.includes(ind.id);

                // Count selected subcategories under this industry
                const indSubIds = (ind.categories || []).flatMap((c) =>
                  (c.subcategories || []).map((s) => s.id)
                );
                const selectedInThisInd = indSubIds.filter((id) =>
                  selectedSubcategoryIds.includes(id)
                ).length;

                return (
                  <div
                    key={ind.id}
                    onClick={() => setActiveIndustryId(ind.id)}
                    className={`p-3 rounded-2xl transition-all cursor-pointer select-none flex items-center justify-between gap-2.5 border ${
                      isActive
                        ? "bg-blue-600 text-white shadow-lg shadow-blue-600/30 border-blue-400 font-bold"
                        : "bg-slate-800/60 hover:bg-slate-800 text-slate-200 border-slate-700/60 hover:border-slate-500"
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div
                        className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 text-base ${
                          isActive
                            ? "bg-white/20 text-white"
                            : "bg-slate-700/80 text-blue-400"
                        }`}
                      >
                        {getIndustryIcon(ind.name)}
                      </div>
                      <div className="min-w-0">
                        <h4 className="text-xs font-black text-white truncate leading-tight">{ind.name}</h4>
                        <span
                          className={`text-[11px] font-medium ${
                            isActive ? "text-blue-100" : "text-slate-400"
                          }`}
                        >
                          {ind.categories?.length || 0} Categories
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {selectedInThisInd > 0 && (
                        <span
                          className={`text-[10px] font-black px-1.5 py-0.5 rounded-full ${
                            isActive
                              ? "bg-white text-blue-700"
                              : "bg-blue-600 text-white shadow-xs"
                          }`}
                        >
                          {selectedInThisInd}
                        </span>
                      )}

                      {/* Checkbox to toggle entire industry */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleEntireIndustry(ind);
                        }}
                        className={`w-5 h-5 rounded-md flex items-center justify-center cursor-pointer transition-colors ${
                          isSelected
                            ? isActive
                              ? "bg-white text-blue-600"
                              : "bg-blue-600 text-white"
                            : isActive
                            ? "border-2 border-white/60 text-transparent"
                            : "border-2 border-slate-400 text-transparent hover:border-blue-400 bg-slate-900/80"
                        }`}
                        title="Toggle entire industry"
                      >
                        <FiCheck className="w-3.5 h-3.5 stroke-[3]" />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* ── CENTER AREA: PROJECT CATEGORIES & SUB-CATEGORIES CARDS ──── */}
          <div className="md:col-span-8 lg:col-span-9 overflow-y-auto p-5 sm:p-7 space-y-6 flex flex-col justify-between bg-slate-950">
            {loading ? (
              <div className="py-20 text-center space-y-3">
                <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto" />
                <p className="text-xs text-slate-400 font-semibold">Loading product configurations...</p>
              </div>
            ) : activeIndustry ? (
              <div className="space-y-6">
                {/* Active Industry Banner */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-800">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-2xl bg-blue-950/80 border border-blue-800/80 text-blue-400 flex items-center justify-center text-xl shrink-0 shadow-inner">
                      {getIndustryIcon(activeIndustry.name)}
                    </div>
                    <div>
                      <h3 className="text-base sm:text-lg font-black text-white leading-tight">
                        {activeIndustry.name} – Project Categories & Sub-Categories
                      </h3>
                      <p className="text-xs text-slate-300 mt-0.5 font-medium">
                        Select the project categories and specific sub-types your EPC team undertakes.
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => toggleEntireIndustry(activeIndustry)}
                    className="px-3 py-1.5 rounded-xl text-xs font-black text-blue-400 hover:text-white bg-blue-500/10 hover:bg-blue-600 border border-blue-500/40 transition-all cursor-pointer shrink-0"
                  >
                    {selectedIndustryIds.includes(activeIndustry.id)
                      ? "Deselect All in Industry"
                      : "Select All in Industry"}
                  </button>
                </div>

                {/* Categories & Subcategories List */}
                <div className="space-y-5">
                  {(!activeIndustry.categories || activeIndustry.categories.length === 0) ? (
                    <div className="p-8 text-center text-xs text-slate-400 bg-slate-900 rounded-2xl border border-dashed border-slate-800">
                      No project categories configured under this industry yet.
                    </div>
                  ) : (
                    activeIndustry.categories.map((cat) => {
                      const isCatSelected = selectedCategoryIds.includes(cat.id);
                      const subcats = cat.subcategories || [];
                      const catSubIds = subcats.map((s) => s.id);
                      const allSubSelected =
                        catSubIds.length > 0 &&
                        catSubIds.every((id) => selectedSubcategoryIds.includes(id));
                      const selectedCount = catSubIds.filter((id) =>
                        selectedSubcategoryIds.includes(id)
                      ).length;

                      return (
                        <div
                          key={cat.id}
                          className={`rounded-2xl border-2 transition-all p-5 space-y-4 bg-slate-900 shadow-xl ${
                            isCatSelected || selectedCount > 0
                              ? "border-blue-500 shadow-blue-500/10 ring-1 ring-blue-500/30"
                              : "border-slate-800 hover:border-slate-700"
                          }`}
                        >
                          {/* 3-Tier Hierarchy Indicator */}
                          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-800 border border-slate-700 text-xs font-bold text-slate-200 flex-wrap">
                            <span className="text-blue-400 font-black">Industry: {activeIndustry.name}</span>
                            <span className="text-slate-500 font-black">→</span>
                            <span className="text-amber-400 font-black">Category: {cat.name}</span>
                            <span className="text-slate-500 font-black">→</span>
                            <span className="text-purple-300 font-black">Sub-Categories ({subcats.length})</span>
                          </div>

                          {/* Project Category Header */}
                          <div className="flex items-center justify-between gap-3 pt-1">
                            <div className="flex items-center gap-2.5">
                              <div className="w-8 h-8 rounded-lg bg-blue-950 text-blue-400 border border-blue-800 flex items-center justify-center font-black text-sm">
                                <FiLayers />
                              </div>
                              <div>
                                <h4 className="text-sm sm:text-base font-black text-white leading-tight">
                                  {cat.name}
                                </h4>
                                <span className="text-xs font-semibold text-slate-400">
                                  {subcats.length} Sub-Categories Available
                                </span>
                              </div>
                            </div>

                            <button
                              type="button"
                              onClick={() => toggleAllSubcategoriesInCategory(cat, activeIndustry.id)}
                              className={`text-xs font-bold px-3 py-1.5 rounded-xl border transition-colors cursor-pointer ${
                                allSubSelected || (subcats.length === 0 && isCatSelected)
                                  ? "bg-blue-600 text-white border-blue-500 shadow-sm"
                                  : "bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-600 hover:border-blue-400 hover:text-white"
                              }`}
                            >
                              {allSubSelected ? "Deselect All" : "Select All"}
                            </button>
                          </div>

                          {/* Sub-Category Cards Grid */}
                          {subcats.length > 0 ? (
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pt-1">
                              {subcats.map((sub) => {
                                const isSubSelected = selectedSubcategoryIds.includes(sub.id);
                                return (
                                  <div
                                    key={sub.id}
                                    onClick={() => toggleSubcategory(sub.id, cat.id, activeIndustry.id)}
                                    className={`p-3.5 rounded-xl border-2 transition-all cursor-pointer select-none flex items-center justify-between gap-2.5 shadow-sm ${
                                      isSubSelected
                                        ? "bg-blue-50 border-blue-600 text-blue-700 font-black ring-2 ring-blue-500/30 shadow-md"
                                        : "bg-white hover:bg-blue-50/40 border-slate-200 hover:border-blue-400 text-blue-600 font-extrabold"
                                    }`}
                                  >
                                    <div className="flex items-center gap-2.5 min-w-0">
                                      <span
                                        className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                                          isSubSelected
                                            ? "bg-blue-600 ring-4 ring-blue-500/30"
                                            : "bg-blue-500"
                                        }`}
                                      />
                                      <span className={`text-xs truncate ${isSubSelected ? "font-black text-blue-800" : "font-extrabold text-blue-600"}`}>
                                        {sub.name}
                                      </span>
                                    </div>

                                    <div
                                      className={`w-5 h-5 rounded-md flex items-center justify-center shrink-0 ${
                                        isSubSelected
                                          ? "bg-blue-600 text-white border border-blue-600 shadow-xs"
                                          : "border-2 border-slate-300 bg-white text-transparent hover:border-blue-400"
                                      }`}
                                    >
                                      <FiCheck className="w-3.5 h-3.5 stroke-[3]" />
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          ) : (
                            <p className="text-xs text-slate-400 italic">
                              Direct category with no sub-classifications. Click "Select All" to include this category.
                            </p>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            ) : null}
          </div>
        </div>

        {/* Modal Action Footer (Dark Theme Consistent) */}
        <div className="bg-slate-900 p-4 sm:p-5 border-t border-slate-800 flex items-center justify-between gap-3 shrink-0">
          <button
            type="button"
            onClick={handleSkip}
            disabled={submitting}
            className="px-4 py-2 text-xs font-bold text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl cursor-pointer transition-colors"
          >
            Skip for Now
          </button>

          <div className="flex items-center gap-3">
            <span className="text-xs font-black text-slate-200 bg-slate-800 border border-slate-700 px-3 py-1.5 rounded-xl hidden sm:inline-block">
              {selectedSubcategoryIds.length} Sub-Categories Selected
            </span>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={submitting}
              className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-black text-xs shadow-lg shadow-blue-600/40 transition-transform active:scale-95 cursor-pointer flex items-center gap-2 disabled:opacity-50"
            >
              {submitting ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Saving Preferences...</span>
                </>
              ) : (
                <>
                  <span>Save Business Preferences & Enter Store</span>
                  <FiArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
