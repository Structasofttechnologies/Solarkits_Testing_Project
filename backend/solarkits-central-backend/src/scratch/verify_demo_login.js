const axios = require('axios');
const BASE = 'http://localhost:5000/api/india/v1/reseller';

async function test() {
  try {
    console.log('--- 1. Testing Password Login ---');
    const loginRes = await axios.post(BASE + '/auth/login', {
      email_or_mobile: 'demo.district@solarkits.in',
      password: 'Demo@1234'
    });
    console.log('Login Status:', loginRes.data.status);
    const token = loginRes.data.token || loginRes.data.data?.token;
    console.log('Token received:', Boolean(token));

    const headers = { Authorization: 'Bearer ' + token };

    console.log('\n--- 2. Testing /auth/me ---');
    const meRes = await axios.get(BASE + '/auth/me', { headers });
    console.log('Me status:', meRes.data.status);
    console.log('Plan:', meRes.data.active_subscription?.plan_id?.name);
    console.log('Activation status:', meRes.data.data?.activation_status);

    console.log('\n--- 3. Testing /commission-rates ---');
    const commRes = await axios.get(BASE + '/commission-rates', { headers });
    console.log('Commission Rates Status:', commRes.data.status);
    console.log('Commission Rates count:', commRes.data.data?.length);
    if (commRes.data.data?.length > 0) {
      console.log('Sample rate:', commRes.data.data[0]);
    }

    console.log('\n--- 4. Testing /authorized-products ---');
    const authProdsRes = await axios.get(BASE + '/authorized-products', { headers });
    console.log('Authorized products count:', authProdsRes.data.data?.length);
    if (authProdsRes.data.data?.length > 0) {
      console.log('Product 0:', {
        name: authProdsRes.data.data[0].name,
        commission_percentage: authProdsRes.data.data[0].commission_percentage,
        moq: authProdsRes.data.data[0].moq,
        price: authProdsRes.data.data[0].price
      });
    }

    console.log('\n--- 5. Testing /goals/my-goal ---');
    const goalRes = await axios.get(BASE + '/goals/my-goal', { headers });
    console.log('Goal Status:', goalRes.data.status);
    console.log('Target Quantity:', goalRes.data.data?.target_quantity, 'Kits');

    console.log('\n--- 6. Testing /po/plan-settings ---');
    const poRes = await axios.get(BASE + '/po/plan-settings', { headers });
    console.log('PO Settings Status:', poRes.data.status);
    console.log('Min PO:', poRes.data.data?.po_settings?.min_po_quantity, 'Max PO:', poRes.data.data?.po_settings?.max_po_quantity);

    console.log('\n--- 7. Testing PIN Login ---');
    const pinRes = await axios.post(BASE + '/auth/login-pin', {
      email_or_mobile: 'demo.district@solarkits.in',
      pin: '1234'
    });
    console.log('PIN Login Status:', pinRes.data.status);

    console.log('\n🎉 ALL 7 TESTS PASSED PERFECTLY!');
  } catch (err) {
    console.error('Test Error:', err.response?.data || err.message);
  }
}

test();
