import { useEffect, useState, useCallback } from "react";
import axios from "axios";
import { authHeaderObj } from "@/app/authHeader";
import { useDispatch } from "react-redux";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";

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
  FiShield,
  FiPlus,
  FiLayers,
  FiBox,
  FiCheck,
  FiCalendar,
  FiCamera,
  FiUser
} from "react-icons/fi";
import RenderIfPermission, { useHasPermission } from "@/components/PermissionCheck";
import PageHeader from "@/components/PageHeader";
import ThreePLVendorManagementModal from "./components/ThreePLVendorManagementModal";

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
            ? "border-emerald-500 bg-linear-120 from-emerald-500/15 to-emerald-600/10 shadow-md ring-2 ring-emerald-500/20"
            : "border-primary bg-linear-120 from-primary/15 to-primary/10 shadow-md ring-2 ring-primary/20"
          : "border-border bg-surface hover:border-primary/40 hover:bg-surface-hover"
        }
      `}
    >
      {selected && (
        <div className={`absolute top-3 right-3 w-5 h-5 rounded-full flex items-center justify-center ${isCompany ? "bg-emerald-500" : "bg-primary"}`}>
          <FiCheckCircle className="text-white w-3 h-3" />
        </div>
      )}

      <div className="flex items-start gap-3">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${isCompany
          ? selected ? "bg-linear-120 from-emerald-500 to-emerald-600 shadow-sm" : "bg-linear-120 from-emerald-500/20 to-emerald-600/10"
          : selected ? "bg-linear-120 from-primary to-primary-end shadow-sm" : "bg-linear-120 from-primary/20 to-primary/10"
          }`}>
          {isCompany
            ? <FiHome className={`w-5 h-5 ${selected ? "text-white" : "text-emerald-500"}`} />
            : <FiTruck className={`w-5 h-5 ${selected ? "text-white" : "text-primary"}`} />
          }
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <p className={`font-bold text-sm ${selected ? (isCompany ? "text-emerald-600" : "text-primary") : "text-text-primary"}`}>
              {isCompany ? "Company Warehouse" : "3PL Warehouse"}
            </p>
            <span className="text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded bg-surface-hover text-text-secondary border border-border">
              {isCompany ? "Direct Operation" : "Vendor Operated"}
            </span>
          </div>
          <p className="text-xs text-text-secondary leading-relaxed">
            {isCompany
              ? "Company manages infrastructure, stock, staff and warehouse operations. Requires 10-gate operational verification."
              : "External vendor provides warehouse and logistics services under an agreement. Requires vendor KYC and site inspection."
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
  const [searchParams] = useSearchParams();
  const tabParam = searchParams.get("tab");
  useHasPermission({ requiredUniqueId: moduleUniqueId, permission: warehouseId ? "edit" : "add" });

  const API = import.meta.env.VITE_API_URL;

  const [data, setData] = useState({
    warehouse_name: "",
    warehouse_code: "",
    lat: "",
    lng: "",
    address: "",
    country: "",
    state: "",
    district: "",
    pincode: "",
    warehouse_type: "",
    vendor_id: "",
    warehouse_area_sqft: "",
    max_weight_capacity_kg: "",
    max_volume_cbf: "",
    max_pallet_capacity: "",
    storage_type: "indoor",
    facilities: {
      loading_facility: true,
      unloading_facility: true,
      racks_installed: true
    },
    operating_hours: {
      working_days: "Mon - Sat",
      working_hours: "09:00 - 18:00"
    },
    operational_permissions: {
      inward: true,
      outward: true,
      storage: true,
      dispatch: true,
      kit_assembly: true
    },
    categorized_images: {
      exterior: [],
      storage: [],
      racks: [],
      loading_area: [],
      security: []
    },
    manager_name: "",
    manager_email: "",
    manager_phone: "",
    manager_phone_code: "+91",
    effective_date: ""
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

  // 3PL Vendors State & Onboarding Modal
  const [approvedVendors, setApprovedVendors] = useState([]);
  const [loadingVendors, setLoadingVendors] = useState(false);
  const [isVendorModalOpen, setIsVendorModalOpen] = useState(false);

  // Active form section accordion/tab
  const [activeFormTab, setActiveFormTab] = useState(
    tabParam && ["basic", "capacity", "permissions", "images"].includes(tabParam) ? tabParam : "basic"
  ); // 'basic' | 'capacity' | 'permissions' | 'images'

  useEffect(() => {
    if (tabParam && ["basic", "capacity", "permissions", "images"].includes(tabParam)) {
      setActiveFormTab(tabParam);
    }
  }, [tabParam]);

  // Fetch Approved 3PL Vendors
  const fetchApprovedVendors = useCallback(async () => {
    setLoadingVendors(true);
    try {
      const res = await axios.get(`${API}/3pl-vendors/approved?unique_id=${moduleUniqueId}&req_for=view`, {
        headers: { ...authHeaderObj() }
      });
      setApprovedVendors(res.data?.vendors || []);
    } catch {
      try {
        const fallbackRes = await axios.get(`${API}/3pl-vendors?status=approved&unique_id=${moduleUniqueId}&req_for=view`, {
          headers: { ...authHeaderObj() }
        });
        setApprovedVendors(fallbackRes.data?.vendors || []);
      } catch (err) {
        console.error("Failed to load approved 3PL vendors:", err);
      }
    } finally {
      setLoadingVendors(false);
    }
  }, [API, moduleUniqueId]);

  useEffect(() => {
    fetchApprovedVendors();
  }, [fetchApprovedVendors]);

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

        setData({
          warehouse_name: wh.warehouse_name || "",
          warehouse_code: wh.warehouse_code || "",
          lat: wh.lat || "",
          lng: wh.lng || "",
          address: wh.address || "",
          country: wh.country || "",
          state: wh.state || "",
          district: wh.district || "",
          pincode: wh.pincode || "",
          warehouse_type: wh.warehouse_type || "company",
          vendor_id: wh.vendor_id?._id || wh.vendor_id || "",
          warehouse_area_sqft: wh.warehouse_area_sqft || "",
          max_weight_capacity_kg: wh.max_weight_capacity_kg || "",
          max_volume_cbf: wh.max_volume_cbf || "",
          max_pallet_capacity: wh.max_pallet_capacity || "",
          storage_type: wh.storage_type || "indoor",
          facilities: wh.facilities || {
            loading_facility: true,
            unloading_facility: true,
            racks_installed: true
          },
          operating_hours: wh.operating_hours || {
            working_days: "Mon - Sat",
            working_hours: "09:00 - 18:00"
          },
          operational_permissions: wh.operational_permissions || {
            inward: true,
            outward: true,
            storage: true,
            dispatch: true,
            kit_assembly: true
          },
          categorized_images: {
            exterior: Array.isArray(wh.categorized_images?.exterior) ? wh.categorized_images.exterior : (wh.categorized_images?.front_exterior ? [wh.categorized_images.front_exterior] : []),
            storage: Array.isArray(wh.categorized_images?.storage) ? wh.categorized_images.storage : (wh.categorized_images?.main_storage ? [wh.categorized_images.main_storage] : []),
            racks: Array.isArray(wh.categorized_images?.racks) ? wh.categorized_images.racks : (wh.categorized_images?.product_racks ? [wh.categorized_images.product_racks] : []),
            loading_area: Array.isArray(wh.categorized_images?.loading_area) ? wh.categorized_images.loading_area : (wh.categorized_images?.loading_unloading ? [wh.categorized_images.loading_unloading] : []),
            security: Array.isArray(wh.categorized_images?.security) ? wh.categorized_images.security : (wh.categorized_images?.office_security ? [wh.categorized_images.office_security] : [])
          },
          manager_name: wh.manager ? wh.manager.name : "",
          manager_email: wh.manager ? wh.manager.email : "",
          manager_phone: wh.manager ? wh.manager.phone : "",
          manager_phone_code: wh.manager ? (wh.manager.phone_code || "+91") : "+91",
          effective_date: wh.effective_date ? new Date(wh.effective_date).toISOString().split('T')[0] : ""
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

  // Handle Photo URL Input
  const handleAddImageUrl = (category, url) => {
    if (!url?.trim()) return;
    const altMap = {
      exterior: 'front_exterior',
      storage: 'main_storage',
      racks: 'product_racks',
      loading_area: 'loading_unloading',
      security: 'office_security',
      front_exterior: 'exterior',
      main_storage: 'storage',
      product_racks: 'racks',
      loading_unloading: 'loading_area',
      office_security: 'security'
    };
    const altKey = altMap[category];
    setData(prev => {
      const currentList = Array.isArray(prev.categorized_images?.[category])
        ? prev.categorized_images[category]
        : (prev.categorized_images?.[category] ? [prev.categorized_images[category]] : []);
      const updatedList = [...currentList, url.trim()];
      return {
        ...prev,
        categorized_images: {
          ...prev.categorized_images,
          [category]: updatedList,
          ...(altKey ? { [altKey]: updatedList[0] || url.trim() } : {})
        }
      };
    });
  };

  const handleRemoveImage = (category, idx) => {
    const altMap = {
      exterior: 'front_exterior',
      storage: 'main_storage',
      racks: 'product_racks',
      loading_area: 'loading_unloading',
      security: 'office_security',
      front_exterior: 'exterior',
      main_storage: 'storage',
      product_racks: 'racks',
      loading_unloading: 'loading_area',
      office_security: 'security'
    };
    const altKey = altMap[category];
    setData(prev => {
      const currentList = Array.isArray(prev.categorized_images?.[category])
        ? prev.categorized_images[category]
        : (prev.categorized_images?.[category] ? [prev.categorized_images[category]] : []);
      const updatedList = currentList.filter((_, i) => i !== idx);
      return {
        ...prev,
        categorized_images: {
          ...prev.categorized_images,
          [category]: updatedList,
          ...(altKey ? { [altKey]: updatedList[0] || "" } : {})
        }
      };
    });
  };

  // Handle Local Image Upload to Base64
  const handleLocalImageUpload = (category, e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      handleAddImageUrl(category, event.target.result);
    };
    reader.readAsDataURL(file);
  };

  // -------------------------------------------------------
  // Derived validation state
  // -------------------------------------------------------
  const isManagerValid =
    (!data.manager_name?.trim() && !data.manager_email?.trim() && !data.manager_phone?.trim()) ||
    (data.manager_name?.trim() &&
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.manager_email?.trim() || "") &&
      (data.manager_phone?.trim() || "").length >= minPhoneLen &&
      (data.manager_phone?.trim() || "").length <= maxPhoneLen);

  const is3plValid = data.warehouse_type !== "3pl" || !!data.vendor_id;

  const isSubmitReady =
    data.lat &&
    data.lng &&
    data.warehouse_type &&
    is3plValid &&
    isManagerValid;

  // Selected vendor object
  const currentVendor = approvedVendors.find(v => (v._id || v.id) === data.vendor_id);

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
    if (data.warehouse_type === "3pl" && !data.vendor_id) {
      dispatch(setAlert({ type: "error", message: "Please select an approved 3PL logistics vendor!", duration: 4000 }));
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
    const defaultName = `${districtName} ${data.warehouse_type === 'company' ? 'Company' : '3PL'} Facility`;

    const payload = {
      warehouse_name: data.warehouse_name?.trim() || defaultName,
      warehouse_type: data.warehouse_type,
      vendor_id: data.warehouse_type === "3pl" ? data.vendor_id : null,
      address: resolvedAddress,
      country: countryName,
      state: stateName,
      district: districtName,
      pincode: data.pincode,
      lat: data.lat,
      lng: data.lng,
      warehouse_area_sqft: Number(data.warehouse_area_sqft) || 0,
      max_weight_capacity_kg: Number(data.max_weight_capacity_kg) || 0,
      max_volume_cbf: Number(data.max_volume_cbf) || 0,
      max_pallet_capacity: Number(data.max_pallet_capacity) || 0,
      storage_type: data.storage_type || "indoor",
      facilities: data.facilities,
      operating_hours: data.operating_hours,
      operational_permissions: data.operational_permissions,
      categorized_images: data.categorized_images,
      effective_date: data.effective_date || null,
      manager_name: data.manager_name,
      manager_email: data.manager_email,
      manager_phone: data.manager_phone,
      manager_phone_code: data.manager_phone_code
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
        message: res.data.message || (warehouseId ? "Warehouse updated successfully!" : "Warehouse registered successfully!"),
        duration: 3500
      }));

      navigate("/admin-panel/operations/company-warehouses");
    } catch (err) {
      dispatch(setAlert({
        type: "error",
        message: err.response?.data?.message || `Failed to ${warehouseId ? 'update' : 'register'} warehouse.`,
        duration: 5000
      }));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title={warehouseId ? "Edit Warehouse Master Record" : "Register New Master Warehouse"}
        subtitle={warehouseId
          ? `Update configuration, operational permissions, and infrastructure for ${data.warehouse_code || 'warehouse'}.`
          : "Register a Company-Owned or 3PL Logistics facility with complete GPS mapping, capacity, and operational parameters."
        }
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
            value: data.lat && data.lng ? "Pin Verified" : "Not Set",
            description: data.lat ? `${parseFloat(data.lat).toFixed(3)}, ${parseFloat(data.lng).toFixed(3)}` : "Select GPS on map"
          },
          {
            label: "Warehouse Model",
            value: data.warehouse_type ? (data.warehouse_type === "company" ? "Company Owned" : "3PL Vendor") : "Not Set",
            description: data.warehouse_type === "company" ? "10-Gate Audit" : data.warehouse_type === "3pl" ? (currentVendor?.company_name || "Vendor Linked") : "Select below"
          }
        ]}
      />

      {/* Top Warning Banner if district already has facilities */}
      {selectedDistrict && allWarehousesInDistrict.length > 0 && (
        <div className="p-4 bg-amber-500/10 rounded-2xl border border-amber-500/30 flex items-start gap-3">
          <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-600 flex items-center justify-center shrink-0 mt-0.5">
            <FiInfo className="w-4 h-4" />
          </div>
          <div>
            <p className="font-bold text-amber-600 text-sm">
              Multiple Facilities in {selectedDistrict.name}: ({allWarehousesInDistrict.length} registered)
            </p>
            <p className="text-xs text-text-secondary mt-0.5">
              This district already contains registered facilities ({allWarehousesInDistrict.map(w => w.warehouse_code).join(', ')}). Multiple distinct facilities (Company Hubs & 3PL Partners) are supported with unique facility names and distinct GPS coordinates.
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        {/* MAP & LOCATION SELECTION SECTION */}
        <div className="xl:col-span-7 space-y-6">
          <div className="card shadow-sm hover:shadow-md transition-all duration-300">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-linear-120 from-primary to-primary-end text-white">
                    <FiMap className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-text-primary">1. Pinpoint GPS & Geographic Mapping</h3>
                    <p className="text-text-secondary text-sm">Select district and click the map to capture verified coordinates</p>
                  </div>
                </div>
                <span className="text-xs bg-linear-120 from-primary/10 to-primary/20 text-primary font-bold px-3 py-1 rounded-full">
                  GPS Verification
                </span>
              </div>

              {/* Geographic Selection Dropdowns */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-text-secondary uppercase">Country *</label>
                  <DropdownWithSearchInput
                    options={countriesList}
                    value={selectedCountry}
                    onChange={setSelectedCountry}
                    className="w-full"
                    placeholder="Select Country"
                    disabled={!!warehouseId}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-text-secondary uppercase">State *</label>
                  <DropdownWithSearchInput
                    options={statesList}
                    value={selectedState}
                    onChange={setSelectedState}
                    disabled={!selectedCountry || !!warehouseId}
                    placeholder="Select State"
                    className="w-full"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-text-secondary uppercase">District *</label>
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

              {/* GPS Coordinates Feedback Bar */}
              {data.lat && data.lng ? (
                <div className="mb-4 p-3 bg-linear-120 from-green-500/10 to-green-600/10 rounded-xl border border-green-500/30 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 bg-green-500 text-white rounded-lg flex items-center justify-center">
                      <FiCheckCircle className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="font-bold text-xs text-text-primary">GPS Pin Captured & Verified</p>
                      <p className="text-[11px] text-text-secondary">Latitude: <strong>{data.lat}</strong> | Longitude: <strong>{data.lng}</strong></p>
                    </div>
                  </div>
                  <Button
                    onClick={() => setData(prev => ({ ...prev, lat: "", lng: "", address: "", pincode: "" }))}
                    variant="ghost"
                    size="sm"
                    className="text-danger hover:bg-danger/10 text-xs"
                  >
                    Change Pin
                  </Button>
                </div>
              ) : selectedDistrict ? (
                <div className="mb-4 p-3 bg-amber-500/10 rounded-xl border border-amber-500/25 flex items-center gap-2.5">
                  <FiAlertCircle className="text-amber-500 shrink-0 w-4 h-4" />
                  <p className="text-xs text-text-secondary">
                    Click anywhere inside the <strong>{selectedDistrict.name}</strong> boundary on the map below to pinpoint the facility.
                  </p>
                </div>
              ) : null}

              {/* Map Box */}
              <div className="h-[460px] rounded-xl overflow-hidden border border-border">
                {loadingBoundaries ? (
                  <div className="h-full flex items-center justify-center bg-surface-hover">
                    <div className="text-center space-y-2">
                      <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
                      <p className="text-text-secondary text-xs font-semibold">Loading geographical boundaries...</p>
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
                    onLocationError={(msg) => dispatch(setAlert({ type: "error", message: msg, duration: 4000 }))}
                    className="h-full w-full"
                  />
                ) : (
                  <div className="h-full flex flex-col items-center justify-center bg-surface-hover/50 p-6 text-center">
                    <FiMapPin className="w-10 h-10 text-text-muted mb-2 opacity-50" />
                    <p className="text-sm font-bold text-text-primary">Select District to Enable GPS Map</p>
                    <p className="text-xs text-text-secondary mt-1">Country, State, and District selection required to project warehouse borders.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* WAREHOUSE CONFIGURATION FORM SECTION */}
        <div className="xl:col-span-5 space-y-6">
          <div className="card shadow-sm hover:shadow-md transition-all duration-300">
            {/* Form Tabs */}
            <div className="p-4 border-b border-border bg-surface-hover/30 flex items-center gap-1.5 overflow-x-auto">
              {[
                { id: "basic", label: "Master Setup", icon: FiHome },
                { id: "capacity", label: "Capacity & Infra", icon: FiBox },
                { id: "permissions", label: "Operations", icon: FiLayers },
                { id: "images", label: "Audit Photos", icon: FiCamera }
              ].map(tab => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveFormTab(tab.id)}
                  className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shrink-0 cursor-pointer ${activeFormTab === tab.id
                    ? "bg-primary text-white shadow-sm"
                    : "text-text-secondary hover:text-text-primary hover:bg-surface-hover"
                    }`}
                >
                  <tab.icon className="w-3.5 h-3.5" />
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="p-6 space-y-5">
              {/* TAB 1: MASTER SETUP & 3PL LINKING */}
              {activeFormTab === "basic" && (
                <div className="space-y-4">
                  {/* Warehouse Name & Code */}
                  <div className="space-y-1">
                    <CustomInput
                      label="Warehouse Display Name *"
                      value={data.warehouse_name}
                      onChange={(e) => setData(prev => ({ ...prev, warehouse_name: e.target.value }))}
                      placeholder="e.g. Ahmedabad Central Hub / Bhiwandi 3PL Logistics"
                    />
                    {warehouseId && (
                      <p className="text-[11px] text-text-muted mt-1">
                        System Warehouse Code: <strong className="text-text-primary">{data.warehouse_code}</strong>
                      </p>
                    )}
                  </div>

                  {/* Warehouse Type Card Selection */}
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-text-secondary uppercase">Warehouse Ownership Model *</label>
                    <div className="grid grid-cols-1 gap-2.5">
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

                  {/* 3PL Logistics Vendor Picker (Shown when 3PL is selected) */}
                  {data.warehouse_type === "3pl" && (
                    <div className="p-4 bg-primary/5 rounded-2xl border border-primary/20 space-y-3">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-bold text-primary uppercase flex items-center gap-1.5">
                          <FiTruck className="w-3.5 h-3.5" />
                          Approved Logistics Vendor *
                        </label>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          leftIcon={<FiPlus />}
                          onClick={() => setIsVendorModalOpen(true)}
                          className="text-primary hover:bg-primary/10 text-xs font-bold"
                        >
                          Onboard Vendor
                        </Button>
                      </div>

                      <DropdownWithSearchInput
                        options={approvedVendors.map(v => ({
                          value: v._id || v.id,
                          text: `${v.company_name} (${v.vendor_code || '3PL'}) - ${v.state || ''}`
                        }))}
                        value={data.vendor_id}
                        onChange={(val) => setData(prev => ({ ...prev, vendor_id: val }))}
                        placeholder={loadingVendors ? "Loading vendors..." : "Select Approved 3PL Partner"}
                        className="w-full"
                      />

                      {/* Selected Vendor Summary Card */}
                      {currentVendor && (
                        <div className="p-3 bg-surface rounded-xl border border-border text-xs space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-text-primary">{currentVendor.company_name}</span>
                            <span className="px-2 py-0.5 rounded-full bg-green-500/10 text-green-600 font-bold text-[10px]">
                              Approved Partner ✓
                            </span>
                          </div>
                          <p className="text-[11px] text-text-secondary">
                            Contact: {currentVendor.contact_person?.name || 'N/A'} ({currentVendor.contact_person?.phone || 'N/A'})
                          </p>
                          <p className="text-[11px] text-text-secondary">
                            GSTIN: <strong className="text-text-primary">{currentVendor.tax_identifiers?.gstin || 'N/A'}</strong> | PAN: <strong>{currentVendor.tax_identifiers?.pan || 'N/A'}</strong>
                          </p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Address & Pin */}
                  <div className="space-y-3">
                    <CustomInput
                      type="textarea"
                      label="Full Facility Address *"
                      value={data.address}
                      onChange={(e) => setData(prev => ({ ...prev, address: e.target.value }))}
                      placeholder="Auto-filled from map selection or enter detailed plot / survey / road details"
                    />

                    <div className="grid grid-cols-2 gap-3">
                      <CustomInput
                        label="Postal Code (Pincode) *"
                        value={data.pincode}
                        onChange={(e) => setData(prev => ({ ...prev, pincode: e.target.value }))}
                        placeholder="e.g. 380001"
                      />
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-text-secondary uppercase">Effective Go-Live Date</label>
                        <input
                          type="date"
                          value={data.effective_date}
                          onChange={(e) => setData(prev => ({ ...prev, effective_date: e.target.value }))}
                          className="w-full h-[42px] px-3 bg-surface border border-border rounded-xl text-xs font-medium text-text-primary outline-none focus:border-primary"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Facility Manager Information */}
                  <div className="p-4 bg-surface-hover/40 rounded-2xl border border-border/80 space-y-3">
                    <h4 className="text-xs font-bold text-text-primary flex items-center gap-1.5 uppercase">
                      <FiUser className="w-3.5 h-3.5 text-primary" />
                      Facility / Warehouse Manager
                    </h4>
                    <CustomInput
                      label="Manager Full Name"
                      value={data.manager_name}
                      onChange={(e) => setData(prev => ({ ...prev, manager_name: e.target.value }))}
                      placeholder="Manager in-charge"
                    />
                    <CustomInput
                      label="Manager Business Email"
                      value={data.manager_email}
                      onChange={(e) => setData(prev => ({ ...prev, manager_email: e.target.value }))}
                      placeholder="manager@solarkits.in"
                    />
                    <div className="grid grid-cols-3 gap-2">
                      <div className="col-span-1">
                        <DropdownWithSearchInput
                          options={countries.map(c => ({
                            value: c.id,
                            text: `${c.phone_code} (${c.iso2})`
                          }))}
                          value={selectedCountryId}
                          onChange={handleCountrySelect}
                          placeholder="Code"
                        />
                      </div>
                      <div className="col-span-2">
                        <CustomInput
                          label="Mobile Phone"
                          value={data.manager_phone}
                          onChange={handlePhoneChange}
                          placeholder={`Phone (${minPhoneLen}-${maxPhoneLen} digits)`}
                          prefix={data.manager_phone_code || "+91"}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: PHYSICAL INFRASTRUCTURE & CAPACITY */}
              {activeFormTab === "capacity" && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <CustomInput
                      type="number"
                      label="Total Area (Sq. Ft.)"
                      value={data.warehouse_area_sqft}
                      onChange={(e) => setData(prev => ({ ...prev, warehouse_area_sqft: e.target.value }))}
                      placeholder="e.g. 25000"
                    />
                    <CustomInput
                      type="number"
                      label="Max Weight Capacity (KG)"
                      value={data.max_weight_capacity_kg}
                      onChange={(e) => setData(prev => ({ ...prev, max_weight_capacity_kg: e.target.value }))}
                      placeholder="e.g. 500000"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <CustomInput
                      type="number"
                      label="Max Pallet Capacity"
                      value={data.max_pallet_capacity}
                      onChange={(e) => setData(prev => ({ ...prev, max_pallet_capacity: e.target.value }))}
                      placeholder="e.g. 800"
                    />
                    <CustomInput
                      type="number"
                      label="Volume Capacity (Cu. Ft.)"
                      value={data.max_volume_cbf}
                      onChange={(e) => setData(prev => ({ ...prev, max_volume_cbf: e.target.value }))}
                      placeholder="e.g. 150000"
                    />
                  </div>

                  {/* Storage Type */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-text-secondary uppercase">Storage Environment</label>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { id: 'indoor', label: 'Indoor Enclosed' },
                        { id: 'outdoor', label: 'Open Yard' },
                        { id: 'mixed', label: 'Mixed / Sheltered' }
                      ].map(st => (
                        <button
                          key={st.id}
                          type="button"
                          onClick={() => setData(prev => ({ ...prev, storage_type: st.id }))}
                          className={`p-2.5 rounded-xl border text-xs font-bold transition-all cursor-pointer ${data.storage_type === st.id
                            ? "bg-primary text-white border-primary shadow-xs"
                            : "bg-surface text-text-secondary border-border hover:bg-surface-hover"
                            }`}
                        >
                          {st.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Physical Facilities Checkboxes */}
                  <div className="p-4 bg-surface-hover/30 rounded-2xl border border-border space-y-3">
                    <h4 className="text-xs font-bold text-text-primary uppercase">Physical Facility Capabilities</h4>
                    {[
                      { key: 'loading_facility', label: 'Loading Dock Available (Truck / Container Bays)' },
                      { key: 'unloading_facility', label: 'Dedicated Unloading Bay & Heavy Forklift Access' },
                      { key: 'racks_installed', label: 'Heavy Duty Industrial Pallet Racks Installed' }
                    ].map(fac => (
                      <label key={fac.key} className="flex items-center justify-between p-2 rounded-lg bg-surface border border-border cursor-pointer select-none">
                        <span className="text-xs font-medium text-text-primary">{fac.label}</span>
                        <input
                          type="checkbox"
                          checked={data.facilities?.[fac.key] ?? true}
                          onChange={(e) => setData(prev => ({
                            ...prev,
                            facilities: { ...prev.facilities, [fac.key]: e.target.checked }
                          }))}
                          className="w-4 h-4 text-primary rounded focus:ring-primary cursor-pointer"
                        />
                      </label>
                    ))}
                  </div>

                  {/* Operating Days & Hours */}
                  <div className="grid grid-cols-2 gap-3">
                    <CustomInput
                      label="Working Days"
                      value={data.operating_hours?.working_days || "Mon - Sat"}
                      onChange={(e) => setData(prev => ({
                        ...prev,
                        operating_hours: { ...prev.operating_hours, working_days: e.target.value }
                      }))}
                      placeholder="e.g. Mon - Sat"
                    />
                    <CustomInput
                      label="Daily Operational Hours"
                      value={data.operating_hours?.working_hours || "09:00 - 18:00"}
                      onChange={(e) => setData(prev => ({
                        ...prev,
                        operating_hours: { ...prev.operating_hours, working_hours: e.target.value }
                      }))}
                      placeholder="e.g. 09:00 - 18:00"
                    />
                  </div>
                </div>
              )}

              {/* TAB 3: OPERATIONAL PERMISSIONS */}
              {activeFormTab === "permissions" && (
                <div className="space-y-4">
                  <div className="p-3 bg-linear-120 from-primary/5 to-primary/10 rounded-xl border border-primary/20">
                    <p className="text-xs text-text-secondary leading-relaxed">
                      Control which operational workflows this facility is authorized to perform. Disabling a permission immediately halts that activity at this node without affecting other operations.
                    </p>
                  </div>

                  <div className="space-y-2.5">
                    {[
                      { key: 'inward', label: 'Inward Processing', desc: 'Permit receiving OEM purchase orders and vendor inbound consignments' },
                      { key: 'storage', label: 'Inventory Storage', desc: 'Permit holding certified bonded/commercial stock in warehouse inventory' },
                      { key: 'outward', label: 'Outward Processing', desc: 'Permit picking, staging, and packing materials for dispatch' },
                      { key: 'dispatch', label: 'Last-Mile & Bulk Dispatch', desc: 'Permit courier pickup, fleet dispatch, and bill of lading generation' },
                      { key: 'kit_assembly', label: 'Kit Preparation & Assembly', desc: 'Permit assembling loose components into Combo or Trial solar kits' }
                    ].map(perm => (
                      <div key={perm.key} className="p-3 rounded-xl border border-border bg-surface flex items-start justify-between gap-3">
                        <div>
                          <p className="font-bold text-xs text-text-primary">{perm.label}</p>
                          <p className="text-[11px] text-text-secondary mt-0.5">{perm.desc}</p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer shrink-0 mt-1">
                          <input
                            type="checkbox"
                            checked={data.operational_permissions?.[perm.key] ?? true}
                            onChange={(e) => setData(prev => ({
                              ...prev,
                              operational_permissions: { ...prev.operational_permissions, [perm.key]: e.target.checked }
                            }))}
                            className="sr-only peer"
                          />
                          <div className="w-9 h-5 bg-border peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-border after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary" />
                        </label>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* TAB 4: 5-CATEGORY AUDIT & INSPECTION PHOTOS */}
              {activeFormTab === "images" && (
                <div className="space-y-4">
                  <div className="p-3 bg-surface-hover/60 rounded-xl border border-border">
                    <p className="text-xs text-text-secondary leading-relaxed">
                      Upload or attach physical facility photographs across all 5 verification zones. These photos are audited during physical inspection prior to activation.
                    </p>
                  </div>

                  {[
                    { key: 'exterior', altKey: 'front_exterior', label: '1. Exterior Front & Gate' },
                    { key: 'storage', altKey: 'main_storage', label: '2. Main Storage Floor' },
                    { key: 'racks', altKey: 'product_racks', label: '3. Heavy Duty Racking' },
                    { key: 'loading_area', altKey: 'loading_unloading', label: '4. Loading / Unloading Bay' },
                    { key: 'security', altKey: 'office_security', label: '5. Office & Security Post' }
                  ].map(cat => {
                    const rawPhotos = data.categorized_images?.[cat.key] || data.categorized_images?.[cat.altKey] || [];
                    const photos = Array.isArray(rawPhotos) ? rawPhotos.filter(Boolean) : (rawPhotos ? [rawPhotos] : []);
                    return (
                      <div key={cat.key} className="p-3.5 bg-surface rounded-xl border border-border space-y-2.5">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-text-primary">{cat.label}</span>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-surface-hover text-text-secondary border border-border">
                            {photos.length} photos
                          </span>
                        </div>

                        {/* Existing Photo Thumbnails */}
                        {photos.length > 0 && (
                          <div className="grid grid-cols-4 gap-2">
                            {photos.map((src, i) => (
                              <div key={i} className="relative group rounded-lg overflow-hidden border border-border aspect-square bg-black/5">
                                <img src={src} alt="Facility" className="w-full h-full object-cover" />
                                <button
                                  type="button"
                                  onClick={() => handleRemoveImage(cat.key, i)}
                                  className="absolute top-1 right-1 bg-red-600 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                                >
                                  &times;
                                </button>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* File Upload & URL inputs */}
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            placeholder="Paste image URL..."
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                handleAddImageUrl(cat.key, e.target.value);
                                e.target.value = '';
                              }
                            }}
                            className="flex-1 h-9 px-3 bg-surface border border-border rounded-lg text-xs font-medium text-text-primary outline-none focus:border-primary"
                          />
                          <label className="h-9 px-3 bg-surface-hover hover:bg-border/60 border border-border rounded-lg text-xs font-bold text-text-primary flex items-center gap-1.5 cursor-pointer shrink-0">
                            <FiPlus className="w-3.5 h-3.5" />
                            Upload
                            <input
                              type="file"
                              accept="image/*"
                              onChange={(e) => handleLocalImageUpload(cat.key, e)}
                              className="hidden"
                            />
                          </label>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* SAVE / SUBMIT BUTTON & VALIDATION CHECKLIST */}
              <div className="pt-4 border-t border-border space-y-3">
                <RenderIfPermission
                  requiredUniqueId={moduleUniqueId}
                  permission={warehouseId ? "edit" : "add"}
                  fallback={null}
                >
                  <Button
                    onClick={handleSubmit}
                    disabled={loading || !isSubmitReady}
                    variant="primary"
                    size="lg"
                    fullWidth
                    leftIcon={loading ? null : <FiSave />}
                    loading={loading}
                    className="bg-linear-120 from-primary to-primary-end shadow-lg hover:shadow-xl font-bold text-sm h-12"
                  >
                    {loading
                      ? "Saving Warehouse..."
                      : warehouseId
                        ? "Update Master Warehouse"
                        : data.warehouse_type === "company"
                          ? "Register Company Warehouse"
                          : data.warehouse_type === "3pl"
                            ? "Register 3PL Warehouse"
                            : "Register Master Warehouse"
                    }
                  </Button>
                </RenderIfPermission>

                {/* Validation Status Checklist */}
                <div className="space-y-1.5 text-xs">
                  {!data.lat || !data.lng ? (
                    <div className="flex items-center gap-1.5 text-amber-600">
                      <FiAlertCircle className="shrink-0" />
                      <span>Select coordinates on map</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5 text-green-600">
                      <FiCheckCircle className="shrink-0" />
                      <span>GPS location captured ✓</span>
                    </div>
                  )}

                  {!data.warehouse_type ? (
                    <div className="flex items-center gap-1.5 text-amber-600">
                      <FiAlertCircle className="shrink-0" />
                      <span>Select warehouse ownership model</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5 text-green-600">
                      <FiCheckCircle className="shrink-0" />
                      <span>{data.warehouse_type === 'company' ? 'Company Owned' : '3PL Vendor'} model selected ✓</span>
                    </div>
                  )}

                  {data.warehouse_type === "3pl" && !data.vendor_id && (
                    <div className="flex items-center gap-1.5 text-amber-600">
                      <FiAlertCircle className="shrink-0" />
                      <span>Select an approved 3PL logistics partner</span>
                    </div>
                  )}
                </div>
              </div>

            </div>
          </div>
        </div>
      </div>

      {/* 3PL VENDOR ONBOARDING MODAL */}
      <ThreePLVendorManagementModal
        isOpen={isVendorModalOpen}
        onClose={() => setIsVendorModalOpen(false)}
        moduleUniqueId={moduleUniqueId}
        onVendorSelected={(vendor) => {
          fetchApprovedVendors();
          setData(prev => ({ ...prev, vendor_id: vendor._id || vendor.id }));
          setIsVendorModalOpen(false);
          dispatch(setAlert({ type: "success", message: `Partner ${vendor.company_name} selected.` }));
        }}
      />
    </div>
  );
}
