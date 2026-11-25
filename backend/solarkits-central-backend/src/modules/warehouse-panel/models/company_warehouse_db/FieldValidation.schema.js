const mongoose = require('mongoose');
const { company_warehouse_db: db } = require('../../config/databases');

const schema = new mongoose.Schema({
  field_id:         { type: mongoose.Schema.Types.ObjectId, ref: 'company_warehouse_validation_fields', required: true },
  validation_type:  { type: String, required: true },
  validation_value: { type: String, default: null },
  error_message:    { type: String, default: null },
  deleted_at:       { type: Date, default: null },
  created_at:       { type: Date, default: Date.now },
}, { collection: 'company_warehouse_field_validations', timestamps: false, toJSON: { virtuals: true }, toObject: { virtuals: true } });

schema.virtual('id').get(function () { return this._id; });

module.exports = db.model('company_warehouse_field_validations', schema);
