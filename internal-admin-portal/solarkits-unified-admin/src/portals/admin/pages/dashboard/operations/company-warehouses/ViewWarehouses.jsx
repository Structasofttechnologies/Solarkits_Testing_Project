import { useEffect, useState, useMemo, useRef, useCallback } from "react";
import axios from "axios";
import * as d3Geo from "d3-geo";
import { authHeaderObj } from "@/app/authHeader";
import { useDispatch } from "react-redux";
import { setAlert } from "@/features/alert.slice";
import CardImageSlider from "@/components/CardImageSlider";
import DropdownWithSearchInput from "@/components/DropdownWithSearchInput";
import MultiSelectDropdown from "@/components/MultiSelectDropdown";
import ToggleButton from "@/components/ToggleButton";
import Loader from "@/components/Loader";
import PageHeader from "@/components/PageHeader";
import Dialog from "@/components/Dialog";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";

import {
  FiArchive,
  FiRefreshCw,
  FiXCircle,
  FiEye,
  FiMap,
  FiEdit2,
  FiPlus,
  FiClock,
  FiAlertCircle,
  FiFileText,
  FiCheck,
  FiCheckCircle,
  FiMapPin,
  FiGlobe,
  FiNavigation,
  FiSearch,
  FiStar,
  FiGitBranch,
  FiSliders,
  FiChevronDown,
  FiChevronUp,
  FiChevronRight,
  FiHome,
  FiTruck,
  FiPackage,
  FiDollarSign,
  FiLayers,
  FiAlertTriangle,
  FiActivity,
  FiCheckSquare,
  FiPauseCircle,
  FiPlayCircle,
  FiShield,
  FiZoomIn,
  FiZoomOut,
  FiX,
  FiInfo,
  FiExternalLink
} from "react-icons/fi";
import { FaTimes, FaRupeeSign } from "react-icons/fa";
import Button from "@/components/Button";
import IconButton from "@/components/IconButton";
import RenderIfPermission, { useHasPermission } from "@/components/PermissionCheck";
import ConfirmationPopup from "@/components/ConfirmationPopup";

import CompanyActivationModal from "./components/CompanyActivationModal";
import ThreePLInspectionModal from "./components/ThreePLInspectionModal";
import ThreePLCommercialsModal from "./components/ThreePLCommercialsModal";
import ThreePLVendorManagementModal from "./components/ThreePLVendorManagementModal";
import WarehouseMapSection from "./components/WarehouseMapSection";

// ── Curated High-Contrast Auto-Color Palette for Warehouses ──────────────────
const WAREHOUSE_COLOR_PALETTE = [
  { fill: "#059669", border: "#047857", soft: "rgba(5, 150, 105, 0.20)", badgeBg: "#d1fae5", text: "#065f46", name: "Emerald" },
  { fill: "#2563eb", border: "#1d4ed8", soft: "rgba(37, 99, 235, 0.20)", badgeBg: "#dbeafe", text: "#1e40af", name: "Sapphire" },
  { fill: "#7c3aed", border: "#6d28d9", soft: "rgba(124, 58, 237, 0.20)", badgeBg: "#ede9fe", text: "#5b21b6", name: "Royal Purple" },
  { fill: "#ea580c", border: "#c2410c", soft: "rgba(234, 88, 12, 0.20)", badgeBg: "#ffedd5", text: "#9a3412", name: "Sunburst Orange" },
  { fill: "#0891b2", border: "#0e7490", soft: "rgba(8, 145, 178, 0.20)", badgeBg: "#cffafe", text: "#155e75", name: "Electric Cyan" },
  { fill: "#db2777", border: "#be185d", soft: "rgba(219, 39, 119, 0.20)", badgeBg: "#fce7f3", text: "#9d174d", name: "Ruby Pink" },
  { fill: "#0d9488", border: "#0f766e", soft: "rgba(13, 148, 136, 0.20)", badgeBg: "#ccfbf1", text: "#115e59", name: "Deep Teal" },
  { fill: "#d97706", border: "#b45309", soft: "rgba(217, 119, 6, 0.20)", badgeBg: "#fef3c7", text: "#92400e", name: "Amber Gold" },
  { fill: "#4f46e5", border: "#4338ca", soft: "rgba(79, 70, 229, 0.20)", badgeBg: "#e0e7ff", text: "#3730a3", name: "Indigo" },
  { fill: "#e11d48", border: "#be123c", soft: "rgba(225, 29, 72, 0.20)", badgeBg: "#ffe4e6", text: "#9f1239", name: "Crimson" },
  { fill: "#65a30d", border: "#4d7c0f", soft: "rgba(101, 163, 13, 0.20)", badgeBg: "#ecfccb", text: "#3f6212", name: "Lime" },
  { fill: "#0284c7", border: "#0369a1", soft: "rgba(2, 132, 199, 0.20)", badgeBg: "#e0f2fe", text: "#075985", name: "Cerulean" }
];

// ── State Codes & Geographic Centers for India Vector Map ────────────────────
const INDIA_STATE_META = {
  "Gujarat": { code: "GJ", center: [71.577, 22.7] },
  "Maharashtra": { code: "MH", center: [76.094, 19.455] },
  "Madhya Pradesh": { code: "MP", center: [78.284, 23.541] },
  "Rajasthan": { code: "RJ", center: [73.852, 26.578] },
  "Uttar Pradesh": { code: "UP", center: [80.591, 26.922] },
  "Karnataka": { code: "KA", center: [76.168, 14.7] },
  "Tamil Nadu": { code: "TN", center: [78.406, 11.011] },
  "Kerala": { code: "KL", center: [76.412, 10.449] },
  "Telangana": { code: "TG", center: [79.007, 17.798] },
  "Andhra Pradesh": { code: "AP", center: [79.942, 15.753] },
  "Odisha": { code: "OD", center: [84.42, 20.511] },
  "Chhattisgarh": { code: "CG", center: [82.029, 21.254] },
  "West Bengal": { code: "WB", center: [87.961, 23.82] },
  "Bihar": { code: "BR", center: [85.607, 25.68] },
  "Jharkhand": { code: "JH", center: [85.552, 23.655] },
  "Punjab": { code: "PB", center: [75.416, 30.841] },
  "Haryana": { code: "HR", center: [76.346, 29.196] },
  "Himachal Pradesh": { code: "HP", center: [77.249, 31.924] },
  "Uttarakhand": { code: "UK", center: [79.214, 30.156] },
  "Jammu and Kashmir": { code: "JK", center: [74.86, 33.643] },
  "Ladakh": { code: "LA", center: [76.807, 34.946] },
  "Assam": { code: "AS", center: [92.82, 26.359] },
  "Arunachal Pradesh": { code: "AR", center: [94.668, 28.043] },
  "Meghalaya": { code: "ML", center: [91.277, 25.54] },
  "Manipur": { code: "MN", center: [93.872, 24.73] },
  "Mizoram": { code: "MZ", center: [92.832, 23.31] },
  "Nagaland": { code: "NL", center: [94.464, 26.06] },
  "Tripura": { code: "TR", center: [91.747, 23.754] },
  "Sikkim": { code: "SK", center: [88.474, 27.565] },
  "Goa": { code: "GA", center: [74.058, 15.364] },
  "Delhi": { code: "DL", center: [77.114, 28.645] },
  "Chandigarh": { code: "CH", center: [76.779, 30.725] },
  "Andaman and Nicobar Islands": { code: "AN", center: [92.954, 11.289] },
  "Lakshadweep": { code: "LD", center: [73.038, 8.271] },
  "Puducherry": { code: "PY", center: [79.877, 11.643] },
  "Dadra and Nagar Haveli and Daman and Diu": { code: "DN", center: [72.982, 20.235] }
};

// Bidirectional synonyms between DB seed district names and India GeoJSON district names
const DISTRICT_SYNONYMS = {
  mumbai: ["mumbaicity", "mumbaisuburban"],
  mumbaicity: ["mumbai"],
  mumbaisuburban: ["mumbai"],
  aurangabad: ["chhatrapatisambhajinagar"],
  chhatrapatisambhajinagar: ["aurangabad"],
  osmanabad: ["dharashiv"],
  dharashiv: ["osmanabad"],
  ahmednagar: ["ahilyanagar", "ahmadnagar"],
  ahilyanagar: ["ahmednagar", "ahmadnagar"],
  ahmadnagar: ["ahmednagar", "ahilyanagar"],
  gondia: ["gondiya"],
  gondiya: ["gondia"],
  bhadohi: ["santravidasnagar"],
  santravidasnagar: ["bhadohi"],
  banaskantha: ["vavtharad"],
  vavtharad: ["banaskantha"],
  kutch: ["kachchh"],
  kachchh: ["kutch"],
  panchmahal: ["panchmahals"],
  panchmahals: ["panchmahal"],
  prayagraj: ["allahabad"],
  allahabad: ["prayagraj"],
  ayodhya: ["faizabad"],
  faizabad: ["ayodhya"],
  shivamogga: ["shimoga"],
  shimoga: ["shivamogga"],
  chamarajanagara: ["chamarajanagar"],
  chamarajanagar: ["chamarajanagara"]
};

const normalizeText = (val) => (val || "").toString().trim().toLowerCase();

const cleanGeoKey = (val) =>
  (val || "")
    .toString()
    .toLowerCase()
    .replace(/\bdistrict\b/g, "")
    .replace(/bhoomi/g, "bhumi")
    .replace(/[^a-z0-9]/g, "");

const expandDistrictKeys = (stateName, districtName) => {
  const sClean = cleanGeoKey(stateName);
  const dClean = cleanGeoKey(districtName);
  if (!dClean) return [];
  const variants = new Set([dClean, ...(DISTRICT_SYNONYMS[dClean] || [])]);
  const keys = [];
  variants.forEach((v) => {
    if (sClean) keys.push(`${sClean}__${v}`);
    keys.push(v);
  });
  return keys;
};

const getWarehouseColorTheme = (warehouse, index = 0) => {
  if (typeof index === "number" && index >= 0) {
    return WAREHOUSE_COLOR_PALETTE[index % WAREHOUSE_COLOR_PALETTE.length];
  }
  const str = String(warehouse?.warehouse_code || warehouse?.id || "WH");
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return WAREHOUSE_COLOR_PALETTE[Math.abs(hash) % WAREHOUSE_COLOR_PALETTE.length];
};

/**
 * Computes live state, active/inactive cluster, and district coverage for a warehouse
 * from Order Management Cluster Routing mappings and live state cluster catalog.
 */
const buildWarehouseCoverage = (warehouse, routingMappings, stateClustersCatalog) => {
  const whId = String(warehouse?.id || warehouse?._id || "");
  const whCode = (warehouse?.warehouse_code || "").trim().toUpperCase();

  // 1. Match active mappings from ClusterWarehouseRouting (/solarshop/cluster-routing/mappings)
  let matchedMappings = (routingMappings || []).filter((m) => {
    const isMappingActive = (m.status || "Active").toLowerCase() === "active";
    if (!isMappingActive) return false;
    const mWhId = m.warehouse_id ? String(m.warehouse_id) : "";
    const mWhCode = (m.warehouse_code || "").trim().toUpperCase();
    return (whId && mWhId === whId) || (whCode && mWhCode === whCode);
  });

  // Fallback to embedded routing_mapping on warehouse doc (if /cluster-routing was unavailable)
  if (matchedMappings.length === 0 && warehouse?.routing_mapping) {
    const embedded = warehouse.routing_mapping;
    if ((embedded.status || "Active").toLowerCase() === "active") {
      matchedMappings = [embedded];
    }
  }

  // 2. Collect assigned state names (deduplicated preserving clean label)
  const assignedStateMap = new Map();
  const addStateName = (raw) => {
    const label = (raw || "").toString().trim();
    if (!label) return;
    const key = normalizeText(label);
    if (!assignedStateMap.has(key)) assignedStateMap.set(key, label);
  };

  matchedMappings.forEach((m) => {
    (m.states || []).forEach(addStateName);
  });
  if (assignedStateMap.size === 0 && Array.isArray(warehouse?.fulfillment_states)) {
    warehouse.fulfillment_states.forEach(addStateName);
  }

  // 3. Collect active cluster IDs and snapshot fallback metadata from mappings
  const activeClusterIdSet = new Set();
  const snapshotClusterById = new Map();
  const recordClusterSnapshot = (fc) => {
    const cid = String(fc?.cluster_id || fc?.id || fc?._id || "");
    if (!cid) return;
    activeClusterIdSet.add(cid);
    if (!snapshotClusterById.has(cid)) {
      snapshotClusterById.set(cid, {
        cluster_id: cid,
        cluster_code: fc.cluster_code || "",
        cluster_name: fc.cluster_name || "Cluster",
        state_name: fc.state_name || "",
        district_names: Array.isArray(fc.district_names) ? fc.district_names : []
      });
    }
  };

  matchedMappings.forEach((m) => {
    (m.franchise_cluster_ids || []).forEach((id) => {
      if (id) activeClusterIdSet.add(String(id));
    });
    (m.franchise_clusters || []).forEach(recordClusterSnapshot);
  });

  if (matchedMappings.length === 0) {
    (warehouse?.franchise_cluster_ids || []).forEach((id) => {
      if (id) activeClusterIdSet.add(String(id));
    });
    (warehouse?.franchise_clusters || []).forEach(recordClusterSnapshot);
  }

  // Ensure any state referenced by an active cluster is also represented
  snapshotClusterById.forEach((fc) => {
    if (fc.state_name) addStateName(fc.state_name);
  });

  // 4. Build per-state active vs inactive clusters and covered districts
  const stateBreakdowns = [];
  const allActiveClusters = [];
  const allInactiveClusters = [];
  const coveredDistrictKeySet = new Set();
  const allCoveredDistricts = [];

  assignedStateMap.forEach((stateLabel, stateKey) => {
    const catalogClusters = stateClustersCatalog.get(stateKey) || [];
    const mergedClustersMap = new Map();

    catalogClusters.forEach((cl) => {
      const cid = String(cl.cluster_id || cl.id || cl._id || "");
      if (!cid) return;
      mergedClustersMap.set(cid, {
        cluster_id: cid,
        cluster_code: cl.cluster_code || "",
        cluster_name: cl.cluster_name || "Cluster",
        state_name: cl.state_name || stateLabel,
        district_names: Array.isArray(cl.district_names) ? cl.district_names : [],
        status: cl.status || "available",
        color_code: cl.color_code || null
      });
    });

    // Ensure any snapshot cluster for this state is included even if not in catalog
    snapshotClusterById.forEach((snap, cid) => {
      if (normalizeText(snap.state_name) === stateKey && !mergedClustersMap.has(cid)) {
        mergedClustersMap.set(cid, snap);
      }
    });

    const activeInState = [];
    const inactiveInState = [];
    const stateDistrictMap = new Map();

    mergedClustersMap.forEach((cl, cid) => {
      const isClusterActiveForWh = activeClusterIdSet.has(cid);
      if (isClusterActiveForWh) {
        activeInState.push(cl);
        allActiveClusters.push(cl);
        (cl.district_names || []).forEach((dName) => {
          const cleanD = (dName || "").toString().trim();
          if (!cleanD) return;
          const dKey = cleanGeoKey(cleanD);
          if (!stateDistrictMap.has(dKey)) {
            stateDistrictMap.set(dKey, cleanD);
          }
          const globalKey = `${stateKey}__${dKey}`;
          if (!coveredDistrictKeySet.has(globalKey)) {
            coveredDistrictKeySet.add(globalKey);
            allCoveredDistricts.push({ stateName: stateLabel, districtName: cleanD });
          }
        });
      } else {
        inactiveInState.push(cl);
        allInactiveClusters.push(cl);
      }
    });

    const stateDistricts = Array.from(stateDistrictMap.values());
    const totalInState = mergedClustersMap.size;

    stateBreakdowns.push({
      stateName: stateLabel,
      totalClustersInState: totalInState,
      activeClusters: activeInState,
      inactiveClusters: inactiveInState,
      activeCount: activeInState.length,
      inactiveCount: inactiveInState.length,
      coveredDistricts: stateDistricts,
      districtCount: stateDistricts.length,
      isFullStateCoverage: totalInState === 0
    });
  });

  const assignedStates = Array.from(assignedStateMap.values());
  const totalClustersInAssignedStates = stateBreakdowns.reduce(
    (sum, s) => sum + s.totalClustersInState,
    0
  );

  return {
    assignedStates,
    assignedStatesCount: assignedStates.length,
    activeClusters: allActiveClusters,
    activeClustersCount: allActiveClusters.length,
    inactiveClusters: allInactiveClusters,
    inactiveClustersCount: allInactiveClusters.length,
    totalClustersInAssignedStates,
    coveredDistricts: allCoveredDistricts,
    coveredDistrictsCount: allCoveredDistricts.length,
    stateBreakdowns,
    isMapped: assignedStates.length > 0 || allActiveClusters.length > 0
  };
};

