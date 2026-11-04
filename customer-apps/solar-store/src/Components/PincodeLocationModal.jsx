import React, { useState, useEffect } from "react";
import { useSelector, useDispatch } from "react-redux";
import axios from "axios";
import { setSelectedLocation, setAlert, getAvailableKitData, fetchLiveInventory } from "../features/slice";
import Dialog from "./Dialog";
import Button from "./Button";
import {
  FiMapPin,
  FiSearch,
  FiCheckCircle,
  FiAlertCircle,
  FiNavigation,
  FiChevronRight,
  FiClock,
  FiTruck,
  FiAward
} from "react-icons/fi";

const POPULAR_LOCATIONS = [
  { pincode: "360001", district: "Rajkot", state: "Gujarat" },
  { pincode: "380001", district: "Ahmedabad", state: "Gujarat" },
  { pincode: "395001", district: "Surat", state: "Gujarat" },
  { pincode: "411001", district: "Pune", state: "Maharashtra" },
  { pincode: "400001", district: "Mumbai", state: "Maharashtra" },
  { pincode: "302001", district: "Jaipur", state: "Rajasthan" },
  { pincode: "110001", district: "New Delhi", state: "Delhi" },
  { pincode: "560001", district: "Bengaluru", state: "Karnataka" },
];

export default function PincodeLocationModal({ isOpen, onClose }) {
  const dispatch = useDispatch();
  const apiBase = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

  const { selectedState, selectedDistrict, selectedPincode } = useSelector(
    (state) => state.slice
  );
  const { user } = useSelector((state) => state.auth_slice);
  const isEpcUser = Boolean(user && (user.gstin || user.primaryLocation));

  const [pincodeInput, setPincodeInput] = useState(selectedPincode || "");
  const [checkingPin, setCheckingPin] = useState(false);
  const [pincodeResult, setPincodeResult] = useState(null);
  const [pincodeError, setPincodeError] = useState("");

  // Manual Dropdown States
  const [activeTab, setActiveTab] = useState("pincode"); // 'pincode' | 'state_district'
  const [statesList, setStatesList] = useState([]);
  const [districtsList, setDistrictsList] = useState([]);
  const [manualState, setManualState] = useState(selectedState?.id || selectedState?._id || "");
  const [manualDistrict, setManualDistrict] = useState(selectedDistrict?.id || selectedDistrict?._id || "");

  // Load States for manual tab
  useEffect(() => {
    if (!isOpen) return;
    const fetchStates = async () => {
      try {
        const res = await axios.get(`${apiBase}/india/v1/geo/states`);
        if (res.data?.states) {
          setStatesList(res.data.states);
        }
      } catch (err) {
        console.error("Error fetching states:", err);
      }
    };
    fetchStates();
  }, [isOpen, apiBase]);

  // Load Districts when manualState changes
  useEffect(() => {
    if (!manualState) {
      setDistrictsList([]);
      return;
    }
    const fetchDistricts = async () => {
      try {
        const res = await axios.get(`${apiBase}/india/v1/geo/districts?state_id=${manualState}`);
        if (res.data?.districts) {
          setDistrictsList(res.data.districts);
        }
      } catch (err) {
        console.error("Error fetching districts:", err);
      }
    };
    fetchDistricts();
  }, [manualState, apiBase]);

  // Fast Pincode Lookup Handler
  const handleCheckPincode = async (pinToTest) => {
    const pin = (pinToTest || pincodeInput || "").trim();
    if (!pin || pin.length < 3) {
      setPincodeError("Please enter at least 3 digits of your pincode.");
      return;
    }

    setCheckingPin(true);
    setPincodeError("");
    setPincodeResult(null);

    try {
      const res = await axios.get(`${apiBase}/india/v1/geo/pincode-lookup`, {
        params: { pincode: pin },
      });

      if (res.data?.success && res.data?.district) {
        setPincodeResult(res.data);
      } else {
        setPincodeError(res.data?.message || `Pincode ${pin} not found in database.`);
      }
    } catch (err) {
      console.warn("Pincode lookup failed:", err);
      setPincodeError(
        err.response?.data?.message || `Pincode ${pin} is not in our direct database. Please pick your State & District manually.`
      );
    } finally {
      setCheckingPin(false);
    }
  };

  // Auto-trigger lookup when 6 digits are typed
  const handlePincodeChange = (e) => {
    const val = e.target.value.replace(/\D/g, "").slice(0, 6);
    setPincodeInput(val);
    setPincodeError("");
    if (val.length === 6) {
      handleCheckPincode(val);
    } else {
      setPincodeResult(null);
    }
  };

  // Apply Pincode Selection
  const handleApplyPincodeResult = (resultObj) => {
    const r = resultObj || pincodeResult;
    if (!r || !r.district) return;

    const stateObj = {
      id: r.state?.id || r.state?._id,
      _id: r.state?.id || r.state?._id,
      name: r.state?.name,
    };
    const distObj = {
      id: r.district?.id || r.district?._id,
      _id: r.district?.id || r.district?._id,
      name: r.district?.name,
      state_id: stateObj.id,
    };

    dispatch(
      setSelectedLocation({
        selectedState: stateObj,
        selectedDistrict: distObj,
        selectedPincode: r.pincode || pincodeInput,
      })
    );

    // Refresh kits & inventory for new district
    if (distObj.id) {
      dispatch(getAvailableKitData({ districtId: distObj.id }));
      dispatch(fetchLiveInventory({ districtId: distObj.id }));
    }

    dispatch(
      setAlert({
        type: "success",
        message: `Location set to ${r.pincode ? `${r.pincode} - ` : ""}${distObj.name}, ${stateObj.name}. Best Seller kits updated!`,
      })
    );

    if (onClose) onClose();
  };

  // Apply Manual State/District
  const handleApplyManual = () => {
    const foundState = statesList.find(
      (s) => (s.id || s._id) === manualState
    );
    const foundDist = districtsList.find(
      (d) => (d.id || d._id) === manualDistrict
    );

    if (!foundState || !foundDist) {
      setPincodeError("Please select both a State and a District.");
      return;
    }

    dispatch(
      setSelectedLocation({
        selectedState: foundState,
        selectedDistrict: foundDist,
        selectedPincode: null,
      })
    );

    if (foundDist.id || foundDist._id) {
      const distId = foundDist.id || foundDist._id;
      dispatch(getAvailableKitData({ districtId: distId }));
      dispatch(fetchLiveInventory({ districtId: distId }));
    }

    dispatch(
      setAlert({
        type: "success",
        message: `Location set to ${foundDist.name}, ${foundState.name}. Kits filtered!`,
      })
    );

    if (onClose) onClose();
  };

  // Quick Preset Click
  const handleQuickSelect = (loc) => {
    setPincodeInput(loc.pincode);
    handleCheckPincode(loc.pincode).then(() => {
      // Auto apply if exact match
      const stateObj = { id: `state_${loc.state.toLowerCase()}`, name: loc.state };
      const distObj = { id: `dist_${loc.district.toLowerCase()}`, name: loc.district };
      dispatch(
        setSelectedLocation({
          selectedState: stateObj,
          selectedDistrict: distObj,
          selectedPincode: loc.pincode,
        })
      );
    });
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title="Select Your Delivery Region / Pincode"
      size="md"
    >
      <div className="space-y-5">
        {/* Notice Info */}
        <div className="p-3 bg-primary-50 dark:bg-primary-950/40 border border-primary-200 dark:border-primary-800 rounded-xl flex items-start gap-2.5">
          <FiMapPin className="text-primary-600 dark:text-primary-400 mt-0.5 shrink-0 text-base" />
          <p className="text-xs text-text-secondary leading-relaxed">
            Enter your <strong>6-digit Pincode</strong> to view available solar combo kits, live stock at regional warehouses, and <strong>top-ranked Best Seller kits</strong> for your area.
          </p>
        </div>

        {/* Tab Toggle */}
        <div className="flex rounded-xl bg-surface-hover p-1 border border-border">
          <button
            type="button"
            onClick={() => setActiveTab("pincode")}
            className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
              activeTab === "pincode"
                ? "bg-white dark:bg-surface text-primary shadow-xs"
                : "text-text-muted hover:text-text-primary"
            }`}
          >
            Enter 6-Digit Pincode
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("state_district")}
            className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
              activeTab === "state_district"
                ? "bg-white dark:bg-surface text-primary shadow-xs"
                : "text-text-muted hover:text-text-primary"
            }`}
          >
            Select State & District
          </button>
        </div>

        {/* TAB 1: PINCODE INPUT */}
        {activeTab === "pincode" && (
          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-text-primary block">
                Delivery Pincode
              </label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <FiNavigation className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted text-sm" />
                  <input
                    type="text"
                    inputMode="numeric"
                    placeholder="Enter 6-digit PIN (e.g. 360001)"
                    value={pincodeInput}
                    onChange={handlePincodeChange}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleCheckPincode();
                      }
                    }}
                    className="w-full h-11 pl-10 pr-4 bg-surface border border-border focus:border-primary-500 rounded-xl text-sm font-bold tracking-widest text-text-primary outline-none transition-colors"
                  />
                </div>
                <Button
                  type="button"
                  variant="primary"
                  size="md"
                  onClick={() => handleCheckPincode()}
                  disabled={checkingPin || !pincodeInput}
                  className="font-bold shrink-0 px-5"
                >
                  {checkingPin ? "Checking..." : "Verify PIN"}
                </Button>
              </div>
            </div>

            {/* Error Message */}
            {pincodeError && (
              <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-xl flex items-center gap-2 text-xs text-rose-700 dark:text-rose-300 font-medium">
                <FiAlertCircle className="shrink-0 text-sm" />
                <span>{pincodeError}</span>
              </div>
            )}

            {/* Pincode Match Result Card */}
            {pincodeResult && (
              <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 border-2 border-emerald-500/40 rounded-2xl space-y-3 animate-fadeIn">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-emerald-500 text-white flex items-center justify-center font-black">
                      <FiCheckCircle size={18} />
                    </div>
                    <div>
                      <h4 className="font-black text-sm text-text-primary">
                        PIN: {pincodeResult.pincode} Serviceable
                      </h4>
                      <p className="text-xs text-emerald-700 dark:text-emerald-300 font-bold mt-0.5">
                        {pincodeResult.district?.name}, {pincodeResult.state?.name}
                      </p>
                    </div>
                  </div>
                  <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30">
                    Active Delivery Hub
                  </span>
                </div>

                <div className="flex items-center gap-4 text-[11px] text-text-secondary pt-1 border-t border-emerald-200 dark:border-emerald-800/50">
                  <span className="flex items-center gap-1">
                    <FiTruck className="text-emerald-600 dark:text-emerald-400" /> Direct Delivery
                  </span>
                  <span className="flex items-center gap-1">
                    <FiAward className="text-amber-500" /> Regional Best Sellers Active
                  </span>
                </div>

                <Button
                  type="button"
                  variant="primary"
                  size="md"
                  onClick={() => handleApplyPincodeResult(pincodeResult)}
                  className="w-full font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-md cursor-pointer"
                >
                  Deliver to {pincodeResult.district?.name} &rarr;
                </Button>
              </div>
            )}

            {/* Quick Suggestions / Popular Centers */}
            <div className="pt-2">
              <span className="text-[11px] font-bold text-text-secondary uppercase tracking-wider block mb-2">
                Popular Solar Hubs:
              </span>
              <div className="flex flex-wrap gap-1.5">
                {POPULAR_LOCATIONS.map((loc) => (
                  <button
                    key={loc.pincode}
                    type="button"
                    onClick={() => handleQuickSelect(loc)}
                    className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-surface border border-border hover:border-primary-500 hover:text-primary transition-colors cursor-pointer"
                  >
                    📍 {loc.district} ({loc.pincode})
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: MANUAL STATE & DISTRICT */}
        {activeTab === "state_district" && (
          <div className="space-y-4">
            {/* State Select */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-text-primary block">
                Select State
              </label>
              <select
                value={manualState}
                onChange={(e) => {
                  setManualState(e.target.value);
                  setManualDistrict("");
                }}
                className="w-full h-11 px-3 bg-surface border border-border rounded-xl text-xs font-semibold text-text-primary outline-none focus:border-primary-500"
              >
                <option value="">-- Choose State --</option>
                {statesList.map((s) => (
                  <option key={s.id || s._id} value={s.id || s._id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>

            {/* District Select */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-text-primary block">
                Select District
              </label>
              <select
                value={manualDistrict}
                onChange={(e) => setManualDistrict(e.target.value)}
                disabled={!manualState}
                className="w-full h-11 px-3 bg-surface border border-border rounded-xl text-xs font-semibold text-text-primary outline-none focus:border-primary-500 disabled:opacity-50"
              >
                <option value="">-- Choose District --</option>
                {districtsList.map((d) => (
                  <option key={d.id || d._id} value={d.id || d._id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </div>

            <Button
              type="button"
              variant="primary"
              size="md"
              onClick={handleApplyManual}
              disabled={!manualState || !manualDistrict}
              className="w-full font-bold mt-2"
            >
              Set Location & Filter Kits
            </Button>
          </div>
        )}

        {/* Current Active Location Display */}
        <div className="pt-2 border-t border-border flex items-center justify-between text-xs text-text-secondary">
          <span>Current active location:</span>
          <span className="font-bold text-text-primary flex items-center gap-1">
            <FiMapPin className="text-primary-500" />
            {selectedDistrict?.name
              ? `${selectedPincode ? `${selectedPincode} - ` : ""}${selectedDistrict.name}, ${selectedState?.name || "India"}`
              : "All India (Not Selected)"}
          </span>
        </div>
      </div>
    </Dialog>
  );
}

