const mongoose = require('mongoose');
const { CmsUser, CmsRole, CmsLevel, CmsDepartment, CmsUserScope, UserPanel, CmsPanel, PanelSaaSProduct, RolePanel, SaaSProduct, CountrySaaSProduct } = require("../models/user_db");
const { GeoLevel0, GeoLevel1, GeoLevel2, GeoLevel3, GeoLevel4, Cluster } = require("../models/geolocation_db");
const { user_db, geolocation_db } = require("../config/databases");

// --- HELPERS ---

// Get all descendant role IDs (recursive)
async function getDescendantRoleIds(roleId) {
    let descendantIds = [];
    let rolesToProcess = [roleId];
    while (rolesToProcess.length > 0) {
        const children = await CmsRole.find({ parent_role_id: { $in: rolesToProcess }, deleted_at: null }, '_id').lean();
        if (children.length === 0) break;
        const childIds = children.map(c => c._id);
        descendantIds.push(...childIds);
        rolesToProcess = childIds;
    }
    return descendantIds;
}

// Get all descendant user IDs (recursive reporting chain)
async function getDescendantUserIds(userId) {
    let descendantIds = [];
    let usersToProcess = [userId];
    while (usersToProcess.length > 0) {
        const children = await CmsUser.find({ parent_user_id: { $in: usersToProcess }, deleted_at: null }, '_id').lean();
        if (children.length === 0) break;
        const childIds = children.map(c => c._id);
        descendantIds.push(...childIds);
        usersToProcess = childIds;
    }
    return descendantIds;
}

// Check if scope B is within scope A (or same)
async function isScopeAuthorized(currentUserRole, currentUserScopeIds, targetLevel, targetScopeId) {
    if (currentUserRole.level_id.name === 'global') return true;
    if (currentUserScopeIds.some(id => id.toString() === targetScopeId.toString())) return true;

    // Dynamically find the scope level and document
    let scope = null;
    let tableName = null;

    scope = await GeoLevel2.findById(targetScopeId).lean();
    if (scope) {
        tableName = 'geolocation_level_2';
    } else {
        scope = await Cluster.findById(targetScopeId).lean();
        if (scope) {
            tableName = 'clusters';
        } else {
            scope = await GeoLevel1.findById(targetScopeId).lean();
            if (scope) {
                tableName = 'geolocation_level_1';
            } else {
                scope = await GeoLevel0.findById(targetScopeId).lean();
                if (scope) {
                    tableName = 'geolocation_level_0';
                } else {
                    scope = await GeoLevel3.findById(targetScopeId).lean();
                    if (scope) {
                        tableName = 'geolocation_level_3';
                    } else {
                        scope = await GeoLevel4.findById(targetScopeId).lean();
                        if (scope) {
                            tableName = 'geolocation_level_4';
                        }
                    }
                }
            }
        }
    }

    if (!scope) return false;

    // Resolve B's hierarchy parents
    const parents = [String(scope._id)];
    if (tableName === 'geolocation_level_1') {
        if (scope.level_0) parents.push(String(scope.level_0));
    } else if (tableName === 'clusters') {
        if (scope.level_1) parents.push(String(scope.level_1));
    } else if (tableName === 'geolocation_level_2') {
        if (scope.level_1) parents.push(String(scope.level_1));
        if (scope.cluster) parents.push(String(scope.cluster));
    } else if (tableName === 'geolocation_level_3') {
        if (scope.level_2) parents.push(String(scope.level_2));
        const district = await GeoLevel2.findById(scope.level_2).lean();
        if (district) {
            if (district.level_1) parents.push(String(district.level_1));
            if (district.cluster) parents.push(String(district.cluster));
        }
    } else if (tableName === 'geolocation_level_4') {
        if (scope.level_3) parents.push(String(scope.level_3));
        const urban = await GeoLevel3.findById(scope.level_3).lean();
        if (urban) {
            if (urban.level_2) parents.push(String(urban.level_2));
            const district = await GeoLevel2.findById(urban.level_2).lean();
            if (district) {
                if (district.level_1) parents.push(String(district.level_1));
                if (district.cluster) parents.push(String(district.cluster));
            }
        }
    }

    // Resolve country from state if not already resolved
    let stateId = null;
    if (tableName === 'geolocation_level_1') {
        stateId = scope._id;
    } else if (tableName === 'clusters') {
        stateId = scope.level_1;
    } else if (tableName === 'geolocation_level_2') {
        stateId = scope.level_1;
    } else if (tableName === 'geolocation_level_3') {
        const district = await GeoLevel2.findById(scope.level_2).lean();
        stateId = district?.level_1;
    } else if (tableName === 'geolocation_level_4') {
        const urban = await GeoLevel3.findById(scope.level_3).lean();
        const district = await GeoLevel2.findById(urban?.level_2).lean();
        stateId = district?.level_1;
    }

    if (stateId) {
        const stateObj = await GeoLevel1.findById(stateId).lean();
        if (stateObj && stateObj.level_0) {
            parents.push(String(stateObj.level_0));
        }
    }

    // Check if B or any parent of B is authorized by the current user's scope IDs
    return parents.some(pid => currentUserScopeIds.some(id => id.toString() === pid));
}

// Geographical Sub-scope Discovery Helpers (for filtering)
async function getChildScopeIdsForCountry(countryId) {
    const ids = [];
    const s1 = await GeoLevel1.find({ level_0: countryId }, '_id').lean();
    ids.push(...s1.map(r => r._id));
    const c = await Cluster.find({ level_0: countryId }, '_id').lean();
    ids.push(...c.map(r => r._id));
    const d = await GeoLevel2.find({ level_0: countryId }, '_id').lean();
    ids.push(...d.map(r => r._id));
    return ids;
}
async function getChildScopeIdsForState(stateId) {
    const ids = [];
    const c = await Cluster.find({ level_1: stateId }, '_id').lean();
    ids.push(...c.map(r => r._id));
    const d = await GeoLevel2.find({ level_1: stateId }, '_id').lean();
    ids.push(...d.map(r => r._id));
    return ids;
}
async function getChildScopeIdsForCluster(clusterId) {
    const ids = [];
    const d = await GeoLevel2.find({ cluster: clusterId }, '_id').lean();
    ids.push(...d.map(r => r._id));
    return ids;
}
async function getChildScopeIdsForDistrict(districtId) {
    const ids = [];
    const u = await GeoLevel3.find({ level_2: districtId }, '_id').lean();
    ids.push(...u.map(r => r._id));
    return ids;
}
async function getChildScopeIdsForUrban(urbanId) {
    const ids = [];
    const r = await GeoLevel4.find({ level_3: urbanId }, '_id').lean();
    ids.push(...r.map(r => r._id));
    return ids;
}

// Get all scopes that cover the given scopes (itself + all parents)
async function getCoveringScopeIds(sourceScopeIds, sourceGeoTable) {
    if (!sourceScopeIds || sourceScopeIds.length === 0 || !sourceGeoTable) return [];

    const geoModels = {
        'geolocation_level_0': GeoLevel0, 'geolocation_level_1': GeoLevel1, 'geolocation_level_2': GeoLevel2,
        'geolocation_level_3': GeoLevel3, 'geolocation_level_4': GeoLevel4, 'clusters': Cluster
    };

    const hierarchy = ['geolocation_level_4', 'geolocation_level_3', 'geolocation_level_2', 'clusters', 'geolocation_level_1', 'geolocation_level_0'];
    let startIndex = hierarchy.indexOf(sourceGeoTable);
    if (startIndex === -1) return sourceScopeIds;

    let resultIds = new Set(sourceScopeIds.map(id => id.toString()));
    let currentLevelIds = sourceScopeIds;

    for (let i = startIndex; i < hierarchy.length - 1; i++) {
        const currentLevelTable = hierarchy[i];
        let parentField = '';
        if (currentLevelTable === 'geolocation_level_4') parentField = 'level_3';
        else if (currentLevelTable === 'geolocation_level_3') parentField = 'level_2';
        else if (currentLevelTable === 'geolocation_level_2') parentField = 'cluster';
        else if (currentLevelTable === 'clusters') parentField = 'level_1';
        else if (currentLevelTable === 'geolocation_level_1') parentField = 'level_0';

        if (!parentField) break;

        const rows = await geoModels[currentLevelTable].find({ _id: { $in: currentLevelIds } }).lean();
        currentLevelIds = [...new Set(rows.map(r => r[parentField]).filter(Boolean))];
        if (currentLevelIds.length === 0) break;
        currentLevelIds.forEach(id => resultIds.add(id.toString()));
    }
    return [...resultIds];
}

// --- HANDLERS ---

