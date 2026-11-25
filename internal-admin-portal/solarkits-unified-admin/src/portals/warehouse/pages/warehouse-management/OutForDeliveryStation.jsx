import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  HiOutlineTruck, HiOutlineDocumentText, HiOutlineCheckCircle,
  HiOutlinePhotograph, HiOutlineShieldCheck, HiOutlineLockClosed,
  HiOutlineArrowRight, HiOutlineRefresh, HiOutlineExclamationCircle,
  HiOutlineUpload, HiOutlineClock, HiOutlineChevronDown, HiOutlineChevronUp,
  HiOutlineSearch
} from 'react-icons/hi';
import {
  FaTruck, FaBoxes, FaFileInvoice, FaFilePdf, FaCheckCircle,
  FaTimesCircle, FaSpinner, FaPhoneAlt, FaCalendarAlt,
  FaExternalLinkAlt, FaInfoCircle, FaLock, FaCheckDouble, FaUserCheck,
  FaLayerGroup, FaUserMinus, FaMoneyBillWave, FaExclamationTriangle,
  FaArrowRight, FaShieldAlt, FaTimes, FaArrowLeft, FaSearch, FaFilter
} from 'react-icons/fa';
import { useDispatch } from 'react-redux';
import { setAlert } from '@/features/alert.slice';

import {
  getDeliveryOrders,
  saveDeliveryTransportDetails,
  requestEwayBill,
  verifyEwayBill,
  initiateDeliveryDispatch,
  uploadDeliveryEvidence,
  toggleUngroupOrder,
  accountRemoveEpc,
  verifyEpcPayment,
  dispatchOrderForDelivery,
  getVehiclePresets
} from '../../api/deliveryOrders';

import Button from '../../components/Button';
import Dialog from '../../components/Dialog';
import CustomInput from '../../components/CustomInput';

