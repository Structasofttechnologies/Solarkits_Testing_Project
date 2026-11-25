/**
 * test_kmm_verification.js — Automated test suite for Know My Margin (KMM).
 *
 * Tests:
 * 1. Calculation Service (all 5 rate types, location hierarchy, both GST methods, margin modes, rounding)
 * 2. Mongoose Schemas (ProjectBomItem, BomRateHistory, EstimatorSettings, EpcMarginEstimate, EpcQuote)
 * 3. Handlers and exports completeness
 */

'use strict';

const assert = require('assert');
const kmm = require('./src/modules/solarshop-india/utils/kmm.calculation.service');

console.log('🧪 Starting Know My Margin (KMM) Comprehensive Test Suite...\n');

let passedTests = 0;
let totalTests = 0;

function it(desc, fn) {
  totalTests++;
  try {
    fn();
    console.log(`  ✅ [PASS] ${desc}`);
    passedTests++;
  } catch (err) {
    console.error(`  ❌ [FAIL] ${desc}: ${err.message}`);
    throw err;
  }
}

// ── 1. Calculation Service Tests ─────────────────────────────────────────────
console.log('--- Suite 1: KMM Calculation Engine ---');

it('Fixed rate BOM item calculation', () => {
  const res = kmm.calculateMarginEstimate({
    kit: { selling_price: 100000, capacity_kw: 3 },
    quantity: 1,
    bom_items: [{ name: 'Foundation', rate_type: 'fixed', admin_rate: 7500 }],
    margin: { type: 'amount', value: 15000 },
    gst_settings: { method: 'on_cost_plus_margin', rate: 18 }
  });

  assert.strictEqual(res.kit_total_price, 100000);
  assert.strictEqual(res.bom_total_cost, 7500);
  assert.strictEqual(res.project_cost_before_gst, 107500);
  assert.strictEqual(res.margin_amount, 15000);
  assert.strictEqual(res.taxable_base, 122500); // 107500 + 15000
  assert.strictEqual(res.gst_amount, 22050); // 122500 * 0.18
  assert.strictEqual(res.estimated_customer_price, 144550); // 122500 + 22050
  assert.strictEqual(res.profit_amount, 15000);
});

it('Per kW rate BOM item calculation with multiple kits', () => {
  const res = kmm.calculateMarginEstimate({
    kit: { selling_price: 80000, capacity_kw: 5 },
    quantity: 4, // 20 kW total
    bom_items: [{ name: 'Structures', rate_type: 'per_kw', admin_rate: 2200 }],
    margin: { type: 'percentage', value: 12 },
    gst_settings: { method: 'on_cost_plus_margin', rate: 18 }
  });

  assert.strictEqual(res.total_kw, 20);
  assert.strictEqual(res.kit_total_price, 320000);
  assert.strictEqual(res.bom_total_cost, 44000); // 20 kW * 2200
  assert.strictEqual(res.project_cost_before_gst, 364000);
  assert.strictEqual(res.margin_amount, 43680); // 364000 * 0.12
  assert.strictEqual(res.taxable_base, 407680);
  assert.strictEqual(res.gst_amount, 73382.4);
  assert.strictEqual(res.estimated_customer_price, 481062.4);
});

it('Per Kit rate BOM item calculation', () => {
  const res = kmm.calculateMarginEstimate({
    kit: { selling_price: 50000, capacity_kw: 2 },
    quantity: 3,
    bom_items: [{ name: 'ACDB Box', rate_type: 'per_kit', admin_rate: 3500 }],
    margin: { type: 'amount', value: 10000 },
    gst_settings: { method: 'on_cost_plus_margin', rate: 18 }
  });

  assert.strictEqual(res.bom_total_cost, 10500); // 3 * 3500
  assert.strictEqual(res.project_cost_before_gst, 160500);
});

it('Quantity-based BOM item calculation', () => {
  const res = kmm.calculateMarginEstimate({
    kit: { selling_price: 60000, capacity_kw: 3 },
    quantity: 1,
    bom_items: [{ name: 'Cable Lot', rate_type: 'quantity_based', admin_rate: 120, quantity: 50 }],
    margin: { type: 'amount', value: 5000 },
    gst_settings: { method: 'on_cost_plus_margin', rate: 18 }
  });

  assert.strictEqual(res.bom_total_cost, 6000); // 120 * 50
});

