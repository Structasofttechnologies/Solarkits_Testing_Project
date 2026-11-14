import { useEffect, useState, useCallback } from "react";
import axios from "axios";
import { authHeaderObj } from "@/app/authHeader";
import { useDispatch } from "react-redux";
import { useNavigate, useParams } from "react-router-dom";

import MapLocationPicker from "@/components/MapLocationPicker";
import CustomInput from "@/components/CustomInput";
import DropdownWithSearchInput from "@/components/DropdownWithSearchInput";
import ReactCountryFlag from "react-country-flag";
import { setAlert } from "@/features/alert.slice";
import Button from "@/components/Button";
import {
  FiMapPin,
  FiSave,
  FiCheckCircle,
  FiAlertCircle,
  FiGlobe,
  FiMap,
  FiHome,
  FiNavigation2,
  FiClock,
  FiInfo,
  FiChevronLeft,
  FiTruck,
  FiShield
} from "react-icons/fi";
import RenderIfPermission, { useHasPermission } from "@/components/PermissionCheck";
import PageHeader from "@/components/PageHeader";


// -------------------------------------------------------
// Warehouse Type Card Component
// -------------------------------------------------------
function WarehouseTypeCard({ type, selected, onClick }) {
  const isCompany = type === "company";

  return (
    <button
      type="button"
      onClick={() => onClick(type)}
      className={`
        relative w-full text-left p-4 rounded-xl border-2 transition-all duration-200 cursor-pointer
        ${selected
          ? isCompany
            ? "border-emerald-500 bg-linear-120 from-emerald-500/15 to-emerald-600/10 shadow-md"
            : "border-primary bg-linear-120 from-primary/15 to-primary/10 shadow-md"
          : "border-border bg-surface hover:border-primary/40 hover:bg-surface-hover"
        }
      `}
    >
      {/* Selected Indicator */}
      {selected && (
        <div className={`absolute top-3 right-3 w-5 h-5 rounded-full flex items-center justify-center ${isCompany ? "bg-emerald-500" : "bg-primary"}`}>
          <FiCheckCircle className="text-white w-3 h-3" />
        </div>
      )}

      <div className="flex items-start gap-3">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
          isCompany
            ? selected ? "bg-linear-120 from-emerald-500 to-emerald-600" : "bg-linear-120 from-emerald-500/20 to-emerald-600/10"
            : selected ? "bg-linear-120 from-primary to-primary-end" : "bg-linear-120 from-primary/20 to-primary/10"
        }`}>
          {isCompany
            ? <FiHome className={`w-5 h-5 ${selected ? "text-white" : "text-emerald-500"}`} />
            : <FiTruck className={`w-5 h-5 ${selected ? "text-white" : "text-primary"}`} />
          }
        </div>

        <div className="flex-1 min-w-0">
          <p className={`font-semibold text-sm mb-0.5 ${selected ? (isCompany ? "text-emerald-600" : "text-primary") : "text-text-primary"}`}>
            {isCompany ? "Company Warehouse" : "3PL Warehouse"}
          </p>
          <p className="text-xs text-text-secondary leading-relaxed">
            {isCompany
              ? "Owned by company"
              : "Another staff handling this warehouse"
            }
          </p>
        </div>
      </div>
    </button>
  );
}


export default function AddWarehouse({ moduleUniqueId }) {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { warehouseId } = useParams();
  useHasPermission({ requiredUniqueId: moduleUniqueId, permission: warehouseId ? "edit" : "add" });

  const API = import.meta.env.VITE_API_URL;

  const [data, setData] = useState({
    lat: "",
    lng: "",
    address: "",
    country: "",
    state: "",
    district: "",
    pincode: "",
    warehouse_type: "",
    manager_name: "",
    manager_email: "",
    manager_phone: "",
    manager_phone_code: "+91"
  });
  const [loading, setLoading] = useState(false);
  const [countries, setCountries] = useState([]);
  const [selectedCountryId, setSelectedCountryId] = useState(null);
  const [minPhoneLen, setMinPhoneLen] = useState(8);
  const [maxPhoneLen, setMaxPhoneLen] = useState(15);

  // Geographic filter lists and selected values
  const [countriesList, setCountriesList] = useState([]);
  const [statesList, setStatesList] = useState([]);
  const [districtsList, setDistrictsList] = useState([]);

  const [selectedCountry, setSelectedCountry] = useState("");
  const [selectedState, setSelectedState] = useState("");
  const [selectedDistrict, setSelectedDistrict] = useState(null);

  const [boundaries, setBoundaries] = useState([]);
  const [districtCenter, setDistrictCenter] = useState(null);
  const [loadingBoundaries, setLoadingBoundaries] = useState(false);
  const [allWarehousesInDistrict, setAllWarehousesInDistrict] = useState([]);

  // Check if current district already has a registered warehouse
  const hasDistrictWarehouse = selectedDistrict
    ? allWarehousesInDistrict.some((w) => w.id !== warehouseId)
    : false;

  // -------------------------------------------------------
  // Fetch boundary for the selected district
  // -------------------------------------------------------
  const fetchDistrictBoundary = useCallback(async (districtObj) => {
    if (!districtObj) {
      setBoundaries([]);
      setDistrictCenter(null);
      return;
    }

    setLoadingBoundaries(true);
    try {
      const countryObj = countriesList.find(c => c.value === selectedCountry);
      const countryName = countryObj?.name || (countryObj?.text?.props ? countryObj.text.props.children[1] : countryObj?.text);
      const stateObj = statesList.find(s => s.value === selectedState);
      const stateName = stateObj?.text || stateObj?.name;
      const districtName = districtObj.name || districtObj.text;

      if (!countryName || !stateName || !districtName) {
        setLoadingBoundaries(false);
        return;
      }

      const res = await axios.post(
        `${API}/geolocation/district?unique_id=${moduleUniqueId}&req_for=view`,
        {
          district: districtName,
          state: stateName,
          country: countryName,
        },
        { headers: { ...authHeaderObj() } }
      );

      const dist = res.data.district;

      if (dist?.geometry?.coordinates?.length > 0) {
        setBoundaries([{
          id: districtObj.value || districtObj.id,
          level: 'district',
          geometry: dist.geometry
        }]);
      } else {
        setBoundaries([]);
      }

      // Set district center for automatic map zoom & address fetching
      setDistrictCenter({
        lat: dist?.lat || 0,
        lng: dist?.lng || 0,
        name: districtName,
        state: stateName,
        country: countryName
      });
    } catch (err) {
      console.error("Failed to load district boundary", err);
      setBoundaries([]);
      setDistrictCenter({
        lat: 0,
        lng: 0,
        name: districtObj.name || districtObj.text,
        state: statesList.find(s => s.value === selectedState)?.name,
        country: countriesList.find(c => c.value === selectedCountry)?.name
      });
    } finally {
      setLoadingBoundaries(false);
    }
  }, [API, moduleUniqueId, countriesList, statesList, selectedCountry, selectedState]);

  // -------------------------------------------------------
  // Fetch existing warehouses in the selected district
  // -------------------------------------------------------
  const fetchDistrictWarehouses = useCallback(async (districtName) => {
    if (!districtName) {
      setAllWarehousesInDistrict([]);
      return;
    }
    try {
      const res = await axios.get(`${API}/warehouses?unique_id=${moduleUniqueId}&req_for=view`, {
        headers: { ...authHeaderObj() },
      });
      const warehouses = res.data.warehouses || [];
      const districtWarehouses = warehouses.filter(
        w => (w.district || w.district_name)?.toLowerCase() === districtName.toLowerCase()
      );
      setAllWarehousesInDistrict(districtWarehouses);
    } catch (err) {
      console.error("Failed to fetch warehouses in district", err);
    }
  }, [API, moduleUniqueId]);

  // -------------------------------------------------------
  // Load location filters and handle edits
  // -------------------------------------------------------
  useEffect(() => {
    const fetchActiveCountries = async () => {
      try {
        const res = await axios.get(
          `${API}/geolocation/active-countries?unique_id=${moduleUniqueId}&req_for=view`,
          { headers: { ...authHeaderObj() } }
        );
        const formatted = res.data.countries.map((c) => ({
          text: (
            <span className="flex items-center gap-2">
              <ReactCountryFlag countryCode={c.iso2} svg className="text-xl" />
              {c.name}
            </span>
          ),
          value: c.id,
          name: c.name,
          iso2: c.iso2,
        }));
        setCountriesList(formatted);
      } catch (err) {
        console.error("Error fetching active countries:", err);
      }
    };
    fetchActiveCountries();
  }, [API, moduleUniqueId]);

  useEffect(() => {
    setStatesList([]);
    setSelectedState("");
    setDistrictsList([]);
    setSelectedDistrict(null);

    if (!selectedCountry) return;

    const countryObj = countriesList.find(c => c.value === selectedCountry);
    const countryName = countryObj?.name || (countryObj?.text?.props ? countryObj.text.props.children[1] : countryObj?.text);
    if (countryName) {
      setData(prev => ({ ...prev, country: countryName }));
    }

    const fetchStates = async () => {
      try {
        const res = await axios.post(
          `${API}/geolocation/active-states?unique_id=${moduleUniqueId}&req_for=view`,
          { country_id: selectedCountry },
          { headers: { ...authHeaderObj() } }
        );
        const formatted = res.data.states.map(({ id, name }) => ({
          text: name,
          name: name,
          value: id
        }));
        setStatesList(formatted);
      } catch (err) {
        console.error("Error fetching states:", err);
      }
    };

    fetchStates();
  }, [selectedCountry, countriesList, API, moduleUniqueId]);

  useEffect(() => {
    setDistrictsList([]);
    setSelectedDistrict(null);

    if (!selectedState) return;

    const stateObj = statesList.find(s => s.value === selectedState);
    const stateName = stateObj?.name || stateObj?.text;
    if (stateName) {
      setData(prev => ({ ...prev, state: stateName }));
    }

    const fetchDistricts = async () => {
      try {
        const res = await axios.post(
          `${API}/geolocation/active-districts?unique_id=${moduleUniqueId}&req_for=view`,
          { state_id: selectedState },
          { headers: { ...authHeaderObj() } }
        );
        const list = res.data.districts || res.data.data || [];
        const formatted = list.map(d => ({
          text: d.name,
          name: d.name,
          value: d.id || d._id
        }));
        setDistrictsList(formatted);
      } catch (err) {
        console.error("Error fetching districts:", err);
      }
    };

    fetchDistricts();
  }, [selectedState, statesList, API, moduleUniqueId]);

  useEffect(() => {
    if (selectedDistrict) {
      const districtName = selectedDistrict.name || selectedDistrict.text;
      if (districtName) {
        setData(prev => ({ ...prev, district: districtName }));
      }
      fetchDistrictBoundary(selectedDistrict);
      fetchDistrictWarehouses(selectedDistrict.name);
    } else {
      setBoundaries([]);
      setAllWarehousesInDistrict([]);
    }
  }, [selectedDistrict, fetchDistrictBoundary, fetchDistrictWarehouses]);

  // Resolve IDs from names when editing
  useEffect(() => {
    if (!warehouseId || countriesList.length === 0 || !data.country) return;
    const matched = countriesList.find(c => {
      const name = c.name || c.text?.props?.children?.[1] || c.text;
      return name?.toString().toLowerCase() === data.country.toLowerCase();
    });
    if (matched) {
      setSelectedCountry(matched.value);
    }
  }, [data.country, countriesList, warehouseId]);

  useEffect(() => {
    if (!warehouseId || statesList.length === 0 || !data.state) return;
    const matched = statesList.find(s => (s.name || s.text)?.toLowerCase() === data.state.toLowerCase());
    if (matched) {
      setSelectedState(matched.value);
    }
  }, [data.state, statesList, warehouseId]);

  useEffect(() => {
    if (!warehouseId || districtsList.length === 0 || !data.district) return;
    const matched = districtsList.find(d => (d.name || d.text)?.toLowerCase() === data.district.toLowerCase());
    if (matched) {
      setSelectedDistrict(matched);
    }
  }, [data.district, districtsList, warehouseId]);

  // -------------------------------------------------------
  // Handle map selection
  // -------------------------------------------------------
  const handleMapSelect = (mapData) => {
    const countryObj = countriesList.find(c => c.value === selectedCountry);
    const countryName = countryObj?.name || (countryObj?.text?.props ? countryObj.text.props.children[1] : countryObj?.text) || mapData.country || data.country;
    const stateObj = statesList.find(s => s.value === selectedState);
    const stateName = stateObj?.name || stateObj?.text || mapData.state || data.state;
    const districtName = selectedDistrict?.name || selectedDistrict?.text || mapData.district || data.district;

    setData((prev) => ({
      ...prev,
      lat: mapData.lat,
      lng: mapData.lng,
      address: mapData.address || prev.address || (districtName ? `${districtName}, ${stateName}, ${countryName}` : ""),
      pincode: mapData.pincode || prev.pincode,
      country: countryName,
      state: stateName,
      district: districtName
    }));
  };

  const handlePhoneChange = (e) => {
    const val = e.target.value.replace(/\D/g, "");
    if (val.length <= maxPhoneLen) {
      setData(prev => ({ ...prev, manager_phone: val }));
    }
  };

  const handleCountrySelect = (countryId) => {
    const selected = countries.find(c => c.id === countryId);
    if (selected) {
      setSelectedCountryId(selected.id);
      setData(prev => ({ 
        ...prev, 
        manager_phone_code: selected.phone_code,
        manager_phone: "" 
      }));
      setMinPhoneLen(selected.min_phone_length || 8);
      setMaxPhoneLen(selected.max_phone_length || 15);
    }
  };

  // -------------------------------------------------------
  // Handle Form Submit
  // -------------------------------------------------------
  const handleSubmit = async () => {
    if (!data.lat || !data.lng) {
      dispatch(setAlert({ type: "error", message: "Please select a location on the map!", duration: 4000 }));
      return;
    }
    if (!data.warehouse_type) {
      dispatch(setAlert({ type: "error", message: "Please select a warehouse type (Company or 3PL)!", duration: 4000 }));
      return;
    }

    const countryObj = countriesList.find(c => c.value === selectedCountry);
    const countryName = countryObj?.name || (countryObj?.text?.props ? countryObj.text.props.children[1] : countryObj?.text) || data.country;
    const stateObj = statesList.find(s => s.value === selectedState);
    const stateName = stateObj?.name || stateObj?.text || data.state;
    const districtName = selectedDistrict?.name || selectedDistrict?.text || data.district;

    if (!countryName || !stateName || !districtName) {
      dispatch(setAlert({ type: "error", message: "Please select Country, State, and District!", duration: 4000 }));
      return;
    }

    const resolvedAddress = data.address?.trim() || `${districtName}, ${stateName}, ${countryName}`;

    const payload = {
      ...data,
      address: resolvedAddress,
      country: countryName,
      state: stateName,
      district: districtName
    };

    setLoading(true);
    try {
      const url = warehouseId
        ? `${API}/warehouses/${warehouseId}?unique_id=${moduleUniqueId}&req_for=edit`
        : `${API}/warehouses/add-warehouse?unique_id=${moduleUniqueId}&req_for=add`;

      const method = warehouseId ? "put" : "post";
      const res = await axios({
        method,
        url,
        data: payload,
        headers: { ...authHeaderObj() }
      });

      dispatch(setAlert({
        type: res.data.status || "success",
        message: res.data.message || (warehouseId ? "Warehouse updated successfully!" : "Warehouse added successfully!"),
        duration: 3000
      }));

      if (!warehouseId) {
        // Reset form in add mode
        setData({
          lat: "", lng: "", address: "", country: "", state: "",
          district: "", pincode: "", warehouse_type: "",
          manager_name: "", manager_email: "", manager_phone: "",
          manager_phone_code: "+91"
        });
        setSelectedDistrict(null);
      }
    } catch (err) {
      dispatch(setAlert({
        type: "error",
        message: err.response?.data?.message || `Failed to ${warehouseId ? 'update' : 'add'} warehouse.`,
        duration: 5000
      }));
    }

    setLoading(false);
  };

  // -------------------------------------------------------
  // Load active countries for manager phone code
  // -------------------------------------------------------
  useEffect(() => {
    axios.get(`${import.meta.env.VITE_AUTH_API_URL}/countries`, {
      headers: { ...authHeaderObj() },
    })
      .then(res => {
        const list = res.data.data || [];
        setCountries(list);
        if (!warehouseId) {
          const india = list.find(c => c.phone_code === "+91");
          if (india) {
            setSelectedCountryId(india.id);
            setData(prev => ({ ...prev, manager_phone_code: india.phone_code }));
            setMinPhoneLen(india.min_phone_length || 8);
            setMaxPhoneLen(india.max_phone_length || 15);
          } else if (list.length > 0) {
            setSelectedCountryId(list[0].id);
            setData(prev => ({ ...prev, manager_phone_code: list[0].phone_code }));
            setMinPhoneLen(list[0].min_phone_length || 8);
            setMaxPhoneLen(list[0].max_phone_length || 15);
          }
        }
      })
      .catch(err => console.log("Failed to fetch active countries:", err));
  }, [warehouseId]);

  // Sync selected country and lengths when countries or phone code changes
  useEffect(() => {
    if (countries.length > 0 && data.manager_phone_code) {
      const matched = countries.find(c => c.phone_code.trim() === data.manager_phone_code.trim());
      if (matched) {
        setSelectedCountryId(matched.id);
        setMinPhoneLen(matched.min_phone_length || 8);
        setMaxPhoneLen(matched.max_phone_length || 15);
      }
    }
  }, [countries, data.manager_phone_code]);

  // -------------------------------------------------------
  // Load existing warehouse data if in edit mode
  // -------------------------------------------------------
  useEffect(() => {
    if (!warehouseId) return;

    const loadWarehouseData = async () => {
      setLoading(true);
      try {
        const res = await axios.get(`${API}/warehouses/${warehouseId}?unique_id=${moduleUniqueId}&req_for=edit`, {
          headers: { ...authHeaderObj() }
        });
        const wh = res.data.warehouse;

        if (wh.status_id !== 1) {
          dispatch(setAlert({
            type: "error",
            message: "Warehouse details can only be edited when status is Pending Validation Setup.",
            duration: 5000
          }));
          navigate(-1);
          return;
        }

        setData({
          lat: wh.lat,
          lng: wh.lng,
          address: wh.address,
          country: wh.country,
          state: wh.state,
          district: wh.district,
          pincode: wh.pincode,
          warehouse_type: wh.warehouse_type,
          manager_name: wh.manager ? wh.manager.name : "",
          manager_email: wh.manager ? wh.manager.email : "",
          manager_phone: wh.manager ? wh.manager.phone : "",
          manager_phone_code: wh.manager ? (wh.manager.phone_code || "+91") : "+91"
        });
      } catch (err) {
        dispatch(setAlert({
          type: "error",
          message: err.response?.data?.message || "Failed to load warehouse details.",
          duration: 5000
        }));
        navigate(-1);
      }
      setLoading(false);
    };

    loadWarehouseData();
  }, [warehouseId, API, moduleUniqueId, navigate, dispatch]);

  // -------------------------------------------------------
  // Derived validation state
  // -------------------------------------------------------
  const isManagerValid = 
    (!data.manager_name?.trim() && !data.manager_email?.trim() && !data.manager_phone?.trim()) ||
    (data.manager_name?.trim() && 
     /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.manager_email?.trim() || "") && 
     (data.manager_phone?.trim() || "").length >= minPhoneLen &&
     (data.manager_phone?.trim() || "").length <= maxPhoneLen);

  const isSubmitReady =
    data.lat &&
    data.lng &&
    data.warehouse_type &&
    !hasDistrictWarehouse &&
    isManagerValid;

  return (
    <div className="space-y-6">
      <PageHeader
        title={warehouseId ? "Edit Warehouse Details" : "Register New Warehouse"}
        subtitle={warehouseId ? "Update coordinates and administrative properties of an existing facility." : "Establish a new logistical hub by pinpointing its exact location and defining its operational scope."}
        icon={FiHome}
        actions={
          <Button
            onClick={() => navigate(-1)}
            variant="secondary"
            leftIcon={<FiChevronLeft />}
            className="bg-white/10 backdrop-blur-md border border-white/20 text-white hover:bg-white/20 active:scale-[0.98] h-[46px]"
          >
            Back to List
          </Button>
        }
        stats={[
          {
            label: "Location Status",
            value: data.lat && data.lng ? "Selected" : "Not Set",
            description: data.lat ? `${parseFloat(data.lat).toFixed(2)}, ${parseFloat(data.lng).toFixed(2)}` : "Select on map"
          },
          {
            label: "Warehouse Type",
            value: data.warehouse_type ? (data.warehouse_type === "company" ? "Company" : "3PL") : "Not Set",
            description: data.warehouse_type === "company" ? "Owned by company" : data.warehouse_type === "3pl" ? "Third-party logistics" : "Select type below"
          }
        ]}
      />

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-4 lg:gap-6">
        {/* MAP SECTION */}
        <div className="xl:col-span-8">
          <div className="card shadow-sm hover:shadow-md transition-all duration-300 h-full flex flex-col">
            <div className="p-6">
              {/* Last updated badge */}
              <div className="flex justify-end mb-4">
                <span className="text-xs bg-linear-120 from-primary/5 to-primary/15 text-text-secondary px-2 py-1 rounded-full flex items-center gap-1">
                  <FiClock size={10} />
                  Location Selection
                </span>
              </div>

              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-linear-120 from-primary to-primary-end text-white">
                  <FiMap className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-text-primary">Select Warehouse Location</h3>
                  <p className="text-text-secondary text-sm">Click on the map to pinpoint the exact location</p>
                </div>
              </div>

              {/* Geographic Selection Dropdowns: Country -> State -> District */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-text-secondary">Country *</label>
                  <DropdownWithSearchInput
                    options={countriesList}
                    value={selectedCountry}
                    onChange={setSelectedCountry}
                    className="w-full"
                    placeholder="Select Country"
                    disabled={!!warehouseId}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-text-secondary">State *</label>
                  <DropdownWithSearchInput
                    options={statesList}
                    value={selectedState}
                    onChange={setSelectedState}
                    disabled={!selectedCountry || !!warehouseId}
                    placeholder="Select State"
                    className="w-full"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-text-secondary">District *</label>
                  <DropdownWithSearchInput
                    options={districtsList}
                    value={selectedDistrict?.value || ""}
                    onChange={(val) => {
                      const matched = districtsList.find(d => d.value === val);
                      setSelectedDistrict(matched || null);
                    }}
                    disabled={!selectedState || !!warehouseId}
                    placeholder="Select District"
                    className="w-full"
                  />
                </div>
              </div>

              {/* Location Status Banner */}
              {data.lat && data.lng ? (
                <div className="mb-4 p-4 bg-linear-120 from-green-500/10 to-green-600/10 rounded-xl border border-green-500/20">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-linear-120 from-green-500 to-green-600 rounded-lg flex items-center justify-center">
                        <FiCheckCircle className="text-white w-4 h-4" />
                      </div>
                      <div>
                        <p className="font-medium text-text-primary">Location Selected</p>
                        <p className="text-sm text-text-secondary">Coordinates: {data.lat}, {data.lng}</p>
                      </div>
                    </div>
                    <Button
                      onClick={() => {
                        setData(prev => ({ ...prev, lat: "", lng: "", address: "", pincode: "" }));
                      }}
                      variant="ghost"
                      size="sm"
                      className="text-danger hover:bg-danger/10"
                    >
                      Clear
                    </Button>
                  </div>
                </div>
              ) : selectedDistrict ? (
                <div className="mb-4 p-4 bg-linear-120 from-amber-500/10 to-amber-600/10 rounded-xl border border-amber-500/20">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-linear-120 from-amber-500 to-amber-600 rounded-lg flex items-center justify-center">
                      <FiAlertCircle className="text-white w-4 h-4" />
                    </div>
                    <div>
                      <p className="font-medium text-text-primary">Click on the map to select location</p>
                      <p className="text-sm text-text-secondary">Select the exact warehouse location inside {selectedDistrict.name} district boundary</p>
                    </div>
                  </div>
                </div>
              ) : null}

              {/* District Context Banner */}
              {selectedDistrict && (
                <div className="mb-4">
                  {loadingBoundaries ? (
                    <div className="p-3 bg-linear-120 from-primary/5 to-primary/10 rounded-xl border border-primary/20 flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                      <span className="text-sm text-text-secondary">Loading district boundary data...</span>
                    </div>
                  ) : hasDistrictWarehouse ? (
                    /* District already occupied */
                    <div className="p-4 bg-linear-120 from-red-500/10 to-red-600/10 rounded-xl border border-red-500/30">
                      <div className="flex items-start gap-3">
                        <div className="w-8 h-8 bg-linear-120 from-red-500 to-red-600 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                          <FiAlertCircle className="text-white w-4 h-4" />
                        </div>
                        <div>
                          <p className="font-semibold text-red-600 text-sm">District Already Has a Warehouse</p>
                          <p className="text-xs text-text-secondary mt-0.5">
                            {selectedDistrict.name} district already has a warehouse registered ({allWarehousesInDistrict[0]?.warehouse_code || 'Facility'}). Each district is limited to one warehouse. Please select a different district.
                          </p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    /* District ready */
                    <div className="p-4 rounded-xl border bg-linear-120 from-emerald-500/10 to-emerald-600/10 border-emerald-500/20">
                      <div className="flex items-start gap-3">
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 bg-linear-120 from-emerald-500 to-emerald-600 text-white">
                          <FiShield className="w-4 h-4" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-semibold text-text-primary text-sm">
                              District: <span className="text-emerald-600">{selectedDistrict.name}</span>
                            </p>
                            <span className="text-xs px-2 py-0.5 rounded-full font-medium border bg-emerald-500/10 text-emerald-600 border-emerald-500/20">
                              Available for Warehouse
                            </span>
                          </div>
                          <p className="text-xs text-text-secondary mt-1">
                            Click within the highlighted boundary on the map to pinpoint your warehouse.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Map Container */}
            <div className="flex-1 p-5 pt-0">
              {loadingBoundaries ? (
                <div className="h-125 rounded-xl border border-border flex items-center justify-center bg-surface-hover">
                  <div className="text-center space-y-3">
                    <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
                    <p className="text-text-secondary text-sm">Loading boundaries and existing facilities...</p>
                  </div>
                </div>
              ) : selectedDistrict ? (
                <MapLocationPicker
                  lat={data.lat}
                  lng={data.lng}
                  visible={true}
                  mode="full"
                  onSelect={handleMapSelect}
                  boundaries={boundaries}
                  districtCenter={districtCenter}
                  existingWarehouses={allWarehousesInDistrict}
                  currentWarehouseId={warehouseId}
                  onLocationError={(msg) => {
                    dispatch(setAlert({ type: "error", message: msg, duration: 4000 }));
                  }}
                  className="h-125 rounded-xl overflow-hidden border border-border"
                />
              ) : (
                <div className="h-125 rounded-xl border border-border border-dashed flex items-center justify-center bg-surface-hover">
                  <p className="text-text-secondary text-sm">Please select a District first to load the map and boundaries.</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* FORM SECTION */}
        <div className="xl:col-span-4">
          <div className="card shadow-sm hover:shadow-md transition-all duration-300 h-full">
            <div className="p-6">
              {/* Last updated badge */}
              <div className="flex justify-end mb-4">
                <span className="text-xs bg-linear-120 from-primary/5 to-primary/15 text-text-secondary px-2 py-1 rounded-full flex items-center gap-1">
                  <FiClock size={10} />
                  Warehouse Details
                </span>
              </div>

              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-linear-120 from-emerald-500 to-emerald-600 text-white">
                  <FiHome className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-text-primary">Warehouse Details</h3>
                  <p className="text-text-secondary text-sm">Fill in the warehouse information</p>
                </div>
              </div>

              <div className="space-y-6">

                {/* ── Warehouse Type Selector ── */}
                <div className="space-y-3">
                  <h3 className="font-semibold text-text-primary flex items-center gap-2 text-sm">
                    <div className="w-6 h-6 bg-linear-120 from-primary/20 to-primary/10 rounded flex items-center justify-center">
                      <FiHome className="text-primary w-3 h-3" />
                    </div>
                    Warehouse Type *
                  </h3>
                  <div className="grid grid-cols-1 gap-3">
                    <WarehouseTypeCard
                      type="company"
                      selected={data.warehouse_type === "company"}
                      onClick={(t) => setData(prev => ({ ...prev, warehouse_type: t }))}
                    />
                    <WarehouseTypeCard
                      type="3pl"
                      selected={data.warehouse_type === "3pl"}
                      onClick={(t) => setData(prev => ({ ...prev, warehouse_type: t }))}
                    />
                  </div>
                </div>

                {/* ── Location Details ── */}
                <div className="space-y-4">
                  <h3 className="font-semibold text-text-primary flex items-center gap-2 text-sm">
                    <div className="w-6 h-6 bg-linear-120 from-primary/10 to-primary/5 rounded flex items-center justify-center">
                      <FiNavigation2 className="text-primary w-3 h-3" />
                    </div>
                    Location Details
                  </h3>

                  <div className="space-y-4">
                    <CustomInput
                      type="textarea"
                      label="Address *"
                      value={data.address}
                      onChange={(e) => setData(prev => ({ ...prev, address: e.target.value }))}
                      placeholder="Auto-filled from map selection (or enter exact plot/shed details)"
                    />

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <CustomInput
                        label="District"
                        value={data.district}
                        disabled
                        placeholder="Select on map"
                      />
                      <CustomInput
                        label="State"
                        value={data.state}
                        disabled
                        placeholder="Select on map"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <CustomInput
                        label="Country"
                        value={data.country}
                        disabled
                        placeholder="Select on map"
                        leftIcon={<FiGlobe className="text-text-secondary" />}
                      />
                      <CustomInput
                        label="Postal Code"
                        value={data.pincode}
                        onChange={(e) => setData(prev => ({ ...prev, pincode: e.target.value }))}
                        placeholder="Auto-filled from map (or enter)"
                      />
                    </div>
                  </div>
                </div>

                {/* ── Manager Details ── */}
                <div className="space-y-4 pt-4 border-t border-border">
                  <h3 className="font-semibold text-text-primary flex items-center gap-2 text-sm">
                    <div className="w-6 h-6 bg-linear-120 from-primary/10 to-primary/5 rounded flex items-center justify-center">
                      <FiInfo className="text-primary w-3 h-3" />
                    </div>
                    Manager Details
                  </h3>

                  <div className="space-y-4">
                    <CustomInput
                      label="Manager Name"
                      value={data.manager_name || ""}
                      onChange={(e) => setData((prev) => ({ ...prev, manager_name: e.target.value }))}
                      placeholder="Enter manager's full name"
                    />

                    <CustomInput
                      label="Manager Email"
                      value={data.manager_email || ""}
                      onChange={(e) => setData((prev) => ({ ...prev, manager_email: e.target.value }))}
                      placeholder="Enter manager's email"
                    />

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div className="sm:col-span-1">
                        <DropdownWithSearchInput
                          label="Country Code"
                          options={countries.map(c => ({
                            value: c.id,
                            text: (
                              <span className="flex items-center gap-2 text-sm">
                                <ReactCountryFlag countryCode={c.iso2} svg className="w-5 h-5" />
                                {c.phone_code} ({c.iso2})
                              </span>
                            )
                          }))}
                          value={selectedCountryId}
                          onChange={handleCountrySelect}
                          placeholder="Select code"
                          className="w-full"
                        />
                      </div>
                      <div className="sm:col-span-2">
                        <CustomInput
                          label="Manager Phone"
                          value={data.manager_phone || ""}
                          onChange={handlePhoneChange}
                          placeholder={minPhoneLen ? `Phone number (${minPhoneLen}-${maxPhoneLen} digits)` : "Enter manager's phone number"}
                          prefix={data.manager_phone_code || "+91"}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* ── Submit Section ── */}
                <div className="pt-4 border-t border-border">
                  <div className="space-y-4">
                    <RenderIfPermission
                      requiredUniqueId={moduleUniqueId}
                      permission={warehouseId ? "edit" : "add"}
                      fallback={null}
                    >
                      <Button
                        onClick={handleSubmit}
                        disabled={loading || !isSubmitReady || hasDistrictWarehouse}
                        variant="primary"
                        size="lg"
                        fullWidth
                        leftIcon={loading ? null : <FiSave />}
                        loading={loading}
                        className="bg-linear-120 from-primary to-primary-end shadow-lg hover:shadow-xl"
                      >
                        {loading
                          ? "Saving Warehouse..."
                          : warehouseId
                            ? "Update Warehouse"
                            : data.warehouse_type === "company"
                              ? "Save Company Warehouse"
                              : data.warehouse_type === "3pl"
                                ? "Save 3PL Warehouse"
                                : "Save Warehouse"
                        }
                      </Button>
                    </RenderIfPermission>

                    {/* Validation Checklist */}
                    <div className="space-y-2">
                      {/* Location */}
                      {!data.lat || !data.lng ? (
                        <div className="flex items-center gap-2 text-sm text-amber-600">
                          <FiAlertCircle className="flex-shrink-0" />
                          <span>Select a location on the map</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 text-sm text-green-600">
                          <FiCheckCircle className="flex-shrink-0" />
                          <span>Location selected ✓</span>
                        </div>
                      )}

                      {/* Warehouse type */}
                      {!data.warehouse_type ? (
                        <div className="flex items-center gap-2 text-sm text-amber-600">
                          <FiAlertCircle className="flex-shrink-0" />
                          <span>Select a warehouse type (Company or 3PL)</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 text-sm text-green-600">
                          <FiCheckCircle className="flex-shrink-0" />
                          <span>
                            {data.warehouse_type === "company" ? "Company Warehouse" : "3PL Warehouse"} selected ✓
                          </span>
                        </div>
                      )}

                      {/* Manager validation checklist */}
                      {data.manager_name || data.manager_email || data.manager_phone ? (
                        isManagerValid ? (
                          <div className="flex items-center gap-2 text-sm text-green-600">
                            <FiCheckCircle className="flex-shrink-0" />
                            <span>Manager details valid ✓</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 text-sm text-amber-600">
                            <FiAlertCircle className="flex-shrink-0" />
                            <span>Ensure manager email is valid & phone is between {minPhoneLen} and {maxPhoneLen} digits</span>
                          </div>
                        )
                      ) : null}

                      {/* District conflict */}
                      {hasDistrictWarehouse && (
                        <div className="flex items-center gap-2 text-sm text-red-600">
                          <FiAlertCircle className="flex-shrink-0" />
                          <span>District already has a registered warehouse</span>
                        </div>
                      )}
                    </div>

                    <p className="text-xs text-text-secondary text-center pt-2 border-t border-border">
                      Make sure all location details are correct before submitting
                    </p>
                  </div>
                </div>

              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
