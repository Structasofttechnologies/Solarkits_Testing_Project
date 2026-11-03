import { useEffect, useState } from "react";
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
  FaCity
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

  const filteredActiveDistricts = activeDistricts.filter((d) =>
    d.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalPages = Math.ceil(filteredActiveDistricts.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const currentActiveDistricts = filteredActiveDistricts.slice(startIndex, startIndex + itemsPerPage);

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

      {/* ✅ Active Districts Grid */}
      <RenderIfPermission 
        requiredUniqueId={moduleUniqueId}
        permission="view"
      >
        <div className="card hover:shadow-xl transition-all duration-300">
          <div className="p-5">
            <div className="flex justify-end mb-4">
              <span className="text-xs bg-linear-120 from-primary/5 to-primary/15 text-text-secondary px-2 py-1 rounded-full flex items-center gap-1">
                <FiClock size={10} />
                Active districts
              </span>
            </div>

            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-linear-to-br from-green-500 to-green-600 text-white">
                  <FaChartLine className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-text-primary">Active Districts</h3>
                  <p className="text-text-secondary text-sm">View districts, pincodes coverage, and geographical coordinates</p>
                </div>
              </div>
              <div className="px-4 py-2 bg-green-100 text-green-700 rounded-full text-sm font-semibold">
                {activeDistricts.length} {activeDistricts.length === 1 ? "District" : "Districts"} Active
              </div>
            </div>

            <div>
              <SearchInputWithDropdown
                options={currentActiveDistricts}
                value={null}
                inputValue={searchQuery}
                onInputChange={(val) => {
                  setSearchQuery(val);
                  setCurrentPage(1);
                }}
                onChange={(selectedValue) => {
                  const selected = districts.find((d) => d.value === selectedValue);
                  setSearchQuery(selected?.name || "");
                  setCurrentPage(1);
                }}
                placeholder="Search active districts by name..."
                className="w-full"
              />
              {searchQuery && (
                <p className="mt-2 text-sm text-text-secondary">
                  Found {filteredActiveDistricts.length} active districts matching "{searchQuery}"
                </p>
              )}
            </div>
          </div>
        </div>

        {activeDistricts.length === 0 ? (
          <div className="card hover:shadow-xl transition-all duration-300 ">
            <div className="p-5">
              <div className="bg-primary/5 rounded-xl border-2 border-dashed border-primary/30 p-12 text-center">
                <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
                  <FaMapMarkerAlt className="text-primary text-3xl" />
                </div>
                <h3 className="text-xl font-semibold text-text-primary mb-2">No Active Districts</h3>
                <p className="text-text-secondary max-w-md mx-auto text-sm">Activate a district to start managing its pincodes, urban, and rural areas.</p>
              </div>
            </div>
          </div>
        ) : (
          <>
            {/* Active Districts Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {currentActiveDistricts.map((d, index) => {
                const pincodesCount = d.pincodes_count || (d.pincodes ? d.pincodes.length : 0);
                const hasCoords = (d.lat && Number(d.lat) !== 0) || (d.lng && Number(d.lng) !== 0);

                return (
                  <div
                    key={d.id || index}
                    className="card hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1 group border border-slate-200/80 hover:border-primary/40 flex flex-col justify-between"
                  >
                    <div className="p-5">
                      {/* Header */}
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-linear-to-br from-primary to-primary-end flex items-center justify-center shadow-sm">
                            <FaMapMarkerAlt className="text-white text-lg" />
                          </div>
                          <div>
                            <h3 className="font-bold text-text-primary group-hover:text-primary transition-colors">
                              {d.name}
                            </h3>
                            <p className="text-xs text-text-secondary flex items-center mt-0.5">
                              <FaCheckCircle className="text-success mr-1 w-3 h-3" />
                              Active
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Coordinates Pill */}
                      <div className="mb-3.5 bg-slate-50 border border-slate-200/80 rounded-lg px-2.5 py-1.5 flex items-center justify-between text-[11px]">
                        <span className="text-slate-500 font-medium flex items-center gap-1">
                          <FaCompass className="text-primary text-xs" /> Coordinates
                        </span>
                        <span className="font-mono text-slate-800 font-semibold">
                          {hasCoords ? `${Number(d.lat).toFixed(4)}, ${Number(d.lng).toFixed(4)}` : "Lat/Lng not set"}
                        </span>
                      </div>

                      {/* Stats Grid: Pincodes & Urban/Rural */}
                      <div className="grid grid-cols-2 gap-2 mb-4">
                        <div className="bg-emerald-50/80 border border-emerald-100 rounded-lg p-2 text-center">
                          <div className="flex items-center justify-center gap-1 mb-1">
                            <FaMapPin className="text-emerald-600 text-xs" />
                            <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider">Pincodes</span>
                          </div>
                          <p className="text-base font-black text-emerald-950">{pincodesCount}</p>
                        </div>
                        <div className="bg-blue-50/80 border border-blue-100 rounded-lg p-2 text-center">
                          <div className="flex items-center justify-center gap-1 mb-1">
                            <FaBuilding className="text-blue-600 text-xs" />
                            <span className="text-[10px] font-bold text-blue-700 uppercase tracking-wider">Cities</span>
                          </div>
                          <p className="text-xs font-bold text-blue-900 mt-1">
                            {d.urban_cities_count || 0}U • {d.rural_cities_count || 0}R
                          </p>
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="space-y-2 pt-2 border-t border-slate-100">
                        {/* View Pincodes & Coordinates button */}
                        <button
                          type="button"
                          onClick={() => handleOpenPincodesModal(d)}
                          className="w-full py-2 px-3 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 hover:text-emerald-800 text-xs font-bold rounded-lg border border-emerald-200 transition-colors flex items-center justify-center gap-1.5"
                        >
                          <FaMapPin className="text-xs" />
                          <span>View Pincodes & Coordinates</span>
                        </button>

                        {/* Explore Cities Navigation */}
                        <button
                          type="button"
                          onClick={() =>
                            navigate(location.pathname.replace("/active-districts", "/urban-cities"), {
                              state: {
                                district: {
                                  id: d.id,
                                  name: d.name,
                                },
                                state: stateData,
                                country,
                              },
                            })
                          }
                          className="w-full py-1.5 px-3 text-slate-500 hover:text-primary text-[11px] font-medium transition-colors flex items-center justify-center gap-1"
                        >
                          <span>Explore Urban & Rural Cities</span>
                          <FiChevronRight className="text-xs" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="mt-6">
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={handlePageChange}
                totalItems={filteredActiveDistricts.length}
                pageSize={itemsPerPage}
                className="mt-6 border-t border-border pt-4"
              />
            </div>
          </>
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
