const {
  ProductTemplate,
  ProductSubtype,
  SubtypeAttribute,
  AttributeOption,
  Product,
  ProductSku,
  ProductAttributeValue,
  UnitGroup,
  Unit,
  Brand,
  BrandTemplateMap,
  BrandSubtypeMap,
  ProjectSubcategoryType
} = require('../models/core_db');
const { generateSkuCode } = require('../controller/products.handler');

const seedProducts = async () => {
  console.log('📦 Seeding realistic Products and SKUs for all templates...');

  // 1. Get Unit Groups & Units for lookup
  const units = await Unit.find({ deleted_at: null }).populate('unit_group_id');
  const findUnit = (symbol, groupName) => {
    return units.find(u => 
      String(u.symbol).toLowerCase().trim() === String(symbol).toLowerCase().trim() && 
      String(u.unit_group_id?.name).toLowerCase().trim() === String(groupName).toLowerCase().trim()
    );
  };

  const wattUnit = findUnit('W', 'Power');
  const kwUnit = findUnit('kW', 'Power');
  const voltUnit = findUnit('V', 'Voltage');
  const ampUnit = findUnit('A', 'Current');
  const kwhUnit = findUnit('kWh', 'Energy');
  const degreeUnit = findUnit('°', 'Angle');
  const percentUnit = findUnit('%', 'Performance');
  const kgUnit = findUnit('kg', 'Mass');
  const mmUnit = findUnit('mm', 'Length');
  const mUnit = findUnit('m', 'Length');
  const mm2Unit = findUnit('mm²', 'Dimensions');

  // 2. Get Brands
  const existingBrands = await Brand.find({ deleted_at: null });
  const brandMap = {};
  existingBrands.forEach(b => {
    brandMap[b.brand_name.toLowerCase().trim()] = b;
  });

  const getBrand = (name) => {
    const key = name.toLowerCase().trim();
    // Fallback to first brand if specific brand doesn't exist
    return brandMap[key] || existingBrands[0];
  };

  // 3. Get Subcategory Types (Operational Scopes)
  const subcategoryTypes = await ProjectSubcategoryType.find({ deleted_at: null });
  const scopeIds = subcategoryTypes.map(t => t._id);

  // Helper to ensure brand template & subtype maps are seeded
  const ensureBrandMappings = async (brandId, templateId, subtypeId) => {
    await BrandTemplateMap.findOneAndUpdate(
      { brand_id: brandId, template_id: templateId },
      { brand_id: brandId, template_id: templateId },
      { upsert: true }
    );
    await BrandSubtypeMap.findOneAndUpdate(
      { brand_id: brandId, subtype_id: subtypeId },
      { brand_id: brandId, subtype_id: subtypeId },
      { upsert: true }
    );
  };

  // Helper to upsert a product
  const getOrCreateProduct = async (templateId, subtypeId, brandId, name, desc) => {
    let product = await Product.findOne({
      template_id: templateId,
      subtype_id: subtypeId,
      brand_id: brandId,
      name: name,
      deleted_at: null
    });
    if (!product) {
      product = await Product.create({
        name: name,
        description: desc,
        features: ["High Reliability", "Premium Quality", "System Certified"],
        template_id: templateId,
        subtype_id: subtypeId,
        brand_id: brandId,
        scope_ids: scopeIds.slice(0, 3), // map first 3 scopes
        sku_config: { template_len: 3, brand_len: 5, product_len: 4, subtype_len: 4 }
      });
      console.log(`  ✓ Product Created: "${name}"`);
    }
    return product;
  };

  // Helper to upsert SKU attribute values in pc_attribute_values
  const upsertAttributeValue = async (productId, skuId, attributeId, valueData, unitId = null) => {
    const query = { product_id: productId, attribute_id: attributeId };
    if (skuId) query.sku_id = skuId;
    else query.sku_id = null;

    const data = {
      product_id: productId,
      sku_id: skuId,
      attribute_id: attributeId,
      value_text: valueData.value_text || null,
      value_number: valueData.value_number !== undefined ? valueData.value_number : null,
      value_boolean: valueData.value_boolean !== undefined ? valueData.value_boolean : null,
      value_option_id: valueData.value_option_id || null,
      unit_id: unitId,
      deleted_at: null
    };

    await ProductAttributeValue.findOneAndUpdate(query, data, { upsert: true });
  };

  // Main configuration array for all 25 templates (excluding Inverter)
  const seedingConfigs = [
    {
      templateName: "Solar Panel",
      brands: ["Adani Solar", "Waaree Energies", "Tata Power"],
      subtypes: ["Mono PERC", "Bifacial", "TOPCon", "HJT", "Poly"],
      skuAttribute: { name: "Pmax", unit: wattUnit, values: [300, 400, 550, 600] },
      otherSkuAttrs: [
        { name: "Voc", unit: voltUnit, valueFn: (v) => ({ value_number: parseFloat((v * 0.12).toFixed(2)) }) },
        { name: "Isc", unit: ampUnit, valueFn: (v) => ({ value_number: parseFloat((v / (v * 0.12) * 1.1).toFixed(2)) }) },
        { name: "Vmp", unit: voltUnit, valueFn: (v) => ({ value_number: parseFloat((v * 0.10).toFixed(2)) }) },
        { name: "Imp", unit: ampUnit, valueFn: (v) => ({ value_number: parseFloat((v / (v * 0.10) * 0.95).toFixed(2)) }) },
        { name: "Efficiency", unit: percentUnit, valueFn: (v) => ({ value_number: parseFloat((19 + v / 200).toFixed(2)) }) }
      ],
      productAttrs: [
        { name: "Cell Type", val: { value_text: "Mono Crystalline" } },
        { name: "Cell Count", val: { value_number: 144 } },
        { name: "Module Dimensions", val: { value_text: "2278 x 1134 x 35 mm" } },
        { name: "Weight", unit: kgUnit, val: { value_number: 28 } },
        { name: "Glass Type", val: { value_text: "Dual Glass AR Coated" } },
        { name: "Frame Material", val: { value_text: "Anodized Aluminium" } },
        { name: "Operating Temperature", val: { value_text: "-40°C to +85°C" } }
      ]
    },
    {
      templateName: "Battery",
      brands: ["Luminous", "Exide", "Amaron"],
      subtypes: ["Lithium-Ion", "Lead Acid", "LFP"],
      skuAttribute: { name: "Capacity", unit: kwhUnit, values: [2.4, 5, 10, 15] },
      otherSkuAttrs: [
        { name: "Nominal Voltage", unit: voltUnit, valueFn: (v) => ({ value_number: v > 5 ? 48 : 24 }) },
        { name: "Charge Current", unit: ampUnit, valueFn: (v) => ({ value_number: v * 10 }) },
        { name: "Discharge Current", unit: ampUnit, valueFn: (v) => ({ value_number: v * 15 }) }
      ],
      productAttrs: [
        { name: "Cycle Life", val: { value_number: 6000 } },
        { name: "DoD", unit: percentUnit, val: { value_number: 90 } },
        { name: "Weight", unit: kgUnit, val: { value_number: 65 } },
        { name: "Dimensions", val: { value_text: "442 x 420 x 132 mm" } },
        { name: "IP Rating", val: { value_text: "IP20" } }
      ]
    },
    {
      templateName: "ACDB",
      brands: ["L&T", "Schneider Electric"],
      subtypes: ["Single Phase", "Three Phase"],
      skuAttribute: { name: "Current Rating", unit: ampUnit, values: [32, 40, 63, 100] },
      otherSkuAttrs: [
        { name: "Outgoing Feeders", valueFn: (v) => ({ value_number: v > 50 ? 4 : 2 }) }
      ],
      productAttrs: [
        { name: "SPD Type", val: { value_text: "Class II" } },
        { name: "Enclosure Material", val: { value_text: "Polycarbonate" } },
        { name: "IP Rating", val: { value_text: "IP65" } },
        { name: "Busbar Material", val: { value_text: "Copper" } }
      ]
    },
    {
      templateName: "DCDB",
      brands: ["L&T", "Schneider Electric"],
      subtypes: ["1 String", "2 String", "4 String", "6 String", "8 String"],
      skuAttribute: { name: "String Current", unit: ampUnit, values: [15, 20, 30] },
      otherSkuAttrs: [
        { name: "Max DC Voltage", unit: voltUnit, valueFn: (v) => ({ value_number: 1000 }) }
      ],
      productAttrs: [
        { name: "SPD Type", val: { value_text: "Type 2 DC" } },
        { name: "Fuse Type", val: { value_text: "gPV Cylindrical" } },
        { name: "IP Rating", val: { value_text: "IP65" } },
        { name: "Enclosure Material", val: { value_text: "ABS Plastic" } }
      ]
    },
    {
      templateName: "Cable",
      brands: ["Polycab", "Finolex"],
      subtypes: ["DC Cable", "AC Cable", "Earthing Cable"],
      skuAttribute: { name: "Cross Section", unit: mm2Unit, values: [2.5, 4, 6, 10, 16] },
      otherSkuAttrs: [
        { name: "Core Count", valueFn: (v) => ({ value_number: 1 }) }
      ],
      productAttrs: [
        { name: "Voltage Rating", unit: voltUnit, val: { value_number: 1500 } },
        { name: "Insulation Type", val: { value_text: "XLPE" } },
        { name: "Conductor Material", val: { value_text: "Tinned Copper" } },
        { name: "Temperature Rating", val: { value_text: "120°C" } }
      ]
    },
    {
      templateName: "Charge Controller",
      brands: ["Luminous", "Microtek"],
      subtypes: ["PWM", "MPPT"],
      skuAttribute: { name: "Current Rating", unit: ampUnit, values: [10, 20, 30, 40] },
      otherSkuAttrs: [
        { name: "Max PV Voltage", unit: voltUnit, valueFn: (v) => ({ value_number: v * 3 }) }
      ],
      productAttrs: [
        { name: "Battery Voltage", unit: voltUnit, val: { value_number: 12 } },
        { name: "Efficiency", unit: percentUnit, val: { value_number: 98 } },
        { name: "Protection Features", val: { value_text: "Overcharge, Reverse Polarity" } }
      ]
    },
    {
      templateName: "Mounting Structure",
      brands: ["L&T", "Tata Power"],
      subtypes: ["RCC Roof", "Metal Roof", "Ground Mount", "Carport"],
      skuAttribute: { name: "Panel Capacity", values: [2, 4, 6, 8, 10] },
      otherSkuAttrs: [
        { name: "Rail Length", unit: mUnit, valueFn: (v) => ({ value_number: v * 1.1 }) }
      ],
      productAttrs: [
        { name: "Material", val: { value_text: "Galvanized Steel" } },
        { name: "Coating Type", val: { value_text: "Hot Dip Galvanized" } },
        { name: "Wind Load", val: { value_number: 150 } },
        { name: "Tilt Angle", unit: degreeUnit, val: { value_number: 15 } }
      ]
    },
    {
      templateName: "Earthing Rod",
      brands: ["L&T", "Tata Power"],
      subtypes: ["Copper Bonded", "GI Rod", "Pure Copper"],
      skuAttribute: { name: "Length", unit: mUnit, values: [1, 1.5, 2, 3] },
      otherSkuAttrs: [
        { name: "Diameter", unit: mmUnit, valueFn: (v) => ({ value_number: 17.2 }) }
      ],
      productAttrs: [
        { name: "Material", val: { value_text: "Copper Bonded Steel" } },
        { name: "Coating Thickness", val: { value_number: 250 } },
        { name: "Standard", val: { value_text: "UL 467" } }
      ]
    },
    {
      templateName: "Earthing Pit",
      brands: ["L&T", "Tata Power"],
      subtypes: ["Chemical Earthing", "Maintenance Free"],
      skuAttribute: { name: "Electrode Length", unit: mUnit, values: [1, 1.5, 2, 3] },
      otherSkuAttrs: [],
      productAttrs: [
        { name: "Backfill Compound", val: { value_text: "Bentonite Compound" } },
        { name: "Resistance Value", val: { value_number: 2 } },
        { name: "Pit Size", val: { value_text: "300 x 300 mm" } }
      ]
    },
    {
      templateName: "Lightning Arrester",
      brands: ["L&T", "ABB"],
      subtypes: ["ESE Type", "Franklin Rod"],
      skuAttribute: { name: "Protection Radius", unit: mUnit, values: [45, 60, 79, 107] },
      otherSkuAttrs: [
        { name: "Height", unit: mUnit, valueFn: (v) => ({ value_number: 2 }) }
      ],
      productAttrs: [
        { name: "Material", val: { value_text: "Stainless Steel" } },
        { name: "Response Time", val: { value_number: 15 } },
        { name: "Standard", val: { value_text: "NFC 17-102" } }
      ]
    },
    {
      templateName: "Junction Box",
      brands: ["Polycab", "Havells"],
      subtypes: ["MC4", "MC4-EVO2", "Tyco"],
      skuAttribute: { name: "Max DC Current", unit: ampUnit, values: [20, 30, 45, 60] },
      otherSkuAttrs: [
        { name: "Max DC Voltage", unit: voltUnit, valueFn: (v) => ({ value_number: 1000 }) },
        { name: "Inputs", valueFn: (v) => ({ value_number: 2 }) },
        { name: "Outputs", valueFn: (v) => ({ value_number: 2 }) }
      ],
      productAttrs: [
        { name: "IP Rating", val: { value_text: "IP67" } },
        { name: "Cable Cross Section", unit: mm2Unit, val: { value_number: 4 } },
        { name: "Material", val: { value_text: "PPO Plastic" } },
        { name: "Mounting Type", val: { value_text: "Surface Wall Mount" } }
      ]
    },
    {
      templateName: "MC4 Connector",
      brands: ["Polycab", "KEI"],
      subtypes: ["Standard MC4", "T-Branch MC4", "Y-Branch MC4"],
      skuAttribute: { name: "Current Rating", unit: ampUnit, values: [30, 45, 50] },
      otherSkuAttrs: [
        { name: "Voltage Rating", unit: voltUnit, valueFn: (v) => ({ value_number: 1500 }) }
      ],
      productAttrs: [
        { name: "IP Rating", val: { value_text: "IP68" } },
        { name: "Contact Material", val: { value_text: "Copper, Tin Plated" } },
        { name: "Temperature Rating", val: { value_text: "85°C" } }
      ]
    },
    {
      templateName: "Surge Protection Device",
      brands: ["Schneider Electric", "ABB"],
      subtypes: ["AC SPD", "DC SPD"],
      skuAttribute: { name: "Voltage Rating", unit: voltUnit, values: [275, 600, 1000, 1500] },
      otherSkuAttrs: [
        { name: "Discharge Current", unit: ampUnit, valueFn: (v) => ({ value_number: 40000 }) }
      ],
      productAttrs: [
        { name: "Protection Level", val: { value_text: "Up < 2.0 kV" } },
        { name: "Pole Count", val: { value_number: 2 } },
        { name: "Response Time", val: { value_number: 25 } }
      ]
    },
    {
      templateName: "Net Meter",
      brands: ["L&T", "Schneider Electric"],
      subtypes: ["Single Phase", "Three Phase"],
      skuAttribute: { name: "Current Rating", unit: ampUnit, values: [32, 63, 100] },
      otherSkuAttrs: [
        { name: "Voltage Rating", unit: voltUnit, valueFn: (v) => ({ value_number: v > 50 ? 415 : 230 }) }
      ],
      productAttrs: [
        { name: "Accuracy Class", val: { value_text: "Class 1.0" } },
        { name: "Communication Protocol", val: { value_text: "RS485 Modbus" } }
      ]
    },
    {
      templateName: "Wire",
      brands: ["Polycab", "Finolex"],
      subtypes: ["Copper Wire", "Aluminium Wire"],
      skuAttribute: { name: "Cross Section", unit: mm2Unit, values: [1.5, 2.5, 4, 6, 10] },
      otherSkuAttrs: [
        { name: "Core Count", valueFn: (v) => ({ value_number: 1 }) }
      ],
      productAttrs: [
        { name: "Insulation Type", val: { value_text: "FR PVC" } },
        { name: "Voltage Rating", unit: voltUnit, val: { value_number: 1100 } },
        { name: "Temperature Rating", val: { value_text: "70°C" } }
      ]
    },
    {
      templateName: "Conduit Pipe",
      brands: ["Polycab", "Finolex"],
      subtypes: ["GI Conduit", "PVC Conduit"],
      skuAttribute: { name: "Diameter", unit: mmUnit, values: [20, 25, 32, 40] },
      otherSkuAttrs: [
        { name: "Thickness", unit: mmUnit, valueFn: (v) => ({ value_number: 1.5 }) }
      ],
      productAttrs: [
        { name: "Material Grade", val: { value_text: "Medium Class GI" } },
        { name: "Length", unit: mUnit, val: { value_number: 3 } },
        { name: "UV Resistance", val: { value_boolean: true } }
      ]
    },
    {
      templateName: "Cable Tray",
      brands: ["L&T", "Tata Power"],
      subtypes: ["Perforated", "Ladder Type"],
      skuAttribute: { name: "Width", unit: mmUnit, values: [100, 200, 300] },
      otherSkuAttrs: [
        { name: "Thickness", unit: mmUnit, valueFn: (v) => ({ value_number: 2.0 }) }
      ],
      productAttrs: [
        { name: "Material", val: { value_text: "Pre-Galvanized Steel" } },
        { name: "Finish", val: { value_text: "Zinc Plated" } },
        { name: "Load Capacity", val: { value_text: "75 kg/m" } }
      ]
    },
    {
      templateName: "Rail",
      brands: ["L&T", "Tata Power"],
      subtypes: ["Aluminium Rail", "GI Rail"],
      skuAttribute: { name: "Length", unit: mUnit, values: [2, 3, 4, 6] },
      otherSkuAttrs: [],
      productAttrs: [
        { name: "Material Grade", val: { value_text: "AL6005-T5" } },
        { name: "Surface Finish", val: { value_text: "Anodized" } }
      ]
    },
    {
      templateName: "Clamp",
      brands: ["L&T", "Tata Power"],
      subtypes: ["Mid Clamp", "End Clamp"],
      skuAttribute: { name: "Panel Thickness", unit: mmUnit, values: [30, 35, 40, 45] },
      otherSkuAttrs: [],
      productAttrs: [
        { name: "Material", val: { value_text: "Aluminium AL6005" } },
        { name: "Finish", val: { value_text: "Natural Anodized" } }
      ]
    },
    {
      templateName: "Isolator",
      brands: ["Schneider Electric", "ABB"],
      subtypes: ["AC Isolator", "DC Isolator"],
      skuAttribute: { name: "Current Rating", unit: ampUnit, values: [16, 25, 32, 63] },
      otherSkuAttrs: [
        { name: "Voltage Rating", unit: voltUnit, valueFn: (v) => ({ value_number: v > 30 ? 1000 : 415 }) }
      ],
      productAttrs: [
        { name: "Pole Count", val: { value_number: 4 } },
        { name: "IP Rating", val: { value_text: "IP66" } }
      ]
    },
    {
      templateName: "MCB",
      brands: ["Havells", "Schneider Electric"],
      subtypes: ["SP", "DP", "TP", "TPN", "FP"],
      skuAttribute: { name: "Current Rating", unit: ampUnit, values: [6, 10, 16, 32, 63] },
      otherSkuAttrs: [
        { name: "Breaking Capacity", valueFn: (v) => ({ value_text: "10 kA" }) }
      ],
      productAttrs: [
        { name: "Curve Type", val: { value_text: "C Curve" } },
        { name: "Pole Count", val: { value_number: 1 } }
      ]
    },
    {
      templateName: "MCCB",
      brands: ["Havells", "Schneider Electric"],
      subtypes: ["3 Pole", "4 Pole"],
      skuAttribute: { name: "Current Rating", unit: ampUnit, values: [63, 100, 160, 250] },
      otherSkuAttrs: [
        { name: "Breaking Capacity", valueFn: (v) => ({ value_text: "25 kA" }) }
      ],
      productAttrs: [
        { name: "Adjustable Trip", val: { value_text: "0.8 - 1.0 x In" } },
        { name: "Pole Count", val: { value_number: 3 } }
      ]
    },
    {
      templateName: "Changeover Switch",
      brands: ["Havells", "Schneider Electric"],
      subtypes: ["Manual", "Automatic"],
      skuAttribute: { name: "Current Rating", unit: ampUnit, values: [32, 63, 100] },
      otherSkuAttrs: [],
      productAttrs: [
        { name: "Pole Count", val: { value_number: 4 } },
        { name: "Operation Type", val: { value_text: "Motorized / Manual handle" } }
      ]
    },
    {
      templateName: "Distribution Board",
      brands: ["Havells", "Schneider Electric"],
      subtypes: ["SPN", "TPN"],
      skuAttribute: { name: "Way Count", values: [4, 8, 12, 16] },
      otherSkuAttrs: [],
      productAttrs: [
        { name: "Enclosure Material", val: { value_text: "CRCA Sheet Steel" } },
        { name: "IP Rating", val: { value_text: "IP43" } }
      ]
    },
    {
      templateName: "Screw & Fastener",
      brands: ["L&T", "ABB"],
      subtypes: ["Hex Bolt", "Self-Tapping Screw", "Nut & Bolt"],
      skuAttribute: { name: "Size", values: ["M6", "M8", "M10", "M12"] },
      otherSkuAttrs: [
        { name: "Length", unit: mmUnit, valueFn: (v) => ({ value_number: 25 }) }
      ],
      productAttrs: [
        { name: "Material", val: { value_text: "Stainless Steel A2-70" } },
        { name: "Coating", val: { value_text: "Passivated" } },
        { name: "Thread Type", val: { value_text: "Full Thread metric" } }
      ]
    }
  ];

  for (const config of seedingConfigs) {
    const template = await ProductTemplate.findOne({ name: config.templateName, deleted_at: null });
    if (!template) {
      console.log(`  ⚠️ Template not found: "${config.templateName}". Skipping.`);
      continue;
    }

    console.log(`🚀 Seeding Products and SKUs for template: "${config.templateName}"...`);

    const subtypesInDb = await ProductSubtype.find({ template_id: template._id, deleted_at: null });

    for (const subName of config.subtypes) {
      const subtype = subtypesInDb.find(s => s.name === subName);
      if (!subtype) {
        console.log(`    ⚠️ Subtype "${subName}" not found. Skipping.`);
        continue;
      }

      // Resolve attributes schema for this subtype
      const attrsInDb = await SubtypeAttribute.find({ subtype_id: subtype._id, deleted_at: null });
      const skuAttrDoc = attrsInDb.find(a => a.name === config.skuAttribute.name);

      if (!skuAttrDoc) {
        console.log(`    ⚠️ SKU attribute "${config.skuAttribute.name}" not found for "${subName}". Skipping.`);
        continue;
      }

      // Loop through brands
      for (const brandName of config.brands) {
        const brand = getBrand(brandName);
        if (!brand) continue;

        // Ensure brand mappings exist
        await ensureBrandMappings(brand._id, template._id, subtype._id);

        // Product Name: e.g. "Adani Solar Mono PERC Panel"
        const productName = `${brand.brand_name} ${subName} ${template.name}`;
        const productDesc = `Premium quality ${productName} engineered for maximum performance and efficiency.`;

        const product = await getOrCreateProduct(template._id, subtype._id, brand._id, productName, productDesc);

        // Seed product-level attributes
        for (const pAttrConfig of config.productAttrs) {
          const attrDoc = attrsInDb.find(a => a.name === pAttrConfig.name);
          if (attrDoc) {
            let unitId = null;
            if (pAttrConfig.unit) unitId = pAttrConfig.unit._id;
            await upsertAttributeValue(product._id, null, attrDoc._id, pAttrConfig.val, unitId);
          }
        }

        // Loop through variant values to create SKUs
        for (const skuVal of config.skuAttribute.values) {
          // Prepare attributes payload for this SKU
          const attrsPayload = [];

          // 1. Primary SKU attribute
          let skuAttrValData = {};
          if (skuAttrDoc.data_type === 'number') {
            skuAttrValData.value_number = parseFloat(skuVal);
          } else {
            skuAttrValData.value_text = String(skuVal);
          }
          attrsPayload.push({
            attribute_id: skuAttrDoc._id,
            ...skuAttrValData,
            unit_id: config.skuAttribute.unit ? config.skuAttribute.unit._id : null
          });

          // 2. Other variant-specific attributes
          for (const otherAttr of config.otherSkuAttrs) {
            const attrDoc = attrsInDb.find(a => a.name === otherAttr.name);
            if (attrDoc) {
              const valData = otherAttr.valueFn(skuVal);
              attrsPayload.push({
                attribute_id: attrDoc._id,
                ...valData,
                unit_id: otherAttr.unit ? otherAttr.unit._id : null
              });
            }
          }

          // Generate target SKU code
          let finalSkuCode = "";
          let existingSkuId = null;

          // Check if SKU exists already by matching attributes
          const existingSku = await ProductSku.findOne({
            product_id: product._id,
            'attributes.subtype_attribute_id': skuAttrDoc._id,
            'attributes.value_raw': String(skuVal),
            deleted_at: null
          });

          if (existingSku) {
            existingSkuId = existingSku._id;
          }

          try {
            // Generate the code (safe from duplicate throw if existingSkuId is provided)
            finalSkuCode = await generateSkuCode(product._id, attrsPayload, existingSkuId);
          } catch (err) {
            // Fallback: If it still throws duplicate SKU error, generate a randomized/stabilized code
            console.log(`    ⚠️ generateSkuCode error: ${err.message}. Using fallback formatting.`);
            const templatePart = String(template.name).substring(0, 3).toUpperCase();
            const brandPart = String(brand.brand_name).substring(0, 5).toUpperCase();
            const productPart = String(product.name).replace(/\s/g, '').substring(0, 4).toUpperCase();
            const subtypePart = String(subtype.name).replace(/\s/g, '').substring(0, 4).toUpperCase();
            finalSkuCode = `${templatePart}-${brandPart}-${productPart}-${subtypePart}-${String(skuVal).toUpperCase()}`;
          }

          // Create or update ProductSku record
          const skuData = {
            product_id: product._id,
            sku_code: finalSkuCode,
            attributes: attrsPayload.map(a => ({
              subtype_attribute_id: a.attribute_id,
              value_raw: a.value_number !== undefined ? String(a.value_number) : String(a.value_text),
              value_base_unit: a.value_number !== undefined ? a.value_number : 0,
              unit_id: a.unit_id
            })),
            deleted_at: null
          };

          const skuDoc = await ProductSku.findOneAndUpdate(
            { sku_code: finalSkuCode },
            skuData,
            { upsert: true, new: true }
          );

          // Seed variant attribute values in pc_attribute_values
          for (const attrVal of attrsPayload) {
            await upsertAttributeValue(product._id, skuDoc._id, attrVal.attribute_id, {
              value_text: attrVal.value_text,
              value_number: attrVal.value_number,
              value_boolean: attrVal.value_boolean
            }, attrVal.unit_id);
          }
        }
      }
    }
  }

  console.log('✅ Seeding realistic Products and SKUs completed.');
};

module.exports = { seedProducts };
