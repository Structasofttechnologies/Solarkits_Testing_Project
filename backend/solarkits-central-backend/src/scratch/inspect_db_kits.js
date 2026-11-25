const dns = require('dns');
dns.setServers(['8.8.8.8', '8.8.4.4', '1.1.1.1']);
require('dotenv').config();
require('../keys/config/databases');
const { 
  WarehouseComboKit: ComboKit, 
  SolarKit, 
  Brand, 
  ProductTemplate, 
  ProductSubtype, 
  Product, 
  ProductSku, 
  ProjectRange,
  ProjectType,
  ProjectCategory,
  ProjectSubcategory
} = require('../modules/admin-panel/models/core_db');
const { GeoLevel0 } = require('../modules/admin-panel/models/geolocation_db');

async function inspect() {
  try {
    const india = await GeoLevel0.findOne({ $or: [{ iso2: 'IN' }, { name: /^India$/i }], deleted_at: null }).lean();
    console.log('=== TARGET COUNTRY ===');
    console.log('India ID:', india?._id, '| Name:', india?.name);

    console.log('\n=== CURRENT COMBO KITS ===');
    const kits = await ComboKit.find({ deleted_at: null })
      .populate('solar_kit_id')
      .populate('brand_id')
      .populate('project_range_id')
      .populate('base_components.template_id')
      .populate('base_components.subtype_id')
      .populate('base_components.brand_id')
      .populate('base_components.sku_id')
      .populate('bos_kits.brand_id')
      .populate('bos_kits.sku_id')
      .lean();
    console.log('Total Kits:', kits.length);
    kits.forEach((k, idx) => {
      console.log(`\nKit #${idx + 1}: ${k.name}`);
      console.log(`  ID: ${k._id}`);
      console.log(`  Capacity: ${k.capacity} kW | Tolerance: ${k.inverter_tolerance}% | Inverter Mode: ${k.inverter_mode}`);
      console.log(`  Blueprint: ${k.solar_kit_id?.name} (${k.solar_kit_id?._id})`);
      console.log(`  Brand: ${k.brand_id?.brand_name || k.brand_id?.name} (${k.brand_id?._id})`);
      console.log(`  Range: ${k.project_range_id?.name || (k.project_range_id?.min_value + '-' + k.project_range_id?.max_value + ' kW')} (${k.project_range_id?._id})`);
      console.log(`  Base Components (${k.base_components?.length || 0}):`);
      (k.base_components || []).forEach(bc => {
        console.log(`    - Template: ${bc.template_id?.name}, Subtype: ${bc.subtype_id?.name}, Brand: ${bc.brand_id?.brand_name || bc.brand_id?.name}, SKU: ${bc.sku_id?.sku_code}, Qty: ${bc.quantity}`);
      });
      console.log(`  BOS Kits (${k.bos_kits?.length || 0}):`);
      (k.bos_kits || []).forEach(bos => {
        console.log(`    - Name: ${bos.name}, Brand: ${bos.brand_id?.brand_name || bos.brand_id?.name}, SKU: ${bos.sku_id?.sku_code || 'None'}, Qty: ${bos.quantity}`);
      });
    });

    console.log('\n=== MASTER SOLAR KIT BLUEPRINTS ===');
    const blueprints = await SolarKit.find({ deleted_at: null })
      .populate('category_id')
      .populate('subcategory_id')
      .populate('type_id')
      .populate('base_components.template_id')
      .populate('base_components.subtype_id')
      .lean();
    console.log('Total Master Blueprints:', blueprints.length);
    blueprints.forEach((b, idx) => {
      console.log(`\nBlueprint #${idx + 1}: ${b.name}`);
      console.log(`  ID: ${b._id}`);
      console.log(`  Category: ${b.category_id?.name} | Subcategory: ${b.subcategory_id?.name} | Type: ${b.type_id?.name} (${b.type_id?._id})`);
      console.log(`  Base Components (${b.base_components?.length || 0}):`);
      (b.base_components || []).forEach(bc => {
        console.log(`    - Template: ${bc.template_id?.name} (${bc.template_id?._id}), Subtype: ${bc.subtype_id?.name} (${bc.subtype_id?._id}), Qty: ${bc.quantity}`);
      });
      console.log(`  BOS Kits (${b.bos_kits?.length || 0}):`);
      (b.bos_kits || []).forEach(bos => {
        console.log(`    - Name: ${bos.name}`);
      });
    });

    console.log('\n=== PROJECT RANGES ===');
    const ranges = await ProjectRange.find({ deleted_at: null }).lean();
    console.log('Total Ranges:', ranges.length);
    ranges.forEach(r => {
      console.log(`  ID: ${r._id} | SubcategoryType/Type: ${r.subcategory_type || r.subcategory_type_id} | Range: ${r.min_value} - ${r.max_value} kW | Name: ${r.name || 'N/A'}`);
    });

    console.log('\n=== BRANDS ===');
    const brands = await Brand.find({ deleted_at: null }).lean();
    console.log('Total Brands:', brands.length);
    brands.forEach(b => {
      console.log(`  ID: ${b._id} | Name: ${b.brand_name || b.name} | Code: ${b.code || 'N/A'}`);
    });

    console.log('\n=== PRODUCTS & SKUS ===');
    const products = await Product.find({ deleted_at: null })
      .populate('template_id')
      .populate('subtype_id')
      .populate('brand_id')
      .lean();
    console.log('Total Products:', products.length);
    
    const skus = await ProductSku.find({ deleted_at: null })
      .populate({
        path: 'product_id',
        populate: [
          { path: 'template_id' },
          { path: 'subtype_id' },
          { path: 'brand_id' }
        ]
      })
      .lean();
    console.log('Total SKUs:', skus.length);
    skus.forEach(s => {
      const p = s.product_id;
      console.log(`  SKU ID: ${s._id} | Code: ${s.sku_code} | Product: ${p?.name} | Template: ${p?.template_id?.name} | Subtype: ${p?.subtype_id?.name} | Brand: ${p?.brand_id?.brand_name || p?.brand_id?.name}`);
    });

    process.exit(0);
  } catch (err) {
    console.error('Error inspecting DB:', err);
    process.exit(1);
  }
}

inspect();
