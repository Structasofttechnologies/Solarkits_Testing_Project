import { useEffect, useRef, useState } from "react";
import { loadGoogleMaps } from "./LoadGoogleMaps";
import axios from "axios";

const svgPin = (color) => {
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(
    `<svg xmlns='http://www.w3.org/2000/svg' width='28' height='40' viewBox='0 0 24 24' fill='${color}'><path d='M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z'/><circle cx='12' cy='9' r='2.5' fill='white'/></svg>`
  )}`;
};

export default function MapLocationPicker({
  lat,
  lng,
  onSelect,
  visible,
  boundaries = [],
  onLocationError
}) {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markerRef = useRef(null);
  const polygonRefs = useRef([]);
  const lastValidPositionRef = useRef(null);

  const [searchText, setSearchText] = useState("");
  const [searchOptions, setSearchOptions] = useState([]);
  const [showOptions, setShowOptions] = useState(false);
  const [mapLoaded, setMapLoaded] = useState(false);
  const optionsRef = useRef(null);

  const round6 = (n) => Number(n.toFixed(6));

  // Autocomplete service references
  const autocompleteServiceRef = useRef(null);
  const detailsServiceRef = useRef(null);

  const initAutocompleteService = () => {
    if (!autocompleteServiceRef.current && window.google) {
      const { AutocompleteService } = google.maps.places;
      autocompleteServiceRef.current = new AutocompleteService();
    }
  };

  const initDetailsService = () => {
    if (!detailsServiceRef.current && mapInstanceRef.current) {
      const { PlacesService } = google.maps.places;
      detailsServiceRef.current = new PlacesService(mapInstanceRef.current);
    }
  };

  const fetchGoogleSuggestions = async (input) => {
    return new Promise((resolve) => {
      if (!input.trim()) return resolve([]);
      initAutocompleteService();
      if (!autocompleteServiceRef.current) return resolve([]);

      autocompleteServiceRef.current.getPlacePredictions(
        { input },
        (predictions, status) => {
          if (status !== "OK" || !predictions) return resolve([]);
          resolve(
            predictions.map((p) => ({
              value: p.place_id,
              text: p.description,
            }))
          );
        }
      );
    });
  };

  const fetchPlaceDetails = async (placeId) => {
    return new Promise((resolve) => {
      initDetailsService();
      if (!detailsServiceRef.current) return resolve(null);

      detailsServiceRef.current.getDetails(
        { placeId, fields: ["geometry", "formatted_address"] },
        (place, status) => {
          if (status !== "OK" || !place) return resolve(null);
          resolve({
            lat: place.geometry.location.lat(),
            lng: place.geometry.location.lng(),
            address: place.formatted_address,
          });
        }
      );
    });
  };

  const getAddressDetails = async (lat, lng) => {
    return new Promise((resolve) => {
      if (!window.google) {
        return resolve({ address: "", country: "", state: "", district: "", pincode: "" });
      }
      const geocoder = new google.maps.Geocoder();
      geocoder.geocode({ location: { lat, lng } }, (results, status) => {
        if (status !== "OK" || !results || results.length === 0) {
          console.error("Geocoding status not OK:", status);
          return resolve({ address: "", country: "", state: "", district: "", pincode: "" });
        }

        let country = "";
        let state = "";
        let district = "";
        let pincode = "";

        results.forEach((result) => {
          result.address_components.forEach((c) => {
            if (!country && c.types.includes("country")) {
              country = c.long_name;
            }
            if (!state && c.types.includes("administrative_area_level_1")) {
              state = c.long_name;
            }
            if (!district && c.types.includes("administrative_area_level_2")) {
              district = c.long_name;
            }
            if (!district && c.types.includes("administrative_area_level_3")) {
              district = c.long_name;
            }
            if (!pincode && c.types.includes("postal_code")) {
              pincode = c.long_name;
            }
          });
        });

        const address = results.find(r =>
          r.formatted_address && r.types.includes("street_address")
        )?.formatted_address || results[0].formatted_address || "";

        resolve({
          address,
          country,
          state,
          district,
          pincode,
        });
      });
    });
  };

  // Boundary functions
  const extractPaths = (geometry) => {
    if (!geometry?.coordinates) return [];
    const { type, coordinates } = geometry;
    const result = [];
    if (type === "Polygon") {
      result.push(coordinates.map(ring => ring.map(([lng, lat]) => ({ lat: parseFloat(lat), lng: parseFloat(lng) }))));
    } else if (type === "MultiPolygon") {
      coordinates.forEach(polygonCoordinates =>
        result.push(polygonCoordinates.map(ring => ring.map(([lng, lat]) => ({ lat: parseFloat(lat), lng: parseFloat(lng) }))))
      );
    }
    return result;
  };

  const clearPolygons = () => {
    polygonRefs.current.forEach((p) => p.setMap(null));
    polygonRefs.current = [];
  };

  const getPolygonCenter = (polygon) => {
    const bounds = new google.maps.LatLngBounds();
    polygon.getPath().forEach((path) => bounds.extend(path));
    return bounds.getCenter();
  };

  const isWithinBoundaries = (latLng) => {
    try {
      if (!boundaries || !boundaries.length) return true;
      if (!polygonRefs.current.length) return true;
      if (!window.google || !google.maps.geometry || !google.maps.geometry.poly) {
        console.warn("Google Maps geometry library not loaded yet.");
        return true;
      }

      let inside = false;
      for (const polygon of polygonRefs.current) {
        if (google.maps.geometry.poly.containsLocation(latLng, polygon)) {
          inside = true;
          break;
        }
      }
      return inside;
    } catch (err) {
      console.error("Error checking boundaries:", err);
      return true;
    }
  };

  const drawBoundaries = () => {
    clearPolygons();
    if (!mapInstanceRef.current || !boundaries || !boundaries.length || !window.google) return;

    const bounds = new google.maps.LatLngBounds();
    boundaries.forEach((b) => {
      const paths = extractPaths(b.geometry);
      if (!paths.length) return;

      paths.forEach((path) => {
        const polygon = new google.maps.Polygon({
          paths: path,
          strokeColor: "#ef4444",
          strokeOpacity: 0.8,
          strokeWeight: 2.5,
          fillColor: "#ef4444",
          fillOpacity: 0.08,
          map: mapInstanceRef.current,
        });
        polygonRefs.current.push(polygon);
        polygon.getPath().forEach((coord) => bounds.extend(coord));
      });
    });

    if (!bounds.isEmpty()) {
      mapInstanceRef.current.fitBounds(bounds);
    }
  };

  useEffect(() => {
    if (!visible) return;

    const init = async () => {
      try {
        const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
        await loadGoogleMaps(apiKey);

        const { Map } = await google.maps.importLibrary("maps");
        const { Marker } = await google.maps.importLibrary("marker");
        await google.maps.importLibrary("places");
        await google.maps.importLibrary("geometry");

        const initialPos = {
          lat: lat ? parseFloat(lat) : 20.5937,
          lng: lng ? parseFloat(lng) : 78.9629,
        };

        if (!mapInstanceRef.current) {
          const map = new Map(mapRef.current, {
            center: initialPos,
            zoom: lat && lng ? 14 : 5,
            gestureHandling: "cooperative",
            disableDefaultUI: false,
          });

          map.setOptions({
            maxZoom: 20,
            minZoom: 3,
            streetViewControl: false,
            mapTypeControl: false,
            fullscreenControl: false,
          });

          const marker = new Marker({
            position: initialPos,
            map,
            draggable: true,
            icon: {
              url: svgPin('#ef4444'),
              scaledSize: new google.maps.Size(28, 40),
              anchor: new google.maps.Point(14, 40)
            }
          });

          mapInstanceRef.current = map;
          markerRef.current = marker;
          setMapLoaded(true);

          if (lat && lng) {
            lastValidPositionRef.current = new google.maps.LatLng(parseFloat(lat), parseFloat(lng));
          }

          drawBoundaries();

          // Marker Drag End Listener
          marker.addListener("dragend", async () => {
            const pos = marker.getPosition();

            if (!isWithinBoundaries(pos)) {
              if (lastValidPositionRef.current) {
                marker.setPosition(lastValidPositionRef.current);
              } else if (polygonRefs.current.length > 0) {
                const center = getPolygonCenter(polygonRefs.current[0]);
                marker.setPosition(center);
              }
              if (onLocationError) {
                onLocationError("Selected location is outside the district boundaries!");
              }
              return;
            }

            lastValidPositionRef.current = pos;
            const newLat = round6(pos.lat());
            const newLng = round6(pos.lng());
            const details = await getAddressDetails(newLat, newLng);
            setSearchText(details.address);
            onSelect({
              lat: newLat,
              lng: newLng,
              ...details,
            });
          });

          // Map Click Listener
          map.addListener("click", async (e) => {
            if (!isWithinBoundaries(e.latLng)) {
              if (onLocationError) {
                onLocationError("Selected location is outside the district boundaries!");
              }
              return;
            }

            const newLat = round6(e.latLng.lat());
            const newLng = round6(e.latLng.lng());
            marker.setPosition({ lat: newLat, lng: newLng });
            lastValidPositionRef.current = e.latLng;
            const details = await getAddressDetails(newLat, newLng);
            setSearchText(details.address);
            onSelect({
              lat: newLat,
              lng: newLng,
              ...details,
            });
          });
        }
      } catch (err) {
        console.error("Map load error:", err);
      }
    };

    init();

    return () => {
      clearPolygons();
    };
  }, [visible]);

  // Handle boundary updates
  useEffect(() => {
    if (mapInstanceRef.current && visible) {
      drawBoundaries();

      if ((!lat || !lng) && polygonRefs.current.length > 0 && markerRef.current) {
        const center = getPolygonCenter(polygonRefs.current[0]);
        markerRef.current.setPosition(center);
        lastValidPositionRef.current = center;
        mapInstanceRef.current.setCenter(center);
        
        const newLat = round6(center.lat());
        const newLng = round6(center.lng());
        getAddressDetails(newLat, newLng).then((details) => {
          setSearchText(details.address);
          onSelect({
            lat: newLat,
            lng: newLng,
            ...details,
          });
        });
      }
    }
  }, [boundaries, visible, lat, lng]);

  // Sync coords from props
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !lat || !lng) return;

    const position = { lat: parseFloat(lat), lng: parseFloat(lng) };
    const latLng = new google.maps.LatLng(position.lat, position.lng);
    lastValidPositionRef.current = latLng;

    if (markerRef.current) {
      markerRef.current.setPosition(position);
    }
    map.setCenter(position);
  }, [lat, lng]);

  const handleInputChange = async (e) => {
    const text = e.target.value;
    setSearchText(text);
    if (text.length > 2) {
      const suggestions = await fetchGoogleSuggestions(text);
      setSearchOptions(suggestions);
      setShowOptions(true);
    } else {
      setSearchOptions([]);
      setShowOptions(false);
    }
  };

  const handleSelectPrediction = async (option) => {
    setShowOptions(false);
    setSearchText(option.text);
    const place = await fetchPlaceDetails(option.value);
    if (!place) return;

    const newLat = round6(place.lat);
    const newLng = round6(place.lng);
    const latLng = new google.maps.LatLng(newLat, newLng);

    if (!isWithinBoundaries(latLng)) {
      if (onLocationError) {
        onLocationError("Selected search location is outside the district boundaries!");
      }
      return;
    }

    if (mapInstanceRef.current) {
      mapInstanceRef.current.setCenter({ lat: newLat, lng: newLng });
      mapInstanceRef.current.setZoom(16);
    }
    if (markerRef.current) {
      markerRef.current.setPosition({ lat: newLat, lng: newLng });
    }
    lastValidPositionRef.current = latLng;

    const details = await getAddressDetails(newLat, newLng);
    onSelect({
      lat: newLat,
      lng: newLng,
      ...details,
    });
  };

  // Close suggestions on outside click
  useEffect(() => {
    const clickOutside = (e) => {
      if (optionsRef.current && !optionsRef.current.contains(e.target)) {
        setShowOptions(false);
      }
    };
    document.addEventListener("mousedown", clickOutside);
    return () => document.removeEventListener("mousedown", clickOutside);
  }, []);

  return (
    <div className="w-full flex flex-col gap-3 relative">
      <div className="relative" ref={optionsRef}>
        <label className="block text-xs font-bold text-text-secondary uppercase mb-1.5">Search Address / Landmark</label>
        <input
          type="text"
          value={searchText}
          onChange={handleInputChange}
          placeholder="Search location address..."
          className="w-full px-3.5 py-2.5 bg-surface border border-border focus:border-primary focus:ring-1 focus:ring-primary rounded-xl text-sm transition-all outline-hidden text-text-primary"
        />
        
        {showOptions && searchOptions.length > 0 && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-surface border border-border rounded-xl shadow-xl z-50 max-h-60 overflow-y-auto divide-y divide-border">
            {searchOptions.map((opt, i) => (
              <button
                key={i}
                onClick={() => handleSelectPrediction(opt)}
                className="w-full text-left px-4 py-3 hover:bg-surface-hover transition-colors text-xs font-medium text-text-primary"
              >
                {opt.text}
              </button>
            ))}
          </div>
        )}
      </div>

      <div
        ref={mapRef}
        style={{
          width: "100%",
          height: visible ? "280px" : "0px",
          borderRadius: "14px",
          border: visible ? "1px solid var(--color-border)" : "none",
        }}
      />
    </div>
  );
}
