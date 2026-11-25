const mongoose = require('mongoose');
const { company_warehouse_db: db } = require('../config/databases');

const schema = new mongoose.Schema({
  grn_no:         { type: String, required: true, trim: true, unique: true },
  warehouse_id:   { type: mongoose.Schema.Types.ObjectId, ref: 'company_warehouses', required: true },
  inward_type:    { type: String, enum: ['supplier', 'local', 'transfer'], required: true },
  supplier_name:  { type: String, required: true, trim: true },
  invoice_no:     { type: String, required: true, trim: true },
  invoice_date:   { type: Date, required: true },
  status:         { type: String, enum: ['pending_match', 'approved', 'rejected'], default: 'pending_match' },
  rejection_reason: { type: String, default: null },
  invoice_pdf:    { type: String, default: null },
  items: [{
    sku_id:           { type: mongoose.Schema.Types.ObjectId, required: true },
    sku_code:         { type: String, required: true },
    qty:              { type: Number, required: true, min: 1 },
    benchmark_price:  { type: Number, required: true, default: 0 },
    invoice_price:    { type: Number, required: true, default: 0 },
    qc_status:        { type: String, enum: ['Passed', 'Failed', 'Pending'], default: 'Passed' },
    damage_notes:     { type: String, default: '' },
    serials:          [{ type: String }],
    allocation_rack:  { type: String, default: '' }
  }],
  received_by:    { type: mongoose.Schema.Types.ObjectId, required: true },
}, {
  collection: 'warehouse_inwards',
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

schema.virtual('id').get(function () { return this._id; });

module.exports = db.model('warehouse_inwards', schema);
