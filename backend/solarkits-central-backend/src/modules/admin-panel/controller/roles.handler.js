const { CmsRole, CmsDepartment, CmsLevel, CmsUser, Otp, CmsRoleWiseModule, CmsModule, RolePanel, DepartmentPanel, CountrySaaSProduct, CmsUserScope } = require('../models/user_db');
const bcrypt = require('bcrypt');
const { sendOTP } = require("../utils/nodemailer");
const mongoose = require('mongoose');

// Helper to check for circular hierarchy
async function isCircularParent(roleId, parentId) {
    let currentId = parentId;
    const visited = new Set([roleId.toString()]);
    while (currentId) {
        if (visited.has(currentId.toString())) {
            return true;
        }
        visited.add(currentId.toString());
        const pRole = await CmsRole.findById(currentId).lean();
        if (!pRole) break;
        currentId = pRole.parent_role_id;
    }
    return false;
}

// Helper to recursively update departments of child roles
async function updateDescendantDepartments(roleId, newDeptId) {
    const children = await CmsRole.find({ parent_role_id: roleId, deleted_at: null });
    for (const child of children) {
        child.department_id = newDeptId;
        await child.save();
        await updateDescendantDepartments(child._id, newDeptId);
    }
}

// Helper to recursively get all descendant role IDs
async function getDescendantRoleIds(roleId) {
    const children = await CmsRole.find({ parent_role_id: roleId, deleted_at: null }).lean();
    let ids = children.map(c => c._id);
    for (const child of children) {
        const subIds = await getDescendantRoleIds(child._id);
        ids = ids.concat(subIds);
    }
    return ids;
}

// Helper to recursively heal user-to-user hierarchy
async function healUsersForRoleAndSubtrees(roleId) {
    const { resolve_parent_user_internal, heal_subordinates } = require('./cms.users.handler');
    
    // Find this role and all its descendant roles
    const roleIds = [roleId].concat(await getDescendantRoleIds(roleId));
    
    // Find all active users assigned to these roles
    const users = await CmsUser.find({ role_id: { $in: roleIds }, deleted_at: null });
    
    for (const user of users) {
        const userScopes = await CmsUserScope.find({ user_id: user._id, deleted_at: null });
        const scopeIds = userScopes.map(s => s.scope_id);
        
        // Re-resolve parent user
        const resolvedParentId = await resolve_parent_user_internal(user.role_id, scopeIds, null, true, []);
        
        // Only update if it has changed
        if (String(user.parent_user_id) !== String(resolvedParentId)) {
            user.parent_user_id = resolvedParentId || null;
            await user.save();
        }
        
        // Recursively heal subordinates reporting to this user
        await heal_subordinates(user._id);
    }
}

const get_levels = async (req, res) => {
    try {
        const levels = await CmsLevel.find({ deleted_at: null }).lean();
        const data = levels.map(l => ({
            id: l._id,
            name: l.name,
            scope_priority: l.scope_priority,
            geo_table_name: l.geo_table_name,
            is_active: l.is_active ? 1 : 0,
            created_at: l.created_at
        }));
        return res.status(200).json({ status: 'success', data });
    } catch (error) {
        return res.status(500).json({ status: 'error', message: error.message || 'Internal Server Error', error: error.message });
    }
}

const get_roles = async (req, res) => {
    try {
        const { country_id } = req.query;
        let query = { deleted_at: null };
        if (country_id === 'global') {
            query.country_id = null;
        } else if (country_id) {
            query.$or = [
                { country_id: country_id },
                { country_id: null }
            ];
        }

        const roles = await CmsRole.find(query)
            .populate('department_id')
            .populate('level_id')
            .populate('parent_role_id')
            .sort({ created_at: -1 });

        // Get module counts
        const roleIds = roles.map(r => r._id);
        const moduleCounts = await CmsRoleWiseModule.aggregate([
            { $match: { role_id: { $in: roleIds }, deleted_at: null } },
            { $group: { _id: '$role_id', count: { $sum: 1 } } }
        ]);
        const countsMap = new Map(moduleCounts.map(c => [c._id.toString(), c.count]));

        const formattedData = await Promise.all(roles.map(async r => {
            // Find role panels
            const pivotPanels = await RolePanel.find({ role_id: r._id })
                .populate('panel_id')
                .lean();

            const mappedPanels = pivotPanels
                .filter(p => p.panel_id && !p.panel_id.deleted_at)
                .map(p => ({
                    id: p.panel_id._id,
                    name: p.panel_id.name,
                    saas_product_ids: p.saas_product_ids || []
                }));

            return {
                id: r._id,
                name: r.name,
                department_id: r.department_id ? r.department_id._id : null,
                department_name: r.department_id ? r.department_id.name : null,
                level_id: r.level_id ? r.level_id._id : null,
                level_name: r.level_id ? r.level_id.name : null,
                country_id: r.country_id || null,
                parent_role_id: r.parent_role_id ? r.parent_role_id._id : null,
                parent_role_name: r.parent_role_id ? r.parent_role_id.name : null,
                access_modules_by_parent: r.access_modules_by_parent ? 1 : 0,
                is_active: r.is_active ? 1 : 0,
                is_system: r.is_system || false,
                is_protected: r.is_protected || false,
                created_at: r.created_at,
                assigned_modules_count: countsMap.get(r._id.toString()) || 0,
                panels: mappedPanels,
                panel_names: mappedPanels.map(p => p.name).join(', ') || 'None'
            };
        }));

        return res.status(200).json({ status: 'success', message: 'Roles fetched successfully', data: formattedData });
    } catch (error) {
        return res.status(500).json({ status: 'error', message: error.message || 'Internal Server Error', error: error.message });
    }
}

