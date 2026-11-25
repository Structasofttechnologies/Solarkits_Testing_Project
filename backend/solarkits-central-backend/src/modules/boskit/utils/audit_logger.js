'use strict';

const mongoose = require('mongoose');

/**
 * BOSKIT Audit Logger Utility
 *
 * Logs actions securely to the append-only `audit_logs` collection.
 *
 * @param {Object} params
 * @param {'cms_user'|'boskit_distributor'|'boskit_dealer'|'reseller'|'epc_buyer'|'system'} params.actor_type
 * @param {mongoose.Types.ObjectId|string} [params.actor_id]
 * @param {string} params.action - e.g. 'DISTRIBUTOR_LOGIN', 'DISTRIBUTOR_REGISTER_INIT'
 * @param {string} params.entity_type - e.g. 'boskit_distributors', 'boskit_dealers'
 * @param {mongoose.Types.ObjectId|string} params.entity_id
 * @param {Object} [params.before_snapshot]
 * @param {Object} [params.after_snapshot]
 * @param {string} [params.reason]
 * @param {Object} [params.metadata]
 * @param {Object} [params.req] - Express request object for IP & User Agent
 */
const logBoskitAudit = async ({
  actor_type = 'system',
  actor_id = null,
  action,
  entity_type,
  entity_id,
  before_snapshot = null,
  after_snapshot = null,
  reason = null,
  metadata = null,
  req = null,
}) => {
  try {
    const AuditLog = mongoose.model('audit_logs');
    if (!AuditLog) return;

    let ip_address = null;
    let user_agent = null;

    if (req) {
      ip_address = req.headers['x-forwarded-for'] || req.socket?.remoteAddress || req.ip || null;
      user_agent = req.headers['user-agent'] || null;
    }

    await AuditLog.create({
      actor_type,
      actor_id: actor_id ? new mongoose.Types.ObjectId(actor_id) : null,
      action: action.toUpperCase(),
      entity_type,
      entity_id: new mongoose.Types.ObjectId(entity_id),
      before_snapshot,
      after_snapshot,
      reason,
      metadata,
      ip_address,
      user_agent,
    });
  } catch (error) {
    // Non-blocking: never crash main request flow if audit log fails
    console.error('[logBoskitAudit Error]:', error.message);
  }
};

module.exports = { logBoskitAudit };
