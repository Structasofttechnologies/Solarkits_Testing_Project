/**
 * epc.types.handler.js
 *
 * Admin controller for EPC Classification Types master management.
 * Defines and tracks EPC types (e.g. Government Contractor, Tender Bidder, New EPC, Experienced EPC).
 */

const mongoose = require('mongoose');
const { EpcType, EpcAccount, EpcSignupRequest, EPCLead } = require('../models/india_solarshop_db');
const { seedEpcTypesIfNeeded, DEFAULT_EPC_TYPES } = require('../../../utils/autoSeedEpcTypes');

const slugify = (str) =>
  (str || '')
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '_')
    .replace(/^_+|_+$/g, '');

// ─── 1. LIST EPC TYPES (Admin View with Live Usage Counts) ────────────────────
const list_epc_types = async (req, res) => {
  try {
    // Ensure defaults exist
    await seedEpcTypesIfNeeded();

    const { state_id, district_id, reseller_id } = req.query;

    // Resolve state/district names for multi-field geographic matching
    let stateDoc = null;
    let districtDoc = null;
    try {
      if (state_id && mongoose.Types.ObjectId.isValid(state_id)) {
        stateDoc = await mongoose.model('geolocation_level_1').findById(state_id).lean();
      }
      if (district_id && mongoose.Types.ObjectId.isValid(district_id)) {
        districtDoc = await mongoose.model('geolocation_level_2').findById(district_id).lean();
      }
    } catch (_) {}

    // Build geo conditions for EpcAccount
    const acctGeoConditions = [];
    if (state_id) {
      const sRegex = stateDoc?.name ? new RegExp(`^${stateDoc.name.trim()}$`, 'i') : null;
      const sConds = [
        { states: state_id },
        ...(mongoose.Types.ObjectId.isValid(state_id) ? [{ states: new mongoose.Types.ObjectId(state_id) }] : []),
        ...(sRegex ? [{ state_name: sRegex }] : []),
      ];
      acctGeoConditions.push({ $or: sConds });
    }
    if (district_id) {
      const dRegex = districtDoc?.name ? new RegExp(`^${districtDoc.name.trim()}$`, 'i') : null;
      const dConds = [
        { districts: district_id },
        ...(mongoose.Types.ObjectId.isValid(district_id) ? [{ districts: new mongoose.Types.ObjectId(district_id) }] : []),
        ...(dRegex ? [{ district_name: dRegex }] : []),
      ];
      acctGeoConditions.push({ $or: dConds });
    }
    if (reseller_id) {
      const rConds = [
        { primary_reseller_id: reseller_id },
        { onboarded_by_reseller_id: reseller_id },
        ...(mongoose.Types.ObjectId.isValid(reseller_id) ? [
          { primary_reseller_id: new mongoose.Types.ObjectId(reseller_id) },
          { onboarded_by_reseller_id: new mongoose.Types.ObjectId(reseller_id) },
        ] : []),
      ];
      acctGeoConditions.push({ $or: rConds });
    }

    // Build geo conditions for EPCLead
    const leadGeoConditions = [];
    if (state_id) {
      const sRegex = stateDoc?.name ? new RegExp(`^${stateDoc.name.trim()}$`, 'i') : null;
      const sConds = [
        { state_id: state_id },
        ...(mongoose.Types.ObjectId.isValid(state_id) ? [{ state_id: new mongoose.Types.ObjectId(state_id) }] : []),
        ...(sRegex ? [{ state_name: sRegex }] : []),
      ];
      leadGeoConditions.push({ $or: sConds });
    }
    if (district_id) {
      const dRegex = districtDoc?.name ? new RegExp(`^${districtDoc.name.trim()}$`, 'i') : null;
      const dConds = [
        { district_id: district_id },
        ...(mongoose.Types.ObjectId.isValid(district_id) ? [{ district_id: new mongoose.Types.ObjectId(district_id) }] : []),
        ...(dRegex ? [{ district_name: dRegex }] : []),
      ];
      leadGeoConditions.push({ $or: dConds });
    }
    if (reseller_id) {
      const rConds = [
        { assigned_franchisee_id: reseller_id },
        ...(mongoose.Types.ObjectId.isValid(reseller_id) ? [{ assigned_franchisee_id: new mongoose.Types.ObjectId(reseller_id) }] : []),
      ];
      leadGeoConditions.push({ $or: rConds });
    }

    // Build geo conditions for EpcSignupRequest
    const reqGeoConditions = [];
    if (state_id) {
      const sRegex = stateDoc?.name ? new RegExp(`^${stateDoc.name.trim()}$`, 'i') : null;
      reqGeoConditions.push({
        $or: [
          { state_id: state_id },
          ...(mongoose.Types.ObjectId.isValid(state_id) ? [{ state_id: new mongoose.Types.ObjectId(state_id) }] : []),
          ...(sRegex ? [{ state_name: sRegex }] : []),
        ],
      });
    }
    if (district_id) {
      const dRegex = districtDoc?.name ? new RegExp(`^${districtDoc.name.trim()}$`, 'i') : null;
      reqGeoConditions.push({
        $or: [
          { district_id: district_id },
          ...(mongoose.Types.ObjectId.isValid(district_id) ? [{ district_id: new mongoose.Types.ObjectId(district_id) }] : []),
          ...(dRegex ? [{ district_name: dRegex }] : []),
        ],
      });
    }
    if (reseller_id) {
      reqGeoConditions.push({
        $or: [
          { reseller_id: reseller_id },
          ...(mongoose.Types.ObjectId.isValid(reseller_id) ? [{ reseller_id: new mongoose.Types.ObjectId(reseller_id) }] : []),
        ],
      });
    }

    const types = await EpcType.find({ deleted_at: null })
      .sort({ display_order: 1, created_at: 1 })
      .lean();

    // Calculate usage counts across accounts, requests, and leads
    const typeNames = types.map((t) => t.name);
    const typeIds = types.map((t) => t._id);

    const acctMatch = {
      deleted_at: null,
      $or: [
        { epc_type: { $in: typeNames } },
        { epc_type_id: { $in: typeIds } },
      ],
      ...(acctGeoConditions.length > 0 ? { $and: acctGeoConditions } : {}),
    };

    const reqMatch = {
      $or: [
        { epc_type: { $in: typeNames } },
        { epc_type_id: { $in: typeIds } },
      ],
      ...(reqGeoConditions.length > 0 ? { $and: reqGeoConditions } : {}),
    };

    const leadMatch = {
      deleted_at: null,
      $or: [
        { epc_type: { $in: typeNames } },
        { epc_type_id: { $in: typeIds } },
      ],
      ...(leadGeoConditions.length > 0 ? { $and: leadGeoConditions } : {}),
    };

    const totalAcctQuery = {
      deleted_at: null,
      ...(acctGeoConditions.length > 0 ? { $and: acctGeoConditions } : {}),
    };

    const totalLeadQuery = {
      deleted_at: null,
      ...(leadGeoConditions.length > 0 ? { $and: leadGeoConditions } : {}),
    };

    const [accountCounts, requestCounts, leadCounts, totalAccounts, totalLeads] = await Promise.all([
      EpcAccount.aggregate([
        { $match: acctMatch },
        {
          $group: {
            _id: { $ifNull: ['$epc_type', '$epc_type_id'] },
            count: { $sum: 1 },
          },
        },
      ]),
      EpcSignupRequest.aggregate([
        { $match: reqMatch },
        {
          $group: {
            _id: { $ifNull: ['$epc_type', '$epc_type_id'] },
            count: { $sum: 1 },
          },
        },
      ]),
      EPCLead.aggregate([
        { $match: leadMatch },
        {
          $group: {
            _id: { $ifNull: ['$epc_type', '$epc_type_id'] },
            count: { $sum: 1 },
          },
        },
      ]),
      EpcAccount.countDocuments(totalAcctQuery),
      EPCLead.countDocuments(totalLeadQuery),
    ]);

    const acctMap = {};
    accountCounts.forEach((c) => {
      if (c._id) acctMap[String(c._id)] = c.count;
    });

    const reqMap = {};
    requestCounts.forEach((c) => {
      if (c._id) reqMap[String(c._id)] = c.count;
    });

    const leadMap = {};
    leadCounts.forEach((c) => {
      if (c._id) leadMap[String(c._id)] = c.count;
    });

    const enrichedTypes = types.map((t) => {
      const byNameAccounts = acctMap[t.name] || 0;
      const byIdAccounts = acctMap[String(t._id)] || 0;
      const accountsCount = Math.max(byNameAccounts, byIdAccounts);

      const byNameReqs = reqMap[t.name] || 0;
      const byIdReqs = reqMap[String(t._id)] || 0;
      const requestsCount = Math.max(byNameReqs, byIdReqs);

      const byNameLeads = leadMap[t.name] || 0;
      const byIdLeads = leadMap[String(t._id)] || 0;
      const leadsCount = Math.max(byNameLeads, byIdLeads);

      return {
        id: t._id,
        _id: t._id,
        name: t.name,
        code: t.code,
        description: t.description || '',
        badge_color: t.badge_color || 'blue',
        display_order: t.display_order || 0,
        is_active: t.is_active,
        accounts_count: accountsCount,
        requests_count: requestsCount,
        leads_count: leadsCount,
        total_associated_epcs: accountsCount + requestsCount,
        created_at: t.created_at,
        updated_at: t.updated_at,
      };
    });

    const totalClassified = enrichedTypes.reduce((acc, curr) => acc + curr.accounts_count, 0);

    return res.json({
      status: 'success',
      data: enrichedTypes,
      summary: {
        total_types: enrichedTypes.length,
        active_types: enrichedTypes.filter((t) => t.is_active).length,
        total_accounts: totalAccounts,
        total_leads: totalLeads,
        total_classified_epcs: totalClassified,
        total_unclassified_epcs: Math.max(0, totalAccounts - totalClassified),
      },
    });
  } catch (error) {
    console.error('[epc.types.handler] list_epc_types error:', error);
    return res.status(500).json({ status: 'error', message: 'Failed to fetch EPC types' });
  }
};