const get_role = async (req, res) => {
    try {
        const { id } = req.params;
        const role = await CmsRole.findOne({ _id: id, deleted_at: null })
            .populate('department_id')
            .populate('level_id')
            .populate('parent_role_id');

        if (!role) {
            return res.status(404).json({ status: 'error', message: 'Role not found' });
        }

        const assigned_modules = await CmsRoleWiseModule.find({ role_id: role._id, deleted_at: null })
            .populate('module_id');

        // Find role panels
        const pivotPanels = await RolePanel.find({ role_id: role._id })
            .populate('panel_id')
            .lean();

        const mappedPanels = pivotPanels
            .filter(p => p.panel_id && !p.panel_id.deleted_at)
            .map(p => ({
                id: p.panel_id._id,
                name: p.panel_id.name,
                saas_product_ids: p.saas_product_ids || []
            }));

        // Find department's allowed panels
        const deptPanels = await DepartmentPanel.find({ department_id: role.department_id?._id })
            .populate('panel_id')
            .lean();

        const allowedPanels = deptPanels
            .filter(p => p.panel_id && !p.panel_id.deleted_at)
            .map(p => ({
                id: p.panel_id._id,
                name: p.panel_id.name
            }));

        const formattedRole = {
            id: role._id,
            name: role.name,
            department_id: role.department_id ? role.department_id._id : null,
            department_name: role.department_id ? role.department_id.name : null,
            department_level: role.department_id ? role.department_id.level : 'global',
            department_country_ids: role.department_id ? (role.department_id.country_ids || []) : [],
            level_id: role.level_id ? role.level_id._id : null,
            level_name: role.level_id ? role.level_id.name : null,
            country_id: role.country_id || null,
            parent_role_id: role.parent_role_id ? role.parent_role_id._id : null,
            parent_role_name: role.parent_role_id ? role.parent_role_id.name : null,
            access_modules_by_parent: role.access_modules_by_parent ? 1 : 0,
            is_active: role.is_active,
            is_system: role.is_system || false,
            is_protected: role.is_protected || false,
            created_at: role.created_at,
            panels: mappedPanels,
            panel_ids_csv: mappedPanels.map(p => p.id).join(','),
            allowed_panels: allowedPanels,
            assigned_modules: assigned_modules
                .filter(rwm => rwm.module_id)
                .map(rwm => {
                    const mod = rwm.module_id;
                    const mName = (typeof mod === 'object' && mod !== null)
                        ? (mod.name || mod.title || mod.module_name || mod.label)
                        : null;
                    return {
                        id: rwm._id,
                        role_id: rwm.role_id,
                        module_id: (typeof mod === 'object' && mod !== null) ? mod._id : mod,
                        module_name: mName || 'Module',
                        can_view: rwm.can_view !== false,
                        can_add: !!rwm.can_add,
                        can_edit: !!rwm.can_edit,
                        can_delete: !!rwm.can_delete
                    };
                })
        };

        return res.status(200).json({ status: 'success', message: 'Role fetched successfully', data: formattedRole });
    } catch (error) {
        return res.status(500).json({ status: 'error', message: error.message || 'Internal Server Error', error: error.message });
    }
}

