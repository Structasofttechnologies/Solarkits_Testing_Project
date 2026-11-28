const mongoose = require("mongoose");
const {
  Product, ProductSubtype, ProductTemplate, Brand,
  SubtypeAttribute, ProductAttributeValue,
  ProductSku, AttributeOption, Unit, BrandSubtypeMap, BrandTemplateMap, ProjectSubcategoryType
} = require("../models/core_db");
const { solarkits_core_db } = require("../config/databases");
const { delete_uploaded_files } = require("../utils/upload.files");

const subtypeNameMap = {
  'Monocrystalline Bifacial': 'Bifacial',
  'Bi facial Mono PERC PV Module': 'Bifacial',
  'Bi facial - Double Glass': 'Bifacial',
  'Monocrystalline Mono PERC': 'Mono PERC',
  'Polycrystalline': 'Poly',
  'TOPCon Mono-facial': 'TOPCon',
  'TOPCon Bifacial': 'TOPCon',
  'HJT Mono-facial': 'HJT',
  'HJT Bifacial': 'HJT',
  'String Inverter': 'String',
  'String Inverters': 'String',
  'Microinverter': 'Micro',
  'Hybrid Inverter': 'Hybrid',
  'Single Phase ACDB': 'Single Phase',
  'Three Phase ACDB': 'Three Phase',
  'Standard ACDB': 'Three Phase',
  '1 String DCDB': '1 String',
  '2 String DCDB': '2 String',
  '4 String DCDB': '4 String',
  'Rooftop RCC': 'RCC Roof',
  'Rooftop Metal': 'Metal Roof',
  'MC4 Junction Box': 'MC4',
  'IP65 Junction Box': 'MC4',
  'Single Phase Net Meter': 'Single Phase',
  'Three Phase Net Meter': 'Three Phase'
};

const resolveSubtypeIds = async (subtype_id) => {
  if (!subtype_id) return [];
  const ids = subtype_id.split(',').map(id => id.trim());
  const resolvedIds = [];
  for (const id of ids) {
    if (!mongoose.Types.ObjectId.isValid(id)) continue;
    const subObjId = new mongoose.Types.ObjectId(id);
    resolvedIds.push(subObjId);

    const activeAttrCount = await SubtypeAttribute.countDocuments({ subtype_id: subObjId, deleted_at: null });
    if (activeAttrCount === 0) {
      const legacySub = await ProductSubtype.findById(subObjId).lean();
      if (legacySub) {
        const targetName = subtypeNameMap[legacySub.name];
        if (targetName) {
          const activeSub = await ProductSubtype.findOne({
            template_id: legacySub.template_id,
            name: targetName,
            deleted_at: null
          }).lean();
          if (activeSub) {
            resolvedIds.push(activeSub._id);
          }
        }
      }
    }
  }
  return resolvedIds;
};

// ================= HELPERS =================
const parseJSON = (data) => {
  if (typeof data === 'string') {
    try { return JSON.parse(data); } catch { return data; }
  }
  return data;
};

const validateAttributes = async (subtype_id, attributes, is_sku = false) => {
  const errors = [];
  const schema = await SubtypeAttribute.find({
    subtype_id: subtype_id,
    deleted_at: null,
    is_variant: is_sku ? true : false
  });

  for (const field of schema) {
    const val = attributes.find(a => String(a.attribute_id) === String(field._id));

    // Check if required field has a value
    const hasValue = val && (
      (val.value_text !== null && val.value_text !== "") ||
      (val.value_number !== null && val.value_number !== undefined) ||
      val.value_boolean !== null ||
      val.value_option_id !== null ||
      val.value_file !== null
    );

    if (field.is_required && !hasValue) {
      errors.push(`${field.name} is required`);
    }
  }
  return errors;
};

const shortCode = (str, len = 3) => {
  const cleaned = str?.replace(/[^a-zA-Z0-9]/g, "") || "";
  return cleaned.substring(0, len).toUpperCase();
};

const generateSkuCode = async (product_id, attributes, excludeSkuId = null) => {
  const product = await Product.findOne({ _id: product_id, deleted_at: null })
    .populate('template_id')
    .populate('subtype_id')
    .populate('brand_id');

  if (!product) throw new Error("Product not found");

  const templateLen = product.sku_config?.template_len ?? 3;
  const brandLen = product.sku_config?.brand_len ?? 5;
  const productLen = product.sku_config?.product_len ?? 4;
  const subtypeLen = product.sku_config?.subtype_len ?? 4;

  const templatePart = shortCode(product.template_id?.name, templateLen);
  const brandPart = shortCode(product.brand_id?.company_name || product.brand_id?.brand_name, brandLen);
  const productPart = shortCode(product.name, productLen);
  const subtypePart = shortCode(product.subtype_id?.name, subtypeLen);

  // Find the sku attributes for the product subtype
  const skuAttrSchemas = await SubtypeAttribute.find({
    subtype_id: product.subtype_id,
    attribute_type: 'sku',
    deleted_at: null
  });

  // Prioritize capacity/current attributes to be used for the SKU code suffix
  const capacityNames = ["ac capacity", "power rating", "pmax", "capacity", "ac output current", "dc output current", "current rating"];
  skuAttrSchemas.sort((a, b) => {
    const nameA = (a.name || "").toLowerCase().trim();
    const nameB = (b.name || "").toLowerCase().trim();
    const isCapA = capacityNames.includes(nameA);
    const isCapB = capacityNames.includes(nameB);
    if (isCapA && !isCapB) return -1;
    if (!isCapA && isCapB) return 1;
    return 0;
  });

  let skuPart = "";
  let skuAttrSchema = null;
  let val = null;

  // Find the first schema attribute that has a value in the attributes array
  for (const schema of skuAttrSchemas) {
    val = attributes.find(a => a.attribute_id && String(a.attribute_id) === String(schema._id));
    if (val) {
      skuAttrSchema = schema;
      break;
    }
  }

  // Fallback: use first schema if none matched in the payload
  if (!skuAttrSchema && skuAttrSchemas.length > 0) {
    skuAttrSchema = skuAttrSchemas[0];
  }

  if (skuAttrSchema && val) {
    switch (skuAttrSchema.data_type) {
      case "text":
        skuPart = val.value_text;
        break;
      case "number":
        let symbol = "";
        if (val.unit_id) {
          const u = await Unit.findOne({ _id: val.unit_id });
          symbol = u?.symbol || "";
        }
        skuPart = `${val.value_number}${symbol}`;
        break;
      case "boolean":
        skuPart = val.value_boolean ? "YES" : "NO";
        break;
      case "dropdown":
        if (val.value_option_id) {
          const opt = await AttributeOption.findOne({ _id: val.value_option_id });
          skuPart = opt?.value;
        }
        break;
    }
  }

  const finalSkuPart = skuPart ? skuPart.replace(/[^a-zA-Z0-9.]/g, "").toUpperCase() : "XXXX";

  const skuCode = [templatePart, brandPart, productPart, subtypePart, finalSkuPart]
    .filter(Boolean).join("-");

  const dupFilter = { sku_code: skuCode };
  if (excludeSkuId) dupFilter._id = { $ne: excludeSkuId };

  const existing = await ProductSku.findOne(dupFilter);
  if (existing) {
    if (existing.deleted_at) {
      await ProductSku.updateOne({ _id: existing._id }, { $set: { deleted_at: null, product_id: product._id } });
      return existing.sku_code;
    }
    throw new Error(`SKU with code "${skuCode}" already exists with same attributes`);
  }

  return skuCode;
};

