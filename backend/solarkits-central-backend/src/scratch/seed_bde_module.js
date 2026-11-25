/**
 * seed_bde_module.js
 * Seeds ADM_BDE_MGMT module into cms_modules and creates role-wise permission mappings.
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

    const globalLevel = await CmsLevel.findOne({ name: GLOBAL_LEVEL_NAME }).lean();
    if (!globalLevel) throw new Error('Global level not found in DB!');

    const solarShopProduct = await SaaSProduct.findOne({ slug: SOLAR_SHOP_SLUG, is_active: true, is_deleted: false }).lean();

    const modulesToSeed = [
      { name: 'BDE Management', unique_code: 'ADM_BDE_MGMT' },
      { name: 'BDE Dashboard', unique_code: 'ADM_BDE_DASHBOARD' },
      { name: 'BDE Territory Assignment', unique_code: 'ADM_BDE_TERRITORY' },
      { name: 'BDE Goal Assignment', unique_code: 'ADM_BDE_GOALS' },
      { name: 'BDE Activity History', unique_code: 'ADM_BDE_ACTIVITY' },
    ];

    console.log('\n📦 Upserting BDE modules into cms_modules...');
    for (const m of modulesToSeed) {
      await CmsModule.updateOne(
        { unique_code: m.unique_code },
        {
          $set: {
            name: m.name,
            panel_id: adminPanel._id,
            level_id: globalLevel._id,
            parent_module_id: null,
            dashboard_context: 'default',
            is_active: true,
            is_deleted: false,
          },
        },
        { upsert: true }
      );
    }

    console.log('🔑 Syncing role-wise module permissions...');
    const allModules = await CmsModule.find({ unique_code: { $in: modulesToSeed.map(m => m.unique_code) } }).lean();
    const allRoles = await CmsRole.find({}).lean();

    for (const mod of allModules) {
      for (const role of allRoles) {
        await CmsRoleWiseModule.updateOne(
          { role_id: role._id, module_id: mod._id, deleted_at: null },
          {
            $set: {
              role_id: role._id,
              module_id: mod._id,
              can_view: true,
              can_add: true,
              can_edit: true,
              can_delete: true,
            },
          },
          { upsert: true }
        );
      }
    }

    console.log('✅ Done! BDE modules are seeded and permissions granted to all roles.');
    process.exit(0);
  } catch (err) {
    console.error('❌ Error seeding BDE modules:', err.message);
    process.exit(1);
  }
}

seed();
