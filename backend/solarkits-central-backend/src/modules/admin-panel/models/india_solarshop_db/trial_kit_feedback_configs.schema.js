const mongoose = require('mongoose');
const { india_solarshop_db: db } = require('../../config/databases');

/**
 * TrialKitFeedbackConfig — State & District-wise purchase intent & feedback configuration.
 * Configures whether an EPC partner in a region gives Loose Orders, Bulk PO, or Both feedback,
 * and specifies the exact batch quantity pills shown on the storefront.
 */
const schema = new mongoose.Schema({
  state_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'geolocation_level_1',
    required: true,
    index: true,
  },
  state_name: {
    type: String,
    required: true,
    trim: true,
  },
  // district_id is null when is_state_default is true
  district_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'geolocation_level_2',
    default: null,
    index: true,
  },
  district_name: {
    type: String,
    default: null,
    trim: true,
  },
  // Mode: only loose, only bulk po, or both
  feedback_mode: {
    type: String,
    enum: ['loose_only', 'po_only', 'both'],
    default: 'both',
  },
  // Quantities to display in Question 2
  loose_quantities: {
    type: [Number],
    default: [45, 75, 105],
  },
  po_quantities: {
    type: [Number],
    default: [200, 500, 1000],
  },
  // When 'both' is selected, which option is pre-selected by default
  default_mode: {
    type: String,
    enum: ['loose', 'bulk_po'],
    default: 'loose',
  },
  is_active: {
    type: Boolean,
    default: true,
  },
  is_state_default: {
    type: Boolean,
    default: false,
  },
  updated_by_name: {
    type: String,
    default: 'Admin',
  },
}, {
  collection: 'trial_kit_feedback_configs',
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
});

schema.virtual('id').get(function () {
  return this._id;
});

schema.index({ state_id: 1, district_id: 1 }, { unique: true });
schema.index({ state_name: 1, district_name: 1 });

module.exports = db.model('trial_kit_feedback_configs', schema);
