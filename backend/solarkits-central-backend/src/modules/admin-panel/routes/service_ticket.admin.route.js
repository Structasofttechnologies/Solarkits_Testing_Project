/**
 * service_ticket.admin.route.js
 *
 * Admin routes for Service Ticket / Kit Item Replacement Module.
 * Prefix: /admin-api/service-tickets
 */

const express = require('express');
const router = express.Router();

const check_auth = require('../middlewares/check.auth');
const handler = require('../../solarshop-india/controller/service_ticket.handler');

// All admin routes require authentication only — sidebar visibility controlled by unique_id prefix ADM_
router.use(check_auth);

// ── Stats (must be before /:id to avoid conflict) ────────────────────────────
router.get('/stats', handler.admin_ticket_stats);

// ── List all tickets with filters ────────────────────────────────────────────
router.get('/list', handler.admin_list_tickets);

// ── Single ticket detail ──────────────────────────────────────────────────────
router.get('/:id', handler.admin_get_ticket);

// ── Review / update ticket status ────────────────────────────────────────────
router.patch('/:id/review', handler.admin_review_ticket);

module.exports = router;
