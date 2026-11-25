const { CmsUser, CmsLevel } = require('../models/user_db');

const LEVEL_HIERARCHY = {
    global: 0,
    country: 1,
    state: 2,
    cluster: 3,
    district: 4
};

const get_users = async (req, res) => {
    try {
        const currentUser = req.user; // { id: _id }

        // Get current user's full details with role and level
        const userDetails = await CmsUser.findOne({ _id: currentUser.id, deleted_at: null })
            .populate({
                path: 'role_id',
                populate: { path: 'level_id' }
            });

        if (!userDetails) {
            return res.status(401).json({ message: 'User not found' });
        }

        const levelName = userDetails.role_id?.level_id?.name || 'district';
        const userLevel = LEVEL_HIERARCHY[levelName] || 4;
        const userRoleLegacyId = userDetails.role_id;
        const userParentRoleLegacyId = userDetails.role_id?.parent_role_id;

        // Build query based on user's level and permissions
        let filter = { 
            _id: { $ne: currentUser.id },
            deleted_at: null 
        };

        // This requires complex filtering that might be easier with a join or multiple steps
        // But since we are in Mongo, we'll fetch roles first if needed
        
        const roles = await CmsUser.find(filter).populate({
            path: 'role_id',
            populate: { path: 'level_id' }
        }).lean();

        // Manual filtering to match the complex SQL logic
        const filteredUsers = roles.filter(u => {
            const uRole = u.role_id;
            if (!uRole) return false;
            const uLevelName = uRole.level_id?.name || 'district';
            const uLevel = LEVEL_HIERARCHY[uLevelName] || 4;
            const uRoleLegacy = u.role_id;
            const uParentRoleLegacy = uRole.parent_role_id;

            // Business logic replication
            if (userLevel === 0) {
                // Global can see everyone
                return true;
            } else if (userLevel === 1) {
                // Country level
                if (uLevelName === 'global') return false;
                if (userParentRoleLegacyId && uParentRoleLegacy === userParentRoleLegacyId) return false;
                if (uRoleLegacy === userRoleLegacyId && uLevel <= userLevel) return false;
                return true;
            } else if (userLevel >= 2) {
                // State/Cluster/District
                if (uLevel < userLevel) return false;
                if (userParentRoleLegacyId && uParentRoleLegacy === userParentRoleLegacyId) return false;
                if (uLevel === userLevel && uRoleLegacy === userRoleLegacyId) return false;
                return true;
            }
            return false;
        });

        // Final restriction check: AND NOT (role = ? AND level = ?)
        const finalUsers = filteredUsers.filter(u => {
            const uLevelName = u.role_id?.level_id?.name || 'district';
            return !(u.role_id === userRoleLegacyId && uLevelName === levelName);
        });

        const data = finalUsers.map(u => ({
            id: u._id,
            name: u.name,
            email: u.email,
            phone: u.phone,
            role_id: u.role_id ? u.role_id._id : null,
            role_name: u.role_id ? u.role_id.name : null,
            level_name: u.role_id?.level_id?.name || null
        }));

        res.status(200).json({
            success: true,
            data: data,
            count: data.length
        });
    } catch (error) {
        console.error('Error fetching users:', error);
        res.status(500).json({ message: 'Internal server error', error: error.message });
    }
};

module.exports = { get_users };