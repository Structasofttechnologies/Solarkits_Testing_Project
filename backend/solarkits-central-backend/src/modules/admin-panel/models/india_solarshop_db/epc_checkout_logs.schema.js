const mongoose = require('mongoose');
const { india_solarshop_db } = require('../../config/databases');

/**
 * epc_checkout_logs — Audit log for EPC buyer cart checkout validations & territory routing checks.
 *
 * Collection: epc_checkout_logs
 */
const schema = new mongoose.Schema({
  epc_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'epc_accounts',
    default: null,
  },
  assigned_reseller_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'resellers',
    default: null,
  },
  routing_source: {
    type: String,
    enum: ['primary_reseller', 'territory_match', 'direct_fallback'],
    default: 'territory_match',
  },
  delivery_address: {
    state_id:    { type: mongoose.Schema.Types.ObjectId, ref: 'geolocation_level_1', default: null },
    district_id: { type: mongoose.Schema.Types.ObjectId, ref: 'geolocation_level_2', default: null },
    pincode:     { type: String, default: null },
  },
  cart_snapshot:       { type: Object, default: {} },
  calculated_totals:   { type: Object, default: {} },
  is_valid:            { type: Boolean, required: true },
  validation_messages: [{ type: String }],
  created_at:          { type: Date, default: Date.now },
}, {
  collection: 'epc_checkout_logs',
  timestamps: false,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
});

schema.index({ epc_id: 1, created_at: -1 });
schema.index({ assigned_reseller_id: 1, created_at: -1 });

schema.virtual('id').get(function () { return this._id; });

module.exports = india_solarshop_db.model('epc_checkout_logs', schema);
