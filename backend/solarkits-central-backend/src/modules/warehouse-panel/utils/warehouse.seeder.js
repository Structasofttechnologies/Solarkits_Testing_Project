const { CmsPanel, CmsLevel, CmsModule, CmsRole, CmsRoleWiseModule } = require('../models/user_db');
const { WarehouseRoleWiseModule, WarehouseRole, WarehouseModule } = require('../models/company_warehouse_db');
const { user_db } = require('../config/databases');

const seedWarehouseCMS = async () => {
  try {
    console.log('🔑 Seeding Warehouse CMS Modules...');

    // 1. Define default modules data
    const modulesData = [
      { name: "Stock Movement", unique_code: "WH_STOCK_MOV", parent_code: null, warehouse_type: "both" },
      { name: "Material Inward", unique_code: "WH_MAT_INWARD", parent_code: "WH_STOCK_MOV", warehouse_type: "both" },
      { name: "Material Outward", unique_code: "WH_MAT_OUTWARD", parent_code: "WH_STOCK_MOV", warehouse_type: "both" },
      { name: "Inventory Transfer", unique_code: "WH_INV_TRANSFER", parent_code: "WH_STOCK_MOV", warehouse_type: "master" },
      { name: "Stock Adjustment", unique_code: "WH_STOCK_ADJ", parent_code: "WH_STOCK_MOV", warehouse_type: "both" },
      { name: "Logistics & Returns", unique_code: "WH_LOG_RETURNS", parent_code: null, warehouse_type: "both" },
      { name: "Delivery Management", unique_code: "WH_DELIVERY_MGMT", parent_code: "WH_LOG_RETURNS", warehouse_type: "both" },
      { name: "Product Replacement", unique_code: "WH_PROD_REPLACE", parent_code: "WH_LOG_RETURNS", warehouse_type: "both" },
      { name: "Repair Tickets", unique_code: "WH_REPAIR_TICKETS", parent_code: "WH_LOG_RETURNS", warehouse_type: "both" }
    ];

    // Seed/find warehouse modules in WarehouseModule (company_warehouse_db)
    const createdModules = {};
    for (const item of modulesData) {
      let m = await WarehouseModule.findOne({ name: item.name });
      let parentId = null;
      if (item.parent_code && createdModules[item.parent_code]) {
        parentId = createdModules[item.parent_code]._id;
      } else if (item.parent_code) {
        const parentMod = await WarehouseModule.findOne({ unique_code: item.parent_code });
        if (parentMod) parentId = parentMod._id;
      }

      if (!m) {
        m = await WarehouseModule.create({
          name: item.name,
          unique_code: item.unique_code,
          parent_module_id: parentId,
          warehouse_type: item.warehouse_type || 'both',
          is_active: true
        });
        console.log(`  ✓ Seeded warehouse module: ${item.name} (${item.unique_code})`);
      } else {
        m.unique_code = item.unique_code;
        m.warehouse_type = item.warehouse_type || 'both';
        m.parent_module_id = parentId;
        await m.save();
        console.log(`  ✓ Updated warehouse module: ${item.name} (${item.unique_code})`);
      }
      createdModules[item.unique_code] = m;
    }

    // 2. Seed developer panel module "Warehouse Modules" (DEV_WH_MODULES)
    const devPanel = await CmsPanel.findOne({ url_prefix: '/developer-panel' });
    const level = await CmsLevel.findOne({ name: 'global' });
    if (devPanel && level) {
      const existsDevMod = await CmsModule.findOne({ unique_code: 'DEV_WH_MODULES' });
      if (!existsDevMod) {
        const devMod = await CmsModule.create({
          name: "Warehouse Modules",
          unique_code: "DEV_WH_MODULES",
          panel_id: devPanel._id,
          level_id: level._id,
          parent_module_id: null,
          dashboard_context: 'default',
          is_active: true
        });
        console.log("  ✓ Seeded Developer Panel module: Warehouse Modules (DEV_WH_MODULES)");

        // Sync Developer Panel role-wise permissions for 00000037
        const roles = await CmsRole.find({});
        for (const role of roles) {
          const exists = await CmsRoleWiseModule.findOne({
            role_id: role._id,
            module_id: devMod._id,
            deleted_at: null
          });
          if (!exists) {
            await CmsRoleWiseModule.create({
              role_id: role._id,
              module_id: devMod._id,
              can_view: true,
              can_add: true,
              can_edit: true,
              can_delete: true,
              created_at: new Date()
            });
            console.log(`  ✓ Synced developer role permissions for DEV_WH_MODULES to role: ${role.name}`);
          }
        }
      }
    }


    // 3. Sync role-wise permissions for warehouse roles using WarehouseModule
    console.log('🔑 Syncing Warehouse Role-wise Module Permissions...');
    const allWarehouseModules = await WarehouseModule.find({ is_deleted: false });
    const roles = await WarehouseRole.find({ is_active: true });

    let createdMappingCount = 0;
    for (const mod of allWarehouseModules) {
      for (const role of roles) {
        const exists = await WarehouseRoleWiseModule.findOne({
          role_id: role._id,
          module_id: mod._id,
          deleted_at: null
        });
        if (!exists) {
          await WarehouseRoleWiseModule.create({
            role_id: role._id,
            module_id: mod._id,
            can_view: true,
            can_add: true,
            can_edit: true,
            can_delete: true,
            created_at: new Date()
          });
          createdMappingCount++;
        } else if (mod.unique_code === 'WH_DELIVERY_MGMT') {
          exists.can_view = true;
          exists.can_add = true;
          exists.can_edit = true;
          exists.can_delete = true;
          await exists.save();
        }
      }
    }
    if (createdMappingCount > 0) {
      console.log(`  ✓ Created ${createdMappingCount} new warehouse role-wise module mappings.`);
    }
    console.log('✅ Warehouse CMS Seeding completed.');
  } catch (error) {
    console.error("❌ Error seeding warehouse CMS:", error);
  }
};

module.exports = { seedWarehouseCMS };
