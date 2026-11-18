import React, { useState, useMemo } from 'react';
import {
  X,
  MapPin,
  Search,
  Globe,
  Building2,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  Layers,
  Sparkles,
} from 'lucide-react';

export default function BdeTerritoryViewModal({
  isOpen,
  onClose,
  territory,
  territories = [],
  onSelectState,
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedState, setExpandedState] = useState(null);

  // Build unified state list with districts from state_groups or territories
  const stateList = useMemo(() => {
    if (!territory) return [];

    if (territory.state_groups && territory.state_groups.length > 0) {
      return territory.state_groups;
    }

    if (territories && territories.length > 0) {
      return territories.map((t) => ({
        state_id: t.state_id || t.id,
        state_name: t.state_name,
        priority: t.priority || 'medium',
        district_count: (t.district_names || []).length,
        districts: t.district_names || [],
        clusters: t.cluster_names || [],
      }));
    }

    const assignedStates = territory.assigned_states || (territory.state_name ? territory.state_name.split(', ') : []);
    const allDistricts = territory.district_names || territory.districts || [];

    if (assignedStates.length <= 1) {
      return [
        {
          state_name: assignedStates[0] || 'Assigned Territory',
          priority: territory.priority || 'medium',
          district_count: allDistricts.length,
          districts: allDistricts,
        },
      ];
    }

    return assignedStates.map((st) => ({
      state_name: st.trim(),
      priority: territory.priority || 'medium',
      district_count: 0,
      districts: [],
    }));
  }, [territory, territories]);

  // Filter based on search query
  const filteredStates = useMemo(() => {
    const q = searchTerm.toLowerCase().trim();
    if (!q) return stateList;

    return stateList
      .map((st) => {
        const stateMatches = st.state_name.toLowerCase().includes(q);
        const matchedDistricts = (st.districts || []).filter((d) =>
          d.toLowerCase().includes(q)
        );

        if (stateMatches) {
          return st;
        }
        if (matchedDistricts.length > 0) {
          return {
            ...st,
            matchedDistricts,
          };
        }
        return null;
      })
      .filter(Boolean);
  }, [stateList, searchTerm]);

  if (!isOpen) return null;

  const totalStates = stateList.length;
  const totalDistricts = territory?.district_count || stateList.reduce((acc, s) => acc + (s.district_count || (s.districts ? s.districts.length : 0)), 0);
  const isAllIndia = territory?.is_all_india || totalStates >= 25;

  const toggleExpand = (stateName) => {
    setExpandedState((prev) => (prev === stateName ? null : stateName));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-fadeIn">
      <div
        className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[85vh] animate-scaleUp"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-6 bg-gradient-to-r from-blue-950 via-blue-900 to-indigo-950 text-white relative">
          <button
            onClick={onClose}
            className="absolute top-5 right-5 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white/80 hover:text-white transition"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-2 mb-2">
            <span className="px-3 py-1 bg-white/10 rounded-full text-[11px] font-bold text-amber-300 border border-white/10 flex items-center gap-1.5">
              <Globe className="w-3.5 h-3.5" /> Assigned Regional Jurisdiction
            </span>
            {isAllIndia && (
              <span className="px-2.5 py-0.5 bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 rounded-full text-[11px] font-bold uppercase flex items-center gap-1">
                <Sparkles className="w-3 h-3" /> All India Coverage
              </span>
            )}
          </div>

          <h2 className="text-xl md:text-2xl font-black tracking-tight">
            Assigned States & District Coverage
          </h2>
          <p className="text-xs text-blue-200 mt-1">
            Complete territorial breakdown of states and districts authorized for your BDE operations.
          </p>

          {/* Quick Metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 mt-4 pt-4 border-t border-blue-800/60 text-xs">
            <div className="bg-blue-950/60 p-2.5 rounded-xl border border-blue-800/40">
              <span className="text-[10px] uppercase font-bold text-blue-300 block">Total States</span>
              <span className="text-lg font-black text-white">{totalStates} States</span>
            </div>
            <div className="bg-blue-950/60 p-2.5 rounded-xl border border-blue-800/40">
              <span className="text-[10px] uppercase font-bold text-blue-300 block">Total Districts</span>
              <span className="text-lg font-black text-amber-300">{totalDistricts} Districts</span>
            </div>
            <div className="bg-blue-950/60 p-2.5 rounded-xl border border-blue-800/40 col-span-2 sm:col-span-1">
              <span className="text-[10px] uppercase font-bold text-blue-300 block">Authority Level</span>
              <span className="text-sm font-black text-emerald-300 flex items-center gap-1 mt-0.5">
                <CheckCircle2 className="w-3.5 h-3.5" /> Full Regional
              </span>
            </div>
          </div>
        </div>

        {/* Search Bar */}
        <div className="p-4 bg-slate-50 border-b border-slate-200">
          <div className="flex items-center gap-2 bg-white border border-slate-300 rounded-xl px-3.5 py-2.5 focus-within:border-blue-600 focus-within:ring-2 focus-within:ring-blue-100 transition">
            <Search className="w-4 h-4 text-slate-400 shrink-0" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search assigned state or district (e.g. Gujarat, Pune, Surat)..."
              className="w-full text-xs text-slate-800 focus:outline-none placeholder-slate-400 bg-transparent font-medium"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="text-[10px] text-slate-400 hover:text-slate-600 font-bold uppercase px-1"
              >
                Clear
              </button>
            )}
          </div>
        </div>

        {/* States & Districts List */}
        <div className="p-4 overflow-y-auto divide-y divide-slate-100 space-y-2 flex-1 max-h-[46vh]">
          {filteredStates.length > 0 ? (
            filteredStates.map((st, idx) => {
              const isExpanded = expandedState === st.state_name || (searchTerm && (st.matchedDistricts || st.districts?.length > 0));
              const displayDistricts = st.matchedDistricts || st.districts || [];
              const dCount = st.district_count || displayDistricts.length;

              return (
                <div
                  key={st.state_name || idx}
                  className="pt-2 first:pt-0"
                >
                  <div
                    onClick={() => toggleExpand(st.state_name)}
                    className="flex items-center justify-between p-3 rounded-2xl bg-white hover:bg-slate-50 border border-slate-200 cursor-pointer transition select-none"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                        <MapPin className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-xs font-bold text-slate-900">{st.state_name}</h4>
                          {st.priority && (
                            <span className="text-[9px] uppercase font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">
                              {st.priority}
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                          {st.clusters && st.clusters.length > 0 && (
                            <span className="text-indigo-600 font-bold">{st.clusters.length} Clusters • </span>
                          )}
                          {dCount > 0 ? `${dCount} Districts Assigned` : 'Full State Jurisdiction'}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {onSelectState && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelectState(st.state_name);
                            onClose();
                          }}
                          className="px-2.5 py-1 text-[10px] font-bold text-blue-600 hover:bg-blue-50 rounded-lg border border-blue-200 transition"
                        >
                          Select State
                        </button>
                      )}
                      <div className="p-1 text-slate-400">
                        {isExpanded ? (
                          <ChevronUp className="w-4 h-4" />
                        ) : (
                          <ChevronDown className="w-4 h-4" />
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Expandable Districts Tag Cloud */}
                  {isExpanded && (
                    <div className="mt-2 p-3 bg-slate-50/80 rounded-2xl border border-slate-200/80 animate-fadeIn space-y-2.5">
                      {st.clusters && st.clusters.length > 0 && (
                        <div>
                          <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 block mb-1">
                            Assigned Clusters ({st.clusters.length})
                          </span>
                          <div className="flex flex-wrap gap-1.5">
                            {st.clusters.map((cName, cIdx) => (
                              <span
                                key={cIdx}
                                className="px-2 py-0.5 bg-indigo-50 border border-indigo-200 text-indigo-700 font-bold rounded-lg text-[10px]"
                              >
                                🏢 {cName}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                            Assigned Districts ({displayDistricts.length})
                          </span>
                        </div>
                        {displayDistricts.length > 0 ? (
                          <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto pr-1">
                            {displayDistricts.map((d, dIdx) => (
                              <span
                                key={dIdx}
                                className="px-2 py-0.5 bg-white border border-slate-200 text-slate-700 font-medium rounded-lg text-[11px] shadow-2xs"
                              >
                                {d}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <p className="text-[11px] text-slate-400 italic">
                            All districts in this state are covered under state jurisdiction.
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          ) : (
                  <div className="py-10 text-center">
                    <p className="text-xs font-bold text-slate-400">No matching states or districts found</p>
                    <button
                      onClick={() => setSearchTerm('')}
                      className="mt-2 text-xs text-blue-600 font-bold hover:underline"
                    >
                      Reset search
                    </button>
                  </div>
          )}
                </div>

        {/* Footer */ }
              <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
                <span className="text-[11px] text-slate-500 font-medium">
                  Showing {filteredStates.length} of {totalStates} states
                </span>
                <button
                  onClick={onClose}
                  className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl text-xs transition"
                >
                  Close
                </button>
              </div>
      </div>
      </div>
      );
}
