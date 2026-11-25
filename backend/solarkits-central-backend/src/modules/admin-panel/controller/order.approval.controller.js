const mongoose = require('mongoose');
const {
  EpcOrder,
  FpoOrder,
  DeliveryOrder,
  SolarShopSettings,
} = require('../models/india_solarshop_db');
const {
  PurchaseIndent,
} = require('../../account-panel/models/company_warehouse_db');
const {
  CompanyWarehouse,
} = require('../models/company_warehouse_db');
const procurementHandler = require('../../account-panel/controller/procurement.handler');
const deliveryService = require('../services/delivery.management.service');

/**
 * Helper: Resolve Workflow Configuration & Stage TATs
 */
const getWorkflowConfig = async () => {
  let settings = await SolarShopSettings.findOne().lean();
  const defaultConfig = {
    require_order_approval: true,
    require_po_approval: true,
    require_advance_payment_approval: true,
    require_balance_payment_approval: true,
    require_delivery_variance_approval: true,
    variance_tolerance_pct: 0,
    stage_tat_hours: {
      order_approval: 24,
      po_approval: 24,
      advance_payment: 12,
      balance_payment: 12,
      delivery_charge: 24,
    },
    auto_escalate_overdue: true,
  };

  if (!settings?.approval_workflow_config) {
    return defaultConfig;
  }

  return {
    ...defaultConfig,
    ...settings.approval_workflow_config,
    stage_tat_hours: {
      ...defaultConfig.stage_tat_hours,
      ...(settings.approval_workflow_config.stage_tat_hours || {}),
    },
  };
};

/**
 * 1. GET SUMMARY / KPI COUNTS
 */
exports.get_summary = async (req, res) => {
  try {
    const config = await getWorkflowConfig();
    const now = new Date();

    const tatHours = config.stage_tat_hours || {};

    // 1. Pending Orders (EPC + FPO)
    const [epcPendingOrders, fpoPendingOrders] = await Promise.all([
      EpcOrder.find({
        $or: [
          { order_status: 'pending' },
          { payment_status: 'pending_verification' },
        ],
      }).lean(),
      FpoOrder.find({ status: { $in: ['PENDING_APPROVAL', 'SUBMITTED'] } }).lean(),
    ]);

    const totalPendingOrders = epcPendingOrders.length + fpoPendingOrders.length;
    let overdueOrdersCount = 0;
    const orderTatMs = (tatHours.order_approval || 24) * 3600000;
    [...epcPendingOrders, ...fpoPendingOrders].forEach((ord) => {
      const created = ord.createdAt || ord.created_at;
      if (created && now - new Date(created) > orderTatMs) {
        overdueOrdersCount++;
      }
    });

    // 2. Pending POs
    const pendingPos = await PurchaseIndent.find({
      'po_approval.status': 'pending',
    }).lean();
    const poTatMs = (tatHours.po_approval || 24) * 3600000;
    let overduePosCount = 0;
    pendingPos.forEach((po) => {
      const reqAt = po.po_approval?.requested_at || po.created_at || po.createdAt || po.po_date;
      if (reqAt && now - new Date(reqAt) > poTatMs) {
        overduePosCount++;
      }
    });

    // 3. Pending Supplier 1st Payment (Advance)
    const pendingAdvance = await PurchaseIndent.find({
      $or: [
        { 'payment.advance_approval.status': 'pending' },
        { 'payment.payment_status': 'Advance Requested' },
      ],
    }).lean();
    const advTatMs = (tatHours.advance_payment || 12) * 3600000;
    let overdueAdvanceCount = 0;
    pendingAdvance.forEach((adv) => {
      const reqAt = adv.payment?.advance_approval?.requested_at || adv.created_at || adv.createdAt || adv.po_date;
      if (reqAt && now - new Date(reqAt) > advTatMs) {
        overdueAdvanceCount++;
      }
    });

    // 4. Pending Supplier 2nd Payment (Balance)
    const pendingBalance = await PurchaseIndent.find({
      $or: [
        { 'payment.balance_approval.status': 'pending' },
        { 'payment.payment_status': 'Balance Requested' },
      ],
    }).lean();
    const balTatMs = (tatHours.balance_payment || 12) * 3600000;
    let overdueBalanceCount = 0;
    pendingBalance.forEach((bal) => {
      const reqAt = bal.payment?.balance_approval?.requested_at || bal.created_at || bal.createdAt || bal.po_date;
      if (reqAt && now - new Date(reqAt) > balTatMs) {
        overdueBalanceCount++;
      }
    });

    // 5. Pending Delivery Charge Variance Approvals
    const pendingDeliveries = await DeliveryOrder.find({
      $or: [
        { 'delivery_approval.status': 'pending' },
        { status: 'pending_approval' },
      ],
    }).lean();
    const delTatMs = (tatHours.delivery_charge || 24) * 3600000;
    let overdueDeliveriesCount = 0;
    pendingDeliveries.forEach((del) => {
      const reqAt = del.delivery_approval?.requested_at || del.createdAt;
      if (reqAt && now - new Date(reqAt) > delTatMs) {
        overdueDeliveriesCount++;
      }
    });

    // 6. Rejected / Returned Items across all streams
    const [
      epcRejectedCount,
      fpoRejectedCount,
      piRejectedCount,
      deliveryRejectedCount,
    ] = await Promise.all([
      EpcOrder.countDocuments({
        $or: [{ order_status: 'cancelled' }, { payment_status: 'rejected' }],
      }),
      FpoOrder.countDocuments({ status: { $in: ['REJECTED', 'CHANGES_REQUESTED'] } }),
      PurchaseIndent.countDocuments({
        $or: [
          { 'po_approval.status': { $in: ['rejected', 'returned'] } },
          { 'payment.advance_approval.status': { $in: ['rejected', 'returned'] } },
          { 'payment.balance_approval.status': { $in: ['rejected', 'returned'] } },
          { 'payment.payment_status': 'Rejected / Returned' },
        ],
      }),
      DeliveryOrder.countDocuments({
        $or: [
          { 'delivery_approval.status': { $in: ['rejected', 'returned'] } },
          { status: { $in: ['cost_rejected', 'cost_returned'] } },
        ],
      }),
    ]);

    // 7. Approved Items Count Today
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const [
      epcApprovedToday,
      fpoApprovedToday,
      piApprovedToday,
      deliveryApprovedToday,
    ] = await Promise.all([
      EpcOrder.countDocuments({
        order_status: { $in: ['confirmed', 'processing', 'vehicle_assigned', 'dispatched', 'delivered'] },
        updatedAt: { $gte: startOfToday },
      }),
      FpoOrder.countDocuments({
        status: { $in: ['APPROVED', 'CONFIRMED', 'PROCESSING', 'DISPATCHED', 'DELIVERED'] },
        updatedAt: { $gte: startOfToday },
      }),
      PurchaseIndent.countDocuments({
        $or: [
          { 'po_approval.status': 'approved', 'po_approval.approved_at': { $gte: startOfToday } },
          { 'payment.advance_approval.status': 'approved', 'payment.advance_approval.approved_at': { $gte: startOfToday } },
          { 'payment.balance_approval.status': 'approved', 'payment.balance_approval.approved_at': { $gte: startOfToday } },
        ],
      }),
      DeliveryOrder.countDocuments({
        'delivery_approval.status': 'approved',
        'delivery_approval.approved_at': { $gte: startOfToday },
      }),
    ]);

    const totalOverdue =
      overdueOrdersCount +
      overduePosCount +
      overdueAdvanceCount +
      overdueBalanceCount +
      overdueDeliveriesCount;

    const totalRejectedReturned =
      epcRejectedCount +
      fpoRejectedCount +
      piRejectedCount +
      deliveryRejectedCount;

    const totalApprovedToday =
      epcApprovedToday +
      fpoApprovedToday +
      piApprovedToday +
      deliveryApprovedToday;

    return res.status(200).json({
      status: 'success',
      data: {
        kpis: {
          pending_orders: totalPendingOrders,
          pending_pos: pendingPos.length,
          pending_first_payment: pendingAdvance.length,
          pending_second_payment: pendingBalance.length,
          pending_delivery: pendingDeliveries.length,
          rejected_returned: totalRejectedReturned,
          approved_today: totalApprovedToday,
          total_overdue: totalOverdue,
          overdue_by_stage: {
            orders: overdueOrdersCount,
            pos: overduePosCount,
            first_payment: overdueAdvanceCount,
            second_payment: overdueBalanceCount,
            delivery: overdueDeliveriesCount,
          },
        },
        config,
      },
    });
  } catch (err) {
    console.error('Error in order.approval.controller.get_summary:', err);
    return res.status(500).json({ status: 'error', message: err.message });
  }
};

