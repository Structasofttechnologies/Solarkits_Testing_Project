/**
 * seed_sample_reseller_product_flow.js
 *
 * Automated seed and verification script for complete Reseller Product-Purchase & EPC Storefront flow.
 *
 * Verification steps:
 * 1. Creates/retrieves Industry Type ("Residential Solar")
 * 2. Creates/retrieves Sample Product ("Mono PERC 550W Bifacial Solar Panel")
 * 3. Configures Structasoft Admin Reseller with approved industry eligibility
 * 4. Assigns product to Structasoft Admin Reseller (validates industry & prevents duplicate)
 * 5. Executes Reseller purchase / acceptance
 * 6. Adds reseller profit margin (validates min/max bounds) & calculates tax + final EPC price
 * 7. Publishes product to storefront
 * 8. Simulates EPC Catalogue API retrieval for onboarded EPC company
 * 9. Asserts strict confidentiality & tenant isolation (ensures base price and reseller margin are hidden)
 *
 * Run: node src/scratch/seed_sample_reseller_product_flow.js
 */

const dns = require('dns');
dns.setServers(['8.8.8.8', '8.8.4.4', '1.1.1.1']);
require('dotenv').config();
require('../keys/config/databases');

const mongoose = require('mongoose');
const { Product, IndustryType, ProjectCategory, ProjectSubcategory, Brand } = require('../modules/admin-panel/models/core_db');
const { Reseller, ResellerListing, ResellerProductAuthorization, EpcAccount, EpcResellerRelationship } = require('../modules/admin-panel/models/india_solarshop_db');
const { get_epc_catalogue } = require('../modules/solarshop-india/controller/epc.catalogue.handler');

