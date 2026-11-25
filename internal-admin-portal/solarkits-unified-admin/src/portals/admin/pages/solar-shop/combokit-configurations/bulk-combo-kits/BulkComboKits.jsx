import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import axios from "axios";
import ReactCountryFlag from "react-country-flag";
import {
  FaBoxes,
  FaGlobe,
  FaMapMarkerAlt,
  FaSlidersH,
  FaWarehouse,
  FaLayerGroup,
  FaSync,
} from "react-icons/fa";
import { setAlert } from "@/features/alert.slice";
import Button from "@/components/Button";
import CustomTable from "@/components/CustomTable";
import Dropdown from "@/components/Dropdown";
import Loader from "@/components/Loader";
import { authHeaderObj } from "@/app/authHeader";

const API_URL = import.meta.env.VITE_API_URL;

export default function BulkComboKits({ moduleUniqueId }) {
  const { countryName } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const token = useSelector((state) => state.auth.token);

  // Geolocation & Core State
  const [activeCountries, setActiveCountries] = useState([]);
  const [states, setStates] = useState([]);
  const [clusters, setClusters] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [bulkSettings, setBulkSettings] = useState([]);

  // Table & UI Loading State
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Filters State
  const [stateFilter, setStateFilter] = useState("");
  const [clusterFilter, setClusterFilter] = useState("");

  // Fetch clusters for a selected state
  const fetchClustersForState = async (stateId) => {
    if (!stateId) {
      setClusters([]);
      return;
    }
    try {
      const res = await axios.get(
        `${API_URL}/geolocation/clusters/${stateId}?unique_id=${moduleUniqueId}&req_for=view`,
        { headers: authHeaderObj() }
      );
      setClusters(res.data?.clusters || []);
    } catch (err) {
      console.error("Error fetching clusters:", err);
    }
  };

  // Fetch active countries & warehouses
  const fetchData = async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    try {
      const isIndiaUrl = (countryName || "india").toLowerCase() === "india" || (countryName || "").toLowerCase() === "in";
      const bulkEndpoint = isIndiaUrl ? "india/bulk-kit-settings" : "bulk-kit-settings";

      // 1. Fetch countries, warehouses and bulk kit settings concurrently
      const [countriesRes, warehousesRes, bulkRes] = await Promise.all([
        axios.get(
          `${API_URL}/geolocation/active-countries?unique_id=${moduleUniqueId}&req_for=view`,
          { headers: authHeaderObj() }
        ),
        axios.get(
          `${API_URL}/warehouses?unique_id=${moduleUniqueId}&req_for=view`,
          { headers: authHeaderObj() }
        ),
        axios.get(
          `${API_URL}/solarshop/${bulkEndpoint}?unique_id=${moduleUniqueId}&req_for=view`,
          { headers: authHeaderObj() }
        ).catch(() => ({ data: { data: [] } }))
      ]);

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
            `/admin-panel/solar-shop/${defaultCountry}/combokit-configurations/bulk-combo-kits`,
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
              `/admin-panel/solar-shop/${defaultCountry}/combokit-configurations/bulk-combo-kits`,
              { replace: true }
            );
            return;
          }
        }
      }

      const currentCountryObj = activeCountriesList.find(
        (c) => c.name.toLowerCase() === countryName?.toLowerCase()
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
      setBulkSettings(bulkRes.data?.data || []);

      // Non-blocking fetch of states for dropdown filter
      if (currentCountryObj) {
        axios.post(
          `${API_URL}/geolocation/active-states?unique_id=${moduleUniqueId}&req_for=view`,
          { country_id: currentCountryObj.id },
          { headers: authHeaderObj() }
        ).then((statesRes) => {
          setStates(statesRes.data?.states || []);
        }).catch((err) => console.error("Error fetching states:", err));
      }
    } catch (error) {
      console.error("Error fetching bulk combo kit data:", error);
      dispatch(
        setAlert({ type: "error", message: "Failed to load bulk combo kit configuration data" })
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = async () => {
    await fetchData(true);
    if (stateFilter && token) {
      await fetchClustersForState(stateFilter);
    }
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

  // Fetch clusters for selected state filter
  useEffect(() => {
    if (!stateFilter) {
      setClusters([]);
      setClusterFilter("");
      return;
    }
    if (token) {
      setClusterFilter("");
      fetchClustersForState(stateFilter);
    }
  }, [stateFilter, token]);

  // Filter warehouses based on page filter selections
  const displayWarehouses = warehouses.filter((w) => {
    if (stateFilter) {
      const stateMatches =
        (w.state_id || w.level_1)?.toString() === stateFilter?.toString() ||
        states.some((s) => s.id?.toString() === stateFilter?.toString() && s.name?.toLowerCase() === w.state?.toLowerCase());
      if (!stateMatches) return false;
    }
    if (clusterFilter) {
      const whClusterId = (w.cluster_id || w.cluster?.id || w.cluster?._id)?.toString();
      const whClusterName = (typeof w.cluster === "string" ? w.cluster : w.cluster?.name)?.toLowerCase();
      const selectedClusterObj = clusters.find((c) => c.id?.toString() === clusterFilter?.toString());
      const selectedClusterName = selectedClusterObj?.name?.toLowerCase();

      const idMatches = whClusterId && whClusterId === clusterFilter?.toString();
      const nameMatches = whClusterName && selectedClusterName && whClusterName === selectedClusterName;

      if (!idMatches && !nameMatches) return false;
    }
    return true;
  });

  // Compute configured warehouse IDs from bulk settings
  const configuredWarehouseIds = [
    ...new Set(
      bulkSettings.map((s) => (s.warehouse_id || s.warehouse?.id || s.warehouse?._id)?.toString()).filter(Boolean)
    ),
  ];
  const configuredCount = configuredWarehouseIds.length;
  const unconfiguredCount = Math.max(0, warehouses.length - configuredCount);

  // Count total bulk-enabled kits across all warehouses
  const totalBulkEnabledKits = bulkSettings.filter((s) => s.is_bulk_enabled).length;

  // Table row payload aggregator
  const tableData = displayWarehouses.map((w) => {
    const targetId = (w.id || w._id)?.toString();
    const warehouseBulkSettings = bulkSettings.filter(
      (s) => (s.warehouse_id || s.warehouse?.id || s.warehouse?._id)?.toString() === targetId
    );
    const enabledKits = warehouseBulkSettings.filter((s) => s.is_bulk_enabled).length;
    return { warehouse: w, enabledKits };
  });

  // Route navigation helper
  const handleConfigureBulkKits = (w) => {
    const targetId = w.id || w._id;
    navigate(
      `/admin-panel/solar-shop/${countryName?.toLowerCase()}/combokit-configurations/bulk-combo-kits/${targetId}`
    );
  };

  // Table Headers
  const tableHeaders = [
    { key: "warehouse_code", label: "Warehouse" },
    { key: "address", label: "Address" },
    { key: "location", label: "State & Cluster" },
    { key: "bulk_kits", label: "Bulk-Enabled Kits", align: "center" },
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
                <FaBoxes className="text-white text-3xl" />
              </div>
              <div>
                <h1 className="text-2xl lg:text-3xl font-bold text-white">
                  Bulk Combo Kits
                </h1>
                <p className="text-white/90 mt-1">
                  Configure per-warehouse bulk combo kit availability and quantity tiers.
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
        <Loader text="Loading bulk kit settings..." />
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

            {/* Configured Warehouses */}
            <div className="card p-6 border-2 border-border shadow-sm flex items-center gap-5">
              <div className="p-4 bg-primary/10 rounded-2xl text-primary border border-primary/10">
                <FaWarehouse size={24} />
              </div>
              <div>
                <h3 className="text-[10px] font-black text-text-muted uppercase tracking-[0.2em]">
                  Configured Warehouses
                </h3>
                <h2 className="text-2xl font-black text-text-primary mt-1">
                  {configuredCount} / {warehouses.length}
                </h2>
                <p className="text-[10px] text-text-secondary font-bold mt-0.5">
                  Bulk kit setup complete
                </p>
              </div>
            </div>

            {/* Bulk-Enabled Kits */}
            <div className="card p-6 border-2 border-border shadow-sm flex items-center gap-5">
              <div className="p-4 bg-success/10 rounded-2xl text-success border border-success/10">
                <FaLayerGroup size={24} />
              </div>
              <div>
                <h3 className="text-[10px] font-black text-text-muted uppercase tracking-[0.2em]">
                  Bulk-Enabled Kits
                </h3>
                <h2 className="text-2xl font-black text-text-primary mt-1">
                  {totalBulkEnabledKits}
                </h2>
                <p className="text-[10px] text-text-secondary font-bold mt-0.5">
                  Across all warehouses
                </p>
              </div>
            </div>

            {/* Pending Setup */}
            <div className="card p-6 border-2 border-border shadow-sm flex items-center gap-5">
              <div className="p-4 bg-danger/10 rounded-2xl text-danger border border-danger/10">
                <FaWarehouse size={24} />
              </div>
              <div>
                <h3 className="text-[10px] font-black text-text-muted uppercase tracking-[0.2em]">
                  Pending Setup
                </h3>
                <h2 className="text-2xl font-black text-text-primary mt-1">
                  {unconfiguredCount} Pending
                </h2>
                <p className="text-[10px] text-text-secondary font-bold mt-0.5">
                  Bulk not configured yet
                </p>
              </div>
            </div>
          </div>

          {/* Filtering Section */}
          <div className="bg-surface rounded-2xl border-2 border-border p-6 shadow-sm flex flex-col md:flex-row items-center gap-4">
            <div className="flex-1 w-full">
              <Dropdown
                label="Filter by State"
                value={stateFilter}
                onChange={setStateFilter}
                placeholder="All States"
                options={states.map((s) => ({ value: s.id, text: s.name }))}
              />
            </div>
            <div className="flex-1 w-full">
              <Dropdown
                label="Filter by Cluster"
                value={clusterFilter}
                onChange={setClusterFilter}
                placeholder={stateFilter ? "All Clusters" : "Select a state first..."}
                disabled={!stateFilter}
                options={clusters.map((c) => ({ value: c.id, text: c.name }))}
              />
            </div>
            {(stateFilter || clusterFilter) && (
              <Button
                variant="secondary"
                onClick={() => {
                  setStateFilter("");
                  setClusterFilter("");
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
                data={tableData}
                loading={loading}
                emptyMessage="No warehouses identified matching filters."
                containerClassName="border-none shadow-none rounded-none bg-transparent"
                renderRow={({ warehouse, enabledKits }) => (
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
                      <div className="font-bold text-text-secondary text-xs flex flex-col gap-0.5">
                        <span className="flex items-center gap-1">
                          <FaMapMarkerAlt className="text-primary/50 text-[10px]" />
                          {warehouse.state || "N/A"}
                        </span>
                        <span className="text-text-muted pl-3.5">
                          Cluster: <strong>{warehouse.cluster || "N/A"}</strong>
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      {enabledKits > 0 ? (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black bg-success/10 text-success border border-success/20">
                          <FaBoxes size={9} />
                          {enabledKits} Kits Enabled
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-[10px] font-black bg-surface-hover text-text-muted border border-border/40">
                          Not Configured
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Button
                        onClick={() => handleConfigureBulkKits(warehouse)}
                        size="sm"
                        leftIcon={<FaSlidersH />}
                        className="rounded-lg text-[10px] font-bold uppercase tracking-wider py-1.5"
                      >
                        Configure Bulk Kits
                      </Button>
                    </td>
                  </>
                )}
              />
            </div>
          </div>
        </>
      )}
    </div>
  );
}
