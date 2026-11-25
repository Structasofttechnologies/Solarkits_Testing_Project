const mongoose = require('mongoose');
const { solarkits_core_db: db } = require('../../config/databases');

const schema = new mongoose.Schema({
  warehouse_id: { type: String, required: true, trim: true }, // WH code or ObjectId
  warehouse_code: { type: String, required: true, trim: true },
  warehouse_name: { type: String, required: true, trim: true },
  location: { type: String, default: '', trim: true },
  capabilities: {
    combo_kit: { type: Boolean, default: true },
    customize_kit: { type: Boolean, default: false },
    bulk_kit: { type: Boolean, default: false }
  },
  daily_capacity: { type: Number, default: 40 },
  cutoff_time: { type: String, default: '17:00', trim: true },
  status: { type: String, enum: ['Active', 'Inactive'], default: 'Active' },
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now }
}, {
  collection: 'warehouse_kit_capabilities',
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

schema.virtual('id').get(function () {
  return this._id;
});

module.exports = db.model('warehouse_kit_capabilities', schema);
