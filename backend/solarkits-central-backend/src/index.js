require('dotenv').config();
require('./keys/config/databases'); // Initialize database connections
// Register SolarKits Service Tickets model
require('./modules/solarshop-india/models/india_solarshop_db/solarkits_service_tickets.schema');

const express = require('express');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const path = require('path');

const app = express();
app.set('trust proxy', 1);
const port = process.env.PORT || 5000;
const ipv4 = process.env.IPV4 || 'http://localhost';

// CORS Configuration
const rawOrigins = `${process.env.FRONTEND_URLS || ''},${process.env.CORS_ORIGIN || ''}`;
const FRONTEND_URLS = rawOrigins
  .split(',')
  .map(url => url.trim().replace(/\/+$/, ''))
  .filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, curl, server-to-server)
    if (!origin) return callback(null, true);

    const cleanOrigin = origin.replace(/\/+$/, '');

    // Check exact whitelist or pattern matches
    const isWhitelisted =
      FRONTEND_URLS.includes(cleanOrigin) ||
      cleanOrigin.includes('localhost') ||
      cleanOrigin.includes('127.0.0.1') ||
      cleanOrigin.includes('192.168.') ||
      cleanOrigin.endsWith('.onrender.com') ||
      cleanOrigin.includes('.onrender.com') ||
      cleanOrigin.includes('onrender.com') ||
      cleanOrigin.includes('solar-store') ||
      cleanOrigin.includes('solarkits') ||
      cleanOrigin.includes('bde');

    if (isWhitelisted) {
      return callback(null, true);
    }

    return callback(null, true);
  },
  credentials: true,
}));

// Global Middlewares
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Phase R1: NoSQL injection guard — strips keys containing '$' or '.' from
// req.body, req.params and req.query before reaching any controller.
app.use(require('./modules/admin-panel/middlewares/mongo.sanitize'));

// Static uploads folder
app.use('/uploads', express.static(path.join(__dirname, '../public/uploads')));
app.use('/public/uploads', express.static(path.join(__dirname, '../public/uploads')));

// 1. CMS Auth routes
app.use('/auth-api', require('./modules/cms-auth/routes/auth.route'));

// 2. Admin Panel routes
const adminRouter = express.Router();
adminRouter.use('/', require('./modules/admin-panel/routes/root.route'));
adminRouter.use('/customers', require('./modules/admin-panel/routes/customers.route'));
adminRouter.use('/panels', require('./modules/admin-panel/routes/panels.route'));
adminRouter.use('/departments', require('./modules/admin-panel/routes/departments.route'));
adminRouter.use('/geolocation', require('./modules/admin-panel/routes/geolocation.route'));
adminRouter.use('/warehouses', require('./modules/admin-panel/routes/warehouses.route'));
adminRouter.use('/roles', require('./modules/admin-panel/routes/roles.route'));
adminRouter.use('/modules', require('./modules/admin-panel/routes/modules.route'));
adminRouter.use('/tasks', require('./modules/admin-panel/routes/task.route'));
adminRouter.use('/cms/users', require('./modules/admin-panel/routes/cms.users.route'));
adminRouter.use('/epcs', require('./modules/admin-panel/routes/epcs.route'));
adminRouter.use('/project-types', require('./modules/admin-panel/routes/project.types.route'));
adminRouter.use('/product-templates', require('./modules/admin-panel/routes/product.templates.route'));
adminRouter.use('/units', require('./modules/admin-panel/routes/units.route'));
adminRouter.use('/brand-manufacturer', require('./modules/admin-panel/routes/brand.manufacturer.route'));
adminRouter.use('/products', require('./modules/admin-panel/routes/products.route'));
adminRouter.use('/solar-kits', require('./modules/admin-panel/routes/solar_kits.route'));
adminRouter.use('/solarshop', require('./modules/admin-panel/routes/solarshop.route'));
adminRouter.use('/saas-products', require('./modules/admin-panel/routes/saas_products.route'));
adminRouter.use('/combo-kits', require('./modules/admin-panel/routes/combo_kits.route'));
adminRouter.use('/combo-kit-variants', require('./modules/admin-panel/routes/combo_kit_variants.route'));
adminRouter.use('/datasheet-settings', require('./modules/admin-panel/routes/datasheet_settings.route'));
adminRouter.use('/pincode-delivery-costs', require('./modules/admin-panel/routes/pincode_delivery_costs.route'));
adminRouter.use('/best-seller-configs', require('./modules/admin-panel/routes/best_seller_kits.route'));
adminRouter.use('/product-sku-prices', require('./modules/admin-panel/routes/product_sku_prices.route'));
adminRouter.use('/price-requests', require('./modules/admin-panel/routes/price_requests.route'));
adminRouter.use('/industry-types', require('./modules/admin-panel/routes/industry.types.route'));
adminRouter.use('/reseller-mgmt/types', require('./modules/admin-panel/routes/reseller.types.route'));
adminRouter.use('/reseller-mgmt/territories', require('./modules/admin-panel/routes/reseller.territory.route'));
adminRouter.use('/reseller-mgmt/product-auth', require('./modules/admin-panel/routes/reseller.prodauth.route'));
adminRouter.use('/reseller-mgmt/epc-buyers', require('./modules/admin-panel/routes/reseller.epc.route'));
adminRouter.use('/reseller-mgmt/orders', require('./modules/admin-panel/routes/reseller.orders.route'));
adminRouter.use('/reseller-mgmt/wallet', require('./modules/admin-panel/routes/reseller.wallet.route'));
adminRouter.use('/reseller-mgmt/plans', require('./modules/admin-panel/routes/reseller.plans.route'));
adminRouter.use('/resellers/plans', require('./modules/admin-panel/routes/reseller.plans.route'));

