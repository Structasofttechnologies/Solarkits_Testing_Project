const express = require('express')
const router = express.Router()

router.use('/epcs',require('./india/epcs.route'));
router.use('/po-settings', require('./india/po_settings.route'));
router.use('/po-orders', require('./india/po_orders.route'));
router.use('/company-margins', require('./india/company_margins.route'));
router.use('/bulk-kit-settings', require('./india/bulk_kit_settings.route'));
router.use('/loose-order-settings', require('./loose_order_settings.route'));

module.exports = router