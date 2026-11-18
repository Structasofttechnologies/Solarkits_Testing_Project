/**
 * franchise.form.fields.handler.js
 *
 * Handler for configuring dynamic Apply Franchise Form fields.
 * Stored inside `SolarShopSettings.franchise_form_fields` to avoid MongoDB Atlas collection quota.
 */

const { SolarShopSettings } = require('../models/india_solarshop_db');
const { DEFAULT_FRANCHISE_FORM_FIELDS } = require('../constants/franchiseFormFields.default');
const { logAudit } = require('../utils/audit.service');

const getSettingsDoc = async () => {
  let doc = await SolarShopSettings.findOne({});
  if (!doc) {
    doc = await SolarShopSettings.create({});
  }
  if (!doc.franchise_form_fields || doc.franchise_form_fields.length === 0) {
    doc.franchise_form_fields = DEFAULT_FRANCHISE_FORM_FIELDS;
    await doc.save();
  }
  return doc;
};

// ── 1. GET ADMIN FORM FIELDS CONFIG ──────────────────────────────────────────
const get_admin_franchise_form_fields = async (req, res) => {
  try {
    const doc = await getSettingsDoc();
    const fields = (doc.franchise_form_fields || []).map((f) => (f.toObject ? f.toObject() : f));

    // Sort by sort_order
    fields.sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));

    const totalCount = fields.length;
    const activeCount = fields.filter((f) => f.is_active !== false).length;
    const compulsoryCount = fields.filter((f) => f.is_active !== false && f.is_required === true).length;
    const inactiveCount = fields.filter((f) => f.is_active === false).length;

    return res.status(200).json({
      status: 'success',
      data: fields,
      summary: {
        total: totalCount,
        active: activeCount,
        compulsory: compulsoryCount,
        inactive: inactiveCount,
      },
      message: 'Franchise form fields retrieved successfully',
    });
  } catch (error) {
    console.error('[franchise.form.fields] get_admin error:', error);
    return res.status(500).json({
      status: 'error',
      message: error.message || 'Failed to retrieve franchise form configuration',
    });
  }
};

// ── 2. UPDATE ADMIN FORM FIELDS CONFIG ───────────────────────────────────────
const update_admin_franchise_form_fields = async (req, res) => {
  try {
    const { fields } = req.body;
    if (!Array.isArray(fields) || fields.length === 0) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid fields payload. An array of field objects is required.',
      });
    }

    const doc = await getSettingsDoc();
    const beforeList = JSON.parse(JSON.stringify(doc.franchise_form_fields || []));

    // Map and sanitize fields
    const sanitizedFields = fields.map((item, index) => ({
      field_key: (item.field_key || `field_${index}`).trim(),
      label: (item.label || item.field_key || 'Untitled Field').trim(),
      placeholder: (item.placeholder || '').trim(),
      help_text: (item.help_text || '').trim(),
      field_type: item.field_type || 'text',
      is_required: Boolean(item.is_required),
      is_active: item.is_active !== undefined ? Boolean(item.is_active) : true,
      sort_order: Number.isFinite(item.sort_order) ? Number(item.sort_order) : index + 1,
      options: Array.isArray(item.options) ? item.options : [],
      updated_at: new Date(),
    }));

    doc.franchise_form_fields = sanitizedFields;
    await doc.save();

    // Audit log
    try {
      if (typeof logAudit === 'function') {
        await logAudit({
          user: req.user,
          action: 'UPDATE_FRANCHISE_FORM_FIELDS',
          module: 'FPO_SETTINGS',
          target_id: doc._id,
          before: beforeList,
          after: sanitizedFields,
          description: `Updated franchise application form configuration (${sanitizedFields.length} fields)`,
        });
      }
    } catch (auditErr) {
      console.warn('[franchise.form.fields] Audit logging error:', auditErr.message);
    }

    const activeCount = sanitizedFields.filter((f) => f.is_active !== false).length;
    const compulsoryCount = sanitizedFields.filter((f) => f.is_active !== false && f.is_required === true).length;
    const inactiveCount = sanitizedFields.filter((f) => f.is_active === false).length;

    return res.status(200).json({
      status: 'success',
      data: sanitizedFields,
      summary: {
        total: sanitizedFields.length,
        active: activeCount,
        compulsory: compulsoryCount,
        inactive: inactiveCount,
      },
      message: 'Franchise application form configuration updated successfully',
    });
  } catch (error) {
    console.error('[franchise.form.fields] update_admin error:', error);
    return res.status(500).json({
      status: 'error',
      message: error.message || 'Failed to update franchise form configuration',
    });
  }
};

// ── 3. RESET ADMIN FORM FIELDS TO FACTORY DEFAULTS ─────────────────────────
const reset_admin_franchise_form_fields = async (req, res) => {
  try {
    const doc = await getSettingsDoc();
    const beforeList = JSON.parse(JSON.stringify(doc.franchise_form_fields || []));

    doc.franchise_form_fields = DEFAULT_FRANCHISE_FORM_FIELDS;
    await doc.save();

    try {
      if (typeof logAudit === 'function') {
        await logAudit({
          user: req.user,
          action: 'RESET_FRANCHISE_FORM_FIELDS',
          module: 'FPO_SETTINGS',
          target_id: doc._id,
          before: beforeList,
          after: DEFAULT_FRANCHISE_FORM_FIELDS,
          description: 'Reset franchise application form fields to standard platform defaults',
        });
      }
    } catch (auditErr) {
      console.warn('[franchise.form.fields] Audit logging error:', auditErr.message);
    }

    return res.status(200).json({
      status: 'success',
      data: DEFAULT_FRANCHISE_FORM_FIELDS,
      message: 'Franchise form fields reset to platform defaults successfully',
    });
  } catch (error) {
    console.error('[franchise.form.fields] reset_admin error:', error);
    return res.status(500).json({
      status: 'error',
      message: error.message || 'Failed to reset franchise form configuration',
    });
  }
};

// ── 4. GET PUBLIC FORM FIELDS CONFIG (For Customer Storefront Modal) ────────
const get_public_franchise_form_fields = async (req, res) => {
  try {
    let doc = await SolarShopSettings.findOne({}).lean();
    let fields = (doc && Array.isArray(doc.franchise_form_fields) && doc.franchise_form_fields.length > 0)
      ? doc.franchise_form_fields
      : DEFAULT_FRANCHISE_FORM_FIELDS;

    // Filter only active fields and sort by sort_order
    const activeFields = fields
      .filter((f) => f.is_active !== false)
      .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))
      .map((f) => ({
        field_key: f.field_key,
        label: f.label,
        placeholder: f.placeholder,
        help_text: f.help_text,
        field_type: f.field_type,
        is_required: Boolean(f.is_required),
        sort_order: f.sort_order,
      }));

    return res.status(200).json({
      status: 'success',
      data: activeFields,
      message: 'Active franchise form fields retrieved successfully',
    });
  } catch (error) {
    console.error('[franchise.form.fields] get_public error:', error);
    // Return default active fields on error so client never breaks
    const fallbackActive = DEFAULT_FRANCHISE_FORM_FIELDS.filter((f) => f.is_active !== false);
    return res.status(200).json({
      status: 'success',
      data: fallbackActive,
      message: 'Default active franchise form fields (fallback mode)',
    });
  }
};

module.exports = {
  get_admin_franchise_form_fields,
  update_admin_franchise_form_fields,
  reset_admin_franchise_form_fields,
  get_public_franchise_form_fields,
};
