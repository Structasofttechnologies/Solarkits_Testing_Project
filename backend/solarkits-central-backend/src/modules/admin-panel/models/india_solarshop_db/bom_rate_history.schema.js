const mongoose = require('mongoose');
const { india_solarshop_db } = require('../../config/databases');

/**
 * bom_rate_history — Audit trail for changes to BOM item rates.
 *
 * Captures historical rates and location rules when an admin modifies a BOM item.
 *
 * Collection: bom_rate_history
 */

const schema = new mongoose.Schema(
  {
    bom_id:                 { type: mongoose.Schema.Types.ObjectId, ref: 'project_bom_items', required: true, index: true },
    old_rate:               { type: Number, default: 0 },
    new_rate:               { type: Number, required: true },
    rate_type:              { type: String, required: true },
    location_rules_snapshot:{ type: Object, default: null },
    effective_from:         { type: Date, default: Date.now },
    effective_to:           { type: Date, default: null },
    updated_by:             { type: mongoose.Schema.Types.ObjectId, default: null },
    reason:                 { type: String, default: null, trim: true, maxlength: 1000 },
  },
  {
    collection: 'bom_rate_history',
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
    toJSON:   { virtuals: true },
    toObject: { virtuals: true },
  }
);

schema.index({ bom_id: 1, created_at: -1 });

module.exports = india_solarshop_db.model('bom_rate_history', schema);
