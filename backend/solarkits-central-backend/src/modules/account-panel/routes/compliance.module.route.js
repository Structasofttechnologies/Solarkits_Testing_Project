const express = require('express');
const router = express.Router();
const complianceHandler = require('../controller/compliance.module.handler');
const check_auth = require('../middlewares/check.auth');

// Invoice 10-Point Validation Control Centre
router.get('/invoices', check_auth, complianceHandler.get_purchase_invoices);
router.post('/invoices/validate', check_auth, complianceHandler.create_and_validate_purchase_invoice);
router.post('/invoices/:id/post-ledger', check_auth, complianceHandler.post_invoice_to_ledger);

// Automated Compliance Alerts
router.get('/alerts', check_auth, complianceHandler.get_compliance_alerts);

// Statutory Compliance Calendar
router.get('/calendar', check_auth, complianceHandler.get_compliance_calendar);
router.post('/calendar', check_auth, complianceHandler.save_compliance_task);

module.exports = router;
