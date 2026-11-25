import { useState, useEffect, useRef } from "react";
import { useLoadScript } from "@react-google-maps/api";
import axios from "axios";
import { authHeaderObj } from "@/app/authHeader";
import ReactCountryFlag from "react-country-flag";
import DropdownWithSearchInput from "@/components/DropdownWithSearchInput";
import MultiSelectDropdownWithSearchInput from "@/components/MultiSelectDropdownWithSearchInput";
import UniversalMap from "@/components/UniversalMap";
import RenderIfPermission from "@/components/PermissionCheck";
import Button from "@/components/Button";
import Loader from "@/components/Loader";
import {
  FaGlobeAmericas,
  FaMapMarkerAlt,
  FaBuilding,
  FaClock,
  FaExclamationTriangle,
  FaCheckCircle,
  FaTimes,
  FaSpinner
} from 'react-icons/fa';
import { FiLayers } from "react-icons/fi";
import PageHeader from "@/components/PageHeader";

const defaultCenter = { lat: 20.5937, lng: 78.9629 };
const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
const API_URL = import.meta.env.VITE_API_URL;

export default function LocationOverview({ moduleUniqueId }) {
  const [countries, setCountries] = useState([]);
  const [states, setStates] = useState([]);
  const [districts, setDistricts] = useState([]);

  const [country, setCountry] = useState("");
  const [state, setState] = useState([]);
  const [district, setDistrict] = useState([]);

  const [mapCenter, setMapCenter] = useState(defaultCenter);
  const [boundaries, setBoundaries] = useState([]);
  const [loading, setLoading] = useState(false);

  const activeRequests = useRef(new Set());

  const { isLoaded, loadError } = useLoadScript({
    googleMapsApiKey: GOOGLE_MAPS_API_KEY,
  });

  // ✅ Fetch countries on mount
  useEffect(() => {
    setLoading(true);
    axios
      .get(`${API_URL}/geolocation/countries?unique_id=${moduleUniqueId}&req_for=view`, {
        headers: { ...authHeaderObj() },
      })
      .then((res) => {
        const formatted = res.data.countries.map((c) => ({
          text: (
            <span className="flex items-center gap-2">
              <ReactCountryFlag countryCode={c.iso2} svg className="w-5 h-5 rounded-sm shadow-sm" />
              {c.name}
            </span>
          ),
          value: c.id,
          iso2: c.iso2,
        }));
        setCountries(formatted);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!country) {
      removeAllBoundaries();
      return;
    }

    removeAllBoundaries();

    axios
      .post(
        `${API_URL}/geolocation/states?unique_id=${moduleUniqueId}&req_for=view`,
        { country_id: country },
        { headers: { ...authHeaderObj() } }
      )
      .then((res) => {
        const formatted = res.data.states.map(({ id, name }) => ({
          text: name,
          value: id,
        }));
        setStates(formatted);
        fetchBoundary("country", country);
      })
      .catch(console.error);
  }, [country]);

  // ✅ Handle State changes
  useEffect(() => {
    const currentStates = new Set(state);
    const previousStates = new Set(boundaries.filter((b) => b.level === "state").map((b) => b.id));

    // 🧹 Remove deselected states and their districts
    for (const oldStateId of previousStates) {
      if (!currentStates.has(oldStateId)) {
        removePolygon("state", oldStateId);
        removeDistrictsByParent(oldStateId);
      }
    }

    // 🎯 Fetch newly selected states
    for (const newStateId of state) {
      if (!previousStates.has(newStateId)) {
        fetchBoundary("state", newStateId);
      }
    }

    // 🧹 Clear all districts if no states are selected
    if (!state.length) {
      clearAllDistricts();
      return;
    }

    // ✅ Fetch districts for selected states
    const fetchAllDistricts = async () => {
      try {
        const allDistricts = [];
        for (const stateId of state) {
          const res = await axios.post(
            `${API_URL}/geolocation/districts?unique_id=${moduleUniqueId}&req_for=view`,
            { state_id: stateId },
            { headers: { ...authHeaderObj() } }
          );
          const formatted = res.data.districts.map(({ id, name }) => ({
            text: name,
            value: id,
            state_id: stateId,
          }));
          allDistricts.push(...formatted);
        }
        setDistricts(allDistricts);
      } catch (err) {
        console.error("❌ Error fetching districts:", err);
      }
    };

    fetchAllDistricts();
  }, [state]);

  // ✅ Handle District changes
  useEffect(() => {
    const currentDistricts = new Set(district);
    const previousDistricts = new Set(boundaries.filter((b) => b.level === "district").map((b) => b.id));

    for (const oldDistrictId of previousDistricts) {
      if (!currentDistricts.has(oldDistrictId)) {
        removePolygon("district", oldDistrictId);
      }
    }

    for (const newDistrictId of district) {
      if (!previousDistricts.has(newDistrictId)) {
        fetchBoundary("district", newDistrictId);
      }
    }
  }, [district]);

  const fetchBoundary = async (level, idOrName) => {
    const requestKey = `${level}-${idOrName}`;
    activeRequests.current.add(requestKey);

    try {
      let url = "";
      let payload = {};

      const countryName = countries.find(c => c.value === country)?.text.props.children[1];
      const stateName = states.find(s => s.value === idOrName)?.text || null;
      const districtName = districts.find(d => d.value === idOrName)?.text || null;

      if (level === "country") {
        url = `${API_URL}/geolocation/country?unique_id=${moduleUniqueId}&req_for=view`;
        payload = { country: countryName };
      } else if (level === "state") {
        url = `${API_URL}/geolocation/state?unique_id=${moduleUniqueId}&req_for=view`;
        payload = { state: stateName, country: countryName };
      } else {
        url = `${API_URL}/geolocation/district?unique_id=${moduleUniqueId}&req_for=view`;
        payload = {
          district: districtName,
          state: states.find(s => s.value === districts.find(d => d.value === idOrName)?.state_id)?.text,
          country: countryName,
        };
      }

      const res = await axios.post(url, payload, {
        headers: { ...authHeaderObj() },
      });

      if (!activeRequests.current.has(requestKey)) return;

      const geo = res.data.country || res.data.state || res.data.district;
      if (!geo || !geo.geometry) return;

      // State id for district
      const stateIdForDistrict =
        level === "district"
          ? districts.find((d) => d.value === idOrName)?.state_id
          : null;

      // add/update boundaries entry for this geometry
      setBoundaries((prev) => {
        const filtered = prev.filter((b) => !(b.level === level && b.id === idOrName));
        return [
          ...filtered,
          {
            id: idOrName,
            level,
            geometry: geo.geometry,
            lat: geo.lat,
            lng: geo.lng,
            state_id: stateIdForDistrict,
          },
        ];
      });

      // center map on boundary if geo lat/lng provided
      if (geo.lat && geo.lng) setMapCenter({ lat: +geo.lat, lng: +geo.lng });
    } catch (err) {
      console.error(`❌ Boundary fetch failed for ${level}:`, err);
    } finally {
      activeRequests.current.delete(requestKey);
    }
  };

  // 🧹 Remove specific boundary entries
  const removePolygon = (level, id) => {
    setBoundaries((prev) => prev.filter((b) => !(b.level === level && b.id === id)));
  };

  // 🧹 Remove all districts for a given state
  const removeDistrictsByParent = (stateId) => {
    const toRemove = districts.filter((d) => d.state_id === stateId);
    toRemove.forEach((d) => removePolygon("district", d.value));
    setDistrict((prev) => prev.filter((id) => !toRemove.some((d) => d.value === id)));
  };

  // 🧹 Clear all district boundaries
  const clearAllDistricts = () => {
    setBoundaries((prev) => prev.filter((b) => b.level !== "district"));
    setDistrict([]);
  };

  // 🧹 Remove everything (clear boundaries and selection lists)
  const removeAllBoundaries = () => {
    setBoundaries([]);
    setStates([]);
    setState([]);
    setDistricts([]);
    setDistrict([]);
    setMapCenter(defaultCenter);
  };

  const handleClearAll = () => {
    removeAllBoundaries();
    setCountry("");
  };

  if (loadError) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="card shadow-sm p-8 text-center max-w-md">
        <div className="w-20 h-20 rounded-xl bg-linear-to-br from-red-500 to-red-600 flex items-center justify-center mx-auto mb-4">
          <FaExclamationTriangle className="text-white text-3xl" />
        </div>
        <h3 className="text-xl font-bold text-danger mb-3">Error loading map</h3>
        <p className="text-text-secondary mb-6">Please check your internet connection and try again.</p>
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

  if (!isLoaded) return (
    <div className="min-h-screen flex items-center justify-center">
      <Loader text="Loading map..." />
    </div>
  );

  return (
    <div className="space-y-6 pb-24 animate-in fade-in duration-500">
      <PageHeader
        title="Geographic Intelligence Overview"
        subtitle="Visualize and manage geographic boundaries, states, and city-level territories."
        icon={FaGlobeAmericas}
        stats={[
          { label: "Countries", value: countries.length, description: "Available total" },
          { label: "State Reach", value: states.length, description: "In selection" },
          { label: "District Count", value: districts.length, description: "In selection" },
          { label: "Boundaries", value: boundaries.length, description: "On map" }
        ]}
      />

      {/* Selection Controls - Edit Permission */}
      <RenderIfPermission
        requiredUniqueId={moduleUniqueId}
        permission="edit"
        fallback={
          <div className="card shadow-sm p-8 text-center">
            <div className="w-20 h-20 rounded-xl bg-linear-to-br from-primary to-primary-end flex items-center justify-center mx-auto mb-4">
              <FaMapMarkerAlt className="text-white text-3xl" />
            </div>
            <h3 className="text-xl font-bold text-text-primary mb-2">Access Restricted</h3>
            <p className="text-text-secondary mb-4">You don't have permission to manage locations.</p>
          </div>
        }
      >
        <div className="card shadow-sm hover:shadow-md transition-all duration-300">
          <div className="p-5">
            {/* Last updated badge */}
            <div className="flex justify-end mb-4">
              <span className="text-xs bg-linear-120 from-primary/5 to-primary/15 text-text-secondary px-2 py-1 rounded-full flex items-center gap-1">
                <FaClock size={10} />
                Location selection
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Country Selection */}
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-linear-to-br from-primary to-primary-end text-white">
                    <FaGlobeAmericas className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-text-primary">Country</h4>
                    <p className="text-xs text-text-secondary">Select a country to begin</p>
                  </div>
                </div>
                <DropdownWithSearchInput
                  value={country}
                  onChange={setCountry}
                  options={countries}
                  className="w-full"
                  placeholder="Search country..."
                />
              </div>

              {/* State Selection */}
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-linear-to-br from-green-500 to-green-600 text-white">
                    <FaMapMarkerAlt className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-text-primary">State/Region</h4>
                    <p className="text-xs text-text-secondary">Select one or more states</p>
                  </div>
                </div>
                <MultiSelectDropdownWithSearchInput
                  values={state}
                  onChange={setState}
                  options={states}
                  disabled={!country}
                  className="w-full"
                  placeholder={country ? "Search states..." : "Select country first"}
                />
              </div>

              {/* District Selection */}
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-linear-to-br from-amber-500 to-amber-600 text-white">
                    <FaBuilding className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-text-primary">District/City</h4>
                    <p className="text-xs text-text-secondary">Select one or more districts</p>
                  </div>
                </div>
                <MultiSelectDropdownWithSearchInput
                  values={district}
                  onChange={setDistrict}
                  options={districts}
                  disabled={!state.length}
                  className="w-full"
                  placeholder={state.length ? "Search districts..." : "Select states first"}
                />
              </div>
            </div>

            {country && (
              <div className="mt-4 flex justify-end">
                <Button
                  variant="outline-primary"
                  size="sm"
                  onClick={handleClearAll}
                  leftIcon={<FaTimes />}
                  className="border border-primary/30 hover:bg-primary/5"
                >
                  Clear All Boundaries
                </Button>
              </div>
            )}

            {/* Selection Summary */}
            <div className="mt-6 pt-6 border-t border-border">
              <div className="flex flex-wrap items-center gap-3">
                <span className="text-sm font-medium text-text-secondary">Selected:</span>
                {country && (
                  <span className="inline-flex items-center gap-1 px-3 py-1.5 bg-primary/10 text-primary rounded-full text-sm font-medium">
                    <FaGlobeAmericas className="w-3 h-3" />
                    {countries.find(c => c.value === country)?.text.props.children[1]}
                  </span>
                )}
                {state.map(stateId => {
                  const stateObj = states.find(s => s.value === stateId);
                  return stateObj ? (
                    <span key={stateId} className="inline-flex items-center gap-1 px-3 py-1.5 bg-green-100 text-green-700 rounded-full text-sm font-medium">
                      <FaMapMarkerAlt className="w-3 h-3" />
                      {stateObj.text}
                    </span>
                  ) : null;
                })}
                {district.map(districtId => {
                  const districtObj = districts.find(d => d.value === districtId);
                  return districtObj ? (
                    <span key={districtId} className="inline-flex items-center gap-1 px-3 py-1.5 bg-amber-100 text-amber-700 rounded-full text-sm font-medium">
                      <FaBuilding className="w-3 h-3" />
                      {districtObj.text}
                    </span>
                  ) : null;
                })}
                {!country && !state.length && !district.length && (
                  <span className="text-text-muted text-sm italic">No locations selected</span>
                )}
              </div>
            </div>
          </div>
        </div>
      </RenderIfPermission>

      {/* Map Display - View Permission */}
      <RenderIfPermission
        requiredUniqueId={moduleUniqueId}
        permission="view"
      >
        <div className="card shadow-sm hover:shadow-md transition-all duration-300">
          <div className="p-5">
            <div className="flex justify-end mb-4">
              <span className="text-xs bg-linear-120 from-primary/5 to-primary/15 text-text-secondary px-2 py-1 rounded-full flex items-center gap-1">
                <FaClock size={10} />
                Interactive map
              </span>
            </div>

            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-linear-to-br from-primary to-primary-end text-white">
                  <FiLayers className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-text-primary">Interactive Map</h3>
                  <p className="text-text-secondary text-sm">Visual representation of selected boundaries</p>
                </div>
              </div>

              {/* Legend */}
              <div className="flex items-center gap-4 bg-primary/5 px-4 py-2 rounded-lg">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-primary"></div>
                  <span className="text-xs text-text-secondary">Country</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-green-500"></div>
                  <span className="text-xs text-text-secondary">State</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-amber-500"></div>
                  <span className="text-xs text-text-secondary">District</span>
                </div>
              </div>
            </div>

            <div className="relative rounded-xl border border-border" style={{ height: "500px", width: "100%" }}>
              <UniversalMap
                center={mapCenter}
                zoom={5}
                boundaries={boundaries}
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
                    },
                    {
                      featureType: "poi",
                      stylers: [{ visibility: "off" }]
                    },
                    {
                      featureType: "road",
                      elementType: "labels.icon",
                      stylers: [{ visibility: "off" }]
                    },
                    {
                      featureType: "transit",
                      stylers: [{ visibility: "off" }]
                    }
                  ]
                }}
                containerStyle={{ width: "100%", height: "100%" }}
              />
            </div>

            {/* Map Info */}
            {boundaries.length > 0 && (
              <div className="mt-4 p-3 bg-primary/5 rounded-lg border border-primary/20">
                <p className="text-sm text-text-secondary flex items-center gap-2">
                  <FaCheckCircle className="text-success" />
                  {boundaries.length} boundary/boundaries loaded on map
                </p>
              </div>
            )}
          </div>
        </div>
      </RenderIfPermission>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="card shadow-sm p-5">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-linear-to-br from-primary to-primary-end text-white">
              <FaGlobeAmericas className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm text-text-secondary">Selected Country</p>
              <p className="text-xl font-bold text-text-primary">
                {country ? countries.find(c => c.value === country)?.text.props.children[1] || "None" : "None"}
              </p>
            </div>
          </div>
        </div>

        <div className="card shadow-sm p-5">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-linear-to-br from-green-500 to-green-600 text-white">
              <FaMapMarkerAlt className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm text-text-secondary">Selected States</p>
              <p className="text-xl font-bold text-text-primary">{state.length} state(s)</p>
            </div>
          </div>
        </div>

        <div className="card shadow-sm p-5">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-linear-to-br from-amber-500 to-amber-600 text-white">
              <FaBuilding className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm text-text-secondary">Selected Districts</p>
              <p className="text-xl font-bold text-text-primary">{district.length} district(s)</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}