const add_role = async (req, res) => {
    try {
        const {
            department_id,
            level_id,
            name,
            parent_role_id,
            panels,
            country_id = null,
            access_modules_by_parent = 0
        } = req.body;

        if (!department_id || !level_id || !name || !parent_role_id || !panels || !Array.isArray(panels) || panels.length === 0) {
            return res.status(400).json({
                status: 'error',
                message: 'Department, level, name, parent role, and at least one panel are required'
            });
        }

        const department = await CmsDepartment.findOne({ _id: department_id, deleted_at: null });
        if (!department) {
            return res.status(400).json({ status: 'error', message: 'Invalid department_id' });
        }

        const level = await CmsLevel.findOne({ _id: level_id, is_active: true, deleted_at: null });
        if (!level) {
            return res.status(400).json({ status: 'error', message: 'Invalid level_id' });
        }

        // Country department roles cannot have global level
        if (department.level === 'country' && level.name?.toLowerCase() === 'global') {
            return res.status(400).json({
                status: 'error',
                message: 'Country department roles cannot be assigned to Global level scope.'
            });
        }

        const existing_role = await CmsRole.findOne({
            name,
            department_id: department_id,
            level_id: level_id,
            country_id: country_id || null,
            deleted_at: null
        });
        if (existing_role) {
            return res.status(409).json({
                status: 'error',
                message: 'Role with this name already exists in this department'
            });
        }

        const parentRole = await CmsRole.findOne({ _id: parent_role_id, is_active: true, deleted_at: null })
            .populate('level_id');

        if (!parentRole) {
            return res.status(400).json({ status: 'error', message: 'Invalid parent_role_id' });
        }

        const parentDeptLegacyId = parentRole.department_id;
        const parentScopePriority = parentRole.level_id.scope_priority;
        const parentLevelName = parentRole.level_id.name?.toLowerCase();
        const childScopePriority = level.scope_priority;

        // Parent must be at same or higher level in the hierarchy (lower or equal scope_priority number)
        if (childScopePriority < parentScopePriority) {
            return res.status(400).json({
                status: 'error',
                message: 'Child role cannot have higher scope than parent role'
            });
        }

        // Department/Country check: allow universal parents (country_id = null), OR same dept, OR same-country parents
        const parentIsUniversal = !parentRole.country_id;
        const parentIsSameDept = parentDeptLegacyId.toString() === department_id.toString();
        const parentIsSameCountry = country_id && parentRole.country_id &&
            parentRole.country_id.toString() === country_id.toString();

        if (!parentIsUniversal && !parentIsSameDept && !parentIsSameCountry) {
            return res.status(400).json({
                status: 'error',
                message: 'Parent role must be a universal role, belong to the same department, or be in the same country'
            });
        }

        // Validate that each panel is assigned to the department first
        const normalizedPanels = panels.map(p => {
            if (typeof p === 'string' || p instanceof mongoose.Types.ObjectId) {
                return { panel_id: p.toString(), saas_product_ids: [] };
            }
            return {
                panel_id: p.panel_id?.toString() || p.id?.toString(),
                saas_product_ids: (p.saas_product_ids || []).map(id => id.toString())
            };
        }).filter(p => p.panel_id);

        for (const item of normalizedPanels) {
            const deptPanelExists = await DepartmentPanel.findOne({ department_id: department_id, panel_id: item.panel_id });
            if (!deptPanelExists) {
                return res.status(400).json({
                    status: 'error',
                    message: `Role cannot be assigned panel ${item.panel_id} because it is not mapped to the department first.`
                });
            }
        }

        const newRole = await CmsRole.create({
            department_id: department_id,
            level_id: level_id,
            name,
            country_id: country_id || null,
            parent_role_id: parent_role_id,
            access_modules_by_parent: access_modules_by_parent == 1,
            is_system: false,
            is_protected: false
        });

        // Seed role panels pivot records
        for (const item of normalizedPanels) {
            await RolePanel.create({
                role_id: newRole._id,
                panel_id: item.panel_id,
                saas_product_ids: item.saas_product_ids
            });
        }

        return res.status(201).json({ status: 'success', message: 'Role created successfully', data: newRole });
    } catch (error) {
        return res.status(500).json({ status: 'error', message: error.message || 'Internal Server Error' });
    }
}

