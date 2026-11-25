'use strict';
/**
 * BOSKIT Admin Seed Script
 *
 * Seeds the following records into the shared admin system:
 *   1. BOSKIT CMS Panels (admin sections visible in unified admin portal)
 *   2. BOSKIT CMS Modules (feature-level permission entries)
 *   3. BoskitSettings singleton (platform config)
 *
 * Usage:
 *   node src/modules/boskit/scripts/seed-boskit-admin.js
 *
 * SAFE to run multiple times — uses upsert operations.
 * Does NOT delete or overwrite existing SOLARKITS data.
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../../../../.env') });
require('../../../keys/config/databases');
require('../models/index'); // Register all BOSKIT models

const mongoose = require('mongoose');

// Shared models (existing)
const CmsPanel    = mongoose.model('cms_panels');
const CmsModule   = mongoose.model('cms_modules');
const BoskitSettings = mongoose.model('boskit_settings');

const BOSKIT_PANELS = [
  { code: 'boskit_dashboard',               name: 'BOSKIT Dashboard',               platform: 'boskit', sort_order: 100, is_active: true },
  { code: 'boskit_distributor_applications',name: 'Distributor Applications',       platform: 'boskit', sort_order: 101, is_active: true },
  { code: 'boskit_distributors',            name: 'Distributors',                   platform: 'boskit', sort_order: 102, is_active: true },
  { code: 'boskit_distributor_plans',       name: 'Distributor Plans',              platform: 'boskit', sort_order: 103, is_active: true },
  { code: 'boskit_dealer_applications',     name: 'Dealer Applications',            platform: 'boskit', sort_order: 104, is_active: true },
  { code: 'boskit_dealers',                 name: 'Dealers',                        platform: 'boskit', sort_order: 105, is_active: true },
  { code: 'boskit_pricing_rules',           name: 'Pricing Rules',                  platform: 'boskit', sort_order: 106, is_active: true },
  { code: 'boskit_channel_settings',        name: 'Channel Settings',               platform: 'boskit', sort_order: 107, is_active: true },
  { code: 'boskit_orders',                  name: 'BOSKIT Orders',                  platform: 'boskit', sort_order: 108, is_active: true },
  { code: 'boskit_payments',                name: 'BOSKIT Payments',                platform: 'boskit', sort_order: 109, is_active: true },
  { code: 'boskit_content',                 name: 'BOSKIT Content / Banners',       platform: 'boskit', sort_order: 110, is_active: true },
  { code: 'boskit_reports',                 name: 'BOSKIT Reports',                 platform: 'boskit', sort_order: 111, is_active: true },
  { code: 'boskit_moq_settings',            name: 'MOQ Settings',                   platform: 'boskit', sort_order: 112, is_active: true },
  { code: 'boskit_gst_settings',            name: 'GST Settings',                   platform: 'boskit', sort_order: 113, is_active: true },
];

const BOSKIT_MODULES = [
  // Distributor Applications
  { code: 'boskit.dist_apps.view',   name: 'View Distributor Applications',   panel_code: 'boskit_distributor_applications', sort_order: 1 },
  { code: 'boskit.dist_apps.review', name: 'Review Distributor Applications', panel_code: 'boskit_distributor_applications', sort_order: 2 },
  { code: 'boskit.dist_apps.approve',name: 'Approve/Reject Applications',     panel_code: 'boskit_distributor_applications', sort_order: 3 },
  { code: 'boskit.dist_apps.activate',name: 'Activate/Deactivate Distributors', panel_code: 'boskit_distributor_applications', sort_order: 4 },
  // Distributors
  { code: 'boskit.distributors.view',   name: 'View Distributors',            panel_code: 'boskit_distributors', sort_order: 1 },
  { code: 'boskit.distributors.edit',   name: 'Edit Distributors',            panel_code: 'boskit_distributors', sort_order: 2 },
  { code: 'boskit.distributors.assign_plan', name: 'Assign Plans',            panel_code: 'boskit_distributors', sort_order: 3 },
  { code: 'boskit.distributors.assign_territory', name: 'Assign Territory',   panel_code: 'boskit_distributors', sort_order: 4 },
  // Plans
  { code: 'boskit.plans.view',   name: 'View Distributor Plans', panel_code: 'boskit_distributor_plans', sort_order: 1 },
  { code: 'boskit.plans.create', name: 'Create Plans',           panel_code: 'boskit_distributor_plans', sort_order: 2 },
  { code: 'boskit.plans.edit',   name: 'Edit Plans',             panel_code: 'boskit_distributor_plans', sort_order: 3 },
  // Dealer Applications
  { code: 'boskit.dealer_apps.view',    name: 'View Dealer Applications',     panel_code: 'boskit_dealer_applications', sort_order: 1 },
  { code: 'boskit.dealer_apps.approve', name: 'Approve Dealer Applications',  panel_code: 'boskit_dealer_applications', sort_order: 2 },
  // Dealers
  { code: 'boskit.dealers.view',    name: 'View Dealers',   panel_code: 'boskit_dealers', sort_order: 1 },
  { code: 'boskit.dealers.edit',    name: 'Edit Dealers',   panel_code: 'boskit_dealers', sort_order: 2 },
  { code: 'boskit.dealers.activate',name: 'Activate Dealers', panel_code: 'boskit_dealers', sort_order: 3 },
  // Pricing
  { code: 'boskit.pricing.view',   name: 'View Pricing Rules',   panel_code: 'boskit_pricing_rules', sort_order: 1 },
  { code: 'boskit.pricing.create', name: 'Create Pricing Rules', panel_code: 'boskit_pricing_rules', sort_order: 2 },
  { code: 'boskit.pricing.edit',   name: 'Edit Pricing Rules',   panel_code: 'boskit_pricing_rules', sort_order: 3 },
  // Channel Settings
  { code: 'boskit.channel.view',   name: 'View Channel Settings',   panel_code: 'boskit_channel_settings', sort_order: 1 },
  { code: 'boskit.channel.create', name: 'Create Channel Settings', panel_code: 'boskit_channel_settings', sort_order: 2 },
  { code: 'boskit.channel.edit',   name: 'Edit Channel Settings',   panel_code: 'boskit_channel_settings', sort_order: 3 },
  // Orders
  { code: 'boskit.orders.view',   name: 'View Orders',    panel_code: 'boskit_orders', sort_order: 1 },
  { code: 'boskit.orders.update', name: 'Update Orders',  panel_code: 'boskit_orders', sort_order: 2 },
  { code: 'boskit.orders.cancel', name: 'Cancel Orders',  panel_code: 'boskit_orders', sort_order: 3 },
  // Payments
  { code: 'boskit.payments.view',   name: 'View Payments',    panel_code: 'boskit_payments', sort_order: 1 },
  { code: 'boskit.payments.refund', name: 'Initiate Refunds', panel_code: 'boskit_payments', sort_order: 2 },
  // Reports
  { code: 'boskit.reports.view',   name: 'View Reports',   panel_code: 'boskit_reports', sort_order: 1 },
  { code: 'boskit.reports.export', name: 'Export Reports', panel_code: 'boskit_reports', sort_order: 2 },
];

async function seedBoskitAdmin() {
  console.log('⏳ Waiting for MongoDB connection...');
  await new Promise(resolve => setTimeout(resolve, 2000));

  console.log('\n📋 Seeding BOSKIT CMS Panels...');
  for (const panel of BOSKIT_PANELS) {
    await CmsPanel.findOneAndUpdate(
      { code: panel.code },
      { $setOnInsert: panel },
      { upsert: true, new: true }
    ).catch(() => {
      // If cms_panels doesn't have 'code' field, use 'name' as key
      return CmsPanel.findOneAndUpdate(
        { name: panel.name },
        { $setOnInsert: { name: panel.name, is_active: panel.is_active } },
        { upsert: true, new: true }
      );
    });
    console.log(`  ✅ Panel: ${panel.name}`);
  }

  console.log('\n📋 Seeding BOSKIT CMS Modules...');
  for (const mod of BOSKIT_MODULES) {
    await CmsModule.findOneAndUpdate(
      { code: mod.code },
      { $setOnInsert: { name: mod.name, code: mod.code, sort_order: mod.sort_order } },
      { upsert: true, new: true }
    ).catch(err => {
      console.warn(`  ⚠️  Module ${mod.code}: ${err.message}`);
    });
    console.log(`  ✅ Module: ${mod.code}`);
  }

  console.log('\n⚙️  Seeding BoskitSettings singleton...');
  const existing = await BoskitSettings.findOne();
  if (!existing) {
    await BoskitSettings.create({
      last_order_sequence: 0,
      last_invoice_sequence: 0,
      order_prefix: 'BK',
      invoice_prefix: 'BKI',
      default_gst_rate_pct: 18,
      dealer_direct_activation_default: false,
      activation_require_gst_verified: true,
      activation_require_kyc_approved: true,
      activation_require_active_plan: false,
      activation_require_territory_assigned: true,
    });
    console.log('  ✅ BoskitSettings created');
  } else {
    console.log('  ℹ️  BoskitSettings already exists — skipped');
  }

  console.log('\n✅ BOSKIT admin seed completed successfully.\n');
  process.exit(0);
}

seedBoskitAdmin().catch(err => {
  console.error('❌ Seed failed:', err);
  process.exit(1);
});
