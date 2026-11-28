const mongoose = require('mongoose');
const DeliveryDocumentSettings = require('../models/india_solarshop_db/delivery_document_settings.schema');

const DEFAULT_GLOBAL_SETTINGS = {
  scope_type: 'global',
  scope_id: null,
  scope_name: 'All India (Global Default)',
  is_active: true,

  doc_schedule: {
    is_enabled: true,
    is_mandatory: true,
    title: 'Delivery Schedule & Dispatch Order',
    code: 'DEL_DOC_SCHEDULE',
    party_type: 'system',
    generation_trigger: 'dispatched',
    auto_generate_pdf: true,
    include_qr_code: true,
    include_item_specifications: true,
    header_title: 'SOLARKITS DISPATCH & DELIVERY SCHEDULE',
    terms_and_conditions: [
      'Consignee must verify outer packaging, carton integrity, and seal numbers before unloading.',
      'Any in-transit breakage, physical transit damage, or package discrepancy must be noted immediately on the Handover Checklist.',
      'Delivery is deemed complete only after digital or physical verification and signing of POD & Material Inspection.',
      'All disputes are subject to the jurisdiction of the dispatching warehouse state.',
    ],
  },

  doc_driver_acceptance: {
    is_enabled: true,
    is_mandatory: true,
    title: 'Driver Delivery Acceptance & LR Bilty Form',
    code: 'DEL_DOC_DRIVER_ACCEPTANCE',
    party_type: 'driver',
    stage_trigger: 'loading',
    require_driver_license: true,
    require_odometer_start: true,
    require_vehicle_fitment_check: true,
    require_seal_number: true,
    declaration_text:
      'I hereby declare that I have physically inspected and safely loaded all solar kits, panels, inverters, and BOS items listed herein in sound condition and accept full transit custody.',
  },

  doc_pod: {
    is_enabled: true,
    is_mandatory: true,
    title: 'Proof of Delivery (POD) & Receiving Acknowledgment',
    code: 'DEL_DOC_POD',
    party_type: 'buyer',
    stage_trigger: 'delivered',
    allow_otp_verification: true,
    allow_manual_photo_verification: true,
    default_verification_mode: 'either',
    require_site_cargo_photo: true,
    require_signed_paper_photo: true,
    require_receiver_stamp: false,
    otp_bypass_reasons: [
      'No Network / Phone Unreachable at Site',
      'Customer Phone Switched Off / Battery Dead',
      'Customer Requested Physical Paper Sign & Stamp',
      'Emergency Unloading / Rush Site Condition',
    ],
    acknowledgment_text:
      'We hereby acknowledge receipt of the consignment in stated quantity and outer packing condition. Physical inspection report attached.',
  },

  doc_inspection_handover: {
    is_enabled: true,
    is_mandatory: true,
    title: 'Material Inspection & Handover Checklist',
    code: 'DEL_DOC_INSPECTION_HANDOVER',
    party_type: 'joint',
    stage_trigger: 'delivered',
    check_panel_cracks: true,
    check_panel_count: true,
    check_inverter_serial: true,
    check_inverter_seal: true,
    check_bos_cables_earthing: true,
    check_structure_hdg: true,
    allow_damage_shortage_logging: true,
    require_damage_photos: true,
    disclaimer_text:
      'Any transit damages or component shortages must be logged on this inspection checklist at the time of unloading and signed by both the consignee and the driver.',
  },

  company_name: 'SolarKits Energy Private Limited',
  trade_name: 'SolarKits India',
  support_phone: '+91 92748 63608',
  support_email: 'support@solarkits.in',
  logo_url: '',
  signatory_name: 'Authorized Logistics Officer',
  signatory_designation: 'Supply Chain & Logistics Lead',
};

/**
 * Resolves the active DeliveryDocumentSettings for a warehouse (falling back to global scope).
 */
