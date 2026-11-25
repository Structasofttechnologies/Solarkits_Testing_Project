const mongoose = require('mongoose');
const { india_solarshop_db } = require('../../config/databases');

/**
 * bde_follow_ups — Scheduled prospect follow-ups, calls, and meetings.
 *
 * Collection: bde_follow_ups
 */
const schema = new mongoose.Schema({
  lead_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'bde_leads',
    required: true,
  },
  bde_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'bde_profiles',
    required: true,
  },
  follow_up_date: { type: Date, required: true },
  follow_up_time: { type: String, default: '11:00 AM', trim: true },
  purpose: { type: String, required: true, trim: true },
  status: {
    type: String,
    enum: ['scheduled', 'completed', 'rescheduled', 'cancelled', 'overdue'],
    default: 'scheduled',
  },
  outcome_notes: { type: String, default: null, trim: true },
  completed_at: { type: Date, default: null },
}, {
  collection: 'bde_follow_ups',
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
});

schema.index({ bde_id: 1, follow_up_date: 1, status: 1 });
schema.index({ lead_id: 1, follow_up_date: 1 });

schema.virtual('id').get(function () { return this._id; });

module.exports = india_solarshop_db.model('bde_follow_ups', schema);
