const express = require('express')
const router = express.Router()

const warehouse_handler = require('../controller/warehouses.handler');
const check_auth = require('../middlewares/check.auth');
const check_permissions = require('../middlewares/check.permissions');

router.post("/add-warehouse", check_auth, check_permissions([{ unique_code: 'ADM_WAREHOUSES', permissions: ['add'] }]), warehouse_handler.add_warehouse);
router.get("/", check_auth, check_permissions([{ unique_code: 'ADM_WAREHOUSES', permissions: ['view'] }, { unique_code: 'ADM_PO_ORDERS', permissions: ['view'] }, { unique_code: 'ADM_CO_MARGIN', permissions: ['view'] }, { unique_code: 'ADM_BULK_COMBO', permissions: ['view'] }, { unique_code: 'ADM_WH_KIT_ACT', permissions: ['view'] }, { unique_code: 'ADM_DELIVERY_MGMT', permissions: ['view'] }, { unique_code: 'ADM_COMBO_KITS', permissions: ['view'] }, { unique_code: 'ADM_COMBO_CFG', permissions: ['view'] }]), warehouse_handler.get_warehouses);
router.get("/district/:district_id", check_auth, check_permissions([{ unique_code: 'ADM_COMBO_KITS', permissions: ['view'] }, { unique_code: 'ADM_CUSTOMIZE_KITS', permissions: ['view'] }, { unique_code: 'ADM_BETCHMARK_PRICE_MASTER', permissions: ['view'] }]), warehouse_handler.get_warehouses_by_district);
router.post("/validation/fields/add", check_auth, check_permissions([{ unique_code: 'ADM_WAREHOUSES', permissions: ['add'] }]), warehouse_handler.add_warehouse_validation_field);
router.post("/validation/validaion-status", check_auth, check_permissions([{ unique_code: 'ADM_WAREHOUSES', permissions: ['edit'] }]), warehouse_handler.set_warehouse_validation_field_statuses)
router.post("/validation/change-status", check_auth, check_permissions([{ unique_code: 'ADM_WAREHOUSES', permissions: ['edit'] }]), warehouse_handler.change_warehouse_validation_status);
router.get("/:id", check_auth, check_permissions([{ unique_code: 'ADM_WAREHOUSES', permissions: ['view'] }]), warehouse_handler.get_warehouse);
router.put("/:id", check_auth, check_permissions([{ unique_code: 'ADM_WAREHOUSES', permissions: ['edit'] }]), warehouse_handler.update_warehouse);
router.patch("/:id/order-fulfillment-types", check_auth, check_permissions([{ unique_code: 'ADM_WAREHOUSES', permissions: ['edit'] }, { unique_code: 'ADM_WH_KIT_ACT', permissions: ['edit'] }]), warehouse_handler.update_warehouse_order_fulfillment_types);
router.put("/:id/order-fulfillment-types", check_auth, check_permissions([{ unique_code: 'ADM_WAREHOUSES', permissions: ['edit'] }, { unique_code: 'ADM_WH_KIT_ACT', permissions: ['edit'] }]), warehouse_handler.update_warehouse_order_fulfillment_types);
router.post("/validation/sections/add", check_auth, check_permissions([{ unique_code: 'ADM_WAREHOUSES', permissions: ['add'] }]), warehouse_handler.add_warehouse_validation_section);
router.get("/validation/sections/:warehouse_id", check_auth, check_permissions([{ unique_code: 'ADM_WAREHOUSES', permissions: ['view'] }]), warehouse_handler.get_warehouse_validation_sections);
router.get("/validation/sections/:warehouse_id/:id", check_auth, check_permissions([{ unique_code: 'ADM_WAREHOUSES', permissions: ['view'] }]), warehouse_handler.get_warehouse_validation_section);

module.exports = router
