const express = require('express');
const router = express.Router();
const check_auth = require('../middlewares/check.auth');
const handler = require('../controller/website.content.handler');
const { upload_any_files } = require('../utils/upload.files');

// Multer upload middleware for website content (images up to 10MB)
const websiteImageUpload = upload_any_files('public/uploads/website_content', 10);

// Public route for storefront landing pages
router.get('/public/industry-hierarchy', require('../controller/project.types.handler').get_all_project_hierarchy);
router.get('/public/:websiteKey', handler.get_content);

// Admin-authenticated routes
router.post('/upload-image', check_auth, websiteImageUpload, handler.upload_image);
router.get('/:websiteKey', check_auth, handler.get_content);
router.put('/:websiteKey', check_auth, handler.update_content);
router.post('/:websiteKey/reset', check_auth, handler.reset_content);

module.exports = router;
