const express = require('express')
const router = express.Router()

const geolocation_handler = require('../controller/geolocation.handler')
const check_auth = require('../middlewares/check.auth');
const check_permissions = require('../middlewares/check.permissions');

router.post("/request-deactivation-otp", check_auth, check_permissions([{ unique_code: 'ADM_SETUP_LOC', permissions: ['add'] }]), geolocation_handler.deactivation_otp)

router.get("/countries", check_auth, check_permissions([{ unique_code: 'ADM_SETUP_LOC', permissions: ['view'] }, { unique_code: 'ADM_LOC', permissions: ['view'] }, { unique_code: 'ADM_MFG_BRANDS', permissions: ['view'] },]), geolocation_handler.get_countries)
router.get("/get-countries", check_auth, geolocation_handler.get_countries);
router.get("/get-states", check_auth, geolocation_handler.get_states);
router.get("/get-districts", check_auth, geolocation_handler.get_districts);
router.get("/get-active-states", check_auth, geolocation_handler.get_active_states);
router.get("/get-active-districts", check_auth, geolocation_handler.get_active_districts);
router.get("/active-states", check_auth, geolocation_handler.get_active_states);
router.get("/active-districts", check_auth, geolocation_handler.get_active_districts);
router.get("/states", check_auth, geolocation_handler.get_states);
router.get("/states/:country_id", check_auth, geolocation_handler.get_states);
router.get("/districts", check_auth, geolocation_handler.get_districts);
router.get("/districts/:state_id", check_auth, geolocation_handler.get_districts);
router.post("/bulk-upload-locations", check_auth, geolocation_handler.bulk_upload_locations);
router.get("/district-pincodes/:district_id", check_auth, geolocation_handler.get_district_pincodes);

const fpoGeoPermissions = [
    { unique_code: 'FPO_COMM', permissions: ['view'] },
    { unique_code: 'FPO_MOQ', permissions: ['view'] },
    { unique_code: 'FPO_SETTINGS', permissions: ['view'] },
    { unique_code: 'FPO_TARGET', permissions: ['view'] },
    { unique_code: 'ADM_RESELLER', permissions: ['view'] },
    { unique_code: 'RSL_PLAN', permissions: ['view'] },
];

router.get("/active-countries",
    check_auth,
    check_permissions([
        { unique_code: 'ADM_SETUP_LOC', permissions: ['view'] },
        { unique_code: 'ADM_CLUSTER_SETUP', permissions: ['view', 'add', 'edit', 'delete'] },
        { unique_code: 'ADM_EPC', permissions: ['view'] },
        { unique_code: 'ADM_APPROVE_EPC', permissions: ['view'] },
        { unique_code: 'ADM_DEPTS', permissions: ['view', 'add', 'edit'] },
        { unique_code: 'ADM_RBAC', permissions: ['view', 'add', 'edit'] },
        { unique_code: 'ADM_WAREHOUSES', permissions: ['view', 'add', 'edit'] },
        { unique_code: 'ADM_COMBO_KITS', permissions: ['view'] },
        { unique_code: 'ADM_COMBO_KIT_VARIANTS', permissions: ['view'] },
        { unique_code: 'ADM_CUSTOMIZE_KITS', permissions: ['view'] },
        { unique_code: 'ADM_BETCHMARK_PRICE_MASTER', permissions: ['view'] },
        { unique_code: 'ADM_PO_ORDERS', permissions: ['view'] },
        { unique_code: 'ADM_CO_MARGIN', permissions: ['view'] },
        { unique_code: 'ADM_BULK_COMBO', permissions: ['view'] },
        { unique_code: 'ADM_WH_KIT_ACT', permissions: ['view'] },
        { unique_code: 'ADM_ORDER_SETTINGS', permissions: ['view'] },
        { unique_code: 'ADM_BDE_MGMT', permissions: ['view', 'add', 'edit'] },
        ...fpoGeoPermissions,
    ]),
    geolocation_handler.get_active_countries);
router.post("/country", check_auth, check_permissions([{ unique_code: 'ADM_SETUP_LOC', permissions: ['view'] }, { unique_code: 'ADM_LOC', permissions: ['view'] }]), geolocation_handler.get_country)
router.post("/activate-country", check_auth, check_permissions([{ unique_code: 'ADM_SETUP_LOC', permissions: ['edit'] }]), geolocation_handler.activate_country)
router.post("/deactivate-country", check_auth, check_permissions([{ unique_code: 'ADM_SETUP_LOC', permissions: ['edit'] }]), geolocation_handler.deactivate_country)

