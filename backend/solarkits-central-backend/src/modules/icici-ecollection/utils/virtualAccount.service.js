/**
 * ICICI Virtual Account Service
 *
 * Generates and resolves Virtual Account Numbers (VAN) for:
 * 1. EPC Buyers (solar-store)
 * 2. Franchise Partners (solarkits-reseller-portal)
 * 3. Specific Orders (EPC Order, PO Order, Loose Order)
 */

const EpcAccount = require('../../admin-panel/models/india_solarshop_db/EpcAccount.schema');
const Reseller = require('../../admin-panel/models/india_solarshop_db/resellers.schema');
const EpcOrder = require('../../admin-panel/models/india_solarshop_db/epc_orders.schema');
const FpoOrder = require('../../admin-panel/models/india_solarshop_db/fpo_orders.schema');

const CLIENT_CODE = process.env.ICICI_CLIENT_CODE || 'SLRK';
const ICICI_IFSC = process.env.ICICI_COLLECTION_IFSC || 'ICIC0000104';
const BENEFICIARY_NAME = process.env.ICICI_BENEFICIARY_NAME || 'SolarKits Technologies Pvt Ltd';

/**
 * Generates a standard Virtual Account Number for an EPC Buyer
 * E.g., SLRK + 10-digit phone = SLRK9876543210
 */
function getEpcVirtualAccount(buyerPhone) {
  const cleanPhone = String(buyerPhone || '').replace(/\D/g, '').slice(-10);
  return `${CLIENT_CODE}${cleanPhone}`;
}

/**
 * Generates a Virtual Account Number for a Franchise Partner
 */
function getFranchiseVirtualAccount(resellerPhone) {
  const cleanPhone = String(resellerPhone || '').replace(/\D/g, '').slice(-10);
  return `${CLIENT_CODE}F${cleanPhone.slice(-9)}`; // Keep within typical 15-18 char VAN limits
}

/**
 * Resolves a Virtual Account Number received from ICICI Bank
 * to determine the buyer entity, onboarding franchise partner, and active order.
 *
 * @param {string} van - e.g., "SLRK9876543210" or "ABC9834191192"
 * @returns {Promise<Object>} Resolution details
 */
async function resolveVirtualAccount(van) {
  const cleanVan = String(van || '').trim();

  // Strip known prefix if present
  let suffix = cleanVan;
  if (suffix.toUpperCase().startsWith(CLIENT_CODE.toUpperCase())) {
    suffix = suffix.slice(CLIENT_CODE.length);
  }

  const candidatePhone = suffix.replace(/\D/g, '').slice(-10);
  const isFranchiseVan = suffix.toUpperCase().startsWith('F');

  // 1. If Franchise VAN prefix 'F', resolve Franchise / Reseller first
  if (isFranchiseVan && candidatePhone.length >= 9) {
    const reseller = await Reseller.findOne({
      $or: [
        { mobile: new RegExp(candidatePhone.slice(-9) + '$') },
        { phone: new RegExp(candidatePhone.slice(-9) + '$') },
        { contact_phone: new RegExp(candidatePhone.slice(-9) + '$') }
      ],
      deleted_at: null
    });

    if (reseller) {
      const pendingPo = await FpoOrder.findOne({
        franchisee_id: reseller._id,
        status: { $in: ['APPROVED', 'AWAITING_PAYMENT', 'SUBMITTED', 'PENDING_APPROVAL', 'PARTIALLY_PAID'] }
      }).sort({ created_at: -1 });

      return {
        matched: true,
        type: 'reseller',
        reseller,
        pendingPo,
        targetResellerId: reseller._id,
        buyerName: reseller.business_name || reseller.name || 'Franchise Partner',
        buyerPhone: reseller.mobile || reseller.phone
      };
    }
  }

  // 2. Try finding matching EPC Account (by 10-digit mobile)
  if (candidatePhone.length === 10) {
    const epc = await EpcAccount.findOne({
      $or: [
        { whatsapp: candidatePhone },
        { registered_whatsapp: candidatePhone },
        { whatsapp: `+91${candidatePhone}` },
        { whatsapp: `91${candidatePhone}` }
      ],
      deleted_at: null
    }).populate('onboarded_by_reseller_id primary_reseller_id');

    if (epc) {
      // Find latest pending EPC order if any
      const pendingOrder = await EpcOrder.findOne({
        epc_id: epc._id,
        payment_status: { $in: ['pending', 'pending_verification'] }
      }).sort({ created_at: -1 });

      const franchisePartner = epc.onboarded_by_reseller_id || epc.primary_reseller_id || null;

      return {
        matched: true,
        type: 'epc_account',
        epc,
        franchisePartner,
        pendingOrder,
        targetResellerId: franchisePartner ? franchisePartner._id : null,
        targetEpcId: epc._id,
        buyerName: epc.name || epc.gstin_legal_name || 'EPC Buyer',
        buyerPhone: epc.whatsapp
      };
    }
  }

  // 3. Try finding matching Franchise / Reseller (by mobile) if not already matched
  if (candidatePhone.length >= 9) {
    const reseller = await Reseller.findOne({
      $or: [
        { mobile: new RegExp(candidatePhone.slice(-9) + '$') },
        { phone: new RegExp(candidatePhone.slice(-9) + '$') },
        { contact_phone: new RegExp(candidatePhone.slice(-9) + '$') }
      ],
      deleted_at: null
    });

    if (reseller) {
      const pendingPo = await FpoOrder.findOne({
        franchisee_id: reseller._id,
        status: { $in: ['APPROVED', 'AWAITING_PAYMENT', 'SUBMITTED', 'PENDING_APPROVAL', 'PARTIALLY_PAID'] }
      }).sort({ created_at: -1 });

      return {
        matched: true,
        type: 'reseller',
        reseller,
        pendingPo,
        targetResellerId: reseller._id,
        buyerName: reseller.business_name || reseller.name || 'Franchise Partner',
        buyerPhone: reseller.mobile || reseller.phone
      };
    }
  }

  // 3. Try finding matching Order Number directly (e.g. SLRK + ORD123)
  const epcOrderByNumber = await EpcOrder.findOne({
    order_number: new RegExp(suffix + '$', 'i')
  }).populate('epc_id reseller_id');

  if (epcOrderByNumber) {
    return {
      matched: true,
      type: 'epc_order',
      epc: epcOrderByNumber.epc_id,
      pendingOrder: epcOrderByNumber,
      franchisePartner: epcOrderByNumber.reseller_id,
      targetResellerId: epcOrderByNumber.reseller_id ? epcOrderByNumber.reseller_id._id : null,
      targetEpcId: epcOrderByNumber.epc_id ? epcOrderByNumber.epc_id._id : null,
      buyerName: epcOrderByNumber.epc_id ? epcOrderByNumber.epc_id.name : 'EPC Buyer'
    };
  }

  // Fallback: If not matched in database, we can still accept in UAT/sandbox if configured
  return {
    matched: false,
    type: 'unknown',
    buyerName: 'Unknown Remitter'
  };
}

module.exports = {
  CLIENT_CODE,
  ICICI_IFSC,
  BENEFICIARY_NAME,
  getEpcVirtualAccount,
  getFranchiseVirtualAccount,
  resolveVirtualAccount
};
