require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const {
  BDEProfile,
  BDEKYC,
  BDETerritoryAssignment,
  StoreSetup,
  Reseller,
} = require('../modules/admin-panel/models/india_solarshop_db');

const MONGO_URI = process.env.MONGODB_URI;

async function run() {
  try {
    await mongoose.connect(MONGO_URI || 'mongodb://localhost:27017/solarkits_db');
    console.log('✅ Connected to MongoDB');

    // 1. Find StoreSetup ST-2026-0001 or latest setup
    let setup = await StoreSetup.findOne({ store_setup_id: 'ST-2026-0001' });
    if (!setup) {
      setup = await StoreSetup.findOne().sort({ createdAt: -1 });
    }

    if (!setup) {
      console.log('❌ No Store Setup found in database.');
      process.exit(1);
    }

    const reseller = await Reseller.findById(setup.franchisee_id);

    const stateId = new mongoose.Types.ObjectId();
    const stateName = setup.state_name || reseller?.address?.state_name || 'Maharashtra';
    const districtId = new mongoose.Types.ObjectId();
    const districtName = setup.district_name || reseller?.address?.district_name || 'Pune';

    // 2. Find or create BDE
    const bdeEmail = 'rahul.bde@solarkits.com';
    const bdeMobile = '9822012345';
    let bde = await BDEProfile.findOne({ $or: [{ email: bdeEmail }, { mobile_number: bdeMobile }] });

    if (!bde) {
      const bdeCount = await BDEProfile.countDocuments();
      const nextBdeId = `BDE-2026-${String(bdeCount + 1).padStart(4, '0')}`;
      const password_hash = await bcrypt.hash('Bde@12345', 10);

      bde = await BDEProfile.create({
        bde_id: nextBdeId,
        full_name: 'Rahul Patil',
        mobile_number: bdeMobile,
        email: bdeEmail,
        state_id: stateId,
        state_name: stateName,
        state: stateName,
        district_id: districtId,
        district_name: districtName,
        district: districtName,
        designation: 'State Coordinator / BDE',
        status: 'active',
        password_hash,
        is_first_login: false,
      });
      console.log('✅ Created new BDE Profile:', bde.full_name, bde.bde_id, bde.email);
    } else {
      bde.status = 'active';
      bde.state_id = stateId;
      bde.state_name = stateName;
      bde.state = stateName;
      bde.district_id = districtId;
      bde.district_name = districtName;
      bde.district = districtName;
      await bde.save();
      console.log('ℹ️ Using BDE Profile:', bde.full_name, bde.bde_id);
    }

    // 3. Upsert verified KYC
    let kyc = await BDEKYC.findOne({ bde_id: bde._id });
    if (!kyc) {
      await BDEKYC.create({
        bde_id: bde._id,
        aadhaar_number: '567890123456',
        aadhaar_document_url: 'https://placehold.co/600x400/png?text=Aadhaar+Proof',
        pan_number: 'ABCDE5678G',
        pan_document_url: 'https://placehold.co/600x400/png?text=PAN+Proof',
        kyc_status: 'verified',
        verified_at: new Date(),
      });
      console.log('✅ Created verified BDE KYC');
    }

    // 4. Upsert Territory Assignment
    let territory = await BDETerritoryAssignment.findOne({ bde_id: bde._id, status: 'active' });
    if (!territory) {
      territory = await BDETerritoryAssignment.create({
        bde_id: bde._id,
        country_name: 'India',
        state_id: stateId,
        state_name: stateName,
        district_ids: [districtId],
        district_names: [districtName],
        status: 'active',
        assignment_start_date: new Date(),
      });
      console.log(`✅ Created Territory Assignment for BDE in ${stateName} (${districtName})`);
    }

    // 5. Assign BDE to Store Setup
    setup.current_bde_id = bde._id;
    setup.original_bde_id = setup.original_bde_id || bde._id;
    setup.state_name = stateName;
    setup.state_id = stateId;
    setup.district_name = districtName;
    setup.district_id = districtId;
    await setup.save();
    console.log(`✅ Assigned BDE ${bde.full_name} (${bde.bde_id}) as State Coordinator to Store Setup ${setup.store_setup_id}!`);

    // 6. Assign BDE to Reseller
    if (reseller) {
      reseller.bde_id = bde._id;
      reseller.original_bde_id = reseller.original_bde_id || bde._id;
      if (!reseller.address) reseller.address = {};
      reseller.address.state_name = stateName;
      reseller.address.district_name = districtName;
      await reseller.save();
      console.log(`✅ Linked BDE ${bde.full_name} to Franchisee partner "${reseller.business_name}"!`);
    }

    // 7. Verify populated store setup
    const verifySetup = await StoreSetup.findById(setup._id)
      .populate('current_bde_id', 'full_name bde_id email mobile_number designation')
      .lean();

    console.log('\n=============================================');
    console.log('🎉 STORE SETUP ASSIGNMENT COMPLETED:');
    console.log('Setup ID:                   ' + verifySetup.store_setup_id);
    console.log('Franchisee Name:            ' + verifySetup.franchisee_name);
    console.log('State & District:           ' + verifySetup.state_name + ' / ' + verifySetup.district_name);
    console.log('Assigned State Coordinator: ' + (verifySetup.current_bde_id ? `${verifySetup.current_bde_id.full_name} (${verifySetup.current_bde_id.bde_id})` : 'Unassigned'));
    console.log('Coordinator Mobile:         ' + verifySetup.current_bde_id?.mobile_number);
    console.log('Coordinator Email:          ' + verifySetup.current_bde_id?.email);
    console.log('Checklist Progress:         ' + `${verifySetup.completed_activities || 0} of ${verifySetup.total_activities || 16} Steps Completed`);
    console.log('=============================================\n');

    console.log('🔑 BDE PORTAL LOGIN CREDENTIALS:');
    console.log('Full Name:          ' + bde.full_name);
    console.log('Mobile / Login ID:  9822012345');
    console.log('Email:              rahul.bde@solarkits.com');
    console.log('Password:           Bde@12345');
    console.log('BDE ID:             ' + bde.bde_id);
    console.log('State:              ' + stateName);
    console.log('District:           ' + districtName);
    console.log('=============================================\n');

    process.exit(0);
  } catch (err) {
    console.error('❌ Error executing script:', err);
    process.exit(1);
  }
}

run();
