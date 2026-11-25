require('dotenv').config();
const mongoose = require('mongoose');
const { SaaSProduct, PanelSaaSProduct } = require('../modules/admin-panel/models/user_db');
require('../keys/config/databases');

setTimeout(async () => {
  try {
    const unusedSlugs = [
      'diy-solar-projects',
      'epc-project-management-erp',
      'solar-amc-management',
      'solar-installer-marketplace',
      'solar-mega-watt-projects'
    ];

    // Find products
    const productsToDisable = await SaaSProduct.find({ slug: { $in: unusedSlugs } });
    const productIds = productsToDisable.map(p => p._id);
    console.log('Disabling products:', productsToDisable.map(p => p.name));

    // Update products
    await SaaSProduct.updateMany(
      { _id: { $in: productIds } },
      { $set: { is_active: false, is_deleted: true } }
    );

    // Delete mappings from PanelSaaSProduct
    const delResult = await PanelSaaSProduct.deleteMany({ saas_product_id: { $in: productIds } });
    console.log('Deleted PanelSaaSProduct mappings count:', delResult.deletedCount);

    // Verify remaining mappings
    const remaining = await PanelSaaSProduct.find().populate('panel_id saas_product_id');
    console.log('Remaining Mappings:', remaining.map(m => ({
      panel: m.panel_id?.name,
      product: m.saas_product_id?.name,
      slug: m.saas_product_id?.slug
    })));

    console.log('✅ Successfully removed unused SaaS products from all panels!');
    process.exit(0);
  } catch (e) {
    console.error('Error during cleanup:', e);
    process.exit(1);
  }
}, 1500);
