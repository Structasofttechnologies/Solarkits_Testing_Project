const mongoose = require('mongoose');
const { solarkits_core_db: db } = require('../../config/databases');

// brand_template_map — brand_id, template_id SAME DB → ObjectId
const s = new mongoose.Schema({
  brand_id: { type: mongoose.Schema.Types.ObjectId, ref: 'brands', required: true },
  template_id: { type: mongoose.Schema.Types.ObjectId, ref: 'pc_product_templates', required: true },
  deleted_at: { type: Date, default: null },
  created_at: { type: Date, default: Date.now },
}, { collection: 'pc_brand_template_map', timestamps: false, toJSON: { virtuals: true }, toObject: { virtuals: true } });

s.index({ brand_id: 1, template_id: 1 }, { unique: true });
s.virtual('id').get(function () { return this._id; });

module.exports = db.model('pc_brand_template_map', s);
