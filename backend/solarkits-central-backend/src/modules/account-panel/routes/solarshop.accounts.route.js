const express = require('express');
const router = express.Router();

const check_auth = require('../middlewares/check.auth');
const solarshop_handler = require('../controller/solarshop.accounts.handler');

// 1. Dashboard summary cards stats
router.get('/dashboard-stats', check_auth, solarshop_handler.get_dashboard_stats);

// 2. Dashboard recent transactions
router.get('/recent-transactions', check_auth, solarshop_handler.get_recent_transactions);

// 3. Franchise Plan Purchases (Page 1)
router.get('/franchise-plans', check_auth, solarshop_handler.get_franchise_plan_purchases);
router.post('/franchise-plans/:id/status', check_auth, solarshop_handler.update_plan_payment_status);

// 4. Direct EPC Transactions (Page 2)
router.get('/direct-epc-transactions', check_auth, solarshop_handler.get_direct_epc_transactions);

// 5. Franchise Commission Tracking (Page 3)
router.get('/franchise-commissions', check_auth, solarshop_handler.get_franchise_commissions);
router.post('/franchise-commissions/:id/status', check_auth, solarshop_handler.update_commission_status);

// 6. Onboarded EPC Purchases & Analytics
router.get('/onboarded-epc-purchases', check_auth, solarshop_handler.get_onboarded_epc_purchases);

// 6.1 Unified EPC Orders & Payment Management
router.get('/epc-orders-unified', check_auth, solarshop_handler.get_unified_epc_orders);
router.get('/epc-orders/check-duplicate-utr', check_auth, solarshop_handler.check_duplicate_utr);
router.post('/epc-orders/:id/accounts-verify', check_auth, solarshop_handler.accounts_verify_epc_payment);
router.post('/epc-orders/:id/admin-approve', check_auth, solarshop_handler.admin_approve_epc_payment);
router.get('/epc-orders/tat-config', check_auth, solarshop_handler.get_tat_config);
router.put('/epc-orders/tat-config', check_auth, solarshop_handler.update_tat_config);

// 6.2 Customer Payment & Follow-up Module (Pending Milestones Tracking)
router.get('/customer-payment-followups', check_auth, solarshop_handler.get_customer_payment_followups);
router.post('/customer-payment-followups/:id/log', check_auth, solarshop_handler.log_customer_payment_followup);
router.post('/customer-payment-followups/:id/record-payment', check_auth, solarshop_handler.record_milestone_two_payment);

// 7. Transaction Details for Side Drawer / Modal
router.get('/transaction-details/:type/:id', check_auth, solarshop_handler.get_transaction_details);

// 8. Offline Payment Verification Queue (EPC + FPO / Loose Orders) & Logistics
router.get('/offline-orders', check_auth, solarshop_handler.get_offline_orders_for_verification);
router.post('/epc-orders/:id/verify-payment', check_auth, solarshop_handler.verify_epc_order_payment);
router.post('/fpo-orders/:id/verify-payment', check_auth, solarshop_handler.verify_fpo_order_payment);
router.post('/epc-orders/:id/dispatch', check_auth, solarshop_handler.dispatch_epc_order);
router.post('/epc-orders/:id/deliver', check_auth, solarshop_handler.deliver_epc_order);
router.post('/epc-orders/:id/update-eta', check_auth, solarshop_handler.update_epc_order_eta);
router.post('/orders/:orderType/:id/update-eta', check_auth, solarshop_handler.update_order_eta);

// ── Module 1: 8-Stage Order Lifecycle Transition Routes ──────────────────────
// Stage 2: Mark order as Processing (warehouse picking & packing started)
router.post('/epc-orders/:id/stage/processing',          check_auth, solarshop_handler.stage_processing);
// Fleet Vehicles list for Stage 3 vehicle assignment
router.get('/warehouse-vehicles',                        check_auth, solarshop_handler.get_warehouse_vehicles);
router.get('/warehouse/vehicles',                        check_auth, solarshop_handler.get_warehouse_vehicles);
// Stage 3: Assign a vehicle (recommended auto-fill or admin override)
router.post('/epc-orders/:id/stage/assign-vehicle',      check_auth, solarshop_handler.stage_assign_vehicle);
// Stage 4: Mark Ready for Dispatch (packing complete, staged at gate)
router.post('/epc-orders/:id/stage/ready-for-dispatch',  check_auth, solarshop_handler.stage_ready_for_dispatch);
// Stage 5: Mark Dispatched (vehicle has left the warehouse gate)
router.post('/epc-orders/:id/stage/dispatched',          check_auth, solarshop_handler.stage_dispatched);
// Stage 6: Log In-Transit milestone update (can be called multiple times)
router.post('/epc-orders/:id/stage/in-transit',          check_auth, solarshop_handler.stage_in_transit);
// Stage 7: Mark Reached Destination
router.post('/epc-orders/:id/stage/reached-destination', check_auth, solarshop_handler.stage_reached_destination);
// Stage 8: Mark Delivered
router.post('/epc-orders/:id/stage/delivered',           check_auth, solarshop_handler.stage_delivered);

// ── Module 1.1: FPO & Generic Order 8-Stage Lifecycle Routes ──────────────────
router.post('/fpo-orders/:id/stage/assign-vehicle',      check_auth, solarshop_handler.stage_fpo_assign_vehicle);
router.post('/fpo-orders/:id/stage/:stage',             check_auth, solarshop_handler.stage_fpo_order);
router.post('/orders/:orderType/:id/stage/assign-vehicle', check_auth, solarshop_handler.assign_vehicle_generic_order);
router.post('/orders/:orderType/:id/stage/:stage',      check_auth, solarshop_handler.stage_generic_order);
router.get('/orders/:orderType/:id/stage-details',       check_auth, solarshop_handler.get_order_stage_details);

// 9. EPC PO Payments Verification (FPO Allocations)
router.get('/epc-po-payments', check_auth, solarshop_handler.get_epc_po_payments);
router.post('/epc-po-payments/:poId/allocations/:epcId/verify', check_auth, solarshop_handler.verify_epc_po_payment);

module.exports = router;
