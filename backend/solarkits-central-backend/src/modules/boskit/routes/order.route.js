'use strict';

const express = require('express');
const router = express.Router();

const orderController = require('../controllers/order/order.controller');

// ── Cart Routes ───────────────────────────────────────────────────────────────
router.get('/cart',         orderController.get_cart);
router.post('/cart/add',    orderController.add_to_cart);
router.post('/cart/remove', orderController.remove_from_cart);

// ── Order & Checkout Routes ───────────────────────────────────────────────────
router.post('/create',      orderController.create_order);
router.get('/:id',          orderController.get_order_detail);

module.exports = router;
