const express = require('express');
const router = express.Router();

const check_auth = require('../middlewares/check.auth');
const check_permissions = require('../middlewares/check.permissions');
const handler = require('../controller/unit.management.handler');

router.get('/', check_auth, check_permissions([{ unique_code: 'ADM_UNITS', permissions: ['view'] }, { unique_code: 'ADM_SKU', permissions: ['view'] }, { unique_code: 'ADM_PROD_TMPL', permissions: ['view'] }]), handler.get_units);
router.get('/groups', check_auth, check_permissions([{ unique_code: 'ADM_UNITS', permissions: ['view'] }, { unique_code: 'ADM_PROD_TMPL', permissions: ['view'] }]), handler.get_unit_groups);
router.get('/power-units', check_auth, check_permissions([{ unique_code: 'ADM_PROJ_TYPES', permissions: ['view'] }, { unique_code: 'ADM_PO_ORDERS', permissions: ['view'] }]), handler.get_power_units);

router.post('/', check_auth, check_permissions([{ unique_code: 'ADM_UNITS', permissions: ['add'] }]), handler.add_unit);
router.post('/groups', check_auth, check_permissions([{ unique_code: 'ADM_UNITS', permissions: ['add'] }]), handler.add_unit_group);

router.put('/:id',
    check_auth,
    check_permissions([{ unique_code: 'ADM_UNITS', permissions: ['edit'] }]),
    handler.update_unit
);

router.put('/groups/:id',
    check_auth,
    check_permissions([{ unique_code: 'ADM_UNITS', permissions: ['edit'] }]),
    handler.update_unit_group
);

router.delete('/:id', check_auth, check_permissions([{ unique_code: 'ADM_UNITS', permissions: ['delete'] }]), handler.delete_unit);
router.delete('/groups/:id', check_auth, check_permissions([{ unique_code: 'ADM_UNITS', permissions: ['delete'] }]), handler.delete_unit_group);


module.exports = router;