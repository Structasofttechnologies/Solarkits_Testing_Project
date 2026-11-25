const mongoose = require('mongoose');
const { india_solarshop_db } = require('../../config/databases');

/**
 * bde_activity_logs — Complete audit trail of BDE events, assignments, and status modifications.
 *
 * Collection: bde_activity_logs
 */
const schema = new mongoose.Schema({
  bde_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'bde_profiles',
    required: true,
    index: true,
  },
  actor_type: {
    type: String,
    enum: ['admin', 'bde', 'system'],
    default: 'admin',
  },
  actor_id: {
    type: mongoose.Schema.Types.ObjectId,
    default: null,
  },
  actor_name: {
    type: String,
    default: null,
    trim: true,
  },
  action: {
    type: String,
    required: true,
    trim: true,
    uppercase: true,
    index: true,
  },
  details: {
    type: mongoose.Schema.Types.Mixed,
    default: null,
  },
  notes: {
    type: String,
    default: null,
    trim: true,
    maxlength: 2000,
  },
  ip_address: {
    type: String,
    default: null,
  },
  user_agent: {
    type: String,
    default: null,
  },
}, {
  collection: 'bde_activity_logs',
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
});

schema.virtual('id').get(function () {
  return this._id;
});

module.exports = india_solarshop_db.model('bde_activity_logs', schema);
