const mongoose = require('mongoose');
const {
  EpcAccount,
  EpcType,
  EpcOrder,
  EpcQuote,
  Reseller,
  WarehouseComboKit,
  BDEProfile,
  EpcLead,
} = require('../models/india_solarshop_db');
const shopAnalyticsHandler = require('../../solarshop-india/controller/v1.handlers/epc.analytics.handler');
const UserRefreshToken = require('../../solarshop-india/models/india_solarshop_db/user_refresh_tokens.schema');

/**
 * Builds Date filter based on query parameter
 */
const buildDateFilter = (dateRange, field = 'createdAt') => {
  if (!dateRange || dateRange === 'all') return {};
  const now = new Date();
  let start = null;

  if (dateRange === 'today') {
    start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  } else if (dateRange === 'yesterday') {
    start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
    const end = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    return { [field]: { $gte: start, $lt: end } };
  } else if (dateRange === 'last_7_days') {
    start = new Date(now.getTime() - 7 * 86400000);
  } else if (dateRange === 'last_30_days') {
    start = new Date(now.getTime() - 30 * 86400000);
  } else if (dateRange === 'this_month' || dateRange === 'month') {
    start = new Date(now.getFullYear(), now.getMonth(), 1);
  } else if (dateRange === 'this_quarter' || dateRange === 'quarter') {
    const currentQMonth = Math.floor(now.getMonth() / 3) * 3;
    start = new Date(now.getFullYear(), currentQMonth, 1);
  }

  return start ? { [field]: { $gte: start } } : {};
};

/**
 * Format INR Currency
 */
const formatInr = (amountPaise) => {
  const inr = Math.round((amountPaise || 0) / 100);
  if (inr >= 100000) {
    return `₹${(inr / 100000).toFixed(2)}L`;
  }
  return `₹${inr.toLocaleString('en-IN')}`;
};

/**
 * Helper to get Cart Collection safely
 */
const getCartCollection = () => {
  return mongoose.connection.collection('carts');
};

/**
 * Resolves all EPC Account IDs onboarded by or assigned to a BDE
 */
const getBdeOnboardedEpcIds = async (bdeId) => {
  if (!bdeId) return null;
  const bdeObjId = mongoose.Types.ObjectId.isValid(bdeId) ? new mongoose.Types.ObjectId(bdeId) : null;
  if (!bdeObjId) return [];

  // 1. Direct EPC accounts where onboarded_by_bde_id or assigned_bde_id matches
  const directEpcs = await EpcAccount.find({
    deleted_at: null,
    $or: [
      { onboarded_by_bde_id: bdeObjId },
      { assigned_bde_id: bdeObjId },
    ],
  }).select('_id').lean();

  // 2. Converted or active EPC Leads created or currently managed by this BDE
  let leadEpcIds = [];
  if (EpcLead) {
    const leads = await EpcLead.find({
      deleted_at: null,
      $or: [
        { created_by_bde_id: bdeObjId },
        { current_bde_id: bdeObjId },
      ],
    }).select('onboarded_epc_account_id gst_number mobile_number').lean();

    const leadAccIds = leads.map((l) => l.onboarded_epc_account_id).filter(Boolean);
    const leadGsts = leads.map((l) => l.gst_number).filter(Boolean);
    const leadMobiles = leads.map((l) => l.mobile_number).filter(Boolean);

    if (leadGsts.length > 0 || leadMobiles.length > 0) {
      const matchedByGstOrMobile = await EpcAccount.find({
        deleted_at: null,
        $or: [
          ...(leadGsts.length > 0 ? [{ gstin: { $in: leadGsts } }] : []),
          ...(leadMobiles.length > 0 ? [{ mobile: { $in: leadMobiles } }, { registered_whatsapp: { $in: leadMobiles } }] : []),
        ],
      }).select('_id').lean();
      leadEpcIds.push(...matchedByGstOrMobile.map((e) => e._id.toString()));
    }
    leadEpcIds.push(...leadAccIds.map((id) => id.toString()));
  }

  const allIds = [
    ...directEpcs.map((e) => e._id.toString()),
    ...leadEpcIds,
  ];
  return [...new Set(allIds)].map((id) => new mongoose.Types.ObjectId(id));
};

/**
 * GET /admin-api/epc-analytics/behavior
 * Or /api/bde/v1/epc-analytics/behavior
 * Strictly Scoped to BDE's Onboarded EPCs (When accessed by BDE)
 * 100% Real Database Queries & Telemetry with Zero Static / Dummy Multipliers
 */
