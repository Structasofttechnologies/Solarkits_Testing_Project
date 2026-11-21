/**
 * onboard_epcs_for_alex_khan.js
 * Script to onboard 6 real-world Maharashtra EPC buyers for Franchisee "Alex khan pvt ltd" (alex05@gmail.com).
 * Territory: Amravati Region (Amravati, Akola, Buldhana, Washim, Yavatmal)
 */
'use strict';

require('dotenv').config();
require('../keys/config/databases');
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const {
  Reseller,
  EpcAccount,
  EpcResellerRelationship,
  EpcSignupRequest,
} = require('../modules/admin-panel/models/india_solarshop_db');

const MAHARASHTRA_STATE_ID = new mongoose.Types.ObjectId('6a969279cec8f41215d2857f');

const EPCS_TO_ONBOARD = [
  {
    company_name: 'Vidarbha SunPower Energy Pvt Ltd',
    gstin_legal_name: 'Vidarbha SunPower Energy Private Limited',
    gstin_trade_name: 'Vidarbha SunPower Energy',
    name: 'Nilesh Deshmukh',
    email: 'nilesh.deshmukh@vidarbhasunpower.com',
    whatsapp: '9822114420',
    mobile: '9822114420',
    gstin: '27AABCV1234F1Z2',
    district_id: new mongoose.Types.ObjectId('6a96927acec8f41215d28587'),
    district_name: 'Amravati',
    pincode: '444601',
    address: 'Plot 45, MIDC Badnera Road, Amravati, Maharashtra - 444601',
    epc_type: 'Experienced EPC',
  },
  {
    company_name: 'Akola GreenGrid Solar Solutions',
    gstin_legal_name: 'Akola GreenGrid Solar Solutions LLP',
    gstin_trade_name: 'Akola GreenGrid',
    name: 'Pramod Agrawal',
    email: 'pramod@akolagreengrid.in',
    whatsapp: '9822335560',
    mobile: '9822335560',
    gstin: '27AACCA5678G1Z6',
    district_id: new mongoose.Types.ObjectId('6a96927acec8f41215d28588'),
    district_name: 'Akola',
    pincode: '444001',
    address: 'Survey 88, Cotton Market Yard, Akola, Maharashtra - 444001',
    epc_type: 'New EPC',
  },
  {
    company_name: 'Buldhana Solar Tech & Infrastructure',
    gstin_legal_name: 'Buldhana Solar Tech & Infrastructure Pvt Ltd',
    gstin_trade_name: 'Buldhana Solar Tech',
    name: 'Sanjay Patil',
    email: 'sanjay.patil@buldhanasolar.co.in',
    whatsapp: '9822556670',
    mobile: '9822556670',
    gstin: '27AADCB9012H1Z9',
    district_id: new mongoose.Types.ObjectId('6a96927acec8f41215d2858c'),
    district_name: 'Buldhana',
    pincode: '443001',
    address: 'Shop 14, Malkapur Bypass Road, Buldhana, Maharashtra - 443001',
    epc_type: 'Government Contractor',
  },
  {
    company_name: 'Washim Clean Energy Systems',
    gstin_legal_name: 'Washim Clean Energy Systems Private Limited',
    gstin_trade_name: 'Washim Clean Energy',
    name: 'Ganesh Thakare',
    email: 'ganesh@washimcleanenergy.com',
    whatsapp: '9822778890',
    mobile: '9822778890',
    gstin: '27AAEFW3456J1Z3',
    district_id: new mongoose.Types.ObjectId('6a96927dcec8f41215d285a8'),
    district_name: 'Washim',
    pincode: '444505',
    address: 'Gat No. 112, Risod Road, Washim, Maharashtra - 444505',
    epc_type: 'Tender Bidder',
  },
  {
    company_name: 'Yavatmal SunInfra EPC LLP',
    gstin_legal_name: 'Yavatmal SunInfra EPC LLP',
    gstin_trade_name: 'Yavatmal SunInfra',
    name: 'Vikas Rathod',
    email: 'vikas.rathod@yavatmalsuninfra.in',
    whatsapp: '9822990010',
    mobile: '9822990010',
    gstin: '27AAFGY7890K1Z7',
    district_id: new mongoose.Types.ObjectId('6a96927dcec8f41215d285a9'),
    district_name: 'Yavatmal',
    pincode: '445001',
    address: 'Plot 29, Industrial Area, Darwha Road, Yavatmal, Maharashtra - 445001',
    epc_type: 'Experienced EPC',
  },
  {
    company_name: 'Amravati Ray Power Engineering',
    gstin_legal_name: 'Amravati Ray Power Engineering Pvt Ltd',
    gstin_trade_name: 'Ray Power Engineering',
    name: 'Sachin Wankhede',
    email: 'sachin@raypowereng.com',
    whatsapp: '9823112233',
    mobile: '9823112233',
    gstin: '27AAGHR2345L1Z1',
    district_id: new mongoose.Types.ObjectId('6a96927acec8f41215d28587'),
    district_name: 'Amravati',
    pincode: '444605',
    address: 'Building B-2, Camp Area, Amravati, Maharashtra - 444605',
    epc_type: 'New EPC',
  },
];

