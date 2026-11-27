const mongoose = require('mongoose');
const DeliveryDocumentSettings = require('../models/india_solarshop_db/delivery_document_settings.schema');
const DeliveryOrder = require('../models/india_solarshop_db/delivery_order.schema');
const { CompanyWarehouse } = require('../models/company_warehouse_db');
const { GeoLevel1, GeoLevel2 } = require('../models/geolocation_db');
const {
  DEFAULT_GLOBAL_SETTINGS,
  resolveActiveDeliveryDocSettings,
  upsertOrderDocumentRecord,
  buildOrderDeliveryDocuments,
  syncDeliveryDocsToLinkedOrders,
} = require('../services/delivery.documents.helper');

/**
 * 1. GET /delivery-document-settings
 * Fetches settings for specified scope (default: global).
 */
exports.get_settings = async (req, res) => {
  try {
    const scope_type = req.query.scope_type || 'global';
    const scope_id = req.query.scope_id || null;

    let query = { scope_type };
    if (scope_type === 'global') {
      query.scope_id = null;
    } else if (scope_id && mongoose.Types.ObjectId.isValid(scope_id)) {
      query.scope_id = new mongoose.Types.ObjectId(scope_id);
    }

    let record = await DeliveryDocumentSettings.findOne(query).lean();
    if (!record) {
      record = await resolveActiveDeliveryDocSettings(scope_type === 'warehouse' ? scope_id : null);
    }

    return res.status(200).json({
      status: 'success',
      message: 'Delivery document settings retrieved successfully',
      data: record,
    });
  } catch (error) {
    console.error('Error in get_settings (delivery documents):', error);
    return res.status(500).json({
      status: 'error',
      message: 'Failed to retrieve delivery document settings',
      error: error.message,
    });
  }
};

/**
 * 2. POST /delivery-document-settings
 * Creates or updates settings for a scope (global, state, or warehouse).
 */
exports.save_settings = async (req, res) => {
  try {
    const payload = req.body;
    const scope_type = payload.scope_type || 'global';
    const scope_id =
      payload.scope_id && mongoose.Types.ObjectId.isValid(payload.scope_id)
        ? new mongoose.Types.ObjectId(payload.scope_id)
        : null;

    const filter = { scope_type, scope_id: scope_type === 'global' ? null : scope_id };

    const updateData = {
      ...payload,
      scope_type,
      scope_id: filter.scope_id,
      updated_by: req.user?._id || null,
      updated_at: new Date(),
    };

    const saved = await DeliveryDocumentSettings.findOneAndUpdate(filter, updateData, {
      new: true,
      upsert: true,
      setDefaultsOnInsert: true,
    });

    return res.status(200).json({
      status: 'success',
      message: 'Delivery document settings saved successfully',
      data: saved,
    });
  } catch (error) {
    console.error('Error in save_settings (delivery documents):', error);
    return res.status(500).json({
      status: 'error',
      message: 'Failed to save delivery document settings',
      error: error.message,
    });
  }
};

/**
 * 3. GET /delivery-document-settings/scopes
 * Lists all active scope configurations.
 */
exports.list_all_scope_settings = async (req, res) => {
  try {
    const list = await DeliveryDocumentSettings.find().sort({ scope_type: 1, created_at: -1 }).lean();
    return res.status(200).json({
      status: 'success',
      count: list.length,
      data: list,
    });
  } catch (error) {
    console.error('Error in list_all_scope_settings:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Failed to list scope settings',
      error: error.message,
    });
  }
};

/**
 * 4. GET /delivery-document-settings/warehouses
 * Returns real company warehouses from DB with GeoLevel1/GeoLevel2 populated dynamically.
 */
exports.get_available_warehouses = async (req, res) => {
  try {
    const whs = await CompanyWarehouse.find({ is_active: { $ne: false }, deleted_at: null })
      .populate({ path: 'level_1', model: GeoLevel1, select: 'name' })
      .populate({ path: 'level_2', model: GeoLevel2, select: 'name' })
      .lean();

    const normalized = whs.map((w) => ({
      _id: w._id,
      name: w.warehouse_name || w.name || w.warehouse_code || '',
      code: w.warehouse_code || w.code || '',
      city: w.city || w.level_2?.name || '',
      state_name: w.state_name || w.level_1?.name || '',
      dispatch_pincode: w.pincode || w.dispatch_pincode || '',
      address: w.address || '',
      is_active: w.is_active,
      manager: w.manager || null,
    }));

    return res.status(200).json({
      status: 'success',
      count: normalized.length,
      data: normalized,
    });
  } catch (error) {
    console.error('Error in get_available_warehouses:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Failed to fetch warehouses',
      error: error.message,
    });
  }
};

