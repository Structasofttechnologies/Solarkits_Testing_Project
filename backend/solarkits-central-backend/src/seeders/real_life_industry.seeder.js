/**
 * ============================================================
 *  REAL-LIFE INDUSTRY DATA SEEDER
 * ============================================================
 *  Populates real-life Industry Types, Project Categories,
 *  Sub-Categories, System Types, and Capacity Ranges.
 * ============================================================
 *  Run command: node src/seeders/real_life_industry.seeder.js
 * ============================================================
 */

const dns = require('dns');
dns.setServers(['8.8.8.8', '8.8.4.4', '1.1.1.1']);

require('dotenv').config();
const mongoose = require('mongoose');

// Connect database
require('../keys/config/databases');
const {
  IndustryType,
  ProjectCategory,
  ProjectSubcategory,
  ProjectType,
  ProjectSubcategoryType,
  ProjectRange,
  Unit
} = require('../modules/admin-panel/models/core_db');

const slugify = (str) =>
  str
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');

const REAL_LIFE_DATA = [
  {
    name: "Residential Solar Systems",
    slug: "residential-solar-systems",
    description: "Rooftop and ground-mounted solar power systems designed for residential homes, housing societies, and villas.",
    sort_order: 1,
    categories: [
      {
        name: "Rooftop Residential",
        subcategories: [
          {
            name: "Single Phase Residential",
            color: "#2f4cbd",
            systemTypes: [
              {
                name: "On-Grid (Net Metering)",
                ranges: [
                  { min_value: 1, max_value: 3 },
                  { min_value: 3, max_value: 5 },
                  { min_value: 5, max_value: 10 }
                ]
              },
              {
                name: "Hybrid (Battery Backup)",
                ranges: [
                  { min_value: 3, max_value: 5 },
                  { min_value: 5, max_value: 10 }
                ]
              }
            ]
          },
          {
            name: "Three Phase Villa & Multi-Home",
            color: "#10b981",
            systemTypes: [
              {
                name: "On-Grid (Net Metering)",
                ranges: [
                  { min_value: 10, max_value: 20 },
                  { min_value: 20, max_value: 30 }
                ]
              },
              {
                name: "Hybrid (High Voltage)",
                ranges: [
                  { min_value: 10, max_value: 25 }
                ]
              }
            ]
          }
        ]
      },
      {
        name: "Residential Off-Grid & Portable",
        subcategories: [
          {
            name: "Home Emergency Backup",
            color: "#f59e0b",
            systemTypes: [
              {
                name: "Off-Grid Standalone",
                ranges: [
                  { min_value: 1, max_value: 3 },
                  { min_value: 3, max_value: 6 }
                ]
              }
            ]
          }
        ]
      }
    ]
  },
  {
    name: "Commercial & Industrial Solar",
    slug: "commercial-industrial-solar",
    description: "High-capacity solar installations for manufacturing units, commercial complexes, warehouses, hospitals, and educational campuses.",
    sort_order: 2,
    categories: [
      {
        name: "Commercial Rooftop & Carports",
        subcategories: [
          {
            name: "LT Commercial Rooftop System",
            color: "#6366f1",
            systemTypes: [
              {
                name: "On-Grid Commercial",
                ranges: [
                  { min_value: 25, max_value: 50 },
                  { min_value: 50, max_value: 100 }
                ]
              },
              {
                name: "Zero Export System",
                ranges: [
                  { min_value: 30, max_value: 75 }
                ]
              }
            ]
          },
          {
            name: "HT Industrial Plant",
            color: "#ec4899",
            systemTypes: [
              {
                name: "Gross Metering High Voltage",
                ranges: [
                  { min_value: 100, max_value: 300 },
                  { min_value: 300, max_value: 500 },
                  { min_value: 500, max_value: 1000 }
                ]
              },
              {
                name: "Captive Solar Power Plant",
                ranges: [
                  { min_value: 500, max_value: 2000 }
                ]
              }
            ]
          }
        ]
      }
    ]
  }
];