/**
 * 2. GET UNIFIED APPROVAL QUEUE
 */
exports.get_queue = async (req, res) => {
  try {
    const {
      stage = 'all',
      status = 'all',
      search = '',
      page = 1,
      limit = 25,
    } = req.query;

    const config = await getWorkflowConfig();
    const tatHours = config.stage_tat_hours || {};
    const now = new Date();
    const searchRegex = search ? new RegExp(search.trim(), 'i') : null;

    let queueItems = [];

    // Helper: calculate TAT info
    const enrichTat = (createdOrReqDate, stageKey) => {
      const tatLimitHours = tatHours[stageKey] || 24;
      const startDate = createdOrReqDate ? new Date(createdOrReqDate) : now;
      const hoursPending = Math.max(0, Math.round((now - startDate) / 3600000));
      return {
        tat_hours: tatLimitHours,
        hours_pending: hoursPending,
        is_overdue: hoursPending > tatLimitHours,
      };
    };

/**
 * Helpers to format complete Buyer & Customer Order Details for 360 Inspection
 */
const formatEpcOrderDetails = (ord) => {
  if (!ord) return null;
  const epc = ord.epc_id || {};
  const res = ord.reseller_id || {};
  const addr = ord.delivery_address || {};

  const items = (ord.items || []).map((it) => ({
    item_name: it.item_name || 'Solar Kit',
    capacity: it.capacity || '',
    scope_type: it.scope_type || 'kit',
    quantity: it.quantity || 1,
    unit_price: it.unit_price_paise ? it.unit_price_paise / 100 : (it.unit_price || 0),
    total_price: it.total_price_paise ? it.total_price_paise / 100 : (it.total_price || 0),
  }));

  return {
    order_type: 'Solar EPC Buyer Order',
    order_number: ord.order_number,
    order_request_id: ord.order_request_id || null,
    order_date: ord.created_at || ord.createdAt,
    order_status: ord.order_status,
    grand_total: ord.grand_total_paise ? ord.grand_total_paise / 100 : 0,
    subtotal: ord.subtotal_paise ? ord.subtotal_paise / 100 : 0,
    tax_total: ord.tax_total_paise ? ord.tax_total_paise / 100 : 0,
    shipping_fee: ord.shipping_fee_paise ? ord.shipping_fee_paise / 100 : 0,
    payment_method: ord.payment_method || 'offline_bank_transfer',
    payment_status: ord.payment_status || 'pending',
    payment_reference: ord.payment_reference || ord.offline_payment?.utr_number || null,
    buyer: {
      name: epc.gstin_trade_name || epc.gstin_legal_name || epc.name || 'Solar EPC Buyer',
      contact_person: epc.name || addr.contact_name || 'Buyer Contact',
      phone: epc.whatsapp || epc.registered_whatsapp || addr.contact_phone || 'N/A',
      email: epc.email || 'N/A',
      gst: epc.gstin || 'N/A',
      address: epc.address || [addr.line, addr.district_name, addr.state_name, addr.pincode].filter(Boolean).join(', ') || 'N/A',
      state: epc.state_name || addr.state_name || 'N/A',
      district: epc.district_name || addr.district_name || 'N/A',
      pincode: epc.pincode || addr.pincode || 'N/A',
    },
    delivery_address: {
      line: addr.line || 'Site Delivery Location',
      district: addr.district_name || 'N/A',
      state: addr.state_name || 'N/A',
      pincode: addr.pincode || 'N/A',
      contact_name: addr.contact_name || epc.name || 'Site Contact',
      contact_phone: addr.contact_phone || epc.whatsapp || 'N/A',
    },
    reseller_partner: {
      name: res.business_name || res.name || 'SolarKits Central Direct',
      city: res.city || 'Central Hub',
      phone: res.mobile || 'N/A',
      email: res.email || 'N/A',
    },
    items,
  };
};

const formatFpoOrderDetails = (fpo) => {
  if (!fpo) return null;
  const res = fpo.franchisee_id || fpo.reseller_id || {};
  const epc = fpo.epc_id || {};
  const addr = typeof fpo.delivery_address === 'string'
    ? { line: fpo.delivery_address, district_name: res.city || 'Ahmedabad', state_name: 'Gujarat', pincode: '' }
    : fpo.delivery_address || {};

  const items = (fpo.items || []).map((it) => ({
    item_name: it.kit_name || it.item_name || 'Franchise Combo Kit',
    capacity: it.capacity || '',
    scope_type: 'kit',
    quantity: it.quantity || 1,
    unit_price: it.unit_price_paise ? it.unit_price_paise / 100 : (it.unit_price || 0),
    total_price: it.total_price_paise ? it.total_price_paise / 100 : (it.total_price || 0),
  }));

  const grandTotal = (fpo.net_payable_paise ? fpo.net_payable_paise / 100 : 0) || (fpo.grand_total_paise ? fpo.grand_total_paise / 100 : 0) || (fpo.financials?.grand_total_paise ? fpo.financials.grand_total_paise / 100 : 0) || fpo.total_amount || 0;
  const subTotal = (fpo.base_price_paise ? fpo.base_price_paise / 100 : 0) || (fpo.financials?.subtotal_paise ? fpo.financials.subtotal_paise / 100 : 0) || grandTotal;
  const taxTotal = (fpo.gst_paise ? fpo.gst_paise / 100 : 0) || (fpo.financials?.tax_paise ? fpo.financials.tax_paise / 100 : 0) || 0;

  const buyerName = fpo.po_origin?.epc_name || fpo.po_origin?.epc_company || epc.company_name || epc.name || res.business_name || res.name || 'Franchisee Store';
  const buyerPhone = addr.contact_phone || epc.whatsapp || epc.phone || res.mobile || 'N/A';
  const buyerEmail = epc.email || res.email || 'N/A';
  const buyerGst = epc.gstin || res.gst_number || 'N/A';

  return {
    order_type: fpo.po_origin?.is_po_drawdown ? 'PO Order Drawdown (EPC)' : 'Franchisee Store Order (FPO)',
    order_number: fpo.po_number || fpo.order_number,
    order_request_id: fpo.order_group_id || fpo.order_request_id || null,
    order_date: fpo.created_at || fpo.createdAt,
    order_status: fpo.status,
    grand_total: grandTotal,
    subtotal: subTotal,
    tax_total: taxTotal,
    shipping_fee: 0,
    payment_method: fpo.payment_method || 'Franchise Token / Escrow',
    payment_status: fpo.payment_status || fpo.status || 'pending',
    payment_reference: fpo.offline_payment?.utr_number || fpo.token_transaction_ref || null,
    buyer: {
      name: buyerName,
      contact_person: epc.name || res.name || 'Store Manager',
      phone: buyerPhone,
      email: buyerEmail,
      gst: buyerGst,
      address: [addr.line || addr.address_line, addr.district_name || addr.district, addr.state_name || addr.state, addr.pincode].filter(Boolean).join(', ') || 'N/A',
      state: addr.state_name || addr.state || 'N/A',
      district: addr.district_name || addr.district || res.city || 'N/A',
      pincode: addr.pincode || 'N/A',
    },
    delivery_address: {
      line: addr.line || addr.address_line || 'Regional Hub Warehouse',
      district: addr.district_name || addr.district || res.city || 'N/A',
      state: addr.state_name || addr.state || 'N/A',
      pincode: addr.pincode || 'N/A',
      contact_name: addr.contact_name || epc.name || res.name || 'Store Contact',
      contact_phone: addr.contact_phone || epc.phone || res.mobile || 'N/A',
    },
    reseller_partner: {
      name: res.business_name || res.name || 'Franchise Partner',
      city: res.city || 'Regional Hub',
      phone: res.mobile || 'N/A',
      email: res.email || 'N/A',
    },
    items,
  };
};

    // ── STAGE 1: ORDERS ────────────────────────────────────────────────────────
    if (['all', 'orders', 'overdue', 'rejected_returned', 'approved'].includes(stage)) {
      const epcQuery = {};
      const fpoQuery = {};

      if (stage === 'orders') {
        if (status === 'pending') {
          epcQuery.$or = [{ order_status: 'pending' }, { payment_status: 'pending_verification' }];
          fpoQuery.status = { $in: ['PENDING_APPROVAL', 'SUBMITTED'] };
        } else if (status === 'approved') {
          epcQuery.order_status = { $in: ['confirmed', 'processing', 'vehicle_assigned', 'dispatched'] };
          fpoQuery.status = { $in: ['APPROVED', 'CONFIRMED'] };
        } else if (status === 'rejected') {
          epcQuery.order_status = 'cancelled';
          fpoQuery.status = 'REJECTED';
        } else if (status === 'returned') {
          fpoQuery.status = 'CHANGES_REQUESTED';
        }
      }

      const [epcList, fpoList] = await Promise.all([
        EpcOrder.find(epcQuery)
          .populate('epc_id', 'name email whatsapp registered_whatsapp gstin gstin_trade_name gstin_legal_name address district_name state_name pincode')
          .populate('reseller_id', 'business_name name mobile email city')
          .sort({ createdAt: -1 })
          .limit(100)
          .lean(),
        FpoOrder.find(fpoQuery)
          .populate('franchisee_id', 'business_name name mobile email city address')
          .populate('reseller_id', 'business_name name mobile email city address')
          .populate('epc_id', 'name email whatsapp registered_whatsapp gstin address district_name state_name pincode')
          .sort({ createdAt: -1 })
          .limit(100)
          .lean(),
      ]);

      epcList.forEach((ord) => {
        const amount = ord.grand_total_paise ? ord.grand_total_paise / 100 : 0;
        const tat = enrichTat(ord.createdAt, 'order_approval');
        let ordStatus = 'pending';
        if (ord.order_status === 'cancelled' || ord.payment_status === 'rejected') ordStatus = 'rejected';
        else if (ord.order_status !== 'pending') ordStatus = 'approved';

        const orderInfo = formatEpcOrderDetails(ord);

        queueItems.push({
          _id: ord._id.toString(),
          stage: 'orders',
          stage_label: 'Customer Store Order (EPC)',
          order_number: ord.order_number,
          pi_number: null,
          order_group_id: ord.order_request_id || null,
          entity_name: ord.epc_id?.gstin_trade_name || ord.epc_id?.name || 'EPC Buyer',
          partner_name: ord.reseller_id?.business_name || ord.reseller_id?.name || 'Direct / Platform',
          requested_amount: amount,
          benchmark_amount: amount,
          variance_amount: 0,
          variance_percentage: 0,
          approval_status: ordStatus,
          requested_at: ord.createdAt,
          requested_by_name: ord.epc_id?.name || 'Customer Online',
          tat_hours: tat.tat_hours,
          hours_pending: tat.hours_pending,
          is_overdue: tat.is_overdue && ordStatus === 'pending',
          customer_order_info: orderInfo,
          decision_info: {
            approved_by: ord.commission_notes ? 'Admin' : null,
            approved_at: ord.updatedAt,
            remarks: ord.commission_notes || '',
          },
          details: {
            ...ord,
            customer_order_info: orderInfo,
          },
        });
      });

      fpoList.forEach((fpo) => {
        const amount = (fpo.net_payable_paise ? fpo.net_payable_paise / 100 : 0) || (fpo.grand_total_paise ? fpo.grand_total_paise / 100 : 0) || (fpo.financials?.grand_total_paise ? fpo.financials.grand_total_paise / 100 : 0) || fpo.total_amount || 0;
        const tat = enrichTat(fpo.createdAt || fpo.created_at, 'order_approval');
        let fpoStatus = 'pending';
        if (fpo.status === 'APPROVED' || fpo.status === 'CONFIRMED' || fpo.status === 'PAID') fpoStatus = 'approved';
        else if (fpo.status === 'REJECTED') fpoStatus = 'rejected';
        else if (fpo.status === 'CHANGES_REQUESTED') fpoStatus = 'returned';

        const orderInfo = formatFpoOrderDetails(fpo);
        const res = fpo.franchisee_id || fpo.reseller_id || {};
        const epc = fpo.epc_id || {};

        queueItems.push({
          _id: fpo._id.toString(),
          stage: 'orders',
          stage_label: fpo.po_origin?.is_po_drawdown ? 'PO Order Drawdown (EPC)' : 'Franchisee PO Order (FPO)',
          order_number: fpo.po_number || fpo.order_number,
          pi_number: null,
          order_group_id: fpo.order_group_id || fpo.order_request_id || null,
          entity_name: fpo.po_origin?.epc_name || fpo.po_origin?.epc_company || epc.company_name || epc.name || res.business_name || res.name || 'Franchisee Store',
          partner_name: res.business_name || res.city || epc.name || 'Franchisee Store',
          requested_amount: amount,
          benchmark_amount: amount,
          variance_amount: 0,
          variance_percentage: 0,
          approval_status: fpoStatus,
          requested_at: fpo.createdAt || fpo.created_at,
          requested_by_name: fpo.po_origin?.epc_name || epc.name || res.name || 'Store Manager',
          tat_hours: tat.tat_hours,
          hours_pending: tat.hours_pending,
          is_overdue: tat.is_overdue && fpoStatus === 'pending',
          customer_order_info: orderInfo,
          decision_info: {
            approved_by: fpo.status_history?.slice(-1)[0]?.changed_by || null,
            approved_at: fpo.updatedAt || fpo.updated_at,
            remarks: fpo.status_history?.slice(-1)[0]?.note || '',
          },
          details: {
            ...fpo,
            customer_order_info: orderInfo,
          },
        });
      });
    }

    // ── STAGE 2, 3, 4: PURCHASE ORDERS & SUPPLIER PAYMENTS ────────────────────
    const needsPiStages = ['all', 'pos', 'first_payment', 'second_payment', 'overdue', 'rejected_returned', 'approved'].some((s) => s === stage);

    if (needsPiStages) {
      const [piList, piAdvanceList, piBalanceList] = await Promise.all([
        ['all', 'pos', 'overdue', 'rejected_returned', 'approved'].includes(stage)
          ? PurchaseIndent.find().sort({ created_at: -1, _id: -1 }).limit(100).lean()
          : [],
        ['all', 'first_payment', 'overdue', 'rejected_returned', 'approved'].includes(stage)
          ? PurchaseIndent.find({
              $or: [
                { 'payment.advance_approval.status': { $in: ['pending', 'approved', 'rejected', 'returned'] } },
                { 'payment.payment_status': 'Advance Requested' },
              ],
            }).sort({ 'payment.advance_approval.requested_at': -1, created_at: -1, _id: -1 }).limit(100).lean()
          : [],
        ['all', 'second_payment', 'overdue', 'rejected_returned', 'approved'].includes(stage)
          ? PurchaseIndent.find({
              $or: [
                { 'payment.balance_approval.status': { $in: ['pending', 'approved', 'rejected', 'returned'] } },
                { 'payment.payment_status': 'Balance Requested' },
              ],
            }).sort({ 'payment.balance_approval.requested_at': -1, created_at: -1, _id: -1 }).limit(100).lean()
          : [],
      ]);

      // Collect all customer order numbers referenced in these PIs
      const piOrderNumbers = [
        ...new Set([
          ...piList.map((p) => p.customer_order_number),
          ...piAdvanceList.map((p) => p.customer_order_number),
          ...piBalanceList.map((p) => p.customer_order_number),
        ].filter(Boolean))
      ];

      // Fetch buyer and order details from both EPC and FPO collections
      const [relatedEpcs, relatedFpos] = await Promise.all([
        piOrderNumbers.length > 0
          ? EpcOrder.find({ order_number: { $in: piOrderNumbers } })
              .populate('epc_id', 'name email whatsapp registered_whatsapp gstin gstin_trade_name gstin_legal_name address district_name state_name pincode')
              .populate('reseller_id', 'business_name name mobile email city address')
              .lean()
          : [],
        piOrderNumbers.length > 0
          ? FpoOrder.find({ po_number: { $in: piOrderNumbers } })
              .populate('franchisee_id', 'business_name name mobile email city address')
              .populate('reseller_id', 'business_name name mobile email city address')
              .populate('epc_id', 'name email whatsapp registered_whatsapp gstin address district_name state_name pincode')
              .lean()
          : [],
      ]);

      const orderLookup = {};
      relatedEpcs.forEach((o) => {
        orderLookup[o.order_number] = formatEpcOrderDetails(o);
      });
      relatedFpos.forEach((o) => {
        orderLookup[o.po_number] = formatFpoOrderDetails(o);
      });

      // ── Process POs ──
      piList.forEach((pi) => {
        const poApproval = pi.po_approval || {};
        const poStatus = poApproval.status || 'pending';
        const piDate = pi.created_at || pi.createdAt || pi.po_date;
        const tat = enrichTat(poApproval.requested_at || piDate, 'po_approval');

        let benchTotal = Number(pi.benchmark_total_cost) || 0;
        if (!benchTotal && (Number(pi.benchmark_cost) > 0 || pi.is_above_benchmark)) {
          const totalQty = (pi.items || []).reduce((acc, it) => acc + (Number(it.quantity) || 0), 0) || 1;
          const gst = (pi.items?.[0]?.gst_rate != null ? Number(pi.items[0].gst_rate) : 13.8);
          const unitBench = Number(pi.benchmark_cost) || 0;
          if (unitBench > 0) {
            benchTotal = Math.round(unitBench * totalQty * (1 + gst / 100));
          }
        }
        if (!benchTotal) {
          benchTotal = pi.total_pi_value || 0;
        }

        const rateDiff = Math.max(0, (pi.total_pi_value || 0) - benchTotal);
        const isBenchmarkExceeded = Boolean(pi.is_above_benchmark || rateDiff > 0);
        const unitRate = pi.items?.[0]?.unit_rate || 0;
        const benchUnitRate = pi.benchmark_cost || 0;
        const customerOrder = orderLookup[pi.customer_order_number] || null;

        queueItems.push({
          _id: pi._id.toString(),
          stage: 'pos',
          stage_label: 'Purchase Order (PO)',
          order_number: pi.customer_order_number || pi.pi_number,
          pi_number: pi.pi_number,
          order_group_id: pi.order_group_id || null,
          entity_name: pi.supplier_name || 'Procurement Supplier',
          partner_name: pi.is_oem_partner ? 'OEM Partner (SolarKits Brand)' : (pi.supplier_brand || 'Supplier Partner'),
          requested_amount: pi.total_pi_value || 0,
          benchmark_amount: benchTotal,
          variance_amount: rateDiff,
          variance_percentage: benchTotal > 0 && rateDiff > 0 ? Number(((rateDiff / benchTotal) * 100).toFixed(2)) : 0,
          is_above_benchmark: isBenchmarkExceeded,
          benchmark_cost_unit: benchUnitRate,
          entered_unit_rate: unitRate,
          approval_reason: isBenchmarkExceeded 
            ? `Rate (₹${Number(unitRate).toLocaleString('en-IN')}) exceeds Benchmark Cost (₹${Number(benchUnitRate).toLocaleString('en-IN')})` 
            : 'Standard PO Approval',
          approval_status: poStatus,
          requested_at: poApproval.requested_at || piDate || new Date(0).toISOString(),
          requested_by_name: poApproval.requested_by_name || 'Procurement Manager',
          tat_hours: tat.tat_hours,
          hours_pending: tat.hours_pending,
          is_overdue: tat.is_overdue && poStatus === 'pending',
          customer_order_info: customerOrder,
          decision_info: {
            approved_by: poApproval.approved_by_name || null,
            approved_at: poApproval.approved_at,
            remarks: poApproval.remarks || poApproval.rejection_reason || poApproval.return_reason || '',
          },
          details: {
            ...pi,
            customer_order_info: customerOrder,
          },
        });
      });

      // ── Process 1st Payment (Advance) ──
      piAdvanceList.forEach((pi) => {
        const advApproval = pi.payment?.advance_approval || {};
        let advStatus = advApproval.status;
        if (!advStatus) {
          if (pi.payment?.payment_status === 'Advance Requested') advStatus = 'pending';
          else if (pi.payment?.advance_payment?.utr_number || pi.payment?.payment_status === 'Advance Paid' || pi.payment?.payment_status === 'Paid') advStatus = 'approved';
          else if (pi.payment?.payment_status === 'Rejected / Returned') advStatus = 'rejected';
          else return; // Skip unrequested indents
        }

        const piDate = pi.created_at || pi.createdAt || pi.po_date;
        const tat = enrichTat(advApproval.requested_at || piDate, 'advance_payment');
        const advAmount = advApproval.requested_amount || pi.payment?.advance_amount || Math.round((pi.total_pi_value || 0) * ((pi.payment?.advance_percentage || 30) / 100));
        const customerOrder = orderLookup[pi.customer_order_number] || null;

        queueItems.push({
          _id: pi._id.toString(),
          stage: 'first_payment',
          stage_label: 'Supplier First Payment (Advance)',
          order_number: pi.customer_order_number || pi.pi_number,
          pi_number: pi.pi_number,
          order_group_id: pi.order_group_id || null,
          entity_name: pi.supplier_name || 'Procurement Supplier',
          partner_name: pi.is_oem_partner ? 'OEM Partner (SolarKits Brand)' : (pi.supplier_brand || 'Supplier Partner'),
          requested_amount: advAmount,
          benchmark_amount: advAmount,
          variance_amount: 0,
          variance_percentage: 0,
          approval_status: advStatus,
          requested_at: advApproval.requested_at || piDate || new Date(0).toISOString(),
          requested_by_name: advApproval.requested_by_name || 'Accounts Desk',
          tat_hours: tat.tat_hours,
          hours_pending: tat.hours_pending,
          is_overdue: tat.is_overdue && advStatus === 'pending',
          customer_order_info: customerOrder,
          decision_info: {
            approved_by: advApproval.approved_by_name || pi.payment?.admin_approval?.approved_by || null,
            approved_at: advApproval.approved_at || pi.payment?.admin_approval?.approved_at,
            remarks: advApproval.remarks || advApproval.rejection_reason || advApproval.return_reason || '',
          },
          details: {
            ...pi,
            customer_order_info: customerOrder,
          },
        });
      });

      // ── Process 2nd Payment (Balance) ──
      piBalanceList.forEach((pi) => {
        const balApproval = pi.payment?.balance_approval || {};
        let balStatus = balApproval.status;
        if (!balStatus) {
          if (pi.payment?.payment_status === 'Balance Requested') balStatus = 'pending';
          else if (pi.payment?.balance_payment?.utr_number || pi.payment?.payment_status === 'Paid') balStatus = 'approved';
          else if (pi.payment?.payment_status === 'Rejected / Returned') balStatus = 'rejected';
          else return; // Skip unrequested indents
        }

        const piDate = pi.created_at || pi.createdAt || pi.po_date;
        const tat = enrichTat(balApproval.requested_at || piDate, 'balance_payment');
        const balAmount = balApproval.requested_amount || pi.payment?.balance_amount || Math.max(0, (pi.total_pi_value || 0) - (pi.payment?.advance_payment?.paid_amount || pi.payment?.advance_amount || 0));
        const customerOrder = orderLookup[pi.customer_order_number] || null;

        queueItems.push({
          _id: pi._id.toString(),
          stage: 'second_payment',
          stage_label: 'Supplier Second Payment (Balance)',
          order_number: pi.customer_order_number || pi.pi_number,
          pi_number: pi.pi_number,
          order_group_id: pi.order_group_id || null,
          entity_name: pi.supplier_name || 'Procurement Supplier',
          partner_name: pi.is_oem_partner ? 'OEM Partner (SolarKits Brand)' : (pi.supplier_brand || 'Supplier Partner'),
          requested_amount: balAmount,
          benchmark_amount: balAmount,
          variance_amount: 0,
          variance_percentage: 0,
          approval_status: balStatus,
          requested_at: balApproval.requested_at || piDate || new Date(0).toISOString(),
          requested_by_name: balApproval.requested_by_name || 'Accounts Desk',
          tat_hours: tat.tat_hours,
          hours_pending: tat.hours_pending,
          is_overdue: tat.is_overdue && balStatus === 'pending',
          customer_order_info: customerOrder,
          decision_info: {
            approved_by: balApproval.approved_by_name || null,
            approved_at: balApproval.approved_at,
            remarks: balApproval.remarks || balApproval.rejection_reason || balApproval.return_reason || '',
          },
          details: {
            ...pi,
            customer_order_info: customerOrder,
          },
        });
      });
    }

    // ── STAGE 5: DELIVERY CHARGE APPROVAL ──────────────────────────────────────
    if (['all', 'delivery', 'overdue', 'rejected_returned', 'approved'].includes(stage)) {
      const delList = await DeliveryOrder.find({
        $or: [
          { 'delivery_approval.status': { $in: ['pending', 'approved', 'rejected', 'returned'] } },
          { status: { $in: ['pending_approval', 'cost_approved', 'cost_rejected', 'cost_returned', 'vehicle_assigned'] } },
        ],
      })
        .populate({ path: 'warehouse_id', model: CompanyWarehouse, select: 'warehouse_code address' })
        .populate('service_provider_id', 'name mobile_number')
        .populate('delivery_approval.approved_by', 'first_name last_name email')
        .sort({ createdAt: -1 })
        .limit(100)
        .lean();

      delList.forEach((del) => {
        const app = del.delivery_approval || {};
        const delStatus = app.status || (del.status === 'pending_approval' ? 'pending' : (del.status === 'cost_approved' ? 'approved' : 'none'));
        if (delStatus === 'none' && !del.variance_from_benchmark) return;

        const tat = enrichTat(app.requested_at || del.createdAt, 'delivery_charge');
        const driverName = del.vehicles_allocated?.[0]?.driver_name;
        const regNum = del.vehicles_allocated?.[0]?.registration_number;
        const firstStop = del.stops?.[0];

        const delOrderInfo = {
          order_type: 'Consolidated Delivery Dispatch',
          order_number: firstStop?.order_number || del.delivery_number,
          order_date: del.createdAt,
          order_status: del.status,
          grand_total: del.actual_vendor_cost || 0,
          buyer: {
            name: firstStop?.recipient_name || 'Delivery Recipient',
            contact_person: firstStop?.recipient_name || 'Site Contact',
            phone: firstStop?.contact_number || 'N/A',
            email: 'N/A',
            gst: 'N/A',
            address: firstStop?.destination?.address || 'Site Delivery Location',
          },
          delivery_address: {
            line: firstStop?.destination?.address || 'Site Location',
            district: firstStop?.destination?.district || 'N/A',
            state: firstStop?.destination?.state || 'N/A',
            pincode: firstStop?.destination?.pincode || 'N/A',
            contact_name: firstStop?.recipient_name || 'Site Contact',
            contact_phone: firstStop?.contact_number || 'N/A',
          },
          reseller_partner: {
            name: del.service_provider_id?.name || 'Transporter Fleet',
            city: firstStop?.destination?.district || 'Depot',
            phone: del.service_provider_id?.mobile_number || 'N/A',
          },
          items: (del.stops || []).map((st) => ({
            item_name: `Stop Order #${st.order_number || ''}`,
            capacity: `${st.cargo?.total_kits || 1} Kit(s)`,
            scope_type: 'kit',
            quantity: st.cargo?.total_kits || 1,
            unit_price: 0,
            total_price: 0,
          })),
        };

        queueItems.push({
          _id: del._id.toString(),
          stage: 'delivery',
          stage_label: 'Delivery Charge Variance',
          order_number: del.delivery_number,
          pi_number: null,
          order_group_id: del.stops?.[0]?.order_number || null,
          entity_name: del.service_provider_id?.name || 'Transporter / Fleet',
          partner_name: regNum ? `${regNum} (${driverName || 'Driver'})` : 'Assigned Fleet',
          requested_amount: del.actual_vendor_cost || 0,
          benchmark_amount: del.company_benchmark_cost || 0,
          variance_amount: Math.max(0, del.variance_from_benchmark || 0),
          variance_percentage: app.variance_percentage || 0,
          approval_status: delStatus === 'none' ? 'approved' : delStatus,
          requested_at: app.requested_at || del.createdAt,
          requested_by_name: 'Delivery Manager',
          tat_hours: tat.tat_hours,
          hours_pending: tat.hours_pending,
          is_overdue: tat.is_overdue && delStatus === 'pending',
          customer_order_info: delOrderInfo,
          decision_info: {
            approved_by: app.approved_by?.first_name ? `${app.approved_by.first_name} ${app.approved_by.last_name || ''}` : null,
            approved_at: app.approved_at,
            remarks: app.approval_remarks || app.rejection_reason || app.return_reason || '',
          },
          details: {
            ...del,
            customer_order_info: delOrderInfo,
          },
        });
      });
    }

    // ── Apply Stage Filters, Status Filters & Search ───────────────────────────
    if (stage === 'overdue') {
      queueItems = queueItems.filter((item) => item.is_overdue);
    } else if (stage === 'rejected_returned') {
      queueItems = queueItems.filter((item) => ['rejected', 'returned'].includes(item.approval_status));
    } else if (stage === 'approved') {
      queueItems = queueItems.filter((item) => item.approval_status === 'approved');
    } else if (stage !== 'all') {
      queueItems = queueItems.filter((item) => item.stage === stage);
    }

    if (status !== 'all') {
      queueItems = queueItems.filter((item) => item.approval_status === status);
    }

    if (searchRegex) {
      queueItems = queueItems.filter((item) => {
        return (
          searchRegex.test(item.order_number || '') ||
          searchRegex.test(item.pi_number || '') ||
          searchRegex.test(item.order_group_id || '') ||
          searchRegex.test(item.entity_name || '') ||
          searchRegex.test(item.partner_name || '')
        );
      });
    }

    // Sort queue items:
    // 1. Pending requests ALWAYS come first (at the top)!
    // 2. Overdue pending items come at the very top.
    // 3. Within pending requests, newest request (latest requested_at) comes first!
    // 4. Non-pending items (approved, rejected, returned) follow, also sorted by newest first.
    queueItems.sort((a, b) => {
      const isPendingA = a.approval_status === 'pending';
      const isPendingB = b.approval_status === 'pending';

      // If one is pending and the other is not, pending ALWAYS comes first
      if (isPendingA && !isPendingB) return -1;
      if (!isPendingA && isPendingB) return 1;

      // If both are pending, overdue comes first
      if (isPendingA && isPendingB) {
        if (a.is_overdue && !b.is_overdue) return -1;
        if (!a.is_overdue && b.is_overdue) return 1;
      }

      // Both in same status bucket: newest requested_at first!
      const timeA = new Date(a.requested_at || 0).getTime();
      const timeB = new Date(b.requested_at || 0).getTime();
      return timeB - timeA;
    });

    const total = queueItems.length;
    const pageNum = Number(page) || 1;
    const limitNum = Number(limit) || 25;
    const paginatedItems = queueItems.slice((pageNum - 1) * limitNum, pageNum * limitNum);

    return res.status(200).json({
      status: 'success',
      data: {
        records: paginatedItems,
        total,
        page: pageNum,
        pages: Math.ceil(total / limitNum),
      },
    });
  } catch (err) {
    console.error('Error in order.approval.controller.get_queue:', err);
    return res.status(500).json({ status: 'error', message: err.message });
  }
};

