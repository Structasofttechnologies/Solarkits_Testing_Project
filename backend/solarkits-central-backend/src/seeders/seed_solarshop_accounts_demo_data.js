/**
 * seed_solarshop_accounts_demo_data.js
 *
 * Seeds comprehensive and realistic accounts data for Solar Shop:
 * 1. Franchise Plan Payments (District, State, Country level plans with Paid, Pending, Failed, Refunded statuses)
 * 2. Direct EPC Transactions (Direct orders placed by EPCs with item breakdowns, amounts, and 0% franchise commission)
 * 3. Franchise Commission Tracking & Onboarded EPC Orders (Commissions with Paid, Pending, On Hold, and Failed statuses, UTRs, etc.)
 */

require('dotenv').config();
const mongoose = require('mongoose');
require('../keys/config/databases');
const {
  Reseller,
  ResellerType,
  ResellerPlan,
  ResellerPlanSubscription,
  EpcAccount,
  EpcOrder,
  ResellerWallet,
  ResellerWalletLedger,
  ResellerPayoutRequest,
  ResellerTerritory,
} = require('../modules/admin-panel/models/india_solarshop_db');
const { GeoLevel0, GeoLevel1, GeoLevel2 } = require('../modules/account-panel/models/geolocation_db');

async function seed() {
  console.log('🚀 Starting Solar Shop Accounts Demo Data Seeding...');

  // 1. Get or Create Reseller Type & Plans
  let planDistrict = await ResellerPlan.findOne({ territory_level: 'district' });
  if (!planDistrict) {
    planDistrict = await ResellerPlan.create({
      name: 'District Franchisee Starter Plan',
      slug: 'district-franchisee-starter-plan',
      territory_level: 'district',
      one_time_fee: 25000,
      currency: 'INR',
      validity_value: 1,
      validity_unit: 'years',
      allowed_territories_count: 2,
      default_commission_rate: 8,
      is_active: true
    });
  }

  let planState = await ResellerPlan.findOne({ territory_level: 'state' });
  if (!planState) {
    planState = await ResellerPlan.create({
      name: 'State Master Franchisee Plan',
      slug: 'state-master-franchisee-plan',
      territory_level: 'state',
      one_time_fee: 100000,
      currency: 'INR',
      validity_value: 2,
      validity_unit: 'years',
      allowed_territories_count: 1,
      default_commission_rate: 10,
      is_active: true
    });
  }

  let planCountry = await ResellerPlan.findOne({ territory_level: 'country' });
  if (!planCountry) {
    planCountry = await ResellerPlan.create({
      name: 'National Enterprise Partner Plan',
      slug: 'national-enterprise-partner-plan',
      territory_level: 'country',
      one_time_fee: 350000,
      currency: 'INR',
      validity_value: 3,
      validity_unit: 'years',
      allowed_territories_count: 1,
      default_commission_rate: 12,
      is_active: true
    });
  }

  // 2. Fetch or Create Resellers
  let partner1 = await Reseller.findOne({ email: 'surat.solartech@solarkits.in' });
  if (!partner1) {
    let rType = await ResellerType.findOne();
    partner1 = await Reseller.create({
      business_name: 'Surat SolarTech Enterprises',
      gst_number: '24AABCS1234F1Z5',
      pan_number: 'AABCS1234F',
      mobile: '9825012345',
      email: 'surat.solartech@solarkits.in',
      contact_person: 'Rajesh Patel',
      password_hash: '$2b$10$wX8RZDZImUGikFInB35IIeMqQdMDMdq8rqh8PU7gJKpBzF4qcXqw.',
      commercial_mode: 'commission',
      reseller_type_id: rType?._id || new mongoose.Types.ObjectId(),
      kyc_status: 'verified',
      reseller_lifecycle_status: 'active',
      activation_status: 'active',
      is_active: true
    });
  }

  let partner2 = await Reseller.findOne({ email: 'maharashtra.energy@solarkits.in' });
  if (!partner2) {
    let rType = await ResellerType.findOne();
    partner2 = await Reseller.create({
      business_name: 'Maharashtra GreenPower Grid',
      gst_number: '27AAACG9876E1ZT',
      pan_number: 'AAACG9876E',
      mobile: '9820056789',
      email: 'maharashtra.energy@solarkits.in',
      contact_person: 'Amit Deshmukh',
      password_hash: '$2b$10$wX8RZDZImUGikFInB35IIeMqQdMDMdq8rqh8PU7gJKpBzF4qcXqw.',
      commercial_mode: 'commission',
      reseller_type_id: rType?._id || new mongoose.Types.ObjectId(),
      kyc_status: 'verified',
      reseller_lifecycle_status: 'active',
      activation_status: 'active',
      is_active: true
    });
  }

  let partner3 = await Reseller.findOne({ email: 'apex.solar.delhi@solarkits.in' });
  if (!partner3) {
    let rType = await ResellerType.findOne();
    partner3 = await Reseller.create({
      business_name: 'Apex Solar Dynamics North India',
      gst_number: '07AAPCA4321P1Z9',
      pan_number: 'AAPCA4321P',
      mobile: '9811099887',
      email: 'apex.solar.delhi@solarkits.in',
      contact_person: 'Vikram Sharma',
      password_hash: '$2b$10$wX8RZDZImUGikFInB35IIeMqQdMDMdq8rqh8PU7gJKpBzF4qcXqw.',
      commercial_mode: 'commission',
      reseller_type_id: rType?._id || new mongoose.Types.ObjectId(),
      kyc_status: 'verified',
      reseller_lifecycle_status: 'active',
      activation_status: 'active',
      is_active: true
    });
  }

  // 3. Seed Franchise Plan Purchases (Subscriptions)
  console.log('📦 Seeding Franchise Plan Subscriptions...');
  const planSubsData = [
    {
      reseller_id: partner1._id,
      plan_id: planDistrict._id,
      amount_paid: 25000,
      currency: 'INR',
      start_date: new Date('2026-07-01'),
      expiry_date: new Date('2027-07-01'),
      payment_reference: 'FPS-UTR-20260701-8842',
      status: 'active', // Paid
    },
    {
      reseller_id: partner2._id,
      plan_id: planState._id,
      amount_paid: 100000,
      currency: 'INR',
      start_date: new Date('2026-07-15'),
      expiry_date: new Date('2028-07-15'),
      payment_reference: 'FPS-UTR-20260715-9921',
      status: 'active', // Paid
    },
    {
      reseller_id: partner3._id,
      plan_id: planCountry._id,
      amount_paid: 350000,
      currency: 'INR',
      start_date: new Date('2026-08-01'),
      expiry_date: new Date('2029-08-01'),
      payment_reference: 'FPS-UTR-20260801-4419',
      status: 'active', // Paid
    },
    {
      reseller_id: partner1._id,
      plan_id: planDistrict._id,
      amount_paid: 25000,
      currency: 'INR',
      start_date: new Date('2026-08-10'),
      expiry_date: new Date('2027-08-10'),
      payment_reference: 'FPS-PEND-20260810-1120',
      status: 'grace', // Pending
    },
    {
      reseller_id: partner2._id,
      plan_id: planDistrict._id,
      amount_paid: 25000,
      currency: 'INR',
      start_date: new Date('2026-06-01'),
      expiry_date: new Date('2026-06-05'),
      payment_reference: 'FPS-FAIL-20260601-0091',
      status: 'expired', // Failed
    },
    {
      reseller_id: partner3._id,
      plan_id: planState._id,
      amount_paid: 100000,
      currency: 'INR',
      start_date: new Date('2026-05-15'),
      expiry_date: new Date('2026-05-20'),
      payment_reference: 'FPS-REF-20260515-3344',
      status: 'cancelled', // Refunded
    }
  ];

  for (const s of planSubsData) {
    const exists = await ResellerPlanSubscription.findOne({ payment_reference: s.payment_reference });
    if (!exists) {
      await ResellerPlanSubscription.create(s);
    }
  }

  // 4. Fetch or Create EPCs (Direct and Onboarded)
  let directEpc1 = await EpcAccount.findOne({ email: 'zenith.solar.epc@gmail.com' });
  if (!directEpc1) {
    directEpc1 = await EpcAccount.create({
      name: 'Zenith Solar Solutions',
      email: 'zenith.solar.epc@gmail.com',
      whatsapp: '9898011223',
      password_hash: '$2b$10$wX8RZDZImUGikFInB35IIeMqQdMDMdq8rqh8PU7gJKpBzF4qcXqw.',
      gstin: '24AAACZ1122Q1ZV',
      is_gstin_active: true,
      onboarding_source: 'direct',
      status: 'approved'
    });
  }

  let directEpc2 = await EpcAccount.findOne({ email: 'sunray.installers@gmail.com' });
  if (!directEpc2) {
    directEpc2 = await EpcAccount.create({
      name: 'Sunray Commercial Installers',
      email: 'sunray.installers@gmail.com',
      whatsapp: '9879033445',
      password_hash: '$2b$10$wX8RZDZImUGikFInB35IIeMqQdMDMdq8rqh8PU7gJKpBzF4qcXqw.',
      gstin: '27AABCS3344F1Z1',
      is_gstin_active: true,
      onboarding_source: 'direct',
      status: 'approved'
    });
  }

  let onboardedEpc1 = await EpcAccount.findOne({ email: 'bharat.power.epc@gmail.com' });
  if (!onboardedEpc1) {
    onboardedEpc1 = await EpcAccount.create({
      name: 'Bharat Power & Infra EPC',
      email: 'bharat.power.epc@gmail.com',
      whatsapp: '9822066778',
      password_hash: '$2b$10$wX8RZDZImUGikFInB35IIeMqQdMDMdq8rqh8PU7gJKpBzF4qcXqw.',
      gstin: '24AAACB6677P1Z3',
      is_gstin_active: true,
      onboarded_by_reseller_id: partner1._id,
      primary_reseller_id: partner1._id,
      onboarding_source: 'reseller',
      status: 'approved'
    });
  }

  let onboardedEpc2 = await EpcAccount.findOne({ email: 'pune.solar.engineers@gmail.com' });
  if (!onboardedEpc2) {
    onboardedEpc2 = await EpcAccount.create({
      name: 'Pune Solar Engineers Pvt Ltd',
      email: 'pune.solar.engineers@gmail.com',
      whatsapp: '9866088990',
      password_hash: '$2b$10$wX8RZDZImUGikFInB35IIeMqQdMDMdq8rqh8PU7gJKpBzF4qcXqw.',
      gstin: '27AAACP8899M1ZQ',
      is_gstin_active: true,
      onboarded_by_reseller_id: partner2._id,
      primary_reseller_id: partner2._id,
      onboarding_source: 'reseller',
      status: 'approved'
    });
  }

  // 5. Seed Direct EPC Transactions (0% Franchise Commission)
  console.log('⚡ Seeding Direct EPC Orders...');
  const directOrdersData = [
    {
      order_number: 'ORD-DIR-20260815-7701',
      epc_id: directEpc1._id,
      reseller_id: null,
      routing_source: 'direct_fallback',
      items: [
        {
          scope_type: 'kit',
          item_name: '10kW 3-Phase On-Grid Commercial Solar Kit',
          quantity: 2,
          unit_price_paise: 38000000,
          cost_price_paise: 32000000,
          reseller_margin_paise: 0, // NO commission
          platform_commission_paise: 6000000,
          gst_rate: 13.8,
          tax_paise: 10488000,
          total_price_paise: 86488000
        },
        {
          scope_type: 'product',
          item_name: 'Smart Energy Meter & Data Logger',
          quantity: 2,
          unit_price_paise: 1500000,
          cost_price_paise: 1100000,
          reseller_margin_paise: 0,
          platform_commission_paise: 400000,
          gst_rate: 18.0,
          tax_paise: 540000,
          total_price_paise: 3540000
        }
      ],
      subtotal_paise: 79000000, // 7,90,000 INR
      tax_total_paise: 11028000,
      grand_total_paise: 90028000, // 9,00,280 INR
      reseller_total_margin_paise: 0,
      platform_total_commission_paise: 6400000,
      order_status: 'delivered',
      payment_status: 'captured', // Paid
      payment_reference: 'pay_rzp_direct_9901827',
      is_end_customer_sale: true,
      delivery_address: { line: 'Zenith Solar Warehouse, GIDC Vatva, Ahmedabad, Gujarat' }
    },
    {
      order_number: 'ORD-DIR-20260816-4422',
      epc_id: directEpc2._id,
      reseller_id: null,
      routing_source: 'direct_fallback',
      items: [
        {
          scope_type: 'product',
          item_name: '540W Mono PERC Half-Cut Bifacial Panels (Pallet of 31)',
          quantity: 4,
          unit_price_paise: 42000000,
          cost_price_paise: 36000000,
          reseller_margin_paise: 0,
          platform_commission_paise: 6000000,
          gst_rate: 13.8,
          tax_paise: 23184000,
          total_price_paise: 191184000
        }
      ],
      subtotal_paise: 168000000, // 16,80,000 INR
      tax_total_paise: 23184000,
      grand_total_paise: 191184000, // 19,11,840 INR
      reseller_total_margin_paise: 0,
      platform_total_commission_paise: 24000000,
      order_status: 'confirmed',
      payment_status: 'captured', // Paid
      payment_reference: 'pay_rzp_direct_8833910',
      is_end_customer_sale: false,
      delivery_address: { line: 'Sunray Logistics Park, Chakan MIDC, Pune, Maharashtra' }
    },
    {
      order_number: 'ORD-DIR-20260818-1199',
      epc_id: directEpc1._id,
      reseller_id: null,
      routing_source: 'direct_fallback',
      items: [
        {
          scope_type: 'product',
          item_name: '50kW Hybrid Solar Inverter with Monitoring',
          quantity: 1,
          unit_price_paise: 24500000,
          cost_price_paise: 21000000,
          reseller_margin_paise: 0,
          platform_commission_paise: 3500000,
          gst_rate: 13.8,
          tax_paise: 3381000,
          total_price_paise: 27881000
        }
      ],
      subtotal_paise: 24500000,
      tax_total_paise: 3381000,
      grand_total_paise: 27881000,
      reseller_total_margin_paise: 0,
      platform_total_commission_paise: 3500000,
      order_status: 'pending',
      payment_status: 'pending', // Pending
      payment_reference: null,
      is_end_customer_sale: true,
      delivery_address: { line: 'Industrial Estate, Gandhinagar, Gujarat' }
    }
  ];

  for (const o of directOrdersData) {
    const exists = await EpcOrder.findOne({ order_number: o.order_number });
    if (!exists) {
      await EpcOrder.create(o);
    }
  }

  // 6. Seed Franchise Partner Orders & Commissions (Tracking Paid, Pending, On Hold, Failed)
  console.log('💰 Seeding Franchise Partner Orders and Commission Ledgers...');
  const franchiseOrdersData = [
    {
      order_number: 'ORD-FRA-20260805-5510',
      epc_id: onboardedEpc1._id,
      reseller_id: partner1._id,
      routing_source: 'primary_reseller',
      items: [
        {
          scope_type: 'kit',
          item_name: '5kW 1-Phase Residential Solar Combo Kit',
          quantity: 3,
          unit_price_paise: 18500000,
          cost_price_paise: 15500000,
          reseller_margin_paise: 1480000, // 8% commission per unit = 14,800 INR
          platform_commission_paise: 1520000,
          gst_rate: 13.8,
          tax_paise: 7659000,
          total_price_paise: 63159000
        }
      ],
      subtotal_paise: 55500000, // 5,55,000 INR
      tax_total_paise: 7659000,
      grand_total_paise: 63159000, // 6,31,590 INR
      reseller_total_margin_paise: 4440000, // 44,400 INR (Commission)
      platform_total_commission_paise: 4560000,
      order_status: 'delivered',
      payment_status: 'captured',
      payment_reference: 'pay_rzp_fra_551022',
      is_end_customer_sale: true,
      delivery_address: { line: 'Green Valley Villas, Surat, Gujarat' },
      delivered_at: new Date('2026-08-08')
    },
    {
      order_number: 'ORD-FRA-20260812-9934',
      epc_id: onboardedEpc2._id,
      reseller_id: partner2._id,
      routing_source: 'primary_reseller',
      items: [
        {
          scope_type: 'kit',
          item_name: '25kW Industrial Rooftop Solar Bundle with Mounting Structure',
          quantity: 1,
          unit_price_paise: 95000000,
          cost_price_paise: 80000000,
          reseller_margin_paise: 9500000, // 10% commission = 95,000 INR
          platform_commission_paise: 5500000,
          gst_rate: 13.8,
          tax_paise: 13110000,
          total_price_paise: 108110000
        }
      ],
      subtotal_paise: 95000000,
      tax_total_paise: 13110000,
      grand_total_paise: 108110000,
      reseller_total_margin_paise: 9500000, // 95,000 INR
      platform_total_commission_paise: 5500000,
      order_status: 'confirmed',
      payment_status: 'captured',
      payment_reference: 'pay_rzp_fra_993411',
      is_end_customer_sale: true,
      delivery_address: { line: 'Industrial Hub, Hadapsar, Pune, Maharashtra' }
    },
    {
      order_number: 'ORD-FRA-20260817-2281',
      epc_id: onboardedEpc1._id,
      reseller_id: partner1._id,
      routing_source: 'primary_reseller',
      items: [
        {
          scope_type: 'product',
          item_name: 'Lithium Ferro Phosphate (LFP) Battery 48V 100Ah',
          quantity: 4,
          unit_price_paise: 8200000,
          cost_price_paise: 7000000,
          reseller_margin_paise: 656000, // 8% = 6,560 INR each = 26,240 INR
          platform_commission_paise: 544000,
          gst_rate: 18.0,
          tax_paise: 5904000,
          total_price_paise: 38704000
        }
      ],
      subtotal_paise: 32800000,
      tax_total_paise: 5904000,
      grand_total_paise: 38704000,
      reseller_total_margin_paise: 2624000, // 26,240 INR
      platform_total_commission_paise: 2176000,
      order_status: 'processing',
      payment_status: 'captured',
      payment_reference: 'pay_rzp_fra_228190',
      is_end_customer_sale: true,
      delivery_address: { line: 'Varachha Road, Surat, Gujarat' }
    },
    {
      order_number: 'ORD-FRA-20260819-3304',
      epc_id: onboardedEpc2._id,
      reseller_id: partner2._id,
      routing_source: 'primary_reseller',
      items: [
        {
          scope_type: 'product',
          item_name: 'Solar DC Fast EV Charger 30kW Dual Gun',
          quantity: 1,
          unit_price_paise: 32000000,
          cost_price_paise: 28000000,
          reseller_margin_paise: 3200000,
          platform_commission_paise: 800000,
          gst_rate: 18.0,
          tax_paise: 5760000,
          total_price_paise: 37760000
        }
      ],
      subtotal_paise: 32000000,
      tax_total_paise: 5760000,
      grand_total_paise: 37760000,
      reseller_total_margin_paise: 3200000, // 32,000 INR
      platform_total_commission_paise: 800000,
      order_status: 'cancelled',
      payment_status: 'refunded',
      payment_reference: 'pay_rzp_fra_330455',
      cancellation_reason: 'Customer cancelled site installation',
      is_end_customer_sale: true,
      delivery_address: { line: 'Kothrud, Pune, Maharashtra' }
    }
  ];

  for (const o of franchiseOrdersData) {
    let orderDoc = await EpcOrder.findOne({ order_number: o.order_number });
    if (!orderDoc) {
      orderDoc = await EpcOrder.create(o);
    }

    // Create corresponding double-entry ledger if delivered/paid
    const ledgerKey = `epc_order:${orderDoc._id}:reseller_margin:v1`;
    let ledgerDoc = await ResellerWalletLedger.findOne({ idempotency_key: ledgerKey });
    if (!ledgerDoc) {
      const marginPaise = orderDoc.reseller_total_margin_paise || 0;
      const isPaid = orderDoc.order_status === 'delivered';

      await ResellerWalletLedger.create({
        reseller_id: orderDoc.reseller_id,
        transaction_type: 'commission_credit',
        amount: marginPaise / 100,
        balance_type: isPaid ? 'available' : 'pending',
        balance_after: marginPaise / 100,
        gross_amount_paise: marginPaise,
        tds_amount_paise: Math.round(marginPaise * 0.05),
        tcs_amount_paise: Math.round(marginPaise * 0.01),
        net_amount_paise: Math.round(marginPaise * 0.94),
        balance_after_paise: Math.round(marginPaise * 0.94),
        reference_order_id: orderDoc._id,
        idempotency_key: ledgerKey,
        narration: `Franchise partner commission for EPC order ${orderDoc.order_number}`
      });

      // Update Reseller Wallet
      let wallet = await ResellerWallet.findOne({ reseller_id: orderDoc.reseller_id });
      if (!wallet) {
        wallet = await ResellerWallet.create({
          reseller_id: orderDoc.reseller_id,
          available_balance: isPaid ? (marginPaise * 0.94) / 100 : 0,
          pending_balance: isPaid ? 0 : (marginPaise * 0.94) / 100,
          total_earned: (marginPaise * 0.94) / 100,
          available_balance_paise: isPaid ? Math.round(marginPaise * 0.94) : 0,
          pending_balance_paise: isPaid ? 0 : Math.round(marginPaise * 0.94),
          gross_earned_paise: marginPaise,
          total_earned_paise: Math.round(marginPaise * 0.94),
          total_withdrawn_paise: isPaid ? Math.round(marginPaise * 0.94) : 0
        });
      }
    }
  }

  console.log('✅ Solar Shop Accounts Demo Data Seeding Completed Successfully!');
  process.exit(0);
}

seed().catch(err => {
  console.error('❌ Seeding failed:', err);
  process.exit(1);
});
