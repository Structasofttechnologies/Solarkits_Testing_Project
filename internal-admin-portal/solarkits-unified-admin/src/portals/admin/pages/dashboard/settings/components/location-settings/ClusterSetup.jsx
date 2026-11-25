import { useEffect, useState, useMemo, useRef } from "react";
import { useDispatch } from "react-redux";
import axios from "axios";
import { authHeaderObj } from "@/app/authHeader";
import ReactCountryFlag from "react-country-flag";
import {
  FaGlobeAmericas,
  FaMapMarkerAlt,
  FaPlus,
  FaSpinner,
  FaLayerGroup,
  FaTrash,
  FaEdit,
  FaMap,
  FaBuilding,
  FaChartLine,
  FaCheckCircle,
  FaLink,
  FaRandom,
  FaChevronDown,
  FaChevronUp,
  FaExclamationTriangle,
  FaShieldAlt,
} from 'react-icons/fa';
import { FiClock } from "react-icons/fi";
import { useLoadScript } from "@react-google-maps/api";

import DropdownWithSearchInput from "@/components/DropdownWithSearchInput";
import MultiSelectDropdownWithSearchInput from "@/components/MultiSelectDropdownWithSearchInput";
import { setAlert } from "@/features/alert.slice";
import UniversalMap from "@/components/UniversalMap";
import Loader from "@/components/Loader";
import ConfirmationPopup from "@/components/ConfirmationPopup";
import Dropdown from "@/components/Dropdown";
import Button from "@/components/Button";
import IconButton from "@/components/IconButton";
import CustomInput from "@/components/CustomInput";
import PageHeader from "@/components/PageHeader";
import Pagination from "@/components/Pagination";
import RenderIfPermission, { useHasPermission } from "@/components/PermissionCheck";

