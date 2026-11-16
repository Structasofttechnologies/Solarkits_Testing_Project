import React, { useState, useEffect } from "react";
import {
  FaWarehouse,
  FaCoins,
  FaChartLine,
  FaCog,
  FaCheckCircle,
  FaPlus,
  FaPercentage,
  FaBalanceScale,
  FaHandHoldingUsd,
  FaMapMarkedAlt,
  FaExclamationTriangle,
  FaTruck,
  FaBoxes,
  FaClock,
  FaFilter,
  FaBolt
} from "react-icons/fa";
import {
  getWarehouseTriggerConfig,
  updateWarehouseTriggerConfig,
  getWarehouseOpportunities,
  createWarehouseOpportunity,
  updateOpportunityStatus,
  getStates,
  getClusters,
  getFranchiseClustersList
} from "../../api/accounts";

const STATE_CLUSTER_MAP = {
  "Uttar Pradesh": [
    "Lucknow-Awadh Cluster",
    "Varanasi-Purvanchal Cluster",
    "Kanpur-Bundelkhand Cluster",
    "Agra-Braj Cluster",
    "Noida-NCR Industrial Cluster",
    "Prayagraj Cluster",
    "Gorakhpur Cluster"
  ],
  "Gujarat": [
    "Porbandar Cluster",
    "Devbhumi Dwarka cluster",
    "Rajkot Cluster",
    "Ahmedabad-Sanand Logistics Cluster",
    "Surat-South Gujarat Cluster",
    "Vadodara Cluster"
  ],
  "Maharashtra": [
    "Pune & Western Maharashtra Cluster",
    "Bhiwandi-Thane Logistics Hub",
    "Pune-PCMC Industrial Cluster",
    "Nagpur-Vidarbha Cluster",
    "Nashik-Khandesh Cluster",
    "Aurangabad Hub"
  ],
  "Rajasthan": [
    "Jaipur-Marwar Cluster",
    "Jodhpur Solar Belt Cluster",
    "Kota-Hadoti Cluster",
    "Udaipur-Mewar Cluster"
  ],
  "Madhya Pradesh": [
    "Indore-Malwa Cluster",
    "Bhopal-Narmada Cluster",
    "Jabalpur-Mahakoshal Cluster",
    "Gwalior-Chambal Cluster"
  ],
  "Delhi NCR": [
    "Central Delhi - Okhla Hub",
    "Gurgaon-Manesar Tech Hub",
    "Faridabad Industrial Cluster"
  ],
  "Bihar": [
    "Patna-Magadh Cluster",
    "Muzaffarpur-Tirhut Cluster"
  ],
  "Haryana": [
    "Karnal-GT Road Cluster",
    "Hisar-Rohtak Cluster"
  ],
  "Punjab": [
    "Ludhiana-Jalandhar Cluster",
    "Mohali-Patiala Cluster"
  ]
};