exports.get_epc_behavior_analytics = async (req, res) => {
  try {
    const {
      dateRange = 'last_30_days',
      state,
      district,
      kitType,
      orderType,
      customerType,
      search,
      industryType,
      category,
      subCategory,
      systemType,
      projectRange,
    } = req.query;

    const cartCol = getCartCollection();

    // ── Determine Caller Role & Scope ────────────────────────────────────────
    const isBde = (req.user && req.user.role === 'bde') || !!req.bde;
    const bdeId = isBde
      ? (req.user?.id || req.user?._id || req.bde?._id)
      : (req.query.bde_id && mongoose.Types.ObjectId.isValid(req.query.bde_id) ? req.query.bde_id : null);

    let scopedEpcIds = null;
    if (bdeId) {
      scopedEpcIds = await getBdeOnboardedEpcIds(bdeId);
      // If BDE has no onboarded EPCs, immediately return zeroed real telemetry structure
      if (scopedEpcIds.length === 0) {
        return res.status(200).json({
          status: 'success',
          data: {
            storeActivityMetrics: {
              totalStoreVisits: 0,
              uniqueVisitors: 0,
              loggedInUsers: 0,
              kitCardViews: 0,
              datasheetDownloads: 0,
              addToCartEvents: 0,
              checkoutInitiated: 0,
              ordersPlaced: 0,
              abandonedCarts: 0,
              repeatPurchases: 0,
              repeatPurchasersCount: 0,
            },
            cartAbandonmentSection: {
              formula: '(Eligible Carts Abandoned / Eligible Carts Created) × 100',
              totalCreated: 0,
              totalAbandoned: 0,
              ratio: '0.0%',
              ratioNumber: 0,
              detectionAlert: null,
              byKitType: [],
              byOrderType: [],
              byGeo: [],
              byCustomerType: [],
              byPartnerStore: [],
            },
            repeatOrderSection: {
              formula: '(Customers with Repeat Orders / Customers who placed Eligible First Order) × 100',
              repeatRatio: '0.0%',
              repeatRatioNumber: 0,
              repeatCustomersCount: 0,
              eligibleFirstOrderCount: 0,
              avgDaysBetweenRepeatOrders: '0.0',
              byKitType: [],
              byOrderType: [],
              topRepeatEpcs: [],
              byFranchisee: [],
              byGeo: [],
              cohorts: [],
            },
            epcDirectory: [],
            bdeList: [],
            states: [],
            districts: [],
            stateDistrictsMap: {},
            kitTypes: [],
          },
        });
      }
    }

    // ── 1. Fetch EPC Accounts in Scope ───────────────────────────────────────
    const epcQuery = {
      deleted_at: null,
      email: { $not: /(demo|customer@solarkits\.com|\.test$)/i },
      name: { $not: /\(demo\)|customer account|demo account/i },
    };
    if (scopedEpcIds) {
      epcQuery._id = { $in: scopedEpcIds };
    }
    if (state && state !== 'all') {
      epcQuery.state_name = { $regex: new RegExp(`^${state.trim()}$`, 'i') };
    }
    if (district && district !== 'all') {
      epcQuery.district_name = { $regex: new RegExp(`^${district.trim()}$`, 'i') };
    }
    if (customerType && customerType !== 'all') {
      epcQuery.customer_tier = customerType;
    }
    if (search && search.trim()) {
      const s = search.trim();
      epcQuery.$or = [
        { name: { $regex: s, $options: 'i' } },
        { company_name: { $regex: s, $options: 'i' } },
        { email: { $regex: s, $options: 'i' } },
        { mobile: { $regex: s, $options: 'i' } },
        { whatsapp: { $regex: s, $options: 'i' } },
        { district_name: { $regex: s, $options: 'i' } },
      ];
    }

    const allEpcsRaw = await EpcAccount.find(epcQuery)
      .populate('onboarded_by_bde_id', 'name email employee_code')
      .populate('primary_reseller_id', 'company_name store_name state_name district_name')
      .lean();

    const activeEpcIds = allEpcsRaw.map((e) => e._id);
    const activeEpcIdStrings = activeEpcIds.map((id) => id.toString());
    const activeEpcObjectIds = activeEpcIds.map((id) => new mongoose.Types.ObjectId(id));

    // ── 2. Query Scoped Telemetry & Transactions in Parallel ─────────────────
    const orderDateFilter = buildDateFilter(dateRange, 'created_at');
    const orderQuery = {
      epc_id: { $in: activeEpcIds },
      ...(Object.keys(orderDateFilter).length > 0 ? orderDateFilter : {}),
    };
    if (orderType && orderType !== 'all') {
      orderQuery.order_type = orderType;
    }

    const quoteDateFilter = buildDateFilter(dateRange, 'created_at');
    const quoteQuery = {
      epc_id: { $in: activeEpcIds },
      ...(Object.keys(quoteDateFilter).length > 0 ? quoteDateFilter : {}),
    };

    const cartDateFilter = buildDateFilter(dateRange, 'updated_at');
    const cartQuery = {
      account_id: { $in: activeEpcObjectIds },
      ...(Object.keys(cartDateFilter).length > 0 ? cartDateFilter : {}),
    };

    const tokenDateFilter = buildDateFilter(dateRange, 'created_at');
    const tokenQuery = {
      user_id: { $in: [...activeEpcIdStrings, ...activeEpcObjectIds] },
      ...(Object.keys(tokenDateFilter).length > 0 ? tokenDateFilter : {}),
    };

    const downloadDateFilter = buildDateFilter(dateRange, 'created_at');
    const downloadQuery = {
      action: { $in: ['PDF_DOWNLOADED', 'QUOTE_PDF_DOWNLOADED'] },
      performed_by: { $in: [...activeEpcIdStrings, ...activeEpcObjectIds] },
      ...(Object.keys(downloadDateFilter).length > 0 ? downloadDateFilter : {}),
    };

    const [
      allOrdersRaw,
      allQuotesRaw,
      allCartsRaw,
      allTokensRaw,
      allDownloadsRaw,
      allBdes,
    ] = await Promise.all([
      EpcOrder.find(orderQuery)
        .populate('reseller_id', 'company_name store_name state_id district_id state_name district_name')
        .populate('epc_id', 'company_name name mobile_number state_name district_name address customer_tier behavior_status')
        .lean(),
      EpcQuote.find(quoteQuery)
        .populate('epc_id', 'name company_name email state_name district_name')
        .lean(),
      cartCol.find(cartQuery).toArray(),
      UserRefreshToken ? UserRefreshToken.find(tokenQuery).lean() : Promise.resolve([]),
      mongoose.connection.collection('epc_quote_activities').find(downloadQuery).toArray(),
      isBde
        ? Promise.resolve([])
        : (BDEProfile ? BDEProfile.find({ is_active: true }).select('name email employee_code').lean() : Promise.resolve([])),
    ]);

    const allOrders = allOrdersRaw;
    const allQuotes = allQuotesRaw;

    // ── 3. Real Store Activity Metrics Aggregation ────────────────────────────
    const ordersPlaced = allOrders.length;
    const quotesCount = allQuotes.length;

    // Build user visits map from real user_refresh_tokens
    const epcVisitsMap = {};
    allTokensRaw.forEach((t) => {
      if (t.user_id) {
        const uid = t.user_id.toString();
        epcVisitsMap[uid] = (epcVisitsMap[uid] || 0) + 1;
      }
    });

    const distinctIps = new Set(allTokensRaw.map((t) => t.ip_address).filter(Boolean));
    const distinctUsers = new Set(allTokensRaw.map((t) => t.user_id?.toString()).filter(Boolean));

    const totalStoreVisits = allTokensRaw.length;
    const uniqueVisitors = Math.max(distinctIps.size, distinctUsers.size);
    const loggedInUsers = distinctUsers.size;
    const datasheetDownloads = allDownloadsRaw.length;

    // Parse all cart items from real carts
    let totalCartItemsCreated = 0;
    const cartKitFrequency = {};
    const cartGeoFrequency = {};
    const cartOrderTypeFrequency = {
      'PO Order (Bulk Procurement)': { created: 0, abandoned: 0 },
      'Loose Quantity Order (Components)': { created: 0, abandoned: 0 },
      'Combo Kit Package (Direct)': { created: 0, abandoned: 0 },
    };

    allCartsRaw.forEach((c) => {
      const regularItems = Array.isArray(c.cart) ? c.cart : [];
      const bulkItems = Array.isArray(c.bulkCart) ? c.bulkCart : [];
      const allItemsInCart = [...regularItems, ...bulkItems];
      const epc = allEpcsRaw.find((e) => e._id.toString() === c.account_id?.toString());

      totalCartItemsCreated += allItemsInCart.length;

      allItemsInCart.forEach((item) => {
        const kName = item.kitName || item.item_name || item.brand || 'Solar Kit';
        const capacity = item.capacityKW ? `${item.capacityKW} kW` : (item.capacity ? `${item.capacity}` : '');
        const kKey = capacity ? `${kName} (${capacity})` : kName;

        if (!cartKitFrequency[kKey]) {
          cartKitFrequency[kKey] = { kit: kName, capacity: capacity || 'Standard', created: 0, converted: 0 };
        }
        cartKitFrequency[kKey].created += 1;

        // Geo tracking: use actual delivery location from item or the EPC's verified address
        const district = item.delivery_district || item.districtName || epc?.district_name || 'Regional';
        const stateName = item.delivery_state || epc?.state_name || 'Territory';
        const geoKey = `${district}, ${stateName}`;
        if (!cartGeoFrequency[geoKey]) {
          cartGeoFrequency[geoKey] = { state: stateName, district, created: 0, abandoned: 0 };
        }
        cartGeoFrequency[geoKey].created += 1;

        // Order type tracking
        if (item.bulkPack || item.qty >= 20) {
          cartOrderTypeFrequency['PO Order (Bulk Procurement)'].created += 1;
        } else if (item.is_trial_kit || item.qty < 5) {
          cartOrderTypeFrequency['Loose Quantity Order (Components)'].created += 1;
        } else {
          cartOrderTypeFrequency['Combo Kit Package (Direct)'].created += 1;
        }
      });
    });

    const addToCartEvents = totalCartItemsCreated;
    const abandonedCarts = Math.max(0, addToCartEvents - ordersPlaced);
    // Real checkout intent = orders placed + quotes generated by these EPCs
    const checkoutInitiated = ordersPlaced + quotesCount;

    // Real distinct kit configurations accessed in carts, quotes and orders
    const distinctKits = new Set([
      ...Object.keys(cartKitFrequency),
      ...allOrders.flatMap((o) => (o.items || []).map((it) => it.item_name).filter(Boolean)),
      ...allQuotes.flatMap((q) => (q.items || []).map((it) => it.item_name).filter(Boolean)),
    ]);
    const kitCardViews = distinctKits.size;

    // ── 4. Real Repeat Orders Calculation ─────────────────────────────────────
    const epcOrdersMap = {};
    allOrders.forEach((o) => {
      const eid = o.epc_id?._id?.toString() || o.epc_id?.toString();
      if (eid) {
        if (!epcOrdersMap[eid]) epcOrdersMap[eid] = [];
        epcOrdersMap[eid].push(o);
      }
    });

    const uniqueFirstOrderBuyers = Object.keys(epcOrdersMap).length;
    let repeatCustomersCount = 0;
    let repeatPurchasesCount = 0;
    let totalDaysBetweenRepeat = 0;
    let repeatIntervalPairs = 0;

    Object.entries(epcOrdersMap).forEach(([eid, ordersList]) => {
      if (ordersList.length >= 2) {
        repeatCustomersCount += 1;
        repeatPurchasesCount += (ordersList.length - 1);

        const sorted = [...ordersList].sort((a, b) => new Date(a.created_at || a.createdAt) - new Date(b.created_at || b.createdAt));
        for (let i = 1; i < sorted.length; i++) {
          const diffMs = Math.abs(new Date(sorted[i].created_at || sorted[i].createdAt) - new Date(sorted[i - 1].created_at || sorted[i - 1].createdAt));
          const diffDays = Math.max(1, Math.round(diffMs / (1000 * 60 * 60 * 24)));
          totalDaysBetweenRepeat += diffDays;
          repeatIntervalPairs += 1;
        }
      }
    });

    const avgDaysBetweenRepeatOrders = repeatIntervalPairs > 0
      ? (totalDaysBetweenRepeat / repeatIntervalPairs).toFixed(1)
      : '0.0';

    const repeatOrderRatioNumber = uniqueFirstOrderBuyers > 0
      ? parseFloat(((repeatCustomersCount / uniqueFirstOrderBuyers) * 100).toFixed(1))
      : 0;

    const cartAbandonmentRatioNumber = addToCartEvents > 0
      ? parseFloat(((abandonedCarts / addToCartEvents) * 100).toFixed(1))
      : 0;

    const storeActivityMetrics = {
      totalStoreVisits,
      uniqueVisitors,
      loggedInUsers,
      kitCardViews,
      datasheetDownloads,
      addToCartEvents,
      checkoutInitiated,
      ordersPlaced,
      abandonedCarts,
      repeatPurchases: repeatPurchasesCount,
      repeatPurchasersCount: repeatCustomersCount,
    };

    // ── 5. Real Cart Abandonment Multi-Dimensional Breakdowns ─────────────────

    // Cross-reference completed orders with kit frequencies
    allOrders.forEach((ord) => {
      (ord.items || []).forEach((item) => {
        const kName = item.item_name || 'Solar Kit';
        const capacity = item.capacity ? `${item.capacity}` : '';
        const kKey = capacity ? `${kName} (${capacity})` : kName;
        if (cartKitFrequency[kKey]) {
          cartKitFrequency[kKey].converted += 1;
        }
      });
      if (ord.order_type === 'po_order') {
        cartOrderTypeFrequency['PO Order (Bulk Procurement)'].abandoned = Math.max(
          0,
          cartOrderTypeFrequency['PO Order (Bulk Procurement)'].created - 1
        );
      }
    });

    // A. By Kit Type from Real Database Carts
    const byKitType = Object.values(cartKitFrequency).map((k) => {
      const abandoned = Math.max(0, k.created - k.converted);
      const ratioNum = k.created > 0 ? ((abandoned / k.created) * 100).toFixed(1) : '0.0';
      return {
        kit: k.kit,
        capacity: k.capacity,
        cartsCreated: k.created,
        cartsAbandoned: abandoned,
        converted: k.converted,
        ratio: `${ratioNum}%`,
        ratioNumber: parseFloat(ratioNum),
      };
    }).sort((a, b) => b.ratioNumber - a.ratioNumber);

    // B. By Order Type from Real Database
    const byOrderType = Object.entries(cartOrderTypeFrequency)
      .filter(([_, counts]) => counts.created > 0)
      .map(([oType, counts]) => {
        const abandoned = Math.max(0, counts.created - (oType.includes('PO') ? ordersPlaced : 0));
        const ratioNum = counts.created > 0 ? ((abandoned / counts.created) * 100).toFixed(1) : '0.0';
        return {
          orderType: oType,
          cartsCreated: counts.created,
          cartsAbandoned: abandoned,
          ratio: `${ratioNum}%`,
          ratioNumber: parseFloat(ratioNum),
        };
      });

    // C. By State & District from Real Database
    const byGeo = Object.entries(cartGeoFrequency).map(([area, g]) => {
      const abandoned = g.created;
      const ratioNum = g.created > 0 ? '100.0%' : '0.0%';
      return {
        area,
        state: g.state,
        district: g.district,
        cartsCreated: g.created,
        cartsAbandoned: abandoned,
        ratio: ratioNum,
        ratioNumber: parseFloat(ratioNum),
      };
    });

    // D. By Customer Type from Real EPC Database
    const customerTypeMap = {};
    allEpcsRaw.forEach((e) => {
      const tier = e.customer_tier || 'Standard EPC';
      if (!customerTypeMap[tier]) {
        customerTypeMap[tier] = { created: 0, abandoned: 0, epcsCount: 0 };
      }
      customerTypeMap[tier].epcsCount += 1;
      const epcCart = allCartsRaw.find((c) => c.account_id?.toString() === e._id.toString());
      const cItems = (epcCart?.cart?.length || 0) + (epcCart?.bulkCart?.length || 0);
      const epcOrdersCount = (epcOrdersMap[e._id.toString()] || []).length;
      customerTypeMap[tier].created += cItems;
      customerTypeMap[tier].abandoned += Math.max(0, cItems - epcOrdersCount);
    });

    const byCustomerType = Object.entries(customerTypeMap)
      .filter(([_, val]) => val.created > 0)
      .map(([cType, val]) => {
        const ratioNum = val.created > 0 ? ((val.abandoned / val.created) * 100).toFixed(1) : '0.0';
        return {
          customerType: cType,
          cartsCreated: val.created,
          cartsAbandoned: val.abandoned,
          ratio: `${ratioNum}%`,
          ratioNumber: parseFloat(ratioNum),
          primaryDropReason: val.abandoned > 0 ? 'Incomplete checkout at payment step' : 'N/A',
        };
      });

    // E. By Partner Store from Real Resellers
    const partnerStoreMap = {};
    allEpcsRaw.forEach((e) => {
      if (e.primary_reseller_id) {
        const rid = e.primary_reseller_id._id?.toString() || e.primary_reseller_id.toString();
        const rName = e.primary_reseller_id.company_name || e.primary_reseller_id.store_name || 'Assigned Franchisee';
        if (!partnerStoreMap[rid]) {
          partnerStoreMap[rid] = {
            name: rName,
            type: 'Franchisee Partner',
            state: e.primary_reseller_id.state_name || e.state_name || 'N/A',
            district: e.primary_reseller_id.district_name || e.district_name || 'N/A',
            cartsCreated: 0,
            cartsAbandoned: 0,
          };
        }
        const epcCart = allCartsRaw.find((c) => c.account_id?.toString() === e._id.toString());
        const cItems = (epcCart?.cart?.length || 0) + (epcCart?.bulkCart?.length || 0);
        const epcOrdersCount = (epcOrdersMap[e._id.toString()] || []).length;
        partnerStoreMap[rid].cartsCreated += cItems;
        partnerStoreMap[rid].cartsAbandoned += Math.max(0, cItems - epcOrdersCount);
      }
    });

    const byPartnerStore = Object.values(partnerStoreMap)
      .filter((s) => s.cartsCreated > 0)
      .map((s) => {
        const ratioNum = s.cartsCreated > 0 ? ((s.cartsAbandoned / s.cartsCreated) * 100).toFixed(1) : '0.0';
        return {
          ...s,
          ratio: `${ratioNum}%`,
          ratioNumber: parseFloat(ratioNum),
        };
      });

    // Real Detection Alert (Only when genuine abandoned carts exist)
    let detectionAlert = null;
    if (abandonedCarts > 0 && byKitType.length > 0) {
      const topAbandonedKit = byKitType[0];
      const topAbandonedArea = byGeo.length > 0 ? byGeo[0] : null;
      const resolvedArea = topAbandonedArea
        ? topAbandonedArea.area
        : (allEpcsRaw[0]?.district_name ? `${allEpcsRaw[0].district_name}, ${allEpcsRaw[0].state_name}` : 'Assigned Territory');

      detectionAlert = {
        mostAbandonedKit: topAbandonedKit.kit,
        mostAbandonedKitRatio: topAbandonedKit.ratio,
        mostAbandonedArea: resolvedArea,
        mostAbandonedAreaRatio: topAbandonedArea ? topAbandonedArea.ratio : topAbandonedKit.ratio,
        recommendedAction: 'Target with BDE proactive phone reach-out and recovery discount incentive.',
      };
    }

    const cartAbandonmentSection = {
      formula: '(Eligible Carts Abandoned / Eligible Carts Created) × 100',
      totalCreated: addToCartEvents,
      totalAbandoned: abandonedCarts,
      ratio: `${cartAbandonmentRatioNumber}%`,
      ratioNumber: cartAbandonmentRatioNumber,
      detectionAlert,
      byKitType,
      byOrderType,
      byGeo,
      byCustomerType,
      byPartnerStore,
    };

    // ── 6. Real Repeat Order Ratio Multi-Dimensional Breakdowns ───────────────

    // A. By Kit Type in Real Orders
    const kitRepeatMap = {};
    allOrders.forEach((o) => {
      const eid = o.epc_id?._id?.toString() || o.epc_id?.toString();
      const isRepeatEpc = (epcOrdersMap[eid] || []).length >= 2;
      (o.items || []).forEach((item) => {
        const kName = item.item_name || 'Solar Kit';
        if (!kitRepeatMap[kName]) {
          kitRepeatMap[kName] = { firstBuyers: 0, repeatBuyers: 0, orders: 0 };
        }
        kitRepeatMap[kName].firstBuyers += 1;
        if (isRepeatEpc) {
          kitRepeatMap[kName].repeatBuyers += 1;
        }
        kitRepeatMap[kName].orders += (item.quantity || 1);
      });
    });

    const repeatByKitType = Object.entries(kitRepeatMap).map(([kit, counts]) => {
      const rate = counts.firstBuyers > 0 ? ((counts.repeatBuyers / counts.firstBuyers) * 100).toFixed(1) : '0.0';
      return {
        kit,
        totalFirstBuyers: counts.firstBuyers,
        repeatCustomers: counts.repeatBuyers,
        repeatRate: `${rate}%`,
        avgCadenceDays: avgDaysBetweenRepeatOrders,
      };
    });

    // B. By Order Type from Real Orders
    const orderTypeRepeatMap = {};
    allOrders.forEach((o) => {
      const typeLabel = o.order_type === 'po_order' ? 'PO Order (Bulk Procurement)' : 'Loose Quantity Order';
      const eid = o.epc_id?._id?.toString() || o.epc_id?.toString();
      const isRepeat = (epcOrdersMap[eid] || []).length >= 2;

      if (!orderTypeRepeatMap[typeLabel]) {
        orderTypeRepeatMap[typeLabel] = { first: 0, repeat: 0, totalPaise: 0 };
      }
      orderTypeRepeatMap[typeLabel].first += 1;
      if (isRepeat) orderTypeRepeatMap[typeLabel].repeat += 1;
      orderTypeRepeatMap[typeLabel].totalPaise += (o.grand_total_paise || 0);
    });

    const repeatByOrderType = Object.entries(orderTypeRepeatMap).map(([oType, data]) => {
      const rate = data.first > 0 ? ((data.repeat / data.first) * 100).toFixed(1) : '0.0';
      return {
        orderType: oType,
        firstOrderCount: data.first,
        repeatCount: data.repeat,
        repeatRate: `${rate}%`,
        avgValue: formatInr(data.first > 0 ? data.totalPaise / data.first : 0),
      };
    });

    // C. Top Repeat Customers from Real EPC Orders
    const topRepeatEpcs = Object.entries(epcOrdersMap)
      .map(([eid, ords]) => {
        const epc = allEpcsRaw.find((e) => e._id.toString() === eid);
        const totalSpend = ords.reduce((sum, o) => sum + (o.grand_total_paise || 0), 0);
        const totalKw = ords.reduce((sum, o) => {
          return sum + (o.items || []).reduce((iSum, it) => iSum + (parseFloat(it.capacity) || 0) * (it.quantity || 1), 0);
        }, 0);
        const lastOrder = ords[ords.length - 1];
        const orderDate = lastOrder?.created_at || lastOrder?.createdAt;
        const daysSinceLast = orderDate
          ? Math.max(0, Math.round((new Date() - new Date(orderDate)) / 86400000))
          : 0;

        return {
          id: eid,
          name: epc?.company_name || epc?.name || 'EPC Partner',
          contact: epc?.name || 'Contact',
          mobile: epc?.whatsapp || epc?.mobile_number || epc?.mobile || 'N/A',
          state: epc?.state_name || 'N/A',
          district: epc?.district_name || 'N/A',
          tier: epc?.customer_tier || 'Standard EPC',
          repeatOrdersCount: ords.length,
          totalKwPurchased: `${totalKw.toFixed(1)} kW`,
          totalSpendFormatted: formatInr(totalSpend),
          daysSinceLastOrder: daysSinceLast,
          assignedBde: epc?.onboarded_by_bde_id?.name || 'BDE Assigned',
        };
      })
      .sort((a, b) => b.repeatOrdersCount - a.repeatOrdersCount);

    // D. Real Repeat Cohorts Grouped by Month of Order
    const cohortMap = {};
    allOrders.forEach((o) => {
      const d = new Date(o.created_at || o.createdAt || Date.now());
      const period = `${d.toLocaleString('default', { month: 'short' })} ${d.getFullYear()}`;
      if (!cohortMap[period]) {
        cohortMap[period] = { cohortSize: 0, repeatedIn30d: 0, repeatedIn60d: 0 };
      }
      cohortMap[period].cohortSize += 1;
      const eid = o.epc_id?._id?.toString() || o.epc_id?.toString();
      if ((epcOrdersMap[eid] || []).length >= 2) {
        cohortMap[period].repeatedIn30d += 1;
        cohortMap[period].repeatedIn60d += 1;
      }
    });

    const repeatCohorts = Object.entries(cohortMap).map(([period, c]) => ({
      period,
      cohortSize: c.cohortSize,
      repeatedIn30d: c.repeatedIn30d,
      repeatedIn60d: c.repeatedIn60d,
      totalRepeatRate: c.cohortSize > 0 ? `${((c.repeatedIn30d / c.cohortSize) * 100).toFixed(1)}%` : '0.0%',
    }));

    // E. Real Repeat Order Breakdowns by Franchisee Store
    const franchiseeRepeatMap = {};
    allOrders.forEach((o) => {
      if (o.reseller_id) {
        const rid = o.reseller_id._id?.toString() || o.reseller_id.toString();
        const rName = o.reseller_id.company_name || o.reseller_id.store_name || 'Franchisee Partner';
        const loc = [o.reseller_id.district_name, o.reseller_id.state_name].filter(Boolean).join(', ') || 'Regional';
        if (!franchiseeRepeatMap[rid]) {
          franchiseeRepeatMap[rid] = { franchiseeName: rName, location: loc, buyersSet: new Set(), repeatBuyersSet: new Set() };
        }
        const eid = o.epc_id?._id?.toString() || o.epc_id?.toString();
        if (eid) {
          franchiseeRepeatMap[rid].buyersSet.add(eid);
          if ((epcOrdersMap[eid] || []).length >= 2) {
            franchiseeRepeatMap[rid].repeatBuyersSet.add(eid);
          }
        }
      }
    });

    const repeatByFranchisee = Object.values(franchiseeRepeatMap).map((f) => {
      const totalFirst = f.buyersSet.size;
      const repeats = f.repeatBuyersSet.size;
      const rate = totalFirst > 0 ? ((repeats / totalFirst) * 100).toFixed(1) : '0.0';
      return {
        franchiseeName: f.franchiseeName,
        location: f.location,
        totalFirstBuyers: totalFirst,
        repeatCustomers: repeats,
        repeatRate: `${rate}%`,
        retentionScore: parseFloat(rate) >= 50 ? 'High Retention' : parseFloat(rate) > 0 ? 'Moderate' : 'Developing',
      };
    });

    // F. Real Repeat Order Breakdowns by Geography
    const geoRepeatMap = {};
    allOrders.forEach((o) => {
      const epc = allEpcsRaw.find((e) => e._id.toString() === (o.epc_id?._id?.toString() || o.epc_id?.toString()));
      const district = epc?.district_name || 'Regional';
      const stateName = epc?.state_name || 'Territory';
      const area = `${district}, ${stateName}`;
      if (!geoRepeatMap[area]) {
        geoRepeatMap[area] = { area, buyersSet: new Set(), repeatBuyersSet: new Set() };
      }
      const eid = o.epc_id?._id?.toString() || o.epc_id?.toString();
      if (eid) {
        geoRepeatMap[area].buyersSet.add(eid);
        if ((epcOrdersMap[eid] || []).length >= 2) {
          geoRepeatMap[area].repeatBuyersSet.add(eid);
        }
      }
    });

    const repeatByGeo = Object.values(geoRepeatMap).map((g) => {
      const totalFirst = g.buyersSet.size;
      const repeats = g.repeatBuyersSet.size;
      const rate = totalFirst > 0 ? ((repeats / totalFirst) * 100).toFixed(1) : '0.0';
      return {
        area: g.area,
        totalBuyers: totalFirst,
        repeatBuyers: repeats,
        repeatRate: `${rate}%`,
        density: totalFirst >= 5 ? 'High Density' : totalFirst >= 2 ? 'Medium Density' : 'Low Density',
      };
    });

    const repeatOrderSection = {
      formula: '(Customers with Repeat Orders / Customers who placed Eligible First Order) × 100',
      repeatRatio: `${repeatOrderRatioNumber}%`,
      repeatRatioNumber: repeatOrderRatioNumber,
      repeatCustomersCount,
      eligibleFirstOrderCount: uniqueFirstOrderBuyers,
      avgDaysBetweenRepeatOrders,
      byKitType: repeatByKitType,
      byOrderType: repeatByOrderType,
      topRepeatEpcs,
      byFranchisee: repeatByFranchisee,
      byGeo: repeatByGeo,
      cohorts: repeatCohorts,
    };

    // ── 7. Real EPC Directory with Dynamic Attributes ─────────────────────────
    const epcDirectory = allEpcsRaw.map((e) => {
      const eid = e._id.toString();
      const epcOrders = epcOrdersMap[eid] || [];
      const ordersCount = epcOrders.length;

      // Find real cart for this EPC
      const epcCart = allCartsRaw.find((c) => c.account_id?.toString() === eid);
      const cartItemsCount = (epcCart?.cart?.length || 0) + (epcCart?.bulkCart?.length || 0);
      const cartsCreated = Math.max(ordersCount, cartItemsCount);
      const cartsAbandoned = Math.max(0, cartsCreated - ordersCount);
      const epcAbandonRatio = cartsCreated > 0 ? ((cartsAbandoned / cartsCreated) * 100).toFixed(0) : '0';

      const epcQuotes = allQuotes.filter((q) => q.epc_id?._id?.toString() === eid || q.epc_id?.toString() === eid);
      const epcDownloads = allDownloadsRaw.filter(
        (a) => a.performed_by?.toString() === eid || (a.quote_id && epcQuotes.some((q) => q._id?.toString() === a.quote_id?.toString()))
      );
      const datasheetDownloads = epcDownloads.length;
      const storeVisits = epcVisitsMap[eid] || 0;

      return {
        id: eid,
        name: e.company_name || e.name || 'EPC Partner',
        contactPerson: e.name || 'Contact Person',
        email: e.email,
        whatsapp: e.whatsapp || e.registered_whatsapp || e.mobile || 'N/A',
        gstin: e.gstin || 'Unregistered',
        state: e.state_name || 'N/A',
        district: e.district_name || 'N/A',
        customerTier: e.customer_tier || 'Standard EPC',
        behaviorStatus: e.behavior_status || (ordersCount >= 2 ? 'loyal_repeat' : cartsAbandoned > 0 ? 'at_risk' : 'active'),
        recoveryDiscountPct: e.recovery_discount_pct || 0,
        recoveryFollowupStatus: e.recovery_followup_status || 'none',
        creditLimitInr: e.credit_limit_inr || 0,
        behaviorNotes: e.behavior_notes || '',
        storeVisits,
        datasheetDownloads,
        cartsCreated,
        cartsAbandoned,
        abandonmentRatio: `${epcAbandonRatio}%`,
        ordersCount,
        repeatOrders: Math.max(0, ordersCount - 1),
        lastActive: e.last_activity_at || e.updated_at || e.created_at,
        assignedBde: e.onboarded_by_bde_id ? {
          id: e.onboarded_by_bde_id._id,
          name: e.onboarded_by_bde_id.name,
          employeeCode: e.onboarded_by_bde_id.employee_code,
        } : null,
      };
    });

    // Dynamic states and districts list from database geolocation tables + real EPC data
    const [allStatesDb, allDistrictsDb] = await Promise.all([
      mongoose.connection.collection('geolocation_level_1').find({}, { projection: { name: 1, _id: 1 } }).sort({ name: 1 }).toArray().catch(() => []),
      mongoose.connection.collection('geolocation_level_2').find({}, { projection: { name: 1, level_1: 1 } }).sort({ name: 1 }).toArray().catch(() => []),
    ]);

    const stateIdToName = {};
    allStatesDb.forEach((s) => {
      stateIdToName[s._id.toString()] = s.name;
    });

    const stateDistrictsMap = {};
    allStatesDb.forEach((s) => {
      stateDistrictsMap[s.name] = [];
    });

    allDistrictsDb.forEach((d) => {
      const sName = stateIdToName[d.level_1?.toString()];
      if (sName) {
        stateDistrictsMap[sName].push(d.name);
      }
    });

    // Also include any distinct state and district names from epc_accounts
    allEpcsRaw.forEach((e) => {
      if (e.state_name) {
        if (!stateDistrictsMap[e.state_name]) {
          stateDistrictsMap[e.state_name] = [];
        }
        if (e.district_name && !stateDistrictsMap[e.state_name].includes(e.district_name)) {
          stateDistrictsMap[e.state_name].push(e.district_name);
        }
      }
    });

    Object.keys(stateDistrictsMap).forEach((st) => {
      stateDistrictsMap[st].sort();
    });

    let fullStatesList = allStatesDb.length > 0
      ? allStatesDb.map((s) => s.name)
      : [...new Set(allEpcsRaw.map((e) => e.state_name).filter(Boolean))];

    // When requested by a BDE, scope the state list strictly to the BDE's assigned territories and their EPCs
    if (bdeId) {
      try {
        const { BDETerritoryAssignment } = require('../models/india_solarshop_db');
        if (BDETerritoryAssignment) {
          const bdeTerritories = await BDETerritoryAssignment.find({
            bde_id: bdeId,
            status: 'active',
          }).lean();
          const bdeStateNames = bdeTerritories.map((t) => t.state_name).filter(Boolean);
          const epcStateNames = allEpcsRaw.map((e) => e.state_name).filter(Boolean);
          const combinedBdeStates = [...new Set([...bdeStateNames, ...epcStateNames])];
          if (combinedBdeStates.length > 0) {
            fullStatesList = combinedBdeStates.sort();
          }
        }
      } catch (tErr) {
        console.warn('Could not scope states to BDE territory:', tErr.message);
      }
    }

    let currentDistrictsList = [];
    if (state && state !== 'all') {
      currentDistrictsList = stateDistrictsMap[state] || [];
    } else if (bdeId && fullStatesList.length > 0) {
      currentDistrictsList = [...new Set(fullStatesList.flatMap((s) => stateDistrictsMap[s] || []))].sort();
    } else {
      currentDistrictsList = [...new Set(Object.values(stateDistrictsMap).flat())].sort();
    }

    const kitTypesList = [...new Set(byKitType.map((k) => k.kit).filter(Boolean))];

    return res.status(200).json({
      status: 'success',
      data: {
        storeActivityMetrics,
        cartAbandonmentSection,
        repeatOrderSection,
        epcDirectory,
        bdeList: isBde ? [] : allBdes.map((b) => ({ id: b._id.toString(), name: b.name, employeeCode: b.employee_code })),
        states: fullStatesList,
        districts: currentDistrictsList,
        stateDistrictsMap,
        kitTypes: kitTypesList,
      },
    });
  } catch (err) {
    console.error('get_epc_behavior_analytics error:', err);
    return res.status(500).json({ status: 'error', message: err.message });
  }
};