const get_parent_roles = async (req, res) => {
    try {
        const { department_id, level_id } = req.params;
        const { country_id } = req.query;

        if (!department_id || !level_id) {
            return res.status(400).json({ status: 'error', message: 'department_id and level_id are required' });
        }

        const levelData = await CmsLevel.findOne({ _id: level_id, is_active: true, deleted_at: null });
        if (!levelData) {
            return res.status(400).json({ status: 'error', message: 'Invalid level_id' });
        }

        const selectedScopePriority = levelData.scope_priority;

        // Classify the role being edited
        const isGlobalRole = levelData.name?.toLowerCase() === 'global';
        const isUniversalCountryRole = levelData.name?.toLowerCase() === 'country' && (!country_id || country_id === 'global');
        const isSpecificCountryRole = !isGlobalRole && !isUniversalCountryRole && country_id && country_id !== 'global';

        // Fetch all levels at same or higher priority (same level or above in hierarchy)
        const validLevels = await CmsLevel.find({
            scope_priority: { $lte: selectedScopePriority },
            is_active: true,
            deleted_at: null
        });
        const validLevelIds = validLevels.map(l => l._id);

        const globalLevel = validLevels.find(l => l.name?.toLowerCase() === 'global');
        const countryLevel = validLevels.find(l => l.name?.toLowerCase() === 'country');

        let queryCondition;

        if (isUniversalCountryRole) {
            // RULE 1: Universal country role → only Global level roles as parents
            if (!globalLevel) {
                return res.status(200).json({ status: 'success', message: 'Parent roles fetched successfully', data: [] });
            }
            queryCondition = {
                is_active: true,
                deleted_at: null,
                level_id: globalLevel._id,
                country_id: null
            };

        } else if (isSpecificCountryRole) {
            // RULE 2: Specific country role → Global + Universal (country_id = null) at same/higher level + Same country roles (any dept)
            const orClauses = [];

            // Cast country_id to ObjectId to ensure robust matching for both String & ObjectId database fields
            let countryQueryVal = country_id;
            if (country_id && mongoose.Types.ObjectId.isValid(country_id)) {
                countryQueryVal = new mongoose.Types.ObjectId(country_id);
            }

            // Universal/Global roles at same/higher levels
            orClauses.push({
                country_id: null,
                level_id: { $in: validLevelIds }
            });

            // Same country roles at same/higher levels (any department)
            orClauses.push({
                country_id: countryQueryVal,
                level_id: { $in: validLevelIds }
            });

            queryCondition = {
                is_active: true,
                deleted_at: null,
                $or: orClauses
            };

        } else {
            // RULE 3: Global level role → only global-scope roles (no country restriction)
            queryCondition = {
                is_active: true,
                deleted_at: null,
                level_id: { $in: validLevelIds },
                country_id: null
            };
        }

        const roles = await CmsRole.find(queryCondition)
            .populate('level_id')
            .populate('department_id');

        const formattedData = roles
            .filter(r => r.level_id)
            .map(r => ({
                id: r._id,
                name: r.name,
                department_id: r.department_id ? r.department_id._id : null,
                department_name: r.department_id ? r.department_id.name : null,
                level_id: r.level_id ? r.level_id._id : null,
                level_name: r.level_id.name,
                scope_priority: r.level_id.scope_priority
            }))
            .sort((a, b) => a.scope_priority - b.scope_priority);

        return res.status(200).json({ status: 'success', message: 'Parent roles fetched successfully', data: formattedData });
    } catch (error) {
        return res.status(500).json({ status: 'error', message: 'Internal Server Error', error: error.message });
    }
}

const send_otp_for_update_role = async (req, res) => {
    try {
        const { id } = req.params;
        const { id: user_id } = req.user;

        const role = await CmsRole.findOne({ _id: id, deleted_at: null });
        if (!role) {
            return res.status(404).json({ status: 'error', message: 'Role not found' });
        }

        const user = await CmsUser.findOne({ _id: user_id, deleted_at: null });
        if (!user) {
            return res.status(404).json({ status: 'error', message: 'User not found' });
        }

        const otp = await sendOTP(user.email, `Code for update role.`, `This OTP for update ${role.name}.`);
        const hashed_otp = await bcrypt.hash(otp.otp, 10);
        const expires_at = new Date(Date.now() + 3 * 60 * 1000);

        await Otp.create({
            user_id: user._id,
            otp: hashed_otp,
            purpose: 'update_role',
            expires_at,
            created_at: new Date()
        });

        return res.status(200).json({ status: "success", message: "OTP sent successfully." });
    } catch (error) {
        res.status(500).json({ status: 'error', message: error.message || 'Internal Server Error', error: error.message });
    }
}

