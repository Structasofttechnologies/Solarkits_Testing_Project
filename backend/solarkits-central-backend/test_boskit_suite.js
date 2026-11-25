'use strict';

const http = require('http');

function post(path, body) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const req = http.request({
      hostname: 'localhost',
      port: 5000,
      path: '/api/boskit/v1' + path,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data),
      },
    }, (res) => {
      let d = '';
      res.on('data', (c) => (d += c));
      res.on('end', () => {
        let parsed = null;
        try { parsed = JSON.parse(d); } catch (e) { parsed = { raw: d }; }
        resolve({ code: res.statusCode, data: parsed });
      });
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

function get(path) {
  return new Promise((resolve, reject) => {
    const req = http.get({ hostname: 'localhost', port: 5000, path: '/api/boskit/v1' + path }, (res) => {
      let d = '';
      res.on('data', (c) => (d += c));
      res.on('end', () => {
        let parsed = null;
        try { parsed = JSON.parse(d); } catch (e) { parsed = { raw: d }; }
        resolve({ code: res.statusCode, data: parsed });
      });
    });
    req.on('error', reject);
  });
}

async function runBoskitEndToEndTestSuite() {
  console.log('===============================================================');
  console.log('⚡ RUNNING BOSKIT PLATFORM END-TO-END AUTOMATED TEST SUITE ⚡');
  console.log('===============================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(testName, condition, details = '') {
    if (condition) {
      console.log(`✅ [PASS] ${testName} ${details ? `(${details})` : ''}`);
      passed++;
    } else {
      console.error(`❌ [FAIL] ${testName} ${details ? `(${details})` : ''}`);
      failed++;
    }
  }

  try {
    // 1. Public Catalogue & Plans
    const pubProducts = await get('/public/products');
    assert('1. Public Products API', pubProducts.code === 200, `Found ${pubProducts.data?.products?.length} products`);

    const pubPlans = await get('/public/plans');
    assert('2. Franchise Plans Public API', pubPlans.code === 200, `Found ${pubPlans.data?.plans?.length} plans`);

    const pubContent = await get('/public/content?position=hero');
    assert('3. Public CMS Content API', pubContent.code === 200, `Found ${pubContent.data?.items?.length} items`);

    // 2. Auth Flow & Distributor Init
    const uniqueEmail = `dist_${Date.now()}@solarkits.test`;
    const uniquePhone = `98${Date.now().toString().slice(-8)}`;
    const regInit = await post('/auth/distributor/register/init', {
      business_name: 'Solartech Hub Enterprise',
      email: uniqueEmail,
      mobile: uniquePhone,
      password: 'SecurePassword123!',
    });
    assert('4. Distributor Registration Init', regInit.code === 201 || regInit.code === 200, `Distributor ID: ${regInit.data?.distributor?.id}`);

    const otpRes = await post('/auth/distributor/otp/send', {
      target: uniqueEmail,
      channel: 'email',
      purpose: 'distributor_signup',
    });
    assert('5. Distributor OTP Dispatch', otpRes.code === 200, `Status: ${otpRes.data?.message || 'Sent'}`);

    // 3. Distributor Onboarding
    const saveStepRes = await post('/distributor/onboarding/save-step', {
      distributor_id: regInit.data?.distributor?.id,
      step_number: 2,
      data: { business_name: 'Solartech Hub Enterprise', enterprise_type: 'Private Limited' },
    });
    assert('6. Onboarding Step-Saver Engine', saveStepRes.code === 200, `Step: ${saveStepRes.data?.step_completed}`);

    const gstRes = await post('/distributor/onboarding/gst-verify', {
      gstin: '24AAACC1206D1ZM',
    });
    assert('7. GSTIN Statutory Verification Engine', gstRes.code === 200, `Legal Name: ${gstRes.data?.legal_name || 'Verified'}`);

    // 4. Admin Management
    const adminStats = await get('/admin/stats');
    assert('8. Admin Overview KPI Stats', adminStats.code === 200, `Active Distributors: ${adminStats.data?.data?.distributors?.total ?? 'OK'}`);

    // 5. Pricing Engine
    const pricingRes = await post('/pricing/calculate', {
      items: [{ product_id: '64f000000000000000000001', quantity: 20 }],
      buyer_type: 'distributor',
      destination_state_code: 'GJ',
    });
    assert('9. Pricing & GST Engine', pricingRes.code === 200, `Grand Total: ₹${pricingRes.data?.summary?.grand_total_inr}`);

    // 6. Cart & Order Flow
    const addCart = await post('/order/cart/add', {
      buyer_id: '64f000000000000000000010',
      buyer_type: 'distributor',
      product_id: '64f000000000000000000001',
      quantity: 10,
    });
    assert('10. Server-side Cart Add', addCart.code === 200, `Cart units: ${addCart.data?.items_count}`);

    const createOrder = await post('/order/create', {
      buyer_id: '64f000000000000000000010',
      buyer_type: 'distributor',
      items: [{ product_id: '64f000000000000000000001', quantity: 10 }],
      shipping_address: { line: 'Industrial Depot', city: 'Surat', state_code: 'GJ', pincode: '395001' },
      gst_number: '24AAACC1206D1ZM',
    });
    assert('11. Order Placement & Statutory Tax Invoice', createOrder.code === 201, `Order: ${createOrder.data?.order?.order_number}`);

    // 7. Notifications
    const notifyRes = await post('/notification/dispatch', {
      recipient_type: 'boskit_distributor',
      recipient_id: '64f000000000000000000010',
      event_type: 'order_confirmed',
      title: 'Order BK-2026 Processed',
      message: 'Your solar equipment order is scheduled for dispatch.',
    });
    assert('12. Notification Dispatch Engine', notifyRes.code === 201);

    const getNotify = await get('/notification?recipient_id=64f000000000000000000010');
    assert('13. Notification Stream Retrieval', getNotify.code === 200, `Alerts: ${getNotify.data?.notifications?.length}`);

    // 8. Cross-Platform Reports
    const repSummary = await get('/admin/reports/executive-summary');
    assert('14. Cross-Platform Executive GMV Summary', repSummary.code === 200, `Combined GMV: ₹${repSummary.data?.summary?.combined_gmv_inr}`);

    const repFin = await get('/admin/reports/financials');
    assert('15. Statutory Financial & Tax Ledger', repFin.code === 200, `GST Accrued: ₹${repFin.data?.financials?.tax_collected?.total_tax_inr}`);

    // 9. Audit Logging
    const auditRes = await get('/admin/audit-logs');
    assert('16. Security & Business Audit Trail', auditRes.code === 200, `Captured Events: ${auditRes.data?.logs?.length}`);

  } catch (err) {
    console.error('Test execution error:', err);
    failed++;
  }

  console.log('\n===============================================================');
  console.log(`🏁 TEST RUN SUMMARY: ${passed} PASSED | ${failed} FAILED`);
  console.log('===============================================================');
}

runBoskitEndToEndTestSuite();
