const express = require('express')
const router = express.Router()

const warehouse_handler = require('../controller/warehouses.handler');
const check_auth = require('../middlewares/check.auth');
const check_permissions = require('../middlewares/check.permissions');

router.post("/add-warehouse", check_auth, check_permissions([{ unique_code: 'ADM_WAREHOUSES', permissions: ['add'] }]), warehouse_handler.add_warehouse);
router.get("/", check_auth, check_permissions([{ unique_code: 'ADM_WAREHOUSES', permissions: ['view'] }, { unique_code: 'ADM_PO_ORDERS', permissions: ['view'] }, { unique_code: 'ADM_CO_MARGIN', permissions: ['view'] }, { unique_code: 'ADM_BULK_COMBO', permissions: ['view'] }, { unique_code: 'ADM_WH_KIT_ACT', permissions: ['view'] }, { unique_code: 'ADM_DELIVERY_MGMT', permissions: ['view'] }, { unique_code: 'ADM_COMBO_KITS', permissions: ['view'] }, { unique_code: 'ADM_COMBO_CFG', permissions: ['view'] }]), warehouse_handler.get_warehouses);

// ── Dashboard Metrics & Map Markers (Before /:id) ───────────────────────────
router.get("/dashboard/metrics", check_auth, check_permissions([{ unique_code: 'ADM_WAREHOUSES', permissions: ['view'] }]), warehouse_handler.get_warehouse_dashboard_metrics);
router.get("/map-markers", check_auth, check_permissions([{ unique_code: 'ADM_WAREHOUSES', permissions: ['view'] }]), warehouse_handler.get_warehouse_map_markers);

router.get("/district/:district_id", check_auth, check_permissions([{ unique_code: 'ADM_COMBO_KITS', permissions: ['view'] }, { unique_code: 'ADM_CUSTOMIZE_KITS', permissions: ['view'] }, { unique_code: 'ADM_BETCHMARK_PRICE_MASTER', permissions: ['view'] }]), warehouse_handler.get_warehouses_by_district);
router.post("/validation/fields/add", check_auth, check_permissions([{ unique_code: 'ADM_WAREHOUSES', permissions: ['add'] }]), warehouse_handler.add_warehouse_validation_field);
router.post("/validation/validaion-status", check_auth, check_permissions([{ unique_code: 'ADM_WAREHOUSES', permissions: ['edit'] }]), warehouse_handler.set_warehouse_validation_field_statuses);
router.post("/validation/change-status", check_auth, check_permissions([{ unique_code: 'ADM_WAREHOUSES', permissions: ['edit'] }]), warehouse_handler.change_warehouse_validation_status);

// ── Company Warehouse 10-Gate Activation & Checklist ──────────────────────
router.post("/:id/assign-staff", check_auth, warehouse_handler.assign_warehouse_staff);
router.get("/:id/checklist", check_auth, check_permissions([{ unique_code: 'ADM_WAREHOUSES', permissions: ['view'] }]), warehouse_handler.get_company_warehouse_checklist);
router.post("/:id/submit-activation", check_auth, check_permissions([{ unique_code: 'ADM_WAREHOUSES', permissions: ['edit'] }]), warehouse_handler.submit_company_warehouse_activation);
router.post("/:id/approve-activation", check_auth, check_permissions([{ unique_code: 'ADM_WAREHOUSES', permissions: ['edit'] }]), warehouse_handler.approve_company_warehouse_activation);
router.post("/:id/toggle-gate", check_auth, check_permissions([{ unique_code: 'ADM_WAREHOUSES', permissions: ['edit'] }]), warehouse_handler.toggle_company_warehouse_gate);

// ── 3PL Inspection, Approval & Commercials ────────────────────────────────
router.post("/:id/inspection", check_auth, check_permissions([{ unique_code: 'ADM_WAREHOUSES', permissions: ['edit'] }]), warehouse_handler.record_3pl_inspection);
router.post("/:id/approve-3pl", check_auth, check_permissions([{ unique_code: 'ADM_WAREHOUSES', permissions: ['edit'] }]), warehouse_handler.approve_3pl_warehouse);
router.put("/:id/commercials", check_auth, check_permissions([{ unique_code: 'ADM_WAREHOUSES', permissions: ['edit'] }]), warehouse_handler.update_3pl_commercials);
router.patch("/:id/toggle-status", check_auth, check_permissions([{ unique_code: 'ADM_WAREHOUSES', permissions: ['edit'] }]), warehouse_handler.toggle_warehouse_status);

router.get("/:id", check_auth, check_permissions([{ unique_code: 'ADM_WAREHOUSES', permissions: ['view'] }]), warehouse_handler.get_warehouse);
router.put("/:id", check_auth, check_permissions([{ unique_code: 'ADM_WAREHOUSES', permissions: ['edit'] }]), warehouse_handler.update_warehouse);
router.patch("/:id/order-fulfillment-types", check_auth, check_permissions([{ unique_code: 'ADM_WAREHOUSES', permissions: ['edit'] }, { unique_code: 'ADM_WH_KIT_ACT', permissions: ['edit'] }]), warehouse_handler.update_warehouse_order_fulfillment_types);
router.put("/:id/order-fulfillment-types", check_auth, check_permissions([{ unique_code: 'ADM_WAREHOUSES', permissions: ['edit'] }, { unique_code: 'ADM_WH_KIT_ACT', permissions: ['edit'] }]), warehouse_handler.update_warehouse_order_fulfillment_types);
router.post("/validation/sections/add", check_auth, check_permissions([{ unique_code: 'ADM_WAREHOUSES', permissions: ['add'] }]), warehouse_handler.add_warehouse_validation_section);
router.get("/validation/sections/:warehouse_id", check_auth, check_permissions([{ unique_code: 'ADM_WAREHOUSES', permissions: ['view'] }]), warehouse_handler.get_warehouse_validation_sections);
router.get("/validation/sections/:warehouse_id/:id", check_auth, check_permissions([{ unique_code: 'ADM_WAREHOUSES', permissions: ['view'] }]), warehouse_handler.get_warehouse_validation_section);

module.exports = router
