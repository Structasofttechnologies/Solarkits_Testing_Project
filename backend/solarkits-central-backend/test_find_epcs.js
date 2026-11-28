require('dotenv').config();
const { EpcAccount, EpcLead } = require('./src/modules/admin-panel/models/india_solarshop_db');

async function findTests() {
  const testEpcs = await EpcAccount.find({
    $or: [
      { name: /test/i },
      { company_name: /test/i },
      { email: /test/i }
    ]
  }).lean();
  console.log('Test EPCs found:', testEpcs.map(e => ({ id: e._id, name: e.name, company_name: e.company_name, email: e.email, created_at: e.created_at })));

  const allEpcs = await EpcAccount.find({}).lean();
  console.log('\nAll 34 EPCs:');
  allEpcs.forEach((e, idx) => {
    console.log(`${idx + 1}. [${e._id.toString().slice(-6)}] ${e.company_name || e.name} | GST: ${e.gstin || 'None'} | ActiveGST: ${e.is_gstin_active} | Status: ${e.status} | VerifiedStatus: ${e.gst_verification_status}`);
  });

  process.exit(0);
}

findTests();