// ================= PRODUCT HANDLERS =================

const create_product = async (req, res) => {
  try {
    const { name, description, features, brand_id, subtype_id, scope_ids, attributes, sku_config } = req.body;
    const parsedScopes = parseJSON(scope_ids) || [];
    const parsedAttrs = parseJSON(attributes) || [];
    const parsedFeatures = parseJSON(features) || [];
    const parsedSkuConfig = parseJSON(sku_config) || { template_len: 3, brand_len: 5, product_len: 4, subtype_len: 4 };

    const subtype = await ProductSubtype.findOne({ _id: subtype_id, deleted_at: null });
    if (!subtype) throw new Error("Invalid subtype");

    const brand = await Brand.findOne({ _id: brand_id, deleted_at: null });
    if (!brand) throw new Error("Invalid brand");

    let mapping = await BrandSubtypeMap.findOne({ brand_id: brand_id, subtype_id: subtype_id });
    if (!mapping) {
      mapping = await BrandSubtypeMap.create({ brand_id: brand._id, subtype_id: subtype._id });
      if (subtype.template_id) {
        const exists = await BrandTemplateMap.findOne({ brand_id: brand._id, template_id: subtype.template_id, deleted_at: null });
        if (!exists) {
          await BrandTemplateMap.create({ brand_id: brand._id, template_id: subtype.template_id });
        }
      }
    }

    const attrErrors = await validateAttributes(subtype_id, parsedAttrs, false);
    if (attrErrors.length) throw new Error(attrErrors[0]);

    const image = req.files?.find(f => f.fieldname === "product_image");
    if (!image) throw new Error("Primary Product Image is mandatory.");

    const datasheetFile = req.files?.find(f => f.fieldname === "product_datasheet");

    const product = await Product.create({
      name,
      description,
      features: parsedFeatures,
      brand_id: brand._id,
      subtype_id: subtype._id,
      template_id: subtype.template_id,
      scope_ids: parsedScopes,
      image: image.path,
      datasheet: datasheetFile ? datasheetFile.path : null,
      sku_config: parsedSkuConfig
    });

    // Attributes
    const fileMap = {};
    (req.files || []).forEach(f => {
      if (f.fieldname.startsWith("attribute_")) {
        fileMap[f.fieldname.split("_")[1]] = f.path;
      }
    });

    for (const attr of parsedAttrs) {
      await ProductAttributeValue.create({
        product_id: product._id,
        attribute_id: attr.attribute_id,
        value_text: attr.value_text || null,
        value_number: attr.value_number || null,
        value_boolean: attr.value_boolean || null,
        value_option_id: attr.value_option_id || null,
        unit_id: attr.unit_id || null,
        value_file: fileMap[attr.attribute_id] ? fileMap[attr.attribute_id] : null
      });
    }

    return res.json({ status: "success", message: "Product created", data: { id: product._id } });
  } catch (err) {
    if (req.files?.length) delete_uploaded_files(req.files);
    return res.status(500).json({ status: "error", message: err.message });
  }
};

