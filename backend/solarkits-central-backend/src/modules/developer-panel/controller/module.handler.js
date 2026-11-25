const mongoose = require('mongoose');
const { CmsLevel, CmsModule, CmsRoleWiseModule, Otp, CmsUser, CmsPanel } = require('../models/user_db');
const bcrypt = require('bcrypt');
const { sendOTP } = require("../utils/nodemailer");

const get_levels = async (req, res) => {
    try {
        const levels = await CmsLevel.find().lean();
        const data = levels.map(l => ({
            ...l,
            id: l._id
        }));
        return res.status(200).json({ status: 'success', data });
    } catch (error) {
        return res.status(500).json({ status: 'error', message: error.message || 'Internal Server Error', error: error.message });
    }
}


const get_modules = async (req, res) => {
    try {
        const { panel_id, level_id, unique_id } = req.query;
        if (unique_id === 'DEV_WH_MODULES') {
            const { WarehouseModule } = require('../models/company_warehouse_db');
            const modules = await WarehouseModule.find({ is_deleted: { $ne: true } })
                .populate('parent_module_id')
                .sort({ created_at: -1 });

            const data = modules.map(m => {
                const doc = m.toJSON();
                return {
                    ...doc,
                    id: doc._id,
                    unique_id: doc.unique_code,
                    panel: 'Warehouse Panel',
                    level: 'Global',
                    dashboard_type: 'Default Dashboard',
                    parent_module: m.parent_module_id?.name || '-',
                };
            });
            return res.status(200).json({ status: 'success', message: 'Warehouse modules fetched successfully', data });
        }
        let query = {};
        if (panel_id && mongoose.Types.ObjectId.isValid(panel_id)) {
            query.panel_id = panel_id;
        }
        if (level_id && mongoose.Types.ObjectId.isValid(level_id)) {
            query.level_id = level_id;
        }

        const modules = await CmsModule.find(query)
            .populate('panel_id')
            .populate('level_id')
            .populate('saas_product_id')
            .populate('parent_module_id')
            .sort({ created_at: -1 });

        const data = modules.map(m => {
            const doc = m.toJSON();
            const saasProdName = m.saas_product_id?.name || 'Default Dashboard';
            return {
                ...doc,
                id: doc._id,
                unique_id: doc.unique_code,
                panel: m.panel_id?.name || 'Unknown',
                level: m.level_id?.name || 'Unknown',
                dashboard_type: saasProdName,
                parent_module: m.parent_module_id?.name || '-',
            };
        });

        res.status(200).json({ status: 'success', message: 'Modules fetched successfully', data });
    } catch (error) {
        console.error('Error in get_modules:', error);
        res.status(500).json({ status: 'error', message: error.message || 'Internal Server Error', error: error.message });
    }
}

