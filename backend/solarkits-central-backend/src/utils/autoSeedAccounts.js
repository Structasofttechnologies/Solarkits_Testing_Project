const bcrypt = require('bcrypt');
const EpcAccount = require('../modules/solarshop-india/models/india_solarshop_db/epc_accounts.schema');
const EpcAccountLocation = require('../modules/solarshop-india/models/india_solarshop_db/epc_account_locations.schema');
const GeoLevel1 = require('../modules/solarshop-india/models/geolocation_db/geo_level_1.schema');
const GeoLevel2 = require('../modules/solarshop-india/models/geolocation_db/geo_level_2.schema');

async function autoSeedCustomerAccounts() {
  try {
    const demoAccounts = [
      {
        email: 'customer@solarkits.com',
        password: '1234',
        name: 'Customer Account',
        whatsapp: '9876543210'
      },
      {
        email: 'rahil.sunnovative@gmail.com',
        password: '1234',
        name: 'Rahil Harsoda (Demo)',
        whatsapp: '9913421453'
      },
      {
        email: 'sushilpiprotar@gmail.com',
        password: '1234',
        name: 'Sushil Piprotar (Demo)',
        whatsapp: '9876543211'
      },
      {
        email: 'structasoft.epc@gmail.com',
        password: '1234',
        name: 'Structasoft EPC Innovations',
        whatsapp: '9900000099'
      },
      {
        email: 'dwarka.epc@solarkits.com',
        password: 'Password@123',
        name: 'Dwarka Solar EPC Solutions',
        whatsapp: '9876543220',
        state_name: 'Gujarat',
        district_name: 'Devbhoomi Dwarka'
      }
    ];

    // Cache Gujarat and Devbhoomi Dwarka
    let gujaratDoc = await GeoLevel1.findOne({ name: { $regex: /^Gujarat$/i } });
    let dwarkaDoc = gujaratDoc ? await GeoLevel2.findOne({ level_1: gujaratDoc._id, name: { $regex: /dwarka/i } }) : null;

    for (const acc of demoAccounts) {
      const password_hash = await bcrypt.hash(acc.password, 10);
      let existing = await EpcAccount.findOne({ email: acc.email });

      let states = [];
      let districts = [];
      if (acc.state_name && gujaratDoc) {
        states = [gujaratDoc._id];
      }
      if (acc.district_name && dwarkaDoc) {
        districts = [dwarkaDoc._id];
      }

      if (existing) {
        existing.password_hash = password_hash;
        existing.status = 'approved';
        existing.is_email_verified = true;
        existing.is_whatsapp_verified = true;
        existing.deleted_at = null;
        if (states.length > 0) existing.states = states;
        if (districts.length > 0) existing.districts = districts;
        await existing.save();

        if (gujaratDoc && dwarkaDoc && acc.district_name) {
          await EpcAccountLocation.findOneAndUpdate(
            { account_id: existing._id, is_primary: true },
            {
              account_id: existing._id,
              state_id: gujaratDoc._id,
              district_id: dwarkaDoc._id,
              is_primary: true,
              deleted_at: null
            },
            { upsert: true, returnDocument: 'after' }
          );
        }
      } else {
        const created = await EpcAccount.create({
          name: acc.name,
          email: acc.email,
          whatsapp: acc.whatsapp,
          password_hash: password_hash,
          is_email_verified: true,
          is_whatsapp_verified: true,
          status: 'approved',
          states,
          districts
        });

        if (gujaratDoc && dwarkaDoc && acc.district_name) {
          await EpcAccountLocation.create({
            account_id: created._id,
            state_id: gujaratDoc._id,
            district_id: dwarkaDoc._id,
            is_primary: true
          });
        }
      }
    }
  } catch (err) {
    console.error('⚠️ Auto-seed demo accounts error:', err.message);
  }
}

const mongoose = require('mongoose');

const runAccountSeeder = () => {
  autoSeedCustomerAccounts().catch(() => {});
};

if (mongoose.connection.readyState === 1) {
  runAccountSeeder();
} else {
  mongoose.connection.once('open', runAccountSeeder);
}

module.exports = autoSeedCustomerAccounts;
