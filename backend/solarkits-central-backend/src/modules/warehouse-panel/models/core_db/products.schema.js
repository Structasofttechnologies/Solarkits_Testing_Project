const mongoose = require('mongoose');
const { solarkits_core_db: db } = require('../../config/databases');

const s = new mongoose.Schema({
  name:              { type: String, required: true, trim: true, maxlength: 255 },
  description:       { type: String, default: null },
  features:          { type: [String], default: [] },
  image:             { type: String, default: null, maxlength: 500 },
  template_id:       { type: mongoose.Schema.Types.ObjectId, ref: 'pc_product_templates', required: true },
  subtype_id:        { type: mongoose.Schema.Types.ObjectId, required: true },
  brand_id:          { type: mongoose.Schema.Types.ObjectId, ref: 'brands', default: null },
  scope_ids:         [{ type: mongoose.Schema.Types.ObjectId }],
  deleted_at:        { type: Date, default: null },
  created_at:        { type: Date, default: Date.now },
}, { collection: 'products', timestamps: false, toJSON: { virtuals: true }, toObject: { virtuals: true } });

s.virtual('id').get(function () { return this._id; });

module.exports = db.model('products', s);