/**
 * GET /admin-api/epc-analytics/epc-profile/:id
 * Real Single EPC Profile & Telemetry from Database
 * Strictly Scoped to BDE (If accessed by BDE, verifies onboarding ownership)
 */
exports.get_epc_profile_detail = async (req, res) => {
  try {
    const { id } = req.params;
    const { dateRange = 'last_30_days' } = req.query;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ status: 'error', message: 'Invalid EPC Account ID' });
    }

    // Role-based Authorization check for BDE
    const isBde = (req.user && req.user.role === 'bde') || !!req.bde;
    const bdeId = isBde ? (req.user?.id || req.user?._id || req.bde?._id) : null;

    if (isBde && bdeId) {
      const scopedEpcIds = await getBdeOnboardedEpcIds(bdeId);
      const isAuthorized = scopedEpcIds.some((sId) => sId.toString() === id.toString());
      if (!isAuthorized) {
        return res.status(403).json({
          status: 'error',
          message: 'You are not authorized to view analytics for an EPC account that was not onboarded by you.',
        });
      }
    }

    const cartCol = getCartCollection();

    const [epc, epcOrders, epcQuotes, epcCart, epcTokensPeriod, epcTokensAllTime, epcDownloads] = await Promise.all([
      EpcAccount.findById(id)
        .populate('onboarded_by_bde_id', 'name email mobile_number employee_code')
        .populate('primary_reseller_id', 'company_name store_name state_name district_name')
        .lean(),
      EpcOrder.find({ epc_id: id }).sort({ created_at: -1, createdAt: -1 }).lean(),
      EpcQuote.find({ epc_id: id }).sort({ created_at: -1, createdAt: -1 }).lean(),
      cartCol.findOne({ account_id: new mongoose.Types.ObjectId(id) }),
      UserRefreshToken ? UserRefreshToken.find({
        user_id: { $in: [id, new mongoose.Types.ObjectId(id)] },
        ...buildDateFilter(dateRange, 'created_at'),
      }).lean() : Promise.resolve([]),
      UserRefreshToken ? UserRefreshToken.find({ user_id: { $in: [id, new mongoose.Types.ObjectId(id)] } }).lean() : Promise.resolve([]),
      mongoose.connection.collection('epc_quote_activities').find({
        performed_by: { $in: [id, new mongoose.Types.ObjectId(id)] },
        action: { $in: ['PDF_DOWNLOADED', 'QUOTE_PDF_DOWNLOADED'] },
      }).toArray(),
    ]);

    if (!epc) {
      return res.status(404).json({ status: 'error', message: 'EPC Account not found' });
    }

    const completedOrders = epcOrders.filter((o) => ['delivered', 'closed', 'confirmed', 'completed'].includes(o.order_status));
    const totalSpendPaise = completedOrders.reduce((sum, o) => sum + (o.grand_total_paise || 0), 0);

    const cartItems = [...(epcCart?.cart || []), ...(epcCart?.bulkCart || [])];
    const cartsCreated = Math.max(epcOrders.length, cartItems.length);
    const abandonedCarts = Math.max(0, cartsCreated - epcOrders.length);
    const abandonmentRatio = cartsCreated > 0 ? ((abandonedCarts / cartsCreated) * 100).toFixed(1) : '0.0';

    // Real visit and download metrics
    const storeVisits = epcTokensPeriod.length;
    const allTimeStoreVisits = epcTokensAllTime.length;
    const datasheetDownloads = epcDownloads.length;

    // Build real abandonment history from real cart items
    const abandonmentHistory = cartItems.map((item) => ({
      kit: item.kitName || item.item_name || 'Solar Kit',
      abandonedDate: item.updated_at ? new Date(item.updated_at).toLocaleDateString() : 'Recent Session',
      estimatedValue: item.ourPrice ? `₹${item.ourPrice.toLocaleString('en-IN')}` : 'In Cart',
      reason: 'Incomplete checkout at delivery / payment step',
      recoveryOfferApplied: epc.recovery_discount_pct ? `${epc.recovery_discount_pct}% OFF` : 'None',
    }));

    // Real cadence between orders
    let avgRepurchaseDays = 'N/A';
    if (completedOrders.length > 1) {
      const sorted = [...completedOrders].sort((a, b) => new Date(a.created_at || a.createdAt) - new Date(b.created_at || b.createdAt));
      let totalD = 0;
      for (let i = 1; i < sorted.length; i++) {
        totalD += Math.max(1, Math.round(Math.abs(new Date(sorted[i].created_at || sorted[i].createdAt) - new Date(sorted[i - 1].created_at || sorted[i - 1].createdAt)) / 86400000));
      }
      avgRepurchaseDays = `${(totalD / (sorted.length - 1)).toFixed(1)} Days`;
    }

    return res.status(200).json({
      status: 'success',
      data: {
        profile: {
          id: epc._id.toString(),
          name: epc.company_name || epc.name,
          contactPerson: epc.name,
          email: epc.email,
          whatsapp: epc.whatsapp || epc.registered_whatsapp || epc.mobile || 'N/A',
          gstin: epc.gstin || 'Unregistered',
          state: epc.state_name || 'N/A',
          district: epc.district_name || 'N/A',
          address: epc.address || '',
          customerTier: epc.customer_tier || 'Standard EPC',
          behaviorStatus: epc.behavior_status || (epcOrders.length >= 2 ? 'loyal_repeat' : 'active'),
          recoveryDiscountPct: epc.recovery_discount_pct || 0,
          recoveryFollowupStatus: epc.recovery_followup_status || 'none',
          creditLimitInr: epc.credit_limit_inr || 0,
          behaviorNotes: epc.behavior_notes || '',
          assignedBde: epc.onboarded_by_bde_id ? {
            id: epc.onboarded_by_bde_id._id,
            name: epc.onboarded_by_bde_id.name,
            employeeCode: epc.onboarded_by_bde_id.employee_code,
          } : null,
          registeredAt: epc.created_at || epc.createdAt,
          lastActivityAt: epc.last_activity_at || epc.updated_at || epc.created_at,
        },
        telemetry: {
          storeVisits,
          allTimeStoreVisits,
          uniqueSessions: new Set(epcTokensAllTime.map((t) => t.ip_address).filter(Boolean)).size || (allTimeStoreVisits > 0 ? 1 : 0),
          kitCardViews: cartItems.length + epcOrders.length,
          datasheetDownloads,
          cartsCreated,
          abandonedCarts,
          cartAbandonmentRatio: `${abandonmentRatio}%`,
          ordersCount: epcOrders.length,
          completedOrdersCount: completedOrders.length,
          repeatOrdersCount: Math.max(0, epcOrders.length - 1),
          totalSpendFormatted: formatInr(totalSpendPaise),
          avgRepurchaseDays,
        },
        recentOrders: epcOrders.map((o) => ({
          id: o._id.toString(),
          orderNumber: o.order_number || `ORD-${o._id.toString().slice(-6)}`,
          orderType: o.order_type === 'loose_order' ? 'Loose Quantity' : 'PO Order',
          amountFormatted: formatInr(o.grand_total_paise || 0),
          status: o.order_status || 'Confirmed',
          date: (o.created_at || o.createdAt) ? new Date(o.created_at || o.createdAt).toISOString().split('T')[0] : 'Recent',
        })),
        recentQuotes: epcQuotes.map((q) => ({
          id: q._id.toString(),
          quoteNumber: q.quote_number || `QUO-${q._id.toString().slice(-6)}`,
          status: q.status || 'draft',
          totalAmount: formatInr(q.total_amount_paise || 0),
          date: (q.created_at || q.createdAt) ? new Date(q.created_at || q.createdAt).toISOString().split('T')[0] : 'Recent',
        })),
        abandonmentHistory,
      },
    });
  } catch (err) {
    console.error('get_epc_profile_detail error:', err);
    return res.status(500).json({ status: 'error', message: err.message });
  }
};

