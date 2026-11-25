require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const { BDEProfile, BDEKYC, BDETerritoryAssignment } = require('../modules/admin-panel/models/india_solarshop_db');

const MONGO_URI = process.env.MONGODB_URI;
console.log('Using MONGO_URI:', MONGO_URI ? 'Loaded from .env' : 'Missing, using localhost');

async function seedDemoBDE() {
  try {
    await mongoose.connect(MONGO_URI || 'mongodb://localhost:27017/solarkits_db');
    console.log('✅ Connected to DB');

    const email = 'vikram.bde@solarkits.com';
    const mobile = '9876543210';
    const bde_id = 'BDE-2026-0001';
    const password = 'Bde@Test1234';
    const password_hash = await bcrypt.hash(password, 10);

    // Clean up any other test record using the same mobile or bde_id
    await BDEProfile.deleteMany({
      $or: [
        { email },
        { mobile_number: mobile },
        { bde_id },
      ]
    });

    const bde = await BDEProfile.create({
      bde_id,
      full_name: 'Vikram Sharma',
      mobile_number: mobile,
      email: email,
      state: 'Maharashtra',
      district: 'Pune',
      status: 'active',
      password_hash: password_hash,
      is_first_login: false,
    });
    console.log('✅ Created/Re-seeded Demo BDE:', bde.email, bde.bde_id, bde.mobile_number);

    // Ensure KYC is verified
    let kyc = await BDEKYC.findOne({ bde_id: bde._id });
    if (!kyc) {
      kyc = new BDEKYC({
        bde_id: bde._id,
        aadhaar_number: '123456789012',
        aadhaar_document_url: 'https://placehold.co/600x400/png?text=Aadhaar+Proof',
        pan_number: 'ABCDE1234F',
        pan_document_url: 'https://placehold.co/600x400/png?text=PAN+Proof',
        kyc_status: 'verified',
      });
      await kyc.save();
      console.log('✅ Created verified KYC for demo BDE');
    } else {
      kyc.kyc_status = 'verified';
      kyc.aadhaar_document_url = kyc.aadhaar_document_url || 'https://placehold.co/600x400/png?text=Aadhaar+Proof';
      kyc.pan_document_url = kyc.pan_document_url || 'https://placehold.co/600x400/png?text=PAN+Proof';
      await kyc.save();
      console.log('✅ Updated KYC to verified for demo BDE');
    }

    // Ensure Territory Assignment exists
    let territory = await BDETerritoryAssignment.findOne({ bde_id: bde._id });
    if (!territory) {
      territory = new BDETerritoryAssignment({
        bde_id: bde._id,
        state_id: new mongoose.Types.ObjectId(),
        state_name: 'Maharashtra',
        assigned_districts: [{
          district_id: new mongoose.Types.ObjectId(),
          district_name: 'Pune',
          is_active: true
        }],
        assigned_by: new mongoose.Types.ObjectId(),
        assigned_by_name: 'Admin',
      });
      await territory.save();
      console.log('✅ Created Territory Assignment for demo BDE');
    }

    // Also list all existing BDE profiles in the DB to check what accounts exist
    const allBdes = await BDEProfile.find({}, 'bde_id full_name email mobile_number status');
    console.log('\n--- All BDE Accounts in DB ---');
    console.log(allBdes);

    console.log('\n=============================================');
    console.log('DEMO BDE CREDENTIALS READY FOR LOGIN:');
    console.log('Email / Identifier: vikram.bde@solarkits.com');
    console.log('Mobile Number:      9876543210');
    console.log('BDE ID:             BDE-2026-0001');
    console.log('Password:           Bde@Test1234');
    console.log('=============================================\n');

    process.exit(0);
  } catch (err) {
    console.error('Error seeding demo BDE:', err);
    process.exit(1);
  }
}

seedDemoBDE();
