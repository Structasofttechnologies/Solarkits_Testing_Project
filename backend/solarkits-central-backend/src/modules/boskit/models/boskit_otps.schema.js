const mongoose = require('mongoose');
const { india_solarshop_db: db } = require('../../admin-panel/config/databases');

/**
 * boskit_otps — OTP verification storage for BOSKIT platform.
 *
 * Used for:
 *   - Distributor & Dealer registration verification (mobile / email)
 *   - Forgot password verification
 *   - Step verification in onboarding wizards
 *
 * Collection: boskit_otps
 */

const schema = new mongoose.Schema({
  target: {
    type: String,
    required: true,
    trim: true,
    lowercase: true,
    // Email or mobile number
  },
  channel: {
    type: String,
    enum: ['email', 'mobile', 'whatsapp'],
    required: true,
  },
  otp_hash: {
    type: String,
    required: true,
  },
  purpose: {
    type: String,
    enum: ['distributor_signup', 'dealer_signup', 'forgot_password', 'login_2fa', 'verification'],
    default: 'verification',
  },
  entity_type: {
    type: String,
    enum: ['boskit_distributor', 'boskit_dealer', 'anonymous'],
    default: 'anonymous',
  },
  entity_id: {
    type: mongoose.Schema.Types.ObjectId,
    default: null,
  },
  attempts: {
    type: Number,
    default: 0,
    max: 5,
  },
  ip_address: {
    type: String,
    default: null,
  },
  expires_at: {
    type: Date,
    required: true,
  },
  verified_at: {
    type: Date,
    default: null,
  },
}, {
  collection: 'boskit_otps',
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
});

schema.index({ target: 1, purpose: 1, verified_at: 1, expires_at: 1 });
schema.index({ entity_id: 1, purpose: 1 });
schema.index({ expires_at: 1 }, { expireAfterSeconds: 86400 }); // auto-delete after 24h

schema.virtual('id').get(function () { return this._id; });

module.exports = db.model('boskit_otps', schema);
