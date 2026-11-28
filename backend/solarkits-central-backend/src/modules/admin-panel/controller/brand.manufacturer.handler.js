const { Brand } = require("../models/core_db");
const { GeoLevel0, GeoLevel1, GeoLevel2 } = require("../models/geolocation_db");
const { solarkits_core_db } = require("../config/databases");
const { delete_uploaded_files } = require("../utils/upload.files");

/**
 * Parses JSON arrays from FormData/Request Body.
 */
const parseJSONArray = (value) => {
    if (!value) return [];
    if (Array.isArray(value)) return value;
    if (typeof value === 'string') {
        try {
            const parsed = JSON.parse(value);
            return Array.isArray(parsed) ? parsed : [];
        } catch (e) { return []; }
    }
    return [];
};

/**
 * Validates the location hierarchy (Country -> State -> District).
 */
const validateLocationHierarchy = async (country_ids = [], state_ids = [], district_ids = []) => {
    if (country_ids.length) {
        const countries = await GeoLevel0.find({ _id: { $in: country_ids }, deleted_at: null });
        if (countries.length !== country_ids.length) throw new Error("Invalid country_ids");
    }

    if (state_ids.length) {
        if (!country_ids.length) throw new Error("Country is required when state is selected");
        const states = await GeoLevel1.find({ _id: { $in: state_ids }, deleted_at: null });
        if (states.length !== state_ids.length) throw new Error("Invalid state_ids");
        for (let s of states) {
            if (!country_ids.includes(s.level_0.toString())) {
                throw new Error(`State ${s._id} does not belong to selected countries`);
            }
        }
    }

    if (district_ids.length) {
        if (!state_ids.length) throw new Error("State is required when district is selected");
        const districts = await GeoLevel2.find({ _id: { $in: district_ids }, deleted_at: null });
        if (districts.length !== district_ids.length) throw new Error("Invalid district_ids");
        for (let d of districts) {
            if (!state_ids.includes(d.level_1.toString())) {
                throw new Error(`District ${d._id} does not belong to selected states`);
            }
        }
    }
    return true;
};

/**
 * Adds a new brand.
 */
const add_brand = async (req, res) => {
    const session = await solarkits_core_db.startSession();
    session.startTransaction();
    try {
        const country_ids = parseJSONArray(req.body.country_ids);
        const state_ids = parseJSONArray(req.body.state_ids);
        const district_ids = parseJSONArray(req.body.district_ids);
        const { brand_name, company_name } = req.body;
        const is_oem_partner = req.body.is_oem_partner === 'true' || req.body.is_oem_partner === true;
        const is_supplier = req.body.is_supplier === 'true' || req.body.is_supplier === true;

        if (!brand_name) return res.status(400).json({ status: "error", message: "brand_name is required" });

        const logo = req.files?.length ? req.files[0].path : null;

        await validateLocationHierarchy(country_ids, state_ids, district_ids);

        const [brand] = await Brand.create([{
            brand_name,
            company_name: company_name || null,
            logo,
            country_ids,
            state_ids,
            district_ids,
            is_oem_partner,
            is_supplier
        }], { session });

        await session.commitTransaction();
        return res.json({ status: "success", message: "Brand created successfully", data: { id: brand.id } });
    } catch (error) {
        await session.abortTransaction();
        if (req.files) delete_uploaded_files(req.files);
        return res.status(400).json({ status: "error", message: error.message || "Something went wrong" });
    } finally {
        session.endSession();
    }
};

/**
 * Fetches all brands with their location names and IDs.
 */
