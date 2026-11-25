/**
 * franchisee.kit.targets.route.js
 * Prefix: /admin-api/franchisee/kit-targets
 * Permission code: FPO_TARGET
 */
const express = require('express');
const router  = express.Router();
const check_auth = require('../middlewares/check.auth');
const check_permissions = require('../middlewares/check.permissions');
const h = require('../controller/franchisee.kit.targets.handler');

router.get('/list',               check_auth, check_permissions([{ unique_code: 'FPO_TARGET', permissions: ['view'] }]),   h.list_kit_targets);
router.get('/effective',          check_auth, check_permissions([{ unique_code: 'FPO_TARGET', permissions: ['view'] }]),   h.get_effective_target);
router.get('/progress',           check_auth, check_permissions([{ unique_code: 'FPO_TARGET', permissions: ['view'] }]),   h.list_progress);
router.post('/add',               check_auth, check_permissions([{ unique_code: 'FPO_TARGET', permissions: ['add']  }]),   h.add_kit_target);
router.put('/update',             check_auth, check_permissions([{ unique_code: 'FPO_TARGET', permissions: ['edit'] }]),   h.update_kit_target);
router.delete('/delete',          check_auth, check_permissions([{ unique_code: 'FPO_TARGET', permissions: ['delete'] }]), h.delete_kit_target);
router.post('/recalculate',       check_auth, check_permissions([{ unique_code: 'FPO_TARGET', permissions: ['edit'] }]),   h.trigger_recalculation);

module.exports = router;
