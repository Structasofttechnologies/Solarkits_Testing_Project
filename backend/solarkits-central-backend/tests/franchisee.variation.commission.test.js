/**
 * franchisee.variation.commission.test.js
 * Test variation commission tier resolution logic.
 */

const { resolveVariationCommission } = require('../src/modules/admin-panel/services/franchisee.commission.service');

console.log("=== Testing resolveVariationCommission ===\n");

// Mock FranchiseeVariationCommission
const { FranchiseeVariationCommission } = require('../src/modules/admin-panel/models/india_solarshop_db');

const mockRules = [
  { reseller_id: 'reseller1', combo_kit_id: 'kit1', order_type: 'loose', order_quantity: 35, commission_amount_paise: 2000000 },
  { reseller_id: 'reseller1', combo_kit_id: 'kit1', order_type: 'loose', order_quantity: 10, commission_amount_paise: 500000 },
  { reseller_id: 'reseller1', combo_kit_id: 'kit1', order_type: 'loose', order_quantity: 5, commission_amount_paise: 250000 },
  { reseller_id: 'reseller1', combo_kit_id: 'kit1', order_type: 'po', order_quantity: 5, commission_amount_paise: 150000 },
];

FranchiseeVariationCommission.find = function (query) {
  return {
    sort: function () {
      return {
        lean: async function () {
          return mockRules
            .filter((r) =>
              r.reseller_id === query.reseller_id &&
              r.combo_kit_id === query.combo_kit_id &&
              r.order_type === query.order_type
            )
            .sort((a, b) => b.order_quantity - a.order_quantity);
        }
      };
    }
  };
};

async function runTests() {
  let passed = 0;
  let failed = 0;

  function assert(desc, condition, detail = "") {
    if (condition) {
      console.log(`  ✅ ${desc}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${desc} ${detail}`);
      failed++;
    }
  }

  // 1. Exact match on 5 kits
  const c5 = await resolveVariationCommission({ reseller_id: 'reseller1', combo_kit_id: 'kit1', quantity: 5, order_type: 'loose' });
  assert("5 kits order matches 5 kits tier (₹2,500 = 250000 paise)", c5 === 250000, `Got: ${c5}`);

  // 2. Exact match on 10 kits
  const c10 = await resolveVariationCommission({ reseller_id: 'reseller1', combo_kit_id: 'kit1', quantity: 10, order_type: 'loose' });
  assert("10 kits order matches 10 kits tier (₹5,000 = 500000 paise)", c10 === 500000, `Got: ${c10}`);

  // 3. Exact match on 35 kits
  const c35 = await resolveVariationCommission({ reseller_id: 'reseller1', combo_kit_id: 'kit1', quantity: 35, order_type: 'loose' });
  assert("35 kits order matches 35 kits tier (₹20,000 = 2000000 paise)", c35 === 2000000, `Got: ${c35}`);

  // 4. In-between quantity (7 kits) -> qualifies for 5 kit tier
  const c7 = await resolveVariationCommission({ reseller_id: 'reseller1', combo_kit_id: 'kit1', quantity: 7, order_type: 'loose' });
  assert("7 kits order qualifies for 5 kits tier (250000 paise)", c7 === 250000, `Got: ${c7}`);

  // 5. PO order type vs Loose order type
  const c5po = await resolveVariationCommission({ reseller_id: 'reseller1', combo_kit_id: 'kit1', quantity: 5, order_type: 'po' });
  assert("5 kits PO order matches PO tier (₹1,500 = 150000 paise)", c5po === 150000, `Got: ${c5po}`);

  // 6. No rules for unknown kit
  const cNone = await resolveVariationCommission({ reseller_id: 'reseller1', combo_kit_id: 'kit_unknown', quantity: 5, order_type: 'loose' });
  assert("Unknown kit returns null", cNone === null, `Got: ${cNone}`);

  console.log(`\n=== Results: ${passed} passed, ${failed} failed ===\n`);
  process.exit(failed > 0 ? 1 : 0);
}

runTests();
