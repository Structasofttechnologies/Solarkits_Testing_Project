const mongoose = require('mongoose');
const { CmsRoleWiseModule, CmsModule, CmsPanel, SaaSProduct, PanelSaaSProduct, CountrySaaSProduct } = require('../models/user_db');

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

      // Warehouse user permissions path
      if (user.is_warehouse_user) {
        const { WarehouseRoleWiseModule, WarehouseModule } = require('../models/company_warehouse_db');
        
        // 1. Find module by unique_code in company_warehouse_db
        const moduleData = await WarehouseModule.findOne({ unique_code, is_active: true, is_deleted: false }).lean();
        if (!moduleData) {
          return res.status(403).json({ status: "error", message: "Module not found or inactive. Access forbidden.", auth: false });
        }

        // 2. Check if Role Module Assignment exists
        const roleWiseModule = await WarehouseRoleWiseModule.findOne({
          role_id: user.role_id,
          module_id: moduleData._id,
          deleted_at: null
        }).lean();

        if (!roleWiseModule) {
          return res.status(403).json({ status: "error", message: "No permissions assigned for this module to your role.", auth: false });
        }

        // 3. Check Action Permission
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

        return next();
      }

      // Super Admin Bypass
      if (user.is_super_admin) {
        return next();
      }

      // 1. Find module by unique_code
      const moduleData = await CmsModule.findOne({ unique_code, is_active: true, is_deleted: false }).lean();
      if (!moduleData) {
        return res.status(403).json({ status: "error", message: "Module not found or inactive. Access forbidden.", auth: false });
      }

      // Extract Request Context (Headers first, then query, and fall back to auto-detecting or defaulting)
      const DEFAULT_PANEL_PREFIX = '/warehouse-management-panel';
      let requestedPanelPrefix = req.headers['x-panel-route'] || req.query.panel_route;

      if (!requestedPanelPrefix) {
        const url = req.originalUrl || req.url || '';
        if (url.includes('/developer-api')) {
          requestedPanelPrefix = '/developer-panel';
        } else if (url.includes('/admin-api')) {
          requestedPanelPrefix = '/admin-panel';
        } else if (url.includes('/operation-api')) {
          requestedPanelPrefix = '/operation-management-panel';
        } else if (url.includes('/warehouse-api')) {
          requestedPanelPrefix = '/warehouse-management-panel';
        } else {
          requestedPanelPrefix = DEFAULT_PANEL_PREFIX;
        }
      }

      const requestedContext = req.headers['x-dashboard-context'] || req.query.dashboard_context || 'default';
      const requestedProductSlug = req.headers['x-saas-product-slug'] || req.query.saas_product_slug;

      // 2. Validate Panel Match
      const panel = await CmsPanel.findOne({ url_prefix: requestedPanelPrefix, is_active: true, is_deleted: false }).lean();
      if (!panel) {
        return res.status(403).json({ status: "error", message: "Requested panel is inactive or invalid.", auth: false });
      }

      if (moduleData.panel_id.toString() !== panel._id.toString()) {
        return res.status(403).json({ status: "error", message: "Module panel assignment mismatch.", auth: false });
      }

      // 3. Validate Dashboard Context
      if (moduleData.dashboard_context !== requestedContext) {
        return res.status(403).json({ status: "error", message: "Dashboard context mismatch for this module.", auth: false });
      }

      // 4. If Product Context, Validate SaaS Product Allowed & Active
      if (requestedContext === 'product') {
        if (!requestedProductSlug) {
          return res.status(400).json({ status: "error", message: "SaaS Product Slug is required for product context.", auth: false });
        }

        const product = await SaaSProduct.findOne({ slug: requestedProductSlug, is_active: true, is_deleted: false }).lean();
        if (!product) {
          return res.status(403).json({ status: "error", message: "SaaS Product not found or inactive.", auth: false });
        }

        if (moduleData.saas_product_id.toString() !== product._id.toString()) {
          return res.status(403).json({ status: "error", message: "Module does not belong to this SaaS Product.", auth: false });
        }

        // Validate product allowed in panel
        const panelProduct = await PanelSaaSProduct.findOne({ panel_id: panel._id, saas_product_id: product._id }).lean();
        if (!panelProduct) {
          return res.status(403).json({ status: "error", message: "This SaaS product is not allowed in this panel.", auth: false });
        }

        // Resolve country_id for country-wide activation
        let countryId = null;
        if (mongoose.Types.ObjectId.isValid(user.country)) {
          countryId = new mongoose.Types.ObjectId(user.country);
        } else {
          // Dynamic lookup inside geolocations connection
          const geoDb = mongoose.connections.find(conn => conn.name === 'solarkits_geolocations' || conn.name?.includes('geolocations')) || mongoose.connection;
          if (geoDb) {
            try {
              const GeoCountry = geoDb.models['geolocation_level_0'] || geoDb.model('geolocation_level_0', new mongoose.Schema({ name: String }));
              const countryDoc = await GeoCountry.findOne({ name: user.country }).lean();
              if (countryDoc) countryId = countryDoc._id;
            } catch (e) {
              console.warn("Could not find geolocation_level_0 model during dynamic lookup", e.message);
            }
          }
        }

        if (!countryId) {
          return res.status(403).json({ status: "error", message: "Could not resolve user country for SaaS product validation.", auth: false });
        }

        // Validate product active in country
        const countryProduct = await CountrySaaSProduct.findOne({ country_id: countryId, saas_product_id: product._id, is_active: true }).lean();
        if (!countryProduct) {
          return res.status(403).json({ status: "error", message: "This SaaS product is not active in your country.", auth: false });
        }
      }

      // 5. Check if Role Module Assignment exists
      const roleWiseModule = await CmsRoleWiseModule.findOne({
        role_id: user.role_id,
        module_id: moduleData._id,
        deleted_at: null
      }).lean();

      if (!roleWiseModule) {
        return res.status(403).json({ status: "error", message: "No permissions assigned for this module to your role.", auth: false });
      }

      // 6. Check Action Permission
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