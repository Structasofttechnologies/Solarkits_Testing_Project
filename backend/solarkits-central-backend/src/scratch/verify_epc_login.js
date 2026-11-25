const axios = require('axios');

async function testLogin() {
  try {
    const res = await axios.post('http://localhost:5000/api/india/v1/auth/login', {
      email: 'epc.apex@solarkits.com',
      password: 'Password@123'
    });
    console.log('✅ Login Response:', res.status, res.data.message);
    console.log('Account Details:', res.data.account);
  } catch (err) {
    console.error('❌ Login Error:', err.response?.data || err.message);
  }
}

testLogin();
