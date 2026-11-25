const express = require('express');
const router = express.Router();
const handler = require('../../controller/knowledge_center.handler');

// Public/Partner access for EPC & Franchisee apps
router.get('/list', handler.list_videos);
router.post('/create', handler.create_video);
router.put('/:id', handler.update_video);
router.delete('/:id', handler.delete_video);

module.exports = router;
