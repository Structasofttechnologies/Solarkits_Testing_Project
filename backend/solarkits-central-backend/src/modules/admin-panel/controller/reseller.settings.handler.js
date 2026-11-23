/**
 * reseller.settings.handler.js
 *
 * Handler for reading and updating platform-wide Solarshop settings.
 * Phase R1 — Roles, Permissions, Audit & Config Masters Reconciliation
 *
 * Access:
 *   GET  /admin-api/reseller-mgmt/settings  — Read current platform config
 *   PUT  /admin-api/reseller-mgmt/settings  — Update platform config (Super Admin only)
 *
 * All updates are audit-logged. Financial/policy changes (settlement trigger,
 * exclusivity mode) require a reason field.
 *
 * Pattern: { status: 'success'|'error', data, message }
 */

const { SolarShopSettings } = require('../models/india_solarshop_db');
const { logAudit } = require('../utils/audit.service');

const getDefaultAgreementTypes = (defaultTemplate) => [
  {
    type_key: 'district_franchise_agreement',
    name: 'District Franchise Agreement',
    store_type_slug: 'district-franchise-store',
    store_type_name: 'District Franchise Store',
    title: 'SolarKits Authorized District Franchise Partner Agreement',
    version: '2.0',
    default_duration_years: 2,
    document_url: null,
    document_name: null,
    is_active: true,
  },
  {
    type_key: 'flagship_agreement',
    name: 'Flagship Store Agreement',
    store_type_slug: 'flagship-store',
    store_type_name: 'Flagship store',
    title: 'SolarKits Flagship Franchise Partner & Institutional Agreement',
    version: '2.0',
    default_duration_years: 3,
    document_url: null,
    document_name: null,
    is_active: true,
  },
  {
    type_key: 'company_store_agreement',
    name: 'Company Store Operational Agreement',
    store_type_slug: 'company-store',
    store_type_name: 'Company Store',
    title: 'SolarKits Company Store Operational Governance & MoU',
    version: '1.0',
    default_duration_years: 1,
    document_url: null,
    document_name: null,
    is_active: true,
  },
];

// ── 1. GET PLATFORM SETTINGS ───────────────────────────────────────────────────
/**
 * GET /admin-api/reseller-mgmt/settings
 * Returns the current platform settings document.
 * If no document exists yet, returns the schema defaults.
 */
const get_platform_settings = async (req, res) => {
  try {
    let settings = await SolarShopSettings.findOne().lean();

    // If no document exists yet, return an in-memory object with all defaults.
    // A PUT request will create it on first write.
    if (!settings) {
      settings = {
        enable_checkout_timer:              true,
        checkout_timer_duration:            20,
        combokit_bulk_panels_limit:         30,
        gst_rate:                           13.8,
        territory_exclusivity_mode:         'strict',
        settlement_trigger:                 'delivery_plus_window',
        settlement_return_window_days:      7,
        platform_commission_pct:            0,
        pgw_charge_pct:                     2,
        epc_gst_reverify_policy:            'onboarding_only',
        epc_gst_reverify_days:              90,
        activation_require_gst_verified:    true,
        activation_require_kyc_approved:    true,
        activation_require_signed_agreement:false,
        activation_require_active_plan:     false,
        activation_require_territory_assigned:true,
        activation_require_product_auth:    true,
        franchise_agreement_title:          'SolarKits Authorized Franchise Partner Agreement',
        franchise_agreement_version:        '2.0',
        franchise_agreement_template:       null,
        franchise_agreement_types:          getDefaultAgreementTypes(null),
        flagship_excluded_districts:        [],
        _is_default: true, // Flag to indicate no DB document exists yet
      };
    } else if (!settings.franchise_agreement_types || settings.franchise_agreement_types.length === 0) {
      settings.franchise_agreement_types = getDefaultAgreementTypes(settings.franchise_agreement_template);
    }

    return res.status(200).json({
      status: 'success',
      data:   settings,
      message: 'Platform settings retrieved successfully',
    });
  } catch (error) {
    console.error('[PlatformSettings] get_platform_settings error:', error.message);
    return res.status(500).json({ status: 'error', message: 'Failed to retrieve platform settings' });
  }
};

// ── 2. UPDATE PLATFORM SETTINGS ───────────────────────────────────────────────
/**
 * PUT /admin-api/reseller-mgmt/settings
 * Body: Partial or full settings document.
 *
 * High-risk changes (settlement_trigger, territory_exclusivity_mode,
 * platform_commission_pct) require a `reason` field.
 */
