/**
 * ============================================================
 *  SEEDER FOR SOLAR SHOP - SOLARKITS & SOLAR SHOP - BOS KITS
 * ============================================================
 */

const dns = require('dns');
dns.setServers(['8.8.8.8', '8.8.4.4', '1.1.1.1']);

require('dotenv').config();
const mongoose = require('mongoose');

require('../keys/config/databases');
const { SaaSProduct, CountrySaaSProduct, CmsPanel, PanelSaaSProduct } = require('../modules/admin-panel/models/user_db');
const { GeoLevel0 } = require('../modules/admin-panel/models/geolocation_db');

async function run() {
  try {
    console.log("🚀 Starting Solar Shop & BOS Kits SaaS Products Seeder...");

    // 1. Update or create Solar Shop - SolarKits
    let solarKitsProd = await SaaSProduct.findOne({ slug: 'solar-shop' });
    if (solarKitsProd) {
      solarKitsProd.name = 'Solar Shop - SolarKits';
      solarKitsProd.description = 'Solar Shop - SolarKits SaaS Product';
      solarKitsProd.is_active = true;
      solarKitsProd.is_deleted = false;
      await solarKitsProd.save();
      console.log("  ✓ Updated 'Solar Shop - SolarKits'");
    } else {
      solarKitsProd = await SaaSProduct.create({
        _id: new mongoose.Types.ObjectId('6a0c02e8623d0970cd491f72'),
        name: 'Solar Shop - SolarKits',
        slug: 'solar-shop',
        description: 'Solar Shop - SolarKits SaaS Product',
        is_active: true,
        is_system: false,
        is_protected: false,
        is_deleted: false
      });
      console.log("  ✓ Created 'Solar Shop - SolarKits'");
    }

    // 2. Update or create Solar Shop - BOS Kits
    let bosKitsProd = await SaaSProduct.findOne({ slug: 'solar-shop-bos-kits' });
    if (bosKitsProd) {
      bosKitsProd.name = 'Solar Shop - BOS Kits';
      bosKitsProd.description = 'Solar Shop - BOS Kits SaaS Product';
      bosKitsProd.is_active = true;
      bosKitsProd.is_deleted = false;
      await bosKitsProd.save();
      console.log("  ✓ Updated 'Solar Shop - BOS Kits'");
    } else {
      bosKitsProd = await SaaSProduct.create({
        _id: new mongoose.Types.ObjectId('6a0c02e8623d0970cd491f73'),
        name: 'Solar Shop - BOS Kits',
        slug: 'solar-shop-bos-kits',
        description: 'Solar Shop - BOS Kits SaaS Product',
        is_active: true,
        is_system: false,
        is_protected: false,
        is_deleted: false
      });
      console.log("  ✓ Created 'Solar Shop - BOS Kits'");
    }

    // 3. Map to panels
    const panels = await CmsPanel.find({ is_active: true, is_deleted: false });
    const targetProducts = [solarKitsProd, bosKitsProd];

    for (const p of panels) {
      for (const prod of targetProducts) {
        const exists = await PanelSaaSProduct.findOne({ panel_id: p._id, saas_product_id: prod._id });
        if (!exists) {
          await PanelSaaSProduct.create({ panel_id: p._id, saas_product_id: prod._id });
          console.log(`  ✓ Linked ${prod.name} -> Panel ${p.name}`);
        }
      }
    }

    // 4. Map to countries
    const countries = await GeoLevel0.find({
      is_active: true,
      $or: [{ deleted_at: null }, { deleted_at: { $exists: false } }]
    }).lean();

    console.log(`\n📌 Mapping to ${countries.length} active countries...`);

    for (const prod of targetProducts) {
      for (const country of countries) {
        let mapping = await CountrySaaSProduct.findOne({
          country_id: country._id,
          saas_product_id: prod._id
        });

        if (!mapping) {
          await CountrySaaSProduct.create({
            country_id: country._id,
            saas_product_id: prod._id,
            is_active: true,
            layout_config: {}
          });
        } else if (!mapping.is_active) {
          mapping.is_active = true;
          await mapping.save();
        }
      }
      console.log(`  ✓ Activated ${prod.name} in all countries.`);
    }

    console.log("\n🎉 Seeding completed successfully!");
    process.exit(0);
  } catch (error) {
    console.error("\n❌ Seeding error:", error);
    process.exit(1);
  }
}

run();
