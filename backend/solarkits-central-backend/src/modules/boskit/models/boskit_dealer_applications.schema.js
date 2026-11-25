const mongoose = require('mongoose');
const { india_solarshop_db: db } = require('../../admin-panel/config/databases');

/**
 * boskit_dealer_applications — Dealer onboarding state (distributor-initiated).
 *
 * Created when a Distributor starts the "Add Dealer" flow.
 *
 * Collection: boskit_dealer_applications
 */

const statusHistorySchema = new mongoose.Schema({
  status:     { type: String, required: true },
  actor_type: { type: String, enum: ['cms_user', 'boskit_distributor', 'system'], required: true },
  actor_id:   { type: mongoose.Schema.Types.ObjectId, default: null },
  note:       { type: String, default: null, trim: true, maxlength: 2000 },
  timestamp:  { type: Date, default: Date.now },
}, { _id: false });

const schema = new mongoose.Schema({
  // ── Relationships ─────────────────────────────────────────────────────────
  dealer_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'boskit_dealers',
    required: true,
  },
  distributor_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'boskit_distributors',
    required: true,
  },

  // ── Application Status ────────────────────────────────────────────────────
  status: {
    type: String,
    enum: [
      'draft',
      'gst_verified',
      'under_review',
      'approved',
      'rejected',
      'activated',
    ],
    default: 'draft',
  },

  // ── Step Data ─────────────────────────────────────────────────────────────
  step_completed: { type: Number, default: 0, min: 0, max: 15 },

  step_data: {
    // Step 3-4: GST verification
    gst: {
      gst_number:          { type: String, default: null },
      gst_verification_id: { type: mongoose.Schema.Types.ObjectId, ref: 'gst_verification_logs', default: null },
      verification_status: { type: String, enum: ['pending', 'verified', 'failed', null], default: null },
    },

    // Step 5-6: Location
    location: {
      state_id:    { type: mongoose.Schema.Types.ObjectId, ref: 'geolocation_level_1', default: null },
      district_id: { type: mongoose.Schema.Types.ObjectId, ref: 'geolocation_level_2', default: null },
    },

    // Step 9: Assigned products
    product_assignments: [{
      product_id: { type: mongoose.Schema.Types.ObjectId, ref: 'products' },
      kit_id:     { type: mongoose.Schema.Types.ObjectId, ref: 'warehouse_combo_kits', default: null },
    }],

    // Step 10-11: Dealer pricing config (set by distributor within admin limits)
    pricing_config: [{
      product_id:          { type: mongoose.Schema.Types.ObjectId, ref: 'products', default: null },
      kit_id:              { type: mongoose.Schema.Types.ObjectId, ref: 'warehouse_combo_kits', default: null },
      dealer_price_paise:  { type: Number, default: null, min: 0 },
      discount_type:       { type: String, enum: ['percentage', 'fixed', null], default: null },
      discount_value:      { type: Number, default: null, min: 0 },
    }],

    // Step 12: MOQ config
    moq_config: [{
      product_id: { type: mongoose.Schema.Types.ObjectId, ref: 'products', default: null },
      kit_id:     { type: mongoose.Schema.Types.ObjectId, ref: 'warehouse_combo_kits', default: null },
      moq:        { type: Number, default: 1, min: 1 },
    }],

    // Step 15: Account activation notification sent
    activation_notified_at: { type: Date, default: null },
  },

  // ── Status Audit History ──────────────────────────────────────────────────
  status_history: [statusHistorySchema],

  // ── Admin Review ─────────────────────────────────────────────────────────
  rejection_reason: { type: String, default: null, trim: true, maxlength: 2000 },
  internal_notes:   { type: String, default: null, trim: true, maxlength: 5000 },
  reviewed_by:      { type: mongoose.Schema.Types.ObjectId, ref: 'cms_users', default: null },
  reviewed_at:      { type: Date, default: null },

  // ── Soft Delete ──────────────────────────────────────────────────────────
  deleted_at: { type: Date, default: null },
}, {
  collection: 'boskit_dealer_applications',
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
});

schema.index({ dealer_id: 1 }, { unique: true });
schema.index({ distributor_id: 1, status: 1 });
schema.index({ status: 1, created_at: -1 });

schema.virtual('id').get(function () { return this._id; });

module.exports = db.model('boskit_dealer_applications', schema);
