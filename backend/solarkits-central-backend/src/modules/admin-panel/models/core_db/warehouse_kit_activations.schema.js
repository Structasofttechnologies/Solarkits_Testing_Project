const mongoose = require('mongoose');
const { solarkits_core_db: db } = require('../../config/databases');

const schema = new mongoose.Schema({
  warehouse_id: { type: mongoose.Schema.Types.ObjectId, ref: 'company_warehouses', required: true },
  combo_kit_id: { type: mongoose.Schema.Types.ObjectId, ref: 'pc_comobo_kit', default: null }, // Preserved for legacy compatibility
  kit_id: { type: mongoose.Schema.Types.ObjectId, default: null },
  kit_type: { 
    type: String, 
    enum: ['combo_kit', 'customize_kit', 'trial_kit', 'loose_kit', 'bos_kit'], 
    default: 'combo_kit' 
  },
  kit_sku: { type: String, uppercase: true, trim: true, default: null },
  kit_name: { type: String, trim: true, default: null },
  
  is_combokit_active: { type: Boolean, default: false },
  is_customize_kit_active: { type: Boolean, default: false },
  is_active: { type: Boolean, default: false },

  // ── Granular Stock & Inventory Rules ─────────────────────────────────────
  max_permitted_stock: { type: Number, default: 0 },
  minimum_stock_alert: { type: Number, default: 0 },
  maximum_stock_holding: { type: Number, default: 0 },

  // ── Procurement & Operational Controls ───────────────────────────────────
  procurement_source: { 
    type: String, 
    enum: ['company_stock', 'supplier', 'oem'], 
    default: 'company_stock' 
  },
  assembly_permission: { type: Boolean, default: true },
  dispatch_permission: { type: Boolean, default: true },

  // ── Delivery Serviceable Districts ───────────────────────────────────────
  delivery_districts: [{ type: mongoose.Schema.Types.ObjectId, ref: 'company_geolocation_level_2' }],

  allowed_order_types: {
    type: [String],
    enum: ['po_order', 'loose_order', 'trial_order'],
    default: ['po_order', 'loose_order', 'trial_order']
  },
  base_price_cached: { type: Number, default: 0 },
  selling_price_cached: { type: Number, default: 0 },
  margin_configured: { type: Boolean, default: false },
  gst_configured: { type: Boolean, default: false },

  // ── Store Display & Region Restrictions ───────────────────────────────────
  is_store_display: { type: Boolean, default: true },
  display_start_date: { type: String, default: null },
  display_end_date: { type: String, default: null },
  always_display: { type: Boolean, default: true },
  restricted_clusters: [{ type: String, default: 'all' }],
  restricted_states: [{ type: String, default: 'all' }],
  restricted_industry_types: [{ type: String, default: 'all' }],
  restricted_project_types: [{ type: String, default: 'all' }],

  is_deleted: { type: Boolean, default: false },
  deleted_at: { type: Date, default: null },
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now },
}, {
  collection: 'warehouse_kit_activations',
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

schema.index({ warehouse_id: 1, combo_kit_id: 1, deleted_at: null }, { sparse: true });
schema.index({ warehouse_id: 1, kit_id: 1, kit_type: 1, deleted_at: null }, { sparse: true });
schema.virtual('id').get(function () { return this._id; });

module.exports = db.model('warehouse_kit_activations', schema);
