const mongoose = require('mongoose');
const { solarkits_core_db: db } = require('../../config/databases');

// brand_state_map — brand_id SAME DB → ObjectId; state_legacy_id CROSS DB numeric
const s = new mongoose.Schema({

  brand_id: { type: mongoose.Schema.Types.ObjectId, ref: 'brands', required: true },
  state_id: { type: mongoose.Schema.Types.ObjectId, default: null, required: true }, // CROSS DB → geo level_1
  deleted_at: { type: Date, default: null },
  created_at: { type: Date, default: Date.now },
}, { collection: 'brand_state_map', timestamps: false, toJSON: { virtuals: true }, toObject: { virtuals: true } });
s.index({ brand_id: 1, state_id: 1 }, { unique: true });
s.virtual('id').get(function () { return this._id; });
module.exports = db.model('brand_state_map', s);