const POLICY_FIELDS_REQUIRING_REASON = [
  'settlement_trigger',
  'territory_exclusivity_mode',
  'platform_commission_pct',
  'pgw_charge_pct',
  'activation_require_signed_agreement',
  'activation_require_active_plan',
];

// Whitelist of fields that CAN be updated via this endpoint.
const ALLOWED_UPDATE_FIELDS = [
  'enable_checkout_timer',
  'checkout_timer_duration',
  'combokit_bulk_panels_limit',
  'gst_rate',
  'territory_exclusivity_mode',
  'settlement_trigger',
  'settlement_return_window_days',
  'platform_commission_pct',
  'pgw_charge_pct',
  'epc_gst_reverify_policy',
  'epc_gst_reverify_days',
  'activation_require_gst_verified',
  'activation_require_kyc_approved',
  'activation_require_signed_agreement',
  'activation_require_active_plan',
  'activation_require_territory_assigned',
  'activation_require_product_auth',
  'franchise_agreement_title',
  'franchise_agreement_version',
  'franchise_agreement_template',
  'franchise_agreement_types',
  'flagship_excluded_districts',
];

const update_platform_settings = async (req, res) => {
  try {
    const { reason, ...body } = req.body || {};

    // Build whitelist-only update object
    const updates = {};
    for (const field of ALLOWED_UPDATE_FIELDS) {
      if (body[field] !== undefined) {
        updates[field] = body[field];
      }
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ status: 'error', message: 'No valid settings fields provided' });
    }

    // Check if any policy-sensitive field is being changed
    const sensitiveFieldsChanged = POLICY_FIELDS_REQUIRING_REASON.filter(f => updates[f] !== undefined);
    if (sensitiveFieldsChanged.length > 0 && (!reason || !reason.trim())) {
      return res.status(400).json({
        status:  'error',
        message: `A "reason" is required when changing policy fields: ${sensitiveFieldsChanged.join(', ')}`,
      });
    }

    updates.updated_at = new Date();

    // Upsert — create the settings document on first write
    const before = await SolarShopSettings.findOne().lean();
    const settings = await SolarShopSettings.findOneAndUpdate(
      {},
      { $set: updates },
      { upsert: true, new: true, lean: true }
    );

    await logAudit({
      actor_type:     'cms_user',
      actor_id:       req.user?.id || null,
      action:         'PLATFORM_SETTINGS_UPDATE',
      entity_type:    'solarshop_settings',
      entity_id:      settings._id,
      before_snapshot: before,
      after_snapshot:  updates,
      reason:          reason || null,
      metadata: {
        changed_fields: Object.keys(updates).filter(f => f !== 'updated_at'),
        sensitive_fields_changed: sensitiveFieldsChanged,
      },
      req,
    });

    return res.status(200).json({
      status:  'success',
      data:    settings,
      message: 'Platform settings updated successfully',
    });
  } catch (error) {
    console.error('[PlatformSettings] update_platform_settings error:', error.message);
    return res.status(500).json({ status: 'error', message: 'Failed to update platform settings' });
  }
};

/**
 * 3. UPLOAD AGREEMENT TYPE DOCUMENT TEMPLATE (PDF)
 * POST /admin-api/reseller-mgmt/settings/agreement-types/upload
 */
const upload_agreement_type_document = async (req, res) => {
  try {
    let final_document_url = null;
    let final_document_name = null;

    if (req.files && Array.isArray(req.files) && req.files.length > 0) {
      const pdfFile = req.files.find(f => f.fieldname === 'agreement_pdf' || f.fieldname === 'document' || f.fieldname === 'file') || req.files[0];
      if (pdfFile) {
        final_document_url = pdfFile.path;
        final_document_name = pdfFile.originalname;
      }
    } else if (req.file) {
      final_document_url = req.file.path;
      final_document_name = req.file.originalname;
    }

    if (!final_document_url) {
      return res.status(400).json({ status: 'error', message: 'No agreement PDF file provided' });
    }

    return res.status(200).json({
      status: 'success',
      message: 'Agreement document uploaded successfully',
      data: {
        document_url: final_document_url,
        document_name: final_document_name,
      },
    });
  } catch (error) {
    console.error('[PlatformSettings] upload_agreement_type_document error:', error);
    return res.status(500).json({ status: 'error', message: error.message || 'File upload failed' });
  }
};

module.exports = {
  get_platform_settings,
  update_platform_settings,
  upload_agreement_type_document,
};
