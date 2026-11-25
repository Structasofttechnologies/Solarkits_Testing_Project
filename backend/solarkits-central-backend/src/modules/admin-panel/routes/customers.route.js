const express = require('express')
const router = express.Router()

const customer_handler = require('../controller/customers.handler');
const check_auth = require('../middlewares/check.auth');

router.get("/customers-types", check_auth, customer_handler.get_customers_types);

module.exports = router