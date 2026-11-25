/**
 * epc.reseller.service.js
 *
 * Reseller-Onboarded EPC Buyer Pipeline Service & GSTIN Conflict Resolution Engine.
 * Phase 5 — Reseller Management System
 * Phase R4 — Canonical GSTIN Uniqueness, EpcResellerRelationships & Transfer Request Queue.
 *
 * Rules:
 *   1. Reseller must be active and KYC verified before onboarding EPC buyers.
 *   2. EPC buyer's operating location MUST fall within reseller's authorized territory.
 *   3. If GSTIN is provided, verify via Quick eKYC provider adapter.
 *   4. One GSTIN = One canonical EPC account. If GSTIN is already registered under another reseller,
 *      do not overwrite directly — create a pending EpcTransferRequest for Admin review.
 *   5. Track active & historical EPC-to-Reseller links via epc_reseller_relationships.
 */

const bcrypt = require('bcrypt');
const mongoose = require('mongoose');
const {
  Reseller,
  ResellerTerritory,
  EpcAccount,
  EpcSignupRequest,
  EpcResellerRelationship,
  EpcTransferRequest,
} = require('../models/india_solarshop_db');
const { validateEpcResellerTerritoryMatch } = require('./territory.validator');
const { performGstVerification } = require('../services/gst.verification.service');
const { logAudit } = require('./audit.service');

/**
 * Register a new EPC Buyer sub-account via Reseller onboarding.
 */
