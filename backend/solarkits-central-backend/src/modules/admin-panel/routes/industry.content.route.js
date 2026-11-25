/**
 * industry.content.route.js
 *
 * Admin routes for Industry Content Management.
 * Prefix (registered in index.js): /admin-api/industry-content
 *
 * All routes require CMS auth.
 * Super Admin bypasses module permission checks automatically.
 * Non-super-admin users need ADM_INDUSTRY_CONTENT module permissions.
 *
 * Industry Content Management System
 */

const express = require('express');
const router  = express.Router();

const check_auth        = require('../middlewares/check.auth');
const check_permissions = require('../middlewares/check.permissions');
const handler           = require('../controller/industry.content.handler');
const { industry_media_upload } = require('../middlewares/industry.media.upload');

// ── Permission arrays ─────────────────────────────────────────────────────────
const CAN_VIEW = [
  { unique_code: 'ADM_INDUSTRY_CONTENT', permissions: ['view'] },
  { unique_code: 'ADM_INDUSTRY_TYPES', permissions: ['view'] },
  { unique_code: 'ADM_INDUSTRY_THEMES', permissions: ['view'] },
  { unique_code: 'ADM_WEBSITE_CFG', permissions: ['view'] },
  { unique_code: 'ADM_PROD_CFG', permissions: ['view'] },
  { unique_code: '00000000', permissions: ['view'] },
];

const CAN_ADD = [
  { unique_code: 'ADM_INDUSTRY_CONTENT', permissions: ['add'] },
  { unique_code: 'ADM_INDUSTRY_TYPES', permissions: ['add'] },
  { unique_code: 'ADM_INDUSTRY_THEMES', permissions: ['add'] },
  { unique_code: 'ADM_WEBSITE_CFG', permissions: ['add'] },
  { unique_code: 'ADM_PROD_CFG', permissions: ['add'] },
  { unique_code: '00000000', permissions: ['add'] },
];

const CAN_EDIT = [
  { unique_code: 'ADM_INDUSTRY_CONTENT', permissions: ['edit'] },
  { unique_code: 'ADM_INDUSTRY_TYPES', permissions: ['edit'] },
  { unique_code: 'ADM_INDUSTRY_THEMES', permissions: ['edit'] },
  { unique_code: 'ADM_WEBSITE_CFG', permissions: ['edit'] },
  { unique_code: 'ADM_PROD_CFG', permissions: ['edit'] },
  { unique_code: '00000000', permissions: ['edit'] },
];

const CAN_DELETE = [
  { unique_code: 'ADM_INDUSTRY_CONTENT', permissions: ['delete'] },
  { unique_code: 'ADM_INDUSTRY_TYPES', permissions: ['delete'] },
  { unique_code: 'ADM_INDUSTRY_THEMES', permissions: ['delete'] },
  { unique_code: 'ADM_WEBSITE_CFG', permissions: ['delete'] },
  { unique_code: 'ADM_PROD_CFG', permissions: ['delete'] },
  { unique_code: '00000000', permissions: ['delete'] },
];

// ── Content CRUD ──────────────────────────────────────────────────────────────
router.get('/list',        check_auth, check_permissions(CAN_VIEW),   handler.list_content);
router.get('/detail/:id',  check_auth, check_permissions(CAN_VIEW),   handler.get_content_detail);
router.post('/create',     check_auth, check_permissions(CAN_ADD),    handler.create_content);
router.put('/update/:id',  check_auth, check_permissions(CAN_EDIT),   handler.update_content);

// ── Media management ──────────────────────────────────────────────────────────
router.post(
  '/upload-media/:id',
  check_auth,
  check_permissions(CAN_EDIT),
  industry_media_upload('media'),
  handler.upload_content_media
);
router.delete('/delete-media/:media_id', check_auth, check_permissions(CAN_DELETE), handler.delete_content_media);

// ── Industry assignment ───────────────────────────────────────────────────────
router.post('/set-industries/:id', check_auth, check_permissions(CAN_EDIT), handler.set_industry_assignments);

// ── Lifecycle & Operations ───────────────────────────────────────────────────
router.put('/publish/:id',        check_auth, check_permissions(CAN_EDIT), handler.publish_content);
router.put('/unpublish/:id',      check_auth, check_permissions(CAN_EDIT), handler.unpublish_content);
router.put('/schedule/:id',       check_auth, check_permissions(CAN_EDIT), handler.schedule_content);
router.put('/archive/:id',        check_auth, check_permissions(CAN_EDIT), handler.archive_content);
router.put('/toggle-active/:id',  check_auth, check_permissions(CAN_EDIT), handler.toggle_active);
router.put('/reorder',            check_auth, check_permissions(CAN_EDIT), handler.reorder_content);
router.post('/duplicate/:id',     check_auth, check_permissions(CAN_ADD),  handler.duplicate_content);
router.post('/bulk-action',       check_auth, check_permissions(CAN_EDIT), handler.bulk_action);

// ── Preview ───────────────────────────────────────────────────────────────────
router.get('/preview/:id', check_auth, check_permissions(CAN_VIEW), handler.preview_content);

// ── Public Storefront Access (no auth — for SolarShop India website) ─────────
router.get('/public/list',        handler.list_public_content);
router.get('/public/detail/:id',  handler.get_public_content_detail);

// ── Analytics ─────────────────────────────────────────────────────────────────
// Track event — available to frontend (no admin auth needed, rate-limited in production)
router.post('/analytics/track', handler.track_analytics);
router.get('/analytics/:id',    check_auth, check_permissions(CAN_VIEW), handler.get_analytics);

module.exports = router;

