/**
 * gst.verification.service.js
 *
 * Provider-agnostic GST verification service.
 * Performs format validation, calls provider adapter, resolves geolocation references,
 * and writes audit log to gst_verification_logs.
 *
 * Phase R2 — Reseller Management System
 */

const { verifyGstin } = require('../utils/gst.adapter');
const { GstVerificationLog } = require('../models/india_solarshop_db');

/**
 * Perform GST verification and save result log.
 *
 * @param {object} params
 * @param {string} params.gstin - 15 character GSTIN string
 * @param {string} [params.entity_type] - 'reseller' | 'epc_buyer'
 * @param {string|ObjectId} [params.entity_id] - Target entity ID
 * @param {string|ObjectId} [params.verified_by] - 'system' or cms_user ID / reseller ID
 * @param {object} [params.options] - Provider override options
 */
async function performGstVerification({
  gstin,
  entity_type = 'reseller',
  entity_id = null,
  verified_by = 'system',
  options = {},
}) {
  const result = await verifyGstin(gstin, options);

  let derivedDistrictId = null;
  let derivedStateId = null;

  let logId = null;
  try {
    // Save structured verification log
    const logDoc = await GstVerificationLog.create({
      entity_type,
      entity_id,
      gstin: result.gstin,
      provider: result.provider,
      request_payload: { gstin, entity_type, entity_id },
      response_snapshot: result.raw_response || {},
      legal_name: result.legal_name,
      trade_name: result.trade_name,
      business_status: result.business_status,
      registration_state: result.registration_state,
      derived_state_id: derivedStateId,
      derived_district_id: derivedDistrictId,
      is_valid: result.is_valid,
      error_message: result.error_message,
      verified_by: String(verified_by),
      verified_at: new Date(),
      provider_reference_id: result.provider_reference_id || null,
      registration_date: result.registration_date || null,
      principal_address: result.principal_address || null,
      taxpayer_type: result.taxpayer_type || null,
      normalized_status: result.normalized_status || (result.is_valid ? 'active' : 'inactive'),
    });
    logId = logDoc?._id || null;
  } catch (logErr) {
    console.warn('[gst.verification.service] Error saving log:', logErr.message);
  }

  return {
    ...result,
    log_id: logId,
  };
}

module.exports = {
  performGstVerification,
};
