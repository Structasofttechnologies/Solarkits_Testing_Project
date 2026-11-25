const express = require('express')
const router = express.Router()

router.use('/in',require('./epcs/epcs.india.route'));

module.exports = router