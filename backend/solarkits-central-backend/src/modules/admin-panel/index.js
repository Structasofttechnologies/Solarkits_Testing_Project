require("dotenv").config();
require('./config/databases'); // open all 6 Mongoose connections on startup
const express = require("express");
const cors = require("cors");
const path = require('path');

const app = express();
const port = process.env.PORT || 3000; 
const ipv4 = process.env.IPV4 || "http://localhost";

app.use(express.json({ limit: "50mb" }));
const FRONTEND_URLS = (process.env.FRONTEND_URLS || "").split(",").map(url => url.trim()).filter(Boolean);
app.use(cors({
  origin: FRONTEND_URLS.length ? FRONTEND_URLS : true,
  credentials: true,
}));

app.use('/', express.static(path.join(__dirname, '../public')));
app.use('/uploads', express.static(path.join(__dirname, '../public/uploads')));

app.use('/',require('./routes/root.route'));
app.use('/customers',require('./routes/customers.route'));
app.use('/panels',require('./routes/panels.route'));
app.use('/departments',require('./routes/departments.route'));
app.use('/geolocation',require('./routes/geolocation.route'));
app.use('/warehouses',require('./routes/warehouses.route'));
app.use('/3pl-vendors', require('./routes/3pl_vendors.route'));
app.use('/roles',require('./routes/roles.route'));
app.use('/modules',require('./routes/modules.route'));
app.use('/tasks',require('./routes/task.route'));
app.use('/cms/users',require('./routes/cms.users.route'));
app.use('/epcs',require('./routes/epcs.route'));
app.use('/project-types',require('./routes/project.types.route'));
app.use('/product-templates',require('./routes/product.templates.route'));
app.use('/units', require('./routes/units.route'));
app.use('/brand-manufacturer',require('./routes/brand.manufacturer.route'));
app.use('/products',require('./routes/products.route'));
app.use('/solar-kits',require('./routes/solar_kits.route'));
app.use('/solarshop',require('./routes/solarshop.route'));
app.use('/saas-products', require('./routes/saas_products.route'));
app.use('/combo-kits', require('./routes/combo_kits.route'));
app.use('/combo-kit-variants', require('./routes/combo_kit_variants.route'));
app.use('/datasheet-settings', require('./routes/datasheet_settings.route'));
app.use('/product-sku-prices', require('./routes/product_sku_prices.route'));
app.use('/price-requests', require('./routes/price_requests.route'));
app.use('/suppliers', require('./routes/suppliers.route'));

// ─── Phase 1 - 7: Reseller Management System ───────────────────────────────────
app.use('/industry-types',             require('./routes/industry.types.route'));
app.use('/reseller-mgmt/types',        require('./routes/reseller.types.route'));
app.use('/reseller-mgmt/territories',  require('./routes/reseller.territory.route'));
app.use('/reseller-mgmt/product-auth', require('./routes/reseller.prodauth.route'));
app.use('/reseller-mgmt/epc-buyers',   require('./routes/reseller.epc.route'));
app.use('/reseller-mgmt/orders',       require('./routes/reseller.orders.route'));
app.use('/reseller-mgmt/wallet',       require('./routes/reseller.wallet.route'));
app.use('/reseller-mgmt',              require('./routes/reseller.admin.route'));
app.use('/resellers/plans',            require('./routes/reseller.plans.route'));

// ─── Store Management Module ──────────────────────────────────────────────────
app.use('/store-management/subtypes',   require('./routes/franchisee.subtypes.route'));
app.use('/reseller-mgmt/subtypes',      require('./routes/franchisee.subtypes.route'));
app.use('/store-management/onboarding', require('./routes/store.management.onboarding.route'));
app.use('/reseller-mgmt/onboarding',    require('./routes/store.management.onboarding.route'));
app.use('/store-management/payments',   require('./routes/store.management.payment.route'));
app.use('/reseller-mgmt/payments',      require('./routes/store.management.payment.route'));
app.use('/store-management/bde',        require('./routes/store.management.bde.route'));
app.use('/reseller-mgmt/bde',           require('./routes/store.management.bde.route'));
app.use('/store-management/warehouses', require('./routes/store.management.warehouse.route'));
app.use('/reseller-mgmt/warehouses',    require('./routes/store.management.warehouse.route'));

// ─── Industry Content Management System ──────────────────────────────────────
app.use('/industry-content',  require('./routes/industry.content.route'));
app.use('/industry-themes',   require('./routes/industry.theme.route'));

// ─── Phase FPO: Franchisee PO Ordering, Commission, Goal & Performance ───────
app.use('/franchisee/po-settings',      require('./routes/franchisee.po.settings.route'));
app.use('/franchisee/commission-rules', require('./routes/franchisee.commission.rules.route'));
app.use('/franchisee/moq-rules',        require('./routes/franchisee.moq.rules.route'));
app.use('/franchisee/kit-targets',      require('./routes/franchisee.kit.targets.route'));
app.use('/franchisee/po',               require('./routes/franchisee.po.route'));
app.use('/franchisee/performance',      require('./routes/franchisee.performance.route'));
app.use('/franchisee/goals',            require('./routes/franchisee.goal.route'));

// ─── Margin & Commission Settings Module ─────────────────────────────────────
app.use('/company/margin-goals',        require('./routes/company_margin_goals.route'));

// ─── Region Payment Configuration & Order Processing ─────────────────────────
app.use('/payment-config',              require('./routes/region.payment.config.route'));
app.use('/payment-milestones',          require('./routes/product.payment.milestones.route'));
app.use('/operations-dashboard',       require('./routes/operations.dashboard.route'));
app.use('/store-dashboard',            require('./routes/store.dashboard.route'));

// Force nodemon reload: variant config subdocument ID preservation
app.listen(port, () =>
  console.log(`Server started on ${ipv4}:${port}`)
);