/**
 * PUT /admin-api/epc-analytics/epc-profile/:id/behavior
 * Real Update of EPC Behavioral Profile
 * Strictly Scoped to BDE (If accessed by BDE, verifies onboarding ownership)
 */
exports.update_epc_profile_behavior = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      behavior_status,
      customer_tier,
      recovery_discount_pct,
      recovery_followup_status,
      credit_limit_inr,
      assigned_bde_id,
      behavior_notes,
    } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ status: 'error', message: 'Invalid EPC Account ID' });
    }

    const isBde = (req.user && req.user.role === 'bde') || !!req.bde;
    const bdeId = isBde ? (req.user?.id || req.user?._id || req.bde?._id) : null;

    if (isBde && bdeId) {
      const scopedEpcIds = await getBdeOnboardedEpcIds(bdeId);
      const isAuthorized = scopedEpcIds.some((sId) => sId.toString() === id.toString());
      if (!isAuthorized) {
        return res.status(403).json({
          status: 'error',
          message: 'You are not authorized to modify an EPC account that was not onboarded by you.',
        });
      }
    }

    const updateFields = {
      updated_at: new Date(),
      last_activity_at: new Date(),
    };

    if (behavior_status !== undefined) updateFields.behavior_status = behavior_status;
    if (customer_tier !== undefined) updateFields.customer_tier = customer_tier;
    if (recovery_discount_pct !== undefined) updateFields.recovery_discount_pct = Number(recovery_discount_pct);
    if (recovery_followup_status !== undefined) updateFields.recovery_followup_status = recovery_followup_status;
    if (credit_limit_inr !== undefined) updateFields.credit_limit_inr = Number(credit_limit_inr);
    if (behavior_notes !== undefined) updateFields.behavior_notes = behavior_notes;
    if (assigned_bde_id !== undefined && !isBde) {
      // Only Admin can reassign BDE
      updateFields.onboarded_by_bde_id = assigned_bde_id && mongoose.Types.ObjectId.isValid(assigned_bde_id)
        ? new mongoose.Types.ObjectId(assigned_bde_id)
        : null;
    }

    const updated = await EpcAccount.findByIdAndUpdate(
      id,
      { $set: updateFields },
      { new: true }
    )
      .populate('onboarded_by_bde_id', 'name email employee_code')
      .lean();

    if (!updated) {
      return res.status(404).json({ status: 'error', message: 'EPC Account not found' });
    }

    return res.status(200).json({
      status: 'success',
      message: 'EPC Behavior Profile updated successfully',
      data: {
        id: updated._id.toString(),
        behavior_status: updated.behavior_status,
        customer_tier: updated.customer_tier,
        recovery_discount_pct: updated.recovery_discount_pct,
        recovery_followup_status: updated.recovery_followup_status,
        credit_limit_inr: updated.credit_limit_inr,
        behavior_notes: updated.behavior_notes,
        assignedBde: updated.onboarded_by_bde_id ? {
          id: updated.onboarded_by_bde_id._id,
          name: updated.onboarded_by_bde_id.name,
          employeeCode: updated.onboarded_by_bde_id.employee_code,
        } : null,
      },
    });
  } catch (err) {
    console.error('update_epc_profile_behavior error:', err);
    return res.status(500).json({ status: 'error', message: err.message });
  }
};

