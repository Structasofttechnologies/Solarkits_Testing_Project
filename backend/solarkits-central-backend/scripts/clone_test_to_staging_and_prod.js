const { MongoClient } = require('mongodb');

const uri = "mongodb+srv://ravistructasoftadmin_db_user:GdvjlulsL90F4rGL@solarkits-shop.ke2zpjx.mongodb.net/?retryWrites=true&w=majority&appName=solarkits-shop";

const SOURCE_DB_NAME = 'test';
const TARGET_DB_NAMES = ['solarkits_staging_db', 'solarkits_production_db'];

async function cloneDatabase() {
  console.log(`Connecting to MongoDB cluster...`);
  const client = new MongoClient(uri);

  try {
    await client.connect();
    console.log(`✅ Connected successfully to cluster.`);

    const sourceDb = client.db(SOURCE_DB_NAME);
    const collections = await sourceDb.listCollections().toArray();
    console.log(`Found ${collections.length} collections in source DB [${SOURCE_DB_NAME}].`);

    for (const targetName of TARGET_DB_NAMES) {
      console.log(`\n======================================================`);
      console.log(`🚀 Starting Clone to Target DB: [${targetName}]`);
      console.log(`======================================================`);

      const targetDb = client.db(targetName);
      let totalCopiedCollections = 0;
      let totalCopiedDocs = 0;

      for (const colInfo of collections) {
        const colName = colInfo.name;

        // Skip system collections if any
        if (colName.startsWith('system.')) continue;

        const sourceCol = sourceDb.collection(colName);
        const targetCol = targetDb.collection(colName);

        const count = await sourceCol.countDocuments();
        if (count === 0) {
          // Create empty collection in target if it doesn't exist
          await targetDb.createCollection(colName).catch(() => {});
          continue;
        }

        // Fetch documents from source
        const docs = await sourceCol.find({}).toArray();

        // Check if target already has docs
        const targetExistingCount = await targetCol.countDocuments();
        if (targetExistingCount === 0) {
          // Batch insert into target
          const batchSize = 500;
          for (let i = 0; i < docs.length; i += batchSize) {
            const batch = docs.slice(i, i + batchSize);
            await targetCol.insertMany(batch, { ordered: false });
          }
          console.log(`  ✓ Cloned ${colName}: ${docs.length} documents`);
        } else {
          console.log(`  ℹ ${colName} already exists in ${targetName} with ${targetExistingCount} docs. Skipping overwrite.`);
        }

        // Clone custom indexes (except _id_)
        try {
          const indexes = await sourceCol.indexes();
          for (const index of indexes) {
            if (index.name === '_id_') continue;
            const keys = index.key;
            const options = { name: index.name };
            if (index.unique) options.unique = true;
            if (index.sparse) options.sparse = true;
            if (index.partialFilterExpression) options.partialFilterExpression = index.partialFilterExpression;
            if (index.expireAfterSeconds !== undefined) options.expireAfterSeconds = index.expireAfterSeconds;

            await targetCol.createIndex(keys, options).catch((idxErr) => {
              // Ignore if index already exists
            });
          }
        } catch (indexErr) {
          // Ignore index warning
        }

        totalCopiedCollections++;
        totalCopiedDocs += count;
      }

      console.log(`\n🎉 Completed [${targetName}]: Copied ${totalCopiedDocs} documents across ${totalCopiedCollections} collections.`);
    }

    console.log(`\n======================================================`);
    console.log(`✅ ALL DATA SUCCESSFULLY TRANSFERRED TO BOTH DATABASES!`);
    console.log(`   1. solarkits_staging_db (Ready for Render Testing)`);
    console.log(`   2. solarkits_production_db (Ready for Hostinger Live)`);
    console.log(`======================================================`);

  } catch (error) {
    console.error('❌ Migration error:', error);
  } finally {
    await client.close();
  }
}

cloneDatabase();