// ─── Store Management Module ──────────────────────────────────────────────────
adminRouter.use('/store-management/subtypes', require('./modules/admin-panel/routes/franchisee.subtypes.route'));
adminRouter.use('/reseller-mgmt/subtypes', require('./modules/admin-panel/routes/franchisee.subtypes.route'));
adminRouter.use('/store-management/onboarding', require('./modules/admin-panel/routes/store.management.onboarding.route'));
adminRouter.use('/reseller-mgmt/onboarding', require('./modules/admin-panel/routes/store.management.onboarding.route'));
adminRouter.use('/store-management/payments', require('./modules/admin-panel/routes/store.management.payment.route'));
adminRouter.use('/reseller-mgmt/payments', require('./modules/admin-panel/routes/store.management.payment.route'));
adminRouter.use('/store-management/bde', require('./modules/admin-panel/routes/store.management.bde.route'));
adminRouter.use('/reseller-mgmt/bde', require('./modules/admin-panel/routes/store.management.bde.route'));
adminRouter.use('/store-management/warehouses', require('./modules/admin-panel/routes/store.management.warehouse.route'));
adminRouter.use('/reseller-mgmt/warehouses', require('./modules/admin-panel/routes/store.management.warehouse.route'));
adminRouter.use('/reseller-mgmt/leads', require('./modules/admin-panel/routes/reseller.leads.route'));
adminRouter.use('/resellers/leads', require('./modules/admin-panel/routes/reseller.leads.route'));
adminRouter.use('/reseller-mgmt', require('./modules/admin-panel/routes/reseller.admin.route'));
adminRouter.use('/resellers', require('./modules/admin-panel/routes/reseller.admin.route'));
adminRouter.use('/reseller-mgmt/procurement', require('./modules/admin-panel/routes/reseller.procurement.route'));
adminRouter.use('/reseller-mgmt/pricing-rules', require('./modules/admin-panel/routes/reseller.pricing.route'));
adminRouter.use('/reseller-mgmt/analytics', require('./modules/admin-panel/routes/reseller.analytics.route'));
// Phase R1: Platform-wide settings (exclusivity policy, settlement config, activation requirements)
adminRouter.use('/reseller-mgmt/settings', require('./modules/admin-panel/routes/reseller.settings.route'));
// Industry Content Management System
adminRouter.use('/industry-content', require('./modules/admin-panel/routes/industry.content.route'));
adminRouter.use('/industry-themes', require('./modules/admin-panel/routes/industry.theme.route'));
// Website Landing Pages Content Management System
adminRouter.use('/website-content', require('./modules/admin-panel/routes/website.content.route'));
adminRouter.use('/website-configurations', require('./modules/admin-panel/routes/website.content.route'));