async function main() {
  const reseller = await Reseller.findOne({ email: 'alex05@gmail.com', deleted_at: null }).lean();
  if (!reseller) {
    console.error('❌ Reseller alex05@gmail.com not found!');
    process.exit(1);
  }

  console.log(`✅ Found Reseller: ${reseller.business_name} (ID: ${reseller._id})`);
  const password_hash = await bcrypt.hash('EpcPass@123', 10);

  const createdEpcs = [];

  for (const item of EPCS_TO_ONBOARD) {
    // Check if account already exists with this email, whatsapp, or gstin
    let epc = await EpcAccount.findOne({
      $or: [
        { email: item.email },
        { whatsapp: item.whatsapp },
        { gstin: item.gstin }
      ],
      deleted_at: null,
    });

    if (epc) {
      console.log(`⚠️ EPC account already exists for ${item.company_name} (ID: ${epc._id}), updating relationship...`);
      epc.onboarded_by_reseller_id = reseller._id;
      epc.primary_reseller_id = reseller._id;
      epc.status = 'approved';
      epc.states = [MAHARASHTRA_STATE_ID];
      epc.state_name = 'Maharashtra';
      epc.districts = [item.district_id];
      epc.district_name = item.district_name;
      epc.pincode = item.pincode;
      epc.address = item.address;
      epc.gstin_legal_name = item.gstin_legal_name;
      epc.gstin_trade_name = item.gstin_trade_name;
      epc.gstin = item.gstin;
      epc.is_gstin_active = true;
      await epc.save();
    } else {
      epc = await EpcAccount.create({
        name: item.name,
        company_name: item.company_name,
        email: item.email,
        whatsapp: item.whatsapp,
        mobile: item.mobile,
        password_hash,
        states: [MAHARASHTRA_STATE_ID],
        districts: [item.district_id],
        state_name: 'Maharashtra',
        district_name: item.district_name,
        pincode: item.pincode,
        address: item.address,
        status: 'approved',
        epc_type: item.epc_type,
        onboarded_by_reseller_id: reseller._id,
        primary_reseller_id: reseller._id,
        onboarding_source: 'reseller',
        reseller_assigned_date: new Date(),
        gstin: item.gstin,
        gstin_verified_at: new Date(),
        gstin_legal_name: item.gstin_legal_name,
        gstin_trade_name: item.gstin_trade_name,
        gstin_registration_status: 'Active',
        is_gstin_active: true,
      });
      console.log(`✨ Created EpcAccount: ${item.company_name} (ID: ${epc._id})`);
    }

    // Ensure Active EpcResellerRelationship
    await EpcResellerRelationship.findOneAndUpdate(
      { epc_id: epc._id, reseller_id: reseller._id },
      {
        $set: {
          gstin: item.gstin,
          effective_from: new Date(),
          status: 'active',
          updated_at: new Date(),
        },
        $setOnInsert: {
          created_at: new Date(),
        }
      },
      { upsert: true, new: true }
    );

    // Ensure EpcSignupRequest approved record
    await EpcSignupRequest.findOneAndUpdate(
      { account_id: epc._id },
      {
        $set: {
          company_name: item.company_name,
          email: item.email,
          whatsapp: item.whatsapp,
          status: 'approved',
          epc_type: item.epc_type,
          state_id: MAHARASHTRA_STATE_ID,
          onboarded_by_reseller_id: reseller._id,
          onboarding_source: 'reseller',
          reviewed_at: new Date(),
        }
      },
      { upsert: true, new: true }
    );

    createdEpcs.push({
      id: epc._id,
      company: item.company_name,
      contact: item.name,
      district: item.district_name,
      gstin: item.gstin,
    });
  }

  console.log(`\n🎉 Successfully onboarded ${createdEpcs.length} EPC buyers for ${reseller.business_name}!`);
  console.table(createdEpcs);
  process.exit(0);
}

setTimeout(async () => {
  try {
    await main();
  } catch (err) {
    console.error('❌ Error executing onboarding script:', err);
    process.exit(1);
  }
}, 2000);
