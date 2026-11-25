const mongoose = require('mongoose');
const { solarkits_core_db: db } = require('../../config/databases');

// product_scope_map
// product_id SAME DB → ObjectId
// scope_id CROSS DB (geo) → numeric legacy only
const s = new mongoose.Schema({

  product_id:       { type: mongoose.Schema.Types.ObjectId, ref: 'products', required: true },

  scope_id:         { type: mongoose.Schema.Types.ObjectId, required: true }, // CROSS DB → geo (polymorphic)
  scope_type:       { type: String, default: null },  // optional: 'country','state','cluster','district'
  deleted_at:       { type: Date, default: null },
  created_at:       { type: Date, default: Date.now },
}, { collection: 'pc_product_scope_map', timestamps: false, toJSON: { virtuals: true }, toObject: { virtuals: true } });
s.index({ product_id: 1, scope_id: 1 }, { unique: true });
s.virtual('id').get(function () { return this._id; });
module.exports = db.model('pc_product_scope_map', s);
