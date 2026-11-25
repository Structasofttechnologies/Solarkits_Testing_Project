/**
 * reseller.quotes.route.js
 * Prefix: /api/india/v1/reseller/quotes
 * Auth: verify_reseller_auth
 */
'use strict';

const express = require('express');
const router  = express.Router();
const { verify_reseller_auth } = require('../../middlewares/verify_reseller_auth');
const h = require('../../controller/epc.quotes.handler');

// All routes require Franchisee auth
router.use(verify_reseller_auth);

/* ── Eligibility (called by the stepper wizard) ─────────────────────────── */
router.get('/eligible-epcs',             h.get_eligible_epcs);
router.get('/eligible-industry-types',   h.get_eligible_industry_types);
router.get('/eligible-project-types',    h.get_eligible_project_types);
router.get('/eligible-kits',             h.get_eligible_kits);
router.get('/eligible-warranties',       h.get_eligible_warranties);
router.get('/eligible-warehouses',       h.get_eligible_warehouses);
router.post('/validate-eligibility',     h.validate_eligibility);

/* ── Quote Settings (public read for stepper defaults) ─────────────────── */
router.get('/settings',                  h.get_quote_settings);

/* ── Dashboard ──────────────────────────────────────────────────────────── */
router.get('/dashboard',                 h.get_dashboard);

/* ── Follow-up management (cross-quote) ─────────────────────────────────── */
// IMPORTANT: these static routes MUST come before /:id
router.get('/follow-ups/list',           h.list_all_followups);
router.get('/follow-ups/today',          (req, res, next) => { req.query.date_filter = 'today';     return h.list_all_followups(req, res, next); });
router.get('/follow-ups/tomorrow',       (req, res, next) => { req.query.date_filter = 'tomorrow';  return h.list_all_followups(req, res, next); });
router.get('/follow-ups/this-week',      (req, res, next) => { req.query.date_filter = 'this_week'; return h.list_all_followups(req, res, next); });
router.get('/follow-ups/overdue',        (req, res, next) => { req.query.date_filter = 'overdue';   return h.list_all_followups(req, res, next); });
router.get('/follow-ups/future',         (req, res, next) => { req.query.date_filter = 'future';    return h.list_all_followups(req, res, next); });
router.put('/follow-ups/:id',            h.update_followup);

/* ── Quote CRUD ─────────────────────────────────────────────────────────── */
router.get('/',                          h.list_quotes);
router.post('/',                         h.create_draft);

router.get('/:id',                       h.get_quote);
router.put('/:id',                       h.update_draft);

/* ── Quote Actions ──────────────────────────────────────────────────────── */
router.post('/:id/generate',             h.generate_quote);
router.post('/:id/revise',               h.revise_quote);
router.post('/:id/convert-order',        h.convert_to_order);
router.get('/:id/pdf',                   h.get_pdf);
router.post('/:id/share',                h.share_quote);

/* ── Quote-specific follow-ups ──────────────────────────────────────────── */
router.get('/:id/activity',              h.get_activity);
router.post('/:id/follow-ups',           h.create_followup);
router.get('/:id/follow-ups',            h.list_quote_followups);

module.exports = router;
