/**
 * seed_state_plan_and_epcs.js
 *
 * 1. Finds Structasoft Admin Reseller (structasoftadmin@gmail.com)
 * 2. Creates/Finds a State-Level Franchise Plan and activates subscription
 * 3. Creates/Updates Franchisee PO Settings for this plan (Min PO: 10 kits, Max: 250 kits, Validity: 30 days)
 * 4. Onboards 4 realistic EPC Buyers linked to this Franchisee
 *
 * Usage:
 *   node src/scratch/seed_state_plan_and_epcs.js
 */

const dns = require('dns');
dns.setServers(['8.8.8.8', '8.8.4.4', '1.1.1.1']);
require('dotenv').config();
require('../keys/config/databases');

const bcrypt = require('bcrypt');
const {
  Reseller,
  ResellerType,
  ResellerPlan,
  ResellerPlanSubscription,
  FranchiseePlanPoSetting,
  WarehouseComboKit,
  EpcAccount,
  EpcResellerRelationship,
} = require('../modules/admin-panel/models/india_solarshop_db');
const { GeoLevel0, GeoLevel1, GeoLevel2 } = require('../modules/admin-panel/models/geolocation_db');

async function run() {
  try {
    console.log('\n======================================================');
    console.log('🚀 Seeding State-Level Franchise Plan & Real EPC Buyers');
    console.log('======================================================\n');

    // 1. Find Reseller
    const resellerEmail = 'structasoftadmin@gmail.com';
    let reseller = await Reseller.findOne({ email: resellerEmail, deleted_at: null });
    if (!reseller) {
      console.log(`Reseller with email ${resellerEmail} not found, searching case-insensitive...`);
      reseller = await Reseller.findOne({ email: new RegExp(resellerEmail, 'i'), deleted_at: null });
    }

    if (!reseller) {
      throw new Error(`Reseller account '${resellerEmail}' not found in database!`);
    }

    console.log(`✓ Found Reseller: ${reseller.business_name || reseller.name} (${reseller.email}) [ID: ${reseller._id}]`);

    // 2. Resolve India Geo
    const india = await GeoLevel0.findOne({ name: /india/i, deleted_at: null }).lean();
    const gujaratState = india ? await GeoLevel1.findOne({ name: /gujarat/i }).lean() || await GeoLevel1.findOne({ level_0: india._id }).lean() : null;
    const district = gujaratState ? await GeoLevel2.findOne({ level_1: gujaratState._id }).lean() : null;

    // 3. Find or Create State-Level Plan
    let statePlan = await ResellerPlan.findOne({
      $or: [
        { territory_level: 'state' },
        { slug: 'state-partner-plan' },
        { name: /state/i }
      ],
      deleted_at: null,
    });

    if (!statePlan) {
      console.log('Creating new State-Level Franchise Plan...');
      const commissionType = await ResellerType.findOne({ commercial_mode: 'commission', deleted_at: null }) || await ResellerType.findOne();

      statePlan = await ResellerPlan.create({
        name: 'State Franchisee',
        slug: 'state-franchisee-plan',
        reseller_type_id: commissionType?._id,
        territory_level: 'state',
        // ✅ FIX Bug #2: correct field names (price_paise, validity_days do NOT exist in schema)
        one_time_fee: 250000,        // ₹2,50,000 — matches UI screenshot
        currency: 'INR',
        validity_value: 1,           // schema uses validity_value (not validity_days)
        validity_unit: 'years',      // required enum field
        allowed_territories_count: 1,
        default_commission_rate: 12, // 12% commission for State level
        default_dealer_margin: 8,
        commission_method: 'PERCENTAGE',
        order_type_allowed: 'both',
        moq_capacity_kw: 10000,
        moq_kits_count: 1,
        moq_project_type: 'All Project Types (Residential / Commercial / Industrial)',
        description: 'Authorized State-level franchise partner with exclusive territorial rights and bulk EPC order allocation. State-wide exclusivity.',
        is_active: true,
        sort_order: 2,
      });
      console.log(`✓ Created State Plan: ${statePlan.name}`);
    } else {
      console.log(`✓ Using State Plan: ${statePlan.name} [ID: ${statePlan._id}]`);
    }

    // 4. Activate Plan Subscription for this Reseller
    await ResellerPlanSubscription.updateMany(
      { reseller_id: reseller._id },
      { $set: { status: 'expired' } }
    );

    const subscription = await ResellerPlanSubscription.findOneAndUpdate(
      { reseller_id: reseller._id, plan_id: statePlan._id },
      {
        $set: {
          reseller_id: reseller._id,
          plan_id: statePlan._id,
          status: 'active',
          start_date: new Date(),
          end_date: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
          expiry_date: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
          payment_status: 'paid',
          // ✅ FIX Bug #2: one_time_fee is the correct field (not price_paise)
          amount_paid: statePlan.one_time_fee || 250000,
          payment_reference: `SUB-PAY-${Date.now()}`,
          is_active: true,
        }
      },
      { upsert: true, new: true }
    );

    console.log(`✓ Activated Plan Subscription: "${statePlan.name}" for Franchisee`);

    // ✅ FIX Bug #3: Set reseller_lifecycle_status = 'active'.
    // The PO service guard only allows: ['kyc_verified','agreement_pending','territory_pending','active']
    // The previous status 'gst_verified' was NOT in this list — so PO ordering was always blocked.
    await Reseller.findByIdAndUpdate(reseller._id, {
      $set: {
        activation_status: 'active',
        reseller_lifecycle_status: 'active',
        plan_subscription_id: subscription._id,
        is_active: true,
      },
    });
    console.log(`✓ Updated Reseller: lifecycle_status=active, activation_status=active (PO ordering ENABLED)`);

    // 5. Ensure PO Settings for State Plan
    const allKits = await WarehouseComboKit.find({ is_active: { $ne: false }, deleted_at: null }).lean();
    const kitIds = allKits.map((k) => k._id);

    let poSettings = await FranchiseePlanPoSetting.findOne({
      plan_id: statePlan._id,
      deleted_at: null,
    });

    if (!poSettings) {
      poSettings = await FranchiseePlanPoSetting.create({
        plan_id: statePlan._id,
        po_enabled: true,            // ✅ FIX Bug #1: MUST be true (schema default was false!)
        min_po_quantity: 10,
        max_po_quantity: 250,
        po_validity_days: 30,
        max_line_items: 20,
        effective_from: new Date(),  // ✅ FIX Bug #6: always set explicitly
        allowed_combo_kit_ids: kitIds,
        allow_mixed_project_types: true,
        requires_approval: true,
        payment_terms: 'FULL_ADVANCE',
        is_active: true,
      });
      console.log(`✓ Created PO Settings (po_enabled:true): Min 10 kits, Max 250 kits, ${kitIds.length} kits linked`);
    } else {
      poSettings.po_enabled = true;  // ✅ FIX Bug #1: force-enable for existing records
      poSettings.min_po_quantity = 10;
      poSettings.max_po_quantity = 250;
      poSettings.po_validity_days = 30;
      poSettings.effective_from = poSettings.effective_from || new Date();
      poSettings.allowed_combo_kit_ids = kitIds;
      poSettings.is_active = true;
      await poSettings.save();
      console.log(`✓ Updated PO Settings (po_enabled:true): Min 10, Max 250, Kits: ${kitIds.length}`);
    }

    // 6. Seed 4 Realistic EPC Buyers
    const epcPassword = 'Password@123';
    const passwordHash = await bcrypt.hash(epcPassword, 10);

    const epcBuyersSeedData = [
      {
        name: 'Rajesh Sharma',
        company_name: 'Adani Solar Power EPC Solutions Pvt Ltd',
        email: 'adani.epc.rajesh@gmail.com',
        whatsapp: '9876543210',
        gstin: '24AAACA1234F1Z5',
        state_id: gujaratState?._id,
        district_id: district?._id,
      },
      {
        name: 'Vikram Patel',
        company_name: 'Tata Suntech Renewable Energy Ltd',
        email: 'tatasolar.vikram@gmail.com',
        whatsapp: '9876543211',
        gstin: '24AABCT9876G1Z2',
        state_id: gujaratState?._id,
        district_id: district?._id,
      },
      {
        name: 'Amit Desai',
        company_name: 'GreenSpark Solar EPC Infra',
        email: 'greenspark.amit@gmail.com',
        whatsapp: '9876543212',
        gstin: '24AACCG4567H1Z9',
        state_id: gujaratState?._id,
        district_id: district?._id,
      },
      {
        name: 'Sunil Mehta',
        company_name: 'SunShine CleanTech EPC Services',
        email: 'sunshine.sunil@gmail.com',
        whatsapp: '9876543213',
        gstin: '24AADDS3456J1Z1',
        state_id: gujaratState?._id,
        district_id: district?._id,
      },
    ];

    console.log('\n--- Onboarding Realistic EPC Buyers ---');
    const createdEpcs = [];

    for (const epcData of epcBuyersSeedData) {
      let epc = await EpcAccount.findOne({ email: epcData.email });
      if (epc) {
        epc.name = epcData.name;
        epc.gstin_trade_name = epcData.company_name;
        epc.gstin_legal_name = epcData.company_name;
        epc.whatsapp = epcData.whatsapp;
        epc.gstin = epcData.gstin;
        epc.is_gstin_active = true;
        epc.password_hash = passwordHash;
        epc.onboarded_by_reseller_id = reseller._id;
        epc.status = 'approved';
        epc.is_active = true;
        epc.states = epcData.state_id ? [epcData.state_id] : [];
        epc.districts = epcData.district_id ? [epcData.district_id] : [];
        epc.reseller_assigned_date = new Date();
        epc.deleted_at = null;
        await epc.save();
        console.log(`  ✓ Updated EPC Buyer: ${epcData.company_name} (${epc.email})`);
      } else {
        epc = await EpcAccount.create({
          name: epcData.name,
          gstin_trade_name: epcData.company_name,
          gstin_legal_name: epcData.company_name,
          email: epcData.email,
          whatsapp: epcData.whatsapp,
          gstin: epcData.gstin,
          is_gstin_active: true,
          password_hash: passwordHash,
          onboarded_by_reseller_id: reseller._id,
          status: 'approved',
          is_active: true,
          states: epcData.state_id ? [epcData.state_id] : [],
          districts: epcData.district_id ? [epcData.district_id] : [],
          reseller_assigned_date: new Date(),
        });
        console.log(`  ✓ Created EPC Buyer: ${epcData.company_name} (${epc.email})`);
      }

      // Link relationship
      await EpcResellerRelationship.findOneAndUpdate(
        { epc_id: epc._id, reseller_id: reseller._id },
        {
          $set: {
            epc_id: epc._id,
            reseller_id: reseller._id,
            status: 'active',
            assigned_at: new Date(),
            source: 'reseller_onboarded',
          }
        },
        { upsert: true }
      );

      createdEpcs.push({
        name: epc.name,
        company_name: epc.gstin_trade_name || epc.gstin_legal_name || epcData.company_name,
        email: epc.email,
        whatsapp: epc.whatsapp,
        gstin: epc.gstin,
        password: epcPassword,
      });
    }

    console.log('\n======================================================');
    console.log('🎉 SETUP & ONBOARDING COMPLETED SUCCESSFULLY!');
    console.log('======================================================');
    console.log('\nFranchise Partner:');
    console.log(`  • Email: ${reseller.email}`);
    console.log(`  • Active Plan: ${statePlan.name} (State Level)`);
    console.log(`  • PO Order Rule: Minimum 10 Kits, Maximum 250 Kits`);
    console.log('\nOnboarded EPC Buyer Accounts (Common Password: Password@123):');
    createdEpcs.forEach((e, idx) => {
      console.log(`  [${idx + 1}] ${e.company_name}`);
      console.log(`      Contact: ${e.name} (${e.whatsapp})`);
      console.log(`      Email: ${e.email}`);
      console.log(`      Password: ${e.password}`);
      console.log(`      GSTIN: ${e.gstin}`);
    });
    console.log('\n');

    process.exit(0);
  } catch (error) {
    console.error('\n❌ Seeding failed:', error);
    process.exit(1);
  }
}

run();
