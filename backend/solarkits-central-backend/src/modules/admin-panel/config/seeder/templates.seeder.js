const {
  ProductTemplate,
  UnitGroup,
  Unit,
  ProductSubtype,
  SubtypeAttribute,
  AttributeOption,
  SubtypeAttributeGroup,
  Product,
  BrandSubtypeMap,
  ProductAttributeValue,
  ProjectSubcategoryType,
  SubtypeScopeMap
} = require('../../models/core_db');
const productTemplatesSeed = require('../seed_data/product_templates.seed.json');

// Map short group keys from JSON to display names
const GROUP_DISPLAY_NAMES = {
  'Electrical': 'Electrical Specifications',
  'Technical': 'Technical Specifications'
};

const seedTemplates = async () => {
  console.log('📦 Seeding System Product Templates, Subtypes, and Attributes...');

  // 1. Seed/Update System Product Templates
  for (const tSpec of productTemplatesSeed.templates) {
    // Resolve qty_unit_id at template level
    let tQtyUnitId = null;
    if (tSpec.qty_unitGroupName && tSpec.qty_unitName) {
      const tQtyUG = await UnitGroup.findOne({ name: tSpec.qty_unitGroupName });
      if (tQtyUG) {
        const tQtyUnit = await Unit.findOne({ name: tSpec.qty_unitName, unit_group_id: tQtyUG._id });
        tQtyUnitId = tQtyUnit?._id || null;
      }
    }

    let template = await ProductTemplate.findOne({ name: { $regex: new RegExp(`^${tSpec.name}$`, 'i') } });
    if (template) {
      const updates = {};
      if (!template.is_system) updates.is_system = true;
      if (tQtyUnitId && String(template.qty_unit_id) !== String(tQtyUnitId)) updates.qty_unit_id = tQtyUnitId;
      if (Object.keys(updates).length) {
        await ProductTemplate.updateOne({ _id: template._id }, { $set: updates });
        console.log(`  ✓ System Template '${tSpec.name}' updated.`);
      }
    } else {
      template = await ProductTemplate.create({
        name: tSpec.name,
        is_system: true,
        qty_unit_id: tQtyUnitId
      });
      console.log(`  ✓ System Template '${tSpec.name}' seeded.`);
    }
  }

  // 2. Seed Subtypes and Subtype Attributes
  for (const tSpec of productTemplatesSeed.templates) {
    const template = await ProductTemplate.findOne({ name: { $regex: new RegExp(`^${tSpec.name}$`, 'i') }, deleted_at: null });
    if (!template) continue;

    const allSubtypes = tSpec.subtypes || [];
    for (const st of allSubtypes) {
      const attrList = (Array.isArray(st.attributes) && st.attributes.length > 0)
        ? st.attributes
        : (tSpec.shared_attributes || []);

      const existingSubtypes = await ProductSubtype.find({ template_id: template._id, name: st.name, deleted_at: null }).sort({ _id: 1 });
      let subtype = existingSubtypes[0] || null;
      if (existingSubtypes.length > 1) {
        for (let i = 1; i < existingSubtypes.length; i++) {
          const dupId = existingSubtypes[i]._id;
          await Product.updateMany({ subtype_id: dupId }, { $set: { subtype_id: subtype._id } });
          
          const maps = await BrandSubtypeMap.find({ subtype_id: dupId });
          for (const map of maps) {
            const exists = await BrandSubtypeMap.findOne({ brand_id: map.brand_id, subtype_id: subtype._id });
            if (!exists) {
              await BrandSubtypeMap.create({ brand_id: map.brand_id, subtype_id: subtype._id });
            }
            await BrandSubtypeMap.deleteOne({ _id: map._id });
          }
          
          const dupAttrs = await SubtypeAttribute.find({ subtype_id: dupId, deleted_at: null });
          for (const dupAttr of dupAttrs) {
            const existsAttr = await SubtypeAttribute.findOne({ subtype_id: subtype._id, name: dupAttr.name, deleted_at: null });
            if (existsAttr) {
              await ProductAttributeValue.updateMany({ attribute_id: dupAttr._id }, { $set: { attribute_id: existsAttr._id } });
              await AttributeOption.deleteMany({ attribute_id: dupAttr._id });
              await SubtypeAttribute.deleteOne({ _id: dupAttr._id });
            } else {
              dupAttr.subtype_id = subtype._id;
              await dupAttr.save();
            }
          }
          
          await ProductSubtype.deleteOne({ _id: dupId });
          console.log(`  🧹 Merged and removed duplicate subtype '${st.name}' under template '${tSpec.name}'.`);
        }
      }

      if (!subtype) {
        subtype = await ProductSubtype.create({ template_id: template._id, name: st.name, is_system: true });
        console.log(`  ✓ Subtype '${st.name}' created under '${tSpec.name}'.`);
      } else {
        const updates = {};
        if (!subtype.is_system) updates.is_system = true;
        if (Object.keys(updates).length > 0) {
          await ProductSubtype.updateOne({ _id: subtype._id }, { $set: updates });
        }
      }

      // Automatically map subtype to Project Mappings (scopes)
      const subcategoryTypes = await ProjectSubcategoryType.find({ deleted_at: null });
      for (const scope of subcategoryTypes) {
        const existsMap = await SubtypeScopeMap.findOne({
          subtype: subtype._id,
          subcategory_type: scope._id
        });
        if (!existsMap) {
          await SubtypeScopeMap.create({
            subtype: subtype._id,
            subcategory_type: scope._id
          });
        }
      }

      for (const attrSpec of attrList) {
        const groupDisplayName = GROUP_DISPLAY_NAMES[attrSpec.group] || attrSpec.group || null;

        let unitGroupId = null;
        if (attrSpec.unitGroupName) {
          const ug = await UnitGroup.findOne({ name: attrSpec.unitGroupName });
          unitGroupId = ug?._id || null;
        }

        let groupId = null;
        if (groupDisplayName) {
          let group = await SubtypeAttributeGroup.findOne({ subtype_id: subtype._id, name: groupDisplayName, deleted_at: null });
          if (!group) {
            group = await SubtypeAttributeGroup.create({
              name: groupDisplayName, subtype_id: subtype._id,
              display_order: attrSpec.group === 'Electrical' ? 1 : 2
            });
            console.log(`  ✓ Group '${groupDisplayName}' created for '${st.name}'.`);
          }
          groupId = group._id;
        }

        const existingAttrs = await SubtypeAttribute.find({ subtype_id: subtype._id, name: attrSpec.name, deleted_at: null }).sort({ _id: 1 });
        let existingAttr = existingAttrs[0] || null;
        if (existingAttrs.length > 1) {
          for (let i = 1; i < existingAttrs.length; i++) {
            await AttributeOption.deleteMany({ attribute_id: existingAttrs[i]._id });
            await SubtypeAttribute.deleteOne({ _id: existingAttrs[i]._id });
            console.log(`  🧹 Removed duplicate active attribute '${attrSpec.name}' from subtype '${st.name}'.`);
          }
        }

        if (!existingAttr) {
          existingAttr = await SubtypeAttribute.create({
            name: attrSpec.name, subtype_id: subtype._id, group_id: groupId,
            attribute_type: attrSpec.attribute_type, data_type: attrSpec.data_type,
            is_required: attrSpec.is_required, is_variant: attrSpec.is_variant,
            is_filterable: attrSpec.is_filterable, is_system: attrSpec.is_system,
            unit_group_id: unitGroupId
          });
          console.log(`  ✓ Attribute '${attrSpec.name}' added to '${st.name}'.`);
        } else {
          await SubtypeAttribute.updateOne({ _id: existingAttr._id }, {
            $set: {
              is_system: attrSpec.is_system,
              group_id: groupId || existingAttr.group_id,
              attribute_type: attrSpec.attribute_type,
              data_type: attrSpec.data_type,
              is_required: attrSpec.is_required,
              is_variant: attrSpec.is_variant,
              is_filterable: attrSpec.is_filterable,
              unit_group_id: unitGroupId
            }
          });
        }

        if (attrSpec.options && attrSpec.options.length > 0) {
          for (let idx = 0; idx < attrSpec.options.length; idx++) {
            const optVal = attrSpec.options[idx];
            const existsOpt = await AttributeOption.findOne({ attribute_id: existingAttr._id, value: optVal, deleted_at: null });
            if (!existsOpt) {
              await AttributeOption.create({ attribute_id: existingAttr._id, value: optVal, display_order: idx + 1 });
            }
          }
          // Delete any option values that are no longer part of the seed JSON specification
          await AttributeOption.deleteMany({ attribute_id: existingAttr._id, value: { $nin: attrSpec.options } });
        } else {
          // If no options are specified (e.g. converted to number field), remove all legacy options
          await AttributeOption.deleteMany({ attribute_id: existingAttr._id });
        }
      } // end for attrSpec

      // Clean up legacy system attributes for this subtype
      const seededAttrNames = attrList.map(a => a.name);
      const legacyAttrs = await SubtypeAttribute.find({
        subtype_id: subtype._id,
        is_system: true,
        name: { $nin: seededAttrNames },
        deleted_at: null
      });
      for (const attr of legacyAttrs) {
        await AttributeOption.deleteMany({ attribute_id: attr._id });
        await SubtypeAttribute.deleteOne({ _id: attr._id });
        console.log(`  🗑️ Removed legacy system attribute '${attr.name}' from subtype '${st.name}'.`);
      }
    } // end for st

    // Clean up legacy system subtypes for this template
    const seededSubtypeNames = allSubtypes.map(s => s.name);
    const legacySubtypes = await ProductSubtype.find({
      template_id: template._id,
      is_system: true,
      name: { $nin: seededSubtypeNames },
      deleted_at: null
    });
    for (const sub of legacySubtypes) {
      const attrs = await SubtypeAttribute.find({ subtype_id: sub._id });
      for (const attr of attrs) {
        await AttributeOption.deleteMany({ attribute_id: attr._id });
        await SubtypeAttribute.deleteOne({ _id: attr._id });
      }
      await SubtypeAttributeGroup.deleteMany({ subtype_id: sub._id });
      await ProductSubtype.updateOne({ _id: sub._id }, { $set: { deleted_at: new Date() } });
      console.log(`  🗑️ Soft-deleted legacy system subtype '${sub.name}' under template '${tSpec.name}'.`);
    }
  } // end for tSpec

  console.log('✅ Product Templates and Subtypes Seeding completed.');
};

module.exports = { seedTemplates };
