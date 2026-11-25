/**
 * region.payment.config.handler.js
 *
 * Handler for Region-wise Payment Gateway Configuration & Order Processing.
 * Manages per-district payment gateway toggles (Online ICICI / Offline UTR / Both)
 * and Admin offline order approval queue for EPC and FPO/Loose orders.
 */

const mongoose = require('mongoose');
const { RegionPaymentConfig, EpcOrder, FpoOrder, SolarShopSettings } = require('../models/india_solarshop_db');
const { GeoLevel1, GeoLevel2 } = require('../models/geolocation_db');
<<<<<<< HEAD
=======
const { resolveBankNameFromIfsc } = require('../utils/ifsc.bank.resolver');
>>>>>>> origin/main

// ── 1. LIST REGION CONFIGS (Admin) ───────────────────────────────────────────
const list_configs = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      state_id,
      district_id,
      payment_mode,
      is_active,
      search,
    } = req.query;

    const query = {};
    if (state_id && mongoose.Types.ObjectId.isValid(state_id)) {
      query.state_id = new mongoose.Types.ObjectId(state_id);
    }
    if (district_id && mongoose.Types.ObjectId.isValid(district_id)) {
      query.district_id = new mongoose.Types.ObjectId(district_id);
    }
    if (payment_mode && ['offline', 'online', 'both'].includes(payment_mode)) {
      query.payment_mode = payment_mode;
    }
    if (is_active !== undefined && is_active !== '') {
      query.is_active = is_active === 'true' || is_active === true;
    }
    if (search && search.trim()) {
      const searchRegex = new RegExp(search.trim(), 'i');
      query.$or = [
        { state_name: searchRegex },
        { district_name: searchRegex },
      ];
    }

    const pageNum = Math.max(1, parseInt(page, 10));
    const limitNum = Math.max(1, Math.min(100, parseInt(limit, 10)));
    const skip = (pageNum - 1) * limitNum;

    const [total, rows] = await Promise.all([
      RegionPaymentConfig.countDocuments(query),
      RegionPaymentConfig.find(query)
        .populate({ path: 'state_id', model: GeoLevel1, select: 'name is_active' })
        .populate({ path: 'district_id', model: GeoLevel2, select: 'name is_active' })
        .sort({ updated_at: -1, created_at: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
    ]);

    return res.status(200).json({
      status: 'success',
      data: rows,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum) || 1,
      },
    });
  } catch (error) {
    console.error('[RegionPaymentConfig] list_configs error:', error);
    return res.status(500).json({ status: 'error', message: 'Failed to fetch payment configurations' });
  }
};

// ── 2. GET CONFIG BY ID ───────────────────────────────────────────────────────
const get_config_by_id = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ status: 'error', message: 'Invalid configuration ID' });
    }

    const config = await RegionPaymentConfig.findById(id)
      .populate({ path: 'state_id', model: GeoLevel1, select: 'name' })
      .populate({ path: 'district_id', model: GeoLevel2, select: 'name' })
      .lean();

    if (!config) {
      return res.status(404).json({ status: 'error', message: 'Region payment configuration not found' });
    }

    return res.status(200).json({ status: 'success', data: config });
  } catch (error) {
    console.error('[RegionPaymentConfig] get_config_by_id error:', error);
    return res.status(500).json({ status: 'error', message: 'Failed to fetch payment configuration' });
  }
};

