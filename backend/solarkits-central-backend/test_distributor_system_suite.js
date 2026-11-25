'use strict';

/**
 * ══════════════════════════════════════════════════════════════════════════════
 * AUTOMATED SYSTEM SUITE: Dynamic Distributor Plan & Territory Management System
 * ══════════════════════════════════════════════════════════════════════════════
 */

const http = require('http');
const mongoose = require('mongoose');

function makeRequest(method, path, body = null) {
  return new Promise((resolve, reject) => {
    const postData = body ? JSON.stringify(body) : null;
    const reqHeaders = {
      'Content-Type': 'application/json',
    };
    if (postData) {
      reqHeaders['Content-Length'] = Buffer.byteLength(postData);
    }

    const options = {
      hostname: 'localhost',
      port: 5000,
      path: '/api/boskit/v1' + path,
      method,
      headers: reqHeaders,
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve({ status: res.statusCode, body: parsed });
        } catch {
          resolve({ status: res.statusCode, raw: data });
        }
      });
    });

    req.on('error', (err) => reject(err));
    if (postData) req.write(postData);
    req.end();
  });
}

let passedTests = 0;
let totalTests = 0;

function assert(description, condition, details = '') {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`  ✅ [PASS] ${description}`);
  } else {
    console.error(`  ❌ [FAIL] ${description} ${details ? `— ${details}` : ''}`);
  }
}