/**
 * 5. DELETE /delivery-document-settings/:id
 * Deletes a warehouse-level override.
 */
exports.delete_scope_settings = async (req, res) => {
  try {
    const { id } = req.params;
    const target = await DeliveryDocumentSettings.findById(id);
    if (!target) {
      return res.status(404).json({ status: 'error', message: 'Scope settings not found' });
    }
    if (target.scope_type === 'global') {
      return res.status(400).json({ status: 'error', message: 'Global default settings cannot be deleted' });
    }

    await DeliveryDocumentSettings.findByIdAndDelete(id);
    return res.status(200).json({
      status: 'success',
      message: 'Warehouse scope settings removed successfully',
    });
  } catch (error) {
    console.error('Error in delete_scope_settings:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Failed to delete scope settings',
      error: error.message,
    });
  }
};

/**
 * Resolves an order dynamically from delivery_orders (admin or warehouse schema) OR epc_orders.
 */
async function findDynamicOrderRecord(orderId) {
  const db = mongoose.connection.db;
  const objId = mongoose.Types.ObjectId.isValid(orderId) ? new mongoose.Types.ObjectId(orderId) : null;

  // 1. Check delivery_orders
  const doCol = db.collection('delivery_orders');
  let dOrd = await doCol.findOne(
    objId
      ? { $or: [{ _id: objId }, { delivery_order_id: orderId }, { delivery_number: orderId }] }
      : { $or: [{ delivery_order_id: orderId }, { delivery_number: orderId }] }
  );

  if (dOrd) {
    const wh = dOrd.warehouse_id && mongoose.Types.ObjectId.isValid(dOrd.warehouse_id)
      ? await CompanyWarehouse.findById(dOrd.warehouse_id).lean()
      : null;
    const sp = dOrd.service_provider_id && mongoose.Types.ObjectId.isValid(dOrd.service_provider_id)
      ? await db.collection('delivery_service_providers').findOne({ _id: new mongoose.Types.ObjectId(dOrd.service_provider_id) })
      : null;
    return { source: 'delivery_orders', record: { ...dOrd, warehouse_doc: wh, service_provider_doc: sp } };
  }

  // 2. Check epc_orders
  const epcCol = db.collection('epc_orders');
  let epcOrd = await epcCol.findOne(
    objId ? { $or: [{ _id: objId }, { order_number: orderId }] } : { order_number: orderId }
  );
  if (epcOrd) {
    const wh = epcOrd.warehouse_id && mongoose.Types.ObjectId.isValid(epcOrd.warehouse_id)
      ? await CompanyWarehouse.findById(epcOrd.warehouse_id).lean()
      : null;
    const acc = epcOrd.epc_id && mongoose.Types.ObjectId.isValid(epcOrd.epc_id)
      ? await db.collection('epc_accounts').findOne({ _id: new mongoose.Types.ObjectId(epcOrd.epc_id) })
      : null;
    return { source: 'epc_orders', record: { ...epcOrd, warehouse_doc: wh, epc_account_doc: acc } };
  }

  return null;
}

/**
 * 6. GET /delivery-document-settings/order-docs/:delivery_order_id
 * Returns all 4 dynamic documents & verification status for any DeliveryOrder or EpcOrder.
 */
exports.get_delivery_order_documents = async (req, res) => {
  try {
    const { delivery_order_id } = req.params;
    const stop_index = parseInt(req.query.stop_index || '0', 10);

    const found = await findDynamicOrderRecord(delivery_order_id);
    if (!found) {
      return res.status(404).json({
        status: 'error',
        message: 'Order not found',
      });
    }

    const { source, record } = found;
    const stop = source === 'delivery_orders' ? record.stops?.[stop_index] || record.stops?.[0] || null : null;
    const whId = record.warehouse_id || record.warehouse_doc?._id || null;
    const settings = await resolveActiveDeliveryDocSettings(whId);
    const documents = buildOrderDeliveryDocuments({ order: record, stop, settings });

    return res.status(200).json({
      status: 'success',
      data: {
        source,
        delivery_order: {
          id: record._id,
          delivery_number: record.delivery_number || record.delivery_order_id || record.order_number,
          order_number: record.order_number,
          status: record.status || record.delivery_status || record.order_status,
          warehouse: record.warehouse_doc || record.warehouse_id || null,
          transporter: record.service_provider_doc || record.service_provider_id || record.dispatch_tracking?.courier_name || null,
          vehicles: record.vehicles_allocated || (record.assigned_vehicle?.registration_number ? [record.assigned_vehicle] : []),
          stop,
        },
        settings,
        documents,
      },
    });
  } catch (error) {
    console.error('Error in get_delivery_order_documents:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Failed to retrieve delivery documents for order',
      error: error.message,
    });
  }
};

