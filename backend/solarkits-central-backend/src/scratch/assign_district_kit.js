require('dotenv').config();
const dns = require('dns');
dns.setServers(['8.8.8.8', '8.8.4.4', '1.1.1.1']);
const mongoose = require('mongoose');
const { FranchiseePlanPoSetting, ResellerPlan, WarehouseComboKit, ResellerPlanSubscription } = require('../modules/admin-panel/models/india_solarshop_db');

(async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    
    // Assign 5kW kit to District Franchisee PO setting
    const districtPlan = await ResellerPlan.findOne({ slug: 'district-frachisee' }).lean();
    const kit5kW = await WarehouseComboKit.findOne({ name: /5kW Residential/i }).lean();

    console.log('District Plan ID:', districtPlan?._id?.toString());
    console.log('5kW Kit ID:', kit5kW?._id?.toString(), kit5kW?.name);

    if (districtPlan && kit5kW) {
      await FranchiseePlanPoSetting.updateOne(
        { plan_id: districtPlan._id, deleted_at: null },
        { $set: { allowed_combo_kit_ids: [kit5kW._id], min_po_quantity: 1, po_enabled: true } }
      );
      console.log('Updated District Franchisee PO setting with 5kW kit!');
    }

    // Now test resolution for District Franchisee
    const districtPoSettings = await FranchiseePlanPoSetting.find({
      plan_id: districtPlan._id,
      is_active: true,
      po_enabled: { $ne: false },
      deleted_at: null,
    })
      .populate({ path: 'allowed_combo_kit_ids', model: WarehouseComboKit })
      .lean();

    let comboKits = [];
    districtPoSettings.forEach((s) => {
      if (s.po_enabled !== false && Array.isArray(s.allowed_combo_kit_ids)) {
        s.allowed_combo_kit_ids.forEach((k) => {
          if (k && (k._id || k.id)) {
            comboKits.push({
              id: k._id,
              name: k.name,
              min_po_quantity: s.min_po_quantity,
            });
          }
        });
      }
    });

    console.log('\nResolved combo kits for District Franchisee:');
    console.log(comboKits);

    await mongoose.disconnect();
  } catch(e) {
    console.error(e);
  }
})();
