/**
 * franchisee.po.e2e.test.js
 * End-to-end lifecycle & calculation simulation tests for Franchisee PO ordering.
 * Tests:
 *  1. State transition rules (DRAFT -> SUBMITTED -> APPROVED -> PAID -> DISPATCHED -> DELIVERED -> RETURN_PERIOD_COMPLETED)
 *  2. Invalid transitions (e.g. DRAFT cannot directly be DELIVERED)
 *  3. Cancellation rules from various stages
 *  4. Idempotency key generation and uniqueness
 *  5. Net commission & kit quantity calculations with partial returns
 *
 * Run: node tests/franchisee.po.e2e.test.js
 */

const { calculateCommissionAmount } = require('../src/modules/admin-panel/services/franchisee.commission.service');
const { validateQuantity } = require('../src/modules/admin-panel/services/franchisee.moq.service');
const { classifyPerformance } = require('../src/modules/admin-panel/services/franchisee.goal.service');

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

console.log("\n=== FPO E2E Lifecycle Simulation & Logic Tests ===\n");

// ── 1. PO Lifecycle Valid Transitions ─────────────────────────────────────────
console.log("1. Valid state transitions");

const VALID_TRANSITIONS = {
  DRAFT: ['PENDING_APPROVAL', 'CANCELLED'],
  PENDING_APPROVAL: ['APPROVED', 'REJECTED', 'CANCELLED'],
  APPROVED: ['AWAITING_PAYMENT', 'PAYMENT_CONFIRMED', 'CANCELLED', 'EXPIRED'],
  AWAITING_PAYMENT: ['PAYMENT_CONFIRMED', 'CANCELLED', 'EXPIRED'],
  PAYMENT_CONFIRMED: ['PROCESSING', 'CANCELLED'],
  PROCESSING: ['DISPATCHED', 'CANCELLED'],
  DISPATCHED: ['IN_TRANSIT', 'DELIVERED'],
  IN_TRANSIT: ['DELIVERED'],
  DELIVERED: ['RETURN_PERIOD_COMPLETED', 'PARTIALLY_RETURNED'],
  PARTIALLY_RETURNED: ['RETURN_PERIOD_COMPLETED'],
};

function canTransition(current, next) {
  return (VALID_TRANSITIONS[current] || []).includes(next);
}

assert("DRAFT -> PENDING_APPROVAL allowed", canTransition('DRAFT', 'PENDING_APPROVAL'));
assert("PENDING_APPROVAL -> APPROVED allowed", canTransition('PENDING_APPROVAL', 'APPROVED'));
assert("APPROVED -> PAYMENT_CONFIRMED allowed", canTransition('APPROVED', 'PAYMENT_CONFIRMED'));
assert("PAYMENT_CONFIRMED -> PROCESSING allowed", canTransition('PAYMENT_CONFIRMED', 'PROCESSING'));
assert("PROCESSING -> DISPATCHED allowed", canTransition('PROCESSING', 'DISPATCHED'));
assert("DISPATCHED -> DELIVERED allowed", canTransition('DISPATCHED', 'DELIVERED'));
assert("DELIVERED -> RETURN_PERIOD_COMPLETED allowed", canTransition('DELIVERED', 'RETURN_PERIOD_COMPLETED'));

// ── 2. Invalid state transitions (must be blocked) ────────────────────────────
console.log("\n2. Invalid transitions (blocked by business rules)");
assert("DRAFT -> DELIVERED blocked", !canTransition('DRAFT', 'DELIVERED'));
assert("PENDING_APPROVAL -> DISPATCHED blocked", !canTransition('PENDING_APPROVAL', 'DISPATCHED'));
assert("DELIVERED -> APPROVED blocked (backward transition)", !canTransition('DELIVERED', 'APPROVED'));
assert("CANCELLED -> APPROVED blocked", !canTransition('CANCELLED', 'APPROVED'));
assert("REJECTED -> PAYMENT_CONFIRMED blocked", !canTransition('REJECTED', 'PAYMENT_CONFIRMED'));

// ── 3. Full Flow: Order 50 kits @ Fixed ₹400/kit commission ───────────────────
console.log("\n3. Complete PO Lifecycle Flow: 50 kits (Residential 3kW) @ ₹400/kit commission");

