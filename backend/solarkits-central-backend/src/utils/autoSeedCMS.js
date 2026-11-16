/**
 * autoSeedCMS.js
 *
 * Automatically seeds/syncs default CMS administrator accounts, panels,
 * modules, and permissions on startup.
 */

const { seedCMS } = require('../modules/admin-panel/config/seeder/cms.seeder');

async function autoSeedCMS() {
  try {
    await seedCMS();
    console.log('✓ [autoSeedCMS] Default CMS admin accounts & modules verified.');
  } catch (err) {
    console.error('⚠️ [autoSeedCMS] Error seeding CMS:', err.message || err);
  }
}

// Run auto-seed asynchronously after DB connection stabilizes
setTimeout(() => {
  autoSeedCMS();
}, 4000);

module.exports = autoSeedCMS;
