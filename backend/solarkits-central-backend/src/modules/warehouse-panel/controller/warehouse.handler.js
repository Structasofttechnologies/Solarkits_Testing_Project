const { 
  CompanyWarehouse, 
  CompanyWarehouseValidationSection, 
  CompanyWarehouseValidationField, 
  CompanyWarehouseFieldValidation, 
  CompanyWarehouseFieldDependency, 
  CompanyWarehouseFieldStatus,
  CompanyWarehouseFieldData,
  WarehouseStock,
  PoRequest
} = require('../models/company_warehouse_db');
const { company_warehouse_db } = require('../config/databases');
const { delete_uploaded_files } = require('../utils/upload.files');
const { sendAdminNotification } = require('../../admin-panel/services/admin.notification.service');

const extractCloudinaryUrls = (value) => {
  if (!value) return [];
  let urls = [];
  if (typeof value === 'string') {
    if (value.startsWith('[') || value.startsWith('{')) {
      try {
        const parsed = JSON.parse(value);
        if (Array.isArray(parsed)) {
          urls = parsed.filter(item => typeof item === 'string' && item.includes('cloudinary.com'));
        } else if (typeof parsed === 'object' && parsed !== null) {
          Object.values(parsed).forEach(val => {
            if (typeof val === 'string' && val.includes('cloudinary.com')) urls.push(val);
          });
        }
      } catch (e) {}
    } else if (value.includes('cloudinary.com')) {
      urls.push(value);
    }
  }
  return urls;
};

// Helper to resolve warehouse ID with fallback for super admin
const resolveWarehouseId = async (user, session = null) => {
  if (user.warehouse_id) return user.warehouse_id;
  if (user.is_super_admin === true) {
    const query = CompanyWarehouse.findOne({ is_active: true, deleted_at: null });
    if (session) query.session(session);
    const warehouse = await query.lean();
    return warehouse ? warehouse._id : null;
  }
  return null;
};

const get_validation_sections = async (req, res) => {
  try {
    const warehouse_id = await resolveWarehouseId(req.user);
    if (!warehouse_id) {
      return res.status(400).json({ status: "error", message: "User is not linked to any warehouse." });
    }

    const [sections, fields, statuses] = await Promise.all([
      CompanyWarehouseValidationSection.find({ deleted_at: null }).sort({ order: 1, _id: 1 }),
      CompanyWarehouseValidationField.find({ deleted_at: null }),
      CompanyWarehouseFieldStatus.find({ warehouse_id, is_enabled: true })
    ]);

    const enabledFieldIds = new Set(statuses.map(s => s.field_id.toString()));

    const result = sections.map(s => {
      const section_fields = fields.filter(f => f.section_id.toString() === s._id.toString() && enabledFieldIds.has(f._id.toString()));
      return {
        id: s._id,
        name: s.name,
        code: s.code,
        order: s.order,
        enabled_fields_count: section_fields.length
      };
    }).filter(s => s.enabled_fields_count > 0);

    return res.status(200).json({ status: "success", message: "Validation sections fetched successfully.", sections: result });
  } catch (err) {
    console.error("Error in get_validation_sections:", err);
    return res.status(500).json({ status: "error", message: "Failed to fetch validation sections." });
  }
};

const get_validation_fields = async (req, res) => {
  try {
    const { section_id } = req.params;
    const warehouse_id = await resolveWarehouseId(req.user);
    if (!warehouse_id) {
      return res.status(400).json({ status: "error", message: "User is not linked to any warehouse." });
    }

    const fields = await CompanyWarehouseValidationField.find({ section_id, deleted_at: null }).sort({ order: 1, _id: 1 });
    const fieldIds = fields.map(f => f._id);

    const [validations, dependencies, statuses, savedValues] = await Promise.all([
      CompanyWarehouseFieldValidation.find({ field_id: { $in: fieldIds } }),
      CompanyWarehouseFieldDependency.find({ child_field_id: { $in: fieldIds } }).populate('parent_field_id'),
      CompanyWarehouseFieldStatus.find({ warehouse_id, field_id: { $in: fieldIds }, is_enabled: true }),
      CompanyWarehouseFieldData.find({ warehouse_id, field_id: { $in: fieldIds } })
    ]);

    const enabledFieldIds = new Set(statuses.map(s => s.field_id.toString()));
    const statusMap = Object.fromEntries(statuses.map(s => [s.field_id.toString(), s]));
    const valueMap = Object.fromEntries(savedValues.map(v => [v.field_id.toString(), v.value]));

    const enabled_fields = fields
      .filter(field => enabledFieldIds.has(field._id.toString()))
      .map(field => {
        const field_validations = validations.filter(v => v.field_id.toString() === field._id.toString());
        const field_dependency = dependencies.find(d => d.child_field_id.toString() === field._id.toString());
        const field_status = statusMap[field._id.toString()];
        const saved_value = valueMap[field._id.toString()] || null;

        // Try to parse saved value as JSON if it represents dropdown selection, files list, etc.
        let parsed_value = saved_value;
        if (saved_value && (saved_value.startsWith('[') || saved_value.startsWith('{'))) {
          try {
            parsed_value = JSON.parse(saved_value);
          } catch (e) {
            parsed_value = saved_value;
          }
        }

        return {
          id: field._id,
          name: field.name,
          label: field.label,
          field_type: field.field_type,
          options: field.options ? JSON.parse(field.options) : null,
          is_required: field.is_required,
          validations: field_validations.map(v => ({
            validation_type: v.validation_type,
            validation_value: v.validation_value,
            error_message: v.error_message
          })),
          dependency: field_dependency ? {
            is_dependent: true,
            parent_field: {
              id: field_dependency.parent_field_id._id,
              name: field_dependency.parent_field_id.name,
              label: field_dependency.parent_field_id.label,
            },
            dependency_type: field_dependency.dependency_type,
            parent_value_condition: field_dependency.parent_value,
          } : { is_dependent: false },
          min_files: field_status ? field_status.min_files : null,
          max_files: field_status ? field_status.max_files : null,
          value: parsed_value
        };
      });

    return res.status(200).json({
      status: "success",
      fields: enabled_fields
    });
  } catch (err) {
    console.error("Error in get_validation_fields:", err);
    return res.status(500).json({ status: "error", message: "Failed to fetch validation fields." });
  }
};

