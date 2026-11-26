import { useEffect, useState, useMemo } from "react";
import axios from "axios";
import { authHeaderObj } from "@/app/authHeader";
import {
  FaMapMarkerAlt,
  FaCheckCircle,
  FaPlus,
  FaSpinner,
  FaBuilding,
  FaHome,
  FaGlobeAmericas,
  FaBan,
  FaChartLine,
  FaMapPin,
  FaTimes,
  FaSearch,
  FaCompass,
  FaCity,
  FaLayerGroup,
  FaSitemap,
  FaBoxes,
  FaWarehouse,
  FaChevronDown,
  FaChevronUp,
} from "react-icons/fa";
import DropdownWithSearchInput from "@/components/DropdownWithSearchInput";
import SearchInputWithDropdown from "@/components/SearchInputWithDropdown";
import Dropdown from "@/components/Dropdown";
import ConfirmationPopup from "@/components/ConfirmationPopup";
import { useDispatch } from "react-redux";
import { setAlert } from "@/features/alert.slice";
import { useLocation, useNavigate } from "react-router-dom";
import Loader from "@/components/Loader";
import Button from "@/components/Button";
import { FiChevronRight, FiClock } from "react-icons/fi";
import RenderIfPermission from "@/components/PermissionCheck";
import PageHeader from "@/components/PageHeader";
import Pagination from "@/components/Pagination";

