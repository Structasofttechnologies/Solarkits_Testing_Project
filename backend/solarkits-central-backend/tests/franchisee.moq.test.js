/**
 * franchisee.moq.test.js
 * Unit tests for franchisee.moq.service — validateQuantity() function.
 * Run: node tests/franchisee.moq.test.js
 */

const { validateQuantity } = require('../src/modules/admin-panel/services/franchisee.moq.service');

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

function makeRule(moq, inc, max = null) {
  return { moq, increment_quantity: inc, max_quantity: max, po_quantity_limit: null };
}

function makePoSettings(min, max) {
  return { min_po_quantity: min, max_po_quantity: max };
}

console.log("\n=== MOQ Service: validateQuantity() ===\n");

// ── 1. No rules ───────────────────────────────────────────────────────────────
console.log("1. No rules (any positive integer is valid)");
assert("Q=1 valid with no rules",  validateQuantity({ quantity: 1, moq_rule: null, po_settings: null }).valid);
assert("Q=999 valid with no rules", validateQuantity({ quantity: 999, moq_rule: null, po_settings: null }).valid);
assert("Q=0 invalid",  !validateQuantity({ quantity: 0, moq_rule: null, po_settings: null }).valid);
assert("Q=-1 invalid", !validateQuantity({ quantity: -1, moq_rule: null, po_settings: null }).valid);
assert("Q=1.5 invalid (non-integer)", !validateQuantity({ quantity: 1.5, moq_rule: null, po_settings: null }).valid);

// ── 2. MOQ only (no increment) ────────────────────────────────────────────────
console.log("\n2. MOQ=10, increment=1 (any Q >= 10 is valid)");
const moq10 = makeRule(10, 1);
assert("Q=10 valid", validateQuantity({ quantity: 10, moq_rule: moq10 }).valid);
assert("Q=11 valid", validateQuantity({ quantity: 11, moq_rule: moq10 }).valid);
assert("Q=100 valid", validateQuantity({ quantity: 100, moq_rule: moq10 }).valid);
assert("Q=9 invalid (below MOQ)", !validateQuantity({ quantity: 9, moq_rule: moq10 }).valid);

// ── 3. MOQ + increment ────────────────────────────────────────────────────────
console.log("\n3. MOQ=10, increment=5");
const moq10inc5 = makeRule(10, 5);
assert("Q=10 valid (== MOQ)",     validateQuantity({ quantity: 10, moq_rule: moq10inc5 }).valid);
assert("Q=15 valid (MOQ+1×inc)", validateQuantity({ quantity: 15, moq_rule: moq10inc5 }).valid);
assert("Q=20 valid (MOQ+2×inc)", validateQuantity({ quantity: 20, moq_rule: moq10inc5 }).valid);
assert("Q=11 invalid (not on increment)", !validateQuantity({ quantity: 11, moq_rule: moq10inc5 }).valid);
assert("Q=12 invalid", !validateQuantity({ quantity: 12, moq_rule: moq10inc5 }).valid);
assert("Q=14 invalid", !validateQuantity({ quantity: 14, moq_rule: moq10inc5 }).valid);
assert("Q=9 invalid (below MOQ)", !validateQuantity({ quantity: 9, moq_rule: moq10inc5 }).valid);

// ── 4. Max quantity limit ─────────────────────────────────────────────────────
console.log("\n4. MOQ=10, increment=5, max=30");
const moqMax30 = makeRule(10, 5, 30);
assert("Q=30 valid (== max)",  validateQuantity({ quantity: 30, moq_rule: moqMax30 }).valid);
assert("Q=35 invalid (> max)", !validateQuantity({ quantity: 35, moq_rule: moqMax30 }).valid);
assert("Q=10 still valid",     validateQuantity({ quantity: 10, moq_rule: moqMax30 }).valid);

// ── 5. Plan PO quantity limits ────────────────────────────────────────────────
console.log("\n5. Plan PO limits: min=25, max=100");
const poSet = makePoSettings(25, 100);
assert("Q=25 valid (== plan min)", validateQuantity({ quantity: 25, moq_rule: null, po_settings: poSet }).valid);
assert("Q=100 valid (== plan max)", validateQuantity({ quantity: 100, moq_rule: null, po_settings: poSet }).valid);
assert("Q=24 invalid (< plan min)", !validateQuantity({ quantity: 24, moq_rule: null, po_settings: poSet }).valid);
assert("Q=101 invalid (> plan max)", !validateQuantity({ quantity: 101, moq_rule: null, po_settings: poSet }).valid);

// ── 6. Combined: MOQ rule + plan limits ───────────────────────────────────────
console.log("\n6. Combined MOQ=10,inc=5 + plan min=25,max=100");
const moqRule = makeRule(10, 5);
assert("Q=25 valid (>= MOQ, on increment, within plan)",  validateQuantity({ quantity: 25, moq_rule: moqRule, po_settings: poSet }).valid);
assert("Q=10 invalid (< plan min=25)", !validateQuantity({ quantity: 10, moq_rule: moqRule, po_settings: poSet }).valid);
assert("Q=30 valid", validateQuantity({ quantity: 30, moq_rule: moqRule, po_settings: poSet }).valid);
assert("Q=100 valid", validateQuantity({ quantity: 100, moq_rule: moqRule, po_settings: poSet }).valid);
assert("Q=27 invalid (not on increment)", !validateQuantity({ quantity: 27, moq_rule: moqRule, po_settings: poSet }).valid);

// ── 7. Error messages ─────────────────────────────────────────────────────────
console.log("\n7. Error message quality");
const r1 = validateQuantity({ quantity: 9, moq_rule: makeRule(10, 5), project_type_name: "Combo Kit" });
assert("Below MOQ message mentions MOQ", r1.reason?.includes("10"), r1.reason);
const r2 = validateQuantity({ quantity: 12, moq_rule: makeRule(10, 5), project_type_name: "Combo Kit" });
assert("Increment message mentions increment", r2.reason?.includes("5"), r2.reason);
const r3 = validateQuantity({ quantity: 24, moq_rule: null, po_settings: makePoSettings(25, 100) });
assert("Plan min message mentions plan min", r3.reason?.includes("25"), r3.reason);

// ── Summary ───────────────────────────────────────────────────────────────────
console.log(`\n=== Results: ${passed} passed, ${failed} failed ===\n`);
process.exit(failed > 0 ? 1 : 0);
