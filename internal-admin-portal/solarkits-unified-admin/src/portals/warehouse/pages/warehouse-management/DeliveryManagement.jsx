import React, { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { 
  FaCheckCircle, FaTruck, FaRoute, FaCalculator, FaMapMarkedAlt, 
  FaFileInvoice, FaWhatsapp, FaUser, FaCheck, FaExclamationTriangle, FaFilePdf, FaBoxes, FaGlobe, FaCogs,
  FaPhone, FaBox, FaMapMarkerAlt, FaWarehouse, FaBolt, FaBuilding, FaEnvelope,
  FaPrint, FaBarcode, FaTag, FaTruckLoading, FaClipboardCheck, FaShippingFast,
  FaCamera, FaKey, FaLightbulb, FaHistory
} from 'react-icons/fa';
import { FiX } from "react-icons/fi";
import Button from "../../components/Button";
import CustomInput from "../../components/CustomInput";
import PageHeader from "../../components/PageHeader";
import DropdownWithSearchInput from "../../components/DropdownWithSearchInput";
import axios from "axios";
import { authHeaderObj } from "../../app/authHeader";
import { getSalesOrders, deliverSalesOrder, updateSalesOrderTracking, createPoRequest } from "../../api/inward";
import { compareVehicles } from "../../api/vehicles";
import { loadGoogleMaps } from "../../components/LoadGoogleMaps";

// Active orders data
const initialOrders = [
  { id: 'ORD-9843', partner: 'Apex Solar Installers', region: 'North Zone', pincode: '302001', weight: 450, panels: 100, kws: 54, selected: false },
  { id: 'ORD-9844', partner: 'Sunnovative Projects', region: 'North Zone', pincode: '302015', weight: 200, panels: 40, kws: 21.6, selected: false },
  { id: 'ORD-9845', partner: 'Go Green Power Ltd', region: 'West Zone', pincode: '400001', weight: 900, panels: 200, kws: 108, selected: false },
  { id: 'ORD-9846', partner: 'Solar Horizon India', region: 'North Zone', pincode: '302018', weight: 350, panels: 80, kws: 43.2, selected: false },
  { id: 'ORD-9847', partner: 'Western Solar Hub', region: 'West Zone', pincode: '400055', weight: 1200, panels: 250, kws: 137.5, selected: false },
];



export default function DeliveryManagement() {
  const navigate = useNavigate();
  const [warehouseMode, setWarehouseMode] = useState(localStorage.getItem('warehouseMode') || 'master');

  useEffect(() => {
    const handleModeChanged = () => {
      setWarehouseMode(localStorage.getItem('warehouseMode') || 'master');
    };
    window.addEventListener('warehouseModeChanged', handleModeChanged);
    return () => window.removeEventListener('warehouseModeChanged', handleModeChanged);
  }, []);

  const defaultWarehouse = {
    warehouse_code: "IND_MAH_001",
    lat: 18.523358,
    lng: 73.898203,
    address: "Vishwamitra officer’s colony, Dobarwadi, Ghorpadi, Pune, Maharashtra 411001, India"
  };

  const [warehouseInfo, setWarehouseInfo] = useState(defaultWarehouse);
  const [activeStep, setActiveStep] = useState(1);
  const [orders, setOrders] = useState([]);
  const [loadingOrders, setLoadingOrders] = useState(true);
  const [selectedZone, setSelectedZone] = useState('All');
  const [selectedEpc, setSelectedEpc] = useState('All');
  const [selectedOrderType, setSelectedOrderType] = useState('All');

  const [selectedPincode, setSelectedPincode] = useState("All Pincodes");
  const [selectedState, setSelectedState] = useState("All");
  const [selectedCluster, setSelectedCluster] = useState("All");
  const [liveClusters, setLiveClusters] = useState([]);

  // Fetch live clusters from Admin Panel
  useEffect(() => {
    const fetchClusters = async () => {
      try {
        const res = await axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/franchise-clusters/list`, {
          headers: authHeaderObj()
        });
        if (res.data?.status === 'success' || Array.isArray(res.data?.data)) {
          setLiveClusters(res.data.data || []);
        }
      } catch (e) {
        console.warn('Could not load clusters in DeliveryManagement:', e);
      }
    };
    fetchClusters();
  }, []);

  // Unique States from orders
  const uniqueStates = useMemo(() => {
    const sts = orders.map(o => o.state || o.destination?.state).filter(Boolean);
    return ['All', ...new Set(sts)];
  }, [orders]);

  // Cluster Options based on selectedState
  const clusterOptions = useMemo(() => {
    let list = liveClusters;
    if (selectedState !== 'All') {
      list = list.filter(c => (c.state_name || '').toLowerCase() === selectedState.toLowerCase());
    }
    const names = list.map(c => c.cluster_name).filter(Boolean);
    return ['All', ...new Set(names)];
  }, [liveClusters, selectedState]);

  // PO Request Modal States
  const [poRequestModalOpen, setPoRequestModalOpen] = useState(false);
  const [poRequestOrderId, setPoRequestOrderId] = useState("");
  const [poRequestItems, setPoRequestItems] = useState([]);
  const [submittingPoRequest, setSubmittingPoRequest] = useState(false);
  const [poRequestSuccess, setPoRequestSuccess] = useState("");
  const [warehouseType, setWarehouseType] = useState("sub");
  const [warehouseZones, setWarehouseZones] = useState([]);

  const uniquePincodes = useMemo(() => {
    const pins = orders
      .map(o => o.pincode)
      .filter(p => p && p !== 'N/A' && p.trim() !== '');
    return ['All Pincodes', ...new Set(pins)];
  }, [orders]);

  const pincodeDropdownOptions = useMemo(() => {
    return uniquePincodes.map(pin => ({
      value: pin,
      text: pin
    }));
  }, [uniquePincodes]);

  const loadSalesOrders = async () => {
    try {
      setLoadingOrders(true);
      const response = await getSalesOrders();
      if (response.status === "success") {
        if (response.warehouse) {
          setWarehouseInfo(response.warehouse);
          setWarehouseType(response.warehouse.warehouse_type || 'sub');
        }
        if (response.zones) {
          setWarehouseZones(response.zones || []);
        }
        if (response.data) {
          const mapped = response.data.map(o => ({
            id: o._id,
            customer_id: o.customer_id,
            epc_account: o.epc_account || null,
            epc_company: o.epc_company || null,
            partner: o.epc_company?.name || o.epc_account?.name || o.delivery_address?.contact_name || "Customer Order",
            phone: o.epc_account?.whatsapp || o.delivery_address?.contact_number || "N/A",
            email: o.epc_company?.email || o.epc_account?.email || null,
            address: o.delivery_address?.address_line || "No street address",
            region: o.delivery_address?.district_name || "N/A",
            state: o.delivery_address?.state_name || "N/A",
            pincode: o.delivery_address?.pincode || "N/A",
            weight: o.weight !== undefined ? o.weight : 450,
            panels: o.panels !== undefined ? o.panels : 10,
            kws: o.combo_kit_id?.capacity || 3,
            kitName: o.combo_kit_id?.name || "Solar Combo Kit",
            order_type: o.order_type || o.fulfillment_bifurcation?.order_type || (o.is_trial_order ? "trial_order" : "po_order"),
            fulfillment_bifurcation: o.fulfillment_bifurcation || null,
            status: o.status,
            lat: o.delivery_address?.lat || null,
            lng: o.delivery_address?.lng || null,
            rawAddress: o.delivery_address,
            zone_name: o.zone_name || 'Unassigned Zone',
            components_checklist: o.components_checklist || [],
            stock_status: o.stock_status || 'in_stock',
            procurement_group_id: o.procurement_group_id || null,
            procurement_readiness_status: o.procurement_readiness_status || null,
            batch_status: o.batch_status || null,
            tracking_status: o.tracking_status || null,
            dispatch_delivery_id: o.dispatch_delivery_id || null,
            dispatch_vehicle: o.dispatch_vehicle || null,
            dispatch_driver: o.dispatch_driver || null,
            dispatch_driver_contact: o.dispatch_driver_contact || null,
            dispatch_eway_bill: o.dispatch_eway_bill || null,
            dispatch_toll_cost: o.dispatch_toll_cost || 0,
            dispatch_fuel_cost: o.dispatch_fuel_cost || 0,
            dispatch_distance: o.dispatch_distance || 0,
            delivery_photo_proof: o.delivery_photo_proof || null,
            delivery_otp_verified: o.delivery_otp_verified || false,
            selected: false
          }));
          if (mapped.length > 0) {
            setOrders(mapped);

            // Automatically recover active dispatch trip on page load
            const activeOrder = mapped.find(o => o.dispatch_delivery_id && o.tracking_status !== 'Delivered');
            if (activeOrder) {
              const batchOrders = mapped.filter(o => o.dispatch_delivery_id === activeOrder.dispatch_delivery_id);
              setOrders(prev => prev.map(o => (
                o.dispatch_delivery_id === activeOrder.dispatch_delivery_id ? { ...o, selected: true } : o
              )));
              setCreatedDelivery({
                deliveryId: activeOrder.dispatch_delivery_id,
                orders: batchOrders.map(o => o.id),
                vehicle: activeOrder.dispatch_vehicle,
                driver: activeOrder.dispatch_driver,
                driverContact: activeOrder.dispatch_driver_contact,
                totalWeight: batchOrders.reduce((sum, o) => sum + (o.weight || 0), 0),
                totalKws: batchOrders.reduce((sum, o) => sum + (o.kws || 0), 0),
                ewayBill: activeOrder.dispatch_eway_bill,
                tollCost: activeOrder.dispatch_toll_cost,
                fuelCost: activeOrder.dispatch_fuel_cost,
                distance: activeOrder.dispatch_distance,
              });
              const nextHandover = {};
              batchOrders.forEach(o => {
                nextHandover[o.id] = {
                  delivered: o.delivery_otp_verified || false,
                  photo: o.delivery_photo_proof || "",
                  otp: o.delivery_otp_verified ? "1234" : ""
                };
              });
              setOrderDeliveryStatus(nextHandover);
              setTrackingStatus(activeOrder.tracking_status);
              setActiveStep(4);
            }
          } else {
            setOrders([]);
          }
        } else {
          setOrders([]);
        }
      } else {
        setOrders([]);
      }
    } catch (err) {
      console.error("Error loading sales orders:", err);
      setOrders([]);
    } finally {
      setLoadingOrders(false);
    }
  };

  useEffect(() => {
    loadSalesOrders();
  }, []);

  const [dynamicVehicles, setDynamicVehicles] = useState([]);

  useEffect(() => {
    const fetchVehicles = async () => {
      try {
        const res = await compareVehicles();
        if (res.status === "success" && res.data && res.data.length > 0) {
          const mapped = res.data.map(v => ({
            id: v._id || v.id,
            type: v.vehicle_type || v.name,
            name: v.name,
            capacity: v.capacity_kg,
            rate: v.base_rate_per_km,
            fuel_cost_per_km: v.fuel_cost_per_km || 0,
            total_cost_per_km: v.total_cost_per_km || v.base_rate_per_km,
            driver: v.drivers && v.drivers[0] ? v.drivers[0].name : "N/A",
            contact: v.drivers && v.drivers[0] ? v.drivers[0].contact : "N/A",
            registration_number: v.registration_number
          }));
          setDynamicVehicles(mapped);
        }
      } catch (err) {
        console.error("Failed to load vehicle catalog from DB:", err);
      }
    };
    fetchVehicles();
  }, [activeStep]);

  const selectedOrders = useMemo(() => orders.filter(o => o.selected), [orders]);

  const mapRef = React.useRef(null);
  const [mapInstance, setMapInstance] = useState(null);
  const markersRef = React.useRef([]);
  const polylineRef = React.useRef(null);
  const directionsRenderersRef = React.useRef([]);

  const [directionsResult, setDirectionsResult] = useState(null);
  const [routesList, setRoutesList] = useState([]);
  const [selectedRouteIndex, setSelectedRouteIndex] = useState(0);
  const [customWaypoints, setCustomWaypoints] = useState([]);

  const distanceForCost = useMemo(() => {
    if (routesList && routesList[selectedRouteIndex]) {
      return parseFloat(routesList[selectedRouteIndex].distance) || 60;
    }
    return 60;
  }, [routesList, selectedRouteIndex]);

  // Clean map instance and waypoints when active step changes
  useEffect(() => {
    if (activeStep !== 1) {
      setMapInstance(null);
      setCustomWaypoints([]);
    }
  }, [activeStep]);

  useEffect(() => {
    const initMap = async () => {
      try {
        const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
        await loadGoogleMaps(apiKey);

        if (!window.google) return;

        // Center on warehouse if available, else first validCoord
        const validCoord = orders.find(o => o.lat && o.lng);
        const centerPos = warehouseInfo && warehouseInfo.lat && warehouseInfo.lng
          ? { lat: parseFloat(warehouseInfo.lat), lng: parseFloat(warehouseInfo.lng) }
          : (validCoord ? { lat: parseFloat(validCoord.lat), lng: parseFloat(validCoord.lng) } : { lat: 20.5937, lng: 78.9629 });

        if (!mapInstance && mapRef.current) {
          const map = new google.maps.Map(mapRef.current, {
            center: centerPos,
            zoom: warehouseInfo ? 11 : (validCoord ? 12 : 5),
            disableDefaultUI: true,
            zoomControl: true,
          });

          // Add click listener to assign custom waypoints
          map.addListener("click", (e) => {
            if (e.latLng) {
              const clickedLat = e.latLng.lat();
              const clickedLng = e.latLng.lng();
              setCustomWaypoints(prev => [...prev, { lat: clickedLat, lng: clickedLng }]);
            }
          });

          setMapInstance(map);
        }
      } catch (err) {
        console.error("Error loading Google Maps in DeliveryManagement:", err);
      }
    };

    if (activeStep === 1 && orders.length > 0) {
      initMap();
    }
  }, [activeStep, orders, warehouseInfo, mapInstance]);

  // Fetch directions when selections, warehouse, or custom waypoints change
  useEffect(() => {
    if (!mapInstance || !window.google) return;

    const selectedCoords = selectedOrders
      .filter(o => o.lat && o.lng)
      .map(o => ({ lat: parseFloat(o.lat), lng: parseFloat(o.lng) }));

    if (selectedCoords.length === 0) {
      setDirectionsResult(null);
      setRoutesList([]);
      setSelectedRouteIndex(0);
      return;
    }

    if (warehouseInfo && warehouseInfo.lat && warehouseInfo.lng) {
      const directionsService = new google.maps.DirectionsService();
      const origin = { lat: parseFloat(warehouseInfo.lat), lng: parseFloat(warehouseInfo.lng) };
      const destination = selectedCoords[selectedCoords.length - 1];
      
      const orderWaypoints = selectedCoords.slice(0, -1).map(coord => ({
        location: new google.maps.LatLng(coord.lat, coord.lng),
        stopover: true
      }));

      const clickedWaypoints = customWaypoints.map(coord => ({
        location: new google.maps.LatLng(coord.lat, coord.lng),
        stopover: false
      }));

      const combinedWaypoints = [...orderWaypoints, ...clickedWaypoints];

      directionsService.route({
        origin,
        destination,
        waypoints: combinedWaypoints,
        optimizeWaypoints: true,
        provideRouteAlternatives: true,
        travelMode: google.maps.TravelMode.DRIVING
      }, (result, status) => {
        if (status === google.maps.DirectionsStatus.OK) {
          setDirectionsResult(result);
          
          const routeOptions = result.routes.map((route, idx) => {
            let distanceMeters = 0;
            route.legs.forEach(leg => {
              distanceMeters += leg.distance.value;
            });
            const distanceKm = (distanceMeters / 1000).toFixed(1);
            
            let durationSec = 0;
            route.legs.forEach(leg => {
              durationSec += leg.duration.value;
            });
            const hours = Math.floor(durationSec / 3600);
            const mins = Math.round((durationSec % 3600) / 60);
            const durationText = hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;

            return {
              index: idx,
              distance: `${distanceKm} km`,
              duration: durationText,
              summary: route.summary || `Route Option ${idx + 1}`
            };
          });
          setRoutesList(routeOptions);
          setSelectedRouteIndex(0);
        } else {
          console.warn("Directions request failed:", status);
          setDirectionsResult({ fallback: true, origin, selectedCoords });
          setRoutesList([]);
          setSelectedRouteIndex(0);
        }
      });
    }
  }, [selectedOrders, warehouseInfo, mapInstance, customWaypoints]);

  // Synchronize Markers & Render routes
  useEffect(() => {
    if (!mapInstance || !window.google) return;

    // Clear old markers
    markersRef.current.forEach(m => m.setMap(null));
    markersRef.current = [];

    // Clear old polyline
    if (polylineRef.current) {
      polylineRef.current.setMap(null);
      polylineRef.current = null;
    }

    // Clear old directions renderers
    if (directionsRenderersRef.current) {
      directionsRenderersRef.current.forEach(r => r.setMap(null));
      directionsRenderersRef.current = [];
    }

    const bounds = new google.maps.LatLngBounds();
    let hasCoords = false;

    // Add warehouse pin
    if (warehouseInfo && warehouseInfo.lat && warehouseInfo.lng) {
      hasCoords = true;
      const whPosition = { lat: parseFloat(warehouseInfo.lat), lng: parseFloat(warehouseInfo.lng) };
      bounds.extend(whPosition);

      const whPinSvg = `
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="42" height="42">
          <path fill="#4F46E5" d="M12 3L2 12h3v8h14v-8h3L12 3zm0 11.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
        </svg>
      `;

      const whMarker = new google.maps.Marker({
        position: whPosition,
        map: mapInstance,
        title: `Warehouse Hub: ${warehouseInfo.warehouse_code || 'Hub'}`,
        icon: {
          url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(whPinSvg),
          scaledSize: new google.maps.Size(42, 42)
        }
      });
      markersRef.current.push(whMarker);
    }

    // Add order pins
    orders.forEach(o => {
      if (!o.lat || !o.lng) return;
      hasCoords = true;

      const position = { lat: parseFloat(o.lat), lng: parseFloat(o.lng) };
      bounds.extend(position);

      const markerColor = o.selected ? "#10B981" : "#3B82F6"; // Emerald green for selected, blue for active

      const pinSvg = `
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="36" height="36">
          <path fill="${markerColor}" d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
        </svg>
      `;

      const marker = new google.maps.Marker({
        position,
        map: mapInstance,
        title: `${o.id} - ${o.partner}`,
        icon: {
          url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(pinSvg),
          scaledSize: new google.maps.Size(36, 36)
        }
      });

      marker.addListener("click", () => {
        setOrders(prev => prev.map(item => item.id === o.id ? { ...item, selected: !item.selected } : item));
      });

      markersRef.current.push(marker);
    });

    // Add custom waypoints pins
    customWaypoints.forEach((wp, idx) => {
      const position = { lat: wp.lat, lng: wp.lng };
      bounds.extend(position);
      hasCoords = true;

      const wpPinSvg = `
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="30" height="30">
          <path fill="#F97316" d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
        </svg>
      `;

      const marker = new google.maps.Marker({
        position,
        map: mapInstance,
        title: `Custom Via-Point ${idx + 1} (Click to remove)`,
        icon: {
          url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(wpPinSvg),
          scaledSize: new google.maps.Size(30, 30)
        }
      });

      marker.addListener("click", () => {
        setCustomWaypoints(prev => prev.filter((_, i) => i !== idx));
      });

      markersRef.current.push(marker);
    });

    // Draw route(s) based on directionsResult
    if (directionsResult) {
      if (directionsResult.fallback) {
        // Fallback straight polyline
        const fullPath = [directionsResult.origin, ...directionsResult.selectedCoords];
        const path = new google.maps.Polyline({
          path: fullPath,
          geodesic: true,
          strokeColor: "#10B981",
          strokeOpacity: 0.9,
          strokeWeight: 3.5,
          map: mapInstance
        });
        polylineRef.current = path;
      } else if (directionsResult.routes) {
        // Draw all routes, highlighting the selected one
        directionsResult.routes.forEach((route, idx) => {
          const isSelected = idx === selectedRouteIndex;
          const renderer = new google.maps.DirectionsRenderer({
            map: mapInstance,
            draggable: isSelected, // Allow dragging the selected route
            suppressMarkers: true,
            routeIndex: idx,
            polylineOptions: {
              strokeColor: isSelected ? "#10B981" : "#94A3B8", // Emerald Green for selected, Slate Gray for alternate
              strokeOpacity: isSelected ? 0.95 : 0.45,
              strokeWeight: isSelected ? 6.5 : 4,
              zIndex: isSelected ? 100 : 10 - idx
            }
          });
          renderer.setDirections(directionsResult);

          if (isSelected) {
            renderer.addListener("directions_changed", () => {
              const newResult = renderer.getDirections();
              if (newResult && newResult.routes && newResult.routes[idx]) {
                const updatedRoute = newResult.routes[idx];
                let distanceMeters = 0;
                updatedRoute.legs.forEach(leg => {
                  distanceMeters += leg.distance.value;
                });
                const distanceKm = (distanceMeters / 1000).toFixed(1);
                
                let durationSec = 0;
                updatedRoute.legs.forEach(leg => {
                  durationSec += leg.duration.value;
                });
                const hours = Math.floor(durationSec / 3600);
                const mins = Math.round((durationSec % 3600) / 60);
                const durationText = hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;

                setRoutesList(prev => {
                  const next = [...prev];
                  if (next[idx]) {
                    next[idx] = {
                      ...next[idx],
                      distance: `${distanceKm} km`,
                      duration: durationText
                    };
                  }
                  return next;
                });
              }
            });
          }

          directionsRenderersRef.current.push(renderer);
        });
      }
    }

    if (hasCoords) {
      mapInstance.fitBounds(bounds);
      const validOrdersCount = orders.filter(o => o.lat && o.lng).length;
      if (validOrdersCount === 0 && warehouseInfo) {
        mapInstance.setZoom(12);
      } else if (validOrdersCount === 1 && warehouseInfo) {
        mapInstance.setZoom(10);
      }
    }
  }, [orders, directionsResult, selectedRouteIndex, warehouseInfo, mapInstance, customWaypoints]);
  
  // Selection states
  const [selectedVehicle, setSelectedVehicle] = useState(null);
  const [eta, setEta] = useState('4.5 Hours');
  const [tollCost, setTollCost] = useState('350');
  const [fuelCost, setFuelCost] = useState('1500');
  
  // Output delivery details
  const [createdDelivery, setCreatedDelivery] = useState(null);
  const [otpVerification, setOtpVerification] = useState('');
  const [otpVerified, setOtpVerified] = useState(false);
  const [trackingStatus, setTrackingStatus] = useState('At Warehouse');
  const [whatsappLogs, setWhatsappLogs] = useState([]);

  // Sticker/Label checklist and individual deliveries
  const [labeledItems, setLabeledItems] = useState({});
  const [orderDeliveryStatus, setOrderDeliveryStatus] = useState({});
  const [activeLabelProduct, setActiveLabelProduct] = useState(null);
  const [viewTab, setViewTab] = useState("scheduler");

  // Per-order label items grouped by order id (so Print Sticker always knows which order a product belongs to)
  const ordersWithItems = useMemo(() => {
    return selectedOrders.map(o => {
      const items = [];
      const seen = new Set();
      if (o.components_checklist && o.components_checklist.length > 0) {
        o.components_checklist.forEach(item => {
          const key = item.sku_id || item.sku_code || item.product_name;
          if (key && !seen.has(key)) {
            seen.add(key);
            items.push({
              id: key,
              sku_code: item.sku_code || 'N/A',
              product_name: item.product_name || 'Product',
              qty: item.required_qty || 1,
            });
          }
        });
      } else {
        // Fallback: label the kit itself
        items.push({
          id: o.kitName || o.id,
          sku_code: o.id?.slice(-8) || 'KIT',
          product_name: o.kitName || 'Solar Combo Kit',
          qty: 1,
        });
      }
      return { order: o, items };
    });
  }, [selectedOrders]);

  // Flat unique items (for backward compat with allItemsLabeled)
  const uniqueItemsToLabel = useMemo(() => {
    const seen = new Set();
    const flat = [];
    ordersWithItems.forEach(({ items }) => {
      items.forEach(item => {
        if (!seen.has(item.id)) {
          seen.add(item.id);
          flat.push(item);
        }
      });
    });
    return flat;
  }, [ordersWithItems]);

  const allItemsLabeled = useMemo(() => {
    if (uniqueItemsToLabel.length === 0) return false;
    return uniqueItemsToLabel.every(item => !!labeledItems[item.id]);
  }, [uniqueItemsToLabel, labeledItems]);

  // Filter orders by zone — also hide orders with no valid delivery address
  const hasValidAddress = (o) => {
    const hasAddress = o.rawAddress && (
      (o.rawAddress.address_line && o.rawAddress.address_line.trim() !== '') ||
      (o.rawAddress.pincode && o.rawAddress.pincode.trim() !== '')
    );
    return hasAddress;
  };

  const zoneOptions = useMemo(() => {
    if (warehouseType === 'master') {
      return ['All', ...warehouseZones];
    }
    return [];
  }, [warehouseType, warehouseZones]);

  // Build EPC filter options from all orders
  const epcOptions = useMemo(() => {
    const seen = new Set();
    const options = [{ value: 'All', label: 'All EPCs' }];
    orders.forEach(o => {
      const key = o.customer_id?.toString();
      if (key && !seen.has(key)) {
        seen.add(key);
        options.push({
          value: key,
          label: o.epc_company?.name || o.epc_account?.name || o.partner || 'Unknown EPC',
          email: o.epc_company?.email || o.epc_account?.email || null
        });
      }
    });
    return options;
  }, [orders]);

  const filteredOrders = useMemo(() => {
    let list = orders.filter(hasValidAddress);
    
    // Only show pending orders (not dispatched/completed) in Step 1
    list = list.filter(o => o.status === 'confirmed' && !o.tracking_status);
    
    // EPC filter
    if (selectedEpc !== 'All') {
      list = list.filter(o => o.customer_id?.toString() === selectedEpc);
    }

    // Order Type filter
    if (selectedOrderType !== 'All') {
      list = list.filter(o => o.order_type === selectedOrderType);
    }
    
    // Pincode select filter
    if (selectedPincode !== "All Pincodes") {
      list = list.filter(o => o.pincode === selectedPincode);
    }

    // State filter
    if (selectedState !== "All") {
      list = list.filter(o => (o.state || o.destination?.state || '').toLowerCase() === selectedState.toLowerCase());
    }

    // Franchisee Cluster filter
    if (selectedCluster !== "All") {
      const foundClu = liveClusters.find(c => c.cluster_name === selectedCluster);
      list = list.filter(o => {
        if (o.cluster_name === selectedCluster) return true;
        const oDist = (o.region || o.destination?.district || '').toLowerCase();
        if (foundClu && (foundClu.district_names || []).some(d => d.toLowerCase() === oDist)) return true;
        return false;
      });
    }
    
    // Zone filter (only when master warehouse)
    if (warehouseType === 'master') {
      if (selectedZone !== 'All') {
        list = list.filter(o => {
          const orderZone = (o.zone_name || o.region || '').toLowerCase();
          const targetZone = selectedZone.toLowerCase();
          return orderZone.includes(targetZone) || targetZone.includes(orderZone);
        });
      }
    }
    
    return list;
  }, [orders, selectedZone, selectedPincode, selectedState, selectedCluster, selectedEpc, selectedOrderType, warehouseType, liveClusters]);

  const groupedOrdersByBuyer = useMemo(() => {
    const groups = {};
    filteredOrders.forEach(o => {
      // Group by customer_id for accuracy (same EPC, same group regardless of contact name)
      const groupKey = o.customer_id?.toString() || o.partner || "Unknown Customer";
      if (!groups[groupKey]) {
        groups[groupKey] = {
          partner: o.partner,
          phone: o.phone,
          email: o.email,
          epc_account: o.epc_account,
          epc_company: o.epc_company,
          orders: []
        };
      }
      groups[groupKey].orders.push(o);
    });
    return Object.values(groups);
  }, [filteredOrders]);

  
  const totals = useMemo(() => {
    let weight = 0;
    let panels = 0;
    let kws = 0;
    selectedOrders.forEach(o => {
      weight += o.weight;
      panels += o.panels;
      kws += o.kws;
    });
    return { weight, panels, kws: parseFloat(kws.toFixed(2)) };
  }, [selectedOrders]);

  const handleToggleOrder = (id) => {
    setOrders(orders.map(o => o.id === id ? { ...o, selected: !o.selected } : o));
  };

  const handleOpenPoRequest = (order) => {
    const outOfStockItems = (order.components_checklist || []).filter(item => !item.in_stock);
    setPoRequestOrderId(order.id);
    setPoRequestItems(outOfStockItems.map(item => {
      const pendingQty = item.pending_qty !== undefined ? item.pending_qty : (item.required_qty - (item.allocated_qty || 0));
      return {
        sku_id: item.sku_id,
        sku_code: item.sku_code,
        product_name: item.product_name,
        required_qty: item.required_qty,
        allocated_qty: item.allocated_qty || 0,
        pending_qty: pendingQty > 0 ? pendingQty : 0,
        current_stock: item.current_stock
      };
    }));
    setPoRequestSuccess("");
    setPoRequestModalOpen(true);
  };

  const handleUpdateItemQty = (skuId, newQty) => {
    setPoRequestItems(prev => prev.map(item => item.sku_id === skuId ? { ...item, qty: Math.max(1, Number(newQty)) } : item));
  };

  const handleSubmitPoRequest = async () => {
    if (poRequestItems.length === 0) return;
    setSubmittingPoRequest(true);
    try {
      const res = await createPoRequest(poRequestItems.map(item => ({
        sku_id: item.sku_id,
        sku_code: item.sku_code,
        qty: item.qty
      })));
      if (res && res.status === "success") {
        setPoRequestSuccess(`PO Request #${res.data.request_number} sent to Accounts department successfully!`);
        setTimeout(() => {
          setPoRequestModalOpen(false);
        }, 2500);
      } else {
        alert(res.message || "Failed to submit PO Request");
      }
    } catch (err) {
      console.error("PO Request submission error:", err);
      alert(err.response?.data?.message || err.message || "Failed to submit PO Request");
    } finally {
      setSubmittingPoRequest(false);
    }
  };

  const routeOptimizationText = useMemo(() => {
    if (selectedOrders.length === 0) return 'Warehouse Hub -> (Select orders)';
    return 'Warehouse Hub -> ' + selectedOrders.map(o => o.id).join(' -> ');
  }, [selectedOrders]);

  const activeCatalog = useMemo(() => {
    return dynamicVehicles;
  }, [dynamicVehicles]);

  const suggestedVehicle = useMemo(() => {
    if (totals.weight === 0) return null;
    const fit = activeCatalog.filter(v => v.capacity >= totals.weight);
    if (fit.length === 0) {
      return [...activeCatalog].sort((a, b) => b.capacity - a.capacity)[0];
    }
    return [...fit].sort((a, b) => a.total_cost_per_km - b.total_cost_per_km)[0];
  }, [totals.weight, activeCatalog]);

  useEffect(() => {
    if (selectedVehicle && selectedVehicle.capacity < totals.weight) {
      setSelectedVehicle(null);
    }
  }, [totals.weight, selectedVehicle]);

  const filteredVehicles = useMemo(() => {
    return activeCatalog.filter(v => v.capacity >= totals.weight);
  }, [totals.weight, activeCatalog]);

  useEffect(() => {
    const v = selectedVehicle || suggestedVehicle;
    if (v && distanceForCost > 0) {
      const computedFuel = Math.round(distanceForCost * (v.fuel_cost_per_km || 3.5));
      setFuelCost(String(computedFuel));
    }
  }, [selectedVehicle, suggestedVehicle, distanceForCost]);

  const handleNextStep = () => {
    if (activeStep === 1) {
      if (selectedOrders.length === 0) {
        alert("Please select at least one order to optimize route!");
        return;
      }
      const hasInsufficient = selectedOrders.some(o => o.stock_status === 'insufficient');
      if (hasInsufficient) {
        alert("Cannot proceed: One or more selected orders have Insufficient Stock. Please raise a PO Request first or deselect the insufficient orders.");
        return;
      }
    }
    if (activeStep === 2) {
      const activeVehicle = selectedVehicle || suggestedVehicle;
      if (!activeVehicle) {
        alert("Please select a vehicle!");
        return;
      }
      handleCreateDelivery();
    }
    setActiveStep(prev => prev + 1);
  };

  const handlePrevStep = () => {
    setActiveStep(prev => Math.max(1, prev - 1));
  };

  const handleCreateDelivery = async () => {
    const deliveryId = `DLV-${Date.now().toString().slice(-6)}`;
    const vehicleObj = selectedVehicle || suggestedVehicle;
    setCreatedDelivery({
      deliveryId,
      orders: selectedOrders.map(o => o.id),
      vehicle: vehicleObj.type,
      driver: vehicleObj.driver,
      driverContact: vehicleObj.contact,
      totalWeight: totals.weight,
      totalKws: totals.kws,
      ewayBill: `EWB-${Math.floor(100000 + Math.random() * 900000)}`,
    });
    
    // Initialize delivery status for each order
    const initialStatus = {};
    selectedOrders.forEach(o => {
      initialStatus[o.id] = { delivered: false, photo: "", otp: "" };
    });
    setOrderDeliveryStatus(initialStatus);

    setWhatsappLogs(prev => [
      ...prev,
      `[WhatsApp to Customers]: Dispatch slip created for delivery ${deliveryId}. Driver ${vehicleObj.driver} is scheduled for delivery.`
    ]);

    // Save all dispatch details to DB (tracking + vehicle/driver/delivery ID etc.)
    const distanceKm = parseFloat(routesList[selectedRouteIndex]?.distance || distanceForCost || 0);
    const tollVal = parseFloat(tollCost) || 0;
    const fuelVal = parseFloat(fuelCost) || 0;
    try {
      await Promise.all(selectedOrders.map(o => updateSalesOrderTracking(o.id, {
        tracking_status: 'At Warehouse',
        dispatch_delivery_id: deliveryId,
        dispatch_vehicle: vehicleObj.type,
        dispatch_driver: vehicleObj.driver,
        dispatch_driver_contact: vehicleObj.contact,
        dispatch_eway_bill: `EWB-${Math.floor(100000 + Math.random() * 900000)}`,
        dispatch_toll_cost: tollVal,
        dispatch_fuel_cost: fuelVal,
        dispatch_distance: distanceKm,
      })));
      setOrders(prev => prev.map(o => {
        if (selectedOrders.some(so => so.id === o.id)) {
          return {
            ...o,
            tracking_status: 'At Warehouse',
            dispatch_delivery_id: deliveryId,
            dispatch_vehicle: vehicleObj.type,
            dispatch_driver: vehicleObj.driver,
            dispatch_driver_contact: vehicleObj.contact,
            dispatch_toll_cost: tollVal,
            dispatch_fuel_cost: fuelVal,
            dispatch_distance: distanceKm,
          };
        }
        return o;
      }));
    } catch (err) {
      console.error("Failed to save dispatch details to DB:", err);
    }
  };

  const handleDeliverSingleOrder = async (orderId, photoData, otpVal) => {
    if (!photoData) {
      alert("Please upload a photo proof of delivery!");
      return;
    }
    if (otpVal !== '1234') {
      alert("Invalid OTP! Use '1234' for simulator testing.");
      return;
    }

    try {
      await deliverSalesOrder(orderId);
      
      // Save delivery proof and verify status in DB
      await updateSalesOrderTracking(orderId, {
        tracking_status: 'Delivered',
        delivery_photo_proof: photoData,
        delivery_otp_verified: true
      });

      // Update local orders state
      setOrders(prev => prev.map(o => {
        if (o.id === orderId) {
          return {
            ...o,
            status: 'completed',
            tracking_status: 'Delivered',
            delivery_photo_proof: photoData,
            delivery_otp_verified: true
          };
        }
        return o;
      }));
      
      setOrderDeliveryStatus(prev => {
        const next = {
          ...prev,
          [orderId]: { delivered: true, photo: photoData, otp: otpVal }
        };

        const allDone = selectedOrders.every(o => {
          if (o.id === orderId) return true;
          return !!next[o.id]?.delivered;
        });

        if (allDone) {
          triggerWhatsAppUpdate('Delivered');
          setOtpVerified(true);
        } else {
          const logMsg = `[WhatsApp Notification]: Order ${orderId} delivered successfully with photo proof. Transit batch is continuing to next stops...`;
          setWhatsappLogs(l => [...l, logMsg]);
        }

        return next;
      });

    } catch (err) {
      console.error(err);
      alert("Failed to complete delivery for order on backend.");
    }
  };

  const triggerWhatsAppUpdate = async (statusText) => {
    const message = `[WhatsApp Notification]: Delivery ${createdDelivery?.deliveryId} status updated to: "${statusText}". (Driver: ${createdDelivery?.driver})`;
    setWhatsappLogs(prev => [...prev, message]);
    setTrackingStatus(statusText);
    try {
      await Promise.all(selectedOrders.map(o => updateSalesOrderTracking(o.id, statusText)));
      setOrders(prev => prev.map(o => {
        if (selectedOrders.some(so => so.id === o.id)) {
          return { ...o, tracking_status: statusText };
        }
        return o;
      }));
    } catch (err) {
      console.error("Failed to update tracking status in DB:", err);
    }
  };

  const verifyOTP = async () => {
    if (otpVerification === '1234') {
      try {
        // Mark all selected sales orders as completed in the backend
        await Promise.all(selectedOrders.map(o => deliverSalesOrder(o.id)));
        setOtpVerified(true);
        triggerWhatsAppUpdate('Delivered');
      } catch (err) {
        console.error("Failed to mark orders as completed:", err);
        alert("Verification succeeded but failed to update status in the database.");
      }
    } else {
      alert("Invalid OTP! Use '1234' for simulator testing.");
    }
  };

  return (
    <div className="space-y-6">
      {/* Header section */}
      <PageHeader
        title={warehouseMode === 'sub' ? 'Sub-Warehouse Customer Outward & Route Dispatch' : 'Master-Warehouse Customer Outward & Delivery Allocation'}
        subtitle={
          <div className="space-y-3">
            <p className="text-white/85 text-sm lg:text-base max-w-2xl font-medium">
              Configure vehicle load distribution (KGs/KWs), plan customer delivery drop routes, and track live dispatches.
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <span className="bg-white/20 text-white text-xs font-bold px-2.5 py-1.5 rounded-lg border border-white/30 flex items-center gap-1.5 shadow-sm">
                <FaWarehouse className="text-white/90 w-3.5 h-3.5" />
                Warehouse: {warehouseInfo?.warehouse_code || 'IND_MAH_001'}
              </span>
              <span className="bg-white/20 text-white text-xs font-bold px-2.5 py-1.5 rounded-lg border border-white/30 flex items-center gap-1.5 shadow-sm uppercase">
                <FaBolt className="text-white/90 w-3.5 h-3.5" />
                Mode: {warehouseType} Warehouse
              </span>
            </div>
          </div>
        }
        icon={FaRoute}
      />
      
      {/* Main Card with Tabs Inside */}
      <div className="card overflow-hidden">
        {/* Tab Switcher — inside the card */}
        <div className="flex border-b border-border bg-bg px-1 pt-1">
          <button
            onClick={() => setViewTab("scheduler")}
            className={`flex items-center gap-2 px-5 py-3 border-b-2 font-bold text-sm transition-all rounded-t-lg ${
              viewTab === "scheduler"
                ? "border-primary text-primary bg-surface"
                : "border-transparent text-text-muted hover:text-text-primary hover:bg-surface/60"
            }`}
          >
            <FaRoute size={14} />
            <span>Active Dispatch Scheduler</span>
          </button>
          <button
            onClick={() => setViewTab("history")}
            className={`flex items-center gap-2 px-5 py-3 border-b-2 font-bold text-sm transition-all rounded-t-lg ${
              viewTab === "history"
                ? "border-primary text-primary bg-surface"
                : "border-transparent text-text-muted hover:text-text-primary hover:bg-surface/60"
            }`}
          >
            <FaHistory size={14} />
            <span>Dispatch &amp; Tracking History</span>
          </button>
        </div>

        <div className="p-5">
      {viewTab === "scheduler" && (
        <>
          {/* Filter and navigation controls */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-bg border border-border p-4 rounded-2xl mb-5">
            {/* Step tracker */}
            <div className="flex items-center gap-2 text-xs font-bold text-text-secondary bg-bg border border-border p-2 rounded-xl">
              {[1, 2, 3, 4].map(step => (
                <Button
                  key={step}
                  variant={activeStep === step ? 'primary' : 'ghost'}
                  size="sm"
                  onClick={() => step <= activeStep ? setActiveStep(step) : null}
                >
                  Step {step}
                </Button>
              ))}
            </div>

        {/* State, Cluster & Pincode Select Filter */}
        {activeStep === 1 && (
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-text-secondary whitespace-nowrap">State:</span>
              <select
                value={selectedState}
                onChange={(e) => {
                  setSelectedState(e.target.value);
                  setSelectedCluster("All");
                }}
                className="py-1.5 px-2.5 text-xs bg-surface border border-border rounded-lg text-text-primary font-medium focus:border-primary"
              >
                {uniqueStates.map(st => (
                  <option key={st} value={st}>{st === 'All' ? 'All States' : st}</option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-text-secondary whitespace-nowrap">Cluster:</span>
              <select
                value={selectedCluster}
                onChange={(e) => setSelectedCluster(e.target.value)}
                className="py-1.5 px-2.5 text-xs bg-surface border border-border rounded-lg text-text-primary font-medium max-w-[200px] focus:border-primary"
              >
                {clusterOptions.map(cl => (
                  <option key={cl} value={cl}>{cl === 'All' ? 'All Clusters' : cl}</option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-text-secondary whitespace-nowrap">Pincode:</span>
              <DropdownWithSearchInput
                value={selectedPincode}
                onChange={setSelectedPincode}
                options={pincodeDropdownOptions}
                placeholder="Select Pincode"
                searchPlaceholder="Search Pincode..."
                className="w-40"
              />
            </div>
          </div>
        )}
      </div>

      {/* STEP 1: ZONE SELECTOR & LOAD CALCULATION */}
      {activeStep === 1 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
          <div className="card p-6 space-y-4">
            <div className="flex flex-col gap-3 border-b border-border pb-3">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                <h3 className="text-base font-bold text-text-primary flex items-center gap-2">
                  <FaGlobe className="text-primary" />
                  {warehouseType === 'master' ? 'Zone-wise Delivery Planning' : 'Delivery Planning'}
                </h3>

                {/* Zone Filter (Only for Master Warehouse) */}
                {warehouseType === 'master' && zoneOptions.length > 0 && (
                  <div className="flex gap-1 overflow-x-auto max-w-[240px] pb-1 scrollbar-thin">
                    {zoneOptions.map(zone => (
                      <button
                        key={zone}
                        onClick={() => setSelectedZone(zone)}
                        className={`px-2.5 py-1 text-[11px] font-bold rounded-lg border transition-all shrink-0 ${
                          selectedZone === zone 
                            ? 'bg-primary border-primary text-white shadow-sm'
                            : 'bg-bg text-text-secondary border-border hover:border-primary/30'
                        }`}
                      >
                        {zone}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* EPC Filter */}
              {epcOptions.length > 1 && (
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[10px] font-black text-text-secondary uppercase tracking-wider flex items-center gap-1">
                    <FaUser className="text-primary" size={9} /> Filter by EPC:
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {epcOptions.map(opt => (
                      <button
                        key={opt.value}
                        onClick={() => setSelectedEpc(opt.value)}
                        className={`px-2.5 py-1 text-[10px] font-bold rounded-lg border transition-all ${
                          selectedEpc === opt.value
                            ? 'bg-primary border-primary text-white shadow-sm'
                            : 'bg-bg text-text-secondary border-border hover:border-primary/20'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Order Fulfillment Type Filter */}
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[10px] font-black text-text-secondary uppercase tracking-wider flex items-center gap-1">
                  <FaBoxes className="text-primary" size={9} /> Order Type:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    { value: "All", label: "All Types" },
                    { value: "po_order", label: "PO Orders" },
                    { value: "loose_order", label: "Loose Orders" },
                    { value: "trial_order", label: "Trial Orders" },
                  ].map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => setSelectedOrderType(opt.value)}
                      className={`px-2.5 py-1 text-[10px] font-bold rounded-lg border transition-all ${
                        selectedOrderType === opt.value
                          ? "bg-primary border-primary text-white shadow-sm"
                          : "bg-bg text-text-secondary border-border hover:border-primary/20"
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <p className="text-xs text-text-secondary">
              Select orders below. The total KW rating and KG weights will compute dynamically for fleet matching.
            </p>

            <div className="space-y-4 max-h-[380px] overflow-y-auto pr-1">
              {groupedOrdersByBuyer.map(group => (
                <div key={group.partner + (group.epc_account?._id || '')} className="bg-surface border border-border rounded-xl p-4 space-y-3 shadow-xs">
                  <div className="flex items-start justify-between border-b border-border pb-3">
                    <div className="space-y-1 flex-1">
                      {/* EPC Company Name (primary) */}
                      {group.epc_company?.name ? (
                        <h4 className="font-extrabold text-text-primary text-sm flex items-center gap-1.5">
                          <FaBuilding className="text-primary text-xs shrink-0" />
                          {group.epc_company.name}
                          {group.epc_company.brand_name && group.epc_company.brand_name !== group.epc_company.name && (
                            <span className="text-[10px] font-normal text-text-muted ml-1">({group.epc_company.brand_name})</span>
                          )}
                        </h4>
                      ) : (
                        <h4 className="font-extrabold text-text-primary text-sm flex items-center gap-1.5">
                          <FaUser className="text-primary text-xs" /> {group.partner}
                        </h4>
                      )}
                      {/* EPC Account (individual) */}
                      {group.epc_account?.name && group.epc_account.name !== group.epc_company?.name && (
                        <p className="text-text-secondary text-[11px] font-semibold flex items-center gap-1">
                          <FaUser className="text-text-muted text-[9px]" /> {group.epc_account.name}
                        </p>
                      )}
                      {/* Contact details */}
                      <div className="flex flex-wrap gap-x-3 gap-y-0.5">
                        {group.phone && group.phone !== "N/A" && (
                          <p className="text-text-secondary text-[11px] font-semibold flex items-center gap-1">
                            <FaPhone className="text-text-muted text-[9px]" /> {group.phone}
                          </p>
                        )}
                        {group.email && (
                          <p className="text-text-muted text-[11px] font-semibold flex items-center gap-1">
                            <FaEnvelope className="text-text-muted text-[9px]" /> {group.email}
                          </p>
                        )}
                      </div>
                    </div>
                    <span className="text-[10px] bg-primary/10 text-primary font-bold px-2 py-0.5 rounded-full shrink-0 ml-2">
                      {group.orders.length} {group.orders.length === 1 ? 'order' : 'orders'}
                    </span>
                  </div>

                  <div className="space-y-3">
                    {group.orders.map(o => {
                      const hasOutOfStock = o.stock_status === 'insufficient';
                      return (
                        <div 
                          key={o.id} 
                          onClick={() => handleToggleOrder(o.id)}
                          className={`p-3 border rounded-xl cursor-pointer transition-all flex justify-between items-center ${
                            o.selected ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/30'
                          }`}
                        >
                          <div className="text-xs space-y-1.5 w-[90%]">
                            <div className="flex justify-between items-center">
                              <span className="font-bold text-text-secondary tracking-wider">{o.id}</span>
                              <div className="flex items-center gap-1.5">
                                {o.procurement_readiness_status && (
                                  <span className={`text-[9px] font-black px-2 py-0.5 rounded uppercase tracking-wider flex items-center gap-1 ${
                                    o.procurement_readiness_status === 'Ready for Dispatch'
                                      ? 'bg-success/15 text-success border border-success/30'
                                      : o.procurement_readiness_status === 'Ready for Kit Preparation'
                                      ? 'bg-blue-500/15 text-blue-500 border border-blue-500/30'
                                      : 'bg-amber-500/15 text-amber-500 border border-amber-500/30'
                                  }`}>
                                    {o.procurement_readiness_status}
                                  </span>
                                )}
                                {hasOutOfStock && (
                                  <span className="bg-danger-soft text-danger text-[9px] font-black px-2 py-0.5 rounded uppercase tracking-wider flex items-center gap-1">
                                    <FaExclamationTriangle className="animate-pulse" /> Insufficient Stock
                                  </span>
                                )}
                                {o.order_type === "po_order" && (
                                  <span className="bg-blue-500/10 text-blue-600 border border-blue-500/20 text-[9px] font-black px-2 py-0.5 rounded">
                                    PO Order
                                  </span>
                                )}
                                {o.order_type === "loose_order" && (
                                  <span className="bg-purple-500/10 text-purple-600 border border-purple-500/20 text-[9px] font-black px-2 py-0.5 rounded">
                                    Loose Order
                                  </span>
                                )}
                                {o.order_type === "trial_order" && (
                                  <span className="bg-amber-500/10 text-amber-600 border border-amber-500/20 text-[9px] font-black px-2 py-0.5 rounded">
                                    Trial Order
                                  </span>
                                )}
                                {o.status && (
                                  <span className="bg-success/10 text-success text-[9px] font-bold px-2 py-0.5 rounded capitalize">
                                    {o.status}
                                  </span>
                                )}
                              </div>
                            </div>
                            {o.kitName && (
                              <p className="text-primary font-bold bg-primary/5 px-2.5 py-1 rounded border border-primary/10 text-[10px] w-fit flex items-center gap-1.5">
                                <FaBox className="text-[9px]" /> {o.kitName}
                              </p>
                            )}
                            <div className="bg-bg p-2.5 rounded-lg border border-border/40 text-[11px] space-y-2">
                              <div className="flex items-start gap-1.5 text-text-secondary leading-relaxed">
                                <FaMapMarkerAlt className="text-danger text-xs shrink-0 mt-0.5" />
                                <span>{o.address && o.address !== "No street address" ? `${o.address}, ` : ""}{o.region}, {o.state} - {o.pincode}</span>
                              </div>
                              <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 border-t border-border/30 pt-1.5 text-[10px] font-bold text-text-secondary">
                                <span className="flex items-center gap-1.5">
                                  <FaUser className="text-text-muted text-[9px]" /> Receiver: {o.rawAddress?.contact_name || "N/A"}
                                </span>
                                {o.rawAddress?.contact_number && (
                                  <span className="flex items-center gap-1.5">
                                    <FaPhone className="text-text-muted text-[9px]" /> Contact: {o.rawAddress.contact_number}
                                  </span>
                                )}
                              </div>
                            </div>
                            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border/40 pt-2 mt-2">
                              <div className="flex gap-3 text-[10px] font-black text-text-muted">
                                <span className="bg-bg px-2 py-0.5 rounded border border-border">Weight: {o.weight} KG</span>
                                <span className="bg-bg px-2 py-0.5 rounded border border-border">Power: {o.kws} kW</span>
                              </div>
                              {hasOutOfStock && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleOpenPoRequest(o);
                                  }}
                                  className="text-[10px] bg-primary text-white font-extrabold px-2.5 py-1 rounded-md hover:bg-primary/95 shadow-sm transition-all"
                                >
                                  Request PO
                                </button>
                              )}
                            </div>
                          </div>
                          <div className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 ${
                            o.selected ? 'bg-primary border-primary text-white' : 'border-border'
                          }`}>
                            {o.selected && <FaCheck size={10} />}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Calculator and Load Matching Side */}
          <div className="flex flex-col justify-between gap-4">
            <div className="card p-6 space-y-4 flex-1">
              <h3 className="text-sm font-bold text-text-primary uppercase tracking-wider flex items-center gap-1.5 border-b border-border pb-3">
                <FaCalculator className="text-primary" />
                Dynamic Load & KW Calculator
              </h3>

              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 bg-bg border border-border rounded-xl">
                  <span className="text-[10px] text-text-secondary font-bold uppercase block">Total Weight Load</span>
                  <strong className="text-lg font-black text-text-primary mt-1 block">{totals.weight} KG</strong>
                </div>
                <div className="p-3 bg-bg border border-border rounded-xl">
                  <span className="text-[10px] text-text-secondary font-bold uppercase block">Total Power Load</span>
                  <strong className="text-lg font-black text-text-primary mt-1 block">{totals.kws} kW</strong>
                </div>
              </div>

              <div className="space-y-3 pt-2">
                <div>
                  <span className="text-[10px] text-text-secondary font-bold uppercase block">Optimized Transit Route</span>
                  <p className="p-3 bg-bg border border-border rounded-xl font-mono text-xs text-text-primary mt-1">
                    {routeOptimizationText}
                  </p>
                </div>

                {routesList.length > 0 && (
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] text-text-secondary font-bold uppercase block text-primary font-extrabold">Select Route Alternative (Highlights on Map)</span>
                      {customWaypoints.length > 0 && (
                        <button
                          onClick={() => setCustomWaypoints([])}
                          className="text-[10px] text-danger font-extrabold hover:underline cursor-pointer"
                        >
                          Clear Custom Points ({customWaypoints.length})
                        </button>
                      )}
                    </div>
                    <div className="text-[10px] text-text-secondary leading-relaxed bg-surface/50 p-2.5 rounded-lg border border-border/40 space-y-1">
                      <div className="flex items-center gap-1.5"><FaLightbulb size={10} className="text-warning shrink-0" /><strong>Route Customizer:</strong></div>
                      <div>• <strong>Click the Map</strong> to place custom via-points (orange markers) to snap to shortcut roads.</div>
                      <div>• <strong>Drag the Green Line</strong> directly on the map to modify routes manually!</div>
                    </div>
                    <div className="grid grid-cols-1 gap-2">
                      {routesList.map(r => (
                        <div
                          key={r.index}
                          onClick={() => setSelectedRouteIndex(r.index)}
                          className={`p-3 border rounded-xl cursor-pointer transition-all flex justify-between items-center text-xs ${
                            selectedRouteIndex === r.index
                              ? 'border-primary bg-primary/5 font-extrabold text-text-primary shadow-xs'
                              : 'border-border bg-card/45 text-text-secondary hover:border-primary/35'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <span className={`w-2.5 h-2.5 rounded-full ${selectedRouteIndex === r.index ? 'bg-primary' : 'bg-text-muted/60'}`} />
                            <span>{r.summary || `Route Alternative ${r.index + 1}`}</span>
                          </div>
                          <div className="text-[10px] font-black text-text-primary bg-bg px-2.5 py-1 rounded-lg border border-border">
                            {r.distance} • {r.duration}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Interactive Route Mapping Google Map */}
              <div className="bg-bg border border-border rounded-xl flex-1 min-h-[280px] flex flex-col relative overflow-hidden">
                <div ref={mapRef} style={{ width: "100%", height: "100%", minHeight: "280px" }} />
                
                {selectedOrders.length === 0 && (
                  <div className="absolute inset-0 bg-background/80 flex flex-col justify-center items-center text-center p-4 z-10 pointer-events-none">
                    <FaMapMarkedAlt className="text-3xl text-primary mb-2 animate-bounce" />
                    <h4 className="font-bold text-text-primary text-xs">Route Dispatch Map View</h4>
                    <p className="text-[10px] text-text-secondary max-w-xs mx-auto mt-1">
                      Select multiple customer orders from the list to preview delivery pins and map routing waypoints.
                    </p>
                  </div>
                )}
              </div>
            </div>

            {selectedOrders.length > 0 && (
              <div className="card p-4 bg-linear-to-r from-primary/5 to-transparent flex items-center justify-between gap-4 shrink-0">
                <div className="text-xs">
                  <span className="text-text-secondary">Selected items:</span>
                  <h4 className="text-sm font-bold text-text-primary">{selectedOrders.length} Orders ({totals.panels} panels)</h4>
                </div>
                <Button onClick={handleNextStep} variant="primary" size="md">
                  Match Vehicle Capacity
                </Button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* STEP 2: VEHICLE AND DRIVER SCHEDULING */}
      {activeStep === 2 && (
        <div className="card p-6 space-y-6">
          <h3 className="text-base font-bold text-text-primary flex items-center gap-2 border-b border-border pb-3">
            <FaTruck className="text-primary" />
            Step 2: Vehicle Capacity Matching & Driver Scheduling
          </h3>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-4">
              <div className="p-4 bg-success/10 border border-success/20 text-success rounded-xl flex items-center gap-3">
                <FaCheckCircle className="text-xl shrink-0" />
                <div>
                  <span className="text-xs font-bold uppercase">Capacity Check:</span>
                  <p className="text-xs font-semibold mt-0.5">
                    Suggested vehicle: <strong className="underline">{suggestedVehicle?.type}</strong> (Max limit: {suggestedVehicle?.capacity} KG) matches load weight of {totals.weight} KG.
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                <label className="text-xs font-bold text-text-secondary uppercase">Select Vehicle & View Driver Availability:</label>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {filteredVehicles.map(v => (
                    <div 
                      key={v.id || v.type}
                      onClick={() => setSelectedVehicle(v)}
                      className={`p-4 border rounded-xl cursor-pointer transition-all ${
                        ((selectedVehicle && (selectedVehicle.id === v.id || selectedVehicle.type === v.type)) || 
                         (!selectedVehicle && suggestedVehicle?.type === v.type)) 
                          ? 'border-primary bg-primary/5 font-semibold' 
                          : 'border-border hover:border-primary/45'
                      }`}
                    >
                      <h4 className="font-bold text-text-primary text-xs flex justify-between items-center">
                        <span>{v.name || v.type}</span>
                        {v.registration_number && <span className="text-[9px] text-text-muted font-mono">{v.registration_number}</span>}
                      </h4>
                      <p className="text-[10px] text-text-secondary mt-1 font-semibold">Capacity: {v.capacity} KG</p>
                      <div className="text-[10px] text-text-muted mt-1 space-y-0.5">
                        <p>Base Rate: ₹{v.rate}/km</p>
                        {v.fuel_cost_per_km > 0 && <p className="text-warning font-medium">Fuel Cost: ₹{v.fuel_cost_per_km?.toFixed(1)}/km</p>}
                        <p className="font-bold text-primary">Total Rate: ₹{(v.total_cost_per_km || v.rate)?.toFixed(1)}/km</p>
                      </div>
                      <div className="mt-3 pt-2 border-t border-border/60 text-[10px] text-text-secondary font-medium">
                        <strong>Driver:</strong> {v.driver} <br />
                        <strong>Contact:</strong> {v.contact}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="card p-5 bg-bg/50 border border-border space-y-4">
              <h4 className="font-bold text-text-primary text-xs uppercase tracking-wider border-b border-border pb-2">Trip Allocation Settings</h4>
              
              <div className="space-y-3">
                <CustomInput
                  label="Estimated Transit Toll (₹)"
                  type="number"
                  value={tollCost}
                  onChange={(e) => setTollCost(e.target.value)}
                />
                <div className="space-y-1">
                  <CustomInput
                    label="Estimated Transit Fuel (₹) - Auto Calculated"
                    type="number"
                    value={fuelCost}
                    disabled
                  />
                  {(selectedVehicle || suggestedVehicle) && (
                    <div className="text-[10px] text-text-secondary bg-surface p-2.5 rounded-lg border border-border/80 space-y-1 mt-1 font-medium">
                      <div className="flex justify-between">
                        <span>Route Distance:</span>
                        <span className="font-bold text-text-primary">{distanceForCost.toFixed(1)} km</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Fuel Cost / KM:</span>
                        <span className="font-bold text-warning">₹{(selectedVehicle || suggestedVehicle).fuel_cost_per_km?.toFixed(2)}/km</span>
                      </div>
                      <div className="flex justify-between border-t border-border/40 pt-1 mt-1 font-bold text-primary">
                        <span>Math:</span>
                        <span>{distanceForCost.toFixed(1)} km × ₹{(selectedVehicle || suggestedVehicle).fuel_cost_per_km?.toFixed(2)}</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="p-3 bg-linear-to-r from-success/5 to-transparent border border-success/15 rounded-xl text-xs space-y-1">
                <div className="flex justify-between">
                  <span>Grand Total Cost:</span>
                  <span className="font-black text-success">
                    ₹{(parseInt(fuelCost) || 0) + (parseInt(tollCost) || 0) + (Math.round(distanceForCost) * (selectedVehicle?.rate || suggestedVehicle?.rate || 12))}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-between pt-4 border-t border-border">
            <Button onClick={handlePrevStep} variant="secondary" size="md">Back</Button>
            <Button onClick={handleNextStep} variant="primary" size="md">Generate Challan Document</Button>
          </div>
        </div>
      )}

      {/* STEP 3: DOCUMENT GENERATION */}
      {activeStep === 3 && (
        <div className="card p-6 space-y-6">
          <h3 className="text-base font-bold text-text-primary flex items-center gap-2 border-b border-border pb-3">
            <FaFileInvoice className="text-primary" />
            Step 3: Print Delivery Challan Documentation
          </h3>

          <div className="p-5 border border-border rounded-2xl bg-bg space-y-3 max-w-md mx-auto text-xs">
            <h4 className="text-center font-bold text-sm text-text-primary pb-2 border-b border-border">DELIVERY CHALLAN & E-WAY BILL</h4>
            
            <div className="flex justify-between">
              <span className="text-text-secondary">Transporter Fleet:</span>
              <span className="font-bold text-text-primary">{(selectedVehicle || suggestedVehicle)?.type}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-text-secondary">Assigned Operator:</span>
              <span className="font-bold text-text-primary">{(selectedVehicle || suggestedVehicle)?.driver} ({(selectedVehicle || suggestedVehicle)?.contact})</span>
            </div>
            <div className="flex justify-between">
              <span className="text-text-secondary">Payload Load limits:</span>
              <span className="font-bold text-text-primary">{totals.weight} KG / {totals.kws} kW</span>
            </div>
            <div className="flex justify-between">
              <span className="text-text-secondary">Transit Road Distance:</span>
              <span className="font-bold text-text-primary">{distanceForCost.toFixed(1)} km</span>
            </div>
            <div className="flex justify-between">
              <span className="text-text-secondary">Assigned Waypoints:</span>
              <span className="font-bold text-text-primary">{selectedOrders.length} Stops</span>
            </div>

            <div className="border-t border-border/60 pt-3.5 space-y-2.5">
              <h5 className="font-bold text-text-primary uppercase text-[10px] tracking-wider">Destination Stops:</h5>
              {selectedOrders.map(o => (
                <div key={o.id} className="bg-surface p-2.5 rounded-lg border border-border text-[10px] leading-relaxed">
                  <div className="flex justify-between font-bold">
                    <span className="text-primary font-mono">{o.id.slice(-8)}</span>
                    <span className="text-text-primary">{o.partner}</span>
                  </div>
                  {o.phone && o.phone !== "N/A" && (
                    <p className="text-text-secondary mt-0.5 font-semibold">📞 {o.phone}</p>
                  )}
                  <p className="text-text-secondary mt-0.5 font-medium">📍 {o.address && o.address !== "No street address" ? `${o.address}, ` : ""}{o.region}, {o.state} - {o.pincode}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-center gap-3">
            <Button variant="secondary" leftIcon={<FaFilePdf />}>
              Print Dispatch slip PDF
            </Button>
            <Button onClick={() => setActiveStep(4)} variant="success" leftIcon={<FaCheckCircle />}>
              Release Trip & Send WhatsApp Slips
            </Button>
          </div>

          <div className="flex justify-between pt-4 border-t border-border">
            <Button onClick={handlePrevStep} variant="secondary" size="md">Back</Button>
          </div>
        </div>
      )}

      {/* STEP 4: TRACKING DISPATCH & OTP */}
      {activeStep === 4 && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="card p-6 space-y-4 lg:col-span-2">
            <h3 className="text-base font-bold text-text-primary flex items-center gap-2 border-b border-border pb-3">
              <FaCogs className="text-primary" />
              Live Route Dispatch Tracking
            </h3>

            <div className="flex justify-between items-center text-xs bg-bg p-3 rounded-xl border border-border/60">
              <div>
                <span className="text-[10px] text-text-secondary font-bold uppercase">Delivery Ref</span>
                <p className="font-bold text-primary">{createdDelivery?.deliveryId}</p>
              </div>
              <div>
                <span className="text-[10px] text-text-secondary font-bold uppercase">E-Way Bill ID</span>
                <p className="font-bold text-text-primary">{createdDelivery?.ewayBill}</p>
              </div>
              <div>
                <span className="text-[10px] text-text-secondary font-bold uppercase">Fleet Operator</span>
                <p className="font-bold text-text-primary">{createdDelivery?.driver} ({createdDelivery?.driverContact})</p>
              </div>
            </div>

            {/* Steps indicator */}
            <div className="py-6 border-y border-border/50 grid grid-cols-5 text-center gap-2">
              {['At Warehouse', 'Loaded', 'Out for Delivery', 'Reached Site', 'Delivered'].map((status, idx) => {
                const isPassed = ['At Warehouse', 'Loaded', 'Out for Delivery', 'Reached Site', 'Delivered'].indexOf(trackingStatus) >= idx;
                return (
                  <div key={status} className="space-y-1">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center mx-auto text-xs font-bold transition-all ${
                      isPassed ? 'bg-primary text-white shadow-sm' : 'bg-border/60 text-text-muted'
                    }`}>
                      {idx + 1}
                    </div>
                    <span className={`text-[10px] font-bold block ${isPassed ? 'text-primary' : 'text-text-muted'}`}>{status}</span>
                  </div>
                );
              })}
            </div>

            {/* STEP 4 DETAILED STAGE ACTIONS */}
            {/* AT WAREHOUSE: Per-Kit Labeling Checklist */}
            {trackingStatus === 'At Warehouse' && (
              <div className="space-y-5 pt-2">
                {/* Header */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-primary/10 rounded-xl flex items-center justify-center text-primary">
                      <FaTag size={14} />
                    </div>
                    <div>
                      <h4 className="text-sm font-black text-text-primary">Product Sticker & Labeling Checklist</h4>
                      <p className="text-[10px] text-text-secondary">Print and stick labels on every product before loading</p>
                    </div>
                  </div>
                  <span className={`text-xs font-black px-3 py-1 rounded-full border ${
                    allItemsLabeled
                      ? 'bg-success/10 text-success border-success/20'
                      : 'bg-warning/10 text-warning border-warning/20'
                  }`}>
                    {Object.values(labeledItems).filter(Boolean).length} / {uniqueItemsToLabel.length} Labeled
                  </span>
                </div>

                {/* Per-Order Kit Cards */}
                <div className="space-y-4">
                  {ordersWithItems.map(({ order, items }) => {
                    const orderLabeledCount = items.filter(item => !!labeledItems[item.id]).length;
                    const orderAllLabeled = orderLabeledCount === items.length;
                    return (
                      <div key={order.id} className={`rounded-2xl border overflow-hidden transition-all ${
                        orderAllLabeled ? 'border-success/30 bg-success/3' : 'border-border bg-bg'
                      }`}>
                        {/* Kit Header */}
                        <div className={`flex items-center justify-between px-4 py-3 border-b ${
                          orderAllLabeled ? 'border-success/20 bg-success/5' : 'border-border/60 bg-surface'
                        }`}>
                          <div className="flex items-center gap-3">
                            <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-sm font-black ${
                              orderAllLabeled ? 'bg-success/15 text-success' : 'bg-primary/10 text-primary'
                            }`}>
                              {orderAllLabeled ? <FaCheckCircle size={14} /> : <FaBox size={14} />}
                            </div>
                            <div>
                              <p className="text-xs font-black text-text-primary">{order.kitName || 'Solar Combo Kit'}</p>
                              <p className="text-[10px] text-text-muted font-mono">{order.id?.slice(-10)}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] text-text-secondary font-bold">{order.partner}</span>
                            <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                              orderAllLabeled ? 'bg-success/10 text-success' : 'bg-border/40 text-text-muted'
                            }`}>
                              {orderLabeledCount}/{items.length}
                            </span>
                          </div>
                        </div>

                        {/* Items List */}
                        <div className="p-3 space-y-2">
                          {items.map(item => {
                            const isChecked = !!labeledItems[item.id];
                            return (
                              <div
                                key={item.id}
                                className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all select-none ${
                                  isChecked
                                    ? 'bg-success/5 border-success/25 hover:bg-success/8'
                                    : 'bg-surface border-border/70 hover:bg-bg'
                                }`}
                                onClick={() => setLabeledItems(prev => ({ ...prev, [item.id]: !isChecked }))}
                              >
                                <div className="flex items-center gap-3">
                                  <div className={`w-6 h-6 rounded-lg flex items-center justify-center border-2 transition-all ${
                                    isChecked ? 'bg-success border-success' : 'bg-surface border-border'
                                  }`}>
                                    {isChecked && <FaCheck size={10} className="text-white" />}
                                  </div>
                                  <div>
                                    <span className={`text-xs font-bold ${
                                      isChecked ? 'text-success line-through opacity-70' : 'text-text-primary'
                                    }`}>
                                      {item.product_name}
                                    </span>
                                    <div className="flex items-center gap-1.5 mt-0.5">
                                      <FaBarcode size={9} className="text-text-muted" />
                                      <span className="text-[9px] text-text-muted font-mono">{item.sku_code}</span>
                                    </div>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2">
                                  <span className="text-[10px] font-black text-text-secondary bg-bg px-2 py-0.5 rounded border border-border/50">
                                    Qty: {item.qty}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setActiveLabelProduct({ item, order });
                                    }}
                                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all active:scale-95 ${
                                      isChecked
                                        ? 'bg-success/10 text-success hover:bg-success/20'
                                        : 'bg-primary/10 text-primary hover:bg-primary/20'
                                    }`}
                                  >
                                    <FaPrint size={10} />
                                    {isChecked ? 'Reprint' : 'Print Sticker'}
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Proceed to Loading */}
                <div className={`p-4 rounded-2xl border flex items-center justify-between gap-4 ${
                  allItemsLabeled ? 'bg-primary/5 border-primary/20' : 'bg-surface border-border'
                }`}>
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                      allItemsLabeled ? 'bg-primary/15 text-primary' : 'bg-border/30 text-text-muted'
                    }`}>
                      <FaTruckLoading size={16} />
                    </div>
                    <div>
                      <h4 className="text-xs font-black text-text-primary">Proceed to Loading</h4>
                      <p className="text-[10px] text-text-muted">
                        {allItemsLabeled
                          ? 'All labels verified — vehicle is ready to load.'
                          : `${uniqueItemsToLabel.length - Object.values(labeledItems).filter(Boolean).length} item(s) still need labels.`
                        }
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1.5">
                    <button
                      onClick={() => triggerWhatsAppUpdate('Loaded')}
                      disabled={!allItemsLabeled}
                      className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition-all active:scale-95 ${
                        allItemsLabeled
                          ? 'bg-primary text-white hover:brightness-110 shadow-sm shadow-primary/30'
                          : 'bg-border/60 text-text-muted cursor-not-allowed'
                      }`}
                    >
                      <FaClipboardCheck size={12} />
                      Mark as Loaded
                    </button>
                    {!allItemsLabeled && (
                      <span className="text-[9px] text-warning font-bold flex items-center gap-1">
                        <FaExclamationTriangle size={8} /> Checklist incomplete
                      </span>
                    )}
                  </div>
                </div>
              </div>
            )}

            {trackingStatus === 'Loaded' && (
              <div className="p-6 bg-surface border border-border rounded-2xl space-y-4 text-center max-w-sm mx-auto pt-8">
                <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto text-primary text-xl">
                  <FaTruck />
                </div>
                <div className="space-y-1">
                  <h4 className="font-bold text-sm text-text-primary">Sticker Labeling Verified & Loaded</h4>
                  <p className="text-xs text-text-secondary">Vehicle capacity and loading safety requirements have been met. You can now dispatch the vehicle.</p>
                </div>
                <button
                  onClick={() => triggerWhatsAppUpdate('Out for Delivery')}
                  className="px-6 py-2.5 bg-primary text-white text-xs font-bold rounded-xl hover:brightness-105 active:scale-95 transition-all"
                >
                  Set: Out for Delivery
                </button>
              </div>
            )}

            {(trackingStatus === 'Out for Delivery' || trackingStatus === 'Reached Site' || trackingStatus === 'Delivered') && (
              <div className="space-y-4 pt-2">
                <div className="flex justify-between items-center border-b border-border pb-2">
                  <h4 className="text-xs font-bold text-text-primary uppercase tracking-wider flex items-center gap-1.5">
                    <FaMapMarkerAlt className="text-primary" />
                    Stops Delivery Handover &amp; Photo Proof
                  </h4>
                  <span className="text-[10px] text-text-muted bg-surface px-2.5 py-0.5 rounded border border-border/80 font-bold">
                    {selectedOrders.filter(o => !!orderDeliveryStatus[o.id]?.delivered).length} / {selectedOrders.length} Completed
                  </span>
                </div>

                {trackingStatus === 'Out for Delivery' && (
                  <div className="p-4 bg-warning/5 border border-warning/15 text-warning rounded-2xl flex items-center justify-between gap-4">
                    <div className="space-y-0.5">
                      <h4 className="text-xs font-bold">Transit in Progress</h4>
                      <p className="text-[10px] text-warning/80">Update status once the fleet operator reaches the site coordinates.</p>
                    </div>
                    <button
                      onClick={() => triggerWhatsAppUpdate('Reached Site')}
                      className="px-4 py-2 bg-warning text-bg-surface text-xs font-bold rounded-xl hover:brightness-105 active:scale-95 transition-all"
                    >
                      Mark: Reached Site
                    </button>
                  </div>
                )}

                <div className="space-y-3.5">
                  {selectedOrders.map(o => {
                    const status = orderDeliveryStatus[o.id] || { delivered: false, photo: "", otp: "" };
                    return (
                      <div key={o.id} className="p-4 bg-surface border border-border rounded-2xl space-y-3">
                        <div className="flex justify-between items-start">
                          <div>
                            <h5 className="font-extrabold text-xs text-text-primary">{o.partner}</h5>
                            <span className="text-[9px] font-mono text-text-muted uppercase tracking-wider">Order ID: {o.id.slice(-8)}</span>
                            <div className="flex items-center gap-1 mt-1 text-[10px] text-text-secondary">
                              <FaMapMarkerAlt size={9} className="text-primary shrink-0" />
                              <span>{o.address && o.address !== 'No street address' ? `${o.address}, ` : ''}{o.region}</span>
                            </div>
                          </div>
                          {status.delivered ? (
                            <span className="bg-success/10 text-success text-[9px] font-black px-2.5 py-1 rounded-lg uppercase tracking-wider flex items-center gap-1">
                              <FaCheckCircle /> Delivered
                            </span>
                          ) : (
                            <span className="bg-warning/10 text-warning text-[9px] font-black px-2.5 py-1 rounded-lg uppercase tracking-wider flex items-center gap-1">
                              Pending Handover
                            </span>
                          )}
                        </div>

                        {/* Handover action box */}
                        {!status.delivered && (
                          <div className="p-3 bg-bg border border-border/80 rounded-xl space-y-3.5 text-xs">
                            {trackingStatus === 'Reached Site' ? (
                              <>
                                {/* Handover Proof Photo */}
                                <div className="space-y-1">
                                  <label className="text-[10px] font-extrabold text-text-secondary uppercase tracking-wider flex items-center gap-1.5">
                                    <FaCamera size={10} className="text-primary" /> Handover Proof Photo
                                  </label>
                                  <input 
                                    type="file" 
                                    accept="image/*"
                                    className="text-[10px] text-text-secondary bg-surface border border-border rounded-lg p-1.5 focus:outline-none w-full"
                                    onChange={(e) => {
                                      const file = e.target.files[0];
                                      if (file) {
                                        const reader = new FileReader();
                                        reader.onloadend = () => {
                                          setOrderDeliveryStatus(prev => ({
                                            ...prev,
                                            [o.id]: { ...prev[o.id], photo: reader.result }
                                          }));
                                        };
                                        reader.readAsDataURL(file);
                                      }
                                    }}
                                  />
                                  {status.photo && (
                                    <div className="mt-2 flex items-center gap-2 bg-success/5 p-2 rounded-lg border border-success/15 w-fit">
                                      <img src={status.photo} alt="Proof" className="w-12 h-12 object-cover rounded border border-border" />
                                      <span className="text-[9px] text-success font-semibold">Photo Attached Successfully</span>
                                    </div>
                                  )}
                                </div>

                                {/* Verification OTP */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-end">
                                  <div className="space-y-1">
                                    <label className="text-[10px] font-extrabold text-text-secondary uppercase tracking-wider flex items-center gap-1.5">
                                      <FaKey size={10} className="text-primary" /> Handover OTP
                                    </label>
                                    <input
                                      type="text"
                                      placeholder="Enter OTP (Use '1234')"
                                      value={status.otp || ""}
                                      onChange={(e) => {
                                        const val = e.target.value;
                                        setOrderDeliveryStatus(prev => ({
                                          ...prev,
                                          [o.id]: { ...prev[o.id], otp: val }
                                        }));
                                      }}
                                      className="p-2 border border-border rounded-lg bg-surface text-text-primary text-xs outline-none focus:border-primary w-full font-semibold"
                                    />
                                  </div>
                                  <button
                                    onClick={() => handleDeliverSingleOrder(o.id, status.photo, status.otp)}
                                    className="px-4 py-2 bg-primary text-white text-xs font-bold rounded-lg hover:brightness-105 active:scale-95 transition-all w-full"
                                  >
                                    Verify & Complete Stop
                                  </button>
                                </div>
                              </>
                            ) : (
                              <div className="text-[10px] text-text-muted italic flex items-center gap-1.5">
                                <FaLightbulb size={10} className="text-warning shrink-0" />
                                Dispatch vehicle is in transit. Arrive at site location to enable customer OTP verification &amp; photo proof.
                              </div>
                            )}
                          </div>
                        )}

                        {/* Delivered proof thumbnail */}
                        {status.delivered && status.photo && (
                          <div className="flex items-center gap-3 bg-bg p-2 rounded-xl border border-border/60 w-fit mt-1">
                            <img src={status.photo} alt="Proof" className="w-12 h-12 object-cover rounded-lg border border-border" />
                            <div>
                              <span className="text-[10px] font-bold text-text-primary block">Delivery Receipt Proof</span>
                              <span className="text-[9px] text-text-muted">OTP Handover Verified</span>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* WhatsApp Logs */}
          <div className="card p-6 flex flex-col justify-between">
            <div>
              <h3 className="text-base font-bold text-text-primary flex items-center gap-2 border-b border-border pb-3">
                <FaWhatsapp className="text-success" />
                WhatsApp Notification log
              </h3>
              
              <div className="mt-4 space-y-3 max-h-[200px] overflow-y-auto pr-1">
                {whatsappLogs.map((log, idx) => (
                  <div key={idx} className="p-2 bg-success/5 border border-success/15 text-[10px] text-text-secondary rounded-lg font-mono">
                    {log}
                  </div>
                ))}
                {whatsappLogs.length === 0 && (
                  <span className="text-xs text-text-muted italic">Simulating delivery status updates will generate alerts logs...</span>
                )}
              </div>
            </div>

            <Button 
              variant="secondary"
              onClick={() => {
                setSelectedVehicle(null);
                setCreatedDelivery(null);
                setOtpVerification('');
                setOtpVerified(false);
                setTrackingStatus('At Warehouse');
                setWhatsappLogs([]);
                setActiveStep(1);
                loadSalesOrders();
              }}
            >
              Start New Batch Optimization
            </Button>
          </div>
        </div>
      )}
      </>
      )}

      {viewTab === "history" && (
        <div className="space-y-4">
          <div className="border-b border-border pb-3.5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
            <div>
              <h3 className="text-base font-black text-text-primary">Dispatch & Delivery Records</h3>
              <p className="text-xs text-text-secondary mt-0.5">View and monitor real-time statuses of currently active dispatches and completed deliveries.</p>
            </div>
            <span className="text-xs bg-primary/10 text-primary font-bold px-3 py-1 rounded-full border border-primary/20">
              Total Records: {orders.filter(o => !!o.tracking_status).length}
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-border text-text-muted">
                  <th className="pb-3 font-extrabold uppercase">Order & Kit details</th>
                  <th className="pb-3 font-extrabold uppercase">District Boundary</th>
                  <th className="pb-3 font-extrabold uppercase text-center">EPC & Customer Details</th>
                  <th className="pb-3 font-extrabold uppercase text-center">Load weight</th>
                  <th className="pb-3 font-extrabold uppercase text-center">Status</th>
                  <th className="pb-3 font-extrabold uppercase text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {orders.filter(o => !!o.tracking_status).map(o => (
                  <tr key={o.id} className="hover:bg-bg/40 transition-colors">
                    <td className="py-4 font-bold text-text-primary">
                      <div>{o.kitName || "Solar Combo Kit"}</div>
                      <span className="text-[10px] text-text-muted font-mono">{o.id}</span>
                    </td>
                    <td className="py-4 text-text-secondary">
                      <span className="flex items-center gap-1">
                        <FaMapMarkerAlt size={10} className="text-primary" />
                        {o.region}, {o.state} - {o.pincode}
                      </span>
                    </td>
                    <td className="py-4 text-center">
                      <div className="font-semibold text-text-primary">{o.partner}</div>
                      {o.phone && <div className="flex items-center justify-center gap-1 text-[10px] text-text-muted"><FaPhone size={8} />{o.phone}</div>}
                    </td>
                    <td className="py-4 text-center font-bold text-text-primary">
                      {o.weight} KG <span className="block text-[10px] text-text-muted font-normal">{o.kws} kW</span>
                    </td>
                    <td className="py-4 text-center">
                      <span className={`inline-block px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                        o.tracking_status === 'Delivered' 
                          ? 'bg-success/10 text-success border border-success/20' 
                          : 'bg-warning/10 text-warning border border-warning/20'
                      }`}>
                        {o.tracking_status}
                      </span>
                    </td>
                    <td className="py-4 text-right">
                      {o.tracking_status !== 'Delivered' ? (
                        <button
                          onClick={() => {
                            setCreatedDelivery({
                              deliveryId: `DLV-${Date.now().toString().slice(-6)}`,
                              orders: [o.id],
                              vehicle: "Tata Ace",
                              driver: "Active Driver",
                              driverContact: o.phone || "N/A",
                              totalWeight: o.weight,
                              totalKws: o.kws,
                              ewayBill: `EWB-${Math.floor(100000 + Math.random() * 900000)}`,
                            });
                            setOrderDeliveryStatus(prev => ({
                              ...prev,
                              [o.id]: prev[o.id] || { delivered: false, photo: "", otp: "" }
                            }));
                            setTrackingStatus(o.tracking_status);
                            setActiveStep(4);
                            setViewTab("scheduler");
                          }}
                          className="px-3 py-1.5 bg-primary hover:brightness-105 text-white text-[10px] font-bold rounded-lg transition-all"
                        >
                          Track Live Delivery
                        </button>
                      ) : (
                        <span className="text-[10px] text-success italic font-bold">Trip Completed</span>
                      )}
                    </td>
                  </tr>
                ))}
                {orders.filter(o => !!o.tracking_status).length === 0 && (
                  <tr>
                    <td colSpan="6" className="py-8 text-center text-text-muted italic bg-surface-hover/30">
                      No active dispatches or completed delivery records found. Select pending orders in Step 1 to plan trips.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
        </div> {/* close p-5 inner padding */}
      </div>  {/* close main card with tabs */}

      {/* PO Request Modal */}
      {poRequestModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs transition-all duration-300">
          <div className="bg-surface border border-border rounded-2xl w-full max-w-lg shadow-2xl p-6 relative overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <button 
              onClick={() => setPoRequestModalOpen(false)}
              className="absolute top-4 right-4 text-text-secondary hover:text-text-primary bg-bg hover:bg-border/30 w-8 h-8 rounded-full flex items-center justify-center transition-all cursor-pointer"
            >
              <FiX size={16} />
            </button>

            <h3 className="text-lg font-black text-text-primary flex items-center gap-2 border-b border-border pb-3.5">
              <FaBoxes className="text-primary" />
              Order Components Shortage Details
            </h3>

            <p className="text-xs text-text-secondary mt-2">
              The following components for Order <strong className="text-primary font-mono">{poRequestOrderId}</strong> are out of stock. Click <strong>Focus & Raise PO</strong> to view all allocation details and submit procurement requests.
            </p>

            <div className="my-4 space-y-3.5 max-h-[300px] overflow-y-auto pr-1">
              {poRequestItems.map(item => (
                <div key={item.sku_id} className="p-3 bg-bg rounded-xl border border-border/80 flex flex-col gap-2">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-extrabold text-xs text-text-primary">{item.product_name}</h4>
                      <span className="text-[10px] text-text-muted font-mono">{item.sku_code}</span>
                    </div>
                    <Button 
                      variant="primary" 
                      size="sm"
                      onClick={() => {
                        navigate(`/material-inward?focus_sku=${item.sku_id}`);
                        setPoRequestModalOpen(false);
                      }}
                    >
                      Focus & Raise PO
                    </Button>
                  </div>
                  <div className="grid grid-cols-4 gap-2 text-[10px] font-bold text-text-secondary border-t border-border/40 pt-2">
                    <div>
                      <span className="text-text-muted block font-semibold">Required</span>
                      <span>{item.required_qty} pcs</span>
                    </div>
                    <div>
                      <span className="text-text-muted block font-semibold">Allocated</span>
                      <span className="text-success">{item.allocated_qty} pcs</span>
                    </div>
                    <div>
                      <span className="text-text-muted block font-semibold">Shortage</span>
                      <span className="text-danger">{item.pending_qty} pcs</span>
                    </div>
                    <div>
                      <span className="text-text-muted block font-semibold">In-Stock</span>
                      <span>{item.current_stock} pcs</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex gap-3 justify-end pt-4 border-t border-border mt-5">
              <Button 
                variant="secondary" 
                onClick={() => setPoRequestModalOpen(false)}
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* STICKER LABEL POPUP MODAL */}
      {activeLabelProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm transition-all duration-300">
          <div className="bg-surface border border-border rounded-2xl w-full max-w-lg shadow-2xl relative overflow-hidden" style={{animation: 'fadeInScale 0.18s ease'}}>
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-bg">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-primary/10 rounded-xl flex items-center justify-center text-primary">
                  <FaTag size={16} />
                </div>
                <div>
                  <h3 className="text-sm font-black text-text-primary">Dispatch Packing Sticker</h3>
                  <p className="text-[10px] text-text-muted">Print and affix this label on the product package</p>
                </div>
              </div>
              <button
                onClick={() => setActiveLabelProduct(null)}
                className="w-8 h-8 rounded-full bg-border/30 hover:bg-border/60 flex items-center justify-center text-text-secondary hover:text-text-primary transition-all cursor-pointer"
              >
                <FiX size={15} />
              </button>
            </div>

            {/* Sticker Print Area */}
            <div className="p-6">
              <div className="border-2 border-dashed border-border bg-bg rounded-2xl overflow-hidden">
                {/* Sticker Header Band */}
                <div className="bg-primary px-5 py-3 flex items-center justify-between">
                  <div>
                    <span className="text-[11px] text-white/70 uppercase tracking-widest font-bold block">SOLARKITS SOLAR</span>
                    <span className="text-[9px] text-white/50">Authorized Delivery Label</span>
                  </div>
                  <FaShippingFast size={20} className="text-white/60" />
                </div>

                <div className="p-5 space-y-4">
                  {/* EPC Partner */}
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-1.5">
                      <FaBuilding size={10} className="text-text-muted" />
                      <span className="text-[9px] uppercase tracking-widest font-black text-text-muted">EPC Partner</span>
                    </div>
                    <div className="bg-surface border border-border/60 rounded-xl p-3">
                      <p className="text-xs font-black text-text-primary">
                        {activeLabelProduct.order?.epc_company?.name || activeLabelProduct.order?.epc_account?.name || activeLabelProduct.order?.partner || 'Solar EPC Partner'}
                      </p>
                      {activeLabelProduct.order?.email && (
                        <div className="flex items-center gap-1.5 mt-1">
                          <FaEnvelope size={9} className="text-text-muted" />
                          <p className="text-[10px] text-text-secondary">{activeLabelProduct.order.email}</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Delivery Receiver */}
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-1.5">
                      <FaMapMarkerAlt size={10} className="text-text-muted" />
                      <span className="text-[9px] uppercase tracking-widest font-black text-text-muted">Delivery Receiver</span>
                    </div>
                    <div className="bg-surface border border-border/60 rounded-xl p-3 space-y-1.5">
                      <div className="flex items-center gap-2">
                        <FaUser size={9} className="text-text-muted shrink-0" />
                        <p className="text-xs font-black text-text-primary">{activeLabelProduct.order?.partner}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <FaPhone size={9} className="text-text-muted shrink-0" />
                        <p className="text-[10px] text-text-secondary">{activeLabelProduct.order?.phone}</p>
                      </div>
                      <div className="flex items-start gap-2">
                        <FaMapMarkerAlt size={9} className="text-text-muted shrink-0 mt-0.5" />
                        <p className="text-[10px] text-text-secondary leading-relaxed">
                          {activeLabelProduct.order?.address && activeLabelProduct.order.address !== 'No street address'
                            ? `${activeLabelProduct.order.address}, ` : ''}
                          {activeLabelProduct.order?.region}, {activeLabelProduct.order?.state} — {activeLabelProduct.order?.pincode}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Product */}
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-1.5">
                      <FaBox size={10} className="text-text-muted" />
                      <span className="text-[9px] uppercase tracking-widest font-black text-text-muted">Product</span>
                    </div>
                    <div className="bg-primary/5 border border-primary/20 rounded-xl p-3 flex items-center justify-between">
                      <div>
                        <p className="text-xs font-black text-primary">{activeLabelProduct.item.product_name}</p>
                        <div className="flex items-center gap-1.5 mt-1">
                          <FaBarcode size={10} className="text-text-muted" />
                          <span className="text-[9px] text-text-muted font-mono">{activeLabelProduct.item.sku_code}</span>
                        </div>
                      </div>
                      <span className="text-sm font-black text-primary bg-primary/10 px-3 py-1.5 rounded-lg">×{activeLabelProduct.item.qty}</span>
                    </div>
                  </div>

                  {/* Barcode Strip */}
                  <div className="flex flex-col items-center gap-2 pt-1">
                    <div className="w-full h-10 bg-text-primary rounded flex items-center justify-center overflow-hidden px-2">
                      <div className="flex items-end gap-px h-7">
                        {Array.from({ length: 48 }, (_, i) => (
                          <div
                            key={i}
                            className="bg-surface/90"
                            style={{
                              width: i % 3 === 0 ? '3px' : '1.5px',
                              height: `${50 + Math.sin(i * 1.3) * 20}%`
                            }}
                          />
                        ))}
                      </div>
                    </div>
                    <span className="text-[8px] text-text-muted tracking-widest font-mono uppercase">
                      REF: {activeLabelProduct.order?.id?.slice(-10) || 'PKG-XXXXXXXX'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="px-6 pb-5 flex gap-3 justify-end border-t border-border pt-4">
              <Button variant="secondary" onClick={() => setActiveLabelProduct(null)}>
                Close
              </Button>
              <Button
                variant="primary"
                onClick={() => {
                  setLabeledItems(prev => ({ ...prev, [activeLabelProduct.item.id]: true }));
                  setActiveLabelProduct(null);
                }}
              >
                <FaPrint className="mr-2" size={12} />
                Print & Stick Label
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