const create_module = async (req, res) => {
    try {
        if (req.query.unique_id === 'DEV_WH_MODULES') {
            const { name, parent_module_id } = req.body;
            if (!name) {
                return res.status(400).json({ status: 'error', message: 'Name is required' });
            }
            const { WarehouseModule } = require('../models/company_warehouse_db');

            const existing = await WarehouseModule.findOne({ name, parent_module_id: parent_module_id || null, is_deleted: { $ne: true } });
            if (existing) {
                return res.status(409).json({ status: 'error', message: 'Warehouse module with this name already exists' });
            }

            const lastModule = await WarehouseModule.findOne().sort({ unique_code: -1 }).select('unique_code');
            let new_unique_code = '00000040';
            if (lastModule) {
                new_unique_code = (parseInt(lastModule.unique_code, 10) + 1).toString().padStart(8, '0');
            }

            await WarehouseModule.create({
                name,
                parent_module_id: parent_module_id || null,
                unique_code: new_unique_code,
                is_active: true
            });

            return res.status(201).json({ status: 'success', message: 'Warehouse module created successfully' });
        }

        const { name, panel_id, level_id, dashboard_context, saas_product_id, parent_module_id, is_active, unique_code } = req.body;

        if (!name || !panel_id || !level_id || !dashboard_context) {
            return res.status(400).json({ status: 'error', message: 'Name, Panel, Level and Dashboard Context are required' });
        }

        // unique_code is required and user-provided (not auto-incremented)
        if (!unique_code || !unique_code.trim()) {
            return res.status(400).json({ status: 'error', message: 'unique_code is required. Please provide a unique identifier (e.g. ADM_MY_MODULE).' });
        }

        const trimmedCode = unique_code.trim().toUpperCase();

        // Validate format: only letters, digits, underscores, max 50 chars
        if (!/^[A-Z0-9_]{1,50}$/.test(trimmedCode)) {
            return res.status(400).json({ status: 'error', message: 'unique_code must only contain uppercase letters, digits, or underscores (max 50 chars).' });
        }

        // ✅ Validate ObjectIds
        if (!mongoose.Types.ObjectId.isValid(panel_id) ||
            !mongoose.Types.ObjectId.isValid(level_id) ||
            (dashboard_context === 'product' && (!saas_product_id || !mongoose.Types.ObjectId.isValid(saas_product_id))) ||
            (parent_module_id && !mongoose.Types.ObjectId.isValid(parent_module_id))) {
            return res.status(400).json({ status: 'error', message: 'Invalid ID format for Panel, Level, SaaS Product or Parent Module' });
        }

        // Check unique_code uniqueness
        const codeExists = await CmsModule.findOne({ unique_code: trimmedCode });
        if (codeExists) {
            return res.status(409).json({ status: 'error', message: `unique_code '${trimmedCode}' is already in use by module '${codeExists.name}'. Please choose a different code.` });
        }

        const query = { name, panel_id, level_id, dashboard_context };
        if (dashboard_context === 'product') {
            query.saas_product_id = saas_product_id;
        } else {
            query.saas_product_id = null;
        }

        const existing = await CmsModule.findOne(query);
        if (existing) {
            return res.status(409).json({ status: 'error', message: 'Module with this name already exists in this panel under this context' });
        }

        let final_is_active = is_active;
        if (parent_module_id) {
            const parent = await CmsModule.findById(parent_module_id);
            if (parent) {
                if (!parent.is_active) final_is_active = false;
                if (parent.dashboard_context !== dashboard_context ||
                    (dashboard_context === 'product' && String(parent.saas_product_id) !== String(saas_product_id))) {
                    return res.status(400).json({ status: 'error', message: 'Parent and child module must have same dashboard context and product' });
                }
            }
        }

        await CmsModule.create({
            name,
            panel_id,
            level_id,
            dashboard_context,
            saas_product_id: dashboard_context === 'product' ? saas_product_id : null,
            parent_module_id: parent_module_id || null,
            unique_code: trimmedCode,
            is_active: final_is_active
        });

        res.status(201).json({ status: 'success', message: 'Module created successfully' });
    } catch (error) {
        console.error('Error in create_module:', error);
        res.status(500).json({ status: 'error', message: error.message || 'Internal Server Error', error: error.message });
    }
}


const send_otp_for_update_module = async (req, res) => {
    try {
        const { id } = req.params;
        const { id: user_id } = req.user;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ status: 'error', message: 'Invalid Module ID format' });
        }

        let moduleData;
        if (req.query.unique_id === 'DEV_WH_MODULES') {
            const { WarehouseModule } = require('../models/company_warehouse_db');
            moduleData = await WarehouseModule.findById(id);
        } else {
            moduleData = await CmsModule.findById(id);
        }
        if (!moduleData) {
            return res.status(404).json({ status: 'error', message: 'Module not found' });
        }

        const user = await CmsUser.findById(user_id);
        if (!user) {
            return res.status(404).json({ status: 'error', message: 'User not found' });
        }

        const otpData = await sendOTP(user.email, `Code for update module.`, `This OTP for update ${moduleData.name}.`);
        const hashed_otp = await bcrypt.hash(otpData.otp, 10);
        const expires_at = new Date(Date.now() + 3 * 60 * 1000);


        await Otp.create({
            user_id,
            otp: hashed_otp,
            purpose: 'update_module',
            expires_at
        });

        return res.status(200).json({ status: "success", message: "OTP sent successfully." });

    } catch (error) {
        console.error('Error in send_otp_for_update_module:', error);
        res.status(500).json({ status: 'error', message: error.message || 'Internal Server Error', error: error.message });
    }
}

