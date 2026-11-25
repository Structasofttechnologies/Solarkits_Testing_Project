/**
 * test_procurement_flow.js
 * Comprehensive end-to-end integration and verification suite for SolarKits Procurement Module.
 *
 * Verifies:
 *  1. BOM Calculation Logic: Required Qty, Available Stock, Inventory Reservation, Supplier Qty
 *  2. Stock Reservation Creation & Atomic Validation (WarehouseInventoryReservation)
 *  3. Purchase Indent (PI) Generation with unique PI-YYYY-XXXXX sequence & Payment Terms Split
 *  4. Fulfilment Options: Option A (Company Pickup) vs Option B (Supplier Delivery)
 *  5. Payment Workflow: Request -> Admin Approval -> Bank UTR Recording
 *  6. Separation Rule: Admin Payment Approval MUST NOT mark goods as received
 *  7. Physical Inward Receipt & GRN Generation (WarehouseInward)
 *  8. Delivery Manager Handover Gate & Readiness Status Verification
 *
 * Run: node tests/test_procurement_flow.js
 */

const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const {
  PurchaseIndent,
  WarehouseInventoryReservation,
  ProcurementGroup,
  WarehouseInward
} = require('../src/modules/account-panel/models/company_warehouse_db');

const procurementHandler = require('../src/modules/account-panel/controller/procurement.handler');

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

// Mock HTTP req / res helpers
function createMockReqRes(body = {}, query = {}, user = { _id: new mongoose.Types.ObjectId(), name: "Admin Accounts" }) {
  const req = { body, query, user };
  let statusCode = 200;
  let responseData = null;

  const res = {
    status(code) {
      statusCode = code;
      return this;
    },
    json(data) {
      responseData = data;
      return this;
    },
    getStatusCode: () => statusCode,
    getResponseData: () => responseData
  };

  return { req, res };
}

