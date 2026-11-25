require('dotenv').config();
const dns = require('dns');
dns.setServers(['8.8.8.8', '8.8.4.4', '1.1.1.1']);

const mongoose = require('mongoose');
require('../keys/config/databases');

const { Brand } = require('../modules/admin-panel/models/core_db');
const { GeoLevel0, GeoLevel1, GeoLevel2 } = require('../modules/admin-panel/models/geolocation_db');

async function verify() {
  await mongoose.connect(process.env.MONGODB_URI);
  const brands = await Brand.find({ deleted_at: null }).lean();
  console.log(`\n==================================================`);
  console.log(`📊 TOTAL MANUFACTURING BRANDS IN DB: ${brands.length}`);
  console.log(`==================================================\n`);

  for (let i = 0; i < Math.min(12, brands.length); i++) {
    const b = brands[i];
    const states = await GeoLevel1.find({ _id: { $in: b.state_ids } });
    const dists = await GeoLevel2.find({ _id: { $in: b.district_ids } });
    
    console.log(`[${i+1}] Brand: "${b.brand_name}"`);
    console.log(`    Company  : ${b.company_name || 'N/A'}`);
    console.log(`    States   : ${states.map(s => s.name).join(', ') || 'None'}`);
    console.log(`    Districts: ${dists.map(d => d.name).join(', ') || 'None'}`);
    console.log(`    Logo URL : ${b.logo ? (b.logo.startsWith('data:') ? 'SVG Data URI' : b.logo) : 'NONE'}\n`);
  }

  await mongoose.disconnect();
  process.exit(0);
}

verify();
