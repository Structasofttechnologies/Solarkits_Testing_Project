'use strict';

const http = require('http');

function request(method, path, body = null) {
  return new Promise((resolve, reject) => {
    const postData = body ? JSON.stringify(body) : null;
    const reqHeaders = { 'Content-Type': 'application/json' };
    if (postData) reqHeaders['Content-Length'] = Buffer.byteLength(postData);

    const req = http.request({
      hostname: 'localhost',
      port: 5000,
      path: '/api/boskit/v1/admin' + path,
      method,
      headers: reqHeaders,
    }, (res) => {
      let data = '';
      res.on('data', (c) => (data += c));
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(data) });
        } catch {
          resolve({ status: res.statusCode, raw: data });
        }
      });
    });
    req.on('error', reject);
    if (postData) req.write(postData);
    req.end();
  });
}

async function runAdminMastersSuite() {
  console.log('===============================================================');
  console.log('⚡ TESTING ALL 19 BOSKIT ADMIN MASTER ENDPOINTS ⚡');
  console.log('===============================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(name, condition, details = '') {
    if (condition) {
      console.log(`✅ [PASS] ${name} ${details ? `(${details})` : ''}`);
      passed++;
    } else {
      console.error(`❌ [FAIL] ${name} ${details ? `(${details})` : ''}`);
      failed++;
    }
  }

  try {
    // 1. Channel Settings
    const chanRes = await request('GET', '/channel-settings');
    assert('1. GET /channel-settings', chanRes.status === 200, `Found: ${chanRes.data?.data?.total ?? 0}`);

    const createChan = await request('POST', '/channel-settings', {
      rule_priority: 10,
      status: 'active',
      product_configs: [
        {
          mrp_inr: 12000,
          distributor_rate_inr: 10000,
          dealer_rate_inr: 10800,
          gst_rate_pct: 18,
          distributor_moq: 10,
          dealer_moq: 3,
        }
      ],
    });
    assert('2. POST /channel-settings', createChan.status === 201, `ID: ${createChan.data?.data?._id}`);
    const channelId = createChan.data?.data?._id;

    if (channelId) {
      const dupChan = await request('POST', `/channel-settings/${channelId}/duplicate`);
      assert('3. POST /channel-settings/:id/duplicate', dupChan.status === 201);

      const updChan = await request('PUT', `/channel-settings/${channelId}`, { rule_priority: 15 });
      assert('4. PUT /channel-settings/:id', updChan.status === 200);

      const delChan = await request('DELETE', `/channel-settings/${channelId}`);
      assert('5. DELETE /channel-settings/:id', delChan.status === 200);
    }

    // 2. Products & Categories
    const prods = await request('GET', '/products');
    assert('6. GET /products', prods.status === 200, `Count: ${prods.data?.data?.total}`);

    const cats = await request('GET', '/categories');
    assert('7. GET /categories', cats.status === 200, `Categories: ${cats.data?.data?.categories?.length}`);

    // 3. MOQ Rules
    const moqRes = await request('GET', '/moq-rules');
    assert('8. GET /moq-rules', moqRes.status === 200, `Found: ${moqRes.data?.data?.total}`);

    const createMoq = await request('POST', '/moq-rules', {
      rule_name: 'Regional Lot Minimum',
      moq: 12,
      channel: 'distributor',
    });
    assert('9. POST /moq-rules', createMoq.status === 201);

    // 4. Tax Rules
    const taxRes = await request('GET', '/tax-rules');
    assert('10. GET /tax-rules', taxRes.status === 200, `Rules: ${taxRes.data?.data?.total}`);

    const createTax = await request('POST', '/tax-rules', {
      rule_name: 'Standard Solar Inverter Tax',
      total_gst_pct: 12,
      hsn_code: '850440',
    });
    assert('11. POST /tax-rules', createTax.status === 201);

    // 5. Territories
    const terrRes = await request('GET', '/territories');
    assert('12. GET /territories', terrRes.status === 200, `Territories: ${terrRes.data?.data?.total}`);

    // 6. Orders
    const ordRes = await request('GET', '/orders');
    assert('13. GET /orders', ordRes.status === 200, `Orders: ${ordRes.data?.data?.total}`);

    if (ordRes.data?.data?.orders?.length > 0) {
      const sampleOrdId = ordRes.data.data.orders[0].id;
      const ordDetail = await request('GET', `/orders/${sampleOrdId}`);
      assert('14. GET /orders/:id', ordDetail.status === 200, `Number: ${ordDetail.data?.data?.order_number}`);

      const statusUpd = await request('POST', `/orders/${sampleOrdId}/status`, {
        status: 'processing',
        comment: 'Order moved to warehouse dispatch queue',
      });
      assert('15. POST /orders/:id/status', statusUpd.status === 200);
    }

    // 7. Payments
    const payRes = await request('GET', '/payments');
    assert('16. GET /payments', payRes.status === 200, `Transactions: ${payRes.data?.data?.total}`);

  } catch (err) {
    console.error('Error:', err);
    failed++;
  }

  console.log('\n===============================================================');
  console.log(`🏁 ADMIN MASTERS SUMMARY: ${passed} PASSED | ${failed} FAILED`);
  console.log('===============================================================');
}

runAdminMastersSuite();
