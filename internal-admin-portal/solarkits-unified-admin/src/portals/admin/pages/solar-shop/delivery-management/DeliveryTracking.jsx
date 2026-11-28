import React, { useState, useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { setAlert } from '../../../features/alert.slice';
import {
  FaShippingFast,
  FaSearch,
  FaFilter,
  FaFileAlt,
  FaCheckCircle,
  FaMapMarkerAlt,
  FaTruck,
  FaCamera,
  FaChevronDown,
  FaChevronUp,
  FaKey,
  FaUpload,
  FaSpinner,
  FaClipboardList,
} from 'react-icons/fa';
import PageHeader from '../../../components/PageHeader';
import Button from '../../../components/Button';
import CustomInput from '../../../components/CustomInput';
import Dialog from '../../../components/Dialog';
import Loader from '../../../components/Loader';
import { deliveryApi } from '../../../api/deliveryApi';
import { authHeaderObj } from '@/app/authHeader';
import DeliveryDocumentsModal from '../../../../../components/DeliveryDocumentsModal';

const JOURNEY_STAGES = [
  'delivery_created',
  'vehicle_assigned',
  'pickup_scheduled',
  'loading',
  'dispatched',
  'in_transit',
  'reached_destination',
  'delivered',
  'pod_confirmed',
  'closed',
];

const STAGE_LABELS = {
  delivery_created: 'Created',
  vehicle_assigned: 'Vehicle Assigned',
  pickup_scheduled: 'Pickup Scheduled',
  loading: 'Loading',
  dispatched: 'Dispatched',
  in_transit: 'In Transit',
  reached_destination: 'At Destination',
  delivered: 'Delivered',
  pod_confirmed: 'POD Confirmed',
  closed: 'Trip Closed',
};

export default function DeliveryTracking() {
  const dispatch = useDispatch();
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(false);
  const [expandedTripId, setExpandedTripId] = useState(null);

  // Filters (14 filters from Section 14)
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Individual Stop POD Modal
  const [podModalOpen, setPodModalOpen] = useState(false);
  const [selectedTripForPod, setSelectedTripForPod] = useState(null);
  const [selectedStopForPod, setSelectedStopForPod] = useState(null);
  const [podUrl, setPodUrl] = useState('');
  const [podNotes, setPodNotes] = useState('');
  const [receiverName, setReceiverName] = useState('');
  const [receiverPhone, setReceiverPhone] = useState('');
  const [signedSlipUrl, setSignedSlipUrl] = useState('');
  const [uploadingPodFile, setUploadingPodFile] = useState(false);
  const [uploadingSlipFile, setUploadingSlipFile] = useState(false);

  // Delivery Documents & Dual Verification Modal
  const [docModalState, setDocModalState] = useState({
    open: false,
    tripId: null,
    stopNumber: 1,
    stopIndex: 0,
    focusDoc: null,
  });

  // Trip Status Advancement Modal
  const [statusModalOpen, setStatusModalOpen] = useState(false);
  const [selectedTripForStatus, setSelectedTripForStatus] = useState(null);
  const [nextStatus, setNextStatus] = useState('');

  const showAlert = (message, type = 'success') => {
    dispatch(setAlert({ type, message }));
  };

  const loadTrips = async () => {
    setLoading(true);
    try {
      const params = {};
      if (statusFilter) params.status = statusFilter;
      if (search) params.search = search;
      const res = await deliveryApi.getTrackingList(params);
      if (res.status === 'success') {
        setTrips(res.data || []);
      }
    } catch (err) {
      console.error(err);
      showAlert('Failed to load delivery trips', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTrips();
  }, [statusFilter]);

  const handleOpenPodModal = (trip, stop) => {
    setSelectedTripForPod(trip);
    setSelectedStopForPod(stop);
    setPodUrl(stop.pod?.pod_url || '');
    setSignedSlipUrl(stop.pod?.signed_slip_url || '');
    setPodNotes('');
    setReceiverName(stop.destination?.contact_name || '');
    setReceiverPhone(stop.destination?.contact_phone || '');
    setPodModalOpen(true);
  };

  const handleUploadPodAttachment = async (file, type = 'pod') => {
    if (!file) return;
    try {
      if (type === 'pod') setUploadingPodFile(true);
      else setUploadingSlipFile(true);

      const res = await deliveryApi.uploadDeliveryDocumentFile(file, 'delivery_pod');
      if (res?.status === 'success' && res.url) {
        if (type === 'pod') setPodUrl(res.url);
        else setSignedSlipUrl(res.url);
        showAlert(`${type === 'pod' ? 'POD Photo' : 'Signed Slip'} uploaded!`);
      } else {
        showAlert('File upload failed to return URL.', 'error');
      }
    } catch (err) {
      showAlert(err.response?.data?.message || 'Upload failed', 'error');
    } finally {
      if (type === 'pod') setUploadingPodFile(false);
      else setUploadingSlipFile(false);
    }
  };

  const handleConfirmPodSubmit = async (e) => {
    e.preventDefault();
    if (!podUrl.trim()) {
      showAlert('Please upload POD photo proof or enter valid URL.', 'error');
      return;
    }

    try {
      await deliveryApi.confirmStopPod(selectedTripForPod._id, selectedStopForPod.stop_number, {
        pod_url: podUrl,
        signed_slip_url: signedSlipUrl || undefined,
        pod_notes: podNotes,
        receiver_name: receiverName,
        receiver_phone: receiverPhone,
        verification_mode: 'manual_photo',
      });

      showAlert(`Stop ${selectedStopForPod.stop_number} POD confirmed successfully.`);
      setPodModalOpen(false);
      loadTrips();
    } catch (err) {
      showAlert(err.response?.data?.message || 'Failed to confirm POD', 'error');
    }
  };

  const handleAdvanceStatus = async (trip, targetStatus) => {
    try {
      await deliveryApi.updateTripStatus(trip._id, { status: targetStatus });
      showAlert(`Trip status updated to ${STAGE_LABELS[targetStatus] || targetStatus}`);
      loadTrips();
    } catch (err) {
      showAlert(err.response?.data?.message || 'Failed to update status', 'error');
    }
  };

  return (
    <div className="p-6 space-y-6">
      <PageHeader
        title="Track Delivery Orders – 10-Step Journey"
        subtitle="Monitor single orders & multi-stop consolidated trips, capture individual stop Proof of Delivery (POD), and trace status milestones."
        icon={FaShippingFast}
        actions={
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative">
              <input
                type="text"
                placeholder="Search Delivery / Order #..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && loadTrips()}
                className="pl-8 pr-3 py-1.5 bg-white/15 border border-white/25 rounded-xl text-sm text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-white/50 w-60"
              />
              <FaSearch className="absolute left-2.5 top-2.5 text-white/70 text-xs" />
            </div>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-white/15 border border-white/25 px-3 py-1.5 rounded-xl text-sm text-white font-semibold focus:outline-none cursor-pointer [&>option]:text-slate-800"
            >
              <option value="">All Trip Statuses</option>
              {JOURNEY_STAGES.map((s) => (
                <option key={s} value={s}>{STAGE_LABELS[s]}</option>
              ))}
            </select>
          </div>
        }
      />

      {loading ? (
        <Loader text="Loading tracking journey..." />
      ) : trips.length === 0 ? (
        <div className="py-12 text-center bg-white rounded-xl border border-slate-200 text-slate-500">
          No delivery trips found matching filters.
        </div>
      ) : (
        <div className="space-y-4">
          {trips.map((trip) => {
            const isExpanded = expandedTripId === trip._id;
            const currentStageIdx = JOURNEY_STAGES.indexOf(trip.status);

            return (
              <div
                key={trip._id}
                className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden hover:border-slate-300 transition-all"
              >
                {/* Trip Header */}
                <div className="p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-slate-50/50 border-b border-slate-100">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-slate-900 text-base">{trip.delivery_number}</span>
                      <span className={`text-xs px-2 py-0.5 rounded font-semibold ${
                        trip.delivery_type === 'consolidated_master_trip'
                          ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                          : 'bg-blue-50 text-blue-700 border border-blue-200'
                      }`}>
                        {trip.delivery_type === 'consolidated_master_trip' ? 'Master Multi-Stop Trip' : 'Single Delivery'}
                      </span>
                      <span className="text-xs text-slate-400">• {trip.stops.length} Stop(s)</span>
                    </div>

                    <div className="text-xs text-slate-600 flex flex-wrap items-center gap-4">
                      <span>Warehouse: <strong className="text-slate-800 font-mono">{trip.warehouse_id?.warehouse_code || 'WH-01'}</strong></span>
                      <span>Provider: <strong className="text-slate-800">{trip.service_provider_id?.name || 'In-House'}</strong></span>
                      <span>Vehicle: <strong className="text-slate-800 font-mono">{trip.vehicles_allocated[0]?.registration_number}</strong></span>
                      <span>Driver: <strong className="text-slate-800">{trip.vehicles_allocated[0]?.driver_name} ({trip.vehicles_allocated[0]?.driver_mobile})</strong></span>
                    </div>
                  </div>

                  {/* Actions & Next Stage */}
                  <div className="flex items-center gap-3">
                    {currentStageIdx < JOURNEY_STAGES.length - 1 ? (
                      <Button
                        onClick={() => handleAdvanceStatus(trip, JOURNEY_STAGES[currentStageIdx + 1])}
                        className="text-xs bg-blue-600 hover:bg-blue-700 text-white font-semibold flex items-center gap-1.5"
                      >
                        Advance to {STAGE_LABELS[JOURNEY_STAGES[currentStageIdx + 1]]}
                      </Button>
                    ) : null}

                    <button
                      onClick={() => setExpandedTripId(isExpanded ? null : trip._id)}
                      className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg"
                      title={isExpanded ? 'Collapse' : 'View Stops & Details'}
                    >
                      {isExpanded ? <FaChevronUp /> : <FaChevronDown />}
                    </button>
                  </div>
                </div>

                {/* 10-Stage Horizontal Stepper */}
                <div className="px-5 py-4 overflow-x-auto bg-white border-b border-slate-100">
                  <div className="flex items-center min-w-[750px] justify-between relative">
                    <div className="absolute left-0 top-3 w-full h-0.5 bg-slate-200 -z-0" />
                    {JOURNEY_STAGES.map((stg, sIdx) => {
                      const isCompleted = sIdx < currentStageIdx;
                      const isCurrent = sIdx === currentStageIdx;
                      return (
                        <div key={stg} className="flex flex-col items-center relative z-10 text-center">
                          <div
                            className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold transition-all ${
                              isCompleted
                                ? 'bg-emerald-600 text-white'
                                : isCurrent
                                ? 'bg-blue-600 text-white ring-4 ring-blue-100 animate-pulse'
                                : 'bg-slate-200 text-slate-500'
                            }`}
                          >
                            {isCompleted ? '✓' : sIdx + 1}
                          </div>
                          <span
                            className={`text-[10px] mt-1.5 font-medium whitespace-nowrap ${
                              isCurrent
                                ? 'text-blue-600 font-bold'
                                : isCompleted
                                ? 'text-slate-700'
                                : 'text-slate-400'
                            }`}
                          >
                            {STAGE_LABELS[stg]}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Expandable Multi-Stop Breakdown & Individual POD */}
                {isExpanded ? (
                  <div className="p-5 bg-slate-50/70 space-y-4">
                    <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                      Trip Stops & Independent Order Deliveries ({trip.stops.length})
                    </h4>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {trip.stops.map((stop) => {
                        const isStopDelivered = stop.stop_status === 'pod_confirmed' || stop.stop_status === 'delivered';
                        return (
                          <div key={stop._id} className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm space-y-3">
                            <div className="flex items-start justify-between">
                              <div>
                                <span className="text-[10px] font-bold bg-blue-100 text-blue-800 px-2 py-0.5 rounded">
                                  Stop {stop.stop_number}
                                </span>
                                <div className="font-mono font-bold text-slate-900 text-sm mt-1">{stop.order_number}</div>
                                <div className="text-xs text-slate-600">{stop.recipient_name}</div>
                              </div>
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full capitalize ${
                                isStopDelivered
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                  : 'bg-amber-50 text-amber-700 border border-amber-200'
                              }`}>
                                {stop.stop_status?.replace('_', ' ')}
                              </span>
                            </div>

                            <div className="text-xs text-slate-600 space-y-1">
                              <div>{stop.destination?.address || 'Site Delivery'}</div>
                              <div className="text-slate-500 font-mono">
                                {stop.destination?.district_name}, {stop.destination?.pincode}
                              </div>
                              <div className="text-[11px] font-medium text-slate-800">
                                Cargo: {stop.cargo?.total_kits} kits • {stop.cargo?.total_weight_kg} KG
                              </div>
                            </div>

                            {/* Individual Stop POD & Delivery Documents */}
                            <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
                              <div className="flex flex-wrap items-center gap-2">
                                {stop.pod?.pod_url && (
                                  <a
                                    href={stop.pod.pod_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-xs font-semibold text-blue-600 hover:underline flex items-center gap-1"
                                  >
                                    <FaFileAlt /> View POD Proof
                                  </a>
                                )}
                                {stop.pod?.signed_slip_url && (
                                  <a
                                    href={stop.pod.signed_slip_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-xs font-semibold text-emerald-600 hover:underline flex items-center gap-1"
                                  >
                                    <FaFileAlt /> Signed Slip
                                  </a>
                                )}
                                {stop.pod?.otp_verified && (
                                  <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 text-[10px] font-bold flex items-center gap-1">
                                    <FaKey className="text-[9px]" /> OTP Verified
                                  </span>
                                )}
                                {!stop.pod?.pod_url && !stop.pod?.otp_verified && (
                                  <Button
                                    onClick={() => handleOpenPodModal(trip, stop)}
                                    className="px-2.5 py-1 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-semibold flex items-center gap-1"
                                  >
                                    <FaCamera className="text-xs" /> Upload POD
                                  </Button>
                                )}
                                <Button
                                  onClick={() =>
                                    setDocModalState({
                                      open: true,
                                      tripId: trip._id,
                                      stopNumber: stop.stop_number,
                                      stopIndex: idx,
                                      focusDoc: null,
                                    })
                                  }
                                  className="px-2.5 py-1 text-xs bg-amber-500 hover:bg-amber-600 text-white font-semibold flex items-center gap-1"
                                >
                                  <FaClipboardList className="text-xs" /> Delivery Docs (4) / OTP
                                </Button>
                              </div>
                              {stop.delivered_at ? (
                                <span className="text-[10px] text-slate-400">
                                  {new Date(stop.delivered_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                              ) : null}
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* 3-Tier Commercial Reconciliation Display */}
                    <div className="p-3 bg-white rounded-lg border border-slate-200 flex flex-wrap items-center justify-between text-xs text-slate-600">
                      <div>Customer Charged: <strong className="text-slate-900 font-mono">₹{trip.customer_delivery_charge?.toLocaleString()}</strong></div>
                      <div>Transporter Cost: <strong className="text-slate-900 font-mono">₹{trip.actual_vendor_cost?.toLocaleString()}</strong> (+ ₹{trip.gst_amount} GST)</div>
                      <div>Benchmark: <strong className="text-slate-900 font-mono">₹{trip.company_benchmark_cost?.toLocaleString()}</strong></div>
                      <div>Net Margin: <strong className="text-emerald-700 font-mono">₹{trip.delivery_margin?.toLocaleString()}</strong></div>
                      {trip.estimated_savings > 0 ? (
                        <div>Consolidation Savings: <strong className="text-indigo-700 font-mono">+₹{trip.estimated_savings?.toLocaleString()}</strong></div>
                      ) : null}
                    </div>
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      )}

      {/* Individual Stop POD Modal (Section 9) */}
      <Dialog
        isOpen={podModalOpen}
        onClose={() => setPodModalOpen(false)}
        title={`Confirm POD: Stop ${selectedStopForPod?.stop_number} (${selectedStopForPod?.order_number})`}
        width="max-w-md"
      >
        <form onSubmit={handleConfirmPodSubmit} className="p-6 space-y-4">
          <p className="text-xs text-slate-600">
            Proof of Delivery (POD) must be captured separately for each order/stop before that order is closed.
          </p>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Upload Cargo Delivery Photo Proof *
            </label>
            <div className="flex items-center gap-2 mb-2">
              <label className="flex-1 px-3 py-2 border border-dashed border-slate-300 hover:border-emerald-500 rounded-lg text-xs text-center cursor-pointer bg-slate-50 font-semibold text-slate-700 flex items-center justify-center gap-1.5">
                {uploadingPodFile ? <FaSpinner className="animate-spin" /> : <FaUpload />}
                <span>{uploadingPodFile ? 'Uploading Photo...' : podUrl ? 'Replace POD Photo' : 'Choose POD Photo File'}</span>
                <input
                  type="file"
                  accept="image/*,.pdf"
                  className="hidden"
                  onChange={(e) => handleUploadPodAttachment(e.target.files?.[0], 'pod')}
                />
              </label>
            </div>
            <CustomInput
              label="Or Uploaded POD URL *"
              placeholder="Uploaded file URL appears here automatically"
              value={podUrl}
              onChange={(e) => setPodUrl(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Signed Physical Slip Photo (Optional)
            </label>
            <label className="flex px-3 py-2 border border-dashed border-slate-300 hover:border-blue-500 rounded-lg text-xs text-center cursor-pointer bg-slate-50 font-semibold text-slate-700 items-center justify-center gap-1.5">
              {uploadingSlipFile ? <FaSpinner className="animate-spin" /> : <FaUpload />}
              <span>{uploadingSlipFile ? 'Uploading Signed Slip...' : signedSlipUrl ? '✓ Signed Slip Uploaded (Click to Replace)' : 'Upload Signed Slip Image / PDF'}</span>
              <input
                type="file"
                accept="image/*,.pdf"
                className="hidden"
                onChange={(e) => handleUploadPodAttachment(e.target.files?.[0], 'slip')}
              />
            </label>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <CustomInput
              label="Receiver Name"
              value={receiverName}
              onChange={(e) => setReceiverName(e.target.value)}
            />
            <CustomInput
              label="Receiver Phone"
              value={receiverPhone}
              onChange={(e) => setReceiverPhone(e.target.value)}
            />
          </div>

          <CustomInput
            label="Delivery Notes"
            placeholder="e.g. Handed over to warehouse supervisor with physical stamp"
            value={podNotes}
            onChange={(e) => setPodNotes(e.target.value)}
          />

          <div className="flex justify-end gap-3 pt-3 border-t border-slate-200">
            <Button type="button" onClick={() => setPodModalOpen(false)} className="bg-slate-100 text-slate-700">
              Cancel
            </Button>
            <Button type="submit" className="bg-emerald-600 text-white">
              Confirm Stop POD
            </Button>
          </div>
        </form>
      </Dialog>

      <DeliveryDocumentsModal
        isOpen={docModalState.open}
        onClose={() => setDocModalState((prev) => ({ ...prev, open: false }))}
        orderId={docModalState.tripId}
        stopNumber={docModalState.stopNumber}
        stopIndex={docModalState.stopIndex}
        portalMode="admin"
        getHeaders={authHeaderObj}
        initialFocusDoc={docModalState.focusDoc}
        onUpdated={loadTrips}
      />
    </div>
  );
}