const get_products = async (req, res) => {
  try {
    const { subtype_id, template_id } = req.query;
    const filter = { deleted_at: null };
    if (subtype_id) filter.subtype_id = subtype_id;
    if (template_id) filter.template_id = template_id;

    const products = await Product.find(filter)
      .populate('brand_id', 'brand_name logo')
      .populate('subtype_id', 'name')
      .populate('template_id', 'name')
      .sort({ created_at: -1 })
      .lean();

    const data = [];

    for (const p of products) {
      const sku_count = await ProductSku.countDocuments({ product_id: p._id, deleted_at: null });

      const attrs = await ProductAttributeValue.find({ product_id: p._id, sku_id: null })
        .populate({
          path: 'attribute_id',
          populate: { path: 'group_id', select: 'name' }
        })
        .populate('unit_id', 'symbol')
        .populate('value_option_id', 'value')
        .lean();

      const grouped = {};
      for (const a of attrs) {
        if (!a.attribute_id) continue;
        const groupName = a.attribute_id.group_id?.name || "General";
        if (!grouped[groupName]) grouped[groupName] = [];
        grouped[groupName].push({
          attribute_id: a.attribute_id._id,
          attribute_name: a.attribute_id.name,
          data_type: a.attribute_id.data_type,
          value_text: a.value_text,
          value_number: a.value_number,
          value_boolean: a.value_boolean,
          value_option_id: a.value_option_id?._id,
          value_file: a.value_file,
          unit_id: a.unit_id?._id,
          unit_symbol: a.unit_id?.symbol,
          option_value: a.value_option_id?.value
        });
      }

      data.push({
        id: p._id,
        name: p.name,
        image: p.image,
        datasheet: p.datasheet || null,
        description: p.description,
        features: p.features,
        brand_id: p.brand_id?._id || p.brand_id,
        brand_name: p.brand_id?.brand_name || p.brand_id?.name || "Unknown Brand",
        brand_logo: p.brand_id?.logo || null,
        subtype_id: p.subtype_id?._id,
        subtype_name: p.subtype_id?.name,
        template_id: p.template_id?._id,
        template_name: p.template_id?.name,
        scope_ids: p.scope_ids || [],
        sku_count,
        sku_config: p.sku_config,
        specifications: p.specifications || [],
        attributes: Object.keys(grouped).map(g => ({ group_name: g, attributes: grouped[g] })),
        created_at: p.created_at
      });
    }

    return res.json({ status: "success", data });
  } catch (err) {
    return res.status(500).json({ status: "error", message: err.message });
  }
};

const update_product = async (req, res) => {
  try {
    const { product_id, name, description, features, brand_id, attributes, scope_ids, sku_config, remove_datasheet, specifications } = req.body;
    const parsedAttrs = parseJSON(attributes) || [];
    const parsedScopes = parseJSON(scope_ids) || [];
    const parsedFeatures = parseJSON(features) || [];
    const parsedSkuConfig = parseJSON(sku_config) || { template_len: 3, brand_len: 5, product_len: 4, subtype_len: 4 };

    const product = await Product.findOne({ _id: product_id, deleted_at: null });
    if (!product) throw new Error("Product not found");

    const image = req.files?.find(f => f.fieldname === "product_image");
    if (image && product.image) delete_uploaded_files([{ path: product.image }]);

    const datasheetFile = req.files?.find(f => f.fieldname === "product_datasheet");
    let updatedDatasheet = product.datasheet;
    if (datasheetFile) {
      if (product.datasheet) delete_uploaded_files([{ path: product.datasheet }]);
      updatedDatasheet = datasheetFile.path;
    } else if (remove_datasheet === "true" || remove_datasheet === true) {
      if (product.datasheet) delete_uploaded_files([{ path: product.datasheet }]);
      updatedDatasheet = null;
    }

    const updateSet = {
      name,
      description,
      features: parsedFeatures,
      brand_id: brand_id || product.brand_id,
      scope_ids: parsedScopes,
      image: image ? image.path : product.image,
      datasheet: updatedDatasheet,
      sku_config: parsedSkuConfig
    };

    if (specifications !== undefined) {
      const parsedSpecs = parseJSON(specifications) || [];
      updateSet.specifications = parsedSpecs;
    }

    await Product.updateOne({ _id: product._id }, { $set: updateSet });

    // Automatically update existing SKU codes to match the new length config
    const skus = await ProductSku.find({ product_id: product._id, deleted_at: null });
    for (const sku of skus) {
      const attrs = await ProductAttributeValue.find({ sku_id: sku._id })
        .populate('attribute_id')
        .lean();

      const attrsPayload = attrs.map(a => ({
        attribute_id: a.attribute_id?._id,
        value_text: a.value_text,
        value_number: a.value_number,
        value_boolean: a.value_boolean,
        value_option_id: a.value_option_id,
        unit_id: a.unit_id
      }));

      try {
        const newSkuCode = await generateSkuCode(product._id, attrsPayload, sku._id);
        await ProductSku.updateOne({ _id: sku._id }, { $set: { sku_code: newSkuCode } });
      } catch (err) {
        console.error(`Failed to update SKU code for SKU ${sku._id}: ${err.message}`);
      }
    }

    // Delete replaced attribute files from Cloudinary
    const oldAttrs = await ProductAttributeValue.find({ product_id: product._id, value_file: { $ne: null } }).lean();
    const fileMap = {};
    (req.files || []).forEach(f => {
      if (f.fieldname.startsWith("attribute_")) fileMap[f.fieldname.split("_")[1]] = f.path;
    });

    const replacedFiles = [];
    for (const oldAttr of oldAttrs) {
      const attrIdStr = oldAttr.attribute_id.toString();
      const newVal = parsedAttrs.find(a => String(a.attribute_id) === attrIdStr);
      if (fileMap[attrIdStr] || !newVal || !newVal.value_file) {
        replacedFiles.push({ path: oldAttr.value_file });
      }
    }
    if (replacedFiles.length > 0) {
      delete_uploaded_files(replacedFiles);
    }

    await ProductAttributeValue.deleteMany({ product_id: product._id });

    for (const attr of parsedAttrs) {
      await ProductAttributeValue.create({
        product_id: product._id,
        attribute_id: attr.attribute_id,
        value_text: attr.value_text || null,
        value_number: attr.value_number || null,
        value_boolean: attr.value_boolean || null,
        value_option_id: attr.value_option_id || null,
        unit_id: attr.unit_id || null,
        value_file: fileMap[attr.attribute_id] ? fileMap[attr.attribute_id] : attr.value_file
      });
    }

    return res.json({ status: "success", message: "Product updated" });
  } catch (err) {
    return res.status(500).json({ status: "error", message: err.message });
  }
};

