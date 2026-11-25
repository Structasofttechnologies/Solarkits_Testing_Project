const dns = require('dns');
dns.setServers(['8.8.8.8', '8.8.4.4', '1.1.1.1']);
require('dotenv').config();
require('../keys/config/databases');

const { GeoLevel1, GeoLevel2 } = require('../modules/admin-panel/models/geolocation_db');

setTimeout(async () => {
  try {
    const stateNames = ['Gujarat', 'Maharashtra', 'Delhi', 'Karnataka', 'Rajasthan'];
    for (const name of stateNames) {
      const state = await GeoLevel1.findOne({ name, is_active: true }).lean();
      if (!state) {
        console.log('State not found:', name);
        continue;
      }
      const dists = await GeoLevel2.find({ level_1: state._id, is_active: true }).select('name').lean();
      console.log(`\n=== ${name} (${state._id}) - ${dists.length} districts ===`);
      console.log(dists.map(d => `${d.name} (${d._id})`).join(', '));
    }
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}, 2000);
