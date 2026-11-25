/**
 * reseller.territory.handler.js
 *
 * Admin controller for Reseller Territory assignments & coverage checks.
 * Phase 3 — Reseller Management System
 * Phase R3 — District Exclusivity, Atomic Assignments & Territory History Logging.
 *
 * Pattern: { status: "success"|"error", data, message }
 */

const mongoose = require('mongoose');
const { Reseller, ResellerTerritory, TerritoryAssignmentHistory } = require('../models/india_solarshop_db');
const { GeoLevel0, GeoLevel1, GeoLevel2 } = require('../models/geolocation_db');
const { CmsUser } = require('../models/user_db');
const { validateResellerTerritoryAccess, assignTerritoryAtomic, syncGstDerivedTerritoryForReseller } = require('../utils/territory.validator');
const { logAudit } = require('../utils/audit.service');

// ─── 1. LIST RESELLER TERRITORIES ─────────────────────────────────────────────
/**
 * GET /admin-api/resellers/:id/territories/list
 */
const list_reseller_territories = async (req, res) => {
  try {
    const { id } = req.params;
    const isAll = id === 'all';

    if (!isAll && (!id || !mongoose.Types.ObjectId.isValid(id))) {
      return res.status(400).json({ status: 'error', message: 'Valid reseller ID is required' });
    }

    if (isAll) {
      const resellers = await Reseller.find({ deleted_at: null }).select('_id address').lean();
      for (const r of resellers) {
        await syncGstDerivedTerritoryForReseller(r._id);
      }
    } else {
      await syncGstDerivedTerritoryForReseller(id);
    }

    const query = isAll ? { status: 'active' } : { reseller_id: id, status: 'active' };
    const rows = await ResellerTerritory.find(query)
      .sort({ created_at: -1 })
      .lean();

    const resellerIds  = [...new Set(rows.map((r) => r.reseller_id).filter(Boolean))];
    const countryIds   = [...new Set(rows.map((r) => r.country_id).filter(Boolean))];
    const stateIds     = [...new Set(rows.map((r) => r.state_id).filter(Boolean))];
    const districtIds  = [...new Set(rows.map((r) => r.district_id).filter(Boolean))];
    const assignedByIds= [...new Set(rows.map((r) => r.assigned_by).filter(Boolean))];

    const [resellers, countries, states, districts, users] = await Promise.all([
      resellerIds.length ? Reseller.find({ _id: { $in: resellerIds } }).select('business_name email mobile commercial_mode gst_number').lean() : [],
      countryIds.length ? GeoLevel0.find({ _id: { $in: countryIds } }).select('name iso2 currency').lean() : [],
      stateIds.length ? GeoLevel1.find({ _id: { $in: stateIds } }).select('name state_code').lean() : [],
      districtIds.length ? GeoLevel2.find({ _id: { $in: districtIds } }).select('name').lean() : [],
      assignedByIds.length ? CmsUser.find({ _id: { $in: assignedByIds } }).select('name email').lean() : [],
    ]);

    const rMap = resellers.reduce((acc, r) => { acc[r._id.toString()] = { id: r._id, business_name: r.business_name, email: r.email, mobile: r.mobile, commercial_mode: r.commercial_mode, gst_number: r.gst_number }; return acc; }, {});
    const cMap = countries.reduce((acc, c) => { acc[c._id.toString()] = { id: c._id, name: c.name, iso2: c.iso2, currency: c.currency }; return acc; }, {});
    const sMap = states.reduce((acc, s) => { acc[s._id.toString()] = { id: s._id, name: s.name, state_code: s.state_code }; return acc; }, {});
    const dMap = districts.reduce((acc, d) => { acc[d._id.toString()] = { id: d._id, name: d.name }; return acc; }, {});
    const uMap = users.reduce((acc, u) => { acc[u._id.toString()] = { id: u._id, name: u.name, email: u.email }; return acc; }, {});

    const data = rows.map((r) => {
      const reseller = r.reseller_id ? rMap[r.reseller_id.toString()] : null;
      const c = r.country_id ? cMap[r.country_id.toString()] : null;
      const s = r.state_id ? sMap[r.state_id.toString()] : null;
      const d = r.district_id ? dMap[r.district_id.toString()] : null;

      let location_name = "Pan-India / Country";
      if (r.territory_level === 'district' && d) location_name = d.name;
      else if (r.territory_level === 'state' && s) location_name = s.name;
      else if (c) location_name = c.name;

      return {
        id:                r._id,
        reseller_id:       r.reseller_id,
        reseller:          reseller,
        scope_level:       r.territory_level,
        territory_level:   r.territory_level,
        country:           c,
        state:             s,
        district:          d,
        location_name:     location_name,
        assignment_type:   r.assignment_type || 'primary',
        exclusivity_scope: r.exclusivity_scope || 'strict',
        is_exclusive:      r.is_exclusive !== false,
        source:            r.source,
        precedence_source: r.source,
        override_reason:   r.override_reason,
        assigned_by:       r.assigned_by ? uMap[r.assigned_by.toString()] : null,
        effective_date:    r.effective_date,
        expiry_date:       r.expiry_date,
        status:            r.status,
        created_at:        r.created_at,
      };
    });

    return res.json({ status: 'success', data });
  } catch (error) {
    console.error('[reseller.territory] list_reseller_territories error:', error);
    return res.status(500).json({ status: 'error', message: 'Internal server error' });
  }
};

// ─── 2. ASSIGN TERRITORY (Atomic Exclusivity Check) ───────────────────────────
/**
 * POST /admin-api/resellers/:id/territories/assign
 * Body: { territory_level, country_id, state_id?, district_id?, assignment_type?, exclusivity_scope?, is_exclusive?, source?, override_reason?, expiry_date? }
 */