const delete_product = async (req, res) => {
  try {
    const { product_id } = req.body;
    const product = await Product.findOneAndUpdate({ _id: product_id }, { $set: { deleted_at: new Date() } });
    if (!product) throw new Error("Product not found");
    await ProductSku.updateMany({ product_id: product._id, deleted_at: null }, { $set: { deleted_at: new Date() } });
    return res.json({ status: "success", message: "Product soft deleted" });
  } catch (err) {
    return res.status(500).json({ status: "error", message: err.message });
  }
};

// ================= SKU HANDLERS =================

const add_sku = async (req, res) => {
  try {
    const { product_id, skus } = req.body;
    if (!product_id || !mongoose.Types.ObjectId.isValid(product_id)) {
      return res.status(400).json({ status: "error", message: "Valid Product ID is required" });
    }
    const parsedSkus = parseJSON(skus) || [];
    if (!parsedSkus.length) {
      return res.status(400).json({ status: "error", message: "No SKU data provided" });
    }

    const product = await Product.findOne({ _id: product_id, deleted_at: null });
    if (!product) return res.status(404).json({ status: "error", message: "Product not found" });

    const fileMap = {};
    (req.files || []).forEach(f => {
      if (f.fieldname && f.fieldname.startsWith("attribute_")) {
        fileMap[f.fieldname.split("_")[1]] = f.path;
      }
    });

    for (const sku of parsedSkus) {
      const errors = await validateAttributes(product.subtype_id, sku.attributes || [], true);
      if (errors.length) {
        return res.status(400).json({ status: "error", message: errors[0] });
      }

      const sku_code = await generateSkuCode(product._id, sku.attributes || []);
      let newSku = await ProductSku.findOne({ sku_code, product_id: product._id, deleted_at: null });
      if (!newSku) {
        newSku = await ProductSku.create({ product_id: product._id, sku_code });
      }

      for (const attr of (sku.attributes || [])) {
        if (!attr.attribute_id || !mongoose.Types.ObjectId.isValid(attr.attribute_id)) continue;

        let numVal = null;
        if (attr.value_number !== null && attr.value_number !== undefined && !isNaN(attr.value_number)) {
          numVal = Number(attr.value_number);
        }

        let boolVal = null;
        if (attr.value_boolean !== null && attr.value_boolean !== undefined) {
          boolVal = Boolean(attr.value_boolean);
        }

        const optId = attr.value_option_id && mongoose.Types.ObjectId.isValid(attr.value_option_id) ? attr.value_option_id : null;
        const uId = attr.unit_id && mongoose.Types.ObjectId.isValid(attr.unit_id) ? attr.unit_id : null;

        await ProductAttributeValue.create({
          product_id: product._id,
          sku_id: newSku._id,
          attribute_id: attr.attribute_id,
          value_text: attr.value_text || null,
          value_number: numVal,
          value_boolean: boolVal,
          value_option_id: optId,
          unit_id: uId,
          value_file: fileMap[attr.attribute_id] || attr.value_file || null
        });
      }
    }
    return res.json({ status: "success", message: "SKUs created successfully" });
  } catch (err) {
    console.error("ADD_SKU ERROR:", err);
    return res.status(400).json({ status: "error", message: err.message || "Failed to create SKU" });
  }
};

const get_skus_by_product = async (req, res) => {
  try {
    const { product_id } = req.query;
    const skus = await ProductSku.find({ product_id, deleted_at: null }).sort({ created_at: -1 }).lean();
    const result = [];
    for (const sku of skus) {
      const attrs = await ProductAttributeValue.find({
        $or: [
          { sku_id: sku._id },
          { product_id: product_id, sku_id: null }
        ],
        deleted_at: null
      })
        .populate({
          path: 'attribute_id',
          populate: { path: 'group_id', select: 'name' }
        })
        .populate('unit_id', 'symbol')
        .populate('value_option_id', 'value')
        .lean();

      result.push({
        id: sku._id,
        sku_code: sku.sku_code,
        attributes: attrs
          .filter(a => a.attribute_id)
          .map(a => ({
            attribute_id: a.attribute_id?._id,
            attribute_name: a.attribute_id?.name,
            group_name: a.attribute_id?.group_id?.name || "Variant Specifications",
            data_type: a.attribute_id?.data_type,
            value_text: a.value_option_id ? a.value_option_id.value : a.value_text,
            value_number: a.value_number,
            value_boolean: a.value_boolean,
            value_option_id: a.value_option_id?._id,
            unit_id: a.unit_id?._id,
            option_value: a.value_option_id?.value,
            unit_symbol: a.unit_id?.symbol
          }))
      });
    }
    return res.json({ status: "success", data: result });
  } catch (err) {
    return res.status(500).json({ status: "error", message: err.message });
  }
};

const update_sku = async (req, res) => {
  try {
    const { sku_id, skus } = req.body;
    if (!sku_id || !mongoose.Types.ObjectId.isValid(sku_id)) {
      return res.status(400).json({ status: "error", message: "Valid SKU ID is required" });
    }
    const parsedSkus = parseJSON(skus) || [];
    const sku = await ProductSku.findOne({ _id: sku_id, deleted_at: null });
    if (!sku) return res.status(404).json({ status: "error", message: "SKU not found" });

    const attrs = parsedSkus[0]?.attributes || [];
    const newSkuCode = await generateSkuCode(sku.product_id, attrs, sku_id);

    await ProductSku.updateOne({ _id: sku._id }, { $set: { sku_code: newSkuCode } });
    await ProductAttributeValue.deleteMany({ sku_id: sku._id });

    const fileMap = {};
    (req.files || []).forEach(f => {
      if (f.fieldname && f.fieldname.startsWith("attribute_")) {
        fileMap[f.fieldname.split("_")[1]] = f.path;
      }
    });

    for (const attr of attrs) {
      if (!attr.attribute_id || !mongoose.Types.ObjectId.isValid(attr.attribute_id)) continue;

      let numVal = null;
      if (attr.value_number !== null && attr.value_number !== undefined && !isNaN(attr.value_number)) {
        numVal = Number(attr.value_number);
      }

      let boolVal = null;
      if (attr.value_boolean !== null && attr.value_boolean !== undefined) {
        boolVal = Boolean(attr.value_boolean);
      }

      const optId = attr.value_option_id && mongoose.Types.ObjectId.isValid(attr.value_option_id) ? attr.value_option_id : null;
      const uId = attr.unit_id && mongoose.Types.ObjectId.isValid(attr.unit_id) ? attr.unit_id : null;

      await ProductAttributeValue.create({
        product_id: sku.product_id,
        sku_id: sku._id,
        attribute_id: attr.attribute_id,
        value_text: attr.value_text || null,
        value_number: numVal,
        value_boolean: boolVal,
        value_option_id: optId,
        unit_id: uId,
        value_file: fileMap[attr.attribute_id] || attr.value_file || null
      });
    }
    return res.json({ status: "success", message: "SKU updated successfully" });
  } catch (err) {
    console.error("UPDATE_SKU ERROR:", err);
    return res.status(400).json({ status: "error", message: err.message || "Failed to update SKU" });
  }
};

