const mongoose = require('mongoose');
const ProductTemplate = require('../models/core_db/product_templates.schema');
const ProductSubtype = require('../models/core_db/product_subtypes.schema');
const SubtypeAttributeGroup = require('../models/core_db/subtype_attribute_groups.schema');
const SubtypeAttribute = require('../models/core_db/subtype_attributes.schema');
const AttributeOption = require('../models/core_db/attribute_options.schema');
const BrandSubtypeMap = require('../models/core_db/brand_subtype_map.schema');
const Brand = require('../models/core_db/brands.schema');
const SubtypeScopeMap = require('../models/core_db/subtype_scope_map.schema');
const Product = require('../models/core_db/products.schema');
const ProjectSubcategory = require('../models/core_db/project_subcategories.schema');
const BrandTemplateMap = require('../models/core_db/brand_template_map.schema');
const ProjectSubcategoryType = require('../models/core_db/project_subcategory_types.schema');

const successResponse = (message, data = null) => ({
    status: "success",
    message,
    data,
});

const errorResponse = (res, code, message) =>
    res.status(code).json({ status: "error", message, data: null });

const RESERVED_SYSTEM_TEMPLATES = ["solar panel", "inverter", "battery", "acdb", "dcdb"];
const TEMPLATE_WITH_POWER_CAPACITY = ["solar panel", "inverter"];
const TEMPLATE_WITH_CURRENT_CAPACITY = ["acdb", "dcdb"];
const TEMPLATE_WITH_PHASE_ATTRIBUTE = ["inverter", "acdb"];
const normalizeTemplateName = (name) => String(name || "").toLowerCase().trim();

// ================= TEMPLATE =================
const createProductTemplate = async (req, res) => {
    try {
        const { name, description, qty_unit_id } = req.body;
        if (!name) return errorResponse(res, 400, "Name is required");

        const nameTrimmed = name.trim();
        const nameLower = normalizeTemplateName(name);
        if (RESERVED_SYSTEM_TEMPLATES.includes(nameLower)) {
            return errorResponse(res, 400, "Template name already exists (system reserved)");
        }

        const exists = await ProductTemplate.findOne({ name: nameTrimmed, deleted_at: null });
        if (exists) return errorResponse(res, 400, "Template name already exists");

        const result = await ProductTemplate.create({
            name: nameTrimmed,
            description: description || null,
            qty_unit_id: qty_unit_id || null
        });

        res.json(successResponse("Template created", { id: result._id }));
    } catch (err) { errorResponse(res, 500, "Internal error"); }
};

const updateProductTemplate = async (req, res) => {
    try {
        const { id, name, description, qty_unit_id } = req.body;
        const template = await ProductTemplate.findById(id);
        if (!template) return errorResponse(res, 404, "Template not found");

        if (template.is_system) {
            if (name && name.trim().toLowerCase() !== template.name.toLowerCase()) {
                return errorResponse(res, 400, "Cannot change the name of a system template");
            }
        }

        await ProductTemplate.updateOne(
            { _id: id },
            {
                $set: {
                    name: template.is_system ? template.name : name.trim(),
                    description: description || null,
                    qty_unit_id: qty_unit_id !== undefined ? qty_unit_id : template.qty_unit_id
                }
            }
        );
        res.json(successResponse("Template updated"));
    } catch (err) { errorResponse(res, 500, "Internal error"); }
};

const listProductTemplates = async (req, res) => {
    try {
        const rows = await ProductTemplate.find({ deleted_at: null })
            .populate({ path: 'qty_unit_id', populate: { path: 'unit_group_id' } })
            .sort({ name: 1 })
            .lean();

        const data = await Promise.all(rows.map(async r => {
            const subtype_count = await ProductSubtype.countDocuments({ template_id: r._id, deleted_at: null });
            return {
                id: r._id,
                name: r.name,
                description: r.description,
                is_system: !!r.is_system,
                qty_unit_id: r.qty_unit_id?._id || r.qty_unit_id || null,
                qty_unit_name: r.qty_unit_id?.name || null,
                qty_unit_symbol: r.qty_unit_id?.symbol || null,
                qty_unit_group_name: r.qty_unit_id?.unit_group_id?.name || null,
                subtype_count,
                created_at: r.created_at
            };
        }));
        res.json(successResponse("Templates", data));
    } catch (err) {
        console.error("Error in listProductTemplates:", err);
        errorResponse(res, 500, "Internal error");
    }
};

// ================= SUBTYPE =================
const createSubtype = async (req, res) => {
    try {
        const { name, template_id } = req.body;
        const template = await ProductTemplate.findOne({ _id: template_id, deleted_at: null });
        if (!template) return errorResponse(res, 400, "Invalid template_id");

        const result = await ProductSubtype.create({
            name: name.trim(),
            template_id: template._id
        });

        // Auto add one sku attribute
        await ensureSkuAttribute(result._id, template._id);
        await ensurePhaseAttribute(result._id, template._id);
        await ensureToleranceAttribute(result._id, template._id);
        await ensureMicroInverterAttributes(result._id, template._id);

        res.json(successResponse("Subtype created", { id: result._id }));
    } catch (err) {
        console.error("Error in createSubtype:", err);
        errorResponse(res, 500, "Internal error");
    }
};

const updateSubtype = async (req, res) => {
    try {
        const { id, name, template_id } = req.body;
        const subtype = await ProductSubtype.findOne({ _id: id, deleted_at: null });
        if (!subtype) return errorResponse(res, 404, "Subtype not found");

        if (subtype.is_system) {
            // System subtypes are locked — name and template cannot be changed
            return errorResponse(res, 403, `Cannot modify system subtype '${subtype.name}'. It is locked by the system.`);
        }

        const updates = {};
        if (name && name.trim()) updates.name = name.trim();
        if (template_id) updates.template_id = template_id;

        await ProductSubtype.updateOne({ _id: id }, { $set: updates });
        res.json(successResponse("Subtype updated"));
    } catch (err) {
        console.error("Error in updateSubtype:", err);
        errorResponse(res, 500, "Internal error");
    }
};

