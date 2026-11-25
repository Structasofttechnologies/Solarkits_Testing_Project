const {
    IndustryType, ProjectCategory, ProjectSubcategory, ProjectType,
    ProjectSubcategoryType, ProjectRange, Unit
} = require("../models/core_db");

// ================= CATEGORY =================
const add_project_category = async (req, res) => {
    try {
        const { name, industry_type_id } = req.body;
        if (!name) return res.status(400).json({ status: "error", message: "Name is required" });

        const result = await ProjectCategory.create({
            name: name.trim(),
            industry_type_id: industry_type_id || null
        });

        return res.json({
            status: "success",
            data: { id: result._id, name: result.name, industry_type_id: result.industry_type_id }
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ status: "error" });
    }
};

const get_project_categories = async (req, res) => {
    try {
        const { industry_type_id } = req.query;
        const query = { deleted_at: null };
        if (industry_type_id) {
            query.industry_type_id = industry_type_id;
        }
        const rows = await ProjectCategory.find(query).sort({ sort_order: 1, _id: 1 }).lean();
        const data = rows.map(r => ({ id: r._id, name: r.name, industry_type_id: r.industry_type_id }));
        return res.json({ status: "success", data });
    } catch (error) {
        return res.status(500).json({ status: "error" });
    }
};

// ================= SUBCATEGORY =================
const add_project_subcategory = async (req, res) => {
    try {
        const { name, category_id, color } = req.body;
        if (!name || !category_id) return res.status(400).json({ status: "error", message: "Missing fields" });

        const cat = await ProjectCategory.findOne({ _id: category_id, deleted_at: null });
        if (!cat) return res.status(400).json({ status: "error", message: "Invalid category_id" });

        const image = req.files?.length ? req.files[0].path : null;

        const result = await ProjectSubcategory.create({
            name: name.trim(),
            category: cat._id,
            image,
            color: color ? color.trim() : null
        });

        return res.json({
            status: "success",
            data: { id: result._id, name: result.name, category_id: result.category, image: result.image, color: result.color }
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ status: "error" });
    }
};

const update_project_subcategory = async (req, res) => {
    try {
        const { id, name, category_id, color } = req.body;
        if (!id) return res.status(400).json({ status: "error", message: "Missing id" });

        const sub = await ProjectSubcategory.findOne({ _id: id, deleted_at: null });
        if (!sub) return res.status(404).json({ status: "error", message: "Subcategory not found" });

        const updateData = {};
        if (name) updateData.name = name.trim();
        if (category_id) {
            const cat = await ProjectCategory.findOne({ _id: category_id, deleted_at: null });
            if (!cat) return res.status(400).json({ status: "error", message: "Invalid category_id" });
            updateData.category = cat._id;
        }

        if (color !== undefined) {
            updateData.color = color ? color.trim() : null;
        }

        const image = req.files?.length ? req.files[0].path : null;
        const oldImage = sub.image;

        if (image) updateData.image = image;

        const result = await ProjectSubcategory.findByIdAndUpdate(id, { $set: updateData }, { new: true });

        if (image && oldImage) {
            try {
                const { delete_uploaded_files } = require('../utils/upload.files');
                await delete_uploaded_files([{ path: oldImage }]);
            } catch (err) {
                console.error("Failed to delete old subcategory image:", err);
            }
        }

        return res.json({
            status: "success",
            data: { id: result._id, name: result.name, category_id: result.category, image: result.image, color: result.color }
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ status: "error" });
    }
};

const get_project_subcategories = async (req, res) => {
    try {
        const { category_id } = req.query;
        const rows = await ProjectSubcategory.find({ category: category_id, deleted_at: null }).sort({ _id: 1 }).lean();
        const data = rows.map(r => ({ id: r._id, name: r.name, category_id: r.category, image: r.image, color: r.color }));
        return res.json({ status: "success", data });
    } catch (error) {
        return res.status(500).json({ status: "error" });
    }
};

// ================= TYPE =================
const add_project_type = async (req, res) => {
    try {
        const { name } = req.body;
        if (!name) return res.status(400).json({ status: "error", message: "Name required" });

        const result = await ProjectType.create({
            name: name.trim()
        });

        return res.json({
            status: "success",
            data: { id: result._id, name: result.name }
        });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ status: "error" });
    }
};

const get_project_types = async (req, res) => {
    try {
        const rows = await ProjectType.find({ deleted_at: null }).sort({ name: 1 }).lean();
        const data = rows.map(r => ({ id: r._id, name: r.name }));
        return res.json({ status: "success", data });
    } catch (err) {
        return res.status(500).json({ status: "error" });
    }
};

