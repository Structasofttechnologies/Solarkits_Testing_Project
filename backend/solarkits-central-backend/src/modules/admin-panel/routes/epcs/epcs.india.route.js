const express = require('express')
const router = express.Router()
const check_auth = require('../../middlewares/check.auth');
const check_permissions = require('../../middlewares/check.permissions');
const epcs_india_route = require('../../controller/epcs/india.epcs.handler');

router.get('/list', check_auth, check_permissions([{ unique_code: 'ADM_EPC', permissions: ['view'] }]), epcs_india_route.get_epcs);
router.get('/states', check_auth, check_permissions([{ unique_code: 'ADM_EPC', permissions: ['view'] }]), epcs_india_route.get_indian_states);
router.post('/single', check_auth, check_permissions([{ unique_code: 'ADM_EPC', permissions: ['add'] }]), epcs_india_route.add_single_epc);
router.post('/list', check_auth, check_permissions([{ unique_code: 'ADM_EPC', permissions: ['add'] }]), epcs_india_route.add_epcs);

module.exports = router