const listSubtypes = async (req, res) => {
    try {
        const { template_id } = req.query;
        const filter = { deleted_at: null };
        if (template_id) filter.template_id = template_id;

        const rows = await ProductSubtype.find(filter).sort({ name: 1 });
        const data = await Promise.all(rows.map(async r => {
            const product_count = await Product.countDocuments({ subtype_id: r._id, deleted_at: null });
            return {
                id: r._id,
                name: r.name,
                template_id: r.template_id,
                is_system: !!r.is_system,
                product_count,
                created_at: r.created_at
            };
        }));
        res.json(successResponse("Subtypes", data));
    } catch (err) {
        console.error("Error in listSubtypes:", err);
        errorResponse(res, 500, "Internal error");
    }
};

// ================= SUBTYPE SCOPE MAPPING =================
const createSubtypeScope = async (req, res) => {
    try {
        const { subtype_id, scopes, subcategory_type_id, project_type_range_id } = req.body;
        let added = 0;
        let duplicates = 0;

        if (!subtype_id) return errorResponse(res, 400, "subtype_id required");

        // Handle both formats, keeping backward compatibility
        const normalizedScopes = Array.isArray(scopes)
            ? scopes.map(s => s.subcategory_type_id || s.project_type_range_id)
            : (subcategory_type_id ? [subcategory_type_id] : (project_type_range_id ? [project_type_range_id] : []));

        if (normalizedScopes.length === 0) return errorResponse(res, 400, "No scopes provided");

        const subtypeObjectId = mongoose.isValidObjectId(subtype_id) ? new mongoose.Types.ObjectId(subtype_id) : subtype_id;

        for (const typeMapId of normalizedScopes) {
            if (!typeMapId) continue;

            const typeMapObjectId = mongoose.isValidObjectId(typeMapId) ? new mongoose.Types.ObjectId(typeMapId) : typeMapId;

            const exists = await SubtypeScopeMap.findOne({
                subtype: subtypeObjectId,
                subcategory_type: typeMapObjectId
            });

            if (exists) {
                duplicates++;
            } else {
                await SubtypeScopeMap.create({
                    subtype: subtypeObjectId,
                    subcategory_type: typeMapObjectId
                });
                added++;
            }
        }
        res.json(successResponse("Scopes processed", { added, duplicates }));
    } catch (err) { errorResponse(res, 500, err.message || "Internal error"); }
};

const deleteSubtypeScope = async (req, res) => {
    try {
        const id = req.query.id || req.body.id;
        if (!id) return errorResponse(res, 400, "id required");
        const deleteId = mongoose.isValidObjectId(id) ? new mongoose.Types.ObjectId(id) : id;
        await SubtypeScopeMap.deleteOne({ _id: deleteId });
        res.json(successResponse("Scope deleted"));
    } catch (err) { errorResponse(res, 500, "Internal error"); }
};

// ================= ATTRIBUTE GROUP =================
const createAttributeGroup = async (req, res) => {
    try {
        const { name, names, subtype_id } = req.body;
        if (!subtype_id) return errorResponse(res, 400, "subtype_id required");

        const groupNames = Array.isArray(names) ? names : (name ? [name] : []);
        if (groupNames.length === 0) return errorResponse(res, 400, "Name(s) required");

        const results = [];
        for (const gn of groupNames) {
            const result = await SubtypeAttributeGroup.create({
                name: gn.trim(),
                subtype_id: subtype_id
            });
            results.push({ id: result._id, name: result.name });
        }

        res.json(successResponse("Groups processed", results));
    } catch (err) {
        console.error(err);
        errorResponse(res, 500, "Internal error");
    }
};

const updateAttributeGroup = async (req, res) => {
    try {
        const { id, name } = req.body;
        const group = await SubtypeAttributeGroup.findById(id);
        if (!group) return errorResponse(res, 404, "Group not found");

        // Check if any attribute in this group is system or engineering — if so, group name is system-managed
        const hasSystemAttr = await SubtypeAttribute.findOne({
            group_id: id,
            $or: [{ is_system: true }, { attribute_type: 'engineering' }],
            deleted_at: null
        });
        if (hasSystemAttr) {
            return errorResponse(res, 403, "This attribute group contains system or engineering attributes and cannot be renamed");
        }

        await SubtypeAttributeGroup.updateOne({ _id: id }, { $set: { name: name.trim() } });
        res.json(successResponse("Group updated"));
    } catch (err) { errorResponse(res, 500, "Internal error"); }
};

const listAttributeGroups = async (req, res) => {
    try {
        const { subtype_id, template_id } = req.query;
        const filter = { deleted_at: null };

        if (subtype_id) {
            filter.subtype_id = subtype_id;
        } else if (template_id) {
            const subtypes = await ProductSubtype.find({ template_id, deleted_at: null });
            filter.subtype_id = { $in: subtypes.map(s => s._id) };
        }

        const rows = await SubtypeAttributeGroup.find(filter).sort({ display_order: 1, name: 1 });
        const data = rows.map(r => ({
            id: r._id,
            name: r.name,
            subtype_id: r.subtype_id,
            display_order: r.display_order || 0
        }));
        res.json(successResponse("Groups", data));
    } catch (err) { errorResponse(res, 500, "Internal error"); }
};

// ================= ATTRIBUTE =================
const ensureSkuAttribute = async (subtypeId, templateId) => {
    const existing = await SubtypeAttribute.findOne({
        subtype_id: subtypeId,
        attribute_type: 'sku',
        deleted_at: null
    });
    if (!existing) {
        let resolvedTemplateId = templateId;
        if (!resolvedTemplateId) {
            const subtype = await ProductSubtype.findById(subtypeId);
            resolvedTemplateId = subtype?.template_id;
        }

        const template = await ProductTemplate.findById(resolvedTemplateId);
        const templateName = normalizeTemplateName(template?.name);
        const isPowerCapacity = TEMPLATE_WITH_POWER_CAPACITY.includes(templateName);
        const isCurrentCapacity = TEMPLATE_WITH_CURRENT_CAPACITY.includes(templateName);

        let unitGroupId = null;
        let dataType = "text";
        if (isPowerCapacity || isCurrentCapacity) {
            dataType = "number";
            const UnitGroup = require('../models/core_db/unit_groups.schema');
            const targetGroup = await UnitGroup.findOne({ name: isPowerCapacity ? /Power/i : /Current/i });
            if (targetGroup) {
                unitGroupId = targetGroup._id;
            }
        }

        let attributeName = "Capacity";
        if (templateName === "inverter") {
            attributeName = "AC Capacity";
        } else if (["cable", "wire"].includes(templateName)) {
            attributeName = "Cross Section";
        } else if (["mounting structure", "mounting_structure"].includes(templateName)) {
            attributeName = "Panel Capacity";
        }

        await SubtypeAttribute.create({
            name: attributeName,
            subtype_id: subtypeId,
            data_type: dataType,
            unit_group_id: unitGroupId,
            is_required: true,
            is_variant: true,
            is_filterable: true,
            attribute_type: 'sku'
        });
    }
};

