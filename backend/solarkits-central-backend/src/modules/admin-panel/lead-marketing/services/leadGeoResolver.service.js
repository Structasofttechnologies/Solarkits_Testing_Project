const mongoose = require('mongoose');
const { GeoLevel0, GeoLevel1, GeoLevel2 } = require('../../models/geolocation_db');
const { FranchiseeCluster, BDEProfile } = require('../../models/india_solarshop_db');
const { LeadMaster } = require('../models');

const normalizeEmail = (val) => String(val || '').trim().toLowerCase();
const isValidEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizeEmail(email));

const normalizeDigits = (val) => String(val || '').replace(/\D/g, '');
const normalizePhone10 = (val) => {
  const digits = normalizeDigits(val);
  return digits.length >= 10 ? digits.slice(-10) : digits;
};

const STATE_ALIASES = {
  mh: 'maharashtra',
  mah: 'maharashtra',
  maharastra: 'maharashtra',
  gj: 'gujarat',
  guj: 'gujarat',
  gujrat: 'gujarat',
  rj: 'rajasthan',
  raj: 'rajasthan',
  ka: 'karnataka',
  kar: 'karnataka',
  up: 'uttarpradesh',
  mp: 'madhyapradesh',
  tn: 'tamilnadu',
  dl: 'delhi',
  nctofdelhi: 'delhi',
  newdelhi: 'delhi',
  wb: 'westbengal',
  tg: 'telangana',
  ts: 'telangana',
  ap: 'andhrapradesh',
  pb: 'punjab',
  hr: 'haryana',
  kl: 'kerala',
  or: 'odisha',
  od: 'odisha',
  orissa: 'odisha',
  br: 'bihar',
  jh: 'jharkhand',
  cg: 'chhattisgarh',
  as: 'assam',
  uk: 'uttarakhand',
  hp: 'himachalpradesh',
  ga: 'goa'
};

const cleanToken = (val) =>
  String(val || '')
    .trim()
    .toLowerCase()
    .replace(/\b(district|dist|state|cluster|india)\b/g, ' ')
    .replace(/[^a-z0-9]/g, '');

const cleanStateToken = (val) => {
  const tok = cleanToken(val);
  return STATE_ALIASES[tok] || tok;
};

