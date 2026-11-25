const mongoose = require('mongoose');
const { solarkits_core_db: db } = require('../../config/databases');

// brand_subtype_map — brand_id, subtype_id SAME DB → ObjectId
const s = new mongoose.Schema({
  brand_id: { type: mongoose.Schema.Types.ObjectId, ref: 'brands', required: true },
  subtype_id: { type: mongoose.Schema.Types.ObjectId, ref: 'pc_product_subtypes', required: true },
  deleted_at: { type: Date, default: null },
  created_at: { type: Date, default: Date.now },
}, { collection: 'pc_brand_subtype_map', timestamps: false, toJSON: { virtuals: true }, toObject: { virtuals: true } });
s.index({ brand_id: 1, subtype_id: 1 }, { unique: true });
s.virtual('id').get(function () { return this._id; });
module.exports = db.model('pc_brand_subtype_map', s);
