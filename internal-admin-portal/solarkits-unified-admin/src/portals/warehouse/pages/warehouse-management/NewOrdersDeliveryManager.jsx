import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  HiOutlineSearch, HiOutlineFilter, HiOutlineRefresh,
  HiOutlineCheckCircle, HiOutlineClock, HiOutlineExclamation,
  HiOutlineTruck, HiOutlineLocationMarker, HiOutlineClipboardCheck,
  HiOutlineCube, HiOutlineEye, HiOutlineChevronDown, HiOutlineChevronUp
} from 'react-icons/hi';
import {
  FaBoxes, FaTruck, FaMapMarkerAlt, FaCalendarAlt,
  FaCheckCircle, FaSpinner, FaClock, FaExchangeAlt, FaHistory,
  FaPhoneAlt, FaEnvelope, FaShieldAlt, FaExternalLinkAlt,
  FaLayerGroup, FaArrowRight, FaArrowLeft, FaLock, FaWarehouse,
  FaBuilding, FaTools, FaBarcode, FaExclamationTriangle,
  FaCheckDouble, FaWrench, FaClipboardCheck, FaPlus, FaCube, FaCheck, FaPaperPlane
} from 'react-icons/fa';
import { useDispatch } from 'react-redux';
import { setAlert } from '@/features/alert.slice';

import {
  getDeliveryOrders,
  reserveDeliveryInventory,
  requestDeliveryOrderProcurement,
  inwardDeliveryOrder,
  claimIncomingShipment,
  sendOrderForDelivery,
  recordInwardDiscrepancy,
  updateSupplyStatus,
  updateKitAssembly,
  allocatePreassembledKit,
  getBosKitCatalog
} from '../../api/deliveryOrders';

import Button from '../../components/Button';
import Dialog from '../../components/Dialog';
import CustomInput from '../../components/CustomInput';
import DropdownWithSearchInput from '../../components/DropdownWithSearchInput';

