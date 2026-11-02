const { MongoClient } = require('mongodb');

const uri = "mongodb+srv://ravistructasoftadmin_db_user:GdvjlulsL90F4rGL@solarkits-shop.ke2zpjx.mongodb.net/?retryWrites=true&w=majority&appName=solarkits-shop";

async function cleanupAndInspect() {
  const client = new MongoClient(uri);
  try {
    await client.connect();
    console.log("Connected to MongoDB cluster.");

    // 1. Drop partially created solarkits_production_db
    console.log("Dropping incomplete solarkits_production_db...");
    await client.db('solarkits_production_db').dropDatabase();
    console.log("Dropped solarkits_production_db.");

    // 2. Remove empty collections in solarkits_staging_db
    const stagingDb = client.db('solarkits_staging_db');
    const stagingCols = await stagingDb.listCollections().toArray();
    let stagingEmptyDropped = 0;
    for (const col of stagingCols) {
      const count = await stagingDb.collection(col.name).countDocuments();
      if (count === 0) {
        await stagingDb.collection(col.name).drop();
        stagingEmptyDropped++;
      }
    }
    console.log(`Dropped ${stagingEmptyDropped} empty collections from solarkits_staging_db.`);

    // 3. Count remaining collections in entire cluster
    const adminDb = client.db().admin();
    const dbs = await adminDb.listDatabases();
    let totalClusterCols = 0;
    for (const d of dbs.databases) {
      if (['admin', 'local', 'config'].includes(d.name)) continue;
      const cols = await client.db(d.name).listCollections().toArray();
      console.log(`- ${d.name}: ${cols.length} collections`);
      totalClusterCols += cols.length;
    }
    console.log(`Total active collections in cluster: ${totalClusterCols} / 500`);

  } catch (err) {
    console.error("Error:", err);
  } finally {
    await client.close();
  }
}

cleanupAndInspect();

