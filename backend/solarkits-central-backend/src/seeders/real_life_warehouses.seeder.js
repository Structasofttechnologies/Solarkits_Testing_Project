/**
 * ============================================================
 *  REAL-LIFE WAREHOUSES & KIT ACTIVATIONS SEEDER
 * ============================================================
 *  Seeds 5 Real-Life Active Warehouses for India across:
 *  - Gujarat (Ahmedabad District - Central Gujarat Cluster)
 *  - Maharashtra (Mumbai District - Konkan Cluster)
 *  - Delhi (South Delhi District - South Delhi Cluster)
 *  - Karnataka (Bengaluru Urban District - South Karnataka Cluster)
 *  - Rajasthan (Jaipur District - Central Rajasthan Cluster)
 * ============================================================
 *  Run command: node src/seeders/real_life_warehouses.seeder.js
 * ============================================================
 */

const dns = require('dns');
dns.setServers(['8.8.8.8', '8.8.4.4', '1.1.1.1']);

require('dotenv').config();
const mongoose = require('mongoose');

// Connect database
require('../keys/config/databases');
const {
  GeoLevel0,
  GeoLevel1,
  GeoLevel2,
  Cluster
} = require('../modules/admin-panel/models/geolocation_db');

const { CompanyWarehouse } = require('../modules/warehouse-panel/models/company_warehouse_db');
const { SolarKit, WarehouseKitActivation } = require('../modules/admin-panel/models/core_db');

const WAREHOUSE_DATA = [
  {
    code: "WH-IND-GJ-001",
    type: "company",
    address: "Plot No. 45, GIDC Industrial Estate, Sanand, Ahmedabad, Gujarat",
    pincode: "382110",
    lat: 23.0225,
    lng: 72.5714,
    stateName: "Gujarat",
    districtName: "Ahmedabad",
    images: JSON.stringify([
      "https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=800&auto=format&fit=crop&q=80",
      "https://images.unsplash.com/photo-1553413077-190dd305871c?w=800&auto=format&fit=crop&q=80"
    ])
  },
  {
    code: "WH-IND-MH-001",
    type: "company",
    address: "Logistics Park, Bhiwandi Industrial Area, Mumbai, Maharashtra",
    pincode: "421302",
    lat: 19.0760,
    lng: 72.8777,
    stateName: "Maharashtra",
    districtName: "Mumbai",
    images: JSON.stringify([
      "https://images.unsplash.com/photo-1578575437130-527eed3abbec?w=800&auto=format&fit=crop&q=80",
      "https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=800&auto=format&fit=crop&q=80"
    ])
  },
  {
    code: "WH-IND-DL-001",
    type: "3pl",
    address: "Okhla Industrial Area Phase 3, New Delhi, Delhi",
    pincode: "110020",
    lat: 28.5355,
    lng: 77.2610,
    stateName: "Delhi",
    districtName: "South Delhi",
    images: JSON.stringify([
      "https://images.unsplash.com/photo-1616401784845-180882ba9ba8?w=800&auto=format&fit=crop&q=80"
    ])
  },
  {
    code: "WH-IND-KA-001",
    type: "company",
    address: "Peenya Industrial Area 2nd Stage, Bengaluru, Karnataka",
    pincode: "560058",
    lat: 12.9716,
    lng: 77.5946,
    stateName: "Karnataka",
    districtName: "Bengaluru Urban",
    images: JSON.stringify([
      "https://images.unsplash.com/photo-1587293852726-70cdb56c2866?w=800&auto=format&fit=crop&q=80",
      "https://images.unsplash.com/photo-1553413077-190dd305871c?w=800&auto=format&fit=crop&q=80"
    ])
  },
  {
    code: "WH-IND-RJ-001",
    type: "3pl",
    address: "RIICO Industrial Area, Sitapura, Jaipur, Rajasthan",
    pincode: "302022",
    lat: 26.9124,
    lng: 75.7873,
    stateName: "Rajasthan",
    districtName: "Jaipur",
    images: JSON.stringify([
      "https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=800&auto=format&fit=crop&q=80"
    ])
  }
];

