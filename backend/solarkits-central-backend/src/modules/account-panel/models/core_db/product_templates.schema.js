const mongoose = require('mongoose');
const { solarkits_core_db: db } = require('../../config/databases');

const s = new mongoose.Schema({
  name:        { type: String, required: true, trim: true, unique: true },
  description: { type: String, default: null },
  qty_unit_id: { type: mongoose.Schema.Types.ObjectId, ref: 'pc_units', default: null },
  deleted_at:  { type: Date, default: null },
}, { collection: 'pc_product_templates', timestamps: false, toJSON: { virtuals: true }, toObject: { virtuals: true }, strictPopulate: false });

s.virtual('id').get(function () { return this._id; });

module.exports = db.model('pc_product_templates', s);
