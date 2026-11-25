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
  const [coverageStates, setCoverageStates] = useState([]);
  const [modalStateSearch, setModalStateSearch] = useState("");
  const [expandedRowId, setExpandedRowId] = useState(null);

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
    warehouse_id: "",
    warehouse_name: "",
    warehouse_code: "",
    cluster_id: "",
    cluster_name: "",
    states: [],
    franchise_cluster_ids: [],
    franchise_clusters: [],
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

      const [clustersRes, mappingsRes, capabilitiesRes, warehousesRes, coverageRes] = await Promise.allSettled([
        axios.get(`${ROUTING_API}/clusters`, { headers }),
        axios.get(`${ROUTING_API}/mappings`, { headers }),
        axios.get(`${ROUTING_API}/capabilities`, { headers }),
        axios.get(`${ROUTING_API}/available-warehouses`, { headers }),
        axios.get(`${ROUTING_API}/coverage-options`, { headers }),
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
      if (coverageRes.status === "fulfilled" && coverageRes.value?.data?.data?.states) {
        setCoverageStates(coverageRes.value.data.data.states);
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
      const mStates = Array.isArray(mapping.states) ? mapping.states : [];
      const mFcIds = Array.isArray(mapping.franchise_cluster_ids)
        ? mapping.franchise_cluster_ids.map(id => id.toString())
        : (Array.isArray(mapping.franchise_clusters)
          ? mapping.franchise_clusters.map(fc => (fc.cluster_id || fc.id || fc._id)?.toString()).filter(Boolean)
          : []);

      const matchedWh = availableWarehouses.find((w) => w.warehouse_code === mapping.warehouse_code);
      const resolvedWhName = matchedWh?.warehouse_name || mapping.warehouse_name || "";

      setMappingFormData({
        warehouse_id: mapping.warehouse_id || matchedWh?.id || matchedWh?._id || "",
        warehouse_name: resolvedWhName,
        warehouse_code: mapping.warehouse_code || "",
        cluster_id: mapping.cluster_id || "",
        cluster_name: mapping.cluster_name || "",
        states: mStates,
        franchise_cluster_ids: mFcIds,
        franchise_clusters: mapping.franchise_clusters || [],
        effective_from: mapping.effective_from || new Date().toISOString().split("T")[0],
        status: mapping.status || "Active",
      });
    } else {
      setEditingMapping(null);
      const defaultWh = availableWarehouses[0];
      setMappingFormData({
        warehouse_id: defaultWh?.id || defaultWh?._id || "",
        warehouse_name: defaultWh?.warehouse_name || "",
        warehouse_code: defaultWh?.warehouse_code || "",
        cluster_id: "",
        cluster_name: "",
        states: [],
        franchise_cluster_ids: [],
        franchise_clusters: [],
        effective_from: new Date().toISOString().split("T")[0],
        status: "Active",
      });
    }
    setModalStateSearch("");
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
    } else {
      setMappingFormData((prev) => ({
        ...prev,
        warehouse_id: "",
        warehouse_code: "",
        warehouse_name: "",
      }));
    }
  };

  const toggleState = (stateName) => {
    const isChecked = mappingFormData.states.includes(stateName);
    const targetStateObj = coverageStates.find((s) => s.name === stateName);
    const stateClusterIds = (targetStateObj?.clusters || []).map((c) => (c.id || c.cluster_id)?.toString());

    if (isChecked) {
      setMappingFormData((prev) => ({
        ...prev,
        states: prev.states.filter((s) => s !== stateName),
        franchise_cluster_ids: prev.franchise_cluster_ids.filter(
          (id) => !stateClusterIds.includes(id?.toString())
        ),
      }));
    } else {
      setMappingFormData((prev) => ({
        ...prev,
        states: [...prev.states, stateName],
        franchise_cluster_ids: Array.from(
          new Set([...prev.franchise_cluster_ids, ...stateClusterIds])
        ),
      }));
    }
  };

  const toggleCluster = (clusterId) => {
    const idStr = clusterId?.toString();
    const isChecked = mappingFormData.franchise_cluster_ids.some((id) => id?.toString() === idStr);

    if (isChecked) {
      setMappingFormData((prev) => ({
        ...prev,
        franchise_cluster_ids: prev.franchise_cluster_ids.filter((id) => id?.toString() !== idStr),
      }));
    } else {
      setMappingFormData((prev) => ({
        ...prev,
        franchise_cluster_ids: [...prev.franchise_cluster_ids, idStr],
      }));
    }
  };

  const selectAllClustersInState = (stateName) => {
    const targetStateObj = coverageStates.find((s) => s.name === stateName);
    const stateClusterIds = (targetStateObj?.clusters || []).map((c) => (c.id || c.cluster_id)?.toString());

    setMappingFormData((prev) => ({
      ...prev,
      franchise_cluster_ids: Array.from(
        new Set([...prev.franchise_cluster_ids, ...stateClusterIds])
      ),
    }));
  };

  const deselectAllClustersInState = (stateName) => {
    const targetStateObj = coverageStates.find((s) => s.name === stateName);
    const stateClusterIds = (targetStateObj?.clusters || []).map((c) => (c.id || c.cluster_id)?.toString());

    setMappingFormData((prev) => ({
      ...prev,
      franchise_cluster_ids: prev.franchise_cluster_ids.filter(
        (id) => !stateClusterIds.includes(id?.toString())
      ),
    }));
  };

  const deselectAllStates = () => {
    setMappingFormData((prev) => ({
      ...prev,
      states: [],
      franchise_cluster_ids: [],
    }));
  };

  const handleSaveMapping = async (e) => {
    e.preventDefault();
    if (!mappingFormData.warehouse_name || !mappingFormData.warehouse_name.trim()) {
      dispatch(setAlert({ type: "warning", message: "Warehouse name is required" }));
      return;
    }
    if (!mappingFormData.states || mappingFormData.states.length === 0) {
      dispatch(setAlert({ type: "warning", message: "Please assign at least one fulfillment state" }));
      return;
    }

    try {
      const headers = authHeaderObj();

      // Compile rich franchise_clusters from coverageStates matching selected IDs
      const compiledClusters = [];
      const selectedIdSet = new Set(mappingFormData.franchise_cluster_ids.map(id => id.toString()));

      (coverageStates || []).forEach((st) => {
        if (mappingFormData.states.includes(st.name)) {
          (st.clusters || []).forEach((cl) => {
            const clId = (cl.id || cl.cluster_id)?.toString();
            if (selectedIdSet.has(clId)) {
              compiledClusters.push({
                cluster_id: cl.id || cl.cluster_id,
                cluster_code: cl.cluster_code,
                cluster_name: cl.cluster_name,
                state_name: cl.state_name || st.name,
                district_names: cl.district_names || []
              });
            }
          });
        }
      });

      const payload = {
        warehouse_id: mappingFormData.warehouse_id,
        warehouse_code: mappingFormData.warehouse_code,
        warehouse_name: mappingFormData.warehouse_name,
        cluster_id: mappingFormData.cluster_id || null,
        cluster_name: mappingFormData.cluster_name || (mappingFormData.states.length > 1
          ? `${mappingFormData.states[0]} +${mappingFormData.states.length - 1} States`
          : mappingFormData.states[0]),
        states: mappingFormData.states,
        franchise_cluster_ids: mappingFormData.franchise_cluster_ids,
        franchise_clusters: compiledClusters,
        effective_from: mappingFormData.effective_from,
        status: mappingFormData.status,
      };

      if (editingMapping) {
        const res = await axios.put(
          `${ROUTING_API}/mappings/${editingMapping.id}`,
          payload,
          { headers }
        );
        if (res.data?.status === "success") {
          setMappings((prev) =>
            prev.map((m) => (m.id === editingMapping.id ? res.data.data : m))
          );
          dispatch(setAlert({ type: "success", message: "Warehouse mapping updated successfully!" }));
        }
      } else {
        const res = await axios.post(`${ROUTING_API}/mappings`, payload, { headers });
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
      m.states?.some((s) => s.toLowerCase().includes(searchQuery.toLowerCase())) ||
      m.franchise_clusters?.some((fc) =>
        fc.cluster_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        fc.cluster_code?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        fc.district_names?.some((d) => d.toLowerCase().includes(searchQuery.toLowerCase()))
      )
  );

  // States available for modal filtering: only states having active franchise clusters
  const activeClusterStates = (coverageStates || []).filter(
    (s) => s.cluster_count > 0 || (Array.isArray(s.clusters) && s.clusters.length > 0)
  );

  const filteredStatesForModal = activeClusterStates.filter((s) =>
    s.name?.toLowerCase().includes(modalStateSearch.toLowerCase())
  );

  // Count total clusters across selected states in modal
  const selectedStateObjects = (coverageStates || []).filter((s) =>
    mappingFormData.states.includes(s.name)
  );
  const totalClustersInSelectedStates = selectedStateObjects.reduce(
    (acc, st) => acc + (st.clusters?.length || 0),
    0
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
              className={`px-4 py-2 text-sm font-medium rounded-md transition-all flex items-center gap-2 ${activeTab === "clusters"
                  ? "bg-primary text-white shadow-sm"
                  : "text-text-secondary hover:text-text-primary"
                }`}
            >
              <FaLayerGroup /> Clusters ({clusters.length})
            </button>
            <button
              onClick={() => setActiveTab("mappings")}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-all flex items-center gap-2 ${activeTab === "mappings"
                  ? "bg-primary text-white shadow-sm"
                  : "text-text-secondary hover:text-text-primary"
                }`}
            >
              <FaWarehouse /> Warehouse Mapping ({mappings.length})
            </button>
            <button
              onClick={() => setActiveTab("capabilities")}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-all flex items-center gap-2 ${activeTab === "capabilities"
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
                                className={`px-2.5 py-1 rounded-full text-xs font-medium ${cluster.status === "Active"
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
                  <FaPlus /> Map Warehouse to States & Clusters
                </Button>
              </div>

              <div className="bg-surface rounded-xl border border-border overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-bg border-b border-border text-xs uppercase font-semibold text-text-secondary">
                        <th className="p-4">Warehouse</th>
                        <th className="p-4">Fulfillment States</th>
                        <th className="p-4">Active Franchise Clusters</th>
                        <th className="p-4">Effective Date</th>
                        <th className="p-4">Status</th>
                        <th className="p-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border text-sm">
                      {filteredMappings.length === 0 ? (
                        <tr>
                          <td colSpan="6" className="p-8 text-center text-text-secondary">
                            No warehouse mappings found matching your query.
                          </td>
                        </tr>
                      ) : (
                        filteredMappings.map((item) => (
                          <tr key={item.id} className="hover:bg-bg/50 transition-colors">
                            <td className="p-4">
                              <div className="font-semibold text-text-primary">{item.warehouse_name}</div>
                              <div className="text-xs text-text-secondary font-mono flex items-center gap-1.5 mt-0.5">
                                <span>{item.warehouse_code}</span>
                                {item.cluster_name && (
                                  <span className="text-[10px] px-1.5 py-0.2 rounded bg-bg border border-border text-text-secondary">
                                    {item.cluster_name}
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="p-4">
                              <div className="flex flex-wrap gap-1 max-w-xs">
                                {item.states?.map((st) => (
                                  <span
                                    key={st}
                                    className="px-2 py-0.5 rounded text-xs bg-bg border border-border text-text-primary font-medium"
                                  >
                                    {st}
                                  </span>
                                ))}
                              </div>
                            </td>
                            <td className="p-4">
                              {item.franchise_clusters && item.franchise_clusters.length > 0 ? (
                                <div className="space-y-1 max-w-xs">
                                  <div className="flex flex-wrap gap-1">
                                    {(expandedRowId === item.id
                                      ? item.franchise_clusters
                                      : item.franchise_clusters.slice(0, 3)
                                    ).map((fc) => (
                                      <span
                                        key={fc.cluster_id || fc._id || fc.cluster_code}
                                        className="px-2 py-0.5 rounded text-xs bg-primary/10 text-primary border border-primary/20 font-medium inline-flex items-center gap-1"
                                        title={`${fc.cluster_name} - Districts: ${(fc.district_names || []).join(', ')}`}
                                      >
                                        <span className="font-mono text-[10px] font-bold">{fc.cluster_code}:</span>
                                        <span>{fc.cluster_name}</span>
                                      </span>
                                    ))}
                                    {item.franchise_clusters.length > 3 && (
                                      <button
                                        type="button"
                                        onClick={() =>
                                          setExpandedRowId(expandedRowId === item.id ? null : item.id)
                                        }
                                        className="px-2 py-0.5 rounded text-xs bg-bg border border-border text-text-secondary hover:text-primary transition-colors cursor-pointer"
                                      >
                                        {expandedRowId === item.id
                                          ? "Show less"
                                          : `+${item.franchise_clusters.length - 3} more`}
                                      </button>
                                    )}
                                  </div>
                                </div>
                              ) : (
                                <span className="text-xs text-text-secondary italic">
                                  State-wide fulfillment ({item.states?.length || 0} states)
                                </span>
                              )}
                            </td>
                            <td className="p-4 text-text-secondary text-xs">{item.effective_from}</td>
                            <td className="p-4">
                              <span
                                className={`px-2.5 py-1 rounded-full text-xs font-medium ${item.status === "Active"
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
          title={editingMapping ? "Edit Warehouse Mapping" : "Map Warehouse to States & Franchise Clusters"}
          size="lg"
        >
          <form onSubmit={handleSaveMapping} className="space-y-4">
            {/* 1. Warehouse Selection */}
            <div className="bg-bg/60 p-4 rounded-xl border border-border space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-text-primary uppercase tracking-wide flex items-center gap-1.5">
                  <FaWarehouse className="text-primary" /> Select Company Warehouse *
                </label>
                {mappingFormData.warehouse_code && (
                  <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-primary/10 text-primary border border-primary/20 font-semibold">
                    {mappingFormData.warehouse_code}
                  </span>
                )}
              </div>

              {availableWarehouses.length > 0 ? (
                <>
                  <select
                    value={mappingFormData.warehouse_code}
                    onChange={(e) => handleWarehouseSelect(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-surface border border-border rounded-lg text-text-primary focus:outline-none focus:border-primary shadow-xs"
                    required
                  >
                    <option value="">-- Choose Existing Warehouse --</option>
                    {availableWarehouses.map((w) => (
                      <option key={w.warehouse_code} value={w.warehouse_code}>
                        {w.warehouse_name} [{w.warehouse_code}]
                      </option>
                    ))}
                  </select>

                  {/* Read-only Warehouse Name display */}
                  {mappingFormData.warehouse_name ? (
                    <div className="p-3 bg-surface rounded-lg border border-border flex items-center justify-between">
                      <div>
                        <span className="text-[10px] text-text-secondary uppercase font-semibold block tracking-wider">
                          Warehouse Name
                        </span>
                        <span className="text-sm font-bold text-text-primary">
                          {mappingFormData.warehouse_name}
                        </span>
                      </div>
                      <span className="text-xs font-mono font-semibold px-2 py-0.5 rounded bg-primary/10 text-primary border border-primary/20">
                        {mappingFormData.warehouse_code}
                      </span>
                    </div>
                  ) : null}
                </>
              ) : (
                <div className="text-xs text-text-secondary italic p-2 bg-surface rounded-lg border border-border">
                  No company warehouses found. Please create one in operations first.
                </div>
              )}
            </div>

            {/* 2. States Selection (Multi-State Assignment) */}
            <div className="bg-bg/60 p-4 rounded-xl border border-border space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <label className="text-xs font-bold text-text-primary uppercase tracking-wide flex items-center gap-1.5">
                    <FaMapMarkerAlt className="text-emerald-500" /> Fulfillment States Assigned *
                  </label>
                  <p className="text-[11px] text-text-secondary mt-0.5">
                    Select multiple states. Franchise clusters in these states will appear below for activation.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-primary/10 text-primary border border-primary/20">
                    {mappingFormData.states.length} states selected
                  </span>
                  {mappingFormData.states.length > 0 && (
                    <button
                      type="button"
                      onClick={deselectAllStates}
                      className="text-xs text-red-500 hover:underline"
                    >
                      Clear All
                    </button>
                  )}
                </div>
              </div>

              {/* State Search */}
              <div className="relative">
                <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary text-xs" />
                <input
                  type="text"
                  placeholder="Filter states by name (e.g. Gujarat, Maharashtra, Rajasthan)..."
                  value={modalStateSearch}
                  onChange={(e) => setModalStateSearch(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 text-xs bg-surface border border-border rounded-lg text-text-primary focus:outline-none focus:border-primary"
                />
              </div>

              {/* State Chips */}
              <div className="max-h-40 overflow-y-auto bg-surface p-3 rounded-lg border border-border flex flex-wrap gap-2 text-xs">
                {filteredStatesForModal.map((st) => {
                  const isChecked = mappingFormData.states.includes(st.name);
                  return (
                    <button
                      key={st.name}
                      type="button"
                      onClick={() => toggleState(st.name)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-all ${isChecked
                          ? "bg-primary text-white border-primary shadow-xs"
                          : "bg-bg border-border text-text-secondary hover:text-text-primary hover:border-primary/40"
                        }`}
                    >
                      {isChecked ? <FaCheck className="text-[10px]" /> : null}
                      <span>{st.name}</span>
                      {st.cluster_count > 0 && (
                        <span
                          className={`px-1.5 py-0.2 rounded-full text-[10px] ${isChecked
                              ? "bg-white/20 text-white"
                              : "bg-primary/10 text-primary border border-primary/20 font-semibold"
                            }`}
                        >
                          {st.cluster_count} {st.cluster_count === 1 ? "cluster" : "clusters"}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 3. Franchise Clusters Assignment (Grouped by Selected State) */}
            <div className="bg-bg/60 p-4 rounded-xl border border-border space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <label className="text-xs font-bold text-text-primary uppercase tracking-wide flex items-center gap-1.5">
                    <FaLayerGroup className="text-blue-500" /> Active Franchise Clusters Coverage
                  </label>
                  <p className="text-[11px] text-text-secondary mt-0.5">
                    Assign specific franchise clusters in each selected state to this warehouse.
                  </p>
                </div>
                <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-blue-500/10 text-blue-600 border border-blue-500/20">
                  {mappingFormData.franchise_cluster_ids.length} of {totalClustersInSelectedStates} clusters active
                </span>
              </div>

              {mappingFormData.states.length === 0 ? (
                <div className="p-6 text-center text-xs text-text-secondary border border-dashed border-border rounded-lg bg-surface">
                  <FaMapMarkerAlt className="mx-auto text-xl text-text-secondary/50 mb-1.5" />
                  Please select one or more fulfillment states above to configure active franchise clusters.
                </div>
              ) : (
                <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
                  {mappingFormData.states.map((stName) => {
                    const stObj = coverageStates.find((s) => s.name === stName);
                    const clustersInState = stObj?.clusters || [];
                    const selectedInState = clustersInState.filter((cl) =>
                      mappingFormData.franchise_cluster_ids.includes((cl.id || cl.cluster_id)?.toString())
                    );
                    const isAllSelected = clustersInState.length > 0 && selectedInState.length === clustersInState.length;

                    return (
                      <div key={stName} className="bg-surface rounded-xl border border-border overflow-hidden">
                        {/* State Header Bar */}
                        <div className="px-3.5 py-2.5 bg-bg/70 border-b border-border flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-xs text-text-primary">{stName}</span>
                            <span className="text-[11px] px-2 py-0.5 rounded-full bg-surface border border-border text-text-secondary font-medium">
                              {selectedInState.length} / {clustersInState.length} active
                            </span>
                          </div>
                          {clustersInState.length > 0 && (
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => selectAllClustersInState(stName)}
                                className={`text-[11px] font-medium hover:underline ${isAllSelected ? "text-text-secondary" : "text-primary"}`}
                              >
                                Select All
                              </button>
                              <span className="text-border">|</span>
                              <button
                                type="button"
                                onClick={() => deselectAllClustersInState(stName)}
                                className="text-[11px] font-medium text-text-secondary hover:text-red-500 hover:underline"
                              >
                                Deselect All
                              </button>
                            </div>
                          )}
                        </div>

                        {/* Clusters Grid */}
                        <div className="p-3">
                          {clustersInState.length === 0 ? (
                            <div className="p-3 bg-bg/50 rounded-lg border border-dashed border-border text-xs text-text-secondary">
                              <span className="font-medium text-text-primary">Full State Coverage:</span> No specific franchise clusters configured in {stName}. Orders from any district in {stName} will be fulfilled by this warehouse.
                            </div>
                          ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                              {clustersInState.map((cl) => {
                                const clId = (cl.id || cl.cluster_id)?.toString();
                                const isChecked = mappingFormData.franchise_cluster_ids.includes(clId);
                                return (
                                  <div
                                    key={clId}
                                    onClick={() => toggleCluster(clId)}
                                    className={`p-2.5 rounded-lg border text-xs cursor-pointer transition-all flex items-start gap-2.5 ${isChecked
                                        ? "bg-primary/5 border-primary shadow-xs"
                                        : "bg-bg/40 border-border hover:border-border-hover text-text-secondary"
                                      }`}
                                  >
                                    <input
                                      type="checkbox"
                                      checked={isChecked}
                                      onChange={() => { }}
                                      className="mt-0.5 rounded border-border text-primary focus:ring-primary pointer-events-none"
                                    />
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-center gap-1.5 flex-wrap">
                                        <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 bg-surface rounded border border-border text-text-primary">
                                          {cl.cluster_code}
                                        </span>
                                        <span className={`font-semibold truncate ${isChecked ? "text-primary" : "text-text-primary"}`}>
                                          {cl.cluster_name}
                                        </span>
                                      </div>
                                      {cl.district_names && cl.district_names.length > 0 && (
                                        <div
                                          className="text-[11px] text-text-secondary mt-1 truncate"
                                          title={cl.district_names.join(", ")}
                                        >
                                          {cl.district_names.length} Districts: {cl.district_names.join(", ")}
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* 4. Effective Date & Status */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
              <div>
                <label className="block text-xs font-semibold text-text-secondary mb-1.5">
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
                <label className="block text-xs font-semibold text-text-secondary mb-1.5">
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
