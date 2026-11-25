import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  FiMapPin,
  FiSearch,
  FiCheckCircle,
  FiAlertTriangle,
  FiXCircle,
  FiArrowRight,
  FiClock,
  FiShield,
  FiUserCheck,
  FiX,
  FiCheck,
  FiInfo,
  FiLayers,
  FiPhoneCall,
} from "react-icons/fi";
import {
  INDIAN_STATES_DISTRICTS,
  checkTerritoryAvailability as fallbackCheckTerritoryAvailability,
} from "../../data/territoryData";
import api from "../../services/api";

export default function StoreAvailabilityChecker({ onOpenLeadModal, storeAvailabilityConfig }) {
  const [selectedState, setSelectedState] = useState("Maharashtra");
  const [selectedDistrict, setSelectedDistrict] = useState("Pune");
  const [pincode, setPincode] = useState("");
  const [result, setResult] = useState(null);
  const [checking, setChecking] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const badgeText = storeAvailabilityConfig?.badge_text || "Live Territory Availability Checker";
  const heading = storeAvailabilityConfig?.heading || "Check Franchise Availability in Your District or Pincode";
  const subtitle = storeAvailabilityConfig?.subtitle || "We grant protected territorial dealership rights per revenue district. Check your area status to secure exclusive regional wholesale distribution.";

  // Sync districts when state changes
  useEffect(() => {
    if (selectedState && INDIAN_STATES_DISTRICTS[selectedState]) {
      setSelectedDistrict(INDIAN_STATES_DISTRICTS[selectedState][0] || "");
    }
  }, [selectedState]);

  const handleCheck = async (e) => {
    if (e) e.preventDefault();
    if (!selectedState) return;

    setChecking(true);
    setResult(null);

    try {
      const response = await api.get("/india/v1/reseller/territory/availability", {
        params: {
          state: selectedState,
          district: selectedDistrict,
          pincode: pincode.trim() || undefined,
        },
      });

      if (response.data && response.data.status === "success" && response.data.data) {
        setResult(response.data.data);
        setIsModalOpen(true);
      } else {
        throw new Error("Invalid response format");
      }
    } catch (err) {
      console.warn("[StoreAvailabilityChecker] Backend API fallback to local dataset:", err?.message);
      // Seamless Fallback to local logic if backend server is unreachable
      const fallbackRes = fallbackCheckTerritoryAvailability(selectedState, selectedDistrict, pincode);
      setResult(fallbackRes);
      setIsModalOpen(true);
    } finally {
      setChecking(false);
    }
  };

  const handleApplyFromModal = () => {
    setIsModalOpen(false);
    if (onOpenLeadModal && result) {
      const isWaitlist = result.status === "ALLOCATED" || result.is_available === false;
      onOpenLeadModal(
        {
          state: result.state || selectedState,
          district: result.district || selectedDistrict,
          pincode: result.pincode || pincode,
          requiredConfig: isWaitlist
            ? `Priority Waitlist / Adjacent Area Request for ${result.district || selectedDistrict}, ${result.state || selectedState}`
            : `Franchise Application for ${result.district || selectedDistrict}, ${result.state || selectedState}`,
        },
        isWaitlist ? "territory_review" : "franchise_apply"
      );
    }
  };

  return (
    <section id="store-availability" className="py-16 sm:py-24 bg-slate-50 text-slate-900 border-t border-slate-200/80 relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto space-y-3 sm:space-y-4">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white border border-slate-200 shadow-xs">
            <FiMapPin className="text-[#253880]" size={14} />
            <span className="text-[10px] sm:text-xs font-black uppercase tracking-wider text-[#253880]">
              {badgeText}
            </span>
          </div>

          <h2 className="text-2xl sm:text-4xl font-black text-slate-900 tracking-tight">
            {heading}
          </h2>

          <p className="text-xs sm:text-base text-slate-600 font-normal max-w-2xl mx-auto leading-relaxed">
            {subtitle}
          </p>
        </div>

        {/* Checker Card Container */}
        <div className="max-w-4xl mx-auto mt-10 sm:mt-14">
          <div className="rounded-3xl bg-white border border-slate-200 shadow-xl p-6 sm:p-10 space-y-6">
            
            {/* Input Form */}
            <form onSubmit={handleCheck} className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4 items-end">
              
              {/* State Dropdown */}
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1.5">
                  Select State
                </label>
                <select
                  value={selectedState}
                  onChange={(e) => setSelectedState(e.target.value)}
                  className="w-full px-3.5 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 focus:bg-white focus:outline-none focus:border-[#253880] shadow-xs cursor-pointer font-medium"
                >
                  {Object.keys(INDIAN_STATES_DISTRICTS).map((st) => (
                    <option key={st} value={st}>
                      {st}
                    </option>
                  ))}
                </select>
              </div>

              {/* District Dropdown */}
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1.5">
                  Select District
                </label>
                <select
                  value={selectedDistrict}
                  onChange={(e) => setSelectedDistrict(e.target.value)}
                  className="w-full px-3.5 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 focus:bg-white focus:outline-none focus:border-[#253880] shadow-xs cursor-pointer font-medium"
                >
                  {(INDIAN_STATES_DISTRICTS[selectedState] || []).map((dist) => (
                    <option key={dist} value={dist}>
                      {dist}
                    </option>
                  ))}
                </select>
              </div>

              {/* Pincode (Optional / Exact) */}
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1.5">
                  Pincode (Optional)
                </label>
                <input
                  type="text"
                  maxLength={6}
                  value={pincode}
                  onChange={(e) => setPincode(e.target.value.replace(/\D/g, ""))}
                  placeholder="e.g. 411001"
                  className="w-full px-3.5 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 focus:bg-white focus:outline-none focus:border-[#253880] shadow-xs font-medium"
                />
              </div>

              {/* Action Button */}
              <div>
                <button
                  type="submit"
                  disabled={checking}
                  className="w-full py-3.5 px-5 rounded-xl bg-gradient-to-r from-[#253880] to-[#1d2c66] hover:from-[#1d2c66] hover:to-[#253880] text-white font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-md shadow-blue-500/20 transition-all cursor-pointer disabled:opacity-75"
                >
                  {checking ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <FiSearch size={14} />
                  )}
                  <span>{checking ? "Verifying..." : "Check Availability"}</span>
                </button>
              </div>
            </form>

            {/* Results Display Box on Page */}
            <AnimatePresence>
              {result && (
                <motion.div
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 15 }}
                  className="pt-4 border-t border-slate-100"
                >
                  {/* Status 1: AVAILABLE */}
                  {(result.status === "AVAILABLE" || (result.is_available && result.status !== "LIMITED")) && (
                    <div className="p-5 sm:p-6 rounded-2xl bg-emerald-50 border border-emerald-200 space-y-4">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="flex items-start gap-3">
                          <div className="h-10 w-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                            <FiCheckCircle size={20} />
                          </div>
                          <div>
                            <span className="px-2.5 py-0.5 rounded-full bg-emerald-200/80 text-emerald-900 text-[10px] font-black uppercase tracking-wider">
                              TERRITORY STATUS: 100% AVAILABLE
                            </span>
                            <h3 className="text-base sm:text-lg font-black text-slate-900 mt-1">
                              Franchise Opportunity is Available in {result.district}, {result.state}
                            </h3>
                            <p className="text-xs text-slate-600 mt-0.5">
                              {result.notes || "Exclusive wholesale & dealership authorization license is open."} Hub: <strong>{result.hub || `Regional ${result.state} Hub`}</strong>.
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            onClick={() => setIsModalOpen(true)}
                            className="px-3.5 py-2.5 rounded-xl border border-emerald-300 text-emerald-800 bg-white hover:bg-emerald-100/50 font-bold text-xs transition-all cursor-pointer"
                          >
                            View Details
                          </button>
                          <button
                            onClick={() => onOpenLeadModal({
                              state: result.state,
                              district: result.district,
                              pincode: result.pincode,
                              requiredConfig: `Franchise Application for ${result.district}`,
                            }, "franchise_apply")}
                            className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-md shadow-emerald-600/20 cursor-pointer"
                          >
                            <span>Apply Now →</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Status 2: LIMITED / UNDER REVIEW */}
                  {result.status === "LIMITED" && (
                    <div className="p-5 sm:p-6 rounded-2xl bg-amber-50 border border-amber-200 space-y-4">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="flex items-start gap-3">
                          <div className="h-10 w-10 rounded-xl bg-[#F49222] text-white flex items-center justify-center shrink-0 shadow-xs">
                            <FiAlertTriangle size={20} />
                          </div>
                          <div>
                            <span className="px-2.5 py-0.5 rounded-full bg-amber-200 text-amber-900 text-[10px] font-black uppercase tracking-wider">
                              TERRITORY STATUS: LIMITED / FAST-TRACK REVIEW
                            </span>
                            <h3 className="text-base sm:text-lg font-black text-slate-900 mt-1">
                              High Demand in {result.district}, {result.state} (1 Slot Remaining)
                            </h3>
                            <p className="text-xs text-slate-600 mt-0.5">
                              {result.notes || "Submissions undergo fast-track director evaluation within 48 hours."}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            onClick={() => setIsModalOpen(true)}
                            className="px-3.5 py-2.5 rounded-xl border border-amber-300 text-amber-900 bg-white hover:bg-amber-100/50 font-bold text-xs transition-all cursor-pointer"
                          >
                            View Details
                          </button>
                          <button
                            onClick={() => onOpenLeadModal({
                              state: result.state,
                              district: result.district,
                              pincode: result.pincode,
                              requiredConfig: `Territory Review for ${result.district}`,
                            }, "territory_review")}
                            className="px-5 py-2.5 rounded-xl bg-[#F49222] hover:bg-[#D97E15] text-white font-black text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-md shadow-amber-500/20 cursor-pointer"
                          >
                            <span>Request Review →</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Status 3: ALLOCATED */}
                  {(result.status === "ALLOCATED" || result.is_available === false) && (
                    <div className="p-5 sm:p-6 rounded-2xl bg-slate-100 border border-slate-200 space-y-4">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="flex items-start gap-3">
                          <div className="h-10 w-10 rounded-xl bg-slate-700 text-white flex items-center justify-center shrink-0 shadow-xs">
                            <FiClock size={20} />
                          </div>
                          <div>
                            <span className="px-2.5 py-0.5 rounded-full bg-slate-200 text-slate-800 text-[10px] font-black uppercase tracking-wider">
                              TERRITORY STATUS: CURRENTLY ASSIGNED
                            </span>
                            <h3 className="text-base sm:text-lg font-black text-slate-900 mt-1">
                              This territory is currently assigned to authorized partners
                            </h3>
                            <p className="text-xs text-slate-600 mt-0.5">
                              {result.district} is at active capacity. Join our Priority Waitlist or request adjacent territory expansion.
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            onClick={() => setIsModalOpen(true)}
                            className="px-3.5 py-2.5 rounded-xl border border-slate-300 text-slate-700 bg-white hover:bg-slate-200/60 font-bold text-xs transition-all cursor-pointer"
                          >
                            View Details
                          </button>
                          <button
                            onClick={() => onOpenLeadModal({
                              state: result.state,
                              district: result.district,
                              pincode: result.pincode,
                              requiredConfig: `Waitlist Request for ${result.district}`,
                            }, "territory_review")}
                            className="px-5 py-2.5 rounded-xl bg-[#253880] hover:bg-[#1d2c66] text-white font-black text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-md shadow-blue-500/20 cursor-pointer"
                          >
                            <span>Join Priority Waitlist →</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>

          </div>
        </div>

      </div>

      {/* ─────────────────────────────────────────────────────────────────────────────
          INTERACTIVE AVAILABILITY RESULT POPUP MODAL (AVAILABLE & UNAVAILABLE)
          ───────────────────────────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {isModalOpen && result && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.92, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.92, y: 20 }}
              className="bg-white rounded-3xl shadow-2xl border border-slate-100 max-w-xl w-full overflow-hidden relative"
            >
              {/* Close Button */}
              <button
                onClick={() => setIsModalOpen(false)}
                className="absolute top-4 right-4 z-10 w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition-colors cursor-pointer"
              >
                <FiX size={18} />
              </button>

              {/* ── CASE 1: TERRITORY IS AVAILABLE ───────────────────────────── */}
              {(result.status === "AVAILABLE" || (result.is_available && result.status !== "LIMITED")) && (
                <div>
                  {/* Modal Header */}
                  <div className="p-6 sm:p-8 bg-gradient-to-br from-emerald-600 to-teal-700 text-white relative overflow-hidden">
                    <div className="absolute right-0 bottom-0 translate-x-4 translate-y-4 opacity-15 pointer-events-none">
                      <FiCheckCircle size={160} />
                    </div>
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 backdrop-blur-xs text-white text-[10px] font-black uppercase tracking-wider mb-3">
                      <FiCheck size={12} className="stroke-[3]" />
                      Territory Available for Franchise
                    </div>
                    <h3 className="text-xl sm:text-2xl font-black tracking-tight">
                      🎉 Great News! {result.district || selectedDistrict} is Open
                    </h3>
                    <p className="text-xs sm:text-sm text-emerald-100 mt-1 font-medium">
                      Exclusive District Dealership License is available in {result.state || selectedState}.
                    </p>
                  </div>

                  {/* Modal Body */}
                  <div className="p-6 sm:p-8 space-y-6">
                    {/* Location Summary Pill */}
                    <div className="p-4 rounded-2xl bg-emerald-50/80 border border-emerald-200/80 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-black">
                          <FiMapPin size={20} />
                        </div>
                        <div>
                          <div className="text-xs text-emerald-800 font-bold uppercase tracking-wider">Requested Area</div>
                          <div className="text-base font-black text-slate-900">
                            {result.district || selectedDistrict}, {result.state || selectedState} {result.pincode ? `(${result.pincode})` : ""}
                          </div>
                        </div>
                      </div>
                      <span className="px-3 py-1 rounded-full bg-emerald-200 text-emerald-900 text-xs font-black">
                        100% Free
                      </span>
                    </div>

                    {/* Highlights List */}
                    <div className="space-y-2.5">
                      <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                        Included Dealership Privileges:
                      </div>
                      <div className="grid grid-cols-1 gap-2.5 text-xs text-slate-700">
                        <div className="flex items-start gap-2.5 p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                          <div className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 mt-0.5 font-bold">✓</div>
                          <div><strong>Exclusive 1-License Protection:</strong> No other franchise partner will be authorized in your assigned territory.</div>
                        </div>
                        <div className="flex items-start gap-2.5 p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                          <div className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 mt-0.5 font-bold">✓</div>
                          <div><strong>Factory-Direct Wholesale Pricing:</strong> High-margin Solar BOS Combo Kits delivered directly from {result.hub || `Regional ${result.state} Hub`}.</div>
                        </div>
                        <div className="flex items-start gap-2.5 p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                          <div className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 mt-0.5 font-bold">✓</div>
                          <div><strong>Fast 24-Hr Onboarding:</strong> Dedicated Business Development Executive (BDE) assigned for setup and marketing.</div>
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
                      <button
                        onClick={handleApplyFromModal}
                        className="w-full sm:flex-1 py-3.5 px-6 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-black text-xs uppercase tracking-wider shadow-lg shadow-emerald-600/30 flex items-center justify-center gap-2 cursor-pointer transition-all"
                      >
                        <span>Apply for Franchise Dealership Now</span>
                        <FiArrowRight size={15} />
                      </button>
                      <button
                        onClick={() => setIsModalOpen(false)}
                        className="w-full sm:w-auto py-3.5 px-5 rounded-2xl border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-xs cursor-pointer transition-all"
                      >
                        Check Another Area
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* ── CASE 2: TERRITORY IS ALLOCATED / UNAVAILABLE ────────────── */}
              {(result.status === "ALLOCATED" || result.is_available === false) && (
                <div>
                  {/* Modal Header */}
                  <div className="p-6 sm:p-8 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white relative overflow-hidden">
                    <div className="absolute right-0 bottom-0 translate-x-4 translate-y-4 opacity-10 pointer-events-none">
                      <FiClock size={160} />
                    </div>
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/20 border border-amber-400/30 text-amber-300 text-[10px] font-black uppercase tracking-wider mb-3">
                      <FiAlertTriangle size={12} />
                      Territory Currently Assigned
                    </div>
                    <h3 className="text-xl sm:text-2xl font-black tracking-tight">
                      📍 {result.district || selectedDistrict} is Currently Allocated
                    </h3>
                    <p className="text-xs sm:text-sm text-slate-300 mt-1 font-medium">
                      An authorized franchise partner already holds exclusive rights in this territory.
                    </p>
                  </div>

                  {/* Modal Body */}
                  <div className="p-6 sm:p-8 space-y-6">
                    {/* Location Summary Pill */}
                    <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-slate-700 text-white flex items-center justify-center font-black">
                          <FiMapPin size={20} />
                        </div>
                        <div>
                          <div className="text-xs text-slate-500 font-bold uppercase tracking-wider">Checked Territory</div>
                          <div className="text-base font-black text-slate-900">
                            {result.district || selectedDistrict}, {result.state || selectedState}
                          </div>
                        </div>
                      </div>
                      <span className="px-3 py-1 rounded-full bg-amber-100 text-amber-900 text-xs font-black">
                        Active License
                      </span>
                    </div>

                    {/* Explanation and Alternative Options */}
                    <div className="space-y-2.5">
                      <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                        Next Steps & Alternative Solutions:
                      </div>
                      <div className="grid grid-cols-1 gap-2.5 text-xs text-slate-700">
                        <div className="flex items-start gap-2.5 p-3 rounded-xl bg-blue-50/70 border border-blue-100">
                          <div className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center shrink-0 mt-0.5 font-bold text-[10px]">1</div>
                          <div><strong>Join Priority Waitlist:</strong> Be first in line if the current partner expands, transfers rights, or if secondary quota opens.</div>
                        </div>
                        <div className="flex items-start gap-2.5 p-3 rounded-xl bg-emerald-50/70 border border-emerald-100">
                          <div className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center shrink-0 mt-0.5 font-bold text-[10px]">2</div>
                          <div><strong>Request Adjacent Territory:</strong> Unlocked bordering districts in {result.state || selectedState} are ready for instant reservation.</div>
                        </div>
                        <div className="flex items-start gap-2.5 p-3 rounded-xl bg-purple-50/70 border border-purple-100">
                          <div className="w-5 h-5 rounded-full bg-purple-600 text-white flex items-center justify-center shrink-0 mt-0.5 font-bold text-[10px]">3</div>
                          <div><strong>State Master Franchise Option:</strong> Apply for state-level supervisory rights covering multiple regional districts.</div>
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
                      <button
                        onClick={handleApplyFromModal}
                        className="w-full sm:flex-1 py-3.5 px-6 rounded-2xl bg-gradient-to-r from-[#253880] to-[#1d2c66] hover:from-[#1d2c66] hover:to-[#253880] text-white font-black text-xs uppercase tracking-wider shadow-lg shadow-blue-500/20 flex items-center justify-center gap-2 cursor-pointer transition-all"
                      >
                        <span>Join Priority Waitlist / Request Adjacent Area</span>
                        <FiArrowRight size={15} />
                      </button>
                      <button
                        onClick={() => setIsModalOpen(false)}
                        className="w-full sm:w-auto py-3.5 px-5 rounded-2xl border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-xs cursor-pointer transition-all"
                      >
                        Check Another District
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* ── CASE 3: TERRITORY IS LIMITED / UNDER EVALUATION ─────────── */}
              {result.status === "LIMITED" && (
                <div>
                  {/* Modal Header */}
                  <div className="p-6 sm:p-8 bg-gradient-to-br from-amber-500 via-orange-500 to-[#F49222] text-white relative overflow-hidden">
                    <div className="absolute right-0 bottom-0 translate-x-4 translate-y-4 opacity-15 pointer-events-none">
                      <FiAlertTriangle size={160} />
                    </div>
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 backdrop-blur-xs text-white text-[10px] font-black uppercase tracking-wider mb-3">
                      <FiClock size={12} />
                      Fast-Track Evaluation Active
                    </div>
                    <h3 className="text-xl sm:text-2xl font-black tracking-tight">
                      ⚡ High Demand in {result.district || selectedDistrict}
                    </h3>
                    <p className="text-xs sm:text-sm text-amber-100 mt-1 font-medium">
                      1 License slot remains under active director evaluation.
                    </p>
                  </div>

                  {/* Modal Body */}
                  <div className="p-6 sm:p-8 space-y-6">
                    {/* Location Summary Pill */}
                    <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-orange-600 text-white flex items-center justify-center font-black">
                          <FiMapPin size={20} />
                        </div>
                        <div>
                          <div className="text-xs text-amber-800 font-bold uppercase tracking-wider">Territory</div>
                          <div className="text-base font-black text-slate-900">
                            {result.district || selectedDistrict}, {result.state || selectedState}
                          </div>
                        </div>
                      </div>
                      <span className="px-3 py-1 rounded-full bg-amber-200 text-amber-900 text-xs font-black">
                        1 Slot Left
                      </span>
                    </div>

                    <p className="text-xs text-slate-600 leading-relaxed">
                      We have received recent inquiries for this revenue territory. Priority is awarded to applicants who complete the online verification and initial consultation earliest.
                    </p>

                    {/* Actions */}
                    <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
                      <button
                        onClick={handleApplyFromModal}
                        className="w-full sm:flex-1 py-3.5 px-6 rounded-2xl bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white font-black text-xs uppercase tracking-wider shadow-lg shadow-orange-500/20 flex items-center justify-center gap-2 cursor-pointer transition-all"
                      >
                        <span>Submit Fast-Track Application</span>
                        <FiArrowRight size={15} />
                      </button>
                      <button
                        onClick={() => setIsModalOpen(false)}
                        className="w-full sm:w-auto py-3.5 px-5 rounded-2xl border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-xs cursor-pointer transition-all"
                      >
                        Close
                      </button>
                    </div>
                  </div>
                </div>
              )}

            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </section>
  );
}

