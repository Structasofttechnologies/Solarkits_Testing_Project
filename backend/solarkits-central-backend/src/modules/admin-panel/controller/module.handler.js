const mongoose = require('mongoose');
const { CmsModule } = require('../models/user_db');

const get_modules_by_level_and_panel = async (req, res) => {
    try {
        const { level_id, panel_id } = req.params;
        if (!panel_id) {
            return res.status(400).json({ status: 'error', message: 'panel_id is required' });
        }

        const rawPanelIds = panel_id.split(',').map(p => p.trim()).filter(Boolean);
        const objPanelIds = rawPanelIds
            .filter(id => mongoose.Types.ObjectId.isValid(id))
            .map(id => new mongoose.Types.ObjectId(id));

        const panelConditions = [
            { panel_id: { $in: rawPanelIds } }
        ];
        if (objPanelIds.length > 0) {
            panelConditions.push({ panel_id: { $in: objPanelIds } });
        }

        const modules = await CmsModule.find({
            $or: panelConditions,
            is_deleted: { $ne: true }
        }).populate('parent_module_id', 'name').sort({ created_at: -1 }).lean();

        const data = modules.map(m => ({
            id: m._id,
            name: m.name,
            unique_code: m.unique_code,
            parent_module_id: m.parent_module_id ? m.parent_module_id._id : null,
            parent_module_name: m.parent_module_id ? m.parent_module_id.name : null,
            level_id: m.level_id,
            panel_id: m.panel_id,
            dashboard_context: m.dashboard_context,
            saas_product_id: m.saas_product_id,
            is_active: m.is_active ? 1 : 0,
            created_at: m.created_at
        }));

        res.status(200).json({ status: 'success', message: 'Modules fetched successfully', data: data });
    } catch (error) {
        console.error("Error in get_modules_by_level_and_panel:", error);
        res.status(500).json({ status: 'error', message: error.message || 'Internal Server Error' });
    }
}

module.exports = {
    get_modules_by_level_and_panel
};