const update_role = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, panels, country_id, department_id, level_id, parent_role_id, otp } = req.body;
        const { id: user_id } = req.user;

        if (!name || !otp || !panels || !Array.isArray(panels) || panels.length === 0) {
            return res.status(400).json({ status: 'error', message: 'Name, panels, and otp are required' });
        }

        const otp_record = await Otp.findOne({
            user_id: user_id,
            purpose: 'update_role'
        }).sort({ created_at: -1 });

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

        const role = await CmsRole.findOne({ _id: id, deleted_at: null });
        if (!role) {
            return res.status(404).json({ status: 'error', message: 'Role not found' });
        }

        if (role.is_protected) {
            return res.status(403).json({ status: 'error', message: 'Protected roles cannot be updated.' });
        }

        const existing_role = await CmsRole.findOne({ name, _id: { $ne: id }, deleted_at: null });
        if (existing_role) {
            return res.status(409).json({ status: 'error', message: 'Role with this name already exists' });
        }

        // Validate new department if changing
        if (department_id && String(department_id) !== String(role.department_id)) {
            const newDept = await CmsDepartment.findOne({ _id: department_id, deleted_at: null });
            if (!newDept) {
                return res.status(400).json({ status: 'error', message: 'Invalid department_id' });
            }
            const roleLevel = await CmsLevel.findById(level_id || role.level_id);
            if (newDept.level === 'country' && roleLevel?.name?.toLowerCase() === 'global') {
                return res.status(400).json({
                    status: 'error',
                    message: 'Country department roles cannot be assigned to Global level scope.'
                });
            }
        }

        // Validate new level if changing
        if (level_id && String(level_id) !== String(role.level_id)) {
            const newLevel = await CmsLevel.findOne({ _id: level_id, is_active: true, deleted_at: null });
            if (!newLevel) {
                return res.status(400).json({ status: 'error', message: 'Invalid level_id' });
            }
            const targetDeptId = department_id || role.department_id;
            const deptObj = await CmsDepartment.findOne({ _id: targetDeptId, deleted_at: null });
            if (deptObj && deptObj.level === 'country' && newLevel.name?.toLowerCase() === 'global') {
                return res.status(400).json({
                    status: 'error',
                    message: 'Country department roles cannot be assigned to Global level scope.'
                });
            }
        }

        // Validate parent role hierarchy if parent role, level, department, or country changed
        const targetParentRoleId = parent_role_id || role.parent_role_id;
        const targetLevelId = level_id || role.level_id;
        const levelChanged = level_id && String(level_id) !== String(role.level_id);
        const parentChanged = parent_role_id && String(parent_role_id) !== String(role.parent_role_id);
        const deptChanged = department_id && String(department_id) !== String(role.department_id);
        const countryChanged = country_id !== undefined && String(country_id) !== String(role.country_id);

        if (targetParentRoleId && (parentChanged || levelChanged || deptChanged || countryChanged)) {
            const parentRole = await CmsRole.findOne({ _id: targetParentRoleId, is_active: true, deleted_at: null })
                .populate('level_id');

            if (!parentRole) {
                return res.status(400).json({ status: 'error', message: 'Invalid parent_role_id' });
            }

            if (parentChanged) {
                // Circular reference check
                if (await isCircularParent(id, targetParentRoleId)) {
                    return res.status(400).json({
                        status: 'error',
                        message: 'Circular hierarchy detected: cannot set a subordinate role as parent.'
                    });
                }
            }

            // Department & level scope check
            const targetDeptId = department_id || role.department_id;
            const parentDeptLegacyId = parentRole.department_id;
            const parentLevelName = parentRole.level_id.name?.toLowerCase();
            const parentScopePriority = parentRole.level_id.scope_priority;

            const roleLevel = await CmsLevel.findById(targetLevelId);
            const childScopePriority = roleLevel?.scope_priority;

            // Parent must be at same or higher level in the hierarchy
            if (childScopePriority !== undefined && childScopePriority < parentScopePriority) {
                return res.status(400).json({
                    status: 'error',
                    message: 'Child role cannot have higher scope than parent role'
                });
            }

            // Department/Country check: allow universal parents (country_id = null), OR same dept, OR same-country parents
            const parentIsUniversal = !parentRole.country_id;
            const parentIsSameDept = parentDeptLegacyId.toString() === targetDeptId.toString();
            const targetCountryId = country_id !== undefined ? country_id : role.country_id;
            const parentIsSameCountry = targetCountryId && parentRole.country_id &&
                parentRole.country_id.toString() === targetCountryId.toString();

            if (!parentIsUniversal && !parentIsSameDept && !parentIsSameCountry) {
                return res.status(400).json({
                    status: 'error',
                    message: 'Parent role must be a universal role, belong to the same department, or be in the same country'
                });
            }
        }

        // Validate role panels are mapped to department first
        const normalizedPanels = panels.map(p => {
            if (typeof p === 'string' || p instanceof mongoose.Types.ObjectId) {
                return { panel_id: p.toString(), saas_product_ids: [] };
            }
            return {
                panel_id: p.panel_id?.toString() || p.id?.toString(),
                saas_product_ids: (p.saas_product_ids || []).map(id => id.toString())
            };
        }).filter(p => p.panel_id);

        const targetDeptIdForPanels = department_id || role.department_id;
        for (const item of normalizedPanels) {
            const deptPanelExists = await DepartmentPanel.findOne({ department_id: targetDeptIdForPanels, panel_id: item.panel_id });
            if (!deptPanelExists) {
                return res.status(400).json({
                    status: 'error',
                    message: `Role cannot be assigned panel ${item.panel_id} because it is not mapped to the department first.`
                });
            }
        }

        const updateFields = {
            name,
            country_id: country_id === undefined ? role.country_id : (country_id || null)
        };
        if (department_id) {
            updateFields.department_id = department_id;
        }
        if (level_id) {
            updateFields.level_id = level_id;
        }
        if (parent_role_id) {
            updateFields.parent_role_id = parent_role_id;
        }

        await CmsRole.updateOne(
            { _id: id },
            { $set: updateFields }
        );

        // Update child role departments if department changed
        if (department_id && String(department_id) !== String(role.department_id)) {
            await updateDescendantDepartments(id, department_id);
        }

        // Update role panels
        await RolePanel.deleteMany({ role_id: id });
        for (const item of normalizedPanels) {
            await RolePanel.create({
                role_id: id,
                panel_id: item.panel_id,
                saas_product_ids: item.saas_product_ids
            });
        }

        // Self-heal user hierarchy if parent role, level, or department changed
        const hierarchyChanged = (department_id && String(department_id) !== String(role.department_id)) ||
                                 (level_id && String(level_id) !== String(role.level_id)) ||
                                 (parent_role_id && String(parent_role_id) !== String(role.parent_role_id));
        if (hierarchyChanged) {
            healUsersForRoleAndSubtrees(id).catch(err => {
                console.error("Error healing user hierarchy:", err);
            });
        }

        return res.status(200).json({ status: 'success', message: 'Role updated successfully' });
    } catch (error) {
        return res.status(500).json({ status: 'error', message: error.message || 'Internal Server Error', error: error.message });
    }
}