router.post("/states", check_auth, check_permissions([{ unique_code: 'ADM_SETUP_LOC', permissions: ['view'] }, { unique_code: 'ADM_LOC', permissions: ['view'] }, { unique_code: 'ADM_APPROVE_EPC', permissions: ['view'] }, { unique_code: 'ADM_MFG_BRANDS', permissions: ['view'] }, { unique_code: 'ADM_COMBO_KITS', permissions: ['view'] }, { unique_code: 'ADM_CUSTOMIZE_KITS', permissions: ['view'] }, ...fpoGeoPermissions]), geolocation_handler.get_states)
router.post("/active-states", check_auth, check_permissions([{ unique_code: 'ADM_SETUP_LOC', permissions: ['view'] }, { unique_code: 'ADM_CLUSTER_SETUP', permissions: ['view', 'add', 'edit', 'delete'] }, { unique_code: 'ADM_WAREHOUSES', permissions: ['view', 'add', 'edit', 'delete'] }, { unique_code: 'ADM_COMBO_KITS', permissions: ['view'] }, { unique_code: 'ADM_COMBO_KIT_VARIANTS', permissions: ['view'] }, { unique_code: 'ADM_CUSTOMIZE_KITS', permissions: ['view'] }, { unique_code: 'ADM_BETCHMARK_PRICE_MASTER', permissions: ['view'] }, { unique_code: 'ADM_PO_ORDERS', permissions: ['view'] }, { unique_code: 'ADM_CO_MARGIN', permissions: ['view'] }, { unique_code: 'ADM_BULK_COMBO', permissions: ['view'] }, { unique_code: 'ADM_WH_KIT_ACT', permissions: ['view'] }, { unique_code: 'ADM_ORDER_SETTINGS', permissions: ['view'] }, { unique_code: 'ADM_BDE_MGMT', permissions: ['view', 'add', 'edit'] }, ...fpoGeoPermissions]), geolocation_handler.get_active_states)
router.post("/state", check_auth, check_permissions([{ unique_code: 'ADM_SETUP_LOC', permissions: ['view'] }, { unique_code: 'ADM_LOC', permissions: ['view'] }]), geolocation_handler.get_state)
router.post("/activate-state", check_auth, check_permissions([{ unique_code: 'ADM_SETUP_LOC', permissions: ['edit'] }]), geolocation_handler.activate_state)
router.post("/deactivate-state", check_auth, check_permissions([{ unique_code: 'ADM_SETUP_LOC', permissions: ['edit'] }]), geolocation_handler.deactivate_state)

router.post("/districts", check_auth, check_permissions([{ unique_code: 'ADM_SETUP_LOC', permissions: ['view'] }, { unique_code: 'ADM_LOC', permissions: ['view'] }, { unique_code: 'ADM_MFG_BRANDS', permissions: ['view'] }, ...fpoGeoPermissions]), geolocation_handler.get_districts)
router.post("/active-districts", check_auth, check_permissions([{ unique_code: 'ADM_SETUP_LOC', permissions: ['view'] }, { unique_code: 'ADM_CLUSTER_SETUP', permissions: ['view'] }, { unique_code: 'ADM_ORDER_SETTINGS', permissions: ['view'] }, { unique_code: 'ADM_BDE_MGMT', permissions: ['view', 'add', 'edit'] }, ...fpoGeoPermissions]), geolocation_handler.get_active_districts)
router.post("/district", check_auth, check_permissions([{ unique_code: 'ADM_SETUP_LOC', permissions: ['view'] }, { unique_code: 'ADM_LOC', permissions: ['view'] }, { unique_code: 'ADM_CLUSTER_SETUP', permissions: ['view'] }, { unique_code: 'ADM_WAREHOUSES', permissions: ['view'] }, { unique_code: 'ADM_SUPPLIERS', permissions: ['view'] }]), geolocation_handler.get_district)
router.post("/activate-district", check_auth, check_permissions([{ unique_code: 'ADM_SETUP_LOC', permissions: ['edit'] }]), geolocation_handler.activate_district)
router.post("/deactivate-district", check_auth, check_permissions([{ unique_code: 'ADM_SETUP_LOC', permissions: ['edit'] }]), geolocation_handler.deactivate_district)