const delete_sku = async (req, res) => {
  try {
    const { sku_id } = req.body;
    await ProductSku.updateOne({ _id: sku_id }, { $set: { deleted_at: new Date() } });
    return res.json({ status: "success", message: "SKU soft deleted" });
  } catch (err) {
    return res.status(500).json({ status: "error", message: err.message });
  }
};

const search_skus = async (req, res) => {
  try {
    const { term, type_id, template_id, brand_id, capacity, tolerance, subtype_id } = req.query;
    let matchStage = { deleted_at: null };

    if (term) {
      matchStage.$or = [
        { sku_code: { $regex: term, $options: "i" } }
      ];
    }

    const pipeline = [
      { $match: matchStage },
      {
        $lookup: {
          from: 'products',
          localField: 'product_id',
          foreignField: '_id',
          as: 'product'
        }
      },
      { $unwind: '$product' }
    ];

    if (template_id) {
      const ids = template_id.split(',')
        .map(id => id.trim())
        .filter(id => mongoose.Types.ObjectId.isValid(id))
        .map(id => new mongoose.Types.ObjectId(id));
      if (ids.length > 0) {
        pipeline.push({
          $match: { 'product.template_id': { $in: ids } }
        });
      }
    }

    if (subtype_id) {
      const resolvedIds = await resolveSubtypeIds(subtype_id);
      if (resolvedIds.length > 0) {
        pipeline.push({
          $match: { 'product.subtype_id': { $in: resolvedIds } }
        });
      }
    }

    if (brand_id && mongoose.Types.ObjectId.isValid(brand_id)) {
      pipeline.push({
        $match: { 'product.brand_id': new mongoose.Types.ObjectId(brand_id) }
      });
    }

    pipeline.push(
      {
        $lookup: {
          from: 'pc_product_templates',
          localField: 'product.template_id',
          foreignField: '_id',
          as: 'template'
        }
      },
      { $unwind: '$template' }
    );



    // CRITICAL: Enforce Operational Scope (Project Type Mapping)
    if (type_id) {
      const typeObjectId = new mongoose.Types.ObjectId(type_id);
      pipeline.push({
        $match: {
          $or: [
            { 'product.scope_ids': typeObjectId },
            { 'template.scope_ids': typeObjectId },
            // If template has NO scope, then product scope is checked (which we already do above)
            // If template HAS scope, it must match.
          ]
        }
      });
    }

    // Also filter by product name if term provided
    if (term) {
      pipeline.push({
        $match: {
          $or: [
            { sku_code: { $regex: term, $options: 'i' } },
            { 'product.name': { $regex: term, $options: 'i' } }
          ]
        }
      });
    }

    pipeline.push({
      $project: {
        id: '$_id',
        sku_code: 1,
        product_name: '$product.name',
        product_image: '$product.image',
        product_id: '$product._id',
        brand_id: '$product.brand_id',
        subtype_id: '$product.subtype_id',
        template_name: '$template.name'
      }
    });

    const data = await ProductSku.aggregate(pipeline);

    // Fetch attributes for all matching SKUs and parent products
    const skuIds = data.map(d => d._id);
    const productIds = data.map(d => d.product_id).filter(Boolean);
    const ProductAttributeValue = require('../models/core_db/product_attribute_values.schema');
    const attrs = await ProductAttributeValue.find({
      $or: [
        { sku_id: { $in: skuIds } },
        { product_id: { $in: productIds }, sku_id: null }
      ],
      deleted_at: null
    })
      .populate({ path: 'attribute_id', select: 'name data_type attribute_type' })
      .populate({ path: 'unit_id', select: 'symbol conversion_factor' })
      .populate({ path: 'value_option_id', select: 'value' })
      .lean();

    const attrsMap = {};
    for (const d of data) {
      attrsMap[d._id.toString()] = [];
    }

    for (const a of attrs) {
      if (!a.attribute_id) continue;
      const attrData = {
        attribute_id: a.attribute_id?._id,
        attribute_name: a.attribute_id?.name,
        attribute_type: a.attribute_id?.attribute_type || 'custom',
        data_type: a.attribute_id?.data_type,
        is_sku: a.attribute_id?.attribute_type === 'sku',
        is_capacity: a.attribute_id?.attribute_type === 'sku',
        is_tolerance: a.attribute_id?.attribute_type === 'tolerance' || a.attribute_id?.attribute_type === 'tollarance',
        value_number: a.value_number,
        value_text: a.value_option_id ? a.value_option_id.value : a.value_text,
        value_boolean: a.value_boolean,
        value_file: a.value_file,
        unit_symbol: a.unit_id?.symbol,
        conversion_factor: a.unit_id?.conversion_factor
      };

      if (a.sku_id) {
        const skuIdStr = a.sku_id.toString();
        if (attrsMap[skuIdStr]) {
          attrsMap[skuIdStr].push(attrData);
        }
      } else if (a.product_id) {
        const prodIdStr = a.product_id.toString();
        for (const d of data) {
          if (d.product_id && d.product_id.toString() === prodIdStr) {
            attrsMap[d._id.toString()].push(attrData);
          }
        }
      }
    }

    const finalData = data.map(d => ({
      ...d,
      attributes: attrsMap[d._id.toString()] || []
    }));

    // Do not filter SKUs out here based on required subtype attributes.
    // This avoids hiding valid SKUs when the database entry lacks a legacy attribute value.
    let filteredData = finalData;
    if (capacity) {
      const capVal = parseFloat(capacity);
      const tolVal = parseFloat(tolerance || 10);
      if (!isNaN(capVal)) {
        filteredData = filteredData.filter(sku => {
          // Skip capacity/tolerance filtering for Solar Panels
          if (sku.template_name === 'Solar Panel') return true;

          // Remove capacity/tolerance logic from micro-inverters
          const isMicro = (sku.sku_code || '').toLowerCase().includes('micro') || (sku.product_name || '').toLowerCase().includes('micro');
          if (isMicro) return true;

          // Find capacity attribute (sku parameter)
          const capAttr = sku.attributes.find(a => a.attribute_type === 'sku' || a.is_sku || a.is_capacity) ||
            sku.attributes.find(a => ['capacity', 'power rating', 'ac capacity', 'pmax', 'power'].includes((a.attribute_name || '').toLowerCase().trim()));
          if (!capAttr) return true; // Keep if no capacity attribute defined

          const rawCap = parseFloat(capAttr.value_number ?? capAttr.value_text ?? 0);
          if (isNaN(rawCap) || rawCap === 0) return true;

          // Convert to kW using conversion_factor or unit symbol
          let powerInKw = rawCap;
          if (typeof capAttr.conversion_factor === 'number') {
            powerInKw = (rawCap * capAttr.conversion_factor) / 1000;
          } else {
            const unit = (capAttr.unit_symbol || '').toLowerCase().trim();
            if (unit === 'w' || unit === 'wp' || unit === 'watt' || unit === 'watts') {
              powerInKw = rawCap / 1000;
            } else if (unit === 'mw' || unit === 'mwp' || unit === 'megawatt') {
              powerInKw = rawCap * 1000;
            }
          }

          // Get SKU tolerance
          const tolAttr = sku.attributes.find(a => a.attribute_type === 'tolerance' || a.attribute_type === 'tollarance' || a.is_tolerance) ||
            sku.attributes.find(a => (a.attribute_name || '').toLowerCase().includes('tolerance'));
          let skuTol = tolVal;
          if (tolAttr) {
            const rawTol = parseFloat(tolAttr.value_number ?? tolAttr.value_text ?? 0);
            if (!isNaN(rawTol) && rawTol !== 0) {
              if (Math.abs(rawTol - tolVal) > 2) {
                return false;
              }
              skuTol = rawTol;
            }
          }

          const minCap = capVal * (1 - skuTol / 100);
          const maxCap = capVal * (1 + skuTol / 100);

          return powerInKw >= minCap && powerInKw <= maxCap;
        });
      }
    }

    return res.json({ status: "success", data: filteredData });
  } catch (err) {
    return res.status(500).json({ status: "error", message: err.message });
  }
};

