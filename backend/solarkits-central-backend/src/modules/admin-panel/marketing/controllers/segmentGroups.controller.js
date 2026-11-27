const mongoose = require('mongoose');
const { MarketingSegment, MarketingSegmentContact } = require('../models');
const {
  EpcAccount,
  FranchiseeCluster,
  WarehouseComboKit: IndiaComboKit,
  Reseller,
  WebsiteEpcLead,
  EPCLead,
  FranchiseLead,
  BDELead
} = require('../../models/india_solarshop_db');
const { EpcCompany, EpcCompanyGst } = require('../../models/india_core_db');
const {
  SolarKit,
  WarehouseComboKit: CoreComboKit,
  ProjectCategory,
  ProjectSubcategory
} = require('../../models/core_db');
const { GeoLevel1, GeoLevel2, Cluster } = require('../../models/geolocation_db');
const {
  STATE_ALIASES,
  DISTRICT_SPELLING_ALIASES,
  cleanGeoToken,
  cleanStateToken,
  buildGeoAndClusterResolver
} = require('../services/segmentGeo.service');
const {
  normalizeEmail,
  normalizePhone10,
  recalculateSegmentStats,
  promoteMatchingSegmentLeads,
  reconcileSegmentLeadsWithVerifiedEpcs
} = require('../services/segmentPromotion.service');
const { computeDynamicSegmentAnalytics } = require('../services/segmentAnalytics.service');

const PURPOSE_LABELS = {
  epc_signup_login: 'EPC Sign Up & Login',
  franchisee_signup_login: 'Franchisee Sign Up & Login',
  kit_sales: 'Kit Sales'
};

const VALID_PURPOSES = Object.keys(PURPOSE_LABELS);