const submit_validation_data = async (req, res) => {
  const session = await company_warehouse_db.startSession();
  session.startTransaction();
  try {
    const warehouse_id = await resolveWarehouseId(req.user, session);
    if (!warehouse_id) {
      return res.status(400).json({ status: "error", message: "User is not linked to any warehouse." });
    }

    const { values, images } = req.body;
    if (!values || typeof values !== 'object') {
      return res.status(400).json({ status: "error", message: "Values object is required." });
    }

    // Save each field value
    for (const [field_id, value] of Object.entries(values)) {
      const finalValue = (typeof value === 'object' && value !== null) ? JSON.stringify(value) : String(value ?? '');
      const existingData = await CompanyWarehouseFieldData.findOne({ warehouse_id, field_id }).session(session);
      if (existingData) {
        const oldUrls = extractCloudinaryUrls(existingData.value);
        const newUrls = extractCloudinaryUrls(finalValue);
        const removedUrls = oldUrls.filter(url => !newUrls.includes(url));
        if (removedUrls.length > 0) {
          await delete_uploaded_files(removedUrls.map(url => ({ path: url })));
        }
      }
      await CompanyWarehouseFieldData.findOneAndUpdate(
        { warehouse_id, field_id },
        { value: finalValue },
        { upsert: true, session }
      );
    }

    // Update warehouse status to 3 ("In Review")
    const warehouse = await CompanyWarehouse.findById(warehouse_id).session(session);
    if (!warehouse) {
      throw new Error("Warehouse not found.");
    }

    // Save and validate warehouse images
    let imgArr = [];
    if (images !== undefined) {
      if (Array.isArray(images)) {
        imgArr = images;
      } else if (typeof images === 'string') {
        try { imgArr = JSON.parse(images); } catch { imgArr = images ? [images] : []; }
      }
      if (warehouse.images) {
        const oldImgUrls = extractCloudinaryUrls(warehouse.images);
        const newImgUrls = extractCloudinaryUrls(imgArr);
        const removedImgUrls = oldImgUrls.filter(url => !newImgUrls.includes(url));
        if (removedImgUrls.length > 0) {
          await delete_uploaded_files(removedImgUrls.map(url => ({ path: url })));
        }
      }
    } else if (warehouse.images) {
      try { imgArr = JSON.parse(warehouse.images); } catch { imgArr = warehouse.images ? [warehouse.images] : []; }
    }
    if (imgArr.length < 1 || imgArr.length > 10) {
      throw new Error("Warehouse images are required (minimum 1, maximum 10).");
    }
    warehouse.images = JSON.stringify(imgArr);

    warehouse.status = 3; // In Review
    await warehouse.save({ session });

    await session.commitTransaction();
    return res.status(200).json({ status: "success", message: "Validation data submitted successfully. Your warehouse is now under review." });
  } catch (err) {
    await session.abortTransaction();
    console.error("Error in submit_validation_data:", err);
    return res.status(500).json({ status: "error", message: err.message });
  } finally {
    session.endSession();
  }
};
const upload_documents = async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ status: "error", message: "No files uploaded." });
    }
    const paths = req.files.map(f => f.path);
    return res.status(200).json({ status: "success", message: "Files uploaded.", paths });
  } catch (err) {
    console.error("Error in upload_documents:", err);
    return res.status(500).json({ status: "error", message: "Failed to upload documents." });
  }
};