const update_product_specifications = async (req, res) => {
  try {
    const { product_id, specifications } = req.body;
    if (!product_id) {
      return res.status(400).json({ status: "error", message: "Product ID is required." });
    }

    const parsedSpecs = parseJSON(specifications) || [];
    const formatted = parsedSpecs.map((s, idx) => ({
      id: s.id || `spec-${Date.now()}-${idx + 1}`,
      key: s.key || s.specification || s.name || "",
      value: s.value !== undefined ? String(s.value).trim() : "",
      group: s.group || s.category || "General Specifications",
      order: s.order !== undefined ? Number(s.order) : idx + 1
    })).filter(s => s.key && s.key.trim() !== "");

    const updated = await Product.findByIdAndUpdate(
      product_id,
      { $set: { specifications: formatted } },
      { new: true }
    );

    if (!updated) {
      return res.status(404).json({ status: "error", message: "Product not found." });
    }

    return res.status(200).json({
      status: "success",
      message: "Product specifications updated successfully!",
      data: {
        id: updated._id,
        specifications: updated.specifications
      }
    });
  } catch (error) {
    console.error("Error updating product specifications:", error);
    return res.status(500).json({ status: "error", message: error.message || "Failed to update specifications" });
  }
};

const upload_product_datasheet = async (req, res) => {
  try {
    const { product_id } = req.body;
    if (!product_id) {
      return res.status(400).json({ status: "error", message: "Product ID is required." });
    }

    let uploadedUrl = null;
    if (req.files && req.files.length > 0) {
      const datasheetFile = req.files.find(f => f.fieldname === "product_datasheet" || f.fieldname === "datasheet") || req.files[0];
      if (datasheetFile) uploadedUrl = datasheetFile.path;
    } else if (req.body.datasheet) {
      uploadedUrl = req.body.datasheet;
    }

    if (!uploadedUrl) {
      return res.status(400).json({ status: "error", message: "No PDF datasheet file was provided." });
    }

    const product = await Product.findById(product_id);
    if (!product) {
      return res.status(404).json({ status: "error", message: "Product not found." });
    }

    const oldDatasheet = product.datasheet;
    product.datasheet = uploadedUrl;
    await product.save();

    if (oldDatasheet && oldDatasheet !== uploadedUrl) {
      delete_uploaded_files([{ path: oldDatasheet }]);
    }

    return res.status(200).json({
      status: "success",
      message: "Product datasheet uploaded successfully!",
      data: { id: product._id, datasheet: uploadedUrl }
    });
  } catch (error) {
    console.error("Error uploading product datasheet:", error);
    return res.status(500).json({ status: "error", message: error.message || "Failed to upload datasheet" });
  }
};

