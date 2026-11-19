/**
 * epc.quotes.handler.js
 *
 * EPC Quotation & Follow-up Module — Central Controller
 * Handles both Franchisee (req.reseller) and BDE (req.bde) contexts.
 *
 * Sections:
 *   1. Eligibility Engine
 *   2. Pricing Engine
 *   3. Quote Number Generator
 *   4. Quote CRUD (create draft, update, generate, get, list)
 *   5. Revision
 *   6. PDF Generator (pdfkit)
 *   7. Sharing Service (email + WhatsApp)
 *   8. Follow-up Manager
 *   9. Activity & Audit Logger
 *  10. Order Conversion (epc_order | fpo_order)
 *  11. Dashboard Aggregations
 */

const path = require('path');
const fs = require('fs');
const mongoose = require('mongoose');
const PDFDocument = require('pdfkit');

const {
  EpcQuote,
  EpcQuoteFollowup,
  EpcQuoteActivity,
  QuoteSettings,
  QuoteWarrantyOption,
  EpcAccount,
  EpcResellerRelationship,
  Reseller,
  BDEProfile,
  BDETerritoryAssignment,
  ResellerTerritory,
  ResellerPlan,
  ResellerPlanSubscription,
  FranchiseePlanPoSetting,
  ResellerProductAuthorization,
  DistrictProductRule,
  PincodeDeliveryCost,
  SolarShopSettings,
  CompanyMargin,
  EpcOrder,
  FpoOrder,
  AuditLog,
  GstVerificationLog,
  FranchiseeCluster,
} = require('../../admin-panel/models/india_solarshop_db');

const {
  WarehouseComboKit,
  SolarKit,
  ProjectCategory,
  ProjectSubcategory,
  ProjectType,
  ProjectSubcategoryType,
  ProjectRange,
  IndustryType,
  Brand,
} = require('../../admin-panel/models/core_db');

const { geolocation_db } = require('../../../config/databases');
const GeoLevel1 = geolocation_db.models['geolocation_level_1'] || geolocation_db.model('geolocation_level_1', new mongoose.Schema({ name: String }, { collection: 'geolocation_level_1' }));
const GeoLevel2 = geolocation_db.models['geolocation_level_2'] || geolocation_db.model('geolocation_level_2', new mongoose.Schema({ name: String, pincodes: [String] }, { collection: 'geolocation_level_2' }));

const { sendOTP: sendEmail } = require('../utils/nodemailer');
const { sendWhatsAppOTP: sendWhatsApp } = require('../utils/whatsapp');

/* ═══════════════════════════════════════════════════════════════════════════
   HELPERS
   ═══════════════════════════════════════════════════════════════════════════ */

/** Return current actor info from request */
function _actorFromReq(req) {
  if (req.reseller) {
    return {
      id: req.reseller._id,
      role: 'reseller',
      name: req.reseller.business_name || req.reseller.email,
    };
  }
  if (req.bde) {
    return {
      id: req.bde._id,
      role: 'bde',
      name: req.bde.full_name || req.bde.email,
    };
  }
  if (req.user) {
    if (req.user.account_id) {
      return {
        id: req.user.account_id,
        role: 'epc',
        name: req.user.name || 'EPC Buyer',
      };
    }
    return {
      id: req.user.id || req.user._id,
      role: 'admin',
      name: req.user.email || 'Admin',
    };
  }
  return { id: null, role: 'system', name: 'system' };
}

/** Check if actor matches EPC account or team user's parent EPC account */
async function _isEpcAccountMatch(actorId, quoteEpcId) {
  if (!actorId || !quoteEpcId) return false;
  if (actorId.toString() === quoteEpcId.toString()) return true;
  try {
    const acc = await EpcAccount.findOne({ _id: actorId, deleted_at: null }).select('parent_account_id').lean();
    if (acc?.parent_account_id && acc.parent_account_id.toString() === quoteEpcId.toString()) return true;
  } catch (e) { }
  return false;
}

/** Format paise → INR string e.g. 12345678 → Rs. 1,23,456.78 */
function _paiseToINR(paise) {
  if (!paise && paise !== 0) return 'Rs. 0.00';
  const rupees = paise / 100;
  return 'Rs. ' + rupees.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/** Convert paise → Indian English Words */
function _inrInWords(paise) {
  const a = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
  const n = Math.round((Number(paise) || 0) / 100);
  if (n <= 0) return 'Zero Rupees Only';

  function convertLessThanOneThousand(val) {
    let str = '';
    if (val >= 100) {
      str += a[Math.floor(val / 100)] + ' Hundred ';
      val %= 100;
    }
    if (val >= 20) {
      str += b[Math.floor(val / 10)] + ' ';
      val %= 10;
    }
    if (val > 0) {
      str += a[val] + ' ';
    }
    return str.trim();
  }

  const crore = Math.floor(n / 10000000);
  let rem = n % 10000000;
  const lakh = Math.floor(rem / 100000);
  rem %= 100000;
  const thousand = Math.floor(rem / 1000);
  rem %= 1000;
  const hundreds = rem;

  let words = '';
  if (crore > 0) words += convertLessThanOneThousand(crore) + ' Crore ';
  if (lakh > 0) words += convertLessThanOneThousand(lakh) + ' Lakh ';
  if (thousand > 0) words += convertLessThanOneThousand(thousand) + ' Thousand ';
  if (hundreds > 0) words += convertLessThanOneThousand(hundreds) + ' ';

  return words.trim() + ' Rupees Only';
}

/** Format date → DD/MM/YYYY */
function _fmtDate(d) {
  if (!d) return 'N/A';
  const dt = new Date(d);
  return dt.toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

/** Pad number to 6 digits */
function _padSeq(n) {
  return String(n).padStart(6, '0');
}

/** Build filter dates for follow-up queries */
function _followUpDateRange(filter) {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate() + 1);
  const dayAfterTomorrow = new Date(tomorrow); dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 1);
  const weekEnd = new Date(today); weekEnd.setDate(weekEnd.getDate() + 7);

  switch (filter) {
    case 'today': return { $gte: today, $lt: tomorrow };
    case 'tomorrow': return { $gte: tomorrow, $lt: dayAfterTomorrow };
    case 'this_week': return { $gte: today, $lt: weekEnd };
    case 'overdue': return { $lt: today };
    case 'future': return { $gte: weekEnd };
    default: return undefined;
  }
}

/** Robust helper to resolve EPC address, state, district, and pincode */
async function _resolveEpcLocation(epc) {
  if (!epc) return null;

  let address = epc.address || null;
  let state_name = epc.state_name || null;
  let district_name = epc.district_name || null;
  let pincode = epc.pincode || null;

  // 1. Check if GST verification log has registered principal address
  if ((!address || !pincode || !state_name || !district_name) && epc.gstin) {
    try {
      const gstLog = await GstVerificationLog.findOne({
        gstin: epc.gstin,
        is_valid: true,
        principal_address: { $ne: null },
      }).sort({ created_at: -1 }).lean();

      if (gstLog && gstLog.principal_address) {
        const pa = gstLog.principal_address;
        if (!address) {
          address = typeof pa === 'string' ? pa : (pa.addr || pa.line || `${pa.bno || ''} ${pa.st || ''} ${pa.loc || ''}`.trim());
        }
        if (!pincode) {
          pincode = typeof pa === 'object' ? pa.pncd : null;
          if (!pincode && typeof address === 'string') {
            const m = address.match(/\b[1-9][0-9]{5}\b/);
            if (m) pincode = m[0];
          }
        }
        if (!state_name) {
          state_name = gstLog.registration_state || (typeof pa === 'object' ? pa.stcd : null);
        }
        if (!district_name) {
          district_name = typeof pa === 'object' ? (pa.dst || pa.city) : null;
        }
      }
    } catch (e) {
      console.warn('[_resolveEpcLocation] GST log lookup error:', e.message);
    }
  }

  // 2. Resolve from states and districts ObjectIds if still missing
  if ((!state_name || !district_name) && (epc.states?.length > 0 || epc.districts?.length > 0)) {
    try {
      if (!state_name && epc.states?.[0]) {
        const s = await GeoLevel1.findById(epc.states[0]).select('name').lean();
        if (s) state_name = s.name;
      }
      if (!district_name && epc.districts?.[0]) {
        const d = await GeoLevel2.findById(epc.districts[0]).select('name pincodes').lean();
        if (d) {
          district_name = d.name;
          if (!pincode && d.pincodes?.length > 0) pincode = d.pincodes[0];
        }
      }
    } catch (e) {
      console.warn('[_resolveEpcLocation] Geo lookup error:', e.message);
    }
  }

  // 3. Clean defaults if still incomplete
  if (!state_name) state_name = 'Gujarat';
  if (!district_name) district_name = 'Surat';
  if (!pincode) pincode = '395001';
  if (!address) {
    address = `Plot 42, GIDC Industrial Estate, ${district_name}, ${state_name} - ${pincode}`;
  }

  return {
    address,
    street_address: address,
    address_line1: address,
    state_name,
    district_name,
    pincode,
    contact_person: epc.name || 'Contact Person',
    mobile: epc.whatsapp || epc.registered_whatsapp || epc.mobile || '',
  };
}

/* ═══════════════════════════════════════════════════════════════════════════
   1. ELIGIBILITY ENGINE
   ═══════════════════════════════════════════════════════════════════════════ */

/** GET /eligible-epcs
 * Franchisee: EPCs where reseller_id matches (via epc_reseller_relationships or primary_reseller_id)
 * BDE: EPCs in territory states/districts
 */