const check_and_auto_submit = async (warehouse, percentage, session = null) => {
  if (warehouse.status === 2 || warehouse.status === 5) {
    const isOverdue = warehouse.due_date && new Date(warehouse.due_date) < new Date();
    if (percentage === 100 || isOverdue) {
      warehouse.status = 3; // In Review
      if (session) {
        await warehouse.save({ session });
      } else {
        await warehouse.save();
      }
      return true;
    }
  }
  return false;
};

const save_validation_data = async (req, res) => {
  const session = await company_warehouse_db.startSession();
  session.startTransaction();
  try {
    const warehouse_id = await resolveWarehouseId(req.user, session);
    if (!warehouse_id) {
      return res.status(400).json({ status: "error", message: "User is not linked to any warehouse." });
    }

    const { values, images } = req.body;
    if ((!values || typeof values !== 'object') && images === undefined) {
      return res.status(400).json({ status: "error", message: "Values or images are required." });
    }

    if (values && typeof values === 'object') {
      // Save each field value
      for (const [field_id, value] of Object.entries(values)) {
        const finalValue = (typeof value === 'object' && value !== null) ? JSON.stringify(value) : String(value ?? '');
        const existingData = await CompanyWarehouseFieldData.findOne({ warehouse_id, field_id }).session(session);
        if (existingData) {
          const oldUrls = extractCloudinaryUrls(existingData.value);
          const newUrls = extractCloudinaryUrls(finalValue);
          const removedUrls = oldUrls.filter(url => !newUrls.includes(url));
          if (removedUrls.length > 0) {
            await delete_uploaded_files(removedUrls.map(url => ({ path: url })));
          }
        }
        await CompanyWarehouseFieldData.findOneAndUpdate(
          { warehouse_id, field_id },
          { value: finalValue },
          { upsert: true, session }
        );
      }
    }

    // Load warehouse to calculate percentage
    const warehouse = await CompanyWarehouse.findById(warehouse_id).session(session);
    if (!warehouse) {
      throw new Error("Warehouse not found.");
    }

    // Save images if provided
    if (images !== undefined) {
      let imgArr = [];
      if (Array.isArray(images)) {
        imgArr = images;
      } else if (typeof images === 'string') {
        try { imgArr = JSON.parse(images); } catch { imgArr = images ? [images] : []; }
      }
      if (imgArr.length > 10) {
        throw new Error("Maximum of 10 images are allowed.");
      }
      if (warehouse.images) {
        const oldImgUrls = extractCloudinaryUrls(warehouse.images);
        const newImgUrls = extractCloudinaryUrls(imgArr);
        const removedImgUrls = oldImgUrls.filter(url => !newImgUrls.includes(url));
        if (removedImgUrls.length > 0) {
          await delete_uploaded_files(removedImgUrls.map(url => ({ path: url })));
        }
      }
      warehouse.images = JSON.stringify(imgArr);
      await warehouse.save({ session });
    }

    // Fetch enabled field statuses
    const enabledStatuses = await CompanyWarehouseFieldStatus.find({ warehouse_id, is_enabled: true }).session(session);
    const enabledFieldIds = enabledStatuses.map(s => s.field_id);

    let percentage = 0;
    if (enabledFieldIds.length > 0 || warehouse.images) {
      const savedData = await CompanyWarehouseFieldData.find({
        warehouse_id,
        field_id: { $in: enabledFieldIds }
      }).session(session);

      let filledFieldsCount = savedData.filter(d => {
        if (d.value === null || d.value === undefined) return false;
        const valStr = String(d.value).trim();
        return valStr !== '' && valStr !== '[]' && valStr !== '{}';
      }).length;

      // Account for fixed images field
      const totalFields = enabledFieldIds.length + 1;
      let imagesFilled = false;
      if (warehouse.images) {
        try {
          const imgArr = JSON.parse(warehouse.images);
          if (Array.isArray(imgArr) && imgArr.length > 0) imagesFilled = true;
        } catch (e) {
          if (String(warehouse.images).trim()) imagesFilled = true;
        }
      }
      if (imagesFilled) filledFieldsCount++;

      percentage = Math.round((filledFieldsCount / totalFields) * 100);
    }

    // Check auto submit
    const didSubmit = await check_and_auto_submit(warehouse, percentage, session);

    await session.commitTransaction();

    if (didSubmit) {
      return res.status(200).json({
        status: "success",
        message: "Profile auto-submitted for review because it is 100% complete or overdue!",
        submitted: true,
        percentage
      });
    }

    return res.status(200).json({ status: "success", message: "Progress saved successfully.", submitted: false, percentage });
  } catch (err) {
    await session.abortTransaction();
    console.error("Error in save_validation_data:", err);
    return res.status(500).json({ status: "error", message: err.message });
  } finally {
    session.endSession();
  }
};