const ensurePhaseAttribute = async (subtypeId, templateId) => {
    const subtype = await ProductSubtype.findById(subtypeId);
    const resolvedTemplateId = templateId || subtype?.template_id;
    const template = await ProductTemplate.findById(resolvedTemplateId);
    const templateName = normalizeTemplateName(template?.name);
    if (!TEMPLATE_WITH_PHASE_ATTRIBUTE.includes(templateName)) return;

    let existingPhase = await SubtypeAttribute.findOne({
        subtype_id: subtypeId,
        deleted_at: null,
        $or: [
            { attribute_type: 'phase' },
            { name: { $regex: /^phase$/i } }
        ]
    });

    if (existingPhase) {
        if (existingPhase.attribute_type !== 'phase') {
            await SubtypeAttribute.updateOne(
                { _id: existingPhase._id },
                { $set: { attribute_type: 'phase', is_system: true, data_type: 'dropdown', is_required: true, is_variant: false, is_filterable: true } }
            );
        }

        const optionCount = await AttributeOption.countDocuments({ attribute_id: existingPhase._id, deleted_at: null });
        if (optionCount === 0) {
            await AttributeOption.create([
                { attribute_id: existingPhase._id, value: "Single Phase", display_order: 1 },
                { attribute_id: existingPhase._id, value: "Three Phase", display_order: 2 }
            ]);
        }
        return;
    }

    const phaseAttr = await SubtypeAttribute.create({
        name: "Phase",
        subtype_id: subtypeId,
        data_type: "dropdown",
        is_required: true,
        is_variant: false,
        is_filterable: true,
        is_system: true,
        attribute_type: "phase"
    });

    await AttributeOption.create([
        { attribute_id: phaseAttr._id, value: "Single Phase", display_order: 1 },
        { attribute_id: phaseAttr._id, value: "Three Phase", display_order: 2 }
    ]);
};

const ensureToleranceAttribute = async (subtypeId, templateId) => {
    const subtype = await ProductSubtype.findById(subtypeId);
    const resolvedTemplateId = templateId || subtype?.template_id;
    const template = await ProductTemplate.findById(resolvedTemplateId);
    const templateName = normalizeTemplateName(template?.name);
    if (templateName !== "inverter") return;

    let existingTolerance = await SubtypeAttribute.findOne({
        subtype_id: subtypeId,
        deleted_at: null,
        $or: [
            { attribute_type: 'tolerance' },
            { attribute_type: 'tollarance' },
            { name: { $regex: /^tolerance$/i } }
        ]
    });

    if (existingTolerance) {
        if (existingTolerance.attribute_type !== 'tolerance') {
            await SubtypeAttribute.updateOne(
                { _id: existingTolerance._id },
                { $set: { attribute_type: 'tolerance', is_system: true, data_type: 'dropdown', is_required: true, is_variant: true, is_filterable: true } }
            );
        }

        const optionCount = await AttributeOption.countDocuments({ attribute_id: existingTolerance._id, deleted_at: null });
        if (optionCount === 0) {
            await AttributeOption.create([
                { attribute_id: existingTolerance._id, value: "5", display_order: 1 },
                { attribute_id: existingTolerance._id, value: "10", display_order: 2 },
                { attribute_id: existingTolerance._id, value: "15", display_order: 3 }
            ]);
        }
        return;
    }

    const toleranceAttr = await SubtypeAttribute.create({
        name: "Tolerance",
        subtype_id: subtypeId,
        data_type: "dropdown",
        is_required: true,
        is_variant: true,
        is_filterable: true,
        is_system: true,
        attribute_type: "tolerance"
    });

    await AttributeOption.create([
        { attribute_id: toleranceAttr._id, value: "5", display_order: 1 },
        { attribute_id: toleranceAttr._id, value: "10", display_order: 2 },
        { attribute_id: toleranceAttr._id, value: "15", display_order: 3 }
    ]);
};