async function registerEpcByReseller(resellerId, epcData = {}) {
  const { name, email, whatsapp, password, company_name, state_id, district_id, reference_image, gstin, epc_type, epc_type_id } = epcData;

  // 1. Verify reseller active and KYC status
  const reseller = await Reseller.findOne({ _id: resellerId, deleted_at: null }).lean();
  if (!reseller) {
    throw new Error('Reseller account not found');
  }
  if (!reseller.is_active || reseller.activation_status !== 'active') {
    throw new Error('Reseller account is not active');
  }
  if (reseller.kyc_status !== 'verified') {
    throw new Error('Reseller KYC must be verified before onboarding EPC buyers');
  }

  // 2. Determine Reseller Plan & Strict Territory Scope
  const { ResellerPlanSubscription } = require('../models/india_solarshop_db');
  const sub = await ResellerPlanSubscription.findOne({
    reseller_id: resellerId,
    status: { $in: ['active', 'paid', 'approved', 'pending_payment'] },
  }).populate('plan_id').sort({ created_at: -1 }).lean();

  const activeTerritories = await ResellerTerritory.find({ reseller_id: resellerId, status: 'active' })
    .populate('state_id', 'name state_code')
    .populate('district_id', 'name')
    .lean();

  const plan = sub?.plan_id;
  const territoryLevel = plan?.territory_level || (activeTerritories.length > 0 ? activeTerritories[0].territory_level : 'district');

  let effStateId = state_id;
  let effDistrictId = district_id;

  if (!effStateId || !effDistrictId) {
    if (activeTerritories.length > 0) {
      if (!effStateId && activeTerritories[0].state_id) effStateId = activeTerritories[0].state_id?._id || activeTerritories[0].state_id;
      if (!effDistrictId && activeTerritories[0].district_id) effDistrictId = activeTerritories[0].district_id?._id || activeTerritories[0].district_id;
    } else if (reseller.address?.state_id) {
      if (!effStateId) effStateId = reseller.address.state_id;
      if (!effDistrictId) effDistrictId = reseller.address.district_id;
    }
  }

  // Strict District vs State Level Territory Boundaries
  const allowedStateIds = activeTerritories.map(t => String(t.state_id?._id || t.state_id)).filter(Boolean);
  const allowedDistrictIds = activeTerritories.map(t => String(t.district_id?._id || t.district_id)).filter(Boolean);
  const allowedStateNames = activeTerritories.map(t => t.state_id?.name).filter(Boolean);
  const allowedDistrictNames = activeTerritories.map(t => t.district_id?.name).filter(Boolean);

  if (allowedStateIds.length === 0 && reseller.address?.state_id) {
    allowedStateIds.push(String(reseller.address.state_id));
  }
  if (allowedDistrictIds.length === 0 && reseller.address?.district_id) {
    allowedDistrictIds.push(String(reseller.address.district_id));
  }

  if (territoryLevel === 'district') {
    if (effDistrictId && allowedDistrictIds.length > 0 && !allowedDistrictIds.includes(String(effDistrictId))) {
      throw new Error(`Territory Restriction: As a District Franchise Partner, you can only onboard EPC buyers located in your authorized District (${allowedDistrictNames.join(', ') || 'Authorized District'}).`);
    }
  } else if (territoryLevel === 'state') {
    if (effStateId && allowedStateIds.length > 0 && !allowedStateIds.includes(String(effStateId))) {
      throw new Error(`Territory Restriction: As a State Franchise Partner, you can only onboard EPC buyers located in your authorized State (${allowedStateNames.join(', ') || 'Authorized State'}).`);
    }
  }

  // 3. Optional GSTIN Verification & Strict EPC Exclusivity (Single Reseller Association)
  let cleanGstin = gstin ? gstin.trim().toUpperCase() : null;
  let gstResult = null;

  if (cleanGstin) {
    const { GeoLevel1 } = require('../models/geolocation_db');
    const epcStateCode = cleanGstin.substring(0, 2);
    const GST_STATE_CODE_MAP = {
      '01': 'Jammu & Kashmir', '02': 'Himachal Pradesh', '03': 'Punjab', '04': 'Chandigarh', '05': 'Uttarakhand', '06': 'Haryana', '07': 'Delhi', '08': 'Rajasthan', '09': 'Uttar Pradesh', '10': 'Bihar', '11': 'Sikkim', '12': 'Arunachal Pradesh', '13': 'Nagaland', '14': 'Manipur', '15': 'Mizoram', '16': 'Tripura', '17': 'Meghalaya', '18': 'Assam', '19': 'West Bengal', '20': 'Jharkhand', '21': 'Odisha', '22': 'Chhattisgarh', '23': 'Madhya Pradesh', '24': 'Gujarat', '25': 'Daman & Diu', '26': 'Dadra & Nagar Haveli', '27': 'Maharashtra', '28': 'Andhra Pradesh', '29': 'Karnataka', '30': 'Goa', '31': 'Lakshadweep', '32': 'Kerala', '33': 'Tamil Nadu', '34': 'Puducherry', '35': 'Andaman & Nicobar Islands', '36': 'Telangana', '37': 'Andhra Pradesh (New)', '38': 'Ladakh'
    };
    const gstStateName = GST_STATE_CODE_MAP[epcStateCode];
    let gstStateObj = null;
    if (gstStateName) {
      gstStateObj = await GeoLevel1.findOne({ name: new RegExp(gstStateName.replace(/[^a-zA-Z0-9\s]/g, '').trim(), 'i') }).lean();
    }

    if (gstStateObj && allowedStateIds.length > 0 && !allowedStateIds.includes(String(gstStateObj._id))) {
      throw new Error(`Territory Mismatch: EPC company GST state (${gstStateName || epcStateCode}) is outside your authorized ${territoryLevel === 'district' ? 'District' : 'State'} territory (${allowedStateNames.join(', ') || 'Assigned Territory'}).`);
    }

    gstResult = await performGstVerification({
      gstin: cleanGstin,
      entity_type: 'epc_buyer',
      verified_by: String(resellerId),
      options: { provider: process.env.QUICKEKYC_PROVIDER || process.env.GST_VERIFY_PROVIDER || 'mock' },
    });

    if (!gstResult.is_valid) {
      throw new Error(`GSTIN Verification Failed: ${gstResult.error_message}`);
    }

    // Strict Single Reseller Rule: Check existing account or pending signup with this GSTIN
    const existingGstinAccount = await EpcAccount.findOne({
      gstin: cleanGstin,
      deleted_at: null,
    }).populate('onboarded_by_reseller_id', 'business_name');

    if (existingGstinAccount) {
      const currentResellerId = existingGstinAccount.primary_reseller_id || existingGstinAccount.onboarded_by_reseller_id?._id || existingGstinAccount.onboarded_by_reseller_id;
      if (currentResellerId && String(currentResellerId) !== String(resellerId)) {
        const otherResellerName = existingGstinAccount.onboarded_by_reseller_id?.business_name || 'another Franchise Partner';
        throw new Error(`Exclusivity Conflict: An EPC company with GSTIN ${cleanGstin} is already registered under ${otherResellerName}. Each EPC can only belong to one Franchise Partner.`);
      }
      if (currentResellerId && String(currentResellerId) === String(resellerId)) {
        throw new Error(`This EPC company (GSTIN: ${cleanGstin}) is already registered under your Franchise account.`);
      }
    }

    const pendingGstinRequest = await EpcSignupRequest.findOne({
      gstin: cleanGstin,
      status: 'pending',
    }).populate('onboarded_by_reseller_id', 'business_name');

    if (pendingGstinRequest) {
      const reqResellerId = pendingGstinRequest.onboarded_by_reseller_id?._id || pendingGstinRequest.onboarded_by_reseller_id;
      if (reqResellerId && String(reqResellerId) !== String(resellerId)) {
        const otherResellerName = pendingGstinRequest.onboarded_by_reseller_id?.business_name || 'another Franchise Partner';
        throw new Error(`Exclusivity Conflict: An onboarding request for GSTIN ${cleanGstin} has already been submitted by ${otherResellerName}.`);
      }
      if (reqResellerId && String(reqResellerId) === String(resellerId)) {
        throw new Error(`An onboarding request for GSTIN ${cleanGstin} is already pending review for your Franchise account.`);
      }
    }
  }

  // 4. Check existing email / whatsapp
  const cleanEmail = (email || '').trim().toLowerCase();
  const cleanWhatsapp = (whatsapp || '').trim();

  const existingAccount = await EpcAccount.findOne({
    $or: [{ email: cleanEmail }, { whatsapp: cleanWhatsapp }],
    deleted_at: null,
  });
  if (existingAccount) {
    throw new Error('An EPC account with this Email or WhatsApp number already exists');
  }

  const existingRequest = await EpcSignupRequest.findOne({
    $or: [{ email: cleanEmail }, { whatsapp: cleanWhatsapp }],
    status: { $in: ['pending', 'approved'] },
  });
  if (existingRequest) {
    throw new Error('An onboarding request with this Email or WhatsApp number is already pending review');
  }

  const password_hash = await bcrypt.hash(password || 'EpcPass@123', 10);

  // 5. Create EPC Account
  const epcAccount = await EpcAccount.create({
    name: name.trim(),
    email: cleanEmail,
    whatsapp: cleanWhatsapp,
    password_hash,
    states: effStateId ? [effStateId] : [],
    districts: effDistrictId ? [effDistrictId] : [],
    status: 'pending',
    epc_type: epc_type ? epc_type.trim() : 'New EPC',
    epc_type_id: epc_type_id || null,
    onboarded_by_reseller_id: resellerId,
    primary_reseller_id: resellerId,
    onboarding_source: 'reseller',
    reseller_assigned_date: new Date(),
    gstin: cleanGstin,
    gstin_verified_at: gstResult ? new Date() : null,
    gstin_legal_name: gstResult?.legal_name || null,
    gstin_trade_name: gstResult?.trade_name || null,
    gstin_registration_status: gstResult?.business_status || null,
    is_gstin_active: Boolean(gstResult?.is_valid),
    onboarding_gstin_log_id: gstResult?.log_id || null,
  });

  // 6. Create Active Relationship
  await EpcResellerRelationship.create({
    epc_id: epcAccount._id,
    reseller_id: resellerId,
    gstin: cleanGstin,
    effective_from: new Date(),
    status: 'active',
  });

  // 7. Create EPC Signup Request for Admin Review Queue
  const signupRequest = await EpcSignupRequest.create({
    account_id: epcAccount._id,
    company_name: (company_name || name).trim(),
    email: cleanEmail,
    whatsapp: cleanWhatsapp,
    status: 'pending',
    epc_type: epc_type ? epc_type.trim() : 'New EPC',
    epc_type_id: epc_type_id || null,
    state_id: effStateId,
    reference_image: reference_image || null,
    onboarded_by_reseller_id: resellerId,
    onboarding_source: 'reseller',
  });

  await logAudit({
    actor_type: 'reseller',
    actor_id: resellerId,
    action: 'RESELLER_EPC_ONBOARD',
    entity_type: 'epc_accounts',
    entity_id: epcAccount._id,
    after_snapshot: { epc_account_id: epcAccount._id, company_name, reseller_id: resellerId, gstin: cleanGstin },
  });

  return {
    account_id: epcAccount._id,
    signup_request_id: signupRequest._id,
    status: 'pending',
    company_name: signupRequest.company_name,
    gstin: cleanGstin,
  };
}

