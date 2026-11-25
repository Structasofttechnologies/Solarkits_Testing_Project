const { CmsUser, CmsRoleWiseModule, CmsModule, CmsPanel, RolePanel, PanelSaaSProduct, UserPanel } = require('../models/user_db');

const get_user_data = async (req, res) => {
    try {
        const userId = req.user.id;

        if (req.user.is_warehouse_user) {
            const { WarehouseUser, CompanyWarehouse } = require('../models/company_warehouse_db');
            const user = await WarehouseUser.findById(userId).populate('role_id').lean();
            if (!user) {
                return res.status(404).json({ status: "error", message: "User not found" });
            }
            const warehouse = await CompanyWarehouse.findById(user.warehouse_id).lean();
            return res.status(200).json({
                status: "success",
                message: "User data fetched successfully.",
                data: {
                    id: user._id,
                    name: user.name,
                    email: user.email,
                    phone: user.phone,
                    role: user.role_id?.name || 'manager',
                    is_warehouse_user: true,
                    warehouse_id: user.warehouse_id,
                    warehouse_type: warehouse ? warehouse.warehouse_type : 'master',
                    warehouse_status: warehouse ? warehouse.status : null,
                    rejection_reason: warehouse ? warehouse.rejection_reason : null,
                    allowed_panels: []
                }
            });
        }

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
                            .filter(mp => mp.saas_product_id)
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
                                    .filter(mp => mp.saas_product_id && allowedIds.includes(mp.saas_product_id._id.toString()))
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

        if (req.user.is_warehouse_user) {
            const { WarehouseUser, WarehouseRoleWiseModule, WarehouseModule, CompanyWarehouse } = require('../models/company_warehouse_db');

            const user = await WarehouseUser.findById(userId).lean();
            if (!user || !user.role_id) {
                return res.status(404).json({ status: "error", message: "Warehouse user or role not found" });
            }

            const warehouse = await CompanyWarehouse.findById(user.warehouse_id).lean();
            const warehouseType = warehouse ? warehouse.warehouse_type : 'master';

            // Auto-sync missing permission mappings for this role
            const allWarehouseModules = await WarehouseModule.find({ is_deleted: false, is_active: true }).lean();
            const existingMappings = await WarehouseRoleWiseModule.find({ role_id: user.role_id, deleted_at: null }).lean();
            const mappedModuleIds = existingMappings.map(em => em.module_id.toString());

            const missingModules = allWarehouseModules.filter(m => !mappedModuleIds.includes(m._id.toString()));
            if (missingModules.length > 0) {
                const newMappings = missingModules.map(m => ({
                    role_id: user.role_id,
                    module_id: m._id,
                    can_view: true,
                    can_add: true,
                    can_edit: true,
                    can_delete: true,
                    created_at: new Date()
                }));
                await WarehouseRoleWiseModule.insertMany(newMappings);
            }

            // Fetch allowed modules
            const roleWiseModules = await WarehouseRoleWiseModule.find({
                role_id: user.role_id,
                can_view: true,
                deleted_at: null
            }).lean();

            const moduleIds = roleWiseModules.map(rwm => rwm.module_id);
            const activeModules = await WarehouseModule.find({
                _id: { $in: moduleIds },
                is_active: true,
                is_deleted: false,
                warehouse_type: { $in: [warehouseType, 'both'] }
            }).lean();

            const modulesList = roleWiseModules.map(rwm => {
                const m = activeModules.find(mod => mod._id.toString() === rwm.module_id.toString());
                if (!m) return null;
                return {
                    id: m._id,
                    name: m.name,
                    unique_id: m.unique_code,
                    can_view: rwm.can_view ? 1 : 0,
                    can_add: rwm.can_add ? 1 : 0,
                    can_edit: rwm.can_edit ? 1 : 0,
                    can_delete: rwm.can_delete ? 1 : 0
                };
            }).filter(Boolean);

            // Ensure Home (00000000) is included
            const hasHome = modulesList.some(m => m.unique_id === '00000000');
            if (!hasHome) {
                modulesList.push({ id: 0, name: 'Home', unique_id: '00000000', can_view: 1, can_add: 0, can_edit: 0, can_delete: 0 });
            }

            return res.status(200).json({
                status: "success",
                message: "User modules fetched successfully.",
                data: modulesList
            });
        }

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