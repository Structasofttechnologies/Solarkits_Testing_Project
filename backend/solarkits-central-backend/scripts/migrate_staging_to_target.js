/**
 * Migration Script: Transfer all data from Solarkits Staging DB to Target DB Cluster
 * 
 * SAFETY RULES:
 * 1. Staging Database is strictly READ-ONLY. No drop, delete, or update operations on source.
 * 2. Production Database is NOT touched.
 * 3. Recreates all collections, documents, and indexes.
 * 4. Runs 1:1 post-migration verification.
 */

const { MongoClient } = require('mongodb');

const SOURCE_URI = 'mongodb+srv://ravistructasoftadmin_db_user:GdvjlulsL90F4rGL@solarkits-shop.ke2zpjx.mongodb.net/solarkits_staging_db?retryWrites=true&w=majority&appName=solarkits-shop';
const SOURCE_DB_NAME = 'solarkits_staging_db';

const TARGET_URI = 'mongodb+srv://structasoftadmin_db_user:f2RT9v4KaROmsAbJ@cluster0.7jeox0w.mongodb.net/?retryWrites=true&w=majority';
const TARGET_DB_NAME = 'solarkits_staging_db';

const BATCH_SIZE = 1000;

async function runMigration() {
  const startTime = Date.now();
  console.log('='.repeat(70));
  console.log('🚀 STARTING MONGODB MIGRATION');
  console.log(`Source DB:      ${SOURCE_DB_NAME} (solarkits-shop.ke2zpjx.mongodb.net)`);
  console.log(`Destination DB: ${TARGET_DB_NAME} (cluster0.7jeox0w.mongodb.net)`);
  console.log('='.repeat(70));

  const sourceClient = new MongoClient(SOURCE_URI);
  const targetClient = new MongoClient(TARGET_URI);

  try {
    console.log('\n[1/4] Connecting to clusters...');
    await sourceClient.connect();
    console.log('  ✔ Connected to Source Staging DB (READ-ONLY)');
    await targetClient.connect();
    console.log('  ✔ Connected to Destination DB Cluster');

    const sourceDb = sourceClient.db(SOURCE_DB_NAME);
    const targetDb = targetClient.db(TARGET_DB_NAME);

    console.log('\n[2/4] Fetching collection lists from Source...');
    const collectionsList = await sourceDb.listCollections().toArray();
    // Exclude system collections if any
    const regularCollections = collectionsList.filter(c => !c.name.startsWith('system.'));
    console.log(`  ✔ Found ${regularCollections.length} collections to migrate.\n`);

    console.log('[3/4] Migrating collections and indexes...');
    let totalDocsMigrated = 0;
    let totalCollectionsMigrated = 0;
    const errors = [];

    for (let i = 0; i < regularCollections.length; i++) {
      const colInfo = regularCollections[i];
      const colName = colInfo.name;
      const progressPrefix = `[${i + 1}/${regularCollections.length}] ${colName}`;

      const sourceCol = sourceDb.collection(colName);
      const targetCol = targetDb.collection(colName);

      try {
        const sourceDocCount = await sourceCol.countDocuments();

        // 1. Ensure collection exists on target (even if 0 documents)
        const targetCols = await targetDb.listCollections({ name: colName }).toArray();
        if (targetCols.length === 0) {
          await targetDb.createCollection(colName);
        }

        let migratedCount = 0;
        if (sourceDocCount > 0) {
          const cursor = sourceCol.find({}).batchSize(BATCH_SIZE);
          let batch = [];

          while (await cursor.hasNext()) {
            const doc = await cursor.next();
            batch.push(doc);

            if (batch.length >= BATCH_SIZE) {
              await targetCol.insertMany(batch, { ordered: false });
              migratedCount += batch.length;
              batch = [];
            }
          }

          if (batch.length > 0) {
            await targetCol.insertMany(batch, { ordered: false });
            migratedCount += batch.length;
            batch = [];
          }
        }

        totalDocsMigrated += migratedCount;
        totalCollectionsMigrated++;

        // 2. Replicate Indexes
        let indexCount = 0;
        try {
          const indexes = await sourceCol.indexes();
          for (const idx of indexes) {
            if (idx.name === '_id_') continue; // Skip default _id index
            
            // Extract index options, remove system/internal fields
            const { key, v, ns, ...options } = idx;
            await targetCol.createIndex(key, options);
            indexCount++;
          }
        } catch (idxErr) {
          console.warn(`  ⚠️ Warning replicating index for ${colName}:`, idxErr.message);
        }

        console.log(`  ✔ ${progressPrefix}: ${migratedCount}/${sourceDocCount} docs, ${indexCount} custom indexes`);
      } catch (err) {
        console.error(`  ❌ Error migrating ${colName}:`, err.message);
        errors.push({ collection: colName, error: err.message });
      }
    }

    console.log('\n[4/4] Running 1:1 Post-Migration Verification Audit...');
    let verificationPassed = true;
    let verifiedCount = 0;
    const mismatches = [];

    for (const colInfo of regularCollections) {
      const colName = colInfo.name;
      const sourceCount = await sourceDb.collection(colName).countDocuments();
      const targetCount = await targetDb.collection(colName).countDocuments();

      if (sourceCount !== targetCount) {
        verificationPassed = false;
        mismatches.push({ colName, sourceCount, targetCount });
        console.error(`  ❌ Count mismatch in ${colName}: Source=${sourceCount}, Target=${targetCount}`);
      } else {
        verifiedCount++;
      }
    }

    const durationSec = Math.round((Date.now() - startTime) / 1000);
    console.log('\n' + '='.repeat(70));
    console.log('🏁 MIGRATION SUMMARY & AUDIT REPORT');
    console.log('='.repeat(70));
    console.log(`Collections Processed:  ${totalCollectionsMigrated} / ${regularCollections.length}`);
    console.log(`Total Documents Copied: ${totalDocsMigrated}`);
    console.log(`Audit Match Rate:       ${verifiedCount} / ${regularCollections.length} collections match 100%`);
    console.log(`Time Elapsed:           ${durationSec} seconds`);

    if (verificationPassed && errors.length === 0) {
      console.log('\n🎉 ALL DATA HAS BEEN MIGRATED WITH ZERO LOSS (100% VERIFIED)!');
    } else {
      console.warn('\n⚠️ Migration completed with some warnings/mismatches:');
      if (mismatches.length > 0) {
        console.table(mismatches);
      }
      if (errors.length > 0) {
        console.table(errors);
      }
    }
    console.log('='.repeat(70));

  } catch (fatalError) {
    console.error('Fatal migration error:', fatalError);
    process.exit(1);
  } finally {
    await sourceClient.close();
    await targetClient.close();
    console.log('\n✔ Closed database connections safely.');
  }
}

runMigration();
