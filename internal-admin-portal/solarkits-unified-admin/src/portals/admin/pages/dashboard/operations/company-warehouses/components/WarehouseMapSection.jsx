import React, { useEffect, useRef, useState } from "react";
import { loadGoogleMaps } from "@/components/LoadGoogleMaps";
import {
  FiHome,
  FiTruck,
  FiClock,
  FiMapPin,
  FiCheckCircle,
  FiAlertTriangle,
  FiX,
  FiLayers,
  FiExternalLink,
  FiPackage,
  FiEye,
  FiEdit2
} from "react-icons/fi";
import Button from "@/components/Button";

export default function WarehouseMapSection({
  warehouses = [],
  onSelectWarehouse,
  onOpenChecklist,
  onOpenInspection,
  onOpenCommercials,
  onNavigateDetails,
  onConfigureKits
}) {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersRef = useRef([]);

  const [selectedWh, setSelectedWh] = useState(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [mapError, setMapError] = useState(false);

  const getMarkerIcon = (wh) => {
    let pinColor = "#64748b"; // Slate for inactive
    let iconLetter = "WH";

    if (wh.is_active) {
      if (wh.warehouse_type === "3pl") {
        pinColor = "#2563eb"; // Blue for 3PL Active
        iconLetter = "3PL";
      } else {
        pinColor = "#059669"; // Emerald for Company Active
        iconLetter = "CO";
      }
    } else if (wh.warehouse_type === "3pl") {
      pinColor = "#d97706"; // Amber for 3PL Pending
      iconLetter = "3PL";
    } else {
      pinColor = "#f59e0b"; // Amber for Company Pending
      iconLetter = "CO";
    }

    const svg = `
      <svg xmlns='http://www.w3.org/2000/svg' width='38' height='50' viewBox='0 0 38 50'>
        <path d='M19 0C8.5 0 0 8.5 0 19c0 14.2 19 31 19 31s19-16.8 19-31C38 8.5 29.5 0 19 0z' fill='${pinColor}' stroke='#ffffff' stroke-width='2'/>
        <circle cx='19' cy='18' r='12' fill='#ffffff'/>
        <text x='19' y='22' font-size='10' font-family='sans-serif' font-weight='900' fill='${pinColor}' text-anchor='middle'>${iconLetter}</text>
      </svg>
    `;

    return {
      url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`,
      scaledSize: new window.google.maps.Size(34, 45),
      anchor: new window.google.maps.Point(17, 45)
    };
  };

  useEffect(() => {
    const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
    if (!apiKey) {
      setMapError(true);
      return;
    }

    let isMounted = true;
    loadGoogleMaps(apiKey)
      .then((google) => {
        if (!isMounted || !mapRef.current) return;

        if (!mapInstanceRef.current) {
          const map = new google.maps.Map(mapRef.current, {
            center: { lat: 21.7679, lng: 78.8718 }, // Center of India
            zoom: 5,
            mapTypeControl: false,
            streetViewControl: false,
            fullscreenControl: true,
            styles: [
              { featureType: "poi", elementType: "labels", stylers: [{ visibility: "off" }] }
            ]
          });
          mapInstanceRef.current = map;
        }

        setMapLoaded(true);
      })
      .catch((err) => {
        console.error("Map loading error", err);
        setMapError(true);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  // Update Markers on warehouses update
  useEffect(() => {
    if (!mapLoaded || !mapInstanceRef.current || !window.google?.maps) return;

    // Clear old markers
    markersRef.current.forEach(m => m.setMap(null));
    markersRef.current = [];

    const bounds = new window.google.maps.LatLngBounds();
    let validLocationsCount = 0;

    warehouses.forEach(wh => {
      const lat = parseFloat(wh.lat);
      const lng = parseFloat(wh.lng);
      if (isNaN(lat) || isNaN(lng) || (lat === 0 && lng === 0)) return;

      const pos = { lat, lng };
      bounds.extend(pos);
      validLocationsCount++;

      const marker = new window.google.maps.Marker({
        position: pos,
        map: mapInstanceRef.current,
        title: wh.warehouse_name || wh.warehouse_code,
        icon: getMarkerIcon(wh)
      });

      marker.addListener("click", () => {
        setSelectedWh(wh);
        if (onSelectWarehouse) onSelectWarehouse(wh);
      });

      markersRef.current.push(marker);
    });

    if (validLocationsCount > 0) {
      mapInstanceRef.current.fitBounds(bounds, 50);
      // Prevent over-zooming on single point
      if (validLocationsCount === 1) {
        mapInstanceRef.current.setZoom(10);
      }
    }
  }, [mapLoaded, warehouses]);

  return (
    <div className="relative w-full h-[600px] rounded-2xl overflow-hidden border border-border shadow-xs bg-surface">
      {/* Map Canvas */}
      <div ref={mapRef} className="w-full h-full" />

      {/* Fallback View if Google Maps key unavailable or error */}
      {mapError && (
        <div className="absolute inset-0 bg-surface/95 flex flex-col items-center justify-center p-6 text-center">
          <FiMapPin className="w-12 h-12 text-primary mb-3 opacity-60" />
          <h4 className="text-base font-bold text-text-primary">
            Master Warehouse Geospatial Overview
          </h4>
          <p className="text-xs text-text-muted max-w-md mt-1 mb-4">
            Interactive map rendering requires Google Maps JavaScript API key. Showing registered active and pending warehouse clusters below:
          </p>
          <div className="flex flex-wrap gap-2 justify-center max-w-2xl max-h-56 overflow-y-auto p-2">
            {warehouses.map(w => (
              <button
                key={w.id}
                type="button"
                onClick={() => setSelectedWh(w)}
                className="px-3 py-2 rounded-xl text-xs font-semibold border border-border bg-surface-elevated hover:border-primary/50 text-text-primary flex items-center gap-2 cursor-pointer"
              >
                <span className={`w-2.5 h-2.5 rounded-full ${w.is_active ? (w.warehouse_type === "3pl" ? "bg-blue-500" : "bg-emerald-500") : "bg-amber-500"}`} />
                <span>{w.warehouse_name || w.warehouse_code}</span>
                <span className="text-[10px] text-text-muted">({w.district})</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Map Legend Overlay */}
      <div className="absolute bottom-4 left-4 bg-surface/90 backdrop-blur-md border border-border rounded-xl p-3 shadow-md space-y-1.5 text-[11px] pointer-events-auto">
        <span className="font-bold text-text-primary block text-xs mb-1">Warehouse Legend</span>
        <div className="flex items-center gap-2 text-text-secondary">
          <span className="w-3 h-3 rounded-full bg-emerald-600 inline-block shrink-0 shadow-xs" />
          <span>Company Warehouse (Active)</span>
        </div>
        <div className="flex items-center gap-2 text-text-secondary">
          <span className="w-3 h-3 rounded-full bg-blue-600 inline-block shrink-0 shadow-xs" />
          <span>3PL Warehouse (Active)</span>
        </div>
        <div className="flex items-center gap-2 text-text-secondary">
          <span className="w-3 h-3 rounded-full bg-amber-500 inline-block shrink-0 shadow-xs" />
          <span>Pending Inspection / Activation</span>
        </div>
        <div className="flex items-center gap-2 text-text-secondary">
          <span className="w-3 h-3 rounded-full bg-slate-400 inline-block shrink-0 shadow-xs" />
          <span>Suspended / Inactive</span>
        </div>
      </div>

      {/* Selected Warehouse Slide-out Drawer */}
      {selectedWh && (
        <div className="absolute top-4 right-4 w-96 max-w-[calc(100%-2rem)] bg-surface/95 backdrop-blur-md border border-border rounded-2xl shadow-xl p-5 space-y-4 animate-in fade-in slide-in-from-right duration-200 z-10">
          <div className="flex items-start justify-between">
            <div>
              <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${selectedWh.warehouse_type === "3pl"
                  ? "bg-blue-500/10 text-blue-500 border-blue-500/20"
                  : "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
                }`}>
                {selectedWh.warehouse_type === "3pl" ? "3PL Partner" : "Company-Owned"}
              </span>
              <h3 className="font-bold text-base text-text-primary mt-1">
                {selectedWh.warehouse_name || selectedWh.warehouse_code}
              </h3>
              <p className="text-xs text-text-muted font-mono">{selectedWh.warehouse_code}</p>
            </div>
            <button
              type="button"
              onClick={() => setSelectedWh(null)}
              className="p-1 rounded-lg hover:bg-surface-elevated text-text-muted hover:text-text-primary transition-colors cursor-pointer"
            >
              <FiX className="w-4 h-4" />
            </button>
          </div>

          {/* Key Metrics */}
          <div className="grid grid-cols-2 gap-2 text-xs bg-surface-elevated/70 p-3 rounded-xl border border-border">
            <div>
              <span className="text-text-muted block text-[10px] uppercase font-bold">Location</span>
              <span className="font-semibold text-text-primary truncate block">{selectedWh.district}, {selectedWh.state}</span>
            </div>
            <div>
              <span className="text-text-muted block text-[10px] uppercase font-bold">Active Kits</span>
              <span className="font-semibold text-text-primary">{selectedWh.active_kits_count || 0} Kits Enabled</span>
            </div>
            <div>
              <span className="text-text-muted block text-[10px] uppercase font-bold">Max Payload</span>
              <span className="font-semibold text-text-primary">{selectedWh.max_weight_capacity_kg ? `${selectedWh.max_weight_capacity_kg} kg` : "Configurable"}</span>
            </div>
            <div>
              <span className="text-text-muted block text-[10px] uppercase font-bold">Operational Status</span>
              <span className={`font-bold ${selectedWh.is_active ? "text-emerald-500" : "text-amber-500"}`}>
                {selectedWh.is_active ? "Active" : (selectedWh.status || "Pending")}
              </span>
            </div>
          </div>

          {/* Vendor Details for 3PL */}
          {selectedWh.warehouse_type === "3pl" && (
            <div className="text-xs bg-blue-500/5 border border-blue-500/20 p-2.5 rounded-xl">
              <span className="text-[10px] uppercase font-bold text-blue-500 block">3PL Logistics Vendor</span>
              <span className="font-bold text-text-primary">{selectedWh.vendor_name || selectedWh.vendor?.company_name || "External Vendor"}</span>
              {selectedWh.vendor?.contact_person && (
                <span className="text-text-muted block text-[11px] mt-0.5">
                  Contact: {selectedWh.vendor.contact_person.name} ({selectedWh.vendor.contact_person.phone})
                </span>
              )}
            </div>
          )}

          {/* Quick Action Shortcuts */}
          <div className="space-y-2 pt-2 border-t border-border">
            {selectedWh.warehouse_type === "company" && !selectedWh.is_active && (
              <Button
                variant="primary"
                size="sm"
                className="w-full justify-center"
                onClick={() => onOpenChecklist(selectedWh.id)}
              >
                <FiCheckCircle className="w-3.5 h-3.5 mr-1.5" />
                10-Gate Activation Checklist
              </Button>
            )}

            {selectedWh.warehouse_type === "3pl" && !selectedWh.is_active && (
              <Button
                variant="primary"
                size="sm"
                className="w-full justify-center bg-blue-600 hover:bg-blue-700 text-white border-none"
                onClick={() => onOpenInspection(selectedWh)}
              >
                <FiTruck className="w-3.5 h-3.5 mr-1.5" />
                Conduct 3PL Inspection
              </Button>
            )}

            <div className="grid grid-cols-2 gap-2">
              <Button
                variant="secondary"
                size="sm"
                className="justify-center text-xs"
                onClick={() => onConfigureKits(selectedWh)}
              >
                <FiPackage className="w-3.5 h-3.5 mr-1" />
                Configure Kits
              </Button>

              <Button
                variant="outline"
                size="sm"
                className="justify-center text-xs"
                onClick={() => onNavigateDetails(selectedWh.id)}
              >
                <FiEdit2 className="w-3.5 h-3.5 mr-1" />
                Edit Facility
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
