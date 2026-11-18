const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });
const mongoose = require('mongoose');

async function fixPlans() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('✅ Connected to MongoDB Database');

  const {
    Reseller,
    ResellerPlan,
    ResellerPlanSubscription
  } = require('../modules/admin-panel/models/india_solarshop_db');

  // Find District Franchise Store plan
  const districtFranchisePlan = await ResellerPlan.findOne({
    slug: 'district-franchise-store',
    deleted_at: null,
  });

  if (!districtFranchisePlan) {
    console.error('❌ District Franchise Store plan not found in database!');
    process.exit(1);
  }

  console.log(`Found target plan: "${districtFranchisePlan.name}" (ID: ${districtFranchisePlan._id}, Store Category: ${districtFranchisePlan.store_category}, Fee: ₹${districtFranchisePlan.one_time_fee})`);

  // Find Company Store plan
  const companyStorePlan = await ResellerPlan.findOne({
    slug: 'company-store',
    deleted_at: null,
  });

  // Find all subscriptions that point to Company Store but belong to a franchisee_store
  const subscriptions = await ResellerPlanSubscription.find({
    plan_id: companyStorePlan?._id,
  }).populate('reseller_id');

  console.log(`Found ${subscriptions.length} subscriptions pointing to Company Store`);

  for (const sub of subscriptions) {
    const reseller = sub.reseller_id;
    if (reseller && reseller.store_category === 'franchisee_store') {
      console.log(`Fixing subscription ${sub._id} for Franchisee "${reseller.business_name}" (${reseller._id})...`);
      sub.plan_id = districtFranchisePlan._id;
      if (!sub.amount_paid || sub.amount_paid === 0) {
        sub.amount_paid = districtFranchisePlan.one_time_fee || 250000;
      }
      await sub.save();
      console.log(`✅ Subscription ${sub._id} updated to "${districtFranchisePlan.name}"`);
    }
  }

  // Double check Alex Khan specifically
  const alexReseller = await Reseller.findOne({ business_name: /Alex khan/i });
  if (alexReseller) {
    const alexSub = await ResellerPlanSubscription.findOne({ reseller_id: alexReseller._id }).populate('plan_id');
    console.log(`\nVerification for "${alexReseller.business_name}":`);
    console.log(`- Reseller Store Category: ${alexReseller.store_category}`);
    console.log(`- Sub ID: ${alexSub?._id}`);
    console.log(`- Plan Name: ${alexSub?.plan_id?.name}`);
    console.log(`- Plan Store Category: ${alexSub?.plan_id?.store_category}`);
    console.log(`- Amount Paid: ₹${alexSub?.amount_paid}`);
  }

  await mongoose.disconnect();
  console.log('✅ Disconnected cleanly');
}

fixPlans().catch((err) => {
  console.error('Migration error:', err);
  process.exit(1);
});
