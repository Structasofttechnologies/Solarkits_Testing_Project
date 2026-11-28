const mongoose = require('mongoose');
const crypto = require('crypto');
const XLSX = require('xlsx');
const PDFDocument = require('pdfkit');

const {
  LeadMaster,
  LeadSubgroup,
  LeadActivity,
  LeadAuditLog,
  LeadCampaign,
  LeadCampaignSegmentMapping,
  LeadCampaignRecipient,
  LeadCampaignEmailEvent,
  LeadConversion,
  LeadMarketingSettings
} = require('../models');
const { MarketingSender, MarketingTemplate, MarketingUnsubscribe } = require('../../marketing/models');
const {
  FranchiseeCluster,
  FranchiseLead,
  EpcAccount,
  EpcSignupRequest,
  EpcQuote,
  EpcOrder,
  ResellerAgreement
} = require('../../models/india_solarshop_db');
const emailService = require('../../marketing/services/email.service');
const { ensureLeadMarketingSeeded } = require('../services/seedLeadMarketing.service');
const { buildDateRangeFilter, generateUniqueCode, normalizeEmail } = require('../services/leadGeoResolver.service');
const { syncLiveConversions, recalculateCampaignStats } = require('../services/leadAttribution.service');
const { buildLeadFilterQuery, logAudit, VALID_PRIMARY_SEGMENTS } = require('./leadCrm.controller');
const { sendAdminNotification } = require('../../services/admin.notification.service');
const { GeoLevel1, GeoLevel2 } = require('../../models/geolocation_db');

const TRANSPARENT_GIF_BUFFER = Buffer.from(
  'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
  'base64'
);

const pct = (num, den) => (den > 0 ? Number(((num / den) * 100).toFixed(2)) : 0);

/**
 * 1. Dashboards: Overview (01) + Dedicated Segment Dashboards (03, 04, 05)
 */
