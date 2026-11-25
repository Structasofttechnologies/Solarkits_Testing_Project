require('dotenv').config();
const dns = require('dns');
dns.setServers(['8.8.8.8', '1.1.1.1']);
const mongoose = require('mongoose');

async function cleanDummyResellers() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("Connected to MongoDB for cleanup");

    const indiaDb = require('../modules/admin-panel/models/india_solarshop_db');
    const {
      Reseller,
      ResellerKyc,
      ResellerAgreement,
      ResellerPlanSubscription,
      ResellerWallet,
      ResellerWalletLedger,
      ResellerPayoutRequest,
      ResellerProductAuthorization,
      ResellerTerritory,
      ResellerListing,
      ResellerInventoryLedger,
      EpcResellerRelationship
    } = indiaDb;

    // Identify dummy resellers by email pattern or name
    const dummyQuery = {
      $or: [
        { email: { $regex: /@solarkits\.dev$/i } },
        { email: { $regex: /@solarkits\.in$/i } },
        { email: { $regex: /@test\.com$/i } },
        { business_name: { $in: ['Alpha Solar Dealership', 'Beta Solar Network', 'SunRise Solar Pvt. Ltd.', 'Green Power Dealers', 'QA Test Reseller Solar Pvt Ltd', 'Surat SolarTech Enterprises', 'Maharashtra GreenPower Grid', 'Apex Solar Dynamics North India'] } }
      ]
    };

    const dummyResellers = await Reseller.find(dummyQuery).lean();
    console.log(`Found ${dummyResellers.length} dummy reseller accounts to remove.`);

    const dummyIds = dummyResellers.map(r => r._id);

    if (dummyIds.length > 0) {
      const kycRes = await ResellerKyc.deleteMany({ reseller_id: { $in: dummyIds } });
      console.log(`Deleted KYC records: ${kycRes.deletedCount}`);

      const agrRes = await ResellerAgreement.deleteMany({ reseller_id: { $in: dummyIds } });
      console.log(`Deleted Agreements: ${agrRes.deletedCount}`);

      const subRes = await ResellerPlanSubscription.deleteMany({ reseller_id: { $in: dummyIds } });
      console.log(`Deleted Subscriptions: ${subRes.deletedCount}`);

      const walRes = await ResellerWallet.deleteMany({ reseller_id: { $in: dummyIds } });
      console.log(`Deleted Wallets: ${walRes.deletedCount}`);

      const ledRes = await ResellerWalletLedger.deleteMany({ reseller_id: { $in: dummyIds } });
      console.log(`Deleted Wallet Ledgers: ${ledRes.deletedCount}`);

      const payRes = await ResellerPayoutRequest.deleteMany({ reseller_id: { $in: dummyIds } });
      console.log(`Deleted Payout Requests: ${payRes.deletedCount}`);

      const authRes = await ResellerProductAuthorization.deleteMany({ reseller_id: { $in: dummyIds } });
      console.log(`Deleted Product Authorizations: ${authRes.deletedCount}`);

      const terRes = await ResellerTerritory.deleteMany({ reseller_id: { $in: dummyIds } });
      console.log(`Deleted Territories: ${terRes.deletedCount}`);

      const listRes = await ResellerListing.deleteMany({ reseller_id: { $in: dummyIds } });
      console.log(`Deleted Listings: ${listRes.deletedCount}`);

      const invRes = await ResellerInventoryLedger.deleteMany({ reseller_id: { $in: dummyIds } });
      console.log(`Deleted Inventory Ledgers: ${invRes.deletedCount}`);

      const epcRes = await EpcResellerRelationship.deleteMany({ reseller_id: { $in: dummyIds } });
      console.log(`Deleted EPC Relationships: ${epcRes.deletedCount}`);

      const delRes = await Reseller.deleteMany({ _id: { $in: dummyIds } });
      console.log(`Deleted Reseller Accounts: ${delRes.deletedCount}`);
    }

    const remainingResellers = await Reseller.find({}).lean();
    console.log(`\n=== Remaining Resellers (${remainingResellers.length}) ===`);
    remainingResellers.forEach((r, i) => {
      console.log(`[${i + 1}] ID: ${r._id} | Business: ${r.business_name} | Contact: ${r.contact_person} | Email: ${r.email} | Mobile: ${r.mobile} | Status: ${r.activation_status}`);
    });

    await mongoose.disconnect();
    console.log("Cleanup completed successfully!");
  } catch (err) {
    console.error("Cleanup error:", err);
  }
}

cleanDummyResellers();
