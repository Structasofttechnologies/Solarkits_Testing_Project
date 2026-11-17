const bcrypt = require('bcrypt');
const mongoose = require('mongoose');

/**
 * Robustly ensures the Super Admin account and prerequisite CMS records exist.
 * Handles race conditions, duplicate keys, and missing relational links safely.
 */
async function ensureAdminUser(targetEmail = 'rahil.sunnovative@gmail.com') {
  try {
    const CmsUser = mongoose.models.cms_users || require('../modules/cms-auth/models/user_db/cms_users.schema');
    const CmsRole = mongoose.models.cms_roles || require('../modules/cms-auth/models/user_db/cms_roles.schema');
    const CmsDept = mongoose.models.cms_departments || require('../modules/cms-auth/models/user_db/cms_departments.schema');
    const CmsLevel = mongoose.models.cms_levels || require('../modules/cms-auth/models/user_db/cms_levels.schema');
    const CmsPanel = mongoose.models.cms_panels || require('../modules/cms-auth/models/user_db/cms_panels.schema');
    const RolePanel = mongoose.models.role_panels || require('../modules/cms-auth/models/user_db/role_panels.schema');

    const normalizedEmail = (targetEmail || 'rahil.sunnovative@gmail.com').trim().toLowerCase();

    const emailToPhone = {
      'rahil.sunnovative@gmail.com': '9913421453',
      'sushilpiprotar@gmail.com': '9876543211',
      'rahil@solarkits.com': '9876543212',
    };
    const targetPhone = emailToPhone[normalizedEmail] || ('9913' + Math.floor(100000 + Math.random() * 900000));

    // 1. Ensure Global Level
    let globalLevel = await CmsLevel.findOne({ name: { $regex: /^global$/i } });
    if (!globalLevel) {
      try {
        globalLevel = await CmsLevel.create({
          name: 'global',
          scope_priority: 1,
          geo_table_name: null,
          is_active: true
        });
      } catch (e) {
        globalLevel = await CmsLevel.findOne({});
      }
    }

    // 2. Ensure Core Panels exist
    const defaultPanels = [
      { name: 'Admin Panel', slug: 'admin-panel', url_prefix: '/admin-panel' },
      { name: 'Account Panel', slug: 'account-panel', url_prefix: '/account-panel' },
      { name: 'Operation Management Panel', slug: 'operation-management-panel', url_prefix: '/operation-management-panel' },
      { name: 'Warehouse Management Panel', slug: 'warehouse-management-panel', url_prefix: '/warehouse-management-panel' },
      { name: 'Developer Panel', slug: 'developer-panel', url_prefix: '/developer-panel' },
    ];

    const panelDocs = [];
    for (const p of defaultPanels) {
      let panel = await CmsPanel.findOne({ 
        $or: [{ slug: p.slug }, { url_prefix: p.url_prefix }] 
      });
      if (!panel) {
        try {
          panel = await CmsPanel.create({
            name: p.name,
            slug: p.slug,
            url_prefix: p.url_prefix,
            is_active: true,
            is_deleted: false
          });
        } catch (e) {
          panel = await CmsPanel.findOne({ slug: p.slug });
        }
      }
      if (panel) panelDocs.push(panel);
    }

    // 3. Ensure Core Departments
    const coreDepts = [
      { name: 'Super Admin', slug: 'admin-panel', level: 'global' },
      { name: 'Accounts & Finance', slug: 'account-panel', level: 'country' },
      { name: 'Delivery Management', slug: 'warehouse-management-panel', level: 'country' },
      { name: 'Warehouse Management', slug: 'warehouse-management-panel', level: 'country' },
      { name: 'Operations', slug: 'operation-management-panel', level: 'country' },
    ];

    const deptMap = {};
    for (const d of coreDepts) {
      const panel = panelDocs.find(p => p.slug === d.slug) || panelDocs[0];
      let deptDoc = await CmsDept.findOne({ name: { $regex: new RegExp(`^${d.name}$`, 'i') }, deleted_at: null });
      if (!deptDoc) {
        try {
          deptDoc = await CmsDept.create({
            name: d.name,
            panel_id: panel?._id || null,
            level: d.level,
            is_system: true,
            is_protected: true,
            is_active: true
          });
        } catch (e) {
          deptDoc = await CmsDept.findOne({ name: { $regex: new RegExp(`^${d.name}$`, 'i') } });
        }
      }
      if (deptDoc) deptMap[d.name] = deptDoc;
    }
    const superAdminDept = deptMap['Super Admin'] || (await CmsDept.findOne({}));

    // 3.5. Ensure Country Level
    let countryLevel = await CmsLevel.findOne({ name: { $regex: /^country$/i } });
    if (!countryLevel) {
      try {
        countryLevel = await CmsLevel.create({
          name: 'country',
          scope_priority: 2,
          is_active: true
        });
      } catch (e) {
        countryLevel = globalLevel;
      }
    }

    // 4. Ensure Core Roles
    const coreRoles = [
      { name: 'Super Admin', dept: 'Super Admin', level: globalLevel?._id, panelSlug: 'admin-panel' },
      { name: 'Country Administrator', dept: 'Super Admin', level: countryLevel?._id, panelSlug: 'admin-panel' },
      { name: 'Accounts Manager', dept: 'Accounts & Finance', level: countryLevel?._id, panelSlug: 'account-panel' },
      { name: 'Accountant', dept: 'Accounts & Finance', level: countryLevel?._id, panelSlug: 'account-panel' },
      { name: 'Delivery Manager', dept: 'Delivery Management', level: countryLevel?._id, panelSlug: 'warehouse-management-panel' },
      { name: 'Logistics Lead', dept: 'Delivery Management', level: countryLevel?._id, panelSlug: 'warehouse-management-panel' },
      { name: 'Warehouse Manager', dept: 'Warehouse Management', level: countryLevel?._id, panelSlug: 'warehouse-management-panel' },
      { name: 'Inventory Supervisor', dept: 'Warehouse Management', level: countryLevel?._id, panelSlug: 'warehouse-management-panel' },
      { name: 'Operations Manager', dept: 'Operations', level: countryLevel?._id, panelSlug: 'operation-management-panel' },
      { name: 'Cluster Operations Lead', dept: 'Operations', level: countryLevel?._id, panelSlug: 'operation-management-panel' },
    ];

    let superAdminRole = null;
    for (const r of coreRoles) {
      const deptDoc = deptMap[r.dept] || superAdminDept;
      if (!deptDoc) continue;
      let roleDoc = await CmsRole.findOne({ name: r.name, department_id: deptDoc._id, deleted_at: null });
      if (!roleDoc) {
        try {
          roleDoc = await CmsRole.create({
            name: r.name,
            department_id: deptDoc._id,
            level_id: r.level || countryLevel?._id || globalLevel?._id,
            is_system: true,
            is_protected: true,
            is_active: true
          });
        } catch (e) {
          roleDoc = await CmsRole.findOne({ name: r.name, department_id: deptDoc._id });
        }
      }
      if (r.name === 'Super Admin') superAdminRole = roleDoc;

      if (roleDoc) {
        const targetPanel = panelDocs.find(p => p.slug === r.panelSlug);
        if (targetPanel) {
          try {
            const rpExists = await RolePanel.findOne({ role_id: roleDoc._id, panel_id: targetPanel._id });
            if (!rpExists) {
              await RolePanel.create({ role_id: roleDoc._id, panel_id: targetPanel._id });
            }
          } catch (e) {}
        }
        // Also link super admin and country admin to all panels
        if (r.dept === 'Super Admin') {
          for (const p of panelDocs) {
            try {
              const rpExists = await RolePanel.findOne({ role_id: roleDoc._id, panel_id: p._id });
              if (!rpExists) {
                await RolePanel.create({ role_id: roleDoc._id, panel_id: p._id });
              }
            } catch (e) {}
          }
        }
      }
    }
    if (!superAdminRole) superAdminRole = await CmsRole.findOne({ name: { $regex: /^super admin$/i } });

    // 6. Ensure Super Admin User with Passcode '1234'
    const defaultPasscodeHash = await bcrypt.hash('1234', 10);
    let user = await CmsUser.findOne({ 
      $or: [
        { email: { $regex: new RegExp(`^${normalizedEmail}$`, 'i') } },
        { phone: targetPhone }
      ]
    });

    if (!user) {
      try {
        user = await CmsUser.create({
          name: normalizedEmail.split('@')[0].replace(/\./g, ' ').toUpperCase(),
          email: normalizedEmail,
          phone_code: '+91',
          phone: targetPhone,
          parent_user_id: null,
          role_id: superAdminRole?._id || null,
          passcode: defaultPasscodeHash,
          is_verified: true,
          is_system: true,
          is_protected: true,
          is_active: true
        });
        console.log(`✅ [ensureAdminUser] Created admin account: ${normalizedEmail}`);
      } catch (createErr) {
        // If duplicate key error, fetch by either email or phone and update
        user = await CmsUser.findOne({ 
          $or: [
            { email: { $regex: new RegExp(`^${normalizedEmail}$`, 'i') } },
            { phone: targetPhone }
          ]
        });
        if (user) {
          user.email = normalizedEmail;
          user.passcode = defaultPasscodeHash;
          user.is_verified = true;
          user.is_active = true;
          if (superAdminRole) user.role_id = superAdminRole._id;
          await user.save();
          console.log(`✅ [ensureAdminUser] Recovered & updated admin account: ${normalizedEmail}`);
        } else {
          throw createErr;
        }
      }
    } else {
      user.email = normalizedEmail;
      user.is_verified = true;
      user.is_active = true;
      if (superAdminRole) user.role_id = superAdminRole._id;
      user.passcode = defaultPasscodeHash;
      user.failed_login_attempts = 0;
      user.last_failed_login_at = null;
      await user.save();
      console.log(`✅ [ensureAdminUser] Verified admin account: ${normalizedEmail}`);
    }

    return user;
  } catch (err) {
    console.error('❌ [ensureAdminUser] Error:', err);
    throw err;
  }
}

module.exports = ensureAdminUser;
