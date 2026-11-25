const mongoose = require('mongoose');
const { company_warehouse_db: db } = require('../../config/databases');

const schema = new mongoose.Schema({
  request_number: { type: String, required: true, unique: true },
  warehouse_id:   { type: mongoose.Schema.Types.ObjectId, ref: 'company_warehouses', required: true },
  items: [{
    sku_id:       { type: mongoose.Schema.Types.ObjectId, required: true },
    sku_code:     { type: String, required: true },
    qty:          { type: Number, required: true, min: 1 }
  }],
  status: {
    type: String,
    enum: ['pending', 'ordered', 'cancelled'],
    default: 'pending'
  },
  created_by:     { type: mongoose.Schema.Types.ObjectId, required: true },
}, {
  collection: 'po_requests',
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

schema.virtual('id').get(function () { return this._id; });

module.exports = db.model('po_requests', schema);