/**
 * 6b. POST /delivery-document-settings/order-docs/:delivery_order_id
 * Uploads or updates any of the 4 delivery documents (or Inspection checklist) for an order.
 */
exports.save_delivery_order_document = async (req, res) => {
  try {
    const { delivery_order_id } = req.params;
    const {
      document_code,
      document_title,
      party_type,
      status = 'uploaded',
      file_url = '',
      secondary_file_url = '',
      notes = '',
      metadata = {},
      uploaded_by_role = 'admin',
      stop_number = 1,
    } = req.body;

    if (!document_code) {
      return res.status(400).json({ status: 'error', message: 'document_code is required' });
    }

    const found = await findDynamicOrderRecord(delivery_order_id);
    if (!found) {
      return res.status(404).json({ status: 'error', message: 'Order not found' });
    }

    const now = new Date();
    const performerName =
      req.user?.name ||
      [req.user?.first_name, req.user?.last_name].filter(Boolean).join(' ') ||
      'Admin Operations User';

    const docEntry = {
      document_code,
      document_title: document_title || document_code,
      party_type: party_type || 'driver',
      status,
      file_url,
      secondary_file_url,
      notes,
      metadata,
      uploaded_by_name: performerName,
      uploaded_by_role,
      uploaded_at: now,
      verified_at: status === 'verified' ? now : null,
    };

    const db = mongoose.connection.db;
    const { source, record } = found;

    if (source === 'delivery_orders') {
      const updatedDocs = upsertOrderDocumentRecord(record.delivery_documents, docEntry);
      const updateSet = { delivery_documents: updatedDocs };

      if (Array.isArray(record.stops) && record.stops.length > 0) {
        updateSet.stops = record.stops.map((st) =>
          st.stop_number === Number(stop_number)
            ? {
                ...st,
                delivery_documents: upsertOrderDocumentRecord(st.delivery_documents, docEntry),
              }
            : st
        );
      }

      if (document_code === 'DEL_DOC_DRIVER_ACCEPTANCE' && file_url) {
        updateSet['dispatch_evidence.docket_doc'] = file_url;
      }

      await db.collection('delivery_orders').updateOne({ _id: record._id }, { $set: updateSet });

      const stopRef = record.stops?.find((s) => s.stop_number === Number(stop_number)) || record.stops?.[0];
      await syncDeliveryDocsToLinkedOrders({
        orderId: stopRef?.order_id || record.order_id,
        orderNumber: stopRef?.order_number || record.order_number,
        epcOrderIds: (record.stops || []).map((s) => s.order_id),
        docEntry,
      });
    } else {
      const updatedDocs = upsertOrderDocumentRecord(record.delivery_documents, docEntry);
      await db.collection('epc_orders').updateOne(
        { _id: record._id },
        { $set: { delivery_documents: updatedDocs } }
      );
      await syncDeliveryDocsToLinkedOrders({
        orderId: record._id,
        orderNumber: record.order_number,
        docEntry,
      });
    }

    return res.status(200).json({
      status: 'success',
      message: `${docEntry.document_title} saved successfully.`,
      data: docEntry,
    });
  } catch (error) {
    console.error('Error in save_delivery_order_document:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Failed to save delivery document',
      error: error.message,
    });
  }
};

/**
 * 7. POST /delivery-document-settings/verify-delivery
 * Handles Dual Verification (OTP OR Manual Photo Upload) on DeliveryOrder (both schemas) or EpcOrder.
 */
