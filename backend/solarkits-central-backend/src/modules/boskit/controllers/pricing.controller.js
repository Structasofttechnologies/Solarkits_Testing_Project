'use strict';

const mongoose = require('mongoose');
const PricingEngine = require('../services/pricing_engine');

/**
 * 1. Calculate Real-Time Dynamic Cart / Quote Pricing
 */
const calculate_price = async (req, res) => {
  try {
    const {
      items = [],
      buyer_type = 'guest',
      origin_state_code = 'GJ',
      destination_state_code = 'GJ',
      plan_code,
    } = req.body;

    const result = await PricingEngine.calculate({
      items,
      buyer_type,
      buyer_id: req.user?.id,
      origin_state_code,
      destination_state_code,
      plan_code,
    });

    return res.status(200).json({
      status: 'success',
      success: true,
      items: result.items,
      summary: result.summary,
      moq_passed: result.moq_passed,
      moq_errors: result.moq_errors,
      data: result,
    });
  } catch (error) {
    console.error('[calculate_price Error]:', error);
    return res.status(500).json({
      status: 'error',
      success: false,
      message: 'Pricing calculation failed: ' + error.message,
    });
  }
};

/**
 * 2. Get Configured Pricing Rules
 */
const get_pricing_rules = async (req, res) => {
  try {
    const BoskitPriceRule = mongoose.model('boskit_price_rules');
    const rules = await BoskitPriceRule.find({ is_active: true }).sort({ priority: -1 }).lean();

    return res.status(200).json({
      status: 'success',
      success: true,
      rules: rules.map((r) => ({
        id: r._id,
        rule_code: r.rule_code,
        name: r.name,
        target_role: r.target_role,
        discount_percent: r.discount_percent,
        min_quantity: r.min_quantity,
        is_active: r.is_active,
        priority: r.priority,
      })),
    });
  } catch (error) {
    console.error('[get_pricing_rules Error]:', error);
    return res.status(500).json({
      status: 'error',
      success: false,
      message: 'Failed to fetch pricing rules: ' + error.message,
    });
  }
};

/**
 * 3. Create Custom Pricing Rule
 */
const create_pricing_rule = async (req, res) => {
  try {
    const {
      rule_code,
      name,
      target_role = 'all',
      discount_percent = 0,
      min_quantity = 1,
      priority = 10,
    } = req.body;

    if (!rule_code || !name) {
      return res.status(400).json({
        status: 'error',
        success: false,
        message: 'rule_code and name are required.',
      });
    }

    const BoskitPriceRule = mongoose.model('boskit_price_rules');
    const rule = await BoskitPriceRule.create({
      rule_code,
      name,
      target_role,
      discount_percent,
      min_quantity,
      priority,
      is_active: true,
    });

    return res.status(201).json({
      status: 'success',
      success: true,
      message: 'Pricing rule created successfully.',
      rule,
    });
  } catch (error) {
    console.error('[create_pricing_rule Error]:', error);
    return res.status(500).json({
      status: 'error',
      success: false,
      message: 'Failed to create pricing rule: ' + error.message,
    });
  }
};

/**
 * 4. Get Franchise Tier Pricing Matrix
 */
const get_plan_matrix = async (req, res) => {
  try {
    const BoskitDistributorPlan = mongoose.model('boskit_distributor_plans');
    const plans = await BoskitDistributorPlan.find({ is_active: true }).sort({ joining_fee_paise: 1 }).lean();

    return res.status(200).json({
      status: 'success',
      success: true,
      plans: plans.map((p) => ({
        id: p._id,
        plan_code: p.plan_code,
        name: p.name,
        territory_level: p.territory_level,
        joining_fee_paise: p.joining_fee_paise,
        joining_fee_inr: Math.round((p.joining_fee_paise || 0) / 100),
        renewal_fee_inr: Math.round((p.annual_renewal_fee_paise || 0) / 100),
        max_dealers: p.max_dealers,
        features: p.features || [],
      })),
    });
  } catch (error) {
    console.error('[get_plan_matrix Error]:', error);
    return res.status(500).json({
      status: 'error',
      success: false,
      message: 'Failed to fetch plan matrix: ' + error.message,
    });
  }
};

module.exports = {
  calculate_price,
  get_pricing_rules,
  create_pricing_rule,
  get_plan_matrix,
};
