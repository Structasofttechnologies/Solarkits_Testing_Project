import React, { useState, useEffect } from 'react';
import { FaBullseye, FaTimes, FaExclamationCircle, FaStore, FaBolt, FaInfoCircle } from 'react-icons/fa';
import { bdeApi } from '../../../api/bdeApi';

export default function GoalModal({ isOpen, onClose, bde, onSuccess }) {
  const [periodType, setPeriodType] = useState('monthly');
  const [monthlySignupGoal, setMonthlySignupGoal] = useState(10);
  const [quarterlySignupGoal, setQuarterlySignupGoal] = useState(30);
  const [operationalStoreGoal, setOperationalStoreGoal] = useState(5);
  const [monthlyEpcLeadGoal, setMonthlyEpcLeadGoal] = useState(25);
  const [monthlyEpcOnboardGoal, setMonthlyEpcOnboardGoal] = useState(10);
  const [monthlyNetworkKitGoal, setMonthlyNetworkKitGoal] = useState(200);
  const [canOnboardEpc, setCanOnboardEpc] = useState(true);
  const [canOnboardFranchise, setCanOnboardFranchise] = useState(true);
  const [year, setYear] = useState(new Date().getFullYear());
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [fetchingGoal, setFetchingGoal] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (isOpen && bde) {
      setError(null);
      loadGoalData();
    }
  }, [isOpen, bde]);

  const loadGoalData = async () => {
    // 1. Initial quick population from bde prop if available
    const existing = bde?.goal || bde?.current_goal;
    const epcInitial = bde?.can_onboard_epc ?? existing?.can_onboard_epc ?? true;
    const franchiseInitial = bde?.can_onboard_franchise ?? existing?.can_onboard_franchise ?? true;
    setCanOnboardEpc(epcInitial !== false);
    setCanOnboardFranchise(franchiseInitial !== false);

    if (existing) {
      setPeriodType(existing.period_type || 'monthly');
      setMonthlySignupGoal(existing.monthly_franchisee_signup_goal ?? 10);
      setQuarterlySignupGoal(existing.quarterly_franchisee_signup_goal ?? 30);
      setOperationalStoreGoal(existing.operational_store_goal ?? 5);
      setMonthlyEpcLeadGoal(existing.monthly_epc_lead_goal ?? 25);
      setMonthlyEpcOnboardGoal(existing.monthly_epc_onboard_goal ?? 10);
      setMonthlyNetworkKitGoal(existing.monthly_network_kit_goal ?? 200);
      setYear(existing.year || new Date().getFullYear());
      setNotes(existing.notes || '');
    } else {
      setPeriodType('monthly');
      setMonthlySignupGoal(10);
      setQuarterlySignupGoal(30);
      setOperationalStoreGoal(5);
      setMonthlyEpcLeadGoal(25);
      setMonthlyEpcOnboardGoal(10);
      setMonthlyNetworkKitGoal(200);
      setYear(new Date().getFullYear());
      setNotes('');
    }

    // 2. Fetch latest active goal from API to ensure fresh data
    const bdeId = bde._id || bde.id;
    if (!bdeId) return;

    try {
      setFetchingGoal(true);
      const res = await bdeApi.getGoals(bdeId);
      const activeGoal = res.data?.current || (res.data?.history && res.data.history[0]);
      if (activeGoal) {
        setPeriodType(activeGoal.period_type || 'monthly');
        setMonthlySignupGoal(activeGoal.monthly_franchisee_signup_goal ?? 10);
        setQuarterlySignupGoal(activeGoal.quarterly_franchisee_signup_goal ?? 30);
        setOperationalStoreGoal(activeGoal.operational_store_goal ?? 5);
        setMonthlyEpcLeadGoal(activeGoal.monthly_epc_lead_goal ?? 25);
        setMonthlyEpcOnboardGoal(activeGoal.monthly_epc_onboard_goal ?? 10);
        setMonthlyNetworkKitGoal(activeGoal.monthly_network_kit_goal ?? 200);
        setYear(activeGoal.year || new Date().getFullYear());
        setNotes(activeGoal.notes || '');
        if (activeGoal.can_onboard_epc !== undefined) {
          setCanOnboardEpc(activeGoal.can_onboard_epc !== false);
        }
        if (activeGoal.can_onboard_franchise !== undefined) {
          setCanOnboardFranchise(activeGoal.can_onboard_franchise !== false);
        }
      }
    } catch (err) {
      console.error('Failed to fetch latest goals in GoalModal', err);
    } finally {
      setFetchingGoal(false);
    }
  };

  if (!isOpen || !bde) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await bdeApi.assignGoals({
        bde_id: bde._id || bde.id,
        period_type: periodType,
        year: Number(year),
        monthly_franchisee_signup_goal: canOnboardFranchise ? Number(monthlySignupGoal) : 0,
        quarterly_franchisee_signup_goal: canOnboardFranchise ? Number(quarterlySignupGoal) : 0,
        operational_store_goal: canOnboardFranchise ? Number(operationalStoreGoal) : 0,
        monthly_epc_lead_goal: canOnboardEpc ? Number(monthlyEpcLeadGoal) : 0,
        monthly_epc_onboard_goal: canOnboardEpc ? Number(monthlyEpcOnboardGoal) : 0,
        monthly_network_kit_goal: canOnboardFranchise ? Number(monthlyNetworkKitGoal) : 0,
        can_onboard_epc: canOnboardEpc,
        can_onboard_franchise: canOnboardFranchise,
        notes,
      });

      onSuccess();
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to assign goals');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4 animate-fadeIn">
      <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col text-slate-900 max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-100 bg-gradient-to-r from-blue-50/80 via-slate-50 to-white">
          <div className="flex items-center gap-3.5">
            <div className="p-3 bg-blue-100 text-[#0575B8] rounded-2xl shadow-xs">
              <FaBullseye className="text-xl" />
            </div>
            <div>
              <h2 className="text-xl font-black text-slate-900 tracking-tight">Assign Goals & Targets</h2>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                Set targets for <span className="font-bold text-slate-900">{bde.full_name}</span> ({bde.bde_id})
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition cursor-pointer"
          >
            <FaTimes size={16} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4 text-xs">
          {error && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-800 rounded-2xl text-xs flex items-center gap-2 font-semibold">
              <FaExclamationCircle className="text-rose-600 shrink-0" /> {error}
            </div>
          )}

          {/* Period Type & Year */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="font-bold text-slate-700 uppercase tracking-wider block text-[11px]">Period Type</label>
              <select
                value={periodType}
                onChange={(e) => setPeriodType(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 text-sm font-semibold focus:outline-none focus:border-[#0575B8] focus:bg-white transition"
              >
                <option value="monthly">Monthly</option>
                <option value="quarterly">Quarterly</option>
                <option value="annual">Annual</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="font-bold text-slate-700 uppercase tracking-wider block text-[11px]">Target Year</label>
              <input
                type="number"
                value={year}
                onChange={(e) => setYear(e.target.value)}
                min="2025"
                max="2035"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 text-sm font-semibold focus:outline-none focus:border-[#0575B8] focus:bg-white transition"
              />
            </div>
          </div>

          {/* Step 1: Onboarding Decision Permissions (Moved to the Top) */}
          <div className="p-4 bg-gradient-to-r from-slate-50 to-blue-50/30 rounded-2xl border border-slate-200 space-y-3">
            <div className="flex items-center justify-between pb-1.5 border-b border-slate-200/80">
              <span className="font-black text-slate-800 uppercase tracking-wider block text-[11px]">
                Onboarding Permissions & Decision
              </span>
              <span className="text-[10px] text-slate-500 font-semibold">Choose authorized scopes for this BDE</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              {/* Toggle 1: Franchise Onboarding */}
              <div
                onClick={() => setCanOnboardFranchise(!canOnboardFranchise)}
                className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-2 ${canOnboardFranchise
                    ? 'bg-amber-50/80 border-amber-300 shadow-xs'
                    : 'bg-white border-slate-200 hover:bg-slate-50 opacity-75'
                  }`}
              >
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className={`w-2.5 h-2.5 rounded-full ${canOnboardFranchise ? 'bg-amber-500 ring-2 ring-amber-200' : 'bg-slate-300'}`} />
                    <span className={`font-black text-xs ${canOnboardFranchise ? 'text-amber-950' : 'text-slate-700'}`}>
                      Franchise Onboarding
                    </span>
                  </div>
                  <span className={`text-[10px] block mt-0.5 font-medium ${canOnboardFranchise ? 'text-amber-700' : 'text-slate-400'}`}>
                    {canOnboardFranchise ? 'Authorized for Franchise' : 'Franchise onboarding restricted'}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setCanOnboardFranchise(!canOnboardFranchise);
                  }}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${canOnboardFranchise ? 'bg-amber-600' : 'bg-slate-300'
                    }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${canOnboardFranchise ? 'translate-x-5' : 'translate-x-0'
                      }`}
                  />
                </button>
              </div>

              {/* Toggle 2: EPC Onboarding */}
              <div
                onClick={() => setCanOnboardEpc(!canOnboardEpc)}
                className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-2 ${canOnboardEpc
                    ? 'bg-teal-50/80 border-teal-300 shadow-xs'
                    : 'bg-white border-slate-200 hover:bg-slate-50 opacity-75'
                  }`}
              >
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className={`w-2.5 h-2.5 rounded-full ${canOnboardEpc ? 'bg-teal-500 ring-2 ring-teal-200' : 'bg-slate-300'}`} />
                    <span className={`font-black text-xs ${canOnboardEpc ? 'text-teal-950' : 'text-slate-700'}`}>
                      EPC Onboarding
                    </span>
                  </div>
                  <span className={`text-[10px] block mt-0.5 font-medium ${canOnboardEpc ? 'text-teal-700' : 'text-slate-400'}`}>
                    {canOnboardEpc ? 'Authorized for EPCs' : 'EPC onboarding restricted'}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setCanOnboardEpc(!canOnboardEpc);
                  }}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${canOnboardEpc ? 'bg-teal-600' : 'bg-slate-300'
                    }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${canOnboardEpc ? 'translate-x-5' : 'translate-x-0'
                      }`}
                  />
                </button>
              </div>
            </div>
          </div>

          {/* Conditional Targets 1: Franchise Onboarding Goals (Shown ONLY if canOnboardFranchise is true) */}
          {canOnboardFranchise && (
            <div className="p-4 bg-amber-50/40 rounded-2xl border border-amber-200/80 space-y-3 animate-fadeIn">
              <div className="flex items-center justify-between pb-1.5 border-b border-amber-100">
                <div className="flex items-center gap-2">
                  <span className="p-1.5 bg-amber-100 text-amber-800 rounded-lg">
                    <FaStore size={12} />
                  </span>
                  <div>
                    <span className="font-black text-slate-800 uppercase tracking-wider block text-[11px]">
                      Franchisee Expansion Targets
                    </span>
                    <span className="text-[10px] text-slate-500 font-medium">Targets for franchise partner signups & stores</span>
                  </div>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200">
                  Franchise Scope Active
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <label className="font-bold text-slate-700 uppercase tracking-wider block text-[11px]">Monthly Signups</label>
                  <input
                    type="number"
                    min="0"
                    value={monthlySignupGoal}
                    onChange={(e) => setMonthlySignupGoal(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-white border border-amber-200 rounded-xl text-slate-900 text-sm font-semibold focus:outline-none focus:border-amber-500 transition"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="font-bold text-slate-700 uppercase tracking-wider block text-[11px]">Quarterly Signups</label>
                  <input
                    type="number"
                    min="0"
                    value={quarterlySignupGoal}
                    onChange={(e) => setQuarterlySignupGoal(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-white border border-amber-200 rounded-xl text-slate-900 text-sm font-semibold focus:outline-none focus:border-amber-500 transition"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="font-bold text-slate-700 uppercase tracking-wider block text-[11px]">Operational Stores</label>
                  <input
                    type="number"
                    min="0"
                    value={operationalStoreGoal}
                    onChange={(e) => setOperationalStoreGoal(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-white border border-amber-200 rounded-xl text-slate-900 text-sm font-semibold focus:outline-none focus:border-amber-500 transition"
                  />
                </div>
              </div>

              <div className="pt-1">
                <div className="space-y-1.5">
                  <label className="font-bold text-slate-700 uppercase tracking-wider block text-[11px]">
                    Network Kit Target (Quarterly / Monthly Orders)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={monthlyNetworkKitGoal}
                    onChange={(e) => setMonthlyNetworkKitGoal(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-white border border-amber-200 rounded-xl text-slate-900 text-sm font-semibold focus:outline-none focus:border-amber-500 transition"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Conditional Targets 2: EPC Onboarding Goals (Shown ONLY if canOnboardEpc is true) */}
          {canOnboardEpc && (
            <div className="p-4 bg-teal-50/40 rounded-2xl border border-teal-200/80 space-y-3 animate-fadeIn">
              <div className="flex items-center justify-between pb-1.5 border-b border-teal-100">
                <div className="flex items-center gap-2">
                  <span className="p-1.5 bg-teal-100 text-teal-800 rounded-lg">
                    <FaBolt size={12} />
                  </span>
                  <div>
                    <span className="font-black text-slate-800 uppercase tracking-wider block text-[11px]">
                      EPC Contractor & Pipeline Targets
                    </span>
                    <span className="text-[10px] text-slate-500 font-medium">Targets for EPC contractor prospects & GST onboardings</span>
                  </div>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-teal-100 text-teal-800 border border-teal-200">
                  EPC Scope Active
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="font-bold text-slate-700 uppercase tracking-wider block text-[11px]">Monthly EPC Leads</label>
                  <input
                    type="number"
                    min="0"
                    value={monthlyEpcLeadGoal}
                    onChange={(e) => setMonthlyEpcLeadGoal(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-white border border-teal-200 rounded-xl text-slate-900 text-sm font-semibold focus:outline-none focus:border-teal-500 transition"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="font-bold text-slate-700 uppercase tracking-wider block text-[11px]">EPC Onboardings (Verified)</label>
                  <input
                    type="number"
                    min="0"
                    value={monthlyEpcOnboardGoal}
                    onChange={(e) => setMonthlyEpcOnboardGoal(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-white border border-teal-200 rounded-xl text-slate-900 text-sm font-semibold focus:outline-none focus:border-teal-500 transition"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Notice when neither role is selected */}
          {!canOnboardFranchise && !canOnboardEpc && (
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl text-xs text-slate-600 flex items-start gap-3">
              <FaInfoCircle className="text-blue-500 shrink-0 text-base mt-0.5" />
              <div>
                <strong className="block font-bold text-slate-800">No Onboarding Scopes Enabled</strong>
                <span>
                  Both Franchise Onboarding and EPC Onboarding are currently restricted for this BDE. Turn ON at least one role above to configure specific target numbers.
                </span>
              </div>
            </div>
          )}

          {/* Notes */}
          <div className="space-y-1.5">
            <label className="font-bold text-slate-700 uppercase tracking-wider block text-[11px]">Strategy / Target Notes (Optional)</label>
            <textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Focus on high potential districts in state territory."
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 text-sm font-medium focus:outline-none focus:border-[#0575B8] focus:bg-white transition"
            />
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2.5 bg-[#0575B8] hover:bg-[#045D93] text-white font-bold rounded-xl text-xs shadow-md shadow-blue-500/20 transition cursor-pointer disabled:opacity-50"
            >
              {loading ? 'Saving...' : 'Set BDE Targets'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
