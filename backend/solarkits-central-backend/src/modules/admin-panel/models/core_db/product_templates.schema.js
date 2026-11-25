const mongoose = require('mongoose');
const { solarkits_core_db: db } = require('../../config/databases');

// product_templates — no FK
const s = new mongoose.Schema({
  name:        { type: String, required: true, trim: true, unique: true },
  description: { type: String, default: null },
  is_system:   { type: Boolean, default: false },

  qty_unit_id: { type: mongoose.Schema.Types.ObjectId, ref: 'pc_units', default: null },

  deleted_at:  { type: Date, default: null },
  created_at:  { type: Date, default: Date.now },
}, { collection: 'pc_product_templates', timestamps: false, toJSON: { virtuals: true }, toObject: { virtuals: true } });
s.virtual('id').get(function () { return this._id; });
module.exports = db.model('pc_product_templates', s);