const update_module = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, panel_id, level_id, dashboard_context, saas_product_id, parent_module_id, is_active, unique_code, otp } = req.body;
        const { id: user_id } = req.user;

        if (req.query.unique_id === 'DEV_WH_MODULES') {
            if (!name || !otp) {
                return res.status(400).json({ status: 'error', message: 'Name and OTP are required' });
            }

            const otp_record = await Otp.findOne({ user_id, purpose: 'update_module' }).sort({ created_at: -1 });
            if (!otp_record) {
                return res.status(404).json({ status: "error", message: "No OTP found. Please request a new OTP." });
            }

            if (new Date(otp_record.expires_at) < new Date()) {
                return res.status(410).json({ status: "error", message: "OTP has expired. Please request a new one." });
            }

            const is_otp_valid = await bcrypt.compare(otp, otp_record.otp);
            if (!is_otp_valid) {
                return res.status(400).json({ status: "error", message: "Invalid OTP. Please try again." });
            }

            const { WarehouseModule, WarehouseRoleWiseModule } = require('../models/company_warehouse_db');
            const existing = await WarehouseModule.findOne({ name, parent_module_id: parent_module_id || null, _id: { $ne: id }, is_deleted: { $ne: true } });
            if (existing) {
                return res.status(409).json({ status: 'error', message: 'Another warehouse module with this name already exists' });
            }

            const currentModule = await WarehouseModule.findById(id);
            if (!currentModule) {
                return res.status(404).json({ status: 'error', message: 'Warehouse module not found' });
            }

            const isParentChanged = String(currentModule.parent_module_id) !== String(parent_module_id || null);

            if (isParentChanged) {
                const getAllChildModules = async (moduleId) => {
                    let children = [];
                    const rows = await WarehouseModule.find({ parent_module_id: moduleId }).select('_id').lean();
                    for (const row of rows) {
                        children.push(row._id);
                        const subChildren = await getAllChildModules(row._id);
                        children = children.concat(subChildren);
                    }
                    return children;
                };

                const childModuleIds = await getAllChildModules(id);
                const idsToRemove = [id, ...childModuleIds];

                if (idsToRemove.length > 0) {
                    await WarehouseRoleWiseModule.deleteMany({ module_id: { $in: idsToRemove } });
                }
            }

            await WarehouseModule.findByIdAndUpdate(id, {
                name,
                parent_module_id: parent_module_id || null,
                is_active
            });

            if (!is_active) {
                await WarehouseModule.updateMany({ parent_module_id: id }, { is_active: false });
            }

            return res.status(200).json({ status: 'success', message: 'Warehouse module updated successfully' });
        }

        if (!name || !panel_id || !level_id || !dashboard_context || !otp) {
            return res.status(400).json({
                status: 'error',
                message: 'Name, Panel, Level, Dashboard Context and OTP are required',
            });
        }

        let trimmedCode = '';
        if (req.query.unique_id !== 'DEV_WH_MODULES') {
            if (!unique_code || !unique_code.trim()) {
                return res.status(400).json({ status: 'error', message: 'unique_code is required' });
            }
            trimmedCode = unique_code.trim().toUpperCase();
            if (!/^[A-Z0-9_]{1,50}$/.test(trimmedCode)) {
                return res.status(400).json({ status: 'error', message: 'unique_code format is invalid' });
            }
            // Check uniqueness against other modules (excluding self)
            const codeExists = await CmsModule.findOne({ unique_code: trimmedCode, _id: { $ne: id } });
            if (codeExists) {
                return res.status(409).json({ status: 'error', message: `unique_code '${trimmedCode}' is already in use by module '${codeExists.name}'. Please choose a different code.` });
            }
        }

        // ✅ Validate ObjectIds
        if (!mongoose.Types.ObjectId.isValid(id) ||
            !mongoose.Types.ObjectId.isValid(panel_id) ||
            !mongoose.Types.ObjectId.isValid(level_id) ||
            (dashboard_context === 'product' && (!saas_product_id || !mongoose.Types.ObjectId.isValid(saas_product_id))) ||
            (parent_module_id && !mongoose.Types.ObjectId.isValid(parent_module_id))) {
            return res.status(400).json({ status: 'error', message: 'Invalid ID format provided' });
        }

        const otp_record = await Otp.findOne({ user_id, purpose: 'update_module' }).sort({ created_at: -1 });
        if (!otp_record) {
            return res.status(404).json({ status: "error", message: "No OTP found. Please request a new OTP." });
        }

        if (new Date(otp_record.expires_at) < new Date()) {
            return res.status(410).json({ status: "error", message: "OTP has expired. Please request a new one." });
        }

        const is_otp_valid = await bcrypt.compare(otp, otp_record.otp);
        if (!is_otp_valid) {
            return res.status(400).json({ status: "error", message: "Invalid OTP. Please try again." });
        }

        const currentModule = await CmsModule.findById(id);
        if (!currentModule) {
            return res.status(404).json({ status: 'error', message: 'Module not found' });
        }

        const isPanelOrLevelChanged = currentModule.panel_id != panel_id || currentModule.level_id != level_id;
        const finalParentModuleId = isPanelOrLevelChanged ? null : (parent_module_id || null);

        const dupQuery = {
            name, panel_id, level_id, dashboard_context,
            _id: { $ne: id }
        };
        if (dashboard_context === 'product') {
            dupQuery.saas_product_id = saas_product_id;
        } else {
            dupQuery.saas_product_id = null;
        }

        const existing = await CmsModule.findOne(dupQuery);
        if (existing) {
            return res.status(409).json({ status: 'error', message: 'Another module with this name already exists in this panel' });
        }

        let final_is_active = is_active;
        if (finalParentModuleId) {
            const parent = await CmsModule.findById(finalParentModuleId);
            if (parent) {
                if (!parent.is_active) final_is_active = false;
                if (parent.dashboard_context !== dashboard_context ||
                    (dashboard_context === 'product' && String(parent.saas_product_id) !== String(saas_product_id))) {
                    return res.status(400).json({ status: 'error', message: 'Parent and child module must have same dashboard context and product' });
                }
            }
        }

        if (String(currentModule.parent_module_id) !== String(finalParentModuleId) || isPanelOrLevelChanged) {
            const getAllChildModules = async (moduleId) => {
                let children = [];
                const rows = await CmsModule.find({ parent_module_id: moduleId }).select('_id').lean();
                for (const row of rows) {
                    children.push(row._id);
                    const subChildren = await getAllChildModules(row._id);
                    children = children.concat(subChildren);
                }
                return children;
            };

            const childModuleIds = await getAllChildModules(id);
            const idsToRemove = [id, ...childModuleIds];

            if (idsToRemove.length > 0) {
                await CmsRoleWiseModule.deleteMany({ module_id: { $in: idsToRemove } });
            }
        }

        const updateData = {
            name,
            panel_id,
            level_id,
            dashboard_context,
            saas_product_id: dashboard_context === 'product' ? saas_product_id : null,
            parent_module_id: finalParentModuleId,
            is_active: final_is_active
        };

        if (req.query.unique_id !== 'DEV_WH_MODULES') {
            updateData.unique_code = trimmedCode;
        }

        await CmsModule.findByIdAndUpdate(id, updateData);

        if (!final_is_active) {
            await CmsModule.updateMany({ parent_module_id: id }, { is_active: false });
        }

        if (isPanelOrLevelChanged) {
            await CmsModule.updateMany({ parent_module_id: id }, { panel_id, level_id });
        }

        res.status(200).json({ status: 'success', message: 'Module updated successfully' });

    } catch (error) {
        res.status(500).json({
            status: 'error',
            message: error.message || 'Internal Server Error',
            error: error.message
        });
    }
}