const get_profile_completion = async (req, res) => {
  try {
    const warehouse_id = await resolveWarehouseId(req.user);
    if (!warehouse_id) {
      return res.status(400).json({ status: "error", message: "User is not linked to any warehouse." });
    }

    // 1. Get all enabled field statuses for this warehouse
    const enabledStatuses = await CompanyWarehouseFieldStatus.find({ warehouse_id, is_enabled: true });
    const enabledFieldIds = enabledStatuses.map(s => s.field_id);

    const warehouse = await CompanyWarehouse.findById(warehouse_id);
    const due_date = warehouse ? warehouse.due_date : null;
    const images = warehouse ? warehouse.images : null;

    // 2. Get saved data for these enabled fields
    const savedData = await CompanyWarehouseFieldData.find({
      warehouse_id,
      field_id: { $in: enabledFieldIds }
    });

    // Filter to count fields that have actual values
    let filledFieldsCount = savedData.filter(d => {
      if (d.value === null || d.value === undefined) return false;
      const valStr = String(d.value).trim();
      return valStr !== '' && valStr !== '[]' && valStr !== '{}';
    }).length;

    // Account for fixed images field
    const totalFields = enabledFieldIds.length + 1;
    let imagesFilled = false;
    if (images) {
      try {
        const imgArr = JSON.parse(images);
        if (Array.isArray(imgArr) && imgArr.length > 0) imagesFilled = true;
      } catch (e) {
        if (String(images).trim()) imagesFilled = true;
      }
    }
    if (imagesFilled) filledFieldsCount++;

    const percentage = Math.round((filledFieldsCount / totalFields) * 100);

    // Auto-submit checks
    let updated_status = warehouse.status;
    if (warehouse) {
      const didSubmit = await check_and_auto_submit(warehouse, percentage);
      if (didSubmit) {
        updated_status = 3;
      }
    }

    return res.status(200).json({
      status: "success",
      total_fields: totalFields,
      filled_fields: filledFieldsCount,
      percentage,
      due_date,
      images,
      warehouse_status: updated_status
    });
  } catch (err) {
    console.error("Error in get_profile_completion:", err);
    return res.status(500).json({ status: "error", message: "Failed to get profile completion." });
  }
};

const mongoose = require('mongoose');
const { india_solarshop_db, solarkits_core_db } = require('../config/databases');

const poSchema = new mongoose.Schema({
  customer_id:                 { type: mongoose.Schema.Types.ObjectId },
  warehouse_id:                { type: mongoose.Schema.Types.ObjectId },
  combo_kit_id:                { type: mongoose.Schema.Types.ObjectId },
  selling_price_snapshot:      { type: Number },
  delivery_address: {
    address_line:  { type: String, default: null },
    state_id:      { type: mongoose.Schema.Types.ObjectId, default: null },
    state_name:    { type: String, default: null },
    district_id:   { type: mongoose.Schema.Types.ObjectId, default: null },
    district_name: { type: String, default: null },
    pincode:       { type: String, default: null },
    contact_number:{ type: String, default: null },
    contact_name:  { type: String, default: null },
    lat:           { type: Number, default: null },
    lng:           { type: Number, default: null }
  },
  status:                      { type: String },
  tracking_status:             { type: String, default: 'At Warehouse' },
  dispatch_delivery_id:        { type: String, default: null },
  dispatch_vehicle:            { type: String, default: null },
  dispatch_driver:             { type: String, default: null },
  dispatch_driver_contact:     { type: String, default: null },
  dispatch_eway_bill:          { type: String, default: null },
  dispatch_toll_cost:          { type: Number, default: 0 },
  dispatch_fuel_cost:          { type: Number, default: 0 },
  dispatch_distance:           { type: Number, default: 0 },
  delivery_photo_proof:        { type: String, default: null },
  delivery_otp_verified:       { type: Boolean, default: false },
  created_at:                  { type: Date }
}, { collection: 'purchase_orders' });

const CustomerOrder = india_solarshop_db.models['purchase_orders'] || india_solarshop_db.model('purchase_orders', poSchema);

const kitSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: { type: String, default: null },
  capacity: { type: Number, default: 0 },
  base_components: [{
    template_id: { type: mongoose.Schema.Types.ObjectId, ref: 'pc_product_templates' },
    subtype_id: { type: mongoose.Schema.Types.ObjectId, ref: 'pc_product_subtypes' },
    brand_id: { type: mongoose.Schema.Types.ObjectId, ref: 'brands' },
    sku_id: { type: mongoose.Schema.Types.ObjectId, ref: 'pc_product_skus' },
    quantity: { type: Number, default: 1 }
  }]
}, { collection: 'pc_comobo_kit' });

if (solarkits_core_db.models['pc_comobo_kit']) {
  delete solarkits_core_db.models['pc_comobo_kit'];
}
const ComboKit = solarkits_core_db.model('pc_comobo_kit', kitSchema);

