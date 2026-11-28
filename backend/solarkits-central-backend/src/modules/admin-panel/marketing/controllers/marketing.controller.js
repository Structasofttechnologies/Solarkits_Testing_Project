const mongoose = require('mongoose');
const {
  MarketingCampaign,
  MarketingSender,
  MarketingTemplate,
  WebsiteFormMapping,
  UtmVisit,
  MarketingUnsubscribe,
  MarketingDeliveryLog,
  MarketingSegment,
  MarketingAudienceSegment,
  MarketingTrackingLink
} = require('../models');

const {
  EpcAccount,
  WebsiteEpcLead,
  EpcOrder,
  OfferMaster,
  FranchiseeCluster,
  WarehouseComboKit,
  EpcType
} = require('../../models/india_solarshop_db');

const CompanyWarehouse = require('../../models/company_warehouse_db/company_warehouses.schema');
const GeoLevel1 = require('../../models/geolocation_db/geolocation_level_1.schema');
const GeoLevel2 = require('../../models/geolocation_db/geolocation_level_2.schema');
const GeoLevel0 = require('../../models/geolocation_db/geolocation_level_0.schema');
const CmsUser = require('../../models/user_db/cms_users.schema');
const IndustryType = require('../../models/core_db/industry_types.schema');
const WarehouseClusterMapping = require('../../models/core_db/warehouse_cluster_mapping.schema');
const EpcPreference = require('../../../solarshop-india/models/india_solarshop_db/epc_preferences.schema');
const EpcMarketingConsent = require('../../../solarshop-india/models/india_solarshop_db/epc_marketing_consents.schema');

const {
  SENDER_SECRET_FIELDS,
  isMaskedSecret,
  encryptSecret,
  sanitizeSenderForClient
} = require('../utils/crypto.util');

const audienceService = require('../services/audience.service');
const campaignService = require('../services/campaign.service');
const emailService = require('../services/email.service');
const whatsappService = require('../services/whatsapp.service');
const emailQueueService = require('../services/emailQueue.service');
const { buildGeoAndClusterResolver, cleanStateToken, cleanGeoToken } = require('../services/segmentGeo.service');
const { computeDynamicSegmentAnalytics } = require('../services/segmentAnalytics.service');
const segmentGroupsController = require('./segmentGroups.controller');

/**
 * Unified EPC Classification Engine:
 * 1. Buyer EPC: Placed at least 1 active order
 * 2. Verified EPC: Verified GSTIN provided, 0 orders placed
 * 3. Registered EPC: Registered without verified GSTIN or orders
 */
const classifyEpcPartner = ({ gstin, lifetimeOrders, ordersCount, is_buyer, is_verified }) => {
  const orders = Number(lifetimeOrders || ordersCount || 0);
  if (orders > 0 || is_buyer) return 'Buyer EPC';
  const cleanGst = String(gstin || '').trim();
  if (cleanGst.length >= 10 || is_verified) return 'Verified EPC';
  return 'Registered EPC';
};

/**
 * Fetch India GeoLevel1 filter (falls back to all active states if level_0 not found).
 */
const getIndiaStates = async () => {
  const indiaCountry = await GeoLevel0.findOne({ name: /india/i, deleted_at: null }).lean().catch(() => null);
  const query = { deleted_at: null, is_active: true };
  if (indiaCountry?._id) {
    query.level_0 = indiaCountry._id;
  }
  return GeoLevel1.find(query).select('name is_active level_0').sort({ name: 1 }).lean();
};

/**
 * Derive an uppercase state code from state name for map visualization.
 */
const STATE_CODE_MAP = {
  'Andhra Pradesh': 'AP', 'Arunachal Pradesh': 'AR', 'Assam': 'AS', 'Bihar': 'BR',
  'Chhattisgarh': 'CG', 'Goa': 'GA', 'Gujarat': 'GJ', 'Haryana': 'HR',
  'Himachal Pradesh': 'HP', 'Jharkhand': 'JH', 'Karnataka': 'KA', 'Kerala': 'KL',
  'Madhya Pradesh': 'MP', 'Maharashtra': 'MH', 'Manipur': 'MN', 'Meghalaya': 'ML',
  'Mizoram': 'MZ', 'Nagaland': 'NL', 'Odisha': 'OD', 'Punjab': 'PB',
  'Rajasthan': 'RJ', 'Sikkim': 'SK', 'Tamil Nadu': 'TN', 'Telangana': 'TS',
  'Tripura': 'TR', 'Uttar Pradesh': 'UP', 'Uttarakhand': 'UK', 'West Bengal': 'WB',
  'Delhi': 'DL', 'Jammu and Kashmir': 'JK', 'Chandigarh': 'CH', 'Puducherry': 'PY'
};

