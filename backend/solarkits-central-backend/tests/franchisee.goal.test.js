/**
 * franchisee.goal.test.js
 * Unit tests for franchisee.goal.service — classifyPerformance() function.
 * Run: node tests/franchisee.goal.test.js
 */

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

console.log("\n=== Goal Service: classifyPerformance() ===\n");

// ── 1. No target ──────────────────────────────────────────────────────────────
console.log("1. No target (target_quantity = 0)");
assert("NO_TARGET when target=0",   classifyPerformance(0, 0)   === "NO_TARGET");
assert("NO_TARGET when target=null", classifyPerformance(50, null) === "NO_TARGET");

// ── 2. Not started ────────────────────────────────────────────────────────────
console.log("\n2. Not started");
assert("NOT_STARTED at 0%", classifyPerformance(0, 100) === "NOT_STARTED");

// ── 3. Low performance / Behind ──────────────────────────────────────────────
console.log("\n3. Low performance / Behind (1%-74% → BEHIND per BEHIND threshold=1)");
assert("BEHIND at 1%",  classifyPerformance(1, 100)  === "BEHIND");
assert("BEHIND at 10%", classifyPerformance(10, 100) === "BEHIND");
assert("BEHIND at 50%", classifyPerformance(50, 100) === "BEHIND");

// ── 4. Behind ────────────────────────────────────────────────────────────────
console.log("\n4. Still Behind at 60-74%");
assert("Behind at 74%", classifyPerformance(74, 100) === "BEHIND");
assert("Behind at 60%", classifyPerformance(60, 100) === "BEHIND");

// ── 5. On track ───────────────────────────────────────────────────────────────
console.log("\n5. On track (75% - 99%)");
assert("ON_TRACK at 75%", classifyPerformance(75, 100)  === "ON_TRACK");
assert("ON_TRACK at 99%", classifyPerformance(99, 100)  === "ON_TRACK");
assert("ON_TRACK at 80%", classifyPerformance(80, 100)  === "ON_TRACK");

// ── 6. Achieved ───────────────────────────────────────────────────────────────
console.log("\n6. Achieved (100% - 119%)");
assert("ACHIEVED at 100%", classifyPerformance(100, 100) === "ACHIEVED");
assert("ACHIEVED at 100 / 100 kits", classifyPerformance(100, 100) === "ACHIEVED");
assert("ACHIEVED at 110%", classifyPerformance(110, 100) === "ACHIEVED");
assert("ACHIEVED at 119%", classifyPerformance(119, 100) === "ACHIEVED");

// ── 7. Exceeded ───────────────────────────────────────────────────────────────
console.log("\n7. Exceeded (>= 120%)");
assert("EXCEEDED at 120%", classifyPerformance(120, 100)  === "EXCEEDED");
assert("EXCEEDED at 150%", classifyPerformance(150, 100)  === "EXCEEDED");
assert("EXCEEDED at 200%", classifyPerformance(200, 100)  === "EXCEEDED");

// ── 8. Achievement calculation logic ─────────────────────────────────────────
console.log("\n8. Achievement percentage correctness");
function calcPct(eligible, target) {
  return target > 0 ? Math.round((eligible / target) * 10000) / 100 : 0;
}
const pct1 = calcPct(30, 500);
assert("30/500 = 6.00%", pct1 === 6.00, `Got: ${pct1}`);
const pct2 = calcPct(500, 500);
assert("500/500 = 100.00%", pct2 === 100.00, `Got: ${pct2}`);
const pct3 = calcPct(150, 100);
assert("150/100 = 150.00%", pct3 === 150.00, `Got: ${pct3}`);
const pct4 = calcPct(0, 0);
assert("0/0 = 0 (no target)", pct4 === 0);

// ── 9. Balance quantity logic ─────────────────────────────────────────────────
console.log("\n9. Balance quantity calculation");
function calcBalance(eligible, target) {
  return Math.max(0, target - eligible);
}
assert("balance(30, 500) = 470",   calcBalance(30, 500)   === 470);
assert("balance(500, 500) = 0",    calcBalance(500, 500)  === 0);
assert("balance(150, 100) = 0",    calcBalance(150, 100)  === 0); // No negative balance
assert("balance(0, 100) = 100",    calcBalance(0, 100)    === 100);

// ── 10. Eligible quantity logic ───────────────────────────────────────────────
console.log("\n10. Eligible quantity calculation");
function calcEligible(delivered, cancelled, returned) {
  return Math.max(0, delivered - cancelled - returned);
}
assert("30 delivered - 0 returned = 30",   calcEligible(30, 0, 0)  === 30);
assert("30 delivered - 5 returned = 25",   calcEligible(30, 0, 5)  === 25);
assert("30 delivered - 5 cancelled = 25",  calcEligible(30, 5, 0)  === 25);
assert("30 delivered - 35 adjustments = 0 (floor 0)", calcEligible(30, 20, 20) === 0);

console.log(`\n=== Results: ${passed} passed, ${failed} failed ===\n`);
process.exit(failed > 0 ? 1 : 0);