exports.verify_delivery = async (req, res) => {
  try {
    const {
      delivery_order_id,
      stop_number = 1,
      mode, // 'otp' | 'manual_photo'
      otp_code,
      site_cargo_photo_url,
      signed_pod_photo_url,
      odometer_photo_url,
      receiver_name,
      receiver_phone,
      otp_bypass_reason,
      notes,
    } = req.body;

    if (!delivery_order_id) {
      return res.status(400).json({ status: 'error', message: 'delivery_order_id is required' });
    }

    const found = await findDynamicOrderRecord(delivery_order_id);
    if (!found) {
      return res.status(404).json({ status: 'error', message: 'Delivery order not found' });
    }

    const now = new Date();
    const performerName =
      req.user?.name ||
      [req.user?.first_name, req.user?.last_name].filter(Boolean).join(' ') ||
      'Verification Officer';

    if (mode === 'otp') {
      if (!otp_code || String(otp_code).trim().length < 4) {
        return res.status(400).json({ status: 'error', message: 'Valid 4 or 6 digit OTP is required' });
      }
    } else if (mode === 'manual_photo') {
      if (!site_cargo_photo_url && !signed_pod_photo_url) {
        return res.status(400).json({
          status: 'error',
          message: 'At least one photo (Site Cargo Unloading or Signed Physical POD Slip) is required for manual verification',
        });
      }
    } else {
      return res.status(400).json({
        status: 'error',
        message: "Invalid verification mode. Must be 'otp' or 'manual_photo'",
      });
    }

    const db = mongoose.connection.db;
    const { source, record } = found;

    const resolvedReceiverName =
      receiver_name ||
      record.stops?.[0]?.recipient_name ||
      record.customer_name ||
      record.delivery_address?.contact_name ||
      '';
    const resolvedReceiverPhone =
      receiver_phone ||
      record.stops?.[0]?.destination?.contact_phone ||
      record.customer_phone ||
      record.delivery_address?.contact_phone ||
      '';

    const podDocEntry = {
      document_code: 'DEL_DOC_POD',
      document_title: 'Proof of Delivery (POD) & Receiving Acknowledgment',
      party_type: 'buyer',
      status: 'verified',
      file_url: mode === 'manual_photo' ? site_cargo_photo_url || signed_pod_photo_url || '' : '',
      secondary_file_url: signed_pod_photo_url || '',
      notes:
        mode === 'otp'
          ? notes || 'Verified via Customer Delivery OTP'
          : otp_bypass_reason || notes || 'Verified via Manual Photo Proof',
      metadata: {
        verification_mode: mode,
        otp_verified: mode === 'otp',
        manual_photo_verified: mode === 'manual_photo',
        otp_bypass_reason: otp_bypass_reason || null,
        receiver_name: resolvedReceiverName,
        receiver_phone: resolvedReceiverPhone,
      },
      uploaded_by_name: performerName,
      uploaded_by_role: mode === 'manual_photo' ? 'driver' : 'buyer',
      uploaded_at: now,
      verified_at: now,
    };

    const verificationPatch = {
      verification_mode: mode,
      otp_verified: mode === 'otp',
      otp_verified_at: mode === 'otp' ? now : null,
      manual_photo_verified: mode === 'manual_photo',
      site_cargo_photo_url: site_cargo_photo_url || '',
      signed_pod_photo_url: signed_pod_photo_url || '',
      otp_bypass_reason: otp_bypass_reason || '',
      receiver_name: resolvedReceiverName,
      receiver_phone: resolvedReceiverPhone,
      confirmed_at: now,
    };

    if (source === 'delivery_orders') {
      const updateSet = {
        delivery_documents: upsertOrderDocumentRecord(record.delivery_documents, podDocEntry),
        delivery_completion: {
          ...(record.delivery_completion || {}),
          completed_at: now,
          completed_by_name: performerName,
          method: mode === 'otp' ? 'auto_otp' : 'manual_photo_fallback',
          verification_mode: mode,
          destination_photo: site_cargo_photo_url || '',
          signed_slip_photo: signed_pod_photo_url || '',
          otp_bypass_reason: otp_bypass_reason || '',
          remarks: notes || podDocEntry.notes,
          receiver_name: resolvedReceiverName,
          receiver_phone: resolvedReceiverPhone,
          otp_verified: mode === 'otp',
        },
        delivery_status: 'delivered',
      };

      if (Array.isArray(record.stops) && record.stops.length > 0) {
        const updatedStops = record.stops.map((st) => {
          if (st.stop_number !== Number(stop_number) && record.stops.length > 1) return st;
          return {
            ...st,
            stop_status: 'pod_confirmed',
            delivered_at: now,
            pod: {
              ...(st.pod || {}),
              ...verificationPatch,
              pod_url: signed_pod_photo_url || site_cargo_photo_url || st.pod?.pod_url || null,
              odometer_photo_url: odometer_photo_url || null,
              otp_code: mode === 'otp' ? String(otp_code).trim() : st.pod?.otp_code || null,
              pod_notes: notes || podDocEntry.notes,
              confirmed_by: req.user?._id || null,
            },
            delivery_documents: upsertOrderDocumentRecord(st.delivery_documents, podDocEntry),
          };
        });
        updateSet.stops = updatedStops;

        const allConfirmed = updatedStops.every(
          (s) => s.stop_status === 'pod_confirmed' || s.stop_status === 'delivered'
        );
        if (allConfirmed) {
          updateSet.status = 'pod_confirmed';
          updateSet.completed_at = now;
        }
      }

      await db.collection('delivery_orders').updateOne({ _id: record._id }, { $set: updateSet });

      const targetStop =
        record.stops?.find((s) => s.stop_number === Number(stop_number)) || record.stops?.[0];
      await syncDeliveryDocsToLinkedOrders({
        orderId: targetStop?.order_id || record.order_id,
        orderNumber: targetStop?.order_number || record.order_number,
        docEntry: podDocEntry,
        verificationPatch,
        markDelivered: true,
      });
    } else {
      const updatedDocs = upsertOrderDocumentRecord(record.delivery_documents, podDocEntry);
      await db.collection('epc_orders').updateOne(
        { _id: record._id },
        {
          $set: {
            delivery_documents: updatedDocs,
            delivery_verification: verificationPatch,
            order_status: 'delivered',
            delivered_at: now,
          },
        }
      );
      await syncDeliveryDocsToLinkedOrders({
        orderId: record._id,
        orderNumber: record.order_number,
        docEntry: podDocEntry,
        verificationPatch,
        markDelivered: true,
      });
    }

    return res.status(200).json({
      status: 'success',
      message: `Delivery successfully verified using ${mode === 'otp' ? 'OTP Verification' : 'Manual Photo Proof'}`,
      data: {
        delivery_number: record.delivery_number || record.delivery_order_id || record.order_number,
        stop_number,
        verification_mode: mode,
        confirmed_at: now,
        pod: verificationPatch,
        document: podDocEntry,
      },
    });
  } catch (error) {
    console.error('Error in verify_delivery:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Failed to complete delivery verification',
      error: error.message,
    });
  }
};

