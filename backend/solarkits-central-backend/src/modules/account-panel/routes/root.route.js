const express = require('express');
const router = express.Router();

const root_handler = require('../controller/root.handler');
const accounts_handler = require('../controller/accounts.handler');
const check_auth = require('../middlewares/check.auth');
const { upload_files } = require('../utils/upload.files');

router.get('/user-data', check_auth, root_handler.get_user_data);
router.get('/user-modules', check_auth, root_handler.get_user_modules);

router.get('/geography/countries', check_auth, root_handler.get_active_countries);
router.get('/geography/states', check_auth, root_handler.get_active_states);
router.get('/geography/states/:country_id', check_auth, root_handler.get_active_states);
router.get('/geography/districts', check_auth, root_handler.get_active_districts);
router.get('/geography/districts/:state_id', check_auth, root_handler.get_active_districts);
router.get('/geography/clusters', check_auth, root_handler.get_active_clusters);
router.get('/geography/clusters/:state_id', check_auth, root_handler.get_active_clusters);
router.get('/geography/assigned-clusters', check_auth, root_handler.get_assigned_clusters);

// Inward Verification & Stock updates
router.get('/accounts/pending-inwards', check_auth, accounts_handler.get_pending_inwards);
router.post('/accounts/inwards/:id/approve', check_auth, accounts_handler.approve_inward);
router.post('/accounts/inwards/:id/reject', check_auth, accounts_handler.reject_inward);
router.get('/accounts/warehouses', check_auth, accounts_handler.get_warehouses);
router.get('/accounts/warehouse-inwards', check_auth, accounts_handler.get_warehouse_inwards);
router.get('/accounts/completed-deliveries', check_auth, accounts_handler.get_completed_deliveries);

// Purchase Orders (POs)
router.get('/accounts/warehouses/:warehouseId/skus', check_auth, accounts_handler.get_warehouse_skus);
router.get('/accounts/warehouses/:warehouseId/skus/:skuId/suppliers', check_auth, accounts_handler.get_sku_suppliers);
router.get('/accounts/warehouses/:warehouseId/suppliers', check_auth, accounts_handler.get_warehouse_suppliers);
router.get('/accounts/warehouses/:warehouseId/suppliers/:supplierId/prices', check_auth, accounts_handler.get_supplier_warehouse_prices);
router.post('/accounts/purchase-orders', check_auth, accounts_handler.create_purchase_order);
router.put('/accounts/purchase-orders/:id/timeline', check_auth, accounts_handler.update_purchase_order_timeline);
router.post('/accounts/purchase-orders/:id/pay', check_auth, accounts_handler.pay_purchase_order);
router.post('/accounts/purchase-orders/:id/cancel', check_auth, accounts_handler.cancel_purchase_order);
router.get('/accounts/combo-kits', check_auth, accounts_handler.get_combo_kits);
router.get('/accounts/countries/:countryId/saas-products', check_auth, accounts_handler.get_country_saas_products);
router.post('/accounts/upload-payment-receipt', check_auth, upload_files('public/uploads/payment-receipts', 10, 'file', 1), (req, res) => {
  if (req.files && req.files[0]) {
    return res.status(200).json({ status: "success", url: req.files[0].path });
  }
  return res.status(400).json({ status: "error", message: "No file uploaded." });
});
router.get('/accounts/purchase-orders', check_auth, accounts_handler.get_purchase_orders);
router.get('/accounts/hierarchy-options', check_auth, accounts_handler.get_hierarchy_options);
router.get('/accounts/skus/:skuId/details', check_auth, accounts_handler.get_sku_details);

// PO Requests from Warehouse
router.get('/accounts/po-requests', check_auth, accounts_handler.get_po_requests);
router.post('/accounts/po-requests/:id/status', check_auth, accounts_handler.update_po_request_status);

// EPC & Franchise Combined Supplier Payment (new flow)
router.get('/accounts/pending-epc-franchise-orders', check_auth, accounts_handler.get_pending_epc_franchise_orders);
router.post('/accounts/combined-supplier-payment', check_auth, accounts_handler.create_combined_supplier_payment);

// Supplier Registration & Listing
router.get('/accounts/suppliers', check_auth, accounts_handler.list_suppliers);
router.post('/accounts/suppliers', check_auth, accounts_handler.create_supplier);
router.post('/accounts/gst/verify', check_auth, accounts_handler.gst_verify);
router.post('/accounts/gst/generate-otp', check_auth, accounts_handler.gst_generate_otp);
router.post('/accounts/gst/submit-otp', check_auth, accounts_handler.gst_submit_otp);