export default function NewOrdersDeliveryManager({ onNavigateToOutward, onNavigateToBosKit, defaultTab = 'orders', standaloneBoskit = false }) {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();

  const prefix = location.pathname.startsWith('/warehouse-management-panel')
    ? '/warehouse-management-panel'
    : '/warehouse';

  // Orders State
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState({
    total: 0,
    new_orders: 0,
    ready_for_dispatch: 0,
    in_transit: 0,
    delivered: 0
  });

  // Filters State
  const [search, setSearch] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [selectedQueueTab, setSelectedQueueTab] = useState('all'); // Boss Spec 14 Queue Filters
  const [selectedState, setSelectedState] = useState('all');
  const [selectedDistrict, setSelectedDistrict] = useState('all');
  const [pincodeFilter, setPincodeFilter] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [expandedCards, setExpandedCards] = useState({});

  // View Tab: 'orders' (Delivery Orders Queue) vs 'boskit_station' (BOS Kit Preparation Workstation)
  const [mainSectionTab, setMainSectionTab] = useState(defaultTab);

  // Sync tab with URL route changes (e.g. sidebar navigation between New Orders and BOS Kit Assembly)
  useEffect(() => {
    if (location.pathname.includes('bos-kit-assembly')) {
      setMainSectionTab('boskit_station');
    } else if (location.pathname.includes('new-orders')) {
      setMainSectionTab('orders');
    } else if (defaultTab) {
      setMainSectionTab(defaultTab);
    }
  }, [location.pathname, defaultTab]);

  // Support ?orderId=... query param to auto-focus and expand order in BOS Kit Workstation
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const targetOrderId = params.get('orderId');
    if (targetOrderId && orders.length > 0) {
      const matched = orders.find(o => o._id === targetOrderId || o.order_number === targetOrderId || o.delivery_order_id === targetOrderId);
      if (matched) {
        setMainSectionTab('boskit_station');
        setSelectedOrderForAssembly(matched);
        setExpandedCards(prev => ({ ...prev, [matched._id]: true }));
      }
    }
  }, [location.search, orders]);

  // BOS Kit Workstation Stage Filter
  const [boskitStageFilter, setBoskitStageFilter] = useState('all');

  // Order Details Modal State (Boss requirement: clean card + Eye icon/button popup)
  const [orderDetailsModalOpen, setOrderDetailsModalOpen] = useState(false);
  const [selectedOrderForDetails, setSelectedOrderForDetails] = useState(null);

  // BOSKIT Preparation & Assembly Modal State
  const [assemblyModalOpen, setAssemblyModalOpen] = useState(false);
  const [selectedOrderForAssembly, setSelectedOrderForAssembly] = useState(null);
  const [submittingAssembly, setSubmittingAssembly] = useState(false);
  const [kitBarcodeLabel, setKitBarcodeLabel] = useState('');

  // ── Two-Part BOS Kit Workstation Architecture (Boss Specification) ──
  // Mode: 'order_specific' (Order Fulfillment) vs 'stock_inventory' (Pre-Assembly for Warehouse Stock)
  const [boskitWorkstationMode, setBoskitWorkstationMode] = useState('order_specific');

  // Raw Inward Materials Inventory in Warehouse (Required components for BOS Kit assembly)
  const DEFAULT_RAW_STOCK = [
    { name: 'Black AC Cable – 2.5 sq. mm', sku: 'CAB-POLYC-BLAC-ACCA-2.5MM', category: 'Cables', rack: 'Bay 2 / Cable Rack', qty: 250, unit: 'Mtr' },
    { name: 'Red AC Cable – 2.5 sq. mm', sku: 'CAB-POLYC-REDA-ACCA-2.5MM', category: 'Cables', rack: 'Bay 2 / Cable Rack', qty: 250, unit: 'Mtr' },
    { name: 'BLACK DC CABLE - 2.5 SQ MM', sku: 'CAB-POLYC-BLAC-DCCA-2.5MM', category: 'Cables', rack: 'Bay 2 / Cable Rack', qty: 50, unit: 'Roll' },
    { name: 'RED DC CABLE - 2.5 SQMM', sku: 'CAB-POLYC-REDD-DCCA-2.5MM', category: 'Cables', rack: 'Bay 2 / Cable Rack', qty: 50, unit: 'Roll' },
    { name: 'Lightning Arrestor Cable 16 sq.mm Aluminium', sku: 'CAB-SUNNO-LIGH-LIGH-16SQMM', category: 'Cables', rack: 'Bay 2 / Rack 3', qty: 150, unit: 'Mtr' },
    { name: 'Green Copper Earthing Cable – 2.5 sq. mm', sku: 'CAB-SUNNO-GREE-EART-2.5MM', category: 'Cables', rack: 'Bay 2 / Cable Rack', qty: 180, unit: 'Mtr' },
    { name: 'L T ACDB Single Phase', sku: 'AC-LT-LTAC-SING-16A', category: 'Switchgear', rack: 'Bay 3 / Shelf A', qty: 25, unit: 'Box' },
    { name: 'DCDB', sku: 'DCD-LARSE-DCDB-1STR-1A', category: 'Switchgear', rack: 'Bay 3 / Shelf C', qty: 30, unit: 'Box' },
    { name: 'MC4 CONNECTOR', sku: 'MC4-SIBAS-MC4C-STAN-30A', category: 'Connectors', rack: 'Bay 1 / Bin 05', qty: 120, unit: 'Pairs' },
    { name: 'Earthing Rod', sku: 'EAR-REPUT-EART-COPP-1M', category: 'Earthing', rack: 'Yard / Pallet 4', qty: 40, unit: 'Pcs' },
    { name: 'Earthing Compound', sku: 'EAR-REPUT-EART-CHEM-10KG', category: 'Earthing', rack: 'Bay 1 / Pallet 02', qty: 50, unit: 'Bag (10Kg)' },
    { name: 'Earthing Lugs', sku: 'EAR-REPUT-EART-EART-1', category: 'Earthing', rack: 'Bay 1 / Bin 08', qty: 80, unit: 'Pcs' },
    { name: 'Lightning Arrestor - SIngle Spike', sku: 'LIG-REPUT-LIGH-FRP-1METER', category: 'Protection', rack: 'Bay 3 / Bin 10', qty: 30, unit: 'Pcs' },
    { name: 'UV Resistant Cable Tie', sku: 'UVR-CRETO-UVRE-CABL-1', category: 'Hardware', rack: 'Bay 1 / Bin 02', qty: 400, unit: 'Pcs' },
    { name: 'Single Nail Cable Clamp', sku: 'CLA-REPUT-SING-CABL-1', category: 'Fasteners', rack: 'Bay 1 / Bin 12', qty: 250, unit: 'Pcs' },
    { name: 'PVC Bend (L-Bow)', sku: 'PVC-REPUT-PVCB-PVCB-1', category: 'Conduits', rack: 'Bay 1 / Bin 14', qty: 90, unit: 'Pcs' },
    { name: 'PVC Tee', sku: 'PVC-REPUT-PVCT-PVCT-1', category: 'Conduits', rack: 'Bay 1 / Bin 15', qty: 60, unit: 'Pcs' },
    { name: 'Wire Tap', sku: 'WIR-REPUT-WIRE-WIRE-1', category: 'Hardware', rack: 'Bay 1 / Bin 03', qty: 40, unit: 'Pcs' },
    { name: 'Wall Grip', sku: 'WAL-REPUT-WALL-1235-1235', category: 'Hardware', rack: 'Bay 1 / Bin 04', qty: 100, unit: 'Pcs' },
    { name: 'Screw', sku: 'SCR-REPUT-SCRE-NUTB-1038', category: 'Hardware', rack: 'Bay 1 / Bin 06', qty: 150, unit: 'Pcs' },
    { name: 'LA Clamp', sku: 'CLA-REPUT-LACL-LACL-1', category: 'Protection', rack: 'Bay 3 / Bin 11', qty: 30, unit: 'Pcs' }
  ];

  // Pre-Assembled Warehouse Stock Models (Balance of System Packages ONLY - Panels & Inverters are inwarded separately)
  const DEFAULT_STOCK_MODELS = [
    {
      id: '1kw-dcr',
      name: '1 K.W. Solarkits DCR Kit (BOS & Wiring Package)',
      catalog_name: '1 K.W. Solarkits DCR Kit',
      category: 'Residential BOS Kit',
      capacity: '1 kW',
      storage_location: 'Bay 1 / Pallet A-01',
      ready_stock: 4,
      batch_codes: ['WH-BOS-1KW-2026-D101', 'WH-BOS-1KW-2026-D102', 'WH-BOS-1KW-2026-D103', 'WH-BOS-1KW-2026-D104'],
      bom_components: [
        { name: 'Black AC Cable – 2.5 sq. mm', sku: 'CAB-POLYC-BLAC-ACCA-2.5MM', qty: 15, unit: 'Mtr' },
        { name: 'Red AC Cable – 2.5 sq. mm', sku: 'CAB-POLYC-REDA-ACCA-2.5MM', qty: 15, unit: 'Mtr' },
        { name: 'BLACK DC CABLE - 2.5 SQ MM', sku: 'CAB-POLYC-BLAC-DCCA-2.5MM', qty: 2, unit: 'Roll' },
        { name: 'RED DC CABLE - 2.5 SQMM', sku: 'CAB-POLYC-REDD-DCCA-2.5MM', qty: 2, unit: 'Roll' },
        { name: 'Lightning Arrestor Cable 16 sq.mm Aluminium', sku: 'CAB-SUNNO-LIGH-LIGH-16SQMM', qty: 15, unit: 'Mtr' },
        { name: 'Green Copper Earthing Cable – 2.5 sq. mm', sku: 'CAB-SUNNO-GREE-EART-2.5MM', qty: 15, unit: 'Mtr' },
        { name: 'L T ACDB Single Phase', sku: 'AC-LT-LTAC-SING-16A', qty: 1, unit: 'Box' },
        { name: 'MC4 CONNECTOR', sku: 'MC4-SIBAS-MC4C-STAN-30A', qty: 2, unit: 'Pairs' },
        { name: 'UV Resistant Cable Tie', sku: 'UVR-CRETO-UVRE-CABL-1', qty: 15, unit: 'Pcs' },
        { name: 'Single Nail Cable Clamp', sku: 'CLA-REPUT-SING-CABL-1', qty: 25, unit: 'Pcs' },
        { name: 'PVC Bend (L-Bow)', sku: 'PVC-REPUT-PVCB-PVCB-1', qty: 4, unit: 'Pcs' },
        { name: 'PVC Tee', sku: 'PVC-REPUT-PVCT-PVCT-1', qty: 2, unit: 'Pcs' },
        { name: 'Earthing Lugs', sku: 'EAR-REPUT-EART-EART-1', qty: 4, unit: 'Pcs' },
        { name: 'Earthing Compound', sku: 'EAR-REPUT-EART-CHEM-10KG', qty: 1, unit: 'Bag (10Kg)' },
        { name: 'Lightning Arrestor - SIngle Spike', sku: 'LIG-REPUT-LIGH-FRP-1METER', qty: 1, unit: 'Pcs' },
        { name: 'Earthing Rod', sku: 'EAR-REPUT-EART-COPP-1M', qty: 3, unit: 'Pcs' }
      ]
    },
    {
      id: '2kw-dcr',
      name: '2 K.W. Solarkits DCR Combokit (BOS & Wiring Package)',
      catalog_name: '2 K.W. Solarkits DCR Combokit',
      category: 'Residential BOS Kit',
      capacity: '2 kW',
      storage_location: 'Bay 1 / Pallet B-02',
      ready_stock: 3,
      batch_codes: ['WH-BOS-2KW-2026-D201', 'WH-BOS-2KW-2026-D202', 'WH-BOS-2KW-2026-D203'],
      bom_components: [
        { name: 'Black AC Cable – 2.5 sq. mm', sku: 'CAB-POLYC-BLAC-ACCA-2.5MM', qty: 10, unit: 'Mtr' },
        { name: 'Red AC Cable – 2.5 sq. mm', sku: 'CAB-POLYC-REDA-ACCA-2.5MM', qty: 10, unit: 'Mtr' },
        { name: 'BLACK DC CABLE - 2.5 SQ MM', sku: 'CAB-POLYC-BLAC-DCCA-2.5MM', qty: 25, unit: 'Mtr' },
        { name: 'RED DC CABLE - 2.5 SQMM', sku: 'CAB-POLYC-REDD-DCCA-2.5MM', qty: 25, unit: 'Mtr' },
        { name: 'Lightning Arrestor Cable 16 sq.mm Aluminium', sku: 'CAB-SUNNO-LIGH-LIGH-16SQMM', qty: 25, unit: 'Mtr' },
        { name: 'Green Copper Earthing Cable – 2.5 sq. mm', sku: 'CAB-SUNNO-GREE-EART-2.5MM', qty: 40, unit: 'Mtr' },
        { name: 'L T ACDB Single Phase', sku: 'AC-LT-LTAC-SING-16A', qty: 1, unit: 'Box' },
        { name: 'DCDB', sku: 'DCD-LARSE-DCDB-1STR-1A', qty: 1, unit: 'Box' },
        { name: 'Single Nail Cable Clamp', sku: 'CLA-REPUT-SING-CABL-1', qty: 50, unit: 'Pcs' },
        { name: 'Wire Tap', sku: 'WIR-REPUT-WIRE-WIRE-1', qty: 1, unit: 'Pcs' },
        { name: 'MC4 CONNECTOR', sku: 'MC4-SIBAS-MC4C-STAN-30A', qty: 2, unit: 'Pairs' },
        { name: 'PVC Bend (L-Bow)', sku: 'PVC-REPUT-PVCB-PVCB-1', qty: 20, unit: 'Pcs' },
        { name: 'PVC Tee', sku: 'PVC-REPUT-PVCT-PVCT-1', qty: 10, unit: 'Pcs' },
        { name: 'UV Resistant Cable Tie', sku: 'UVR-CRETO-UVRE-CABL-1', qty: 50, unit: 'Pcs' },
        { name: 'Wall Grip', sku: 'WAL-REPUT-WALL-1235-1235', qty: 10, unit: 'Pcs' },
        { name: 'Screw', sku: 'SCR-REPUT-SCRE-NUTB-1038', qty: 10, unit: 'Pcs' },
        { name: 'LA Clamp', sku: 'CLA-REPUT-LACL-LACL-1', qty: 1, unit: 'Pcs' },
        { name: 'Earthing Lugs', sku: 'EAR-REPUT-EART-EART-1', qty: 5, unit: 'Pcs' },
        { name: 'Earthing Rod', sku: 'EAR-REPUT-EART-COPP-1M', qty: 3, unit: 'Pcs' },
        { name: 'Earthing Compound', sku: 'EAR-REPUT-EART-CHEM-10KG', qty: 1, unit: 'Bag (10Kg)' },
        { name: 'Lightning Arrestor - SIngle Spike', sku: 'LIG-REPUT-LIGH-FRP-1METER', qty: 1, unit: 'Pcs' }
      ]
    },
    {
      id: '3kw-dcr',
      name: '3 KW Solarkits DCR Combokit (BOS & Wiring Package)',
      catalog_name: '3 KW Solarkits DCR Combokit',
      category: 'Residential BOS Kit',
      capacity: '3 kW',
      storage_location: 'Bay 2 / Pallet C-03',
      ready_stock: 2,
      batch_codes: ['WH-BOS-3KW-2026-D301', 'WH-BOS-3KW-2026-D302'],
      bom_components: [
        { name: 'Black AC Cable – 2.5 sq. mm', sku: 'CAB-POLYC-BLAC-ACCA-2.5MM', qty: 10, unit: 'Mtr' },
        { name: 'Red AC Cable – 2.5 sq. mm', sku: 'CAB-POLYC-REDA-ACCA-2.5MM', qty: 10, unit: 'Mtr' },
        { name: 'BLACK DC CABLE - 2.5 SQ MM', sku: 'CAB-POLYC-BLAC-DCCA-2.5MM', qty: 25, unit: 'Mtr' },
        { name: 'RED DC CABLE - 2.5 SQMM', sku: 'CAB-POLYC-REDD-DCCA-2.5MM', qty: 25, unit: 'Mtr' },
        { name: 'Lightning Arrestor Cable 16 sq.mm Aluminium', sku: 'CAB-SUNNO-LIGH-LIGH-16SQMM', qty: 25, unit: 'Mtr' },
        { name: 'Green Copper Earthing Cable – 2.5 sq. mm', sku: 'CAB-SUNNO-GREE-EART-2.5MM', qty: 40, unit: 'Mtr' },
        { name: 'L T ACDB Single Phase', sku: 'AC-LT-LTAC-SING-16A', qty: 1, unit: 'Box' },
        { name: 'DCDB', sku: 'DCD-LARSE-DCDB-1STR-1A', qty: 1, unit: 'Box' },
        { name: 'Single Nail Cable Clamp', sku: 'CLA-REPUT-SING-CABL-1', qty: 50, unit: 'Pcs' },
        { name: 'Wire Tap', sku: 'WIR-REPUT-WIRE-WIRE-1', qty: 1, unit: 'Pcs' },
        { name: 'MC4 CONNECTOR', sku: 'MC4-SIBAS-MC4C-STAN-30A', qty: 2, unit: 'Pairs' },
        { name: 'PVC Bend (L-Bow)', sku: 'PVC-REPUT-PVCB-PVCB-1', qty: 20, unit: 'Pcs' },
        { name: 'PVC Tee', sku: 'PVC-REPUT-PVCT-PVCT-1', qty: 10, unit: 'Pcs' },
        { name: 'UV Resistant Cable Tie', sku: 'UVR-CRETO-UVRE-CABL-1', qty: 50, unit: 'Pcs' },
        { name: 'Wall Grip', sku: 'WAL-REPUT-WALL-1235-1235', qty: 10, unit: 'Pcs' },
        { name: 'Screw', sku: 'SCR-REPUT-SCRE-NUTB-1038', qty: 10, unit: 'Pcs' },
        { name: 'LA Clamp', sku: 'CLA-REPUT-LACL-LACL-1', qty: 1, unit: 'Pcs' },
        { name: 'Earthing Lugs', sku: 'EAR-REPUT-EART-EART-1', qty: 5, unit: 'Pcs' },
        { name: 'Lightning Arrestor - SIngle Spike', sku: 'LIG-REPUT-LIGH-FRP-1METER', qty: 1, unit: 'Pcs' },
        { name: 'Earthing Rod', sku: 'EAR-REPUT-EART-COPP-1M', qty: 3, unit: 'Pcs' },
        { name: 'Earthing Compound', sku: 'EAR-REPUT-EART-CHEM-10KG', qty: 1, unit: 'Bag (10Kg)' }
      ]
    }
  ];

  const [preassembledStock, setPreassembledStock] = useState(() => {
    try {
      const saved = localStorage.getItem('solarkits_preassembled_stock');
      if (saved) {
        const parsed = JSON.parse(saved);
        // Purge old dummy 8-component cache so live database products load
        const hasLegacyDummy = parsed.some(p => (p.bom_components || []).length <= 8);
        if (!hasLegacyDummy && parsed.some(p => p.id === '1kw-dcr' || p.id === '2kw-dcr')) {
          return parsed;
        }
      }
    } catch {
      // ignore localStorage parse error
    }
    return DEFAULT_STOCK_MODELS;
  });

  const [stockAssemblyHistory, setStockAssemblyHistory] = useState(() => {
    try {
      const saved = localStorage.getItem('solarkits_stock_assembly_history');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.some(h => (h.model_name || '').includes('DCR'))) return parsed;
      }
    } catch {
      // ignore localStorage parse error
    }
    return [
      {
        id: 'hist-1',
        model_name: '1 K.W. Solarkits DCR Kit (BOS & Wiring Package)',
        batch_code: 'WH-BOS-1KW-2026-D101, WH-BOS-1KW-2026-D102',
        qty: 2,
        assembled_by: 'Warehouse Technician (Ramesh)',
        storage_location: 'Bay 1 / Pallet A-01',
        timestamp: new Date(Date.now() - 86400000).toISOString()
      },
      {
        id: 'hist-2',
        model_name: '2 K.W. Solarkits DCR Kit (BOS & Wiring Package)',
        batch_code: 'WH-BOS-2KW-2026-D201',
        qty: 1,
        assembled_by: 'QC Specialist (Mukesh)',
        storage_location: 'Bay 1 / Pallet B-02',
        timestamp: new Date(Date.now() - 172800000).toISOString()
      }
    ];
  });

  const totalPreassembledKitsInStock = useMemo(() => {
    return preassembledStock.reduce((acc, m) => acc + (m.ready_stock || 0), 0);
  }, [preassembledStock]);

  // Warehouse Inward Raw Materials Inventory State
  const [warehouseRawStock, setWarehouseRawStock] = useState(() => {
    try {
      const saved = localStorage.getItem('solarkits_warehouse_raw_stock');
      if (saved) return JSON.parse(saved);
    } catch (_) {}
    return DEFAULT_RAW_STOCK;
  });

  // Active Buffer Pre-Assembly Job (Sequential 5-Stage Workstation)
  const [activeBufferJob, setActiveBufferJob] = useState(() => {
    try {
      const saved = localStorage.getItem('solarkits_active_buffer_job');
      if (saved) return JSON.parse(saved);
    } catch (_) {}
    return null;
  });

  // Modal State for Pre-Assembling into Stock (Part 2)
  const [stockAssemblyModalOpen, setStockAssemblyModalOpen] = useState(false);
  const [selectedStockModelId, setSelectedStockModelId] = useState('1kw-dcr');
  const [stockAssembleQty, setStockAssembleQty] = useState(1);
  const [stockAssemblyRack, setStockAssemblyRack] = useState('Bay 1 / Pallet A-01');
  const [stockAssemblyOperator, setStockAssemblyOperator] = useState('Warehouse Assembly Lead');
  const [submittingStockAssembly, setSubmittingStockAssembly] = useState(false);

  // Dedicated Kit Model Detail Workspace (1 kW / 2 kW / 3 kW)
  const [selectedBufferModelId, setSelectedBufferModelId] = useState(null);
  const [focusedOrderId, setFocusedOrderId] = useState(null);

  // Directly navigate & focus onto a specific order's assembly workstation
  const handleOpenOrderAssembly = (ord) => {
    if (!ord) return;
    setOrderDetailsModalOpen(false);
    setInwardModalOpen(false);
    setMainSectionTab('boskit_station');
    setBoskitWorkstationMode('order_specific');
    setSelectedOrderForAssembly(ord);
    setFocusedOrderId(ord._id);
    setTimeout(() => {
      const el = document.getElementById(`boskit-order-${ord._id}`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 250);
  };
  const [manualStepToggle, setManualStepToggle] = useState({});
  const [step1RequisitionQty, setStep1RequisitionQty] = useState(5);

  // Auto-sync requisitions & raw stock when returning from other tabs/portals
  useEffect(() => {
    const syncLocalStorage = () => {
      try {
        const savedReqs = localStorage.getItem('solarkits_buffer_requisitions');
        if (savedReqs) setBufferRequisitions(JSON.parse(savedReqs));
        const savedStock = localStorage.getItem('solarkits_warehouse_raw_stock');
        if (savedStock) setWarehouseRawStock(JSON.parse(savedStock));
      } catch (_) {}
    };
    window.addEventListener('storage', syncLocalStorage);
    window.addEventListener('focus', syncLocalStorage);
    return () => {
      window.removeEventListener('storage', syncLocalStorage);
      window.removeEventListener('focus', syncLocalStorage);
    };
  }, []);
  const [bufferRequisitions, setBufferRequisitions] = useState(() => {
    try {
      const saved = localStorage.getItem('solarkits_buffer_requisitions');
      if (saved) return JSON.parse(saved);
    } catch (_) {}
    return {};
  });

  // Modal State for 1-Click Allocating from Ready Stock to Customer Order (Part 1)
  const [stockAllocateModalOpen, setStockAllocateModalOpen] = useState(false);
  const [orderForStockAllocation, setOrderForStockAllocation] = useState(null);
  const [selectedAllocateModelId, setSelectedAllocateModelId] = useState('1kw-dcr');
  const [allocateKitQty, setAllocateKitQty] = useState(1);
  const [submittingStockAllocation, setSubmittingStockAllocation] = useState(false);

  // Inward Modal State
  const [inwardModalOpen, setInwardModalOpen] = useState(false);
  const [selectedOrderForInward, setSelectedOrderForInward] = useState(null);
  const [inwardInputs, setInwardInputs] = useState({});
  const [inwardRemarks, setInwardRemarks] = useState('');
  const [supplierInvoiceNo, setSupplierInvoiceNo] = useState('');
  const [invoiceDate, setInvoiceDate] = useState('');
  const [defaultStorageRack, setDefaultStorageRack] = useState('BAY-A1-01');
  const [qcPassed, setQcPassed] = useState(true);
  const [damageNotes, setDamageNotes] = useState('');
  const [submittingInward, setSubmittingInward] = useState(false);
  const [activeInwardTab, setActiveInwardTab] = useState('inward'); // 'inward' or 'history'

  // Inward Enhanced Options: 2 Types (Warehouse Dock vs Direct Pickup) & 2 Execution Modes (Manual vs Scanner Gun)
  const [inwardType, setInwardType] = useState('warehouse'); // 'warehouse' | 'pickup_location'
  const [inwardExecutionMode, setInwardExecutionMode] = useState('manual'); // 'manual' | 'scanner'
  const [pickupLocationDetails, setPickupLocationDetails] = useState({
    location_name: '',
    address: '',
    contact_person: '',
    contact_phone: ''
  });
  const [scannerInput, setScannerInput] = useState('');
  const [scannedSerials, setScannedSerials] = useState([]);

  // Reserve Inventory Modal State
  const [reserveModalOpen, setReserveModalOpen] = useState(false);
  const [selectedOrderForReserve, setSelectedOrderForReserve] = useState(null);
  const [selectedItemForReserve, setSelectedItemForReserve] = useState(null);
  const [reserveQtyInput, setReserveQtyInput] = useState(0);
  const [submittingReserve, setSubmittingReserve] = useState(false);

  // Account Panel Procurement Requisition Modal State
  const [procureModalOpen, setProcureModalOpen] = useState(false);
  const [selectedOrderForProcure, setSelectedOrderForProcure] = useState(null);
  const [selectedItemForProcure, setSelectedItemForProcure] = useState(null);
  const [selectedProcureModelId, setSelectedProcureModelId] = useState('1kw-dcr');
  const [procureQtyInput, setProcureQtyInput] = useState(1);
  const [procureNotes, setProcureNotes] = useState('');
  const [submittingProcure, setSubmittingProcure] = useState(false);

  // Send for Delivery State & Handler
  const [sendingOrderId, setSendingOrderId] = useState(null);

  // Helper to check if an item is specifically the pre-assembled finished BOS Kit package
  const isBosKitItem = (it) => {
    if (!it) return false;
    const sku = (it.sku || '').toUpperCase();
    const name = (it.product_name || '').toLowerCase();
    const cat = (it.category || '').toLowerCase();

    // Strict exclusion: rails, clamps, hardware, fasteners, bolts, cables
    if (sku.includes('RAIL') || sku.includes('CLAMP') || sku.includes('FASTENER') || sku.includes('BOLT') ||
        cat.includes('structure') || cat.includes('fastener') || name.includes('rail') || name.includes('clamp') || name.includes('bolt') || name.includes('fastener')) {
      return false;
    }

    return cat.includes('bos kit') || 
           sku.startsWith('BOS-KIT-') || 
           name.startsWith('bos kit') || 
           it.is_synthesized_bos_kit || 
           it.is_bos_kit;
  };

  // Centralized helper to extract true kit count & capacity for any delivery order dynamically
  const getOrderKitMetrics = (ord) => {
    if (!ord) return { totalKits: 1, capacity: '3 kW', modelName: 'Solarkits DCR Combokit' };

    // 1. Extract from EPC array (dynamic order data from Account Manager / Solar Shop)
    let epcKits = 0;
    let cap = ord.system_capacity || '';
    let model = ord.solarkit_model || '';

    if (ord.epcs && ord.epcs.length > 0) {
      epcKits = ord.epcs.reduce((acc, epc) => {
        const match = (epc.boskit_qty || '').match(/(\d+)/) ||
                      (epc.inverter_qty || '').match(/(\d+)/);
        return acc + (match ? parseInt(match[1], 10) : 0);
      }, 0);
      if (!cap) {
        cap = ord.epcs.find(e => e.system_capacity)?.system_capacity || '';
      }
      if (!model) {
        model = ord.epcs.find(e => e.solarkit_model)?.solarkit_model || '';
      }
    }

    // 2. Scan items for inverters (1 inverter = 1 kit) and panels (e.g. 9 panels/kit)
    const items = ord.items || [];
    let inverterCount = 0;
    let panelKits = 0;
    let fallbackHardwareKits = 0;

    for (const it of items) {
      const name = (it.product_name || it.name || '').toLowerCase();
      const sku = (it.sku || '').toUpperCase();
      const cat = (it.category || '').toLowerCase();

      // Inverter: 1 inverter = 1 kit
      if (cat === 'inverter' || name.includes('inverter') || sku.includes('HAV-') || sku.includes('INV-')) {
        if ((it.ordered_qty || 0) > inverterCount) inverterCount = it.ordered_qty;
        const capMatch = (it.product_name || '').match(/(\d+)\s*k[wv]/i) || sku.match(/(\d+)KW/i);
        if (capMatch && !cap) cap = `${capMatch[1]} kW`;
      }

      // Panels: 9 panels = 1 kit (e.g. 225 panels = 25 kits, 630 panels = 70 kits)
      if (cat.includes('panel') || name.includes('module') || name.includes('panel')) {
        const pQty = it.ordered_qty || 0;
        if (pQty > 0) {
          const fromPanels = Math.round(pQty / 9);
          if (fromPanels > panelKits) panelKits = fromPanels;
        }
      }

      // Strict hardware check: NEVER match cables (e.g. "Lightning Arrestor Cable" is a cable, NOT an arrestor!)
      const isCableOrClamp = name.includes('cable') || sku.includes('CAB-') || sku.includes('CLA-') || sku.includes('UVR-') || sku.includes('PVC-') || sku.includes('SCR-');
      if (!isCableOrClamp) {
        if (sku.includes('ACDB') || name.includes('acdb')) {
          if ((it.ordered_qty || 0) > fallbackHardwareKits) fallbackHardwareKits = it.ordered_qty;
        }
        if (sku.startsWith('LIG-') || (name.includes('lightning arrestor') && !name.includes('cable'))) {
          if ((it.ordered_qty || 0) > fallbackHardwareKits) fallbackHardwareKits = it.ordered_qty;
        }
      }
    }

    // 3. Resolve true totalKits dynamically (Ground Truth: num_kits / total_kits / BOS kit item / epc.boskit_qty)
    const rawBos = (ord.items || []).find(it => isBosKitItem(it));
    let epcBosKits = 0;
    if (ord.epcs && ord.epcs.length > 0) {
      epcBosKits = ord.epcs.reduce((acc, epc) => {
        const match = (epc.boskit_qty || '').match(/(\d+)/);
        return acc + (match ? parseInt(match[1], 10) : 0);
      }, 0);
    }

    let kits = Number(ord.num_kits) || 
               Number(ord.total_kits) || 
               (rawBos ? rawBos.ordered_qty : 0) ||
               epcBosKits ||
               epcKits || 
               inverterCount || 
               panelKits || 
               fallbackHardwareKits || 
               1;

    if (!kits) kits = 1;
    if (!cap) cap = '3 kW';
    if (!model) model = `${cap} Solarkits DCR Combokit`;

    return { totalKits: kits, capacity: cap, modelName: model };
  };

  // Centralized helper that returns all items for an order, including the synthesized BOS kit package item with its accurate ordered, received, and pending quantities
  const getOrderItemsWithKit = (ord) => {
    if (!ord) return [];
    const items = (ord.items || []).map(it => ({ ...it }));
    const existingBosIndex = items.findIndex(it => isBosKitItem(it));
    const { totalKits, capacity } = getOrderKitMetrics(ord);

    const actualReceivedKits = existingBosIndex >= 0
      ? (items[existingBosIndex].received_qty || 0)
      : (ord.inward_status === 'fully_inwarded' ? totalKits : 0);
    const pendingKits = Math.max(0, totalKits - actualReceivedKits);

    const cleanCap = (capacity || '3 kW').replace(/\s+/g, '');
    const bosSku = `BOS-KIT-${cleanCap.toUpperCase()}-STD`;
    const bosProductName = `BOS Kit (${capacity || '3 kW'} Pre-assembled Electrical Package - ACDB/DCDB/Cables)`;

    if (existingBosIndex >= 0) {
      if (items[existingBosIndex].ordered_qty !== totalKits) {
        items[existingBosIndex].ordered_qty = totalKits;
        items[existingBosIndex].pending_qty = Math.max(0, totalKits - (items[existingBosIndex].received_qty || 0));
      }
      if (!items[existingBosIndex].product_name?.includes(capacity)) {
        items[existingBosIndex].product_name = bosProductName;
      }
    } else if (ord.kit_preparation_status && ord.kit_preparation_status !== 'not_required') {
      items.push({
        sku: bosSku,
        product_name: bosProductName,
        category: 'BOS Kit',
        ordered_qty: totalKits,
        received_qty: actualReceivedKits,
        pending_qty: pendingKits,
        damaged_qty: 0,
        missing_qty: 0,
        rack_location: ord.kit_assembly_details?.storage_location || 'BAY-BOS-STOCK',
        is_synthesized_bos_kit: true
      });
    }

    return items;
  };

  const handleOpenDetailsModal = (order) => {
    setSelectedOrderForDetails(order);
    setOrderDetailsModalOpen(true);
  };

  const handleOpenAssemblyModal = (order) => {
    setSelectedOrderForAssembly(order);
    setKitBarcodeLabel(order.kit_assembly_details?.kit_serial_barcode || `SK-KIT-${order.order_number}-${Date.now().toString().slice(-4)}`);
    setAssemblyModalOpen(true);
  };

  const handleAdvanceAssembly = async (stage, targetOrder = null) => {
    const orderToUpdate = targetOrder || selectedOrderForAssembly;
    if (!orderToUpdate) return;

    // Prerequisite: Check if supplier raw materials have been inwarded in New Orders
    const nonBosPending = (orderToUpdate.items || [])
      .filter(it => !isBosKitItem(it))
      .reduce((acc, it) => acc + (it.pending_qty || 0), 0);
    if (nonBosPending > 0) {
      dispatch(setAlert({
        message: `⚠️ Pehle New Orders tab me 'Inward Material' button se ${nonBosPending} units raw material inward karein, uske baad kit assembly shuru karein!`,
        type: 'warning'
      }));
      return;
    }

    try {
      setSubmittingAssembly(true);
      const barcode = kitBarcodeLabel || orderToUpdate.kit_assembly_details?.kit_serial_barcode || `SK-KIT-${orderToUpdate.order_number}-${Date.now().toString().slice(-4)}`;
      const res = await updateKitAssembly(orderToUpdate._id, {
        stage,
        kit_serial_barcode: barcode
      });
      if (res.status === 'success') {
        dispatch(setAlert({ message: res.message, type: 'success' }));
        if (selectedOrderForAssembly && selectedOrderForAssembly._id === orderToUpdate._id) {
          setSelectedOrderForAssembly(res.data);
        }
        await fetchOrders();
      }
    } catch (err) {
      dispatch(setAlert({
        message: err.response?.data?.message || 'Failed to update kit assembly stage.',
        type: 'error'
      }));
    } finally {
      setSubmittingAssembly(false);
    }
  };

  // 1-Click Allocation from Ready Warehouse Stock to a Customer Order (Part 1)
  const handleOpenStockAllocationModal = (order) => {
    setOrderForStockAllocation(order);
    const { totalKits, capacity } = getOrderKitMetrics(order);
    const cleanCap = (capacity || '').toLowerCase().replace(/\s+/g, '').replace('kw', '');
    let matchedModel = preassembledStock.find(m => cleanCap && m.capacity.toLowerCase().replace(/\s+/g, '').includes(cleanCap));
    if (!matchedModel) {
      matchedModel = preassembledStock.find(m => m.ready_stock > 0) || preassembledStock[0];
    }
    setSelectedAllocateModelId(matchedModel?.id || '3kw-dcr');
    setAllocateKitQty(totalKits || 1);
    setStockAllocateModalOpen(true);
  };

  const handleConfirmStockAllocation = async () => {
    if (!orderForStockAllocation) return;
    const model = preassembledStock.find(m => m.id === selectedAllocateModelId);
    if (!model || model.ready_stock <= 0) {
      dispatch(setAlert({
        message: 'Selected BOS Kit model has 0 ready stock in warehouse. Please pre-assemble kits or assemble on workstation.',
        type: 'warning'
      }));
      return;
    }

    const { totalKits } = getOrderKitMetrics(orderForStockAllocation);
    const qtyToAllocate = Math.max(1, Math.min(model.ready_stock, allocateKitQty || totalKits || 1));

    try {
      setSubmittingStockAllocation(true);
      const batchCode = model.batch_codes && model.batch_codes.length > 0
        ? model.batch_codes[0]
        : `WH-STOCK-KIT-${orderForStockAllocation.order_number}-${Date.now().toString().slice(-4)}`;

      // Call backend to update order
      await allocatePreassembledKit(orderForStockAllocation._id, {
        kit_model_name: model.name,
        batch_code: batchCode,
        allocated_qty: qtyToAllocate,
        notes: `Allocated ${qtyToAllocate} ready kit(s) from warehouse pre-assembled inventory (${model.name}).`
      });

      // Deduct qtyToAllocate from local ready stock
      const updatedStock = preassembledStock.map(m => {
        if (m.id === model.id) {
          const remainingBatches = (m.batch_codes || []).slice(qtyToAllocate);
          return {
            ...m,
            ready_stock: Math.max(0, m.ready_stock - qtyToAllocate),
            batch_codes: remainingBatches
          };
        }
        return m;
      });
      setPreassembledStock(updatedStock);
      try {
        localStorage.setItem('solarkits_preassembled_stock', JSON.stringify(updatedStock));
      } catch {
        // ignore localStorage write error
      }

      dispatch(setAlert({
        message: `✓ ${qtyToAllocate} Pre-assembled BOS Kit(s) (${model.name}) allocated from warehouse stock to Order #${orderForStockAllocation.order_number}! Order is now ready for dispatch.`,
        type: 'success'
      }));

      setStockAllocateModalOpen(false);
      setOrderForStockAllocation(null);
      await fetchOrders();
    } catch (err) {
      console.error(err);
      dispatch(setAlert({
        message: err.response?.data?.message || 'Failed to allocate pre-assembled kit from stock.',
        type: 'error'
      }));
    } finally {
      setSubmittingStockAllocation(false);
    }
  };

  // ── Raw Material Stock Inward Validation for BOS Kits ──
  const checkRawMaterialStock = (model, qty) => {
    if (!model || !model.bom_components || model.bom_components.length === 0) {
      return { hasShortage: false, items: [] };
    }
    const items = model.bom_components.map(comp => {
      const required = (comp.qty || 1) * qty;
      const compNameClean = (comp.name || '').toLowerCase().replace(/[^a-z0-9]/g, '');
      const matched = warehouseRawStock.find(r => {
        const rawNameClean = (r.name || '').toLowerCase().replace(/[^a-z0-9]/g, '');
        return r.sku === comp.sku ||
               rawNameClean === compNameClean ||
               rawNameClean.includes(compNameClean) ||
               compNameClean.includes(rawNameClean);
      });
      const available = matched ? (matched.qty || 0) : 0;
      const isShort = available < required;
      return {
        name: comp.name,
        sku: comp.sku || matched?.sku || 'BOS-RAW',
        category: matched?.category || 'Components',
        rack: matched?.rack || 'Bay 2 / Shelves',
        required,
        available,
        unit: comp.unit || matched?.unit || 'Pcs',
        isShort
      };
    });
    const hasShortage = items.some(i => i.isShort);
    return { hasShortage, items };
  };

  // Start 5-Stage Buffer Assembly Job (Replaces instant magic addition)
  const handleStartBufferAssemblyJob = (e) => {
    if (e) e.preventDefault();
    const qty = parseInt(stockAssembleQty) || 1;
    if (qty <= 0) {
      dispatch(setAlert({ message: 'Please enter a valid quantity to assemble.', type: 'warning' }));
      return;
    }
    const model = preassembledStock.find(m => m.id === selectedStockModelId);
    if (!model) return;

    // Prerequisite: Check if required raw materials are inwarded
    const { hasShortage, items } = checkRawMaterialStock(model, qty);
    if (hasShortage) {
      const shortList = items.filter(i => i.isShort).map(i => i.name).slice(0, 3).join(', ');
      dispatch(setAlert({
        message: `Assembly Locked! Raw materials not inwarded: ${shortList}. Pehle 'Material Inward' tab me jakar material inward karein!`,
        type: 'warning'
      }));
      return;
    }

    try {
      setSubmittingStockAssembly(true);
      const newBatches = [];
      const yr = new Date().getFullYear();
      const randCode = Date.now().toString().slice(-4);
      for (let i = 0; i < qty; i++) {
        newBatches.push(`WH-BOS-${model.id.toUpperCase()}-${yr}-${randCode}${i + 1}`);
      }

      const newJob = {
        job_id: `BUFF-JOB-${model.id.toUpperCase()}-${randCode}`,
        model_id: model.id,
        model_name: model.name,
        category: model.category,
        capacity: model.capacity,
        qty,
        target_rack: stockAssemblyRack || model.storage_location,
        technician: stockAssemblyOperator || 'Warehouse Assembly Lead',
        bom_components: model.bom_components || [],
        current_stage: 1, // 1 to 5 sequential stages
        started_at: new Date().toISOString(),
        batches: newBatches
      };

      setActiveBufferJob(newJob);
      try {
        localStorage.setItem('solarkits_active_buffer_job', JSON.stringify(newJob));
      } catch (_) {}

      setStockAssemblyModalOpen(false);
      dispatch(setAlert({
        message: `🚀 Buffer Assembly Job started for ${qty} Kit(s)! Proceed with Stage 1: Raw Material Picking.`,
        type: 'info'
      }));
    } finally {
      setSubmittingStockAssembly(false);
    }
  };

  // Start Assembly directly for a given model and quantity
  const handleStartAssemblyForModel = (model, qty = 1) => {
    if (!model) return;
    const num = parseInt(qty) || 1;
    setSelectedStockModelId(model.id);
    setStockAssembleQty(num);
    setStockAssemblyRack(model.storage_location || 'Bay 1 / Pallet A-01');

    const { hasShortage, items } = checkRawMaterialStock(model, num);
    if (hasShortage) {
      const shortList = items.filter(i => i.isShort).map(i => i.name).slice(0, 3).join(', ');
      dispatch(setAlert({
        message: `Assembly Locked! Raw materials not inwarded: ${shortList}. Pehle 'Material Inward' tab me jakar material inward karein!`,
        type: 'warning'
      }));
      return;
    }

    try {
      setSubmittingStockAssembly(true);
      const newBatches = [];
      const yr = new Date().getFullYear();
      const randCode = Date.now().toString().slice(-4);
      for (let i = 0; i < num; i++) {
        newBatches.push(`WH-BOS-${model.id.toUpperCase()}-${yr}-${randCode}${i + 1}`);
      }

      const newJob = {
        job_id: `BUFF-JOB-${model.id.toUpperCase()}-${randCode}`,
        model_id: model.id,
        model_name: model.name,
        category: model.category,
        capacity: model.capacity,
        qty: num,
        target_rack: model.storage_location || 'Bay 1 / Pallet A-01',
        technician: stockAssemblyOperator || 'Warehouse Assembly Lead',
        bom_components: model.bom_components || [],
        current_stage: 1,
        started_at: new Date().toISOString(),
        batches: newBatches
      };

      setActiveBufferJob(newJob);
      try {
        localStorage.setItem('solarkits_active_buffer_job', JSON.stringify(newJob));
      } catch (_) {}

      dispatch(setAlert({
        message: `🚀 Buffer Assembly Job started for ${num} Kit(s)! Proceed with Stage 1: Raw Material Picking.`,
        type: 'info'
      }));
    } finally {
      setSubmittingStockAssembly(false);
    }
  };

  // Reset Buffer Workflow for a model so user can requisition a fresh batch
  const handleResetModelBufferWorkflow = (modelId) => {
    const updated = { ...bufferRequisitions };
    delete updated[modelId];
    setBufferRequisitions(updated);
    try {
      localStorage.setItem('solarkits_buffer_requisitions', JSON.stringify(updated));
    } catch (_) {}
    setManualStepToggle({ 1: true });
    dispatch(setAlert({ message: 'Reset buffer workflow. You can now send a new material requisition.', type: 'info' }));
  };

  // Advance Buffer Assembly Stage (1 -> 2 -> 3 -> 4 -> 5)
  const handleAdvanceBufferStage = (targetStage) => {
    if (!activeBufferJob) return;
    const nextStage = targetStage !== undefined ? targetStage : activeBufferJob.current_stage + 1;
    if (nextStage > 5) return;

    const updatedJob = {
      ...activeBufferJob,
      current_stage: nextStage
    };
    setActiveBufferJob(updatedJob);
    try {
      localStorage.setItem('solarkits_active_buffer_job', JSON.stringify(updatedJob));
    } catch (_) {}

    const stageNames = {
      2: 'Stage 2: Wiring & Enclosure Assembly',
      3: 'Stage 3: Electrical QC Inspection',
      4: 'Stage 4: Packaging & Buffer Batch Labeling',
      5: 'Stage 5: Final Buffer Rack Placement'
    };

    dispatch(setAlert({
      message: `Progressed to ${stageNames[nextStage]}!`,
      type: 'success'
    }));
  };

  // Finalize Buffer Stock & Add to WH Inventory (Stage 5 completion)
  const handleFinalizeBufferStock = () => {
    if (!activeBufferJob) return;
    const { model_id, qty, target_rack, technician, batches } = activeBufferJob;
    const model = preassembledStock.find(m => m.id === model_id);
    if (!model) return;

    // Deduct consumed raw materials
    const updatedRawStock = warehouseRawStock.map(r => {
      const comp = (model.bom_components || []).find(c => {
        const cNameClean = (c.name || '').toLowerCase().replace(/[^a-z0-9]/g, '');
        const rNameClean = (r.name || '').toLowerCase().replace(/[^a-z0-9]/g, '');
        return r.sku === c.sku || rNameClean === cNameClean || rNameClean.includes(cNameClean) || cNameClean.includes(rNameClean);
      });
      if (comp) {
        const consumed = (comp.qty || 1) * qty;
        return { ...r, qty: Math.max(0, r.qty - consumed) };
      }
      return r;
    });
    setWarehouseRawStock(updatedRawStock);
    try {
      localStorage.setItem('solarkits_warehouse_raw_stock', JSON.stringify(updatedRawStock));
    } catch (_) {}

    // Credit kits to ready_stock
    const updatedStock = preassembledStock.map(m => {
      if (m.id === model.id) {
        return {
          ...m,
          ready_stock: (m.ready_stock || 0) + qty,
          batch_codes: [...(m.batch_codes || []), ...batches],
          storage_location: target_rack || m.storage_location
        };
      }
      return m;
    });
    setPreassembledStock(updatedStock);
    try {
      localStorage.setItem('solarkits_preassembled_stock', JSON.stringify(updatedStock));
    } catch (_) {}

    // Log in production history
    const newHistItem = {
      id: `hist-${Date.now()}`,
      model_name: model.name,
      batch_code: batches.join(', '),
      qty,
      assembled_by: technician || 'Warehouse Assembly Team',
      storage_location: target_rack || model.storage_location,
      timestamp: new Date().toISOString()
    };
    const updatedHistory = [newHistItem, ...stockAssemblyHistory];
    setStockAssemblyHistory(updatedHistory);
    try {
      localStorage.setItem('solarkits_stock_assembly_history', JSON.stringify(updatedHistory));
    } catch (_) {}

    // Clear completed buffer requisition for this model
    try {
      const savedReqs = JSON.parse(localStorage.getItem('solarkits_buffer_requisitions') || '{}');
      if (savedReqs[model.id]) {
        delete savedReqs[model.id];
        localStorage.setItem('solarkits_buffer_requisitions', JSON.stringify(savedReqs));
      }
    } catch (_) {}
    setBufferRequisitions(prev => {
      const copy = { ...prev };
      delete copy[model.id];
      return copy;
    });

    // Close stepper & return directly to Model Cards overview with updated kit counts
    setSelectedModelForStockRequisition(null);
    setSelectedBufferModelId(null);
    setManualStepToggle({});
    setActiveBufferJob(null);
    try {
      localStorage.removeItem('solarkits_active_buffer_job');
    } catch (_) {}

    window.dispatchEvent(new Event('warehouseInventoryUpdated'));

    dispatch(setAlert({
      message: `🎉 Successfully completed assembly of ${qty} kit(s)! Added to Warehouse Ready Stock with ${batches.length} new batch codes (Stored at ${target_rack}).`,
      type: 'success'
    }));
  };

  // Abort Buffer Job
  const handleAbortBufferJob = () => {
    setActiveBufferJob(null);
    try {
      localStorage.removeItem('solarkits_active_buffer_job');
    } catch (_) {}
    dispatch(setAlert({ message: 'Buffer assembly job cancelled.', type: 'info' }));
  };

  // Reset Model Stock to Clean Default (Fix for the 26 kits and 24 batch codes)
  const handleResetModelStock = (modelId) => {
    const updatedStock = preassembledStock.map(m => {
      if (m.id === modelId) {
        const cleanCount = m.id === '1kw-dcr' ? 4 : m.id === '2kw-dcr' ? 3 : 2;
        const cleanBatches = Array.from({ length: cleanCount }, (_, i) => 
          `WH-BOS-${(m.capacity || m.id).toUpperCase().replace(/\s+/g, '')}-2026-D${i + 1}01`
        );
        return {
          ...m,
          ready_stock: cleanCount,
          batch_codes: cleanBatches
        };
      }
      return m;
    });
    setPreassembledStock(updatedStock);
    try {
      localStorage.setItem('solarkits_preassembled_stock', JSON.stringify(updatedStock));
    } catch (_) {}
    dispatch(setAlert({ message: `Reset stock for model to clean default (${3} kits).`, type: 'info' }));
  };

  // Quick Inward Raw Materials (Testing helper)
  const handleQuickInwardRawStock = (modelId, qty = 2) => {
    const model = preassembledStock.find(m => m.id === modelId) || preassembledStock[0];
    if (!model) return;
    const updated = warehouseRawStock.map(r => {
      const comp = (model.bom_components || []).find(c => {
        const cNameClean = (c.name || '').toLowerCase().replace(/[^a-z0-9]/g, '');
        const rNameClean = (r.name || '').toLowerCase().replace(/[^a-z0-9]/g, '');
        return r.sku === c.sku || rNameClean === cNameClean || rNameClean.includes(cNameClean) || cNameClean.includes(rNameClean);
      });
      if (comp) {
        return { ...r, qty: r.qty + (comp.qty * qty * 2) + 20 };
      }
      return r;
    });
    setWarehouseRawStock(updated);
    try {
      localStorage.setItem('solarkits_warehouse_raw_stock', JSON.stringify(updated));
    } catch (_) {}
    dispatch(setAlert({
      message: `Inwarded bulk raw materials into warehouse stock for "${model.name}". Materials are now sufficient for assembly!`,
      type: 'success'
    }));
  };

  // Simulate Shortage (Testing helper)
  const handleSimulateShortage = (modelId) => {
    const model = preassembledStock.find(m => m.id === modelId) || preassembledStock[0];
    if (!model) return;
    const shortNames = (model.bom_components || []).slice(0, 3).map(c => (c.name || '').toLowerCase().replace(/[^a-z0-9]/g, ''));
    const updated = warehouseRawStock.map(r => {
      const rNameClean = (r.name || '').toLowerCase().replace(/[^a-z0-9]/g, '');
      if (shortNames.some(s => rNameClean.includes(s) || s.includes(rNameClean))) {
        return { ...r, qty: 0 };
      }
      return r;
    });
    setWarehouseRawStock(updated);
    try {
      localStorage.setItem('solarkits_warehouse_raw_stock', JSON.stringify(updated));
    } catch (_) {}
    dispatch(setAlert({
      message: `Simulated raw material shortage for "${model.name}". Inward is now required before assembly!`,
      type: 'warning'
    }));
  };

  const handleSendForDelivery = async (order) => {
    const allItems = getOrderItemsWithKit(order);
    const totalPendingItems = allItems.reduce((acc, it) => acc + (it.pending_qty || 0), 0);
    if (totalPendingItems > 0) {
      dispatch(setAlert({
        message: `Send for Delivery locked! ${totalPendingItems} units must be inwarded first.`,
        type: 'warning'
      }));
      return;
    }

    const isKitReady = order.kit_preparation_status === 'kit_ready' ||
                       order.kit_preparation_status === 'not_required';
    if (!isKitReady) {
      dispatch(setAlert({
        message: 'Send for Delivery locked! BOS Kit preparation/allocation is pending. Please allocate or inward/assemble the BOS Kit first.',
        type: 'warning'
      }));
      return;
    }

    try {
      setSendingOrderId(order._id);
      const res = await sendOrderForDelivery(order._id);
      if (res.status === 'success') {
        dispatch(setAlert({
          message: res.message || 'Order successfully sent for delivery! Transferred to Out for Delivery.',
          type: 'success'
        }));
        await fetchOrders();
        if (onNavigateToOutward) {
          onNavigateToOutward(order);
        } else {
          navigate(`${prefix}/out-for-delivery`);
        }
      }
    } catch (err) {
      dispatch(setAlert({
        message: err.response?.data?.message || 'Failed to send order for delivery.',
        type: 'error'
      }));
    } finally {
      setSendingOrderId(null);
    }
  };

  const handleSendForBosKit = async (order) => {
    const totalPendingItems = (order.items || []).reduce((acc, it) => acc + (it.pending_qty || 0), 0);
    if (totalPendingItems > 0) {
      dispatch(setAlert({
        message: `BOS Kit Assembly locked! ${totalPendingItems} units must be inwarded first (click "Inward Material").`,
        type: 'warning'
      }));
      return;
    }

    try {
      setSendingOrderId(order._id);
      const res = await updateKitAssembly(order._id, {
        stage: 'ready_for_assembly',
        notes: 'Inwarding completed. Order transferred to BOS Kit Assembly workstation.'
      });
      if (res.status === 'success') {
        dispatch(setAlert({
          message: `Order #${order.order_number} successfully sent to BOS Kit Assembly!`,
          type: 'success'
        }));
        await fetchOrders();
        if (onNavigateToBosKit) {
          onNavigateToBosKit(order);
        } else {
          navigate(`${prefix}/bos-kit-assembly`);
        }
      }
    } catch (err) {
      dispatch(setAlert({
        message: err.response?.data?.message || 'Failed to send order for BOS Kit Assembly.',
        type: 'error'
      }));
    } finally {
      setSendingOrderId(null);
    }
  };

  // Claim Incoming Shipment State & Handler
  const [claimingShipmentId, setClaimingShipmentId] = useState(null);

  const handleClaimShipment = async (order) => {
    try {
      setClaimingShipmentId(order._id);
      const res = await claimIncomingShipment(order._id, {
        dock_bay: order.incoming_truck_group?.unloaded_dock || 'Receiving Dock #2',
        remarks: `Consignment claimed from incoming truck ${order.incoming_truck_group?.vehicle_number || ''}`
      });
      if (res.status === 'success') {
        dispatch(setAlert({
          message: res.message || 'Incoming truck goods claimed & received at warehouse dock!',
          type: 'success'
        }));
        fetchOrders();
      }
    } catch (err) {
      dispatch(setAlert({
        message: err.response?.data?.message || 'Failed to claim incoming shipment.',
        type: 'error'
      }));
    } finally {
      setClaimingShipmentId(null);
    }
  };

  // Load orders
  const fetchOrders = async () => {
    try {
      setLoading(true);
      const params = {};
      if (selectedStatus !== 'all') params.status = selectedStatus;
      if (selectedState !== 'all') params.state = selectedState;
      if (selectedDistrict !== 'all') params.district = selectedDistrict;
      if (pincodeFilter.trim()) params.pincode = pincodeFilter.trim();
      if (search.trim()) params.search = search.trim();
      if (dateFilter) {
        params.startDate = dateFilter;
        params.endDate = dateFilter;
      }

      const res = await getDeliveryOrders(params);
      if (res.status === 'success') {
        setOrders(res.data || []);
        if (res.summary) {
          setSummary(res.summary);
          window.dispatchEvent(new CustomEvent('deliveryOrdersUpdated', { detail: res.summary }));
        }
      }
    } catch (err) {
      console.error('Failed to fetch delivery orders:', err);
      dispatch(setAlert({ message: 'Failed to load delivery orders', type: 'error' }));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, [selectedStatus, selectedState, selectedDistrict, pincodeFilter, dateFilter]);

  // Load dynamic BOS Kit catalog from backend (connected to Solar Shop products)
  useEffect(() => {
    const fetchCatalog = async () => {
      try {
        const res = await getBosKitCatalog();
        if (res.status === 'success' && Array.isArray(res.data) && res.data.length > 0) {
          setPreassembledStock(prev => {
            const merged = res.data.map(catItem => {
              const match = prev.find(p => p.id === catItem.id || p.catalog_name === catItem.catalog_name || p.capacity === catItem.capacity);
              return {
                ...catItem,
                ready_stock: match ? match.ready_stock : catItem.ready_stock,
                batch_codes: match ? match.batch_codes : catItem.batch_codes
              };
            });
            try {
              localStorage.setItem('solarkits_preassembled_stock', JSON.stringify(merged));
            } catch (_) {}
            return merged;
          });
        }
      } catch (e) {
        console.warn('Could not load dynamic BOS kit catalog, using defaults:', e);
      }
    };
    fetchCatalog();
  }, []);

  // Handle Search on Enter or debounce
  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchOrders();
  };

  // Extract unique states and districts for filters
  const stateOptions = useMemo(() => {
    const states = new Set(orders.map(o => o.destination?.state).filter(Boolean));
    return ['all', ...Array.from(states)];
  }, [orders]);

  const districtOptions = useMemo(() => {
    const filteredByState = selectedState === 'all'
      ? orders
      : orders.filter(o => o.destination?.state?.toLowerCase() === selectedState.toLowerCase());
    const districts = new Set(filteredByState.map(o => o.destination?.district).filter(Boolean));
    return ['all', ...Array.from(districts)];
  }, [orders, selectedState]);

  const toggleCardExpansion = (orderId) => {
    setExpandedCards(prev => ({
      ...prev,
      [orderId]: !prev[orderId]
    }));
  };

  // Helper to determine if an order has been forwarded to Out for Delivery or beyond
  const isOrderSentForDelivery = (ord) => {
    if (!ord) return false;
    // An order with pending items waiting for physical warehouse inward MUST stay in New Orders / Inwarding
    const totalPending = (ord.items || []).reduce((acc, it) => acc + (it.pending_qty || 0), 0);
    if (totalPending > 0) return false;

    // An order is transferred out of New Orders only when the user has explicitly clicked Send for Delivery
    if (ord.sent_for_delivery_at) return true;
    const dispatchedStatuses = ['in_transit', 'delivered', 'delivery_exception'];
    return dispatchedStatuses.includes(ord.delivery_status);
  };

  // Relevant Filter Counts for New Orders: All Orders, Payment Done, Inward Pending, Inward Done
  const queueCounts = useMemo(() => {
    let paymentDone = 0;
    let pendingInward = 0;
    let inwardDone = 0;

    const activeOrders = orders.filter(ord => !isOrderSentForDelivery(ord));

    activeOrders.forEach(ord => {
      const items = getOrderItemsWithKit(ord);
      const totalPending = items.reduce((acc, it) => acc + (it.pending_qty || 0), 0);
      const isKitReady = ord.kit_preparation_status === 'kit_ready' ||
                         ord.kit_preparation_status === 'not_required';
      const isComplete = totalPending === 0 && isKitReady;

      // Payment Done: checks first-half payment is completed / verified
      const isPaymentDone = (ord.epcs || []).length === 0 || (ord.epcs || []).every(epc => epc.payment_first_half?.status === 'done');
      if (isPaymentDone) paymentDone++;

      if (isComplete) {
        inwardDone++;
      } else {
        pendingInward++;
      }
    });

    return {
      total: activeOrders.length,
      paymentDone,
      pendingInward,
      inwardDone
    };
  }, [orders]);

  // Displayed Orders filtered by the 4 boss-defined tabs (Sent orders disappear and move to Out for Delivery)
  const displayedOrders = useMemo(() => {
    const activeOrders = orders.filter(ord => !isOrderSentForDelivery(ord));
    if (selectedQueueTab === 'all') return activeOrders;
    return activeOrders.filter(ord => {
      const items = getOrderItemsWithKit(ord);
      const totalPending = items.reduce((acc, it) => acc + (it.pending_qty || 0), 0);
      const isKitReady = ord.kit_preparation_status === 'kit_ready' ||
                         ord.kit_preparation_status === 'not_required';
      const isComplete = totalPending === 0 && isKitReady;
      const isPaymentDone = (ord.epcs || []).length === 0 || (ord.epcs || []).every(epc => epc.payment_first_half?.status === 'done');

      if (selectedQueueTab === 'payment_done') return isPaymentDone;
      if (selectedQueueTab === 'pending_inward') return totalPending > 0 || !isKitReady;
      if (selectedQueueTab === 'inward_done') return totalPending === 0 && isKitReady;
      return true;
    });
  }, [orders, selectedQueueTab]);

  // Computes the comprehensive list of items for the Inward Verification modal
  const modalInwardItems = useMemo(() => {
    if (!selectedOrderForInward) return [];
    return getOrderItemsWithKit(selectedOrderForInward);
  }, [selectedOrderForInward]);

  // Open Material Inward Modal
  const handleOpenInwardModal = (order) => {
    setSelectedOrderForInward(order);
    const initialInputs = {};
    const { totalKits, capacity } = getOrderKitMetrics(order);
    const items = [...(order.items || [])].map(it => ({ ...it }));

    const existingBosIndex = items.findIndex(it => isBosKitItem(it));
    const actualReceivedKits = existingBosIndex >= 0
      ? (items[existingBosIndex].received_qty || 0)
      : (order.inward_status === 'fully_inwarded' ? totalKits : 0);
    const pendingKits = Math.max(0, totalKits - actualReceivedKits);
    const receivedKits = actualReceivedKits;
    const cleanCap = (capacity || '3 kW').replace(/\s+/g, '');
    const bosSku = `BOS-KIT-${cleanCap.toUpperCase()}-STD`;
    const bosProductName = `BOS Kit (${capacity || '3 kW'} Pre-assembled Electrical Package - ACDB/DCDB/Cables)`;

    if (existingBosIndex >= 0) {
      if (items[existingBosIndex].ordered_qty !== totalKits) {
        items[existingBosIndex].ordered_qty = totalKits;
        items[existingBosIndex].pending_qty = Math.max(0, totalKits - (items[existingBosIndex].received_qty || 0));
      }
      if (!items[existingBosIndex].product_name?.includes(capacity)) {
        items[existingBosIndex].product_name = bosProductName;
      }
    } else if (order.kit_preparation_status !== 'not_required') {
      items.push({
        sku: bosSku,
        product_name: bosProductName,
        ordered_qty: totalKits,
        pending_qty: pendingKits,
        rack_location: order.kit_assembly_details?.storage_location || 'BAY-BOS-STOCK'
      });
    }

    items.forEach(it => {
      const isBos = isBosKitItem(it);
      // For panels & inverters: default to pending_qty for inwarding.
      // For BOS Kits: if kit_ready, prefill pending_qty so warehouse manager can inward immediately; else 0
      const defaultQty = isBos
        ? (order.kit_preparation_status === 'kit_ready' ? it.pending_qty : 0)
        : it.pending_qty;
      initialInputs[it.sku] = {
        qty: defaultQty,
        damaged_qty: 0,
        missing_qty: 0,
        rack_location: it.rack_location || (isBos ? 'BAY-BOS-STOCK' : '')
      };
    });
    setInwardInputs(initialInputs);
    setInwardRemarks('');
    setSupplierInvoiceNo(order.supplier_invoice_no || `INV-DO-${order.order_number || Date.now().toString().slice(-4)}`);
    setInvoiceDate(new Date().toISOString().split('T')[0]);
    setDefaultStorageRack(order.default_storage_rack || 'BAY-A1-01');
    setQcPassed(true);
    setDamageNotes('');
    setInwardType(order.inward_type || 'warehouse');
    setInwardExecutionMode('manual');
    setPickupLocationDetails(order.pickup_location_details || {
      location_name: '',
      address: '',
      contact_person: '',
      contact_phone: ''
    });
    setScannerInput('');
    setScannedSerials(order.scanned_serials || []);
    setActiveInwardTab('inward');
    setInwardModalOpen(true);
  };

  // Barcode / QR Scanner Gun Handler: Scans item QR/barcode, increments count, records serial for Outward matching
  const handleScanItem = (e) => {
    if (e) e.preventDefault();
    const barcode = scannerInput.trim();
    if (!barcode || !selectedOrderForInward) return;

    const items = modalInwardItems;
    // Try matching SKU exactly or partially
    let matchedItem = items.find(it => it.sku.toLowerCase() === barcode.toLowerCase() || barcode.toLowerCase().includes(it.sku.toLowerCase()));
    
    // Fallback: match by product name prefix or find the first item with pending quantity
    if (!matchedItem) {
      matchedItem = items.find(it => (it.pending_qty || 0) > 0 && barcode.toLowerCase().includes((it.product_name || '').toLowerCase().slice(0, 5)));
    }
    if (!matchedItem) {
      matchedItem = items.find(it => (it.pending_qty || 0) > 0) || items[0];
    }

    if (!matchedItem) {
      dispatch(setAlert({ message: `Scanned code "${barcode}" could not be matched to any order item.`, type: 'warning' }));
      return;
    }

    // Check if this serial is already scanned
    if (scannedSerials.some(s => s.serial_code === barcode)) {
      dispatch(setAlert({ message: `Serial / QR "${barcode}" is already scanned!`, type: 'warning' }));
      setScannerInput('');
      return;
    }

    const currentQty = parseInt(inwardInputs[matchedItem.sku]?.qty) || 0;
    if (currentQty >= matchedItem.pending_qty) {
      dispatch(setAlert({ message: `All ${matchedItem.pending_qty} units of ${matchedItem.product_name} already accounted for!`, type: 'warning' }));
      setScannerInput('');
      return;
    }

    // Add to scanned serials
    const newSerial = {
      sku: matchedItem.sku,
      product_name: matchedItem.product_name,
      serial_code: barcode,
      scanned_at: new Date().toISOString()
    };
    setScannedSerials(prev => [newSerial, ...prev]);

    // Increment inward qty for matched item
    setInwardInputs(prev => ({
      ...prev,
      [matchedItem.sku]: {
        ...prev[matchedItem.sku],
        qty: currentQty + 1
      }
    }));

    dispatch(setAlert({
      message: `Scanned: ${matchedItem.product_name} (Serial: ${barcode})`,
      type: 'success'
    }));
    setScannerInput('');
  };

  // Submit Inward Form (Handles Clean Inward & Discrepancy Logging)
  const handleSubmitInward = async (e) => {
    e.preventDefault();
    if (!selectedOrderForInward) return;

    const itemsToInward = [];
    let hasDiscrepancy = false;

    for (const it of modalInwardItems) {
      const input = inwardInputs[it.sku];
      const qty = parseInt(input?.qty) || 0;
      const damagedQty = parseInt(input?.damaged_qty) || 0;
      const missingQty = parseInt(input?.missing_qty) || 0;

      if (damagedQty > 0 || missingQty > 0) {
        hasDiscrepancy = true;
      }

      if (qty > 0 || damagedQty > 0 || missingQty > 0) {
        itemsToInward.push({
          sku: it.sku,
          product_name: it.product_name,
          is_bos_kit: isBosKitItem(it),
          qty,
          damaged_qty: damagedQty,
          missing_qty: missingQty,
          rack_location: input?.rack_location || it.rack_location || (isBosKitItem(it) ? 'BAY-BOS-STOCK' : '')
        });
      }
    }

    if (itemsToInward.length === 0) {
      dispatch(setAlert({
        message: 'Please enter at least one positive inward quantity.',
        type: 'warning'
      }));
      return;
    }

    if (!qcPassed && (!damageNotes || !damageNotes.trim())) {
      dispatch(setAlert({
        message: 'Please enter Damage / Shortage Notes explaining discrepancies found during physical inspection.',
        type: 'warning'
      }));
      return;
    }

    const finalRemarks = inwardRemarks || (!qcPassed ? damageNotes : 'Physical Gate Challan Verified - Packaging Intact');

    try {
      setSubmittingInward(true);
      if (hasDiscrepancy) {
        for (const itm of itemsToInward) {
          if (itm.damaged_qty > 0 || itm.missing_qty > 0) {
            await recordInwardDiscrepancy(selectedOrderForInward._id, {
              sku: itm.sku,
              received_qty: itm.qty,
              damaged_qty: itm.damaged_qty,
              missing_qty: itm.missing_qty,
              remarks: inwardRemarks
            });
          } else if (itm.qty > 0) {
            await inwardDeliveryOrder(selectedOrderForInward._id, {
              items: [{ sku: itm.sku, qty: itm.qty, rack_location: itm.rack_location }],
              remarks: finalRemarks, supplier_invoice_no: supplierInvoiceNo, invoice_date: invoiceDate, default_rack: defaultStorageRack, qc_passed: qcPassed, damage_notes: damageNotes,
              inward_type: inwardType,
              inward_mode: inwardExecutionMode,
              scanned_serials: scannedSerials,
              pickup_location_details: inwardType === 'pickup_location' ? pickupLocationDetails : null
            });
          }
        }
        dispatch(setAlert({
          message: 'Inward recorded with discrepancy logging. Accounts team notified for debit note/replacement.',
          type: 'warning'
        }));
      } else {
        const res = await inwardDeliveryOrder(selectedOrderForInward._id, {
          items: itemsToInward,
          remarks: finalRemarks, supplier_invoice_no: supplierInvoiceNo, invoice_date: invoiceDate, default_rack: defaultStorageRack, qc_passed: qcPassed, damage_notes: damageNotes,
          inward_type: inwardType,
          inward_mode: inwardExecutionMode,
          scanned_serials: scannedSerials,
          pickup_location_details: inwardType === 'pickup_location' ? pickupLocationDetails : null
        });
        dispatch(setAlert({
          message: res.message || 'Material inward verified & updated!',
          type: 'success'
        }));
      }

      // Deduct from preassembled stock if any BOS kit was inwarded from buffer
      const bosInwarded = itemsToInward.find(it => isBosKitItem(it) || it.sku?.startsWith('BOS-KIT-'));
      if (bosInwarded && bosInwarded.qty > 0) {
        setPreassembledStock(prev => {
          let remainingToDeduct = bosInwarded.qty;
          const updated = prev.map(m => {
            if (remainingToDeduct > 0 && m.ready_stock > 0) {
              const deduct = Math.min(remainingToDeduct, m.ready_stock);
              remainingToDeduct -= deduct;
              return {
                ...m,
                ready_stock: m.ready_stock - deduct,
                batch_codes: (m.batch_codes || []).slice(deduct)
              };
            }
            return m;
          });
          try {
            localStorage.setItem('solarkits_preassembled_stock', JSON.stringify(updated));
          } catch {}
          return updated;
        });
      }

      setInwardModalOpen(false);
      fetchOrders();
    } catch (err) {
      console.error('Inward error:', err);
      dispatch(setAlert({
        message: err.response?.data?.message || 'Failed to record material inward.',
        type: 'error'
      }));
    } finally {
      setSubmittingInward(false);
    }
  };

  // Open Reserve Inventory Modal
  const handleOpenReserveModal = (order, item) => {
    if ((item.pending_qty || 0) === 0) {
      dispatch(setAlert({
        message: `${item.product_name} is already 100% fulfilled and inwarded! No further stock allocation required.`,
        type: 'info'
      }));
      return;
    }
    setSelectedOrderForReserve(order);
    setSelectedItemForReserve(item);
    setReserveQtyInput(item.allocated_stock || Math.min(item.pending_qty, item.available_inventory_stock || 0));
    setReserveModalOpen(true);
  };

  const handleSaveReservation = async () => {
    if (!selectedOrderForReserve || !selectedItemForReserve) return;
    const qty = parseInt(reserveQtyInput);
    if (isNaN(qty) || qty < 0) {
      dispatch(setAlert({ message: 'Enter a valid quantity', type: 'error' }));
      return;
    }
    if (qty > selectedItemForReserve.available_inventory_stock) {
      dispatch(setAlert({
        message: `Cannot allocate more than available warehouse stock (${selectedItemForReserve.available_inventory_stock})`,
        type: 'error'
      }));
      return;
    }

    try {
      setSubmittingReserve(true);
      const res = await reserveDeliveryInventory(selectedOrderForReserve._id, {
        sku: selectedItemForReserve.sku,
        allocated_stock: qty
      });
      if (res.status === 'success') {
        dispatch(setAlert({ message: 'Inventory stock allocated and reserved!', type: 'success' }));
        setReserveModalOpen(false);
        fetchOrders();
      }
    } catch (err) {
      dispatch(setAlert({ message: err.response?.data?.message || 'Failed to allocate stock', type: 'error' }));
    } finally {
      setSubmittingReserve(false);
    }
  };

  // Open Procurement Requisition Modal for Account Manager (Order-Linked)
  const handleOpenProcureModal = (order, item = null) => {
    setSelectedOrderForProcure(order);
    setSelectedItemForProcure(item);

    const { totalKits, capacity } = getOrderKitMetrics(order);
    const cap = item?.capacity || capacity || order?.system_capacity || '3 kW';
    const matched = preassembledStock.find(m =>
      (item?.model_id && m.id === item.model_id) ||
      (m.capacity && cap.toLowerCase().includes(m.capacity.toLowerCase())) ||
      (m.name && cap.toLowerCase().includes(m.name.toLowerCase()))
    ) || preassembledStock[0];

    setSelectedProcureModelId(matched?.id || '1kw-dcr');
    setProcureQtyInput(totalKits || 1);
    setProcureNotes(`BOS Kit (${matched?.capacity || cap}) raw material booking request for Order #${order?.order_number || ''} (${order?.customer_name || ''}) — Required: ${totalKits || 1} Kits. Please approve and book materials from suppliers.`);
    setProcureModalOpen(true);
  };

  // Open Procurement Requisition Modal for Buffer Stock (Make-to-Stock)
  const handleOpenBufferRequisition = (model, defaultQty = 5) => {
    setSelectedOrderForProcure(null);
    setSelectedItemForProcure(null);
    setSelectedProcureModelId(model?.id || '1kw-dcr');
    setProcureQtyInput(defaultQty);
    setProcureNotes(`Warehouse Buffer Stock Requisition: Raw material order for ${defaultQty} x ${model?.name || 'BOS Kit'} (${model?.capacity || '1 kW'}). Required to assemble kits for warehouse inventory buffer.`);
    setProcureModalOpen(true);
  };

  const handleSaveProcureRequest = async (e) => {
    if (e) e.preventDefault();
    const numKits = parseInt(procureQtyInput) || 1;
    if (numKits <= 0) {
      dispatch(setAlert({ message: 'Enter a valid number of kits to requisition.', type: 'error' }));
      return;
    }

    const matchedModel = preassembledStock.find(m => m.id === selectedProcureModelId) || preassembledStock[0];
    const targetOrderId = selectedOrderForProcure?._id || 'buffer-stock';

    try {
      setSubmittingProcure(true);
      const res = await requestDeliveryOrderProcurement(targetOrderId, {
        sku: selectedItemForProcure?.sku || 'BOS-RAW-MAT-PKG',
        requested_qty: numKits,
        kit_capacity: matchedModel?.capacity,
        model_name: matchedModel?.name,
        num_kits: numKits,
        items: (matchedModel?.bom_components || []).map(c => ({
          name: c.name,
          sku: c.sku,
          sku_id: c.sku_id,
          qty: (c.qty || 1) * numKits,
          unit: c.unit
        })),
        notes: procureNotes || `Warehouse buffer stock material requisition for ${numKits} x ${matchedModel?.name}.`
      });

      if (res.status === 'success') {
        const reqNum = res.request_number || `REQ-BOS-BUF-${Date.now().toString().slice(-4)}`;
        if (!selectedOrderForProcure) {
          const updated = {
            ...bufferRequisitions,
            [selectedProcureModelId]: {
              req_number: reqNum,
              qty: numKits,
              date: new Date().toISOString(),
              status: 'requested',
              model_name: matchedModel?.name,
              capacity: matchedModel?.capacity
            }
          };
          setBufferRequisitions(updated);
          try { localStorage.setItem('solarkits_buffer_requisitions', JSON.stringify(updated)); } catch (_) {}
        }
        dispatch(setAlert({
          message: res.message || `Requisition "${reqNum}" for ${numKits} x ${matchedModel?.capacity} BOS Kit materials sent to Account Manager successfully!`,
          type: 'success'
        }));
        setProcureModalOpen(false);
        if (selectedOrderForProcure) fetchOrders();
      }
    } catch (err) {
      dispatch(setAlert({
        message: err.response?.data?.message || 'Failed to send requisition to Account Panel.',
        type: 'error'
      }));
    } finally {
      setSubmittingProcure(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* ── Top Level View Switcher: Show only when not standaloneBoskit ── */}
      {!standaloneBoskit && (
        <div className="flex bg-surface border border-border p-1.5 rounded-2xl gap-2 shadow-xs">
          <button
            onClick={() => {
              if (location.pathname.includes('bos-kit-assembly')) {
                navigate(`${prefix}/new-orders`);
              } else {
                setMainSectionTab('orders');
              }
            }}
            className={`flex-1 py-3 px-5 rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2.5 transition-all cursor-pointer ${
              mainSectionTab === 'orders'
                ? 'gradient-primary text-white shadow-md shadow-primary/20 scale-[1.01]'
                : 'text-text-secondary hover:bg-surface-hover hover:text-text-primary'
            }`}
          >
            <FaBoxes className="text-base" />
            <span>📦 Delivery Orders & Inward Fulfillment ({orders.length})</span>
          </button>
          <button
            onClick={() => {
              navigate(`${prefix}/bos-kit-assembly`);
            }}
            className={`flex-1 py-3 px-5 rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2.5 transition-all cursor-pointer ${
              mainSectionTab === 'boskit_station'
                ? 'bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-600 text-white shadow-md shadow-purple-500/20 scale-[1.01]'
                : 'text-text-secondary hover:bg-surface-hover hover:text-text-primary'
            }`}
          >
            <FaTools className="text-base" />
            <span>🛠️ BOS Kit Assembly & Preparation Workstation ({orders.filter(o => o.kit_preparation_status && o.kit_preparation_status !== 'not_required').length})</span>
          </button>
        </div>
      )}

      {mainSectionTab === 'orders' ? (
        <>
          {/* ── Top Metric KPI Summary (Boss Requirement: 3 Focused Cards) ── */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Card 1: New Orders (Confirmed) */}
        <div
          onClick={() => { setSelectedStatus('all'); setSelectedQueueTab('all'); }}
          className={`card p-4 rounded-2xl cursor-pointer transition-all border ${
            selectedQueueTab === 'all' && selectedStatus === 'all'
              ? 'border-primary ring-2 ring-primary/20 bg-primary/5 shadow-sm'
              : 'border-border hover:border-primary/40 bg-surface'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-text-secondary uppercase tracking-wider">New Orders (Confirmed)</span>
            <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center text-sm font-bold">
              <FaBoxes />
            </div>
          </div>
          <div className="text-3xl font-black text-text-primary mt-2">
            {queueCounts.total}
          </div>
          <div className="text-[11px] text-text-muted mt-1">Confirmed by Account Manager for fulfillment</div>
        </div>

        {/* Card 2: Pending Inward */}
        <div
          onClick={() => { setSelectedStatus('all'); setSelectedQueueTab('pending_inward'); }}
          className={`card p-4 rounded-2xl cursor-pointer transition-all border ${
            selectedQueueTab === 'pending_inward'
              ? 'border-info ring-2 ring-info/20 bg-info/5 shadow-sm'
              : 'border-border hover:border-info/40 bg-surface'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-info uppercase tracking-wider">Pending Inward</span>
            <div className="w-9 h-9 rounded-xl bg-info/10 text-info flex items-center justify-center text-sm font-bold">
              <HiOutlineClock />
            </div>
          </div>
          <div className="text-3xl font-black text-info mt-2">
            {queueCounts.pendingInward}
          </div>
          <div className="text-[11px] text-text-muted mt-1">Awaiting BOS Kit physical inward & assembly</div>
        </div>

        {/* Card 3: Overdue Orders (SLA Exceeded) */}
        <div
          onClick={() => setSelectedStatus('overdue')}
          className={`card p-4 rounded-2xl cursor-pointer transition-all border ${
            selectedStatus === 'overdue'
              ? 'border-danger ring-2 ring-danger/30 bg-danger/10 shadow-sm'
              : 'border-danger/40 hover:border-danger bg-danger/5'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-black text-danger uppercase tracking-wider flex items-center gap-1.5">
              <HiOutlineExclamation className="text-base" /> Overdue Orders
            </span>
            <div className="w-9 h-9 rounded-xl bg-danger/15 text-danger flex items-center justify-center text-sm font-bold">
              ⚠️
            </div>
          </div>
          <div className="text-3xl font-black text-danger mt-2 flex items-baseline gap-2">
            <span>{summary.overdue_orders || 0}</span>
            <span className="text-xs font-semibold text-danger/80">orders delayed</span>
          </div>
          <div className="text-[11px] text-danger/80 mt-1 font-medium">Exceeded SLA / Max Days defined in Admin Panel</div>
        </div>
      </div>

      {/* ── Filters & Search Control Bar ── */}
      <div className="bg-surface border border-border p-4 rounded-2xl space-y-3 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Search Box */}
          <form onSubmit={handleSearchSubmit} className="relative flex-1 max-w-md">
            <HiOutlineSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted text-base" />
            <input
              type="text"
              placeholder="Search by DO #, Order #, Client, Truck/Group, Phone..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-xs bg-surface-hover border border-border rounded-xl text-text-primary placeholder:text-text-muted focus:outline-none focus:border-primary transition-all"
            />
          </form>

          {/* Quick Actions: Request Materials & Refresh */}
          <div className="flex items-center gap-2 self-end md:self-auto flex-wrap">
            <button
              type="button"
              onClick={() => handleOpenProcureModal(orders[0] || null)}
              className="px-3.5 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white border border-purple-500 text-xs font-black flex items-center gap-1.5 transition-all shadow-xs cursor-pointer active:scale-95"
              title="Send BOS Kit raw material procurement requisition to Account Manager"
            >
              <FaPaperPlane className="text-xs" />
              <span>⚡ Request BOS Kit Materials from Accounts</span>
            </button>

            <button
              onClick={fetchOrders}
              disabled={loading}
              className="px-3 py-2 rounded-xl bg-surface-hover border border-border text-text-secondary hover:text-text-primary hover:border-primary text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <HiOutlineRefresh className={`text-sm ${loading ? 'animate-spin text-primary' : ''}`} />
              <span>Refresh</span>
            </button>
          </div>
        </div>

        {/* Filter Dropdowns Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5 pt-2 border-t border-border/60">
          {/* Status Filter */}
          <div>
            <label className="text-[10px] font-black text-text-muted uppercase tracking-wider block mb-1">
              Order Status
            </label>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full py-1.5 px-2.5 text-xs bg-surface-hover border border-border rounded-lg text-text-primary focus:outline-none focus:border-primary font-medium"
            >
              <option value="all">All New Orders</option>
              <option value="pending_inward">Pending Inward</option>
              <option value="overdue">⚠️ Overdue Orders</option>
              <option value="partially_inwarded">Partially Inwarded</option>
              <option value="ready_for_dispatch">Ready for Dispatch</option>
              <option value="in_transit">In Transit</option>
              <option value="delivered">Delivered</option>
            </select>
          </div>

          {/* State Filter */}
          <div>
            <label className="text-[10px] font-black text-text-muted uppercase tracking-wider block mb-1">
              State
            </label>
            <select
              value={selectedState}
              onChange={(e) => {
                setSelectedState(e.target.value);
                setSelectedDistrict('all');
              }}
              className="w-full py-1.5 px-2.5 text-xs bg-surface-hover border border-border rounded-lg text-text-primary focus:outline-none focus:border-primary font-medium"
            >
              <option value="all">All States</option>
              {stateOptions.filter(s => s !== 'all').map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>

          {/* District Filter */}
          <div>
            <label className="text-[10px] font-black text-text-muted uppercase tracking-wider block mb-1">
              District
            </label>
            <select
              value={selectedDistrict}
              onChange={(e) => setSelectedDistrict(e.target.value)}
              className="w-full py-1.5 px-2.5 text-xs bg-surface-hover border border-border rounded-lg text-text-primary focus:outline-none focus:border-primary font-medium"
            >
              <option value="all">All Districts</option>
              {districtOptions.filter(d => d !== 'all').map(d => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </div>

          {/* PIN Code Filter */}
          <div>
            <label className="text-[10px] font-black text-text-muted uppercase tracking-wider block mb-1">
              PIN Code
            </label>
            <input
              type="text"
              placeholder="e.g. 411026"
              value={pincodeFilter}
              onChange={(e) => setPincodeFilter(e.target.value)}
              className="w-full py-1.5 px-2.5 text-xs bg-surface-hover border border-border rounded-lg text-text-primary focus:outline-none focus:border-primary font-medium placeholder:text-text-muted"
            />
          </div>

          {/* Date Filter */}
          <div>
            <label className="text-[10px] font-black text-text-muted uppercase tracking-wider block mb-1">
              Order Date
            </label>
            <input
              type="date"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="w-full py-1.5 px-2.5 text-xs bg-surface-hover border border-border rounded-lg text-text-primary focus:outline-none focus:border-primary font-medium"
            />
          </div>
        </div>
      </div>

      {/* ── Relevant Queue Filter Tabs Bar: 4 Core Tabs (All Orders, Payment Done, Inward Pending, Inward Done) ── */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin">
        {[
          { id: 'all', label: 'All Orders', count: queueCounts.total, icon: FaBoxes },
          { id: 'payment_done', label: 'Payment Done', count: queueCounts.paymentDone, icon: FaCheckCircle, color: 'text-blue-400' },
          { id: 'pending_inward', label: 'Inward Pending', count: queueCounts.pendingInward, icon: HiOutlineClock, color: 'text-amber-400' },
          { id: 'inward_done', label: 'Inward Done', count: queueCounts.inwardDone, icon: FaCheckCircle, color: 'text-emerald-400' },
        ].map((tab) => {
          const isActive = selectedQueueTab === tab.id;
          const TabIcon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setSelectedQueueTab(tab.id)}
              className={`px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all duration-200 flex items-center gap-2 border cursor-pointer ${
                isActive
                  ? 'bg-primary text-white border-primary shadow-sm'
                  : 'bg-surface hover:bg-surface-hover border-border text-text-secondary hover:text-text-primary'
              }`}
            >
              <TabIcon className={`text-xs ${isActive ? 'text-white' : tab.color || 'text-text-muted'}`} />
              <span>{tab.label}</span>
              <span
                className={`px-1.5 py-0.5 rounded-full text-[10px] font-black font-mono ${
                  isActive
                    ? 'bg-white/20 text-white'
                    : 'bg-surface-hover border border-border/80 text-text-primary'
                }`}
              >
                {tab.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* ── Order Cards List ── */}
      {loading ? (
        <div className="card p-12 text-center text-text-muted space-y-3 bg-surface border border-border rounded-2xl">
          <FaSpinner className="animate-spin text-3xl text-primary mx-auto" />
          <div className="text-sm font-bold text-text-primary">Loading Delivery Orders...</div>
          <div className="text-xs">Fetching confirmed orders forwarded from Account Manager & Procurement.</div>
        </div>
      ) : displayedOrders.length === 0 ? (
        <div className="card p-12 text-center text-text-muted space-y-3 bg-surface border border-border rounded-2xl">
          <FaBoxes className="text-4xl text-text-muted opacity-30 mx-auto" />
          <div className="text-base font-bold text-text-primary">No Delivery Orders Found</div>
          <div className="text-xs max-w-md mx-auto">
            No orders match the selected queue filter ({selectedQueueTab.replace(/_/g, ' ')}). Clear filters or select another category.
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {displayedOrders.map((ord) => {
            const isPartiallyInwarded = ord.delivery_status === 'partially_inwarded';
            const isReadyForDispatch = ord.delivery_status === 'ready_for_dispatch';
            const isInTransit = ord.delivery_status === 'in_transit';

            const allItems = getOrderItemsWithKit(ord);
            const totalOrderedItems = allItems.reduce((acc, it) => acc + (it.ordered_qty || 0), 0);
            const totalReceivedItems = allItems.reduce((acc, it) => acc + (it.received_qty || 0), 0);
            const totalPendingItems = allItems.reduce((acc, it) => acc + (it.pending_qty || 0), 0);
            const inwardPercent = totalOrderedItems > 0 ? Math.round((totalReceivedItems / totalOrderedItems) * 100) : 0;

            return (
              <div
                key={ord._id}
                className={`card rounded-2xl border transition-all duration-300 p-5 space-y-3.5 ${
                  isReadyForDispatch
                    ? 'border-success/40 bg-gradient-to-r from-success/5 via-surface to-surface shadow-xs hover:border-success/60'
                    : isPartiallyInwarded
                    ? 'border-warning/40 bg-gradient-to-r from-warning/5 via-surface to-surface shadow-xs hover:border-warning/60'
                    : 'border-border bg-surface hover:border-primary/40 shadow-xs'
                }`}
              >
                {/* ── SECTION 1: Top Bar (Order Identity on Left ──▶ Status Badges on Right) ── */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border/60">
                  {/* Left: Account Order Number & Delivery Order ID */}
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <span className="text-lg font-black text-text-primary tracking-tight font-mono">
                      Order #{ord.order_number}
                    </span>
                    <span className="px-2.5 py-1 rounded-lg font-mono text-xs font-bold bg-primary/15 text-primary border border-primary/30 shadow-2xs">
                      {ord.delivery_order_id}
                    </span>
                    {/* 1 Truck = 1 Card Consolidated Shipment Badge */}
                    {ord.epcs && ord.epcs.length > 1 ? (
                      <span className="px-3 py-1 rounded-lg font-mono text-xs font-black bg-gradient-to-r from-purple-600/20 to-indigo-600/20 text-purple-300 border border-purple-500/40 flex items-center gap-1.5 shadow-xs">
                        <FaTruck className="text-xs text-purple-400" />
                        <span>🚚 Consolidated Truck Shipment ({ord.epcs.length} EPC Orders)</span>
                      </span>
                    ) : (
                      <span className="px-2.5 py-1 rounded-lg font-mono text-xs font-bold bg-purple-500/15 text-purple-400 border border-purple-500/30 flex items-center gap-1.5 shadow-2xs">
                        <FaLayerGroup className="text-[10px]" />
                        {ord.order_group_id ? `Consignment: ${ord.order_group_id} • ` : ''}
                        {(ord.epcs?.length || 1)} {(ord.epcs?.length || 1) === 1 ? 'EPC' : 'EPCs'} Included
                      </span>
                    )}
                    {ord.delivery_number && ord.delivery_number !== ord.delivery_order_id && (
                      <span className="px-2.5 py-1 rounded-lg font-mono text-xs font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/25 flex items-center gap-1.5">
                        <FaTruck className="text-[10px]" /> DEL: {ord.delivery_number}
                      </span>
                    )}
                  </div>

                  {/* Right: Status Pills Group (Clean Badges: Payment Done, Inward Status, SLA) */}
                  <div className="flex items-center gap-2 flex-wrap sm:justify-end">
                    {/* SLA Overdue if any */}
                    {ord.is_overdue && (
                      <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-danger/15 text-danger border border-danger/30 flex items-center gap-1 animate-pulse">
                        ⚠️ Overdue ({ord.overdue_days}d)
                      </span>
                    )}

                    {/* Discrepancy Alert if any */}
                    {ord.discrepancy_details && ord.discrepancy_details.length > 0 && (
                      <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-rose-500/15 text-rose-400 border border-rose-500/30 flex items-center gap-1">
                        <FaExclamationTriangle className="text-[10px]" /> {ord.discrepancy_details.length} Discrepancy
                      </span>
                    )}

                    {/* Payment Done Badge */}
                    <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-blue-500/15 text-blue-400 border border-blue-500/30 flex items-center gap-1">
                      <FaCheckCircle className="text-[10px]" /> Payment Done
                    </span>

                    {/* Inward Status Badge */}
                    {totalPendingItems === 0 || isReadyForDispatch ? (
                      <span className="px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 flex items-center gap-1.5 shadow-2xs">
                        <FaCheckCircle className="text-[11px]" /> Inward Done (100%)
                      </span>
                    ) : isPartiallyInwarded ? (
                      <span className="px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-wider bg-amber-500/20 text-amber-400 border border-amber-500/40 flex items-center gap-1.5 shadow-2xs">
                        <HiOutlineExclamation className="text-xs" /> Partially Inwarded ({inwardPercent}%)
                      </span>
                    ) : (
                      <span className="px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-wider bg-orange-500/15 text-orange-400 border border-orange-500/30 flex items-center gap-1.5">
                        <HiOutlineClock className="text-xs" /> Inward Pending
                      </span>
                    )}
                  </div>
                </div>

                {/* ── SECTION 2: Customer / Destination / Logistics Info Strip ── */}
                <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2 text-xs text-text-secondary bg-surface-hover/30 px-3.5 py-2.5 rounded-xl border border-border/40">
                  {ord.epcs && ord.epcs.length > 1 ? (
                    /* Multi-EPC Consolidated Consignment (User Rule: Zero EPC names shown when > 1 EPC, only show numbers / counts) */
                    <div className="flex flex-wrap items-center justify-between gap-2.5 w-full">
                      <div className="flex items-center gap-2.5 flex-wrap">
                        <span className="px-3 py-1.5 rounded-xl bg-purple-500/15 text-purple-300 font-black text-xs uppercase tracking-wider flex items-center gap-1.5 border border-purple-500/30 shadow-2xs">
                          <FaLayerGroup className="text-xs text-purple-400" />
                          <span>🚚 Consolidated Truck: {ord.epcs.length} EPC Orders Bundled</span>
                        </span>
                        <span className="px-2.5 py-1 rounded-lg bg-surface border border-purple-500/25 text-purple-300 text-xs font-bold font-mono">
                          📦 {ord.epcs.length} Client Consignments in 1 Truck
                        </span>
                        <span className="text-[11px] text-text-muted italic">
                          (Individual allocations confidential — click View Details to inspect)
                        </span>
                      </div>
                      
                      <div className="flex items-center gap-3 text-xs text-text-muted font-medium">
                        <span className="flex items-center gap-1">
                          <FaWarehouse className="text-xs text-primary" />
                          <span>Origin: <strong className="text-text-primary font-bold">Central Factory / Suppliers</strong></span>
                        </span>
                        {(ord.destination?.city || ord.destination?.district || ord.destination?.state) && (
                          <span className="flex items-center gap-1">
                            <HiOutlineLocationMarker className="text-xs text-rose-500" />
                            <span>Consolidated Route: <strong className="text-text-primary font-bold">{ord.destination?.city || ord.destination?.district || ''}{ord.destination?.state ? `, ${ord.destination.state}` : ''}</strong></span>
                          </span>
                        )}
                      </div>
                    </div>
                  ) : (
                    /* Single EPC Order (Show the EPC Contractor clearly labeled) */
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                      <span className="font-bold text-text-primary text-sm flex items-center gap-1.5">
                        <span className="px-2 py-0.5 rounded-md bg-primary/10 text-primary text-[10px] font-black uppercase border border-primary/20">
                          EPC Contractor
                        </span>
                        <span>{ord.epcs?.[0]?.epc_name || ord.customer_name}</span>
                      </span>
                      {(ord.epcs?.[0]?.contact_phone || ord.customer_phone) && (
                        <span className="flex items-center gap-1 text-text-muted font-medium">
                          <FaPhoneAlt className="text-[10px] text-primary" /> {ord.epcs?.[0]?.contact_phone || ord.customer_phone}
                        </span>
                      )}
                      {(ord.destination?.city || ord.destination?.district || ord.destination?.state) && (
                        <span className="flex items-center gap-1 text-text-muted font-medium">
                          <HiOutlineLocationMarker className="text-xs text-primary" />
                          {ord.destination?.city || ord.destination?.district || ''}{ord.destination?.state ? `, ${ord.destination.state}` : ''}
                        </span>
                      )}
                    </div>
                  )}

                  <div className="flex items-center gap-3 text-text-muted text-[11px]">
                    {(ord.incoming_truck_group?.vehicle_number || ord.transport_details?.vehicle_number || ord.required_vehicle || ord.transport_details?.vehicle_type) && (
                      <span className="flex items-center gap-1.5 font-mono text-text-primary bg-surface px-2.5 py-1 rounded-lg border border-border shadow-2xs" title="Assigned Delivery Truck / Vehicle from Account Manager">
                        <FaTruck className="text-primary text-[11px]" />
                        <strong>{ord.incoming_truck_group?.vehicle_number || ord.transport_details?.vehicle_number || ord.required_vehicle || ord.transport_details?.vehicle_type}</strong>
                        {(ord.incoming_truck_group?.transporter_name || ord.transport_details?.transporter_name) && (
                          <span className="text-text-muted font-sans hidden md:inline">({ord.incoming_truck_group?.transporter_name || ord.transport_details?.transporter_name})</span>
                        )}
                      </span>
                    )}
                    <span>Ordered: {new Date(ord.order_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                  </div>
                </div>

                {/* ── SECTION 3: Live Inward Progress & Action Buttons ── */}
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pt-1">
                  {/* Left: Progress bar with clear counts */}
                  <div className="flex items-center gap-3">
                    <span className="text-[11px] font-black text-text-muted uppercase tracking-wider shrink-0">
                      Inward Progress:
                    </span>
                    <div className="w-36 sm:w-48 h-2.5 rounded-full bg-border overflow-hidden shrink-0">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${inwardPercent === 100 ? 'bg-success' : 'bg-primary'}`}
                        style={{ width: `${inwardPercent}%` }}
                      />
                    </div>
                    <span className={`text-xs font-mono font-bold shrink-0 ${inwardPercent === 100 ? 'text-success' : 'text-primary'}`}>
                      {totalReceivedItems} / {totalOrderedItems} Pcs ({inwardPercent}%)
                    </span>
                  </div>

                  {/* Right: Action Buttons (View Details + Inward Material + Send for BOS Kit Assembly) */}
                  <div className="flex flex-wrap items-center gap-2 self-start lg:self-center">
                    {/* 1. View Details */}
                    <button
                      type="button"
                      onClick={() => handleOpenDetailsModal(ord)}
                      className="h-9 px-3.5 rounded-xl text-xs font-bold bg-surface-hover hover:bg-surface border border-border text-text-primary hover:border-primary/50 transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
                      title="View complete order dossier, destination address, truck logistics, SKU breakdown and serials"
                    >
                      <HiOutlineEye className="text-base text-primary" />
                      <span>View Details</span>
                    </button>

                    {/* 2. Inward Material Button (Restored Inward Workflow Button) */}
                    <button
                      type="button"
                      onClick={() => handleOpenInwardModal(ord)}
                      className={`h-9 px-4 rounded-xl text-xs font-black uppercase tracking-wider transition-all duration-200 flex items-center gap-2 shadow-sm cursor-pointer ${
                        totalPendingItems === 0 || isReadyForDispatch
                          ? 'bg-surface-hover hover:bg-surface border border-border text-text-secondary hover:text-text-primary'
                          : ord.kit_preparation_status === 'kit_ready' && totalPendingItems > 0
                          ? 'bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-600 hover:from-purple-500 hover:to-indigo-500 text-white shadow-md shadow-purple-500/25 ring-2 ring-purple-500/40 animate-pulse'
                          : 'gradient-primary text-white hover:opacity-95 active:scale-95'
                      }`}
                      title={
                        totalPendingItems === 0 || isReadyForDispatch
                          ? 'All items inwarded. Click to view or adjust inward records'
                          : ord.kit_preparation_status === 'kit_ready' && totalPendingItems > 0
                          ? 'BOS Kits assembly finished! Click to inward assembled kits.'
                          : 'Record material physical inward & scan serials'
                      }
                    >
                      <HiOutlineClipboardCheck className={`text-base ${totalPendingItems === 0 || isReadyForDispatch ? 'text-emerald-400' : 'text-white'}`} />
                      <span>
                        {totalPendingItems === 0 || isReadyForDispatch
                          ? 'View / Adjust Inward'
                          : ord.kit_preparation_status === 'kit_ready' && totalPendingItems > 0
                          ? `Inward Assembled BOS Kits (${totalPendingItems})`
                          : 'Inward Material'}
                      </span>
                    </button>

                    {/* Requisition Button: When items or BOS kits are pending */}
                    {totalPendingItems > 0 && (
                      <button
                        type="button"
                        onClick={() => handleOpenProcureModal(ord)}
                        className="h-9 px-3 rounded-xl text-xs font-bold bg-purple-500/10 hover:bg-purple-500/20 text-purple-300 border border-purple-500/30 transition-all flex items-center gap-1.5 cursor-pointer shadow-xs active:scale-95"
                        title="Send BOS Kit raw material procurement requisition to Account Manager"
                      >
                        <FaPaperPlane className="text-xs text-purple-400" />
                        <span>Request Materials</span>
                      </button>
                    )}

                    {/* 3. Send for Delivery (Enabled ONLY when 100% Inwarded) */}
                    {(() => {
                      const isAllInwarded = totalPendingItems === 0 && totalOrderedItems > 0;
                      if (!isAllInwarded) return null;

                      const isKitReady = ord.kit_preparation_status === 'kit_ready' ||
                                         ord.kit_preparation_status === 'not_required';

                      return (
                        <button
                          type="button"
                          onClick={() => {
                            if (!isKitReady) {
                              handleOpenStockAllocationModal(ord);
                            } else {
                              handleSendForDelivery(ord);
                            }
                          }}
                          disabled={sendingOrderId === ord._id}
                          className={`h-9 px-4 rounded-xl text-xs font-black uppercase tracking-wider transition-all duration-200 flex items-center gap-2 shadow-sm cursor-pointer active:scale-95 disabled:opacity-50 ${
                            isKitReady
                              ? 'bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-emerald-500/25 ring-2 ring-emerald-500/40'
                              : 'bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/40 text-amber-300'
                          }`}
                          title={
                            isKitReady
                              ? 'All materials inwarded & BOS Kit ready! Click to forward order to Out for Delivery Station'
                              : 'Materials inwarded, but BOS Kit allocation is pending! Click to allocate BOS Kit from warehouse stock'
                          }
                        >
                          {sendingOrderId === ord._id ? (
                            <FaSpinner className="animate-spin text-xs" />
                          ) : isKitReady ? (
                            <FaTruck className="text-xs" />
                          ) : (
                            <FaTools className="text-xs text-amber-300" />
                          )}
                          <span>
                            {sendingOrderId === ord._id
                              ? 'Sending...'
                              : isKitReady
                              ? 'Send for Delivery'
                              : 'BOS Kit Pending (Allocate Kit)'}
                          </span>
                          <FaArrowRight className="text-[10px]" />
                        </button>
                      );
                    })()}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </>
  ) : (
    /* ── DEDICATED BOS KIT ASSEMBLY & PREPARATION WORKSTATION TAB (Two-Part Architecture: Boss Specification) ── */
    <div className="space-y-6">
      {/* ── Two-Part Workstation Mode Switcher with Back to Orders ── */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-2 bg-surface/90 border border-purple-500/30 rounded-2xl shadow-sm">
        <div className="flex items-center gap-2 flex-1">
          <button
            type="button"
            onClick={() => {
              navigate(`${prefix}/new-orders`);
              setMainSectionTab('orders');
            }}
            className="px-4 py-3 rounded-xl text-xs font-black uppercase tracking-wider bg-surface-hover hover:bg-surface border border-border text-text-primary hover:border-primary/50 flex items-center gap-2 cursor-pointer shadow-xs transition-all shrink-0"
            title="Navigate back to New Orders Procurement Fulfillment Queue"
          >
            <FaArrowLeft className="text-xs text-primary" />
            <span>← Back to Orders</span>
          </button>
          <button
            type="button"
            onClick={() => setBoskitWorkstationMode('order_specific')}
            className={`flex-1 py-3 px-4 rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer ${
              boskitWorkstationMode === 'order_specific'
                ? 'bg-purple-600 text-white shadow-md shadow-purple-500/25 scale-[1.01]'
                : 'text-text-secondary hover:text-text-primary hover:bg-surface-hover'
            }`}
          >
            <FaTools className="text-sm" />
            <span>Part 1: 📦 Order-Specific Assembly & Stock Allocation</span>
          </button>
          <button
            type="button"
            onClick={() => setBoskitWorkstationMode('stock_inventory')}
            className={`flex-1 py-3 px-4 rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer ${
              boskitWorkstationMode === 'stock_inventory'
                ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-md shadow-emerald-500/25 scale-[1.01]'
                : 'text-text-secondary hover:text-text-primary hover:bg-surface-hover'
            }`}
          >
            <FaWarehouse className="text-sm" />
            <span>Part 2: 🏭 Warehouse Stock Pre-Assembly (Buffer Inventory)</span>
          </button>
        </div>

        {/* Pre-assembled ready stock counter pill */}
        <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/25 text-emerald-400">
          <FaCube className="text-sm" />
          <div className="text-xs">
            <span className="font-bold">WH Ready Stock: </span>
            <strong className="font-mono text-sm">{totalPreassembledKitsInStock}</strong> Kits Available
          </div>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          PART 2: WAREHOUSE BUFFER STOCK PRE-ASSEMBLY WORKSTATION
          (Boss Requirement: Not tied to specific customer orders;
           uses bulk inwarded materials to build standard inventory)
         ───────────────────────────────────────────────────────────── */}
      {boskitWorkstationMode === 'stock_inventory' ? (
        <div className="space-y-6">
          {/* Header Banner & Quick Summary */}
          <div className="card p-6 rounded-2xl border border-emerald-500/30 bg-gradient-to-r from-emerald-950/30 via-surface to-teal-950/20 space-y-4 shadow-sm">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                    Part 2: Warehouse Stock Buffer (Make-to-Stock)
                  </span>
                  <span className="text-xs text-text-muted">• Standard catalog kits for instant order allocation</span>
                </div>
                <h2 className="text-lg font-black text-text-primary mt-1">
                  Warehouse Stock Buffer BOS Kit Pre-Assembly Workstation
                </h2>
                <p className="text-xs text-text-secondary mt-1 max-w-2xl">
                  Standard BOS kit models (1 kW, 2 kW, 3 kW) ke liye pehle Account Manager se raw materials order karein, phir Material Inward tab se inward karein, aur phir 5-stage workstation me assemble karke ready buffer inventory store karein.
                </p>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={() => navigate(`${prefix}/material-inward`)}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold bg-surface-hover hover:bg-surface text-primary border border-primary/30 flex items-center gap-1.5 cursor-pointer transition-all shadow-xs"
                >
                  <FaWarehouse className="text-xs" />
                  <span>Go to Material Inward Tab →</span>
                </button>
              </div>
            </div>

            {/* Quick KPI Bar */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3 border-t border-border/60">
              <div className="flex items-center gap-3 p-3 rounded-xl bg-surface/80 border border-border">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center text-lg font-bold">
                  <FaCube />
                </div>
                <div>
                  <div className="text-xs text-text-muted">Total Buffer Stock in WH</div>
                  <div className="text-xl font-black text-emerald-400">{totalPreassembledKitsInStock} Kits Ready</div>
                </div>
              </div>

              <div className="flex items-center gap-3 p-3 rounded-xl bg-surface/80 border border-border">
                <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center text-lg font-bold">
                  <FaTools />
                </div>
                <div>
                  <div className="text-xs text-text-muted">Standard Catalog Templates</div>
                  <div className="text-xl font-black text-purple-400">{preassembledStock.length} Standard Models</div>
                </div>
              </div>

              <div className="flex items-center gap-3 p-3 rounded-xl bg-surface/80 border border-border">
                <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center text-lg font-bold">
                  <FaHistory />
                </div>
                <div>
                  <div className="text-xs text-text-muted">Assembly Batches Logged</div>
                  <div className="text-xl font-black text-blue-400">{stockAssemblyHistory.length} Batches Recorded</div>
                </div>
              </div>
            </div>
          </div>

          {/* ─────────────────────────────────────────────────────────────
              VIEW A: CATALOG CARDS (When no model is drilled down)
              ───────────────────────────────────────────────────────────── */}
          {!selectedBufferModelId ? (
            <div className="space-y-6">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h3 className="text-sm font-black text-text-primary uppercase tracking-wider flex items-center gap-2">
                      <span>Standard BOS Kit Models in Warehouse Inventory</span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary font-bold">
                        Click card to enter dedicated workspace
                      </span>
                    </h3>
                    <p className="text-[11px] text-text-muted">
                      Select 1 kW, 2 kW, or 3 kW model card to view raw material requirements, request materials from Accounts, verify inward status, and perform 5-stage kit assembly.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                  {preassembledStock.map((model) => {
                    const { hasShortage, items } = checkRawMaterialStock(model, 1);
                    const shortCount = items.filter(i => i.isShort).length;
                    const modelReq = bufferRequisitions[model.id];

                    return (
                      <div
                        key={model.id}
                        className="card p-5 rounded-2xl border-2 border-border hover:border-emerald-500/60 bg-surface flex flex-col justify-between space-y-4 transition-all duration-200 shadow-xs hover:shadow-md cursor-pointer group"
                        onClick={() => setSelectedBufferModelId(model.id)}
                      >
                        <div className="space-y-3.5">
                          {/* Top: Category & Ready Stock */}
                          <div className="flex items-start justify-between gap-2 border-b border-border/60 pb-3">
                            <div>
                              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-surface-hover border border-border text-text-secondary">
                                {model.category} • {model.capacity}
                              </span>
                              <h4 className="text-sm font-black text-text-primary mt-1.5 group-hover:text-emerald-400 transition-colors">
                                {model.name}
                              </h4>
                              <div className="text-[11px] text-text-muted flex items-center gap-1.5 mt-1 font-mono">
                                <FaWarehouse className="text-[10px] text-primary" />
                                <span>Storage: {model.storage_location}</span>
                              </div>
                            </div>

                            <div className="text-right shrink-0 bg-surface-hover/70 px-3 py-2 rounded-xl border border-border">
                              <div className={`text-2xl font-black font-mono leading-none ${model.ready_stock > 0 ? 'text-emerald-400' : 'text-amber-400'}`}>
                                {model.ready_stock}
                              </div>
                              <div className="text-[9px] text-text-muted uppercase font-bold mt-1 tracking-wider">Ready Kits</div>
                            </div>
                          </div>

                          {/* Material & Inward Status Pill */}
                          <div className="space-y-2">
                            <div className="flex items-center justify-between text-xs">
                              <span className="text-[11px] font-bold text-text-secondary">Warehouse Raw Materials:</span>
                              {hasShortage ? (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-400 border border-amber-500/30 flex items-center gap-1">
                                  <FaExclamationTriangle className="text-[9px]" />
                                  <span>Inward Pending ({shortCount} items short)</span>
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                                  <FaCheckCircle className="text-[9px]" />
                                  <span>Materials Inwarded (Ready)</span>
                                </span>
                              )}
                            </div>

                            {/* Active Requisition Pill */}
                            {modelReq && (
                              <div className="p-2 rounded-lg bg-purple-500/10 border border-purple-500/20 text-[11px] flex items-center justify-between">
                                <span className="text-purple-300 font-bold truncate pr-1">
                                  📦 Req: {modelReq.req_number} ({modelReq.qty} Kits)
                                </span>
                                <span className="text-[10px] text-purple-400 font-bold uppercase shrink-0">Ordered</span>
                              </div>
                            )}

                            {/* Key BOM specs snapshot */}
                            <div className="p-3 rounded-xl bg-surface-hover/50 border border-border/80 text-[11px] space-y-1.5">
                              <div className="flex items-center justify-between text-text-muted">
                                <span>BOM Recipe Components:</span>
                                <strong className="font-mono text-text-primary">{model.bom_components?.length || 0} Dynamic SKUs</strong>
                              </div>
                              <div className="flex items-center justify-between text-text-muted">
                                <span>Active Warehouse Batches:</span>
                                <strong className="font-mono text-emerald-400">{(model.batch_codes || []).length} Logged</strong>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Card Action Buttons */}
                        <div className="space-y-2 pt-2 border-t border-border/60" onClick={(e) => e.stopPropagation()}>
                          <button
                            type="button"
                            onClick={() => setSelectedBufferModelId(model.id)}
                            className="w-full py-2.5 px-3 rounded-xl text-xs font-black uppercase tracking-wider bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-md shadow-emerald-500/20 flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-95"
                          >
                            <span>Enter Kit Assembly Workspace</span>
                            <FaArrowRight className="text-xs" />
                          </button>

                          <button
                            type="button"
                            onClick={() => handleOpenBufferRequisition(model, 5)}
                            className="w-full py-1.5 px-3 rounded-lg text-[11px] font-bold text-amber-400 hover:text-amber-300 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 flex items-center justify-center gap-1.5 cursor-pointer transition-all"
                          >
                            <FaPaperPlane className="text-[10px]" />
                            <span>Request Materials from Account Manager</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Buffer Production History */}
              <div className="card p-5 rounded-2xl border border-border bg-surface space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FaHistory className="text-primary text-sm" />
                    <h3 className="text-sm font-black text-text-primary uppercase tracking-wider">
                      Warehouse Buffer Assembly Production History
                    </h3>
                  </div>
                  <span className="text-xs text-text-muted font-mono">{stockAssemblyHistory.length} Total Runs</span>
                </div>

                <div className="border border-border rounded-xl overflow-hidden bg-surface">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-surface-hover/80 border-b border-border text-[10px] font-black uppercase text-text-muted">
                      <tr>
                        <th className="p-3">Date & Time</th>
                        <th className="p-3">Model Assembled</th>
                        <th className="p-3">Batch Codes</th>
                        <th className="p-3 text-center">Quantity</th>
                        <th className="p-3">Assembled By</th>
                        <th className="p-3">Storage Location</th>
                        <th className="p-3 text-right">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {stockAssemblyHistory.length === 0 ? (
                        <tr>
                          <td colSpan="7" className="p-8 text-center text-text-muted italic">
                            No buffer assembly batches recorded yet. Open a model card above to begin kit production.
                          </td>
                        </tr>
                      ) : (
                        stockAssemblyHistory.map((hist) => (
                          <tr key={hist.id} className="hover:bg-surface-hover/30">
                            <td className="p-3 font-mono text-[11px] text-text-muted">
                              {new Date(hist.timestamp).toLocaleString('en-IN', {
                                day: '2-digit',
                                month: 'short',
                                year: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </td>
                            <td className="p-3 font-bold text-text-primary">{hist.model_name}</td>
                            <td className="p-3 font-mono text-[10px] text-primary">{hist.batch_code}</td>
                            <td className="p-3 text-center font-bold text-emerald-400">+{hist.qty} Kits</td>
                            <td className="p-3 text-text-secondary">{hist.assembled_by}</td>
                            <td className="p-3 text-text-secondary font-mono text-[11px]">{hist.storage_location}</td>
                            <td className="p-3 text-right">
                              <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                ✓ In Stock
                              </span>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ) : (
            /* ─────────────────────────────────────────────────────────────
                VIEW B: DEDICATED MODEL WORKSPACE (When a kit model is selected)
                Sequential Progressive Stepper: Step 1 -> Step 2 -> Step 3
                ───────────────────────────────────────────────────────────── */
            (() => {
              const activeModel = preassembledStock.find(m => m.id === selectedBufferModelId) || preassembledStock[0];
              const modelReq = bufferRequisitions[activeModel.id];
              const isPoPlaced = modelReq?.status === 'ordered' || Boolean(modelReq?.po_number);
              const targetBuildQty = modelReq?.qty || step1RequisitionQty || stockAssembleQty || 5;
              const { hasShortage, items } = checkRawMaterialStock(activeModel, targetBuildQty);
              const shortItems = items.filter(i => i.isShort);

              const isRequisitionInwarded = modelReq?.status === 'inwarded' || Boolean(modelReq?.inward_completed_at);

              // ── Natural Workflow Active Step Determination ──
              // Step 1: Material Requisition (Active if no requisition sent)
              // Step 2: Material Inward (Active if requisition sent, but NOT inwarded at dock yet OR shortage)
              // Step 3: 5-Stage Kit Assembly (Active ONLY when materials are inwarded at dock and verified)
              let naturalActiveStep = 1;
              if (modelReq) {
                if (!isRequisitionInwarded) {
                  naturalActiveStep = 2; // Strict gate: Locked until dock inward is complete!
                } else if (hasShortage) {
                  naturalActiveStep = 2; // Stock verification shortage!
                } else {
                  naturalActiveStep = 3; // Materials physically inwarded and verified!
                }
              }
              if (activeBufferJob && activeBufferJob.model_id === activeModel.id) {
                naturalActiveStep = 3;
              }

              // Progressive Stepper Visibility Rules:
              // - Completed steps (step < naturalActiveStep) are collapsed by default ("jo hogya hai vo band kar do")
              // - Active step (step === naturalActiveStep) is expanded
              // - Future steps (step > naturalActiveStep) are HIDDEN ("baki aage wale mat show karo theek hai jab pichla hojaye tab use baad")
              const isStep1Expanded = manualStepToggle[1] !== undefined ? manualStepToggle[1] : (naturalActiveStep === 1);
              const isStep2Expanded = manualStepToggle[2] !== undefined ? manualStepToggle[2] : (naturalActiveStep === 2);
              const isStep3Expanded = manualStepToggle[3] !== undefined ? manualStepToggle[3] : (naturalActiveStep === 3);

              return (
                <div className="space-y-6">
                  {/* Top Model Navigation & Specs Banner */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl bg-surface border border-border shadow-xs">
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedBufferModelId(null);
                          setManualStepToggle({});
                        }}
                        className="px-3.5 py-2 rounded-xl text-xs font-bold bg-surface-hover hover:bg-surface border border-border text-text-primary flex items-center gap-1.5 cursor-pointer transition-all shrink-0"
                      >
                        <FaArrowRight className="rotate-180 text-xs" />
                        <span>Back to All BOS Kit Models</span>
                      </button>

                      <div>
                        <div className="flex items-center gap-2">
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                            {activeModel.category}
                          </span>
                          <span className="text-xs text-text-muted">• {activeModel.capacity} BOS Kit Station</span>
                        </div>
                        <h2 className="text-base font-black text-text-primary mt-0.5">
                          {activeModel.name}
                        </h2>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <div className="text-right">
                        <div className="text-xs text-text-muted font-bold">Storage Location</div>
                        <div className="text-xs font-mono font-bold text-text-primary">{activeModel.storage_location}</div>
                      </div>
                      <div className="px-4 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-right">
                        <div className="text-xl font-black text-emerald-400 font-mono leading-none">{activeModel.ready_stock}</div>
                        <div className="text-[9px] uppercase font-bold text-text-muted mt-0.5">Ready Kits</div>
                      </div>
                    </div>
                  </div>

                  {/* ── Progressive 3-Step Journey Timeline Bar ── */}
                  <div className="p-3 rounded-2xl bg-surface-hover/70 border border-border flex flex-col md:flex-row items-center justify-between gap-2 text-xs">
                    <div className="flex items-center gap-2 w-full md:w-auto">
                      <span className="text-[10px] font-black uppercase tracking-wider text-text-muted px-2">
                        Kit Build Pipeline:
                      </span>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap w-full md:w-auto justify-start md:justify-end">
                      {/* Step 1 Pill */}
                      <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold text-xs transition-all ${
                        naturalActiveStep > 1
                          ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                          : naturalActiveStep === 1
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-xs'
                          : 'bg-surface text-text-muted border border-border'
                      }`}>
                        <span>{naturalActiveStep > 1 ? '✓' : '1.'}</span>
                        <span>Request Materials</span>
                      </div>

                      <span className="text-text-muted text-[10px]">➔</span>

                      {/* Step 2 Pill */}
                      <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold text-xs transition-all ${
                        naturalActiveStep > 2
                          ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                          : naturalActiveStep === 2
                          ? 'bg-blue-500/20 text-blue-300 border border-blue-500/40 shadow-xs'
                          : 'bg-surface text-text-muted/60 border border-border/60 opacity-60'
                      }`}>
                        <span>{naturalActiveStep > 2 ? '✓' : '2.'}</span>
                        <span>Material Inward</span>
                      </div>

                      <span className="text-text-muted text-[10px]">➔</span>

                      {/* Step 3 Pill (Disabled/Locked with no hover when inward is pending) */}
                      <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold text-xs transition-all ${
                        naturalActiveStep === 3
                          ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-md shadow-emerald-500/25'
                          : 'bg-surface text-text-muted/40 border border-border/40 opacity-40 cursor-not-allowed select-none pointer-events-none'
                      }`}>
                        <span>{activeModel.ready_stock > 0 && naturalActiveStep === 3 ? '🚀' : naturalActiveStep < 3 ? '🔒' : '3.'}</span>
                        <span>5-Stage Assembly {naturalActiveStep < 3 ? '(Locked)' : ''}</span>
                      </div>
                    </div>
                  </div>

                  {/* ─────────────────────────────────────────────────────────
                      STEP 1: RAW MATERIAL REQUISITION FROM ACCOUNTS MANAGER
                      ───────────────────────────────────────────────────────── */}
                  {naturalActiveStep > 1 && !isStep1Expanded ? (
                    /* Step 1 Collapsed Bar ("jo hogya hai vo band kar do") */
                    <div className="card p-4 rounded-2xl border border-emerald-500/40 bg-surface/90 hover:bg-surface-hover/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs transition-all">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-400 font-black flex items-center justify-center text-sm border border-emerald-500/30 shrink-0">
                          ✓
                        </div>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="text-xs font-black uppercase tracking-wider text-text-primary">
                              Step 1 Completed: Raw Material Requisition Sent to Accounts Manager
                            </h4>
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30 font-mono">
                              #{modelReq?.req_number}
                            </span>
                          </div>
                          <p className="text-[11px] text-text-muted mt-0.5">
                            Requisitioned for <strong className="text-text-primary">{modelReq?.qty} Kits</strong> ({activeModel.bom_components?.length || 21} BOM SKUs) • Ordered on {modelReq?.date ? new Date(modelReq.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }) : 'Today'}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                        <button
                          type="button"
                          onClick={() => setManualStepToggle(prev => ({ ...prev, [1]: true }))}
                          className="px-3 py-1.5 rounded-lg text-xs font-bold bg-surface-hover hover:bg-surface border border-border text-text-secondary hover:text-text-primary transition-all cursor-pointer flex items-center gap-1.5"
                        >
                          <span>View Requisition Details</span>
                          <HiOutlineChevronDown />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleOpenBufferRequisition(activeModel, 5)}
                          className="px-2.5 py-1.5 rounded-lg text-[11px] font-bold text-amber-400 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 transition-all cursor-pointer"
                          title="Re-order or order additional kits from Account Manager"
                        >
                          + New Requisition
                        </button>
                      </div>
                    </div>
                  ) : (
                    /* Step 1 Expanded UI */
                    <div className="card p-6 rounded-2xl border-2 border-amber-500/40 bg-surface shadow-md space-y-5 transition-all">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="w-6 h-6 rounded-full bg-amber-500/20 text-amber-400 font-black flex items-center justify-center text-xs">
                              1
                            </span>
                            <span className="text-[10px] font-black uppercase tracking-wider bg-amber-500/20 text-amber-400 px-2 py-0.5 rounded-md border border-amber-500/30">
                              Step 1 of 3: Material Requisition
                            </span>
                            {naturalActiveStep > 1 && (
                              <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/15 px-2 py-0.5 rounded border border-emerald-500/30">
                                ✓ Requisition Active
                              </span>
                            )}
                          </div>
                          <h3 className="text-sm font-black text-text-primary uppercase tracking-wider">
                            Order BOM Raw Materials from Account Manager
                          </h3>
                          <p className="text-xs text-text-secondary leading-relaxed max-w-3xl">
                            Warehouse me kit assembly se pehle zaroori 21 components (Mounting rails, clamps, DC cables, AC cables, DCDB box, earthing rods, MC4 connectors) ka purchase order <strong>Account Manager</strong> ko bhejein.
                          </p>
                        </div>

                        {naturalActiveStep > 1 && (
                          <button
                            type="button"
                            onClick={() => setManualStepToggle(prev => ({ ...prev, [1]: false }))}
                            className="px-3 py-1.5 rounded-lg text-xs font-bold bg-surface-hover hover:bg-surface border border-border text-text-secondary cursor-pointer self-start sm:self-center flex items-center gap-1"
                          >
                            <span>Collapse Step 1</span>
                            <HiOutlineChevronUp />
                          </button>
                        )}
                      </div>

                      {/* Quantity Selector for Requisition */}
                      <div className="p-4 rounded-xl bg-surface-hover/60 border border-border space-y-3">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <div>
                            <span className="text-xs font-black uppercase tracking-wider text-text-primary block">
                              Target Kits Quantity to Requisition:
                            </span>
                            <span className="text-[11px] text-text-muted">
                              Kitna quantity raw material Account Manager se order karna hai select karein:
                            </span>
                          </div>

                          <div className="flex items-center gap-1.5">
                            {[1, 2, 5, 10, 20].map(q => (
                              <button
                                key={q}
                                type="button"
                                onClick={() => setStep1RequisitionQty(q)}
                                className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer ${
                                  step1RequisitionQty === q
                                    ? 'bg-amber-500 text-gray-950 font-black shadow-xs'
                                    : 'bg-surface border border-border text-text-secondary hover:text-text-primary'
                                }`}
                              >
                                {q} {q === 1 ? 'Kit' : 'Kits'}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Summary of BOM components that will be requested */}
                        <div className="pt-2 border-t border-border/60">
                          <div className="text-[11px] font-bold text-text-secondary mb-2 flex items-center justify-between">
                            <span>BOM Components Included in Requisition ({activeModel.bom_components?.length || 21} SKUs):</span>
                            <span className="text-text-muted font-normal text-[10px]">Calculated for {step1RequisitionQty} Kits</span>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                            {(activeModel.bom_components || []).slice(0, 6).map((c, idx) => (
                              <div key={idx} className="p-2 rounded-lg bg-surface border border-border/80 flex items-center justify-between text-xs">
                                <span className="font-semibold text-text-primary truncate pr-2 text-[11px]">{c.name}</span>
                                <span className="font-mono font-bold text-amber-400 text-[10px] shrink-0">
                                  {(c.qty || 1) * step1RequisitionQty} {c.unit || 'Pcs'}
                                </span>
                              </div>
                            ))}
                          </div>
                          {(activeModel.bom_components || []).length > 6 && (
                            <div className="text-[10px] text-text-muted mt-1.5 text-center">
                              + {(activeModel.bom_components || []).length - 6} additional fasteners, clamps, lugs, and earthing accessories auto-calculated.
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Step 1 Action Button */}
                      <div>
                        <button
                          type="button"
                          onClick={() => handleOpenBufferRequisition(activeModel, step1RequisitionQty || 5)}
                          className="w-full py-3.5 px-6 rounded-xl text-xs font-black uppercase tracking-wider bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 hover:from-amber-400 hover:to-orange-500 text-white shadow-lg shadow-amber-500/25 flex items-center justify-center gap-2 cursor-pointer transition-all hover:scale-[1.01] active:scale-95"
                        >
                          <FaPaperPlane className="text-sm" />
                          <span>Send Material Requisition to Account Manager (PO Request) 🚀</span>
                        </button>
                      </div>
                    </div>
                  )}

                  {/* ─────────────────────────────────────────────────────────
                      STEP 2: MATERIAL INWARD IN WAREHOUSE RECEIVING DOCK
                      (Only displayed AFTER Step 1 Requisition is sent!)
                      ───────────────────────────────────────────────────────── */}
                  {naturalActiveStep >= 2 && (
                    naturalActiveStep > 2 && !isStep2Expanded ? (
                      /* Step 2 Collapsed Bar ("jo hogya hai vo band kar do") */
                      <div className="card p-4 rounded-2xl border border-emerald-500/40 bg-surface/90 hover:bg-surface-hover/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs transition-all">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-400 font-black flex items-center justify-center text-sm border border-emerald-500/30 shrink-0">
                            ✓
                          </div>
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <h4 className="text-xs font-black uppercase tracking-wider text-text-primary">
                                Step 2 Completed: All Raw Materials Inwarded & Stock Ready in Warehouse
                              </h4>
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                                Dock Verified
                              </span>
                            </div>
                            <p className="text-[11px] text-text-muted mt-0.5">
                              All {items.length} BOM components verified present in warehouse stock bins. Sufficient for {targetBuildQty} kits.
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                          <button
                            type="button"
                            onClick={() => setManualStepToggle(prev => ({ ...prev, [2]: true }))}
                            className="px-3 py-1.5 rounded-lg text-xs font-bold bg-surface-hover hover:bg-surface border border-border text-text-secondary hover:text-text-primary transition-all cursor-pointer flex items-center gap-1.5"
                          >
                            <span>View Inward Stock</span>
                            <HiOutlineChevronDown />
                          </button>
                        </div>
                      </div>
                    ) : (
                      /* Step 2 Expanded UI */
                      <div className={`card p-6 rounded-2xl border-2 shadow-md space-y-5 transition-all ${
                        hasShortage
                          ? 'border-blue-500/50 bg-gradient-to-b from-blue-950/20 via-surface to-surface'
                          : 'border-emerald-500/50 bg-surface'
                      }`}>
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className={`w-6 h-6 rounded-full font-black flex items-center justify-center text-xs ${
                                hasShortage ? 'bg-blue-500/20 text-blue-400' : 'bg-emerald-500/20 text-emerald-400'
                              }`}>
                                2
                              </span>
                              <span className="text-[10px] font-black uppercase tracking-wider bg-blue-500/20 text-blue-300 px-2 py-0.5 rounded-md border border-blue-500/30">
                                Step 2 of 3: Material Inward Verification
                              </span>
                              {modelReq && (
                                <span className="font-mono text-[10px] font-bold text-purple-300 bg-purple-500/20 px-2 py-0.5 rounded border border-purple-500/30">
                                  PO #{modelReq.req_number}
                                </span>
                              )}
                            </div>
                            <h3 className="text-sm font-black text-text-primary uppercase tracking-wider">
                              Warehouse Dock Material Inward Verification
                            </h3>
                            <p className="text-xs text-text-secondary leading-relaxed max-w-3xl">
                              {isPoPlaced ? (
                                <span>
                                  <strong className="text-emerald-400">✅ Accounts Manager ne request accept karke PO #{modelReq?.po_number || modelReq?.req_number} place kar diya hai!</strong> Supplier se dispatch hone ke baad jab shipment warehouse receiving dock par physically receive ho, to <strong>Material Inward</strong> tab se receive karein.
                                </span>
                              ) : (
                                <span>
                                  <strong className="text-amber-400">⏳ Material Requisition Account Manager ko bhej di gayi hai (#{modelReq?.req_number}).</strong> Abhi Account Manager Portal (Purchase Orders ➔ Warehouse Requests) me jakar ise <strong>accept & PO place</strong> karein. PO banne ke baad supplier material dispatch karega.
                                </span>
                              )}
                            </p>
                          </div>

                          {naturalActiveStep > 2 && (
                            <button
                              type="button"
                              onClick={() => setManualStepToggle(prev => ({ ...prev, [2]: false }))}
                              className="px-3 py-1.5 rounded-lg text-xs font-bold bg-surface-hover hover:bg-surface border border-border text-text-secondary cursor-pointer self-start sm:self-center flex items-center gap-1"
                            >
                              <span>Collapse Step 2</span>
                              <HiOutlineChevronUp />
                            </button>
                          )}
                        </div>

                        {/* Dynamic Status Alert Banner */}
                        {!isPoPlaced ? (
                          <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 space-y-2">
                            <div className="flex items-center gap-2 font-black text-xs uppercase tracking-wide">
                              <FaClock className="text-amber-400" />
                              <span>⏳ Step 2A: Waiting for Account Manager to Accept & Place PO!</span>
                            </div>
                            <p className="text-xs text-amber-200/90 leading-relaxed">
                              Warehouse ne material requisition bhej di hai. Ab <strong>Account Manager</strong> apne portal (Purchase Orders ➔ Warehouse Requests) me jaakar ise <strong>accept</strong> karega aur Supplier ke sath <strong>PO place</strong> karega.
                            </p>
                          </div>
                        ) : (!isRequisitionInwarded || hasShortage) ? (
                          <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/30 text-blue-300 space-y-2">
                            <div className="flex items-center gap-2 font-black text-xs uppercase tracking-wide">
                              <FaTruck className="text-blue-400" />
                              <span>🚚 Step 2B: PO Booked (#{modelReq?.po_number || modelReq?.req_number}) — Awaiting Supplier Delivery at Dock</span>
                            </div>
                            <p className="text-xs text-blue-200/90 leading-relaxed">
                              Accounts Manager ne PO book kar diya hai. Supplier dispatch ke baad jab shipment dock par physically arrive ho, to niche diye gaye button se <strong>'Material Inward'</strong> tab me jakar GRN receipt verify aur inward karein. Jab tak dock par inward complete nahi hoga, tab tak Step 3 (5-Stage Assembly) locked rahega.
                            </p>
                          </div>
                        ) : (
                          <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 space-y-1">
                            <div className="flex items-center gap-2 font-black text-xs uppercase tracking-wide">
                              <FaCheckCircle className="text-emerald-400" />
                              <span>✅ All Raw Materials Inwarded & Stock Ready in Warehouse!</span>
                            </div>
                            <p className="text-xs text-emerald-200/90 leading-relaxed">
                              Sabhi required BOM components warehouse bins me verify ho chuke hain. Step 3 (5-Stage Assembly) unlock ho gaya hai!
                            </p>
                          </div>
                        )}

                        {/* Official Material Inward Navigation Button */}
                        <div className="pt-1">
                          <button
                            type="button"
                            onClick={() => {
                              const poNum = modelReq?.po_number || '';
                              const reqNum = modelReq?.req_number || '';
                              navigate(`${prefix}/material-inward?source=boskit&model=${encodeURIComponent(activeModel.id)}&req=${encodeURIComponent(reqNum)}&po=${encodeURIComponent(poNum)}`);
                            }}
                            className="w-full py-3.5 px-6 rounded-xl text-xs font-black uppercase tracking-wider bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-lg shadow-blue-500/25 flex items-center justify-center gap-2.5 cursor-pointer transition-all hover:scale-[1.01] active:scale-95 group"
                          >
                            <FaWarehouse className="text-sm text-blue-200 group-hover:scale-110 transition-transform" />
                            <span>Go to 'Material Inward' Tab to Receive & Inward Materials →</span>
                          </button>
                        </div>

                        {/* BOM Inward Check Table */}
                        <div className="space-y-2 pt-2 border-t border-border">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-bold text-text-primary uppercase tracking-wider text-[11px]">
                              BOM Components Inward Verification ({items.length} SKUs):
                            </span>
                            <span className="text-[11px] text-text-muted font-mono">
                              Required for {targetBuildQty} Kits vs Inwarded WH Stock
                            </span>
                          </div>

                          <div className="border border-border rounded-xl overflow-hidden bg-surface max-h-60 overflow-y-auto">
                            <table className="w-full text-left text-xs">
                              <thead className="bg-surface-hover/80 border-b border-border text-[10px] font-black uppercase text-text-muted sticky top-0">
                                <tr>
                                  <th className="p-2.5">Component / Product Name</th>
                                  <th className="p-2.5">SKU Code</th>
                                  <th className="p-2.5 text-center">Required ({targetBuildQty} Kits)</th>
                                  <th className="p-2.5 text-center">Inwarded WH Stock</th>
                                  <th className="p-2.5 text-right">Inward Status</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-border">
                                {items.map((it, idx) => {
                                  const itemPending = !isRequisitionInwarded || it.isShort;
                                  return (
                                    <tr key={idx} className="hover:bg-surface-hover/30">
                                      <td className="p-2.5 font-bold text-text-primary text-[11px]">{it.name}</td>
                                      <td className="p-2.5 font-mono text-primary text-[10px]">{it.sku}</td>
                                      <td className="p-2.5 text-center font-mono font-bold text-text-primary">{it.required} {it.unit}</td>
                                      <td className="p-2.5 text-center font-mono font-bold">
                                        <span className={itemPending ? 'text-amber-400' : 'text-emerald-400'}>
                                          {isRequisitionInwarded ? it.available : 0} {it.unit}
                                        </span>
                                      </td>
                                      <td className="p-2.5 text-right">
                                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold border ${
                                          itemPending
                                            ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                                            : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                        }`}>
                                          {itemPending ? '⚠️ Inward Pending' : '✓ In Stock'}
                                        </span>
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      </div>
                    )
                  )}

                  {/* ─────────────────────────────────────────────────────────
                      STEP 3: 5-STAGE SEQUENTIAL KIT ASSEMBLY WORKSTATION
                      (Only displayed AFTER Step 2 Material Inward is verified!)
                      ───────────────────────────────────────────────────────── */}
                  {naturalActiveStep === 3 && (
                    <div className="space-y-6">
                      {/* Active 5-Stage Stepper Workstation */}
                      {activeBufferJob && activeBufferJob.model_id === activeModel.id ? (
                        <div className="card p-6 rounded-2xl border-2 border-emerald-500/50 bg-gradient-to-r from-emerald-950/40 via-surface to-teal-950/30 shadow-lg shadow-emerald-500/10 space-y-5">
                          {/* Job Header */}
                          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-border/80">
                            <div className="space-y-1.5">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="px-2.5 py-1 rounded-lg text-xs font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center gap-1.5">
                                  <FaTools className="text-emerald-400" />
                                  Active Buffer Job: #{activeBufferJob.job_id}
                                </span>
                                <span className="px-2.5 py-1 rounded-lg text-xs font-bold uppercase tracking-wider bg-purple-500/15 text-purple-300 border border-purple-500/30">
                                  {activeBufferJob.model_name} ({activeBufferJob.capacity})
                                </span>
                                <span className="px-2.5 py-1 rounded-lg text-xs font-black uppercase tracking-wider bg-blue-500/20 text-blue-300 border border-blue-500/30 font-mono">
                                  Target: {activeBufferJob.qty} Kit(s)
                                </span>
                              </div>
                              <div className="text-xs text-text-muted flex items-center gap-4 flex-wrap">
                                <span><strong>Lead:</strong> {activeBufferJob.technician}</span>
                                <span><strong>Target Storage:</strong> <code className="text-emerald-400 font-bold">{activeBufferJob.target_rack}</code></span>
                                <span><strong>Started:</strong> {new Date(activeBufferJob.started_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</span>
                              </div>
                            </div>

                            <div className="flex items-center gap-2 shrink-0">
                              <button
                                type="button"
                                onClick={handleAbortBufferJob}
                                className="px-3.5 py-2 rounded-xl text-xs font-bold bg-surface-hover hover:bg-rose-500/20 border border-border hover:border-rose-500/40 text-text-secondary hover:text-rose-400 transition-all cursor-pointer"
                              >
                                ✕ Cancel Job
                              </button>
                            </div>
                          </div>

                          {/* 5-Stage Stepper Bar */}
                          <div>
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-xs font-black uppercase tracking-wider text-text-primary">
                                Stage {activeBufferJob.current_stage} of 5: Sequential Assembly Progression
                              </span>
                              <span className="text-xs font-mono font-bold text-emerald-400">
                                {Math.round((activeBufferJob.current_stage / 5) * 100)}% Complete
                              </span>
                            </div>

                            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 text-center text-xs">
                              {[
                                { num: 1, title: '1. Picking', subtitle: 'Raw Materials Picking', icon: FaBoxes },
                                { num: 2, title: '2. Wiring', subtitle: 'Wiring & Enclosure', icon: FaWrench },
                                { num: 3, title: '3. QC Check', subtitle: 'Electrical QC Test', icon: FaClipboardCheck },
                                { num: 4, title: '4. Packaging', subtitle: 'Box & Batch Label', icon: FaBarcode },
                                { num: 5, title: '5. Buffer Stock', subtitle: 'Store in WH Rack', icon: FaCheckDouble }
                              ].map((stage) => {
                                const isCurrent = activeBufferJob.current_stage === stage.num;
                                const isDone = activeBufferJob.current_stage > stage.num;
                                const StageIcon = stage.icon;

                                return (
                                  <div
                                    key={stage.num}
                                    className={`p-3 rounded-xl border transition-all text-left flex flex-col justify-between ${
                                      isCurrent
                                        ? 'bg-emerald-500/20 border-emerald-500 text-text-primary ring-2 ring-emerald-500/30'
                                        : isDone
                                        ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                                        : 'bg-surface border-border text-text-muted opacity-60'
                                    }`}
                                  >
                                    <div className="flex items-center justify-between mb-1.5">
                                      <StageIcon className={isCurrent ? 'text-emerald-400 text-base' : isDone ? 'text-emerald-500 text-sm' : 'text-text-muted text-sm'} />
                                      {isDone ? (
                                        <span className="w-5 h-5 rounded-full bg-emerald-500 text-black text-[10px] font-black flex items-center justify-center">✓</span>
                                      ) : (
                                        <span className={`w-5 h-5 rounded-full text-[10px] font-black flex items-center justify-center ${
                                          isCurrent ? 'bg-emerald-400 text-black' : 'bg-surface-hover text-text-muted'
                                        }`}>
                                          {stage.num}
                                        </span>
                                      )}
                                    </div>
                                    <div>
                                      <div className="font-black text-xs">{stage.title}</div>
                                      <div className="text-[10px] text-text-muted leading-tight mt-0.5">{stage.subtitle}</div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>

                          {/* Stage Interactive Work Area */}
                          <div className="p-4 rounded-xl bg-surface border border-border">
                            {activeBufferJob.current_stage === 1 && (
                              <div className="space-y-3">
                                <div>
                                  <h4 className="text-xs font-black text-text-primary uppercase tracking-wider">
                                    Stage 1: Raw Materials Picking & Verification
                                  </h4>
                                  <p className="text-[11px] text-text-secondary">
                                    Warehouse inventory racks se sabhi raw components pick karke assembly table par assemble karne ke liye verify karein.
                                  </p>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 text-xs">
                                  {(activeBufferJob.bom_components || []).map((c, idx) => (
                                    <div key={idx} className="p-2.5 rounded-lg bg-surface-hover/70 border border-border/70 flex items-center justify-between gap-2">
                                      <div className="min-w-0">
                                        <div className="font-bold text-text-primary truncate text-[11px]">{c.name}</div>
                                        <div className="text-[10px] text-text-muted font-mono">{c.sku}</div>
                                      </div>
                                      <span className="font-mono font-bold text-primary whitespace-nowrap bg-surface px-1.5 py-0.5 rounded border border-border/50 text-[10px]">
                                        {c.qty * activeBufferJob.qty} {c.unit}
                                      </span>
                                    </div>
                                  ))}
                                </div>

                                <div className="flex justify-end pt-2">
                                  <button
                                    type="button"
                                    onClick={() => handleAdvanceBufferStage(2)}
                                    className="px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-md flex items-center gap-2 cursor-pointer transition-all active:scale-95"
                                  >
                                    <span>✓ Confirm Components Picked → Proceed to Wiring (Stage 2)</span>
                                    <FaArrowRight className="text-xs" />
                                  </button>
                                </div>
                              </div>
                            )}

                            {activeBufferJob.current_stage === 2 && (
                              <div className="space-y-3">
                                <div>
                                  <h4 className="text-xs font-black text-text-primary uppercase tracking-wider">
                                    Stage 2: Wiring Harness & Enclosure Assembly
                                  </h4>
                                  <p className="text-[11px] text-text-secondary">
                                    DCDB box assembly, wire crimping, MC4 connector termination, ferrule numbering & gland sealing.
                                  </p>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                                  {[
                                    'DCDB / AJB Box Internal Wiring & Fuse Holder Installation',
                                    'Solar DC Cable 4 sq. mm Crimping & MC4 Termination (IP68)',
                                    'Earth Cable 2.5 sq. mm Lug Crimping with Copper Ferrules',
                                    'Enclosure Cable Glands Tightened & IP65 Gasket Verification'
                                  ].map((item, idx) => (
                                    <div key={idx} className="flex items-center gap-2 p-2.5 rounded-lg bg-surface-hover/60 border border-border text-text-secondary">
                                      <span className="w-4 h-4 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-[10px] font-bold">✓</span>
                                      <span>{item}</span>
                                    </div>
                                  ))}
                                </div>

                                <div className="flex justify-end pt-2">
                                  <button
                                    type="button"
                                    onClick={() => handleAdvanceBufferStage(3)}
                                    className="px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-md flex items-center gap-2 cursor-pointer transition-all active:scale-95"
                                  >
                                    <span>✓ Wiring Assembly Complete → Proceed to Electrical QC (Stage 3)</span>
                                    <FaArrowRight className="text-xs" />
                                  </button>
                                </div>
                              </div>
                            )}

                            {activeBufferJob.current_stage === 3 && (
                              <div className="space-y-3">
                                <div>
                                  <h4 className="text-xs font-black text-text-primary uppercase tracking-wider">
                                    Stage 3: Electrical QC & Insulation Test
                                  </h4>
                                  <p className="text-[11px] text-text-secondary">
                                    Physical inspection, megger insulation resistance test & continuity check.
                                  </p>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                                  <div className="p-3 rounded-xl bg-surface-hover border border-border">
                                    <div className="text-[10px] text-text-muted font-bold uppercase">Insulation Resistance (1000V Megger)</div>
                                    <div className="text-base font-black text-emerald-400 mt-1">32.4 MΩ</div>
                                    <div className="text-[10px] text-emerald-500 font-bold mt-0.5">✓ PASS (Min 10 MΩ req)</div>
                                  </div>
                                  <div className="p-3 rounded-xl bg-surface-hover border border-border">
                                    <div className="text-[10px] text-text-muted font-bold uppercase">Earth Continuity Resistance</div>
                                    <div className="text-base font-black text-emerald-400 mt-1">0.06 Ω</div>
                                    <div className="text-[10px] text-emerald-500 font-bold mt-0.5">✓ PASS (Max 0.2 Ω allowed)</div>
                                  </div>
                                  <div className="p-3 rounded-xl bg-surface-hover border border-border">
                                    <div className="text-[10px] text-text-muted font-bold uppercase">DC/AC Polarity Verification</div>
                                    <div className="text-base font-black text-emerald-400 mt-1">Verified</div>
                                    <div className="text-[10px] text-emerald-500 font-bold mt-0.5">✓ PASS (Correct +/-)</div>
                                  </div>
                                </div>

                                <div className="flex justify-end pt-2">
                                  <button
                                    type="button"
                                    onClick={() => handleAdvanceBufferStage(4)}
                                    className="px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-md flex items-center gap-2 cursor-pointer transition-all active:scale-95"
                                  >
                                    <span>✓ Electrical QC Passed → Proceed to Packaging (Stage 4)</span>
                                    <FaArrowRight className="text-xs" />
                                  </button>
                                </div>
                              </div>
                            )}

                            {activeBufferJob.current_stage === 4 && (
                              <div className="space-y-3">
                                <div>
                                  <h4 className="text-xs font-black text-text-primary uppercase tracking-wider">
                                    Stage 4: Packaging & Warehouse Buffer Stock Batch Labeling
                                  </h4>
                                  <p className="text-[11px] text-text-secondary">
                                    Carton boxing with protective foam padding. Buffer batch codes generated for warehouse ready inventory.
                                  </p>
                                </div>

                                <div className="p-3 rounded-xl bg-surface-hover border border-border space-y-2">
                                  <div className="text-[11px] font-bold text-text-secondary">
                                    Generated Warehouse Buffer Batch Codes:
                                  </div>
                                  <div className="flex flex-wrap gap-2">
                                    {(activeBufferJob.batches || []).map((b, i) => (
                                      <span key={i} className="px-2.5 py-1 rounded-lg font-mono text-xs font-bold bg-surface border border-emerald-500/40 text-emerald-400 shadow-xs">
                                        🏷️ {b}
                                      </span>
                                    ))}
                                  </div>
                                </div>

                                <div className="flex justify-end pt-2">
                                  <button
                                    type="button"
                                    onClick={() => handleAdvanceBufferStage(5)}
                                    className="px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-md flex items-center gap-2 cursor-pointer transition-all active:scale-95"
                                  >
                                    <span>✓ Packaging Complete → Proceed to Storage Placement (Stage 5)</span>
                                    <FaArrowRight className="text-xs" />
                                  </button>
                                </div>
                              </div>
                            )}

                            {activeBufferJob.current_stage === 5 && (
                              <div className="space-y-3">
                                <div>
                                  <h4 className="text-xs font-black text-text-primary uppercase tracking-wider">
                                    Stage 5: Deposit to Warehouse Buffer Storage Rack
                                  </h4>
                                  <p className="text-[11px] text-text-secondary">
                                    Ready kits warehouse rack me place karein aur buffer stock inventory me add karein.
                                  </p>
                                </div>

                                <div className="p-4 rounded-xl bg-surface-hover border border-border flex items-center justify-between">
                                  <div>
                                    <div className="text-xs text-text-muted">Target Storage Rack:</div>
                                    <div className="text-base font-black text-text-primary font-mono">{activeBufferJob.target_rack}</div>
                                  </div>
                                  <div className="text-right">
                                    <div className="text-xs text-text-muted">Quantity to Credit:</div>
                                    <div className="text-base font-black text-emerald-400">+{activeBufferJob.qty} Ready Kits</div>
                                  </div>
                                </div>

                                <div className="flex justify-end pt-2">
                                  <button
                                    type="button"
                                    onClick={handleFinalizeBufferStock}
                                    className="px-6 py-3 rounded-xl text-xs font-black uppercase tracking-wider bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-lg shadow-emerald-500/30 flex items-center gap-2 cursor-pointer transition-all active:scale-95"
                                  >
                                    <FaCheckCircle className="text-sm" />
                                    <span>🎉 Finalize & Credit {activeBufferJob.qty} Kit(s) to Warehouse Ready Stock</span>
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      ) : (
                        /* Step 3 Start Assembly Call to Action */
                        <div className="card p-6 rounded-2xl border-2 border-emerald-500/50 bg-surface shadow-md space-y-4">
                          <div className="flex items-center gap-2">
                            <span className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 font-black flex items-center justify-center text-xs">
                              3
                            </span>
                            <span className="text-[10px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-md border border-emerald-500/30">
                              Step 3 of 3: 5-Stage Kit Assembly
                            </span>
                          </div>

                          <div>
                            <h3 className="text-sm font-black text-text-primary uppercase tracking-wider">
                              Ready for 5-Stage Sequential Assembly ({targetBuildQty} Kits)
                            </h3>
                            <p className="text-xs text-text-secondary leading-relaxed mt-1">
                              Sabhi raw materials inward ho chuke hain aur stock verify ho chuka hai. Ab 5 sequential assembly stages (Picking ➔ Wiring ➔ QC Test ➔ Packaging ➔ Storage) start karein aur finished kits ready stock me add karein.
                            </p>
                          </div>

                          <div className="p-4 rounded-xl bg-surface-hover border border-border flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                            <div className="space-y-0.5">
                              <div className="text-text-muted font-bold text-[10px] uppercase">Model to Assemble:</div>
                              <div className="font-bold text-text-primary">{activeModel.name} ({activeModel.capacity})</div>
                            </div>
                            <div className="space-y-0.5">
                              <div className="text-text-muted font-bold text-[10px] uppercase">Storage Rack:</div>
                              <div className="font-mono font-bold text-text-primary">{activeModel.storage_location}</div>
                            </div>
                            <div className="space-y-0.5 sm:text-right">
                              <div className="text-text-muted font-bold text-[10px] uppercase">Target Batch:</div>
                              <div className="font-mono font-black text-emerald-400 text-sm">{targetBuildQty} Kits</div>
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => handleStartAssemblyForModel(activeModel, targetBuildQty)}
                            className="w-full py-4 px-6 rounded-xl text-xs font-black uppercase tracking-wider bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-xl shadow-emerald-500/30 flex items-center justify-center gap-2 cursor-pointer transition-all hover:scale-[1.01] active:scale-95"
                          >
                            <FaTools className="text-sm" />
                            <span>🚀 Start 5-Stage Assembly ({targetBuildQty} Kits) →</span>
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })()
          )}
        </div>

      ) : (
        /* ─────────────────────────────────────────────────────────────
            PART 1: ORDER-SPECIFIC KIT ASSEMBLY & STOCK ALLOCATION
            (Boss Requirement: Check warehouse ready stock first;
             allocate ready stock if available, else assemble on-demand)
           ───────────────────────────────────────────────────────────── */
        <div className="space-y-6">
          {/* Warehouse Operations Scope Clarification */}
          <div className="p-3.5 rounded-2xl bg-gradient-to-r from-purple-500/10 via-surface to-emerald-500/10 border border-purple-500/30 flex items-start gap-3">
            <div className="w-8 h-8 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center text-sm shrink-0 mt-0.5 font-bold">
              <FaShieldAlt />
            </div>
            <div className="text-xs">
              <div className="font-bold text-text-primary">
                Warehouse Standard: BOS Kits (Balance of System) Advance Assembly Only
              </div>
              <p className="text-text-secondary mt-0.5 leading-relaxed">
                Warehouse me <strong>Solar Panels aur Inverters assemble nahi hote</strong> (wo suppliers/manufacturers se direct finished units inward hote hain). Yahan Account Manager ke orders ke hisab se har kW ki <strong>BOS Kit (Mounting Rails, Clamps, DCDB/ACDB, DC/AC Cables, Earthing)</strong> ko advance me assemble karke buffer stock me rakha jata hai taaki order aane par turant 1-click allocation ho sake.
              </p>
            </div>
          </div>

          {/* BOS Kit Metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="card p-4 rounded-2xl border border-border bg-surface shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-text-secondary uppercase tracking-wider">Total Orders</span>
                <div className="w-9 h-9 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center text-sm font-bold">
                  <FaTools />
                </div>
              </div>
              <div className="text-3xl font-black text-text-primary mt-2">
                {orders.filter(o => o.kit_preparation_status && o.kit_preparation_status !== 'not_required').length}
              </div>
              <div className="text-[11px] text-text-muted mt-1">Orders requiring kit assembly</div>
            </div>

            <div className="card p-4 rounded-2xl border border-amber-500/30 bg-amber-500/5 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-amber-400 uppercase tracking-wider">Awaiting Components</span>
                <div className="w-9 h-9 rounded-xl bg-amber-500/15 text-amber-400 flex items-center justify-center text-sm font-bold">
                  <FaExclamationTriangle />
                </div>
              </div>
              <div className="text-3xl font-black text-amber-400 mt-2">
                {orders.filter(o => o.kit_preparation_status === 'awaiting_components').length}
              </div>
              <div className="text-[11px] text-text-muted mt-1">Pending inward component shortfalls</div>
            </div>

            <div className="card p-4 rounded-2xl border border-primary/30 bg-primary/5 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-primary uppercase tracking-wider">In Assembly / QC</span>
                <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center text-sm font-bold">
                  <FaSpinner className="animate-spin" />
                </div>
              </div>
              <div className="text-3xl font-black text-primary mt-2">
                {orders.filter(o => o.kit_preparation_status === 'in_assembly').length}
              </div>
              <div className="text-[11px] text-text-muted mt-1">Workstation picking & QC checks active</div>
            </div>

            <div className="card p-4 rounded-2xl border border-emerald-500/30 bg-emerald-500/5 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider">Completed & Ready</span>
                <div className="w-9 h-9 rounded-xl bg-emerald-500/15 text-emerald-400 flex items-center justify-center text-sm font-bold">
                  <FaCheckCircle />
                </div>
              </div>
              <div className="text-3xl font-black text-emerald-400 mt-2">
                {orders.filter(o => o.kit_preparation_status === 'kit_ready').length}
              </div>
              <div className="text-[11px] text-text-muted mt-1">Assembled & staged for New Orders inward</div>
            </div>
          </div>

          {/* BOS Kit Filter Tabs */}
          {(() => {
            const isOrderKitFullyDone = (o) => {
              return o.kit_preparation_status === 'kit_ready';
            };

            const allPendingCount = orders.filter(o => o.kit_preparation_status && o.kit_preparation_status !== 'not_required' && !isOrderKitFullyDone(o)).length;
            const awaitingCount = orders.filter(o => o.kit_preparation_status === 'awaiting_components' && !isOrderKitFullyDone(o)).length;
            const inAssemblyCount = orders.filter(o => o.kit_preparation_status === 'in_assembly' && !isOrderKitFullyDone(o)).length;

            return (
              <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin">
                {[
                  { id: 'all', label: 'Pending Assembly Queue', count: allPendingCount },
                  { id: 'awaiting_components', label: 'Awaiting Components', count: awaitingCount, color: 'text-amber-400' },
                  { id: 'in_assembly', label: 'In Assembly Station', count: inAssemblyCount, color: 'text-purple-400' },
                ].map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setBoskitStageFilter(tab.id)}
                    className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 border cursor-pointer ${
                      boskitStageFilter === tab.id
                        ? 'bg-purple-600 text-white border-purple-600 shadow-sm'
                        : 'bg-surface hover:bg-surface-hover border-border text-text-secondary hover:text-text-primary'
                    }`}
                  >
                    <span>{tab.label}</span>
                    <span className="px-1.5 py-0.5 rounded-full text-[10px] font-mono bg-white/15 text-white">
                      {tab.count}
                    </span>
                  </button>
                ))}
              </div>
            );
          })()}

          {/* BOS Kit Cards */}
          {(() => {
            const isOrderKitFullyDone = (o) => {
              return o.kit_preparation_status === 'kit_ready';
            };

            const kitOrders = orders
              .filter(o => o.kit_preparation_status && o.kit_preparation_status !== 'not_required')
              .filter(o => !isOrderKitFullyDone(o))
              .filter(o => {
                if (boskitStageFilter === 'all') return true;
                return o.kit_preparation_status === boskitStageFilter;
              });

            if (loading) {
              return (
                <div className="card p-10 text-center space-y-3 bg-surface border border-purple-500/20 rounded-2xl shadow-xs animate-pulse">
                  <FaSpinner className="animate-spin text-3xl text-purple-400 mx-auto" />
                  <div className="text-sm font-bold text-text-primary">Loading Workstation Assembly Queue...</div>
                  <div className="text-xs text-text-secondary">Fetching active orders and BOS kit preparation status</div>
                </div>
              );
            }

            if (kitOrders.length === 0) {
              return (
                <div className="card p-12 text-center space-y-4 bg-gradient-to-br from-emerald-500/10 via-surface to-teal-500/5 border-2 border-emerald-500/30 rounded-3xl shadow-sm">
                  <div className="w-16 h-16 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-3xl mx-auto shadow-inner">
                    <FaCheckCircle />
                  </div>
                  <div className="space-y-1">
                    <div className="text-lg font-black text-text-primary">All BOS Kit Assembly Jobs Completed!</div>
                    <div className="text-xs text-text-secondary max-w-md mx-auto">
                      Specific order BOS kits are assembled, QC passed & staged. They are ready to be allocated and inwarded in <strong>New Orders</strong>.
                    </div>
                  </div>
                  <div>
                    <button
                      onClick={() => {
                        if (standaloneBoskit || location.pathname.includes('bos-kit-assembly')) {
                          navigate(`${prefix}/new-orders`);
                        } else {
                          setMainSectionTab('orders');
                        }
                      }}
                      className="px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider bg-primary hover:bg-primary-hover text-white cursor-pointer shadow-md transition-all inline-flex items-center gap-2"
                    >
                      <span>Go to New Orders Queue</span>
                      <FaArrowRight className="text-xs" />
                    </button>
                  </div>
                </div>
              );
            }

            return (
              <div className="space-y-4">
                {kitOrders.map(ord => {
                  const bosItem = (ord.items || []).find(it => isBosKitItem(it));
                  const { totalKits, capacity, modelName } = getOrderKitMetrics(ord);
                  const orderedKits = bosItem ? (bosItem.ordered_qty || totalKits) : totalKits;
                  const receivedKits = bosItem ? (bosItem.received_qty || 0) : (ord.kit_preparation_status === 'kit_ready' ? totalKits : 0);
                  const pendingKits = Math.max(0, orderedKits - receivedKits);
                  const isKitDone = isOrderKitFullyDone(ord);
                  const assemblyDetails = ord.kit_assembly_details || {};
                  const kitStatus = isKitDone ? 'kit_ready' : (ord.kit_preparation_status || 'in_assembly');
                  const nonBosPending = (ord.items || [])
                    .filter(it => !isBosKitItem(it))
                    .reduce((acc, it) => acc + (it.pending_qty || 0), 0);

                  // Strict Linear 5-Stage Stepper Calculation:
                  // 1 = Picking, 2 = Wiring & Enclosure, 3 = Electrical QC, 4 = Pack & Barcode, 5 = Kit Ready
                  let currentStage = 1;
                  if (isKitDone || ord.kit_preparation_status === 'kit_ready') {
                    currentStage = 5;
                  } else if (assemblyDetails.packed_and_labeled && (assemblyDetails.qc_verified || assemblyDetails.qc_status === 'passed')) {
                    currentStage = 5;
                  } else if (assemblyDetails.qc_verified || assemblyDetails.qc_status === 'passed') {
                    currentStage = 4;
                  } else if (assemblyDetails.assembled_at || assemblyDetails.wiring_completed) {
                    currentStage = 3;
                  } else if (kitStatus === 'in_assembly' || assemblyDetails.picked_at) {
                    currentStage = 2;
                  } else {
                    currentStage = 1;
                  }

                  const matchedModel = preassembledStock.find(m =>
                    (capacity && (m.name?.toLowerCase().includes(capacity.toLowerCase()) || m.capacity?.toLowerCase().includes(capacity.toLowerCase()))) ||
                    (modelName && m.name?.toLowerCase().includes(modelName.toLowerCase()))
                  ) || preassembledStock.find(m => m.name?.toLowerCase().includes('3 kw')) || preassembledStock[0];

                  const stockAvailable = matchedModel?.ready_stock || 0;
                  const canAllocateStock = Math.min(pendingKits, stockAvailable);

                  return (
                    <div
                      key={ord._id}
                      id={`boskit-order-${ord._id}`}
                      className={`card rounded-2xl border bg-surface p-5 space-y-5 shadow-xs transition-all ${
                        focusedOrderId === ord._id
                          ? 'border-purple-500 ring-4 ring-purple-500/40 shadow-xl scale-[1.01]'
                          : 'border-border hover:border-purple-500/40'
                      }`}
                    >
                      {/* Top Context Strip */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/70 pb-3">
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-mono font-black text-primary text-sm">{ord.delivery_order_id}</span>
                            <span className="text-text-muted text-xs">• Order #{ord.order_number}</span>
                            <span className="text-text-primary font-bold text-xs">• {ord.customer_name}</span>
                            {ord.customer_phone && (
                              <span className="text-text-muted text-[11px] font-mono">({ord.customer_phone})</span>
                            )}
                          </div>
                          <div className="text-[11px] text-text-muted mt-1">
                            Destination: {ord.destination?.address}, {ord.destination?.district}, {ord.destination?.state}
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className={`px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider border flex items-center gap-1.5 ${
                            isKitDone
                              ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                              : kitStatus === 'in_assembly'
                              ? 'bg-purple-500/15 text-purple-400 border-purple-500/30 animate-pulse'
                              : 'bg-amber-500/15 text-amber-400 border-amber-500/30'
                          }`}>
                            <FaTools className="text-xs" />
                            <span>{isKitDone ? 'Kit Ready' : kitStatus.replace(/_/g, ' ')}</span>
                          </span>
                          <button
                            onClick={() => handleOpenDetailsModal(ord)}
                            className="p-2 rounded-xl bg-surface-hover hover:bg-surface border border-border text-text-secondary hover:text-text-primary text-xs cursor-pointer"
                            title="View Full Order Dossier"
                          >
                            <HiOutlineEye />
                          </button>
                        </div>
                      </div>

                      {/* ── Status-Specific Display (Ready vs Active Assembly Station) ── */}
                      {isKitDone ? (
                        <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-500/15 via-teal-500/10 to-surface border-2 border-emerald-500/40 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-lg shrink-0">
                              <FaCheckCircle />
                            </div>
                            <div>
                              <div className="font-black text-emerald-400 text-sm flex items-center gap-2">
                                <span>BOS Kit Ready & Staged (All {orderedKits} Kits Completed)</span>
                                <span className="px-2 py-0.5 rounded text-[10px] font-mono uppercase bg-emerald-950/80 border border-emerald-500/40 text-emerald-300">
                                  {assemblyDetails.allocated_from_batch_code || assemblyDetails.kit_serial_barcode || 'WH-BOS-STOCK'}
                                </span>
                              </div>
                              <p className="text-xs text-text-secondary mt-0.5">
                                Complete BOS kit package ({orderedKits} units) tayyar hai aur rack <strong className="text-text-primary font-mono">{assemblyDetails.storage_location || 'BAY-BOS-STOCK'}</strong> par staged hai. Ready for dispatch!
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0 flex-wrap">
                            <button
                              type="button"
                              onClick={() => {
                                if (standaloneBoskit || location.pathname.includes('bos-kit-assembly')) {
                                  navigate(`${prefix}/new-orders`);
                                } else {
                                  setMainSectionTab('orders');
                                }
                              }}
                              className="px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-600 hover:from-emerald-500 hover:to-teal-500 text-white cursor-pointer shadow-md flex items-center gap-2 transition-all active:scale-95"
                              title="Kits are assembled! Open New Orders to allocate and inward."
                            >
                              <FaBoxes className="text-xs" />
                              <span>Allocate in New Orders</span>
                              <FaArrowRight className="text-[10px]" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleOpenAssemblyModal(ord)}
                              className="px-3.5 py-2.5 rounded-xl text-xs font-bold bg-surface-hover hover:bg-surface border border-border text-text-secondary hover:text-text-primary cursor-pointer flex items-center gap-1.5"
                            >
                              <FaTools className="text-xs text-text-muted" />
                              <span>Workstation Dossier</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                if (standaloneBoskit || location.pathname.includes('bos-kit-assembly')) {
                                  navigate(`${prefix}/new-orders`);
                                } else {
                                  setMainSectionTab('orders');
                                }
                              }}
                              className="px-3.5 py-2.5 rounded-xl text-xs font-bold bg-surface-hover hover:bg-surface border border-border text-text-secondary hover:text-text-primary cursor-pointer flex items-center gap-1.5"
                            >
                              <FaArrowLeft className="text-[10px]" />
                              <span>Back to Orders</span>
                            </button>
                          </div>
                        </div>
                      ) : (
                        /* Active On-Demand Kit Assembly Station for this Order */
                        <div className="space-y-4">
                          {/* Raw Material Inward Warning Banner: If components not inwarded yet */}
                          {nonBosPending > 0 && (
                            <div className="p-4 rounded-2xl bg-amber-500/15 border-2 border-amber-500/50 text-amber-300 space-y-2.5 shadow-sm">
                              <div className="flex items-start gap-3">
                                <FaExclamationTriangle className="text-xl text-amber-400 shrink-0 mt-0.5" />
                                <div className="space-y-1">
                                  <div className="font-black text-sm text-amber-200 uppercase tracking-wide">
                                    ⚠️ Pehle Raw Material Inward Karein New Orders Tab Me!
                                  </div>
                                  <p className="text-xs text-amber-300/90 leading-relaxed">
                                    Is order ke liye <strong>{nonBosPending} units</strong> raw materials / components supplier se warehouse me physical inward hona baaki hain. Pehle <strong>New Orders</strong> tab me jakar <strong>"Inward Material"</strong> button se components inward karein, uske baad workstation par BOS kit assembly shuru karein.
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-center gap-3 pt-1">
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (standaloneBoskit || location.pathname.includes('bos-kit-assembly')) {
                                      navigate(`${prefix}/new-orders`);
                                    } else {
                                      setMainSectionTab('orders');
                                    }
                                    handleOpenInwardModal(ord);
                                  }}
                                  className="px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider bg-amber-500 hover:bg-amber-400 text-black shadow-md flex items-center gap-2 cursor-pointer transition-all active:scale-95"
                                >
                                  <HiOutlineClipboardCheck className="text-base" />
                                  <span>📦 Go to New Orders & Inward Material Now →</span>
                                </button>
                              </div>
                            </div>
                          )}

                          {/* Banner with kit counts and optional buffer allocation */}
                          <div className="p-4 rounded-2xl bg-gradient-to-r from-purple-950/40 via-surface to-indigo-950/30 border-2 border-purple-500/40 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm">
                            <div className="space-y-1.5">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="px-2.5 py-1 rounded-lg text-xs font-black uppercase tracking-wider bg-purple-500/20 text-purple-300 border border-purple-500/40 flex items-center gap-1.5">
                                  <FaTools className="text-purple-400" />
                                  Order Requirement: {orderedKits} Kits ({capacity})
                                </span>
                                <span className="px-2.5 py-1 rounded-lg text-xs font-bold uppercase tracking-wider bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                                  ✓ {receivedKits} Ready / Allocated
                                </span>
                                <span className="px-2.5 py-1 rounded-lg text-xs font-black uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/40 animate-pulse">
                                  🔨 {pendingKits} Kits to Assemble
                                </span>
                              </div>
                              <p className="text-xs text-text-secondary">
                                Order ke liye <strong>{pendingKits} BOS Kits</strong> tayyar karni hain. Niche 5-stage assembly line se raw components pick karein, wiring complete karein, QC pass karein aur final kit tayyar karein.
                              </p>
                            </div>

                            {stockAvailable > 0 && (
                              <button
                                type="button"
                                onClick={() => handleOpenStockAllocationModal(ord)}
                                className="px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-md flex items-center gap-2 cursor-pointer transition-all active:scale-95 shrink-0"
                                title="1-Click allocate pre-assembled kits from warehouse stock"
                              >
                                <FaCheck className="text-xs" />
                                <span>⚡ Allocate {canAllocateStock} from Buffer Stock</span>
                              </button>
                            )}
                          </div>

                          {/* 5-Stage Stepper Workflow (Strict Sequential Progression) */}
                          {(() => {
                            const steps = [
                              {
                                num: 1,
                                title: '1. Picking',
                                subtitle: `Pick (${pendingKits} Kits BOM)`,
                                icon: FaBoxes,
                                isDone: isKitDone || currentStage > 1,
                                isActive: !isKitDone && currentStage === 1,
                                isLocked: currentStage < 1
                              },
                              {
                                num: 2,
                                title: '2. Assembly',
                                subtitle: 'Wiring & Enclosure',
                                icon: FaWrench,
                                isDone: isKitDone || currentStage > 2,
                                isActive: !isKitDone && currentStage === 2,
                                isLocked: currentStage < 2
                              },
                              {
                                num: 3,
                                title: '3. QC Check',
                                subtitle: 'Electrical QC Check',
                                icon: FaClipboardCheck,
                                isDone: isKitDone || currentStage > 3,
                                isActive: !isKitDone && currentStage === 3,
                                isLocked: currentStage < 3
                              },
                              {
                                num: 4,
                                title: '4. Packaging',
                                subtitle: 'Pack & Barcode Label',
                                icon: FaBarcode,
                                isDone: isKitDone || currentStage > 4,
                                isActive: !isKitDone && currentStage === 4,
                                isLocked: currentStage < 4
                              },
                              {
                                num: 5,
                                title: '5. Kit Ready',
                                subtitle: `Stage ${pendingKits} Kits`,
                                icon: FaCheckDouble,
                                isDone: isKitDone,
                                isActive: !isKitDone && currentStage === 5,
                                isLocked: currentStage < 5
                              }
                            ];

                            return (
                              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 text-center text-xs">
                                {steps.map((st) => {
                                  const StepIcon = st.icon;
                                  return (
                                    <div
                                      key={st.num}
                                      className={`p-3 rounded-2xl border transition-all duration-300 relative overflow-hidden flex flex-col justify-between ${
                                        st.isDone
                                          ? 'bg-emerald-500/10 border-2 border-emerald-500/40 text-emerald-500 dark:text-emerald-400 font-bold shadow-xs'
                                          : st.isActive
                                          ? 'bg-gradient-to-b from-purple-500/15 via-primary/10 to-transparent border-2 border-primary text-primary font-black shadow-lg shadow-primary/15 ring-2 ring-primary/25 scale-[1.02] hover:scale-[1.04] hover:border-primary cursor-pointer'
                                          : 'bg-surface-hover/30 border-border/60 text-text-muted opacity-50 cursor-not-allowed select-none'
                                      }`}
                                    >
                                      {/* Top icon and title */}
                                      <div className="flex items-center justify-between mb-1">
                                        <span className="text-[10px] uppercase font-black tracking-wider">{st.title}</span>
                                        {st.isDone ? (
                                          <FaCheckCircle className="text-emerald-500 text-xs shrink-0" />
                                        ) : st.isActive ? (
                                          <StepIcon className="text-primary text-xs shrink-0 animate-bounce" />
                                        ) : (
                                          <FaLock className="text-text-muted text-[10px] shrink-0" />
                                        )}
                                      </div>

                                      <div className={`text-[11px] leading-tight my-1 text-left ${st.isActive ? 'text-text-primary font-bold' : st.isDone ? 'text-emerald-600 dark:text-emerald-300' : 'text-text-muted'}`}>
                                        {st.subtitle}
                                      </div>

                                      {/* Bottom Status Tag */}
                                      <div className="mt-2 pt-1.5 border-t border-border/40 flex items-center justify-center">
                                        {st.isDone ? (
                                          <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                                            ✓ Done
                                          </span>
                                        ) : st.isActive ? (
                                          <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-primary text-white shadow-xs flex items-center gap-1 animate-pulse">
                                            ● In Progress
                                          </span>
                                        ) : (
                                          <span className="px-2 py-0.5 rounded-full text-[9px] font-bold uppercase bg-surface text-text-muted border border-border/40 flex items-center gap-1">
                                            🔒 Locked
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            );
                          })()}

                          {/* True BOS Kit BOM Components Table */}
                          <div className="border border-border rounded-xl overflow-hidden bg-surface">
                            <div className="p-3 bg-surface-hover/80 border-b border-border flex items-center justify-between">
                              <span className="text-xs font-black uppercase tracking-wider text-text-primary flex items-center gap-2">
                                <FaBoxes className="text-primary" />
                                <span>Required Raw Components for {pendingKits} Pending Kits</span>
                              </span>
                              <span className="text-[11px] text-text-muted">
                                Dynamically calculated based on {capacity} combo kit recipe
                              </span>
                            </div>
                            <table className="w-full text-left text-xs">
                              <thead className="bg-surface-hover/50 border-b border-border text-[10px] font-black uppercase text-text-muted">
                                <tr>
                                  <th className="p-3">BOS Raw Material / SKU</th>
                                  <th className="p-3">Per Kit Qty</th>
                                  <th className="p-3 text-center">Total for {pendingKits} Kits</th>
                                  <th className="p-3 text-center">Status</th>
                                  <th className="p-3 text-right">Workstation Action</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-border">
                                {(() => {
                                  const bomList = (matchedModel?.bom_components || [
                                    { name: 'Aluminium Mounting Rails (4.2m)', sku: 'BOS-RAIL-4.2M-AL', qty: 8, unit: 'Pcs' },
                                    { name: 'SS304 Mid Clamps (35mm)', sku: 'BOS-CLAMP-MID-35MM', qty: 14, unit: 'Pcs' },
                                    { name: 'SS304 End Clamps (35mm)', sku: 'BOS-CLAMP-END-35MM', qty: 4, unit: 'Pcs' },
                                    { name: '4 sq mm Solar DC Cable', sku: 'BOS-DC-CABLE-4SQMM-100M', qty: 1, unit: 'Roll' },
                                    { name: 'Single Phase ACDB / DCDB Enclosure', sku: 'BOS-AJB-DCDB-4IN-4OUT', qty: 1, unit: 'Box' },
                                    { name: 'Copper Earthing Rod & Compound', sku: 'BOS-EARTH-ROD-COPPER-2M', qty: 2, unit: 'Pcs' },
                                    { name: 'MC4 Connectors 1000V', sku: 'BOS-MC4-CONN-1000V', qty: 4, unit: 'Pairs' }
                                  ]);

                                  return bomList.map(it => {
                                    const totalRequired = it.qty * pendingKits;
                                    return (
                                      <tr key={it.sku} className="hover:bg-surface-hover/30">
                                        <td className="p-3">
                                          <div className="font-bold text-text-primary">{it.name}</div>
                                          <div className="text-[10px] font-mono text-purple-400 font-bold">{it.sku}</div>
                                        </td>
                                        <td className="p-3 text-[11px] text-text-secondary">
                                          {it.qty} {it.unit || 'Pcs'} / kit
                                        </td>
                                        <td className="p-3 text-center font-mono font-black text-primary text-xs">
                                          {totalRequired} {it.unit || 'Pcs'}
                                        </td>
                                        <td className="p-3 text-center">
                                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-500/15 text-purple-400">
                                            Ready on Workstation
                                          </span>
                                        </td>
                                        <td className="p-3 text-right">
                                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold bg-surface-hover text-text-secondary border border-border">
                                            Bin Verified
                                          </span>
                                        </td>
                                      </tr>
                                    );
                                  });
                                })()}
                              </tbody>
                            </table>
                          </div>

                          {/* Solarkits Barcode & Action Strip */}
                          <div className="p-3.5 bg-surface-hover/60 border border-border rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-3">
                            <div className="flex items-center gap-2 flex-1 max-w-md">
                              <FaBarcode className="text-primary text-base shrink-0" />
                              <input
                                type="text"
                                value={kitBarcodeLabel || `SK-KIT-${ord.order_number}-01`}
                                onChange={(e) => setKitBarcodeLabel(e.target.value)}
                                placeholder="Kit Tracking Serial Barcode"
                                className="flex-1 p-2 text-xs font-mono font-bold bg-surface border border-border rounded-lg text-text-primary focus:border-primary"
                              />
                            </div>

                            {/* Advance Stage Buttons (Single Sequential Action Button based on currentStage) */}
                            <div className="flex items-center gap-2 flex-wrap">
                              {currentStage === 1 && (
                                <button
                                  type="button"
                                  disabled={submittingAssembly || nonBosPending > 0}
                                  onClick={() => handleAdvanceAssembly('in_assembly', ord)}
                                  className="px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider bg-purple-600 hover:bg-purple-500 text-white cursor-pointer shadow-md flex items-center gap-2 transition-all active:scale-95 disabled:opacity-50"
                                  title={nonBosPending > 0 ? "Pehle New Orders tab me Inward button se raw material inward karein!" : "Move verified components to assembly station"}
                                >
                                  {submittingAssembly ? <FaSpinner className="animate-spin text-xs" /> : <FaTools className="text-xs" />}
                                  <span>👉 Next: Move to Assembly & Start Wiring (Stage 2)</span>
                                  <FaArrowRight className="text-[10px]" />
                                </button>
                              )}

                              {currentStage === 2 && (
                                <button
                                  type="button"
                                  disabled={submittingAssembly || nonBosPending > 0}
                                  onClick={() => handleAdvanceAssembly('assembled', ord)}
                                  className="px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider bg-indigo-600 hover:bg-indigo-500 text-white cursor-pointer shadow-md flex items-center gap-2 transition-all active:scale-95 disabled:opacity-50"
                                  title={nonBosPending > 0 ? "Pehle New Orders tab me Inward button se raw material inward karein!" : "Mark electrical wiring & mechanical assembly complete"}
                                >
                                  {submittingAssembly ? <FaSpinner className="animate-spin text-xs" /> : <FaWrench className="text-xs" />}
                                  <span>👉 Next: Complete Wiring & Move to QC (Stage 3)</span>
                                  <FaArrowRight className="text-[10px]" />
                                </button>
                              )}

                              {currentStage === 3 && (
                                <button
                                  type="button"
                                  disabled={submittingAssembly || nonBosPending > 0}
                                  onClick={() => handleAdvanceAssembly('qc_verified', ord)}
                                  className="px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider bg-teal-600 hover:bg-teal-500 text-white cursor-pointer shadow-md flex items-center gap-2 transition-all active:scale-95 disabled:opacity-50"
                                  title={nonBosPending > 0 ? "Pehle New Orders tab me Inward button se raw material inward karein!" : "Record electrical testing and QC inspection pass"}
                                >
                                  {submittingAssembly ? <FaSpinner className="animate-spin text-xs" /> : <FaClipboardCheck className="text-xs" />}
                                  <span>👉 Next: Pass QC Inspection & Move to Pack (Stage 4)</span>
                                  <FaArrowRight className="text-[10px]" />
                                </button>
                              )}

                              {currentStage === 4 && (
                                <button
                                  type="button"
                                  disabled={submittingAssembly || nonBosPending > 0}
                                  onClick={() => handleAdvanceAssembly('packed_and_labeled', ord)}
                                  className="px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider bg-blue-600 hover:bg-blue-500 text-white cursor-pointer shadow-md flex items-center gap-2 transition-all active:scale-95 disabled:opacity-50"
                                  title={nonBosPending > 0 ? "Pehle New Orders tab me Inward button se raw material inward karein!" : "Package kit and attach SolarKits QR/barcode label"}
                                >
                                  {submittingAssembly ? <FaSpinner className="animate-spin text-xs" /> : <FaBarcode className="text-xs" />}
                                  <span>👉 Next: Attach Barcode & Pack (Stage 5)</span>
                                  <FaArrowRight className="text-[10px]" />
                                </button>
                              )}

                              {currentStage === 5 && !isKitDone && (
                                <button
                                  type="button"
                                  disabled={submittingAssembly || nonBosPending > 0}
                                  onClick={() => handleAdvanceAssembly('kit_ready', ord)}
                                  className="px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-600 hover:from-emerald-500 hover:to-teal-500 text-white cursor-pointer flex items-center gap-2 shadow-lg shadow-emerald-500/25 transition-all active:scale-95 disabled:opacity-50"
                                  title={nonBosPending > 0 ? "Pehle New Orders tab me Inward button se raw material inward karein!" : "Finalize assembly and mark all kits ready in warehouse"}
                                >
                                  {submittingAssembly ? <FaSpinner className="animate-spin text-xs" /> : <FaCheckDouble className="text-xs" />}
                                  <span>✓ Complete Assembly & Mark {pendingKits} Kits Ready</span>
                                </button>
                              )}

                              <button
                                type="button"
                                onClick={() => handleOpenAssemblyModal(ord)}
                                className="px-3.5 py-2.5 rounded-xl text-xs font-bold bg-surface-hover hover:bg-surface border border-border text-text-secondary hover:text-text-primary cursor-pointer flex items-center gap-1.5"
                              >
                                <FaTools className="text-xs text-text-muted" />
                                <span>Workstation Dossier</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  if (standaloneBoskit || location.pathname.includes('bos-kit-assembly')) {
                                    navigate(`${prefix}/new-orders`);
                                  } else {
                                    setMainSectionTab('orders');
                                  }
                                }}
                                className="px-3.5 py-2.5 rounded-xl text-xs font-bold bg-surface-hover hover:bg-surface border border-border text-text-secondary hover:text-text-primary cursor-pointer flex items-center gap-1.5"
                              >
                                <FaArrowLeft className="text-[10px]" />
                                <span>Back to Orders</span>
                              </button>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            );
          })()}
        </div>
      )}
    </div>
  )}

      {/* ── Order-Specific Material Inward Modal (Physical Gate Challan & Scanner Verification) ── */}
      <Dialog
        isOpen={inwardModalOpen}
        onClose={() => setInwardModalOpen(false)}
        title={`Material Inward Entry: ${selectedOrderForInward?.delivery_order_id || ''}`}
        size="xl"
      >
        {selectedOrderForInward && (() => {
          const totalExpectedQty = (modalInwardItems || []).reduce((acc, it) => acc + (it.pending_qty || 0), 0);
          const totalScannedCount = scannedSerials.length;

          return (
          <div className="space-y-4 p-1">
            {/* ── Mode Selector Tabs (Image 1 Style: Online Scanner Gun vs Offline Physical Gate Challan) ── */}
            <div className="flex bg-slate-200 border-2 border-slate-300 p-1.5 rounded-2xl gap-2 shadow-2xs">
              <button
                type="button"
                onClick={() => setInwardExecutionMode('scanner')}
                className={`flex-1 py-2.5 px-4 rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer ${
                  inwardExecutionMode === 'scanner'
                    ? 'bg-emerald-600 text-white shadow-sm ring-2 ring-emerald-500/30'
                    : 'text-slate-700 hover:bg-white hover:text-slate-900'
                }`}
              >
                <FaBarcode className="text-base" />
                <span>Online Inward (Scanner Gun & QR Code Feed)</span>
              </button>
              <button
                type="button"
                onClick={() => setInwardExecutionMode('manual')}
                className={`flex-1 py-2.5 px-4 rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer ${
                  inwardExecutionMode === 'manual'
                    ? 'bg-primary text-white shadow-sm ring-2 ring-primary/30'
                    : 'text-slate-700 hover:bg-white hover:text-slate-900'
                }`}
              >
                <FaClipboardCheck className="text-base" />
                <span>Offline Inward (Physical Gate Challan & Invoice)</span>
              </button>
            </div>

            {/* ── PI / Consignment & Logistics Summary Card (Image 1 Style 4-Column Strip) ── */}
            <div className="bg-slate-100 border-2 border-slate-300 rounded-2xl p-3.5 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs shadow-xs">
              <div>
                <span className="text-[10px] font-black text-slate-600 uppercase block">PI / Order Consignment No</span>
                <span className="font-mono font-black text-primary text-sm">{selectedOrderForInward.delivery_order_id}</span>
                <span className="text-[10px] text-slate-600 font-bold block">Order #{selectedOrderForInward.order_number}</span>
              </div>
              <div>
                <span className="text-[10px] font-black text-slate-600 uppercase block">Supplier / Origin</span>
                <span className="font-bold text-slate-900 block truncate">Central Factory / Approved Vendors</span>
                <span className="text-[10px] text-slate-600 font-semibold">SolarKits Manufacturing Unit</span>
              </div>
              <div>
                <span className="text-[10px] font-black text-slate-600 uppercase block">Delivery Method & Vehicle</span>
                <span className="font-bold text-slate-900 block">{selectedOrderForInward.incoming_truck_group?.transporter_name || selectedOrderForInward.transport_details?.transporter_name || 'Central Freight Logistics'}</span>
                <span className="text-[11px] font-mono text-primary font-bold">
                  {selectedOrderForInward.incoming_truck_group?.vehicle_number || selectedOrderForInward.transport_details?.vehicle_number || 'Truck Assigned'}
                </span>
              </div>
              <div>
                <span className="text-[10px] font-black text-slate-600 uppercase block">Destination Hub</span>
                <span className="font-bold text-slate-900 block">{selectedOrderForInward.warehouse_code || 'Central Hub WH-IND-GJ-001'}</span>
                <span className="text-[10px] text-slate-600 font-bold">Total: {totalExpectedQty} units expected</span>
              </div>
            </div>

            {/* ── Consignment Dossier & EPC Allocation Header (Boss Requirement: Show all EPCs with names, contacts, destinations & exact material breakdowns) ── */}
            {(() => {
              const epcList = (selectedOrderForInward.epcs && selectedOrderForInward.epcs.length > 0)
                ? selectedOrderForInward.epcs
                : [{
                    epc_id: selectedOrderForInward.customer_id || 'EPC-PRIMARY',
                    epc_name: selectedOrderForInward.customer_name,
                    phone: selectedOrderForInward.customer_phone,
                    destination: selectedOrderForInward.destination,
                    solarkit_model: selectedOrderForInward.solarkit_model,
                    system_capacity: selectedOrderForInward.system_capacity,
                    panels_qty: (selectedOrderForInward.items?.find(i => (i.product_name || '').toLowerCase().includes('panel'))?.ordered_qty || (9 * (selectedOrderForInward.num_kits || 1))) + ' Pcs',
                    inverter_qty: (selectedOrderForInward.items?.find(i => (i.product_name || '').toLowerCase().includes('inverter'))?.ordered_qty || (selectedOrderForInward.num_kits || 1)) + ' Pcs',
                    boskit_qty: (selectedOrderForInward.num_kits || 1) + ' Pcs',
                    structure_qty: (selectedOrderForInward.num_kits || 1) + ' Sets',
                    items: selectedOrderForInward.items
                  }];

              return (
                <div className="p-4 rounded-2xl bg-gradient-to-br from-purple-50 via-white to-indigo-50 border-2 border-purple-300 space-y-3 shadow-xs">
                  {/* Top Bar: Consignment Summary & Inward Actions */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b-2 border-purple-200 pb-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-10 h-10 rounded-xl bg-purple-600 text-white flex items-center justify-center text-base shadow-xs shrink-0">
                        <FaLayerGroup />
                      </div>
                      <div>
                        <div className="text-xs font-black uppercase tracking-wider text-purple-950 flex items-center gap-2">
                          <span>Consignment EPC Recipients & Material Allocation</span>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-purple-200 text-purple-900 border border-purple-300">
                            {epcList.length} EPC{epcList.length > 1 ? 's' : ''} in this Truck Consignment
                          </span>
                        </div>
                        <div className="text-[11px] text-purple-900 font-semibold mt-0.5">
                          Har EPC ka physical maal & delivery details niche card me verify karein.
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => setActiveInwardTab('inward')}
                        className={`px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
                          activeInwardTab === 'inward'
                            ? 'bg-purple-700 text-white shadow-sm ring-2 ring-purple-400'
                            : 'bg-white text-slate-700 hover:text-slate-900 border-2 border-slate-300 hover:bg-slate-50'
                        }`}
                      >
                        📦 Record Inward
                      </button>
                      <button
                        type="button"
                        onClick={() => setActiveInwardTab('history')}
                        className={`px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
                          activeInwardTab === 'history'
                            ? 'bg-purple-700 text-white shadow-sm ring-2 ring-purple-400'
                            : 'bg-white text-slate-700 hover:text-slate-900 border-2 border-slate-300 hover:bg-slate-50'
                        }`}
                      >
                        📋 Inward History ({(selectedOrderForInward.inward_history || []).length})
                      </button>
                    </div>
                  </div>

                  {/* EPC Cards Grid: Complete Details & Exact Material Allocations */}
                  <div className={`grid grid-cols-1 ${epcList.length > 1 ? 'md:grid-cols-2 lg:grid-cols-3' : 'grid-cols-1'} gap-3`}>
                    {epcList.map((epc, eIdx) => {
                      const panelsCount = epc.panels_qty || (selectedOrderForInward.items?.find(i => (i.product_name || '').toLowerCase().includes('panel'))?.ordered_qty || 9) + ' Pcs';
                      const inverterCount = epc.inverter_qty || (selectedOrderForInward.items?.find(i => (i.product_name || '').toLowerCase().includes('inverter'))?.ordered_qty || 1) + ' Pcs';
                      const boskitCount = epc.boskit_qty || (selectedOrderForInward.num_kits || 1) + ' Pcs';
                      const structCount = epc.structure_qty || (selectedOrderForInward.num_kits || 1) + ' Sets';

                      return (
                        <div
                          key={epc.epc_id || eIdx}
                          className="p-3.5 rounded-xl bg-white border-2 border-purple-200 shadow-2xs hover:border-purple-400 transition-all space-y-2.5"
                        >
                          {/* Card Header: EPC Name & Badge */}
                          <div className="flex items-start justify-between gap-2 border-b border-purple-100 pb-2">
                            <div>
                              <div className="font-black text-slate-900 text-xs sm:text-sm flex items-center gap-1.5">
                                <span className="text-purple-700 font-mono text-xs">#{eIdx + 1}</span>
                                <span>{epc.epc_name || selectedOrderForInward.customer_name}</span>
                              </div>
                              <div className="text-[11px] text-slate-600 font-bold mt-0.5 flex items-center gap-1.5">
                                <span>📞 {epc.phone || selectedOrderForInward.customer_phone || 'N/A'}</span>
                                {epc.system_capacity && (
                                  <span className="px-1.5 py-0.2 rounded bg-purple-100 text-purple-900 text-[10px] font-bold">
                                    ⚡ {epc.system_capacity}
                                  </span>
                                )}
                              </div>
                            </div>
                            <span className="px-2 py-0.5 rounded text-[10px] font-mono font-black bg-purple-100 text-purple-900 border border-purple-300 shrink-0">
                              {epc.solarkit_model || selectedOrderForInward.solarkit_model || 'SolarKit'}
                            </span>
                          </div>

                          {/* Destination Address */}
                          <div className="text-[11px] text-slate-700 font-medium flex items-start gap-1.5 bg-slate-50 p-2 rounded-lg border border-slate-200">
                            <FaMapMarkerAlt className="text-rose-600 shrink-0 text-xs mt-0.5" />
                            <span className="line-clamp-2">
                              <strong>Destination: </strong>
                              {epc.destination?.address || selectedOrderForInward.destination?.address}, {epc.destination?.district || selectedOrderForInward.destination?.district}, {epc.destination?.state || selectedOrderForInward.destination?.state} - {epc.destination?.pincode || selectedOrderForInward.destination?.pincode}
                            </span>
                          </div>

                          {/* EXACT MATERIAL ALLOCATION FOR THIS EPC */}
                          <div className="space-y-1">
                            <div className="text-[10px] font-black uppercase tracking-wider text-purple-950 flex items-center justify-between">
                              <span>Allocated Materials for this EPC:</span>
                              <span className="text-slate-500 font-mono text-[9px]">Truck Share</span>
                            </div>
                            <div className="grid grid-cols-2 gap-1.5 text-[11px] font-bold">
                              <div className="bg-amber-50 text-amber-950 p-1.5 rounded-lg border border-amber-200 flex items-center justify-between">
                                <span className="flex items-center gap-1">☀️ Panels</span>
                                <strong className="font-mono text-amber-900">{panelsCount}</strong>
                              </div>
                              <div className="bg-blue-50 text-blue-950 p-1.5 rounded-lg border border-blue-200 flex items-center justify-between">
                                <span className="flex items-center gap-1">⚡ Inverters</span>
                                <strong className="font-mono text-blue-900">{inverterCount}</strong>
                              </div>
                              <div className="bg-purple-50 text-purple-950 p-1.5 rounded-lg border border-purple-200 flex items-center justify-between">
                                <span className="flex items-center gap-1">🛠️ BOS Kits</span>
                                <strong className="font-mono text-purple-900">{boskitCount}</strong>
                              </div>
                              <div className="bg-emerald-50 text-emerald-950 p-1.5 rounded-lg border border-emerald-200 flex items-center justify-between">
                                <span className="flex items-center gap-1">🏗️ Structure</span>
                                <strong className="font-mono text-emerald-900">{structCount}</strong>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })()}

            {/* ── Top Invoice, Date and Default Storage Rack Fields (Image 1 Style) ── */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-100 border-2 border-slate-300 rounded-2xl p-3.5 shadow-xs">
              <div>
                <label className="text-[11px] font-black uppercase text-slate-800 block mb-1">
                  Supplier Tax Invoice / Gate Pass No *
                </label>
                <input
                  type="text"
                  required
                  value={supplierInvoiceNo}
                  onChange={(e) => setSupplierInvoiceNo(e.target.value)}
                  placeholder="e.g. INV-DO-2026-0001 or GP-881"
                  className="w-full p-2.5 text-xs font-mono font-black bg-white border-2 border-slate-400 rounded-xl text-slate-900 focus:border-primary focus:ring-1 focus:ring-primary/20 shadow-2xs"
                />
              </div>
              <div>
                <label className="text-[11px] font-black uppercase text-slate-800 block mb-1">
                  Invoice Date *
                </label>
                <input
                  type="date"
                  required
                  value={invoiceDate}
                  onChange={(e) => setInvoiceDate(e.target.value)}
                  className="w-full p-2.5 text-xs font-mono font-black bg-white border-2 border-slate-400 rounded-xl text-slate-900 focus:border-primary focus:ring-1 focus:ring-primary/20 shadow-2xs"
                />
              </div>
              <div>
                <label className="text-[11px] font-black uppercase text-slate-800 block mb-1">
                  Default Storage Rack / Bay
                </label>
                <input
                  type="text"
                  value={defaultStorageRack}
                  onChange={(e) => {
                    const val = e.target.value;
                    setDefaultStorageRack(val);
                    // Also update empty rack_location entries
                    setInwardInputs(prev => {
                      const updated = { ...prev };
                      Object.keys(updated).forEach(k => {
                        if (!updated[k]?.rack_location) {
                          updated[k] = { ...updated[k], rack_location: val };
                        }
                      });
                      return updated;
                    });
                  }}
                  placeholder="e.g. BAY-A1-01"
                  className="w-full p-2.5 text-xs font-mono font-black bg-white border-2 border-slate-400 rounded-xl text-slate-900 focus:border-primary focus:ring-1 focus:ring-primary/20 shadow-2xs"
                />
              </div>
            </div>

            {activeInwardTab === 'inward' ? (
              <form onSubmit={handleSubmitInward} className="space-y-4">
                {/* ── Inward Destination Type (Warehouse Inward vs Direct Pickup From Site/Supplier) ── */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 rounded-2xl bg-slate-100 border-2 border-slate-300">
                  <div
                    onClick={() => setInwardType('warehouse')}
                    className={`p-3.5 rounded-xl border-2 cursor-pointer transition-all ${
                      inwardType === 'warehouse'
                        ? 'bg-blue-50/90 border-primary text-primary font-black shadow-sm ring-2 ring-primary/20'
                        : 'bg-white border-slate-300 text-slate-700 hover:border-slate-400 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <FaWarehouse className="text-base text-primary" />
                      <span className="text-xs font-black uppercase tracking-wider text-slate-900">🏢 Warehouse Dock Inward</span>
                    </div>
                    <div className="text-[11px] text-slate-700 font-semibold mt-1">
                      Material physically arrives at warehouse receiving bay for verification, palletizing & staging.
                    </div>
                  </div>

                  <div
                    onClick={() => setInwardType('pickup_location')}
                    className={`p-3.5 rounded-xl border-2 cursor-pointer transition-all ${
                      inwardType === 'pickup_location'
                        ? 'bg-teal-50 border-teal-600 text-teal-900 font-black shadow-sm ring-2 ring-teal-500/20'
                        : 'bg-white border-slate-300 text-slate-700 hover:border-slate-400 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <FaTruck className="text-base text-teal-600" />
                      <span className="text-xs font-black uppercase tracking-wider text-slate-900">📍 Direct Pickup from Supplier / Site</span>
                    </div>
                    <div className="text-[11px] text-slate-700 font-semibold mt-1">
                      Direct pickup from vendor or factory straight to customer site without storing in central hub.
                    </div>
                  </div>
                </div>

                {/* Pickup Location Details if Direct Pickup selected */}
                {inwardType === 'pickup_location' && (
                  <div className="p-4 rounded-xl bg-teal-50/80 border-2 border-teal-400 space-y-2.5">
                    <div className="text-xs font-black text-teal-950 flex items-center gap-1.5 uppercase tracking-wider">
                      <FaMapMarkerAlt className="text-teal-700" /> Direct Pickup Location & Supplier Point Details
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 text-xs">
                      <div>
                        <label className="text-[11px] text-slate-800 font-bold block mb-1">Location Name / Vendor</label>
                        <input
                          type="text"
                          placeholder="e.g. Waaree Plant / Havells Depot"
                          value={pickupLocationDetails.location_name}
                          onChange={(e) => setPickupLocationDetails(prev => ({ ...prev, location_name: e.target.value }))}
                          className="w-full p-2.5 text-xs font-semibold bg-white border-2 border-slate-300 rounded-lg text-slate-900 placeholder:text-slate-400 focus:border-teal-600 focus:ring-1 focus:ring-teal-200"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] text-slate-800 font-bold block mb-1">Address / Landmark</label>
                        <input
                          type="text"
                          placeholder="e.g. GIDC Industrial Area"
                          value={pickupLocationDetails.address}
                          onChange={(e) => setPickupLocationDetails(prev => ({ ...prev, address: e.target.value }))}
                          className="w-full p-2.5 text-xs font-semibold bg-white border-2 border-slate-300 rounded-lg text-slate-900 placeholder:text-slate-400 focus:border-teal-600 focus:ring-1 focus:ring-teal-200"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] text-slate-800 font-bold block mb-1">Contact Person</label>
                        <input
                          type="text"
                          placeholder="e.g. Rajesh Kumar"
                          value={pickupLocationDetails.contact_person}
                          onChange={(e) => setPickupLocationDetails(prev => ({ ...prev, contact_person: e.target.value }))}
                          className="w-full p-2.5 text-xs font-semibold bg-white border-2 border-slate-300 rounded-lg text-slate-900 placeholder:text-slate-400 focus:border-teal-600 focus:ring-1 focus:ring-teal-200"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] text-slate-800 font-bold block mb-1">Contact Phone</label>
                        <input
                          type="text"
                          placeholder="e.g. +91 98765 43210"
                          value={pickupLocationDetails.contact_phone}
                          onChange={(e) => setPickupLocationDetails(prev => ({ ...prev, contact_phone: e.target.value }))}
                          className="w-full p-2.5 text-xs font-semibold bg-white border-2 border-slate-300 rounded-lg text-slate-900 placeholder:text-slate-400 focus:border-teal-600 focus:ring-1 focus:ring-teal-200"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* ── MODE A: ONLINE SCANNER GUN VIEW ── */}
                {inwardExecutionMode === 'scanner' && (
                  <div className="p-4 rounded-2xl bg-emerald-50/80 border-2 border-emerald-400 space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="space-y-0.5">
                        <div className="text-xs font-black text-emerald-950 uppercase tracking-wider flex items-center gap-1.5">
                          <FaBarcode className="text-sm text-emerald-700" /> Live Barcode / QR Scanner Gun Feed
                        </div>
                        <div className="text-[11px] text-slate-700 font-semibold">
                          Point laser scanner gun at product cartons or scan QR serial tags. Scans match live with order items.
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="px-3 py-1 rounded-full bg-emerald-100 text-emerald-900 font-mono font-black text-xs border-2 border-emerald-400 shrink-0">
                          {scannedSerials.length} Serials Scanned
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            const updated = { ...inwardInputs };
                            modalInwardItems.forEach(it => {
                              updated[it.sku] = {
                                ...(updated[it.sku] || {}),
                                qty: it.pending_qty,
                                damaged_qty: 0,
                                missing_qty: 0,
                                rack_location: defaultStorageRack || 'BAY-A1-01'
                              };
                            });
                            setInwardInputs(updated);
                            dispatch(setAlert({ message: `Auto-filled remaining quantities for all items.`, type: 'info' }));
                          }}
                          className="px-3 py-1 rounded-xl text-[10px] font-black uppercase tracking-wider bg-warning/15 text-warning-700 border border-warning/40 hover:bg-warning/25 transition-all cursor-pointer shadow-2xs"
                        >
                          ⚡ Auto-Fill Remaining
                        </button>
                      </div>
                    </div>

                    {/* Scanner Input Bar */}
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <FaBarcode className="absolute left-3.5 top-1/2 -translate-y-1/2 text-emerald-700 text-base" />
                        <input
                          type="text"
                          autoFocus
                          value={scannerInput}
                          onChange={(e) => setScannerInput(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              handleScanItem();
                            }
                          }}
                          placeholder="Aim scanner gun or enter QR / Barcode (e.g. SK-KIT-0941, WAAR-550-9842)..."
                          className="w-full pl-10 pr-4 py-2.5 text-xs font-mono font-black bg-white border-2 border-emerald-500 rounded-xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-emerald-700 shadow-xs"
                        />
                      </div>
                      <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-emerald-100 border-2 border-emerald-400 text-emerald-900 font-black text-xs shrink-0">
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 animate-pulse"></span>
                        <span>🔫 Scanner Active (Auto-Detect)</span>
                      </div>
                    </div>

                    {/* Scanned Serials Registry Table */}
                    {scannedSerials.length > 0 && (
                      <div className="space-y-1.5">
                        <div className="text-[11px] font-black uppercase tracking-wider text-slate-800 flex justify-between">
                          <span>Scanned Serial Numbers & QR Tag Registry ({scannedSerials.length})</span>
                          <button
                            type="button"
                            onClick={() => setScannedSerials([])}
                            className="text-rose-700 hover:text-rose-900 font-bold hover:underline text-[11px] cursor-pointer"
                          >
                            Clear Scans
                          </button>
                        </div>
                        <div className="max-h-36 overflow-y-auto border-2 border-slate-300 rounded-xl bg-white divide-y divide-slate-200 text-xs">
                          {scannedSerials.map((sn, sIdx) => (
                            <div key={sIdx} className="p-2.5 flex items-center justify-between hover:bg-slate-50">
                              <div className="flex items-center gap-2">
                                <span className="font-mono font-black text-primary">{sn.serial_code}</span>
                                <span className="text-slate-800 font-bold text-[11px] truncate max-w-xs">{sn.product_name}</span>
                                <span className="text-[11px] text-slate-600 font-mono font-semibold">({sn.sku})</span>
                              </div>
                              <span className="px-2.5 py-1 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-900 border border-emerald-400 flex items-center gap-1">
                                <FaCheckCircle className="text-[9px] text-emerald-700" /> Validated for Inward
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* ── MODE B: OFFLINE PHYSICAL GATE CHALLAN & ITEMS VERIFICATION VIEW (Image 1 Style) ── */}
                <div className="space-y-3 bg-white border-2 border-slate-300 rounded-2xl p-4 shadow-xs">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b-2 border-slate-200 pb-2.5">
                    <div>
                      <h4 className="text-xs font-black uppercase tracking-wider text-slate-900 flex items-center gap-2">
                        <FaBoxes className="text-primary text-base" />
                        <span>Physical Gate Challan Verification & Quantity Counting</span>
                      </h4>
                      <p className="text-[11px] text-slate-700 font-semibold mt-0.5">
                        Verify unloaded cartons against supplier physical gate pass and assign warehouse rack locations.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        const isKitAssembledForThisOrder = selectedOrderForInward?.kit_preparation_status === 'kit_ready';
                        const updated = { ...inwardInputs };
                        modalInwardItems.forEach(it => {
                          const isBos = isBosKitItem(it);
                          const orderMetrics = getOrderKitMetrics(selectedOrderForInward);
                          const orderCap = orderMetrics.capacity || '';
                          const matchedModel = preassembledStock.find(m =>
                            (orderCap && (m.name?.toLowerCase().includes(orderCap.toLowerCase()) || m.capacity?.toLowerCase().includes(orderCap.toLowerCase()))) ||
                            (orderMetrics.modelName && m.name?.toLowerCase().includes(orderMetrics.modelName.toLowerCase()))
                          ) || preassembledStock.find(m => m.name?.toLowerCase().includes('3 kw')) || preassembledStock[0];
                          const stockAvailable = matchedModel?.ready_stock || 0;
                          const fillQty = isBos ? (isKitAssembledForThisOrder ? it.pending_qty : Math.min(it.pending_qty, stockAvailable)) : it.pending_qty;

                          updated[it.sku] = {
                            ...(updated[it.sku] || {}),
                            qty: fillQty,
                            damaged_qty: 0,
                            missing_qty: 0,
                            rack_location: defaultStorageRack || (isBos ? 'BAY-BOS-STAGING' : 'BAY-A1-01')
                          };
                        });
                        setInwardInputs(updated);
                        setQcPassed(true);
                        dispatch(setAlert({ message: '⚡ Accepted full expected quantities for all items.', type: 'info' }));
                      }}
                      className="px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider bg-primary hover:bg-primary-hover text-white transition-all shadow-sm cursor-pointer shrink-0 self-start sm:self-auto active:scale-95 flex items-center gap-1.5"
                    >
                      <FaCheckDouble className="text-xs" />
                      <span>⚡ Accept Full Quantities</span>
                    </button>
                  </div>

                  {/* Order Composition Clarity Banner */}
                  {(() => {
                    const { totalKits, capacity } = getOrderKitMetrics(selectedOrderForInward);
                    const rawItems = (modalInwardItems || []).filter(it => !isBosKitItem(it) && !it.sku?.toLowerCase().includes('inverter') && !(it.category || '').toLowerCase().includes('inverter') && !(it.category || '').toLowerCase().includes('panel') && !it.sku?.toLowerCase().includes('war-bif'));
                    const totalRawParts = rawItems.reduce((acc, it) => acc + (it.ordered_qty || 0), 0);
                    
                    if (totalRawParts > 0) {
                      return (
                        <div className="p-3 bg-gradient-to-r from-purple-50 via-indigo-50 to-blue-50 border-2 border-purple-200 rounded-xl text-xs flex flex-col md:flex-row md:items-center justify-between gap-2 shadow-2xs">
                          <div className="flex items-start gap-2.5">
                            <span className="text-xl">📦</span>
                            <div>
                              <div className="font-black text-purple-950 flex flex-wrap items-center gap-2">
                                <span>Customer Order Requirement: <strong>{totalKits} Complete SolarKits ({capacity})</strong></span>
                                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-purple-700 text-white shadow-2xs">
                                  Exactly {totalKits} Finished BOS Kits Needed
                                </span>
                              </div>
                              <div className="text-[11px] text-purple-900 font-semibold mt-1">
                                Notice the {rawItems.length} loose hardware lines below (cables, clamps, screws, lugs = {totalRawParts.toLocaleString('en-IN')} total parts): These are the <strong>Supplier Raw BOM Materials</strong> unloaded at the dock to be assembled into the {totalKits} Finished BOS Kits at your Workstation (or allocate {totalKits} kits from Buffer Stock).
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    }
                    return null;
                  })()}

                  {/* Items Input Table */}
                  <div className="border-2 border-slate-300 rounded-2xl overflow-hidden bg-white max-h-[460px] overflow-y-auto shadow-xs">
                    <table className="w-full text-left text-xs">
                      <thead className="sticky top-0 bg-slate-200 border-b-2 border-slate-300 z-10 shadow-2xs">
                        <tr className="text-[12px] font-black uppercase tracking-wider text-slate-950">
                          <th className="p-3 text-slate-950 font-black">#</th>
                          <th className="p-3 text-slate-950 font-black">SKU & Item Details</th>
                          <th className="p-3 text-center w-20 text-slate-950 font-black">Ordered</th>
                          <th className="p-3 text-center w-24 text-slate-950 font-black">Inwarded</th>
                          <th className="p-3 text-center min-w-[110px] text-slate-950 font-black">Pending</th>
                          <th className="p-3 text-center w-28 text-slate-950 font-black">Inward (OK)</th>
                          <th className="p-3 text-center w-24 text-slate-950 font-black">Damaged</th>
                          <th className="p-3 text-center w-24 text-slate-950 font-black">Missing</th>
                          <th className="p-3 text-center w-40 text-slate-950 font-black">Rack Location</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y-2 divide-slate-200">
                        {modalInwardItems.map((it, idx) => {
                          const input = inwardInputs[it.sku] || { qty: 0, damaged_qty: 0, missing_qty: 0, rack_location: defaultStorageRack || '' };
                          const isDone = (it.pending_qty || 0) === 0;
                          const itemScans = scannedSerials.filter(s => s.sku === it.sku);
                          const isFullyScanned = itemScans.length >= it.pending_qty && it.pending_qty > 0;
                          const isBos = isBosKitItem(it);

                          if (isBos) {
                            return (
                              <tr
                                key={it.sku}
                                className={`border-l-4 transition-all ${
                                  isDone
                                    ? 'bg-purple-50/70 border-l-emerald-600'
                                    : 'bg-purple-50/90 border-l-purple-700 hover:bg-purple-100/80'
                                }`}
                              >
                                <td className="p-3 text-slate-500 font-bold">{idx + 1}</td>
                                <td className="p-3">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <div className="font-black text-slate-950 text-sm flex items-center gap-1.5">
                                      <FaTools className="text-purple-700 text-sm shrink-0" />
                                      <span>{it.product_name}</span>
                                    </div>
                                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-purple-700 text-white shadow-xs shrink-0">
                                      ⚡ SolarKit BOS Package
                                    </span>
                                  </div>
                                  <div className="text-[11px] font-mono text-purple-950 font-black mt-0.5 flex flex-wrap items-center gap-2">
                                    <span>{it.sku}</span>
                                    <span className="text-slate-800 font-bold">• In-house Pre-assembled Enclosure (ACDB / DCDB / Cables)</span>
                                  </div>

                                  {/* Live Scanned QR & Serial Tags Display */}
                                  {itemScans.length > 0 && (
                                    <div className="mt-1.5 space-y-1">
                                      <div className="flex flex-wrap items-center gap-1">
                                        {itemScans.map((sn, sIdx) => (
                                          <span
                                            key={sIdx}
                                            className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[11px] font-mono font-black bg-emerald-100 text-emerald-900 border border-emerald-400"
                                            title={`Scanned at: ${new Date(sn.scanned_at).toLocaleTimeString()}`}
                                          >
                                            <FaCheckCircle className="text-[10px] text-emerald-700" /> {sn.serial_code}
                                          </span>
                                        ))}
                                      </div>
                                      {isFullyScanned && (
                                        <span className="inline-flex items-center gap-1 px-3 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-700 text-white shadow-xs">
                                          ✓ Inward Done (QR Scanned)
                                        </span>
                                      )}
                                    </div>
                                  )}

                                  {/* Action controls directly on the BOS Kit row */}
                                  <div className="mt-2.5 pt-2 border-t-2 border-purple-200">
                                    {(() => {
                                      const orderMetrics = getOrderKitMetrics(selectedOrderForInward);
                                      const orderCap = orderMetrics.capacity || '';
                                      const matchedModel = preassembledStock.find(m =>
                                        (orderCap && (m.name?.toLowerCase().includes(orderCap.toLowerCase()) || m.capacity?.toLowerCase().includes(orderCap.toLowerCase()))) ||
                                        (orderMetrics.modelName && m.name?.toLowerCase().includes(orderMetrics.modelName.toLowerCase()))
                                      ) || preassembledStock.find(m => m.name?.toLowerCase().includes('3 kw')) || preassembledStock[0];
                                      const stockAvailable = matchedModel?.ready_stock || 0;
                                      const currentQty = parseInt(input.qty) || 0;
                                      const isKitAssembledForThisOrder = (selectedOrderForInward?.kit_preparation_status === 'kit_ready' || selectedOrderForInward?.kit_assembly_details?.assembly_status === 'completed') && selectedOrderForInward?.kit_preparation_status !== 'awaiting_components';
                                      const canAllocate = Math.min(it.pending_qty, stockAvailable);
                                      const remainingToAssemble = Math.max(0, it.pending_qty - currentQty);

                                      return (
                                        <div className="space-y-2">
                                          <div className="w-full flex flex-wrap items-center justify-between gap-2">
                                            <div className="flex items-center gap-2 flex-wrap">
                                              {isDone ? (
                                                <span className="px-3.5 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider bg-emerald-100 text-emerald-900 border border-emerald-400 flex items-center gap-1.5 shadow-xs">
                                                  <FaCheck className="text-xs text-emerald-700" />
                                                  <span>✓ All {it.ordered_qty} Kits Ready & Inwarded</span>
                                                </span>
                                              ) : isKitAssembledForThisOrder ? (
                                                currentQty >= it.pending_qty ? (
                                                  <span className="px-3.5 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider bg-emerald-100 text-emerald-900 border border-emerald-400 flex items-center gap-1.5 shadow-xs">
                                                    <FaCheck className="text-xs text-emerald-700" />
                                                    <span>✓ All {it.pending_qty} Kits Assembled Ready for this Order</span>
                                                  </span>
                                                ) : (
                                                  <button
                                                    type="button"
                                                    onClick={() => {
                                                      setInwardInputs(prev => ({
                                                        ...prev,
                                                        [it.sku]: {
                                                          ...prev[it.sku],
                                                          qty: it.pending_qty,
                                                          rack_location: prev[it.sku]?.rack_location || 'BAY-BOS-STAGING'
                                                        }
                                                      }));
                                                      dispatch(setAlert({
                                                        message: `⚡ Allocated ${it.pending_qty} assembled kit(s) ready for Order #${selectedOrderForInward.order_number}!`,
                                                        type: 'success'
                                                      }));
                                                    }}
                                                    className="px-3.5 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-md shadow-emerald-500/25 flex items-center gap-1.5 cursor-pointer transition-all active:scale-95 animate-pulse"
                                                  >
                                                    <FaCheckCircle className="text-xs" />
                                                    <span>⚡ Allocate {it.pending_qty} Kits Assembled Ready for this Order</span>
                                                  </button>
                                                )
                                              ) : (
                                                <>
                                                  {stockAvailable > 0 && (
                                                    currentQty > 0 ? (
                                                      <span className="px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider bg-emerald-100 text-emerald-900 border border-emerald-400 flex items-center gap-1.5 shadow-xs">
                                                        <FaCheck className="text-xs text-emerald-700" />
                                                        <span>{currentQty} Allocated from Buffer Stock</span>
                                                      </span>
                                                    ) : (
                                                      <button
                                                        type="button"
                                                        onClick={() => {
                                                          setInwardInputs(prev => ({
                                                            ...prev,
                                                            [it.sku]: {
                                                              ...prev[it.sku],
                                                              qty: canAllocate,
                                                              rack_location: prev[it.sku]?.rack_location || 'BAY-BOS-STOCK'
                                                            }
                                                          }));
                                                          dispatch(setAlert({
                                                            message: `Allocated ${canAllocate} kit(s) from warehouse stock to inward input.`,
                                                            type: 'info'
                                                          }));
                                                        }}
                                                        className="px-3.5 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider bg-purple-700 hover:bg-purple-800 text-white shadow-sm flex items-center gap-1.5 cursor-pointer transition-all active:scale-95"
                                                      >
                                                        <FaTools className="text-xs" />
                                                        <span>⚡ Allocate {canAllocate} from Stock ({stockAvailable} Ready in WH)</span>
                                                      </button>
                                                    )
                                                  )}

                                                  {stockAvailable === 0 && (
                                                    <div className="flex items-center gap-1.5 flex-wrap">
                                                      <span className="px-2.5 py-1 rounded-lg text-[11px] font-black uppercase tracking-wider bg-amber-100 text-amber-900 border border-amber-400 flex items-center gap-1 shadow-xs">
                                                        <span>⚠️ 0 Kits in Buffer Stock</span>
                                                      </span>
                                                      <button
                                                        type="button"
                                                        onClick={() => handleOpenProcureModal(selectedOrderForInward, it)}
                                                        className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-white text-purple-900 border border-purple-300 hover:bg-purple-50 shadow-xs flex items-center gap-1 cursor-pointer transition-all"
                                                      >
                                                        <FaPaperPlane className="text-[10px]" />
                                                        <span>⚡ Request from Accounts</span>
                                                      </button>
                                                    </div>
                                                  )}
                                                </>
                                              )}
                                            </div>

                                            {!isKitAssembledForThisOrder && remainingToAssemble > 0 && (
                                              <button
                                                type="button"
                                                onClick={() => {
                                                  handleOpenOrderAssembly(selectedOrderForInward);
                                                  setExpandedCards(prev => ({ ...prev, [selectedOrderForInward._id]: true }));
                                                }}
                                                className="px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider bg-white hover:bg-purple-100 text-purple-900 border-2 border-purple-500 shadow-xs flex items-center gap-1.5 cursor-pointer transition-all active:scale-95 ml-auto"
                                              >
                                                <span>🛠️ Assemble {remainingToAssemble} Kits on Workstation →</span>
                                              </button>
                                            )}
                                          </div>

                                          {/* Mini BOM Recipe Preview */}
                                          <div className="pt-2 border-t border-purple-200">
                                            <div className="text-[11px] font-black uppercase tracking-wider text-purple-950 mb-1 flex items-center justify-between">
                                              <span>Included BOM Materials ({matchedModel?.name || 'Standard 3 kW Kit'})</span>
                                              <span className="text-[10px] text-purple-800 font-bold">Dynamically allocated upon assembly</span>
                                            </div>
                                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                                              {(matchedModel?.bom_components || [
                                                { name: 'ACDB Box', qty: 1, unit: 'Box' },
                                                { name: 'DCDB Box', qty: 1, unit: 'Box' },
                                                { name: 'DC Cable (4 sq mm)', qty: 1, unit: 'Roll' },
                                                { name: 'Earthing Rod', qty: 2, unit: 'Pcs' }
                                              ]).slice(0, 4).map((comp, cIdx) => (
                                                <div key={cIdx} className="p-1.5 rounded-lg bg-white/90 border border-purple-200 text-[10px] flex items-center justify-between shadow-2xs">
                                                  <span className="font-semibold text-slate-800 truncate" title={comp.name}>{comp.name}</span>
                                                  <span className="font-mono font-bold text-purple-700 shrink-0 ml-1">
                                                    {comp.qty * (it.ordered_qty || 1)} {comp.unit || 'Pcs'}
                                                  </span>
                                                </div>
                                              ))}
                                            </div>
                                          </div>
                                        </div>
                                      );
                                    })()}
                                  </div>
                                </td>
                                <td className="p-3 text-center font-black text-slate-950 text-base">
                                  {it.ordered_qty}
                                </td>
                                <td className="p-3 text-center font-black text-emerald-800 text-base">
                                  {it.received_qty}
                                </td>
                                <td className="p-3 text-center whitespace-nowrap">
                                  <span className={`inline-flex items-center justify-center min-w-[75px] px-3 py-1 rounded-full text-xs font-black whitespace-nowrap shadow-2xs ${
                                    isDone
                                      ? 'bg-emerald-100 text-emerald-950 border-2 border-emerald-500'
                                      : 'bg-amber-100 text-amber-950 border-2 border-amber-500'
                                  }`}>
                                    {it.pending_qty} Pcs
                                  </span>
                                </td>
                                <td className="p-3 text-center">
                                  {isDone ? (
                                    <span className="text-xs font-black text-emerald-800 inline-flex items-center gap-1.5 bg-emerald-100 px-3 py-1.5 rounded-xl border-2 border-emerald-400">
                                      <FaCheck className="text-xs text-emerald-700" /> Inwarded
                                    </span>
                                  ) : (
                                    <input
                                      type="number"
                                      min="0"
                                      max={it.pending_qty}
                                      value={input.qty}
                                      onChange={(e) => {
                                        const val = e.target.value;
                                        setInwardInputs(prev => ({
                                          ...prev,
                                          [it.sku]: {
                                            ...prev[it.sku],
                                            qty: val === '' ? '' : parseInt(val) || 0
                                          }
                                        }));
                                      }}
                                      className={`w-22 text-center py-2 px-2 rounded-xl text-xs font-black border-2 transition-all ${
                                        parseInt(input.qty) > it.pending_qty
                                          ? 'border-danger bg-danger/10 text-danger'
                                          : 'border-purple-500 bg-white text-slate-950 focus:border-purple-700 focus:ring-2 focus:ring-purple-200 shadow-xs'
                                      }`}
                                    />
                                  )}
                                </td>
                                <td className="p-3 text-center">
                                  <input
                                    type="number"
                                    min="0"
                                    max={it.pending_qty}
                                    disabled={isDone}
                                    value={input.damaged_qty || ''}
                                    placeholder="0"
                                    onChange={(e) => {
                                      const val = e.target.value;
                                      const numVal = parseInt(val) || 0;
                                      setInwardInputs(prev => ({
                                        ...prev,
                                        [it.sku]: {
                                          ...prev[it.sku],
                                          damaged_qty: val === '' ? '' : numVal
                                        }
                                      }));
                                      if (numVal > 0) setQcPassed(false);
                                    }}
                                    className="w-20 text-center py-2 px-2 rounded-xl text-xs font-black border-2 border-rose-400 bg-rose-50 text-rose-950 focus:border-rose-600 shadow-xs disabled:opacity-40"
                                  />
                                </td>
                                <td className="p-3 text-center">
                                  <input
                                    type="number"
                                    min="0"
                                    max={it.pending_qty}
                                    disabled={isDone}
                                    value={input.missing_qty || ''}
                                    placeholder="0"
                                    onChange={(e) => {
                                      const val = e.target.value;
                                      const numVal = parseInt(val) || 0;
                                      setInwardInputs(prev => ({
                                        ...prev,
                                        [it.sku]: {
                                          ...prev[it.sku],
                                          missing_qty: val === '' ? '' : numVal
                                        }
                                      }));
                                      if (numVal > 0) setQcPassed(false);
                                    }}
                                    className="w-20 text-center py-2 px-2 rounded-xl text-xs font-black border-2 border-amber-400 bg-amber-50 text-amber-950 focus:border-amber-600 shadow-xs disabled:opacity-40"
                                  />
                                </td>
                                <td className="p-3 text-center">
                                  <input
                                    type="text"
                                    placeholder={defaultStorageRack || 'BAY-BOS-STOCK'}
                                    value={input.rack_location || ''}
                                    onChange={(e) => {
                                      const val = e.target.value;
                                      setInwardInputs(prev => ({
                                        ...prev,
                                        [it.sku]: {
                                          ...prev[it.sku],
                                          rack_location: val
                                        }
                                      }));
                                    }}
                                    className="w-36 py-2 px-2 text-center rounded-xl text-xs font-black border-2 border-purple-500 bg-white text-slate-950 focus:border-purple-700 placeholder:text-slate-400 shadow-xs"
                                  />
                                </td>
                              </tr>
                            );
                          }

                          return (
                            <tr key={it.sku} className={isDone ? 'bg-slate-50' : 'bg-white hover:bg-slate-50/80 transition-colors'}>
                              <td className="p-3 text-slate-500 font-bold">{idx + 1}</td>
                              <td className="p-3">
                                <div className="font-mono font-black text-primary text-xs">{it.sku}</div>
                                <div className="font-black text-slate-950 text-xs mt-0.5">{it.product_name}</div>
                                {(() => {
                                  const { totalKits } = getOrderKitMetrics(selectedOrderForInward);
                                  const isRawBomPart = !isBos && (
                                    (it.category || '').toLowerCase().includes('bos') ||
                                    (it.sku || '').toLowerCase().includes('cab-') ||
                                    (it.sku || '').toLowerCase().includes('cla-') ||
                                    (it.sku || '').toLowerCase().includes('pvc-') ||
                                    (it.sku || '').toLowerCase().includes('uvr-') ||
                                    (it.sku || '').toLowerCase().includes('scr-') ||
                                    (it.sku || '').toLowerCase().includes('ear-') ||
                                    (it.sku || '').toLowerCase().includes('lig-') ||
                                    (it.sku || '').toLowerCase().includes('mc4-') ||
                                    (it.sku || '').toLowerCase().includes('dcd-') ||
                                    (it.sku || '').toLowerCase().includes('ac-')
                                  );

                                  return (
                                    <div className="flex flex-wrap items-center gap-1.5 mt-1">
                                      <span className="text-[10px] text-slate-600 font-bold">{it.category || 'Component'}</span>
                                      {isRawBomPart && (
                                        <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase px-2 py-0.5 rounded bg-purple-100 text-purple-900 border border-purple-300 shadow-2xs">
                                          <span>🔩 BOM Raw Material for {totalKits} Kits</span>
                                          {totalKits > 0 && it.ordered_qty > 0 && (
                                            <span className="text-purple-700 font-bold">
                                              ({(it.ordered_qty / totalKits).toFixed(1).replace('.0', '')} per kit)
                                            </span>
                                          )}
                                        </span>
                                      )}
                                    </div>
                                  );
                                })()}

                                {/* Live Scanned QR & Serial Tags Display */}
                                {itemScans.length > 0 && (
                                  <div className="mt-1.5 space-y-1">
                                    <div className="flex flex-wrap items-center gap-1">
                                      {itemScans.map((sn, sIdx) => (
                                        <span
                                          key={sIdx}
                                          className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[11px] font-mono font-black bg-emerald-100 text-emerald-900 border border-emerald-400"
                                          title={`Scanned at: ${new Date(sn.scanned_at).toLocaleTimeString()}`}
                                        >
                                          <FaCheckCircle className="text-[10px] text-emerald-700" /> {sn.serial_code}
                                        </span>
                                      ))}
                                    </div>
                                    {isFullyScanned && (
                                      <span className="inline-flex items-center gap-1 px-3 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-700 text-white shadow-xs">
                                        ✓ Inward Done (QR Scanned)
                                      </span>
                                    )}
                                  </div>
                                )}
                              </td>
                              <td className="p-3 text-center font-black text-slate-950 text-base">
                                {it.ordered_qty}
                              </td>
                              <td className="p-3 text-center font-black text-emerald-800 text-base">
                                {it.received_qty}
                              </td>
                              <td className="p-3 text-center whitespace-nowrap">
                                <span className={`inline-flex items-center justify-center min-w-[75px] px-3 py-1 rounded-full text-xs font-black whitespace-nowrap shadow-2xs ${
                                  isDone
                                    ? 'bg-emerald-100 text-emerald-950 border-2 border-emerald-500'
                                    : 'bg-amber-100 text-amber-950 border-2 border-amber-500'
                                }`}>
                                  {it.pending_qty} Pcs
                                </span>
                              </td>
                              <td className="p-3 text-center">
                                {isDone ? (
                                  <span className="text-xs font-black text-emerald-800 inline-flex items-center gap-1.5 bg-emerald-100 px-3 py-1.5 rounded-xl border-2 border-emerald-400">
                                    <FaCheck className="text-xs text-emerald-700" /> Inwarded
                                  </span>
                                ) : (
                                  <input
                                    type="number"
                                    min="0"
                                    max={it.pending_qty}
                                    value={input.qty}
                                    onChange={(e) => {
                                      const val = e.target.value;
                                      setInwardInputs(prev => ({
                                        ...prev,
                                        [it.sku]: {
                                          ...prev[it.sku],
                                          qty: val === '' ? '' : parseInt(val) || 0
                                        }
                                      }));
                                    }}
                                    className={`w-22 text-center py-2 px-2 rounded-xl text-xs font-black border-2 transition-all ${
                                      parseInt(input.qty) > it.pending_qty
                                        ? 'border-danger bg-danger/10 text-danger'
                                        : 'border-slate-400 bg-white text-slate-950 focus:border-primary focus:ring-2 focus:ring-primary/20 shadow-xs'
                                    }`}
                                  />
                                )}
                              </td>
                              <td className="p-3 text-center">
                                <input
                                  type="number"
                                  min="0"
                                  max={it.pending_qty}
                                  disabled={isDone}
                                  value={input.damaged_qty || ''}
                                  placeholder="0"
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    const numVal = parseInt(val) || 0;
                                    setInwardInputs(prev => ({
                                      ...prev,
                                      [it.sku]: {
                                        ...prev[it.sku],
                                        damaged_qty: val === '' ? '' : numVal
                                      }
                                    }));
                                    if (numVal > 0) setQcPassed(false);
                                  }}
                                  className="w-20 text-center py-2 px-2 rounded-xl text-xs font-black border-2 border-rose-400 bg-rose-50 text-rose-950 focus:border-rose-600 shadow-xs disabled:opacity-40"
                                />
                              </td>
                              <td className="p-3 text-center">
                                <input
                                  type="number"
                                  min="0"
                                  max={it.pending_qty}
                                  disabled={isDone}
                                  value={input.missing_qty || ''}
                                  placeholder="0"
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    const numVal = parseInt(val) || 0;
                                    setInwardInputs(prev => ({
                                      ...prev,
                                      [it.sku]: {
                                        ...prev[it.sku],
                                        missing_qty: val === '' ? '' : numVal
                                      }
                                    }));
                                    if (numVal > 0) setQcPassed(false);
                                  }}
                                  className="w-20 text-center py-2 px-2 rounded-xl text-xs font-black border-2 border-amber-400 bg-amber-50 text-amber-950 focus:border-amber-600 shadow-xs disabled:opacity-40"
                                />
                              </td>
                              <td className="p-3 text-center">
                                <input
                                  type="text"
                                  placeholder={defaultStorageRack || 'BAY-A1-01'}
                                  value={input.rack_location || ''}
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    setInwardInputs(prev => ({
                                      ...prev,
                                      [it.sku]: {
                                        ...prev[it.sku],
                                        rack_location: val
                                      }
                                    }));
                                  }}
                                  className="w-36 text-center py-2 px-2 rounded-xl text-xs font-black border-2 border-slate-400 bg-white text-slate-950 focus:border-primary placeholder:text-slate-400 shadow-xs"
                                />
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* ── Quality Control (QC) & Physical Condition Inspection (Image 1 Style) ── */}
                <div className="bg-slate-100 border-2 border-slate-300 rounded-2xl p-4 space-y-3 shadow-xs">
                  <label className="text-xs font-black text-slate-900 uppercase tracking-wider block">
                    Quality Control (QC) & Physical Condition Inspection *
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        setQcPassed(true);
                        setDamageNotes('');
                      }}
                      className={`p-3.5 rounded-xl border-2 font-black text-xs flex items-center justify-center gap-2 cursor-pointer transition-all ${
                        qcPassed
                          ? 'bg-emerald-600 text-white border-emerald-700 shadow-sm ring-2 ring-emerald-500/30'
                          : 'bg-white text-slate-700 border-slate-300 hover:border-emerald-500'
                      }`}
                    >
                      <FaCheckCircle className="text-base" />
                      <span>✓ QC Passed (Zero Damage / Packaging Intact)</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setQcPassed(false)}
                      className={`p-3.5 rounded-xl border-2 font-black text-xs flex items-center justify-center gap-2 cursor-pointer transition-all ${
                        !qcPassed
                          ? 'bg-rose-600 text-white border-rose-700 shadow-sm ring-2 ring-rose-500/30'
                          : 'bg-white text-slate-700 border-slate-300 hover:border-rose-500'
                      }`}
                    >
                      <FaExclamationTriangle className="text-base" />
                      <span>⚠ Discrepancy / Damaged Goods Found (Debit Note Generated)</span>
                    </button>
                  </div>

                  {!qcPassed && (
                    <div className="space-y-1.5 pt-1">
                      <label className="text-[11px] font-black uppercase text-rose-950 block">
                        Damage / Shortage Notes * (Mandatory for generating Accounts Debit Note)
                      </label>
                      <input
                        type="text"
                        required={!qcPassed}
                        value={damageNotes}
                        onChange={(e) => setDamageNotes(e.target.value)}
                        placeholder="e.g. 2 solar panels broken in transit; packaging crushed on pallet 3."
                        className="w-full p-2.5 text-xs font-bold bg-rose-50 border-2 border-rose-400 rounded-xl text-rose-950 placeholder:text-rose-400 focus:border-rose-600 focus:outline-none shadow-2xs"
                      />
                    </div>
                  )}

                  {/* Discrepancy Alert Banner */}
                  {(!qcPassed || Object.values(inwardInputs).some(inp => (parseInt(inp?.damaged_qty) || 0) > 0 || (parseInt(inp?.missing_qty) || 0) > 0)) && (
                    <div className="p-3.5 rounded-xl bg-rose-100 border-2 border-rose-400 text-rose-950 text-xs font-bold flex items-center gap-2.5 shadow-xs">
                      <FaExclamationTriangle className="text-base text-rose-600 shrink-0" />
                      <span>
                        <strong className="font-black text-rose-950">Discrepancy Detected:</strong> Damaged items will be physically isolated in warehouse quarantine. Accounts will be automatically notified to initiate supplier debit notes / insurance claims.
                      </span>
                    </div>
                  )}
                </div>

                {/* Inward Verification Remarks */}
                <div>
                  <label className="text-xs font-black text-slate-900 block mb-1.5">
                    Inward Verification Remarks & Notes
                  </label>
                  <textarea
                    rows={2}
                    value={inwardRemarks}
                    onChange={(e) => setInwardRemarks(e.target.value)}
                    placeholder="Enter dock inspection remarks, package seal condition, or supplier challan ref..."
                    className="w-full p-3 text-xs bg-white border-2 border-slate-400 rounded-xl text-slate-950 placeholder:text-slate-500 font-bold focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 shadow-xs"
                  />
                </div>

                {/* Modal Action Buttons */}
                <div className="flex justify-end items-center gap-3 pt-3.5 border-t-2 border-slate-200">
                  <button
                    type="button"
                    onClick={() => setInwardModalOpen(false)}
                    className="px-6 py-2.5 rounded-xl text-xs font-black bg-slate-200 hover:bg-slate-300 border-2 border-slate-400 text-slate-900 cursor-pointer transition-all shadow-xs"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submittingInward}
                    className="bg-primary hover:bg-primary-hover text-white px-7 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-2 shadow-md hover:shadow-lg active:scale-95 disabled:opacity-50 cursor-pointer transition-all"
                  >
                    {submittingInward ? (
                      <>
                        <FaSpinner className="animate-spin text-sm" />
                        <span>Verifying & Recording Inward...</span>
                      </>
                    ) : (
                      <>
                        <FaCheck className="text-sm" />
                        <span>Complete Inward & Update Warehouse Inventory</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            ) : (
              /* Inward History Tab */
              <div className="space-y-3">
                {(selectedOrderForInward.inward_history || []).length === 0 ? (
                  <div className="p-8 text-center text-slate-700 font-bold text-xs bg-slate-100 rounded-xl border-2 border-slate-300">
                    No past inward history recorded for this delivery order yet.
                  </div>
                ) : (
                  <div className="space-y-3 max-h-[380px] overflow-y-auto">
                    {(selectedOrderForInward?.inward_history || []).map((batch, idx) => (
                      <div key={idx} className="p-4 bg-white border-2 border-slate-300 rounded-2xl space-y-2.5 shadow-xs">
                        <div className="flex justify-between items-center text-xs">
                          <span className="font-mono font-black text-primary text-sm">{batch.batch_id}</span>
                          <span className="text-xs font-bold text-slate-600">{new Date(batch.timestamp).toLocaleString()}</span>
                        </div>
                        <div className="text-xs text-slate-800 font-medium">
                          Verified by: <strong className="text-slate-950 font-black">{batch.inwarded_by_name}</strong>
                        </div>
                        {batch.remarks && (
                          <div className="text-xs text-slate-900 font-semibold italic bg-slate-100 p-2.5 rounded-xl border border-slate-300">
                            "{batch.remarks}"
                          </div>
                        )}
                        <div className="text-[11px] font-black uppercase tracking-wider text-slate-900 pt-1">
                          Inwarded Items:
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          {(batch.inwarded_items || []).map((bIt, bIdx) => (
                            <div key={bIdx} className="p-2.5 rounded-xl bg-slate-100 border border-slate-300 flex justify-between items-center">
                              <span className="font-bold text-slate-950 truncate">{bIt.product_name}</span>
                              <span className="font-black text-emerald-800 ml-2 bg-emerald-100 px-2 py-0.5 rounded-md border border-emerald-400">+{bIt.qty} Pcs</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })()}
      </Dialog>

      {/* ── Select BOS Kit Stock / Reserve Inventory Modal ── */}
      <Dialog
        isOpen={reserveModalOpen}
        onClose={() => setReserveModalOpen(false)}
        title="Select & Reserve Warehouse BOS Stock"
        size="md"
      >
        {selectedItemForReserve && (
          <div className="space-y-4 p-1">
            <div className="p-4 bg-slate-100 rounded-2xl border-2 border-slate-300 text-xs space-y-2">
              <div className="font-black text-slate-950 text-sm">{selectedItemForReserve.product_name}</div>
              <div className="text-primary font-mono font-bold">{selectedItemForReserve.sku}</div>
              <div className="flex justify-between text-slate-700 font-semibold pt-2 border-t-2 border-slate-200">
                <span>Ordered: <strong className="text-slate-950">{selectedItemForReserve.ordered_qty}</strong></span>
                <span>Pending Inward: <strong className="text-amber-950">{selectedItemForReserve.pending_qty}</strong></span>
                <span className="text-emerald-800">Available Stock: <strong>{selectedItemForReserve.available_inventory_stock}</strong></span>
              </div>
            </div>

            <div>
              <label className="text-xs font-black text-slate-900 block mb-1.5">
                Allocate Stock Quantity to DO #{selectedOrderForReserve?.delivery_order_id}
              </label>
              <input
                type="number"
                min="0"
                max={selectedItemForReserve.available_inventory_stock}
                value={reserveQtyInput}
                onChange={(e) => setReserveQtyInput(e.target.value)}
                className="w-full p-3 text-sm font-black bg-white border-2 border-slate-400 rounded-xl text-slate-950 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 shadow-xs"
              />
              <span className="text-[11px] text-slate-600 font-semibold mt-1.5 block">
                Locking this quantity prevents double allocation by other orders.
              </span>
            </div>

            <div className="flex justify-end gap-2.5 pt-3.5 border-t-2 border-slate-200">
              <button
                type="button"
                onClick={() => setReserveModalOpen(false)}
                className="px-5 py-2.5 rounded-xl text-xs font-black bg-slate-200 hover:bg-slate-300 border-2 border-slate-400 text-slate-900 cursor-pointer transition-all"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={submittingReserve}
                onClick={handleSaveReservation}
                className="bg-primary hover:bg-primary-hover text-white px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider cursor-pointer shadow-md transition-all active:scale-95 disabled:opacity-50"
              >
                {submittingReserve ? 'Reserving...' : 'Confirm Stock Reservation'}
              </button>
            </div>
          </div>
        )}
      </Dialog>

      {/* ── Procurement & Material Booking Requisition to Account Manager Modal ── */}
      <Dialog
        isOpen={procureModalOpen}
        onClose={() => setProcureModalOpen(false)}
        title={selectedOrderForProcure ? "Send BOS Material Booking Requisition to Account Manager" : "Order Raw Materials from Account Manager (Warehouse Buffer Stock)"}
        size="lg"
      >
        {(selectedOrderForProcure || selectedProcureModelId) && (() => {
          const ord = selectedOrderForProcure;
          const currentModel = preassembledStock.find(m => m.id === selectedProcureModelId) || preassembledStock[0];
          const numKits = parseInt(procureQtyInput) || 1;

          return (
            <form onSubmit={handleSaveProcureRequest} className="space-y-4 p-1">
              {/* Order & Recipient Banner */}
              <div className="p-3.5 bg-surface-hover border border-border rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                {ord ? (
                  <div>
                    <div className="font-extrabold text-text-primary text-sm flex items-center gap-2">
                      <span className="text-primary font-mono">{ord.delivery_order_id}</span>
                      <span>• Order #{ord.order_number}</span>
                      <span className="text-text-muted">• {ord.customer_name}</span>
                    </div>
                    <div className="text-text-secondary mt-0.5">
                      Order System Capacity: <strong className="text-primary">{ord.system_capacity || '1 kW'}</strong>
                    </div>
                  </div>
                ) : (
                  <div>
                    <div className="font-extrabold text-text-primary text-sm flex items-center gap-2">
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-purple-500/20 text-purple-300 border border-purple-500/30">
                        Warehouse Buffer Build
                      </span>
                      <span>• {currentModel.name}</span>
                    </div>
                    <div className="text-text-secondary mt-0.5">
                      Requisitioning raw materials from Account Manager for warehouse ready buffer inventory.
                    </div>
                  </div>
                )}
                <div className="text-right">
                  <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-500/15 text-amber-400 border border-amber-500/30">
                    Recipient: Account Manager
                  </span>
                </div>
              </div>

              {/* Model Selector for kW Capacity */}
              <div>
                <label className="text-xs font-black text-text-primary uppercase tracking-wider block mb-2">
                  1. Select kW BOS Kit Model for Component Recipe:
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  {preassembledStock.map((m) => {
                    const isSelected = selectedProcureModelId === m.id;
                    return (
                      <div
                        key={m.id}
                        onClick={() => setSelectedProcureModelId(m.id)}
                        className={`p-3 rounded-xl border transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-amber-500/15 border-amber-500 text-amber-300 ring-1 ring-amber-500/50 shadow-sm'
                            : 'bg-surface hover:bg-surface-hover border-border text-text-secondary'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold uppercase">{m.category}</span>
                          <span className="text-[11px] font-mono font-bold text-amber-400">
                            {m.capacity}
                          </span>
                        </div>
                        <div className="text-xs font-bold text-text-primary mt-1 line-clamp-1">{m.name}</div>
                        <div className="text-[10px] text-text-muted mt-1">
                          {m.bom_components?.length || 0} BOM Materials
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Number of Kits to Procure For */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-text-primary uppercase tracking-wider block mb-1.5">
                    Number of BOS Kits to Assemble (Procure Qty):
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="50"
                    value={procureQtyInput}
                    onChange={(e) => setProcureQtyInput(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-full p-2.5 text-xs font-bold font-mono bg-surface border border-border rounded-xl text-text-primary focus:border-primary"
                    required
                  />
                </div>
                <div className="flex items-end">
                  <div className="p-2.5 rounded-xl bg-surface-hover/70 border border-border text-[11px] text-text-secondary w-full">
                    Total components to requisition: <strong className="text-primary font-bold">{(currentModel?.bom_components?.length || 0) * numKits} units</strong> across {currentModel?.bom_components?.length || 0} SKUs.
                  </div>
                </div>
              </div>

              {/* BOM Materials Requisition Table */}
              <div>
                <div className="text-xs font-bold text-text-primary uppercase tracking-wider mb-1.5 flex items-center justify-between">
                  <span>2. BOS Kit BOM Recipe Components ({currentModel?.bom_components?.length || 0} Items):</span>
                  <span className="text-[10px] text-text-muted">Direct from {currentModel?.name}</span>
                </div>
                <div className="border border-border rounded-xl overflow-hidden bg-surface max-h-48 overflow-y-auto scrollbar-thin">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-surface-hover border-b border-border text-[10px] font-black uppercase text-text-muted sticky top-0">
                      <tr>
                        <th className="p-2.5">Component / SKU</th>
                        <th className="p-2.5 text-center">BOM Qty / Kit</th>
                        <th className="p-2.5 text-center">Requisition Total</th>
                        <th className="p-2.5 text-right">Unit</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/60">
                      {(currentModel?.bom_components || []).map((c, i) => (
                        <tr key={i} className="hover:bg-surface-hover/30">
                          <td className="p-2.5">
                            <div className="font-bold text-text-primary">{c.name}</div>
                            <div className="text-[10px] font-mono text-purple-400">{c.sku}</div>
                          </td>
                          <td className="p-2.5 text-center font-mono font-semibold">{c.qty}</td>
                          <td className="p-2.5 text-center font-mono font-bold text-primary">
                            {c.qty * numKits}
                          </td>
                          <td className="p-2.5 text-right text-text-secondary text-[11px]">{c.unit}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Notes for Account Manager */}
              <div>
                <label className="text-xs font-bold text-text-primary uppercase tracking-wider block mb-1.5">
                  3. Notes for Account Manager & Supplier Purchase Order:
                </label>
                <textarea
                  rows={2}
                  value={procureNotes}
                  onChange={(e) => setProcureNotes(e.target.value)}
                  placeholder="Mention delivery urgency, preferred vendor, or site dispatch deadline..."
                  className="w-full p-2.5 text-xs bg-surface border border-border rounded-xl text-text-primary placeholder:text-text-muted focus:border-primary"
                />
              </div>

              {/* Modal Actions */}
              <div className="flex justify-end gap-2.5 pt-3 border-t border-border">
                <button
                  type="button"
                  onClick={() => setProcureModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-surface-hover border border-border text-text-secondary cursor-pointer hover:bg-surface"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingProcure}
                  className="px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider bg-gradient-to-r from-amber-600 via-orange-600 to-amber-600 hover:from-amber-500 hover:to-orange-500 text-white shadow-md shadow-amber-500/20 flex items-center gap-2 cursor-pointer transition-all active:scale-95 disabled:opacity-50"
                >
                  {submittingProcure ? <FaSpinner className="animate-spin text-xs" /> : <FaPaperPlane className="text-xs" />}
                  <span>{submittingProcure ? 'Forwarding Requisition...' : '⚡ Send Booking Request to Account Manager'}</span>
                </button>
              </div>
            </form>
          );
        })()}
      </Dialog>

      {/* ── Boss Specification: BOSKIT Preparation & Assembly Station Modal ── */}
      <Dialog
        isOpen={assemblyModalOpen}
        onClose={() => setAssemblyModalOpen(false)}
        title={`BOSKIT Assembly & Preparation Station: Order #${selectedOrderForAssembly?.order_number || ''}`}
        size="xl"
      >
        {selectedOrderForAssembly && (() => {
          const ord = selectedOrderForAssembly;
          const kitStatus = ord.kit_preparation_status || 'not_required';
          const { totalKits, capacity, modelName } = getOrderKitMetrics(ord);
          const existingBos = (ord.items || []).find(it => isBosKitItem(it));
          const orderedKits = existingBos ? (existingBos.ordered_qty || totalKits) : totalKits;
          const receivedKits = existingBos ? (existingBos.received_qty || 0) : (kitStatus === 'kit_ready' ? totalKits : 0);
          const pendingKits = Math.max(0, orderedKits - receivedKits);

          const nonBosPending = (ord.items || [])
            .filter(it => !isBosKitItem(it))
            .reduce((acc, it) => acc + (it.pending_qty || 0), 0);

          const unallocatedShortage = (ord.items || []).reduce((acc, it) => {
            const pending = it.pending_qty || 0;
            const allocated = it.allocated_stock || 0;
            return acc + Math.max(0, pending - allocated);
          }, 0);
          const hasShortage = unallocatedShortage > 0 || nonBosPending > 0;
          const assemblyDetails = ord.kit_assembly_details || {};

          return (
            <div className="space-y-5 p-1">
              {/* Order Context Strip */}
              <div className="p-3.5 bg-surface-hover rounded-xl border border-border flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                <div>
                  <div className="font-extrabold text-text-primary text-sm flex items-center gap-2">
                    <span className="text-primary font-mono">{ord.delivery_order_id}</span>
                    <span>• {ord.customer_name}</span>
                  </div>
                  <div className="text-text-muted mt-0.5">
                    Kit Status: <strong className="text-text-primary uppercase">{kitStatus.replace(/_/g, ' ')}</strong>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border ${
                    kitStatus === 'kit_ready'
                      ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                      : kitStatus === 'in_assembly'
                      ? 'bg-purple-500/15 text-purple-400 border-purple-500/30 animate-pulse'
                      : 'bg-amber-500/15 text-amber-400 border-amber-500/30'
                  }`}>
                    {kitStatus.replace(/_/g, ' ')}
                  </span>
                </div>
              </div>

              {/* Shortage Alert Banner if items pending */}
              {(hasShortage || nonBosPending > 0) && (
                <div className="p-3.5 rounded-xl bg-amber-500/15 border-2 border-amber-500/40 text-amber-300 text-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
                  <div className="flex items-start gap-2.5">
                    <FaExclamationTriangle className="text-base text-amber-400 shrink-0 mt-0.5" />
                    <div>
                      <div className="font-black text-amber-200 uppercase tracking-wide">
                        ⚠️ Pehle Raw Material Inward Karein New Orders Tab Me!
                      </div>
                      <div className="text-amber-300/90 mt-0.5">
                        Is order ke {nonBosPending || unallocatedShortage} units raw materials / components abhi physical inward hona baaki hain. Pehle New Orders me "Inward Material" button se unhe inward karein, uske baad kit assembly complete karein.
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setAssemblyModalOpen(false);
                      if (standaloneBoskit || location.pathname.includes('bos-kit-assembly')) {
                        navigate(`${prefix}/new-orders`);
                      } else {
                        setMainSectionTab('orders');
                      }
                      handleOpenInwardModal(ord);
                    }}
                    className="px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-black text-xs cursor-pointer shadow-sm transition-all whitespace-nowrap active:scale-95 shrink-0"
                  >
                    📦 Inward Material Now →
                  </button>
                </div>
              )}

              {/* 5-Stage Visual Workflow */}
              {(() => {
                const isPickedDone = ['ready_for_assembly', 'in_assembly', 'kit_ready'].includes(kitStatus) || !hasShortage;
                const isAssembledDone = ['in_assembly', 'kit_ready'].includes(kitStatus) && (assemblyDetails.assembly_status === 'completed' || !!assemblyDetails.assembled_at || assemblyDetails.qc_verified || kitStatus === 'kit_ready');
                const isQcDone = assemblyDetails.qc_verified === true || assemblyDetails.qc_status === 'passed' || kitStatus === 'kit_ready';
                const isPackedDone = assemblyDetails.packed_and_labeled === true || !!assemblyDetails.kit_serial_barcode || kitStatus === 'kit_ready';
                const isReadyDone = kitStatus === 'kit_ready';

                const isStep1Active = !isPickedDone;
                const isStep2Active = isPickedDone && !isAssembledDone;
                const isStep3Active = isAssembledDone && !isQcDone;
                const isStep4Active = isQcDone && !isPackedDone;
                const isStep5Active = isPackedDone && !isReadyDone;

                const steps = [
                  { step: '1. Picking', label: 'Pick Components', isDone: isPickedDone, isCurrent: isStep1Active },
                  { step: '2. Assembly', label: 'Assembly Station', isDone: isAssembledDone, isCurrent: isStep2Active },
                  { step: '3. QC Check', label: 'Quality Inspection', isDone: isQcDone, isCurrent: isStep3Active },
                  { step: '4. Packaging', label: 'Pack & Label Barcode', isDone: isPackedDone, isCurrent: isStep4Active },
                  { step: '5. Kit Ready', label: 'Ready for Order', isDone: isReadyDone, isCurrent: isReadyDone || isStep5Active }
                ];

                return (
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-2 text-center text-xs">
                    {steps.map((st, idx) => (
                      <div
                        key={idx}
                        className={`p-3 rounded-xl border transition-all ${
                          st.isDone
                            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 font-bold'
                            : st.isCurrent
                            ? 'bg-purple-500/10 border-purple-500/40 text-purple-400 font-black ring-1 ring-purple-500/30'
                            : 'bg-surface-hover/50 border-border text-text-muted'
                        }`}
                      >
                        <div className="text-[10px] font-black uppercase tracking-wider">{st.step}</div>
                        <div className="text-xs mt-1 font-semibold">{st.label}</div>
                        <div className="text-[10px] mt-1">
                          {st.isDone ? '✓ Completed' : st.isCurrent ? '● Active' : '○ Pending'}
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })()}

              {/* BOM Checklist for this Kit */}
              <div>
                <div className="text-xs font-black text-text-primary uppercase tracking-wider mb-2 flex items-center justify-between">
                  <span>Kit Components Verification ({(ord.items || []).length} SKUs)</span>
                  <span className="text-[11px] text-text-muted font-normal">
                    {hasShortage ? `${unallocatedShortage} items awaiting inward` : 'All items verified'}
                  </span>
                </div>
                <div className="border border-border rounded-xl overflow-hidden bg-surface max-h-[220px] overflow-y-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="sticky top-0 bg-surface-hover border-b border-border text-[10px] font-black uppercase text-text-muted">
                      <tr>
                        <th className="p-2.5">Component</th>
                        <th className="p-2.5">Fulfilment Method</th>
                        <th className="p-2.5 text-center">WH Stock</th>
                        <th className="p-2.5 text-center">Required</th>
                        <th className="p-2.5 text-center">Inwarded</th>
                        <th className="p-2.5 text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {(ord.items || []).map((it) => (
                        <tr key={it.sku} className="hover:bg-surface-hover/30">
                          <td className="p-2.5">
                            <div className="font-bold text-text-primary">{it.product_name}</div>
                            <div className="text-[10px] font-mono text-primary">{it.sku}</div>
                          </td>
                          <td className="p-2.5 text-[11px]">
                            {it.supply_fulfilment_method === 'company_pickup' ? (
                              <span className="text-cyan-400 font-semibold">Company Pickup</span>
                            ) : it.supply_fulfilment_method === 'supplier_delivery' ? (
                              <span className="text-amber-400 font-semibold">Supplier Delivery</span>
                            ) : (
                              <span className="text-purple-400 font-semibold">Warehouse Stock</span>
                            )}
                          </td>
                          <td className="p-2.5 text-center font-mono">
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-surface border border-border text-text-primary">
                              {it.available_inventory_stock ?? 0} Pcs
                            </span>
                          </td>
                          <td className="p-2.5 text-center font-bold">{it.ordered_qty}</td>
                          <td className="p-2.5 text-center font-bold text-success">{it.received_qty}</td>
                          <td className="p-2.5 text-center">
                            {it.pending_qty === 0 ? (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-success/15 text-success">
                                Ready
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-400">
                                {it.pending_qty} Pending
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Kit Barcode Label Generation */}
              <div className="p-3.5 bg-surface-hover/60 border border-border rounded-xl space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-black text-text-primary uppercase tracking-wider flex items-center gap-1.5">
                    <FaBarcode className="text-primary text-sm" /> SolarKits Barcode & Serial Label
                  </label>
                  <span className="text-[10px] text-text-muted">Unique tracking barcode for assembled BOSKIT</span>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={kitBarcodeLabel}
                    onChange={(e) => setKitBarcodeLabel(e.target.value)}
                    placeholder="e.g. SK-KIT-1002-9988"
                    className="flex-1 p-2 text-xs font-mono font-bold bg-surface border border-border rounded-lg text-text-primary focus:border-primary"
                  />
                  <button
                    type="button"
                    onClick={() => setKitBarcodeLabel(`SK-KIT-${ord.order_number}-${Date.now().toString().slice(-4)}`)}
                    className="px-3 py-2 rounded-lg bg-surface border border-border text-xs font-bold text-text-secondary hover:text-text-primary cursor-pointer"
                  >
                    Regenerate
                  </button>
                </div>
              </div>

              {/* Action Buttons to Advance Assembly Stage */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-border">
                <button
                  type="button"
                  onClick={() => setAssemblyModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-surface-hover border border-border text-text-secondary cursor-pointer"
                >
                  Close
                </button>

                <div className="flex flex-wrap items-center gap-2">
                  {/* Step 1 -> 2: Start Assembly */}
                  {kitStatus !== 'in_assembly' && kitStatus !== 'kit_ready' && (
                    <button
                      type="button"
                      disabled={submittingAssembly || hasShortage}
                      onClick={() => handleAdvanceAssembly('in_assembly')}
                      className={`px-3.5 py-2 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-1.5 shadow-sm transition-all ${
                        hasShortage
                          ? 'bg-surface-hover text-text-muted border border-border cursor-not-allowed opacity-50'
                          : 'bg-purple-600 hover:bg-purple-500 text-white cursor-pointer'
                      }`}
                    >
                      {submittingAssembly ? <FaSpinner className="animate-spin" /> : <FaTools />}
                      <span>Step 2: Move to Assembly Station</span>
                    </button>
                  )}

                  {/* Step 2: Complete Assembly */}
                  {kitStatus === 'in_assembly' && !assemblyDetails.assembled_at && assemblyDetails.assembly_status !== 'completed' && (
                    <button
                      type="button"
                      disabled={submittingAssembly}
                      onClick={() => handleAdvanceAssembly('assembled')}
                      className="px-3.5 py-2 rounded-xl text-xs font-black uppercase tracking-wider bg-indigo-600 hover:bg-indigo-500 text-white cursor-pointer shadow-sm flex items-center gap-1.5"
                    >
                      {submittingAssembly ? <FaSpinner className="animate-spin" /> : <FaWrench />}
                      <span>Step 2: Complete Mechanical Assembly</span>
                    </button>
                  )}

                  {/* Step 3: QC Check */}
                  {kitStatus === 'in_assembly' && (assemblyDetails.assembled_at || assemblyDetails.assembly_status === 'completed') && !assemblyDetails.qc_verified && assemblyDetails.qc_status !== 'passed' && (
                    <button
                      type="button"
                      disabled={submittingAssembly}
                      onClick={() => handleAdvanceAssembly('qc_verified')}
                      className="px-3.5 py-2 rounded-xl text-xs font-black uppercase tracking-wider bg-teal-600 hover:bg-teal-500 text-white cursor-pointer shadow-sm flex items-center gap-1.5"
                    >
                      {submittingAssembly ? <FaSpinner className="animate-spin" /> : <FaClipboardCheck />}
                      <span>Step 3: Pass QC Inspection</span>
                    </button>
                  )}

                  {/* Step 4: Pack & Label */}
                  {kitStatus === 'in_assembly' && (assemblyDetails.qc_verified || assemblyDetails.qc_status === 'passed') && !assemblyDetails.packed_and_labeled && (
                    <button
                      type="button"
                      disabled={submittingAssembly}
                      onClick={() => handleAdvanceAssembly('packed_and_labeled')}
                      className="px-3.5 py-2 rounded-xl text-xs font-black uppercase tracking-wider bg-blue-600 hover:bg-blue-500 text-white cursor-pointer shadow-sm flex items-center gap-1.5"
                    >
                      {submittingAssembly ? <FaSpinner className="animate-spin" /> : <FaBarcode />}
                      <span>Step 4: Print Label & Pack Kit</span>
                    </button>
                  )}

                  {/* Step 5: Mark Kit Ready */}
                  {kitStatus !== 'kit_ready' && (assemblyDetails.packed_and_labeled || !!assemblyDetails.kit_serial_barcode) && (
                    <button
                      type="button"
                      disabled={submittingAssembly || hasShortage || nonBosPending > 0}
                      onClick={() => handleAdvanceAssembly('kit_ready')}
                      title={nonBosPending > 0 ? "Pehle New Orders tab me Inward button se raw material inward karein!" : "Mark kits assembled and ready"}
                      className="px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider bg-emerald-600 hover:bg-emerald-500 text-white cursor-pointer flex items-center gap-1.5 shadow-sm active:scale-95 transition-all disabled:opacity-50"
                    >
                      {submittingAssembly ? <FaSpinner className="animate-spin" /> : <FaCheckDouble />}
                      <span>Step 5: Mark {pendingKits} Kits Assembled & Ready for this Order</span>
                    </button>
                  )}

                  {/* Complete status banner with 1-click Inward action */}
                  {kitStatus === 'kit_ready' && (
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 w-full">
                      <div className="flex items-center gap-2.5">
                        <FaCheckCircle className="text-xl text-emerald-400 shrink-0" />
                        <div>
                          <div className="text-xs font-black uppercase tracking-wider">
                            ✓ All {pendingKits} BOS Kits Are Ready for this Order!
                          </div>
                          <div className="text-[11px] text-emerald-300 font-semibold">
                            Order #{ord.order_number} ({ord.customer_name}) • Ready to be Inwarded in New Orders Queue
                          </div>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setAssemblyModalOpen(false);
                          handleOpenInwardModal(ord);
                        }}
                        className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs cursor-pointer shadow-md transition-all whitespace-nowrap active:scale-95"
                      >
                        📦 Inward Assembled Kits Now →
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })()}
      </Dialog>

      {/* ── Boss Requirement: View Order Details & Incoming Truck Dossier Modal ── */}
      <Dialog
        isOpen={orderDetailsModalOpen}
        onClose={() => setOrderDetailsModalOpen(false)}
        title={`Order & Shipment Dossier: ${selectedOrderForDetails?.delivery_order_id || ''}`}
        size="xl"
      >
        {selectedOrderForDetails && (() => {
          const ord = selectedOrderForDetails;
          
          // Synthesize BOS kit item if required so all components appear together
          const { totalKits, capacity, model } = getOrderKitMetrics(ord);
          const cleanCap = (capacity || '3 kW').replace(/\s+/g, '');
          const bosSku = `BOS-KIT-${cleanCap.toUpperCase()}-STD`;
          const bosProductName = `BOS Kit (${capacity || '3 kW'} Pre-assembled Electrical Package - ACDB/DCDB/Cables)`;

          const itemsWithBosKit = (() => {
            const list = [...(ord.items || [])].map(it => ({ ...it }));
            const existingBosIndex = list.findIndex(it => isBosKitItem(it));
            const actualReceivedKits = existingBosIndex >= 0
              ? (list[existingBosIndex].received_qty || 0)
              : (ord.inward_status === 'fully_inwarded' ? totalKits : 0);
            const pendingKits = Math.max(0, totalKits - actualReceivedKits);
            const receivedKits = actualReceivedKits;

            if (existingBosIndex >= 0) {
              if (list[existingBosIndex].ordered_qty < totalKits) {
                list[existingBosIndex].ordered_qty = totalKits;
                list[existingBosIndex].pending_qty = Math.max(0, totalKits - (list[existingBosIndex].received_qty || 0));
              }
              if (!list[existingBosIndex].product_name?.includes(capacity)) {
                list[existingBosIndex].product_name = bosProductName;
              }
            } else if (ord.kit_preparation_status !== 'not_required') {
              list.push({
                sku: bosSku,
                product_name: bosProductName,
                category: 'BOS Kit',
                ordered_qty: totalKits,
                received_qty: receivedKits,
                pending_qty: pendingKits,
                available_inventory_stock: totalPreassembledKitsInStock,
                supply_fulfilment_method: 'Warehouse Stock / Assembly',
                rack_location: ord.kit_assembly_details?.storage_location || 'BAY-BOS-STOCK',
                is_synthesized_bos_kit: true
              });
            }
            return list;
          })();

          const totalOrderedItems = itemsWithBosKit.reduce((acc, it) => acc + (it.ordered_qty || 0), 0);
          const totalReceivedItems = itemsWithBosKit.reduce((acc, it) => acc + (it.received_qty || 0), 0);
          const totalPendingItems = itemsWithBosKit.reduce((acc, it) => acc + (it.pending_qty || 0), 0);
          const inwardPercent = totalOrderedItems > 0 ? Math.round((totalReceivedItems / totalOrderedItems) * 100) : 0;

          return (
            <div className="space-y-5 p-1 max-h-[80vh] overflow-y-auto pr-1">
              {/* Order Header Summary Banner */}
              <div className="p-4 bg-gradient-to-r from-primary/10 via-surface-hover to-surface border border-primary/20 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-lg font-black font-mono text-primary">{ord.delivery_order_id}</span>
                    <span className="text-xs text-text-muted font-normal">• Order #{ord.order_number}</span>
                    {ord.delivery_number && (
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                        Delivery #: {ord.delivery_number}
                      </span>
                    )}
                  </div>
                  {ord.epcs && ord.epcs.length > 1 ? (
                    <div className="text-sm font-bold text-text-primary mt-1 flex items-center gap-2 flex-wrap">
                      <span className="px-2.5 py-0.5 rounded-md bg-purple-500/15 text-purple-400 font-black text-xs uppercase tracking-wider border border-purple-500/30">
                        Consolidated Multi-EPC Order ({ord.epcs.length} EPC Orders Bundled)
                      </span>
                      <span className="text-xs text-text-secondary font-medium">
                        📦 {ord.epcs.length} Consolidated Customer Packages Loaded in Single Vehicle
                      </span>
                    </div>
                  ) : (
                    <div className="text-sm font-bold text-text-primary mt-1 flex items-center gap-1.5 flex-wrap">
                      <span className="px-2 py-0.5 rounded-md bg-primary/10 text-primary text-[11px] font-black uppercase border border-primary/20">
                        EPC Contractor
                      </span>
                      <span>{ord.epcs?.[0]?.epc_name || ord.customer_name}</span>
                      {(ord.epcs?.[0]?.contact_phone || ord.customer_phone) && (
                        <span className="text-xs text-text-muted font-normal ml-1">({ord.epcs?.[0]?.contact_phone || ord.customer_phone})</span>
                      )}
                    </div>
                  )}
                  <div className="text-xs text-text-muted mt-0.5">
                    Ordered: {new Date(ord.order_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                    <span className="ml-2 font-semibold text-text-secondary">• {totalReceivedItems}/{totalOrderedItems} Inwarded ({totalPendingItems} Pending)</span>
                    {ord.sla_days && <span className="ml-2 font-semibold text-text-secondary">• SLA: {ord.sla_days} Days</span>}
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-wrap self-start md:self-auto">
                  <span className={`px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider border ${
                    ord.delivery_status === 'ready_for_dispatch'
                      ? 'bg-success/15 text-success border-success/30'
                      : ord.delivery_status === 'partially_inwarded'
                      ? 'bg-warning/15 text-warning border-warning/30'
                      : 'bg-info/15 text-info border-info/30'
                  }`}>
                    {ord.delivery_status ? ord.delivery_status.replace(/_/g, ' ') : 'New Order'}
                  </span>
                  {ord.kit_preparation_status && ord.kit_preparation_status !== 'not_required' && (
                    <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-purple-500/15 text-purple-400 border border-purple-500/30">
                      BOSKIT: {ord.kit_preparation_status.replace(/_/g, ' ')}
                    </span>
                  )}
                </div>
              </div>

              {/* Delivery Site Destination & Assigned Warehouse */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                <div className="p-3.5 bg-surface border border-border rounded-xl space-y-1.5">
                  <div className="text-[10px] font-black uppercase tracking-wider text-text-muted flex items-center gap-1.5">
                    <FaMapMarkerAlt className="text-primary" /> Delivery Destination Site
                  </div>
                  <div className="font-bold text-text-primary text-sm">{ord.destination?.address || '—'}</div>
                  <div className="text-text-secondary flex items-center gap-2 flex-wrap">
                    <span>District: <strong>{ord.destination?.district || '—'}</strong></span>
                    <span>State: <strong>{ord.destination?.state || '—'}</strong></span>
                    <span className="font-mono text-primary font-bold">PIN: {ord.destination?.pincode || '—'}</span>
                  </div>
                </div>

                <div className="p-3.5 bg-surface border border-border rounded-xl space-y-1.5">
                  <div className="text-[10px] font-black uppercase tracking-wider text-text-muted flex items-center gap-1.5">
                    <FaWarehouse className="text-primary" /> Assigned Fulfillment Warehouse
                  </div>
                  <div className="font-bold text-text-primary text-sm">{ord.warehouse_code || 'Central Warehouse Hub'}</div>
                  <div className="text-text-muted">
                    Assigned for inventory verification, packing, and dispatch staging.
                  </div>
                </div>
              </div>

              {/* ── Complete Incoming Consolidated Truck & Driver Logistics ── */}
              {ord.incoming_truck_group && (ord.incoming_truck_group.group_id || ord.incoming_truck_group.vehicle_number) && (
                <div className="p-4 rounded-xl bg-gradient-to-r from-blue-500/10 via-surface-hover to-surface border border-blue-500/30 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border/70 pb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-primary/20 text-primary flex items-center justify-center font-bold">
                        <FaTruck />
                      </div>
                      <div>
                        <div className="font-black text-text-primary text-xs uppercase tracking-wider flex items-center gap-1.5">
                          Incoming Consolidated Truck Dossier
                        </div>
                        <div className="text-[11px] text-text-muted">
                          Multi-EPC Consignment Group: <strong className="text-text-primary font-mono">{ord.incoming_truck_group.group_id}</strong>
                          {ord.incoming_truck_group.total_epc_orders_in_truck > 1 && (
                            <span className="ml-1 text-info">({ord.incoming_truck_group.total_epc_orders_in_truck} EPC Orders bundled)</span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div>
                      {ord.incoming_truck_group.is_claimed ? (
                        <div className="text-right">
                          <span className="px-2.5 py-1 rounded-full bg-success/15 text-success border border-success/30 text-xs font-bold flex items-center gap-1">
                            <FaCheckCircle className="text-[10px]" /> Claimed & Unloaded in WH
                          </span>
                          {ord.incoming_truck_group.claimed_at && (
                            <div className="text-[10px] text-text-muted mt-0.5">
                              {new Date(ord.incoming_truck_group.claimed_at).toLocaleString()} • {ord.incoming_truck_group.claimed_by_name || 'Staff'}
                            </div>
                          )}
                        </div>
                      ) : (
                        <button
                          onClick={() => handleClaimShipment(ord)}
                          disabled={claimingShipmentId === ord._id}
                          className="px-3.5 py-2 rounded-xl bg-primary text-white hover:bg-primary-hover active:scale-95 transition-all text-xs font-black uppercase tracking-wider flex items-center gap-1.5 shadow-sm cursor-pointer"
                        >
                          {claimingShipmentId === ord._id ? <FaSpinner className="animate-spin text-xs" /> : <FaLayerGroup className="text-xs" />}
                          <span>Claim & Unload to Warehouse</span>
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                    <div>
                      <span className="text-[10px] text-text-muted uppercase font-bold block">Vehicle Number</span>
                      <span className="font-mono font-bold text-text-primary text-sm">{ord.incoming_truck_group.vehicle_number || 'MH-12-PQ-9080'}</span>
                      {ord.incoming_truck_group.vehicle_type && <span className="text-[10px] text-text-muted block">({ord.incoming_truck_group.vehicle_type})</span>}
                    </div>

                    <div>
                      <span className="text-[10px] text-text-muted uppercase font-bold block">Transporter / LR #</span>
                      <span className="font-bold text-text-primary">{ord.incoming_truck_group.transporter_name || 'TCI Freight'}</span>
                      {ord.incoming_truck_group.lr_number && <span className="font-mono text-primary text-[10px] block font-bold">LR: {ord.incoming_truck_group.lr_number}</span>}
                    </div>

                    <div>
                      <span className="text-[10px] text-text-muted uppercase font-bold block">Driver Contact</span>
                      <span className="font-bold text-text-primary">{ord.incoming_truck_group.driver_name || 'Sachin Patil'}</span>
                      {ord.incoming_truck_group.driver_mobile && (
                        <a href={`tel:${ord.incoming_truck_group.driver_mobile}`} className="text-primary hover:underline font-mono text-[11px] block font-semibold">
                          {ord.incoming_truck_group.driver_mobile}
                        </a>
                      )}
                    </div>

                    <div>
                      <span className="text-[10px] text-text-muted uppercase font-bold block">Unloading Dock</span>
                      <span className="font-mono font-bold text-text-primary px-2 py-0.5 rounded bg-surface border border-border inline-block mt-0.5">
                        {ord.incoming_truck_group.unloaded_dock || 'Receiving Dock #1'}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* ── Multi-EPC Consignment Breakdown: Boss Requirement (Each EPC's SolarKit & Components with Exact Numbers) ── */}
              <div className="space-y-3">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-black text-text-primary uppercase tracking-wider flex items-center gap-1.5">
                    <FaLayerGroup className="text-purple-400" /> EPC Consignment Packages & Requested SolarKits
                  </span>
                  <span className="font-bold text-purple-400">
                    {(ord.epcs?.length || 1)} Active EPC Package(s)
                  </span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                  {(ord.epcs && ord.epcs.length > 0 ? ord.epcs : [
                    {
                      epc_id: ord.delivery_order_id,
                      epc_name: ord.customer_name,
                      site_location: `${ord.destination?.district || ''}, ${ord.destination?.state || ''}`,
                      solarkit_model: model || `${capacity || '3 kW'} SolarKit Complete Package`,
                      system_capacity: capacity || '3 kW',
                      panels_qty: `${totalKits * 9} Panels`,
                      inverter_qty: `${totalKits} Inverter${totalKits > 1 ? 's' : ''}`,
                      boskit_qty: `${totalKits} BOS Kit${totalKits > 1 ? 's' : ''} (${capacity || '3 kW'} Pre-assembled)`,
                      structure_qty: `${totalKits * 4} Rails + Clamps`,
                      payment_status: 'Payment Done'
                    }
                  ]).map((epc, eIdx) => {
                    const epcCapacity = epc.system_capacity || capacity || '3 kW';
                    const epcKitsMatch = (epc.boskit_qty || epc.inverter_qty || '').match(/(\d+)/);
                    const epcKits = epcKitsMatch ? parseInt(epcKitsMatch[1], 10) : totalKits;
                    const panelsText = epc.panels_qty || `${epcKits * 9} Panels`;
                    const inverterText = epc.inverter_qty || `${epcKits} Inverter${epcKits > 1 ? 's' : ''} (${epcCapacity})`;
                    const boskitText = epc.boskit_qty || `${epcKits} BOS Kit${epcKits > 1 ? 's' : ''} (${epcCapacity} Pre-assembled Enclosure)`;
                    const structureText = epc.structure_qty || `${epcKits * 4} Rails + Clamps`;
                    const kitModel = epc.solarkit_model || model || `${epcCapacity} SolarKit Complete System Package`;

                    return (
                      <div key={epc.epc_id || eIdx} className="p-3.5 bg-surface border border-purple-500/25 rounded-2xl space-y-3 text-xs shadow-xs hover:border-purple-500/40 transition-all">
                        {/* EPC Header Row */}
                        <div className="flex justify-between items-center border-b border-border/70 pb-2">
                          <div className="flex items-center gap-2">
                            <span className="w-6 h-6 rounded-lg bg-purple-500/15 text-purple-400 flex items-center justify-center font-bold text-xs">
                              #{eIdx + 1}
                            </span>
                            <div>
                              <div className="font-black text-text-primary text-[13px]">{epc.epc_name || `EPC #${eIdx+1}`}</div>
                              {epc.site_location && (
                                <div className="text-[10px] text-text-muted">{epc.site_location}</div>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-1.5">
                            {epc.share_percentage && (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-purple-500/10 text-purple-400 border border-purple-500/20">
                                {epc.share_percentage}% Share
                              </span>
                            )}
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                              <FaCheckCircle className="text-[9px]" /> {epc.payment_status || 'Payment Done'}
                            </span>
                          </div>
                        </div>

                        {/* SolarKit Package Banner */}
                        <div className="p-2 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-between gap-2">
                          <div>
                            <span className="text-[10px] font-black uppercase tracking-wider text-purple-400 block">Requested SolarKit:</span>
                            <span className="font-bold text-text-primary text-xs">{kitModel}</span>
                          </div>
                          <span className="px-2.5 py-1 rounded-lg bg-purple-500/20 text-purple-300 font-mono font-black text-xs shrink-0">
                            ⚡ {capacity}
                          </span>
                        </div>

                        {/* Concrete Numbers Grid (Exact Quantities & Specs) */}
                        <div className="grid grid-cols-2 gap-2 text-[11px]">
                          {/* Solar Panels */}
                          <div className="p-2 rounded-xl bg-surface-hover/70 border border-border flex items-start gap-2">
                            <div className="text-amber-400 text-sm mt-0.5 shrink-0">☀️</div>
                            <div>
                              <div className="text-[10px] font-black uppercase text-text-muted">Solar Panels</div>
                              <div className="font-bold text-text-primary">{panelsText}</div>
                            </div>
                          </div>

                          {/* Solar Inverter */}
                          <div className="p-2 rounded-xl bg-surface-hover/70 border border-border flex items-start gap-2">
                            <div className="text-primary text-sm mt-0.5 shrink-0">⚡</div>
                            <div>
                              <div className="text-[10px] font-black uppercase text-text-muted">Solar Inverter</div>
                              <div className="font-bold text-text-primary">{inverterText}</div>
                            </div>
                          </div>

                          {/* BOS Kit */}
                          <div className="p-2 rounded-xl bg-surface-hover/70 border border-border flex items-start gap-2">
                            <div className="text-purple-400 text-sm mt-0.5 shrink-0">🧰</div>
                            <div>
                              <div className="text-[10px] font-black uppercase text-text-muted">BOS Kit (Enclosure)</div>
                              <div className="font-bold text-text-primary">{boskitText}</div>
                            </div>
                          </div>

                          {/* Mounting Structure */}
                          <div className="p-2 rounded-xl bg-surface-hover/70 border border-border flex items-start gap-2">
                            <div className="text-emerald-400 text-sm mt-0.5 shrink-0">🏗️</div>
                            <div>
                              <div className="text-[10px] font-black uppercase text-text-muted">Mounting Structure</div>
                              <div className="font-bold text-text-primary">{structureText}</div>
                            </div>
                          </div>
                        </div>

                        {/* Itemized Breakdown List with Exact Quantities */}
                        {epc.items && epc.items.length > 0 && (
                          <div className="pt-2 border-t border-border/60">
                            <div className="text-[10px] font-black uppercase text-text-muted mb-1.5 flex items-center justify-between">
                              <span>Itemized Components & Quantities:</span>
                              <span className="font-mono text-purple-400">{epc.items.length} SKUs</span>
                            </div>
                            <div className="space-y-1">
                              {epc.items.map((it, itIdx) => (
                                <div key={it.sku || itIdx} className="flex justify-between items-center text-[11px] px-2.5 py-1 rounded-lg bg-surface border border-border/60">
                                  <div className="flex items-center gap-1.5 truncate pr-2">
                                    <span className="w-1.5 h-1.5 rounded-full bg-purple-400 shrink-0"></span>
                                    <span className="text-text-primary font-medium truncate">{it.product_name || it.name}</span>
                                    {it.sku && <span className="text-[9px] font-mono text-text-muted shrink-0">({it.sku})</span>}
                                  </div>
                                  <span className="font-mono font-bold text-primary shrink-0 bg-primary/10 px-1.5 py-0.2 rounded border border-primary/20">
                                    {it.ordered_qty || it.qty} {typeof (it.ordered_qty || it.qty) === 'number' ? 'Nos' : ''}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Items Breakdown Table */}
              <div className="space-y-2">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-black text-text-primary uppercase tracking-wider flex items-center gap-1.5">
                    <FaBoxes className="text-primary" /> Ordered Products & Inward Status
                  </span>
                  <span className="font-bold text-text-secondary">
                    {totalReceivedItems} / {totalOrderedItems} Pcs Verified ({inwardPercent}%)
                  </span>
                </div>

                <div className="border border-border rounded-xl overflow-hidden bg-surface max-h-56 overflow-y-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-surface-hover border-b border-border text-[10px] font-black uppercase text-text-muted sticky top-0">
                      <tr>
                        <th className="p-2.5">Product Name & SKU</th>
                        <th className="p-2.5">Fulfilment Method</th>
                        <th className="p-2.5 text-center">WH Stock</th>
                        <th className="p-2.5 text-center">Ordered</th>
                        <th className="p-2.5 text-center">Inwarded</th>
                        <th className="p-2.5 text-center">Pending</th>
                        <th className="p-2.5 text-center">Rack</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {itemsWithBosKit.map(it => (
                        <tr key={it.sku} className="hover:bg-surface-hover/30">
                          <td className="p-2.5">
                            <div className="font-bold text-text-primary">{it.product_name}</div>
                            <div className="text-[10px] font-mono text-primary">{it.sku}</div>
                          </td>
                          <td className="p-2.5 text-[11px] text-text-secondary capitalize">
                            {it.supply_fulfilment_method ? it.supply_fulfilment_method.replace(/_/g, ' ') : 'Warehouse Stock'}
                          </td>
                          <td className="p-2.5 text-center font-mono text-[11px]">
                            <span className="font-bold text-text-primary">{it.available_inventory_stock ?? 0}</span>
                            <span className="text-[9px] text-text-muted ml-0.5">Pcs</span>
                          </td>
                          <td className="p-2.5 text-center font-bold">{it.ordered_qty}</td>
                          <td className="p-2.5 text-center font-bold text-success">{it.received_qty}</td>
                          <td className="p-2.5 text-center">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              it.pending_qty === 0 ? 'bg-success/15 text-success' : 'bg-warning/15 text-warning'
                            }`}>
                              {it.pending_qty} Pcs
                            </span>
                          </td>
                          <td className="p-2.5 text-center font-mono text-text-muted">
                            {it.rack_location || '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Scanned Serial Numbers Registry (Outward Matching) if available */}
              {ord.scanned_serials && ord.scanned_serials.length > 0 && (
                <div className="p-3.5 bg-surface border border-border rounded-xl space-y-2">
                  <div className="text-xs font-black text-text-primary uppercase tracking-wider flex items-center gap-1.5">
                    <FaBarcode className="text-primary" /> Scanned Barcodes & Serials Registry ({ord.scanned_serials.length} Registered)
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-36 overflow-y-auto text-xs">
                    {ord.scanned_serials.map((s, idx) => (
                      <div key={idx} className="p-2 rounded-lg bg-surface-hover border border-border flex justify-between items-center">
                        <div>
                          <span className="font-mono font-bold text-primary">{s.serial_code}</span>
                          <span className="text-[10px] text-text-muted block">{s.sku}</span>
                        </div>
                        <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          {s.verified_for_outward ? '✓ Outward Verified' : 'Inward Verified'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Modal Footer Actions */}
              <div className="flex justify-between items-center pt-3 border-t border-border">
                <button
                  type="button"
                  onClick={() => setOrderDetailsModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-surface-hover border border-border text-text-secondary"
                >
                  Close
                </button>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      setOrderDetailsModalOpen(false);
                      handleOpenInwardModal(ord);
                    }}
                    className="px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider gradient-primary text-white cursor-pointer shadow-sm"
                  >
                    Inward Material
                  </button>
                  {ord.kit_preparation_status && ord.kit_preparation_status !== 'not_required' && (
                    (ord.kit_preparation_status === 'kit_ready') ? (
                      <span className="px-3.5 py-2 rounded-xl text-xs font-black uppercase tracking-wider bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center gap-1.5 shadow-sm">
                        <FaCheck className="text-xs" />
                        <span>✓ BOS Kit Allocated ({ord.kit_assembly_details?.allocated_from_batch_code || ord.kit_assembly_details?.kit_serial_barcode || 'In Stock'})</span>
                      </span>
                    ) : totalPreassembledKitsInStock > 0 ? (
                      <button
                        type="button"
                        onClick={() => {
                          setOrderDetailsModalOpen(false);
                          handleOpenStockAllocationModal(ord);
                        }}
                        className="px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider bg-emerald-600 hover:bg-emerald-500 text-white cursor-pointer shadow-sm flex items-center gap-1.5"
                        title="Warehouse ready stock se 1-click me BOS Kit bind karein"
                      >
                        <FaCheck className="text-xs" />
                        <span>⚡ Allocate BOS Kit ({totalPreassembledKitsInStock} Ready)</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleOpenOrderAssembly(ord)}
                        className="px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider bg-purple-600 hover:bg-purple-500 text-white cursor-pointer shadow-sm flex items-center gap-1.5"
                        title="Warehouse buffer me kit nahi hai. Assembly workstation par build karein"
                      >
                        <FaTools className="text-xs" />
                        <span>Open BOSKit Station</span>
                      </button>
                    )
                  )}
                </div>
              </div>
            </div>
          );
        })()}
      </Dialog>

      {/* ── Modal 1: 1-Click Allocate Pre-Assembled Kit from Stock to Order (Part 1) ── */}
      <Dialog
        isOpen={stockAllocateModalOpen}
        onClose={() => {
          if (!submittingStockAllocation) {
            setStockAllocateModalOpen(false);
            setOrderForStockAllocation(null);
          }
        }}
        title="⚡ Allocate Pre-Assembled BOS Kit from Warehouse Stock"
        subtitle={`Instantly bind a warehouse buffer kit to Order #${orderForStockAllocation?.order_number || ''}`}
        size="lg"
      >
        {orderForStockAllocation && (() => {
          const { totalKits: orderReqKits, capacity } = getOrderKitMetrics(orderForStockAllocation);
          const selectedModel = preassembledStock.find(m => m.id === selectedAllocateModelId);
          const availableStock = selectedModel?.ready_stock || 0;
          const nextBatch = (selectedModel?.batch_codes || [])[0] || 'WH-BOS-AUTO-01';

          return (
            <div className="space-y-4 p-1">
              {/* Order Target Context */}
              <div className="p-3.5 bg-surface-hover rounded-xl border border-border flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                <div>
                  <div className="font-extrabold text-text-primary text-sm flex items-center gap-2">
                    <span className="font-mono text-primary">{orderForStockAllocation.delivery_order_id}</span>
                    <span className="text-text-muted">• Order #{orderForStockAllocation.order_number}</span>
                  </div>
                  <div className="text-text-secondary mt-0.5">
                    Customer: <strong>{orderForStockAllocation.customer_name}</strong> {orderForStockAllocation.customer_phone ? `(${orderForStockAllocation.customer_phone})` : ''}
                  </div>
                  <div className="text-[11px] text-text-muted mt-0.5">
                    Destination: {orderForStockAllocation.destination?.address}, {orderForStockAllocation.destination?.district}, {orderForStockAllocation.destination?.state}
                  </div>
                </div>

                <div className="text-left sm:text-right space-y-1">
                  <div className="flex items-center sm:justify-end gap-1.5">
                    <span className="text-[10px] font-bold text-text-muted uppercase">Required:</span>
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-blue-500/15 text-blue-400 border border-blue-500/30">
                      {orderReqKits} BOS Kits ({capacity})
                    </span>
                  </div>
                  <div>
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-purple-500/15 text-purple-400 border border-purple-500/30">
                      Kit Status: {orderForStockAllocation.kit_preparation_status || 'Pending'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Model Selection */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-text-primary uppercase tracking-wider block">
                  Select Pre-Assembled BOS Kit Model from Stock:
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  {preassembledStock.map((m) => {
                    const isAvailable = (m.ready_stock || 0) > 0;
                    const isSelected = selectedAllocateModelId === m.id;
                    return (
                      <div
                        key={m.id}
                        onClick={() => {
                          if (isAvailable) {
                            setSelectedAllocateModelId(m.id);
                            setAllocateKitQty(Math.min(m.ready_stock, orderReqKits));
                          }
                        }}
                        className={`p-3 rounded-xl border transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-purple-600/15 border-purple-500 text-purple-300 ring-1 ring-purple-500/50 shadow-sm'
                            : isAvailable
                            ? 'bg-surface hover:bg-surface-hover border-border text-text-secondary'
                            : 'bg-surface-hover/30 border-border text-text-muted opacity-50 cursor-not-allowed'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold uppercase">{m.category}</span>
                          <span className={`text-[11px] font-mono font-black ${isAvailable ? 'text-emerald-400' : 'text-danger'}`}>
                            {m.ready_stock} in WH
                          </span>
                        </div>
                        <div className="text-xs font-bold text-text-primary mt-1 line-clamp-1">{m.name}</div>
                        <div className="text-[10px] text-text-muted mt-1 font-mono">{m.storage_location}</div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Quantity to Allocate Selector */}
              {selectedModel && (
                <div className="p-3 bg-surface-hover/80 rounded-xl border border-border flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                  <div>
                    <div className="font-bold text-text-primary uppercase tracking-wider text-[11px]">
                      Quantity of BOS Kits to Allocate:
                    </div>
                    <div className="text-[11px] text-text-muted">
                      Order requirement: <strong>{orderReqKits} Kits</strong> • Buffer stock available: <strong className="text-emerald-400">{availableStock} Kits</strong>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min="1"
                      max={availableStock}
                      value={allocateKitQty}
                      onChange={(e) => {
                        const val = parseInt(e.target.value) || 1;
                        setAllocateKitQty(Math.max(1, Math.min(availableStock, val)));
                      }}
                      className="w-20 px-3 py-1.5 rounded-lg bg-surface border border-border text-center font-bold text-sm text-text-primary focus:border-primary font-mono"
                    />
                    <span className="text-xs font-bold text-text-muted">Kits</span>
                    {availableStock >= orderReqKits && (
                      <button
                        type="button"
                        onClick={() => setAllocateKitQty(orderReqKits)}
                        className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-primary/10 text-primary border border-primary/30 hover:bg-primary/20 transition-all cursor-pointer whitespace-nowrap"
                      >
                        Allocate All ({orderReqKits})
                      </button>
                    )}
                    {availableStock < orderReqKits && (
                      <button
                        type="button"
                        onClick={() => setAllocateKitQty(availableStock)}
                        className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/30 hover:bg-amber-500/20 transition-all cursor-pointer whitespace-nowrap"
                      >
                        Allocate Max Available ({availableStock})
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* Selected Model Details Preview */}
              {selectedModel && (
                <div className="p-3.5 rounded-xl bg-surface border border-emerald-500/30 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border/70 pb-2">
                    <div>
                      <div className="text-xs font-black text-text-primary">{selectedModel.name}</div>
                      <div className="text-[11px] text-text-muted">Storage: {selectedModel.storage_location}</div>
                    </div>
                    <div className="text-left sm:text-right">
                      <div className="text-[10px] uppercase font-bold text-text-muted">Batch Code to Allocate:</div>
                      <div className="font-mono text-xs font-black text-emerald-400 bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-500/20">
                        {nextBatch}
                      </div>
                    </div>
                  </div>

                  {/* Components that will be automatically fulfilled */}
                  <div>
                    <div className="flex items-center justify-between text-[11px] font-bold text-text-secondary mb-1">
                      <span>Components Automatically Fulfilled ({allocateKitQty} Kits):</span>
                      <span className="text-[10px] text-text-muted font-normal">Single Kit Qty × {allocateKitQty} Kits</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 max-h-36 overflow-y-auto scrollbar-thin text-[11px]">
                      {selectedModel.bom_components.map((c, i) => (
                        <div key={i} className="flex items-center justify-between p-1.5 rounded-lg bg-surface-hover/60 border border-border/60">
                          <span className="truncate pr-2 text-text-primary">{c.name}</span>
                          <span className="font-mono font-bold text-emerald-400 whitespace-nowrap">
                            ✓ {c.qty * allocateKitQty} {c.unit}
                            <span className="text-[10px] text-text-muted font-normal ml-1">
                              ({c.qty} × {allocateKitQty})
                            </span>
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="p-2.5 rounded-lg bg-purple-500/10 border border-purple-500/25 text-[11px] text-purple-300">
                    💡 <strong>Fulfillment Notice:</strong> Allocating <strong>{allocateKitQty} BOS Kit(s)</strong> will fulfill component quantities, set Kit Status to <strong className="text-emerald-400">Kit Ready for Dispatch</strong>, and advance the order so it can be dispatched immediately.
                  </div>
                </div>
              )}

              {/* Modal Actions */}
              <div className="flex justify-between items-center pt-3 border-t border-border">
                <button
                  type="button"
                  onClick={() => {
                    setStockAllocateModalOpen(false);
                    setOrderForStockAllocation(null);
                  }}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-surface-hover border border-border text-text-secondary cursor-pointer"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  disabled={submittingStockAllocation || availableStock <= 0}
                  onClick={handleConfirmStockAllocation}
                  className="px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-md shadow-emerald-500/25 flex items-center gap-2 cursor-pointer transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submittingStockAllocation ? (
                    <>
                      <FaSpinner className="animate-spin text-xs" />
                      <span>Allocating {allocateKitQty} Kit(s)...</span>
                    </>
                  ) : (
                    <>
                      <FaCheck className="text-xs" />
                      <span>Confirm & Allocate {allocateKitQty} Kit(s)</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          );
        })()}
      </Dialog>

      {/* ── Modal 2: Pre-Assemble BOS Kits into Warehouse Stock (Part 2) ── */}
      <Dialog
        isOpen={stockAssemblyModalOpen}
        onClose={() => {
          if (!submittingStockAssembly) {
            setStockAssemblyModalOpen(false);
          }
        }}
        title="🏭 Pre-Assemble BOS Kits into Warehouse Buffer Stock"
        subtitle="Build standard kits from inwarded bulk materials to keep in warehouse inventory"
        size="lg"
      >
        <form onSubmit={handleStartBufferAssemblyJob} className="space-y-4 p-1">
          {/* Kit Model Selector */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-text-primary uppercase tracking-wider block">
              1. Select Kit Catalog Model to Assemble:
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              {preassembledStock.map((m) => {
                const isSelected = selectedStockModelId === m.id;
                return (
                  <div
                    key={m.id}
                    onClick={() => {
                      setSelectedStockModelId(m.id);
                      setStockAssemblyRack(m.storage_location);
                    }}
                    className={`p-3 rounded-xl border transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-emerald-600/15 border-emerald-500 text-emerald-300 ring-1 ring-emerald-500/50 shadow-sm'
                        : 'bg-surface hover:bg-surface-hover border-border text-text-secondary'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold uppercase">{m.category}</span>
                      <span className="text-[11px] font-mono font-bold text-emerald-400">
                        {m.ready_stock} current
                      </span>
                    </div>
                    <div className="text-xs font-bold text-text-primary mt-1 line-clamp-1">{m.name}</div>
                    <div className="text-[10px] text-text-muted mt-1 font-mono">{m.storage_location}</div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Assembly Inputs: Quantity, Rack Location, Operator */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="text-xs font-bold text-text-primary uppercase tracking-wider block mb-1.5">
                Quantity to Assemble:
              </label>
              <input
                type="number"
                min="1"
                max="50"
                value={stockAssembleQty}
                onChange={(e) => setStockAssembleQty(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-full p-2.5 text-xs font-bold font-mono bg-surface border border-border rounded-xl text-text-primary focus:border-primary"
                required
              />
            </div>

            <div>
              <label className="text-xs font-bold text-text-primary uppercase tracking-wider block mb-1.5">
                Storage Rack / Bay Location:
              </label>
              <input
                type="text"
                value={stockAssemblyRack}
                onChange={(e) => setStockAssemblyRack(e.target.value)}
                placeholder="e.g. Bay 2 / Pallet B-04"
                className="w-full p-2.5 text-xs font-medium bg-surface border border-border rounded-xl text-text-primary focus:border-primary"
                required
              />
            </div>

            <div>
              <label className="text-xs font-bold text-text-primary uppercase tracking-wider block mb-1.5">
                Technician / Assembly Lead:
              </label>
              <input
                type="text"
                value={stockAssemblyOperator}
                onChange={(e) => setStockAssemblyOperator(e.target.value)}
                placeholder="Technician name"
                className="w-full p-2.5 text-xs font-medium bg-surface border border-border rounded-xl text-text-primary focus:border-primary"
                required
              />
            </div>
          </div>

          {/* Dynamic BOM Requirements & Inward Stock Check Preview */}
          {(() => {
            const selectedModel = preassembledStock.find(m => m.id === selectedStockModelId);
            if (!selectedModel) return null;
            const qty = parseInt(stockAssembleQty) || 1;
            const { hasShortage, items } = checkRawMaterialStock(selectedModel, qty);

            return (
              <div className="space-y-3">
                {/* Shortage Warning Banner */}
                {hasShortage ? (
                  <div className="p-3.5 rounded-xl bg-amber-500/10 border-2 border-amber-500/40 text-amber-300 space-y-2">
                    <div className="flex items-center gap-2 text-xs font-black uppercase">
                      <FaExclamationTriangle className="text-amber-400 text-sm" />
                      <span>⚠️ Raw Materials Not Inwarded in Warehouse Stock!</span>
                    </div>
                    <p className="text-[11px] text-amber-200/90 leading-relaxed">
                      Warehouse buffer stock me BOS Kit assemble karne ke liye pehle required raw material ko <strong>Material Inward</strong> tab me jakar inward karein. Inward hone ke baad hi assembly start karne ko milega!
                    </p>
                    <div className="flex flex-wrap gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => {
                          setStockAssemblyModalOpen(false);
                          navigate(`${prefix}/material-inward`);
                        }}
                        className="px-3.5 py-1.5 rounded-lg text-xs font-black bg-amber-500 hover:bg-amber-400 text-black flex items-center gap-1.5 transition-all cursor-pointer shadow-md"
                      >
                        <FaWarehouse className="text-xs" />
                        <span>📦 Go to Material Inward Tab to Inward Materials →</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleQuickInwardRawStock(selectedModel.id, qty)}
                        className="px-3 py-1.5 rounded-lg text-xs font-bold bg-surface hover:bg-surface-hover border border-amber-500/40 text-amber-300 flex items-center gap-1.5 transition-all cursor-pointer"
                        title="Simulate inwarding missing components into warehouse stock"
                      >
                        <FaPlus className="text-xs" />
                        <span>📥 Inward Missing Materials into WH (Testing Shortcut)</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <FaCheckCircle className="text-sm" />
                      <span>✓ All Raw Materials Inwarded & Available in WH Stock for {qty} Kit(s)!</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => handleSimulateShortage(selectedModel.id)}
                      className="text-[10px] text-text-muted hover:text-amber-300 underline cursor-pointer"
                    >
                      (Test Shortage Warning)
                    </button>
                  </div>
                )}

                <div className="p-3.5 rounded-xl bg-surface-hover/60 border border-border space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="text-xs font-black text-text-primary uppercase tracking-wider">
                      Raw Material Consumption for {qty} Kit(s):
                    </div>
                    <span className="text-[10px] text-text-muted font-mono">BOM Components Check</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-40 overflow-y-auto scrollbar-thin text-xs">
                    {items.map((it, i) => (
                      <div
                        key={i}
                        className={`flex items-center justify-between p-2 rounded-lg border ${
                          it.isShort
                            ? 'bg-amber-500/10 border-amber-500/40 text-amber-300'
                            : 'bg-surface border-border/70 text-text-secondary'
                        }`}
                      >
                        <span className="truncate pr-2 font-medium">{it.name}</span>
                        <div className="text-right shrink-0">
                          <span className="font-mono font-bold whitespace-nowrap text-primary">
                            {it.required} {it.unit}
                          </span>
                          <span className={`block text-[9px] font-bold ${it.isShort ? 'text-amber-400 font-mono' : 'text-emerald-400 font-mono'}`}>
                            {it.isShort ? `Shortage (Inward: ${it.available})` : `✓ Inwarded: ${it.available}`}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Modal Actions */}
                <div className="flex justify-between items-center pt-3 border-t border-border">
                  <button
                    type="button"
                    onClick={() => setStockAssemblyModalOpen(false)}
                    className="px-4 py-2 rounded-xl text-xs font-bold bg-surface-hover border border-border text-text-secondary cursor-pointer"
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    disabled={submittingStockAssembly || hasShortage}
                    className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-2 transition-all ${
                      hasShortage
                        ? 'bg-gray-700/60 text-gray-400 border border-gray-600/50 cursor-not-allowed shadow-none'
                        : 'bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-md shadow-emerald-500/25 cursor-pointer active:scale-95'
                    }`}
                  >
                    {submittingStockAssembly ? (
                      <>
                        <FaSpinner className="animate-spin text-xs" />
                        <span>Starting Assembly...</span>
                      </>
                    ) : hasShortage ? (
                      <>
                        <FaLock className="text-xs" />
                        <span>🔒 Assembly Locked (Inward Materials First)</span>
                      </>
                    ) : (
                      <>
                        <FaTools className="text-xs" />
                        <span>🚀 Start 5-Stage Buffer Assembly Job ({stockAssembleQty} Kit) →</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            );
          })()}
        </form>
      </Dialog>
    </div>
  );
}

