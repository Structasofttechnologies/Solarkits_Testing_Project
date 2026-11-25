require('dotenv').config();
const mongoose = require('mongoose');
const { india_solarshop_db, core_db } = require('../modules/solarshop-india/config/databases');

async function testKit() {
  await new Promise(r => setTimeout(r, 1000));
  const ComboKit = require('../modules/solarshop-india/models/india_core_db/combo_kits.schema');
  const ProductSkuPrice = require('../modules/solarshop-india/models/india_core_db/product_sku_prices.schema');
  const CompanyMargin = require('../modules/solarshop-india/models/india_solarshop_db/company_margins.schema');
  const SolarShopSettings = require('../modules/solarshop-india/models/india_solarshop_db/solarshop_settings.schema');
  const { WarehouseComboKit, ResellerListing, ResellerPlanSubscription, FranchiseePlan } = require('../modules/admin-panel/models/india_solarshop_db');

  console.log('=== SOLAR SHOP KITS (india_core_db) ===');
  const kit = await ComboKit.findOne({ name: /5 kW/i }).lean();
  if (kit) {
    console.log('KIT FOUND:', kit._id, kit.name, 'capacity:', kit.capacity);
    console.log('Base components:', JSON.stringify(kit.base_components, null, 2));
    console.log('BOS kits:', JSON.stringify(kit.bos_kits, null, 2));

    const skuIds = [];
    (kit.base_components || []).forEach(bc => bc.sku_id && skuIds.push(bc.sku_id));
    (kit.bos_kits || []).forEach(bk => bk.sku_id && skuIds.push(bk.sku_id));

    const prices = await ProductSkuPrice.find({ sku_id: { $in: skuIds } }).lean();
    console.log('SKU Prices:', prices.map(p => ({ sku: p.sku_id, price: p.price, cluster: p.cluster_id })));

    let totalBasePrice = 0;
    (kit.base_components || []).forEach(bc => {
      const match = prices.find(p => p.sku_id.toString() === bc.sku_id?.toString());
      const pVal = match ? match.price : 0;
      totalBasePrice += pVal * (bc.quantity || 1);
    });
    (kit.bos_kits || []).forEach(bk => {
      const match = prices.find(p => p.sku_id.toString() === bk.sku_id?.toString());
      const pVal = match ? match.price : 0;
      totalBasePrice += pVal * (bk.quantity || 1);
    });
    console.log('Calculated totalBasePrice:', totalBasePrice);

    const margin = await CompanyMargin.findOne({ combo_kit_id: kit._id }).lean();
    console.log('Company margin doc:', margin);

    const settings = await SolarShopSettings.findOne({}).lean();
    console.log('Shop Settings GST:', settings?.gst_rate);

    const stdMargin = margin ? (margin.standard_margin || 15) : 15;
    const gstRate = margin?.gst_rate ?? settings?.gst_rate ?? 13.8;
    const priceBeforeGst = Math.round(totalBasePrice * (1 + (stdMargin / 100)));
    const finalShopPrice = Math.round(priceBeforeGst * (1 + (gstRate / 100)));
    console.log('Standard Price before GST:', priceBeforeGst);
    console.log('Final Shop Price with GST:', finalShopPrice);
  }

  console.log('\n=== RESELLER PORTAL KITS (india_solarshop_db) ===');
  const whKit = await WarehouseComboKit.findOne({ name: /5kW/i }).lean();
  console.log('WarehouseKit:', whKit);

  const sub = await ResellerPlanSubscription.findOne({ status: 'active' }).populate('plan_id').lean();
  console.log('Active Sub Plan:', sub?.plan_id);

  process.exit(0);
}
testKit().catch(e => { console.error(e); process.exit(1); });