export default function WarehouseFinanceModule() {
  const [activeTab, setActiveTab] = useState("opportunities");
  const [triggerConfig, setTriggerConfig] = useState(null);
  const [opportunities, setOpportunities] = useState([]);
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState(null);
  const [selectedOpp, setSelectedOpp] = useState(null);

  // Master Filters
  const [filterCluster, setFilterCluster] = useState("ALL");
  const [filterState, setFilterState] = useState("ALL");
  const [filterStatus, setFilterStatus] = useState("ALL");

  // Dynamic Geography & Live Franchise Clusters
  const [franchiseClusters, setFranchiseClusters] = useState([]);
  const [liveStates, setLiveStates] = useState([]);
  const [liveClusters, setLiveClusters] = useState([]);
  const [loadingClusters, setLoadingClusters] = useState(false);

  // New Opportunity Modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [newOppData, setNewOppData] = useState({
    cluster_name: "Lucknow-Awadh Cluster",
    state: "Uttar Pradesh",
    district: "Lucknow",
    current_monthly_turnover: 2800000,
    current_monthly_kits: 45,
    pipeline_order_value: 4500000,
    active_epc_count: 18,
    current_avg_delivery_tat_days: 5.8,
    current_delivery_cost_pct: 7.5,
    projected_monthly_delivery_savings: 160000,
    admin_notes: ""
  });
  const [isCustomCluster, setIsCustomCluster] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const [cfgRes, oppRes, fcRes] = await Promise.all([
        getWarehouseTriggerConfig().catch(() => null),
        getWarehouseOpportunities().catch(() => null),
        getFranchiseClustersList().catch(() => null)
      ]);
      setTriggerConfig(cfgRes?.data || null);
      const rawOpps = oppRes?.data || [];
      setOpportunities(rawOpps);
      if (rawOpps.length > 0 && !selectedOpp) {
        setSelectedOpp(rawOpps[0]);
      }
      if (fcRes?.data && Array.isArray(fcRes.data)) {
        setFranchiseClusters(fcRes.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    // Load live states from database
    getStates()
      .then((res) => {
        const states = res?.data || res || [];
        if (Array.isArray(states) && states.length > 0) {
          setLiveStates(states);
          const initial = states.find(s => s.name === "Uttar Pradesh") || states[0];
          if (initial) {
            getClusters(initial.id || initial._id)
              .then(cRes => {
                const cl = cRes?.data || cRes || [];
                if (Array.isArray(cl) && cl.length > 0) {
                  setLiveClusters(cl);
                  setNewOppData(prev => ({
                    ...prev,
                    state: initial.name,
                    cluster_name: cl[0]?.name || ""
                  }));
                } else {
                  const fallbackList = (STATE_CLUSTER_MAP[initial.name] || []).map(c => ({ name: c }));
                  setLiveClusters(fallbackList);
                }
              })
              .catch(() => {
                const fallbackList = (STATE_CLUSTER_MAP[initial.name] || []).map(c => ({ name: c }));
                setLiveClusters(fallbackList);
              });
          }
        } else {
          setLiveStates(Object.keys(STATE_CLUSTER_MAP).map(st => ({ name: st })));
          setLiveClusters((STATE_CLUSTER_MAP["Uttar Pradesh"] || []).map(c => ({ name: c })));
        }
      })
      .catch(() => {
        setLiveStates(Object.keys(STATE_CLUSTER_MAP).map(st => ({ name: st })));
        setLiveClusters((STATE_CLUSTER_MAP["Uttar Pradesh"] || []).map(c => ({ name: c })));
      });
  }, []);

  const handleStateSelect = async (stateName) => {
    setLoadingClusters(true);
    setIsCustomCluster(false);
    try {
      const stateObj = liveStates.find(s => s.name === stateName);
      let clList = [];
      if (stateObj && (stateObj.id || stateObj._id)) {
        const res = await getClusters(stateObj.id || stateObj._id);
        clList = res?.data || res || [];
      }
      if (!clList || clList.length === 0) {
        clList = (STATE_CLUSTER_MAP[stateName] || []).map(c => ({ name: c }));
      }
      setLiveClusters(clList);
      const firstCluster = clList[0]?.name || (typeof clList[0] === 'string' ? clList[0] : "");
      setNewOppData(prev => ({
        ...prev,
        state: stateName,
        cluster_name: firstCluster
      }));
    } catch {
      const fallbackList = (STATE_CLUSTER_MAP[stateName] || []).map(c => ({ name: c }));
      setLiveClusters(fallbackList);
      setNewOppData(prev => ({
        ...prev,
        state: stateName,
        cluster_name: fallbackList[0]?.name || ""
      }));
    } finally {
      setLoadingClusters(false);
    }
  };

  const handleUpdateStatus = async (id, status) => {
    try {
      await updateOpportunityStatus(id, { status });
      setNotice({ type: "success", text: `Cluster opportunity status updated to ${status}.` });
      loadData();
    } catch (err) {
      setNotice({ type: "error", text: err.message });
    }
  };

  const handleSaveTriggerConfig = async (e) => {
    e.preventDefault();
    try {
      await updateWarehouseTriggerConfig(triggerConfig);
      setNotice({ type: "success", text: "Warehouse development triggers updated successfully!" });
      loadData();
    } catch (err) {
      setNotice({ type: "error", text: err.message });
    }
  };

  const handleCreateOpp = async (e) => {
    e.preventDefault();
    try {
      const res = await createWarehouseOpportunity(newOppData);
      setNotice({ type: "success", text: res.message || "New warehouse opportunity evaluated!" });
      setShowAddModal(false);
      loadData();
    } catch (err) {
      setNotice({ type: "error", text: err.message });
    }
  };

  const formatInr = (val) => `₹${Number(val || 0).toLocaleString("en-IN")}`;

  // Evaluate dynamic triggers for all opportunities
  const minSales = Number(triggerConfig?.min_monthly_sales_inr || 2500000);
  const minKits = Number(triggerConfig?.min_monthly_kits_sold || 40);
  const maxTat = Number(triggerConfig?.max_delivery_tat_days || 4);
  const maxCost = Number(triggerConfig?.max_delivery_cost_ratio_pct || 6.5);

  const evaluatedOpportunities = opportunities.map((opp) => {
    const isSalesMet = (opp.current_monthly_turnover || 0) >= minSales;
    const isKitsMet = (opp.current_monthly_kits || 0) >= minKits;
    const isVolumeMet = isSalesMet || isKitsMet;

    const isTatBreached = (opp.current_avg_delivery_tat_days || 0) > maxTat;
    const isCostBreached = (opp.current_delivery_cost_pct || 0) > maxCost;
    const isLogisticsIssue = isTatBreached || isCostBreached;

    let trigger_status = 'DEVELOPING';
    let trigger_color = 'slate';
    let trigger_badge = 'Developing Cluster';

    if (isVolumeMet) {
      if (isLogisticsIssue) {
        trigger_status = 'CRITICAL_WAREHOUSE_NEEDED';
        trigger_color = 'red';
        trigger_badge = '🚨 CRITICAL: Warehouse Needed (SLA/Cost Breach)';
      } else {
        trigger_status = 'HEALTHY_GROWTH_TARGET';
        trigger_color = 'green';
        trigger_badge = '✅ TARGET MET: Healthy Growth (Loan Eligible)';
      }
    }

    return {
      ...opp,
      isSalesMet,
      isKitsMet,
      isVolumeMet,
      isTatBreached,
      isCostBreached,
      isLogisticsIssue,
      isCritical: isVolumeMet && isLogisticsIssue,
      isHealthy: isVolumeMet && !isLogisticsIssue,
      trigger_status,
      trigger_color,
      trigger_badge,
      minSales,
      minKits,
      maxTat,
      maxCost
    };
  });

  const criticalClusters = evaluatedOpportunities.filter(o => o.isCritical);
  const criticalCount = criticalClusters.length;

  // Collect unique cluster names and states for Master Filters
  const allClusterNames = Array.from(new Set([
    ...evaluatedOpportunities.map(o => o.cluster_name),
    ...franchiseClusters.map(fc => fc.cluster_name)
  ])).filter(Boolean);

  const uniqueStates = Array.from(new Set([
    ...evaluatedOpportunities.map(o => o.state),
    ...franchiseClusters.map(fc => fc.state_name)
  ])).filter(Boolean);

  // Filtered Opportunities based on Master Filters
  const filteredOpportunities = evaluatedOpportunities.filter((opp) => {
    if (filterCluster !== "ALL" && opp.cluster_name !== filterCluster) return false;
    if (filterState !== "ALL" && opp.state !== filterState) return false;
    if (filterStatus !== "ALL" && opp.trigger_status !== filterStatus) return false;
    return true;
  });

  return (
    <div className="p-4 md:p-6 space-y-6 bg-slate-50 min-h-screen text-slate-800">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 bg-blue-100 text-blue-700 rounded-lg text-lg">
              <FaWarehouse />
            </span>
            <h1 className="text-2xl font-bold text-slate-900">Warehouse Logistics & Expansion Module</h1>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Automated cluster growth triggers, CAPEX/OPEX cost modeling, delivery freight savings analysis, and expansion viability.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold shadow-sm transition"
          >
            <FaPlus /> Evaluate Cluster Opportunity
          </button>
        </div>
      </div>

      {/* Notice notification */}
      {notice && (
        <div className={`p-4 rounded-xl flex items-center justify-between ${notice.type === "success" ? "bg-emerald-50 text-emerald-800 border border-emerald-200" : "bg-rose-50 text-rose-800 border border-rose-200"}`}>
          <span>{notice.text}</span>
          <button onClick={() => setNotice(null)} className="font-bold text-sm px-2">✕</button>
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-slate-200 bg-white px-4 rounded-xl shadow-sm gap-2">
        <button
          onClick={() => setActiveTab("opportunities")}
          className={`py-3.5 px-4 font-semibold text-sm border-b-2 transition-colors ${
            activeTab === "opportunities"
              ? "border-blue-600 text-blue-700 font-bold"
              : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300"
          }`}
        >
          Cluster Opportunity Radar & Expansion Feasibility
        </button>
        <button
          onClick={() => setActiveTab("triggers")}
          className={`py-3.5 px-4 font-semibold text-sm border-b-2 transition-colors ${
            activeTab === "triggers"
              ? "border-blue-600 text-blue-700 font-bold"
              : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300"
          }`}
        >
          Expansion Trigger & Financial Threshold Settings
        </button>
      </div>

      {/* TAB 1: OPPORTUNITIES & FEASIBILITY */}
      {activeTab === "opportunities" && (
        <div className="space-y-6">
          {/* CRITICAL WAREHOUSE EXPANSION ALERT BANNER */}
          {criticalCount > 0 && (
            <div className="p-4 bg-gradient-to-r from-rose-500/10 via-rose-500/5 to-transparent border-l-4 border-rose-600 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-sm">
              <div className="flex items-start gap-3">
                <span className="p-2.5 bg-rose-100 text-rose-700 rounded-xl text-xl mt-0.5 animate-pulse">
                  <FaExclamationTriangle />
                </span>
                <div>
                  <h4 className="font-bold text-rose-950 text-sm flex items-center gap-2">
                    <span>🚨 URGENT WAREHOUSE EXPANSION REQUIRED</span>
                    <span className="px-2.5 py-0.5 rounded-full text-xs bg-rose-600 text-white font-bold">
                      {criticalCount} Clusters Triggered
                    </span>
                  </h4>
                  <p className="text-xs text-rose-800 mt-1 leading-relaxed">
                    Logistics Alert: High solar kit demand reached, but Delivery TAT (up to 6.2 Days &gt; {maxTat}d max) and Freight Cost Ratio (up to 8.4% &gt; {maxCost}% max) exceed national thresholds! Open local warehouses in these clusters to stop delivery delays and logistics loss.
                  </p>
                </div>
              </div>
              <span className="px-3.5 py-1.5 bg-rose-600 text-white font-bold text-xs rounded-xl whitespace-nowrap self-start md:self-center shadow-sm">
                Action Required
              </span>
            </div>
          )}

          {/* MASTER CLUSTER & STATE FILTER BAR */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2">
              <span className="p-1.5 bg-blue-50 text-blue-600 rounded-lg">
                <FaFilter />
              </span>
              <span className="font-bold text-slate-800 text-sm">Cluster Master Filter</span>
              <span className="text-slate-400">|</span>
              <span className="text-slate-500 text-[11px]">Live Synced with Franchise Cluster Manager</span>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <div>
                <label className="text-[11px] font-semibold text-slate-500 mr-2">Cluster:</label>
                <select
                  value={filterCluster}
                  onChange={(e) => setFilterCluster(e.target.value)}
                  className="border border-slate-200 rounded-xl px-3 py-1.5 font-semibold text-xs bg-slate-50 text-slate-800 focus:bg-white"
                >
                  <option value="ALL">All Franchise Clusters ({allClusterNames.length})</option>
                  {allClusterNames.map((cName) => (
                    <option key={cName} value={cName}>{cName}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-[11px] font-semibold text-slate-500 mr-2">State:</label>
                <select
                  value={filterState}
                  onChange={(e) => setFilterState(e.target.value)}
                  className="border border-slate-200 rounded-xl px-3 py-1.5 font-semibold text-xs bg-slate-50 text-slate-800 focus:bg-white"
                >
                  <option value="ALL">All States ({uniqueStates.length})</option>
                  {uniqueStates.map((st) => (
                    <option key={st} value={st}>{st}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-[11px] font-semibold text-slate-500 mr-2">Trigger Status:</label>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="border border-slate-200 rounded-xl px-3 py-1.5 font-semibold text-xs bg-slate-50 text-slate-800 focus:bg-white"
                >
                  <option value="ALL">All Triggers</option>
                  <option value="CRITICAL_WAREHOUSE_NEEDED">🚨 Critical: Warehouse Needed (SLA/Cost Breach)</option>
                  <option value="HEALTHY_GROWTH_TARGET">✅ Target Met: Healthy Ops (Expansion Ready)</option>
                  <option value="DEVELOPING">⚡ Developing Clusters</option>
                </select>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left: Opportunities List with Dynamic Highlighting */}
            <div className="lg:col-span-1 space-y-3">
              <div className="flex justify-between items-center">
                <h3 className="font-bold text-sm text-slate-700">
                  Cluster Opportunity Radar ({filteredOpportunities.length})
                </h3>
                <span className="text-[11px] text-slate-400">Click to view feasibility</span>
              </div>

              {filteredOpportunities.map((opp) => {
                const isSelected = selectedOpp?._id === opp._id || selectedOpp?.cluster_name === opp.cluster_name;
                const isCritical = opp.isCritical;
                const isHealthy = opp.isHealthy;

                // Highlighting style according to status
                let cardStyle = "bg-white border-slate-200 hover:border-slate-300";
                if (isSelected) {
                  cardStyle = "bg-blue-50/90 border-blue-500 shadow-md ring-2 ring-blue-400";
                } else if (isCritical) {
                  cardStyle = "bg-rose-50/60 border-2 border-rose-500 shadow-sm shadow-rose-200 hover:bg-rose-50";
                } else if (isHealthy) {
                  cardStyle = "bg-emerald-50/50 border-2 border-emerald-500 shadow-sm shadow-emerald-200 hover:bg-emerald-50";
                }

                return (
                  <div
                    key={opp._id || opp.cluster_name}
                    onClick={() => setSelectedOpp(opp)}
                    className={`p-4 rounded-2xl border cursor-pointer transition-all ${cardStyle}`}
                  >
                    <div className="flex justify-between items-start gap-2">
                      <div>
                        <span className="font-bold text-slate-900 text-sm block leading-snug">{opp.cluster_name}</span>
                        <p className="text-xs text-slate-500 mt-0.5">{opp.district}, {opp.state}</p>
                      </div>
                      <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full whitespace-nowrap ${
                        isCritical ? "bg-rose-600 text-white animate-pulse" :
                        isHealthy ? "bg-emerald-600 text-white" :
                        "bg-slate-200 text-slate-700"
                      }`}>
                        Score: {opp.growth_score || 80}/100
                      </span>
                    </div>

                    {/* Dynamic Status Pill */}
                    <div className="mt-2.5">
                      {isCritical ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-rose-100 text-rose-800 rounded-lg text-[11px] font-bold border border-rose-300">
                          <FaExclamationTriangle className="text-rose-600 text-[10px]" />
                          🚨 Warehouse Needed (SLA/Cost Breach)
                        </span>
                      ) : isHealthy ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald-100 text-emerald-800 rounded-lg text-[11px] font-bold border border-emerald-300">
                          <FaCheckCircle className="text-emerald-600 text-[10px]" />
                          ✅ Target Met: Healthy Ops (Expansion Ready)
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-slate-100 text-slate-600 rounded-lg text-[11px] font-medium border border-slate-200">
                          <FaBolt className="text-amber-500 text-[10px]" />
                          ⚡ Developing Cluster (Volume Building)
                        </span>
                      )}
                    </div>

                    {/* Operational Benchmarks */}
                    <div className="mt-3 grid grid-cols-2 gap-2 text-[11px] pt-2 border-t border-slate-100">
                      <div>
                        <span className="text-slate-400 block text-[10px]">Monthly Revenue:</span>
                        <span className="font-bold text-slate-800">{formatInr(opp.current_monthly_turnover)}</span>
                        <span className="text-[10px] text-slate-500 block">({opp.current_monthly_kits} Kits/Mo)</span>
                      </div>
                      <div className="text-right">
                        <span className="text-slate-400 block text-[10px]">Delivery TAT & Freight:</span>
                        <span className={`font-bold block ${opp.isTatBreached ? "text-rose-600" : "text-emerald-600"}`}>
                          {opp.current_avg_delivery_tat_days}d TAT {opp.isTatBreached && "⚠️"}
                        </span>
                        <span className={`text-[10px] block ${opp.isCostBreached ? "text-rose-600 font-bold" : "text-slate-500"}`}>
                          {opp.current_delivery_cost_pct}% Freight {opp.isCostBreached && "⚠️"}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Right: Detailed Financial & Loan Evaluation */}
            {selectedOpp && (
              <div className="lg:col-span-2 space-y-6">
                {/* Hero banner for selected cluster */}
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-blue-600 uppercase tracking-wider">Opportunity Detail</span>
                        {selectedOpp.isCritical && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-600 text-white animate-pulse">
                            🚨 Critical Warehouse Need
                          </span>
                        )}
                        {selectedOpp.isHealthy && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-600 text-white">
                            ✅ Healthy Growth Target
                          </span>
                        )}
                      </div>
                      <h2 className="text-xl font-bold text-slate-900 mt-0.5">{selectedOpp.cluster_name}</h2>
                      <p className="text-xs text-slate-500">{selectedOpp.state} • Active EPCs: {selectedOpp.active_epc_count}</p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleUpdateStatus(selectedOpp._id, "APPROVED_FOR_EXPANSION")}
                        className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow-sm transition"
                      >
                        Approve Expansion
                      </button>
                      <button
                        onClick={() => handleUpdateStatus(selectedOpp._id, "SHELVED")}
                        className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition"
                      >
                        Shelve
                      </button>
                    </div>
                  </div>

                  {/* DYNAMIC TRIGGER THRESHOLD ASSESSMENT BOX */}
                  <div className={`p-4 rounded-xl border text-xs space-y-2.5 ${
                    selectedOpp.isCritical ? "bg-rose-50 border-rose-300 text-rose-900" :
                    selectedOpp.isHealthy ? "bg-emerald-50 border-emerald-300 text-emerald-900" :
                    "bg-slate-50 border-slate-200 text-slate-800"
                  }`}>
                    <div className="flex items-center justify-between font-bold border-b pb-1.5">
                      <span className="flex items-center gap-1.5">
                        <FaBolt className={selectedOpp.isCritical ? "text-rose-600" : selectedOpp.isHealthy ? "text-emerald-600" : "text-amber-500"} />
                        National Warehouse Expansion Trigger Assessment
                      </span>
                      <span className="text-[11px] font-semibold">
                        Policy Rules: Min Rev: {formatInr(minSales)}, Min Kits: {minKits}, Max TAT: {maxTat}d, Max Freight: {maxCost}%
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                      <div className="bg-white/80 p-2.5 rounded-lg border border-slate-100">
                        <span className="text-slate-500 text-[10px] block font-medium">1. Solar Volume Trigger</span>
                        <p className="font-bold text-slate-800 text-sm mt-0.5">
                          {formatInr(selectedOpp.current_monthly_turnover)} / {selectedOpp.current_monthly_kits} Kits
                        </p>
                        <span className={`text-[10px] font-bold block mt-1 ${selectedOpp.isVolumeMet ? "text-emerald-700" : "text-slate-500"}`}>
                          {selectedOpp.isVolumeMet ? "✅ Volume Threshold Reached" : "⏳ Below Volume Threshold"}
                        </span>
                      </div>

                      <div className="bg-white/80 p-2.5 rounded-lg border border-slate-100">
                        <span className="text-slate-500 text-[10px] block font-medium">2. Delivery Lead Time (TAT)</span>
                        <p className={`font-bold text-sm mt-0.5 ${selectedOpp.isTatBreached ? "text-rose-700" : "text-emerald-700"}`}>
                          {selectedOpp.current_avg_delivery_tat_days} Days (Max: {maxTat}d)
                        </p>
                        <span className={`text-[10px] font-bold block mt-1 ${selectedOpp.isTatBreached ? "text-rose-700" : "text-emerald-700"}`}>
                          {selectedOpp.isTatBreached ? `🚨 SLA EXCEEDED (+${(selectedOpp.current_avg_delivery_tat_days - maxTat).toFixed(1)}d lag)` : "✅ Delivery On-Time"}
                        </span>
                      </div>

                      <div className="bg-white/80 p-2.5 rounded-lg border border-slate-100">
                        <span className="text-slate-500 text-[10px] block font-medium">3. Freight / Logistics Cost Ratio</span>
                        <p className={`font-bold text-sm mt-0.5 ${selectedOpp.isCostBreached ? "text-rose-700" : "text-emerald-700"}`}>
                          {selectedOpp.current_delivery_cost_pct}% (Max: {maxCost}%)
                        </p>
                        <span className={`text-[10px] font-bold block mt-1 ${selectedOpp.isCostBreached ? "text-rose-700" : "text-emerald-700"}`}>
                          {selectedOpp.isCostBreached ? `🚨 HIGH FREIGHT (+${(selectedOpp.current_delivery_cost_pct - maxCost).toFixed(1)}% excess)` : "✅ Freight Optimal"}
                        </span>
                      </div>
                    </div>

                    {/* Actionable Advice based on status */}
                    <div className="pt-2 text-xs font-medium">
                      {selectedOpp.isCritical ? (
                        <p className="text-rose-800 font-semibold bg-white/70 p-2.5 rounded-lg border border-rose-200">
                          🚨 <strong>Immediate Warehouse Establishment Recommended:</strong> In {selectedOpp.cluster_name}, solar kits orders are high ({selectedOpp.current_monthly_kits} Kits/Mo), but delivery takes {selectedOpp.current_avg_delivery_tat_days} days and transport costs eat {selectedOpp.current_delivery_cost_pct}% of value! Opening a local warehouse here will cut delivery TAT to 24-48 hours and save {formatInr(selectedOpp.projected_monthly_delivery_savings)} every month.
                        </p>
                      ) : selectedOpp.isHealthy ? (
                        <p className="text-emerald-800 font-semibold bg-white/70 p-2.5 rounded-lg border border-emerald-200">
                          ✅ <strong>Prime Regional Expansion Target:</strong> Volume is robust ({formatInr(selectedOpp.current_monthly_turnover)}) and logistics are smooth ({selectedOpp.current_avg_delivery_tat_days}d TAT). Strong operational performance qualifies this cluster for immediate warehouse establishment and localized stock staging.
                        </p>
                      ) : (
                        <p className="text-slate-600 bg-white/70 p-2.5 rounded-lg border border-slate-200">
                          ⚡ <strong>Developing Cluster:</strong> Cluster sales have not yet crossed the {formatInr(minSales)} / {minKits} Kits threshold. Continue BDE lead acquisition and dealer activations before committing warehouse CAPEX.
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Operational Metrics */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 border-t border-slate-100 text-xs">
                    <div>
                      <span className="text-slate-400 block">Current Delivery TAT</span>
                      <span className="font-bold text-slate-800 text-sm">{selectedOpp.current_avg_delivery_tat_days} Days</span>
                      <span className="text-[10px] text-emerald-600 block">⬇ Cut to 1-2 Days</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block">Logistics Cost Ratio</span>
                      <span className="font-bold text-rose-600 text-sm">{selectedOpp.current_delivery_cost_pct}%</span>
                      <span className="text-[10px] text-slate-500 block">Threshold: {maxCost}%</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block">Monthly Kit Demand</span>
                      <span className="font-bold text-slate-800 text-sm">{selectedOpp.current_monthly_kits} Kits/Mo</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block">Pipeline Value</span>
                      <span className="font-bold text-slate-800 text-sm">{formatInr(selectedOpp.pipeline_order_value)}</span>
                    </div>
                  </div>
                </div>

                {/* Investment & Loan Feasibility Card */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Setup CAPEX Breakdown */}
                  <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
                    <h4 className="font-bold text-sm text-slate-900 border-b pb-2 flex items-center gap-1.5">
                      <FaCoins className="text-amber-500" /> Estimated Setup CAPEX Breakdown
                    </h4>
                    <div className="space-y-2 text-xs">
                      <div className="flex justify-between">
                        <span className="text-slate-500">Civil & Structural Works:</span>
                        <span className="font-medium">{formatInr(selectedOpp.investment_breakdown?.civil_setup)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Equipment & Material Handling:</span>
                        <span className="font-medium">{formatInr(selectedOpp.investment_breakdown?.equipment_handling)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Working Capital / Buffer Stock:</span>
                        <span className="font-medium">{formatInr(selectedOpp.investment_breakdown?.working_capital_buffer)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">IT, Surveillance & Barcoding:</span>
                        <span className="font-medium">{formatInr(selectedOpp.investment_breakdown?.it_surveillance)}</span>
                      </div>
                      <div className="flex justify-between pt-2 border-t font-bold text-slate-900">
                        <span>Total Setup Investment:</span>
                        <span className="text-blue-600">{formatInr(selectedOpp.investment_breakdown?.total_setup_investment)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Operational Logistics & Payback Feasibility */}
                  <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
                    <h4 className="font-bold text-sm text-slate-900 border-b pb-2 flex items-center gap-1.5">
                      <FaChartLine className="text-emerald-500" /> Logistics Savings & Payback Feasibility
                    </h4>
                    <div className="space-y-2 text-xs">
                      <div className="flex justify-between">
                        <span className="text-slate-500">Projected Monthly Freight Savings:</span>
                        <span className="font-bold text-emerald-700">{formatInr(selectedOpp.projected_monthly_delivery_savings)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Estimated Monthly Warehouse OPEX:</span>
                        <span className="font-medium text-slate-700">₹65,000</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Net Monthly Logistics Gain:</span>
                        <span className="font-bold text-blue-700">
                          {formatInr(Math.max(0, (selectedOpp.projected_monthly_delivery_savings || 185000) - 65000))}
                        </span>
                      </div>
                      <div className="flex justify-between items-center pt-2 border-t">
                        <span className="text-slate-700 font-bold">Projected Payback Period:</span>
                        <span className="px-2.5 py-0.5 font-bold rounded-md bg-emerald-100 text-emerald-800 text-sm">
                          {selectedOpp.payback_period_months} Months (High ROI)
                        </span>
                      </div>
                      <div className="flex justify-between text-slate-500 text-[11px] pt-1">
                        <span>Operational Viability:</span>
                        <span className="font-semibold text-emerald-600">✅ Economically Justified Expansion</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: TRIGGER SETTINGS */}
      {activeTab === "triggers" && triggerConfig && (
        <form onSubmit={handleSaveTriggerConfig} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6 max-w-3xl">
          <h3 className="font-bold text-slate-900 text-base">Warehouse Development Triggers (National Policy)</h3>
          <p className="text-xs text-slate-500">
            Configure dynamic threshold rules that flag clusters where warehouse expansion is economically justified.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Min Monthly Cluster Revenue (₹) *</label>
              <input
                type="number"
                value={triggerConfig.min_monthly_sales_inr}
                onChange={(e) => setTriggerConfig({ ...triggerConfig, min_monthly_sales_inr: Number(e.target.value) })}
                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold"
                placeholder="e.g. 2500000"
              />
              <span className="text-[10px] text-slate-400">Trigger threshold for monthly cluster revenue</span>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Min Monthly Solar Kits Sold *</label>
              <input
                type="number"
                value={triggerConfig.min_monthly_kits_sold}
                onChange={(e) => setTriggerConfig({ ...triggerConfig, min_monthly_kits_sold: Number(e.target.value) })}
                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold"
                placeholder="e.g. 40"
              />
              <span className="text-[10px] text-slate-400">Solar kits required to trigger feasibility</span>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Max Delivery Cost Threshold (%) *</label>
              <input
                type="number"
                step="0.1"
                value={triggerConfig.max_delivery_cost_ratio_pct}
                onChange={(e) => setTriggerConfig({ ...triggerConfig, max_delivery_cost_ratio_pct: Number(e.target.value) })}
                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold"
                placeholder="e.g. 6.5"
              />
              <span className="text-[10px] text-slate-400">Exceeding this logistics % flags critical warehouse need (RED)</span>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Max Delivery Lead Time (Days) *</label>
              <input
                type="number"
                step="0.5"
                value={triggerConfig.max_delivery_tat_days}
                onChange={(e) => setTriggerConfig({ ...triggerConfig, max_delivery_tat_days: Number(e.target.value) })}
                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold"
                placeholder="e.g. 4"
              />
              <span className="text-[10px] text-slate-400">Delivery taking longer than this TAT flags critical warehouse need (RED)</span>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 flex justify-end">
            <button
              type="submit"
              className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-sm transition"
            >
              Save Configuration Settings
            </button>
          </div>
        </form>
      )}

      {/* ADD OPPORTUNITY MODAL */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 max-w-lg w-full shadow-xl border border-slate-200">
            <h3 className="text-lg font-bold text-slate-900 mb-2">Evaluate New Cluster Expansion</h3>
            <p className="text-xs text-slate-500 mb-4">
              Enter target cluster operational metrics to compute CAPEX, delivery savings, and expansion feasibility.
            </p>
            <form onSubmit={handleCreateOpp} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">State *</label>
                  <select
                    required
                    value={newOppData.state}
                    onChange={(e) => handleStateSelect(e.target.value)}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold bg-white"
                  >
                    {(liveStates.length > 0 ? liveStates : Object.keys(STATE_CLUSTER_MAP).map(st => ({ name: st }))).map((st) => (
                      <option key={st.id || st._id || st.name} value={st.name}>{st.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">
                    Cluster Name * {loadingClusters && <span className="text-blue-500 font-normal text-[10px]">(Loading...)</span>}
                  </label>
                  {!isCustomCluster ? (
                    <select
                      required
                      value={newOppData.cluster_name}
                      disabled={loadingClusters}
                      onChange={(e) => {
                        if (e.target.value === "__CUSTOM__") {
                          setIsCustomCluster(true);
                          setNewOppData({ ...newOppData, cluster_name: "" });
                        } else {
                          setNewOppData({ ...newOppData, cluster_name: e.target.value });
                        }
                      }}
                      className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold bg-white disabled:bg-slate-100"
                    >
                      {loadingClusters ? (
                        <option value="">Fetching clusters from database...</option>
                      ) : liveClusters.length > 0 ? (
                        liveClusters.map((cl) => {
                          const cName = cl.name || (typeof cl === "string" ? cl : "");
                          return <option key={cl.id || cl._id || cName} value={cName}>{cName}</option>;
                        })
                      ) : (
                        (STATE_CLUSTER_MAP[newOppData.state] || []).map((cl) => (
                          <option key={cl} value={cl}>{cl}</option>
                        ))
                      )}
                      <option value="__CUSTOM__">+ Other (Enter Custom Cluster)</option>
                    </select>
                  ) : (
                    <div className="flex gap-1.5">
                      <input
                        type="text"
                        required
                        placeholder="e.g. Lucknow-Awadh Cluster"
                        value={newOppData.cluster_name}
                        onChange={(e) => setNewOppData({ ...newOppData, cluster_name: e.target.value })}
                        className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs"
                      />
                      <button
                        type="button"
                        onClick={() => setIsCustomCluster(false)}
                        className="px-2 py-1 text-xs text-slate-400 hover:text-slate-600 font-bold"
                        title="Back to dropdown"
                      >
                        ✕
                      </button>
                    </div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Monthly Turnover (₹)</label>
                  <input
                    type="number"
                    value={newOppData.current_monthly_turnover}
                    onChange={(e) => setNewOppData({ ...newOppData, current_monthly_turnover: Number(e.target.value) })}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Monthly Kit Sales</label>
                  <input
                    type="number"
                    value={newOppData.current_monthly_kits}
                    onChange={(e) => setNewOppData({ ...newOppData, current_monthly_kits: Number(e.target.value) })}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Avg Delivery TAT (Days)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={newOppData.current_avg_delivery_tat_days}
                    onChange={(e) => setNewOppData({ ...newOppData, current_avg_delivery_tat_days: Number(e.target.value) })}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Delivery Cost Ratio (%)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={newOppData.current_delivery_cost_pct}
                    onChange={(e) => setNewOppData({ ...newOppData, current_delivery_cost_pct: Number(e.target.value) })}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 text-xs text-slate-600 hover:text-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-sm"
                >
                  Calculate Feasibility
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}