// ─── 2. LIST ACTIVE EPC TYPES (For Dropdowns) ─────────────────────────────────
const list_active_epc_types = async (req, res) => {
  try {
    await seedEpcTypesIfNeeded();

    const types = await EpcType.find({ is_active: true, deleted_at: null })
      .sort({ display_order: 1, created_at: 1 })
      .select('name code description badge_color display_order')
      .lean();

    const data = types.map((t) => ({
      id: t._id,
      _id: t._id,
      name: t.name,
      code: t.code,
      description: t.description,
      badge_color: t.badge_color,
    }));

    return res.json({ status: 'success', data });
  } catch (error) {
    console.error('[epc.types.handler] list_active_epc_types error:', error);
    // Graceful fallback to default types so dropdowns never fail
    return res.json({ status: 'success', data: DEFAULT_EPC_TYPES });
  }
};

// ─── 3. ADD NEW EPC TYPE ──────────────────────────────────────────────────────
const add_epc_type = async (req, res) => {
  try {
    const { name, code, description, badge_color, display_order, is_active } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ status: 'error', message: 'EPC Type Name is required' });
    }

    const cleanName = name.trim();
    const cleanCode = (code && code.trim()) ? slugify(code) : slugify(cleanName);

    // Duplicate check
    const existing = await EpcType.findOne({
      $or: [
        { name: new RegExp(`^${cleanName}$`, 'i') },
        { code: cleanCode },
      ],
      deleted_at: null,
    });

    if (existing) {
      return res.status(409).json({
        status: 'error',
        message: `An EPC Type with name "${cleanName}" or code "${cleanCode}" already exists.`,
      });
    }

    const maxOrderDoc = await EpcType.findOne({ deleted_at: null }).sort({ display_order: -1 }).lean();
    const nextOrder = (display_order !== undefined && display_order !== null && !isNaN(display_order))
      ? Number(display_order)
      : (maxOrderDoc?.display_order || 0) + 1;

    const created = await EpcType.create({
      name: cleanName,
      code: cleanCode,
      description: description ? description.trim() : '',
      badge_color: badge_color || 'blue',
      display_order: nextOrder,
      is_active: is_active !== false,
    });

    return res.status(201).json({
      status: 'success',
      message: 'EPC Type created successfully',
      data: created,
    });
  } catch (error) {
    console.error('[epc.types.handler] add_epc_type error:', error);
    return res.status(500).json({ status: 'error', message: error.message || 'Failed to create EPC Type' });
  }
};

