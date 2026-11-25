import React, { useState, useEffect } from 'react';
import {
  FaMapMarkedAlt,
  FaSearch,
  FaPlus,
  FaCheck,
  FaCalendarAlt,
  FaExclamationCircle,
  FaLayerGroup,
  FaTimes,
} from 'react-icons/fa';
import { bdeApi } from '../../../api/bdeApi';
import Loader from '../../../components/Loader';
import TerritoryModal from './TerritoryModal';

function BdeTerritoryCard({ bde, onManageTerritory }) {
  const b = bde;
  const territories = b.territories || [];
  const assignedStates = (b.assigned_states && b.assigned_states.length > 0)
    ? b.assigned_states
    : (b.state_name && b.state_name !== 'None Assigned' && b.state_name !== 'Unassigned'
      ? b.state_name.split(',').map(s => s.trim()).filter(Boolean)
      : []);

  const hasMultipleStates = assignedStates.length > 1;
  const [selectedStateTab, setSelectedStateTab] = useState(assignedStates[0] || '');

  // Keep selected tab in sync if assigned states change
  useEffect(() => {
    if (assignedStates.length > 0 && (!selectedStateTab || !assignedStates.includes(selectedStateTab))) {
      setSelectedStateTab(assignedStates[0]);
    }
  }, [assignedStates, selectedStateTab]);

  // Determine districts to display based on active state tab
  let displayedDistricts = [];
  let displayedDistrictsCount = 0;

  if (hasMultipleStates) {
    if (selectedStateTab === '__ALL__') {
      displayedDistricts = b.assigned_districts || [];
      displayedDistrictsCount = displayedDistricts.length;
    } else {
      const matchTerritory = territories.find(
        t => t.state_name?.toLowerCase().trim() === selectedStateTab?.toLowerCase().trim()
      );
      if (matchTerritory && matchTerritory.district_names) {
        displayedDistricts = matchTerritory.district_names;
      } else {
        displayedDistricts = b.assigned_districts || [];
      }
      displayedDistrictsCount = displayedDistricts.length;
    }
  } else {
    displayedDistricts = b.assigned_districts || [];
    displayedDistrictsCount = b.assigned_districts_count || displayedDistricts.length || 0;
  }

  return (
    <div className="p-5 bg-white rounded-3xl border border-slate-200 shadow-sm hover:shadow-md hover:border-blue-300 transition-all flex flex-col justify-between space-y-4">
      <div>
        {/* Top Meta */}
        <div className="flex items-center justify-between">
          <span className="font-mono text-xs font-bold text-[#0575B8] bg-blue-50 px-2.5 py-0.5 rounded-lg border border-blue-100">
            {b.bde_id}
          </span>
          <div className="flex items-center gap-1.5">
            {hasMultipleStates && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                {assignedStates.length} States
              </span>
            )}
            <span
              className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${b.status === 'active'
                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                  : 'bg-amber-100 text-amber-900 border border-amber-300'
                }`}
            >
              {b.status}
            </span>
          </div>
        </div>

        {/* Name & Contact */}
        <h3 className="text-base font-bold text-slate-900 mt-2">{b.full_name}</h3>
        <p className="text-xs text-slate-500 truncate font-medium">{b.email}</p>

        {/* Territory Summary Box */}
        <div className="mt-4 p-3.5 bg-slate-50 rounded-2xl border border-slate-200 space-y-2.5">
          {/* Assigned State Header */}
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-500 uppercase text-[10px] font-bold">
              {hasMultipleStates ? 'Assigned States' : 'Assigned State'}
            </span>
            <span className="font-bold text-slate-900 text-right truncate max-w-[180px]">
              {assignedStates.length > 0 ? (
                hasMultipleStates ? (
                  <span className="text-[#0575B8] font-bold">
                    {assignedStates.length} States Assigned
                  </span>
                ) : (
                  assignedStates[0]
                )
              ) : (
                'None Assigned'
              )}
            </span>
          </div>

          {/* Multi-State Tab Selector */}
          {hasMultipleStates && (
            <div className="flex flex-wrap gap-1 pt-0.5">
              {assignedStates.map((stName, idx) => {
                const isSelected = selectedStateTab === stName;
                const stateTerr = territories.find(
                  t => t.state_name?.toLowerCase().trim() === stName.toLowerCase().trim()
                );
                const count = stateTerr?.district_names?.length || 0;

                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setSelectedStateTab(stName)}
                    className={`px-2 py-1 rounded-lg text-[10px] font-bold transition cursor-pointer flex items-center gap-1 ${isSelected
                        ? 'bg-[#0575B8] text-white shadow-xs'
                        : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
                      }`}
                  >
                    <span>{stName}</span>
                    <span className={`px-1 py-0.2 rounded text-[9px] ${isSelected ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
                      }`}>
                      {count}
                    </span>
                  </button>
                );
              })}

              <button
                type="button"
                onClick={() => setSelectedStateTab('__ALL__')}
                className={`px-2 py-1 rounded-lg text-[10px] font-bold transition cursor-pointer ${selectedStateTab === '__ALL__'
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                  }`}
              >
                All ({b.assigned_districts_count || 0})
              </button>
            </div>
          )}

          {/* Assigned Districts Count & Badges */}
          <div className="space-y-1 pt-1">
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-slate-500 font-medium">
                {hasMultipleStates && selectedStateTab !== '__ALL__'
                  ? `Districts in ${selectedStateTab}:`
                  : 'Assigned Districts:'}
              </span>
              <span className="font-bold text-indigo-700">{displayedDistrictsCount}</span>
            </div>

            {displayedDistricts && displayedDistricts.length > 0 ? (
              <div className="flex flex-wrap gap-1 max-h-20 overflow-y-auto pt-1">
                {displayedDistricts.map((d, i) => (
                  <span
                    key={i}
                    className="px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded-lg text-[10px] font-bold border border-indigo-100"
                  >
                    {d}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-[11px] text-slate-400 italic">No districts assigned</p>
            )}
          </div>

          {/* Assigned Clusters */}
          {(() => {
            const activeTerr = (hasMultipleStates && selectedStateTab !== '__ALL__')
              ? territories.find(t => t.state_name?.toLowerCase().trim() === selectedStateTab?.toLowerCase().trim())
              : null;
            const clusterList = activeTerr ? (activeTerr.cluster_names || []) : (territories.flatMap(t => t.cluster_names || []));
            const uniqueClusters = [...new Set(clusterList)];

            if (uniqueClusters.length === 0) return null;

            return (
              <div className="space-y-1 pt-1.5 border-t border-slate-200">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-slate-500 font-medium">
                    {hasMultipleStates && selectedStateTab !== '__ALL__' ? `Clusters in ${selectedStateTab}:` : 'Assigned Clusters:'}
                  </span>
                  <span className="font-bold text-indigo-700">{uniqueClusters.length}</span>
                </div>
                <div className="flex flex-wrap gap-1 max-h-16 overflow-y-auto">
                  {uniqueClusters.map((cName, ci) => (
                    <span
                      key={ci}
                      className="px-2 py-0.5 bg-indigo-100 text-indigo-800 rounded-lg text-[10px] font-bold border border-indigo-200"
                    >
                      🏢 {cName}
                    </span>
                  ))}
                </div>
              </div>
            );
          })()}
        </div>
      </div>

      {/* Action Button */}
      <button
        onClick={() => onManageTerritory(b)}
        className="w-full py-2.5 bg-blue-50 hover:bg-[#0575B8] text-[#0575B8] hover:text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 transition-all shadow-xs cursor-pointer"
      >
        <FaMapMarkedAlt /> Manage Territory & Clusters
      </button>
    </div>
  );
}

export default function TerritoryAssignment({ moduleUniqueId = 'ADM_BDE_MGMT' }) {
  const [bdes, setBdes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedBde, setSelectedBde] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetchBdes();
  }, []);

  const fetchBdes = async () => {
    try {
      setLoading(true);
      const res = await bdeApi.listBdes({ limit: 50 }, moduleUniqueId);
      setBdes(res.data || []);
    } catch (err) {
      console.error('Failed to load BDEs for territory management', err);
    } finally {
      setLoading(false);
    }
  };

  const filteredBdes = bdes.filter(b => {
    const q = search.toLowerCase().trim();
    if (!q) return true;

    const nameMatch = b.full_name?.toLowerCase().includes(q);
    const idMatch = b.bde_id?.toLowerCase().includes(q);
    const stateMatch = b.state_name?.toLowerCase().includes(q);
    const statesArrayMatch = Array.isArray(b.assigned_states) && b.assigned_states.some(s => s?.toLowerCase().includes(q));
    const districtsMatch = Array.isArray(b.assigned_districts) && b.assigned_districts.some(d => d?.toLowerCase().includes(q));

    return nameMatch || idMatch || stateMatch || statesArrayMatch || districtsMatch;
  });

  return (
    <div className="space-y-6 text-slate-900 font-sans">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">
              Territory & District Assignments
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#0575B8]/10 text-[#0575B8] border border-blue-200">
              Multi-State Ready
            </span>
          </div>
          <p className="text-sm text-slate-500 font-medium mt-0.5">
            Assign and manage authorized state jurisdictions and district quotas for BDE executives.
          </p>
        </div>
      </div>

      {/* Search */}
      <div className="p-3.5 bg-white rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 flex-1">
          <FaSearch className="text-slate-400 text-sm ml-2 shrink-0" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by BDE name, ID, or assigned state (e.g. Gujarat, Maharashtra)..."
            className="w-full bg-transparent text-slate-900 text-sm font-medium focus:outline-none placeholder-slate-400"
          />
        </div>
        {search && (
          <button
            onClick={() => setSearch('')}
            className="text-xs text-slate-400 hover:text-slate-600 mr-2 cursor-pointer"
          >
            Clear
          </button>
        )}
      </div>

      {/* BDE Territory Cards */}
      {loading ? (
        <div className="py-20">
          <Loader text="Loading territory assignments..." />
        </div>
      ) : filteredBdes.length === 0 ? (
        <div className="py-16 text-center text-slate-500 bg-white rounded-3xl border border-slate-200 shadow-xs">
          No BDE executives found matching search criteria.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredBdes.map(b => (
            <BdeTerritoryCard
              key={b.id || b._id}
              bde={b}
              onManageTerritory={(targetBde) => {
                setSelectedBde(targetBde);
                setModalOpen(true);
              }}
            />
          ))}
        </div>
      )}

      {/* Territory Management Modal */}
      <TerritoryModal
        isOpen={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setSelectedBde(null);
        }}
        bde={selectedBde}
        onSuccess={fetchBdes}
      />
    </div>
  );
}
