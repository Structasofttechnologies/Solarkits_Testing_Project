const mongoose = require('mongoose');
const { solarkits_core_db: db } = require('../../config/databases');

const s = new mongoose.Schema({
  name:                { type: String, required: true, trim: true },
  template_id:         { type: mongoose.Schema.Types.ObjectId, ref: 'pc_product_templates', required: true },
  is_system:           { type: Boolean, default: false },
  deleted_at:          { type: Date, default: null },
  created_at:          { type: Date, default: Date.now },
}, { collection: 'pc_product_subtypes', timestamps: false, toJSON: { virtuals: true }, toObject: { virtuals: true } });

s.virtual('id').get(function () { return this._id; });

module.exports = db.model('pc_product_subtypes', s);
