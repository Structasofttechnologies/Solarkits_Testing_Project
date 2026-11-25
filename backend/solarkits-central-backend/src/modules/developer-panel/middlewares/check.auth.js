const { CmsUser, CmsPanel, DepartmentPanel, RolePanel } = require('../models/user_db');
const jwt = require('../utils/jsonwebtoken');

const check_auth = async (req, res, next) => {
  try {
    const authHeader = req.headers["authorization"];
    if (!authHeader) {
      return res.status(401).json({ status: "error", message: "Authorization header missing", auth: false });
    }

    const token = authHeader.split(' ')[1] || authHeader;
    const decoded = jwt.decode_token(token);
    if (!decoded || !decoded.user || !decoded.user.id || decoded.user.token_version === undefined || decoded.user.token_type !== 'access') {
      return res.status(401).json({ status: "error", message: "Invalid, expired, or malformed token", auth: false });
    }

    const user = await CmsUser.findById(decoded.user.id)
      .populate({
        path: 'role_id',
        populate: { path: 'department_id' }
      })
      .lean();

    if (!user) {
      return res.status(401).json({ status: "error", message: "User not found", auth: false });
    }

    // 1. Validate token_version
    if (user.token_version !== decoded.user.token_version) {
      return res.status(401).json({ status: "error", message: "Session expired or password changed. Please log in again.", auth: false });
    }

    // 2. Validate user active and not deleted
    if (!user.is_active || user.is_deleted) {
      return res.status(403).json({ status: "error", message: "User account is inactive or deleted.", auth: false });
    }

    const role = user.role_id;
    if (!role) {
      return res.status(403).json({ status: "error", message: "User role not assigned. Access forbidden.", auth: false });
    }

    // 3. Validate role active and not deleted
    if (!role.is_active || role.is_deleted) {
      return res.status(403).json({ status: "error", message: "User role is inactive or deleted.", auth: false });
    }

    const department = role.department_id;
    if (!department) {
      return res.status(403).json({ status: "error", message: "User department not assigned. Access forbidden.", auth: false });
    }

    // 4. Validate department active and not deleted
    if (!department.is_active || department.is_deleted) {
      return res.status(403).json({ status: "error", message: "User department is inactive or deleted.", auth: false });
    }

    const isSuperAdmin = role.name === 'Super Admin' || department.level === 'global';

    // 5. Validate requested panel exists
    const requestedPanelPrefix = '/developer-panel';
    const panel = await CmsPanel.findOne({ url_prefix: requestedPanelPrefix, is_deleted: false, is_active: true }).lean();
    if (!panel) {
      return res.status(404).json({ status: "error", message: "Requested panel not found or inactive.", auth: false });
    }

    if (!isSuperAdmin) {
      // 6. Validate panel assigned to department
      const deptPanelLink = await DepartmentPanel.findOne({ department_id: department._id, panel_id: panel._id }).lean();
      if (!deptPanelLink) {
        return res.status(403).json({ status: "error", message: "Department does not have access to this panel.", auth: false });
      }

      // 7. Validate panel assigned to role
      const rolePanelLink = await RolePanel.findOne({ role_id: role._id, panel_id: panel._id }).lean();
      if (!rolePanelLink) {
        return res.status(403).json({ status: "error", message: "Role does not have access to this panel.", auth: false });
      }
    }

    req.user = {
      id: user._id,
      role_id: role._id,
      department_id: department._id,
      is_super_admin: isSuperAdmin,
      country: user.country,
      panel_id: panel._id,
    };

    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ status: "error", message: "Session has expired. Please log in again.", auth: false, error: "token_expired" });
    }

    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ status: "error", message: "Invalid token. Please log in again.", auth: false, error: "invalid_token" });
    }

    res.status(401).json({ status: "error", message: "Unauthorized", auth: false, error: error.message });
  }
};

module.exports = check_auth;
