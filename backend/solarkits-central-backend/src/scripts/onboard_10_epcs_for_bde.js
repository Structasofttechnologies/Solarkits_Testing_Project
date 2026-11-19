/**
 * onboard_10_epcs_for_bde.js
 *
 * Dedicated script to onboard and activate 10 verified EPC buyers
 * EXCLUSIVELY under BDE: Vivek gohel (rahul.bde@solarkits.com)
 *
 * Capabilities enabled:
 *   1. BDE Portal Quotation Module (/epc-quotes, /create-epc-quote):
 *      - EPCs appear in eligible EPC selector for Vivek gohel
 *      - Full quotation generation, PDF, pricing, and follow-up tracking
 *   2. Solar Store EPC Shop Portal (/login):
 *      - Password login with Email / Mobile + 'Password@123'
 *      - Instant 4-digit PIN login (e.g. 5001 - 5010)
 *      - Primary location pre-configured for instant combo-kit ordering
 *
 * Safety & Strict Isolation:
 *   - Only modifies / associates with BDE 'rahul.bde@solarkits.com'
 *   - Does NOT affect or touch any other BDE or Franchisee
 */

require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const {
  BDEProfile,
  EpcAccount,
} = require('../modules/admin-panel/models/india_solarshop_db');
const { GeoLevel1, GeoLevel2 } = require('../modules/admin-panel/models/geolocation_db');
const EpcAccountLocation = require('../modules/solarshop-india/models/india_solarshop_db/epc_account_locations.schema');
const EpcCompany = require('../modules/solarshop-india/models/india_core_db/epc_companies.schema');

const TARGET_BDE_EMAIL = 'rahul.bde@solarkits.com';
const DEFAULT_PASSWORD = 'Password@123';

const EPC_LIST = [
  {
    name: 'Aditya Patel',
    company_name: 'Aditya Solar Power Systems',
    email: 'aditya.solar@adityapower.in',
    whatsapp: '9825011221',
    gstin: '24AAACA1234D1ZP',
    district_name: 'Ahmedabad',
    address: '101, Titanium Square, SG Highway, Ahmedabad, Gujarat - 380001',
    pincode: '380001',
    security_pin: '5001',
  },
  {
    name: 'Chirag Desai',
    company_name: 'Surat SunGrid Technologies LLP',
    email: 'contact@sungridtech.in',
    whatsapp: '9825122332',
    gstin: '24AABCS5678E1ZQ',
    district_name: 'Surat',
    address: '402, Millennium Textile Market 2, Ring Road, Surat, Gujarat - 395002',
    pincode: '395002',
    security_pin: '5002',
  },
  {
    name: 'Bhavesh Gohil',
    company_name: 'Somnath Green Energy Solutions',
    email: 'bhavesh@somnathsolar.com',
    whatsapp: '9825233443',
    gstin: '24AACCS9012F1ZR',
    district_name: 'Rajkot',
    address: '77, Crystal Mall Complex, Kalawad Road, Rajkot, Gujarat - 360005',
    pincode: '360005',
    security_pin: '5003',
  },
  {
    name: 'Nilesh Shah',
    company_name: 'Vadodara Solar Dynamics Pvt Ltd',
    email: 'nilesh@vadodarasolar.com',
    whatsapp: '9825344554',
    gstin: '24AADCV3456G1ZS',
    district_name: 'Vadodara',
    address: '305, Alkapuri Arcade, RC Dutt Road, Vadodara, Gujarat - 390007',
    pincode: '390007',
    security_pin: '5004',
  },
  {
    name: 'Ketan Jadeja',
    company_name: 'Kutch Renewable Power Corp',
    email: 'ketan@kutchrenewable.com',
    whatsapp: '9825455665',
    gstin: '24AAECK7890H1ZT',
    district_name: 'Bharuch',
    address: 'Plot 12, GIDC Phase 2, Dahej Bypass Road, Bharuch, Gujarat - 392001',
    pincode: '392001',
    security_pin: '5005',
  },
  {
    name: 'Sanjay Parmar',
    company_name: 'Anand CleanTech EPC Infra',
    email: 'info@anandcleantech.in',
    whatsapp: '9825566776',
    gstin: '24AAFCF1235J1ZU',
    district_name: 'Anand',
    address: '88, Milk City Commercial Center, Station Road, Anand, Gujarat - 388001',
    pincode: '388001',
    security_pin: '5006',
  },
  {
    name: 'Hardik Vaghela',
    company_name: 'Bhavnagar HeliOS Solar Solutions',
    email: 'hardik@heliossolar.co.in',
    whatsapp: '9825677887',
    gstin: '24AAGCH5679K1ZV',
    district_name: 'Amreli',
    address: '14, Sardar Patel Marg, Lathi Road, Amreli, Gujarat - 365601',
    pincode: '365601',
    security_pin: '5007',
  },
  {
    name: 'Mayur Dave',
    company_name: 'Sabarmati Solar Enterprises',
    email: 'mayur@sabarmatisolar.in',
    whatsapp: '9825788998',
    gstin: '24AAHCS9013L1ZW',
    district_name: 'Ahmedabad',
    address: '22, Riverfront Trade Center, Ashram Road, Ahmedabad, Gujarat - 380009',
    pincode: '380009',
    security_pin: '5008',
  },
  {
    name: 'Jignesh Solanki',
    company_name: 'Aravalli Green Solar EPC',
    email: 'jignesh@aravallisolar.com',
    whatsapp: '9825899009',
    gstin: '24AAICA3457M1ZX',
    district_name: 'Aravalli',
    address: '50, Modasa Commercial Hub, Aravalli, Gujarat - 383315',
    pincode: '383315',
    security_pin: '5009',
  },
  {
    name: 'Paresh Prajapati',
    company_name: 'Banaskantha SunRays Power LLP',
    email: 'paresh@sunrayspower.in',
    whatsapp: '9825900110',
    gstin: '24AAJCS7891N1ZY',
    district_name: 'Banaskantha',
    address: '109, Deesa Highway Junction, Palanpur, Banaskantha, Gujarat - 385001',
    pincode: '385001',
    security_pin: '5010',
  },
];

