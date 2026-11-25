import React, { useState, useEffect } from 'react';
import { 
  TrendingUp, 
  Plus, 
  Target, 
  CheckCircle2, 
  AlertTriangle, 
  Zap, 
  RotateCw, 
  Users, 
  MapPin, 
  Calendar, 
  X 
} from 'lucide-react';
import { storeSetupApi } from '../../../api/storeSetupApi';

export default function ExpansionPlans() {
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [createModalOpen, setCreateModalOpen] = useState(false);

  // New Plan form
  const [newPlan, setNewPlan] = useState({
    title: '',
    financial_year: '2026-2027',
    quarter: 3,
    state_name: 'Maharashtra',
    target_signups: 10,
    target_fee_paid: 8,
    target_operational_stores: 5,
    priority: 'high',
    notes: '',
  });

  const fetchPlans = async () => {
    setLoading(true);
    try {
      const res = await storeSetupApi.listExpansionPlans();
      if (res?.status === 'success') {
        setPlans(res.data || []);
      }
    } catch (err) {
      console.error('Failed to load expansion plans', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPlans();
  }, []);

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await storeSetupApi.createExpansionPlan(newPlan);
      if (res?.status === 'success') {
        setCreateModalOpen(false);
        fetchPlans();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to create expansion plan');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <RotateCw className="w-8 h-8 text-amber-500 animate-spin" />
      </div>
    );
  }

  const totalTargetStores = plans.reduce((s, p) => s + (p.target_operational_stores || 0), 0);
  const totalActualStores = plans.reduce((s, p) => s + (p.actual_operational_stores || 0), 0);
  const totalSignups = plans.reduce((s, p) => s + (p.actual_signups || 0), 0);
  const overallAchievement = totalTargetStores > 0 ? Math.min(100, Math.round((totalActualStores / totalTargetStores) * 100)) : 0;

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-amber-600" />
            Regional Store Expansion & Performance Tracking
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Admin territory goals, target franchisee onboarding vs actual stores operational
          </p>
        </div>

        <button
          onClick={() => setCreateModalOpen(true)}
          className="px-4 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-bold rounded-xl text-xs flex items-center gap-2 shadow-sm transition-all self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          Create Regional Plan
        </button>
      </div>

      {/* Summary KPI Ribbon */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-4.5 bg-white border border-slate-200 rounded-2xl shadow-sm">
          <span className="text-xs text-slate-500 font-semibold">Active Territory Plans</span>
          <div className="text-2xl font-black text-slate-900 mt-1">{plans.length}</div>
          <span className="text-[11px] text-slate-400 mt-0.5 block">State & regional initiatives</span>
        </div>

        <div className="p-4.5 bg-white border border-slate-200 rounded-2xl shadow-sm">
          <span className="text-xs text-slate-500 font-semibold">Target Operational Stores</span>
          <div className="text-2xl font-black text-amber-600 mt-1">{totalTargetStores}</div>
          <span className="text-[11px] text-amber-600 font-semibold mt-0.5 block">Active FY quota</span>
        </div>

        <div className="p-4.5 bg-white border border-slate-200 rounded-2xl shadow-sm">
          <span className="text-xs text-slate-500 font-semibold">Actual Stores Operational</span>
          <div className="text-2xl font-black text-emerald-600 mt-1">{totalActualStores}</div>
          <span className="text-[11px] text-emerald-600 font-semibold mt-0.5 block">{overallAchievement}% overall achievement</span>
        </div>

        <div className="p-4.5 bg-white border border-slate-200 rounded-2xl shadow-sm">
          <span className="text-xs text-slate-500 font-semibold">Total Franchisee Signups</span>
          <div className="text-2xl font-black text-blue-600 mt-1">{totalSignups}</div>
          <span className="text-[11px] text-blue-600 font-semibold mt-0.5 block">Agreement & fee confirmed</span>
        </div>
      </div>

      {/* Plans List Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {plans.length === 0 ? (
          <div className="col-span-2 p-12 bg-white border border-slate-200 rounded-3xl text-center text-slate-400 text-xs shadow-sm">
            No regional expansion plans configured yet. Click "Create Regional Plan" to set expansion targets.
          </div>
        ) : (
          plans.map((p) => {
            const pct = p.target_operational_stores > 0
              ? Math.min(100, Math.round(((p.actual_operational_stores || 0) / p.target_operational_stores) * 100))
              : 0;

            return (
              <div
                key={p._id}
                className="p-6 bg-white border border-slate-200 rounded-3xl space-y-4 shadow-sm hover:border-slate-300 transition-colors"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="px-2 py-0.5 bg-amber-50 border border-amber-200 text-amber-800 text-[10px] font-bold rounded-md">
                        {p.financial_year} &bull; Q{p.quarter}
                      </span>
                      <span className="px-2 py-0.5 bg-purple-50 text-purple-700 border border-purple-200 text-[10px] font-bold rounded-md uppercase">
                        {p.priority} Priority
                      </span>
                    </div>
                    <h3 className="text-base font-bold text-slate-900">{p.title}</h3>
                    <p className="text-xs text-slate-500 flex items-center gap-1.5 mt-0.5">
                      <MapPin className="w-3.5 h-3.5 text-slate-400" />
                      State Jurisdiction: <strong className="text-slate-800">{p.state_name}</strong>
                    </p>
                  </div>

                  <div className="text-right">
                    <span className="text-2xl font-black text-slate-900">{pct}%</span>
                    <span className="text-[10px] text-slate-400 block font-semibold">Store Target</span>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="space-y-1.5">
                  <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        pct >= 100 ? 'bg-emerald-500' : 'bg-amber-500'
                      }`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>

                {/* Metric Breakdown Grid */}
                <div className="grid grid-cols-3 gap-3 p-3 bg-slate-50 rounded-2xl border border-slate-100 text-center text-xs">
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-semibold block">Signups</span>
                    <span className="font-bold text-slate-900 mt-0.5 block">
                      {p.actual_signups || 0} / {p.target_signups}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-semibold block">Fee Verified</span>
                    <span className="font-bold text-slate-900 mt-0.5 block">
                      {p.actual_fee_paid || 0} / {p.target_fee_paid}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-semibold block">Live Stores</span>
                    <span className="font-bold text-emerald-600 mt-0.5 block">
                      {p.actual_operational_stores || 0} / {p.target_operational_stores}
                    </span>
                  </div>
                </div>

                {p.notes && (
                  <p className="text-xs text-slate-500 italic bg-slate-50/50 p-2.5 rounded-xl border border-slate-100">
                    "{p.notes}"
                  </p>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Create Plan Modal */}
      {createModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-lg p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900">Create Regional Expansion Plan</h3>
              <button onClick={() => setCreateModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Plan Title *</label>
                <input
                  required
                  type="text"
                  placeholder="e.g. Maharashtra Western Region Expansion"
                  value={newPlan.title}
                  onChange={(e) => setNewPlan({ ...newPlan, title: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Financial Year</label>
                  <input
                    type="text"
                    value={newPlan.financial_year}
                    onChange={(e) => setNewPlan({ ...newPlan, financial_year: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Quarter</label>
                  <select
                    value={newPlan.quarter}
                    onChange={(e) => setNewPlan({ ...newPlan, quarter: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:border-amber-500"
                  >
                    <option value={1}>Q1 (Apr-Jun)</option>
                    <option value={2}>Q2 (Jul-Sep)</option>
                    <option value={3}>Q3 (Oct-Dec)</option>
                    <option value={4}>Q4 (Jan-Mar)</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Target State</label>
                  <input
                    required
                    type="text"
                    value={newPlan.state_name}
                    onChange={(e) => setNewPlan({ ...newPlan, state_name: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Target Signups</label>
                  <input
                    type="number"
                    min={1}
                    value={newPlan.target_signups}
                    onChange={(e) => setNewPlan({ ...newPlan, target_signups: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Target Fee Paid</label>
                  <input
                    type="number"
                    min={1}
                    value={newPlan.target_fee_paid}
                    onChange={(e) => setNewPlan({ ...newPlan, target_fee_paid: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Target Stores</label>
                  <input
                    type="number"
                    min={1}
                    value={newPlan.target_operational_stores}
                    onChange={(e) => setNewPlan({ ...newPlan, target_operational_stores: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Notes / Regional Context</label>
                <textarea
                  rows={2}
                  value={newPlan.notes}
                  onChange={(e) => setNewPlan({ ...newPlan, notes: e.target.value })}
                  placeholder="Key focus districts, marketing budget allocation..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setCreateModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-slate-900 text-white font-bold rounded-xl text-xs shadow-sm"
                >
                  Save Plan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