const get_brands = async (req, res) => {
    try {
        const brands = await Brand.find({ deleted_at: null }).sort({ brand_name: 1 });

        // Bulk Fetch names for mapping
        const all_c_ids = [...new Set(brands.flatMap(b => b.country_ids || []))];
        const all_s_ids = [...new Set(brands.flatMap(b => b.state_ids || []))];
        const all_d_ids = [...new Set(brands.flatMap(b => b.district_ids || []))];

        const [countries, states, districts] = await Promise.all([
            GeoLevel0.find({ _id: { $in: all_c_ids } }),
            GeoLevel1.find({ _id: { $in: all_s_ids } }),
            GeoLevel2.find({ _id: { $in: all_d_ids } })
        ]);

        const nameMap = {
            c: Object.fromEntries(countries.map(c => [c._id.toString(), c.name])),
            s: Object.fromEntries(states.map(s => [s._id.toString(), s.name])),
            d: Object.fromEntries(districts.map(d => [d._id.toString(), d.name]))
        };

        const result = brands.map(b => {
            const country_names = (b.country_ids || []).map(id => ({ id, name: nameMap.c[id.toString()] }));
            const state_names = (b.state_ids || []).map(id => ({ id, name: nameMap.s[id.toString()] }));
            const district_names = (b.district_ids || []).map(id => ({ id, name: nameMap.d[id.toString()] }));

            return {
                id: b.id,
                brand_name: b.brand_name,
                company_name: b.company_name,
                logo: b.logo,
                country_ids: b.country_ids,
                state_ids: b.state_ids,
                district_ids: b.district_ids,
                is_oem_partner: Boolean(b.is_oem_partner),
                is_supplier: Boolean(b.is_supplier),
                country_names,
                state_names,
                district_names,
                created_at: b.created_at
            };
        });

        return res.json({ status: "success", data: result });
    } catch (error) {
        return res.status(500).json({ status: "error", message: error.message });
    }
};

/**
 * Updates an existing brand.
 */
const update_brand = async (req, res) => {
    const session = await solarkits_core_db.startSession();
    session.startTransaction();
    try {
        const { id } = req.params;
        const { brand_name, company_name } = req.body;
        const country_ids = parseJSONArray(req.body.country_ids);
        const state_ids = parseJSONArray(req.body.state_ids);
        const district_ids = parseJSONArray(req.body.district_ids);

        if (!id) return res.status(400).json({ status: "error", message: "id is required" });

        const brand = await Brand.findById(id).session(session);
        if (!brand) throw new Error("Brand not found");

        const logo = req.files?.length ? req.files[0].path : null;
        const oldLogo = brand.logo;

        await validateLocationHierarchy(country_ids, state_ids, district_ids);

        const updateData = {
            brand_name: brand_name || brand.brand_name,
            company_name: company_name !== undefined ? company_name : brand.company_name,
            country_ids,
            state_ids,
            district_ids
        };

        if (req.body.is_oem_partner !== undefined) {
            updateData.is_oem_partner = req.body.is_oem_partner === 'true' || req.body.is_oem_partner === true;
        }
        if (req.body.is_supplier !== undefined) {
            updateData.is_supplier = req.body.is_supplier === 'true' || req.body.is_supplier === true;
        }

        if (logo) updateData.logo = logo;

        await Brand.findByIdAndUpdate(id, updateData, { session });

        await session.commitTransaction();

        if (logo && oldLogo) {
            delete_uploaded_files([{ path: oldLogo }]);
        }

        return res.json({ status: "success", message: "Brand updated successfully" });
    } catch (error) {
        await session.abortTransaction();
        if (req.files) delete_uploaded_files(req.files);
        return res.status(400).json({ status: "error", message: error.message || "Something went wrong" });
    } finally {
        session.endSession();
    }
};

/**
 * Soft deletes a brand.
 */
const delete_brand = async (req, res) => {
    try {
        const { id } = req.params;
        if (!id) return res.status(400).json({ status: "error", message: "id is required" });

        await Brand.findByIdAndUpdate(id, { deleted_at: new Date() });
        return res.json({ status: "success", message: "Brand deleted successfully" });
    } catch (error) {
        return res.status(500).json({ status: "error", message: error.message });
    }
};

/**
 * Fetches brands with only logo and name (minimal data).
 */
const get_brands_with_logo_name_only = async (req, res) => {
    try {
        const brands = await Brand.find({ deleted_at: null }, 'brand_name logo').sort({ brand_name: 1 });
        const result = brands.map(b => ({
            id: b.id,
            name: b.brand_name,
            logo: b.logo
        }));
        return res.json({ status: "success", data: result });
    } catch (error) {
        return res.status(500).json({ status: "error", message: error.message });
    }
};

module.exports = {
    add_brand,
    get_brands,
    update_brand,
    delete_brand,
    get_brands_with_logo_name_only
};