/**
 * Approve or Reject a reseller-onboarded EPC Buyer signup request (Admin function).
 */
async function reviewResellerEpcSignup(idOrSignupRequestId, adminUserId, decision, note) {
  if (!['approved', 'rejected'].includes(decision)) {
    throw new Error('Decision must be approved or rejected');
  }

  let signupReq = null;
  if (mongoose.Types.ObjectId.isValid(idOrSignupRequestId)) {
    signupReq = await EpcSignupRequest.findOne({
      $or: [{ _id: idOrSignupRequestId }, { account_id: idOrSignupRequestId }],
    });
  }

  if (signupReq) {
    signupReq.status = decision;
    signupReq.reviewed_by = adminUserId;
    signupReq.reviewed_at = new Date();
    await signupReq.save();
  }

  const targetAccountId = signupReq ? signupReq.account_id : idOrSignupRequestId;
  let epcAccount = null;
  if (mongoose.Types.ObjectId.isValid(targetAccountId)) {
    epcAccount = await EpcAccount.findById(targetAccountId);
  }

  if (!epcAccount && !signupReq) {
    throw new Error('EPC account or signup request not found');
  }

  if (epcAccount) {
    epcAccount.status = decision;
    if (decision === 'approved') {
      epcAccount.is_email_verified = true;
      epcAccount.is_whatsapp_verified = true;
    }
    await epcAccount.save();
  }

  await logAudit({
    actor_type: 'cms_user',
    actor_id: adminUserId,
    action: decision === 'approved' ? 'RESELLER_EPC_APPROVE' : 'RESELLER_EPC_REJECT',
    entity_type: signupReq ? 'epc_signup_requests' : 'epc_accounts',
    entity_id: signupReq ? signupReq._id : idOrSignupRequestId,
    after_snapshot: { status: decision, note },
  });

  return {
    signup_request_id: signupReq ? signupReq._id : null,
    account_id: epcAccount ? epcAccount._id : idOrSignupRequestId,
    status: decision,
  };
}