// ─── Phase FPO: Franchisee PO Ordering, Commission, Goal & Performance ───────
adminRouter.use('/franchisee/po-settings', require('./modules/admin-panel/routes/franchisee.po.settings.route'));
adminRouter.use('/franchisee/commission-rules', require('./modules/admin-panel/routes/franchisee.commission.rules.route'));
adminRouter.use('/franchisee/moq-rules', require('./modules/admin-panel/routes/franchisee.moq.rules.route'));
adminRouter.use('/franchisee/kit-targets', require('./modules/admin-panel/routes/franchisee.kit.targets.route'));
adminRouter.use('/franchisee/po', require('./modules/admin-panel/routes/franchisee.po.route'));
adminRouter.use('/franchisee/performance', require('./modules/admin-panel/routes/franchisee.performance.route'));
adminRouter.use('/franchisee/goals', require('./modules/admin-panel/routes/franchisee.goal.route'));

// ─── Phase BDE: SolarKits BDE Management System ──────────────────────────────
adminRouter.use('/bde-mgmt', require('./modules/admin-panel/routes/bde.admin.route'));
adminRouter.use('/bde', require('./modules/admin-panel/routes/bde.admin.route'));

// ─── Step 3: Franchisee Store Setup & Operations ─────────────────────────────
adminRouter.use('/store-setup', require('./modules/admin-panel/routes/store.setup.admin.route'));

// ─── Margin & Commission Settings Module ─────────────────────────────────────
adminRouter.use('/company/margin-goals', require('./modules/admin-panel/routes/company_margin_goals.route'));

// ─── Service Ticket / Kit Item Replacement Module ─────────────────────────────
adminRouter.use('/service-tickets', require('./modules/admin-panel/routes/service_ticket.admin.route'));

// ─── EPC Quotation Management Settings ─────────────────────────────────────
adminRouter.use('/quote-settings', require('./modules/admin-panel/routes/admin.quote.settings.route'));

// ─── Know My Margin (KMM) Estimator & BOM Settings ───────────────────────────
adminRouter.use('/estimator', require('./modules/admin-panel/routes/estimator.admin.route'));
adminRouter.use('/project-boms', require('./modules/admin-panel/routes/estimator.admin.route'));

// ─── Delivery Management & Route Consolidation System ─────────────────────────
adminRouter.use('/delivery-management', require('./modules/admin-panel/routes/delivery.management.route'));

// ─── Warehouse Panel routes accessible via Admin API ─────────────────────────
adminRouter.use('/warehouse', require('./modules/warehouse-panel/routes/warehouse.route'));

// ─── Admin Notification System & Real-Time Stream ────────────────────────────
adminRouter.use('/notifications', require('./modules/admin-panel/routes/admin.notifications.route'));

// ─── Region-wise Payment Gateway Configuration & Order Processing ─────────
adminRouter.use('/payment-config', require('./modules/admin-panel/routes/region.payment.config.route'));

// ─── Product-Wise Payment Milestone Configuration & Checkout Resolution ───
adminRouter.use('/payment-milestones', require('./modules/admin-panel/routes/product.payment.milestones.route'));

// ─── Centralized Order & Stage Approval Workflow Engine ───────────────────────
adminRouter.use('/order-approvals', require('./modules/admin-panel/routes/order.approval.route'));
adminRouter.use('/epc-types', require('./modules/admin-panel/routes/epc.types.route'));
adminRouter.use('/operations-dashboard', require('./modules/admin-panel/routes/operations.dashboard.route'));
adminRouter.use('/store-dashboard', require('./modules/admin-panel/routes/store.dashboard.route'));
adminRouter.use('/epc-analytics', require('./modules/admin-panel/routes/epc.analytics.route'));

app.use('/admin-api', adminRouter);
app.use('/api', adminRouter);
app.use('/api/admin-api', adminRouter);