const get_sales_orders = async (req, res) => {
  try {
    const warehouse_id = await resolveWarehouseId(req.user);
    if (!warehouse_id) {
      return res.status(400).json({ status: "error", message: "User is not linked to any warehouse." });
    }

    // Fetch warehouse details
    const warehouse = await CompanyWarehouse.findById(warehouse_id).lean();

    // Find all confirmed or completed sales orders assigned to this warehouse
    const orders = await CustomerOrder.find({ warehouse_id, status: { $in: ['confirmed', 'completed'] } }).sort({ created_at: 1 }).lean();
    if (orders.length === 0) {
      return res.status(200).json({ 
        status: "success", 
        warehouse: warehouse ? {
          lat: warehouse.lat,
          lng: warehouse.lng,
          address: warehouse.address,
          warehouse_code: warehouse.warehouse_code
        } : null,
        data: [] 
      });
    }

    // Populate ComboKit manually (since it is cross-connection)
    const kitIds = [...new Set(orders.map(o => o.combo_kit_id?.toString()).filter(Boolean))].map(id => new mongoose.Types.ObjectId(id));
    const kits = await ComboKit.find({ _id: { $in: kitIds } }).lean();

    // Fetch related ProductSku, ProductTemplate, Product, SubtypeAttribute, and ProductAttributeValue from core db
    const ProductSku = solarkits_core_db.models['pc_product_skus'] || solarkits_core_db.model('pc_product_skus', new mongoose.Schema({}, { strict: false, collection: 'pc_product_skus' }));
    const ProductTemplate = solarkits_core_db.models['pc_product_templates'] || solarkits_core_db.model('pc_product_templates', new mongoose.Schema({}, { strict: false, collection: 'pc_product_templates' }));
    const Product = solarkits_core_db.models['products'] || solarkits_core_db.model('products', new mongoose.Schema({}, { strict: false, collection: 'products' }));
    const SubtypeAttribute = solarkits_core_db.models['pc_subtype_attributes'] || solarkits_core_db.model('pc_subtype_attributes', new mongoose.Schema({
      name: String,
      subtype_id: mongoose.Schema.Types.ObjectId
    }, { collection: 'pc_subtype_attributes' }));
    const ProductAttributeValue = solarkits_core_db.models['pc_attribute_values'] || solarkits_core_db.model('pc_attribute_values', new mongoose.Schema({}, { strict: false, collection: 'pc_attribute_values' }));

    const skuIds = [];
    const templateIds = [];
    kits.forEach(kit => {
      const components = [
        ...(kit.base_components || []),
        ...(kit.bos_kits || [])
      ];
      components.forEach(comp => {
        if (comp.sku_id) skuIds.push(comp.sku_id);
        if (comp.template_id) templateIds.push(comp.template_id);
        if (comp.template_ids && Array.isArray(comp.template_ids)) {
          comp.template_ids.forEach(id => templateIds.push(id));
        }
      });
    });

    const uniqueSkuIds = [...new Set(skuIds.map(id => id.toString()))].map(id => new mongoose.Types.ObjectId(id));
    const uniqueTemplateIds = [...new Set(templateIds.map(id => id.toString()))].map(id => new mongoose.Types.ObjectId(id));

    const [skus, templates, weightAttrs, stocks] = await Promise.all([
      ProductSku.find({ _id: { $in: uniqueSkuIds } }).lean(),
      ProductTemplate.find({ _id: { $in: uniqueTemplateIds } }).lean(),
      SubtypeAttribute.find({ name: { $regex: /^weight$/i } }).lean(),
      warehouse_id ? WarehouseStock.find({ warehouse_id, sku_id: { $in: uniqueSkuIds } }).lean() : []
    ]);

    const stockMap = Object.fromEntries((stocks || []).map(s => [s.sku_id.toString(), s.qty || 0]));

    const skuMap = Object.fromEntries(skus.map(s => [s._id.toString(), s]));
    const templateMap = Object.fromEntries(templates.map(t => [t._id.toString(), t]));

    // Fetch products referenced by SKUs
    const productIds = [...new Set(skus.map(s => s.product_id?.toString()).filter(Boolean))].map(id => new mongoose.Types.ObjectId(id));
    const products = await Product.find({ _id: { $in: productIds } }).lean();

    // Fetch any templates referenced by products that weren't loaded yet
    const productTemplateIds = products.map(p => p.template_id).filter(Boolean);
    const missingTemplateIds = productTemplateIds.filter(id => !templateMap[id.toString()]);
    if (missingTemplateIds.length > 0) {
      const extraTemplates = await ProductTemplate.find({ _id: { $in: missingTemplateIds } }).lean();
      extraTemplates.forEach(t => {
        templateMap[t._id.toString()] = t;
      });
    }

    // Fetch weight attribute values
    const weightValues = await ProductAttributeValue.find({
      product_id: { $in: productIds },
      attribute_id: { $in: weightAttrs.map(a => a._id) }
    }).lean();

    const productWeightMap = {};
    weightValues.forEach(val => {
      if (val.product_id) {
        const wt = parseFloat(val.value_number) || parseFloat(val.value_text) || 0;
        productWeightMap[val.product_id.toString()] = wt;
      }
    });

    const getProductWeight = (productId) => {
      if (!productId) return 28;
      const wt = productWeightMap[productId.toString()];
      return wt !== undefined ? wt : 28;
    };

    // Calculate panels and weight for each kit
    const kitMetricsMap = {};
    kits.forEach(kit => {
      let panelCount = 0;
      let totalWeight = 0;

      if (kit.base_components) {
        kit.base_components.forEach(bc => {
          const template = bc.template_id ? templateMap[bc.template_id.toString()] : null;
          const sku = bc.sku_id ? skuMap[bc.sku_id.toString()] : null;
          const qty = bc.quantity || 0;

          const isSolarPanel = template && template.name && template.name.toLowerCase() === 'solar panel';
          if (isSolarPanel && sku) {
            panelCount += qty;
            const weightPerPanel = getProductWeight(sku.product_id);
            totalWeight += weightPerPanel * qty;
          }
        });
      }

      kitMetricsMap[kit._id.toString()] = {
        panels: panelCount || 10,
        weight: totalWeight || 450
      };
    });

    const kitMap = Object.fromEntries(kits.map(k => [k._id.toString(), k]));

    const remainingStockMap = { ...stockMap };

    let populatedOrders = orders.map(order => {
      const populated = { ...order };
      if (order.combo_kit_id) {
        populated.combo_kit_id = kitMap[order.combo_kit_id.toString()] || null;
      }

      const metrics = order.combo_kit_id ? kitMetricsMap[order.combo_kit_id.toString()] : null;
      populated.panels = metrics ? metrics.panels : 10;
      populated.weight = metrics ? metrics.weight : 450;

      // Add component checklist with stock levels
      const orderQty = Number(order.quantity || 1);
      const kitComponents = [];
      let isInsufficient = false;

      const kit = order.combo_kit_id ? kitMap[order.combo_kit_id.toString()] : null;
      if (kit) {
        const components = [
          ...(kit.base_components || []),
          ...(kit.bos_kits || [])
        ];

        components.forEach(comp => {
          if (!comp.sku_id) return;
          const skuIdStr = comp.sku_id.toString();
          const sku = skuMap[skuIdStr] || null;
          const productObj = sku ? products.find(p => p._id.toString() === sku.product_id?.toString()) : null;
          const template = comp.template_id 
            ? templateMap[comp.template_id.toString()] 
            : (productObj && productObj.template_id ? templateMap[productObj.template_id.toString()] : null);
          const requiredQty = (comp.quantity || 1) * orderQty;
          const currentStock = stockMap[skuIdStr] || 0;
          const skuCode = sku ? sku.sku_code : "N/A";
          const productName = productObj ? productObj.name : (template ? template.name : "Product");

          // FIFO allocation of stock
          const remainingVal = remainingStockMap[skuIdStr] || 0;
          const allocated = Math.min(requiredQty, remainingVal);
          remainingStockMap[skuIdStr] = remainingVal - allocated;
          const pending = requiredQty - allocated;
          const isInStock = (allocated === requiredQty);

          if (!isInStock) {
            isInsufficient = true;
          }

          kitComponents.push({
            sku_id: comp.sku_id,
            sku_code: skuCode,
            product_name: productName,
            required_qty: requiredQty,
            allocated_qty: allocated,
            pending_qty: pending,
            current_stock: currentStock,
            in_stock: isInStock
          });
        });
      }

      populated.components_checklist = kitComponents;
      populated.stock_status = isInsufficient ? 'insufficient' : 'in_stock';

      return populated;
    });

    // ─── Attach EPC Account & Company details ────────────────────────────────
    const { india_core_db } = require('../config/databases');
    const epcAccountSchema = new mongoose.Schema({}, { strict: false, collection: 'epc_accounts' });
    const EpcAccount = india_solarshop_db.models['epc_accounts'] || india_solarshop_db.model('epc_accounts', epcAccountSchema);
    const epcCompanySchema = new mongoose.Schema({}, { strict: false, collection: 'epc_companies' });
    const EpcCompany = india_core_db.models['epc_companies'] || india_core_db.model('epc_companies', epcCompanySchema);

    const customerIds = [...new Set(populatedOrders.map(o => o.customer_id?.toString()).filter(Boolean))].map(id => new mongoose.Types.ObjectId(id));
    if (customerIds.length > 0) {
      const epcAccounts = await EpcAccount.find({ _id: { $in: customerIds }, deleted_at: null }).lean();
      const companyIds = [...new Set(epcAccounts.map(a => a.company_id?.toString()).filter(Boolean))].map(id => new mongoose.Types.ObjectId(id));
      const epcCompanies = companyIds.length > 0 ? await EpcCompany.find({ _id: { $in: companyIds }, deleted_at: null }).lean() : [];
      const companyMap = new Map(epcCompanies.map(c => [c._id.toString(), c]));
      const accountMap = new Map(epcAccounts.map(a => [a._id.toString(), a]));

      populatedOrders = populatedOrders.map(order => {
        const acc = order.customer_id ? accountMap.get(order.customer_id.toString()) : null;
        const company = acc?.company_id ? companyMap.get(acc.company_id.toString()) : null;
        return {
          ...order,
          epc_account: acc ? {
            _id: acc._id,
            name: acc.name,
            email: acc.email,
            whatsapp: acc.whatsapp
          } : null,
          epc_company: company ? {
            _id: company._id,
            name: company.name,
            brand_name: company.brand_name,
            email: company.email
          } : null
        };
      });
    }

    let orderZones = [];
    if (warehouse && warehouse.warehouse_type === 'master' && warehouse.level_2) {
      try {
        const mongoose = require('mongoose');
        const { geolocation_db } = require('../config/databases');
        const GeoLevel2 = geolocation_db.models['geolocation_level_2'] || geolocation_db.model('geolocation_level_2', new mongoose.Schema({
          name: String,
          cluster: { type: mongoose.Schema.Types.ObjectId, ref: 'clusters' }
        }, { collection: 'geolocation_level_2' }));

        const Zone = geolocation_db.models['zones'] || geolocation_db.model('zones', new mongoose.Schema({
          name: String,
          cluster: mongoose.Schema.Types.ObjectId,
          districts: [{ type: mongoose.Schema.Types.ObjectId, ref: 'geolocation_level_2' }],
          deleted_at: { type: Date, default: null }
        }, { collection: 'zones' }));

        const district = await GeoLevel2.findById(warehouse.level_2).lean();
        if (district && district.cluster) {
          const zones = await Zone.find({ cluster: district.cluster, deleted_at: null }).lean();
          orderZones = zones.map(z => z.name);
          
          populatedOrders = populatedOrders.map(order => {
            const orderDistrictId = order.delivery_address?.district_id || order.shipping_address?.level_2 || order.billing_address?.level_2 || order.level_2;
            if (orderDistrictId) {
              const matchingZone = zones.find(z => z.districts && z.districts.some(dId => dId.toString() === orderDistrictId.toString()));
              if (matchingZone) {
                order.zone_name = matchingZone.name;
              } else {
                order.zone_name = 'Unassigned Zone';
              }
            } else {
              order.zone_name = 'Unassigned Zone';
            }
            return order;
          });
        }
      } catch (err) {
        console.error("Error populating cluster zones in get_sales_orders:", err);
      }
    }

    return res.status(200).json({ 
      status: "success", 
      warehouse: warehouse ? {
        lat: warehouse.lat,
        lng: warehouse.lng,
        address: warehouse.address,
        warehouse_code: warehouse.warehouse_code,
        warehouse_type: warehouse.warehouse_type
      } : null,
      zones: orderZones,
      data: populatedOrders 
    });
  } catch (err) {
    console.error("Error in get_sales_orders:", err);
    return res.status(500).json({ status: "error", message: err.message });
  }
};

