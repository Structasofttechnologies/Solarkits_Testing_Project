/**
 * reseller.checkout.service.js
 *
 * Dual-Mode Cart and Checkout Engine Service.
 * Phase 6 — Reseller Management System
 *
 * Commercial Modes:
 *   - Commission Mode: EPC buyer purchases at standard price. Reseller earns commission.
 *   - Dealer Mode: Reseller purchases at wholesale dealer margin discount. Generates dealer tax invoice.
 */

const { Reseller, ResellerPlanSubscription } = require('../models/india_solarshop_db');
const { validateResellerTerritoryAccess } = require('./territory.validator');
const { evaluateResellerProductAuthorization } = require('./product.authorization.service');

const DEFAULT_DEALER_DISCOUNT_PERCENT = 8; // 8% wholesale dealer discount
const DEFAULT_COMMISSION_PERCENT = 5;      // 5% default reseller commission

/**
 * Validate server-side checkout guards for reseller/EPC buyer transactions.
 */
async function validateResellerCheckoutGuards({ resellerId, location = {}, items = [] }) {
  const errors = [];

  const reseller = await Reseller.findOne({ _id: resellerId, deleted_at: null }).lean();
  if (!reseller) {
    return { is_valid: false, errors: ['Reseller account not found'] };
  }

  if (!reseller.is_active || reseller.activation_status !== 'active') {
    errors.push(`Reseller account is not active (status: ${reseller.activation_status})`);
  }

  if (reseller.kyc_status !== 'verified') {
    errors.push(`Reseller KYC is not verified (status: ${reseller.kyc_status})`);
  }

  // 1. Territory Guard Check
  const territoryCheck = await validateResellerTerritoryAccess(resellerId, location);
  if (!territoryCheck.is_allowed) {
    errors.push(`Territory authorization check failed: ${territoryCheck.reason}`);
  }

  // 2. Product Authorization Guard Check (all items)
  for (const item of items) {
    const authCheck = await evaluateResellerProductAuthorization(resellerId, item);
    if (!authCheck.is_authorized) {
      errors.push(`Product authorization failed for item: ${authCheck.reason}`);
    }
  }

  return {
    is_valid: errors.length === 0,
    errors,
    reseller,
    territory: territoryCheck.territory,
  };
}

/**
 * Calculate dual-mode pricing breakdown for cart/order.
 */
async function calculateDualModeOrderPricing({ resellerId, basePrice, sellingPrice }) {
  const reseller = await Reseller.findById(resellerId).lean();
  if (!reseller) throw new Error('Reseller not found');

  const bPrice = Number(basePrice) || 0;
  const sPrice = Number(sellingPrice) || 0;

  if (reseller.commercial_mode === 'dealer') {
    // Dealer Mode: Apply Wholesale Margin Discount
    const discountRate = DEFAULT_DEALER_DISCOUNT_PERCENT;
    const dealerDiscount = Math.round((sPrice * discountRate) / 100);
    const finalPrice = Math.max(bPrice, sPrice - dealerDiscount);

    return {
      commercial_mode:      'dealer',
      reseller_id:          reseller._id,
      base_price:           bPrice,
      original_selling:     sPrice,
      final_selling_price:  finalPrice,
      dealer_discount:      dealerDiscount,
      dealer_discount_rate: discountRate,
      commission_rate:      0,
      commission_amount:    0,
      dealer_invoice:       true,
    };
  }

  // Commission Mode: Standard Selling Price + Commission Calculation
  const commissionRate = DEFAULT_COMMISSION_PERCENT;
  const commissionAmount = Math.round((sPrice * commissionRate) / 100);

  return {
    commercial_mode:      'commission',
    reseller_id:          reseller._id,
    base_price:           bPrice,
    original_selling:     sPrice,
    final_selling_price:  sPrice,
    dealer_discount:      0,
    dealer_discount_rate: 0,
    commission_rate:      commissionRate,
    commission_amount:    commissionAmount,
    dealer_invoice:       false,
  };
}

module.exports = {
  validateResellerCheckoutGuards,
  calculateDualModeOrderPricing,
};
