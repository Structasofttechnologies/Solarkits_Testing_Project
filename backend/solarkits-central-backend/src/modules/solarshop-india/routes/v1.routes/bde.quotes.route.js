/**
 * bde.quotes.route.js
 * Prefix: /api/bde/v1/quotes
 * Auth: verify_bde_auth
 *
 * Same handler as Franchisee — backend scoping via req.bde / req.reseller context.
 */
'use strict';

const express = require('express');
const router  = express.Router();
const { verify_bde_auth } = require('../../middlewares/verify_bde_auth');
const h = require('../../controller/epc.quotes.handler');

// All routes require BDE auth
router.use(verify_bde_auth);

/* ── Eligibility ────────────────────────────────────────────────────────── */
router.get('/eligible-epcs',             h.get_eligible_epcs);
router.get('/eligible-industry-types',   h.get_eligible_industry_types);
router.get('/eligible-project-types',    h.get_eligible_project_types);
router.get('/eligible-kits',             h.get_eligible_kits);
router.get('/eligible-warranties',       h.get_eligible_warranties);
router.get('/eligible-warehouses',       h.get_eligible_warehouses);
router.post('/validate-eligibility',     h.validate_eligibility);

/* ── Quote Settings ─────────────────────────────────────────────────────── */
router.get('/settings',                  h.get_quote_settings);

/* ── Dashboard ──────────────────────────────────────────────────────────── */
router.get('/dashboard',                 h.get_dashboard);

/* ── Follow-up management (cross-quote) — static routes FIRST ──────────── */
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

/* ── Per-quote follow-ups ────────────────────────────────────────────────── */
router.get('/:id/activity',              h.get_activity);
router.post('/:id/follow-ups',           h.create_followup);
router.get('/:id/follow-ups',            h.list_quote_followups);

module.exports = router;
