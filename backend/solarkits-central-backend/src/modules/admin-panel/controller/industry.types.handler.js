/**
 * industry.types.handler.js
 *
 * Admin CRUD for industry types (sys_industry_types).
 * Phase 1 — Reseller Management System
 * Phase 2 — Industry Content Management (user assignments, extended fields)
 */

const mongoose = require('mongoose');
const { IndustryType, ProjectTypeIndustryMap, ProjectSubcategory, UserIndustryMap } = require('../models/core_db');

// ─── Helper: generate slug from name ─────────────────────────────────────────
const slugify = (str) =>
  str
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');

// ─── 1. LIST ──────────────────────────────────────────────────────────────────
const list_industry_types = async (req, res) => {
  try {
    const { active_only, for_resellers, for_epc } = req.query;
    const query = { deleted_at: null };
    if (active_only === 'true') query.is_active = true;
    if (for_resellers === 'true') query.for_resellers = true;
    if (for_epc === 'true') query.for_epc = true;

    const rows = await IndustryType.find(query).sort({ sort_order: 1, name: 1 }).lean();

    const data = rows.map((r) => ({
      id:            r._id,
      name:          r.name,
      code:          r.code,
      slug:          r.slug,
      description:   r.description,
      icon:          r.icon,
      cover_image:   r.cover_image,
      thumbnail:     r.thumbnail,
      sort_order:    r.sort_order,
      is_active:     r.is_active,
      for_resellers: r.for_resellers,
      for_epc:       r.for_epc,
      created_at:    r.created_at,
    }));

    return res.json({ status: 'success', data });
  } catch (error) {
    console.error('[industry.types] list_industry_types error:', error);
    return res.status(500).json({ status: 'error', message: 'Internal server error' });
  }
};

// ─── PUBLIC LIST (no auth — for reseller/EPC frontend) ────────────────────────
const list_industry_types_public = async (req, res) => {
  try {
    const { audience } = req.query; // 'reseller' | 'epc'
    const query = { deleted_at: null, is_active: true };
    if (audience === 'reseller') query.for_resellers = true;
    if (audience === 'epc')      query.for_epc = true;

    const rows = await IndustryType.find(query)
      .select('name code slug description icon cover_image thumbnail sort_order is_active for_resellers for_epc')
      .sort({ sort_order: 1, name: 1 })
      .lean();

    return res.json({
      status: 'success',
      data: rows.map(r => ({
        ...r,
        id: r._id,
        is_active: r.is_active !== false,
      })),
    });
  } catch (error) {
    console.error('[industry.types] list_industry_types_public error:', error);
    return res.status(500).json({ status: 'error', message: 'Internal server error' });
  }
};

// ─── 2. ADD ───────────────────────────────────────────────────────────────────
const add_industry_type = async (req, res) => {
  try {
    const { name, code, description, sort_order, icon, cover_image, thumbnail, for_resellers, for_epc } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ status: 'error', message: 'name is required' });
    }

    const slug = slugify(name);

    // Check for duplicate
    const orFilters = [
      { slug },
      { name: { $regex: new RegExp(`^${name.trim()}$`, 'i') } },
    ];
    if (code && code.trim()) {
      orFilters.push({ code: code.trim().toUpperCase() });
    }

    const existing = await IndustryType.findOne({ $or: orFilters, deleted_at: null });
    if (existing) {
      return res.status(409).json({
        status: 'error',
        message: `An industry type with this name/code already exists: "${existing.name}"`,
      });
    }

    const doc = await IndustryType.create({
      name:          name.trim(),
      code:          code ? code.trim().toUpperCase() : null,
      slug,
      description:   description ? description.trim() : null,
      icon:          icon || null,
      cover_image:   cover_image || null,
      thumbnail:     thumbnail || null,
      sort_order:    sort_order != null ? Number(sort_order) : 0,
      for_resellers: for_resellers !== false,
      for_epc:       for_epc !== false,
      created_by:    req.user?.id || null,
    });

    return res.status(201).json({
      status: 'success',
      data: { id: doc._id, name: doc.name, code: doc.code, slug: doc.slug, description: doc.description, sort_order: doc.sort_order, is_active: doc.is_active, for_resellers: doc.for_resellers, for_epc: doc.for_epc },
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ status: 'error', message: 'Industry type name, code, or slug already exists' });
    }
    console.error('[industry.types] add_industry_type error:', error);
    return res.status(500).json({ status: 'error', message: 'Internal server error' });
  }
};

