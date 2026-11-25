const { CmsUser, CmsRoleWiseModule, CmsModule, CmsPanel, RolePanel, PanelSaaSProduct, UserPanel } = require('../models/user_db');

const get_user_data = async (req, res) => {
    try {
        const userId = req.user.id;

        const user = await CmsUser.findById(userId)
            .populate({
                path: 'role_id',
                populate: [
                    { path: 'department_id', populate: { path: 'panel_id' } },
                    { path: 'level_id' }
                ]
            }).lean();

        if (!user) {
            return res.status(404).json({ status: "error", message: "User not found" });
        }

        const role = user.role_id;
        const dept = role ? role.department_id : null;
        const panel = dept ? dept.panel_id : null;
        const level = role ? role.level_id : null;

        // Fetch allowed panels for switcher
        let allowedPanels = [];
        if (role) {
            const isSuperAdmin = role.name === 'Super Admin' || dept?.level === 'global';
            if (isSuperAdmin) {
                const allActivePanels = await CmsPanel.find({ is_active: true, is_deleted: false }).lean();
                allowedPanels = await Promise.all(allActivePanels.map(async (p) => {
                    const mappedProducts = await PanelSaaSProduct.find({ panel_id: p._id })
                        .populate('saas_product_id')
                        .lean();
                    return {
                        id: p._id,
                        name: p.name,
                        url_prefix: p.url_prefix,
                        saas_products: mappedProducts
                            .filter(mp => mp.saas_product_id && mp.saas_product_id.is_active && !mp.saas_product_id.is_deleted)
                            .map(mp => ({
                                id: mp.saas_product_id._id,
                                name: mp.saas_product_id.name,
                                slug: mp.saas_product_id.slug
                            }))
                    };
                }));
            } else {
                const pivotPanels = await RolePanel.find({ role_id: role._id })
                    .populate('panel_id')
                    .lean();
                allowedPanels = await Promise.all(
                    pivotPanels
                        .filter(p => p.panel_id && !p.panel_id.deleted_at && p.panel_id.is_active !== false)
                        .map(async (p) => {
                            const mappedProducts = await PanelSaaSProduct.find({ panel_id: p.panel_id._id })
                                .populate('saas_product_id')
                                .lean();

                            const userPanelMapping = await UserPanel.findOne({ user_id: userId, panel_id: p.panel_id._id }).lean();
                            const allowedIds = (userPanelMapping?.saas_product_ids || []).map(id => id.toString());

                            return {
                                id: p.panel_id._id,
                                name: p.panel_id.name,
                                url_prefix: p.panel_id.url_prefix,
                                saas_products: mappedProducts
                                    .filter(mp => mp.saas_product_id && mp.saas_product_id.is_active && !mp.saas_product_id.is_deleted && allowedIds.includes(mp.saas_product_id._id.toString()))
                                    .map(mp => ({
                                        id: mp.saas_product_id._id,
                                        name: mp.saas_product_id.name,
                                        slug: mp.saas_product_id.slug
                                    }))
                            };
                        })
                );
            }
        }

        return res.status(200).json({
            status: "success",
            message: "User data fetched successfully.",
            data: {
                id: user._id,
                name: user.name,
                email: user.email,
                phone: user.phone,
                role: role ? role.name : null,
                department: dept ? dept.name : null,
                level: level ? level.name : 'Standard Access',
                url_prefix: panel ? panel.url_prefix : null,
                country: user.country || 'India',
                allowed_panels: allowedPanels
            }
        });

    } catch (error) {
        console.error("Error fetching user data:", error);
        return res.status(500).json({ message: "Internal server error", error: error.message });
    }
};

const get_user_modules = async (req, res) => {
    try {
        const userId = req.user.id;
        const isSuperAdmin = req.user.is_super_admin;
        const panelId = req.user.panel_id;

        let modules = [];

        if (isSuperAdmin && panelId) {
            const activeModules = await CmsModule.find({ panel_id: panelId, is_deleted: false }).populate('level_id').lean();
            modules = activeModules.map(m => ({
                id: m._id,
                name: m.name,
                unique_id: m.unique_code,
                dashboard_context: m.dashboard_context,
                saas_product_id: m.saas_product_id,
                level_id: m.level_id?._id || m.level_id,
                level_name: m.level_id?.name,
                can_view: 1,
                can_add: 1,
                can_edit: 1,
                can_delete: 1
            }));
        } else {
            const user = await CmsUser.findById(userId).lean();
            if (!user || !user.role_id) {
                return res.status(404).json({ status: "error", message: "User role or panel not found" });
            }

            const roleWiseModules = await CmsRoleWiseModule.find({
                role_id: user.role_id,
                can_view: true
            }).populate({
                path: 'module_id',
                populate: { path: 'level_id' }
            }).lean();

            modules = roleWiseModules.filter(rwm => rwm.module_id).map(rwm => {
                return ({
                    id: rwm.module_id._id,
                    name: rwm.module_id.name,
                    unique_id: rwm.module_id.unique_code,
                    dashboard_context: rwm.module_id.dashboard_context,
                    saas_product_id: rwm.module_id.saas_product_id,
                    level_id: rwm.module_id.level_id?._id || rwm.module_id.level_id,
                    level_name: rwm.module_id.level_id?.name,
                    can_view: rwm.can_view ? 1 : 0,
                    can_add: rwm.can_add ? 1 : 0,
                    can_edit: rwm.can_edit ? 1 : 0,
                    can_delete: rwm.can_delete ? 1 : 0
                })
            });
        }

        modules.sort((a, b) => {
            const aId = a.id ? a.id.toString() : '';
            const bId = b.id ? b.id.toString() : '';
            return aId.localeCompare(bId);
        });

        modules.push({ id: 0, name: 'Home', unique_id: '00000000', level_id: null, level_name: null, can_view: 1, can_add: 0, can_edit: 0, can_delete: 0 });
        return res.status(200).json({ status: "success", message: "User modules fetched successfully.", data: modules });
    } catch (error) {
        console.error("Error fetching user modules:", error);
        return res.status(500).json({ message: "Internal server error", error: error.message });
    }
};

module.exports = { get_user_data, get_user_modules };