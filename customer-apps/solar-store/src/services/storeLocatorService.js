/**
 * storeLocatorService.js
 *
 * API client and local fallback provider for SOLARKITS Stores & Experience Centers.
 */

import axiosInstance from "@/utils/axiosInstance";

export const FALLBACK_STORES = [
  {
    id: "STORE-GJ-001",
    warehouse_code: "WH-IND-GJ-001",
    name: "Surya Solar Store — Ahmedabad",
    store_type: "EXPERIENCE_CENTER",
    address: "Plot No. 45, GIDC Industrial Estate, Sanand",
    city: "Ahmedabad",
    district: "Ahmedabad",
    state: "Gujarat",
    pincode: "382110",
    lat: 23.0225,
    lng: 72.5714,
    phone: "+91 79 4000 1201",
    email: "ahmedabad@solarkits.in",
    is_authorized: true,
    rating: 4.9,
    reviews_count: 142,
    images: [
      "https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=800&auto=format&fit=crop&q=80",
      "https://images.unsplash.com/photo-1553413077-190dd305871c?w=800&auto=format&fit=crop&q=80"
    ]
  },
  {
    id: "STORE-MH-001",
    warehouse_code: "WH-IND-MH-001",
    name: "Mahalaxmi Solar Solutions — Mumbai",
    store_type: "REGIONAL_WAREHOUSE",
    address: "Logistics Park, Unit 12B, Bhiwandi Industrial Area",
    city: "Mumbai",
    district: "Thane / Mumbai",
    state: "Maharashtra",
    pincode: "421302",
    lat: 19.2812,
    lng: 73.0483,
    phone: "+91 22 6100 8900",
    email: "mumbai@solarkits.in",
    is_authorized: true,
    rating: 4.8,
    reviews_count: 218,
    images: [
      "https://images.unsplash.com/photo-1578575437130-527eed3abbec?w=800&auto=format&fit=crop&q=80",
      "https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=800&auto=format&fit=crop&q=80"
    ]
  },
  {
    id: "STORE-DL-001",
    warehouse_code: "WH-IND-DL-001",
    name: "SunTech Solar Point — South Delhi",
    store_type: "SOLAR_LOUNGE",
    address: "B-214, Okhla Industrial Area Phase 3",
    city: "New Delhi",
    district: "South Delhi",
    state: "Delhi",
    pincode: "110020",
    lat: 28.5355,
    lng: 77.2610,
    phone: "+91 11 4500 7820",
    email: "delhi@solarkits.in",
    is_authorized: true,
    rating: 4.9,
    reviews_count: 185,
    images: [
      "https://images.unsplash.com/photo-1616401784845-180882ba9ba8?w=800&auto=format&fit=crop&q=80",
      "https://images.unsplash.com/photo-1509391365360-2e959784a276?w=800&auto=format&fit=crop&q=80"
    ]
  },
  {
    id: "STORE-KA-001",
    warehouse_code: "WH-IND-KA-001",
    name: "GreenEnergy Solar Mart — Bengaluru",
    store_type: "EXPERIENCE_CENTER",
    address: "No. 88, Peenya Industrial Area 2nd Stage",
    city: "Bengaluru",
    district: "Bengaluru Urban",
    state: "Karnataka",
    pincode: "560058",
    lat: 13.0285,
    lng: 77.5195,
    phone: "+91 80 4900 3344",
    email: "bengaluru@solarkits.in",
    is_authorized: true,
    rating: 4.9,
    reviews_count: 164,
    images: [
      "https://images.unsplash.com/photo-1587293852726-70cdb56c2866?w=800&auto=format&fit=crop&q=80",
      "https://images.unsplash.com/photo-1553413077-190dd305871c?w=800&auto=format&fit=crop&q=80"
    ]
  },
  {
    id: "STORE-RJ-001",
    warehouse_code: "WH-IND-RJ-001",
    name: "Vardhman Solar Store — Jaipur",
    store_type: "EPC_HUB",
    address: "Plot 14, RIICO Industrial Area, Sitapura",
    city: "Jaipur",
    district: "Jaipur",
    state: "Rajasthan",
    pincode: "302022",
    lat: 26.7824,
    lng: 75.8273,
    phone: "+91 141 277 8899",
    email: "jaipur@solarkits.in",
    is_authorized: true,
    rating: 4.8,
    reviews_count: 112,
    images: [
      "https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=800&auto=format&fit=crop&q=80",
      "https://images.unsplash.com/photo-1592833159155-c62df1b65634?w=800&auto=format&fit=crop&q=80"
    ]
  },
  {
    id: "STORE-MH-002",
    warehouse_code: "STORE-PUN-001",
    name: "Apex Solar Enterprises — Pune",
    store_type: "SOLAR_LOUNGE",
    address: "Showroom 4, Nyati Tech Park, Wadgaon Sheri, Nagar Road",
    city: "Pune",
    district: "Pune",
    state: "Maharashtra",
    pincode: "411014",
    lat: 18.5529,
    lng: 73.9248,
    phone: "+91 20 6700 4455",
    email: "pune@solarkits.in",
    is_authorized: true,
    rating: 4.9,
    reviews_count: 98,
    images: [
      "https://images.unsplash.com/photo-1545208942-e1c9c916524b?w=800&auto=format&fit=crop&q=80"
    ]
  },
  {
    id: "STORE-TG-001",
    warehouse_code: "STORE-HYD-001",
    name: "Deccan Solar Hub — Hyderabad",
    store_type: "EXPERIENCE_CENTER",
    address: "Survey No. 64, Financial District, Gachibowli",
    city: "Hyderabad",
    district: "Hyderabad / Rangareddy",
    state: "Telangana",
    pincode: "500032",
    lat: 17.4156,
    lng: 78.3498,
    phone: "+91 40 4800 2211",
    email: "hyderabad@solarkits.in",
    is_authorized: true,
    rating: 4.8,
    reviews_count: 125,
    images: [
      "https://images.unsplash.com/photo-1559302504-64aae6ca6b6d?w=800&auto=format&fit=crop&q=80"
    ]
  },
  {
    id: "STORE-TN-001",
    warehouse_code: "STORE-CHE-001",
    name: "Kaveri Solar Power — Chennai",
    store_type: "EXPERIENCE_CENTER",
    address: "Block 7, SIDCO Industrial Estate, Guindy",
    city: "Chennai",
    district: "Chennai",
    state: "Tamil Nadu",
    pincode: "600032",
    lat: 13.0067,
    lng: 80.2024,
    phone: "+91 44 4300 5566",
    email: "chennai@solarkits.in",
    is_authorized: true,
    rating: 4.7,
    reviews_count: 104,
    images: [
      "https://images.unsplash.com/photo-1508873696983-2df5293cb32b?w=800&auto=format&fit=crop&q=80"
    ]
  }
];