const remove_product_datasheet = async (req, res) => {
  try {
    const { product_id } = req.body;
    if (!product_id) {
      return res.status(400).json({ status: "error", message: "Product ID is required." });
    }

    const product = await Product.findById(product_id);
    if (!product) {
      return res.status(404).json({ status: "error", message: "Product not found." });
    }

    if (product.datasheet) {
      delete_uploaded_files([{ path: product.datasheet }]);
    }

    product.datasheet = null;
    await product.save();

    return res.status(200).json({
      status: "success",
      message: "Product datasheet removed successfully!",
      data: { id: product._id, datasheet: null }
    });
  } catch (error) {
    console.error("Error removing product datasheet:", error);
    return res.status(500).json({ status: "error", message: error.message || "Failed to remove datasheet" });
  }
};

module.exports = {
  create_product,
  get_products,
  update_product,
  delete_product,
  update_product_specifications,
  upload_product_datasheet,
  remove_product_datasheet,
  add_sku,
  get_skus_by_product,
  update_sku,
  delete_sku,
  search_skus,
  get_sku_details: async (req, res) => {
    try {
      const { sku_id } = req.query;
      if (!sku_id) return res.status(400).json({ status: "error", message: "sku_id is required" });
      const sku = await ProductSku.findOne({ _id: sku_id, deleted_at: null })
        .populate({
          path: 'product_id',
          populate: [
            { path: 'template_id' },
            { path: 'brand_id' }
          ]
        })
        .lean();
      if (!sku) return res.status(404).json({ status: "error", message: "SKU not found" });
      const attrs = await ProductAttributeValue.find({
        $or: [
          { sku_id: sku._id },
          { product_id: sku.product_id?._id || sku.product_id, sku_id: null }
        ],
        deleted_at: null
      })
        .populate({ path: 'attribute_id', select: 'name data_type attribute_type' })
        .populate('unit_id', 'symbol conversion_factor')
        .populate({ path: 'value_option_id', select: 'value' })
        .lean();
      return res.json({
        status: "success",
        data: {
          id: sku._id,
          sku_code: sku.sku_code,
          product_name: sku.product_id?.name,
          product_image: sku.product_id?.image,
          product_description: sku.product_id?.description,
          product_features: sku.product_id?.features || [],
          brand_name: sku.product_id?.brand_id?.brand_name || sku.product_id?.brand_id?.name,
          attributes: attrs
            .filter(a => a.attribute_id)
            .map(a => ({
              attribute_name: a.attribute_id?.name,
              attribute_type: a.attribute_id?.attribute_type || 'custom',
              data_type: a.attribute_id?.data_type,
              is_sku: a.attribute_id?.attribute_type === 'sku',
              is_capacity: a.attribute_id?.attribute_type === 'sku',
              is_tolerance: a.attribute_id?.attribute_type === 'tolerance' || a.attribute_id?.attribute_type === 'tollarance',
              value_number: a.value_number,
              value_text: a.value_option_id ? a.value_option_id.value : a.value_text,
              value_boolean: a.value_boolean,
              unit_symbol: a.unit_id?.symbol,
              conversion_factor: a.unit_id?.conversion_factor
            }))
        }
      });
    } catch (err) {
      return res.status(500).json({ status: "error", message: err.message });
    }
  }
};