const getOverviewDashboard = async (req, res) => {
  try {
    await ensureLeadMarketingSeeded();
    if (req.query.sync === 'true') await syncLiveConversions().catch(() => { });

    const dateRange = buildDateRangeFilter(req.query.date_preset, req.query.start_date, req.query.end_date);
    const leadMatch = { deleted_at: null };
    if (dateRange) leadMatch.created_at = dateRange;

    const [
      totalLeads,
      segmentCounts,
      subgroupsCount,
      campaigns,
      conversions,
      pendingFollowups,
      recentLeads,
      topStates,
      geoLeadsAll,
      liveClusters,
      activeStatesList
    ] = await Promise.all([
      LeadMaster.countDocuments(leadMatch),
      LeadMaster.aggregate([
        { $match: leadMatch },
        {
          $group: {
            _id: '$primary_segment_key',
            total: { $sum: 1 },
            active: { $sum: { $cond: ['$is_active', 1, 0] } },
            interested: {
              $sum: {
                $cond: [{ $in: ['$lead_status', ['Interested', 'Meeting Scheduled', 'Proposal Shared', 'Quotation Shared']] }, 1, 0]
              }
            }
          }
        }
      ]),
      LeadSubgroup.countDocuments({ deleted_at: null, is_active: true }),
      LeadCampaign.find({ deleted_at: null }).sort({ created_at: -1 }).lean(),
      LeadConversion.find(dateRange ? { converted_at: dateRange } : {}).lean(),
      LeadMaster.countDocuments({ deleted_at: null, lead_status: { $in: ['New', 'Not Contacted', 'Follow-up Required'] } }),
      LeadMaster.find({ deleted_at: null }).sort({ created_at: -1 }).limit(8).lean(),
      LeadMaster.aggregate([
        { $match: { deleted_at: null, state_name: { $ne: '' } } },
        { $group: { _id: '$state_name', leads: { $sum: 1 } } },
        { $sort: { leads: -1 } },
        { $limit: 8 }
      ]),
      LeadMaster.find(leadMatch)
        .select('primary_segment_key state_name district_name cluster_name is_active milestones')
        .lean(),
      FranchiseeCluster
        ? FranchiseeCluster.find({ deleted_at: null, is_active: true })
          .select('_id cluster_name cluster_code state_id state_name district_names status color_code')
          .sort({ cluster_name: 1 })
          .lean()
          .catch(() => [])
        : [],
      GeoLevel1
        ? GeoLevel1.find({ is_active: true, deleted_at: null }).select('_id name').sort({ name: 1 }).lean().catch(() => [])
        : []
    ]);

    const sent = campaigns.reduce((a, c) => a + Number(c.sent_count || 0), 0);
    const delivered = campaigns.reduce((a, c) => a + Number(c.delivered_count || 0), 0);
    const opens = campaigns.reduce((a, c) => a + Number(c.unique_opens_count || 0), 0);
    const clicks = campaigns.reduce((a, c) => a + Number(c.unique_clicks_count || 0), 0);

    const franchiseConversions = new Set(conversions.filter((c) => c.conversion_type === 'franchisee_converted').map((c) => String(c.lead_id))).size;
    const epcRegistrations = new Set(conversions.filter((c) => c.conversion_type === 'epc_registered').map((c) => String(c.lead_id))).size;
    const orderConversions = conversions.filter((c) => c.conversion_type === 'epc_commercial_order');
    const orderLeadCount = new Set(orderConversions.map((c) => String(c.lead_id))).size;
    const totalOrderRevenue = orderConversions.reduce((a, c) => a + Number(c.order_value_inr || 0), 0);
    const totalKw = orderConversions.reduce((a, c) => a + Number(c.order_capacity_kw || 0), 0);
    const uniqueConvertedLeads = new Set(conversions.map((c) => String(c.lead_id))).size;

    const campaignStatusCounts = {
      draft: campaigns.filter((c) => c.status === 'draft').length,
      scheduled: campaigns.filter((c) => c.status === 'scheduled').length,
      running: campaigns.filter((c) => c.status === 'running').length,
      paused: campaigns.filter((c) => c.status === 'paused').length,
      completed: campaigns.filter((c) => c.status === 'completed').length,
      cancelled: campaigns.filter((c) => c.status === 'cancelled').length,
      failed: campaigns.filter((c) => c.status === 'failed').length
    };

    // Build dynamic State / Cluster / District rollups seeded by live FranchiseeCluster & GeoLevel1
    const norm = (v) => String(v || '').trim().toLowerCase().replace(/[^a-z0-9]/g, '');
    const ovStates = new Map();
    const ovDistricts = new Map();
    const ovClusters = new Map();
    const districtClusterLookup = {};

    const ensureOverviewBucket = (map, key, label, extra = {}) => {
      if (!map.has(key)) {
        map.set(key, {
          name: label,
          unique_leads: 0,
          franchisee_leads: 0,
          epc_signup_leads: 0,
          epc_sales_leads: 0,
          active_leads: 0,
          converted_leads: 0,
          ...extra
        });
      }
      return map.get(key);
    };

    for (const st of activeStatesList) {
      ensureOverviewBucket(ovStates, norm(st.name), st.name, { cluster_count: 0 });
    }
    for (const clu of liveClusters) {
      const ck = norm(clu.cluster_name);
      const cluEntry = ensureOverviewBucket(ovClusters, ck, clu.cluster_name, {
        cluster_code: clu.cluster_code,
        state_name: clu.state_name,
        status: clu.status || 'available',
        district_names: clu.district_names || []
      });
      const stEntry = ensureOverviewBucket(ovStates, norm(clu.state_name), clu.state_name, { cluster_count: 0 });
      stEntry.cluster_count += 1;

      for (const dn of clu.district_names || []) {
        const dk = `${norm(clu.state_name)}::${norm(dn)}`;
        districtClusterLookup[dk] = {
          cluster_id: clu._id,
          cluster_name: clu.cluster_name,
          cluster_code: clu.cluster_code,
          status: clu.status || 'available'
        };
        ensureOverviewBucket(ovDistricts, dk, dn, {
          state_name: clu.state_name,
          cluster_name: clu.cluster_name,
          cluster_code: clu.cluster_code
        });
      }
      void cluEntry;
    }

    for (const l of geoLeadsAll) {
      const seg = l.primary_segment_key;
      const isLeadConverted = Boolean(
        l.milestones?.franchisee_converted?.is_converted ||
          l.milestones?.epc_registered?.is_registered ||
          l.milestones?.epc_sales_converted?.has_order
      );
      const bumpRow = (entry) => {
        if (!entry) return;
        entry.unique_leads += 1;
        if (entry[seg] !== undefined) entry[seg] += 1;
        if (l.is_active) entry.active_leads += 1;
        if (isLeadConverted) entry.converted_leads += 1;
      };
      if (l.state_name) bumpRow(ensureOverviewBucket(ovStates, norm(l.state_name), l.state_name, { cluster_count: 0 }));
      if (l.district_name) {
        const dk = `${norm(l.state_name || '')}::${norm(l.district_name)}`;
        const linkedClu = districtClusterLookup[dk];
        bumpRow(
          ensureOverviewBucket(ovDistricts, dk, l.district_name, {
            state_name: l.state_name || '',
            cluster_name: l.cluster_name || linkedClu?.cluster_name || '',
            cluster_code: linkedClu?.cluster_code || ''
          })
        );
        const cluName = l.cluster_name || linkedClu?.cluster_name || '';
        if (cluName) {
          bumpRow(ensureOverviewBucket(ovClusters, norm(cluName), cluName, { state_name: l.state_name || '', district_names: [] }));
        }
      } else if (l.cluster_name) {
        bumpRow(ensureOverviewBucket(ovClusters, norm(l.cluster_name), l.cluster_name, { state_name: l.state_name || '', district_names: [] }));
      }
    }

    const withConvRate = (row) => ({
      ...row,
      conversion_ratio: pct(row.converted_leads || 0, row.unique_leads || 0)
    });

    res.json({
      success: true,
      data: {
        summary: {
          total_leads: totalLeads,
          total_subgroups: subgroupsCount,
          total_campaigns: campaigns.length,
          completed_campaigns: campaignStatusCounts.completed,
          campaign_status_counts: campaignStatusCounts,
          active_clusters_count: liveClusters.length,
          emails_sent: sent,
          emails_delivered: delivered,
          unique_opens: opens,
          unique_clicks: clicks,
          open_rate: pct(opens, delivered),
          click_rate: pct(clicks, delivered),
          pending_followups: pendingFollowups,
          franchisee_converted: franchiseConversions,
          epc_registered: epcRegistrations,
          epc_buyer_leads: orderLeadCount,
          commercial_orders: orderConversions.length,
          total_revenue_inr: Math.round(totalOrderRevenue * 100) / 100,
          total_converted_kw: Math.round(totalKw * 100) / 100,
          unique_converted_leads: uniqueConvertedLeads,
          overall_conversion_ratio: pct(uniqueConvertedLeads, totalLeads)
        },
        segment_counts: segmentCounts,
        top_states: topStates,
        geo_overview: {
          states: Array.from(ovStates.values()).map(withConvRate).sort((a, b) => b.unique_leads - a.unique_leads || b.cluster_count - a.cluster_count),
          districts: Array.from(ovDistricts.values()).map(withConvRate).sort((a, b) => b.unique_leads - a.unique_leads),
          clusters: Array.from(ovClusters.values()).map(withConvRate).sort((a, b) => b.unique_leads - a.unique_leads),
          cluster_masters: liveClusters,
          district_cluster_map: districtClusterLookup
        },
        recent_campaigns: campaigns.slice(0, 15),
        recent_leads: recentLeads
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const getSegmentDashboard = async (req, res) => {
  try {
    await ensureLeadMarketingSeeded();
    const { segmentKey } = req.params;
    if (!VALID_PRIMARY_SEGMENTS.includes(segmentKey)) {
      return res.status(400).json({ success: false, message: 'Invalid primary segment key.' });
    }
    if (req.query.sync === 'true') await syncLiveConversions().catch(() => { });

    const filter = buildLeadFilterQuery({ ...req.query, primary_segment_key: segmentKey });
    const [leads, subgroups, liveClusters] = await Promise.all([
      LeadMaster.find(filter).sort({ created_at: -1 }).lean(),
      LeadSubgroup.find({ primary_segment_key: segmentKey, deleted_at: null, is_active: true }).sort({ sort_order: 1 }).lean(),
      FranchiseeCluster ? FranchiseeCluster.find({ is_active: true }).select('state_name status cluster_name district_names').lean().catch(() => []) : []
    ]);

    const subgroupStats = subgroups.map((sg) => ({
      _id: sg._id,
      name: sg.name,
      color: sg.color,
      count: leads.filter((l) => (l.subgroup_ids || []).some((id) => String(id) === String(sg._id))).length
    }));

    let kpis = {};
    if (segmentKey === 'franchisee_leads') {
      const [liveFranchiseInquiries, signedAgreements] = await Promise.all([
        FranchiseLead ? FranchiseLead.countDocuments({ deleted_at: null }).catch(() => 0) : 0,
        ResellerAgreement ? ResellerAgreement.countDocuments({ status: 'signed' }).catch(() => 0) : 0
      ]);
      const availableDistricts = new Set();
      for (const cl of liveClusters.filter((c) => c.status === 'available')) {
        (cl.district_names || []).forEach((d) => availableDistricts.add(d));
      }
      const hasSub = (kw) => leads.filter((l) => (l.subgroup_names || []).some((n) => n.toLowerCase().includes(kw))).length;
      kpis = {
        total_franchise_inquiries: leads.length,
        storefront_inquiries_live: liveFranchiseInquiries,
        new_franchise_leads: leads.filter((l) => l.lead_status === 'New').length,
        interested_franchise_leads: leads.filter((l) => l.lead_status === 'Interested').length,
        meetings_scheduled: leads.filter((l) => l.lead_status === 'Meeting Scheduled' || hasSub('meeting')).length,
        proposals_shared: leads.filter((l) => l.lead_status === 'Proposal Shared').length,
        payment_pending: hasSub('payment pending'),
        agreements_completed: signedAgreements,
        converted_franchisees: leads.filter((l) => l.milestones?.franchisee_converted?.is_converted || l.lead_status === 'Converted').length,
        districts_available: availableDistricts.size
      };
    } else if (segmentKey === 'epc_signup_leads') {
      const [liveSignups, liveVerifiedEpcs] = await Promise.all([
        EpcSignupRequest ? EpcSignupRequest.countDocuments({}).catch(() => 0) : 0,
        EpcAccount ? EpcAccount.countDocuments({ deleted_at: null, status: 'approved' }).catch(() => 0) : 0
      ]);
      const hasSub = (kw) => leads.filter((l) => (l.subgroup_names || []).some((n) => n.toLowerCase().includes(kw))).length;
      kpis = {
        total_epc_leads: leads.length,
        new_epc_leads: leads.filter((l) => l.lead_status === 'New').length,
        interested_epcs: leads.filter((l) => l.lead_status === 'Interested').length,
        signup_initiated_live: liveSignups,
        registration_pending: hasSub('registration pending'),
        gst_kyc_pending: hasSub('gst/kyc'),
        registered_epcs: leads.filter((l) => l.milestones?.epc_registered?.is_registered).length,
        live_portal_verified_epcs: liveVerifiedEpcs,
        inactive_epcs: hasSub('inactive'),
        reactivated_epcs: hasSub('reactivation')
      };
    } else {
      const [liveQuotesCount, orderConversions] = await Promise.all([
        EpcQuote ? EpcQuote.countDocuments({}).catch(() => 0) : 0,
        LeadConversion.find({
          lead_id: { $in: leads.map((l) => l._id) },
          conversion_type: 'epc_commercial_order'
        }).lean()
      ]);
      const hasSub = (kw) => leads.filter((l) => (l.subgroup_names || []).some((n) => n.toLowerCase().includes(kw))).length;
      const buyerOrderMap = new Map();
      for (const oc of orderConversions) {
        const lid = String(oc.lead_id);
        buyerOrderMap.set(lid, (buyerOrderMap.get(lid) || 0) + 1);
      }
      const repeatBuyers = Array.from(buyerOrderMap.values()).filter((cnt) => cnt >= 2).length;
      const totalConvertedKw = orderConversions.reduce((a, c) => a + Number(c.order_capacity_kw || 0), 0);
      kpis = {
        total_sales_leads: leads.length,
        trial_kit_inquiries: hasSub('trial kit leads'),
        trial_kit_orders: orderConversions.filter((o) => o.order_category === 'trial_order').length,
        loose_quantity_inquiries: hasSub('loose quantity'),
        bulk_po_inquiries: hasSub('bulk po'),
        government_tender_leads: hasSub('government tender'),
        quotations_generated: leads.reduce((a, l) => a + Number(l.milestones?.quote_count || 0), 0) || liveQuotesCount,
        commercial_orders_confirmed: orderConversions.length,
        repeat_buyers: repeatBuyers,
        total_converted_kw: Math.round(totalConvertedKw * 100) / 100
      };
    }

    res.json({
      success: true,
      data: {
        segment_key: segmentKey,
        kpis,
        subgroup_breakdown: subgroupStats,
        leads
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * 2. Geographical Lead Map (Section 7: World -> India -> District -> Cluster, Unique Lead IDs)
 */
const getGeoLeadMap = async (req, res) => {
  try {
    await ensureLeadMarketingSeeded();
    const filter = buildLeadFilterQuery(req.query);
    const [leads, clusters] = await Promise.all([
      LeadMaster.find(filter)
        .select('lead_id company_name contact_person email mobile_number country_name state_name district_name cluster_name primary_segment_key subgroup_names lead_status is_active assigned_bde_name milestones created_at')
        .lean(),
      FranchiseeCluster
        ? FranchiseeCluster.find({ deleted_at: null, is_active: true })
          .select('_id cluster_name cluster_code state_name district_names status color_code')
          .sort({ cluster_name: 1 })
          .lean()
          .catch(() => [])
        : []
    ]);

    const normTok = (v) => String(v || '').trim().toLowerCase().replace(/[^a-z0-9]/g, '');
    const countryMap = new Map();
    const stateMap = new Map();
    const districtMap = new Map();
    const clusterMap = new Map();
    const districtClusterMap = {};

    const ensureBucket = (map, key, label, extra = {}) => {
      if (!label) return null;
      if (!map.has(key)) {
        map.set(key, {
          name: label,
          unique_leads: 0,
          franchisee_leads: 0,
          epc_signup_leads: 0,
          epc_sales_leads: 0,
          active_leads: 0,
          inactive_leads: 0,
          registered_epcs: 0,
          converted_franchisees: 0,
          buyer_epcs: 0,
          subgroups: {},
          ...extra
        });
      }
      return map.get(key);
    };

    for (const clu of clusters) {
      ensureBucket(clusterMap, clu.cluster_name.toLowerCase(), clu.cluster_name, {
        cluster_code: clu.cluster_code,
        state_name: clu.state_name || '',
        status: clu.status || 'available',
        district_names: clu.district_names || []
      });
      if (clu.state_name) ensureBucket(stateMap, clu.state_name.toLowerCase(), clu.state_name);
      for (const dn of clu.district_names || []) {
        const dk = `${normTok(clu.state_name)}::${normTok(dn)}`;
        districtClusterMap[dk] = {
          cluster_id: clu._id,
          cluster_name: clu.cluster_name,
          cluster_code: clu.cluster_code,
          status: clu.status || 'available'
        };
        ensureBucket(districtMap, `${String(clu.state_name || '').toLowerCase()}::${dn.toLowerCase()}`, dn, {
          state_name: clu.state_name || '',
          cluster_name: clu.cluster_name,
          cluster_code: clu.cluster_code
        });
      }
    }

    const bump = (map, key, label, lead, extra = {}) => {
      if (!label) return null;
      const entry = ensureBucket(map, key, label, extra);
      entry.unique_leads += 1;
      if (entry[lead.primary_segment_key] !== undefined) entry[lead.primary_segment_key] += 1;
      if (lead.is_active) entry.active_leads += 1;
      else entry.inactive_leads += 1;
      if (lead.milestones?.epc_registered?.is_registered) entry.registered_epcs += 1;
      if (lead.milestones?.franchisee_converted?.is_converted) entry.converted_franchisees += 1;
      if (lead.milestones?.epc_sales_converted?.has_order) entry.buyer_epcs += 1;
      for (const sg of lead.subgroup_names || []) {
        entry.subgroups[sg] = (entry.subgroups[sg] || 0) + 1;
      }
      return entry;
    };

    for (const l of leads) {
      const cn = l.country_name || 'India';
      bump(countryMap, cn.toLowerCase(), cn, l);
      if (l.state_name) bump(stateMap, l.state_name.toLowerCase(), l.state_name, l);
      const dkNorm = `${normTok(l.state_name || '')}::${normTok(l.district_name || '')}`;
      const linkedClu = districtClusterMap[dkNorm];
      const resolvedClusterName = l.cluster_name || linkedClu?.cluster_name || '';

      if (l.district_name) {
        const dk = `${String(l.state_name || '').toLowerCase()}::${l.district_name.toLowerCase()}`;
        const dEntry = bump(districtMap, dk, l.district_name, l, {
          state_name: l.state_name || '',
          cluster_name: resolvedClusterName,
          cluster_code: linkedClu?.cluster_code || ''
        });
        if (dEntry && resolvedClusterName && !dEntry.cluster_name) {
          dEntry.cluster_name = resolvedClusterName;
          dEntry.cluster_code = linkedClu?.cluster_code || '';
        }
      }
      if (resolvedClusterName) {
        const cEntry = bump(clusterMap, resolvedClusterName.toLowerCase(), resolvedClusterName, l, {
          state_name: l.state_name || ''
        });
        if (cEntry && !cEntry.state_name) cEntry.state_name = l.state_name || '';
      }
    }

    res.json({
      success: true,
      data: {
        total_unique_leads: leads.length,
        countries: Array.from(countryMap.values()).sort((a, b) => b.unique_leads - a.unique_leads),
        states: Array.from(stateMap.values()).sort((a, b) => b.unique_leads - a.unique_leads),
        districts: Array.from(districtMap.values()).sort((a, b) => b.unique_leads - a.unique_leads),
        clusters: Array.from(clusterMap.values()).sort((a, b) => b.unique_leads - a.unique_leads),
        cluster_masters: clusters,
        district_cluster_map: districtClusterMap,
        filtered_leads: leads.slice(0, 500)
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * 3. Email Campaigns (Create, Audience Preview, Schedule/Launch, Test Send)
 */
const resolveCampaignTargetLeads = async (targeting = {}) => {
  const settings = await LeadMarketingSettings.findOne({ key: 'global' }).lean().catch(() => null);
  const enforceSuppress = settings?.email_sending_controls?.enforce_suppression_check !== false;

  const q = { deleted_at: null, is_active: true };
  if (enforceSuppress) q.is_unsubscribed = { $ne: true };

  if (Array.isArray(targeting.manual_lead_ids) && targeting.manual_lead_ids.length > 0) {
    const manualIds = targeting.manual_lead_ids.filter((id) => mongoose.Types.ObjectId.isValid(String(id))).map((id) => new mongoose.Types.ObjectId(String(id)));
    if (manualIds.length > 0) q._id = { $in: manualIds };
  } else {
    if (Array.isArray(targeting.target_primary_segments) && targeting.target_primary_segments.length > 0) {
      q.primary_segment_key = { $in: targeting.target_primary_segments };
    }
    if (Array.isArray(targeting.target_subgroup_ids) && targeting.target_subgroup_ids.length > 0) {
      const sIds = targeting.target_subgroup_ids.filter((id) => mongoose.Types.ObjectId.isValid(String(id))).map((id) => new mongoose.Types.ObjectId(String(id)));
      if (sIds.length > 0) q.subgroup_ids = { $in: sIds };
    }
    if (Array.isArray(targeting.country_names) && targeting.country_names.length > 0) {
      q.country_name = { $in: targeting.country_names };
    }
    if (Array.isArray(targeting.state_names) && targeting.state_names.length > 0) {
      q.state_name = { $in: targeting.state_names };
    }
    if (Array.isArray(targeting.district_names) && targeting.district_names.length > 0) {
      q.district_name = { $in: targeting.district_names };
    }
    if (Array.isArray(targeting.cluster_names) && targeting.cluster_names.length > 0) {
      q.cluster_name = { $in: targeting.cluster_names };
    }
    if (Array.isArray(targeting.target_lead_statuses) && targeting.target_lead_statuses.length > 0) {
      q.lead_status = { $in: targeting.target_lead_statuses };
    }
    if (Array.isArray(targeting.target_bde_ids) && targeting.target_bde_ids.length > 0) {
      const bIds = targeting.target_bde_ids.filter((id) => mongoose.Types.ObjectId.isValid(String(id))).map((id) => new mongoose.Types.ObjectId(String(id)));
      if (bIds.length > 0) q.assigned_bde_id = { $in: bIds };
    }
  }

  const candidates = await LeadMaster.find(q).lean();
  const unsubSet = new Set(
    enforceSuppress && MarketingUnsubscribe
      ? (await MarketingUnsubscribe.find({ is_active: true }).select('email').lean()).map((u) => normalizeEmail(u.email)).filter(Boolean)
      : []
  );

  const eligible = [];
  let suppressedSkipped = 0;
  let noEmailSkipped = 0;

  for (const lead of candidates) {
    const em = normalizeEmail(lead.email);
    if (!em || !em.includes('@')) {
      noEmailSkipped += 1;
      continue;
    }
    if (unsubSet.has(em)) {
      suppressedSkipped += 1;
      continue;
    }
    eligible.push(lead);
  }

  return { eligible, suppressedSkipped, noEmailSkipped };
};

const previewCampaignAudience = async (req, res) => {
  try {
    const result = await resolveCampaignTargetLeads(req.body || {});
    res.json({
      success: true,
      data: {
        eligible_count: result.eligible.length,
        suppressed_skipped: result.suppressedSkipped,
        no_email_skipped: result.noEmailSkipped,
        sample: result.eligible.slice(0, 40)
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const listCampaigns = async (req, res) => {
  try {
    const campaigns = await LeadCampaign.find({ deleted_at: null })
      .populate('email_sender_id', 'name email_provider from_email from_name')
      .sort({ created_at: -1 })
      .lean();
    res.json({ success: true, data: campaigns });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const executeLeadCampaignDispatch = async (campaignId) => {
  const campaign = await LeadCampaign.findById(campaignId);
  if (!campaign || campaign.deleted_at) throw new Error('Campaign not found');

  campaign.status = 'running';
  campaign.started_at = campaign.started_at || new Date();
  campaign.paused_at = null;
  campaign.cancelled_at = null;
  await campaign.save();

  sendAdminNotification({
    title: `Lead Campaign Started: ${campaign.campaign_name}`,
    message: `Lead Marketing campaign "${campaign.campaign_name}" (${campaign.campaign_code}) is now running.`,
    category: 'marketing',
    priority: 'normal',
    action_url: '/lead-marketing-panel/campaigns',
    metadata: { panel: 'lead_marketing', event: 'campaign_started', campaign_id: String(campaign._id), campaign_code: campaign.campaign_code }
  }).catch(() => { });

  const { eligible } = await resolveCampaignTargetLeads(campaign.toObject());
  const sender = campaign.email_sender_id
    ? await MarketingSender.findById(campaign.email_sender_id).lean()
    : await MarketingSender.findOne({ type: 'email', is_active: true }).sort({ is_default: -1 }).lean();

  const settings = await LeadMarketingSettings.findOne({ key: 'global' }).lean().catch(() => null);
  const ratePerMin = Number(settings?.email_sending_controls?.rate_per_minute || 60);
  const delayMs = Math.max(50, Math.min(2000, Math.floor(60000 / Math.max(1, ratePerMin))));

  const apiBase = process.env.PUBLIC_BACKEND_URL || process.env.BACKEND_URL || `http://localhost:${process.env.PORT || 5000}`;

  for (const lead of eligible) {
    const liveCampaignState = await LeadCampaign.findById(campaign._id).select('status').lean();
    if (!liveCampaignState || ['paused', 'cancelled', 'draft'].includes(liveCampaignState.status)) {
      await recalculateCampaignStats(campaign._id);
      return await LeadCampaign.findById(campaign._id);
    }

    const existingRec = await LeadCampaignRecipient.findOne({ campaign_id: campaign._id, lead_id: lead._id }).lean();
    if (existingRec && ['sent', 'delivered'].includes(existingRec.status)) continue;

    const token = existingRec?.tracking_token || crypto.randomBytes(12).toString('hex');
    const recipient = await LeadCampaignRecipient.findOneAndUpdate(
      { campaign_id: campaign._id, lead_id: lead._id },
      {
        $setOnInsert: {
          campaign_id: campaign._id,
          lead_id: lead._id,
          lead_code: lead.lead_id,
          company_name: lead.company_name,
          contact_person: lead.contact_person || lead.company_name,
          email: lead.email,
          primary_segment_key: lead.primary_segment_key,
          subgroup_names: lead.subgroup_names || [],
          country_name: lead.country_name || 'India',
          state_name: lead.state_name || '',
          district_name: lead.district_name || '',
          cluster_name: lead.cluster_name || '',
          assigned_bde_id: lead.assigned_bde_id || null,
          tracking_token: token
        }
      },
      { upsert: true, new: true }
    );

    const trackingUrl = `${apiBase}/admin-api/lead-marketing/track/click/${token}?dest=${encodeURIComponent(campaign.landing_page_url || 'https://solarkits.in')}`;
    const unsubscribeUrl = `${apiBase}/admin-api/lead-marketing/track/unsubscribe/${token}`;
    const openPixel = `<img src="${apiBase}/admin-api/lead-marketing/track/open/${token}" width="1" height="1" style="display:none;border:0;" alt="" />`;

    const vars = {
      name: lead.contact_person || lead.company_name,
      company_name: lead.company_name,
      lead_id: lead.lead_id,
      state: lead.state_name || '',
      district: lead.district_name || '',
      cluster: lead.cluster_name || '',
      tracking_url: trackingUrl,
      unsubscribe_url: unsubscribeUrl
    };

    const renderedSubject = emailService.interpolate(campaign.subject, vars);
    let renderedHtml = emailService.interpolate(campaign.html_content || `<p>${campaign.preview_text || campaign.campaign_name}</p>`, vars);
    renderedHtml = renderedHtml.includes('</body>') ? renderedHtml.replace('</body>', `${openPixel}</body>`) : `${renderedHtml}${openPixel}`;

    const sendRes = sender
      ? await emailService.sendEmail({
        senderId: sender._id,
        to: lead.email,
        subject: renderedSubject,
        htmlContent: renderedHtml,
        unsubscribeUrl,
        variables: vars
      })
      : { success: false, error: 'No active email sender configured in Email Settings' };

    if (sendRes.success) {
      await LeadCampaignRecipient.updateOne(
        { _id: recipient._id },
        {
          $set: {
            status: 'delivered',
            provider_message_id: sendRes.messageId || null,
            sent_at: new Date(),
            delivered_at: new Date()
          }
        }
      );
      await LeadCampaignEmailEvent.insertMany([
        { campaign_id: campaign._id, recipient_id: recipient._id, lead_id: lead._id, event_type: 'sent' },
        { campaign_id: campaign._id, recipient_id: recipient._id, lead_id: lead._id, event_type: 'delivered' }
      ]);
      await LeadActivity.create({
        lead_id: lead._id,
        lead_code: lead.lead_id,
        activity_type: 'email_sent',
        campaign_id: campaign._id,
        notes: `Email sent via campaign "${campaign.campaign_name}" (${campaign.campaign_code}).`,
        actor_name: campaign.campaign_owner_name || 'Admin'
      }).catch(() => { });
    } else {
      await LeadCampaignRecipient.updateOne(
        { _id: recipient._id },
        { $set: { status: 'failed', error_message: sendRes.error || 'Dispatch error' } }
      );
    }

    if (eligible.length > 1) {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }

  const finalCheck = await LeadCampaign.findById(campaign._id).select('status').lean();
  if (finalCheck && finalCheck.status === 'running') {
    campaign.status = 'completed';
    campaign.completed_at = new Date();
    await campaign.save();
    await recalculateCampaignStats(campaign._id);
    const completedFresh = await LeadCampaign.findById(campaign._id).lean();
    sendAdminNotification({
      title: `Lead Campaign Completed: ${campaign.campaign_name}`,
      message: `Lead campaign "${campaign.campaign_name}" (${campaign.campaign_code}) completed. Sent: ${completedFresh?.sent_count || 0}, Delivered: ${completedFresh?.delivered_count || 0}.`,
      category: 'marketing',
      priority: 'normal',
      action_url: '/lead-marketing-panel/campaigns',
      metadata: { panel: 'lead_marketing', event: 'campaign_completed', campaign_id: String(campaign._id), campaign_code: campaign.campaign_code }
    }).catch(() => { });
  } else {
    await recalculateCampaignStats(campaign._id);
  }
  return await LeadCampaign.findById(campaign._id);
};

const createLeadCampaign = async (req, res) => {
  try {
    await ensureLeadMarketingSeeded();
    const b = req.body || {};
    if (!b.campaign_name || !b.subject) {
      return res.status(400).json({ success: false, message: 'Campaign Name and Email Subject are required.' });
    }

    const code = await generateUniqueCode(LeadCampaign, 'campaign_code', 'LCMP');
    const preview = await resolveCampaignTargetLeads(b);

    const campaign = await LeadCampaign.create({
      campaign_code: code,
      campaign_name: String(b.campaign_name).trim(),
      campaign_objective: b.campaign_objective || 'Lead Engagement & Conversion',
      campaign_category: b.campaign_category || 'General Promotional',
      target_primary_segments: Array.isArray(b.target_primary_segments) ? b.target_primary_segments : [],
      target_subgroup_ids: Array.isArray(b.target_subgroup_ids) ? b.target_subgroup_ids : [],
      country_names: Array.isArray(b.country_names) ? b.country_names : [],
      state_names: Array.isArray(b.state_names) ? b.state_names : [],
      district_names: Array.isArray(b.district_names) ? b.district_names : [],
      cluster_ids: Array.isArray(b.cluster_ids) ? b.cluster_ids : [],
      cluster_names: Array.isArray(b.cluster_names) ? b.cluster_names : [],
      target_lead_statuses: Array.isArray(b.target_lead_statuses) ? b.target_lead_statuses : [],
      target_bde_ids: Array.isArray(b.target_bde_ids) ? b.target_bde_ids : [],
      manual_lead_ids: Array.isArray(b.manual_lead_ids) ? b.manual_lead_ids : [],
      email_sender_id: mongoose.Types.ObjectId.isValid(String(b.email_sender_id || '')) ? b.email_sender_id : null,
      email_template_id: mongoose.Types.ObjectId.isValid(String(b.email_template_id || '')) ? b.email_template_id : null,
      subject: String(b.subject).trim(),
      preview_text: b.preview_text || '',
      html_content: b.html_content || '',
      cta_text: b.cta_text || 'Learn More',
      landing_page_url: b.landing_page_url || 'https://solarkits.in',
      blocks_json: b.blocks_json || null,
      schedule_mode: b.schedule_mode || 'draft',
      scheduled_at: b.scheduled_at ? new Date(b.scheduled_at) : null,
      attribution_window_days: Number(b.attribution_window_days || 30),
      campaign_owner_id: req.user?._id || null,
      campaign_owner_name: b.campaign_owner_name || req.user?.name || 'Admin',
      status: b.schedule_mode === 'scheduled' ? 'scheduled' : 'draft',
      total_target_leads: preview.eligible.length
    });

    const segMapDocs = [];
    for (const segKey of campaign.target_primary_segments || []) {
      segMapDocs.push({ campaign_id: campaign._id, primary_segment_key: segKey });
    }
    if (segMapDocs.length > 0) {
      await LeadCampaignSegmentMapping.insertMany(segMapDocs).catch(() => { });
    }

    sendAdminNotification({
      title: `Lead Campaign Created: ${campaign.campaign_name}`,
      message: `${req.user?.name || 'Admin'} created "${campaign.campaign_name}" (${campaign.campaign_code}) targeting ${preview.eligible.length} leads [${campaign.status}].`,
      category: 'marketing',
      priority: 'normal',
      action_url: '/lead-marketing-panel/campaigns',
      metadata: { panel: 'lead_marketing', event: 'campaign_created', campaign_id: String(campaign._id), campaign_code: campaign.campaign_code }
    }).catch(() => { });

    if (b.schedule_mode === 'immediate' || b.launch_immediately === true) {
      executeLeadCampaignDispatch(campaign._id).catch((err) => {
        console.error('Lead campaign async dispatch error:', err.message);
      });
    } else if (b.schedule_mode === 'scheduled' && campaign.scheduled_at) {
      const waitMs = campaign.scheduled_at.getTime() - Date.now();
      if (waitMs > 0 && waitMs < 7 * 86400000) {
        setTimeout(() => executeLeadCampaignDispatch(campaign._id).catch(() => { }), waitMs);
      }
    }

    await logAudit(req, { action: 'CREATE_CAMPAIGN', entity_type: 'lm_campaigns', entity_id: campaign.campaign_code, summary: `Created campaign "${campaign.campaign_name}" (${preview.eligible.length} leads)` });
    res.status(201).json({ success: true, data: campaign });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const updateLeadCampaign = async (req, res) => {
  try {
    await ensureLeadMarketingSeeded();
    const existing = await LeadCampaign.findById(req.params.id);
    if (!existing || existing.deleted_at) return res.status(404).json({ success: false, message: 'Campaign not found' });
    if (existing.status === 'running') {
      return res.status(400).json({ success: false, message: 'Cannot edit a running campaign. Pause it first.' });
    }

    const b = req.body || {};
    if (!b.campaign_name || !b.subject) {
      return res.status(400).json({ success: false, message: 'Campaign Name and Email Subject are required.' });
    }

    const preview = await resolveCampaignTargetLeads(b);
    const nextStatus = b.schedule_mode === 'scheduled' ? 'scheduled' : 'draft';

    const campaign = await LeadCampaign.findByIdAndUpdate(
      existing._id,
      {
        $set: {
          campaign_name: String(b.campaign_name).trim(),
          campaign_objective: b.campaign_objective || existing.campaign_objective,
          campaign_category: b.campaign_category || existing.campaign_category,
          target_primary_segments: Array.isArray(b.target_primary_segments) ? b.target_primary_segments : [],
          target_subgroup_ids: Array.isArray(b.target_subgroup_ids) ? b.target_subgroup_ids : [],
          country_names: Array.isArray(b.country_names) ? b.country_names : [],
          state_names: Array.isArray(b.state_names) ? b.state_names : [],
          district_names: Array.isArray(b.district_names) ? b.district_names : [],
          cluster_ids: Array.isArray(b.cluster_ids) ? b.cluster_ids : [],
          cluster_names: Array.isArray(b.cluster_names) ? b.cluster_names : [],
          target_lead_statuses: Array.isArray(b.target_lead_statuses) ? b.target_lead_statuses : [],
          target_bde_ids: Array.isArray(b.target_bde_ids) ? b.target_bde_ids : [],
          manual_lead_ids: Array.isArray(b.manual_lead_ids) ? b.manual_lead_ids : [],
          email_sender_id: mongoose.Types.ObjectId.isValid(String(b.email_sender_id || '')) ? b.email_sender_id : null,
          email_template_id: mongoose.Types.ObjectId.isValid(String(b.email_template_id || '')) ? b.email_template_id : null,
          subject: String(b.subject).trim(),
          preview_text: b.preview_text || '',
          html_content: b.html_content || '',
          cta_text: b.cta_text || 'Learn More',
          landing_page_url: b.landing_page_url || 'https://solarkits.in',
          blocks_json: b.blocks_json || null,
          schedule_mode: b.schedule_mode || 'draft',
          scheduled_at: b.scheduled_at ? new Date(b.scheduled_at) : null,
          attribution_window_days: Number(b.attribution_window_days || 30),
          campaign_owner_name: b.campaign_owner_name || existing.campaign_owner_name || 'Admin',
          status: nextStatus,
          paused_at: null,
          cancelled_at: null,
          total_target_leads: preview.eligible.length
        }
      },
      { new: true }
    ).lean();

    await LeadCampaignSegmentMapping.deleteMany({ campaign_id: campaign._id });
    const segMapDocs = (campaign.target_primary_segments || []).map((segKey) => ({
      campaign_id: campaign._id,
      primary_segment_key: segKey
    }));
    if (segMapDocs.length > 0) {
      await LeadCampaignSegmentMapping.insertMany(segMapDocs).catch(() => { });
    }

    if (b.schedule_mode === 'immediate' || b.launch_immediately === true) {
      executeLeadCampaignDispatch(campaign._id).catch((err) => {
        console.error('Lead campaign async dispatch error:', err.message);
      });
    } else if (b.schedule_mode === 'scheduled' && campaign.scheduled_at) {
      const waitMs = new Date(campaign.scheduled_at).getTime() - Date.now();
      if (waitMs > 0 && waitMs < 7 * 86400000) {
        setTimeout(() => executeLeadCampaignDispatch(campaign._id).catch(() => { }), waitMs);
      }
    }

    await logAudit(req, { action: 'UPDATE_CAMPAIGN', entity_type: 'lm_campaigns', entity_id: campaign.campaign_code, summary: `Updated campaign "${campaign.campaign_name}" (${preview.eligible.length} leads)` });
    res.json({ success: true, data: campaign, message: `Campaign "${campaign.campaign_name}" updated.` });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const launchCampaignNow = async (req, res) => {
  try {
    const campaign = await LeadCampaign.findById(req.params.id).lean();
    if (!campaign || campaign.deleted_at) return res.status(404).json({ success: false, message: 'Campaign not found' });
    const updated = await executeLeadCampaignDispatch(campaign._id);
    await logAudit(req, { action: 'START_CAMPAIGN', entity_type: 'lm_campaigns', entity_id: campaign.campaign_code, summary: `Started campaign "${campaign.campaign_name}"` });
    res.json({ success: true, data: updated, message: `Campaign "${campaign.campaign_name}" started.` });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const resumeLeadCampaign = async (req, res) => {
  try {
    const campaign = await LeadCampaign.findById(req.params.id).lean();
    if (!campaign || campaign.deleted_at) return res.status(404).json({ success: false, message: 'Campaign not found' });
    const updated = await executeLeadCampaignDispatch(campaign._id);
    await logAudit(req, { action: 'RESUME_CAMPAIGN', entity_type: 'lm_campaigns', entity_id: campaign.campaign_code, summary: `Resumed campaign "${campaign.campaign_name}"` });
    res.json({ success: true, data: updated, message: `Campaign "${campaign.campaign_name}" resumed.` });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const pauseLeadCampaign = async (req, res) => {
  try {
    const campaign = await LeadCampaign.findOneAndUpdate(
      { _id: req.params.id, deleted_at: null, status: { $in: ['running', 'scheduled'] } },
      { $set: { status: 'paused', paused_at: new Date() } },
      { new: true }
    ).lean();
    if (!campaign) return res.status(400).json({ success: false, message: 'Only running or scheduled campaigns can be paused.' });
    await logAudit(req, { action: 'PAUSE_CAMPAIGN', entity_type: 'lm_campaigns', entity_id: campaign.campaign_code, summary: `Paused campaign "${campaign.campaign_name}"` });
    sendAdminNotification({
      title: `Lead Campaign Paused: ${campaign.campaign_name}`,
      message: `${req.user?.name || 'Admin'} paused Lead Marketing campaign "${campaign.campaign_name}" (${campaign.campaign_code}).`,
      category: 'marketing',
      priority: 'normal',
      action_url: '/lead-marketing-panel/campaigns',
      metadata: { panel: 'lead_marketing', event: 'campaign_paused', campaign_id: String(campaign._id) }
    }).catch(() => { });
    res.json({ success: true, data: campaign, message: 'Lead campaign paused.' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const cancelLeadCampaign = async (req, res) => {
  try {
    const campaign = await LeadCampaign.findOneAndUpdate(
      { _id: req.params.id, deleted_at: null, status: { $in: ['draft', 'scheduled', 'running', 'paused'] } },
      { $set: { status: 'cancelled', cancelled_at: new Date(), completed_at: new Date() } },
      { new: true }
    ).lean();
    if (!campaign) return res.status(400).json({ success: false, message: 'Campaign already completed or stopped/cancelled.' });
    await logAudit(req, { action: 'CANCEL_CAMPAIGN', entity_type: 'lm_campaigns', entity_id: campaign.campaign_code, summary: `Stopped/Cancelled campaign "${campaign.campaign_name}"` });
    sendAdminNotification({
      title: `Lead Campaign Stopped/Cancelled: ${campaign.campaign_name}`,
      message: `${req.user?.name || 'Admin'} stopped Lead Marketing campaign "${campaign.campaign_name}" (${campaign.campaign_code}).`,
      category: 'marketing',
      priority: 'high',
      action_url: '/lead-marketing-panel/campaigns',
      metadata: { panel: 'lead_marketing', event: 'campaign_cancelled', campaign_id: String(campaign._id) }
    }).catch(() => { });
    res.json({ success: true, data: campaign, message: 'Lead campaign stopped/cancelled.' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const draftLeadCampaign = async (req, res) => {
  try {
    const campaign = await LeadCampaign.findOneAndUpdate(
      { _id: req.params.id, deleted_at: null },
      { $set: { status: 'draft', paused_at: null, cancelled_at: null } },
      { new: true }
    ).lean();
    if (!campaign) return res.status(404).json({ success: false, message: 'Campaign not found' });
    await logAudit(req, { action: 'DRAFT_CAMPAIGN', entity_type: 'lm_campaigns', entity_id: campaign.campaign_code, summary: `Moved campaign "${campaign.campaign_name}" to Draft` });
    sendAdminNotification({
      title: `Lead Campaign Saved as Draft: ${campaign.campaign_name}`,
      message: `${req.user?.name || 'Admin'} moved Lead campaign "${campaign.campaign_name}" (${campaign.campaign_code}) to Draft.`,
      category: 'marketing',
      priority: 'normal',
      action_url: '/lead-marketing-panel/campaigns',
      metadata: { panel: 'lead_marketing', event: 'campaign_drafted', campaign_id: String(campaign._id) }
    }).catch(() => { });
    res.json({ success: true, data: campaign, message: 'Lead campaign moved to Draft.' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const rerunLeadCampaign = async (req, res) => {
  try {
    const campaign = await LeadCampaign.findById(req.params.id).lean();
    if (!campaign || campaign.deleted_at) return res.status(404).json({ success: false, message: 'Campaign not found' });
    await LeadCampaignRecipient.deleteMany({ campaign_id: campaign._id });
    await LeadCampaign.updateOne(
      { _id: campaign._id },
      { $set: { status: 'draft', sent_count: 0, delivered_count: 0, failed_count: 0, paused_at: null, cancelled_at: null, completed_at: null } }
    );
    await logAudit(req, { action: 'RERUN_CAMPAIGN', entity_type: 'lm_campaigns', entity_id: campaign.campaign_code, summary: `Reran campaign "${campaign.campaign_name}"` });
    const updated = await executeLeadCampaignDispatch(campaign._id);
    res.json({ success: true, data: updated, message: `Campaign "${campaign.campaign_name}" rerun dispatched.` });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const testLeadEmail = async (req, res) => {
  try {
    const { to, subject = 'SolarKits Lead Marketing Test', html_content = '<p>Test message</p>', email_sender_id } = req.body || {};
    if (!to) return res.status(400).json({ success: false, message: 'Recipient test email required.' });
    const sender = email_sender_id
      ? await MarketingSender.findById(email_sender_id).lean()
      : await MarketingSender.findOne({ type: 'email', is_active: true }).sort({ is_default: -1 }).lean();
    if (!sender) {
      return res.status(400).json({ success: false, message: 'No active Email Sender configured. Configure one in EPC Marketing Email Settings first.' });
    }
    const result = await emailService.sendEmail({
      senderId: sender._id,
      to,
      subject,
      htmlContent: html_content
    });
    res.status(result.success ? 200 : 400).json(result);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * 4. Public Tracking, Bot-Prefetch Heuristics, Unsubscribe & Webhook Handlers (FRD 16.2)
 */
const isSuspectedPrefetchUa = (ua = '') => {
  const s = String(ua || '').toLowerCase();
  return s.includes('googleimageproxy') || s.includes('apple') || s.includes('barracuda') || s.includes('mimecast') || s.includes('proofpoint');
};

const trackEmailOpen = async (req, res) => {
  res.set({ 'Content-Type': 'image/gif', 'Cache-Control': 'no-store, no-cache, must-revalidate' });
  res.send(TRANSPARENT_GIF_BUFFER);
  try {
    const recipient = await LeadCampaignRecipient.findOne({ tracking_token: req.params.token });
    if (!recipient) return;
    const isBot = isSuspectedPrefetchUa(req.headers['user-agent']);
    const now = new Date();
    recipient.first_opened_at = recipient.first_opened_at || now;
    recipient.last_opened_at = now;
    recipient.open_count = (recipient.open_count || 0) + 1;
    if (isBot) recipient.suspected_bot_open = true;
    await recipient.save();
    await LeadCampaignEmailEvent.create({
      campaign_id: recipient.campaign_id,
      recipient_id: recipient._id,
      lead_id: recipient.lead_id,
      event_type: 'open',
      is_suspected_bot_prefetch: isBot,
      ip_address: req.ip,
      user_agent: req.headers['user-agent'] || ''
    });
    await recalculateCampaignStats(recipient.campaign_id);
  } catch {
    // non-fatal
  }
};

const trackEmailClick = async (req, res) => {
  const dest = req.query.dest || 'https://solarkits.in';
  try {
    const recipient = await LeadCampaignRecipient.findOne({ tracking_token: req.params.token });
    if (recipient) {
      const now = new Date();
      recipient.first_clicked_at = recipient.first_clicked_at || now;
      recipient.last_clicked_at = now;
      recipient.click_count = (recipient.click_count || 0) + 1;
      await recipient.save();
      await LeadCampaignEmailEvent.create({
        campaign_id: recipient.campaign_id,
        recipient_id: recipient._id,
        lead_id: recipient.lead_id,
        event_type: 'click',
        link_url: dest,
        is_suspected_bot_prefetch: isSuspectedPrefetchUa(req.headers['user-agent']),
        ip_address: req.ip,
        user_agent: req.headers['user-agent'] || ''
      });
      await recalculateCampaignStats(recipient.campaign_id);
    }
  } catch {
    // non-fatal
  }
  return res.redirect(dest);
};

const trackLeadUnsubscribe = async (req, res) => {
  try {
    const recipient = await LeadCampaignRecipient.findOne({ tracking_token: req.params.token });
    if (recipient) {
      recipient.unsubscribed_at = new Date();
      await recipient.save();
      await LeadMaster.updateOne(
        { _id: recipient.lead_id },
        { $set: { is_unsubscribed: true, unsubscribed_at: new Date(), lead_status: 'Unsubscribed' } }
      );
      if (MarketingUnsubscribe && recipient.email) {
        await MarketingUnsubscribe.findOneAndUpdate(
          { email: normalizeEmail(recipient.email) },
          { $set: { email: normalizeEmail(recipient.email), is_active: true, source: 'email_footer_click', unsubscribed_at: new Date() } },
          { upsert: true }
        );
      }
      await LeadCampaignEmailEvent.create({
        campaign_id: recipient.campaign_id,
        recipient_id: recipient._id,
        lead_id: recipient.lead_id,
        event_type: 'unsubscribe'
      });
      await recalculateCampaignStats(recipient.campaign_id);
    }
    res.send('<html><body style="font-family:Arial,sans-serif;text-align:center;padding:48px;"><h2>You have been unsubscribed from SolarKits email updates.</h2></body></html>');
  } catch (error) {
    res.status(500).send(error.message);
  }
};

const recordManualOrWebhookEvent = async (req, res) => {
  try {
    const { campaign_id, lead_id, event_type = 'inquiry', link_url = null } = req.body || {};
    const recipient = await LeadCampaignRecipient.findOne({ campaign_id, lead_id });
    if (recipient) {
      const now = new Date();
      if (event_type === 'inquiry') recipient.inquired_at = recipient.inquired_at || now;
      if (event_type === 'quote') recipient.quoted_at = recipient.quoted_at || now;
      if (event_type === 'bounced') {
        recipient.status = 'bounced';
        recipient.bounced_at = now;
      }
      await recipient.save();
      await LeadCampaignEmailEvent.create({
        campaign_id,
        recipient_id: recipient._id,
        lead_id,
        event_type,
        link_url,
        raw_payload: req.body
      });
      await recalculateCampaignStats(campaign_id);
    }
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * 5. Individual Campaign Analytics + Geo Map + Funnel (FRD Section 9)
 */
const getIndividualCampaignAnalytics = async (req, res) => {
  try {
    await ensureLeadMarketingSeeded();
    if (req.query.sync === 'true') await syncLiveConversions().catch(() => { });

    const campaignId = req.params.id;
    const campaign = await LeadCampaign.findById(campaignId).lean();
    if (!campaign) return res.status(404).json({ success: false, message: 'Campaign not found' });

    const recQuery = { campaign_id: campaign._id };
    if (req.query.primary_segment_key) recQuery.primary_segment_key = req.query.primary_segment_key;
    if (req.query.country_name && req.query.country_name !== 'ALL') recQuery.country_name = req.query.country_name;
    if (req.query.state_name && req.query.state_name !== 'ALL') recQuery.state_name = req.query.state_name;
    if (req.query.district_name && req.query.district_name !== 'ALL') recQuery.district_name = req.query.district_name;
    if (req.query.cluster_name && req.query.cluster_name !== 'ALL') recQuery.cluster_name = req.query.cluster_name;

    const recipients = await LeadCampaignRecipient.find(recQuery).lean();
    const leadIds = recipients.map((r) => r.lead_id);
    const conversions = await LeadConversion.find({
      lead_id: { $in: leadIds },
      $or: [{ last_touch_campaign_id: campaign._id }, { first_touch_campaign_id: campaign._id }]
    }).lean();

    const uniqueConvLeadSet = new Set(conversions.map((c) => String(c.lead_id)));
    const targetLeads = recipients.length;
    const sent = recipients.filter((r) => ['sent', 'delivered'].includes(r.status) || r.sent_at).length;
    const delivered = recipients.filter((r) => r.status === 'delivered' || r.delivered_at).length;
    const bounced = recipients.filter((r) => r.status === 'bounced' || r.bounced_at).length;
    const uniqueOpens = recipients.filter((r) => r.first_opened_at).length;
    const suspectedBotOpens = recipients.filter((r) => r.suspected_bot_open).length;
    const uniqueClicks = recipients.filter((r) => r.first_clicked_at).length;
    const unsubscribed = recipients.filter((r) => r.unsubscribed_at).length;
    const inquiries = recipients.filter((r) => r.inquired_at).length;
    const quotations = recipients.filter((r) => r.quoted_at).length;
    const convertedLeads = uniqueConvLeadSet.size;

    const countryMap = new Map();
    const stateMap = new Map();
    const districtMap = new Map();
    const clusterMap = new Map();

    for (const r of recipients) {
      const isConv = uniqueConvLeadSet.has(String(r.lead_id));
      const cName = r.country_name || 'India';
      if (!countryMap.has(cName)) countryMap.set(cName, { name: cName, targeted: 0, delivered: 0, opens: 0, clicks: 0, converted: 0 });
      const ce = countryMap.get(cName);
      ce.targeted += 1;
      if (r.delivered_at) ce.delivered += 1;
      if (r.first_opened_at) ce.opens += 1;
      if (r.first_clicked_at) ce.clicks += 1;
      if (isConv) ce.converted += 1;

      if (r.state_name) {
        if (!stateMap.has(r.state_name)) stateMap.set(r.state_name, { name: r.state_name, targeted: 0, delivered: 0, opens: 0, clicks: 0, inquiries: 0, converted: 0 });
        const se = stateMap.get(r.state_name);
        se.targeted += 1;
        if (r.delivered_at) se.delivered += 1;
        if (r.first_opened_at) se.opens += 1;
        if (r.first_clicked_at) se.clicks += 1;
        if (r.inquired_at) se.inquiries += 1;
        if (isConv) se.converted += 1;
      }

      if (r.district_name) {
        const dk = `${r.state_name || ''}::${r.district_name}`;
        if (!districtMap.has(dk)) districtMap.set(dk, { name: r.district_name, state_name: r.state_name || '', targeted: 0, inquiries: 0, converted: 0 });
        const de = districtMap.get(dk);
        de.targeted += 1;
        if (r.inquired_at) de.inquiries += 1;
        if (isConv) de.converted += 1;
      }

      if (r.cluster_name) {
        if (!clusterMap.has(r.cluster_name)) clusterMap.set(r.cluster_name, { name: r.cluster_name, targeted: 0, orders: 0, revenue_inr: 0 });
        clusterMap.get(r.cluster_name).targeted += 1;
      }
    }

    for (const c of conversions) {
      if (c.conversion_type === 'epc_commercial_order' && c.cluster_name && clusterMap.has(c.cluster_name)) {
        const cl = clusterMap.get(c.cluster_name);
        cl.orders += 1;
        cl.revenue_inr += Number(c.order_value_inr || 0);
      }
    }

    res.json({
      success: true,
      data: {
        campaign,
        kpis: {
          target_leads: targetLeads,
          emails_sent: sent,
          delivered,
          bounced,
          unique_opens: uniqueOpens,
          suspected_bot_opens: suspectedBotOpens,
          unique_clicks: uniqueClicks,
          unsubscribed,
          inquiries,
          quotations,
          converted_leads: convertedLeads,
          delivery_rate: pct(delivered, sent),
          open_rate: pct(uniqueOpens, delivered),
          click_rate: pct(uniqueClicks, delivered),
          inquiry_rate: pct(inquiries, targetLeads),
          conversion_ratio: pct(convertedLeads, targetLeads)
        },
        funnel: [
          { stage: 'Eligible Leads', count: targetLeads },
          { stage: 'Delivered', count: delivered },
          { stage: 'Unique Opens', count: uniqueOpens },
          { stage: 'Unique Clicks', count: uniqueClicks },
          { stage: 'Inquiries', count: inquiries },
          { stage: 'Quotations', count: quotations },
          { stage: 'Converted Leads', count: convertedLeads }
        ],
        geo: {
          countries: Array.from(countryMap.values()),
          states: Array.from(stateMap.values()),
          districts: Array.from(districtMap.values()),
          clusters: Array.from(clusterMap.values())
        },
        recipients: recipients.slice(0, 200),
        attributed_conversions: conversions
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * 6. Overall Combined Conversion & Attribution Dashboard (Section 10 & 13)
 */
const getOverallConversionDashboard = async (req, res) => {
  try {
    await ensureLeadMarketingSeeded();
    if (req.query.sync === 'true') await syncLiveConversions().catch(() => { });

    const settings = await LeadMarketingSettings.findOne({ key: 'global' }).lean();
    const attributionModel = req.query.attribution_model || settings?.attribution_config?.default_model || 'last_touch';
    const segmentFilter = req.query.primary_segment_key && VALID_PRIMARY_SEGMENTS.includes(req.query.primary_segment_key)
      ? req.query.primary_segment_key
      : null;

    const dateRange = buildDateRangeFilter(req.query.date_preset, req.query.start_date, req.query.end_date);
    const leadMatch = { deleted_at: null };
    if (segmentFilter) leadMatch.primary_segment_key = segmentFilter;
    if (dateRange) leadMatch.created_at = dateRange;

    const convMatch = {};
    if (segmentFilter) convMatch.primary_segment_key = segmentFilter;
    if (dateRange) convMatch.converted_at = dateRange;

    const recMatch = {};
    if (segmentFilter) recMatch.primary_segment_key = segmentFilter;
    if (dateRange) recMatch.created_at = dateRange;

    const [leads, subgroups, campaigns, recipients, conversions] = await Promise.all([
      LeadMaster.find(leadMatch).lean(),
      LeadSubgroup.countDocuments({ deleted_at: null, is_active: true }),
      LeadCampaign.find({ deleted_at: null, ...(dateRange ? { created_at: dateRange } : {}) }).lean(),
      LeadCampaignRecipient.find(recMatch).lean(),
      LeadConversion.find(convMatch).lean()
    ]);

    const attrField = attributionModel === 'first_touch' ? 'first_touch_campaign_id' : 'last_touch_campaign_id';

    // Anti-double counting per unique Lead ID
    const uniqueEligibleLeadIds = new Set(leads.map((l) => String(l._id)));
    const uniqueConvertedLeadIds = new Set(conversions.map((c) => String(c.lead_id)));

    const totalSent = recipients.filter((r) => r.sent_at || ['sent', 'delivered'].includes(r.status)).length;
    const totalDelivered = recipients.filter((r) => r.delivered_at || r.status === 'delivered').length;
    const uniqueEngagedLeadIds = new Set(recipients.filter((r) => r.first_opened_at || r.first_clicked_at).map((r) => String(r.lead_id)));
    const totalInquiries = recipients.filter((r) => r.inquired_at).length;
    const totalQuotations = recipients.filter((r) => r.quoted_at).length;

    const orders = conversions.filter((c) => c.conversion_type === 'epc_commercial_order');
    const totalRevenueInr = orders.reduce((a, o) => a + Number(o.order_value_inr || 0), 0);
    const totalConvertedKw = orders.reduce((a, o) => a + Number(o.order_capacity_kw || 0), 0);

    // 3-Segment Comparison Table (FRD Section 10.2)
    const comparison = VALID_PRIMARY_SEGMENTS.map((segKey) => {
      const segLeads = leads.filter((l) => l.primary_segment_key === segKey);
      const segRecs = recipients.filter((r) => r.primary_segment_key === segKey);
      const segConvs = conversions.filter((c) => {
        if (c.primary_segment_key !== segKey) return false;
        if (segKey === 'franchisee_leads') return c.conversion_type === 'franchisee_converted';
        if (segKey === 'epc_signup_leads') return c.conversion_type === 'epc_registered';
        return c.conversion_type === 'epc_commercial_order';
      });
      const uniqueConverted = new Set(segConvs.map((c) => String(c.lead_id))).size;
      const campaignsTargeting = campaigns.filter((cm) => (cm.target_primary_segments || []).includes(segKey)).length;

      return {
        primary_segment_key: segKey,
        total_leads: segLeads.length,
        campaigns_sent: campaignsTargeting,
        interested_leads: segLeads.filter((l) => ['Interested', 'Meeting Scheduled', 'Proposal Shared', 'Quotation Shared'].includes(l.lead_status)).length,
        followups: segLeads.filter((l) => Boolean(l.last_followup_at)).length || segRecs.filter((r) => r.inquired_at).length,
        converted_count: uniqueConverted,
        conversion_label: segKey === 'franchisee_leads' ? 'Franchisees' : segKey === 'epc_signup_leads' ? 'EPC Registrations' : 'Buyers',
        conversion_ratio: pct(uniqueConverted, segLeads.length)
      };
    });

    // Attributed Campaign Leaderboard under active First-Touch / Last-Touch model
    const campaignAttribution = campaigns.map((cm) => {
      const attConvs = conversions.filter((c) => c[attrField] && String(c[attrField]) === String(cm._id));
      const uniqueAttrLeads = new Set(attConvs.map((c) => String(c.lead_id))).size;
      const attrOrders = attConvs.filter((c) => c.conversion_type === 'epc_commercial_order');
      return {
        _id: cm._id,
        campaign_code: cm.campaign_code,
        campaign_name: cm.campaign_name,
        target_leads: cm.total_target_leads || 0,
        delivered: cm.delivered_count || 0,
        unique_opens: cm.unique_opens_count || 0,
        unique_clicks: cm.unique_clicks_count || 0,
        attributed_converted_leads: uniqueAttrLeads,
        attributed_orders: attrOrders.length,
        attributed_revenue_inr: attrOrders.reduce((a, o) => a + Number(o.order_value_inr || 0), 0),
        conversion_ratio: pct(uniqueAttrLeads, cm.total_target_leads || 0)
      };
    });

    // Geo aggregation (Unique leads + conversions by country/state)
    const stateGeoMap = new Map();
    const countryGeoMap = new Map();
    for (const l of leads) {
      const cn = l.country_name || 'India';
      if (!countryGeoMap.has(cn)) countryGeoMap.set(cn, { name: cn, leads: 0, converted: 0, revenue_inr: 0 });
      countryGeoMap.get(cn).leads += 1;
      if (uniqueConvertedLeadIds.has(String(l._id))) countryGeoMap.get(cn).converted += 1;

      if (l.state_name) {
        if (!stateGeoMap.has(l.state_name)) stateGeoMap.set(l.state_name, { name: l.state_name, leads: 0, converted: 0, revenue_inr: 0 });
        stateGeoMap.get(l.state_name).leads += 1;
        if (uniqueConvertedLeadIds.has(String(l._id))) stateGeoMap.get(l.state_name).converted += 1;
      }
    }
    for (const o of orders) {
      if (o.state_name && stateGeoMap.has(o.state_name)) stateGeoMap.get(o.state_name).revenue_inr += Number(o.order_value_inr || 0);
      if (o.country_name && countryGeoMap.has(o.country_name)) countryGeoMap.get(o.country_name).revenue_inr += Number(o.order_value_inr || 0);
    }

    res.json({
      success: true,
      data: {
        attribution_model: attributionModel,
        kpis: {
          total_unique_leads: uniqueEligibleLeadIds.size,
          total_subgroups: subgroups,
          total_campaigns_created: campaigns.length,
          total_campaigns_completed: campaigns.filter((c) => c.status === 'completed').length,
          total_emails_sent: totalSent,
          total_delivered: totalDelivered,
          total_unique_engagement: uniqueEngagedLeadIds.size,
          total_inquiries: totalInquiries,
          total_quotations: totalQuotations,
          total_unique_converted_leads: uniqueConvertedLeadIds.size,
          total_commercial_orders: orders.length,
          total_sales_value_inr: Math.round(totalRevenueInr * 100) / 100,
          total_converted_kw: Math.round(totalConvertedKw * 100) / 100,
          overall_conversion_ratio: pct(uniqueConvertedLeadIds.size, uniqueEligibleLeadIds.size)
        },
        segment_comparison: comparison,
        campaign_attribution: campaignAttribution,
        geo_comparison: {
          countries: Array.from(countryGeoMap.values()),
          states: Array.from(stateGeoMap.values())
        }
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * 7. Build Report Rows & Export in Real Excel (.xlsx) or PDF (pdfkit) — FRD Section 15 (14 Reports)
 */
const buildReportDataset = async (reportType, query = {}) => {
  const filter = buildLeadFilterQuery(query);
  const dateRange = buildDateRangeFilter(query.date_preset, query.start_date, query.end_date);

  switch (reportType) {
    case 'lead_master':
    case 'segment_wise':
    case 'subgroup_wise':
    case 'geo_wise': {
      const rows = await LeadMaster.find(filter).sort({ created_at: -1 }).limit(5000).lean();
      return {
        title: `Solarkits Lead Report (${reportType.replace(/_/g, ' ').toUpperCase()})`,
        columns: ['Lead ID', 'Company Name', 'Contact Person', 'Email', 'Mobile', 'Primary Segment', 'Sub-Groups', 'Country', 'State', 'District', 'Cluster', 'BDE', 'Status', 'Lead Source', 'Created'],
        rows: rows.map((r) => [
          r.lead_id, r.company_name, r.contact_person || '', r.email || '', `${r.country_code || '+91'} ${r.mobile_number || ''}`.trim(),
          r.primary_segment_key, (r.subgroup_names || []).join(', '), r.country_name || '', r.state_name || '', r.district_name || '', r.cluster_name || '',
          r.assigned_bde_name || '', r.lead_status, r.lead_source, r.created_at ? new Date(r.created_at).toLocaleDateString('en-IN') : ''
        ])
      };
    }
    case 'bde_allocation': {
      const rows = await LeadMaster.aggregate([
        { $match: filter },
        {
          $group: {
            _id: { bde: '$assigned_bde_name', seg: '$primary_segment_key' },
            leads: { $sum: 1 },
            converted: {
              $sum: {
                $cond: [
                  { $or: ['$milestones.franchisee_converted.is_converted', '$milestones.epc_registered.is_registered', '$milestones.epc_sales_converted.has_order'] },
                  1,
                  0
                ]
              }
            }
          }
        }
      ]);
      return {
        title: 'BDE-Wise Lead Allocation Report',
        columns: ['Assigned BDE', 'Primary Segment', 'Total Leads', 'Converted Leads', 'Conversion %'],
        rows: rows.map((r) => [r._id.bde || 'Unassigned', r._id.seg, r.leads, r.converted, `${pct(r.converted, r.leads)}%`])
      };
    }
    case 'campaign_performance':
    case 'combined_performance': {
      const rows = await LeadCampaign.find({ deleted_at: null, ...(dateRange ? { created_at: dateRange } : {}) }).sort({ created_at: -1 }).lean();
      return {
        title: 'Campaign Performance Report',
        columns: ['Campaign ID', 'Name', 'Segments', 'Status', 'Target', 'Sent', 'Delivered', 'Unique Opens', 'Unique Clicks', 'Converted Leads', 'Conversion %'],
        rows: rows.map((c) => [
          c.campaign_code, c.campaign_name, (c.target_primary_segments || []).join(', '), c.status,
          c.total_target_leads, c.sent_count, c.delivered_count, c.unique_opens_count, c.unique_clicks_count,
          c.converted_leads_count, `${pct(c.converted_leads_count, c.total_target_leads)}%`
        ])
      };
    }
    case 'campaign_geo': {
      const rows = await LeadCampaignRecipient.aggregate([
        { $group: { _id: { country: '$country_name', state: '$state_name', district: '$district_name' }, targeted: { $sum: 1 }, delivered: { $sum: { $cond: ['$delivered_at', 1, 0] } }, opens: { $sum: { $cond: ['$first_opened_at', 1, 0] } }, clicks: { $sum: { $cond: ['$first_clicked_at', 1, 0] } }, converted: { $sum: { $cond: ['$converted_at', 1, 0] } } } }
      ]);
      return {
        title: 'Campaign Geographical Analytics Report',
        columns: ['Country', 'State', 'District', 'Targeted', 'Delivered', 'Opens', 'Clicks', 'Converted'],
        rows: rows.map((r) => [r._id.country || 'India', r._id.state || '', r._id.district || '', r.targeted, r.delivered, r.opens, r.clicks, r.converted])
      };
    }
    case 'lead_engagement': {
      const rows = await LeadCampaignRecipient.find({}).sort({ updated_at: -1 }).limit(2000).lean();
      return {
        title: 'Lead Email Engagement Report',
        columns: ['Lead ID', 'Company', 'Email', 'Segment', 'State', 'Status', 'Opens', 'Clicks', 'Bot Flag', 'Unsubscribed'],
        rows: rows.map((r) => [r.lead_code, r.company_name, r.email, r.primary_segment_key, r.state_name, r.status, r.open_count, r.click_count, r.suspected_bot_open ? 'Suspected Bot' : 'Human/Normal', r.unsubscribed_at ? 'Yes' : 'No'])
      };
    }
    case 'inquiry_quotation': {
      const rows = await LeadMaster.find({ ...filter, $or: [{ lead_status: { $in: ['Interested', 'Quotation Shared', 'Proposal Shared'] } }, { 'milestones.quote_count': { $gt: 0 } }] }).limit(2000).lean();
      return {
        title: 'Inquiry & Quotation Report',
        columns: ['Lead ID', 'Company Name', 'Segment', 'State', 'District', 'BDE', 'Status', 'Quotations Count'],
        rows: rows.map((r) => [r.lead_id, r.company_name, r.primary_segment_key, r.state_name, r.district_name, r.assigned_bde_name || '', r.lead_status, r.milestones?.quote_count || 0])
      };
    }
    case 'franchisee_conversion':
    case 'epc_registration':
    case 'lead_to_order':
    case 'epc_sales_revenue': {
      const convType =
        reportType === 'franchisee_conversion'
          ? 'franchisee_converted'
          : reportType === 'epc_registration'
            ? 'epc_registered'
            : 'epc_commercial_order';
      const rows = await LeadConversion.find({ conversion_type: convType, ...(dateRange ? { converted_at: dateRange } : {}) })
        .populate('lead_id', 'company_name email mobile_number')
        .populate('first_touch_campaign_id', 'campaign_code campaign_name')
        .populate('last_touch_campaign_id', 'campaign_code campaign_name')
        .sort({ converted_at: -1 })
        .lean();
      return {
        title: `${reportType.replace(/_/g, ' ').toUpperCase()} Report`,
        columns: ['Lead ID', 'Company', 'Segment', 'State', 'Order / Ref #', 'Category', 'Value (INR)', 'Capacity (kW)', 'First-Touch Campaign', 'Last-Touch Campaign', 'Converted Date'],
        rows: rows.map((r) => [
          r.lead_code,
          r.lead_id?.company_name || '',
          r.primary_segment_key,
          r.state_name || '',
          r.order_number || String(r.source_entity_id),
          r.order_category || convType,
          r.order_value_inr || 0,
          r.order_capacity_kw || 0,
          r.first_touch_campaign_id?.campaign_code || '',
          r.last_touch_campaign_id?.campaign_code || '',
          r.converted_at ? new Date(r.converted_at).toLocaleDateString('en-IN') : ''
        ])
      };
    }
    default:
      return buildReportDataset('lead_master', query);
  }
};

const previewReport = async (req, res) => {
  try {
    await ensureLeadMarketingSeeded();
    const reportType = req.query.type || 'lead_master';
    const ds = await buildReportDataset(reportType, req.query);
    res.json({ success: true, data: { title: ds.title, columns: ds.columns, rows: ds.rows.slice(0, 200), total_rows: ds.rows.length } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const exportReport = async (req, res) => {
  try {
    await ensureLeadMarketingSeeded();
    const reportType = req.query.type || 'lead_master';
    const format = String(req.query.format || 'xlsx').toLowerCase();
    const ds = await buildReportDataset(reportType, req.query);

    await logAudit(req, {
      action: `EXPORT_${format.toUpperCase()}`,
      entity_type: 'reports',
      entity_id: reportType,
      summary: `Exported ${reportType} report (${ds.rows.length} rows) as ${format.toUpperCase()}`
    });

    if (format === 'pdf') {
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="solarkits_${reportType}.pdf"`);
      const doc = new PDFDocument({ margin: 30, size: 'A4', layout: 'landscape' });
      doc.pipe(res);
      doc.fontSize(15).fillColor('#1E3A8A').text(ds.title, { align: 'left' });
      doc.fontSize(9).fillColor('#64748B').text(`Generated: ${new Date().toLocaleString('en-IN')} | Total Records: ${ds.rows.length}`, { align: 'left' });
      doc.moveDown(0.8);

      const headerLine = ds.columns.join('  |  ');
      doc.fontSize(8).fillColor('#0F172A').font('Helvetica-Bold').text(headerLine);
      doc.moveTo(30, doc.y + 2).lineTo(810, doc.y + 2).stroke('#CBD5E1');
      doc.moveDown(0.5);
      doc.font('Helvetica').fontSize(7.5).fillColor('#334155');
      for (const row of ds.rows.slice(0, 400)) {
        doc.text(row.map((c) => String(c ?? '')).join('  |  '));
        if (doc.y > 530) doc.addPage();
      }
      doc.end();
      return;
    }

    // Real multi-column Excel Workbook (.xlsx)
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet([ds.columns, ...ds.rows]);
    XLSX.utils.book_append_sheet(wb, ws, 'Report');
    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="solarkits_${reportType}.xlsx"`);
    res.send(buffer);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  getOverviewDashboard,
  getSegmentDashboard,
  getGeoLeadMap,
  previewCampaignAudience,
  listCampaigns,
  createLeadCampaign,
  updateLeadCampaign,
  launchCampaignNow,
  resumeLeadCampaign,
  pauseLeadCampaign,
  cancelLeadCampaign,
  draftLeadCampaign,
  rerunLeadCampaign,
  testLeadEmail,
  trackEmailOpen,
  trackEmailClick,
  trackLeadUnsubscribe,
  recordManualOrWebhookEvent,
  getIndividualCampaignAnalytics,
  getOverallConversionDashboard,
  previewReport,
  exportReport
};
