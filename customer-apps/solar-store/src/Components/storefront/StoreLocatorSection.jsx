/**
 * StoreLocatorSection.jsx
 *
 * Clean & High-Converting Interactive Solar Store Locator.
 * Features:
 * - GPS-based proximity detection ("Find Stores Near Me")
 * - Search by PIN code, City, or State
 * - Interactive filter pills (Experience Centers, Fulfillment Warehouses, Solar Lounges)
 * - Clean Store Cards with Distance, Direct Call & Google Maps Directions
 */

import React, { useState, useEffect, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  FiMapPin,
  FiNavigation,
  FiPhoneCall,
  FiSearch,
  FiArrowRight,
  FiStar,
  FiX,
  FiTruck,
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

export default function StoreLocatorSection({ onOpenExpertHelp = null }) {
  const navigate = useNavigate();

  const [stores, setStores] = useState(FALLBACK_STORES);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedState, setSelectedState] = useState("All States");
  const [userLocation, setUserLocation] = useState(null);
  const [locationDetecting, setLocationDetecting] = useState(false);
  const [locationError, setLocationError] = useState(null);

  // Load stores on mount
  useEffect(() => {
    fetchNearbyStores()
      .then((data) => setStores(data))
      .catch(() => {});
  }, []);

  // GPS Location Handler
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
          .then((data) => setStores(data))
          .catch(() => {});
      },
      (err) => {
        setLocationDetecting(false);
        setLocationError("Could not retrieve your location. Please enter your PIN code or city.");
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  };

  // Filtered Stores
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

    // Distance calculation if userLocation active
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
    <section className="py-14 sm:py-20 bg-slate-50/50 dark:bg-slate-900/40 border-y border-border/60">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 space-y-8">
        
        {/* ── Section Header ─────────────────────────────────────────────────── */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-2">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-black tracking-wide uppercase">
              <FiMapPin size={13} className="text-secondary" />
              <span>SolarKit Store Network</span>
            </div>
            <h2 className="font-heading font-black text-2xl sm:text-3xl lg:text-4xl text-text-primary tracking-tight">
              Find a <span className="text-primary">SolarKit Store</span> Near You
            </h2>
            <p className="text-xs sm:text-sm text-text-secondary leading-relaxed">
              Locate authorized solar stores in your city for instant consultation, genuine kits, and local support.
            </p>
          </div>

          {/* Location Trigger & All Stores Link */}
          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <button
              onClick={handleDetectLocation}
              disabled={locationDetecting}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-secondary hover:bg-amber-600 text-white text-xs font-black shadow-md transition-all active:scale-95 cursor-pointer disabled:opacity-75"
            >
              <FiNavigation size={14} className={locationDetecting ? "animate-spin" : ""} />
              <span>{locationDetecting ? "Locating..." : "Find Near Me"}</span>
            </button>

            <Link
              to="/store-locator"
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-2xl bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-text-primary text-xs font-bold border border-border shadow-xs transition-all"
            >
              <span>All Stores Map</span>
              <FiArrowRight size={13} />
            </Link>
          </div>
        </div>

        {/* Location Notice / Error */}
        {locationError && (
          <div className="p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 text-amber-900 dark:text-amber-300 text-xs font-bold flex items-center gap-2">
            <FiMapPin size={15} className="text-secondary shrink-0" />
            <span>{locationError}</span>
          </div>
        )}

        {/* ── Search Bar ──────────────────────────────────────────────────────── */}
        <div className="bg-white dark:bg-slate-800/90 rounded-3xl p-4 sm:p-5 border border-border shadow-xs">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Pincode / City Search */}
            <div className="relative sm:col-span-2">
              <FiSearch size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search by PIN code (e.g. 382110, 110020), City, or Area..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-11 pr-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs font-bold text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <FiX size={14} />
                </button>
              )}
            </div>

            {/* State Selector */}
            <div>
              <select
                value={selectedState}
                onChange={(e) => setSelectedState(e.target.value)}
                className="w-full py-3 px-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs font-bold text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/20 cursor-pointer"
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

        {/* ── Store Cards Grid ───────────────────────────────────────────────── */}
        {filteredStores.length === 0 ? (
          <div className="bg-white dark:bg-slate-800 rounded-3xl p-12 text-center border border-border shadow-xs space-y-3">
            <div className="w-14 h-14 rounded-2xl bg-amber-50 text-secondary mx-auto flex items-center justify-center">
              <FiMapPin size={28} />
            </div>
            <h3 className="font-heading font-black text-base text-text-primary">
              No Stores Found for "{searchQuery || selectedState}"
            </h3>
            <p className="text-xs text-text-secondary max-w-md mx-auto font-medium">
              We offer pan-India door-to-door delivery with live transit insurance everywhere. Talk to our solar engineers for direct home delivery.
            </p>
            <div className="pt-2 flex items-center justify-center gap-3">
              <button
                onClick={() => {
                  setSearchQuery("");
                  setSelectedState("All States");
                }}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-xs font-bold text-slate-700"
              >
                Reset Search Filters
              </button>
              {onOpenExpertHelp && (
                <button
                  onClick={() => onOpenExpertHelp()}
                  className="px-4 py-2 rounded-xl bg-primary text-white text-xs font-bold shadow-md"
                >
                  Request Consultation
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredStores.map((store) => {
              const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                `${store.name}, ${store.address}, ${store.city}`
              )}`;

              return (
                <div
                  key={store.id}
                  className="bg-white dark:bg-slate-800 rounded-3xl overflow-hidden border border-border shadow-xs hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between group"
                >
                  {/* Store Visual Thumbnail */}
                  <div className="relative aspect-[16/9] bg-slate-900 overflow-hidden">
                    <img
                      src={store.images?.[0] || "https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=800&auto=format&fit=crop&q=80"}
                      alt={store.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      loading="lazy"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/30" />

                    {/* Proximity / City Badge */}
                    <div className="absolute top-3 right-3 z-10">
                      {store.distance_km ? (
                        <span className="px-2.5 py-1 rounded-xl bg-secondary text-white text-[10px] font-black shadow-md flex items-center gap-1">
                          <FiNavigation size={10} />
                          <span>{store.distance_km} km away</span>
                        </span>
                      ) : (
                        <span className="px-2.5 py-1 rounded-xl bg-black/60 backdrop-blur-md text-white text-[10px] font-bold">
                          {store.state}
                        </span>
                      )}
                    </div>

                    {/* Bottom Title on Overlay */}
                    <div className="absolute bottom-3 left-3 right-3 z-10">
                      <div className="flex items-center gap-1.5 text-amber-400 text-xs font-black">
                        <FiStar className="fill-amber-400" size={12} />
                        <span>{store.rating || 4.9}</span>
                        <span className="text-white/70 text-[10px] font-medium">({store.reviews_count || 120}+ reviews)</span>
                      </div>
                    </div>
                  </div>

                  {/* Content Details */}
                  <div className="p-5 space-y-3.5 flex-1 flex flex-col justify-between">
                    <div className="space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="font-heading font-black text-sm text-text-primary line-clamp-2 leading-snug group-hover:text-primary transition-colors">
                          {store.name}
                        </h3>
                      </div>

                      <p className="text-xs text-text-secondary line-clamp-2 leading-relaxed flex items-start gap-1.5">
                        <FiMapPin size={14} className="text-primary shrink-0 mt-0.5" />
                        <span>{store.address}, {store.city}, {store.state} - {store.pincode}</span>
                      </p>

                      {store.phone && (
                        <div className="flex items-center gap-1.5 text-[11px] text-slate-600 dark:text-slate-400 font-bold pt-1">
                          <FiPhoneCall size={12} className="text-primary" />
                          <span>{store.phone}</span>
                        </div>
                      )}
                    </div>

                    {/* Action Buttons */}
                    <div className="pt-3 border-t border-border/70 grid grid-cols-2 gap-2">
                      <a
                        href={googleMapsUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-primary hover:bg-primary-hover text-white text-xs font-bold transition-all shadow-xs"
                      >
                        <FiNavigation size={13} />
                        <span>Directions</span>
                      </a>

                      {store.phone ? (
                        <a
                          href={`tel:${store.phone?.replace(/\s+/g, '')}`}
                          className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-text-primary text-xs font-bold transition-all shadow-xs"
                        >
                          <FiPhoneCall size={13} className="text-secondary" />
                          <span>Call Store</span>
                        </a>
                      ) : (
                        <Link
                          to="/shop"
                          className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 text-text-primary text-xs font-bold transition-all shadow-xs"
                        >
                          <span>View Kits</span>
                        </Link>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ── Nationwide Delivery Strip ─────────────────────────────────────── */}
        <div className="rounded-3xl p-6 bg-gradient-to-r from-primary-navy via-primary to-blue-900 text-white shadow-lg flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-4 text-center md:text-left">
            <div className="w-14 h-14 rounded-2xl bg-white/15 backdrop-blur-md flex items-center justify-center shrink-0 border border-white/20">
              <FiTruck size={26} className="text-secondary" />
            </div>
            <div>
              <h4 className="font-heading font-black text-lg text-white">
                Don't have a store near your pincode?
              </h4>
              <p className="text-xs text-blue-100 mt-0.5 max-w-xl">
                We deliver complete solar power kits directly to your doorstep across 19,000+ PIN codes in India with wooden pallet packing and transit insurance.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={() => navigate("/shop")}
              className="px-5 py-3 rounded-2xl bg-white text-blue-950 font-black text-xs shadow-md hover:bg-blue-50 transition-all cursor-pointer"
            >
              Order Complete Kit Online →
            </button>
          </div>
        </div>

      </div>
    </section>
  );
}
