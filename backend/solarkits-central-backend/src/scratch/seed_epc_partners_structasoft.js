require('dotenv').config();
const bcrypt = require('bcrypt');
const mongoose = require('mongoose');
const { india_solarshop_db, india_core_db } = require('../modules/solarshop-india/config/databases');

async function seedEpcs() {
  await new Promise(r => setTimeout(r, 1500));

  const {
    Reseller,
    EpcAccount,
    EpcResellerRelationship,
    EpcSignupRequest,
  } = require('../modules/admin-panel/models/india_solarshop_db');
  const EpcAccountLocation = require('../modules/solarshop-india/models/india_solarshop_db/epc_account_locations.schema');
  const { GeoLevel0, GeoLevel1, GeoLevel2 } = require('../modules/admin-panel/models/geolocation_db');

  console.log('======================================================');
  console.log('🚀 Onboarding 5 EPC Partners for Franchisee Partner');
  console.log('   Target: structasoftadmin@gmail.com');
  console.log('======================================================\n');

  const reseller = await Reseller.findOne({
    email: /structasoftadmin@gmail.com/i,
    deleted_at: null,
  });

  if (!reseller) {
    throw new Error('Reseller structasoftadmin@gmail.com not found!');
  }

  console.log(`✓ Found Reseller: "${reseller.business_name}" (${reseller.email}) [ID: ${reseller._id}]`);

  // Ensure Reseller is fully active
  reseller.kyc_status = 'verified';
  reseller.activation_status = 'active';
  reseller.reseller_lifecycle_status = 'active';
  reseller.is_active = true;
  await reseller.save();

  // Resolve State & District
  let stateId = reseller.address?.state_id;
  let districtId = reseller.address?.district_id;

  if (!stateId) {
    const defaultState = await GeoLevel1.findOne({ name: /maharashtra/i }).lean() || await GeoLevel1.findOne({}).lean();
    stateId = defaultState?._id;
  }
  if (!districtId && stateId) {
    const defaultDistrict = await GeoLevel2.findOne({ level_1: stateId }).lean() || await GeoLevel2.findOne({}).lean();
    districtId = defaultDistrict?._id;
  }

  console.log(`✓ Territory resolved: State ID: ${stateId}, District ID: ${districtId}`);

  const epcList = [
    {
      name: 'Rameshwar Shinde',
      company_name: 'Apex Solar EPC Solutions Pvt Ltd',
      gstin: '27AAACA1234A1Z1',
      email: 'epc.apex@solarkits.com',
      whatsapp: '9822011221',
      status: 'approved',
    },
    {
      name: 'Vikram Deshmukh',
      company_name: 'Surya Shakti Green Energy EPC',
      gstin: '27AAACB2345B1Z2',
      email: 'epc.suryashakti@solarkits.com',
      whatsapp: '9822022332',
      status: 'approved',
    },
    {
      name: 'Nitin Kulkarni',
      company_name: 'Maha Infra Solar Technologies',
      gstin: '27AAACC3456C1Z3',
      email: 'epc.mahainfra@solarkits.com',
      whatsapp: '9822033443',
      status: 'approved',
    },
    {
      name: 'Pooja Sawant',
      company_name: 'SunNovate Rooftop EPC Projects',
      gstin: '27AAACD4567D1Z4',
      email: 'epc.sunnovate@solarkits.com',
      whatsapp: '9822044554',
      status: 'approved',
    },
    {
      name: 'Anand Gaikwad',
      company_name: 'Urja Grid Clean Power Systems',
      gstin: '27AAACE5678E1Z5',
      email: 'epc.urjagrid@solarkits.com',
      whatsapp: '9822055665',
      status: 'approved',
    },
  ];

  const defaultPassword = 'Password@123';
  const passwordHash = await bcrypt.hash(defaultPassword, 10);

  console.log('\n📦 Creating & linking 5 EPC Partner accounts...\n');

  for (const epcData of epcList) {
    let epc = await EpcAccount.findOne({
      $or: [
        { email: epcData.email.toLowerCase() },
        { gstin: epcData.gstin },
        { whatsapp: epcData.whatsapp },
      ],
      deleted_at: null,
    });

    if (epc) {
      epc.name = epcData.name;
      epc.email = epcData.email.toLowerCase();
      epc.whatsapp = epcData.whatsapp;
      epc.password_hash = passwordHash;
      epc.gstin = epcData.gstin;
      epc.gstin_trade_name = epcData.company_name;
      epc.gstin_legal_name = epcData.company_name;
      epc.states = stateId ? [stateId] : [];
      epc.districts = districtId ? [districtId] : [];
      epc.status = epcData.status;
      epc.onboarded_by_reseller_id = reseller._id;
      epc.primary_reseller_id = reseller._id;
      epc.onboarding_source = 'reseller';
      epc.reseller_assigned_date = new Date();
      epc.is_email_verified = true;
      epc.is_whatsapp_verified = true;
      epc.is_gstin_active = true;
      epc.gstin_verified_at = new Date();
      await epc.save();
      console.log(`  ✓ Updated EPC Partner: "${epcData.company_name}" (${epcData.email})`);
    } else {
      epc = await EpcAccount.create({
        name: epcData.name,
        email: epcData.email.toLowerCase(),
        whatsapp: epcData.whatsapp,
        password_hash: passwordHash,
        gstin: epcData.gstin,
        gstin_trade_name: epcData.company_name,
        gstin_legal_name: epcData.company_name,
        states: stateId ? [stateId] : [],
        districts: districtId ? [districtId] : [],
        status: epcData.status,
        onboarded_by_reseller_id: reseller._id,
        primary_reseller_id: reseller._id,
        onboarding_source: 'reseller',
        reseller_assigned_date: new Date(),
        is_email_verified: true,
        is_whatsapp_verified: true,
        is_gstin_active: true,
        gstin_verified_at: new Date(),
      });
      console.log(`  ✓ Created EPC Partner: "${epcData.company_name}" (${epcData.email})`);
    }

    // 1. EpcResellerRelationship
    await EpcResellerRelationship.findOneAndUpdate(
      { epc_id: epc._id, reseller_id: reseller._id },
      {
        epc_id: epc._id,
        reseller_id: reseller._id,
        gstin: epcData.gstin,
        status: 'active',
        effective_from: new Date(),
      },
      { upsert: true, new: true }
    );

    // 2. EpcSignupRequest
    await EpcSignupRequest.findOneAndUpdate(
      { account_id: epc._id },
      {
        account_id: epc._id,
        company_name: epcData.company_name,
        email: epcData.email.toLowerCase(),
        whatsapp: epcData.whatsapp,
        gstin: epcData.gstin,
        status: epcData.status,
        state_id: stateId,
        district_id: districtId,
        onboarded_by_reseller_id: reseller._id,
        onboarding_source: 'reseller',
        assigned_reseller_id: reseller._id,
      },
      { upsert: true, new: true }
    );

    // 3. EpcAccountLocation
    if (stateId && districtId) {
      await EpcAccountLocation.findOneAndUpdate(
        { account_id: epc._id, is_primary: true },
        {
          account_id: epc._id,
          state_id: stateId,
          district_id: districtId,
          is_primary: true,
          address_line: 'Industrial Area, Pune',
          pincode: '411001',
          deleted_at: null,
        },
        { upsert: true, new: true }
      );
    }
  }

  console.log('\n======================================================');
  console.log('🎉 5 EPC Partners Successfully Onboarded!');
  console.log('   Visible in Franchisee Portal -> "My Buyers" (/epc-buyers)');
  console.log('   Ready for login in Solar Store / EPC Portal!');
  console.log('======================================================\n');

  process.exit(0);
}

seedEpcs().catch((err) => {
  console.error('❌ Error seeding EPC partners:', err);
  process.exit(1);
});