const deductOrderStock = async (order, warehouse_id) => {
  if (order.status !== 'completed' && order.combo_kit_id) {
    const kit = await ComboKit.findById(order.combo_kit_id).lean();
    if (kit) {
      const orderQty = Number(order.quantity || 1);
      const components = [...(kit.base_components || []), ...(kit.bos_kits || [])];
      for (const comp of components) {
        if (comp.sku_id) {
          await WarehouseStock.updateOne(
            { warehouse_id, sku_id: comp.sku_id },
            { $inc: { qty: -Math.abs(comp.quantity || 1) * orderQty } }
          );
        }
      }
    }
  }
};

const deliver_sales_order = async (req, res) => {
  try {
    const { id } = req.params;
    const warehouse_id = await resolveWarehouseId(req.user);
    if (!warehouse_id) {
      return res.status(400).json({ status: "error", message: "User is not linked to any warehouse." });
    }

    const order = await CustomerOrder.findOne({ _id: id, warehouse_id });
    if (!order) {
      return res.status(404).json({ status: "error", message: "Sales order not found or not assigned to this warehouse." });
    }

    if (order.status !== 'completed') {
      await deductOrderStock(order, warehouse_id);
      order.status = 'completed';
      await order.save();
    }

    return res.status(200).json({ status: "success", message: "Sales order marked as delivered successfully." });
  } catch (err) {
    console.error("Error in deliver_sales_order:", err);
    return res.status(500).json({ status: "error", message: err.message });
  }
};