const assign_module_to_role = async (req, res) => {
    try {
        const { role_id, module_id } = req.params;

        if (!role_id || !module_id) {
            return res.status(400).json({ status: 'error', message: 'role_id and module_id are required' });
        }

        const role = await CmsRole.findOne({ _id: role_id, deleted_at: null });
        if (!role) {
            return res.status(404).json({ status: 'error', message: 'Role not found' });
        }

        const moduleData = await CmsModule.findOne({ _id: module_id, deleted_at: null });
        if (!moduleData) {
            return res.status(404).json({ status: 'error', message: 'Module not found' });
        }

        const existing = await CmsRoleWiseModule.findOne({
            role_id: role_id,
            module_id: module_id,
            deleted_at: null
        });

        if (existing) {
            return res.status(409).json({ status: 'error', message: 'Module already assigned to this role' });
        }

        await CmsRoleWiseModule.create({
            role_id: role._id,
            module_id: moduleData._id,
            can_view: true,
            can_add: false,
            can_edit: false,
            can_delete: false
        });

        return res.status(200).json({ status: 'success', message: 'Module assigned successfully' });
    } catch (error) {
        return res.status(500).json({ status: 'error', message: error.message || 'Internal Server Error', error: error.message });
    }
}

const update_module_permissions = async (req, res) => {
    try {
        const { id } = req.params; // numeric role id
        const { modules } = req.body;

        if (!Array.isArray(modules)) {
            return res.status(400).json({ status: 'error', message: 'modules must be an array' });
        }

        const role = await CmsRole.findOne({ _id: id, deleted_at: null });
        if (!role) {
            return res.status(404).json({ status: 'error', message: 'Role not found' });
        }

        const all_modules = await CmsModule.find({ deleted_at: null });
        const modulesMap = new Map(all_modules.map(m => [m._id.toString(), m]));

        const submittedModulesMap = new Map(modules.map(m => [(m.module_id || m.id).toString(), m]));

        for (const submittedModule of modules) {
            const mId = (submittedModule.module_id || submittedModule.id).toString();
            const moduleInfo = modulesMap.get(mId);

            if (!moduleInfo || !moduleInfo.parent_module_id) continue;

            const parentModule = all_modules.find(m => m._id.equals(moduleInfo.parent_module_id));
            if (!parentModule) continue;

            const parentPermissions = submittedModulesMap.get(parentModule._id.toString());
            if (!parentPermissions) continue;

            const permissions = ['can_view', 'can_add', 'can_edit', 'can_delete'];
            for (const p of permissions) {
                if (submittedModule[p] && !parentPermissions[p]) {
                    return res.status(400).json({
                        status: 'error',
                        message: `Cannot enable '${p.replace('can_', '')}' for child module '${moduleInfo.name}' because its parent '${parentModule.name}' does not have this permission.`
                    });
                }
            }
        }

        for (const m of modules) {
            const module_id = m.module_id || m.id;
            if (!module_id) continue;

            const isEnabled = m.can_view || m.isAssigned || m.can_add || m.can_edit || m.can_delete;

            if (!isEnabled) {
                // If module is disabled/unassigned, soft delete from role
                await CmsRoleWiseModule.updateMany(
                    { role_id: id, module_id: module_id, deleted_at: null },
                    { $set: { deleted_at: new Date() } }
                );
            } else {
                // Upsert active permission
                const existing = await CmsRoleWiseModule.findOne({ role_id: id, module_id: module_id });
                if (existing) {
                    existing.deleted_at = null;
                    existing.can_view = true;
                    existing.can_add = !!m.can_add;
                    existing.can_edit = !!m.can_edit;
                    existing.can_delete = !!m.can_delete;
                    await existing.save();
                } else {
                    await CmsRoleWiseModule.create({
                        role_id: id,
                        module_id: module_id,
                        can_view: true,
                        can_add: !!m.can_add,
                        can_edit: !!m.can_edit,
                        can_delete: !!m.can_delete,
                        deleted_at: null
                    });
                }
            }
        }

        return res.status(200).json({ status: 'success', message: 'Module permissions updated successfully' });
    } catch (error) {
        return res.status(500).json({ status: 'error', message: error.message || 'Internal Server Error', error: error.message });
    }
}

