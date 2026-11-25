import { useEffect, useRef, useState } from "react";
import { loadGoogleMaps } from "./LoadGoogleMaps";
import SearchInputWithDropdown from "./SearchInputWithDropdown";
import axios from "axios";

export default function MapLocationPicker({ lat, lng, onSelect, visible }) {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markerRef = useRef(null);

  const [searchText, setSearchText] = useState("");
  const [searchOptions, setSearchOptions] = useState([]);

  const round6 = (n) => Number(n.toFixed(6));

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

          const marker = new Marker({
            position: initialPos,
            map,
            draggable: true,
          });

          mapInstanceRef.current = map;
          markerRef.current = marker;

          // ================================
          // 📍 DRAG EVENT – update input
          // ================================
          marker.addListener("dragend", async () => {
            const pos = marker.getPosition();
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
            const newLat = round6(e.latLng.lat());
            const newLng = round6(e.latLng.lng());

            marker.setPosition({ lat: newLat, lng: newLng });

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
  }, [visible]);

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

    mapInstanceRef.current.setCenter({ lat: newLat, lng: newLng });
    markerRef.current.setPosition({ lat: newLat, lng: newLng });

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

    const position = { lat, lng };

    // 👇 If marker exists → update
    if (markerRef.current) {
      markerRef.current.setPosition(position);
    } else {
      // 👇 If marker does NOT exist → create it
      const marker = new google.maps.Marker({
        position,
        map,
        draggable: true,
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