const update_sales_order_tracking = async (req, res) => {
  try {
    const { id } = req.params;
    const { 
      tracking_status,
      dispatch_delivery_id,
      dispatch_vehicle,
      dispatch_driver,
      dispatch_driver_contact,
      dispatch_eway_bill,
      dispatch_toll_cost,
      dispatch_fuel_cost,
      dispatch_distance,
      delivery_photo_proof,
      delivery_otp_verified
    } = req.body;
    
    const warehouse_id = await resolveWarehouseId(req.user);
    if (!warehouse_id) {
      return res.status(400).json({ status: "error", message: "User is not linked to any warehouse." });
    }

    const order = await CustomerOrder.findOne({ _id: id, warehouse_id });
    if (!order) {
      return res.status(404).json({ status: "error", message: "Sales order not found or not assigned to this warehouse." });
    }

    if (tracking_status !== undefined) order.tracking_status = tracking_status;
    if (dispatch_delivery_id !== undefined) order.dispatch_delivery_id = dispatch_delivery_id;
    if (dispatch_vehicle !== undefined) order.dispatch_vehicle = dispatch_vehicle;
    if (dispatch_driver !== undefined) order.dispatch_driver = dispatch_driver;
    if (dispatch_driver_contact !== undefined) order.dispatch_driver_contact = dispatch_driver_contact;
    if (dispatch_eway_bill !== undefined) order.dispatch_eway_bill = dispatch_eway_bill;
    if (dispatch_toll_cost !== undefined) order.dispatch_toll_cost = dispatch_toll_cost;
    if (dispatch_fuel_cost !== undefined) order.dispatch_fuel_cost = dispatch_fuel_cost;
    if (dispatch_distance !== undefined) order.dispatch_distance = dispatch_distance;
    if (delivery_photo_proof !== undefined) order.delivery_photo_proof = delivery_photo_proof;
    if (delivery_otp_verified !== undefined) order.delivery_otp_verified = delivery_otp_verified;

    if (tracking_status === 'Delivered' && order.status !== 'completed') {
      await deductOrderStock(order, warehouse_id);
      order.status = 'completed';
    }
    await order.save();

    return res.status(200).json({ status: "success", message: "Tracking status updated successfully." });
  } catch (err) {
    console.error("Error in update_sales_order_tracking:", err);
    return res.status(500).json({ status: "error", message: err.message });
  }
};