const escapeRegex = (val) => String(val || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const slugifyKey = (label, idx = 0) => {
  const clean = String(label || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
  return clean || `field_${idx + 1}`;
};

/**
 * Matches CSV column headers directly to canonical DB keys and roles without manual typing.
 */
const matchHeaderToDbField = (header, idx = 0) => {
  const slug = slugifyKey(header, idx);
  const label = String(header || '').trim() || `Column ${idx + 1}`;

  if (/^(email|e_mail|email_id|email_address|mail|mail_id)$/.test(slug) || /email/.test(slug)) {
    return { key: 'email', label, role: 'email' };
  }
  if (/^(whatsapp|whatsapp_no|whatsapp_number)$/.test(slug)) {
    return { key: 'whatsapp_number', label, role: 'phone' };
  }
  if (/^(phone|phone_no|phone_number|mobile|mobile_no|mobile_number|contact_no|contact_number|tel)$/.test(slug) || /(phone|mobile|whatsapp)/.test(slug)) {
    return { key: slug.includes('whatsapp') ? 'whatsapp_number' : 'phone', label, role: 'phone' };
  }
  if (/^(name|full_name|contact_name|contact_person|person_name|lead_name|owner_name|customer_name)$/.test(slug)) {
    return { key: 'name', label, role: 'name' };
  }
  if (/^(state|state_name|province)$/.test(slug)) {
    return { key: 'state', label, role: 'state' };
  }
  if (/^(district|district_name|dist|city|taluka|town)$/.test(slug)) {
    return { key: 'district', label, role: 'district' };
  }
  if (/^(cluster|cluster_name|cluster_code|territory_cluster)$/.test(slug)) {
    return { key: 'cluster', label, role: 'cluster' };
  }
  if (/^(gst|gstin|gst_no|gst_number|gstin_number)$/.test(slug)) {
    return { key: 'gstin', label, role: 'custom' };
  }
  if (/^(company|company_name|business_name|firm|firm_name|organization|organisation)$/.test(slug)) {
    return { key: 'company_name', label, role: 'custom' };
  }
  if (/^(pin|pincode|pin_code|postal_code|zip|zipcode)$/.test(slug)) {
    return { key: 'pincode', label, role: 'custom' };
  }

  return { key: slug, label, role: 'custom' };
};

const normalizeFieldDefinitions = (defs = []) => {
  if (!Array.isArray(defs)) return [];
  const usedKeys = new Set();
  const validRoles = ['email', 'name', 'phone', 'state', 'district', 'cluster', 'custom'];

  return defs
    .filter((f) => f && (f.label || f.key))
    .map((f, idx) => {
      const autoMatched = matchHeaderToDbField(f.label || f.key, idx);
      let key = slugifyKey(f.key || autoMatched.key, idx);
      while (usedKeys.has(key)) key = `${key}_${idx + 1}`;
      usedKeys.add(key);
      return {
        key,
        label: String(f.label || f.key).trim(),
        role: validRoles.includes(f.role) ? f.role : autoMatched.role
      };
    });
};

const buildContactLocationClauses = ({ state = '', cluster = '', district = '' }) => {
  const andClauses = [];
  const cleanState = String(state || '').trim();
  const cleanCluster = String(cluster || '').trim();
  const cleanDistrict = String(district || '').trim();

  if (cleanState) {
    const stateRx = new RegExp(`^${escapeRegex(cleanState)}$`, 'i');
    andClauses.push({
      $or: [
        { state: stateRx },
        { 'dynamic_fields.state': stateRx },
        { 'dynamic_fields.state_name': stateRx }
      ]
    });
  }

  if (cleanCluster) {
    const cluRx = new RegExp(`^${escapeRegex(cleanCluster)}$`, 'i');
    const cluOr = [{ cluster_name: cluRx }, { cluster_code: cluRx }];
    if (mongoose.Types.ObjectId.isValid(cleanCluster)) {
      cluOr.push({ cluster_id: new mongoose.Types.ObjectId(cleanCluster) });
    }
    andClauses.push({ $or: cluOr });
  }

  if (cleanDistrict) {
    const distRx = new RegExp(`^${escapeRegex(cleanDistrict)}$`, 'i');
    andClauses.push({
      $or: [
        { district: distRx },
        { 'dynamic_fields.district': distRx },
        { 'dynamic_fields.district_name': distRx },
        { 'dynamic_fields.city': distRx }
      ]
    });
  }

  return andClauses;
};

/**
 * Syncs missing cluster references onto active contacts whenever clusters were created or updated later.
 */
const syncMissingContactClusters = async (resolver, segmentIdFilter = null) => {
  const missingQuery = {
    deleted_at: null,
    promotion_status: { $ne: 'promoted_to_verified_epc' },
    $or: [{ cluster_id: null }, { state_id: null }, { district_id: null }]
  };
  if (segmentIdFilter && mongoose.Types.ObjectId.isValid(segmentIdFilter)) {
    missingQuery.segment_id = new mongoose.Types.ObjectId(segmentIdFilter);
  }

  const unlinked = await MarketingSegmentContact.find(missingQuery)
    .select('_id state state_id district district_id cluster_id cluster_name cluster_code')
    .lean();

  if (!unlinked.length) return;

  const bulkOps = [];
  for (const c of unlinked) {
    const resolved = resolver.resolve({
      stateName: c.state,
      districtName: c.district,
      clusterName: c.cluster_name
    });
    const nextState = resolved.state || c.state;
    const nextDistrict = resolved.district || c.district;
    const needsUpdate =
      (!c.cluster_id && Boolean(resolved.cluster_id)) ||
      (!c.state_id && Boolean(resolved.state_id)) ||
      (!c.district_id && Boolean(resolved.district_id)) ||
      nextState !== (c.state || '') ||
      nextDistrict !== (c.district || '');
    if (needsUpdate) {
      bulkOps.push({
        updateOne: {
          filter: { _id: c._id },
          update: {
            $set: {
              state_id: resolved.state_id || c.state_id || null,
              state: nextState,
              district_id: resolved.district_id || c.district_id || null,
              district: nextDistrict,
              cluster_id: resolved.cluster_id || c.cluster_id || null,
              cluster_name: resolved.cluster_name || c.cluster_name || '',
              cluster_code: resolved.cluster_code || c.cluster_code || ''
            }
          }
        }
      });
    }
  }

  if (bulkOps.length > 0) {
    await MarketingSegmentContact.bulkWrite(bulkOps);
  }
};

const getLeadSources = async (req, res) => {
  try {
    const [webSources, bdeLeadSources, segSources] = await Promise.all([
      WebsiteEpcLead
        ? WebsiteEpcLead.distinct('lead_source', { deleted_at: null }).catch(() => [])
        : [],
      EPCLead
        ? EPCLead.distinct('lead_source', { deleted_at: null }).catch(() => [])
        : [],
      MarketingSegmentContact
        ? MarketingSegmentContact.distinct('dynamic_fields.platform', { deleted_at: null }).catch(() => [])
        : []
    ]);

    const seen = new Set();
    const sources = [];
    for (const raw of [...webSources, ...bdeLeadSources, ...segSources]) {
      const clean = String(raw || '').trim();
      if (!clean) continue;
      const key = clean.toLowerCase();
      if (!seen.has(key)) {
        seen.add(key);
        sources.push({ value: clean, label: clean });
      }
    }
    sources.sort((a, b) => a.label.localeCompare(b.label));
    res.json({ success: true, data: sources });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * GET /marketing/locations/states — Live active states from GeoLevel1.
 */
const getLocationStates = async (req, res) => {
  try {
    const states = await GeoLevel1.find({ is_active: true, deleted_at: null })
      .select('_id name level_0')
      .sort({ name: 1 })
      .lean();
    res.json({ success: true, data: states });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * GET /marketing/locations/districts — Live active districts from GeoLevel2 filtered by state_id or state_name.
 */
const getLocationDistricts = async (req, res) => {
  try {
    const { state_id, state_name } = req.query;
    const filter = { is_active: true, deleted_at: null };

    if (state_id && mongoose.Types.ObjectId.isValid(state_id)) {
      filter.level_1 = new mongoose.Types.ObjectId(state_id);
    } else if (state_name && String(state_name).trim()) {
      const stateDoc = await GeoLevel1.findOne({
        name: new RegExp(`^${escapeRegex(String(state_name).trim())}$`, 'i'),
        deleted_at: null
      })
        .select('_id')
        .lean();
      if (!stateDoc) {
        return res.json({ success: true, data: [] });
      }
      filter.level_1 = stateDoc._id;
    }

    const districts = await GeoLevel2.find(filter)
      .select('_id name level_1 cluster')
      .sort({ name: 1 })
      .lean();

    res.json({ success: true, data: districts });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * GET /marketing/locations/clusters — Live Franchisee Clusters from Admin Panel Franchisee Cluster Management.
 */
const getLocationClusters = async (req, res) => {
  try {
    const { state_id, state_name } = req.query;
    const filter = { deleted_at: null, status: { $ne: 'inactive' } };

    if (state_id && mongoose.Types.ObjectId.isValid(state_id)) {
      filter.state_id = new mongoose.Types.ObjectId(state_id);
    } else if (state_name && String(state_name).trim()) {
      filter.state_name = new RegExp(`^${escapeRegex(String(state_name).trim())}$`, 'i');
    }

    const clusters = await FranchiseeCluster.find(filter)
      .select('_id cluster_name cluster_code state_id state_name district_ids district_names color_code status is_active')
      .sort({ state_name: 1, cluster_name: 1 })
      .lean();

    res.json({ success: true, data: clusters });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * GET /marketing/kits — Live configured Solar Kits & Combo Kits from Admin Panel Kit Configurations.
 */
const getConfiguredKits = async (req, res) => {
  try {
    const [solarKits, coreComboKits, indiaComboKits] = await Promise.all([
      SolarKit.find({ deleted_at: null })
        .populate({ path: 'category_id', model: ProjectCategory, select: 'name' })
        .populate({ path: 'subcategory_id', model: ProjectSubcategory, select: 'name' })
        .sort({ created_at: -1 })
        .lean(),
      CoreComboKit.find({ deleted_at: null, is_active: true, is_custom: false })
        .select('_id name capacity solar_kit_id selling_price_cached base_price_cached kit_image')
        .lean(),
      IndiaComboKit && IndiaComboKit !== CoreComboKit
        ? IndiaComboKit.find({ deleted_at: null, is_active: true, is_custom: false })
            .select('_id name capacity solar_kit_id selling_price_cached base_price_cached kit_image')
            .lean()
        : Promise.resolve([])
    ]);

    const solarKitMap = new Map(solarKits.map((sk) => [String(sk._id), sk]));
    const mergedComboMap = new Map();
    [...coreComboKits, ...indiaComboKits].forEach((ck) => {
      if (ck?._id) mergedComboMap.set(String(ck._id), ck);
    });

    const configuredKits = Array.from(mergedComboMap.values()).map((ck) => {
      const parentSolarKit = ck.solar_kit_id ? solarKitMap.get(String(ck.solar_kit_id)) : null;
      return {
        kit_id: String(ck._id),
        kit_name: ck.name,
        capacity: Number(ck.capacity || 0),
        solar_kit_name: parentSolarKit?.name || '',
        category_name: parentSolarKit?.category_id?.name || '',
        subcategory_name: parentSolarKit?.subcategory_id?.name || '',
        selling_price: Number(ck.selling_price_cached || ck.base_price_cached || 0),
        source: 'combo_kit'
      };
    });

    // Include SolarKit definitions if no combo kits reference them yet
    const referencedSolarKitIds = new Set(
      Array.from(mergedComboMap.values()).map((ck) => ck.solar_kit_id && String(ck.solar_kit_id)).filter(Boolean)
    );
    for (const sk of solarKits) {
      if (!referencedSolarKitIds.has(String(sk._id))) {
        configuredKits.push({
          kit_id: String(sk._id),
          kit_name: sk.name,
          capacity: 0,
          solar_kit_name: sk.name,
          category_name: sk.category_id?.name || '',
          subcategory_name: sk.subcategory_id?.name || '',
          selling_price: 0,
          source: 'solar_kit'
        });
      }
    }

    configuredKits.sort((a, b) => a.kit_name.localeCompare(b.kit_name));
    res.json({ success: true, data: configuredKits });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const normalizeSelectedKits = (kits = []) => {
  if (!Array.isArray(kits)) return [];
  return kits
    .filter((k) => k && k.kit_id && mongoose.Types.ObjectId.isValid(k.kit_id))
    .map((k) => ({
      kit_id: new mongoose.Types.ObjectId(k.kit_id),
      kit_name: String(k.kit_name || '').trim(),
      capacity: Number(k.capacity || 0),
      solar_kit_name: String(k.solar_kit_name || '').trim(),
      category_name: String(k.category_name || '').trim(),
      source: k.source === 'solar_kit' ? 'solar_kit' : 'combo_kit'
    }));
};

/**
 * GET /marketing/segments — List Segment Groups filtered by Purpose, State, Cluster, District & Search.
 */
const getSegments = async (req, res) => {
  try {
    await reconcileSegmentLeadsWithVerifiedEpcs();
    const resolver = await buildGeoAndClusterResolver();
    await syncMissingContactClusters(resolver);

    const { search = '', purpose = '', state = '', cluster = '', district = '', status = 'active' } = req.query;
    const segFilter = { deleted_at: null };
    if (status && status !== 'all') segFilter.status = status;
    if (purpose && purpose !== 'all' && VALID_PURPOSES.includes(purpose)) {
      segFilter.purpose = purpose;
    }
    if (search && String(search).trim()) {
      const qRx = new RegExp(escapeRegex(String(search).trim()), 'i');
      segFilter.$or = [
        { name: qRx },
        { description: qRx },
        { 'selected_kits.kit_name': qRx }
      ];
    }

    const segments = await MarketingSegment.find(segFilter).sort({ created_at: -1 }).lean();
    const segIds = segments.map((s) => s._id);

    const hasGeoFilter = Boolean(
      String(state || '').trim() ||
      String(cluster || '').trim() ||
      String(district || '').trim()
    );

    const locClauses = buildContactLocationClauses({ state, cluster, district });
    const baseContactMatch = {
      segment_id: { $in: segIds },
      deleted_at: null,
      promotion_status: { $ne: 'promoted_to_verified_epc' },
      ...(locClauses.length > 0 ? { $and: locClauses } : {})
    };

    const [filteredCounts, geoSplitAgg] = segIds.length > 0
      ? await Promise.all([
          MarketingSegmentContact.aggregate([
            { $match: baseContactMatch },
            {
              $group: {
                _id: '$segment_id',
                contact_count: { $sum: 1 },
                email_count: {
                  $sum: {
                    $cond: [{ $and: [{ $ne: ['$email', ''] }, { $ne: ['$email', null] }] }, 1, 0]
                  }
                },
                phone_count: {
                  $sum: {
                    $cond: [{ $and: [{ $ne: ['$phone_normalized', ''] }, { $ne: ['$phone_normalized', null] }] }, 1, 0]
                  }
                }
              }
            }
          ]),
          MarketingSegmentContact.aggregate([
            { $match: baseContactMatch },
            {
              $group: {
                _id: {
                  segment_id: '$segment_id',
                  state: '$state',
                  cluster_name: '$cluster_name',
                  cluster_code: '$cluster_code',
                  district: '$district'
                },
                count: { $sum: 1 },
                email_count: {
                  $sum: {
                    $cond: [{ $and: [{ $ne: ['$email', ''] }, { $ne: ['$email', null] }] }, 1, 0]
                  }
                },
                phone_count: {
                  $sum: {
                    $cond: [{ $and: [{ $ne: ['$phone_normalized', ''] }, { $ne: ['$phone_normalized', null] }] }, 1, 0]
                  }
                }
              }
            }
          ])
        ])
      : [[], []];

    const clusterColorByName = new Map(
      (resolver.franchiseeClusters || []).map((c) => [String(c.cluster_name || '').toLowerCase(), c.color_code || '#2563eb'])
    );

    const filteredCountMap = new Map(filteredCounts.map((row) => [String(row._id), row]));
    const splitBySegMap = new Map();
    for (const row of geoSplitAgg) {
      const segKey = String(row._id.segment_id);
      if (!splitBySegMap.has(segKey)) {
        splitBySegMap.set(segKey, { states: new Map(), clusters: new Map(), stateTree: new Map() });
      }
      const entry = splitBySegMap.get(segKey);
      const stName = row._id.state || 'Unspecified';
      const cluName = row._id.cluster_name || '';
      const cluCode = row._id.cluster_code || '';
      const distName = row._id.district || 'Unspecified';
      const cnt = Number(row.count || 0);
      const emCnt = Number(row.email_count || 0);
      const phCnt = Number(row.phone_count || 0);

      entry.states.set(stName, (entry.states.get(stName) || 0) + cnt);
      if (cluName) {
        entry.clusters.set(cluName, (entry.clusters.get(cluName) || 0) + cnt);
      }

      if (!entry.stateTree.has(stName)) {
        entry.stateTree.set(stName, {
          state_name: stName,
          count: 0,
          email_count: 0,
          phone_count: 0,
          clustersMap: new Map(),
          unclustered_count: 0,
          unclusteredDistrictsMap: new Map()
        });
      }
      const stNode = entry.stateTree.get(stName);
      stNode.count += cnt;
      stNode.email_count += emCnt;
      stNode.phone_count += phCnt;

      if (cluName) {
        if (!stNode.clustersMap.has(cluName)) {
          stNode.clustersMap.set(cluName, {
            cluster_name: cluName,
            cluster_code: cluCode,
            color_code: clusterColorByName.get(cluName.toLowerCase()) || '#2563eb',
            count: 0,
            districtsMap: new Map()
          });
        }
        const cluNode = stNode.clustersMap.get(cluName);
        cluNode.count += cnt;
        cluNode.districtsMap.set(distName, (cluNode.districtsMap.get(distName) || 0) + cnt);
      } else {
        stNode.unclustered_count += cnt;
        stNode.unclusteredDistrictsMap.set(distName, (stNode.unclusteredDistrictsMap.get(distName) || 0) + cnt);
      }
    }

    const enriched = segments.map((seg) => {
      const purposeKey = VALID_PURPOSES.includes(seg.purpose) ? seg.purpose : 'epc_signup_login';
      const purposeLabel = PURPOSE_LABELS[purposeKey];
      const counts = filteredCountMap.get(String(seg._id));
      const splits = splitBySegMap.get(String(seg._id));

      const stateBreakdown = splits
        ? Array.from(splits.states.entries())
            .map(([name, count]) => ({ name, count }))
            .sort((a, b) => b.count - a.count)
        : [];
      const clusterBreakdown = splits
        ? Array.from(splits.clusters.entries())
            .map(([name, count]) => ({ name, count }))
            .sort((a, b) => b.count - a.count)
        : [];
      const stateClusterBreakdown = splits
        ? Array.from(splits.stateTree.values())
            .map((st) => ({
              state_name: st.state_name,
              count: st.count,
              email_count: st.email_count,
              phone_count: st.phone_count,
              clusters: Array.from(st.clustersMap.values())
                .map((c) => ({
                  cluster_name: c.cluster_name,
                  cluster_code: c.cluster_code,
                  color_code: c.color_code,
                  count: c.count,
                  districts: Array.from(c.districtsMap.entries())
                    .map(([district_name, count]) => ({ district_name, count }))
                    .sort((a, b) => b.count - a.count)
                }))
                .sort((a, b) => b.count - a.count),
              unclustered_count: st.unclustered_count,
              unclustered_districts: Array.from(st.unclusteredDistrictsMap.entries())
                .map(([district_name, count]) => ({ district_name, count }))
                .sort((a, b) => b.count - a.count)
            }))
            .sort((a, b) => b.count - a.count)
        : [];

      return {
        ...seg,
        purpose: purposeKey,
        purpose_label: purposeLabel,
        segment_type: seg.segment_type || purposeLabel,
        filtered_contact_count: hasGeoFilter ? (counts?.contact_count || 0) : (seg.contact_count || 0),
        filtered_email_count: hasGeoFilter ? (counts?.email_count || 0) : (seg.email_count || 0),
        filtered_phone_count: hasGeoFilter ? (counts?.phone_count || 0) : (seg.phone_count || 0),
        state_breakdown: stateBreakdown,
        cluster_breakdown: clusterBreakdown,
        state_cluster_breakdown: stateClusterBreakdown
      };
    });

    res.json({
      success: true,
      data: enriched,
      purposes: VALID_PURPOSES.map((key) => ({ value: key, label: PURPOSE_LABELS[key] }))
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * GET /marketing/segments/territory-summary — Strictly Segment Group Leads (+ leads promoted from Segment Groups)
 * mapped across State -> Franchisee Cluster -> District. Never includes pre-existing platform EpcAccount records.
 */
const getSegmentTerritorySummary = async (req, res) => {
  try {
    await reconcileSegmentLeadsWithVerifiedEpcs();
    const resolver = await buildGeoAndClusterResolver();
    await syncMissingContactClusters(resolver);

    const { purpose = '', segment_id = '', state = '', cluster = '' } = req.query;

    const segFilter = { deleted_at: null, status: 'active' };
    if (purpose && purpose !== 'all' && VALID_PURPOSES.includes(purpose)) {
      segFilter.purpose = purpose;
    }
    if (segment_id && mongoose.Types.ObjectId.isValid(segment_id)) {
      segFilter._id = new mongoose.Types.ObjectId(segment_id);
    }

    const matchingSegments = await MarketingSegment.find(segFilter).select('_id').lean();
    const segIds = matchingSegments.map((s) => s._id);

    const contactsAgg = segIds.length > 0
      ? await MarketingSegmentContact.aggregate([
          { $match: { deleted_at: null, segment_id: { $in: segIds } } },
          {
            $group: {
              _id: {
                state_id: '$state_id',
                state: '$state',
                cluster_id: '$cluster_id',
                cluster_name: '$cluster_name',
                district_id: '$district_id',
                district: '$district',
                promoted: { $eq: ['$promotion_status', 'promoted_to_verified_epc'] }
              },
              leads_count: { $sum: 1 }
            }
          }
        ])
      : [];

    // Build State -> Clusters -> Districts tree seeded from live FranchiseeClusters (0 leads = neutral on map)
    const statesTreeMap = new Map();
    const ensureStateNode = (stateName, stateId = null) => {
      const canonicalState = (stateId && resolver.stateById.get(String(stateId))?.name) || stateName || 'Unspecified';
      const key = cleanStateToken(canonicalState) || cleanGeoToken(canonicalState) || 'unspecified';
      if (!statesTreeMap.has(key)) {
        const matchedSt = resolver.states.find((s) => cleanStateToken(s.name) === key || cleanGeoToken(s.name) === key);
        statesTreeMap.set(key, {
          state_id: stateId ? String(stateId) : (matchedSt?._id ? String(matchedSt._id) : null),
          state_name: matchedSt?.name || canonicalState,
          segment_leads_count: 0,
          promoted_epcs_count: 0,
          epcs_count: 0,
          total_count: 0,
          clustersMap: new Map(),
          unclusteredDistrictsMap: new Map()
        });
      }
      return statesTreeMap.get(key);
    };

    for (const clu of resolver.franchiseeClusters) {
      if (state && cleanStateToken(state) !== cleanStateToken(clu.state_name)) continue;
      if (
        cluster &&
        cleanGeoToken(cluster) !== cleanGeoToken(clu.cluster_name) &&
        String(cluster).toUpperCase() !== String(clu.cluster_code).toUpperCase()
      ) {
        continue;
      }

      const stNode = ensureStateNode(clu.state_name, clu.state_id);
      const districtsMap = new Map();
      const distIds = clu.district_ids || [];
      const distNames = clu.district_names || [];

      distIds.forEach((did, i) => {
        const dObj = resolver.districtById.get(String(did));
        const dName = dObj?.name || distNames[i] || 'District';
        const dTok = cleanGeoToken(dName);
        districtsMap.set(dTok, {
          district_id: String(did),
          district_name: dName,
          leads_count: 0,
          promoted_epcs_count: 0,
          epcs_count: 0,
          total_count: 0
        });
      });

      for (const dName of distNames) {
        const dTok = cleanGeoToken(dName);
        if (!districtsMap.has(dTok)) {
          districtsMap.set(dTok, {
            district_id: null,
            district_name: dName,
            leads_count: 0,
            promoted_epcs_count: 0,
            epcs_count: 0,
            total_count: 0
          });
        }
      }

      stNode.clustersMap.set(String(clu._id), {
        cluster_id: String(clu._id),
        cluster_name: clu.cluster_name,
        cluster_code: clu.cluster_code,
        color_code: clu.color_code || '#2563eb',
        status: clu.status || 'available',
        districtsMap,
        leads_count: 0,
        promoted_epcs_count: 0,
        epcs_count: 0,
        total_count: 0
      });
    }

    // Merge ONLY uploaded Segment Group Leads (and leads promoted from Segment Groups)
    for (const row of contactsAgg) {
      const rId = row._id;
      const geoResolved =
        rId.state_id && rId.district_id
          ? {
              state_id: rId.state_id,
              state: resolver.stateById.get(String(rId.state_id))?.name || rId.state || 'Unspecified',
              district_id: rId.district_id,
              district: resolver.districtById.get(String(rId.district_id))?.name || rId.district || 'Unspecified',
              cluster_id: rId.cluster_id || null,
              cluster_name: rId.cluster_name || ''
            }
          : resolver.resolve({
              stateName: rId.state || '',
              districtName: rId.district || '',
              clusterName: rId.cluster_name || ''
            });

      const stNameRaw = geoResolved.state || rId.state || 'Unspecified';
      if (state && cleanStateToken(state) !== cleanStateToken(stNameRaw)) continue;
      if (cluster && cleanGeoToken(cluster) !== cleanGeoToken(geoResolved.cluster_name || rId.cluster_name)) continue;

      const stNode = ensureStateNode(stNameRaw, geoResolved.state_id || rId.state_id);
      const distName = geoResolved.district || rId.district || 'Unspecified';
      const distTok = cleanGeoToken(distName) || 'unspecified';
      const count = Number(row.leads_count || 0);
      const isPromoted = Boolean(rId.promoted);

      let cluNode = (geoResolved.cluster_id || rId.cluster_id)
        ? stNode.clustersMap.get(String(geoResolved.cluster_id || rId.cluster_id))
        : null;
      if (!cluNode) {
        for (const candidate of stNode.clustersMap.values()) {
          if (candidate.districtsMap.has(distTok)) {
            cluNode = candidate;
            break;
          }
        }
      }

      if (cluNode) {
        if (isPromoted) {
          cluNode.promoted_epcs_count += count;
          cluNode.epcs_count += count;
        } else {
          cluNode.leads_count += count;
        }

        if (!cluNode.districtsMap.has(distTok)) {
          cluNode.districtsMap.set(distTok, {
            district_id: geoResolved.district_id ? String(geoResolved.district_id) : null,
            district_name: distName,
            leads_count: 0,
            promoted_epcs_count: 0,
            epcs_count: 0,
            total_count: 0
          });
        }
        const dEntry = cluNode.districtsMap.get(distTok);
        if (isPromoted) {
          dEntry.promoted_epcs_count += count;
          dEntry.epcs_count += count;
        } else {
          dEntry.leads_count += count;
        }
        dEntry.total_count = dEntry.leads_count + dEntry.promoted_epcs_count;
      } else {
        if (!stNode.unclusteredDistrictsMap.has(distTok)) {
          stNode.unclusteredDistrictsMap.set(distTok, {
            district_id: geoResolved.district_id ? String(geoResolved.district_id) : null,
            district_name: distName,
            leads_count: 0,
            promoted_epcs_count: 0,
            epcs_count: 0,
            total_count: 0
          });
        }
        const uEntry = stNode.unclusteredDistrictsMap.get(distTok);
        if (isPromoted) {
          uEntry.promoted_epcs_count += count;
          uEntry.epcs_count += count;
        } else {
          uEntry.leads_count += count;
        }
        uEntry.total_count = uEntry.leads_count + uEntry.promoted_epcs_count;
      }
    }

    let totalSegmentLeads = 0;
    let totalPromotedEpcs = 0;
    let totalClusters = 0;
    let activeClustersWithLeads = 0;
    let statesWithLeads = 0;

    const statesList = Array.from(statesTreeMap.values())
      .map((stNode) => {
        let stateSegLeads = 0;
        let statePromoted = 0;

        const clusters = Array.from(stNode.clustersMap.values())
          .map((cluNode) => {
            const districts = Array.from(cluNode.districtsMap.values())
              .map((d) => ({
                district_id: d.district_id,
                district_name: d.district_name,
                leads_count: d.leads_count,
                promoted_epcs_count: d.promoted_epcs_count,
                epcs_count: d.epcs_count,
                total_count: d.leads_count + d.promoted_epcs_count
              }))
              .sort((a, b) => b.leads_count - a.leads_count || a.district_name.localeCompare(b.district_name));

            totalClusters++;
            if (cluNode.leads_count > 0 || cluNode.promoted_epcs_count > 0) {
              activeClustersWithLeads++;
            }
            stateSegLeads += cluNode.leads_count;
            statePromoted += cluNode.promoted_epcs_count;

            return {
              cluster_id: cluNode.cluster_id,
              cluster_name: cluNode.cluster_name,
              cluster_code: cluNode.cluster_code,
              color_code: cluNode.color_code,
              status: cluNode.status,
              leads_count: cluNode.leads_count,
              promoted_epcs_count: cluNode.promoted_epcs_count,
              epcs_count: cluNode.epcs_count,
              total_count: cluNode.leads_count + cluNode.promoted_epcs_count,
              districts
            };
          })
          .sort((a, b) => b.leads_count - a.leads_count || b.promoted_epcs_count - a.promoted_epcs_count || a.cluster_name.localeCompare(b.cluster_name));

        const unclusteredDistricts = Array.from(stNode.unclusteredDistrictsMap.values())
          .map((d) => ({
            district_id: d.district_id,
            district_name: d.district_name,
            leads_count: d.leads_count,
            promoted_epcs_count: d.promoted_epcs_count,
            epcs_count: d.epcs_count,
            total_count: d.leads_count + d.promoted_epcs_count
          }))
          .sort((a, b) => b.leads_count - a.leads_count || a.district_name.localeCompare(b.district_name));

        const unclusteredLeads = unclusteredDistricts.reduce((s, d) => s + d.leads_count, 0);
        const unclusteredPromoted = unclusteredDistricts.reduce((s, d) => s + d.promoted_epcs_count, 0);

        stateSegLeads += unclusteredLeads;
        statePromoted += unclusteredPromoted;
        totalSegmentLeads += stateSegLeads;
        totalPromotedEpcs += statePromoted;
        if (stateSegLeads > 0) statesWithLeads++;

        return {
          state_id: stNode.state_id,
          state_name: stNode.state_name,
          segment_leads_count: stateSegLeads,
          promoted_epcs_count: statePromoted,
          epcs_count: statePromoted,
          total_count: stateSegLeads + statePromoted,
          clusters,
          unclustered_leads: unclusteredLeads,
          unclustered_districts: unclusteredDistricts
        };
      })
      .filter((st) => st.segment_leads_count > 0 || st.promoted_epcs_count > 0 || st.clusters.length > 0)
      .sort((a, b) => b.segment_leads_count - a.segment_leads_count || b.clusters.length - a.clusters.length || a.state_name.localeCompare(b.state_name));

    res.json({
      success: true,
      totals: {
        states_with_leads: statesWithLeads,
        states_active: statesWithLeads,
        total_clusters: totalClusters,
        active_clusters: activeClustersWithLeads,
        clusters_with_leads: activeClustersWithLeads,
        total_segment_leads: totalSegmentLeads,
        total_promoted_epcs: totalPromotedEpcs,
        total_epcs_in_clusters: totalPromotedEpcs,
        total_epcs: totalPromotedEpcs
      },
      states: statesList
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * POST /marketing/segments — Create an isolated Segment Group with Purpose & dynamic Kit selection.
 */
const createSegment = async (req, res) => {
  try {
    const {
      name,
      purpose = 'epc_signup_login',
      selected_kits = [],
      description = '',
      field_definitions = []
    } = req.body;

    if (!name || !String(name).trim()) {
      return res.status(400).json({ success: false, message: 'Segment name is required.' });
    }
    if (!VALID_PURPOSES.includes(purpose)) {
      return res.status(400).json({ success: false, message: 'Invalid segment purpose selected.' });
    }

    const cleanKits = purpose === 'kit_sales' ? normalizeSelectedKits(selected_kits) : [];
    const purposeLabel = PURPOSE_LABELS[purpose];

    const segment = await MarketingSegment.create({
      name: String(name).trim(),
      segment_type: purposeLabel,
      purpose,
      selected_kits: cleanKits,
      description: String(description || '').trim(),
      field_definitions: normalizeFieldDefinitions(field_definitions),
      created_by: req.user?.id && mongoose.Types.ObjectId.isValid(req.user.id) ? req.user.id : null
    });

    res.status(201).json({
      success: true,
      data: { ...segment.toObject(), purpose_label: purposeLabel }
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

/**
 * PUT /marketing/segments/:id — Update segment name, purpose, selected kits & auto-matched fields.
 */
const updateSegment = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid segment ID.' });
    }

    const segment = await MarketingSegment.findOne({ _id: id, deleted_at: null });
    if (!segment) {
      return res.status(404).json({ success: false, message: 'Segment not found.' });
    }

    const { name, purpose, selected_kits, description, field_definitions, status } = req.body;
    if (name !== undefined && String(name).trim()) segment.name = String(name).trim();
    if (purpose !== undefined) {
      if (!VALID_PURPOSES.includes(purpose)) {
        return res.status(400).json({ success: false, message: 'Invalid segment purpose.' });
      }
      segment.purpose = purpose;
      segment.segment_type = PURPOSE_LABELS[purpose];
      if (purpose !== 'kit_sales') {
        segment.selected_kits = [];
      }
    }
    if (selected_kits !== undefined && segment.purpose === 'kit_sales') {
      segment.selected_kits = normalizeSelectedKits(selected_kits);
    }
    if (description !== undefined) segment.description = String(description || '').trim();
    if (field_definitions !== undefined) segment.field_definitions = normalizeFieldDefinitions(field_definitions);
    if (['active', 'archived'].includes(status)) segment.status = status;

    await segment.save();
    res.json({
      success: true,
      data: {
        ...segment.toObject(),
        purpose_label: PURPOSE_LABELS[segment.purpose] || PURPOSE_LABELS.epc_signup_login
      }
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

/**
 * DELETE /marketing/segments/:id — Soft-delete a segment and its contacts.
 */
const deleteSegment = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid segment ID.' });
    }

    const now = new Date();
    const segment = await MarketingSegment.findOneAndUpdate(
      { _id: id, deleted_at: null },
      { $set: { deleted_at: now, status: 'archived' } },
      { new: true }
    );

    if (!segment) {
      return res.status(404).json({ success: false, message: 'Segment not found.' });
    }

    await MarketingSegmentContact.updateMany(
      { segment_id: id, deleted_at: null },
      { $set: { deleted_at: now, is_admin_deleted: true } }
    );

    res.json({ success: true, message: 'Segment group deleted successfully.' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * GET /marketing/segments/:id/contacts — Fetch active contacts filtered by State, Cluster, District & Search.
 */
const getSegmentContacts = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid segment ID.' });
    }

    await reconcileSegmentLeadsWithVerifiedEpcs(id);
    const resolver = await buildGeoAndClusterResolver();
    await syncMissingContactClusters(resolver, id);

    const segment = await MarketingSegment.findOne({ _id: id, deleted_at: null }).lean();
    if (!segment) {
      return res.status(404).json({ success: false, message: 'Segment not found.' });
    }

    const { search = '', state = '', cluster = '', district = '', page = 1, limit = 50 } = req.query;
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(200, Math.max(1, parseInt(limit, 10) || 50));

    const query = {
      segment_id: new mongoose.Types.ObjectId(id),
      deleted_at: null,
      promotion_status: { $ne: 'promoted_to_verified_epc' }
    };

    const andClauses = buildContactLocationClauses({ state, cluster, district });
    if (search && String(search).trim()) {
      const qRx = new RegExp(escapeRegex(String(search).trim()), 'i');
      andClauses.push({
        $or: [
          { name: qRx },
          { email: qRx },
          { phone: qRx },
          { phone_normalized: qRx },
          { state: qRx },
          { cluster_name: qRx },
          { district: qRx }
        ]
      });
    }
    if (andClauses.length > 0) query.$and = andClauses;

    const [contacts, total] = await Promise.all([
      MarketingSegmentContact.find(query)
        .sort({ created_at: -1 })
        .skip((pageNum - 1) * limitNum)
        .limit(limitNum)
        .lean(),
      MarketingSegmentContact.countDocuments(query)
    ]);

    res.json({
      success: true,
      segment: {
        ...segment,
        purpose_label: PURPOSE_LABELS[segment.purpose] || PURPOSE_LABELS.epc_signup_login
      },
      data: contacts,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        total_pages: Math.max(1, Math.ceil(total / limitNum))
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * POST /marketing/segments/:id/upload-csv — Import CSV rows strictly into marketing_segment_contacts.
 * Preserves all columns, checks Option B global DB deduplication per row (never blocking valid rows),
 * and returns skipped row details for popup notification.
 */
const uploadSegmentCsv = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid segment ID.' });
    }

    const segment = await MarketingSegment.findOne({ _id: id, deleted_at: null });
    if (!segment) {
      return res.status(404).json({ success: false, message: 'Segment not found.' });
    }

    const {
      rows = [],
      column_mapping = {},
      field_definitions = null,
      default_state = '',
      default_district = '',
      default_cluster = '',
      required_fields = null,
      source_file_name = 'upload.csv'
    } = req.body;
    const reqFieldsSet = Array.isArray(required_fields) ? new Set(required_fields) : null;

    if (!Array.isArray(rows) || rows.length === 0) {
      return res.status(400).json({ success: false, message: 'No CSV rows provided for import.' });
    }

    if (Array.isArray(field_definitions) && field_definitions.length > 0) {
      segment.field_definitions = normalizeFieldDefinitions(field_definitions);
    }

    const [
      allEpcs,
      activeCompanyGsts,
      allResellers,
      websiteLeads,
      bdeEpcLeads,
      franchiseLeads,
      bdeFranchiseLeads,
      existingSegContacts,
      allSegmentsList,
      geoResolver
    ] = await Promise.all([
      EpcAccount.find({ deleted_at: null })
        .select('name email whatsapp registered_whatsapp gstin is_gstin_active gst_verification_status')
        .lean(),
      EpcCompanyGst.find({ deleted_at: null }).select('company_id gst_number').lean(),
      Reseller
        ? Reseller.find({ deleted_at: null }).select('business_name email mobile').lean().catch(() => [])
        : Promise.resolve([]),
      WebsiteEpcLead
        ? WebsiteEpcLead.find({ deleted_at: null }).select('name company_name email phone mobile_number').lean().catch(() => [])
        : Promise.resolve([]),
      EPCLead
        ? EPCLead.find({ deleted_at: null }).select('company_name contact_person email mobile_number').lean().catch(() => [])
        : Promise.resolve([]),
      FranchiseLead
        ? FranchiseLead.find({ deleted_at: null }).select('full_name business_name email mobile_number whatsapp_number').lean().catch(() => [])
        : Promise.resolve([]),
      BDELead
        ? BDELead.find({ deleted_at: null }).select('prospect_name company_name email mobile_number').lean().catch(() => [])
        : Promise.resolve([]),
      MarketingSegmentContact.find({
        is_admin_deleted: { $ne: true },
        $or: [{ deleted_at: null }, { promotion_status: 'promoted_to_verified_epc' }]
      })
        .select('segment_id name email phone_normalized promotion_status')
        .lean(),
      MarketingSegment.find({ deleted_at: null }).select('_id name').lean(),
      buildGeoAndClusterResolver()
    ]);

    const segmentNameById = new Map(allSegmentsList.map((s) => [String(s._id), s.name]));

    // Global lookup maps (Priority: Verified EPC > Registered EPC > Franchisee > CRM Leads > Segment Leads)
    const dbEmailMap = new Map();
    const dbPhoneMap = new Map();

    const registerDbIdentity = (emailVal, phoneVals, info) => {
      const e = normalizeEmail(emailVal);
      if (e && !dbEmailMap.has(e)) dbEmailMap.set(e, info);
      const list = Array.isArray(phoneVals) ? phoneVals : [phoneVals];
      for (const pv of list) {
        const p = normalizePhone10(pv);
        if (p && !dbPhoneMap.has(p)) dbPhoneMap.set(p, info);
      }
    };

    for (const acc of allEpcs) {
      const isVerified =
        acc.is_gstin_active === true ||
        ['verified_automatic', 'verified_admin'].includes(acc.gst_verification_status);
      registerDbIdentity(acc.email, [acc.whatsapp, acc.registered_whatsapp], {
        code: isVerified ? 'verified_epc' : 'registered_epc',
        source: isVerified ? 'Verified EPC Account' : 'Registered EPC Account',
        existingName: acc.name || '',
        isVerifiedEpc: isVerified
      });
    }

    if (activeCompanyGsts.length > 0) {
      const companyIds = [...new Set(activeCompanyGsts.map((g) => g.company_id).filter(Boolean))];
      const companies = await EpcCompany.find({ _id: { $in: companyIds }, deleted_at: null })
        .select('email name')
        .lean();
      for (const comp of companies) {
        registerDbIdentity(comp.email, [], {
          code: 'verified_epc',
          source: 'Verified EPC Company',
          existingName: comp.name || '',
          isVerifiedEpc: true
        });
      }
    }

    for (const r of allResellers) {
      registerDbIdentity(r.email, [r.mobile], {
        code: 'franchisee',
        source: 'Registered Franchisee',
        existingName: r.business_name || '',
        isVerifiedEpc: false
      });
    }

    for (const wl of websiteLeads) {
      registerDbIdentity(wl.email, [wl.phone, wl.mobile_number], {
        code: 'crm_lead',
        source: 'Website EPC Lead',
        existingName: wl.company_name || wl.name || '',
        isVerifiedEpc: false
      });
    }

    for (const bl of bdeEpcLeads) {
      registerDbIdentity(bl.email, [bl.mobile_number], {
        code: 'crm_lead',
        source: 'BDE EPC Lead',
        existingName: bl.company_name || bl.contact_person || '',
        isVerifiedEpc: false
      });
    }

    for (const fl of franchiseLeads) {
      registerDbIdentity(fl.email, [fl.mobile_number, fl.whatsapp_number], {
        code: 'crm_lead',
        source: 'Franchisee Application Lead',
        existingName: fl.business_name || fl.full_name || '',
        isVerifiedEpc: false
      });
    }

    for (const bfl of bdeFranchiseLeads) {
      registerDbIdentity(bfl.email, [bfl.mobile_number], {
        code: 'crm_lead',
        source: 'BDE Franchisee Lead',
        existingName: bfl.company_name || bfl.prospect_name || '',
        isVerifiedEpc: false
      });
    }

    const currentSegIdStr = String(segment._id);
    for (const ex of existingSegContacts) {
      const sameSeg = String(ex.segment_id) === currentSegIdStr;
      const segLabel = segmentNameById.get(String(ex.segment_id)) || 'Another Segment Group';
      registerDbIdentity(ex.email, [ex.phone_normalized], {
        code: sameSeg ? 'existing_segment' : 'other_segment',
        source: sameSeg ? `Already in this Segment (${segment.name})` : `Segment Group: ${segLabel}`,
        existingName: ex.name || '',
        isVerifiedEpc: ex.promotion_status === 'promoted_to_verified_epc'
      });
    }

    const inFileEmails = new Set();
    const inFilePhones = new Set();

    const mappingEntries = Object.entries(column_mapping || {}).filter(([, v]) => v && (v.key || v.role));
    const docsToInsert = [];
    const skippedDetails = [];

    let skippedVerifiedEpcs = 0;
    let skippedRegisteredEpcs = 0;
    let skippedFranchisees = 0;
    let skippedCrmLeads = 0;
    let skippedExistingSegmentLeads = 0;
    let skippedDuplicateInFile = 0;
    let skippedInvalid = 0;
    const stateSummary = {};
    const clusterSummary = {};

    const readRowValue = (rawRow, csvHeader, mapKey) => {
      if (rawRow[csvHeader] !== undefined) return rawRow[csvHeader];
      const sanitizedHeader = String(csvHeader || '').replace(/[\$\.]/g, '_');
      if (rawRow[sanitizedHeader] !== undefined) return rawRow[sanitizedHeader];
      if (mapKey && rawRow[mapKey] !== undefined) return rawRow[mapKey];
      return undefined;
    };

    for (let rowIdx = 0; rowIdx < rows.length; rowIdx++) {
      const rawRow = rows[rowIdx];
      if (!rawRow || typeof rawRow !== 'object') {
        skippedInvalid++;
        continue;
      }

      let name = '';
      let email = '';
      const phoneCandidates = [];
      let stateVal = '';
      let districtVal = '';
      let clusterVal = '';
      const dynamicFields = {};

      if (mappingEntries.length > 0) {
        for (const [csvHeader, mapCfg] of mappingEntries) {
          const key = slugifyKey(mapCfg.key || csvHeader);
          const rawVal = readRowValue(rawRow, csvHeader, key);
          const val = rawVal !== undefined && rawVal !== null ? String(rawVal).trim() : '';
          const role = mapCfg.role || 'custom';

          if (role === 'email' && val && !email) email = normalizeEmail(val);
          else if (role === 'name' && val && !name) name = val;
          else if (role === 'phone' && val) phoneCandidates.push({ key, val });
          else if (role === 'state' && val && !stateVal) stateVal = val;
          else if (role === 'district' && val && !districtVal) districtVal = val;
          else if (role === 'cluster' && val && !clusterVal) clusterVal = val;

          if (val !== '') {
            dynamicFields[key] = val;
          }
        }
      } else {
        Object.entries(rawRow).forEach(([header, rawVal], idx) => {
          const val = rawVal !== undefined && rawVal !== null ? String(rawVal).trim() : '';
          const matched = matchHeaderToDbField(header, idx);

          if (matched.role === 'email' && val && !email) email = normalizeEmail(val);
          else if (matched.role === 'phone' && val) phoneCandidates.push({ key: matched.key, val });
          else if (matched.role === 'name' && val && !name) name = val;
          else if (matched.role === 'state' && val && !stateVal) stateVal = val;
          else if (matched.role === 'district' && val && !districtVal) districtVal = val;
          else if (matched.role === 'cluster' && val && !clusterVal) clusterVal = val;

          if (val !== '') dynamicFields[matched.key] = val;
        });
      }

      if (!name && dynamicFields.company_name) {
        name = dynamicFields.company_name;
      }
      if (!stateVal && default_state) stateVal = String(default_state).trim();
      if (!districtVal && default_district) districtVal = String(default_district).trim();
      if (!clusterVal && default_cluster) clusterVal = String(default_cluster).trim();

      const normalizedPhones = [];
      for (const cand of phoneCandidates) {
        const p10 = normalizePhone10(cand.val);
        if (p10 && !normalizedPhones.includes(p10)) normalizedPhones.push(p10);
      }
      const phone10 = normalizedPhones[0] || '';
      const rawPhoneDisplay = phoneCandidates.find((c) => c.val)?.val || '';

      const hasCustomReqRules = reqFieldsSet !== null;
      const missingCustomRequired = [];
      if (hasCustomReqRules) {
        if (reqFieldsSet.has('name') && !name) missingCustomRequired.push('Name');
        if (reqFieldsSet.has('phone') && !phone10) missingCustomRequired.push('Phone');
        if (reqFieldsSet.has('email') && !email) missingCustomRequired.push('Email');
        if (reqFieldsSet.has('state') && !stateVal && !districtVal) missingCustomRequired.push('State');
        if (reqFieldsSet.has('district') && !districtVal) missingCustomRequired.push('District');
      }

      const failsDefaultContactCheck = hasCustomReqRules
        ? !name && !email && !phone10
        : !email && !phone10;

      if (missingCustomRequired.length > 0 || failsDefaultContactCheck) {
        const errReason = missingCustomRequired.length > 0
          ? `Missing required field(s): ${missingCustomRequired.join(', ')}`
          : 'Missing valid 10-digit phone or email';
        skippedInvalid++;
        if (skippedDetails.length < 300) {
          skippedDetails.push({
            row_number: rowIdx + 1,
            name: name || 'Unknown Row',
            email: '',
            phone: rawPhoneDisplay || '',
            reason_code: 'invalid',
            reason: errReason,
            reason_label: errReason,
            existing_source: 'Invalid Row'
          });
        }
        continue;
      }

      // Check strict global DB duplication first
      let dbMatch = (email && dbEmailMap.get(email)) || null;
      if (!dbMatch) {
        for (const p10 of normalizedPhones) {
          if (dbPhoneMap.has(p10)) {
            dbMatch = dbPhoneMap.get(p10);
            break;
          }
        }
      }

      if (dbMatch) {
        if (dbMatch.code === 'verified_epc') {
          skippedVerifiedEpcs++;
          await promoteMatchingSegmentLeads({ email, phone: phone10 });
        } else if (dbMatch.code === 'registered_epc') {
          skippedRegisteredEpcs++;
        } else if (dbMatch.code === 'franchisee') {
          skippedFranchisees++;
        } else if (dbMatch.code === 'crm_lead') {
          skippedCrmLeads++;
        } else {
          skippedExistingSegmentLeads++;
        }

        if (skippedDetails.length < 300) {
          skippedDetails.push({
            row_number: rowIdx + 1,
            name: name || dbMatch.existingName || email || phone10,
            email: email || '',
            phone: phone10 || rawPhoneDisplay,
            reason_code: dbMatch.code,
            reason: `Already registered in ${dbMatch.source}`,
            reason_label: `Already registered in ${dbMatch.source}`,
            existing_source: dbMatch.source
          });
        }
        continue;
      }

      // Check within-file duplication
      const dupInFile =
        (email && inFileEmails.has(email)) ||
        normalizedPhones.some((p10) => inFilePhones.has(p10));

      if (dupInFile) {
        skippedDuplicateInFile++;
        if (skippedDetails.length < 300) {
          skippedDetails.push({
            row_number: rowIdx + 1,
            name: name || email || phone10,
            email: email || '',
            phone: phone10 || rawPhoneDisplay,
            reason_code: 'duplicate_in_file',
            reason: 'Duplicate phone/email inside the same CSV file',
            reason_label: 'Duplicate phone/email inside the same CSV file',
            existing_source: 'Duplicate in CSV'
          });
        }
        continue;
      }

      if (email) inFileEmails.add(email);
      normalizedPhones.forEach((p10) => inFilePhones.add(p10));

      const resolvedGeo = geoResolver.resolve({
        stateName: stateVal,
        districtName: districtVal,
        clusterName: clusterVal
      });

      const finalState = resolvedGeo.state || stateVal;
      const finalDistrict = resolvedGeo.district || districtVal;
      const finalClusterName = resolvedGeo.cluster_name || clusterVal;

      if (finalState) stateSummary[finalState] = (stateSummary[finalState] || 0) + 1;
      if (finalClusterName) clusterSummary[finalClusterName] = (clusterSummary[finalClusterName] || 0) + 1;

      docsToInsert.push({
        segment_id: segment._id,
        name: name || email || phone10 || 'Prospect',
        email: email || '',
        phone: phone10 || rawPhoneDisplay || '',
        phone_normalized: phone10,
        state: finalState,
        state_id: resolvedGeo.state_id,
        district: finalDistrict,
        district_id: resolvedGeo.district_id,
        cluster_id: resolvedGeo.cluster_id,
        cluster_name: finalClusterName,
        cluster_code: resolvedGeo.cluster_code,
        dynamic_fields: dynamicFields,
        source_file_name: String(source_file_name || 'upload.csv').trim(),
        promotion_status: 'active',
        is_admin_deleted: false,
        deleted_at: null
      });
    }

    if (docsToInsert.length > 0) {
      await MarketingSegmentContact.insertMany(docsToInsert, { ordered: false });
      segment.last_uploaded_at = new Date();
    }

    await segment.save();
    await recalculateSegmentStats([segment._id]);
    const refreshedSegment = await MarketingSegment.findById(segment._id).lean();

    const duplicatesSkipped =
      skippedRegisteredEpcs +
      skippedFranchisees +
      skippedCrmLeads +
      skippedExistingSegmentLeads +
      skippedDuplicateInFile;

    res.status(201).json({
      success: true,
      total_rows: rows.length,
      imported: docsToInsert.length,
      skipped_verified_epcs: skippedVerifiedEpcs,
      skipped_registered_epcs: skippedRegisteredEpcs,
      skipped_franchisees: skippedFranchisees,
      skipped_crm_leads: skippedCrmLeads,
      skipped_existing_segment_leads: skippedExistingSegmentLeads,
      skipped_duplicate_in_file: skippedDuplicateInFile,
      duplicates_skipped: duplicatesSkipped,
      skipped_invalid: skippedInvalid,
      skipped_details: skippedDetails,
      state_summary: stateSummary,
      cluster_summary: clusterSummary,
      segment: {
        ...refreshedSegment,
        purpose_label: PURPOSE_LABELS[refreshedSegment?.purpose] || PURPOSE_LABELS.epc_signup_login
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * DELETE /marketing/segments/:id/contacts/:contactId — Soft-delete one segment contact and update stats.
 */
const deleteSegmentContact = async (req, res) => {
  try {
    const { id, contactId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id) || !mongoose.Types.ObjectId.isValid(contactId)) {
      return res.status(400).json({ success: false, message: 'Invalid segment or contact ID.' });
    }

    const updated = await MarketingSegmentContact.findOneAndUpdate(
      { _id: contactId, segment_id: id, deleted_at: null },
      { $set: { deleted_at: new Date(), is_admin_deleted: true } },
      { new: true }
    );

    if (!updated) {
      return res.status(404).json({ success: false, message: 'Contact not found.' });
    }

    await recalculateSegmentStats([id]);
    res.json({ success: true, message: 'Contact removed from segment.' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * DELETE /marketing/segments/:id/contacts — Clear active/malformed contacts in a segment for clean re-import.
 */
const clearSegmentContacts = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid segment ID.' });
    }

    const now = new Date();
    const result = await MarketingSegmentContact.updateMany(
      { segment_id: id, deleted_at: null },
      { $set: { deleted_at: now, is_admin_deleted: true } }
    );

    if (req.query.reset_fields === 'true') {
      await MarketingSegment.updateOne(
        { _id: id },
        {
          $set: {
            field_definitions: [
              { key: 'name', label: 'Name', role: 'name' },
              { key: 'email', label: 'Email', role: 'email' },
              { key: 'phone', label: 'Phone / WhatsApp', role: 'phone' },
              { key: 'state', label: 'State', role: 'state' },
              { key: 'district', label: 'District', role: 'district' }
            ]
          }
        }
      );
    }

    await recalculateSegmentStats([id]);
    res.json({
      success: true,
      cleared_count: result.modifiedCount || 0,
      message: `Cleared ${result.modifiedCount || 0} lead(s) from segment.`
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * GET /marketing/segments/analytics — Dynamic live Segment Group conversion & campaign impact analytics.
 */
const getSegmentAnalytics = async (req, res) => {
  try {
    const data = await computeDynamicSegmentAnalytics(req.query || {});
    res.json({ success: true, data });
  } catch (error) {
    console.error('❌ [SegmentGroups] getSegmentAnalytics error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * POST /marketing/segments/sync-verified-epcs — Trigger real-time reconciliation across Segment Groups.
 */
const syncVerifiedEpcsWithSegments = async (req, res) => {
  try {
    const { segment_id = null } = req.body || {};
    const result = await reconcileSegmentLeadsWithVerifiedEpcs(segment_id);
    res.json({ success: true, ...result });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  getLeadSources,
  getLocationStates,
  getLocationDistricts,
  getLocationClusters,
  getConfiguredKits,
  getSegments,
  getSegmentTerritorySummary,
  getSegmentAnalytics,
  createSegment,
  updateSegment,
  deleteSegment,
  getSegmentContacts,
  uploadSegmentCsv,
  deleteSegmentContact,
  clearSegmentContacts,
  syncVerifiedEpcsWithSegments,
  matchHeaderToDbField,
  cleanGeoToken,
  cleanStateToken,
  buildGeoAndClusterResolver
};
