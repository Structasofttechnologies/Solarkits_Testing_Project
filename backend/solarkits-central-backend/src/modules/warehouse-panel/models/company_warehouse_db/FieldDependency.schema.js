const mongoose = require('mongoose');
const { company_warehouse_db: db } = require('../../config/databases');

const schema = new mongoose.Schema({
  parent_field_id:         { type: mongoose.Schema.Types.ObjectId, ref: 'company_warehouse_validation_fields', required: true },
  child_field_id:          { type: mongoose.Schema.Types.ObjectId, ref: 'company_warehouse_validation_fields', required: true },
  dependency_type:         { type: String, required: true },
  parent_value:            { type: String, default: null },
  deleted_at:              { type: Date, default: null },
  created_at:              { type: Date, default: Date.now },
}, { collection: 'company_warehouse_field_dependencies', timestamps: false, toJSON: { virtuals: true }, toObject: { virtuals: true } });

schema.virtual('id').get(function () { return this._id; });

module.exports = db.model('company_warehouse_field_dependencies', schema);
