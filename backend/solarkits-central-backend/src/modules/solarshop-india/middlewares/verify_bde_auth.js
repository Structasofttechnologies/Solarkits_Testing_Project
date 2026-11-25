/**
 * verify_bde_auth.js
 *
 * Middleware to authenticate BDE Portal self-service API calls.
 * Step 1 — SolarKits BDE System
 *
 * Reads token from cookie (`bde_access_token`) or `Authorization: Bearer <token>` header.
 * Validates BDE active status, KYC verified status, token version, and deleted_at flag.
 */

const { decode_token } = require('../utils/jsonwebtoken');
const { BDEProfile, BDEKYC } = require('../../admin-panel/models/india_solarshop_db');

const verify_bde_auth = async (req, res, next) => {
  try {
    let token = null;

    // 1. Explicit Bearer token takes highest priority
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
      token = req.headers.authorization.split(' ')[1];
    }

    // 2. Specific BDE portal cookie
    if (!token && req.cookies?.bde_access_token) {
      token = req.cookies.bde_access_token;
    }

    // 3. Fallback generic cookie only if no specific token found
    if (!token && req.cookies?.access_token) {
      token = req.cookies.access_token;
    }

    if (!token) {
      return res.status(401).json({ status: 'error', message: 'Authentication token missing', auth: false });
    }

    let decoded;
    try {
      decoded = decode_token(token);
    } catch (err) {
      return res.status(401).json({ status: 'error', message: 'Invalid or expired session token', auth: false });
    }

    if (!decoded || !decoded.id || decoded.role !== 'bde') {
      return res.status(401).json({ status: 'error', message: 'Invalid token payload or unauthorized role', auth: false });
    }

    const bde = await BDEProfile.findOne({ _id: decoded.id, deleted_at: null });
    if (!bde) {
      return res.status(401).json({ status: 'error', message: 'BDE profile not found or account removed', auth: false });
    }

    // Check account status
    if (bde.status === 'suspended') {
      return res.status(403).json({ status: 'error', message: 'Your BDE account has been suspended. Please contact administrator.', auth: false });
    }

    if (bde.status === 'inactive') {
      return res.status(403).json({ status: 'error', message: 'Your BDE account is currently inactive.', auth: false });
    }

    if (bde.status !== 'active' && bde.status !== 'kyc_verified') {
      return res.status(403).json({ status: 'error', message: 'Your BDE account is not activated yet. Status: ' + bde.status, auth: false });
    }

    // Check KYC status
    const kyc = await BDEKYC.findOne({ bde_id: bde._id });
    if (!kyc || kyc.kyc_status !== 'verified') {
      return res.status(403).json({ status: 'error', message: 'BDE login requires verified KYC. Current status: ' + (kyc ? kyc.kyc_status : 'missing'), auth: false });
    }

    // Validate token version
    if (bde.token_version !== undefined && decoded.token_version !== undefined && bde.token_version !== decoded.token_version) {
      return res.status(401).json({ status: 'error', message: 'Session invalidated due to password change or login reset. Please log in again.', auth: false });
    }

    // Attach bde context
    req.bde = bde;
    req.user = {
      id: bde._id,
      bde_id: bde.bde_id,
      email: bde.email,
      full_name: bde.full_name,
      mobile_number: bde.mobile_number,
      role: 'bde',
      is_first_login: bde.is_first_login,
    };

    next();
  } catch (error) {
    console.error('[verify_bde_auth] Error:', error.message);
    return res.status(401).json({ status: 'error', message: 'Invalid token or session error', auth: false });
  }
};

module.exports = { verify_bde_auth };
