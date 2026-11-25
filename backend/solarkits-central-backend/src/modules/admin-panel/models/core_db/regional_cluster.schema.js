const mongoose = require('mongoose');
const { solarkits_core_db: db } = require('../../config/databases');

const schema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  code: { type: String, required: true, unique: true, uppercase: true, trim: true },
  states: [{ type: String, required: true, trim: true }],
  status: { type: String, enum: ['Active', 'Inactive'], default: 'Active' },
  description: { type: String, default: null },
  oem_brand_ids: [{ type: mongoose.Schema.Types.ObjectId, ref: 'brands', default: [] }],
  supplier_brand_ids: [{ type: mongoose.Schema.Types.ObjectId, ref: 'brands', default: [] }],
  is_active: { type: Boolean, default: true },
  deleted_at: { type: Date, default: null },
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now }
}, {
  collection: 'regional_clusters',
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

schema.virtual('id').get(function () {
  return this._id;
});

module.exports = db.model('regional_clusters', schema);