it('Location-based rate resolution hierarchy (pincode > district > state > fallback)', () => {
  const bomWithLocation = {
    name: 'Logistics',
    rate_type: 'location_based',
    admin_rate: 5000, // fallback
    location_rates: [
      { state_name: 'maharashtra', rate: 3000 },
      { district_name: 'pune', rate: 2000 },
      { pincode: '411001', rate: 1200 }
    ]
  };

  // 1. Exact pincode match
  const r1 = kmm.resolveLocationRate(bomWithLocation, { pincode: '411001', district_name: 'pune', state_name: 'maharashtra' });
  assert.strictEqual(r1, 1200);

  // 2. District match
  const r2 = kmm.resolveLocationRate(bomWithLocation, { pincode: '411099', district_name: 'pune', state_name: 'maharashtra' });
  assert.strictEqual(r2, 2000);

  // 3. State match
  const r3 = kmm.resolveLocationRate(bomWithLocation, { pincode: '400001', district_name: 'mumbai', state_name: 'maharashtra' });
  assert.strictEqual(r3, 3000);

  // 4. Fallback default
  const r4 = kmm.resolveLocationRate(bomWithLocation, { pincode: '560001', district_name: 'bangalore', state_name: 'karnataka' });
  assert.strictEqual(r4, 5000);
});

it('Included-in-kit BOM items add ₹0 to extra cost', () => {
  const res = kmm.calculateMarginEstimate({
    kit: { selling_price: 120000, capacity_kw: 4 },
    quantity: 1,
    bom_items: [
      { name: 'Bundled Clamps', rate_type: 'fixed', admin_rate: 4000, is_included_in_kit: true },
      { name: 'Extra Cable', rate_type: 'fixed', admin_rate: 2000, is_included_in_kit: false }
    ],
    margin: { type: 'amount', value: 10000 },
    gst_settings: { method: 'on_cost_plus_margin', rate: 18 }
  });

  assert.strictEqual(res.bom_items[0].applied_rate, 0);
  assert.strictEqual(res.bom_items[0].amount, 0);
  assert.strictEqual(res.bom_total_cost, 2000);
});

it('GST on_cost calculation method', () => {
  const res = kmm.calculateMarginEstimate({
    kit: { selling_price: 100000, capacity_kw: 3 },
    quantity: 1,
    bom_items: [{ name: 'Civil', rate_type: 'fixed', admin_rate: 10000 }],
    margin: { type: 'amount', value: 20000 },
    gst_settings: { method: 'on_cost', rate: 18 } // GST on cost only
  });

  // Base cost = 110000
  // GST = 110000 * 0.18 = 19800
  // Customer Price = 110000 + 19800 + 20000 = 149800
  assert.strictEqual(res.project_cost_before_gst, 110000);
  assert.strictEqual(res.gst_amount, 19800);
  assert.strictEqual(res.margin_amount, 20000);
  assert.strictEqual(res.estimated_customer_price, 149800);
});

// ── 2. Models and Schema Verification ────────────────────────────────────────
console.log('\n--- Suite 2: Mongoose Models Verification ---');

it('Models properly exported and registered in india_solarshop_db', () => {
  const models = require('./src/modules/admin-panel/models/india_solarshop_db');
  assert.ok(models.ProjectBomItem, 'ProjectBomItem must be exported');
  assert.ok(models.BomRateHistory, 'BomRateHistory must be exported');
  assert.ok(models.EpcMarginEstimate, 'EpcMarginEstimate must be exported');
  assert.ok(models.EstimatorSettings, 'EstimatorSettings must be exported');
  assert.ok(models.EpcQuote, 'EpcQuote must be exported');
});

it('EpcQuote schema includes epc_self_service source and estimate_id', () => {
  const { EpcQuote } = require('./src/modules/admin-panel/models/india_solarshop_db');
  const quoteSourceEnum = EpcQuote.schema.path('quote_source').enumValues;
  assert.ok(quoteSourceEnum.includes('epc_self_service'), 'quote_source must include epc_self_service');
  assert.ok(EpcQuote.schema.path('estimate_id'), 'estimate_id path must exist');
});

// ── 3. Handlers and Routes Verification ──────────────────────────────────────
console.log('\n--- Suite 3: Controllers and Routes Verification ---');

it('Admin Estimator Handler has all 10 required methods', () => {
  const h = require('./src/modules/admin-panel/controller/estimator.admin.handler');
  const required = [
    'list_bom_items', 'get_bom_item', 'create_bom_item', 'update_bom_item',
    'toggle_bom_status', 'delete_bom_item', 'get_bom_rate_history',
    'get_estimator_settings', 'update_estimator_settings', 'get_hierarchy_options'
  ];
  required.forEach(m => assert.strictEqual(typeof h[m], 'function', `${m} must be a function`));
});

it('EPC Estimator Handler has all 16 required methods', () => {
  const h = require('./src/modules/solarshop-india/controller/estimator.handler');
  const required = [
    'get_eligible_industries', 'get_eligible_project_types', 'get_eligible_sub_types',
    'get_eligible_solutions', 'get_eligible_boms', 'get_eligible_gst',
    'calculate', 'compare_solutions', 'save_estimate', 'list_my_estimates',
    'get_estimate_detail', 'update_estimate', 'delete_estimate',
    'recalculate_estimate', 'generate_quote_from_estimate', 'get_estimates_dashboard_stats'
  ];
  required.forEach(m => assert.strictEqual(typeof h[m], 'function', `${m} must be a function`));
});

console.log(`\n🎉 All ${passedTests}/${totalTests} Tests Passed Successfully!`);