const ensureMicroInverterAttributes = async (subtypeId, templateId) => {
    const subtype = await ProductSubtype.findById(subtypeId);
    const resolvedTemplateId = templateId || subtype?.template_id;
    const template = await ProductTemplate.findById(resolvedTemplateId);
    const templateName = normalizeTemplateName(template?.name);
    if (templateName !== "inverter") return;

    const subtypeNameLower = String(subtype?.name || "").toLowerCase().trim();
    const isMicro = subtypeNameLower.includes("microinverter") || subtypeNameLower.includes("micro inverter") || subtypeNameLower === "micro";
    if (!isMicro) return;

    const UnitGroup = require('../models/core_db/unit_groups.schema');
    const powerUnitGroup = await UnitGroup.findOne({ name: /Power/i });
    const powerUnitGroupId = powerUnitGroup ? powerUnitGroup._id : null;
    const countUnitGroup = await UnitGroup.findOne({ name: /Count/i });
    const countUnitGroupId = countUnitGroup ? countUnitGroup._id : null;

    // Helper to ensure Subtype Attributes exist
    const getOrCreateAttribute = async (name, data_type, attr_type, unitGroupId) => {
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
        } else {
            attr.attribute_type = attr_type;
            attr.data_type = data_type;
            attr.is_variant = isVar;
            attr.is_system = true;
            if (unitGroupId) attr.unit_group_id = unitGroupId;
            await attr.save();
        }
        return attr;
    };

    // 1. Rename existing attributes if they exist
    await SubtypeAttribute.updateOne(
        { subtype_id: subtypeId, name: 'Power Rating', deleted_at: null },
        { $set: { name: 'AC Capacity', attribute_type: 'sku', is_variant: true } }
    );
    await SubtypeAttribute.updateOne(
        { subtype_id: subtypeId, name: 'Connected Panels', deleted_at: null },
        { $set: { name: 'Total PV Inputs', attribute_type: 'sku', is_variant: true, data_type: 'number', unit_group_id: countUnitGroupId } }
    );
    await SubtypeAttribute.updateOne(
        { subtype_id: subtypeId, name: 'Maximum Input Watt', deleted_at: null },
        { $set: { name: 'Max Panel Power', attribute_type: 'sku', is_variant: true } }
    );
    await SubtypeAttribute.updateOne(
        { subtype_id: subtypeId, name: 'Max Panel Watt', deleted_at: null },
        { $set: { name: 'Max Panel Power', attribute_type: 'sku', is_variant: true } }
    );
    await SubtypeAttribute.updateOne(
        { subtype_id: subtypeId, name: 'Minimum Input Watt', deleted_at: null },
        { $set: { name: 'Min Panel Power', attribute_type: 'sku', is_variant: true } }
    );

    // Remove 'Tolerance' attribute for micro subtype if it exists
    const tolAttr = await SubtypeAttribute.findOne({ subtype_id: subtypeId, name: 'Tolerance', deleted_at: null });
    if (tolAttr) {
        await AttributeOption.deleteMany({ attribute_id: tolAttr._id });
        await SubtypeAttribute.deleteOne({ _id: tolAttr._id });
    }

    // 2. Ensure attributes exist with correct properties
    await getOrCreateAttribute('AC Capacity', 'number', 'sku', powerUnitGroupId);
    const microPhaseAttr = await getOrCreateAttribute('Phase', 'dropdown', 'phase', null);
    
    // Ensure Single Phase option exists for Phase attribute
    const optCount = await AttributeOption.countDocuments({ attribute_id: microPhaseAttr._id, deleted_at: null });
    if (optCount === 0) {
        await AttributeOption.create({
            attribute_id: microPhaseAttr._id,
            value: 'Single Phase',
            display_order: 1
        });
    }

    await getOrCreateAttribute('MPPT Count', 'number', 'sku', countUnitGroupId);
    await getOrCreateAttribute('Strings per MPPT', 'number', 'sku', countUnitGroupId);
    await getOrCreateAttribute('Total PV Inputs', 'number', 'sku', countUnitGroupId);
    await getOrCreateAttribute('Max Panel Power', 'number', 'sku', powerUnitGroupId);
    await getOrCreateAttribute('Min Panel Power', 'number', 'sku', powerUnitGroupId);
    await getOrCreateAttribute('Max DC Input Power', 'number', 'sku', powerUnitGroupId);
};

const createAttribute = async (req, res) => {
    try {
        const { name, attribute_group_id, subtype_id, data_type, unit_group_id, is_required, is_variant, is_sku_part, is_filterable, is_capacity, is_sku, attribute_type, display_order } = req.body;

        const exists = await SubtypeAttribute.findOne({
            subtype_id: subtype_id,
            name: name.trim(),
            deleted_at: null
        });
        if (exists) return errorResponse(res, 400, "Attribute name already exists in this subtype");

        const resolvedType = attribute_type || (is_sku || is_capacity ? 'sku' : 'custom');
        const isSku = resolvedType === 'sku';

        let finalRequired = !!is_required;
        let finalVariant = !!is_variant;
        let finalFilterable = !!is_filterable;
        let finalDataType = data_type;
        let finalUnitGroupId = unit_group_id;

        if (isSku) {
            finalRequired = true;
            finalVariant = true;
            finalFilterable = true;

            const subtype = await ProductSubtype.findById(subtype_id).populate('template_id');
            const templateName = normalizeTemplateName(subtype?.template_id?.name);
            const isPowerCapacity = TEMPLATE_WITH_POWER_CAPACITY.includes(templateName);
            const isCurrentCapacity = TEMPLATE_WITH_CURRENT_CAPACITY.includes(templateName);

            if (isPowerCapacity || isCurrentCapacity) {
                finalDataType = "number";
                const UnitGroup = require('../models/core_db/unit_groups.schema');
                const targetGroup = await UnitGroup.findOne({ name: isPowerCapacity ? /Power/i : /Current/i });
                finalUnitGroupId = targetGroup?._id || null;
            } else {
                if (data_type === "file") {
                    return errorResponse(res, 400, "SKU parameters cannot have Attachment / PDF input interface");
                }
            }
        }

        const result = await SubtypeAttribute.create({
            name: name.trim(),
            group_id: attribute_group_id,
            subtype_id: subtype_id,
            data_type: finalDataType,
            unit_group_id: finalUnitGroupId,
            is_required: finalRequired,
            is_variant: finalVariant,
            is_sku_part: isSku ? false : !!is_sku_part,
            is_filterable: finalFilterable,
            attribute_type: resolvedType,
            display_order: display_order !== undefined ? Number(display_order) : 0
        });
        res.json(successResponse("Attribute created", { id: result._id }));
    } catch (err) { errorResponse(res, 500, "Internal error"); }
};

