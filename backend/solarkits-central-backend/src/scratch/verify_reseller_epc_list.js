require('dotenv').config();
const { india_solarshop_db } = require('../modules/solarshop-india/config/databases');
const { GeoLevel0, GeoLevel1, GeoLevel2 } = require('../modules/admin-panel/models/geolocation_db');

async function testResellerList() {
  await new Promise(r => setTimeout(r, 1000));
  const { EpcAccount, Reseller } = require('../modules/admin-panel/models/india_solarshop_db');
  const reseller = await Reseller.findOne({ email: /structasoftadmin/i }).lean();

  const epcs = await EpcAccount.find({
    onboarded_by_reseller_id: reseller._id,
    deleted_at: null,
  }).populate('states', 'name state_code').populate('districts', 'name').sort({ created_at: -1 }).lean();

  console.log(`✅ Found ${epcs.length} EPC Partners linked to Franchisee "${reseller.business_name}":\n`);
  epcs.forEach((e, idx) => {
    console.log(`${idx + 1}. Company: ${e.gstin_trade_name}`);
    console.log(`   Name:    ${e.name}`);
    console.log(`   Email:   ${e.email}`);
    console.log(`   Mobile:  ${e.whatsapp}`);
    console.log(`   GSTIN:   ${e.gstin}`);
    console.log(`   Status:  ${e.status.toUpperCase()}`);
    console.log(`   State:   ${e.states?.[0]?.name || 'N/A'}`);
    console.log(`   City:    ${e.districts?.[0]?.name || 'N/A'}\n`);
  });

  process.exit(0);
}

testResellerList().catch(err => {
  console.error(err);
  process.exit(1);
});