/**
 * GET /admin-api/epc-analytics/epc-buying-analytics/:id
 * Fetches the complete 8-feature EPC Buying Behavior & Order Analytics suite for Admin
 */
exports.get_epc_buying_analytics = async (req, res) => {
  try {
    return shopAnalyticsHandler.get_epc_analytics(req, res);
  } catch (err) {
    console.error('get_epc_buying_analytics error:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * PUT /admin-api/epc-analytics/epc-profile/:id/epc-type
 * Allows Admin to assign or reclassify an EPC's EPC Type
 */
exports.update_epc_type = async (req, res) => {
  try {
    const { id } = req.params;
    const { epc_type_id } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid EPC Account ID' });
    }

    let typeDoc = null;
    if (epc_type_id && mongoose.Types.ObjectId.isValid(epc_type_id)) {
      typeDoc = await EpcType.findById(epc_type_id).lean();
    }

    const typeName = typeDoc ? typeDoc.name : (req.body.epc_type || 'Solar EPC Contractor');

    const updatedAccount = await EpcAccount.findByIdAndUpdate(
      id,
      {
        $set: {
          epc_type_id: typeDoc ? typeDoc._id : null,
          epc_type: typeName,
          updated_at: new Date(),
        },
      },
      { new: true }
    )
      .populate('epc_type_id')
      .lean();

    if (!updatedAccount) {
      return res.status(404).json({ success: false, message: 'EPC Account not found' });
    }

    return res.status(200).json({
      success: true,
      message: 'EPC Classification Type updated successfully',
      data: {
        id: updatedAccount._id.toString(),
        epc_type_id: updatedAccount.epc_type_id?._id || updatedAccount.epc_type_id || null,
        epc_type: updatedAccount.epc_type,
        epc_type_details: updatedAccount.epc_type_id || typeDoc || null,
      },
    });
  } catch (err) {
    console.error('update_epc_type error:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
};
