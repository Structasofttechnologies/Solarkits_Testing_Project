const mongoose = require('mongoose');
const { company_warehouse_db: db } = require('../../config/databases');

const schema = new mongoose.Schema({
  warehouse_id: { type: mongoose.Schema.Types.ObjectId, ref: 'company_warehouses', required: true },
  name: { type: String, required: true, trim: true },
  contact: { type: String, required: true, trim: true },
  license_number: { type: String, required: true, trim: true },
  assigned_vehicle_id: { type: mongoose.Schema.Types.ObjectId, ref: 'delivery_vehicles', default: null },
  is_active: { type: Boolean, default: true },
  is_deleted: { type: Boolean, default: false },
  deleted_at: { type: Date, default: null }
}, {
  collection: 'delivery_drivers',
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

schema.virtual('id').get(function () { return this._id; });
module.exports = db.model('delivery_drivers', schema);
