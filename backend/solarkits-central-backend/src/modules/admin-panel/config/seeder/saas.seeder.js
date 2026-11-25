const { SaaSProduct } = require('../../models/user_db');
const saasProductsData = require('../seed_data/saas_products.json');

const seedSaaS = async () => {
  console.log('🚀 Seeding SaaS Products...');
  let seededCount = 0;
  for (const prod of saasProductsData) {
    const exists = await SaaSProduct.findOne({ $or: [{ slug: prod.slug }, { name: prod.name }] });
    if (!exists) {
      await SaaSProduct.create(prod);
      console.log(`  ✓ SaaS Product '${prod.name}' seeded.`);
      seededCount++;
    }
  }
  if (seededCount === 0) {
    console.log('  ✓ All SaaS Products are already seeded.');
  }
  console.log('✅ SaaS Products Seeding completed.');
};

module.exports = { seedSaaS };
