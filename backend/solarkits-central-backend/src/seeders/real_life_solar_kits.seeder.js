/**
 * ============================================================
 *  REAL-LIFE MASTER SOLAR KITS SEEDER
 * ============================================================
 *  Seeds 5 Real-Life Master Architectural Blueprints (SolarKits)
 *  mapped to Industry Types, Categories, Subcategories, System Types,
 *  Base Components, and BOS Kit Bundles.
 * ============================================================
 *  Run command: node src/seeders/real_life_solar_kits.seeder.js
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
  ProductTemplate,
  ProductSubtype,
  Brand,
  SolarKit
} = require('../modules/admin-panel/models/core_db');

async function seedSolarKitBlueprints() {
  try {
    console.log("🚀 Starting Real-Life Master Solar Kits Seeder...");

    // Helper maps for templates, subtypes, brands
    const templates = await ProductTemplate.find({ deleted_at: null }).lean();
    const subtypes = await ProductSubtype.find({ deleted_at: null }).lean();
    const brands = await Brand.find({ deleted_at: null }).lean();

    const getTplId = (nameStr) => {
      const t = templates.find(item => item.name.toLowerCase().includes(nameStr.toLowerCase()));
      return t ? t._id : null;
    };

    const getSubtypeId = (nameStr) => {
      const s = subtypes.find(item => item.name.toLowerCase().includes(nameStr.toLowerCase()));
      return s ? s._id : null;
    };

    const getBrandId = (nameStr) => {
      const b = brands.find(item => item.brand_name.toLowerCase().includes(nameStr.toLowerCase()));
      return b ? b._id : (brands[0]?._id || null);
    };

    // Blueprint Definitions dataset
    const BLUEPRINTS = [
      {
        name: "5kW Residential Single Phase Premium On-Grid Kit",
        description: "Complete 5kW On-Grid solar architectural blueprint with Mono PERC panels, high-efficiency string inverter, ACDB/DCDB protection boxes, GI mounting structure, and lightning arrester.",
        industryName: "Residential Solar",
        catName: "Rooftop Grid-Tied & Hybrid Systems",
        subCatName: "Single Phase Residential (1-Phase LT)",
        sysTypeName: "On-Grid (Net Metering)",
        baseComponents: [
          { tpl: "Solar Panel", st: "Mono PERC" },
          { tpl: "Inverter", st: "String" }
        ],
        bosKits: [
          {
            name: "Electrical Protection Bundle",
            brand: "Tata Power Solar",
            items: [
              { tpl: "ACDB", subtypes: ["Single Phase"] },
              { tpl: "DCDB", subtypes: ["1 String"] },
              { tpl: "Surge Protection Device", subtypes: ["AC SPD"] }
            ]
          },
          {
            name: "Structure & Cabling Kit",
            brand: "Waaree Energies",
            items: [
              { tpl: "Mounting Structure", subtypes: ["RCC Roof"] },
              { tpl: "Cable", subtypes: ["DC Cable", "AC Cable"] },
              { tpl: "Earthing Rod", subtypes: ["Copper Bonded"] }
            ]
          }
        ]
      },
      {
        name: "10kW Three Phase Villa Hybrid Backup Kit",
        description: "Advanced 10kW Hybrid solar blueprint featuring high-voltage LFP Lithium battery storage, smart 3-phase hybrid inverter, and automated changeover switch gear.",
        industryName: "Residential Solar",
        catName: "Rooftop Grid-Tied & Hybrid Systems",
        subCatName: "Three Phase Villa & Large Homes (3-Phase LT)",
        sysTypeName: "Hybrid (High Voltage Commercial/Villa ESS)",
        baseComponents: [
          { tpl: "Solar Panel", st: "TOPCon" },
          { tpl: "Inverter", st: "Hybrid" },
          { tpl: "Battery", st: "Lithium-Ion" }
        ],
        bosKits: [
          {
            name: "Hybrid BOS Safety Package",
            brand: "Havells Solar",
            items: [
              { tpl: "ACDB", subtypes: ["Three Phase"] },
              { tpl: "DCDB", subtypes: ["2 String"] },
              { tpl: "Changeover Switch", subtypes: ["Automatic"] }
            ]
          },
          {
            name: "Civil & Grounding Hardware",
            brand: "Adani Solar",
            items: [
              { tpl: "Mounting Structure", subtypes: ["Metal Roof"] },
              { tpl: "Earthing Rod", subtypes: ["Chemical Earthing"] },
              { tpl: "Lightning Arrester", subtypes: ["ESE Type"] }
            ]
          }
        ]
      },
      {
        name: "3kW Home Emergency Off-Grid Power Kit",
        description: "Compact 3kW Off-Grid standalone emergency solar power blueprint with MPPT charge controller and heavy-duty lead acid battery bank.",
        industryName: "Residential Solar",
        catName: "Rooftop Grid-Tied & Hybrid Systems",
        subCatName: "Single Phase Residential (1-Phase LT)",
        sysTypeName: "Off-Grid Standalone System",
        baseComponents: [
          { tpl: "Solar Panel", st: "Poly" },
          { tpl: "Inverter", st: "String" },
          { tpl: "Battery", st: "Lead Acid" }
        ],
        bosKits: [
          {
            name: "Off-Grid DC Wiring & Protection",
            brand: "Luminous Power Technologies",
            items: [
              { tpl: "DCDB", subtypes: ["1 String"] },
              { tpl: "Charge Controller", subtypes: ["MPPT"] },
              { tpl: "Cable", subtypes: ["DC Cable"] }
            ]
          }
        ]
      },
      {
        name: "50kW Commercial LT On-Grid Rooftop Solution",
        description: "50kW LT Commercial rooftop blueprint engineered for commercial buildings, office parks, and educational institutes with dual-string inverters and net metering.",
        industryName: "Commercial & Industrial (C&I)",
        catName: "Factory & Warehouse Metal Shed Solar",
        subCatName: "Industrial Tin Shed (Trapezoidal / Klip-Lok Profile)",
        sysTypeName: "Three-Phase String Inverter System (HT/LT)",
        baseComponents: [
          { tpl: "Solar Panel", st: "Bifacial" },
          { tpl: "Inverter", st: "String" }
        ],
        bosKits: [
          {
            name: "LT Switchgear & Distribution Panel",
            brand: "Servotech Power Systems",
            items: [
              { tpl: "ACDB", subtypes: ["Three Phase"] },
              { tpl: "DCDB", subtypes: ["4 String"] },
              { tpl: "MCCB", subtypes: ["4 Pole"] },
              { tpl: "Net Meter", subtypes: ["Three Phase"] }
            ]
          },
          {
            name: "Commercial Mounting & Heavy Earthing Kit",
            brand: "Vikram Solar",
            items: [
              { tpl: "Mounting Structure", subtypes: ["Carport"] },
              { tpl: "Earthing Pit", subtypes: ["Maintenance Free"] },
              { tpl: "Lightning Arrester", subtypes: ["ESE Type"] }
            ]
          }
        ]
      },
      {
        name: "500kW Industrial High Voltage Captive Solar Blueprint",
        description: "Industrial mega 500kW captive power blueprint for manufacturing plants, textile mills, and factories with central inverter integration and high-voltage protection.",
        industryName: "Commercial & Industrial (C&I)",
        catName: "Factory & Warehouse Metal Shed Solar",
        subCatName: "Industrial Tin Shed (Trapezoidal / Klip-Lok Profile)",
        sysTypeName: "Three-Phase String Inverter System (HT/LT)",
        baseComponents: [
          { tpl: "Solar Panel", st: "HJT" },
          { tpl: "Inverter", st: "Central" }
        ],
        bosKits: [
          {
            name: "HT Industrial Power Distribution Panel",
            brand: "Premier Energies",
            items: [
              { tpl: "DCDB", subtypes: ["8 String"] },
              { tpl: "Isolator", subtypes: ["DC Isolator"] },
              { tpl: "MCCB", subtypes: ["3 Pole"] }
            ]
          },
          {
            name: "Ground Mount & Cable Management Array",
            brand: "Goldi Solar",
            items: [
              { tpl: "Mounting Structure", subtypes: ["Ground Mount"] },
              { tpl: "Cable Tray", subtypes: ["Ladder Type"] },
              { tpl: "Earthing Rod", subtypes: ["GI Rod"] }
            ]
          }
        ]
      }
    ];

    for (const blueprint of BLUEPRINTS) {
      console.log(`\n📌 Processing Blueprint: "${blueprint.name}"...`);

      // 1. Resolve Industry Type
      const indDoc = await IndustryType.findOne({ name: blueprint.industryName, deleted_at: null });
      if (!indDoc) {
        console.warn(`  ⚠️ Industry Type "${blueprint.industryName}" not found. Skipping...`);
        continue;
      }

      // 2. Resolve Category
      const catDoc = await ProjectCategory.findOne({
        name: blueprint.catName,
        industry_type_id: indDoc._id,
        deleted_at: null
      });

      if (!catDoc) {
        console.warn(`  ⚠️ Category "${blueprint.catName}" under "${blueprint.industryName}" not found. Skipping...`);
        continue;
      }

      // 3. Resolve Subcategory
      const subCatDoc = await ProjectSubcategory.findOne({
        name: blueprint.subCatName,
        category: catDoc._id,
        deleted_at: null
      });

      if (!subCatDoc) {
        console.warn(`  ⚠️ Subcategory "${blueprint.subCatName}" not found. Skipping...`);
        continue;
      }

      // 4. Resolve System Type
      const sysTypeDoc = await ProjectType.findOne({
        name: blueprint.sysTypeName,
        deleted_at: null
      });

      if (!sysTypeDoc) {
        console.warn(`  ⚠️ System Type "${blueprint.sysTypeName}" not found. Skipping...`);
        continue;
      }

      // 5. Resolve Subcategory-Type Pivot Map
      const typeMapDoc = await ProjectSubcategoryType.findOne({
        subcategory: subCatDoc._id,
        type: sysTypeDoc._id,
        deleted_at: null
      });

      if (!typeMapDoc) {
        console.warn(`  ⚠️ Type map between "${subCatDoc.name}" and "${sysTypeDoc.name}" not found. Skipping...`);
        continue;
      }

      // 6. Map Base Components
      const base_components = blueprint.baseComponents.map(bc => ({
        template_id: getTplId(bc.tpl),
        subtype_id: getSubtypeId(bc.st)
      })).filter(bc => bc.template_id);

      const base_template_ids = base_components.map(bc => bc.template_id);

      // 7. Map BOS Kits
      const bos_kits = blueprint.bosKits.map(bk => ({
        name: bk.name,
        brand_id: getBrandId(bk.brand),
        items: bk.items.map(item => ({
          template_id: getTplId(item.tpl),
          subtype_ids: item.subtypes.map(st => getSubtypeId(st)).filter(Boolean)
        })).filter(item => item.template_id)
      }));

      const bos_template_ids = [];
      bos_kits.forEach(bk => {
        (bk.items || []).forEach(item => {
          if (item.template_id && !bos_template_ids.includes(item.template_id.toString())) {
            bos_template_ids.push(item.template_id);
          }
        });
      });

      // Upsert SolarKit Blueprint
      let kitDoc = await SolarKit.findOne({
        name: blueprint.name,
        deleted_at: null
      });

      if (!kitDoc) {
        kitDoc = await SolarKit.create({
          name: blueprint.name,
          description: blueprint.description,
          category_id: catDoc._id,
          subcategory_id: subCatDoc._id,
          type_id: typeMapDoc._id,
          base_template_ids,
          bos_template_ids,
          base_components,
          bos_kits
        });
        console.log(`  ➕ Created Master Solar Kit Definition: "${kitDoc.name}" (${kitDoc._id})`);
      } else {
        kitDoc.description = blueprint.description;
        kitDoc.category_id = catDoc._id;
        kitDoc.subcategory_id = subCatDoc._id;
        kitDoc.type_id = typeMapDoc._id;
        kitDoc.base_template_ids = base_template_ids;
        kitDoc.bos_template_ids = bos_template_ids;
        kitDoc.base_components = base_components;
        kitDoc.bos_kits = bos_kits;
        await kitDoc.save();
        console.log(`  ✔ Updated Existing Solar Kit Definition: "${kitDoc.name}" (${kitDoc._id})`);
      }
    }

    console.log("\n🎉 Real-Life Master Solar Kits Seeding Completed Successfully!");
    process.exit(0);
  } catch (error) {
    console.error("\n❌ Seeding failed with error:", error);
    process.exit(1);
  }
}

seedSolarKitBlueprints();
