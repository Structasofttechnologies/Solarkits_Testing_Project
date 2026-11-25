const mongoose = require('mongoose');
const { india_solarshop_db } = require('../../config/databases');

const schema = new mongoose.Schema({
  account_id: { type: mongoose.Schema.Types.ObjectId, ref: 'epc_accounts', required: true, unique: true },
  cart: { type: Array, default: [] },
  bulkCart: { type: Array, default: [] }
}, { 
  collection: 'carts', 
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  toJSON: { virtuals: true }, 
  toObject: { virtuals: true } 
});

schema.virtual('id').get(function () { return this._id; });
module.exports = india_solarshop_db.model('carts', schema);
