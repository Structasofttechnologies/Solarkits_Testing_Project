const express = require('express');
const router = express.Router();

const check_auth = require('../middlewares/check.auth');
const check_permissions = require('../middlewares/check.permissions');
const handler = require('../controller/solar_kits.handler');
const { upload_any_files } = require('../utils/upload.files');

const PERMISSION_CODE = 'ADM_SOLAR_KITS';

const upload_to_cloudinary = upload_any_files('public/uploads/solar_kits', 10);

router.post(
  '/create-kit',
  check_auth,
  check_permissions([{ unique_code: PERMISSION_CODE, permissions: ['add'] }]),
  upload_to_cloudinary,
  handler.create_solar_kit
);

router.get(
  ['/', '/get-kits'],
  check_auth,
  check_permissions([{ unique_code: PERMISSION_CODE, permissions: ['view'] }, { unique_code: 'ADM_CUSTOMIZE_KITS', permissions: ['view'] }]),
  handler.get_solar_kits
);

router.put(
  '/update-kit',
  check_auth,
  check_permissions([{ unique_code: PERMISSION_CODE, permissions: ['edit'] }]),
  upload_to_cloudinary,
  handler.update_solar_kit
);

router.delete(
  '/delete-kit',
  check_auth,
  check_permissions([{ unique_code: PERMISSION_CODE, permissions: ['delete'] }]),
  handler.delete_solar_kit
);

module.exports = router;
