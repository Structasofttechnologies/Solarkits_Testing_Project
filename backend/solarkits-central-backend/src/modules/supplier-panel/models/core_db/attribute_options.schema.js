const mongoose = require('mongoose');
const { core_db: db } = require('../../config/databases');

const s = new mongoose.Schema({
  attribute_id: { type: mongoose.Schema.Types.ObjectId, ref: 'pc_subtype_attributes', required: true },
  value: { type: String, required: true, trim: true },
  display_order: { type: Number, default: 0 },
  deleted_at: { type: Date, default: null },
  created_at: { type: Date, default: Date.now },
}, { collection: 'pc_attribute_options', timestamps: false });

s.virtual('id').get(function () { return this._id; });
module.exports = db.model('pc_attribute_options', s);
