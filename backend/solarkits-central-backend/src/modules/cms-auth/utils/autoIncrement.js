const mongoose = require('mongoose');

/**
 * Returns the next auto-increment integer for a given collection,
 * simulating MySQL AUTO_INCREMENT using a counters collection.
 *
 * @param {mongoose.Connection} conn - The Mongoose connection to use
 * @param {string} collectionName    - e.g. 'cms_users', 'otps'
 * @returns {Promise<number>}
 */
const getNextId = async (conn, collectionName) => {
  const counterSchema = new mongoose.Schema(
    { _id: String, seq: { type: Number, default: 0 } },
    { collection: 'counters' }
  );

  // Reuse model if already registered on this connection
  const Counter = conn.models.counters || conn.model('counters', counterSchema);

  const counter = await Counter.findByIdAndUpdate(
    collectionName,
    { $inc: { seq: 1 } },
    { new: true, upsert: true }
  );
  return counter.seq;
};

module.exports = { getNextId };
