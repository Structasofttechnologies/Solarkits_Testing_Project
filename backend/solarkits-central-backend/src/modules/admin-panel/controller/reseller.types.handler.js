/**
 * reseller.types.handler.js
 *
 * Admin CRUD for reseller types (reseller_types collection).
 * Phase 1 — Reseller Management System
 *
 * All handlers follow the existing project.types.handler.js pattern:
 *   { status: "success"|"error", data, message }
 */

const mongoose = require('mongoose');
const { ResellerType } = require('../models/india_solarshop_db');

// ─── Helper: generate slug from name ─────────────────────────────────────────
const slugify = (str) =>
  str
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');

// ─── 1. LIST ──────────────────────────────────────────────────────────────────
/**
 * GET /admin-api/resellers/types/list
 * Returns all non-deleted reseller types.
 * Optional query: ?commercial_mode=commission|dealer, ?active_only=true
 */
const list_reseller_types = async (req, res) => {
  try {
    const { commercial_mode, active_only } = req.query;
    const query = { deleted_at: null };

    if (commercial_mode && ['commission', 'dealer'].includes(commercial_mode)) {
      query.commercial_mode = commercial_mode;
    }
    if (active_only === 'true') query.is_active = true;

    const rows = await ResellerType.find(query).sort({ sort_order: 1, name: 1 }).lean();

    const data = rows.map((r) => ({
      id:              r._id,
      name:            r.name,
      slug:            r.slug,
      commercial_mode: r.commercial_mode,
      description:     r.description,
      sort_order:      r.sort_order,
      is_active:       r.is_active,
      created_at:      r.created_at,
    }));

    return res.json({ status: 'success', data });
  } catch (error) {
    console.error('[reseller.types] list_reseller_types error:', error);
    return res.status(500).json({ status: 'error', message: 'Internal server error' });
  }
};

// ─── 2. ADD ───────────────────────────────────────────────────────────────────
/**
 * POST /admin-api/resellers/types/add
 * Body: { name, commercial_mode: "commission"|"dealer", description?, sort_order? }
 */
const add_reseller_type = async (req, res) => {
  try {
    const { name, commercial_mode, description, sort_order } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ status: 'error', message: 'name is required' });
    }
    if (!commercial_mode || !['commission', 'dealer'].includes(commercial_mode)) {
      return res.status(400).json({
        status:  'error',
        message: 'commercial_mode is required and must be "commission" or "dealer"',
      });
    }

    const slug = slugify(name);

    // Duplicate check
    const existing = await ResellerType.findOne({
      $or: [
        { slug },
        { name: { $regex: new RegExp(`^${name.trim()}$`, 'i') } },
      ],
      deleted_at: null,
    });
    if (existing) {
      return res.status(409).json({
        status:  'error',
        message: `A reseller type with this name already exists: "${existing.name}"`,
      });
    }

    const doc = await ResellerType.create({
      name:            name.trim(),
      slug,
      commercial_mode,
      description:     description ? description.trim() : null,
      sort_order:      sort_order != null ? Number(sort_order) : 0,
      created_by:      req.user?.id || null,
      updated_by:      req.user?.id || null,
    });

    return res.status(201).json({
      status: 'success',
      data: {
        id:              doc._id,
        name:            doc.name,
        slug:            doc.slug,
        commercial_mode: doc.commercial_mode,
        description:     doc.description,
        sort_order:      doc.sort_order,
        is_active:       doc.is_active,
      },
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ status: 'error', message: 'Reseller type name or slug already exists' });
    }
    console.error('[reseller.types] add_reseller_type error:', error);
    return res.status(500).json({ status: 'error', message: 'Internal server error' });
  }
};

// ─── 3. UPDATE ────────────────────────────────────────────────────────────────
/**
 * PUT /admin-api/resellers/types/update
 * Body: { id, name?, commercial_mode?, description?, sort_order? }
 *
 * NOTE: commercial_mode change is allowed only if no resellers are using this type.
 * (Checked in Phase 2 when the resellers collection exists; currently permissive.)
 */
