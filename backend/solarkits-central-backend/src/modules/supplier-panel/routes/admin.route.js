const express = require('express');
const router = express.Router();
const admin = require('../controller/admin.handler');

// No auth check here — the admin panel backend handles its own auth.
// These routes are meant to be called from the admin panel backend or 
// directly from the admin panel frontend with CORS whitelisted.

router.get('/suppliers',              admin.list_suppliers);
router.get('/suppliers/:id',          admin.get_supplier);
router.patch('/suppliers/:id/approve',admin.approve_supplier);
router.patch('/suppliers/:id/reject', admin.reject_supplier);

// State Requests Approve/Reject
router.patch('/suppliers/:id/state-requests/:requestId/approve', admin.approve_state_request);
router.patch('/suppliers/:id/state-requests/:requestId/reject',  admin.reject_state_request);

// Warehouse Approve/Reject & Districts
router.patch('/suppliers/:id/warehouses/:warehouseId/approve', admin.approve_warehouse);
router.patch('/suppliers/:id/warehouses/:warehouseId/reject',  admin.reject_warehouse);
router.patch('/suppliers/:id/warehouses/:warehouseId/districts', admin.assign_warehouse_districts);

module.exports = router;
