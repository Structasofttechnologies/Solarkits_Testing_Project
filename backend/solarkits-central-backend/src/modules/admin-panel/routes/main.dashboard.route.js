const express = require('express');
const router = express.Router();
const check_auth = require('../middlewares/check.auth');
const controller = require('../controller/main.dashboard.controller');

// Permissive auth middleware allows dev testing while enforcing auth when token is present
const permissiveAuth = (req, res, next) => {
  if (req.headers.authorization) {
    return check_auth(req, res, next);
  }
  next();
};

// 1. Filter Bootstrap Options (States, Districts, EPC Types, BDEs, Kits, Campaigns)
router.get('/bootstrap', permissiveAuth, controller.get_dashboard_bootstrap);

// 2. Overview 14 KPI Cards (Current vs Previous Period Comparison)
router.get('/overview', permissiveAuth, controller.get_overview_kpis);

// 3. Website Performance
router.get('/website-performance', permissiveAuth, controller.get_website_performance);

// 4. Enquiry Funnel
router.get('/enquiry-funnel', permissiveAuth, controller.get_enquiry_funnel);

// 5. EPC Network
router.get('/epc-network', permissiveAuth, controller.get_epc_network);

// 6. Sales Pipeline
router.get('/sales-pipeline', permissiveAuth, controller.get_sales_pipeline);

// 7. Conversion Analytics
router.get('/conversions', permissiveAuth, controller.get_conversion_analytics);

// 8. Kit Potential & Demand
router.get('/kit-demand', permissiveAuth, controller.get_kit_demand);

// 9. Geography Analytics (India Map & District Data)
router.get('/geography', permissiveAuth, controller.get_geography_analytics);

// 9B. Franchise Cluster Geography Analytics (Cluster-wise Map & Data)
router.get('/cluster-geography', permissiveAuth, controller.get_cluster_geography_analytics);

// 10. Revenue & Margin
router.get('/revenue-margin', permissiveAuth, controller.get_revenue_margin);

// 11. Campaign Performance
router.get('/campaign-performance', permissiveAuth, controller.get_campaign_performance);

// 12. In-Page Drill-Down Detailed Records
router.get('/drill-down', permissiveAuth, controller.get_drill_down_records);

// 13. Insights & Suggestive AI
router.get('/insights-ai', permissiveAuth, controller.get_insights_ai);

module.exports = router;
