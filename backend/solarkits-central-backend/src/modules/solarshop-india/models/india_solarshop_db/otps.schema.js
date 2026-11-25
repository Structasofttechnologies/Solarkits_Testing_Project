const mongoose = require('mongoose');
const { india_solarshop_db } = require('../../config/databases');

const schema = new mongoose.Schema({
  otp: { type: String, required: true },
  channel: { type: String, enum: ['email', 'whatsapp', 'sms', 'mobile'], required: true },
  target: { type: String, required: true },
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'epc_accounts', required: true },
  reference_type: { type: String, default: 'forgot_password' },
  ip_address: { type: String, default: null },
  expires_at: { type: Date, required: true },
  verified_at: { type: Date, default: null },
  deleted_at: { type: Date, default: null }
}, {
  collection: 'otps',
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

schema.virtual('id').get(function () { return this._id; });
module.exports = india_solarshop_db.model('otps', schema);
