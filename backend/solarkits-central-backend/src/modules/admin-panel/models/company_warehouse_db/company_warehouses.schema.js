const mongoose = require('mongoose');
const { company_warehouse_db: db } = require('../../config/databases');

const schema = new mongoose.Schema({
  warehouse_name: { type: String, trim: true, default: null },
  warehouse_code: { type: String, required: true, trim: true, unique: true },
  images: { type: String, default: null }, // Store as string / JSON string to match legacy behavior
  categorized_images: {
    front_exterior: { type: String, default: null },
    main_storage: { type: String, default: null },
    product_racks: { type: String, default: null },
    loading_unloading: { type: String, default: null },
    office_security: { type: String, default: null },
    additional_images: [{ type: String }]
  },
  address: { type: String, default: null },
  pincode: { type: String, default: null },
  lat: { type: Number, default: null },
  lng: { type: Number, default: null },
  status: { type: mongoose.Schema.Types.Mixed, default: 1 }, // Supports legacy numeric 1..5 as well as string codes
  status_code: {
    type: String,
    enum: ['draft', 'pending_setup', 'pending_inspection', 'inspected', 'approved', 'active', 'suspended', 'inactive'],
    default: 'draft'
  },
  rejection_reason: { type: String, default: null },
  warehouse_type: { type: String, enum: ['company', '3pl', 'master', 'sub'], required: true },
  vendor_id: { type: mongoose.Schema.Types.ObjectId, ref: 'logistics_3pl_vendors', default: null }, // For 3PL warehouses

  level_0: { type: mongoose.Schema.Types.ObjectId, default: null }, // Country ID
  level_1: { type: mongoose.Schema.Types.ObjectId, default: null }, // State ID
  level_2: { type: mongoose.Schema.Types.ObjectId, default: null }, // District ID
  customer_types: { type: [{ type: mongoose.Schema.Types.ObjectId, ref: 'company_customers_types' }], default: [] },

  // ── Physical Warehouse Capacity Metrics ──────────────────────────────────
  warehouse_area_sqft: { type: Number, default: 0 },
  max_kit_capacity: { type: Number, default: 0 }, // Max number of kits the warehouse can hold
  max_weight_capacity_kg: { type: Number, default: 0 }, // Max total payload weight in kg
  max_volume_cbf: { type: Number, default: 0 },
  max_pallet_capacity: { type: Number, default: 0 },
  allocated_incoming_capacity: { type: Number, default: 0 }, // Kit slots reserved by placed but un-delivered orders
  storage_type: { type: String, enum: ['indoor', 'outdoor', 'mixed'], default: 'indoor' },

  facilities: {
    loading_facility: { type: Boolean, default: true },
    unloading_facility: { type: Boolean, default: true },
    racks_installed: { type: Boolean, default: true },
    cctv_surveillance: { type: Boolean, default: false },
    fire_safety: { type: Boolean, default: false }
  },

  operating_hours: {
    working_days: { type: String, default: 'Monday - Saturday' },
    open_time: { type: String, default: '09:00' },
    close_time: { type: String, default: '19:00' }
  },

  // ── Operational Permissions ──────────────────────────────────────────────
  operational_permissions: {
    inward: { type: Boolean, default: false },
    outward: { type: Boolean, default: false },
    storage: { type: Boolean, default: false },
    dispatch: { type: Boolean, default: false },
    kit_assembly: { type: Boolean, default: false }
  },

  // ── Delivery Serviceable Areas ───────────────────────────────────────────
  serviceable_districts: [{ type: mongoose.Schema.Types.ObjectId, ref: 'company_geolocation_level_2' }],
  serviceable_pincodes: [{ type: String }],

  // ── Company Warehouse 10-Gate Setup Checklist Tracking ──────────────────
  company_setup_checklist: {
    basic_details: { status: { type: Boolean, default: false }, completed_at: { type: Date, default: null } },
    address_and_pin: { status: { type: Boolean, default: false }, completed_at: { type: Date, default: null } },
    images_and_docs: { status: { type: Boolean, default: false }, completed_at: { type: Date, default: null } },
    storage_capacity: { status: { type: Boolean, default: false }, completed_at: { type: Date, default: null } },
    manager_assigned: { status: { type: Boolean, default: false }, completed_at: { type: Date, default: null } },
    inventory_sku_mapping: { status: { type: Boolean, default: false }, completed_at: { type: Date, default: null } },
    supplier_mapping: { status: { type: Boolean, default: false }, completed_at: { type: Date, default: null } },
    kit_activation_settings: { status: { type: Boolean, default: false }, completed_at: { type: Date, default: null } },
    inward_outward_workflow: { status: { type: Boolean, default: false }, completed_at: { type: Date, default: null } },
    accounting_cost_centre: { status: { type: Boolean, default: false }, completed_at: { type: Date, default: null } }
  },

  // ── 3PL Inspection & Approval ────────────────────────────────────────────
  inspection_details: {
    status: {
      type: String,
      enum: ['pending', 'scheduled', 'passed', 'failed', 're_inspection_required'],
      default: 'pending'
    },
    inspection_type: { type: String, enum: ['physical', 'virtual'], default: 'physical' },
    inspector_name: { type: String, default: null },
    inspection_date: { type: Date, default: null },
    inspection_remarks: { type: String, default: null },
    inspection_report_url: { type: String, default: null }
  },

  // ── 3PL Commercial Settings & SLA ────────────────────────────────────────
  commercial_settings: {
    storage_charge_type: {
      type: String,
      enum: ['per_sqft', 'per_pallet', 'per_cbf', 'per_sku', 'fixed_monthly'],
      default: 'per_sqft'
    },
    storage_unit_rate: { type: Number, default: 0 },
    handling_inward_rate: { type: Number, default: 0 },
    handling_outward_rate: { type: Number, default: 0 },
    loading_charge_per_ton: { type: Number, default: 0 },
    unloading_charge_per_ton: { type: Number, default: 0 },
    order_processing_per_order: { type: Number, default: 0 },
    monthly_fixed_fee: { type: Number, default: 0 },
    sla_inward_tat_hours: { type: Number, default: 24 },
    sla_picking_tat_hours: { type: Number, default: 12 },
    sla_dispatch_tat_hours: { type: Number, default: 24 },
    payment_terms: {
      type: String,
      enum: ['monthly_net_30', 'monthly_net_15', 'weekly', 'per_transaction'],
      default: 'monthly_net_30'
    }
  },

  // ── Order Type Fulfillment Capabilities ─────────────────────────────────
  order_fulfillment_types: {
    type: [String],
    enum: ['po_order', 'loose_order', 'trial_order'],
    default: ['po_order', 'loose_order', 'trial_order']
  },
  order_fulfillment_config: {
    po_order: { is_active: { type: Boolean, default: true }, max_daily_capacity: { type: Number, default: 50 }, notes: { type: String, default: null } },
    loose_order: { is_active: { type: Boolean, default: true }, max_daily_capacity: { type: Number, default: 100 }, notes: { type: String, default: null } },
    trial_order: { is_active: { type: Boolean, default: true }, max_daily_capacity: { type: Number, default: 20 }, notes: { type: String, default: null } }
  },

  manager: {
    name: { type: String, default: null },
    email: { type: String, default: null },
    phone: { type: String, default: null },
    phone_code: { type: String, default: '+91' },
    user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'cms_users', default: null }
  },
  assigned_staff: {
    manager_id: { type: mongoose.Schema.Types.ObjectId, ref: 'cms_users', default: null },
    accountant_id: { type: mongoose.Schema.Types.ObjectId, ref: 'cms_users', default: null }
  },
  assigned_staff_users: [{ type: mongoose.Schema.Types.ObjectId, ref: 'cms_users', default: [] }],

  is_active: { type: Boolean, default: false },
  effective_date: { type: Date, default: null },
  due_date: { type: Date, default: null },
  deleted_at: { type: Date, default: null },
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now },
}, {
  collection: 'company_warehouses',
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

schema.virtual('id').get(function () { return this._id; });

module.exports = db.model('company_warehouses', schema);
