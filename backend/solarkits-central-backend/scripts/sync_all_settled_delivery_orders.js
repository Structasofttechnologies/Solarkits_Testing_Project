const dns = require('dns');
dns.setServers(['8.8.8.8', '8.8.4.4']);
require('dotenv').config();
const mongoose = require('mongoose');

async function run() {
  await mongoose.connect(process.env.MONGODB_URI);
  const db = mongoose.connection.db;

  console.log('--- SYNCING SETTLED DELIVERY ORDERS ---');

  // Find all purchase indents grouped by customer_order_number
  const pis = await db.collection('purchase_indents').find({}).toArray();
  const pisByOrder = {};
  for (const pi of pis) {
    const oNum = pi.customer_order_number || pi.order_number;
    if (oNum) {
      if (!pisByOrder[oNum]) pisByOrder[oNum] = [];
      pisByOrder[oNum].push(pi);
    }
  }

  // Iterate all delivery orders
  const deliveryOrders = await db.collection('delivery_orders').find({}).toArray();
  let updatedCount = 0;

  for (const doDoc of deliveryOrders) {
    const orderPis = pisByOrder[doDoc.order_number] || [];
    const isOrderFullySettled = orderPis.length > 0 && orderPis.every(p =>
      p.payment?.payment_status === 'Paid' ||
      (p.payment?.balance_payment?.utr_number && p.payment?.advance_payment?.utr_number) ||
      (p.payment?.total_paid_amount >= p.total_pi_value) ||
      (p.payment?.balance_due <= 0 && p.payment?.total_paid_amount > 0)
    );

    if (isOrderFullySettled) {
      console.log(`Order ${doDoc.order_number} (${doDoc.delivery_order_id}) has ${orderPis.length} PIs fully settled in Accounts.`);
      const result = await db.collection('delivery_orders').updateOne(
        { _id: doDoc._id },
        {
          $set: {
            'epcs.$[].payment_second_half.status': 'done',
            'epcs.$[].payment_second_half.paid_at': new Date(),
            'epcs.$[].payment_second_half.verified_by': 'Accounts (Balance UTR Recorded)'
          },
          $push: {
            audit_trail: {
              action: '2nd Half Payment Synchronized with Accounts (100% Settled)',
              performed_by_name: 'Accounts System Synchronization',
              timestamp: new Date(),
              notes: `All ${orderPis.length} Purchase Indent(s) verified as Paid. Dispatch unblocked.`
            }
          }
        }
      );
      if (result.modifiedCount > 0) {
        updatedCount++;
        console.log(`  ✅ Successfully updated 2nd half payment to 'done' for ${doDoc.order_number}`);
      } else {
        console.log(`  ℹ️ Order ${doDoc.order_number} was already marked 'done' or had no matching epcs.`);
      }
    }
  }

  console.log(`\n🎉 Total delivery orders synchronized: ${updatedCount}`);
  process.exit(0);
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
