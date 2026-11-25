const mongoose = require('mongoose');
const { solarkits_core_db: db } = require('../../config/databases');

const s = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  subtype_id: { type: mongoose.Schema.Types.ObjectId, required: true },
  attribute_type: { type: String, enum: ['sku', 'phase', 'tolerance', 'tollarance', 'engineering', 'custom'], default: 'custom' },
  deleted_at: { type: Date, default: null },
}, { collection: 'pc_subtype_attributes', timestamps: false });

s.virtual('id').get(function () { return this._id; });
module.exports = db.model('pc_subtype_attributes', s);