const send_otp_for_delete_module = async (req, res) => {
    try {
        const { id } = req.params;
        const { id: user_id } = req.user;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ status: 'error', message: 'Invalid Module ID format' });
        }

        let moduleData;
        if (req.query.unique_id === 'DEV_WH_MODULES') {
            const { WarehouseModule } = require('../models/company_warehouse_db');
            moduleData = await WarehouseModule.findById(id);
        } else {
            moduleData = await CmsModule.findById(id);
        }
        if (!moduleData) {
            return res.status(404).json({ status: 'error', message: 'Module not found' });
        }

        const user = await CmsUser.findById(user_id);
        if (!user || !user.email) {
            return res.status(404).json({ status: 'error', message: 'User or User Email not found' });
        }

        const otpData = await sendOTP(user.email, `Code for delete module.`, `This OTP for delete ${moduleData.name}.`);
        const hashed_otp = await bcrypt.hash(otpData.otp, 10);
        const expires_at = new Date(Date.now() + 3 * 60 * 1000);

        await Otp.create({
            user_id,
            otp: hashed_otp,
            purpose: 'delete_module',
            expires_at
        });

        return res.status(200).json({ status: "success", message: "OTP sent successfully." });

    } catch (error) {
        console.error('Error in send_otp_for_delete_module:', error);
        res.status(500).json({ status: 'error', message: error.message || 'Internal Server Error', error: error.message });
    }
}

