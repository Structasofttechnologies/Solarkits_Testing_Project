const mongoose = require('mongoose');
const { core_db: db } = require('../../config/databases');

const schema = new mongoose.Schema({
  warehouse_id: { type: mongoose.Schema.Types.ObjectId, ref: 'company_warehouses', required: true },
  combo_kit_id: { type: mongoose.Schema.Types.ObjectId, ref: 'pc_comobo_kit', required: true },
  is_combokit_active: { type: Boolean, default: false },
  is_customize_kit_active: { type: Boolean, default: false },
  allowed_order_types: {
    type: [String],
    enum: ['po_order', 'loose_order', 'trial_order'],
    default: ['po_order', 'loose_order', 'trial_order']
  },
  is_active: { type: Boolean, default: true },
  is_deleted: { type: Boolean, default: false },
  deleted_at: { type: Date, default: null },
}, { 
  collection: 'warehouse_kit_activations',
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
});

schema.virtual('id').get(function () { return this._id; });

module.exports = db.model('warehouse_kit_activations', schema);
