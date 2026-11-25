/**
 * franchisee.alert.service.js
 *
 * Evaluates admin-configured alert rules against franchisee performance data
 * and generates deduplicated alert instances.
 *
 * Idempotency key format: ALERT-{alert_type}-{franchisee_id}-{period_month}-{period_year}
 * For PO-specific alerts: ALERT-{alert_type}-{franchisee_id}-{fpo_order_id}
 */

const mongoose = require('mongoose');
const {
  FranchiseeAlertConfig,
  FranchiseeAlert,
  FranchiseeTargetProgress,
  FpoOrder,
  Reseller,
} = require('../models/india_solarshop_db');

/**
 * Evaluate all active alert configs for a specific franchisee + period.
 *
 * @param {object} params
 * @param {string|ObjectId} params.franchisee_id
 * @param {number} params.month
 * @param {number} params.year
 * @returns {Promise<Array>} Created or existing alert records
 */
async function evaluateAlerts({ franchisee_id, month, year }) {
  const configs = await FranchiseeAlertConfig.find({ is_active: true }).lean();
  if (!configs.length) return [];

  const results = [];

  // Fetch progress once
  const progress = await FranchiseeTargetProgress.findOne({
    franchisee_id,
    target_year: year,
    target_month: month,
  }).lean();

  for (const config of configs) {
    try {
      const result = await _evaluateSingleAlert({ franchisee_id, month, year, config, progress });
      if (result) results.push(result);
    } catch (err) {
      console.error(`[franchisee.alert.service] Error evaluating ${config.alert_type} for ${franchisee_id}:`, err.message);
    }
  }

  return results;
}

async function _evaluateSingleAlert({ franchisee_id, month, year, config, progress }) {
  const { alert_type, threshold } = config;
  let should_alert = false;
  let actual_value = null;
  let fpo_order_id = null;

  switch (alert_type) {
    case 'NO_ORDERS_THIS_MONTH':
      actual_value = progress?.eligible_quantity || 0;
      should_alert = actual_value === 0;
      break;

    case 'BELOW_MONTHLY_TARGET':
      if (progress && progress.target_quantity > 0) {
        actual_value = progress.achievement_pct;
        should_alert = actual_value < (threshold ?? 100);
      }
      break;

    case 'BELOW_HISTORICAL_AVERAGE': {
      // Compare current eligible qty to average of last 3 months
      const periods = [];
      for (let i = 1; i <= 3; i++) {
        const m = ((month - 1 - i + 12) % 12) + 1;
        const y = month - i < 1 ? year - 1 : year;
        periods.push({ target_month: m, target_year: y });
      }
      const historical = await FranchiseeTargetProgress.find({
        franchisee_id,
        $or: periods,
      }).lean();
      if (historical.length > 0) {
        const avg = historical.reduce((s, h) => s + (h.eligible_quantity || 0), 0) / historical.length;
        actual_value = progress?.eligible_quantity || 0;
        const deviation = avg > 0 ? ((avg - actual_value) / avg) * 100 : 0;
        should_alert = deviation >= (threshold ?? 20);
      }
      break;
    }

    case 'LIKELY_TO_MISS_GOAL': {
      if (progress && progress.target_quantity > 0) {
        const now = new Date();
        const daysInMonth = new Date(year, month, 0).getDate();
        const daysPassed  = Math.max(1, now.getDate());
        const projected   = (progress.eligible_quantity / daysPassed) * daysInMonth;
        const projected_pct = (projected / progress.target_quantity) * 100;
        actual_value = Math.round(projected_pct * 100) / 100;
        should_alert = actual_value < (threshold ?? 100);
      }
      break;
    }

    case 'INACTIVE_DAYS_EXCEEDED': {
      const lastPo = await FpoOrder.findOne({
        franchisee_id,
        status: { $nin: ['DRAFT', 'CANCELLED', 'REJECTED', 'EXPIRED'] },
        deleted_at: null,
      })
        .sort({ created_at: -1 })
        .select('created_at')
        .lean();
      if (lastPo) {
        const daysSince = Math.floor((Date.now() - new Date(lastPo.created_at).getTime()) / 86400000);
        actual_value = daysSince;
        should_alert = daysSince >= (threshold ?? 30);
      } else {
        // No orders ever — always alert if threshold > 0
        actual_value = 9999;
        should_alert = true;
      }
      break;
    }

    case 'GOAL_ACHIEVED':
      if (progress && progress.target_quantity > 0) {
        actual_value = progress.achievement_pct;
        should_alert = actual_value >= 100 && actual_value < 120;
      }
      break;

    case 'GOAL_EXCEEDED':
      if (progress && progress.target_quantity > 0) {
        actual_value = progress.achievement_pct;
        should_alert = actual_value >= (threshold ?? 120);
      }
      break;

    default:
      return null;
  }

  if (!should_alert) return null;

  // Build idempotency key
  const ikey = fpo_order_id
    ? `ALERT-${alert_type}-${franchisee_id}-${fpo_order_id}`
    : `ALERT-${alert_type}-${franchisee_id}-${month}-${year}`;

  // Upsert — don't duplicate
  const existing = await FranchiseeAlert.findOne({ idempotency_key: ikey }).lean();
  if (existing) return existing;

  const alert = await FranchiseeAlert.create({
    alert_type,
    franchisee_id,
    fpo_order_id:    fpo_order_id || null,
    period_month:    month,
    period_year:     year,
    threshold_value: threshold ?? null,
    actual_value,
    status:          'PENDING',
    notified_via:    [],
    idempotency_key: ikey,
  });

  return alert;
}

