const { CmsUser, CmsRoleWiseModule, CmsModule, CmsPanel, RolePanel, PanelSaaSProduct, UserPanel, CmsUserScope, CmsRole } = require('../models/user_db');
const { GeoLevel0, GeoLevel1, Cluster } = require('../models/geolocation_db');

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


// ─── Geographical helpers ────────────────────────────────────────────────────

async function getChildScopeIdsForCountry(countryId) {
    const ids = [];
    const s1 = await GeoLevel1.find({ level_0: countryId }, '_id').lean();
    const stateIds = s1.map(r => r._id);
    ids.push(...stateIds);
    const c = await Cluster.find({ level_1: { $in: stateIds } }, '_id').lean();
    ids.push(...c.map(r => r._id));
    return ids;
}

async function getChildScopeIdsForState(stateId) {
    const c = await Cluster.find({ level_1: stateId }, '_id').lean();
    return c.map(r => r._id);
}

const get_active_countries = async (req, res) => {
    try {
        const currentUserRole = await CmsRole.findById(req.user.role_id).populate('level_id');
        const isSuperAdmin = currentUserRole.level_id.name === 'global';
        let query = { is_active: true, deleted_at: null };
        if (!isSuperAdmin) {
            const userScopes = await CmsUserScope.find({ user_id: req.user.id, deleted_at: null });
            const currentUserScopeIds = userScopes.map(s => s.scope_id.toString());
            const authorizedCountries = [];
            const allCountries = await GeoLevel0.find({ is_active: true, deleted_at: null }).lean();
            for (const country of allCountries) {
                if (currentUserScopeIds.includes(country._id.toString())) {
                    authorizedCountries.push(country._id);
                } else {
                    const hasChildScope = await CmsUserScope.exists({
                        user_id: req.user.id,
                        deleted_at: null,
                        scope_id: { $in: await getChildScopeIdsForCountry(country._id) }
                    });
                    if (hasChildScope) authorizedCountries.push(country._id);
                }
            }
            query._id = { $in: authorizedCountries };
        }
        const rows = await GeoLevel0.find(query, '_id iso2 name');
        const data = rows.map(r => ({ id: String(r._id), iso2: r.iso2, name: r.name }));
        res.status(200).json({ success: true, message: 'Countries fetched successfully', data });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server Error', error: error.message });
    }
};

const get_active_states = async (req, res) => {
    try {
        const country_id = req.query.country_id || req.params.country_id;
        const currentUserRole = await CmsRole.findById(req.user.role_id).populate('level_id');
        const isSuperAdmin = currentUserRole.level_id.name === 'global';
        let query = { is_active: true, deleted_at: null };
        if (country_id) query.level_0 = country_id;
        if (!isSuperAdmin) {
            const userScopes = await CmsUserScope.find({ user_id: req.user.id, deleted_at: null });
            const currentUserScopeIds = userScopes.map(s => s.scope_id.toString());
            const authorizedStates = [];
            const stateCandidates = await GeoLevel1.find(query).lean();
            for (const state of stateCandidates) {
                if (currentUserScopeIds.includes(state._id.toString()) || currentUserScopeIds.includes(state.level_0.toString())) {
                    authorizedStates.push(state._id);
                } else {
                    const hasChildScope = await CmsUserScope.exists({
                        user_id: req.user.id,
                        deleted_at: null,
                        scope_id: { $in: await getChildScopeIdsForState(state._id) }
                    });
                    if (hasChildScope) authorizedStates.push(state._id);
                }
            }
            query._id = { $in: authorizedStates };
        }
        const rows = await GeoLevel1.find(query, '_id name level_0').lean();
        const data = rows.map(r => ({ id: String(r._id), name: r.name, country_id: String(r.level_0) }));
        res.status(200).json({ success: true, message: 'States fetched successfully', data });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server Error', error: error.message });
    }
};

const get_active_clusters = async (req, res) => {
    try {
        const state_id = req.query.state_id || req.params.state_id;
        const currentUserRole = await CmsRole.findById(req.user.role_id).populate('level_id');
        const isSuperAdmin = currentUserRole.level_id.name === 'global';
        let query = { is_active: true, deleted_at: null };
        if (state_id) query.level_1 = state_id;
        if (!isSuperAdmin) {
            const userScopes = await CmsUserScope.find({ user_id: req.user.id, deleted_at: null });
            const currentUserScopeIds = userScopes.map(s => s.scope_id.toString());
            const authorizedClusters = [];
            const clusterCandidates = await Cluster.find(query).lean();
            for (const cluster of clusterCandidates) {
                const state = await GeoLevel1.findById(cluster.level_1).lean();
                if (currentUserScopeIds.includes(cluster._id.toString()) ||
                    currentUserScopeIds.includes(cluster.level_1.toString()) ||
                    (state && currentUserScopeIds.includes(state.level_0.toString()))) {
                    authorizedClusters.push(cluster._id);
                }
            }
            query._id = { $in: authorizedClusters };
        }
        const rows = await Cluster.find(query, '_id name level_1').lean();
        const data = rows.map(r => ({ id: String(r._id), name: r.name, state_id: String(r.level_1) }));
        res.status(200).json({ success: true, message: 'Clusters fetched successfully', data });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server Error', error: error.message });
    }
};

const get_assigned_clusters = async (req, res) => {
    try {
        const userId = req.user.id;
        const currentUserRole = await CmsRole.findById(req.user.role_id).populate('level_id');
        const isSuperAdmin = currentUserRole.level_id.name === 'global';
        let clusters = [];
        if (isSuperAdmin) {
            clusters = await Cluster.find({ is_active: true, deleted_at: null }).populate('level_1').lean();
        } else {
            const userScopes = await CmsUserScope.find({ user_id: userId, deleted_at: null }).lean();
            const scopeIds = userScopes.map(s => s.scope_id.toString());
            const levelName = currentUserRole.level_id.name?.toLowerCase();
            if (levelName === 'country') {
                const states = await GeoLevel1.find({ level_0: { $in: scopeIds }, deleted_at: null }).lean();
                const stateIds = states.map(s => s._id);
                clusters = await Cluster.find({ level_1: { $in: stateIds }, deleted_at: null }).populate('level_1').lean();
            } else if (levelName === 'state') {
                clusters = await Cluster.find({ level_1: { $in: scopeIds }, deleted_at: null }).populate('level_1').lean();
            } else if (levelName === 'cluster') {
                clusters = await Cluster.find({ _id: { $in: scopeIds }, deleted_at: null }).populate('level_1').lean();
            }
        }
        const data = clusters.map(c => ({
            id: String(c._id),
            name: c.name,
            state_id: c.level_1 ? String(c.level_1._id) : null,
            state_name: c.level_1 ? c.level_1.name : null,
            country_id: c.level_1 ? String(c.level_1.level_0) : null
        }));
        return res.status(200).json({ success: true, message: 'Assigned clusters fetched successfully', data });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Server Error', error: error.message });
    }
};

module.exports = {
    get_user_data,
    get_user_modules,
    get_active_countries,
    get_active_states,
    get_active_clusters,
    get_assigned_clusters
};