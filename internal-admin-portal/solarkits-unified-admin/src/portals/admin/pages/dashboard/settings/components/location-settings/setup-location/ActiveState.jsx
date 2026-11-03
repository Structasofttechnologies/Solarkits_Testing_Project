import { useEffect, useState } from "react";
import axios from "axios";
import { authHeaderObj } from "@/app/authHeader";
import {
  FaMapMarkerAlt,
  FaSpinner,
  FaCheckCircle,
  FaPlus,
  FaChartLine,
  FaMap,
  FaGlobeAmericas,
  FaBan,
  FaClock,
  FaMapPin,
  FaUpload,
  FaDownload,
  FaFileExcel,
  FaFileCsv,
  FaTimes,
  FaCheck
} from "react-icons/fa";
import DropdownWithSearchInput from "@/components/DropdownWithSearchInput";
import SearchInputWithDropdown from "@/components/SearchInputWithDropdown";
import Dropdown from "@/components/Dropdown";
import ConfirmationPopup from "@/components/ConfirmationPopup";
import { useDispatch } from "react-redux";
import { setAlert } from "@/features/alert.slice";
import { useLocation, useNavigate } from "react-router-dom";
import ReactCountryFlag from "react-country-flag";
import Loader from "@/components/Loader";
import Button from "@/components/Button";
import IconButton from "@/components/IconButton";
import { FiChevronLeft, FiChevronRight, FiChevronsLeft, FiChevronsRight } from "react-icons/fi";
import RenderIfPermission, { useHasPermission } from "@/components/PermissionCheck";
import PageHeader from "@/components/PageHeader";
import Pagination from "@/components/Pagination";
import readXlsxFile from "read-excel-file";

