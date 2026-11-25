/**
 * business.profiles.route.js
 *
 * Routes for Business Profile Master management.
 * Mounted at:
 *   - /admin-api/business-profiles
 *   - /api/business-profiles
 *   - /india/v1/business-profiles
 */

const express = require('express');
const router = express.Router();

const check_auth = require('../middlewares/check.auth');
const handler = require('../controller/business.profiles.handler');

// ─── Public / Client Portal Route (Dropdown options for Franchise Apply & Storefront) ─────
router.get('/active', handler.list_active_business_profiles);

// ─── Admin Master Routes ──────────────────────────────────────────────────────
router.get('/list', check_auth, handler.list_business_profiles);
router.post('/add', check_auth, handler.add_business_profile);
router.post('/create', check_auth, handler.add_business_profile);
router.put('/update/:id', check_auth, handler.update_business_profile);
router.patch('/toggle/:id', check_auth, handler.toggle_business_profile_status);
router.put('/toggle/:id', check_auth, handler.toggle_business_profile_status);
router.delete('/delete/:id', check_auth, handler.delete_business_profile);

module.exports = router;
