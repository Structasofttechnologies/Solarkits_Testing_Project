/**
 * franchisee.subtypes.handler.js
 *
 * Admin CRUD for Franchisee Subtypes (franchisee_subtypes collection).
 * Enables Admin to configure franchisee categories dynamically without code changes.
 *
 * Pattern: { status: "success"|"error", data, message }
 */

const { FranchiseeSubtype, ResellerPlan, Reseller } = require('../models/india_solarshop_db');
const { logAudit } = require('../utils/audit.service');

const slugify = (str) =>
  str
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');

// ─── 1. LIST SUBTYPES ──────────────────────────────────────────────────────────
/**
 * GET /admin-api/store-management/subtypes/list
 */
const list_subtypes = async (req, res) => {
  try {
    const { active_only, search } = req.query;
    const query = { deleted_at: null };

    if (active_only === 'true') {
      query.is_active = true;
    }

    if (search && search.trim()) {
      query.$or = [
        { name: { $regex: search.trim(), $options: 'i' } },
        { slug: { $regex: search.trim(), $options: 'i' } },
        { description: { $regex: search.trim(), $options: 'i' } },
      ];
    }

    const rows = await FranchiseeSubtype.find(query)
      .sort({ sort_order: 1, name: 1 })
      .lean();

    // Attach store count & plan count for admin context
    const subtypeIds = rows.map((r) => r._id);
    const [planCounts, storeCounts] = await Promise.all([
      ResellerPlan.aggregate([
        { $match: { franchisee_subtype_id: { $in: subtypeIds }, deleted_at: null } },
        { $group: { _id: '$franchisee_subtype_id', count: { $sum: 1 } } },
      ]),
      Reseller.aggregate([
        { $match: { franchisee_subtype_id: { $in: subtypeIds }, deleted_at: null } },
        { $group: { _id: '$franchisee_subtype_id', count: { $sum: 1 } } },
      ]),
    ]);

    const planCountMap = {};
    planCounts.forEach((p) => {
      planCountMap[p._id.toString()] = p.count;
    });

    const storeCountMap = {};
    storeCounts.forEach((s) => {
      storeCountMap[s._id.toString()] = s.count;
    });

    const enhancedRows = rows.map((r) => ({
      ...r,
      plan_count: planCountMap[r._id.toString()] || 0,
      store_count: storeCountMap[r._id.toString()] || 0,
    }));

    return res.status(200).json({
      status: 'success',
      data: enhancedRows,
      count: enhancedRows.length,
    });
  } catch (error) {
    console.error('[franchisee.subtypes] list_subtypes error:', error);
    return res.status(500).json({ status: 'error', message: 'Failed to fetch franchisee subtypes' });
  }
};

// ─── 2. ADD SUBTYPE ───────────────────────────────────────────────────────────
/**
 * POST /admin-api/store-management/subtypes/add
 */
const add_subtype = async (req, res) => {
  try {
    const { name, description, is_active, sort_order } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ status: 'error', message: 'Name is required' });
    }

    const slug = slugify(name);

    const existing = await FranchiseeSubtype.findOne({
      $or: [{ slug }, { name: { $regex: new RegExp(`^${name.trim()}$`, 'i') } }],
      deleted_at: null,
    });

    if (existing) {
      return res.status(409).json({
        status: 'error',
        message: `Franchisee subtype "${existing.name}" already exists`,
      });
    }

    const doc = await FranchiseeSubtype.create({
      name: name.trim(),
      slug,
      description: description ? description.trim() : null,
      is_active: is_active !== undefined ? Boolean(is_active) : true,
      sort_order: sort_order != null ? Number(sort_order) : 0,
      created_by: req.user?.id || null,
      updated_by: req.user?.id || null,
    });

    await logAudit({
      actor_type: 'cms_user',
      actor_id: req.user?.id,
      action: 'FRANCHISEE_SUBTYPE_CREATE',
      entity_type: 'franchisee_subtypes',
      entity_id: doc._id,
      after_snapshot: doc.toObject(),
      req,
    });

    return res.status(201).json({
      status: 'success',
      message: 'Franchisee subtype created successfully',
      data: doc,
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ status: 'error', message: 'Subtype name or slug already exists' });
    }
    console.error('[franchisee.subtypes] add_subtype error:', error);
    return res.status(500).json({ status: 'error', message: 'Failed to create franchisee subtype' });
  }
};

// ─── 3. UPDATE SUBTYPE ────────────────────────────────────────────────────────
/**
 * PUT /admin-api/store-management/subtypes/update
 */
