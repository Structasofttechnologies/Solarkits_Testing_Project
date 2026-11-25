/**
 * gst.adapter.js
 *
 * Modular GSTIN Verification Adapter.
 * Phase 2 — Reseller Management System
 * Phase R2 — Provider modularization (mock vs quickekyc)
 */

const { verifyGstinMock, STATE_CODE_MAP } = require('./gst.providers/mock.provider');
const { verifyGstinQuickEkyc } = require('./gst.providers/quickekyc.provider');

const GSTIN_REGEX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;

/**
 * Validate GSTIN format locally before calling external provider.
 */
function isValidGstinFormat(gstin) {
  if (!gstin || typeof gstin !== 'string') return false;
  return GSTIN_REGEX.test(gstin.trim().toUpperCase());
}

/**
 * Verify GSTIN using configured adapter provider.
 *
 * @param {string} gstin - 15 digit GSTIN
 * @param {object} options - { provider: 'mock'|'sandbox'|'production' }
 * @returns {Promise<object>} Verification result snapshot
 */
async function verifyGstin(gstin, options = {}) {
  const cleanGstin = (gstin || '').trim().toUpperCase();
  const provider = options.provider || process.env.QUICKEKYC_PROVIDER || process.env.GST_VERIFY_PROVIDER || 'quickekyc';

  // 1. Format check
  if (!isValidGstinFormat(cleanGstin)) {
    return {
      is_valid: false,
      gstin: cleanGstin,
      provider,
      error_message: 'Invalid GSTIN format. Expected 15-character alphanumeric GSTIN.',
      legal_name: null,
      trade_name: null,
      business_status: null,
      registration_state: null,
      state_code: null,
      provider_reference_id: null,
      registration_date: null,
      principal_address: null,
      taxpayer_type: null,
      normalized_status: 'inactive',
      raw_response: null,
    };
  }

  // 2. Delegate to appropriate provider
  if (provider === 'mock') {
    return verifyGstinMock(cleanGstin);
  }

  if (provider === 'production' || provider === 'sandbox' || provider === 'quickekyc') {
    return verifyGstinQuickEkyc(cleanGstin);
  }

  throw new Error(`GST Provider "${provider}" is not recognized. Set QUICKEKYC_PROVIDER=mock in .env`);
}

module.exports = {
  isValidGstinFormat,
  verifyGstin,
  STATE_CODE_MAP,
};