// ─── 4. UPDATE EPC TYPE ───────────────────────────────────────────────────────
const update_epc_type = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, code, description, badge_color, display_order, is_active } = req.body;

    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ status: 'error', message: 'Valid EPC Type ID is required' });
    }

    const typeDoc = await EpcType.findOne({ _id: id, deleted_at: null });
    if (!typeDoc) {
      return res.status(404).json({ status: 'error', message: 'EPC Type not found' });
    }

    if (name && name.trim()) {
      const cleanName = name.trim();
      // Check collision
      const duplicate = await EpcType.findOne({
        _id: { $ne: id },
        name: new RegExp(`^${cleanName}$`, 'i'),
        deleted_at: null,
      });
      if (duplicate) {
        return res.status(409).json({ status: 'error', message: `EPC Type with name "${cleanName}" already exists.` });
      }
      typeDoc.name = cleanName;
    }

    if (code && code.trim()) {
      const cleanCode = slugify(code);
      const duplicateCode = await EpcType.findOne({
        _id: { $ne: id },
        code: cleanCode,
        deleted_at: null,
      });
      if (duplicateCode) {
        return res.status(409).json({ status: 'error', message: `EPC Type with code "${cleanCode}" already exists.` });
      }
      typeDoc.code = cleanCode;
    }

    if (description !== undefined) typeDoc.description = description ? description.trim() : '';
    if (badge_color !== undefined) typeDoc.badge_color = badge_color;
    if (display_order !== undefined && !isNaN(display_order)) typeDoc.display_order = Number(display_order);
    if (is_active !== undefined) typeDoc.is_active = Boolean(is_active);

    await typeDoc.save();

    return res.json({
      status: 'success',
      message: 'EPC Type updated successfully',
      data: typeDoc,
    });
  } catch (error) {
    console.error('[epc.types.handler] update_epc_type error:', error);
    return res.status(500).json({ status: 'error', message: error.message || 'Failed to update EPC Type' });
  }
};

