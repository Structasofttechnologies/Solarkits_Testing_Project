const mongoose = require('mongoose');
const { solarkits_core_db: db } = require('../../config/databases');

const productMappingItemSchema = new mongoose.Schema({
  component_key: {
    type: String,
    required: true
  },
  component_type: {
    type: String,
    enum: ['panel', 'inverter', 'bos_kit', 'base_component', 'other'],
    default: 'other'
  },
  product_name: {
    type: String,
    required: true
  },
  sku_code: {
    type: String,
    default: null
  },
  template_name: {
    type: String,
    default: null
  },
  subtype_name: {
    type: String,
    default: null
  },
  brand_name: {
    type: String,
    default: null
  },
  quantity: {
    type: Number,
    default: 1
  },
  image: {
    type: String,
    default: null
  },
  oem_partner_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'brands',
    default: null
  },
  supplier_partner_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'brands',
    default: null
  },
  supply_mode: {
    type: String,
    enum: ['oem_partner', 'supplier_partner', 'both'],
    default: 'oem_partner'
  },
  is_mapped: {
    type: Boolean,
    default: false
  },
  notes: {
    type: String,
    default: null
  }
}, { _id: false });

const schema = new mongoose.Schema({
  warehouse_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'company_warehouses',
    required: true,
    index: true
  },
  combo_kit_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'pc_comobo_kit',
    required: true,
    index: true
  },
  is_configured: {
    type: Boolean,
    default: false
  },
  total_components: {
    type: Number,
    default: 0
  },
  mapped_components: {
    type: Number,
    default: 0
  },
  product_mappings: [productMappingItemSchema],
  created_at: {
    type: Date,
    default: Date.now
  },
  updated_at: {
    type: Date,
    default: Date.now
  }
}, {
  collection: 'warehouse_kit_partner_mappings',
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

schema.index({ warehouse_id: 1, combo_kit_id: 1 }, { unique: true });
schema.virtual('id').get(function () {
  return this._id;
});

module.exports = db.model('warehouse_kit_partner_mappings', schema);
