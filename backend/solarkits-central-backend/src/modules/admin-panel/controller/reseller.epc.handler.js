/**
 * reseller.epc.handler.js
 *
 * Admin controller for Reseller-Onboarded EPC Buyer Pipeline.
 * Phase 5 — Reseller Management System
 *
 * Pattern: { status: "success"|"error", data, message }
 */

const mongoose = require('mongoose');
const { EpcAccount, EpcSignupRequest } = require('../models/india_solarshop_db');
const { reviewResellerEpcSignup } = require('../utils/epc.reseller.service');

// ─── 1. LIST RESELLER-ONBOARDED EPC BUYERS ───────────────────────────────────
/**
 * GET /admin-api/reseller-mgmt/epc-buyers/list
 */
const list_reseller_epc_buyers = async (req, res) => {
  try {
    const { reseller_id, status, epc_type } = req.query;
    const query = {
      onboarded_by_reseller_id: { $ne: null },
      deleted_at: null,
    };

    if (reseller_id && mongoose.Types.ObjectId.isValid(reseller_id)) {
      query.onboarded_by_reseller_id = reseller_id;
    }
    if (status && ['pending', 'approved', 'rejected'].includes(status)) {
      query.status = status;
    }
    if (epc_type && epc_type !== 'all') {
      query.epc_type = new RegExp('^' + epc_type.trim() + '$', 'i');
    }

    const rows = await EpcAccount.find(query)
      .populate('onboarded_by_reseller_id', 'business_name email mobile gst_number commercial_mode')
      .populate('states', 'name state_code')
      .populate('districts', 'name')
      .sort({ created_at: -1 })
      .lean();

    const epcIds = rows.map((r) => r._id);
    const signupRequests = await EpcSignupRequest.find({ account_id: { $in: epcIds } }).lean();
    const signupMap = new Map(signupRequests.map((s) => [s.account_id.toString(), s._id.toString()]));

    const data = rows.map((r) => ({
      id:                     r._id,
      signup_request_id:      signupMap.get(r._id.toString()) || null,
      name:                   r.name,
      email:                  r.email,
      whatsapp:               r.whatsapp,
      company_id:             r.company_id,
      states:                 r.states,
      districts:              r.districts,
      status:                 r.status,
      epc_type:               r.epc_type || 'New EPC',
      epc_type_id:            r.epc_type_id || null,
      reseller:               r.onboarded_by_reseller_id,
      onboarding_source:      r.onboarding_source,
      reseller_assigned_date: r.reseller_assigned_date,
      created_at:             r.created_at,
    }));

    return res.json({ status: 'success', data });
  } catch (error) {
    console.error('[reseller.epc] list_reseller_epc_buyers error:', error);
    return res.status(500).json({ status: 'error', message: 'Internal server error' });
  }
};

// ─── 2. REVIEW RESELLER EPC BUYER SIGNUP ─────────────────────────────────────
/**
 * PUT /admin-api/reseller-mgmt/epc-buyers/review/:signup_request_id
 * Body: { decision: "approved"|"rejected", note?: string }
 */
const review_reseller_epc_buyer = async (req, res) => {
  try {
    const { signup_request_id } = req.params;
    const { decision, note } = req.body;

    if (!signup_request_id || !mongoose.Types.ObjectId.isValid(signup_request_id)) {
      return res.status(400).json({ status: 'error', message: 'Valid signup_request_id required' });
    }

    const result = await reviewResellerEpcSignup(signup_request_id, req.user?.id, decision, note);

    return res.json({
      status: 'success',
      message: `Reseller EPC signup request ${decision} successfully`,
      data: result,
    });
  } catch (error) {
    console.error('[reseller.epc] review_reseller_epc_buyer error:', error.message);
    return res.status(400).json({ status: 'error', message: error.message });
  }
};

module.exports = {
  list_reseller_epc_buyers,
  review_reseller_epc_buyer,
};
