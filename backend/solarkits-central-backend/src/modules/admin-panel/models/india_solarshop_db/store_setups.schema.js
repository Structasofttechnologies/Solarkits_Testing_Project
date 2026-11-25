const mongoose = require('mongoose');
const { india_solarshop_db } = require('../../config/databases');

/**
 * store_setups — Primary record tracking the physical setup of an authorized Franchisee Solar Shop.
 *
 * Collection: store_setups
 */
const schema = new mongoose.Schema({
  store_setup_id: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    uppercase: true,
  },
  franchisee_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'resellers',
    required: true,
    unique: true, // Prevents duplicate Store Setup creation
  },
  original_bde_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'bde_profiles',
    default: null,
  },
  current_bde_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'bde_profiles',
    default: null,
  },

  // Franchisee identity snapshot
  franchisee_name: { type: String, required: true, trim: true },
  gst_number: { type: String, default: null, uppercase: true, trim: true },
  mobile: { type: String, required: true, trim: true },
  email: { type: String, required: true, trim: true, lowercase: true },
  country_name: { type: String, default: 'India', trim: true },
  state_id: { type: mongoose.Schema.Types.ObjectId, default: null },
  state_name: { type: String, default: null, trim: true },
  district_id: { type: mongoose.Schema.Types.ObjectId, default: null },
  district_name: { type: String, default: null, trim: true },
  store_address: { type: String, default: null, trim: true },

  // Plan & Commercials
  plan_id: { type: mongoose.Schema.Types.ObjectId, ref: 'reseller_plans', default: null },
  plan_name: { type: String, default: null, trim: true },
  fee_amount: { type: Number, default: 0 },
  agreement_date: { type: Date, default: null },
  payment_confirmation_date: { type: Date, default: null },

  // Store Category & Warehouse Allocation
  store_type: {
    type: String,
    enum: ['company_store', 'franchisee_store'],
    default: 'franchisee_store',
  },
  warehouse_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'company_warehouses',
    default: null,
  },
  warehouse_allocated: { type: Boolean, default: false },
  warehouse_allocation_verified: { type: Boolean, default: false },
  warehouse_allocated_at: { type: Date, default: null },
  warehouse_allocated_by: { type: mongoose.Schema.Types.ObjectId, ref: 'cms_users', default: null },

  // Accounts Payment Verification
  payment_verified_by_accounts: { type: Boolean, default: false },
  payment_accounts_verified_at: { type: Date, default: null },
  payment_accounts_verified_by: { type: mongoose.Schema.Types.ObjectId, ref: 'cms_users', default: null },

  // Timelines
  setup_start_date: { type: Date, required: true, default: Date.now },
  allowed_setup_days: { type: Number, required: true, default: 30 },
  original_completion_date: { type: Date, required: true },
  revised_completion_date: { type: Date, default: null },
  actual_completion_date: { type: Date, default: null },
  operations_start_date: { type: Date, default: null },

  // State Employee Assignment
  assigned_employee_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'cms_users',
    default: null,
  },
  assigned_employee_name: { type: String, default: null, trim: true },
  assigned_employee_email: { type: String, default: null, trim: true },
  assigned_employee_phone: { type: String, default: null, trim: true },
  employee_assigned_at: { type: Date, default: null },

  // Status & Progress Tracking
  status: {
    type: String,
    enum: [
      'not_started',
      'employee_assigned',
      'in_progress',
      'on_track',
      'due_soon',
      'delayed',
      'delay_approval_pending',
      'delay_approved',
      'delay_rejected',
      'setup_completed',
      'admin_verification_pending',
      'correction_required',
      'admin_verified',
      'operations_started',
      'cancelled',
    ],
    default: 'not_started',
  },
  progress_percentage: { type: Number, default: 0, min: 0, max: 100 },
  total_activities: { type: Number, default: 0 },
  completed_activities: { type: Number, default: 0 },
  mandatory_pending_activities: { type: Number, default: 0 },
  delay_days: { type: Number, default: 0, min: 0 },

  // Verification & Remarks
  employee_remarks: { type: String, default: null, trim: true },
  franchisee_confirmation_status: { type: Boolean, default: false },
  franchisee_confirmed_at: { type: Date, default: null },
  admin_verified_by: { type: mongoose.Schema.Types.ObjectId, ref: 'cms_users', default: null },
  admin_verified_at: { type: Date, default: null },
  admin_remarks: { type: String, default: null, trim: true },

  created_by: { type: mongoose.Schema.Types.ObjectId, ref: 'cms_users', default: null },
}, {
  collection: 'store_setups',
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
});

schema.index({ status: 1 });
schema.index({ store_type: 1 });
schema.index({ warehouse_id: 1 });
schema.index({ state_id: 1, district_id: 1 });
schema.index({ assigned_employee_id: 1 });
schema.index({ current_bde_id: 1 });
schema.index({ original_completion_date: 1, revised_completion_date: 1 });

schema.virtual('id').get(function () { return this._id; });

module.exports = india_solarshop_db.model('store_setups', schema);