async function seedRealLifeIndustryData() {
  try {
    console.log("🚀 Starting Real-Life Industry Data Seeder...");

    // Find a valid kW Unit
    let kwUnit = await Unit.findOne({
      deleted_at: null,
      $or: [{ symbol: 'kW' }, { symbol: 'kWp' }, { name: /kilowatt/i }]
    });

    if (!kwUnit) {
      kwUnit = await Unit.findOne({ deleted_at: null });
    }

    if (!kwUnit) {
      console.error("❌ No Unit found in DB. Please make sure units are seeded.");
      process.exit(1);
    }
    console.log(`✅ Using Power Unit: ${kwUnit.name} (${kwUnit.symbol}) [${kwUnit._id}]`);

    for (const indData of REAL_LIFE_DATA) {
      console.log(`\n📌 Seeding Industry Type: "${indData.name}"...`);

      let industryDoc = await IndustryType.findOne({
        slug: indData.slug,
        deleted_at: null
      });

      if (!industryDoc) {
        industryDoc = await IndustryType.create({
          name: indData.name,
          slug: indData.slug,
          description: indData.description,
          sort_order: indData.sort_order,
          is_active: true
        });
        console.log(`  ➕ Created Industry Type: ${industryDoc.name} (${industryDoc._id})`);
      } else {
        console.log(`  ✔ Found Existing Industry Type: ${industryDoc.name} (${industryDoc._id})`);
      }

      for (const catData of indData.categories) {
        let catDoc = await ProjectCategory.findOne({
          name: { $regex: new RegExp(`^${catData.name.trim()}$`, 'i') },
          deleted_at: null
        });

        if (!catDoc) {
          catDoc = await ProjectCategory.create({
            name: catData.name.trim(),
            industry_type_id: industryDoc._id,
            is_active: true
          });
          console.log(`    ➕ Created Category: ${catDoc.name} (${catDoc._id})`);
        } else {
          catDoc.industry_type_id = industryDoc._id;
          await catDoc.save();
          console.log(`    ✔ Updated Category: ${catDoc.name} -> Linked to ${industryDoc.name}`);
        }

        for (const subData of catData.subcategories) {
          let subDoc = await ProjectSubcategory.findOne({
            name: { $regex: new RegExp(`^${subData.name.trim()}$`, 'i') },
            category: catDoc._id,
            deleted_at: null
          });

          if (!subDoc) {
            subDoc = await ProjectSubcategory.create({
              name: subData.name.trim(),
              category: catDoc._id,
              color: subData.color || "#2f4cbd",
              is_active: true
            });
            console.log(`      ➕ Created Subcategory: ${subDoc.name} (${subDoc._id})`);
          } else {
            console.log(`      ✔ Found Existing Subcategory: ${subDoc.name} (${subDoc._id})`);
          }

          for (const sysData of subData.systemTypes) {
            let sysTypeDoc = await ProjectType.findOne({
              name: { $regex: new RegExp(`^${sysData.name.trim()}$`, 'i') },
              deleted_at: null
            });

            if (!sysTypeDoc) {
              sysTypeDoc = await ProjectType.create({
                name: sysData.name.trim(),
                is_active: true
              });
              console.log(`        ➕ Created System Type: ${sysTypeDoc.name} (${sysTypeDoc._id})`);
            } else {
              console.log(`        ✔ Found Existing System Type: ${sysTypeDoc.name} (${sysTypeDoc._id})`);
            }

            let typeMapDoc = await ProjectSubcategoryType.findOne({
              subcategory: subDoc._id,
              type: sysTypeDoc._id,
              deleted_at: null
            });

            if (!typeMapDoc) {
              typeMapDoc = await ProjectSubcategoryType.create({
                subcategory: subDoc._id,
                type: sysTypeDoc._id,
                is_active: true
              });
              console.log(`          🔗 Linked System Type "${sysTypeDoc.name}" to Subcategory "${subDoc.name}"`);
            }

            for (const rngData of sysData.ranges) {
              let rangeDoc = await ProjectRange.findOne({
                subcategory_type: typeMapDoc._id,
                min_value: rngData.min_value,
                max_value: rngData.max_value,
                deleted_at: null
              });

              if (!rangeDoc) {
                rangeDoc = await ProjectRange.create({
                  subcategory_type: typeMapDoc._id,
                  min_value: rngData.min_value,
                  max_value: rngData.max_value,
                  unit_id: kwUnit._id,
                  is_active: true
                });
                console.log(`            ➕ Created Range: ${rngData.min_value}-${rngData.max_value} ${kwUnit.symbol}`);
              } else {
                console.log(`            ✔ Found Existing Range: ${rngData.min_value}-${rngData.max_value} ${kwUnit.symbol}`);
              }
            }
          }
        }
      }
    }

    console.log("\n🎉 Real-Life Industry Data Seeding Completed Successfully!");
    process.exit(0);
  } catch (error) {
    console.error("\n❌ Seeding failed with error:", error);
    process.exit(1);
  }
}

seedRealLifeIndustryData();
