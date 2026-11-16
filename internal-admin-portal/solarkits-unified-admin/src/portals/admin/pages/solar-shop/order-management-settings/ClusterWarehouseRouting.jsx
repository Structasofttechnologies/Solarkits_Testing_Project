import { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import axios from "axios";
import {
  FaLayerGroup,
  FaWarehouse,
  FaBoxes,
  FaPlus,
  FaEdit,
  FaTrash,
  FaCheck,
  FaTimes,
  FaSearch,
  FaMapMarkerAlt,
  FaClock,
  FaShippingFast,
  FaSync
} from "react-icons/fa";
import { setAlert } from "@/features/alert.slice";
import Button from "@/components/Button";
import Loader from "@/components/Loader";
import CustomInput from "@/components/CustomInput";
import Dialog from "@/components/Dialog";
import ToggleButton from "@/components/ToggleButton";
import { authHeaderObj } from "@/app/authHeader";

const API_URL = import.meta.env.VITE_API_URL;
const ROUTING_API = `${API_URL}/solarshop/cluster-routing`;

const ALL_INDIAN_STATES = [
  "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh", "Delhi",
  "Goa", "Gujarat", "Haryana", "Himachal Pradesh", "Jharkhand", "Karnataka", "Kerala",
  "Madhya Pradesh", "Maharashtra", "Manipur", "Meghalaya", "Mizoram", "Nagaland",
  "Odisha", "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu", "Telangana", "Tripura",
  "Uttar Pradesh", "Uttarakhand", "West Bengal"
];

export default function ClusterWarehouseRouting() {
  const dispatch = useDispatch();
  const token = useSelector((state) => state.auth.token);

  const [activeTab, setActiveTab] = useState("clusters"); // "clusters" | "mappings" | "capabilities"
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Data states
  const [clusters, setClusters] = useState([]);
  const [mappings, setMappings] = useState([]);
  const [capabilities, setCapabilities] = useState([]);
  const [availableWarehouses, setAvailableWarehouses] = useState([]);

  // Cluster Modal
  const [clusterModalOpen, setClusterModalOpen] = useState(false);
  const [editingCluster, setEditingCluster] = useState(null);
  const [clusterFormData, setClusterFormData] = useState({
    name: "",
    code: "",
    states: [],
    status: "Active",
  });

  // Mapping Modal
  const [mappingModalOpen, setMappingModalOpen] = useState(false);
  const [editingMapping, setEditingMapping] = useState(null);
  const [mappingFormData, setMappingFormData] = useState({
    warehouse_name: "",
    warehouse_code: "",
    cluster_id: "",
    states: [],
    kit_types: ["Combo Kit"],
    effective_from: new Date().toISOString().split("T")[0],
    status: "Active",
  });

  // Capability Edit Modal
  const [capacityModalOpen, setCapacityModalOpen] = useState(false);
  const [editingCapability, setEditingCapability] = useState(null);
  const [capacityFormData, setCapacityFormData] = useState({
    daily_capacity: 40,
    cutoff_time: "17:00",
    status: "Active"
  });

  // Delete Confirmation Modal
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState(null);
  const [deleteType, setDeleteType] = useState("cluster"); // "cluster" | "mapping"

  // ─────────────────────────────────────────────────────────────
  // API Fetch
  // ─────────────────────────────────────────────────────────────
  const fetchAllData = async (isManualRefresh = false) => {
    if (isManualRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const headers = authHeaderObj();

      const [clustersRes, mappingsRes, capabilitiesRes, warehousesRes] = await Promise.allSettled([
        axios.get(`${ROUTING_API}/clusters`, { headers }),
        axios.get(`${ROUTING_API}/mappings`, { headers }),
        axios.get(`${ROUTING_API}/capabilities`, { headers }),
        axios.get(`${ROUTING_API}/available-warehouses`, { headers }),
      ]);

      if (clustersRes.status === "fulfilled" && clustersRes.value?.data?.data) {
        setClusters(clustersRes.value.data.data);
      }
      if (mappingsRes.status === "fulfilled" && mappingsRes.value?.data?.data) {
        setMappings(mappingsRes.value.data.data);
      }
      if (capabilitiesRes.status === "fulfilled" && capabilitiesRes.value?.data?.data) {
        setCapabilities(capabilitiesRes.value.data.data);
      }
      if (warehousesRes.status === "fulfilled" && warehousesRes.value?.data?.data) {
        setAvailableWarehouses(warehousesRes.value.data.data);
      }
    } catch (err) {
      console.error("Error loading cluster routing data:", err);
      dispatch(setAlert({ type: "error", message: "Failed to load cluster routing data" }));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (token) {
      fetchAllData();
    }
  }, [token]);

  // ─────────────────────────────────────────────────────────────
  // Cluster Handlers
  // ─────────────────────────────────────────────────────────────
  const handleOpenClusterModal = (cluster = null) => {
    if (cluster) {
      setEditingCluster(cluster);
      setClusterFormData({
        name: cluster.name || "",
        code: cluster.code || "",
        states: cluster.states || [],
        status: cluster.status || "Active",
      });
    } else {
      setEditingCluster(null);
      setClusterFormData({
        name: "",
        code: `CL-${Date.now().toString().slice(-4)}`,
        states: [],
        status: "Active",
      });
    }
    setClusterModalOpen(true);
  };

  const handleSaveCluster = async (e) => {
    e.preventDefault();
    if (!clusterFormData.name?.trim()) {
      dispatch(setAlert({ type: "warning", message: "Please enter cluster name" }));
      return;
    }
    if (!clusterFormData.states || clusterFormData.states.length === 0) {
      dispatch(setAlert({ type: "warning", message: "Please select at least one state" }));
      return;
    }

    try {
      const headers = authHeaderObj();
      if (editingCluster) {
        const res = await axios.put(
          `${ROUTING_API}/clusters/${editingCluster.id}`,
          clusterFormData,
          { headers }
        );
        if (res.data?.status === "success") {
          setClusters((prev) =>
            prev.map((c) => (c.id === editingCluster.id ? res.data.data : c))
          );
          dispatch(setAlert({ type: "success", message: "Cluster updated successfully!" }));
        }
      } else {
        const res = await axios.post(`${ROUTING_API}/clusters`, clusterFormData, { headers });
        if (res.data?.status === "success") {
          setClusters((prev) => [res.data.data, ...prev]);
          dispatch(setAlert({ type: "success", message: "Cluster created successfully!" }));
        }
      }
      setClusterModalOpen(false);
      fetchAllData();
    } catch (err) {
      console.error("Error saving cluster:", err);
      dispatch(
        setAlert({
          type: "error",
          message: err.response?.data?.message || "Failed to save cluster",
        })
      );
    }
  };

  const confirmDeleteCluster = (cluster) => {
    setItemToDelete(cluster);
    setDeleteType("cluster");
    setDeleteModalOpen(true);
  };

  const executeDelete = async () => {
    if (!itemToDelete) return;

    try {
      const headers = authHeaderObj();
      if (deleteType === "cluster") {
        await axios.delete(`${ROUTING_API}/clusters/${itemToDelete.id}`, { headers });
        setClusters((prev) => prev.filter((c) => c.id !== itemToDelete.id));
        dispatch(setAlert({ type: "info", message: "Cluster removed" }));
      } else if (deleteType === "mapping") {
        await axios.delete(`${ROUTING_API}/mappings/${itemToDelete.id}`, { headers });
        setMappings((prev) => prev.filter((m) => m.id !== itemToDelete.id));
        dispatch(setAlert({ type: "info", message: "Warehouse mapping removed" }));
      }
    } catch (err) {
      console.error("Error deleting item:", err);
      dispatch(
        setAlert({
          type: "error",
          message: err.response?.data?.message || "Failed to delete item",
        })
      );
    } finally {
      setDeleteModalOpen(false);
      setItemToDelete(null);
    }
  };

  // ─────────────────────────────────────────────────────────────
  // Mapping Handlers
  // ─────────────────────────────────────────────────────────────
  const handleOpenMappingModal = (mapping = null) => {
    if (mapping) {
      setEditingMapping(mapping);
      setMappingFormData({
        warehouse_name: mapping.warehouse_name || "",
        warehouse_code: mapping.warehouse_code || "",
        cluster_id: mapping.cluster_id || "",
        states: mapping.states || [],
        kit_types: mapping.kit_types || ["Combo Kit"],
        effective_from: mapping.effective_from || new Date().toISOString().split("T")[0],
        status: mapping.status || "Active",
      });
    } else {
      setEditingMapping(null);
      const defaultCluster = clusters[0];
      setMappingFormData({
        warehouse_name: availableWarehouses[0]?.warehouse_name || "",
        warehouse_code: availableWarehouses[0]?.warehouse_code || "",
        cluster_id: defaultCluster?.id || "",
        states: defaultCluster?.states || [],
        kit_types: ["Combo Kit"],
        effective_from: new Date().toISOString().split("T")[0],
        status: "Active",
      });
    }
    setMappingModalOpen(true);
  };

  const handleWarehouseSelect = (selectedWhCode) => {
    const selectedWh = availableWarehouses.find((w) => w.warehouse_code === selectedWhCode);
    if (selectedWh) {
      setMappingFormData((prev) => ({
        ...prev,
        warehouse_id: selectedWh.id || selectedWh._id,
        warehouse_code: selectedWh.warehouse_code,
        warehouse_name: selectedWh.warehouse_name,
      }));
    }
  };

  const handleSaveMapping = async (e) => {
    e.preventDefault();
    if (!mappingFormData.warehouse_name || !mappingFormData.cluster_id) {
      dispatch(setAlert({ type: "warning", message: "Warehouse and Cluster are required" }));
      return;
    }

    try {
      const headers = authHeaderObj();
      if (editingMapping) {
        const res = await axios.put(
          `${ROUTING_API}/mappings/${editingMapping.id}`,
          mappingFormData,
          { headers }
        );
        if (res.data?.status === "success") {
          setMappings((prev) =>
            prev.map((m) => (m.id === editingMapping.id ? res.data.data : m))
          );
          dispatch(setAlert({ type: "success", message: "Mapping updated successfully!" }));
        }
      } else {
        const res = await axios.post(`${ROUTING_API}/mappings`, mappingFormData, { headers });
        if (res.data?.status === "success") {
          setMappings((prev) => [res.data.data, ...prev]);
          dispatch(setAlert({ type: "success", message: "Warehouse mapped successfully!" }));
        }
      }
      setMappingModalOpen(false);
      fetchAllData();
    } catch (err) {
      console.error("Error saving mapping:", err);
      dispatch(
        setAlert({
          type: "error",
          message: err.response?.data?.message || "Failed to save mapping",
        })
      );
    }
  };

  const confirmDeleteMapping = (mapping) => {
    setItemToDelete(mapping);
    setDeleteType("mapping");
    setDeleteModalOpen(true);
  };

  // ─────────────────────────────────────────────────────────────
  // Capability Handlers
  // ─────────────────────────────────────────────────────────────
  const handleToggleCapability = async (warehouseId, capabilityKey, forcedVal = null) => {
    const currentWh = capabilities.find(
      (w) =>
        w.warehouse_id === warehouseId ||
        w.warehouse_code === warehouseId ||
        w.id === warehouseId ||
        w._id === warehouseId
    );
    if (!currentWh) return;

    const currentVal = Boolean(currentWh.capabilities?.[capabilityKey]);
    const newCapState =
      forcedVal !== null && forcedVal !== undefined
        ? Boolean(forcedVal)
        : !currentVal;

    const updatedCapabilities = {
      combo_kit: Boolean(currentWh.capabilities?.combo_kit),
      customize_kit: Boolean(currentWh.capabilities?.customize_kit),
      bulk_kit: Boolean(currentWh.capabilities?.bulk_kit),
      [capabilityKey]: newCapState,
    };

    // Optimistic UI update
    setCapabilities((prev) =>
      prev.map((wh) =>
        wh.warehouse_id === warehouseId ||
        wh.warehouse_code === warehouseId ||
        wh.id === warehouseId ||
        wh._id === warehouseId
          ? { ...wh, capabilities: updatedCapabilities }
          : wh
      )
    );

    try {
      const headers = authHeaderObj();
      await axios.put(
        `${ROUTING_API}/capabilities/${warehouseId}?unique_id=ADM_ORDER_SETTINGS&req_for=edit`,
        { capabilities: updatedCapabilities },
        { headers }
      );
      dispatch(
        setAlert({
          type: "success",
          message: `${currentWh.warehouse_name}: ${capabilityKey.replace("_", " ")} ${newCapState ? "enabled" : "disabled"}`,
        })
      );
    } catch (err) {
      console.error("Error updating capability:", err);
      // Revert on failure
      setCapabilities((prev) =>
        prev.map((wh) =>
          wh.warehouse_id === warehouseId ||
          wh.warehouse_code === warehouseId ||
          wh.id === warehouseId ||
          wh._id === warehouseId
            ? { ...wh, capabilities: currentWh.capabilities }
            : wh
        )
      );
      dispatch(
        setAlert({
          type: "error",
          message: err.response?.data?.message || "Failed to update kit capability on server",
        })
      );
    }
  };

  const handleOpenCapacityModal = (wh) => {
    setEditingCapability(wh);
    setCapacityFormData({
      daily_capacity: wh.daily_capacity || 40,
      cutoff_time: wh.cutoff_time || "17:00",
      status: wh.status || "Active",
    });
    setCapacityModalOpen(true);
  };

  const handleSaveCapacitySettings = async (e) => {
    e.preventDefault();
    if (!editingCapability) return;

    try {
      const headers = authHeaderObj();
      const res = await axios.put(
        `${ROUTING_API}/capabilities/${editingCapability.warehouse_id || editingCapability.warehouse_code}`,
        capacityFormData,
        { headers }
      );
      if (res.data?.status === "success") {
        setCapabilities((prev) =>
          prev.map((wh) =>
            wh.warehouse_id === editingCapability.warehouse_id ||
            wh.warehouse_code === editingCapability.warehouse_code
              ? { ...wh, ...res.data.data }
              : wh
          )
        );
        dispatch(setAlert({ type: "success", message: "Warehouse dispatch settings updated!" }));
      }
      setCapacityModalOpen(false);
    } catch (err) {
      console.error("Error updating capacity settings:", err);
      dispatch(
        setAlert({
          type: "error",
          message: err.response?.data?.message || "Failed to update dispatch settings",
        })
      );
    }
  };

  // Filter clusters by search
  const filteredClusters = clusters.filter(
    (c) =>
      c.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.code?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.states?.some((s) => s.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  // Filter mappings by search
  const filteredMappings = mappings.filter(
    (m) =>
      m.warehouse_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.warehouse_code?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.cluster_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.states?.some((s) => s.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="bg-surface p-6 rounded-xl border border-border shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-text-primary flex items-center gap-2">
            <FaLayerGroup className="text-primary" /> State-wise Cluster & Warehouse Routing
          </h2>
          <p className="text-text-secondary text-sm">
            Define multi-state clusters, map primary fulfillment warehouses, and configure kit capability routing.
          </p>
        </div>

        {/* Tab Navigation & Refresh */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => fetchAllData(true)}
            disabled={refreshing}
            className="p-2.5 rounded-lg border border-border bg-bg text-text-secondary hover:text-primary transition-colors disabled:opacity-50"
            title="Refresh Data"
          >
            <FaSync className={refreshing ? "animate-spin text-primary" : ""} />
          </button>

          <div className="flex bg-bg p-1 rounded-lg border border-border">
            <button
              onClick={() => setActiveTab("clusters")}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-all flex items-center gap-2 ${
                activeTab === "clusters"
                  ? "bg-primary text-white shadow-sm"
                  : "text-text-secondary hover:text-text-primary"
              }`}
            >
              <FaLayerGroup /> Clusters ({clusters.length})
            </button>
            <button
              onClick={() => setActiveTab("mappings")}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-all flex items-center gap-2 ${
                activeTab === "mappings"
                  ? "bg-primary text-white shadow-sm"
                  : "text-text-secondary hover:text-text-primary"
              }`}
            >
              <FaWarehouse /> Warehouse Mapping ({mappings.length})
            </button>
            <button
              onClick={() => setActiveTab("capabilities")}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-all flex items-center gap-2 ${
                activeTab === "capabilities"
                  ? "bg-primary text-white shadow-sm"
                  : "text-text-secondary hover:text-text-primary"
              }`}
            >
              <FaBoxes /> Kit Capabilities ({capabilities.length})
            </button>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="py-20">
          <Loader text="Loading Cluster Routing Network..." />
        </div>
      ) : (
        <>
          {/* ───────────────────────────────────────────────────────────── */}
          {/* TAB 1: CLUSTERS */}
          {/* ───────────────────────────────────────────────────────────── */}
          {activeTab === "clusters" && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                <div className="relative w-full sm:w-72">
                  <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary text-sm" />
                  <input
                    type="text"
                    placeholder="Search clusters or states..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 text-sm bg-surface border border-border rounded-lg focus:outline-none focus:border-primary text-text-primary"
                  />
                </div>
                <Button
                  onClick={() => handleOpenClusterModal()}
                  className="w-full sm:w-auto flex items-center justify-center gap-2"
                >
                  <FaPlus /> Add New Cluster
                </Button>
              </div>

              <div className="bg-surface rounded-xl border border-border overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-bg border-b border-border text-xs uppercase font-semibold text-text-secondary">
                        <th className="p-4">Cluster Name & Code</th>
                        <th className="p-4">Assigned States</th>
                        <th className="p-4">Mapped Warehouses</th>
                        <th className="p-4">Status</th>
                        <th className="p-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border text-sm">
                      {filteredClusters.length === 0 ? (
                        <tr>
                          <td colSpan="5" className="p-8 text-center text-text-secondary">
                            No regional clusters found matching your query.
                          </td>
                        </tr>
                      ) : (
                        filteredClusters.map((cluster) => (
                          <tr key={cluster.id} className="hover:bg-bg/50 transition-colors">
                            <td className="p-4 font-medium text-text-primary">
                              <div className="font-bold text-base">{cluster.name}</div>
                              <span className="text-xs text-text-secondary font-mono bg-bg px-2 py-0.5 rounded border border-border">
                                {cluster.code}
                              </span>
                            </td>
                            <td className="p-4">
                              <div className="flex flex-wrap gap-1.5 max-w-md">
                                {cluster.states?.map((st) => (
                                  <span
                                    key={st}
                                    className="px-2 py-0.5 rounded-full text-xs bg-primary/10 text-primary border border-primary/20"
                                  >
                                    {st}
                                  </span>
                                ))}
                              </div>
                            </td>
                            <td className="p-4">
                              <span className="font-semibold text-text-primary">
                                {cluster.warehouses_count || 0}
                              </span>{" "}
                              warehouse(s)
                            </td>
                            <td className="p-4">
                              <span
                                className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                                  cluster.status === "Active"
                                    ? "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20"
                                    : "bg-zinc-500/10 text-zinc-500 border border-zinc-500/20"
                                }`}
                              >
                                {cluster.status}
                              </span>
                            </td>
                            <td className="p-4 text-right space-x-2">
                              <button
                                onClick={() => handleOpenClusterModal(cluster)}
                                className="p-1.5 hover:bg-bg rounded text-text-secondary hover:text-primary transition-colors"
                                title="Edit Cluster"
                              >
                                <FaEdit />
                              </button>
                              <button
                                onClick={() => confirmDeleteCluster(cluster)}
                                className="p-1.5 hover:bg-bg rounded text-text-secondary hover:text-red-500 transition-colors"
                                title="Delete Cluster"
                              >
                                <FaTrash />
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ───────────────────────────────────────────────────────────── */}
          {/* TAB 2: WAREHOUSE MAPPING */}
          {/* ───────────────────────────────────────────────────────────── */}
          {activeTab === "mappings" && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                <div className="relative w-full sm:w-72">
                  <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary text-sm" />
                  <input
                    type="text"
                    placeholder="Search warehouses or states..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 text-sm bg-surface border border-border rounded-lg focus:outline-none focus:border-primary text-text-primary"
                  />
                </div>
                <Button
                  onClick={() => handleOpenMappingModal()}
                  className="w-full sm:w-auto flex items-center justify-center gap-2"
                >
                  <FaPlus /> Map Warehouse to Cluster
                </Button>
              </div>

              <div className="bg-surface rounded-xl border border-border overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-bg border-b border-border text-xs uppercase font-semibold text-text-secondary">
                        <th className="p-4">Warehouse</th>
                        <th className="p-4">Cluster Assigned</th>
                        <th className="p-4">Fulfillment States</th>
                        <th className="p-4">Kit Types Capable</th>
                        <th className="p-4">Effective Date</th>
                        <th className="p-4">Status</th>
                        <th className="p-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border text-sm">
                      {filteredMappings.length === 0 ? (
                        <tr>
                          <td colSpan="7" className="p-8 text-center text-text-secondary">
                            No warehouse mappings found matching your query.
                          </td>
                        </tr>
                      ) : (
                        filteredMappings.map((item) => (
                          <tr key={item.id} className="hover:bg-bg/50 transition-colors">
                            <td className="p-4">
                              <div className="font-semibold text-text-primary">{item.warehouse_name}</div>
                              <div className="text-xs text-text-secondary font-mono">{item.warehouse_code}</div>
                            </td>
                            <td className="p-4 font-medium text-text-primary">
                              <span className="px-2.5 py-1 rounded bg-bg border border-border font-medium text-xs">
                                {item.cluster_name}
                              </span>
                            </td>
                            <td className="p-4">
                              <div className="flex flex-wrap gap-1 max-w-xs">
                                {item.states?.map((st) => (
                                  <span
                                    key={st}
                                    className="px-2 py-0.5 rounded text-xs bg-bg border border-border text-text-secondary"
                                  >
                                    {st}
                                  </span>
                                ))}
                              </div>
                            </td>
                            <td className="p-4">
                              <div className="flex flex-wrap gap-1">
                                {item.kit_types?.map((kt) => (
                                  <span
                                    key={kt}
                                    className="px-2 py-0.5 rounded text-xs bg-amber-500/10 text-amber-600 border border-amber-500/20 font-medium"
                                  >
                                    {kt}
                                  </span>
                                ))}
                              </div>
                            </td>
                            <td className="p-4 text-text-secondary text-xs">{item.effective_from}</td>
                            <td className="p-4">
                              <span
                                className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                                  item.status === "Active"
                                    ? "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20"
                                    : "bg-zinc-500/10 text-zinc-500 border border-zinc-500/20"
                                }`}
                              >
                                {item.status}
                              </span>
                            </td>
                            <td className="p-4 text-right space-x-2">
                              <button
                                onClick={() => handleOpenMappingModal(item)}
                                className="p-1.5 hover:bg-bg rounded text-text-secondary hover:text-primary transition-colors"
                                title="Edit Mapping"
                              >
                                <FaEdit />
                              </button>
                              <button
                                onClick={() => confirmDeleteMapping(item)}
                                className="p-1.5 hover:bg-bg rounded text-text-secondary hover:text-red-500 transition-colors"
                                title="Delete Mapping"
                              >
                                <FaTrash />
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ───────────────────────────────────────────────────────────── */}
          {/* TAB 3: KIT CAPABILITIES PER WAREHOUSE */}
          {/* ───────────────────────────────────────────────────────────── */}
          {activeTab === "capabilities" && (
            capabilities.length === 0 ? (
              <div className="bg-surface rounded-xl border border-border p-12 text-center space-y-2">
                <FaWarehouse className="mx-auto text-4xl text-text-secondary/40 mb-2" />
                <h4 className="font-bold text-text-primary text-base">No Warehouse Capabilities Found</h4>
                <p className="text-xs text-text-secondary max-w-md mx-auto">
                  No active company warehouses found. Active warehouses from Warehouse Management will automatically appear here.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {capabilities.map((wh) => (
                  <div
                    key={wh.warehouse_id || wh.warehouse_code}
                    className="bg-surface rounded-xl border border-border p-6 shadow-sm space-y-4 hover:border-primary/50 transition-all"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-bold text-text-primary text-lg flex items-center gap-2">
                          <FaWarehouse className="text-primary" /> {wh.warehouse_name}
                        </h3>
                        <p className="text-xs text-text-secondary flex items-center gap-1 mt-1">
                          <FaMapMarkerAlt /> {wh.location || "India"} | Code: {wh.warehouse_code}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold px-2.5 py-1 rounded-md bg-bg border border-border text-text-primary flex items-center gap-1">
                          <FaClock className="text-amber-500" /> Cutoff: {wh.cutoff_time}
                        </span>
                        <button
                          onClick={() => handleOpenCapacityModal(wh)}
                          className="p-1.5 hover:bg-bg rounded text-text-secondary hover:text-primary border border-border transition-colors text-xs"
                          title="Edit Dispatch Limits"
                        >
                          <FaEdit />
                        </button>
                      </div>
                    </div>

                    <div className="bg-bg/60 p-4 rounded-lg border border-border space-y-3">
                      <div className="text-xs font-semibold uppercase text-text-secondary tracking-wider">
                        Supported Kit Fulfillment Types
                      </div>

                      <div className="flex items-center justify-between py-1 border-b border-border/50">
                        <div>
                          <div className="text-sm font-medium text-text-primary">Combo Kits</div>
                          <div className="text-xs text-text-secondary">Standard pre-engineered turnkey packages</div>
                        </div>
                        <ToggleButton
                          checked={Boolean(wh.capabilities?.combo_kit)}
                          isChecked={Boolean(wh.capabilities?.combo_kit)}
                          onChange={(val) =>
                            handleToggleCapability(wh.warehouse_id || wh.warehouse_code || wh.id, "combo_kit", val)
                          }
                        />
                      </div>

                      <div className="flex items-center justify-between py-1 border-b border-border/50">
                        <div>
                          <div className="text-sm font-medium text-text-primary">Customize Kits</div>
                          <div className="text-xs text-text-secondary">Customized BOM configurations</div>
                        </div>
                        <ToggleButton
                          checked={Boolean(wh.capabilities?.customize_kit)}
                          isChecked={Boolean(wh.capabilities?.customize_kit)}
                          onChange={(val) =>
                            handleToggleCapability(wh.warehouse_id || wh.warehouse_code || wh.id, "customize_kit", val)
                          }
                        />
                      </div>

                      <div className="flex items-center justify-between py-1">
                        <div>
                          <div className="text-sm font-medium text-text-primary">Bulk Kits</div>
                          <div className="text-xs text-text-secondary">High-capacity commercial lots</div>
                        </div>
                        <ToggleButton
                          checked={Boolean(wh.capabilities?.bulk_kit)}
                          isChecked={Boolean(wh.capabilities?.bulk_kit)}
                          onChange={(val) =>
                            handleToggleCapability(wh.warehouse_id || wh.warehouse_code || wh.id, "bulk_kit", val)
                          }
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-xs text-text-secondary pt-2">
                      <span className="flex items-center gap-1">
                        <FaShippingFast className="text-primary" /> Max Daily Dispatch:{" "}
                        <strong className="text-text-primary">{wh.daily_capacity} Kits/day</strong>
                      </span>
                      <span className="text-emerald-500 font-medium flex items-center gap-1">
                        <FaCheck /> Routing Active
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )
          )}
        </>
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* MODAL: ADD / EDIT CLUSTER */}
      {/* ───────────────────────────────────────────────────────────── */}
      {clusterModalOpen && (
        <Dialog
          isOpen={clusterModalOpen}
          onClose={() => setClusterModalOpen(false)}
          title={editingCluster ? "Edit Regional Cluster" : "Create Regional Cluster"}
        >
          <form onSubmit={handleSaveCluster} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-text-secondary mb-1">
                Cluster Name *
              </label>
              <CustomInput
                placeholder="e.g. North Zone - Haryana & Punjab"
                value={clusterFormData.name}
                onChange={(e) => setClusterFormData({ ...clusterFormData, name: e.target.value })}
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-text-secondary mb-1">
                Cluster Identifier Code *
              </label>
              <CustomInput
                placeholder="e.g. CL-NORTH-01"
                value={clusterFormData.code}
                onChange={(e) => setClusterFormData({ ...clusterFormData, code: e.target.value.toUpperCase() })}
                required
              />
            </div>

            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="block text-xs font-semibold text-text-secondary">
                  Assign States to Cluster * ({clusterFormData.states.length} selected)
                </label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setClusterFormData({ ...clusterFormData, states: [...ALL_INDIAN_STATES] })}
                    className="text-xs text-primary hover:underline"
                  >
                    Select All
                  </button>
                  <button
                    type="button"
                    onClick={() => setClusterFormData({ ...clusterFormData, states: [] })}
                    className="text-xs text-text-secondary hover:underline"
                  >
                    Clear
                  </button>
                </div>
              </div>

              <div className="max-h-48 overflow-y-auto bg-bg p-3 rounded-lg border border-border grid grid-cols-2 gap-2 text-xs">
                {ALL_INDIAN_STATES.map((state) => {
                  const isChecked = clusterFormData.states.includes(state);
                  return (
                    <label
                      key={state}
                      className="flex items-center gap-2 cursor-pointer hover:text-primary transition-colors"
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => {
                          if (isChecked) {
                            setClusterFormData({
                              ...clusterFormData,
                              states: clusterFormData.states.filter((s) => s !== state),
                            });
                          } else {
                            setClusterFormData({
                              ...clusterFormData,
                              states: [...clusterFormData.states, state],
                            });
                          }
                        }}
                        className="rounded border-border text-primary focus:ring-primary"
                      />
                      <span>{state}</span>
                    </label>
                  );
                })}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-text-secondary mb-1">Status</label>
              <select
                value={clusterFormData.status}
                onChange={(e) => setClusterFormData({ ...clusterFormData, status: e.target.value })}
                className="w-full px-3 py-2 text-sm bg-bg border border-border rounded-lg text-text-primary focus:outline-none focus:border-primary"
              >
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
              </select>
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-border">
              <Button variant="secondary" onClick={() => setClusterModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit">Save Cluster</Button>
            </div>
          </form>
        </Dialog>
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* MODAL: ADD / EDIT WAREHOUSE MAPPING */}
      {/* ───────────────────────────────────────────────────────────── */}
      {mappingModalOpen && (
        <Dialog
          isOpen={mappingModalOpen}
          onClose={() => setMappingModalOpen(false)}
          title={editingMapping ? "Edit Warehouse Mapping" : "Map Warehouse to Cluster"}
        >
          <form onSubmit={handleSaveMapping} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-text-secondary mb-1">
                Select Company Warehouse *
              </label>
              {availableWarehouses.length > 0 ? (
                <select
                  value={mappingFormData.warehouse_code}
                  onChange={(e) => handleWarehouseSelect(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-bg border border-border rounded-lg text-text-primary focus:outline-none focus:border-primary mb-2"
                >
                  <option value="">-- Choose Existing Warehouse --</option>
                  {availableWarehouses.map((w) => (
                    <option key={w.warehouse_code} value={w.warehouse_code}>
                      {w.warehouse_name} [{w.warehouse_code}]
                    </option>
                  ))}
                </select>
              ) : null}

              <CustomInput
                placeholder="Or custom warehouse name e.g. Bhiwandi Central Hub (WH-01)"
                value={mappingFormData.warehouse_name}
                onChange={(e) =>
                  setMappingFormData({ ...mappingFormData, warehouse_name: e.target.value })
                }
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-text-secondary mb-1">
                Target Regional Cluster *
              </label>
              <select
                value={mappingFormData.cluster_id}
                onChange={(e) => {
                  const selectedId = e.target.value;
                  const c = clusters.find((cl) => cl.id === selectedId);
                  setMappingFormData({
                    ...mappingFormData,
                    cluster_id: selectedId,
                    states: c?.states || [],
                  });
                }}
                className="w-full px-3 py-2 text-sm bg-bg border border-border rounded-lg text-text-primary focus:outline-none focus:border-primary"
                required
              >
                <option value="">Select a Cluster</option>
                {clusters.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.states?.join(", ")})
                  </option>
                ))}
              </select>
            </div>

            {/* Fulfillment States within the Cluster */}
            <div>
              <label className="block text-xs font-semibold text-text-secondary mb-1">
                Fulfillment States Assigned ({mappingFormData.states.length} selected)
              </label>
              <div className="max-h-36 overflow-y-auto bg-bg p-3 rounded-lg border border-border flex flex-wrap gap-2 text-xs">
                {(() => {
                  const targetCluster = clusters.find((c) => c.id === mappingFormData.cluster_id);
                  const candidateStates = targetCluster?.states?.length
                    ? targetCluster.states
                    : ALL_INDIAN_STATES;

                  return candidateStates.map((st) => {
                    const isChecked = mappingFormData.states.includes(st);
                    return (
                      <label
                        key={st}
                        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md border text-xs cursor-pointer transition-colors ${
                          isChecked
                            ? "bg-primary/10 border-primary text-primary font-medium"
                            : "bg-surface border-border text-text-secondary"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => {
                            if (isChecked) {
                              setMappingFormData({
                                ...mappingFormData,
                                states: mappingFormData.states.filter((s) => s !== st),
                              });
                            } else {
                              setMappingFormData({
                                ...mappingFormData,
                                states: [...mappingFormData.states, st],
                              });
                            }
                          }}
                          className="hidden"
                        />
                        <span>{st}</span>
                      </label>
                    );
                  })();
                })}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-text-secondary mb-1">
                Kit Types Capable
              </label>
              <div className="flex gap-4">
                {["Combo Kit", "Customize Kit", "Bulk Kit"].map((kt) => {
                  const isChecked = mappingFormData.kit_types.includes(kt);
                  return (
                    <label
                      key={kt}
                      className="flex items-center gap-1.5 text-xs text-text-primary cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => {
                          if (isChecked) {
                            setMappingFormData({
                              ...mappingFormData,
                              kit_types: mappingFormData.kit_types.filter((k) => k !== kt),
                            });
                          } else {
                            setMappingFormData({
                              ...mappingFormData,
                              kit_types: [...mappingFormData.kit_types, kt],
                            });
                          }
                        }}
                      />
                      <span>{kt}</span>
                    </label>
                  );
                })}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-text-secondary mb-1">
                  Effective From Date
                </label>
                <CustomInput
                  type="date"
                  value={mappingFormData.effective_from}
                  onChange={(e) =>
                    setMappingFormData({ ...mappingFormData, effective_from: e.target.value })
                  }
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-text-secondary mb-1">
                  Status
                </label>
                <select
                  value={mappingFormData.status}
                  onChange={(e) =>
                    setMappingFormData({ ...mappingFormData, status: e.target.value })
                  }
                  className="w-full px-3 py-2 text-sm bg-bg border border-border rounded-lg text-text-primary focus:outline-none focus:border-primary"
                >
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-border">
              <Button variant="secondary" onClick={() => setMappingModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit">Save Mapping</Button>
            </div>
          </form>
        </Dialog>
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* MODAL: EDIT WAREHOUSE CAPACITY & CUTOFF */}
      {/* ───────────────────────────────────────────────────────────── */}
      {capacityModalOpen && editingCapability && (
        <Dialog
          isOpen={capacityModalOpen}
          onClose={() => setCapacityModalOpen(false)}
          title={`Edit Dispatch Limits: ${editingCapability.warehouse_name}`}
        >
          <form onSubmit={handleSaveCapacitySettings} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-text-secondary mb-1">
                Max Daily Dispatch Capacity (Kits per Day)
              </label>
              <CustomInput
                type="number"
                min="1"
                max="500"
                value={capacityFormData.daily_capacity}
                onChange={(e) =>
                  setCapacityFormData({ ...capacityFormData, daily_capacity: e.target.value })
                }
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-text-secondary mb-1">
                Same-Day Dispatch Cutoff Time (24h format HH:MM)
              </label>
              <CustomInput
                type="time"
                value={capacityFormData.cutoff_time}
                onChange={(e) =>
                  setCapacityFormData({ ...capacityFormData, cutoff_time: e.target.value })
                }
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-text-secondary mb-1">
                Routing Status
              </label>
              <select
                value={capacityFormData.status}
                onChange={(e) =>
                  setCapacityFormData({ ...capacityFormData, status: e.target.value })
                }
                className="w-full px-3 py-2 text-sm bg-bg border border-border rounded-lg text-text-primary focus:outline-none focus:border-primary"
              >
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
              </select>
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-border">
              <Button variant="secondary" onClick={() => setCapacityModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit">Update Dispatch Limits</Button>
            </div>
          </form>
        </Dialog>
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* MODAL: DELETE CONFIRMATION */}
      {/* ───────────────────────────────────────────────────────────── */}
      {deleteModalOpen && itemToDelete && (
        <Dialog
          isOpen={deleteModalOpen}
          onClose={() => setDeleteModalOpen(false)}
          title={`Confirm Delete ${deleteType === "cluster" ? "Cluster" : "Warehouse Mapping"}`}
        >
          <div className="space-y-4">
            <p className="text-sm text-text-secondary">
              Are you sure you want to remove{" "}
              <strong className="text-text-primary">
                {deleteType === "cluster" ? itemToDelete.name : itemToDelete.warehouse_name}
              </strong>
              ? This item will be marked inactive and removed from routing rules.
            </p>

            <div className="flex justify-end gap-3 pt-3 border-t border-border">
              <Button variant="secondary" onClick={() => setDeleteModalOpen(false)}>
                Cancel
              </Button>
              <button
                type="button"
                onClick={executeDelete}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium transition-colors"
              >
                Yes, Delete
              </button>
            </div>
          </div>
        </Dialog>
      )}
    </div>
  );
}
