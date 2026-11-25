require('dotenv').config({ path: '.env' });
const dns = require('dns');
dns.setServers(['8.8.8.8', '8.8.4.4', '1.1.1.1']);
const mongoose = require('mongoose');

const MONGODB_URI = process.env.MONGODB_URI;

async function diagnose() {
  await mongoose.connect(MONGODB_URI);
  const db = mongoose.connection.db;
  
  // Get the reseller listing in detail
  const listing = await db.collection('reseller_listings').findOne({ _id: new mongoose.Types.ObjectId('6a7d8894143dc752360b126d') });
  console.log('\n=== RESELLER LISTING DETAIL ===');
  console.log(JSON.stringify({
    _id: listing._id,
    reseller_id: listing.reseller_id,
    product_id: listing.product_id,
    assignment_status: listing.assignment_status,
    status: listing.status,
    stock_quantity: listing.stock_quantity,
    selling_price_paise: listing.selling_price_paise,
    industry_type_id: listing.industry_type_id,
    title: listing.title
  }, null, 2));
  
  // Get the product
  const productId = new mongoose.Types.ObjectId(listing.product_id.toString());
  const product = await db.collection('products').findOne({ _id: productId });
  console.log('\n=== PRODUCT ===');
  console.log(JSON.stringify(product ? { _id: product._id, name: product.name, status: product.status, is_active: product.is_active, stock_quantity: product.stock_quantity } : 'NOT FOUND', null, 2));
  
  // Now simulate the EPC catalogue query
  const resellerId = new mongoose.Types.ObjectId('6a7d68f7cc9cdf9ebf46512a');
  const filter = {
    reseller_id: resellerId,
    assignment_status: 'published',
    status: 'active',
    stock_quantity: { $gt: 0 }
  };
  
  const catalogListings = await db.collection('reseller_listings').find(filter).toArray();
  console.log('\n=== EPC CATALOGUE QUERY RESULT ===');
  console.log('Total matching listings:', catalogListings.length);
  catalogListings.forEach(l => console.log(JSON.stringify({ _id: l._id, assignment_status: l.assignment_status, status: l.status, stock_quantity: l.stock_quantity })));

  // Check EPC account's reseller linking
  const epcAccount = await db.collection('epc_accounts').findOne({ email: 'structasoft.epc@gmail.com' });
  console.log('\n=== EPC ACCOUNT RESELLER LINKS ===');
  console.log({
    primary_reseller_id: epcAccount.primary_reseller_id?.toString(),
    onboarded_by_reseller_id: epcAccount.onboarded_by_reseller_id?.toString(),
    matches_listing_reseller: epcAccount.onboarded_by_reseller_id?.toString() === resellerId.toString()
  });

  // Check what happens in the epc.catalogue.handler.js - EpcAccount lookup
  // Using a token that contains account_id, check what model is used
  // The handler uses EpcAccount from admin-panel's india_solarshop_db - let's verify it gets the right account
  const epcByPrimaryReseller = await db.collection('epc_accounts').findOne({ primary_reseller_id: resellerId });
  console.log('\n=== EPC BY primary_reseller_id ===');
  console.log(epcByPrimaryReseller ? { _id: epcByPrimaryReseller._id, email: epcByPrimaryReseller.email } : 'NONE FOUND');

  const epcByOnboardedReseller = await db.collection('epc_accounts').findOne({ onboarded_by_reseller_id: resellerId });
  console.log('\n=== EPC BY onboarded_by_reseller_id ===');
  console.log(epcByOnboardedReseller ? { _id: epcByOnboardedReseller._id, email: epcByOnboardedReseller.email } : 'NONE FOUND');

  await mongoose.disconnect();
  console.log('\n✅ Diagnosis complete');
}

diagnose().catch(console.error);
