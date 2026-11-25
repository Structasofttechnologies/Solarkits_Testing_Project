'use strict';

const express = require('express');
const router = express.Router();

const notificationController = require('../controllers/notification/notification.controller');

router.get('/', notificationController.get_notifications);
router.post('/mark-read', notificationController.mark_as_read);
router.post('/dispatch', notificationController.dispatch_notification);

module.exports = router;