// ── 3. CREATE REGION CONFIG (Admin) ──────────────────────────────────────────
const create_config = async (req, res) => {
  try {
    const {
      state_id,
      state_name,
      district_id,
      district_name,
      payment_mode = 'offline',
      online_enabled,
      offline_enabled,
      offline_requires_accounts_verification = true,
      offline_requires_admin_approval = true,
      applies_to = ['epc_order', 'fpo_order', 'loose_order'],
      is_active = true,
    } = req.body;

    if (!state_id || !mongoose.Types.ObjectId.isValid(state_id)) {
      return res.status(400).json({ status: 'error', message: 'Valid state_id is required' });
    }
    if (!district_id || !mongoose.Types.ObjectId.isValid(district_id)) {
      return res.status(400).json({ status: 'error', message: 'Valid district_id is required' });
    }
    if (!['offline', 'online', 'both'].includes(payment_mode)) {
      return res.status(400).json({ status: 'error', message: 'payment_mode must be offline, online, or both' });
    }

    // Check for existing configuration for this state + district
    const existing = await RegionPaymentConfig.findOne({ state_id, district_id });
    if (existing) {
      return res.status(409).json({
        status: 'error',
        message: 'A payment configuration already exists for this State and District combo. Please edit the existing one.',
        existing_id: existing._id,
      });
    }

    // Resolve state/district names if not provided
    let resolvedStateName = state_name;
    let resolvedDistrictName = district_name;
    if (!resolvedStateName) {
      const st = await GeoLevel1.findById(state_id).lean();
      if (st) resolvedStateName = st.name;
    }
    if (!resolvedDistrictName) {
      const dt = await GeoLevel2.findById(district_id).lean();
      if (dt) resolvedDistrictName = dt.name;
    }

    const isOnline = payment_mode === 'online' || payment_mode === 'both';
    const isOffline = payment_mode === 'offline' || payment_mode === 'both';

    const newConfig = new RegionPaymentConfig({
      state_id,
      state_name: resolvedStateName,
      district_id,
      district_name: resolvedDistrictName,
      payment_mode,
      online_enabled: online_enabled !== undefined ? Boolean(online_enabled) : isOnline,
      offline_enabled: offline_enabled !== undefined ? Boolean(offline_enabled) : isOffline,
      offline_requires_accounts_verification: Boolean(offline_requires_accounts_verification),
      offline_requires_admin_approval: Boolean(offline_requires_admin_approval),
      applies_to: Array.isArray(applies_to) && applies_to.length > 0 ? applies_to : ['epc_order', 'fpo_order', 'loose_order'],
      is_active: Boolean(is_active),
      created_by: req.user?._id || req.user?.id || null,
      updated_by: req.user?._id || req.user?.id || null,
    });

    await newConfig.save();

    return res.status(201).json({
      status: 'success',
      message: 'Region payment configuration created successfully',
      data: newConfig,
    });
  } catch (error) {
    console.error('[RegionPaymentConfig] create_config error:', error);
    if (error.code === 11000) {
      return res.status(409).json({ status: 'error', message: 'Duplicate configuration for this state and district' });
    }
    return res.status(500).json({ status: 'error', message: 'Failed to create payment configuration' });
  }
};

// ── 4. UPDATE REGION CONFIG (Admin) ──────────────────────────────────────────
const update_config = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ status: 'error', message: 'Invalid configuration ID' });
    }

    const config = await RegionPaymentConfig.findById(id);
    if (!config) {
      return res.status(404).json({ status: 'error', message: 'Region payment configuration not found' });
    }

    const {
      payment_mode,
      online_enabled,
      offline_enabled,
      offline_requires_accounts_verification,
      offline_requires_admin_approval,
      applies_to,
      is_active,
    } = req.body;

    if (payment_mode !== undefined) {
      if (!['offline', 'online', 'both'].includes(payment_mode)) {
        return res.status(400).json({ status: 'error', message: 'payment_mode must be offline, online, or both' });
      }
      config.payment_mode = payment_mode;
      config.online_enabled = payment_mode === 'online' || payment_mode === 'both';
      config.offline_enabled = payment_mode === 'offline' || payment_mode === 'both';
    }

    if (online_enabled !== undefined) config.online_enabled = Boolean(online_enabled);
    if (offline_enabled !== undefined) config.offline_enabled = Boolean(offline_enabled);
    if (offline_requires_accounts_verification !== undefined) {
      config.offline_requires_accounts_verification = Boolean(offline_requires_accounts_verification);
    }
    if (offline_requires_admin_approval !== undefined) {
      config.offline_requires_admin_approval = Boolean(offline_requires_admin_approval);
    }
    if (Array.isArray(applies_to)) config.applies_to = applies_to;
    if (is_active !== undefined) config.is_active = Boolean(is_active);

    config.updated_by = req.user?._id || req.user?.id || null;
    await config.save();

    return res.status(200).json({
      status: 'success',
      message: 'Region payment configuration updated successfully',
      data: config,
    });
  } catch (error) {
    console.error('[RegionPaymentConfig] update_config error:', error);
    return res.status(500).json({ status: 'error', message: 'Failed to update payment configuration' });
  }
};

