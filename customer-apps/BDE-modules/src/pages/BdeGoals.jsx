import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { Target, TrendingUp, ShoppingBag, ShieldCheck, Package, FileText, Calendar, Sparkles } from 'lucide-react';

export default function BdeGoals() {
  const [goalData, setGoalData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchGoals();
  }, []);

  const fetchGoals = async () => {
    try {
      setLoading(true);
      let res;
      try {
        res = await api.get('/goals/my');
      } catch {
        res = await api.get('/goals');
      }
      const raw = res?.data?.data;
      if (Array.isArray(raw)) {
        setGoalData({
          current: raw.find(g => g.status === 'active') || raw[0] || {},
          history: raw,
        });
      } else {
        setGoalData(raw || {});
      }
    } catch (err) {
      console.error('Failed to load goals', err);
    } finally {
      setLoading(false);
    }
  };

  const goal = goalData?.current || (Array.isArray(goalData) ? goalData[0] : goalData) || {};

  const monthlyGoal = goal.monthly_franchisee_signup_goal ?? goal.monthly_signup_goal ?? 0;
  const monthlyAchieved = goal.monthly_signup_achieved ?? 0;
  const monthlyPct = monthlyGoal > 0 ? Math.min(100, Math.round((monthlyAchieved / monthlyGoal) * 100)) : 0;

  const quarterlyGoal = goal.quarterly_franchisee_signup_goal ?? goal.quarterly_signup_goal ?? 0;
  const quarterlyAchieved = goal.quarterly_signup_achieved ?? 0;
  const quarterlyPct = quarterlyGoal > 0 ? Math.min(100, Math.round((quarterlyAchieved / quarterlyGoal) * 100)) : 0;

  const storeGoal = goal.operational_store_goal ?? 0;
  const storeAchieved = goal.operational_store_achieved ?? 0;
  const storePct = storeGoal > 0 ? Math.min(100, Math.round((storeAchieved / storeGoal) * 100)) : 0;

  const epcLeadGoal = goal.monthly_epc_lead_goal ?? 0;
  const epcLeadAchieved = goal.monthly_epc_leads_achieved ?? 0;
  const epcLeadPct = epcLeadGoal > 0 ? Math.min(100, Math.round((epcLeadAchieved / epcLeadGoal) * 100)) : 0;

  const epcOnboardGoal = goal.monthly_epc_onboard_goal ?? 0;
  const epcOnboardAchieved = goal.monthly_epc_onboarded_achieved ?? 0;
  const epcOnboardPct = epcOnboardGoal > 0 ? Math.min(100, Math.round((epcOnboardAchieved / epcOnboardGoal) * 100)) : 0;

  const networkKitGoal = goal.monthly_network_kit_goal ?? 0;
  const networkKitAchieved = goal.monthly_network_kits_achieved ?? 0;
  const networkKitPct = networkKitGoal > 0 ? Math.min(100, Math.round((networkKitAchieved / networkKitGoal) * 100)) : 0;

  const trialKitGoal = goal.monthly_trial_kit_goal ?? 0;
  const trialKitAchieved = goal.monthly_trial_kits_achieved ?? 0;
  const trialKitPct = trialKitGoal > 0 ? Math.min(100, Math.round((trialKitAchieved / trialKitGoal) * 100)) : 0;

  return (
    <div className="space-y-6">
      {/* Header & Target Period Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900">Goals & Performance Targets</h1>
          <p className="text-xs text-slate-500">
            Monitor your assigned franchisee acquisition targets, EPC leads, onboarding quotas, and kit milestones.
          </p>
        </div>

        {goal?.period_type && (
          <div className="flex items-center gap-2 px-3.5 py-1.5 bg-blue-50 border border-blue-200 rounded-full text-xs font-bold text-[#0575B8]">
            <Calendar className="w-3.5 h-3.5" />
            <span className="uppercase tracking-wider">
              {goal.period_type} Target — {goal.year || new Date().getFullYear()}
            </span>
          </div>
        )}
      </div>

      {/* Target Strategy Notes (if provided by Admin) */}
      {goal?.notes && (
        <div className="p-4 bg-gradient-to-r from-blue-50 via-indigo-50/50 to-white rounded-2xl border border-blue-200 shadow-xs flex items-start gap-3">
          <div className="p-2 bg-blue-600 text-white rounded-xl shrink-0 mt-0.5">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <span className="text-[11px] font-black uppercase text-blue-900 tracking-wider block">
              Admin Strategy / Target Notes
            </span>
            <p className="text-xs text-slate-700 font-medium mt-0.5 whitespace-pre-wrap">
              {goal.notes}
            </p>
          </div>
        </div>
      )}

      {/* 6 Core Target Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {/* 1. Monthly Franchisee Signups */}
        <div className="p-6 bg-white rounded-3xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl">
              <Target className="w-6 h-6" />
            </div>
            <span className="px-2.5 py-1 bg-blue-50 text-blue-700 font-bold text-xs rounded-full uppercase">
              Monthly Goal
            </span>
          </div>

          <div>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Franchisee Signups</span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-4xl font-black text-slate-900">{monthlyAchieved}</span>
              <span className="text-sm font-bold text-slate-400">/ {monthlyGoal} target</span>
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs font-semibold">
              <span className="text-slate-600">Progress</span>
              <span className="text-blue-600 font-bold">{monthlyPct}%</span>
            </div>
            <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden">
              <div
                className="bg-blue-600 h-full rounded-full transition-all duration-500"
                style={{ width: `${monthlyPct}%` }}
              />
            </div>
          </div>

          <p className="text-xs text-slate-500 pt-2 border-t border-slate-100">
            {monthlyGoal > 0 && monthlyGoal - monthlyAchieved > 0
              ? `${monthlyGoal - monthlyAchieved} more signups required to hit milestone.`
              : monthlyGoal > 0
              ? '🎉 Monthly signup target reached!'
              : 'Target not configured.'}
          </p>
        </div>

        {/* 2. Quarterly Franchisee Signups */}
        <div className="p-6 bg-white rounded-3xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div className="p-3 bg-purple-50 text-purple-600 rounded-2xl">
              <TrendingUp className="w-6 h-6" />
            </div>
            <span className="px-2.5 py-1 bg-purple-50 text-purple-700 font-bold text-xs rounded-full uppercase">
              Quarterly Goal
            </span>
          </div>

          <div>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Quarterly Signups</span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-4xl font-black text-purple-900">{quarterlyAchieved}</span>
              <span className="text-sm font-bold text-slate-400">/ {quarterlyGoal} target</span>
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs font-semibold">
              <span className="text-slate-600">Progress</span>
              <span className="text-purple-600 font-bold">{quarterlyPct}%</span>
            </div>
            <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden">
              <div
                className="bg-purple-600 h-full rounded-full transition-all duration-500"
                style={{ width: `${quarterlyPct}%` }}
              />
            </div>
          </div>

          <p className="text-xs text-slate-500 pt-2 border-t border-slate-100">
            {quarterlyGoal > 0 && quarterlyGoal - quarterlyAchieved > 0
              ? `${quarterlyGoal - quarterlyAchieved} signups needed for full quarterly quota.`
              : quarterlyGoal > 0
              ? '🎉 Quarterly quota achieved!'
              : 'Target not configured.'}
          </p>
        </div>

        {/* 3. Operational Store Setups */}
        <div className="p-6 bg-white rounded-3xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl">
              <ShoppingBag className="w-6 h-6" />
            </div>
            <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 font-bold text-xs rounded-full uppercase">
              Store Goal
            </span>
          </div>

          <div>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Active Stores</span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-4xl font-black text-emerald-900">{storeAchieved}</span>
              <span className="text-sm font-bold text-slate-400">/ {storeGoal} target</span>
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs font-semibold">
              <span className="text-slate-600">Progress</span>
              <span className="text-emerald-600 font-bold">{storePct}%</span>
            </div>
            <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden">
              <div
                className="bg-emerald-600 h-full rounded-full transition-all duration-500"
                style={{ width: `${storePct}%` }}
              />
            </div>
          </div>

          <p className="text-xs text-slate-500 pt-2 border-t border-slate-100">
            {storeGoal > 0 && storeGoal - storeAchieved > 0
              ? `${storeGoal - storeAchieved} physical stores remaining to activate.`
              : storeGoal > 0
              ? '🎉 Store setup quota reached!'
              : 'Target not configured.'}
          </p>
        </div>

        {/* 4. Monthly EPC Leads Goal */}
        <div className="p-6 bg-white rounded-3xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div className="p-3 bg-amber-50 text-amber-600 rounded-2xl">
              <Target className="w-6 h-6" />
            </div>
            <span className="px-2.5 py-1 bg-amber-50 text-amber-700 font-bold text-xs rounded-full uppercase">
              EPC Leads
            </span>
          </div>

          <div>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Monthly EPC Leads</span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-4xl font-black text-amber-900">{epcLeadAchieved}</span>
              <span className="text-sm font-bold text-slate-400">/ {epcLeadGoal} target</span>
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs font-semibold">
              <span className="text-slate-600">Progress</span>
              <span className="text-amber-600 font-bold">{epcLeadPct}%</span>
            </div>
            <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden">
              <div
                className="bg-amber-500 h-full rounded-full transition-all duration-500"
                style={{ width: `${epcLeadPct}%` }}
              />
            </div>
          </div>

          <p className="text-xs text-slate-500 pt-2 border-t border-slate-100">
            {epcLeadGoal > 0 && epcLeadGoal - epcLeadAchieved > 0
              ? `${epcLeadGoal - epcLeadAchieved} more EPC leads needed for monthly quota.`
              : epcLeadGoal > 0
              ? '🎉 EPC Leads milestone achieved!'
              : 'Target not configured.'}
          </p>
        </div>

        {/* 5. EPC Onboardings Goal */}
        <div className="p-6 bg-white rounded-3xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div className="p-3 bg-teal-50 text-teal-600 rounded-2xl">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <span className="px-2.5 py-1 bg-teal-50 text-teal-700 font-bold text-xs rounded-full uppercase">
              Onboardings
            </span>
          </div>

          <div>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">EPC Onboardings</span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-4xl font-black text-teal-900">{epcOnboardAchieved}</span>
              <span className="text-sm font-bold text-slate-400">/ {epcOnboardGoal} target</span>
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs font-semibold">
              <span className="text-slate-600">Progress</span>
              <span className="text-teal-600 font-bold">{epcOnboardPct}%</span>
            </div>
            <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden">
              <div
                className="bg-teal-600 h-full rounded-full transition-all duration-500"
                style={{ width: `${epcOnboardPct}%` }}
              />
            </div>
          </div>

          <p className="text-xs text-slate-500 pt-2 border-t border-slate-100">
            {epcOnboardGoal > 0 && epcOnboardGoal - epcOnboardAchieved > 0
              ? `${epcOnboardGoal - epcOnboardAchieved} contractor onboardings remaining.`
              : epcOnboardGoal > 0
              ? '🎉 EPC Onboarding quota achieved!'
              : 'Target not configured.'}
          </p>
        </div>

        {/* 6. Network Kit Target */}
        <div className="p-6 bg-white rounded-3xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl">
              <Package className="w-6 h-6" />
            </div>
            <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 font-bold text-xs rounded-full uppercase">
              Kit Target
            </span>
          </div>

          <div>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Network Kits Target</span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-4xl font-black text-emerald-900">{networkKitAchieved}</span>
              <span className="text-sm font-bold text-slate-400">/ {networkKitGoal} kits</span>
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs font-semibold">
              <span className="text-slate-600">Progress</span>
              <span className="text-emerald-600 font-bold">{networkKitPct}%</span>
            </div>
            <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden">
              <div
                className="bg-emerald-600 h-full rounded-full transition-all duration-500"
                style={{ width: `${networkKitPct}%` }}
              />
            </div>
          </div>

          <p className="text-xs text-slate-500 pt-2 border-t border-slate-100">
            {networkKitGoal > 0 && networkKitGoal - networkKitAchieved > 0
              ? `${networkKitGoal - networkKitAchieved} kits remaining for network goal.`
              : networkKitGoal > 0
              ? '🎉 Network kit sales goal achieved!'
              : 'Target not configured.'}
          </p>
        </div>

        {/* 7. EPC Trial Kits Target */}
        <div className="p-6 bg-white rounded-3xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div className="p-3 bg-rose-50 text-rose-600 rounded-2xl">
              <Package className="w-6 h-6" />
            </div>
            <span className="px-2.5 py-1 bg-rose-50 text-rose-700 font-bold text-xs rounded-full uppercase">
              Trial Kits
            </span>
          </div>

          <div>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">EPC Trial Kits Target</span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-4xl font-black text-rose-900">{trialKitAchieved}</span>
              <span className="text-sm font-bold text-slate-400">/ {trialKitGoal} kits</span>
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs font-semibold">
              <span className="text-slate-600">Progress</span>
              <span className="text-rose-600 font-bold">{trialKitPct}%</span>
            </div>
            <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden">
              <div
                className="bg-rose-600 h-full rounded-full transition-all duration-500"
                style={{ width: `${trialKitPct}%` }}
              />
            </div>
          </div>

          <p className="text-xs text-slate-500 pt-2 border-t border-slate-100">
            {trialKitGoal > 0 && trialKitGoal - trialKitAchieved > 0
              ? `${trialKitGoal - trialKitAchieved} more trial kits needed to reach EPC goal.`
              : trialKitGoal > 0
              ? '🎉 EPC trial kits target reached!'
              : 'Target not configured.'}
          </p>
        </div>
      </div>
    </div>
  );
}