// Debug endpoint: returns SKUs plus diagnostics explaining missing required attributes and capacity/tolerance match
module.exports.debug_search_skus = async (req, res) => {
  try {
    const { term, type_id, template_id, brand_id, capacity, tolerance, subtype_id } = req.query;
    let matchStage = { deleted_at: null };

    if (term) {
      matchStage.$or = [
        { sku_code: { $regex: term, $options: "i" } }
      ];
    }

    const pipeline = [
      { $match: matchStage },
      {
        $lookup: {
          from: 'products',
          localField: 'product_id',
          foreignField: '_id',
          as: 'product'
        }
      },
      { $unwind: '$product' }
    ];

    if (template_id) {
      const ids = template_id.split(',').map(id => new mongoose.Types.ObjectId(id.trim()));
      pipeline.push({ $match: { 'product.template_id': { $in: ids } } });
    }

    if (subtype_id) {
      const resolvedIds = await resolveSubtypeIds(subtype_id);
      pipeline.push({ $match: { 'product.subtype_id': { $in: resolvedIds } } });
    }

    if (brand_id) {
      pipeline.push({ $match: { 'product.brand_id': new mongoose.Types.ObjectId(brand_id) } });
    }

    pipeline.push(
      { $lookup: { from: 'pc_product_templates', localField: 'product.template_id', foreignField: '_id', as: 'template' } },
      { $unwind: '$template' }
    );

    if (type_id) {
      const typeObjectId = new mongoose.Types.ObjectId(type_id);
      pipeline.push({ $match: { $or: [{ 'product.scope_ids': typeObjectId }, { 'template.scope_ids': typeObjectId }] } });
    }

    pipeline.push({
      $project: {
        _id: 1,
        id: '$_id',
        sku_code: 1,
        product_name: '$product.name',
        product_image: '$product.image',
        product_id: '$product._id',
        subtype_id: '$product.subtype_id',
        template_name: '$template.name'
      }
    });

    const data = await ProductSku.aggregate(pipeline);

    // Fetch attributes for all matching SKUs and parent products
    const skuIds = data.map(d => d._id);
    const productIds = data.map(d => d.product_id).filter(Boolean);
    const ProductAttributeValue = require('../models/core_db/product_attribute_values.schema');
    const attrs = await ProductAttributeValue.find({
      $or: [{ sku_id: { $in: skuIds } }, { product_id: { $in: productIds }, sku_id: null }],
      deleted_at: null
    })
      .populate({ path: 'attribute_id', select: 'name data_type attribute_type' })
      .populate({ path: 'unit_id', select: 'symbol conversion_factor' })
      .populate({ path: 'value_option_id', select: 'value' })
      .lean();

    const attrsMap = {};
    for (const d of data) attrsMap[d._id.toString()] = [];

    for (const a of attrs) {
      const attrData = {
        attribute_id: a.attribute_id?._id,
        attribute_name: a.attribute_id?.name,
        attribute_type: a.attribute_id?.attribute_type || 'custom',
        data_type: a.attribute_id?.data_type,
        is_sku: a.attribute_id?.attribute_type === 'sku',
        is_tolerance: a.attribute_id?.attribute_type === 'tolerance' || a.attribute_id?.attribute_type === 'tollarance',
        value_number: a.value_number,
        value_text: a.value_option_id ? a.value_option_id.value : a.value_text,
        unit_symbol: a.unit_id?.symbol,
        conversion_factor: a.unit_id?.conversion_factor
      };

      if (a.sku_id) {
        const skuIdStr = a.sku_id.toString();
        if (attrsMap[skuIdStr]) attrsMap[skuIdStr].push(attrData);
      } else if (a.product_id) {
        const prodIdStr = a.product_id.toString();
        for (const d of data) {
          if (d.product_id && d.product_id.toString() === prodIdStr) attrsMap[d._id.toString()].push(attrData);
        }
      }
    }

    // Required attributes per subtype
    const SubtypeAttribute = require('../models/core_db/subtype_attributes.schema');
    const uniqueSubtypeIds = [...new Set(data.map(d => d.subtype_id ? d.subtype_id.toString() : null).filter(Boolean))];
    const reqSubAttrs = uniqueSubtypeIds.length > 0
      ? await SubtypeAttribute.find({ subtype_id: { $in: uniqueSubtypeIds }, is_required: true, deleted_at: null }).lean()
      : [];

    const reqAttrsMap = {};
    for (const ra of reqSubAttrs) {
      const subIdStr = ra.subtype_id.toString();
      if (!reqAttrsMap[subIdStr]) reqAttrsMap[subIdStr] = [];
      reqAttrsMap[subIdStr].push(ra);
    }

    const finalData = data.map(d => ({ ...d, attributes: attrsMap[d._id.toString()] || [] }));

    // Build diagnostics
    const diagnostics = finalData.map(sku => {
      const diag = { sku_id: sku._id, sku_code: sku.sku_code, missing_required: [], capacity_match: true };
      const subIdStr = sku.subtype_id ? sku.subtype_id.toString() : "";
      const requiredList = reqAttrsMap[subIdStr] || [];
      for (const ra of requiredList) {
        let attrVal = sku.attributes.find(a => a.attribute_id && a.attribute_id.toString() === ra._id.toString());
        if (!attrVal && (ra.name === 'Capacity' || ra.name === 'Pmax' || ra.name === 'Power' || ra.name === 'AC Capacity' || ra.name === 'Power Rating')) {
          attrVal = sku.attributes.find(a => a.attribute_name === 'Capacity' || a.attribute_name === 'Pmax' || a.attribute_name === 'Power' || a.attribute_name === 'AC Capacity' || a.attribute_name === 'Power Rating');
        }
        if (!attrVal) diag.missing_required.push({ attribute_id: ra._id, attribute_name: ra.name });
      }

      if (capacity) {
        if (sku.template_name === 'Solar Panel') {
          diag.capacity_match = true;
        } else {
          const capVal = parseFloat(capacity);
          const tolVal = parseFloat(tolerance || 10);
          const capAttr = sku.attributes.find(a => a.attribute_type === 'sku' || a.is_sku || a.is_capacity) ||
            sku.attributes.find(a => ['capacity', 'power rating', 'ac capacity', 'pmax', 'power'].includes((a.attribute_name || '').toLowerCase().trim()));
          if (capAttr) {
            const rawCap = parseFloat(capAttr.value_number ?? capAttr.value_text ?? 0);
            let powerInKw = rawCap;
            if (typeof capAttr.conversion_factor === 'number') powerInKw = (rawCap * capAttr.conversion_factor) / 1000;
            else {
              const unit = (capAttr.unit_symbol || '').toLowerCase().trim();
              if (unit === 'w' || unit === 'wp') powerInKw = rawCap / 1000; else if (unit === 'mw' || unit === 'mwp') powerInKw = rawCap * 1000;
            }
            const tolAttr = sku.attributes.find(a => a.attribute_type === 'tolerance' || a.attribute_type === 'tollarance' || a.is_tolerance) ||
              sku.attributes.find(a => (a.attribute_name || '').toLowerCase().includes('tolerance'));
            let skuTol = tolVal;
            let tolMismatch = false;
            if (tolAttr) {
              const rawTol = parseFloat(tolAttr.value_number ?? tolAttr.value_text ?? 0);
              if (!isNaN(rawTol) && rawTol !== 0) {
                if (Math.abs(rawTol - tolVal) > 2) {
                  tolMismatch = true;
                }
                skuTol = rawTol;
              }
            }
            const minCap = capVal * (1 - skuTol / 100);
            const maxCap = capVal * (1 + skuTol / 100);
            diag.capacity_match = !tolMismatch && !(powerInKw < minCap || powerInKw > maxCap);
          }
        }
      }

      return diag;
    });

    return res.json({ status: 'success', data: finalData, diagnostics });
  } catch (err) {
    return res.status(500).json({ status: 'error', message: err.message });
  }
};

module.exports.generateSkuCode = generateSkuCode;