const updateAttribute = async (req, res) => {
    try {
        const { id, name, attribute_group_id, data_type, unit_group_id, is_required, is_variant, is_sku_part, is_filterable, attribute_type, display_order } = req.body;
        const attr = await SubtypeAttribute.findById(id);
        if (!attr) return errorResponse(res, 404, "Attribute not found");

        // ── System, SKU, Phase, Tolerance or Engineering attribute guard ─────────────────────────
        const isPhaseOrToleranceOrEngineering = attr.is_system || ['phase', 'tolerance', 'tollarance', 'engineering'].includes(attr.attribute_type);
        let isLockedSku = false;
        if (attr.attribute_type === 'sku') {
            const subtype = await ProductSubtype.findById(attr.subtype_id).populate('template_id');
            const templateName = normalizeTemplateName(subtype?.template_id?.name);
            const systemTemplates = ["solar panel", "inverter", "battery", "acdb", "dcdb", "cable", "wire", "mounting structure", "mounting_structure"];
            if (systemTemplates.includes(templateName)) {
                isLockedSku = true;
            }
        }
        const isSystemOrEngineering = isPhaseOrToleranceOrEngineering || isLockedSku;
        if (isSystemOrEngineering) {
            // Name must NEVER change for system or engineering attributes — it drives connection logic
            if (name && name.trim().toLowerCase() !== attr.name.toLowerCase()) {
                return errorResponse(res, 403, `Cannot rename system or engineering attribute '${attr.name}'. Name is used for cross-product connection logic.`);
            }
            // attribute_type and data_type of system or engineering attrs are immutable
            if (attribute_type && attribute_type !== attr.attribute_type) {
                return errorResponse(res, 403, `Cannot change the type of system or engineering attribute '${attr.name}'.`);
            }
            if (data_type && data_type !== attr.data_type) {
                return errorResponse(res, 403, `Cannot change the input interface of system or engineering attribute '${attr.name}'.`);
            }
            // Only allow updating: group_id, display_order, is_filterable, is_required (non-breaking properties)
            const safeUpdate = {
                group_id: attribute_group_id !== undefined ? (attribute_group_id || null) : attr.group_id,
                display_order: display_order !== undefined ? Number(display_order) : attr.display_order,
                is_filterable: is_filterable !== undefined ? !!is_filterable : attr.is_filterable,
                is_required: attr.attribute_type === 'sku' ? true : (is_required !== undefined ? !!is_required : attr.is_required)
            };
            await SubtypeAttribute.updateOne({ _id: id }, { $set: safeUpdate });
            return res.json(successResponse("System/Engineering attribute updated (safe fields only)"));
        }
        // ─────────────────────────────────────────────────────────────────

        const isSku = attr.attribute_type === 'sku';

        let finalRequired = !!is_required;
        let finalVariant = !!is_variant;
        let finalFilterable = !!is_filterable;
        let finalDataType = data_type;
        let finalUnitGroupId = unit_group_id;

        if (isSku) {
            finalRequired = true;
            finalVariant = true;
            finalFilterable = true;

            const subtype = await ProductSubtype.findById(attr.subtype_id).populate('template_id');
            const templateName = normalizeTemplateName(subtype?.template_id?.name);
            const isPowerCapacity = TEMPLATE_WITH_POWER_CAPACITY.includes(templateName);
            const isCurrentCapacity = TEMPLATE_WITH_CURRENT_CAPACITY.includes(templateName);

            if (isPowerCapacity || isCurrentCapacity) {
                finalDataType = "number";
                const UnitGroup = require('../models/core_db/unit_groups.schema');
                const targetGroup = await UnitGroup.findOne({ name: isPowerCapacity ? /Power/i : /Current/i });
                finalUnitGroupId = targetGroup?._id || null;
            } else {
                if (data_type === "file") {
                    return errorResponse(res, 400, "SKU parameters cannot have Attachment / PDF input interface");
                }
            }
        }

        // Check for name collision with other attributes in same subtype
        if (name && name.trim().toLowerCase() !== attr.name.toLowerCase()) {
            const conflict = await SubtypeAttribute.findOne({
                subtype_id: attr.subtype_id,
                name: { $regex: new RegExp(`^${name.trim()}$`, 'i') },
                _id: { $ne: id },
                deleted_at: null
            });
            if (conflict) return errorResponse(res, 400, `Attribute name '${name.trim()}' already exists in this subtype`);
        }

        const updatePayload = {
            name: name ? name.trim() : attr.name,
            group_id: attribute_group_id,
            data_type: finalDataType,
            unit_group_id: finalUnitGroupId,
            is_required: finalRequired,
            is_variant: finalVariant,
            is_sku_part: isSku ? false : !!is_sku_part,
            is_filterable: finalFilterable,
            display_order: display_order !== undefined ? Number(display_order) : 0
        };

        if (attribute_type && ['sku', 'phase', 'tolerance', 'tollarance', 'engineering', 'custom', 'capacity'].includes(attribute_type)) {
            updatePayload.attribute_type = attribute_type === 'capacity' ? 'sku' : attribute_type;
        }

        await SubtypeAttribute.updateOne({ _id: id }, { $set: updatePayload });
        res.json(successResponse("Attribute updated"));
    } catch (err) { errorResponse(res, 500, "Internal error"); }
};

const listAttributes = async (req, res) => {
    try {
        const { subtype_id, template_id } = req.query;
        const filter = { deleted_at: null };

        if (subtype_id) {
            await ensureSkuAttribute(subtype_id, template_id);
            await ensurePhaseAttribute(subtype_id, template_id);
            await ensureToleranceAttribute(subtype_id, template_id);
            await ensureMicroInverterAttributes(subtype_id, template_id);
            filter.subtype_id = subtype_id;
        } else if (template_id) {
            const subtypes = await ProductSubtype.find({ template_id, deleted_at: null });
            for (const sub of subtypes) {
                await ensureSkuAttribute(sub._id, template_id);
                await ensurePhaseAttribute(sub._id, template_id);
                await ensureToleranceAttribute(sub._id, template_id);
                await ensureMicroInverterAttributes(sub._id, template_id);
            }
            filter.subtype_id = { $in: subtypes.map(s => s._id) };
        }

        const rows = await SubtypeAttribute.find(filter)
            .populate('group_id')
            .populate('subtype_id')
            .sort({ display_order: 1, name: 1 })
            .lean();

        const data = rows.map(r => ({
            id: r._id,
            name: r.name,
            group_id: r.group_id?._id || null,
            group_name: r.group_id?.name || "Uncategorized",
            subtype_id: r.subtype_id?._id || null,
            subtype_name: r.subtype_id?.name || "Unknown Subtype",
            data_type: r.data_type,
            unit_group_id: r.unit_group_id || null,
            is_required: r.is_required ? 1 : 0,
            is_variant: r.is_variant ? 1 : 0,
            is_sku_part: r.is_sku_part ? 1 : 0,
            is_filterable: r.is_filterable ? 1 : 0,
            attribute_type: r.attribute_type || 'custom',
            is_sku: r.attribute_type === 'sku' ? 1 : 0,
            is_capacity: r.attribute_type === 'sku' ? 1 : 0,
            is_phase: r.attribute_type === 'phase' ? 1 : 0,
            is_tolerance: (r.attribute_type === 'tolerance' || r.attribute_type === 'tollarance') ? 1 : 0,
            is_engineering: r.attribute_type === 'engineering' ? 1 : 0,
            is_system: r.is_system ? 1 : 0,
            display_order: r.display_order || 0
        }));
        res.json(successResponse("Attributes", data));
    } catch (err) {
        console.error(err);
        errorResponse(res, 500, "Internal error");
    }
};

