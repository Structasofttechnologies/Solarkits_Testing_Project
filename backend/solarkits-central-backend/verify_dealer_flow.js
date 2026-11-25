'use strict';

const mongoose = require('mongoose');
const axios = require('axios');

async function testDealerEndpoints() {
  console.log('Testing Dealer API Endpoints...');

  const BASE_URL = 'http://localhost:5000/api/boskit/v1';

  try {
    // 1. Test Dealer Register or Login
    console.log('\n1. Registering/Logging in Demo Dealer...');
    const regPayload = {
      business_name: 'Apex Gujarat Solar Solutions',
      email: `apex_dealer_${Date.now()}@solarkits.in`,
      mobile: `98${Date.now().toString().slice(-8)}`,
      password: 'Password@123',
      gst_number: '24AAACC9910D1ZM',
      pan_number: 'AAACC9910D',
      contact_person: 'Rajesh Patel',
      shop_address: {
        line: 'Shop 14, Solar Arcade, SG Highway',
        city: 'Ahmedabad',
        pincode: '380054',
      },
    };

    const regRes = await axios.post(`${BASE_URL}/dealer/register`, regPayload);
    console.log('Dealer Registration Response:', regRes.data?.success, regRes.data?.dealer?.business_name);
    const token = regRes.data?.tokens?.accessToken;

    if (!token) {
      throw new Error('Failed to get auth token for dealer');
    }

    const authHeaders = { Authorization: `Bearer ${token}` };

    // 2. Fetch Dealer Wholesale Catalogue
    console.log('\n2. Fetching Dealer Wholesale Catalogue...');
    const catRes = await axios.get(`${BASE_URL}/dealer/catalogue`, { headers: authHeaders });
    console.log('Catalogue Success:', catRes.data?.success);
    console.log('Total Products returned:', catRes.data?.total_products);
    if (catRes.data?.products?.length > 0) {
      const sample = catRes.data.products[0];
      console.log('Sample Product:', {
        name: sample.name,
        sku: sample.sku,
        mrp: sample.mrp_inr,
        dealer_wholesale_inr: sample.dealer_wholesale_inr,
        discount: `${sample.dealer_discount_percent}%`,
        moq: sample.moq,
        brand: sample.brand,
        specs: sample.specifications,
      });
    }

    // 3. Test Dealer Checkout (Create Order)
    console.log('\n3. Placing Wholesale Order (Checkout)...');
    const orderItems = (catRes.data?.products || []).slice(0, 2).map((p) => ({
      id: p.id,
      product_id: p.id,
      name: p.name,
      sku: p.sku,
      quantity: p.moq || 2,
      dealer_wholesale_inr: p.dealer_wholesale_inr,
      mrp_inr: p.mrp_inr,
      moq: p.moq,
    }));

    const checkoutPayload = {
      items: orderItems,
      delivery_mode: 'depot_pickup',
      billing_details: {
        business_name: 'Apex Gujarat Solar Solutions',
        gst_number: '24AAACC9910D1ZM',
        address: 'Shop 14, Solar Arcade, SG Highway, Ahmedabad',
      },
      payment_method: 'neft_rtgs',
      notes: 'Test procurement batch for rooftop solar project.',
    };

    const orderRes = await axios.post(`${BASE_URL}/dealer/orders/checkout`, checkoutPayload, { headers: authHeaders });
    console.log('Order Placement Success:', orderRes.data?.success);
    console.log('Order Number:', orderRes.data?.order?.order_number);
    console.log('Invoice Number:', orderRes.data?.order?.invoice_number);
    console.log('Grand Total INR:', orderRes.data?.order?.grand_total_inr);
    const createdOrderId = orderRes.data?.order?.id;

    // 4. Fetch Dealer Orders List
    console.log('\n4. Fetching Dealer Orders List...');
    const ordersRes = await axios.get(`${BASE_URL}/dealer/orders`, { headers: authHeaders });
    console.log('Orders Count:', ordersRes.data?.orders?.length);
    console.log('Latest Order Reference:', ordersRes.data?.orders?.[0]?.order_number);

    // 5. Fetch Single Order Details with Tax Invoice
    if (createdOrderId) {
      console.log('\n5. Fetching Order Details by ID...');
      const singleOrderRes = await axios.get(`${BASE_URL}/dealer/orders/${createdOrderId}`, { headers: authHeaders });
      console.log('Single Order Fetched:', singleOrderRes.data?.order?.order_number, singleOrderRes.data?.order?.invoice_number);
    }

    // 6. Fetch Dealer Dashboard Stats
    console.log('\n6. Fetching Dealer Dashboard Stats...');
    const statsRes = await axios.get(`${BASE_URL}/dealer/dashboard/stats`, { headers: authHeaders });
    console.log('Dashboard Stats:', {
      business_name: statsRes.data?.data?.dealer?.business_name,
      lifetime_procurement: statsRes.data?.data?.metrics?.lifetime_procurement_inr,
      total_orders: statsRes.data?.data?.metrics?.total_orders_count,
      hub_partner: statsRes.data?.data?.distributor_hub?.business_name,
    });

    console.log('\nALL DEALER FLOW ENDPOINTS VERIFIED SUCCESSFULLY! 🎉');
  } catch (error) {
    console.error('Error during testing:', error.response?.data || error.message);
  }
}

testDealerEndpoints();