const delete_module = async (req, res) => {
    try {
        const { id } = req.params;
        const { otp } = req.body;
        const { id: user_id } = req.user;

        if (req.query.unique_id === 'DEV_WH_MODULES') {
            if (!otp) {
                return res.status(400).json({ status: 'error', message: 'OTP is required' });
            }

            const otp_record = await Otp.findOne({ user_id, purpose: 'delete_module' }).sort({ created_at: -1 });
            if (!otp_record) {
                return res.status(404).json({ status: "error", message: "No OTP found. Please request a new OTP." });
            }

            if (new Date(otp_record.expires_at) < new Date()) {
                return res.status(410).json({ status: "error", message: "OTP has expired. Please request a new one." });
            }

            const is_otp_valid = await bcrypt.compare(otp, otp_record.otp);
            if (!is_otp_valid) {
                return res.status(400).json({ status: "error", message: "Invalid OTP. Please try again." });
            }

            const { WarehouseModule, WarehouseRoleWiseModule } = require('../models/company_warehouse_db');
            const currentModule = await WarehouseModule.findById(id);
            if (!currentModule) {
                return res.status(404).json({ status: 'error', message: 'Warehouse module not found' });
            }

            const getAllChildModules = async (moduleId) => {
                let children = [];
                const rows = await WarehouseModule.find({ parent_module_id: moduleId }).select('_id').lean();
                for (const row of rows) {
                    children.push(row._id);
                    const subChildren = await getAllChildModules(row._id);
                    children = children.concat(subChildren);
                }
                return children;
            };

            const childModuleIds = await getAllChildModules(id);
            const idsToRemove = [id, ...childModuleIds];

            if (idsToRemove.length > 0) {
                await WarehouseRoleWiseModule.deleteMany({ module_id: { $in: idsToRemove } });
                await WarehouseModule.deleteMany({ _id: { $in: idsToRemove } });
            }

            return res.status(200).json({ status: 'success', message: 'Warehouse module and its children deleted successfully' });
        }

        if (!otp) {
            return res.status(400).json({ status: 'error', message: 'OTP is required' });
        }

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ status: 'error', message: 'Invalid Module ID format' });
        }

        const otp_record = await Otp.findOne({ user_id, purpose: 'delete_module' }).sort({ created_at: -1 });
        if (!otp_record) {
            return res.status(404).json({ status: "error", message: "No OTP found. Please request a new OTP." });
        }

        if (new Date(otp_record.expires_at) < new Date()) {
            return res.status(410).json({ status: "error", message: "OTP has expired. Please request a new one." });
        }

        const is_otp_valid = await bcrypt.compare(otp, otp_record.otp);
        if (!is_otp_valid) {
            return res.status(400).json({ status: "error", message: "Invalid OTP. Please try again." });
        }

        const currentModule = await CmsModule.findById(id);
        if (!currentModule) {
            return res.status(404).json({ status: 'error', message: 'Module not found' });
        }

        const getAllChildModules = async (moduleId) => {
            let children = [];
            const rows = await CmsModule.find({ parent_module_id: moduleId }).select('_id').lean();
            for (const row of rows) {
                children.push(row._id);
                const subChildren = await getAllChildModules(row._id);
                children = children.concat(subChildren);
            }
            return children;
        };

        const childModuleIds = await getAllChildModules(id);
        const idsToRemove = [id, ...childModuleIds];

        if (idsToRemove.length > 0) {
            // Remove from RoleWiseModule
            await CmsRoleWiseModule.deleteMany({ module_id: { $in: idsToRemove } });
            // Delete the Modules
            await CmsModule.deleteMany({ _id: { $in: idsToRemove } });
        }

        res.status(200).json({ status: 'success', message: 'Module and its children deleted successfully' });

    } catch (error) {
        res.status(500).json({
            status: 'error',
            message: error.message || 'Internal Server Error',
            error: error.message
        });
    }
}

module.exports = {
    get_levels,
    get_modules,
    create_module,
    update_module,
    send_otp_for_update_module,
    send_otp_for_delete_module,
    delete_module,
};


// we need to add new module in popup not sidebar and don't display auto filled fiels like
// panel