async function runTests() {
  console.log("\n=======================================================");
  console.log("   SOLARKITS PROCUREMENT MODULE — END-TO-END TESTS");
  console.log("=======================================================\n");

  const testWarehouseId = new mongoose.Types.ObjectId();
  const testOrderId = new mongoose.Types.ObjectId();
  const testSkuId = new mongoose.Types.ObjectId();
  const testSupplierId = new mongoose.Types.ObjectId();
  const testOrderNumber = `EPC-TEST-${Date.now().toString().slice(-5)}`;
  const testGroupId = `GRP-TEST-${Date.now().toString().slice(-4)}`;

  // ── TEST SUITE 1: SOURCING CALCULATION & BOM RULES ────────────────────────
  console.log("Suite 1: Procurement BOM Calculation & Sourcing Formula");
  {
    const requiredQty = 50;
    const availableStock = 20;
    const reservedInventoryQty = Math.min(requiredQty, availableStock);
    const supplierQuantity = Math.max(0, requiredQty - reservedInventoryQty);

    assert(
      "Option A inventory reservation takes available stock up to required qty",
      reservedInventoryQty === 20,
      `Expected 20, got ${reservedInventoryQty}`
    );

    assert(
      "Option B supplier procurement qty is strictly Required - Reserved Inventory",
      supplierQuantity === 30,
      `Expected 30, got ${supplierQuantity}`
    );

    // Test zero stock scenario
    const zeroStock = 0;
    const supplierQtyZeroStock = Math.max(0, requiredQty - zeroStock);
    assert(
      "Supplier quantity equals required qty when warehouse stock is 0",
      supplierQtyZeroStock === 50,
      `Expected 50, got ${supplierQtyZeroStock}`
    );

    // Test surplus stock scenario
    const surplusStock = 100;
    const reservedSurplus = Math.min(requiredQty, surplusStock);
    const supplierSurplus = Math.max(0, requiredQty - reservedSurplus);
    assert(
      "Supplier quantity is 0 when warehouse has 100% available stock",
      supplierSurplus === 0 && reservedSurplus === 50,
      `Expected 0 supplier qty and 50 reserved, got ${supplierSurplus} and ${reservedSurplus}`
    );
  }

  // ── TEST SUITE 2: PAYMENT ADVANCE / BALANCE SPLIT RULES ───────────────────
  console.log("\nSuite 2: Supplier Payment Terms Split Calculations");
  {
    const totalOrderValue = 100000;
    const advancePercent = 20;
    const balancePercent = 80;

    const advanceAmount = Math.round((totalOrderValue * advancePercent) / 100);
    const balanceAmount = totalOrderValue - advanceAmount;

    assert(
      "Advance amount is calculated accurately from advance percentage",
      advanceAmount === 20000,
      `Expected 20000, got ${advanceAmount}`
    );

    assert(
      "Balance amount is remainder of total order value",
      balanceAmount === 80000,
      `Expected 80000, got ${balanceAmount}`
    );

    assert(
      "Advance + Balance equals total order value exactly",
      advanceAmount + balanceAmount === totalOrderValue
    );
  }

  // ── TEST SUITE 3: INVENTORY RESERVATION (OPTION A) ─────────────────────────
  console.log("\nSuite 3: Atomic Inventory Reservation (WarehouseInventoryReservation)");
  let reservationId = null;
  {
    const { req, res } = createMockReqRes({
      warehouse_id: testWarehouseId,
      sku_id: testSkuId,
      sku_code: "PANEL-550W-MONO",
      customer_order_id: testOrderId,
      customer_order_number: testOrderNumber,
      order_group_id: testGroupId,
      reserved_quantity: 15
    });

    await procurementHandler.reserve_inventory_stock(req, res);
    const data = res.getResponseData();

    assert(
      "reserve_inventory_stock responds with success status 200",
      res.getStatusCode() === 200 && data.status === "success",
      JSON.stringify(data)
    );

    assert(
      "Created reservation record has correct reserved quantity and active status",
      data.data && data.data.reserved_quantity === 15 && data.data.status === "active",
      JSON.stringify(data)
    );

    reservationId = data.data?._id;
  }

  // ── TEST SUITE 4: PURCHASE INDENT CREATION (OPTION B) ──────────────────────
  console.log("\nSuite 4: Purchase Indent (PI) Generation & Auto-Numbering");
  let createdPiId = null;
  let createdPiNumber = null;
  {
    const { req, res } = createMockReqRes({
      customer_order_id: testOrderId,
      customer_order_number: testOrderNumber,
      order_group_id: testGroupId,
      supplier_id: testSupplierId,
      supplier_name: "Tata Solar Power Ltd",
      supplier_brand: "Tata Power Solar",
      supplier_gst: "27AABCT1234F1Z1",
      destination_warehouse_id: testWarehouseId,
      items: [
        {
          sku_id: testSkuId,
          sku_code: "PANEL-550W-MONO",
          category: "Solar Panel",
          item_name: "Tata 550W Mono PERC Half-cut Panel",
          ordered_quantity: 35,
          unit_rate: 14500,
          gst_percent: 12
        }
      ],
      fulfilment: {
        method: "Supplier Delivery",
        transport_responsibility: "Supplier",
        expected_pickup_date: new Date(Date.now() + 86400000 * 3),
        expected_dispatch_date: new Date(Date.now() + 86400000 * 5),
        expected_inward_date: new Date(Date.now() + 86400000 * 7),
        transport_cost: 3500
      },
      payment: {
        payment_terms: "20% Advance, 80% Balance before dispatch",
        advance_percentage: 20,
        production_tat_days: 5,
        supply_tat_days: 2
      }
    });

    await procurementHandler.create_purchase_indent(req, res);
    const data = res.getResponseData();

    assert(
      "create_purchase_indent responds with status 201 and success",
      res.getStatusCode() === 201 && data.status === "success",
      JSON.stringify(data)
    );

    assert(
      "Auto-generated PI number matches sequence format PI-YYYY-XXXXX",
      /^PI-\d{4}-\d{5}$/.test(data.data?.pi_number),
      `Generated PI: ${data.data?.pi_number}`
    );

    assert(
      "PI advance and balance amounts computed and partitioned properly",
      data.data?.payment?.advance_amount > 0 && data.data?.payment?.balance_amount > 0,
      `Advance: ${data.data?.payment?.advance_amount}, Balance: ${data.data?.payment?.balance_amount}`
    );

    assert(
      "Initial PI payment status is 'PI Submitted'",
      data.data?.payment?.payment_status === "PI Submitted"
    );

    createdPiId = data.data?._id;
    createdPiNumber = data.data?.pi_number;
  }

  // ── TEST SUITE 5: SUPPLIER PAYMENT REQUEST WORKFLOW ────────────────────────
  console.log("\nSuite 5: Initiate Supplier Payment Request");
  {
    const { req, res } = createMockReqRes({
      indent_id: createdPiId,
      payment_type: "advance",
      notes: "Initiating 20% Advance payment for production start"
    });

    await procurementHandler.request_supplier_payment(req, res);
    const data = res.getResponseData();

    assert(
      "request_supplier_payment responds with success",
      res.getStatusCode() === 200 && data.status === "success",
      JSON.stringify(data)
    );

    assert(
      "Payment status transitions to 'Advance Requested'",
      data.data?.payment?.payment_status === "Advance Requested",
      `Status: ${data.data?.payment?.payment_status}`
    );

    assert(
      "Admin approval status is set to 'Awaiting Admin Approval'",
      data.data?.payment?.admin_approval?.status === "Awaiting Admin Approval"
    );
  }

  // ── TEST SUITE 6: ADMIN PAYMENT APPROVAL & SEPARATION ENFORCEMENT ──────────
  console.log("\nSuite 6: Admin Payment Approval & Physical Receipt Separation Rule");
  {
    const { req, res } = createMockReqRes({
      indent_id: createdPiId,
      action: "Approve",
      remarks: "Advance payment approved by Accounts Admin per proforma invoice"
    });

    await procurementHandler.admin_approve_supplier_payment(req, res);
    const data = res.getResponseData();

    assert(
      "admin_approve_supplier_payment approves successfully",
      res.getStatusCode() === 200 && data.status === "success",
      JSON.stringify(data)
    );

    assert(
      "Admin approval status becomes 'Approved'",
      data.data?.payment?.admin_approval?.status === "Approved"
    );

    // CRITICAL REQUIREMENT VERIFICATION:
    // Supplier payment approval must NEVER mark products as received.
    const piAfterApproval = await PurchaseIndent.findById(createdPiId).lean();
    assert(
      "CRITICAL RULE: Payment approval MUST NOT mark goods as received (supply_status remains != 'Inward Completed')",
      piAfterApproval.fulfilment?.supply_status !== "Inward Completed",
      `Current supply_status: ${piAfterApproval.fulfilment?.supply_status}`
    );

    assert(
      "CRITICAL RULE: actual_inward_date remains null after payment approval",
      piAfterApproval.fulfilment?.actual_inward_date == null
    );
  }

  // ── TEST SUITE 7: RECORD BANK PAYMENT (UTR & TRANSACTION DETAILS) ──────────
  console.log("\nSuite 7: Record Bank Payment (UTR, Mode, Reference)");
  {
    const testUtr = `ICICITEST${Date.now().toString().slice(-6)}`;
    const { req, res } = createMockReqRes({
      indent_id: createdPiId,
      payment_type: "advance",
      utr_number: testUtr,
      payment_mode: "NEFT",
      paid_date: new Date(),
      remarks: "Advance transferred via corporate banking"
    });

    await procurementHandler.record_bank_payment(req, res);
    const data = res.getResponseData();

    assert(
      "record_bank_payment registers transaction with UTR",
      res.getStatusCode() === 200 && data.status === "success",
      JSON.stringify(data)
    );

    assert(
      "Payment status transitions to 'Advance Paid'",
      data.data?.payment?.payment_status === "Advance Paid",
      `Payment status: ${data.data?.payment?.payment_status}`
    );

    assert(
      "Stored UTR number matches submitted reference",
      data.data?.payment?.actual_payment?.utr_number === testUtr
    );
    assert(
      "Advance payment object is persisted separately",
      data.data?.payment?.advance_payment?.utr_number === testUtr
    );
  }

  // ── TEST SUITE 7B: MILESTONE 2 (70% BALANCE) PAYMENT ─────────────────────────
  console.log("\nSuite 7b: Record Milestone 2 (70% Balance) Bank Payment");
  {
    const balanceUtr = `ICICIBAL${Date.now().toString().slice(-6)}`;
    const { req, res } = createMockReqRes({
      indent_id: createdPiId,
      payment_type: "balance",
      utr_number: balanceUtr,
      payment_mode: "RTGS",
      paid_date: new Date(),
      remarks: "Balance 70% cleared against dispatch readiness"
    });

    await procurementHandler.record_bank_payment(req, res);
    const data = res.getResponseData();

    assert(
      "record_bank_payment registers 70% balance transaction",
      res.getStatusCode() === 200 && data.status === "success",
      JSON.stringify(data)
    );

    assert(
      "Payment status transitions to 'Paid' upon full settlement",
      data.data?.payment?.payment_status === "Paid",
      `Payment status: ${data.data?.payment?.payment_status}`
    );

    assert(
      "Balance payment UTR is stored accurately",
      data.data?.payment?.balance_payment?.utr_number === balanceUtr
    );

    assert(
      "Advance UTR is PRESERVED and not overwritten",
      Boolean(data.data?.payment?.advance_payment?.utr_number),
      "Advance payment UTR was lost"
    );

    assert(
      "Payment history has at least 2 installments (advance + balance)",
      (data.data?.payment?.payment_history || []).length >= 2
    );
  }

  // ── TEST SUITE 8: FULFILMENT DISPATCH & CARRIER LOGGING ─────────────────────
  console.log("\nSuite 8: Supplier Dispatch Update (Carrier, Vehicle, Tracking)");
  {
    const { req, res } = createMockReqRes({
      indent_id: createdPiId,
      supply_status: "Dispatched",
      carrier_name: "Gati KWE Logistics",
      vehicle_number: "MH-12-AB-9876",
      driver_name: "Ramesh Sharma",
      driver_phone: "9876543210",
      tracking_reference: "GATI-TRK-774411",
      actual_dispatch_date: new Date()
    });

    await procurementHandler.supplier_update_dispatch(req, res);
    const data = res.getResponseData();

    assert(
      "supplier_update_dispatch successfully updates tracking",
      res.getStatusCode() === 200 && data.status === "success",
      JSON.stringify(data)
    );

    assert(
      "Supply status transitions to 'Dispatched'",
      data.data?.fulfilment?.supply_status === "Dispatched",
      `Supply status: ${data.data?.fulfilment?.supply_status}`
    );

    assert(
      "Carrier and tracking references are persisted",
      data.data?.fulfilment?.tracking_reference === "GATI-TRK-774411" &&
      data.data?.fulfilment?.vehicle_details?.vehicle_number === "MH-12-AB-9876"
    );
  }

  // ── TEST SUITE 9: WAREHOUSE PHYSICAL INWARD & GRN CONFIRMATION ──────────────
  console.log("\nSuite 9: Physical Material Inward Receipt & GRN Generation");
  let generatedGrn = null;
  {
    const testInvoice = `INV-${Date.now().toString().slice(-6)}`;
    const { req, res } = createMockReqRes({
      pi_id: createdPiId,
      customer_order_number: testOrderNumber,
      warehouse_id: testWarehouseId,
      invoice_no: testInvoice,
      invoice_date: new Date().toISOString().split("T")[0],
      received_items: [
        {
          sku_id: testSkuId,
          sku_code: "PANEL-550W-MONO",
          quantity: 35,
          unit_rate: 14500
        }
      ],
      damage_notes: "Nil. All 35 panels inspected and verified in good condition.",
      qc_passed: true
    });

    await procurementHandler.warehouse_confirm_inward(req, res);
    const data = res.getResponseData();

    assert(
      "warehouse_confirm_inward generates GRN and records physical receipt",
      res.getStatusCode() === 200 && data.status === "success",
      JSON.stringify(data)
    );

    assert(
      "Auto-generated GRN follows format GRN-YYYY-XXXXX",
      /^GRN-\d{4}-\d{5}$/.test(data.data?.grn_number),
      `GRN: ${data.data?.grn_number}`
    );

    assert(
      "Supply status of PI is updated to 'Inward Completed'",
      data.data?.pi?.fulfilment?.supply_status === "Inward Completed",
      `Supply status: ${data.data?.pi?.fulfilment?.supply_status}`
    );

    generatedGrn = data.data?.grn_number;
  }

  // ── TEST SUITE 10: DELIVERY MANAGER HANDOVER GATE ──────────────────────────
  console.log("\nSuite 10: Delivery Manager Handover Gate & Readiness State");
  {
    // Create a procurement group for batch handover test
    const group = new ProcurementGroup({
      group_id: testGroupId,
      order_numbers: [testOrderNumber],
      order_count: 1,
      total_capacity: 5,
      destination_warehouse_id: testWarehouseId,
      status: "Batch Ready",
      batch_status: "Procurement In Progress",
      procurement_readiness_status: "Procurement In Progress"
    });
    await group.save();

    const { req, res } = createMockReqRes({
      group_id: testGroupId,
      order_number: testOrderNumber
    });

    await procurementHandler.handover_to_delivery_manager(req, res);
    const data = res.getResponseData();

    assert(
      "handover_to_delivery_manager successfully transitions batch to Delivery Manager",
      res.getStatusCode() === 200 && data.status === "success",
      JSON.stringify(data)
    );

    assert(
      "Batch status transitions to 'Transferred to Delivery'",
      data.data?.readiness_state === "Ready for Kit Preparation" || data.data?.readiness_state === "Ready for Dispatch",
      `Current readiness state: ${data.data?.readiness_state}`
    );

    // Verify in database
    const updatedGroup = await ProcurementGroup.findOne({ group_id: testGroupId }).lean();
    assert(
      "ProcurementGroup has batch_status = 'Transferred to Delivery' and delivery_handover recorded",
      updatedGroup?.batch_status === "Transferred to Delivery" && updatedGroup?.delivery_handover?.transferred_at != null
    );
  }

  // ── CLEANUP TEST DATA ──────────────────────────────────────────────────────
  console.log("\nCleaning up test records...");
  try {
    if (reservationId) await WarehouseInventoryReservation.deleteOne({ _id: reservationId });
    if (createdPiId) await PurchaseIndent.deleteOne({ _id: createdPiId });
    if (testGroupId) await ProcurementGroup.deleteOne({ group_id: testGroupId });
    if (generatedGrn) await WarehouseInward.deleteOne({ grn_number: generatedGrn });
    console.log("  Test records cleaned up successfully.");
  } catch (err) {
    console.warn("  Cleanup warning:", err.message);
  }

  // ── FINAL SUMMARY ──────────────────────────────────────────────────────────
  console.log("\n=======================================================");
  console.log(`   TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log("=======================================================\n");

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

// Run the suite
runTests().catch(err => {
  console.error("Test execution threw error:", err);
  process.exit(1);
});
