'use strict';

const express = require('express');
const router = express.Router();

const handler = require('../controller/admin.notifications.handler');

// SSE stream for real-time notification events
router.get('/stream', handler.sse_stream);

// Notification management endpoints
router.get('/', handler.get_notifications);
router.get('/unread-count', handler.get_unread_count);
router.post('/seed-sample', handler.seed_sample);
router.patch('/:id/read', handler.mark_as_read);
router.post('/mark-all-read', handler.mark_all_read);
router.delete('/clear-all', handler.clear_all_notifications);
router.delete('/:id', handler.delete_notification);

module.exports = router;
