/**
 * franchisee.validation.middleware.js
 *
 * Express middleware for Franchisee PO validation.
 * Runs before create-draft and submit endpoints to enforce:
 *   1. Franchisee account eligibility
 *   2. Per-item MOQ + increment + max validation
 *
 * Usage:
 *   router.post('/draft', check_auth, validatePoEligibility, validatePoItems, create_draft)
 */

const { Reseller, ResellerPlanSubscription } = require('../models/india_solarshop_db');
const { resolveEffectivePoSettings, validatePoItems } = require('../services/franchisee.moq.service');

/**
 * Middleware: Check franchisee eligibility for PO ordering.
 * Attaches resolved po_settings and plan_id to req for downstream use.
 */
async function validatePoEligibility(req, res, next) {
  try {
    const { franchisee_id } = req.body;
    if (!franchisee_id) {
      return res.status(400).json({ status: 'error', message: 'franchisee_id is required' });
    }

    const franchisee = await Reseller.findOne({ _id: franchisee_id, deleted_at: null }).lean();
    if (!franchisee) {
      return res.status(404).json({ status: 'error', message: 'Franchisee account not found' });
    }
    if (franchisee.activation_status !== 'active') {
      return res.status(403).json({ status: 'error', message: 'Franchisee account is not active. Contact admin.' });
    }
    const validLifecycleStatuses = ['kyc_verified', 'agreement_pending', 'territory_pending', 'active'];
    if (!validLifecycleStatuses.includes(franchisee.reseller_lifecycle_status)) {
      return res.status(403).json({
        status: 'error',
        message: `Franchisee onboarding is incomplete (status: ${franchisee.reseller_lifecycle_status}). PO ordering is not available.`,
      });
    }

    const subscription = await ResellerPlanSubscription.findOne({
      reseller_id: franchisee_id,
      status: 'active',
    })
      .sort({ start_date: -1 })
      .lean();

    if (!subscription) {
      return res.status(403).json({ status: 'error', message: 'No active plan subscription found. Please subscribe to a plan first.' });
    }

    const po_settings = await resolveEffectivePoSettings(subscription.plan_id);
    if (!po_settings || !po_settings.po_enabled) {
      return res.status(403).json({
        status: 'error',
        message: `PO ordering is not enabled for your current plan (${subscription.plan_id}).`,
      });
    }

    // Attach resolved data to request for handlers
    req.resolved_plan_id  = subscription.plan_id;
    req.resolved_po_settings = po_settings;
    req.resolved_franchisee  = franchisee;

    return next();
  } catch (error) {
    console.error('[franchisee.validation] validatePoEligibility error:', error);
    return res.status(500).json({ status: 'error', message: 'Internal server error during eligibility check' });
  }
}

/**
 * Middleware: Validate all items in the PO request.
 * Requires req.resolved_plan_id and req.resolved_po_settings to be set by validatePoEligibility.
 */
async function validatePoItemsMiddleware(req, res, next) {
  try {
    const { items } = req.body;
    const plan_id    = req.resolved_plan_id;
    const po_settings = req.resolved_po_settings;

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ status: 'error', message: 'PO must contain at least one item.' });
    }

    if (po_settings.max_line_items && items.length > po_settings.max_line_items) {
      return res.status(400).json({
        status: 'error',
        message: `Your plan allows a maximum of ${po_settings.max_line_items} line items per PO.`,
      });
    }

    const results = await validatePoItems(items, plan_id, po_settings);
    const failures = results.filter((r) => !r.valid);

    if (failures.length > 0) {
      return res.status(400).json({
        status: 'error',
        message: 'PO validation failed',
        errors: failures.map((f) => ({ item_index: f.item_index, item_name: f.item_name, reason: f.reason })),
      });
    }

    // Attach validated results for the handler
    req.validated_items = results;
    return next();
  } catch (error) {
    console.error('[franchisee.validation] validatePoItemsMiddleware error:', error);
    return res.status(500).json({ status: 'error', message: 'Internal server error during item validation' });
  }
}

module.exports = {
  validatePoEligibility,
  validatePoItemsMiddleware,
};