// Solar Shop Accounts Financial Management
const solarshop_accounts_route = require('./solarshop.accounts.route');
const solarshop_handler = require('../controller/solarshop.accounts.handler');
router.use('/accounts/solar-shop', solarshop_accounts_route);
router.get('/warehouse/vehicles', check_auth, solarshop_handler.get_warehouse_vehicles);

// New Orders & Bulk Procurement Grouping
const procurement_handler = require('../controller/procurement.handler');
router.get('/accounts/sidebar-badges', check_auth, accounts_handler.get_sidebar_badge_counts);
router.get('/accounts/new-orders', check_auth, accounts_handler.get_eligible_new_orders);
router.get('/accounts/new-orders/filter-options', check_auth, accounts_handler.get_new_orders_filter_options);
router.get('/accounts/vehicles-master', check_auth, accounts_handler.get_vehicles_master);
router.post('/accounts/procurement-groups/calculate', check_auth, accounts_handler.calculate_procurement_grouping);
router.post('/accounts/procurement-groups', check_auth, accounts_handler.create_procurement_group);
router.get('/accounts/procurement-groups', check_auth, accounts_handler.list_procurement_groups);

// Dedicated Procurement Module APIs
router.get('/accounts/procurement/batch-ready-orders', check_auth, procurement_handler.get_batch_ready_orders);
router.get('/accounts/procurement/partners', check_auth, procurement_handler.get_sourcing_partners);
router.post('/accounts/procurement/bom-calculate', check_auth, procurement_handler.calculate_procurement_bom);
router.post('/accounts/procurement/reserve-stock', check_auth, procurement_handler.reserve_inventory_stock);
router.post('/accounts/procurement/release-stock', check_auth, procurement_handler.release_inventory_stock);
router.post('/accounts/procurement/purchase-indents', check_auth, procurement_handler.create_purchase_indent);
router.get('/accounts/procurement/purchase-indents', check_auth, procurement_handler.list_purchase_indents);
router.post('/accounts/procurement/payments/request', check_auth, procurement_handler.request_supplier_payment);
router.post('/accounts/procurement/payments/approval', check_auth, procurement_handler.admin_approve_supplier_payment);
router.post('/accounts/procurement/payments/bank-record', check_auth, procurement_handler.record_bank_payment);
router.post('/accounts/procurement/fulfilment-method', check_auth, procurement_handler.save_supply_fulfilment);
router.post('/accounts/procurement/supplier-dispatch', check_auth, procurement_handler.supplier_update_dispatch);
router.post('/accounts/procurement/inward-verify', check_auth, procurement_handler.warehouse_confirm_inward);
router.post('/accounts/procurement/handover-delivery', check_auth, procurement_handler.handover_to_delivery_manager);
router.post('/accounts/procurement/sync-warehouse-delivery-orders', check_auth, procurement_handler.sync_all_advance_paid_pis);

// Centralized Account Manager Dashboard Overview
router.get('/accounts/dashboard-overview', check_auth, accounts_handler.get_dashboard_overview);
router.post('/accounts/dashboard-tasks/:id/status', check_auth, accounts_handler.update_dashboard_task_status);

// Core Accounting Module: Dynamic Accounting Heads, Vouchers, Ledgers & Financial Statements
const accountingModuleRoute = require('./accounting.module.route');
router.use('/accounts/accounting', accountingModuleRoute);
router.use('/accounting', accountingModuleRoute);

// Module 2: GST Management & Tax Accounting
const gstModuleRoute = require('./gst.module.route');
router.use('/accounts/gst', gstModuleRoute);
router.use('/gst', gstModuleRoute);

// Module 3: Invoice Validation & Statutory Compliance Management
const complianceModuleRoute = require('./compliance.module.route');
router.use('/accounts/compliance', complianceModuleRoute);
router.use('/compliance', complianceModuleRoute);

// Module 4: Dynamic Expense Management & Approval Workflow
const expenseModuleRoute = require('./expense.module.route');
router.use('/accounts/expenses', expenseModuleRoute);
router.use('/expenses', expenseModuleRoute);

// Module 5: Loan Eligibility & Warehouse Development Recommendation
const warehouseFinanceRoute = require('./warehouse_finance.module.route');
router.use('/accounts/warehouse-finance', warehouseFinanceRoute);
router.use('/warehouse-finance', warehouseFinanceRoute);

// Module 6: Business Performance & Executive Finance Dashboard
const executiveRoute = require('./executive.module.route');
router.use('/accounts/executive-finance', executiveRoute);
router.use('/executive-finance', executiveRoute);

// Module 7: Master Statutory & Operational Registers Hub
const registersRoute = require('./registers.route');
router.use('/accounts/registers', registersRoute);
router.use('/registers', registersRoute);

module.exports = router;
