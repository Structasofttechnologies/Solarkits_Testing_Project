const mongoose = require('mongoose');
const { company_warehouse_db: db } = require('../../config/databases');

const schema = new mongoose.Schema({
  name:              { type: String, required: true, trim: true },
  code:              { type: String, required: true, trim: true, unique: true },
  label:             { type: String, required: true, trim: true },
  field_type:        { type: String, required: true }, // Changed from input_type to match SQL/Handler usage
  section_id:        { type: mongoose.Schema.Types.ObjectId, ref: 'company_warehouse_validation_sections', required: true },
  options:           { type: String, default: null }, // JSON string
  order:             { type: Number, default: 0 },
  is_required:       { type: Boolean, default: false },
  deleted_at:        { type: Date, default: null },
  created_at:        { type: Date, default: Date.now },
}, { collection: 'company_warehouse_validation_fields', timestamps: false, toJSON: { virtuals: true }, toObject: { virtuals: true } });

schema.virtual('id').get(function () { return this._id; });

module.exports = db.model('company_warehouse_validation_fields', schema);
