require('dotenv').config();
const dns = require('dns');
dns.setServers(['8.8.8.8', '1.1.1.1']);
const mongoose = require('mongoose');

async function cleanFranchiseData() {
  try {
    const uri = process.env.MONGODB_URI;
    if (!uri) {
      console.error("MONGODB_URI not found in env");
      process.exit(1);
    }

    console.log("Connecting to database...");
    await mongoose.connect(uri);
    console.log("Connected successfully!");

    const indiaDb = require('../modules/admin-panel/models/india_solarshop_db');
    const {
      FranchiseLead,
      Reseller,
      ResellerKyc,
      ResellerPlanSubscription,
      ResellerAgreement,
      ResellerTerritory,
      TerritoryAssignmentHistory,
      ResellerWallet,
      ResellerWalletLedger,
      ResellerProductAuthorization,
      ResellerListing,
      ResellerProcurementOrder,
      ResellerInventoryLedger,
      ResellerPayoutRequest,
      StoreSetup,
      StoreSetupChecklist,
      StoreSetupDelay,
      StoreSetupVerification,
      ExpansionPlan,
      FranchiseeTargetProgress,
      FpoOrder,
      FpoCommissionLedger,
      FranchiseeAlert,
      GstVerificationLog,
    } = indiaDb;

    // 1. Fetch current counts
    const leadCount = await FranchiseLead.countDocuments({});
    const resellerCount = await Reseller.countDocuments({});
    const kycCount = await ResellerKyc.countDocuments({});
    const subCount = await ResellerPlanSubscription.countDocuments({});
    const agreementCount = await ResellerAgreement.countDocuments({});
    const territoryCount = await ResellerTerritory.countDocuments({});
    const territoryHistoryCount = await TerritoryAssignmentHistory.countDocuments({});
    const walletCount = await ResellerWallet.countDocuments({});
    const walletLedgerCount = await ResellerWalletLedger.countDocuments({});
    const prodAuthCount = await ResellerProductAuthorization.countDocuments({});
    const storeSetupCount = await StoreSetup.countDocuments({});
    const expansionPlanCount = await ExpansionPlan.countDocuments({});
    const fpoOrderCount = await FpoOrder.countDocuments({});

    console.log("\n=================== BEFORE CLEANUP ===================");
    console.log(`- Franchise Leads:              ${leadCount}`);
    console.log(`- Reseller/Franchise Accounts:  ${resellerCount}`);
    console.log(`- Reseller KYC Records:         ${kycCount}`);
    console.log(`- Plan Subscriptions:           ${subCount}`);
    console.log(`- Reseller Agreements:          ${agreementCount}`);
    console.log(`- Reseller Territories:         ${territoryCount}`);
    console.log(`- Territory Assignment History: ${territoryHistoryCount}`);
    console.log(`- Reseller Wallets:             ${walletCount}`);
    console.log(`- Reseller Wallet Ledgers:      ${walletLedgerCount}`);
    console.log(`- Product Authorizations:       ${prodAuthCount}`);
    console.log(`- Store Setup Records:          ${storeSetupCount}`);
    console.log(`- Expansion Plans:              ${expansionPlanCount}`);
    console.log(`- FPO Orders:                   ${fpoOrderCount}`);
    console.log("======================================================\n");

    // 2. Perform Clean-up
    console.log("Deleting all Franchise Leads...");
    const delLeads = await FranchiseLead.deleteMany({});

    console.log("Deleting all Reseller / Franchise Accounts...");
    const delResellers = await Reseller.deleteMany({});

    console.log("Deleting associated KYC records...");
    const delKyc = await ResellerKyc.deleteMany({});

    console.log("Deleting plan subscriptions...");
    const delSubs = await ResellerPlanSubscription.deleteMany({});

    console.log("Deleting reseller agreements...");
    const delAgreements = await ResellerAgreement.deleteMany({});

    console.log("Deleting territory assignments & history...");
    const delTerritories = await ResellerTerritory.deleteMany({});
    const delTerrHist = await TerritoryAssignmentHistory.deleteMany({});

    console.log("Deleting wallets & wallet ledgers...");
    const delWallets = await ResellerWallet.deleteMany({});
    const delWalletLedgers = await ResellerWalletLedger.deleteMany({});
    const delPayouts = await ResellerPayoutRequest.deleteMany({});

    console.log("Deleting product authorizations & listings...");
    const delProdAuth = await ResellerProductAuthorization.deleteMany({});
    const delListings = await ResellerListing.deleteMany({});
    const delProcOrders = await ResellerProcurementOrder.deleteMany({});
    const delInvLedgers = await ResellerInventoryLedger.deleteMany({});

    console.log("Deleting store setups, checklists, delays & verifications...");
    const delStoreSetups = await StoreSetup.deleteMany({});
    const delChecklists = await StoreSetupChecklist.deleteMany({});
    const delDelays = await StoreSetupDelay.deleteMany({});
    const delVerifications = await StoreSetupVerification.deleteMany({});
    const delExpPlans = await ExpansionPlan.deleteMany({});

    console.log("Deleting FPO orders, commission ledgers, target progress & alerts...");
    const delFpo = await FpoOrder.deleteMany({});
    const delFpoLedgers = await FpoCommissionLedger.deleteMany({});
    const delTargets = await FranchiseeTargetProgress.deleteMany({});
    const delAlerts = await FranchiseeAlert.deleteMany({});

    console.log("\n=================== CLEANUP SUMMARY ===================");
    console.log(`✅ Deleted ${delLeads.deletedCount} Franchise Leads`);
    console.log(`✅ Deleted ${delResellers.deletedCount} Reseller / Franchise Accounts`);
    console.log(`✅ Deleted ${delKyc.deletedCount} KYC Records`);
    console.log(`✅ Deleted ${delSubs.deletedCount} Plan Subscriptions`);
    console.log(`✅ Deleted ${delAgreements.deletedCount} Agreements`);
    console.log(`✅ Deleted ${delTerritories.deletedCount} Territory Rules`);
    console.log(`✅ Deleted ${delTerrHist.deletedCount} Territory Histories`);
    console.log(`✅ Deleted ${delWallets.deletedCount} Wallets`);
    console.log(`✅ Deleted ${delWalletLedgers.deletedCount} Wallet Ledgers`);
    console.log(`✅ Deleted ${delProdAuth.deletedCount} Product Authorizations`);
    console.log(`✅ Deleted ${delStoreSetups.deletedCount} Store Setups`);
    console.log(`✅ Deleted ${delExpPlans.deletedCount} Expansion Plans`);
    console.log(`✅ Deleted ${delFpo.deletedCount} FPO Orders`);
    console.log("=======================================================\n");

    console.log("All test franchise leads, accounts and related data have been completely cleaned from the database!");
    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error("Error during cleanup:", error);
    process.exit(1);
  }
}

cleanFranchiseData();