const create_po_request = async (req, res) => {
  try {
    const warehouse_id = await resolveWarehouseId(req.user);
    if (!warehouse_id) {
      return res.status(400).json({ status: "error", message: "User is not linked to any warehouse." });
    }

    const { items } = req.body;
    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ status: "error", message: "Items list is required." });
    }

    const request_number = `REQ-${Date.now()}`;

    const newRequest = new PoRequest({
      request_number,
      warehouse_id,
      items: items.map(it => ({
        sku_id: new mongoose.Types.ObjectId(it.sku_id),
        sku_code: it.sku_code,
        qty: Number(it.qty)
      })),
      status: 'pending',
      created_by: req.user._id || req.user.id
    });

    await newRequest.save();

    sendAdminNotification({
      title: `📋 Buffer Stock PO Requisition: ${request_number}`,
      message: `Warehouse Manager requested PO for ${items.length} buffer raw materials / BOS Kit components (${items.map(i => `${i.sku_code || 'ITEM'} x${i.qty}`).join(', ').slice(0, 150)}).`,
      category: 'inventory',
      priority: 'high',
      action_url: '/account-panel/procurement',
      metadata: { request_number, items_count: items.length, event: 'po_request_created' }
    }).catch(err => console.warn('[PO Request Notification Error]:', err.message));

    return res.status(201).json({
      status: "success",
      message: "PO request submitted successfully to the accounts department.",
      data: newRequest
    });
  } catch (err) {
    console.error("Error in create_po_request:", err);
    return res.status(500).json({ status: "error", message: err.message });
  }
};

const get_po_requests = async (req, res) => {
  try {
    const warehouse_id = await resolveWarehouseId(req.user);
    if (!warehouse_id) {
      return res.status(400).json({ status: "error", message: "User is not linked to any warehouse." });
    }

    const { sku_id } = req.query;
    const query = { warehouse_id };
    if (sku_id) {
      query["items.sku_id"] = new mongoose.Types.ObjectId(sku_id);
    }

    const requests = await PoRequest.find(query).sort({ created_at: -1 }).lean();

    return res.status(200).json({
      status: "success",
      data: requests
    });
  } catch (err) {
    console.error("Error in get_po_requests:", err);
    return res.status(500).json({ status: "error", message: err.message });
  }
};

module.exports = {
  get_validation_sections,
  get_validation_fields,
  submit_validation_data,
  upload_documents,
  save_validation_data,
  get_profile_completion,
  get_sales_orders,
  deliver_sales_order,
  update_sales_order_tracking,
  create_po_request,
  get_po_requests
};