// ================= ATTRIBUTE OPTIONS =================
const createAttributeOption = async (req, res) => {
    try {
        const { attribute_id, value } = req.body;
        const attr = await SubtypeAttribute.findById(attribute_id);
        if (!attr) return errorResponse(res, 404, "Attribute not found");
        if (attr.is_system || attr.attribute_type === 'engineering') {
            return errorResponse(res, 403, "System or engineering attribute options cannot be modified");
        }
        const result = await AttributeOption.create({
            attribute_id: attribute_id,
            value: value.trim()
        });
        res.json(successResponse("Option created", { id: result._id }));
    } catch (err) { errorResponse(res, 500, "Internal error"); }
};

const updateAttributeOption = async (req, res) => {
    try {
        const { id, value } = req.body;
        const option = await AttributeOption.findById(id);
        if (!option) return errorResponse(res, 404, "Option not found");
        const attr = await SubtypeAttribute.findById(option.attribute_id);
        if (attr && (attr.is_system || attr.attribute_type === 'engineering')) {
            return errorResponse(res, 403, "System or engineering attribute options cannot be modified");
        }
        await AttributeOption.updateOne({ _id: id }, { $set: { value: value.trim() } });
        res.json(successResponse("Option updated"));
    } catch (err) { errorResponse(res, 500, "Internal error"); }
};

const deleteAttributeOption = async (req, res) => {
    try {
        const { id } = req.query;
        const option = await AttributeOption.findById(id);
        if (!option) return errorResponse(res, 404, "Option not found");
        const attr = await SubtypeAttribute.findById(option.attribute_id);
        if (attr && (attr.is_system || attr.attribute_type === 'engineering')) {
            return errorResponse(res, 403, "System or engineering attribute options cannot be modified");
        }
        await AttributeOption.updateOne({ _id: id }, { $set: { deleted_at: new Date() } });
        res.json(successResponse("Option deleted"));
    } catch (err) { errorResponse(res, 500, "Internal error"); }
};

const reorderAttributeOptions = async (req, res) => {
    try {
        const { orders, order_ids } = req.body;
        if (Array.isArray(order_ids)) {
            for (let i = 0; i < order_ids.length; i++) {
                await AttributeOption.updateOne({ _id: order_ids[i] }, { $set: { display_order: i + 1 } });
            }
        } else if (Array.isArray(orders)) {
            for (const item of orders) {
                await AttributeOption.updateOne({ _id: item.id }, { $set: { display_order: item.display_order } });
            }
        }
        res.json(successResponse("Order updated"));
    } catch (err) {
        console.error("Error in reorderAttributeOptions:", err);
        errorResponse(res, 500, "Internal error");
    }
};

const reorderAttributes = async (req, res) => {
    try {
        const { order_ids } = req.body;
        if (Array.isArray(order_ids)) {
            for (let i = 0; i < order_ids.length; i++) {
                await SubtypeAttribute.updateOne({ _id: order_ids[i] }, { $set: { display_order: i + 1 } });
            }
        }
        res.json(successResponse("Attribute order updated"));
    } catch (err) {
        console.error("Error in reorderAttributes:", err);
        errorResponse(res, 500, "Internal error");
    }
};

const reorderAttributeGroups = async (req, res) => {
    try {
        const { order_ids } = req.body;
        if (Array.isArray(order_ids)) {
            for (let i = 0; i < order_ids.length; i++) {
                await SubtypeAttributeGroup.updateOne({ _id: order_ids[i] }, { $set: { display_order: i + 1 } });
            }
        }
        res.json(successResponse("Group order updated"));
    } catch (err) {
        console.error("Error in reorderAttributeGroups:", err);
        errorResponse(res, 500, "Internal error");
    }
};

const listAttributeOptions = async (req, res) => {
    try {
        const { attribute_id } = req.query;
        const rows = await AttributeOption.find({ attribute_id: attribute_id, deleted_at: null }).sort({ display_order: 1 });
        const data = rows.map(r => ({
            id: r._id,
            attribute_id: r.attribute_id,
            value: r.value,
            display_order: r.display_order
        }));
        res.json(successResponse("Options", data));
    } catch (err) { errorResponse(res, 500, "Internal error"); }
};

// ================= BRAND MAPPING =================
const mapBrandTemplate = async (req, res) => {
    try {
        const { brand_id, subtype_id } = req.body;
        await BrandSubtypeMap.create({
            brand_id: brand_id,
            subtype_id: subtype_id
        });

        // Sync to BrandTemplateMap
        const subtype = await ProductSubtype.findById(subtype_id);
        if (subtype && subtype.template_id) {
            const exists = await BrandTemplateMap.findOne({
                brand_id: brand_id,
                template_id: subtype.template_id,
                deleted_at: null
            });
            if (!exists) {
                await BrandTemplateMap.create({
                    brand_id: brand_id,
                    template_id: subtype.template_id
                });
            }
        }

        res.json(successResponse("Brand mapped"));
    } catch (err) { errorResponse(res, 500, "Internal error"); }
};

const deleteBrandMapping = async (req, res) => {
    try {
        const id = req.query.id || req.body.id;
        if (!id) return errorResponse(res, 400, "id required");

        const mapping = await BrandSubtypeMap.findById(id);
        if (!mapping) return errorResponse(res, 404, "Mapping not found");

        const { brand_id, subtype_id } = mapping;

        // Perform deletion
        await BrandSubtypeMap.deleteOne({ _id: id });

        // Sync to BrandTemplateMap
        const subtype = await ProductSubtype.findById(subtype_id);
        if (subtype && subtype.template_id) {
            const template_id = subtype.template_id;

            // Check if this brand is mapped to any other subtype of this template
            const otherSubtypes = await ProductSubtype.find({ template_id, deleted_at: null }).lean();
            const otherSubtypeIds = otherSubtypes.map(s => s._id);

            const remainingCount = await BrandSubtypeMap.countDocuments({
                brand_id: brand_id,
                subtype_id: { $in: otherSubtypeIds }
            });

            if (remainingCount === 0) {
                await BrandTemplateMap.deleteOne({ brand_id, template_id });
            }
        }

        res.json(successResponse("Mapping deleted"));
    } catch (err) { errorResponse(res, 500, "Internal error"); }
};

