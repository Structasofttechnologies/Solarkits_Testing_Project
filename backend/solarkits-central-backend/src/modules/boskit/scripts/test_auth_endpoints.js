'use strict';

const http = require('http');

function makeRequest({ method, path, headers = {}, body = null }) {
  return new Promise((resolve, reject) => {
    const postData = body ? JSON.stringify(body) : null;
    const reqHeaders = {
      'Content-Type': 'application/json',
      ...headers,
    };
    if (postData) {
      reqHeaders['Content-Length'] = Buffer.byteLength(postData);
    }

    const req = http.request(
      {
        hostname: 'localhost',
        port: 5000,
        path,
        method,
        headers: reqHeaders,
      },
      (res) => {
        let rawData = '';
        res.on('data', (chunk) => (rawData += chunk));
        res.on('end', () => {
          try {
            const parsed = rawData ? JSON.parse(rawData) : null;
            resolve({ statusCode: res.statusCode, headers: res.headers, body: parsed });
          } catch (e) {
            resolve({ statusCode: res.statusCode, headers: res.headers, raw: rawData });
          }
        });
      }
    );

    req.on('error', (e) => reject(e));
    if (postData) req.write(postData);
    req.end();
  });
}

async function runTests() {
  console.log('🚀 Starting Phase 3 Live Endpoints Test Suite...\n');

  // Test 1: Distributor Login
  console.log('1️⃣  Testing POST /api/boskit/v1/auth/distributor/login (Demo Account)');
  const loginRes = await makeRequest({
    method: 'POST',
    path: '/api/boskit/v1/auth/distributor/login',
    body: { identifier: 'distributor@boskit.in', password: 'demo1234' },
  });
  console.log('   Status Code:', loginRes.statusCode);
  console.log('   Success:', loginRes.body?.success);
  console.log('   Distributor Name:', loginRes.body?.distributor?.business_name);
  const distToken = loginRes.body?.tokens?.accessToken;
  console.log('   Access Token received:', Boolean(distToken));
  if (loginRes.statusCode !== 200 || !distToken) throw new Error('Distributor login failed');

  // Test 2: Distributor /me with token
  console.log('\n2️⃣  Testing GET /api/boskit/v1/auth/distributor/me');
  const meRes = await makeRequest({
    method: 'GET',
    path: '/api/boskit/v1/auth/distributor/me',
    headers: { Authorization: `Bearer ${distToken}` },
  });
  console.log('   Status Code:', meRes.statusCode);
  console.log('   Email:', meRes.body?.distributor?.email);
  console.log('   Lifecycle Status:', meRes.body?.distributor?.lifecycle_status);
  if (meRes.statusCode !== 200) throw new Error('Distributor /me failed');

  // Test 3: Dealer Login
  console.log('\n3️⃣  Testing POST /api/boskit/v1/auth/dealer/login (Demo Account)');
  const dealerLoginRes = await makeRequest({
    method: 'POST',
    path: '/api/boskit/v1/auth/dealer/login',
    body: { identifier: 'dealer@boskit.in', password: 'demo1234' },
  });
  console.log('   Status Code:', dealerLoginRes.statusCode);
  console.log('   Dealer Name:', dealerLoginRes.body?.dealer?.business_name);
  const dealerToken = dealerLoginRes.body?.tokens?.accessToken;
  console.log('   Access Token received:', Boolean(dealerToken));
  if (dealerLoginRes.statusCode !== 200 || !dealerToken) throw new Error('Dealer login failed');

  // Test 4: Dealer /me with token
  console.log('\n4️⃣  Testing GET /api/boskit/v1/auth/dealer/me');
  const dealerMeRes = await makeRequest({
    method: 'GET',
    path: '/api/boskit/v1/auth/dealer/me',
    headers: { Authorization: `Bearer ${dealerToken}` },
  });
  console.log('   Status Code:', dealerMeRes.statusCode);
  console.log('   Email:', dealerMeRes.body?.dealer?.email);
  console.log('   Permissions:', dealerMeRes.body?.dealer?.permissions);
  if (dealerMeRes.statusCode !== 200) throw new Error('Dealer /me failed');

  // Test 5: OTP Send
  console.log('\n5️⃣  Testing POST /api/boskit/v1/auth/distributor/otp/send');
  const otpRes = await makeRequest({
    method: 'POST',
    path: '/api/boskit/v1/auth/distributor/otp/send',
    body: { target: 'verify@boskit.in', channel: 'email', purpose: 'distributor_signup' },
  });
  console.log('   Status Code:', otpRes.statusCode);
  console.log('   Success:', otpRes.body?.success);
  console.log('   Dev OTP:', otpRes.body?.dev_otp);
  if (otpRes.statusCode !== 200) throw new Error('OTP send failed');

  // Test 6: OTP Verify
  console.log('\n6️⃣  Testing POST /api/boskit/v1/auth/distributor/otp/verify');
  const otpVerifyRes = await makeRequest({
    method: 'POST',
    path: '/api/boskit/v1/auth/distributor/otp/verify',
    body: { target: 'verify@boskit.in', otp: otpRes.body?.dev_otp, purpose: 'distributor_signup' },
  });
  console.log('   Status Code:', otpVerifyRes.statusCode);
  console.log('   Success:', otpVerifyRes.body?.success);
  if (otpVerifyRes.statusCode !== 200) throw new Error('OTP verify failed');

  // Test 7: Logout
  console.log('\n7️⃣  Testing POST /api/boskit/v1/auth/distributor/logout');
  const logoutRes = await makeRequest({
    method: 'POST',
    path: '/api/boskit/v1/auth/distributor/logout',
  });
  console.log('   Status Code:', logoutRes.statusCode);
  console.log('   Message:', logoutRes.body?.message);
  if (logoutRes.statusCode !== 200) throw new Error('Logout failed');

  console.log('\n🎉 ALL PHASE 3 AUTHENTICATION TESTS PASSED SUCCESSFULLY! ✅');
  process.exit(0);
}

runTests().catch((err) => {
  console.error('\n❌ Test Suite Failed:', err.message);
  process.exit(1);
});
