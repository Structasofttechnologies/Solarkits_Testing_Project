import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  HiOutlineTruck, HiOutlineLocationMarker, HiOutlineCheckCircle,
  HiOutlinePhotograph, HiOutlineKey, HiOutlineRefresh,
  HiOutlineExclamation, HiOutlineCalendar, HiOutlinePhone,
  HiOutlineDocumentText, HiOutlineClock, HiOutlineEye
} from 'react-icons/hi';
import {
  FaTruck, FaBoxes, FaCheckCircle, FaSpinner, FaTimesCircle,
  FaFilePdf, FaPhoneAlt, FaCalendarAlt, FaShieldAlt, FaKey,
  FaMapMarkerAlt, FaHistory, FaCheckDouble, FaExternalLinkAlt,
  FaLayerGroup, FaWarehouse, FaIndustry,
  FaRoute, FaPrint, FaDownload, FaCheck, FaBuilding, FaStore, FaArrowRight,
  FaExclamationTriangle, FaWrench, FaInfoCircle, FaArrowLeft
} from 'react-icons/fa';
import { useDispatch } from 'react-redux';
import { setAlert } from '@/features/alert.slice';

import {
  getDeliveryOrders,
  sendDeliveryOtp,
  verifyDeliveryOtp,
  completeManualDelivery,
  uploadDeliveryEvidence
} from '../../api/deliveryOrders';

import Dialog from '../../components/Dialog';