const CircleProgressBar = ({ percentage, size = 44, strokeWidth = 4 }) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (percentage / 100) * circumference;

  return (
    <div className="relative flex items-center justify-center shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="transform -rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          className="stroke-border/40 dark:stroke-border/20"
          strokeWidth={strokeWidth}
          fill="transparent"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          className="stroke-primary transition-all duration-500 ease-out"
          strokeWidth={strokeWidth}
          fill="transparent"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
        />
      </svg>
      <span className="absolute text-[10px] font-black text-text-primary">{percentage}%</span>
    </div>
  );
};

// ── Interactive India Warehouse & Cluster Territory Coverage Map ─────────────
const WarehouseIndiaCoverageMap = ({
  warehouses = [],
  warehouseCoverageMap,
  warehouseColorMap,
  geoData,
  loadingGeo,
  geoError,
  onRetryGeo,
  onOpenCoverageModal,
  onNavigateEdit,
  initialSelectedWarehouseId = null,
  onCloseMap
}) => {
  const containerRef = useRef(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [mapFilter, setMapFilter] = useState("all"); // 'all' | 'active' | 'mapped'
  const [selectedWhId, setSelectedWhId] = useState(initialSelectedWarehouseId);
  const [hoverInfo, setHoverInfo] = useState(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });

  const width = 800;
  const height = 900;

  useEffect(() => {
    if (initialSelectedWarehouseId) {
      setSelectedWhId(initialSelectedWarehouseId);
    }
  }, [initialSelectedWarehouseId]);

  const visibleWarehouses = useMemo(() => {
    return warehouses.filter((w) => {
      const wId = String(w.id || w._id);
      const cov = warehouseCoverageMap.get(wId);
      if (mapFilter === "active") return Boolean(w.is_active);
      if (mapFilter === "mapped") return Boolean(cov?.isMapped);
      return true;
    });
  }, [warehouses, warehouseCoverageMap, mapFilter]);

  const { districtFeatures, stateBoundaries } = useMemo(() => {
    if (!geoData?.features) return { districtFeatures: [], stateBoundaries: [] };
    const dFeatures = [];
    const sBoundaries = [];
    for (const f of geoData.features) {
      if (f.properties?.district && f.properties.district.trim()) {
        dFeatures.push(f);
      } else {
        sBoundaries.push(f);
      }
    }
    return { districtFeatures: dFeatures, stateBoundaries: sBoundaries };
  }, [geoData]);

  const { projection, pathGenerator } = useMemo(() => {
    if (!geoData) return { projection: null, pathGenerator: null };
    const proj = d3Geo
      .geoMercator()
      .center([82.5, 22.5])
      .scale(1200)
      .translate([width / 2, height / 2]);
    const pathGen = d3Geo.geoPath().projection(proj);
    return { projection: proj, pathGenerator: pathGen };
  }, [geoData]);

  // Index district -> warehouse active/inactive cluster assignments + state-wide fallback
  const { districtIndex, stateFullIndex, districtCentroidIndex } = useMemo(() => {
    const dMap = new Map();
    const sFullMap = new Map();
    const centroidMap = new Map();

    if (pathGenerator && districtFeatures.length > 0) {
      districtFeatures.forEach((feat) => {
        const dName = feat.properties?.district || "";
        const sName = feat.properties?.st_nm || "";
        try {
          const pt = pathGenerator.centroid(feat);
          if (pt && !isNaN(pt[0]) && !isNaN(pt[1])) {
            expandDistrictKeys(sName, dName).forEach((k) => {
              if (!centroidMap.has(k)) centroidMap.set(k, pt);
            });
          }
        } catch {
          // ignore invalid geometry
        }
      });
    }

    const pushEntry = (map, key, entry) => {
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(entry);
    };

    visibleWarehouses.forEach((w) => {
      const wId = String(w.id || w._id);
      const cov = warehouseCoverageMap.get(wId);
      const theme = warehouseColorMap.get(wId) || WAREHOUSE_COLOR_PALETTE[0];
      if (!cov) return;

      (cov.stateBreakdowns || []).forEach((stBreakdown) => {
        if (stBreakdown.isFullStateCoverage) {
          const sKey = cleanGeoKey(stBreakdown.stateName);
          if (sKey) {
            pushEntry(sFullMap, sKey, { warehouse: w, coverage: cov, stateBreakdown: stBreakdown, theme });
          }
        }

        (stBreakdown.activeClusters || []).forEach((cl) => {
          (cl.district_names || []).forEach((dName) => {
            expandDistrictKeys(stBreakdown.stateName, dName).forEach((k) => {
              pushEntry(dMap, k, {
                warehouse: w,
                coverage: cov,
                cluster: cl,
                stateBreakdown: stBreakdown,
                theme,
                isActiveCluster: true
              });
            });
          });
        });

        (stBreakdown.inactiveClusters || []).forEach((cl) => {
          (cl.district_names || []).forEach((dName) => {
            expandDistrictKeys(stBreakdown.stateName, dName).forEach((k) => {
              pushEntry(dMap, k, {
                warehouse: w,
                coverage: cov,
                cluster: cl,
                stateBreakdown: stBreakdown,
                theme,
                isActiveCluster: false
              });
            });
          });
        });
      });
    });

    return { districtIndex: dMap, stateFullIndex: sFullMap, districtCentroidIndex: centroidMap };
  }, [visibleWarehouses, warehouseCoverageMap, warehouseColorMap, pathGenerator, districtFeatures]);

  const getDistrictEntries = useCallback(
    (feature) => {
      const dName = feature?.properties?.district || "";
      const sName = feature?.properties?.st_nm || "";
      const sClean = cleanGeoKey(sName);
      const dClean = cleanGeoKey(dName);

      const rawMatches =
        districtIndex.get(`${sClean}__${dClean}`) ||
        districtIndex.get(dClean) ||
        [];

      // Deduplicate by warehouse_id + cluster_id
      const seen = new Set();
      const uniqueMatches = [];
      rawMatches.forEach((item) => {
        const key = `${item.warehouse.id || item.warehouse._id}__${item.cluster?.cluster_id || ""}__${item.isActiveCluster}`;
        if (!seen.has(key)) {
          seen.add(key);
          uniqueMatches.push(item);
        }
      });

      const activeEntries = uniqueMatches.filter((m) => m.isActiveCluster);
      const inactiveEntries = uniqueMatches.filter((m) => !m.isActiveCluster);
      const stateOnlyEntries = sFullMapLookup(stateFullIndex, sClean);

      return { activeEntries, inactiveEntries, stateOnlyEntries };
    },
    [districtIndex, stateFullIndex]
  );

  // Compute SVG coordinates for each visible warehouse hub marker
  const warehouseMarkers = useMemo(() => {
    if (!projection) return [];
    const coordOffsetCounts = new Map();

    return visibleWarehouses
      .map((w) => {
        const wId = String(w.id || w._id);
        const cov = warehouseCoverageMap.get(wId);
        const theme = warehouseColorMap.get(wId) || WAREHOUSE_COLOR_PALETTE[0];

        let coords = null;
        const lat = parseFloat(w.lat);
        const lng = parseFloat(w.lng);
        if (!isNaN(lat) && !isNaN(lng) && (lat !== 0 || lng !== 0)) {
          const p = projection([lng, lat]);
          if (p && !isNaN(p[0]) && !isNaN(p[1])) coords = p;
        }

        if (!coords && w.district && w.state) {
          const keys = expandDistrictKeys(w.state, w.district);
          for (const k of keys) {
            if (districtCentroidIndex.has(k)) {
              coords = districtCentroidIndex.get(k);
              break;
            }
          }
        }

        if (!coords && w.state) {
          const stateMetaEntry = Object.entries(INDIA_STATE_META).find(
            ([stName]) => cleanGeoKey(stName) === cleanGeoKey(w.state)
          );
          if (stateMetaEntry) {
            coords = projection(stateMetaEntry[1].center);
          }
        }

        if (!coords) return null;

        // Slight spiral offset if two hubs share exact location
        const bucket = `${Math.round(coords[0])}_${Math.round(coords[1])}`;
        const occ = coordOffsetCounts.get(bucket) || 0;
        coordOffsetCounts.set(bucket, occ + 1);
        const offsetX = occ === 0 ? 0 : Math.cos(occ * 2.1) * 10;
        const offsetY = occ === 0 ? 0 : Math.sin(occ * 2.1) * 10;

        return {
          warehouse: w,
          coverage: cov,
          theme,
          x: coords[0] + offsetX,
          y: coords[1] + offsetY
        };
      })
      .filter(Boolean);
  }, [visibleWarehouses, warehouseCoverageMap, warehouseColorMap, projection, districtCentroidIndex]);

  const selectedWarehouse = useMemo(
    () => warehouses.find((w) => String(w.id || w._id) === String(selectedWhId)) || null,
    [warehouses, selectedWhId]
  );

  const selectedCoverage = selectedWarehouse
    ? warehouseCoverageMap.get(String(selectedWarehouse.id || selectedWarehouse._id))
    : null;
  const selectedTheme = selectedWarehouse
    ? warehouseColorMap.get(String(selectedWarehouse.id || selectedWarehouse._id))
    : null;

  const handleZoomIn = () => setZoom((prev) => Math.min(prev * 1.35, 10));
  const handleZoomOut = () => setZoom((prev) => Math.max(prev / 1.35, 0.8));
  const handleReset = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
    setSelectedWhId(null);
  };

  const handleMouseDown = (e) => {
    if (e.button !== 0) return;
    setIsDragging(true);
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };

  const handleMouseMove = (e) => {
    if (isDragging) {
      setPan({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
    }
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      setTooltipPos({
        x: e.clientX - rect.left + 14,
        y: e.clientY - rect.top + 14,
        containerW: rect.width,
        containerH: rect.height
      });
    }
  };

  const handleMouseUp = () => setIsDragging(false);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const onWheel = (e) => {
      e.preventDefault();
      const factor = e.deltaY < 0 ? 1.15 : 0.87;
      setZoom((prev) => Math.min(Math.max(prev * factor, 0.8), 10));
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, []);

  const focusWarehouseOnMap = (wh) => {
    const wId = String(wh.id || wh._id);
    setSelectedWhId((prev) => (prev === wId ? null : wId));
  };

  return (
    <div className="bg-surface border border-border rounded-3xl shadow-sm overflow-hidden">
      {/* Map Header Toolbar */}
      <div className="p-4 sm:p-5 border-b border-border bg-surface-elevated/50 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div className="flex items-start sm:items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
            <FiMap className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-text-primary flex items-center gap-2 flex-wrap">
              Live Warehouse & Cluster Territory Coverage Map
              <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                Auto-Synced with Cluster Routing
              </span>
            </h3>
            <p className="text-xs text-text-secondary mt-0.5">
              Hover or click any colored territory or warehouse hub to inspect assigned states, active vs inactive clusters, and districts.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex bg-bg p-1 rounded-xl border border-border text-xs font-bold">
            {[
              { id: "all", label: `All (${warehouses.length})` },
              { id: "active", label: `Active (${warehouses.filter((w) => w.is_active).length})` },
              { id: "mapped", label: `Mapped (${warehouses.filter((w) => warehouseCoverageMap.get(String(w.id || w._id))?.isMapped).length})` }
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setMapFilter(tab.id)}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  mapFilter === tab.id
                    ? "bg-primary text-white shadow-xs"
                    : "text-text-secondary hover:text-text-primary"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {onCloseMap && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onCloseMap}
              leftIcon={<FiX className="w-3.5 h-3.5" />}
            >
              Hide Map
            </Button>
          )}
        </div>
      </div>

      {/* Main Map Body */}
      <div className="grid grid-cols-1 xl:grid-cols-12">
        {/* SVG India Canvas */}
        <div
          ref={containerRef}
          className={`${
            selectedWarehouse ? "xl:col-span-8" : "xl:col-span-12"
          } relative h-[640px] bg-slate-50 dark:bg-slate-950/60 overflow-hidden select-none cursor-grab active:cursor-grabbing border-b xl:border-b-0 xl:border-r border-border`}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={() => {
            setIsDragging(false);
            setHoverInfo(null);
          }}
        >
          {/* Zoom Controls (Top Left) */}
          <div className="absolute top-4 left-4 z-20 flex flex-col gap-1.5">
            <div className="flex items-center gap-1 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md p-1.5 rounded-xl border border-border shadow-md">
              <button
                type="button"
                onClick={handleZoomIn}
                title="Zoom In"
                className="p-2 rounded-lg text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <FiZoomIn size={16} />
              </button>
              <button
                type="button"
                onClick={handleZoomOut}
                title="Zoom Out"
                className="p-2 rounded-lg text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <FiZoomOut size={16} />
              </button>
              <button
                type="button"
                onClick={handleReset}
                title="Reset View"
                className="p-2 rounded-lg text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <FiRefreshCw size={15} />
              </button>
            </div>
          </div>

          {/* Color Key & Territory Legend (Bottom Left) */}
          <div className="absolute bottom-4 left-4 z-20 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md p-3.5 rounded-2xl border border-border shadow-lg max-w-[300px] text-xs">
            <div className="flex items-center justify-between pb-2 mb-2 border-b border-border/70">
              <span className="font-bold text-text-primary flex items-center gap-1.5">
                <FiLayers className="text-primary w-3.5 h-3.5" />
                Warehouse Color Key
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                {visibleWarehouses.length} Hubs
              </span>
            </div>

            <div className="space-y-1 pb-2 mb-2 border-b border-border/70 text-[11px] text-text-secondary">
              <div className="flex items-center gap-2">
                <span className="w-3.5 h-3.5 rounded-sm bg-emerald-600 inline-block shrink-0" />
                <span className="truncate">Solid Color: Active Cluster Districts</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3.5 h-3.5 rounded-sm bg-emerald-500/20 border border-dashed border-emerald-600 inline-block shrink-0" />
                <span className="truncate">Tinted Dashed: State Assigned, Cluster Inactive</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3.5 h-3.5 rounded-sm bg-slate-100 border border-slate-300 inline-block shrink-0" />
                <span className="truncate">Neutral: Unassigned Districts</span>
              </div>
            </div>

            <div className="max-h-[155px] overflow-y-auto space-y-1 pr-1">
              {visibleWarehouses.map((w) => {
                const wId = String(w.id || w._id);
                const cov = warehouseCoverageMap.get(wId);
                const theme = warehouseColorMap.get(wId) || WAREHOUSE_COLOR_PALETTE[0];
                const isSelected = String(selectedWhId) === wId;

                return (
                  <button
                    key={wId}
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      focusWarehouseOnMap(w);
                    }}
                    onMouseEnter={() =>
                      setHoverInfo({
                        type: "warehouse",
                        warehouse: w,
                        coverage: cov,
                        theme
                      })
                    }
                    className={`w-full text-left flex items-center gap-2 p-1.5 rounded-xl transition-all cursor-pointer ${
                      isSelected
                        ? "bg-primary/10 ring-1 ring-primary"
                        : "hover:bg-surface-elevated"
                    }`}
                  >
                    <span
                      className="w-3.5 h-3.5 rounded-md shrink-0 border"
                      style={{ backgroundColor: theme.fill, borderColor: theme.border }}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-1">
                        <span className="font-bold text-[11px] text-text-primary truncate">
                          {w.warehouse_name || w.warehouse_code}
                        </span>
                        <span
                          className={`text-[9px] font-bold px-1.5 py-0.2 rounded-full shrink-0 ${
                            w.is_active
                              ? "bg-emerald-500/15 text-emerald-600"
                              : "bg-amber-500/15 text-amber-600"
                          }`}
                        >
                          {w.is_active ? "Active" : "Inactive"}
                        </span>
                      </div>
                      <div className="text-[10px] text-text-muted truncate">
                        {cov?.assignedStatesCount || 0} States • {cov?.activeClustersCount || 0}/
                        {cov?.totalClustersInAssignedStates || 0} Clusters • {cov?.coveredDistrictsCount || 0} Dist.
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* GeoJSON Loading / Error States */}
          {loadingGeo ? (
            <div className="h-full flex flex-col items-center justify-center gap-3 p-8">
              <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
              <p className="text-sm font-bold text-text-primary">Loading Interactive India Territory Map...</p>
              <p className="text-xs text-text-muted">Projecting 726 districts and live warehouse clusters</p>
            </div>
          ) : geoError ? (
            <div className="h-full flex flex-col items-center justify-center gap-3 p-8 text-center">
              <FiAlertCircle className="w-10 h-10 text-red-500" />
              <p className="text-sm font-bold text-text-primary">Failed to load India vector boundaries</p>
              <p className="text-xs text-text-muted">{geoError}</p>
              {onRetryGeo && (
                <Button size="sm" variant="primary" onClick={onRetryGeo}>
                  Retry
                </Button>
              )}
            </div>
          ) : (
            <svg
              viewBox={`0 0 ${width} ${height}`}
              className="w-full h-full block"
              style={{ touchAction: "none" }}
            >
              <g transform={`translate(${pan.x}, ${pan.y}) scale(${zoom})`}>
                {/* 1. District Polygons */}
                {districtFeatures.map((feature, idx) => {
                  const dName = feature.properties?.district || `District-${idx}`;
                  const sName = feature.properties?.st_nm || "";
                  const { activeEntries, inactiveEntries, stateOnlyEntries } = getDistrictEntries(feature);

                  const primaryActive =
                    activeEntries.find((e) => e.warehouse.is_active) || activeEntries[0] || null;
                  const primaryInactive = inactiveEntries[0] || null;
                  const primaryStateOnly = stateOnlyEntries[0] || null;
                  const primaryAny = primaryActive || primaryInactive || primaryStateOnly;

                  const hasSelectedMatch =
                    selectedWhId &&
                    [...activeEntries, ...inactiveEntries, ...stateOnlyEntries].some(
                      (e) => String(e.warehouse.id || e.warehouse._id) === String(selectedWhId)
                    );

                  let fill = "#f1f5f9";
                  let fillOpacity = 1;
                  let stroke = "#cbd5e1";
                  let strokeWidth = 0.5 / zoom;
                  let strokeDasharray;

                  if (primaryActive) {
                    fill = primaryActive.theme.fill;
                    fillOpacity = primaryActive.warehouse.is_active ? 0.88 : 0.62;
                    stroke = primaryActive.theme.border;
                    strokeWidth = 1.0 / zoom;
                  } else if (primaryInactive) {
                    fill = primaryInactive.theme.fill;
                    fillOpacity = 0.20;
                    stroke = primaryInactive.theme.border;
                    strokeWidth = 0.85 / zoom;
                    strokeDasharray = `${3 / zoom},${2 / zoom}`;
                  } else if (primaryStateOnly) {
                    fill = primaryStateOnly.theme.fill;
                    fillOpacity = 0.35;
                    stroke = primaryStateOnly.theme.border;
                    strokeWidth = 0.85 / zoom;
                  }

                  if (selectedWhId) {
                    if (hasSelectedMatch) {
                      const selActive = activeEntries.find(
                        (e) => String(e.warehouse.id || e.warehouse._id) === String(selectedWhId)
                      );
                      const selInactive = inactiveEntries.find(
                        (e) => String(e.warehouse.id || e.warehouse._id) === String(selectedWhId)
                      );
                      const selStateOnly = stateOnlyEntries.find(
                        (e) => String(e.warehouse.id || e.warehouse._id) === String(selectedWhId)
                      );
                      if (selActive) {
                        fill = selActive.theme.fill;
                        fillOpacity = 0.92;
                        stroke = "#0f172a";
                        strokeWidth = 1.4 / zoom;
                        strokeDasharray = undefined;
                      } else if (selInactive) {
                        fill = selInactive.theme.fill;
                        fillOpacity = 0.25;
                        stroke = selInactive.theme.border;
                        strokeWidth = 1.1 / zoom;
                        strokeDasharray = `${3 / zoom},${2 / zoom}`;
                      } else if (selStateOnly) {
                        fill = selStateOnly.theme.fill;
                        fillOpacity = 0.45;
                        stroke = "#0f172a";
                        strokeWidth = 1.1 / zoom;
                      }
                    } else if (primaryAny) {
                      fillOpacity = 0.16;
                    }
                  }

                  const isHovered =
                    hoverInfo?.type === "district" &&
                    hoverInfo.districtName === dName &&
                    hoverInfo.stateName === sName;

                  if (isHovered) {
                    stroke = "#0f172a";
                    strokeWidth = 2.0 / zoom;
                  }

                  return (
                    <path
                      key={`wh-dist-${idx}-${dName}`}
                      d={pathGenerator(feature)}
                      fill={fill}
                      fillOpacity={fillOpacity}
                      stroke={stroke}
                      strokeWidth={strokeWidth}
                      strokeDasharray={strokeDasharray}
                      className={`transition-opacity duration-150 outline-none ${
                        primaryAny ? "cursor-pointer" : ""
                      }`}
                      onMouseEnter={() => {
                        setHoverInfo({
                          type: "district",
                          districtName: dName,
                          stateName: sName,
                          activeEntries,
                          inactiveEntries,
                          stateOnlyEntries,
                          primaryAny
                        });
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (primaryAny) {
                          focusWarehouseOnMap(primaryAny.warehouse);
                        }
                      }}
                    />
                  );
                })}

                {/* 2. State Outer Boundaries */}
                {stateBoundaries.map((feature, idx) => (
                  <path
                    key={`wh-state-border-${idx}-${feature.properties?.st_nm || idx}`}
                    d={pathGenerator(feature)}
                    fill="none"
                    stroke="#475569"
                    strokeWidth={1.25 / zoom}
                    strokeOpacity={0.55}
                    className="pointer-events-none"
                  />
                ))}

                {/* 3. State 2-Letter Context Badges */}
                {Object.entries(INDIA_STATE_META).map(([stName, info]) => {
                  if (!projection) return null;
                  const [cx, cy] = projection(info.center) || [];
                  if (cx === undefined || cy === undefined) return null;
                  const badgeW = 22 / Math.max(0.9, zoom * 0.7);
                  const badgeH = 14 / Math.max(0.9, zoom * 0.7);
                  const fontSize = Math.max(7.5, 10 / Math.max(0.85, zoom * 0.65));

                  return (
                    <g
                      key={`st-code-${stName}`}
                      transform={`translate(${cx}, ${cy})`}
                      className="pointer-events-none select-none"
                    >
                      <rect
                        x={-badgeW / 2}
                        y={-badgeH / 2}
                        width={badgeW}
                        height={badgeH}
                        rx={3 / zoom}
                        fill="#ffffff"
                        stroke="#334155"
                        strokeWidth={0.7 / zoom}
                        opacity={0.85}
                      />
                      <text
                        x={0}
                        y={fontSize * 0.35}
                        textAnchor="middle"
                        fill="#0f172a"
                        fontSize={fontSize}
                        fontWeight="800"
                        className="font-mono"
                      >
                        {info.code}
                      </text>
                    </g>
                  );
                })}

                {/* 4. Live Warehouse Hub Pins */}
                {warehouseMarkers.map(({ warehouse: w, coverage: cov, theme, x, y }) => {
                  const wId = String(w.id || w._id);
                  const isSelected = String(selectedWhId) === wId;
                  const s = 1 / Math.max(0.75, zoom * 0.75);
                  const radius = (isSelected ? 10 : 8) * s;

                  return (
                    <g
                      key={`wh-pin-${wId}`}
                      transform={`translate(${x}, ${y})`}
                      className="cursor-pointer select-none"
                      onMouseEnter={() => {
                        setHoverInfo({
                          type: "warehouse",
                          warehouse: w,
                          coverage: cov,
                          theme
                        });
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        focusWarehouseOnMap(w);
                      }}
                    >
                      {isSelected && (
                        <circle
                          cx={0}
                          cy={0}
                          r={radius + 6 * s}
                          fill="none"
                          stroke={theme.fill}
                          strokeWidth={2.2 * s}
                          strokeDasharray={`${3 * s},${2 * s}`}
                        />
                      )}
                      <circle
                        cx={0}
                        cy={0}
                        r={radius}
                        fill={theme.fill}
                        stroke="#ffffff"
                        strokeWidth={2 * s}
                      />
                      <circle
                        cx={radius * 0.65}
                        cy={-radius * 0.65}
                        r={3.2 * s}
                        fill={w.is_active ? "#10b981" : "#f59e0b"}
                        stroke="#ffffff"
                        strokeWidth={1 * s}
                      />
                      <g transform={`translate(0, ${radius + 11 * s})`}>
                        <rect
                          x={-36 * s}
                          y={-7 * s}
                          width={72 * s}
                          height={14 * s}
                          rx={4 * s}
                          fill="#0f172a"
                          fillOpacity={0.88}
                          stroke={theme.fill}
                          strokeWidth={0.9 * s}
                        />
                        <text
                          x={0}
                          y={3 * s}
                          textAnchor="middle"
                          fill="#ffffff"
                          fontSize={7.5 * s}
                          fontWeight="800"
                          className="font-mono"
                        >
                          {w.warehouse_code}
                        </text>
                      </g>
                    </g>
                  );
                })}
              </g>
            </svg>
          )}

          {/* Floating Hover Info Box */}
          {hoverInfo && (
            <div
              className="absolute z-30 pointer-events-none bg-slate-900/95 backdrop-blur-md text-white p-3.5 rounded-2xl shadow-2xl border border-slate-700 w-[300px] text-xs space-y-2.5"
              style={{
                left: `${
                  tooltipPos.containerW && tooltipPos.x > tooltipPos.containerW - 320
                    ? Math.max(12, tooltipPos.x - 318)
                    : tooltipPos.x
                }px`,
                top: `${
                  tooltipPos.containerH && tooltipPos.y > tooltipPos.containerH - 280
                    ? Math.max(12, tooltipPos.y - 240)
                    : tooltipPos.y
                }px`
              }}
            >
              {hoverInfo.type === "district" && (
                <div className="pb-2 border-b border-slate-700/80">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-black text-sm text-white truncate">
                      {hoverInfo.districtName}
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-800 text-slate-300 shrink-0">
                      {hoverInfo.stateName}
                    </span>
                  </div>
                  {!hoverInfo.primaryAny && (
                    <p className="text-[11px] text-slate-400 mt-1">
                      Not currently mapped to any warehouse
                    </p>
                  )}
                </div>
              )}

              {/* Render Warehouse Summary for Hovered Pin or Primary District Match */}
              {(() => {
                const targetEntry =
                  hoverInfo.type === "warehouse"
                    ? {
                        warehouse: hoverInfo.warehouse,
                        coverage: hoverInfo.coverage,
                        theme: hoverInfo.theme,
                        cluster: null,
                        isActiveCluster: null
                      }
                    : hoverInfo.primaryAny;

                if (!targetEntry) return null;
                const { warehouse: hw, coverage: hCov, theme: hTheme, cluster: hCluster, isActiveCluster } = targetEntry;

                return (
                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span
                            className="w-2.5 h-2.5 rounded-full shrink-0"
                            style={{ backgroundColor: hTheme?.fill }}
                          />
                          <span className="font-bold text-white truncate">
                            {hw.warehouse_name || hw.warehouse_code}
                          </span>
                        </div>
                        <span className="text-[10px] font-mono text-slate-400">
                          {hw.warehouse_code} • {hw.warehouse_type === "3pl" ? "3PL" : "Company"}
                        </span>
                      </div>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${
                          hw.is_active
                            ? "bg-emerald-500/20 text-emerald-300"
                            : "bg-amber-500/20 text-amber-300"
                        }`}
                      >
                        {hw.is_active ? "Active" : "Inactive"}
                      </span>
                    </div>

                    {hCluster && (
                      <div
                        className={`p-2 rounded-lg border text-[11px] ${
                          isActiveCluster
                            ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-200"
                            : "bg-amber-500/10 border-amber-500/30 text-amber-200"
                        }`}
                      >
                        <div className="font-bold flex items-center justify-between gap-1">
                          <span className="truncate">
                            {hCluster.cluster_code}: {hCluster.cluster_name}
                          </span>
                        </div>
                        <span className="text-[10px] block mt-0.5">
                          {isActiveCluster
                            ? "Active Cluster for this Warehouse"
                            : "State Assigned • Cluster Not Active Yet"}
                        </span>
                      </div>
                    )}

                    {/* 4 Coverage Counts */}
                    <div className="grid grid-cols-2 gap-1.5 text-[11px]">
                      <div className="bg-slate-800/80 px-2 py-1.5 rounded-lg">
                        <span className="text-slate-400 text-[10px] block">States Assigned</span>
                        <span className="font-black text-white">
                          {hCov?.assignedStatesCount || 0}
                        </span>
                      </div>
                      <div className="bg-slate-800/80 px-2 py-1.5 rounded-lg">
                        <span className="text-slate-400 text-[10px] block">Districts Covered</span>
                        <span className="font-black text-white">
                          {hCov?.coveredDistrictsCount || 0}
                        </span>
                      </div>
                      <div className="bg-emerald-500/15 px-2 py-1.5 rounded-lg border border-emerald-500/20">
                        <span className="text-emerald-300 text-[10px] block">Clusters Active</span>
                        <span className="font-black text-emerald-300">
                          {hCov?.activeClustersCount || 0}
                        </span>
                      </div>
                      <div className="bg-amber-500/15 px-2 py-1.5 rounded-lg border border-amber-500/20">
                        <span className="text-amber-300 text-[10px] block">Clusters Not Active</span>
                        <span className="font-black text-amber-300">
                          {hCov?.inactiveClustersCount || 0}
                        </span>
                      </div>
                    </div>

                    {/* Per-State Split */}
                    {hCov?.stateBreakdowns?.length > 0 ? (
                      <div className="space-y-1.5 pt-1 border-t border-slate-700/80">
                        <span className="text-[10px] uppercase font-bold text-slate-400 block">
                          Assigned State Breakdown:
                        </span>
                        {hCov.stateBreakdowns.slice(0, 3).map((st) => (
                          <div
                            key={st.stateName}
                            className="flex items-center justify-between text-[11px] bg-slate-800/50 px-2 py-1 rounded"
                          >
                            <span className="font-semibold text-slate-200 truncate">
                              {st.stateName}
                            </span>
                            <span className="text-[10px] font-bold shrink-0">
                              <span className="text-emerald-400">{st.activeCount} Active</span>
                              <span className="text-slate-500 mx-1">/</span>
                              <span className="text-amber-400">{st.inactiveCount} Inactive</span>
                            </span>
                          </div>
                        ))}
                        {hCov.stateBreakdowns.length > 3 && (
                          <span className="text-[10px] text-slate-400 block">
                            +{hCov.stateBreakdowns.length - 3} more state(s)
                          </span>
                        )}
                        {hCov.activeClusters?.length > 0 && (
                          <div className="text-[10px] text-slate-300 pt-0.5 truncate">
                            <span className="text-slate-400">Active Clusters: </span>
                            {hCov.activeClusters.slice(0, 3).map((c) => c.cluster_name || c.cluster_code).join(", ")}
                            {hCov.activeClusters.length > 3 ? ` +${hCov.activeClusters.length - 3} more` : ""}
                          </div>
                        )}
                      </div>
                    ) : (
                      <p className="text-[10px] text-slate-400 italic">
                        No cluster routing assigned to this warehouse yet.
                      </p>
                    )}

                    {hoverInfo.type === "district" && (hoverInfo.activeEntries?.length || 0) > 1 && (
                      <div className="text-[10px] text-sky-300 bg-sky-500/10 border border-sky-500/20 px-2 py-1 rounded">
                        Also covered by:{" "}
                        {hoverInfo.activeEntries
                          .slice(1)
                          .map((e) => e.warehouse.warehouse_name || e.warehouse.warehouse_code)
                          .join(", ")}
                      </div>
                    )}

                    <p className="text-[10px] text-sky-400 font-semibold pt-1 border-t border-slate-800">
                      Click to pin full cluster & district details
                    </p>
                  </div>
                );
              })()}
            </div>
          )}
        </div>

        {/* Click Pinned Inspector Panel (Right Side on XL) */}
        {selectedWarehouse && (
          <div className="xl:col-span-4 h-[640px] flex flex-col bg-surface">
            <div className="p-4 border-b border-border flex items-start justify-between gap-2 bg-surface-elevated/40">
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span
                    className="w-3 h-3 rounded-full shrink-0"
                    style={{ backgroundColor: selectedTheme?.fill }}
                  />
                  <span className="font-mono text-xs font-bold text-text-muted">
                    {selectedWarehouse.warehouse_code}
                  </span>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      selectedWarehouse.is_active
                        ? "bg-emerald-500/15 text-emerald-600"
                        : "bg-amber-500/15 text-amber-600"
                    }`}
                  >
                    {selectedWarehouse.is_active ? "Active Hub" : "Pending / Inactive"}
                  </span>
                </div>
                <h4 className="font-bold text-base text-text-primary mt-1 truncate">
                  {selectedWarehouse.warehouse_name || selectedWarehouse.warehouse_code}
                </h4>
                <p className="text-xs text-text-muted mt-0.5">
                  {selectedWarehouse.district}, {selectedWarehouse.state} •{" "}
                  {Number(selectedWarehouse.warehouse_area_sqft) > 0
                    ? `${Number(selectedWarehouse.warehouse_area_sqft).toLocaleString()} sq. ft.`
                    : "Configurable"}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedWhId(null)}
                className="p-1.5 rounded-lg hover:bg-surface-elevated text-text-muted hover:text-text-primary cursor-pointer"
                title="Close Inspector"
              >
                <FiX className="w-4 h-4" />
              </button>
            </div>

            {/* 4 Live KPI Boxes */}
            <div className="p-4 grid grid-cols-2 gap-2.5 border-b border-border">
              <div className="p-2.5 rounded-xl bg-surface-elevated border border-border">
                <span className="text-[10px] uppercase font-bold text-text-muted block">
                  States Assigned
                </span>
                <span className="text-lg font-black text-text-primary">
                  {selectedCoverage?.assignedStatesCount || 0}
                </span>
              </div>
              <div className="p-2.5 rounded-xl bg-surface-elevated border border-border">
                <span className="text-[10px] uppercase font-bold text-text-muted block">
                  Districts Covered
                </span>
                <span className="text-lg font-black text-text-primary">
                  {selectedCoverage?.coveredDistrictsCount || 0}
                </span>
              </div>
              <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                <span className="text-[10px] uppercase font-bold text-emerald-700 dark:text-emerald-400 block">
                  Active Clusters
                </span>
                <span className="text-lg font-black text-emerald-600 dark:text-emerald-400">
                  {selectedCoverage?.activeClustersCount || 0}
                </span>
              </div>
              <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20">
                <span className="text-[10px] uppercase font-bold text-amber-700 dark:text-amber-400 block">
                  Not Active in State(s)
                </span>
                <span className="text-lg font-black text-amber-600 dark:text-amber-400">
                  {selectedCoverage?.inactiveClustersCount || 0}
                </span>
              </div>
            </div>

            {/* Scrollable State & Cluster Details */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {selectedCoverage?.stateBreakdowns?.length > 0 ? (
                selectedCoverage.stateBreakdowns.map((st) => (
                  <div
                    key={st.stateName}
                    className="rounded-2xl border border-border bg-bg/50 overflow-hidden"
                  >
                    <div className="px-3.5 py-2.5 bg-surface-elevated/80 border-b border-border flex items-center justify-between gap-2">
                      <span className="font-bold text-xs text-text-primary">{st.stateName}</span>
                      <div className="flex items-center gap-1.5 text-[10px] font-bold">
                        <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600">
                          {st.activeCount}/{st.totalClustersInState} Active
                        </span>
                        {st.inactiveCount > 0 && (
                          <span className="px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-600">
                            {st.inactiveCount} Inactive
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="p-3 space-y-2.5">
                      {st.isFullStateCoverage && (
                        <p className="text-[11px] text-text-secondary italic">
                          Full state coverage enabled (no sub-clusters configured in this state).
                        </p>
                      )}

                      {st.activeClusters.length > 0 && (
                        <div className="space-y-1.5">
                          <span className="text-[10px] font-bold uppercase text-emerald-600 block">
                            Active Clusters ({st.activeClusters.length})
                          </span>
                          {st.activeClusters.map((cl) => (
                            <div
                              key={cl.cluster_id}
                              className="p-2 rounded-xl bg-emerald-500/5 border border-emerald-500/20 text-xs"
                            >
                              <div className="flex items-center justify-between gap-1">
                                <span className="font-bold text-text-primary truncate">
                                  <span className="font-mono text-[10px] mr-1 text-emerald-600">
                                    {cl.cluster_code}
                                  </span>
                                  {cl.cluster_name}
                                </span>
                                <span className="text-[10px] font-semibold text-text-muted shrink-0">
                                  {(cl.district_names || []).length} Dist.
                                </span>
                              </div>
                              {cl.district_names?.length > 0 && (
                                <p className="text-[10px] text-text-secondary mt-1 leading-relaxed">
                                  {cl.district_names.join(", ")}
                                </p>
                              )}
                            </div>
                          ))}
                        </div>
                      )}

                      {st.inactiveClusters.length > 0 && (
                        <div className="space-y-1.5">
                          <span className="text-[10px] font-bold uppercase text-amber-600 block">
                            Not Active Yet in {st.stateName} ({st.inactiveClusters.length})
                          </span>
                          {st.inactiveClusters.map((cl) => (
                            <div
                              key={cl.cluster_id}
                              className="p-2 rounded-xl bg-amber-500/5 border border-dashed border-amber-500/30 text-xs opacity-85"
                            >
                              <div className="flex items-center justify-between gap-1">
                                <span className="font-semibold text-text-primary truncate">
                                  <span className="font-mono text-[10px] mr-1 text-amber-600">
                                    {cl.cluster_code}
                                  </span>
                                  {cl.cluster_name}
                                </span>
                                <span className="text-[10px] text-text-muted shrink-0">
                                  {(cl.district_names || []).length} Dist.
                                </span>
                              </div>
                              {cl.district_names?.length > 0 && (
                                <p className="text-[10px] text-text-muted mt-1 leading-relaxed">
                                  {cl.district_names.join(", ")}
                                </p>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-6 text-center rounded-2xl border border-dashed border-border text-xs text-text-muted space-y-1.5">
                  <FiInfo className="w-6 h-6 mx-auto opacity-50" />
                  <p className="font-semibold text-text-primary">No Routing Coverage Mapped Yet</p>
                  <p>Assign states and clusters to this warehouse in Order Management Cluster Routing.</p>
                </div>
              )}
            </div>

            {/* Footer Quick Actions */}
            <div className="p-3.5 border-t border-border grid grid-cols-2 gap-2 bg-surface-elevated/30">
              <Button
                type="button"
                size="sm"
                variant="primary"
                className="justify-center text-xs"
                onClick={() => onOpenCoverageModal(selectedWarehouse)}
              >
                <FiEye className="w-3.5 h-3.5 mr-1" />
                Full Breakdown
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="justify-center text-xs"
                onClick={() => onNavigateEdit(selectedWarehouse.id)}
              >
                <FiEdit2 className="w-3.5 h-3.5 mr-1" />
                Edit Facility
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

function sFullMapLookup(stateFullIndex, stateCleanKey) {
  if (!stateCleanKey) return [];
  return stateFullIndex.get(stateCleanKey) || [];
}

export default function ViewWarehouses({ moduleUniqueId }) {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  useHasPermission({ requiredUniqueId: moduleUniqueId, permission: "view" });

  const [warehouses, setWarehouses] = useState([]);
  const [metrics, setMetrics] = useState(null);
  const [routingMappings, setRoutingMappings] = useState([]);
  const [coverageStates, setCoverageStates] = useState([]);
  const [franchiseClustersList, setFranchiseClustersList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [viewMode, setViewMode] = useState("grid"); // 'grid' | 'map'

  // Coverage Breakdown Modal & Bottom India Territory Map State
  const [coverageModalWh, setCoverageModalWh] = useState(null);
  const [showCoverageMap, setShowCoverageMap] = useState(false);
  const [mapFocusWhId, setMapFocusWhId] = useState(null);
  const [geoData, setGeoData] = useState(null);
  const [loadingGeo, setLoadingGeo] = useState(false);
  const [geoError, setGeoError] = useState(null);
  const coverageMapRef = useRef(null);

  // Modals state
  const [checklistWhId, setChecklistWhId] = useState(null);
  const [inspectionWh, setInspectionWh] = useState(null);
  const [commercialsWh, setCommercialsWh] = useState(null);
  const [vendorModalOpen, setVendorModalOpen] = useState(false);
  const [suspendPopup, setSuspendPopup] = useState({ open: false, warehouse: null, action: "suspend" });

  const API = import.meta.env.VITE_API_URL;

  // ---------------------------
  // VALIDATION STATUS MAPPING
  // ---------------------------
  const validationStatus = {
    1: {
      label: "Pending Validation Setup",
      color: "from-slate-500 to-slate-600",
      text: "text-white",
      icon: FiClock,
      variant: "ghost"
    },
    2: {
      label: "Awaiting Information",
      color: "from-amber-500 to-amber-600",
      text: "text-white",
      icon: FiAlertCircle,
      variant: "warning"
    },
    3: {
      label: "In Review",
      color: "from-blue-500 to-blue-600",
      text: "text-white",
      icon: FiFileText,
      variant: "primary"
    },
    4: {
      label: "Verified",
      color: "from-green-500 to-green-600",
      text: "text-white",
      icon: FiCheck,
      variant: "success"
    },
    5: {
      label: "Rejected",
      color: "from-red-500 to-red-600",
      text: "text-white",
      icon: FiXCircle,
      variant: "danger"
    }
  };

  // ---------------------------
  // FILTER STATES
  // ---------------------------
  const [filterCountry, setFilterCountry] = useState("");
  const [filterState, setFilterState] = useState("");
  const [filterDistrict, setFilterDistrict] = useState("");
  const [showActive, setShowActive] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedValidationStatus, setSelectedValidationStatus] = useState([]);
  const [filterWarehouseType, setFilterWarehouseType] = useState(""); // "", "company", "3pl"

  // ---------------------------
  // LOAD DATA, METRICS & LIVE ROUTING
  // ---------------------------
  const fetchWarehouses = async (showRefresh = false) => {
    if (showRefresh) setRefreshing(true);

    try {
      const baseHeaders = authHeaderObj();
      const routingHeaders = {
        ...baseHeaders,
        "x-dashboard-context": "product",
        "x-saas-product-slug": "solar-shop"
      };

      const [resWh, resMetrics, resMappings, resCoverage, resFranchiseClusters] = await Promise.allSettled([
        axios.get(`${API}/warehouses?unique_id=${moduleUniqueId}&req_for=view`, { headers: baseHeaders }),
        axios.get(`${API}/warehouses/dashboard/metrics?unique_id=${moduleUniqueId}&req_for=view`, { headers: baseHeaders }),
        axios.get(`${API}/solarshop/cluster-routing/mappings`, { headers: routingHeaders }),
        axios.get(`${API}/solarshop/cluster-routing/coverage-options`, { headers: routingHeaders }),
        axios.get(`${API}/franchise-clusters/list`, { headers: baseHeaders })
      ]);

      if (resWh.status === "fulfilled") {
        setWarehouses(resWh.value.data?.warehouses || []);
      } else {
        throw resWh.reason;
      }

      if (resMetrics.status === "fulfilled" && resMetrics.value.data?.status === "success") {
        setMetrics(resMetrics.value.data.metrics);
      }

      if (resMappings.status === "fulfilled" && Array.isArray(resMappings.value.data?.data)) {
        setRoutingMappings(resMappings.value.data.data);
      }

      if (resCoverage.status === "fulfilled" && resCoverage.value.data?.data) {
        const covData = resCoverage.value.data.data;
        setCoverageStates(Array.isArray(covData.states) ? covData.states : []);
      }

      if (resFranchiseClusters.status === "fulfilled" && Array.isArray(resFranchiseClusters.value.data?.data)) {
        setFranchiseClustersList(resFranchiseClusters.value.data.data);
      }
    } catch (err) {
      console.error(err);
      dispatch(
        setAlert({
          type: "error",
          message: err.response?.data?.message || "Failed to load warehouses.",
          duration: 4000
        })
      );
    }

    setLoading(false);
    if (showRefresh) setRefreshing(false);
  };

  useEffect(() => {
    fetchWarehouses();
  }, []);

  // Load India Districts GeoJSON lazily when Coverage Map is opened
  const loadIndiaGeoJson = useCallback(() => {
    if (geoData || loadingGeo) return;
    setLoadingGeo(true);
    setGeoError(null);
    fetch("/geojson/india_districts.json")
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load India GeoJSON boundaries");
        return res.json();
      })
      .then((data) => {
        setGeoData(data);
        setLoadingGeo(false);
      })
      .catch((err) => {
        console.error("GeoJSON load error:", err);
        setGeoError(err.message || "Failed to load map data");
        setLoadingGeo(false);
      });
  }, [geoData, loadingGeo]);

  useEffect(() => {
    if (showCoverageMap) {
      loadIndiaGeoJson();
    }
  }, [showCoverageMap, loadIndiaGeoJson]);

  // Unified State -> Franchise Clusters live catalog (primary: cluster-routing/coverage-options, fallback: /franchise-clusters/list)
  const stateClustersCatalog = useMemo(() => {
    const catalog = new Map();

    const addClusterToCatalog = (stateName, cl) => {
      const sKey = normalizeText(stateName || cl.state_name);
      if (!sKey) return;
      if (!catalog.has(sKey)) catalog.set(sKey, []);
      const existing = catalog.get(sKey);
      const cid = String(cl.cluster_id || cl.id || cl._id || "");
      if (cid && !existing.some((x) => String(x.cluster_id || x.id || x._id) === cid)) {
        existing.push({
          ...cl,
          id: cid,
          cluster_id: cid,
          state_name: stateName || cl.state_name || ""
        });
      }
    };

    (coverageStates || []).forEach((st) => {
      (st.clusters || []).forEach((cl) => addClusterToCatalog(st.name, cl));
    });

    (franchiseClustersList || []).forEach((fc) => {
      if (fc.deleted_at) return;
      if (fc.is_active === false) return;
      const stName = fc.state_name || fc.state_id?.name || "";
      addClusterToCatalog(stName, {
        id: fc._id,
        cluster_id: fc._id,
        cluster_code: fc.cluster_code,
        cluster_name: fc.cluster_name,
        state_name: stName,
        district_names: fc.district_names || [],
        status: fc.status || "available",
        color_code: fc.color_code || "#2563eb"
      });
    });

    return catalog;
  }, [coverageStates, franchiseClustersList]);

  // Live per-warehouse coverage lookup & deterministic color map
  const { warehouseCoverageMap, warehouseColorMap, coverageSummaryStats } = useMemo(() => {
    const covMap = new Map();
    const colorMap = new Map();
    const uniqueStates = new Set();
    const uniqueClusters = new Set();
    const uniqueDistricts = new Set();
    let mappedCount = 0;

    warehouses.forEach((w, idx) => {
      const wId = String(w.id || w._id);
      const cov = buildWarehouseCoverage(w, routingMappings, stateClustersCatalog);
      covMap.set(wId, cov);
      colorMap.set(wId, getWarehouseColorTheme(w, idx));

      if (cov.isMapped) mappedCount += 1;
      cov.assignedStates.forEach((s) => uniqueStates.add(normalizeText(s)));
      cov.activeClusters.forEach((c) => uniqueClusters.add(String(c.cluster_id)));
      cov.coveredDistricts.forEach((d) =>
        uniqueDistricts.add(`${normalizeText(d.stateName)}__${cleanGeoKey(d.districtName)}`)
      );
    });

    return {
      warehouseCoverageMap: covMap,
      warehouseColorMap: colorMap,
      coverageSummaryStats: {
        mappedWarehouses: mappedCount,
        totalStates: uniqueStates.size,
        totalActiveClusters: uniqueClusters.size,
        totalDistricts: uniqueDistricts.size
      }
    };
  }, [warehouses, routingMappings, stateClustersCatalog]);

  // ---------------------------
  // UNIQUE DROPDOWN OPTIONS
  // ---------------------------
  const countries = useMemo(
    () =>
      [...new Set(warehouses.map((w) => w.country))].filter(Boolean).map((c) => ({
        value: c,
        text: (
          <span className="flex items-center gap-2">
            <div className="w-6 h-6 bg-linear-120 from-primary to-primary-end rounded-full flex items-center justify-center">
              <FiGlobe className="text-white w-3 h-3" />
            </div>
            {c}
          </span>
        ),
      })),
    [warehouses]
  );

  const states = useMemo(() => {
    return [
      ...new Set(
        warehouses
          .filter((w) => !filterCountry || w.country === filterCountry)
          .map((w) => w.state)
      ),
    ].filter(Boolean).map((s) => ({
      value: s,
      text: (
        <span className="flex items-center gap-2">
          <div className="w-6 h-6 bg-linear-120 from-amber-500 to-amber-600 rounded-full flex items-center justify-center">
            <FiMap className="text-white w-3 h-3" />
          </div>
          {s}
        </span>
      )
    }));
  }, [warehouses, filterCountry]);

  const districts = useMemo(() => {
    return [
      ...new Set(
        warehouses
          .filter(
            (w) =>
              (!filterCountry || w.country === filterCountry) &&
              (!filterState || w.state === filterState)
          )
          .map((w) => w.district)
      ),
    ].filter(Boolean).map((d) => ({
      value: d,
      text: (
        <span className="flex items-center gap-2">
          <div className="w-6 h-6 bg-linear-120 from-green-500 to-green-600 rounded-full flex items-center justify-center">
            <FiMapPin className="text-white w-3 h-3" />
          </div>
          {d}
        </span>
      )
    }));
  }, [warehouses, filterCountry, filterState]);

  const validationStatusOptions = useMemo(() => {
    return Object.entries(validationStatus).map(([key, value]) => ({
      value: parseInt(key),
      text: (
        <span className="flex items-center gap-2">
          <div className={`w-6 h-6 bg-linear-120 ${value.color} rounded-full flex items-center justify-center`}>
            <value.icon className={`${value.text} w-3 h-3`} />
          </div>
          {value.label}
        </span>
      )
    }));
  }, []);

  // ---------------------------
  // FILTERED WAREHOUSES
  // ---------------------------
  const filteredWarehouses = useMemo(() => {
    return warehouses.filter((w) => {
      const matchesSearch = searchQuery === "" ||
        w.warehouse_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        w.address?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        w.pincode?.toString().includes(searchQuery) ||
        w.warehouse_code?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        w.vendor_name?.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesValidationStatus = selectedValidationStatus.length === 0
        ? true
        : selectedValidationStatus.includes(w.status_id);

      const matchesWarehouseType = !filterWarehouseType || w.warehouse_type === filterWarehouseType;

      return (
        (!filterCountry || w.country === filterCountry) &&
        (!filterState || w.state === filterState) &&
        (!filterDistrict || w.district === filterDistrict) &&
        (!showActive || w.is_active === 1 || w.is_active === true) &&
        matchesValidationStatus &&
        matchesWarehouseType &&
        matchesSearch
      );
    });
  }, [warehouses, filterCountry, filterState, filterDistrict, showActive, searchQuery, selectedValidationStatus, filterWarehouseType]);

  const clearFilters = () => {
    setFilterCountry("");
    setFilterState("");
    setFilterDistrict("");
    setShowActive(false);
    setSearchQuery("");
    setSelectedValidationStatus([]);
    setFilterWarehouseType("");
  };

  const activeFilterCount = [
    filterCountry,
    filterState,
    filterDistrict,
    showActive,
    searchQuery,
    selectedValidationStatus.length > 0,
    filterWarehouseType
  ].filter(Boolean).length;

  const handleAddWarehouse = () => {
    navigate("add-warehouse");
  };

  const getStatusInfo = (warehouse) => {
    const status = validationStatus[warehouse.status_id];
    return {
      label: warehouse.status || status?.label || "Unknown",
      color: status?.color || "from-primary to-primary-end",
      text: status?.text || "text-white",
      icon: status?.icon || FiClock,
      variant: status?.variant || "ghost"
    };
  };

  const handleToggleStatus = async () => {
    const wh = suspendPopup.warehouse;
    if (!wh) return;

    try {
      const nextAction = wh.is_active ? "suspend" : "activate";
      const res = await axios.patch(
        `${API}/warehouses/${wh.id}/toggle-status?unique_id=${moduleUniqueId}&req_for=edit`,
        { action: nextAction },
        { headers: authHeaderObj() }
      );

      if (res.data?.status === "success") {
        dispatch(setAlert({
          type: "success",
          message: `Warehouse status updated to '${nextAction === "suspend" ? "Suspended" : "Active"}'.`
        }));
        fetchWarehouses();
      }
    } catch (err) {
      dispatch(setAlert({
        type: "error",
        message: err.response?.data?.message || "Failed to update warehouse status."
      }));
    } finally {
      setSuspendPopup({ open: false, warehouse: null, action: "suspend" });
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Warehouse Management & Activation Master"
        subtitle={loading ? "Loading warehouses..." : `${filteredWarehouses.length} of ${warehouses.length} facilities displayed`}
        icon={FiArchive}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            {/* View Mode Toggle Button */}
            <div className="flex bg-surface-elevated p-1 rounded-xl border border-border">
              <button
                type="button"
                onClick={() => setViewMode("grid")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${viewMode === "grid"
                  ? "bg-primary text-white shadow-xs"
                  : "text-text-secondary hover:text-text-primary"
                  }`}
              >
                <FiLayers className="w-3.5 h-3.5" />
                Directory
              </button>
              <button
                type="button"
                onClick={() => setViewMode("map")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${viewMode === "map"
                  ? "bg-primary text-white shadow-xs"
                  : "text-text-secondary hover:text-text-primary"
                  }`}
              >
                <FiMap className="w-3.5 h-3.5" />
                Live Map
              </button>
            </div>

            {/* 3PL Logistics Partner Management */}
            <Button
              onClick={() => setVendorModalOpen(true)}
              variant="secondary"
              leftIcon={<FiTruck className="w-4 h-4 text-blue-500" />}
            >
              3PL Vendors
            </Button>

            <Button
              onClick={() => fetchWarehouses(true)}
              disabled={refreshing}
              variant="secondary"
              leftIcon={<FiRefreshCw className={refreshing ? "animate-spin" : ""} />}
            >
              {refreshing ? "Refreshing..." : "Refresh"}
            </Button>

            <RenderIfPermission
              requiredUniqueId={moduleUniqueId}
              permission="add"
              fallback={null}
            >
              <Button
                onClick={handleAddWarehouse}
                variant="primary"
                leftIcon={<FiPlus />}
              >
                Add Warehouse
              </Button>
            </RenderIfPermission>
          </div>
        }
      />

      {/* ── 10 KPI Summary Cards Grid (Section 9.1) ────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
        {/* KPI 1: Total Warehouses */}
        <div
          onClick={() => { setFilterWarehouseType(""); setShowActive(false); }}
          className="bg-surface border border-border hover:border-primary/40 rounded-2xl p-4 shadow-2xs hover:shadow-md transition-all cursor-pointer flex items-center gap-3"
        >
          <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
            <FiArchive className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <span className="text-xl font-black text-text-primary block leading-tight">
              {metrics?.total_warehouses ?? warehouses.length}
            </span>
            <span className="text-[11px] font-semibold text-text-muted truncate block">Total Facilities</span>
          </div>
        </div>

        {/* KPI 2: Company Warehouses */}
        <div
          onClick={() => setFilterWarehouseType("company")}
          className="bg-surface border border-border hover:border-emerald-500/40 rounded-2xl p-4 shadow-2xs hover:shadow-md transition-all cursor-pointer flex items-center gap-3"
        >
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center shrink-0">
            <FiHome className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <span className="text-xl font-black text-text-primary block leading-tight">
              {metrics?.company_warehouses ?? warehouses.filter(w => w.warehouse_type === "company").length}
            </span>
            <span className="text-[11px] font-semibold text-text-muted truncate block">Company-Owned</span>
          </div>
        </div>

        {/* KPI 3: 3PL Warehouses */}
        <div
          onClick={() => setFilterWarehouseType("3pl")}
          className="bg-surface border border-border hover:border-blue-500/40 rounded-2xl p-4 shadow-2xs hover:shadow-md transition-all cursor-pointer flex items-center gap-3"
        >
          <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center shrink-0">
            <FiTruck className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <span className="text-xl font-black text-text-primary block leading-tight">
              {metrics?.tpl_warehouses ?? warehouses.filter(w => w.warehouse_type === "3pl").length}
            </span>
            <span className="text-[11px] font-semibold text-text-muted truncate block">3PL Vendor Operated</span>
          </div>
        </div>

        {/* KPI 4: Active Warehouses */}
        <div
          onClick={() => setShowActive(true)}
          className="bg-surface border border-border hover:border-emerald-500/40 rounded-2xl p-4 shadow-2xs hover:shadow-md transition-all cursor-pointer flex items-center gap-3"
        >
          <div className="w-10 h-10 rounded-xl bg-emerald-500/15 text-emerald-600 flex items-center justify-center shrink-0">
            <FiCheckCircle className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <span className="text-xl font-black text-emerald-600 dark:text-emerald-400 block leading-tight">
              {metrics?.active_warehouses ?? warehouses.filter(w => w.is_active).length}
            </span>
            <span className="text-[11px] font-semibold text-text-muted truncate block">Active Warehouses</span>
          </div>
        </div>

        {/* KPI 5: Pending Activation (Company) */}
        <div
          onClick={() => { setFilterWarehouseType("company"); setSelectedValidationStatus([1, 2]); }}
          className="bg-surface border border-border hover:border-amber-500/40 rounded-2xl p-4 shadow-2xs hover:shadow-md transition-all cursor-pointer flex items-center gap-3"
        >
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center shrink-0">
            <FiClock className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <span className="text-xl font-black text-amber-600 dark:text-amber-400 block leading-tight">
              {metrics?.pending_activation ?? warehouses.filter(w => w.warehouse_type === "company" && !w.is_active).length}
            </span>
            <span className="text-[11px] font-semibold text-text-muted truncate block">Pending Activation</span>
          </div>
        </div>

        {/* KPI 6: Pending Inspection (3PL) */}
        <div
          onClick={() => { setFilterWarehouseType("3pl"); setSelectedValidationStatus([1, 2]); }}
          className="bg-surface border border-border hover:border-amber-500/40 rounded-2xl p-4 shadow-2xs hover:shadow-md transition-all cursor-pointer flex items-center gap-3"
        >
          <div className="w-10 h-10 rounded-xl bg-amber-500/15 text-amber-600 flex items-center justify-center shrink-0">
            <FiAlertTriangle className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <span className="text-xl font-black text-amber-600 dark:text-amber-400 block leading-tight">
              {metrics?.pending_inspection ?? warehouses.filter(w => w.warehouse_type === "3pl" && !w.is_active).length}
            </span>
            <span className="text-[11px] font-semibold text-text-muted truncate block">Pending Inspection</span>
          </div>
        </div>

        {/* KPI 7: Active Kit Mappings */}
        <div
          onClick={() => navigate("/admin-panel/solar-shop/warehouse-kit-activations")}
          className="bg-surface border border-border hover:border-primary/40 rounded-2xl p-4 shadow-2xs hover:shadow-md transition-all cursor-pointer flex items-center gap-3"
        >
          <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
            <FiPackage className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <span className="text-xl font-black text-text-primary block leading-tight">
              {metrics?.active_kit_mappings ?? 0}
            </span>
            <span className="text-[11px] font-semibold text-text-muted truncate block">Active Kit Mappings</span>
          </div>
        </div>

        {/* KPI 8: Inactive Kit Mappings */}
        <div
          onClick={() => navigate("/admin-panel/solar-shop/warehouse-kit-activations")}
          className="bg-surface border border-border hover:border-border/80 rounded-2xl p-4 shadow-2xs hover:shadow-md transition-all cursor-pointer flex items-center gap-3"
        >
          <div className="w-10 h-10 rounded-xl bg-surface-elevated text-text-muted flex items-center justify-center shrink-0 border border-border">
            <FiPackage className="w-5 h-5 opacity-50" />
          </div>
          <div className="min-w-0">
            <span className="text-xl font-black text-text-secondary block leading-tight">
              {metrics?.inactive_kit_mappings ?? 0}
            </span>
            <span className="text-[11px] font-semibold text-text-muted truncate block">Disabled Kits</span>
          </div>
        </div>

        {/* KPI 9: Total Inventory Units */}
        <div
          className="bg-surface border border-border rounded-2xl p-4 shadow-2xs flex items-center gap-3"
        >
          <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-500 flex items-center justify-center shrink-0">
            <FiActivity className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <span className="text-xl font-black text-text-primary block leading-tight">
              {(metrics?.total_inventory_units ?? 0).toLocaleString()}
            </span>
            <span className="text-[11px] font-semibold text-text-muted truncate block">Total Stock Units</span>
          </div>
        </div>

        {/* KPI 10: Stock Discrepancies */}
        <div
          className={`border rounded-2xl p-4 shadow-2xs flex items-center gap-3 ${(metrics?.stock_discrepancies || 0) > 0
            ? "bg-red-500/5 border-red-500/30 text-red-600"
            : "bg-surface border-border text-text-muted"
            }`}
        >
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${(metrics?.stock_discrepancies || 0) > 0 ? "bg-red-500/15 text-red-500" : "bg-surface-elevated"
            }`}>
            <FiAlertCircle className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <span className="text-xl font-black text-text-primary block leading-tight">
              {metrics?.stock_discrepancies ?? 0}
            </span>
            <span className="text-[11px] font-semibold text-text-muted truncate block">Stock Discrepancies</span>
          </div>
        </div>
      </div>

      {/* ── Interactive Live Map View ────────────────────────────────────────── */}
      {viewMode === "map" && (
        <WarehouseMapSection
          warehouses={filteredWarehouses}
          onOpenChecklist={(whId) => setChecklistWhId(whId)}
          onOpenInspection={(wh) => setInspectionWh(wh)}
          onOpenCommercials={(wh) => setCommercialsWh(wh)}
          onNavigateDetails={(whId) => navigate(`edit-warehouse/${whId}`)}
          onConfigureKits={(wh) => {
            const cSlug = (wh.country || "india").toLowerCase();
            navigate(`/admin-panel/solar-shop/${cSlug}/warehouse-kit-activations/${wh.id}`);
          }}
        />
      )}

      {/* ── Search & Filter Controls (Grid View) ────────────────────────────── */}
      {viewMode === "grid" && (
        <>
          <div className="card shadow-xs overflow-hidden bg-surface border border-border rounded-3xl mb-6">
            <div className="p-6 md:p-8">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div className="flex-1 relative">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search by warehouse name, code, address, vendor, or district..."
                    className="w-full h-[52px] bg-bg border-2 border-border/85 rounded-2xl px-5 pl-12 focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/5 transition-all text-sm font-medium text-text-primary"
                  />
                  <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-text-muted" />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery("")}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary"
                    >
                      <FaTimes />
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <ToggleButton
                    label="Active Only"
                    checked={showActive}
                    onChange={setShowActive}
                    className="h-[52px] px-5 rounded-2xl border border-border"
                  />

                  <Button
                    onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                    variant={showAdvancedFilters ? "outline" : "secondary"}
                    leftIcon={<FiSliders className="w-4 h-4" />}
                    rightIcon={showAdvancedFilters ? <FiChevronUp className="w-3.5 h-3.5" /> : <FiChevronDown className="w-3.5 h-3.5" />}
                    className="h-[52px] py-0 rounded-2xl shadow-xs px-6"
                  >
                    <span className="flex items-center gap-1.5">
                      <span>Filters</span>
                      {activeFilterCount > 0 && (
                        <span className="w-5 h-5 rounded-full bg-primary text-white text-[10px] font-bold flex items-center justify-center shadow-sm shrink-0">
                          {activeFilterCount}
                        </span>
                      )}
                    </span>
                  </Button>

                  {activeFilterCount > 0 && (
                    <Button
                      onClick={clearFilters}
                      variant="ghost"
                      leftIcon={<FiRefreshCw className="w-3.5 h-3.5" />}
                      className="h-[52px] py-0 rounded-2xl px-5 text-text-secondary hover:text-danger hover:bg-danger/5 transition-all"
                    >
                      Reset
                    </Button>
                  )}
                </div>
              </div>

              {/* Collapsible Filter Details */}
              <AnimatePresence>
                {showAdvancedFilters && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.25, ease: "easeInOut" }}
                    className="overflow-hidden"
                  >
                    <div className="pt-6 mt-6 border-t border-border/50 space-y-6">
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                        <DropdownWithSearchInput
                          label="Country"
                          value={filterCountry}
                          onChange={(v) => {
                            setFilterCountry(v);
                            setFilterState("");
                            setFilterDistrict("");
                          }}
                          options={countries}
                          placeholder="All Countries"
                          className="w-full"
                        />
                        <DropdownWithSearchInput
                          label="State"
                          value={filterState}
                          onChange={(v) => {
                            setFilterState(v);
                            setFilterDistrict("");
                          }}
                          options={states}
                          placeholder="All States"
                          className="w-full"
                          disabled={!filterCountry && states.length === 0}
                        />
                        <DropdownWithSearchInput
                          label="District"
                          value={filterDistrict}
                          onChange={(v) => setFilterDistrict(v)}
                          options={districts}
                          placeholder="All Districts"
                          className="w-full"
                          disabled={!filterState && districts.length === 0}
                        />

                        <div>
                          <label className="text-xs font-semibold text-text-secondary block mb-1.5">
                            Warehouse Type
                          </label>
                          <select
                            value={filterWarehouseType}
                            onChange={(e) => setFilterWarehouseType(e.target.value)}
                            className="w-full h-10 px-3 text-xs rounded-xl border border-border bg-surface text-text-primary focus:outline-none focus:border-primary"
                          >
                            <option value="">All Types (Company & 3PL)</option>
                            <option value="company">Company Warehouse</option>
                            <option value="3pl">3PL Warehouse</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Loading */}
          {loading && (
            <div className="min-h-100 flex items-center justify-center">
              <Loader text="Loading warehouses..." />
            </div>
          )}

          {/* Empty State */}
          {!loading && filteredWarehouses.length === 0 && (
            <div className="card shadow-sm hover:shadow-md transition-all duration-300">
              <div className="p-6">
                <div className="bg-linear-120 from-primary/5 to-primary/10 rounded-xl border-2 border-dashed border-primary/30 p-12 text-center">
                  <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
                    <FiMap className="text-primary text-3xl" />
                  </div>
                  <h3 className="text-xl font-semibold text-text-primary mb-2">No warehouses found</h3>
                  <p className="text-text-secondary max-w-md mx-auto text-sm mb-6">
                    {warehouses.length === 0
                      ? "No warehouses have been registered yet. Click 'Add Warehouse' to onboard your first facility."
                      : "No facilities match your active search filters."}
                  </p>
                  <div className="flex flex-col sm:flex-row gap-3 justify-center">
                    {activeFilterCount > 0 && (
                      <Button onClick={clearFilters} variant="secondary">
                        Clear all filters
                      </Button>
                    )}
                    <Button onClick={handleAddWarehouse} variant="primary" leftIcon={<FiPlus />}>
                      Add Warehouse
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Warehouse Card Grid */}
          {!loading && filteredWarehouses.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
              {filteredWarehouses.map((w, ind) => {
                const statusInfo = getStatusInfo(w);
                const StatusIcon = statusInfo.icon;
                const isCompany = w.warehouse_type === "company";
                const is3PL = w.warehouse_type === "3pl";
                const whId = String(w.id || w._id || "");
                const whCov = warehouseCoverageMap.get(whId) || {
                  assignedStates: [],
                  assignedStatesCount: 0,
                  activeClusters: [],
                  activeClustersCount: 0,
                  inactiveClustersCount: 0,
                  totalClustersInAssignedStates: 0,
                  coveredDistricts: [],
                  coveredDistrictsCount: 0,
                  stateBreakdowns: [],
                  isMapped: false
                };
                const whTheme = warehouseColorMap.get(whId);

                return (
                  <div
                    key={w.id || `wh-${ind}`}
                    className="card rounded-3xl overflow-hidden bg-surface border border-border shadow-xs hover:shadow-xl hover:scale-[1.008] transition-all flex flex-col group h-full relative"
                  >
                    {/* Image Header with Badge Overlay */}
                    <div className="relative overflow-hidden h-44 shrink-0 bg-surface-elevated">
                      {w.images?.length > 0 ? (
                        <CardImageSlider
                          images={w.images.map((img) => `${img}`)}
                          height="100%"
                          aspectRatio="auto"
                        />
                      ) : (
                        <div className="h-full w-full flex items-center justify-center bg-linear-to-tr from-primary/10 via-primary/5 to-transparent relative group">
                          <img
                            src={isCompany
                              ? "https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=800&auto=format&fit=crop&q=80"
                              : "https://images.unsplash.com/photo-1578575437130-527eed3abbec?w=800&auto=format&fit=crop&q=80"
                            }
                            alt={w.warehouse_name || w.warehouse_code}
                            className="w-full h-full object-cover opacity-90 group-hover:scale-105 transition-transform duration-300"
                          />
                          <div className="absolute inset-0 bg-linear-to-t from-black/60 via-transparent to-black/30 pointer-events-none" />
                        </div>
                      )}

                      {/* Top Badges */}
                      <div className="absolute top-3 left-3 z-10 flex flex-wrap gap-2 items-center">
                        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider backdrop-blur-md border shadow-xs ${isCompany
                          ? "bg-emerald-950/70 text-emerald-300 border-emerald-500/30"
                          : "bg-blue-950/70 text-blue-300 border-blue-500/30"
                          }`}>
                          {isCompany ? <FiHome className="w-3 h-3" /> : <FiTruck className="w-3 h-3" />}
                          {isCompany ? "Company Warehouse" : "3PL Partner"}
                        </span>

                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider backdrop-blur-md border ${w.is_active === 1 || w.is_active === true
                          ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
                          : "bg-amber-500/20 text-amber-300 border-amber-500/40"
                          }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${w.is_active ? "bg-emerald-400" : "bg-amber-400"}`} />
                          {w.is_active ? "Active" : "Inactive"}
                        </span>
                      </div>

                      {/* Code Badge */}
                      <div className="absolute bottom-3 left-3 z-10">
                        <span className="font-mono text-xs font-bold px-2.5 py-1 rounded-lg bg-black/60 text-white backdrop-blur-md border border-white/20">
                          {w.warehouse_code}
                        </span>
                      </div>
                    </div>

                    {/* Body Info */}
                    <div className="p-5 flex flex-col flex-1 space-y-3.5">
                      {/* Name & Vendor */}
                      <div>
                        <h3 className="text-base font-bold text-text-primary group-hover:text-primary transition-colors line-clamp-1" title={w.warehouse_name || w.warehouse_code}>
                          {w.warehouse_name || w.warehouse_code}
                        </h3>
                        {is3PL && (
                          <p className="text-xs font-semibold text-blue-600 dark:text-blue-400 mt-0.5 flex items-center gap-1">
                            <FiTruck className="w-3 h-3" />
                            Vendor: {w.vendor_name || w.vendor?.company_name || "Logistics Partner"}
                          </p>
                        )}
                        <p className="text-xs text-text-muted flex items-center gap-1 mt-1">
                          <FiMapPin className="w-3 h-3 text-primary shrink-0" />
                          <span>{w.district}, {w.state} ({w.pincode || "Pincode N/A"})</span>
                        </p>
                      </div>

                      {/* Metrics Strip */}
                      <div className="grid grid-cols-2 gap-2 text-xs bg-surface-elevated/70 p-3 rounded-2xl border border-border">
                        <div>
                          <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider block">Active Kits</span>
                          <span className="font-black text-text-primary text-sm flex items-center gap-1">
                            <FiPackage className="w-3.5 h-3.5 text-primary" />
                            {w.active_kits_count || 0} Kits
                          </span>
                        </div>
                        <div>
                          <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider block">Max Capacity</span>
                          <span className="font-black text-text-primary text-sm">
                            {Number(w.warehouse_area_sqft) > 0
                              ? `${Number(w.warehouse_area_sqft).toLocaleString()} sq. ft.`
                              : "Configurable"}
                          </span>
                        </div>
                      </div>

                      {/* Clickable Live Routing Coverage Strip (States, Clusters, Districts) */}
                      <button
                        type="button"
                        onClick={() => setCoverageModalWh(w)}
                        className="w-full text-left bg-surface-elevated/50 hover:bg-primary/5 border border-border hover:border-primary/40 rounded-2xl p-3 transition-all cursor-pointer group/cov space-y-2"
                        title="Click to inspect assigned states, active clusters, and covered districts"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-text-muted flex items-center gap-1.5">
                            <span
                              className="w-2 h-2 rounded-full shrink-0"
                              style={{ backgroundColor: whTheme?.fill || "#059669" }}
                            />
                            Routing Coverage
                          </span>
                          <span className="text-[10px] font-bold text-primary flex items-center gap-1 group-hover/cov:translate-x-0.5 transition-transform">
                            {whCov.isMapped ? (
                              <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                                {whCov.activeClustersCount}/{whCov.totalClustersInAssignedStates} Active
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-full bg-bg text-text-muted border border-border">
                                Not Mapped
                              </span>
                            )}
                            <FiChevronRight className="w-3.5 h-3.5" />
                          </span>
                        </div>

                        <div className="grid grid-cols-3 gap-2 text-center">
                          <div className="bg-surface rounded-xl py-1.5 px-2 border border-border/70">
                            <span className="text-sm font-black text-text-primary block leading-tight">
                              {whCov.assignedStatesCount}
                            </span>
                            <span className="text-[10px] font-semibold text-text-muted block">
                              {whCov.assignedStatesCount === 1 ? "State" : "States"}
                            </span>
                          </div>
                          <div className="bg-surface rounded-xl py-1.5 px-2 border border-border/70">
                            <span className="text-sm font-black text-emerald-600 dark:text-emerald-400 block leading-tight">
                              {whCov.activeClustersCount}
                            </span>
                            <span className="text-[10px] font-semibold text-text-muted block">
                              Active Clusters
                            </span>
                          </div>
                          <div className="bg-surface rounded-xl py-1.5 px-2 border border-border/70">
                            <span className="text-sm font-black text-text-primary block leading-tight">
                              {whCov.coveredDistrictsCount}
                            </span>
                            <span className="text-[10px] font-semibold text-text-muted block">
                              {whCov.coveredDistrictsCount === 1 ? "District" : "Districts"}
                            </span>
                          </div>
                        </div>

                        {whCov.assignedStates.length > 0 && (
                          <div className="text-[11px] text-text-secondary flex items-center justify-between gap-2 pt-0.5">
                            <span className="truncate">
                              <strong className="text-text-primary">Linked:</strong> {whCov.assignedStates.join(", ")}
                            </span>
                            {whCov.inactiveClustersCount > 0 && (
                              <span className="text-[10px] font-bold text-amber-600 shrink-0">
                                {whCov.inactiveClustersCount} inactive
                              </span>
                            )}
                          </div>
                        )}
                      </button>

                      {/* Operational Permissions Indicators */}
                      <div className="flex items-center justify-between text-[11px] pt-1 border-t border-border/50 text-text-secondary">
                        <span className="text-[10px] uppercase font-bold text-text-muted">Permissions:</span>
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${w.operational_permissions?.inward ? "bg-emerald-500/10 text-emerald-600" : "bg-bg text-text-muted opacity-50"}`}>
                            Inward
                          </span>
                          <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${w.operational_permissions?.outward ? "bg-emerald-500/10 text-emerald-600" : "bg-bg text-text-muted opacity-50"}`}>
                            Outward
                          </span>
                          <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${w.operational_permissions?.dispatch ? "bg-emerald-500/10 text-emerald-600" : "bg-bg text-text-muted opacity-50"}`}>
                            Dispatch
                          </span>
                        </div>
                      </div>

                      {/* Contextual Action Buttons */}
                      <div className="pt-3 border-t border-border/60 flex flex-col gap-2 mt-auto">
                        {/* Company Inactive -> 10-Gate Checklist */}
                        {isCompany && !w.is_active && (
                          <Button
                            variant="primary"
                            size="sm"
                            className="w-full justify-center bg-emerald-600 hover:bg-emerald-700 text-white font-bold border-none"
                            onClick={() => setChecklistWhId(w.id)}
                          >
                            <FiCheckSquare className="w-3.5 h-3.5 mr-1.5" />
                            10-Gate Activation Checklist
                          </Button>
                        )}

                        {/* 3PL Inactive -> Inspect & Verify Facility */}
                        {is3PL && !w.is_active && (
                          <Button
                            variant="primary"
                            size="sm"
                            className="w-full justify-center bg-blue-600 hover:bg-blue-700 text-white font-bold border-none"
                            onClick={() => setInspectionWh(w)}
                          >
                            <FiTruck className="w-3.5 h-3.5 mr-1.5" />
                            Conduct 3PL Inspection & Details
                          </Button>
                        )}

                        {/* 3PL Active -> Inspection & Details Audit */}
                        {is3PL && w.is_active && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="w-full justify-center border-blue-500/30 text-blue-600 hover:bg-blue-500/10 font-medium"
                            onClick={() => setInspectionWh(w)}
                          >
                            <FiShield className="w-3.5 h-3.5 mr-1.5" />
                            3PL Inspection & Facility Details
                          </Button>
                        )}

                        <div className="grid grid-cols-2 gap-2">
                          <Button
                            variant="secondary"
                            size="sm"
                            className="justify-center text-xs"
                            onClick={() => {
                              const cSlug = (w.country || "india").toLowerCase();
                              navigate(`/admin-panel/solar-shop/${cSlug}/warehouse-kit-activations/${w.id}`);
                            }}
                          >
                            <FiPackage className="w-3.5 h-3.5 mr-1" />
                            Configure Kits
                          </Button>

                          <Button
                            variant="outline"
                            size="sm"
                            className="justify-center text-xs"
                            onClick={() => navigate(`edit-warehouse/${w.id}`)}
                          >
                            <FiEdit2 className="w-3.5 h-3.5 mr-1" />
                            Edit Facility
                          </Button>
                        </div>

                        {is3PL && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="w-full justify-center text-xs border-amber-500/30 text-amber-600 hover:bg-amber-500/10"
                            onClick={() => setCommercialsWh(w)}
                          >
                            <FaRupeeSign className="w-3.5 h-3.5 mr-1" />
                            Commercial Terms & SLA
                          </Button>
                        )}

                        {/* Extra controls (Edit & Suspend) */}
                        <div className="flex items-center justify-between pt-1">
                          <button
                            type="button"
                            onClick={() => navigate(`edit-warehouse/${w.id}`)}
                            className="text-xs text-text-muted hover:text-primary transition-colors flex items-center gap-1 cursor-pointer"
                          >
                            <FiEdit2 className="w-3 h-3" />
                            Edit Location
                          </button>

                          <button
                            type="button"
                            onClick={() => setSuspendPopup({
                              open: true,
                              warehouse: w,
                              action: w.is_active ? "suspend" : "activate"
                            })}
                            className={`text-xs font-semibold transition-colors flex items-center gap-1 cursor-pointer ${w.is_active
                              ? "text-amber-500 hover:text-amber-600"
                              : "text-emerald-500 hover:text-emerald-600"
                              }`}
                          >
                            {w.is_active ? (
                              <>
                                <FiPauseCircle className="w-3.5 h-3.5" />
                                Suspend Hub
                              </>
                            ) : (
                              <>
                                <FiPlayCircle className="w-3.5 h-3.5" />
                                Reactivate
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* ── Bottom Live Territory Map Button & Interactive India Coverage Map ── */}
          {!loading && warehouses.length > 0 && (
            <div className="space-y-4 pt-2">
              <div className="bg-surface border border-border rounded-3xl p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-start sm:items-center gap-3.5">
                  <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                    <FiMap className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-text-primary flex items-center gap-2 flex-wrap">
                      India Warehouse & Cluster Coverage Map
                      <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-primary/10 text-primary">
                        Live Order Management Sync
                      </span>
                    </h3>
                    <p className="text-xs text-text-secondary mt-0.5">
                      {coverageSummaryStats.mappedWarehouses} Mapped Hubs • {coverageSummaryStats.totalStates} Assigned States •{" "}
                      {coverageSummaryStats.totalActiveClusters} Active Clusters • {coverageSummaryStats.totalDistricts} Covered Districts
                    </p>
                  </div>
                </div>

                <Button
                  type="button"
                  variant={showCoverageMap ? "outline" : "primary"}
                  leftIcon={<FiMap className="w-4 h-4" />}
                  onClick={() => {
                    const next = !showCoverageMap;
                    setShowCoverageMap(next);
                    if (next) {
                      setTimeout(() => {
                        coverageMapRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
                      }, 100);
                    }
                  }}
                >
                  {showCoverageMap ? "Hide Coverage Map" : "View Live Coverage Map"}
                </Button>
              </div>

              {showCoverageMap && (
                <div ref={coverageMapRef} className="scroll-mt-6">
                  <WarehouseIndiaCoverageMap
                    warehouses={filteredWarehouses.length > 0 ? filteredWarehouses : warehouses}
                    warehouseCoverageMap={warehouseCoverageMap}
                    warehouseColorMap={warehouseColorMap}
                    geoData={geoData}
                    loadingGeo={loadingGeo}
                    geoError={geoError}
                    onRetryGeo={loadIndiaGeoJson}
                    onOpenCoverageModal={(wh) => setCoverageModalWh(wh)}
                    onNavigateEdit={(whId) => navigate(`edit-warehouse/${whId}`)}
                    initialSelectedWarehouseId={mapFocusWhId}
                    onCloseMap={() => setShowCoverageMap(false)}
                  />
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* ── Modals ───────────────────────────────────────────────────────────── */}

      {/* 0. Warehouse Territory, Cluster & District Breakdown Modal */}
      {coverageModalWh && (() => {
        const modalWhId = String(coverageModalWh.id || coverageModalWh._id);
        const modalCov = warehouseCoverageMap.get(modalWhId) || {
          assignedStates: [],
          assignedStatesCount: 0,
          activeClusters: [],
          activeClustersCount: 0,
          inactiveClustersCount: 0,
          totalClustersInAssignedStates: 0,
          coveredDistricts: [],
          coveredDistrictsCount: 0,
          stateBreakdowns: [],
          isMapped: false
        };
        const modalTheme = warehouseColorMap.get(modalWhId);
        const cSlug = (coverageModalWh.country || "india").toLowerCase();

        return (
          <Dialog
            isOpen={Boolean(coverageModalWh)}
            onClose={() => setCoverageModalWh(null)}
            title={`Warehouse Territory Coverage: ${coverageModalWh.warehouse_name || coverageModalWh.warehouse_code}`}
            size="lg"
            footer={
              <div className="flex flex-wrap items-center justify-between gap-2 w-full">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  leftIcon={<FiExternalLink className="w-3.5 h-3.5" />}
                  onClick={() => {
                    setCoverageModalWh(null);
                    navigate(`/admin-panel/solar-shop/${cSlug}/order-management-settings/cluster-routing`);
                  }}
                >
                  Manage in Cluster Routing
                </Button>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    leftIcon={<FiMap className="w-3.5 h-3.5" />}
                    onClick={() => {
                      setMapFocusWhId(modalWhId);
                      setShowCoverageMap(true);
                      setViewMode("grid");
                      setCoverageModalWh(null);
                      setTimeout(() => {
                        coverageMapRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
                      }, 120);
                    }}
                  >
                    Show on Coverage Map
                  </Button>
                  <Button type="button" variant="primary" size="sm" onClick={() => setCoverageModalWh(null)}>
                    Close
                  </Button>
                </div>
              </div>
            }
          >
            <div className="space-y-5">
              {/* Warehouse Summary Banner */}
              <div className="p-4 rounded-2xl bg-surface-elevated/70 border border-border flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span
                      className="w-3 h-3 rounded-full shrink-0"
                      style={{ backgroundColor: modalTheme?.fill || "#059669" }}
                    />
                    <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-surface border border-border text-text-primary">
                      {coverageModalWh.warehouse_code}
                    </span>
                    <span
                      className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full ${
                        coverageModalWh.is_active
                          ? "bg-emerald-500/15 text-emerald-600"
                          : "bg-amber-500/15 text-amber-600"
                      }`}
                    >
                      {coverageModalWh.is_active ? "Active Facility" : "Pending / Inactive"}
                    </span>
                    <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-bg border border-border text-text-secondary">
                      {coverageModalWh.warehouse_type === "3pl" ? "3PL Partner" : "Company Warehouse"}
                    </span>
                  </div>
                  <p className="text-xs text-text-muted flex items-center gap-1">
                    <FiMapPin className="w-3.5 h-3.5 text-primary shrink-0" />
                    {coverageModalWh.district}, {coverageModalWh.state} ({coverageModalWh.pincode || "N/A"})
                  </p>
                </div>

                <div className="text-left sm:text-right bg-surface px-3.5 py-2 rounded-xl border border-border">
                  <span className="text-[10px] uppercase font-bold text-text-muted block">Max Capacity</span>
                  <span className="text-sm font-black text-text-primary">
                    {Number(coverageModalWh.warehouse_area_sqft) > 0
                      ? `${Number(coverageModalWh.warehouse_area_sqft).toLocaleString()} sq. ft.`
                      : "Configurable"}
                  </span>
                </div>
              </div>

              {/* 4 KPI Summary Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3.5 rounded-2xl bg-surface-elevated border border-border">
                  <span className="text-[10px] uppercase font-bold text-text-muted block">Linked States</span>
                  <span className="text-2xl font-black text-text-primary">{modalCov.assignedStatesCount}</span>
                </div>
                <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20">
                  <span className="text-[10px] uppercase font-bold text-emerald-700 dark:text-emerald-400 block">
                    Active Clusters
                  </span>
                  <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
                    {modalCov.activeClustersCount}
                  </span>
                </div>
                <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/20">
                  <span className="text-[10px] uppercase font-bold text-amber-700 dark:text-amber-400 block">
                    Inactive in State(s)
                  </span>
                  <span className="text-2xl font-black text-amber-600 dark:text-amber-400">
                    {modalCov.inactiveClustersCount}
                  </span>
                </div>
                <div className="p-3.5 rounded-2xl bg-primary/10 border border-primary/20">
                  <span className="text-[10px] uppercase font-bold text-primary block">Covered Districts</span>
                  <span className="text-2xl font-black text-primary">{modalCov.coveredDistrictsCount}</span>
                </div>
              </div>

              {/* State-by-State Cluster & District Breakdown */}
              {modalCov.stateBreakdowns.length === 0 ? (
                <div className="p-8 text-center rounded-2xl border-2 border-dashed border-border bg-surface-elevated/30 space-y-2">
                  <FiLayers className="w-8 h-8 text-text-muted mx-auto opacity-60" />
                  <h4 className="text-sm font-bold text-text-primary">No States or Clusters Assigned Yet</h4>
                  <p className="text-xs text-text-muted max-w-md mx-auto">
                    This warehouse has not been mapped to any fulfillment states or franchise clusters in Order Management Cluster Routing yet.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {modalCov.stateBreakdowns.map((st) => (
                    <div key={st.stateName} className="rounded-2xl border border-border overflow-hidden bg-surface">
                      <div className="px-4 py-3 bg-surface-elevated/80 border-b border-border flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <FiMapPin className="w-4 h-4 text-primary" />
                          <span className="font-bold text-sm text-text-primary">{st.stateName}</span>
                        </div>
                        <div className="flex flex-wrap items-center gap-2 text-xs font-bold">
                          <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 border border-emerald-500/20">
                            {st.activeCount} / {st.totalClustersInState} Clusters Active
                          </span>
                          {st.inactiveCount > 0 && (
                            <span className="px-2.5 py-0.5 rounded-full bg-amber-500/15 text-amber-600 border border-amber-500/20">
                              {st.inactiveCount} Not Active Yet
                            </span>
                          )}
                          <span className="px-2.5 py-0.5 rounded-full bg-bg border border-border text-text-secondary">
                            {st.districtCount} {st.districtCount === 1 ? "District" : "Districts"}
                          </span>
                        </div>
                      </div>

                      <div className="p-4 space-y-4">
                        {st.isFullStateCoverage && (
                          <div className="p-3 rounded-xl bg-bg/60 border border-dashed border-border text-xs text-text-secondary">
                            <strong className="text-text-primary">Full State Coverage:</strong> No sub-clusters are defined in {st.stateName}. All districts in this state route to this hub.
                          </div>
                        )}

                        {st.activeClusters.length > 0 && (
                          <div className="space-y-2">
                            <h5 className="text-[11px] font-bold uppercase tracking-wider text-emerald-600 flex items-center gap-1.5">
                              <FiCheckCircle className="w-3.5 h-3.5" />
                              Active Clusters ({st.activeClusters.length})
                            </h5>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                              {st.activeClusters.map((cl) => (
                                <div
                                  key={cl.cluster_id}
                                  className="p-3.5 rounded-xl bg-emerald-500/5 border border-emerald-500/25 space-y-2"
                                >
                                  <div className="flex items-start justify-between gap-2">
                                    <div className="min-w-0">
                                      <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded bg-surface border border-border text-emerald-700 dark:text-emerald-400">
                                        {cl.cluster_code}
                                      </span>
                                      <h6 className="font-bold text-sm text-text-primary mt-1 truncate">
                                        {cl.cluster_name}
                                      </h6>
                                    </div>
                                    <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 shrink-0">
                                      {(cl.district_names || []).length} Districts
                                    </span>
                                  </div>
                                  {cl.district_names?.length > 0 ? (
                                    <div className="flex flex-wrap gap-1.5">
                                      {cl.district_names.map((dist) => (
                                        <span
                                          key={dist}
                                          className="text-[11px] px-2 py-0.5 rounded-md bg-surface border border-border text-text-primary font-medium"
                                        >
                                          {dist}
                                        </span>
                                      ))}
                                    </div>
                                  ) : (
                                    <p className="text-[11px] text-text-muted italic">No districts listed</p>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {st.inactiveClusters.length > 0 && (
                          <div className="space-y-2 pt-2 border-t border-border/50">
                            <h5 className="text-[11px] font-bold uppercase tracking-wider text-amber-600 flex items-center gap-1.5">
                              <FiClock className="w-3.5 h-3.5" />
                              Not Active Yet in {st.stateName} ({st.inactiveClusters.length})
                            </h5>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                              {st.inactiveClusters.map((cl) => (
                                <div
                                  key={cl.cluster_id}
                                  className="p-3.5 rounded-xl bg-amber-500/5 border border-dashed border-amber-500/30 space-y-2 opacity-85"
                                >
                                  <div className="flex items-start justify-between gap-2">
                                    <div className="min-w-0">
                                      <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded bg-surface border border-border text-amber-700 dark:text-amber-400">
                                        {cl.cluster_code}
                                      </span>
                                      <h6 className="font-bold text-sm text-text-primary mt-1 truncate">
                                        {cl.cluster_name}
                                      </h6>
                                    </div>
                                    <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-700 dark:text-amber-300 shrink-0">
                                      {(cl.district_names || []).length} Districts
                                    </span>
                                  </div>
                                  {cl.district_names?.length > 0 && (
                                    <div className="flex flex-wrap gap-1.5">
                                      {cl.district_names.map((dist) => (
                                        <span
                                          key={dist}
                                          className="text-[11px] px-2 py-0.5 rounded-md bg-surface border border-border text-text-muted"
                                        >
                                          {dist}
                                        </span>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </Dialog>
        );
      })()}

      {/* 1. Company Warehouse 10-Gate Activation Modal */}
      {checklistWhId && (
        <CompanyActivationModal
          warehouseId={checklistWhId}
          isOpen={Boolean(checklistWhId)}
          onClose={() => setChecklistWhId(null)}
          onSuccess={fetchWarehouses}
          moduleUniqueId={moduleUniqueId}
        />
      )}

      {/* 2. 3PL Warehouse Inspection Modal */}
      {inspectionWh && (
        <ThreePLInspectionModal
          warehouse={inspectionWh}
          isOpen={Boolean(inspectionWh)}
          onClose={() => setInspectionWh(null)}
          onSuccess={fetchWarehouses}
          moduleUniqueId={moduleUniqueId}
        />
      )}

      {/* 3. 3PL Commercial Terms & SLA Modal */}
      {commercialsWh && (
        <ThreePLCommercialsModal
          warehouse={commercialsWh}
          isOpen={Boolean(commercialsWh)}
          onClose={() => setCommercialsWh(null)}
          onSuccess={fetchWarehouses}
          moduleUniqueId={moduleUniqueId}
        />
      )}

      {/* 4. 3PL Vendor Onboarding & Verification Modal */}
      <ThreePLVendorManagementModal
        isOpen={vendorModalOpen}
        onClose={() => setVendorModalOpen(false)}
        onVendorSelected={(vendor) => {
          navigate("add-warehouse");
        }}
        moduleUniqueId={moduleUniqueId}
      />

      {/* 5. Suspend / Reactivate Confirmation Popup */}
      <ConfirmationPopup
        isOpen={suspendPopup.open}
        onClose={() => setSuspendPopup({ open: false, warehouse: null, action: "suspend" })}
        onConfirm={handleToggleStatus}
        title={suspendPopup.action === "suspend" ? "Suspend Warehouse" : "Reactivate Warehouse"}
        message={
          suspendPopup.action === "suspend"
            ? `Are you sure you want to suspend '${suspendPopup.warehouse?.warehouse_name || suspendPopup.warehouse?.warehouse_code}'? It will temporarily be excluded from new order allocation, but all historical order records will be retained.`
            : `Reactivate '${suspendPopup.warehouse?.warehouse_name || suspendPopup.warehouse?.warehouse_code}' to restore it as an active fulfillment hub?`
        }
        confirmText={suspendPopup.action === "suspend" ? "Suspend" : "Reactivate"}
        confirmVariant={suspendPopup.action === "suspend" ? "danger" : "primary"}
      />
    </div>
  );
}
