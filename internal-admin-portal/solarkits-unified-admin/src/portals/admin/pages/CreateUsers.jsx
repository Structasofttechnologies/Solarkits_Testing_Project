import { useState, useEffect, useMemo, useCallback, useRef } from "react";
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
import { FiUser, FiGrid, FiShield, FiCheckCircle, FiDollarSign } from "react-icons/fi";

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

const findWarehouseForCluster = (clu, warehouses = []) => {
    if (!clu) return null;
    const cluId = String(clu._id || clu.id || '');
    const cluState = (clu.state_name || '').trim().toLowerCase();
    return warehouses.find(w => 
        (w.serviced_cluster_ids && w.serviced_cluster_ids.some(cid => String(cid) === cluId)) ||
        (w.cluster_ids && w.cluster_ids.some(cid => String(cid) === cluId)) ||
        (w.cluster_id && String(w.cluster_id) === cluId) ||
        (clu.warehouse_id && String(w._id || w.id) === String(clu.warehouse_id)) ||
        (clu.assigned_warehouse_id && String(w._id || w.id) === String(clu.assigned_warehouse_id)) ||
        (w.state_name && w.state_name.trim().toLowerCase() === cluState) ||
        (w.state && w.state.trim().toLowerCase() === cluState) ||
        (w.location && w.location.toLowerCase().includes(cluState))
    ) || warehouses.find(w => 
        cluState && (w.warehouse_name || w.name || '').toLowerCase().includes(cluState)
    ) || null;
};

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
    const [warehouseMappings, setWarehouseMappings] = useState([]);
    const [loadingClusters, setLoadingClusters] = useState(false);

    // --- PROVISIONING MODE: NEW USER VS ASSIGN EXISTING USER ---
    const [provisioningMode, setProvisioningMode] = useState("new"); // "new" | "existing"
    const [selectedExistingUserId, setSelectedExistingUserId] = useState("");
    const [assignedWarehouseId, setAssignedWarehouseId] = useState("");
    const [assignedStateName, setAssignedStateName] = useState("");
    const [assignedClusterId, setAssignedClusterId] = useState("");
    const [selectedWarehouseManagerId, setSelectedWarehouseManagerId] = useState("");
    const [selectedWarehouseAccountantId, setSelectedWarehouseAccountantId] = useState("");
    const [clusterRequiredPopup, setClusterRequiredPopup] = useState(null); // { warehouseName, warehouseId }

    // --- OVERVIEW STATES ---
    const [users, setUsers] = useState([]);
    const [loadingUsers, setLoadingUsers] = useState(false);
    const [overviewSearch, setOverviewSearch] = useState("");
    const [directoryViewMode, setDirectoryViewMode] = useState("list"); // "list" | "tree"
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
        name: "", email: "", country_id: "", phone_code: "+91", phone: "",
        department_id: "", role_id: "", scope_ids: [], parent_user_id: "",
        state_name: "", min_phone_length: null, max_phone_length: null
    });
    const [roleRbacDetails, setRoleRbacDetails] = useState(null);
    const [loadingRoleRbac, setLoadingRoleRbac] = useState(false);
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
            const countryList = allCountriesRes.data?.data || allCountriesRes.data || [];
            setProvisioningCountries(countryList);
            const defaultCountry = countryList.find(c => (c.name || '').toLowerCase() === 'india' || c.phone_code === '+91' || c.phone_code === '91') || countryList[0];
            if (defaultCountry) {
                setProvisioningFormData(prev => ({
                    ...prev,
                    country_id: prev.country_id || defaultCountry.id || defaultCountry._id,
                    phone_code: prev.phone_code || defaultCountry.phone_code || '+91',
                    min_phone_length: defaultCountry.min_phone_length || prev.min_phone_length,
                    max_phone_length: defaultCountry.max_phone_length || prev.max_phone_length
                }));
            }
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
            const [whRes, cluRes, mapRes] = await Promise.allSettled([
                axios.get(`${import.meta.env.VITE_API_URL}/solarshop/cluster-routing/available-warehouses`, { headers: authHeaderObj() }),
                axios.get(`${import.meta.env.VITE_API_URL}/franchise-clusters/list`, { headers: authHeaderObj() }),
                axios.get(`${import.meta.env.VITE_API_URL}/solarshop/cluster-routing/mappings`, { headers: authHeaderObj() })
            ]);
            if (whRes.status === "fulfilled") {
                setLiveWarehouses(whRes.value?.data?.data || whRes.value?.data?.warehouses || whRes.value?.data || []);
            }
            if (cluRes.status === "fulfilled") {
                setLiveClusters(cluRes.value?.data?.data || cluRes.value?.data || []);
            }
            if (mapRes.status === "fulfilled") {
                setWarehouseMappings(mapRes.value?.data?.data || []);
            }
        } catch (err) {
            console.error("Error fetching warehouses, clusters, and routing mappings:", err);
        } finally {
            setLoadingClusters(false);
        }
    }, []);

    const getRoles = useCallback(async (levelId, deptId, type) => {
        if (!levelId) return;
        try {
            // Check if selected department is the unified Warehouse & Delivery Management department
            const selectedDept = departments.find(d => String(d.id || d._id) === String(deptId));
            const isWarehouseOrDelivery = (selectedDept?.name || "").toLowerCase().includes("warehouse") || (selectedDept?.name || "").toLowerCase().includes("deliver");

            let roles = [];
            if (isWarehouseOrDelivery) {
                // Fetch roles for both Warehouse and Delivery departments and combine them
                const matchingDeptIds = departments
                    .filter(d => (d.name || "").toLowerCase().includes("warehouse") || (d.name || "").toLowerCase().includes("deliver"))
                    .map(d => String(d.id || d._id));

                const uniqueIds = [...new Set([deptId, ...matchingDeptIds])];
                const reqs = uniqueIds.map(id =>
                    axios.get(`${import.meta.env.VITE_API_URL}/cms/users/roles/${id}/${levelId}`, { headers: authHeaderObj() })
                        .catch(() => ({ data: { data: [] } }))
                );
                const responses = await Promise.all(reqs);
                const roleMap = new Map();
                responses.forEach(r => {
                    (r.data?.data || []).forEach(role => {
                        const rId = String(role.id || role._id);
                        if (!roleMap.has(rId)) roleMap.set(rId, role);
                    });
                });
                roles = Array.from(roleMap.values());
            } else {
                const url = deptId
                    ? `${import.meta.env.VITE_API_URL}/cms/users/roles/${deptId}/${levelId}`
                    : `${import.meta.env.VITE_API_URL}/cms/users/roles/${levelId}`;
                const res = await axios.get(url, { headers: authHeaderObj() });
                roles = res.data?.data || [];
            }

            if (type === "overview") return;
            else setProvisioningRoles(roles);
        } catch (err) {
            console.error("Error fetching roles:", err);
        }
    }, [departments]);

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

    // Fetch role RBAC panels & module permissions when role changes
    useEffect(() => {
        const roleId = provisioningFormData.role_id;
        if (!roleId) {
            setRoleRbacDetails(null);
            return;
        }
        let isMounted = true;
        setLoadingRoleRbac(true);
        axios.get(`${import.meta.env.VITE_API_URL}/roles/${roleId}?unique_id=ADM_RBAC&req_for=view`, {
            headers: authHeaderObj()
        }).then(res => {
            if (!isMounted) return;
            const rData = res.data?.data;
            setRoleRbacDetails(rData);
            if (rData && rData.panels && rData.panels.length > 0) {
                const autoPanels = rData.panels.map(p => ({
                    panel_id: p.id || p._id,
                    panel_name: p.name,
                    saas_product_ids: p.saas_product_ids || []
                }));
                setSelectedPanels(autoPanels);
            }
        }).catch(err => {
            console.error("Error fetching role RBAC details:", err);
        }).finally(() => {
            if (isMounted) setLoadingRoleRbac(false);
        });

        return () => { isMounted = false; };
    }, [provisioningFormData.role_id]);

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
            // Case 1: Warehouse Staff Assignment (Warehouse Manager & Accountant)
            if (provisioningMode === "existing" && !editId) {
                if (!assignedWarehouseId) {
                    dispatch(setAlert({ type: "error", message: "Please select a Regional Warehouse to assign staff." }));
                    setProvisioningAdding(false);
                    return;
                }
                if (servicedClustersForSelectedWh.length === 0) {
                    const whName = selectedWarehouseObj?.name || selectedWarehouseObj?.warehouse_name || "this warehouse";
                    setClusterRequiredPopup({
                        warehouseName: whName,
                        warehouseId: assignedWarehouseId
                    });
                    dispatch(setAlert({
                        type: "error",
                        message: `First assign clusters to ${whName} before designating staff!`
                    }));
                    setProvisioningAdding(false);
                    return;
                }
                if (!selectedWarehouseManagerId && !selectedWarehouseAccountantId) {
                    dispatch(setAlert({ type: "error", message: "Please select at least one designated staff role (Warehouse Manager or Accountant)." }));
                    setProvisioningAdding(false);
                    return;
                }

                const res = await axios.post(
                    `${import.meta.env.VITE_API_URL}/warehouses/${assignedWarehouseId}/assign-staff`,
                    {
                        manager_id: selectedWarehouseManagerId || null,
                        accountant_id: selectedWarehouseAccountantId || null
                    },
                    { headers: authHeaderObj() }
                );

                const count = res.data?.data?.cascaded_clusters_count || servicedClustersForSelectedWh.length;
                dispatch(setAlert({
                    type: "success",
                    message: `Staff assigned successfully to warehouse! Automatically inherited by ${count} serviced cluster(s).`
                }));

                setSelectedWarehouseManagerId("");
                setSelectedWarehouseAccountantId("");
                setAssignedWarehouseId("");
                setAssignedStateName("");
                setActiveTab("overview");
                fetchAllSubordinates();
                fetchWarehouseClusterData();
                setProvisioningAdding(false);
                return;
            }

            // Case 2: New User or Edit User (Pure Identity Provisioning)
            const deptObj = departments.find(d => String(d.id || d._id) === String(provisioningFormData.department_id));

            const url = editId
                ? `${import.meta.env.VITE_API_URL}/cms/users/${editId}`
                : `${import.meta.env.VITE_API_URL}/cms/users`;
            const method = editId ? 'put' : 'post';

            const userPayload = {
                ...provisioningFormData,
                phone_code: provisioningFormData.phone_code || "+91",
                country_id: provisioningFormData.country_id || provisioningCountries.find(c => (c.name || '').toLowerCase() === 'india')?.id || provisioningCountries.find(c => (c.name || '').toLowerCase() === 'india')?._id || undefined,
                level_id: provisioningLevel,
                panels: selectedPanels,
                department_name: deptObj ? deptObj.name : undefined
            };

            await axios[method](url, userPayload, { headers: authHeaderObj() });
            dispatch(setAlert({ type: "success", message: editId ? "Identity updated successfully" : "Identity provisioned successfully" }));
            const defCountry = provisioningCountries.find(c => (c.name || '').toLowerCase() === 'india' || c.phone_code === '+91' || c.phone_code === '91') || provisioningCountries[0];
            setProvisioningFormData({
                name: "", email: "", country_id: defCountry?.id || defCountry?._id || "", phone_code: defCountry?.phone_code || "+91", phone: "",
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

    // Dynamically cross-reference live warehouse staff assignments with live users directory (zero static data)
    const { warehouseAssignedStaffRows, userWarehouseAssignmentsMap } = useMemo(() => {
        const whRows = [];
        const uMap = new Map();

        const addToUserMap = (userId, whInfo) => {
            if (!userId) return;
            const key = String(userId);
            if (!uMap.has(key)) uMap.set(key, []);
            const list = uMap.get(key);
            const existingWh = list.find(item => String(item.warehouseId) === String(whInfo.warehouseId));
            if (existingWh) {
                if (whInfo.warehouseRole && !existingWh.warehouseRoles.includes(whInfo.warehouseRole)) {
                    existingWh.warehouseRoles.push(whInfo.warehouseRole);
                }
            } else {
                list.push({
                    warehouseId: whInfo.warehouseId,
                    warehouseName: whInfo.warehouseName,
                    warehouseCode: whInfo.warehouseCode,
                    warehouseRoles: whInfo.warehouseRole ? [whInfo.warehouseRole] : []
                });
            }
        };

        (liveWarehouses || []).forEach(wh => {
            const whId = String(wh._id || wh.id || "");
            const whName = wh.name || wh.warehouse_name || "Unnamed Warehouse";
            const whCode = wh.warehouse_code || "";
            const memberMap = new Map();

            const upsertMember = (key, memberData, assignedSlotRole) => {
                if (!key) return;
                if (memberMap.has(key)) {
                    const existing = memberMap.get(key);
                    if (assignedSlotRole && !existing.warehouseRoles.includes(assignedSlotRole)) {
                        existing.warehouseRoles.push(assignedSlotRole);
                    }
                } else {
                    memberMap.set(key, {
                        id: memberData.id || key,
                        name: memberData.name || "Assigned Staff",
                        email: memberData.email || "",
                        phone: memberData.phone || "",
                        phoneCode: memberData.phone_code || "+91",
                        warehouseRoles: assignedSlotRole ? [assignedSlotRole] : [],
                        systemRole: memberData.role_name || assignedSlotRole || "Staff",
                        departmentId: memberData.department_id ? String(memberData.department_id) : "",
                        departmentName: memberData.department_name || "",
                        levelName: memberData.level_name || "",
                        isActive: memberData.is_active !== undefined ? Boolean(memberData.is_active) : true,
                        userObj: memberData.userObj || null
                    });
                }
                if (memberData.userIdForMap) {
                    addToUserMap(memberData.userIdForMap, {
                        warehouseId: whId,
                        warehouseName: whName,
                        warehouseCode: whCode,
                        warehouseRole: assignedSlotRole
                    });
                }
            };

            // 1. Warehouse Manager resolution
            const rawMgrId = wh.assigned_staff?.manager_id?._id || wh.assigned_staff?.manager_id || wh.manager?.user_id?._id || wh.manager?.user_id;
            let mgrUser = null;
            if (rawMgrId && String(rawMgrId) !== "null" && String(rawMgrId) !== "undefined") {
                mgrUser = (users || []).find(u => String(u.id || u._id) === String(rawMgrId));
            }
            if (!mgrUser && wh.manager?.email) {
                mgrUser = (users || []).find(u => u.email && u.email.toLowerCase() === wh.manager.email.toLowerCase());
            }
            if (!mgrUser) {
                mgrUser = (users || []).find(u =>
                    u.warehouse_id && String(u.warehouse_id) === whId &&
                    u.role_name && (u.role_name.toLowerCase().includes("manager") || u.role_name.toLowerCase().includes("incharge"))
                );
            }

            if (mgrUser) {
                const uid = String(mgrUser.id || mgrUser._id);
                upsertMember(uid, { ...mgrUser, userIdForMap: uid, userObj: mgrUser }, "Warehouse Manager");
            } else if (wh.manager && (wh.manager.name || wh.manager.email)) {
                const fallbackKey = wh.manager.user_id ? String(wh.manager.user_id) : `mgr_${whId}_${wh.manager.email || wh.manager.name}`;
                upsertMember(fallbackKey, {
                    id: fallbackKey,
                    name: wh.manager.name || "Warehouse Manager",
                    email: wh.manager.email || "",
                    phone: wh.manager.phone || "",
                    phone_code: wh.manager.phone_code || "+91",
                    role_name: "Warehouse Manager",
                    department_name: "Warehouse & Delivery Management",
                    level_name: "Warehouse",
                    is_active: 1,
                    userIdForMap: wh.manager.user_id ? String(wh.manager.user_id) : null
                }, "Warehouse Manager");
            }

            // 2. Accountant resolution
            const rawAccId = wh.assigned_staff?.accountant_id?._id || wh.assigned_staff?.accountant_id;
            let accUser = null;
            if (rawAccId && String(rawAccId) !== "null" && String(rawAccId) !== "undefined") {
                accUser = (users || []).find(u => String(u.id || u._id) === String(rawAccId));
            }
            if (!accUser) {
                accUser = (users || []).find(u =>
                    u.warehouse_id && String(u.warehouse_id) === whId &&
                    u.role_name && (u.role_name.toLowerCase().includes("account") || u.role_name.toLowerCase().includes("billing") || u.role_name.toLowerCase().includes("finance"))
                );
            }

            if (accUser) {
                const uid = String(accUser.id || accUser._id);
                upsertMember(uid, { ...accUser, userIdForMap: uid, userObj: accUser }, "Accountant");
            }

            // 3. Additional warehouse-linked users (assigned_staff_users, u.warehouse_id, or u.scope_ids)
            (wh.assigned_staff_users || []).forEach(staffRef => {
                const sid = String(staffRef?._id || staffRef?.id || staffRef || "");
                if (!sid || sid === "null" || sid === "undefined") return;
                const foundU = (users || []).find(u => String(u.id || u._id) === sid);
                if (foundU && !memberMap.has(sid)) {
                    upsertMember(sid, { ...foundU, userIdForMap: sid, userObj: foundU }, foundU.role_name || "Assigned Staff");
                }
            });

            (users || []).forEach(u => {
                const uid = String(u.id || u._id);
                const matchesById = u.warehouse_id && String(u.warehouse_id) === whId;
                const matchesByName = !u.warehouse_id && u.warehouse_name && u.warehouse_name.trim().toLowerCase() === whName.trim().toLowerCase();
                const matchesByScope = Array.isArray(u.scope_ids) && whId && u.scope_ids.map(String).includes(whId);
                if ((matchesById || matchesByName || matchesByScope) && !memberMap.has(uid)) {
                    upsertMember(uid, { ...u, userIdForMap: uid, userObj: u }, u.role_name || "Warehouse Staff");
                }
            });

            const assignedMembers = Array.from(memberMap.values());
            if (assignedMembers.length > 0) {
                const hasMgr = Boolean(wh.assigned_staff?.manager_id || (wh.manager && (wh.manager.user_id || wh.manager.name)) || assignedMembers.some(m => m.warehouseRoles.includes("Warehouse Manager")));
                const hasAcc = Boolean(wh.assigned_staff?.accountant_id || assignedMembers.some(m => m.warehouseRoles.includes("Accountant")));
                whRows.push({
                    warehouse: wh,
                    warehouseId: whId,
                    warehouseName: whName,
                    warehouseCode: whCode,
                    stateName: wh.state_name || wh.state || "",
                    location: wh.location || wh.district_name || "",
                    fulfillmentStates: wh.fulfillment_states || [],
                    assignedMembers,
                    hasManager: hasMgr,
                    hasAccountant: hasAcc,
                    isFullyStaffed: Boolean(hasMgr && hasAcc)
                });
            }
        });

        // Also preserve direct u.warehouse_id / u.warehouse_name assignments if warehouse record wasn't matched
        (users || []).forEach(u => {
            const uid = String(u.id || u._id);
            if ((u.warehouse_id || u.warehouse_name) && !uMap.has(uid)) {
                addToUserMap(uid, {
                    warehouseId: u.warehouse_id ? String(u.warehouse_id) : u.warehouse_name,
                    warehouseName: u.warehouse_name || "Assigned Warehouse",
                    warehouseCode: "",
                    warehouseRole: u.role_name || "Warehouse Staff"
                });
            }
        });

        return { warehouseAssignedStaffRows: whRows, userWarehouseAssignmentsMap: uMap };
    }, [liveWarehouses, users]);

    const doesUserMatchOverviewFilters = useCallback((u) => {
        const search = overviewSearch.trim().toLowerCase();
        const uid = String(u.id || u._id || "");
        const userWhList = userWarehouseAssignmentsMap.get(uid) || [];

        const matchesSearch = !search ||
            (u.name && u.name.toLowerCase().includes(search)) ||
            (u.email && u.email.toLowerCase().includes(search)) ||
            (u.role_name && u.role_name.toLowerCase().includes(search)) ||
            (u.department_name && u.department_name.toLowerCase().includes(search)) ||
            (u.level_name && u.level_name.toLowerCase().includes(search)) ||
            userWhList.some(uw =>
                (uw.warehouseName && uw.warehouseName.toLowerCase().includes(search)) ||
                (uw.warehouseCode && uw.warehouseCode.toLowerCase().includes(search)) ||
                uw.warehouseRoles.some(r => r.toLowerCase().includes(search))
            );

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
            String(u.warehouse_id || "") === String(overviewFilters.warehouse) ||
            (u.warehouse_name && u.warehouse_name.toLowerCase().includes(overviewFilters.warehouse.toLowerCase())) ||
            userWhList.some(uw =>
                String(uw.warehouseId) === String(overviewFilters.warehouse) ||
                (uw.warehouseName && uw.warehouseName.toLowerCase() === String(overviewFilters.warehouse).toLowerCase())
            );

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
    }, [overviewSearch, overviewFilters, allPanels, userWarehouseAssignmentsMap]);

    const filteredUsers = useMemo(() => {
        return users.filter(doesUserMatchOverviewFilters);
    }, [users, doesUserMatchOverviewFilters]);

    const unstaffedWarehouses = useMemo(() => {
        return liveWarehouses.filter(w => {
            const hasMgr = Boolean(w.assigned_staff?.manager_id || (w.manager && (w.manager.user_id || w.manager.name)));
            const hasAcc = Boolean(w.assigned_staff?.accountant_id);
            return !hasMgr || !hasAcc || !w.is_staffed;
        });
    }, [liveWarehouses]);

    const resolveAssignedStaffForWarehouse = useCallback((wh, usersList = []) => {
        if (!wh) return { managerId: "", accountantId: "" };
        const whId = String(wh._id || wh.id || "");

        // 1. Resolve Manager ID (ONLY if legitimately assigned to this specific warehouse)
        let managerId = "";
        const rawMgrId = wh.assigned_staff?.manager_id?._id || wh.assigned_staff?.manager_id || wh.manager?.user_id?._id || wh.manager?.user_id;
        if (rawMgrId && String(rawMgrId) !== "null" && String(rawMgrId) !== "undefined") {
            managerId = String(rawMgrId);
        } else if (wh.manager?.email && Array.isArray(usersList) && usersList.length > 0) {
            const matchedByEmail = usersList.find(u => u.email && u.email.toLowerCase() === wh.manager.email.toLowerCase());
            if (matchedByEmail) {
                managerId = String(matchedByEmail.id || matchedByEmail._id);
            }
        } else if (Array.isArray(usersList) && usersList.length > 0) {
            // Check if any user in live directory is assigned to this warehouse specifically as manager
            const explicitWhMgr = usersList.find(u => 
                u.warehouse_id && String(u.warehouse_id) === whId &&
                (u.role_name && (u.role_name.toLowerCase().includes("manager") || u.role_name.toLowerCase().includes("incharge")))
            );
            if (explicitWhMgr) {
                managerId = String(explicitWhMgr.id || explicitWhMgr._id);
            }
        }

        // 2. Resolve Accountant ID (ONLY if legitimately assigned to this specific warehouse)
        let accountantId = "";
        const rawAccId = wh.assigned_staff?.accountant_id?._id || wh.assigned_staff?.accountant_id;
        if (rawAccId && String(rawAccId) !== "null" && String(rawAccId) !== "undefined") {
            accountantId = String(rawAccId);
        } else if (Array.isArray(usersList) && usersList.length > 0) {
            // Check if any user in live directory is assigned to this warehouse specifically as accountant
            const explicitWhAcc = usersList.find(u => 
                u.warehouse_id && String(u.warehouse_id) === whId &&
                (u.role_name && (u.role_name.toLowerCase().includes("account") || u.role_name.toLowerCase().includes("billing") || u.role_name.toLowerCase().includes("finance")))
            );
            if (explicitWhAcc) {
                accountantId = String(explicitWhAcc.id || explicitWhAcc._id);
            }
        }

        return { managerId, accountantId };
    }, []);

    const getServicedClustersForWarehouse = useCallback((wh) => {
        if (!wh) return [];
        const whId = String(wh._id || wh.id || '');
        const whCode = (wh.warehouse_code || '').trim().toLowerCase();
        const whName = (wh.name || wh.warehouse_name || '').trim().toLowerCase();

        // 1. Direct cluster objects attached to warehouse from available-warehouses API
        if (Array.isArray(wh.serviced_clusters) && wh.serviced_clusters.length > 0) {
            return wh.serviced_clusters;
        }

        // 2. Check live dynamic mappings from Warehouse Cluster Routing (/solarshop/cluster-routing/mappings)
        const foundMapping = (warehouseMappings || []).find(m => 
            (m.warehouse_id && String(m.warehouse_id) === whId) ||
            (m.warehouse_code && m.warehouse_code.trim().toLowerCase() === whCode) ||
            (m.warehouse_name && m.warehouse_name.trim().toLowerCase() === whName)
        );

        if (foundMapping) {
            if (Array.isArray(foundMapping.franchise_clusters) && foundMapping.franchise_clusters.length > 0) {
                return foundMapping.franchise_clusters;
            }
            if (Array.isArray(foundMapping.franchise_cluster_ids) && foundMapping.franchise_cluster_ids.length > 0) {
                const ids = foundMapping.franchise_cluster_ids.map(String);
                const matched = (liveClusters || []).filter(c => ids.includes(String(c._id || c.id)));
                if (matched.length > 0) return matched;
                return ids.map(id => ({ _id: id, id, cluster_id: id, cluster_name: `Cluster (${id.slice(-4)})`, name: `Cluster (${id.slice(-4)})` }));
            }
            if (Array.isArray(foundMapping.states) && foundMapping.states.length > 0) {
                const mapStates = foundMapping.states.map(s => (s || '').trim().toLowerCase());
                const stateMatched = (liveClusters || []).filter(c => mapStates.includes((c.state_name || '').trim().toLowerCase()));
                if (stateMatched.length > 0) return stateMatched;
                return foundMapping.states.map(s => ({ _id: s, id: s, cluster_id: s, cluster_name: `${s} Cluster Network`, name: `${s} Cluster Network` }));
            }
        }

        // 3. Check wh.serviced_cluster_ids from available-warehouses
        if (Array.isArray(wh.serviced_cluster_ids) && wh.serviced_cluster_ids.length > 0) {
            const ids = wh.serviced_cluster_ids.map(String);
            const matched = (liveClusters || []).filter(c => ids.includes(String(c._id || c.id)));
            if (matched.length > 0) return matched;
            return ids.map(id => ({ _id: id, id, cluster_id: id, cluster_name: `Cluster (${id.slice(-4)})`, name: `Cluster (${id.slice(-4)})` }));
        }

        // 4. Check wh.mapped_clusters_count from available-warehouses
        if (wh.mapped_clusters_count && wh.mapped_clusters_count > 0) {
            return [{
                _id: 'mapped_' + whId,
                id: 'mapped_' + whId,
                cluster_id: 'mapped_' + whId,
                cluster_name: `${wh.mapped_clusters_count} Active Franchise Clusters`,
                name: `${wh.mapped_clusters_count} Active Franchise Clusters`
            }];
        }

        // 5. Check fulfillment states / states coverage
        const states = [
            ...(Array.isArray(wh.fulfillment_states) ? wh.fulfillment_states : []),
            ...(Array.isArray(foundMapping?.states) ? foundMapping.states : []),
            ...(wh.state_name ? [wh.state_name] : []),
            ...(wh.state ? [wh.state] : [])
        ].map(s => (s || '').trim().toLowerCase()).filter(Boolean);

        if (states.length > 0) {
            const stateMatched = (liveClusters || []).filter(c => {
                const cState = (c.state_name || '').trim().toLowerCase();
                return states.includes(cState);
            });
            if (stateMatched.length > 0) return stateMatched;
        }

        return [];
    }, [liveClusters, warehouseMappings]);

    const lastInitializedWhIdRef = useRef(null);
    const prevUsersCountRef = useRef(0);

    const handleQuickAssignWarehouse = (wh) => {
        // Validation: Cannot assign staff if warehouse has no clusters created/assigned
        const clusters = getServicedClustersForWarehouse(wh);
        if (!clusters || clusters.length === 0) {
            const whName = wh.name || wh.warehouse_name || "this warehouse";
            setClusterRequiredPopup({
                warehouseName: whName,
                warehouseId: wh._id || wh.id
            });
            dispatch(setAlert({
                type: "error",
                message: `First assign clusters to ${whName} before designating staff!`
            }));
            return;
        }

        setEditId(null);
        setProvisioningMode("existing");
        const whId = String(wh._id || wh.id);
        const whState = wh.state_name || wh.state || "";
        lastInitializedWhIdRef.current = whId;
        setAssignedWarehouseId(whId);
        setAssignedStateName(whState);
        const { managerId, accountantId } = resolveAssignedStaffForWarehouse(wh, users);
        setSelectedWarehouseManagerId(managerId || "");
        setSelectedWarehouseAccountantId(accountantId || "");
        setActiveTab("add");
    };

    const selectedWarehouseObj = useMemo(() => {
        if (!assignedWarehouseId) return null;
        return liveWarehouses.find(w => String(w._id || w.id) === String(assignedWarehouseId));
    }, [assignedWarehouseId, liveWarehouses]);

    useEffect(() => {
        if (!assignedWarehouseId) {
            lastInitializedWhIdRef.current = null;
            setSelectedWarehouseManagerId("");
            setSelectedWarehouseAccountantId("");
            setAssignedStateName("");
            return;
        }

        const isNewWarehouse = lastInitializedWhIdRef.current !== assignedWarehouseId;
        const usersJustLoaded = prevUsersCountRef.current === 0 && users.length > 0;
        prevUsersCountRef.current = users.length;

        if (selectedWarehouseObj && (isNewWarehouse || usersJustLoaded)) {
            lastInitializedWhIdRef.current = assignedWarehouseId;
            const { managerId, accountantId } = resolveAssignedStaffForWarehouse(selectedWarehouseObj, users);
            // Strictly set to assigned ID if present, or blank "" if not assigned
            setSelectedWarehouseManagerId(managerId || "");
            setSelectedWarehouseAccountantId(accountantId || "");
            setAssignedStateName(selectedWarehouseObj.state_name || selectedWarehouseObj.state || "");
        }
    }, [assignedWarehouseId, selectedWarehouseObj, users, resolveAssignedStaffForWarehouse]);

    const servicedClustersForSelectedWh = useMemo(() => {
        if (!selectedWarehouseObj) return [];
        return getServicedClustersForWarehouse(selectedWarehouseObj);
    }, [selectedWarehouseObj, getServicedClustersForWarehouse]);

    const filteredWarehouseStaffRows = useMemo(() => {
        const search = overviewSearch.trim().toLowerCase();
        return warehouseAssignedStaffRows
            .map(row => ({
                ...row,
                servicedClusters: getServicedClustersForWarehouse(row.warehouse)
            }))
            .filter(row => {
                const matchesWhFilter = !overviewFilters.warehouse ||
                    row.warehouseId === String(overviewFilters.warehouse) ||
                    row.warehouseName.toLowerCase().includes(String(overviewFilters.warehouse).toLowerCase());

                const matchesStateFilter = !overviewFilters.state ||
                    row.stateName.toLowerCase() === overviewFilters.state.toLowerCase() ||
                    row.fulfillmentStates.some(s => String(s).toLowerCase() === overviewFilters.state.toLowerCase()) ||
                    row.servicedClusters.some(c => (c.state_name || "").toLowerCase() === overviewFilters.state.toLowerCase());

                const matchesClusterFilter = !overviewFilters.cluster ||
                    row.servicedClusters.some(c =>
                        String(c._id || c.id || c.cluster_id) === String(overviewFilters.cluster) ||
                        (c.cluster_name || c.name || "").toLowerCase().includes(String(overviewFilters.cluster).toLowerCase())
                    );

                const matchesStatusFilter = overviewFilters.status === "" ||
                    row.assignedMembers.some(m => String(m.isActive ? 1 : 0) === overviewFilters.status);

                const matchesDeptFilter = !overviewFilters.department ||
                    row.assignedMembers.some(m =>
                        m.departmentId === String(overviewFilters.department) ||
                        (m.departmentName && m.departmentName.toLowerCase().includes(String(overviewFilters.department).toLowerCase()))
                    );

                const matchesSearch = !search ||
                    row.warehouseName.toLowerCase().includes(search) ||
                    row.warehouseCode.toLowerCase().includes(search) ||
                    row.stateName.toLowerCase().includes(search) ||
                    row.location.toLowerCase().includes(search) ||
                    row.assignedMembers.some(m =>
                        (m.name && m.name.toLowerCase().includes(search)) ||
                        (m.email && m.email.toLowerCase().includes(search)) ||
                        (m.systemRole && m.systemRole.toLowerCase().includes(search)) ||
                        m.warehouseRoles.some(r => r.toLowerCase().includes(search))
                    );

                return matchesWhFilter && matchesStateFilter && matchesClusterFilter && matchesStatusFilter && matchesDeptFilter && matchesSearch;
            });
    }, [warehouseAssignedStaffRows, getServicedClustersForWarehouse, overviewSearch, overviewFilters]);

    const unstaffedClusters = useMemo(() => {
        return liveClusters.filter(c => (!c.assigned_staff_users || c.assigned_staff_users.length === 0) || c.staffing_status === 'unassigned');
    }, [liveClusters]);

    const handleQuickAssignCluster = (clu) => {
        setEditId(null);
        setProvisioningMode("existing");
        setSelectedExistingUserId("");
        const cluId = String(clu._id || clu.id);
        const cluState = clu.state_name || "";
        setAssignedClusterId(cluId);
        setAssignedStateName(cluState);
        const matchingWh = findWarehouseForCluster(clu, liveWarehouses);
        if (matchingWh) setAssignedWarehouseId(matchingWh._id || matchingWh.id);
        else setAssignedWarehouseId("");
        setActiveTab("add");
    };

    // State filter removed as per user instruction: All staff members are available for cluster assignment
    const stateFilteredExistingUsers = useMemo(() => {
        return users;
    }, [users]);

    const filteredDepartmentsOptions = useMemo(() => {
        // Consolidate Delivery Management and Warehouse Management into single "Warehouse & Delivery Management"
        const unified = [];
        let mergedWarehouseId = null;
        const seenNames = new Set();

        departments.forEach(d => {
            const nameLower = (d.name || "").toLowerCase().trim();
            if (nameLower.includes("warehouse") || nameLower.includes("deliver")) {
                if (!mergedWarehouseId) {
                    mergedWarehouseId = String(d.id || d._id);
                    unified.push({ id: mergedWarehouseId, name: "Warehouse & Delivery Management" });
                    seenNames.add("warehouse & delivery management");
                }
            } else if (!seenNames.has(nameLower)) {
                seenNames.add(nameLower);
                unified.push({ id: String(d.id || d._id), name: d.name });
            }
        });

        // Ensure standard departments exist
        const STANDARD_DEPTS = [
            { name: "Super Admin", id: "core_super_admin" },
            { name: "Accounts & Finance", id: "core_accounts_finance" },
            { name: "Warehouse & Delivery Management", id: mergedWarehouseId || "core_warehouse_delivery" },
            { name: "Operations", id: "core_operations" }
        ];

        STANDARD_DEPTS.forEach(core => {
            if (!unified.some(d => d.name.toLowerCase() === core.name.toLowerCase())) {
                unified.push({ id: core.id, name: core.name });
            }
        });

        return unified.map(d => ({ value: String(d.id), text: d.name }));
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
        } else if (deptName.includes("deliver") || deptName.includes("warehouse")) {
            return [
                { id: "role_wh_mgr", name: "Warehouse Manager" },
                { id: "role_del_mgr", name: "Delivery Operations Lead" },
                { id: "role_wh_inv", name: "Inventory & Dispatch Supervisor" },
                { id: "role_del_fleet", name: "Fleet & Logistics Lead" },
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
            return !assignedWarehouseId || (!selectedWarehouseManagerId && !selectedWarehouseAccountantId) || servicedClustersForSelectedWh.length === 0;
        }
        // New user mode (Pure Identity Creation)
        if (!provisioningFormData.name?.trim() || !provisioningFormData.email?.trim() || !provisioningFormData.role_id) {
            return true;
        }
        return false;
    }, [provisioningAdding, provisioningMode, assignedWarehouseId, selectedWarehouseManagerId, selectedWarehouseAccountantId, provisioningFormData.name, provisioningFormData.email, provisioningFormData.role_id]);

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
                                    const defCountry = provisioningCountries.find(c => (c.name || '').toLowerCase() === 'india' || c.phone_code === '+91' || c.phone_code === '91') || provisioningCountries[0];
                                    setProvisioningFormData({
                                        name: "", email: "", country_id: defCountry?.id || defCountry?._id || "", phone_code: defCountry?.phone_code || "+91", phone: "",
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
                        {/* Unstaffed Warehouses Alert Banner */}
                        {unstaffedWarehouses.length > 0 && (
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
                                                    {unstaffedWarehouses.length} Regional Warehouse{unstaffedWarehouses.length > 1 ? 's' : ''} Pending Staff Assignment
                                                </h4>
                                            </div>
                                            <p className="text-xs text-text-muted mt-1">
                                                Warehouses require designated handling personnel (Warehouse Manager & Accountant) before dispatch & kit routing can operate. Serviced clusters automatically inherit designated staff.
                                            </p>
                                        </div>
                                    </div>
                                </div>
                                <div className="mt-4 flex flex-wrap gap-2 pt-3 border-t border-amber-200/40">
                                    {unstaffedWarehouses.map(wh => (
                                        <div key={wh._id || wh.id} className="flex items-center gap-2 bg-surface/90 border border-amber-300 rounded-xl px-3 py-1.5 shadow-2xs">
                                            <FaWarehouse className="text-amber-600 shrink-0" size={13} />
                                            <span className="text-xs font-bold text-text-primary">{wh.name || wh.warehouse_name}</span>
                                            <span className="text-[10px] text-text-muted font-medium">({wh.state_name || wh.state || 'All States'})</span>
                                            <span className="text-[9px] font-bold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                                                ⚠️ Pending Staff
                                            </span>
                                            <button
                                                type="button"
                                                onClick={() => handleQuickAssignWarehouse(wh)}
                                                className="ml-1 text-[11px] font-bold text-primary hover:text-primary-hover bg-primary/10 hover:bg-primary/20 px-2.5 py-0.5 rounded-md transition-colors"
                                            >
                                                + Assign Staff
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
                                    <p className="text-[10px] font-black text-amber-600 uppercase tracking-wider">Unstaffed Warehouses</p>
                                    <h3 className="text-2xl font-black text-amber-600 mt-1">{unstaffedWarehouses.length}</h3>
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

                        {/* Section 1: All Created Users & Roles Directory */}
                        <div className="card overflow-hidden border border-border bg-surface shadow-xs">
                            <div className="px-6 py-4 border-b border-border bg-surface-hover/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                <div className="flex items-center gap-3">
                                    <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                                        <HiUsers size={18} />
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <h3 className="text-sm font-black text-text-primary uppercase tracking-wider">
                                                All Created Users & Roles Directory
                                            </h3>
                                            <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                                                {filteredUsers.length} / {users.length} Users
                                            </span>
                                        </div>
                                        <p className="text-[11px] text-text-muted mt-0.5">
                                            Complete live list of all created accounts, assigned system roles, departments, warehouse deployments, and status.
                                        </p>
                                    </div>
                                </div>

                                <div className="flex items-center gap-2 self-start sm:self-center">
                                    <a
                                        href="#warehouse-assigned-users"
                                        className="text-[11px] font-bold text-emerald-700 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors"
                                    >
                                        <FaWarehouse size={12} />
                                        Assigned Warehouses ({filteredWarehouseStaffRows.length})
                                    </a>
                                    <div className="flex p-1 bg-bg rounded-lg border border-border">
                                        <button
                                            type="button"
                                            onClick={() => setDirectoryViewMode("list")}
                                            className={`px-3 py-1 rounded-md text-[11px] font-bold transition-all ${directoryViewMode === "list" ? "bg-primary text-white shadow-xs" : "text-text-muted hover:text-text-primary"}`}
                                        >
                                            All Users List
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setDirectoryViewMode("tree")}
                                            className={`px-3 py-1 rounded-md text-[11px] font-bold transition-all ${directoryViewMode === "tree" ? "bg-primary text-white shadow-xs" : "text-text-muted hover:text-text-primary"}`}
                                        >
                                            Hierarchy Tree
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {loadingUsers ? (
                                <div className="flex flex-col items-center justify-center py-16">
                                    <div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
                                    <p className="mt-3 text-text-muted font-bold text-xs uppercase tracking-widest">Loading Users & Roles...</p>
                                </div>
                            ) : users.length === 0 ? (
                                <div className="p-12 flex flex-col items-center text-center space-y-3">
                                    <div className="w-14 h-14 bg-surface-hover rounded-full flex items-center justify-center text-text-muted/30">
                                        <HiUsers size={34} />
                                    </div>
                                    <h3 className="text-base font-bold text-text-primary uppercase tracking-tight">No Users Found</h3>
                                    <p className="text-xs text-text-muted">Your organizational directory is currently empty.</p>
                                </div>
                            ) : directoryViewMode === "list" ? (
                                filteredUsers.length === 0 ? (
                                    <div className="p-10 flex flex-col items-center text-center space-y-3">
                                        <HiUsers size={32} className="text-text-muted/40" />
                                        <p className="text-sm font-bold text-text-primary">No Matching Users</p>
                                        <p className="text-xs text-text-muted">No users match your current search or filter criteria.</p>
                                    </div>
                                ) : (
                                    <div className="overflow-x-auto custom-scrollbar">
                                        <table className="w-full text-left border-collapse min-w-[900px]">
                                            <thead>
                                                <tr className="bg-surface-hover/60 border-b border-border text-[10px] font-black text-text-muted uppercase tracking-wider">
                                                    <th className="py-3 px-4 w-10">#</th>
                                                    <th className="py-3 px-4">User & Contact</th>
                                                    <th className="py-3 px-4">Role & Department</th>
                                                    <th className="py-3 px-4">Assigned Warehouse(s)</th>
                                                    <th className="py-3 px-4">Scope & Reports To</th>
                                                    <th className="py-3 px-4">Status</th>
                                                    <th className="py-3 px-4 text-right">Actions</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-border/60 text-xs">
                                                {filteredUsers.map((u, idx) => {
                                                    const activeUid = currentUserId || localStorage.getItem("cms_user_id");
                                                    const uid = String(u.id || u._id);
                                                    const isSelf = uid === String(activeUid);
                                                    const assignedWhs = userWarehouseAssignmentsMap.get(uid) || [];
                                                    const initials = (u.name || "U").split(" ").map(p => p[0]).slice(0, 2).join("").toUpperCase();

                                                    return (
                                                        <tr key={uid} className={`hover:bg-surface-hover/50 transition-colors ${isSelf ? "bg-primary/5" : ""}`}>
                                                            <td className="py-3.5 px-4 font-bold text-text-muted">{idx + 1}</td>
                                                            <td className="py-3.5 px-4">
                                                                <div className="flex items-center gap-3">
                                                                    <div className="relative shrink-0">
                                                                        <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary border border-primary/20 flex items-center justify-center font-black text-xs">
                                                                            {initials}
                                                                        </div>
                                                                        <span className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-surface ${u.is_active ? "bg-success" : "bg-text-muted"}`} />
                                                                    </div>
                                                                    <div className="min-w-0">
                                                                        <div className="flex items-center gap-1.5">
                                                                            <span className="font-bold text-text-primary text-sm truncate">{u.name}</span>
                                                                            {isSelf && (
                                                                                <span className="px-1.5 py-0.5 bg-primary text-white text-[9px] font-black uppercase rounded">You</span>
                                                                            )}
                                                                        </div>
                                                                        <div className="text-[11px] text-text-secondary truncate">{u.email}</div>
                                                                        {u.phone && (
                                                                            <div className="text-[10px] text-text-muted">{u.phone_code || "+91"} {u.phone}</div>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            </td>
                                                            <td className="py-3.5 px-4">
                                                                <div className="flex flex-col items-start gap-1">
                                                                    <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                                                                        {u.role_name || "Unassigned Role"}
                                                                    </span>
                                                                    <div className="flex flex-wrap items-center gap-1.5">
                                                                        <span className="text-[10px] font-semibold bg-purple-500/10 text-purple-600 border border-purple-500/20 px-2 py-0.5 rounded">
                                                                            {u.department_name || "General"}
                                                                        </span>
                                                                        {u.level_name && (
                                                                            <span className="text-[10px] font-bold text-text-muted uppercase">
                                                                                • {u.level_name}
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            </td>
                                                            <td className="py-3.5 px-4">
                                                                {assignedWhs.length > 0 ? (
                                                                    <div className="flex flex-col gap-1.5">
                                                                        {assignedWhs.map(whItem => (
                                                                            <div key={whItem.warehouseId} className="inline-flex flex-wrap items-center gap-1.5 bg-blue-500/10 border border-blue-500/20 px-2 py-1 rounded-lg">
                                                                                <FaWarehouse size={10} className="text-blue-600 shrink-0" />
                                                                                <span className="text-[11px] font-bold text-blue-800">{whItem.warehouseName}</span>
                                                                                {whItem.warehouseCode && (
                                                                                    <span className="text-[9px] font-mono text-blue-600">[{whItem.warehouseCode}]</span>
                                                                                )}
                                                                                {whItem.warehouseRoles.length > 0 && (
                                                                                    <span className="text-[9px] font-black bg-white/80 text-blue-700 px-1.5 py-0.5 rounded border border-blue-200">
                                                                                        {whItem.warehouseRoles.join(" & ")}
                                                                                    </span>
                                                                                )}
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                ) : (
                                                                    <span className="text-[11px] text-text-muted italic">Not Warehouse-Bound</span>
                                                                )}
                                                            </td>
                                                            <td className="py-3.5 px-4">
                                                                <div className="flex flex-col gap-1 max-w-[220px]">
                                                                    {u.scope_names && u.scope_names.length > 0 ? (
                                                                        <span className="text-[10px] font-bold text-primary/80 uppercase tracking-wide truncate flex items-center gap-1" title={u.scope_names.join(", ")}>
                                                                            <HiGlobeAlt size={12} className="shrink-0" />
                                                                            {u.scope_names.join(", ")}
                                                                        </span>
                                                                    ) : (
                                                                        <span className="text-[10px] text-text-muted">Global / Unscoped</span>
                                                                    )}
                                                                    {u.parent_user_name && (
                                                                        <span className="text-[10px] text-text-muted flex items-center gap-1 truncate">
                                                                            <HiArrowUp size={10} className="text-primary/50 shrink-0" />
                                                                            Reports to: <b className="text-text-secondary">{u.parent_user_name}</b>
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            </td>
                                                            <td className="py-3.5 px-4">
                                                                <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase ${u.is_active ? "bg-success/10 text-success border border-success/20" : "bg-text-muted/10 text-text-muted border border-border"}`}>
                                                                    <span className={`w-1.5 h-1.5 rounded-full ${u.is_active ? "bg-success" : "bg-text-muted"}`} />
                                                                    {u.is_active ? "Active" : "Inactive"}
                                                                </span>
                                                            </td>
                                                            <td className="py-3.5 px-4 text-right">
                                                                <div className="inline-flex items-center gap-1.5">
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => !isSelf && handleEdit(u)}
                                                                        disabled={isSelf}
                                                                        className={`p-2 rounded-lg border transition-all ${isSelf ? "bg-danger/5 border-danger/10 text-danger/30 cursor-not-allowed" : "bg-surface border-border text-text-muted hover:text-primary hover:border-primary"}`}
                                                                        title={isSelf ? "Protected Record" : "Edit Identity"}
                                                                    >
                                                                        {isSelf ? <HiBan size={14} /> : <HiPencil size={14} />}
                                                                    </button>
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => !isSelf && handleToggleStatus(uid, !!u.is_active)}
                                                                        disabled={isSelf}
                                                                        className={`p-2 rounded-lg border transition-all ${isSelf ? "bg-danger/5 border-danger/10 text-danger/30 cursor-not-allowed" : u.is_active ? "bg-surface border-border text-text-muted hover:text-danger hover:border-danger" : "bg-surface border-border text-text-muted hover:text-success hover:border-success"}`}
                                                                        title={isSelf ? "Protected Record" : (u.is_active ? "Deactivate User" : "Activate User")}
                                                                    >
                                                                        {isSelf ? <HiBan size={14} /> : (u.is_active ? <HiLockOpen size={14} /> : <HiLockClosed size={14} />)}
                                                                    </button>
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    </div>
                                )
                            ) : (
                                <div className="p-4 w-full overflow-x-auto custom-scrollbar">
                                    <div className="space-y-4 min-w-[600px]">
                                        {(() => {
                                            const activeUserId = currentUserId || localStorage.getItem("cms_user_id");
                                            const search = overviewSearch.toLowerCase();
                                            const hasActiveFilters = search || overviewFilters.status || overviewFilters.country || overviewFilters.saasProduct || overviewFilters.panel || overviewFilters.warehouse || overviewFilters.state || overviewFilters.cluster || overviewFilters.department;

                                            const userMap = {};
                                            users.forEach(u => {
                                                const uid = String(u.id || u._id);
                                                userMap[u.id] = {
                                                    ...u,
                                                    assignedWarehouses: userWarehouseAssignmentsMap.get(uid) || [],
                                                    children: [],
                                                    matchesSearch: false,
                                                    shouldShow: !hasActiveFilters
                                                };
                                            });

                                            if (hasActiveFilters) {
                                                users.forEach(u => {
                                                    if (doesUserMatchOverviewFilters(u)) {
                                                        userMap[u.id].matchesSearch = Boolean(search);
                                                        userMap[u.id].shouldShow = true;
                                                        let parentId = u.parent_user_id;
                                                        while (parentId && userMap[parentId]) {
                                                            userMap[parentId].shouldShow = true;
                                                            parentId = userMap[parentId].parent_user_id;
                                                        }
                                                    }
                                                });
                                            }

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
                                                    <div className="p-10 flex flex-col items-center text-center space-y-3">
                                                        <HiUsers size={34} className="text-text-muted/30" />
                                                        <h3 className="text-base font-bold text-text-primary uppercase tracking-tight">No Matching Members</h3>
                                                        <p className="text-xs text-text-muted">No users match your current search criteria in the hierarchy.</p>
                                                    </div>
                                                );
                                            }

                                            return visibleRoots.map(root => (
                                                <UserNode
                                                    key={root.id}
                                                    node={root}
                                                    currentUserId={activeUserId}
                                                    search={search}
                                                    onEdit={handleEdit}
                                                    onToggleStatus={handleToggleStatus}
                                                />
                                            ));
                                        })()}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Section 2: Warehouse-Wise Assigned Users & Roles (Dynamic Live Checklist / Rows) */}
                        <div id="warehouse-assigned-users" className="card overflow-hidden border border-border bg-surface shadow-xs">
                            <div className="px-6 py-4 border-b border-border bg-emerald-500/5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                <div className="flex items-center gap-3">
                                    <div className="w-9 h-9 rounded-xl bg-emerald-500/15 text-emerald-600 flex items-center justify-center shrink-0">
                                        <FaWarehouse size={17} />
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <h3 className="text-sm font-black text-text-primary uppercase tracking-wider">
                                                Warehouse-Wise Assigned Users & Roles
                                            </h3>
                                            <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-700 border border-emerald-500/30">
                                                {filteredWarehouseStaffRows.length} Warehouse{filteredWarehouseStaffRows.length === 1 ? "" : "s"} Assigned
                                            </span>
                                        </div>
                                        <p className="text-[11px] text-text-muted mt-0.5">
                                            Dynamic directory showing every warehouse that has assigned personnel, their designated roles, system roles, and cluster coverage.
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {loadingClusters ? (
                                <div className="flex flex-col items-center justify-center py-12">
                                    <div className="w-8 h-8 border-4 border-emerald-500/20 border-t-emerald-600 rounded-full animate-spin"></div>
                                    <p className="mt-3 text-text-muted font-bold text-xs uppercase tracking-widest">Syncing Warehouse Assignments...</p>
                                </div>
                            ) : filteredWarehouseStaffRows.length === 0 ? (
                                <div className="p-10 flex flex-col items-center text-center space-y-2">
                                    <FaWarehouse size={30} className="text-text-muted/30" />
                                    <p className="text-sm font-bold text-text-primary">No Warehouse User Assignments Found</p>
                                    <p className="text-xs text-text-muted max-w-md">
                                        {warehouseAssignedStaffRows.length === 0
                                            ? "No warehouses have staff assigned yet. Assign staff to pending warehouses from the alert banner above."
                                            : "No assigned warehouses match your active search or filter criteria."}
                                    </p>
                                </div>
                            ) : (
                                <div className="overflow-x-auto custom-scrollbar">
                                    <table className="w-full text-left border-collapse min-w-[850px]">
                                        <thead>
                                            <tr className="bg-surface-hover/60 border-b border-border text-[10px] font-black text-text-muted uppercase tracking-wider">
                                                <th className="py-3 px-4 w-10">#</th>
                                                <th className="py-3 px-4">Regional Warehouse & Coverage</th>
                                                <th className="py-3 px-4">Assigned Users & Their Roles</th>
                                                <th className="py-3 px-4">Staffing Status</th>
                                                <th className="py-3 px-4 text-right">Action</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-border/60 text-xs">
                                            {filteredWarehouseStaffRows.map((row, idx) => (
                                                <tr key={row.warehouseId} className="hover:bg-surface-hover/40 transition-colors align-top">
                                                    <td className="py-4 px-4 font-bold text-text-muted">{idx + 1}</td>
                                                    <td className="py-4 px-4 min-w-[230px]">
                                                        <div className="flex items-start gap-2.5">
                                                            <div className="w-8 h-8 rounded-lg bg-amber-500/15 text-amber-600 flex items-center justify-center shrink-0 mt-0.5">
                                                                <FaWarehouse size={14} />
                                                            </div>
                                                            <div className="space-y-1">
                                                                <div className="flex flex-wrap items-center gap-1.5">
                                                                    <span className="font-black text-text-primary text-sm">{row.warehouseName}</span>
                                                                    {row.warehouseCode && (
                                                                        <span className="text-[10px] font-mono font-bold bg-surface-hover px-1.5 py-0.5 rounded border border-border text-text-secondary">
                                                                            {row.warehouseCode}
                                                                        </span>
                                                                    )}
                                                                </div>
                                                                <div className="text-[11px] text-text-muted flex items-center gap-1">
                                                                    <HiLocationMarker size={12} className="text-primary/60 shrink-0" />
                                                                    <span>
                                                                        {row.fulfillmentStates.length > 0
                                                                            ? row.fulfillmentStates.join(", ")
                                                                            : (row.stateName || row.location || "All States")}
                                                                    </span>
                                                                </div>
                                                                <div className="flex flex-wrap items-center gap-1 pt-0.5">
                                                                    <span className="text-[10px] font-bold bg-primary/10 text-primary px-2 py-0.5 rounded border border-primary/20">
                                                                        {row.servicedClusters.length} Serviced Cluster{row.servicedClusters.length === 1 ? "" : "s"}
                                                                    </span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="py-4 px-4">
                                                        <div className="space-y-2">
                                                            {row.assignedMembers.map((member, mIdx) => (
                                                                <div
                                                                    key={member.id || mIdx}
                                                                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-2.5 rounded-xl bg-bg border border-border/80"
                                                                >
                                                                    <div className="flex items-center gap-2.5 min-w-0">
                                                                        <span className={`w-2 h-2 rounded-full shrink-0 ${member.isActive ? "bg-success" : "bg-text-muted"}`} />
                                                                        <div className="min-w-0">
                                                                            <div className="flex flex-wrap items-center gap-1.5">
                                                                                <span className="font-bold text-text-primary text-xs">{member.name}</span>
                                                                                {member.warehouseRoles.map(wRole => (
                                                                                    <span
                                                                                        key={wRole}
                                                                                        className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-md border ${wRole.toLowerCase().includes("manager")
                                                                                            ? "bg-blue-500/10 text-blue-700 border-blue-500/20"
                                                                                            : wRole.toLowerCase().includes("account")
                                                                                                ? "bg-amber-500/10 text-amber-700 border-amber-500/20"
                                                                                                : "bg-primary/10 text-primary border-primary/20"
                                                                                            }`}
                                                                                    >
                                                                                        {wRole}
                                                                                    </span>
                                                                                ))}
                                                                            </div>
                                                                            <div className="text-[11px] text-text-muted truncate mt-0.5">
                                                                                {member.email}{member.phone ? ` • ${member.phoneCode} ${member.phone}` : ""}
                                                                            </div>
                                                                        </div>
                                                                    </div>

                                                                    <div className="flex flex-wrap items-center gap-1.5 shrink-0">
                                                                        <span className="text-[10px] font-bold bg-purple-500/10 text-purple-700 border border-purple-500/20 px-2 py-0.5 rounded-full">
                                                                            Role: {member.systemRole}
                                                                        </span>
                                                                        {member.departmentName && (
                                                                            <span className="text-[10px] font-semibold bg-surface-hover text-text-secondary border border-border px-2 py-0.5 rounded-full">
                                                                                {member.departmentName}
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            ))}

                                                            {(!row.hasManager || !row.hasAccountant) && (
                                                                <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                                                                    {!row.hasManager && (
                                                                        <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                                                                            ⚠️ Warehouse Manager: Pending
                                                                        </span>
                                                                    )}
                                                                    {!row.hasAccountant && (
                                                                        <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                                                                            ⚠️ Accountant: Pending
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            )}
                                                        </div>
                                                    </td>
                                                    <td className="py-4 px-4 whitespace-nowrap">
                                                        {row.isFullyStaffed ? (
                                                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black uppercase bg-emerald-500/15 text-emerald-700 border border-emerald-500/30">
                                                                <FiCheckCircle size={12} /> Fully Staffed
                                                            </span>
                                                        ) : (
                                                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black uppercase bg-amber-500/15 text-amber-700 border border-amber-500/30">
                                                                <HiExclamation size={12} /> Partial Staff
                                                            </span>
                                                        )}
                                                    </td>
                                                    <td className="py-4 px-4 text-right whitespace-nowrap">
                                                        <button
                                                            type="button"
                                                            onClick={() => handleQuickAssignWarehouse(row.warehouse)}
                                                            className="text-[11px] font-bold text-primary hover:text-white bg-primary/10 hover:bg-primary border border-primary/20 px-3 py-1.5 rounded-lg transition-all"
                                                        >
                                                            Manage Staff
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
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
                                        <FaWarehouse size={15} /> 🏢 Assign Staff to Warehouse
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
                                            {editId ? "Edit Staff Identity" : provisioningMode === "existing" ? "Assign Designated Staff to Regional Warehouse" : "Create New User & Identity Credentials"}
                                        </h2>
                                    </div>
                                    {editId && (
                                        <span className="text-xs bg-amber-500/10 text-amber-600 border border-amber-500/20 font-bold px-2 py-0.5 rounded-md">
                                            Editing User #{editId}
                                        </span>
                                    )}
                                </div>

                                {/* CASE 1: ASSIGN STAFF TO REGIONAL WAREHOUSE */}
                                {provisioningMode === "existing" && !editId && (
                                    <div className="space-y-5">
                                        {/* Step 1: Target Regional Warehouse Selector */}
                                        <div className="p-4 bg-amber-500/10 border-2 border-amber-500/30 rounded-xl space-y-3">
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                    <FaWarehouse className="text-amber-600" size={16} />
                                                    <h3 className="text-xs font-black text-text-primary uppercase tracking-wider">
                                                        Select Target Regional Warehouse
                                                    </h3>
                                                </div>
                                                <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-700">
                                                    {assignedWarehouseId ? "Warehouse Selected" : "Select Warehouse"}
                                                </span>
                                            </div>

                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
                                                <div>
                                                    <div className="flex items-center justify-between mb-1">
                                                        <label className="text-[10px] font-black text-text-muted uppercase tracking-wider block">
                                                            Regional Warehouse *
                                                        </label>
                                                        {assignedWarehouseId && (
                                                            <span className="text-[10px] font-bold text-amber-900 bg-amber-500/20 px-2 py-0.5 rounded flex items-center gap-1">
                                                                <HiLockClosed size={11} /> Locked to Target Warehouse
                                                            </span>
                                                        )}
                                                    </div>
                                                    {assignedWarehouseId ? (
                                                        <div className="relative">
                                                            <input
                                                                type="text"
                                                                readOnly
                                                                value={
                                                                    selectedWarehouseObj
                                                                        ? `${selectedWarehouseObj.name || selectedWarehouseObj.warehouse_name} (${selectedWarehouseObj.state_name || selectedWarehouseObj.state || 'All States'}) [${selectedWarehouseObj.warehouse_code || 'CODE'}]`
                                                                        : "Selected Warehouse"
                                                                }
                                                                className="w-full py-2.5 px-3 pr-8 text-xs bg-surface-hover/80 border border-border/80 rounded-lg text-text-primary font-bold cursor-not-allowed"
                                                            />
                                                            <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-muted">
                                                                <HiLockClosed size={15} />
                                                            </span>
                                                        </div>
                                                    ) : (
                                                        <select
                                                            value={assignedWarehouseId}
                                                            onChange={(e) => {
                                                                const wid = e.target.value;
                                                                if (!wid) {
                                                                    setAssignedWarehouseId("");
                                                                    setAssignedStateName("");
                                                                    setSelectedWarehouseManagerId("");
                                                                    setSelectedWarehouseAccountantId("");
                                                                    return;
                                                                }
                                                                const foundWh = liveWarehouses.find(w => String(w._id || w.id) === String(wid));
                                                                if (foundWh) {
                                                                    const clusters = getServicedClustersForWarehouse(foundWh);
                                                                    if (!clusters || clusters.length === 0) {
                                                                        const whName = foundWh.name || foundWh.warehouse_name || "this warehouse";
                                                                        setClusterRequiredPopup({
                                                                            warehouseName: whName,
                                                                            warehouseId: foundWh._id || foundWh.id
                                                                        });
                                                                        dispatch(setAlert({
                                                                            type: "error",
                                                                            message: `First assign clusters to ${whName} before designating staff!`
                                                                        }));
                                                                        return;
                                                                    }
                                                                    setAssignedWarehouseId(wid);
                                                                    setAssignedStateName(foundWh.state_name || foundWh.state || "");
                                                                    const { managerId, accountantId } = resolveAssignedStaffForWarehouse(foundWh, users);
                                                                    setSelectedWarehouseManagerId(managerId);
                                                                    setSelectedWarehouseAccountantId(accountantId);
                                                                } else {
                                                                    setAssignedStateName("");
                                                                    setSelectedWarehouseManagerId("");
                                                                    setSelectedWarehouseAccountantId("");
                                                                }
                                                            }}
                                                            className="w-full py-2.5 px-3 text-xs bg-surface border border-border rounded-lg text-text-primary focus:outline-none focus:border-primary font-bold"
                                                        >
                                                            <option value="">-- Choose Regional Warehouse ({unstaffedWarehouses.length} Pending) --</option>
                                                            {unstaffedWarehouses.map(w => (
                                                                <option key={w._id || w.id} value={w._id || w.id}>
                                                                    {w.name || w.warehouse_name} ({w.state_name || w.state || 'All States'}) [{w.warehouse_code}] ⚠️ (Pending Staff)
                                                                </option>
                                                            ))}
                                                        </select>
                                                    )}
                                                </div>

                                                <div>
                                                    <label className="text-[10px] font-black text-text-muted uppercase tracking-wider block mb-1">
                                                        Serviced State / Territory
                                                    </label>
                                                    <input
                                                        type="text"
                                                        readOnly
                                                        value={assignedStateName || "Derived from Warehouse"}
                                                        className="w-full py-2.5 px-3 text-xs bg-surface-hover/60 border border-border/80 rounded-lg text-text-primary font-bold cursor-not-allowed"
                                                    />
                                                </div>
                                            </div>

                                            {/* Serviced Clusters Auto-Inheritance Box */}
                                            {selectedWarehouseObj && (
                                                <div className="mt-3 pt-3 border-t border-amber-300/40">
                                                    <div className="flex items-center justify-between mb-2">
                                                        <span className="text-[11px] font-bold text-amber-900 flex items-center gap-1.5">
                                                            <FiCheckCircle className="text-emerald-600" size={14} />
                                                            Serviced Clusters Inheriting Staff ({servicedClustersForSelectedWh.length}):
                                                        </span>
                                                        <span className="text-[10px] text-amber-700 bg-amber-500/10 px-2 py-0.5 rounded font-semibold">
                                                            Automatic Staff Inheritance
                                                        </span>
                                                    </div>
                                                    <div className="flex flex-wrap gap-1.5">
                                                        {servicedClustersForSelectedWh.length > 0 ? (
                                                            servicedClustersForSelectedWh.map(c => (
                                                                <span key={c._id || c.id || c.cluster_id} className="text-[11px] font-semibold bg-white border border-amber-300 px-2 py-0.5 rounded-md text-slate-800 shadow-2xs">
                                                                    {c.cluster_name || c.name || c.cluster_code || 'Cluster'}
                                                                </span>
                                                            ))
                                                        ) : (
                                                            <div className="w-full p-2.5 bg-rose-50 border border-rose-300/80 rounded-lg flex items-start gap-2">
                                                                <FaExclamationTriangle className="text-rose-600 shrink-0 mt-0.5" size={13} />
                                                                <div>
                                                                    <p className="text-xs font-bold text-rose-800">
                                                                        First Assign Clusters to this Warehouse
                                                                    </p>
                                                                    <p className="text-[11px] text-rose-600 mt-0.5">
                                                                        Staff assignment is blocked because this warehouse does not have any active franchise clusters assigned to it yet. Please assign clusters to the warehouse first.
                                                                    </p>
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            )}
                                        </div>

                                        {/* Step 2: 2 Designated Warehouse Staff Roles */}
                                        <div className="p-4 bg-primary/5 border border-primary/20 rounded-xl space-y-4">
                                            <div className="flex items-center justify-between pb-2 border-b border-primary/10">
                                                <label className="text-xs font-black text-primary uppercase tracking-wider block">
                                                    Designate Warehouse Handling Personnel (2 Roles)
                                                </label>
                                                <span className="text-[10px] font-bold text-text-secondary bg-surface px-2.5 py-0.5 rounded-md border border-border shadow-xs">
                                                    Total Staff Available: <b className="text-primary">{users.length}</b>
                                                </span>
                                            </div>

                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                {/* Role 1: Warehouse Manager */}
                                                <div className="p-3 bg-surface rounded-xl border border-border space-y-2">
                                                    <div className="flex items-center justify-between">
                                                        <label className="text-[11px] font-black text-text-primary uppercase tracking-wider flex items-center gap-1.5">
                                                            <HiShieldCheck className="text-primary" size={16} />
                                                            1. Warehouse Manager *
                                                        </label>
                                                        {selectedWarehouseManagerId && (
                                                            <span className="text-[9px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200 flex items-center gap-1">
                                                                <FiCheckCircle size={10} /> Currently Assigned
                                                            </span>
                                                        )}
                                                    </div>
                                                    <p className="text-[10px] text-text-muted">
                                                        Responsible for inventory management, kit inward/outward, and storage oversight.
                                                    </p>
                                                    <select
                                                        value={selectedWarehouseManagerId}
                                                        onChange={(e) => setSelectedWarehouseManagerId(e.target.value)}
                                                        className="w-full py-2 px-2.5 text-xs bg-bg border border-border rounded-lg text-text-primary focus:outline-none focus:border-primary font-bold"
                                                    >
                                                        <option value="">-- Choose Warehouse Manager --</option>
                                                        {selectedWarehouseManagerId && !users.some(u => String(u.id || u._id) === String(selectedWarehouseManagerId)) && (
                                                            <option value={selectedWarehouseManagerId}>
                                                                {selectedWarehouseObj?.manager?.name
                                                                    ? `${selectedWarehouseObj.manager.name} (${selectedWarehouseObj.manager.email || 'Assigned'}) - Current Manager`
                                                                    : "Currently Assigned Manager"}
                                                            </option>
                                                        )}
                                                        {users.map(u => {
                                                            const uid = String(u.id || u._id);
                                                            const isAssigned = String(selectedWarehouseManagerId) === uid;
                                                            return (
                                                                <option key={uid} value={uid}>
                                                                    {u.name} ({u.email}) - {u.role_name || u.department_name || 'Staff'}{isAssigned ? ' ★ (Current Manager)' : ''}
                                                                </option>
                                                            );
                                                        })}
                                                    </select>
                                                </div>

                                                {/* Role 2: Accountant */}
                                                <div className="p-3 bg-surface rounded-xl border border-border space-y-2">
                                                    <div className="flex items-center justify-between">
                                                        <label className="text-[11px] font-black text-text-primary uppercase tracking-wider flex items-center gap-1.5">
                                                            <FiDollarSign className="text-amber-600" size={16} />
                                                            2. Accountant *
                                                        </label>
                                                        {selectedWarehouseAccountantId && (
                                                            <span className="text-[9px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200 flex items-center gap-1">
                                                                <FiCheckCircle size={10} /> Currently Assigned
                                                            </span>
                                                        )}
                                                    </div>
                                                    <p className="text-[10px] text-text-muted">
                                                        Responsible for invoicing, stock reconciliation, billing audits, and cost centre tracking.
                                                    </p>
                                                    <select
                                                        value={selectedWarehouseAccountantId}
                                                        onChange={(e) => setSelectedWarehouseAccountantId(e.target.value)}
                                                        className="w-full py-2 px-2.5 text-xs bg-bg border border-border rounded-lg text-text-primary focus:outline-none focus:border-primary font-bold"
                                                    >
                                                        <option value="">-- Choose Accountant --</option>
                                                        {selectedWarehouseAccountantId && !users.some(u => String(u.id || u._id) === String(selectedWarehouseAccountantId)) && (
                                                            <option value={selectedWarehouseAccountantId}>
                                                                Currently Assigned Accountant
                                                            </option>
                                                        )}
                                                        {users.map(u => {
                                                            const uid = String(u.id || u._id);
                                                            const isAssigned = String(selectedWarehouseAccountantId) === uid;
                                                            return (
                                                                <option key={uid} value={uid}>
                                                                    {u.name} ({u.email}) - {u.role_name || u.department_name || 'Staff'}{isAssigned ? ' ★ (Current Accountant)' : ''}
                                                                </option>
                                                            );
                                                        })}
                                                    </select>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* CASE 2: CREATE NEW USER OR EDIT USER */}
                                {(provisioningMode === "new" || editId) && (
                                    <div className="space-y-6">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div>
                                                <CustomInput
                                                    label="Full Legal Name"
                                                    placeholder="Alexander Pierce"
                                                    value={provisioningFormData.name}
                                                    onChange={e => setProvisioningFormData(p => ({ ...p, name: e.target.value }))}
                                                    leftIcon={<FiUser />}
                                                />
                                            </div>
                                            <div>
                                                <CustomInput
                                                    label="Corporate Email"
                                                    type="email"
                                                    placeholder="alex@solarkits.com"
                                                    value={provisioningFormData.email}
                                                    onChange={e => setProvisioningFormData(p => ({ ...p, email: e.target.value }))}
                                                    leftIcon={<HiMail />}
                                                />
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                                            <div>
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

                                        {/* Helper Banners for Scope Tiers */}
                                        {provisioningLevelName === "global" && (
                                            <div className="p-3 bg-purple-500/10 border border-purple-500/20 rounded-xl flex items-center gap-2.5 text-xs text-purple-700">
                                                <FiShield className="shrink-0 text-purple-600" size={16} />
                                                <span><strong>Global Scope:</strong> Full authority across all geographic jurisdictions, countries, and clusters worldwide.</span>
                                            </div>
                                        )}

                                        {provisioningLevelName === "country" && (
                                            <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-xl flex items-center gap-2.5 text-xs text-blue-700">
                                                <ReactCountryFlag countryCode="IN" svg className="text-base shrink-0" />
                                                <span><strong>Country Scope (India):</strong> By default, this staff member handles operations across the entire country (all states, warehouses & franchisee clusters).</span>
                                            </div>
                                        )}

                                        {provisioningLevelName === "state" && (
                                            <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-center gap-2.5 text-xs text-emerald-700">
                                                <FaWarehouse className="shrink-0 text-emerald-600" size={14} />
                                                <span><strong>State Scope:</strong> {provisioningFormData.state_name ? `By default, this staff member handles operations, clusters and warehouses under ${provisioningFormData.state_name}.` : 'Please select an operating state above.'}</span>
                                            </div>
                                        )}

                                        {provisioningLevelName === "cluster" && (
                                            <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl flex items-center gap-2.5 text-xs text-amber-700">
                                                <HiLocationMarker className="shrink-0 text-amber-600" size={16} />
                                                <span><strong>Cluster Scope:</strong> By default, all districts and territories inside this franchisee cluster are handled by this staff member.</span>
                                            </div>
                                        )}

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

                                        {/* Dynamic Role-Based Access Control (RBAC) Preview Card */}
                                        {provisioningFormData.role_id && (
                                            <div className="p-4 bg-primary/5 border border-primary/20 rounded-xl space-y-3">
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-2">
                                                        <FiShield className="text-primary" size={16} />
                                                        <h4 className="text-xs font-black text-text-primary uppercase tracking-wider">
                                                            Role-Based Access Control (RBAC) Permissions & Panels
                                                        </h4>
                                                    </div>
                                                    {loadingRoleRbac ? (
                                                        <span className="text-[10px] text-primary font-bold animate-pulse">Syncing RBAC config...</span>
                                                    ) : (
                                                        <span className="text-[10px] font-bold text-emerald-600 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                                                            Role Permissions Inherited
                                                        </span>
                                                    )}
                                                </div>

                                                <p className="text-[11px] text-text-muted">
                                                    The portal panels and functional modules below are dynamically inherited from the <strong>{provisioningRoles.find(r => String(r.id || r._id) === String(provisioningFormData.role_id))?.name || 'Selected'}</strong> role as configured in Role-Based Access Control settings.
                                                </p>

                                                {roleRbacDetails && (
                                                    <div className="space-y-3 pt-1">
                                                        {/* Allowed Panels */}
                                                        <div>
                                                            <span className="text-[10px] font-bold uppercase tracking-wider text-text-secondary block mb-1.5">
                                                                Authorized Portal Panels ({roleRbacDetails.panels?.length || 0})
                                                            </span>
                                                            <div className="flex flex-wrap gap-2">
                                                                {roleRbacDetails.panels && roleRbacDetails.panels.length > 0 ? (
                                                                    roleRbacDetails.panels.map(p => (
                                                                        <span key={p.id || p._id} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-surface border border-primary/30 text-primary shadow-xs">
                                                                            <FiGrid size={12} />
                                                                            {p.name}
                                                                        </span>
                                                                    ))
                                                                ) : (
                                                                    <span className="text-xs text-text-muted italic">No specific panels assigned to this role yet.</span>
                                                                )}
                                                            </div>
                                                        </div>

                                                        {/* Allowed Modules */}
                                                        {roleRbacDetails.assigned_modules && roleRbacDetails.assigned_modules.length > 0 && (() => {
                                                            const modulesWithPerms = roleRbacDetails.assigned_modules.map((am, idx) => {
                                                                const modName = am.module_name || am.module_id?.name || am.name || am.module_id?.title || 'Module';
                                                                const actions = [];
                                                                if (am.can_view) actions.push({ label: 'View', color: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30' });
                                                                if (am.can_add) actions.push({ label: 'Add', color: 'bg-blue-500/10 text-blue-600 border-blue-500/30' });
                                                                if (am.can_edit) actions.push({ label: 'Edit', color: 'bg-amber-500/10 text-amber-600 border-amber-500/30' });
                                                                if (am.can_delete) actions.push({ label: 'Delete', color: 'bg-rose-500/10 text-rose-600 border-rose-500/30' });
                                                                if (am.actions && Array.isArray(am.actions)) {
                                                                    am.actions.forEach(act => {
                                                                        const actStr = String(act);
                                                                        if (!actions.some(a => a.label.toLowerCase() === actStr.toLowerCase())) {
                                                                            actions.push({ label: actStr, color: 'bg-primary/10 text-primary border-primary/30' });
                                                                        }
                                                                    });
                                                                }
                                                                return {
                                                                    ...am,
                                                                    key: am.id || am._id || idx,
                                                                    displayName: modName,
                                                                    actionsList: actions,
                                                                    hasAnyPermission: actions.length > 0
                                                                };
                                                            });

                                                            const activeModules = modulesWithPerms.filter(m => m.hasAnyPermission || roleRbacDetails.name === 'Super Admin');

                                                            return (
                                                                <div className="space-y-2">
                                                                    <div className="flex items-center justify-between">
                                                                        <span className="text-[10px] font-bold uppercase tracking-wider text-text-secondary block">
                                                                            Permitted Functional Modules ({activeModules.length})
                                                                        </span>
                                                                        <span className="text-[10px] text-text-muted">
                                                                            Configured in Role-Based Access Control
                                                                        </span>
                                                                    </div>
                                                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 max-h-96 overflow-y-auto pr-1">
                                                                        {activeModules.map((am) => (
                                                                            <div key={am.key} className="p-2.5 rounded-xl bg-surface border border-border/80 shadow-xs flex items-center justify-between gap-2 text-xs hover:border-primary/40 transition-colors">
                                                                                <span className="font-semibold text-text-primary truncate" title={am.displayName}>
                                                                                    {am.displayName}
                                                                                </span>
                                                                                <div className="flex items-center gap-1 shrink-0">
                                                                                    {am.actionsList.map(act => (
                                                                                        <span
                                                                                            key={act.label}
                                                                                            className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded-md border ${act.color}`}
                                                                                        >
                                                                                            {act.label}
                                                                                        </span>
                                                                                    ))}
                                                                                </div>
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                </div>
                                                            );
                                                        })()}
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                )}

                                    {/* Primary Action Button directly inside Identity Credentials Form */}
                                    <div className="pt-6 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-4 bg-primary/5 p-4 rounded-xl border border-primary/20 shadow-xs">
                                        <div>
                                            <p className="font-black text-text-primary uppercase tracking-wider text-xs">
                                                {editId ? "Ready to Update Identity" : provisioningMode === "existing" ? "Ready to Assign Staff to Warehouse" : "Ready to Authorize & Add User"}
                                            </p>
                                            <p className="text-text-muted text-[11px] mt-0.5">
                                                {provisioningMode === "existing"
                                                    ? "Click the button to link the designated manager and accountant to the warehouse. Serviced clusters will automatically inherit this staff."
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
                                            {editId ? "✓ Update Identity" : provisioningMode === "existing" ? "✓ Assign Staff to Warehouse" : "✓ Authorize & Add User"}
                                        </Button>
                                    </div>
                                </div>

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
                                                const defCountry = provisioningCountries.find(c => (c.name || '').toLowerCase() === 'india' || c.phone_code === '+91' || c.phone_code === '91') || provisioningCountries[0];
                                                setProvisioningFormData({
                                                    name: "", email: "", country_id: defCountry?.id || defCountry?._id || "", phone_code: defCountry?.phone_code || "+91", phone: "",
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
                                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all duration-500 border ${assignedWarehouseId
                                                ? "bg-emerald-500/10 border-emerald-500 text-emerald-500 shadow-sm shadow-emerald-500/20"
                                                : "bg-surface-hover border-border text-text-muted"
                                            }`}>
                                            <FaWarehouse size={16} />
                                        </div>
                                        <div className="flex flex-col">
                                            <p className={`text-xs font-bold uppercase tracking-tight ${assignedWarehouseId ? "text-text-primary" : "text-text-muted"}`}>Warehouse Deployment</p>
                                            <p className="text-[10px] text-text-muted font-medium">
                                                {assignedWarehouseId
                                                    ? (liveWarehouses.find(w => String(w._id || w.id) === String(assignedWarehouseId))?.name || "Assigned Warehouse")
                                                    : "No Warehouse Bound"}
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
                                        {editId ? "Update Identity" : provisioningMode === "existing" ? "✓ Assign Staff to Warehouse" : "✓ Authorize & Add User"}
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

                {/* Cluster Required Alert Modal */}
                <ConfirmationPopup
                    isOpen={!!clusterRequiredPopup}
                    title="First Assign Clusters to Warehouse"
                    message={`Cannot assign staff yet. Please first assign/map franchise clusters to "${clusterRequiredPopup?.warehouseName || 'this warehouse'}" before designating warehouse personnel.`}
                    onConfirm={() => {
                        setClusterRequiredPopup(null);
                        window.location.href = '/admin-panel/solar-shop/india/order-management-settings/cluster-routing';
                    }}
                    onCancel={() => setClusterRequiredPopup(null)}
                    variant="warning"
                    confirmText="First Assign Clusters"
                    cancelText="Close"
                />

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
    const [isExpanded, setIsExpanded] = useState(true);
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
                                {node.assignedWarehouses && node.assignedWarehouses.length > 0 ? (
                                    node.assignedWarehouses.map(whItem => (
                                        <span key={whItem.warehouseId} className="text-[10px] bg-blue-500/10 text-blue-600 border border-blue-500/20 px-2 py-0.5 rounded-md font-bold flex items-center gap-1">
                                            <FaWarehouse size={9} /> {whItem.warehouseName} ({whItem.warehouseRoles.join(" & ") || "Staff"})
                                        </span>
                                    ))
                                ) : node.warehouse_name ? (
                                    <span className="text-[10px] bg-blue-500/10 text-blue-600 border border-blue-500/20 px-2 py-0.5 rounded-md font-bold flex items-center gap-1">
                                        <FaWarehouse size={9} /> {node.warehouse_name}
                                    </span>
                                ) : null}
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
