/**
 * verify_reseller_auth.js
 *
 * Middleware to authenticate Reseller Portal API calls.
 * Phase 2 — Reseller Management System
 *
 * Reads token from cookie (`reseller_access_token`) or `Authorization: Bearer <token>` header.
 * Validates reseller active status, token version, and deleted_at flag.
 */

const { decode_token } = require('../utils/jsonwebtoken');
const { Reseller } = require('../../admin-panel/models/india_solarshop_db');

const verify_reseller_auth = async (req, res, next) => {
  try {
    let token = null;

    // 1. Explicit Bearer token takes highest priority
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
      token = req.headers.authorization.split(' ')[1];
    }

    // 2. Specific Reseller cookie
    if (!token && req.cookies?.reseller_access_token) {
      token = req.cookies.reseller_access_token;
    }

    // 3. Fallback generic cookie
    if (!token && req.cookies?.access_token) {
      token = req.cookies.access_token;
    }

    if (!token) {
      return res.status(401).json({ status: 'error', message: 'Authentication token missing', auth: false });
    }

    const decoded = decode_token(token);
    if (!decoded || !decoded.id || decoded.role !== 'reseller') {
      return res.status(401).json({ status: 'error', message: 'Invalid or expired reseller session', auth: false });
    }

    const reseller = await Reseller.findOne({ _id: decoded.id, deleted_at: null }).lean();
    if (!reseller) {
      return res.status(401).json({ status: 'error', message: 'Reseller account not found', auth: false });
    }

    if (!reseller.is_active) {
      return res.status(403).json({ status: 'error', message: 'Reseller account is deactivated', auth: false });
    }

    if (reseller.activation_status === 'terminated') {
      return res.status(403).json({ status: 'error', message: 'Reseller account has been terminated', auth: false });
    }

    if (reseller.token_version !== undefined && decoded.token_version !== undefined && reseller.token_version !== decoded.token_version) {
      return res.status(401).json({ status: 'error', message: 'Session invalidated. Please login again.', auth: false });
    }

    // Attach reseller context
    req.reseller = reseller;
    req.user = {
      id:              reseller._id,
      email:           reseller.email,
      business_name:   reseller.business_name,
      commercial_mode: reseller.commercial_mode,
      kyc_status:      reseller.kyc_status,
      role:            'reseller',
    };

    next();
  } catch (error) {
    console.error('[verify_reseller_auth] Error:', error.message);
    return res.status(401).json({ status: 'error', message: 'Invalid token or session error', auth: false });
  }
};

module.exports = { verify_reseller_auth };
