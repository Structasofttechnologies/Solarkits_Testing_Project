const mongoose = require('mongoose');
const { company_warehouse_db: db } = require('../../config/databases');

const schema = new mongoose.Schema({
  warehouse_id:       { type: mongoose.Schema.Types.ObjectId, ref: 'company_warehouses', required: true },
  field_ids:          [{ type: mongoose.Schema.Types.ObjectId, ref: 'company_warehouse_validation_fields' }],
  event:              { type: String, required: true },
  deleted_at:         { type: Date, default: null },
  created_at:         { type: Date, default: Date.now },
}, { collection: 'company_warehouse_notification_rules', timestamps: false, toJSON: { virtuals: true }, toObject: { virtuals: true } });

schema.virtual('id').get(function () { return this._id; });

module.exports = db.model('company_warehouse_notification_rules', schema);
