/**
 * reseller.procurement.route.js
 *
 * Admin routes for Reseller Procurement Purchase Orders & Stock Inventory Ledgers.
 * Unique permission codes: RSL_PROCUREMENT, RSL_INVENTORY
 * Prefix: /admin-api/reseller-mgmt/procurement
 *
 * Phase R6 — Reseller Management System
 */

const express = require('express');
const router = express.Router();

const check_auth = require('../middlewares/check.auth');
const check_permissions = require('../middlewares/check.permissions');
const handler = require('../controller/reseller.procurement.handler');

router.get(
  '/list',
  check_auth,
  check_permissions([
    { unique_code: 'RSL_PROCUREMENT', permissions: ['view'] },
    { unique_code: 'RSL_MGMT', permissions: ['view'] },
  ]),
  handler.list_procurement_orders
);

router.post(
  '/create',
  check_auth,
  check_permissions([
    { unique_code: 'RSL_PROCUREMENT', permissions: ['add'] },
    { unique_code: 'RSL_MGMT', permissions: ['add'] },
  ]),
  handler.create_order
);

router.put(
  '/status/:id',
  check_auth,
  check_permissions([
    { unique_code: 'RSL_PROCUREMENT', permissions: ['edit'] },
    { unique_code: 'RSL_MGMT', permissions: ['edit'] },
  ]),
  handler.update_order_status
);

router.get(
  '/inventory/balance/:id',
  check_auth,
  check_permissions([{ unique_code: 'RSL_INVENTORY', permissions: ['view'] }]),
  handler.get_inventory_balance
);

router.post(
  '/inventory/adjust',
  check_auth,
  check_permissions([{ unique_code: 'RSL_INVENTORY', permissions: ['edit'] }]),
  handler.adjust_inventory
);

module.exports = router;
