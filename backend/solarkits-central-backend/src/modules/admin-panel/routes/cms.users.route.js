const express = require('express')
const router = express.Router()

const cms_users_handler = require('../controller/cms.users.handler');
const check_auth = require('../middlewares/check.auth');
const { CmsUser } = require('../models/user_db');
const check_protected = require('../middlewares/check.protected');

// Note: PermissionGuard/check_permissions removed as per request to not use unique_id for this module
router.get("/subordinates", check_auth, cms_users_handler.get_all_subordinates);
router.get("/coverage-report", check_auth, cms_users_handler.get_coverage_report);
router.get('/levels', check_auth, cms_users_handler.get_levels)
router.get('/countries', check_auth, cms_users_handler.get_active_countries)
router.get('/states/:country_id', check_auth, cms_users_handler.get_active_states)
router.get('/clusters/:state_id', check_auth, cms_users_handler.get_active_clusters)
router.get('/districts/:cluster_id', check_auth, cms_users_handler.get_active_districts)
router.get('/urban-cities/:district_id', check_auth, cms_users_handler.get_urban_cities)
router.get('/rural-cities/:urban_city_id', check_auth, cms_users_handler.get_rural_cities)

router.post('/parent-users', check_auth, cms_users_handler.get_parent_users)
router.get('/departments', check_auth, cms_users_handler.get_departments)
router.get('/roles/:level_id', check_auth, cms_users_handler.get_roles_by_level)
router.get('/roles/:department_id/:level_id', check_auth, cms_users_handler.get_roles_by_level_and_department)
router.get('/panels', check_auth, cms_users_handler.get_panels_with_products)
router.get('/saas-products', check_auth, cms_users_handler.get_saas_products_with_countries)
router.get('/:id/panels', check_auth, cms_users_handler.get_user_panels)
router.get('/scope-hierarchy/:level_id/:scope_id', check_auth, cms_users_handler.get_scope_hierarchy)
router.get('/:level_id/:scope_id', check_auth, cms_users_handler.get_cms_users)

router.post('/', check_auth, cms_users_handler.add_cms_user)
router.put('/:id', check_auth, check_protected(CmsUser), cms_users_handler.update_cms_user)
router.patch('/:id/status', check_auth, check_protected(CmsUser), cms_users_handler.toggle_cms_user_status)

module.exports = router