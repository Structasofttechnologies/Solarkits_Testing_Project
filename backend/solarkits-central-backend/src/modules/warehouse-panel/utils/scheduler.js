const { CompanyWarehouse } = require('../models/company_warehouse_db');

const startScheduler = () => {
  console.log("⏰ Warehouse Profile Auto-Submit Scheduler initialized.");
  
  setInterval(async () => {
    try {
      const now = new Date();
      // Find warehouses whose status is 2 (Awaiting Information) and due_date is in the past
      const expiredWarehouses = await CompanyWarehouse.find({
        status: 2,
        due_date: { $ne: null, $lte: now }
      });

      if (expiredWarehouses.length > 0) {
        console.log(`⏰ Found ${expiredWarehouses.length} warehouses with expired due dates. Auto-submitting...`);
        for (const warehouse of expiredWarehouses) {
          warehouse.status = 3; // In Review
          warehouse.due_date = null; // Clear due date since it's submitted
          await warehouse.save();
          console.log(`⏰ Warehouse ${warehouse.warehouse_code} has been auto-submitted.`);
        }
      }
    } catch (err) {
      console.error("⏰ Error in profile auto-submit scheduler:", err);
    }
  }, 60000); // Check every 60 seconds
};

startScheduler();
