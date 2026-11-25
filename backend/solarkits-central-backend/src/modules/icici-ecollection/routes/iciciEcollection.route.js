const express = require('express');
const router = express.Router();
const iciciController = require('../controllers/iciciEcollection.controller');

// ─── ICICI Bank Gateway Webhook Endpoints ──────────────────────────────
// MSG HOLD / Validation: Remitter validation before credit
router.post('/msg-hold', iciciController.handleMsgHold);
router.post('/validate', iciciController.handleMsgHold);

// MIS POSTING / Callback: Final payment credit & reconciliation
router.post('/mis-posting', iciciController.handleMisPosting);
router.post('/callback', iciciController.handleMisPosting);

// ─── Real-Time Stream (SSE) for Admin, Accounts & Franchise Dashboards ─
router.get('/stream', iciciController.streamPaymentEvents);

// ─── Utility Endpoints ──────────────────────────────────────────────────
// Fetch dedicated Virtual Account details for checkout
router.get('/van-details', iciciController.getVirtualAccountDetails);

// Fetch recent collection logs (for Accounts & Admin reconciliation view)
router.get('/history', iciciController.getRecentCollections);

module.exports = router;
