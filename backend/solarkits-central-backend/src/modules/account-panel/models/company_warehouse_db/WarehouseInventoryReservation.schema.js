const mongoose = require('mongoose');
const { company_warehouse_db: db } = require('../../config/databases');

const schema = new mongoose.Schema({
  warehouse_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'company_warehouses',
    required: true,
    index: true
  },
  sku_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'pc_product_skus',
    required: true,
    index: true
  },
  sku_code: {
    type: String,
    required: true,
    trim: true
  },
  product_name: {
    type: String,
    default: null
  },
  customer_order_id: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    index: true
  },
  customer_order_number: {
    type: String,
    required: true,
    trim: true,
    index: true
  },
  order_group_id: {
    type: String,
    default: null,
    trim: true
  },
  reserved_quantity: {
    type: Number,
    required: true,
    min: 1
  },
  status: {
    type: String,
    enum: ['active', 'released', 'consumed_for_dispatch'],
    default: 'active',
    index: true
  },
  reserved_by: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'cms_users',
    default: null
  },
  reserved_at: {
    type: Date,
    default: Date.now
  },
  released_at: {
    type: Date,
    default: null
  }
}, {
  collection: 'warehouse_inventory_reservations',
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

schema.virtual('id').get(function () { return this._id; });

// Compound unique index ensuring only one active reservation per customer_order + sku + warehouse
schema.index({ warehouse_id: 1, sku_id: 1, customer_order_id: 1, status: 1 });

module.exports = db.model('warehouse_inventory_reservations', schema);
