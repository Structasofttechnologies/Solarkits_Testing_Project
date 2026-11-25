const mongoose = require('mongoose');
const { india_solarshop_db } = require('../../config/databases');

const schema = new mongoose.Schema({
  otp: { type: String, required: true },
  channel: { type: String, enum: ['email', 'whatsapp'], required: true },
  target: { type: String, required: true }, // email or phone
  ip_address: { type: String, default: null },
  expires_at: { type: Date, required: true },
  verified_at: { type: Date, default: null },
  deleted_at: { type: Date, default: null }
}, { 
  collection: 'signup_verifications', 
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  toJSON: { virtuals: true }, 
  toObject: { virtuals: true } 
});

schema.virtual('id').get(function () { return this._id; });
module.exports = india_solarshop_db.model('signup_verifications', schema);