const send_otp_for_unassign_module = async (req, res) => {
    try {
        const { role_id, module_id } = req.body;
        const { id: user_id } = req.user;

        if (!role_id || !module_id) {
            return res.status(400).json({ status: 'error', message: 'role_id and module_id are required' });
        }

        const role = await CmsRole.findOne({ _id: role_id, deleted_at: null });
        if (!role) {
            return res.status(404).json({ status: 'error', message: 'Role not found' });
        }

        const moduleData = await CmsModule.findOne({ _id: module_id, deleted_at: null });
        if (!moduleData) {
            return res.status(404).json({ status: 'error', message: 'Module not found' });
        }

        const user = await CmsUser.findOne({ _id: user_id, deleted_at: null });
        if (!user) {
            return res.status(404).json({ status: 'error', message: 'User not found' });
        }

        const otp = await sendOTP(user.email, `Code for unassign module from role.`, `This OTP is for unassigning ${moduleData.name} from ${role.name}.`);
        const hashed_otp = await bcrypt.hash(otp.otp, 10);
        const expires_at = new Date(Date.now() + 3 * 60 * 1000);

        await Otp.create({
            user_id: user._id,
            otp: hashed_otp,
            purpose: 'unassign_module',
            expires_at,
            created_at: new Date()
        });

        return res.status(200).json({ status: "success", message: "OTP sent successfully." });

    } catch (error) {
        return res.status(500).json({ status: 'error', message: error.message || 'Internal Server Error', error: error.message });
    }
}