// ── 5. TOGGLE REGION CONFIG ACTIVE STATE (Admin) ─────────────────────────────
const toggle_config = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ status: 'error', message: 'Invalid configuration ID' });
    }

    const config = await RegionPaymentConfig.findById(id);
    if (!config) {
      return res.status(404).json({ status: 'error', message: 'Region payment configuration not found' });
    }

    if (req.body && req.body.is_active !== undefined) {
      config.is_active = Boolean(req.body.is_active);
    } else {
      config.is_active = !config.is_active;
    }

    config.updated_by = req.user?._id || req.user?.id || null;
    await config.save();

    return res.status(200).json({
      status: 'success',
      message: `Region payment configuration ${config.is_active ? 'activated' : 'deactivated'} successfully`,
      data: config,
    });
  } catch (error) {
    console.error('[RegionPaymentConfig] toggle_config error:', error);
    return res.status(500).json({ status: 'error', message: 'Failed to toggle configuration state' });
  }
};

// ── 6. RESOLVE PAYMENT CONFIG (Checkout / Public) ────────────────────────────
// Resolves the effective payment method for a given district & state.
// Used by Solar Store checkout to determine what payment options to display.
const resolve_payment_config = async (req, res) => {
  try {
    const { state_id, district_id, order_type = 'epc_order' } = req.query;

    // Fetch configured offline company bank details from SolarShopSettings
    const settings = await SolarShopSettings.findOne().lean();
<<<<<<< HEAD
    const offlineBankDetails = {
      account_number: settings?.offline_bank_details?.account_number || '',
      ifsc_code: settings?.offline_bank_details?.ifsc_code || '',
=======
    const ifsc = settings?.offline_bank_details?.ifsc_code || '';
    const bankName = settings?.offline_bank_details?.bank_name || resolveBankNameFromIfsc(ifsc) || '';
    const offlineBankDetails = {
      account_number: settings?.offline_bank_details?.account_number || '',
      ifsc_code: ifsc,
      bank_name: bankName,
>>>>>>> origin/main
      account_holder_name: settings?.offline_bank_details?.account_holder_name || '',
    };

    // Default fallback when no config exists
    const fallbackConfig = {
      is_configured: false,
      payment_mode: 'offline',
      online_enabled: false,
      offline_enabled: true,
      offline_requires_accounts_verification: true,
      offline_requires_admin_approval: true,
      applies_to: ['epc_order', 'fpo_order', 'loose_order'],
      offline_bank_details: offlineBankDetails,
    };

    if (!district_id || !mongoose.Types.ObjectId.isValid(district_id)) {
      return res.status(200).json({
        status: 'success',
        config: fallbackConfig,
        message: 'No district provided; defaulting to offline payment',
      });
    }

    // 1. Try to find active config for this district
    const query = {
      district_id: new mongoose.Types.ObjectId(district_id),
      is_active: true,
    };
    if (state_id && mongoose.Types.ObjectId.isValid(state_id)) {
      query.state_id = new mongoose.Types.ObjectId(state_id);
    }
    if (order_type) {
      query.applies_to = order_type;
    }

    let config = await RegionPaymentConfig.findOne(query).lean();

    // 2. If no district-specific config with order_type filter, check without order_type filter
    if (!config && order_type) {
      const fallbackQuery = {
        district_id: new mongoose.Types.ObjectId(district_id),
        is_active: true,
      };
      if (state_id && mongoose.Types.ObjectId.isValid(state_id)) {
        fallbackQuery.state_id = new mongoose.Types.ObjectId(state_id);
      }
      config = await RegionPaymentConfig.findOne(fallbackQuery).lean();
    }

    if (!config) {
      return res.status(200).json({
        status: 'success',
        config: fallbackConfig,
        message: 'No custom region configuration found; using default offline mode',
      });
    }

    return res.status(200).json({
      status: 'success',
      config: {
        is_configured: true,
        id: config._id,
        state_id: config.state_id,
        state_name: config.state_name,
        district_id: config.district_id,
        district_name: config.district_name,
        payment_mode: config.payment_mode,
        online_enabled: Boolean(config.online_enabled),
        offline_enabled: Boolean(config.offline_enabled),
        offline_requires_accounts_verification: Boolean(config.offline_requires_accounts_verification),
        offline_requires_admin_approval: Boolean(config.offline_requires_admin_approval),
        applies_to: config.applies_to,
        offline_bank_details: offlineBankDetails,
      },
    });
  } catch (error) {
    console.error('[RegionPaymentConfig] resolve_payment_config error:', error);
    return res.status(500).json({ status: 'error', message: 'Failed to resolve payment configuration' });
  }
};

// ── 7. LIST PENDING OFFLINE ORDERS FOR ADMIN APPROVAL ────────────────────────
// Fetches orders that have passed Accounts verification (verification_status: 'approved')
// and are waiting for Admin approval (admin_approval_status: 'pending').
const list_pending_offline_orders = async (req, res) => {
  try {
    const {
      order_type = 'all', // 'all' | 'epc' | 'fpo' | 'loose'
      page = 1,
      limit = 20,
      search,
    } = req.query;

    const pageNum = Math.max(1, parseInt(page, 10));
    const limitNum = Math.max(1, Math.min(100, parseInt(limit, 10)));
    const skip = (pageNum - 1) * limitNum;

    const fetchEpc = order_type === 'all' || order_type === 'epc';
    const fetchFpo = order_type === 'all' || order_type === 'fpo';
    const fetchLoose = order_type === 'all' || order_type === 'loose';

    let epcOrders = [];
    let fpoOrders = [];

    // Query EPC Orders
    if (fetchEpc) {
      const epcQuery = {
        'offline_payment.verification_status': 'approved',
        'offline_payment.admin_approval_status': 'pending',
      };
      if (search && search.trim()) {
        const sRegex = new RegExp(search.trim(), 'i');
        epcQuery.$or = [
          { order_number: sRegex },
          { 'offline_payment.utr_number': sRegex },
          { 'customer_details.name': sRegex },
          { 'customer_details.company_name': sRegex },
        ];
      }

      epcOrders = await EpcOrder.find(epcQuery)
        .populate('epc_id', 'company_name contact_person email phone')
        .populate('offline_payment.verified_by', 'name email')
        .sort({ 'offline_payment.verified_at': -1, created_at: -1 })
        .lean();
    }

    // Query FPO / Loose Orders
    if (fetchFpo || fetchLoose) {
      const fpoQuery = {
        'offline_payment.verification_status': 'approved',
        'offline_payment.admin_approval_status': 'pending',
      };
      if (fetchFpo && !fetchLoose) {
        fpoQuery.order_type = 'po_order';
      } else if (!fetchFpo && fetchLoose) {
        fpoQuery.order_type = { $in: ['loose_order', 'loose_kit_order'] };
      }

      if (search && search.trim()) {
        const sRegex = new RegExp(search.trim(), 'i');
        fpoQuery.$or = [
          { po_number: sRegex },
          { 'offline_payment.utr_number': sRegex },
          { 'customer_details.name': sRegex },
          { 'customer_details.company_name': sRegex },
        ];
      }

      fpoOrders = await FpoOrder.find(fpoQuery)
        .populate('franchisee_id', 'business_name full_name phone email')
        .populate('offline_payment.verified_by', 'name email')
        .sort({ 'offline_payment.verified_at': -1, created_at: -1 })
        .lean();
    }

    // Map into unified structure
    const unifiedOrders = [
      ...epcOrders.map((o) => ({
        _id: o._id,
        id: o._id,
        order_type: 'epc',
        order_type_label: 'EPC Order',
        order_number: o.order_number,
        customer_name: o.customer_details?.company_name || o.customer_details?.name || o.epc_id?.company_name || 'EPC Customer',
        customer_phone: o.customer_details?.phone || o.epc_id?.phone || '-',
        state_name: o.delivery_address?.state_name || o.delivery_address?.state || o.state_name || '-',
        district_name: o.delivery_address?.district_name || o.delivery_address?.district || o.district_name || '-',
        total_amount: o.pricing?.total_amount || (o.grand_total_paise ? o.grand_total_paise / 100 : 0) || o.total_amount || 0,
        amount_paid: o.offline_payment?.amount_paid || 0,
        utr_number: o.offline_payment?.utr_number || '-',
        receipt_url: o.offline_payment?.receipt_url || null,
        payment_date: o.offline_payment?.payment_date || null,
        sender_bank: o.offline_payment?.sender_bank_name || '-',
        accounts_status: o.offline_payment?.verification_status || 'approved',
        accounts_verified_by: o.offline_payment?.verified_by?.name || 'Accounts Team',
        accounts_verified_at: o.offline_payment?.verified_at || null,
        admin_approval_status: o.offline_payment?.admin_approval_status || 'pending',
        submitted_at: o.created_at,
        created_at: o.created_at,
        raw_order: o,
      })),
      ...fpoOrders.map((o) => ({
        _id: o._id,
        id: o._id,
        order_type: (o.order_type === 'loose_order' || o.order_type === 'loose_kit_order') ? 'loose' : 'fpo',
        order_type_label: (o.order_type === 'loose_order' || o.order_type === 'loose_kit_order') ? 'Loose Order' : 'Franchisee PO',
        order_number: o.po_number,
        customer_name: o.customer_details?.company_name || o.customer_details?.name || o.franchisee_id?.business_name || 'Franchisee',
        customer_phone: o.customer_details?.phone || o.franchisee_id?.phone || '-',
        state_name: o.destination_address || '-',
        district_name: o.destination_pincode || '-',
        total_amount: (o.net_payable_paise ? o.net_payable_paise / 100 : 0) || o.offline_payment?.amount_paid || 0,
        amount_paid: o.offline_payment?.amount_paid || 0,
        utr_number: o.offline_payment?.utr_number || '-',
        receipt_url: o.offline_payment?.receipt_url || null,
        payment_date: o.offline_payment?.payment_date || null,
        sender_bank: o.offline_payment?.sender_bank_name || '-',
        accounts_status: o.offline_payment?.verification_status || 'approved',
        accounts_verified_by: o.offline_payment?.verified_by?.name || 'Accounts Team',
        accounts_verified_at: o.offline_payment?.verified_at || null,
        admin_approval_status: o.offline_payment?.admin_approval_status || 'pending',
        submitted_at: o.created_at,
        created_at: o.created_at,
        raw_order: o,
      })),
    ];

    unifiedOrders.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    const total = unifiedOrders.length;
    const paginated = unifiedOrders.slice(skip, skip + limitNum);

    return res.status(200).json({
      status: 'success',
      data: paginated,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum) || 1,
      },
    });
  } catch (error) {
    console.error('[RegionPaymentConfig] list_pending_offline_orders error:', error);
    return res.status(500).json({ status: 'error', message: 'Failed to list pending offline orders' });
  }
};

