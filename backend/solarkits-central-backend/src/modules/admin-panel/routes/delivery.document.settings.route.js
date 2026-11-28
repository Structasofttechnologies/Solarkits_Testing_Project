const express = require('express');
const router = express.Router();

const check_auth = require('../middlewares/check.auth');
const { upload_files } = require('../utils/upload.files');
const handler = require('../controller/delivery.document.settings.handler');

// ── Dynamic Delivery Documents Settings & Dual Verification Routes ─────────
router.get('/', check_auth, handler.get_settings);
router.post('/', check_auth, handler.save_settings);
router.get('/scopes', check_auth, handler.list_all_scope_settings);
router.get('/warehouses', check_auth, handler.get_available_warehouses);
router.delete('/:id', check_auth, handler.delete_scope_settings);

// File upload for Delivery Documents (Cloudinary)
router.post('/upload', check_auth, upload_files('public/uploads/delivery_documents', 20, 'file', 1), (req, res) => {
  if (req.files && req.files[0]) {
    return res.status(200).json({ status: 'success', url: req.files[0].path });
  }
  return res.status(400).json({ status: 'error', message: 'No file uploaded.' });
});

// Order-level document fetching, upload & Dual Verification (OTP / Manual Photo)
router.get('/recent-orders', check_auth, handler.get_recent_orders);
router.get('/order-docs/:delivery_order_id', check_auth, handler.get_delivery_order_documents);
router.post('/order-docs/:delivery_order_id', check_auth, handler.save_delivery_order_document);
router.post('/verify-delivery', check_auth, handler.verify_delivery);

module.exports = router;