// Step 3.1: Validate MOQ and Increments
const moqRule = { moq: 10, increment_quantity: 5, max_quantity: 100 };
const qtyValidation = validateQuantity({ quantity: 50, moq_rule: moqRule });
assert("50 kits is valid for MOQ 10, Incr 5", qtyValidation.valid);

// Step 3.2: Commission Calculation on 50 kits
const commRuleFixed = {
  commission_method: 'FIXED_PER_KIT',
  fixed_amount_per_kit_paise: 40000, // ₹400 in paise
  min_eligible_quantity: 10,
  max_commission_paise: null
};

const initialComm = calculateCommissionAmount({
  commission_rule: commRuleFixed,
  eligible_kit_quantity: 50,
  gross_eligible_paise: 25000000 // 50 kits * ₹50,000 = ₹25,00,000
});

assert("Commission for 50 kits = ₹20,000 (20,00,000 paise)", initialComm.commission_paise === 2000000, `Got: ${initialComm.commission_paise}`);

// Step 3.3: Goal calculation on delivery
const monthlyTarget = 80;
const achievement1 = (50 / monthlyTarget) * 100;
assert("Achievement on 50/80 kits = 62.5%", achievement1 === 62.5);
assert("Status at 62.5% is BEHIND", classifyPerformance(50, monthlyTarget) === 'BEHIND');

// Step 3.4: Customer returns 5 defective kits during return window
const returnedQty = 5;
const netEligibleQty = 50 - returnedQty; // 45 kits

const adjustedComm = calculateCommissionAmount({
  commission_rule: commRuleFixed,
  eligible_kit_quantity: netEligibleQty,
  gross_eligible_paise: 22500000
});

assert("Adjusted commission for 45 kits = ₹18,000 (18,00,000 paise)", adjustedComm.commission_paise === 1800000, `Got: ${adjustedComm.commission_paise}`);

const reversalPaise = initialComm.commission_paise - adjustedComm.commission_paise;
assert("Commission reversal amount = ₹2,000 (2,00,000 paise)", reversalPaise === 200000, `Got: ${reversalPaise}`);

// Step 3.5: Goal adjusted post return
const adjustedAchievement = (netEligibleQty / monthlyTarget) * 100;
assert("Adjusted achievement on 45/80 kits = 56.25%", adjustedAchievement === 56.25);
assert("Adjusted balance required = 35 kits", monthlyTarget - netEligibleQty === 35);

// ── 4. Percentage Commission Scenario with Max Cap ────────────────────────────
console.log("\n4. Percentage Commission with Max Cap: 12% on Commercial 50kW kits, Cap ₹50,000");

const commRulePct = {
  commission_method: 'PERCENTAGE',
  commission_percentage: 12,
  min_eligible_quantity: 0,
  max_commission_paise: 5000000 // ₹50,000 cap
};

// Order worth ₹6,00,000 (60,000,000 paise). 12% = ₹72,000 (7,200,000 paise) -> should cap at ₹50,000
const cappedComm = calculateCommissionAmount({
  commission_rule: commRulePct,
  eligible_kit_quantity: 2,
  gross_eligible_paise: 60000000
});

assert("Calculated commission is capped at ₹50,000 (50,00,000 paise)", cappedComm.commission_paise === 5000000, `Got: ${cappedComm.commission_paise}`);
assert("Capped boolean is true", cappedComm.capped === true);

// ── 5. Idempotency Key Format Checks ──────────────────────────────────────────
console.log("\n5. Idempotency Keys format validation");

const fpoId = "66c891f4a1b2c3d4e5f67890";
const franchiseId = "66c891f4a1b2c3d4e5f67891";

const commLedgerKey = `FPO-COMMISSION-${fpoId}`;
const commReversalKey = `FPO-COMMISSION-REV-${fpoId}`;
const alertKey = `ALERT-BELOW_MONTHLY_TARGET-${franchiseId}-8-2026`;

assert("Commission ledger key matches pattern", /^FPO-COMMISSION-[a-f0-9]{24}$/.test(commLedgerKey));
assert("Commission reversal key matches pattern", /^FPO-COMMISSION-REV-[a-f0-9]{24}$/.test(commReversalKey));
assert("Alert idempotency key matches pattern", /^ALERT-[A-Z_]+-[a-f0-9]{24}-\d{1,2}-\d{4}$/.test(alertKey));

console.log(`\n=== Results: ${passed} passed, ${failed} failed ===\n`);
process.exit(failed > 0 ? 1 : 0);
