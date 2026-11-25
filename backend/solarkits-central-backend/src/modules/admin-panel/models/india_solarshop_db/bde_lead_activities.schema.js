const mongoose = require('mongoose');
const { india_solarshop_db } = require('../../config/databases');

/**
 * bde_lead_activities — Chronological activity logs, call notes, and meeting records for BDE leads.
 *
 * Collection: bde_lead_activities
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
  bde_name: { type: String, default: null, trim: true },
  activity_type: {
    type: String,
    enum: [
      'call',
      'meeting',
      'site_visit',
      'demo',
      'email',
      'note',
      'stage_change',
      'reassigned',
      'signup_initiated',
    ],
    default: 'note',
  },
  title: { type: String, default: 'Activity Log', trim: true },
  notes: { type: String, default: '', trim: true },
  previous_stage: { type: String, default: null },
  new_stage: { type: String, default: null },
  location: { type: String, default: null, trim: true },
  next_follow_up_date: { type: Date, default: null },
  created_at: { type: Date, default: Date.now },
}, {
  collection: 'bde_lead_activities',
  timestamps: false,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
});

schema.index({ lead_id: 1, created_at: -1 });
schema.index({ bde_id: 1, created_at: -1 });

schema.virtual('id').get(function () { return this._id; });

module.exports = india_solarshop_db.model('bde_lead_activities', schema);
