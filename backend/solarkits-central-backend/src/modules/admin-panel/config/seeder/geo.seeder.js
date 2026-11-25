const { GeoLevel0, GeoLevel1, GeoLevel2 } = require('../../models/geolocation_db');
const geoLevel0Data = require('../seed_data/geolocation_level_0.json');
const geoLevel1Data = require('../seed_data/geolocation_level_1.json');
const geoLevel2Data = require('../seed_data/geolocation_level_2.json');

const seedGeo = async () => {
  console.log('🌍 Seeding Geolocation Levels (Countries, States, Districts)...');

  // Geolocation Level 0 (Countries)
  const countGeo0 = await GeoLevel0.countDocuments();
  if (countGeo0 === 0) {
    console.log(`  ✓ Seeding ${geoLevel0Data.length} countries...`);
    await GeoLevel0.insertMany(geoLevel0Data);
    console.log('  ✓ Geolocation Level 0 (Countries) seeded.');
  } else if (countGeo0 < geoLevel0Data.length) {
    let seededCountries = 0;
    for (const item of geoLevel0Data) {
      const exists = await GeoLevel0.findOne({ $or: [{ _id: item._id }, { name: item.name }, { iso2: item.iso2 }] });
      if (!exists) {
        await GeoLevel0.create(item);
        seededCountries++;
      }
    }
    if (seededCountries > 0) {
      console.log(`  ✓ Seeded ${seededCountries} new countries.`);
    }
  } else {
    console.log('  ✓ Geolocation Level 0 (Countries) already fully seeded.');
  }

  // Geolocation Level 1 (States)
  const countGeo1 = await GeoLevel1.countDocuments();
  if (countGeo1 === 0) {
    console.log(`  ✓ Seeding ${geoLevel1Data.length} states...`);
    await GeoLevel1.insertMany(geoLevel1Data);
    console.log('  ✓ Geolocation Level 1 (States) seeded.');
  } else if (countGeo1 < geoLevel1Data.length) {
    let seededStates = 0;
    for (const item of geoLevel1Data) {
      const exists = await GeoLevel1.findOne({ $or: [{ _id: item._id }, { name: item.name, level_0: item.level_0 }] });
      if (!exists) {
        await GeoLevel1.create(item);
        seededStates++;
      }
    }
    if (seededStates > 0) {
      console.log(`  ✓ Seeded ${seededStates} new states.`);
    }
  } else {
    console.log('  ✓ Geolocation Level 1 (States) already fully seeded.');
  }

  // Geolocation Level 2 (Districts)
  const countGeo2 = await GeoLevel2.countDocuments();
  if (countGeo2 === 0) {
    console.log(`  ✓ Seeding ${geoLevel2Data.length} districts...`);
    await GeoLevel2.insertMany(geoLevel2Data);
    console.log('  ✓ Geolocation Level 2 (Districts) seeded.');
  } else if (countGeo2 < geoLevel2Data.length) {
    let seededDistricts = 0;
    for (const item of geoLevel2Data) {
      const exists = await GeoLevel2.findOne({ $or: [{ _id: item._id }, { name: item.name, level_1: item.level_1 }] });
      if (!exists) {
        await GeoLevel2.create(item);
        seededDistricts++;
      }
    }
    if (seededDistricts > 0) {
      console.log(`  ✓ Seeded ${seededDistricts} new districts.`);
    }
  } else {
    console.log('  ✓ Geolocation Level 2 (Districts) already fully seeded.');
  }

  console.log('✅ Geolocation Seeding completed.');
};

module.exports = { seedGeo };