export default function ActiveStates({ moduleUniqueId }) {
  const hasEditPermission = useHasPermission({ requiredUniqueId: moduleUniqueId, permission: "edit" });
  const [states, setStates] = useState([]);
  const [stateItem, setStateItem] = useState(null);
  const [loading, setLoading] = useState(false);
  const [activating, setActivating] = useState(false);
  const [error, setError] = useState(null);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(8);

  // Search state
  const [searchQuery, setSearchQuery] = useState("");

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

  // Bulk Upload Modal state
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [uploadFile, setUploadFile] = useState(null);
  const [parsedData, setParsedData] = useState([]);
  const [uploadStats, setUploadStats] = useState({ total: 0, states: 0, districts: 0, pincodes: 0 });
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState(null);

  const API_URL = import.meta.env.VITE_API_URL;
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const location = useLocation();
  const country = location.state?.country;

  useEffect(() => {
    if (!country) {
      navigate(location.pathname.replace("/active-states", ""));
      dispatch(
        setAlert({
          message: "Country not found. Redirected to country list.",
          type: "error",
        })
      );
    }
  }, [country, navigate, dispatch]);

  // ✅ Fetch all states for selected country
  useEffect(() => {
    if (!API_URL || !authHeaderObj()?.Authorization || !country?.id) return;
    let isMounted = true;

    const fetchStates = async () => {
      try {
        setLoading(true);
        const res = await axios.post(
          `${API_URL}/geolocation/states?unique_id=${moduleUniqueId}&req_for=view`,
          { country_id: country.id },
          { headers: { ...authHeaderObj() } }
        );

        if (!isMounted) return;

        const formatted = res.data.states.map((s) => ({
          text: s.name,
          value: s.id,
          ...s,
        }));

        setStates(formatted);
        setCurrentPage(1);
      } catch (err) {
        console.error("❌ Error fetching states:", err);
        setError("Failed to load states.");
        dispatch(setAlert({ message: "Failed to load states.", type: "error" }));
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchStates();
    return () => {
      isMounted = false;
    };
  }, [country?.id]);

  const refreshStates = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await axios.post(
        `${API_URL}/geolocation/states?unique_id=${moduleUniqueId}&req_for=view`,
        { country_id: country.id },
        { headers: { ...authHeaderObj() } }
      );

      const formatted = res.data.states.map((s) => ({
        text: s.name,
        value: s.id,
        ...s,
      }));

      setStates(formatted);
    } catch (err) {
      console.error("❌ Error refreshing states:", err);
      setError("Failed to reload states.");
    } finally {
      setLoading(false);
    }
  };

  const handleActivate = async () => {
    if (!stateItem) {
      dispatch(setAlert({ message: "Please select a state first.", type: "error" }));
      return;
    }

    try {
      setActivating(true);
      const res = await axios.post(
        `${API_URL}/geolocation/activate-state?unique_id=${moduleUniqueId}&req_for=edit`,
        { state_id: stateItem },
        { headers: { ...authHeaderObj() } }
      );

      if (res.data.status === "success") {
        dispatch(setAlert({ message: res.data.message, type: "success" }));
        setStateItem(null);
        await refreshStates();
      } else {
        dispatch(setAlert({ message: res.data.message || "Failed to activate state.", type: "error" }));
      }
    } catch (err) {
      console.error("❌ Activation Error:", err);
      const msg = err.response?.data?.message || "Something went wrong while activating state.";
      dispatch(setAlert({ message: msg, type: "error" }));
    } finally {
      setActivating(false);
    }
  };

  const handleDeactivate = (state) => {
    setConfirmationPopup({
      isOpen: true,
      title: "Deactivate State",
      message: `Are you sure you want to deactivate "${state.name}"? This action will disable all associated districts, zones, and clusters.`,
      mode: "text",
      variant: "danger",
      confirmText: "Send OTP & Proceed",
      onConfirm: async () => {
        try {
          const res = await axios.post(
            `${API_URL}/geolocation/request-deactivation-otp?unique_id=${moduleUniqueId}&req_for=add`,
            {
              type: "state",
              country: country.name,
              state: state.name,
            },
            { headers: { ...authHeaderObj() } }
          );

          if (res.data.status === "success") {
            dispatch(setAlert({ message: "OTP sent successfully to your registered email.", type: "success" }));

            setConfirmationPopup({
              isOpen: true,
              title: "Verify OTP for State Deactivation",
              message: `Please enter the 6-digit OTP sent to your email to confirm the deactivation of "${state.name}".`,
              mode: "otp",
              variant: "danger",
              confirmText: "Verify & Deactivate",
              onConfirm: async (otp) => {
                try {
                  const verifyRes = await axios.post(
                    `${API_URL}/geolocation/deactivate-state?unique_id=${moduleUniqueId}&req_for=edit`,
                    {
                      state_id: state.id,
                      otp: otp,
                    },
                    { headers: { ...authHeaderObj() } }
                  );

                  if (verifyRes.data.status === "success") {
                    dispatch(setAlert({ message: verifyRes.data.message, type: "success" }));
                    setConfirmationPopup((prev) => ({ ...prev, isOpen: false }));
                    await refreshStates();
                  } else {
                    dispatch(setAlert({ message: verifyRes.data.message || "Failed to deactivate state.", type: "error" }));
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

  // ✅ Download Sample CSV Template
  const downloadSampleTemplate = () => {
    const csvContent = "data:text/csv;charset=utf-8," + 
      "State,District,Pincode,Latitude,Longitude,Locality\n" +
      "Rajasthan,Jaipur,302022,26.8500,75.8200,Sitapura Industrial Area\n" +
      "Rajasthan,Jaipur,302001,26.9200,75.8100,MI Road\n" +
      "Rajasthan,Jodhpur,342001,26.2900,73.0200,Ratanada\n" +
      "Gujarat,Devbhoomi Dwarka,361305,22.2400,68.9700,Dwarka\n" +
      "Gujarat,Ahmedabad,380001,23.0300,72.5800,Bhadra\n" +
      "Maharashtra,Pune,411001,18.5204,73.8567,Shivajinagar\n";
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "sample_locations_template.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // ✅ Parse uploaded Excel / CSV
  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploadError(null);
      setUploadFile(file);

      const fileName = file.name.toLowerCase();
      let rawRows = [];

      if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls')) {
        const rows = await readXlsxFile(file);
        if (!rows || rows.length < 2) {
          throw new Error("Excel file is empty or does not contain data rows.");
        }
        const headers = rows[0].map(h => (h || '').toString().trim());
        rawRows = rows.slice(1).map(r => {
          const obj = {};
          headers.forEach((h, idx) => {
            obj[h] = r[idx] !== null && r[idx] !== undefined ? r[idx] : '';
          });
          return obj;
        });
      } else if (fileName.endsWith('.csv') || fileName.endsWith('.txt')) {
        const text = await file.text();
        const lines = text.split(/\r\n|\n/).filter(line => line.trim().length > 0);
        if (lines.length < 2) {
          throw new Error("CSV file is empty or does not contain data rows.");
        }
        const parseCSVLine = (line) => {
          const values = [];
          let inQuotes = false;
          let current = '';
          for (let i = 0; i < line.length; i++) {
            const c = line[i];
            if (c === '"' || c === "'") inQuotes = !inQuotes;
            else if (c === ',' && !inQuotes) {
              values.push(current.trim());
              current = '';
            } else current += c;
          }
          values.push(current.trim());
          return values;
        };

        const headers = parseCSVLine(lines[0]);
        rawRows = lines.slice(1).map(line => {
          const vals = parseCSVLine(line);
          const obj = {};
          headers.forEach((h, idx) => {
            obj[h] = vals[idx] || '';
          });
          return obj;
        });
      } else {
        throw new Error("Unsupported file type. Please upload a .csv, .xlsx, or .xls file.");
      }

      // Flexible column detection & normalization
      const normalized = rawRows.map(row => {
        const keys = Object.keys(row);
        const findVal = (patterns) => {
          for (const pat of patterns) {
            const matchKey = keys.find(k => k.trim().toLowerCase() === pat.toLowerCase() || k.trim().toLowerCase().replace(/[^a-z0-9]/g, '') === pat.toLowerCase().replace(/[^a-z0-9]/g, ''));
            if (matchKey && row[matchKey] !== undefined && row[matchKey] !== null && row[matchKey] !== '') {
              return row[matchKey];
            }
          }
          return '';
        };

        const state = (findVal(['state', 'state_name', 'statename', 'st_name', 'state / ut', 'state name']) || '').toString().trim();
        const district = (findVal(['district', 'district_name', 'districtname', 'dist_name', 'dist', 'district name']) || '').toString().trim();
        const pincode = (findVal(['pincode', 'pin_code', 'pin code', 'pin', 'postal_code', 'postalcode', 'zip', 'zipcode']) || '').toString().trim();
        const lat = findVal(['latitude', 'lat', 'latitude_deg', 'lat_deg', 'y']);
        const lng = findVal(['longitude', 'lng', 'long', 'lon', 'longitude_deg', 'lng_deg', 'x']);
        const locality = (findVal(['locality', 'area', 'city', 'taluk', 'tehsil', 'subdistrict', 'village', 'office_name', 'officename']) || '').toString().trim();

        return {
          state,
          district,
          pincode,
          lat: lat !== '' && !isNaN(Number(lat)) ? Number(lat) : 0,
          lng: lng !== '' && !isNaN(Number(lng)) ? Number(lng) : 0,
          locality
        };
      }).filter(r => r.state && r.district);

      if (normalized.length === 0) {
        throw new Error("No valid State and District rows found. Please check column headers (State, District, Pincode, Lat, Lng).");
      }

      const uniqueStates = new Set(normalized.map(r => r.state.toLowerCase())).size;
      const uniqueDistricts = new Set(normalized.map(r => `${r.state.toLowerCase()}-${r.district.toLowerCase()}`)).size;
      const uniquePincodes = new Set(normalized.filter(r => r.pincode).map(r => r.pincode)).size;

      setParsedData(normalized);
      setUploadStats({
        total: normalized.length,
        states: uniqueStates,
        districts: uniqueDistricts,
        pincodes: uniquePincodes
      });
    } catch (err) {
      console.error("File parse error:", err);
      setUploadError(err.message || "Failed to parse file.");
      setParsedData([]);
      setUploadStats({ total: 0, states: 0, districts: 0, pincodes: 0 });
    }
  };

  // ✅ Submit Bulk Upload to Backend
  const handleConfirmUpload = async () => {
    if (!parsedData || parsedData.length === 0) {
      dispatch(setAlert({ message: "No parsed data to import.", type: "error" }));
      return;
    }

    try {
      setIsUploading(true);
      const res = await axios.post(
        `${API_URL}/geolocation/bulk-upload-locations`,
        {
          country_id: country?.id,
          country_name: country?.name || "India",
          locations: parsedData
        },
        { headers: { ...authHeaderObj() } }
      );

      dispatch(setAlert({
        message: res.data?.message || "Locations imported successfully!",
        type: "success"
      }));

      setIsUploadModalOpen(false);
      setUploadFile(null);
      setParsedData([]);
      await refreshStates();
    } catch (err) {
      console.error("Bulk upload submit error:", err);
      const errMsg = err.response?.data?.message || err.message || "Failed to upload locations.";
      dispatch(setAlert({ message: errMsg, type: "error" }));
      setUploadError(errMsg);
    } finally {
      setIsUploading(false);
    }
  };

  const activeStates = states.filter((s) => s.is_active);
  const inactiveStates = states.filter((s) => !s.is_active);

  const filteredActiveStates = activeStates.filter((s) =>
    s.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalPages = Math.ceil(filteredActiveStates.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const currentActiveStates = filteredActiveStates.slice(startIndex, startIndex + itemsPerPage);

  const handlePageChange = (page) => {
    setCurrentPage(page);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <PageHeader
          icon={FaMap}
          title={
            <div className="flex items-center gap-3">
              <span className="text-xl font-bold text-text-primary">
                Setup Locations
              </span>
              <span className="text-sm font-semibold text-text-secondary bg-primary/10 px-2 py-0.5 rounded-full">
                Active States
              </span>
            </div>
          }
          description="Manage states, active districts, and pincodes for your selected country."
          backButton={{
            label: "Back to Countries",
            onClick: () => navigate(location.pathname.replace("/active-states", "")),
          }}
        />
      </div>

      <div className="card hover:shadow-xl transition-all duration-300">
        <div className="p-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center bg-linear-to-br from-primary/10 to-primary/20 text-primary shadow-inner">
                {country?.iso2 ? (
                  <ReactCountryFlag
                    countryCode={country.iso2}
                    svg
                    style={{
                      width: "36px",
                      height: "36px",
                      borderRadius: "8px",
                    }}
                    title={country.name}
                  />
                ) : (
                  <FaGlobeAmericas className="text-2xl" />
                )}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-bold text-text-primary">
                    {country?.name || "Country"}
                  </h2>
                  <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-green-100 text-green-700">
                    Active
                  </span>
                </div>
                <p className="text-text-secondary text-sm">
                  {country?.iso2 && `Code: ${country.iso2} • `}
                  {country?.currency_name && `${country.currency_name} (${country?.currency_code || ""})`}
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-xs text-text-secondary">Country ID</p>
              <p className="text-sm font-mono text-text-primary">{country?.id}</p>
            </div>
          </div>
        </div>
      </div>

      {/* ✅ Add/Activate State */}
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
                  <h3 className="font-bold text-text-primary">Activate State</h3>
                  <p className="text-text-secondary text-sm">Choose an inactive state to enable it</p>
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <div className="flex-1">
                <DropdownWithSearchInput
                  options={inactiveStates}
                  value={stateItem}
                  onChange={(val) => setStateItem(val)}
                  placeholder="Select state to activate..."
                  className="w-full"
                />
              </div>
              <Button
                variant="primary"
                onClick={handleActivate}
                disabled={!stateItem || activating}
                icon={FaPlus}
                iconPosition="left"
                isLoading={activating}
                loadingText="Activating..."
                className="whitespace-nowrap"
              >
                Activate State
              </Button>
            </div>

            {inactiveStates.length === 0 && (
              <p className="text-xs text-text-secondary mt-2">
                All available states for this country are currently active.
              </p>
            )}
          </div>
        </div>
      </RenderIfPermission>

      {/* ✅ Deactivate State */}
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
                  <h3 className="font-bold text-text-primary">Deactivate State</h3>
                  <p className="text-text-secondary text-sm">Disable an active state and its components</p>
                </div>
              </div>
            </div>

            {activeStates.length > 0 ? (
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                <div className="flex-1">
                  <Dropdown
                    options={activeStates.map((s) => ({ text: s.name, value: s.id, ...s }))}
                    value={deactivateOTP}
                    onChange={(val) => setDeactivateOTP(val)}
                    placeholder="Select active state to deactivate..."
                    className="w-full"
                  />
                </div>
                <Button
                  variant="danger"
                  onClick={() => {
                    const st = activeStates.find((s) => s.id === deactivateOTP);
                    if (st) handleDeactivate(st);
                  }}
                  disabled={!deactivateOTP}
                  icon={FaBan}
                  iconPosition="left"
                  className="whitespace-nowrap"
                >
                  Deactivate State
                </Button>
              </div>
            ) : (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-yellow-500"></div>
                  <p className="text-xs text-yellow-800">
                    No active states found. Activate a state first to enable deactivation.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </RenderIfPermission>

      {/* ✅ Active States Grid */}
      <RenderIfPermission 
        requiredUniqueId={moduleUniqueId}
        permission="view"
      >
        <div className="card hover:shadow-xl transition-all duration-300">
          <div className="p-5">
            <div className="flex justify-end mb-4">
              <span className="text-xs bg-linear-120 from-primary/5 to-primary/15 text-text-secondary px-2 py-1 rounded-full flex items-center gap-1">
                <FaClock size={10} />
                Active states
              </span>
            </div>

            {/* Header + Bulk Upload Buttons */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-linear-to-br from-green-500 to-green-600 text-white">
                  <FaChartLine className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-text-primary">Active States</h3>
                  <p className="text-text-secondary text-sm">Manage your active states, districts, and pincodes</p>
                </div>
              </div>
              
              <div className="flex items-center gap-2 flex-wrap">
                {/* Download Sample CSV */}
                <button
                  type="button"
                  onClick={downloadSampleTemplate}
                  className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors border border-slate-300 shadow-sm"
                  title="Download sample CSV template with State, District, Pincode, Lat, Long"
                >
                  <FaDownload className="text-slate-600 text-xs" />
                  <span>Sample CSV Template</span>
                </button>

                {/* Bulk Upload Button */}
                <button
                  type="button"
                  onClick={() => {
                    setUploadError(null);
                    setUploadFile(null);
                    setParsedData([]);
                    setUploadStats({ total: 0, states: 0, districts: 0, pincodes: 0 });
                    setIsUploadModalOpen(true);
                  }}
                  className="px-3.5 py-2 bg-primary hover:bg-primary-hover text-white text-xs font-bold rounded-lg flex items-center gap-1.5 transition-all shadow-md hover:shadow-lg"
                >
                  <FaUpload className="text-xs" />
                  <span>Bulk Upload (CSV / Excel)</span>
                </button>

                <div className="px-3.5 py-2 bg-green-100 text-green-700 rounded-full text-xs font-bold">
                  {activeStates.length} {activeStates.length === 1 ? "State" : "States"} Active
                </div>
              </div>
            </div>

            <div className="mb-6">
              <SearchInputWithDropdown
                options={currentActiveStates}
                value={null}
                inputValue={searchQuery}
                onInputChange={(val) => {
                  setSearchQuery(val);
                  setCurrentPage(1);
                }}
                onChange={(selectedValue) => {
                  const selected = states.find((s) => s.value === selectedValue);
                  setSearchQuery(selected?.name || "");
                  setCurrentPage(1);
                }}
                placeholder="Search active states by name..."
                className="w-full"
              />
              {searchQuery && (
                <p className="mt-2 text-sm text-text-secondary">
                  Found {filteredActiveStates.length} active states matching "{searchQuery}"
                </p>
              )}
            </div>
          </div>
        </div>

        {activeStates.length === 0 ? (
          <div className="card p-5">
            <div className="bg-primary/5 rounded-xl border-2 border-dashed border-primary/30 p-12 text-center">
              <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
                <FaMapMarkerAlt className="text-primary text-3xl" />
              </div>
              <h3 className="text-xl font-semibold text-text-primary mb-2">No Active States</h3>
              <p className="text-text-secondary max-w-md mx-auto text-sm">
                Activate your first state or use Bulk Upload to import states and districts with pincodes.
              </p>
            </div>
          </div>
        ) : (
          <>
            {/* Active States Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {currentActiveStates.map((state, index) => (
                <div
                  key={state.id || index}
                  className="card hover:shadow-lg transition-all duration-300 cursor-pointer transform hover:-translate-y-1 group"
                  onClick={() =>
                    navigate(
                      location.pathname.replace("/active-states", "/active-districts"),
                      {
                        state: {
                          state: {
                            id: state.id,
                            name: state.name,
                          },
                          country
                        },
                      }
                    )
                  }
                >
                  <div className="p-5">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-linear-to-br from-primary to-primary-end flex items-center justify-center shadow-sm">
                          <FaMapMarkerAlt className="text-white text-lg" />
                        </div>
                        <div>
                          <h3 className="font-bold text-text-primary group-hover:text-primary transition-colors">
                            {state.name}
                          </h3>
                          <p className="text-xs text-text-secondary flex items-center mt-1">
                            <FaCheckCircle className="text-success mr-1 w-3 h-3" />
                            Active
                          </p>
                        </div>
                      </div>
                      <FiChevronRight className="text-text-secondary group-hover:text-primary transform group-hover:translate-x-1 transition-all" />
                    </div>

                    {/* ✅ Boss Update: Removed Clusters & Zones. Show Active Districts and Total Pincodes */}
                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-blue-50/80 border border-blue-100 rounded-xl p-2.5 text-center">
                        <div className="flex items-center justify-center gap-1 mb-1">
                          <FaMap className="text-blue-600 text-xs" />
                          <span className="text-[10px] font-bold text-blue-700 uppercase tracking-wider">Districts</span>
                        </div>
                        <p className="text-lg font-black text-blue-950">{state.active_districts_count || 0}</p>
                      </div>
                      <div className="bg-emerald-50/80 border border-emerald-100 rounded-xl p-2.5 text-center">
                        <div className="flex items-center justify-center gap-1 mb-1">
                          <FaMapPin className="text-emerald-600 text-xs" />
                          <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider">Pincodes</span>
                        </div>
                        <p className="text-lg font-black text-emerald-950">{state.total_pincodes_count || 0}</p>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination Controls */}
            <div className="mt-6">
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={handlePageChange}
                totalItems={filteredActiveStates.length}
                pageSize={itemsPerPage}
                className="mt-6 border-t border-border pt-4"
              />
            </div>
          </>
        )}
      </RenderIfPermission>

      {/* ✅ Bulk Upload Modal */}
      {isUploadModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-primary flex items-center justify-center text-white">
                  <FaUpload className="text-sm" />
                </div>
                <div>
                  <h3 className="font-bold text-base">Bulk Upload Locations (CSV / Excel)</h3>
                  <p className="text-slate-400 text-xs">Import States, Districts, Pincodes & Coordinates</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsUploadModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-md transition-colors"
              >
                <FaTimes className="text-base" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-5">
              {/* Instructions banner */}
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-3.5 text-xs text-blue-900 flex items-start justify-between gap-3">
                <div>
                  <p className="font-bold mb-1">Supported File Formats: .xlsx, .xls, .csv</p>
                  <p className="text-blue-700 leading-relaxed">
                    Columns required: <strong>State</strong>, <strong>District</strong>. Optional: <strong>Pincode</strong>, <strong>Latitude</strong>, <strong>Longitude</strong>, <strong>Locality</strong>.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={downloadSampleTemplate}
                  className="shrink-0 px-2.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-[11px] font-semibold flex items-center gap-1 shadow-xs transition-colors"
                >
                  <FaDownload className="text-[10px]" /> Sample CSV
                </button>
              </div>

              {/* File Dropzone */}
              <div className="border-2 border-dashed border-slate-300 hover:border-primary rounded-xl p-6 text-center bg-slate-50/50 hover:bg-primary/5 transition-colors cursor-pointer relative">
                <input
                  type="file"
                  accept=".csv, .xlsx, .xls"
                  onChange={handleFileChange}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
                <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center mx-auto mb-3 shadow-md border border-slate-200 text-primary">
                  {uploadFile?.name?.endsWith('.csv') ? (
                    <FaFileCsv className="text-2xl text-emerald-600" />
                  ) : uploadFile ? (
                    <FaFileExcel className="text-2xl text-green-600" />
                  ) : (
                    <FaUpload className="text-xl" />
                  )}
                </div>
                <p className="font-bold text-sm text-slate-800">
                  {uploadFile ? uploadFile.name : "Click to select or drag and drop your file here"}
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  {uploadFile ? `${(uploadFile.size / 1024).toFixed(1)} KB` : "Excel (.xlsx, .xls) or CSV files up to 10MB"}
                </p>
              </div>

              {/* Error Alert */}
              {uploadError && (
                <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-lg text-xs flex items-center gap-2">
                  <FaBan className="shrink-0 text-red-500" />
                  <span>{uploadError}</span>
                </div>
              )}

              {/* Parsed Stats Preview */}
              {parsedData.length > 0 && (
                <div className="space-y-4">
                  <div className="grid grid-cols-4 gap-2">
                    <div className="bg-slate-100 rounded-lg p-2.5 text-center">
                      <p className="text-[10px] uppercase font-bold text-slate-500">Total Rows</p>
                      <p className="text-base font-black text-slate-800">{uploadStats.total}</p>
                    </div>
                    <div className="bg-blue-50 rounded-lg p-2.5 text-center border border-blue-100">
                      <p className="text-[10px] uppercase font-bold text-blue-600">States</p>
                      <p className="text-base font-black text-blue-900">{uploadStats.states}</p>
                    </div>
                    <div className="bg-purple-50 rounded-lg p-2.5 text-center border border-purple-100">
                      <p className="text-[10px] uppercase font-bold text-purple-600">Districts</p>
                      <p className="text-base font-black text-purple-900">{uploadStats.districts}</p>
                    </div>
                    <div className="bg-emerald-50 rounded-lg p-2.5 text-center border border-emerald-100">
                      <p className="text-[10px] uppercase font-bold text-emerald-600">Pincodes</p>
                      <p className="text-base font-black text-emerald-900">{uploadStats.pincodes}</p>
                    </div>
                  </div>

                  {/* Sample rows table */}
                  <div className="border border-slate-200 rounded-lg overflow-hidden">
                    <div className="bg-slate-100 px-3 py-1.5 text-[11px] font-bold text-slate-700 border-b border-slate-200 flex justify-between items-center">
                      <span>Preview (First 5 Rows)</span>
                      <span className="text-[10px] text-slate-500">{parsedData.length} records ready</span>
                    </div>
                    <div className="max-h-40 overflow-y-auto">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-50 text-[10px] font-bold text-slate-600 uppercase border-b border-slate-200">
                          <tr>
                            <th className="px-3 py-2">State</th>
                            <th className="px-3 py-2">District</th>
                            <th className="px-3 py-2">Pincode</th>
                            <th className="px-3 py-2">Lat</th>
                            <th className="px-3 py-2">Lng</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-slate-700">
                          {parsedData.slice(0, 5).map((row, idx) => (
                            <tr key={idx} className="hover:bg-slate-50/80">
                              <td className="px-3 py-1.5 font-medium">{row.state}</td>
                              <td className="px-3 py-1.5">{row.district}</td>
                              <td className="px-3 py-1.5 font-mono text-[11px]">{row.pincode || "-"}</td>
                              <td className="px-3 py-1.5 font-mono text-[11px]">{row.lat ? Number(row.lat).toFixed(4) : "-"}</td>
                              <td className="px-3 py-1.5 font-mono text-[11px]">{row.lng ? Number(row.lng).toFixed(4) : "-"}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="bg-slate-50 px-6 py-4 border-t border-slate-200 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setIsUploadModalOpen(false)}
                disabled={isUploading}
                className="px-4 py-2 border border-slate-300 text-slate-700 text-xs font-semibold rounded-lg hover:bg-slate-100 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmUpload}
                disabled={parsedData.length === 0 || isUploading}
                className="px-5 py-2 bg-primary hover:bg-primary-hover text-white text-xs font-bold rounded-lg transition-all shadow-md flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isUploading ? (
                  <>
                    <FaSpinner className="animate-spin text-sm" />
                    <span>Importing Locations...</span>
                  </>
                ) : (
                  <>
                    <FaCheck className="text-xs" />
                    <span>Confirm & Import ({parsedData.length} Records)</span>
                  </>
                )}
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
    </div>
  );
}
