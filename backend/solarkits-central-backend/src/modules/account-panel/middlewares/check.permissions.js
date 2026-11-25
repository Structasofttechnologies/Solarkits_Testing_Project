const mongoose = require('mongoose');
const { CmsRoleWiseModule, CmsModule, CmsPanel } = require('../models/user_db');

const check_permissions = (permissionChecks) => {
  return async (req, res, next) => {
    try {
      const user = req.user;
      if (!user || !user.role_id) {
        return res.status(403).json({ status: "error", message: "User role not assigned. Access forbidden.", auth: false });
      }

      if (!req.query.req_for || !req.query.unique_id) {
        return res.status(400).json({ status: "error", message: "Missing required fields: req_for and unique_id", auth: false });
      }
      const { req_for, unique_id } = req.query;

      if (!['view', 'add', 'edit', 'delete'].includes(req_for)) {
        return res.status(400).json({ status: "error", message: "Invalid req_for value. Must be one of: view, add, edit, delete.", auth: false });
      }

      const checks = Array.isArray(permissionChecks) ? permissionChecks : [permissionChecks];
      const relevantCheck = checks.find(check => check.unique_code === unique_id);

      if (!relevantCheck) {
        return res.status(403).json({ status: "error", message: "This module cannot be accessed for this request. Access forbidden.", auth: false });
      }

      const { unique_code } = relevantCheck;
      const permissions = relevantCheck.permissions || relevantCheck.require_permissions || [];

      // Super Admin Bypass
      if (user.is_super_admin) {
        return next();
      }

      // 1. Find module by unique_code
      const moduleData = await CmsModule.findOne({ unique_code, is_active: true, is_deleted: false }).lean();
      if (!moduleData) {
        return res.status(403).json({ status: "error", message: "Module not found or inactive. Access forbidden.", auth: false });
      }

      // Extract Request Context
      const DEFAULT_PANEL_PREFIX = '/account-panel';
      let requestedPanelPrefix = req.headers['x-panel-route'] || req.query.panel_route || DEFAULT_PANEL_PREFIX;

      // 2. Validate Panel Match
      const panel = await CmsPanel.findOne({ url_prefix: requestedPanelPrefix, is_active: true, is_deleted: false }).lean();
      if (!panel) {
        return res.status(403).json({ status: "error", message: "Requested panel is inactive or invalid.", auth: false });
      }

      if (moduleData.panel_id.toString() !== panel._id.toString()) {
        return res.status(403).json({ status: "error", message: "Module panel assignment mismatch.", auth: false });
      }

      // 3. Check if Role Module Assignment exists
      const roleWiseModule = await CmsRoleWiseModule.findOne({
        role_id: user.role_id,
        module_id: moduleData._id,
        deleted_at: null
      }).lean();

      if (!roleWiseModule) {
        return res.status(403).json({ status: "error", message: "No permissions assigned for this module to your role.", auth: false });
      }

      // 4. Check Action Permission
      const permissionsMap = {
        view: 'can_view',
        add: 'can_add',
        edit: 'can_edit',
        delete: 'can_delete'
      };

      const requiredPermissionKey = permissionsMap[req_for];

      if (!Array.isArray(permissions) || !permissions.includes(req_for) || !roleWiseModule[requiredPermissionKey]) {
        return res.status(403).json({ status: "error", message: `Permission denied for action: ${req_for}. Access forbidden.`, auth: false });
      }

      next();
    } catch (error) {
      console.error("Permission check error:", error);
      return res.status(500).json({
        status: "error",
        message: "Internal Server Error during permission check",
        error: error.message,
      });
    }
  };
};

module.exports = check_permissions;