const slugify = (s) =>
  String(s || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');

const buildDateRangeFilter = (datePreset = 'all', startDate = null, endDate = null) => {
  const now = new Date();
  let start = null;
  let end = null;

  switch (datePreset) {
    case 'today': {
      start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
      end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
      break;
    }
    case '7d': {
      start = new Date(now.getTime() - 7 * 86400000);
      end = now;
      break;
    }
    case '30d': {
      start = new Date(now.getTime() - 30 * 86400000);
      end = now;
      break;
    }
    case 'current_month': {
      start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
      end = now;
      break;
    }
    case 'previous_month': {
      start = new Date(now.getFullYear(), now.getMonth() - 1, 1, 0, 0, 0, 0);
      end = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
      break;
    }
    case 'financial_year': {
      const fyStartYear = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
      start = new Date(fyStartYear, 3, 1, 0, 0, 0, 0);
      end = now;
      break;
    }
    case 'custom': {
      if (startDate) {
        const s = new Date(startDate);
        if (!Number.isNaN(s.getTime())) start = s;
      }
      if (endDate) {
        const e = new Date(endDate);
        if (!Number.isNaN(e.getTime())) {
          e.setHours(23, 59, 59, 999);
          end = e;
        }
      }
      break;
    }
    default:
      break;
  }

  if (!start && !end) return null;
  const range = {};
  if (start) range.$gte = start;
  if (end) range.$lte = end;
  return range;
};

/**
 * Generates unique sequential/collision-safe identifiers: LD-2026-000001
 */
const generateUniqueCode = async (Model, field, prefix) => {
  const year = new Date().getFullYear();
  const base = `${prefix}-${year}-`;
  const latest = await Model.findOne({ [field]: new RegExp(`^${base}\\d+$`) })
    .sort({ [field]: -1 })
    .select(field)
    .lean()
    .catch(() => null);

  let nextNum = 1;
  if (latest && latest[field]) {
    const parts = String(latest[field]).split('-');
    const parsed = parseInt(parts[parts.length - 1], 10);
    if (!Number.isNaN(parsed)) nextNum = parsed + 1;
  }

  let candidate = `${base}${String(nextNum).padStart(6, '0')}`;
  // Guard concurrent inserts cleanly
  while (await Model.exists({ [field]: candidate })) {
    nextNum += 1;
    candidate = `${base}${String(nextNum).padStart(6, '0')}`;
  }
  return candidate;
};

/**
 * Builds an in-memory geo + BDE resolver backed strictly by live MongoDB collections
 * so bulk Excel imports & manual lead creation resolve exact ObjectIds and cluster links fast.
 */
const buildMasterLookups = async () => {
  const [countries, states, districts, clusters, bdes] = await Promise.all([
    GeoLevel0 ? GeoLevel0.find({ deleted_at: null }).select('_id name iso2 phone_code').lean().catch(() => []) : [],
    GeoLevel1 ? GeoLevel1.find({ deleted_at: null }).select('_id name country_id').lean().catch(() => []) : [],
    GeoLevel2 ? GeoLevel2.find({ deleted_at: null }).select('_id name state_id').lean().catch(() => []) : [],
    FranchiseeCluster ? FranchiseeCluster.find({ deleted_at: null, is_active: true }).select('_id cluster_name cluster_code state_id state_name district_ids district_names status color_code').sort({ cluster_name: 1 }).lean().catch(() => []) : [],
    BDEProfile ? BDEProfile.find({}).select('_id bde_id full_name email mobile_number state_name district_name').lean().catch(() => []) : []
  ]);

  const countryByToken = new Map();
  for (const c of countries) {
    countryByToken.set(cleanToken(c.name), c);
    if (c.iso2) countryByToken.set(String(c.iso2).toLowerCase(), c);
  }

  const stateByToken = new Map();
  const stateById = new Map();
  for (const s of states) {
    stateById.set(String(s._id), s);
    stateByToken.set(cleanStateToken(s.name), s);
  }

  const districtByStateAndToken = new Map();
  const districtByToken = new Map();
  for (const d of districts) {
    const dt = cleanToken(d.name);
    if (d.state_id) {
      districtByStateAndToken.set(`${String(d.state_id)}_${dt}`, d);
    }
    if (!districtByToken.has(dt)) districtByToken.set(dt, d);
  }

  const clusterByToken = new Map();
  const clusterById = new Map();
  const clusterByDistrictToken = new Map();
  for (const cl of clusters) {
    clusterById.set(String(cl._id), cl);
    clusterByToken.set(cleanToken(cl.cluster_name), cl);
    if (cl.cluster_code) clusterByToken.set(cleanToken(cl.cluster_code), cl);
    for (const dn of cl.district_names || []) {
      const key = `${cleanStateToken(cl.state_name)}_${cleanToken(dn)}`;
      if (!clusterByDistrictToken.has(key)) clusterByDistrictToken.set(key, cl);
    }
  }

  const bdeByToken = new Map();
  for (const b of bdes) {
    if (b.full_name) bdeByToken.set(cleanToken(b.full_name), b);
    if (b.email) bdeByToken.set(normalizeEmail(b.email), b);
    if (b.bde_id) bdeByToken.set(cleanToken(b.bde_id), b);
    if (b.mobile_number) bdeByToken.set(normalizePhone10(b.mobile_number), b);
  }

  const resolve = ({ country, state, district, cluster, bde } = {}) => {
    let countryDoc = countryByToken.get(cleanToken(country || 'India')) || null;
    if (!countryDoc && !country) {
      countryDoc = countryByToken.get('india') || countries[0] || null;
    }

    const stateDoc = state ? stateByToken.get(cleanStateToken(state)) || null : null;
    const resolvedStateName = stateDoc?.name || String(state || '').trim();

    let districtDoc = null;
    if (district) {
      const dt = cleanToken(district);
      districtDoc =
        (stateDoc && districtByStateAndToken.get(`${String(stateDoc._id)}_${dt}`)) ||
        districtByToken.get(dt) ||
        null;
    }
    const resolvedDistrictName = districtDoc?.name || String(district || '').trim();

    let clusterDoc = null;
    if (cluster) {
      if (mongoose.Types.ObjectId.isValid(String(cluster))) {
        clusterDoc = clusterById.get(String(cluster)) || null;
      }
      if (!clusterDoc) {
        clusterDoc = clusterByToken.get(cleanToken(cluster)) || null;
      }
    }
    if (!clusterDoc && resolvedStateName && resolvedDistrictName) {
      clusterDoc =
        clusterByDistrictToken.get(`${cleanStateToken(resolvedStateName)}_${cleanToken(resolvedDistrictName)}`) || null;
    }

    let bdeDoc = null;
    if (bde) {
      if (mongoose.Types.ObjectId.isValid(String(bde))) {
        bdeDoc = bdes.find((x) => String(x._id) === String(bde)) || null;
      } else {
        const bStr = String(bde).trim();
        bdeDoc =
          bdeByToken.get(cleanToken(bStr)) ||
          bdeByToken.get(normalizeEmail(bStr)) ||
          bdeByToken.get(normalizePhone10(bStr)) ||
          null;
      }
    }

    return {
      country_id: countryDoc?._id || null,
      country_name: countryDoc?.name || String(country || 'India').trim() || 'India',
      state_id: stateDoc?._id || (districtDoc?.state_id || null),
      state_name: resolvedStateName || (districtDoc?.state_id ? stateById.get(String(districtDoc.state_id))?.name || '' : ''),
      district_id: districtDoc?._id || null,
      district_name: resolvedDistrictName,
      cluster_id: clusterDoc?._id || null,
      cluster_name: clusterDoc?.cluster_name || String(cluster || '').trim(),
      cluster_code: clusterDoc?.cluster_code || null,
      assigned_bde_id: bdeDoc?._id || null,
      assigned_bde_name: bdeDoc?.full_name || null
    };
  };

  return {
    countries,
    states,
    districts,
    clusters,
    bdes,
    resolve
  };
};

/**
 * Generates unique Lead ID for batch imports smoothly without hitting DB inside a tight loop.
 */
const reserveLeadCodeSequence = async (count = 1) => {
  const year = new Date().getFullYear();
  const base = `LD-${year}-`;
  const latest = await LeadMaster.findOne({ lead_id: new RegExp(`^${base}\\d+$`) })
    .sort({ lead_id: -1 })
    .select('lead_id')
    .lean()
    .catch(() => null);

  let nextNum = 1;
  if (latest?.lead_id) {
    const parsed = parseInt(String(latest.lead_id).split('-').pop(), 10);
    if (!Number.isNaN(parsed)) nextNum = parsed + 1;
  }

  return () => {
    const code = `${base}${String(nextNum).padStart(6, '0')}`;
    nextNum += 1;
    return code;
  };
};

module.exports = {
  normalizeEmail,
  isValidEmail,
  normalizeDigits,
  normalizePhone10,
  cleanToken,
  slugify,
  buildDateRangeFilter,
  generateUniqueCode,
  buildMasterLookups,
  reserveLeadCodeSequence
};
