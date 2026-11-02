const { MongoClient } = require('mongodb');

const uri = "mongodb+srv://ravistructasoftadmin_db_user:GdvjlulsL90F4rGL@solarkits-shop.ke2zpjx.mongodb.net/?retryWrites=true&w=majority&appName=solarkits-shop";

async function completeProductionClone() {
  const client = new MongoClient(uri);

  try {
    await client.connect();
    console.log("Connected to MongoDB cluster.");

    const sourceDb = client.db('test');
    const targetDb = client.db('solarkits_production_db');

    // Step 1: Drop empty (0 docs) collections in 'test' to free Atlas M0 collection slots
    console.log("\n--- Cleaning empty collections in 'test' ---");
    const testCols = await sourceDb.listCollections().toArray();
    let emptyDropped = 0;
    for (const col of testCols) {
      if (col.name.startsWith('system.')) continue;
      const count = await sourceDb.collection(col.name).countDocuments();
      if (count === 0) {
        await sourceDb.collection(col.name).drop();
        emptyDropped++;
      }
    }
    console.log(`Dropped ${emptyDropped} empty (0 doc) collections from 'test'.`);

    // Step 2: Now clone the 137 active collections into solarkits_production_db
    console.log("\n======================================================");
    console.log("🚀 Cloning active collections to [solarkits_production_db]");
    console.log("======================================================");

    const activeCols = await sourceDb.listCollections().toArray();
    let totalCopiedDocs = 0;
    let totalCopiedCols = 0;

    for (const col of activeCols) {
      if (col.name.startsWith('system.')) continue;
      const count = await sourceDb.collection(col.name).countDocuments();
      if (count === 0) continue;

      const sourceCol = sourceDb.collection(col.name);
      const targetCol = targetDb.collection(col.name);

      const docs = await sourceCol.find({}).toArray();
      const batchSize = 500;
      for (let i = 0; i < docs.length; i += batchSize) {
        const batch = docs.slice(i, i + batchSize);
        await targetCol.insertMany(batch, { ordered: false });
      }

      // Recreate custom indexes
      try {
        const indexes = await sourceCol.indexes();
        for (const index of indexes) {
          if (index.name === '_id_') continue;
          const options = { name: index.name };
          if (index.unique) options.unique = true;
          if (index.sparse) options.sparse = true;
          if (index.partialFilterExpression) options.partialFilterExpression = index.partialFilterExpression;
          if (index.expireAfterSeconds !== undefined) options.expireAfterSeconds = index.expireAfterSeconds;

          await targetCol.createIndex(index.key, options).catch(() => {});
        }
      } catch (idxErr) {}

      totalCopiedCols++;
      totalCopiedDocs += docs.length;
      console.log(`  ✓ Cloned ${col.name}: ${docs.length} documents`);
    }

    console.log(`\n🎉 Completed [solarkits_production_db]: Copied ${totalCopiedDocs} documents across ${totalCopiedCols} collections.`);

    // Step 3: Final cluster status check
    const adminDb = client.db().admin();
    const dbs = await adminDb.listDatabases();
    console.log("\n--- Final Cluster Status ---");
    let totalClusterCols = 0;
    for (const d of dbs.databases) {
      if (['admin', 'local', 'config'].includes(d.name)) continue;
      const cols = await client.db(d.name).listCollections().toArray();
      console.log(`- ${d.name}: ${cols.length} collections`);
      totalClusterCols += cols.length;
    }
    console.log(`Total active collections across cluster: ${totalClusterCols} / 500`);

  } catch (err) {
    console.error("Migration error:", err);
  } finally {
    await client.close();
  }
}

completeProductionClone();