export default function ClusterSetup({ moduleUniqueId }) {
  const dispatch = useDispatch();
  const API_URL = import.meta.env.VITE_API_URL;
  const hasAddPermission = useHasPermission({ requiredUniqueId: moduleUniqueId, permission: "add" });
  const hasEditPermission = useHasPermission({ requiredUniqueId: moduleUniqueId, permission: "edit" });

  // Data for dropdowns
  const [countries, setCountries] = useState([]);
  const [states, setStates] = useState([]);
  const [districts, setDistricts] = useState([]);

  // Selected values
  const [selectedCountry, setSelectedCountry] = useState("");
  const [selectedState, setSelectedState] = useState("");
  const [selectedCluster, setSelectedCluster] = useState(null);

  // Form values
  const [newClusterName, setNewClusterName] = useState("");
  const [districtsForNewCluster, setDistrictsForNewCluster] = useState([]);

  // Loading states
  const [loading, setLoading] = useState(false);
  const [loadingStates, setLoadingStates] = useState(false);
  const [loadingDistricts, setLoadingDistricts] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [loadingBoundaries, setLoadingBoundaries] = useState(false);
  const [isDeleting, setIsDeleting] = useState(null);

  // Data
  const [clusters, setClusters] = useState([]);

  // Confirmation popup
  const [confirmationPopup, setConfirmationPopup] = useState({
    isOpen: false,
    title: "",
    message: "",
    mode: "text",
    variant: "danger",
    onConfirm: null,
    cluster: null,
  });

  // Assign district popup state
  const [assignPopup, setAssignPopup] = useState({
    isOpen: false,
    district: null,
    selectedClusterId: "",
    isLoading: false,
  });

  // Reassign district popup state
  const [reassignPopup, setReassignPopup] = useState({
    isOpen: false,
    district: null,
    fromCluster: null,
    toClusterId: "",
    isLoading: false,
  });

  // Map state
  const [districtBoundaries, setDistrictBoundaries] = useState([]);
  const [mapCenter, setMapCenter] = useState({ lat: 20.5937, lng: 78.9629 });
  const activeRequests = useRef(new Set());

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 4;

  // Edit cluster name state
  const [editingClusterId, setEditingClusterId] = useState(null);
  const [editingClusterName, setEditingClusterName] = useState("");
  const [isSavingName, setIsSavingName] = useState(false);

  // Cluster Zones state
  const [zones, setZones] = useState([]);
  const [loadingZones, setLoadingZones] = useState(false);
  const [newZoneName, setNewZoneName] = useState("");
  const [selectedDistrictsForZone, setSelectedDistrictsForZone] = useState([]);
  const [isAddingZone, setIsAddingZone] = useState(false);

  const { isLoaded: isMapLoaded, loadError: mapLoadError } = useLoadScript({
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY,
  });

  // Fetch active countries on mount
  useEffect(() => {
    setLoading(true);
    const fetchCountries = async () => {
      try {
        const response = await axios.get(`${API_URL}/geolocation/active-countries?unique_id=${moduleUniqueId}&req_for=view`, {
          headers: { ...authHeaderObj() },
        });
        const formatted = response.data.countries.map((c) => ({
          text: (
            <span className="flex items-center gap-2">
              <ReactCountryFlag
                countryCode={c.iso2}
                svg
                className="text-xl rounded-sm shadow-sm ring-1 ring-border/20"
              />
              {c.name}
            </span>
          ),
          value: c.id,
          iso2: c.iso2,
        }));
        setCountries(formatted);
      } catch (error) {
        console.error("Error fetching countries:", error);
        dispatch(setAlert({ type: "error", message: "Failed to load countries." }));
      }
      setLoading(false);
    };
    fetchCountries();
  }, [dispatch, API_URL]);

  // Fetch states when a country is selected
  useEffect(() => {
    setStates([]);
    setSelectedState("");
    setDistricts([]);
    setClusters([]);
    setSelectedCluster(null);
    setDistrictBoundaries([]);
    setCurrentPage(1);

    if (!selectedCountry) return;

    const fetchStates = async () => {
      setLoadingStates(true);
      try {
        const res = await axios.post(
          `${API_URL}/geolocation/active-states?unique_id=${moduleUniqueId}&req_for=view`,
          { country_id: selectedCountry },
          { headers: { ...authHeaderObj() } }
        );
        const formatted = res.data.states.map(({ id, name }) => ({
          text: name,
          value: id,
          display: (
            <span className="flex items-center gap-2">
              <div className="w-6 h-6 bg-primary/10 rounded flex items-center justify-center">
                <FaMapMarkerAlt className="text-primary w-3 h-3" />
              </div>
              {name}
            </span>
          )
        }));
        setStates(formatted);
      } catch (err) {
        console.error("Error fetching states:", err);
        dispatch(setAlert({ type: "error", message: "Failed to load states for the selected country." }));
      } finally {
        setLoadingStates(false);
      }
    };

    fetchStates();
  }, [selectedCountry, dispatch, API_URL]);

  // Fetch districts when a state is selected
  useEffect(() => {
    setDistricts([]);
    setDistrictBoundaries([]);
    setClusters([]);
    setSelectedCluster(null);
    setCurrentPage(1);

    if (!selectedState) return;
    const fetchDistricts = async () => {
      setLoadingDistricts(true);
      try {
        const res = await axios.post(
          `${API_URL}/geolocation/active-districts?unique_id=${moduleUniqueId}&req_for=view`,
          { state_id: selectedState },
          { headers: { ...authHeaderObj() } }
        );
        const formatted = res.data.districts.map(d => ({
          ...d,
          text: (
            <span className="flex items-center gap-2">
              <div className="w-6 h-6 bg-amber-500/20 rounded-full flex items-center justify-center">
                <FaBuilding className="text-amber-600 w-3 h-3" />
              </div>
              {d.name}
            </span>
          ),
          value: d.id,
          display: d.name,
        }));
        setDistricts(formatted);
      } catch (err) {
        console.error("Error fetching districts:", err);
        dispatch(setAlert({ type: "error", message: "Failed to load districts for the selected state." }));
      } finally {
        setLoadingDistricts(false);
      }
    };

    const fetchClusters = async () => {
      try {
        const res = await axios.get(
          `${API_URL}/geolocation/clusters/${selectedState}?unique_id=${moduleUniqueId}&req_for=view`,
          { headers: { ...authHeaderObj() } }
        );
        setClusters(res.data.clusters || []);
      } catch (err) {
        console.error("Error fetching clusters:", err);
        dispatch(setAlert({ type: "error", message: "Failed to load clusters." }));
      }
    };

    Promise.all([fetchDistricts(), fetchClusters()]);
  }, [selectedState, dispatch, API_URL]);

  const fetchBoundary = async (districtId, fallbackName = "") => {
    const requestKey = `district-${districtId}`;
    activeRequests.current.add(requestKey);
    setLoadingBoundaries(true);

    try {
      const countryName = countries.find(c => c.value === selectedCountry)?.text.props.children[1];
      const stateName = states.find(s => s.value === selectedState)?.text;

      let districtName = fallbackName;
      if (!districtName && selectedCluster) {
        districtName = selectedCluster.districts.find(d => d.id === districtId)?.name || "";
      }
      if (!districtName) {
        const dObj = districts.find(d => d.value === districtId);
        districtName = dObj?.display || dObj?.text?.props?.children[1] || dObj?.text || "";
      }

      if (!countryName || !stateName || !districtName) {
        console.warn("Could not find names for boundary fetch", { countryName, stateName, districtId, districtName });
        return;
      }

      const res = await axios.post(
        `${API_URL}/geolocation/district?unique_id=${moduleUniqueId}&req_for=view`, {
        district: districtName,
        state: stateName,
        country: countryName,
      },
        { headers: { ...authHeaderObj() } }
      );

      if (!activeRequests.current.has(requestKey)) return;

      const geo = res.data.district;
      if (!geo || !geo.geometry) return;

      setDistrictBoundaries((prev) => {
        const filtered = prev.filter((b) => b.id !== districtId);
        return [
          ...filtered,
          {
            id: districtId,
            level: 'district',
            geometry: geo.geometry,
          },
        ];
      });

    } catch (err) {
      console.error(`❌ Boundary fetch failed for district ${districtId}:`, err);
      dispatch(setAlert({ type: "error", message: "Failed to load district boundaries." }));
    } finally {
      activeRequests.current.delete(requestKey);
      setTimeout(() => {
        if (activeRequests.current.size === 0) {
          setLoadingBoundaries(false);
        }
      }, 300);
    }
  };

  // Handle cluster selection
  useEffect(() => {
    setDistrictBoundaries([]);
    activeRequests.current.forEach(req => activeRequests.current.delete(req));

    if (!selectedCluster) return;

    // Pan to the first district that has coordinates
    const firstWithCoords = selectedCluster.districts.find(d => d.lat && d.lng);
    if (firstWithCoords) {
      setMapCenter({ lat: +firstWithCoords.lat, lng: +firstWithCoords.lng });
    }

    // Fetch boundaries for all districts in the cluster
    selectedCluster.districts.forEach(district => {
      fetchBoundary(district.id, district.name);
    });

  }, [selectedCluster]);

  // Show boundaries for districts selected for a new cluster
  useEffect(() => {
    // If a cluster is already selected for viewing, don't show new cluster boundaries
    if (selectedCluster) return;

    const newDistrictIds = new Set(districtsForNewCluster);

    // Remove boundaries of deselected districts
    setDistrictBoundaries(prev => prev.filter(b => newDistrictIds.has(b.id)));

    // Fetch boundaries for newly selected districts
    districtsForNewCluster.forEach(districtId => {
      const isBoundaryLoaded = districtBoundaries.some(b => b.id === districtId);
      if (!isBoundaryLoaded) {
        fetchBoundary(districtId);
      }
    });

    // If no districts are selected, clear all boundaries
    if (districtsForNewCluster.length === 0) setDistrictBoundaries([]);
  }, [districtsForNewCluster, selectedCluster]);

  // Deselect existing cluster when user starts creating a new one
  useEffect(() => {
    // If user types a name or selects districts for a new cluster, deselect any active cluster.
    if ((newClusterName || districtsForNewCluster.length > 0) && selectedCluster) {
      setSelectedCluster(null);
    }
  }, [newClusterName, districtsForNewCluster]);

  const unassignedDistricts = useMemo(() => {
    const assignedIds = new Set(clusters.flatMap(c => c.districts.map(d => d.id)));
    return districts.filter(d => !assignedIds.has(d.id));
  }, [clusters, districts]);

  const handleAddCluster = async (e) => {
    e.preventDefault();

    if (!newClusterName.trim()) {
      dispatch(setAlert({ type: "warning", message: "Cluster name cannot be empty." }));
      return;
    }
    if (districtsForNewCluster.length === 0) {
      dispatch(setAlert({ type: "warning", message: "Please select at least one district." }));
      return;
    }

    setIsAdding(true);
    try {
      const res = await axios.post(
        `${API_URL}/geolocation/add-cluster?unique_id=${moduleUniqueId}&req_for=add`,
        {
          name: newClusterName.trim(),
          state_id: selectedState,
          district_ids: districtsForNewCluster,
        },
        { headers: { ...authHeaderObj() } }
      );

      // Update clusters list with the new cluster
      setClusters(prev => [...prev, res.data.cluster]);

      // Reset form fields
      setNewClusterName("");
      setDistrictsForNewCluster([]);

      // Show success message
      dispatch(setAlert({
        type: "success",
        message: res.data.message || "Cluster created successfully.",
        duration: 3000
      }));

    } catch (err) {
      dispatch(setAlert({
        type: "error",
        message: err.response?.data?.message || "Failed to add cluster.",
        duration: 4000
      }));
    } finally {
      setIsAdding(false);
    }
  };

  const handleDeleteCluster = (cluster) => {
    // Step 1: Show text confirmation
    setConfirmationPopup({
      isOpen: true,
      title: `Delete Cluster "${cluster.name}"`,
      message: "Are you sure you want to delete this cluster? This action is irreversible.",
      mode: "text",
      variant: "danger",
      confirmText: "Yes, Delete",
      cancelText: "Cancel",
      cluster: cluster,
      onConfirm: async () => {
        // Step 2: Request OTP
        setIsDeleting(cluster.id);
        try {
          await axios.get(`${API_URL}/geolocation/delete-cluster-otp/${cluster.id}/${selectedState}?unique_id=${moduleUniqueId}&req_for=delete`, {
            headers: { ...authHeaderObj() },
          });

          dispatch(setAlert({
            type: "success",
            message: "OTP sent to your registered email.",
            duration: 3000
          }));

          setIsDeleting(null); // Reset loading state before showing OTP popup
          // Step 3: Show OTP input popup
          setConfirmationPopup({
            isOpen: true,
            title: `Delete Cluster "${cluster.name}"`,
            message: "Please enter the OTP to confirm deletion.",
            mode: "otp",
            variant: "danger",
            confirmText: "Confirm & Delete",
            cancelText: "Cancel",
            cluster: cluster,
            onConfirm: async (otp) => {
              // Step 4: Submit with OTP
              setIsDeleting(cluster.id); // Set loading state for final deletion
              try {
                await axios.delete(`${API_URL}/geolocation/delete-cluster?unique_id=${moduleUniqueId}&req_for=delete`, {
                  headers: { ...authHeaderObj() },
                  data: { cluster_id: cluster.id, state_id: selectedState, otp: otp },
                });

                setClusters(prev => prev.filter(c => c.id !== cluster.id));
                if (selectedCluster?.id === cluster.id) setSelectedCluster(null);
                dispatch(setAlert({
                  type: "success",
                  message: "Cluster deleted successfully.",
                  duration: 3000
                }));
                setConfirmationPopup({ isOpen: false });
              } catch (err) {
                console.error("Error deleting cluster:", err);
                dispatch(setAlert({
                  type: "error",
                  message: err.response?.data?.message || "Failed to delete cluster.",
                  duration: 4000
                }));
                // Don't close OTP popup on failure to allow retry
              } finally {
                setIsDeleting(null);
              }
            },
            onCancel: () => {
              setConfirmationPopup({ isOpen: false });
              setIsDeleting(null);
            }
          });
        } catch (err) {
          console.error("Error requesting OTP for cluster deletion:", err);
          dispatch(setAlert({
            type: "error",
            message: err.response?.data?.message || "Failed to request OTP.",
            duration: 4000
          }));
          setIsDeleting(null);
          setConfirmationPopup({ isOpen: false });
        }
      },
      onCancel: () => {
        setConfirmationPopup({ isOpen: false });
        setIsDeleting(null);
      }
    });
  };

  const handleCancelDelete = () => {
    setConfirmationPopup({ isOpen: false, cluster: null });
    setIsDeleting(null);
  };

  const handleSaveClusterName = async (clusterId) => {
    if (!editingClusterName.trim()) {
      dispatch(setAlert({ type: "warning", message: "Cluster name cannot be empty." }));
      return;
    }
    
    setIsSavingName(true);
    try {
      const res = await axios.put(
        `${API_URL}/geolocation/edit-cluster-name?unique_id=${moduleUniqueId}&req_for=edit`,
        { cluster_id: clusterId, name: editingClusterName.trim() },
        { headers: { ...authHeaderObj() } }
      );

      // Update state list
      setClusters(prev => prev.map(c => c.id === clusterId ? { ...c, name: editingClusterName.trim() } : c));
      
      // Update selected cluster if currently viewing
      if (selectedCluster?.id === clusterId) {
        setSelectedCluster(prev => ({ ...prev, name: editingClusterName.trim() }));
      }

      setEditingClusterId(null);
      dispatch(setAlert({ type: "success", message: res.data.message || "Cluster name updated successfully." }));
    } catch (err) {
      dispatch(setAlert({
        type: "error",
        message: err.response?.data?.message || "Failed to update cluster name.",
        duration: 4000
      }));
    } finally {
      setIsSavingName(false);
    }
  };

  const fetchZones = async (clusterId) => {
    setLoadingZones(true);
    try {
      const res = await axios.get(`${API_URL}/geolocation/zones/${clusterId}?unique_id=${moduleUniqueId}&req_for=view`, {
        headers: { ...authHeaderObj() }
      });
      setZones(res.data.zones || []);
    } catch (err) {
      console.error("Error fetching zones:", err);
      dispatch(setAlert({ type: "error", message: "Failed to load zones." }));
    } finally {
      setLoadingZones(false);
    }
  };

  const handleClusterCardClick = (cluster) => {
    if (selectedCluster?.id === cluster.id) {
      setSelectedCluster(null);
      setZones([]);
    } else {
      setSelectedCluster(cluster);
      fetchZones(cluster.id);
    }
  };

  const handleAddZone = async (e) => {
    e.preventDefault();
    if (!newZoneName.trim()) {
      dispatch(setAlert({ type: "warning", message: "Zone name cannot be empty." }));
      return;
    }
    if (selectedDistrictsForZone.length === 0) {
      dispatch(setAlert({ type: "warning", message: "Please select at least one district." }));
      return;
    }
    setIsAddingZone(true);
    try {
      const res = await axios.post(`${API_URL}/geolocation/add-zone?unique_id=${moduleUniqueId}&req_for=add`, {
        name: newZoneName.trim(),
        cluster_id: selectedCluster.id,
        district_ids: selectedDistrictsForZone
      }, {
        headers: { ...authHeaderObj() }
      });
      setZones(prev => [...prev, res.data.zone]);
      setNewZoneName("");
      setSelectedDistrictsForZone([]);
      dispatch(setAlert({ type: "success", message: "Zone created successfully." }));
    } catch (err) {
      console.error("Error adding zone:", err);
      dispatch(setAlert({ type: "error", message: "Failed to create zone." }));
    } finally {
      setIsAddingZone(false);
    }
  };

  const handleDeleteZone = async (zoneId) => {
    if (!window.confirm("Are you sure you want to delete this zone?")) return;
    try {
      await axios.delete(`${API_URL}/geolocation/delete-zone/${zoneId}?unique_id=${moduleUniqueId}&req_for=delete`, {
        headers: { ...authHeaderObj() }
      });
      setZones(prev => prev.filter(z => z.id !== zoneId && z._id !== zoneId));
      dispatch(setAlert({ type: "success", message: "Zone deleted successfully." }));
    } catch (err) {
      console.error("Error deleting zone:", err);
      dispatch(setAlert({ type: "error", message: "Failed to delete zone." }));
    }
  };

  const zoneColors = useMemo(() => ["#10B981", "#3B82F6", "#F59E0B", "#EF4444", "#8B5CF6", "#EC4899", "#14B8A6"], []);

  const getDistrictZoneColor = (districtId) => {
    if (!districtId || !zones) return null;
    const zoneIndex = zones.findIndex(z => 
      z.districts && z.districts.some(d => {
        const dId = d._id ? d._id.toString() : (d.id ? d.id.toString() : d.toString());
        return dId === districtId.toString();
      })
    );
    if (zoneIndex !== -1) {
      return zoneColors[zoneIndex % zoneColors.length];
    }
    return null;
  };

  const assignedDistrictIds = useMemo(() => {
    const ids = new Set();
    zones.forEach(z => {
      if (z.districts) {
        z.districts.forEach(d => {
          const dId = d._id ? d._id.toString() : (d.id ? d.id.toString() : d.toString());
          ids.add(dId);
        });
      }
    });
    return ids;
  }, [zones]);

  const boundariesWithColors = useMemo(() => {
    return districtBoundaries.map(b => {
      const zoneIndex = zones.findIndex(z => 
        z.districts && z.districts.some(d => {
          const dId = d._id ? d._id.toString() : (d.id ? d.id.toString() : d.toString());
          return dId === b.id.toString();
        })
      );
      return {
        ...b,
        color: zoneIndex !== -1 ? zoneColors[zoneIndex % zoneColors.length] : undefined
      };
    });
  }, [districtBoundaries, zones, zoneColors]);

  // Pagination logic
  const totalPages = Math.ceil(clusters.length / itemsPerPage);
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentClusters = clusters.slice(indexOfFirstItem, indexOfLastItem);

  const handleOpenAssignPopup = (district) => {
    setAssignPopup({
      isOpen: true,
      district: district,
      selectedClusterId: "",
      isLoading: false,
    });
  };

  const handleAssignDistrictToCluster = async () => {
    if (!assignPopup.selectedClusterId) {
      dispatch(setAlert({ type: "warning", message: "Please select a cluster." }));
      return;
    }

    setAssignPopup(prev => ({ ...prev, isLoading: true }));

    try {
      const res = await axios.post(`${API_URL}/geolocation/assign-district-to-cluster?unique_id=${moduleUniqueId}&req_for=edit`, {
        cluster_id: assignPopup.selectedClusterId,
        district_id: assignPopup.district.id,
      }, { headers: { ...authHeaderObj() } });

      // Manually update the clusters state to reflect the change
      setClusters(prevClusters => prevClusters.map(c =>
        c.id === assignPopup.selectedClusterId ? { ...c, districts: [...c.districts, assignPopup.district] } : c
      ));

      dispatch(setAlert({
        type: "success",
        message: res.data.message || "District assigned successfully.",
        duration: 3000
      }));
      setAssignPopup({ isOpen: false, district: null, selectedClusterId: "", isLoading: false });
    } catch (err) {
      dispatch(setAlert({
        type: "error",
        message: err.response?.data?.message || "Failed to assign district.",
        duration: 4000
      }));
      setAssignPopup(prev => ({ ...prev, isLoading: false }));
    }
  };

  const handleOpenReassignPopup = (district, fromCluster) => {
    setReassignPopup({
      isOpen: true,
      district,
      fromCluster,
      toClusterId: "",
      isLoading: false,
    });
  };

  const handleReassignDistrict = async () => {
    const { district, toClusterId } = reassignPopup;

    if (!toClusterId) {
      dispatch(setAlert({ type: "warning", message: "Please select a new cluster." }));
      return;
    }

    setReassignPopup(prev => ({ ...prev, isLoading: true }));

    try {
      // 1. Get OTP
      await axios.post(
        `${API_URL}/geolocation/reassign-district-to-another-cluster-otp?unique_id=${moduleUniqueId}&req_for=edit`,
        { cluster_id: toClusterId, district_id: district.id },
        { headers: { ...authHeaderObj() } }
      );

      dispatch(setAlert({
        type: "success",
        message: "OTP sent to your registered email.",
        duration: 3000
      }));
      setReassignPopup({ isOpen: false }); // Close reassign popup

      // 2. Show OTP confirmation popup
      setConfirmationPopup({
        isOpen: true,
        title: `Reassign ${district.name}`,
        message: `Enter OTP to confirm reassigning ${district.name} to the new cluster.`,
        mode: "otp",
        variant: "warning",
        confirmText: "Confirm & Reassign",
        cancelText: "Cancel",
        onConfirm: async (otp) => {
          // 3. Finalize reassignment with OTP
          try {
            await axios.post(
              `${API_URL}/geolocation/reassign-district-to-another-cluster?unique_id=${moduleUniqueId}&req_for=edit`,
              { cluster_id: toClusterId, district_id: district.id, otp },
              { headers: { ...authHeaderObj() } }
            );

            // Manually update state to reflect the change
            const updatedClusters = clusters.map(c => {
              if (c.id === reassignPopup.fromCluster.id) return { ...c, districts: c.districts.filter(d => d.id !== district.id) };
              if (c.id === toClusterId) return { ...c, districts: [...c.districts, district] };
              return c;
            });
            setClusters(updatedClusters);

            // If the currently viewed cluster was affected, update it to reflect the change
            if (selectedCluster) {
              const updatedSelectedCluster = updatedClusters.find(c => c.id === selectedCluster.id);
              if (updatedSelectedCluster) {
                setSelectedCluster(updatedSelectedCluster);
              }
            }

            dispatch(setAlert({
              type: "success",
              message: "District reassigned successfully.",
              duration: 3000
            }));
            setConfirmationPopup({ isOpen: false });
          } catch (err) {
            dispatch(setAlert({
              type: "error",
              message: err.response?.data?.message || "Failed to reassign district.",
              duration: 4000
            }));
          }
        },
        onCancel: () => setConfirmationPopup({ isOpen: false }),
      });

    } catch (err) {
      dispatch(setAlert({
        type: "error",
        message: err.response?.data?.message || "Failed to request OTP for reassignment.",
        duration: 4000
      }));
      setReassignPopup(prev => ({ ...prev, isLoading: false }));
    }
  };

  const handlePageChange = (pageNumber) => {
    if (pageNumber < 1 || pageNumber > totalPages) return;
    setCurrentPage(pageNumber);
  };



  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader text="Loading location data..."/>
      </div>
    );
  }

  if (mapLoadError) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="card shadow-md p-8 text-center max-w-md w-full">
          <div className="w-20 h-20 rounded-xl bg-linear-to-br from-red-500 to-red-600 flex items-center justify-center mx-auto mb-4">
            <FaGlobeAmericas className="text-white text-3xl" />
          </div>
          <h3 className="text-xl font-bold text-danger mb-3">Failed to load map</h3>
          <p className="text-text-secondary mb-6">Error loading Google Maps. Please refresh the page.</p>
          <Button
            variant="danger"
            onClick={() => window.location.reload()}
            leftIcon={<FaSpinner className="animate-spin" />}
            className="bg-linear-120 from-red-500 to-red-600"
          >
            Refresh Page
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen space-y-6 pb-12">
      <PageHeader
        title="Cluster Setup"
        subtitle="Define and manage clusters within specific districts for geographic organization."
        icon={FaLayerGroup}
        stats={[
          { label: "Total Clusters", value: clusters.length, description: "Across all states" },
          { label: "Districts", value: districts.length, description: "In selected state" },
          { label: "Unassigned", value: unassignedDistricts.length, description: "Available districts" },
          { label: "Status", value: selectedState ? 'Active' : 'Select State', description: selectedState ? 'Ready to manage' : 'Choose location' }
        ]}
      />

      {/* Location Selection */}
      <div className="card shadow-sm hover:shadow-md transition-all duration-300">
        <div className="p-5">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-linear-to-br from-primary to-primary-end text-white">
              <FaMapMarkerAlt className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-text-primary text-lg">Select Location</h3>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-medium text-text-secondary flex items-center gap-2">
                <FaGlobeAmericas className="text-primary" />
                Country
              </label>
              <DropdownWithSearchInput
                options={countries}
                value={selectedCountry}
                onChange={setSelectedCountry}
                className="w-full"
                placeholder="Select Country"
              />
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium text-text-secondary flex items-center gap-2">
                <FaMapMarkerAlt className="text-success" />
                State
              </label>
              <DropdownWithSearchInput
                options={states}
                value={selectedState}
                onChange={setSelectedState}
                disabled={!selectedCountry || loadingStates}
                placeholder={loadingStates ? "Loading states..." : "Select State"}
                className="w-full"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className={`grid grid-cols-1 ${hasAddPermission || hasEditPermission ? 'lg:grid-cols-2' : ''} gap-6`}>
        {/* Left Column - Create Cluster & Unassigned Districts */}
        {(hasAddPermission || hasEditPermission) && (
          <div className="space-y-6 flex flex-col">
            <RenderIfPermission requiredUniqueId={moduleUniqueId} permission="add" fallback={null}>
              <div className="card shadow-sm hover:shadow-md transition-all duration-300">
                <div className="p-5">
                  <div className="flex justify-end mb-4">
                    <span className="text-xs bg-linear-120 from-primary/5 to-primary/15 text-text-secondary px-2 py-1 rounded-full flex items-center gap-1">
                      <FiClock size={10} />
                      Create new cluster
                    </span>
                  </div>

                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-linear-to-br from-primary to-primary-end text-white">
                      <FaPlus className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-bold text-text-primary">Create a New Cluster</h3>
                      <p className="text-text-secondary text-sm">Group districts into a cluster</p>
                    </div>
                  </div>

                  <form onSubmit={handleAddCluster} className="space-y-4">
                    <CustomInput
                      label="Cluster Name"
                      value={newClusterName}
                      onChange={(e) => setNewClusterName(e.target.value)}
                      placeholder="e.g., Cluster ABC"
                      className="w-full"
                      leftIcon={<FaLayerGroup className="text-text-secondary" />}
                    />

                    <div>
                      <label className="text-sm font-medium text-text-secondary mb-2 block">
                        Select Districts to Include
                      </label>
                      <MultiSelectDropdownWithSearchInput
                        options={unassignedDistricts}
                        values={districtsForNewCluster}
                        onChange={setDistrictsForNewCluster}
                        placeholder={unassignedDistricts.length === 0 ? "No available districts" : "Select districts..."}
                        className="w-full"
                        disabled={unassignedDistricts.length === 0}
                      />
                    </div>

                    {districtsForNewCluster.length > 0 && (
                      <div className="pt-3 border-t border-border">
                        <h4 className="text-xs font-semibold text-text-secondary mb-2">
                          Selected for New Cluster:
                        </h4>
                        <div className="flex flex-wrap gap-2 max-h-24 overflow-y-auto pr-2">
                          {districtsForNewCluster.map(districtId => {
                            const district = districts.find(d => d.id === districtId);
                            return (
                              <span
                                key={districtId}
                                className="text-xs bg-primary/5 border border-primary/20 px-3 py-1.5 rounded-full flex items-center gap-1.5"
                              >
                                <FaCheckCircle className="text-success w-3 h-3" />
                                {district?.display || '...'}
                              </span>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    <Button
                      type="submit"
                      variant="primary"
                      size="lg"
                      fullWidth
                      disabled={isAdding || !newClusterName || districtsForNewCluster.length === 0 || !selectedState}
                      loading={isAdding}
                      leftIcon={!isAdding && <FaPlus />}
                      className="mt-2 shadow-lg hover:shadow-xl bg-linear-120 from-primary to-primary-end"
                    >
                      {isAdding ? 'Creating Cluster...' : 'Create Cluster'}
                    </Button>
                  </form>
                </div>
              </div>
            </RenderIfPermission>

            {/* Unassigned Districts */}
            <RenderIfPermission requiredUniqueId={moduleUniqueId} permission="edit" fallback={null}>
              <div className="card shadow-sm hover:shadow-md transition-all duration-300">
                <div className="p-5">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-linear-to-br from-amber-500 to-amber-600 text-white">
                      <FaBuilding className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-bold text-text-primary">Unassigned Districts</h3>
                      <p className="text-text-secondary text-sm">Districts not yet in any cluster</p>
                    </div>
                    <span className="ml-auto px-3 py-1 bg-amber-100 text-amber-700 text-xs font-semibold rounded-full">
                      {unassignedDistricts.length} Available
                    </span>
                  </div>

                  {loadingDistricts ? (
                    <div className="text-center text-text-secondary p-6">
                      <FaSpinner className="animate-spin mx-auto mb-3 text-xl" />
                      Loading districts...
                    </div>
                  ) : unassignedDistricts.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-60 overflow-y-auto pr-2">
                      {unassignedDistricts.map(district => (
                        <div
                          key={district.id}
                          className="bg-surface border border-border rounded-lg p-3 hover:border-primary/50 hover:bg-primary/5 transition-all duration-200 group"
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-text-primary truncate group-hover:text-primary transition-colors">
                              {district.display}
                            </span>
                            <RenderIfPermission requiredUniqueId={moduleUniqueId} permission="add" fallback={null}>
                              <IconButton
                                onClick={() => handleOpenAssignPopup(district)}
                                size="sm"
                                variant="ghost"
                                className="opacity-0 group-hover:opacity-100 transition-opacity"
                                title={`Assign ${district.display} to a cluster`}
                              >
                                <FaLink className="text-primary" />
                              </IconButton>
                            </RenderIfPermission>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="bg-green-50 rounded-xl border-2 border-dashed border-green-300 p-6 text-center">
                      <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm">
                        <FaCheckCircle className="text-green-500 text-xl" />
                      </div>
                      <p className="text-text-secondary font-medium">All districts in this state are assigned to a cluster.</p>
                    </div>
                  )}
                </div>
              </div>
            </RenderIfPermission>
          </div>
        )}

        {/* Right Column - Map */}
        <div className={`flex flex-col h-full ${!(hasAddPermission || hasEditPermission) ? 'lg:col-span-1' : ''}`}>
          <div className="card shadow-sm hover:shadow-md transition-all duration-300 overflow-hidden h-full flex flex-col">
            <div className="p-5 flex-1 flex flex-col">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-linear-to-br from-primary to-primary-end text-white">
                  <FaMap className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-text-primary">District Boundary Map</h3>
                  <p className="text-text-secondary text-sm">Visual representation of selected districts</p>
                </div>
              </div>

              <div className="relative overflow-hidden rounded-xl border border-border flex-1 min-h-100">
                {!isMapLoaded || loadingBoundaries ? (
                  <div className="absolute inset-0 flex items-center justify-center bg-surface">
                    <Loader
                      text={loadingBoundaries ? "Loading boundaries..." : "Loading map..."}
                      className="text-primary"
                    />
                  </div>
                ) : (
                  <UniversalMap
                    center={mapCenter}
                    zoom={6}
                    boundaries={boundariesWithColors}
                    mapOptions={{
                      gestureHandling: "cooperative",
                      mapTypeId: "terrain",
                      disableDefaultUI: true,
                      zoomControl: true,
                      styles: [
                        {
                          featureType: "administrative",
                          elementType: "geometry",
                          stylers: [{ visibility: "off" }]
                        }
                      ]
                    }}
                  />
                )}
              </div>

              {/* Map Info Panel */}
              {selectedCluster ? (
                <div className="mt-4 p-4 bg-primary/5 rounded-xl border border-primary/20">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-sm font-semibold text-text-primary">
                      Viewing Cluster: <span className="text-primary">{selectedCluster.name}</span>
                    </p>
                    <div className="bg-primary text-white text-xs px-3 py-1 rounded-full">
                      {selectedCluster.districts.length} districts
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2 max-h-24 overflow-y-auto pr-2">
                    {selectedCluster.districts.map(district => {
                      const zoneColor = getDistrictZoneColor(district.id);
                      return (
                        <RenderIfPermission key={district.id} requiredUniqueId={moduleUniqueId} permission="edit" fallback={null}>
                          <Button
                            onClick={() => handleOpenReassignPopup(district, selectedCluster)}
                            size="sm"
                            variant="ghost"
                            style={zoneColor ? {
                              backgroundColor: `${zoneColor}10`,
                              borderColor: `${zoneColor}40`,
                              color: zoneColor
                            } : {}}
                            className={!zoneColor ? "bg-white border border-primary/20 px-3 py-1.5 rounded-lg shadow-sm hover:bg-primary/5 hover:border-primary/40 transition-all group" : "px-3 py-1.5 rounded-lg shadow-sm hover:brightness-95 border transition-all group"}
                            rightIcon={<FaRandom className="w-3 h-3 opacity-70 group-hover:opacity-100" />}
                          >
                            {district.name}
                          </Button>
                        </RenderIfPermission>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="mt-4 p-4 bg-amber-50 rounded-xl border border-amber-200">
                  <p className="text-sm text-amber-700 text-center flex items-center justify-center gap-2">
                    <FaExclamationTriangle className="text-amber-500" />
                    Select a cluster to view its district boundaries
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Existing Clusters Section */}
      <div className="card shadow-sm hover:shadow-md transition-all duration-300 overflow-hidden">
        <div className="p-5">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-linear-to-br from-green-500 to-green-600 text-white">
                <FaChartLine className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-text-primary">Existing Clusters</h3>
                <p className="text-text-secondary text-sm">Manage and view all created clusters</p>
              </div>
            </div>
            <div className="bg-green-100 text-green-700 px-4 py-2 rounded-full text-sm font-bold">
              {clusters.length} {clusters.length === 1 ? "Cluster" : "Clusters"}
            </div>
          </div>

          {loadingDistricts ? (
            <div className="text-center text-text-secondary p-8">
              <FaSpinner className="animate-spin mx-auto text-2xl mb-3" />
              Loading clusters...
            </div>
          ) : clusters.length > 0 ? (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {currentClusters.map(cluster => (
                  <div
                    key={cluster.id}
                    className={`
                      bg-surface rounded-xl border-2 transition-all duration-300 transform
                      ${selectedCluster?.id === cluster.id
                        ? 'border-primary shadow-xl scale-[1.02] bg-primary/5'
                        : 'border-border hover:border-primary/50 hover:shadow-lg'
                      }
                    `}
                  >
                    {/* Cluster Header */}
                    <div
                      onClick={() => handleClusterCardClick(cluster)}
                      className="p-5 cursor-pointer"
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                              selectedCluster?.id === cluster.id
                                ? 'bg-linear-to-br from-primary to-primary-end text-white'
                                : 'bg-primary/10 text-primary'
                            }`}>
                              <FaLayerGroup className="text-lg" />
                            </div>
                            <div>
                              {editingClusterId === cluster.id ? (
                                <div className="flex flex-col gap-2" onClick={(e) => e.stopPropagation()}>
                                  <div className="flex items-center gap-2">
                                    <input
                                      type="text"
                                      value={editingClusterName}
                                      onChange={(e) => setEditingClusterName(e.target.value)}
                                      onKeyDown={(e) => {
                                        if (e.key === "Enter") {
                                          e.preventDefault();
                                          if (editingClusterName.trim() && editingClusterName.trim() !== cluster.name && !isSavingName) {
                                            handleSaveClusterName(cluster.id);
                                          }
                                        } else if (e.key === "Escape") {
                                          setEditingClusterId(null);
                                        }
                                      }}
                                      className="border border-border rounded-lg px-2.5 py-1 text-sm bg-surface text-text-primary focus:outline-none focus:ring-2 focus:ring-primary w-full max-w-[200px]"
                                      autoFocus
                                    />
                                    <Button
                                      size="sm"
                                      variant="primary"
                                      onClick={() => handleSaveClusterName(cluster.id)}
                                      disabled={isSavingName || !editingClusterName.trim() || editingClusterName.trim() === cluster.name}
                                      loading={isSavingName}
                                    >
                                      Save
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="secondary"
                                      onClick={() => setEditingClusterId(null)}
                                      disabled={isSavingName}
                                    >
                                      Cancel
                                    </Button>
                                  </div>
                                </div>
                              ) : (
                                <h4 className="font-bold text-lg text-text-primary group-hover:text-primary transition-colors">
                                  {cluster.name}
                                </h4>
                              )}
                              <p className="text-xs text-text-secondary flex items-center gap-1.5 mt-1">
                                <FaCheckCircle className="text-success" />
                                {cluster.districts.length} {cluster.districts.length === 1 ? 'District' : 'Districts'}
                              </p>
                            </div>
                          </div>
                        </div>

                        {/* Buttons */}
                        <div className="flex items-center gap-2">
                          <RenderIfPermission requiredUniqueId={moduleUniqueId} permission="edit" fallback={null}>
                            <IconButton
                              onClick={(e) => {
                                e.stopPropagation();
                                setEditingClusterId(cluster.id);
                                setEditingClusterName(cluster.name);
                              }}
                              disabled={editingClusterId === cluster.id}
                              variant="secondary"
                              size="sm"
                              className="shadow-sm border border-border"
                              title="Edit cluster name"
                            >
                              <FaEdit className="w-3.5 h-3.5" />
                            </IconButton>
                          </RenderIfPermission>

                          <RenderIfPermission requiredUniqueId={moduleUniqueId} permission="delete" fallback={null}>
                            <IconButton
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteCluster(cluster);
                              }}
                              disabled={isDeleting === cluster.id}
                              variant="danger"
                              size="sm"
                              className="shadow-sm"
                              title="Delete cluster"
                            >
                              {isDeleting === cluster.id ? <FaSpinner className="animate-spin" /> : <FaTrash />}
                            </IconButton>
                          </RenderIfPermission>

                          <div className="transition-transform duration-300">
                            {selectedCluster?.id === cluster.id ? (
                              <FaChevronUp className="text-primary" />
                            ) : (
                              <FaChevronDown className="text-text-secondary group-hover:text-primary" />
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Collapsible District List */}
                    {selectedCluster?.id === cluster.id && cluster.districts.length > 0 && (
                      <div className="border-t border-border p-5 animate-in fade-in slide-in-from-top-4 duration-300">
                        <div className="mb-4">
                          <h5 className="text-sm font-semibold text-text-primary mb-3 flex items-center gap-2">
                            <FaMapMarkerAlt className="text-primary" />
                            Included Districts:
                          </h5>
                          <div className="flex flex-wrap gap-2">
                            {cluster.districts.map(d => {
                              const zoneColor = getDistrictZoneColor(d.id);
                              return (
                                <RenderIfPermission key={d.id} requiredUniqueId={moduleUniqueId} permission="edit" fallback={null}>
                                  <Button
                                    onClick={() => handleOpenReassignPopup(d, cluster)}
                                    size="sm"
                                    variant="ghost"
                                    style={zoneColor ? {
                                      backgroundColor: `${zoneColor}10`,
                                      borderColor: `${zoneColor}40`,
                                      color: zoneColor
                                    } : {}}
                                    className={!zoneColor ? "bg-primary/5 text-primary border border-primary/20 hover:bg-primary/10 hover:border-primary/40 transition-all group" : "hover:brightness-95 border transition-all group"}
                                    rightIcon={<FaRandom className="w-3 h-3 opacity-70 group-hover:opacity-100" />}
                                  >
                                    {d.name}
                                  </Button>
                                </RenderIfPermission>
                              );
                            })}
                          </div>
                        </div>

                        {/* Cluster Zones Section */}
                        <div className="mt-6 pt-5 border-t border-border/80 mb-4">
                          <h5 className="text-sm font-semibold text-text-primary mb-3 flex items-center gap-2">
                            <FaLayerGroup className="text-primary" />
                            Cluster Zones ({zones.length})
                          </h5>

                          {loadingZones ? (
                            <div className="text-xs text-text-secondary py-3 flex items-center gap-2">
                              <FaSpinner className="animate-spin text-primary" />
                              Loading zones...
                            </div>
                          ) : (
                            <div className="space-y-4">
                              {zones.length > 0 ? (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                                  {zones.map((z, idx) => (
                                    <div key={z.id || z._id} className="p-3 bg-surface border border-border rounded-xl flex items-center justify-between shadow-xs">
                                      <div className="space-y-1 overflow-hidden flex-1 mr-2">
                                        <div className="text-xs font-bold text-text-primary flex items-center gap-1.5">
                                          <span 
                                            className="w-1.5 h-1.5 rounded-full shrink-0" 
                                            style={{ backgroundColor: zoneColors[idx % zoneColors.length] }}
                                          />
                                          {z.name}
                                        </div>
                                        <div className="text-[10px] text-text-secondary truncate">
                                          Districts: {z.districts && z.districts.length > 0 
                                            ? z.districts.map(d => d.name || d).join(', ') 
                                            : 'None'}
                                        </div>
                                      </div>
                                      <button
                                        onClick={() => handleDeleteZone(z.id || z._id)}
                                        className="p-2 text-danger hover:bg-danger/10 rounded-xl transition-all duration-200 shrink-0 flex items-center justify-center border border-transparent animate-pulse-once"
                                        title="Delete Zone"
                                      >
                                        <FaTrash className="w-3.5 h-3.5" />
                                      </button>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <p className="text-[11px] text-text-secondary italic">No zones defined in this cluster yet.</p>
                              )}

                              {/* Add Zone mini-form */}
                              <div className="p-4 bg-bg border border-border rounded-xl space-y-4">
                                <h6 className="text-xs font-bold text-text-primary uppercase tracking-wider">Create New Zone</h6>
                                
                                <div className="space-y-1.5">
                                  <label className="text-[10px] font-semibold text-text-secondary uppercase">Zone Name</label>
                                  <input
                                    type="text"
                                    placeholder="Enter zone name (e.g. Pune City, Rural North)"
                                    value={newZoneName}
                                    onChange={(e) => setNewZoneName(e.target.value)}
                                    className="w-full border border-border rounded-xl px-3 py-2 text-xs bg-surface text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
                                  />
                                </div>

                                <div className="space-y-1.5">
                                  <label className="text-[10px] font-semibold text-text-secondary uppercase block mb-1">Assign Districts to Zone</label>
                                  <div className="grid grid-cols-2 gap-2 max-h-32 overflow-y-auto pr-1">
                                    {cluster.districts.filter(d => !assignedDistrictIds.has(d.id.toString())).length > 0 ? (
                                      cluster.districts.filter(d => !assignedDistrictIds.has(d.id.toString())).map(d => (
                                        <label key={d.id} className="flex items-center gap-2 p-2 bg-surface border border-border/60 hover:border-primary/40 rounded-lg cursor-pointer text-xs select-none">
                                          <input
                                            type="checkbox"
                                            checked={selectedDistrictsForZone.includes(d.id)}
                                            onChange={(e) => {
                                              if (e.target.checked) {
                                                setSelectedDistrictsForZone(prev => [...prev, d.id]);
                                              } else {
                                                setSelectedDistrictsForZone(prev => prev.filter(id => id !== d.id));
                                              }
                                            }}
                                            className="rounded text-primary focus:ring-primary border-border"
                                          />
                                          <span className="text-text-primary truncate">{d.name}</span>
                                        </label>
                                      ))
                                    ) : (
                                      <p className="text-[10px] text-text-secondary italic col-span-2 text-center py-2">
                                        All districts in this cluster are assigned to zones.
                                      </p>
                                    )}
                                  </div>
                                </div>

                                <Button
                                  onClick={handleAddZone}
                                  variant="primary"
                                  size="sm"
                                  disabled={isAddingZone || !newZoneName.trim() || selectedDistrictsForZone.length === 0}
                                  loading={isAddingZone}
                                  className="w-full"
                                >
                                  Create Zone
                                </Button>
                              </div>
                            </div>
                          )}
                        </div>

                        <div className="bg-primary/5 p-3 rounded-lg border border-primary/20">
                          <div className="flex items-center gap-2 text-xs text-text-secondary mb-1">
                            <FaShieldAlt className="text-primary" />
                            <span className="font-medium">Quick Actions:</span>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                            <div className="flex items-center gap-2">
                              <FaRandom className="text-primary w-3 h-3" />
                              <span>Click any district to reassign</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <FaTrash className="text-danger w-3 h-3" />
                              <span>Trash icon deletes entire cluster</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Pagination Controls */}
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={handlePageChange}
                totalItems={clusters.length}
                pageSize={itemsPerPage}
                className="mt-6 border-t border-border pt-4"
              />
            </>
          ) : (
            <div className="bg-primary/5 rounded-xl border-2 border-dashed border-primary/30 p-10 text-center">
              <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg">
                <FaLayerGroup className="text-primary text-3xl" />
              </div>
              <h3 className="text-xl font-semibold text-text-primary mb-3">No Clusters Found</h3>
              <p className="text-text-secondary max-w-md mx-auto mb-6">
                Create your first cluster for this state to start organizing districts geographically.
              </p>
              {hasAddPermission && (
                <Button
                  variant="primary"
                  leftIcon={<FaPlus />}
                  onClick={() => document.querySelector('form')?.scrollIntoView({ behavior: 'smooth' })}
                  className="bg-linear-120 from-primary to-primary-end"
                >
                  Create First Cluster
                </Button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Confirmation Popup */}
      <ConfirmationPopup
        isOpen={confirmationPopup.isOpen}
        title={confirmationPopup.title}
        message={confirmationPopup.message}
        mode={confirmationPopup.mode}
        onConfirm={confirmationPopup.onConfirm}
        onCancel={() => {
          if (confirmationPopup.onCancel) {
            confirmationPopup.onCancel();
          } else {
            handleCancelDelete();
          }
        }}
        variant={confirmationPopup.variant}
        isLoading={isDeleting === confirmationPopup.cluster?.id}
        confirmText={confirmationPopup.confirmText}
        cancelText={confirmationPopup.cancelText}
      />

      {/* Assign District to Cluster Popup */}
      {assignPopup.isOpen && (
        <ConfirmationPopup
          isOpen={assignPopup.isOpen}
          title="Assign District"
          message={`Assign ${assignPopup.district?.display} to an existing cluster.`}
          mode="custom"
          variant="info"
          onConfirm={handleAssignDistrictToCluster}
          onCancel={() => setAssignPopup({ isOpen: false, district: null, selectedClusterId: "", isLoading: false })}
          isLoading={assignPopup.isLoading}
          confirmText={assignPopup.isLoading ? "Assigning..." : "Assign"}
          cancelText="Cancel"
          customContent={
            <div className="space-y-4">
              <Dropdown
                label="Select Cluster"
                value={assignPopup.selectedClusterId}
                onChange={(value) => setAssignPopup(prev => ({ ...prev, selectedClusterId: value }))}
                options={clusters.map(c => ({
                  value: c.id,
                  text: (
                    <span className="flex items-center gap-2">
                      <div className="w-6 h-6 bg-primary/20 rounded-full flex items-center justify-center">
                        <FaLayerGroup className="text-primary w-3 h-3" />
                      </div>
                      {c.name}
                    </span>
                  )
                }))}
                className="w-full"
              />
              <p className="text-xs text-text-secondary">
                The district will be immediately assigned to the selected cluster.
              </p>
            </div>
          }
        />
      )}

      {/* Reassign District Popup */}
      {reassignPopup.isOpen && (
        <ConfirmationPopup
          isOpen={reassignPopup.isOpen}
          title="Reassign District"
          message={`Reassign ${reassignPopup.district?.name} to a different cluster.`}
          mode="custom"
          variant="warning"
          onConfirm={handleReassignDistrict}
          onCancel={() => setReassignPopup({ isOpen: false, district: null, fromCluster: null, toClusterId: "", isLoading: false })}
          isLoading={reassignPopup.isLoading}
          confirmText={reassignPopup.isLoading ? "Sending OTP..." : "Get OTP & Reassign"}
          cancelText="Cancel"
          customContent={
            <div className="space-y-4">
              <Dropdown
                label="Select New Cluster"
                value={reassignPopup.toClusterId}
                onChange={(value) => setReassignPopup(prev => ({ ...prev, toClusterId: value }))}
                options={clusters
                  .filter(c => c.id !== reassignPopup.fromCluster?.id)
                  .map(c => ({
                    value: c.id,
                    text: (
                      <span className="flex items-center gap-2">
                        <div className="w-6 h-6 bg-amber-500/20 rounded-full flex items-center justify-center">
                          <FaLayerGroup className="text-amber-600 w-3 h-3" />
                        </div>
                        {c.name}
                      </span>
                    )
                  }))}
                className="w-full"
              />
              <p className="text-xs text-text-secondary">
                An OTP will be sent to your email to confirm this action.
              </p>
            </div>
          }
        />
      )}
    </div>
  );
}