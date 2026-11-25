'use strict';

const express = require('express');
const router = express.Router();
const publicController = require('../controllers/public/public.controller');
const contentController = require('../controllers/cms/content.controller');

router.get('/products', publicController.get_products);
router.get('/products/:id', publicController.get_product_detail);
router.get('/plans', publicController.get_plans);
router.get('/plans/:codeOrId', publicController.get_plan_detail);
router.post('/check-territory-availability', publicController.check_territory_availability);
router.get('/content', contentController.get_public_content);
router.post('/application-status', publicController.get_application_status);
router.post('/contact', publicController.submit_contact_inquiry);

module.exports = router;
