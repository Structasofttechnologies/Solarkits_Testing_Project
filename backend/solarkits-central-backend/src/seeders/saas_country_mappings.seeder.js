/**
 * ============================================================
 *  SAAS PRODUCTS COUNTRY MAPPING SEEDER
 * ============================================================
 *  Maps all SaaS Products to India (and all active countries)
 *  in country_saas_products collection so that Solar Shop India
 *  and other SaaS portals are active and accessible.
 * ============================================================
 *  Run command: node src/seeders/saas_country_mappings.seeder.js
 * ============================================================
 */

const dns = require('dns');
dns.setServers(['8.8.8.8', '8.8.4.4', '1.1.1.1']);

require('dotenv').config();
const mongoose = require('mongoose');

// Connect database
require('../keys/config/databases');
const { SaaSProduct, CountrySaaSProduct } = require('../modules/admin-panel/models/user_db');
const { GeoLevel0 } = require('../modules/admin-panel/models/geolocation_db');

async function seedSaaSCountryMappings() {
  try {
    console.log("🚀 Starting SaaS Products Country Mapping Seeder...");

    const saasProducts = await SaaSProduct.find({ is_deleted: false }).lean();
    console.log(`✅ Found ${saasProducts.length} SaaS Products.`);

    const countries = await GeoLevel0.find({
      is_active: true,
      $or: [{ deleted_at: null }, { deleted_at: { $exists: false } }]
    }).lean();

    console.log(`✅ Found ${countries.length} active countries in DB.`);

    if (countries.length === 0) {
      console.error("❌ No active countries found in GeoLevel0.");
      process.exit(1);
    }

    for (const prod of saasProducts) {
      console.log(`\n📌 Mapping SaaS Product: "${prod.name}" (${prod.slug})...`);

      for (const country of countries) {
        let mapping = await CountrySaaSProduct.findOne({
          country_id: country._id,
          saas_product_id: prod._id
        });

        if (!mapping) {
          mapping = await CountrySaaSProduct.create({
            country_id: country._id,
            saas_product_id: prod._id,
            is_active: true,
            layout_config: {}
          });
          console.log(`  ➕ Activated "${prod.name}" in "${country.name}" (${country._id})`);
        } else if (!mapping.is_active) {
          mapping.is_active = true;
          await mapping.save();
          console.log(`  ✔ Enabled active status for "${prod.name}" in "${country.name}"`);
        } else {
          console.log(`  ✔ Already active in "${country.name}"`);
        }
      }
    }

    console.log("\n🎉 SaaS Products Country Mapping Completed Successfully!");
    process.exit(0);
  } catch (error) {
    console.error("\n❌ Seeding failed with error:", error);
    process.exit(1);
  }
}

seedSaaSCountryMappings();