const map_type_to_subcategory = async (req, res) => {
    try {
        const { subcategory_id, type_id } = req.body;
        if (!subcategory_id || !type_id) return res.status(400).json({ status: "error", message: "Missing fields" });

        const sub = await ProjectSubcategory.findOne({ _id: subcategory_id, deleted_at: null });
        const type = await ProjectType.findOne({ _id: type_id, deleted_at: null });
        if (!sub || !type) return res.status(400).json({ status: "error", message: "Invalid IDs" });

        const existing = await ProjectSubcategoryType.findOne({ subcategory: sub._id, type: type._id, deleted_at: null });
        if (existing) return res.status(400).json({ status: "error", message: "Already mapped" });

        const result = await ProjectSubcategoryType.create({
            subcategory: sub._id,
            type: type._id
        });

        return res.json({
            status: "success",
            data: { subcategory_type_id: result._id }
        });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ status: "error" });
    }
};

const get_subcategory_types = async (req, res) => {
    try {
        const { subcategory_id } = req.query;
        const rows = await ProjectSubcategoryType.find({ subcategory: subcategory_id, deleted_at: null })
            .populate('type')
            .lean();

        const data = rows.filter(r => r.type).map(r => ({
            id: r._id,
            subcategory_type_id: r._id,
            type_id: r.type._id,
            name: r.type.name
        }));

        return res.json({ status: "success", data });
    } catch (err) {
        return res.status(500).json({ status: "error" });
    }
};

// ================= RANGE =================
const add_project_range = async (req, res) => {
    try {
        const { subcategory_type_id, min_value, max_value, unit_id } = req.body;
        if (!subcategory_type_id || min_value == null || max_value == null || !unit_id) {
            return res.status(400).json({ status: "error", message: "Missing fields" });
        }

        const pst = await ProjectSubcategoryType.findOne({ _id: subcategory_type_id, deleted_at: null });
        if (!pst) return res.status(400).json({ status: "error", message: "Invalid subcategory_type_id" });

        const unit = await Unit.findById(unit_id);
        if (!unit) return res.status(400).json({ status: "error", message: "Invalid unit_id" });

        const result = await ProjectRange.create({
            subcategory_type: pst._id,
            min_value,
            max_value,
            unit_id: unit._id
        });

        return res.json({ status: "success", data: { id: result._id } });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ status: "error" });
    }
};

const get_project_ranges = async (req, res) => {
    try {
        const { subcategory_type_id } = req.query;
        const query = { deleted_at: null };
        if (subcategory_type_id) {
            query.subcategory_type = subcategory_type_id;
        }
        const rows = await ProjectRange.find(query)
            .populate('unit_id')
            .lean();
        const data = rows.map(r => ({
            id: r._id,
            subcategory_type_id: r.subcategory_type,
            min_value: r.min_value,
            max_value: r.max_value,
            unit_id: r.unit_id?._id,
            unit_symbol: r.unit_id?.symbol,
            conversion_factor: r.unit_id?.conversion_factor,
            range_label: `${r.min_value} - ${r.max_value} ${r.unit_id?.symbol || 'kW'}`
        }));
        return res.json({ status: "success", data });
    } catch (err) {
        return res.status(500).json({ status: "error" });
    }
};