const get_active_countries = async (req, res) => {
    try {
        const currentUserRole = await CmsRole.findById(req.user.role_id).populate('level_id');
        const isSuperAdmin = currentUserRole.level_id.name === 'global';
        let query = { is_active: true, deleted_at: null };
        if (!isSuperAdmin) {
            const userScopes = await CmsUserScope.find({ user_id: req.user.id, deleted_at: null });
            const currentUserScopeIds = userScopes.map(s => s.scope_id);
            const authorizedCountries = [];
            const allCountries = await GeoLevel0.find({ is_active: true, deleted_at: null }).lean();
            for (const country of allCountries) {
                if (currentUserScopeIds.some(id => id.toString() === country._id.toString())) {
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
}

// Internal helper to automatically resolve the first valid parent user based on hierarchy and scope
async function resolve_parent_user_internal(role_id, scope_ids, reqUser, isSuperAdmin, subordinateUserIds) {
    if (!role_id || !scope_ids || scope_ids.length === 0) return null;

    const geoModels = {
        'geolocation_level_0': GeoLevel0, 'geolocation_level_1': GeoLevel1, 'geolocation_level_2': GeoLevel2,
        'geolocation_level_3': GeoLevel3, 'geolocation_level_4': GeoLevel4, 'clusters': Cluster
    };

    const currentRole = await CmsRole.findOne({ _id: role_id, deleted_at: null }).populate('level_id');
    if (!currentRole || !currentRole.parent_role_id) return null;

    const coveringScopeIds = await getCoveringScopeIds(scope_ids, currentRole.level_id.geo_table_name);

    let currentRoleId = currentRole.parent_role_id;
    const visitedRoleIds = new Set();

    while (currentRoleId) {
        if (visitedRoleIds.has(currentRoleId.toString())) break;
        visitedRoleIds.add(currentRoleId.toString());

        const roleInfo = await CmsRole.findOne({ _id: currentRoleId, deleted_at: null }).populate('level_id');
        if (!roleInfo) break;

        const nextParentRoleId = roleInfo.parent_role_id;
        const parentGeoTable = roleInfo.level_id.geo_table_name;

        let uQuery = { role_id: currentRoleId, is_active: true, deleted_at: null };

        if (parentGeoTable) {
            const scopes = await CmsUserScope.find({ scope_id: { $in: coveringScopeIds }, deleted_at: null });
            const userIds = scopes.map(s => s.user_id);
            uQuery._id = { $in: userIds };
        }

        if (!isSuperAdmin) {
            const authorizedIds = [reqUser.id, ...subordinateUserIds].map(id => id.toString());
            if (uQuery._id) {
                uQuery._id.$in = uQuery._id.$in.filter(id => authorizedIds.includes(id.toString()));
            } else {
                uQuery._id = { $in: authorizedIds };
            }
        }

        const parents = await CmsUser.find(uQuery).populate('role_id').lean();
        if (parents.length > 0) {
            for (const p of parents) {
                const pScopes = await CmsUserScope.find({ user_id: p._id, deleted_at: null });
                const pScopeIds = pScopes.map(s => s.scope_id);
                const pRole = await CmsRole.findById(p.role_id).populate('level_id').lean();

                let coversAll = true;
                for (const childScopeId of scope_ids) {
                    const authorized = await isScopeAuthorized(pRole, pScopeIds, null, childScopeId);
                    if (!authorized) {
                        coversAll = false;
                        break;
                    }
                }
                if (coversAll) {
                    return p._id;
                }
            }
        }

        currentRoleId = nextParentRoleId;
    }
    return null;
}

// Re-evaluate and reassign direct subordinates if their parent is no longer valid
async function heal_subordinates(userId) {
    const subordinates = await CmsUser.find({ parent_user_id: userId, deleted_at: null });
    for (const sub of subordinates) {
        const userScopes = await CmsUserScope.find({ user_id: sub._id, deleted_at: null });
        const scopeIds = userScopes.map(s => s.scope_id);

        // Use the resolution logic to find the closest valid active parent (ignoring provisioner context)
        const resolvedId = await resolve_parent_user_internal(sub.role_id, scopeIds, null, true, []);

        // If the resolved parent is different from the current one, update it
        // This handles cases where the current parent is deactivated or moved to an incompatible role/scope
        if (resolvedId && resolvedId.toString() !== userId.toString()) {
            sub.parent_user_id = resolvedId;
            await sub.save();
        } else if (!resolvedId) {
            // Fallback: If no valid parent found in the chain, set to null
            sub.parent_user_id = null;
            await sub.save();
        }
    }
}

const get_active_states = async (req, res) => {
    try {
        const { country_id } = req.params;
        const currentUserRole = await CmsRole.findById(req.user.role_id).populate('level_id');
        const isSuperAdmin = currentUserRole.level_id.name === 'global';
        let query = { is_active: true, level_0: country_id, deleted_at: null };
        if (!isSuperAdmin) {
            const userScopes = await CmsUserScope.find({ user_id: req.user.id, deleted_at: null });
            const currentUserScopeIds = userScopes.map(s => s.scope_id);
            const authorizedStates = [];
            const rowsInCountry = await GeoLevel1.find({ level_0: country_id, deleted_at: null }).lean();
            for (const state of rowsInCountry) {
                if (currentUserScopeIds.some(id => id.toString() === state._id.toString() || id.toString() === state.level_0.toString())) {
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
        const rows = await GeoLevel1.find(query, '_id name level_0');
        const data = rows.map(r => ({ id: String(r._id), name: r.name, country_id: String(r.level_0) }));
        res.status(200).json({ success: true, message: 'States fetched successfully', data });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server Error', error: error.message });
    }
}

const get_active_clusters = async (req, res) => {
    try {
        const { state_id } = req.params;
        const currentUserRole = await CmsRole.findById(req.user.role_id).populate('level_id');
        const isSuperAdmin = currentUserRole.level_id.name === 'global';
        let query = { level_1: state_id, deleted_at: null };
        if (!isSuperAdmin) {
            const userScopes = await CmsUserScope.find({ user_id: req.user.id, deleted_at: null });
            const currentUserScopeIds = userScopes.map(s => s.scope_id);
            const authorizedClusters = [];
            const rowsInState = await Cluster.find({ level_1: state_id, deleted_at: null }).lean();
            const state = await GeoLevel1.findById(state_id).lean();
            for (const cluster of rowsInState) {
                if (currentUserScopeIds.some(id =>
                    id.toString() === cluster._id.toString() ||
                    id.toString() === cluster.level_1.toString() ||
                    (state && id.toString() === state.level_0.toString())
                )) {
                    authorizedClusters.push(cluster._id);
                } else {
                    const hasChildScope = await CmsUserScope.exists({
                        user_id: req.user.id,
                        deleted_at: null,
                        scope_id: { $in: await getChildScopeIdsForCluster(cluster._id) }
                    });
                    if (hasChildScope) authorizedClusters.push(cluster._id);
                }
            }
            query._id = { $in: authorizedClusters };
        }
        const rows = await Cluster.find(query, '_id name level_1');
        const data = rows.map(r => ({ id: String(r._id), name: r.name, state_id: String(r.level_1) }));
        res.status(200).json({ success: true, message: 'Clusters fetched successfully', data });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server Error', error: error.message });
    }
}

const get_active_districts = async (req, res) => {
    try {
        const { cluster_id } = req.params;
        const currentUserRole = await CmsRole.findById(req.user.role_id).populate('level_id');
        const isSuperAdmin = currentUserRole.level_id.name === 'global';
        let query = { is_active: true, cluster: cluster_id, deleted_at: null };
        if (!isSuperAdmin) {
            const userScopes = await CmsUserScope.find({ user_id: req.user.id, deleted_at: null });
            const currentUserScopeIds = userScopes.map(s => s.scope_id);
            const authorizedDistricts = [];
            const rowsInCluster = await GeoLevel2.find({ cluster: cluster_id, deleted_at: null }).lean();
            const cluster = await Cluster.findById(cluster_id).lean();
            for (const district of rowsInCluster) {
                if (currentUserScopeIds.some(id =>
                    id.toString() === district._id.toString() ||
                    id.toString() === district.cluster.toString() ||
                    (cluster && (id.toString() === cluster.level_1.toString() || id.toString() === cluster.level_0.toString()))
                )) {
                    authorizedDistricts.push(district._id);
                } else {
                    const hasChildScope = await CmsUserScope.exists({
                        user_id: req.user.id,
                        deleted_at: null,
                        scope_id: { $in: await getChildScopeIdsForDistrict(district._id) }
                    });
                    if (hasChildScope) authorizedDistricts.push(district._id);
                }
            }
            query._id = { $in: authorizedDistricts };
        }
        const rows = await GeoLevel2.find(query, '_id name cluster level_1');
        const data = rows.map(r => ({ id: String(r._id), name: r.name, cluster_id: String(r.cluster), state_id: String(r.level_1) }));
        res.status(200).json({ success: true, message: 'Districts fetched successfully', data });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server Error', error: error.message });
    }
}

const get_urban_cities = async (req, res) => {
    try {
        const { district_id } = req.params;
        const currentUserRole = await CmsRole.findById(req.user.role_id).populate('level_id');
        const isSuperAdmin = currentUserRole.level_id.name === 'global';
        let query = { level_2: district_id, deleted_at: null };
        if (!isSuperAdmin) {
            const userScopes = await CmsUserScope.find({ user_id: req.user.id, deleted_at: null });
            const currentUserScopeIds = userScopes.map(s => s.scope_id);
            const authorizedCities = [];
            const rowsInDistrict = await GeoLevel3.find({ level_2: district_id, deleted_at: null }).lean();
            const district = await GeoLevel2.findById(district_id).lean();
            for (const city of rowsInDistrict) {
                if (currentUserScopeIds.some(id =>
                    id.toString() === city._id.toString() ||
                    id.toString() === city.level_2.toString() ||
                    (district && (id.toString() === district.cluster.toString() || id.toString() === district.level_0.toString()))
                )) {
                    authorizedCities.push(city._id);
                } else {
                    const hasChildScope = await CmsUserScope.exists({
                        user_id: req.user.id,
                        deleted_at: null,
                        scope_id: { $in: await getChildScopeIdsForUrban(city._id) }
                    });
                    if (hasChildScope) authorizedCities.push(city._id);
                }
            }
            query._id = { $in: authorizedCities };
        }
        const rows = await GeoLevel3.find(query, '_id name');
        const data = rows.map(r => ({ id: String(r._id), name: r.name }));
        res.status(200).json({ status: "success", message: "Urban cities fetched successfully", data });
    } catch (error) {
        res.status(500).json({ status: "error", message: 'Internal Server Error' })
    }
}

const get_rural_cities = async (req, res) => {
    try {
        const { urban_city_id } = req.params;
        const currentUserRole = await CmsRole.findById(req.user.role_id).populate('level_id');
        const isSuperAdmin = currentUserRole.level_id.name === 'global';
        let query = { level_3: urban_city_id, deleted_at: null };
        if (!isSuperAdmin) {
            const userScopes = await CmsUserScope.find({ user_id: req.user.id, deleted_at: null });
            const currentUserScopeIds = userScopes.map(s => s.scope_id);
            const authorizedCities = [];
            const rowsInUrban = await GeoLevel4.find({ level_3: urban_city_id, deleted_at: null }).lean();
            const urbanCity = await GeoLevel3.findById(urban_city_id).lean();
            for (const city of rowsInUrban) {
                if (currentUserScopeIds.some(id =>
                    id.toString() === city._id.toString() ||
                    id.toString() === city.level_3.toString() ||
                    (urbanCity && (id.toString() === urbanCity.level_2.toString() || id.toString() === urbanCity.level_0.toString()))
                )) {
                    authorizedCities.push(city._id);
                }
            }
            query._id = { $in: authorizedCities };
        }
        const rows = await GeoLevel4.find(query, '_id name');
        const data = rows.map(r => ({ id: String(r._id), name: r.name }));
        res.status(200).json({ status: "success", message: "Rural cities fetched successfully", data });
    } catch (error) {
        res.status(500).json({ status: "error", message: 'Internal Server Error' })
    }
}

const get_departments = async (req, res) => {
    try {
        const { country_id } = req.query;
        let query = { deleted_at: null };
        if (country_id === 'global') {
            query.level = 'global';
        } else if (country_id) {
            query.$or = [
                { level: 'global' },
                { level: 'country', country_ids: country_id },
                { level: 'country', country_id: country_id },
                { level: 'country', country_ids: { $size: 0 } },
                { level: 'country', country_ids: { $exists: false } }
            ];
        }

        let rows = await CmsDepartment.find(query, '_id name level country_ids');

        // Auto-seed core departments if only Super Admin or none exists
        if (rows.length <= 1) {
            try {
                const ensureAdminUser = require('../../../utils/ensureAdminUser');
                await ensureAdminUser();
                rows = await CmsDepartment.find({ deleted_at: null }, '_id name level country_ids');
            } catch (seedErr) {
                console.warn('Auto-seed core departments notice:', seedErr.message);
            }
        }

        const data = rows.map(r => ({
            id: String(r._id),
            name: r.name,
            level: r.level || 'global',
            country_ids: r.country_ids ? r.country_ids.map(id => String(id)) : []
        }));
        res.status(200).json({ success: true, message: 'Departments fetched successfully', data });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server Error', error: error.message });
    }
}

const get_roles_by_level = async (req, res) => {
    try {
        const currentUserRole = await CmsRole.findById(req.user.role_id).populate('level_id');
        if (!currentUserRole) return res.status(403).json({ success: false, message: 'Unauthorized' });
        const isSuperAdmin = currentUserRole.level_id?.name === 'global';
        let query = { level_id: req.params.level_id, deleted_at: null };
        if (!isSuperAdmin) {
            const descendantRoleIds = await getDescendantRoleIds(req.user.role_id);
            query._id = { $in: descendantRoleIds };
        }
        let rows = await CmsRole.find(query, '_id name country_id').lean();
        if (rows.length === 0) {
            const fallbackQuery = { deleted_at: null };
            if (!isSuperAdmin) {
                const descendantRoleIds = await getDescendantRoleIds(req.user.role_id);
                fallbackQuery._id = { $in: descendantRoleIds };
            }
            rows = await CmsRole.find(fallbackQuery, '_id name country_id').lean();
        }
        const data = await Promise.all(rows.map(async r => {
            const pivotPanels = await RolePanel.find({ role_id: r._id }).lean();
            const mappedPanels = pivotPanels.map(p => String(p.panel_id));
            return {
                id: String(r._id),
                name: r.name,
                country_id: r.country_id ? String(r.country_id) : null,
                panels: mappedPanels
            };
        }));
        res.status(200).json({ success: true, message: 'Roles fetched successfully', data });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server Error', error: error.message });
    }
}

const get_roles_by_level_and_department = async (req, res) => {
    try {
        const currentUserRole = await CmsRole.findById(req.user.role_id).populate('level_id');
        if (!currentUserRole) return res.status(403).json({ success: false, message: 'Unauthorized' });
        const isSuperAdmin = currentUserRole.level_id?.name === 'global';
        let query = { department_id: req.params.department_id, deleted_at: null };
        if (req.params.level_id) {
            query.level_id = req.params.level_id;
        }
        if (!isSuperAdmin) {
            const descendantRoleIds = await getDescendantRoleIds(req.user.role_id);
            query._id = { $in: descendantRoleIds };
        }
        let rows = await CmsRole.find(query, '_id name country_id').lean();

        // Fallback: If no role specifically mapped to this level_id, return all roles in this department
        if (rows.length === 0) {
            const fallbackQuery = { department_id: req.params.department_id, deleted_at: null };
            if (!isSuperAdmin) {
                const descendantRoleIds = await getDescendantRoleIds(req.user.role_id);
                fallbackQuery._id = { $in: descendantRoleIds };
            }
            rows = await CmsRole.find(fallbackQuery, '_id name country_id').lean();
        }

        const data = await Promise.all(rows.map(async r => {
            const pivotPanels = await RolePanel.find({ role_id: r._id }).lean();
            const mappedPanels = pivotPanels.map(p => String(p.panel_id));
            return {
                id: String(r._id),
                name: r.name,
                country_id: r.country_id ? String(r.country_id) : null,
                panels: mappedPanels
            };
        }));
        res.status(200).json({ success: true, message: 'Roles fetched successfully', data });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server Error', error: error.message });
    }
}

const get_levels = async (req, res) => {
    try {
        const currentUserRole = await CmsRole.findById(req.user.role_id).populate('level_id');
        const isSuperAdmin = currentUserRole.level_id.name === 'global';
        let query = { deleted_at: null };
        if (!isSuperAdmin) {
            query.name = { $ne: "global" };
            query.scope_priority = { $gte: currentUserRole.level_id.scope_priority };
        }
        const rows = await CmsLevel.find(query).sort({ scope_priority: 1 });
        const data = rows.map(r => ({
            id: String(r._id),
            name: r.name,
            scope_priority: r.scope_priority,
            geo_table_name: r.geo_table_name,
            is_active: r.is_active ? 1 : 0,
            created_at: r.created_at
        }));
        res.status(200).json({ success: true, message: 'Levels fetched successfully', data });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server Error', error: error.message });
    }
}

const get_parent_users = async (req, res) => {
    try {
        const { role_id, scope_ids = [] } = req.body;
        if (!role_id) return res.status(400).json({ success: false, message: "role_id is required" });
        const currentRole = await CmsRole.findOne({ _id: role_id, deleted_at: null }).populate('level_id');
        if (!currentRole || !currentRole.parent_role_id) return res.json({ success: true, data: [] });

        const currentUserRole = await CmsRole.findById(req.user.role_id).populate('level_id');
        const isSuperAdmin = currentUserRole.level_id.name === 'global';
        let subordinateUserIds = [];
        if (!isSuperAdmin) subordinateUserIds = await getDescendantUserIds(req.user.id);

        const geoModels = {
            'geolocation_level_0': GeoLevel0, 'geolocation_level_1': GeoLevel1, 'geolocation_level_2': GeoLevel2,
            'geolocation_level_3': GeoLevel3, 'geolocation_level_4': GeoLevel4, 'clusters': Cluster
        };

        const coveringScopeIds = await getCoveringScopeIds(scope_ids, currentRole.level_id.geo_table_name);

        let currentRoleId = currentRole.parent_role_id;
        const visitedRoleIds = new Set();

        while (currentRoleId) {
            // Prevent infinite loops in case of circular hierarchy configuration
            if (visitedRoleIds.has(currentRoleId.toString())) {
                console.error("Circular hierarchy detected for role:", currentRoleId);
                break;
            }
            visitedRoleIds.add(currentRoleId.toString());

            const roleInfo = await CmsRole.findOne({ _id: currentRoleId, deleted_at: null }).populate('level_id');
            if (!roleInfo) break;

            const nextParentRoleId = roleInfo.parent_role_id;
            const parentGeoTable = roleInfo.level_id.geo_table_name;

            let uQuery = { role_id: currentRoleId, is_active: true, deleted_at: null };

            if (parentGeoTable) {
                // Tiered Level Parent - Must have jurisdiction over ANY of the target scopes
                const scopes = await CmsUserScope.find({ scope_id: { $in: coveringScopeIds }, deleted_at: null });
                const userIds = scopes.map(s => s.user_id);
                uQuery._id = { $in: userIds };
            }

            if (!isSuperAdmin) {
                const authorizedIds = [req.user.id, ...subordinateUserIds].map(id => id.toString());
                if (uQuery._id) {
                    // Intersection of scope-authorized users and provisioner's subordinates
                    uQuery._id.$in = uQuery._id.$in.filter(id => authorizedIds.includes(id.toString()));
                } else {
                    uQuery._id = { $in: authorizedIds };
                }
            }

            const parents = await CmsUser.find(uQuery).populate('role_id').lean();
            if (parents.length > 0) {
                const filteredParents = [];
                for (const p of parents) {
                    const pScopes = await CmsUserScope.find({ user_id: p._id, deleted_at: null });
                    const pScopeIds = pScopes.map(s => s.scope_id);
                    const pRole = await CmsRole.findById(p.role_id).populate('level_id').lean();

                    let coversAll = true;
                    for (const childScopeId of scope_ids) {
                        const authorized = await isScopeAuthorized(pRole, pScopeIds, null, childScopeId);
                        if (!authorized) {
                            coversAll = false;
                            break;
                        }
                    }
                    if (coversAll) {
                        filteredParents.push({
                            id: String(p._id),
                            name: p.name,
                            role_id: p.role_id ? String(p.role_id._id) : null,
                            role_name: p.role_id?.name
                        });
                    }
                }

                if (filteredParents.length > 0) {
                    return res.json({ success: true, data: filteredParents });
                }
            }

            currentRoleId = nextParentRoleId;
        }
        return res.json({ success: true, data: [] });
    } catch (error) {
        return res.status(500).json({ success: false, message: "Internal Server Error", error: error.message });
    }
}

const get_scope_hierarchy = async (req, res) => {
    try {
        const { scope_id } = req.params;

        let scope = null;
        let tableName = null;

        // Scan tables to determine actual level of the scope ID dynamically
        scope = await GeoLevel2.findById(scope_id).lean();
        if (scope) {
            tableName = 'geolocation_level_2';
        } else {
            scope = await Cluster.findById(scope_id).lean();
            if (scope) {
                tableName = 'clusters';
            } else {
                scope = await GeoLevel1.findById(scope_id).lean();
                if (scope) {
                    tableName = 'geolocation_level_1';
                } else {
                    scope = await GeoLevel0.findById(scope_id).lean();
                    if (scope) {
                        tableName = 'geolocation_level_0';
                    } else {
                        scope = await GeoLevel3.findById(scope_id).lean();
                        if (scope) {
                            tableName = 'geolocation_level_3';
                        } else {
                            scope = await GeoLevel4.findById(scope_id).lean();
                            if (scope) {
                                tableName = 'geolocation_level_4';
                            }
                        }
                    }
                }
            }
        }

        if (!scope) {
            return res.status(404).json({ success: false, message: "Scope not found in any boundary level" });
        }

        const hierarchy = { country: null, state: null, cluster: null, district: null, urban_city: null, rural_city: null };

        if (tableName === 'geolocation_level_0') {
            hierarchy.country = String(scope._id);
        } else if (tableName === 'geolocation_level_1') {
            hierarchy.country = scope.level_0 ? String(scope.level_0) : null;
            hierarchy.state = String(scope._id);
        } else if (tableName === 'clusters') {
            hierarchy.state = scope.level_1 ? String(scope.level_1) : null;
            hierarchy.cluster = String(scope._id);
        } else if (tableName === 'geolocation_level_2') {
            hierarchy.state = scope.level_1 ? String(scope.level_1) : null;
            hierarchy.cluster = scope.cluster ? String(scope.cluster) : null;
            hierarchy.district = String(scope._id);
        } else if (tableName === 'geolocation_level_3') {
            const district = await GeoLevel2.findById(scope.level_2).lean();
            hierarchy.state = district?.level_1 ? String(district.level_1) : null;
            hierarchy.cluster = district?.cluster ? String(district.cluster) : null;
            hierarchy.district = scope.level_2 ? String(scope.level_2) : null;
            hierarchy.urban_city = String(scope._id);
        } else if (tableName === 'geolocation_level_4') {
            const urban = await GeoLevel3.findById(scope.level_3).lean();
            const district = await GeoLevel2.findById(urban?.level_2).lean();
            hierarchy.state = district?.level_1 ? String(district.level_1) : null;
            hierarchy.cluster = district?.cluster ? String(district.cluster) : null;
            hierarchy.district = urban?.level_2 ? String(urban.level_2) : null;
            hierarchy.urban_city = scope.level_3 ? String(scope.level_3) : null;
            hierarchy.rural_city = String(scope._id);
        }

        if (!hierarchy.country && hierarchy.state) {
            const stateObj = await GeoLevel1.findById(hierarchy.state).lean();
            if (stateObj && stateObj.level_0) {
                hierarchy.country = String(stateObj.level_0);
            }
        }

        res.json({ success: true, data: hierarchy });
    } catch (error) {
        res.status(500).json({ success: false, message: "Server Error", error: error.message });
    }
}

const get_cms_users = async (req, res) => {
    try {
        const { level_id, scope_id } = req.params;
        if (!level_id) return res.status(400).json({ message: "Level required" });
        const level = await CmsLevel.findOne({ _id: level_id, deleted_at: null });
        if (!level) return res.status(404).json({ message: "Level not found" });
        const currentUserRole = await CmsRole.findById(req.user.role_id).populate('level_id');
        const isSuperAdmin = currentUserRole.level_id.name === 'global';

        if (level.name === 'global' && !isSuperAdmin) {
            return res.status(403).json({ message: "Permission denied: Global directory is restricted." });
        }

        let dRoleIds = [], dUserIds = [], uScopeIds = [];
        if (!isSuperAdmin) {
            dRoleIds = await getDescendantRoleIds(req.user.role_id);
            dUserIds = await getDescendantUserIds(req.user.id);
            const uScopes = await CmsUserScope.find({ user_id: req.user.id, deleted_at: null });
            uScopeIds = uScopes.map(s => s.scope_id);
            if (scope_id && scope_id !== "0") {
                const auth = await isScopeAuthorized(currentUserRole, uScopeIds, level, scope_id);
                if (!auth) return res.status(200).json({ success: true, data: [] });
            }
        }

        let users = [];
        if (level.name === 'global') {
            users = await CmsUser.find({ role_id: { $exists: true }, deleted_at: null })
                .populate({ path: 'role_id', match: { level_id: level_id }, populate: { path: 'department_id' } })
                .populate('parent_user_id')
                .lean();
            users = users.filter(u => u.role_id);
        } else if (level.name === 'country') {
            let query = { role_id: { $exists: true }, deleted_at: null };
            if (!isSuperAdmin) {
                query._id = { $in: dUserIds };
                query.role_id = { $in: dRoleIds };
            }
            users = await CmsUser.find(query).populate({ path: 'role_id', match: { level_id: level_id }, populate: { path: 'department_id' } }).populate('parent_user_id').sort({ created_at: -1 }).lean();
            users = users.filter(u => u.role_id);
        } else {
            if (!scope_id) return res.status(400).json({ message: "Scope required" });
            const geoModels = {
                'geolocation_level_0': GeoLevel0, 'geolocation_level_1': GeoLevel1, 'geolocation_level_2': GeoLevel2,
                'geolocation_level_3': GeoLevel3, 'geolocation_level_4': GeoLevel4, 'clusters': Cluster
            };
            const model = geoModels[level.geo_table_name];
            if (!model) return res.status(400).json({ message: "Geo table not configured" });
            let pCol = '';
            const nLevel = level.name.replace(' ', '_');
            if (nLevel === 'state') pCol = 'level_0';
            else if (nLevel === 'cluster') pCol = 'level_1';
            else if (nLevel === 'district') pCol = 'cluster';
            else if (nLevel === 'urban_city') pCol = 'level_2';
            else if (nLevel === 'rural_city') pCol = 'level_3';

            const scopeRows = await model.find({ [pCol]: scope_id, deleted_at: null }).lean();
            const scopeIds = scopeRows.map(r => r._id);
            const scopes = await CmsUserScope.find({ scope_id: { $in: scopeIds }, deleted_at: null });
            const uIdsInScope = scopes.map(s => s.user_id);
            let uQuery = { _id: { $in: uIdsInScope }, deleted_at: null };
            if (!isSuperAdmin) {
                uQuery._id.$in = uIdsInScope.filter(id => dUserIds.some(sid => sid.toString() === id.toString()));
                uQuery.role_id = { $in: dRoleIds };
            }
            users = await CmsUser.find(uQuery).populate({ path: 'role_id', match: { level_id: level_id }, populate: { path: 'department_id' } }).populate({ path: 'parent_user_id', populate: { path: 'role_id' } }).lean();
            users = users.filter(u => u.role_id);
        }

        res.status(200).json({
            success: true, data: users.map(u => ({
                id: String(u._id), name: u.name, email: u.email, phone_code: u.phone_code, phone: u.phone,
                role_id: u.role_id ? String(u.role_id._id) : null,
                parent_user_id: u.parent_user_id ? String(u.parent_user_id._id) : null,
                is_active: u.is_active ? 1 : 0,
                level_name: level.name,
                level_id: String(level._id),
                role_name: u.role_id?.name,
                department_name: u.role_id?.department_id?.name,
                department_id: u.role_id?.department_id ? String(u.role_id.department_id._id) : null,
                parent_user_name: u.parent_user_id?.name,
                parent_user: u.parent_user_id ? { id: String(u.parent_user_id._id), name: u.parent_user_id.name, role_name: u.parent_user_id.role_id?.name } : null
            }))
        });
    } catch (error) {
        res.status(500).json({ success: false, message: "Server Error", error: error.message });
    }
};

const add_cms_user = async (req, res) => {
    try {
        let { name, email, phone_code, phone, department_id, role_id, scope_ids, parent_user_id, country_id, panels, warehouse_id, warehouse_name, cluster_id, cluster_name, state_name, department_name } = req.body;
        
        if (!name || !email || !phone) {
            return res.status(400).json({ status: "error", message: 'Name, email, and contact number are required' });
        }

        // Auto-heal phone_code if missing or format without +
        if (!phone_code) {
            phone_code = "+91";
        }
        if (typeof phone_code === 'string' && !phone_code.startsWith('+')) {
            phone_code = `+${phone_code.trim()}`;
        }

        let finalScopeIds = Array.isArray(scope_ids) ? [...scope_ids] : [];
        if (finalScopeIds.length === 0) {
            if (cluster_id) {
                finalScopeIds.push(cluster_id);
            } else if (state_name) {
                try {
                    const stateDoc = await GeoLevel1.findOne({
                        $or: [
                            { name: { $regex: new RegExp(`^${state_name.trim()}$`, 'i') } },
                            { state_name: { $regex: new RegExp(`^${state_name.trim()}$`, 'i') } }
                        ],
                        deleted_at: null
                    }).lean();
                    if (stateDoc) finalScopeIds.push(stateDoc._id);
                } catch (sErr) {}
            }
            if (finalScopeIds.length === 0 && (warehouse_id || country_id)) {
                finalScopeIds = [warehouse_id || country_id].filter(Boolean);
            }
            if (finalScopeIds.length === 0) {
                try {
                    const defaultCountry = await GeoLevel0.findOne({ deleted_at: null }).lean();
                    if (defaultCountry) finalScopeIds.push(defaultCountry._id);
                } catch (cErr) {}
            }
        }

        const currentUserRole = await CmsRole.findById(req.user.role_id).populate('level_id');
        const isSuperAdmin = currentUserRole?.level_id?.name === 'global';

        let dept = null;
        if (mongoose.Types.ObjectId.isValid(department_id)) {
            dept = await CmsDepartment.findOne({ _id: department_id, deleted_at: null });
        }
        if (!dept) {
            dept = await CmsDepartment.findOne({
                $or: [
                    { name: { $regex: new RegExp(`^${department_name || department_id}$`, 'i') } },
                    { name: { $regex: /admin/i } }
                ],
                deleted_at: null
            });
        }
        if (!dept) {
            dept = await CmsDepartment.findOne({ deleted_at: null });
        }

        let role = null;
        if (mongoose.Types.ObjectId.isValid(role_id)) {
            role = await CmsRole.findOne({ _id: role_id, deleted_at: null }).populate('level_id').lean();
        }
        if (!role && dept) {
            role = await CmsRole.findOne({
                department_id: dept._id,
                deleted_at: null
            }).populate('level_id').lean();
        }
        if (!role) {
            role = await CmsRole.findOne({ deleted_at: null }).populate('level_id').lean();
        }

        if (!isSuperAdmin && role) {
            const dRoleIds = await getDescendantRoleIds(req.user.role_id);
            if (!dRoleIds.some(id => id.toString() === role._id.toString())) return res.status(403).json({ status: "error", message: 'Unauthorized role assignment' });
            const uScopes = await CmsUserScope.find({ user_id: req.user.id, deleted_at: null });
            const uScopeIds = uScopes.map(s => s.scope_id);
            for (const sId of finalScopeIds) {
                if (mongoose.Types.ObjectId.isValid(sId)) {
                    if (!(await isScopeAuthorized(currentUserRole, uScopeIds, role.level_id, sId))) return res.status(403).json({ status: "error", message: 'Unauthorized scope assignment' });
                }
            }
            if (parent_user_id && mongoose.Types.ObjectId.isValid(parent_user_id) && parent_user_id.toString() !== req.user.id.toString()) {
                const dUserIds = await getDescendantUserIds(req.user.id);
                if (!dUserIds.some(id => id.toString() === parent_user_id.toString())) return res.status(403).json({ status: "error", message: 'Unauthorized reporting manager' });
            }
        }

        let resolvedParentId = parent_user_id;
        if (role && role.parent_role_id) {
            if (!resolvedParentId || !mongoose.Types.ObjectId.isValid(resolvedParentId)) {
                const subIds = isSuperAdmin ? [] : await getDescendantUserIds(req.user.id);
                resolvedParentId = await resolve_parent_user_internal(role._id, finalScopeIds, req.user, isSuperAdmin, subIds);
            }

            if (!resolvedParentId || !mongoose.Types.ObjectId.isValid(resolvedParentId)) {
                resolvedParentId = req.user.id;
            }

            const parent = await CmsUser.findById(resolvedParentId).lean();
            if (parent) {
                let isValid = false, currRid = role.parent_role_id;
                const vRoles = new Set();
                while (currRid) {
                    if (vRoles.has(currRid.toString())) break;
                    vRoles.add(currRid.toString());
                    if (parent.role_id && parent.role_id.toString() === currRid.toString()) { isValid = true; break; }
                    const rInfo = await CmsRole.findById(currRid).lean();
                    if (!rInfo) break;
                    currRid = rInfo.parent_role_id;
                }
            }
        }

        // Sanitize ObjectIds to prevent Mongoose CastErrors
        const finalRoleId = role ? role._id : (mongoose.Types.ObjectId.isValid(role_id) ? role_id : null);
        let finalParentUserId = mongoose.Types.ObjectId.isValid(resolvedParentId) ? resolvedParentId : null;
        if (!finalParentUserId && mongoose.Types.ObjectId.isValid(req.user?.id)) {
            finalParentUserId = req.user.id;
        }

        let finalCountryId = mongoose.Types.ObjectId.isValid(country_id) ? country_id : null;
        if (!finalCountryId) {
            const defCountry = await GeoLevel0.findOne({ deleted_at: null }).lean();
            finalCountryId = defCountry ? defCountry._id : null;
        }

        const finalWarehouseId = mongoose.Types.ObjectId.isValid(warehouse_id) ? warehouse_id : null;
        const finalClusterId = mongoose.Types.ObjectId.isValid(cluster_id) ? cluster_id : null;

        const newUser = new CmsUser({
            name,
            email: email.trim().toLowerCase(),
            phone_code: phone_code.trim(),
            phone: phone.trim(),
            role_id: finalRoleId,
            parent_user_id: finalParentUserId,
            country_id: finalCountryId,
            is_active: true,
            warehouse_id: finalWarehouseId,
            warehouse_name: warehouse_name || null,
            cluster_id: finalClusterId,
            cluster_name: cluster_name || null,
            state_name: state_name || null,
            department_name: department_name || dept?.name || null
        });
        await newUser.save();

        if (finalClusterId) {
            try {
                const { FranchiseeCluster } = require('../models/india_solarshop_db');
                await FranchiseeCluster.findByIdAndUpdate(finalClusterId, {
                    $addToSet: { assigned_staff_users: newUser._id },
                    $set: { staffing_status: 'staffed' }
                });
            } catch (cErr) {
                console.warn('Could not update cluster staffing status on user create:', cErr);
            }
        }

        if (Array.isArray(scope_ids) && scope_ids.length > 0) {
            for (const sId of scope_ids) {
                if (mongoose.Types.ObjectId.isValid(sId)) {
                    await new CmsUserScope({ user_id: newUser._id, scope_id: sId }).save().catch(() => {});
                }
            }
        } else if (finalClusterId) {
            await new CmsUserScope({ user_id: newUser._id, scope_id: finalClusterId }).save().catch(() => {});
        } else if (finalWarehouseId) {
            await new CmsUserScope({ user_id: newUser._id, scope_id: finalWarehouseId }).save().catch(() => {});
        } else if (finalCountryId) {
            await new CmsUserScope({ user_id: newUser._id, scope_id: finalCountryId }).save().catch(() => {});
        }

        if (panels && Array.isArray(panels)) {
            for (const p of panels) {
                const pId = p.panel_id || p;
                if (mongoose.Types.ObjectId.isValid(pId)) {
                    await UserPanel.create({
                        user_id: newUser._id,
                        panel_id: pId,
                        saas_product_ids: Array.isArray(p.saas_product_ids)
                            ? p.saas_product_ids.filter(id => mongoose.Types.ObjectId.isValid(id))
                            : []
                    }).catch(() => {});
                }
            }
        }
        res.status(201).json({ success: true, message: 'Identity provisioned successfully', data: newUser });
    } catch (error) {
        console.error('Provisioning user failed:', error);
        if (error.code === 11000) {
            const field = Object.keys(error.keyPattern || {})[0] || 'Email or mobile number';
            return res.status(409).json({ success: false, message: `The ${field} is already registered with another user.` });
        }
        res.status(500).json({ success: false, message: error.message || 'Provisioning failed', error: error.message });
    }
}

const get_all_subordinates = async (req, res) => {
    try {
        const currentUserRole = await CmsRole.findById(req.user.role_id).populate('level_id');
        if (!currentUserRole || !currentUserRole.level_id) {
            return res.status(403).json({ success: false, message: "Administrative context not found" });
        }
        const isSuperAdmin = currentUserRole.level_id.name === 'global';

        let query = { deleted_at: null };
        if (!isSuperAdmin) {
            const subordinateUserIds = await getDescendantUserIds(req.user.id);
            query._id = { $in: [req.user.id, ...subordinateUserIds] };
        }

        const users = await CmsUser.find(query)
            .populate({
                path: 'role_id',
                populate: [
                    { path: 'level_id' },
                    { path: 'department_id' }
                ]
            })
            .populate({
                path: 'parent_user_id',
                populate: { path: 'role_id' }
            })
            .sort({ created_at: -1 })
            .lean();

        const userIds = users.map(u => u._id);
        const allScopes = await CmsUserScope.find({ user_id: { $in: userIds }, deleted_at: null }).lean();
        const userPanels = await UserPanel.find({ user_id: { $in: userIds } }).lean();

        // Resolve scope names for all found scopes
        const geoModels = {
            'geolocation_level_0': GeoLevel0, 'geolocation_level_1': GeoLevel1, 'geolocation_level_2': GeoLevel2,
            'geolocation_level_3': GeoLevel3, 'geolocation_level_4': GeoLevel4, 'clusters': Cluster
        };
        const scopeIdMap = {};
        const uniqueScopeIds = [...new Set(allScopes.map(s => s.scope_id))];

        // Batch fetch names from all relevant geo models
        for (const [key, model] of Object.entries(geoModels)) {
            const items = await model.find({ _id: { $in: uniqueScopeIds } }, 'name').lean();
            items.forEach(i => { scopeIdMap[i._id.toString()] = i.name; });
        }

        const finalData = users.map(u => ({
            id: String(u._id),
            name: u.name,
            email: u.email,
            phone_code: u.phone_code,
            phone: u.phone,
            country_id: u.country_id ? String(u.country_id) : null,
            role_id: u.role_id ? String(u.role_id._id) : null,
            role_name: u.role_id ? u.role_id.name : null,
            level_name: u.role_id?.level_id?.name || 'N/A',
            level_id: u.role_id?.level_id ? String(u.role_id.level_id._id) : null,
            department_id: u.role_id?.department_id ? String(u.role_id.department_id._id) : null,
            department_name: u.role_id?.department_id?.name || 'General',
            parent_user_id: u.parent_user_id ? String(u.parent_user_id._id) : null,
            parent_user_name: u.parent_user_id ? u.parent_user_id.name : null,
            warehouse_id: u.warehouse_id ? String(u.warehouse_id) : null,
            warehouse_name: u.warehouse_name || null,
            cluster_id: u.cluster_id ? String(u.cluster_id) : null,
            cluster_name: u.cluster_name || null,
            state_name: u.state_name || null,
            is_active: u.is_active ? 1 : 0,
            scope_ids: allScopes.filter(s => s.user_id.toString() === u._id.toString()).map(s => String(s.scope_id)),
            scope_names: allScopes.filter(s => s.user_id.toString() === u._id.toString())
                .map(s => scopeIdMap[s.scope_id.toString()] || 'Unknown Scope'),
            saas_product_ids: userPanels
                .filter(up => up.user_id.toString() === u._id.toString())
                .flatMap(up => (up.saas_product_ids || []).map(pid => String(pid))),
            panel_ids: userPanels
                .filter(up => up.user_id.toString() === u._id.toString())
                .map(up => String(up.panel_id)),
            parent_user: u.parent_user_id ? {
                id: String(u.parent_user_id._id),
                name: u.parent_user_id.name,
                role_name: u.parent_user_id.role_id?.name
            } : null
        }));

        res.status(200).json({ success: true, data: finalData });
    } catch (error) {
        res.status(500).json({ success: false, message: "Server Error", error: error.message });
    }
};

const update_cms_user = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, email, phone_code, phone, department_id, role_id, scope_ids, parent_user_id, country_id, panels, warehouse_id, warehouse_name, cluster_id, cluster_name, state_name, department_name } = req.body;

        const user = await CmsUser.findById(id);
        if (!user) return res.status(404).json({ status: "error", message: 'User not found' });

        if (id.toString() === req.user.id.toString()) {
            return res.status(403).json({ status: "error", message: 'You cannot modify your own administrative details' });
        }

        const currentUserRole = await CmsRole.findById(req.user.role_id).populate('level_id');
        const isSuperAdmin = currentUserRole.level_id.name === 'global';

        // Security check: Can current user edit this target user?
        if (!isSuperAdmin) {
            const dUserIds = await getDescendantUserIds(req.user.id);
            if (!dUserIds.some(sid => sid.toString() === id.toString())) {
                return res.status(403).json({ status: "error", message: 'Unauthorized to edit this user' });
            }
        }

        // Validate new role/department if changed
        if (role_id || department_id) {
            const dept = await CmsDepartment.findOne({ _id: department_id || user.department_id, deleted_at: null });
            if (!dept) return res.status(404).json({ status: "error", message: 'Department not found' });
            const role = await CmsRole.findOne({ _id: role_id || user.role_id, department_id: department_id || user.department_id, deleted_at: null }).populate('level_id').lean();
            if (!role) return res.status(404).json({ status: "error", message: 'Role mismatch with department' });

            if (!isSuperAdmin) {
                const dRoleIds = await getDescendantRoleIds(req.user.role_id);
                if (!dRoleIds.some(rid => rid.toString() === (role_id || user.role_id).toString())) {
                    return res.status(403).json({ status: "error", message: 'Unauthorized role assignment' });
                }
            }
        }

        // Validate scope assignment if scopes are being updated and user is not superadmin
        if (!isSuperAdmin && scope_ids && scope_ids.length > 0) {
            const uScopes = await CmsUserScope.find({ user_id: req.user.id, deleted_at: null });
            const uScopeIds = uScopes.map(s => s.scope_id);
            const targetRole = await CmsRole.findById(role_id || user.role_id).populate('level_id').lean();
            for (const sId of scope_ids) {
                if (!(await isScopeAuthorized(currentUserRole, uScopeIds, targetRole.level_id, sId))) {
                    return res.status(403).json({ status: "error", message: 'Unauthorized scope assignment' });
                }
            }
        }

        // Update fields
        if (name) user.name = name;
        if (email) user.email = email;
        if (phone_code) user.phone_code = phone_code;
        if (phone) user.phone = phone;
        // Automatic Parent Re-resolution if role/scope changed and no manual parent provided
        if ((role_id || (scope_ids && scope_ids.length > 0)) && !parent_user_id) {
            const finalRoleId = role_id || user.role_id;
            const finalScopeIds = (scope_ids && scope_ids.length > 0) ? scope_ids : await CmsUserScope.find({ user_id: id }).map(s => s.scope_id);

            const subIds = isSuperAdmin ? [] : await getDescendantUserIds(req.user.id);
            const resolvedId = await resolve_parent_user_internal(finalRoleId, finalScopeIds, req.user, isSuperAdmin, subIds);
            if (resolvedId) user.parent_user_id = resolvedId;
        } else if (parent_user_id) {
            user.parent_user_id = parent_user_id;
        }

        if (role_id) user.role_id = role_id;
        if (country_id) user.country_id = country_id;
        if (warehouse_id !== undefined) user.warehouse_id = warehouse_id;
        if (warehouse_name !== undefined) user.warehouse_name = warehouse_name;
        if (cluster_id !== undefined) {
            user.cluster_id = cluster_id;
            if (cluster_id) {
                try {
                    const { FranchiseeCluster } = require('../models/india_solarshop_db');
                    await FranchiseeCluster.findByIdAndUpdate(cluster_id, {
                        $addToSet: { assigned_staff_users: user._id },
                        $set: { staffing_status: 'staffed' }
                    });
                } catch (cErr) {}
            }
        }
        if (cluster_name !== undefined) user.cluster_name = cluster_name;
        if (state_name !== undefined) user.state_name = state_name;
        if (department_name !== undefined) user.department_name = department_name;

        await user.save();

        if (scope_ids && scope_ids.length > 0) {
            await CmsUserScope.deleteMany({ user_id: id });
            for (const sId of scope_ids) {
                await new CmsUserScope({ user_id: id, scope_id: sId }).save();
            }
        }

        if (panels && Array.isArray(panels)) {
            await UserPanel.deleteMany({ user_id: id });
            for (const p of panels) {
                await UserPanel.create({
                    user_id: id,
                    panel_id: p.panel_id,
                    saas_product_ids: p.saas_product_ids || []
                });
            }
        }

        // Heal hierarchy for subordinates if role or scope was changed
        if (role_id || (scope_ids && scope_ids.length > 0)) {
            await heal_subordinates(id);
        }

        res.status(200).json({ success: true, message: 'User updated successfully' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Update failed', error: error.message });
    }
};

const toggle_cms_user_status = async (req, res) => {
    try {
        const { id } = req.params;
        const user = await CmsUser.findById(id);
        if (!user) return res.status(404).json({ status: "error", message: 'User not found' });

        if (id.toString() === req.user.id.toString()) {
            return res.status(403).json({ status: "error", message: 'You cannot deactivate your own account' });
        }

        const currentUserRole = await CmsRole.findById(req.user.role_id).populate('level_id');
        const isSuperAdmin = currentUserRole.level_id.name === 'global';

        if (!isSuperAdmin) {
            const dUserIds = await getDescendantUserIds(req.user.id);
            if (!dUserIds.some(sid => sid.toString() === id.toString())) {
                return res.status(403).json({ status: "error", message: 'Unauthorized action' });
            }
        }

        user.is_active = !user.is_active;
        await user.save();

        // If user was deactivated, heal their subordinates' hierarchy
        if (!user.is_active) {
            await heal_subordinates(id);
        }

        res.status(200).json({ success: true, message: `User ${user.is_active ? 'activated' : 'deactivated'}`, is_active: user.is_active });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Status toggle failed', error: error.message });
    }
};

const get_panels_with_products = async (req, res) => {
    try {
        const panels = await CmsPanel.find({ deleted_at: null }).lean();
        const mappings = await PanelSaaSProduct.find().populate('saas_product_id').lean();

        const data = panels.map(p => {
            const products = mappings
                .filter(m => String(m.panel_id) === String(p._id) && m.saas_product_id)
                .map(m => ({
                    id: String(m.saas_product_id._id),
                    name: m.saas_product_id.name,
                    slug: m.saas_product_id.slug
                }));
            return {
                id: String(p._id),
                name: p.name,
                url_prefix: p.url_prefix,
                created_at: p.created_at,
                products
            };
        });
        res.status(200).json({ success: true, data });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server Error', error: error.message });
    }
}

const get_user_panels = async (req, res) => {
    try {
        const { id } = req.params;
        const userPanels = await UserPanel.find({ user_id: id }).lean();
        const data = userPanels.map(up => ({
            panel_id: String(up.panel_id),
            saas_product_ids: (up.saas_product_ids || []).map(pid => String(pid))
        }));
        res.status(200).json({ success: true, data });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server Error', error: error.message });
    }
}

const get_saas_products_with_countries = async (req, res) => {
    try {
        const products = await SaaSProduct.find({ is_deleted: false, is_active: true }).lean();
        const mappings = await CountrySaaSProduct.find({ is_active: true }).lean();

        const data = products.map(prod => {
            const activeCountryIds = mappings
                .filter(m => m.saas_product_id.toString() === prod._id.toString())
                .map(m => m.country_id.toString());
            return {
                id: prod._id.toString(),
                name: prod.name,
                slug: prod.slug,
                active_country_ids: activeCountryIds
            };
        });

        res.status(200).json({ success: true, data });
    } catch (error) {
        res.status(500).json({ success: false, message: "Server Error", error: error.message });
    }
}

const get_coverage_report = async (req, res) => {
    try {
        // 1. Fetch all active geo data
        const countries = await GeoLevel0.find({ is_active: true, deleted_at: null }).lean();
        const states = await GeoLevel1.find({ is_active: true, deleted_at: null }).lean();
        const clusters = await Cluster.find({ deleted_at: null }).lean();
        const districts = await GeoLevel2.find({ is_active: true, deleted_at: null }).lean();

        // 2. Fetch all active users and their scopes
        const activeUsers = await CmsUser.find({ is_active: true, deleted_at: null }).populate({
            path: 'role_id',
            populate: { path: 'level_id' }
        }).lean();
        const userIds = activeUsers.map(u => u._id);
        const scopes = await CmsUserScope.find({ user_id: { $in: userIds }, deleted_at: null }).lean();

        // Group scopes by user
        const userScopesMap = {};
        scopes.forEach(s => {
            const uid = s.user_id.toString();
            if (!userScopesMap[uid]) userScopesMap[uid] = [];
            userScopesMap[uid].push(s.scope_id.toString());
        });

        // 3. Fetch all active roles and group by level name
        const allRoles = await CmsRole.find({ deleted_at: null }).populate('level_id').lean();
        const rolesByLevel = {
            country: allRoles.filter(r => r.level_id?.name?.toLowerCase() === 'country'),
            state: allRoles.filter(r => r.level_id?.name?.toLowerCase() === 'state'),
            cluster: allRoles.filter(r => r.level_id?.name?.toLowerCase() === 'cluster'),
            district: allRoles.filter(r => r.level_id?.name?.toLowerCase() === 'district')
        };

        // 4. Map child relationships
        const stateToCountry = {};
        states.forEach(s => { stateToCountry[s._id.toString()] = s.level_0?.toString(); });

        const clusterToState = {};
        clusters.forEach(c => {
            const sid = c.level_1?.toString();
            clusterToState[c._id.toString()] = sid;
        });

        const districtToCluster = {};
        const districtToState = {};
        districts.forEach(d => {
            const cid = d.cluster?.toString();
            districtToCluster[d._id.toString()] = cid;
            districtToState[d._id.toString()] = d.level_1?.toString();
        });

        // Helper to check if a user covers a territory
        const getUserCoverage = (user, uScopes) => {
            const covered = {
                countries: new Set(),
                states: new Set(),
                clusters: new Set(),
                districts: new Set()
            };

            uScopes.forEach(scopeId => {
                // Check if scopeId is Country
                if (countries.some(c => c._id.toString() === scopeId)) {
                    covered.countries.add(scopeId);
                    const childStateIds = [];
                    states.forEach(s => {
                        if (s.level_0?.toString() === scopeId) {
                            covered.states.add(s._id.toString());
                            childStateIds.push(s._id.toString());
                        }
                    });
                    clusters.forEach(c => {
                        const sid = c.level_1?.toString();
                        if (sid && childStateIds.includes(sid)) {
                            covered.clusters.add(c._id.toString());
                        }
                    });
                    districts.forEach(d => {
                        const sid = d.level_1?.toString();
                        if (sid && childStateIds.includes(sid)) {
                            covered.districts.add(d._id.toString());
                        }
                    });
                }
                // Check if scopeId is State
                else if (states.some(s => s._id.toString() === scopeId)) {
                    covered.states.add(scopeId);
                    const countryId = stateToCountry[scopeId];
                    if (countryId) covered.countries.add(countryId);

                    clusters.forEach(c => {
                        if (c.level_1?.toString() === scopeId) covered.clusters.add(c._id.toString());
                    });
                    districts.forEach(d => {
                        if (d.level_1?.toString() === scopeId) covered.districts.add(d._id.toString());
                    });
                }
                // Check if scopeId is Cluster
                else if (clusters.some(c => c._id.toString() === scopeId)) {
                    covered.clusters.add(scopeId);
                    const stateId = clusterToState[scopeId];
                    if (stateId) {
                        covered.states.add(stateId);
                        const countryId = stateToCountry[stateId];
                        if (countryId) covered.countries.add(countryId);
                    }

                    districts.forEach(d => {
                        if (d.cluster?.toString() === scopeId) covered.districts.add(d._id.toString());
                    });
                }
                // Check if scopeId is District
                else if (districts.some(d => d._id.toString() === scopeId)) {
                    covered.districts.add(scopeId);
                    const district = districts.find(d => d._id.toString() === scopeId);
                    if (district) {
                        const clusterId = district.cluster?.toString();
                        if (clusterId) {
                            covered.clusters.add(clusterId);
                            const stateId = clusterToState[clusterId];
                            if (stateId) {
                                covered.states.add(stateId);
                                const countryId = stateToCountry[stateId];
                                if (countryId) covered.countries.add(countryId);
                            }
                        } else {
                            const stateId = district.level_1?.toString();
                            if (stateId) {
                                covered.states.add(stateId);
                                const countryId = stateToCountry[stateId];
                                if (countryId) covered.countries.add(countryId);
                            }
                        }
                    }
                }
            });

            return covered;
        };

        // Cache coverage per active user
        const userCoverageCache = activeUsers.map(user => {
            const uScopes = userScopesMap[user._id.toString()] || [];
            return {
                user: {
                    id: user._id.toString(),
                    name: user.name,
                    email: user.email,
                    role_id: user.role_id ? (user.role_id._id ? user.role_id._id.toString() : user.role_id.toString()) : null,
                    role_name: user.role_id?.name || 'N/A',
                    level_name: user.role_id?.level_id?.name || 'N/A'
                },
                coverage: getUserCoverage(user, uScopes)
            };
        });

        // Helper to compile coverage details for a specific territory ID and level
        const getTerritoryCoverageDetails = (id, levelType) => {
            const assignedUsers = [];
            const coveredRoleIds = new Set();

            const levelPluralMap = {
                country: 'countries',
                state: 'states',
                cluster: 'clusters',
                district: 'districts'
            };
            const pluralKey = levelPluralMap[levelType] || `${levelType}s`;

            userCoverageCache.forEach(cache => {
                const isCovered = cache.coverage[pluralKey].has(id);
                if (isCovered) {
                    assignedUsers.push(cache.user);
                    if (cache.user.role_id) coveredRoleIds.add(cache.user.role_id);
                }
            });

            // Find active roles at this level type that do not have any user assigned
            const levelRoles = rolesByLevel[levelType] || [];
            const unassignedRoles = levelRoles
                .filter(role => !coveredRoleIds.has(role._id.toString()))
                .map(role => ({
                    id: role._id.toString(),
                    name: role.name
                }));

            return {
                assignedUsers,
                unassignedRoles
            };
        };

        // 5. Build hierarchy of unassigned territories (coverage gaps)
        const report = [];
        countries.forEach(country => {
            const countryId = country._id.toString();
            const countryStates = states.filter(s => s.level_0?.toString() === countryId);
            const countryCoverage = getTerritoryCoverageDetails(countryId, 'country');

            const stateReports = [];
            countryStates.forEach(state => {
                const stateId = state._id.toString();
                const stateClusters = clusters.filter(c => c.level_1?.toString() === stateId);
                const stateCoverage = getTerritoryCoverageDetails(stateId, 'state');

                const clusterReports = [];
                stateClusters.forEach(cluster => {
                    const clusterId = cluster._id.toString();
                    const clusterDistricts = districts.filter(d => d.cluster?.toString() === clusterId);
                    const clusterCoverage = getTerritoryCoverageDetails(clusterId, 'cluster');

                    const districtReports = [];
                    clusterDistricts.forEach(district => {
                        const districtId = district._id.toString();
                        const districtCoverage = getTerritoryCoverageDetails(districtId, 'district');

                        // We include a district if it is unassigned OR has any unassigned roles
                        if (districtCoverage.assignedUsers.length === 0 || districtCoverage.unassignedRoles.length > 0) {
                            districtReports.push({
                                id: districtId,
                                name: district.name,
                                type: 'district',
                                status: districtCoverage.assignedUsers.length === 0 ? 'unassigned' : 'partially_assigned',
                                assignedUsers: districtCoverage.assignedUsers,
                                unassignedRoles: districtCoverage.unassignedRoles
                            });
                        }
                    });

                    // If cluster itself has no assigned users, or has unassigned roles, or has child gaps
                    if (clusterCoverage.assignedUsers.length === 0 || clusterCoverage.unassignedRoles.length > 0 || districtReports.length > 0) {
                        clusterReports.push({
                            id: clusterId,
                            name: cluster.name,
                            type: 'cluster',
                            status: clusterCoverage.assignedUsers.length === 0 ? 'unassigned' : 'partially_assigned',
                            assignedUsers: clusterCoverage.assignedUsers,
                            unassignedRoles: clusterCoverage.unassignedRoles,
                            children: districtReports
                        });
                    }
                });

                // If state itself has no assigned users, or has unassigned roles, or has child gaps
                if (stateCoverage.assignedUsers.length === 0 || stateCoverage.unassignedRoles.length > 0 || clusterReports.length > 0) {
                    stateReports.push({
                        id: stateId,
                        name: state.name,
                        type: 'state',
                        status: stateCoverage.assignedUsers.length === 0 ? 'unassigned' : 'partially_assigned',
                        assignedUsers: stateCoverage.assignedUsers,
                        unassignedRoles: stateCoverage.unassignedRoles,
                        children: clusterReports
                    });
                }
            });

            // If country itself has no assigned users, or has unassigned roles, or has child gaps
            if (countryCoverage.assignedUsers.length === 0 || countryCoverage.unassignedRoles.length > 0 || stateReports.length > 0) {
                report.push({
                    id: countryId,
                    name: country.name,
                    type: 'country',
                    status: countryCoverage.assignedUsers.length === 0 ? 'unassigned' : 'partially_assigned',
                    assignedUsers: countryCoverage.assignedUsers,
                    unassignedRoles: countryCoverage.unassignedRoles,
                    children: stateReports
                });
            }
        });

        res.status(200).json({ success: true, data: report });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to generate coverage report', error: error.message });
    }
};

module.exports = {
    get_active_countries, get_active_states, get_active_clusters, get_active_districts,
    get_urban_cities, get_rural_cities, get_levels, get_departments,
    get_roles_by_level, get_roles_by_level_and_department, get_parent_users,
    get_cms_users, add_cms_user, get_all_subordinates, update_cms_user, toggle_cms_user_status, get_scope_hierarchy,
    get_panels_with_products, get_user_panels, get_saas_products_with_countries,
    resolve_parent_user_internal, heal_subordinates, get_coverage_report
};