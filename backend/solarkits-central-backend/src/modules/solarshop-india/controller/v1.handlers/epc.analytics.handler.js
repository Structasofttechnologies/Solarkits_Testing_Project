/**
 * epc.analytics.handler.js
 *
 * EPC Buying Behavior & Order Analytics Dashboard Handler.
 * Integrates all 8 analytics features for Solar Store EPC Profile.
 * Calculates metrics strictly using verified database records.
 */

const mongoose = require('mongoose');
const {
  EpcAccount,
  EpcType,
  EpcOrder,
  FpoOrder,
  EpcQuote,
  EpcCartActivityLog,
  WarehouseComboKit,
} = require('../../../admin-panel/models/india_solarshop_db');

/**
 * Standardize capacity string to clean "X kW" display format
 */
function normalizeCapacityLabel(rawCap) {
  if (!rawCap) return 'Standard Kit';
  const str = String(rawCap).trim();
  // If it's already like "3 kW" or "3kW"
  const match = str.match(/^(\d+(?:\.\d+)?)\s*(?:kw|k\.w\.?)?$/i);
  if (match) {
    const num = parseFloat(match[1]);
    return `${num} kW`;
  }
  return str;
}

/**
 * Extract numeric kW from capacity label or kit data
 */
function extractKwValue(rawCap) {
  if (!rawCap) return 0;
  const match = String(rawCap).match(/(\d+(?:\.\d+)?)/);
  return match ? parseFloat(match[1]) : 0;
}

/**
 * Determine date window filter based on query range
 */
function getStartDateForRange(range) {
  const now = new Date();
  if (range === '30d') {
    return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  } else if (range === '90d') {
    return new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
  } else if (range === '12m') {
    return new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
  }
  return null; // 'all'
}

/**
 * GET /api/india/v1/shop/epc/analytics
 * Unified analytics endpoint for the authenticated EPC Buyer
 */
