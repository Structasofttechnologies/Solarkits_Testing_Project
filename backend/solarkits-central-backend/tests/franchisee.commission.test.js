/**
 * franchisee.commission.test.js
 * Unit tests for franchisee.commission.service — calculateCommissionAmount() function.
 * Run: node tests/franchisee.commission.test.js
 */

const { calculateCommissionAmount } = require('../src/modules/admin-panel/services/franchisee.commission.service');

let passed = 0;
let failed = 0;

function assert(description, condition, detail = "") {
  if (condition) {
    console.log(`  ✅ ${description}`);
    passed++;
  } else {
    console.error(`  ❌ FAIL: ${description}${detail ? ` — ${detail}` : ""}`);
    failed++;
  }
}

console.log("\n=== Commission Service: calculateCommissionAmount() ===\n");

// ── 1. PERCENTAGE method ──────────────────────────────────────────────────────
console.log("1. PERCENTAGE method");
const pctRule = { commission_method: 'PERCENTAGE', commission_percentage: 10, min_eligible_quantity: 0, max_commission_paise: null };

const r1 = calculateCommissionAmount({ commission_rule: pctRule, eligible_kit_quantity: 30, gross_eligible_paise: 100000 });
assert("10% of ₹1000 = ₹100 (10000 paise)", r1.commission_paise === 10000, `Got: ${r1.commission_paise}`);
assert("Not capped", !r1.capped);

const r2 = calculateCommissionAmount({ commission_rule: { ...pctRule, commission_percentage: 8.5 }, eligible_kit_quantity: 10, gross_eligible_paise: 50000 });
assert("8.5% of ₹500 = ₹42.50 (4250 paise)", r2.commission_paise === 4250, `Got: ${r2.commission_paise}`);

// ── 2. FIXED_PER_KIT method ───────────────────────────────────────────────────
console.log("\n2. FIXED_PER_KIT method");
const fixedRule = { commission_method: 'FIXED_PER_KIT', fixed_amount_per_kit_paise: 50000, min_eligible_quantity: 0, max_commission_paise: null };

const r3 = calculateCommissionAmount({ commission_rule: fixedRule, eligible_kit_quantity: 30, gross_eligible_paise: 0 });
assert("30 kits × ₹500/kit = ₹15000 (1500000 paise)", r3.commission_paise === 1500000, `Got: ${r3.commission_paise}`);

const r4 = calculateCommissionAmount({ commission_rule: fixedRule, eligible_kit_quantity: 1, gross_eligible_paise: 0 });
assert("1 kit × ₹500/kit = ₹500 (50000 paise)", r4.commission_paise === 50000, `Got: ${r4.commission_paise}`);

// ── 3. Min eligible quantity ──────────────────────────────────────────────────
console.log("\n3. Minimum eligible quantity");
const minRule = { commission_method: 'FIXED_PER_KIT', fixed_amount_per_kit_paise: 50000, min_eligible_quantity: 10, max_commission_paise: null };

const r5 = calculateCommissionAmount({ commission_rule: minRule, eligible_kit_quantity: 9, gross_eligible_paise: 0 });
assert("9 kits (< min 10) → commission = 0", r5.commission_paise === 0, `Got: ${r5.commission_paise}`);

const r6 = calculateCommissionAmount({ commission_rule: minRule, eligible_kit_quantity: 10, gross_eligible_paise: 0 });
assert("10 kits (== min 10) → commission > 0", r6.commission_paise === 500000, `Got: ${r6.commission_paise}`);

// ── 4. Max commission cap ─────────────────────────────────────────────────────
console.log("\n4. Maximum commission cap");
const cappedRule = { commission_method: 'FIXED_PER_KIT', fixed_amount_per_kit_paise: 50000, min_eligible_quantity: 0, max_commission_paise: 1000000 };

const r7 = calculateCommissionAmount({ commission_rule: cappedRule, eligible_kit_quantity: 100, gross_eligible_paise: 0 });
assert("100 kits × ₹500 = ₹50000 (5000000p) capped at ₹10000 (1000000p)", r7.commission_paise === 1000000, `Got: ${r7.commission_paise}`);
assert("Capped flag is true", r7.capped);

const r8 = calculateCommissionAmount({ commission_rule: cappedRule, eligible_kit_quantity: 5, gross_eligible_paise: 0 });
assert("5 kits × ₹500 = ₹2500 (250000p), under cap", r8.commission_paise === 250000, `Got: ${r8.commission_paise}`);
assert("Capped flag is false when under cap", !r8.capped);

// ── 5. No rule ────────────────────────────────────────────────────────────────
console.log("\n5. No commission rule");
const r9 = calculateCommissionAmount({ commission_rule: null, eligible_kit_quantity: 30, gross_eligible_paise: 100000 });
assert("Null rule → commission = 0", r9.commission_paise === 0);

// ── 6. Zero quantity ──────────────────────────────────────────────────────────
console.log("\n6. Zero eligible quantity");
const r10 = calculateCommissionAmount({ commission_rule: fixedRule, eligible_kit_quantity: 0, gross_eligible_paise: 0 });
assert("0 kits → commission = 0", r10.commission_paise === 0);

// ── 7. Partial return scenario ────────────────────────────────────────────────
console.log("\n7. Partial return: 30 delivered, 5 returned → 25 eligible");
const r11 = calculateCommissionAmount({ commission_rule: fixedRule, eligible_kit_quantity: 25, gross_eligible_paise: 0 });
assert("25 kits × ₹500 = ₹12500 (1250000 paise)", r11.commission_paise === 1250000, `Got: ${r11.commission_paise}`);

console.log(`\n=== Results: ${passed} passed, ${failed} failed ===\n`);
process.exit(failed > 0 ? 1 : 0);
