const { CmsUser, CmsPanel, DepartmentPanel, RolePanel } = require('../models/user_db');
const jwt = require('../utils/jsonwebtoken');

const check_auth = async (req, res, next) => {
  try {
    const authHeader = req.headers["authorization"];
    if (!authHeader) {
      return res.status(401).json({ status: "error", message: "Authorization header missing", auth: false });
    }

    const token = authHeader.split(' ')[1] || authHeader;
    let decoded = null;
    try {
      decoded = jwt.decode_token(token);
    } catch (err) {
      throw err;
    }

    const isWarehouseUser = decoded?.user?.is_warehouse_user === true;

    if (isWarehouseUser) {
      if (!decoded || !decoded.user || !decoded.user.id || decoded.user.token_version === undefined || decoded.user.token_type !== 'access') {
        return res.status(401).json({ status: "error", message: "Invalid, expired, or malformed token", auth: false });
      }
      
      const { WarehouseUser } = require('../models/company_warehouse_db');
      const user = await WarehouseUser.findById(decoded.user.id)
        .populate('role_id')
        .lean();

      if (!user) {
        return res.status(401).json({ status: "error", message: "User not found", auth: false });
      }

      if (user.token_version !== decoded.user.token_version) {
        return res.status(401).json({ status: "error", message: "Session expired. Please log in again.", auth: false });
      }

      if (!user.is_active || user.is_deleted) {
        return res.status(403).json({ status: "error", message: "User account is inactive or deleted.", auth: false });
      }

      req.user = {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role_id?.name || 'manager',
        role_id: user.role_id?._id,
        is_warehouse_user: true,
        warehouse_id: user.warehouse_id
      };
      return next();
    }

    // Standard CMS user verification path
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

    // 5. Validate requested panel exists (accepts both warehouse panel and admin panel requests)
    const allowedPrefixes = ['/warehouse-management-panel', '/admin-panel'];
    const panels = await CmsPanel.find({ url_prefix: { $in: allowedPrefixes }, is_deleted: false, is_active: true }).lean();
    if (!panels || panels.length === 0) {
      return res.status(404).json({ status: "error", message: "Requested panel not found or inactive.", auth: false });
    }

    const panelIds = panels.map(p => p._id);
    let activePanel = panels.find(p => p.url_prefix === '/warehouse-management-panel') || panels[0];

    if (!isSuperAdmin) {
      // 6. Validate panel assigned to department
      const deptPanelLink = await DepartmentPanel.findOne({ department_id: department._id, panel_id: { $in: panelIds } }).lean();
      if (!deptPanelLink) {
        return res.status(403).json({ status: "error", message: "Department does not have access to this panel.", auth: false });
      }

      // 7. Validate panel assigned to role
      const rolePanelLink = await RolePanel.findOne({ role_id: role._id, panel_id: { $in: panelIds } }).lean();
      if (!rolePanelLink) {
        return res.status(403).json({ status: "error", message: "Role does not have access to this panel.", auth: false });
      }
      activePanel = panels.find(p => String(p._id) === String(rolePanelLink.panel_id)) || activePanel;
    }

    req.user = {
      id: user._id,
      role_id: role._id,
      department_id: department._id,
      is_super_admin: isSuperAdmin,
      country: user.country,
      panel_id: activePanel._id,
      is_warehouse_user: false
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
