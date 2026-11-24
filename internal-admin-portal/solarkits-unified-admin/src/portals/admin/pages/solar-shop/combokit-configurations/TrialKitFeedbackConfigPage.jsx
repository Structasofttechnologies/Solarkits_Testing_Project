import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  FaMapMarkerAlt,
  FaCheckCircle,
  FaSearch,
  FaSlidersH,
  FaBoxes,
  FaLayerGroup,
  FaUndo,
  FaShieldAlt,
  FaClipboardList,
  FaSave,
} from "react-icons/fa";
import { FiRefreshCw, FiEdit3, FiX, FiSettings } from "react-icons/fi";
import { useDispatch } from "react-redux";
import { setAlert } from "@/features/alert.slice";
import {
  getFeedbackConfigStates,
  getFeedbackConfigDistricts,
  saveDistrictFeedbackConfig,
  saveStateDefaultFeedbackConfig,
  resetDistrictFeedbackConfig
} from "../../../api/trialKitsApi";
import Loader from "@/components/Loader";

export default function TrialKitFeedbackConfigPage() {
  const dispatch = useDispatch();

  // States & Districts data
  const [states, setStates] = useState([]);
  const [selectedStateId, setSelectedStateId] = useState("");
  const [currentState, setCurrentState] = useState(null);
  const [stateDefaultConfig, setStateDefaultConfig] = useState(null);
  const [districts, setDistricts] = useState([]);
  const [summary, setSummary] = useState(null);

  // Loading & Error states
  const [loadingStates, setLoadingStates] = useState(true);
  const [loadingDistricts, setLoadingDistricts] = useState(false);
  const [saving, setSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterMode, setFilterMode] = useState("all"); // 'all' | 'custom' | 'loose_only' | 'po_only' | 'both'

  // Modals state
  const [districtModalData, setDistrictModalData] = useState(null);
  const [isStateDefaultModalOpen, setIsStateDefaultModalOpen] = useState(false);

  // Form states for District Edit (Mode selection only)
  const [formMode, setFormMode] = useState("both"); // 'loose_only' | 'po_only' | 'both'
  const [formIsActive, setFormIsActive] = useState(true);

  // Form states for State Default Edit
  const [stateDefMode, setStateDefMode] = useState("both");
  const [stateDefApplyAll, setStateDefApplyAll] = useState(false);

  // 1. Fetch States on Mount
  const fetchStates = useCallback(async () => {
    try {
      setLoadingStates(true);
      const res = await getFeedbackConfigStates();
      if (res?.success && Array.isArray(res.data)) {
        setStates(res.data);
        const gujarat = res.data.find((s) => s.name?.toLowerCase() === "gujarat");
        const defaultState = gujarat || res.data[0];
        if (defaultState) {
          setSelectedStateId(defaultState._id || defaultState.id);
        }
      }
    } catch (err) {
      console.error("Failed to load states:", err);
      dispatch(
        setAlert({
          message: err.response?.data?.message || "Failed to load states.",
          type: "error"
        })
      );
    } finally {
      setLoadingStates(false);
    }
  }, [dispatch]);

  useEffect(() => {
    fetchStates();
  }, [fetchStates]);

  // 2. Fetch Districts whenever selectedStateId changes
  const fetchDistricts = useCallback(async (stateId) => {
    if (!stateId) return;
    try {
      setLoadingDistricts(true);
      const res = await getFeedbackConfigDistricts(stateId);
      if (res?.success && res.data) {
        setCurrentState(res.data.state);
        setStateDefaultConfig(res.data.state_default);
        setDistricts(res.data.districts || []);
        setSummary(res.data.summary);
      }
    } catch (err) {
      console.error("Failed to load districts:", err);
      dispatch(
        setAlert({
          message: err.response?.data?.message || "Failed to load districts for state.",
          type: "error"
        })
      );
    } finally {
      setLoadingDistricts(false);
    }
  }, [dispatch]);

  useEffect(() => {
    if (selectedStateId) {
      fetchDistricts(selectedStateId);
    }
  }, [selectedStateId, fetchDistricts]);

  // Filtered districts
  const filteredDistricts = useMemo(() => {
    return districts.filter((d) => {
      const matchesSearch = d.district_name.toLowerCase().includes(searchQuery.toLowerCase());
      if (!matchesSearch) return false;

      if (filterMode === "custom") return d.is_custom_override;
      if (filterMode === "loose_only") return d.feedback_mode === "loose_only";
      if (filterMode === "po_only") return d.feedback_mode === "po_only";
      if (filterMode === "both") return d.feedback_mode === "both";
      return true;
    });
  }, [districts, searchQuery, filterMode]);

  // Open District Configure Modal
  const openDistrictModal = (district) => {
    setDistrictModalData(district);
    setFormMode(district.feedback_mode || "both");
    setFormIsActive(district.is_active !== false);
  };

  // Open State Default Configure Modal
  const openStateDefaultModal = () => {
    if (!stateDefaultConfig) return;
    setStateDefMode(stateDefaultConfig.feedback_mode || "both");
    setStateDefApplyAll(false);
    setIsStateDefaultModalOpen(true);
  };

  // Save District Config
  const handleSaveDistrictConfig = async () => {
    if (!districtModalData) return;
    try {
      setSaving(true);
      const payload = {
        state_id: selectedStateId,
        state_name: currentState?.name || "",
        district_name: districtModalData.district_name,
        feedback_mode: formMode,
        is_active: formIsActive
      };

      const res = await saveDistrictFeedbackConfig(districtModalData.district_id, payload);
      if (res?.success) {
        dispatch(
          setAlert({
            message: `Mode for ${districtModalData.district_name} set to "${formMode === 'loose_only' ? 'Loose Only' : formMode === 'po_only' ? 'Bulk PO Only' : 'Both Options'}"!`,
            type: "success"
          })
        );
        setDistrictModalData(null);
        fetchDistricts(selectedStateId);
      }
    } catch (err) {
      console.error("Save district error:", err);
      dispatch(
        setAlert({
          message: err.response?.data?.message || "Failed to save district configuration.",
          type: "error"
        })
      );
    } finally {
      setSaving(false);
    }
  };

  // Save State Default Config
  const handleSaveStateDefault = async () => {
    if (!selectedStateId) return;
    try {
      setSaving(true);
      const payload = {
        state_name: currentState?.name || "",
        feedback_mode: stateDefMode,
        is_active: true,
        apply_to_all_districts: stateDefApplyAll
      };

      const res = await saveStateDefaultFeedbackConfig(selectedStateId, payload);
      if (res?.success) {
        dispatch(
          setAlert({
            message: `State default mode for ${currentState?.name} saved!`,
            type: "success"
          })
        );
        setIsStateDefaultModalOpen(false);
        fetchDistricts(selectedStateId);
      }
    } catch (err) {
      console.error("Save state default error:", err);
      dispatch(
        setAlert({
          message: err.response?.data?.message || "Failed to save state default configuration.",
          type: "error"
        })
      );
    } finally {
      setSaving(false);
    }
  };

  // Reset District Config to State Default
  const handleResetDistrict = async (district) => {
    if (!window.confirm(`Reset ${district.district_name} to inherit ${currentState?.name} default policy?`)) {
      return;
    }
    try {
      setSaving(true);
      const res = await resetDistrictFeedbackConfig(district.district_id);
      if (res?.success) {
        dispatch(
          setAlert({
            message: `${district.district_name} reset to state default.`,
            type: "success"
          })
        );
        fetchDistricts(selectedStateId);
      }
    } catch (err) {
      console.error("Reset district error:", err);
      dispatch(
        setAlert({
          message: err.response?.data?.message || "Failed to reset district.",
          type: "error"
        })
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* ── Page Header ── */}
      <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 shadow-xs border border-gray-100 dark:border-slate-700">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs font-semibold text-amber-600 uppercase tracking-wider">
              <span>Solar Shop</span>
              <span>/</span>
              <span>Solar Kit Configurations</span>
              <span>/</span>
              <span>Feedback Settings</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-gray-900 dark:text-white flex items-center gap-2.5">
              <span className="p-2.5 bg-amber-500/10 text-amber-600 rounded-2xl">
                <FaClipboardList className="text-xl" />
              </span>
              <span>Trial Kit Feedback & Intent Configuration</span>
            </h1>
            <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
              Configure state and district-wise purchase intent options (Loose Kits, Bulk PO, or Both) shown to onboarded EPC partners. Batch sizes and quantities come directly from each kit's configuration.
            </p>
          </div>

          <button
            onClick={() => selectedStateId && fetchDistricts(selectedStateId)}
            disabled={loadingDistricts}
            className="self-start sm:self-auto px-4 py-2 bg-gray-50 hover:bg-gray-100 dark:bg-slate-700 dark:hover:bg-slate-600 text-gray-700 dark:text-gray-200 text-xs font-bold rounded-xl border border-gray-200 dark:border-slate-600 transition flex items-center gap-2"
          >
            <FiRefreshCw className={loadingDistricts ? "animate-spin" : ""} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* ── Step 1: State Selector Bar ── */}
      <div className="bg-white dark:bg-slate-800 rounded-3xl p-5 shadow-xs border border-gray-100 dark:border-slate-700">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex-1">
            <label className="text-xs font-black text-gray-700 dark:text-gray-300 uppercase tracking-wider block mb-2 flex items-center gap-1.5">
              <FaMapMarkerAlt className="text-amber-500" />
              Select State to Configure Districts *
            </label>
            <div className="flex items-center gap-3">
              <select
                value={selectedStateId}
                onChange={(e) => setSelectedStateId(e.target.value)}
                disabled={loadingStates}
                className="w-full md:w-80 px-4 py-2.5 bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-2xl text-sm font-bold text-gray-900 dark:text-white focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 transition"
              >
                {loadingStates ? (
                  <option>Loading States...</option>
                ) : (
                  states.map((s) => (
                    <option key={s._id || s.id} value={s._id || s.id}>
                      {s.name} ({s.total_districts || 0} Districts {s.custom_districts_count > 0 ? `• ${s.custom_districts_count} overrides` : ""})
                    </option>
                  ))
                )}
              </select>

              <span className="text-xs text-gray-400 hidden lg:inline">
                All districts under this state are automatically listed below. No manual "Add" button needed.
              </span>
            </div>
          </div>

          {/* Quick Metrics */}
          {summary && (
            <div className="flex flex-wrap items-center gap-2.5 pt-2 md:pt-0">
              <div className="px-3 py-1.5 bg-gray-50 dark:bg-slate-900/50 rounded-xl border border-gray-100 dark:border-slate-700 text-center">
                <span className="text-[10px] font-bold text-gray-400 uppercase block">Total Districts</span>
                <span className="text-sm font-black text-gray-800 dark:text-gray-200">{summary.total_districts}</span>
              </div>
              <div className="px-3 py-1.5 bg-amber-500/10 rounded-xl border border-amber-500/20 text-center">
                <span className="text-[10px] font-bold text-amber-700 dark:text-amber-400 uppercase block">Loose Only</span>
                <span className="text-sm font-black text-amber-600">{summary.loose_only_count}</span>
              </div>
              <div className="px-3 py-1.5 bg-blue-500/10 rounded-xl border border-blue-500/20 text-center">
                <span className="text-[10px] font-bold text-blue-700 dark:text-blue-400 uppercase block">Bulk PO Only</span>
                <span className="text-sm font-black text-blue-600">{summary.po_only_count}</span>
              </div>
              <div className="px-3 py-1.5 bg-emerald-500/10 rounded-xl border border-emerald-500/20 text-center">
                <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 uppercase block">Both Options</span>
                <span className="text-sm font-black text-emerald-600">{summary.both_count}</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── State Default Policy Card (1-Click Bulk Rule) ── */}
      {stateDefaultConfig && currentState && (
        <div className="bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent border border-amber-500/20 rounded-3xl p-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="p-2.5 rounded-2xl bg-amber-500/20 text-amber-600 dark:text-amber-400">
                <FaShieldAlt className="text-lg" />
              </span>
              <div>
                <h3 className="text-sm font-black text-gray-900 dark:text-white flex items-center gap-2">
                  <span>State Default Feedback Policy for {currentState.name}</span>
                  <span className="px-2 py-0.5 text-[10px] font-extrabold uppercase rounded-full bg-amber-500 text-white">
                    State Baseline
                  </span>
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  Districts without custom overrides will automatically inherit this state baseline policy.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="px-3.5 py-1.5 bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 flex items-center gap-2">
                <span className="text-[11px] font-bold text-gray-400 uppercase">State Baseline Mode:</span>
                <span className="text-xs font-black capitalize text-gray-800 dark:text-gray-100 flex items-center gap-1.5">
                  <span className={`w-2 h-2 rounded-full ${stateDefaultConfig.feedback_mode === "loose_only" ? "bg-amber-500" : stateDefaultConfig.feedback_mode === "po_only" ? "bg-blue-500" : "bg-emerald-500"}`} />
                  {stateDefaultConfig.feedback_mode === "loose_only" ? "Loose Kits Only" : stateDefaultConfig.feedback_mode === "po_only" ? "Bulk PO Only" : "Both (Loose & Bulk PO)"}
                </span>
              </div>

              <button
                onClick={openStateDefaultModal}
                className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white text-xs font-black rounded-xl shadow-xs transition flex items-center gap-2 whitespace-nowrap"
              >
                <FiSettings />
                <span>Configure State Default</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Step 2: All Districts List Table (Streamlined) ── */}
      <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-xs border border-gray-100 dark:border-slate-700 overflow-hidden">
        {/* Table Filter & Search Controls */}
        <div className="p-5 border-b border-gray-100 dark:border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="relative flex-1 max-w-md">
            <FaSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 text-xs" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={`Search across ${currentState?.name || "state"} districts (e.g. Ahmedabad, Surat)...`}
              className="w-full pl-9 pr-4 py-2 bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl text-xs font-semibold focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 transition"
            />
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            {[
              { id: "all", label: "All Districts" },
              { id: "custom", label: "Custom Overrides" },
              { id: "loose_only", label: "Loose Only" },
              { id: "po_only", label: "PO Only" },
              { id: "both", label: "Both Options" },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setFilterMode(tab.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                  filterMode === tab.id
                    ? "bg-amber-500 text-white shadow-xs"
                    : "bg-gray-50 dark:bg-slate-900 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-800"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Table Content (Simplified Columns: District Name, Policy Type, Feedback Mode, Active, Actions) */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-gray-50/80 dark:bg-slate-900/60 text-gray-400 font-bold uppercase tracking-wider text-[10px] border-b border-gray-100 dark:border-slate-700">
              <tr>
                <th className="py-3.5 px-4">District Name</th>
                <th className="py-3.5 px-4">Policy Type</th>
                <th className="py-3.5 px-4">Purchase Option Allowed</th>
                <th className="py-3.5 px-4 text-center">Status</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-slate-700">
              {loadingDistricts ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-gray-400">
                    <Loader text={`Loading all districts for ${currentState?.name || "state"}...`} />
                  </td>
                </tr>
              ) : filteredDistricts.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-gray-400">
                    No districts found matching "{searchQuery}" in {currentState?.name}.
                  </td>
                </tr>
              ) : (
                filteredDistricts.map((d) => {
                  const isLooseOnly = d.feedback_mode === "loose_only";
                  const isPoOnly = d.feedback_mode === "po_only";

                  return (
                    <tr
                      key={d.district_id}
                      className="hover:bg-gray-50/70 dark:hover:bg-slate-700/40 transition"
                    >
                      {/* District Name */}
                      <td className="py-3.5 px-4">
                        <div className="font-extrabold text-gray-900 dark:text-white flex items-center gap-2">
                          <span>{d.district_name}</span>
                          {d.pincodes_count > 0 && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-gray-300">
                              {d.pincodes_count} PINs
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] text-gray-400">
                          {currentState?.name} Region
                        </span>
                      </td>

                      {/* Policy Type */}
                      <td className="py-3.5 px-4">
                        {d.is_custom_override ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full font-bold text-[10px] bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                            Custom Override
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full font-bold text-[10px] bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-gray-300">
                            Inherited Default
                          </span>
                        )}
                      </td>

                      {/* Feedback Mode */}
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-xl font-black text-xs ${
                            isLooseOnly
                              ? "bg-amber-500/15 text-amber-800 dark:text-amber-300 border border-amber-500/30"
                              : isPoOnly
                              ? "bg-blue-500/15 text-blue-800 dark:text-blue-300 border border-blue-500/30"
                              : "bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 border border-emerald-500/30"
                          }`}
                        >
                          <span
                            className={`w-2 h-2 rounded-full ${
                              isLooseOnly ? "bg-amber-500" : isPoOnly ? "bg-blue-500" : "bg-emerald-500"
                            }`}
                          />
                          {isLooseOnly ? "Loose Only" : isPoOnly ? "Bulk PO Only" : "Both (Loose & Bulk PO)"}
                        </span>
                      </td>

                      {/* Active Status */}
                      <td className="py-3.5 px-4 text-center">
                        <span
                          className={`w-2.5 h-2.5 inline-block rounded-full ${
                            d.is_active ? "bg-emerald-500" : "bg-red-400"
                          }`}
                          title={d.is_active ? "Active" : "Disabled"}
                        />
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right space-x-1.5 whitespace-nowrap">
                        <button
                          onClick={() => openDistrictModal(d)}
                          className="px-3.5 py-1.5 bg-amber-500/15 hover:bg-amber-500 text-amber-800 hover:text-white dark:text-amber-300 font-black rounded-xl text-xs transition inline-flex items-center gap-1.5"
                        >
                          <FiEdit3 />
                          <span>Configure</span>
                        </button>

                        {d.is_custom_override && (
                          <button
                            onClick={() => handleResetDistrict(d)}
                            title="Reset to State Default"
                            className="px-2.5 py-1.5 bg-gray-100 hover:bg-gray-200 dark:bg-slate-700 text-gray-600 dark:text-gray-300 font-bold rounded-xl text-xs transition"
                          >
                            <FaUndo />
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── STREAMLINED DISTRICT CONFIGURATION MODAL (Mode Selection Only) ── */}
      {districtModalData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-800 rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-gray-100 dark:border-slate-700 space-y-5">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-slate-700">
              <div className="flex items-center gap-2.5">
                <span className="p-2 rounded-xl bg-amber-500/20 text-amber-600">
                  <FaSlidersH />
                </span>
                <div>
                  <h3 className="font-black text-gray-900 dark:text-white text-base">
                    Configure {districtModalData.district_name}
                  </h3>
                  <p className="text-[11px] text-gray-400">{currentState?.name} District Feedback Settings</p>
                </div>
              </div>
              <button
                onClick={() => setDistrictModalData(null)}
                className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-400 hover:text-gray-600"
              >
                <FiX size={18} />
              </button>
            </div>

            {/* Mode Selection */}
            <div>
              <label className="text-xs font-black text-gray-700 dark:text-gray-300 uppercase tracking-wider block mb-2">
                1. Required Purchase Intent Mode for this District *
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <button
                  type="button"
                  onClick={() => setFormMode("loose_only")}
                  className={`p-3.5 rounded-2xl border text-left transition ${
                    formMode === "loose_only"
                      ? "bg-amber-500/15 border-amber-500 text-amber-900 dark:text-amber-200 ring-2 ring-amber-500/30"
                      : "bg-gray-50 dark:bg-slate-900 border-gray-200 dark:border-slate-700 text-gray-700 dark:text-gray-300"
                  }`}
                >
                  <div className="font-extrabold text-xs flex items-center justify-between">
                    <span>Loose Only</span>
                    {formMode === "loose_only" && <FaCheckCircle className="text-amber-500" />}
                  </div>
                  <p className="text-[10px] text-gray-500 mt-1">Collect only Loose Kits feedback (e.g. Ahmedabad)</p>
                </button>

                <button
                  type="button"
                  onClick={() => setFormMode("po_only")}
                  className={`p-3.5 rounded-2xl border text-left transition ${
                    formMode === "po_only"
                      ? "bg-blue-500/15 border-blue-500 text-blue-900 dark:text-blue-200 ring-2 ring-blue-500/30"
                      : "bg-gray-50 dark:bg-slate-900 border-gray-200 dark:border-slate-700 text-gray-700 dark:text-gray-300"
                  }`}
                >
                  <div className="font-extrabold text-xs flex items-center justify-between">
                    <span>Bulk PO Only</span>
                    {formMode === "po_only" && <FaCheckCircle className="text-blue-500" />}
                  </div>
                  <p className="text-[10px] text-gray-500 mt-1">Commercial factory bulk PO volume only</p>
                </button>

                <button
                  type="button"
                  onClick={() => setFormMode("both")}
                  className={`p-3.5 rounded-2xl border text-left transition ${
                    formMode === "both"
                      ? "bg-emerald-500/15 border-emerald-500 text-emerald-900 dark:text-emerald-200 ring-2 ring-emerald-500/30"
                      : "bg-gray-50 dark:bg-slate-900 border-gray-200 dark:border-slate-700 text-gray-700 dark:text-gray-300"
                  }`}
                >
                  <div className="font-extrabold text-xs flex items-center justify-between">
                    <span>Both Options</span>
                    {formMode === "both" && <FaCheckCircle className="text-emerald-500" />}
                  </div>
                  <p className="text-[10px] text-gray-500 mt-1">EPC partner can select Loose or Bulk PO</p>
                </button>
              </div>
            </div>

            {/* Note that batch quantities come from the kit */}
            <div className="p-3 bg-gray-50 dark:bg-slate-900/60 rounded-2xl border border-gray-100 dark:border-slate-700 text-[11px] text-gray-500">
              ℹ️ Batch sizes and order quantities for Loose and PO will automatically be rendered from the selected combo kit's existing configuration.
            </div>

            {/* Active Toggle */}
            <div className="flex items-center justify-between pt-1 border-t border-gray-100 dark:border-slate-700">
              <div>
                <span className="text-xs font-bold text-gray-800 dark:text-gray-200 block">Configuration Active</span>
                <span className="text-[11px] text-gray-400">If disabled, district falls back to state default.</span>
              </div>
              <input
                type="checkbox"
                checked={formIsActive}
                onChange={(e) => setFormIsActive(e.target.checked)}
                className="w-4 h-4 accent-amber-500 rounded cursor-pointer"
              />
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setDistrictModalData(null)}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-slate-700 text-gray-700 dark:text-gray-300 font-bold rounded-xl text-xs transition"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={handleSaveDistrictConfig}
                className="px-5 py-2 bg-amber-500 hover:bg-amber-600 text-white font-black rounded-xl text-xs transition shadow-xs flex items-center gap-2"
              >
                <FaSave />
                <span>{saving ? "Saving..." : "Save Configuration"}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── STREAMLINED STATE DEFAULT MODAL (Mode Selection Only) ── */}
      {isStateDefaultModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-800 rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-gray-100 dark:border-slate-700 space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-slate-700">
              <div className="flex items-center gap-2.5">
                <span className="p-2 rounded-xl bg-amber-500/20 text-amber-600">
                  <FaShieldAlt />
                </span>
                <div>
                  <h3 className="font-black text-gray-900 dark:text-white text-base">
                    Configure State Default: {currentState?.name}
                  </h3>
                  <p className="text-[11px] text-gray-400">Baseline rule inherited by all districts in {currentState?.name}</p>
                </div>
              </div>
              <button
                onClick={() => setIsStateDefaultModalOpen(false)}
                className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-400 hover:text-gray-600"
              >
                <FiX size={18} />
              </button>
            </div>

            {/* Mode Selection */}
            <div>
              <label className="text-xs font-black text-gray-700 dark:text-gray-300 uppercase tracking-wider block mb-2">
                State Default Feedback Mode *
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <button
                  type="button"
                  onClick={() => setStateDefMode("loose_only")}
                  className={`p-3.5 rounded-2xl border text-left transition ${
                    stateDefMode === "loose_only"
                      ? "bg-amber-500/15 border-amber-500 text-amber-900 dark:text-amber-200 ring-2 ring-amber-500/30"
                      : "bg-gray-50 dark:bg-slate-900 border-gray-200 dark:border-slate-700 text-gray-700 dark:text-gray-300"
                  }`}
                >
                  <div className="font-extrabold text-xs flex items-center justify-between">
                    <span>Loose Only</span>
                    {stateDefMode === "loose_only" && <FaCheckCircle className="text-amber-500" />}
                  </div>
                  <p className="text-[10px] text-gray-500 mt-1">Statewide Loose Kits feedback only</p>
                </button>

                <button
                  type="button"
                  onClick={() => setStateDefMode("po_only")}
                  className={`p-3.5 rounded-2xl border text-left transition ${
                    stateDefMode === "po_only"
                      ? "bg-blue-500/15 border-blue-500 text-blue-900 dark:text-blue-200 ring-2 ring-blue-500/30"
                      : "bg-gray-50 dark:bg-slate-900 border-gray-200 dark:border-slate-700 text-gray-700 dark:text-gray-300"
                  }`}
                >
                  <div className="font-extrabold text-xs flex items-center justify-between">
                    <span>Bulk PO Only</span>
                    {stateDefMode === "po_only" && <FaCheckCircle className="text-blue-500" />}
                  </div>
                  <p className="text-[10px] text-gray-500 mt-1">Commercial factory bulk PO volume</p>
                </button>

                <button
                  type="button"
                  onClick={() => setStateDefMode("both")}
                  className={`p-3.5 rounded-2xl border text-left transition ${
                    stateDefMode === "both"
                      ? "bg-emerald-500/15 border-emerald-500 text-emerald-900 dark:text-emerald-200 ring-2 ring-emerald-500/30"
                      : "bg-gray-50 dark:bg-slate-900 border-gray-200 dark:border-slate-700 text-gray-700 dark:text-gray-300"
                  }`}
                >
                  <div className="font-extrabold text-xs flex items-center justify-between">
                    <span>Both Options</span>
                    {stateDefMode === "both" && <FaCheckCircle className="text-emerald-500" />}
                  </div>
                  <p className="text-[10px] text-gray-500 mt-1">Both options available for EPC partner</p>
                </button>
              </div>
            </div>

            {/* 1-Click Apply to All Districts Option */}
            <div className="p-4 bg-gray-50 dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-slate-700 flex items-start gap-3">
              <input
                type="checkbox"
                id="applyAllCheck"
                checked={stateDefApplyAll}
                onChange={(e) => setStateDefApplyAll(e.target.checked)}
                className="w-4 h-4 mt-0.5 accent-amber-500 rounded cursor-pointer"
              />
              <label htmlFor="applyAllCheck" className="text-xs text-gray-700 dark:text-gray-300 cursor-pointer">
                <span className="font-bold block">Apply to ALL districts in {currentState?.name}</span>
                <span className="text-[11px] text-gray-500">
                  This will reset all existing custom district overrides in this state so all districts follow this baseline policy.
                </span>
              </label>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setIsStateDefaultModalOpen(false)}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-slate-700 text-gray-700 dark:text-gray-300 font-bold rounded-xl text-xs transition"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={handleSaveStateDefault}
                className="px-5 py-2 bg-amber-500 hover:bg-amber-600 text-white font-black rounded-xl text-xs transition shadow-xs flex items-center gap-2"
              >
                <FaSave />
                <span>{saving ? "Saving..." : "Save State Policy"}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
