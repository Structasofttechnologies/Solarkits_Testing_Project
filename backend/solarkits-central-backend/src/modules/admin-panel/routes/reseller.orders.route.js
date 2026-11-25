/**
 * reseller.orders.route.js
 *
 * Admin routes for Reseller Orders tracking (Commission & Dealer mode orders).
 * Unique permission code: RSL_MGMT
 * Prefix: /admin-api/reseller-mgmt/orders
 *
 * Phase 6 — Reseller Management System
 */

const express = require('express');
const router = express.Router();

const check_auth = require('../middlewares/check.auth');
const check_permissions = require('../middlewares/check.permissions');
const handler = require('../controller/reseller.checkout.handler');

const PERM_ORDERS_VIEW = [
  { unique_code: 'RSL_MGMT', permissions: ['view'] },
  { unique_code: 'ADM_LOOSE_ORDERS', permissions: ['view'] },
  { unique_code: 'ADM_PO_ORDERS', permissions: ['view'] },
];

router.get(
  '/list',
  check_auth,
  check_permissions(PERM_ORDERS_VIEW),
  handler.list_reseller_orders
);

router.get(
  '/po-orders',
  check_auth,
  check_permissions(PERM_ORDERS_VIEW),
  handler.list_fpo_orders
);

router.get(
  '/loose-orders',
  check_auth,
  check_permissions(PERM_ORDERS_VIEW),
  handler.list_loose_orders
);

router.get(
  '/stats',
  check_auth,
  check_permissions(PERM_ORDERS_VIEW),
  handler.get_orders_stats
);

// Module 1: Order Stage Progression & Vehicle Assignment
router.post(
  '/:id/stage/:stage',
  check_auth,
  check_permissions(PERM_ORDERS_VIEW),
  handler.update_order_stage
);

router.post(
  '/:id/assign-vehicle',
  check_auth,
  check_permissions(PERM_ORDERS_VIEW),
  handler.assign_order_vehicle
);

module.exports = router;
