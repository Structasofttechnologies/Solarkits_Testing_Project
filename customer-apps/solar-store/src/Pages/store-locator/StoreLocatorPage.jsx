import React, { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import {
  FiMapPin,
  FiNavigation,
  FiPhoneCall,
  FiSearch,
  FiTruck,
  FiCompass,
  FiCheckCircle,
} from "react-icons/fi";
import { fetchNearbyStores, calculateDistanceKm, FALLBACK_STORES } from "@/services/storeLocatorService";

const STATES_LIST = [
  "All States",
  "Gujarat",
  "Maharashtra",
  "Delhi",
  "Karnataka",
  "Rajasthan",
  "Telangana",
  "Tamil Nadu",
];

export default function StoreLocatorPage() {
  const [stores, setStores] = useState(FALLBACK_STORES);
  const [selectedStore, setSelectedStore] = useState(FALLBACK_STORES[0]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedState, setSelectedState] = useState("All States");
  const [userLocation, setUserLocation] = useState(null);
  const [locationDetecting, setLocationDetecting] = useState(false);
  const [locationError, setLocationError] = useState(null);

  useEffect(() => {
    document.title = "Find Nearby Solar Store — Authorized Stores & Centers | SOLARKITS";
    fetchNearbyStores()
      .then((data) => {
        setStores(data);
        if (data.length > 0) setSelectedStore(data[0]);
      })
      .catch(() => {});
  }, []);

  const handleDetectLocation = () => {
    if (!navigator.geolocation) {
      setLocationError("Geolocation is not supported by your browser.");
      return;
    }
    setLocationDetecting(true);
    setLocationError(null);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        setUserLocation({ lat: latitude, lng: longitude });
        setLocationDetecting(false);

        fetchNearbyStores({ lat: latitude, lng: longitude })
          .then((data) => {
            setStores(data);
            if (data.length > 0) setSelectedStore(data[0]);
          })
          .catch(() => {});
      },
      (err) => {
        setLocationDetecting(false);
        setLocationError("Could not retrieve your location. Please search by PIN code or city.");
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  };

  const filteredStores = useMemo(() => {
    let list = [...stores];

    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      list = list.filter(
        (s) =>
          s.name.toLowerCase().includes(q) ||
          s.city.toLowerCase().includes(q) ||
          s.state.toLowerCase().includes(q) ||
          s.pincode.includes(q) ||
          s.address.toLowerCase().includes(q)
      );
    }

    if (selectedState !== "All States") {
      list = list.filter((s) => s.state.toLowerCase() === selectedState.toLowerCase());
    }

    if (userLocation?.lat && userLocation?.lng) {
      list = list.map((s) => ({
        ...s,
        distance_km: calculateDistanceKm(userLocation.lat, userLocation.lng, s.lat, s.lng),
      }));
      list.sort((a, b) => (a.distance_km || 99999) - (b.distance_km || 99999));
    }

    return list;
  }, [stores, searchQuery, selectedState, userLocation]);

  return (
    <div className="w-full space-y-6 pb-8 animate-in fade-in duration-200">
      
      {/* Blue Header Banner matching Dashboard styling */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-2xl p-6 text-white shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-blue-200 flex items-center gap-1.5">
            <FiMapPin size={14} />
            <span>SOLARKITS Fulfillment & Partner Network</span>
          </span>
          <h1 className="text-2xl sm:text-3xl font-black mt-1">
            Find Nearby Solar Stores
          </h1>
          <p className="text-xs sm:text-sm text-blue-100 mt-1">
            Locate authorized experience centers, regional warehouses, and certified EPC partner hubs.
          </p>
        </div>

        <button
          onClick={handleDetectLocation}
          disabled={locationDetecting}
          className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold shadow-md flex items-center gap-2 transition-all cursor-pointer disabled:opacity-75 shrink-0 self-start md:self-auto"
        >
          <FiNavigation size={14} className={locationDetecting ? "animate-spin" : ""} />
          <span>{locationDetecting ? "Detecting GPS..." : "📍 Locate Stores Near Me"}</span>
        </button>
      </div>

      {locationError && (
        <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 text-amber-900 dark:text-amber-300 text-xs font-bold flex items-center gap-2">
          <FiMapPin size={15} className="text-amber-600 shrink-0" />
          <span>{locationError}</span>
        </div>
      )}

      {/* Clean Search Controls */}
      <div className="bg-surface rounded-2xl p-4 border border-border shadow-xs">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="relative sm:col-span-2">
            <FiSearch size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search by PIN code, city (e.g. Ahmedabad, Mumbai, Delhi, Bengaluru), or area..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-11 pr-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>
          <div>
            <select
              value={selectedState}
              onChange={(e) => setSelectedState(e.target.value)}
              className="w-full py-2.5 px-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-text-primary focus:outline-none cursor-pointer"
            >
              {STATES_LIST.map((st) => (
                <option key={st} value={st}>
                  {st}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* ── Split Layout: Left List & Right Interactive Map / Detail Panel ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-[550px]">
        
        {/* Left: Store Cards List (5 cols) */}
        <div className="lg:col-span-5 space-y-3 max-h-[700px] overflow-y-auto pr-1">
          <div className="flex items-center justify-between text-xs font-bold text-slate-500 px-1">
            <span>Found {filteredStores.length} Stores</span>
            {userLocation && <span className="text-secondary font-bold">Sorted by Nearest</span>}
          </div>

          {filteredStores.map((store) => {
            const isSelected = selectedStore?.id === store.id;
            return (
              <div
                key={store.id}
                onClick={() => setSelectedStore(store)}
                className={`
                  p-4 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between space-y-2.5
                  ${isSelected
                    ? "bg-primary/5 dark:bg-primary/10 border-primary shadow-md ring-2 ring-primary/20"
                    : "bg-surface border-border hover:border-primary/40 hover:shadow-xs"
                  }
                `}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="font-heading font-black text-sm text-text-primary">
                      {store.name}
                    </h3>
                    <p className="text-xs text-text-secondary mt-1 flex items-start gap-1">
                      <FiMapPin size={13} className="text-primary shrink-0 mt-0.5" />
                      <span>{store.address}, {store.city}, {store.state} - {store.pincode}</span>
                    </p>
                  </div>

                  {store.distance_km && (
                    <span className="shrink-0 px-2 py-0.5 rounded-lg bg-amber-500 text-white text-[10px] font-black">
                      {store.distance_km} km
                    </span>
                  )}
                </div>

                <div className="flex items-center justify-between text-xs text-slate-500 pt-2 border-t border-border/50">
                  {store.phone ? (
                    <span className="flex items-center gap-1 text-[11px] font-bold text-slate-600 dark:text-slate-400">
                      <FiPhoneCall size={11} className="text-primary" />
                      <span>{store.phone}</span>
                    </span>
                  ) : (
                    <span className="text-[11px] text-slate-400">Authorized Partner</span>
                  )}
                  <span className="text-primary font-bold text-xs">
                    {isSelected ? "● Selected" : "View Map →"}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Right: Selected Store Detail & Live Map Embed (7 cols) */}
        <div className="lg:col-span-7 bg-surface rounded-2xl border border-border shadow-xs p-5 flex flex-col justify-between space-y-5">
          {selectedStore ? (
            <div className="space-y-5">
              {/* Store Header Banner */}
              <div className="pb-3 border-b border-border">
                <span className="text-[11px] font-black uppercase tracking-wider text-amber-600 dark:text-amber-400">
                  ✓ SOLARKITS AUTHORIZED TOUCHPOINT
                </span>
                <h2 className="font-heading font-black text-lg text-text-primary mt-0.5">
                  {selectedStore.name}
                </h2>
                <p className="text-xs text-text-secondary mt-0.5 flex items-center gap-1.5">
                  <FiMapPin size={13} className="text-primary shrink-0" />
                  <span>{selectedStore.address}, {selectedStore.city}, {selectedStore.state} - {selectedStore.pincode}</span>
                </p>
              </div>

              {/* Map View Canvas Embed */}
              <div className="relative rounded-xl overflow-hidden border border-border aspect-[16/9] bg-slate-100 dark:bg-slate-900 shadow-inner">
                <iframe
                  title="Store Map"
                  width="100%"
                  height="100%"
                  frameBorder="0"
                  scrolling="no"
                  marginHeight="0"
                  marginWidth="0"
                  src={`https://maps.google.com/maps?q=${selectedStore.lat},${selectedStore.lng}&hl=en&z=14&output=embed`}
                  className="w-full h-full"
                />
                <div className="absolute top-3 left-3 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md px-2.5 py-1 rounded-lg border border-border text-[11px] font-black shadow-md flex items-center gap-1.5">
                  <FiMapPin size={12} className="text-amber-500" />
                  <span>{selectedStore.city}, {selectedStore.state}</span>
                </div>
              </div>

              {/* Store Direct Contact Details */}
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="space-y-0.5">
                  <h4 className="text-[11px] font-black uppercase text-text-primary tracking-wider flex items-center gap-1.5">
                    <FiPhoneCall size={13} className="text-primary" />
                    <span>Direct Store Contact</span>
                  </h4>
                  <p className="text-xs text-text-primary font-bold">
                    {selectedStore.phone}
                  </p>
                  <p className="text-[11px] text-text-secondary">
                    {selectedStore.email}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <a
                    href={`tel:${selectedStore.phone?.replace(/\s+/g, '')}`}
                    className="px-3.5 py-1.5 rounded-lg bg-primary text-white hover:bg-primary-hover text-xs font-bold transition-colors flex items-center gap-1.5 shadow-xs"
                  >
                    <FiPhoneCall size={12} />
                    <span>Call Now</span>
                  </a>
                </div>
              </div>

              {/* Direct Directions Action */}
              <div className="pt-3 border-t border-border flex flex-wrap items-center justify-between gap-3">
                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                    `${selectedStore.name}, ${selectedStore.address}, ${selectedStore.city}`
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold shadow-xs flex items-center gap-2 transition-all cursor-pointer"
                >
                  <FiNavigation size={13} />
                  <span>Get Directions on Google Maps</span>
                </a>
              </div>

            </div>
          ) : null}
        </div>

      </div>

    </div>
  );
}