export default function ActiveDistricts({ moduleUniqueId }) {
  const [districts, setDistricts] = useState([]);
  const [districtItem, setDistrictItem] = useState(null);
  const [loading, setLoading] = useState(false);
  const [activating, setActivating] = useState(false);
  const [error, setError] = useState(null);

  // Clusters state for Clustered vs Unclustered grouping
  const [clusters, setClusters] = useState([]);
  const [clustersLoading, setClustersLoading] = useState(false);
  const [activeViewTab, setActiveViewTab] = useState("clustered"); // 'clustered' | 'unclustered'
  const [expandedClusterIds, setExpandedClusterIds] = useState(new Set());

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(8);

  // Search state
  const [searchQuery, setSearchQuery] = useState("");

  // Pincode View Modal state
  const [selectedDistrictForPincodes, setSelectedDistrictForPincodes] = useState(null);
  const [pincodeSearchQuery, setPincodeSearchQuery] = useState("");
  const [districtPincodesLoading, setDistrictPincodesLoading] = useState(false);
  const [activeDistrictPincodes, setActiveDistrictPincodes] = useState([]);

  // Confirmation Popup state
  const [confirmationPopup, setConfirmationPopup] = useState({
    isOpen: false,
    title: "",
    message: "",
    mode: "text",
    variant: "danger",
    onConfirm: null,
  });
  const [deactivateOTP, setDeactivateOTP] = useState(null);

  const API_URL = import.meta.env.VITE_API_URL;
  const dispatch = useDispatch();
  const navigate = useNavigate();

  // Get state & country from route state
  const location = useLocation();
  const stateData = location.state?.state;
  const country = location.state?.country;

  // Redirect if missing
  useEffect(() => {
    if (!stateData || !country) {
      navigate(location.pathname.replace("/active-districts", ""));
      dispatch(
        setAlert({
          message: "Missing state or country. Redirected to setup location.",
          type: "error",
        })
      );
    }
  }, [stateData, country, navigate, dispatch]);

  // Fetch clusters for state
  const fetchClusters = async () => {
    if (!API_URL || !stateData?.id) return;
    try {
      setClustersLoading(true);
      let list = [];
      const res1 = await axios
        .get(`${API_URL}/franchise-clusters/list?state_id=${stateData.id}`, authHeaderObj())
        .catch(() => null);

      if (res1?.data?.data && Array.isArray(res1.data.data) && res1.data.data.length > 0) {
        list = res1.data.data;
      } else if (stateData.name) {
        const res2 = await axios
          .get(`${API_URL}/franchise-clusters/list?state_name=${encodeURIComponent(stateData.name)}`, authHeaderObj())
          .catch(() => null);
        if (res2?.data?.data && Array.isArray(res2.data.data) && res2.data.data.length > 0) {
          list = res2.data.data;
        }
      }

      if (list.length === 0) {
        const geoRes = await axios
          .get(`${API_URL}/geolocation/clusters/${stateData.id}?unique_id=ADM_CLUSTER_SETUP&req_for=view`, {
            headers: { ...authHeaderObj() },
          })
          .catch(() => null);
        if (geoRes?.data?.clusters && Array.isArray(geoRes.data.clusters)) {
          list = geoRes.data.clusters.map((gc) => ({
            _id: gc.id || gc._id,
            cluster_name: gc.name || gc.cluster_name,
            cluster_code: gc.code || `CLU-${(gc.name || "").substring(0, 3).toUpperCase()}`,
            district_ids: gc.districts || gc.district_ids || [],
            district_names: gc.district_names || [],
            status: "active",
          }));
        }
      }

      setClusters(list);
      const expSet = new Set(list.map((c) => (c._id || c.id || "").toString()));
      setExpandedClusterIds(expSet);
      if (list.length > 0) {
        setActiveViewTab("clustered");
      } else {
        setActiveViewTab("unclustered");
      }
    } catch (err) {
      console.warn("Could not load clusters for state:", err);
    } finally {
      setClustersLoading(false);
    }
  };

  // Fetch districts for state
  useEffect(() => {
    if (!API_URL || !stateData?.id) return;
    let isMounted = true;

    const fetchDistricts = async () => {
      try {
        setLoading(true);
        const res = await axios.post(
          `${API_URL}/geolocation/districts?unique_id=${moduleUniqueId}&req_for=view`,
          { state_id: stateData.id },
          { headers: { ...authHeaderObj() } }
        );

        if (!isMounted) return;

        const formatted = res.data.districts.map((d) => ({
          text: d.name,
          value: d.id,
          ...d,
        }));

        setDistricts(formatted);
        setCurrentPage(1);
      } catch (err) {
        console.error("❌ Error fetching districts:", err);
        setError("Failed to load districts.");
        dispatch(setAlert({ message: "Failed to load districts.", type: "error" }));
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchDistricts();
    fetchClusters();
    return () => {
      isMounted = false;
    };
  }, [stateData?.id]);

  // Refresh districts
  const refreshDistricts = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await axios.post(
        `${API_URL}/geolocation/districts?unique_id=${moduleUniqueId}&req_for=view`,
        { state_id: stateData.id },
        { headers: { ...authHeaderObj() } }
      );

      const formatted = res.data.districts.map((d) => ({
        text: d.name,
        value: d.id,
        ...d,
      }));

      setDistricts(formatted);
      await fetchClusters();
    } catch (err) {
      console.error("❌ Error refreshing districts:", err);
      setError("Failed to reload districts.");
    } finally {
      setLoading(false);
    }
  };

  // Open Pincodes Viewer Modal
  const handleOpenPincodesModal = async (district) => {
    setSelectedDistrictForPincodes(district);
    setPincodeSearchQuery("");

    // If district already has pincodes, use them immediately
    if (district.pincodes && district.pincodes.length > 0) {
      setActiveDistrictPincodes(district.pincodes);
      return;
    }

    // Otherwise fetch from endpoint
    try {
      setDistrictPincodesLoading(true);
      const res = await axios.get(
        `${API_URL}/geolocation/district-pincodes/${district.id}`,
        { headers: { ...authHeaderObj() } }
      );
      if (res.data?.district?.pincodes) {
        setActiveDistrictPincodes(res.data.district.pincodes);
      } else {
        setActiveDistrictPincodes([]);
      }
    } catch (err) {
      console.warn("Could not fetch remote pincodes, fallback to local:", err);
      setActiveDistrictPincodes(district.pincodes || []);
    } finally {
      setDistrictPincodesLoading(false);
    }
  };

  // Activate selected district
  const handleActivate = async () => {
    if (!districtItem) {
      dispatch(setAlert({ message: "Please select a district first.", type: "error" }));
      return;
    }

    try {
      setActivating(true);
      const res = await axios.post(
        `${API_URL}/geolocation/activate-district?unique_id=${moduleUniqueId}&req_for=edit`,
        { district_id: districtItem },
        { headers: { ...authHeaderObj() } }
      );

      if (res.data.status === "success") {
        dispatch(setAlert({ message: res.data.message, type: "success" }));
        setDistrictItem(null);
        await refreshDistricts();
      } else {
        dispatch(setAlert({ message: res.data.message || "Failed to activate district.", type: "error" }));
      }
    } catch (err) {
      console.error("❌ Activation Error:", err);
      const msg = err.response?.data?.message || "Something went wrong while activating district.";
      dispatch(setAlert({ message: msg, type: "error" }));
    } finally {
      setActivating(false);
    }
  };

  // Deactivate district with OTP
  const handleDeactivate = (district) => {
    setConfirmationPopup({
      isOpen: true,
      title: "Deactivate District",
      message: `Are you sure you want to deactivate "${district.name}"? This action will disable all associated cities and zones.`,
      mode: "text",
      variant: "danger",
      confirmText: "Send OTP & Proceed",
      onConfirm: async () => {
        try {
          const res = await axios.post(
            `${API_URL}/geolocation/request-deactivation-otp?unique_id=${moduleUniqueId}&req_for=add`,
            {
              type: "district",
              country: country.name,
              state: stateData.name,
              district: district.name,
            },
            { headers: { ...authHeaderObj() } }
          );

          if (res.data.status === "success") {
            dispatch(setAlert({ message: "OTP sent successfully to your registered email.", type: "success" }));

            setConfirmationPopup({
              isOpen: true,
              title: "Verify OTP for District Deactivation",
              message: `Please enter the 6-digit OTP sent to your email to confirm the deactivation of "${district.name}".`,
              mode: "otp",
              variant: "danger",
              confirmText: "Verify & Deactivate",
              onConfirm: async (otp) => {
                try {
                  const verifyRes = await axios.post(
                    `${API_URL}/geolocation/deactivate-district?unique_id=${moduleUniqueId}&req_for=edit`,
                    {
                      district_id: district.id,
                      otp: otp,
                    },
                    { headers: { ...authHeaderObj() } }
                  );

                  if (verifyRes.data.status === "success") {
                    dispatch(setAlert({ message: verifyRes.data.message, type: "success" }));
                    setConfirmationPopup((prev) => ({ ...prev, isOpen: false }));
                    await refreshDistricts();
                  } else {
                    dispatch(setAlert({ message: verifyRes.data.message || "Failed to deactivate district.", type: "error" }));
                  }
                } catch (verifyErr) {
                  console.error("❌ OTP Verification Error:", verifyErr);
                  const msg = verifyErr.response?.data?.message || "Invalid or expired OTP.";
                  dispatch(setAlert({ message: msg, type: "error" }));
                }
              },
            });
          } else {
            dispatch(setAlert({ message: res.data.message || "Failed to send OTP.", type: "error" }));
          }
        } catch (otpErr) {
          console.error("❌ Send OTP Error:", otpErr);
          const msg = otpErr.response?.data?.message || "Failed to send OTP. Try again.";
          dispatch(setAlert({ message: msg, type: "error" }));
        }
      },
    });
  };

  const activeDistricts = districts.filter((d) => d.is_active);
  const inactiveDistricts = districts.filter((d) => !d.is_active);

  // Map clusters to their corresponding districts
  const { clusterDistrictMap, clusteredDistricts, unclusteredDistricts } = useMemo(() => {
    const map = new Map();
    const clusteredIdSet = new Set();
    const clusteredNameSet = new Set();

    const activeList = districts.filter((d) => d.is_active);

    for (const clu of clusters) {
      const cluId = (clu._id || clu.id || "").toString();
      const rawDistIds = (clu.district_ids || []).map((d) =>
        (typeof d === "object" && d !== null ? (d._id || d.id || "") : d).toString()
      );
      const rawDistNames = (clu.district_names || []).map((n) =>
        (n || "").toString().toLowerCase().trim()
      );

      const matched = activeList.filter((d) => {
        const dId = (d.id || d._id || "").toString();
        const dName = (d.name || "").toLowerCase().trim();
        return rawDistIds.includes(dId) || rawDistNames.includes(dName);
      });

      map.set(cluId, matched);
      matched.forEach((d) => {
        clusteredIdSet.add((d.id || d._id).toString());
        clusteredNameSet.add((d.name || "").toLowerCase().trim());
      });
    }

    const clustered = activeList.filter((d) => {
      const dId = (d.id || d._id || "").toString();
      const dName = (d.name || "").toLowerCase().trim();
      return clusteredIdSet.has(dId) || clusteredNameSet.has(dName);
    });

    const unclustered = activeList.filter((d) => {
      const dId = (d.id || d._id || "").toString();
      const dName = (d.name || "").toLowerCase().trim();
      return !clusteredIdSet.has(dId) && !clusteredNameSet.has(dName);
    });

    return {
      clusterDistrictMap: map,
      clusteredDistricts: clustered,
      unclusteredDistricts: unclustered,
    };
  }, [clusters, districts]);

  // Toggle cluster accordion expansion
  const toggleClusterExpand = (clusterId) => {
    setExpandedClusterIds((prev) => {
      const next = new Set(prev);
      const strId = clusterId.toString();
      if (next.has(strId)) {
        next.delete(strId);
      } else {
        next.add(strId);
      }
      return next;
    });
  };

  // Filtered clusters for search
  const filteredClusters = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return clusters;

    return clusters.filter((clu) => {
      const nameMatch = (clu.cluster_name || "").toLowerCase().includes(q);
      const codeMatch = (clu.cluster_code || "").toLowerCase().includes(q);
      const dists = clusterDistrictMap.get((clu._id || clu.id || "").toString()) || [];
      const distMatch = dists.some((d) => (d.name || "").toLowerCase().includes(q));
      return nameMatch || codeMatch || distMatch;
    });
  }, [clusters, searchQuery, clusterDistrictMap]);

  // Filtered unclustered districts for search
  const filteredUnclusteredDistricts = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return unclusteredDistricts;
    return unclusteredDistricts.filter((d) => (d.name || "").toLowerCase().includes(q));
  }, [unclusteredDistricts, searchQuery]);

  const totalPages = Math.ceil(filteredUnclusteredDistricts.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const currentUnclusteredDistricts = filteredUnclusteredDistricts.slice(
    startIndex,
    startIndex + itemsPerPage
  );

  const handlePageChange = (page) => {
    setCurrentPage(page);
  };

  // Filter pincodes inside modal
  const filteredModalPincodes = activeDistrictPincodes.filter((p) => {
    if (!pincodeSearchQuery) return true;
    const query = pincodeSearchQuery.toLowerCase();
    const pinStr = (p.pincode || "").toString().toLowerCase();
    const locStr = (p.locality || "").toLowerCase();
    return pinStr.includes(query) || locStr.includes(query);
  });

  // Reusable district card renderer
  const renderDistrictCard = (d, isClustered = false, clusterName = "") => {
    const pincodesCount = d.pincodes_count || (d.pincodes ? d.pincodes.length : 0);
    const hasCoords = (d.lat && Number(d.lat) !== 0) || (d.lng && Number(d.lng) !== 0);

    return (
      <div
        key={d.id || d._id}
        className="card hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1 group border border-slate-200/80 hover:border-primary/40 flex flex-col justify-between bg-white"
      >
        <div className="p-4 sm:p-5 flex flex-col h-full justify-between">
          <div>
            {/* Header */}
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-2.5">
                <div
                  className={`w-9 h-9 rounded-lg flex items-center justify-center shadow-xs ${
                    isClustered
                      ? "bg-linear-to-br from-primary to-primary-end text-white"
                      : "bg-linear-to-br from-amber-500 to-amber-600 text-white"
                  }`}
                >
                  <FaMapMarkerAlt className="text-base" />
                </div>
                <div>
                  <h4 className="font-bold text-sm text-text-primary group-hover:text-primary transition-colors line-clamp-1">
                    {d.name}
                  </h4>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="text-[11px] text-text-secondary flex items-center">
                      <FaCheckCircle className="text-success mr-1 w-2.5 h-2.5" />
                      Active
                    </span>
                    {isClustered ? (
                      <span className="text-[10px] bg-primary/10 text-primary font-semibold px-1.5 py-0.5 rounded-sm">
                        {clusterName || "Clustered"}
                      </span>
                    ) : (
                      <span className="text-[10px] bg-amber-100 text-amber-800 font-semibold px-1.5 py-0.5 rounded-sm">
                        Standalone
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Coordinates Pill */}
            <div className="mb-3 bg-slate-50 border border-slate-200/80 rounded-lg px-2.5 py-1 flex items-center justify-between text-[11px]">
              <span className="text-slate-500 font-medium flex items-center gap-1">
                <FaCompass className="text-primary text-xs" /> Coords
              </span>
              <span className="font-mono text-slate-800 font-semibold text-[10px]">
                {hasCoords ? `${Number(d.lat).toFixed(4)}, ${Number(d.lng).toFixed(4)}` : "Lat/Lng not set"}
              </span>
            </div>

            {/* Stats Grid: Pincodes & Urban/Rural */}
            <div className="grid grid-cols-2 gap-2 mb-3">
              <div className="bg-emerald-50/80 border border-emerald-100 rounded-lg p-2 text-center">
                <div className="flex items-center justify-center gap-1 mb-0.5">
                  <FaMapPin className="text-emerald-600 text-[10px]" />
                  <span className="text-[9px] font-bold text-emerald-700 uppercase tracking-wider">Pincodes</span>
                </div>
                <p className="text-sm font-black text-emerald-950">{pincodesCount}</p>
              </div>
              <div className="bg-blue-50/80 border border-blue-100 rounded-lg p-2 text-center">
                <div className="flex items-center justify-center gap-1 mb-0.5">
                  <FaBuilding className="text-blue-600 text-[10px]" />
                  <span className="text-[9px] font-bold text-blue-700 uppercase tracking-wider">Cities</span>
                </div>
                <p className="text-[11px] font-bold text-blue-900 mt-0.5">
                  {d.urban_cities_count || 0}U • {d.rural_cities_count || 0}R
                </p>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="space-y-1.5 pt-2 border-t border-slate-100 mt-2">
            <button
              type="button"
              onClick={() => handleOpenPincodesModal(d)}
              className="w-full py-1.5 px-2.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 hover:text-emerald-800 text-xs font-bold rounded-lg border border-emerald-200 transition-colors flex items-center justify-center gap-1"
            >
              <FaMapPin className="text-[11px]" />
              <span>View Pincodes & Coords</span>
            </button>

            <button
              type="button"
              onClick={() =>
                navigate(location.pathname.replace("/active-districts", "/urban-cities"), {
                  state: {
                    district: {
                      id: d.id || d._id,
                      name: d.name,
                    },
                    state: stateData,
                    country,
                  },
                })
              }
              className="w-full py-1 px-2.5 text-slate-500 hover:text-primary text-[11px] font-medium transition-colors flex items-center justify-center gap-1"
            >
              <span>Explore Cities</span>
              <FiChevronRight className="text-[11px]" />
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <PageHeader
          icon={FaMapMarkerAlt}
          title={
            <div className="flex items-center gap-3">
              <span className="text-xl font-bold text-text-primary">
                Setup Locations
              </span>
              <span className="text-sm font-semibold text-text-secondary bg-primary/10 px-2 py-0.5 rounded-full">
                Active Districts
              </span>
            </div>
          }
          description="Manage districts, pincodes coverage, and geographical coordinates for your selected state."
          backButton={{
            label: "Back to States",
            onClick: () => navigate(location.pathname.replace("/active-districts", "/active-states"), {
              state: { country }
            }),
          }}
        />
      </div>

      <div className="card hover:shadow-xl transition-all duration-300">
        <div className="p-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center bg-linear-to-br from-primary/10 to-primary/20 text-primary shadow-inner">
                <FaGlobeAmericas className="text-2xl" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-bold text-text-primary">
                    {stateData?.name || "State"}
                  </h2>
                  <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-green-100 text-green-700">
                    Active
                  </span>
                </div>
                <p className="text-text-secondary text-sm">
                  {country?.name} • State ID: {stateData?.id}
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-xs text-text-secondary">Districts Active</p>
              <p className="text-sm font-bold text-primary">{activeDistricts.length} Districts</p>
            </div>
          </div>
        </div>
      </div>

      {/* ✅ Add/Activate District */}
      <RenderIfPermission 
        requiredUniqueId={moduleUniqueId}
        permission="edit"
      >
        <div className="card hover:shadow-xl transition-all duration-300">
          <div className="p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-linear-to-br from-primary to-primary-end text-text-inverse">
                  <FaMapMarkerAlt className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-text-primary">Activate District</h3>
                  <p className="text-text-secondary text-sm">Choose an inactive district to enable it</p>
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <div className="flex-1">
                <DropdownWithSearchInput
                  options={inactiveDistricts}
                  value={districtItem}
                  onChange={(val) => setDistrictItem(val)}
                  placeholder="Select district to activate..."
                  className="w-full"
                />
              </div>
              <Button
                variant="primary"
                onClick={handleActivate}
                disabled={!districtItem || activating}
                icon={FaPlus}
                iconPosition="left"
                isLoading={activating}
                loadingText="Activating..."
                className="whitespace-nowrap"
              >
                Activate District
              </Button>
            </div>

            {inactiveDistricts.length === 0 && (
              <p className="text-xs text-text-secondary mt-2">
                All available districts for this state are currently active.
              </p>
            )}
          </div>
        </div>
      </RenderIfPermission>

      {/* ✅ Deactivate District */}
      <RenderIfPermission 
        requiredUniqueId={moduleUniqueId}
        permission="edit"
      >
        <div className="card hover:shadow-xl transition-all duration-300">
          <div className="p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-linear-to-br from-danger to-danger/80 text-text-inverse">
                  <FaBan className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-text-primary">Deactivate District</h3>
                  <p className="text-text-secondary text-sm">Disable an active district and its components</p>
                </div>
              </div>
            </div>

            {activeDistricts.length > 0 ? (
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                <div className="flex-1">
                  <Dropdown
                    options={activeDistricts.map((d) => ({ text: d.name, value: d.id, ...d }))}
                    value={deactivateOTP}
                    onChange={(val) => setDeactivateOTP(val)}
                    placeholder="Select active district to deactivate..."
                    className="w-full"
                  />
                </div>
                <Button
                  variant="danger"
                  onClick={() => {
                    const dist = activeDistricts.find((d) => d.id === deactivateOTP);
                    if (dist) handleDeactivate(dist);
                  }}
                  disabled={!deactivateOTP}
                  icon={FaBan}
                  iconPosition="left"
                  className="whitespace-nowrap"
                >
                  Deactivate District
                </Button>
              </div>
            ) : (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-yellow-500"></div>
                  <p className="text-xs text-yellow-800">
                    No active districts found. Activate a district first to enable deactivation.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </RenderIfPermission>

      {/* ✅ Clustered vs Unclustered Section */}
      <RenderIfPermission 
        requiredUniqueId={moduleUniqueId}
        permission="view"
      >
        {/* ✅ Two High-Level Selector Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Card A: Clustered Districts */}
          <div
            role="button"
            tabIndex={0}
            onClick={() => {
              setActiveViewTab("clustered");
              setCurrentPage(1);
              setSearchQuery("");
            }}
            className={`p-5 rounded-2xl border-2 cursor-pointer transition-all duration-300 text-left relative overflow-hidden flex flex-col justify-between ${
              activeViewTab === "clustered"
                ? "bg-linear-to-br from-primary/10 via-white to-primary/5 border-primary shadow-lg ring-2 ring-primary/20"
                : "bg-white border-slate-200 hover:border-slate-300 hover:shadow-md"
            }`}
          >
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-12 h-12 rounded-xl flex items-center justify-center transition-colors ${
                      activeViewTab === "clustered"
                        ? "bg-primary text-white shadow-md"
                        : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    <FaLayerGroup className="text-xl" />
                  </div>
                  <div>
                    <h3 className="font-black text-lg text-text-primary">Clustered Districts</h3>
                    <p className="text-xs text-text-secondary">Districts organized under formed franchisee clusters</p>
                  </div>
                </div>
                {activeViewTab === "clustered" && (
                  <span className="px-2.5 py-1 text-[11px] font-bold rounded-full bg-primary text-white shadow-xs">
                    Viewing Active
                  </span>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2 mt-2">
                <div className="bg-white/80 border border-slate-200/80 rounded-xl p-2.5 text-center shadow-xs">
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Formed Clusters</p>
                  <p className="text-xl font-black text-primary mt-0.5">{clusters.length}</p>
                </div>
                <div className="bg-white/80 border border-slate-200/80 rounded-xl p-2.5 text-center shadow-xs">
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Assigned Districts</p>
                  <p className="text-xl font-black text-emerald-600 mt-0.5">{clusteredDistricts.length}</p>
                </div>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
              <span className="text-text-secondary font-medium">Click to view cluster cards & mapped districts</span>
              <span
                className={`font-bold flex items-center gap-1 ${
                  activeViewTab === "clustered" ? "text-primary" : "text-slate-400"
                }`}
              >
                Explore Clusters <FiChevronRight />
              </span>
            </div>
          </div>

          {/* Card B: Unclustered Districts */}
          <div
            role="button"
            tabIndex={0}
            onClick={() => {
              setActiveViewTab("unclustered");
              setCurrentPage(1);
              setSearchQuery("");
            }}
            className={`p-5 rounded-2xl border-2 cursor-pointer transition-all duration-300 text-left relative overflow-hidden flex flex-col justify-between ${
              activeViewTab === "unclustered"
                ? "bg-linear-to-br from-amber-500/10 via-white to-amber-500/5 border-amber-500 shadow-lg ring-2 ring-amber-500/20"
                : "bg-white border-slate-200 hover:border-slate-300 hover:shadow-md"
            }`}
          >
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-12 h-12 rounded-xl flex items-center justify-center transition-colors ${
                      activeViewTab === "unclustered"
                        ? "bg-amber-500 text-white shadow-md"
                        : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    <FaCity className="text-xl" />
                  </div>
                  <div>
                    <h3 className="font-black text-lg text-text-primary">Unclustered Districts</h3>
                    <p className="text-xs text-text-secondary">Standalone districts awaiting cluster assignment</p>
                  </div>
                </div>
                {activeViewTab === "unclustered" && (
                  <span className="px-2.5 py-1 text-[11px] font-bold rounded-full bg-amber-500 text-white shadow-xs">
                    Viewing Active
                  </span>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2 mt-2">
                <div className="bg-white/80 border border-slate-200/80 rounded-xl p-2.5 text-center shadow-xs">
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Standalone Districts</p>
                  <p className="text-xl font-black text-amber-600 mt-0.5">{unclusteredDistricts.length}</p>
                </div>
                <div className="bg-white/80 border border-slate-200/80 rounded-xl p-2.5 text-center shadow-xs">
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Total Pincodes</p>
                  <p className="text-xl font-black text-slate-800 mt-0.5">
                    {unclusteredDistricts.reduce((acc, d) => acc + (d.pincodes_count || (d.pincodes?.length || 0)), 0)}
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
              <span className="text-text-secondary font-medium">Click to view direct district cards & coordinates</span>
              <span
                className={`font-bold flex items-center gap-1 ${
                  activeViewTab === "unclustered" ? "text-amber-600" : "text-slate-400"
                }`}
              >
                Explore Districts <FiChevronRight />
              </span>
            </div>
          </div>
        </div>

        {/* ============================================================== */}
        {/* VIEW 1: CLUSTERED DISTRICTS VIEW */}
        {/* ============================================================== */}
        {activeViewTab === "clustered" && (
          <div className="space-y-4">
            {/* Search and Header bar */}
            <div className="card hover:shadow-xl transition-all duration-300">
              <div className="p-5">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-linear-to-br from-primary to-primary-end text-white shadow-sm">
                      <FaLayerGroup className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-bold text-text-primary">Formed Franchisee Clusters</h3>
                      <p className="text-text-secondary text-sm">
                        Cluster cards for {stateData?.name}. Expand a cluster to inspect its associated districts.
                      </p>
                    </div>
                  </div>
                  <div className="px-3.5 py-1.5 bg-primary/10 text-primary rounded-full text-xs font-bold">
                    {clusters.length} {clusters.length === 1 ? "Cluster" : "Clusters"} Active
                  </div>
                </div>

                <div className="relative">
                  <FaSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search by cluster name, cluster code, or district name..."
                    className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded-xl text-xs focus:outline-hidden focus:border-primary focus:ring-1 focus:ring-primary"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery("")}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs"
                    >
                      <FaTimes />
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Clusters List */}
            {clustersLoading ? (
              <div className="card p-12 text-center text-slate-500 text-sm flex items-center justify-center gap-3">
                <FaSpinner className="animate-spin text-primary text-xl" />
                <span>Loading formed franchisee clusters...</span>
              </div>
            ) : filteredClusters.length === 0 ? (
              <div className="card p-12 text-center border-2 border-dashed border-slate-200 rounded-2xl">
                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-3 text-primary">
                  <FaBoxes className="text-2xl" />
                </div>
                <h4 className="text-base font-bold text-slate-800">
                  {clusters.length === 0
                    ? `No Franchisee Clusters Formed in ${stateData?.name} Yet`
                    : `No clusters matching "${searchQuery}"`}
                </h4>
                <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">
                  {clusters.length === 0
                    ? "Districts in this state have not been assigned to a cluster yet. You can view all standalone districts in the 'Unclustered Districts' tab."
                    : "Try adjusting your search terms or view unclustered districts."}
                </p>
                <div className="mt-4 flex items-center justify-center gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setActiveViewTab("unclustered");
                      setSearchQuery("");
                    }}
                    className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold rounded-xl shadow-xs transition-colors"
                  >
                    View Unclustered Districts ({unclusteredDistricts.length})
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredClusters.map((clu) => {
                  const cluId = (clu._id || clu.id || "").toString();
                  const isExpanded = expandedClusterIds.has(cluId);
                  const distList = clusterDistrictMap.get(cluId) || [];
                  const totalPinsInCluster = distList.reduce(
                    (acc, d) => acc + (d.pincodes_count || (d.pincodes?.length || 0)),
                    0
                  );

                  return (
                    <div
                      key={cluId}
                      className="card border border-slate-200/90 hover:border-primary/50 transition-all duration-200 shadow-xs hover:shadow-md rounded-2xl overflow-hidden bg-white"
                    >
                      {/* Cluster Card Header */}
                      <div className="p-4 sm:p-5 bg-linear-to-r from-slate-50/90 via-white to-primary/5 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                          <div className="w-11 h-11 rounded-xl bg-linear-to-br from-primary to-primary-end flex items-center justify-center text-white shadow-sm shrink-0">
                            <FaSitemap className="text-lg" />
                          </div>
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <h4 className="font-extrabold text-base text-slate-900">
                                {clu.cluster_name || "Franchisee Cluster"}
                              </h4>
                              {clu.cluster_code && (
                                <span className="font-mono text-[11px] font-bold px-2 py-0.5 rounded-md bg-slate-200/80 text-slate-800">
                                  {clu.cluster_code}
                                </span>
                              )}
                              <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-emerald-100 text-emerald-800">
                                {clu.status || "Active"}
                              </span>
                            </div>

                            <p className="text-xs text-slate-500 mt-1 flex flex-wrap items-center gap-2">
                              <span>State: <strong className="text-slate-700">{stateData?.name}</strong></span>
                              {(clu.serviced_warehouse_name || clu.warehouse_name) && (
                                <>
                                  <span>•</span>
                                  <span className="flex items-center gap-1 text-primary font-medium">
                                    <FaWarehouse className="text-[10px]" />
                                    {clu.serviced_warehouse_name || clu.warehouse_name}
                                  </span>
                                </>
                              )}
                            </p>
                          </div>
                        </div>

                        {/* Cluster Metrics & Accordion Toggle */}
                        <div className="flex items-center justify-between md:justify-end gap-3 shrink-0">
                          <div className="flex items-center gap-2 text-xs">
                            <span className="px-3 py-1 bg-white border border-slate-200 rounded-lg text-slate-700 font-semibold shadow-2xs">
                              <strong className="text-primary font-bold">{distList.length}</strong> Districts
                            </span>
                            <span className="px-3 py-1 bg-white border border-slate-200 rounded-lg text-slate-700 font-semibold shadow-2xs">
                              <strong className="text-emerald-600 font-bold">{totalPinsInCluster}</strong> Pincodes
                            </span>
                          </div>

                          <button
                            type="button"
                            onClick={() => toggleClusterExpand(cluId)}
                            className="px-3 py-1.5 rounded-xl border border-slate-200 hover:border-primary text-xs font-bold text-slate-700 hover:text-primary bg-white transition-colors flex items-center gap-1.5 shadow-2xs"
                          >
                            <span>{isExpanded ? "Collapse" : "View Districts"}</span>
                            {isExpanded ? <FaChevronUp className="text-[10px]" /> : <FaChevronDown className="text-[10px]" />}
                          </button>
                        </div>
                      </div>

                      {/* Expanded Districts Grid */}
                      {isExpanded && (
                        <div className="p-4 sm:p-5 bg-slate-50/50">
                          {distList.length === 0 ? (
                            <div className="p-6 text-center text-slate-500 text-xs bg-white rounded-xl border border-dashed border-slate-200">
                              <FaMapMarkerAlt className="text-slate-300 text-2xl mx-auto mb-1.5" />
                              <p className="font-semibold text-slate-700">No Districts Mapped</p>
                              <p className="text-slate-400 mt-0.5">
                                This cluster does not currently have active districts mapped in the system.
                              </p>
                            </div>
                          ) : (
                            <div>
                              <div className="flex items-center justify-between mb-3">
                                <p className="text-xs font-bold text-slate-600 uppercase tracking-wider">
                                  Districts in {clu.cluster_name} ({distList.length})
                                </p>
                              </div>
                              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                                {distList.map((d) => renderDistrictCard(d, true, clu.cluster_name))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ============================================================== */}
        {/* VIEW 2: UNCLUSTERED DISTRICTS VIEW */}
        {/* ============================================================== */}
        {activeViewTab === "unclustered" && (
          <div className="space-y-4">
            {/* Search and Header bar */}
            <div className="card hover:shadow-xl transition-all duration-300">
              <div className="p-5">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-linear-to-br from-amber-500 to-amber-600 text-white shadow-sm">
                      <FaCity className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-bold text-text-primary">Standalone / Unclustered Districts</h3>
                      <p className="text-text-secondary text-sm">
                        Active districts in {stateData?.name} that do not belong to any cluster yet.
                      </p>
                    </div>
                  </div>
                  <div className="px-3.5 py-1.5 bg-amber-100 text-amber-800 rounded-full text-xs font-bold">
                    {unclusteredDistricts.length} {unclusteredDistricts.length === 1 ? "District" : "Districts"} Available
                  </div>
                </div>

                <div className="relative">
                  <FaSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      setCurrentPage(1);
                    }}
                    placeholder="Search standalone districts by name..."
                    className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded-xl text-xs focus:outline-hidden focus:border-primary focus:ring-1 focus:ring-primary"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery("")}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs"
                    >
                      <FaTimes />
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Unclustered Grid */}
            {unclusteredDistricts.length === 0 ? (
              <div className="card p-12 text-center border-2 border-dashed border-slate-200 rounded-2xl">
                <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-3 text-emerald-600">
                  <FaCheckCircle className="text-2xl" />
                </div>
                <h4 className="text-base font-bold text-slate-800">
                  All Active Districts Are Clustered!
                </h4>
                <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">
                  Every active district in {stateData?.name} has already been assigned to a franchisee cluster.
                </p>
                <div className="mt-4 flex items-center justify-center">
                  <button
                    type="button"
                    onClick={() => {
                      setActiveViewTab("clustered");
                      setSearchQuery("");
                    }}
                    className="px-4 py-2 bg-primary hover:bg-primary-end text-white text-xs font-bold rounded-xl shadow-xs transition-colors"
                  >
                    View Clustered Districts ({clusteredDistricts.length})
                  </button>
                </div>
              </div>
            ) : filteredUnclusteredDistricts.length === 0 ? (
              <div className="card p-12 text-center text-slate-500">
                <FaSearch className="text-2xl text-slate-300 mx-auto mb-2" />
                <p className="font-semibold text-sm text-slate-700">No Standalone Districts Match Your Search</p>
                <p className="text-xs text-slate-400 mt-1">
                  No unclustered district found matching "{searchQuery}".
                </p>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {currentUnclusteredDistricts.map((d) => renderDistrictCard(d, false))}
                </div>

                <div className="mt-6">
                  <Pagination
                    currentPage={currentPage}
                    totalPages={totalPages}
                    onPageChange={handlePageChange}
                    totalItems={filteredUnclusteredDistricts.length}
                    pageSize={itemsPerPage}
                    className="mt-6 border-t border-border pt-4"
                  />
                </div>
              </>
            )}
          </div>
        )}

        {/* ✅ Pincodes & Coordinates Viewer Modal */}
        {selectedDistrictForPincodes && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
            <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
              {/* Modal Header */}
              <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500 flex items-center justify-center text-white shadow-md">
                    <FaMapPin className="text-base" />
                  </div>
                  <div>
                    <h3 className="font-bold text-base flex items-center gap-2">
                      <span>{selectedDistrictForPincodes.name}</span>
                      <span className="text-xs font-normal text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-800">
                        {stateData?.name}
                      </span>
                    </h3>
                    <p className="text-slate-400 text-xs mt-0.5">
                      Pincodes List & Geographic Coordinates (Latitude / Longitude)
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedDistrictForPincodes(null)}
                  className="text-slate-400 hover:text-white p-1 rounded-md transition-colors"
                >
                  <FaTimes className="text-base" />
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-6 space-y-4">
                {/* District Overview Card */}
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex flex-wrap items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div>
                      <p className="text-[10px] uppercase font-bold text-slate-500">District Center Coordinates</p>
                      <p className="font-mono font-bold text-sm text-slate-800 mt-0.5">
                        {selectedDistrictForPincodes.lat || selectedDistrictForPincodes.lng
                          ? `Lat: ${Number(selectedDistrictForPincodes.lat).toFixed(4)} • Lng: ${Number(selectedDistrictForPincodes.lng).toFixed(4)}`
                          : "Not calibrated"}
                      </p>
                    </div>
                  </div>
                  <div className="px-3.5 py-1.5 bg-emerald-100 text-emerald-800 rounded-full font-bold text-xs">
                    {activeDistrictPincodes.length} Pincodes Covered
                  </div>
                </div>

                {/* Search Bar */}
                <div className="relative">
                  <FaSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs" />
                  <input
                    type="text"
                    value={pincodeSearchQuery}
                    onChange={(e) => setPincodeSearchQuery(e.target.value)}
                    placeholder="Search by 6-digit pincode, locality, or area name..."
                    className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded-xl text-xs focus:outline-hidden focus:border-primary focus:ring-1 focus:ring-primary"
                  />
                </div>

                {/* Table */}
                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <div className="max-h-72 overflow-y-auto">
                    {districtPincodesLoading ? (
                      <div className="p-8 text-center text-slate-500 text-xs flex items-center justify-center gap-2">
                        <FaSpinner className="animate-spin text-primary" />
                        <span>Loading district pincodes...</span>
                      </div>
                    ) : filteredModalPincodes.length === 0 ? (
                      <div className="p-10 text-center text-slate-500">
                        <FaMapPin className="text-3xl text-slate-300 mx-auto mb-2" />
                        <p className="font-semibold text-sm text-slate-700">No Pincodes Found</p>
                        <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                          {pincodeSearchQuery
                            ? `No pincode matching "${pincodeSearchQuery}".`
                            : "No pincodes have been uploaded for this district yet. You can upload pincodes using the Bulk Upload feature in Active States."}
                        </p>
                      </div>
                    ) : (
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-100 text-[10px] font-bold text-slate-600 uppercase border-b border-slate-200 sticky top-0">
                          <tr>
                            <th className="px-4 py-2.5">#</th>
                            <th className="px-4 py-2.5">Pincode</th>
                            <th className="px-4 py-2.5">Locality / Area</th>
                            <th className="px-4 py-2.5">Latitude</th>
                            <th className="px-4 py-2.5">Longitude</th>
                            <th className="px-4 py-2.5 text-center">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-slate-700">
                          {filteredModalPincodes.map((pin, idx) => (
                            <tr key={idx} className="hover:bg-slate-50/80">
                              <td className="px-4 py-2 text-slate-400 font-mono text-[11px]">{idx + 1}</td>
                              <td className="px-4 py-2 font-mono font-bold text-primary text-xs">
                                {pin.pincode}
                              </td>
                              <td className="px-4 py-2 font-medium">
                                {pin.locality || selectedDistrictForPincodes.name}
                              </td>
                              <td className="px-4 py-2 font-mono text-slate-600 text-[11px]">
                                {pin.lat ? Number(pin.lat).toFixed(4) : "-"}
                              </td>
                              <td className="px-4 py-2 font-mono text-slate-600 text-[11px]">
                                {pin.lng ? Number(pin.lng).toFixed(4) : "-"}
                              </td>
                              <td className="px-4 py-2 text-center">
                                <span className="px-2 py-0.5 bg-green-100 text-green-700 font-bold text-[10px] rounded-full">
                                  Active
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="bg-slate-50 px-6 py-3.5 border-t border-slate-200 flex items-center justify-between">
                <p className="text-xs text-slate-500">
                  Showing {filteredModalPincodes.length} of {activeDistrictPincodes.length} pincodes
                </p>
                <button
                  type="button"
                  onClick={() => setSelectedDistrictForPincodes(null)}
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-lg transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Confirmation Popup */}
        <ConfirmationPopup
          isOpen={confirmationPopup.isOpen}
          title={confirmationPopup.title}
          message={confirmationPopup.message}
          mode={confirmationPopup.mode}
          variant={confirmationPopup.variant}
          confirmText={confirmationPopup.confirmText}
          onConfirm={confirmationPopup.onConfirm}
          onCancel={() => setConfirmationPopup((prev) => ({ ...prev, isOpen: false }))}
          isLoading={loading}
        />
      </RenderIfPermission>
    </div>
  );
}