async function resolveActiveDeliveryDocSettings(warehouseId = null) {
  if (warehouseId && mongoose.Types.ObjectId.isValid(warehouseId)) {
    const whRecord = await DeliveryDocumentSettings.findOne({
      scope_type: 'warehouse',
      scope_id: new mongoose.Types.ObjectId(warehouseId),
      is_active: { $ne: false },
    }).lean();
    if (whRecord) return whRecord;
  }

  let globalRecord = await DeliveryDocumentSettings.findOne({ scope_type: 'global' }).lean();
  if (!globalRecord) {
    const created = await DeliveryDocumentSettings.create(DEFAULT_GLOBAL_SETTINGS);
    globalRecord = created.toObject();
  }
  return globalRecord;
}

/**
 * Inserts or updates a document record inside a delivery_documents array by document_code.
 */
function upsertOrderDocumentRecord(docList, docEntry) {
  const list = Array.isArray(docList) ? [...docList] : [];
  const idx = list.findIndex((d) => d.document_code === docEntry.document_code);
  if (idx >= 0) {
    const prev = list[idx]?.toObject ? list[idx].toObject() : list[idx];
    list[idx] = {
      ...prev,
      ...docEntry,
      metadata: { ...(prev.metadata || {}), ...(docEntry.metadata || {}) },
    };
  } else {
    list.push(docEntry);
  }
  return list;
}

/**
 * Builds normalized 4-document state for an order or stop from live database records & active settings.
 */
