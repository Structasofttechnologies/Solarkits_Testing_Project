/**
 * reseller.activation.service.js
 *
 * Activation Readiness Calculator Service.
 * Evaluates whether a reseller meets all configurable platform criteria
 * defined in solarshop_settings before activation.
 *
 * Phase R2 — Reseller Management System
 */

const {
  SolarShopSettings,
  Reseller,
  ResellerKyc,
  ResellerPlanSubscription,
  ResellerTerritory,
  ResellerProductAuthorization,
  ResellerAgreement,
} = require('../models/india_solarshop_db');

/**
 * Evaluate activation readiness for a given reseller.
 *
 * @param {string|ObjectId} resellerId
 * @returns {Promise<object>} Detailed readiness checklist and overall eligibility boolean
 */
async function evaluateActivationReadiness(resellerId) {
  // Fetch platform settings or fall back to defaults
  let settings = await SolarShopSettings.findOne().lean();
  if (!settings) {
    settings = {
      activation_require_gst_verified: true,
      activation_require_kyc_approved: true,
      activation_require_signed_agreement: false,
      activation_require_active_plan: false,
      activation_require_territory_assigned: true,
      activation_require_product_auth: true,
    };
  }

  const [reseller, kyc, subscription, territories, productAuths, agreement] = await Promise.all([
    Reseller.findOne({ _id: resellerId, deleted_at: null }).lean(),
    ResellerKyc.findOne({ reseller_id: resellerId }).lean(),
    ResellerPlanSubscription.findOne({ reseller_id: resellerId, status: 'active' }).lean(),
    ResellerTerritory.find({ reseller_id: resellerId, status: 'active' }).lean(),
    ResellerProductAuthorization.find({ reseller_id: resellerId, status: 'active', is_authorized: true }).lean(),
    ResellerAgreement.findOne({ reseller_id: resellerId, status: 'signed' }).lean(),
  ]);

  if (!reseller) {
    throw new Error(`Reseller with ID "${resellerId}" not found`);
  }

  const checks = {
    gst_verified: {
      required: Boolean(settings.activation_require_gst_verified),
      passed: Boolean(reseller.gst_verified_at && reseller.gst_registration_status === 'ACTIVE'),
      details: reseller.gst_verified_at ? `Verified at ${reseller.gst_verified_at.toISOString()}` : 'GSTIN not verified',
    },
    kyc_approved: {
      required: Boolean(settings.activation_require_kyc_approved),
      passed: reseller.kyc_status === 'verified' && kyc?.status === 'verified',
      details: `Reseller KYC status: "${reseller.kyc_status}"`,
    },
    signed_agreement: {
      required: Boolean(settings.activation_require_signed_agreement),
      passed: Boolean(agreement || reseller.agreement_status === 'signed'),
      details: agreement ? `Signed on ${agreement.signed_at}` : 'No signed agreement found',
    },
    fee_payment_verified: {
      required: Boolean(settings.activation_require_active_plan),
      passed: Boolean(reseller.fee_payment_status === 'verified' || subscription?.status === 'active' || subscription?.payment_status === 'verified'),
      details: reseller.fee_payment_status === 'verified' ? `Verified (UTR: ${reseller.fee_payment_utr || 'Approved'})` : 'Payment receipt not yet approved',
    },
    active_plan: {
      required: Boolean(settings.activation_require_active_plan),
      passed: Boolean(subscription),
      details: subscription ? `Active plan ID ${subscription.plan_id}` : 'No active plan subscription',
    },
    territory_assigned: {
      required: Boolean(settings.activation_require_territory_assigned),
      passed: territories.length > 0,
      details: `${territories.length} active territory assignment(s)`,
    },
    product_authorized: {
      required: Boolean(settings.activation_require_product_auth),
      passed: productAuths.length > 0,
      details: `${productAuths.length} active product authorization rule(s)`,
    },
  };

  const missingRequirements = [];
  for (const [key, check] of Object.entries(checks)) {
    if (check.required && !check.passed) {
      missingRequirements.push(key);
    }
  }

  const isReady = missingRequirements.length === 0;

  return {
    reseller_id: reseller._id,
    current_activation_status: reseller.activation_status,
    current_lifecycle_status: reseller.reseller_lifecycle_status,
    is_ready_for_activation: isReady,
    missing_requirements: missingRequirements,
    checks,
  };
}

/**
 * Recompute lifecycle status based on current progress.
 */
function computeNextLifecycleStatus(reseller, kyc, agreement, territories) {
  if (reseller.activation_status === 'terminated') return 'terminated';
  if (reseller.activation_status === 'suspended') return 'suspended';
  if (reseller.activation_status === 'active') return 'active';

  if (!reseller.gst_verified_at) return 'gst_verification_pending';
  if (reseller.agreement_status !== 'signed' && !agreement) return 'agreement_pending';
  if (reseller.fee_payment_status === 'pending_payment') return 'fee_payment_pending';
  if (reseller.fee_payment_status === 'receipt_uploaded') return 'payment_verification_pending';
  if (reseller.kyc_status === 'draft') return 'kyc_pending';
  if (reseller.kyc_status === 'submitted') return 'kyc_submitted';
  if (reseller.kyc_status === 'resubmission_required') return 'kyc_resubmission_required';
  if (reseller.kyc_status === 'rejected') return 'kyc_rejected';

  if (reseller.kyc_status === 'verified') {
    if (!territories || territories.length === 0) return 'territory_pending';
    return 'active';
  }

  return reseller.reseller_lifecycle_status || 'draft';
}

module.exports = {
  evaluateActivationReadiness,
  computeNextLifecycleStatus,
};