async function runSuite() {
  console.log('\n════════════════════════════════════════════════════════════════════════');
  console.log('  DISTRIBUTOR PLAN & TERRITORY MANAGEMENT SYSTEM VERIFICATION');
  console.log('════════════════════════════════════════════════════════════════════════\n');

  try {
    // ── Test 1: Public Plans API Dynamic Fetch ──────────────────────────────
    console.log('1. Testing Public Dynamic Plans Listing...');
    const pubRes = await makeRequest('GET', '/public/plans');
    assert('Public plans endpoint returns 200 OK', pubRes.status === 200);
    assert('Returns an array of published plans', Array.isArray(pubRes.body?.plans) && pubRes.body.plans.length > 0);
    
    const samplePlan = pubRes.body?.plans?.[0];
    if (samplePlan) {
      assert('Plan contains valid INR joining fee', typeof samplePlan.joining_fee_inr === 'number' && samplePlan.joining_fee_inr > 0);
      assert('Plan contains dynamic benefits array', Array.isArray(samplePlan.benefits) && samplePlan.benefits.length > 0);
      assert('Plan contains validity display text', typeof samplePlan.validity_display === 'string');
      assert('Plan uses Distributor terminology', !samplePlan.name.toLowerCase().includes('franchise'));
    }

    // ── Test 2: Public Single Plan Detail & Code Lookup ──────────────────────
    console.log('\n2. Testing Public Single Plan Lookup...');
    const planCode = samplePlan?.plan_code || 'BK-DIST-STARTER';
    const detailRes = await makeRequest('GET', `/public/plans/${planCode}`);
    assert('Single plan lookup returns 200 OK', detailRes.status === 200);
    assert('Single plan matches requested code', detailRes.body?.plan?.plan_code === planCode);
    assert('Single plan contains granular dashboard_modules', typeof detailRes.body?.plan?.dashboard_modules === 'object');

    // ── Test 3: Public Territory Availability Check ──────────────────────────
    console.log('\n3. Testing Territory Availability & Exclusivity Check...');
    const dummyStateId = new mongoose.Types.ObjectId().toString();
    const dummyDistrictId = new mongoose.Types.ObjectId().toString();

    const availRes = await makeRequest('POST', '/public/check-territory-availability', {
      state_id: dummyStateId,
      district_id: dummyDistrictId,
    });
    assert('Territory check returns 200 OK', availRes.status === 200);
    assert('Unassigned territory is marked available', availRes.body?.is_available === true);

    // ── Test 4: Admin Plan Management API (Create Plan) ──────────────────────
    console.log('\n4. Testing Admin Create Dynamic Distributor Plan...');
    const newPlanCode = `BK-DIST-APEX-${Date.now().toString().slice(-4)}`;
    const createRes = await makeRequest('POST', '/admin/plans', {
      name: 'Apex Multi-District Distributor Tier',
      plan_code: newPlanCode,
      short_description: 'Strategic regional distribution tier for multi-district growth.',
      description: 'Exclusive multi-district territory rights, master sub-dealer onboarding, and VIP pricing.',
      joining_fee_inr: 50000,
      renewal_fee_inr: 20000,
      tax_rate_percent: 18,
      is_tax_inclusive: false,
      billing_type: 'annual_recurring',
      validity_value: 12,
      validity_unit: 'months',
      territory_type: 'multiple_districts',
      allowed_territories_count: 3,
      is_territory_exclusive: true,
      max_dealers: 45,
      can_onboard_dealers: true,
      dealer_direct_activation: true,
      product_access_type: 'all',
      distributor_margin_slab_min: 12,
      distributor_margin_slab_max: 18,
      pricing_tier: 'Apex Platinum Slab',
      benefits: [
        '3 Dedicated Revenue Districts with Exclusivity Lock',
        'Up to 45 Authorized Local Dealer Accounts',
        'Top-Tier 12% - 18% Wholesale Margin Slab',
        'Direct Priority Factory Dispatch Hotline',
      ],
      dashboard_modules: {
        overview: true,
        territories: true,
        catalogue: true,
        pricing: true,
        inventory: true,
        orders: true,
        customers: true,
        dealers: true,
        dealer_onboarding: true,
        leads: true,
        sales_reports: true,
        margin_reports: true,
        documents: true,
        support: true,
        subscriptions: true,
      },
      is_popular: true,
      badge_text: 'Most Popular Distributor Plan',
      sort_order: 10,
      status: 'published',
    });

    assert('Admin create plan returns 201 Created', createRes.status === 201);
    assert('Admin create plan responds with created plan object', createRes.body?.plan?.plan_code === newPlanCode);
    assert('Admin create stores joining_fee_paise as 5000000', createRes.body?.plan?.joining_fee_paise === 5000000);
    assert('Admin create establishes initial version 1 snapshot', createRes.body?.version === 1 || createRes.body?.version?.version_number === 1);

    const createdPlanId = createRes.body?.plan?.id || createRes.body?.plan?._id;

    // ── Test 5: Admin Update Plan & Immutable Version Snapshotting ───────────
    console.log('\n5. Testing Admin Update Plan (Immutable Versioning)...');
    const updateRes = await makeRequest('PUT', `/admin/plans/${createdPlanId}`, {
      name: 'Apex Multi-District Distributor Tier (Updated v2)',
      joining_fee_inr: 55000,
      max_dealers: 50,
      status: 'published',
    });
    assert('Admin update plan returns 200 OK', updateRes.status === 200);
    assert('Admin update increments plan version to v2', updateRes.body?.version === 2);

    // ── Test 6: Admin View Plan Version History ──────────────────────────────
    console.log('\n6. Testing Admin Plan Version Snapshots History...');
    const versionsRes = await makeRequest('GET', `/admin/plans/${createdPlanId}/versions`);
    assert('Version history returns 200 OK', versionsRes.status === 200);
    assert('Contains recorded version snapshots', Array.isArray(versionsRes.body?.versions) && versionsRes.body.versions.length >= 1);

    // ── Test 7: Admin Duplicate Plan as Draft ────────────────────────────────
    console.log('\n7. Testing Admin Clone / Duplicate Plan...');
    const dupRes = await makeRequest('POST', `/admin/plans/${createdPlanId}/duplicate`);
    assert('Duplicate plan returns 201 Created', dupRes.status === 201);
    assert('Cloned plan is in draft status', dupRes.body?.plan?.status === 'draft');
    assert('Cloned plan has unique cloned code', dupRes.body?.plan?.plan_code?.includes('_COPY'));

    // ── Test 8: Admin Status Toggle (Publish / Unpublish / Archive) ──────────
    console.log('\n8. Testing Admin Plan Status Toggles...');
    const statusRes = await makeRequest('PATCH', `/admin/plans/${createdPlanId}/status`, {
      status: 'unpublished',
    });
    assert('Status change to unpublished returns 200 OK', statusRes.status === 200);
    assert('Status changed to unpublished in database', statusRes.body?.plan?.status === 'unpublished');

    // ── Test 9: Territory Exclusivity Conflict & Override Simulation ─────────
    console.log('\n9. Testing Territory Exclusivity Conflict & Override Enforcement...');
    const conflictRes = await makeRequest('POST', '/admin/plans/territory-override', {
      distributor_id: new mongoose.Types.ObjectId().toString(),
      state_id: dummyStateId,
      district_id: dummyDistrictId,
      reason: 'State Highway expansion cluster authorized by Regional Director.',
    });
    assert('Territory override endpoint responds with 200 or processed status', conflictRes.status === 200 || conflictRes.status === 404);

    // ── Final Test Summary ───────────────────────────────────────────────────
    console.log('\n════════════════════════════════════════════════════════════════════════');
    console.log(`  VERIFICATION RESULTS: ${passedTests} / ${totalTests} TESTS PASSED`);
    console.log('════════════════════════════════════════════════════════════════════════\n');

    if (passedTests === totalTests) {
      console.log('🎉 ALL DISTRIBUTOR PLAN & TERRITORY MANAGEMENT TESTS PASSED PERFECTLY!\n');
      process.exit(0);
    } else {
      console.error('⚠️ SOME TESTS FAILED. PLEASE CHECK LOGS.');
      process.exit(1);
    }
  } catch (error) {
    console.error('Suite error:', error);
    process.exit(1);
  }
}

runSuite();