// ── 8. ADMIN APPROVE OFFLINE ORDER ───────────────────────────────────────────
const approve_offline_order = async (req, res) => {
  try {
    const { orderType, id } = req.params;
    const { admin_remarks } = req.body;

    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ status: 'error', message: 'Invalid order ID' });
    }

    const userId = req.user?._id || req.user?.id || null;
    const now = new Date();
    const remarks = admin_remarks || 'Approved by Admin';

    if (orderType === 'epc') {
      const order = await EpcOrder.findById(id);
      if (!order) {
        return res.status(404).json({ status: 'error', message: 'EPC Order not found' });
      }

      order.offline_payment = order.offline_payment || {};
      order.offline_payment.admin_approval_status = 'approved';
      order.offline_payment.admin_approved_by = userId;
      order.offline_payment.admin_approved_at = now;
      order.offline_payment.admin_remarks = remarks;

      order.payment_status = 'captured';
      order.order_status = 'confirmed';
      order.payment_gateway_used = 'offline_utr';

      await order.save();

      return res.status(200).json({
        status: 'success',
        message: `EPC Order #${order.order_number} offline payment approved. Order confirmed.`,
        data: order,
      });
    } else if (orderType === 'fpo' || orderType === 'loose') {
      const order = await FpoOrder.findById(id);
      if (!order) {
        return res.status(404).json({ status: 'error', message: 'PO / Loose Order not found' });
      }

      order.offline_payment = order.offline_payment || {};
      order.offline_payment.admin_approval_status = 'approved';
      order.offline_payment.admin_approved_by = userId;
      order.offline_payment.admin_approved_at = now;
      order.offline_payment.admin_remarks = remarks;

      order.status = 'CONFIRMED';
      order.payment_gateway_used = 'offline_utr';

      await order.save();

      return res.status(200).json({
        status: 'success',
        message: `Order #${order.po_number} offline payment approved. Order confirmed.`,
        data: order,
      });
    } else {
      return res.status(400).json({ status: 'error', message: 'Invalid orderType. Must be epc, fpo, or loose' });
    }
  } catch (error) {
    console.error('[RegionPaymentConfig] approve_offline_order error:', error);
    return res.status(500).json({ status: 'error', message: 'Failed to approve offline payment' });
  }
};