const get_epc_analytics = async (req, res) => {
  try {
    const account_id = req.params?.id || req.query?.epc_id || req.user?.account_id || req.user?.id || req.user?._id;
    if (!account_id) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }

    const { range = 'all', order_type = 'all' } = req.query;
    const startDate = getStartDateForRange(range);

    // ── 1. Safely Resolve EPC Account without throwing ObjectId CastErrors ─
    let account = null;
    if (mongoose.Types.ObjectId.isValid(account_id)) {
      account = await EpcAccount.findOne({
        _id: new mongoose.Types.ObjectId(account_id),
        deleted_at: null,
      }).lean();
    }

    if (!account) {
      const cleanId = String(account_id).trim();
      account = await EpcAccount.findOne({
        $or: [
          { epc_code: cleanId },
          { epc_code: new RegExp(`^${cleanId}$`, 'i') },
          { company_name: new RegExp(`^${cleanId}$`, 'i') },
          { name: new RegExp(`^${cleanId}$`, 'i') },
        ],
        deleted_at: null,
      }).lean();

      // If not found yet, check active accounts in memory for suffix (e.g. from display code EPC-09c2)
      if (!account) {
        const hexMatch = cleanId.match(/([0-9a-fA-F]{4,24})$/);
        const allAccounts = await EpcAccount.find({ deleted_at: null }).lean();
        account = allAccounts.find((a) => {
          const aId = a._id ? a._id.toString() : '';
          if (hexMatch && aId.toLowerCase().endsWith(hexMatch[1].toLowerCase())) return true;
          if (a.epc_code && a.epc_code.toLowerCase() === cleanId.toLowerCase()) return true;
          if (a.company_name && a.company_name.toLowerCase() === cleanId.toLowerCase()) return true;
          if (a.name && a.name.toLowerCase() === cleanId.toLowerCase()) return true;
          return false;
        });
      }
    }

    if (!account) {
      return res.status(404).json({ success: false, message: 'EPC Account not found' });
    }

    const resolvedAccountId = account._id;
    const accountObjId = mongoose.Types.ObjectId.isValid(resolvedAccountId)
      ? new mongoose.Types.ObjectId(resolvedAccountId)
      : null;
    const epcMatches = accountObjId ? [resolvedAccountId, accountObjId, resolvedAccountId.toString()] : [resolvedAccountId];

    let epcTypeDoc = null;
    if (account.epc_type_id) {
      epcTypeDoc = await EpcType.findById(account.epc_type_id).lean();
    } else if (account.epc_type) {
      epcTypeDoc = await EpcType.findOne({
        $or: [
          { name: new RegExp(`^${account.epc_type.trim()}$`, 'i') },
          { code: account.epc_type.trim().toLowerCase() }
        ],
        deleted_at: null
      }).lean();
    }

    const epcTypeData = {
      id: epcTypeDoc?._id || account.epc_type_id || null,
      name: account.epc_type || epcTypeDoc?.name || 'Solar EPC Contractor',
      code: epcTypeDoc?.code || 'epc_contractor',
      badge_color: epcTypeDoc?.badge_color || 'emerald',
      description: epcTypeDoc?.description || 'Registered solar EPC partner executing rooftop and ground installations.',
      assigned_by_admin: Boolean(account.epc_type_id || account.epc_type),
    };

    // ── 2. Fetch All Eligible Orders for this EPC ───────────────────────────
    const epcOrderFilter = {
      epc_id: { $in: epcMatches },
    };
    if (startDate) {
      epcOrderFilter.created_at = { $gte: startDate };
    }

    const allEpcOrders = await EpcOrder.find(epcOrderFilter)
      .sort({ created_at: -1 })
      .lean();

    // Also fetch FPO orders where this account is buyer / allocated
    const fpoOrderFilter = {
      $or: [
        { epc_id: { $in: epcMatches } },
        { 'items.epc_allocations.epc_buyer_id': { $in: epcMatches } },
      ],
      deleted_at: null,
    };
    if (startDate) {
      fpoOrderFilter.created_at = { $gte: startDate };
    }

    const allFpoOrders = await FpoOrder.find(fpoOrderFilter)
      .sort({ created_at: -1 })
      .lean();

    // ── 3. Categorize & Classify Orders (Features 7 & 8) ────────────────────
    // Exclude cancelled / rejected / failed orders for eligible purchase metrics
    const CANCELLED_STATUSES = ['cancelled', 'rejected', 'failed', 'refunded'];
    const COMPLETED_STATUSES = ['delivered', 'completed'];

    let looseOrdersCount = 0;
    let poOrdersCount = 0;
    let trialOrdersCount = 0;

    let ongoingOrdersCount = 0;
    let completedOrdersCount = 0;
    let cancelledOrdersCount = 0;

    let totalEligibleSpendPaise = 0;
    let totalEligibleKits = 0;
    let totalEligibleKw = 0;

    const eligibleOrdersList = [];

    allEpcOrders.forEach((o) => {
      const isCancelled = CANCELLED_STATUSES.includes((o.order_status || '').toLowerCase()) ||
        CANCELLED_STATUSES.includes((o.payment_status || '').toLowerCase());
      const isCompleted = COMPLETED_STATUSES.includes((o.order_status || '').toLowerCase());

      // Mutual exclusivity for order types:
      // 1. Trial order if is_trial_order or order_type === 'trial_order'
      // 2. PO order if order_type === 'po_order'
      // 3. Else Loose order
      let resolvedType = 'loose_order';
      if (o.is_trial_order || o.order_type === 'trial_order' || (o.items || []).some(it => it.is_trial_kit)) {
        resolvedType = 'trial_order';
        trialOrdersCount++;
      } else if (o.order_type === 'po_order') {
        resolvedType = 'po_order';
        poOrdersCount++;
      } else {
        looseOrdersCount++;
      }

      if (isCancelled) {
        cancelledOrdersCount++;
      } else if (isCompleted) {
        completedOrdersCount++;
      } else {
        ongoingOrdersCount++;
      }

      if (!isCancelled) {
        eligibleOrdersList.push({
          ...o,
          _resolvedType: resolvedType,
          _source: 'epc_order',
        });

        totalEligibleSpendPaise += (o.grand_total_paise || 0);

        // Kit count & capacity
        let orderKits = 0;
        let orderKw = 0;
        (o.items || []).forEach((it) => {
          const qty = it.quantity || 1;
          orderKits += qty;
          const kwPerUnit = extractKwValue(it.capacity);
          orderKw += qty * kwPerUnit;
        });

        // Fallback to order_load_metrics if available
        if (orderKw === 0 && o.order_load_metrics?.total_kw) {
          orderKw = o.order_load_metrics.total_kw;
        }
        if (orderKits === 0 && o.order_load_metrics?.total_kits) {
          orderKits = o.order_load_metrics.total_kits;
        }

        totalEligibleKits += orderKits;
        totalEligibleKw += orderKw;
      }
    });

    // ── PO Specific Metrics (Feature 7) ────────────────────────────────────
    // Track FpoOrders without double-counting drawdowns (parent_po_id != null)
    let fpoParentCount = 0;
    let fpoOngoingCount = 0;
    let fpoCompletedCount = 0;
    let fpoCancelledCount = 0;
    let fpoTotalValuePaise = 0;
    let fpoTotalKits = 0;
    let fpoTotalKw = 0;

    const poCapacitiesMap = new Map();

    allFpoOrders.forEach((fpo) => {
      // If it's a child drawdown order, skip adding to total PO contracts to prevent double counting
      const isChild = Boolean(fpo.parent_po_id);
      const isCancelled = ['CANCELLED', 'REJECTED', 'EXPIRED'].includes(fpo.status);
      const isCompleted = ['COMPLETED', 'DELIVERED'].includes(fpo.status);

      if (!isChild) {
        fpoParentCount++;
        if (isCancelled) {
          fpoCancelledCount++;
        } else if (isCompleted) {
          fpoCompletedCount++;
        } else {
          fpoOngoingCount++;
        }

        if (!isCancelled) {
          fpoTotalValuePaise += (fpo.grand_total_paise || fpo.net_payable_paise || 0);
          (fpo.items || []).forEach((it) => {
            const qty = it.quantity || 0;
            fpoTotalKits += qty;
            const kw = extractKwValue(it.item_name || it.item_code || '');
            fpoTotalKw += qty * kw;
          });
        }
      }
    });

    // Aggregate PO metrics from both EpcOrder (po_order) and FpoOrder
    const epcPoOrders = eligibleOrdersList.filter(o => o._resolvedType === 'po_order');
    const totalPoOrdersCombined = fpoParentCount + epcPoOrders.length;
    const completedPoCombined = fpoCompletedCount + epcPoOrders.filter(o => COMPLETED_STATUSES.includes((o.order_status || '').toLowerCase())).length;
    const ongoingPoCombined = fpoOngoingCount + epcPoOrders.filter(o => !COMPLETED_STATUSES.includes((o.order_status || '').toLowerCase())).length;
    const cancelledPoCombined = fpoCancelledCount;

    const epcPoValuePaise = epcPoOrders.reduce((sum, o) => sum + (o.grand_total_paise || 0), 0);
    const totalPoValueRupees = Math.round((fpoTotalValuePaise + epcPoValuePaise) / 100);

    // ── 4. Most Frequently Purchased Kit Capacity (Feature 1) ──────────────
    // Filter eligible orders by the requested order_type filter if specified
    let targetOrdersForCapacity = eligibleOrdersList;
    if (order_type === 'loose_order') {
      targetOrdersForCapacity = eligibleOrdersList.filter(o => o._resolvedType === 'loose_order');
    } else if (order_type === 'po_order') {
      targetOrdersForCapacity = eligibleOrdersList.filter(o => o._resolvedType === 'po_order');
    } else if (order_type === 'trial_order') {
      targetOrdersForCapacity = eligibleOrdersList.filter(o => o._resolvedType === 'trial_order');
    }

    const capacityStats = new Map(); // key: normalizedCapacity -> { orderIds: Set, totalQty, totalKw, lastDate, rawKw }

    targetOrdersForCapacity.forEach((order) => {
      const orderDate = new Date(order.created_at || order.delivered_at || Date.now());
      (order.items || []).forEach((it) => {
        let rawCap = it.capacity;
        if (!rawCap || rawCap === 'null') {
          // Attempt extraction from item_name
          const match = (it.item_name || '').match(/(\d+(?:\.\d+)?)\s*(?:kw|k\.w\.?)?/i);
          if (match) rawCap = `${match[1]} kW`;
        }

        const normCap = normalizeCapacityLabel(rawCap);
        const kwValue = extractKwValue(normCap);
        const qty = it.quantity || 1;

        if (!capacityStats.has(normCap)) {
          capacityStats.set(normCap, {
            capacity: normCap,
            kw_per_unit: kwValue,
            order_ids: new Set(),
            total_quantity: 0,
            total_kw: 0,
            last_purchased_date: orderDate,
          });
        }

        const entry = capacityStats.get(normCap);
        entry.order_ids.add(order._id.toString());
        entry.total_quantity += qty;
        entry.total_kw += qty * kwValue;
        if (orderDate > entry.last_purchased_date) {
          entry.last_purchased_date = orderDate;
        }
      });
    });

    const capacityBreakdown = Array.from(capacityStats.values()).map((entry) => ({
      capacity: entry.capacity,
      order_frequency: entry.order_ids.size,
      total_quantity: entry.total_quantity,
      total_kw: Math.round(entry.total_kw * 100) / 100,
      last_purchased: entry.last_purchased_date.toISOString(),
      formatted_last_purchased: entry.last_purchased_date.toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      }),
    }));

    // Sort by order_frequency desc, then total_quantity desc
    capacityBreakdown.sort((a, b) => {
      if (b.order_frequency !== a.order_frequency) {
        return b.order_frequency - a.order_frequency;
      }
      return b.total_quantity - a.total_quantity;
    });

    const mostPurchasedKit = capacityBreakdown.length > 0 ? capacityBreakdown[0] : null;
    const topThreeCapacities = capacityBreakdown.slice(0, 3).map(c => c.capacity);

    // ── 5. Last Purchase Date & Days Ago (Feature 3) ────────────────────────
    let lastPurchaseData = {
      has_purchased: false,
      date: null,
      formatted_date: 'No purchases yet',
      days_ago: null,
      order_number: null,
      capacity: null,
    };

    if (eligibleOrdersList.length > 0) {
      // Sorted by created_at desc
      const latestOrder = eligibleOrdersList[0];
      const latestDate = new Date(latestOrder.created_at || Date.now());
      const now = new Date();
      const diffMs = Math.max(0, now.getTime() - latestDate.getTime());
      const daysAgo = Math.floor(diffMs / (1000 * 60 * 60 * 24));

      let primaryCap = null;
      if (latestOrder.items && latestOrder.items.length > 0) {
        primaryCap = normalizeCapacityLabel(latestOrder.items[0].capacity || latestOrder.items[0].item_name);
      }

      lastPurchaseData = {
        has_purchased: true,
        date: latestDate.toISOString(),
        formatted_date: latestDate.toLocaleDateString('en-IN', {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
        }),
        days_ago: daysAgo,
        order_number: latestOrder.order_number,
        capacity: primaryCap,
      };
    }

    // ── 6. EPC Buying Frequency & Interval Analytics (Feature 4) ───────────
    const nowMs = Date.now();
    const thirtyDaysAgo = nowMs - 30 * 24 * 60 * 60 * 1000;
    const ninetyDaysAgo = nowMs - 90 * 24 * 60 * 60 * 1000;
    const oneYearAgo = nowMs - 365 * 24 * 60 * 60 * 1000;

    let purchasesLast30d = 0;
    let purchasesLast90d = 0;
    let purchasesLast12m = 0;

    // Monthly bucket aggregation (Trailing 12 months)
    const monthlyMap = new Map();
    // Pre-populate trailing 12 calendar months with 0
    for (let i = 11; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      monthlyMap.set(key, { month: key, orders: 0, kits: 0, kw: 0, spend_rupees: 0 });
    }

    // Chronological order timestamps for interval calculation
    const chronologicalDates = [];

    eligibleOrdersList.forEach((o) => {
      const oDate = new Date(o.created_at || Date.now());
      const t = oDate.getTime();
      chronologicalDates.push(t);

      if (t >= thirtyDaysAgo) purchasesLast30d++;
      if (t >= ninetyDaysAgo) purchasesLast90d++;
      if (t >= oneYearAgo) purchasesLast12m++;

      const monthKey = `${oDate.getFullYear()}-${String(oDate.getMonth() + 1).padStart(2, '0')}`;
      if (monthlyMap.has(monthKey)) {
        const mObj = monthlyMap.get(monthKey);
        mObj.orders += 1;
        mObj.spend_rupees += Math.round((o.grand_total_paise || 0) / 100);

        let kitsInOrder = 0;
        let kwInOrder = 0;
        (o.items || []).forEach(it => {
          const q = it.quantity || 1;
          kitsInOrder += q;
          kwInOrder += q * extractKwValue(it.capacity);
        });
        mObj.kits += kitsInOrder;
        mObj.kw += Math.round(kwInOrder * 10) / 10;
      }
    });

    chronologicalDates.sort((a, b) => a - b);

    let avgIntervalDays = null;
    let frequencyClassification = 'New EPC';

    if (chronologicalDates.length >= 2) {
      const spanMs = chronologicalDates[chronologicalDates.length - 1] - chronologicalDates[0];
      const totalIntervals = chronologicalDates.length - 1;
      avgIntervalDays = Math.round((spanMs / (totalIntervals * 86400000)) * 10) / 10;

      if (avgIntervalDays <= 7) {
        frequencyClassification = 'Very Frequent';
      } else if (avgIntervalDays <= 15) {
        frequencyClassification = 'Frequent';
      } else if (avgIntervalDays <= 30) {
        frequencyClassification = 'Regular';
      } else {
        frequencyClassification = 'Occasional';
      }
    } else if (chronologicalDates.length === 1) {
      frequencyClassification = 'New EPC';
    }

    const monthlyTrends = Array.from(monthlyMap.values());
    let mostActiveMonth = 'N/A';
    let maxMonthOrders = 0;
    monthlyTrends.forEach(m => {
      if (m.orders > maxMonthOrders) {
        maxMonthOrders = m.orders;
        mostActiveMonth = m.month;
      }
    });

    // ── 7. Quotation Count & Conversion Ratio (Feature 5) ──────────────────
    const quoteFilter = {
      epc_id: { $in: epcMatches },
      deleted_at: null,
    };
    if (startDate) {
      quoteFilter.created_at = { $gte: startDate };
    }

    const allQuotes = await EpcQuote.find(quoteFilter).lean();

    // Group by root quote ID to avoid double-counting revised versions
    const quoteThreadMap = new Map();
    allQuotes.forEach((q) => {
      const rootId = (q.original_quote_id || q._id).toString();
      if (!quoteThreadMap.has(rootId)) {
        quoteThreadMap.set(rootId, []);
      }
      quoteThreadMap.get(rootId).push(q);
    });

    let totalEligibleQuotes = 0;
    let totalConvertedQuotes = 0;
    let pendingQuotes = 0;
    let expiredQuotes = 0;
    let lostQuotes = 0;
    const nowTime = new Date();

    quoteThreadMap.forEach((versions) => {
      // Determine effective status of the thread from latest version
      versions.sort((a, b) => (b.revision_number || 0) - (a.revision_number || 0));
      const latestVer = versions[0];

      // Exclude unfinalized drafts from denominator
      if (latestVer.status === 'draft') return;

      totalEligibleQuotes++;

      const isConverted = latestVer.status === 'converted' || Boolean(latestVer.converted_order_id);
      if (isConverted) {
        totalConvertedQuotes++;
      } else if (latestVer.status === 'expired' || (latestVer.valid_until && new Date(latestVer.valid_until) < nowTime)) {
        expiredQuotes++;
      } else if (['lost', 'rejected'].includes(latestVer.status)) {
        lostQuotes++;
      } else {
        pendingQuotes++;
      }
    });

    const quotationConversionPct = totalEligibleQuotes > 0
      ? Math.round((totalConvertedQuotes / totalEligibleQuotes) * 1000) / 10
      : 0;

    // ── 8. Add to Cart Attempts & Engagement (Feature 6) ───────────────────
    const cartActivityFilter = {
      account_id: { $in: epcMatches },
    };
    if (startDate) {
      cartActivityFilter.created_at = { $gte: startDate };
    }

    const cartLogs = await EpcCartActivityLog.find(cartActivityFilter).sort({ created_at: -1 }).lean();

    let totalCartAttempts = cartLogs.length;
    let successfulCartAttempts = 0;
    let failedCartAttempts = 0;
    const uniqueProductsSet = new Set();
    const cartCapacityCountMap = new Map();

    cartLogs.forEach((log) => {
      if (log.is_success !== false && log.action_type !== 'failure') {
        successfulCartAttempts++;
      } else {
        failedCartAttempts++;
      }

      const prodKey = log.kit_id || log.product_id || log.item_name;
      if (prodKey) uniqueProductsSet.add(prodKey.toString());

      if (log.capacity) {
        const normCap = normalizeCapacityLabel(log.capacity);
        cartCapacityCountMap.set(normCap, (cartCapacityCountMap.get(normCap) || 0) + 1);
      }
    });

    let mostAddedCapacity = 'N/A';
    let maxAddCount = 0;
    cartCapacityCountMap.forEach((count, cap) => {
      if (count > maxAddCount) {
        maxAddCount = count;
        mostAddedCapacity = cap;
      }
    });

    // ── Assemble Final Complete Payload ────────────────────────────────────
    return res.status(200).json({
      success: true,
      data: {
        account_details: {
          id: account._id,
          name: account.company_name || account.name || 'Solar EPC Contractor',
          contact: account.name || account.contact_person || 'N/A',
          mobile: account.whatsapp || account.mobile_number || account.mobile || 'N/A',
          email: account.email || account.contact_email || 'N/A',
          state: account.state_name || 'Regional',
          district: account.district_name || 'N/A',
          gstin: account.gstin || account.gst_number || 'N/A',
        },
        epc_type: epcTypeData,
        last_purchase: lastPurchaseData,
        capacity_analytics: {
          most_purchased: mostPurchasedKit,
          breakdown: capacityBreakdown,
          top_three: topThreeCapacities,
        },
        buying_frequency: {
          total_orders: eligibleOrdersList.length,
          purchases_last_30d: purchasesLast30d,
          purchases_last_90d: purchasesLast90d,
          purchases_last_12m: purchasesLast12m,
          avg_interval_days: avgIntervalDays,
          classification: frequencyClassification,
          most_active_month: mostActiveMonth,
        },
        quotations: {
          total_generated: totalEligibleQuotes,
          total_converted: totalConvertedQuotes,
          conversion_rate_pct: quotationConversionPct,
          pending: pendingQuotes,
          expired: expiredQuotes,
          lost: lostQuotes,
        },
        po_orders: {
          total_po: totalPoOrdersCombined,
          ongoing_po: ongoingPoCombined,
          completed_po: completedPoCombined,
          cancelled_po: cancelledPoCombined,
          total_value_rupees: totalPoValueRupees,
          total_quantity: fpoTotalKits + epcPoOrders.reduce((sum, o) => sum + (o.order_load_metrics?.total_kits || (o.items || []).reduce((s, i) => s + (i.quantity || 1), 0)), 0),
          total_capacity_kw: Math.round((fpoTotalKw + epcPoOrders.reduce((sum, o) => sum + (o.order_load_metrics?.total_kw || 0), 0)) * 10) / 10,
        },
        total_orders_summary: {
          total_orders: allEpcOrders.length,
          eligible_orders: eligibleOrdersList.length,
          loose_orders: looseOrdersCount,
          po_orders: poOrdersCount,
          trial_orders: trialOrdersCount,
          ongoing: ongoingOrdersCount,
          completed: completedOrdersCount,
          cancelled: cancelledOrdersCount,
          total_spend_rupees: Math.round(totalEligibleSpendPaise / 100),
          total_kits: totalEligibleKits,
          total_kw: Math.round(totalEligibleKw * 10) / 10,
        },
        cart_activity: {
          total_attempts: totalCartAttempts,
          successful_attempts: successfulCartAttempts,
          failed_attempts: failedCartAttempts,
          unique_products: uniqueProductsSet.size,
          most_added_capacity: mostAddedCapacity,
          tracking_started_at: '2026-11-06T00:00:00.000Z',
        },
        monthly_trends: monthlyTrends,
      },
    });
  } catch (error) {
    console.error('get_epc_analytics error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to calculate EPC buying analytics',
    });
  }
};