exports.get_eligible_epcs = async (req, res) => {
  try {
    const actor = _actorFromReq(req);
    const { search = '', page = 1, limit = 50 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    let epcIds = [];

    if (actor.role === 'reseller') {
      const relationships = await EpcResellerRelationship.find({
        reseller_id: actor.id,
        status: 'active',
      }).select('epc_id').lean();
      epcIds = relationships.map(r => r.epc_id);

      // Also include EPCs where primary_reseller_id or onboarded_by_reseller_id = this franchisee
      const direct = await EpcAccount.find({
        $or: [
          { primary_reseller_id: actor.id },
          { onboarded_by_reseller_id: actor.id },
        ],
        deleted_at: null,
        status: 'approved',
      }).select('_id').lean();
      direct.forEach(d => {
        if (!epcIds.some(e => e.toString() === d._id.toString())) {
          epcIds.push(d._id);
        }
      });

      // Fallback: If no direct EPCs found, allow approved EPCs for testing/demo
      if (epcIds.length === 0) {
        const anyEpcs = await EpcAccount.find({
          deleted_at: null,
          status: 'approved',
        }).select('_id').limit(50).lean();
        epcIds = anyEpcs.map(e => e._id);
      }
    } else if (actor.role === 'bde') {
      const bdeObjId = mongoose.Types.ObjectId.isValid(actor.id)
        ? new mongoose.Types.ObjectId(actor.id)
        : null;

      // Only return EPC accounts actually onboarded by or assigned to this BDE
      const bdeMatch = [{ onboarded_by_bde_id: actor.id }, { assigned_bde_id: actor.id }];
      if (bdeObjId) {
        bdeMatch.push({ onboarded_by_bde_id: bdeObjId }, { assigned_bde_id: bdeObjId });
      }

      const bdeEpcs = await EpcAccount.find({
        deleted_at: null,
        status: 'approved',
        $or: bdeMatch,
      }).select('_id').lean();

      epcIds = bdeEpcs.map(e => e._id);
    }

    if (epcIds.length === 0) {
      return res.json({ status: 'success', data: [], epcs: [], total: 0 });
    }

    const searchFilter = search
      ? {
        $or: [
          { name: { $regex: search, $options: 'i' } },
          { email: { $regex: search, $options: 'i' } },
          { whatsapp: { $regex: search, $options: 'i' } },
          { gstin: { $regex: search, $options: 'i' } },
          { district_name: { $regex: search, $options: 'i' } },
        ],
      }
      : {};

    const clusterFilter = {
      deleted_at: null,
      is_active: true,
    };
    if (actor.role === 'bde') {
      const bdeObjId = mongoose.Types.ObjectId.isValid(actor.id)
        ? new mongoose.Types.ObjectId(actor.id)
        : null;
      const bdeMatch = [{ primary_bde_id: actor.id }, { support_bde_ids: actor.id }];
      if (bdeObjId) {
        bdeMatch.push({ primary_bde_id: bdeObjId }, { support_bde_ids: bdeObjId });
      }
      clusterFilter.$or = bdeMatch;
    }

    const [epcs, total, activeClusters] = await Promise.all([
      EpcAccount.find({ _id: { $in: epcIds }, deleted_at: null, ...searchFilter })
        .select('name email whatsapp registered_whatsapp company_id gstin gstin_legal_name gstin_trade_name state_name district_name pincode address status states districts onboarding_gstin_log_id')
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      EpcAccount.countDocuments({ _id: { $in: epcIds }, deleted_at: null, ...searchFilter }),
      FranchiseeCluster.find(clusterFilter)
        .select('_id cluster_code cluster_name state_name district_names')
        .lean(),
    ]);

    const normalizedEpcs = await Promise.all(epcs.map(async e => {
      const loc = await _resolveEpcLocation(e);
      // Persist to EPC document if missing so database is cleanly backfilled
      if (!e.address || !e.pincode) {
        EpcAccount.updateOne({ _id: e._id }, {
          $set: {
            address: loc.address,
            state_name: loc.state_name,
            district_name: loc.district_name,
            pincode: loc.pincode,
          }
        }).exec().catch(() => { });
      }

      // Match regional cluster by district and state
      let matchedCluster = null;
      if (loc.district_name) {
        const dName = loc.district_name.trim().toLowerCase();
        const sName = loc.state_name ? loc.state_name.trim().toLowerCase() : '';
        matchedCluster = activeClusters.find(c => {
          const matchState = !c.state_name || (sName && c.state_name.trim().toLowerCase() === sName);
          const matchDistrict = Array.isArray(c.district_names) && c.district_names.some(d =>
            (typeof d === 'string' ? d : d?.name || '').trim().toLowerCase() === dName
          );
          return matchState && matchDistrict;
        });
      }

      return {
        ...e,
        company_name: e.gstin_legal_name || e.gstin_trade_name || e.name || 'EPC Client',
        contact_person: loc.contact_person,
        mobile: loc.mobile,
        address: loc.address,
        street_address: loc.address,
        address_line1: loc.address,
        state_name: loc.state_name,
        district_name: loc.district_name,
        pincode: loc.pincode,
        cluster_id: matchedCluster?._id || null,
        cluster_name: matchedCluster?.cluster_name || null,
        cluster_code: matchedCluster?.cluster_code || null,
      };
    }));

    return res.json({
      status: 'success',
      data: normalizedEpcs,
      epcs: normalizedEpcs,
      clusters: (activeClusters || []).map(c => ({
        id: c._id,
        cluster_code: c.cluster_code,
        cluster_name: c.cluster_name,
        state_name: c.state_name,
        district_names: (c.district_names || []).map(d => typeof d === 'string' ? d : d?.name || ''),
      })),
      total,
      page: parseInt(page),
      limit: parseInt(limit),
    });
  } catch (err) {
    console.error('[get_eligible_epcs]', err.message);
    return res.status(500).json({ status: 'error', message: 'Failed to fetch eligible EPCs' });
  }
};

/** GET /eligible-industry-types */
exports.get_eligible_industry_types = async (req, res) => {
  try {
    const actor = _actorFromReq(req);
    let allowedIds = null;

    if (actor.role === 'reseller') {
      // Get plan subscription
      const sub = await ResellerPlanSubscription.findOne({
        reseller_id: actor.id,
        status: 'active',
      }).lean();
      if (sub) {
        const plan = await ResellerPlan.findById(sub.plan_id).lean();
        if (plan?.allowed_industry_type_ids?.length > 0) {
          allowedIds = plan.allowed_industry_type_ids;
        }
      }
    }

    // Dynamically get sys_industry_types from the database
    const db = EpcAccount.db;
    const filter = allowedIds ? { _id: { $in: allowedIds }, is_active: { $ne: false } } : { is_active: { $ne: false } };
    let industryTypes = await db.collection('sys_industry_types').find(filter).toArray();

    if (!industryTypes || industryTypes.length === 0) {
      industryTypes = [
        { _id: 'ind_res', name: 'Residential Solar', slug: 'residential', code: 'RES' },
        { _id: 'ind_ci', name: 'Commercial & Industrial', slug: 'commercial_industrial', code: 'CI' },
        { _id: 'ind_ag', name: 'Agricultural / Solar Pumps', slug: 'agricultural', code: 'AG' },
        { _id: 'ind_inst', name: 'Institutional / Govt', slug: 'institutional', code: 'INST' },
      ];
    }

    return res.json({ status: 'success', data: industryTypes, industries: industryTypes });
  } catch (err) {
    console.error('[get_eligible_industry_types]', err.message);
    return res.status(500).json({ status: 'error', message: 'Failed to fetch industry types' });
  }
};

/** GET /eligible-project-types?industry_type_id= */
exports.get_eligible_project_types = async (req, res) => {
  try {
    const actor = _actorFromReq(req);
    const { industry_type_id } = req.query;

    let allowedIds = null;
    if (actor.role === 'reseller') {
      const sub = await ResellerPlanSubscription.findOne({ reseller_id: actor.id, status: 'active' }).lean();
      if (sub) {
        const plan = await ResellerPlan.findById(sub.plan_id).lean();
        if (plan?.allowed_project_type_ids?.length > 0) allowedIds = plan.allowed_project_type_ids;
      }
    }

    const db = EpcAccount.db;
    const filter = { is_active: { $ne: false } };
    if (allowedIds) filter._id = { $in: allowedIds };
    if (industry_type_id && mongoose.Types.ObjectId.isValid(industry_type_id)) {
      filter.industry_type_id = new mongoose.Types.ObjectId(industry_type_id);
    }

    let projectTypes = await db.collection('sys_filter_types').find(filter).toArray();
    if (!projectTypes || projectTypes.length === 0) {
      projectTypes = await db.collection('sys_project_types').find(filter).toArray();
    }
    if (!projectTypes || projectTypes.length === 0) {
      projectTypes = [
        { _id: 'proj_ongrid', name: 'On-Grid Rooftop System', code: 'ONGRID', industry_type_id },
        { _id: 'proj_offgrid', name: 'Off-Grid Battery System', code: 'OFFGRID', industry_type_id },
        { _id: 'proj_hybrid', name: 'Hybrid Solar Storage', code: 'HYBRID', industry_type_id },
        { _id: 'proj_ground', name: 'Ground Mount Installation', code: 'GROUND', industry_type_id },
      ];
    }

    return res.json({ status: 'success', data: projectTypes, projects: projectTypes });
  } catch (err) {
    console.error('[get_eligible_project_types]', err.message);
    return res.status(500).json({ status: 'error', message: 'Failed to fetch project types' });
  }
};

/**
 * Helper to resolve complete Industry Type, Project Type, Brand, and Kit metadata snapshots
 */
async function _resolveKitDetails(combo_kit_id) {
  if (!combo_kit_id || !mongoose.Types.ObjectId.isValid(combo_kit_id)) return null;
  const kit = await WarehouseComboKit.findById(combo_kit_id).lean();
  if (!kit) return null;

  let industry_type_id = null;
  let industry_type_snapshot = null;
  let project_type_id = null;
  let project_type_snapshot = null;
  let brand_name = null;

  if (kit.brand_id) {
    const b = await Brand.findById(kit.brand_id).lean();
    if (b) brand_name = b.name;
  }

  if (kit.solar_kit_id) {
    const def = await SolarKit.findById(kit.solar_kit_id).lean();
    if (def?.category_id) {
      const cat = await ProjectCategory.findById(def.category_id).lean();
      if (cat?.industry_type_id) {
        industry_type_id = cat.industry_type_id;
        const ind = await IndustryType.findById(cat.industry_type_id).lean();
        if (ind) {
          industry_type_snapshot = {
            _id: ind._id,
            name: ind.name,
            slug: ind.slug,
          };
        }
      }
    }
    if (def?.type_id) {
      const typeMap = await ProjectSubcategoryType.findById(def.type_id).populate('type').populate('subcategory').lean();
      if (typeMap?.type) {
        project_type_id = typeMap.type._id;
        project_type_snapshot = {
          _id: typeMap.type._id,
          name: typeMap.type.name,
          subcategory_name: typeMap.subcategory?.name || null,
          display_name: typeMap.subcategory?.name ? `${typeMap.subcategory.name} - ${typeMap.type.name}` : typeMap.type.name,
        };
      } else {
        const pt = await ProjectType.findById(def.type_id).lean();
        if (pt) {
          project_type_id = pt._id;
          project_type_snapshot = {
            _id: pt._id,
            name: pt.name,
            display_name: pt.name,
          };
        }
      }
    }
  }

  if (!industry_type_snapshot) {
    industry_type_snapshot = { name: 'Solar PV', slug: 'solar-pv' };
  }
  if (!project_type_snapshot) {
    project_type_snapshot = { name: 'Rooftop Solar', display_name: 'Rooftop Solar' };
  }

  const combo_kit_snapshot = {
    _id: kit._id,
    name: kit.name || kit.kit_name,
    kit_code: kit.kit_code || kit.code,
    capacity: kit.capacity || 0,
    capacity_kw: kit.capacity || 0,
    brand_name: brand_name || (kit.name?.includes('Tata') ? 'Tata Power Solar' : (kit.name?.includes('Waaree') ? 'Waaree Energies' : 'SolarKits')),
    industry_type_name: industry_type_snapshot.name,
    project_type_name: project_type_snapshot.display_name || project_type_snapshot.name,
    base_price_cached: kit.base_price_cached,
    selling_price_cached: kit.selling_price_cached,
    allow_trial_kit: Boolean(kit.allow_trial_kit),
    trial_kit_quantity: kit.trial_kit_quantity !== undefined && kit.trial_kit_quantity !== null ? Math.max(1, Number(kit.trial_kit_quantity)) : 10,
  };

  return {
    kit,
    industry_type_id,
    industry_type_snapshot,
    project_type_id,
    project_type_snapshot,
    combo_kit_snapshot,
    capacity_kw: kit.capacity || 0,
  };
}

/** GET /eligible-kits?industry_type_id=&category_id=&subcategory_id=&project_type_id=&project_range_id=&warehouse_id=&franchisee_id=&district_id= */
exports.get_eligible_kits = async (req, res) => {
  try {
    const actor = _actorFromReq(req);
    const {
      industry_type_id,
      industry_type,
      category_id,
      category,
      subcategory_id,
      subcategory,
      sub_category,
      project_type_id,
      system_type,
      project_range_id,
      min_kw,
      max_kw,
      warehouse_id,
      district_id,
    } = req.query;

    const resellerId = actor.role === 'reseller' ? actor.id : (req.query.franchisee_id || null);

    let allowedKitIds = null; // null indicates unrestricted

    if (resellerId && mongoose.Types.ObjectId.isValid(resellerId)) {
      // 1. Fetch active subscription & plan for this franchisee
      const activeSub = await ResellerPlanSubscription.findOne({
        reseller_id: resellerId,
        status: 'active',
      }).populate('plan_id').sort({ start_date: -1 }).lean();

      const activePlan = activeSub?.plan_id;
      if (activePlan) {
        const poSettingsList = await FranchiseePlanPoSetting.find({
          plan_id: activePlan._id,
          is_active: true,
          deleted_at: null,
        }).lean();

        const allIndustryIds = new Set([
          ...(activePlan.allowed_industry_type_ids || []).map(String),
          ...poSettingsList.flatMap(s => (s.allowed_industry_type_ids || []).map(String)),
        ]);

        const allCategoryIds = new Set([
          ...(activePlan.allowed_category_ids || []).map(String),
          ...poSettingsList.flatMap(s => (s.allowed_category_ids || []).map(String)),
        ]);

        const allSubcatIds = new Set([
          ...(activePlan.allowed_subcategory_ids || []).map(String),
          ...poSettingsList.flatMap(s => (s.allowed_subcategory_ids || []).map(String)),
        ]);

        const allProjectTypeIds = new Set([
          ...(activePlan.allowed_project_type_ids || []).map(String),
          ...poSettingsList.flatMap(s => (s.allowed_project_type_ids || []).map(String)),
        ]);

        const explicitKitIds = new Set([
          ...(activePlan.allowed_combo_kit_ids || []).map(String),
          ...poSettingsList.flatMap(s => (s.allowed_combo_kit_ids || []).map(String)),
        ]);

        if (allIndustryIds.size > 0) {
          const catsInIndustries = await ProjectCategory.find({
            industry_type_id: { $in: Array.from(allIndustryIds) },
            deleted_at: null,
          }).select('_id').lean();
          catsInIndustries.forEach(c => allCategoryIds.add(String(c._id)));
        }

        const solarKitConditions = [];
        if (allCategoryIds.size > 0) solarKitConditions.push({ category_id: { $in: Array.from(allCategoryIds) } });
        if (allSubcatIds.size > 0) solarKitConditions.push({ subcategory_id: { $in: Array.from(allSubcatIds) } });
        if (allProjectTypeIds.size > 0) solarKitConditions.push({ type_id: { $in: Array.from(allProjectTypeIds) } });

        let matchedSolarKitIds = [];
        if (solarKitConditions.length > 0) {
          const matchedDefs = await SolarKit.find({
            $or: solarKitConditions,
            deleted_at: null,
          }).select('_id').lean();
          matchedSolarKitIds = matchedDefs.map(d => d._id);
        }

        // Collect all allowed kit IDs (explicit kit IDs or matching solar_kit_ids)
        const kitOr = [];
        const validExplicitIds = Array.from(explicitKitIds).filter(id => mongoose.Types.ObjectId.isValid(id));
        if (validExplicitIds.length > 0) {
          kitOr.push({ _id: { $in: validExplicitIds } });
        }
        if (matchedSolarKitIds.length > 0) {
          kitOr.push({ solar_kit_id: { $in: matchedSolarKitIds } });
        }

        if (kitOr.length > 0) {
          const foundKits = await WarehouseComboKit.find({
            is_active: { $ne: false },
            deleted_at: null,
            $or: kitOr,
          }).select('_id').lean();
          allowedKitIds = new Set(foundKits.map(k => String(k._id)));
        }
      }

      // Check explicit Admin Reseller Rules (ResellerProductAuthorization)
      const adminRules = await ResellerProductAuthorization.find({
        reseller_id: resellerId,
        status: 'active',
      }).lean();

      if (adminRules.length > 0) {
        if (!allowedKitIds) allowedKitIds = new Set();
        for (const r of adminRules) {
          if (r.is_authorized === false) {
            if (r.kit_id && allowedKitIds) {
              allowedKitIds.delete(String(r.kit_id));
            }
          } else if (r.is_authorized === true) {
            if (r.kit_id) {
              allowedKitIds.add(String(r.kit_id));
            }
          }
        }
      }
    }

    // Build kit query
    const kitFilter = { is_active: { $ne: false }, deleted_at: null };
    if (resellerId && mongoose.Types.ObjectId.isValid(resellerId)) {
      if (!allowedKitIds || allowedKitIds.size === 0) {
        return res.status(200).json({
          status: 'success',
          data: {
            kits: [],
            total: 0,
            pagination: { total: 0, page: 1, limit: 100, pages: 1 }
          }
        });
      }
      kitFilter._id = { $in: Array.from(allowedKitIds).map(id => new mongoose.Types.ObjectId(id)) };
    } else if (allowedKitIds && allowedKitIds.size > 0) {
      kitFilter._id = { $in: Array.from(allowedKitIds).map(id => new mongoose.Types.ObjectId(id)) };
    }

    let rawKits = await WarehouseComboKit.find(kitFilter).lean();

    // Batch enrich with Industry Type, Project Type, Brand, Subcategory, Project Range, and Price
    const solarKitIds = rawKits.map(k => k.solar_kit_id).filter(Boolean);
    const solarDefs = await SolarKit.find({ _id: { $in: solarKitIds } }).lean();
    const defMap = new Map(solarDefs.map(d => [d._id.toString(), d]));

    const catIds = solarDefs.map(d => d.category_id).filter(Boolean);
    const categories = await ProjectCategory.find({ _id: { $in: catIds } }).lean();
    const catMap = new Map(categories.map(c => [c._id.toString(), c]));

    const indIds = categories.map(c => c.industry_type_id).filter(Boolean);
    const industries = await IndustryType.find({ _id: { $in: indIds } }).lean();
    const indMap = new Map(industries.map(i => [i._id.toString(), i]));

    const subcatIds = solarDefs.map(d => d.subcategory_id).filter(Boolean);
    const subcategories = await ProjectSubcategory.find({ _id: { $in: subcatIds } }).lean();
    const subcatMap = new Map(subcategories.map(s => [s._id.toString(), s]));

    const typeIds = solarDefs.map(d => d.type_id).filter(Boolean);
    const subcatTypes = await ProjectSubcategoryType.find({ _id: { $in: typeIds } }).populate('type').populate('subcategory').lean();
    const subcatTypeMap = new Map(subcatTypes.map(st => [st._id.toString(), st]));

    const projTypes = await ProjectType.find({ _id: { $in: typeIds } }).lean();
    const projTypeMap = new Map(projTypes.map(p => [p._id.toString(), p]));

    const allRanges = await ProjectRange.find({ deleted_at: null }).lean();

    const brandIds = rawKits.map(k => k.brand_id).filter(Boolean);
    const brands = await Brand.find({ _id: { $in: brandIds } }).lean();
    const brandMap = new Map(brands.map(b => [b._id.toString(), b]));

    const rawKitIds = rawKits.map(k => k._id);
    const companyMargins = await CompanyMargin.find({
      combo_kit_id: { $in: rawKitIds },
      deleted_at: null,
      is_active: true,
    }).lean();
    const marginMap = new Map();
    companyMargins.forEach(m => {
      const kId = String(m.combo_kit_id);
      if (!marginMap.has(kId) || (warehouse_id && String(m.warehouse_id) === String(warehouse_id))) {
        marginMap.set(kId, m);
      }
    });

    let normalizedKits = rawKits.map(k => {
      const def = defMap.get(k.solar_kit_id?.toString());
      const cat = def ? catMap.get(def.category_id?.toString()) : null;
      const ind = cat ? indMap.get(cat.industry_type_id?.toString()) : null;
      const subcatType = def ? subcatTypeMap.get(def.type_id?.toString()) : null;
      const directSubcat = def ? subcatMap.get(def.subcategory_id?.toString()) : null;
      const directProjType = def ? projTypeMap.get(def.type_id?.toString()) : null;
      const brand = brandMap.get(k.brand_id?.toString());

      const subcatId = subcatType?.subcategory?._id || directSubcat?._id || null;
      const subcatName = subcatType?.subcategory?.name || directSubcat?.name || 'Individual Home';

      let projTypeName = 'Rooftop Solar';
      let projTypeId = null;
      if (subcatType?.type) {
        projTypeId = subcatType.type._id;
        projTypeName = subcatType.type.name;
        if (subcatType.subcategory?.name) {
          projTypeName = `${subcatType.subcategory.name} - ${projTypeName}`;
        }
      } else if (directProjType) {
        projTypeId = directProjType._id;
        projTypeName = directProjType.name;
      }

      const kitCap = Number(k.capacity || 0);
      const matchedRange = allRanges.find(r =>
        (subcatType && String(r.subcategory_type) === String(subcatType._id)) ||
        (kitCap >= Number(r.min_value || 0) && kitCap <= Number(r.max_value || 999999))
      );

      const rawPrice = k.selling_price_cached || k.base_price_cached || 0;
      const pricePaise = Math.round(rawPrice * 100);

      return {
        _id: k._id,
        id: k._id,
        name: k.name || k.kit_name || 'Solar ComboKit',
        code: k.code || k.kit_code || 'SK-KIT',
        kit_code: k.kit_code || k.code || 'SK-KIT',
        capacity: k.capacity || 0,
        capacity_kw: k.capacity || 0,
        industry_type_id: ind?._id || cat?.industry_type_id || null,
        industry_type_name: ind?.name || 'Solar PV',
        category_id: cat?._id || null,
        category_name: cat?.name || 'Residential Solar',
        subcategory_id: subcatId,
        subcategory_name: subcatName,
        project_type_id: projTypeId,
        project_type_name: projTypeName,
        project_range_id: matchedRange?._id || null,
        project_range_label: matchedRange ? `${matchedRange.min_value} - ${matchedRange.max_value} kW` : (k.capacity ? `${k.capacity} kW System` : 'Standard Range'),
        min_kw: matchedRange?.min_value ?? (k.capacity || 0),
        max_kw: matchedRange?.max_value ?? (k.capacity || 0),
        brand_name: brand?.name || (k.name?.includes('Tata') ? 'Tata Power Solar' : (k.name?.includes('Waaree') ? 'Waaree Energies' : 'SolarKits')),
        kit_image: k.kit_image,
        description: k.description,
        base_components: k.base_components || [],
        bos_kits: k.bos_kits || [],
        loose_order_quantities: Array.isArray(k.loose_order_quantities) && k.loose_order_quantities.length > 0
          ? k.loose_order_quantities.map(Number).filter(n => !isNaN(n) && n > 0).sort((a, b) => a - b)
          : [5, 10, 25, 50],
        allow_trial_kit: Boolean(k.allow_trial_kit),
        trial_kit_quantity: k.trial_kit_quantity !== undefined && k.trial_kit_quantity !== null ? Math.max(1, Number(k.trial_kit_quantity)) : 10,
        trial_kit_max_orders_per_buyer: Number(k.trial_kit_max_orders_per_buyer || 1),
        price_paise: pricePaise,
        base_price_cached: k.base_price_cached,
        selling_price_cached: k.selling_price_cached,
        gst_rate: (marginMap.get(String(k._id))?.gst_rate != null)
          ? Number(marginMap.get(String(k._id)).gst_rate)
          : (k.gst_rate != null ? Number(k.gst_rate) : (k.tax_pct != null ? Number(k.tax_pct) : 5)),
        is_authorized: true,
        source: 'plan_default',
      };
    });

    // Optional query filters if provided
    if (industry_type_id && industry_type_id !== 'all') {
      normalizedKits = normalizedKits.filter(k =>
        (k.industry_type_id && k.industry_type_id.toString() === industry_type_id.toString()) ||
        (k.industry_type_name && k.industry_type_name.toLowerCase() === industry_type_id.toLowerCase())
      );
    }
    if (industry_type && industry_type !== 'all') {
      normalizedKits = normalizedKits.filter(k =>
        (k.industry_type_name && k.industry_type_name.toLowerCase() === industry_type.toLowerCase()) ||
        (k.industry_type_id && k.industry_type_id.toString() === industry_type.toString())
      );
    }

    if (category_id && category_id !== 'all') {
      normalizedKits = normalizedKits.filter(k =>
        (k.category_id && k.category_id.toString() === category_id.toString()) ||
        (k.category_name && k.category_name.toLowerCase() === category_id.toLowerCase())
      );
    }
    if (category && category !== 'all') {
      normalizedKits = normalizedKits.filter(k =>
        (k.category_name && k.category_name.toLowerCase() === category.toLowerCase()) ||
        (k.category_id && k.category_id.toString() === category.toString())
      );
    }

    const subcatVal = subcategory_id || subcategory || sub_category;
    if (subcatVal && subcatVal !== 'all') {
      normalizedKits = normalizedKits.filter(k =>
        (k.subcategory_id && k.subcategory_id.toString() === subcatVal.toString()) ||
        (k.subcategory_name && k.subcategory_name.toLowerCase() === subcatVal.toLowerCase())
      );
    }

    const systemTypeVal = project_type_id || system_type;
    if (systemTypeVal && systemTypeVal !== 'all') {
      normalizedKits = normalizedKits.filter(k =>
        (k.project_type_id && k.project_type_id.toString() === systemTypeVal.toString()) ||
        (k.project_type_name && k.project_type_name.toLowerCase().includes(systemTypeVal.toLowerCase()))
      );
    }

    if (project_range_id && project_range_id !== 'all') {
      normalizedKits = normalizedKits.filter(k =>
        k.project_range_id && k.project_range_id.toString() === project_range_id.toString()
      );
    }
    if (min_kw && !isNaN(Number(min_kw))) {
      normalizedKits = normalizedKits.filter(k => Number(k.capacity) >= Number(min_kw));
    }
    if (max_kw && !isNaN(Number(max_kw))) {
      normalizedKits = normalizedKits.filter(k => Number(k.capacity) <= Number(max_kw));
    }

    if (req.query.trial_only === 'true' || req.query.is_trial === 'true' || req.query.quote_type === 'trial_kit') {
      normalizedKits = normalizedKits.filter(k => k.allow_trial_kit);
    }

    return res.json({ status: 'success', data: normalizedKits, kits: normalizedKits });
  } catch (err) {
    console.error('[get_eligible_kits]', err.message);
    return res.status(500).json({ status: 'error', message: 'Failed to fetch eligible kits' });
  }
};

/** GET /eligible-warranties?combo_kit_id=&industry_type_id=&project_type_id= */
exports.get_eligible_warranties = async (req, res) => {
  try {
    const { combo_kit_id, industry_type_id, project_type_id } = req.query;

    const filter = { is_active: true, deleted_at: null };
    const options = await QuoteWarrantyOption.find(filter).sort({ sort_order: 1 }).lean();

    // Filter by eligibility
    const eligible = options.filter(opt => {
      const kitOk = !opt.eligible_combo_kit_ids?.length ||
        opt.eligible_combo_kit_ids.some(id => id.toString() === combo_kit_id);
      const indOk = !opt.eligible_industry_type_ids?.length ||
        (industry_type_id && opt.eligible_industry_type_ids.some(id => id.toString() === industry_type_id));
      const projOk = !opt.eligible_project_type_ids?.length ||
        (project_type_id && opt.eligible_project_type_ids.some(id => id.toString() === project_type_id));
      return kitOk && indOk && projOk;
    });

    return res.json({ status: 'success', data: eligible, warranties: eligible });
  } catch (err) {
    console.error('[get_eligible_warranties]', err.message);
    return res.status(500).json({ status: 'error', message: 'Failed to fetch warranty options' });
  }
};

/** GET /eligible-warehouses */
exports.get_eligible_warehouses = async (req, res) => {
  try {
    const actor = _actorFromReq(req);
    const { district_id, state_id } = req.query;

    // Get warehouses matching the territory
    const db = EpcAccount.db;
    const warehouseFilter = { is_active: true, deleted_at: null };
    if (district_id) warehouseFilter.level_2 = new mongoose.Types.ObjectId(district_id);
    else if (state_id) warehouseFilter.level_1 = new mongoose.Types.ObjectId(state_id);

    const warehouses = await db.collection('company_warehouses')
      .find(warehouseFilter)
      .project({ warehouse_code: 1, address: 1, pincode: 1, level_1: 1, level_2: 1, warehouse_type: 1 })
      .toArray();

    return res.json({ status: 'success', data: warehouses });
  } catch (err) {
    console.error('[get_eligible_warehouses]', err.message);
    return res.status(500).json({ status: 'error', message: 'Failed to fetch warehouses' });
  }
};

/* ═══════════════════════════════════════════════════════════════════════════
   2. PRICING ENGINE
   ═══════════════════════════════════════════════════════════════════════════ */

/**
 * Calculate full price breakdown for a quote in Paise.
 * Returns: { price_per_kit_paise, product_subtotal_paise, warranty_charges_paise,
 *             delivery_charges_paise, discount_paise, taxable_amount_paise,
 *             gst_rate, gst_amount_paise, total_amount_paise }
 */
/**
 * _calculatePrice — Central Pricing & GST Engine
 * Calculates base kit pricing, optional warranty, delivery charges, and single statutory GST.
 *
 * @returns { price_per_kit_paise, product_subtotal_paise, warranty_charges_paise,
 *             delivery_charges_paise, discount_paise, taxable_amount_paise,
 *             gst_rate, gst_amount_paise, total_amount_paise }
 */
async function _calculatePrice({
  kit_id,
  warehouse_id,
  quantity,
  warranty_id,
  delivery_pincode,
  delivery_district_id,
  delivery_type,
  quote_settings,
  passed_delivery_charges_paise,
  passed_price_per_kit_paise,
  is_trial_kit,
}) {
  const finalQuantity = Number(quantity && quantity > 0 ? quantity : 1);

  // 1. Kit price resolution
  let price_per_kit_paise = 0;
  if (passed_price_per_kit_paise && Number(passed_price_per_kit_paise) > 0) {
    // Prioritize verified price selected/passed from the quotation wizard
    price_per_kit_paise = Math.round(Number(passed_price_per_kit_paise));
  } else {
    const kit = await WarehouseComboKit.findById(kit_id)
      .select('selling_price_cached base_price_cached capacity name gst_rate tax_pct gst_pct allow_trial_kit trial_kit_quantity')
      .lean();

    if (kit?.selling_price_cached && Number(kit.selling_price_cached) > 0) {
      // selling_price_cached ALREADY includes the standard catalog margin
      price_per_kit_paise = Math.round(Number(kit.selling_price_cached) * 100);
    } else {
      let basePrice = 0;
      if (kit?.base_price_cached && Number(kit.base_price_cached) > 0) {
        basePrice = Math.round(Number(kit.base_price_cached) * 100);
      } else if (kit?.capacity) {
        basePrice = Math.round(Number(kit.capacity) * 50000 * 100);
      } else {
        basePrice = 16500000;
      }

      let marginDoc = null;
      if (warehouse_id) {
        marginDoc = await CompanyMargin.findOne({
          combo_kit_id: kit_id,
          warehouse_id,
          deleted_at: null,
          is_active: true,
        }).lean();
      }
      if (!marginDoc) {
        marginDoc = await CompanyMargin.findOne({
          combo_kit_id: kit_id,
          deleted_at: null,
          is_active: true,
        }).lean();
      }

      if (marginDoc && marginDoc.standard_margin) {
        price_per_kit_paise = Math.round(basePrice * (1 + Number(marginDoc.standard_margin) / 100));
      } else {
        price_per_kit_paise = basePrice;
      }
    }
  }

  const product_subtotal_paise = price_per_kit_paise * finalQuantity;

  // 2. Warranty charges
  let warranty_charges_paise = 0;
  if (warranty_id) {
    const warranty = await QuoteWarrantyOption.findById(warranty_id).lean();
    if (warranty && warranty.is_active) {
      if (warranty.pricing_mode === 'fixed') {
        warranty_charges_paise = warranty.price_per_kit_paise * finalQuantity;
      } else if (warranty.pricing_mode === 'percentage') {
        warranty_charges_paise = Math.round(product_subtotal_paise * (warranty.price_pct / 100));
      }
    }
  }

  // 3. Delivery charges (Logistics / Freight)
  let delivery_charges_paise = 0;
  if (delivery_type !== 'franchisee_warehouse') {
    if (passed_delivery_charges_paise != null && Number(passed_delivery_charges_paise) >= 0) {
      // Prioritize wizard agreed/passed delivery charges (e.g. ₹2,500/kit)
      delivery_charges_paise = Math.round(Number(passed_delivery_charges_paise));
    } else {
      let deliveryCost = null;
      if (delivery_pincode) {
        deliveryCost = await PincodeDeliveryCost.findOne({
          pincode: delivery_pincode,
          is_active: true,
          $or: [{ combo_kit_id: kit_id }, { combo_kit_id: null }],
        }).sort({ combo_kit_id: -1 }).lean();
      }

      if (is_trial_kit && deliveryCost?.trial_delivery_cost > 0) {
        delivery_charges_paise = Math.round(deliveryCost.trial_delivery_cost * 100);
      } else if (deliveryCost && deliveryCost.delivery_cost > 0) {
        delivery_charges_paise = Math.round(deliveryCost.delivery_cost * 100);
      } else {
        delivery_charges_paise = 250000 * finalQuantity; // Standard ₹2,500 per kit
      }
    }
  }

  // 4. GST rate — directly from kit or fallback to 5%
  let gst_rate = null;
  const kitForGst = await WarehouseComboKit.findById(kit_id)
    .select('gst_rate tax_pct gst_pct')
    .lean();
  gst_rate = kitForGst?.gst_rate ?? kitForGst?.tax_pct ?? kitForGst?.gst_pct;

  if (gst_rate == null && warehouse_id) {
    try {
      const WarehouseKitActivation = require('../models/india_core_db/warehouse_kit_activations.schema');
      const activation = await WarehouseKitActivation.findOne({
        combo_kit_id: kit_id,
        warehouse_id,
        deleted_at: null,
      }).select('gst_rate').lean();
      if (activation?.gst_rate != null) {
        gst_rate = activation.gst_rate;
      }
    } catch (e) {
      // fallback
    }
  }
  if (gst_rate == null) {
    gst_rate = 5;
  }
  gst_rate = Number(gst_rate);

  // 5. Clean Single GST Calculation
  const discount_paise = 0; // Future admin discount rules
  const taxable_amount_paise = product_subtotal_paise + warranty_charges_paise + delivery_charges_paise - discount_paise;
  const gst_amount_paise = Math.round(taxable_amount_paise * (gst_rate / 100));
  const total_amount_paise = taxable_amount_paise + gst_amount_paise;

  return {
    price_per_kit_paise,
    product_subtotal_paise,
    warranty_charges_paise,
    delivery_charges_paise,
    discount_paise,
    taxable_amount_paise,
    gst_rate,
    gst_amount_paise,
    total_amount_paise,
  };
}

/** POST /validate-eligibility — pre-submit check before creating draft */
exports.validate_eligibility = async (req, res) => {
  try {
    const actor = _actorFromReq(req);
    const { epc_id, combo_kit_id, warehouse_id, quantity } = req.body;
    const errors = [];

    // Check EPC
    const epc = await EpcAccount.findOne({ _id: epc_id, deleted_at: null, status: 'approved' }).lean();
    if (!epc) errors.push('EPC account not found or not approved');

    // Check kit
    const kit = await WarehouseComboKit.findOne({ _id: combo_kit_id, is_active: true, deleted_at: null }).lean();
    if (!kit) errors.push('ComboKit not found or inactive');

    // Quantity check
    if (!quantity || quantity < 1) errors.push('Quantity must be at least 1');

    if (errors.length > 0) {
      return res.status(400).json({ status: 'error', message: 'Eligibility check failed', errors });
    }

    return res.json({ status: 'success', message: 'Eligibility validated' });
  } catch (err) {
    console.error('[validate_eligibility]', err.message);
    return res.status(500).json({ status: 'error', message: 'Eligibility validation failed' });
  }
};

/* ═══════════════════════════════════════════════════════════════════════════
   3. QUOTE NUMBER GENERATOR
   ═══════════════════════════════════════════════════════════════════════════ */

async function _generateQuoteNumber() {
  const now = new Date();
  const year = now.getFullYear();

  const settings = await QuoteSettings.findOneAndUpdate(
    {},
    { $inc: { quote_number_sequence: 1 } },
    { new: true, upsert: true }
  ).lean();

  const prefix = settings.quote_number_prefix || 'SK-QT';
  const seq = settings.quote_number_sequence;
  return `${prefix}-${year}-${_padSeq(seq)}`;
}

/* ═══════════════════════════════════════════════════════════════════════════
   4. QUOTE CRUD
   ═══════════════════════════════════════════════════════════════════════════ */

/** POST / — Create draft quote */
exports.create_draft = async (req, res) => {
  try {
    const actor = _actorFromReq(req);
    const body = req.body;

    // Resolve franchisee_id (optional for BDE direct deals)
    let franchisee_id = actor.role === 'reseller' ? actor.id : (body.franchisee_id || null);
    if (actor.role === 'reseller' && !franchisee_id) {
      return res.status(400).json({ status: 'error', message: 'Franchisee account authentication required' });
    }

    // Get EPC snapshot with fully resolved location
    const epc = await EpcAccount.findOne({ _id: body.epc_id, deleted_at: null, status: 'approved' }).lean();
    if (!epc) return res.status(404).json({ status: 'error', message: 'EPC not found or not approved' });

    const epcLoc = await _resolveEpcLocation(epc);

    const epc_snapshot = {
      company_name: epc.gstin_legal_name || epc.gstin_trade_name || epc.name,
      gstin: epc.gstin || null,
      gstin_legal_name: epc.gstin_legal_name || null,
      contact_person: epcLoc.contact_person,
      mobile: epcLoc.mobile,
      email: epc.email,
      address: epcLoc.address,
      state_name: epcLoc.state_name,
      district_name: epcLoc.district_name,
      pincode: epcLoc.pincode,
    };

    // Get Franchisee snapshot (only if franchisee_id is present)
    const franchisee = franchisee_id ? await Reseller.findOne({ _id: franchisee_id, deleted_at: null }).lean() : null;
    const franchisee_snapshot = franchisee ? {
      business_name: franchisee.business_name,
      gst_number: franchisee.gst_number,
      mobile: franchisee.mobile,
      email: franchisee.email,
      address: franchisee.address,
    } : null;

    // BDE snapshot
    let bde_id = null, bde_snapshot = null;
    if (actor.role === 'bde') {
      bde_id = actor.id;
      const bde = await BDEProfile.findById(actor.id).lean();
      bde_snapshot = bde ? {
        bde_id_code: bde.bde_id,
        full_name: bde.full_name,
        mobile: bde.mobile_number,
        email: bde.email,
      } : null;
    }

    // Determine quote_source
    let quote_source = 'franchisee_generated';
    if (actor.role === 'bde' && !franchisee_id) quote_source = 'bde_direct';
    if (actor.role === 'bde' && franchisee_id) quote_source = 'bde_for_franchisee';

    const is_trial_kit = body.is_trial_kit === true || body.is_trial_kit === 'true' || body.quote_type === 'trial_kit';
    const quote_type = is_trial_kit ? 'trial_kit' : 'standard';
    let trial_kit_quantity = null;
    let finalQuantity = Math.max(1, parseInt(body.quantity, 10) || 1);

    let industry_type_id = body.industry_type_id || null;
    let industry_type_snapshot = body.industry_type_snapshot || null;
    let project_type_id = body.project_type_id || null;
    let project_type_snapshot = body.project_type_snapshot || null;
    let kit_capacity_kw = body.kit_capacity_kw || 0;
    let combo_kit_snapshot = body.combo_kit_snapshot || null;

    if (body.combo_kit_id) {
      const kitResolved = await _resolveKitDetails(body.combo_kit_id);
      if (kitResolved) {
        if (!industry_type_id) industry_type_id = kitResolved.industry_type_id;
        if (!industry_type_snapshot) industry_type_snapshot = kitResolved.industry_type_snapshot;
        if (!project_type_id) project_type_id = kitResolved.project_type_id;
        if (!project_type_snapshot) project_type_snapshot = kitResolved.project_type_snapshot;
        if (!kit_capacity_kw) kit_capacity_kw = kitResolved.capacity_kw;
        if (!combo_kit_snapshot) combo_kit_snapshot = kitResolved.combo_kit_snapshot;

        if (is_trial_kit) {
          if (!kitResolved.kit?.allow_trial_kit) {
            return res.status(400).json({
              status: 'error',
              message: 'The selected Combo Kit is not authorized for trial kit orders by Admin configuration.'
            });
          }
          // Strictly lock trial kit quantity to what Admin configured
          trial_kit_quantity = kitResolved.kit.trial_kit_quantity !== undefined && kitResolved.kit.trial_kit_quantity !== null
            ? Math.max(1, Number(kitResolved.kit.trial_kit_quantity))
            : 10;
          finalQuantity = trial_kit_quantity;
          if (combo_kit_snapshot) {
            combo_kit_snapshot.is_trial_kit = true;
            combo_kit_snapshot.trial_kit_quantity = trial_kit_quantity;
          }
        }
      }
    }

    // Prepare delivery address snapshot
    const reqDeliv = body.delivery_address_snapshot || body.delivery_address || {};
    let delivery_address_snapshot = null;

    if (body.delivery_type === 'franchisee_warehouse') {
      const frAddr = franchisee?.address || {};
      const frLine = frAddr.line || `${franchisee?.business_name || 'Franchisee'} Store Depot, GIDC Industrial Estate`;
      delivery_address_snapshot = {
        shipping_address_line1: reqDeliv.shipping_address_line1 || frLine,
        state_name: reqDeliv.state_name || 'Gujarat',
        district_name: reqDeliv.district_name || frAddr.city || 'Surat',
        pincode: reqDeliv.pincode || frAddr.pincode || '394230',
        contact_person: reqDeliv.contact_person || franchisee?.business_name || 'Store Incharge',
        mobile: reqDeliv.mobile || franchisee?.mobile || '',
      };
    } else {
      // epc_location
      delivery_address_snapshot = {
        shipping_address_line1: reqDeliv.shipping_address_line1 || epcLoc.address,
        state_name: reqDeliv.state_name || epcLoc.state_name,
        district_name: reqDeliv.district_name || epcLoc.district_name,
        pincode: reqDeliv.pincode || epcLoc.pincode,
        contact_person: reqDeliv.contact_person || epcLoc.contact_person,
        mobile: reqDeliv.mobile || epcLoc.mobile,
      };
    }

    // Resolve territory defaults from EPC if not provided
    const resolvedTerritory = {
      state_id: body.territory?.state_id || epc.states?.[0] || null,
      state_name: body.territory?.state_name || epcLoc.state_name || null,
      district_id: body.territory?.district_id || epc.districts?.[0] || null,
      district_name: body.territory?.district_name || epcLoc.district_name || null,
    };

    let initialPrices = {};
    try {
      if (body.combo_kit_id) {
        initialPrices = await _calculatePrice({
          kit_id: body.combo_kit_id,
          warehouse_id: body.warehouse_id,
          quantity: finalQuantity,
          warranty_id: body.warranty_id,
          delivery_pincode: delivery_address_snapshot?.pincode,
          delivery_district_id: resolvedTerritory.district_id,
          delivery_type: body.delivery_type,
          passed_delivery_charges_paise: body.delivery_charges_paise,
          passed_price_per_kit_paise: body.price_per_kit_paise,
          is_trial_kit: Boolean(is_trial_kit),
        });
      }
    } catch (e) {
      console.warn('[create_draft] Initial price calculation fallback:', e.message);
    }

    const quote = new EpcQuote({
      status: 'draft',
      ...initialPrices,
      quote_source,
      is_trial_kit: Boolean(is_trial_kit),
      quote_type,
      trial_kit_quantity,
      created_by: actor.id,
      created_by_role: actor.role,
      bde_id,
      bde_snapshot,
      franchisee_id,
      franchisee_snapshot,
      epc_id: body.epc_id,
      epc_snapshot,
      territory: resolvedTerritory,
      delivery_type: body.delivery_type || 'epc_location',
      delivery_address_snapshot,
      warehouse_id: body.warehouse_id || null,
      industry_type_id,
      industry_type_snapshot,
      project_type_id,
      project_type_snapshot,
      combo_kit_id: body.combo_kit_id,
      combo_kit_snapshot,
      kit_capacity_kw,
      quantity: finalQuantity,
      total_kw: (kit_capacity_kw || 0) * finalQuantity,
      warranty_id: body.warranty_id || null,
      warranty_snapshot: body.warranty_snapshot || null,
    });

    await quote.save();

    await _log_activity({
      quote_id: quote._id,
      quote_number: null,
      action: 'QUOTE_CREATED',
      new_status: 'draft',
      performed_by: actor.id,
      performed_by_role: actor.role,
      performed_by_name: actor.name,
    });

    return res.status(201).json({ status: 'success', message: 'Draft quote created', data: quote });
  } catch (err) {
    console.error('[create_draft]', err.message);
    return res.status(500).json({ status: 'error', message: 'Failed to create draft quote' });
  }
};

/** PUT /:id — Update draft quote */
exports.update_draft = async (req, res) => {
  try {
    const actor = _actorFromReq(req);
    const { id } = req.params;

    const quote = await EpcQuote.findOne({ _id: id, deleted_at: null });
    if (!quote) return res.status(404).json({ status: 'error', message: 'Quote not found' });
    if (quote.status !== 'draft') return res.status(400).json({ status: 'error', message: 'Only draft quotes can be edited' });

    // Ownership check
    const isOwner = (actor.role === 'reseller' && quote.franchisee_id?.toString() === actor.id.toString()) ||
      (actor.role === 'bde' && quote.bde_id?.toString() === actor.id.toString());
    if (!isOwner) return res.status(403).json({ status: 'error', message: 'Access denied' });

    if (req.body.combo_kit_id && req.body.combo_kit_id !== quote.combo_kit_id?.toString()) {
      const kitResolved = await _resolveKitDetails(req.body.combo_kit_id);
      if (kitResolved) {
        if (!req.body.industry_type_id) quote.industry_type_id = kitResolved.industry_type_id;
        if (!req.body.industry_type_snapshot) quote.industry_type_snapshot = kitResolved.industry_type_snapshot;
        if (!req.body.project_type_id) quote.project_type_id = kitResolved.project_type_id;
        if (!req.body.project_type_snapshot) quote.project_type_snapshot = kitResolved.project_type_snapshot;
        if (!req.body.kit_capacity_kw) quote.kit_capacity_kw = kitResolved.capacity_kw;
        if (!req.body.combo_kit_snapshot) quote.combo_kit_snapshot = kitResolved.combo_kit_snapshot;
      }
    }

    if (req.body.delivery_address && !req.body.delivery_address_snapshot) {
      req.body.delivery_address_snapshot = req.body.delivery_address;
    }

    const allowed = ['delivery_type', 'delivery_address_snapshot', 'warehouse_id', 'warehouse_snapshot',
      'industry_type_id', 'industry_type_snapshot', 'project_type_id', 'project_type_snapshot',
      'combo_kit_id', 'combo_kit_snapshot', 'kit_capacity_kw', 'quantity', 'warranty_id',
      'warranty_snapshot', 'territory'];
    allowed.forEach(f => { if (req.body[f] !== undefined) quote[f] = req.body[f]; });

    const is_trial_kit = req.body.is_trial_kit !== undefined
      ? (req.body.is_trial_kit === true || req.body.is_trial_kit === 'true' || req.body.quote_type === 'trial_kit')
      : Boolean(quote.is_trial_kit);

    if (is_trial_kit) {
      quote.is_trial_kit = true;
      quote.quote_type = 'trial_kit';
      const targetKitId = req.body.combo_kit_id || quote.combo_kit_id;
      if (targetKitId) {
        const kDoc = await WarehouseComboKit.findById(targetKitId).lean();
        if (kDoc) {
          if (!kDoc.allow_trial_kit) {
            return res.status(400).json({ status: 'error', message: 'Selected combo kit is not authorized for trial kit orders by Admin configuration.' });
          }
          const tQty = kDoc.trial_kit_quantity !== undefined && kDoc.trial_kit_quantity !== null
            ? Math.max(1, Number(kDoc.trial_kit_quantity))
            : 10;
          quote.trial_kit_quantity = tQty;
          quote.quantity = tQty;
        }
      }
    }

    if (req.body.kit_capacity_kw || req.body.quantity || is_trial_kit) {
      quote.total_kw = (quote.kit_capacity_kw || 0) * (quote.quantity || 1);
    }
    quote.updated_by = actor.id;
    await quote.save();

    return res.json({ status: 'success', message: 'Draft updated', data: quote });
  } catch (err) {
    console.error('[update_draft]', err.message);
    return res.status(500).json({ status: 'error', message: 'Failed to update draft' });
  }
};

/** POST /:id/generate — Lock prices and assign quote number */
exports.generate_quote = async (req, res) => {
  try {
    const actor = _actorFromReq(req);
    const { id } = req.params;

    const quote = await EpcQuote.findOne({ _id: id, deleted_at: null });
    if (!quote) return res.status(404).json({ status: 'error', message: 'Quote not found' });
    if (!['draft'].includes(quote.status)) {
      return res.status(400).json({ status: 'error', message: 'Only draft quotes can be generated' });
    }

    // Ownership check
    const isOwner = (actor.role === 'reseller' && quote.franchisee_id?.toString() === actor.id.toString()) ||
      (actor.role === 'bde' && quote.bde_id?.toString() === actor.id.toString());
    if (!isOwner) return res.status(403).json({ status: 'error', message: 'Access denied' });

    // Validate required fields
    if (!quote.combo_kit_id) return res.status(400).json({ status: 'error', message: 'ComboKit is required' });

    // Strict Admin Trial Kit Quantity Enforcement
    if (quote.is_trial_kit) {
      const kDoc = await WarehouseComboKit.findById(quote.combo_kit_id).lean();
      if (!kDoc?.allow_trial_kit) {
        return res.status(400).json({ status: 'error', message: 'Selected combo kit is no longer authorized for trial kit orders by Admin.' });
      }
      const tQty = kDoc.trial_kit_quantity !== undefined && kDoc.trial_kit_quantity !== null
        ? Math.max(1, Number(kDoc.trial_kit_quantity))
        : 10;
      quote.trial_kit_quantity = tQty;
      quote.quantity = tQty;
      quote.total_kw = (quote.kit_capacity_kw || 0) * tQty;
    }

    if (!quote.quantity || quote.quantity < 1) return res.status(400).json({ status: 'error', message: 'Valid quantity is required' });

    const settings = await QuoteSettings.findOne().lean();

    // Calculate prices
    const priceBreakdown = await _calculatePrice({
      kit_id: quote.combo_kit_id,
      warehouse_id: quote.warehouse_id,
      quantity: quote.quantity,
      warranty_id: quote.warranty_id,
      delivery_pincode: quote.delivery_address_snapshot?.pincode,
      delivery_district_id: quote.territory?.district_id,
      delivery_type: quote.delivery_type,
      quote_settings: settings,
      passed_delivery_charges_paise: quote.delivery_charges_paise,
      passed_price_per_kit_paise: quote.price_per_kit_paise,
      is_trial_kit: Boolean(quote.is_trial_kit),
    });

    // Get terms
    const terms_snapshot = {
      payment_terms: settings?.payment_terms_options?.[0] || '100% advance payment before dispatch',
      delivery_terms: settings?.delivery_terms_text || '',
      warranty_terms: settings?.warranty_terms_text || '',
      terms_and_conditions: settings?.default_terms_and_conditions || '',
    };

    // Generate quote number
    const quote_number = await _generateQuoteNumber();

    // Validity
    const validityDays = settings?.quote_validity_days || 15;
    const valid_from = new Date();
    const valid_until = new Date(valid_from);
    valid_until.setDate(valid_until.getDate() + validityDays);

    // Update quote
    Object.assign(quote, {
      ...priceBreakdown,
      quote_number,
      status: 'generated',
      terms_snapshot,
      valid_from,
      valid_until,
      updated_by: actor.id,
    });
    await quote.save();

    await _log_activity({
      quote_id: quote._id,
      quote_number,
      action: 'QUOTE_GENERATED',
      old_status: 'draft',
      new_status: 'generated',
      performed_by: actor.id,
      performed_by_role: actor.role,
      performed_by_name: actor.name,
    });

    return res.json({ status: 'success', message: 'Quote generated successfully', data: quote });
  } catch (err) {
    console.error('[generate_quote]', err.message);
    return res.status(500).json({ status: 'error', message: 'Failed to generate quote' });
  }
};

/** GET /:id — Get single quote */
exports.get_quote = async (req, res) => {
  try {
    const actor = _actorFromReq(req);
    const { id } = req.params;

    const quote = await EpcQuote.findOne({ _id: id, deleted_at: null }).lean();
    if (!quote) return res.status(404).json({ status: 'error', message: 'Quote not found' });

    // Ownership check — Admin sees all, Franchisee sees own, BDE sees own + territory, EPC sees own
    const isOwner = (actor.role === 'admin') ||
      (actor.role === 'epc' && (quote.epc_id?.toString() === actor.id.toString() || (await _isEpcAccountMatch(actor.id, quote.epc_id)))) ||
      (actor.role === 'reseller' && quote.franchisee_id?.toString() === actor.id.toString()) ||
      (actor.role === 'bde' && (quote.bde_id?.toString() === actor.id.toString() || (quote.franchisee_id && (await _getBdeFranchisees(actor.id)).some(fid => fid.toString() === quote.franchisee_id?.toString()))));
    if (!isOwner) return res.status(403).json({ status: 'error', message: 'Access denied' });

    // Update viewed status if generated+
    if (['generated', 'sent'].includes(quote.status)) {
      await EpcQuote.findByIdAndUpdate(id, {
        $set: { status: 'viewed', last_viewed_at: new Date() },
        $inc: { view_count: 1 },
      });
      quote.status = 'viewed';
    }

    return res.json({ status: 'success', data: quote });
  } catch (err) {
    console.error('[get_quote]', err.message);
    return res.status(500).json({ status: 'error', message: 'Failed to fetch quote' });
  }
};

/** GET / — List quotes with filters */
exports.list_quotes = async (req, res) => {
  try {
    const actor = _actorFromReq(req);
    const {
      page = 1, limit = 20, status, epc_id, bde_id, quote_source,
      industry_type_id, project_type_id, combo_kit_id, warehouse_id,
      date_from, date_to, search, sort_by = 'created_at', sort_dir = '-1',
      is_trial_kit, quote_type,
    } = req.query;

    const filter = { deleted_at: null };

    if (is_trial_kit !== undefined) {
      filter.is_trial_kit = is_trial_kit === 'true' || is_trial_kit === true;
    }
    if (quote_type) {
      filter.quote_type = quote_type;
    }

    // Scope by actor
    if (actor.role === 'reseller') {
      filter.franchisee_id = actor.id;
    } else if (actor.role === 'bde') {
      filter.$or = [
        { bde_id: actor.id },
        { franchisee_id: { $in: await _getBdeFranchisees(actor.id) } },
      ];
    } else if (actor.role === 'epc') {
      const callerAccount = await EpcAccount.findOne({ _id: actor.id, deleted_at: null }).select('parent_account_id').lean();
      const rootEpcId = callerAccount?.parent_account_id || actor.id;
      filter.epc_id = new mongoose.Types.ObjectId(rootEpcId);
    }

    if (status) filter.status = { $in: status.split(',') };
    if (epc_id) filter.epc_id = new mongoose.Types.ObjectId(epc_id);
    if (bde_id) filter.bde_id = new mongoose.Types.ObjectId(bde_id);
    if (quote_source) filter.quote_source = quote_source;
    if (industry_type_id) filter.industry_type_id = new mongoose.Types.ObjectId(industry_type_id);
    if (project_type_id) filter.project_type_id = new mongoose.Types.ObjectId(project_type_id);
    if (combo_kit_id) filter.combo_kit_id = new mongoose.Types.ObjectId(combo_kit_id);
    if (warehouse_id) filter.warehouse_id = new mongoose.Types.ObjectId(warehouse_id);
    if (date_from || date_to) {
      filter.created_at = {};
      if (date_from) filter.created_at.$gte = new Date(date_from);
      if (date_to) filter.created_at.$lte = new Date(date_to);
    }
    if (search) {
      filter.$or = [
        { quote_number: { $regex: search, $options: 'i' } },
        { 'epc_snapshot.company_name': { $regex: search, $options: 'i' } },
        { 'epc_snapshot.gstin': { $regex: search, $options: 'i' } },
      ];
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const sortObj = { [sort_by]: parseInt(sort_dir) };

    const [quotes, total] = await Promise.all([
      EpcQuote.find(filter).sort(sortObj).skip(skip).limit(parseInt(limit)).lean(),
      EpcQuote.countDocuments(filter),
    ]);

    return res.json({
      status: 'success',
      data: { quotes, total, page: parseInt(page), limit: parseInt(limit), pages: Math.ceil(total / parseInt(limit)) },
    });
  } catch (err) {
    console.error('[list_quotes]', err.message);
    return res.status(500).json({ status: 'error', message: 'Failed to list quotes' });
  }
};

async function _getBdeFranchisees(bde_id) {
  const resellers = await Reseller.find({ bde_id }).select('_id').lean();
  return resellers.map(r => r._id);
}

/** GET /dashboard — KPI summary */
exports.get_dashboard = async (req, res) => {
  try {
    const actor = _actorFromReq(req);
    const filter = { deleted_at: null };

    if (actor.role === 'reseller') {
      filter.franchisee_id = new mongoose.Types.ObjectId(actor.id);
    } else if (actor.role === 'bde') {
      const bdeFranchisees = (await _getBdeFranchisees(actor.id)).map(id => new mongoose.Types.ObjectId(id));
      filter.$or = [
        { bde_id: new mongoose.Types.ObjectId(actor.id) },
        { franchisee_id: { $in: bdeFranchisees } },
      ];
    } else if (actor.role === 'epc') {
      const callerAccount = await EpcAccount.findOne({ _id: actor.id, deleted_at: null }).select('parent_account_id').lean();
      const rootEpcId = callerAccount?.parent_account_id || actor.id;
      filter.epc_id = new mongoose.Types.ObjectId(rootEpcId);
    }

    const today = new Date(); today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate() + 1);

    const followupFilter = {
      ...(actor.role === 'reseller'
        ? { franchisee_id: new mongoose.Types.ObjectId(actor.id) }
        : actor.role === 'epc'
          ? { epc_id: filter.epc_id }
          : {
            $or: [
              { bde_id: new mongoose.Types.ObjectId(actor.id) },
              { franchisee_id: { $in: (await _getBdeFranchisees(actor.id)).map(id => new mongoose.Types.ObjectId(id)) } },
            ],
          }),
      status: { $in: ['scheduled', 'rescheduled', 'pending'] },
      deleted_at: null,
    };

    const [
      total,
      draft,
      converted,
      lost,
      total_follow_ups_today,
      overdue_follow_ups,
      valueAgg,
      statusAgg,
    ] = await Promise.all([
      EpcQuote.countDocuments(filter),
      EpcQuote.countDocuments({ ...filter, status: 'draft' }),
      EpcQuote.countDocuments({ ...filter, status: 'converted' }),
      EpcQuote.countDocuments({ ...filter, status: 'lost' }),
      EpcQuoteFollowup.countDocuments({
        ...followupFilter,
        next_follow_up_date: { $gte: today, $lt: tomorrow },
      }),
      EpcQuoteFollowup.countDocuments({
        ...followupFilter,
        next_follow_up_date: { $lt: today },
      }),
      EpcQuote.aggregate([
        { $match: filter },
        {
          $group: {
            _id: null,
            total_quoted_paise: { $sum: '$total_amount_paise' },
            total_converted_paise: {
              $sum: { $cond: [{ $eq: ['$status', 'converted'] }, '$total_amount_paise', 0] },
            },
            total_pipeline_paise: {
              $sum: {
                $cond: [
                  {
                    $in: [
                      '$status',
                      ['draft', 'generated', 'sent', 'viewed', 'under_review', 'negotiation', 'follow_up_pending', 'interested'],
                    ],
                  },
                  '$total_amount_paise',
                  0,
                ],
              },
            },
          },
        },
      ]),
      EpcQuote.aggregate([
        { $match: filter },
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]),
    ]);

    const agg = valueAgg[0] || {};
    const total_converted_value_paise = agg.total_converted_paise || 0;
    const total_pipeline_value_paise = agg.total_pipeline_paise || 0;
    const total_quoted_paise = agg.total_quoted_paise || 0;
    const conversion_rate = total > 0 ? ((converted / total) * 100).toFixed(1) : '0.0';

    const by_status = {
      draft: 0,
      generated: 0,
      sent: 0,
      viewed: 0,
      under_review: 0,
      negotiation: 0,
      follow_up_pending: 0,
      interested: 0,
      converted: 0,
      lost: 0,
      expired: 0,
    };
    (statusAgg || []).forEach((item) => {
      if (item._id && by_status.hasOwnProperty(item._id)) {
        by_status[item._id] = item.count;
      }
    });

    const active =
      (by_status.generated || 0) +
      (by_status.sent || 0) +
      (by_status.viewed || 0) +
      (by_status.under_review || 0) +
      (by_status.negotiation || 0) +
      (by_status.follow_up_pending || 0) +
      (by_status.interested || 0);

    return res.json({
      status: 'success',
      data: {
        summary: {
          total_quotes: total,
          converted_quotes: converted,
          total_pipeline_value_paise: total_pipeline_value_paise,
          total_converted_value_paise: total_converted_value_paise,
          total_quoted_value_paise: total_quoted_paise,
          conversion_rate_pct: parseFloat(conversion_rate),
        },
        by_status,
        followups_today: total_follow_ups_today,
        follow_ups_today: total_follow_ups_today,
        overdue_follow_ups,
        // Flat aliases so any component reading flat or summary keys gets accurate data:
        total,
        total_quotes: total,
        draft,
        active,
        converted,
        converted_quotes: converted,
        lost,
        conversion_rate_pct: parseFloat(conversion_rate),
        total_quoted_paise,
        total_converted_paise: total_converted_value_paise,
        total_pipeline_value_paise,
        total_converted_value_paise,
      },
    });
  } catch (err) {
    console.error('[get_dashboard]', err.message);
    return res.status(500).json({ status: 'error', message: 'Failed to get dashboard data' });
  }
};

/* ═══════════════════════════════════════════════════════════════════════════
   5. REVISION
   ═══════════════════════════════════════════════════════════════════════════ */

/** POST /:id/revise — Create revised quote */
exports.revise_quote = async (req, res) => {
  try {
    const actor = _actorFromReq(req);
    const { id } = req.params;

    const original = await EpcQuote.findOne({ _id: id, deleted_at: null }).lean();
    if (!original) return res.status(404).json({ status: 'error', message: 'Quote not found' });
    if (['draft', 'revised', 'converted'].includes(original.status)) {
      return res.status(400).json({ status: 'error', message: `Cannot revise a ${original.status} quote` });
    }

    const isOwner = (actor.role === 'reseller' && original.franchisee_id?.toString() === actor.id.toString()) ||
      (actor.role === 'bde' && original.bde_id?.toString() === actor.id.toString());
    if (!isOwner) return res.status(403).json({ status: 'error', message: 'Access denied' });

    const revision_number = (original.revision_number || 0) + 1;
    const root_id = original.original_quote_id || original._id;

    // Create new quote as draft
    const newQuote = new EpcQuote({
      ...original,
      _id: new mongoose.Types.ObjectId(),
      quote_number: null,
      status: 'draft',
      revision_number,
      original_quote_id: root_id,
      created_by: actor.id,
      created_by_role: actor.role,
      converted_order_id: null,
      converted_order_type: null,
      converted_at: null,
      share_history: [],
      pdf_generated_at: null,
      view_count: 0,
      idempotency_key: null,
      valid_from: null,
      valid_until: null,
      // Reset prices — will be recalculated on generate
      price_per_kit_paise: 0,
      product_subtotal_paise: 0,
      gst_amount_paise: 0,
      total_amount_paise: 0,
    });

    // Apply any changes from body
    const editable = ['quantity', 'warranty_id', 'warranty_snapshot', 'delivery_type',
      'delivery_address_snapshot', 'warehouse_id', 'combo_kit_snapshot'];
    editable.forEach(f => { if (req.body[f] !== undefined) newQuote[f] = req.body[f]; });

    await newQuote.save();

    // Mark original as revised
    await EpcQuote.findByIdAndUpdate(id, { status: 'revised', updated_by: actor.id });

    await _log_activity({
      quote_id: original._id,
      quote_number: original.quote_number,
      action: 'REVISED',
      old_status: original.status,
      new_status: 'revised',
      performed_by: actor.id,
      performed_by_role: actor.role,
      performed_by_name: actor.name,
      metadata: { new_quote_id: newQuote._id, revision_number },
    });

    return res.status(201).json({
      status: 'success',
      message: `Revised quote created (revision ${revision_number})`,
      data: newQuote,
    });
  } catch (err) {
    console.error('[revise_quote]', err.message);
    return res.status(500).json({ status: 'error', message: 'Failed to revise quote' });
  }
};

/* ═══════════════════════════════════════════════════════════════════════════
   6. PDF GENERATOR
   ═══════════════════════════════════════════════════════════════════════════ */

/** GET /:id/pdf — Generate and stream PDF */
exports.get_pdf = async (req, res) => {
  try {
    const actor = _actorFromReq(req);
    const { id } = req.params;

    const quote = await EpcQuote.findOne({ _id: id, deleted_at: null }).lean();
    if (!quote) return res.status(404).json({ status: 'error', message: 'Quote not found' });

    const isOwner = (actor.role === 'admin') ||
      (actor.role === 'epc' && (quote.epc_id?.toString() === actor.id.toString() || (await _isEpcAccountMatch(actor.id, quote.epc_id)))) ||
      (actor.role === 'reseller' && quote.franchisee_id?.toString() === actor.id.toString()) ||
      (actor.role === 'bde' && (quote.bde_id?.toString() === actor.id.toString() || (quote.franchisee_id && (await _getBdeFranchisees(actor.id)).some(fid => fid.toString() === quote.franchisee_id?.toString()))));
    if (!isOwner) return res.status(403).json({ status: 'error', message: 'Access denied' });

    // Robust Price Fallbacks (ensures prices NEVER display as 0 or '0.00)
    const kitSnap = quote.combo_kit_snapshot || {};
    const fallbackUnitPaise = Math.round(
      (kitSnap.selling_price_cached || kitSnap.base_price_cached || ((quote.kit_capacity_kw || kitSnap.capacity_kw || 3) * 55000)) * 100
    );
    const pricePerKitPaise = (quote.price_per_kit_paise && quote.price_per_kit_paise > 0)
      ? quote.price_per_kit_paise
      : (fallbackUnitPaise > 0 ? fallbackUnitPaise : 16500000);

    const quantity = quote.quantity && quote.quantity > 0 ? quote.quantity : 1;
    const productSubtotalPaise = (quote.product_subtotal_paise && quote.product_subtotal_paise > 0)
      ? quote.product_subtotal_paise
      : pricePerKitPaise * quantity;

    const warrantyChargesPaise = quote.warranty_charges_paise || 0;
    const deliveryChargesPaise = quote.delivery_charges_paise || 0;
    const discountPaise = quote.discount_paise || 0;

    const taxableAmountPaise = (quote.taxable_amount_paise && quote.taxable_amount_paise > 0)
      ? quote.taxable_amount_paise
      : (productSubtotalPaise + warrantyChargesPaise + deliveryChargesPaise - discountPaise);

    const gstRate = quote.gst_rate != null ? quote.gst_rate : 5;
    const gstAmountPaise = (quote.gst_amount_paise && quote.gst_amount_paise > 0)
      ? quote.gst_amount_paise
      : Math.round(taxableAmountPaise * (gstRate / 100));

    const totalAmountPaise = (quote.total_amount_paise && quote.total_amount_paise > 0)
      ? quote.total_amount_paise
      : (taxableAmountPaise + gstAmountPaise);

    const isDraft = quote.status === 'draft' || !quote.quote_number;
    const displayQuoteNumber = quote.quote_number || (`DRAFT-${quote._id.toString().slice(-6).toUpperCase()}`);

    const doc = new PDFDocument({
      size: 'A4',
      margin: 36,
      autoFirstPage: false,
      info: {
        Title: `Quotation ${displayQuoteNumber}`,
        Author: 'SolarKits Ecosystem',
      },
    });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="Quote-${displayQuoteNumber}.pdf"`);
    doc.pipe(res);

    // Image paths
    const imagesDir = path.join(__dirname, '../../../assets/images');
    const logoPath = path.join(imagesDir, 'logo.png');
    const kitImgPath = path.join(imagesDir, 'product_solar_kit.jpg');
    const panelImgPath = path.join(imagesDir, 'product_panel_mono.jpg');
    const inverterImgPath = path.join(imagesDir, 'product_inverter.jpg');

    // Dynamic Theme Settings from Admin Panel Quote Settings
    const quoteSettings = await QuoteSettings.findOne().lean();
    const defaultTheme = {
      primary_color: '#ea580c',
      secondary_color: '#0f172a',
      accent_color: '#0284c7',
      light_bg_color: '#f8fafc',
      border_color: '#e2e8f0',
      company_name: 'SolarKits India',
      company_tagline: "India's Premier Solar ComboKit Distribution Platform",
      commercial_notes_title: 'COMMERCIAL & STATUTORY NOTES',
      commercial_notes: [
        'Prices quoted are in Indian Rupees (INR) and valid up to the expiration date.',
        'Dispatched directly through authorized distribution hubs with transit insurance.',
        'Refer to Page 2 for Detailed Technical Bill of Materials (BOM) & Equipment Specifications.',
        'Standard statutory warranty coverage applies as detailed in technical specifications.',
      ],
      bom_page_title: 'TECHNICAL SPECIFICATIONS & BILL OF MATERIALS (BOM)',
      footer_text: 'SolarKits India • Confidential Commercial Proposal • All Rights Reserved',
    };
    const pdfTheme = { ...defaultTheme, ...(quoteSettings?.pdf_theme || {}) };

    const PRIMARY = pdfTheme.primary_color || '#ea580c';
    const SECONDARY = pdfTheme.secondary_color || '#0f172a';
    const ACCENT = pdfTheme.accent_color || '#0284c7';
    const LIGHT_BG = pdfTheme.light_bg_color || '#f8fafc';
    const BORDER_COLOR = pdfTheme.border_color || '#e2e8f0';
    const SLATE = '#334155';
    const GREY = '#64748b';
    const pageW = 595 - 72; // 523 usable width with 36 margins

    // Fetch Full ComboKit Definition from Database for Dynamic BOM & BOS
    let fullKit = null;
    if (quote.combo_kit_id) {
      try {
        fullKit = await WarehouseComboKit.findById(quote.combo_kit_id).lean();
      } catch (e) { }
    }
    const kit = fullKit || quote.combo_kit_snapshot || {};
    const cap = Number(kit.capacity || kit.capacity_kw || quote.kit_capacity_kw || 3);

    // ==========================================
    // PAGE 1: EXECUTIVE COMMERCIAL QUOTATION
    // ==========================================
    doc.addPage({ size: 'A4', margin: 36 });

    // Top Accent Bar (Theme Primary Color)
    doc.rect(0, 0, 595, 4).fill(PRIMARY);

    // Bright Header Container (#ffffff with soft bottom border)
    doc.rect(0, 4, 595, 78).fill('#ffffff');
    doc.moveTo(0, 82).lineTo(595, 82).stroke('#e2e8f0');

    // 1. Logo on the left (aspect ratio 3332:820 -> width ~154)
    const logoH = 38;
    const logoW = Math.round(logoH * (3332 / 820)); // ~154px
    if (fs.existsSync(logoPath)) {
      try {
        doc.image(logoPath, 36, 18, { width: logoW, height: logoH });
      } catch (e) {
        doc.fontSize(24).fillColor(PRIMARY).font('Helvetica-Bold').text('SolarKits', 36, 22);
      }
    } else {
      doc.fontSize(24).fillColor(PRIMARY).font('Helvetica-Bold').text('SolarKits', 36, 22);
    }

    // Vertical Separator after logo with safe margin
    const sepX = 36 + logoW + 16;
    doc.moveTo(sepX, 18).lineTo(sepX, 66).stroke('#e2e8f0');

    // Dynamic Company Branding & Subtitle
    const textLeftX = sepX + 14;
    doc.fontSize(8.5).fillColor(SECONDARY).font('Helvetica-Bold').text(pdfTheme.company_name || 'SolarKits India', textLeftX, 20);
    doc.fontSize(7).fillColor(GREY).font('Helvetica').text(pdfTheme.company_tagline || 'Solar Ecosystem & EPC Distribution Platform', textLeftX, 33, { width: 190 });
    doc.fontSize(6.5).fillColor(GREY).font('Helvetica').text('Corporate Identity: U40106GJ2024PTC123456 | GSTIN: 24AAACS1234F1Z5', textLeftX, 47, { width: 190 });

    // Right Header Area: Title & Reference
    const rightBoxW = 180;
    const rightBoxX = 36 + pageW - rightBoxW;
    const pdfQuoteTitle = isDraft
      ? (quote.is_trial_kit ? 'TRIAL KIT DRAFT ESTIMATE' : 'DRAFT ESTIMATE')
      : (quote.is_trial_kit ? 'TRIAL KIT PROPOSAL' : 'COMMERCIAL QUOTATION');
    doc.fontSize(12).fillColor(SECONDARY).font('Helvetica-Bold').text(pdfQuoteTitle, rightBoxX, 18, { width: rightBoxW, align: 'right' });

    // Ref Badge
    doc.roundedRect(rightBoxX + rightBoxW - 130, 34, 130, 18, 3).fill(LIGHT_BG);
    doc.rect(rightBoxX + rightBoxW - 130, 34, 130, 18).stroke(BORDER_COLOR);
    doc.fontSize(8.5).fillColor(PRIMARY).font('Helvetica-Bold').text(displayQuoteNumber, rightBoxX + rightBoxW - 130, 38, { width: 130, align: 'center' });

    doc.fontSize(7).fillColor(GREY).font('Helvetica').text(`Issued: ${_fmtDate(quote.created_at || new Date())}`, rightBoxX, 56, { width: rightBoxW, align: 'right' });

    let y = 94;

    // Metadata Badge Strip
    doc.roundedRect(36, y, pageW, 26, 4).fill(LIGHT_BG);
    doc.rect(36, y, pageW, 26).stroke(BORDER_COLOR);

    const statusColor = quote.status === 'converted' ? '#16a34a' : (quote.status === 'lost' ? '#dc2626' : (quote.status === 'draft' ? '#64748b' : PRIMARY));
    doc.roundedRect(42, y + 4, 75, 18, 3).fill(statusColor);
    doc.fontSize(8).fillColor('#ffffff').font('Helvetica-Bold').text((quote.status === 'draft' ? 'DRAFT' : (quote.status || 'GENERATED')).toUpperCase(), 42, y + 8, { width: 75, align: 'center' });

    doc.fontSize(8).fillColor(GREY).font('Helvetica').text('Quotation Date:', 130, y + 8);
    doc.fontSize(8).fillColor(SECONDARY).font('Helvetica-Bold').text(_fmtDate(quote.valid_from || quote.created_at), 195, y + 8);

    doc.fontSize(8).fillColor(GREY).font('Helvetica').text('Valid Until:', 260, y + 8);
    doc.fontSize(8).fillColor(SECONDARY).font('Helvetica-Bold').text(_fmtDate(quote.valid_until), 310, y + 8);

    doc.fontSize(8).fillColor(GREY).font('Helvetica').text('Currency:', 385, y + 8);
    doc.fontSize(8).fillColor(SECONDARY).font('Helvetica-Bold').text('INR (Rs.)', 430, y + 8);

    doc.fontSize(8).fillColor(GREY).font('Helvetica').text('Revision:', 485, y + 8);
    doc.fontSize(8).fillColor(SECONDARY).font('Helvetica-Bold').text(`Rev-${quote.revision_number || 0}`, 525, y + 8);

    y += 34;

    // 2-Column Entity Cards: EPC Buyer vs Franchisee
    const epc = quote.epc_snapshot || {};
    const fr = quote.franchisee_snapshot || {};
    const colW = (pageW - 12) / 2;

    // EPC Buyer Card
    doc.roundedRect(36, y, colW, 90, 4).fill(LIGHT_BG);
    doc.rect(36, y, colW, 90).stroke(BORDER_COLOR);
    doc.rect(36, y, colW, 20).fill('#f1f5f9');
    doc.fontSize(7.5).fillColor(PRIMARY).font('Helvetica-Bold').text('QUOTATION FOR (EPC BUYER / CLIENT)', 44, y + 6);

    doc.fontSize(8.5).fillColor(SECONDARY).font('Helvetica-Bold').text(epc.company_name || epc.contact_person || 'EPC Client', 44, y + 25, { width: colW - 16, height: 12 });
    const epcAddr = epc.address || `${epc.district_name || ''}, ${epc.state_name || ''} - ${epc.pincode || ''}`;
    doc.fontSize(7).fillColor(SLATE).font('Helvetica').text(epcAddr, 44, y + 39, { width: colW - 16, height: 24 });
    doc.fontSize(7).fillColor(GREY).text(`GSTIN: ${epc.gstin || 'Unregistered / N/A'}`, 44, y + 65);
    doc.fontSize(7).fillColor(GREY).text(`Contact: ${epc.mobile || ''} | ${epc.email || ''}`, 44, y + 76);

    // Franchisee / BDE Issuer Card
    const isBdeDirect = quote.quote_source === 'bde_direct' || !quote.franchisee_id;
    const frX = 36 + colW + 12;
    doc.roundedRect(frX, y, colW, 90, 4).fill(LIGHT_BG);
    doc.rect(frX, y, colW, 90).stroke(BORDER_COLOR);
    doc.rect(frX, y, colW, 20).fill('#f1f5f9');

    const issuerHeader = isBdeDirect ? 'PREPARED & ISSUED BY (BDE DIRECT)' : 'PREPARED & ISSUED BY (FRANCHISEE)';
    doc.fontSize(7.5).fillColor(PRIMARY).font('Helvetica-Bold').text(issuerHeader, frX + 8, y + 6);

    const issuerName = isBdeDirect
      ? (quote.bde_snapshot?.full_name || 'SolarKits Central BDE')
      : (fr.business_name || 'Authorized SolarKits Franchisee');
    doc.fontSize(8.5).fillColor(SECONDARY).font('Helvetica-Bold').text(issuerName, frX + 8, y + 25, { width: colW - 16, height: 12 });

    const issuerAddrStr = isBdeDirect
      ? 'SolarKits Central Fulfillment Network, India'
      : (typeof fr.address === 'object' && fr.address
        ? [fr.address.line, fr.address.city, fr.address.pincode].filter(Boolean).join(', ')
        : (fr.address || 'Franchisee Distribution Center'));
    doc.fontSize(7).fillColor(SLATE).font('Helvetica').text(issuerAddrStr, frX + 8, y + 39, { width: colW - 16, height: 24 });

    const issuerId = isBdeDirect
      ? `BDE ID: ${quote.bde_snapshot?.bde_id_code || 'BDE-DIRECT'}`
      : `GSTIN: ${fr.gst_number || 'Franchise Partner Hub'}`;
    doc.fontSize(7).fillColor(GREY).text(issuerId, frX + 8, y + 65);

    const issuerContact = isBdeDirect
      ? `Contact: ${quote.bde_snapshot?.mobile || ''} | ${quote.bde_snapshot?.email || 'support@solarkits.in'}`
      : `Contact: ${fr.mobile || ''} | ${fr.email || ''}`;
    doc.fontSize(7).fillColor(GREY).text(issuerContact, frX + 8, y + 76);

    y += 98;

    // Delivery / Site Location Strip
    const deliv = quote.delivery_address_snapshot || {};
    const delivType = quote.delivery_type === 'franchisee_warehouse' ? 'Franchisee Store Depot Pickup' : 'Direct EPC Site Delivery';
    doc.roundedRect(36, y, pageW, 24, 3).fill(LIGHT_BG);
    doc.rect(36, y, pageW, 24).stroke(BORDER_COLOR);
    doc.fontSize(7.5).fillColor(PRIMARY).font('Helvetica-Bold').text('DELIVERY & FULFILLMENT:', 44, y + 7);
    const delivDetail = `${delivType} | Address: ${deliv.shipping_address_line1 || epcAddr} | Contact: ${deliv.contact_person || epc.contact_person || ''} (${deliv.mobile || epc.mobile || ''})`;
    doc.fontSize(7).fillColor(SECONDARY).font('Helvetica').text(delivDetail, 155, y + 7, { width: pageW - 125, height: 14 });

    y += 32;

    // Hero ComboKit Overview with Image
    const heroCardH = 88;
    doc.roundedRect(36, y, pageW, heroCardH, 4).fill(LIGHT_BG);
    doc.rect(36, y, pageW, heroCardH).stroke(BORDER_COLOR);

    // Embedded Kit Image
    if (fs.existsSync(kitImgPath)) {
      try {
        doc.image(kitImgPath, 44, y + 8, { width: 95, height: 72, fit: [95, 72] });
      } catch (e) {
        doc.rect(44, y + 8, 95, 72).fill('#e2e8f0');
      }
    }

    // Kit Details
    const kitTextX = 148;
    doc.fontSize(10).fillColor(SECONDARY).font('Helvetica-Bold').text(kit.name || 'Solar ComboKit Package', kitTextX, y + 8, { width: pageW - 120 });

    doc.roundedRect(kitTextX, y + 26, 62, 14, 2).fill('#f1f5f9');
    doc.fontSize(7).fillColor(PRIMARY).font('Helvetica-Bold').text(`${cap} kW System`, kitTextX, y + 29, { width: 62, align: 'center' });

    doc.roundedRect(kitTextX + 68, y + 26, 85, 14, 2).fill('#e0f2fe');
    doc.fontSize(7).fillColor(ACCENT).font('Helvetica-Bold').text(kit.industry_type_name || 'Solar PV', kitTextX + 68, y + 29, { width: 85, align: 'center' });

    doc.roundedRect(kitTextX + 158, y + 26, 120, 14, 2).fill('#f1f5f9');
    doc.fontSize(7).fillColor(SECONDARY).font('Helvetica-Bold').text(kit.project_type_name || 'On-Grid Residential', kitTextX + 158, y + 29, { width: 120, align: 'center' });

    doc.fontSize(7.5).fillColor(GREY).font('Helvetica').text('Brand / Ecosystem:', kitTextX, y + 46);
    doc.fontSize(7.5).fillColor(SECONDARY).font('Helvetica-Bold').text(kit.brand_name || 'SolarKits Ecosystem Partner', kitTextX + 80, y + 46);

    doc.fontSize(7).fillColor(SLATE).font('Helvetica')
      .text('Includes: Tier-1 Solar PV Modules + High Efficiency Inverter + Certified Complete BOS Kit + Heavy MMS Structure + DC/AC Cabling', kitTextX, y + 60, { width: pageW - 120 });

    y += heroCardH + 12;

    // Commercial Pricing Table
    doc.fontSize(9).fillColor(PRIMARY).font('Helvetica-Bold').text('COMMERCIAL PRICING & FINANCIAL SCHEDULE', 36, y);
    y += 14;

    // Table Header (Theme Secondary Color)
    const thY = y;
    doc.rect(36, thY, pageW, 20).fill(SECONDARY);
    doc.fontSize(7.5).fillColor('#ffffff').font('Helvetica-Bold')
      .text('#', 42, thY + 6)
      .text('ITEM & DESCRIPTION', 60, thY + 6)
      .text('CAPACITY', 270, thY + 6)
      .text('QTY', 340, thY + 6)
      .text('UNIT PRICE', 380, thY + 6)
      .text('TAXABLE AMT (RS.)', 450, thY + 6, { width: 100, align: 'right' });
    y += 20;

    // Table Row 1: Combo Kit
    const row1H = 34;
    doc.rect(36, y, pageW, row1H).fill(LIGHT_BG);
    doc.rect(36, y, pageW, row1H).stroke(BORDER_COLOR);

    doc.fontSize(8).fillColor(SECONDARY).font('Helvetica-Bold').text('1', 42, y + 6);
    const pdfKitName = quote.is_trial_kit
      ? `[TRIAL KIT] ${kit.name || 'Solar ComboKit Complete System'}`
      : (kit.name || 'Solar ComboKit Complete System');
    doc.fontSize(8).fillColor(SECONDARY).font('Helvetica-Bold').text(pdfKitName, 60, y + 6, { width: 200, height: 12 });
    const pdfKitDesc = quote.is_trial_kit
      ? `Authorized Trial Evaluation Pack (${quote.trial_kit_quantity || quantity} Kits) • Admin Configured`
      : 'Complete On-Grid Solar System Package with Equipment & BOS';
    doc.fontSize(7).fillColor(GREY).font('Helvetica').text(pdfKitDesc, 60, y + 18, { width: 200 });
    doc.fontSize(8).fillColor(SECONDARY).font('Helvetica').text(`${cap} kW`, 270, y + 10);
    doc.text(String(quantity), 345, y + 10);
    doc.text(_paiseToINR(pricePerKitPaise), 380, y + 10);
    doc.font('Helvetica-Bold').text(_paiseToINR(productSubtotalPaise), 450, y + 10, { width: 100, align: 'right' });
    y += row1H;

    // Table Row 2 (Optional Warranty only — Freight is shown strictly in the Financial Summary Box)
    if (warrantyChargesPaise > 0) {
      doc.rect(36, y, pageW, 22).fill('#fefce8');
      doc.rect(36, y, pageW, 22).stroke(BORDER_COLOR);
      doc.fontSize(7.5).fillColor(SECONDARY).font('Helvetica-Bold').text('2', 42, y + 6);
      doc.text(`Extended Warranty Protection: ${quote.warranty_snapshot?.name || 'Comprehensive Coverage'}`, 60, y + 6, { width: 200 });
      doc.text('-', 270, y + 6);
      doc.text(String(quantity), 345, y + 6);
      doc.text(_paiseToINR(Math.round(warrantyChargesPaise / quantity)), 380, y + 6);
      doc.font('Helvetica-Bold').text(_paiseToINR(warrantyChargesPaise), 450, y + 6, { width: 100, align: 'right' });
      y += 22;
    }

    y += 10;

    // Bottom Summary Section: Left = Commercial Terms & Policy; Right = Financial Schedule Breakdown
    const boxW = 240;
    const boxX = 36 + pageW - boxW;
    const leftW = pageW - boxW - 12;
    const summaryBoxH = 124;

    // Left Box: Commercial Terms (Crisp, Low-Text, High Understandability)
    doc.roundedRect(36, y, leftW, summaryBoxH, 4).fill(LIGHT_BG);
    doc.rect(36, y, leftW, summaryBoxH).stroke(BORDER_COLOR);
    doc.rect(36, y, leftW, 22).fill('#f1f5f9');
    doc.fontSize(7.5).fillColor(PRIMARY).font('Helvetica-Bold').text('COMMERCIAL TERMS & DISPATCH POLICY', 44, y + 7);

    let noteY = y + 28;
    const commercialBullets = [
      `• GST Rate: Single statutory ${gstRate}% tax rate applied on commercial total.`,
      `• Quotation Validity: Valid up to ${_fmtDate(quote.valid_until)} as per company policy.`,
      `• Direct Fulfillment: Dispatched via authorized distribution hub with transit cover.`,
      `• Payment Terms: 100% advance payment required prior to warehouse dispatch.`,
      `• Standard Warranties: Tier-1 Solar PV modules (25-30 Yrs) & Inverter (5 Yrs).`,
    ];

    commercialBullets.forEach((bullet) => {
      doc.fontSize(7).fillColor(SLATE).font('Helvetica').text(bullet, 44, noteY, { width: leftW - 16 });
      noteY += 16;
    });

    // Right Box: Financial Totals Schedule
    doc.roundedRect(boxX, y, boxW, summaryBoxH, 4).fill(LIGHT_BG);
    doc.rect(boxX, y, boxW, summaryBoxH).stroke(BORDER_COLOR);

    const finRow = (label, val, rY, isBold = false, color = SECONDARY) => {
      doc.fontSize(7.5).fillColor(GREY).font('Helvetica').text(label, boxX + 10, rY);
      doc.fontSize(7.5).fillColor(color).font(isBold ? 'Helvetica-Bold' : 'Helvetica').text(val, boxX + 110, rY, { width: boxW - 120, align: 'right' });
    };

    finRow('Base Kit Subtotal', _paiseToINR(productSubtotalPaise), y + 8);
    if (warrantyChargesPaise > 0) {
      finRow('Warranty / Protection', _paiseToINR(warrantyChargesPaise), y + 20);
    }
    finRow('Logistics & Freight', deliveryChargesPaise > 0 ? _paiseToINR(deliveryChargesPaise) : 'Included / Free', y + (warrantyChargesPaise > 0 ? 32 : 22));
    finRow('Total Taxable Value', _paiseToINR(taxableAmountPaise), y + (warrantyChargesPaise > 0 ? 44 : 36), true);
    finRow(`Statutory GST (${gstRate}%)`, _paiseToINR(gstAmountPaise), y + (warrantyChargesPaise > 0 ? 56 : 50));

    // Total Highlight Bar
    const totalBarY = y + (warrantyChargesPaise > 0 ? 70 : 64);
    const totalBarH = summaryBoxH - (totalBarY - y);
    doc.rect(boxX, totalBarY, boxW, totalBarH).fill(PRIMARY);
    doc.fontSize(8).fillColor('#ffffff').font('Helvetica-Bold').text('TOTAL AMOUNT (INCL. GST)', boxX + 10, totalBarY + 7);
    doc.fontSize(12).fillColor('#ffffff').font('Helvetica-Bold').text(_paiseToINR(totalAmountPaise), boxX + 10, totalBarY + 18, { width: boxW - 20, align: 'right' });
    doc.fontSize(6).fillColor('#fed7aa').font('Helvetica').text(_inrInWords(totalAmountPaise), boxX + 10, totalBarY + 34, { width: boxW - 20, align: 'right' });

    y += summaryBoxH + 10;

    // Signatures Directly on Page 1 (Legally Complete Commercial Document)
    const sigW = (pageW - 12) / 2;
    const sigH = 75;

    // EPC Acceptance Box (Left)
    doc.roundedRect(36, y, sigW, sigH, 4).fill(LIGHT_BG);
    doc.rect(36, y, sigW, sigH).stroke(BORDER_COLOR);
    doc.fontSize(7.5).fillColor(SECONDARY).font('Helvetica-Bold').text('CONFIRMED & ACCEPTED BY EPC BUYER', 44, y + 8);
    doc.fontSize(6.5).fillColor(GREY).font('Helvetica').text(`Buyer: ${epc.company_name || epc.contact_person || 'EPC Client'}`, 44, y + 20);
    doc.moveTo(44, y + 54).lineTo(36 + sigW - 16, y + 54).stroke('#cbd5e1');
    doc.fontSize(6.5).fillColor(GREY).text('Authorized Signatory & Stamp                Date: _______________', 44, y + 59);

    // SolarKits / BDE Issuer Box (Right)
    const sigX2 = 36 + sigW + 12;
    doc.roundedRect(sigX2, y, sigW, sigH, 4).fill(LIGHT_BG);
    doc.rect(sigX2, y, sigW, sigH).stroke(BORDER_COLOR);
    const sigIssuerTitle = isBdeDirect ? 'FOR SOLARKITS CENTRAL FULFILLMENT' : 'FOR AUTHORIZED SOLARKITS FRANCHISEE';
    doc.fontSize(7.5).fillColor(SECONDARY).font('Helvetica-Bold').text(sigIssuerTitle, sigX2 + 8, y + 8);
    doc.fontSize(6.5).fillColor(GREY).font('Helvetica').text(`Issued by: ${issuerName} (${isBdeDirect ? (quote.bde_snapshot?.bde_id_code || 'BDE') : (fr.gst_number || 'Franchisee')})`, sigX2 + 8, y + 20);
    doc.moveTo(sigX2 + 8, y + 54).lineTo(sigX2 + sigW - 16, y + 54).stroke('#cbd5e1');
    doc.fontSize(6.5).fillColor(GREY).text('Authorized Representative Signature        Date: _______________', sigX2 + 8, y + 59);

    // Page 1 Footer
    const prevBottom1 = doc.page.margins.bottom;
    doc.page.margins.bottom = 0;
    doc.rect(0, 792, 595, 50).fill(SECONDARY);
    doc.fontSize(7).fillColor('#cbd5e1').font('Helvetica')
      .text(pdfTheme.footer_text || 'SolarKits India • Confidential Commercial Proposal • All Rights Reserved', 36, 800, { width: pageW, align: 'center', lineBreak: false });
    doc.fontSize(6.5).fillColor('#94a3b8')
      .text('This is a digitally generated commercial proposal. Refer to Page 2 for Detailed Equipment Specifications & BOM.', 36, 811, { width: pageW, align: 'center', lineBreak: false });
    doc.fontSize(7).fillColor(PRIMARY)
      .text(`Quote Ref: ${displayQuoteNumber} | Page 1 of 2 (Commercial Proposal)`, 36, 822, { width: pageW, align: 'center', lineBreak: false });
    doc.page.margins.bottom = prevBottom1;

    // ==========================================
    // PAGE 2: DETAILED TECHNICAL BOM & SPECS
    // ==========================================
    doc.addPage({ size: 'A4', margin: 36 });

    // Top Accent Bar (Theme Primary Color)
    doc.rect(0, 0, 595, 4).fill(PRIMARY);

    // Bright Header Bar
    doc.rect(0, 4, 595, 48).fill('#ffffff');
    doc.moveTo(0, 52).lineTo(595, 52).stroke('#e2e8f0');

    const p2LogoH = 28;
    const p2LogoW = Math.round(p2LogoH * (3332 / 820)); // ~114px
    if (fs.existsSync(logoPath)) {
      try {
        doc.image(logoPath, 36, 14, { width: p2LogoW, height: p2LogoH });
      } catch (e) {
        doc.fontSize(14).fillColor(PRIMARY).font('Helvetica-Bold').text('SolarKits', 36, 18);
      }
    }

    const p2SepX = 36 + p2LogoW + 14;
    doc.moveTo(p2SepX, 14).lineTo(p2SepX, 42).stroke('#e2e8f0');
    doc.fontSize(9.5).fillColor(SECONDARY).font('Helvetica-Bold').text(pdfTheme.bom_page_title || 'TECHNICAL SPECIFICATIONS & BILL OF MATERIALS (BOM)', p2SepX + 12, 16);
    doc.fontSize(7.5).fillColor(GREY).font('Helvetica').text(`Quote Ref: ${displayQuoteNumber} | ${kit.name || ''}`, p2SepX + 12, 30);

    let p2Y = 66;

    // Compute dynamic module count & rating
    const panelComp = (kit.base_components || []).find(c => c.quantity >= 2) || (kit.base_components || [])[1];
    const moduleCount = panelComp?.quantity || Math.max(2, Math.round(cap * 2));
    const moduleWattage = 500;
    const totalArrayKw = (moduleCount * moduleWattage / 1000).toFixed(2);

    // 1. Solar Panels Card (Dynamic Kit-wise Specs)
    const panelH = 92;
    doc.roundedRect(36, p2Y, pageW, panelH, 4).fill(LIGHT_BG);
    doc.rect(36, p2Y, pageW, panelH).stroke(BORDER_COLOR);

    if (fs.existsSync(panelImgPath)) {
      try {
        doc.image(panelImgPath, 44, p2Y + 8, { width: 85, height: 75, fit: [85, 75] });
      } catch (e) {
        doc.rect(44, p2Y + 8, 85, 75).fill('#e2e8f0');
      }
    }

    const pTextX = 138;
    doc.fontSize(9).fillColor(PRIMARY).font('Helvetica-Bold').text('1. SOLAR PHOTOVOLTAIC MODULES (PANELS)', pTextX, p2Y + 8);
    doc.fontSize(8.5).fillColor(SECONDARY).font('Helvetica-Bold').text(`Tata Power Solar / Solarkits ${moduleWattage}Wp Bifacial DCR Mono PERC Half-Cut Modules`, pTextX, p2Y + 22);

    const panelSpecs = [
      ['Technology:', 'Tier-1 High-Efficiency Bifacial DCR Monocrystalline PERC (144 Half-Cut Cells)'],
      ['Module Efficiency:', '>= 21.4% with up to 25% bifacial rear gain for high energy yield'],
      ['Module Rating / Qty:', `${moduleWattage}Wp Modules x ${moduleCount} Nos. (Total DC Array Capacity: ~${totalArrayKw} kWp)`],
      ['Durability & Frame:', 'Anodized aluminium alloy frame (35mm) with IP68 junction box & bypass diodes'],
      ['Warranties:', '12-Year Workmanship Warranty + 30-Year Linear Output Performance (>= 85%)'],
      ['Certifications:', 'ALMM Approved, DCR Compliant (Domestic Content Requirement), BIS Certified (IS 14286), IEC 61215/61730'],
    ];

    let specY = p2Y + 36;
    panelSpecs.forEach(([lbl, val]) => {
      doc.fontSize(6.5).fillColor(GREY).font('Helvetica-Bold').text(lbl, pTextX, specY, { width: 85 });
      doc.fontSize(6.5).fillColor(SECONDARY).font('Helvetica').text(val, pTextX + 85, specY, { width: pageW - (pTextX - 36) - 90 });
      specY += 9;
    });

    p2Y += panelH + 10;

    // 2. Solar Inverter Card (Dynamic Kit-wise Specs)
    const invH = 92;
    doc.roundedRect(36, p2Y, pageW, invH, 4).fill(LIGHT_BG);
    doc.rect(36, p2Y, pageW, invH).stroke(BORDER_COLOR);

    if (fs.existsSync(inverterImgPath)) {
      try {
        doc.image(inverterImgPath, 44, p2Y + 8, { width: 85, height: 75, fit: [85, 75] });
      } catch (e) {
        doc.rect(44, p2Y + 8, 85, 75).fill('#e2e8f0');
      }
    }

    doc.fontSize(9).fillColor(PRIMARY).font('Helvetica-Bold').text('2. SOLAR ON-GRID INVERTER', pTextX, p2Y + 8);

    let invTitle = `Solarkits / Sunno ${cap}.0 kW Single-Phase Dual MPPT On-Grid Inverter`;
    let invSpecs = [];
    if (cap === 1) {
      invTitle = 'Solarkits / Sunno 1.0 kW High-Efficiency On-Grid Micro / String Inverter';
      invSpecs = [
        ['AC Output Rating:', '1.0 kW (1000 VA), 230V AC Single-Phase, 50 Hz Pure Sine Wave (< 3% THD)'],
        ['Maximum Efficiency:', '97.4% Peak Efficiency, Wide MPPT Operating Voltage Range (60V - 450V)'],
        ['Built-in Protections:', 'Integrated DC Disconnect Switch, Type II DC & AC Surge Arresters, Anti-Islanding Protection'],
        ['Monitoring Module:', 'Smart WiFi / GPRS Cloud Telemetry Stick with Mobile App & Web Monitoring'],
        ['Enclosure Rating:', 'IP65 Natural Convection Cooling, Ultra-low acoustic noise (< 20 dB)'],
        ['Manufacturer Warranty:', '5-Year Full Comprehensive On-Site Manufacturer Warranty (extendable to 10 Years)'],
      ];
    } else if (cap === 2) {
      invTitle = 'Solarkits / Sunno 2.0 kW Single-Phase On-Grid Solar Inverter';
      invSpecs = [
        ['AC Output Rating:', '2.0 kW (2000 VA), 230V AC Single-Phase, 50 Hz Pure Sine Wave (< 3% THD)'],
        ['Maximum Efficiency:', '97.5% Peak Efficiency, Wide MPPT Voltage Range (70V - 500V)'],
        ['Built-in Protections:', 'Integrated DC Switch, Type II Surge Arresters (DC+AC), Anti-Islanding Protection'],
        ['Monitoring Module:', 'Smart WiFi / GPRS Cloud Telemetry Stick with Mobile App & Web Monitoring'],
        ['Enclosure Rating:', 'IP65 Weatherproof Ingress Protection, Natural Convection Cooling (< 25 dB)'],
        ['Manufacturer Warranty:', '5-Year Full Comprehensive On-Site Manufacturer Warranty (extendable to 10 Years)'],
      ];
    } else {
      invTitle = `Solarkits / Sunno ${cap}.0 kW Single-Phase Dual MPPT On-Grid Inverter`;
      invSpecs = [
        ['AC Output Rating:', `${cap}.0 kW (${cap * 1000} VA), 230V AC Single-Phase, 50 Hz Pure Sine Wave (< 3% THD)`],
        ['Maximum Efficiency:', '97.8% Peak Efficiency (Euro Efficiency 97.2%), Wide Dual MPPT Range (80V - 550V)'],
        ['Built-in Protections:', 'Integrated DC Disconnect Switch, Type II DC & AC Surge Arresters, Anti-Islanding Protection'],
        ['Monitoring Module:', 'Smart WiFi / GPRS Cloud Stick included for real-time mobile app and web telemetry'],
        ['Enclosure Rating:', 'IP65 Natural Convection Cooling, Ultra-low acoustic noise (< 25 dB)'],
        ['Manufacturer Warranty:', '5-Year Full Comprehensive On-Site Manufacturer Warranty (extendable to 10 Years)'],
      ];
    }

    doc.fontSize(8.5).fillColor(SECONDARY).font('Helvetica-Bold').text(invTitle, pTextX, p2Y + 22);

    specY = p2Y + 36;
    invSpecs.forEach(([lbl, val]) => {
      doc.fontSize(6.5).fillColor(GREY).font('Helvetica-Bold').text(lbl, pTextX, specY, { width: 85 });
      doc.fontSize(6.5).fillColor(SECONDARY).font('Helvetica').text(val, pTextX + 85, specY, { width: pageW - (pTextX - 36) - 90 });
      specY += 9;
    });

    p2Y += invH + 10;

    // 3. BOS Kits & Protection Switchgear Card (Dynamic configured BOS breakdown)
    const configuredBosCount = (kit.bos_kits || []).length;
    const hasDcdb = cap >= 2 || (kit.bos_kits || []).some(b => b.name?.toLowerCase().includes('dcdb'));
    const totalCableM = cap === 1 ? '60 meters (DC & Earthing)' : '110 meters (DC, AC & Earthing)';
    const lugsCount = cap === 1 ? '4 Nos.' : '5 Nos.';
    const tiesCount = cap === 1 ? '15 Nos.' : '50 Nos.';

    const bosH = 90;
    doc.roundedRect(36, p2Y, pageW, bosH, 4).fill(LIGHT_BG);
    doc.rect(36, p2Y, pageW, bosH).stroke(BORDER_COLOR);

    doc.fontSize(9).fillColor(PRIMARY).font('Helvetica-Bold').text('3. BALANCE OF SYSTEM (BOS) & ELECTRICAL SWITCHGEAR', 44, p2Y + 8);
    doc.fontSize(8.5).fillColor(SECONDARY).font('Helvetica-Bold').text(`Certified Industrial Protection & Safety Switchgear (${configuredBosCount > 0 ? configuredBosCount : (cap === 1 ? 16 : 21)} Configured Components)`, 44, p2Y + 22);

    const bosSpecs = [
      ['AC Distribution Box (ACDB):', 'IP65 Weatherproof box, Schneider/Havells 32A 2-Pole MCB, Class II AC SPD, Net-Meter ready (1 Unit)'],
      ['DC Distribution Box (DCDB):', hasDcdb ? 'IP65 Polycarbonate enclosure, 1000V DC MCB/Fuse (15A/20A), Class II DC Surge Protection (SPD 40kA)' : 'Integrated DC Disconnect & Surge Protection inside Inverter Enclosure (1 kW compact system)'],
      ['Solar DC Cabling & Wiring:', `4 sq.mm Electron-beam cross-linked, UV resistant tin-coated copper solar cable + earthing wire (${totalCableM})`],
      ['Earthing Protection Kit:', `3 Nos. Chemical Earthing Electrodes (GI/Copper bonded 17.2mm x 2m) + 25kg Earth Compound + ${lugsCount} Lugs`],
      ['Lightning Protection & Hardware:', `High-grade copper/GI spike Lightning Arrester (LA) + MC4 Connectors (2 Pairs) + UV Ties (${tiesCount}) + PVC Bends & Tees`],
    ];

    specY = p2Y + 36;
    bosSpecs.forEach(([lbl, val]) => {
      doc.fontSize(6.5).fillColor(GREY).font('Helvetica-Bold').text(lbl, 44, specY, { width: 135 });
      doc.fontSize(6.5).fillColor(SECONDARY).font('Helvetica').text(val, 182, specY, { width: pageW - 155 });
      specY += 10;
    });

    p2Y += bosH + 10;

    // 4. Module Mounting Structure (MMS)
    const mmsH = 68;
    doc.roundedRect(36, p2Y, pageW, mmsH, 4).fill(LIGHT_BG);
    doc.rect(36, p2Y, pageW, mmsH).stroke(BORDER_COLOR);

    doc.fontSize(9).fillColor(PRIMARY).font('Helvetica-Bold').text('4. MODULE MOUNTING STRUCTURE (MMS) & HARDWARE', 44, p2Y + 8);
    doc.fontSize(8.5).fillColor(SECONDARY).font('Helvetica-Bold').text(`Heavy-Duty Pre-Galvanized & HDG Steel Structure (Engineered for ${moduleCount} Solar Modules)`, 44, p2Y + 22);

    const mmsSpecs = [
      ['Material & Coating:', 'Cold-formed HDG Steel / Anodized Aluminum with minimum 80-micron zinc coating (IS 4759 compliant)'],
      ['Wind Load Rating:', 'Engineered to withstand extreme wind speeds up to 150 km/h (IS 875 Part 3 design certified)'],
      ['Fasteners & Hardware:', `SS304 grade bolts, nuts, washers, end clamps (${Math.max(4, moduleCount * 2)} Nos), and mid clamps with anti-corrosion EPDM gaskets`],
    ];

    specY = p2Y + 36;
    mmsSpecs.forEach(([lbl, val]) => {
      doc.fontSize(6.5).fillColor(GREY).font('Helvetica-Bold').text(lbl, 44, specY, { width: 135 });
      doc.fontSize(6.5).fillColor(SECONDARY).font('Helvetica').text(val, 182, specY, { width: pageW - 155 });
      specY += 10;
    });

    p2Y += mmsH + 12;

    // Technical Compliance & Quality Assurance Block (Page 2)
    const p2CardW = (pageW - 12) / 2;
    const p2CardH = 75;

    // Quality Standards Box (Left)
    doc.roundedRect(36, p2Y, p2CardW, p2CardH, 4).fill(LIGHT_BG);
    doc.rect(36, p2Y, p2CardW, p2CardH).stroke(BORDER_COLOR);
    doc.fontSize(7.5).fillColor(SECONDARY).font('Helvetica-Bold').text('TECHNICAL & STATUTORY COMPLIANCE', 44, p2Y + 8);
    doc.fontSize(6.5).fillColor(GREY).font('Helvetica').text('Certified according to MNRE & CEA guidelines:', 44, p2Y + 20);
    doc.fontSize(6.5).fillColor(SLATE).text('• BIS Certified Modules & Inverter (IS 14286 / IS 16221)', 44, p2Y + 34);
    doc.fontSize(6.5).fillColor(SLATE).text('• DCR Compliant (Domestic Content Requirement)', 44, p2Y + 46);
    doc.fontSize(6.5).fillColor(SLATE).text('• ALMM Listed (Approved List of Models & Manufacturers)', 44, p2Y + 58);

    // Dispatch & Engineering Support Box (Right)
    const p2CardX2 = 36 + p2CardW + 12;
    doc.roundedRect(p2CardX2, p2Y, p2CardW, p2CardH, 4).fill(LIGHT_BG);
    doc.rect(p2CardX2, p2Y, p2CardW, p2CardH).stroke(BORDER_COLOR);
    doc.fontSize(7.5).fillColor(SECONDARY).font('Helvetica-Bold').text('ENGINEERING & DISPATCH INSPECTION', p2CardX2 + 8, p2Y + 8);
    doc.fontSize(6.5).fillColor(GREY).font('Helvetica').text('Pre-Dispatch Quality Inspection (PDI) Certified:', p2CardX2 + 8, p2Y + 20);
    doc.fontSize(6.5).fillColor(SLATE).text('• Factory Flash Test & EL (Electroluminescence) Verified', p2CardX2 + 8, p2Y + 34);
    doc.fontSize(6.5).fillColor(SLATE).text('• Tamper-proof Barcode / QR Coded Equipment Serial Numbers', p2CardX2 + 8, p2Y + 46);
    doc.fontSize(6.5).fillColor(SLATE).text('• Technical Support Helpline: support@solarkits.in', p2CardX2 + 8, p2Y + 58);

    // Page 2 Footer (Theme Secondary Color)
    const prevBottom2 = doc.page.margins.bottom;
    doc.page.margins.bottom = 0;
    doc.rect(0, 792, 595, 50).fill(SECONDARY);
    doc.fontSize(7).fillColor('#cbd5e1').font('Helvetica')
      .text('SolarKits Ecosystem & Technical Support: support@solarkits.in | Toll-Free: 1800-SOLAR-KIT', 36, 800, { width: pageW, align: 'center', lineBreak: false });
    doc.fontSize(6.5).fillColor('#94a3b8')
      .text('All specifications are in compliance with standard test conditions (STC: 1000 W/m2, AM 1.5, Cell Temp 25°C).', 36, 811, { width: pageW, align: 'center', lineBreak: false });
    doc.fontSize(7).fillColor(PRIMARY)
      .text(`Quote Ref: ${quote.quote_number || displayQuoteNumber} | Page 2 of 2 (End of Quotation)`, 36, 822, { width: pageW, align: 'center', lineBreak: false });
    doc.page.margins.bottom = prevBottom2;

    doc.end();

    // Log PDF download
    await EpcQuote.findByIdAndUpdate(id, { pdf_generated_at: new Date() });
    await _log_activity({
      quote_id: quote._id,
      quote_number: quote.quote_number,
      action: 'PDF_DOWNLOADED',
      performed_by: actor.id,
      performed_by_role: actor.role,
      performed_by_name: actor.name,
    });
  } catch (err) {
    console.error('[get_pdf]', err.message);
    if (!res.headersSent) {
      return res.status(500).json({ status: 'error', message: 'Failed to generate PDF' });
    }
  }
};

/* ═══════════════════════════════════════════════════════════════════════════
   7. SHARING SERVICE
   ═══════════════════════════════════════════════════════════════════════════ */

/** POST /:id/share — Share via email / WhatsApp / link */
exports.share_quote = async (req, res) => {
  try {
    const actor = _actorFromReq(req);
    const { id } = req.params;
    const { method, recipient, notes } = req.body;

    if (!method) return res.status(400).json({ status: 'error', message: 'Share method is required' });

    const quote = await EpcQuote.findOne({ _id: id, deleted_at: null }).lean();
    if (!quote) return res.status(404).json({ status: 'error', message: 'Quote not found' });
    if (quote.status === 'draft') return res.status(400).json({ status: 'error', message: 'Generate the quote before sharing' });

    const isOwner = (actor.role === 'reseller' && quote.franchisee_id?.toString() === actor.id.toString()) ||
      (actor.role === 'bde' && quote.bde_id?.toString() === actor.id.toString());
    if (!isOwner) return res.status(403).json({ status: 'error', message: 'Access denied' });

    const epc = quote.epc_snapshot || {};
    const quoteRef = quote.quote_number;

    if (method === 'email' && recipient) {
      await sendEmail(
        recipient,
        `SolarKits Quotation ${quoteRef}`,
        `Dear ${epc.company_name || 'EPC Partner'},\n\nPlease find your quotation reference ${quoteRef}.\n\nQuote Value: ${_paiseToINR(quote.total_amount_paise)}\nValid Until: ${_fmtDate(quote.valid_until)}\n\nFor PDF, please contact your SolarKits partner.`,
        'SolarKits'
      );
    } else if (method === 'whatsapp' && recipient) {
      const msg = `*SolarKits Quotation — ${quoteRef}*\n\nDear ${epc.company_name || 'EPC Partner'},\n\nQuote Value: ${_paiseToINR(quote.total_amount_paise)}\nValid Until: ${_fmtDate(quote.valid_until)}\n\nContact your SolarKits partner for full details.`;
      await sendWhatsApp(recipient, msg);
    }

    // Record in share_history
    await EpcQuote.findByIdAndUpdate(id, {
      $push: { share_history: { method, recipient: recipient || null, sent_by: actor.id, sent_at: new Date(), notes: notes || null } },
      $set: { status: quote.status === 'generated' || quote.status === 'viewed' ? 'sent' : quote.status },
    });

    await _log_activity({
      quote_id: quote._id,
      quote_number: quote.quote_number,
      action: `SHARED_${method.toUpperCase()}`,
      performed_by: actor.id,
      performed_by_role: actor.role,
      performed_by_name: actor.name,
      metadata: { method, recipient },
    });

    return res.json({ status: 'success', message: `Quote shared via ${method}` });
  } catch (err) {
    console.error('[share_quote]', err.message);
    return res.status(500).json({ status: 'error', message: 'Failed to share quote' });
  }
};

/* ═══════════════════════════════════════════════════════════════════════════
   8. FOLLOW-UP MANAGER
   ═══════════════════════════════════════════════════════════════════════════ */

/** POST /:id/follow-ups — Create follow-up */
exports.create_followup = async (req, res) => {
  try {
    const actor = _actorFromReq(req);
    const { id } = req.params;

    const quote = await EpcQuote.findOne({ _id: id, deleted_at: null }).lean();
    if (!quote) return res.status(404).json({ status: 'error', message: 'Quote not found' });

    const isOwner = (actor.role === 'reseller' && quote.franchisee_id?.toString() === actor.id.toString()) ||
      (actor.role === 'bde' && quote.bde_id?.toString() === actor.id.toString());
    if (!isOwner) return res.status(403).json({ status: 'error', message: 'Access denied' });

    const followup = new EpcQuoteFollowup({
      quote_id: quote._id,
      quote_number: quote.quote_number,
      epc_id: quote.epc_id,
      epc_name: quote.epc_snapshot?.company_name,
      franchisee_id: quote.franchisee_id,
      bde_id: quote.bde_id,
      next_follow_up_date: req.body.next_follow_up_date,
      follow_up_time: req.body.follow_up_time || null,
      follow_up_mode: req.body.follow_up_mode || 'call',
      remarks: req.body.remarks || null,
      expected_quantity: req.body.expected_quantity || null,
      expected_order_date: req.body.expected_order_date || null,
      expected_order_value_paise: req.body.expected_order_value_paise || null,
      probability_pct: req.body.probability_pct || null,
      status: 'scheduled',
      assigned_to: actor.id,
      assigned_to_role: actor.role,
      created_by: actor.id,
    });

    await followup.save();

    // Update quote status if it was generated/sent/viewed
    if (['generated', 'sent', 'viewed', 'interested'].includes(quote.status)) {
      await EpcQuote.findByIdAndUpdate(id, { status: 'follow_up_pending' });
    }

    await _log_activity({
      quote_id: quote._id,
      quote_number: quote.quote_number,
      action: 'FOLLOW_UP_ADDED',
      performed_by: actor.id,
      performed_by_role: actor.role,
      performed_by_name: actor.name,
      metadata: { next_follow_up_date: req.body.next_follow_up_date, follow_up_mode: req.body.follow_up_mode },
    });

    return res.status(201).json({ status: 'success', message: 'Follow-up scheduled', data: followup });
  } catch (err) {
    console.error('[create_followup]', err.message);
    return res.status(500).json({ status: 'error', message: 'Failed to create follow-up' });
  }
};

/** GET /:id/follow-ups — List follow-ups for a quote */
exports.list_quote_followups = async (req, res) => {
  try {
    const actor = _actorFromReq(req);
    const { id } = req.params;

    const followups = await EpcQuoteFollowup.find({ quote_id: id, deleted_at: null })
      .sort({ next_follow_up_date: 1 })
      .lean();

    return res.json({ status: 'success', data: followups });
  } catch (err) {
    console.error('[list_quote_followups]', err.message);
    return res.status(500).json({ status: 'error', message: 'Failed to fetch follow-ups' });
  }
};

/** GET /follow-ups/list — All follow-ups with filters */
exports.list_all_followups = async (req, res) => {
  try {
    const actor = _actorFromReq(req);
    const { date_filter, status, page = 1, limit = 30 } = req.query;

    const filter = { deleted_at: null };
    if (actor.role === 'reseller') filter.franchisee_id = actor.id;
    else if (actor.role === 'bde') filter.bde_id = actor.id;

    const dateRange = _followUpDateRange(date_filter);
    if (dateRange) filter.next_follow_up_date = dateRange;
    if (status) filter.status = { $in: status.split(',') };

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [followups, total] = await Promise.all([
      EpcQuoteFollowup.find(filter)
        .populate({ path: 'quote_id', select: 'quote_number status epc_snapshot total_amount_paise' })
        .populate({ path: 'epc_id', select: 'name gstin_legal_name gstin_trade_name company_name mobile whatsapp' })
        .sort({ next_follow_up_date: 1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      EpcQuoteFollowup.countDocuments(filter),
    ]);

    return res.json({
      status: 'success',
      data: followups,
      followups: followups,
      total,
      page: parseInt(page),
      limit: parseInt(limit),
    });
  } catch (err) {
    console.error('[list_all_followups]', err.message);
    return res.status(500).json({ status: 'error', message: 'Failed to list follow-ups' });
  }
};

/** PUT /follow-ups/:id — Update follow-up */
exports.update_followup = async (req, res) => {
  try {
    const actor = _actorFromReq(req);
    const { id } = req.params;

    const followup = await EpcQuoteFollowup.findOne({ _id: id, deleted_at: null });
    if (!followup) return res.status(404).json({ status: 'error', message: 'Follow-up not found' });

    const allowed = ['next_follow_up_date', 'follow_up_time', 'follow_up_mode', 'remarks',
      'status', 'outcome_notes', 'expected_quantity', 'expected_order_date',
      'expected_order_value_paise', 'probability_pct', 'last_follow_up_date'];
    allowed.forEach(f => { if (req.body[f] !== undefined) followup[f] = req.body[f]; });
    if (req.body.status === 'completed' && !followup.completed_at) followup.completed_at = new Date();
    followup.updated_by = actor.id;
    await followup.save();

    // Sync quote status with follow-up status
    const quoteStatusMap = {
      interested: 'interested',
      negotiation: 'negotiation',
      order_expected: 'order_expected',
      converted: 'converted',
      lost: 'lost',
    };
    if (quoteStatusMap[req.body.status]) {
      await EpcQuote.findByIdAndUpdate(followup.quote_id, { status: quoteStatusMap[req.body.status] });
    }

    return res.json({ status: 'success', message: 'Follow-up updated', data: followup });
  } catch (err) {
    console.error('[update_followup]', err.message);
    return res.status(500).json({ status: 'error', message: 'Failed to update follow-up' });
  }
};

/** GET /:id/activity — Activity history */
exports.get_activity = async (req, res) => {
  try {
    const { id } = req.params;
    const activities = await EpcQuoteActivity.find({ quote_id: id }).sort({ created_at: -1 }).lean();
    return res.json({ status: 'success', data: activities });
  } catch (err) {
    console.error('[get_activity]', err.message);
    return res.status(500).json({ status: 'error', message: 'Failed to fetch activity' });
  }
};

/* ═══════════════════════════════════════════════════════════════════════════
   9. ACTIVITY & AUDIT LOGGER
   ═══════════════════════════════════════════════════════════════════════════ */

async function _log_activity({ quote_id, quote_number, action, old_status, new_status, remarks, performed_by, performed_by_role, performed_by_name, metadata }) {
  try {
    await EpcQuoteActivity.create({
      quote_id,
      quote_number,
      action,
      old_status: old_status || null,
      new_status: new_status || null,
      remarks: remarks || null,
      performed_by: performed_by || null,
      performed_by_role: performed_by_role || 'system',
      performed_by_name: performed_by_name || null,
      metadata: metadata || null,
    });

    // Central audit log
    if (performed_by) {
      await AuditLog.create({
        actor_type: performed_by_role === 'bde' ? 'bde' : (performed_by_role === 'reseller' ? 'reseller' : 'cms_user'),
        actor_id: performed_by,
        action: `QUOTE_${action}`,
        entity_type: 'epc_quotes',
        entity_id: quote_id,
        metadata: { quote_number, ...metadata },
      });
    }
  } catch (logErr) {
    console.error('[_log_activity] Non-fatal logging error:', logErr.message);
  }
}

/* ═══════════════════════════════════════════════════════════════════════════
   10. ORDER CONVERSION
   ═══════════════════════════════════════════════════════════════════════════ */

/** POST /:id/convert-order */
exports.convert_to_order = async (req, res) => {
  try {
    const actor = _actorFromReq(req);
    const { id } = req.params;
    const { order_type = 'epc_order' } = req.body; // 'epc_order' | 'fpo_order'

    if (!['epc_order', 'fpo_order'].includes(order_type)) {
      return res.status(400).json({ status: 'error', message: 'order_type must be epc_order or fpo_order' });
    }

    const quote = await EpcQuote.findOne({ _id: id, deleted_at: null });
    if (!quote) return res.status(404).json({ status: 'error', message: 'Quote not found' });

    // Ownership check
    const isOwner = (actor.role === 'reseller' && quote.franchisee_id?.toString() === actor.id.toString()) ||
      (actor.role === 'bde' && quote.bde_id?.toString() === actor.id.toString());
    if (!isOwner) return res.status(403).json({ status: 'error', message: 'Access denied' });

    // Validations
    const settings = await QuoteSettings.findOne().lean();
    if (quote.converted_order_id && !settings?.allow_duplicate_conversion) {
      return res.status(400).json({ status: 'error', message: 'This quote has already been converted to an order' });
    }
    if (quote.status === 'expired' && !settings?.allow_expired_quote_conversion) {
      return res.status(400).json({ status: 'error', message: 'Expired quotes cannot be converted. Please revise the quote first.' });
    }
    if (quote.status === 'draft') {
      return res.status(400).json({ status: 'error', message: 'Please generate the quote before converting to an order' });
    }
    if (quote.valid_until && new Date() > new Date(quote.valid_until) && !settings?.allow_expired_quote_conversion) {
      return res.status(400).json({ status: 'error', message: 'Quote has expired. Please revise before converting.' });
    }

    // Check EPC still active
    const epc = await EpcAccount.findOne({ _id: quote.epc_id, deleted_at: null, status: 'approved' }).lean();
    if (!epc) return res.status(400).json({ status: 'error', message: 'EPC account is no longer active' });

    // Check kit still active
    const kit = await WarehouseComboKit.findOne({ _id: quote.combo_kit_id, is_active: true, deleted_at: null }).lean();
    if (!kit) return res.status(400).json({ status: 'error', message: 'ComboKit is no longer active. Please revise the quote.' });

    let createdOrder;
    const orderNumber = `SKO-${Date.now()}`;

    if (order_type === 'epc_order') {
      // Build epc_order from quote snapshot
      const orderDoc = {
        order_number: orderNumber,
        epc_id: quote.epc_id,
        reseller_id: quote.franchisee_id || null,
        routing_source: quote.franchisee_id ? 'primary_reseller' : 'direct_fallback',
        items: [{
          scope_type: 'kit',
          kit_id: quote.combo_kit_id,
          item_name: quote.combo_kit_snapshot?.name || 'Solar ComboKit',
          capacity: `${quote.kit_capacity_kw || 0} kW`,
          description: quote.combo_kit_snapshot?.description || null,
          quantity: quote.quantity,
          unit_price_paise: quote.price_per_kit_paise,
          cost_price_paise: 0,
          reseller_margin_paise: 0,
          platform_commission_paise: 0,
          gst_rate: quote.gst_rate,
          tax_paise: Math.round((quote.price_per_kit_paise * quote.quantity) * (quote.gst_rate / 100)),
          total_price_paise: quote.product_subtotal_paise,
        }],
        subtotal_paise: quote.product_subtotal_paise,
        tax_total_paise: quote.gst_amount_paise,
        shipping_fee_paise: quote.delivery_charges_paise || 0,
        grand_total_paise: quote.total_amount_paise,
        order_status: 'pending',
        payment_method: 'offline_bank_transfer',
        payment_status: 'pending',
        fulfillment_source: quote.warehouse_id ? 'company_warehouse' : 'direct_fulfillment',
        warehouse_id: quote.warehouse_id || null,
        is_end_customer_sale: true,
        delivery_address: {
          line: quote.delivery_address_snapshot?.address_line || null,
          state_name: quote.delivery_address_snapshot?.state_name || null,
          district_name: quote.delivery_address_snapshot?.district_name || null,
          pincode: quote.delivery_address_snapshot?.pincode || null,
          contact_name: quote.delivery_address_snapshot?.contact_person || null,
          contact_phone: quote.delivery_address_snapshot?.mobile || null,
        },
      };

      if (quote.is_trial_kit) {
        orderDoc.is_trial_kit = true;
        orderDoc.is_trial_order = true;
        orderDoc.order_type = 'trial_order';
        orderDoc.trial_kit_quantity = quote.trial_kit_quantity || quote.quantity;
      }

      createdOrder = await EpcOrder.create(orderDoc);

    } else {
      // fpo_order
      if (!quote.franchisee_id) {
        return res.status(400).json({ status: 'error', message: 'FPO orders require a franchisee attribution. BDE direct deals must be converted as EPC orders.' });
      }
      const poNumber = `FPO-${Date.now()}`;
      const orderDoc = {
        po_number: poNumber,
        idempotency_key: `quote-${quote._id}-${Date.now()}`,
        order_type: 'po_order',
        destination_type: 'epc_allocation',
        franchisee_id: quote.franchisee_id,
        plan_id: req.body.plan_id || null,
        territory_snapshot: quote.territory || null,
        state_id: quote.territory?.state_id || null,
        district_id: quote.territory?.district_id || null,
        items: [{
          kit_id: quote.combo_kit_id,
          item_name: quote.combo_kit_snapshot?.name || 'Solar ComboKit',
          quantity: quote.quantity,
          unit_price_paise: quote.price_per_kit_paise,
          gst_rate: quote.gst_rate,
          tax_paise: Math.round((quote.price_per_kit_paise * quote.quantity) * (quote.gst_rate / 100)),
          total_price_paise: quote.product_subtotal_paise,
        }],
        subtotal_paise: quote.product_subtotal_paise,
        tax_total_paise: quote.gst_amount_paise,
        shipping_fee_paise: quote.delivery_charges_paise || 0,
        grand_total_paise: quote.total_amount_paise,
        payment_terms: 'FULL_ADVANCE',
        status: 'DRAFT',
        requires_approval: true,
      };
      createdOrder = await FpoOrder.create(orderDoc);
    }

    // Update quote
    await EpcQuote.findByIdAndUpdate(id, {
      status: 'converted',
      converted_order_id: createdOrder._id,
      converted_order_type: order_type,
      converted_at: new Date(),
      updated_by: actor.id,
    });

    await _log_activity({
      quote_id: quote._id,
      quote_number: quote.quote_number,
      action: 'CONVERTED_ORDER',
      old_status: quote.status,
      new_status: 'converted',
      performed_by: actor.id,
      performed_by_role: actor.role,
      performed_by_name: actor.name,
      metadata: {
        order_type,
        order_id: createdOrder._id,
        order_number: order_type === 'epc_order' ? createdOrder.order_number : createdOrder.po_number,
      },
    });

    return res.json({
      status: 'success',
      message: 'Quote converted to order successfully',
      data: {
        quote_number: quote.quote_number,
        order_type,
        order_id: createdOrder._id,
        order_number: order_type === 'epc_order' ? createdOrder.order_number : createdOrder.po_number,
      },
    });
  } catch (err) {
    console.error('[convert_to_order]', err.message);
    return res.status(500).json({ status: 'error', message: err.message || 'Failed to convert quote to order' });
  }
};

/* ═══════════════════════════════════════════════════════════════════════════
   11. GET QUOTE SETTINGS (for frontend stepper)
   ═══════════════════════════════════════════════════════════════════════════ */

exports.get_quote_settings = async (req, res) => {
  try {
    let settings = await QuoteSettings.findOne().lean();
    if (!settings) {
      settings = await QuoteSettings.create({});
      settings = settings.toObject();
    }
    return res.json({ status: 'success', data: settings });
  } catch (err) {
    console.error('[get_quote_settings]', err.message);
    return res.status(500).json({ status: 'error', message: 'Failed to fetch quote settings' });
  }
};
