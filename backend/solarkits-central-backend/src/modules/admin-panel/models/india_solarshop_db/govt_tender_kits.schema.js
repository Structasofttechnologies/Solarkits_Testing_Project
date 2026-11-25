const mongoose = require('mongoose');
const { india_solarshop_db: db } = require('../../config/databases');

const schema = new mongoose.Schema({
  state_id:           { type: mongoose.Schema.Types.ObjectId, required: true },
  state_name:         { type: String, required: true, trim: true },
  combo_kit_id:       { type: mongoose.Schema.Types.ObjectId, ref: 'pc_comobo_kit', required: true },
  display_name:       { type: String, default: null, trim: true },
  tagline:            { type: String, default: 'Specially Configured for Government Projects', trim: true },
  tender_description: { type: String, default: null },
  product_image:      { type: String, default: null, trim: true },
  product_video:      { type: String, default: null, trim: true },
  display_tag:        { type: String, default: 'Govt. Tender', trim: true },
  secondary_tag:      { type: String, default: 'Bulk Supply', trim: true },
  has_dcr_option:     { type: Boolean, default: true },
  priority:           { type: Number, default: 1, min: 1 },
  is_active:          { type: Boolean, default: true },
  notes:              { type: String, default: null },
  created_at:         { type: Date, default: Date.now },
  updated_at:         { type: Date, default: Date.now },
  deleted_at:         { type: Date, default: null }
}, {
  collection: 'govt_tender_kits',
  timestamps: false,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

schema.virtual('id').get(function () { return this._id; });

schema.index({ state_id: 1, combo_kit_id: 1, deleted_at: 1 });
schema.index({ state_id: 1, is_active: 1, deleted_at: 1 });
schema.index({ combo_kit_id: 1, deleted_at: 1 });

module.exports = db.model('govt_tender_kits', schema);