/**
 * POST /api/india/v1/shop/cart/track-activity
 * Records Add-to-Cart attempt events with idempotency deduplication
 */
const track_cart_activity = async (req, res) => {
  try {
    const account_id = req.user?.account_id || req.user?.id || req.user?._id;
    if (!account_id) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }

    const {
      product_id,
      kit_id,
      capacity,
      item_name,
      action_type = 'attempt',
      is_success = true,
      failure_reason = null,
      source_page = 'catalogue',
      idempotency_key = null,
    } = req.body;

    // Reject duplicate retries if idempotency_key is present
    if (idempotency_key) {
      const existing = await EpcCartActivityLog.findOne({ idempotency_key });
      if (existing) {
        return res.status(200).json({ success: true, message: 'Activity already recorded' });
      }
    }

    await EpcCartActivityLog.create({
      account_id,
      product_id: product_id && mongoose.Types.ObjectId.isValid(product_id) ? product_id : null,
      kit_id: kit_id && mongoose.Types.ObjectId.isValid(kit_id) ? kit_id : null,
      capacity: capacity ? normalizeCapacityLabel(capacity) : null,
      item_name: item_name ? String(item_name).trim() : null,
      action_type,
      is_success: Boolean(is_success),
      failure_reason: failure_reason ? String(failure_reason).trim() : null,
      source_page,
      idempotency_key,
      created_at: new Date(),
    });

    return res.status(201).json({ success: true, message: 'Cart activity logged successfully' });
  } catch (error) {
    console.error('track_cart_activity error:', error);
    return res.status(500).json({ success: false, message: error.message || 'Failed to log cart activity' });
  }
};

module.exports = {
  get_epc_analytics,
  track_cart_activity,
};