const unassign_module_from_role = async (req, res) => {
    try {
        const { id } = req.params; // numeric role id
        const { module_id, otp } = req.body;
        const { id: user_id } = req.user;

        if (!module_id || !otp) {
            return res.status(400).json({ status: 'error', message: 'module_id and otp are required' });
        }

        const otp_record = await Otp.findOne({
            user_id: user_id,
            purpose: 'unassign_module'
        }).sort({ created_at: -1 });

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

        const role = await CmsRole.findOne({ _id: id, deleted_at: null });
        if (!role) {
            return res.status(404).json({ status: 'error', message: 'Role not found' });
        }

        const all_modules = await CmsModule.find({ deleted_at: null });

        const getDescendants = (parentId, modules) => {
            let descendants = [];
            const children = modules.filter(m => m.parent_module_id && m.parent_module_id.toString() == parentId.toString());
            for (const child of children) {
                descendants.push(child._id);
                descendants = descendants.concat(getDescendants(child._id, modules));
            }
            return descendants;
        };

        const targetModule = all_modules.find(m => m._id == module_id);
        if (!targetModule) {
            return res.status(404).json({ status: 'error', message: 'Module not found' });
        }

        const descendantIds = getDescendants(targetModule._id, all_modules);
        const idsToRemove = [targetModule._id, ...descendantIds];

        await CmsRoleWiseModule.updateMany(
            { role_id: role._id, module_id: { $in: idsToRemove }, deleted_at: null },
            { $set: { deleted_at: new Date() } }
        );

        return res.status(200).json({ status: 'success', message: 'Module and its children unassigned successfully' });
    } catch (error) {
        return res.status(500).json({ status: 'error', message: error.message || 'Internal Server Error', error: error.message });
    }
}

const get_country_saas_products = async (req, res) => {
    try {
        const { country_id } = req.params;
        if (!country_id) {
            return res.status(400).json({ status: 'error', message: 'country_id is required' });
        }
        const activeProducts = await CountrySaaSProduct.find({ country_id, is_active: true }).lean();
        const productIds = activeProducts.map(p => p.saas_product_id.toString());
        return res.status(200).json({ status: 'success', data: productIds });
    } catch (error) {
        return res.status(500).json({ status: 'error', message: error.message || 'Internal Server Error' });
    }
}

const delete_role = async (req, res) => {
    try {
        const { id } = req.params;
        const role = await CmsRole.findOne({ _id: id, deleted_at: null });
        if (!role) {
            return res.status(404).json({ status: 'error', message: 'Role not found' });
        }
        if (role.name === 'Super Admin') {
            return res.status(403).json({ status: 'error', message: 'Root Super Admin role cannot be deleted.' });
        }

        // Check if active users are assigned to this role
        const assignedUsersCount = await CmsUser.countDocuments({ role_id: id, is_active: true, deleted_at: null });
        if (assignedUsersCount > 0) {
            return res.status(400).json({
                status: 'error',
                message: `Cannot delete "${role.name}" because it is currently assigned to ${assignedUsersCount} active user(s). Please reassign or update those users first.`
            });
        }

        // Check if child roles exist and unlink them
        await CmsRole.updateMany({ parent_role_id: id }, { $set: { parent_role_id: null } });

        // Soft delete the role
        role.deleted_at = new Date();
        role.is_active = false;
        await role.save();

        // Clean up role panels and role module links
        await RolePanel.deleteMany({ role_id: id }).catch(() => {});
        await CmsRoleWiseModule.deleteMany({ role_id: id }).catch(() => {});

        return res.status(200).json({ status: 'success', message: `Role "${role.name}" deleted successfully.` });
    } catch (error) {
        return res.status(500).json({ status: 'error', message: error.message || 'Internal Server Error' });
    }
};

const update_role_panels = async (req, res) => {
    try {
        const { id } = req.params;
        const { panels } = req.body;

        if (!Array.isArray(panels)) {
            return res.status(400).json({ status: 'error', message: 'panels array is required' });
        }

        const role = await CmsRole.findOne({ _id: id, deleted_at: null });
        if (!role) {
            return res.status(404).json({ status: 'error', message: 'Role not found' });
        }

        const panelIds = panels.map(p => {
            if (typeof p === 'string') return p;
            return (p.panel_id || p.id || p._id || '').toString();
        }).filter(Boolean);

        // Replace RolePanel entries for this role
        await RolePanel.deleteMany({ role_id: id });
        for (const pId of panelIds) {
            await RolePanel.create({
                role_id: id,
                panel_id: pId,
                saas_product_ids: []
            });
        }

        const updatedRolePanels = await RolePanel.find({ role_id: id }).populate('panel_id').lean();

        return res.status(200).json({
            status: 'success',
            message: 'Role panels updated successfully',
            data: updatedRolePanels
        });
    } catch (error) {
        console.error("Error updating role panels:", error);
        return res.status(500).json({ status: 'error', message: error.message || 'Internal Server Error' });
    }
};

module.exports = { get_levels, get_roles, get_role, add_role, get_parent_roles, update_role, delete_role, update_role_panels, send_otp_for_update_role, send_otp_for_unassign_module, assign_module_to_role, update_module_permissions, unassign_module_from_role, get_country_saas_products }