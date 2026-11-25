require('dotenv').config();
const dns = require('dns');
dns.setServers(['8.8.8.8', '1.1.1.1']);
const mongoose = require('mongoose');

async function cleanBdeData() {
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
      BDEProfile,
      BDEKYC,
      BDETerritoryAssignment,
      BDEPlanAssignment,
      BDEGoal,
      BDEActivityLog,
      BDENotification,
      BDELead,
      BDELeadActivity,
      BDEFollowUp,
      BDEReassignmentHistory,
      TerritoryExceptionRequest,
    } = indiaDb;

    // 1. Fetch current counts
    const bdeCount = await BDEProfile.countDocuments({});
    const kycCount = await BDEKYC.countDocuments({});
    const territoryCount = await BDETerritoryAssignment.countDocuments({});
    const planAssignCount = await BDEPlanAssignment.countDocuments({});
    const goalCount = await BDEGoal.countDocuments({});
    const logCount = await BDEActivityLog.countDocuments({});
    const notifCount = await BDENotification.countDocuments({});
    const leadCount = await BDELead.countDocuments({});
    const leadActCount = await BDELeadActivity.countDocuments({});
    const followUpCount = await BDEFollowUp.countDocuments({});
    const reassignCount = await BDEReassignmentHistory.countDocuments({});
    const exceptionCount = await TerritoryExceptionRequest.countDocuments({});

    console.log("\n=================== BEFORE BDE CLEANUP ===================");
    console.log(`- BDE Profiles:                 ${bdeCount}`);
    console.log(`- BDE KYC Documents:            ${kycCount}`);
    console.log(`- BDE Territory Assignments:    ${territoryCount}`);
    console.log(`- BDE Plan Assignments:         ${planAssignCount}`);
    console.log(`- BDE Goals:                    ${goalCount}`);
    console.log(`- BDE Activity Logs:            ${logCount}`);
    console.log(`- BDE Notifications:            ${notifCount}`);
    console.log(`- BDE Leads:                    ${leadCount}`);
    console.log(`- BDE Lead Activities:          ${leadActCount}`);
    console.log(`- BDE Follow-ups:               ${followUpCount}`);
    console.log(`- BDE Reassignment History:     ${reassignCount}`);
    console.log(`- Territory Exception Requests: ${exceptionCount}`);
    console.log("==========================================================\n");

    // 2. Perform Deletion
    console.log("Deleting all BDE profiles...");
    const delProfiles = await BDEProfile.deleteMany({});

    console.log("Deleting all BDE KYC records...");
    const delKyc = await BDEKYC.deleteMany({});

    console.log("Deleting BDE territory & plan assignments...");
    const delTerr = await BDETerritoryAssignment.deleteMany({});
    const delPlan = await BDEPlanAssignment.deleteMany({});

    console.log("Deleting BDE goals, activities & notifications...");
    const delGoals = await BDEGoal.deleteMany({});
    const delLogs = await BDEActivityLog.deleteMany({});
    const delNotif = await BDENotification.deleteMany({});

    console.log("Deleting BDE leads, lead activities, follow-ups & reassignment history...");
    const delLeads = await BDELead.deleteMany({});
    const delLeadActs = await BDELeadActivity.deleteMany({});
    const delFollowUps = await BDEFollowUp.deleteMany({});
    const delReassign = await BDEReassignmentHistory.deleteMany({});
    const delExceptions = await TerritoryExceptionRequest.deleteMany({});

    console.log("\n=================== BDE CLEANUP SUMMARY ===================");
    console.log(`✅ Deleted ${delProfiles.deletedCount} BDE Profiles`);
    console.log(`✅ Deleted ${delKyc.deletedCount} BDE KYC Records`);
    console.log(`✅ Deleted ${delTerr.deletedCount} Territory Assignments`);
    console.log(`✅ Deleted ${delPlan.deletedCount} Plan Assignments`);
    console.log(`✅ Deleted ${delGoals.deletedCount} Goals`);
    console.log(`✅ Deleted ${delLogs.deletedCount} Activity Logs`);
    console.log(`✅ Deleted ${delNotif.deletedCount} Notifications`);
    console.log(`✅ Deleted ${delLeads.deletedCount} BDE Leads`);
    console.log(`✅ Deleted ${delLeadActs.deletedCount} Lead Activities`);
    console.log(`✅ Deleted ${delFollowUps.deletedCount} Follow-ups`);
    console.log(`✅ Deleted ${delReassign.deletedCount} Reassignments`);
    console.log(`✅ Deleted ${delExceptions.deletedCount} Exception Requests`);
    console.log("===========================================================\n");

    console.log("All BDE executive records and related data have been completely removed from the database!");
    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error("Error during BDE cleanup:", error);
    process.exit(1);
  }
}

cleanBdeData();