// ─── 3. UPDATE ────────────────────────────────────────────────────────────────
const update_industry_type = async (req, res) => {
  try {
    const { id, name, code, description, sort_order, icon, cover_image, thumbnail, for_resellers, for_epc } = req.body;

    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ status: 'error', message: 'Valid id is required' });
    }

    const doc = await IndustryType.findOne({ _id: id, deleted_at: null });
    if (!doc) {
      return res.status(404).json({ status: 'error', message: 'Industry type not found' });
    }

    const updateData = {};

    if (name && name.trim()) {
      const newSlug = slugify(name.trim());
      const orFilters = [
        { slug: newSlug },
        { name: { $regex: new RegExp(`^${name.trim()}$`, 'i') } },
      ];
      if (code && code.trim()) orFilters.push({ code: code.trim().toUpperCase() });

      const conflict = await IndustryType.findOne({ _id: { $ne: id }, $or: orFilters, deleted_at: null });
      if (conflict) {
        return res.status(409).json({ status: 'error', message: `Another industry type already has this name: "${conflict.name}"` });
      }
      updateData.name = name.trim();
      updateData.slug = newSlug;
    }

    if (code !== undefined)         updateData.code          = code ? code.trim().toUpperCase() : null;
    if (description !== undefined)  updateData.description   = description ? description.trim() : null;
    if (sort_order != null)         updateData.sort_order    = Number(sort_order);
    if (icon !== undefined)         updateData.icon          = icon || null;
    if (cover_image !== undefined)  updateData.cover_image   = cover_image || null;
    if (thumbnail !== undefined)    updateData.thumbnail     = thumbnail || null;
    if (for_resellers !== undefined) updateData.for_resellers = !!for_resellers;
    if (for_epc !== undefined)      updateData.for_epc       = !!for_epc;

    const result = await IndustryType.findByIdAndUpdate(id, { $set: updateData }, { new: true }).lean();

    return res.json({
      status: 'success',
      data: { id: result._id, name: result.name, code: result.code, slug: result.slug, description: result.description, sort_order: result.sort_order, is_active: result.is_active, for_resellers: result.for_resellers, for_epc: result.for_epc },
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ status: 'error', message: 'Industry type name, code, or slug already exists' });
    }
    console.error('[industry.types] update_industry_type error:', error);
    return res.status(500).json({ status: 'error', message: 'Internal server error' });
  }
};

// ─── 4. ACTIVATE / DEACTIVATE ─────────────────────────────────────────────────
const toggle_industry_type_status = async (req, res) => {
  try {
    const { id, is_active } = req.body;

    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ status: 'error', message: 'Valid id is required' });
    }
    if (typeof is_active !== 'boolean') {
      return res.status(400).json({ status: 'error', message: 'is_active must be a boolean' });
    }

    const doc = await IndustryType.findOne({ _id: id, deleted_at: null });
    if (!doc) {
      return res.status(404).json({ status: 'error', message: 'Industry type not found' });
    }

    doc.is_active = is_active;
    await doc.save();

    return res.json({
      status:  'success',
      message: `Industry type "${doc.name}" has been ${is_active ? 'activated' : 'deactivated'}`,
      data:    { id: doc._id, is_active: doc.is_active },
    });
  } catch (error) {
    console.error('[industry.types] toggle_industry_type_status error:', error);
    return res.status(500).json({ status: 'error', message: 'Internal server error' });
  }
};

