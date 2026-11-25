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
} = require('../../models/core_db');
const { generateSkuCode } = require('../../controller/products.handler');

const shortCode = (str, len = 3) => {
  const cleaned = str?.replace(/[^a-zA-Z0-9]/g, "") || "";
  return cleaned.substring(0, len).toUpperCase();
};

const generateSkuCodeForSeeder = (productName, templateName, subtypeName, brandName, companyName, capacity, unitSymbol) => {
  const templatePart = shortCode(templateName, 3);
  const brandPart = shortCode(companyName || brandName, 5);
  const productPart = shortCode(productName, 4);
  const subtypePart = shortCode(subtypeName, 4);
  
  const rawSkuPart = `${capacity}${unitSymbol || ""}`;
  const finalSkuPart = rawSkuPart.replace(/[^a-zA-Z0-9.]/g, "").toUpperCase();
  
  return [templatePart, brandPart, productPart, subtypePart, finalSkuPart]
    .filter(Boolean).join("-");
};

const seedInvertersSpecs = async () => {
  console.log('🔌 Seeding and Auto-populating Inverter/Microinverter realistic products & attributes...');

  // 1. Find Inverter Template
  const inverterTemplate = await ProductTemplate.findOne({ name: 'Inverter', deleted_at: null });
  if (!inverterTemplate) {
    console.log('  ⚠️ Inverter template not found. Skipping inverter specs population.');
    return;
  }

  // 2. Find Inverter Subtypes
  const inverterSubtypes = await ProductSubtype.find({ template_id: inverterTemplate._id, deleted_at: null });
  const stringSubtype = inverterSubtypes.find(s => s.name === 'String');
  const microSubtype = inverterSubtypes.find(s => s.name === 'Micro');
  const hybridSubtype = inverterSubtypes.find(s => s.name === 'Hybrid');
  const inverterSubtypeIds = inverterSubtypes.map(s => s._id);

  // 3. Get Unit Groups and Units
  const powerUG = await UnitGroup.findOne({ name: /Power/i, deleted_at: null });
  const perfUG = await UnitGroup.findOne({ name: /Performance/i, deleted_at: null });
  const wattUnit = await Unit.findOne({ symbol: "W", deleted_at: null });
  const kwUnit = await Unit.findOne({ symbol: "kW", deleted_at: null });
  const percentUnit = await Unit.findOne({ symbol: "%", deleted_at: null });

  const wattUnitId = wattUnit?._id || null;
  const kwUnitId = kwUnit?._id || null;
  const percentUnitId = percentUnit?._id || null;

  const countUG = await UnitGroup.findOne({ name: /Count/i, deleted_at: null });
  const nosUnit = await Unit.findOne({ symbol: "nos", deleted_at: null });
  const nosUnitId = nosUnit?._id || null;

  let allOptions = await AttributeOption.find({ deleted_at: null });
  const getOptionId = (attrId, valText) => {
    const found = allOptions.find(o => String(o.attribute_id) === String(attrId) && String(o.value).toLowerCase().trim() === String(valText).toLowerCase().trim());
    return found ? found._id : null;
  };

  // Helper to ensure Subtype Attributes exist
  const getOrCreateAttribute = async (subtypeId, name, data_type, attr_type, unitGroupId) => {
    let attr = await SubtypeAttribute.findOne({ subtype_id: subtypeId, name: name, deleted_at: null });
    const isVar = attr_type === 'sku' || attr_type === 'phase' || attr_type === 'tolerance';
    if (!attr) {
      attr = await SubtypeAttribute.create({
        name: name,
        subtype_id: subtypeId,
        data_type: data_type,
        attribute_type: attr_type,
        unit_group_id: unitGroupId,
        is_required: true,
        is_variant: isVar,
        is_filterable: true,
        is_system: true
      });
      console.log(`  ✓ Attribute '${name}' created for subtype ID: ${subtypeId}`);
    } else {
      attr.attribute_type = attr_type;
      attr.data_type = data_type;
      attr.is_variant = isVar;
      if (unitGroupId) attr.unit_group_id = unitGroupId;
      await attr.save();
    }
    return attr;
  };

  // Helper to ensure Attribute Options exist
  const ensureAttributeOptions = async (attributeId, optionValues) => {
    for (let i = 0; i < optionValues.length; i++) {
      const val = optionValues[i];
      const exists = await AttributeOption.findOne({ attribute_id: attributeId, value: val, deleted_at: null });
      if (!exists) {
        await AttributeOption.create({
          attribute_id: attributeId,
          value: val,
          display_order: i + 1
        });
      }
    }
  };

  // 4. Create/Ensure Attributes and Options
  let stringCapAttr, stringPhaseAttr, stringTolAttr;
  if (stringSubtype) {
    stringCapAttr = await getOrCreateAttribute(stringSubtype._id, 'Power Rating', 'number', 'sku', powerUG?._id);
    stringPhaseAttr = await getOrCreateAttribute(stringSubtype._id, 'Phase', 'dropdown', 'phase', null);
    await ensureAttributeOptions(stringPhaseAttr._id, ['Single Phase', 'Three Phase']);
    stringTolAttr = await getOrCreateAttribute(stringSubtype._id, 'Tolerance', 'number', 'tolerance', perfUG?._id);
    await ensureAttributeOptions(stringTolAttr._id, ['5', '10', '15']);
  }

  let microCapAttr, microPhaseAttr, microMpptAttr, microStringsAttr, microTotalPvAttr, microMaxPanelAttr, microMinPanelAttr, microMaxDcAttr;
  if (microSubtype) {
    // 1. Rename existing attributes if they exist
    await SubtypeAttribute.updateOne(
      { subtype_id: microSubtype._id, name: 'Power Rating', deleted_at: null },
      { $set: { name: 'AC Capacity', attribute_type: 'sku', is_variant: true } }
    );
    await SubtypeAttribute.updateOne(
      { subtype_id: microSubtype._id, name: 'Connected Panels', deleted_at: null },
      { $set: { name: 'Total PV Inputs', attribute_type: 'sku', is_variant: true, data_type: 'number', unit_group_id: countUG?._id } }
    );
    await SubtypeAttribute.updateOne(
      { subtype_id: microSubtype._id, name: 'Maximum Input Watt', deleted_at: null },
      { $set: { name: 'Max Panel Power', attribute_type: 'sku', is_variant: true } }
    );
    await SubtypeAttribute.updateOne(
      { subtype_id: microSubtype._id, name: 'Max Panel Watt', deleted_at: null },
      { $set: { name: 'Max Panel Power', attribute_type: 'sku', is_variant: true } }
    );
    await SubtypeAttribute.updateOne(
      { subtype_id: microSubtype._id, name: 'Minimum Input Watt', deleted_at: null },
      { $set: { name: 'Min Panel Power', attribute_type: 'sku', is_variant: true } }
    );

    // Remove 'Tolerance' attribute for micro subtype
    const tolAttr = await SubtypeAttribute.findOne({ subtype_id: microSubtype._id, name: 'Tolerance', deleted_at: null });
    if (tolAttr) {
      await AttributeOption.deleteMany({ attribute_id: tolAttr._id });
      await ProductAttributeValue.deleteMany({ attribute_id: tolAttr._id });
      await SubtypeAttribute.deleteOne({ _id: tolAttr._id });
      console.log('  ✓ Removed Tolerance attribute from Micro subtype.');
    }

    // 2. Ensure attributes exist with correct properties
    microCapAttr = await getOrCreateAttribute(microSubtype._id, 'AC Capacity', 'number', 'sku', powerUG?._id);
    microPhaseAttr = await getOrCreateAttribute(microSubtype._id, 'Phase', 'dropdown', 'phase', null);
    await ensureAttributeOptions(microPhaseAttr._id, ['Single Phase']);

    microMpptAttr = await getOrCreateAttribute(microSubtype._id, 'MPPT Count', 'number', 'sku', countUG?._id);
    microStringsAttr = await getOrCreateAttribute(microSubtype._id, 'Strings per MPPT', 'number', 'sku', countUG?._id);
    microTotalPvAttr = await getOrCreateAttribute(microSubtype._id, 'Total PV Inputs', 'number', 'sku', countUG?._id);

    microMaxPanelAttr = await getOrCreateAttribute(microSubtype._id, 'Max Panel Power', 'number', 'sku', powerUG?._id);
    microMinPanelAttr = await getOrCreateAttribute(microSubtype._id, 'Min Panel Power', 'number', 'sku', powerUG?._id);
    microMaxDcAttr = await getOrCreateAttribute(microSubtype._id, 'Max DC Input Power', 'number', 'sku', powerUG?._id);

    // Reload options
    allOptions = await AttributeOption.find({ deleted_at: null });

    // 3. Migrate existing micro inverter SKUs and data
    const microProducts = await Product.find({ subtype_id: microSubtype._id, deleted_at: null });
    console.log(`  ⚙️ Migrating attribute values for ${microProducts.length} Micro inverter products...`);

    for (const p of microProducts) {
      const skus = await ProductSku.find({ product_id: p._id, deleted_at: null });
      for (const sku of skus) {
        let acCapVal = await ProductAttributeValue.findOne({ sku_id: sku._id, attribute_id: microCapAttr._id, deleted_at: null });
        let phaseVal = await ProductAttributeValue.findOne({ sku_id: sku._id, attribute_id: microPhaseAttr._id, deleted_at: null });
        let totalPvVal = await ProductAttributeValue.findOne({ sku_id: sku._id, attribute_id: microTotalPvAttr._id, deleted_at: null });
        let maxPanelWattVal = await ProductAttributeValue.findOne({ sku_id: sku._id, attribute_id: microMaxPanelAttr._id, deleted_at: null });
        let minPanelPowerVal = await ProductAttributeValue.findOne({ sku_id: sku._id, attribute_id: microMinPanelAttr._id, deleted_at: null });

        if (!phaseVal) {
          const optId = getOptionId(microPhaseAttr._id, 'Single Phase');
          phaseVal = await ProductAttributeValue.create({
            product_id: p._id, sku_id: sku._id, attribute_id: microPhaseAttr._id,
            value_text: 'Single Phase', value_option_id: optId
          });
        }

        let inputs = 1;
        if (totalPvVal) {
          const raw = String(totalPvVal.value_text || totalPvVal.value_number || '1');
          inputs = parseInt(raw) || 1;
        } else {
          const code = sku.sku_code.toLowerCase();
          if (code.includes('0.35kw')) inputs = 1;
          else if (code.includes('0.7kw')) inputs = 2;
          else if (code.includes('1.5kw') || code.includes('2kw')) inputs = 4;
        }

        // Always ensure ProductAttributeValue exists for Total PV Inputs as a number
        if (!totalPvVal) {
          totalPvVal = await ProductAttributeValue.create({
            product_id: p._id, sku_id: sku._id, attribute_id: microTotalPvAttr._id,
            value_number: inputs, unit_id: nosUnitId
          });
        } else {
          totalPvVal.value_number = inputs;
          totalPvVal.value_text = null;
          totalPvVal.value_option_id = null;
          totalPvVal.unit_id = nosUnitId;
          await totalPvVal.save();
        }

        let mpptCount = inputs;
        let stringsPerMppt = 1;

        let mpptCountVal = await ProductAttributeValue.findOne({ sku_id: sku._id, attribute_id: microMpptAttr._id, deleted_at: null });
        if (!mpptCountVal) {
          mpptCountVal = await ProductAttributeValue.create({
            product_id: p._id, sku_id: sku._id, attribute_id: microMpptAttr._id,
            value_number: mpptCount, unit_id: nosUnitId
          });
        } else {
          mpptCountVal.value_number = mpptCount;
          mpptCountVal.unit_id = nosUnitId;
          await mpptCountVal.save();
        }

        let stringsPerMpptVal = await ProductAttributeValue.findOne({ sku_id: sku._id, attribute_id: microStringsAttr._id, deleted_at: null });
        if (!stringsPerMpptVal) {
          stringsPerMpptVal = await ProductAttributeValue.create({
            product_id: p._id, sku_id: sku._id, attribute_id: microStringsAttr._id,
            value_number: stringsPerMppt, unit_id: nosUnitId
          });
        } else {
          stringsPerMpptVal.value_number = stringsPerMppt;
          stringsPerMpptVal.unit_id = nosUnitId;
          await stringsPerMpptVal.save();
        }

        const capKw = parseFloat(acCapVal?.value_number || 0.35);
        let maxDcPower = Math.round(capKw * 1000 * 1.35);

        let maxDcPowerVal = await ProductAttributeValue.findOne({ sku_id: sku._id, attribute_id: microMaxDcAttr._id, deleted_at: null });
        if (!maxDcPowerVal) {
          maxDcPowerVal = await ProductAttributeValue.create({
            product_id: p._id, sku_id: sku._id, attribute_id: microMaxDcAttr._id,
            value_number: maxDcPower, unit_id: wattUnitId
          });
        } else {
          maxDcPowerVal.value_number = maxDcPower;
          await maxDcPowerVal.save();
        }

        if (!maxPanelWattVal) {
          let maxPanelW = 470;
          if (capKw >= 1.5) maxPanelW = 550;
          maxPanelWattVal = await ProductAttributeValue.create({
            product_id: p._id, sku_id: sku._id, attribute_id: microMaxPanelAttr._id,
            value_number: maxPanelW, unit_id: wattUnitId
          });
        } else {
          // make sure maxPanelWattVal unit is wattUnitId
          maxPanelWattVal.unit_id = wattUnitId;
          await maxPanelWattVal.save();
        }

        if (!minPanelPowerVal) {
          let minPanelW = 240;
          if (capKw >= 1.5) minPanelW = 300;
          minPanelPowerVal = await ProductAttributeValue.create({
            product_id: p._id, sku_id: sku._id, attribute_id: microMinPanelAttr._id,
            value_number: minPanelW, unit_id: wattUnitId
          });
        } else {
          minPanelPowerVal.unit_id = wattUnitId;
          await minPanelPowerVal.save();
        }

        const attrsPayload = [
          { attribute_id: microCapAttr._id, value_number: capKw, unit_id: kwUnitId },
          { attribute_id: microPhaseAttr._id, value_text: 'Single Phase', value_option_id: phaseVal.value_option_id },
          { attribute_id: microMpptAttr._id, value_number: mpptCount, unit_id: nosUnitId },
          { attribute_id: microStringsAttr._id, value_number: stringsPerMppt, unit_id: nosUnitId },
          { attribute_id: microTotalPvAttr._id, value_number: inputs, unit_id: nosUnitId },
          { attribute_id: microMaxPanelAttr._id, value_number: maxPanelWattVal.value_number, unit_id: wattUnitId },
          { attribute_id: microMinPanelAttr._id, value_number: minPanelPowerVal.value_number, unit_id: wattUnitId },
          { attribute_id: microMaxDcAttr._id, value_number: maxDcPower, unit_id: wattUnitId }
        ];

        sku.attributes = attrsPayload.map(a => ({
          subtype_attribute_id: a.attribute_id,
          value_raw: a.value_number !== undefined ? String(a.value_number) : String(a.value_text),
          value_base_unit: a.value_number !== undefined ? a.value_number : 0,
          unit_id: a.unit_id
        }));

        try {
          const newSkuCode = await generateSkuCode(p._id, attrsPayload.map(a => ({
            attribute_id: a.attribute_id,
            value_number: a.value_number,
            value_text: a.value_text,
            value_option_id: a.value_option_id,
            unit_id: a.unit_id
          })), sku._id);
          if (newSkuCode && newSkuCode !== sku.sku_code) {
            console.log(`    Renaming SKU: ${sku.sku_code} -> ${newSkuCode}`);
            sku.sku_code = newSkuCode;
          }
        } catch (skuErr) {
          console.error(`    Failed to generate sku code: ${skuErr.message}`);
        }

        await sku.save();
      }
    }
  }

  let hybridCapAttr, hybridPhaseAttr, hybridTolAttr;
  if (hybridSubtype) {
    hybridCapAttr = await getOrCreateAttribute(hybridSubtype._id, 'Power Rating', 'number', 'sku', powerUG?._id);
    hybridPhaseAttr = await getOrCreateAttribute(hybridSubtype._id, 'Phase', 'dropdown', 'phase', null);
    await ensureAttributeOptions(hybridPhaseAttr._id, ['Single Phase', 'Three Phase']);
    hybridTolAttr = await getOrCreateAttribute(hybridSubtype._id, 'Tolerance', 'number', 'tolerance', perfUG?._id);
    await ensureAttributeOptions(hybridTolAttr._id, ['5', '10', '15']);
  }

  // Get all options for dropdowns to find value_option_id
  allOptions = await AttributeOption.find({ deleted_at: null });

  // 5. Retrieve Existing Brands
  const existingBrands = await Brand.find({ deleted_at: null });
  const brandMap = {};
  existingBrands.forEach(b => {
    brandMap[b.brand_name.toLowerCase().trim()] = b;
  });

  const growatt = brandMap['growatt'];
  const solis = brandMap['solis'];
  const sungrow = brandMap['sungrow'];
  const sofar = brandMap['sofar'];
  const luminous = brandMap['luminous'];
  const vsole = brandMap['vsole'];
  const microtek = brandMap['microtek'];

  // Check if we have at least some mapped brands
  if (!solis && !growatt && existingBrands.length === 0) {
    console.log('  ⚠️ No active brands found in the database. Seeding skipped.');
    return;
  }

  console.log(`  ✓ Retrieved ${existingBrands.length} existing brands from the database.`);

  // 5b. Retrieve all project subcategory types (scopes) to populate scope_ids
  const subcategoryTypes = await ProjectSubcategoryType.find({ deleted_at: null });
  const scopeIds = subcategoryTypes.map(t => t._id);
  console.log(`  ✓ Retrieved ${scopeIds.length} operational scope (subcategory type) IDs.`);

  // 6. Ensure Brand Mappings for Inverter Template & Subtypes
  const inverterBrands = [growatt, solis, sungrow, sofar, luminous, vsole, microtek].filter(Boolean);
  for (const b of inverterBrands) {
    await BrandTemplateMap.findOneAndUpdate(
      { brand_id: b._id, template_id: inverterTemplate._id },
      { brand_id: b._id, template_id: inverterTemplate._id },
      { upsert: true }
    );
  }

  const stringSubtypeBrands = [growatt, solis, sungrow, sofar, luminous, microtek].filter(Boolean);
  if (stringSubtype) {
    for (const b of stringSubtypeBrands) {
      await BrandSubtypeMap.findOneAndUpdate(
        { brand_id: b._id, subtype_id: stringSubtype._id },
        { brand_id: b._id, subtype_id: stringSubtype._id },
        { upsert: true }
      );
    }
  }

  const microSubtypeBrands = [vsole, growatt, solis].filter(Boolean);
  if (microSubtype) {
    for (const b of microSubtypeBrands) {
      await BrandSubtypeMap.findOneAndUpdate(
        { brand_id: b._id, subtype_id: microSubtype._id },
        { brand_id: b._id, subtype_id: microSubtype._id },
        { upsert: true }
      );
    }
  }

  const hybridSubtypeBrands = [growatt, solis, sungrow].filter(Boolean);
  if (hybridSubtype) {
    for (const b of hybridSubtypeBrands) {
      await BrandSubtypeMap.findOneAndUpdate(
        { brand_id: b._id, subtype_id: hybridSubtype._id },
        { brand_id: b._id, subtype_id: hybridSubtype._id },
        { upsert: true }
      );
    }
  }
  console.log('  ✓ Seeded Brand mappings to templates and subtypes using existing brands.');
  return;
};

module.exports = { seedInvertersSpecs };
