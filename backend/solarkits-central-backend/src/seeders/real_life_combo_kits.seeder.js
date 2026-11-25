/**
 * ============================================================
 *  REAL-LIFE COMBO KITS & PRODUCT SKUS SEEDER
 * ============================================================
 *  Seeds:
 *  1. Products (`products` collection)
 *  2. Product SKUs (`pc_product_skus` collection)
 *  3. Localized Combo Kits (`pc_comobo_kit` collection)
 *     mapped to Master Solar Kit Blueprints, Brands, Base Components,
 *     and BOS Kits for India.
 * ============================================================
 *  Run command: node src/seeders/real_life_combo_kits.seeder.js
 * ============================================================
 */

const dns = require('dns');
dns.setServers(['8.8.8.8', '8.8.4.4', '1.1.1.1']);

require('dotenv').config();
const mongoose = require('mongoose');

// Connect database
require('../keys/config/databases');
const {
  WarehouseComboKit: ComboKit,
  SolarKit,
  Brand,
  ProductTemplate,
  ProductSubtype,
  Product,
  ProductSku,
  ProjectRange
} = require('../modules/admin-panel/models/core_db');
const { GeoLevel0 } = require('../modules/admin-panel/models/geolocation_db');

async function seedComboKitsAndSkus() {
  try {
    console.log("🚀 Starting Real-Life Combo Kits & Product SKUs Seeder...");

    // 1. Fetch active India country ID
    const india = await GeoLevel0.findOne({ $or: [{ iso2: "IN" }, { name: /^India$/i }], deleted_at: null }).lean();
    if (!india) {
      console.error("❌ Country 'India' not found in database.");
      process.exit(1);
    }
    const countryId = india._id;
    console.log("📍 Target Country: India (ID:", countryId.toString(), ")");

    // 2. Fetch Brands
    const brands = await Brand.find({ deleted_at: null }).lean();
    const findBrand = (nameStr) => {
      const b = brands.find(item => (item.brand_name || item.name || '').toLowerCase().includes(nameStr.toLowerCase()));
      return b ? b._id : (brands[0]?._id || null);
    };

    const tataBrand = findBrand("tata");
    const waareeBrand = findBrand("waaree");
    const adaniBrand = findBrand("adani");
    const havellsBrand = findBrand("havells");
    const growattBrand = findBrand("growatt");
    const exideBrand = findBrand("exide");

    // 3. Fetch Templates & Subtypes
    const templates = await ProductTemplate.find({ deleted_at: null }).lean();
    const subtypes = await ProductSubtype.find({ deleted_at: null }).lean();

    const getTpl = (nameStr) => templates.find(t => t.name.toLowerCase().includes(nameStr.toLowerCase()));
    const getSub = (nameStr) => subtypes.find(s => s.name.toLowerCase().includes(nameStr.toLowerCase()));

    const panelTpl = getTpl("panel");
    const inverterTpl = getTpl("inverter");
    const batteryTpl = getTpl("battery");

    const monoPercSub = getSub("mono perc");
    const topconSub = getSub("topcon");
    const bifacialSub = getSub("bifacial");
    const hjtSub = getSub("hjt");

    const stringInvSub = getSub("string");
    const hybridInvSub = getSub("hybrid");
    const centralInvSub = getSub("central");

    const lithiumBatSub = getSub("lithium");
    const leadAcidBatSub = getSub("lead acid");

    // 4. Seed Products & Product SKUs
    console.log("📦 Seeding Products & Product SKUs...");
    
    // Clear old sample SKUs & Products
    await ProductSku.deleteMany({});
    await Product.deleteMany({});

    const SEED_PRODUCTS = [
      {
        name: "Tata Power Solar 540W Mono PERC Module",
        code: "TPS-MP-540W",
        template_id: panelTpl?._id,
        subtype_id: monoPercSub?._id,
        brand_id: tataBrand,
        watt: 540
      },
      {
        name: "Waaree Energies 550W Bifacial TOPCon Module",
        code: "WAR-BIF-550W",
        template_id: panelTpl?._id,
        subtype_id: bifacialSub?._id || topconSub?._id,
        brand_id: waareeBrand,
        watt: 550
      },
      {
        name: "Adani Solar 580W TOPCon High Efficiency Module",
        code: "AD-TOP-580W",
        template_id: panelTpl?._id,
        subtype_id: topconSub?._id,
        brand_id: adaniBrand,
        watt: 580
      },
      {
        name: "Havells 3kW Single Phase String Inverter",
        code: "HAV-STR-3KW",
        template_id: inverterTpl?._id,
        subtype_id: stringInvSub?._id,
        brand_id: havellsBrand,
        kw: 3
      },
      {
        name: "Havells 5kW Single Phase String Inverter",
        code: "HAV-STR-5KW",
        template_id: inverterTpl?._id,
        subtype_id: stringInvSub?._id,
        brand_id: havellsBrand,
        kw: 5
      },
      {
        name: "Growatt 10kW Three Phase Hybrid Inverter",
        code: "GRO-HYB-10KW",
        template_id: inverterTpl?._id,
        subtype_id: hybridInvSub?._id,
        brand_id: growattBrand,
        kw: 10
      },
      {
        name: "Exide 10.24kWh LFP Battery Storage Pack",
        code: "EXI-LFP-10KW",
        template_id: batteryTpl?._id,
        subtype_id: lithiumBatSub?._id,
        brand_id: exideBrand,
        kwh: 10.24
      }
    ];

    const skuMap = {};

    for (const pItem of SEED_PRODUCTS) {
      if (!pItem.template_id || !pItem.subtype_id) continue;

      const pDoc = await Product.create({
        name: pItem.name,
        description: `${pItem.name} for residential & commercial solar installations.`,
        template_id: pItem.template_id,
        subtype_id: pItem.subtype_id,
        brand_id: pItem.brand_id,
        features: ["BIS Certified", "ALMM Listed", "Tier 1 Solar Component"]
      });

      const skuDoc = await ProductSku.create({
        product_id: pDoc._id,
        sku_code: pItem.code,
        image: "https://images.unsplash.com/photo-1509391365360-2e959784a276?w=400&auto=format&fit=crop&q=80"
      });

      skuMap[pItem.code] = skuDoc._id;
    }

    console.log(`✅ Created ${Object.keys(skuMap).length} Product SKUs in database.`);

    // 5. Fetch Master Blueprints & Ranges
    const blueprints = await SolarKit.find({ deleted_at: null }).lean();
    const ranges = await ProjectRange.find({ deleted_at: null }).lean();

    const getBlueprint = (nameStr) => blueprints.find(b => b.name.toLowerCase().includes(nameStr.toLowerCase())) || blueprints[0];
    const getRange = (bp, minKW) => {
      if (!bp || !bp.type_id) return null;
      const typeIdStr = bp.type_id.toString();
      const matchingForType = ranges.filter(r => (r.subcategory_type?.toString() === typeIdStr || r.subcategory_type_id?.toString() === typeIdStr));
      const exact = matchingForType.find(r => r.min_value <= minKW && r.max_value >= minKW);
      if (exact) return exact._id;
      if (matchingForType.length > 0) return matchingForType[0]._id;
      return null;
    };

    // 6. Seed Localized Combo Kits
    console.log("☀️ Seeding Localized Combo Kits...");
    await ComboKit.deleteMany({});

    const COMBO_KITS_DATA = [
      {
        name: "3 kW Residential High Efficiency Solar Combo Kit",
        description: "Complete 3 kW Mono PERC Solar System with Single-Phase String Inverter and Full BOS Protection Kit.",
        blueprint: getBlueprint("5kW Residential Single Phase"),
        brand_id: tataBrand,
        capacity: 3,
        kit_image: "https://images.unsplash.com/photo-1509391365360-2e959784a276?w=800&auto=format&fit=crop&q=80",
        base_components: [
          {
            template_id: panelTpl?._id,
            subtype_id: monoPercSub?._id,
            brand_id: tataBrand,
            brand_ids: [tataBrand],
            sku_id: skuMap["TPS-MP-540W"],
            quantity: 6
          },
          {
            template_id: inverterTpl?._id,
            subtype_id: stringInvSub?._id,
            brand_id: havellsBrand,
            brand_ids: [havellsBrand],
            sku_id: skuMap["HAV-STR-3KW"],
            quantity: 1
          }
        ],
        bos_kits: [
          {
            name: "Electrical Protection Bundle",
            brand_id: waareeBrand,
            brand_ids: [waareeBrand],
            quantity: 1,
            image: "https://images.unsplash.com/photo-1581092335397-9583fe92d232?w=400&auto=format&fit=crop&q=80",
            template_ids: [panelTpl?._id],
            subtype_ids: [monoPercSub?._id]
          },
          {
            name: "Structure & Cabling Kit",
            brand_id: tataBrand,
            brand_ids: [tataBrand],
            quantity: 1,
            image: "https://images.unsplash.com/photo-1544724569-5f546fd6f2b5?w=400&auto=format&fit=crop&q=80",
            template_ids: [inverterTpl?._id],
            subtype_ids: [stringInvSub?._id]
          }
        ]
      },
      {
        name: "5 kW Premium Bifacial Rooftop Solar Combo Kit",
        description: "High performance 5 kW Bifacial solar kit featuring top-tier string inverter and heavy-duty GI mounting structure.",
        blueprint: getBlueprint("5kW Residential Single Phase"),
        brand_id: waareeBrand,
        capacity: 5,
        kit_image: "https://images.unsplash.com/photo-1544724569-5f546fd6f2b5?w=800&auto=format&fit=crop&q=80",
        base_components: [
          {
            template_id: panelTpl?._id,
            subtype_id: bifacialSub?._id || monoPercSub?._id,
            brand_id: waareeBrand,
            brand_ids: [waareeBrand],
            sku_id: skuMap["WAR-BIF-550W"],
            quantity: 9
          },
          {
            template_id: inverterTpl?._id,
            subtype_id: stringInvSub?._id,
            brand_id: havellsBrand,
            brand_ids: [havellsBrand],
            sku_id: skuMap["HAV-STR-5KW"],
            quantity: 1
          }
        ],
        bos_kits: [
          {
            name: "Electrical Protection Bundle",
            brand_id: waareeBrand,
            brand_ids: [waareeBrand],
            quantity: 1,
            image: "https://images.unsplash.com/photo-1581092335397-9583fe92d232?w=400&auto=format&fit=crop&q=80",
            template_ids: [panelTpl?._id],
            subtype_ids: [bifacialSub?._id]
          },
          {
            name: "Structure & Cabling Kit",
            brand_id: waareeBrand,
            brand_ids: [waareeBrand],
            quantity: 1,
            image: "https://images.unsplash.com/photo-1544724569-5f546fd6f2b5?w=400&auto=format&fit=crop&q=80",
            template_ids: [inverterTpl?._id],
            subtype_ids: [stringInvSub?._id]
          }
        ]
      },
      {
        name: "10 kW Three Phase Villa Hybrid Backup Kit",
        description: "Premium 10 kW Hybrid solar kit with 10.24kWh LFP battery backup, high-efficiency TOPCon panels, and smart monitoring.",
        blueprint: getBlueprint("10kW Three Phase Villa"),
        brand_id: adaniBrand,
        capacity: 10,
        kit_image: "https://images.unsplash.com/photo-1581092335397-9583fe92d232?w=800&auto=format&fit=crop&q=80",
        base_components: [
          {
            template_id: panelTpl?._id,
            subtype_id: topconSub?._id || monoPercSub?._id,
            brand_id: adaniBrand,
            brand_ids: [adaniBrand],
            sku_id: skuMap["AD-TOP-580W"],
            quantity: 17
          },
          {
            template_id: inverterTpl?._id,
            subtype_id: hybridInvSub?._id || stringInvSub?._id,
            brand_id: growattBrand,
            brand_ids: [growattBrand],
            sku_id: skuMap["GRO-HYB-10KW"],
            quantity: 1
          },
          {
            template_id: batteryTpl?._id,
            subtype_id: lithiumBatSub?._id || leadAcidBatSub?._id,
            brand_id: exideBrand,
            brand_ids: [exideBrand],
            sku_id: skuMap["EXI-LFP-10KW"],
            quantity: 1
          }
        ],
        bos_kits: [
          {
            name: "Electrical Protection Bundle",
            brand_id: havellsBrand,
            brand_ids: [havellsBrand],
            quantity: 1,
            image: "https://images.unsplash.com/photo-1581092335397-9583fe92d232?w=400&auto=format&fit=crop&q=80",
            template_ids: [panelTpl?._id],
            subtype_ids: [topconSub?._id]
          },
          {
            name: "Structure & Cabling Kit",
            brand_id: waareeBrand,
            brand_ids: [waareeBrand],
            quantity: 1,
            image: "https://images.unsplash.com/photo-1544724569-5f546fd6f2b5?w=400&auto=format&fit=crop&q=80",
            template_ids: [inverterTpl?._id],
            subtype_ids: [hybridInvSub?._id]
          }
        ]
      },
      {
        name: "50 kW Commercial LT On-Grid Rooftop Solution",
        description: "Commercial 50 kW rooftop solar blueprint with high wattage bifacial panels and heavy-duty 3-phase LT ACDB.",
        blueprint: getBlueprint("50kW Commercial LT"),
        brand_id: tataBrand,
        capacity: 50,
        kit_image: "https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=800&auto=format&fit=crop&q=80",
        base_components: [
          {
            template_id: panelTpl?._id,
            subtype_id: bifacialSub?._id || monoPercSub?._id,
            brand_id: tataBrand,
            brand_ids: [tataBrand],
            sku_id: skuMap["TPS-MP-540W"],
            quantity: 91
          },
          {
            template_id: inverterTpl?._id,
            subtype_id: stringInvSub?._id,
            brand_id: havellsBrand,
            brand_ids: [havellsBrand],
            sku_id: skuMap["HAV-STR-5KW"],
            quantity: 10
          }
        ],
        bos_kits: [
          {
            name: "LT Commercial Protection Panel",
            brand_id: tataBrand,
            brand_ids: [tataBrand],
            quantity: 1,
            image: "https://images.unsplash.com/photo-1581092335397-9583fe92d232?w=400&auto=format&fit=crop&q=80",
            template_ids: [panelTpl?._id],
            subtype_ids: [bifacialSub?._id]
          },
          {
            name: "HDG Structure & Cable Array",
            brand_id: waareeBrand,
            brand_ids: [waareeBrand],
            quantity: 1,
            image: "https://images.unsplash.com/photo-1544724569-5f546fd6f2b5?w=400&auto=format&fit=crop&q=80",
            template_ids: [inverterTpl?._id],
            subtype_ids: [stringInvSub?._id]
          }
        ]
      }
    ];

    const insertedKits = [];
    for (const item of COMBO_KITS_DATA) {
      if (!item.blueprint) continue;

      const bp = item.blueprint;
      const rangeId = getRange(bp, item.capacity);

      const kDoc = await ComboKit.create({
        name: item.name,
        description: item.description,
        country_id: countryId,
        solar_kit_id: bp._id,
        brand_id: item.brand_id,
        project_range_id: rangeId ? (rangeId._id || rangeId) : null,
        capacity: item.capacity,
        inverter_tolerance: 10,
        inverter_mode: item.capacity >= 10 ? "multi" : "single",
        kit_image: item.kit_image,
        base_components: item.base_components,
        bos_kits: item.bos_kits,
        base_price_cached: item.capacity * 45000,
        selling_price_cached: item.capacity * 52000,
        is_custom: false,
        is_active: true
      });

      insertedKits.push(kDoc);
      console.log(`   📌 Seeded ComboKit: "${kDoc.name}" (${kDoc.base_components.length} base components, ${kDoc.bos_kits.length} BOS kits)`);
    }

    console.log(`\n🎉 Successfully seeded ${insertedKits.length} Real-Life Combo Kits with Brands & SKUs!`);
    process.exit(0);
  } catch (error) {
    console.error("❌ Error seeding Combo Kits & SKUs:", error);
    process.exit(1);
  }
}

seedComboKitsAndSkus();
