/**
 * estimator.admin.route.js — Admin routes for BOM Management and Estimator Settings.
 * Prefix: /admin-api/estimator
 */

'use strict';

const express = require('express');
const router = express.Router();
const check_auth = require('../middlewares/check.auth');
const check_permissions = require('../middlewares/check.permissions');
const h = require('../controller/estimator.admin.handler');

const PERM_VIEW = [{ unique_code: 'ADM_SOLAR_SHOP', permissions: ['view'] }];
const PERM_EDIT = [{ unique_code: 'ADM_SOLAR_SHOP', permissions: ['edit'] }];
const PERM_ADD  = [{ unique_code: 'ADM_SOLAR_SHOP', permissions: ['add'] }];
const PERM_DEL  = [{ unique_code: 'ADM_SOLAR_SHOP', permissions: ['delete'] }];

/* ── Project BOM Items ───────────────────────────────────────────────────── */
router.get('/project-boms/hierarchy-options', check_auth, check_permissions(PERM_VIEW), h.get_hierarchy_options);
router.get('/project-boms/available-kits',    check_auth, check_permissions(PERM_VIEW), h.get_available_kits);
router.get('/project-boms',                  check_auth, check_permissions(PERM_VIEW), h.list_bom_items);
router.post('/project-boms',                 check_auth, check_permissions(PERM_ADD),  h.create_bom_item);
router.get('/project-boms/:id',              check_auth, check_permissions(PERM_VIEW), h.get_bom_item);
router.put('/project-boms/:id',              check_auth, check_permissions(PERM_EDIT), h.update_bom_item);
router.patch('/project-boms/:id/status',     check_auth, check_permissions(PERM_EDIT), h.toggle_bom_status);
router.delete('/project-boms/:id',           check_auth, check_permissions(PERM_DEL),  h.delete_bom_item);
router.get('/project-boms/:id/history',      check_auth, check_permissions(PERM_VIEW), h.get_bom_rate_history);

/* ── Estimator Global Settings ───────────────────────────────────────────── */
router.get('/settings',                      check_auth, check_permissions(PERM_VIEW), h.get_estimator_settings);
router.put('/settings',                      check_auth, check_permissions(PERM_EDIT), h.update_estimator_settings);
router.post('/settings',                     check_auth, check_permissions(PERM_EDIT), h.update_estimator_settings);

/* ── Kit Maximum Margin Management ────────────────────────────────────────── */
router.put('/kits/max-margins',               check_auth, check_permissions(PERM_EDIT), h.update_kits_max_margin);

module.exports = router;
