const express = require('express');
const router = express.Router();

const check_auth = require('../middlewares/check.auth');
const check_permissions = require('../middlewares/check.permissions');
const handler = require('../controller/best_seller_kits.handler');

const permissionCodes = [
  { unique_code: 'ADM_COMBO_KITS', permissions: ['view', 'add', 'edit', 'delete'] },
  { unique_code: 'ADM_COMBO_CFG', permissions: ['view', 'add', 'edit', 'delete'] },
  { unique_code: 'ADM_ORDER_SETTINGS', permissions: ['view', 'add', 'edit', 'delete'] },
];

router.get('/', check_auth, check_permissions(permissionCodes), handler.get_best_sellers);
router.post('/', check_auth, check_permissions(permissionCodes), handler.create_best_seller);
router.put('/:id', check_auth, check_permissions(permissionCodes), handler.update_best_seller);
router.delete('/:id', check_auth, check_permissions(permissionCodes), handler.delete_best_seller);
router.patch('/:id/toggle-status', check_auth, check_permissions(permissionCodes), handler.toggle_best_seller_status);

module.exports = router;
