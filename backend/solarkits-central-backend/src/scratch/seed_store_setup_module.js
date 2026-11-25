/**
 * seed_store_setup_module.js
 * Seeds ADM_STORE_SETUP modules into cms_modules and initializes default Store Setup Settings.
 */

const dns = require('dns');
dns.setServers(['8.8.8.8', '8.8.4.4', '1.1.1.1']);
require('dotenv').config();
require('../keys/config/databases');

const { CmsModule, CmsPanel, CmsLevel, CmsRole, CmsRoleWiseModule } = require('../modules/admin-panel/models/user_db');
const { getOrCreateSettings } = require('../modules/admin-panel/services/store.setup.service');

const ADMIN_PANEL_URL_PREFIX = '/admin-panel';
const GLOBAL_LEVEL_NAME = 'global';

async function seed() {
  try {
    console.log('🔍 Looking up Admin Panel and Global Level...');

    const adminPanel = await CmsPanel.findOne({ url_prefix: ADMIN_PANEL_URL_PREFIX, is_deleted: false }).lean();
    if (!adminPanel) throw new Error('Admin Panel not found in DB!');

    const globalLevel = await CmsLevel.findOne({ name: GLOBAL_LEVEL_NAME }).lean();
    if (!globalLevel) throw new Error('Global level not found in DB!');

    const modulesToSeed = [
      { name: 'Store Setup & Operations', unique_code: 'ADM_STORE_SETUP' },
      { name: 'Expansion Plans', unique_code: 'ADM_EXPANSION_PLANS' },
      { name: 'Store Setup Settings', unique_code: 'ADM_STORE_SETTINGS' },
      { name: 'Franchisee Performance Ranking', unique_code: 'ADM_FRANCHISEE_RANKING' },
    ];

    console.log('\n📦 Upserting Store Setup modules into cms_modules...');
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

    console.log('⚙️ Initializing global store setup settings and default checklist template...');
    const settings = await getOrCreateSettings();
    console.log(`✅ Store setup settings initialized: ${settings.master_checklist_activities.length} default checklist items.`);

    console.log('✅ Done! Store Setup modules and permissions successfully seeded.');
    process.exit(0);
  } catch (err) {
    console.error('❌ Error seeding Store Setup modules:', err.message);
    process.exit(1);
  }
}

seed();
