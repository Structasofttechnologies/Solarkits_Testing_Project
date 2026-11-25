/**
 * seed_structasoft_reseller.js
 *
 * Seeds a reseller with the requested credentials:
 *   - Email: structasoftadmin@gmail.com
 *   - Password: structasoftadmin@gmail.com
 *
 * Sets all statuses to active/verified so the user can log in and use the dashboard instantly.
 *
 * Usage:
 *   node src/scratch/seed_structasoft_reseller.js
 */

const dns = require('dns');
dns.setServers(['8.8.8.8', '8.8.4.4', '1.1.1.1']);
require('dotenv').config();
require('../keys/config/databases');

const bcrypt = require('bcrypt');
const { ResellerType, Reseller, ResellerPlan, ResellerWallet } = require('../modules/admin-panel/models/india_solarshop_db');
const { GeoLevel0, GeoLevel1, GeoLevel2 } = require('../modules/admin-panel/models/geolocation_db');

async function seed() {
  try {
    console.log('\n🌱 Seeding Structasoft Admin Reseller account...\n');

    // 1. Get Commission Based Reseller Type
    const commissionType = await ResellerType.findOne({ commercial_mode: 'commission', deleted_at: null });
    if (!commissionType) {
      throw new Error('Commission Based Reseller Type not found. Run seed_reseller_types_and_resellers.js first!');
    }

    // 2. Get Plan
    const plan = await ResellerPlan.findOne({ slug: 'commission-starter-plan', deleted_at: null });

    // 3. Find India Geo IDs
    const india = await GeoLevel0.findOne({ name: /india/i, deleted_at: null }).lean();
    const indiaState = india ? await GeoLevel1.findOne({ level_0: india._id }).lean() : null;
    const indiaDistrict = indiaState ? await GeoLevel2.findOne({ level_1: indiaState._id }).lean() : null;

    // 4. Create Structasoft Reseller
    const email = 'structasoftadmin@gmail.com';
    const password = 'structasoftadmin@gmail.com';
    const passwordHash = await bcrypt.hash(password, 10);

    const existing = await Reseller.findOne({ email, deleted_at: null });
    if (existing) {
      // Just update password and activate it
      existing.password_hash = passwordHash;
      existing.kyc_status = 'verified';
      existing.reseller_lifecycle_status = 'active';
      existing.agreement_status = 'signed';
      existing.activation_status = 'active';
      existing.is_email_verified = true;
      existing.is_mobile_verified = true;
      existing.is_active = true;
      await existing.save();

      console.log(`  ✓ Updated existing reseller account: ${email}`);
    } else {
      const resellerData = {
        business_name: 'Structasoft Admin Reseller',
        gst_number: '27AAPCS1642Q1ZX',
        pan_number: 'AAPCS1642Q',
        mobile: '9900000003',
        email: email,
        password_hash: passwordHash,
        contact_person: 'Ravi Harsoda',
        commercial_mode: 'commission',
        reseller_type_id: commissionType._id,
        plan_subscription_id: null,
        kyc_status: 'verified',
        reseller_lifecycle_status: 'active',
        agreement_status: 'signed',
        activation_status: 'active',
        is_email_verified: true,
        is_mobile_verified: true,
        is_active: true,
        deleted_at: null,
        address: {
          line: 'Structasoft HQ, India',
          country_id: india?._id || null,
          state_id: indiaState?._id || null,
          district_id: indiaDistrict?._id || null,
          city: 'Rajkot',
          pincode: '360005',
        },
      };

      const created = await Reseller.create(resellerData);
      console.log(`  ✓ Created Reseller: "${created.business_name}"`);
      console.log(`       Email        : ${created.email}`);
      console.log(`       Password     : ${password}`);

      // Create a default wallet for this reseller
      const walletExists = await ResellerWallet.findOne({ reseller_id: created._id });
      if (!walletExists) {
        await ResellerWallet.create({
          reseller_id: created._id,
          available_balance: 0,
          pending_balance: 0,
          total_earned: 0,
          total_withdrawn: 0,
          available_balance_paise: 0,
          pending_balance_paise: 0,
          total_earned_paise: 0,
          total_withdrawn_paise: 0,
          tds_deducted_paise: 0,
          tcs_deducted_paise: 0,
          currency: 'INR',
          status: 'active',
        });
        console.log(`       Wallet       : ✓ Initialized (₹0 balance)`);
      }
    }

    console.log('\n✅ Seed completed successfully. You can now log in.');
    process.exit(0);
  } catch (err) {
    console.error('\n❌ Seeder Error:', err.message);
    process.exit(1);
  }
}

seed();
