require('dotenv').config();
const mongoose = require('mongoose');
const {
  company_warehouse_db,
  core_db,
  india_core_db,
  india_solarshop_db
} = require('../keys/config/databases');

async function cleanAllWarehouseData() {
  try {
    console.log('--- Starting Complete Warehouse Data Purge ---');

    // Wait for db connection
    if (mongoose.connection.readyState !== 1) {
      await new Promise((resolve) => mongoose.connection.once('open', resolve));
    }

    const collections = [
      'company_warehouses',
      'warehouse_users',
      'company_warehouse_field_status',
      'company_warehouse_field_data',
      'warehouse_stocks',
      'warehouse_kit_activations',
      'warehouse_inventory_reservations',
      'warehouse_cluster_mappings'
    ];

    for (const colName of collections) {
      try {
        const col = mongoose.connection.collection(colName);
        const countBefore = await col.countDocuments();
        if (countBefore > 0) {
          const res = await col.deleteMany({});
          console.log(`Deleted ${res.deletedCount} documents from collection: ${colName}`);
        } else {
          console.log(`Collection ${colName} is already empty (0 documents).`);
        }
      } catch (err) {
        console.warn(`Could not clear collection ${colName}:`, err.message);
      }
    }

    console.log('✅ Successfully purged all warehouse data from database.');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error during warehouse data purge:', error);
    process.exit(1);
  }
}

cleanAllWarehouseData();
