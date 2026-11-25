require('dotenv').config();
const dns = require('dns');
dns.setServers(['8.8.8.8', '1.1.1.1']);
const mongoose = require('mongoose');

async function run() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("Connected to DB");

    const indiaDb = require('../modules/admin-panel/models/india_solarshop_db');
    const Reseller = indiaDb.Reseller;

    const resellers = await Reseller.find({}).lean();
    console.log(`\n=== Total Resellers: ${resellers.length} ===`);
    resellers.forEach((r, i) => {
      console.log(`[${i + 1}] ID: ${r._id} | Business: ${r.business_name} | Contact: ${r.contact_person} | Email: ${r.email} | Mobile: ${r.mobile} | Status: ${r.activation_status}`);
    });

    const ResellerLead = mongoose.models.ResellerLead || mongoose.model('ResellerLead', new mongoose.Schema({}, { strict: false, collection: 'reseller_leads' }));
    const leads = await ResellerLead.find({}).lean();
    console.log(`\n=== Total Leads: ${leads.length} ===`);
    leads.forEach((l, i) => {
      console.log(`[${i + 1}] ID: ${l._id} | Name: ${l.fullName || l.businessName} | Email: ${l.email} | Status: ${l.status}`);
    });

    await mongoose.disconnect();
  } catch (err) {
    console.error(err);
  }
}

run();
