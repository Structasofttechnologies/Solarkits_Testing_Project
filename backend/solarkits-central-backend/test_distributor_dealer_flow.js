'use strict';

require('dotenv').config();
const http = require('http');
const { generate_auth_tokens } = require('./src/modules/boskit/utils/jsonwebtoken');

function apiCall(method, path, body = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const postData = body ? JSON.stringify(body) : null;
    const reqHeaders = { 'Content-Type': 'application/json', ...headers };
    if (postData) reqHeaders['Content-Length'] = Buffer.byteLength(postData);

    const req = http.request({
      hostname: 'localhost',
      port: 5000,
      path: '/api/boskit/v1' + path,
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

async function testCompleteLifecycle() {
  console.log('======================================================================');
  console.log('⚡ TESTING DISTRIBUTOR PROCUREMENT & DEALER COMMISSION/SALES FLOW ⚡');
  console.log('======================================================================\n');

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
    // 1. Fetch available products
    const prodRes = await apiCall('GET', '/admin/products');
    const products = prodRes.data?.data?.products || [];
    assert('1. Load Products from Central Admin', products.length > 0, `Total products: ${products.length}`);
    const sampleProduct = products[0];
    const sampleProductId = sampleProduct.id || sampleProduct._id;
    const sampleMrp = sampleProduct.mrp_inr || 10000;

    // 2. Fetch or create a distributor
    const distRes = await apiCall('GET', '/admin/distributors');
    let distributors = distRes.data?.distributors || distRes.data?.data?.distributors || [];
    let sampleDistributor = distributors[0];
    assert('2. Resolve Distributor Account', Boolean(sampleDistributor), `Distributor: ${sampleDistributor?.business_name}`);
    const distributorId = sampleDistributor.id || sampleDistributor._id;

    // Generate Distributor JWT Token
    const distTokens = generate_auth_tokens({
      id: distributorId,
      _id: distributorId,
      email: sampleDistributor.email,
      mobile: sampleDistributor.mobile,
      business_name: sampleDistributor.business_name,
    }, 'boskit_distributor');

    // 3. Distributor buys / procures product from Central Admin / Factory at wholesale rate
    const procureOrder = await apiCall('POST', '/distributor/procure/order', {
      items: [
        {
          product_id: sampleProductId,
          name: sampleProduct.name,
          sku: sampleProduct.sku,
          quantity: 10,
          distributor_buy_price_inr: Math.round(sampleMrp * 0.80),
        },
      ],
      shipping_address: {
        line: 'Distributor Regional Depot, Phase 2',
        city: 'Ahmedabad',
        state: 'Gujarat',
        pincode: '380001',
      },
      notes: 'Initial stock procurement for regional network distribution',
    }, {
      'Authorization': `Bearer ${distTokens.accessToken}`,
    });
    if (procureOrder.status !== 200 && procureOrder.status !== 201) {
      console.log('Procure Order Error payload:', JSON.stringify(procureOrder));
    }
    assert('3. Distributor Buys Stock from Central Admin / Factory', procureOrder.status === 201 || procureOrder.status === 200, `Order Number: ${procureOrder.data?.order?.order_number || procureOrder.data?.order_number}`);

    // 4. Distributor sets custom Dealer Selling Price / Commission margin on this product
    // For example: MRP = 10,000 -> Distributor buys at 8,000 -> sets Dealer Sell Price = 9,200 (15% margin)
    const customDealerSellPriceInr = Math.round(sampleMrp * 0.92);
    const setMarginRes = await apiCall('POST', '/distributor/pricing/margin', {
      product_id: sampleProductId,
      margin_percent: 15,
      dealer_sell_price_inr: customDealerSellPriceInr,
      is_whitelisted: true,
    }, {
      'Authorization': `Bearer ${distTokens.accessToken}`,
    });
    if (setMarginRes.status !== 200) {
      console.log('Set Margin Error payload:', JSON.stringify(setMarginRes));
    }
    assert('4. Distributor Sets Dealer Commission / Selling Price', setMarginRes.status === 200 && setMarginRes.data?.success, `Configured Dealer Price: ₹${customDealerSellPriceInr}`);

    // 5. Onboard a Dealer linked to this Distributor
    const dealerEmail = `dealer_${Date.now()}@solarshop.test`;
    const dealerReg = await apiCall('POST', '/dealer/register', {
      business_name: 'Apex Solar Dealer Outlet',
      email: dealerEmail,
      mobile: `98${Date.now().toString().slice(-8)}`,
      password: 'DealerPassword123!',
      distributor_id: distributorId,
      shop_address: {
        line: 'Shop 42, Solar Market',
        city: 'Surat',
        pincode: '395003',
      },
    });
    if (dealerReg.status !== 201) {
      console.log('Dealer Reg Error payload:', JSON.stringify(dealerReg));
    }
    assert('5. Distributor Onboards Dealer to Territory Network', dealerReg.status === 201 && dealerReg.data?.success, `Dealer Code: ${dealerReg.data?.dealer?.dealer_code}`);
    const dealerAccessToken = dealerReg.data?.tokens?.accessToken;

    // 6. Check if Dealer sees this customized price in their Catalogue
    const dealerCatRes = await apiCall('GET', '/dealer/catalogue', null, {
      'Authorization': `Bearer ${dealerAccessToken}`,
    });
    if (dealerCatRes.status !== 200) {
      console.log('Dealer Catalogue Error payload:', JSON.stringify(dealerCatRes));
    }
    assert('6. Dealer Fetches Catalogue Scoped to Assigned Distributor', dealerCatRes.status === 200, `Products: ${dealerCatRes.data?.products?.length}`);

    const dealerProduct = dealerCatRes.data?.products?.find((p) => (p.id || p._id) === sampleProductId);
    if (dealerProduct) {
      assert(
        '7. Dealer Sees the Exact Custom Selling Price Set by Distributor',
        dealerProduct.dealer_wholesale_inr === customDealerSellPriceInr,
        `Expected ₹${customDealerSellPriceInr} | Actual ₹${dealerProduct.dealer_wholesale_inr}`
      );
    } else {
      assert('7. Dealer Product Found in Catalogue', false);
    }

  } catch (err) {
    console.error('Flow test error:', err);
    failed++;
  }

  console.log('\n======================================================================');
  console.log(`🏁 LIFECYCLE VERIFICATION: ${passed} PASSED | ${failed} FAILED`);
  console.log('======================================================================');
}

testCompleteLifecycle();
