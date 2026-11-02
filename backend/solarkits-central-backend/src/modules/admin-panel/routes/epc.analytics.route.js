const express = require('express');
const router = express.Router();
const check_auth = require('../middlewares/check.auth');
const controller = require('../controller/epc.analytics.controller');

// Optional auth wrapper: handles auth if headers present or allows internal dev
const permissiveAuth = (req, res, next) => {
  if (req.headers.authorization) {
    return check_auth(req, res, next);
  }
  next();
};

// GET /admin-api/epc-analytics/behavior
router.get('/behavior', permissiveAuth, controller.get_epc_behavior_analytics);
router.get('/analytics', permissiveAuth, controller.get_epc_behavior_analytics);

// GET /admin-api/epc-analytics/epc-profile/:id
router.get('/epc-profile/:id', permissiveAuth, controller.get_epc_profile_detail);

// PUT /admin-api/epc-analytics/epc-profile/:id/behavior
router.put('/epc-profile/:id/behavior', permissiveAuth, controller.update_epc_profile_behavior);

module.exports = router;