// ── 9. ADMIN REJECT OFFLINE ORDER ────────────────────────────────────────────
const reject_offline_order = async (req, res) => {
  try {
    const { orderType, id } = req.params;
    const { rejection_reason, admin_remarks } = req.body;

    const reason = rejection_reason || admin_remarks;
    if (!reason || !reason.trim()) {
      return res.status(400).json({ status: 'error', message: 'Rejection reason is required' });
    }

    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ status: 'error', message: 'Invalid order ID' });
    }

    const userId = req.user?._id || req.user?.id || null;
    const now = new Date();

    if (orderType === 'epc') {
      const order = await EpcOrder.findById(id);
      if (!order) {
        return res.status(404).json({ status: 'error', message: 'EPC Order not found' });
      }

      order.offline_payment = order.offline_payment || {};
      order.offline_payment.admin_approval_status = 'rejected';
      order.offline_payment.admin_approved_by = userId;
      order.offline_payment.admin_approved_at = now;
      order.offline_payment.admin_remarks = reason.trim();

      order.payment_status = 'rejected';
      order.order_status = 'cancelled';

      await order.save();

      return res.status(200).json({
        status: 'success',
        message: `EPC Order #${order.order_number} offline payment rejected. Order cancelled.`,
        data: order,
      });
    } else if (orderType === 'fpo' || orderType === 'loose') {
      const order = await FpoOrder.findById(id);
      if (!order) {
        return res.status(404).json({ status: 'error', message: 'PO / Loose Order not found' });
      }

      order.offline_payment = order.offline_payment || {};
      order.offline_payment.admin_approval_status = 'rejected';
      order.offline_payment.admin_approved_by = userId;
      order.offline_payment.admin_approved_at = now;
      order.offline_payment.admin_remarks = reason.trim();

      order.status = 'REJECTED';

      await order.save();

      return res.status(200).json({
        status: 'success',
        message: `Order #${order.po_number} offline payment rejected. Order marked as REJECTED.`,
        data: order,
      });
    } else {
      return res.status(400).json({ status: 'error', message: 'Invalid orderType. Must be epc, fpo, or loose' });
    }
  } catch (error) {
    console.error('[RegionPaymentConfig] reject_offline_order error:', error);
    return res.status(500).json({ status: 'error', message: 'Failed to reject offline payment' });
  }
};