const assign_territory = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      territory_level,
      country_id,
      state_id,
      district_id,
      assignment_type,
      exclusivity_scope,
      is_exclusive,
      allowed_project_type_ids,
      allowed_industry_type_ids,
      source,
      override_reason,
      expiry_date,
    } = req.body;

    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ status: 'error', message: 'Valid reseller ID is required' });
    }
    if (!territory_level || !['district', 'state', 'country'].includes(territory_level)) {
      return res.status(400).json({ status: 'error', message: 'territory_level must be district, state, or country' });
    }
    if (!country_id || !mongoose.Types.ObjectId.isValid(country_id)) {
      return res.status(400).json({ status: 'error', message: 'Valid country_id is required' });
    }
    if (territory_level !== 'country' && (!state_id || !mongoose.Types.ObjectId.isValid(state_id))) {
      return res.status(400).json({ status: 'error', message: 'Valid state_id is required for state/district level' });
    }
    if (territory_level === 'district' && (!district_id || !mongoose.Types.ObjectId.isValid(district_id))) {
      return res.status(400).json({ status: 'error', message: 'Valid district_id is required for district level' });
    }

    const result = await assignTerritoryAtomic({
      reseller_id: id,
      territory_level,
      country_id,
      state_id,
      district_id,
      assignment_type,
      exclusivity_scope,
      is_exclusive,
      allowed_project_type_ids,
      allowed_industry_type_ids,
      source,
      override_reason,
      expiry_date,
      actor_id: req.user?.id || null,
      req,
    });

    if (!result.success) {
      if (result.code === 'EXCLUSIVE_DISTRICT_CONFLICT') {
        return res.status(409).json({
          status: 'error',
          code: result.code,
          message: result.message,
          conflicting_reseller_id: result.conflicting_reseller_id,
          conflicting_reseller_name: result.conflicting_reseller_name,
        });
      }
      return res.status(400).json({ status: 'error', message: result.message });
    }

    return res.status(201).json({
      status: 'success',
      message: result.overridden_previous_assignment
        ? 'Territory assigned successfully via administrative override'
        : 'Territory assigned successfully',
      data: result.territory,
    });
  } catch (error) {
    console.error('[reseller.territory] assign_territory error:', error);
    return res.status(500).json({ status: 'error', message: 'Internal server error' });
  }
};

// ─── 3. DELETE/REMOVE TERRITORY ASSIGNMENT ────────────────────────────────────
/**
 * DELETE /admin-api/resellers/territories/:id
 */
const remove_territory = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ status: 'error', message: 'Valid territory assignment ID is required' });
    }

    const territory = await ResellerTerritory.findById(id);
    if (!territory) {
      return res.status(404).json({ status: 'error', message: 'Territory assignment not found' });
    }

    const beforeSnapshot = territory.toObject();
    territory.status = 'revoked';
    await territory.save();

    // Log to territory_assignment_history
    await TerritoryAssignmentHistory.create({
      territory_id: territory._id,
      reseller_id: territory.reseller_id,
      action: 'REVOKE',
      territory_level: territory.territory_level,
      country_id: territory.country_id,
      state_id: territory.state_id,
      district_id: territory.district_id,
      assignment_type: territory.assignment_type,
      exclusivity_scope: territory.exclusivity_scope,
      source: territory.source,
      reason: req.body?.reason || 'Manual removal by Admin',
      actor_id: req.user?.id || null,
      before_snapshot: beforeSnapshot,
      after_snapshot: territory.toObject(),
    });

    await logAudit({
      actor_type:  'cms_user',
      actor_id:    req.user?.id,
      action:      'REMOVE_RESELLER_TERRITORY',
      entity_type: 'reseller_territories',
      entity_id:   territory._id,
      before_snapshot: beforeSnapshot,
      after_snapshot: territory.toObject(),
      reason: req.body?.reason || null,
      req,
    });

    return res.json({ status: 'success', message: 'Territory assignment revoked successfully' });
  } catch (error) {
    console.error('[reseller.territory] remove_territory error:', error);
    return res.status(500).json({ status: 'error', message: 'Internal server error' });
  }
};

// ─── 4. GET TERRITORY ASSIGNMENT HISTORY ──────────────────────────────────────
/**
 * GET /admin-api/resellers/:id/territories/history
 */
const get_territory_history = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ status: 'error', message: 'Valid reseller ID is required' });
    }

    const history = await TerritoryAssignmentHistory.find({ reseller_id: id })
      .sort({ created_at: -1 })
      .lean();

    return res.json({ status: 'success', data: history });
  } catch (error) {
    console.error('[reseller.territory] get_territory_history error:', error);
    return res.status(500).json({ status: 'error', message: 'Internal server error' });
  }
};

// ─── 5. VALIDATE/CHECK TERRITORY ACCESS ───────────────────────────────────────
/**
 * POST /admin-api/resellers/:id/territories/validate
 * Body: { country_id, state_id, district_id }
 */
const validate_territory_access = async (req, res) => {
  try {
    const { id } = req.params;
    const { country_id, state_id, district_id } = req.body;

    const result = await validateResellerTerritoryAccess(id, {
      country_id,
      state_id,
      district_id,
    });

    return res.json({ status: 'success', data: result });
  } catch (error) {
    console.error('[reseller.territory] validate_territory_access error:', error);
    return res.status(500).json({ status: 'error', message: 'Internal server error' });
  }
};

module.exports = {
  list_reseller_territories,
  assign_territory,
  remove_territory,
  get_territory_history,
  validate_territory_access,
};