const update_subtype = async (req, res) => {
  try {
    const id = req.body.id || req.body._id;
    const { name, description, is_active, sort_order } = req.body;

    if (!id) {
      return res.status(400).json({ status: 'error', message: 'Subtype ID is required' });
    }

    const doc = await FranchiseeSubtype.findOne({ _id: id, deleted_at: null });
    if (!doc) {
      return res.status(404).json({ status: 'error', message: 'Franchisee subtype not found' });
    }

    const before_snapshot = doc.toObject();

    if (name && name.trim()) {
      const slug = slugify(name);
      const duplicate = await FranchiseeSubtype.findOne({
        _id: { $ne: id },
        $or: [{ slug }, { name: { $regex: new RegExp(`^${name.trim()}$`, 'i') } }],
        deleted_at: null,
      });

      if (duplicate) {
        return res.status(409).json({
          status: 'error',
          message: `Another subtype named "${duplicate.name}" already exists`,
        });
      }

      doc.name = name.trim();
      doc.slug = slug;
    }

    if (description !== undefined) {
      doc.description = description ? description.trim() : null;
    }
    if (is_active !== undefined) {
      doc.is_active = Boolean(is_active);
    }
    if (sort_order !== undefined) {
      doc.sort_order = Number(sort_order);
    }

    doc.updated_by = req.user?.id || null;
    await doc.save();

    await logAudit({
      actor_type: 'cms_user',
      actor_id: req.user?.id,
      action: 'FRANCHISEE_SUBTYPE_UPDATE',
      entity_type: 'franchisee_subtypes',
      entity_id: doc._id,
      before_snapshot,
      after_snapshot: doc.toObject(),
      req,
    });

    return res.status(200).json({
      status: 'success',
      message: 'Franchisee subtype updated successfully',
      data: doc,
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ status: 'error', message: 'Subtype name or slug already exists' });
    }
    console.error('[franchisee.subtypes] update_subtype error:', error);
    return res.status(500).json({ status: 'error', message: 'Failed to update franchisee subtype' });
  }
};

// ─── 4. TOGGLE STATUS ─────────────────────────────────────────────────────────
/**
 * PUT /admin-api/store-management/subtypes/toggle-status
 */
const toggle_subtype_status = async (req, res) => {
  try {
    const id = req.body.id || req.body._id;
    if (!id) {
      return res.status(400).json({ status: 'error', message: 'Subtype ID is required' });
    }

    const doc = await FranchiseeSubtype.findOne({ _id: id, deleted_at: null });
    if (!doc) {
      return res.status(404).json({ status: 'error', message: 'Franchisee subtype not found' });
    }

    const before_snapshot = doc.toObject();
    doc.is_active = !doc.is_active;
    doc.updated_by = req.user?.id || null;
    await doc.save();

    await logAudit({
      actor_type: 'cms_user',
      actor_id: req.user?.id,
      action: 'FRANCHISEE_SUBTYPE_TOGGLE_STATUS',
      entity_type: 'franchisee_subtypes',
      entity_id: doc._id,
      before_snapshot,
      after_snapshot: doc.toObject(),
      req,
    });

    return res.status(200).json({
      status: 'success',
      message: `Subtype status updated to ${doc.is_active ? 'active' : 'inactive'}`,
      data: { id: doc._id, is_active: doc.is_active },
    });
  } catch (error) {
    console.error('[franchisee.subtypes] toggle_subtype_status error:', error);
    return res.status(500).json({ status: 'error', message: 'Failed to toggle subtype status' });
  }
};

// ─── 5. DELETE SUBTYPE (SOFT) ─────────────────────────────────────────────────
/**
 * DELETE /admin-api/store-management/subtypes/delete
 */
const delete_subtype = async (req, res) => {
  try {
    const id = req.query.id || req.body.id || req.body._id;
    if (!id) {
      return res.status(400).json({ status: 'error', message: 'Subtype ID is required' });
    }

    const doc = await FranchiseeSubtype.findOne({ _id: id, deleted_at: null });
    if (!doc) {
      return res.status(404).json({ status: 'error', message: 'Franchisee subtype not found' });
    }

    // Safety check: check if any active plans or stores use this subtype
    const [inUsePlans, inUseStores] = await Promise.all([
      ResellerPlan.countDocuments({ franchisee_subtype_id: id, deleted_at: null }),
      Reseller.countDocuments({ franchisee_subtype_id: id, deleted_at: null }),
    ]);

    if (inUsePlans > 0 || inUseStores > 0) {
      return res.status(400).json({
        status: 'error',
        message: `Cannot delete: subtype is currently assigned to ${inUsePlans} plan(s) and ${inUseStores} store(s). Please reassign them first or deactivate this subtype instead.`,
      });
    }

    const before_snapshot = doc.toObject();
    doc.deleted_at = new Date();
    doc.is_active = false;
    doc.updated_by = req.user?.id || null;
    await doc.save();

    await logAudit({
      actor_type: 'cms_user',
      actor_id: req.user?.id,
      action: 'FRANCHISEE_SUBTYPE_DELETE',
      entity_type: 'franchisee_subtypes',
      entity_id: doc._id,
      before_snapshot,
      req,
    });

    return res.status(200).json({
      status: 'success',
      message: 'Franchisee subtype deleted successfully',
      data: { id: doc._id },
    });
  } catch (error) {
    console.error('[franchisee.subtypes] delete_subtype error:', error);
    return res.status(500).json({ status: 'error', message: 'Failed to delete franchisee subtype' });
  }
};

module.exports = {
  list_subtypes,
  add_subtype,
  update_subtype,
  toggle_subtype_status,
  delete_subtype,
};