/**
 * 8. GET /delivery-document-settings/recent-orders
 * Fetches REAL active delivery_orders and epc_orders purely from MongoDB without injecting synthetic placeholders.
 */
exports.get_recent_orders = async (req, res) => {
  try {
    const db = mongoose.connection.db;
    const rawDeliveryOrders = await db.collection('delivery_orders').find({}).sort({ created_at: -1 }).limit(10).toArray();
    const allWhs = await CompanyWarehouse.find({ deleted_at: null })
      .populate({ path: 'level_1', model: GeoLevel1, select: 'name' })
      .populate({ path: 'level_2', model: GeoLevel2, select: 'name' })
      .lean();
    const allSps = await db.collection('delivery_service_providers').find().toArray();
    const allEpcAccs = await db.collection('epc_accounts').find().toArray();

    const formatWh = (wh) =>
      wh
        ? {
            _id: wh._id,
            name: wh.warehouse_name || wh.name || wh.warehouse_code || '',
            code: wh.warehouse_code || wh.code || '',
            address: wh.address || '',
            city: wh.city || wh.level_2?.name || '',
            state_name: wh.state_name || wh.level_1?.name || '',
            dispatch_pincode: wh.pincode || wh.dispatch_pincode || '',
          }
        : null;

    if (rawDeliveryOrders.length > 0) {
      const normalized = rawDeliveryOrders.map((ord) => {
        const matchedWh = allWhs.find((w) => String(w._id) === String(ord.warehouse_id)) || null;
        const matchedSp = allSps.find((sp) => String(sp._id) === String(ord.service_provider_id)) || null;
        const primaryVeh = ord.vehicles_allocated?.[0] || ord.transport_details || {};

        return {
          _id: ord._id,
          source: 'delivery_orders',
          delivery_number: ord.delivery_number || ord.delivery_order_id || ord.order_number,
          order_number: ord.order_number,
          status: ord.status || ord.delivery_status,
          created_at: ord.created_at,
          warehouse_id: formatWh(matchedWh),
          service_provider_id: matchedSp
            ? {
                _id: matchedSp._id,
                provider_name: matchedSp.name,
                provider_code: matchedSp.provider_code,
                contact_phone: matchedSp.customer_service_number || matchedSp.mobile_number || '',
              }
            : ord.transport_details?.transporter_name
            ? { provider_name: ord.transport_details.transporter_name }
            : null,
          vehicles_allocated:
            ord.vehicles_allocated && ord.vehicles_allocated.length > 0
              ? ord.vehicles_allocated
              : primaryVeh.vehicle_number || primaryVeh.driver_name
              ? [
                  {
                    registration_number: primaryVeh.vehicle_number || '',
                    driver_name: primaryVeh.driver_name || '',
                    driver_mobile: primaryVeh.driver_mobile || '',
                    seal_number: '',
                  },
                ]
              : [],
          stops:
            ord.stops && ord.stops.length > 0
              ? ord.stops
              : [
                  {
                    stop_number: 1,
                    recipient_name: ord.customer_name || '',
                    recipient_contact: ord.customer_phone || '',
                    destination: {
                      address: ord.destination?.address || '',
                      district_name: ord.destination?.district || '',
                      state_name: ord.destination?.state || '',
                      pincode: ord.destination?.pincode || '',
                      contact_phone: ord.customer_phone || '',
                    },
                    cargo: {
                      kit_items: (ord.items || []).map((it) => ({
                        item_name: it.product_name || it.item_name || '',
                        quantity: it.ordered_qty || it.quantity || 1,
                        description: it.sku || '',
                      })),
                    },
                    pod: ord.delivery_completion || null,
                  },
                ],
        };
      });

      return res.status(200).json({ status: 'success', count: normalized.length, data: normalized });
    }

    // If no delivery_orders exist yet, load real epc_orders from DB with ONLY their actual DB fields
    const rawEpcOrders = await db.collection('epc_orders').find().sort({ created_at: -1 }).limit(10).toArray();

    const normalizedEpcs = rawEpcOrders.map((ord) => {
      const matchedWh =
        allWhs.find(
          (w) =>
            String(w._id) === String(ord.warehouse_id) ||
            w.warehouse_code === ord.fulfillment_bifurcation?.assigned_warehouse_code
        ) || null;
      const matchedEpc = allEpcAccs.find((a) => String(a._id) === String(ord.epc_id)) || null;

      return {
        _id: ord._id,
        source: 'epc_orders',
        delivery_number: ord.order_number,
        order_number: ord.order_number,
        status: ord.order_status || 'pending',
        created_at: ord.created_at,
        warehouse_id: formatWh(matchedWh),
        service_provider_id: ord.dispatch_tracking?.courier_name
          ? { provider_name: ord.dispatch_tracking.courier_name }
          : null,
        vehicles_allocated:
          ord.assigned_vehicle?.registration_number || ord.assigned_vehicle?.driver_name
            ? [ord.assigned_vehicle]
            : [],
        stops: [
          {
            stop_number: 1,
            recipient_name: ord.delivery_address?.contact_name || matchedEpc?.name || '',
            recipient_contact: ord.delivery_address?.contact_phone || matchedEpc?.whatsapp || '',
            recipient_email: matchedEpc?.email || '',
            destination: {
              address: ord.delivery_address?.line || '',
              district_name: ord.delivery_address?.district_name || '',
              state_name: ord.delivery_address?.state_name || '',
              pincode: ord.delivery_address?.pincode || '',
              contact_phone: ord.delivery_address?.contact_phone || matchedEpc?.whatsapp || '',
            },
            cargo: {
              kit_items: (ord.items || []).map((it) => ({
                item_name: it.item_name || '',
                capacity: it.capacity || '',
                description: it.description || '',
                quantity: it.quantity || 1,
                total_weight_kg: ord.order_load_metrics?.total_weight_kg || null,
              })),
              total_kits: ord.order_load_metrics?.total_kits || 0,
              total_weight_kg: ord.order_load_metrics?.total_weight_kg || 0,
            },
            pod: ord.delivery_verification || null,
          },
        ],
      };
    });

    return res.status(200).json({
      status: 'success',
      count: normalizedEpcs.length,
      data: normalizedEpcs,
    });
  } catch (error) {
    console.error('Error in get_recent_orders:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Failed to fetch recent delivery orders',
      error: error.message,
    });
  }
};
