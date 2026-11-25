/**
 * admin.quote.settings.route.js
 * Prefix: /admin-api/quote-settings
 * Auth: check_auth + check_permissions
 * Permission code: QUOTE_MGMT
 */
'use strict';

const express = require('express');
const router  = express.Router();
const check_auth = require('../middlewares/check.auth');
const check_permissions = require('../middlewares/check.permissions');
const h = require('../controller/admin.quote.settings.handler');

const PERM_VIEW = [{ unique_code: 'ADM_SOLAR_SHOP', permissions: ['view'] }];
const PERM_EDIT = [{ unique_code: 'ADM_SOLAR_SHOP', permissions: ['edit'] }];
const PERM_ADD  = [{ unique_code: 'ADM_SOLAR_SHOP', permissions: ['add'] }];
const PERM_DEL  = [{ unique_code: 'ADM_SOLAR_SHOP', permissions: ['delete'] }];

/* ── Quote Settings ─────────────────────────────────────────────────────── */
router.get('/',                              check_auth, check_permissions(PERM_VIEW), h.get_settings);
router.put('/',                              check_auth, check_permissions(PERM_EDIT), h.update_settings);

/* ── Warranty Options ────────────────────────────────────────────────────── */
router.get('/warranty-options',              check_auth, check_permissions(PERM_VIEW), h.list_warranty_options);
router.post('/warranty-options',             check_auth, check_permissions(PERM_ADD),  h.create_warranty_option);
router.get('/warranty-options/:id',          check_auth, check_permissions(PERM_VIEW), h.get_warranty_option);
router.put('/warranty-options/:id',          check_auth, check_permissions(PERM_EDIT), h.update_warranty_option);
router.delete('/warranty-options/:id',       check_auth, check_permissions(PERM_DEL),  h.delete_warranty_option);

/* ── Analytics ───────────────────────────────────────────────────────────── */
router.get('/analytics',                     check_auth, check_permissions(PERM_VIEW), h.get_analytics);

/* ── Admin Quote List ─────────────────────────────────────────────────────── */
router.get('/quotes',                        check_auth, check_permissions(PERM_VIEW), h.list_all_quotes);
router.get('/quotes/:id',                    check_auth, check_permissions(PERM_VIEW), h.get_admin_quote);
router.get('/quotes/:id/pdf',                check_auth, check_permissions(PERM_VIEW), h.get_quote_pdf);

module.exports = router;
