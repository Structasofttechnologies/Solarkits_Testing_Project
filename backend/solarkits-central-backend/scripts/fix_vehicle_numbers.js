const dns = require('dns');
dns.setServers(['8.8.8.8', '8.8.4.4']);
require('dotenv').config();
const mongoose = require('mongoose');

async function run() {
  await mongoose.connect(process.env.MONGODB_URI);
  const db = mongoose.connection.db;

  const r1 = await db.collection('delivery_vehicle_fleets').updateOne(
    { registration_number: 'MK-152-4503' },
    { $set: { registration_number: 'MH-02-CB-4503' } }
  );
  console.log('Updated MK-152-4503 -> MH-02-CB-4503:', r1.modifiedCount);

  const r2 = await db.collection('delivery_vehicle_fleets').updateOne(
    { registration_number: 'MH-12-1695' },
    { $set: { registration_number: 'MH-12-TC-1695' } }
  );
  console.log('Updated MH-12-1695 -> MH-12-TC-1695:', r2.modifiedCount);

  const r3 = await db.collection('delivery_vehicles').updateOne(
    { registration_number: 'MK-120-JDNM' },
    { $set: { registration_number: 'MH-12-JD-1200' } }
  );
  console.log('Updated MK-120-JDNM -> MH-12-JD-1200:', r3.modifiedCount);

  // Check updated list
  const fleets = await db.collection('delivery_vehicle_fleets').find({}).toArray();
  console.log('\n--- CURRENT FLEET REGISTRATIONS ---');
  fleets.forEach(f => console.log('  ', f.registration_number));

  process.exit(0);
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
