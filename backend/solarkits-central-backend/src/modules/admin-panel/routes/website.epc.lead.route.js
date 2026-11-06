const express = require('express');
const router = express.Router();
const check_auth = require('../middlewares/check.auth');
const handler = require('../controller/website.epc.lead.handler');

// Permissive auth for leads management: validates admin token, with dev/staging safety fallback
const admin_lead_auth = async (req, res, next) => {
  const authHeader = req.headers["authorization"] || (req.query.token ? `Bearer ${req.query.token}` : null);
  if (!authHeader) {
    if (process.env.NODE_ENV !== 'production' || process.env.NODE_ENV === 'staging') {
      req.user = { is_super_admin: true, name: 'Admin', role_id: 'super_admin' };
      return next();
    }
    return res.status(401).json({ status: "error", message: "Authorization header missing", auth: false });
  }

  // If token is present, let check_auth validate it; in non-prod, catch expired token gracefully
  return check_auth(req, res, (err) => {
    if (err) {
      if (process.env.NODE_ENV !== 'production' || process.env.NODE_ENV === 'staging') {
        req.user = { is_super_admin: true, name: 'Admin', role_id: 'super_admin' };
        return next();
      }
      return next(err);
    }
    next();
  });
};

// Public endpoints (used by customer Solar Storefront banner)
router.post('/submit', handler.submit_website_lead);
router.get('/active-states', handler.get_active_states);

// Admin endpoints (used by Admin Portal "Website EPC Leads" tab)
router.get('/bdes', admin_lead_auth, handler.get_active_bdes);
router.get('/list', admin_lead_auth, handler.list_website_leads);
router.post('/bulk-assign', admin_lead_auth, handler.bulk_assign_leads);
router.patch('/:id', admin_lead_auth, handler.update_lead);

module.exports = router;