// ── 10. GET OFFLINE BANK ACCOUNT DETAILS ─────────────────────────────────────
const get_bank_account_details = async (req, res) => {
  try {
    const settings = await SolarShopSettings.findOne().lean();
<<<<<<< HEAD
    const bankDetails = {
      account_number: settings?.offline_bank_details?.account_number || '',
      ifsc_code: settings?.offline_bank_details?.ifsc_code || '',
=======
    const ifsc = settings?.offline_bank_details?.ifsc_code || '';
    const bankName = settings?.offline_bank_details?.bank_name || resolveBankNameFromIfsc(ifsc) || '';
    const bankDetails = {
      account_number: settings?.offline_bank_details?.account_number || '',
      ifsc_code: ifsc,
      bank_name: bankName,
>>>>>>> origin/main
      account_holder_name: settings?.offline_bank_details?.account_holder_name || '',
      updated_at: settings?.offline_bank_details?.updated_at || null,
    };
    return res.status(200).json({
      status: 'success',
      data: bankDetails,
    });
  } catch (error) {
    console.error('[RegionPaymentConfig] get_bank_account_details error:', error);
    return res.status(500).json({ status: 'error', message: 'Failed to retrieve offline bank details' });
  }
};

// ── 11. UPDATE OFFLINE BANK ACCOUNT DETAILS (Admin) ──────────────────────────
const update_bank_account_details = async (req, res) => {
  try {
<<<<<<< HEAD
    const { account_number, ifsc_code, account_holder_name } = req.body;
=======
    const { account_number, ifsc_code, account_holder_name, bank_name } = req.body;
>>>>>>> origin/main

    if (!account_number || typeof account_number !== 'string' || !account_number.trim()) {
      return res.status(400).json({ status: 'error', message: 'Account Number is required.' });
    }
    if (!ifsc_code || typeof ifsc_code !== 'string' || !ifsc_code.trim()) {
      return res.status(400).json({ status: 'error', message: 'IFSC Code is required.' });
    }
    if (!account_holder_name || typeof account_holder_name !== 'string' || !account_holder_name.trim()) {
      return res.status(400).json({ status: 'error', message: 'Account Holder Name is required.' });
    }

    const cleanedAccountNumber = account_number.trim().replace(/\s/g, '');
    const cleanedIfsc = ifsc_code.trim().toUpperCase().replace(/\s/g, '');
    const cleanedHolderName = account_holder_name.trim();

    if (!cleanedIfsc || cleanedIfsc.length < 4) {
      return res.status(400).json({
        status: 'error',
        message: 'Please enter a valid IFSC Code.',
      });
    }

<<<<<<< HEAD
=======
    const resolvedBankName = (bank_name && typeof bank_name === 'string' && bank_name.trim())
      ? bank_name.trim()
      : (resolveBankNameFromIfsc(cleanedIfsc) || '');

>>>>>>> origin/main
    let settings = await SolarShopSettings.findOne({});
    if (!settings) {
      settings = new SolarShopSettings({});
    }

    settings.offline_bank_details = {
      account_number: cleanedAccountNumber,
      ifsc_code: cleanedIfsc,
      account_holder_name: cleanedHolderName,
<<<<<<< HEAD
=======
      bank_name: resolvedBankName,
>>>>>>> origin/main
      updated_at: new Date(),
      updated_by: req.user?._id || req.user?.id || null,
    };

    await settings.save();

    return res.status(200).json({
      status: 'success',
      message: 'Offline bank account details successfully saved.',
      data: settings.offline_bank_details,
    });
  } catch (error) {
    console.error('[RegionPaymentConfig] update_bank_account_details error:', error);
    return res.status(500).json({ status: 'error', message: 'Failed to update offline bank details' });
  }
};

module.exports = {
  list_configs,
  get_config_by_id,
  create_config,
  update_config,
  toggle_config,
  resolve_payment_config,
  list_pending_offline_orders,
  approve_offline_order,
  reject_offline_order,
  get_bank_account_details,
  update_bank_account_details,
};
