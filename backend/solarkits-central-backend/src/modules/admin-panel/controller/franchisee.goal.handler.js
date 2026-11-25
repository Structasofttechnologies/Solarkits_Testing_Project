/**
 * franchisee.goal.handler.js
 *
 * Franchisee-facing goal widget and admin goal progress endpoints.
 * Permission code: FPO_GOAL
 * Prefix: /admin-api/franchisee/goals
 */

const mongoose = require('mongoose');
const { FranchiseeTargetProgress } = require('../models/india_solarshop_db');
const { getGoalWidget, recalculateProgress } = require('../services/franchisee.goal.service');

// ── GOAL WIDGET (for franchisee dashboard or admin view) ─────────────────────
const get_goal_widget = async (req, res) => {
  try {
    const franchisee_id = req.params.franchisee_id || req.query.franchisee_id;
    if (!franchisee_id || !mongoose.Types.ObjectId.isValid(franchisee_id)) {
      return res.status(400).json({ status: 'error', message: 'Valid franchisee_id is required' });
    }

    const widget = await getGoalWidget(franchisee_id);
    return res.json({ status: 'success', data: widget });
  } catch (error) {
    console.error('[goal.handler] get_goal_widget error:', error);
    return res.status(500).json({ status: 'error', message: 'Internal server error' });
  }
};

// ── ADMIN: TRIGGER RECALCULATION ──────────────────────────────────────────────
const trigger_recalculation = async (req, res) => {
  try {
    const { franchisee_id, month, year } = req.body;
    if (!franchisee_id || !month || !year) {
      return res.status(400).json({ status: 'error', message: 'franchisee_id, month, and year are required' });
    }

    const progress = await recalculateProgress({
      franchisee_id,
      month: Number(month),
      year:  Number(year),
      actor_id: req.user?.id,
      req,
    });

    return res.json({ status: 'success', data: progress });
  } catch (error) {
    console.error('[goal.handler] trigger_recalculation error:', error);
    return res.status(500).json({ status: 'error', message: 'Internal server error' });
  }
};

// ── ADMIN: LIST ALL FRANCHISEE PROGRESS ──────────────────────────────────────
const list_all_progress = async (req, res) => {
  try {
    const { month, year, performance_status, franchisee_id, page = 1, limit = 50 } = req.query;
    const query = {};
    if (month) query.target_month = Number(month);
    if (year)  query.target_year  = Number(year);
    if (performance_status) query.performance_status = performance_status;
    if (franchisee_id) query.franchisee_id = franchisee_id;

    const skip = (Number(page) - 1) * Number(limit);
    const [rows, total] = await Promise.all([
      FranchiseeTargetProgress.find(query)
        .populate('franchisee_id', 'business_name mobile email')
        .sort({ achievement_pct: -1 })
        .skip(skip)
        .limit(Number(limit))
        .lean(),
      FranchiseeTargetProgress.countDocuments(query),
    ]);

    return res.json({
      status: 'success',
      data:   rows,
      meta:   { total, page: Number(page), limit: Number(limit), pages: Math.ceil(total / Number(limit)) },
    });
  } catch (error) {
    console.error('[goal.handler] list_all_progress error:', error);
    return res.status(500).json({ status: 'error', message: 'Internal server error' });
  }
};

module.exports = {
  get_goal_widget,
  trigger_recalculation,
  list_all_progress,
};
