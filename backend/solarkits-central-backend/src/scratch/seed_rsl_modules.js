/**
 * seed_rsl_modules.js
 * One-off script: seeds missing RSL_* and ADM_INDUSTRY_TYPES modules into
 * cms_modules and creates role-wise permission mappings so they appear in the
 * admin sidebar immediately (without waiting for a full server restart).
 *
 * Usage:
 *   node src/scratch/seed_rsl_modules.js
 */

const dns = require('dns');
dns.setServers(['8.8.8.8', '8.8.4.4', '1.1.1.1']);
require('dotenv').config();
require('../keys/config/databases');

const { CmsModule, CmsPanel, CmsLevel, CmsRole, CmsRoleWiseModule, SaaSProduct } = require('../modules/admin-panel/models/user_db');

const SOLAR_SHOP_SLUG = 'solar-shop';
const ADMIN_PANEL_URL_PREFIX = '/admin-panel';
const GLOBAL_LEVEL_NAME = 'global';

async function seed() {
  try {
    console.log('🔍 Looking up Admin Panel, Global Level, and Solar Shop product...');

    const adminPanel = await CmsPanel.findOne({ url_prefix: ADMIN_PANEL_URL_PREFIX, is_deleted: false }).lean();
    if (!adminPanel) throw new Error('Admin Panel not found in DB!');
    console.log(`  ✓ Admin Panel: ${adminPanel.name} (${adminPanel._id})`);

    const globalLevel = await CmsLevel.findOne({ name: GLOBAL_LEVEL_NAME }).lean();
    if (!globalLevel) throw new Error('Global level not found in DB!');
    console.log(`  ✓ Global Level: ${globalLevel.name} (${globalLevel._id})`);

    const solarShopProduct = await SaaSProduct.findOne({ slug: SOLAR_SHOP_SLUG, is_active: true, is_deleted: false }).lean();
    if (!solarShopProduct) throw new Error('Solar Shop SaaS product not found in DB!');
    console.log(`  ✓ Solar Shop Product: ${solarShopProduct.name} (${solarShopProduct._id})`);

    const modulesToSeed = [
      { name: 'Reseller Management',          unique_code: 'RSL_MGMT' },
      { name: 'Reseller Types',               unique_code: 'RSL_TYPES' },
      { name: 'Reseller Plans',               unique_code: 'RSL_PLAN' },
      { name: 'Reseller Territories',         unique_code: 'RSL_TERRITORY' },
      { name: 'Reseller Product Authorization', unique_code: 'RSL_PROD_AUTH' },
      { name: 'Reseller EPC Buyers',          unique_code: 'RSL_EPC_BUYERS' },
      { name: 'Reseller Wallet & Ledger',     unique_code: 'RSL_WALLET' },
      { name: 'Reseller Settings',            unique_code: 'RSL_SETTINGS' },
      { name: 'Industry Types',               unique_code: 'ADM_INDUSTRY_TYPES' },
    ];

    console.log('\n📦 Upserting RSL modules into cms_modules...');
    const bulkOps = modulesToSeed.map((m) => ({
      updateOne: {
        filter: { unique_code: m.unique_code },
        update: {
          $set: {
            name: m.name,
            panel_id: adminPanel._id,
            level_id: globalLevel._id,
            parent_module_id: null,
            dashboard_context: 'product',
            saas_product_id: solarShopProduct._id,
            is_active: true,
            is_deleted: false,
          },
        },
        upsert: true,
      },
    }));

    const result = await CmsModule.bulkWrite(bulkOps, { ordered: false });
    console.log(`  ✓ Inserted: ${result.upsertedCount}  |  Updated: ${result.modifiedCount}`);

    // Now sync role-wise module permissions for newly seeded modules
    console.log('\n🔑 Syncing role-wise module permissions...');
    const allModules = await CmsModule.find({ unique_code: { $in: modulesToSeed.map(m => m.unique_code) } }).lean();
    const allRoles = await CmsRole.find({}).lean();

    let createdCount = 0;
    for (const mod of allModules) {
      const permOps = allRoles.map((role) => ({
        updateOne: {
          filter: { role_id: role._id, module_id: mod._id, deleted_at: null },
          update: {
            $setOnInsert: {
              role_id: role._id,
              module_id: mod._id,
              can_view: true,
              can_add: true,
              can_edit: true,
              can_delete: true,
              created_at: new Date(),
            },
          },
          upsert: true,
        },
      }));

      const permResult = await CmsRoleWiseModule.bulkWrite(permOps, { ordered: false });
      createdCount += permResult.upsertedCount || 0;
    }

    if (createdCount > 0) {
      console.log(`  ✓ Created ${createdCount} new role-wise module permission mappings.`);
    } else {
      console.log('  ✓ All role-wise module mappings already up to date.');
    }

    console.log('\n✅ Done! RSL modules and ADM_INDUSTRY_TYPES are now seeded.');
    console.log('   → RSL_SETTINGS will now appear in the sidebar.');
    console.log('   → Reload the admin panel (hard refresh) to see changes.');
    process.exit(0);
  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
}

seed();
