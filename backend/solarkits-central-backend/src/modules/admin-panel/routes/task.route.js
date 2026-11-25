const express = require('express')
const router = express.Router()
const check_auth = require('../middlewares/check.auth');
const task_handler = require('../controller/task.handler')

router.get('/users', check_auth, task_handler.get_users);

module.exports = router