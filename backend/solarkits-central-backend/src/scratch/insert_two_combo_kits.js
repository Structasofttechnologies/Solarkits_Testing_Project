/**
 * ============================================================
 *  INSERT TWO APPROVED COMBO KITS INTO DATABASE
 * ============================================================
 *  1. 3 kW Tata Power Residential High-Efficiency On-Grid Solar Combo Kit
 *  2. 5 kW Waaree Energies Premium Bifacial Rooftop Solar Combo Kit
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

async function insertApprovedComboKits() {
  try {
    console.log("🚀 Starting insertion of the two approved Combo Kits...");

    // 1. Fetch India Country ID
    const india = await GeoLevel0.findOne({ 
      $or: [{ iso2: "IN" }, { name: /^India$/i }], 
      deleted_at: null 
    }).lean();

    if (!india) {
      throw new Error("Country 'India' not found in database.");
    }
    const countryId = india._id;
    console.log(`📍 Found Target Country: India (ID: ${countryId})`);

    // 2. Resolve Brands
    const brands = await Brand.find({ deleted_at: null }).lean();
    const findBrand = (term) => {
      const b = brands.find(item => 
        (item.brand_name || item.name || '').toLowerCase().includes(term.toLowerCase())
      );
      return b ? b._id : (brands[0]?._id || null);
    };

    const tataBrand = findBrand("Tata");
    const waareeBrand = findBrand("Waaree");
    const havellsBrand = findBrand("Havells");
    console.log(`🏢 Brands Resolved: Tata (${tataBrand}), Waaree (${waareeBrand}), Havells (${havellsBrand})`);

    // 3. Resolve Templates & Subtypes
    const templates = await ProductTemplate.find({ deleted_at: null }).lean();
    const subtypes = await ProductSubtype.find({ deleted_at: null }).lean();

    const panelTpl = templates.find(t => (t.name || '').toLowerCase().includes("panel"));
    const inverterTpl = templates.find(t => (t.name || '').toLowerCase().includes("inverter"));

    const monoPercSub = subtypes.find(s => (s.name || '').toLowerCase().includes("mono"));
    const bifacialSub = subtypes.find(s => (s.name || '').toLowerCase().includes("bifacial")) ||
                        subtypes.find(s => (s.name || '').toLowerCase().includes("topcon"));
    const stringInvSub = subtypes.find(s => (s.name || '').toLowerCase().includes("string"));

    console.log(`🔧 Templates: Panel (${panelTpl?._id}), Inverter (${inverterTpl?._id})`);
    console.log(`🔧 Subtypes: Mono PERC (${monoPercSub?._id}), Bifacial (${bifacialSub?._id}), String (${stringInvSub?._id})`);

    // 4. Resolve or Create SKUs
    async function getOrCreateSku(skuCode, productName, tplId, subId, brandId, wattOrKw) {
      let sku = await ProductSku.findOne({ sku_code: skuCode, deleted_at: null }).lean();
      if (sku) {
        return sku._id;
      }
      // Check if product exists
      let prod = await Product.findOne({ name: productName, deleted_at: null });
      if (!prod) {
        prod = await Product.create({
          name: productName,
          description: `${productName} for residential & commercial solar installations.`,
          template_id: tplId,
          subtype_id: subId,
          brand_id: brandId,
          features: ["BIS Certified", "ALMM Listed", "Tier 1 Solar Component"]
        });
      }
      const newSku = await ProductSku.create({
        product_id: prod._id,
        sku_code: skuCode,
        image: "https://images.unsplash.com/photo-1509391365360-2e959784a276?w=400&auto=format&fit=crop&q=80"
      });
      console.log(`   ✨ Created SKU: ${skuCode} (${newSku._id})`);
      return newSku._id;
    }

    const tataPanelSku = await getOrCreateSku(
      "TPS-MP-540W",
      "Tata Power Solar 540W Mono PERC Module",
      panelTpl?._id,
      monoPercSub?._id,
      tataBrand,
      540
    );

    const waareePanelSku = await getOrCreateSku(
      "WAR-BIF-550W",
      "Waaree Energies 550W Bifacial TOPCon Module",
      panelTpl?._id,
      bifacialSub?._id,
      waareeBrand,
      550
    );

    const havells3kSku = await getOrCreateSku(
      "HAV-STR-3KW",
      "Havells 3kW Single Phase String Inverter",
      inverterTpl?._id,
      stringInvSub?._id,
      havellsBrand,
      3
    );

    const havells5kSku = await getOrCreateSku(
      "HAV-STR-5KW",
      "Havells 5kW Single Phase String Inverter",
      inverterTpl?._id,
      stringInvSub?._id,
      havellsBrand,
      5
    );

    // 5. Resolve Blueprint & Project Ranges
    const blueprints = await SolarKit.find({ deleted_at: null }).lean();
    const ranges = await ProjectRange.find({ deleted_at: null }).lean();

    const getBlueprint = (nameStr) => {
      const b = blueprints.find(item => item.name.toLowerCase().includes(nameStr.toLowerCase()));
      return b || blueprints[0];
    };

    const targetBlueprint = getBlueprint("5kW Residential Single Phase") || blueprints[0];
    console.log(`📐 Master Blueprint: ${targetBlueprint.name} (${targetBlueprint._id})`);

    const getRange = (bp, capacityKw) => {
      if (!bp || !bp.type_id) return ranges[0]?._id || null;
      const typeIdStr = bp.type_id.toString();
      const matching = ranges.filter(r => 
        (r.subcategory_type?.toString() === typeIdStr || r.subcategory_type_id?.toString() === typeIdStr)
      );
      const exact = matching.find(r => r.min_value <= capacityKw && r.max_value >= capacityKw);
      if (exact) return exact._id;
      if (matching.length > 0) return matching[0]._id;
      const fallback = ranges.find(r => r.min_value <= capacityKw && r.max_value >= capacityKw);
      return fallback ? fallback._id : (ranges[0]?._id || null);
    };

    const range3kW = getRange(targetBlueprint, 3);
    const range5kW = getRange(targetBlueprint, 5);
    console.log(`📏 Project Ranges: 3kW -> ${range3kW}, 5kW -> ${range5kW}`);

    // 6. Define the Two Approved Combo Kits
    const KITS_TO_INSERT = [
      {
        name: "3 kW Tata Power Residential High-Efficiency On-Grid Solar Combo Kit",
        description: "Complete 3 kW Mono PERC Solar System with Single-Phase String Inverter and Full BOS Protection Kit.",
        solar_kit_id: targetBlueprint._id,
        brand_id: tataBrand,
        project_range_id: range3kW,
        capacity: 3,
        inverter_tolerance: 10,
        inverter_mode: "single",
        kit_image: "https://images.unsplash.com/photo-1509391365360-2e959784a276?w=800&auto=format&fit=crop&q=80",
        order_quantities: [1, 5, 10, 25],
        base_components: [
          {
            template_id: panelTpl?._id,
            subtype_id: monoPercSub?._id,
            brand_id: tataBrand,
            brand_ids: [tataBrand],
            sku_id: tataPanelSku,
            quantity: 6
          },
          {
            template_id: inverterTpl?._id,
            subtype_id: stringInvSub?._id,
            brand_id: havellsBrand,
            brand_ids: [havellsBrand],
            sku_id: havells3kSku,
            quantity: 1
          }
        ],
        bos_kits: [
          {
            name: "Electrical Protection Bundle",
            brand_id: tataBrand,
            brand_ids: [tataBrand],
            quantity: 1,
            image: "https://images.unsplash.com/photo-1581092335397-9583fe92d232?w=400&auto=format&fit=crop&q=80",
            template_ids: panelTpl ? [panelTpl._id] : [],
            subtype_ids: monoPercSub ? [monoPercSub._id] : []
          },
          {
            name: "Structure & Cabling Kit",
            brand_id: waareeBrand,
            brand_ids: [waareeBrand],
            quantity: 1,
            image: "https://images.unsplash.com/photo-1544724569-5f546fd6f2b5?w=400&auto=format&fit=crop&q=80",
            template_ids: inverterTpl ? [inverterTpl._id] : [],
            subtype_ids: stringInvSub ? [stringInvSub._id] : []
          }
        ],
        base_price_cached: 135000,
        selling_price_cached: 165000,
        is_custom: false,
        is_active: true
      },
      {
        name: "5 kW Waaree Energies Premium Bifacial Rooftop Solar Combo Kit",
        description: "High performance 5 kW Bifacial solar kit featuring top-tier string inverter and heavy-duty GI mounting structure.",
        solar_kit_id: targetBlueprint._id,
        brand_id: waareeBrand,
        project_range_id: range5kW,
        capacity: 5,
        inverter_tolerance: 10,
        inverter_mode: "single",
        kit_image: "https://images.unsplash.com/photo-1544724569-5f546fd6f2b5?w=800&auto=format&fit=crop&q=80",
        order_quantities: [1, 5, 10, 25],
        base_components: [
          {
            template_id: panelTpl?._id,
            subtype_id: bifacialSub?._id || monoPercSub?._id,
            brand_id: waareeBrand,
            brand_ids: [waareeBrand],
            sku_id: waareePanelSku,
            quantity: 10
          },
          {
            template_id: inverterTpl?._id,
            subtype_id: stringInvSub?._id,
            brand_id: havellsBrand,
            brand_ids: [havellsBrand],
            sku_id: havells5kSku,
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
            template_ids: panelTpl ? [panelTpl._id] : [],
            subtype_ids: bifacialSub ? [bifacialSub._id] : []
          },
          {
            name: "Structure & Cabling Kit",
            brand_id: waareeBrand,
            brand_ids: [waareeBrand],
            quantity: 1,
            image: "https://images.unsplash.com/photo-1544724569-5f546fd6f2b5?w=400&auto=format&fit=crop&q=80",
            template_ids: inverterTpl ? [inverterTpl._id] : [],
            subtype_ids: stringInvSub ? [stringInvSub._id] : []
          }
        ],
        base_price_cached: 225000,
        selling_price_cached: 275000,
        is_custom: false,
        is_active: true
      }
    ];

    // 7. Insert or Update Kits in pc_comobo_kit collection
    const insertedResults = [];

    for (const kitData of KITS_TO_INSERT) {
      // Check if kit already exists with this name and country
      let existingKit = await ComboKit.findOne({
        name: kitData.name,
        country_id: countryId,
        deleted_at: null
      });

      if (existingKit) {
        console.log(`🔄 Updating existing kit: "${kitData.name}" (ID: ${existingKit._id})`);
        Object.assign(existingKit, kitData);
        await existingKit.save();
        insertedResults.push(existingKit);
      } else {
        console.log(`➕ Inserting new kit: "${kitData.name}"`);
        const newDoc = await ComboKit.create({
          ...kitData,
          country_id: countryId
        });
        insertedResults.push(newDoc);
      }
    }

    console.log(`\n🎉 SUCCESS! Inserted/Updated ${insertedResults.length} Combo Kits:`);
    insertedResults.forEach((k, idx) => {
      console.log(`  [${idx + 1}] ID: ${k._id} | Name: "${k.name}" | Capacity: ${k.capacity} kW | Selling Price: ₹${k.selling_price_cached}`);
    });

    process.exit(0);
  } catch (err) {
    console.error("❌ Error inserting combo kits:", err);
    process.exit(1);
  }
}

insertApprovedComboKits();
