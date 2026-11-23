const mongoose = require('mongoose');
const { india_solarshop_db: db } = require('../../config/databases');

/**
 * TrialKitStockHistory — Complete stock allocation, inward, adjustment and reversal history.
 * SOLARKITS – Trial Kit Management Module (Section 2)
 * "Maintain stock allocation history with user name and timestamp."
 */
const schema = new mongoose.Schema({
  trial_kit_inventory_id: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'trial_kit_inventories', 
    required: true 
  },
  combo_kit_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'pc_comobo_kit',
    default: null
  },
  kit_type: { 
    type: String, 
    required: true, 
    trim: true 
  },
  warehouse_id: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'company_warehouses', 
    required: true 
  },
  warehouse_name: { 
    type: String, 
    trim: true, 
    default: '' 
  },
  adjustment_type: { 
    type: String, 
    enum: [
      'initial_stock',
      'warehouse_allocation',
      'vendor_inward',
      'procurement_inward',
      'increase_adjustment',
      'decrease_adjustment',
      'order_deduction',
      'order_cancellation_reversal',
      'restock'
    ],
    required: true
  },
  procurement_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'trial_kit_procurements',
    default: null
  },
  utr_number: {
    type: String,
    trim: true,
    default: ''
  },
  quantity_change: { 
    type: Number, 
    required: true 
  },
  previous_available_stock: { 
    type: Number, 
    required: true 
  },
  new_available_stock: { 
    type: Number, 
    required: true 
  },
  user_name: { 
    type: String, 
    required: true, 
    trim: true 
  },
  user_id: { 
    type: mongoose.Schema.Types.ObjectId, 
    default: null 
  },
  user_role: { 
    type: String, 
    enum: ['admin', 'account', 'warehouse', 'system'], 
    default: 'admin' 
  },
  remarks: { 
    type: String, 
    trim: true, 
    default: '' 
  },
  created_at: { 
    type: Date, 
    default: Date.now 
  }
}, {
  collection: 'trial_kit_stock_histories',
  timestamps: false,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

schema.index({ trial_kit_inventory_id: 1, created_at: -1 });
schema.index({ warehouse_id: 1, created_at: -1 });
schema.index({ kit_type: 1, created_at: -1 });
schema.virtual('id').get(function () { return this._id; });

module.exports = db.model('trial_kit_stock_histories', schema);
