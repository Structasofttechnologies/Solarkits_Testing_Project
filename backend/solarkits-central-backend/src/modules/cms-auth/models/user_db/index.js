// ─── USER_DB/index.js ─────────────────────────────────────────────────────────
// Central export for all USER_DB models. Import from here in controllers.
module.exports = {
  CmsPanel:            require('./cms_panels.schema'),
  CmsDepartment:       require('./cms_departments.schema'),
  CmsLevel:            require('./cms_levels.schema'),
  CmsModule:           require('./cms_modules.schema'),
  CmsRole:             require('./cms_roles.schema'),
  CmsRoleWiseModule:   require('./cms_role_wise_modules.schema'),
  CmsUser:             require('./cms_users.schema'),
  CmsUserScope:        require('./cms_user_scope.schema'),
  Otp:                 require('./otps.schema'),
  Task:                require('./tasks.schema'),
  SaaSProduct:         require('./saas_products.schema'),
  DepartmentPanel:     require('./department_panels.schema'),
  RolePanel:           require('./role_panels.schema'),
  PanelSaaSProduct:    require('./panel_saas_products.schema'),
  CountrySaaSProduct:  require('./country_saas_products.schema'),
  UserPanel:           require('./user_panels.schema'),
};
