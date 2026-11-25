/**
 * autoSeedBusinessProfiles.js
 *
 * Business Profiles are dynamically configured exclusively by the administrator
 * from the Admin Settings panel. No hardcoded or static data is auto-seeded.
 */

async function seedBusinessProfilesIfNeeded() {
  // Purely dynamic - no hardcoded seeding
  return Promise.resolve();
}

module.exports = {
  seedBusinessProfilesIfNeeded,
};