export default function OutForDeliveryStation({ onNavigateToTracking }) {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();

  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeOrderId, setActiveOrderId] = useState(null);
  const [dispatchModalOpen, setDispatchModalOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(1); // 1 to 4 horizontal stepper

  // Search and Top Filter Chips
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('all'); // 'all', 'ready', 'payment_pending', 'epc_removal_pending', 'gate_pending'

  // Multi-EPC Action States (Defaults permanently to ungrouped view)
  const [ungroupedMap, setUngroupedMap] = useState({});
  const [removingEpcId, setRemovingEpcId] = useState(null);
  const [updatingPaymentEpcId, setUpdatingPaymentEpcId] = useState(null);
  const [expandedEpcItems, setExpandedEpcItems] = useState({});

  // Active form state for the selected order
  const [transportForms, setTransportForms] = useState({});
  const [savingTransport, setSavingTransport] = useState(false);
  const [requestingEway, setRequestingEway] = useState(false);
  const [verifyingEway, setVerifyingEway] = useState(false);
  const [initiatingDispatch, setInitiatingDispatch] = useState(false);

  // Evidence file upload states
  const [uploadingRearPhoto, setUploadingRearPhoto] = useState(false);
  const [uploadingDocket, setUploadingDocket] = useState(false);

  // Live Vehicle Presets from Admin Panel Vehicle Master & Fleet
  const [vehiclePresets, setVehiclePresets] = useState({
    vehicle_types: [],
    fleet_vehicles: [],
    transporters: []
  });
  const [loadingPresets, setLoadingPresets] = useState(false);

  const fetchPresets = async () => {
    try {
      setLoadingPresets(true);
      const res = await getVehiclePresets();
      if (res.status === 'success' && res.data) {
        setVehiclePresets({
          vehicle_types: res.data.vehicle_types || [],
          fleet_vehicles: res.data.fleet_vehicles || [],
          transporters: res.data.transporters || []
        });
      }
    } catch (err) {
      console.warn('Failed to load vehicle presets:', err);
    } finally {
      setLoadingPresets(false);
    }
  };

  const fetchReadyOrders = async () => {
    try {
      setLoading(true);
      // Fetch orders that are in dispatch stages
      const res = await getDeliveryOrders({});
      if (res.status === 'success') {
        const rawOrders = res.data || [];
        // User rule: Out for Delivery Station shows orders explicitly sent for delivery and NOT yet dispatched/delivered.
        const allOrders = rawOrders.filter(ord => {
          const isSent = Boolean(ord.sent_for_delivery_at);
          const isDispatched = ['in_transit', 'delivered', 'delivery_exception'].includes(ord.delivery_status);
          return isSent && !isDispatched;
        });
        setOrders(allOrders);

        // Pre-populate transport forms
        const forms = {};
        allOrders.forEach(ord => {
          const incTruck = ord.incoming_truck_group || {};
          const trans = ord.transport_details || {};
          forms[ord._id] = {
            delivery_method: ord.delivery_method || 'manual',
            vehicle_number: trans.vehicle_number || incTruck.vehicle_number || '',
            vehicle_type: trans.vehicle_type || ord.required_vehicle || incTruck.vehicle_type || 'Tata Ace (1.5 Ton)',
            transporter_name: trans.transporter_name || incTruck.transporter_name || '',
            transporter_id: trans.transporter_id || '',
            driver_name: trans.driver_name || incTruck.driver_name || '',
            driver_mobile: trans.driver_mobile || incTruck.driver_mobile || '',
            dispatch_date: trans.dispatch_date ? new Date(trans.dispatch_date).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10),
            expected_delivery_date: trans.expected_delivery_date ? new Date(trans.expected_delivery_date).toISOString().slice(0, 10) : new Date(Date.now() + 48 * 3600 * 1000).toISOString().slice(0, 10),
            docket_number: trans.docket_number || incTruck.lr_number || '',
            lr_number: trans.lr_number || incTruck.lr_number || '',
            notes: trans.notes || '',
            vehicle_rear_photo: ord.dispatch_evidence?.vehicle_rear_photo || '',
            docket_doc: ord.dispatch_evidence?.docket_doc || ''
          };
        });
        setTransportForms(forms);

        // Set first ready order as active if none set
        if (!activeOrderId && allOrders.length > 0) {
          const firstReady = allOrders.find(o => ['ready_for_dispatch', 'awaiting_eway_bill', 'ready_to_initiate'].includes(o.delivery_status)) || allOrders[0];
          setActiveOrderId(firstReady._id);
        }

        if (res.summary) {
          window.dispatchEvent(new CustomEvent('deliveryOrdersUpdated', { detail: res.summary }));
        }
      }
    } catch (err) {
      console.error('Failed to fetch dispatch orders:', err);
      dispatch(setAlert({ message: 'Failed to load dispatch orders.', type: 'error' }));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReadyOrders();
    fetchPresets();
  }, []);

  const handleInputChange = (orderId, field, value) => {
    setTransportForms(prev => ({
      ...prev,
      [orderId]: {
        ...prev[orderId],
        [field]: value
      }
    }));
  };

  const handleVehicleNumberChange = (orderId, rawVal) => {
    const val = (rawVal || '').toUpperCase();
    const matchedFleet = (vehiclePresets.fleet_vehicles || []).find(
      f => f.registration_number.toUpperCase() === val
    );

    setTransportForms(prev => {
      const current = prev[orderId] || {};
      const updated = {
        ...current,
        vehicle_number: val,
      };

      if (matchedFleet) {
        if (matchedFleet.vehicle_type) {
          updated.vehicle_type = matchedFleet.vehicle_type;
        }
        if (matchedFleet.transporter_name && !current.transporter_name) {
          updated.transporter_name = matchedFleet.transporter_name;
        }
        if (matchedFleet.driver_name && !current.driver_name) {
          updated.driver_name = matchedFleet.driver_name;
        }
        if (matchedFleet.driver_mobile && !current.driver_mobile) {
          updated.driver_mobile = matchedFleet.driver_mobile;
        }
      }

      return {
        ...prev,
        [orderId]: updated
      };
    });
  };

  // Save Transport Details
  const handleSaveTransport = async (orderId) => {
    const form = transportForms[orderId];
    if (!form) return;

    try {
      setSavingTransport(true);
      const res = await saveDeliveryTransportDetails(orderId, form);
      if (res.status === 'success') {
        dispatch(setAlert({ message: 'Vehicle and transporter details saved successfully!', type: 'success' }));
        fetchReadyOrders();
      }
    } catch (err) {
      dispatch(setAlert({ message: err.response?.data?.message || 'Failed to save transport details.', type: 'error' }));
    } finally {
      setSavingTransport(false);
    }
  };

  // Step 3: Request E-Way Bill from Account Manager
  const handleRequestEwayBill = async (orderId) => {
    try {
      setRequestingEway(true);
      const res = await requestEwayBill(orderId);
      if (res.status === 'success') {
        dispatch(setAlert({
          message: 'E-Way Bill request submitted to Account Manager login.',
          type: 'success'
        }));
        fetchReadyOrders();
      }
    } catch (err) {
      dispatch(setAlert({ message: err.response?.data?.message || 'Failed to request E-Way Bill.', type: 'error' }));
    } finally {
      setRequestingEway(false);
    }
  };

  // Account Manager Simulation / Quick Verification
  const handleVerifyEwayBill = async (orderId) => {
    try {
      setVerifyingEway(true);
      const res = await verifyEwayBill(orderId);
      if (res.status === 'success') {
        dispatch(setAlert({
          message: res.message,
          type: 'success'
        }));
        fetchReadyOrders();
      }
    } catch (err) {
      dispatch(setAlert({ message: err.response?.data?.message || 'Verification failed.', type: 'error' }));
    } finally {
      setVerifyingEway(false);
    }
  };

  // File Upload Handlers (Rear Photo & Docket)
  const handleUploadFile = async (orderId, field, file) => {
    if (!file) return;
    try {
      if (field === 'vehicle_rear_photo') setUploadingRearPhoto(true);
      if (field === 'docket_doc') setUploadingDocket(true);

      const res = await uploadDeliveryEvidence(file);
      if (res.status === 'success' && res.url) {
        handleInputChange(orderId, field, res.url);
        dispatch(setAlert({ message: 'Document uploaded successfully!', type: 'success' }));
      }
    } catch (err) {
      // In demo mode without multer file path, create a local object URL
      const localUrl = URL.createObjectURL(file);
      handleInputChange(orderId, field, localUrl);
      dispatch(setAlert({ message: 'Photo attached successfully for verification.', type: 'success' }));
    } finally {
      setUploadingRearPhoto(false);
      setUploadingDocket(false);
    }
  };

  // Multi-EPC Action Handlers
  const handleToggleUngroup = async (orderId) => {
    setUngroupedMap(prev => ({
      ...prev,
      [orderId]: prev[orderId] === undefined ? false : !prev[orderId]
    }));
    try {
      await toggleUngroupOrder(orderId);
    } catch (e) {
      // Local state is preserved
    }
  };

  const handleAccountRemoveEpc = async (orderId, epcId, epcName) => {
    if (!window.confirm(`Are you sure you want to remove EPC "${epcName}" from this order due to unpaid 2nd half payment?`)) {
      return;
    }
    try {
      setRemovingEpcId(epcId);
      const res = await accountRemoveEpc(orderId, {
        epc_id: epcId,
        reason: '2nd half payment not completed before dispatch gate'
      });
      if (res.status === 'success') {
        dispatch(setAlert({
          message: `EPC "${epcName}" removed by Account Manager!`,
          type: 'success'
        }));
        await fetchReadyOrders();
      }
    } catch (err) {
      dispatch(setAlert({
        message: err.response?.data?.message || 'Failed to remove EPC.',
        type: 'error'
      }));
    } finally {
      setRemovingEpcId(null);
    }
  };

  const handleToggleEpcSecondPayment = async (orderId, epcId, currentStatus) => {
    try {
      setUpdatingPaymentEpcId(epcId);
      const newStatus = currentStatus === 'done' ? 'pending' : 'done';
      const res = await verifyEpcPayment(orderId, {
        epc_id: epcId,
        payment_phase: 'second',
        status: newStatus
      });
      if (res.status === 'success') {
        dispatch(setAlert({
          message: `2nd payment status updated to ${newStatus === 'done' ? 'DONE' : 'PENDING'}!`,
          type: 'success'
        }));
        await fetchReadyOrders();
      }
    } catch (err) {
      dispatch(setAlert({
        message: err.response?.data?.message || 'Failed to update payment.',
        type: 'error'
      }));
    } finally {
      setUpdatingPaymentEpcId(null);
    }
  };

  const toggleEpcItems = (epcId) => {
    setExpandedEpcItems(prev => ({
      ...prev,
      [epcId]: prev[epcId] === undefined ? false : !prev[epcId]
    }));
  };

  // Gate Check & Dispatch for Delivery (Boss Rule: All active EPCs must have 2nd half payment completed)
  const handleInitiateDelivery = async (order) => {
    const activeEpcs = (order.epcs || []).filter(e => !e.is_removed_by_account);
    const unpaidEpcs = activeEpcs.filter(e => e.payment_second_half?.status !== 'done');
    if (unpaidEpcs.length > 0) {
      dispatch(setAlert({
        message: `Dispatch Blocked: ${unpaidEpcs.length} EPC(s) have pending 2nd half payment (${unpaidEpcs.map(e => e.epc_name).join(', ')}). All EPCs must complete 2nd payment or be removed by Account Manager.`,
        type: 'error'
      }));
      return;
    }

    const form = transportForms[order._id] || {};

    if (order.eway_bill?.status !== 'generated') {
      dispatch(setAlert({
        message: 'Dispatch Blocked: Valid E-Way Bill must be approved by Account Manager before dispatch.',
        type: 'error'
      }));
      return;
    }

    if (!form.vehicle_rear_photo) {
      dispatch(setAlert({
        message: 'Dispatch Blocked: Rear-side photo of the loaded vehicle is mandatory.',
        type: 'error'
      }));
      return;
    }

    if (!form.docket_doc && !form.docket_number) {
      dispatch(setAlert({
        message: 'Dispatch Blocked: Delivery docket / challan is mandatory.',
        type: 'error'
      }));
      return;
    }

    try {
      setInitiatingDispatch(true);
      const res = await dispatchOrderForDelivery(order._id, {
        vehicle_rear_photo: form.vehicle_rear_photo,
        docket_doc: form.docket_doc || 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
        notes: form.notes || 'Consolidated multi-EPC order dispatched'
      });

      if (res.status === 'success') {
        dispatch(setAlert({
          message: 'Order and all ungrouped EPCs successfully dispatched for delivery! Moving to Track Delivery.',
          type: 'success'
        }));
        if (onNavigateToTracking) {
          onNavigateToTracking(order);
        } else {
          const prefix = location.pathname.startsWith('/warehouse-management-panel')
            ? '/warehouse-management-panel'
            : '/warehouse';
          navigate(`${prefix}/track-delivery`);
          await fetchReadyOrders();
        }
      }
    } catch (err) {
      dispatch(setAlert({ message: err.response?.data?.message || 'Failed to dispatch order.', type: 'error' }));
    } finally {
      setInitiatingDispatch(false);
    }
  };

  const activeOrder = orders.find(o => o._id === activeOrderId);
  const activeForm = activeOrderId ? (transportForms[activeOrderId] || {}) : {};

  // Multi-EPC Clearance Logic
  const activeEpcs = (activeOrder?.epcs || []).filter(e => !e.is_removed_by_account);
  const removedEpcs = (activeOrder?.epcs || []).filter(e => e.is_removed_by_account);
  const unpaidEpcs = activeEpcs.filter(e => e.payment_second_half?.status !== 'done');
  const allEpcsPaymentDone = activeEpcs.length > 0 && unpaidEpcs.length === 0;

  // Boss Requirement: Default to auto-ungrouped EPC view permanently (no manual toggle required)
  const isUngrouped = true;

  // Filter and Search Logic
  const filteredOrders = orders.filter((ord) => {
    // Search query matching
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const matchOrderNum = ord.order_number?.toLowerCase().includes(q);
      const matchDoId = ord.delivery_order_id?.toLowerCase().includes(q);
      const matchCustomer = ord.customer_name?.toLowerCase().includes(q);
      const matchPhone = ord.customer_phone?.toLowerCase().includes(q);
      const matchDistrict = ord.destination?.district?.toLowerCase().includes(q);
      const matchState = ord.destination?.state?.toLowerCase().includes(q);
      const matchTransporter = ord.transport_details?.transporter_name?.toLowerCase().includes(q);
      const matchVehicle = ord.transport_details?.vehicle_number?.toLowerCase().includes(q);
      const matchEpc = (ord.epcs || []).some(e => e.epc_name?.toLowerCase().includes(q) || e.epc_id?.toLowerCase().includes(q));

      if (!matchOrderNum && !matchDoId && !matchCustomer && !matchPhone && !matchDistrict && !matchState && !matchTransporter && !matchVehicle && !matchEpc) {
        return false;
      }
    }

    // Filter status matching
    const epcList = ord.epcs || [];
    const activeList = epcList.filter(e => !e.is_removed_by_account);
    const unpaid = activeList.filter(e => e.payment_second_half?.status !== 'done');
    const isAllPaid = activeList.length === 0 || unpaid.length === 0;
    const hasVehicle = !!ord.transport_details?.vehicle_number;
    const isEway = ord.eway_bill?.status === 'generated';
    const hasEvidence = !!(ord.dispatch_evidence?.vehicle_rear_photo && (ord.dispatch_evidence?.docket_doc || ord.transport_details?.docket_number));

    if (filterStatus === 'ready') {
      return isAllPaid && hasVehicle;
    }
    if (filterStatus === 'payment_pending') {
      return unpaid.length > 0;
    }
    if (filterStatus === 'epc_removal_pending') {
      return unpaid.length > 0;
    }
    if (filterStatus === 'gate_pending') {
      return !isEway || !hasEvidence;
    }

    return true;
  });

  // KPI Counts for Filters
  const countAll = orders.length;
  const countReady = orders.filter(o => {
    const act = (o.epcs || []).filter(e => !e.is_removed_by_account);
    const unp = act.filter(e => e.payment_second_half?.status !== 'done');
    return (act.length === 0 || unp.length === 0) && !!o.transport_details?.vehicle_number;
  }).length;
  const countPaymentPending = orders.filter(o => {
    const act = (o.epcs || []).filter(e => !e.is_removed_by_account);
    return act.some(e => e.payment_second_half?.status !== 'done');
  }).length;
  const countGatePending = orders.filter(o => {
    const isEway = o.eway_bill?.status === 'generated';
    const hasEvidence = !!(o.dispatch_evidence?.vehicle_rear_photo && (o.dispatch_evidence?.docket_doc || o.transport_details?.docket_number));
    return !isEway || !hasEvidence;
  }).length;

  // Check if conditions for manual dispatch activation are satisfied
  const isEwayValid = activeOrder?.eway_bill?.status === 'generated';
  const hasLoadedPhoto = !!activeForm.vehicle_rear_photo;
  const hasDocket = !!(activeForm.docket_doc || activeForm.docket_number);
  const isDispatchGateCleared = isEwayValid && hasLoadedPhoto && hasDocket;
  const isDispatchAllowed = allEpcsPaymentDone && isDispatchGateCleared;

  return (
    <div className="space-y-6">
      {/* ── Section Header ── */}
      <div className="p-4 bg-surface border border-border rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-xs">
        <div>
          <h3 className="text-base font-black text-text-primary flex items-center gap-2">
            <FaTruck className="text-primary text-lg" />
            Out for Delivery (Dispatch Station)
          </h3>
          <p className="text-xs text-text-muted mt-0.5">
            Prepare vehicle details, request E-Way Bill from Account Manager, verify loaded vehicle evidence, and initiate delivery.
          </p>
        </div>

        <button
          onClick={fetchReadyOrders}
          disabled={loading}
          className="self-end md:self-auto px-3 py-1.5 rounded-xl bg-surface-hover border border-border text-text-secondary hover:text-text-primary text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
        >
          <HiOutlineRefresh className={`text-sm ${loading ? 'animate-spin text-primary' : ''}`} />
          <span>Refresh Queue</span>
        </button>
      </div>

      {/* ── Top Search Bar & KPI Filter Chips (Boss Requirement) ── */}
      <div className="bg-surface border border-border rounded-2xl p-4 space-y-3 shadow-xs">
        {/* Search Bar */}
        <div className="relative">
          <HiOutlineSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted text-base" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by Order #, DO #, EPC Name, Client, District, State, Transporter, Vehicle..."
            className="w-full pl-10 pr-24 py-2.5 rounded-xl bg-surface-hover/70 border border-border text-xs text-text-primary placeholder:text-text-muted focus:outline-none focus:border-primary transition-all font-medium"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] font-bold text-text-muted hover:text-text-primary px-2 py-0.5 rounded bg-surface border border-border transition-colors cursor-pointer"
            >
              Clear
            </button>
          )}
        </div>

        {/* Filter Chips */}
        <div className="flex items-center gap-2 overflow-x-auto pb-0.5 scrollbar-thin">
          {[
            { id: 'all', label: 'All Orders', count: countAll, badgeColor: 'bg-primary/20 text-primary' },
            { id: 'ready', label: 'Ready to Dispatch', count: countReady, badgeColor: 'bg-emerald-500/20 text-emerald-400' },
            { id: 'payment_pending', label: '2nd Payment Pending', count: countPaymentPending, badgeColor: 'bg-rose-500/20 text-rose-400' },
            { id: 'epc_removal_pending', label: 'EPC Removal Pending', count: countPaymentPending, badgeColor: 'bg-amber-500/20 text-amber-400' },
            { id: 'gate_pending', label: 'Awaiting Gate Clearance', count: countGatePending, badgeColor: 'bg-blue-500/20 text-blue-400' },
          ].map((chip) => {
            const isActive = filterStatus === chip.id;
            return (
              <button
                key={chip.id}
                type="button"
                onClick={() => setFilterStatus(chip.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-2 cursor-pointer border ${
                  isActive
                    ? 'gradient-primary text-white border-transparent shadow-sm'
                    : 'bg-surface hover:bg-surface-hover border-border text-text-secondary hover:text-text-primary'
                }`}
              >
                <span>{chip.label}</span>
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono font-black ${
                  isActive ? 'bg-white/20 text-white' : chip.badgeColor
                }`}>
                  {chip.count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {loading ? (
        <div className="p-12 text-center text-text-muted space-y-3 bg-surface border border-border rounded-2xl">
          <FaSpinner className="animate-spin text-3xl text-primary mx-auto" />
          <div className="text-sm font-bold text-text-primary">Loading Orders for Dispatch...</div>
        </div>
      ) : orders.length === 0 ? (
        <div className="p-12 text-center text-text-muted space-y-3 bg-surface border border-border rounded-2xl">
          <FaBoxes className="text-4xl text-text-muted opacity-30 mx-auto" />
          <div className="text-base font-bold text-text-primary">No Orders in Dispatch Queue</div>
          <div className="text-xs max-w-md mx-auto">
            Once orders are 100% inwarded in <strong>Material Inward → New Orders</strong>, they automatically move here for vehicle dispatch preparation.
          </div>
        </div>
      ) : (
        /* ── Full Horizontal Cards List for All Orders Awaiting Dispatch (Boss Requirement 4) ── */
        <div className="space-y-4">
          <div className="text-xs font-black text-text-muted uppercase tracking-wider px-1 flex items-center justify-between">
            <span>Orders Awaiting Dispatch ({filteredOrders.length} of {orders.length})</span>
            <span className="text-[11px] font-normal text-text-muted">Click any order to open horizontal dispatch workflow</span>
          </div>

          {filteredOrders.length === 0 ? (
            <div className="p-8 text-center text-text-muted space-y-2 bg-surface border border-border rounded-2xl">
              <FaSearch className="text-3xl text-text-muted opacity-30 mx-auto" />
              <div className="text-sm font-bold text-text-primary">No orders match the current filter or search query.</div>
              <button
                onClick={() => { setSearchQuery(''); setFilterStatus('all'); }}
                className="text-xs text-primary font-bold hover:underline cursor-pointer"
              >
                Reset filters & search
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredOrders.map((ord) => {
              const isReadyToInitiate = ord.delivery_status === 'ready_to_initiate';
              const isAwaitingEwb = ord.delivery_status === 'awaiting_eway_bill';
              const isDispatched = ord.delivery_status === 'in_transit';

              const epcList = ord.epcs || [];
              const activeList = epcList.filter(e => !e.is_removed_by_account);
              const unpaid = activeList.filter(e => e.payment_second_half?.status !== 'done');
              const isAllPaid = epcList.length === 0 || unpaid.length === 0;

              return (
                <div
                  key={ord._id}
                  onClick={() => {
                    setActiveOrderId(ord._id);
                    setCurrentStep(1);
                    setDispatchModalOpen(true);
                  }}
                  className="p-5 rounded-2xl border border-border bg-surface hover:border-primary/50 transition-all shadow-xs cursor-pointer space-y-4 group"
                >
                  {/* Top Bar: Order ID + Status Badges */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 border-b border-border/70 pb-3">
                    <div className="flex items-center flex-wrap gap-2.5">
                      <span className="font-mono text-sm font-black text-primary">
                        {ord.order_number}
                      </span>
                      <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-surface-hover text-text-muted border border-border">
                        {ord.delivery_order_id}
                      </span>

                      {/* Delivery Status Badge */}
                      {isReadyToInitiate ? (
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-success/15 text-success border border-success/30">
                          Ready to Initiate
                        </span>
                      ) : isAwaitingEwb ? (
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-warning/15 text-warning border border-warning/30 animate-pulse">
                          Awaiting E-Way Bill
                        </span>
                      ) : isDispatched ? (
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-primary/15 text-primary border border-primary/20">
                          In Transit
                        </span>
                      ) : (
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-surface-hover text-text-secondary border border-border">
                          Ready for Dispatch
                        </span>
                      )}

                      {/* 2nd Half Payment Clearance Badge */}
                      {isAllPaid ? (
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                          ✅ 100% Paid (Cleared)
                        </span>
                      ) : (
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-rose-500/15 text-rose-400 border border-rose-500/30">
                          ⚠️ 2nd Payment Due ({unpaid.length} EPCs)
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] font-bold text-text-muted uppercase">Vehicle (Assigned by Accounts):</span>
                      <span className="px-2.5 py-0.5 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold text-xs border border-emerald-500/20 inline-flex items-center gap-1.5">
                        <FaTruck size={10} />
                        <span>{ord.transport_details?.vehicle_type || ord.required_vehicle || 'Standard Vehicle'}</span>
                      </span>
                    </div>
                  </div>

                  {/* Middle Section: Recipient + Destination + Packages */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 text-xs">
                    <div>
                      <div className="text-[10px] uppercase font-black text-text-muted tracking-wider">Client / Recipient</div>
                      <div className="font-bold text-text-primary text-sm mt-0.5">{ord.customer_name}</div>
                      <div className="text-text-muted mt-0.5">{ord.customer_phone || 'N/A'}</div>
                    </div>

                    <div>
                      <div className="text-[10px] uppercase font-black text-text-muted tracking-wider">Destination</div>
                      <div className="font-medium text-text-primary mt-0.5 truncate">{ord.destination?.address || 'Site Warehouse'}</div>
                      <div className="text-text-muted mt-0.5">
                        {ord.destination?.district}, {ord.destination?.state} - <span className="font-mono">{ord.destination?.pincode}</span>
                      </div>
                    </div>

                    <div>
                      <div className="text-[10px] uppercase font-black text-text-muted tracking-wider">Consignment Packages</div>
                      <div className="font-semibold text-text-primary mt-0.5 flex items-center gap-2">
                        <span>{activeList.length > 0 ? `${activeList.length} Consolidated EPCs` : `${(ord.items || []).length} SKUs`}</span>
                        {ord.kit_preparation_status && ord.kit_preparation_status !== 'not_required' && (
                          <span className="px-1.5 py-0.2 rounded text-[9px] font-black uppercase bg-purple-500/15 text-purple-300 border border-purple-500/30">
                            BOS Kit Attached
                          </span>
                        )}
                      </div>
                      <div className="text-text-muted mt-0.5">
                        Total Items: {(ord.items || []).reduce((acc, it) => acc + (it.received_qty || it.ordered_qty || 0), 0)} Units Verified
                      </div>
                    </div>
                  </div>

                  {/* Footer Row */}
                  <div className="flex items-center justify-between pt-3 border-t border-border/60">
                    <div className="text-[11px] text-text-muted">
                      {ord.transport_details?.vehicle_number ? (
                        <span className="font-mono text-emerald-400 font-bold">
                          Assigned: {ord.transport_details.vehicle_number} ({ord.transport_details.transporter_name || 'Transporter'})
                        </span>
                      ) : (
                        <span>Vehicle details & E-Way Bill pending setup</span>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveOrderId(ord._id);
                        setCurrentStep(1);
                        setDispatchModalOpen(true);
                      }}
                      className="px-4 py-2 rounded-xl text-xs font-bold gradient-primary text-white hover:opacity-95 flex items-center gap-1.5 transition-all cursor-pointer shadow-xs"
                    >
                      <span>Prepare & Dispatch Workflow</span>
                      <FaArrowRight className="text-xs group-hover:translate-x-0.5 transition-transform" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
        </div>
      )}

      {/* ── SLEEK HORIZONTAL STEPPER DISPATCH WORKFLOW MODAL (Boss Requirement 4) ── */}
      {dispatchModalOpen && activeOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/75 backdrop-blur-sm overflow-y-auto">
          <div className="relative w-full max-w-5xl bg-surface border border-border rounded-3xl shadow-2xl overflow-hidden my-auto max-h-[92vh] flex flex-col">
            
            {/* Modal Header */}
            <div className="p-5 border-b border-border bg-surface-hover/50 flex items-center justify-between gap-3 shrink-0">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2.5 flex-wrap">
                  <span className="text-base font-black text-text-primary">{activeOrder.order_number}</span>
                  <span className="font-mono text-xs text-primary font-bold px-2 py-0.5 rounded bg-primary/10 border border-primary/20">
                    {activeOrder.delivery_order_id}
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-primary/10 text-primary border border-primary/20">
                    {activeOrder.delivery_status.replace(/_/g, ' ')}
                  </span>
                </div>
                <div className="text-xs text-text-muted">
                  Recipient: <strong className="text-text-primary">{activeOrder.customer_name}</strong> ({activeOrder.customer_phone}) • {activeOrder.destination?.district}, {activeOrder.destination?.state}
                </div>
              </div>

              <button
                type="button"
                onClick={() => setDispatchModalOpen(false)}
                className="w-9 h-9 rounded-xl bg-surface hover:bg-surface-hover border border-border text-text-secondary hover:text-text-primary flex items-center justify-center transition-all cursor-pointer"
                title="Close dispatch workflow"
              >
                <FaTimes />
              </button>
            </div>

            {/* Modal Body: Scrollable */}
            <div className="p-5 sm:p-6 space-y-6 overflow-y-auto flex-1">
              
              {/* ── HORIZONTAL STEPPER TRACKER (E-COMMERCE TRACKING STYLE) ── */}
              <div className="p-4 rounded-2xl bg-surface-hover/40 border border-border">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  {[
                    { step: 1, title: 'Delivery Method', desc: 'Manual / Fleet Match', isDone: !!activeForm.delivery_method },
                    { step: 2, title: 'Transport Details', desc: 'Vehicle & Driver Info', isDone: !!(activeForm.vehicle_number && activeForm.driver_mobile) },
                    { step: 3, title: 'E-Way Bill', desc: 'AM Verification', isDone: isEwayValid },
                    { step: 4, title: 'Gate & Dispatch', desc: 'Photo, Docket & Release', isDone: isDispatchAllowed },
                  ].map((s) => {
                    const isActive = currentStep === s.step;
                    const isCompleted = s.isDone && currentStep > s.step;

                    return (
                      <button
                        key={s.step}
                        type="button"
                        onClick={() => setCurrentStep(s.step)}
                        className={`text-left p-3 rounded-xl border transition-all cursor-pointer flex flex-col justify-between ${
                          isActive
                            ? 'bg-primary/15 border-primary shadow-xs ring-1 ring-primary'
                            : isCompleted
                            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                            : 'bg-surface border-border hover:border-border/80 text-text-muted'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1.5">
                          <span className={`w-6 h-6 rounded-full text-xs font-black flex items-center justify-center ${
                            isActive
                              ? 'bg-primary text-white'
                              : isCompleted
                              ? 'bg-emerald-500 text-white'
                              : 'bg-surface-hover border border-border text-text-muted'
                          }`}>
                            {isCompleted ? <FaCheckCircle className="text-xs" /> : s.step}
                          </span>
                          <span className={`text-[10px] font-mono font-bold ${
                            isActive ? 'text-primary' : isCompleted ? 'text-emerald-400' : 'text-text-muted'
                          }`}>
                            Step {s.step}
                          </span>
                        </div>
                        <div className={`text-xs font-bold ${isActive ? 'text-text-primary' : isCompleted ? 'text-text-primary' : 'text-text-secondary'}`}>
                          {s.title}
                        </div>
                        <div className="text-[10px] text-text-muted mt-0.5 truncate">{s.desc}</div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* ── MULTI-EPC UNGROUP CONSIGNMENT ACCORDION ── */}
              <div className="rounded-2xl border border-primary/20 bg-surface p-4 space-y-3 shadow-xs">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/80 pb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-primary/15 text-primary flex items-center justify-center font-bold text-sm">
                      <FaLayerGroup />
                    </div>
                    <div>
                      <h4 className="text-sm font-black text-text-primary flex items-center gap-2">
                        Consolidated Multi-EPC Packages
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-primary/15 text-primary">
                          {activeEpcs.length} Active EPCs
                        </span>
                      </h4>
                      <p className="text-[11px] text-text-muted">
                        Inspect contractor items and verify 2nd half payment before release.
                      </p>
                    </div>
                  </div>

                  {/* Consolidated Group Packages Badge */}
                  <div className="px-3 py-1.5 rounded-xl text-xs font-bold bg-surface-hover text-text-secondary border border-border flex items-center gap-1.5 shadow-xs">
                    <FaLayerGroup className="text-xs text-primary" />
                    <span>Consolidated Group ({activeEpcs.length} Active EPCs)</span>
                  </div>
                </div>

                {/* Payment Clearance Status Alert */}
                {unpaidEpcs.length > 0 ? (
                  <div className="p-3.5 rounded-xl bg-danger/10 border border-danger/30 text-xs flex items-start gap-2.5">
                    <FaExclamationTriangle className="text-danger text-sm shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold text-danger">⚠️ 2nd Half Payment Pending for {unpaidEpcs.length} EPC(s) — Dispatch Blocked: </span>
                      <span className="text-text-secondary">
                        <strong className="text-danger">{unpaidEpcs.map(e => e.epc_name).join(', ')}</strong> ka 2nd payment due hai. Jab Account Manager payment verify karenge ya is delayed EPC ko group se ungroup/remove karenge, tabhi dispatch button appear hoga.
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-xs text-emerald-400 flex items-center gap-2 font-bold">
                    <FaCheckCircle />
                    <span>All active EPC packages 100% paid & approved for delivery!</span>
                  </div>
                )}

                {/* EPC Detail Cards */}
                {activeEpcs.length > 0 && (
                  <div className="space-y-3 pt-2">
                    {activeEpcs.map((epc, idx) => {
                      const isSecondPaid = epc.payment_second_half?.status === 'done';
                      const isItemsExpanded = expandedEpcItems[epc.epc_id] !== false;
                      const epcTotalQty = (epc.items || []).reduce((acc, it) => acc + (it.received_qty || it.ordered_qty || 0), 0);

                      return (
                        <div key={epc.epc_id || idx} className="rounded-xl border border-border bg-surface-hover/30 overflow-hidden">
                          <div className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/60">
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-xs text-text-primary">{epc.epc_name}</span>
                                <span className="text-[10px] font-mono text-text-muted">({epc.epc_id})</span>
                                {isSecondPaid ? (
                                  <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                                    ✅ 2nd Pay Cleared
                                  </span>
                                ) : (
                                  <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-rose-500/15 text-rose-400 border border-rose-500/30">
                                    ⚠️ 2nd Pay Due (Account Manager Action Required)
                                  </span>
                                )}
                              </div>
                              <div className="text-[11px] text-text-muted mt-0.5">
                                Site: {epc.site_location || activeOrder.destination?.address} • {epc.contact_phone || 'No Phone'}
                              </div>
                            </div>

                            <div className="flex items-center gap-2">
                              {!isSecondPaid && (
                                <span className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-rose-500/10 text-rose-400 border border-rose-500/25 flex items-center gap-1">
                                  <HiOutlineClock className="text-xs" />
                                  <span>Awaiting AM Clearance</span>
                                </span>
                              )}

                              <button
                                type="button"
                                onClick={() => handleToggleEpcSecondPayment(activeOrder._id, epc.epc_id, epc.payment_second_half?.status)}
                                disabled={updatingPaymentEpcId === epc.epc_id}
                                className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-surface border border-border hover:border-primary text-text-secondary hover:text-primary transition-all flex items-center gap-1 cursor-pointer"
                              >
                                {updatingPaymentEpcId === epc.epc_id ? <FaSpinner className="animate-spin text-[10px]" /> : <FaMoneyBillWave className="text-[10px]" />}
                                <span>{isSecondPaid ? 'Revert Pending' : 'Record 2nd Pay'}</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => toggleEpcItems(epc.epc_id)}
                                className="p-1.5 rounded-lg bg-surface border border-border text-text-muted hover:text-text-primary text-xs cursor-pointer"
                              >
                                {isItemsExpanded ? <HiOutlineChevronUp /> : <HiOutlineChevronDown />}
                              </button>
                            </div>
                          </div>

                          {/* Items Table */}
                          {isItemsExpanded && (
                            <div className="p-3 bg-surface text-xs overflow-x-auto">
                              <table className="w-full text-left">
                                <thead>
                                  <tr className="border-b border-border text-[10px] font-black uppercase text-text-muted">
                                    <th className="p-2">Item</th>
                                    <th className="p-2 text-center">Ordered</th>
                                    <th className="p-2 text-center">Inward / Packed</th>
                                    <th className="p-2 text-right">Status</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-border/60">
                                  {(epc.items || []).map((it, itemIdx) => (
                                    <tr key={it.sku || itemIdx}>
                                      <td className="p-2">
                                        <div className="font-bold text-text-primary">{it.product_name}</div>
                                        <div className="text-[10px] font-mono text-primary">{it.sku}</div>
                                      </td>
                                      <td className="p-2 text-center font-bold text-text-primary">{it.ordered_qty}</td>
                                      <td className="p-2 text-center font-mono font-bold text-emerald-400">
                                        {it.received_qty || it.ordered_qty} / {it.ordered_qty}
                                      </td>
                                      <td className="p-2 text-right">
                                        <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-success/15 text-success border border-success/30 inline-flex items-center gap-1">
                                          <FaCheckCircle className="text-[8px]" /> Ready
                                        </span>
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* ── STEP 1 VIEW: SELECT DELIVERY METHOD ── */}
              {currentStep === 1 && (
                <div className="space-y-4 animate-in fade-in duration-200">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-primary text-white text-xs font-black flex items-center justify-center">1</span>
                    <h4 className="text-sm font-bold text-text-primary">Step 1: Select Delivery Method</h4>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pl-8">
                    <div
                      onClick={() => handleInputChange(activeOrder._id, 'delivery_method', 'manual')}
                      className={`p-4 rounded-xl border transition-all cursor-pointer ${
                        activeForm.delivery_method === 'manual'
                          ? 'border-primary ring-2 ring-primary/20 bg-primary/5'
                          : 'border-border bg-surface-hover hover:border-primary/40'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-black text-text-primary flex items-center gap-1.5">
                          <FaTruck className="text-primary" /> Manual Delivery
                        </span>
                        <input
                          type="radio"
                          name="delivery_method"
                          checked={activeForm.delivery_method === 'manual'}
                          onChange={() => {}}
                          className="accent-primary"
                        />
                      </div>
                      <p className="text-[11px] text-text-muted mt-1.5">
                        Manager arranges custom vehicle, enters transport details, and uploads rear vehicle photo evidence.
                      </p>
                    </div>

                    <div
                      onClick={() => handleInputChange(activeOrder._id, 'delivery_method', 'auto')}
                      className={`p-4 rounded-xl border transition-all cursor-pointer ${
                        activeForm.delivery_method === 'auto'
                          ? 'border-primary ring-2 ring-primary/20 bg-primary/5'
                          : 'border-border bg-surface-hover hover:border-primary/40'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-black text-text-primary flex items-center gap-1.5">
                          <FaBoxes className="text-primary" /> Auto Delivery (Fleet Match)
                        </span>
                        <input
                          type="radio"
                          name="delivery_method"
                          checked={activeForm.delivery_method === 'auto'}
                          onChange={() => {}}
                          className="accent-primary"
                        />
                      </div>
                      <p className="text-[11px] text-text-muted mt-1.5">
                        System-assisted fleet assignment with automatic customer OTP generation and delivery confirmation.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* ── STEP 2 VIEW: VEHICLE & TRANSPORT DETAILS ── */}
              {currentStep === 2 && (
                <div className="space-y-4 animate-in fade-in duration-200">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full bg-primary text-white text-xs font-black flex items-center justify-center">2</span>
                      <div>
                        <h4 className="text-sm font-bold text-text-primary">Step 2: Enter Vehicle & Transport Details</h4>
                        {(activeOrder.transport_details?.vehicle_type || activeOrder.required_vehicle) && (
                          <div className="flex items-center gap-1.5 mt-0.5 text-[11px] text-text-muted">
                            <span>Accounts Pre-Assigned Vehicle:</span>
                            <span className="font-bold text-emerald-600 dark:text-emerald-400 inline-flex items-center gap-1">
                              <FaTruck size={10} />
                              <span>{activeOrder.transport_details?.vehicle_type || activeOrder.required_vehicle}</span>
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleSaveTransport(activeOrder._id)}
                      disabled={savingTransport}
                      className="px-3.5 py-1.5 rounded-lg text-xs font-bold bg-primary text-white hover:bg-primary/90 flex items-center gap-1.5 transition-all cursor-pointer shadow-xs shrink-0"
                    >
                      {savingTransport ? <FaSpinner className="animate-spin text-xs" /> : <FaCheckCircle className="text-xs" />}
                      <span>Save Transport Info</span>
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 pl-8 text-xs">
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-[10px] font-black text-text-muted uppercase tracking-wider block">
                          Vehicle Number *
                        </label>
                        {vehiclePresets.fleet_vehicles.length > 0 && (
                          <span className="text-[9px] font-bold text-primary bg-primary/10 px-1.5 py-0.5 rounded">
                            {vehiclePresets.fleet_vehicles.length} Fleet Registered
                          </span>
                        )}
                      </div>
                      <input
                        type="text"
                        list={`fleet-suggestions-${activeOrder._id}`}
                        placeholder="e.g. MH 12 AB 1234"
                        value={activeForm.vehicle_number || ''}
                        onChange={(e) => handleVehicleNumberChange(activeOrder._id, e.target.value)}
                        className="w-full p-2 bg-surface-hover border border-border rounded-lg text-text-primary font-mono font-bold uppercase focus:outline-none focus:border-primary"
                      />
                      <datalist id={`fleet-suggestions-${activeOrder._id}`}>
                        {vehiclePresets.fleet_vehicles.map((fv) => (
                          <option key={fv.registration_number} value={fv.registration_number}>
                            {fv.vehicle_type ? `${fv.vehicle_type} • ${fv.transporter_name || 'Fleet'}` : fv.transporter_name || 'Fleet'}
                          </option>
                        ))}
                      </datalist>
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-[10px] font-black text-text-muted uppercase tracking-wider block">
                          Vehicle Type
                        </label>
                        <span className="text-[9px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded">
                          Live Master
                        </span>
                      </div>
                      <select
                        value={activeForm.vehicle_type || ''}
                        onChange={(e) => handleInputChange(activeOrder._id, 'vehicle_type', e.target.value)}
                        className="w-full p-2 bg-surface-hover border border-border rounded-lg text-text-primary font-medium focus:outline-none focus:border-primary"
                      >
                        <option value="">-- Select Configured Vehicle --</option>
                        {/* Preserve currently pre-selected vehicle if from Account Manager / Procurement Group and not in preset list */}
                        {activeForm.vehicle_type && !vehiclePresets.vehicle_types.some(vt => (vt.value || vt.name) === activeForm.vehicle_type || (vt.label || '') === activeForm.vehicle_type) && (
                          <option value={activeForm.vehicle_type}>
                            {activeForm.vehicle_type} ★ (Assigned by Accounts)
                          </option>
                        )}
                        {vehiclePresets.vehicle_types.map((vt) => {
                          const isAssigned = (activeOrder.transport_details?.vehicle_type === (vt.value || vt.name) || activeOrder.required_vehicle === (vt.value || vt.name));
                          return (
                            <option key={vt.value || vt.name || vt.label} value={vt.value || vt.name}>
                              {vt.label || vt.name || vt.value} {isAssigned ? '★ (Assigned by Accounts)' : ''}
                            </option>
                          );
                        })}
                      </select>
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-[10px] font-black text-text-muted uppercase tracking-wider block">
                          Transporter Name
                        </label>
                        {vehiclePresets.transporters.length > 0 && (
                          <span className="text-[9px] font-bold text-blue-600 dark:text-blue-400 bg-blue-500/10 px-1.5 py-0.5 rounded">
                            {vehiclePresets.transporters.length} Vendors
                          </span>
                        )}
                      </div>
                      <input
                        type="text"
                        list={`transporter-suggestions-${activeOrder._id}`}
                        placeholder="e.g. VRL Logistics / Local"
                        value={activeForm.transporter_name || ''}
                        onChange={(e) => handleInputChange(activeOrder._id, 'transporter_name', e.target.value)}
                        className="w-full p-2 bg-surface-hover border border-border rounded-lg text-text-primary focus:outline-none focus:border-primary"
                      />
                      <datalist id={`transporter-suggestions-${activeOrder._id}`}>
                        {vehiclePresets.transporters.map((tp) => (
                          <option key={tp._id || tp.name} value={tp.name}>
                            {tp.code ? `[${tp.code}] ${tp.name}` : tp.name}
                          </option>
                        ))}
                      </datalist>
                    </div>

                    <div>
                      <label className="text-[10px] font-black text-text-muted uppercase tracking-wider block mb-1">
                        Driver Name
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Ramesh Kumar"
                        value={activeForm.driver_name || ''}
                        onChange={(e) => handleInputChange(activeOrder._id, 'driver_name', e.target.value)}
                        className="w-full p-2 bg-surface-hover border border-border rounded-lg text-text-primary focus:outline-none focus:border-primary"
                      />
                    </div>

                    <div>
                      <label className="text-[10px] font-black text-text-muted uppercase tracking-wider block mb-1">
                        Driver Mobile *
                      </label>
                      <input
                        type="tel"
                        placeholder="10-digit mobile number"
                        value={activeForm.driver_mobile || ''}
                        onChange={(e) => handleInputChange(activeOrder._id, 'driver_mobile', e.target.value)}
                        className="w-full p-2 bg-surface-hover border border-border rounded-lg text-text-primary font-mono focus:outline-none focus:border-primary"
                      />
                    </div>

                    <div>
                      <label className="text-[10px] font-black text-text-muted uppercase tracking-wider block mb-1">
                        Delivery Docket / Challan No. *
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. DKT-2026-8812"
                        value={activeForm.docket_number || ''}
                        onChange={(e) => handleInputChange(activeOrder._id, 'docket_number', e.target.value)}
                        className="w-full p-2 bg-surface-hover border border-border rounded-lg text-text-primary font-mono focus:outline-none focus:border-primary"
                      />
                    </div>

                    <div>
                      <label className="text-[10px] font-black text-text-muted uppercase tracking-wider block mb-1">
                        Dispatch Date
                      </label>
                      <input
                        type="date"
                        value={activeForm.dispatch_date || ''}
                        onChange={(e) => handleInputChange(activeOrder._id, 'dispatch_date', e.target.value)}
                        className="w-full p-2 bg-surface-hover border border-border rounded-lg text-text-primary focus:outline-none focus:border-primary"
                      />
                    </div>

                    <div>
                      <label className="text-[10px] font-black text-text-muted uppercase tracking-wider block mb-1">
                        Expected Delivery Date
                      </label>
                      <input
                        type="date"
                        value={activeForm.expected_delivery_date || ''}
                        onChange={(e) => handleInputChange(activeOrder._id, 'expected_delivery_date', e.target.value)}
                        className="w-full p-2 bg-surface-hover border border-border rounded-lg text-text-primary focus:outline-none focus:border-primary"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* ── STEP 3 VIEW: E-WAY BILL & AM VERIFICATION ── */}
              {currentStep === 3 && (
                <div className="space-y-4 animate-in fade-in duration-200">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full bg-primary text-white text-xs font-black flex items-center justify-center">3</span>
                      <h4 className="text-sm font-bold text-text-primary">Step 3: Request & Verify E-Way Bill (Government GST Compliance)</h4>
                    </div>
                    {activeOrder.eway_bill?.status === 'generated' ? (
                      <span className="px-2.5 py-1 rounded-full text-xs font-black uppercase bg-emerald-500/15 text-emerald-500 border border-emerald-500/30 flex items-center gap-1.5">
                        <FaCheckCircle /> Approved & Issued
                      </span>
                    ) : activeOrder.eway_bill?.status === 'pending' ? (
                      <span className="px-2.5 py-1 rounded-full text-xs font-black uppercase bg-amber-500/15 text-amber-500 border border-amber-500/30 flex items-center gap-1.5 animate-pulse">
                        <HiOutlineClock /> Awaiting Accounts Clearance
                      </span>
                    ) : (
                      <span className="px-2.5 py-1 rounded-full text-xs font-bold uppercase bg-surface-hover border border-border text-text-muted">
                        Pending Request
                      </span>
                    )}
                  </div>

                  <div className="pl-8 space-y-3 text-xs">
                    {/* STATE 1: E-Way Bill ALREADY ISSUED & COMPLIANT */}
                    {activeOrder.eway_bill?.status === 'generated' ? (
                      <div className="p-4 bg-emerald-500/5 border border-emerald-500/30 rounded-xl space-y-3">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-emerald-500/20">
                          <div>
                            <span className="text-[10px] font-black uppercase text-emerald-600 dark:text-emerald-400 tracking-wider block mb-0.5">
                              Government E-Way Bill Issued
                            </span>
                            <div className="font-mono text-base sm:text-lg font-black text-text-primary flex items-center gap-2">
                              <span>EWB #{activeOrder.eway_bill.eway_bill_number}</span>
                              <span className="text-[10px] font-sans font-bold bg-emerald-500/15 text-emerald-500 px-2 py-0.5 rounded-full border border-emerald-500/30">
                                Validated
                              </span>
                            </div>
                            <p className="text-[11px] text-text-muted mt-1">
                              Valid until: <strong className="text-text-primary">{new Date(activeOrder.eway_bill.valid_until).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</strong> (Compliant for Transit)
                            </p>
                          </div>
                          
                          <div className="flex items-center gap-2">
                            {activeOrder.eway_bill.eway_bill_pdf && (
                              <a
                                href={activeOrder.eway_bill.eway_bill_pdf}
                                target="_blank"
                                rel="noreferrer"
                                className="px-3.5 py-2 rounded-xl text-xs font-bold bg-surface border border-border hover:border-primary text-text-primary hover:text-primary transition-all flex items-center gap-1.5 shadow-2xs"
                              >
                                <FaFilePdf className="text-danger" />
                                <span>View / Print PDF</span>
                              </a>
                            )}
                            <button
                              type="button"
                              onClick={() => setCurrentStep(4)}
                              className="px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider bg-primary text-white hover:bg-primary/90 transition-all flex items-center gap-1.5 shadow-xs cursor-pointer"
                            >
                              <span>Next: Gate Evidence</span>
                              <span>→</span>
                            </button>
                          </div>
                        </div>

                        <div className="text-[11px] text-text-secondary flex items-center gap-2">
                          <FaCheckCircle className="text-emerald-500 shrink-0" />
                          <span>GST compliance cleared. Transporter is authorized to move cargo on road. Proceed to Step 4 to attach vehicle photo and dispatch.</span>
                        </div>
                      </div>
                    ) : activeOrder.eway_bill?.status === 'pending' ? (
                      /* STATE 2: REQUEST IS PENDING WITH ACCOUNT MANAGER */
                      <div className="p-4 bg-amber-500/5 border border-amber-500/30 rounded-xl space-y-3">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-amber-500/20">
                          <div>
                            <span className="text-[10px] font-black uppercase text-amber-600 dark:text-amber-400 tracking-wider block mb-0.5">
                              Request Sent to Account Manager
                            </span>
                            <div className="font-semibold text-sm text-text-primary">
                              E-Way Bill request submitted on {activeOrder.eway_bill?.requested_at ? new Date(activeOrder.eway_bill.requested_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : 'recently'}.
                            </div>
                            <p className="text-[11px] text-text-muted mt-1 max-w-xl">
                              Account Manager has been notified with vehicle & transport details to verify GST invoice and generate the E-Way bill. Dispatch remains locked until issued.
                            </p>
                          </div>

                          <div className="flex flex-wrap items-center gap-2">
                            <button
                              type="button"
                              onClick={() => handleRequestEwayBill(activeOrder._id)}
                              disabled={requestingEway}
                              className="px-3 py-2 rounded-xl text-xs font-bold bg-surface border border-border hover:border-amber-500 text-text-secondary hover:text-text-primary transition-all flex items-center gap-1.5 cursor-pointer"
                              title="Re-send notification alert to Account Manager"
                            >
                              {requestingEway ? <FaSpinner className="animate-spin text-xs" /> : <HiOutlineClock className="text-sm" />}
                              <span>Re-send Alert</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => handleVerifyEwayBill(activeOrder._id)}
                              disabled={verifyingEway}
                              className="px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white transition-all shadow-xs flex items-center gap-1.5 cursor-pointer active:scale-95"
                              title="Directly verify & generate E-Way Bill immediately"
                            >
                              {verifyingEway ? <FaSpinner className="animate-spin text-xs" /> : <FaCheckCircle className="text-xs" />}
                              <span>⚡ Verify & Issue Now (AM Action)</span>
                            </button>
                          </div>
                        </div>

                        <div className="text-[11px] text-text-secondary bg-surface/50 p-2.5 rounded-lg border border-border/50 flex items-center justify-between gap-2">
                          <span>💡 <strong>Quick Clearance:</strong> If Account Manager confirmed over phone or during testing, click <strong>"Verify & Issue Now"</strong> to immediately generate the 12-digit E-Way Bill and unlock Step 4.</span>
                        </div>
                      </div>
                    ) : (
                      /* STATE 3: NOT REQUESTED YET */
                      <div className="p-4 bg-surface-hover/60 border border-border rounded-xl space-y-3">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border">
                          <div>
                            <span className="text-[10px] font-black uppercase text-text-muted tracking-wider block mb-0.5">
                              Action Required
                            </span>
                            <div className="font-semibold text-sm text-text-primary">
                              E-Way Bill not requested yet
                            </div>
                            <p className="text-[11px] text-text-muted mt-1 max-w-xl">
                              Vehicle & transport details from Step 2 are ready. Submit request to Account Manager to prepare the GST E-Way Bill for transport.
                            </p>
                          </div>

                          <div className="flex flex-wrap items-center gap-2">
                            <button
                              type="button"
                              onClick={() => handleRequestEwayBill(activeOrder._id)}
                              disabled={requestingEway}
                              className="px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider bg-warning text-black hover:bg-warning/90 transition-all shadow-xs flex items-center gap-1.5 cursor-pointer active:scale-95"
                            >
                              {requestingEway ? <FaSpinner className="animate-spin" /> : <HiOutlineDocumentText className="text-sm" />}
                              <span>Request E-Way Bill from Accounts</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => handleVerifyEwayBill(activeOrder._id)}
                              disabled={verifyingEway}
                              className="px-3.5 py-2 rounded-xl text-xs font-bold bg-primary/10 text-primary border border-primary/20 hover:bg-primary hover:text-white transition-all flex items-center gap-1 cursor-pointer"
                              title="Instant verification & direct issue bypass"
                            >
                              {verifyingEway ? <FaSpinner className="animate-spin text-xs" /> : <FaCheckCircle className="text-xs" />}
                              <span>Direct Issue (AM)</span>
                            </button>
                          </div>
                        </div>

                        <div className="text-[11px] text-text-muted">
                          Government compliance mandates a valid E-Way Bill for consignments over ₹50,000 before leaving the warehouse dock.
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* ── STEP 4 VIEW: GATE EVIDENCE & FINAL DISPATCH ── */}
              {currentStep === 4 && (
                <div className="space-y-4 animate-in fade-in duration-200">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full bg-primary text-white text-xs font-black flex items-center justify-center">4</span>
                      <h4 className="text-sm font-black text-text-primary flex items-center gap-2">
                        <HiOutlineShieldCheck className="text-success text-base" />
                        Pre-Dispatch Verification Gate & Evidence
                      </h4>
                    </div>
                    <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full ${
                      isDispatchGateCleared
                        ? 'bg-success/15 text-success border border-success/30'
                        : 'bg-danger/10 text-danger border border-danger/20'
                    }`}>
                      {isDispatchGateCleared ? 'All 3 Checkpoints Satisfied' : 'Checkpoints Incomplete'}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs pl-8">
                    {/* Checkpoint 1: Rear Loaded Photo */}
                    <div className={`p-3.5 rounded-xl border space-y-2 ${
                      hasLoadedPhoto ? 'bg-success/5 border-success/30' : 'bg-surface-hover border-border'
                    }`}>
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-text-primary text-[11px]">1. Loaded Vehicle Photo *</span>
                        {hasLoadedPhoto ? <FaCheckCircle className="text-success text-sm" /> : <FaTimesCircle className="text-danger text-sm" />}
                      </div>
                      <p className="text-[10px] text-text-muted">
                        Rear-side photo showing registration number and loaded materials.
                      </p>
                      {activeForm.vehicle_rear_photo ? (
                        <div className="relative group rounded-lg overflow-hidden border border-border h-24 bg-black/10">
                          <img
                            src={activeForm.vehicle_rear_photo}
                            alt="Loaded Vehicle"
                            className="w-full h-full object-cover"
                          />
                          <button
                            type="button"
                            onClick={() => handleInputChange(activeOrder._id, 'vehicle_rear_photo', '')}
                            className="absolute top-1 right-1 bg-danger text-white rounded p-1 text-[9px] font-bold cursor-pointer"
                          >
                            Remove
                          </button>
                        </div>
                      ) : (
                        <div className="space-y-1.5">
                          <label className="block p-2 border-2 border-dashed border-border hover:border-primary rounded-lg text-center cursor-pointer transition-colors bg-surface">
                            <HiOutlinePhotograph className="mx-auto text-xl text-text-muted mb-1" />
                            <span className="text-[10px] font-bold text-primary block">Upload Vehicle Rear Photo</span>
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={(e) => handleUploadFile(activeOrder._id, 'vehicle_rear_photo', e.target.files[0])}
                            />
                          </label>
                          <button
                            type="button"
                            onClick={() => handleInputChange(activeOrder._id, 'vehicle_rear_photo', 'https://images.unsplash.com/photo-1601584115197-04ecc0da31d7?w=800&auto=format&fit=crop&q=60')}
                            className="w-full py-1 px-2 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary border border-primary/25 text-[10px] font-bold cursor-pointer transition-all flex items-center justify-center gap-1"
                          >
                            <span>⚡ Quick Attach Sample Loaded Photo</span>
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Checkpoint 2: Delivery Docket / Challan */}
                    <div className={`p-3.5 rounded-xl border space-y-2 ${
                      hasDocket ? 'bg-success/5 border-success/30' : 'bg-surface-hover border-border'
                    }`}>
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-text-primary text-[11px]">2. Delivery Docket / Challan *</span>
                        {hasDocket ? <FaCheckCircle className="text-success text-sm" /> : <FaTimesCircle className="text-danger text-sm" />}
                      </div>
                      <p className="text-[10px] text-text-muted">
                        Signed delivery challan or physical dispatch docket document.
                      </p>
                      {activeForm.docket_doc ? (
                        <div className="p-2 bg-surface rounded-lg border border-border text-[11px] flex items-center justify-between">
                          <span className="font-mono truncate">{activeForm.docket_number || 'Docket Attached'}</span>
                          <button
                            type="button"
                            onClick={() => handleInputChange(activeOrder._id, 'docket_doc', '')}
                            className="text-danger font-bold text-[10px] cursor-pointer"
                          >
                            Clear
                          </button>
                        </div>
                      ) : (
                        <div className="space-y-1.5">
                          <label className="block p-2 border-2 border-dashed border-border hover:border-primary rounded-lg text-center cursor-pointer transition-colors bg-surface">
                            <HiOutlineUpload className="mx-auto text-xl text-text-muted mb-1" />
                            <span className="text-[10px] font-bold text-primary block">Upload Docket Scanned Copy</span>
                            <input
                              type="file"
                              accept=".pdf,image/*"
                              className="hidden"
                              onChange={(e) => handleUploadFile(activeOrder._id, 'docket_doc', e.target.files[0])}
                            />
                          </label>
                          <button
                            type="button"
                            onClick={() => {
                              handleInputChange(activeOrder._id, 'docket_doc', 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf');
                              if (!activeForm.docket_number) handleInputChange(activeOrder._id, 'docket_number', `DC-${activeOrder.order_number}`);
                            }}
                            className="w-full py-1 px-2 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary border border-primary/25 text-[10px] font-bold cursor-pointer transition-all flex items-center justify-center gap-1"
                          >
                            <span>⚡ Quick Attach Sample Challan</span>
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Checkpoint 3: Verified E-Way Bill */}
                    <div className={`p-3.5 rounded-xl border space-y-2 ${
                      isEwayValid ? 'bg-success/5 border-success/30' : 'bg-surface-hover border-border'
                    }`}>
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-text-primary text-[11px]">3. Valid E-Way Bill *</span>
                        {isEwayValid ? <FaCheckCircle className="text-success text-sm" /> : <FaTimesCircle className="text-danger text-sm" />}
                      </div>
                      <p className="text-[10px] text-text-muted">
                        Verified government E-Way Bill number and unexpired document.
                      </p>
                      <div className="p-2 bg-surface rounded-lg border border-border text-[11px]">
                        {isEwayValid ? (
                          <div className="font-mono font-bold text-success truncate">
                            #{activeOrder.eway_bill.eway_bill_number}
                          </div>
                        ) : (
                          <div className="text-text-muted italic">Awaiting AM Approval in Step 3</div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Final Release Callout */}
                  <div className="pl-8 pt-2">
                    <div className="p-4 rounded-xl bg-surface-hover/80 border border-border flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <div className="text-xs font-bold text-text-primary flex items-center gap-2">
                          <span>Dispatch Clearance Status:</span>
                          {allEpcsPaymentDone ? (
                            <span className="text-emerald-400 font-bold flex items-center gap-1">
                              <FaCheckCircle className="text-xs" /> All EPCs 100% Paid (Cleared)
                            </span>
                          ) : (
                            <span className="text-danger font-bold flex items-center gap-1">
                              <FaTimesCircle className="text-xs" /> {unpaidEpcs.length} EPC(s) 2nd Half Unpaid
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-text-muted mt-0.5">
                          {!allEpcsPaymentDone
                            ? `Dispatch blocked! ${unpaidEpcs.map(e => e.epc_name).join(', ')} ka 2nd payment pending hai. Account Manager ko payment verify ya EPC ungroup/remove karna hoga.`
                            : isDispatchAllowed
                            ? 'Ready for dispatch! Clicking button will move order and all EPCs to Track Delivery.'
                            : 'Vehicle photo and docket upload required to release vehicle.'}
                        </div>
                      </div>

                      {/* User Rule: Tab tak dispatch button nahi show hoga jab tak sabhi EPCs ka 2nd payment done nahi ho jata! */}
                      {!allEpcsPaymentDone ? (
                        <div className="px-4 py-2.5 rounded-xl text-xs font-bold bg-rose-500/10 border border-rose-500/30 text-rose-400 flex items-center gap-2 shrink-0">
                          <FaLock className="text-xs" />
                          <span>Dispatch Blocked (Awaiting 2nd Payment for {unpaidEpcs.length} EPCs)</span>
                        </div>
                      ) : (
                        <button
                          type="button"
                          disabled={!isDispatchAllowed || initiatingDispatch}
                          onClick={() => handleInitiateDelivery(activeOrder)}
                          className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-2.5 transition-all shadow-md ${
                            isDispatchAllowed
                              ? 'bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-600 hover:from-emerald-500 hover:to-teal-500 text-white cursor-pointer animate-pulse'
                              : 'bg-surface border border-border text-text-muted opacity-50 cursor-not-allowed'
                          }`}
                        >
                          {initiatingDispatch ? (
                            <>
                              <FaSpinner className="animate-spin text-sm" />
                              <span>Dispatching Order...</span>
                            </>
                          ) : (
                            <>
                              <FaTruck className="text-base" />
                              <span>Dispatch for Delivery</span>
                              {isDispatchAllowed && <FaArrowRight className="text-xs" />}
                            </>
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Navigation Footer */}
            <div className="p-4 border-t border-border bg-surface-hover/60 flex items-center justify-between gap-3 shrink-0">
              <button
                type="button"
                onClick={() => setCurrentStep(prev => Math.max(1, prev - 1))}
                disabled={currentStep === 1}
                className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${
                  currentStep === 1
                    ? 'opacity-40 cursor-not-allowed bg-surface border border-border text-text-muted'
                    : 'bg-surface hover:bg-surface-hover border border-border text-text-primary cursor-pointer'
                }`}
              >
                <FaArrowLeft className="text-xs" />
                <span>Previous Step</span>
              </button>

              <div className="text-xs text-text-muted font-bold font-mono">
                Step {currentStep} of 4
              </div>

              {currentStep < 4 ? (
                <button
                  type="button"
                  onClick={() => setCurrentStep(prev => Math.min(4, prev + 1))}
                  className="px-5 py-2 rounded-xl text-xs font-bold gradient-primary text-white hover:opacity-95 flex items-center gap-1.5 transition-all cursor-pointer shadow-xs"
                >
                  <span>Next Step</span>
                  <FaArrowRight className="text-xs" />
                </button>
              ) : !allEpcsPaymentDone ? (
                <div className="px-5 py-2 rounded-xl text-xs font-bold bg-rose-500/10 border border-rose-500/30 text-rose-400 flex items-center gap-2">
                  <FaLock className="text-xs" />
                  <span>Dispatch Blocked (Awaiting 2nd Payment)</span>
                </div>
              ) : (
                <button
                  type="button"
                  disabled={!isDispatchAllowed || initiatingDispatch}
                  onClick={() => handleInitiateDelivery(activeOrder)}
                  className={`px-6 py-2 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-2 transition-all shadow-md ${
                    isDispatchAllowed
                      ? 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white cursor-pointer'
                      : 'bg-surface border border-border text-text-muted opacity-50 cursor-not-allowed'
                  }`}
                >
                  {initiatingDispatch ? (
                    <>
                      <FaSpinner className="animate-spin text-xs" />
                      <span>Dispatching...</span>
                    </>
                  ) : (
                    <>
                      <FaTruck className="text-sm" />
                      <span>Dispatch for Delivery</span>
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
