/**
 * seed_reseller_types_and_resellers.js
 *
 * Seeds:
 *   1. Two reseller types:
 *      - "Commission Based Reseller"  (commercial_mode: commission)
 *      - "Dealer Based Reseller"      (commercial_mode: dealer)
 *
 *   2. One sample reseller per type (for testing/demo purposes):
 *      - Commission reseller linked to commission type + a basic plan
 *      - Dealer reseller linked to dealer type + a basic plan
 *
 * Usage:
 *   node src/scratch/seed_reseller_types_and_resellers.js
 */

const dns = require('dns');
dns.setServers(['8.8.8.8', '8.8.4.4', '1.1.1.1']);
require('dotenv').config();
require('../keys/config/databases');

const bcrypt = require('bcrypt');
const { ResellerType, Reseller, ResellerPlan, ResellerWallet } = require('../modules/admin-panel/models/india_solarshop_db');
const { GeoLevel0, GeoLevel1, GeoLevel2 } = require('../modules/admin-panel/models/geolocation_db');

// ─── helpers ──────────────────────────────────────────────────────────────────
const slugify = (str) =>
  str.toLowerCase().trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/^-+|-+$/g, '');

async function seed() {
  try {
    console.log('\n🌱 Starting Reseller Types & Sample Resellers Seeder...\n');

    // ── 1. SEED RESELLER TYPES ─────────────────────────────────────────────────
    console.log('📋 Step 1: Seeding Reseller Types...');

    const typeDefs = [
      {
        name: 'Commission Based Reseller',
        commercial_mode: 'commission',
        description:
          'Reseller earns a commission on orders placed by their linked EPC buyers. ' +
          'No upfront product purchase required. Commission percentage is configured per plan.',
        sort_order: 1,
      },
      {
        name: 'Dealer Based Reseller',
        commercial_mode: 'dealer',
        description:
          'Reseller purchases solar kits at dealer/margin pricing and resells them independently. ' +
          'Margin percentage is configured per combo kit. Reseller bears inventory risk.',
        sort_order: 2,
      },
    ];

    const seededTypes = {};
    for (const typeDef of typeDefs) {
      const slug = slugify(typeDef.name);
      const existing = await ResellerType.findOne({ slug, deleted_at: null });
      if (existing) {
        console.log(`  ⚠️  Type already exists: "${typeDef.name}" (skipping)`);
        seededTypes[typeDef.commercial_mode] = existing;
        continue;
      }
      const created = await ResellerType.create({
        name: typeDef.name,
        slug,
        commercial_mode: typeDef.commercial_mode,
        description: typeDef.description,
        sort_order: typeDef.sort_order,
        is_active: true,
        deleted_at: null,
      });
      console.log(`  ✓ Created: "${created.name}" [${created.commercial_mode}] — ID: ${created._id}`);
      seededTypes[typeDef.commercial_mode] = created;
    }

    // ── 2. SEED BASE PLANS (needed for reseller accounts) ──────────────────────
    console.log('\n📋 Step 2: Seeding Base Plans (if missing)...');

    const planDefs = [
      {
        name: 'Commission Starter Plan',
        slug: 'commission-starter-plan',
        territory_level: 'district',
        one_time_fee: 0,
        currency: 'INR',
        validity_value: 1,
        validity_unit: 'years',
        allowed_territories_count: 2,
        description: 'Default starter plan for Commission Based Resellers. Covers 2 districts, 1 year.',
        sort_order: 1,
      },
      {
        name: 'Dealer Starter Plan',
        slug: 'dealer-starter-plan',
        territory_level: 'district',
        one_time_fee: 5000,
        currency: 'INR',
        validity_value: 1,
        validity_unit: 'years',
        allowed_territories_count: 2,
        description: 'Default starter plan for Dealer Based Resellers. Covers 2 districts, 1 year. One-time fee ₹5,000.',
        sort_order: 2,
      },
    ];

    const seededPlans = {};
    for (const planDef of planDefs) {
      const existing = await ResellerPlan.findOne({ slug: planDef.slug, deleted_at: null });
      if (existing) {
        console.log(`  ⚠️  Plan already exists: "${planDef.name}" (skipping)`);
        seededPlans[planDef.slug] = existing;
        continue;
      }
      const created = await ResellerPlan.create({ ...planDef, is_active: true, deleted_at: null });
      console.log(`  ✓ Created Plan: "${created.name}" — ID: ${created._id}`);
      seededPlans[planDef.slug] = created;
    }

    // ── 3. LOOK UP INDIA GEO IDs ───────────────────────────────────────────────
    console.log('\n🌍 Step 3: Looking up India geolocation IDs...');
    const india = await GeoLevel0.findOne({ name: /india/i, deleted_at: null }).lean();
    const indiaState = india
      ? await GeoLevel1.findOne({ level_0: india._id }).lean()
      : null;
    const indiaDistrict = indiaState
      ? await GeoLevel2.findOne({ level_1: indiaState._id }).lean()
      : null;

    if (india) {
      console.log(`  ✓ Country: India — ID: ${india._id}`);
      console.log(`  ✓ State  : ${indiaState?.name || 'N/A'} — ID: ${indiaState?._id || 'N/A'}`);
      console.log(`  ✓ District: ${indiaDistrict?.name || 'N/A'} — ID: ${indiaDistrict?._id || 'N/A'}`);
    } else {
      console.log('  ⚠️  India not found in GeoLevel0. Address will be null.');
    }

    // ── 4. SEED SAMPLE RESELLERS (one per type) ────────────────────────────────
    console.log('\n👤 Step 4: Seeding Sample Resellers...');

    const defaultPasswordHash = await bcrypt.hash('Reseller@123', 10);

    const resellerDefs = [
      {
        business_name: 'SunRise Solar Pvt. Ltd.',
        gst_number: '27AAPCS1642Q1ZX',
        pan_number: 'AAPCS1642Q',
        mobile: '9900000001',
        email: 'sunrise.solar.reseller@solarkits.dev',
        commercial_mode: 'commission',
        type_key: 'commission',
        plan_slug: 'commission-starter-plan',
        contact_person: 'Rajesh Kumar',
        address_line: '12, Sector 5, Andheri East',
        city: 'Mumbai',
        pincode: '400069',
        description: 'Sample Commission Reseller for testing',
      },
      {
        business_name: 'Green Power Dealers',
        gst_number: '29AAACG5789B1ZK',
        pan_number: 'AAACG5789B',
        mobile: '9900000002',
        email: 'greenpower.dealer.reseller@solarkits.dev',
        commercial_mode: 'dealer',
        type_key: 'dealer',
        plan_slug: 'dealer-starter-plan',
        contact_person: 'Priya Sharma',
        address_line: '45, Industrial Area, Phase 2',
        city: 'Bengaluru',
        pincode: '560058',
        description: 'Sample Dealer Reseller for testing',
      },
    ];

    for (const rDef of resellerDefs) {
      const existing = await Reseller.findOne({ email: rDef.email, deleted_at: null });
      if (existing) {
        console.log(`  ⚠️  Reseller already exists: "${rDef.business_name}" (${rDef.email}) — skipping`);
        continue;
      }

      const typeDoc = seededTypes[rDef.type_key];
      const planDoc = seededPlans[rDef.plan_slug];

      if (!typeDoc) {
        console.log(`  ❌ Type not found for key "${rDef.type_key}" — skipping reseller "${rDef.business_name}"`);
        continue;
      }

      const resellerData = {
        business_name: rDef.business_name,
        gst_number: rDef.gst_number,
        pan_number: rDef.pan_number,
        mobile: rDef.mobile,
        email: rDef.email,
        password_hash: defaultPasswordHash,
        contact_person: rDef.contact_person,
        commercial_mode: rDef.commercial_mode,
        reseller_type_id: typeDoc._id,
        plan_subscription_id: null, // plan subscription created separately
        kyc_status: 'draft',
        reseller_lifecycle_status: 'draft',
        agreement_status: 'pending',
        activation_status: 'pending',
        is_email_verified: false,
        is_mobile_verified: false,
        is_active: true,
        deleted_at: null,
        address: {
          line: rDef.address_line,
          country_id: india?._id || null,
          state_id: indiaState?._id || null,
          district_id: indiaDistrict?._id || null,
          city: rDef.city,
          pincode: rDef.pincode,
        },
      };

      const created = await Reseller.create(resellerData);
      console.log(`  ✓ Created Reseller: "${created.business_name}"`);
      console.log(`       Email        : ${created.email}`);
      console.log(`       Mobile       : ${created.mobile}`);
      console.log(`       Type         : ${typeDoc.name} [${created.commercial_mode}]`);
      console.log(`       Plan         : ${planDoc ? planDoc.name : 'None (assign manually)'}`);
      console.log(`       ID           : ${created._id}`);
      console.log(`       Password     : Reseller@123`);

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

      console.log('');
    }

    // ── SUMMARY ────────────────────────────────────────────────────────────────
    console.log('─'.repeat(60));
    console.log('✅ Seeding Complete!\n');

    const allTypes = await ResellerType.find({ deleted_at: null }).sort({ sort_order: 1 }).lean();
    const allResellers = await Reseller.find({ deleted_at: null }).lean();

    console.log(`📊 Total Reseller Types in DB : ${allTypes.length}`);
    allTypes.forEach(t => console.log(`   • ${t.name} [${t.commercial_mode}]`));

    console.log(`\n📊 Total Resellers in DB      : ${allResellers.length}`);
    allResellers.forEach(r => console.log(`   • ${r.business_name} (${r.email}) — ${r.commercial_mode}`));

    console.log('\n💡 Visit: http://localhost:5173/admin-panel/solar-shop/india/reseller-management/types');
    console.log('   to see the seeded Reseller Types in the admin panel.\n');

    process.exit(0);
  } catch (err) {
    console.error('\n❌ Seeder Error:', err.message);
    if (err.code === 11000) {
      console.error('   Duplicate key conflict:', err.keyValue);
    }
    console.error(err.stack);
    process.exit(1);
  }
}

seed();
