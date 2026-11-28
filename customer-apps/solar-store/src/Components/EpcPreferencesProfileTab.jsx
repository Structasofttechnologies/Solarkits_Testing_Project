import React, { useState, useEffect } from "react";
import axiosInstance from "@/utils/axiosInstance";
import { useSelector, useDispatch } from "react-redux";
import {
  FiZap,
  FiCheck,
  FiCheckCircle,
  FiMail,
  FiMessageSquare,
  FiSave,
  FiLayers,
  FiInfo,
  FiSun,
  FiTag
} from "react-icons/fi";
import {
  FaSolarPanel,
  FaIndustry,
  FaChargingStation,
  FaLeaf,
  FaLightbulb
} from "react-icons/fa";
import { setAlert } from "@/features/alert.slice";

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

export default function EpcPreferencesProfileTab() {
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth_slice);
  const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [industriesData, setIndustriesData] = useState([]);

  // Selections
  const [selectedIndustryIds, setSelectedIndustryIds] = useState([]);
  const [selectedCategoryIds, setSelectedCategoryIds] = useState([]);
  const [selectedSubcategoryIds, setSelectedSubcategoryIds] = useState([]);
  const [selectedKitIds, setSelectedKitIds] = useState([]);
  const [emailConsent, setEmailConsent] = useState(false);
  const [whatsappConsent, setWhatsappConsent] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);

  // Active industry viewed in the tab
  const [activeIndustryId, setActiveIndustryId] = useState(null);

  const epcId = user?._id || user?.account_id || user?.id;

  // Load Config and Saved Preferences
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);

        const [configRes, prefRes] = await Promise.all([
          axiosInstance.get(`${API_URL}/india/v1/epc/preferences/config-options`, { withCredentials: true }),
          axiosInstance.get(`${API_URL}/india/v1/epc/preferences/my-preferences?epc_id=${epcId}`, { withCredentials: true })
        ]);

        if (configRes.data?.status === "success" && Array.isArray(configRes.data.data?.industries)) {
          const industries = configRes.data.data.industries;
          setIndustriesData(industries);
          if (industries.length > 0 && !activeIndustryId) {
            setActiveIndustryId(industries[0].id);
          }
        }

        if (prefRes.data?.status === "success" && prefRes.data.data) {
          const pref = prefRes.data.data?.preferences || prefRes.data.data;
          setSelectedIndustryIds(pref.selected_industry_ids || []);
          setSelectedCategoryIds(pref.selected_category_ids || []);
          setSelectedSubcategoryIds(pref.selected_subcategory_ids || []);
          setSelectedKitIds(pref.selected_kit_ids || []);
          setEmailConsent(Boolean(pref.email_marketing_consent));
          setWhatsappConsent(Boolean(pref.whatsapp_marketing_consent));
          if (pref.updated_at || pref.created_at) {
            setLastUpdated(new Date(pref.updated_at || pref.created_at).toLocaleDateString("en-IN", {
              day: "numeric",
              month: "short",
              year: "numeric",
              hour: "2-digit",
              minute: "2-digit"
            }));
          }
        }
      } catch (err) {
        console.error("Failed to load preferences:", err);
        dispatch(
          setAlert({
            type: "error",
            message: "Failed to load solar business preferences."
          })
        );
      } finally {
        setLoading(false);
      }
    };

    if (epcId) {
      fetchData();
    }
  }, [epcId, API_URL, dispatch]);

  const toggleSubcategory = (subId, catId, indId) => {
    setSelectedSubcategoryIds((prev) => {
      const exists = prev.includes(subId);
      const newSubIds = exists ? prev.filter((id) => id !== subId) : [...prev, subId];

      if (!exists) {
        setSelectedCategoryIds((cPrev) => (cPrev.includes(catId) ? cPrev : [...cPrev, catId]));
        setSelectedIndustryIds((iPrev) => (iPrev.includes(indId) ? iPrev : [...iPrev, indId]));
      }
      return newSubIds;
    });
  };

  const toggleAllSubcategoriesInCategory = (category, indId) => {
    const subIds = (category.subcategories || []).map((s) => s.id);
    if (subIds.length === 0) {
      setSelectedCategoryIds((prev) =>
        prev.includes(category.id) ? prev.filter((id) => id !== category.id) : [...prev, category.id]
      );
      setSelectedIndustryIds((prev) => (prev.includes(indId) ? prev : [...prev, indId]));
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

  const toggleEntireIndustry = (ind) => {
    const indId = ind.id;
    const isIndSelected = selectedIndustryIds.includes(indId);
    const allCatIds = (ind.categories || []).map((c) => c.id);
    const allSubIds = (ind.categories || []).flatMap((c) => (c.subcategories || []).map((s) => s.id));

    if (isIndSelected) {
      setSelectedIndustryIds((prev) => prev.filter((id) => id !== indId));
      setSelectedCategoryIds((prev) => prev.filter((id) => !allCatIds.includes(id)));
      setSelectedSubcategoryIds((prev) => prev.filter((id) => !allSubIds.includes(id)));
    } else {
      setSelectedIndustryIds((prev) => [...prev, indId]);
      setSelectedCategoryIds((prev) => Array.from(new Set([...prev, ...allCatIds])));
      setSelectedSubcategoryIds((prev) => Array.from(new Set([...prev, ...allSubIds])));
    }
  };

  const handleSavePreferences = async () => {
    try {
      setSaving(true);
      const res = await axiosInstance.post(
        `${API_URL}/india/v1/epc/preferences/submit`,
        {
          epc_id: epcId,
          selected_industry_ids: selectedIndustryIds,
          selected_category_ids: selectedCategoryIds,
          selected_subcategory_ids: selectedSubcategoryIds,
          selected_kit_ids: selectedKitIds,
          email_marketing_consent: emailConsent,
          whatsapp_marketing_consent: whatsappConsent,
          consent_source: "epc_profile_page"
        },
        { withCredentials: true }
      );

      if (res.data?.status === "success") {
        dispatch(
          setAlert({
            type: "success",
            message: "Solar business industry & project preferences saved successfully!"
          })
        );
        setLastUpdated(new Date().toLocaleDateString("en-IN", {
          day: "numeric",
          month: "short",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit"
        }));
      }
    } catch (err) {
      console.error("Save preferences error:", err);
      dispatch(
        setAlert({
          type: "error",
          message: err.response?.data?.message || "Failed to save preferences."
        })
      );
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-surface rounded-2xl border border-border p-12 flex flex-col items-center justify-center gap-3">
        <div className="w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin" />
        <p className="text-sm font-bold text-text-secondary">Loading your solar business preferences...</p>
      </div>
    );
  }

  const activeIndustry = industriesData.find((ind) => ind.id === activeIndustryId) || industriesData[0];

  return (
    <div className="space-y-6">
      {/* ── HEADER CARD ────────────────────────────────────────── */}
      <div className="bg-surface p-6 rounded-2xl border border-border shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-black">
              <FiZap className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-black text-text-primary">
                Solar Business Verticals & Project Sub-Categories
              </h2>
              <p className="text-xs text-text-secondary mt-0.5">
                Configure the industry sectors, project categories, and target installation types you serve. SOLARKITS tailors product allocations and promotional offers to your business.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 self-end md:self-center">
          {lastUpdated && (
            <span className="text-[11px] font-semibold text-text-muted hidden sm:inline-block">
              Updated: {lastUpdated}
            </span>
          )}
          <button
            type="button"
            onClick={handleSavePreferences}
            disabled={saving}
            className="bg-gradient-to-r from-primary to-primary-end hover:from-primary-600 hover:to-primary text-white font-bold text-xs py-2.5 px-5 rounded-xl shadow-md shadow-primary/25 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {saving ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Saving...</span>
              </>
            ) : (
              <>
                <FiSave className="w-4 h-4" />
                <span>Save Preferences</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* ── SECTION: INDUSTRY VERTICALS SWITCHER ─────────────── */}
      <div className="bg-surface p-5 rounded-2xl border border-border shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-black text-text-primary uppercase tracking-wider flex items-center gap-2">
            <span className="w-5 h-5 rounded-md bg-blue-500 text-white flex items-center justify-center text-xs">1</span>
            Select Industry Verticals
          </h3>
          <span className="text-xs font-black px-2.5 py-1 rounded-full bg-primary/10 text-primary">
            {selectedIndustryIds.length} Industries • {selectedSubcategoryIds.length} Sub-Categories Selected
          </span>
        </div>

        {/* Industry Switcher Buttons */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2.5 pt-1">
          {industriesData.map((ind) => {
            const isActive = activeIndustry?.id === ind.id;
            const isSelected = selectedIndustryIds.includes(ind.id);
            const indSubIds = (ind.categories || []).flatMap((c) =>
              (c.subcategories || []).map((s) => s.id)
            );
            const count = indSubIds.filter((id) => selectedSubcategoryIds.includes(id)).length;

            return (
              <button
                key={ind.id}
                type="button"
                onClick={() => setActiveIndustryId(ind.id)}
                className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                  isActive
                    ? "border-primary bg-primary text-white shadow-sm shadow-primary/20"
                    : isSelected
                    ? "border-primary/50 bg-primary/5 dark:bg-primary/10 text-text-primary"
                    : "border-border hover:border-border/80 bg-surface text-text-secondary"
                }`}
              >
                <div className="flex items-center justify-between w-full mb-1">
                  <span className="text-lg">{getIndustryIcon(ind.name)}</span>
                  {count > 0 && (
                    <span
                      className={`text-[10px] font-black px-1.5 py-0.2 rounded ${
                        isActive ? "bg-white text-primary" : "bg-primary text-white"
                      }`}
                    >
                      {count}
                    </span>
                  )}
                </div>
                <span className="text-xs font-black truncate w-full">{ind.name}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── SECTION: PROJECT CATEGORIES & SUB-CATEGORIES FOR ACTIVE INDUSTRY ── */}
      {activeIndustry && (
        <div className="bg-surface p-6 rounded-2xl border border-border shadow-xs space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-black">
                {getIndustryIcon(activeIndustry.name)}
              </div>
              <div>
                <h3 className="text-sm font-black text-text-primary">
                  {activeIndustry.name} – Project Categories & Focus Areas
                </h3>
                <p className="text-xs text-text-secondary">
                  Choose specific sub-categories and client segments you provide solar installation services for.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => toggleEntireIndustry(activeIndustry)}
              className="text-xs font-bold text-primary hover:underline cursor-pointer"
            >
              {selectedIndustryIds.includes(activeIndustry.id)
                ? "Deselect All in This Industry"
                : "Select All in This Industry"}
            </button>
          </div>

          <div className="space-y-4">
            {(!activeIndustry.categories || activeIndustry.categories.length === 0) ? (
              <div className="p-8 text-center text-xs text-text-muted italic">
                No categories configured under this industry yet.
              </div>
            ) : (
              activeIndustry.categories.map((cat) => {
                const subcats = cat.subcategories || [];
                const catSubIds = subcats.map((s) => s.id);
                const allSelected =
                  catSubIds.length > 0 && catSubIds.every((id) => selectedSubcategoryIds.includes(id));
                const isCatSelected = selectedCategoryIds.includes(cat.id);

                return (
                  <div
                    key={cat.id}
                    className="p-4 rounded-xl border border-border/80 bg-surface-hover/20 space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <FiLayers className="text-primary w-4 h-4" />
                        <h4 className="text-xs font-black text-text-primary">{cat.name}</h4>
                        <span className="text-[10px] text-text-muted">
                          ({subcats.length} Sub-Categories)
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={() => toggleAllSubcategoriesInCategory(cat, activeIndustry.id)}
                        className="text-[11px] font-bold text-primary hover:underline cursor-pointer"
                      >
                        {allSelected || (subcats.length === 0 && isCatSelected)
                          ? "Deselect All"
                          : "Select All"}
                      </button>
                    </div>

                    {subcats.length > 0 ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5">
                        {subcats.map((sub) => {
                          const isSubSelected = selectedSubcategoryIds.includes(sub.id);
                          return (
                            <div
                              key={sub.id}
                              onClick={() => toggleSubcategory(sub.id, cat.id, activeIndustry.id)}
                              className={`p-2.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-2 ${
                                isSubSelected
                                  ? "border-primary bg-primary/10 text-primary font-bold shadow-xs"
                                  : "border-border hover:border-border/80 bg-surface text-text-secondary"
                              }`}
                            >
                              <div className="flex items-center gap-2 min-w-0">
                                <span
                                  className={`w-2 h-2 rounded-full shrink-0 ${
                                    isSubSelected ? "bg-primary" : "bg-border"
                                  }`}
                                />
                                <span className="text-xs truncate">{sub.name}</span>
                              </div>
                              <div
                                className={`w-4 h-4 rounded flex items-center justify-center shrink-0 ${
                                  isSubSelected
                                    ? "bg-primary text-white"
                                    : "border border-border text-transparent"
                                }`}
                              >
                                <FiCheck className="w-3 h-3 stroke-[3]" />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="text-[11px] text-text-muted italic py-1">
                        Direct category. Click "Select All" to include.
                      </p>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* ── SECTION: MARKETING COMMUNICATION CONSENTS ─────────── */}
      <div className="bg-surface p-6 rounded-2xl border border-border shadow-xs space-y-4">
        <div>
          <h3 className="text-xs font-black text-text-primary uppercase tracking-wider flex items-center gap-2">
            <span className="w-5 h-5 rounded-md bg-emerald-500 text-white flex items-center justify-center text-xs">2</span>
            Marketing Communication Preferences
          </h3>
          <p className="text-xs text-text-secondary mt-1">
            Choose separately how SOLARKITS may contact you about kit discounts, exclusive wholesale prices, product updates, and promotional campaigns.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
          <label
            className={`p-4 rounded-xl border-2 flex items-start gap-3.5 cursor-pointer transition-all ${
              emailConsent
                ? "border-emerald-500 bg-emerald-500/5 dark:bg-emerald-500/10"
                : "border-border hover:border-border/80 bg-surface-hover/30"
            }`}
          >
            <input
              type="checkbox"
              checked={emailConsent}
              onChange={(e) => setEmailConsent(e.target.checked)}
              className="mt-1 w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer"
            />
            <div className="space-y-1">
              <span className="text-xs font-black text-text-primary flex items-center gap-1.5">
                <FiMail className="text-emerald-500" />
                Promotional Email Notifications
              </span>
              <p className="text-[11px] text-text-secondary leading-relaxed">
                Receive promotional emails from SOLARKITS about relevant solar kits, special discounts, product updates, and marketing campaigns.
              </p>
            </div>
          </label>

          <label
            className={`p-4 rounded-xl border-2 flex items-start gap-3.5 cursor-pointer transition-all ${
              whatsappConsent
                ? "border-emerald-500 bg-emerald-500/5 dark:bg-emerald-500/10"
                : "border-border hover:border-border/80 bg-surface-hover/30"
            }`}
          >
            <input
              type="checkbox"
              checked={whatsappConsent}
              onChange={(e) => setWhatsappConsent(e.target.checked)}
              className="mt-1 w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer"
            />
            <div className="space-y-1">
              <span className="text-xs font-black text-text-primary flex items-center gap-1.5">
                <FiMessageSquare className="text-emerald-500" />
                Promotional WhatsApp Broadcasts
              </span>
              <p className="text-[11px] text-text-secondary leading-relaxed">
                Receive promotional WhatsApp messages from SOLARKITS about relevant solar kits, special discounts, product updates, and marketing campaigns.
              </p>
            </div>
          </label>
        </div>

        <div className="bg-surface-hover/60 p-3.5 rounded-xl border border-border/80 text-[11px] text-text-muted flex items-start gap-2">
          <FiInfo className="w-4 h-4 text-primary shrink-0 mt-0.5" />
          <p>
            You can change your preferences or withdraw consent at any time. Consent is optional and is not required to purchase from SOLARKITS.
          </p>
        </div>
      </div>

      {/* ── BOTTOM ACTION BAR ──────────────────────────────────── */}
      <div className="flex justify-end pt-2">
        <button
          type="button"
          onClick={handleSavePreferences}
          disabled={saving}
          className="bg-gradient-to-r from-primary to-primary-end hover:from-primary-600 hover:to-primary text-white font-black text-sm py-3 px-8 rounded-xl shadow-lg shadow-primary/25 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
        >
          {saving ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              <span>Saving Preferences...</span>
            </>
          ) : (
            <>
              <FiCheckCircle className="w-4 h-4" />
              <span>Save & Update Preferences</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
