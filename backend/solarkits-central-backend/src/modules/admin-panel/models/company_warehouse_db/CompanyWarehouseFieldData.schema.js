const mongoose = require('mongoose');
const { company_warehouse_db: db } = require('../../config/databases');

const schema = new mongoose.Schema({
  warehouse_id: { type: mongoose.Schema.Types.ObjectId, ref: 'company_warehouses', required: true },
  field_id: { type: mongoose.Schema.Types.ObjectId, ref: 'company_warehouse_validation_fields', required: true },
  value: { type: String, default: null }, // Stores text, numbers, or JSON arrays (for dropdowns/files)
}, { 
  collection: 'company_warehouse_field_data', 
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  toJSON: { virtuals: true }, 
  toObject: { virtuals: true } 
});

schema.virtual('id').get(function () { return this._id; });
module.exports = db.model('company_warehouse_field_data', schema);
