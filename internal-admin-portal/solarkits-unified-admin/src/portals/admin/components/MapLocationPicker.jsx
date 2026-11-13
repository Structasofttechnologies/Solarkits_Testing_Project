import { useEffect, useRef, useState } from "react";
import { loadGoogleMaps } from "./LoadGoogleMaps";
import SearchInputWithDropdown from "./SearchInputWithDropdown";
import axios from "axios";

export default function MapLocationPicker({
  lat,
  lng,
  onSelect,
  visible,
  boundaries = [],
  existingWarehouses = [],
  currentWarehouseId = null,
  onLocationError
}) {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markerRef = useRef(null);
  const polygonRefs = useRef([]);
  const existingMarkersRef = useRef([]);
  const lastValidPositionRef = useRef(null);

  const [searchText, setSearchText] = useState("");
  const [searchOptions, setSearchOptions] = useState([]);

  const round6 = (n) => Number(n.toFixed(6));

  const mainPinSvg = `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(
    `<svg xmlns='http://www.w3.org/2000/svg' width='32' height='46' viewBox='0 0 24 24' fill='#10b981' stroke='#047857' stroke-width='1.5'><path d='M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z'/><circle cx='12' cy='9' r='2.5' fill='white'/></svg>`
  )}`;

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

  const getFallbackPosition = () => {
    if (lastValidPositionRef.current) return lastValidPositionRef.current;
    if (polygonRefs.current.length > 0) {
      return getPolygonCenter(polygonRefs.current[0]);
    }
    return new google.maps.LatLng(20.5937, 78.9629);
  };

  const isWithinBoundaries = (latLng) => {
    if (!boundaries || !boundaries.length) return true;
    if (!polygonRefs.current.length) return true;

    let inside = false;
    for (const polygon of polygonRefs.current) {
      if (google.maps.geometry.poly.containsLocation(latLng, polygon)) {
        inside = true;
        break;
      }
    }
    return inside;
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
          strokeColor: "#8e44ad",
          strokeOpacity: 0.8,
          strokeWeight: 2,
          fillColor: "#8e44ad",
          fillOpacity: 0.15,
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

  const clearExistingMarkers = () => {
    existingMarkersRef.current.forEach((m) => m.setMap(null));
    existingMarkersRef.current = [];
  };

  const drawExistingMarkers = async () => {
    clearExistingMarkers();
    if (!mapInstanceRef.current || !existingWarehouses || !existingWarehouses.length || !window.google) return;

    existingWarehouses.forEach((wh) => {
      if (wh.id === currentWarehouseId || (wh._id && wh._id === currentWarehouseId)) return;
      if (!wh.lat || !wh.lng) return;

      const position = { lat: parseFloat(wh.lat), lng: parseFloat(wh.lng) };
      const isCompany = wh.warehouse_type === "company";
      const is3PL = wh.warehouse_type === "3pl";
      const typeLabel = isCompany ? "Company Warehouse" : is3PL ? "3PL Warehouse" : (wh.warehouse_type === "master" ? "Master Hub" : "Sub Facility");
      const color = isCompany ? "#10b981" : is3PL ? "#3b82f6" : "#f59e0b";

      const svgPin = `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(
        `<svg xmlns='http://www.w3.org/2000/svg' width='28' height='40' viewBox='0 0 24 24' fill='${color}'><path d='M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z'/><circle cx='12' cy='9' r='2.5' fill='white'/></svg>`
      )}`;

      const marker = new google.maps.Marker({
        position,
        map: mapInstanceRef.current,
        title: `${typeLabel}: ${wh.warehouse_code || "Warehouse"}`,
        draggable: false,
        icon: {
          url: svgPin,
          scaledSize: new google.maps.Size(28, 40),
        }
      });

      const infoWindow = new google.maps.InfoWindow({
        content: `
          <div style="font-family: sans-serif; padding: 4px; font-size: 13px;">
            <strong style="color: ${color};">${typeLabel}</strong>
            <div style="margin-top: 4px;"><strong>Code:</strong> ${wh.warehouse_code || 'N/A'}</div>
            <div><strong>Address:</strong> ${wh.address || 'N/A'}</div>
          </div>
        `,
      });

      marker.addListener("click", () => {
        infoWindow.open(mapInstanceRef.current, marker);
      });

      existingMarkersRef.current.push(marker);
    });
  };

  // ------------------------------------------
  // 🔍 Google Autocomplete REST API
  // ------------------------------------------
  const autocompleteServiceRef = useRef(null);

  const initAutocompleteService = () => {
    if (!autocompleteServiceRef.current && window.google) {
      const { AutocompleteService } = google.maps.places;
      autocompleteServiceRef.current = new AutocompleteService();
    }
  };

  const fetchGoogleSuggestions = async (input) => {
    return new Promise((resolve) => {
      if (!input.trim()) return resolve([]);

      initAutocompleteService();

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

  // ------------------------------------------
  // 🔍 Place Details API
  // ------------------------------------------
  const detailsServiceRef = useRef(null);

  const initDetailsService = () => {
    if (!detailsServiceRef.current && mapInstanceRef.current) {
      const { PlacesService } = google.maps.places;
      detailsServiceRef.current = new PlacesService(mapInstanceRef.current);
    }
  };

  const fetchPlaceDetails = async (placeId) => {
    return new Promise((resolve) => {
      initDetailsService();

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
    try {
      const API = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
      const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${API}`;

      const res = await axios.get(url);
      const data = res.data;

      if (!data.results || data.results.length === 0) {
        return { address: "", country: "", state: "", district: "", pincode: "" };
      }

      let country = "";
      let state = "";
      let district = "";
      let pincode = "";

      data.results.forEach((result) => {
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

      // FINAL fallback: take best address
      const address = data.results.find(r =>
        r.formatted_address && r.types.includes("street_address")
      )?.formatted_address ||
        data.results[0].formatted_address ||
        "";

      return {
        address,
        country,
        state,
        district,
        pincode,
      };

    } catch (err) {
      return { address: "", country: "", state: "", district: "", pincode: "" };
    }

  };

  useEffect(() => {
    if (!visible) return;

    const init = async () => {
      try {
        await loadGoogleMaps(import.meta.env.VITE_GOOGLE_MAPS_API_KEY);

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
            zoom: lat && lng ? 12 : 5,
            gestureHandling: "cooperative",
          });

          map.setOptions({
            maxZoom: 20,
            minZoom: 3,
            streetViewControl: false,
            mapTypeControl: true,
            fullscreenControl: true,
          });

          const marker = new google.maps.Marker({
            position: initialPos,
            map,
            draggable: true,
            icon: {
              url: mainPinSvg,
              scaledSize: new google.maps.Size(32, 46),
            }
          });

          mapInstanceRef.current = map;
          markerRef.current = marker;

          if (lat && lng) {
            lastValidPositionRef.current = new google.maps.LatLng(parseFloat(lat), parseFloat(lng));
          }

          // Draw initial boundaries/markers if loaded
          drawBoundaries();
          drawExistingMarkers();

          // ================================
          // 📍 DRAG EVENT – update input
          // ================================
          marker.addListener("dragend", async () => {
            const pos = marker.getPosition();

            if (!isWithinBoundaries(pos)) {
              const fallback = getFallbackPosition();
              marker.setPosition(fallback);
              if (onLocationError) {
                onLocationError("Selected location is outside the selected cluster's district boundaries!");
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

          // ================================
          // 🖱 MAP CLICK – update input
          // ================================
          map.addListener("click", async (e) => {
            if (!isWithinBoundaries(e.latLng)) {
              if (onLocationError) {
                onLocationError("Selected location is outside the selected cluster's district boundaries!");
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
      clearExistingMarkers();
    };
  }, [visible]);

  useEffect(() => {
    if (mapInstanceRef.current && visible) {
      drawBoundaries();

      // If lat and lng are not set (first time loading cluster), place the marker at boundary center
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

  useEffect(() => {
    if (mapInstanceRef.current && visible) {
      drawExistingMarkers();
    }
  }, [existingWarehouses, visible]);

  // ------------------------------------------
  // 🔍 Input typing
  // ------------------------------------------
  const handleInputChange = async (text) => {
    setSearchText(text);

    const suggestions = await fetchGoogleSuggestions(text);
    setSearchOptions(suggestions);
  };

  // ------------------------------------------
  // 🎯 When selecting suggestion (place_id)
  // ------------------------------------------
  const handleSelect = async (placeId) => {
    const place = await fetchPlaceDetails(placeId);
    if (!place) return;

    const newLat = round6(place.lat);
    const newLng = round6(place.lng);
    const latLng = new google.maps.LatLng(newLat, newLng);

    if (!isWithinBoundaries(latLng)) {
      if (onLocationError) {
        onLocationError("Selected location is outside the selected cluster's district boundaries!");
      }
      return;
    }

    mapInstanceRef.current.setCenter({ lat: newLat, lng: newLng });
    markerRef.current.setPosition({ lat: newLat, lng: newLng });
    lastValidPositionRef.current = latLng;

    const details = await getAddressDetails(newLat, newLng);

    setSearchText(details.address);

    onSelect({
      lat: newLat,
      lng: newLng,
      ...details,
    });
  };

  useEffect(() => {
    const map = mapInstanceRef.current;

    if (!map || !lat || !lng) return;

    const position = { lat: parseFloat(lat), lng: parseFloat(lng) };
    const latLng = new google.maps.LatLng(position.lat, position.lng);

    lastValidPositionRef.current = latLng;

    // 👇 If marker exists → update
    if (markerRef.current) {
      markerRef.current.setPosition(position);
    } else {
      // 👇 If marker does NOT exist → create it
      const marker = new google.maps.Marker({
        position,
        map,
        draggable: true,
        icon: {
          url: mainPinSvg,
          scaledSize: new google.maps.Size(32, 46),
        }
      });
      markerRef.current = marker;
    }

    // 👇 Always center map on updated location
    map.setCenter(position);
  }, [lat, lng]);

  return (
    <div className="w-full flex flex-col gap-3">
      <SearchInputWithDropdown
        label="Search Location"
        value={null}
        inputValue={searchText}
        onChange={handleSelect}
        onInputChange={handleInputChange}
        options={searchOptions}
        placeholder="Search location, address..."
        className="w-full"
      />

      <div
        ref={mapRef}
        style={{
          width: "100%",
          height: visible ? "400px" : "0px",
          borderRadius: "12px",
          border: visible ? "1px solid #ddd" : "none",
        }}
      />
    </div>
  );
}
