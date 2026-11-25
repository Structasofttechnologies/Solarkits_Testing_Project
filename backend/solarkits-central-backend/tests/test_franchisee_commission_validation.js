/**
 * test_franchisee_commission_validation.js
 *
 * Verifies Franchise Commission Setting validation during PO creation:
 * 1. Blocks PO creation when commission is NOT defined for franchise + kit.
 * 2. Allows PO creation when commission IS defined.
 * 3. Proper error message stating commission setting is not defined.
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const mongoose = require('mongoose');
const { FranchiseeVariationCommission, FranchiseeCommissionRule, FpoOrder, Reseller, ResellerPlanSubscription, ResellerPlan, FranchiseePlanPoSetting, FranchiseeMoqRule, ResellerProductAuthorization } = require('../src/modules/admin-panel/models/india_solarshop_db');
const { createPoDraft } = require('../src/modules/admin-panel/services/franchisee.po.service');

console.log("=== Testing Franchise Commission Setting PO Validation ===\n");

// Mock ResellerProductAuthorization.find
ResellerProductAuthorization.find = function () {
  return {
    lean: async function () {
      return [];
    }
  };
};

// Mock ResellerPlan.findOne
ResellerPlan.findOne = function () {
  return {
    lean: async function () {
      return {
        _id: planId,
        name: 'Standard Franchise Plan',
        default_commission_rate: 8,
      };
    }
  };
};

// Mock FranchiseeCommissionRule.findOne
FranchiseeCommissionRule.findOne = function () {
  return {
    sort: function () {
      return {
        lean: async function () {
          return null;
        }
      };
    }
  };
};

// Mock FranchiseeMoqRule.find
FranchiseeMoqRule.find = function () {
  return {
    sort: function () {
      return {
        lean: async function () {
          return [];
        }
      };
    }
  };
};

const franchiseId = new mongoose.Types.ObjectId().toString();
const kitConfiguredId = new mongoose.Types.ObjectId().toString();
const kitUnconfiguredId = new mongoose.Types.ObjectId().toString();
const planId = new mongoose.Types.ObjectId().toString();

// Mock Reseller.findOne
Reseller.findOne = function () {
  const resellerObj = {
    _id: franchiseId,
    name: 'Hinduja Enterprises',
    business_name: 'Hinduja Enterprises',
    activation_status: 'active',
    reseller_lifecycle_status: 'active',
    active_plan_id: planId,
  };
  return {
    populate: function () {
      return {
        lean: async function () {
          return resellerObj;
        }
      };
    },
    lean: async function () {
      return resellerObj;
    }
  };
};

// Mock FranchiseeVariationCommission
const mockCommissionRules = [
  {
    reseller_id: franchiseId,
    combo_kit_id: kitConfiguredId,
    order_type: 'po',
    order_quantity: 200,
    commission_amount_paise: 5000000, // ₹50,000
    is_active: true,
    deleted_at: null,
  },
];

FranchiseeVariationCommission.find = function (query) {
  return {
    sort: function () {
      return {
        lean: async function () {
          return mockCommissionRules.filter((r) =>
            String(r.reseller_id) === String(query.reseller_id) &&
            String(r.combo_kit_id) === String(query.combo_kit_id) &&
            r.order_type === query.order_type
          );
        }
      };
    }
  };
};

FranchiseeVariationCommission.findOne = function (query) {
  return {
    lean: async function () {
      return mockCommissionRules.find((r) =>
        String(r.reseller_id) === String(query.reseller_id) &&
        String(r.combo_kit_id) === String(query.combo_kit_id) &&
        r.order_type === query.order_type &&
        r.is_active === query.is_active &&
        r.deleted_at === query.deleted_at &&
        r.commission_amount_paise > 0
      ) || null;
    }
  };
};

// Mock other required DB lookups for createPoDraft
ResellerPlanSubscription.findOne = function () {
  return {
    populate: function () {
      return {
        sort: function () {
          return {
            lean: async function () {
              return {
                status: 'active',
                plan_id: { _id: planId, name: 'Standard Franchise Plan' }
              };
            }
          };
        },
        lean: async function () {
          return {
            status: 'active',
            plan_id: { _id: planId, name: 'Standard Franchise Plan' }
          };
        }
      };
    }
  };
};

FranchiseePlanPoSetting.find = function () {
  return {
    lean: async function () {
      return [{
        plan_id: planId,
        is_active: true,
        po_enabled: true,
        min_po_quantity: 10,
        max_po_quantity: 1000,
        allowed_combo_kit_ids: [kitConfiguredId, kitUnconfiguredId],
      }];
    }
  };
};

FpoOrder.prototype.save = async function () {
  return this;
};
FpoOrder.create = async function (data) {
  return { _id: new mongoose.Types.ObjectId(), po_number: 'PO-TEST-001', ...data };
};
FpoOrder.countDocuments = async function () {
  return 0;
};
FpoOrder.findOne = function () {
  return {
    sort: function () {
      return {
        select: function () {
          return {
            lean: async function () {
              return null;
            }
          };
        },
        lean: async function () {
          return null;
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

  // 1. PO creation for UNCONFIGURED product should be BLOCKED
  try {
    await createPoDraft({
      franchisee_id: franchiseId,
      order_type: 'po_order',
      target_committed_quantity: 200,
      items: [
        {
          combo_kit_id: kitUnconfiguredId,
          item_name: '2 K.W. Solarkits DCR Combokit',
          quantity: 200,
          unit_price_paise: 6000000,
        }
      ],
    });
    assert("Unconfigured kit PO should fail", false, "Did not throw error!");
  } catch (err) {
    const isExpected = err.message.includes('Commission setting is not defined for product');
    assert("Unconfigured kit PO throws commission not defined error", isExpected, `Message: "${err.message}"`);
  }

  // 2. PO creation for CONFIGURED product should SUCCEED
  try {
    const result = await createPoDraft({
      franchisee_id: franchiseId,
      order_type: 'po_order',
      target_committed_quantity: 200,
      items: [
        {
          combo_kit_id: kitConfiguredId,
          item_name: '1 K.W. Solarkits DCR Kit',
          quantity: 200,
          unit_price_paise: 3500000,
        }
      ],
    });
    assert("Configured kit PO succeeds", Boolean(result && result.order), "No order returned");
  } catch (err) {
    assert("Configured kit PO succeeds without throwing error", false, err.message);
  }

  console.log(`\n=== Results: ${passed} passed, ${failed} failed ===\n`);
  process.exit(failed > 0 ? 1 : 0);
}

runTests();
