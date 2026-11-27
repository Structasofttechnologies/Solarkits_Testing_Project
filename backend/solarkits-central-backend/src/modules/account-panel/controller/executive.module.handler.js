const voucherModule = require('../models/india_solarshop_db/accounting_voucher.schema');
const AccountingVoucher = voucherModule.AccountingVoucher || voucherModule;
const mongoose = require('mongoose');

exports.get_executive_overview = async (req, res) => {
  try {
    const { financial_year, state, cluster_name } = req.query;
    const db = mongoose.connection.db;

    // 1. Current financial year dynamically computed
    const currentDate = new Date();
    const currentMonth = currentDate.getMonth(); // 0-indexed (April is 3)
    const currentYear = currentDate.getFullYear();
    const defaultFY = currentMonth >= 3
      ? `${currentYear}-${currentYear + 1}`
      : `${currentYear - 1}-${currentYear}`;
    const fy = financial_year || defaultFY;

    // 2. Query Accounting Vouchers
    const voucherFilter = { status: { $in: ['POSTED', 'Posted', 'posted'] } };
    if (state && state !== 'ALL') voucherFilter.state_name = state;
    if (cluster_name && cluster_name !== 'ALL') voucherFilter.cluster_name = cluster_name;

    const vouchers = await AccountingVoucher.find(voucherFilter).lean().catch(() => []);

    let vTurnover = 0;
    let vCollections = 0;
    let vPurchases = 0;
    let vSupplierPayments = 0;

    (vouchers || []).forEach(v => {
      const type = (v.voucher_type || '').toUpperCase();
      const amt = Number(v.total_amount || 0);
      if (type === 'SALES') vTurnover += amt;
      else if (type === 'RECEIPT') vCollections += amt;
      else if (type === 'PURCHASE') vPurchases += amt;
      else if (type === 'PAYMENT') vSupplierPayments += amt;
    });

    // 3. Query Real Orders (EPC Orders & Trial Kit Orders)
    const orderFilter = { deleted_at: null };
    const epcOrders = await db.collection('epc_orders').find(orderFilter).toArray().catch(() => []);
    const trialOrders = await db.collection('trial_kit_orders').find(orderFilter).toArray().catch(() => []);

    let epcTurnover = 0;
    let epcCollections = 0;
    let deliveredKits = 0;
    const receivablesAging = {
      current_0_30_days: 0,
      aging_31_60_days: 0,
      aging_61_90_days: 0,
      over_90_days: 0
    };
    const now = Date.now();
    const regionalOrdersMap = {};

    epcOrders.forEach(o => {
      const orderInr = (Number(o.grand_total_paise || 0)) / 100;
      epcTurnover += orderInr;

      const paidInr = Number(o.offline_payment?.amount_paid || 0);
      epcCollections += paidInr;

      const unpaidInr = Math.max(0, orderInr - paidInr);
      if (unpaidInr > 0) {
        const orderDate = new Date(o.created_at || o.createdAt || now).getTime();
        const diffDays = Math.floor((now - orderDate) / (1000 * 60 * 60 * 24));
        if (diffDays <= 30) receivablesAging.current_0_30_days += Math.round(unpaidInr);
        else if (diffDays <= 60) receivablesAging.aging_31_60_days += Math.round(unpaidInr);
        else if (diffDays <= 90) receivablesAging.aging_61_90_days += Math.round(unpaidInr);
        else receivablesAging.over_90_days += Math.round(unpaidInr);
      }

      const kitsCount = Number(o.order_load_metrics?.total_kits || o.items?.length || 0);
      if (o.order_status === 'delivered') {
        deliveredKits += kitsCount;
      }

      const stateName = o.delivery_address?.state || o.shipping_address?.state || 'Gujarat';
      if (!regionalOrdersMap[stateName]) regionalOrdersMap[stateName] = { turnover: 0, kits_delivered: 0 };
      regionalOrdersMap[stateName].turnover += orderInr;
      if (o.order_status === 'delivered') {
        regionalOrdersMap[stateName].kits_delivered += kitsCount;
      }
    });

    trialOrders.forEach(to => {
      if (to.status === 'delivered' || to.order_status === 'delivered') {
        deliveredKits += 1;
      }
    });

    // 4. Active EPC Partners count from database
    const activeEpcPartners = await db.collection('epc_accounts').countDocuments({
      deleted_at: null,
      status: { $in: ['approved', 'active', 'verified'] }
    }).catch(() => 0) || await db.collection('epc_accounts').countDocuments({ deleted_at: null }).catch(() => 0);

    // 5. Total Invoiced Turnover & Collections
    const totalInvoicedTurnover = Math.round(vTurnover + epcTurnover);
    const totalCollections = Math.round(vCollections + epcCollections);
    const outstandingReceivables = Math.max(0, totalInvoicedTurnover - totalCollections);
    const collectionEfficiency = totalInvoicedTurnover > 0
      ? Math.round((totalCollections / totalInvoicedTurnover) * 100)
      : (totalCollections > 0 ? 100 : 0);

    // 6. Real-time Inventory Valuation from live warehouse stock
    const trialInventories = await db.collection('trial_kit_inventories').find({ status: 'active' }).toArray().catch(() => []);
    let physicalValuation = 0;
    let reservedValuation = 0;
    let totalKitStock = 0;

    trialInventories.forEach(ti => {
      const unitCost = Number(ti.unit_cost_price_inr || 35000);
      const avail = Number(ti.available_stock || 0);
      const resStock = Number(ti.reserved_stock || 0);
      physicalValuation += avail * unitCost;
      reservedValuation += resStock * unitCost;
      totalKitStock += (avail + resStock);
    });

    // In-transit from OEMs (POs created/paid but awaiting delivery)
    const pendingPOs = await db.collection('purchase_orders').find({
      status: { $in: ['paid', 'confirmed', 'in_transit', 'dispatched'] },
      delivery_date: null
    }).toArray().catch(() => []);

    let inTransitValuation = 0;
    pendingPOs.forEach(po => {
      const amt = Number(po.payment_details?.amount || 0);
      inTransitValuation += amt;
    });

    const totalInventoryValuation = Math.round(physicalValuation + reservedValuation + inTransitValuation);
    const totalSolarPanelsStock = totalKitStock * 4;
    const totalInvertersStock = totalKitStock;

    // 7. Regional State Breakdown (live clusters, warehouses & orders)
    const clusters = await db.collection('franchisee_clusters').find({ deleted_at: null }).toArray().catch(() => []);
    const warehouses = await db.collection('company_warehouses').find({ deleted_at: null }).toArray().catch(() => []);
    const states = await db.collection('geolocation_level_1').find({}).toArray().catch(() => []);
    const stateIdMap = {};
    states.forEach(s => { stateIdMap[String(s._id)] = s.name; });

    const regionalSummary = {};

    clusters.forEach(c => {
      const st = c.state_name || 'Other';
      if (!regionalSummary[st]) regionalSummary[st] = { state: st, turnover: 0, clusters: 0, active_warehouses: 0, kits_delivered: 0 };
      regionalSummary[st].clusters += 1;
    });

    warehouses.forEach(w => {
      const st = stateIdMap[String(w.level_1)] || w.state_name || 'Gujarat';
      if (!regionalSummary[st]) regionalSummary[st] = { state: st, turnover: 0, clusters: 0, active_warehouses: 0, kits_delivered: 0 };
      regionalSummary[st].active_warehouses += 1;
    });

    Object.entries(regionalOrdersMap).forEach(([st, data]) => {
      if (!regionalSummary[st]) regionalSummary[st] = { state: st, turnover: 0, clusters: 0, active_warehouses: 0, kits_delivered: 0 };
      regionalSummary[st].turnover += data.turnover;
      regionalSummary[st].kits_delivered += data.kits_delivered;
    });

    const regionalBreakdown = Object.values(regionalSummary).map(r => ({
      ...r,
      turnover: Math.round(r.turnover),
      share_pct: totalInvoicedTurnover > 0 ? Number(((r.turnover / totalInvoicedTurnover) * 100).toFixed(1)) : 0
    })).sort((a, b) => b.clusters - a.clusters || b.turnover - a.turnover);

    return res.status(200).json({
      status: 'success',
      data: {
        financial_year: fy,
        kpis: {
          total_invoiced_turnover: totalInvoicedTurnover,
          total_collections_received: totalCollections,
          outstanding_receivables: outstandingReceivables,
          total_purchases: Math.round(vPurchases),
          total_supplier_payables: Math.max(0, Math.round(vPurchases - vSupplierPayments)),
          total_delivered_kits: deliveredKits,
          active_epc_partners: activeEpcPartners,
          collection_efficiency_pct: collectionEfficiency
        },
        inventory_valuation: {
          total_valuation: totalInventoryValuation,
          physical_in_warehouse: Math.round(physicalValuation),
          reserved_for_orders: Math.round(reservedValuation),
          in_transit_from_oem: Math.round(inTransitValuation),
          total_kit_units_stock: totalKitStock,
          total_solar_panels_stock: totalSolarPanelsStock,
          total_inverters_stock: totalInvertersStock
        },
        receivables_aging: receivablesAging,
        regional_breakdown: regionalBreakdown
      }
    });
  } catch (error) {
    console.error('get_executive_overview error:', error);
    return res.status(500).json({ status: 'error', message: error.message });
  }
};