function buildOrderDeliveryDocuments({ order, stop = null, settings = DEFAULT_GLOBAL_SETTINGS }) {
  const savedDocs =
    (stop?.delivery_documents && stop.delivery_documents.length > 0
      ? stop.delivery_documents
      : order?.delivery_documents) || [];

  const findDoc = (code) => savedDocs.find((d) => d.document_code === code) || null;

  const scheduleDoc = findDoc('DEL_DOC_SCHEDULE');
  const driverDoc = findDoc('DEL_DOC_DRIVER_ACCEPTANCE');
  const podDoc = findDoc('DEL_DOC_POD');
  const inspectionDoc = findDoc('DEL_DOC_INSPECTION_HANDOVER');

  const rawStatus =
    stop?.stop_status || order?.delivery_status || order?.status || order?.order_status || 'pending';

  const isDispatchedOrLater = [
    'dispatched',
    'in_transit',
    'reached_destination',
    'delivered',
    'pod_confirmed',
    'closed',
  ].includes(rawStatus);

  // Driver / Transport metadata extraction (zero fake fallbacks)
  const driverName =
    order?.vehicles_allocated?.[0]?.driver_name ||
    order?.transport_details?.driver_name ||
    order?.assigned_vehicle?.driver_name ||
    null;
  const driverMobile =
    order?.vehicles_allocated?.[0]?.driver_mobile ||
    order?.transport_details?.driver_mobile ||
    order?.assigned_vehicle?.driver_contact ||
    null;
  const vehicleReg =
    order?.vehicles_allocated?.[0]?.registration_number ||
    order?.transport_details?.vehicle_number ||
    order?.assigned_vehicle?.registration_number ||
    null;

  // POD verification extraction (supports stops[].pod, delivery_completion, and epc.delivery_verification)
  const stopPod = stop?.pod || null;
  const whComp = order?.delivery_completion || null;
  const epcVer = order?.delivery_verification || null;

  const otpVerified = Boolean(
    stopPod?.otp_verified || whComp?.otp_verified || epcVer?.otp_verified
  );
  const manualPhotoVerified = Boolean(
    stopPod?.manual_photo_verified ||
      (whComp?.method && whComp.method.includes('manual_photo') && whComp?.destination_photo) ||
      epcVer?.manual_photo_verified
  );
  const verificationMode =
    stopPod?.verification_mode && stopPod.verification_mode !== 'none'
      ? stopPod.verification_mode
      : whComp?.verification_mode ||
        (whComp?.method === 'auto_otp'
          ? 'otp'
          : whComp?.destination_photo
          ? 'manual_photo'
          : '') ||
        epcVer?.verification_mode ||
        'none';

  const siteCargoPhotoUrl =
    stopPod?.site_cargo_photo_url ||
    whComp?.destination_photo ||
    epcVer?.site_cargo_photo_url ||
    podDoc?.file_url ||
    null;
  const signedPodPhotoUrl =
    stopPod?.signed_pod_photo_url ||
    stopPod?.pod_url ||
    whComp?.signed_slip_photo ||
    epcVer?.signed_pod_photo_url ||
    podDoc?.secondary_file_url ||
    null;
  const otpBypassReason =
    stopPod?.otp_bypass_reason ||
    whComp?.otp_bypass_reason ||
    epcVer?.otp_bypass_reason ||
    podDoc?.notes ||
    null;
  const confirmedAt =
    stopPod?.confirmed_at ||
    whComp?.completed_at ||
    epcVer?.confirmed_at ||
    podDoc?.verified_at ||
    null;

  const isPodVerified = Boolean(confirmedAt || otpVerified || manualPhotoVerified);
  const driverFileUrl =
    driverDoc?.file_url || order?.dispatch_evidence?.docket_doc || null;
  const vehicleRearPhotoUrl =
    driverDoc?.secondary_file_url || order?.dispatch_evidence?.vehicle_rear_photo || null;

  return [
    {
      code: 'DEL_DOC_SCHEDULE',
      title: settings.doc_schedule?.title || 'Delivery Schedule & Dispatch Order',
      party_type: 'system',
      is_enabled: settings.doc_schedule?.is_enabled ?? true,
      is_mandatory: settings.doc_schedule?.is_mandatory ?? true,
      status: scheduleDoc?.status || (isDispatchedOrLater ? 'generated' : 'pending'),
      download_ready: true,
      generated_at:
        scheduleDoc?.uploaded_at || order?.dispatched_at || order?.dispatch_evidence?.dispatched_at || order?.dispatch_tracking?.dispatched_at || null,
      header_title: settings.doc_schedule?.header_title,
      terms_and_conditions: settings.doc_schedule?.terms_and_conditions || [],
      description:
        'System-generated dispatch schedule containing warehouse, vehicle, consignee, and kit itemization.',
    },
    {
      code: 'DEL_DOC_DRIVER_ACCEPTANCE',
      title: settings.doc_driver_acceptance?.title || 'Driver Delivery Acceptance & LR Bilty Form',
      party_type: 'driver',
      is_enabled: settings.doc_driver_acceptance?.is_enabled ?? true,
      is_mandatory: settings.doc_driver_acceptance?.is_mandatory ?? true,
      status: driverDoc?.status || (driverFileUrl ? 'uploaded' : 'pending'),
      file_url: driverFileUrl,
      secondary_file_url: vehicleRearPhotoUrl,
      uploaded_at: driverDoc?.uploaded_at || order?.dispatch_evidence?.dispatched_at || null,
      uploaded_by_name: driverDoc?.uploaded_by_name || order?.dispatch_evidence?.dispatched_by_name || null,
      uploaded_by_role: driverDoc?.uploaded_by_role || null,
      notes: driverDoc?.notes || null,
      metadata: driverDoc?.metadata || {},
      driver_rules: {
        require_driver_license: settings.doc_driver_acceptance?.require_driver_license ?? true,
        require_odometer_start: settings.doc_driver_acceptance?.require_odometer_start ?? true,
        require_vehicle_fitment_check: settings.doc_driver_acceptance?.require_vehicle_fitment_check ?? true,
        require_seal_number: settings.doc_driver_acceptance?.require_seal_number ?? true,
        declaration_text: settings.doc_driver_acceptance?.declaration_text,
      },
      driver_details: {
        driver_name: driverName,
        driver_mobile: driverMobile,
        vehicle_registration: vehicleReg,
      },
      description:
        'Transporter & driver cargo acceptance slip confirming vehicle fitness, seal number, and loading custody.',
    },
    {
      code: 'DEL_DOC_POD',
      title: settings.doc_pod?.title || 'Proof of Delivery (POD) & Receiving Acknowledgment',
      party_type: 'buyer',
      is_enabled: settings.doc_pod?.is_enabled ?? true,
      is_mandatory: settings.doc_pod?.is_mandatory ?? true,
      status:
        podDoc?.status ||
        (isPodVerified ? 'verified' : siteCargoPhotoUrl || signedPodPhotoUrl ? 'uploaded' : 'pending'),
      file_url: siteCargoPhotoUrl,
      secondary_file_url: signedPodPhotoUrl,
      uploaded_at: podDoc?.uploaded_at || confirmedAt || null,
      uploaded_by_name: podDoc?.uploaded_by_name || null,
      uploaded_by_role: podDoc?.uploaded_by_role || null,
      notes: podDoc?.notes || stopPod?.pod_notes || whComp?.remarks || null,
      pod_rules: {
        allow_otp_verification: settings.doc_pod?.allow_otp_verification ?? true,
        allow_manual_photo_verification: settings.doc_pod?.allow_manual_photo_verification ?? true,
        require_site_cargo_photo: settings.doc_pod?.require_site_cargo_photo ?? true,
        require_signed_paper_photo: settings.doc_pod?.require_signed_paper_photo ?? true,
        otp_bypass_reasons: settings.doc_pod?.otp_bypass_reasons || [],
        acknowledgment_text: settings.doc_pod?.acknowledgment_text,
      },
      verification: {
        verification_mode: verificationMode,
        otp_verified: otpVerified,
        otp_verified_at: stopPod?.otp_verified_at || (whComp?.otp_verified ? whComp?.completed_at : null) || epcVer?.otp_verified_at || null,
        manual_photo_verified: manualPhotoVerified,
        site_cargo_photo_url: siteCargoPhotoUrl,
        signed_pod_photo_url: signedPodPhotoUrl,
        otp_bypass_reason: otpBypassReason,
        receiver_name:
          stopPod?.receiver_name || whComp?.receiver_name || epcVer?.receiver_name || null,
        receiver_phone:
          stopPod?.receiver_phone || whComp?.receiver_phone || epcVer?.receiver_phone || null,
        confirmed_at: confirmedAt,
      },
      description:
        'Customer receiving proof supporting Dual Verification: Instant OTP OR Manual Site Cargo & Signed Slip Photo Proof.',
    },
    {
      code: 'DEL_DOC_INSPECTION_HANDOVER',
      title: settings.doc_inspection_handover?.title || 'Material Inspection & Handover Checklist',
      party_type: 'joint',
      is_enabled: settings.doc_inspection_handover?.is_enabled ?? true,
      is_mandatory: settings.doc_inspection_handover?.is_mandatory ?? true,
      status: inspectionDoc?.status || 'pending',
      file_url: inspectionDoc?.file_url || null,
      uploaded_at: inspectionDoc?.uploaded_at || null,
      uploaded_by_name: inspectionDoc?.uploaded_by_name || null,
      uploaded_by_role: inspectionDoc?.uploaded_by_role || null,
      notes: inspectionDoc?.notes || null,
      metadata: inspectionDoc?.metadata || {},
      checklist_rules: {
        check_panel_cracks: settings.doc_inspection_handover?.check_panel_cracks ?? true,
        check_panel_count: settings.doc_inspection_handover?.check_panel_count ?? true,
        check_inverter_serial: settings.doc_inspection_handover?.check_inverter_serial ?? true,
        check_inverter_seal: settings.doc_inspection_handover?.check_inverter_seal ?? true,
        check_bos_cables_earthing: settings.doc_inspection_handover?.check_bos_cables_earthing ?? true,
        check_structure_hdg: settings.doc_inspection_handover?.check_structure_hdg ?? true,
        allow_damage_shortage_logging: settings.doc_inspection_handover?.allow_damage_shortage_logging ?? true,
        require_damage_photos: settings.doc_inspection_handover?.require_damage_photos ?? true,
        disclaimer_text: settings.doc_inspection_handover?.disclaimer_text,
      },
      description:
        'Component-by-component joint handover checking PV modules, Inverter serial numbers, BOS cartons, and site condition.',
    },
  ];
}

