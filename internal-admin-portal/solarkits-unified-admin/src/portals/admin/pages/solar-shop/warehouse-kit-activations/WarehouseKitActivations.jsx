import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import axios from "axios";
import ReactCountryFlag from "react-country-flag";
import {
  FaWarehouse,
  FaGlobe,
  FaMapMarkerAlt,
  FaToggleOn,
  FaCheckCircle,
  FaTimesCircle,
  FaCogs,
  FaSync,
  FaSlidersH,
  FaBoxes,
  FaCheck,
  FaBoxOpen,
  FaLayerGroup,
} from "react-icons/fa";
import { setAlert } from "@/features/alert.slice";
import Button from "@/components/Button";
import CustomTable from "@/components/CustomTable";
import Dropdown from "@/components/Dropdown";
import Loader from "@/components/Loader";
import Dialog from "@/components/Dialog";
import { authHeaderObj } from "@/app/authHeader";

const API_URL = import.meta.env.VITE_API_URL;

export default function WarehouseKitActivations({ moduleUniqueId = "ADM_WH_KIT_ACT" }) {
  const { countryName } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const token = useSelector((state) => state.auth.token);

  // Geolocation & Core State
  const [activeCountries, setActiveCountries] = useState([]);
  const [states, setStates] = useState([]);
  const [clusters, setClusters] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [activations, setActivations] = useState([]);

  // Table & UI Loading State
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Filters State
  const [stateFilter, setStateFilter] = useState("");
  const [clusterFilter, setClusterFilter] = useState("");
  const [kitTypeFilter, setKitTypeFilter] = useState("all"); // all / combo / customize
  const [orderTypeFilter, setOrderTypeFilter] = useState("all"); // all / po_order / loose_order / trial_order

  // Order Fulfillment Capabilities Modal State
  const [selectedWarehouseForOrderType, setSelectedWarehouseForOrderType] = useState(null);
  const [modalOrderTypes, setModalOrderTypes] = useState(["po_order", "loose_order", "trial_order"]);
  const [savingOrderTypes, setSavingOrderTypes] = useState(false);

  // Fetch active countries & warehouses
  const fetchData = async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    try {
      // 1. Fetch active countries
      const countriesRes = await axios.get(
        `${API_URL}/geolocation/active-countries?unique_id=${moduleUniqueId}&req_for=view`,
        { headers: authHeaderObj() }
      );

      const activeCountriesList = countriesRes.data?.countries || [];
      setActiveCountries(activeCountriesList);

      // URL Country Parameter Redirect Logic
      if (activeCountriesList.length > 0) {
        const activeCountriesNames = activeCountriesList.map((c) =>
          c.name.toLowerCase()
        );

        if (!countryName) {
          const storedCountry = localStorage.getItem("selected_country_solar-shop");
          const defaultCountry =
            storedCountry && activeCountriesNames.includes(storedCountry.toLowerCase())
              ? storedCountry.toLowerCase()
              : activeCountriesList[0].name.toLowerCase();

          navigate(
            `/admin-panel/solar-shop/${defaultCountry}/warehouse-kit-activations`,
            { replace: true }
          );
          return;
        } else {
          const matchedCountry = activeCountriesList.find(
            (c) => c.name.toLowerCase() === countryName.toLowerCase()
          );
          if (!matchedCountry) {
            const defaultCountry = activeCountriesList[0].name.toLowerCase();
            navigate(
              `/admin-panel/solar-shop/${defaultCountry}/warehouse-kit-activations`,
              { replace: true }
            );
            return;
          }
        }
      }

      const currentCountryObj = activeCountriesList.find(
        (c) => c.name.toLowerCase() === countryName?.toLowerCase()
      );

      if (currentCountryObj) {
        // 2. Fetch states for active country
        const statesRes = await axios.post(
          `${API_URL}/geolocation/active-states?unique_id=${moduleUniqueId}&req_for=view`,
          { country_id: currentCountryObj.id },
          { headers: authHeaderObj() }
        );
        setStates(statesRes.data?.states || []);

        // 3. Fetch warehouses
        const warehousesRes = await axios.get(
          `${API_URL}/warehouses?unique_id=${moduleUniqueId}&req_for=view`,
          { headers: authHeaderObj() }
        );
        const allWarehouses = warehousesRes.data?.warehouses || [];
        const countryWarehouses = currentCountryObj
          ? allWarehouses.filter(
            (w) =>
              (w.country_id || w.level_0)?.toString() === currentCountryObj.id?.toString() ||
              (w.country && w.country.toLowerCase() === currentCountryObj.name?.toLowerCase())
          )
          : allWarehouses;
        setWarehouses(countryWarehouses);

        // 4. Fetch warehouse kit activations for this country
        try {
          const activationRes = await axios.get(
            `${API_URL}/solarshop/warehouse-kit-activations?unique_id=${moduleUniqueId}&req_for=view&country_id=${currentCountryObj.id}`,
            { headers: authHeaderObj() }
          );
          setActivations(activationRes.data?.data || []);
        } catch (activationErr) {
          console.error("Error fetching warehouse kit activations:", activationErr);
          setActivations([]);
        }

        // 5. Fetch regional clusters (State-wise Cluster & Warehouse Routing)
        try {
          const clusterRes = await axios.get(
            `${API_URL}/solarshop/cluster-routing/clusters`,
            { headers: authHeaderObj() }
          );
          setClusters(clusterRes.data?.data || []);
        } catch (clusterErr) {
          console.warn("Error fetching regional clusters:", clusterErr);
          setClusters([]);
        }
      }
    } catch (error) {
      console.error("Error fetching warehouse kit activation data:", error);
      dispatch(
        setAlert({ type: "error", message: "Failed to load warehouse kit activation data" })
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = async () => {
    await fetchData(true);
  };

  useEffect(() => {
    if (moduleUniqueId && token) {
      fetchData();
      setStateFilter("");
      setClusterFilter("");
    }
  }, [moduleUniqueId, token, countryName]);

  // Find current country object
  const currentCountry = activeCountries.find(
    (c) => c.name.toLowerCase() === countryName?.toLowerCase()
  );

  // States available based on selected regional cluster
  const filteredStates = clusterFilter
    ? states.filter((s) => {
      const selectedCluster = clusters.find((c) => (c.id || c._id)?.toString() === clusterFilter?.toString());
      return selectedCluster?.states?.some((st) => st.toLowerCase() === s.name.toLowerCase());
    })
    : states;

  // Filter warehouses based on page filter selections
  const displayWarehouses = warehouses.filter((w) => {
    if (stateFilter) {
      const selectedStateObj = states.find((s) => s.id?.toString() === stateFilter?.toString());
      const selectedStateName = selectedStateObj ? selectedStateObj.name : stateFilter;

      const stateMatchesFulfillment =
        Array.isArray(w.fulfillment_states) &&
        w.fulfillment_states.some((st) => st.toLowerCase() === selectedStateName.toLowerCase());
      const stateMatchesBase =
        (w.state_id || w.level_1)?.toString() === stateFilter?.toString() ||
        (w.state && w.state.toLowerCase() === selectedStateName.toLowerCase());

      if (!stateMatchesFulfillment && !stateMatchesBase) return false;
    }

    if (clusterFilter) {
      const selectedClusterObj = clusters.find((c) => (c.id || c._id)?.toString() === clusterFilter?.toString());
      const selectedClusterName = selectedClusterObj ? selectedClusterObj.name.toLowerCase() : "";

      const whClusterId = (w.cluster_id || w.routing_mapping?.cluster_id)?.toString();
      const whClusterName = (w.cluster_name || w.cluster || "")?.toLowerCase();

      const idMatches = whClusterId && whClusterId === clusterFilter?.toString();
      const nameMatches = selectedClusterName && whClusterName === selectedClusterName;

      if (!idMatches && !nameMatches) return false;
    }

    if (orderTypeFilter && orderTypeFilter !== "all") {
      const whTypes = w.order_fulfillment_types && w.order_fulfillment_types.length > 0
        ? w.order_fulfillment_types
        : ['po_order', 'loose_order', 'trial_order'];
      if (!whTypes.includes(orderTypeFilter)) return false;
    }
    return true;
  });

  // Save updated order fulfillment capabilities
  const handleSaveOrderTypes = async () => {
    if (!selectedWarehouseForOrderType) return;
    setSavingOrderTypes(true);
    try {
      const whId = selectedWarehouseForOrderType.id || selectedWarehouseForOrderType._id;
      const res = await axios.patch(
        `${API_URL}/warehouses/${whId}/order-fulfillment-types?unique_id=${moduleUniqueId || "ADM_WH_KIT_ACT"}&req_for=edit`,
        { order_fulfillment_types: modalOrderTypes },
        { headers: authHeaderObj() }
      );
      if (res.data?.status === "success") {
        dispatch(setAlert({ type: "success", message: "Warehouse order fulfillment capabilities updated successfully!" }));
        setWarehouses((prev) =>
          prev.map((wh) => {
            if ((wh.id || wh._id)?.toString() === whId.toString()) {
              return { ...wh, order_fulfillment_types: modalOrderTypes };
            }
            return wh;
          })
        );
        setSelectedWarehouseForOrderType(null);
      }
    } catch (err) {
      console.error("Error updating order fulfillment types:", err);
      dispatch(
        setAlert({
          type: "error",
          message: err.response?.data?.message || "Failed to update order fulfillment capabilities",
        })
      );
    } finally {
      setSavingOrderTypes(false);
    }
  };

  // For each warehouse, compute activation stats
  const getWarehouseActivationStats = (warehouseId) => {
    if (!warehouseId) return { totalCombos: 0, activeCombos: 0, totalCustomizes: 0, activeCustomizes: 0, isConfigured: false };
    const warehouseActivations = activations.filter(
      (a) => (a.warehouse_id?._id || a.warehouse_id)?.toString() === warehouseId.toString()
    );

    const comboKits = warehouseActivations.filter(
      (a) => a.combo_kit_id && !a.combo_kit_id.is_custom
    );
    const customizeKits = warehouseActivations.filter(
      (a) => a.combo_kit_id && a.combo_kit_id.is_custom
    );

    const activeCombos = comboKits.filter((a) => a.is_combokit_active).length;
    const activeCustomizes = customizeKits.filter((a) => a.is_customize_kit_active).length;

    return {
      totalCombos: comboKits.length,
      activeCombos,
      totalCustomizes: customizeKits.length,
      activeCustomizes,
      isConfigured: warehouseActivations.length > 0,
    };
  };

  // Count stats
  const totalConfigured = displayWarehouses.filter(
    (w) => getWarehouseActivationStats(w.id || w._id).isConfigured
  ).length;
  const totalNotConfigured = displayWarehouses.length - totalConfigured;

  // Route navigation helper
  const handleConfigure = (w) => {
    const targetId = w.id || w._id;
    navigate(
      `/admin-panel/solar-shop/${countryName?.toLowerCase()}/warehouse-kit-activations/${targetId}`
    );
  };

  // Table Headers
  const tableHeaders = [
    { key: "warehouse_code", label: "Warehouse" },
    { key: "address", label: "Address" },
    { key: "location", label: "State & Cluster" },
    { key: "combo_status", label: "Combo Kits", align: "center" },
    { key: "customize_status", label: "Customize Kits", align: "center" },
    { key: "order_fulfillment", label: "Order Type Fulfillment", align: "center" },
    { key: "store_display", label: "Store Display & Regions", align: "center" },
    { key: "actions", label: "Actions", align: "right" },
  ];

  return (
    <div className="space-y-6 pb-24">
      {/* Header */}
      <div className="relative rounded-2xl bg-linear-120 from-primary to-primary-end shadow-xl">
        <div className="absolute inset-0 bg-grid-white/10 mask-[linear-gradient(0deg,transparent,black)]"></div>
        <div className="relative px-6 py-8 lg:px-8">
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center border border-white/30">
                <FaToggleOn className="text-white text-3xl" />
              </div>
              <div>
                <h1 className="text-2xl lg:text-3xl font-bold text-white">
                  Warehouse Kit Activations
                </h1>
                <p className="text-white/90 mt-1">
                  Activate or deactivate combo kits and customize kits per warehouse.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 flex-wrap">
              <Button
                onClick={handleRefresh}
                disabled={loading || refreshing}
                variant="secondary"
                size="sm"
                leftIcon={<FaSync className={refreshing ? "animate-spin" : ""} />}
                className="bg-white/20 backdrop-blur-sm border-white/30 text-white hover:bg-white/30 hover:border-white/40 hover:text-white"
              >
                {refreshing ? "Refreshing..." : "Refresh Page"}
              </Button>
              {currentCountry && (
                <div className="bg-white/20 backdrop-blur-sm rounded-full px-4 py-2 border border-white/30 flex items-center gap-2">
                  <ReactCountryFlag
                    countryCode={currentCountry.iso2}
                    svg
                    className="w-5 h-5 rounded-sm object-cover"
                  />
                  <span className="text-white text-xs font-bold uppercase tracking-wider">
                    {currentCountry.name} Market
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {loading ? (
        <Loader text="Loading warehouse kit activations..." />
      ) : (
        <>
          {/* Metric Cards */}
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Active Market */}
            <div className="card p-6 border-l-4 border-l-primary shadow-sm space-y-4">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-xs font-black text-text-muted uppercase tracking-[0.2em]">
                    Active Market
                  </h3>
                  <h2 className="text-lg font-black text-text-primary mt-1">
                    {currentCountry ? currentCountry.name : "No Selection"}
                  </h2>
                </div>
                {currentCountry && (
                  <ReactCountryFlag
                    countryCode={currentCountry.iso2}
                    svg
                    style={{ width: "2em", height: "1.5em" }}
                    className="rounded shadow-sm"
                  />
                )}
              </div>
              <div className="h-px bg-border/40" />
              <div className="flex items-center gap-2 text-xs text-text-secondary font-medium">
                <FaGlobe className="text-primary opacity-50" />
                <span>
                  Currency:{" "}
                  <strong>{currentCountry?.currency_code || "USD"}</strong>
                </span>
              </div>
            </div>

            {/* Total Warehouses */}
            <div className="card p-6 border-2 border-border shadow-sm flex items-center gap-5">
              <div className="p-4 bg-primary/10 rounded-2xl text-primary border border-primary/10">
                <FaWarehouse size={24} />
              </div>
              <div>
                <h3 className="text-[10px] font-black text-text-muted uppercase tracking-[0.2em]">
                  Total Warehouses
                </h3>
                <h2 className="text-2xl font-black text-text-primary mt-1">
                  {warehouses.length}
                </h2>
                <p className="text-[10px] text-text-secondary font-bold mt-0.5">
                  In {currentCountry?.name || "selected"} market
                </p>
              </div>
            </div>

            {/* Configured */}
            <div className="card p-6 border-2 border-border shadow-sm flex items-center gap-5">
              <div className="p-4 bg-success/10 rounded-2xl text-success border border-success/10">
                <FaCheckCircle size={24} />
              </div>
              <div>
                <h3 className="text-[10px] font-black text-text-muted uppercase tracking-[0.2em]">
                  Configured
                </h3>
                <h2 className="text-2xl font-black text-text-primary mt-1">
                  {totalConfigured}
                </h2>
                <p className="text-[10px] text-text-secondary font-bold mt-0.5">
                  Kit activations set up
                </p>
              </div>
            </div>

            {/* Not Configured */}
            <div className="card p-6 border-2 border-border shadow-sm flex items-center gap-5">
              <div className="p-4 bg-danger/10 rounded-2xl text-danger border border-danger/10">
                <FaTimesCircle size={24} />
              </div>
              <div>
                <h3 className="text-[10px] font-black text-text-muted uppercase tracking-[0.2em]">
                  Pending Setup
                </h3>
                <h2 className="text-2xl font-black text-text-primary mt-1">
                  {totalNotConfigured} Pending
                </h2>
                <p className="text-[10px] text-text-secondary font-bold mt-0.5">
                  Activation not configured
                </p>
              </div>
            </div>
          </div>

          {/* Filtering Section */}
          <div className="bg-surface rounded-2xl border-2 border-border p-6 shadow-sm flex flex-col md:flex-row items-center gap-4">
            <div className="flex-1 w-full">
              <Dropdown
                label="Filter by Regional Cluster"
                value={clusterFilter}
                onChange={(val) => {
                  setClusterFilter(val);
                  setStateFilter("");
                }}
                placeholder="All Regional Clusters"
                options={clusters.map((c) => ({ value: c.id || c._id, text: `${c.name} (${c.code || 'CL'})` }))}
              />
            </div>
            <div className="flex-1 w-full">
              <Dropdown
                label="Filter by State"
                value={stateFilter}
                onChange={setStateFilter}
                placeholder={clusterFilter ? "All States in Cluster" : "All States"}
                options={filteredStates.map((s) => ({ value: s.id, text: s.name }))}
              />
            </div>
            <div className="flex-1 w-full">
              <Dropdown
                label="Filter by Order Type"
                value={orderTypeFilter}
                onChange={setOrderTypeFilter}
                placeholder="All Order Types"
                options={[
                  { value: "all", text: "All Order Types" },
                  { value: "po_order", text: "PO Order Fulfillment" },
                  { value: "loose_order", text: "Loose Order Fulfillment" },
                  { value: "trial_order", text: "Trial Order Fulfillment" },
                ]}
              />
            </div>
            {(stateFilter || clusterFilter || orderTypeFilter !== "all") && (
              <Button
                variant="secondary"
                onClick={() => {
                  setStateFilter("");
                  setClusterFilter("");
                  setOrderTypeFilter("all");
                }}
                className="mt-6 md:mt-0 rounded-xl"
              >
                Clear Filters
              </Button>
            )}
          </div>

          {/* Warehouse Table */}
          <div className="bg-surface rounded-2xl border-2 border-border/60 shadow-sm overflow-hidden flex flex-col min-h-[400px]">
            <div className="px-6 py-4 bg-surface-hover/30 border-b border-border flex items-center justify-between">
              <h2 className="text-xs font-black text-text-primary flex items-center gap-3 uppercase tracking-[0.2em]">
                <div className="p-2.5 bg-primary/10 rounded-xl text-primary border border-primary/10 shadow-inner">
                  <FaWarehouse size={14} />
                </div>
                {currentCountry ? currentCountry.name : ""} Warehouses List
              </h2>
              <span className="text-[10px] font-black text-text-muted uppercase tracking-widest bg-surface-hover px-3 py-1.5 rounded-lg border border-border/40">
                {displayWarehouses.length} Warehouses Listed
              </span>
            </div>

            <div className="flex-1 p-6">
              <CustomTable
                headers={tableHeaders}
                data={displayWarehouses}
                loading={loading || refreshing}
                emptyMessage="No warehouses identified matching filters."
                containerClassName="border-none shadow-none rounded-none bg-transparent"
                renderRow={(warehouse) => {
                  const stats = getWarehouseActivationStats(warehouse.id || warehouse._id);
                  return (
                    <>
                      <td className="px-6 py-4">
                        <div className="font-black text-text-primary tracking-tight text-sm flex items-center gap-2">
                          <FaWarehouse className="text-primary opacity-60 shrink-0" size={14} />
                          <span>{warehouse.warehouse_code || "N/A"}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div
                          className="font-semibold text-text-secondary text-xs truncate max-w-xs"
                          title={warehouse.address}
                        >
                          {warehouse.address || "N/A"}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col gap-1.5 max-w-[280px]">
                          {warehouse.is_cluster_mapped || (Array.isArray(warehouse.fulfillment_states) && warehouse.fulfillment_states.length > 0) ? (
                            <>
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-black bg-primary/10 text-primary border border-primary/20">
                                  <FaLayerGroup className="text-primary text-[10px]" />
                                  {warehouse.cluster_name || warehouse.cluster}
                                </span>
                              </div>
                              {Array.isArray(warehouse.fulfillment_states) && warehouse.fulfillment_states.length > 0 && (
                                <div className="flex items-center gap-1 flex-wrap">
                                  <span className="text-[10px] text-text-muted font-bold mr-0.5">Fulfillment States:</span>
                                  {warehouse.fulfillment_states.map((st, sIdx) => (
                                    <span
                                      key={sIdx}
                                      className="px-1.5 py-0.5 rounded text-[9px] font-black bg-surface-hover text-text-secondary border border-border/60"
                                    >
                                      {st}
                                    </span>
                                  ))}
                                </div>
                              )}
                              <span className="text-[10px] text-text-muted flex items-center gap-1">
                                <FaMapMarkerAlt className="text-text-muted/60 text-[9px]" />
                                Base: {warehouse.district ? `${warehouse.district}, ` : ''}{warehouse.state || 'N/A'}
                              </span>
                            </>
                          ) : (
                            <>
                              <div className="flex items-center gap-1 text-xs font-bold text-text-secondary">
                                <FaMapMarkerAlt className="text-primary/60 text-[11px]" />
                                <span>{warehouse.state || "N/A"}</span>
                              </div>
                              <div className="flex items-center gap-1.5">
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/10 text-amber-600 border border-amber-500/20">
                                  Unmapped (Cluster Routing)
                                </span>
                              </div>
                            </>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        {stats.totalCombos > 0 ? (
                          <div className="flex flex-col items-center gap-0.5">
                            <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black ${stats.activeCombos > 0 ? 'bg-success/10 text-success border border-success/20' : 'bg-surface-hover text-text-muted border border-border/40'}`}>
                              {stats.activeCombos > 0 ? <FaCheckCircle size={9} /> : <FaTimesCircle size={9} />}
                              {stats.activeCombos}/{stats.totalCombos} Active
                            </span>
                          </div>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-black bg-surface-hover text-text-muted border border-border/40">
                            Not Configured
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-center">
                        {stats.totalCustomizes > 0 ? (
                          <div className="flex flex-col items-center gap-0.5">
                            <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black ${stats.activeCustomizes > 0 ? 'bg-success/10 text-success border border-success/20' : 'bg-surface-hover text-text-muted border border-border/40'}`}>
                              {stats.activeCustomizes > 0 ? <FaCheckCircle size={9} /> : <FaTimesCircle size={9} />}
                              {stats.activeCustomizes}/{stats.totalCustomizes} Active
                            </span>
                          </div>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-black bg-surface-hover text-text-muted border border-border/40">
                            Not Configured
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-center">
                        {(() => {
                          const fulfillmentTypes = Array.isArray(warehouse.order_fulfillment_types)
                            ? warehouse.order_fulfillment_types
                            : ["po_order", "loose_order", "trial_order"];
                          return (
                            <div className="flex flex-col items-center gap-1.5">
                              <div className="flex items-center justify-center flex-wrap gap-1 max-w-[200px]">
                                {fulfillmentTypes.includes("po_order") && (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[9px] font-black bg-blue-500/10 text-blue-600 border border-blue-500/20">
                                    PO Order
                                  </span>
                                )}
                                {fulfillmentTypes.includes("loose_order") && (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[9px] font-black bg-purple-500/10 text-purple-600 border border-purple-500/20">
                                    Loose Order
                                  </span>
                                )}
                                {fulfillmentTypes.includes("trial_order") && (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[9px] font-black bg-amber-500/10 text-amber-600 border border-amber-500/20">
                                    Trial Order
                                  </span>
                                )}
                                {fulfillmentTypes.length === 0 && (
                                  <span className="text-[10px] font-bold text-red-500 bg-red-500/10 px-2 py-0.5 rounded-md border border-red-500/20">
                                    None Assigned
                                  </span>
                                )}
                              </div>
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedWarehouseForOrderType(warehouse);
                                  setModalOrderTypes(
                                    Array.isArray(warehouse.order_fulfillment_types)
                                      ? warehouse.order_fulfillment_types
                                      : ["po_order", "loose_order", "trial_order"]
                                  );
                                }}
                                className="inline-flex items-center gap-1 text-[10px] font-bold text-primary hover:underline hover:text-primary-hover transition-colors"
                              >
                                <FaSlidersH size={10} />
                                Change Types
                              </button>
                            </div>
                          );
                        })()}
                      </td>
                      <td className="px-6 py-4 text-center">
                        {stats.activeCombos > 0 || stats.activeCustomizes > 0 ? (
                          <div className="flex flex-col items-center gap-0.5">
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black bg-primary/10 text-primary border border-primary/20">
                              <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                              Store Live ({stats.activeCombos + stats.activeCustomizes} Kits)
                            </span>
                            <span className="text-[9px] text-text-muted font-bold">
                              Scope: {warehouse.cluster || "All Clusters"}
                            </span>
                          </div>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-black bg-surface-hover text-text-muted border border-border/40">
                            Hidden from Store
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <Button
                          onClick={() => handleConfigure(warehouse)}
                          size="sm"
                          leftIcon={<FaCogs />}
                          className="rounded-lg text-[10px] font-bold uppercase tracking-wider py-1.5"
                        >
                          {stats.isConfigured ? "Manage Activations" : "Configure"}
                        </Button>
                      </td>
                    </>
                  );
                }}
              />
            </div>
          </div>

          {/* Order Fulfillment Types Dialog Modal */}
          <Dialog
            isOpen={Boolean(selectedWarehouseForOrderType)}
            onClose={() => setSelectedWarehouseForOrderType(null)}
            title={
              <div className="flex items-center gap-2">
                <FaBoxes className="text-primary" />
                <span>Configure Order Fulfillment Types — {selectedWarehouseForOrderType?.warehouse_code}</span>
              </div>
            }
            size="md"
            footer={
              <div className="flex items-center justify-end gap-3 w-full">
                <Button
                  variant="secondary"
                  onClick={() => setSelectedWarehouseForOrderType(null)}
                  disabled={savingOrderTypes}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSaveOrderTypes}
                  disabled={savingOrderTypes}
                  leftIcon={<FaCheck />}
                >
                  {savingOrderTypes ? "Saving Changes..." : "Save Fulfillment Types"}
                </Button>
              </div>
            }
          >
            <div className="p-6 space-y-5">
              <div className="bg-primary/5 rounded-xl p-4 border border-primary/20">
                <h4 className="text-xs font-black uppercase tracking-wider text-text-primary mb-1">
                  Warehouse Order Routing Rules
                </h4>
                <p className="text-xs text-text-secondary leading-relaxed">
                  Define which order categories (PO Orders, Loose Orders, or Trial Kits) this warehouse is authorized to fulfill for its designated State and Cluster districts. Incoming EPC orders are automatically bifurcated based on these flags.
                </p>
              </div>

              <div className="space-y-3">
                {[
                  {
                    id: "po_order",
                    label: "PO Orders (Bulk Project / Combo Kits)",
                    desc: "Fulfill complete standard Combo Kits and commercial project purchase orders.",
                    badgeBg: "bg-blue-500/10 text-blue-600 border-blue-500/20",
                  },
                  {
                    id: "loose_order",
                    label: "Loose Orders (Customized / Partial BOM Kits)",
                    desc: "Fulfill customized component orders with loose/partial BOM line items.",
                    badgeBg: "bg-purple-500/10 text-purple-600 border-purple-500/20",
                  },
                  {
                    id: "trial_order",
                    label: "Trial Orders (Sample / Evaluation Kits)",
                    desc: "Fulfill trial and sample evaluation orders dispatched to test or pilot EPCs.",
                    badgeBg: "bg-amber-500/10 text-amber-600 border-amber-500/20",
                  },
                ].map((ot) => {
                  const isChecked = modalOrderTypes.includes(ot.id);
                  return (
                    <div
                      key={ot.id}
                      onClick={() => {
                        if (isChecked) {
                          setModalOrderTypes(modalOrderTypes.filter((t) => t !== ot.id));
                        } else {
                          setModalOrderTypes([...modalOrderTypes, ot.id]);
                        }
                      }}
                      className={`flex items-start gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all ${isChecked
                          ? "border-primary bg-primary/5 shadow-xs"
                          : "border-border hover:border-border-hover bg-surface"
                        }`}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => { }}
                        className="mt-1 h-4 w-4 rounded text-primary focus:ring-primary border-gray-300 pointer-events-none"
                      />
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-black text-text-primary">{ot.label}</span>
                          <span className={`px-2 py-0.5 rounded text-[9px] font-bold border ${ot.badgeBg}`}>
                            {ot.id}
                          </span>
                        </div>
                        <p className="text-[11px] text-text-muted mt-1 leading-normal">
                          {ot.desc}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>

              {modalOrderTypes.length === 0 && (
                <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-500 text-xs font-bold flex items-center gap-2">
                  <FaTimesCircle />
                  At least one order type should normally be selected to prevent this warehouse from rejecting orders.
                </div>
              )}
            </div>
          </Dialog>
        </>
      )}
    </div>
  );
}