// ================= FULL HIERARCHY =================
const get_all_project_hierarchy = async (req, res) => {
    try {
        const industryTypes = await IndustryType.find({ deleted_at: null, is_active: true }).sort({ sort_order: 1, name: 1 }).lean();
        const categories = await ProjectCategory.find({ deleted_at: null }).lean();
        const subcategories = await ProjectSubcategory.find({ deleted_at: null }).lean();
        const types = await ProjectType.find({ deleted_at: null }).lean();
        const maps = await ProjectSubcategoryType.find({ deleted_at: null }).lean();
        const ranges = await ProjectRange.find({ deleted_at: null }).populate('unit_id').lean();

        const buildCategoryTree = (cat) => {
            const catSubs = subcategories.filter(sc => String(sc.category || '') === String(cat._id));
            return {
                id: cat._id,
                name: cat.name || "Unnamed Category",
                industry_type_id: cat.industry_type_id || null,
                subcategories: catSubs.map(sc => {
                    const subMaps = maps.filter(m => String(m.subcategory || '') === String(sc._id));
                    return {
                        id: sc._id,
                        name: sc.name || "Unnamed Subcategory",
                        category_id: sc.category,
                        image: sc.image || null,
                        color: sc.color || null,
                        mappedTypes: subMaps.map(m => {
                            const type = types.find(t => String(t._id) === String(m.type));
                            const typeRanges = ranges.filter(r => String(r.subcategory_type || '') === String(m._id));
                            return {
                                subcategory_type_id: m._id,
                                name: type ? (type.name || "Unnamed Type") : "Unknown Type",
                                ranges: typeRanges.map(r => ({
                                    id: r._id,
                                    min_value: r.min_value ?? 0,
                                    max_value: r.max_value ?? 0,
                                    unit_id: r.unit_id?._id,
                                    unit_symbol: r.unit_id?.symbol || "",
                                    conversion_factor: r.unit_id?.conversion_factor
                                }))
                            };
                        })
                    };
                })
            };
        };

        const hierarchy = industryTypes.map(ind => {
            const indCats = categories.filter(cat => String(cat.industry_type_id || '') === String(ind._id));
            return {
                id: ind._id,
                name: ind.name || "Unnamed Industry",
                slug: ind.slug,
                categories: indCats.map(buildCategoryTree)
            };
        });

        // Unassigned categories
        const unassignedCats = categories.filter(cat => !cat.industry_type_id || !industryTypes.some(ind => String(ind._id) === String(cat.industry_type_id)));
        if (unassignedCats.length > 0) {
            hierarchy.push({
                id: "unassigned",
                name: "All Industry Types",
                slug: "unassigned",
                categories: unassignedCats.map(buildCategoryTree)
            });
        }

        return res.json({ status: "success", data: hierarchy });
    } catch (err) {
        console.error("Error in get_all_project_hierarchy:", err);
        return res.status(500).json({ status: "error", message: err.message });
    }
};

const update_project_category = async (req, res) => {
    try {
        const { id, name, industry_type_id } = req.body;
        if (!id || !name) return res.status(400).json({ status: "error", message: "Missing id or name" });

        const updateData = { name: name.trim() };
        if (industry_type_id !== undefined) {
            updateData.industry_type_id = industry_type_id || null;
        }

        const result = await ProjectCategory.findByIdAndUpdate(
            id,
            { $set: updateData },
            { new: true }
        );
        if (!result) return res.status(404).json({ status: "error", message: "Category not found" });

        return res.json({
            status: "success",
            data: { id: result._id, name: result.name, industry_type_id: result.industry_type_id }
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ status: "error" });
    }
};

const update_project_type = async (req, res) => {
    try {
        const { id, name } = req.body;
        if (!id || !name) return res.status(400).json({ status: "error", message: "Missing id or name" });

        let typeDoc = null;
        const mapping = await ProjectSubcategoryType.findOne({ _id: id, deleted_at: null });
        if (mapping) {
            typeDoc = await ProjectType.findOne({ _id: mapping.type, deleted_at: null });
        } else {
            typeDoc = await ProjectType.findOne({ _id: id, deleted_at: null });
        }

        if (!typeDoc) return res.status(404).json({ status: "error", message: "System Type not found" });

        typeDoc.name = name.trim();
        await typeDoc.save();

        return res.json({
            status: "success",
            data: { id: id, name: typeDoc.name }
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ status: "error" });
    }
};

const update_project_range = async (req, res) => {
    try {
        const { id, min_value, max_value, unit_id } = req.body;
        if (!id || min_value == null || max_value == null || !unit_id) {
            return res.status(400).json({ status: "error", message: "Missing fields" });
        }

        const range = await ProjectRange.findOne({ _id: id, deleted_at: null });
        if (!range) return res.status(404).json({ status: "error", message: "Range not found" });

        const unit = await Unit.findById(unit_id);
        if (!unit) return res.status(400).json({ status: "error", message: "Invalid unit_id" });

        range.min_value = min_value;
        range.max_value = max_value;
        range.unit_id = unit._id;
        await range.save();

        return res.json({
            status: "success",
            data: { id: range._id }
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ status: "error" });
    }
};

module.exports = {
    add_project_category,
    update_project_category,
    get_project_categories,
    add_project_subcategory,
    update_project_subcategory,
    get_project_subcategories,
    add_project_type,
    update_project_type,
    get_project_types,
    map_type_to_subcategory,
    get_subcategory_types,
    add_project_range,
    update_project_range,
    get_project_ranges,
    get_all_project_hierarchy
};