const mongoose = require('mongoose');
const { india_solarshop_db } = require('../../config/databases');

const schema = new mongoose.Schema({
  account_id: { type: mongoose.Schema.Types.ObjectId, ref: 'epc_accounts', required: true },
  state_id: { type: mongoose.Schema.Types.ObjectId, required: true },
  district_id: { type: mongoose.Schema.Types.ObjectId, required: true },
  is_primary: { type: Boolean, default: false },
  deleted_at: { type: Date, default: null }
}, { 
  collection: 'epc_account_locations', 
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  toJSON: { virtuals: true }, 
  toObject: { virtuals: true } 
});

schema.virtual('id').get(function () { return this._id; });
module.exports = india_solarshop_db.model('epc_account_locations', schema);
