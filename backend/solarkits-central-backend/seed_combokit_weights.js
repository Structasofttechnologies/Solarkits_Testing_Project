const mongoose = require('mongoose');
require('dotenv').config();
const dns = require('dns');
dns.setServers(['8.8.8.8', '8.8.4.4', '1.1.1.1']);

async function seedWeights() {
  await mongoose.connect(process.env.MONGODB_URI);
  const db = mongoose.connection.db;

  // 1. Sync pc_comobo_kit into pc_combo_kits collection
  const allKits = await db.collection('pc_comobo_kit').find({}).toArray();
  console.log(`Found ${allKits.length} kits in pc_comobo_kit.`);

  await db.collection('pc_combo_kits').deleteMany({});
  if (allKits.length > 0) {
    await db.collection('pc_combo_kits').insertMany(allKits);
    console.log(`Synced ${allKits.length} kits into pc_combo_kits collection.`);
  }

  // 2. Pre-configure BOM weights in combokit_weight_masters
  await db.collection('combokit_weight_masters').deleteMany({});

  const defaultBOMByCapacity = (cap = 3) => {
    if (cap <= 3) {
      return { modules: 132, inverter: 14, bos: 18, structure: 45, packaging: 15, notes: 'Residential standard pallet packaging' };
    } else if (cap <= 5) {
      return { modules: 220, inverter: 18, bos: 25, structure: 65, packaging: 22, notes: 'Standard 5kW residential rooftop kit' };
    } else if (cap <= 10) {
      return { modules: 420, inverter: 32, bos: 45, structure: 130, packaging: 35, notes: 'Three-phase commercial/villa mounting structure' };
    } else {
      return {
        modules: Math.round(cap * 43),
        inverter: Math.round(cap * 2.4),
        bos: Math.round(cap * 3.6),
        structure: Math.round(cap * 11),
        packaging: Math.round(cap * 2.8),
        notes: 'Commercial utility grade packaging in wooden crates'
      };
    }
  };

  for (const kit of allKits) {
    const bom = defaultBOMByCapacity(kit.capacity || 3);
    const totalWeight = bom.modules + bom.inverter + bom.bos + bom.structure + bom.packaging;

    const weightDoc = {
      kit_id: kit._id,
      kit_name: kit.name,
      capacity_kw: kit.capacity || 1,
      solar_modules_weight_kg: bom.modules,
      inverter_weight_kg: bom.inverter,
      boskit_weight_kg: bom.bos,
      structure_material_weight_kg: bom.structure,
      packaging_weight_kg: bom.packaging,
      total_kit_weight_kg: totalWeight,
      notes: bom.notes,
      is_active: true,
      deleted_at: null,
      created_at: new Date(),
      updated_at: new Date(),
    };

    await db.collection('combokit_weight_masters').insertOne(weightDoc);
    console.log(`⚖️ Configured Weight Master: "${kit.name}" -> ${totalWeight} KG (Cap: ${kit.capacity} kW)`);
  }

  console.log('\n🎉 Successfully seeded ComboKit Weight Masters!');
  process.exit(0);
}

seedWeights().catch(e => {
  console.error('❌ Error seeding weights:', e);
  process.exit(1);
});