const update_reseller_type = async (req, res) => {
  try {
    const { id, name, commercial_mode, description, sort_order } = req.body;

    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ status: 'error', message: 'Valid id is required' });
    }

    const doc = await ResellerType.findOne({ _id: id, deleted_at: null });
    if (!doc) {
      return res.status(404).json({ status: 'error', message: 'Reseller type not found' });
    }

    const updateData = {};

    if (name && name.trim()) {
      const newSlug = slugify(name.trim());

      const conflict = await ResellerType.findOne({
        _id: { $ne: id },
        $or: [
          { slug: newSlug },
          { name: { $regex: new RegExp(`^${name.trim()}$`, 'i') } },
        ],
        deleted_at: null,
      });
      if (conflict) {
        return res.status(409).json({
          status:  'error',
          message: `Another reseller type already has this name: "${conflict.name}"`,
        });
      }

      updateData.name = name.trim();
      updateData.slug = newSlug;
    }

    if (commercial_mode && ['commission', 'dealer'].includes(commercial_mode)) {
      updateData.commercial_mode = commercial_mode;
    }
    if (description !== undefined) updateData.description = description ? description.trim() : null;
    if (sort_order != null) updateData.sort_order = Number(sort_order);
    updateData.updated_by = req.user?.id || null;

    const result = await ResellerType.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true }
    ).lean();

    return res.json({
      status: 'success',
      data: {
        id:              result._id,
        name:            result.name,
        slug:            result.slug,
        commercial_mode: result.commercial_mode,
        description:     result.description,
        sort_order:      result.sort_order,
        is_active:       result.is_active,
      },
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ status: 'error', message: 'Reseller type name or slug already exists' });
    }
    console.error('[reseller.types] update_reseller_type error:', error);
    return res.status(500).json({ status: 'error', message: 'Internal server error' });
  }
};

// ─── 4. TOGGLE STATUS ────────────────────────────────────────────────────────
/**
 * PUT /admin-api/resellers/types/toggle-status
 * Body: { id, is_active: Boolean }
 */
const toggle_reseller_type_status = async (req, res) => {
  try {
    const { id, is_active } = req.body;

    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ status: 'error', message: 'Valid id is required' });
    }
    if (typeof is_active !== 'boolean') {
      return res.status(400).json({ status: 'error', message: 'is_active must be a boolean' });
    }

    const doc = await ResellerType.findOne({ _id: id, deleted_at: null });
    if (!doc) {
      return res.status(404).json({ status: 'error', message: 'Reseller type not found' });
    }

    doc.is_active  = is_active;
    doc.updated_by = req.user?.id || null;
    await doc.save();

    return res.json({
      status:  'success',
      message: `Reseller type "${doc.name}" has been ${is_active ? 'activated' : 'deactivated'}`,
      data:    { id: doc._id, is_active: doc.is_active },
    });
  } catch (error) {
    console.error('[reseller.types] toggle_reseller_type_status error:', error);
    return res.status(500).json({ status: 'error', message: 'Internal server error' });
  }
};

// ─── 5. SOFT DELETE ───────────────────────────────────────────────────────────
/**
 * DELETE /admin-api/resellers/types/delete
 * Body: { id }
 *
 * Phase 2 note: When the resellers collection is live, add a check here to
 * block deletion if any reseller references this type.
 */
const delete_reseller_type = async (req, res) => {
  try {
    const { id } = req.body;

    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ status: 'error', message: 'Valid id is required' });
    }

    const doc = await ResellerType.findOne({ _id: id, deleted_at: null });
    if (!doc) {
      return res.status(404).json({ status: 'error', message: 'Reseller type not found' });
    }

    // Phase 2 hook: Check if any reseller is using this type
    // const resellerCount = await Reseller.countDocuments({ reseller_type_id: id, deleted_at: null });
    // if (resellerCount > 0) { return 409 }

    doc.deleted_at = new Date();
    doc.is_active  = false;
    doc.updated_by = req.user?.id || null;
    await doc.save();

    return res.json({
      status:  'success',
      message: `Reseller type "${doc.name}" has been deleted`,
    });
  } catch (error) {
    console.error('[reseller.types] delete_reseller_type error:', error);
    return res.status(500).json({ status: 'error', message: 'Internal server error' });
  }
};

module.exports = {
  list_reseller_types,
  add_reseller_type,
  update_reseller_type,
  toggle_reseller_type_status,
  delete_reseller_type,
};
