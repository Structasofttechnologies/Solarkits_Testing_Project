/**
 * seed_navaj_epcs.js
 *
 * Seeds 4 realistic EPC Buyers for franchise partner:
 *   Email: navajbloch420@gmail.com
 *   Name: Bloch NAVAZ
 *   Business: SOLARKITS CLEAN ENERGY SOLUTIONS
 *
 * Usage:
 *   node src/scratch/seed_navaj_epcs.js
 */

const dns = require('dns');
dns.setServers(['8.8.8.8', '8.8.4.4', '1.1.1.1']);
require('dotenv').config();
require('../keys/config/databases');

const bcrypt = require('bcrypt');
const {
  Reseller,
  ResellerTerritory,
  EpcAccount,
  EpcResellerRelationship,
  EpcSignupRequest,
} = require('../modules/admin-panel/models/india_solarshop_db');
const { GeoLevel0, GeoLevel1, GeoLevel2 } = require('../modules/admin-panel/models/geolocation_db');

async function run() {
  try {
    console.log('\n======================================================');
    console.log('🚀 Seeding Dummy EPC Buyers for Bloch NAVAZ Account');
    console.log('======================================================\n');

    // 1. Find the Reseller
    const targetEmail = 'navajbloch420@gmail.com';
    let reseller = await Reseller.findOne({
      $or: [
        { email: new RegExp(`^${targetEmail}$`, 'i') },
        { business_name: /SOLARKITS CLEAN ENERGY/i },
        { contact_person: /NAVAZ/i },
      ],
      deleted_at: null,
    });

    if (!reseller) {
      console.log(`⚠️ Reseller with email ${targetEmail} not found, searching latest active reseller...`);
      reseller = await Reseller.findOne({ deleted_at: null }).sort({ updated_at: -1 });
    }

    if (!reseller) {
      throw new Error('No Reseller account found in database!');
    }

    console.log(`✓ Found Reseller: "${reseller.business_name}" (${reseller.email}) [ID: ${reseller._id}]`);

    // Ensure reseller is active and KYC verified
    reseller.kyc_status = 'verified';
    reseller.activation_status = 'active';
    reseller.reseller_lifecycle_status = 'active';
    reseller.is_active = true;
    await reseller.save();
    console.log('✓ Reseller status set to KYC Verified & Active');

    // 2. Resolve Geolocation
    const india = await GeoLevel0.findOne({ name: /india/i, deleted_at: null }).lean();
    let state = null;
    if (reseller.address?.state_id) {
      state = await GeoLevel1.findById(reseller.address.state_id).lean();
    }
    if (!state) {
      state = await GeoLevel1.findOne({ name: /gujarat/i, deleted_at: null }).lean() ||
              await GeoLevel1.findOne({ level_0: india?._id }).lean();
    }

    let district = null;
    if (reseller.address?.district_id) {
      district = await GeoLevel2.findById(reseller.address.district_id).lean();
    }
    if (!district && state) {
      district = await GeoLevel2.findOne({ level_1: state._id, deleted_at: null }).lean();
    }

    console.log(`✓ Resolved Location: State="${state?.name || 'Gujarat'}", District="${district?.name || 'Ahmedabad'}"`);

    // 3. Ensure Territory exists
    const territoryExists = await ResellerTerritory.findOne({ reseller_id: reseller._id, status: 'active' });
    if (!territoryExists && state) {
      await ResellerTerritory.create({
        reseller_id: reseller._id,
        country_id: india?._id,
        state_id: state._id,
        district_id: district?._id,
        territory_level: district ? 'district' : 'state',
        assignment_type: 'primary',
        source: 'plan',
        status: 'active',
      });
      console.log('✓ Created Active Reseller Territory assignment');
    }

    // 4. Dummy EPC Data Definitions
    const stateCode = state?.state_code || (state?.name?.toLowerCase().includes('gujarat') ? '24' : '27');
    const dummyEpcs = [
      {
        name: 'Suresh Patel',
        company_name: 'Patel Solar Power Systems Pvt Ltd',
        gstin: `${stateCode}AAACP1234F1Z5`,
        email: 'suresh.patel@patelsolar.in',
        whatsapp: '9825012345',
        status: 'approved',
      },
      {
        name: 'Rajesh Varma',
        company_name: 'Varma Green Energy EPC',
        gstin: `${stateCode}AABCV5678H1Z8`,
        email: 'rajesh@varmagreen.com',
        whatsapp: '9825067890',
        status: 'approved',
      },
      {
        name: 'Amit Shah',
        company_name: 'Apex Solar Technologies',
        gstin: `${stateCode}AACCA9012K1Z2`,
        email: 'amit@apexsolartech.in',
        whatsapp: '9825011223',
        status: 'approved',
      },
      {
        name: 'Dharmesh Joshi',
        company_name: 'Surya Kiran Infra Solutions',
        gstin: `${stateCode}AADCS3456M1Z4`,
        email: 'dharmesh@suryakiraninfra.com',
        whatsapp: '9825044556',
        status: 'pending',
      },
    ];

    const passwordHash = await bcrypt.hash('Password@123', 10);

    console.log('\n📦 Inserting 4 Dummy EPC Accounts...\n');

    for (const epcData of dummyEpcs) {
      // Upsert EpcAccount
      let epc = await EpcAccount.findOne({
        $or: [
          { email: epcData.email.toLowerCase() },
          { gstin: epcData.gstin },
          { whatsapp: epcData.whatsapp },
        ],
        deleted_at: null,
      });

      if (epc) {
        epc.onboarded_by_reseller_id = reseller._id;
        epc.primary_reseller_id = reseller._id;
        epc.onboarding_source = 'reseller';
        epc.reseller_assigned_date = new Date();
        epc.status = epcData.status;
        epc.gstin = epcData.gstin;
        epc.gstin_trade_name = epcData.company_name;
        epc.gstin_legal_name = epcData.company_name;
        epc.states = state ? [state._id] : [];
        epc.districts = district ? [district._id] : [];
        await epc.save();
        console.log(`  ✓ Updated existing EPC: "${epcData.company_name}" (${epcData.gstin}) -> Status: [${epcData.status.toUpperCase()}]`);
      } else {
        epc = await EpcAccount.create({
          name: epcData.name,
          email: epcData.email.toLowerCase(),
          whatsapp: epcData.whatsapp,
          password_hash: passwordHash,
          gstin: epcData.gstin,
          gstin_trade_name: epcData.company_name,
          gstin_legal_name: epcData.company_name,
          states: state ? [state._id] : [],
          districts: district ? [district._id] : [],
          status: epcData.status,
          onboarded_by_reseller_id: reseller._id,
          primary_reseller_id: reseller._id,
          onboarding_source: 'reseller',
          reseller_assigned_date: new Date(),
          is_gstin_active: true,
          gstin_verified_at: new Date(),
        });
        console.log(`  ✓ Created new EPC: "${epcData.company_name}" (${epcData.gstin}) -> Status: [${epcData.status.toUpperCase()}]`);
      }

      // Upsert EpcResellerRelationship
      const rel = await EpcResellerRelationship.findOne({ epc_id: epc._id, reseller_id: reseller._id });
      if (!rel) {
        await EpcResellerRelationship.create({
          epc_id: epc._id,
          reseller_id: reseller._id,
          gstin: epcData.gstin,
          status: 'active',
          effective_from: new Date(),
        });
      }

      // Signup request
      const signupReq = await EpcSignupRequest.findOne({ account_id: epc._id });
      if (!signupReq) {
        await EpcSignupRequest.create({
          account_id: epc._id,
          company_name: epcData.company_name,
          email: epcData.email.toLowerCase(),
          whatsapp: epcData.whatsapp,
          gstin: epcData.gstin,
          status: epcData.status,
          state_id: state?._id || null,
          onboarded_by_reseller_id: reseller._id,
          onboarding_source: 'reseller',
        });
      }
    }

    console.log('\n🎉 Successfully onboarded 4 dummy EPC Buyers under reseller:');
    console.log(`   Business: ${reseller.business_name}`);
    console.log(`   Email:    ${reseller.email}`);
    console.log(`   Contact:  ${reseller.contact_person || reseller.name}`);
    console.log('\nAll 4 EPC accounts are now visible in the Franchisee Portal under "My Buyers" (/epc-buyers)!');
  } catch (err) {
    console.error('\n❌ Seed Error:', err.message);
  }
}

run();
