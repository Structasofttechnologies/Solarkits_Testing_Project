const express = require('express')
const router = express.Router()

const root_handler = require('../controller/root.handler');
const check_auth = require('../middlewares/check.auth');

router.get('/user-data', check_auth, root_handler.get_user_data);
router.get('/user-modules', check_auth, root_handler.get_user_modules);

module.exports = router