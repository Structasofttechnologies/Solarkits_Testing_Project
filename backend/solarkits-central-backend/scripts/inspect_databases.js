const { MongoClient } = require('mongodb');

const uri = "mongodb+srv://ravistructasoftadmin_db_user:GdvjlulsL90F4rGL@solarkits-shop.ke2zpjx.mongodb.net/?appName=solarkits-shop";

async function inspect() {
  const client = new MongoClient(uri);
  try {
    await client.connect();
    console.log("Connected to MongoDB Cluster!");
    const adminDb = client.db().admin();
    const dbsList = await adminDb.listDatabases();
    console.log("\nDatabases in cluster:");
    for (const db of dbsList.databases) {
      console.log(` - ${db.name} (Size: ${(db.sizeOnDisk / 1024 / 1024).toFixed(2)} MB)`);
      if (!['admin', 'local', 'config'].includes(db.name)) {
        const currentDb = client.db(db.name);
        const collections = await currentDb.listCollections().toArray();
        console.log(`   Collections count: ${collections.length}`);
        for (const col of collections) {
          const count = await currentDb.collection(col.name).countDocuments();
          if (count > 0) {
            console.log(`     • ${col.name}: ${count} docs`);
          }
        }
      }
    }
  } catch (err) {
    console.error("Error inspecting:", err);
  } finally {
    await client.close();
  }
}

inspect();

