const mongoose = require('mongoose');
const { india_solarshop_db } = require('../../config/databases');

const schema = new mongoose.Schema({
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'epc_accounts', required: true },
  token: { type: String, required: true, unique: true },
  expires_at: { type: Date, required: true },
  revoked_at: { type: Date, default: null },
  ip_address: { type: String, default: null },
  user_agent: { type: String, default: null },
  deleted_at: { type: Date, default: null }
}, { 
  collection: 'user_refresh_tokens', 
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  toJSON: { virtuals: true }, 
  toObject: { virtuals: true } 
});

schema.virtual('id').get(function () { return this._id; });
module.exports = india_solarshop_db.model('user_refresh_tokens', schema);
