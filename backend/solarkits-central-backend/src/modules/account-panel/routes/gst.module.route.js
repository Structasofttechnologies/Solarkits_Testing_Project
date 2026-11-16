const express = require('express');
const router = express.Router();
const gstHandler = require('../controller/gst.module.handler');
const check_auth = require('../middlewares/check.auth');

router.get('/summary', check_auth, gstHandler.get_gst_dashboard_summary);
router.get('/configs', check_auth, gstHandler.get_gst_configs);
router.post('/configs', check_auth, gstHandler.save_gst_config);
router.get('/gstr1', check_auth, gstHandler.get_gstr1_data);
router.get('/gstr3b', check_auth, gstHandler.get_gstr3b_data);
router.get('/gstr2b-reconciliation', check_auth, gstHandler.get_gstr2b_reconciliation);
router.post('/record-filing', check_auth, gstHandler.record_gst_filing);

module.exports = router;