const listBrandsByTemplate = async (req, res) => {
    try {
        const { template_id } = req.query;
        if (!template_id) return errorResponse(res, 400, "template_id required");

        const subtypes = await ProductSubtype.find({ template_id: template_id, deleted_at: null }).lean();
        const subtypeIds = subtypes.map(s => s._id);

        const mappings = await BrandSubtypeMap.find({ subtype_id: { $in: subtypeIds }, deleted_at: null }).lean();

        const groupMap = {};
        mappings.forEach(m => {
            const sid = m.subtype_id.toString();
            if (!groupMap[sid]) groupMap[sid] = [];
            groupMap[sid].push(m.brand_id);
        });

        const allBrandIds = [...new Set(mappings.map(m => m.brand_id))];
        const allBrands = await Brand.find({ _id: { $in: allBrandIds }, deleted_at: null }).lean();
        const brandMap = {};
        allBrands.forEach(b => {
            brandMap[b._id.toString()] = { id: b._id, name: b.brand_name, logo: b.logo };
        });

        const data = subtypes.map(st => {
            const mappingsForSubtype = mappings.filter(m => m.subtype_id.toString() === st._id.toString());
            return {
                subtype_id: st._id,
                subtype_name: st.name,
                brands: mappingsForSubtype.map(m => {
                    const b = brandMap[m.brand_id.toString()];
                    return b ? {
                        id: m._id, // Mapping ID for deletion
                        brand_id: b.id, // Actual Brand ID
                        name: b.name,
                        logo: b.logo
                    } : null;
                }).filter(Boolean)
            };
        }).filter(group => group.brands.length > 0);

        res.json(successResponse("Brands", data));
    } catch (err) {
        console.error(err);
        errorResponse(res, 500, "Internal error");
    }
};

const listBrandsBySubtype = async (req, res) => {
    try {
        const { subtype_id, only_mapped } = req.query;
        let brands = [];

        if (only_mapped === 'true' && subtype_id) {
            let querySubtype = subtype_id;
            if (typeof subtype_id === 'string' && subtype_id.includes(',')) {
                querySubtype = { $in: subtype_id.split(',').map(id => id.trim()).filter(Boolean) };
            } else if (Array.isArray(subtype_id)) {
                querySubtype = { $in: subtype_id };
            }
            const mapping = await BrandSubtypeMap.find({ subtype_id: querySubtype, deleted_at: null });
            const brandIds = mapping.map(m => m.brand_id);
            if (brandIds.length > 0) {
                brands = await Brand.find({ _id: { $in: brandIds }, deleted_at: null }).sort({ brand_name: 1 }).lean();
            }
        } else {
            // Return all active brands created from admin panel
            brands = await Brand.find({ deleted_at: null }).sort({ brand_name: 1 }).lean();
        }

        const data = brands.map(b => ({ id: b._id, name: b.brand_name || b.name, logo: b.logo }));
        return res.json(successResponse("Brands", data));
    } catch (err) { 
        console.error("Error in listBrandsBySubtype:", err);
        return errorResponse(res, 500, "Internal error"); 
    }
};

const migrateSubtypeScopeMaps = async () => {
    try {
        const unmigrated = await SubtypeScopeMap.find({
            subcategory_type: { $exists: false }
        });

        if (unmigrated.length > 0) {
            const ProjectRange = require('../models/core_db/project_range.schema');
            for (const doc of unmigrated) {
                if (doc.scope_id) {
                    const range = await ProjectRange.findById(doc.scope_id);
                    if (range && range.subcategory_type) {
                        doc.subcategory_type = range.subcategory_type;
                        await doc.save();
                    }
                }
            }
        }
    } catch (e) {
        console.error("Migration error:", e);
    }
};

const listTemplatesByScope = async (req, res) => {
    try {
        const { subcategory_type_id } = req.query;
        if (!subcategory_type_id) return errorResponse(res, 400, "subcategory_type_id required");

        const typeId = mongoose.isValidObjectId(subcategory_type_id)
            ? new mongoose.Types.ObjectId(subcategory_type_id)
            : subcategory_type_id;

        // Find all subtype scope entries for this type
        const scopeMaps = await SubtypeScopeMap.find({ subcategory_type: typeId }).lean();
        const subtypeIds = [...new Set(scopeMaps.map(m => m.subtype.toString()))];

        if (subtypeIds.length === 0) return res.json(successResponse("Templates", []));

        // Find templates for those subtypes
        const subtypes = await ProductSubtype.find({ _id: { $in: subtypeIds }, deleted_at: null }).lean();
        const templateIds = [...new Set(subtypes.map(s => s.template_id.toString()))];

        const templates = await ProductTemplate.find({ _id: { $in: templateIds }, deleted_at: null })
            .sort({ name: 1 }).lean();

        const data = templates.map(t => ({ id: t._id, name: t.name, is_system: !!t.is_system }));
        res.json(successResponse("Templates", data));
    } catch (err) {
        console.error("Error in listTemplatesByScope:", err);
        errorResponse(res, 500, err.message || "Internal error");
    }
};