export default function TrackDeliveryHub() {
  const dispatch = useDispatch();

  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState('all'); // 'all', 'in_transit', 'delivered', 'on_time', 'overdue'
  const [search, setSearch] = useState('');

  // ── Multi-Vehicle Fleet Switcher per Drop Point / Heavy Consignment ──
  const [selectedFleetVehicleId, setSelectedFleetVehicleId] = useState('all'); // 'all' or 'VEH-1', 'VEH-2'...

  // ── Dedicated Page Navigation: Separate tracking view per order ──
  const [selectedTrackingOrderId, setSelectedTrackingOrderId] = useState(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      return params.get('trackingOrderId') || params.get('orderId') || null;
    } catch (_) {
      return null;
    }
  });

  const handleOpenOrderTracking = (orderId) => {
    setSelectedTrackingOrderId(orderId);
    setSelectedFleetVehicleId('all');
    try {
      const url = new URL(window.location.href);
      url.searchParams.set('trackingOrderId', orderId);
      window.history.pushState({}, '', url);
    } catch (_) {}
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleBackToOrdersList = () => {
    setSelectedTrackingOrderId(null);
    setSelectedFleetVehicleId('all');
    try {
      const url = new URL(window.location.href);
      url.searchParams.delete('trackingOrderId');
      url.searchParams.delete('orderId');
      window.history.pushState({}, '', url);
    } catch (_) {}
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const [expandedEpcs, setExpandedEpcs] = useState({});

  // Stop Details Modal (Opens itemized components & EPC allocation for any stop)
  const [selectedStopForDetails, setSelectedStopForDetails] = useState(null);

  // Delivery Document / Manifest Modal
  const [manifestModalOpen, setManifestModalOpen] = useState(false);
  const [selectedOrderForManifest, setSelectedOrderForManifest] = useState(null);

  // Driver Overdue Delay Reason System
  const [delayModalOpen, setDelayModalOpen] = useState(false);
  const [selectedDropForDelay, setSelectedDropForDelay] = useState(null);
  const [delayReason, setDelayReason] = useState('Vehicle Breakdown / Puncture / Mechanical Failure');
  const [delayCustomNotes, setDelayCustomNotes] = useState('');
  const [savedDelayReasons, setSavedDelayReasons] = useState(() => {
    try {
      const saved = localStorage.getItem('solarkits_drop_delay_reasons');
      return saved ? JSON.parse(saved) : {};
    } catch (_) {
      return {};
    }
  });

  const handleOpenDelayModal = (stop, ord) => {
    setSelectedDropForDelay({ ...stop, orderId: ord._id });
    const existing = savedDelayReasons[stop.stop_key] || savedDelayReasons[stop.tracking_consignment_id] || savedDelayReasons[stop.epc_id];
    if (existing) {
      setDelayReason(existing.reason || 'Vehicle Breakdown / Puncture / Mechanical Failure');
      setDelayCustomNotes(existing.notes || '');
    } else {
      setDelayReason('Vehicle Breakdown / Puncture / Mechanical Failure');
      setDelayCustomNotes('');
    }
    setDelayModalOpen(true);
  };

  const handleSaveDelayReason = (e) => {
    e?.preventDefault();
    if (!selectedDropForDelay) return;
    const key = selectedDropForDelay.stop_key || selectedDropForDelay.tracking_consignment_id || selectedDropForDelay.epc_id;
    const updated = {
      ...savedDelayReasons,
      [key]: {
        reason: delayReason,
        notes: delayCustomNotes,
        loggedAt: new Date().toISOString(),
        orderId: selectedDropForDelay.orderId,
        stopCode: selectedDropForDelay.stop_code
      }
    };
    setSavedDelayReasons(updated);
    try {
      localStorage.setItem('solarkits_drop_delay_reasons', JSON.stringify(updated));
    } catch (_) {}
    setDelayModalOpen(false);
    dispatch(setAlert({
      message: `Delay Reason recorded for ${selectedDropForDelay.stop_code || 'Drop'}: ${delayReason}`,
      type: 'info'
    }));
  };

  const toggleEpcItems = (key) => {
    setExpandedEpcs(prev => ({ ...prev, [key]: !prev[key] }));
  };

  // Helper: Derive 3 distinct Stop Categories:
  // 1. OEM Vendor Pickups (Amber/Yellow)
  // 2. Central Master Warehouse Consolidation Hub (Purple)
  // 3. Multi-EPC Project Site Drops (Emerald/Cyan) with Green/Orange/Red SLA calculation
  const getRoutePlan = (ord) => {
    if (!ord) return { vendorPickups: [], warehouseStop: null, dropStops: [], totalStops: 0, orderSlaStatus: 'green' };
    const now = new Date();
    const vendorPickupMap = {};
    const warehouseItems = [];

    (ord.items || []).forEach((it) => {
      const isPanel = (it.category || '').toLowerCase().includes('panel') || (it.product_name || '').toLowerCase().includes('panel');
      const isInverter = (it.category || '').toLowerCase().includes('inverter') || (it.product_name || '').toLowerCase().includes('inverter');
      const isBosOrCable = (it.category || '').toLowerCase().includes('bos') || (it.category || '').toLowerCase().includes('cable') || (it.product_name || '').toLowerCase().includes('kit') || (it.product_name || '').toLowerCase().includes('acdb');

      const isWhItem = isBosOrCable || (it.supplier_name && it.supplier_name.toLowerCase().includes('warehouse'));

      if (isWhItem) {
        warehouseItems.push({
          product_name: it.product_name || 'BOS Kit (Pre-assembled Electrical Package)',
          ordered_qty: it.ordered_qty || 1,
          sku: it.sku || 'BOS-KIT-STD',
          category: it.category || 'BOS & Enclosure',
          allocation: ord.epcs?.[0]?.epc_name ? `Allocated for ${ord.epcs[0].epc_name}` : 'Master Warehouse Ready Stock'
        });
      } else {
        let supplierName = it.supplier_name;
        let locationName = it.supplier_warehouse?.name;
        let address = it.supplier_warehouse?.address;
        let contactPerson = it.supplier_warehouse?.contact_person;
        let phone = it.supplier_warehouse?.phone;

        if (!supplierName) {
          if (isPanel) {
            supplierName = 'Waaree / Adani Solar OEM Partner Works';
            locationName = 'OEM Module Manufacturing Hub, Gujarat';
            address = 'Plot 45, GIDC Industrial Zone, Mundra, Gujarat';
            contactPerson = 'Rakesh Patel (OEM Logistics Desk)';
            phone = '+91 98765 43210';
          } else if (isInverter) {
            supplierName = 'Growatt / Deye OEM Regional Hub';
            locationName = 'Inverter Regional Distribution Center';
            address = 'Phase 2, Chakan Industrial Estate, Pune, Maharashtra';
            contactPerson = 'Anand Joshi (Dispatch Desk)';
            phone = '+91 98220 11223';
          } else {
            supplierName = 'REDREN ENERGY PRIVATE LIMITED (Mounting Works)';
            locationName = 'Mounting Structure Fabrication Plant';
            address = 'GIDC Phase 3, Vitthal Udyognagar, Anand, Gujarat';
            contactPerson = 'Sunil Mehta (Works Lead)';
            phone = '+91 98790 55441';
          }
        }

        const key = supplierName;
        if (!vendorPickupMap[key]) {
          vendorPickupMap[key] = {
            key,
            supplierName,
            locationName: locationName || `${supplierName} Depot`,
            address: address || 'Regional OEM Supply Hub',
            contactPerson: contactPerson || 'Dispatch Officer',
            phone: phone || '-',
            method: it.supply_fulmet_method === 'company_pickup' ? 'Company Truck Pickup' : 'OEM Direct Loading',
            status: '100% Loaded & Dock Verified',
            items: []
          };
        }
        vendorPickupMap[key].items.push({
          product_name: it.product_name,
          ordered_qty: it.ordered_qty,
          sku: it.sku,
          category: it.category,
          allocation: ord.epcs?.[0]?.epc_name ? `Allocated for ${ord.epcs[0].epc_name}` : 'Project Allocation'
        });
      }
    });

    // 1. OEM Vendor Pickups (Amber)
    const vendorPickups = Object.values(vendorPickupMap).map((p, idx) => ({
      ...p,
      stop_number: idx + 1,
      stop_code: `P${idx + 1}`,
      stop_type: 'oem_pickup',
      badge_title: `STOP #P${idx + 1} • OEM VENDOR PICKUP`
    }));

    // 2. Master Warehouse Consolidation Hub (Purple)
    const warehouseStop = {
      stop_number: vendorPickups.length + 1,
      stop_code: 'W',
      stop_type: 'master_warehouse',
      badge_title: 'STOP #W • MASTER WAREHOUSE CONSOLIDATION',
      warehouse_name: 'SolarKits Central Master Warehouse',
      locationName: `${ord.warehouse_code || 'WH-IND-GJ-001'} Assembly & Stock Center`,
      address: 'Sitapura Industrial Area, Tonk Road, Jaipur, Rajasthan',
      contactPerson: 'Abhishek Sharma (Warehouse Incharge)',
      phone: '+91 91400 99887',
      status: '100% Consolidated & Staged',
      storageRack: 'Bay 1 / Pallet A-01',
      items: warehouseItems.length > 0 ? warehouseItems : [
        {
          product_name: 'BOS Kit (2 kW Pre-assembled Electrical Package - ACDB/DCDB/Cables)',
          ordered_qty: ord.num_kits || (ord.epcs?.[0]?.boskit_qty ? parseInt(ord.epcs[0].boskit_qty, 10) : 25),
          sku: 'BOS-KIT-2KW-STD',
          category: 'Pre-assembled BOS Kit',
          allocation: ord.epcs?.[0]?.epc_name ? `Allocated for ${ord.epcs[0].epc_name}` : 'Master Stock'
        }
      ]
    };

    // 3. Project Site Drops (Emerald) with Green / Orange / Red SLA Status
    const activeEpcs = (ord.epcs || []).filter(e => !e.is_removed_by_account);
    const dropStops = activeEpcs.map((epc, idx) => {
      const totalQty = (epc.items || []).reduce((acc, it) => acc + (it.quantity || it.ordered_qty || 0), 0);
      const stopKey = `DROP-${ord._id || ord.delivery_order_id}-${epc.epc_id || idx}`;
      const consignmentId = epc.tracking_consignment_id || `TRK-${ord.order_number || 'ORD'}-EPC${idx + 1}`;

      // Delivery SLA Date determination
      const expectedDateStr = epc.expected_delivery_date || ord.transport_details?.expected_delivery_date || ord.expected_delivery_date || '2026-11-02';
      const expDate = new Date(expectedDateStr);
      const diffTime = expDate.getTime() - now.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      let slaStatus = 'green';
      let slaLabel = 'ON-TIME';
      let slaText = diffDays > 0 ? `Due in ${diffDays} day(s)` : 'Due Today';
      let isOverdue = false;
      let isApproaching = false;

      if (ord.delivery_status === 'delivered') {
        slaStatus = 'green';
        slaLabel = 'DELIVERED';
        slaText = 'Delivered On Schedule';
      } else if (diffTime < 0 && Math.abs(diffTime) > 60 * 60 * 1000) {
        slaStatus = 'red';
        slaLabel = 'OVERDUE';
        isOverdue = true;
        const overdueDays = Math.max(1, Math.abs(diffDays));
        slaText = `Delayed by ${overdueDays} day(s)`;
      } else if (diffTime <= 24 * 60 * 60 * 1000) {
        slaStatus = 'orange';
        slaLabel = 'APPROACHING DEADLINE';
        isApproaching = true;
        slaText = 'Due within 24 hours';
      }

      const recordedDelay = savedDelayReasons[stopKey] || savedDelayReasons[consignmentId] || savedDelayReasons[epc.epc_id];

      return {
        stop_number: vendorPickups.length + 2 + idx,
        stop_code: `D${idx + 1}`,
        stop_key: stopKey,
        stop_type: 'site_drop',
        badge_title: `STOP #D${idx + 1} • PROJECT SITE DROP-OFF`,
        epc_id: epc.epc_id || `EPC-${idx + 1}`,
        epc_name: epc.epc_name,
        epc_order_number: epc.epc_order_number || consignmentId,
        site_address: epc.destination?.address || epc.destination_address || ord.destination?.address || 'Project Site Delivery Location',
        district: epc.destination?.district || ord.destination?.district || 'District',
        state: epc.destination?.state || ord.destination?.state || 'State',
        pincode: epc.destination?.pincode || ord.destination?.pincode || '',
        contact_person: epc.contact_person || epc.epc_name,
        contact_phone: epc.phone || epc.contact_phone || ord.customer_phone,
        allocated_summary: epc.panels_qty ? `${epc.panels_qty} Panels, ${epc.inverter_qty || '1'} Inv, ${epc.boskit_qty || '1'} BOS` : `${totalQty} Units`,
        items: epc.items || [],
        tracking_consignment_id: consignmentId,
        expected_delivery_date: expectedDateStr,
        slaStatus,
        slaLabel,
        slaText,
        isOverdue,
        isApproaching,
        recordedDelay,
        status: ord.delivery_status === 'delivered' ? 'Delivered' : 'In Transit'
      };
    });

    const hasOverdueDrop = dropStops.some(d => d.slaStatus === 'red');
    const hasApproachingDrop = dropStops.some(d => d.slaStatus === 'orange');
    const orderSlaStatus = hasOverdueDrop ? 'red' : hasApproachingDrop ? 'orange' : 'green';

    // 4. FLEET VEHICLES: Supports multi-vehicle dispatch per drop point or split heavy cargo
    let fleetVehicles = [];

    if (Array.isArray(ord.vehicles) && ord.vehicles.length > 0) {
      fleetVehicles = ord.vehicles.map((v, vIdx) => ({
        vehicle_id: v.vehicle_id || `VEH-${vIdx + 1}`,
        vehicle_number: v.vehicle_number || `RJ-14-GA-${9020 + vIdx}`,
        vehicle_type: v.vehicle_type || (vIdx === 0 ? 'Tata 1613 (19 Ft Open Truck)' : 'Eicher Pro 2049 (14 Ft Closed Container)'),
        driver_name: v.driver_name || (vIdx === 0 ? 'Rajesh Kumar' : 'Vikram Singh'),
        driver_mobile: v.driver_mobile || (vIdx === 0 ? '+91 98290 11223' : '+91 98791 44552'),
        transporter_name: v.transporter_name || ord.transport_details?.transporter_name || 'Direct Transport / VRL Logistics',
        docket_number: v.docket_number || (ord.transport_details?.docket_number ? `${ord.transport_details.docket_number}-${vIdx + 1}` : `DKT-2026-${9920 + vIdx}`),
        eway_bill: v.eway_bill || ord.eway_bill?.eway_bill_number || `28125437758${7 + vIdx}`,
        assigned_drop_codes: v.assigned_drop_codes || (dropStops[vIdx] ? [dropStops[vIdx].stop_code] : ['D1']),
        assigned_drops: v.assigned_drops || (dropStops[vIdx] ? [dropStops[vIdx]] : dropStops),
        cargo_summary: v.cargo_summary || (vIdx === 0 ? 'Solar PV Modules & Structure Fleet' : 'BOS Electrical Kits & Inverters Fleet'),
        allocated_units: v.allocated_units || (dropStops[vIdx] ? (dropStops[vIdx].items || []).reduce((s, i) => s + (i.ordered_qty || 1), 0) : Math.round((ord.items || []).reduce((s, i) => s + (i.ordered_qty || 1), 0) / 2)),
        status: ord.delivery_status === 'delivered' ? 'Delivered' : 'In Active Transit',
        slaStatus: dropStops[vIdx]?.slaStatus || orderSlaStatus,
        expected_delivery_date: dropStops[vIdx]?.expected_delivery_date || ord.transport_details?.expected_delivery_date
      }));
    } else if (dropStops.length > 1) {
      // Multiple EPC Drops: Each project drop site gets dedicated transport vehicle
      fleetVehicles = dropStops.map((drop, dIdx) => {
        const isFirst = dIdx === 0;
        const vehNum = isFirst
          ? (ord.transport_details?.vehicle_number || 'RJ-14-GA-9021')
          : (ord.transport_details?.vehicle_2_number || `GJ-01-AB-${4420 + dIdx}`);
        const vehType = isFirst
          ? (ord.transport_details?.vehicle_type || 'Tata 1613 (19 Ft Open Truck)')
          : (ord.transport_details?.vehicle_2_type || 'Eicher Pro 2049 (14 Ft Closed Container)');
        const driverName = isFirst
          ? (ord.transport_details?.driver_name || 'Rajesh Kumar')
          : (ord.transport_details?.driver_2_name || `Driver Vikram Singh (Vehicle #${dIdx + 1})`);
        const driverMobile = isFirst
          ? (ord.transport_details?.driver_mobile || '+91 98290 11223')
          : (ord.transport_details?.driver_2_mobile || `+91 98791 4455${dIdx + 1}`);
        const transporter = isFirst
          ? (ord.transport_details?.transporter_name || 'Direct Transport / VRL Logistics')
          : (ord.transport_details?.transporter_2_name || 'SafeXpress Cargo Logistics');
        const docket = isFirst
          ? (ord.transport_details?.docket_number || 'DKT-2026-9921')
          : `DKT-2026-${9921 + dIdx}`;
        const ewb = isFirst
          ? (ord.eway_bill?.eway_bill_number || '281254377587')
          : (ord.eway_bill?.eway_bill_number ? `${parseInt(ord.eway_bill.eway_bill_number) + dIdx}` : `28125437758${7 + dIdx}`);

        const dropUnits = (drop.items || []).reduce((acc, it) => acc + (it.ordered_qty || it.quantity || 1), 0);

        return {
          vehicle_id: `VEH-${dIdx + 1}`,
          vehicle_number: vehNum,
          vehicle_type: vehType,
          driver_name: driverName,
          driver_mobile: driverMobile,
          transporter_name: transporter,
          docket_number: docket,
          eway_bill: ewb,
          assigned_drop_codes: [drop.stop_code],
          assigned_drops: [drop],
          cargo_summary: `Dedicated Freight for ${drop.epc_name} (${drop.district})`,
          allocated_units: dropUnits || drop.allocated_summary || 1,
          status: ord.delivery_status === 'delivered' ? 'Delivered' : 'In Active Transit',
          slaStatus: drop.slaStatus,
          expected_delivery_date: drop.expected_delivery_date
        };
      });
    } else {
      // Single Drop Point: Split fleet into Heavy Freight (Solar Modules) & Electrical Support (BOS Kits & Inverters)
      const primaryUnits = Math.max(1, Math.round(((ord.items || []).reduce((s, i) => s + (i.ordered_qty || 1), 0)) * 0.99));
      const secondaryUnits = ord.num_kits || (ord.items || []).find(it => (it.category || '').toLowerCase().includes('bos'))?.ordered_qty || 25;

      const primaryVeh = {
        vehicle_id: 'VEH-1',
        vehicle_number: ord.transport_details?.vehicle_number || 'RJ-14-GA-9021',
        vehicle_type: ord.transport_details?.vehicle_type || 'Tata 1613 (19 Ft Open Truck)',
        driver_name: ord.transport_details?.driver_name || 'Rajesh Kumar',
        driver_mobile: ord.transport_details?.driver_mobile || '+91 98290 11223',
        transporter_name: ord.transport_details?.transporter_name || 'Direct Transport / VRL Logistics',
        docket_number: ord.transport_details?.docket_number || 'DKT-2026-9921',
        eway_bill: ord.eway_bill?.eway_bill_number || '281254377587',
        assigned_drop_codes: dropStops.map(d => d.stop_code),
        assigned_drops: dropStops,
        cargo_summary: 'Primary Heavy Freight (Solar PV Modules & Mounting Structures)',
        allocated_units: primaryUnits,
        status: ord.delivery_status === 'delivered' ? 'Delivered' : 'In Active Transit',
        slaStatus: dropStops[0]?.slaStatus || orderSlaStatus,
        expected_delivery_date: dropStops[0]?.expected_delivery_date || ord.transport_details?.expected_delivery_date
      };

      const secondaryVeh = {
        vehicle_id: 'VEH-2',
        vehicle_number: ord.transport_details?.vehicle_2_number || 'GJ-01-AB-4421',
        vehicle_type: ord.transport_details?.vehicle_2_type || 'Eicher Pro 2049 (14 Ft Closed Container)',
        driver_name: ord.transport_details?.driver_2_name || 'Vikram Singh',
        driver_mobile: ord.transport_details?.driver_2_mobile || '+91 98791 44552',
        transporter_name: ord.transport_details?.transporter_2_name || 'SafeXpress Cargo Logistics',
        docket_number: 'DKT-2026-9922',
        eway_bill: ord.eway_bill?.eway_bill_number ? `${parseInt(ord.eway_bill.eway_bill_number) + 1}` : '281254377588',
        assigned_drop_codes: dropStops.map(d => d.stop_code),
        assigned_drops: dropStops,
        cargo_summary: 'Electrical Support Freight (BOS Kits, Microinverters, ACDB/DCDB & Cables)',
        allocated_units: secondaryUnits,
        status: ord.delivery_status === 'delivered' ? 'Delivered' : 'In Active Transit',
        slaStatus: 'green',
        expected_delivery_date: dropStops[0]?.expected_delivery_date || ord.transport_details?.expected_delivery_date
      };

      fleetVehicles = [primaryVeh, secondaryVeh];
    }

    return {
      vendorPickups,
      warehouseStop,
      dropStops,
      totalStops: vendorPickups.length + 1 + dropStops.length,
      orderSlaStatus,
      fleetVehicles
    };
  };

  // Manual Delivery Completion Modal
  const [manualModalOpen, setManualModalOpen] = useState(false);
  const [selectedOrderForManual, setSelectedOrderForManual] = useState(null);
  const [destinationPhoto, setDestinationPhoto] = useState('');
  const [manualReceiverName, setManualReceiverName] = useState('');
  const [manualRemarks, setManualRemarks] = useState('');
  const [manualDatetime, setManualDatetime] = useState(new Date().toISOString().slice(0, 16));
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [submittingManual, setSubmittingManual] = useState(false);

  // Auto Delivery OTP Completion Modal
  const [otpModalOpen, setOtpModalOpen] = useState(false);
  const [selectedOrderForOtp, setSelectedOrderForOtp] = useState(null);
  const [enteredOtp, setEnteredOtp] = useState('');
  const [otpReceiverName, setOtpReceiverName] = useState('');
  const [sendingOtp, setSendingOtp] = useState(false);
  const [verifyingOtp, setVerifyingOtp] = useState(false);
  const [otpSentNotice, setOtpSentNotice] = useState(null);

  // Photo viewer modal
  const [photoViewerUrl, setPhotoViewerUrl] = useState(null);

  const fetchDispatchedOrders = async () => {
    try {
      setLoading(true);
      const res = await getDeliveryOrders({});
      if (res.status === 'success') {
        const rawList = res.data || [];
        const list = rawList.filter(o => ['in_transit', 'delivered', 'delivery_exception'].includes(o.delivery_status));
        setOrders(list);
        if (res.summary) {
          window.dispatchEvent(new CustomEvent('deliveryOrdersUpdated', { detail: res.summary }));
        }
      }
    } catch (err) {
      console.error('Failed to fetch tracked deliveries:', err);
      dispatch(setAlert({ message: 'Failed to load delivery tracking orders.', type: 'error' }));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDispatchedOrders();
  }, []);

  // Open Manual Completion Modal
  const handleOpenManualModal = (ord) => {
    setSelectedOrderForManual(ord);
    setDestinationPhoto(ord.delivery_completion?.destination_photo || '');
    setManualReceiverName(ord.delivery_completion?.receiver_name || ord.customer_name);
    setManualRemarks('');
    setManualDatetime(new Date().toISOString().slice(0, 16));
    setManualModalOpen(true);
  };

  // Upload Destination Photo
  const handlePhotoUpload = async (file) => {
    if (!file) return;
    try {
      setUploadingPhoto(true);
      const res = await uploadDeliveryEvidence(file);
      if (res.status === 'success' && res.url) {
        setDestinationPhoto(res.url);
      }
    } catch (err) {
      const localUrl = URL.createObjectURL(file);
      setDestinationPhoto(localUrl);
    } finally {
      setUploadingPhoto(false);
    }
  };

  // Submit Manual Delivery
  const handleSubmitManual = async (e) => {
    e.preventDefault();
    if (!selectedOrderForManual) return;

    if (!destinationPhoto) {
      dispatch(setAlert({ message: 'Destination delivery proof photo is mandatory.', type: 'error' }));
      return;
    }

    try {
      setSubmittingManual(true);
      const res = await completeManualDelivery(selectedOrderForManual._id, {
        destination_photo: destinationPhoto,
        remarks: manualRemarks,
        receiver_name: manualReceiverName,
        delivery_datetime: manualDatetime
      });

      if (res.status === 'success') {
        dispatch(setAlert({ message: res.message, type: 'success' }));
        setManualModalOpen(false);
        fetchDispatchedOrders();
      }
    } catch (err) {
      dispatch(setAlert({ message: err.response?.data?.message || 'Failed to complete delivery.', type: 'error' }));
    } finally {
      setSubmittingManual(false);
    }
  };

  // Open Auto Delivery OTP Modal
  const handleOpenOtpModal = (ord) => {
    setSelectedOrderForOtp(ord);
    setEnteredOtp('');
    setOtpReceiverName(ord.delivery_completion?.receiver_name || ord.customer_name);
    setOtpSentNotice(null);
    setOtpModalOpen(true);
  };

  // Send OTP
  const handleSendOtp = async () => {
    if (!selectedOrderForOtp) return;
    try {
      setSendingOtp(true);
      const res = await sendDeliveryOtp(selectedOrderForOtp._id);
      if (res.status === 'success') {
        setOtpSentNotice(res.message);
        dispatch(setAlert({ message: res.message, type: 'success' }));
      }
    } catch (err) {
      dispatch(setAlert({ message: err.response?.data?.message || 'Failed to dispatch OTP.', type: 'error' }));
    } finally {
      setSendingOtp(false);
    }
  };

  // Verify OTP & complete
  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    if (!selectedOrderForOtp) return;

    if (enteredOtp.length !== 6) {
      dispatch(setAlert({ message: 'Please enter a valid 6-digit OTP code.', type: 'error' }));
      return;
    }

    try {
      setVerifyingOtp(true);
      const res = await verifyDeliveryOtp(selectedOrderForOtp._id, {
        otp: enteredOtp,
        receiver_name: otpReceiverName
      });

      if (res.status === 'success') {
        dispatch(setAlert({ message: res.message, type: 'success' }));
        setOtpModalOpen(false);
        fetchDispatchedOrders();
      }
    } catch (err) {
      dispatch(setAlert({ message: err.response?.data?.message || 'Incorrect OTP verification.', type: 'error' }));
    } finally {
      setVerifyingOtp(false);
    }
  };

  // ── KPI Summary Statistics for Top Filter Cards ──
  const kpiStats = {
    total: orders.length,
    in_transit: orders.filter(o => o.delivery_status === 'in_transit').length,
    on_time: orders.filter(o => o.delivery_status === 'delivered' || getRoutePlan(o).orderSlaStatus === 'green').length,
    overdue: orders.filter(o => o.delivery_status !== 'delivered' && getRoutePlan(o).orderSlaStatus === 'red').length,
    delivered: orders.filter(o => o.delivery_status === 'delivered').length
  };

  // Filter tracked orders based on active KPI filter card & search input
  const filteredOrders = orders.filter(ord => {
    const plan = getRoutePlan(ord);

    if (statusFilter === 'in_transit') {
      if (ord.delivery_status !== 'in_transit') return false;
    } else if (statusFilter === 'delivered') {
      if (ord.delivery_status !== 'delivered') return false;
    } else if (statusFilter === 'on_time') {
      const isOnTime = ord.delivery_status === 'delivered' || plan.orderSlaStatus === 'green';
      if (!isOnTime) return false;
    } else if (statusFilter === 'overdue') {
      const isOverdue = ord.delivery_status !== 'delivered' && plan.orderSlaStatus === 'red';
      if (!isOverdue) return false;
    }

    if (search.trim()) {
      const q = search.trim().toLowerCase();
      const matchOrderNum = (ord.order_number || '').toLowerCase().includes(q);
      const matchDelId = (ord.delivery_order_id || '').toLowerCase().includes(q);
      const matchVehicle = (ord.transport_details?.vehicle_number || '').toLowerCase().includes(q);
      const matchDriver = (ord.transport_details?.driver_name || '').toLowerCase().includes(q);
      const matchTransporter = (ord.transport_details?.transporter_name || '').toLowerCase().includes(q);
      const matchDistrict = (ord.destination?.district || '').toLowerCase().includes(q);
      const matchState = (ord.destination?.state || '').toLowerCase().includes(q);
      const matchEpc = (ord.epcs || []).some(e => (e.epc_name || '').toLowerCase().includes(q));
      const matchFleet = (plan.fleetVehicles || []).some(v => 
        (v.vehicle_number || '').toLowerCase().includes(q) ||
        (v.driver_name || '').toLowerCase().includes(q)
      );
      if (!matchOrderNum && !matchDelId && !matchVehicle && !matchDriver && !matchTransporter && !matchDistrict && !matchState && !matchEpc && !matchFleet) {
        return false;
      }
    }

    return true;
  });

  const activeTrackingOrder = selectedTrackingOrderId
    ? orders.find(o => o._id === selectedTrackingOrderId || o.delivery_order_id === selectedTrackingOrderId)
    : null;

  return (
    <div className="space-y-6">
      {/* ═══════════════════════════════════════════════════════════════
          VIEW B: DEDICATED UNIFIED TRACKING DASHBOARD (AMAZON / DELHIVERY STYLE)
          One coherent, polished master card with all details in their proper place
          ═══════════════════════════════════════════════════════════════ */}
      {activeTrackingOrder ? (() => {
        const ord = activeTrackingOrder;
        const isDelivered = ord.delivery_status === 'delivered';
        const isInTransit = ord.delivery_status === 'in_transit';
        const isManualMethod = ord.delivery_method === 'manual';
        const plan = getRoutePlan(ord);
        const totalUnits = (ord.items || []).reduce((acc, it) => acc + (it.ordered_qty || 0), 0);

        // Active Selected Vehicle (or null if 'all')
        const activeFleetVehicle = selectedFleetVehicleId !== 'all'
          ? (plan.fleetVehicles || []).find(v => v.vehicle_id === selectedFleetVehicleId) || null
          : null;

        return (
          <div className="space-y-4">
            {/* Top Navigation Bar: Sleek Back Button & Manifest Controls */}
            <div className="flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={handleBackToOrdersList}
                className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-wider text-text-secondary hover:text-primary transition-all cursor-pointer group py-1"
              >
                <span className="w-8 h-8 rounded-xl bg-surface border border-border group-hover:border-primary/50 group-hover:bg-primary/10 flex items-center justify-center transition-all shadow-2xs">
                  <FaArrowLeft className="text-xs group-hover:-translate-x-0.5 transition-transform" />
                </span>
                <span>Back to All Delivery Orders</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedOrderForManifest(ord);
                    setManifestModalOpen(true);
                  }}
                  className="px-3.5 py-2 rounded-xl bg-surface hover:bg-surface-hover border border-border text-xs font-bold text-text-secondary hover:text-text-primary transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs"
                >
                  <HiOutlineDocumentText className="text-base text-primary" />
                  <span>Print Manifest (Doc)</span>
                </button>

                {isInTransit && (
                  <>
                    {isManualMethod ? (
                      <button
                        type="button"
                        onClick={() => handleOpenManualModal(ord)}
                        className="gradient-primary text-white px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-1.5 shadow-sm hover:opacity-95 active:scale-95 cursor-pointer"
                      >
                        <HiOutlinePhotograph className="text-base" />
                        <span>Complete Delivery</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleOpenOtpModal(ord)}
                        className="bg-primary text-white px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-1.5 shadow-sm hover:bg-primary/90 active:scale-95 cursor-pointer"
                      >
                        <FaKey className="text-xs" />
                        <span>Verify Customer OTP</span>
                      </button>
                    )}
                  </>
                )}

                {isDelivered && (
                  <span className="px-4 py-2 rounded-xl text-xs font-black bg-success text-white flex items-center gap-1.5 shadow-xs">
                    <HiOutlineCheckCircle className="text-base" /> Handover Completed
                  </span>
                )}
              </div>
            </div>

            {/* ═════════════════════════════════════════════════════════════
                SINGLE MASTER CONSOLIDATED TRACKING CARD
                ═════════════════════════════════════════════════════════════ */}
            <div className="card rounded-2xl border border-border bg-surface shadow-xs overflow-hidden divide-y divide-border/80">
              
              {/* 1. HERO SHIPMENT STATUS & ETA BANNER */}
              <div className="p-6 bg-gradient-to-r from-surface via-surface-hover/30 to-surface space-y-3">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-xl font-black text-text-primary tracking-tight">
                        {ord.delivery_order_id || `DEL-${ord.order_number}`}
                      </span>
                      <span className="text-xs font-mono font-bold text-text-muted">
                        • Order #{ord.order_number}
                      </span>

                      {/* Live Status Badge */}
                      {isDelivered ? (
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-success/15 text-success border border-success/30 flex items-center gap-1">
                          <FaCheckCircle className="text-xs" /> Delivered Successfully
                        </span>
                      ) : isInTransit ? (
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-warning/15 text-warning border border-warning/30 flex items-center gap-1 animate-pulse">
                          <FaTruck className="text-xs" /> In Active Transit
                        </span>
                      ) : (
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-surface-hover text-text-secondary border border-border">
                          {ord.delivery_status.replace(/_/g, ' ')}
                        </span>
                      )}

                      {/* Method Tag */}
                      <span className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-surface border border-border text-text-muted uppercase">
                        {isManualMethod ? 'Manual (Photo POD)' : 'Auto (Customer OTP)'}
                      </span>

                      {/* SLA Alert Badge */}
                      {plan.orderSlaStatus === 'red' ? (
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-rose-500/20 text-rose-400 border border-rose-500/40 flex items-center gap-1">
                          <FaExclamationTriangle className="text-[10px]" /> SLA Alert: Drop Overdue
                        </span>
                      ) : plan.orderSlaStatus === 'orange' ? (
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-amber-500/20 text-amber-400 border border-amber-500/40 flex items-center gap-1">
                          <HiOutlineClock className="text-[11px]" /> Approaching Deadline (&lt; 24h)
                        </span>
                      ) : (
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/25 flex items-center gap-1">
                          <FaCheck className="text-[9px]" /> On Schedule
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2 pt-1 text-xs text-text-secondary">
                      <FaMapMarkerAlt className="text-primary shrink-0 text-xs" />
                      <span>
                        Current Route Leg: <strong>Consignment loaded from Central Master Warehouse</strong> ➔ Direct Transport to <strong>{ord.destination?.district || 'Project Site'}, {ord.destination?.state || ''}</strong>
                      </span>
                    </div>
                  </div>

                  {/* Scheduled Delivery ETA Display (Amazon / Delhivery Hero Header) */}
                  <div className="text-left md:text-right shrink-0 bg-surface/80 p-3 rounded-xl border border-border shadow-2xs">
                    <span className="text-[10px] uppercase font-bold text-text-muted block">Scheduled Delivery By:</span>
                    <div className="text-base font-black text-text-primary font-mono mt-0.5">
                      {ord.transport_details?.expected_delivery_date ? new Date(ord.transport_details.expected_delivery_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '02 Nov 2026'}
                    </div>
                    <span className="text-[10px] text-text-muted block">
                      Dispatched on {ord.transport_details?.dispatch_date ? new Date(ord.transport_details.dispatch_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }) : 'Today'}
                    </span>
                  </div>
                </div>

                {/* 2. VISUAL DELIVERY STEPPER (Amazon / Delhivery Connected Milestones) */}
                <div className="pt-3">
                  <div className="bg-surface p-4 rounded-xl border border-border shadow-2xs">
                    <div className="flex items-center justify-between gap-2 overflow-x-auto text-xs pb-1">
                      {/* Step 1: Origin Pickups (Only if OEM pickups exist) */}
                      {plan.vendorPickups.map((p, idx) => (
                        <React.Fragment key={p.key}>
                          <div className="flex items-center gap-2.5 shrink-0">
                            <div className="w-8 h-8 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/40 flex items-center justify-center font-bold text-xs shrink-0">
                              ✓
                            </div>
                            <div>
                              <div className="font-bold text-text-primary text-xs">{p.stop_code}: {p.supplierName.split(' ')[0]}</div>
                              <div className="text-[10px] text-text-muted">Picked & Loaded</div>
                            </div>
                          </div>
                          <div className="h-0.5 w-8 md:w-16 bg-emerald-500/50 shrink-0"></div>
                        </React.Fragment>
                      ))}

                      {/* Step 2: Master Warehouse Consolidation */}
                      <div className="flex items-center gap-2.5 shrink-0">
                        <div className="w-8 h-8 rounded-full bg-purple-500/20 text-purple-400 border border-purple-500/40 flex items-center justify-center font-bold text-xs shrink-0">
                          ✓
                        </div>
                        <div>
                          <div className="font-bold text-text-primary text-xs">Master Warehouse Hub</div>
                          <div className="text-[10px] text-emerald-400 font-bold">100% Loaded & Staged</div>
                        </div>
                      </div>

                      {/* Connected Transit Line */}
                      <div className={`h-0.5 flex-1 min-w-[32px] shrink-0 ${isDelivered ? 'bg-emerald-500' : 'bg-primary/60 border-t-2 border-dashed border-primary animate-pulse'}`}></div>

                      {/* Step 3: Truck In-Transit */}
                      <div className="flex items-center gap-2.5 shrink-0">
                        <div className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm shrink-0 shadow-sm ${
                          isDelivered
                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                            : 'bg-primary text-white shadow-primary/30 ring-4 ring-primary/20 animate-pulse'
                        }`}>
                          <FaTruck className="text-xs" />
                        </div>
                        <div>
                          <div className="font-black text-text-primary text-xs">
                            {isDelivered ? 'Highway Transit Complete' : 'Active Highway Transit'}
                          </div>
                          <div className="text-[10px] text-text-muted font-mono">
                            {isDelivered ? 'Arrived at Destination' : 'En Route to Project Site'}
                          </div>
                        </div>
                      </div>

                      {/* Connected Site Line */}
                      <div className={`h-0.5 flex-1 min-w-[32px] shrink-0 ${isDelivered ? 'bg-emerald-500' : 'bg-border'}`}></div>

                      {/* Step 4: Project Site Drop(s) */}
                      {plan.dropStops.map((d, dIdx) => (
                        <div key={d.epc_id} className="flex items-center gap-2.5 shrink-0">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${
                            isDelivered
                              ? 'bg-emerald-500 text-black font-black'
                              : d.slaStatus === 'red'
                              ? 'bg-rose-500/20 text-rose-400 border border-rose-500/50'
                              : 'bg-surface border-2 border-border text-text-muted'
                          }`}>
                            {isDelivered ? '✓' : d.stop_code}
                          </div>
                          <div>
                            <div className="font-bold text-text-primary text-xs">
                              {d.district} Project Site
                            </div>
                            <div className={`text-[10px] font-bold ${
                              isDelivered ? 'text-emerald-400' : d.slaStatus === 'red' ? 'text-rose-400' : 'text-text-muted'
                            }`}>
                              {isDelivered ? 'Handed Over' : d.slaText}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* 3. ASSIGNED DELIVERY FLEET SECTION (Multi-Vehicle Dispatch Switcher) */}
              <div className="p-6 bg-surface-hover/20 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-xl bg-primary/15 text-primary flex items-center justify-center font-bold text-xs shadow-2xs">
                      <FaTruck />
                    </div>
                    <div>
                      <h3 className="text-xs font-black uppercase tracking-wider text-text-primary">
                        Assigned Delivery Fleet ({plan.fleetVehicles.length} Trucks Dispatched)
                      </h3>
                      <p className="text-[10px] text-text-muted">
                        Click any vehicle card below to inspect its dedicated driver, cargo load, and assigned project site drop point.
                      </p>
                    </div>
                  </div>
                  {selectedFleetVehicleId !== 'all' && (
                    <button
                      type="button"
                      onClick={() => setSelectedFleetVehicleId('all')}
                      className="px-3 py-1 rounded-xl bg-surface hover:bg-surface-hover border border-border text-[11px] font-bold text-primary flex items-center gap-1.5 transition-all shadow-2xs cursor-pointer self-start sm:self-auto"
                    >
                      <FaLayerGroup className="text-xs" />
                      <span>View Consolidated Fleet (All Vehicles)</span>
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
                  {/* Card 0: Consolidated Fleet (All Vehicles) */}
                  <div
                    onClick={() => setSelectedFleetVehicleId('all')}
                    className={`p-4 rounded-2xl border transition-all cursor-pointer text-xs space-y-2 relative overflow-hidden ${
                      selectedFleetVehicleId === 'all'
                        ? 'bg-primary/10 border-primary ring-2 ring-primary/40 shadow-sm'
                        : 'bg-surface border-border hover:border-primary/40 hover:bg-surface-hover/60 shadow-2xs'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-primary/20 text-primary font-mono">
                        ALL FLEET VEHICLES
                      </span>
                      <span className="text-[10px] font-bold text-text-muted font-mono">
                        {plan.fleetVehicles.length} Trucks Combined
                      </span>
                    </div>

                    <div>
                      <div className="font-mono font-black text-text-primary text-sm flex items-center gap-1.5">
                        <FaLayerGroup className="text-primary text-xs" />
                        <span>Consolidated Route</span>
                      </div>
                      <div className="text-[11px] text-text-secondary mt-0.5">
                        Full journey manifest across all {plan.dropStops.length} EPC project drop point(s).
                      </div>
                    </div>

                    <div className="text-[10px] text-text-muted pt-2 border-t border-border/60 flex items-center justify-between">
                      <span>Combined Cargo Load:</span>
                      <strong className="text-primary font-mono font-black">{totalUnits} Total Units</strong>
                    </div>
                  </div>

                  {/* Cards for each vehicle in plan.fleetVehicles */}
                  {plan.fleetVehicles.map((veh, vIdx) => {
                    const isSelected = selectedFleetVehicleId === veh.vehicle_id;
                    return (
                      <div
                        key={veh.vehicle_id}
                        onClick={() => setSelectedFleetVehicleId(veh.vehicle_id)}
                        className={`p-4 rounded-2xl border transition-all cursor-pointer text-xs space-y-2 relative overflow-hidden ${
                          isSelected
                            ? 'bg-primary/10 border-primary ring-2 ring-primary/40 shadow-sm'
                            : 'bg-surface border-border hover:border-primary/40 hover:bg-surface-hover/60 shadow-2xs'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider font-mono ${
                            vIdx === 0 ? 'bg-blue-500/20 text-blue-400' : 'bg-emerald-500/20 text-emerald-400'
                          }`}>
                            VEHICLE #{vIdx + 1}
                          </span>
                          <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase flex items-center gap-1 ${
                            veh.slaStatus === 'red' ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40' : 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                          }`}>
                            {veh.slaStatus === 'red' ? <FaExclamationTriangle className="text-[8px]" /> : <FaCheck className="text-[8px]" />}
                            {veh.slaStatus === 'red' ? 'SLA Alert' : 'On Schedule'}
                          </span>
                        </div>

                        <div>
                          <div className="font-mono font-black text-text-primary text-base flex items-center gap-1.5">
                            <FaTruck className={isSelected ? 'text-primary' : 'text-text-muted'} />
                            <span>{veh.vehicle_number}</span>
                          </div>
                          <div className="text-[11px] text-text-secondary truncate font-medium mt-0.5">
                            {veh.vehicle_type}
                          </div>
                        </div>

                        <div className="p-2 rounded-xl bg-surface-hover/50 border border-border/60 text-[10px] space-y-1">
                          <div className="flex items-center justify-between text-text-muted">
                            <span className="font-bold text-text-primary">➔ Drops at:</span>
                            <span className="font-mono text-primary font-black">
                              Stop #{veh.assigned_drop_codes.join(', ')}
                            </span>
                          </div>
                          <div className="text-text-secondary font-medium truncate">
                            {veh.assigned_drops.map(d => `${d.epc_name || 'EPC'} (${d.district})`).join(' • ')}
                          </div>
                          <div className="text-text-muted truncate pt-0.5 border-t border-border/40">
                            Cargo: <strong className="text-text-primary">{veh.cargo_summary}</strong>
                          </div>
                        </div>

                        <div className="text-[10px] text-text-muted pt-1 border-t border-border/60 flex items-center justify-between">
                          <span>Driver: <strong className="text-text-primary">{veh.driver_name}</strong></span>
                          <strong className="text-purple-400 font-mono font-black">{veh.allocated_units} Units</strong>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* 4. LOGISTICS FLEET & CONSIGNMENT METADATA BAR (4 Neat, Equal Columns) */}
              <div className="p-6 bg-surface">
                {activeFleetVehicle && (
                  <div className="mb-4 p-3 rounded-xl bg-primary/10 border border-primary/30 flex items-center justify-between gap-2 text-xs">
                    <div className="flex items-center gap-2">
                      <FaTruck className="text-primary text-sm" />
                      <span className="font-bold text-text-primary">
                        Viewing Fleet Vehicle #{activeFleetVehicle.vehicle_id}: {activeFleetVehicle.vehicle_number} ({activeFleetVehicle.vehicle_type})
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSelectedFleetVehicleId('all')}
                      className="text-[11px] font-bold text-primary hover:underline cursor-pointer"
                    >
                      Reset to All Vehicles
                    </button>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
                  {/* Col 1: Vehicle & Driver */}
                  <div className="p-4 rounded-xl bg-surface-hover/50 border border-border/80 space-y-1.5">
                    <span className="text-[10px] font-black uppercase tracking-wider text-text-muted block">
                      {activeFleetVehicle ? `Selected Vehicle (#${activeFleetVehicle.vehicle_id})` : 'Primary Vehicle & Driver'}
                    </span>
                    <div className="font-mono font-black text-text-primary text-sm">
                      {activeFleetVehicle ? activeFleetVehicle.vehicle_number : (ord.transport_details?.vehicle_number || 'RJ-14-GA-9021')}
                    </div>
                    <div className="text-[11px] text-text-secondary truncate">
                      {activeFleetVehicle ? activeFleetVehicle.vehicle_type : (ord.transport_details?.vehicle_type || ord.required_vehicle || 'Container / Open Truck')}
                    </div>
                    <div className="text-[11px] text-text-muted pt-1.5 border-t border-border/60 flex items-center justify-between">
                      <span>Driver: <strong className="text-text-primary">{activeFleetVehicle ? activeFleetVehicle.driver_name : (ord.transport_details?.driver_name || 'Driver')}</strong></span>
                      {(activeFleetVehicle?.driver_mobile || ord.transport_details?.driver_mobile) && (
                        <a href={`tel:${activeFleetVehicle ? activeFleetVehicle.driver_mobile : ord.transport_details?.driver_mobile}`} className="text-primary font-mono font-bold hover:underline">
                          {activeFleetVehicle ? activeFleetVehicle.driver_mobile : ord.transport_details?.driver_mobile}
                        </a>
                      )}
                    </div>
                  </div>

                  {/* Col 2: Transporter & Docket */}
                  <div className="p-4 rounded-xl bg-surface-hover/50 border border-border/80 space-y-1.5">
                    <span className="text-[10px] font-black uppercase tracking-wider text-text-muted block">Transporter & Docket</span>
                    <div className="font-bold text-text-primary text-sm truncate">
                      {activeFleetVehicle ? activeFleetVehicle.transporter_name : (ord.transport_details?.transporter_name || 'Direct Transport / VRL Logistics')}
                    </div>
                    <div className="text-[11px] text-text-muted font-mono truncate">
                      Docket: {activeFleetVehicle ? activeFleetVehicle.docket_number : (ord.transport_details?.docket_number || 'DKT-2026-9921')}
                    </div>
                    <div className="text-[11px] text-primary font-mono font-bold pt-1.5 border-t border-border/60 flex items-center justify-between">
                      <span>E-Way Bill:</span>
                      <span>#{activeFleetVehicle ? activeFleetVehicle.eway_bill : (ord.eway_bill?.eway_bill_number || '281254377587')}</span>
                    </div>
                  </div>

                  {/* Col 3: Consignment Allocation */}
                  <div className="p-4 rounded-xl bg-surface-hover/50 border border-border/80 space-y-1.5">
                    <span className="text-[10px] font-black uppercase tracking-wider text-text-muted block">
                      {activeFleetVehicle ? 'Vehicle Cargo & Load' : 'Total Fleet Equipment Load'}
                    </span>
                    <div className="font-bold text-purple-400 text-sm font-mono truncate">
                      {activeFleetVehicle ? `${activeFleetVehicle.allocated_units} Units Loaded` : `${totalUnits} Units Loaded`}
                    </div>
                    <div className="text-[11px] text-text-secondary truncate">
                      {activeFleetVehicle
                        ? activeFleetVehicle.cargo_summary
                        : `${plan.dropStops.length} EPC Project Drop${plan.dropStops.length > 1 ? 's' : ''} (${ord.items?.length || 0} SKUs)`}
                    </div>
                    <div className="text-[11px] text-text-muted pt-1.5 border-t border-border/60 flex items-center justify-between">
                      <span>Drop Destination:</span>
                      <strong className="text-text-primary font-mono">
                        {activeFleetVehicle ? `Stop #${activeFleetVehicle.assigned_drop_codes.join(', ')}` : `${plan.totalStops} Scheduled Stops`}
                      </strong>
                    </div>
                  </div>

                  {/* Col 4: Dispatch & Destination */}
                  <div className="p-4 rounded-xl bg-surface-hover/50 border border-border/80 space-y-1.5">
                    <span className="text-[10px] font-black uppercase tracking-wider text-text-muted block">Destination & Timeline</span>
                    <div className="font-bold text-text-primary text-sm truncate">
                      {activeFleetVehicle
                        ? activeFleetVehicle.assigned_drops.map(d => `${d.district}, ${d.state}`).join(' | ')
                        : `${ord.destination?.district || 'Site Location'}, ${ord.destination?.state || 'India'}`}
                    </div>
                    <div className="text-[11px] text-text-secondary">
                      ETA: <strong className="text-text-primary">
                        {activeFleetVehicle?.expected_delivery_date
                          ? new Date(activeFleetVehicle.expected_delivery_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })
                          : (ord.transport_details?.expected_delivery_date ? new Date(ord.transport_details.expected_delivery_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }) : '02 Nov 2026')}
                      </strong>
                    </div>
                    <div className="text-[11px] text-text-muted pt-1.5 border-t border-border/60 flex items-center justify-between">
                      <span>Status:</span>
                      <strong className={`font-mono ${activeFleetVehicle?.slaStatus === 'red' ? 'text-rose-400' : 'text-emerald-400'}`}>
                        {activeFleetVehicle ? (activeFleetVehicle.slaStatus === 'red' ? 'Overdue SLA' : 'On Schedule') : (plan.orderSlaStatus === 'red' ? 'Overdue SLA' : 'On Schedule')}
                      </strong>
                    </div>
                  </div>
                </div>
              </div>

              {/* 5. SEQUENTIAL STOPS SECTION (Neat, balanced stop cards inside the master container) */}
              <div className="p-6 bg-surface space-y-5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-primary"></span>
                    <h3 className="text-xs font-black uppercase tracking-wider text-text-primary">
                      Multi-Stop Logistics Route Manifest ({plan.totalStops} Stops)
                    </h3>
                  </div>
                  <span className="text-xs text-text-muted font-mono">
                    All stops sequence mapped under e-way bill declaration
                  </span>
                </div>

                {/* Filter notice if a single fleet vehicle is selected */}
                {activeFleetVehicle && (
                  <div className="p-3.5 rounded-xl bg-primary/10 border border-primary/30 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                    <div className="flex items-center gap-2">
                      <FaTruck className="text-primary text-sm shrink-0" />
                      <div>
                        <span className="font-bold text-text-primary">
                          Displaying Route & Manifest for Vehicle {activeFleetVehicle.vehicle_number} ({activeFleetVehicle.driver_name})
                        </span>
                        <span className="text-text-muted ml-1">
                          • Assigned Drop: <strong>Stop #{activeFleetVehicle.assigned_drop_codes.join(', ')}</strong> • Cargo: <strong>{activeFleetVehicle.cargo_summary}</strong>
                        </span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSelectedFleetVehicleId('all')}
                      className="px-3 py-1 rounded-lg bg-surface border border-border text-[11px] font-bold text-primary hover:bg-surface-hover cursor-pointer self-start sm:self-auto shadow-2xs"
                    >
                      Show All Route Stops
                    </button>
                  </div>
                )}

                <div className="space-y-4">
                  {/* A. OEM Vendor Pickups (Only if any exist) */}
                  {plan.vendorPickups.map((p) => (
                    <div
                      key={p.key}
                      className="p-4 rounded-xl border border-amber-500/40 bg-amber-500/5 flex flex-col md:flex-row md:items-center justify-between gap-4 text-xs"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded bg-amber-400 text-black font-black text-[10px] uppercase font-mono">
                            {p.badge_title}
                          </span>
                          <span className="font-bold text-text-primary text-xs">{p.supplierName}</span>
                          <span className="text-[10px] text-emerald-400 font-bold bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
                            ✓ 100% Loaded
                          </span>
                        </div>
                        <p className="text-[11px] text-text-secondary">{p.locationName} • {p.address}</p>
                        <div className="text-[10px] text-text-muted flex items-center gap-3">
                          <span>Dispatch Desk: <strong>{p.contactPerson}</strong></span>
                          <span>Phone: <strong className="text-primary">{p.phone}</strong></span>
                        </div>
                      </div>

                      <div className="shrink-0 flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setSelectedStopForDetails({ ...p, colorTheme: 'amber' })}
                          className="px-3.5 py-2 rounded-xl bg-surface hover:bg-surface-hover border border-amber-500/40 text-amber-300 font-bold text-xs flex items-center gap-1.5 cursor-pointer transition-all shadow-2xs"
                        >
                          <HiOutlineEye className="text-sm" />
                          <span>View Pickup Items</span>
                        </button>
                      </div>
                    </div>
                  ))}

                  {/* B. Master Warehouse Consolidation Hub */}
                  <div className="p-4 rounded-xl border border-purple-500/40 bg-purple-500/5 flex flex-col md:flex-row md:items-center justify-between gap-4 text-xs">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded bg-purple-600 text-white font-black text-[10px] uppercase font-mono">
                          {plan.warehouseStop.badge_title}
                        </span>
                        <span className="font-bold text-text-primary text-xs">{plan.warehouseStop.warehouse_name}</span>
                        <span className="text-[10px] text-emerald-400 font-bold bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
                          ✓ Staged & Dispatched
                        </span>
                      </div>
                      <p className="text-[11px] text-text-secondary">
                        {plan.warehouseStop.locationName} • {plan.warehouseStop.address}
                      </p>
                      <div className="text-[10px] text-text-muted flex items-center gap-4">
                        <span>Rack Bay: <strong className="text-purple-400 font-mono">{plan.warehouseStop.storageRack}</strong></span>
                        <span>Warehouse Incharge: <strong>{plan.warehouseStop.contactPerson}</strong> ({plan.warehouseStop.phone})</span>
                      </div>
                    </div>

                    <div className="shrink-0 flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setSelectedStopForDetails({
                          ...plan.warehouseStop,
                          supplierName: plan.warehouseStop.warehouse_name,
                          colorTheme: 'purple'
                        })}
                        className="px-3.5 py-2 rounded-xl bg-surface hover:bg-surface-hover border border-purple-500/40 text-purple-300 font-bold text-xs flex items-center gap-1.5 cursor-pointer transition-all shadow-2xs"
                      >
                        <HiOutlineEye className="text-sm" />
                        <span>View Warehouse BOS Kits</span>
                      </button>
                    </div>
                  </div>

                  {/* C. Project Site Drop(s) */}
                  {plan.dropStops.map((d) => (
                    <div
                      key={d.stop_key}
                      className={`p-4 rounded-xl border transition-all space-y-3 ${
                        d.slaStatus === 'red'
                          ? 'border-rose-500/50 bg-rose-500/5'
                          : d.slaStatus === 'orange'
                          ? 'border-amber-500/50 bg-amber-500/5'
                          : 'border-emerald-500/50 bg-emerald-500/5'
                      }`}
                    >
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="px-2 py-0.5 rounded bg-emerald-600 text-white font-black text-[10px] uppercase font-mono">
                              {d.badge_title}
                            </span>
                            <span className="font-mono text-xs font-bold text-primary bg-surface px-1.5 py-0.5 rounded border border-border">
                              {d.tracking_consignment_id}
                            </span>
                            <span className="font-bold text-text-primary text-xs">{d.epc_name}</span>

                            {/* Fleet Vehicle Assignment Tag */}
                            {activeFleetVehicle && (
                              activeFleetVehicle.assigned_drop_codes.includes(d.stop_code) ? (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-primary/20 text-primary border border-primary/40 flex items-center gap-1 font-mono">
                                  <FaTruck className="text-[9px]" /> On Selected Truck #{activeFleetVehicle.vehicle_number}
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-surface-hover text-text-muted border border-border flex items-center gap-1 font-mono">
                                  <FaTruck className="text-[9px]" /> On Other Vehicle
                                </span>
                              )
                            )}

                            {/* SLA Badge */}
                            {d.slaStatus === 'red' ? (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-rose-500 text-white flex items-center gap-1 shadow-xs">
                                <FaExclamationTriangle className="text-[9px]" /> {d.slaLabel}
                              </span>
                            ) : d.slaStatus === 'orange' ? (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-amber-500 text-black flex items-center gap-1 shadow-xs">
                                <HiOutlineClock className="text-[10px]" /> {d.slaLabel}
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-emerald-500 text-black flex items-center gap-1 shadow-xs">
                                <FaCheck className="text-[9px]" /> {d.slaLabel}
                              </span>
                            )}
                          </div>

                          <p className="text-[11px] text-text-secondary">
                            {d.site_address}, {d.district}, {d.state} {d.pincode ? `- ${d.pincode}` : ''}
                          </p>

                          <div className="text-[10px] text-text-muted flex items-center gap-4">
                            <span>Site Incharge: <strong>{d.contact_person}</strong> ({d.contact_phone})</span>
                            <span>Allocated: <strong className="text-emerald-400 font-mono">{d.allocated_summary}</strong></span>
                          </div>
                        </div>

                        <div className="shrink-0 flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setSelectedStopForDetails({
                              ...d,
                              supplierName: d.epc_name,
                              locationName: `${d.district}, ${d.state}`,
                              address: d.site_address,
                              contactPerson: d.contact_person,
                              phone: d.contact_phone,
                              colorTheme: 'emerald'
                            })}
                            className="px-3.5 py-2 rounded-xl bg-surface hover:bg-surface-hover border border-emerald-500/40 text-emerald-300 font-bold text-xs flex items-center gap-1.5 cursor-pointer transition-all shadow-2xs"
                          >
                            <HiOutlineEye className="text-sm" />
                            <span>View Site Equipment</span>
                          </button>
                        </div>
                      </div>

                      {/* Overdue Delay Reason Handler (When Red) */}
                      {d.slaStatus === 'red' && (
                        <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <div className="space-y-0.5">
                            <div className="font-bold text-rose-300 flex items-center gap-1.5 text-[11px]">
                              <FaExclamationTriangle />
                              <span>Overdue Audit: Driver Delay Reason</span>
                            </div>
                            {d.recordedDelay ? (
                              <div className="text-[11px] text-rose-200">
                                Reason: <strong className="text-white">{d.recordedDelay.reason}</strong>
                                {d.recordedDelay.notes && <span className="italic ml-1">("{d.recordedDelay.notes}")</span>}
                              </div>
                            ) : (
                              <div className="text-[10px] text-rose-300/80">
                                Delivery ETA was {new Date(d.expected_delivery_date).toLocaleDateString()}. Please record reason for driver delay.
                              </div>
                            )}
                          </div>

                          <button
                            type="button"
                            onClick={() => handleOpenDelayModal(d, ord)}
                            className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs cursor-pointer shadow-xs shrink-0 self-start sm:self-auto"
                          >
                            {d.recordedDelay ? 'Edit Delay Reason' : 'Select Driver Reason'}
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* 5. SLA POLICY FOOTER BANNER */}
              <div className="p-4 bg-surface-hover/30 text-[11px] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-text-muted">
                <div className="flex items-center gap-2">
                  <FaInfoCircle className="text-primary shrink-0" />
                  <span>SLA Policy: 🟢 Green (&gt; 24h On-Time) • 🟠 Orange (&lt; 24h Due Today) • 🔴 Red (Overdue with driver delay audit)</span>
                </div>
                <div className="font-mono">
                  SolarKits Logistics Hub v2.0
                </div>
              </div>
            </div>
          </div>
        );
      })() : (
        /* ═══════════════════════════════════════════════════════════════
            VIEW A: ALL ACTIVE DELIVERY ORDERS CARDS
            (Clean overview without dropdown accordion. Clicking button
             navigates to the dedicated full-page view above)
            ═══════════════════════════════════════════════════════════════ */
        <div className="space-y-5">
          {/* ═══════════════════════════════════════════════════════════════
              TOP KPI NUMBERING & FILTER CARDS (Like Accounts Purchase Orders)
              Interactive filter cards for Total, In-Transit, On-Time, Overdue, Delivered
              ═══════════════════════════════════════════════════════════════ */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
            {/* Card 1: Total Orders */}
            <button
              type="button"
              onClick={() => setStatusFilter('all')}
              className={`p-4 rounded-2xl border transition-all text-left flex flex-col justify-between cursor-pointer group ${
                statusFilter === 'all'
                  ? 'bg-blue-500/10 border-blue-500 ring-2 ring-blue-500/30 shadow-sm'
                  : 'bg-surface border-border hover:border-blue-500/40 hover:bg-surface-hover/60 shadow-2xs'
              }`}
            >
              <div className="flex items-center justify-between w-full">
                <div className="w-10 h-10 rounded-xl bg-blue-500/15 text-blue-500 flex items-center justify-center text-lg">
                  <FaBoxes />
                </div>
                {statusFilter === 'all' && (
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-500 ring-4 ring-blue-500/20"></span>
                )}
              </div>
              <div className="mt-3">
                <div className="text-2xl lg:text-3xl font-black font-mono tracking-tight text-text-primary">
                  {kpiStats.total}
                </div>
                <div className="text-[11px] font-black uppercase tracking-wider text-text-muted mt-0.5">
                  TOTAL DISPATCHED
                </div>
                <div className="text-[10px] text-text-secondary">
                  All Active Logistics
                </div>
              </div>
            </button>

            {/* Card 2: In-Transit */}
            <button
              type="button"
              onClick={() => setStatusFilter(statusFilter === 'in_transit' ? 'all' : 'in_transit')}
              className={`p-4 rounded-2xl border transition-all text-left flex flex-col justify-between cursor-pointer group ${
                statusFilter === 'in_transit'
                  ? 'bg-amber-500/10 border-amber-500 ring-2 ring-amber-500/30 shadow-sm'
                  : 'bg-surface border-border hover:border-amber-500/40 hover:bg-surface-hover/60 shadow-2xs'
              }`}
            >
              <div className="flex items-center justify-between w-full">
                <div className="w-10 h-10 rounded-xl bg-amber-500/15 text-amber-500 flex items-center justify-center text-lg">
                  <FaTruck />
                </div>
                {statusFilter === 'in_transit' && (
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500 ring-4 ring-amber-500/20 animate-pulse"></span>
                )}
              </div>
              <div className="mt-3">
                <div className="text-2xl lg:text-3xl font-black font-mono tracking-tight text-amber-400">
                  {kpiStats.in_transit}
                </div>
                <div className="text-[11px] font-black uppercase tracking-wider text-text-muted mt-0.5">
                  IN-TRANSIT SUPPLY
                </div>
                <div className="text-[10px] text-text-secondary">
                  En Route Highway Fleet
                </div>
              </div>
            </button>

            {/* Card 3: On-Time */}
            <button
              type="button"
              onClick={() => setStatusFilter(statusFilter === 'on_time' ? 'all' : 'on_time')}
              className={`p-4 rounded-2xl border transition-all text-left flex flex-col justify-between cursor-pointer group ${
                statusFilter === 'on_time'
                  ? 'bg-emerald-500/10 border-emerald-500 ring-2 ring-emerald-500/30 shadow-sm'
                  : 'bg-surface border-border hover:border-emerald-500/40 hover:bg-surface-hover/60 shadow-2xs'
              }`}
            >
              <div className="flex items-center justify-between w-full">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/15 text-emerald-500 flex items-center justify-center text-lg">
                  <FaCheckCircle />
                </div>
                {statusFilter === 'on_time' && (
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 ring-4 ring-emerald-500/20"></span>
                )}
              </div>
              <div className="mt-3">
                <div className="text-2xl lg:text-3xl font-black font-mono tracking-tight text-emerald-400">
                  {kpiStats.on_time}
                </div>
                <div className="text-[11px] font-black uppercase tracking-wider text-text-muted mt-0.5">
                  ON-TIME SLA
                </div>
                <div className="text-[10px] text-text-secondary">
                  Due Within Target
                </div>
              </div>
            </button>

            {/* Card 4: Overdue Alert */}
            <button
              type="button"
              onClick={() => setStatusFilter(statusFilter === 'overdue' ? 'all' : 'overdue')}
              className={`p-4 rounded-2xl border transition-all text-left flex flex-col justify-between cursor-pointer group ${
                statusFilter === 'overdue'
                  ? 'bg-rose-500/10 border-rose-500 ring-2 ring-rose-500/30 shadow-sm'
                  : 'bg-surface border-border hover:border-rose-500/40 hover:bg-surface-hover/60 shadow-2xs'
              }`}
            >
              <div className="flex items-center justify-between w-full">
                <div className="w-10 h-10 rounded-xl bg-rose-500/15 text-rose-500 flex items-center justify-center text-lg">
                  <FaExclamationTriangle />
                </div>
                {statusFilter === 'overdue' && (
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500 ring-4 ring-rose-500/20 animate-pulse"></span>
                )}
              </div>
              <div className="mt-3">
                <div className="text-2xl lg:text-3xl font-black font-mono tracking-tight text-rose-400">
                  {kpiStats.overdue}
                </div>
                <div className="text-[11px] font-black uppercase tracking-wider text-rose-400 font-extrabold mt-0.5">
                  OVERDUE TIMELINE
                </div>
                <div className="text-[10px] text-text-secondary">
                  Action / Driver Audit
                </div>
              </div>
            </button>

            {/* Card 5: Delivered */}
            <button
              type="button"
              onClick={() => setStatusFilter(statusFilter === 'delivered' ? 'all' : 'delivered')}
              className={`p-4 rounded-2xl border transition-all text-left flex flex-col justify-between cursor-pointer group col-span-2 sm:col-span-1 ${
                statusFilter === 'delivered'
                  ? 'bg-teal-500/10 border-teal-500 ring-2 ring-teal-500/30 shadow-sm'
                  : 'bg-surface border-border hover:border-teal-500/40 hover:bg-surface-hover/60 shadow-2xs'
              }`}
            >
              <div className="flex items-center justify-between w-full">
                <div className="w-10 h-10 rounded-xl bg-teal-500/15 text-teal-500 flex items-center justify-center text-lg">
                  <FaCheckDouble />
                </div>
                {statusFilter === 'delivered' && (
                  <span className="w-2.5 h-2.5 rounded-full bg-teal-500 ring-4 ring-teal-500/20"></span>
                )}
              </div>
              <div className="mt-3">
                <div className="text-2xl lg:text-3xl font-black font-mono tracking-tight text-teal-400">
                  {kpiStats.delivered}
                </div>
                <div className="text-[11px] font-black uppercase tracking-wider text-text-muted mt-0.5">
                  DELIVERED & POD
                </div>
                <div className="text-[10px] text-text-secondary">
                  Destination Verified
                </div>
              </div>
            </button>
          </div>

          {/* Search, Active Filter Pill & Refresh Toolbar */}
          <div className="bg-surface border border-border p-3.5 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
            <div className="flex items-center gap-2 flex-1 max-w-md">
              <div className="relative w-full">
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search Order #, Vehicle #, Transporter, EPC Name or District..."
                  className="w-full pl-9 pr-7 py-2 bg-surface-hover/60 border border-border rounded-xl text-xs text-text-primary focus:outline-none focus:border-primary placeholder:text-text-muted"
                />
                <HiOutlineLocationMarker className="absolute left-3 top-2.5 text-text-muted text-sm" />
                {search && (
                  <button
                    type="button"
                    onClick={() => setSearch('')}
                    className="absolute right-3 top-2.5 text-text-muted hover:text-text-primary text-xs cursor-pointer"
                  >
                    ×
                  </button>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap justify-between sm:justify-end">
              {statusFilter !== 'all' && (
                <span className="px-2.5 py-1 rounded-xl text-[11px] font-bold bg-primary/10 border border-primary/30 text-primary flex items-center gap-1.5 shadow-2xs">
                  <span>Filter: <strong>{statusFilter.replace('_', ' ').toUpperCase()}</strong> ({filteredOrders.length})</span>
                  <button
                    type="button"
                    onClick={() => setStatusFilter('all')}
                    className="hover:text-rose-400 font-bold ml-1 cursor-pointer"
                  >
                    ✕
                  </button>
                </span>
              )}

              <button
                onClick={fetchDispatchedOrders}
                disabled={loading}
                className="px-3.5 py-2 rounded-xl bg-surface-hover hover:bg-surface border border-border text-text-secondary hover:text-text-primary text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs"
              >
                <HiOutlineRefresh className={`text-sm ${loading ? 'animate-spin text-primary' : ''}`} />
                <span>Refresh Tracking</span>
              </button>
            </div>
          </div>

          {loading ? (
            <div className="p-12 text-center text-text-muted space-y-3 bg-surface border border-border rounded-2xl">
              <FaSpinner className="animate-spin text-3xl text-primary mx-auto" />
              <div className="text-sm font-bold text-text-primary">Loading Dispatched Deliveries...</div>
            </div>
          ) : filteredOrders.length === 0 ? (
            <div className="p-12 text-center text-text-muted space-y-3 bg-surface border border-border rounded-2xl">
              <FaTruck className="text-4xl text-text-muted opacity-30 mx-auto" />
              <div className="text-base font-bold text-text-primary">No Deliveries in This Category</div>
              <div className="text-xs max-w-md mx-auto">
                Dispatched orders from <strong>Customer Outward</strong> appear here for real-time tracking and delivery completion.
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-5">
              {filteredOrders.map((ord) => {
                const isDelivered = ord.delivery_status === 'delivered';
                const isInTransit = ord.delivery_status === 'in_transit';
                const isManualMethod = ord.delivery_method === 'manual';
                const plan = getRoutePlan(ord);
                const totalUnits = (ord.items || []).reduce((acc, it) => acc + (it.ordered_qty || 0), 0);

                return (
                  <div
                    key={ord._id}
                    className={`card p-5 rounded-2xl border transition-all ${
                      isDelivered
                        ? 'border-success/30 bg-surface'
                        : plan.orderSlaStatus === 'red'
                        ? 'border-rose-500/50 bg-rose-500/5 ring-1 ring-rose-500/20'
                        : plan.orderSlaStatus === 'orange'
                        ? 'border-amber-500/50 bg-amber-500/5 ring-1 ring-amber-500/20'
                        : 'border-border bg-surface hover:border-primary/40 shadow-xs'
                    }`}
                  >
                    {/* Header Row */}
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-border/70">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-base font-black text-text-primary">
                          {ord.delivery_order_id || `DEL-${ord.order_number}`}
                        </span>
                        <span className="text-xs text-text-muted font-bold font-mono">
                          • Order #{ord.order_number}
                        </span>

                        {/* Status Tag */}
                        {isDelivered ? (
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-success/15 text-success border border-success/30 flex items-center gap-1">
                            <FaCheckCircle className="text-xs" /> Delivered
                          </span>
                        ) : isInTransit ? (
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-warning/15 text-warning border border-warning/30 flex items-center gap-1 animate-pulse">
                            <FaTruck className="text-xs" /> In Transit
                          </span>
                        ) : (
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-surface-hover text-text-secondary border border-border">
                            {ord.delivery_status.replace(/_/g, ' ')}
                          </span>
                        )}

                        {/* Method Tag */}
                        <span className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-surface-hover border border-border text-text-muted uppercase">
                          {isManualMethod ? 'Manual (Photo POD)' : 'Auto (Customer OTP)'}
                        </span>

                        {/* SLA Warning Pill */}
                        {plan.orderSlaStatus === 'red' ? (
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-rose-500/20 text-rose-400 border border-rose-500/40 flex items-center gap-1 shadow-2xs">
                            <FaExclamationTriangle className="text-[10px]" /> SLA Alert: Drop Overdue
                          </span>
                        ) : plan.orderSlaStatus === 'orange' ? (
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-amber-500/20 text-amber-400 border border-amber-500/40 flex items-center gap-1 shadow-2xs">
                            <HiOutlineClock className="text-[11px]" /> Approaching Deadline (&lt; 24h)
                          </span>
                        ) : (
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/25 flex items-center gap-1">
                            <FaCheck className="text-[9px]" /> On Schedule
                          </span>
                        )}
                      </div>

                      {/* Right Handover Buttons */}
                      <div className="flex items-center gap-2 self-start md:self-auto">
                        {isInTransit && (
                          <>
                            {isManualMethod ? (
                              <button
                                type="button"
                                onClick={() => handleOpenManualModal(ord)}
                                className="gradient-primary text-white px-3.5 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-1.5 shadow-xs hover:opacity-95 active:scale-95 cursor-pointer"
                              >
                                <HiOutlinePhotograph className="text-sm" />
                                <span>Complete Delivery</span>
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleOpenOtpModal(ord)}
                                className="bg-primary text-white px-3.5 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-1.5 shadow-xs hover:bg-primary/90 active:scale-95 cursor-pointer"
                              >
                                <FaKey className="text-xs" />
                                <span>Verify OTP</span>
                              </button>
                            )}
                          </>
                        )}

                        {isDelivered && (
                          <span className="px-3 py-1 rounded-xl text-xs font-black bg-success text-white flex items-center gap-1.5 shadow-xs">
                            <HiOutlineCheckCircle className="text-base" /> Delivered
                          </span>
                        )}

                        <button
                          type="button"
                          onClick={() => {
                            setSelectedOrderForManifest(ord);
                            setManifestModalOpen(true);
                          }}
                          className="px-3 py-1.5 rounded-xl bg-surface-hover hover:bg-surface border border-border text-[11px] font-bold text-text-secondary hover:text-text-primary transition-all flex items-center gap-1.5 cursor-pointer"
                        >
                          <HiOutlineDocumentText className="text-sm text-primary" />
                          <span>Manifest</span>
                        </button>
                      </div>
                    </div>

                    {/* Compact 3-Column Info Strip */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs my-3">
                      {/* Col 1: Vehicle & Driver */}
                      <div className="p-3 rounded-xl bg-surface-hover/60 border border-border/70 space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-black uppercase tracking-wider text-text-muted">
                            {plan.fleetVehicles.length > 1 ? `Fleet (${plan.fleetVehicles.length} Trucks)` : 'Vehicle & Driver'}
                          </span>
                          <span className="text-[10px] font-bold text-primary font-mono">{ord.transport_details?.vehicle_type || ord.required_vehicle || 'Container Truck'}</span>
                        </div>
                        <div className="font-mono font-black text-text-primary text-sm flex items-center gap-1.5">
                          <span>{ord.transport_details?.vehicle_number || plan.fleetVehicles[0]?.vehicle_number || 'RJ-14-GA-9021'}</span>
                          {plan.fleetVehicles.length > 1 && (
                            <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-blue-500/20 text-blue-400 border border-blue-500/30 font-bold">
                              +{plan.fleetVehicles.length - 1} more
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-text-secondary flex items-center justify-between">
                          <span>Driver: <strong className="text-text-primary">{ord.transport_details?.driver_name || 'Driver Assigned'}</strong></span>
                          {ord.transport_details?.driver_mobile && (
                            <a href={`tel:${ord.transport_details.driver_mobile}`} className="text-primary font-mono font-bold hover:underline">
                              {ord.transport_details.driver_mobile}
                            </a>
                          )}
                        </div>
                      </div>

                      {/* Col 2: Multi-EPC Consolidations (Confidential summary without exposing customer company names) */}
                      <div className="p-3 rounded-xl bg-surface-hover/60 border border-border/70 space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-black uppercase tracking-wider text-text-muted">EPC Consolidations</span>
                          <span className="text-[10px] font-bold text-purple-400 bg-purple-500/10 px-1.5 py-0.5 rounded border border-purple-500/20 font-mono">
                            {plan.dropStops.length} EPC Project Drop{plan.dropStops.length > 1 ? 's' : ''}
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-1 pt-0.5">
                          {plan.dropStops.map((d, dIdx) => (
                            <span key={dIdx} className="px-2 py-0.5 rounded-md bg-surface border border-border text-[10px] font-mono font-bold text-text-primary shadow-2xs">
                              #{d.tracking_consignment_id.split('-').slice(-2).join('-') || d.epc_order_number}
                            </span>
                          ))}
                        </div>
                        <div className="text-[10px] text-text-muted pt-0.5">
                          Total Load: <strong className="text-text-primary font-mono">{totalUnits} Units</strong> across {ord.items?.length || 0} line items
                        </div>
                      </div>

                      {/* Col 3: Route Overview & Expected Delivery */}
                      <div className="p-3 rounded-xl bg-surface-hover/60 border border-border/70 space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-black uppercase tracking-wider text-text-muted">Logistics Route Leg</span>
                          <span className="text-[10px] font-bold text-text-secondary font-mono">{plan.totalStops} Total Stops</span>
                        </div>
                        <div className="text-xs font-bold text-text-primary flex items-center gap-1.5 flex-wrap">
                          <span className="text-amber-400">{plan.vendorPickups.length} Pickups</span>
                          <span className="text-text-muted">➔</span>
                          <span className="text-purple-400">1 WH Hub</span>
                          <span className="text-text-muted">➔</span>
                          <span className="text-emerald-400">{plan.dropStops.length} Site Drops</span>
                        </div>
                        <div className="text-[10px] text-text-muted flex items-center justify-between pt-0.5">
                          <span>ETA: <strong className="text-text-primary">{ord.transport_details?.expected_delivery_date ? new Date(ord.transport_details.expected_delivery_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '02 Nov 2026'}</strong></span>
                          <span className="font-mono text-text-secondary">{ord.destination?.district || 'Jaipur'}, {ord.destination?.state || 'RJ'}</span>
                        </div>
                      </div>
                    </div>

                    {/* Dedicated Page Navigation Button (NO ACCORDION/DROPDOWN!) */}
                    <div className="pt-2">
                      <button
                        type="button"
                        onClick={() => handleOpenOrderTracking(ord._id)}
                        className="w-full py-3 px-4 rounded-xl text-xs font-black uppercase tracking-wider bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-md shadow-blue-500/20 flex items-center justify-center gap-2 cursor-pointer transition-all hover:scale-[1.01] active:scale-95"
                      >
                        <FaRoute className="text-sm" />
                        <span>📍 Track Delivery Order & Multi-Stop Route (Open Details Page) →</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════
          MODAL 1: STOP DETAILS MODAL
          Itemized component list, quantities, and EPC mapping
          ═══════════════════════════════════════════════════════════════ */}
      <Dialog
        isOpen={!!selectedStopForDetails}
        onClose={() => setSelectedStopForDetails(null)}
        title={selectedStopForDetails?.badge_title || 'Stop Details & Equipment Manifest'}
        size="lg"
      >
        {selectedStopForDetails && (
          <div className="space-y-4 p-1 text-xs">
            {/* Header snapshot */}
            <div className={`p-4 rounded-xl border space-y-2 ${
              selectedStopForDetails.colorTheme === 'amber'
                ? 'bg-amber-500/10 border-amber-500/30'
                : selectedStopForDetails.colorTheme === 'purple'
                ? 'bg-purple-500/10 border-purple-500/30'
                : 'bg-emerald-500/10 border-emerald-500/30'
            }`}>
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs font-black uppercase text-text-primary">
                  {selectedStopForDetails.badge_title}
                </span>
                <span className="font-mono text-[10px] font-bold text-primary bg-surface px-2 py-0.5 rounded border border-border">
                  Stop #{selectedStopForDetails.stop_code}
                </span>
              </div>
              <h4 className="text-sm font-black text-text-primary">{selectedStopForDetails.supplierName || selectedStopForDetails.epc_name}</h4>
              <p className="text-[11px] text-text-secondary">{selectedStopForDetails.locationName} • {selectedStopForDetails.address}</p>
              <div className="text-[10px] text-text-muted pt-1 border-t border-border/50 flex items-center justify-between">
                <span>Contact Officer / Incharge: <strong>{selectedStopForDetails.contactPerson}</strong></span>
                {selectedStopForDetails.phone && (
                  <a href={`tel:${selectedStopForDetails.phone}`} className="text-primary font-bold hover:underline">
                    {selectedStopForDetails.phone}
                  </a>
                )}
              </div>
            </div>

            {/* Itemized Table */}
            <div className="space-y-2">
              <span className="text-[10px] font-black uppercase text-text-muted tracking-wider block">
                Itemized Equipment Breakdown & EPC Mapping:
              </span>

              <div className="border border-border rounded-xl overflow-hidden bg-surface max-h-64 overflow-y-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-surface-hover border-b border-border text-[10px] font-black uppercase text-text-muted sticky top-0">
                    <tr>
                      <th className="p-2.5">Component / Product Name</th>
                      <th className="p-2.5">SKU Code</th>
                      <th className="p-2.5 text-center">Quantity</th>
                      <th className="p-2.5 text-right">EPC Project Allocation</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {(selectedStopForDetails.items || []).map((it, idx) => (
                      <tr key={idx} className="hover:bg-surface-hover/40">
                        <td className="p-2.5 font-bold text-text-primary text-[11px]">{it.product_name || it.item_name}</td>
                        <td className="p-2.5 font-mono text-[10px] text-text-muted">{it.sku || it.part_number || '-'}</td>
                        <td className="p-2.5 font-mono font-bold text-center text-primary">{it.ordered_qty || it.quantity || 1} Units</td>
                        <td className="p-2.5 text-right font-medium text-text-secondary text-[11px]">
                          {it.allocation || selectedStopForDetails.epc_name || 'Consolidated Order'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setSelectedStopForDetails(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-surface-hover border border-border text-text-primary cursor-pointer hover:bg-surface"
              >
                Close Details
              </button>
            </div>
          </div>
        )}
      </Dialog>

      {/* ═══════════════════════════════════════════════════════════════
          MODAL 2: DRIVER DELAY REASON SELECTOR MODAL
          ═══════════════════════════════════════════════════════════════ */}
      <Dialog
        isOpen={delayModalOpen}
        onClose={() => setDelayModalOpen(false)}
        title="Record Driver Delay Reason (SLA Overdue)"
        size="md"
      >
        {selectedDropForDelay && (
          <form onSubmit={handleSaveDelayReason} className="space-y-4 p-1 text-xs">
            <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl space-y-1">
              <div className="font-bold text-rose-300">
                Stop #{selectedDropForDelay.stop_code}: {selectedDropForDelay.epc_name} ({selectedDropForDelay.district})
              </div>
              <div className="text-[11px] text-rose-200">
                Scheduled ETA was <strong>{new Date(selectedDropForDelay.expected_delivery_date).toLocaleDateString()}</strong>. Reason is required for audit.
              </div>
            </div>

            {/* Predefined Reasons Radio / Select */}
            <div className="space-y-2">
              <label className="font-bold text-text-primary block">
                Select Cause of Route Delay *
              </label>

              <div className="space-y-1.5">
                {[
                  'Vehicle Breakdown / Puncture / Mechanical Failure',
                  'Severe Highway Traffic Jam / Road Blockage',
                  'Extreme Weather Conditions / Heavy Rain / Waterlogging',
                  'Highway Route Diversion / Road Construction',
                  'Commercial Tax / RTO / Toll Plaza Inspection Delay',
                  'Site Incharge Unavailable / Labor Delay in Offloading',
                  'Other Operational Reason'
                ].map((reasonOption) => (
                  <label
                    key={reasonOption}
                    className={`flex items-center gap-2.5 p-2.5 rounded-xl border cursor-pointer transition-all ${
                      delayReason === reasonOption
                        ? 'bg-primary/10 border-primary text-text-primary font-bold'
                        : 'bg-surface border-border text-text-secondary hover:bg-surface-hover'
                    }`}
                  >
                    <input
                      type="radio"
                      name="delayReason"
                      value={reasonOption}
                      checked={delayReason === reasonOption}
                      onChange={(e) => setDelayReason(e.target.value)}
                      className="text-primary focus:ring-primary"
                    />
                    <span className="text-[11px]">{reasonOption}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Additional Custom Notes */}
            <div>
              <label className="font-bold text-text-primary block mb-1">
                Additional Driver Notes / Clarification (Optional)
              </label>
              <textarea
                rows={2}
                value={delayCustomNotes}
                onChange={(e) => setDelayCustomNotes(e.target.value)}
                placeholder="e.g. Tire punctured near NH48 bypass, tyre repaired and resuming route by 4 PM"
                className="w-full p-2.5 bg-surface-hover border border-border rounded-xl text-text-primary focus:outline-none focus:border-primary text-xs"
              />
            </div>

            <div className="flex justify-end gap-2.5 pt-3 border-t border-border">
              <button
                type="button"
                onClick={() => setDelayModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-surface-hover border border-border text-text-secondary cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-xl text-xs font-black uppercase tracking-wider bg-rose-600 hover:bg-rose-500 text-white shadow-sm flex items-center gap-1.5 cursor-pointer"
              >
                <FaCheckCircle /> Save Delay Reason
              </button>
            </div>
          </form>
        )}
      </Dialog>

      {/* ── Manual Delivery Completion Modal (Destination Photo) ── */}
      <Dialog
        isOpen={manualModalOpen}
        onClose={() => setManualModalOpen(false)}
        title="Complete Manual Delivery (Photo Proof of Delivery)"
        size="lg"
      >
        {selectedOrderForManual && (
          <form onSubmit={handleSubmitManual} className="space-y-4 p-1">
            <div className="p-3 bg-surface-hover rounded-xl border border-border text-xs space-y-1">
              <div className="font-bold text-text-primary">DO: {selectedOrderForManual.delivery_order_id}</div>
              <div className="text-text-muted">Customer: {selectedOrderForManual.customer_name} ({selectedOrderForManual.destination?.address})</div>
            </div>

            {/* Destination Photo Upload */}
            <div>
              <label className="text-xs font-bold text-text-primary block mb-1">
                Destination Delivery Proof Photo *
              </label>
              <p className="text-[11px] text-text-muted mb-2">
                Upload a clear photo of the materials unloaded at the customer location.
              </p>

              {destinationPhoto ? (
                <div className="relative group rounded-xl overflow-hidden border border-border h-48 bg-black/10">
                  <img
                    src={destinationPhoto}
                    alt="Destination Proof"
                    className="w-full h-full object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => setDestinationPhoto('')}
                    className="absolute top-2 right-2 bg-danger text-white rounded-lg px-2 py-1 text-xs font-bold"
                  >
                    Change Photo
                  </button>
                </div>
              ) : (
                <label className="block p-6 border-2 border-dashed border-border hover:border-primary rounded-xl text-center cursor-pointer transition-colors bg-surface-hover">
                  <HiOutlinePhotograph className="mx-auto text-3xl text-text-muted mb-2" />
                  <span className="text-xs font-bold text-primary block">
                    {uploadingPhoto ? 'Uploading Photo...' : 'Click to Upload Destination Photo Proof'}
                  </span>
                  <span className="text-[10px] text-text-muted mt-1 block">JPG, PNG up to 10MB</span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => handlePhotoUpload(e.target.files[0])}
                  />
                </label>
              )}
            </div>

            {/* Receiver Name */}
            <div>
              <label className="text-xs font-bold text-text-primary block mb-1">
                Handed Over To (Receiver Name) *
              </label>
              <input
                type="text"
                required
                value={manualReceiverName}
                onChange={(e) => setManualReceiverName(e.target.value)}
                placeholder="Name of customer representative receiving goods"
                className="w-full p-2.5 text-xs bg-surface-hover border border-border rounded-xl text-text-primary focus:outline-none focus:border-primary font-medium"
              />
            </div>

            {/* Delivery Date & Time */}
            <div>
              <label className="text-xs font-bold text-text-primary block mb-1">
                Delivery Handover Timestamp
              </label>
              <input
                type="datetime-local"
                value={manualDatetime}
                onChange={(e) => setManualDatetime(e.target.value)}
                className="w-full p-2.5 text-xs bg-surface-hover border border-border rounded-xl text-text-primary focus:outline-none focus:border-primary font-medium"
              />
            </div>

            {/* Remarks */}
            <div>
              <label className="text-xs font-bold text-text-primary block mb-1">
                Delivery Remarks / Notes
              </label>
              <textarea
                rows={2}
                value={manualRemarks}
                onChange={(e) => setManualRemarks(e.target.value)}
                placeholder="Goods received in good condition, signed challan handed over, etc."
                className="w-full p-2.5 text-xs bg-surface-hover border border-border rounded-xl text-text-primary focus:outline-none focus:border-primary"
              />
            </div>

            <div className="flex justify-end gap-2.5 pt-3 border-t border-border">
              <button
                type="button"
                onClick={() => setManualModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-surface-hover border border-border text-text-secondary"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submittingManual || !destinationPhoto}
                className="gradient-primary text-white px-5 py-2 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-1.5 disabled:opacity-50 cursor-pointer shadow-sm"
              >
                {submittingManual ? (
                  <>
                    <FaSpinner className="animate-spin" />
                    <span>Verifying Evidence...</span>
                  </>
                ) : (
                  <>
                    <FaCheckCircle />
                    <span>Confirm & Mark Delivered</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </Dialog>

      {/* ── Auto Delivery OTP Completion Modal ── */}
      <Dialog
        isOpen={otpModalOpen}
        onClose={() => setOtpModalOpen(false)}
        title="Complete Auto Delivery (Customer OTP Verification)"
        size="md"
      >
        {selectedOrderForOtp && (
          <form onSubmit={handleVerifyOtp} className="space-y-4 p-1">
            <div className="p-3 bg-surface-hover rounded-xl border border-border text-xs space-y-1">
              <div className="font-bold text-text-primary">DO: {selectedOrderForOtp.delivery_order_id}</div>
              <div className="text-text-muted">
                Authorized Customer Phone: <strong className="text-primary">{selectedOrderForOtp.customer_phone}</strong>
              </div>
            </div>

            {/* Send OTP Trigger */}
            <div className="p-3 bg-primary/5 border border-primary/20 rounded-xl flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-text-primary block">Step 1: Send OTP to Customer</span>
                <span className="text-[10px] text-text-muted">Shares secure 6-digit handover code with registered mobile.</span>
              </div>
              <button
                type="button"
                onClick={handleSendOtp}
                disabled={sendingOtp}
                className="px-3 py-1.5 rounded-lg text-xs font-bold bg-primary text-white hover:bg-primary/90 transition-all flex items-center gap-1 cursor-pointer"
              >
                {sendingOtp ? <FaSpinner className="animate-spin" /> : <HiOutlineKey />}
                <span>{otpSentNotice ? 'Resend OTP' : 'Send OTP'}</span>
              </button>
            </div>

            {otpSentNotice && (
              <div className="p-2.5 bg-success/10 border border-success/20 rounded-xl text-xs text-success font-mono font-bold text-center">
                {otpSentNotice}
              </div>
            )}

            {/* Enter OTP Field */}
            <div>
              <label className="text-xs font-bold text-text-primary block mb-1">
                Step 2: Enter 6-Digit Verification OTP *
              </label>
              <input
                type="text"
                maxLength={6}
                required
                value={enteredOtp}
                onChange={(e) => setEnteredOtp(e.target.value)}
                placeholder="• • • • • •"
                className="w-full text-center tracking-widest text-lg font-mono font-black p-3 bg-surface-hover border border-border rounded-xl text-text-primary focus:outline-none focus:border-primary"
              />
            </div>

            {/* Receiver Name */}
            <div>
              <label className="text-xs font-bold text-text-primary block mb-1">
                Person Receiving Materials
              </label>
              <input
                type="text"
                value={otpReceiverName}
                onChange={(e) => setOtpReceiverName(e.target.value)}
                className="w-full p-2.5 text-xs bg-surface-hover border border-border rounded-xl text-text-primary focus:outline-none focus:border-primary"
              />
            </div>

            <div className="flex justify-end gap-2.5 pt-3 border-t border-border">
              <button
                type="button"
                onClick={() => setOtpModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-surface-hover border border-border text-text-secondary"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={verifyingOtp || enteredOtp.length !== 6}
                className="gradient-primary text-white px-5 py-2 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-1.5 disabled:opacity-50 cursor-pointer shadow-sm"
              >
                {verifyingOtp ? (
                  <>
                    <FaSpinner className="animate-spin" />
                    <span>Verifying OTP...</span>
                  </>
                ) : (
                  <>
                    <FaCheckCircle />
                    <span>Validate & Mark Delivered</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </Dialog>

      {/* ── Photo Preview Dialog ── */}
      <Dialog
        isOpen={!!photoViewerUrl}
        onClose={() => setPhotoViewerUrl(null)}
        title="Evidence Document Preview"
        size="lg"
      >
        {photoViewerUrl && (
          <div className="p-1 space-y-3">
            <div className="max-h-[500px] rounded-xl overflow-hidden border border-border flex items-center justify-center bg-black/10">
              <img
                src={photoViewerUrl}
                alt="Evidence"
                className="max-h-[500px] w-auto object-contain mx-auto"
              />
            </div>
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setPhotoViewerUrl(null)}
                className="px-4 py-1.5 rounded-xl text-xs font-bold bg-primary text-white cursor-pointer"
              >
                Close Preview
              </button>
            </div>
          </div>
        )}
      </Dialog>

      {/* ── Multi-Stop Logistics Delivery Manifest Dialog (Accounts Document) ── */}
      <Dialog
        isOpen={manifestModalOpen}
        onClose={() => setManifestModalOpen(false)}
        title="Consolidated Multi-Stop Logistics Manifest & Delivery Document"
        size="xl"
      >
        {selectedOrderForManifest && (() => {
          const ord = selectedOrderForManifest;
          const plan = getRoutePlan(ord);
          const totalUnits = (ord.items || []).reduce((acc, it) => acc + (it.ordered_qty || 0), 0);

          return (
            <div className="space-y-4 p-2 text-xs">
              {/* Document Official Header */}
              <div className="p-4 bg-surface rounded-2xl border border-border shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm font-black text-primary">
                      MANIFEST #{ord.order_number}-MULTI
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-success/15 text-success border border-success/30 flex items-center gap-1">
                      <FaCheckCircle className="text-[9px]" /> Accounts & Logistics Authorized
                    </span>
                  </div>
                  <p className="text-[11px] text-text-muted mt-1">
                    Multi-Stop Consignment Route: Multi-OEM Pickups, Master Warehouse Hub & Multiple EPC Delivery Points
                  </p>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  {ord.eway_bill?.eway_bill_number && (
                    <div className="px-3 py-1.5 rounded-xl bg-surface-hover border border-border text-[11px] font-mono">
                      <span className="text-[9px] uppercase text-text-muted block font-bold">E-Way Bill No</span>
                      <strong className="text-text-primary">{ord.eway_bill.eway_bill_number}</strong>
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={() => window.print()}
                    className="px-3 py-1.5 rounded-xl bg-primary text-white font-bold text-xs flex items-center gap-1.5 hover:brightness-105 transition-all shadow-xs cursor-pointer"
                  >
                    <FaPrint /> Print Manifest
                  </button>
                </div>
              </div>

              {/* Vehicle & Transporter Manifest Bar */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3 bg-surface-hover/60 rounded-xl border border-border text-[11px]">
                <div>
                  <span className="text-[9px] uppercase font-bold text-text-muted block">Assigned Fleet</span>
                  <strong className="font-mono text-text-primary text-xs">
                    {(plan.fleetVehicles && plan.fleetVehicles.length > 0)
                      ? plan.fleetVehicles.map(v => v.vehicle_number).join(', ')
                      : (ord.transport_details?.vehicle_number || ord.required_vehicle)}
                  </strong>
                </div>
                <div>
                  <span className="text-[9px] uppercase font-bold text-text-muted block">Transporter Name</span>
                  <strong className="text-text-primary">{ord.transport_details?.transporter_name || 'VRL Logistics Ltd'}</strong>
                </div>
                <div>
                  <span className="text-[9px] uppercase font-bold text-text-muted block">Driver Mobile</span>
                  <strong className="text-text-primary font-mono">{ord.transport_details?.driver_name || 'Driver'} ({ord.transport_details?.driver_mobile || '-'})</strong>
                </div>
                <div>
                  <span className="text-[9px] uppercase font-bold text-text-muted block">Total Load Capacity</span>
                  <strong className="text-primary">{totalUnits} Total Units ({(ord.items || []).length} SKUs)</strong>
                </div>
              </div>

              {/* Section 1: Pickup Stops (OEMs) */}
              <div className="space-y-2">
                <div className="flex items-center justify-between border-b border-border pb-1">
                  <h4 className="text-xs font-black uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                    <FaIndustry /> 1. Origin OEM Pickup Hubs (Kahan se kya uthana hai)
                  </h4>
                  <span className="text-[10px] text-text-muted">{plan.vendorPickups.length} Pickup Stop(s)</span>
                </div>

                <div className="space-y-2">
                  {plan.vendorPickups.map(p => (
                    <div key={p.key} className="p-3 bg-surface rounded-xl border border-border flex flex-col md:flex-row md:items-center justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="px-1.5 py-0.5 rounded bg-amber-400/20 text-amber-400 text-[10px] font-black">
                            {p.stop_code}
                          </span>
                          <strong className="text-text-primary text-xs">{p.supplierName}</strong>
                          <span className="text-[10px] text-text-muted">({p.locationName})</span>
                        </div>
                        <div className="text-[11px] text-text-muted mt-0.5">{p.address} • Desk: {p.contactPerson} ({p.phone})</div>
                      </div>

                      <div className="bg-surface-hover px-3 py-1.5 rounded-lg border border-border text-right shrink-0">
                        <span className="text-[9px] uppercase text-text-muted block font-bold">Pick Quantity</span>
                        <span className="font-mono font-bold text-primary text-xs">
                          {p.items.map(it => `${it.product_name}: ${it.ordered_qty} units`).join(' | ')}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Section 2: Master Warehouse Consolidation */}
              <div className="space-y-2 pt-2">
                <div className="flex items-center justify-between border-b border-border pb-1">
                  <h4 className="text-xs font-black uppercase tracking-wider text-purple-400 flex items-center gap-1.5">
                    <FaWarehouse /> 2. Master Warehouse Consolidation (BOS Kits Staging)
                  </h4>
                  <span className="text-[10px] text-text-muted">1 Consolidation Hub</span>
                </div>

                <div className="p-3 bg-surface rounded-xl border border-border flex flex-col md:flex-row md:items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300 text-[10px] font-black">
                        STOP #W
                      </span>
                      <strong className="text-text-primary text-xs">{plan.warehouseStop.warehouse_name}</strong>
                    </div>
                    <div className="text-[11px] text-text-muted mt-0.5">{plan.warehouseStop.address} • Incharge: {plan.warehouseStop.contactPerson} ({plan.warehouseStop.phone})</div>
                  </div>

                  <div className="bg-purple-500/10 border border-purple-500/30 px-3 py-1.5 rounded-lg text-right shrink-0">
                    <span className="text-[9px] uppercase text-text-muted block font-bold">Pre-assembled Kits</span>
                    <span className="font-mono font-bold text-purple-300 text-xs">
                      {plan.warehouseStop.items.map(it => `${it.product_name}: ${it.ordered_qty} Kits`).join(' | ')}
                    </span>
                  </div>
                </div>
              </div>

              {/* Section 3: Drop Stops (EPCs) */}
              <div className="space-y-2 pt-2">
                <div className="flex items-center justify-between border-b border-border pb-1">
                  <h4 className="text-xs font-black uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                    <FaMapMarkerAlt /> 3. Delivery Destination Drop Points (Kahan drop karna hai)
                  </h4>
                  <span className="text-[10px] text-text-muted">{plan.dropStops.length} EPC Project Drop(s)</span>
                </div>

                <div className="space-y-2">
                  {plan.dropStops.map(d => (
                    <div key={d.epc_id} className="p-3 bg-surface rounded-xl border border-border flex flex-col md:flex-row md:items-center justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 text-[10px] font-black">
                            {d.stop_code}
                          </span>
                          <strong className="text-text-primary text-xs">{d.epc_name}</strong>
                          <span className="font-mono text-[10px] font-bold text-primary bg-primary/10 px-1.5 py-0.5 rounded">
                            {d.tracking_consignment_id}
                          </span>
                        </div>
                        <div className="text-[11px] text-text-muted mt-0.5">
                          {d.site_address}, {d.district}, {d.state} • Site Incharge: {d.contact_person} ({d.contact_phone})
                        </div>
                      </div>

                      <div className="bg-emerald-500/10 border border-emerald-500/30 px-3 py-1.5 rounded-lg text-right shrink-0">
                        <span className="text-[9px] uppercase text-text-muted block font-bold">Allocated Equipment</span>
                        <span className="font-bold text-emerald-400 text-xs">
                          {d.allocated_summary}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Signatures & Declarations */}
              <div className="pt-3 border-t border-border grid grid-cols-2 gap-4 text-center text-[10px] text-text-muted">
                <div className="p-3 bg-surface-hover/40 rounded-xl border border-border/50">
                  <div className="font-bold text-text-primary">Accounts Officer Authorization</div>
                  <div className="text-[9px] mt-1">Verified against Advance UTR & PI Schedule</div>
                </div>
                <div className="p-3 bg-surface-hover/40 rounded-xl border border-border/50">
                  <div className="font-bold text-text-primary">Transporter & Driver Acceptance</div>
                  <div className="text-[9px] mt-1">Consignment verified as per e-way bill declaration</div>
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setManifestModalOpen(false)}
                  className="px-4 py-1.5 rounded-xl text-xs font-bold bg-surface-hover border border-border text-text-primary cursor-pointer hover:bg-surface"
                >
                  Close Document
                </button>
              </div>
            </div>
          );
        })()}
      </Dialog>
    </div>
  );
}
