const express = require('express');
const router = express.Router();
const check_auth = require('../middlewares/check.auth');
const suppliers_handler = require('../controller/suppliers.handler');

// Auth routes (public / no check_auth)
router.get('/auth/districts', suppliers_handler.get_active_districts);

// Admin routes (require check_auth)
router.get('/admin/suppliers', check_auth, suppliers_handler.list_suppliers);
router.get('/admin/suppliers/:id', check_auth, suppliers_handler.get_supplier);
router.patch('/admin/suppliers/:id/approve', check_auth, suppliers_handler.approve_supplier);
router.patch('/admin/suppliers/:id/reject', check_auth, suppliers_handler.reject_supplier);

// State Requests
router.patch('/admin/suppliers/:id/state-requests/:requestId/approve', check_auth, suppliers_handler.approve_state_request);
router.patch('/admin/suppliers/:id/state-requests/:requestId/reject', check_auth, suppliers_handler.reject_state_request);

// Warehouses
router.patch('/admin/suppliers/:id/warehouses/:warehouseId/approve', check_auth, suppliers_handler.approve_warehouse);
router.patch('/admin/suppliers/:id/warehouses/:warehouseId/reject', check_auth, suppliers_handler.reject_warehouse);
router.patch('/admin/suppliers/:id/warehouses/:warehouseId/districts', check_auth, suppliers_handler.assign_warehouse_districts);

module.exports = router;