router.get("/urban-cities/:district_id", check_auth, check_permissions([{ unique_code: 'ADM_SETUP_LOC', permissions: ['view'] }]), geolocation_handler.get_urban_cities);
router.post("/add-urban-cities", check_auth, check_permissions([{ unique_code: 'ADM_SETUP_LOC', permissions: ['add'] }]), geolocation_handler.add_urban_cities);
router.post("/exclude-urban-city", check_auth, check_permissions([{ unique_code: 'ADM_SETUP_LOC', permissions: ['edit'] }]), geolocation_handler.exclude_urban_city);
router.get("/excluded-urban-cities", check_auth, check_permissions([{ unique_code: 'ADM_SETUP_LOC', permissions: ['view'] }]), geolocation_handler.get_excluded_urban_cities);
router.delete("/excluded-urban-city/:city_id", check_auth, check_permissions([{ unique_code: 'ADM_SETUP_LOC', permissions: ['edit'] }]), geolocation_handler.delete_excluded_urban_city);

router.get("/rural-cities/:urban_city_id", check_auth, check_permissions([{ unique_code: 'ADM_SETUP_LOC', permissions: ['view'] }]), geolocation_handler.get_rural_cities);
router.post("/add-rural-cities", check_auth, check_permissions([{ unique_code: 'ADM_SETUP_LOC', permissions: ['add'] }]), geolocation_handler.add_rural_cities);
router.post("/exclude-rural-city", check_auth, check_permissions([{ unique_code: 'ADM_SETUP_LOC', permissions: ['edit'] }]), geolocation_handler.exclude_rural_city);
router.get("/excluded-rural-cities", check_auth, check_permissions([{ unique_code: 'ADM_SETUP_LOC', permissions: ['view'] }]), geolocation_handler.get_excluded_rural_cities);
router.delete("/excluded-rural-city/:city_id", check_auth, check_permissions([{ unique_code: 'ADM_SETUP_LOC', permissions: ['edit'] }]), geolocation_handler.delete_excluded_rural_city);

router.post("/add-cluster", check_auth, check_permissions([{ unique_code: 'ADM_CLUSTER_SETUP', permissions: ['add'] }]), geolocation_handler.add_cluster);
router.get("/clusters/:state_id", check_auth, check_permissions([{ unique_code: 'ADM_CLUSTER_SETUP', permissions: ['view'] }, { unique_code: 'ADM_WAREHOUSES', permissions: ['view'] }, { unique_code: 'ADM_COMBO_KITS', permissions: ['view'] }, { unique_code: 'ADM_CUSTOMIZE_KITS', permissions: ['view'] }, { unique_code: 'ADM_BETCHMARK_PRICE_MASTER', permissions: ['view'] }, { unique_code: 'ADM_PO_ORDERS', permissions: ['view'] }, { unique_code: 'ADM_CO_MARGIN', permissions: ['view'] }, { unique_code: 'ADM_BULK_COMBO', permissions: ['view'] }, { unique_code: 'ADM_WH_KIT_ACT', permissions: ['view'] }, { unique_code: 'ADM_ORDER_SETTINGS', permissions: ['view'] }]), geolocation_handler.get_clusters);
router.post("/assign-district-to-cluster", check_auth, check_permissions([{ unique_code: 'ADM_CLUSTER_SETUP', permissions: ['edit'] }]), geolocation_handler.assign_district_to_cluster);
router.post("/reassign-district-to-another-cluster-otp", check_auth, check_permissions([{ unique_code: 'ADM_CLUSTER_SETUP', permissions: ['edit'] }]), geolocation_handler.reassign_district_to_another_cluster_otp);
router.post("/reassign-district-to-another-cluster", check_auth, check_permissions([{ unique_code: 'ADM_CLUSTER_SETUP', permissions: ['edit'] }]), geolocation_handler.reassign_district_to_another_cluster);
router.get("/delete-cluster-otp/:cluster_id/:state_id", check_auth, check_permissions([{ unique_code: 'ADM_CLUSTER_SETUP', permissions: ['delete'] }]), geolocation_handler.delete_cluster_otp);
router.delete("/delete-cluster", check_auth, check_permissions([{ unique_code: 'ADM_CLUSTER_SETUP', permissions: ['delete'] }]), geolocation_handler.delete_cluster);
router.get("/zones/:cluster_id", check_auth, check_permissions([{ unique_code: 'ADM_CLUSTER_SETUP', permissions: ['view'] }]), geolocation_handler.get_zones_by_cluster);
router.post("/add-zone", check_auth, check_permissions([{ unique_code: 'ADM_CLUSTER_SETUP', permissions: ['add'] }]), geolocation_handler.add_zone);
router.delete("/delete-zone/:zone_id", check_auth, check_permissions([{ unique_code: 'ADM_CLUSTER_SETUP', permissions: ['delete'] }]), geolocation_handler.delete_zone);

module.exports = router