const listSubtypeScopes = async (req, res) => {
    try {
        const { template_id } = req.query;
        if (!template_id) return errorResponse(res, 400, "template_id required");

        // Run auto-migration
        await migrateSubtypeScopeMaps();

        // Find subtypes for this template
        const isValid = mongoose.isValidObjectId(template_id);
        const subtypes = await ProductSubtype.find({
            $or: [
                { template_id: template_id },
                ...(isValid ? [{ template_id: new mongoose.Types.ObjectId(template_id) }] : [])
            ],
            deleted_at: null
        }).lean();

        const subtypeIds = subtypes.map(s => s._id);
        if (subtypeIds.length === 0) return res.json(successResponse("No subtypes found", []));

        const mappings = await SubtypeScopeMap.find({ subtype: { $in: subtypeIds } })
            .populate({
                path: 'subcategory_type',
                model: 'sys_filter_type_maps',
                populate: [
                    {
                        path: 'subcategory',
                        model: 'sys_filter_subcategories',
                        populate: { path: 'category', model: 'sys_filter_categories' }
                    },
                    {
                        path: 'type',
                        model: 'sys_filter_types'
                    }
                ]
            })
            .populate({
                path: 'subtype',
                model: 'pc_product_subtypes'
            })
            .lean();

        const data = mappings.map(m => {
            const st = m.subcategory_type;
            return {
                id: m._id,
                subcategory_type_id: st?._id,
                category_name: st?.subcategory?.category?.name || "General",
                subcategory_name: st?.subcategory?.name || "Standard",
                type_name: st?.type?.name || "Execution Context",
                subtype_id: m.subtype?._id,
                subtype_name: m.subtype?.name || "General"
            };
        });
        res.json(successResponse("Scopes", data));
    } catch (err) {
        console.error("Error in listSubtypeScopes:", err);
        errorResponse(res, 500, err.message || "Internal error");
    }
};

const listScopesBySubtype = async (req, res) => {
    try {
        const { subtype_id } = req.query;

        // Run auto-migration
        await migrateSubtypeScopeMaps();

        let data = [];
        if (subtype_id) {
            const isValid = mongoose.isValidObjectId(subtype_id);
            const mappings = await SubtypeScopeMap.find({
                $or: [
                    { subtype: subtype_id },
                    ...(isValid ? [{ subtype: new mongoose.Types.ObjectId(subtype_id) }] : [])
                ]
            })
                .populate({
                    path: 'subcategory_type',
                    model: 'sys_filter_type_maps',
                    populate: [
                        {
                            path: 'subcategory',
                            model: 'sys_filter_subcategories',
                            populate: { path: 'category', model: 'sys_filter_categories' }
                        },
                        {
                            path: 'type',
                            model: 'sys_filter_types'
                        }
                    ]
                })
                .lean();

            data = mappings.map(m => {
                const st = m.subcategory_type;
                const typeId = st?._id ? String(st._id) : String(m._id);
                return {
                    id: String(m._id),
                    subcategory_type_id: typeId,
                    category_name: st?.subcategory?.category?.name || "General",
                    subcategory_name: st?.subcategory?.name || "Standard",
                    type_name: st?.type?.name || "Execution Context"
                };
            });
        }

        // Fallback: If no specific scope mappings found for this subtype, load all project subcategory types
        if (!data || data.length === 0) {
            const allTypes = await ProjectSubcategoryType.find({ deleted_at: null })
                .populate({
                    path: 'subcategory',
                    model: 'sys_filter_subcategories',
                    populate: { path: 'category', model: 'sys_filter_categories' }
                })
                .populate({
                    path: 'type',
                    model: 'sys_filter_types'
                })
                .lean();

            data = allTypes.map(st => ({
                id: String(st._id),
                subcategory_type_id: String(st._id),
                category_name: st?.subcategory?.category?.name || "General",
                subcategory_name: st?.subcategory?.name || "Standard",
                type_name: st?.type?.name || "Operational Scope"
            }));
        }

        return res.json(successResponse("Scopes", data));
    } catch (err) {
        console.error("Error in listScopesBySubtype:", err);
        return errorResponse(res, 500, err.message || "Internal error");
    }
};

const listBrandsByTemplateFlat = async (req, res) => {
    try {
        const { template_id } = req.query;
        if (!template_id) return errorResponse(res, 400, "template_id required");

        const mappings = await BrandTemplateMap.find({ template_id, deleted_at: null })
            .populate('brand_id')
            .lean();

        const data = mappings.map(m => {
            const b = m.brand_id;
            return b ? { id: b._id, name: b.brand_name, logo: b.logo } : null;
        }).filter(Boolean);

        res.json(successResponse("Brands", data));
    } catch (err) {
        console.error(err);
        errorResponse(res, 500, "Internal error");
    }
};

const syncBrandTemplateMaps = async () => {
    try {
        const mappings = await BrandSubtypeMap.find({ deleted_at: null })
            .populate('subtype_id')
            .lean();

        const uniqueKeys = new Set();
        const recordsToCreate = [];

        for (const m of mappings) {
            if (!m.subtype_id || m.subtype_id.deleted_at) continue;
            const template_id = m.subtype_id.template_id;
            if (!template_id) continue;

            const key = `${m.brand_id}_${template_id}`;
            if (!uniqueKeys.has(key)) {
                uniqueKeys.add(key);
                recordsToCreate.push({
                    brand_id: m.brand_id,
                    template_id: template_id
                });
            }
        }

        await BrandTemplateMap.deleteMany({});
        if (recordsToCreate.length > 0) {
            await BrandTemplateMap.insertMany(recordsToCreate);
        }
        console.log(`Synced BrandTemplateMap: created ${recordsToCreate.length} records`);
    } catch (e) {
        console.error("Error syncing brand template maps:", e);
    }
};

const triggerBrandSync = () => {
    syncBrandTemplateMaps().catch(err => console.warn("Notice: brand template sync deferred:", err.message));
};

if (mongoose.connection.readyState === 1) {
    triggerBrandSync();
} else {
    mongoose.connection.once('open', triggerBrandSync);
}

module.exports = {
    createProductTemplate, updateProductTemplate, listProductTemplates,
    createSubtype, updateSubtype, listSubtypes,
    createSubtypeScope, deleteSubtypeScope,
    createAttributeGroup, updateAttributeGroup, listAttributeGroups, reorderAttributeGroups,
    createAttribute, updateAttribute, listAttributes, reorderAttributes,
    createAttributeOption, updateAttributeOption, deleteAttributeOption, reorderAttributeOptions, listAttributeOptions,
    mapBrandTemplate, deleteBrandMapping, listBrandsByTemplate, listBrandsBySubtype,
    listSubtypeScopes, listScopesBySubtype, listTemplatesByScope,
    listBrandsByTemplateFlat
};