/**
 * List EPC GSTIN conflict / transfer requests (Admin view).
 */
async function listEpcTransferRequests(query = {}) {
  const filter = {};
  if (query.status) filter.status = query.status;

  const rows = await EpcTransferRequest.find(filter)
    .populate('epc_id', 'name email whatsapp gstin')
    .populate('requested_by_reseller_id', 'business_name email mobile')
    .populate('current_reseller_id', 'business_name email mobile')
    .sort({ created_at: -1 })
    .lean();

  return rows;
}

/**
 * Approve or Reject an EPC Reseller Transfer Request (Admin function).
 */
async function reviewEpcTransferRequest(requestId, adminUserId, decision, reviewNote = '') {
  if (!['approved', 'rejected'].includes(decision)) {
    throw new Error('Decision must be approved or rejected');
  }

  const transferReq = await EpcTransferRequest.findById(requestId);
  if (!transferReq) {
    throw new Error('Transfer request not found');
  }
  if (transferReq.status !== 'pending') {
    throw new Error(`Transfer request is already ${transferReq.status}`);
  }

  transferReq.status = decision;
  transferReq.reviewed_by = adminUserId;
  transferReq.reviewed_at = new Date();
  transferReq.review_note = reviewNote ? reviewNote.trim() : null;
  await transferReq.save();

  if (decision === 'approved' && transferReq.epc_id) {
    const epcId = transferReq.epc_id;
    const newResellerId = transferReq.requested_by_reseller_id;

    // Revoke current active relationship
    await EpcResellerRelationship.updateMany(
      { epc_id: epcId, status: 'active' },
      { $set: { status: 'transferred', effective_to: new Date() } }
    );

    // Create new active relationship
    await EpcResellerRelationship.create({
      epc_id: epcId,
      reseller_id: newResellerId,
      gstin: transferReq.gstin,
      effective_from: new Date(),
      status: 'active',
      assigned_by: adminUserId,
      transfer_reason: reviewNote || 'Approved via Admin Transfer Request Review',
    });

    // Update EPC account primary reseller
    await EpcAccount.findByIdAndUpdate(epcId, {
      $set: {
        primary_reseller_id: newResellerId,
        onboarded_by_reseller_id: newResellerId,
        reseller_assigned_date: new Date(),
      },
    });

    await logAudit({
      actor_type: 'cms_user',
      actor_id: adminUserId,
      action: 'EPC_RESELLER_TRANSFER_APPROVED',
      entity_type: 'epc_transfer_requests',
      entity_id: requestId,
      metadata: { epc_id: epcId, old_reseller_id: transferReq.current_reseller_id, new_reseller_id: newResellerId },
      reason: reviewNote,
    });
  } else if (decision === 'rejected') {
    await logAudit({
      actor_type: 'cms_user',
      actor_id: adminUserId,
      action: 'EPC_RESELLER_TRANSFER_REJECTED',
      entity_type: 'epc_transfer_requests',
      entity_id: requestId,
      reason: reviewNote,
    });
  }

  return {
    transfer_request_id: transferReq._id,
    status: decision,
  };
}

module.exports = {
  registerEpcByReseller,
  reviewResellerEpcSignup,
  listEpcTransferRequests,
  reviewEpcTransferRequest,
};