async function seedRealLifeWarehouses() {
  try {
    console.log("🚀 Starting Real-Life Warehouses Seeder...");

    // Clean up legacy test warehouses missing state/level_1 or with code WH_CENTRAL_01
    await CompanyWarehouse.deleteMany({
      $or: [
        { warehouse_code: "WH_CENTRAL_01" },
        { level_1: null }
      ]
    });
    console.log("🧹 Cleaned up legacy incomplete test warehouses.");

    const india = await GeoLevel0.findOne({ $or: [{ iso2: "IN" }, { name: /^India$/i }], deleted_at: null });
    if (!india) {
      console.error("❌ Country India not found in DB.");
      process.exit(1);
    }
    console.log(`✅ Using Country: ${india.name} (${india._id})`);

    const kits = await SolarKit.find({ deleted_at: null }).lean();
    console.log(`✅ Found ${kits.length} Master Solar Kit Definitions in DB.`);

    for (const whData of WAREHOUSE_DATA) {
      console.log(`\n📌 Processing Warehouse: "${whData.code}"...`);

      const state = await GeoLevel1.findOne({
        level_0: india._id,
        name: { $regex: new RegExp(`^${whData.stateName.trim()}$`, 'i') }
      });

      if (!state) {
        console.warn(`  ⚠️ State "${whData.stateName}" not found. Skipping...`);
        continue;
      }

      let district = await GeoLevel2.findOne({
        level_1: state._id,
        name: { $regex: new RegExp(`^${whData.districtName.trim()}$`, 'i') }
      });

      if (!district) {
        district = await GeoLevel2.findOne({ level_1: state._id });
      }

      if (!district) {
        console.warn(`  ⚠️ District for "${whData.stateName}" not found. Skipping...`);
        continue;
      }

      // Find or assign cluster
      let cluster = null;
      if (district.cluster) {
        cluster = await Cluster.findById(district.cluster);
      }
      if (!cluster) {
        cluster = await Cluster.findOne({ level_1: state._id });
        if (cluster) {
          district.cluster = cluster._id;
          await district.save();
        }
      }

      console.log(`  📍 Location: State=${state.name}, District=${district.name}, Cluster=${cluster?.name || 'Unassigned'}`);

      let wh = await CompanyWarehouse.findOne({ warehouse_code: whData.code });
      if (!wh) {
        wh = await CompanyWarehouse.create({
          warehouse_code: whData.code,
          address: whData.address,
          pincode: whData.pincode,
          lat: whData.lat,
          lng: whData.lng,
          images: whData.images,
          status: 1,
          warehouse_type: whData.type,
          level_0: india._id,
          level_1: state._id,
          level_2: district._id,
          is_active: true
        });
        console.log(`  ➕ Created Warehouse: ${wh.warehouse_code} (${wh._id})`);
      } else {
        wh.address = whData.address;
        wh.pincode = whData.pincode;
        wh.lat = whData.lat;
        wh.lng = whData.lng;
        wh.images = whData.images;
        wh.status = 1;
        wh.is_active = true;
        wh.level_0 = india._id;
        wh.level_1 = state._id;
        wh.level_2 = district._id;
        await wh.save();
        console.log(`  ✔ Updated Warehouse: ${wh.warehouse_code} (${wh._id})`);
      }

      // Activate Kits for this warehouse
      for (const kit of kits) {
        let act = await WarehouseKitActivation.findOne({
          warehouse_id: wh._id,
          combo_kit_id: kit._id,
          deleted_at: null
        });

        if (!act) {
          act = await WarehouseKitActivation.create({
            warehouse_id: wh._id,
            combo_kit_id: kit._id,
            is_combokit_active: true,
            is_customize_kit_active: true,
            is_active: true
          });
          console.log(`    🔗 Activated Kit "${kit.name}" for Warehouse "${wh.warehouse_code}"`);
        } else {
          act.is_combokit_active = true;
          act.is_customize_kit_active = true;
          act.is_active = true;
          await act.save();
          console.log(`    ✔ Kit "${kit.name}" already active for Warehouse "${wh.warehouse_code}"`);
        }
      }
    }

    console.log("\n🎉 Real-Life Warehouses Seeding Completed Successfully!");
    process.exit(0);
  } catch (error) {
    console.error("\n❌ Seeding failed with error:", error);
    process.exit(1);
  }
}

seedRealLifeWarehouses();