// ─── 5. TOGGLE EPC TYPE STATUS ────────────────────────────────────────────────
const toggle_epc_type_status = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ status: 'error', message: 'Valid EPC Type ID is required' });
    }

    const typeDoc = await EpcType.findOne({ _id: id, deleted_at: null });
    if (!typeDoc) {
      return res.status(404).json({ status: 'error', message: 'EPC Type not found' });
    }

    typeDoc.is_active = !typeDoc.is_active;
    await typeDoc.save();

    return res.json({
      status: 'success',
      message: `EPC Type is now ${typeDoc.is_active ? 'Active' : 'Inactive'}`,
      data: typeDoc,
    });
  } catch (error) {
    console.error('[epc.types.handler] toggle_epc_type_status error:', error);
    return res.status(500).json({ status: 'error', message: 'Failed to toggle status' });
  }
};

// ─── 6. DELETE EPC TYPE (Soft Delete) ─────────────────────────────────────────
const delete_epc_type = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ status: 'error', message: 'Valid EPC Type ID is required' });
    }

    const typeDoc = await EpcType.findOne({ _id: id, deleted_at: null });
    if (!typeDoc) {
      return res.status(404).json({ status: 'error', message: 'EPC Type not found' });
    }

    typeDoc.deleted_at = new Date();
    typeDoc.is_active = false;
    await typeDoc.save();

    return res.json({
      status: 'success',
      message: 'EPC Type deleted successfully',
    });
  } catch (error) {
    console.error('[epc.types.handler] delete_epc_type error:', error);
    return res.status(500).json({ status: 'error', message: 'Failed to delete EPC Type' });
  }
};

module.exports = {
  list_epc_types,
  list_active_epc_types,
  add_epc_type,
  update_epc_type,
  toggle_epc_type_status,
  delete_epc_type,
};

