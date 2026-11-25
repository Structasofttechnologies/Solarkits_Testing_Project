const { Task } = require('./models/user_db');
const { USER_DB } = require('../../config/databases');
const { sendEvent } = require('./sse'); // SSE broadcaster

let taskStream = null;

function initTaskStream() {
  if (taskStream) return;
  try {
    taskStream = Task.watch([], { fullDocument: 'updateLookup' });

    taskStream.on('change', (change) => {
      if (['insert', 'update', 'replace'].includes(change.operationType)) {
        const notification = {
          type: change.operationType,
          collection: 'tasks',
          documentId: change.documentKey._id,
          data: change.fullDocument,
          updateDescription: change.updateDescription,
          timestamp: new Date().toISOString()
        };

        console.log(`🔔 Task change detected: ${change.operationType}`);
        sendEvent(notification);
      }
    });

    taskStream.on('error', (err) => {
      if (err.code === 40573 || err.codeName === 'Location40573' || err.message.includes('replica sets')) {
        console.warn('⚠️ Local MongoDB standalone detected. Task Change Streams (watch) disabled (requires a MongoDB Replica Set).');
      } else if (err.message && err.message.includes('buffering timed out')) {
        console.warn('⚠️ Task Change Stream connection buffered/timed out.');
      } else {
        console.error('❌ Task Change Stream Error:', err);
      }
    });

    console.log('📡 MongoDB Change Stream listener running for tasks');
  } catch (err) {
    console.warn('⚠️ Could not initialize Task Change Stream:', err.message);
  }
}

if (USER_DB && USER_DB.readyState === 1) {
  initTaskStream();
} else if (USER_DB && typeof USER_DB.once === 'function') {
  USER_DB.once('open', initTaskStream);
}
// Fallback timeout in case connection takes longer
setTimeout(() => {
  if (!taskStream && USER_DB && USER_DB.readyState === 1) {
    initTaskStream();
  }
}, 3000);

module.exports = taskStream;
