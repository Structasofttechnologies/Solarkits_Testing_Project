const mongoose = require('mongoose');
const { company_warehouse_db: db } = require('../../config/databases');

const schema = new mongoose.Schema({
  warehouse_id:       { type: mongoose.Schema.Types.ObjectId, ref: 'company_warehouses', required: true },
  field_id:           { type: mongoose.Schema.Types.ObjectId, ref: 'company_warehouse_validation_fields', required: true },
  is_enabled:         { type: Boolean, default: false },
  min_files:          { type: Number, default: null },
  max_files:          { type: Number, default: null },
  status_id:          { type: Number, default: null },
  user_id:            { type: mongoose.Schema.Types.ObjectId, default: null },
  notes:              { type: String, default: null },
  deleted_at:         { type: Date, default: null },
  created_at:         { type: Date, default: Date.now },
  updated_at:         { type: Date, default: Date.now },
}, { collection: 'company_warehouse_field_status', timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }, toJSON: { virtuals: true }, toObject: { virtuals: true } });

schema.index({ warehouse_id: 1, field_id: 1 });
schema.virtual('id').get(function () { return this._id; });

module.exports = db.model('company_warehouse_field_status', schema);