export const calculateDistanceKm = (lat1, lon1, lat2, lon2) => {
  if (!lat1 || !lon1 || !lat2 || !lon2) return null;
  const R = 6371;
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 10) / 10;
};

export const fetchNearbyStores = async (params = {}) => {
  try {
    const res = await axiosInstance.get("/india/v1/shop/stores", { params });
    if (res.data?.success || res.data?.status === "success") {
      return res.data.data || [];
    }
  } catch (err) {
    console.warn("Using local fallback stores dataset:", err.message);
  }

  // Local filtering if backend is unreachable
  let list = [...FALLBACK_STORES];
  const { search, state, city, pincode, store_type, lat, lng } = params;

  if (search) {
    const q = search.toLowerCase();
    list = list.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        s.city.toLowerCase().includes(q) ||
        s.state.toLowerCase().includes(q) ||
        s.pincode.includes(q)
    );
  }
  if (state && state !== "ALL") {
    list = list.filter((s) => s.state.toLowerCase() === state.toLowerCase());
  }
  if (city) {
    list = list.filter((s) => s.city.toLowerCase().includes(city.toLowerCase()));
  }
  if (pincode) {
    list = list.filter((s) => s.pincode.startsWith(pincode.slice(0, 3)));
  }
  if (store_type && store_type !== "ALL") {
    list = list.filter((s) => s.store_type === store_type);
  }
  if (lat && lng) {
    list = list.map((s) => ({
      ...s,
      distance_km: calculateDistanceKm(parseFloat(lat), parseFloat(lng), s.lat, s.lng),
    }));
    list.sort((a, b) => (a.distance_km || 99999) - (b.distance_km || 99999));
  }

  return list;
};
