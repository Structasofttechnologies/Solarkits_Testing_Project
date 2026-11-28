/**
 * clean_dummy_epc_accounts.js
 * Soft-delete fake/test/dummy EPC accounts
 */
require('dotenv').config();
const { EpcAccount } = require('../modules/admin-panel/models/india_solarshop_db');

async function clean() {
  try {
    const dummyEmails = [
      'test_epc_1794554858188_b@8000database.com',
      'test_epc_1794554682899_b@8000database.com',
      'rahil.sunnovative@gmail.com',
      '1234567890@epc.solarkits.in',
      'ravi.s@gmail.com',
      'sushilpiprotar@gmail.com',
      'structasoft.epc@gmail.com',
      'customer@solarkits.com',
      'amit.sharma@solarepc.test',
      'fresh.epc@solarkits.com',
      'newkit.epc@solarkits.com',
      'profile.epc@solarkits.com'
    ];

    const result = await EpcAccount.updateMany(
      {
        $or: [
          { email: { $in: dummyEmails } },
          { gstin: null },
          { gstin: '' }
        ]
      },
      { $set: { deleted_at: new Date(), is_active: false } }
    );
    console.log('Successfully soft-deleted dummy/test records:', result.modifiedCount);

    const activeRemaining = await EpcAccount.find({ deleted_at: null }).lean();
    console.log('Active remaining legitimate EPCs:', activeRemaining.length);
    activeRemaining.forEach((e, idx) => {
      console.log(`${idx + 1}. ${e.company_name || e.name} | State: ${e.state_name} | District: ${e.district_name} | GST: ${e.gstin}`);
    });

  } catch (err) {
    console.error('Error during cleanup:', err);
  } finally {
    process.exit(0);
  }
}

clean();
