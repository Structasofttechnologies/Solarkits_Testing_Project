const express = require('express')
const router = express.Router()
const check_auth = require('../../../middlewares/check.auth');
const check_permissions = require('../../../middlewares/check.permissions');
const { upload_files } = require("../../../utils/upload.files");
const epcs_handler = require('../../../controller/solarshop/india/epcs.handler')

const uploadReferenceImage = upload_files("public/uploads/epc_reference_images", 5, "reference_image",1);

router.get('/requests', check_auth, check_permissions([{ unique_code: 'ADM_APPROVE_EPC', permissions: ['view'] }]),epcs_handler.get_epc_requests);
router.post('/update-status', check_auth, check_permissions([{ unique_code: 'ADM_APPROVE_EPC', permissions: ['edit'] }]),uploadReferenceImage,epcs_handler.update_epc_request_status);

module.exports = router;