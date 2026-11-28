/**
 * test_insights_ai.js
 * Comprehensive automated test suite for Main Admin Dashboard Insights & Suggestive AI
 */

require('dotenv').config();
const { india_solarshop_db } = require('../src/config/databases');
const controller = require('../src/modules/admin-panel/controller/main.dashboard.controller');
const AdminNotification = require('../src/modules/admin-panel/models/india_solarshop_db/admin_notifications.schema');

let passed = 0;
let failed = 0;

function assert(desc, condition, details = '') {
  if (condition) {
    console.log(`  ✅ ${desc}`);
    passed++;
  } else {
    console.error(`  ❌ FAIL: ${desc} ${details ? `(${details})` : ''}`);
    failed++;
  }
}

india_solarshop_db.connection.once('open', async () => {
  try {
    console.log('\n======================================================');
    console.log('   TEST SUITE: ADMIN INSIGHTS & SUGGESTIVE AI');
    console.log('======================================================\n');

    // ── Test 1: Global Unfiltered Insights Payload ──
    console.log('1. Testing Unfiltered get_insights_ai() Execution:');
    let capturedData = null;
    let capturedCode = null;

    const mockReq = { query: { state: 'all' } };
    const mockRes = {
      status(c) { capturedCode = c; return this; },
      json(payload) { capturedData = payload; return this; },
    };

    await controller.get_insights_ai(mockReq, mockRes);

    assert('Response success is true', capturedData?.success === true);
    assert('Overview payload structure exists', typeof capturedData?.data?.overview === 'object');
    assert('Cluster Potential rows exist', Array.isArray(capturedData?.data?.clusterPotential));
    assert('Campaign Suggestions array exists', Array.isArray(capturedData?.data?.campaignSuggestions));
    assert('3-Month Goals array exists', Array.isArray(capturedData?.data?.threeMonthGoals));
    assert('Kit Rankings object exists with all 4 views',
      Array.isArray(capturedData?.data?.kitRankings?.clusterActive) &&
      Array.isArray(capturedData?.data?.kitRankings?.clusterPotential) &&
      Array.isArray(capturedData?.data?.kitRankings?.stateActive) &&
      Array.isArray(capturedData?.data?.kitRankings?.statePotential)
    );

    // ── Test 2: Field Integrity of Cluster Potential Rows ──
    console.log('\n2. Testing Cluster Potential Fields & Business Logic:');
    const clusters = capturedData.data.clusterPotential;
    assert('Clusters list is populated', clusters.length > 0, `Got: ${clusters.length}`);

    if (clusters.length > 0) {
      const sample = clusters[0];
      assert('Contains cluster name', Boolean(sample.cluster));
      assert('Contains state name', Boolean(sample.state));
      assert('Contains MIS potential number', typeof sample.misPotential === 'number');
      assert('Contains Registered EPCs count', typeof sample.registeredEpcs === 'number');
      assert('Contains Verified EPCs count', typeof sample.verifiedEpcs === 'number');
      assert('Contains Active EPCs count', typeof sample.activeEpcs === 'number');
      assert('Contains Franchisee Availability status', ['Available', 'Not Available'].includes(sample.franchiseeAvailability));
      assert('Contains EPC target (default 50 or goal)', sample.epcTarget >= 50);
      assert('Contains Remaining Gap = max(Target - Achievement, 0)', sample.epcGap === Math.max(0, sample.epcTarget - sample.epcAchievement));
      assert('Contains valid conditionType', ['NEW_OPPORTUNITY', 'BUILDING_PIPELINE', 'CAMPAIGN_REQUIRED', 'TARGET_ACHIEVED'].includes(sample.conditionType));
      assert('Contains traceable suggestedAction text', typeof sample.suggestedAction === 'string' && sample.suggestedAction.length > 10);
    }

    // ── Test 3: Campaign Suggestions Logic ──
    console.log('\n3. Testing Campaign Suggestions (Existing Franchisees with Gap):');
    const campaigns = capturedData.data.campaignSuggestions;
    campaigns.forEach((camp) => {
      assert(`Cluster ${camp.cluster} has target gap`, camp.remainingEpcTarget > 0);
      assert(`Cluster ${camp.cluster} specifies META campaign`, camp.suggestedCampaign.includes('META'));
      assert(`Cluster ${camp.cluster} has target duration 3 Months`, camp.targetDuration === '3 Months');
      assert(`Cluster ${camp.cluster} has franchisee attributed`, Boolean(camp.franchisee && camp.franchisee !== 'Not Available'));
    });

    // ── Test 4: Three-Month Active EPC Goal Tracking Math ──
    console.log('\n4. Testing Three-Month Active EPC Goal Tracking Calculations:');
    const goals = capturedData.data.threeMonthGoals;
    goals.forEach((g) => {
      assert(`Goal for ${g.franchisee} has 90-day window`, Boolean(g.goalStartDate && g.goalEndDate));
      assert(`Days remaining is numeric and non-negative`, typeof g.remainingDays === 'number' && g.remainingDays >= 0);
      assert(`Remaining target math is correct`, g.remainingEpcTarget === Math.max(0, g.activeEpcTarget - g.currentActiveEpcs));
      assert(`Achievement percentage calculation is correct`,
        g.achievementPercentage === (g.activeEpcTarget > 0 ? Math.min(100, Math.round((g.currentActiveEpcs / g.activeEpcTarget) * 100)) : 0)
      );
      assert(`Monthly progress has 3 milestones`, Array.isArray(g.monthlyProgress) && g.monthlyProgress.length === 3);
    });

    // ── Test 4b: Specific Verification for Real Franchisees (Alex Khan & Gujarat SolarTech) ──
    console.log('\n4b. Verifying Authentic Buyer Counts for Alex Khan & Gujarat SolarTech:');
    const alexGoal = goals.find((g) => g.franchisee.toLowerCase().includes('alex'));
    assert('Alex Khan 3-Month Goal found', Boolean(alexGoal));
    if (alexGoal) {
      assert('Alex Khan Current Active is 6 (matches Franchisee Portal)', alexGoal.currentActiveEpcs === 6, `Got: ${alexGoal.currentActiveEpcs}`);
      assert('Alex Khan New Registered is 6', alexGoal.newEpcRegistrations === 6, `Got: ${alexGoal.newEpcRegistrations}`);
      assert('Alex Khan Newly Verified is 6', alexGoal.newlyVerifiedEpcs === 6, `Got: ${alexGoal.newlyVerifiedEpcs}`);
      assert('Alex Khan Newly Activated is 6', alexGoal.newlyActivatedEpcs === 6, `Got: ${alexGoal.newlyActivatedEpcs}`);
      assert('Alex Khan Remaining Target is 99 (105 - 6)', alexGoal.remainingEpcTarget === 99, `Got: ${alexGoal.remainingEpcTarget}`);
      assert('Alex Khan Month 1 has 6 registrations', alexGoal.monthlyProgress[0]?.registrations === 6, `Got: ${alexGoal.monthlyProgress[0]?.registrations}`);
    }

    const gujGoal = goals.find((g) => g.franchisee.toLowerCase().includes('gujarat'));
    assert('Gujarat SolarTech 3-Month Goal found', Boolean(gujGoal));
    if (gujGoal) {
      assert('Gujarat SolarTech Current Active is 4 (matches DB records)', gujGoal.currentActiveEpcs === 4, `Got: ${gujGoal.currentActiveEpcs}`);
      assert('Gujarat SolarTech New Registered is 4', gujGoal.newEpcRegistrations === 4, `Got: ${gujGoal.newEpcRegistrations}`);
      assert('Gujarat SolarTech Newly Verified is 4', gujGoal.newlyVerifiedEpcs === 4, `Got: ${gujGoal.newlyVerifiedEpcs}`);
      assert('Gujarat SolarTech Newly Activated is 4', gujGoal.newlyActivatedEpcs === 4, `Got: ${gujGoal.newlyActivatedEpcs}`);
      assert('Gujarat SolarTech Remaining Target is 96 (100 - 4)', gujGoal.remainingEpcTarget === 96, `Got: ${gujGoal.remainingEpcTarget}`);
      assert('Gujarat SolarTech Month 1 has 4 registrations', gujGoal.monthlyProgress[0]?.registrations === 4, `Got: ${gujGoal.monthlyProgress[0]?.registrations}`);
    }

    // ── Test 5: Kit Sales Potential & Ranking Sorting ──
    console.log('\n5. Testing Kit Sales Potential & Ranking Correctness:');
    const clusterActive = capturedData.data.kitRankings.clusterActive;
    const clusterPotential = capturedData.data.kitRankings.clusterPotential;
    const stateActive = capturedData.data.kitRankings.stateActive;
    const statePotential = capturedData.data.kitRankings.statePotential;

    if (clusterActive.length > 0) {
      assert('Active kit rows contain confirmedQuantity and confirmedOrderValue',
        typeof clusterActive[0].confirmedQuantity === 'number' && typeof clusterActive[0].confirmedOrderValue === 'number'
      );
      assert('Active kit rows contain capacity and SKU', Boolean(clusterActive[0].capacity && clusterActive[0].sku));
    }

    if (clusterPotential.length > 0) {
      assert('Potential kit rows contain pendingKitDemand and potentialOrderValue',
        typeof clusterPotential[0].pendingKitDemand === 'number' && typeof clusterPotential[0].potentialOrderValue === 'number'
      );
      assert('Potential kit rows contain enquiryCount and quotationCount',
        typeof clusterPotential[0].enquiryCount === 'number' && typeof clusterPotential[0].quotationCount === 'number'
      );
    }

    // ── Test 6: State Filter Compatibility ──
    console.log('\n6. Testing State Filter Compatibility (e.g. state=Gujarat):');
    let stateData = null;
    const stateReq = { query: { state: 'Gujarat' } };
    const stateRes = {
      status() { return this; },
      json(p) { stateData = p; return this; },
    };
    await controller.get_insights_ai(stateReq, stateRes);

    const gujClusters = stateData?.data?.clusterPotential || [];
    const nonGujClusters = gujClusters.filter((c) => c.state.toLowerCase() !== 'gujarat');
    assert('State filter restricts cluster list to Gujarat only', nonGujClusters.length === 0, `Found non-Gujarat: ${nonGujClusters.length}`);

    // ── Test 7: Deduplication of Admin Notifications ──
    console.log('\n7. Testing Notification Deduplication Prevention:');
    const notifCountBefore = await AdminNotification.countDocuments({
      'metadata.alert_type': 'franchisee_epc_acquisition',
      is_read: false,
    });

    // Second call with same parameters
    await controller.get_insights_ai(mockReq, mockRes);

    const notifCountAfter = await AdminNotification.countDocuments({
      'metadata.alert_type': 'franchisee_epc_acquisition',
      is_read: false,
    });

    assert('Repeated dashboard requests do NOT spawn duplicate unread alerts', notifCountAfter === notifCountBefore,
      `Before: ${notifCountBefore}, After: ${notifCountAfter}`
    );

    // ── Test 8: Dynamic Min EPCs Threshold (e.g. minEpcs=10 in Gujarat) ──
    console.log('\n8. Testing Dynamic Min EPCs Threshold (minEpcs=10, Gujarat):');
    let thresholdData = null;
    const thresholdReq = { query: { state: 'Gujarat', minEpcs: 10 } };
    const thresholdRes = {
      status() { return this; },
      json(p) { thresholdData = p; return this; },
    };
    await controller.get_insights_ai(thresholdReq, thresholdRes);

    const gujThresholdClusters = thresholdData?.data?.clusterPotential || [];
    const dangCluster = gujThresholdClusters.find((c) => c.cluster.toLowerCase().includes('dang'));

    assert('Dang Region found in Gujarat', Boolean(dangCluster));
    if (dangCluster) {
      assert('Dang Region has 10 registered EPCs', dangCluster.registeredEpcs === 10, `Got: ${dangCluster.registeredEpcs}`);
      assert('Dang Region has State = Gujarat', dangCluster.state.toLowerCase() === 'gujarat', `Got: ${dangCluster.state}`);
      assert('Dang Region is identified as NEW_OPPORTUNITY at benchmark 10', dangCluster.conditionType === 'NEW_OPPORTUNITY', `Got: ${dangCluster.conditionType}`);
      assert('Dang Region action badge is New Franchisee Opportunity', dangCluster.actionBadge === 'New Franchisee Opportunity');
    }

    assert('Overview reports at least 1 new franchisee opportunity at benchmark 10',
      thresholdData?.data?.overview?.newFranchiseeOpportunities >= 1,
      `Got: ${thresholdData?.data?.overview?.newFranchiseeOpportunities}`
    );

    console.log('\n======================================================');
    console.log(`   TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
    console.log('======================================================\n');

    process.exit(failed > 0 ? 1 : 0);
  } catch (err) {
    console.error('Fatal test error:', err);
    process.exit(1);
  }
});