// ── 0. Dynamic Marketing Master Resources ──────────────────────────────────
const getMarketingResources = async (req, res) => {
  try {
    const { state_id, cluster_id, warehouse_id } = req.query;

    const districtQuery = { deleted_at: null, is_active: true };
    if (state_id && mongoose.Types.ObjectId.isValid(state_id)) {
      districtQuery.level_1 = state_id;
    }

    const clusterQuery = { deleted_at: null, is_active: true };
    if (state_id && mongoose.Types.ObjectId.isValid(state_id)) {
      clusterQuery.state_id = state_id;
    }

    const kitQuery = { deleted_at: null, is_active: true };
    if (warehouse_id && mongoose.Types.ObjectId.isValid(warehouse_id)) {
      kitQuery.warehouse_id = warehouse_id;
    } else if (cluster_id && mongoose.Types.ObjectId.isValid(cluster_id)) {
      kitQuery.cluster_id = cluster_id;
    } else if (state_id && mongoose.Types.ObjectId.isValid(state_id)) {
      kitQuery.state_id = state_id;
    }

    const [states, districts, clusters, warehouses, warehouseMappings, kits, industries, epcTypes, owners, coupons] =
      await Promise.all([
        getIndiaStates(),
        GeoLevel2.find(districtQuery).select('name level_1 cluster').sort({ name: 1 }).lean().catch(() => []),
        FranchiseeCluster.find(clusterQuery).select('cluster_name cluster_code state_id state_name district_ids district_names status').sort({ cluster_name: 1 }).lean().catch(() => []),
        CompanyWarehouse.find({ deleted_at: null, status_code: { $ne: 'inactive' } })
          .select('warehouse_name warehouse_code warehouse_type level_1 level_2 address status_code')
          .sort({ warehouse_name: 1 })
          .lean()
          .catch(() => []),
        WarehouseClusterMapping.find({ deleted_at: null }).select('warehouse_id warehouse_code warehouse_name states state_ids franchise_clusters').lean().catch(() => []),
        WarehouseComboKit.find(kitQuery)
          .select('name description state_id cluster_id warehouse_id capacity base_price_cached selling_price_cached order_quantities loose_order_quantities allow_trial_kit kit_image')
          .sort({ name: 1 })
          .limit(250)
          .lean()
          .catch(() => []),
        IndustryType.find({ deleted_at: null, is_active: true }).select('name code slug icon for_epc').sort({ sort_order: 1, name: 1 }).lean().catch(() => []),
        EpcType.find({ deleted_at: null, is_active: true }).select('name code badge_color').sort({ display_order: 1, name: 1 }).lean().catch(() => []),
        CmsUser.find({ is_deleted: false, deleted_at: null, is_active: true })
          .select('name email phone department_name state_name cluster_name')
          .sort({ name: 1 })
          .lean()
          .catch(() => []),
        OfferMaster.find({
          deleted_at: null,
          $or: [{ offer_type: 'coupon' }, { coupon_code: { $ne: null } }]
        })
          .select('offer_name offer_type discount_type discount_value coupon_code start_date end_date is_active products_applicable cluster_id customer_category')
          .sort({ created_at: -1 })
          .lean()
          .catch(() => [])
      ]);

    const stateNameById = new Map(states.map((s) => [String(s._id), s.name]));
    const mappingByWhId = new Map(warehouseMappings.map((m) => [String(m.warehouse_id), m]));

    const enrichedWarehouses = warehouses.map((wh) => {
      const m = mappingByWhId.get(String(wh._id));
      return {
        ...wh,
        state_name: (wh.level_1 && stateNameById.get(String(wh.level_1))) || (m?.states && m.states[0]) || '',
        clusters: (m?.franchise_clusters || []).map((c) => c.cluster_name).filter(Boolean)
      };
    });

    res.json({
      success: true,
      data: {
        states,
        districts,
        clusters,
        warehouses: enrichedWarehouses,
        kits,
        industries,
        epcTypes,
        owners,
        coupons
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ── 1. Dashboard Analytics (100% Real MongoDB Aggregation) ─────────────────
const getDashboardAnalytics = async (req, res) => {
  try {
    const [
      campaigns,
      epcs,
      leads,
      orders,
      offers,
      geoResolver,
      segmentAnalytics
    ] = await Promise.all([
      MarketingCampaign.find({}).sort({ created_at: -1 }).lean(),
      EpcAccount.find({ deleted_at: null })
        .select('_id email whatsapp gstin gst_verification_status is_gstin_active states districts state_name district_name')
        .lean()
        .catch(() => []),
      WebsiteEpcLead.find({ deleted_at: null })
        .select('_id email phone mobile_number gst_number state_name district_name lifetime_orders')
        .lean()
        .catch(() => []),
      EpcOrder.find({ order_status: { $nin: ['cancelled', 'rejected'] } })
        .select('_id epc_id customer_phone grand_total_paise state_name cluster_id created_at')
        .lean()
        .catch(() => []),
      OfferMaster.find({ deleted_at: null, $or: [{ offer_type: 'coupon' }, { coupon_code: { $nin: [null, ''] } }] })
        .populate('products_applicable', 'name')
        .sort({ created_at: -1 })
        .lean()
        .catch(() => []),
      buildGeoAndClusterResolver().catch(() => ({
        franchiseeClusters: [],
        districtById: new Map(),
        stateById: new Map(),
        resolve: ({ stateName, districtName }) => ({ state: stateName || '', district: districtName || '', cluster_name: '', cluster_code: '' })
      })),
      computeDynamicSegmentAnalytics().catch(() => ({
        summary: { total_segments: 0, total_leads_uploaded: 0, total_registered: 0, total_verified: 0, total_buyers: 0, total_revenue_inr: 0 },
        segments: []
      }))
    ]);

    const totalCampaigns = campaigns.length;
    const activeCampaigns = campaigns.filter((c) => ['running', 'scheduled'].includes(c.status)).length;
    const completedCampaigns = campaigns.filter((c) => c.status === 'completed').length;

    let totalSent = 0;
    let totalDelivered = 0;
    let totalRead = 0;
    let totalClicks = 0;
    let totalVisits = 0;
    let totalLeads = 0;
    let totalQualified = 0;
    let totalConversions = 0;
    let totalRevenue = 0;
    let totalCost = 0;
    let totalFailed = 0;

    const emailMetrics = { sent: 0, delivered: 0, read: 0, clicks: 0, visits: 0, leads: 0, conversions: 0, failed: 0 };
    const waMetrics = { sent: 0, delivered: 0, read: 0, clicks: 0, visits: 0, leads: 0, conversions: 0, failed: 0 };

    const addChannelTelemetry = (target, s) => {
      target.sent += Number(s.messages_sent || 0);
      target.delivered += Number(s.delivered || 0);
      target.read += Number(s.opened_or_read || 0);
      target.clicks += Number(s.link_clicks || 0);
      target.visits += Number(s.website_visits || 0);
      target.leads += Number(s.form_submissions || 0);
      target.conversions += Number(s.conversions || 0);
      target.failed += Number(s.failed || 0);
    };

    for (const c of campaigns) {
      const s = c.stats || {};
      const ds = c.delivery_summary || {};
      totalSent += Number(s.messages_sent || 0);
      totalDelivered += Number(s.delivered || 0);
      totalRead += Number(s.opened_or_read || 0);
      totalClicks += Number(s.link_clicks || 0);
      totalVisits += Number(s.website_visits || 0);
      totalLeads += Number(s.form_submissions || 0);
      totalQualified += Number(s.qualified_leads || 0);
      totalConversions += Number(s.conversions || 0);
      totalRevenue += Number(s.revenue_generated || 0);
      totalCost += Number(c.actual_spent || c.budget || 0);
      totalFailed += Number(s.failed || 0);

      if (c.campaign_type === 'email') {
        addChannelTelemetry(emailMetrics, s);
      } else if (c.campaign_type === 'whatsapp') {
        addChannelTelemetry(waMetrics, s);
      } else {
        emailMetrics.sent += Number(ds.email_sent || 0);
        emailMetrics.failed += Number(ds.email_failed || 0);
        waMetrics.sent += Number(ds.wa_sent || 0);
        waMetrics.failed += Number(ds.wa_failed || 0);
        const recips = Array.isArray(c.recipients) ? c.recipients : [];
        for (const r of recips) {
          const isDeliv = ['sent', 'delivered', 'read', 'opened', 'clicked', 'visited', 'submitted_form', 'converted'].includes(r.status) || Boolean(r.delivered_at);
          const isRead = ['read', 'opened', 'clicked', 'visited', 'submitted_form', 'converted'].includes(r.status) || Boolean(r.read_at);
          const isClick = ['clicked', 'visited', 'submitted_form', 'converted'].includes(r.status) || Boolean(r.clicked_at);
          const isVisit = ['visited', 'submitted_form', 'converted'].includes(r.status) || Boolean(r.visited_at);
          const isLead = ['submitted_form', 'converted'].includes(r.status);
          const isConv = r.status === 'converted' || Boolean(r.converted_at);
          const applyRecip = (m) => {
            if (isDeliv) m.delivered += 1;
            if (isRead) m.read += 1;
            if (isClick) m.clicks += 1;
            if (isVisit) m.visits += 1;
            if (isLead) m.leads += 1;
            if (isConv) m.conversions += 1;
          };
          if (r.email_message_id || r.channel === 'email' || r.channel === 'both') applyRecip(emailMetrics);
          if (r.wa_message_id || r.channel === 'whatsapp' || r.channel === 'both') applyRecip(waMetrics);
        }
      }
    }

    const deliveryRate = totalSent > 0 ? (((totalSent - totalFailed) / totalSent) * 100).toFixed(1) : '0.0';
    const clickRate = totalSent > 0 ? ((totalClicks / totalSent) * 100).toFixed(1) : '0.0';
    const leadConversionRate = totalVisits > 0 ? ((totalLeads / totalVisits) * 100).toFixed(1) : '0.0';
    const qualifiedLeadRate = totalLeads > 0 ? ((totalQualified / totalLeads) * 100).toFixed(1) : '0.0';
    const salesConversionRate = totalQualified > 0 ? ((totalConversions / totalQualified) * 100).toFixed(1) : '0.0';
    const roi = totalCost > 0 ? (((totalRevenue - totalCost) / totalCost) * 100).toFixed(1) : '0.0';

    const campaignsRanking = campaigns
      .map((c) => {
        const s = c.stats || {};
        const sent = Number(s.messages_sent || 0);
        const del = Number(s.delivered || sent);
        const delRate = sent > 0 ? ((del / sent) * 100).toFixed(1) : '0.0';
        const convRate = s.website_visits > 0 ? ((s.conversions / s.website_visits) * 100).toFixed(1) : '0.0';
        const rev = Number(s.revenue_generated || 0);
        const spend = Number(c.actual_spent || c.budget || 0);
        const roiVal = spend > 0 ? (((rev - spend) / spend) * 100).toFixed(1) : '0.0';

        return {
          _id: c._id,
          name: c.campaign_name,
          code: c.campaign_code,
          channel: c.campaign_type,
          objective: c.campaign_objective,
          status: c.status,
          sent,
          delivered: del,
          failed: Number(s.failed || 0),
          clicks: Number(s.link_clicks || 0),
          leads: Number(s.form_submissions || 0),
          conversions: Number(s.conversions || 0),
          revenue: rev,
          conversionRate: `${convRate}%`,
          deliveryRate: `${delRate}%`,
          roi: `${roiVal}%`
        };
      })
      .sort((a, b) => (b.revenue || b.sent || 0) - (a.revenue || a.sent || 0))
      .map((item, idx) => ({ ...item, rank: idx + 1 }));

    const couponsList = offers.map((o) => {
      const linkedCampaigns = campaigns.filter((c) => c.coupon_code && o.coupon_code && c.coupon_code === o.coupon_code);
      const conversions = linkedCampaigns.reduce((acc, c) => acc + (c.stats?.conversions || 0), 0);
      const rev = linkedCampaigns.reduce((acc, c) => acc + (c.stats?.revenue_generated || 0), 0);
      return {
        _id: o._id,
        code: o.coupon_code || o.offer_name,
        title: o.offer_name,
        discount: o.discount_type === 'percent' ? `${o.discount_value}% Off` : `₹${Number(o.discount_value || 0).toLocaleString('en-IN')} Flat`,
        type: o.discount_type,
        value: o.discount_value,
        applicableKits: (o.products_applicable || []).map((k) => k.name).filter(Boolean).join(', ') || 'All Solar Kits',
        redemptionsCount: conversions,
        uniqueEpcsRedeemed: conversions,
        revenueGenerated: rev,
        start_date: o.start_date,
        end_date: o.end_date,
        status: o.is_active ? 'Active' : 'Paused'
      };
    });

    const buyerIdSet = new Set();
    const buyerPhoneSet = new Set();
    const orderCountMap = new Map();
    const orderRevenueMap = new Map();
    for (const o of orders) {
      const revInr = Number(o.grand_total_paise || 0) / 100;
      if (o.epc_id) {
        const sid = String(o.epc_id);
        buyerIdSet.add(sid);
        orderCountMap.set(sid, (orderCountMap.get(sid) || 0) + 1);
        orderRevenueMap.set(sid, (orderRevenueMap.get(sid) || 0) + revInr);
      }
      if (o.customer_phone) {
        const p10 = String(o.customer_phone).replace(/\D/g, '').slice(-10);
        if (p10) {
          buyerPhoneSet.add(p10);
          orderCountMap.set(p10, (orderCountMap.get(p10) || 0) + 1);
          orderRevenueMap.set(p10, (orderRevenueMap.get(p10) || 0) + revInr);
        }
      }
    }

    const territoryClusterBuckets = new Map();
    for (const clu of geoResolver.franchiseeClusters || []) {
      const cluKey = clu.cluster_code || String(clu._id);
      territoryClusterBuckets.set(cluKey, {
        cluster: clu.cluster_name,
        cluster_code: clu.cluster_code,
        state: clu.state_name,
        warehouse: `${clu.cluster_name} (${(clu.district_names || []).slice(0, 3).join(', ')})`,
        totalEpcs: 0,
        buyerEpcs: 0,
        verifiedEpcs: 0,
        registeredEpcs: 0,
        ordersPlaced: 0,
        revenueInr: 0
      });
    }

    const seenPartners = new Map();
    for (const epc of epcs) {
      const p10 = String(epc.whatsapp || '').replace(/\D/g, '').slice(-10);
      const em = String(epc.email || '').toLowerCase().trim();
      const key = p10 || em || String(epc._id);
      if (seenPartners.has(key)) continue;
      const eid = String(epc._id);
      const ordCount = orderCountMap.get(eid) || orderCountMap.get(p10) || 0;
      const ordRev = orderRevenueMap.get(eid) || orderRevenueMap.get(p10) || 0;
      const isBuyer = buyerIdSet.has(eid) || (p10 && buyerPhoneSet.has(p10));
      const isVerified = ['verified_automatic', 'verified_admin'].includes(epc.gst_verification_status) || epc.is_gstin_active === true || Boolean(epc.gstin);
      let dName = epc.district_name || '';
      let sName = epc.state_name || '';
      if (!dName && epc.districts?.[0]) dName = geoResolver.districtById.get(String(epc.districts[0]))?.name || '';
      if (!sName && epc.states?.[0]) sName = geoResolver.stateById.get(String(epc.states[0]))?.name || '';
      seenPartners.set(key, {
        state: sName || 'Unassigned',
        district: dName || 'Unassigned',
        orders: ordCount,
        revenueInr: ordRev,
        type: classifyEpcPartner({ gstin: epc.gstin, lifetimeOrders: ordCount, is_buyer: isBuyer, is_verified: isVerified })
      });
    }
    for (const lead of leads) {
      const p10 = String(lead.phone || lead.mobile_number || '').replace(/\D/g, '').slice(-10);
      const em = String(lead.email || '').toLowerCase().trim();
      const key = p10 || em || String(lead._id);
      if (seenPartners.has(key)) continue;
      const ordCount = Number(lead.lifetime_orders || 0) || orderCountMap.get(p10) || 0;
      const ordRev = orderRevenueMap.get(p10) || 0;
      seenPartners.set(key, {
        state: lead.state_name || 'Unassigned',
        district: lead.district_name || 'Unassigned',
        orders: ordCount,
        revenueInr: ordRev,
        type: classifyEpcPartner({ gstin: lead.gst_number, lifetimeOrders: ordCount })
      });
    }

    const partners = Array.from(seenPartners.values());
    const buyerEpcs = partners.filter((p) => p.type === 'Buyer EPC').length;
    const verifiedEpcs = partners.filter((p) => p.type === 'Verified EPC').length;
    const registeredEpcs = partners.filter((p) => p.type === 'Registered EPC').length;

    for (const p of partners) {
      const resolved = geoResolver.resolve({ stateName: p.state === 'Unassigned' ? '' : p.state, districtName: p.district === 'Unassigned' ? '' : p.district });
      const bKey = resolved.cluster_code || (resolved.state ? `UNCLU::${resolved.state}` : 'UNSPECIFIED');
      if (!territoryClusterBuckets.has(bKey)) {
        territoryClusterBuckets.set(bKey, {
          cluster: resolved.cluster_name || (resolved.state ? `${resolved.state} (Other Districts)` : 'Unspecified'),
          cluster_code: resolved.cluster_code || '',
          state: resolved.state || 'Unspecified',
          warehouse: resolved.state || 'Direct Region',
          totalEpcs: 0,
          buyerEpcs: 0,
          verifiedEpcs: 0,
          registeredEpcs: 0,
          ordersPlaced: 0,
          revenueInr: 0
        });
      }
      const b = territoryClusterBuckets.get(bKey);
      b.totalEpcs += 1;
      if (p.type === 'Buyer EPC') b.buyerEpcs += 1;
      else if (p.type === 'Verified EPC') b.verifiedEpcs += 1;
      else b.registeredEpcs += 1;
      b.ordersPlaced += p.orders;
      b.revenueInr += p.revenueInr || 0;
    }

    const epcTerritoryPerformance = Array.from(territoryClusterBuckets.values())
      .filter((b) => b.totalEpcs > 0 || b.ordersPlaced > 0)
      .map((b) => {
        const convPct = b.totalEpcs > 0 ? ((b.buyerEpcs / b.totalEpcs) * 100).toFixed(1) : '0.0';
        let dominantType = 'Registered EPC';
        if (b.buyerEpcs >= b.verifiedEpcs && b.buyerEpcs >= b.registeredEpcs && b.buyerEpcs > 0) dominantType = 'Buyer EPC';
        else if (b.verifiedEpcs >= b.registeredEpcs && b.verifiedEpcs > 0) dominantType = 'Verified EPC';
        return {
          ...b,
          revenueInr: Math.round(b.revenueInr),
          conversionRatio: `${convPct}%`,
          dominantType
        };
      })
      .sort((a, b) => b.totalEpcs - a.totalEpcs || b.ordersPlaced - a.ordersPlaced);

    const activeStatesSet = new Set(partners.map((p) => p.state).filter((s) => s && s !== 'Unassigned' && s !== 'Unspecified'));

    res.json({
      success: true,
      data: {
        summary: {
          totalCampaigns,
          activeCampaigns,
          successfulCampaignsCount: completedCampaigns,
          totalSent,
          totalDelivered,
          totalFailed,
          totalRead,
          totalClicks,
          totalVisits,
          totalLeads,
          totalQualified,
          totalConversions,
          totalRevenue: Math.round(totalRevenue),
          totalCost: Math.round(totalCost),
          deliveryRate,
          clickRate,
          leadConversionRate,
          qualifiedLeadRate,
          salesConversionRate,
          roi,
          totalEpcs: partners.length,
          buyerEpcs,
          verifiedEpcs,
          registeredEpcs,
          activeCouponsCount: couponsList.filter((c) => c.status === 'Active').length,
          totalCouponsCount: couponsList.length,
          activeClustersCount: (geoResolver.franchiseeClusters || []).length || epcTerritoryPerformance.length,
          activeStatesCount: activeStatesSet.size,
          segmentGroupsCount: segmentAnalytics?.summary?.total_segments || 0,
          segmentLeadsUploaded: segmentAnalytics?.summary?.total_leads_uploaded || 0,
          segmentRegistered: segmentAnalytics?.summary?.total_registered || 0,
          segmentVerified: segmentAnalytics?.summary?.total_verified || 0,
          segmentBuyers: segmentAnalytics?.summary?.total_buyers || 0,
          segmentRevenueInr: segmentAnalytics?.summary?.total_revenue_inr || 0
        },
        channels: {
          email: emailMetrics,
          whatsapp: waMetrics
        },
        funnel: [
          { stage: '1. Messages Sent', count: totalSent, desc: 'Emails & WhatsApp dispatched via configured providers' },
          { stage: '2. Messages Failed', count: totalFailed, desc: 'Bounces, credential or provider errors logged' },
          { stage: '3. Tracking Clicks', count: totalClicks, desc: 'Clicks captured through /api/marketing/t short links' },
          { stage: '4. Website Visits', count: totalVisits, desc: 'Attributed campaign landing sessions' },
          { stage: '5. Form Submissions', count: totalLeads, desc: 'Enquiries & bulk kit requests attributed' },
          { stage: '6. Confirmed Conversions', count: totalConversions, desc: 'Paid Kit orders attributed to campaigns' }
        ],
        campaignsRanking,
        couponsList,
        epcTerritoryPerformance,
        segmentAnalytics
      }
    });
  } catch (error) {
    console.error('❌ [Marketing] getDashboardAnalytics error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ── 1B. Live India Territory Map Analytics (100% Dynamic from MongoDB) ───
const getTerritoryMapAnalytics = async (req, res) => {
  try {
    const { type, objective, state: filterState, segment_id } = req.query;

    const campQuery = {};
    if (type && type !== 'ALL' && type !== 'all') campQuery.campaign_type = type;
    if (objective && objective !== 'ALL' && objective !== 'all') {
      campQuery.$or = [{ campaign_objective: objective }, { purpose: objective }];
    }

    const [geoResolver, campaigns, segmentAnalytics, epcs] = await Promise.all([
      buildGeoAndClusterResolver(),
      MarketingCampaign.find(campQuery)
        .select('_id campaign_name campaign_code campaign_type campaign_objective purpose status area_type state_ids state_names cluster_ids cluster_names district_ids segment_ids segment_state_filter stats created_at')
        .sort({ created_at: -1 })
        .lean(),
      computeDynamicSegmentAnalytics({ state: filterState || '', segment_id: segment_id || '' }),
      EpcAccount.find({ deleted_at: null }).select('state_name states').lean().catch(() => [])
    ]);

    const stateCampaignData = {};
    const ensureState = (stateName, stateId = null) => {
      const clean = String(stateName || '').trim();
      if (!clean || clean === 'Unspecified') return null;
      const keyTok = cleanStateToken(clean);
      let existingKey = Object.keys(stateCampaignData).find((k) => cleanStateToken(k) === keyTok);
      if (!existingKey) {
        existingKey = clean;
        stateCampaignData[existingKey] = {
          state_name: existingKey,
          state_id: stateId || null,
          state_code: STATE_CODE_MAP[existingKey] || existingKey.slice(0, 2).toUpperCase(),
          epc_count: 0,
          has_active: false,
          campaign_count: 0,
          campaign_type: 'none',
          channels: [],
          delivered: 0,
          leads: 0,
          conversions: 0,
          revenue: 0,
          clusters: [],
          cluster_details: [],
          running_campaigns: [],
          segment_leads_uploaded: 0,
          segment_registered: 0,
          segment_verified: 0,
          segment_buyers: 0,
          segment_orders: 0,
          segment_revenue_inr: 0,
          segment_conversion_rate_pct: 0,
          post_campaign_conversions: 0,
          post_campaign_revenue_inr: 0,
          segments: []
        };
      } else if (stateId && !stateCampaignData[existingKey].state_id) {
        stateCampaignData[existingKey].state_id = stateId;
      }
      return stateCampaignData[existingKey];
    };

    for (const s of geoResolver.states || []) {
      if (filterState && filterState !== 'ALL' && cleanStateToken(s.name) !== cleanStateToken(filterState)) continue;
      ensureState(s.name, s._id);
    }

    for (const epc of epcs) {
      let sName = epc.state_name || '';
      if (!sName && epc.states?.[0]) {
        sName = geoResolver.stateById.get(String(epc.states[0]))?.name || '';
      }
      if (!sName) continue;
      const stObj = ensureState(sName);
      if (stObj) stObj.epc_count += 1;
    }

    for (const clu of geoResolver.franchiseeClusters || []) {
      const stObj = ensureState(clu.state_name, clu.state_id);
      if (!stObj) continue;
      if (!stObj.clusters.includes(clu.cluster_name)) {
        stObj.clusters.push(clu.cluster_name);
      }
      stObj.cluster_details.push({
        cluster_id: clu._id,
        cluster_name: clu.cluster_name,
        cluster_code: clu.cluster_code,
        color_code: clu.color_code || '#2563eb',
        status: clu.status || 'available',
        districts: clu.district_names || [],
        leads_uploaded: 0,
        registered_count: 0,
        verified_count: 0,
        buyers_count: 0,
        post_campaign_conversions: 0
      });
    }

    const segByStateToken = new Map(
      (segmentAnalytics.map_territory?.states || []).map((st) => [cleanStateToken(st.state_name), st])
    );

    Object.values(stateCampaignData).forEach((stObj) => {
      const segSt = segByStateToken.get(cleanStateToken(stObj.state_name));
      if (!segSt) return;
      stObj.segment_leads_uploaded = segSt.leads_uploaded;
      stObj.segment_registered = segSt.registered_count;
      stObj.segment_verified = segSt.verified_count;
      stObj.segment_buyers = segSt.buyers_count;
      stObj.segment_orders = segSt.orders_count;
      stObj.segment_revenue_inr = segSt.revenue_inr;
      stObj.segment_conversion_rate_pct = segSt.registration_rate_pct;
      stObj.post_campaign_conversions = segSt.post_campaign_conversions;
      stObj.post_campaign_revenue_inr = segSt.post_campaign_revenue_inr;
      stObj.segments = segSt.segments || [];

      if (segSt.leads_uploaded > 0 || segSt.post_campaign_conversions > 0) {
        stObj.has_active = true;
      }

      const segCluMap = new Map((segSt.clusters || []).map((c) => [c.cluster_code || c.cluster_name, c]));
      stObj.cluster_details = stObj.cluster_details.map((cd) => {
        const sc = segCluMap.get(cd.cluster_code) || segCluMap.get(cd.cluster_name);
        if (!sc) return cd;
        return {
          ...cd,
          leads_uploaded: sc.leads_uploaded,
          registered_count: sc.registered_count,
          verified_count: sc.verified_count,
          buyers_count: sc.buyers_count,
          orders_count: sc.orders_count,
          revenue_inr: sc.revenue_inr,
          post_campaign_conversions: sc.post_campaign_conversions,
          district_breakdown: sc.districts || []
        };
      });
    });

    const segStatesLookup = new Map();
    for (const seg of segmentAnalytics.segments || []) {
      const stNames = (seg.state_breakdown || []).map((sb) => sb.state).filter((s) => s && s !== 'Unspecified');
      segStatesLookup.set(String(seg._id), stNames);
    }

    const chanSets = new Map();
    for (const c of campaigns) {
      const targetStateNames = new Set();
      for (const sid of c.state_ids || []) {
        const sDoc = geoResolver.stateById.get(String(sid));
        if (sDoc?.name) targetStateNames.add(sDoc.name);
      }
      for (const sn of c.state_names || []) {
        const resSt = geoResolver.resolve({ stateName: sn });
        if (resSt.state) targetStateNames.add(resSt.state);
      }
      for (const did of c.district_ids || []) {
        const dDoc = geoResolver.districtById.get(String(did));
        const sDoc = dDoc ? geoResolver.stateById.get(String(dDoc.level_1)) : null;
        if (sDoc?.name) targetStateNames.add(sDoc.name);
      }
      if (c.segment_state_filter) {
        const resSt = geoResolver.resolve({ stateName: c.segment_state_filter });
        if (resSt.state) targetStateNames.add(resSt.state);
      }
      for (const segId of c.segment_ids || []) {
        const stList = segStatesLookup.get(String(segId)) || [];
        for (const sName of stList) targetStateNames.add(sName);
      }
      if (targetStateNames.size === 0 && c.area_type === 'all_india' && ['running', 'scheduled', 'completed'].includes(c.status)) {
        Object.keys(stateCampaignData).forEach((sName) => {
          if (stateCampaignData[sName].cluster_details.length > 0 || stateCampaignData[sName].segment_leads_uploaded > 0) {
            targetStateNames.add(sName);
          }
        });
      }

      const s = c.stats || {};
      const divisor = Math.max(1, targetStateNames.size);
      for (const sName of targetStateNames) {
        const stObj = ensureState(sName);
        if (!stObj) continue;
        if (['running', 'scheduled', 'completed'].includes(c.status)) {
          stObj.has_active = true;
        }
        stObj.campaign_count += 1;
        stObj.delivered += Math.round(Number(s.delivered || s.messages_sent || 0) / divisor);
        stObj.leads += Math.round(Number(s.form_submissions || 0) / divisor);
        stObj.conversions += Math.round(Number(s.conversions || 0) / divisor);
        stObj.revenue += Math.round(Number(s.revenue_generated || 0) / divisor);

        if (!chanSets.has(stObj.state_name)) chanSets.set(stObj.state_name, new Set());
        const cs = chanSets.get(stObj.state_name);
        if (c.campaign_type === 'both') {
          cs.add('whatsapp');
          cs.add('email');
        } else if (c.campaign_type) {
          cs.add(c.campaign_type);
        }

        stObj.running_campaigns.push({
          _id: c._id,
          name: c.campaign_name,
          code: c.campaign_code,
          type: c.campaign_type,
          objective: c.campaign_objective || c.purpose,
          status: c.status,
          delivered: Number(s.delivered || s.messages_sent || 0),
          leads: Number(s.form_submissions || 0),
          conversions: Number(s.conversions || 0),
          revenue: Number(s.revenue_generated || 0)
        });
      }
    }

    let totalLiveStates = 0;
    let totalLiveClusters = 0;
    let totalTerritoryDelivered = 0;
    let totalTerritoryLeads = 0;
    let totalTerritoryConversions = 0;
    let totalTerritoryRevenue = 0;

    Object.values(stateCampaignData).forEach((st) => {
      const ch = Array.from(chanSets.get(st.state_name) || []);
      st.channels = ch;
      if (ch.includes('whatsapp') && ch.includes('email')) st.campaign_type = 'both';
      else if (ch.length === 1) st.campaign_type = ch[0];
      else st.campaign_type = st.has_active ? 'segment_only' : 'none';

      if (st.has_active || st.clusters.length > 0) {
        if (st.has_active) totalLiveStates += 1;
        totalLiveClusters += st.clusters.length;
        totalTerritoryDelivered += st.delivered;
        totalTerritoryLeads += st.leads;
        totalTerritoryConversions += st.conversions;
        totalTerritoryRevenue += st.revenue;
      }
    });

    res.json({
      success: true,
      data: {
        summary: {
          total_live_states: totalLiveStates,
          total_live_clusters: totalLiveClusters,
          total_territory_delivered: totalTerritoryDelivered,
          total_territory_leads: totalTerritoryLeads,
          total_territory_conversions: totalTerritoryConversions,
          total_territory_revenue: Math.round(totalTerritoryRevenue),
          total_segment_leads: segmentAnalytics.summary.total_leads_uploaded,
          total_segment_registered: segmentAnalytics.summary.total_registered,
          total_segment_verified: segmentAnalytics.summary.total_verified,
          total_segment_buyers: segmentAnalytics.summary.total_buyers,
          total_segment_orders: segmentAnalytics.summary.total_orders,
          total_segment_revenue_inr: segmentAnalytics.summary.total_revenue_inr,
          total_post_campaign_conversions: segmentAnalytics.summary.post_campaign_registered + segmentAnalytics.summary.post_campaign_buyers
        },
        states: stateCampaignData,
        districts_lookup: segmentAnalytics.map_territory?.districts || [],
        segment_analytics_summary: segmentAnalytics.summary
      }
    });
  } catch (error) {
    console.error('❌ [Marketing] getTerritoryMapAnalytics error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ── 2. Campaigns CRUD & Lifecycle ──────────────────────────────────────────
const getCampaigns = async (req, res) => {
  try {
    const { type, objective, status, manager } = req.query;
    const filter = {};
    if (type) filter.campaign_type = type;
    if (objective) filter.campaign_objective = objective;
    if (status) filter.status = status;
    if (manager) filter.assigned_manager = manager;

    const campaigns = await MarketingCampaign.find(filter)
      .select('-recipients')
      .populate('assigned_manager', 'name email phone')
      .populate('email_sender_id', 'name sender_email email_provider status')
      .populate('whatsapp_sender_id', 'name wa_business_name wa_number status')
      .populate('email_template_id', 'name subject')
      .populate('whatsapp_template_id', 'name wa_template_name wa_status')
      .sort({ created_at: -1 })
      .lean();

    res.json({ success: true, count: campaigns.length, data: campaigns });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const getCampaignById = async (req, res) => {
  try {
    const campaign = await MarketingCampaign.findById(req.params.id)
      .populate('assigned_manager', 'name email phone')
      .populate('email_sender_id', 'name sender_name sender_email email_provider status')
      .populate('whatsapp_sender_id', 'name wa_business_name wa_number status')
      .populate('email_template_id')
      .populate('whatsapp_template_id');

    if (!campaign) {
      return res.status(404).json({ success: false, message: 'Campaign not found' });
    }
    res.json({ success: true, data: campaign });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const createCampaign = async (req, res) => {
  try {
    const { launch_immediately, ...data } = req.body;
    if (req.user?.id && mongoose.Types.ObjectId.isValid(String(req.user.id))) {
      data.created_by = req.user.id;
    }

    if (data.campaign_type) {
      data.campaign_type = String(data.campaign_type).toLowerCase();
    }

    // Check custom short code uniqueness if provided
    if (data.tracking_short_code) {
      const conflict = await MarketingCampaign.findOne({ tracking_short_code: data.tracking_short_code }).lean();
      if (conflict) {
        return res.status(400).json({ success: false, message: `Tracking short code "${data.tracking_short_code}" is already used by another campaign.` });
      }
    }

    // Auto-resolve EPC + Leads + isolated Segment Group audience with channel consent & industry preferences
    const audience = await audienceService.resolveAudience({
      segment_id: data.segment_id || null,
      epc_groups: data.epc_groups,
      exclude_groups: data.exclude_groups,
      epc_types: data.epc_types,
      area_type: data.area_type,
      state_ids: data.state_ids,
      state_names: data.state_names,
      cluster_ids: data.cluster_ids,
      cluster_names: data.cluster_names,
      district_ids: data.district_ids,
      warehouse_ids: data.warehouse_ids,
      purchase_activity: data.purchase_activity,
      last_order_days: data.last_order_days,
      segment_ids: data.segment_ids || [],
      segment_state_filter: data.segment_state_filter || '',
      segment_district_filter: data.segment_district_filter || '',
      channel: data.campaign_type || null,
      industry_ids: data.industry_ids || [],
      kit_ids: data.kit_ids || [],
      subcategory_ids: data.subcategory_ids || [],
      include_imported_leads: data.include_imported_leads !== false,
      require_consent: data.require_consent !== false
    });

    data.total_recipients = audience.total_eligible;
    data.recipients = audience.recipients.map((r) => ({
      epc_id: r.epc_id || null,
      lead_id: r.lead_id || null,
      segment_id: r.segment_id || null,
      segment_contact_id: r.segment_contact_id || null,
      custom_fields: r.custom_fields || {},
      source_type: r.source_type || 'epc_account',
      name: r.name,
      phone: r.phone,
      email: r.email,
      channel: data.campaign_type || 'both',
      status: 'queued'
    }));

    const campaign = await MarketingCampaign.create(data);

    // Ensure tracking_full_url uses campaign code + UTM parameters
    if (!campaign.tracking_full_url) {
      campaign.tracking_full_url = campaignService.buildUtmDestinationUrl(campaign);
      await campaign.save();
    }

    let launchResult = null;
    if (launch_immediately === true) {
      launchResult = await campaignService.launchCampaign(campaign._id);
    }

    const fresh = await MarketingCampaign.findById(campaign._id).select('-recipients').lean();
    res.status(201).json({
      success: true,
      data: fresh,
      launchResult,
      audienceSummary: {
        total_eligible: audience.total_eligible,
        total_excluded: audience.total_excluded,
        consent_breakdown: audience.consent_breakdown
      }
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

const updateCampaign = async (req, res) => {
  try {
    const campaign = await MarketingCampaign.findById(req.params.id);
    if (!campaign) {
      return res.status(404).json({ success: false, message: 'Campaign not found' });
    }
    if (campaign.status === 'running') {
      return res.status(400).json({ success: false, message: 'Cannot edit a running campaign. Pause it first.' });
    }

    Object.assign(campaign, req.body);

    // Recompute audience if targeting criteria updated and campaign has not finished sending
    if (['draft', 'scheduled'].includes(campaign.status) && req.body.refresh_audience !== false) {
      const audience = await audienceService.resolveAudience({
        segment_id: campaign.segment_id || null,
        epc_groups: campaign.epc_groups,
        exclude_groups: campaign.exclude_groups,
        epc_types: campaign.epc_types,
        area_type: campaign.area_type,
        state_ids: campaign.state_ids,
        state_names: campaign.state_names,
        cluster_ids: campaign.cluster_ids,
        cluster_names: campaign.cluster_names,
        district_ids: campaign.district_ids,
        warehouse_ids: campaign.warehouse_ids,
        purchase_activity: campaign.purchase_activity,
        last_order_days: campaign.last_order_days,
        channel: campaign.campaign_type,
        industry_ids: campaign.industry_ids || [],
        kit_ids: campaign.kit_ids || [],
        subcategory_ids: campaign.subcategory_ids || [],
        include_imported_leads: campaign.include_imported_leads !== false,
        require_consent: campaign.require_consent !== false
      });

      campaign.total_recipients = audience.total_eligible;
      campaign.recipients = audience.recipients.map((r) => ({
        epc_id: r.epc_id || null,
        lead_id: r.lead_id || null,
        source_type: r.source_type || 'epc_account',
        name: r.name,
        phone: r.phone,
        email: r.email,
        channel: campaign.campaign_type || 'both',
        status: 'queued'
      }));
    }

    await campaign.save();
    res.json({ success: true, data: campaign });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

const deleteCampaign = async (req, res) => {
  try {
    const campaign = await MarketingCampaign.findById(req.params.id);
    if (!campaign) {
      return res.status(404).json({ success: false, message: 'Campaign not found' });
    }
    if (campaign.status === 'running') {
      return res.status(400).json({ success: false, message: 'Cannot delete a running campaign. Pause or cancel it first.' });
    }

    emailQueueService.clearCampaignJobs(campaign._id);
    await MarketingCampaign.deleteOne({ _id: campaign._id });
    res.json({ success: true, message: 'Campaign deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const triggerLaunchCampaign = async (req, res) => {
  try {
    const result = await campaignService.launchCampaign(req.params.id);
    res.json(result);
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

const pauseCampaign = async (req, res) => {
  try {
    const campaign = await MarketingCampaign.findOneAndUpdate(
      { _id: req.params.id, status: { $in: ['running', 'scheduled'] } },
      { $set: { status: 'paused', paused_at: new Date() } },
      { new: true }
    ).select('-recipients');
    if (!campaign) {
      return res.status(400).json({ success: false, message: 'Only running or scheduled campaigns can be paused.' });
    }
    emailQueueService.clearCampaignJobs(campaign._id);
    res.json({ success: true, message: 'Campaign paused', data: campaign });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

const cancelCampaign = async (req, res) => {
  try {
    const campaign = await MarketingCampaign.findOneAndUpdate(
      { _id: req.params.id, status: { $in: ['draft', 'scheduled', 'running', 'paused'] } },
      { $set: { status: 'cancelled', cancelled_at: new Date(), end_date: new Date() } },
      { new: true }
    ).select('-recipients');
    if (!campaign) {
      return res.status(400).json({ success: false, message: 'Campaign cannot be cancelled (already completed or cancelled).' });
    }
    emailQueueService.clearCampaignJobs(campaign._id);
    res.json({ success: true, message: 'Campaign cancelled', data: campaign });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

const testCampaignSend = async (req, res) => {
  try {
    const {
      channel = 'email',
      email_sender_id,
      whatsapp_sender_id,
      email_template_id,
      whatsapp_template_id,
      test_email,
      test_phone,
      subject,
      html_content,
      whatsapp_body,
      variables = {}
    } = req.body;

    const results = {};

    if ((channel === 'email' || channel === 'both') && test_email) {
      let tmpl = null;
      if (email_template_id && mongoose.Types.ObjectId.isValid(email_template_id)) {
        tmpl = await MarketingTemplate.findById(email_template_id).lean();
      }
      const backendBase = campaignService.resolveBackendBaseUrl();
      const unsubUrl = `${backendBase}/api/marketing/unsubscribe?email=${encodeURIComponent(test_email)}`;
      results.email = await emailService.sendEmail({
        senderId: email_sender_id || null,
        purpose: 'marketing',
        to: test_email,
        subject: subject || tmpl?.subject || 'SolarKits Campaign Preview Test',
        htmlContent: html_content || tmpl?.html_content || '<p>Test campaign preview email from SolarKits Marketing.</p>',
        variables: {
          ...variables,
          unsubscribe_url: unsubUrl
        },
        unsubscribeUrl: unsubUrl,
        allowInactiveSender: true,
        sourceType: 'campaign_test',
        templateId: tmpl?._id || null
      });
    }

    if ((channel === 'whatsapp' || channel === 'both') && test_phone) {
      let waTmpl = null;
      if (whatsapp_template_id && mongoose.Types.ObjectId.isValid(whatsapp_template_id)) {
        waTmpl = await MarketingTemplate.findById(whatsapp_template_id).lean();
      }
      if (waTmpl?.wa_template_name) {
        results.whatsapp = await whatsappService.sendTemplateMessage({
          senderId: whatsapp_sender_id || null,
          to: test_phone,
          templateName: waTmpl.wa_template_name,
          language: waTmpl.language || 'en',
          components: [],
          allowInactiveSender: true,
          sourceType: 'campaign_test',
          templateId: waTmpl._id
        });
      } else {
        results.whatsapp = await whatsappService.sendTextMessage({
          senderId: whatsapp_sender_id || null,
          to: test_phone,
          text: emailService.interpolate(whatsapp_body || waTmpl?.body_text || 'SolarKits Campaign WhatsApp Preview Test', variables),
          allowInactiveSender: true,
          sourceType: 'campaign_test'
        });
      }
    }

    if (!results.email && !results.whatsapp) {
      return res.status(400).json({ success: false, message: 'Provide test_email or test_phone for the selected channel.' });
    }

    const emailOk = !results.email || results.email.success;
    const waOk = !results.whatsapp || results.whatsapp.success;
    res.json({
      success: emailOk && waOk,
      results
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const getCampaignLogs = async (req, res) => {
  try {
    const [campaign, logs] = await Promise.all([
      MarketingCampaign.findById(req.params.id)
        .select('campaign_name campaign_code campaign_type status stats delivery_summary last_error total_recipients recipients')
        .lean(),
      MarketingDeliveryLog.find({ campaign_id: req.params.id })
        .sort({ dispatched_at: -1 })
        .limit(200)
        .lean()
    ]);

    if (!campaign) {
      return res.status(404).json({ success: false, message: 'Campaign not found' });
    }

    res.json({
      success: true,
      data: {
        campaign: {
          _id: campaign._id,
          campaign_name: campaign.campaign_name,
          campaign_code: campaign.campaign_code,
          status: campaign.status,
          stats: campaign.stats,
          delivery_summary: campaign.delivery_summary,
          last_error: campaign.last_error,
          total_recipients: campaign.total_recipients
        },
        recipients: (campaign.recipients || []).slice(0, 200),
        deliveryLogs: logs
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const getDeliveryLogs = async (req, res) => {
  try {
    const { campaign_id, sender_id, channel, status, limit = 100 } = req.query;
    const filter = {};
    if (campaign_id && mongoose.Types.ObjectId.isValid(campaign_id)) filter.campaign_id = campaign_id;
    if (sender_id && mongoose.Types.ObjectId.isValid(sender_id)) filter.sender_id = sender_id;
    if (channel) filter.channel = channel;
    if (status) filter.status = status;

    const logs = await MarketingDeliveryLog.find(filter)
      .populate('campaign_id', 'campaign_name campaign_code')
      .populate('sender_id', 'name sender_email wa_number')
      .sort({ dispatched_at: -1 })
      .limit(Math.min(500, parseInt(limit, 10) || 100))
      .lean();

    res.json({ success: true, count: logs.length, data: logs });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ── 3. Live Audience Preview ───────────────────────────────────────────────
const previewAudience = async (req, res) => {
  try {
    const result = await audienceService.resolveAudience(req.body);
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ── 4. Senders (Email & WhatsApp Accounts — Encrypted & Masked) ────────────
const prepareSenderPayload = (rawBody, isUpdate = false) => {
  const data = { ...rawBody };
  for (const field of SENDER_SECRET_FIELDS) {
    if (!(field in data)) continue;
    const val = data[field];
    if (isUpdate && isMaskedSecret(val)) {
      delete data[field];
      continue;
    }
    if (val === '' || val === null || val === undefined) {
      if (isUpdate) delete data[field];
      continue;
    }
    data[field] = encryptSecret(val);
  }
  return data;
};

const getSenders = async (req, res) => {
  try {
    const { type } = req.query;
    const filter = {};
    if (type) filter.type = type;
    const senders = await MarketingSender.find(filter).sort({ is_default: -1, created_at: -1 }).lean();
    res.json({ success: true, data: senders.map(sanitizeSenderForClient) });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const createSender = async (req, res) => {
  try {
    const data = prepareSenderPayload(req.body, false);
    if (req.user?.id && mongoose.Types.ObjectId.isValid(String(req.user.id))) {
      data.created_by = req.user.id;
    }
    if (data.is_default) {
      await MarketingSender.updateMany({ type: data.type }, { $set: { is_default: false } });
    }
    const sender = await MarketingSender.create(data);
    res.status(201).json({ success: true, data: sanitizeSenderForClient(sender) });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

const updateSender = async (req, res) => {
  try {
    const { id } = req.params;
    const data = prepareSenderPayload(req.body, true);
    if (data.is_default && data.type) {
      await MarketingSender.updateMany({ type: data.type, _id: { $ne: id } }, { $set: { is_default: false } });
    }
    const sender = await MarketingSender.findByIdAndUpdate(id, { $set: data }, { new: true });
    if (!sender) return res.status(404).json({ success: false, message: 'Sender not found' });
    res.json({ success: true, data: sanitizeSenderForClient(sender) });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

const deleteSender = async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await MarketingSender.findByIdAndDelete(id);
    if (!deleted) return res.status(404).json({ success: false, message: 'Sender not found' });
    res.json({ success: true, message: 'Sender deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const testSender = async (req, res) => {
  try {
    const { sender_id, test_target, verify_only = false } = req.body;
    const sender = await MarketingSender.findById(sender_id);
    if (!sender) return res.status(404).json({ success: false, message: 'Sender not found' });

    let result;
    if (sender.type === 'email') {
      if (verify_only) {
        result = await emailService.verifyEmailSenderConnection(sender.toObject());
      } else {
        result = await emailService.sendEmail({
          senderId: sender._id,
          to: test_target || sender.sender_email,
          subject: 'SolarKits Marketing - Test Verification Email',
          htmlContent: `<div style="font-family:Arial,sans-serif;padding:20px;"><h2>SolarKits Verification Test</h2><p>This is a live verification email from <strong>${sender.name}</strong> (${sender.email_provider?.toUpperCase()}).</p><p>Timestamp: ${new Date().toISOString()}</p></div>`,
          allowInactiveSender: true,
          sourceType: 'sender_test'
        });
      }
      sender.last_tested_at = new Date();
      sender.status = result.success ? 'active' : 'verification_pending';
      sender.last_error = result.success ? null : (result.error || 'Verification failed');
      await sender.save();
    } else {
      const targetPhone = test_target ? String(test_target).trim() : '';
      if (!verify_only && targetPhone) {
        result = await whatsappService.sendTextMessage({
          senderId: sender._id,
          to: targetPhone,
          text: 'SolarKits Marketing - Live test message from connected WhatsApp Business API.',
          allowInactiveSender: true,
          sourceType: 'sender_test'
        });
      } else {
        result = await whatsappService.verifyWhatsAppConnection({ senderId: sender._id, allowInactive: true });
      }
      sender.last_tested_at = new Date();
      sender.status = result.success ? 'connected' : 'disconnected';
      sender.last_error = result.success ? null : (result.error || 'Meta Cloud API connection failed');
      await sender.save();
    }

    return res.json({
      ...result,
      sender: sanitizeSenderForClient(sender)
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ── 5. Templates CRUD & Live Test ──────────────────────────────────────────
const getTemplates = async (req, res) => {
  try {
    const { channel, wa_status, is_active } = req.query;
    const filter = {};
    if (channel) filter.channel = channel;
    if (wa_status) filter.wa_status = wa_status;
    if (is_active !== undefined) filter.is_active = is_active === 'true';

    const templates = await MarketingTemplate.find(filter).sort({ created_at: -1 }).lean();
    res.json({ success: true, data: templates });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const createTemplate = async (req, res) => {
  try {
    const payload = { ...req.body };
    if (req.user?.id && mongoose.Types.ObjectId.isValid(String(req.user.id))) {
      payload.created_by = req.user.id;
    }
    const template = await MarketingTemplate.create(payload);
    res.status(201).json({ success: true, data: template });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

const updateTemplate = async (req, res) => {
  try {
    const template = await MarketingTemplate.findByIdAndUpdate(
      req.params.id,
      { $set: req.body },
      { new: true, runValidators: true }
    );
    if (!template) return res.status(404).json({ success: false, message: 'Template not found' });
    res.json({ success: true, data: template });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

const deleteTemplate = async (req, res) => {
  try {
    const template = await MarketingTemplate.findByIdAndDelete(req.params.id);
    if (!template) return res.status(404).json({ success: false, message: 'Template not found' });
    res.json({ success: true, message: 'Template deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const patchTemplateStatus = async (req, res) => {
  try {
    const { wa_status, is_active } = req.body;
    const updateSet = {};
    if (wa_status) updateSet.wa_status = wa_status;
    if (is_active !== undefined) updateSet.is_active = Boolean(is_active);
    const template = await MarketingTemplate.findByIdAndUpdate(
      req.params.id,
      { $set: updateSet },
      { new: true, runValidators: true }
    );
    if (!template) return res.status(404).json({ success: false, message: 'Template not found' });
    res.json({ success: true, data: template });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

const testTemplate = async (req, res) => {
  try {
    const { test_target, sender_id, variables = {} } = req.body;
    const template = await MarketingTemplate.findById(req.params.id);
    if (!template) return res.status(404).json({ success: false, message: 'Template not found' });
    if (!test_target) return res.status(400).json({ success: false, message: 'Test recipient email or phone is required.' });

    const sampleVars = {
      name: 'Test Solar Partner',
      company: 'Test EPC Enterprises',
      company_name: 'Test EPC Enterprises',
      kit_name: '5kW Commercial Solar Kit',
      price: '₹1,85,000',
      campaign_price: '₹1,85,000',
      coupon_code: 'SOLAR2026',
      warehouse_name: 'Bhiwandi Super Depot',
      tracking_url: 'https://solarkits.in',
      unsubscribe_url: `${campaignService.resolveBackendBaseUrl()}/api/marketing/unsubscribe?email=${encodeURIComponent(test_target)}`,
      ...variables
    };

    let result;
    if (template.channel === 'email') {
      result = await emailService.sendEmail({
        senderId: sender_id || null,
        to: test_target,
        subject: template.subject || template.name,
        htmlContent: template.html_content || `<p>${template.body_text || template.name}</p>`,
        variables: sampleVars,
        unsubscribeUrl: sampleVars.unsubscribe_url,
        allowInactiveSender: true,
        sourceType: 'template_test',
        templateId: template._id
      });
    } else {
      const bodyText = emailService.interpolate(template.body_text || template.name, sampleVars);
      result = await whatsappService.sendTextMessage({
        senderId: sender_id || null,
        to: test_target,
        text: bodyText,
        allowInactiveSender: true,
        sourceType: 'template_test'
      });
    }

    template.last_tested_at = new Date();
    template.last_test_target = test_target;
    template.last_error = result.success ? null : (result.error || 'Template test failed');
    await template.save();

    res.json({ ...result, template });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ── 6. Form Mappings ───────────────────────────────────────────────────────
const getFormMappings = async (req, res) => {
  try {
    let mappings = await WebsiteFormMapping.find({}).sort({ created_at: 1 }).lean();
    if (!mappings || mappings.length === 0) {
      const defaults = [
        { form_key: 'epc_registration', form_name: 'EPC Registration Form', page_route: 'solarkits.in/epc-registration', target_team: 'BDE Onboarding Team', sla_hours: 4, prevent_duplicate_days: 30 },
        { form_key: 'franchisee_enquiry', form_name: 'Franchisee Enquiry Form', page_route: 'solarkits.in/franchisee', target_team: 'Franchisee Expansion Team', sla_hours: 2, prevent_duplicate_days: 60 },
        { form_key: 'product_enquiry', form_name: 'Product Enquiry Form', page_route: 'solarkits.in/products', target_team: 'Sales Desk', sla_hours: 6, prevent_duplicate_days: 15 },
        { form_key: 'kit_purchase_enquiry', form_name: 'Kit Purchase Enquiry Form', page_route: 'solarkits.in/solar-kits', target_team: 'Commercial Kit Sales', sla_hours: 2, prevent_duplicate_days: 30 },
        { form_key: 'contact_us', form_name: 'Contact Us Form', page_route: 'solarkits.in/contact', target_team: 'General Support Desk', sla_hours: 12, prevent_duplicate_days: 10 },
        { form_key: 'dealer_registration', form_name: 'Dealer Registration Form', page_route: 'solarkits.in/dealer', target_team: 'Channel Partner Team', sla_hours: 8, prevent_duplicate_days: 30 },
        { form_key: 'demo_request', form_name: 'Demo Request Form', page_route: 'solarkits.in/demo', target_team: 'Technical Pre-Sales', sla_hours: 4, prevent_duplicate_days: 30 }
      ];
      await WebsiteFormMapping.insertMany(defaults);
      mappings = await WebsiteFormMapping.find({}).sort({ created_at: 1 }).lean();
    }

    if (WebsiteEpcLead) {
      const realEpcCount = await WebsiteEpcLead.countDocuments({ deleted_at: null }).catch(() => 0);
      mappings = mappings.map((m) => {
        if (m.form_key === 'epc_registration' && realEpcCount > 0) {
          return {
            ...m,
            total_leads_created: realEpcCount,
            total_submissions: Math.max(m.total_submissions || 0, realEpcCount)
          };
        }
        return m;
      });
    }

    res.json({ success: true, data: mappings });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const updateFormMapping = async (req, res) => {
  try {
    const mapping = await WebsiteFormMapping.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json({ success: true, data: mapping });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

const bulkUpdateFormMappings = async (req, res) => {
  try {
    const { mappings } = req.body;
    if (!Array.isArray(mappings)) {
      return res.status(400).json({ success: false, message: 'Mappings array required' });
    }
    const updatePromises = mappings
      .map((item) => {
        const targetId = item._id || item.id;
        if (!targetId) return null;
        const { _id, id, ...updateData } = item;
        return WebsiteFormMapping.findByIdAndUpdate(targetId, { $set: updateData }, { new: true });
      })
      .filter(Boolean);
    const results = await Promise.all(updatePromises);
    res.json({ success: true, data: results, message: 'Form mappings saved successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ── 7. Public Short URL Redirection & Tracking Links CRUD ──────────────────
const handleShortUrl = async (req, res) => {
  try {
    const { code } = req.params;
    const { redirectUrl } = await campaignService.handleShortUrlClick(code, req);
    res.redirect(redirectUrl);
  } catch (error) {
    res.redirect('https://solarkits.in');
  }
};

const getTrackingLinks = async (req, res) => {
  try {
    const [standaloneLinks, campaignLinks] = await Promise.all([
      MarketingTrackingLink.find({}).populate('campaign_id', 'campaign_name campaign_code').sort({ created_at: -1 }).lean(),
      MarketingCampaign.find({ tracking_short_code: { $ne: null } })
        .select('campaign_name campaign_code tracking_short_code tracking_full_url destination_url utm_source utm_medium utm_campaign utm_content stats created_at')
        .sort({ created_at: -1 })
        .lean()
    ]);

    const backendBase = campaignService.resolveBackendBaseUrl();
    const formattedStandalone = standaloneLinks.map((l) => ({
      ...l,
      source: 'custom_link',
      short_url: `${backendBase}/api/marketing/t/${l.short_code}`
    }));

    const formattedCampaigns = campaignLinks.map((c) => ({
      _id: `camp_${c._id}`,
      campaign_id: c._id,
      title: c.campaign_name,
      short_code: c.tracking_short_code,
      short_url: `${backendBase}/api/marketing/t/${c.tracking_short_code}`,
      base_url: c.destination_url || 'https://solarkits.in',
      full_url: c.tracking_full_url || campaignService.buildUtmDestinationUrl(c),
      utm_source: c.utm_source,
      utm_medium: c.utm_medium,
      utm_campaign: c.utm_campaign,
      utm_content: c.utm_content,
      clicks: c.stats?.link_clicks || 0,
      source: 'campaign',
      created_at: c.created_at
    }));

    res.json({ success: true, data: [...formattedStandalone, ...formattedCampaigns] });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const createTrackingLink = async (req, res) => {
  try {
    const payload = { ...req.body };
    if (req.user?.id && mongoose.Types.ObjectId.isValid(String(req.user.id))) {
      payload.created_by = req.user.id;
    }

    if (payload.short_code) {
      const cleanCode = String(payload.short_code).trim();
      const [existsLink, existsCamp] = await Promise.all([
        MarketingTrackingLink.findOne({ short_code: cleanCode }).lean(),
        MarketingCampaign.findOne({ tracking_short_code: cleanCode }).lean()
      ]);
      if (existsLink || existsCamp) {
        return res.status(409).json({ success: false, message: `Short code "${cleanCode}" is already taken.` });
      }
      payload.short_code = cleanCode;
    }

    const link = await MarketingTrackingLink.create(payload);
    const backendBase = campaignService.resolveBackendBaseUrl();
    res.status(201).json({
      success: true,
      data: {
        ...link.toObject(),
        source: 'custom_link',
        short_url: `${backendBase}/api/marketing/t/${link.short_code}`
      }
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

const deleteTrackingLink = async (req, res) => {
  try {
    const deleted = await MarketingTrackingLink.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ success: false, message: 'Tracking link not found' });
    res.json({ success: true, message: 'Tracking link deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ── 8. Reports Generation ──────────────────────────────────────────────────
const getReports = async (req, res) => {
  try {
    const campaigns = await MarketingCampaign.find({})
      .populate('assigned_manager', 'name')
      .lean();

    const reportRows = campaigns.map((c) => {
      const s = c.stats || {};
      const sent = s.messages_sent || 0;
      const delRate = sent > 0 ? (((sent - (s.failed || 0)) / sent) * 100).toFixed(1) : '0.0';
      const clickRate = sent > 0 ? ((s.link_clicks / sent) * 100).toFixed(1) : '0.0';
      const convRate = s.website_visits > 0 ? ((s.conversions / s.website_visits) * 100).toFixed(1) : '0.0';
      const roi = c.budget > 0 ? (((s.revenue_generated - c.budget) / c.budget) * 100).toFixed(1) : '0.0';

      return {
        campaign_name: c.campaign_name,
        campaign_code: c.campaign_code,
        channel: c.campaign_type,
        objective: c.campaign_objective,
        status: c.status,
        manager: c.assigned_manager?.name || 'Unassigned',
        budget: c.budget || 0,
        messages_sent: sent,
        delivered: s.delivered || sent,
        failed: s.failed || 0,
        delivery_rate: `${delRate}%`,
        opened_or_read: s.opened_or_read || 0,
        clicks: s.link_clicks || 0,
        click_rate: `${clickRate}%`,
        website_visits: s.website_visits || 0,
        leads_generated: s.form_submissions || 0,
        conversions: s.conversions || 0,
        conversion_rate: `${convRate}%`,
        revenue: s.revenue_generated || 0,
        roi: `${roi}%`
      };
    });

    res.json({ success: true, count: reportRows.length, data: reportRows });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ── 9. Live EPC Audience Hub List (100% Real DB — Zero Mock/Offsets) ──────
const getAudienceList = async (req, res) => {
  try {
    const { search, epc_type, state, cluster, warehouse, include_unsubscribed } = req.query;

    const [orders, dbEpcs, dbLeads, clusters, unsubs, geoResolver] = await Promise.all([
      EpcOrder.find({ order_status: { $nin: ['cancelled', 'rejected'] } })
        .select('epc_id customer_phone customer_email created_at')
        .lean()
        .catch(() => []),
      EpcAccount.find({ deleted_at: null })
        .select('name company_name email whatsapp phone state_name district_name gstin gst_verification_status is_gstin_active is_marketing_unsubscribed created_at updated_at')
        .sort({ created_at: -1 })
        .lean()
        .catch(() => []),
      WebsiteEpcLead.find({ deleted_at: null })
        .select('lead_id name company_name contact_person phone mobile_number email state_name district_id district_name cluster_id cluster_name cluster_code gst_number lead_source custom_attributes warehouse_name lifetime_orders marketing_consent created_at')
        .sort({ created_at: -1 })
        .lean()
        .catch(() => []),
      FranchiseeCluster.find({ deleted_at: null, is_active: true }).select('cluster_name state_name district_names').lean().catch(() => []),
      MarketingUnsubscribe.find({ is_active: true }).select('email phone').lean().catch(() => []),
      buildGeoAndClusterResolver().catch(() => null)
    ]);

    const epcIds = dbEpcs.map((e) => e._id);
    const [prefs, consents] = epcIds.length > 0
      ? await Promise.all([
          EpcPreference.find({ epc_id: { $in: epcIds }, deleted_at: null }).lean().catch(() => []),
          EpcMarketingConsent.find({ epc_id: { $in: epcIds }, is_active: true, withdrawn_at: null }).lean().catch(() => [])
        ])
      : [[], []];

    const prefMap = new Map(prefs.map((p) => [String(p.epc_id), p]));
    const consentMap = new Map(consents.map((c) => [String(c.epc_id), c]));

    const unsubEmailSet = new Set(unsubs.filter((u) => u.email).map((u) => u.email.toLowerCase().trim()));
    const unsubPhoneSet = new Set(unsubs.filter((u) => u.phone).map((u) => String(u.phone).replace(/\D/g, '').slice(-10)));

    const districtToCluster = new Map();
    for (const cl of clusters) {
      for (const dn of cl.district_names || []) {
        districtToCluster.set(String(dn).toLowerCase().trim(), cl.cluster_name);
      }
    }

    const orderCountMap = new Map();
    for (const ord of orders) {
      if (ord.epc_id) {
        const idStr = String(ord.epc_id);
        orderCountMap.set(idStr, (orderCountMap.get(idStr) || 0) + 1);
      }
      if (ord.customer_phone) {
        const ph = String(ord.customer_phone).replace(/\D/g, '').slice(-10);
        if (ph) orderCountMap.set(ph, (orderCountMap.get(ph) || 0) + 1);
      }
    }

    const combined = [];

    for (const acc of dbEpcs) {
      const ph = String(acc.whatsapp || acc.phone || '').replace(/\D/g, '').slice(-10);
      const em = (acc.email || '').toLowerCase().trim();
      const ordersCount = orderCountMap.get(String(acc._id)) || orderCountMap.get(ph) || 0;
      const isUnsub = Boolean(acc.is_marketing_unsubscribed || (em && unsubEmailSet.has(em)) || (ph && unsubPhoneSet.has(ph)));
      const consent = consentMap.get(String(acc._id));
      const pref = prefMap.get(String(acc._id));
      const resolved = geoResolver
        ? geoResolver.resolve({ stateName: acc.state_name || '', districtName: acc.district_name || '' })
        : { state: acc.state_name || '', district: acc.district_name || '', cluster_name: '' };
      const clusterName = resolved.cluster_name || districtToCluster.get(String(acc.district_name || '').toLowerCase().trim()) || acc.district_name || 'Unmapped';

      combined.push({
        _id: String(acc._id),
        epc_id: acc._id,
        source: 'epc_account',
        recordSource: 'epc_account',
        name: acc.company_name || acc.name || 'Solar Partner',
        contactPerson: acc.name || 'Contractor',
        phone: acc.whatsapp || acc.phone || '',
        email: em,
        state: resolved.state || acc.state_name || 'Not Specified',
        district: resolved.district || acc.district_name || '',
        cluster: clusterName,
        warehouse: resolved.cluster_name ? `${resolved.cluster_name} Depot` : '',
        gstin: acc.gstin || null,
        lifetimeOrders: ordersCount,
        lastActive: acc.updated_at ? new Date(acc.updated_at).toLocaleDateString('en-IN') : 'Registered',
        whatsappOptIn: Boolean((consent?.whatsapp_consent || consent?.whatsapp_marketing_consent || pref?.whatsapp_marketing_consent) && !isUnsub),
        emailVerified: Boolean((consent?.email_consent || consent?.email_marketing_consent || pref?.email_marketing_consent) && !isUnsub),
        isUnsubscribed: isUnsub,
        isVerifiedFlag: ['verified_automatic', 'verified_admin'].includes(acc.gst_verification_status) || acc.is_gstin_active === true
      });
    }

    for (const lead of dbLeads) {
      const rawPh = lead.phone || lead.mobile_number || '';
      const ph = String(rawPh).replace(/\D/g, '').slice(-10);
      const em = (lead.email || '').toLowerCase().trim();
      const ordersCount = Number(lead.lifetime_orders || 0) || orderCountMap.get(ph) || 0;
      const isUnsub = Boolean((em && unsubEmailSet.has(em)) || (ph && unsubPhoneSet.has(ph)) || lead.marketing_consent === false);
      const resolved = geoResolver
        ? geoResolver.resolve({ stateName: lead.state_name || '', districtName: lead.district_name || '' })
        : { state: lead.state_name || '', district: lead.district_name || '', cluster_name: '' };
      const clusterName = lead.cluster_name || resolved.cluster_name || districtToCluster.get(String(lead.district_name || '').toLowerCase().trim()) || lead.district_name || 'Unmapped';

      combined.push({
        _id: String(lead._id),
        lead_id: lead._id,
        source: lead.lead_source === 'csv_dynamic_import' ? 'csv_import' : 'website_lead',
        recordSource: 'website_epc_lead',
        name: lead.company_name || lead.name || 'Lead Contractor',
        contactPerson: lead.contact_person || lead.name || 'Lead Contact',
        phone: rawPh,
        email: em,
        state: resolved.state || lead.state_name || 'Not Specified',
        district: resolved.district || lead.district_name || '',
        cluster: clusterName,
        cluster_code: lead.cluster_code || resolved.cluster_code || '',
        warehouse: lead.warehouse_name || (clusterName && clusterName !== 'Unmapped' ? `${clusterName} Depot` : ''),
        gstin: lead.gst_number || null,
        lifetimeOrders: ordersCount,
        lastActive: lead.lead_source === 'csv_dynamic_import' ? 'CSV Imported' : 'Lead Captured',
        whatsappOptIn: Boolean(ph.length >= 10 && !isUnsub),
        emailVerified: Boolean(em && !isUnsub),
        isUnsubscribed: isUnsub,
        customFields: lead.custom_attributes || {}
      });
    }

    // Strict deduplication by normalized phone or email
    const seenMap = new Map();
    for (const item of combined) {
      const ph = String(item.phone || '').replace(/\D/g, '').slice(-10);
      const em = String(item.email || '').toLowerCase().trim();
      const key = ph || em || String(item._id);
      if (!seenMap.has(key)) {
        const type = classifyEpcPartner({
          gstin: item.gstin,
          lifetimeOrders: item.lifetimeOrders,
          is_verified: item.isVerifiedFlag
        });
        seenMap.set(key, { ...item, type });
      }
    }

    const fullList = Array.from(seenMap.values());
    let filteredList = include_unsubscribed === 'true' ? fullList : fullList.filter((i) => !i.isUnsubscribed);

    if (search && search.trim()) {
      const q = search.toLowerCase().trim();
      filteredList = filteredList.filter(
        (item) =>
          (item.name || '').toLowerCase().includes(q) ||
          (item.contactPerson || '').toLowerCase().includes(q) ||
          (item.phone || '').includes(q) ||
          (item.email || '').toLowerCase().includes(q) ||
          (item.gstin || '').toLowerCase().includes(q)
      );
    }

    if (epc_type && epc_type !== 'ALL') {
      filteredList = filteredList.filter((item) => item.type === epc_type);
    }
    if (state && state !== 'ALL') {
      const stTok = cleanStateToken(state);
      filteredList = filteredList.filter(
        (item) => (item.state || '').toLowerCase() === state.toLowerCase() || (stTok && cleanStateToken(item.state) === stTok)
      );
    }
    if (cluster && cluster !== 'ALL') {
      const cTok = cleanGeoToken(cluster);
      filteredList = filteredList.filter(
        (item) => (item.cluster || '').toLowerCase().includes(cluster.toLowerCase()) || (cTok && cleanGeoToken(item.cluster) === cTok)
      );
    }
    if (warehouse && warehouse !== 'ALL') {
      filteredList = filteredList.filter((item) => (item.warehouse || '').toLowerCase().includes(warehouse.toLowerCase()));
    }

    const buyerEpcs = fullList.filter((i) => i.type === 'Buyer EPC').length;
    const verifiedEpcs = fullList.filter((i) => i.type === 'Verified EPC').length;
    const registeredEpcs = fullList.filter((i) => i.type === 'Registered EPC').length;
    const eligibleEpcs = fullList.filter((i) => !i.isUnsubscribed).length;
    const totalKitsOrdered = fullList.reduce((acc, i) => acc + (Number(i.lifetimeOrders) || 0), 0);

    const clusterMap = new Map();
    for (const item of fullList) {
      const cName = item.cluster || 'Unmapped';
      if (!clusterMap.has(cName)) {
        clusterMap.set(cName, {
          name: cName,
          state: item.state || '',
          warehouse: item.warehouse || '',
          buyer_epcs: 0,
          verified_epcs: 0,
          registered_epcs: 0,
          total_epcs: 0,
          total_orders: 0,
        });
      }
      const cObj = clusterMap.get(cName);
      cObj.total_epcs++;
      cObj.total_orders += Number(item.lifetimeOrders) || 0;
      if (item.type === 'Buyer EPC') cObj.buyer_epcs++;
      else if (item.type === 'Verified EPC') cObj.verified_epcs++;
      else cObj.registered_epcs++;
    }

    const clusterSummary = Array.from(clusterMap.values()).map((c) => {
      let dominant = 'Registered EPC';
      if (c.buyer_epcs >= c.verified_epcs && c.buyer_epcs >= c.registered_epcs) dominant = 'Buyer EPC';
      else if (c.verified_epcs >= c.registered_epcs) dominant = 'Verified EPC';
      return { ...c, dominant_type: dominant };
    });

    res.json({
      success: true,
      audiences: filteredList,
      stats: {
        total_epc_database: fullList.length,
        unique_eligible_epcs: eligibleEpcs,
        unsubscribed_epcs: fullList.length - eligibleEpcs,
        buyer_epcs: buyerEpcs,
        verified_epcs: verifiedEpcs,
        registered_epcs: registeredEpcs,
        lifetime_kits_ordered: totalKitsOrdered,
        active_clusters_count: clusterSummary.length,
        active_states_count: new Set(fullList.map((i) => i.state).filter((s) => s && s !== 'Not Specified')).size
      },
      clusters: clusterSummary
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ── 10. Dynamic Bulk Lead Import to MongoDB (Zero In-Memory Dummy Data + Option B Duplicates) ──
const importDynamicCsvLeads = async (req, res) => {
  try {
    const { leads = [], default_settings = {} } = req.body;
    if (!Array.isArray(leads) || leads.length === 0) {
      return res.status(400).json({ success: false, message: 'No lead rows provided for import.' });
    }
    if (!WebsiteEpcLead) {
      return res.status(500).json({ success: false, message: 'WebsiteEpcLead database model unavailable.' });
    }

    const batchPhones = [];
    const batchEmails = [];
    for (const raw of leads) {
      const p10 = String(raw.mobile_number || raw.phone || raw.mobile || raw.whatsapp || raw.whatsapp_number || '').replace(/\D/g, '').slice(-10);
      const em = raw.email ? String(raw.email).trim().toLowerCase() : '';
      if (p10.length === 10) batchPhones.push(p10);
      if (em && em.includes('@')) batchEmails.push(em);
    }

    const existingLeadPhoneSet = new Set();
    const existingLeadEmailSet = new Set();
    const existingAccPhoneSet = new Set();
    const existingAccEmailSet = new Set();

    if (batchPhones.length > 0 || batchEmails.length > 0) {
      const leadOr = [];
      if (batchPhones.length > 0) leadOr.push({ phone: { $in: batchPhones } }, { mobile_number: { $in: batchPhones } });
      if (batchEmails.length > 0) leadOr.push({ email: { $in: batchEmails } });

      const [existingLeads, existingEpcs] = await Promise.all([
        leadOr.length > 0 ? WebsiteEpcLead.find({ deleted_at: null, $or: leadOr }).select('phone mobile_number email').lean() : [],
        EpcAccount
          ? EpcAccount.find({
              deleted_at: null,
              $or: [
                ...(batchPhones.length > 0 ? [{ whatsapp: { $in: batchPhones } }, { phone: { $in: batchPhones } }] : []),
                ...(batchEmails.length > 0 ? [{ email: { $in: batchEmails } }] : []),
              ]
            }).select('whatsapp phone email').lean()
          : [],
      ]);

      for (const l of existingLeads) {
        const p10 = String(l.mobile_number || l.phone || '').replace(/\D/g, '').slice(-10);
        if (p10.length === 10) existingLeadPhoneSet.add(p10);
        if (l.email) existingLeadEmailSet.add(String(l.email).toLowerCase());
      }
      for (const a of existingEpcs) {
        const p10 = String(a.whatsapp || a.phone || '').replace(/\D/g, '').slice(-10);
        if (p10.length === 10) existingAccPhoneSet.add(p10);
        if (a.email) existingAccEmailSet.add(String(a.email).toLowerCase());
      }
    }

    const geoResolver = await buildGeoAndClusterResolver().catch(() => null);
    const reqFieldsArr = Array.isArray(default_settings.required_fields) && default_settings.required_fields.length > 0
      ? default_settings.required_fields
      : ['company_name', 'mobile_number', 'state_name'];
    const reqSet = new Set(reqFieldsArr);

    let importedCount = 0;
    let duplicatesSkipped = 0;
    let skippedInvalid = 0;
    let buyerCount = 0;
    let verifiedCount = 0;
    let registeredCount = 0;
    const skippedDetails = [];
    const seenPhones = new Set();
    const seenEmails = new Set();
    const clusterSummary = {};
    const stateSummary = {};
    const year = new Date().getFullYear();

    for (let idx = 0; idx < leads.length; idx++) {
      const raw = leads[idx] || {};
      const name = String(raw.company_name || raw.name || raw.firm_name || '').trim();
      const contactPerson = String(raw.contact_person || raw.contactPerson || raw.person || name).trim();
      const phoneDigits = String(raw.mobile_number || raw.phone || raw.mobile || raw.whatsapp || raw.whatsapp_number || '').replace(/\D/g, '');
      const phone10 = phoneDigits.length >= 10 ? phoneDigits.slice(-10) : '';
      const rawEmail = raw.email ? String(raw.email).trim().toLowerCase() : '';
      const email = rawEmail && rawEmail.includes('@') ? rawEmail : '';

      const rawState = String(raw.state_name || raw.state || default_settings.default_state || '').trim();
      const rawDistrict = String(raw.district_name || raw.district || raw.cluster || default_settings.default_district || default_settings.default_cluster || '').trim();
      const rawCluster = String(raw.cluster_name || raw.cluster || default_settings.default_cluster || '').trim();

      const resolvedGeo = geoResolver
        ? geoResolver.resolve({ stateName: rawState, districtName: rawDistrict, clusterName: rawCluster })
        : { state_id: null, state: rawState, district_id: null, district: rawDistrict, cluster_id: null, cluster_name: rawCluster, cluster_code: '' };
      const finalState = resolvedGeo.state || rawState;
      const finalDistrict = resolvedGeo.district || rawDistrict;
      const finalClusterName = resolvedGeo.cluster_name || rawCluster || null;

      let invalidReason = '';
      if (!name && !phone10 && !email) {
        invalidReason = 'Empty row (missing Name, Phone & Email)';
      } else if (reqSet.has('company_name') && !name) {
        invalidReason = 'Missing required Company / Firm Name';
      } else if (reqSet.has('mobile_number') && !phone10) {
        invalidReason = 'Missing required 10-digit Mobile Number';
      } else if (reqSet.has('email') && !email) {
        invalidReason = 'Missing required Email Address';
      } else if (reqSet.has('state_name') && !finalState) {
        invalidReason = 'Missing required State (no state/district match or Default State)';
      } else if (reqSet.has('district_name') && !finalDistrict) {
        invalidReason = 'Missing required District / City';
      }

      if (invalidReason) {
        skippedInvalid++;
        if (skippedDetails.length < 300) {
          skippedDetails.push({
            row_number: idx + 1,
            name: name || `Row ${idx + 1}`,
            phone: phone10,
            email,
            reason: invalidReason,
          });
        }
        continue;
      }

      if ((phone10 && existingAccPhoneSet.has(phone10)) || (email && existingAccEmailSet.has(email))) {
        duplicatesSkipped++;
        if (skippedDetails.length < 300) {
          skippedDetails.push({ row_number: idx + 1, name, phone: phone10, email, reason: 'Already registered Platform EPC' });
        }
        continue;
      }
      if ((phone10 && existingLeadPhoneSet.has(phone10)) || (email && existingLeadEmailSet.has(email))) {
        duplicatesSkipped++;
        if (skippedDetails.length < 300) {
          skippedDetails.push({ row_number: idx + 1, name, phone: phone10, email, reason: 'Already exists in Website / Audience Leads' });
        }
        continue;
      }
      if ((phone10 && seenPhones.has(phone10)) || (email && seenEmails.has(email))) {
        duplicatesSkipped++;
        if (skippedDetails.length < 300) {
          skippedDetails.push({ row_number: idx + 1, name, phone: phone10, email, reason: 'Duplicate entry in same uploaded file' });
        }
        continue;
      }

      if (phone10) seenPhones.add(phone10);
      if (email) seenEmails.add(email);

      const gstin = raw.gst_number || raw.gstin || raw.gst ? String(raw.gst_number || raw.gstin || raw.gst).trim().toUpperCase() : null;
      const lifetimeOrders = Number(raw.lifetime_orders || raw.lifetimeOrders || raw.orders || 0);
      const explicitType = String(raw.epc_type || default_settings.default_epc_type || '').trim();
      const type = explicitType || classifyEpcPartner({ gstin, lifetimeOrders });

      if (type === 'Buyer EPC') buyerCount++;
      else if (type === 'Verified EPC') verifiedCount++;
      else registeredCount++;

      const leadSource = String(raw.lead_source || raw.source || default_settings.default_lead_source || 'audience_dynamic_import').trim();

      await WebsiteEpcLead.create({
        lead_id: `IMP-${year}-${Date.now().toString().slice(-4)}${Math.floor(1000 + Math.random() * 9000)}`,
        name: name || email || phone10,
        company_name: name || email || phone10,
        contact_person: contactPerson || name || email || phone10,
        phone: phone10 || null,
        mobile_number: phone10 || null,
        email: email || null,
        state_id: resolvedGeo.state_id || null,
        state_name: finalState || '',
        district_id: resolvedGeo.district_id || null,
        district_name: finalDistrict || null,
        cluster_id: resolvedGeo.cluster_id || null,
        cluster_name: finalClusterName,
        cluster_code: resolvedGeo.cluster_code || null,
        pincode: raw.pincode ? String(raw.pincode).replace(/\D/g, '').slice(0, 6) || null : null,
        address_line: raw.address_line ? String(raw.address_line).trim() : null,
        project_type: raw.interested_products || 'Bulk Solar Combo Kits',
        interested_products: raw.interested_products || null,
        follow_up_date: raw.follow_up_date || null,
        remarks: raw.remarks || default_settings.default_remarks || null,
        gst_number: gstin,
        gst_verification_status: gstin ? 'verified_admin' : 'unverified',
        epc_type: type,
        lifetime_orders: lifetimeOrders,
        status: 'new',
        lead_status: 'New',
        lead_source: leadSource,
        source: leadSource,
        marketing_consent: raw.marketing_consent !== false,
        custom_attributes: raw.custom_attributes || raw.customFields || raw.custom_fields || {},
      });

      if (finalState) stateSummary[finalState] = (stateSummary[finalState] || 0) + 1;
      if (finalClusterName) clusterSummary[finalClusterName] = (clusterSummary[finalClusterName] || 0) + 1;
      importedCount++;
    }

    res.json({
      success: importedCount > 0 || duplicatesSkipped > 0,
      message: `Imported ${importedCount} lead(s) to MongoDB across States & Clusters. Skipped ${duplicatesSkipped} duplicate(s) and ${skippedInvalid} invalid row(s).`,
      count: importedCount,
      imported_count: importedCount,
      importedCount,
      duplicates_skipped: duplicatesSkipped,
      skipped_invalid: skippedInvalid,
      cluster_summary: clusterSummary,
      state_summary: stateSummary,
      skipped_details: skippedDetails,
      breakdown: {
        buyer_epcs: buyerCount,
        verified_epcs: verifiedCount,
        registered_epcs: registeredCount,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ── 10B. Audience Custom Filter Segments CRUD (MarketingAudienceSegment) ──
const getAudienceSegments = async (req, res) => {
  try {
    const segments = await MarketingAudienceSegment.find({ is_active: true }).sort({ created_at: -1 }).lean();
    res.json({ success: true, data: segments });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const createAudienceSegment = async (req, res) => {
  try {
    const { name, description = '', filters = {} } = req.body;
    if (!name || !String(name).trim()) {
      return res.status(400).json({ success: false, message: 'Segment name is required.' });
    }
    const preview = await audienceService.resolveAudience({ ...filters, require_consent: Boolean(filters.require_consent) });
    const segment = await MarketingAudienceSegment.create({
      name: String(name).trim(),
      description,
      filters,
      cached_count: preview.total_eligible,
      last_computed_at: new Date(),
      created_by: req.user?.id && mongoose.Types.ObjectId.isValid(String(req.user.id)) ? req.user.id : null
    });
    res.status(201).json({ success: true, data: segment });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

const updateAudienceSegment = async (req, res) => {
  try {
    const { name, description, filters } = req.body;
    const updateSet = {};
    if (name !== undefined) updateSet.name = name;
    if (description !== undefined) updateSet.description = description;
    if (filters !== undefined) {
      updateSet.filters = filters;
      const preview = await audienceService.resolveAudience({ ...filters, require_consent: Boolean(filters.require_consent) });
      updateSet.cached_count = preview.total_eligible;
      updateSet.last_computed_at = new Date();
    }
    const segment = await MarketingAudienceSegment.findByIdAndUpdate(req.params.id, { $set: updateSet }, { new: true });
    if (!segment) return res.status(404).json({ success: false, message: 'Segment not found' });
    res.json({ success: true, data: segment });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

const deleteAudienceSegment = async (req, res) => {
  try {
    const deleted = await MarketingAudienceSegment.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ success: false, message: 'Segment not found' });
    res.json({ success: true, message: 'Segment deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ── 11. Clusters Summary ───────────────────────────────────────────────────
const getAudienceClustersSummary = async (req, res) => {
  try {
    return getAudienceList(req, res);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ── 12. Seasonal Coupons & OfferMaster CRUD ────────────────────────────────
const getCoupons = async (req, res) => {
  try {
    const [offers, campaigns] = await Promise.all([
      OfferMaster.find({
        deleted_at: null,
        $or: [{ offer_type: 'coupon' }, { coupon_code: { $ne: null } }]
      })
        .populate('products_applicable', 'name capacity selling_price_cached')
        .sort({ created_at: -1 })
        .lean(),
      MarketingCampaign.find({ coupon_code: { $ne: null } }).select('coupon_code stats').lean()
    ]);

    const statsByCode = new Map();
    for (const c of campaigns) {
      const code = String(c.coupon_code).toUpperCase().trim();
      const prev = statsByCode.get(code) || { redemptions: 0, revenue: 0 };
      prev.redemptions += c.stats?.conversions || 0;
      prev.revenue += c.stats?.revenue_generated || 0;
      statsByCode.set(code, prev);
    }

    const enriched = offers.map((o) => {
      const code = String(o.coupon_code || '').toUpperCase().trim();
      const s = statsByCode.get(code) || { redemptions: 0, revenue: 0 };
      return {
        ...o,
        redemptions_count: s.redemptions,
        revenue_generated: s.revenue
      };
    });

    res.json({ success: true, data: enriched });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const createCoupon = async (req, res) => {
  try {
    const {
      offer_name,
      coupon_code,
      discount_type = 'flat',
      discount_value,
      start_date,
      end_date,
      products_applicable = [],
      cluster_id = null,
      customer_category = 'all',
      max_qty = null,
      stackable = false,
      is_active = true
    } = req.body;

    if (!offer_name || !coupon_code) {
      return res.status(400).json({ success: false, message: 'Offer name and coupon code are required.' });
    }
    const cleanCode = String(coupon_code).trim().toUpperCase();
    const dup = await OfferMaster.findOne({ coupon_code: cleanCode, deleted_at: null }).lean();
    if (dup) {
      return res.status(409).json({ success: false, message: `Coupon code "${cleanCode}" already exists.` });
    }

    const offer = await OfferMaster.create({
      offer_name: String(offer_name).trim(),
      offer_type: 'coupon',
      discount_type: discount_type === 'percentage' ? 'percent' : discount_type,
      discount_value: Number(discount_value || 0),
      start_date: start_date ? new Date(start_date) : new Date(),
      end_date: end_date ? new Date(end_date) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      products_applicable: (products_applicable || []).filter((id) => mongoose.Types.ObjectId.isValid(String(id))),
      customer_category,
      coupon_code: cleanCode,
      cluster_id: cluster_id && mongoose.Types.ObjectId.isValid(String(cluster_id)) ? cluster_id : null,
      priority: 3,
      stackable: Boolean(stackable),
      is_active: Boolean(is_active),
      max_qty: max_qty ? Number(max_qty) : null
    });

    res.status(201).json({ success: true, data: offer });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

const updateCoupon = async (req, res) => {
  try {
    const payload = { ...req.body };
    if (payload.coupon_code) payload.coupon_code = String(payload.coupon_code).trim().toUpperCase();
    if (payload.discount_type === 'percentage') payload.discount_type = 'percent';

    const offer = await OfferMaster.findOneAndUpdate(
      { _id: req.params.id, deleted_at: null },
      { $set: payload },
      { new: true }
    );
    if (!offer) return res.status(404).json({ success: false, message: 'Coupon offer not found' });
    res.json({ success: true, data: offer });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

const toggleCoupon = async (req, res) => {
  try {
    const offer = await OfferMaster.findOne({ _id: req.params.id, deleted_at: null });
    if (!offer) return res.status(404).json({ success: false, message: 'Coupon offer not found' });
    offer.is_active = !offer.is_active;
    await offer.save();
    res.json({ success: true, data: offer });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const deleteCoupon = async (req, res) => {
  try {
    const offer = await OfferMaster.findOneAndUpdate(
      { _id: req.params.id, deleted_at: null },
      { $set: { deleted_at: new Date(), is_active: false } },
      { new: true }
    );
    if (!offer) return res.status(404).json({ success: false, message: 'Coupon offer not found' });
    res.json({ success: true, message: 'Coupon deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ── 13. Cloudinary Media Upload Handler ────────────────────────────────────
const uploadMarketingMedia = async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ success: false, message: 'No media file uploaded.' });
    }
    const uploadedFile = req.files[0];
    return res.json({
      success: true,
      url: uploadedFile.path,
      public_id: uploadedFile.filename,
      original_name: uploadedFile.originalname,
      size: uploadedFile.size
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ── 14. Queue Status ───────────────────────────────────────────────────────
const getMarketingQueueStatus = async (req, res) => {
  try {
    const stats = emailQueueService.getStats();
    return res.json({ success: true, queue: stats });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const clearMarketingQueue = async (req, res) => {
  try {
    const result = emailQueueService.clearQueue();
    return res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ── 15. Unsubscribe & Suppression Engine ───────────────────────────────────
const handleUnsubscribe = async (req, res) => {
  try {
    const rawEmail = req.query.email || req.body?.email;
    const rawPhone = req.query.phone || req.body?.phone;
    const campaignId = req.query.c || req.body?.campaign_id;
    const action = req.query.action || 'unsubscribe';
    const channel = req.query.channel || 'email';

    if (!rawEmail && !rawPhone) {
      return res.status(400).send(`
        <!DOCTYPE html><html><head><title>Unsubscribe | SolarKits</title></head>
        <body style="font-family: Arial, sans-serif; text-align: center; padding: 40px; background: #f8fafc;">
          <h2>Invalid Request</h2><p>No email address or phone specified.</p>
        </body></html>
      `);
    }

    const email = rawEmail ? String(rawEmail).toLowerCase().trim() : null;
    const phone = rawPhone ? String(rawPhone).trim() : null;
    const matchFilter = email ? { email } : { phone };

    if (action === 'resubscribe') {
      await MarketingUnsubscribe.updateMany(matchFilter, { $set: { is_active: false } });
      if (email && EpcAccount) {
        await EpcAccount.updateMany({ email }, { $set: { is_marketing_unsubscribed: false, marketing_unsubscribed_at: null } });
      }
      return res.send(`
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Resubscribed | SolarKits India</title>
          <style>body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; background: #f1f5f9; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; padding: 15px; box-sizing: border-box; }</style>
        </head>
        <body>
          <div style="max-width: 460px; width: 100%; background: #ffffff; border-radius: 12px; padding: 35px 25px; box-shadow: 0 4px 20px rgba(0,0,0,0.06); text-align: center; border: 1px solid #e2e8f0;">
            <img src="https://res.cloudinary.com/dggmbagax/image/upload/v1795252066/solarkits/branding/solarkits_official_logo.png" width="160" style="margin-bottom: 20px;" />
            <div style="font-size: 40px; margin-bottom: 10px;">✅</div>
            <h2 style="color: #263880; margin: 0 0 10px;">Preferences Updated!</h2>
            <p style="color: #475569; font-size: 14px; line-height: 22px;"><strong>${email || phone}</strong> has been re-subscribed to SolarKits B2B offers and wholesale updates.</p>
            <a href="https://solarkits.in" style="display: inline-block; margin-top: 15px; padding: 10px 24px; background: #263880; color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: 700; font-size: 13px;">Return to SolarKits.in</a>
          </div>
        </body>
        </html>
      `);
    }

    const ip = req.ip || req.connection?.remoteAddress || null;
    const ua = req.headers?.['user-agent'] || null;

    await MarketingUnsubscribe.findOneAndUpdate(
      matchFilter,
      {
        $set: {
          ...(email ? { email } : {}),
          ...(phone ? { phone } : {}),
          channel,
          campaign_id: campaignId && mongoose.Types.ObjectId.isValid(campaignId) ? campaignId : null,
          source: 'email_footer_click',
          ip_address: ip,
          user_agent: ua,
          is_active: true,
          unsubscribed_at: new Date()
        }
      },
      { upsert: true, new: true }
    );

    if (email && EpcAccount) {
      await EpcAccount.updateMany({ email }, { $set: { is_marketing_unsubscribed: true, marketing_unsubscribed_at: new Date() } });
    }

    const resubscribeUrl = `/api/marketing/unsubscribe?${email ? `email=${encodeURIComponent(email)}` : `phone=${encodeURIComponent(phone)}`}&action=resubscribe`;

    return res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Unsubscribe Confirmed | SolarKits India</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; background: #f8fafc; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; padding: 20px; box-sizing: border-box; }
        </style>
      </head>
      <body>
        <div style="max-width: 480px; width: 100%; background: #ffffff; border-radius: 14px; padding: 40px 30px; box-shadow: 0 4px 25px rgba(15, 23, 42, 0.08); text-align: center; border: 1px solid #e2e8f0;">
          <img src="https://res.cloudinary.com/dggmbagax/image/upload/v1795252066/solarkits/branding/solarkits_official_logo.png" alt="SolarKits" width="170" style="margin-bottom: 22px;" />
          <div style="display: inline-block; width: 56px; height: 56px; line-height: 56px; border-radius: 50%; background: #fee2e2; color: #dc2626; font-size: 26px; margin-bottom: 16px;">🔕</div>
          <h2 style="color: #1e293b; margin: 0 0 10px; font-size: 22px; font-weight: 800;">You're Unsubscribed</h2>
          <p style="color: #475569; font-size: 14px; line-height: 22px; margin: 0 0 18px;">
            <strong>${email || phone}</strong> has been successfully removed from SolarKits promotional marketing lists.
          </p>
          <div style="background: #f1f5f9; border-radius: 8px; padding: 12px 16px; margin-bottom: 24px; font-size: 12px; color: #64748b; line-height: 18px; text-align: left;">
            ℹ️ Important transactional messages (order confirmations, delivery tracking, and invoices) will still be sent when you place orders.
          </div>
          <p style="font-size: 12px; color: #94a3b8; margin: 0 0 10px;">Clicked by accident?</p>
          <a href="${resubscribeUrl}" style="display: inline-block; padding: 8px 20px; background: #ffffff; color: #263880; border: 1px solid #cbd5e1; border-radius: 6px; font-weight: 700; font-size: 12px; text-decoration: none;">
            ↩ Re-subscribe to SolarKits Offers
          </a>
        </div>
      </body>
      </html>
    `);
  } catch (error) {
    res.status(500).send(`<h2>Error processing request</h2><p>${error.message}</p>`);
  }
};

const getUnsubscribedList = async (req, res) => {
  try {
    const includeInactive = req.query.include_inactive === 'true';
    const filter = includeInactive ? {} : { is_active: true };
    const list = await MarketingUnsubscribe.find(filter)
      .populate('campaign_id', 'campaign_name campaign_code')
      .sort({ unsubscribed_at: -1 })
      .lean();
    res.json({ success: true, total: list.length, unsubscribes: list });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const suppressContact = async (req, res) => {
  try {
    const { email, phone, channel = 'all', reason = 'Admin suppression' } = req.body;
    const cleanEmail = email ? String(email).toLowerCase().trim() : null;
    const cleanPhone = phone ? String(phone).trim() : null;

    if (!cleanEmail && !cleanPhone) {
      return res.status(400).json({ success: false, message: 'Email or phone number is required to suppress contact.' });
    }

    const matchFilter = cleanEmail ? { email: cleanEmail } : { phone: cleanPhone };
    const record = await MarketingUnsubscribe.findOneAndUpdate(
      matchFilter,
      {
        $set: {
          ...(cleanEmail ? { email: cleanEmail } : {}),
          ...(cleanPhone ? { phone: cleanPhone } : {}),
          channel,
          source: 'admin_manual',
          reason,
          is_active: true,
          unsubscribed_at: new Date()
        }
      },
      { upsert: true, new: true }
    );

    if (cleanEmail && EpcAccount) {
      await EpcAccount.updateMany({ email: cleanEmail }, { $set: { is_marketing_unsubscribed: true, marketing_unsubscribed_at: new Date() } });
    }

    res.status(201).json({ success: true, data: record });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

const resubscribeContact = async (req, res) => {
  try {
    const { id, email, phone } = req.body;
    let doc = null;
    if (id && mongoose.Types.ObjectId.isValid(String(id))) {
      doc = await MarketingUnsubscribe.findByIdAndUpdate(id, { $set: { is_active: false } }, { new: true });
    } else if (email) {
      doc = await MarketingUnsubscribe.findOneAndUpdate({ email: String(email).toLowerCase().trim() }, { $set: { is_active: false } }, { new: true });
    } else if (phone) {
      doc = await MarketingUnsubscribe.findOneAndUpdate({ phone: String(phone).trim() }, { $set: { is_active: false } }, { new: true });
    }

    if (!doc) {
      return res.status(404).json({ success: false, message: 'Suppression record not found.' });
    }

    if (doc.email && EpcAccount) {
      await EpcAccount.updateMany({ email: doc.email }, { $set: { is_marketing_unsubscribed: false, marketing_unsubscribed_at: null } });
    }

    res.json({ success: true, message: 'Contact removed from suppression list.', data: doc });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

module.exports = {
  getMarketingResources,
  getDashboardAnalytics,
  getTerritoryMapAnalytics,
  getCampaigns,
  getCampaignById,
  createCampaign,
  updateCampaign,
  deleteCampaign,
  triggerLaunchCampaign,
  pauseCampaign,
  cancelCampaign,
  testCampaignSend,
  getCampaignLogs,
  getDeliveryLogs,
  previewAudience,
  getSenders,
  createSender,
  updateSender,
  deleteSender,
  testSender,
  getTemplates,
  createTemplate,
  updateTemplate,
  deleteTemplate,
  patchTemplateStatus,
  testTemplate,
  getFormMappings,
  updateFormMapping,
  bulkUpdateFormMappings,
  handleShortUrl,
  getTrackingLinks,
  createTrackingLink,
  deleteTrackingLink,
  getReports,
  getAudienceList,
  importDynamicCsvLeads,
  getAudienceSegments,
  createAudienceSegment,
  updateAudienceSegment,
  deleteAudienceSegment,
  getAudienceClustersSummary,
  classifyEpcPartner,
  getCoupons,
  createCoupon,
  updateCoupon,
  toggleCoupon,
  deleteCoupon,
  uploadMarketingMedia,
  getMarketingQueueStatus,
  clearMarketingQueue,
  handleUnsubscribe,
  getUnsubscribedList,
  suppressContact,
  resubscribeContact,
  ...segmentGroupsController
};
