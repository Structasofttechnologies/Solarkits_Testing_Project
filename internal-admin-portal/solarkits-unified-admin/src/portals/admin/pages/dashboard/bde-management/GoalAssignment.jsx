import React, { useState, useEffect } from 'react';
import {
  FaBullseye,
  FaSearch,
  FaPlus,
  FaChartLine,
} from 'react-icons/fa';
import { bdeApi } from '../../../api/bdeApi';
import Loader from '../../../components/Loader';
import GoalModal from './GoalModal';

export default function GoalAssignment({ moduleUniqueId = 'ADM_BDE_MGMT' }) {
  const [bdes, setBdes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedBde, setSelectedBde] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [togglingMap, setTogglingMap] = useState({});

  useEffect(() => {
    fetchBdes();
  }, []);

  const fetchBdes = async () => {
    try {
      setLoading(true);
      const res = await bdeApi.listBdes({ limit: 50 }, moduleUniqueId);
      setBdes(res.data || []);
    } catch (err) {
      console.error('Failed to load BDEs for goal assignment', err);
    } finally {
      setLoading(false);
    }
  };

  const handleTogglePermission = async (bde, field) => {
    const bdeId = bde.id || bde._id;
    const currentVal = bde[field] !== false;
    const newVal = !currentVal;
    const toggleKey = `${bdeId}-${field}`;

    // Optimistic UI update
    setBdes((prev) =>
      prev.map((item) =>
        (item.id || item._id) === bdeId ? { ...item, [field]: newVal } : item
      )
    );
    setTogglingMap((prev) => ({ ...prev, [toggleKey]: true }));

    try {
      await bdeApi.updatePermissions(
        bdeId,
        { [field]: newVal },
        moduleUniqueId
      );
    } catch (err) {
      console.error('Failed to update onboarding permission', err);
      // Revert on error
      setBdes((prev) =>
        prev.map((item) =>
          (item.id || item._id) === bdeId ? { ...item, [field]: currentVal } : item
        )
      );
    } finally {
      setTogglingMap((prev) => ({ ...prev, [toggleKey]: false }));
    }
  };

  const filteredBdes = bdes.filter(b =>
    b.full_name?.toLowerCase().includes(search.toLowerCase()) ||
    b.bde_id?.toLowerCase().includes(search.toLowerCase()) ||
    b.state_name?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6 text-slate-900 font-sans">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">BDE Goal & Target Assignments</h1>
          <p className="text-sm text-slate-500 font-medium mt-0.5">
            Set quarterly and monthly franchisee signup targets and operational store goals for each BDE.
          </p>
        </div>
      </div>

      {/* Search */}
      <div className="p-3.5 bg-white rounded-2xl border border-slate-200 shadow-sm flex items-center gap-3">
        <FaSearch className="text-slate-400 text-sm ml-2" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by BDE name, ID, or assigned state..."
          className="w-full bg-transparent text-slate-900 text-sm font-medium focus:outline-none placeholder-slate-400"
        />
      </div>

      {/* Cards */}
      {loading ? (
        <div className="py-20"><Loader text="Loading goal assignments..." /></div>
      ) : filteredBdes.length === 0 ? (
        <div className="py-16 text-center text-slate-500 bg-white rounded-3xl border border-slate-200 shadow-xs">
          No BDE executives found matching search criteria.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredBdes.map(b => (
            <div
              key={b.id || b._id}
              className="p-5 bg-white rounded-3xl border border-slate-200 shadow-sm hover:shadow-md hover:border-blue-300 transition-all flex flex-col justify-between space-y-4"
            >
              <div>
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-bold text-[#0575B8] bg-blue-50 px-2 py-0.5 rounded-lg border border-blue-100">{b.bde_id}</span>
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                    b.status === 'active'
                      ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                      : 'bg-amber-100 text-amber-900 border border-amber-300'
                  }`}>
                    {b.status}
                  </span>
                </div>
                <h3 className="text-base font-bold text-slate-900 mt-2">{b.full_name}</h3>
                <p className="text-xs text-slate-500 truncate font-medium">{b.state_name || 'Unassigned Territory'}</p>

                {/* Target Metric Cards */}
                <div className="mt-4 p-3.5 bg-slate-50 rounded-2xl border border-slate-200 space-y-2.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500 font-medium">Period & Year:</span>
                    <span className="font-bold text-slate-900 uppercase">
                      {b.goal?.period_type ? `${b.goal.period_type} (${b.goal.year || new Date().getFullYear()})` : 'Monthly (Current)'}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs pt-1 border-t border-slate-200">
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase font-bold block">Monthly Signups</span>
                      <span className="font-black text-[#0575B8]">
                        {b.goal?.monthly_franchisee_signup_goal ?? b.current_goal?.monthly_franchisee_signup_goal ?? 0}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase font-bold block">Quarterly</span>
                      <span className="font-black text-indigo-700">
                        {b.goal?.quarterly_franchisee_signup_goal ?? b.current_goal?.quarterly_franchisee_signup_goal ?? 0}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase font-bold block">Store Setups</span>
                      <span className="font-black text-emerald-700">
                        {b.goal?.operational_store_goal ?? b.current_goal?.operational_store_goal ?? 0}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase font-bold block">EPC Leads</span>
                      <span className="font-black text-amber-700">
                        {b.goal?.monthly_epc_lead_goal ?? b.current_goal?.monthly_epc_lead_goal ?? 0}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase font-bold block">EPC Onboard</span>
                      <span className="font-black text-teal-700">
                        {b.goal?.monthly_epc_onboard_goal ?? b.current_goal?.monthly_epc_onboard_goal ?? 0}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase font-bold block">Network Kits</span>
                      <span className="font-black text-purple-700">
                        {b.goal?.monthly_network_kit_goal ?? b.current_goal?.monthly_network_kit_goal ?? 0}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase font-bold block">Trial Kits (EPC)</span>
                      <span className="font-black text-rose-700">
                        {b.goal?.monthly_trial_kit_goal ?? b.current_goal?.monthly_trial_kit_goal ?? 0}
                      </span>
                    </div>
                  </div>
                  {(b.goal?.notes || b.current_goal?.notes) && (
                    <div className="pt-2 border-t border-slate-200 text-[11px] text-slate-600 italic truncate">
                      "{b.goal?.notes || b.current_goal?.notes}"
                    </div>
                  )}
                </div>

                {/* Onboarding Decision Permissions (Admin Controls) */}
                <div className="mt-3.5 p-3.5 bg-slate-50/90 rounded-2xl border border-slate-200 space-y-2.5">
                  <div className="flex items-center justify-between pb-1.5 border-b border-slate-200/80">
                    <span className="text-[10px] font-black text-slate-700 uppercase tracking-wider">
                      Onboarding Permissions
                    </span>
                    <span className="text-[10px] font-semibold text-slate-400">Decision Control</span>
                  </div>

                  {/* 1. EPC Onboarding Toggle */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${b.can_onboard_epc !== false ? 'bg-teal-500 ring-2 ring-teal-200' : 'bg-slate-300'}`} />
                      <div>
                        <div className="text-xs font-bold text-slate-800 leading-none">EPC Onboarding</div>
                        <div className="text-[10px] text-slate-400 font-medium mt-0.5">
                          {b.can_onboard_epc !== false ? 'Authorized to onboard' : 'Onboarding restricted'}
                        </div>
                      </div>
                    </div>
                    <button
                      type="button"
                      title={b.can_onboard_epc !== false ? 'Click to disable EPC onboarding' : 'Click to enable EPC onboarding'}
                      disabled={togglingMap[`${b.id || b._id}-can_onboard_epc`]}
                      onClick={() => handleTogglePermission(b, 'can_onboard_epc')}
                      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none disabled:opacity-60 ${
                        b.can_onboard_epc !== false ? 'bg-teal-600' : 'bg-slate-300'
                      }`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                          b.can_onboard_epc !== false ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>

                  {/* 2. Franchise Onboarding Toggle */}
                  <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-200/80">
                    <div className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${b.can_onboard_franchise !== false ? 'bg-amber-500 ring-2 ring-amber-200' : 'bg-slate-300'}`} />
                      <div>
                        <div className="text-xs font-bold text-slate-800 leading-none">Franchise Onboarding</div>
                        <div className="text-[10px] text-slate-400 font-medium mt-0.5">
                          {b.can_onboard_franchise !== false ? 'Authorized to onboard' : 'Onboarding restricted'}
                        </div>
                      </div>
                    </div>
                    <button
                      type="button"
                      title={b.can_onboard_franchise !== false ? 'Click to disable Franchise onboarding' : 'Click to enable Franchise onboarding'}
                      disabled={togglingMap[`${b.id || b._id}-can_onboard_franchise`]}
                      onClick={() => handleTogglePermission(b, 'can_onboard_franchise')}
                      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none disabled:opacity-60 ${
                        b.can_onboard_franchise !== false ? 'bg-amber-600' : 'bg-slate-300'
                      }`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                          b.can_onboard_franchise !== false ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>
                </div>
              </div>

              <button
                onClick={() => {
                  setSelectedBde(b);
                  setModalOpen(true);
                }}
                className="w-full py-2.5 bg-blue-50 hover:bg-[#0575B8] text-[#0575B8] hover:text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 transition-all shadow-xs cursor-pointer"
              >
                <FaBullseye /> {b.goal ? 'Update Goals & Targets' : 'Set Initial Goals'}
              </button>
            </div>
          ))}
        </div>
      )}

      <GoalModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        bde={selectedBde}
        onSuccess={fetchBdes}
      />
    </div>
  );
}
