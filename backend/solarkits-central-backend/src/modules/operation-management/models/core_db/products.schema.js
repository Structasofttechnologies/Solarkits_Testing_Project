const mongoose = require('mongoose');
const { solarkits_core_db: db } = require('../../config/databases');

const s = new mongoose.Schema({
  name:              { type: String, required: true, trim: true, maxlength: 255 },
  template_id:       { type: mongoose.Schema.Types.ObjectId, ref: 'pc_product_templates', required: true },
  subtype_id:        { type: mongoose.Schema.Types.ObjectId, required: true },
  brand_id:          { type: mongoose.Schema.Types.ObjectId, ref: 'brands', default: null },
  deleted_at:        { type: Date, default: null },
}, { collection: 'products', timestamps: false, toJSON: { virtuals: true }, toObject: { virtuals: true } });

s.virtual('id').get(function () { return this._id; });

module.exports = db.model('products', s);
