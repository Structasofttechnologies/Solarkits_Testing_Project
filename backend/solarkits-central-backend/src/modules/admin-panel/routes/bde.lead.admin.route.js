const express = require('express');
const router = express.Router();
const handler = require('../controller/bde.lead.admin.handler');

// Leads Management
router.get('/list', handler.list_bde_leads);
router.get('/detail/:id', handler.get_bde_lead_detail);
router.post('/reassign/:id', handler.reassign_bde_lead);

// Attributed Franchisees Management
router.get('/franchisees', handler.list_attributed_franchisees);
router.post('/franchisees/reassign/:id', handler.reassign_franchisee_bde);

// Territory Exception Requests
router.get('/territory-exceptions', handler.list_territory_exceptions);
router.post('/territory-exceptions/review/:id', handler.review_territory_exception);

// Conversion Funnel Analytics
router.get('/conversion-funnel', handler.get_conversion_funnel);

module.exports = router;
