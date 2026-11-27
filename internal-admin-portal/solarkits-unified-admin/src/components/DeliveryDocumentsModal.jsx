import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import {
  FaFileAlt,
  FaTruck,
  FaClipboardCheck,
  FaCheckCircle,
  FaCamera,
  FaKey,
  FaPrint,
  FaExternalLinkAlt,
  FaUpload,
  FaSpinner,
  FaTimes,
  FaFileSignature,
  FaSignature,
  FaStamp,
  FaExclamationTriangle,
  FaEye,
  FaCheckSquare,
} from 'react-icons/fa';

const RAW_API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/admin-api';

function resolveMediaUrl(url) {
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('blob:')) return url;
  const backendOrigin = RAW_API_BASE.replace(/\/admin-api$|\/warehouse-api$|\/api$/, '');
  return `${backendOrigin}${url.startsWith('/') ? '' : '/'}${url}`;
}

export default function DeliveryDocumentsModal({
  isOpen,
  onClose,
  orderId,
  stopNumber = 1,
  stopIndex = 0,
  portalMode = 'warehouse', // 'warehouse' | 'admin'
  getHeaders,
  onUpdated,
  initialFocusDoc = null, // 'schedule' | 'driver' | 'pod' | 'inspection'
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [orderData, setOrderData] = useState(null);
  const [settings, setSettings] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [activeDocTab, setActiveDocTab] = useState(initialFocusDoc || 'all');
  const [showPrintableManifest, setShowPrintableManifest] = useState(false);

  // Driver Acceptance state
  const [driverLicense, setDriverLicense] = useState('');
  const [odometerStart, setOdometerStart] = useState('');
  const [sealNumber, setSealNumber] = useState('');
  const [vehicleFitmentOk, setVehicleFitmentOk] = useState(true);
  const [driverFileUrl, setDriverFileUrl] = useState('');
  const [driverNotes, setDriverNotes] = useState('');
  const [uploadingDriverFile, setUploadingDriverFile] = useState(false);
  const [savingDriverDoc, setSavingDriverDoc] = useState(false);

  // Dual POD state (OTP + Manual Photo Proof Fallback)
  const [podMode, setPodMode] = useState('otp'); // 'otp' | 'manual_photo'
  const [otpInput, setOtpInput] = useState('');
  const [otpPreviewMsg, setOtpPreviewMsg] = useState('');
  const [sendingOtp, setSendingOtp] = useState(false);
  const [bypassReason, setBypassReason] = useState('');
  const [siteCargoPhotoUrl, setSiteCargoPhotoUrl] = useState('');
  const [signedSlipPhotoUrl, setSignedSlipPhotoUrl] = useState('');
  const [uploadingCargoPhoto, setUploadingCargoPhoto] = useState(false);
  const [uploadingSlipPhoto, setUploadingSlipPhoto] = useState(false);
  const [receiverName, setReceiverName] = useState('');
  const [receiverPhone, setReceiverPhone] = useState('');
  const [podRemarks, setPodRemarks] = useState('');
  const [verifyingPod, setVerifyingPod] = useState(false);

  // Material Inspection Checklist state
  const [checklist, setChecklist] = useState({
    panel_cracks_ok: true,
    panel_count_ok: true,
    inverter_serial_ok: true,
    inverter_seal_ok: true,
    bos_cables_earthing_ok: true,
    structure_hdg_ok: true,
    damage_or_shortage_found: false,
    shortage_remarks: '',
  });
  const [inspectionPhotoUrl, setInspectionPhotoUrl] = useState('');
  const [uploadingInspectionPhoto, setUploadingInspectionPhoto] = useState(false);
  const [savingInspection, setSavingInspection] = useState(false);

  // Image lightbox preview
  const [lightboxUrl, setLightboxUrl] = useState('');

  const headers = useCallback(() => (getHeaders ? getHeaders() : {}), [getHeaders]);

  const fetchDocuments = useCallback(async () => {
    if (!isOpen || !orderId) return;
    setLoading(true);
    setError('');
    try {
      let res;
      if (portalMode === 'warehouse') {
        res = await axios.get(`${RAW_API_BASE}/warehouse/delivery-orders/${orderId}/documents`, {
          headers: headers(),
        });
      } else {
        res = await axios.get(
          `${RAW_API_BASE}/delivery-document-settings/order-docs/${orderId}?stop_index=${stopIndex}`,
          { headers: headers() }
        );
      }

      const payload = res.data?.data;
      if (!payload) throw new Error('Unable to load delivery documents');

      const ord = payload.order || payload.delivery_order;
      setOrderData(ord);
      setSettings(payload.settings || null);
      const docsList = payload.documents || [];
      setDocuments(docsList);

      // Hydrate form states cleanly from live DB values (zero fake defaults)
      const driverDoc = docsList.find((d) => d.code === 'DEL_DOC_DRIVER_ACCEPTANCE');
      if (driverDoc) {
        setDriverLicense(driverDoc.metadata?.driver_license || '');
        setOdometerStart(driverDoc.metadata?.odometer_start || '');
        setSealNumber(driverDoc.metadata?.seal_number || '');
        setVehicleFitmentOk(driverDoc.metadata?.vehicle_fitment_ok !== false);
        setDriverFileUrl(driverDoc.file_url || '');
        setDriverNotes(driverDoc.notes || '');
      }

      const podDoc = docsList.find((d) => d.code === 'DEL_DOC_POD');
      if (podDoc) {
        const defaultReason = podDoc.pod_rules?.otp_bypass_reasons?.[0] || '';
        setBypassReason(podDoc.verification?.otp_bypass_reason || defaultReason);
        setSiteCargoPhotoUrl(podDoc.verification?.site_cargo_photo_url || '');
        setSignedSlipPhotoUrl(podDoc.verification?.signed_pod_photo_url || '');
        setReceiverName(
          podDoc.verification?.receiver_name ||
            ord?.stop?.recipient_name ||
            ord?.customer_name ||
            ''
        );
        setReceiverPhone(
          podDoc.verification?.receiver_phone ||
            ord?.stop?.destination?.contact_phone ||
            ord?.customer_phone ||
            ''
        );
        if (ord?.delivery_method === 'manual') {
          setPodMode('manual_photo');
        } else if (podDoc.pod_rules?.allow_otp_verification) {
          setPodMode('otp');
        } else {
          setPodMode('manual_photo');
        }
      }

      const inspDoc = docsList.find((d) => d.code === 'DEL_DOC_INSPECTION_HANDOVER');
      if (inspDoc) {
        setInspectionPhotoUrl(inspDoc.file_url || '');
        if (inspDoc.metadata && Object.keys(inspDoc.metadata).length > 0) {
          setChecklist((prev) => ({
            ...prev,
            ...inspDoc.metadata,
          }));
        }
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to fetch delivery documents');
    } finally {
      setLoading(false);
    }
  }, [isOpen, orderId, portalMode, stopIndex, headers]);

  useEffect(() => {
    if (isOpen) {
      setNotice('');
      setOtpPreviewMsg('');
      setOtpInput('');
      setShowPrintableManifest(initialFocusDoc === 'schedule');
      setActiveDocTab(initialFocusDoc || 'all');
      fetchDocuments();
    }
  }, [isOpen, initialFocusDoc, fetchDocuments]);

  const uploadRealFile = async (file, setBusy, onSuccessUrl) => {
    if (!file) return;
    setBusy(true);
    setError('');
    try {
      const formData = new FormData();
      formData.append('file', file);
      const endpoint =
        portalMode === 'warehouse'
          ? `${RAW_API_BASE}/warehouse/delivery-orders/upload-evidence`
          : `${RAW_API_BASE}/delivery-document-settings/upload`;

      const res = await axios.post(endpoint, formData, {
        headers: {
          ...headers(),
          'Content-Type': 'multipart/form-data',
        },
      });
      if (res.data?.url) {
        onSuccessUrl(res.data.url);
        setNotice('File uploaded to cloud storage. Click Save / Confirm to link it to this order.');
      } else {
        throw new Error('Upload succeeded without file URL');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'File upload failed. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  const handleSaveDriverAcceptance = async (e) => {
    e.preventDefault();
    if (!driverFileUrl) {
      setError('Please upload Driver LR Bilty / Loading Acceptance slip photo or PDF.');
      return;
    }
    setSavingDriverDoc(true);
    setError('');
    try {
      const payload = {
        document_code: 'DEL_DOC_DRIVER_ACCEPTANCE',
        document_title: settings?.doc_driver_acceptance?.title || 'Driver Delivery Acceptance & LR Bilty Form',
        party_type: 'driver',
        status: 'uploaded',
        file_url: driverFileUrl,
        notes: driverNotes,
        uploaded_by_role: 'driver',
        stop_number: stopNumber,
        metadata: {
          driver_license: driverLicense,
          odometer_start: odometerStart,
          seal_number: sealNumber,
          vehicle_fitment_ok: vehicleFitmentOk,
        },
      };

      const url =
        portalMode === 'warehouse'
          ? `${RAW_API_BASE}/warehouse/delivery-orders/${orderId}/documents`
          : `${RAW_API_BASE}/delivery-document-settings/order-docs/${orderId}`;
      await axios.post(url, payload, { headers: headers() });

      setNotice('Driver Acceptance & LR Bilty uploaded and saved successfully!');
      await fetchDocuments();
      if (onUpdated) onUpdated();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save driver acceptance document.');
    } finally {
      setSavingDriverDoc(false);
    }
  };

  const handleSendOtp = async () => {
    setSendingOtp(true);
    setError('');
    try {
      const url =
        portalMode === 'warehouse'
          ? `${RAW_API_BASE}/warehouse/delivery-orders/${orderId}/send-otp`
          : `${RAW_API_BASE}/delivery-management/tracking/${orderId}/stops/${stopNumber}/send-otp`;
      const res = await axios.post(url, {}, { headers: headers() });
      const msg = res.data?.message || 'OTP sent to buyer.';
      const preview = res.data?.otp_preview ? ` (OTP: ${res.data.otp_preview})` : '';
      setOtpPreviewMsg(`${msg}${preview}`);
      setNotice(`${msg}${preview}`);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to send OTP.');
    } finally {
      setSendingOtp(false);
    }
  };

  const handleVerifyPod = async (e) => {
    e.preventDefault();
    setVerifyingPod(true);
    setError('');
    try {
      if (podMode === 'otp') {
        if (!otpInput || otpInput.trim().length < 4) {
          setError('Please enter valid delivery OTP code.');
          setVerifyingPod(false);
          return;
        }
        if (portalMode === 'warehouse') {
          await axios.post(
            `${RAW_API_BASE}/warehouse/delivery-orders/${orderId}/verify-otp`,
            { otp_code: otpInput.trim(), receiver_name: receiverName, receiver_phone: receiverPhone },
            { headers: headers() }
          );
        } else {
          await axios.post(
            `${RAW_API_BASE}/delivery-document-settings/verify-delivery`,
            {
              delivery_order_id: orderId,
              stop_number: stopNumber,
              mode: 'otp',
              otp_code: otpInput.trim(),
              receiver_name: receiverName,
              receiver_phone: receiverPhone,
              notes: podRemarks,
            },
            { headers: headers() }
          );
        }
        setNotice('POD verified via Customer OTP! Document marked Verified.');
      } else {
        if (!siteCargoPhotoUrl && !signedSlipPhotoUrl) {
          setError('Please upload at least one photo (Unloaded Site Cargo or Signed Physical Slip).');
          setVerifyingPod(false);
          return;
        }
        if (portalMode === 'warehouse') {
          await axios.post(
            `${RAW_API_BASE}/warehouse/delivery-orders/${orderId}/complete-manual`,
            {
              destination_photo: siteCargoPhotoUrl || signedSlipPhotoUrl,
              signed_slip_photo: signedSlipPhotoUrl,
              otp_bypass_reason: bypassReason,
              receiver_name: receiverName,
              receiver_phone: receiverPhone,
              remarks: podRemarks,
              is_otp_fallback: orderData?.delivery_method === 'auto',
            },
            { headers: headers() }
          );
        } else {
          await axios.post(
            `${RAW_API_BASE}/delivery-document-settings/verify-delivery`,
            {
              delivery_order_id: orderId,
              stop_number: stopNumber,
              mode: 'manual_photo',
              site_cargo_photo_url: siteCargoPhotoUrl,
              signed_pod_photo_url: signedSlipPhotoUrl,
              otp_bypass_reason: bypassReason,
              receiver_name: receiverName,
              receiver_phone: receiverPhone,
              notes: podRemarks,
            },
            { headers: headers() }
          );
        }
        setNotice('POD verified via Uploaded Photo Proof! Delivery completed.');
      }
      await fetchDocuments();
      if (onUpdated) onUpdated();
    } catch (err) {
      setError(err.response?.data?.message || 'Verification failed.');
    } finally {
      setVerifyingPod(false);
    }
  };

  const handleSaveInspectionChecklist = async (e) => {
    e.preventDefault();
    setSavingInspection(true);
    setError('');
    try {
      const payload = {
        document_code: 'DEL_DOC_INSPECTION_HANDOVER',
        document_title: settings?.doc_inspection_handover?.title || 'Material Inspection & Handover Checklist',
        party_type: 'joint',
        status: 'verified',
        file_url: inspectionPhotoUrl,
        notes: checklist.shortage_remarks || (checklist.damage_or_shortage_found ? 'Damage/shortage logged' : 'All items inspected cleanly'),
        uploaded_by_role: portalMode === 'warehouse' ? 'warehouse' : 'admin',
        stop_number: stopNumber,
        metadata: checklist,
      };
      const url =
        portalMode === 'warehouse'
          ? `${RAW_API_BASE}/warehouse/delivery-orders/${orderId}/documents`
          : `${RAW_API_BASE}/delivery-document-settings/order-docs/${orderId}`;
      await axios.post(url, payload, { headers: headers() });

      setNotice('Material Inspection & Handover Checklist saved and marked Verified!');
      await fetchDocuments();
      if (onUpdated) onUpdated();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save inspection checklist.');
    } finally {
      setSavingInspection(false);
    }
  };

  if (!isOpen) return null;

  const docSchedule = documents.find((d) => d.code === 'DEL_DOC_SCHEDULE');
  const docDriver = documents.find((d) => d.code === 'DEL_DOC_DRIVER_ACCEPTANCE');
  const docPod = documents.find((d) => d.code === 'DEL_DOC_POD');
  const docInsp = documents.find((d) => d.code === 'DEL_DOC_INSPECTION_HANDOVER');

  const statusBadge = (status) => {
    if (status === 'verified') {
      return (
        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-600 border border-emerald-500/30">
          Verified ✓
        </span>
      );
    }
    if (status === 'uploaded' || status === 'generated') {
      return (
        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/15 text-blue-600 border border-blue-500/30">
          {status === 'generated' ? 'Generated & Ready ✓' : 'Uploaded ✓'}
        </span>
      );
    }
    return (
      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-600 border border-amber-500/30">
        Pending
      </span>
    );
  };

  const manifestWh = orderData?.warehouse || orderData?.warehouse_id || null;
  const manifestStop = orderData?.stop || null;
  const manifestVehicle =
    orderData?.vehicles?.[0] ||
    (orderData?.transport_details?.vehicle_number || orderData?.transport_details?.driver_name
      ? orderData.transport_details
      : null);
  const manifestItems =
    manifestStop?.cargo?.kit_items ||
    orderData?.items ||
    [];

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden text-slate-800 dark:text-slate-100">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between gap-3 bg-slate-50 dark:bg-slate-800/60">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <FaFileAlt className="text-amber-500" />
              <h3 className="text-base sm:text-lg font-bold">Delivery Documents & Verification Hub</h3>
              {orderData && (
                <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200">
                  {orderData.delivery_number || orderData.delivery_order_id || orderData.order_number}
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Download Schedule PDF, upload Driver LR / Cargo Proof, verify POD (OTP or Photo), and inspect uploaded documents.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg border border-slate-300 dark:border-slate-600 flex items-center justify-center text-slate-500 hover:text-slate-900 dark:hover:text-white cursor-pointer"
          >
            <FaTimes />
          </button>
        </div>

        {/* Body */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4 flex-1">
          {error && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs font-semibold flex items-center justify-between">
              <span>{error}</span>
              <button type="button" onClick={() => setError('')} className="ml-2 font-bold">✕</button>
            </div>
          )}
          {notice && (
            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-400 text-xs font-semibold flex items-center justify-between">
              <span>{notice}</span>
              <button type="button" onClick={() => setNotice('')} className="ml-2 font-bold">✕</button>
            </div>
          )}

          {loading ? (
            <div className="py-12 text-center text-slate-500 space-y-2">
              <FaSpinner className="animate-spin text-2xl mx-auto text-amber-500" />
              <p className="text-xs font-medium">Loading live delivery documents...</p>
            </div>
          ) : (
            <>
              {/* Filter / Focus Pills */}
              <div className="flex items-center gap-2 overflow-x-auto pb-1 border-b border-slate-200 dark:border-slate-700 text-xs">
                {[
                  { id: 'all', label: 'All 4 Documents' },
                  { id: 'schedule', label: '1. Schedule PDF', doc: docSchedule },
                  { id: 'driver', label: '2. Driver Acceptance', doc: docDriver },
                  { id: 'pod', label: '3. POD (OTP / Photo)', doc: docPod },
                  { id: 'inspection', label: '4. Material Inspection', doc: docInsp },
                ].map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setActiveDocTab(t.id)}
                    className={`px-3 py-1.5 rounded-lg font-semibold whitespace-nowrap flex items-center gap-1.5 cursor-pointer transition ${
                      activeDocTab === t.id
                        ? 'bg-amber-500 text-white shadow-xs'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                    }`}
                  >
                    <span>{t.label}</span>
                    {t.doc && (
                      <span className="text-[9px] font-bold uppercase opacity-90">
                        ({t.doc.status})
                      </span>
                    )}
                  </button>
                ))}
              </div>

              {/* ── DOCUMENT 1: Delivery Schedule & Dispatch Order (System Auto-Generated) ── */}
              {(activeDocTab === 'all' || activeDocTab === 'schedule') && docSchedule && (
                <div className="border border-slate-200 dark:border-slate-700 rounded-xl p-4 space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <FaFileAlt className="text-amber-500" />
                        <h4 className="text-sm font-bold">{docSchedule.title}</h4>
                        {statusBadge(docSchedule.status)}
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5">{docSchedule.description}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowPrintableManifest((v) => !v)}
                      className="px-3 py-1.5 rounded-lg bg-slate-900 dark:bg-amber-500 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                    >
                      <FaPrint /> {showPrintableManifest ? 'Hide Manifest' : 'View / Print Schedule PDF'}
                    </button>
                  </div>

                  {showPrintableManifest && (
                    <div className="p-5 bg-white text-slate-900 border border-slate-300 rounded-xl space-y-4 text-xs shadow-sm">
                      <div className="flex items-start justify-between border-b-2 border-slate-900 pb-3">
                        <div>
                          <h3 className="text-base font-black">{settings?.company_name || ''}</h3>
                          <p className="text-[11px] text-slate-500">{settings?.trade_name || ''}</p>
                          <p className="text-[11px] text-slate-600">
                            {settings?.support_phone ? `Helpline: ${settings.support_phone}` : ''}{' '}
                            {settings?.support_email ? `| ${settings.support_email}` : ''}
                          </p>
                        </div>
                        <div className="text-right">
                          <span className="px-2.5 py-1 bg-amber-500 text-white text-[10px] font-bold rounded">
                            {docSchedule.header_title || 'DELIVERY SCHEDULE'}
                          </span>
                          <p className="font-mono font-bold mt-1.5">
                            REF: {orderData?.delivery_number || orderData?.delivery_order_id || orderData?.order_number}
                          </p>
                          <p className="text-[10px] text-slate-500">
                            Order Date: {orderData?.created_at ? new Date(orderData.created_at).toLocaleDateString('en-IN') : 'N/A'}
                          </p>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-50 p-3 rounded-lg border border-slate-200">
                        <div>
                          <p className="font-bold uppercase text-[10px] text-slate-500 mb-0.5">Dispatching Warehouse</p>
                          <p className="font-semibold">
                            {manifestWh?.warehouse_name || manifestWh?.name || orderData?.warehouse_code || 'Not Assigned'}
                          </p>
                          <p className="text-slate-600">{manifestWh?.address || 'Address not on record'}</p>
                        </div>
                        <div>
                          <p className="font-bold uppercase text-[10px] text-slate-500 mb-0.5">Consignee & Site</p>
                          <p className="font-semibold">
                            {manifestStop?.recipient_name || orderData?.customer_name || 'N/A'}
                          </p>
                          <p className="text-slate-600">
                            {manifestStop?.destination?.address || orderData?.destination?.address || 'Site Address Not Available'}
                          </p>
                          <p className="text-slate-600">
                            Contact: {manifestStop?.destination?.contact_phone || orderData?.customer_phone || 'N/A'}
                          </p>
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-2 bg-amber-50 border border-amber-200 p-2.5 rounded-lg">
                        <div>
                          <span className="text-[10px] font-bold text-amber-800 uppercase block">Vehicle No</span>
                          <span className="font-mono font-bold">{manifestVehicle?.registration_number || manifestVehicle?.vehicle_number || 'Pending'}</span>
                        </div>
                        <div>
                          <span className="text-[10px] font-bold text-amber-800 uppercase block">Driver</span>
                          <span className="font-semibold">{manifestVehicle?.driver_name || 'Pending'}</span>
                        </div>
                        <div>
                          <span className="text-[10px] font-bold text-amber-800 uppercase block">Contact</span>
                          <span className="font-mono">{manifestVehicle?.driver_mobile || manifestVehicle?.driver_contact || 'Pending'}</span>
                        </div>
                      </div>

                      <table className="w-full border border-slate-300 text-xs">
                        <thead className="bg-slate-100 border-b border-slate-300 font-bold">
                          <tr>
                            <th className="p-2 text-left">#</th>
                            <th className="p-2 text-left">Item / Kit Description</th>
                            <th className="p-2 text-center">Qty</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200">
                          {manifestItems.map((it, idx) => (
                            <tr key={idx}>
                              <td className="p-2 font-mono">{idx + 1}</td>
                              <td className="p-2">
                                <strong>{it.kit_name || it.product_name || it.item_name}</strong>
                                {it.sku && <span className="ml-2 text-[10px] text-slate-500 font-mono">({it.sku})</span>}
                              </td>
                              <td className="p-2 text-center font-bold">{it.ordered_qty || it.quantity || 1}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>

                      {docSchedule.terms_and_conditions?.length > 0 && (
                        <div className="p-2.5 bg-slate-50 border border-slate-200 rounded text-[11px] text-slate-700">
                          <strong className="block mb-1 uppercase text-[10px]">Terms & Conditions:</strong>
                          <ol className="list-decimal list-inside space-y-0.5">
                            {docSchedule.terms_and_conditions.map((t, i) => (
                              <li key={i}>{t}</li>
                            ))}
                          </ol>
                        </div>
                      )}

                      <div className="flex items-center justify-between pt-2">
                        <div className="text-[10px] text-slate-500 flex items-center gap-3">
                          <span className="flex items-center gap-1"><FaSignature /> Driver Sign</span>
                          <span className="flex items-center gap-1"><FaStamp /> Consignee Sign</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => window.print()}
                          className="px-3 py-1 bg-amber-500 text-white rounded text-xs font-bold cursor-pointer"
                        >
                          Print / Save PDF
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* ── DOCUMENT 2: Driver Acceptance & LR Bilty ── */}
              {(activeDocTab === 'all' || activeDocTab === 'driver') && docDriver && (
                <div className="border border-slate-200 dark:border-slate-700 rounded-xl p-4 space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <FaTruck className="text-blue-500" />
                        <h4 className="text-sm font-bold">{docDriver.title}</h4>
                        {statusBadge(docDriver.status)}
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5">{docDriver.description}</p>
                    </div>
                  </div>

                  {/* Show existing uploaded file so user can verify it immediately */}
                  {docDriver.file_url && (
                    <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-xs flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <span className="font-bold text-emerald-700 dark:text-emerald-400">
                          ✓ Uploaded Driver LR / Acceptance File
                        </span>
                        {docDriver.uploaded_at && (
                          <span className="ml-2 text-[11px] text-slate-500">
                            ({new Date(docDriver.uploaded_at).toLocaleString('en-IN')})
                          </span>
                        )}
                        {(docDriver.metadata?.seal_number || docDriver.metadata?.driver_license) && (
                          <p className="text-[11px] text-slate-600 dark:text-slate-300 mt-0.5 font-mono">
                            {docDriver.metadata?.driver_license ? `DL: ${docDriver.metadata.driver_license} ` : ''}
                            {docDriver.metadata?.seal_number ? `• Seal: ${docDriver.metadata.seal_number} ` : ''}
                            {docDriver.metadata?.odometer_start ? `• Odometer: ${docDriver.metadata.odometer_start} km` : ''}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <a
                          href={resolveMediaUrl(docDriver.file_url)}
                          target="_blank"
                          rel="noreferrer"
                          className="px-2.5 py-1 rounded bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 text-blue-600 font-bold flex items-center gap-1 hover:underline"
                        >
                          <FaExternalLinkAlt /> View / Open File
                        </a>
                        {docDriver.secondary_file_url && (
                          <button
                            type="button"
                            onClick={() => setLightboxUrl(resolveMediaUrl(docDriver.secondary_file_url))}
                            className="px-2.5 py-1 rounded bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200 font-bold flex items-center gap-1 cursor-pointer"
                          >
                            <FaEye /> Loaded Truck Photo
                          </button>
                        )}
                      </div>
                    </div>
                  )}

                  <form onSubmit={handleSaveDriverAcceptance} className="space-y-3 pt-1">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
                      {docDriver.driver_rules?.require_driver_license !== false && (
                        <div>
                          <label className="block text-[11px] font-semibold mb-1">Driver License (DL) No</label>
                          <input
                            type="text"
                            value={driverLicense}
                            onChange={(e) => setDriverLicense(e.target.value)}
                            placeholder="Enter DL Number"
                            className="w-full border border-slate-300 dark:border-slate-600 rounded-lg p-2 bg-transparent font-mono"
                          />
                        </div>
                      )}
                      {docDriver.driver_rules?.require_odometer_start !== false && (
                        <div>
                          <label className="block text-[11px] font-semibold mb-1">Start Odometer (km)</label>
                          <input
                            type="text"
                            value={odometerStart}
                            onChange={(e) => setOdometerStart(e.target.value)}
                            placeholder="e.g. 45210"
                            className="w-full border border-slate-300 dark:border-slate-600 rounded-lg p-2 bg-transparent font-mono"
                          />
                        </div>
                      )}
                      {docDriver.driver_rules?.require_seal_number !== false && (
                        <div>
                          <label className="block text-[11px] font-semibold mb-1">Truck Seal Number</label>
                          <input
                            type="text"
                            value={sealNumber}
                            onChange={(e) => setSealNumber(e.target.value)}
                            placeholder="Enter Security Seal #"
                            className="w-full border border-slate-300 dark:border-slate-600 rounded-lg p-2 bg-transparent font-mono"
                          />
                        </div>
                      )}
                    </div>

                    {docDriver.driver_rules?.require_vehicle_fitment_check !== false && (
                      <label className="flex items-center gap-2 text-xs cursor-pointer">
                        <input
                          type="checkbox"
                          checked={vehicleFitmentOk}
                          onChange={(e) => setVehicleFitmentOk(e.target.checked)}
                          className="accent-amber-500"
                        />
                        <span>Vehicle waterproof tarpaulin / pallet cushioning fitment verified.</span>
                      </label>
                    )}

                    <div className="flex flex-wrap items-center gap-3 text-xs">
                      <label className="px-3 py-2 rounded-lg border-2 border-dashed border-slate-300 dark:border-slate-600 hover:border-blue-500 cursor-pointer flex items-center gap-2 font-semibold text-blue-600">
                        {uploadingDriverFile ? <FaSpinner className="animate-spin" /> : <FaUpload />}
                        <span>
                          {uploadingDriverFile
                            ? 'Uploading File...'
                            : driverFileUrl
                            ? 'Replace Signed LR / Acceptance File'
                            : 'Upload Signed LR / Acceptance File (Image or PDF)'}
                        </span>
                        <input
                          type="file"
                          accept="image/*,.pdf"
                          className="hidden"
                          onChange={(e) =>
                            uploadRealFile(e.target.files?.[0], setUploadingDriverFile, setDriverFileUrl)
                          }
                        />
                      </label>

                      <button
                        type="submit"
                        disabled={savingDriverDoc || !driverFileUrl}
                        className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
                      >
                        {savingDriverDoc ? <FaSpinner className="animate-spin" /> : <FaCheckCircle />}
                        <span>Save Driver Acceptance Doc</span>
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {/* ── DOCUMENT 3: Proof of Delivery (POD) & Dual Verification ── */}
              {(activeDocTab === 'all' || activeDocTab === 'pod') && docPod && (
                <div className="border border-slate-200 dark:border-slate-700 rounded-xl p-4 space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <FaClipboardCheck className="text-emerald-500" />
                        <h4 className="text-sm font-bold">{docPod.title}</h4>
                        {statusBadge(docPod.status)}
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5">{docPod.description}</p>
                    </div>
                  </div>

                  {/* Verified POD Evidence Viewer (Check Uploaded Photo / OTP Proof) */}
                  {(docPod.status === 'verified' || docPod.verification?.site_cargo_photo_url || docPod.verification?.signed_pod_photo_url || docPod.verification?.otp_verified) && (
                    <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 space-y-2.5 text-xs">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="font-bold text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5">
                          <FaCheckCircle />
                          {docPod.verification?.otp_verified
                            ? 'Verified via Customer OTP'
                            : 'Verified via Manual Photo Proof'}
                        </span>
                        {docPod.verification?.confirmed_at && (
                          <span className="text-[11px] text-slate-500">
                            {new Date(docPod.verification.confirmed_at).toLocaleString('en-IN')}
                          </span>
                        )}
                      </div>

                      <div className="text-[11px] text-slate-700 dark:text-slate-300 space-y-0.5">
                        {docPod.verification?.receiver_name && (
                          <div>Receiver: <strong>{docPod.verification.receiver_name}</strong> ({docPod.verification.receiver_phone || 'N/A'})</div>
                        )}
                        {docPod.verification?.otp_bypass_reason && (
                          <div>OTP Bypass Reason: <strong>{docPod.verification.otp_bypass_reason}</strong></div>
                        )}
                        {docPod.notes && <div>Notes: {docPod.notes}</div>}
                      </div>

                      {(docPod.verification?.site_cargo_photo_url || docPod.verification?.signed_pod_photo_url) && (
                        <div className="flex flex-wrap gap-3 pt-1">
                          {docPod.verification?.site_cargo_photo_url && (
                            <div className="border border-slate-300 dark:border-slate-600 rounded-lg p-1.5 bg-white dark:bg-slate-800">
                              <span className="block text-[10px] font-bold mb-1">1. Site Cargo Photo</span>
                              <img
                                src={resolveMediaUrl(docPod.verification.site_cargo_photo_url)}
                                alt="Site Cargo POD"
                                onClick={() => setLightboxUrl(resolveMediaUrl(docPod.verification.site_cargo_photo_url))}
                                className="h-24 w-36 object-cover rounded cursor-pointer hover:opacity-90"
                              />
                              <a
                                href={resolveMediaUrl(docPod.verification.site_cargo_photo_url)}
                                target="_blank"
                                rel="noreferrer"
                                className="mt-1 inline-flex items-center gap-1 text-[10px] text-blue-600 font-bold hover:underline"
                              >
                                <FaExternalLinkAlt /> Open Full Size
                              </a>
                            </div>
                          )}
                          {docPod.verification?.signed_pod_photo_url && (
                            <div className="border border-slate-300 dark:border-slate-600 rounded-lg p-1.5 bg-white dark:bg-slate-800">
                              <span className="block text-[10px] font-bold mb-1">2. Signed Physical Slip</span>
                              <img
                                src={resolveMediaUrl(docPod.verification.signed_pod_photo_url)}
                                alt="Signed POD Slip"
                                onClick={() => setLightboxUrl(resolveMediaUrl(docPod.verification.signed_pod_photo_url))}
                                className="h-24 w-36 object-cover rounded cursor-pointer hover:opacity-90"
                              />
                              <a
                                href={resolveMediaUrl(docPod.verification.signed_pod_photo_url)}
                                target="_blank"
                                rel="noreferrer"
                                className="mt-1 inline-flex items-center gap-1 text-[10px] text-blue-600 font-bold hover:underline"
                              >
                                <FaExternalLinkAlt /> Open Full Size
                              </a>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Dual Verification Form (Always accessible if not yet verified or to submit fallback) */}
                  {docPod.status !== 'verified' && (
                    <form onSubmit={handleVerifyPod} className="space-y-3 pt-1">
                      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-700 pb-2 text-xs">
                        {docPod.pod_rules?.allow_otp_verification !== false && (
                          <button
                            type="button"
                            onClick={() => setPodMode('otp')}
                            className={`px-3 py-1.5 rounded-lg font-bold flex items-center gap-1.5 cursor-pointer ${
                              podMode === 'otp' ? 'bg-blue-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-600'
                            }`}
                          >
                            <FaKey /> Option A: Customer OTP
                          </button>
                        )}
                        {docPod.pod_rules?.allow_manual_photo_verification !== false && (
                          <button
                            type="button"
                            onClick={() => setPodMode('manual_photo')}
                            className={`px-3 py-1.5 rounded-lg font-bold flex items-center gap-1.5 cursor-pointer ${
                              podMode === 'manual_photo' ? 'bg-emerald-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-600'
                            }`}
                          >
                            <FaCamera /> Option B: Manual Photo Proof
                          </button>
                        )}
                      </div>

                      {podMode === 'otp' ? (
                        <div className="space-y-3 text-xs">
                          <div className="p-2.5 rounded-lg bg-blue-500/10 border border-blue-500/20 flex flex-wrap items-center justify-between gap-2">
                            <span>Generate and send 6-digit OTP to customer phone: <strong>{receiverPhone || 'Registered Number'}</strong></span>
                            <button
                              type="button"
                              onClick={handleSendOtp}
                              disabled={sendingOtp}
                              className="px-3 py-1.5 rounded bg-blue-600 text-white font-bold cursor-pointer flex items-center gap-1"
                            >
                              {sendingOtp ? <FaSpinner className="animate-spin" /> : <FaKey />}
                              <span>{otpPreviewMsg ? 'Resend OTP' : 'Send OTP'}</span>
                            </button>
                          </div>
                          {otpPreviewMsg && (
                            <div className="p-2 rounded bg-emerald-500/10 border border-emerald-500/30 font-mono font-bold text-emerald-700 dark:text-emerald-300 text-center">
                              {otpPreviewMsg}
                            </div>
                          )}
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                            <div>
                              <label className="block font-semibold mb-1">Enter 6-Digit OTP *</label>
                              <input
                                type="text"
                                maxLength={6}
                                value={otpInput}
                                onChange={(e) => setOtpInput(e.target.value)}
                                placeholder="Enter OTP"
                                className="w-full border border-slate-300 dark:border-slate-600 rounded-lg p-2 font-mono text-center tracking-widest font-bold bg-transparent"
                              />
                            </div>
                            <div>
                              <label className="block font-semibold mb-1">Receiver Name</label>
                              <input
                                type="text"
                                value={receiverName}
                                onChange={(e) => setReceiverName(e.target.value)}
                                className="w-full border border-slate-300 dark:border-slate-600 rounded-lg p-2 bg-transparent"
                              />
                            </div>
                          </div>

                          {docPod.pod_rules?.allow_manual_photo_verification !== false && (
                            <div className="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/30 flex flex-wrap items-center justify-between gap-2">
                              <span className="text-[11px] font-semibold text-amber-800 dark:text-amber-300">
                                OTP generate/receive karne me dikkat aa rahi hai? Photo upload se verify karein:
                              </span>
                              <button
                                type="button"
                                onClick={() => setPodMode('manual_photo')}
                                className="px-3 py-1 rounded bg-amber-500 text-white font-bold text-[11px] cursor-pointer flex items-center gap-1"
                              >
                                <FaCamera /> Switch to Manual Photo Proof
                              </button>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="space-y-3 text-xs">
                          <div>
                            <label className="block font-semibold mb-1">Reason for OTP Bypass *</label>
                            <select
                              value={bypassReason}
                              onChange={(e) => setBypassReason(e.target.value)}
                              className="w-full border border-slate-300 dark:border-slate-600 rounded-lg p-2 bg-white dark:bg-slate-800"
                            >
                              {(docPod.pod_rules?.otp_bypass_reasons || []).map((r, i) => (
                                <option key={i} value={r}>{r}</option>
                              ))}
                              <option value="Direct Manual Delivery Mode">Direct Manual Delivery Mode</option>
                            </select>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div className="border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-xl p-3 text-center">
                              <p className="font-bold mb-1">1. Site Cargo Unloaded Photo *</p>
                              {siteCargoPhotoUrl ? (
                                <div className="space-y-1">
                                  <img
                                    src={resolveMediaUrl(siteCargoPhotoUrl)}
                                    alt="Cargo Preview"
                                    className="h-24 w-full object-cover rounded"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => setSiteCargoPhotoUrl('')}
                                    className="text-rose-500 text-[11px] font-bold cursor-pointer"
                                  >
                                    Remove Photo
                                  </button>
                                </div>
                              ) : (
                                <label className="cursor-pointer block py-2 text-blue-600 font-bold">
                                  {uploadingCargoPhoto ? <FaSpinner className="animate-spin mx-auto mb-1" /> : <FaCamera className="mx-auto text-xl mb-1" />}
                                  <span>{uploadingCargoPhoto ? 'Uploading...' : 'Click to Upload Cargo Photo'}</span>
                                  <input
                                    type="file"
                                    accept="image/*"
                                    className="hidden"
                                    onChange={(e) =>
                                      uploadRealFile(e.target.files?.[0], setUploadingCargoPhoto, setSiteCargoPhotoUrl)
                                    }
                                  />
                                </label>
                              )}
                            </div>

                            <div className="border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-xl p-3 text-center">
                              <p className="font-bold mb-1">2. Signed Physical Slip / POD</p>
                              {signedSlipPhotoUrl ? (
                                <div className="space-y-1">
                                  <img
                                    src={resolveMediaUrl(signedSlipPhotoUrl)}
                                    alt="Slip Preview"
                                    className="h-24 w-full object-cover rounded"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => setSignedSlipPhotoUrl('')}
                                    className="text-rose-500 text-[11px] font-bold cursor-pointer"
                                  >
                                    Remove Slip
                                  </button>
                                </div>
                              ) : (
                                <label className="cursor-pointer block py-2 text-blue-600 font-bold">
                                  {uploadingSlipPhoto ? <FaSpinner className="animate-spin mx-auto mb-1" /> : <FaFileSignature className="mx-auto text-xl mb-1" />}
                                  <span>{uploadingSlipPhoto ? 'Uploading...' : 'Upload Signed Paper POD'}</span>
                                  <input
                                    type="file"
                                    accept="image/*,.pdf"
                                    className="hidden"
                                    onChange={(e) =>
                                      uploadRealFile(e.target.files?.[0], setUploadingSlipPhoto, setSignedSlipPhotoUrl)
                                    }
                                  />
                                </label>
                              )}
                            </div>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                            <div>
                              <label className="block font-semibold mb-1">Receiver Name *</label>
                              <input
                                type="text"
                                required
                                value={receiverName}
                                onChange={(e) => setReceiverName(e.target.value)}
                                className="w-full border border-slate-300 dark:border-slate-600 rounded-lg p-2 bg-transparent"
                              />
                            </div>
                            <div>
                              <label className="block font-semibold mb-1">Receiver Mobile</label>
                              <input
                                type="text"
                                value={receiverPhone}
                                onChange={(e) => setReceiverPhone(e.target.value)}
                                className="w-full border border-slate-300 dark:border-slate-600 rounded-lg p-2 bg-transparent font-mono"
                              />
                            </div>
                          </div>

                          <div>
                            <label className="block font-semibold mb-1">Delivery Remarks</label>
                            <input
                              type="text"
                              value={podRemarks}
                              onChange={(e) => setPodRemarks(e.target.value)}
                              placeholder="Any unloading condition notes"
                              className="w-full border border-slate-300 dark:border-slate-600 rounded-lg p-2 bg-transparent"
                            />
                          </div>
                        </div>
                      )}

                      <div className="flex justify-end">
                        <button
                          type="submit"
                          disabled={verifyingPod}
                          className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                        >
                          {verifyingPod ? <FaSpinner className="animate-spin" /> : <FaCheckCircle />}
                          <span>{podMode === 'otp' ? 'Verify OTP & Complete POD' : 'Confirm POD via Uploaded Photo'}</span>
                        </button>
                      </div>
                    </form>
                  )}
                </div>
              )}

              {/* ── DOCUMENT 4: Material Inspection & Handover Checklist ── */}
              {(activeDocTab === 'all' || activeDocTab === 'inspection') && docInsp && (
                <div className="border border-slate-200 dark:border-slate-700 rounded-xl p-4 space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <FaCheckSquare className="text-purple-500" />
                        <h4 className="text-sm font-bold">{docInsp.title}</h4>
                        {statusBadge(docInsp.status)}
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5">{docInsp.description}</p>
                    </div>
                  </div>

                  {docInsp.file_url && (
                    <div className="p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-between text-xs">
                      <span className="font-bold text-emerald-700 dark:text-emerald-400">✓ Inspection Evidence Attached</span>
                      <a
                        href={resolveMediaUrl(docInsp.file_url)}
                        target="_blank"
                        rel="noreferrer"
                        className="text-blue-600 font-bold flex items-center gap-1 hover:underline"
                      >
                        <FaExternalLinkAlt /> View Photo / Sheet
                      </a>
                    </div>
                  )}

                  <form onSubmit={handleSaveInspectionChecklist} className="space-y-3 text-xs">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {[
                        { show: docInsp.checklist_rules?.check_panel_cracks !== false, key: 'panel_cracks_ok', label: 'Solar Panels Glass / Frame Intact (No Cracks)' },
                        { show: docInsp.checklist_rules?.check_panel_count !== false, key: 'panel_count_ok', label: 'Total Panel & Carton Count Matched' },
                        { show: docInsp.checklist_rules?.check_inverter_serial !== false, key: 'inverter_serial_ok', label: 'Inverter Serial Number Matched' },
                        { show: docInsp.checklist_rules?.check_inverter_seal !== false, key: 'inverter_seal_ok', label: 'Inverter Box Seal Intact' },
                        { show: docInsp.checklist_rules?.check_bos_cables_earthing !== false, key: 'bos_cables_earthing_ok', label: 'BOS Cables, MC4 & Earthing Kit Verified' },
                        { show: docInsp.checklist_rules?.check_structure_hdg !== false, key: 'structure_hdg_ok', label: 'HDG Mounting Structure & Fasteners Complete' },
                      ]
                        .filter((item) => item.show)
                        .map((item) => (
                          <label key={item.key} className="flex items-center gap-2 p-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={Boolean(checklist[item.key])}
                              onChange={(e) => setChecklist((p) => ({ ...p, [item.key]: e.target.checked }))}
                              className="accent-purple-600"
                            />
                            <span>{item.label}</span>
                          </label>
                        ))}
                    </div>

                    {docInsp.checklist_rules?.allow_damage_shortage_logging !== false && (
                      <div className="space-y-2">
                        <label className="flex items-center gap-2 text-rose-600 font-semibold cursor-pointer">
                          <input
                            type="checkbox"
                            checked={Boolean(checklist.damage_or_shortage_found)}
                            onChange={(e) => setChecklist((p) => ({ ...p, damage_or_shortage_found: e.target.checked }))}
                            className="accent-rose-600"
                          />
                          <FaExclamationTriangle /> Report Any Transit Damage / Component Shortage
                        </label>
                        <input
                          type="text"
                          value={checklist.shortage_remarks || ''}
                          onChange={(e) => setChecklist((p) => ({ ...p, shortage_remarks: e.target.value }))}
                          placeholder="Inspection remarks / damage or shortage details"
                          className="w-full border border-slate-300 dark:border-slate-600 rounded-lg p-2 bg-transparent"
                        />
                      </div>
                    )}

                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <label className="px-3 py-2 rounded-lg border border-dashed border-slate-300 dark:border-slate-600 text-purple-600 font-semibold cursor-pointer flex items-center gap-1.5">
                        {uploadingInspectionPhoto ? <FaSpinner className="animate-spin" /> : <FaCamera />}
                        <span>
                          {uploadingInspectionPhoto
                            ? 'Uploading...'
                            : inspectionPhotoUrl
                            ? '✓ Handover Photo Uploaded (Replace)'
                            : 'Upload Handover / Damage Photo'}
                        </span>
                        <input
                          type="file"
                          accept="image/*,.pdf"
                          className="hidden"
                          onChange={(e) =>
                            uploadRealFile(e.target.files?.[0], setUploadingInspectionPhoto, setInspectionPhotoUrl)
                          }
                        />
                      </label>

                      <button
                        type="submit"
                        disabled={savingInspection}
                        className="px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-700 text-white font-bold cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                      >
                        {savingInspection ? <FaSpinner className="animate-spin" /> : <FaCheckCircle />}
                        <span>Save Inspection Checklist</span>
                      </button>
                    </div>
                  </form>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Lightbox Image Viewer */}
      {lightboxUrl && (
        <div
          onClick={() => setLightboxUrl('')}
          className="fixed inset-0 z-[60] bg-black/85 flex items-center justify-center p-4"
        >
          <div className="relative max-w-3xl max-h-[85vh]">
            <img src={lightboxUrl} alt="Uploaded Document Proof" className="max-h-[80vh] rounded-xl shadow-2xl" />
            <button
              type="button"
              onClick={() => setLightboxUrl('')}
              className="mt-2 mx-auto block px-4 py-1.5 rounded-lg bg-white text-slate-900 font-bold text-xs cursor-pointer"
            >
              Close Preview
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
