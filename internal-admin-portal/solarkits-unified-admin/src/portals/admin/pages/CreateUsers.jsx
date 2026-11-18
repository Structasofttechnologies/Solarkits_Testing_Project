import { useState, useEffect, useMemo, useCallback } from "react";
import axios from "axios";
import { authHeaderObj } from "@/app/authHeader";
import { useDispatch, useSelector } from "react-redux";
import { setAlert } from "@/features/alert.slice";
import ReactCountryFlag from "react-country-flag";

// Icons
import {
    HiUsers,
    HiUserAdd,
    HiSearch,
    HiIdentification,
    HiGlobeAlt,
    HiMail,
    HiPhone,
    HiLocationMarker,
    HiCheckCircle,
    HiShieldCheck,
    HiChevronRight,
    HiPencil,
    HiLockOpen,
    HiLockClosed,
    HiBan,
    HiArrowUp,
    HiExclamation,
} from "react-icons/hi";
import { FaSync, FaWarehouse, FaMapMarkerAlt, FaCheck, FaExclamationTriangle } from "react-icons/fa";
import { MdManageAccounts } from "react-icons/md";
import { FiUser, FiGrid } from "react-icons/fi";

// Components
import CustomInput from "@/components/CustomInput";
import Dropdown from "@/components/Dropdown";
import DropdownWithSearchInput from "@/components/DropdownWithSearchInput";
import MultiSelectDropdownWithSearchInput from "@/components/MultiSelectDropdownWithSearchInput";
import Button from "@/components/Button";
import ConfirmationPopup from "@/components/ConfirmationPopup";
import ToggleButton from "@/components/ToggleButton";
import { useLoadScript } from "@react-google-maps/api";
import UniversalMap from "@/components/UniversalMap";

const INDIAN_STATES = [
    "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh", "Delhi NCR",
    "Goa", "Gujarat", "Haryana", "Himachal Pradesh", "Jammu and Kashmir", "Jharkhand",
    "Karnataka", "Kerala", "Madhya Pradesh", "Maharashtra", "Manipur", "Meghalaya",
    "Mizoram", "Nagaland", "Odisha", "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu",
    "Telangana", "Tripura", "Uttar Pradesh", "Uttarakhand", "West Bengal"
];

