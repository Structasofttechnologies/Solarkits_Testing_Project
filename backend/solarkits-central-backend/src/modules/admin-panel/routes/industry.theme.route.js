/**
 * industry.theme.route.js
 *
 * Admin routes for Industry Theme configuration.
 * Prefix: /admin-api/industry-themes
 *
 * Industry Content Management System
 */

const express = require('express');
const router  = express.Router();

const check_auth        = require('../middlewares/check.auth');
const check_permissions = require('../middlewares/check.permissions');
const handler           = require('../controller/industry.theme.handler');

const CAN_VIEW = [
  { unique_code: 'ADM_INDUSTRY_CONTENT', permissions: ['view'] },
  { unique_code: 'ADM_INDUSTRY_TYPES', permissions: ['view'] },
  { unique_code: 'ADM_INDUSTRY_THEMES', permissions: ['view'] },
  { unique_code: 'ADM_WEBSITE_CFG', permissions: ['view'] },
  { unique_code: 'ADM_PROD_CFG', permissions: ['view'] },
  { unique_code: '00000000', permissions: ['view'] },
];

const CAN_EDIT = [
  { unique_code: 'ADM_INDUSTRY_CONTENT', permissions: ['edit'] },
  { unique_code: 'ADM_INDUSTRY_TYPES', permissions: ['edit'] },
  { unique_code: 'ADM_INDUSTRY_THEMES', permissions: ['edit'] },
  { unique_code: 'ADM_WEBSITE_CFG', permissions: ['edit'] },
  { unique_code: 'ADM_PROD_CFG', permissions: ['edit'] },
  { unique_code: '00000000', permissions: ['edit'] },
];

router.get('/public/get', handler.get_theme);
router.get('/get',    check_auth, check_permissions(CAN_VIEW), handler.get_theme);
router.post('/upsert',check_auth, check_permissions(CAN_EDIT), handler.upsert_theme);
router.delete('/delete', check_auth, check_permissions(CAN_EDIT), handler.delete_theme);

module.exports = router;

