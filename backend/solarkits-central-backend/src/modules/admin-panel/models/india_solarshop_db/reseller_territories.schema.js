const mongoose = require('mongoose');
const { india_solarshop_db } = require('../../config/databases');

/**
 * reseller_territories — Geographical territory assignments for Resellers.
 *
 * Precedence rule:
 *   1. 'admin_override' / 'admin_assigned': Explicit admin assignment overrides plan defaults
 *   2. 'plan': Default territory count/scope derived from active plan subscription
 *   3. 'gst_derived': Automatic fallback from reseller's GSTIN state registration
 *
 * Phase R3 additions:
 *   - assignment_type: 'primary' | 'secondary' | 'temporary'
 *   - exclusivity_scope: 'strict' | 'multi_reseller' | 'category' | 'product' | 'industry'
 *   - allowed_project_type_ids, allowed_industry_type_ids
 *   - is_exclusive boolean
 *   - Partial unique index for strict district exclusivity
 *
 * Collection: reseller_territories
 */
const schema = new mongoose.Schema({
  reseller_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'resellers',
    required: true,
  },
  territory_level: {
    type: String,
    enum: ['district', 'state', 'country'],
    required: true,
    default: 'district',
  },
  country_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'geolocation_level_0',
    required: true,
  },
  state_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'geolocation_level_1',
    default: null,
  },
  district_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'geolocation_level_2',
    default: null,
  },

  // ── Phase R3 Exclusivity & Scope Control ──────────────────────────────
  assignment_type: {
    type: String,
    enum: ['primary', 'secondary', 'temporary'],
    default: 'primary',
  },
  exclusivity_scope: {
    type: String,
    enum: ['strict', 'multi_reseller', 'category', 'product', 'industry'],
    default: 'strict',
  },
  is_exclusive: {
    type: Boolean,
    default: true,
  },
  allowed_project_type_ids: [{
    type: mongoose.Schema.Types.ObjectId,
    default: [],
  }],
  allowed_industry_type_ids: [{
    type: mongoose.Schema.Types.ObjectId,
    default: [],
  }],

  source: {
    type: String,
    enum: ['gst_derived', 'plan', 'admin_assigned', 'admin_override'],
    required: true,
    default: 'admin_assigned',
  },
  assigned_by: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'cms_users',
    default: null,
  },
  override_reason: {
    type: String,
    default: null,
    trim: true,
    maxlength: 1000,
  },
  effective_date: {
    type: Date,
    default: Date.now,
  },
  expiry_date: {
    type: Date,
    default: null,
  },
  status: {
    type: String,
    enum: ['active', 'expired', 'revoked'],
    default: 'active',
  },
}, {
  collection: 'reseller_territories',
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
});

schema.index({ reseller_id: 1, status: 1 });
schema.index({ country_id: 1, state_id: 1, district_id: 1, status: 1 });
schema.index({ source: 1, status: 1 });

// Partial unique indexes to enforce race-safe 1-to-1 franchise exclusivity per level
schema.index(
  { district_id: 1, status: 1, assignment_type: 1 },
  {
    unique: true,
    partialFilterExpression: {
      status: 'active',
      is_exclusive: true,
      assignment_type: 'primary',
      territory_level: 'district',
      district_id: { $type: 'objectId' },
    },
  }
);

schema.index(
  { state_id: 1, status: 1, assignment_type: 1 },
  {
    unique: true,
    partialFilterExpression: {
      status: 'active',
      is_exclusive: true,
      assignment_type: 'primary',
      territory_level: 'state',
      state_id: { $type: 'objectId' },
    },
  }
);

schema.index(
  { country_id: 1, status: 1, assignment_type: 1 },
  {
    unique: true,
    partialFilterExpression: {
      status: 'active',
      is_exclusive: true,
      assignment_type: 'primary',
      territory_level: 'country',
      country_id: { $type: 'objectId' },
    },
  }
);

schema.virtual('id').get(function () { return this._id; });

module.exports = india_solarshop_db.model('reseller_territories', schema);