export default function CreateUsers() {
    const dispatch = useDispatch();
    const currentUserId = useSelector(state => state.user_slice.user?.id || state.user_slice.user?._id);
    const [activeTab, setActiveTab] = useState("overview");

    // --- SHARED DATA ---
    const [levels, setLevels] = useState([]);
    const [activeCountries, setActiveCountries] = useState([]);
    const [departments, setDepartments] = useState([]);

    // --- LIVE WAREHOUSES & FRANCHISE CLUSTERS ---
    const [liveWarehouses, setLiveWarehouses] = useState([]);
    const [liveClusters, setLiveClusters] = useState([]);
    const [loadingClusters, setLoadingClusters] = useState(false);

    // --- PROVISIONING MODE: NEW USER VS ASSIGN EXISTING USER ---
    const [provisioningMode, setProvisioningMode] = useState("new"); // "new" | "existing"
    const [selectedExistingUserId, setSelectedExistingUserId] = useState("");
    const [assignedWarehouseId, setAssignedWarehouseId] = useState("");
    const [assignedStateName, setAssignedStateName] = useState("");
    const [assignedClusterId, setAssignedClusterId] = useState("");

    // --- OVERVIEW STATES ---
    const [users, setUsers] = useState([]);
    const [loadingUsers, setLoadingUsers] = useState(false);
    const [overviewSearch, setOverviewSearch] = useState("");
    const [overviewFilters, setOverviewFilters] = useState({
        status: "",
        country: "",
        saasProduct: "",
        panel: "",
        warehouse: "",
        state: "",
        cluster: "",
        department: ""
    });
    const [saasProducts, setSaasProducts] = useState([]);

    // --- PROVISIONING STATES ---
    const [provisioningLevel, setProvisioningLevel] = useState("");
    const [provisioningAdding, setProvisioningAdding] = useState(false);
    const [provisioningScope, setProvisioningScope] = useState({
        country: "", state: "", cluster: "", district: "", urban_city: "", rural_city: ""
    });
    const [provisioningFormData, setProvisioningFormData] = useState({
        name: "", email: "", country_id: "", phone_code: "", phone: "",
        department_id: "", role_id: "", scope_ids: [], parent_user_id: "",
        min_phone_length: null, max_phone_length: null
    });
    const [editId, setEditId] = useState(null);
    // Snapshot of the user's original scope_ids at the moment Edit is clicked.
    // Stored separately so the cascading scope-sync effect cannot overwrite it before
    // hydrateHierarchy has had a chance to read it.
    const [editScopeIds, setEditScopeIds] = useState([]);
    const [provisioningCountries, setProvisioningCountries] = useState([]);
    const [provisioningRoles, setProvisioningRoles] = useState([]);
    const [provisioningParentUsers, setProvisioningParentUsers] = useState([]);
    const [confirmingStatus, setConfirmingStatus] = useState(null); // { id, currentStatus }
    const [isUniversalCountryRole, setIsUniversalCountryRole] = useState(true);
    const [allPanels, setAllPanels] = useState([]);
    const [selectedPanels, setSelectedPanels] = useState([]);

    // --- CASCADING SCOPE SELECTIONS ---
    const [selectedCountries, setSelectedCountries] = useState([]);
    const [selectedStates, setSelectedStates] = useState([]);
    const [selectedClusters, setSelectedClusters] = useState([]);
    const [selectedDistricts, setSelectedDistricts] = useState([]);

    // --- COVERAGE REPORT STATES ---
    const [coverageData, setCoverageData] = useState([]);
    const [loadingCoverage, setLoadingCoverage] = useState(false);
    const [selectedCoverageNode, setSelectedCoverageNode] = useState(null);
    const [mapCenter, setMapCenter] = useState({ lat: 20.5937, lng: 78.9629 });
    const [mapBoundaries, setMapBoundaries] = useState([]);

    // --- GOOGLE MAP LOAD HOOK ---
    const { isLoaded, loadError } = useLoadScript({
        googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY,
    });

    // --- SCOPE DATA ---
    const [geoData, setGeoData] = useState({
        overview: { states: [], clusters: [], districts: [], urbanCities: [], ruralCities: [] },
        provisioning: { states: [], clusters: [], districts: [], urbanCities: [], ruralCities: [] }
    });

    // --- API CALLS ---

    const fetchGeoData = useCallback(async (type, level, parentId, targetKey) => {
        if (!parentId) return;
        try {
            const res = await axios.get(`${import.meta.env.VITE_API_URL}/cms/users/${level}/${parentId}`, { headers: authHeaderObj() });
            setGeoData(prev => ({
                ...prev,
                [type]: { ...prev[type], [targetKey]: res.data?.data || [] }
            }));
        } catch (err) {
            console.error(`Error fetching ${targetKey}:`, err);
        }
    }, []);

    const provisioningLevelName = useMemo(() => {
        return levels.find(l => (l.id || l._id)?.toString() === provisioningLevel?.toString())?.name?.toLowerCase() || "";
    }, [levels, provisioningLevel]);

    const getSharedData = useCallback(async () => {
        try {
            const [levelsRes, countriesRes, deptsRes, allCountriesRes, panelsRes, saasRes] = await Promise.all([
                axios.get(`${import.meta.env.VITE_API_URL}/cms/users/levels`, { headers: authHeaderObj() }),
                axios.get(`${import.meta.env.VITE_API_URL}/cms/users/countries`, { headers: authHeaderObj() }),
                axios.get(`${import.meta.env.VITE_API_URL}/cms/users/departments`, { headers: authHeaderObj() }),
                axios.get(`${import.meta.env.VITE_AUTH_API_URL}/countries`, { headers: authHeaderObj() }),
                axios.get(`${import.meta.env.VITE_API_URL}/cms/users/panels`, { headers: authHeaderObj() }),
                axios.get(`${import.meta.env.VITE_API_URL}/cms/users/saas-products`, { headers: authHeaderObj() })
            ]);
            setLevels(levelsRes.data?.data || []);
            setActiveCountries(countriesRes.data?.data || []);
            setDepartments(deptsRes.data?.data || []);
            setProvisioningCountries(allCountriesRes.data?.data || allCountriesRes.data || []);
            setAllPanels(panelsRes.data?.data || []);
            setSaasProducts(saasRes.data?.data || []);

            if (levelsRes.data?.data?.length > 0) {
                setProvisioningLevel(levelsRes.data.data[0].id);
            }
        } catch (err) {
            console.error("Error fetching shared data:", err);
            dispatch(setAlert({ type: "error", message: "Failed to initialize management data" }));
        }
    }, [dispatch]);

    const fetchAllSubordinates = useCallback(async () => {
        setLoadingUsers(true);
        try {
            const res = await axios.get(`${import.meta.env.VITE_API_URL}/cms/users/subordinates`, { headers: authHeaderObj() });
            setUsers(res.data?.data || []);
        } catch (err) {
            console.error("Error fetching subordinates:", err);
            setUsers([]);
        } finally {
            setLoadingUsers(false);
        }
    }, []);

    const fetchWarehouseClusterData = useCallback(async () => {
        setLoadingClusters(true);
        try {
            const [whRes, cluRes] = await Promise.all([
                axios.get(`${import.meta.env.VITE_API_URL}/solarshop/cluster-routing/available-warehouses`, { headers: authHeaderObj() }),
                axios.get(`${import.meta.env.VITE_API_URL}/franchise-clusters/list`, { headers: authHeaderObj() })
            ]);
            setLiveWarehouses(whRes.data?.data || whRes.data?.warehouses || whRes.data || []);
            setLiveClusters(cluRes.data?.data || cluRes.data || []);
        } catch (err) {
            console.error("Error fetching warehouses and clusters:", err);
        } finally {
            setLoadingClusters(false);
        }
    }, []);

    const getRoles = useCallback(async (levelId, deptId, type) => {
        if (!levelId) return;
        try {
            const url = deptId
                ? `${import.meta.env.VITE_API_URL}/cms/users/roles/${deptId}/${levelId}`
                : `${import.meta.env.VITE_API_URL}/cms/users/roles/${levelId}`;
            const res = await axios.get(url, { headers: authHeaderObj() });
            if (type === "overview") return; // roles filter removed from overview
            else setProvisioningRoles(res.data?.data || []);
        } catch (err) {
            console.error("Error fetching roles:", err);
        }
    }, []);

    const getParentUsers = useCallback(async () => {
        if (!provisioningFormData.role_id) {
            setProvisioningParentUsers([]);
            return;
        }

        const levelName = levels.find(l => (l.id || l._id)?.toString() === provisioningLevel?.toString())?.name?.toLowerCase();
        // For non-global levels, we MUST have scope_ids to find an aligned parent
        if (levelName !== "global" && provisioningFormData.scope_ids.length === 0) {
            setProvisioningParentUsers([]);
            return;
        }

        try {
            const res = await axios.post(`${import.meta.env.VITE_API_URL}/cms/users/parent-users`,
                { role_id: provisioningFormData.role_id, scope_ids: provisioningFormData.scope_ids },
                { headers: authHeaderObj() }
            );
            setProvisioningParentUsers(res.data?.data || []);
        } catch (err) {
            console.error("Error fetching parent users:", err);
            setProvisioningParentUsers([]);
        }
    }, [provisioningFormData.role_id, provisioningFormData.scope_ids, provisioningLevel, levels]);

    // Hierarchy Hydration for Edit Mode
    useEffect(() => {
        if (!editId || editScopeIds.length === 0 || !provisioningLevel || levels.length === 0) return;

        const hydrateHierarchy = async () => {
            // Resolve level name once — used in both the success path and the fallback
            const levelName = levels.find(l => (l.id || l._id)?.toString() === provisioningLevel?.toString())?.name?.toLowerCase();
            const scopeId = editScopeIds[0];

            // Country-level: scope_ids ARE the country IDs — no API call needed
            if (levelName === "country") {
                setSelectedCountries(editScopeIds);
                setSelectedStates([]);
                setSelectedClusters([]);
                setSelectedDistricts([]);
                return;
            }

            try {
                const reqs = editScopeIds.map(sid =>
                    axios.get(`${import.meta.env.VITE_API_URL}/cms/users/scope-hierarchy/${provisioningLevel}/${sid}`, { headers: authHeaderObj() })
                );
                const results = await Promise.all(reqs);

                const countries = new Set();
                const states = new Set();
                const clusters = new Set();

                let hasDistrict = false;
                let hasCluster = false;
                let hasState = false;

                results.forEach(res => {
                    if (res.data.success) {
                        const h = res.data.data;
                        if (h.country) countries.add(h.country);
                        if (h.state) states.add(h.state);
                        if (h.cluster) clusters.add(h.cluster);

                        if (h.district) hasDistrict = true;
                        else if (h.cluster) hasCluster = true;
                        else if (h.state) hasState = true;
                    }
                });

                setSelectedCountries([...countries]);

                if (hasDistrict) {
                    setSelectedStates([...states]);
                    setSelectedClusters([...clusters]);
                    setSelectedDistricts(editScopeIds);
                } else if (hasCluster) {
                    setSelectedStates([...states]);
                    setSelectedClusters(editScopeIds);
                    setSelectedDistricts([]);
                } else if (hasState) {
                    setSelectedStates(editScopeIds);
                    setSelectedClusters([]);
                    setSelectedDistricts([]);
                } else {
                    setSelectedStates([]);
                    setSelectedClusters([]);
                    setSelectedDistricts([]);
                }
            } catch (err) {
                console.error("Hierarchy hydration failed:", err);
                // Fallback: populate the deepest scope level directly from known scope_ids
                // so the form at least shows the correct selected value even if parent
                // hierarchy cannot be resolved from the API.
                if (levelName === "state") {
                    setSelectedStates(editScopeIds);
                } else if (levelName === "cluster") {
                    setSelectedClusters(editScopeIds);
                } else if (levelName === "district") {
                    setSelectedDistricts(editScopeIds);
                }
            }
        };
        hydrateHierarchy();
    // Re-run whenever: editId is set, level changes, editScopeIds become populated, or levels load
    }, [editId, provisioningLevel, editScopeIds.length, levels.length]);

    // --- EFFECTS ---

    useEffect(() => { getSharedData(); }, [getSharedData]);

    useEffect(() => {
        fetchAllSubordinates();
        fetchWarehouseClusterData();
    }, [fetchAllSubordinates, fetchWarehouseClusterData]);

    // Provisioning Chain
    useEffect(() => {
        if (provisioningLevel && provisioningFormData.department_id) {
            getRoles(provisioningLevel, provisioningFormData.department_id, "provisioning");
        }
    }, [provisioningLevel, provisioningFormData.department_id, getRoles]);

    useEffect(() => { getParentUsers(); }, [getParentUsers]);

    // Sync scope arrays to provisioningScope for backward-compatibility
    useEffect(() => {
        setProvisioningScope(prev => ({
            ...prev,
            country: selectedCountries[0] || "",
            state: selectedStates[0] || "",
            cluster: selectedClusters[0] || "",
            district: selectedDistricts[0] || ""
        }));
    }, [selectedCountries, selectedStates, selectedClusters, selectedDistricts]);

    // Sync selectedCountries[0] to country_id
    useEffect(() => {
        const firstCountryId = selectedCountries[0] || "";
        setProvisioningFormData(prev => ({
            ...prev,
            country_id: firstCountryId
        }));
    }, [selectedCountries]);

    // Sync the final scope_ids array with the most granular level populated
    useEffect(() => {
        let finalScopes = [];
        if (selectedDistricts.length > 0) {
            finalScopes = selectedDistricts;
        } else if (selectedClusters.length > 0) {
            finalScopes = selectedClusters;
        } else if (selectedStates.length > 0) {
            finalScopes = selectedStates;
        } else if (selectedCountries.length > 0) {
            finalScopes = selectedCountries;
        }
        setProvisioningFormData(prev => ({
            ...prev,
            scope_ids: finalScopes
        }));
    }, [selectedCountries, selectedStates, selectedClusters, selectedDistricts]);

    // Fetch states when selectedCountries change (concurrently if multiple)
    useEffect(() => {
        if (selectedCountries.length === 0) {
            setGeoData(prev => ({
                ...prev,
                provisioning: { ...prev.provisioning, states: [], clusters: [], districts: [] }
            }));
            setSelectedStates([]);
            setSelectedClusters([]);
            setSelectedDistricts([]);
            return;
        }

        const loadStates = async () => {
            try {
                const reqs = selectedCountries.map(cid =>
                    axios.get(`${import.meta.env.VITE_API_URL}/cms/users/states/${cid}`, { headers: authHeaderObj() })
                );
                const results = await Promise.all(reqs);
                const allStates = results.flatMap(res => res.data?.data || []);
                // Remove duplicates
                const uniqueStates = [];
                const seen = new Set();
                allStates.forEach(s => {
                    if (!seen.has(s.id)) {
                        seen.add(s.id);
                        uniqueStates.push(s);
                    }
                });
                setGeoData(prev => ({
                    ...prev,
                    provisioning: { ...prev.provisioning, states: uniqueStates }
                }));

                const validIds = new Set(uniqueStates.map(s => s.id));
                setSelectedStates(prev => prev.filter(id => validIds.has(id)));
            } catch (err) {
                console.error("Error fetching states:", err);
            }
        };
        loadStates();
    }, [selectedCountries]);

    // Auto-select first active country if level is not global and no country is selected (only when not editing)
    useEffect(() => {
        if (editId) return;
        const levelName = levels.find(l => (l.id || l._id)?.toString() === provisioningLevel?.toString())?.name?.toLowerCase();
        if (levelName && levelName !== "global" && selectedCountries.length === 0 && activeCountries.length > 0) {
            const defaultCountryId = (activeCountries[0].id || activeCountries[0]._id)?.toString();
            if (defaultCountryId) {
                setSelectedCountries([defaultCountryId]);
            }
        }
    }, [provisioningLevel, activeCountries, levels, selectedCountries, editId]);

    // Fetch clusters when selectedStates change (concurrently if multiple)
    useEffect(() => {
        if (selectedStates.length === 0) {
            setGeoData(prev => ({
                ...prev,
                provisioning: { ...prev.provisioning, clusters: [], districts: [] }
            }));
            setSelectedClusters([]);
            setSelectedDistricts([]);
            return;
        }

        const loadClusters = async () => {
            try {
                const reqs = selectedStates.map(sid =>
                    axios.get(`${import.meta.env.VITE_API_URL}/cms/users/clusters/${sid}`, { headers: authHeaderObj() })
                );
                const results = await Promise.all(reqs);
                const allClusters = results.flatMap(res => res.data?.data || []);
                const uniqueClusters = [];
                const seen = new Set();
                allClusters.forEach(c => {
                    if (!seen.has(c.id)) {
                        seen.add(c.id);
                        uniqueClusters.push(c);
                    }
                });
                setGeoData(prev => ({
                    ...prev,
                    provisioning: { ...prev.provisioning, clusters: uniqueClusters }
                }));

                const validIds = new Set(uniqueClusters.map(c => c.id));
                setSelectedClusters(prev => prev.filter(id => validIds.has(id)));
            } catch (err) {
                console.error("Error fetching clusters:", err);
            }
        };
        loadClusters();
    }, [selectedStates]);

    // Fetch districts when selectedClusters change (concurrently if multiple)
    useEffect(() => {
        if (selectedClusters.length === 0) {
            setGeoData(prev => ({
                ...prev,
                provisioning: { ...prev.provisioning, districts: [] }
            }));
            setSelectedDistricts([]);
            return;
        }

        const loadDistricts = async () => {
            try {
                const reqs = selectedClusters.map(cid =>
                    axios.get(`${import.meta.env.VITE_API_URL}/cms/users/districts/${cid}`, { headers: authHeaderObj() })
                );
                const results = await Promise.all(reqs);
                const allDistricts = results.flatMap(res => res.data?.data || []);
                const uniqueDistricts = [];
                const seen = new Set();
                allDistricts.forEach(d => {
                    if (!seen.has(d.id)) {
                        seen.add(d.id);
                        uniqueDistricts.push(d);
                    }
                });
                setGeoData(prev => ({
                    ...prev,
                    provisioning: { ...prev.provisioning, districts: uniqueDistricts }
                }));

                const validIds = new Set(uniqueDistricts.map(d => d.id));
                setSelectedDistricts(prev => prev.filter(id => validIds.has(id)));
            } catch (err) {
                console.error("Error fetching districts:", err);
            }
        };
        loadDistricts();
    }, [selectedClusters]);

    // Coverage report fetching logic
    const fetchCoverageReport = useCallback(async () => {
        setLoadingCoverage(true);
        try {
            const res = await axios.get(`${import.meta.env.VITE_API_URL}/cms/users/coverage-report`, { headers: authHeaderObj() });
            setCoverageData(res.data?.data || []);
        } catch (err) {
            console.error("Error fetching coverage report:", err);
            setCoverageData([]);
        } finally {
            setLoadingCoverage(false);
        }
    }, []);

    useEffect(() => {
        if (activeTab === "coverage") {
            fetchCoverageReport();
        }
    }, [activeTab, fetchCoverageReport]);

    const findParentNames = (tree, nodeId) => {
        for (const country of tree) {
            if (country.id === nodeId) return { country: country.name };
            if (country.children) {
                for (const state of country.children) {
                    if (state.id === nodeId) return { country: country.name, state: state.name };
                    if (state.children) {
                        for (const cluster of state.children) {
                            if (cluster.id === nodeId) return { country: country.name, state: state.name, cluster: cluster.name };
                            if (cluster.children) {
                                for (const district of cluster.children) {
                                    if (district.id === nodeId) {
                                        return { country: country.name, state: state.name, cluster: cluster.name, district: district.name };
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
        return {};
    };

    const handleSelectCoverageNode = async (node) => {
        setSelectedCoverageNode(node);
        setMapBoundaries([]);

        const names = findParentNames(coverageData, node.id);

        try {
            let url = "";
            let payload = {};
            let level = node.type;

            if (node.type === "country") {
                url = `${import.meta.env.VITE_API_URL}/geolocation/country?unique_id=ADM_LOC&req_for=view`;
                payload = { country: node.name };
            } else if (node.type === "state") {
                url = `${import.meta.env.VITE_API_URL}/geolocation/state?unique_id=ADM_LOC&req_for=view`;
                payload = { state: node.name, country: names.country };
            } else if (node.type === "cluster") {
                url = `${import.meta.env.VITE_API_URL}/geolocation/state?unique_id=ADM_LOC&req_for=view`;
                payload = { state: names.state, country: names.country };
                level = "state";
            } else if (node.type === "district") {
                url = `${import.meta.env.VITE_API_URL}/geolocation/district?unique_id=ADM_LOC&req_for=view`;
                payload = { district: node.name, state: names.state, country: names.country };
            }

            const res = await axios.post(url, payload, { headers: authHeaderObj() });
            const geo = res.data.country || res.data.state || res.data.district;

            if (geo && geo.geometry) {
                setMapBoundaries([
                    {
                        id: node.id,
                        level: level,
                        geometry: geo.geometry,
                        lat: geo.lat,
                        lng: geo.lng
                    }
                ]);
                if (geo.lat && geo.lng) {
                    setMapCenter({ lat: parseFloat(geo.lat), lng: parseFloat(geo.lng) });
                }
            }
        } catch (err) {
            console.error("Failed to fetch boundary geometry:", err);
        }
    };

    // --- HANDLERS ---

    const handleProvisionIdentity = async () => {
        setProvisioningAdding(true);
        try {
            // Case 1: Existing User Assignment to Cluster
            if (provisioningMode === "existing" && !editId) {
                if (!selectedExistingUserId) {
                    dispatch(setAlert({ type: "error", message: "Please select an existing staff member." }));
                    setProvisioningAdding(false);
                    return;
                }
                if (!assignedClusterId) {
                    dispatch(setAlert({ type: "error", message: "Please select a Franchisee Cluster to assign." }));
                    setProvisioningAdding(false);
                    return;
                }

                const whObj = liveWarehouses.find(w => String(w._id || w.id) === String(assignedWarehouseId));
                const cluObj = liveClusters.find(c => String(c._id || c.id) === String(assignedClusterId));
                const deptObj = departments.find(d => String(d.id || d._id) === String(provisioningFormData.department_id));

                const updatePayload = {
                    warehouse_id: assignedWarehouseId || undefined,
                    warehouse_name: whObj ? (whObj.name || whObj.warehouse_name) : undefined,
                    cluster_id: assignedClusterId,
                    cluster_name: cluObj ? (cluObj.cluster_name || cluObj.name) : undefined,
                    state_name: assignedStateName || (cluObj ? cluObj.state_name : undefined),
                    department_id: provisioningFormData.department_id || undefined,
                    department_name: deptObj ? deptObj.name : undefined,
                    role_id: provisioningFormData.role_id || undefined,
                };

                await axios.put(`${import.meta.env.VITE_API_URL}/cms/users/${selectedExistingUserId}`, updatePayload, { headers: authHeaderObj() });

                // Link to cluster
                await axios.post(`${import.meta.env.VITE_API_URL}/franchise-clusters/${assignedClusterId}/assign-staff`, {
                    user_id: selectedExistingUserId
                }, { headers: authHeaderObj() });

                dispatch(setAlert({ type: "success", message: "Staff member assigned to cluster successfully!" }));
                setSelectedExistingUserId("");
                setAssignedWarehouseId("");
                setAssignedStateName("");
                setAssignedClusterId("");
                setActiveTab("overview");
                fetchAllSubordinates();
                fetchWarehouseClusterData();
                setProvisioningAdding(false);
                return;
            }

            // Case 2: New User or Edit User
            // Mapping validations
            // 1. If countries selected and states are populated:
            //    Ensure each selected country has at least one state in selectedStates
            if (selectedCountries.length > 0 && selectedStates.length > 0) {
                for (const cid of selectedCountries) {
                    const hasState = selectedStates.some(sid => {
                        const stateObj = geoData.provisioning.states.find(s => s.id === sid);
                        return stateObj && stateObj.country_id === cid;
                    });
                    if (!hasState) {
                        const countryName = activeCountries.find(c => c.id === cid)?.name || cid;
                        dispatch(setAlert({ type: "error", message: `Please select at least one state for country: ${countryName}` }));
                        setProvisioningAdding(false);
                        return;
                    }
                }
            }

            // 2. If states selected and clusters are populated:
            //    Ensure each selected state has at least one cluster in selectedClusters
            if (selectedStates.length > 0 && selectedClusters.length > 0) {
                for (const sid of selectedStates) {
                    const hasCluster = selectedClusters.some(clid => {
                        const clusterObj = geoData.provisioning.clusters.find(c => c.id === clid);
                        return clusterObj && clusterObj.state_id === sid;
                    });
                    if (!hasCluster) {
                        const stateName = geoData.provisioning.states.find(s => s.id === sid)?.name || sid;
                        dispatch(setAlert({ type: "error", message: `Please select at least one cluster for state: ${stateName}` }));
                        setProvisioningAdding(false);
                        return;
                    }
                }
            }

            // 3. If clusters selected and districts are populated:
            //    Ensure each selected cluster has at least one district in selectedDistricts
            if (selectedClusters.length > 0 && selectedDistricts.length > 0) {
                for (const clid of selectedClusters) {
                    const hasDistrict = selectedDistricts.some(did => {
                        const distObj = geoData.provisioning.districts.find(d => d.id === did);
                        return distObj && distObj.cluster_id === clid;
                    });
                    if (!hasDistrict) {
                        const clusterName = geoData.provisioning.clusters.find(c => c.id === clid)?.name || clid;
                        dispatch(setAlert({ type: "error", message: `Please select at least one district for cluster: ${clusterName}` }));
                        setProvisioningAdding(false);
                        return;
                    }
                }
            }

            const whObj = liveWarehouses.find(w => String(w._id || w.id) === String(assignedWarehouseId));
            const cluObj = liveClusters.find(c => String(c._id || c.id) === String(assignedClusterId));
            const deptObj = departments.find(d => String(d.id || d._id) === String(provisioningFormData.department_id));

            const url = editId
                ? `${import.meta.env.VITE_API_URL}/cms/users/${editId}`
                : `${import.meta.env.VITE_API_URL}/cms/users`;
            const method = editId ? 'put' : 'post';

            const userPayload = {
                ...provisioningFormData,
                level_id: provisioningLevel,
                panels: selectedPanels,
                warehouse_id: assignedWarehouseId || undefined,
                warehouse_name: whObj ? (whObj.name || whObj.warehouse_name) : undefined,
                cluster_id: assignedClusterId || undefined,
                cluster_name: cluObj ? (cluObj.cluster_name || cluObj.name) : undefined,
                state_name: assignedStateName || (cluObj ? cluObj.state_name : undefined),
                department_name: deptObj ? deptObj.name : undefined
            };

            const response = await axios[method](url, userPayload, { headers: authHeaderObj() });
            const createdUserId = response.data?.data?._id || response.data?.data?.id || response.data?._id || editId;

            if (assignedClusterId && createdUserId) {
                try {
                    await axios.post(`${import.meta.env.VITE_API_URL}/franchise-clusters/${assignedClusterId}/assign-staff`, {
                        user_id: createdUserId
                    }, { headers: authHeaderObj() });
                } catch (assignErr) {
                    console.warn("Could not automatically link user to cluster:", assignErr);
                }
            }

            dispatch(setAlert({ type: "success", message: editId ? "Identity updated successfully" : "Identity provisioned successfully" }));
            setProvisioningFormData({
                name: "", email: "", country_id: "", phone_code: "", phone: "",
                department_id: "", role_id: "", scope_ids: [], parent_user_id: "",
                min_phone_length: null, max_phone_length: null
            });
            setAssignedWarehouseId("");
            setAssignedStateName("");
            setAssignedClusterId("");
            setSelectedCountries([]);
            setSelectedStates([]);
            setSelectedClusters([]);
            setSelectedDistricts([]);
            setSelectedPanels([]);
            setEditId(null);
            setActiveTab("overview");
            fetchAllSubordinates();
            fetchWarehouseClusterData();
        } catch (err) {
            console.error("User Provisioning Error:", err);
            const msg = err.response?.data?.message || err.response?.data?.error || err.message || "Operation failed";
            dispatch(setAlert({ type: "error", message: msg }));
        } finally {
            setProvisioningAdding(false);
        }
    };

    const handleEdit = useCallback((user) => {
        if (user.id === currentUserId) return;

        setSelectedCountries([]);
        setSelectedStates([]);
        setSelectedClusters([]);
        setSelectedDistricts([]);

        // Snapshot the scope_ids immediately — before any cascading effects run.
        // hydrateHierarchy reads from this, not from provisioningFormData.scope_ids
        // (which the scope-sync effect would otherwise overwrite to [] before hydration runs).
        const rawScopeIds = user.scope_ids ? user.scope_ids.map(id => id.toString()) : [];
        setEditScopeIds(rawScopeIds);

        // Normalize all IDs to strings to ensure matching with dropdown options
        const targetLevelId = user.level_id ? user.level_id.toString() : "";
        const targetDeptId = user.department_id ? user.department_id.toString() : "";
        const targetRoleId = user.role_id ? user.role_id.toString() : "";
        const targetCountryId = user.country_id ? user.country_id.toString() : "";

        setEditId(user.id);
        setProvisioningLevel(targetLevelId);

        // Fetch user panel details
        axios.get(`${import.meta.env.VITE_API_URL}/cms/users/${user.id}/panels`, { headers: authHeaderObj() })
            .then(res => {
                setSelectedPanels(res.data?.data || []);
            })
            .catch(err => {
                console.error("Error fetching user panels:", err);
                setSelectedPanels([]);
            });

        // If it's a country level user, we need to correctly initialize the Universal Toggle based on whether their role is restricted
        if (user.role_id && user.level_name && user.level_name.toLowerCase() === "country") {
            // In edit mode, we must wait for roles to load or infer it. We can just set it based on if scope_ids length is > 1.
            // Actually, a better inference: if they only have 1 scope_id, and the backend role is country_id restricted. 
            // We'll set it properly when roles load, but for now default to true unless inferred
            if (user.scope_ids && user.scope_ids.length === 1) {
                setIsUniversalCountryRole(false);
            } else {
                setIsUniversalCountryRole(true);
            }
        }

        // Pre-set country in scope immediately to prevent "Select..." flicker
        setProvisioningScope({
            country: targetCountryId || (user.scope_ids && user.scope_ids.length > 0 ? user.scope_ids[0].toString() : ""),
            state: "",
            cluster: "",
            district: "",
            urban_city: "",
            rural_city: ""
        });

        // Find country by ID first, then fallback to phone_code for legacy data
        let countryObj = provisioningCountries.find(c => (c.id || c._id)?.toString() === targetCountryId);
        if (!countryObj && user.phone_code) {
            countryObj = provisioningCountries.find(c => c.phone_code === user.phone_code);
        }

        setProvisioningFormData({
            name: user.name,
            email: user.email,
            country_id: countryObj ? (countryObj.id || countryObj._id).toString() : targetCountryId,
            phone_code: user.phone_code,
            phone: user.phone,
            department_id: targetDeptId,
            role_id: targetRoleId,
            scope_ids: rawScopeIds,
            parent_user_id: user.parent_user_id ? user.parent_user_id.toString() : "",
            min_phone_length: countryObj?.min_phone_length || null,
            max_phone_length: countryObj?.max_phone_length || null
        });
        setProvisioningMode("new");
        setSelectedExistingUserId("");
        setAssignedWarehouseId(user.warehouse_id || "");
        setAssignedStateName(user.state_name || "");
        setAssignedClusterId(user.cluster_id || "");
        setActiveTab("add");
    }, [provisioningCountries, currentUserId]);

    const handleToggleStatus = async (id, currentStatus) => {
        if (id === currentUserId) return;
        setConfirmingStatus({ id, currentStatus });
    };

    const proceedToggleStatus = async () => {
        if (!confirmingStatus) return;
        const { id } = confirmingStatus;
        try {
            const res = await axios.patch(`${import.meta.env.VITE_API_URL}/cms/users/${id}/status`, {}, { headers: authHeaderObj() });
            if (res.data.success) {
                setUsers(prev => prev.map(u => u.id === id ? { ...u, is_active: res.data.is_active ? 1 : 0 } : u));
                dispatch(setAlert({ type: "success", message: res.data.message }));
            }
        } catch (error) {
            console.error(error);
            dispatch(setAlert({ type: "error", message: "Failed to toggle status" }));
        } finally {
            setConfirmingStatus(null);
        }
    };

    // --- FILTERED DATA ---
    const saasProductOptions = useMemo(() => {
        return [
            { value: "", text: "All Products" },
            ...saasProducts.map(p => {
                const count = users.filter(u => u.saas_product_ids && u.saas_product_ids.includes(String(p.id || p._id))).length;
                return {
                    value: String(p.id || p._id),
                    text: `${p.name} (${count} users)`
                };
            })
        ];
    }, [saasProducts, users]);

    const panelOptions = useMemo(() => {
        return [
            { value: "", text: "All Panels" },
            ...allPanels.map(p => ({
                value: String(p.id || p._id),
                text: p.name
            }))
        ];
    }, [allPanels]);

    const filteredCountriesOptions = useMemo(() => {
        let list = activeCountries;
        if (overviewFilters.saasProduct) {
            const prod = saasProducts.find(p => String(p.id || p._id) === String(overviewFilters.saasProduct));
            if (prod && prod.active_country_ids) {
                list = activeCountries.filter(c => prod.active_country_ids.includes(String(c.id || c._id)));
            } else {
                list = [];
            }
        }
        return [
            {
                value: "",
                text: (
                    <span className="flex items-center gap-2">
                        <HiGlobeAlt className="text-text-muted text-lg shrink-0" />
                        <span>All Countries</span>
                    </span>
                )
            },
            ...list.map(c => ({
                value: String(c.id || c._id),
                text: (
                    <span className="flex items-center gap-2">
                        {c.iso2 ? <ReactCountryFlag countryCode={c.iso2} svg className="text-lg shrink-0" /> : <HiGlobeAlt className="text-lg shrink-0 text-text-muted" />}
                        <span>{c.name}</span>
                    </span>
                )
            }))
        ];
    }, [activeCountries, saasProducts, overviewFilters.saasProduct]);

    const filteredUsers = useMemo(() => {
        const search = overviewSearch.toLowerCase();
        return users.filter(u => {
            const matchesSearch = !search ||
                u.name.toLowerCase().includes(search) ||
                u.email.toLowerCase().includes(search) ||
                (u.role_name && u.role_name.toLowerCase().includes(search)) ||
                (u.level_name && u.level_name.toLowerCase().includes(search));

            const matchesStatus = overviewFilters.status === "" || String(u.is_active) === overviewFilters.status;

            const matchesCountry = !overviewFilters.country ||
                u.country_id === overviewFilters.country ||
                (u.scope_ids && u.scope_ids.includes(overviewFilters.country));

            const matchesSaaS = !overviewFilters.saasProduct ||
                (u.saas_product_ids && u.saas_product_ids.includes(overviewFilters.saasProduct));

            let matchesPanel = !overviewFilters.panel;
            if (overviewFilters.panel) {
                if (u.panel_ids && u.panel_ids.includes(overviewFilters.panel)) {
                    matchesPanel = true;
                } else if (u.saas_product_ids && u.saas_product_ids.length > 0) {
                    const panelObj = allPanels.find(p => String(p.id || p._id) === String(overviewFilters.panel));
                    if (panelObj && panelObj.products) {
                        matchesPanel = u.saas_product_ids.some(spid =>
                            panelObj.products.some(p => String(p.id || p._id) === String(spid))
                        );
                    }
                }
            }

            const matchesWarehouse = !overviewFilters.warehouse ||
                u.warehouse_id === overviewFilters.warehouse ||
                (u.warehouse_name && u.warehouse_name.toLowerCase().includes(overviewFilters.warehouse.toLowerCase()));

            const matchesState = !overviewFilters.state ||
                (u.state_name && u.state_name.toLowerCase() === overviewFilters.state.toLowerCase()) ||
                (u.scope_ids && u.scope_ids.includes(overviewFilters.state));

            const matchesCluster = !overviewFilters.cluster ||
                u.cluster_id === overviewFilters.cluster ||
                (u.cluster_name && u.cluster_name.toLowerCase().includes(overviewFilters.cluster.toLowerCase())) ||
                (u.scope_ids && u.scope_ids.includes(overviewFilters.cluster));

            const matchesDept = !overviewFilters.department ||
                u.department_id === overviewFilters.department ||
                (u.department_name && u.department_name.toLowerCase().includes(overviewFilters.department.toLowerCase()));

            return matchesSearch && matchesStatus && matchesCountry && matchesSaaS && matchesPanel && matchesWarehouse && matchesState && matchesCluster && matchesDept;
        });
    }, [users, overviewSearch, overviewFilters, allPanels]);

    const unstaffedClusters = useMemo(() => {
        return liveClusters.filter(c => (!c.assigned_staff_users || c.assigned_staff_users.length === 0) || c.staffing_status === 'unassigned');
    }, [liveClusters]);

    const handleQuickAssignCluster = (clu) => {
        setEditId(null);
        setProvisioningMode("new");
        setSelectedExistingUserId("");
        setAssignedStateName(clu.state_name || "");
        setAssignedClusterId(clu._id || clu.id);
        const matchingWh = liveWarehouses.find(w => (w.state || w.level_1?.name || '').toLowerCase() === (clu.state_name || '').toLowerCase());
        if (matchingWh) setAssignedWarehouseId(matchingWh._id || matchingWh.id);
        setActiveTab("add");
    };

    const filteredDepartmentsOptions = useMemo(() => {
        const list = [...departments];
        // Ensure standard core departments always exist in the list
        const CORE_DEPT_NAMES = [
            "Accounts & Finance",
            "Delivery Management",
            "Warehouse Management",
            "Operations",
            "Super Admin"
        ];
        CORE_DEPT_NAMES.forEach(name => {
            if (!list.some(d => d.name?.toLowerCase() === name.toLowerCase())) {
                list.push({ id: `core_${name.toLowerCase().replace(/[^a-z0-9]/g, '_')}`, name, level: 'country' });
            }
        });

        return list.map(d => ({ value: String(d.id || d._id), text: d.name }));
    }, [departments]);

    const availableCountriesForDept = useMemo(() => {
        if (!provisioningFormData.department_id) return [];
        const dept = departments.find(d => String(d.id || d._id) === String(provisioningFormData.department_id));
        if (!dept || !dept.country_ids || dept.country_ids.length === 0) return activeCountries;
        return activeCountries.filter(c => dept.country_ids.includes(c.id));
    }, [departments, provisioningFormData.department_id, activeCountries]);

    const filteredRoles = useMemo(() => {
        if (provisioningRoles && provisioningRoles.length > 0) {
            const levelName = levels.find(l => (l.id || l._id)?.toString() === provisioningLevel?.toString())?.name?.toLowerCase();
            if (levelName === "country" && !isUniversalCountryRole && provisioningScope.country) {
                const scoped = provisioningRoles.filter(r => r.country_id?.toString() === provisioningScope.country?.toString());
                if (scoped.length > 0) return scoped;
            }
            return provisioningRoles;
        }

        // Fallback roles based on selected department so dropdown is NEVER blank
        const selectedDept = departments.find(d => String(d.id || d._id) === String(provisioningFormData.department_id));
        const deptName = (selectedDept?.name || provisioningFormData.department_id || "").toLowerCase();

        if (deptName.includes("account")) {
            return [
                { id: "role_acc_mgr", name: "Accounts Manager" },
                { id: "role_acc_exec", name: "Accountant" },
                { id: "role_acc_lead", name: "Finance & Accounts Lead" }
            ];
        } else if (deptName.includes("deliver")) {
            return [
                { id: "role_del_mgr", name: "Delivery Manager" },
                { id: "role_del_logistics", name: "Logistics Lead" },
                { id: "role_del_fleet", name: "Fleet Supervisor" }
            ];
        } else if (deptName.includes("warehouse")) {
            return [
                { id: "role_wh_mgr", name: "Warehouse Manager" },
                { id: "role_wh_inv", name: "Inventory Supervisor" },
                { id: "role_wh_assembly", name: "BOS Kit Assembly Lead" }
            ];
        } else if (deptName.includes("operat")) {
            return [
                { id: "role_ops_mgr", name: "Operations Manager" },
                { id: "role_ops_cluster", name: "Franchisee Cluster Lead" }
            ];
        } else if (deptName.includes("admin") || deptName.includes("super")) {
            return [
                { id: "role_super_admin", name: "Super Admin" },
                { id: "role_country_admin", name: "Country Administrator" },
                { id: "role_regional_admin", name: "Regional Administrator" }
            ];
        }

        return [
            { id: "role_staff_mgr", name: "Department Manager" },
            { id: "role_staff_lead", name: "Team Lead" },
            { id: "role_staff_exec", name: "Staff Executive" }
        ];
    }, [provisioningRoles, provisioningLevel, levels, isUniversalCountryRole, provisioningScope.country, departments, provisioningFormData.department_id]);

    const isProvisioningDisabled = useMemo(() => {
        if (provisioningAdding) return true;
        if (provisioningMode === "existing") {
            return !selectedExistingUserId || !assignedClusterId;
        }
        // New user mode:
        if (!provisioningFormData.name || !provisioningFormData.email || !provisioningFormData.role_id) {
            return true;
        }
        const levelName = levels.find(l => (l.id || l._id)?.toString() === provisioningLevel?.toString())?.name?.toLowerCase() || "";
        // If not global and not universal country role, require scopes OR warehouse/cluster assignment
        if (levelName !== "global" && !isUniversalCountryRole && provisioningFormData.scope_ids.length === 0 && !assignedClusterId) {
            return true;
        }
        return false;
    }, [provisioningAdding, provisioningMode, selectedExistingUserId, assignedClusterId, provisioningFormData.name, provisioningFormData.email, provisioningFormData.role_id, provisioningFormData.scope_ids.length, levels, provisioningLevel, isUniversalCountryRole]);

    const tabs = [
        { id: "overview", name: "User Directory", icon: <HiUsers /> },
        { id: "add", name: "Provision Identity", icon: <HiUserAdd /> },
        { id: "coverage", name: "Territory Coverage", icon: <HiGlobeAlt /> }
    ];

    return (
        <div className="flex flex-col min-h-screen bg-bg p-4 md:p-6 space-y-6 rounded-2xl">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-linear-to-br from-primary to-primary-end text-white shrink-0">
                        <MdManageAccounts className="w-5 h-5" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-black text-text-primary tracking-tight">Identity Management</h1>
                        <p className="text-sm text-text-muted font-bold uppercase tracking-widest flex items-center gap-2">
                            <HiGlobeAlt className="text-primary" /> Corporate Governance Ecosystem
                        </p>
                    </div>
                </div>

                <div className="flex p-1 bg-surface-hover rounded-xl border border-border">
                    {tabs.map((tab) => (
                        <button
                            key={tab.id}
                            type="button"
                            onClick={() => {
                                if (tab.id === 'add') {
                                    setEditId(null);
                                    setProvisioningFormData({
                                        name: "", email: "", country_id: "", phone_code: "", phone: "",
                                        department_id: "", role_id: "", scope_ids: [], parent_user_id: "",
                                        min_phone_length: null, max_phone_length: null
                                    });
                                    setSelectedCountries([]);
                                    setSelectedStates([]);
                                    setSelectedClusters([]);
                                    setSelectedDistricts([]);
                                    setSelectedPanels([]);
                                    setProvisioningLevel(levels[0]?.id || "");
                                    setProvisioningScope({ country: "", state: "", cluster: "", district: "", urban_city: "", rural_city: "" });
                                }
                                setActiveTab(tab.id);
                            }}
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === tab.id
                                ? "bg-surface text-primary shadow-sm"
                                : "text-text-muted hover:text-text-primary"
                                }`}
                        >
                            {tab.icon}
                            {tab.name}
                        </button>
                    ))}
                </div>
            </div>

            {/* Tab Panels */}
            <div className="flex-1 flex flex-col gap-6">
                {activeTab === "overview" && (
                    <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        {/* Unstaffed Clusters Alert Banner */}
                        {unstaffedClusters.length > 0 && (
                            <div className="bg-gradient-to-r from-amber-500/10 via-rose-500/10 to-amber-500/10 border-2 border-amber-500/40 rounded-2xl p-5 shadow-sm">
                                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                    <div className="flex items-start gap-3">
                                        <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-600 flex items-center justify-center shrink-0 mt-0.5">
                                            <HiExclamation size={24} />
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-amber-500 text-white animate-pulse">
                                                    Action Required
                                                </span>
                                                <h4 className="font-black text-text-primary text-base">
                                                    {unstaffedClusters.length} New Cluster{unstaffedClusters.length > 1 ? 's' : ''} Pending Staff Assignment
                                                </h4>
                                            </div>
                                            <p className="text-xs text-text-muted mt-1">
                                                Clusters cannot process or fulfill orders until designated personnel (Accounting, Delivery, or Operations) are provisioned.
                                            </p>
                                        </div>
                                    </div>
                                </div>
                                <div className="mt-4 flex flex-wrap gap-2 pt-3 border-t border-amber-200/40">
                                    {unstaffedClusters.map(clu => (
                                        <div key={clu._id || clu.id} className="flex items-center gap-2 bg-surface/90 border border-amber-300 rounded-xl px-3 py-1.5 shadow-2xs">
                                            <span className="text-xs font-bold text-text-primary">{clu.cluster_name || clu.name}</span>
                                            <span className="text-[10px] text-text-muted font-medium">({clu.state_name || 'All States'})</span>
                                            <button
                                                type="button"
                                                onClick={() => handleQuickAssignCluster(clu)}
                                                className="ml-1 text-[11px] font-bold text-primary hover:text-primary-hover bg-primary/10 hover:bg-primary/20 px-2 py-0.5 rounded-md transition-colors"
                                            >
                                                + Assign User
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Stats Cards Section */}
                        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                            <div className="card p-4 flex items-center justify-between border-l-4 border-l-primary bg-surface shadow-xs">
                                <div>
                                    <p className="text-[10px] font-black text-text-muted uppercase tracking-wider">Total Members</p>
                                    <h3 className="text-2xl font-black text-text-primary mt-1">{users.length}</h3>
                                </div>
                                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                                    <HiUsers size={20} />
                                </div>
                            </div>
                            <div className="card p-4 flex items-center justify-between border-l-4 border-l-success bg-surface shadow-xs">
                                <div>
                                    <p className="text-[10px] font-black text-text-muted uppercase tracking-wider">Active Accounts</p>
                                    <h3 className="text-2xl font-black text-success mt-1">{users.filter(u => u.is_active).length}</h3>
                                </div>
                                <div className="w-10 h-10 rounded-xl bg-success/10 flex items-center justify-center text-success">
                                    <HiCheckCircle size={20} />
                                </div>
                            </div>
                            <div className="card p-4 flex items-center justify-between border-l-4 border-l-text-muted bg-surface shadow-xs">
                                <div>
                                    <p className="text-[10px] font-black text-text-muted uppercase tracking-wider">Inactive Accounts</p>
                                    <h3 className="text-2xl font-black text-text-secondary mt-1">{users.filter(u => !u.is_active).length}</h3>
                                </div>
                                <div className="w-10 h-10 rounded-xl bg-surface-hover flex items-center justify-center text-text-muted">
                                    <HiLockClosed size={20} />
                                </div>
                            </div>
                            <div className="card p-4 flex items-center justify-between border-l-4 border-l-secondary bg-surface shadow-md ring-1 ring-secondary/10">
                                <div>
                                    <p className="text-[10px] font-black text-secondary tracking-wider uppercase">Filtered Results</p>
                                    <h3 className="text-2xl font-black text-secondary mt-1">{filteredUsers.length}</h3>
                                </div>
                                <div className="w-10 h-10 rounded-xl bg-secondary/10 flex items-center justify-center text-secondary">
                                    <HiSearch size={20} />
                                </div>
                            </div>
                            <div className="card p-4 flex items-center justify-between border-l-4 border-l-amber-500 bg-surface shadow-xs">
                                <div>
                                    <p className="text-[10px] font-black text-amber-600 uppercase tracking-wider">Unassigned Clusters</p>
                                    <h3 className="text-2xl font-black text-amber-600 mt-1">{unstaffedClusters.length}</h3>
                                </div>
                                <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-600">
                                    <FaExclamationTriangle size={18} />
                                </div>
                            </div>
                        </div>

                        {/* Global Filter Bar */}
                        <div className="card p-6">
                            <div className="flex flex-col gap-4">
                                <div className="w-full">
                                    <CustomInput
                                        label="Search Organizational Hierarchy"
                                        placeholder="Search by name, email, role or administrative level..."
                                        value={overviewSearch}
                                        onChange={e => setOverviewSearch(e.target.value)}
                                        leftIcon={<HiSearch />}
                                    />
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 items-end">
                                    <Dropdown
                                        label="SaaS Product"
                                        options={saasProductOptions}
                                        value={overviewFilters.saasProduct}
                                        onChange={v => {
                                            setOverviewFilters(p => {
                                                const next = { ...p, saasProduct: v };
                                                if (v) {
                                                    const prod = saasProducts.find(x => String(x.id || x._id) === String(v));
                                                    if (prod && prod.active_country_ids && p.country) {
                                                        if (!prod.active_country_ids.includes(String(p.country))) {
                                                            next.country = "";
                                                        }
                                                    }
                                                }
                                                return next;
                                            });
                                        }}
                                    />
                                    <Dropdown
                                        label="Active Region / Country"
                                        options={filteredCountriesOptions}
                                        value={overviewFilters.country}
                                        onChange={v => setOverviewFilters(p => ({ ...p, country: v }))}
                                    />
                                    <Dropdown
                                        label="User Panel"
                                        options={panelOptions}
                                        value={overviewFilters.panel}
                                        onChange={v => setOverviewFilters(p => ({ ...p, panel: v }))}
                                    />
                                    <Dropdown
                                        label="Account Status"
                                        options={[
                                            { value: "", text: "All Members" },
                                            { value: "1", text: "Active Only" },
                                            { value: "0", text: "Inactive Only" }
                                        ]}
                                        value={overviewFilters.status}
                                        onChange={v => setOverviewFilters(p => ({ ...p, status: v }))}
                                    />
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 items-end pt-3 border-t border-border">
                                    <Dropdown
                                        label="Warehouse Filter"
                                        options={[
                                            { value: "", text: "All Warehouses" },
                                            ...liveWarehouses.map(w => ({
                                                value: String(w._id || w.id || w.name),
                                                text: w.name || w.warehouse_name || `Warehouse ${w.id}`
                                            }))
                                        ]}
                                        value={overviewFilters.warehouse}
                                        onChange={v => setOverviewFilters(p => ({ ...p, warehouse: v }))}
                                    />
                                    <Dropdown
                                        label="State Filter"
                                        options={[
                                            { value: "", text: "All States" },
                                            ...INDIAN_STATES.map(s => ({ value: s, text: s }))
                                        ]}
                                        value={overviewFilters.state}
                                        onChange={v => setOverviewFilters(p => ({ ...p, state: v, cluster: "" }))}
                                    />
                                    <Dropdown
                                        label="Cluster Filter"
                                        options={[
                                            { value: "", text: "All Clusters" },
                                            ...liveClusters
                                                .filter(c => !overviewFilters.state || (c.state_name && c.state_name.toLowerCase() === overviewFilters.state.toLowerCase()))
                                                .map(c => ({
                                                    value: String(c._id || c.id || c.cluster_name),
                                                    text: `${c.cluster_name || c.name} ${(!c.assigned_staff_users || c.assigned_staff_users.length === 0) ? '⚠️ (Unstaffed)' : '✓'}`
                                                }))
                                        ]}
                                        value={overviewFilters.cluster}
                                        onChange={v => setOverviewFilters(p => ({ ...p, cluster: v }))}
                                    />
                                    <Dropdown
                                        label="Department Filter"
                                        options={[
                                            { value: "", text: "All Departments" },
                                            ...departments.map(d => ({ value: String(d.id || d._id), text: d.name }))
                                        ]}
                                        value={overviewFilters.department}
                                        onChange={v => setOverviewFilters(p => ({ ...p, department: v }))}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Hierarchy Tree View */}
                        {loadingUsers ? (
                            <div className="flex flex-col items-center justify-center py-20">
                                <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
                                <p className="mt-4 text-text-muted font-bold text-xs uppercase tracking-widest">Generating Hierarchy...</p>
                            </div>
                        ) : users.length > 0 ? (
                            <div className="w-full overflow-x-auto pb-4 custom-scrollbar">
                                <div className="space-y-4 min-w-[600px]">
                                    {(() => {
                                        const currentUserId = localStorage.getItem("cms_user_id");
                                        const search = overviewSearch.toLowerCase();

                                        const hasActiveFilters = search || overviewFilters.status || overviewFilters.country || overviewFilters.saasProduct || overviewFilters.panel || overviewFilters.warehouse || overviewFilters.state || overviewFilters.cluster || overviewFilters.department;

                                        // Build full map with search marking
                                        const userMap = {};
                                        users.forEach(u => {
                                            userMap[u.id] = { ...u, children: [], matchesSearch: false, shouldShow: !hasActiveFilters };
                                        });

                                        if (hasActiveFilters) {
                                            users.forEach(u => {
                                                const matchesSearch = !search ||
                                                    u.name.toLowerCase().includes(search) ||
                                                    u.email.toLowerCase().includes(search) ||
                                                    (u.role_name && u.role_name.toLowerCase().includes(search)) ||
                                                    (u.level_name && u.level_name.toLowerCase().includes(search));

                                                const matchesStatus = !overviewFilters.status || String(u.is_active) === overviewFilters.status;

                                                const matchesCountry = !overviewFilters.country ||
                                                    u.country_id === overviewFilters.country ||
                                                    (u.scope_ids && u.scope_ids.includes(overviewFilters.country));

                                                const matchesSaaS = !overviewFilters.saasProduct ||
                                                    (u.saas_product_ids && u.saas_product_ids.includes(overviewFilters.saasProduct));

                                                let matchesPanel = !overviewFilters.panel;
                                                if (overviewFilters.panel) {
                                                    if (u.panel_ids && u.panel_ids.includes(overviewFilters.panel)) {
                                                        matchesPanel = true;
                                                    } else if (u.saas_product_ids && u.saas_product_ids.length > 0) {
                                                        const panelObj = allPanels.find(p => String(p.id || p._id) === String(overviewFilters.panel));
                                                        if (panelObj && panelObj.products) {
                                                            matchesPanel = u.saas_product_ids.some(spid =>
                                                                panelObj.products.some(p => String(p.id || p._id) === String(spid))
                                                            );
                                                        }
                                                    }
                                                }

                                                const matchesWarehouse = !overviewFilters.warehouse ||
                                                    u.warehouse_id === overviewFilters.warehouse ||
                                                    (u.warehouse_name && u.warehouse_name.toLowerCase().includes(overviewFilters.warehouse.toLowerCase()));

                                                const matchesState = !overviewFilters.state ||
                                                    (u.state_name && u.state_name.toLowerCase() === overviewFilters.state.toLowerCase()) ||
                                                    (u.scope_ids && u.scope_ids.includes(overviewFilters.state));

                                                const matchesCluster = !overviewFilters.cluster ||
                                                    u.cluster_id === overviewFilters.cluster ||
                                                    (u.cluster_name && u.cluster_name.toLowerCase().includes(overviewFilters.cluster.toLowerCase())) ||
                                                    (u.scope_ids && u.scope_ids.includes(overviewFilters.cluster));

                                                const matchesDept = !overviewFilters.department ||
                                                    u.department_id === overviewFilters.department ||
                                                    (u.department_name && u.department_name.toLowerCase().includes(overviewFilters.department.toLowerCase()));

                                                if (matchesSearch && matchesStatus && matchesCountry && matchesSaaS && matchesPanel && matchesWarehouse && matchesState && matchesCluster && matchesDept) {
                                                    userMap[u.id].matchesSearch = search ? true : false;
                                                    userMap[u.id].shouldShow = true;
                                                    // Cascade visibility up
                                                    let parentId = u.parent_user_id;
                                                    while (parentId && userMap[parentId]) {
                                                        userMap[parentId].shouldShow = true;
                                                        parentId = userMap[parentId].parent_user_id;
                                                    }
                                                }
                                            });
                                        }

                                        // Build tree structure
                                        const roots = [];
                                        users.forEach(u => {
                                            if (u.parent_user_id && userMap[u.parent_user_id]) {
                                                userMap[u.parent_user_id].children.push(userMap[u.id]);
                                            } else {
                                                roots.push(userMap[u.id]);
                                            }
                                        });

                                        const visibleRoots = roots.filter(r => r.shouldShow);
                                        if (visibleRoots.length === 0 && hasActiveFilters) {
                                            return (
                                                <div className="card p-12 flex flex-col items-center text-center space-y-4">
                                                    <div className="w-16 h-16 bg-surface-hover rounded-full flex items-center justify-center text-text-muted/30">
                                                        <HiUsers size={40} />
                                                    </div>
                                                    <div>
                                                        <h3 className="text-lg font-bold text-text-primary uppercase tracking-tight">No Matching Members</h3>
                                                        <p className="text-sm text-text-muted">No users match your current search criteria in the hierarchy.</p>
                                                    </div>
                                                </div>
                                            );
                                        }

                                        return visibleRoots.map(root => (
                                            <UserNode
                                                key={root.id}
                                                node={root}
                                                currentUserId={currentUserId}
                                                search={search}
                                                onEdit={handleEdit}
                                                onToggleStatus={handleToggleStatus}
                                            />
                                        ));
                                    })()}
                                </div>
                            </div>
                        ) : (
                            <div className="card p-12 flex flex-col items-center text-center space-y-4">
                                <div className="w-16 h-16 bg-surface-hover rounded-full flex items-center justify-center text-text-muted/30">
                                    <HiUsers size={40} />
                                </div>
                                <div>
                                    <h3 className="text-lg font-bold text-text-primary uppercase tracking-tight">No Users Found</h3>
                                    <p className="text-sm text-text-muted">Your organizational directory is currently empty.</p>
                                </div>
                            </div>
                        )}
                    </div>
                )}
                {activeTab === "add" && (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in fade-in duration-500">
                        <div className="lg:col-span-2 space-y-6">
                            {/* Mode Switcher: Create New User vs Assign Existing User */}
                            {!editId && (
                                <div className="flex items-center gap-3 bg-surface-hover/60 p-1.5 rounded-xl border border-border w-fit">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setProvisioningMode("new");
                                            setSelectedExistingUserId("");
                                        }}
                                        className={`px-4 py-2 rounded-lg text-xs font-black uppercase tracking-wider flex items-center gap-2 transition-all ${
                                            provisioningMode === "new"
                                                ? "bg-primary text-white shadow-md shadow-primary/20"
                                                : "text-text-muted hover:text-text-primary"
                                        }`}
                                    >
                                        <HiUsers size={16} /> + Create New User
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setProvisioningMode("existing");
                                        }}
                                        className={`px-4 py-2 rounded-lg text-xs font-black uppercase tracking-wider flex items-center gap-2 transition-all ${
                                            provisioningMode === "existing"
                                                ? "bg-primary text-white shadow-md shadow-primary/20"
                                                : "text-text-muted hover:text-text-primary"
                                        }`}
                                    >
                                        <HiIdentification size={16} /> 👤 Assign Existing User
                                    </button>
                                </div>
                            )}

                            <div className="card p-6 space-y-8">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-primary/10 rounded-lg text-primary">
                                            <HiIdentification size={20} />
                                        </div>
                                        <h2 className="font-bold text-text-primary uppercase tracking-wider text-sm">
                                            {editId ? "Edit Staff Identity" : provisioningMode === "existing" ? "Assign Existing Staff Member" : "Identity Credentials"}
                                        </h2>
                                    </div>
                                    {editId && (
                                        <span className="text-xs bg-amber-500/10 text-amber-600 border border-amber-500/20 font-bold px-2 py-0.5 rounded-md">
                                            Editing User #{editId}
                                        </span>
                                    )}
                                </div>

                                {provisioningMode === "existing" && !editId && (
                                    <div className="p-4 bg-primary/5 border border-primary/20 rounded-xl space-y-3">
                                        <label className="text-xs font-black text-primary uppercase tracking-wider block">
                                            Select Existing Staff Member To Assign To Cluster *
                                        </label>
                                        <select
                                            value={selectedExistingUserId}
                                            onChange={(e) => {
                                                const uid = e.target.value;
                                                setSelectedExistingUserId(uid);
                                                const found = users.find(u => String(u.id || u._id) === String(uid));
                                                if (found) {
                                                    setProvisioningFormData(prev => ({
                                                        ...prev,
                                                        name: found.name,
                                                        email: found.email,
                                                        phone: found.phone || "",
                                                        department_id: found.department_id ? String(found.department_id) : prev.department_id,
                                                        role_id: found.role_id ? String(found.role_id) : prev.role_id,
                                                    }));
                                                    if (found.warehouse_id) setAssignedWarehouseId(found.warehouse_id);
                                                    if (found.state_name) setAssignedStateName(found.state_name);
                                                    if (found.cluster_id) setAssignedClusterId(found.cluster_id);
                                                }
                                            }}
                                            className="w-full py-2.5 px-3 text-xs bg-surface border border-border rounded-lg text-text-primary focus:outline-none focus:border-primary font-bold"
                                        >
                                            <option value="">-- Choose Existing Staff Member ({users.length} available) --</option>
                                            {users.map(u => (
                                                <option key={u.id} value={u.id}>
                                                    {u.name} ({u.email}) - {u.role_name || u.department_name || 'Staff'} {u.cluster_name ? `[Current: ${u.cluster_name}]` : '[Unassigned Cluster]'}
                                                </option>
                                            ))}
                                        </select>
                                        {selectedExistingUserId && (
                                            <div className="text-[11px] text-text-secondary flex flex-wrap gap-4 font-semibold pt-1">
                                                <span>Department: <b className="text-text-primary">{departments.find(d => String(d.id || d._id) === String(provisioningFormData.department_id))?.name || 'Assigned'}</b></span>
                                                <span>Assigned Warehouse: <b className="text-text-primary">{assignedWarehouseId ? (liveWarehouses.find(w => String(w._id || w.id) === String(assignedWarehouseId))?.name || 'Assigned') : 'None'}</b></span>
                                                <span>Assigned Cluster: <b className="text-text-primary">{assignedClusterId ? (liveClusters.find(c => String(c._id || c.id) === String(assignedClusterId))?.cluster_name || 'None') : 'None'}</b></span>
                                            </div>
                                        )}
                                    </div>
                                )}

                                <div className="space-y-6">
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        <div className="md:col-span-1">
                                            <Dropdown
                                                label="Admin Tier"
                                                options={levels.map(l => ({ value: l.id, text: <span className="uppercase font-bold text-[10px]">{l.name}</span> }))}
                                                value={provisioningLevel}
                                                onChange={v => {
                                                    setProvisioningLevel(v);
                                                    setSelectedCountries([]);
                                                    setSelectedStates([]);
                                                    setSelectedClusters([]);
                                                    setSelectedDistricts([]);
                                                    setProvisioningScope({ country: "", state: "", cluster: "", district: "", urban_city: "", rural_city: "" });
                                                    setProvisioningFormData(p => ({ ...p, scope_ids: [] }));
                                                }}
                                            />
                                        </div>
                                        <div className="md:col-span-1">
                                            <CustomInput
                                                label="Full Legal Name"
                                                placeholder="Alexander Pierce"
                                                value={provisioningFormData.name}
                                                onChange={e => setProvisioningFormData(p => ({ ...p, name: e.target.value }))}
                                                leftIcon={<FiUser />}
                                                disabled={provisioningMode === "existing" && !editId}
                                            />
                                        </div>
                                        <div className="md:col-span-1">
                                            <CustomInput
                                                label="Corporate Email"
                                                type="email"
                                                placeholder="alex@solarkits.com"
                                                value={provisioningFormData.email}
                                                onChange={e => setProvisioningFormData(p => ({ ...p, email: e.target.value }))}
                                                leftIcon={<HiMail />}
                                                disabled={provisioningMode === "existing" && !editId}
                                            />
                                        </div>
                                    </div>

                                    {/* Warehouse - State - Cluster Operational Assignment (As per Boss's Directive & Screenshot) */}
                                    <div className="p-4 bg-surface-hover/40 border-2 border-primary/20 rounded-xl space-y-3">
                                        <div className="flex items-center gap-2">
                                            <FaWarehouse className="text-primary" size={14} />
                                            <h3 className="text-xs font-black text-text-primary uppercase tracking-wider">
                                                Operational Assignment (Warehouse ➔ State ➔ Franchisee Cluster)
                                            </h3>
                                        </div>
                                        <p className="text-[11px] text-text-muted">
                                            Assign this user to a warehouse and cluster so that orders in this cluster can be handled and unlocked for dispatch.
                                        </p>

                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-1">
                                            <div>
                                                <label className="text-[10px] font-black text-text-muted uppercase tracking-wider block mb-1">
                                                    Assigned Warehouse *
                                                </label>
                                                <select
                                                    value={assignedWarehouseId}
                                                    onChange={(e) => {
                                                        const wid = e.target.value;
                                                        setAssignedWarehouseId(wid);
                                                        const foundWh = liveWarehouses.find(w => String(w._id || w.id) === String(wid));
                                                        if (foundWh) {
                                                            const whState = foundWh.state || foundWh.level_1?.name;
                                                            if (whState) {
                                                                setAssignedStateName(whState);
                                                            }
                                                        }
                                                    }}
                                                    className="w-full py-2 px-2.5 text-xs bg-surface border border-border rounded-lg text-text-primary focus:outline-none focus:border-primary font-medium"
                                                >
                                                    <option value="">-- Select Warehouse ({liveWarehouses.length}) --</option>
                                                    {liveWarehouses.map(w => (
                                                        <option key={w._id || w.id} value={w._id || w.id}>
                                                            {w.name || w.warehouse_name || `Warehouse ${w.id}`} {w.state ? `(${w.state})` : ''}
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>

                                            <div>
                                                <label className="text-[10px] font-black text-text-muted uppercase tracking-wider block mb-1">
                                                    Serviced State *
                                                </label>
                                                <select
                                                    value={assignedStateName}
                                                    onChange={(e) => {
                                                        setAssignedStateName(e.target.value);
                                                        setAssignedClusterId("");
                                                    }}
                                                    className="w-full py-2 px-2.5 text-xs bg-surface border border-border rounded-lg text-text-primary focus:outline-none focus:border-primary font-medium"
                                                >
                                                    <option value="">-- Select State --</option>
                                                    {INDIAN_STATES.map(s => (
                                                        <option key={s} value={s}>{s}</option>
                                                    ))}
                                                </select>
                                            </div>

                                            <div>
                                                <label className="text-[10px] font-black text-text-muted uppercase tracking-wider block mb-1">
                                                    Franchisee Cluster * {loadingClusters && <span className="text-primary font-normal text-[9px]">(Loading...)</span>}
                                                </label>
                                                <select
                                                    value={assignedClusterId}
                                                    onChange={(e) => {
                                                        const cid = e.target.value;
                                                        setAssignedClusterId(cid);
                                                        if (cid) {
                                                            const clu = liveClusters.find(c => String(c._id || c.id) === String(cid));
                                                            if (clu && clu.state_name && !assignedStateName) {
                                                                setAssignedStateName(clu.state_name);
                                                            }
                                                        }
                                                    }}
                                                    className="w-full py-2 px-2.5 text-xs bg-surface border border-border rounded-lg text-text-primary focus:outline-none focus:border-primary font-medium"
                                                >
                                                    <option value="">
                                                        {assignedStateName
                                                            ? `-- Select Cluster in ${assignedStateName} --`
                                                            : `-- Select Cluster (${liveClusters.length}) --`}
                                                    </option>
                                                    {liveClusters
                                                        .filter(c => !assignedStateName || (c.state_name && c.state_name.toLowerCase() === assignedStateName.toLowerCase()))
                                                        .map(c => {
                                                            const isStaffed = c.assigned_staff_users && c.assigned_staff_users.length > 0 && c.staffing_status !== 'unassigned';
                                                            return (
                                                                <option key={c._id || c.id} value={c._id || c.id}>
                                                                    {c.cluster_name || c.name} {isStaffed ? '✓ (Staffed)' : '⚠️ (Unstaffed)'}
                                                                </option>
                                                            );
                                                        })
                                                    }
                                                </select>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        <DropdownWithSearchInput
                                            label="Country Code"
                                            options={provisioningCountries.map(c => ({
                                                value: c.id || c._id,
                                                text: <span className="flex items-center gap-2"><ReactCountryFlag countryCode={c.iso2 || c.code || ""} svg /> {c.name}<span className="font-bold ml-1">({c.phone_code})</span></span>
                                            }))}
                                            value={provisioningFormData.country_id}
                                            onChange={v => {
                                                const country = provisioningCountries.find(c => (c.id || c._id).toString() === v.toString());
                                                setProvisioningFormData(p => ({
                                                    ...p,
                                                    country_id: v,
                                                    phone_code: country?.phone_code || "",
                                                    min_phone_length: country?.min_phone_length,
                                                    max_phone_length: country?.max_phone_length
                                                }));
                                            }}
                                        />
                                        <div className="md:col-span-2">
                                            <CustomInput
                                                label="Mobile Contact"
                                                placeholder="9876543210"
                                                value={provisioningFormData.phone}
                                                onChange={e => setProvisioningFormData(p => ({ ...p, phone: e.target.value.replace(/\D/g, "") }))}
                                                leftIcon={<HiPhone />}
                                                prefix={provisioningFormData.phone_code}
                                            />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-border">
                                        <Dropdown
                                            label="Department"
                                            options={filteredDepartmentsOptions}
                                            value={provisioningFormData.department_id}
                                            onChange={v => setProvisioningFormData(p => ({ ...p, department_id: v, role_id: "" }))}
                                            disabled={filteredDepartmentsOptions.length === 0}
                                            placeholder={
                                                filteredDepartmentsOptions.length === 0
                                                    ? (provisioningLevelName === "global" ? "No global departments available" : "Select boundaries first")
                                                    : "Select Department"
                                            }
                                        />

                                        {provisioningLevelName === "country" && (
                                            <div className="flex flex-col justify-center mt-4 md:mt-0 pt-2 md:pt-0">
                                                <ToggleButton
                                                    label="Universal Country-level Role"
                                                    checked={isUniversalCountryRole}
                                                    onChange={(checked) => {
                                                        setIsUniversalCountryRole(checked);
                                                        setProvisioningFormData(p => ({ ...p, role_id: "", scope_ids: [] }));
                                                        setSelectedCountries([]);
                                                        setSelectedStates([]);
                                                        setSelectedClusters([]);
                                                        setSelectedDistricts([]);
                                                        setProvisioningScope(p => ({ ...p, country: "" }));
                                                    }}
                                                />
                                            </div>
                                        )}

                                        {provisioningLevelName !== "country" && (
                                            <Dropdown
                                                label="Assigned Role"
                                                options={filteredRoles.map(r => ({ value: r.id, text: r.name }))}
                                                value={provisioningFormData.role_id}
                                                disabled={!provisioningFormData.department_id}
                                                onChange={v => setProvisioningFormData(p => ({ ...p, role_id: v }))}
                                            />
                                        )}
                                    </div>

                                    {provisioningLevelName === "country" && (
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4">
                                            {!isUniversalCountryRole ? (
                                                <>
                                                    <DropdownWithSearchInput
                                                        label="Select Scope Country First"
                                                        options={availableCountriesForDept.map(c => ({ value: c.id, text: c.name }))}
                                                        value={selectedCountries[0] || ""}
                                                        onChange={v => {
                                                            setSelectedCountries(v ? [v] : []);
                                                        }}
                                                    />
                                                    <Dropdown
                                                        label="Assigned Role"
                                                        options={filteredRoles.map(r => ({ value: r.id, text: r.name }))}
                                                        value={provisioningFormData.role_id}
                                                        disabled={selectedCountries.length === 0}
                                                        onChange={v => setProvisioningFormData(p => ({ ...p, role_id: v }))}
                                                    />
                                                </>
                                            ) : (
                                                <Dropdown
                                                    label="Assigned Role"
                                                    options={filteredRoles.map(r => ({ value: r.id, text: r.name }))}
                                                    value={provisioningFormData.role_id}
                                                    disabled={!provisioningFormData.department_id}
                                                    onChange={v => setProvisioningFormData(p => ({ ...p, role_id: v }))}
                                                />
                                            )}
                                        </div>
                                    )}

                                    {/* Primary Action Button directly inside Identity Credentials Form */}
                                    <div className="pt-6 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-4 bg-primary/5 p-4 rounded-xl border border-primary/20 shadow-xs">
                                        <div>
                                            <p className="font-black text-text-primary uppercase tracking-wider text-xs">
                                                {editId ? "Ready to Update Identity" : provisioningMode === "existing" ? "Ready to Assign Staff to Cluster" : "Ready to Authorize & Add User"}
                                            </p>
                                            <p className="text-text-muted text-[11px] mt-0.5">
                                                {provisioningMode === "existing"
                                                    ? "Click the button to link this staff member to the selected warehouse & cluster."
                                                    : "Click the button to save and authorize this user with the selected role."}
                                            </p>
                                        </div>
                                        <Button
                                            variant="primary"
                                            size="lg"
                                            className="rounded-xl font-black uppercase tracking-widest text-xs px-6 py-3 shadow-lg shadow-primary/20 shrink-0 w-full sm:w-auto"
                                            loading={provisioningAdding}
                                            disabled={isProvisioningDisabled}
                                            onClick={handleProvisionIdentity}
                                        >
                                            {editId ? "✓ Update Identity" : provisioningMode === "existing" ? "✓ Assign User to Cluster" : "✓ Authorize & Add User"}
                                        </Button>
                                    </div>
                                </div>
                            </div>

                            {(() => {
                                const levelName = levels.find(l => (l.id || l._id)?.toString() === provisioningLevel?.toString())?.name?.toLowerCase() || "";
                                if (levelName === "global") return null;

                                return (
                                    <div className="card p-6 space-y-6">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 bg-primary/10 rounded-lg text-primary">
                                                <HiLocationMarker size={20} />
                                            </div>
                                            <h2 className="font-bold text-text-primary uppercase tracking-wider text-sm">Regional Jurisdictions</h2>
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            {/* Country tier */}
                                            <div>
                                                {(() => {
                                                    const isMulti = levelName === "country" && isUniversalCountryRole;
                                                    const options = levelName === "country"
                                                        ? availableCountriesForDept.map(c => ({ value: c.id, text: c.name }))
                                                        : activeCountries.map(c => ({
                                                            value: c.id,
                                                            text: (
                                                                <span className="flex items-center gap-2 font-bold">
                                                                    <ReactCountryFlag countryCode={c.iso2 || ""} svg /> {c.name}
                                                                </span>
                                                            )
                                                        }));

                                                    return isMulti ? (
                                                        <MultiSelectDropdownWithSearchInput
                                                            label="Countries"
                                                            options={options}
                                                            values={selectedCountries}
                                                            onChange={setSelectedCountries}
                                                            placeholder="Select countries..."
                                                        />
                                                    ) : (
                                                        <DropdownWithSearchInput
                                                            label="Country"
                                                            options={options}
                                                            value={selectedCountries[0] || ""}
                                                            onChange={v => setSelectedCountries(v ? [v] : [])}
                                                            placeholder="Select a country..."
                                                        />
                                                    );
                                                })()}
                                            </div>

                                            {/* State tier */}
                                            {["state", "cluster", "district", "urban city", "rural city"].includes(levelName) && (
                                                <div>
                                                    {(() => {
                                                        const isMulti = levelName === "country" || levelName === "state";
                                                        const options = geoData.provisioning.states.map(s => ({ value: s.id, text: s.name }));
                                                        const isDisabled = selectedCountries.length === 0;

                                                        return isMulti ? (
                                                            <MultiSelectDropdownWithSearchInput
                                                                label="States"
                                                                options={options}
                                                                values={selectedStates}
                                                                onChange={setSelectedStates}
                                                                placeholder={isDisabled ? "Select a country first" : "Select states..."}
                                                                disabled={isDisabled}
                                                            />
                                                        ) : (
                                                            <DropdownWithSearchInput
                                                                label="State"
                                                                options={options}
                                                                value={selectedStates[0] || ""}
                                                                onChange={v => setSelectedStates(v ? [v] : [])}
                                                                placeholder={isDisabled ? "Select a country first" : "Select a state..."}
                                                                disabled={isDisabled}
                                                            />
                                                        );
                                                    })()}
                                                </div>
                                            )}

                                            {/* Cluster tier */}
                                            {["state", "cluster", "district", "urban city", "rural city"].includes(levelName) && (
                                                <div>
                                                    {(() => {
                                                        const isMulti = levelName === "country" || levelName === "state" || levelName === "cluster";
                                                        const options = geoData.provisioning.clusters.map(c => ({ value: c.id, text: c.name }));
                                                        const isDisabled = selectedStates.length === 0;

                                                        return isMulti ? (
                                                            <MultiSelectDropdownWithSearchInput
                                                                label="Clusters"
                                                                options={options}
                                                                values={selectedClusters}
                                                                onChange={setSelectedClusters}
                                                                placeholder={isDisabled ? "Select a state first" : "Select clusters..."}
                                                                disabled={isDisabled}
                                                            />
                                                        ) : (
                                                            <DropdownWithSearchInput
                                                                label="Cluster"
                                                                options={options}
                                                                value={selectedClusters[0] || ""}
                                                                onChange={v => setSelectedClusters(v ? [v] : [])}
                                                                placeholder={isDisabled ? "Select a state first" : "Select a cluster..."}
                                                                disabled={isDisabled}
                                                            />
                                                        );
                                                    })()}
                                                </div>
                                            )}

                                            {/* District tier */}
                                            {["state", "cluster", "district", "urban city", "rural city"].includes(levelName) && (
                                                <div>
                                                    {(() => {
                                                        const options = geoData.provisioning.districts.map(d => ({ value: d.id, text: d.name }));
                                                        const isDisabled = selectedClusters.length === 0;

                                                        return (
                                                            <MultiSelectDropdownWithSearchInput
                                                                label="Districts"
                                                                options={options}
                                                                values={selectedDistricts}
                                                                onChange={setSelectedDistricts}
                                                                placeholder={isDisabled ? "Select a cluster first" : "Select districts..."}
                                                                disabled={isDisabled}
                                                            />
                                                        );
                                                    })()}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })()}

                            {(() => {
                                const selectedRoleObj = provisioningRoles.find(r => (r.id || r._id)?.toString() === provisioningFormData.role_id?.toString());
                                const allowedPanelIds = selectedRoleObj ? selectedRoleObj.panels || [] : [];
                                if (allowedPanelIds.length === 0) return null;

                                return (
                                    <div className="card p-6 space-y-6 animate-in fade-in duration-300">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 bg-primary/10 rounded-lg text-primary">
                                                <FiGrid size={20} />
                                            </div>
                                            <h2 className="font-bold text-text-primary uppercase tracking-wider text-sm">Assigned SaaS Products</h2>
                                        </div>

                                        <div className="space-y-4">
                                            {allowedPanelIds.map(pid => {
                                                const panelObj = allPanels.find(p => p.id === pid || p._id === pid);
                                                if (!panelObj || !panelObj.products || panelObj.products.length === 0) return null;
                                                const item = selectedPanels.find(x => x.panel_id === pid) || { panel_id: pid, saas_product_ids: [] };
                                                return (
                                                    <div key={pid} className="p-4 border border-border rounded-2xl bg-bg/20 space-y-3 text-left">
                                                        <div className="flex items-center gap-2">
                                                            <FiGrid className="text-primary" size={14} />
                                                            <span className="text-xs font-black text-text-primary uppercase tracking-wider">{panelObj.name} SaaS Products</span>
                                                        </div>
                                                        <MultiSelectDropdownWithSearchInput
                                                            values={item.saas_product_ids}
                                                            onChange={(prodIds) => {
                                                                setSelectedPanels(prev => {
                                                                    const existing = prev.find(x => x.panel_id === pid);
                                                                    if (existing) {
                                                                        return prev.map(x => x.panel_id === pid ? { ...x, saas_product_ids: prodIds } : x);
                                                                    } else {
                                                                        return [...prev, { panel_id: pid, saas_product_ids: prodIds }];
                                                                    }
                                                                });
                                                            }}
                                                            options={panelObj.products.map(prod => ({ value: prod.id, text: prod.name }))}
                                                            placeholder={`Select products for ${panelObj.name}...`}
                                                        />
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                );
                            })()}
                        </div>

                        <div className="space-y-6">
                            <div className="card p-6 space-y-6 shadow-xl border-border">
                                <div className="flex justify-between items-center border-b border-border pb-4">
                                    <h3 className="text-sm font-black text-text-primary uppercase tracking-widest">{editId ? "Update Identity" : "Provision Overview"}</h3>
                                    {editId && (
                                        <button
                                            onClick={() => {
                                                setEditId(null);
                                                setProvisioningFormData({
                                                    name: "", email: "", country_id: "", phone_code: "", phone: "",
                                                    department_id: "", role_id: "", scope_ids: [], parent_user_id: "",
                                                    min_phone_length: null, max_phone_length: null
                                                });
                                                setSelectedPanels([]);
                                            }}
                                            className="text-[9px] font-black uppercase text-primary bg-primary/10 hover:bg-primary hover:text-white px-2 py-1 rounded-md transition-all"
                                        >
                                            Cancel Edit
                                        </button>
                                    )}
                                </div>

                                <div className="space-y-5">
                                    <div className="flex items-center gap-4">
                                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all duration-500 border ${provisioningFormData.name && provisioningFormData.email
                                                ? "bg-success/10 border-success text-success shadow-sm shadow-success/20"
                                                : "bg-surface-hover border-border text-text-muted"
                                            }`}>
                                            <HiCheckCircle size={20} />
                                        </div>
                                        <div className="flex flex-col">
                                            <p className={`text-xs font-bold uppercase tracking-tight ${provisioningFormData.name && provisioningFormData.email ? "text-text-primary" : "text-text-muted"}`}>Identity Details</p>
                                            <p className="text-[10px] text-text-muted font-medium">{provisioningFormData.name || "Pending..."}</p>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-4">
                                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all duration-500 border ${provisioningFormData.role_id
                                                ? "bg-primary/10 border-primary text-primary shadow-sm shadow-primary/20"
                                                : "bg-surface-hover border-border text-text-muted"
                                            }`}>
                                            <HiShieldCheck size={20} />
                                        </div>
                                        <div className="flex flex-col">
                                            <p className={`text-xs font-bold uppercase tracking-tight ${provisioningFormData.role_id ? "text-text-primary" : "text-text-muted"}`}>Access Mapping</p>
                                            <p className="text-[10px] text-text-muted font-medium">
                                                {provisioningRoles.find(r => r.id === provisioningFormData.role_id)?.name || "Not Assigned"}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-4">
                                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all duration-500 border ${(levels.find(l => l.id === provisioningLevel)?.name?.toLowerCase() === "global" || provisioningFormData.scope_ids.length > 0)
                                                ? "bg-secondary/10 border-secondary text-secondary shadow-sm shadow-secondary/20"
                                                : "bg-surface-hover border-border text-text-muted"
                                            }`}>
                                            <HiGlobeAlt size={20} />
                                        </div>
                                        <div className="flex flex-col">
                                            <p className={`text-xs font-bold uppercase tracking-tight ${(levels.find(l => l.id === provisioningLevel)?.name?.toLowerCase() === "global" || provisioningFormData.scope_ids.length > 0) ? "text-text-primary" : "text-text-muted"}`}>Regional Assignment</p>
                                            <p className="text-[10px] text-text-muted font-medium">
                                                {levels.find(l => l.id === provisioningLevel)?.name?.toLowerCase() === "global"
                                                    ? "Global Jurisdictional Authority"
                                                    : `${provisioningFormData.scope_ids.length} Jurisdictions Authorized`}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-4">
                                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all duration-500 border ${assignedClusterId
                                                ? "bg-emerald-500/10 border-emerald-500 text-emerald-500 shadow-sm shadow-emerald-500/20"
                                                : "bg-surface-hover border-border text-text-muted"
                                            }`}>
                                            <FaMapMarkerAlt size={18} />
                                        </div>
                                        <div className="flex flex-col">
                                            <p className={`text-xs font-bold uppercase tracking-tight ${assignedClusterId ? "text-text-primary" : "text-text-muted"}`}>Cluster Operational Assignment</p>
                                            <p className="text-[10px] text-text-muted font-medium">
                                                {assignedClusterId
                                                    ? (liveClusters.find(c => String(c._id || c.id) === String(assignedClusterId))?.cluster_name || "Assigned")
                                                    : "No Cluster Assigned"}
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                <div className="pt-6 border-t border-border space-y-4">
                                    <Dropdown
                                        label="Reporting Manager"
                                        options={provisioningParentUsers
                                            .filter(u => u.id?.toString() !== editId?.toString())
                                            .map(u => ({ value: u.id, text: u.name }))
                                        }
                                        value={provisioningFormData.parent_user_id}
                                        onChange={v => setProvisioningFormData(p => ({ ...p, parent_user_id: v }))}
                                    />
                                    <Button
                                        fullWidth
                                        variant="primary"
                                        size="lg"
                                        className="rounded-xl font-black uppercase tracking-widest text-[10px] shadow-lg shadow-primary/20"
                                        loading={provisioningAdding}
                                        disabled={isProvisioningDisabled}
                                        onClick={handleProvisionIdentity}
                                    >
                                        {editId ? "Update Identity" : provisioningMode === "existing" ? "Assign User to Cluster" : "✓ Authorize & Add User"}
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === "coverage" && (
                    <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6 animate-in fade-in duration-300 min-h-[600px]">
                        {/* Left Side: Tree View & Details */}
                        <div className="lg:col-span-5 flex flex-col gap-6">
                            <div className="card p-6 flex flex-col gap-4 max-h-[500px] overflow-y-auto custom-scrollbar">
                                <div className="flex items-center justify-between border-b border-border pb-4">
                                    <div>
                                        <h2 className="font-bold text-text-primary uppercase tracking-wider text-sm">Territory Coverage</h2>
                                        <p className="text-[10px] text-text-muted font-bold uppercase tracking-wider">Geographic Assignment Gap Audit</p>
                                    </div>
                                    <Button
                                        variant="secondary"
                                        onClick={fetchCoverageReport}
                                        disabled={loadingCoverage}
                                        className="w-8 h-8 p-0 rounded-full flex items-center justify-center bg-surface-hover border border-border"
                                    >
                                        <FaSync className={`w-4 h-4 ${loadingCoverage ? 'animate-spin' : 'rotate-180'}`} />
                                    </Button>
                                </div>

                                {loadingCoverage ? (
                                    <div className="flex flex-col items-center justify-center py-20">
                                        <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
                                        <p className="mt-2 text-text-muted font-bold text-[10px] uppercase tracking-wider">Analyzing Coverage...</p>
                                    </div>
                                ) : coverageData.length > 0 ? (
                                    <div className="space-y-2">
                                        {coverageData.map(node => (
                                            <CoverageNode
                                                key={node.id}
                                                node={node}
                                                onSelect={handleSelectCoverageNode}
                                                selectedId={selectedCoverageNode?.id}
                                            />
                                        ))}
                                    </div>
                                ) : (
                                    <div className="text-center py-10 text-text-muted text-xs font-bold uppercase">
                                        No coverage gaps detected. All active territories are fully staffed!
                                    </div>
                                )}
                            </div>

                            {/* Selected Node Details Card */}
                            {selectedCoverageNode && (
                                <div className="card p-6 space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
                                    <div className="flex items-center justify-between border-b border-border pb-3">
                                        <div>
                                            <span className="text-[9px] font-black text-primary uppercase tracking-wider block">Currently Selected</span>
                                            <h3 className="text-sm font-black text-text-primary uppercase tracking-wide">
                                                {selectedCoverageNode.name}
                                            </h3>
                                        </div>
                                        <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-primary/10 text-primary uppercase tracking-wider">
                                            {selectedCoverageNode.type}
                                        </span>
                                    </div>

                                    {/* Assigned Users list */}
                                    <div className="space-y-2">
                                        <span className="text-[10px] font-black text-text-muted uppercase tracking-wider block">Assigned Active Staff ({selectedCoverageNode.assignedUsers?.length || 0})</span>
                                        {selectedCoverageNode.assignedUsers && selectedCoverageNode.assignedUsers.length > 0 ? (
                                            <div className="grid grid-cols-1 gap-2 max-h-[150px] overflow-y-auto custom-scrollbar">
                                                {selectedCoverageNode.assignedUsers.map(user => (
                                                    <div key={user.id} className="p-2 border border-border/60 rounded-xl bg-surface-hover/50 flex flex-col gap-0.5">
                                                        <span className="text-xs font-black text-text-primary">{user.name}</span>
                                                        <span className="text-[9px] text-text-muted">{user.email}</span>
                                                        <span className="text-[9px] font-bold text-primary mt-1 uppercase tracking-wider">{user.role_name} ({user.level_name})</span>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <span className="text-[10px] text-danger/80 font-bold block bg-danger/5 border border-danger/10 p-2 rounded-lg text-center uppercase tracking-wide">
                                                No active users assigned directly to this region.
                                            </span>
                                        )}
                                    </div>

                                    {/* Unassigned Roles list */}
                                    <div className="space-y-2 pt-2 border-t border-border/60">
                                        <span className="text-[10px] font-black text-text-muted uppercase tracking-wider block">Unstaffed Roles ({selectedCoverageNode.unassignedRoles?.length || 0})</span>
                                        {selectedCoverageNode.unassignedRoles && selectedCoverageNode.unassignedRoles.length > 0 ? (
                                            <div className="flex flex-wrap gap-1.5 max-h-[120px] overflow-y-auto custom-scrollbar">
                                                {selectedCoverageNode.unassignedRoles.map(role => (
                                                    <span key={role.id} className="text-[9px] font-black uppercase px-2 py-1 rounded-md bg-danger/10 text-danger border border-danger/20">
                                                        {role.name}
                                                    </span>
                                                ))}
                                            </div>
                                        ) : (
                                            <span className="text-[10px] text-success/80 font-bold block bg-success/5 border border-success/10 p-2 rounded-lg text-center uppercase tracking-wide">
                                                All level-specific roles are fully staffed!
                                            </span>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Right Side: Map Overview */}
                        <div className="lg:col-span-7 flex flex-col">
                            <div className="card p-4 flex-1 h-full min-h-[500px] relative overflow-hidden flex flex-col">
                                <div className="flex items-center gap-2 border-b border-border pb-3 mb-3">
                                    <HiGlobeAlt className="text-primary text-lg" />
                                    <div>
                                        <span className="text-xs font-black text-text-primary uppercase tracking-wide block">Geographic Visualization Map</span>
                                        <span className="text-[9px] text-text-muted uppercase tracking-wider">Visualizing geographic boundaries for selected territories</span>
                                    </div>
                                </div>

                                <div className="flex-1 rounded-2xl overflow-hidden border border-border/80 bg-surface-hover/20 relative">
                                    {!isLoaded ? (
                                        <div className="absolute inset-0 flex flex-col items-center justify-center bg-surface">
                                            {loadError ? (
                                                <div className="text-danger font-bold text-xs uppercase tracking-wider">
                                                    Error loading Google Maps API
                                                </div>
                                            ) : (
                                                <>
                                                    <div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
                                                    <p className="mt-3 text-text-muted font-bold text-[10px] uppercase tracking-wider">Loading Map Interface...</p>
                                                </>
                                            )}
                                        </div>
                                    ) : (
                                        <UniversalMap
                                            center={mapCenter}
                                            zoom={mapCenter.lat === 20.5937 && mapCenter.lng === 78.9629 ? 4 : 6}
                                            boundaries={mapBoundaries}
                                            containerStyle={{ width: "100%", height: "100%" }}
                                        />
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Status Confirmation Modal */}
                <ConfirmationPopup
                    isOpen={!!confirmingStatus}
                    title={confirmingStatus?.currentStatus ? "Deactivate Administrator?" : "Activate Administrator?"}
                    message={`Are you sure you want to ${confirmingStatus?.currentStatus ? "suspend" : "restore"} access for this administrator? This will ${confirmingStatus?.currentStatus ? "revoke" : "grant"} system-wide administrative permissions.`}
                    onConfirm={proceedToggleStatus}
                    onCancel={() => setConfirmingStatus(null)}
                    variant={confirmingStatus?.currentStatus ? "danger" : "success"}
                    confirmText={confirmingStatus?.currentStatus ? "Confirm Suspension" : "Confirm Activation"}
                    cancelText="Cancel"
                />
            </div>
        </div>
    );
}

const UserNode = ({ node, level = 0, currentUserId, search, onEdit, onToggleStatus }) => {
    const [isExpanded, setIsExpanded] = useState(level < 1 || !!search);
    const hasChildren = node.children && node.children.length > 0;

    useEffect(() => {
        if (search) setIsExpanded(true);
    }, [search]);

    if (!node.shouldShow && search) return null;

    const getLevelColor = (levelName) => {
        const name = levelName?.toLowerCase() || "";
        if (name.includes("global")) return { base: "primary", gradient: "var(--gradient-primary)", soft: "bg-primary/5", text: "text-primary", border: "border-primary/20" };
        if (name.includes("country")) return { base: "success", gradient: "var(--gradient-success)", soft: "bg-success/5", text: "text-success", border: "border-success/20" };
        if (name.includes("state")) return { base: "warning", gradient: "var(--gradient-warning)", soft: "bg-warning/5", text: "text-warning", border: "border-warning/20" };
        if (name.includes("cluster")) return { base: "secondary", gradient: "var(--gradient-secondary)", soft: "bg-secondary/5", text: "text-secondary", border: "border-secondary/20" };
        if (name.includes("district")) return { base: "indigo-500", gradient: "linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)", soft: "bg-indigo-500/5", text: "text-indigo-600", border: "border-indigo-500/20" };
        return { base: "text-muted", gradient: "linear-gradient(135deg, #94a3b8 0%, #64748b 100%)", soft: "bg-surface-hover", text: "text-text-muted", border: "border-border" };
    };

    const colors = getLevelColor(node.level_name);

    return (
        <div className="flex flex-col">
            <div className={`group flex items-center gap-4 p-3 rounded-2xl transition-all border relative overflow-hidden min-w-[400px] ${node.id === currentUserId
                    ? "bg-primary/5 border-primary/30 shadow-md ring-1 ring-primary/10"
                    : "bg-surface hover:bg-surface-hover border-border hover:border-primary/30 hover:shadow-lg"
                }`}>
                <div className="flex items-center gap-2 min-w-[32px] z-10">
                    {hasChildren ? (
                        <button
                            onClick={() => node.id !== currentUserId && setIsExpanded(!isExpanded)}
                            disabled={node.id === currentUserId}
                            className={`w-7 h-7 rounded-lg bg-surface border border-border flex items-center justify-center transition-all ${node.id === currentUserId ? "text-text-muted/30 cursor-not-allowed" : "text-primary hover:scale-110 hover:shadow-md active:scale-95"
                                }`}
                        >
                            <span className={`transform transition-transform duration-500 ${isExpanded ? "rotate-90" : ""}`}>
                                <HiChevronRight size={16} />
                            </span>
                        </button>
                    ) : (
                        <div className="w-7 h-7 flex items-center justify-center">
                            <div className="w-1.5 h-1.5 rounded-full bg-border group-hover:bg-primary/40 transition-colors" />
                        </div>
                    )}
                </div>

                <div className="flex-1 flex items-center justify-between gap-4 overflow-hidden z-10">
                    <div className="flex items-center gap-4 min-w-0">
                        {/* Identity Avatar with Subtle Backing */}
                        <div className="relative shrink-0">
                            <div
                                className={`w-12 h-12 rounded-xl flex items-center justify-center bg-surface border border-border shadow-sm transition-transform duration-500 group-hover:scale-105 group-hover:rotate-3 ${node.matchesSearch ? "ring-2 ring-primary ring-offset-2" : ""
                                    }`}
                            >
                                <HiIdentification size={24} className={colors.text} />
                            </div>
                            {node.is_active ? (
                                <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-success border-2 border-surface flex items-center justify-center shadow-sm">
                                    <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                                </div>
                            ) : (
                                <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-text-muted border-2 border-surface flex items-center justify-center shadow-sm">
                                    <HiLockClosed size={8} className="text-white" />
                                </div>
                            )}
                        </div>

                        <div className="flex flex-col min-w-0">
                            <div className="flex items-center gap-2 mb-0.5">
                                <h4 className={`text-base font-black truncate tracking-tight transition-colors ${node.matchesSearch ? "text-primary" : "text-text-primary"
                                    }`}>
                                    {node.name}
                                </h4>
                                {node.id === currentUserId && (
                                    <span className="px-2 py-0.5 bg-primary text-white text-[8px] font-black uppercase rounded-md shadow-sm shadow-primary/20">You</span>
                                )}
                            </div>

                            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                                <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full ${colors.soft} ${colors.text} border ${colors.border}`}>
                                    {node.role_name}
                                </span>
                                <span className="text-[10px] text-text-muted font-bold uppercase tracking-tighter flex items-center gap-1">
                                    <span className="w-1 h-1 rounded-full bg-border" /> {node.level_name}
                                </span>
                                {node.warehouse_name && (
                                    <span className="text-[10px] bg-blue-500/10 text-blue-600 border border-blue-500/20 px-2 py-0.5 rounded-md font-bold flex items-center gap-1">
                                        <FaWarehouse size={9} /> {node.warehouse_name}
                                    </span>
                                )}
                                {node.cluster_name && (
                                    <span className="text-[10px] bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 px-2 py-0.5 rounded-md font-bold flex items-center gap-1">
                                        <FaMapMarkerAlt size={9} /> {node.cluster_name} {node.state_name ? `(${node.state_name})` : ''}
                                    </span>
                                )}
                                {node.department_name && (
                                    <span className="text-[10px] bg-purple-500/10 text-purple-600 border border-purple-500/20 px-2 py-0.5 rounded-md font-bold">
                                        {node.department_name}
                                    </span>
                                )}
                            </div>

                            <div className="mt-1.5 flex flex-col gap-0.5">
                                {node.scope_names && node.scope_names.length > 0 && (
                                    <p className="text-[9px] text-primary/80 font-bold uppercase tracking-widest truncate flex items-center gap-1.5">
                                        <HiGlobeAlt size={12} className="text-primary/40" />
                                        {node.scope_names.join(", ")}
                                    </p>
                                )}
                                {node.parent_user_name && (
                                    <p className="text-[9px] text-text-muted/60 font-medium uppercase tracking-wider truncate flex items-center gap-1.5">
                                        <HiArrowUp size={11} className="text-primary/30" />
                                        Reports to: <span className="text-text-secondary font-bold italic">{node.parent_user_name}</span>
                                    </p>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-6 shrink-0">
                        {/* Hover Actions - Glassmorphic Style */}
                        <div className="hidden group-hover:flex items-center gap-2 animate-in fade-in zoom-in-95 duration-300">
                            <button
                                onClick={() => node.id !== currentUserId && onEdit(node)}
                                disabled={node.id === currentUserId}
                                className={`w-9 h-9 rounded-xl border flex items-center justify-center transition-all ${node.id === currentUserId
                                        ? "bg-danger/5 border-danger/10 text-danger/30 cursor-not-allowed"
                                        : "bg-surface/80 backdrop-blur-md border-border text-text-muted hover:text-primary hover:border-primary hover:shadow-lg active:scale-90"
                                    }`}
                                title={node.id === currentUserId ? "Protected Record" : "Edit Identity"}
                            >
                                {node.id === currentUserId ? <HiBan size={16} /> : <HiPencil size={16} />}
                            </button>

                            <button
                                onClick={() => node.id !== currentUserId && onToggleStatus(node.id, !!node.is_active)}
                                disabled={node.id === currentUserId}
                                className={`w-9 h-9 rounded-xl border flex items-center justify-center transition-all ${node.id === currentUserId
                                        ? "bg-danger/5 border-danger/10 text-danger/30 cursor-not-allowed"
                                        : node.is_active
                                            ? "bg-surface/80 backdrop-blur-md border-border text-text-muted hover:text-danger hover:border-danger hover:shadow-lg active:scale-90"
                                            : "bg-surface/80 backdrop-blur-md border-border text-text-muted hover:text-success hover:border-success hover:shadow-lg active:scale-90"
                                    }`}
                                title={node.id === currentUserId ? "Protected Record" : (node.is_active ? "Deactivate Identity" : "Activate Identity")}
                            >
                                {node.id === currentUserId ? <HiBan size={16} /> : (node.is_active ? <HiLockOpen size={16} /> : <HiLockClosed size={16} />)}
                            </button>
                        </div>

                        <div className="hidden md:flex flex-col items-end group-hover:hidden transition-all duration-300">
                            <span className="text-[9px] font-black text-text-muted uppercase tracking-widest opacity-60 mb-0.5">Corporate Link</span>
                            <span className="text-xs font-bold text-text-secondary truncate max-w-[160px] lowercase">{node.email}</span>
                        </div>

                        <div className="hidden lg:flex flex-col items-end min-w-[90px] group-hover:hidden transition-all duration-300">
                            <span className="text-[9px] font-black text-text-muted uppercase tracking-widest opacity-60 mb-0.5">Account Status</span>
                            <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[9px] font-black uppercase ${node.is_active ? "bg-success/10 text-success border border-success/20" : "bg-text-muted/10 text-text-muted border border-text-muted/20"
                                }`}>
                                <span className={`w-1 h-1 rounded-full ${node.is_active ? "bg-success" : "bg-text-muted"}`} />
                                {node.is_active ? "Active" : "Inactive"}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {hasChildren && isExpanded && (
                <div className="ml-4 pl-5 border-l border-dashed border-border/40 mt-2 space-y-2 relative transition-all">
                    {/* Visual Connector Line Extension */}
                    <div className="absolute left-0 top-0 w-3 h-[18px] border-b border-dashed border-border/40 rounded-bl-lg" />

                    {node.children.map(child => (
                        <UserNode key={child.id} node={child} level={level + 1} currentUserId={currentUserId} search={search} onEdit={onEdit} onToggleStatus={onToggleStatus} />
                    ))}
                </div>
            )}
        </div>
    );
};

const CoverageNode = ({ node, onSelect, selectedId, depth = 0 }) => {
    const [isOpen, setIsOpen] = useState(depth < 1);

    const hasChildren = node.children && node.children.length > 0;
    const isSelected = selectedId === node.id;

    const statusColor = node.status === 'unassigned'
        ? 'border-l-4 border-l-danger bg-danger/5 hover:bg-danger/10'
        : 'border-l-4 border-l-warning bg-warning/5 hover:bg-warning/10';

    return (
        <div className="space-y-1">
            <div
                onClick={() => onSelect(node)}
                className={`flex items-center justify-between p-3 rounded-xl cursor-pointer transition-all border border-border/40 ${statusColor} ${isSelected ? 'ring-2 ring-primary bg-primary/5 shadow-xs' : ''}`}
                style={{ marginLeft: `${depth * 12}px` }}
            >
                <div className="flex items-center gap-2 min-w-0">
                    {hasChildren ? (
                        <button
                            type="button"
                            onClick={(e) => {
                                e.stopPropagation();
                                setIsOpen(!isOpen);
                            }}
                            className="p-1 hover:bg-black/5 rounded-md transition-colors shrink-0"
                        >
                            <HiChevronRight className={`w-3.5 h-3.5 transition-transform duration-200 ${isOpen ? 'rotate-90' : ''}`} />
                        </button>
                    ) : (
                        <span className="w-5.5 shrink-0" />
                    )}
                    <span className="text-xs font-black uppercase tracking-wider text-text-primary truncate">
                        {node.name}
                    </span>
                    <span className="text-[8px] font-bold px-1.5 py-0.5 rounded-full uppercase tracking-wider bg-black/5 text-text-muted shrink-0">
                        {node.type}
                    </span>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                    {node.unassignedRoles?.length > 0 && (
                        <span className="text-[8px] font-bold px-1.5 py-0.5 rounded-md bg-danger/10 text-danger border border-danger/20">
                            {node.unassignedRoles.length} unstaffed
                        </span>
                    )}
                    {node.status === 'unassigned' ? (
                        <span className="text-[8px] font-black uppercase text-danger">Unassigned</span>
                    ) : (
                        <span className="text-[8px] font-black uppercase text-warning">Partial</span>
                    )}
                </div>
            </div>

            {hasChildren && isOpen && (
                <div className="space-y-1">
                    {node.children.map(child => (
                        <CoverageNode
                            key={child.id}
                            node={child}
                            onSelect={onSelect}
                            selectedId={selectedId}
                            depth={depth + 1}
                        />
                    ))}
                </div>
            )}
        </div>
    );
};