/**
 * Evaluate PO-specific alerts (pending approval, nearing expiry, unpaid).
 * Should be called by a cron job or webhook.
 */
async function evaluatePoAlerts() {
  const results = [];

  // PO_PENDING_APPROVAL: POs in PENDING_APPROVAL > 24 hours
  const pendingPos = await FpoOrder.find({
    status: 'PENDING_APPROVAL',
    deleted_at: null,
  }).lean();

  for (const po of pendingPos) {
    const hoursAge = (Date.now() - new Date(po.created_at).getTime()) / 3600000;
    if (hoursAge >= 24) {
      const ikey = `ALERT-PO_PENDING_APPROVAL-${po.franchisee_id}-${po._id}`;
      const existing = await FranchiseeAlert.findOne({ idempotency_key: ikey }).lean();
      if (!existing) {
        const a = await FranchiseeAlert.create({
          alert_type: 'PO_PENDING_APPROVAL', franchisee_id: po.franchisee_id,
          fpo_order_id: po._id, actual_value: Math.round(hoursAge),
          status: 'PENDING', notified_via: [], idempotency_key: ikey,
        });
        results.push(a);
      }
    }

    // PO_NEARING_EXPIRY: Expires within 3 days
    if (po.expires_at) {
      const daysLeft = (new Date(po.expires_at).getTime() - Date.now()) / 86400000;
      if (daysLeft <= 3 && daysLeft > 0) {
        const ikey = `ALERT-PO_NEARING_EXPIRY-${po.franchisee_id}-${po._id}`;
        const existing = await FranchiseeAlert.findOne({ idempotency_key: ikey }).lean();
        if (!existing) {
          const a = await FranchiseeAlert.create({
            alert_type: 'PO_NEARING_EXPIRY', franchisee_id: po.franchisee_id,
            fpo_order_id: po._id, actual_value: Math.round(daysLeft * 10) / 10,
            status: 'PENDING', notified_via: [], idempotency_key: ikey,
          });
          results.push(a);
        }
      }
    }
  }

  // PO_UNPAID: POs in AWAITING_PAYMENT > 48 hours
  const unpaidPos = await FpoOrder.find({
    status: 'AWAITING_PAYMENT',
    deleted_at: null,
  }).lean();

  for (const po of unpaidPos) {
    const hoursAge = (Date.now() - new Date(po.updated_at || po.created_at).getTime()) / 3600000;
    if (hoursAge >= 48) {
      const ikey = `ALERT-PO_UNPAID-${po.franchisee_id}-${po._id}`;
      const existing = await FranchiseeAlert.findOne({ idempotency_key: ikey }).lean();
      if (!existing) {
        const a = await FranchiseeAlert.create({
          alert_type: 'PO_UNPAID', franchisee_id: po.franchisee_id,
          fpo_order_id: po._id, actual_value: Math.round(hoursAge),
          status: 'PENDING', notified_via: [], idempotency_key: ikey,
        });
        results.push(a);
      }
    }
  }

  return results;
}

module.exports = {
  evaluateAlerts,
  evaluatePoAlerts,
};