// 3. Developer Panel routes
const developerRouter = express.Router();
developerRouter.use('/', require('./modules/developer-panel/routes/root.route'));
developerRouter.use('/panels', require('./modules/developer-panel/routes/user_panels.route'));
developerRouter.use('/dashboard', require('./modules/developer-panel/routes/dashboard.route'));
developerRouter.use('/modules', require('./modules/developer-panel/routes/modules.route'));
app.use('/developer-api', developerRouter);

// 4. Operation Management Panel routes
const opRouter = express.Router();
opRouter.use('/', require('./modules/operation-management/routes/root.route'));
app.use('/operation-management-api', opRouter);

// 5. Warehouse Panel routes
const warehouseRouter = express.Router();
warehouseRouter.use('/', require('./modules/warehouse-panel/routes/root.route'));
warehouseRouter.use('/auth', require('./modules/warehouse-panel/routes/auth.route'));
warehouseRouter.use('/warehouse', require('./modules/warehouse-panel/routes/warehouse.route'));
warehouseRouter.use('/', require('./modules/warehouse-panel/routes/warehouse.route'));
app.use('/warehouse-api', warehouseRouter);

// 6. Account Panel routes
const accountRouter = express.Router();
accountRouter.use('/', require('./modules/account-panel/routes/root.route'));
app.use('/account-api', accountRouter);

// 7. Solarshop India routes
app.use('/api/india/v1', require('./modules/solarshop-india/routes/v1.routes'));
app.use('/api/v1', require('./modules/solarshop-india/routes/v1.routes'));

// 7.1 BDE Self-Service Portal routes
app.use('/api/bde/v1', require('./modules/solarshop-india/routes/v1.routes/bde.portal.route'));
app.use('/api/bde', require('./modules/solarshop-india/routes/v1.routes/bde.portal.route'));

// 10. BOSKIT Platform routes (Phase 2+)
// All BOSKIT collections are registered when this module is required.
// Accessible from both public (/api/boskit/v1) and admin portal (/admin-api/boskit/v1)
const boskitModule = require('./modules/boskit/index');
app.use('/api/boskit/v1', boskitModule);
app.use('/admin-api/boskit/v1', boskitModule);

// 8. Supplier Panel routes
const supplierRouter = express.Router();
supplierRouter.use('/auth', require('./modules/supplier-panel/routes/auth.route'));
supplierRouter.use('/supplier', require('./modules/supplier-panel/routes/supplier.route'));
supplierRouter.use('/plans', require('./modules/supplier-panel/routes/plans.route'));
supplierRouter.use('/admin', require('./modules/supplier-panel/routes/admin.route'));
app.use('/supplier-api', supplierRouter);


// 11. ICICI Bank E-Collection Webhooks & Real-Time Stream
const iciciEcollectionRouter = require('./modules/icici-ecollection/routes/iciciEcollection.route');
app.use('/api/v1/payments/icici', iciciEcollectionRouter);
app.use('/api/icici/payment', iciciEcollectionRouter);
app.use('/admin-api/payments/icici', iciciEcollectionRouter);
app.use('/account-api/payments/icici', iciciEcollectionRouter);
app.use('/admin-api/api/v1/payments/icici', iciciEcollectionRouter);
app.use('/account-api/api/v1/payments/icici', iciciEcollectionRouter);

// Initialize Schedulers / Cron routines & Auto-seed demo accounts
require('./modules/solarshop-india/utils/scheduler');
require('./modules/warehouse-panel/utils/scheduler');
require('./utils/autoSeedAccounts');
require('./utils/autoSeedEpcTypes');

// Global Error Handler (catches JSON parse errors, CORS, and unhandled exceptions)
app.use((err, req, res, next) => {
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    return res.status(400).json({ success: false, message: 'Invalid JSON payload' });
  }
  console.error('❌ Server error:', err.message || err);
  return res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal Server Error'
  });
});

// Process-level safety guards
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception thrown:', err);
});

// Start Express unified server
const server = app.listen(port, '0.0.0.0', () => {
  console.log(`🚀 Centralized backend server running on ${ipv4}:${port}`);
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`❌ Port ${port} is already in use by another running process.`);
    console.error(`💡 Tip: Check task manager or kill previous node instance occupying port ${port}.`);
    process.exit(1);
  } else {
    console.error(`❌ Server error:`, err);
  }
});