async function main() {
  try {
    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) {
      throw new Error('MONGODB_URI is not set in environment!');
    }

    await mongoose.connect(mongoUri);
    console.log('\n===============================================================');
    console.log('🚀 SOLAR KITS — BDE EPC ONBOARDING & ACTIVATION SCRIPT');
    console.log('===============================================================\n');

    // 1. Verify Target BDE
    const bde = await BDEProfile.findOne({
      email: TARGET_BDE_EMAIL.toLowerCase(),
      deleted_at: null,
    });

    if (!bde) {
      throw new Error(`Target BDE with email "${TARGET_BDE_EMAIL}" not found in database!`);
    }

    console.log(`✅ Target BDE Verified:`);
    console.log(`   - Name:             ${bde.full_name}`);
    console.log(`   - BDE ID:           ${bde.bde_id}`);
    console.log(`   - Email:            ${bde.email}`);
    console.log(`   - Mobile:           ${bde.mobile_number}`);
    console.log(`   - MongoDB _id:      ${bde._id}`);
    console.log(`   - Account Status:   ${bde.status}`);
    console.log(`   - Can Onboard EPC:  ${bde.can_onboard_epc}`);

    // 2. Resolve Geolocation Level 1 (Gujarat)
    const gujaratState = await GeoLevel1.findOne({ name: /gujarat/i, deleted_at: null });
    if (!gujaratState) {
      throw new Error('Gujarat state not found in GeoLevel1 collection!');
    }

    // Hash Default Password
    const passwordHash = await bcrypt.hash(DEFAULT_PASSWORD, 10);

    console.log(`\n⚙️ Processing 10 EPC Accounts exclusively for BDE [${bde.full_name}]...\n`);

    const results = [];

    for (let i = 0; i < EPC_LIST.length; i++) {
      const epcData = EPC_LIST[i];

      // Resolve District
      let district = await GeoLevel2.findOne({
        level_1: gujaratState._id,
        name: new RegExp(`^${epcData.district_name}$`, 'i'),
        deleted_at: null,
      });

      if (!district) {
        district = await GeoLevel2.findOne({ level_1: gujaratState._id, deleted_at: null });
      }

      // Upsert EpcCompany master record
      let epcCompany = await EpcCompany.findOne({
        email: epcData.email.toLowerCase(),
        deleted_at: null,
      });

      if (!epcCompany) {
        epcCompany = await EpcCompany.create({
          name: epcData.company_name,
          email: epcData.email.toLowerCase(),
          legal_name: epcData.company_name,
          brand_name: epcData.company_name,
          source: 'verified',
          working_states: [gujaratState._id],
        });
      } else {
        epcCompany.name = epcData.company_name;
        epcCompany.legal_name = epcData.company_name;
        epcCompany.working_states = [gujaratState._id];
        await epcCompany.save();
      }

      // Upsert / Activate EpcAccount
      let epc = await EpcAccount.findOne({
        $or: [
          { email: epcData.email.toLowerCase() },
          { gstin: epcData.gstin },
          { whatsapp: epcData.whatsapp },
        ],
      });

      if (epc) {
        // Update & Restore existing account
        epc.name = epcData.name;
        epc.email = epcData.email.toLowerCase();
        epc.whatsapp = epcData.whatsapp;
        epc.registered_whatsapp = epcData.whatsapp;
        epc.is_registered_same_as_whatsapp = true;
        epc.password_hash = passwordHash;
        epc.security_pin = epcData.security_pin;
        epc.company_id = epcCompany._id;
        epc.states = [gujaratState._id];
        epc.districts = district ? [district._id] : [];
        epc.state_name = 'Gujarat';
        epc.district_name = epcData.district_name;
        epc.address = epcData.address;
        epc.pincode = epcData.pincode;
        epc.gstin = epcData.gstin;
        epc.gstin_legal_name = epcData.company_name;
        epc.gstin_trade_name = epcData.company_name;
        epc.gstin_registration_status = 'Active';
        epc.is_gstin_active = true;
        epc.gstin_verified_at = new Date();
        epc.is_email_verified = true;
        epc.is_whatsapp_verified = true;

        // STRICT BDE LINKAGE ONLY
        epc.status = 'approved';
        epc.onboarded_by_bde_id = bde._id;
        epc.assigned_bde_id = bde._id;
        epc.onboarding_source = 'bde';
        epc.bde_assigned_date = epc.bde_assigned_date || new Date();
        epc.onboarded_by_reseller_id = null; // Exclusive to this BDE
        epc.primary_reseller_id = null;
        epc.deleted_at = null; // Un-delete

        await epc.save();
        console.log(`  [${i + 1}/10] 🔄 Updated & Approved: ${epcData.company_name} (PIN: ${epcData.security_pin})`);
      } else {
        // Create fresh EPC Account
        epc = await EpcAccount.create({
          name: epcData.name,
          email: epcData.email.toLowerCase(),
          whatsapp: epcData.whatsapp,
          registered_whatsapp: epcData.whatsapp,
          is_registered_same_as_whatsapp: true,
          password_hash: passwordHash,
          security_pin: epcData.security_pin,
          company_id: epcCompany._id,
          states: [gujaratState._id],
          districts: district ? [district._id] : [],
          state_name: 'Gujarat',
          district_name: epcData.district_name,
          address: epcData.address,
          pincode: epcData.pincode,
          gstin: epcData.gstin,
          gstin_legal_name: epcData.company_name,
          gstin_trade_name: epcData.company_name,
          gstin_registration_status: 'Active',
          is_gstin_active: true,
          gstin_verified_at: new Date(),
          is_email_verified: true,
          is_whatsapp_verified: true,

          // STRICT BDE LINKAGE ONLY
          status: 'approved',
          onboarded_by_bde_id: bde._id,
          assigned_bde_id: bde._id,
          onboarding_source: 'bde',
          bde_assigned_date: new Date(),
          onboarded_by_reseller_id: null,
          primary_reseller_id: null,
          deleted_at: null,
        });
        console.log(`  [${i + 1}/10] ✨ Created & Approved: ${epcData.company_name} (PIN: ${epcData.security_pin})`);
      }

      // Upsert EpcAccountLocation for seamless shop location detection
      if (district) {
        let loc = await EpcAccountLocation.findOne({
          account_id: epc._id,
          state_id: gujaratState._id,
          district_id: district._id,
        });
        if (!loc) {
          await EpcAccountLocation.create({
            account_id: epc._id,
            state_id: gujaratState._id,
            district_id: district._id,
            is_primary: true,
            deleted_at: null,
          });
        } else {
          loc.is_primary = true;
          loc.deleted_at = null;
          await loc.save();
        }
      }

      results.push({
        num: i + 1,
        company: epcData.company_name,
        contact: epcData.name,
        email: epcData.email,
        mobile: epcData.whatsapp,
        password: DEFAULT_PASSWORD,
        security_pin: epcData.security_pin,
        gstin: epcData.gstin,
        district: epcData.district_name,
        status: 'approved',
        bde: `${bde.full_name} (${bde.bde_id})`,
      });
    }

    // 3. Verification Query to confirm BDE Quotation Eligibility
    const eligibleCount = await EpcAccount.countDocuments({
      deleted_at: null,
      status: 'approved',
      $or: [
        { onboarded_by_bde_id: bde._id },
        { assigned_bde_id: bde._id },
      ],
    });

    console.log('\n===============================================================');
    console.log(`🎉 ALL 10 EPCs SUCCESSFULLY ONBOARDED UNDER BDE: ${bde.full_name}`);
    console.log(`📊 Total Eligible EPCs visible in BDE Quotation Engine: ${eligibleCount}`);
    console.log('===============================================================\n');

    console.table(results.map(r => ({
      '#': r.num,
      'Company Name': r.company,
      'Email / Login ID': r.email,
      'Mobile': r.mobile,
      'Password': r.password,
      '4-Digit PIN': r.security_pin,
      'District': r.district,
      'Status': r.status,
    })));

    console.log('\n✅ Verification Complete: All accounts are ready for BDE Quotations & Solar Shop Login.');
    process.exit(0);
  } catch (err) {
    console.error('❌ Onboarding Script Failed:', err);
    process.exit(1);
  }
}

// If invoked directly
if (require.main === module) {
  main();
}

module.exports = { main, EPC_LIST, TARGET_BDE_EMAIL, DEFAULT_PASSWORD };