/**
 * Mirrors uploaded delivery documents & POD verification between delivery_orders and epc_orders
 * so Admin, Warehouse, and Customer Store portals stay synchronized.
 */
async function syncDeliveryDocsToLinkedOrders({
  orderId = null,
  orderNumber = null,
  epcOrderIds = [],
  docEntry = null,
  verificationPatch = null,
  markDelivered = false,
}) {
  try {
    const db = mongoose.connection.db;
    if (!db) return;

    const epcOrQueries = [];
    const uniqueIds = new Set(
      [orderId, ...(Array.isArray(epcOrderIds) ? epcOrderIds : [])]
        .filter((id) => id && mongoose.Types.ObjectId.isValid(String(id)))
        .map((id) => new mongoose.Types.ObjectId(String(id)))
    );
    if (uniqueIds.size > 0) {
      epcOrQueries.push({ _id: { $in: Array.from(uniqueIds) } });
    }
    if (orderNumber) {
      epcOrQueries.push({ order_number: String(orderNumber) });
    }

    if (epcOrQueries.length > 0) {
      const epcCol = db.collection('epc_orders');
      const matchedEpcs = await epcCol.find({ $or: epcOrQueries }).toArray();
      for (const epc of matchedEpcs) {
        const updateSet = {};
        if (docEntry) {
          updateSet.delivery_documents = upsertOrderDocumentRecord(
            epc.delivery_documents,
            docEntry
          );
        }
        if (verificationPatch) {
          updateSet.delivery_verification = {
            ...(epc.delivery_verification || {}),
            ...verificationPatch,
          };
        }
        if (markDelivered) {
          updateSet.order_status = 'delivered';
          updateSet.delivered_at = epc.delivered_at || new Date();
        }
        if (Object.keys(updateSet).length > 0) {
          await epcCol.updateOne({ _id: epc._id }, { $set: updateSet });
        }
      }
    }

    // Also mirror from epc_order back to any linked delivery_orders row
    const doOrQueries = [];
    if (uniqueIds.size > 0) {
      const strIds = Array.from(uniqueIds).map(String);
      doOrQueries.push({ order_id: { $in: strIds } });
      doOrQueries.push({ 'stops.order_id': { $in: Array.from(uniqueIds) } });
    }
    if (orderNumber) {
      doOrQueries.push({ order_number: String(orderNumber) });
      doOrQueries.push({ 'stops.order_number': String(orderNumber) });
    }

    if (doOrQueries.length > 0 && (docEntry || verificationPatch)) {
      const doCol = db.collection('delivery_orders');
      const matchedDos = await doCol.find({ $or: doOrQueries }).toArray();
      for (const dOrd of matchedDos) {
        const updateSet = {};
        if (docEntry) {
          updateSet.delivery_documents = upsertOrderDocumentRecord(
            dOrd.delivery_documents,
            docEntry
          );
          if (Array.isArray(dOrd.stops) && dOrd.stops.length > 0) {
            updateSet.stops = dOrd.stops.map((st) => {
              const matchesStop =
                (orderNumber && st.order_number === orderNumber) ||
                (uniqueIds.size > 0 && st.order_id && uniqueIds.has(String(st.order_id)));
              if (!matchesStop) return st;
              return {
                ...st,
                delivery_documents: upsertOrderDocumentRecord(st.delivery_documents, docEntry),
              };
            });
          }
        }
        if (verificationPatch) {
          updateSet.delivery_completion = {
            ...(dOrd.delivery_completion || {}),
            ...(verificationPatch.site_cargo_photo_url
              ? { destination_photo: verificationPatch.site_cargo_photo_url }
              : {}),
            ...(verificationPatch.signed_pod_photo_url
              ? { signed_slip_photo: verificationPatch.signed_pod_photo_url }
              : {}),
            ...(verificationPatch.receiver_name
              ? { receiver_name: verificationPatch.receiver_name }
              : {}),
            ...(verificationPatch.receiver_phone
              ? { receiver_phone: verificationPatch.receiver_phone }
              : {}),
          };
        }
        if (Object.keys(updateSet).length > 0) {
          await doCol.updateOne({ _id: dOrd._id }, { $set: updateSet });
        }
      }
    }
  } catch (err) {
    console.warn('syncDeliveryDocsToLinkedOrders warning:', err.message);
  }
}

module.exports = {
  DEFAULT_GLOBAL_SETTINGS,
  resolveActiveDeliveryDocSettings,
  upsertOrderDocumentRecord,
  buildOrderDeliveryDocuments,
  syncDeliveryDocsToLinkedOrders,
};