// ─── 5. SOFT DELETE ───────────────────────────────────────────────────────────
const delete_industry_type = async (req, res) => {
  try {
    const { id } = req.body;

    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ status: 'error', message: 'Valid id is required' });
    }

    const doc = await IndustryType.findOne({ _id: id, deleted_at: null });
    if (!doc) {
      return res.status(404).json({ status: 'error', message: 'Industry type not found' });
    }

    // Block deletion if active mappings exist
    const activeMappingCount = await ProjectTypeIndustryMap.countDocuments({
      industry_type_id: id,
      deleted_at: null,
      is_active: true,
    });

    if (activeMappingCount > 0) {
      return res.status(409).json({
        status:  'error',
        message: `Cannot delete: "${doc.name}" is mapped to ${activeMappingCount} active project type(s). Remove the mappings first.`,
      });
    }

    // Block if active user assignments exist
    const userAssignCount = await UserIndustryMap.countDocuments({
      industry_type_id: id,
      approval_status: 'APPROVED',
      deleted_at: null,
    });

    if (userAssignCount > 0) {
      return res.status(409).json({
        status:  'error',
        message: `Cannot delete: "${doc.name}" has ${userAssignCount} active user assignment(s). Revoke them first.`,
      });
    }

    doc.deleted_at = new Date();
    doc.is_active  = false;
    await doc.save();

    return res.json({
      status:  'success',
      message: `Industry type "${doc.name}" has been deleted`,
    });
  } catch (error) {
    console.error('[industry.types] delete_industry_type error:', error);
    return res.status(500).json({ status: 'error', message: 'Internal server error' });
  }
};

// ─── 6. MAP: Link a project subcategory → industry type ──────────────────────
const map_industry_to_subcategory = async (req, res) => {
  try {
    const { project_subcategory_id, industry_type_id } = req.body;

    if (!project_subcategory_id || !industry_type_id) {
      return res.status(400).json({ status: 'error', message: 'project_subcategory_id and industry_type_id are required' });
    }

    const [subcat, industryType] = await Promise.all([
      ProjectSubcategory.findOne({ _id: project_subcategory_id, deleted_at: null }).lean(),
      IndustryType.findOne({ _id: industry_type_id, deleted_at: null, is_active: true }).lean(),
    ]);

    if (!subcat) return res.status(404).json({ status: 'error', message: 'Project subcategory not found' });
    if (!industryType) return res.status(404).json({ status: 'error', message: 'Industry type not found or inactive' });

    const existing = await ProjectTypeIndustryMap.findOne({ project_subcategory_id, industry_type_id, deleted_at: null });
    if (existing) {
      return res.status(409).json({ status: 'error', message: 'This mapping already exists' });
    }

    const map = await ProjectTypeIndustryMap.create({ project_subcategory_id, industry_type_id });

    return res.status(201).json({
      status: 'success',
      data:   { map_id: map._id, project_subcategory_id: map.project_subcategory_id, industry_type_id: map.industry_type_id },
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ status: 'error', message: 'Mapping already exists' });
    }
    console.error('[industry.types] map_industry_to_subcategory error:', error);
    return res.status(500).json({ status: 'error', message: 'Internal server error' });
  }
};

// ─── 7. UNMAP ─────────────────────────────────────────────────────────────────
const unmap_industry_from_subcategory = async (req, res) => {
  try {
    const { map_id } = req.body;

    if (!map_id || !mongoose.Types.ObjectId.isValid(map_id)) {
      return res.status(400).json({ status: 'error', message: 'Valid map_id is required' });
    }

    const map = await ProjectTypeIndustryMap.findOne({ _id: map_id, deleted_at: null });
    if (!map) return res.status(404).json({ status: 'error', message: 'Mapping not found' });

    map.deleted_at = new Date();
    map.is_active  = false;
    await map.save();

    return res.json({ status: 'success', message: 'Mapping removed' });
  } catch (error) {
    console.error('[industry.types] unmap_industry_from_subcategory error:', error);
    return res.status(500).json({ status: 'error', message: 'Internal server error' });
  }
};

// ─── 8. GET MAPPINGS ─────────────────────────────────────────────────────────
const get_industry_mappings_for_subcategory = async (req, res) => {
  try {
    const { project_subcategory_id } = req.query;

    if (!project_subcategory_id) {
      return res.status(400).json({ status: 'error', message: 'project_subcategory_id is required' });
    }

    const maps = await ProjectTypeIndustryMap.find({ project_subcategory_id, deleted_at: null })
      .populate('industry_type_id', 'name slug description is_active')
      .lean();

    const data = maps
      .filter((m) => m.industry_type_id)
      .map((m) => ({
        map_id:       m._id,
        industry_type: {
          id:          m.industry_type_id._id,
          name:        m.industry_type_id.name,
          slug:        m.industry_type_id.slug,
          description: m.industry_type_id.description,
          is_active:   m.industry_type_id.is_active,
        },
        is_active: m.is_active,
      }));

    return res.json({ status: 'success', data });
  } catch (error) {
    console.error('[industry.types] get_industry_mappings_for_subcategory error:', error);
    return res.status(500).json({ status: 'error', message: 'Internal server error' });
  }
};