/**
 * 3. SUBMIT APPROVAL DECISION (APPROVE / REJECT / RETURN)
 */
exports.submit_action = async (req, res) => {
  try {
    const { stage, id } = req.params;
    const { decision, remarks } = req.body;

    if (!decision || !['approve', 'reject', 'return'].includes(decision)) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid decision. Must be approve, reject, or return.',
      });
    }

    if ((decision === 'reject' || decision === 'return') && (!remarks || !remarks.trim())) {
      return res.status(400).json({
        status: 'error',
        message: 'Remarks or reason are mandatory when rejecting or returning an approval.',
      });
    }

    const adminUser = req.user;
    const adminName = adminUser?.first_name ? `${adminUser.first_name} ${adminUser.last_name || ''}`.trim() : (adminUser?.name || 'Admin');
    const adminId = adminUser?._id || adminUser?.id || null;

    // ── STAGE 1: CUSTOMER ORDER (EPC OR FPO) ──────────────────────────────────
    if (stage === 'orders') {
      let epc = await EpcOrder.findById(id);
      if (epc) {
        if (decision === 'approve') {
          epc.order_status = 'confirmed';
          if (epc.payment_status === 'pending_verification' || epc.payment_status === 'pending') {
            epc.payment_status = 'captured';
          }
          epc.commission_notes = remarks || 'Order Approved by Central Admin.';
        } else if (decision === 'reject') {
          epc.order_status = 'cancelled';
          epc.payment_status = 'rejected';
          epc.commission_notes = `Rejected by Admin: ${remarks}`;
        } else if (decision === 'return') {
          epc.order_status = 'pending';
          epc.commission_notes = `Returned by Admin for correction: ${remarks}`;
        }
        await epc.save();
        return res.status(200).json({
          status: 'success',
          message: `Store Order ${epc.order_number} ${decision}d successfully.`,
          data: epc,
        });
      }

      let fpo = await FpoOrder.findById(id);
      if (fpo) {
        let newStatus = 'APPROVED';
        if (decision === 'reject') newStatus = 'REJECTED';
        else if (decision === 'return') newStatus = 'CHANGES_REQUESTED';

        fpo.status = newStatus;
        fpo.status_history.push({
          status: newStatus,
          changed_by: adminId,
          actor_type: 'admin',
          note: remarks || `FPO order ${decision}d by Admin`,
          timestamp: new Date(),
        });
        await fpo.save();
        return res.status(200).json({
          status: 'success',
          message: `Franchisee PO Order ${fpo.po_number} ${decision}d successfully.`,
          data: fpo,
        });
      }

      return res.status(404).json({ status: 'error', message: 'Order record not found.' });
    }

    // ── STAGE 2: PURCHASE ORDER (PO) ───────────────────────────────────────────
    if (stage === 'pos') {
      req.body.indent_id = id;
      req.body.stage = 'po';
      req.body.action = decision;
      req.body.remarks = remarks;
      return procurementHandler.admin_approve_supplier_payment(req, res);
    }

    // ── STAGE 3: SUPPLIER FIRST PAYMENT (ADVANCE) ──────────────────────────────
    if (stage === 'first_payment') {
      req.body.indent_id = id;
      req.body.stage = 'first_payment';
      req.body.action = decision;
      req.body.remarks = remarks;
      return procurementHandler.admin_approve_supplier_payment(req, res);
    }

    // ── STAGE 4: SUPPLIER SECOND PAYMENT (BALANCE) ─────────────────────────────
    if (stage === 'second_payment') {
      req.body.indent_id = id;
      req.body.stage = 'second_payment';
      req.body.action = decision;
      req.body.remarks = remarks;
      return procurementHandler.admin_approve_supplier_payment(req, res);
    }

    // ── STAGE 5: DELIVERY CHARGE VARIANCE ──────────────────────────────────────
    if (stage === 'delivery') {
      const updated = await deliveryService.adminApproveDeliveryCost(id, {
        decision,
        remarks,
        adminUser,
      });
      return res.status(200).json({
        status: 'success',
        message: `Delivery charge ${decision}d successfully.`,
        data: updated,
      });
    }

    return res.status(400).json({ status: 'error', message: `Unknown approval stage: ${stage}` });
  } catch (err) {
    console.error('Error in order.approval.controller.submit_action:', err);
    return res.status(500).json({ status: 'error', message: err.message });
  }
};

/**
 * 4. GET & UPDATE WORKFLOW CONFIG
 */
exports.get_config = async (req, res) => {
  try {
    const config = await getWorkflowConfig();
    return res.status(200).json({ status: 'success', data: config });
  } catch (err) {
    console.error('Error in order.approval.controller.get_config:', err);
    return res.status(500).json({ status: 'error', message: err.message });
  }
};

exports.update_config = async (req, res) => {
  try {
    let settings = await SolarShopSettings.findOne();
    if (!settings) {
      settings = new SolarShopSettings();
    }

    settings.approval_workflow_config = {
      ...(settings.approval_workflow_config || {}),
      ...req.body,
      stage_tat_hours: {
        ...(settings.approval_workflow_config?.stage_tat_hours || {}),
        ...(req.body.stage_tat_hours || {}),
      },
    };

    await settings.save();
    return res.status(200).json({
      status: 'success',
      data: settings.approval_workflow_config,
      message: 'Approval workflow configuration updated successfully.',
    });
  } catch (err) {
    console.error('Error in order.approval.controller.update_config:', err);
    return res.status(500).json({ status: 'error', message: err.message });
  }
};