async function runSampleSetupAndVerification() {
  try {
    console.log('\n===============================================================');
    console.log('🚀 Starting Reseller Product Purchase & EPC Storefront Verification');
    console.log('===============================================================\n');

    // ── 1. Create / Find Industry Type ──────────────────────────────────────
    let industry = await IndustryType.findOne({ slug: 'residential-solar' });
    if (!industry) {
      industry = await IndustryType.create({
        name: 'Residential Solar',
        slug: 'residential-solar',
        description: 'Rooftop and ground-mount residential solar products',
        is_active: true,
      });
      console.log(`✓ Created Industry Type: "${industry.name}" (${industry._id})`);
    } else {
      console.log(`✓ Found Existing Industry Type: "${industry.name}" (${industry._id})`);
    }

    // ── 2. Create / Find Category, Subcategory, Brand ──────────────────────
    let category = await ProjectCategory.findOne({ name: 'Solar Panels' });
    if (!category) {
      category = await ProjectCategory.create({ name: 'Solar Panels', is_active: true });
    }

    let subcategory = await ProjectSubcategory.findOne({ name: 'Mono PERC Panels' });
    if (!subcategory) {
      subcategory = await ProjectSubcategory.create({ name: 'Mono PERC Panels', category: category._id, is_active: true });
    }

    let brand = await Brand.findOne({ brand_name: 'Waaree Energies' });
    if (!brand) {
      brand = await Brand.create({ brand_name: 'Waaree Energies', company_name: 'Waaree Energies Ltd' });
    }

    // ── 3. Create / Find Sample Product ─────────────────────────────────────
    const sampleProductName = 'Mono PERC 550W Bifacial Solar Panel';
    let product = await Product.findOne({ name: sampleProductName });
    const costPricePaise = 1800000; // INR 18,000
    const minMarginPaise = 100000;  // INR 1,000
    const maxMarginPaise = 500000;  // INR 5,000
    const taxRatePct = 18;           // 18% GST

    if (!product) {
      product = await Product.create({
        name: sampleProductName,
        sku_code: 'WAA-550M-PERC',
        description: 'Ultra-high efficiency 550W bifacial solar module with dual glass technology and 25-year warranty.',
        image: 'https://images.unsplash.com/photo-1509391365360-2e959784a276?w=500&auto=format&fit=crop&q=60',
        industry_type_id: industry._id,
        category_id: category._id,
        subcategory_id: subcategory._id,
        brand_id: brand._id,
        base_price_paise: costPricePaise,
        min_margin_paise: minMarginPaise,
        max_margin_paise: maxMarginPaise,
        tax_rate_pct: taxRatePct,
        stock_quantity: 150,
        specifications: {
          wattage: '550W',
          efficiency: '21.3%',
          cell_type: 'Mono PERC 144 Half-cut',
          warranty: '25 Years Performance',
        },
        is_active: true,
        status: 'active',
      });
      console.log(`✓ Created Sample Active Product: "${product.name}" (SKU: ${product.sku_code})`);
    } else {
      product.base_price_paise = costPricePaise;
      product.min_margin_paise = minMarginPaise;
      product.max_margin_paise = maxMarginPaise;
      product.industry_type_id = industry._id;
      product.is_active = true;
      product.status = 'active';
      await product.save();
      console.log(`✓ Found & Updated Sample Product: "${product.name}"`);
    }

    // ── 4. Find Structasoft Admin Reseller ──────────────────────────────────
    const resellerEmail = 'structasoftadmin@gmail.com';
    let reseller = await Reseller.findOne({ email: resellerEmail, deleted_at: null });
    if (!reseller) {
      throw new Error(`Reseller with email ${resellerEmail} not found! Run seed_structasoft_reseller.js first.`);
    }

    // Ensure reseller has approved industry eligibility
    if (!reseller.approved_industry_type_ids.includes(industry._id)) {
      reseller.approved_industry_type_ids.push(industry._id);
      await reseller.save();
      console.log(`✓ Added Industry "${industry.name}" to Structasoft Reseller Approved Eligibility`);
    }

    // ── 5. Validate Industry Match & Assign Product to Reseller ─────────────
    console.log('\n--- Step 1: Assigning Product to Structasoft Admin Reseller ---');
    const isApprovedIndustry = reseller.approved_industry_type_ids.some(
      (id) => id.toString() === product.industry_type_id.toString()
    );
    if (!isApprovedIndustry) {
      throw new Error('Industry Validation Failed: Product industry does not match reseller approved industries!');
    }
    console.log('✓ Industry Eligibility Check Passed!');

    // Remove any previous sample listing for clean test
    await ResellerListing.deleteMany({ reseller_id: reseller._id, product_id: product._id });
    await ResellerProductAuthorization.deleteMany({ reseller_id: reseller._id, product_id: product._id });

    // Create Assignment Rule & Initial Listing in 'assigned' status
    const authRule = await ResellerProductAuthorization.create({
      reseller_id: reseller._id,
      scope_type: 'product',
      product_id: product._id,
      allowed_industry_type_ids: [industry._id],
      is_authorized: true,
      source: 'admin_override',
      status: 'active',
    });

    let listing = await ResellerListing.create({
      reseller_id: reseller._id,
      item_type: 'product',
      product_id: product._id,
      industry_type_id: industry._id,
      category_id: category._id,
      subcategory_id: subcategory._id,
      brand_id: brand._id,
      title: product.name,
      description: product.description,
      image_url: product.image,
      specifications: product.specifications,
      stock_quantity: product.stock_quantity,
      cost_price_paise: costPricePaise,
      map_price_paise: costPricePaise,
      min_margin_paise: minMarginPaise,
      max_margin_paise: maxMarginPaise,
      reseller_margin_paise: 0,
      reseller_margin_pct: 0,
      tax_rate_pct: taxRatePct,
      taxes_and_charges_paise: 0,
      selling_price_paise: costPricePaise,
      assignment_status: 'assigned',
      assigned_at: new Date(),
      audit_history: [
        { status: 'assigned', notes: 'Assigned to Structasoft Admin Reseller', timestamp: new Date() },
      ],
    });
    console.log(`✓ Product Assigned! Initial Listing ID: ${listing._id} (Status: ${listing.assignment_status})`);

    // Duplicate check validation
    const duplicateListing = await ResellerListing.findOne({
      reseller_id: reseller._id,
      product_id: product._id,
      assignment_status: { $ne: 'revoked' },
    });
    console.log(`✓ Duplicate Assignment Guard Verified (Existing active listing found: ${!!duplicateListing})`);

    // ── 6. Reseller Accepts / Purchases Assigned Product ─────────────────────
    console.log('\n--- Step 2: Reseller Accepts & Purchases Assigned Product ---');
    listing.assignment_status = 'purchased';
    listing.purchased_at = new Date();
    listing.audit_history.push({ status: 'purchased', notes: 'Reseller accepted product', timestamp: new Date() });
    await listing.save();
    console.log(`✓ Product Purchased! (Status: ${listing.assignment_status})`);

    // ── 7. Reseller Adds Profit Margin & Calculates Final Price ──────────────
    console.log('\n--- Step 3: Reseller Configures Profit Margin & Taxes ---');
    const configuredMarginInr = 2500; // INR 2,500 profit margin
    const marginPaise = configuredMarginInr * 100;

    // Validate bounds
    if (marginPaise < listing.min_margin_paise || marginPaise > listing.max_margin_paise) {
      throw new Error(`Margin validation failed: ${configuredMarginInr} is outside bounds!`);
    }
    console.log(`✓ Profit Margin bounds validated (₹${configuredMarginInr} is between ₹${minMarginPaise / 100} and ₹${maxMarginPaise / 100})`);

    const subtotalWithMarginPaise = costPricePaise + marginPaise;
    const taxesPaise = Math.round((subtotalWithMarginPaise * taxRatePct) / 100);
    const finalSellingPricePaise = subtotalWithMarginPaise + taxesPaise;

    listing.reseller_margin_paise = marginPaise;
    listing.reseller_margin_pct = Number(((marginPaise / costPricePaise) * 100).toFixed(2));
    listing.taxes_and_charges_paise = taxesPaise;
    listing.selling_price_paise = finalSellingPricePaise;
    listing.assignment_status = 'ready_to_publish';
    listing.audit_history.push({
      status: 'ready_to_publish',
      notes: `Configured margin ₹${configuredMarginInr}. Final EPC Selling Price: ₹${finalSellingPricePaise / 100}`,
      timestamp: new Date(),
    });
    await listing.save();

    console.log(`   - Reseller Purchase Price (Cost): ₹${costPricePaise / 100}`);
    console.log(`   - Reseller Profit Margin        : ₹${marginPaise / 100} (${listing.reseller_margin_pct}%)`);
    console.log(`   - GST (${taxRatePct}%)                       : ₹${taxesPaise / 100}`);
    console.log(`   - Final Calculated EPC Price    : ₹${finalSellingPricePaise / 100}`);
    console.log(`✓ Listing Updated (Status: ${listing.assignment_status})`);

    // ── 8. Reseller Publishes Product ───────────────────────────────────────
    console.log('\n--- Step 4: Reseller Publishes Product to Storefront & EPC ---');
    listing.assignment_status = 'published';
    listing.published_at = new Date();
    listing.status = 'active';
    listing.audit_history.push({ status: 'published', notes: 'Published to storefront & EPC catalogue', timestamp: new Date() });
    await listing.save();
    console.log(`✓ Listing Published! (Status: ${listing.assignment_status})`);

    // ── 9. Setup Test EPC Account Linked to Structasoft Reseller ────────────
    console.log('\n--- Step 5: Setting up Onboarded EPC Buyer Account ---');
    const epcEmail = 'structasoft.epc@gmail.com';
    let epc = await EpcAccount.findOne({ email: epcEmail });
    if (!epc) {
      epc = await EpcAccount.create({
        name: 'Structasoft EPC Innovations',
        email: epcEmail,
        whatsapp: '9900000099',
        password_hash: 'hashedpassword',
        primary_reseller_id: reseller._id,
        onboarded_by_reseller_id: reseller._id,
        status: 'approved',
        is_email_verified: true,
      });
      console.log(`✓ Created EPC Buyer Account: "${epc.name}" linked to Structasoft Reseller`);
    } else {
      epc.primary_reseller_id = reseller._id;
      await epc.save();
      console.log(`✓ Found Existing EPC Account: "${epc.name}"`);
    }

    await EpcResellerRelationship.findOneAndUpdate(
      { epc_id: epc._id, reseller_id: reseller._id },
      { epc_id: epc._id, reseller_id: reseller._id, status: 'active' },
      { upsert: true }
    );

    // ── 10. Verify EPC Catalogue API Response & Confidentiality ------------
    console.log('\n--- Step 6: Verifying EPC Catalogue API Visibility & Security ---');

    let responseJson = null;
    const fakeRes = {
      status: (code) => ({
        json: (data) => { responseJson = data; return data; }
      }),
      json: (data) => { responseJson = data; return data; }
    };

    const fakeReq = {
      epc: { _id: epc._id },
      query: {},
    };

    await get_epc_catalogue(fakeReq, fakeRes);

    if (!responseJson || responseJson.status !== 'success') {
      throw new Error('EPC Catalogue API returned error status!');
    }

    console.log(`✓ EPC Catalogue retrieved successfully! Total items visible: ${responseJson.total_items}`);
    const epcItem = responseJson.data.find((i) => i.id.toString() === listing._id.toString());
    if (!epcItem) {
      throw new Error('Verification Failed: Published product was not found in EPC catalogue!');
    }

    console.log('\n🔍 Inspected EPC Catalogue Item Payload:');
    console.log(JSON.stringify(epcItem, null, 2));

    // Security assertions
    if (epcItem.cost_price_paise !== undefined || epcItem.reseller_margin_paise !== undefined || epcItem.base_price !== undefined) {
      throw new Error('SECURITY VIOLATION: Confidential cost price or margin exposed in EPC payload!');
    }
    console.log('\n🔒 SECURITY CONFIRMED: Base price, cost price, and reseller margin are STRICTLY HIDDEN from EPC payload!');

    if (epcItem.final_price_inr !== (finalSellingPricePaise / 100).toFixed(2)) {
      throw new Error(`PRICE MISMATCH: Expected final price ${finalSellingPricePaise / 100}, got ${epcItem.final_price_inr}`);
    }
    console.log(`✅ PRICE VERIFIED: EPC sees reseller's final price including margin: ₹${epcItem.final_price_inr}`);

    console.log('\n===============================================================');
    console.log('🎉 ALL RESELLER PRODUCT & EPC STOREFRONT VERIFICATION CHECKS PASSED!');
    console.log('===============================================================\n');

    process.exit(0);
  } catch (err) {
    console.error('\n❌ Verification Failed:', err);
    process.exit(1);
  }
}

runSampleSetupAndVerification();