// ─── 9. ASSIGN USER → INDUSTRY ────────────────────────────────────────────────
const assign_user_to_industry = async (req, res) => {
  try {
    const { user_type, user_id, industry_type_id, approval_status = 'APPROVED' } = req.body;

    if (!user_type || !user_id || !industry_type_id) {
      return res.status(400).json({ status: 'error', message: 'user_type, user_id, industry_type_id are required' });
    }
    if (!['RESELLER','EPC'].includes(user_type)) {
      return res.status(400).json({ status: 'error', message: 'user_type must be RESELLER or EPC' });
    }
    if (!mongoose.Types.ObjectId.isValid(user_id) || !mongoose.Types.ObjectId.isValid(industry_type_id)) {
      return res.status(400).json({ status: 'error', message: 'Invalid user_id or industry_type_id' });
    }

    const industry = await IndustryType.findOne({ _id: industry_type_id, deleted_at: null, is_active: true }).lean();
    if (!industry) return res.status(404).json({ status: 'error', message: 'Industry type not found or inactive' });

    const map = await UserIndustryMap.findOneAndUpdate(
      { user_type, user_id, industry_type_id },
      {
        $set: {
          approval_status,
          assigned_by:   req.user?.id,
          assigned_date: new Date(),
          deleted_at:    null,
          revoked_by:    null,
          revoked_at:    null,
        },
      },
      { upsert: true, new: true }
    );

    return res.status(201).json({
      status: 'success',
      message: `User assigned to industry "${industry.name}"`,
      data: { id: map._id, user_type, user_id, industry_type_id, approval_status: map.approval_status },
    });
  } catch (error) {
    console.error('[industry.types] assign_user_to_industry error:', error);
    return res.status(500).json({ status: 'error', message: 'Internal server error' });
  }
};

// ─── 10. REVOKE USER → INDUSTRY ───────────────────────────────────────────────
const revoke_user_from_industry = async (req, res) => {
  try {
    const { user_type, user_id, industry_type_id } = req.body;

    if (!user_type || !user_id || !industry_type_id) {
      return res.status(400).json({ status: 'error', message: 'user_type, user_id, industry_type_id are required' });
    }

    const map = await UserIndustryMap.findOne({ user_type, user_id, industry_type_id, deleted_at: null });
    if (!map) return res.status(404).json({ status: 'error', message: 'Assignment not found' });

    map.approval_status = 'REVOKED';
    map.revoked_by      = req.user?.id;
    map.revoked_at      = new Date();
    await map.save();

    return res.json({ status: 'success', message: 'User industry assignment revoked' });
  } catch (error) {
    console.error('[industry.types] revoke_user_from_industry error:', error);
    return res.status(500).json({ status: 'error', message: 'Internal server error' });
  }
};

// ─── 11. LIST USER INDUSTRY ASSIGNMENTS ───────────────────────────────────────
const list_user_industry_assignments = async (req, res) => {
  try {
    const { user_type, user_id, industry_type_id, approval_status } = req.query;

    const filter = { deleted_at: null };
    if (user_type)         filter.user_type = user_type;
    if (user_id && mongoose.Types.ObjectId.isValid(user_id)) filter.user_id = user_id;
    if (industry_type_id && mongoose.Types.ObjectId.isValid(industry_type_id)) filter.industry_type_id = industry_type_id;
    if (approval_status)   filter.approval_status = approval_status;

    const maps = await UserIndustryMap.find(filter)
      .populate('industry_type_id', 'name slug icon is_active')
      .sort({ assigned_date: -1 })
      .lean();

    return res.json({
      status: 'success',
      data: maps.map(m => ({ ...m, id: m._id })),
    });
  } catch (error) {
    console.error('[industry.types] list_user_industry_assignments error:', error);
    return res.status(500).json({ status: 'error', message: 'Internal server error' });
  }
};

module.exports = {
  list_industry_types,
  list_industry_types_public,
  add_industry_type,
  update_industry_type,
  toggle_industry_type_status,
  delete_industry_type,
  map_industry_to_subcategory,
  unmap_industry_from_subcategory,
  get_industry_mappings_for_subcategory,
  assign_user_to_industry,
  revoke_user_from_industry,
  list_user_industry_assignments,
};

