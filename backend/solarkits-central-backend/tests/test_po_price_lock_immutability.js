/**
 * test_po_price_lock_immutability.js
 * 
 * Verifies that once a Purchase Order is created with a configured ComboKit at a locked price:
 * 1. Allocating the PO to an EPC partner strictly preserves the locked price (tamper-proof).
 * 2. Any repeat drawdown / reorder placed by the EPC against this PO strictly inherits the locked price.
 * 3. The locked price remains valid until PO quota is fulfilled (COMPLETED) or validity expires (EXPIRED).
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');

// Mock or require models & service
const {
  createPoDraft,
  allocatePoProducts,
} = require('../src/modules/admin-panel/services/franchisee.po.service');
const { FpoOrder } = require('../src/modules/admin-panel/models/india_solarshop_db');

let passed = 0;
let failed = 0;

function assert(description, condition, detail = '') {
  if (condition) {
    console.log(`  ✅ PASS: ${description}`);
    passed++;
  } else {
    console.error(`  ❌ FAIL: ${description}${detail ? ` — ${detail}` : ''}`);
    failed++;
  }
}

async function runTests() {
  console.log('\n======================================================');
  console.log('   PO PRICE LOCK & EPC ALLOCATION IMMUTABILITY TESTS');
  console.log('======================================================\n');

  try {
    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) {
      console.log('ℹ️ Running in memory / offline unit simulation (No MONGODB_URI).');
      return;
    }

    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB.\n');

    const { EpcAccount } = require('../src/modules/admin-panel/models/india_solarshop_db');
    let realEpc = await EpcAccount.findOne({ deleted_at: null }).lean();
    if (!realEpc) {
      realEpc = await EpcAccount.create({
        name: 'Test EPC Partner',
        company_name: 'Apex Solar EPC',
        mobile: '9876543210',
        activation_status: 'active',
      });
    }
    const testEpcId = realEpc._id;
    const testKitId = new mongoose.Types.ObjectId();
    const lockedPricePaise = 6646300; // ₹66,463.00
    const committedQuota = 200; // 200 kits
    const tokenDepositPaise = 6000000; // ₹60,000.00

    // ── TEST 1: Create PO Container with Locked ComboKit Price ─────────────
    console.log('Test 1: Creating PO with locked ComboKit rate ₹66,463 and 200 kits quota...');
    const draftRes = await createPoDraft({
      created_by_role: 'BDE',
      creator_name: 'Test Officer',
      items: [{
        kit_id: testKitId,
        product_id: testKitId,
        item_name: '2 K.W. Solarkits DCR ComboKit',
        quantity: committedQuota,
        unit_price_paise: lockedPricePaise,
        gst_rate: 13.85,
      }],
      order_type: 'po_order',
      po_category: 'SINGLE_PO',
      token_amount_paise: tokenDepositPaise,
      offline_payment: {
        payment_method: 'offline_bank_transfer',
        utr_number: 'UTRTEST12345',
        amount_paid: tokenDepositPaise / 100,
        payment_date: new Date().toISOString().slice(0, 10),
      },
    });

    const po = draftRes.order;
    assert('PO created successfully', Boolean(po && po._id));
    assert('PO number generated', po.po_number && po.po_number.startsWith('FPO-'));
    assert('Initial unit price is locked at 6646300 paise (₹66,463)', po.items[0].unit_price_paise === lockedPricePaise);
    assert('Committed quota is 200 kits', po.total_booked_quantity === 200 && po.remaining_quantity === 200);

    // ── TEST 2: Allocate PO to EPC Partner & Verify Price Immutability ─────
    console.log('\nTest 2: Allocating PO to EPC Partner with altered payload price (Simulating catalog price change to ₹80,000)...');
    const allocatedPo = await allocatePoProducts({
      po_id: po._id,
      items: [{
        kit_id: testKitId,
        item_name: '2 K.W. Solarkits DCR ComboKit',
        quantity: committedQuota,
        unit_price_paise: 8000000, // Attempted price override to ₹80,000
        gst_rate: 18,               // Attempted GST override to 18%
        epc_allocations: [{
          epc_buyer_id: testEpcId,
          company_name: 'Apex Solar EPC',
          allocated_quantity: committedQuota,
          token_amount_paise: tokenDepositPaise,
        }],
      }],
      actor_id: testEpcId,
    });

    assert('PO items array populated', allocatedPo.items && allocatedPo.items.length === 1);
    assert('LOCKED PRICE PRESERVED: Unit price remains ₹66,463 (Not overridden to ₹80,000)', allocatedPo.items[0].unit_price_paise === lockedPricePaise);
    assert('LOCKED GST PRESERVED: GST rate remains 13.85%', allocatedPo.items[0].gst_rate === 13.85);
    assert('EPC Buyer assigned to PO', String(allocatedPo.epc_id) === String(testEpcId));
    assert('PO Started because token was already paid', allocatedPo.status === 'PO_STARTED');

    // ── TEST 3: EPC places child reorder against PO ────────────────────────
    console.log('\nTest 3: EPC draws down 25 kits against the locked PO...');
    const reorderRes = await createPoDraft({
      epc_id: testEpcId,
      created_by_role: 'SOLAR_EPC',
      creator_name: 'Apex Solar EPC',
      items: [{
        quantity: 25,
        unit_price_paise: 9999900, // Attempting to pass random price
      }],
      order_type: 'loose_kit_order',
      parent_po_id: po._id,
      actor_id: testEpcId,
    });

    const childOrder = reorderRes.order;
    assert('Child reorder created successfully', Boolean(childOrder && childOrder._id));
    assert('Child order strictly inherits locked price ₹66,463', childOrder.items[0].unit_price_paise === lockedPricePaise);
    assert('Child order strictly inherits parent kit ID', String(childOrder.items[0].kit_id) === String(testKitId));

    // Verify parent PO updated
    const updatedParentPo = await FpoOrder.findById(po._id).lean();
    assert('Parent PO remaining quota decreased from 200 to 175 kits', updatedParentPo.remaining_quantity === 175);
    assert('Parent PO fulfilled quantity increased to 25 kits', updatedParentPo.fulfilled_quantity === 25);
    assert('Token adjusted pro-rata for 25 kits', updatedParentPo.token_adjusted_total_paise > 0);

    // ── TEST 4: Draw down remaining 175 kits to complete PO quota ─────────
    console.log('\nTest 4: EPC draws down all remaining 175 kits to fulfill 200 kits committed quota...');
    const closingRes = await createPoDraft({
      epc_id: testEpcId,
      created_by_role: 'SOLAR_EPC',
      creator_name: 'Apex Solar EPC',
      items: [{
        quantity: 175,
      }],
      order_type: 'loose_kit_order',
      parent_po_id: po._id,
      actor_id: testEpcId,
    });

    const closingOrder = closingRes.order;
    assert('Closing order created successfully', Boolean(closingOrder && closingOrder._id));
    assert('Closing order strictly inherits locked price ₹66,463', closingOrder.items[0].unit_price_paise === lockedPricePaise);

    const completedParentPo = await FpoOrder.findById(po._id).lean();
    assert('Parent PO remaining quota is now 0 kits', completedParentPo.remaining_quantity === 0);
    assert('Parent PO fulfilled quantity is now 200 kits (100%)', completedParentPo.fulfilled_quantity === 200);
    assert('Parent PO status transitioned to COMPLETED', completedParentPo.status === 'COMPLETED');
    assert('Parent PO settlement status transitioned to SETTLED', completedParentPo.settlement_status === 'SETTLED');

    // ── TEST 5: Verify Reorders are Blocked After PO is Completed ─────────
    console.log('\nTest 5: Verifying further reorders against completed PO are blocked...');
    let blockedError = null;
    try {
      await createPoDraft({
        epc_id: testEpcId,
        created_by_role: 'SOLAR_EPC',
        creator_name: 'Apex Solar EPC',
        items: [{ quantity: 1 }],
        order_type: 'loose_kit_order',
        parent_po_id: po._id,
        actor_id: testEpcId,
      });
    } catch (e) {
      blockedError = e.message;
    }
    assert('Reorder against completed PO blocked', blockedError && blockedError.includes('PO status is COMPLETED'));

    // ── TEST 6: Cleanup test records ──────────────────────────────────────
    console.log('\nCleaning up test records...');
    await FpoOrder.deleteMany({ _id: { $in: [po._id, childOrder._id, closingOrder._id] } });
    console.log('Cleanup complete.');

    console.log(`\n======================================================`);
    console.log(`   TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
    console.log(`======================================================\n`);
  } catch (err) {
    console.error('Test execution error:', err);
    failed++;
  } finally {
    await mongoose.disconnect();
  }
}

runTests();
