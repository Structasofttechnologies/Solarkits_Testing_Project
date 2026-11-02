const dns = require('dns');
dns.setServers(['8.8.8.8', '8.8.4.4']);
require('dotenv').config();
const mongoose = require('mongoose');

async function run() {
  await mongoose.connect(process.env.MONGODB_URI);
  const db = mongoose.connection.db;

  const orders = await db.collection('delivery_orders').find({
    order_number: { $in: ['ORD-EPC-20261028-2454', 'ORD-EPC-20261028-3100', 'ORD-EPC-20261031-1500'] }
  }).toArray();

  console.log('--- DELIVERY ORDERS ---');
  for (const o of orders) {
    console.log(`Order: ${o.order_number} (${o.delivery_order_id})`);
    console.log('Delivery status:', o.delivery_status);
    console.log('Kit prep status:', o.kit_preparation_status);
    console.log('EPCs count:', o.epcs?.length);
    if (o.epcs) {
      o.epcs.forEach((epc, i) => {
        console.log(`  EPC[${i}] ${epc.epc_name} (${epc.epc_id}):`);
        console.log('    1st half:', JSON.stringify(epc.payment_first_half));
        console.log('    2nd half:', JSON.stringify(epc.payment_second_half));
      });
    }
  }

  const pis = await db.collection('purchase_indents').find({
    customer_order_number: { $in: ['ORD-EPC-20261028-2454', 'ORD-EPC-20261028-3100', 'ORD-EPC-20261031-1500'] }
  }).toArray();

  console.log('\n--- PURCHASE INDENTS ---');
  for (const p of pis) {
    console.log(`PI #${p.pi_number} for Order ${p.customer_order_number}:`);
    console.log('  supplier:', p.supplier_name);
    console.log('  total_pi_value:', p.total_pi_value);
    console.log('  payment_status:', p.payment?.payment_status);
    console.log('  total_paid_amount:', p.payment?.total_paid_amount);
    console.log('  balance_due:', p.payment?.balance_due);
    console.log('  advance UTR:', p.payment?.advance_payment?.utr_number);
    console.log('  balance UTR:', p.payment?.balance_payment?.utr_number);
  }

  process.exit(0);
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
