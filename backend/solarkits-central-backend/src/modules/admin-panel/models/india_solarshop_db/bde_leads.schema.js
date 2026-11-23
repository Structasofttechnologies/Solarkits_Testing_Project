const mongoose = require('mongoose');
const { india_solarshop_db } = require('../../config/databases');

/**
 * bde_leads — Franchisee Prospect Leads generated and managed by BDEs.
 *
 * Collection: bde_leads
 */
const schema = new mongoose.Schema({
  lead_id: {
    type: String,
    required: true,
    trim: true,
    uppercase: true,
  },
  prospect_name: { type: String, required: true, trim: true, maxlength: 150 },
  company_name: { type: String, required: true, trim: true, maxlength: 200 },
  mobile_number: { type: String, required: true, trim: true, maxlength: 15 },
  email: { type: String, required: true, trim: true, lowercase: true, maxlength: 150 },
  gst_number: { type: String, default: null, trim: true, uppercase: true, maxlength: 20 },
  gst_verified: { type: Boolean, default: false },
  gst_legal_name: { type: String, default: null, trim: true, maxlength: 300 },
  gst_trade_name: { type: String, default: null, trim: true, maxlength: 300 },
  pan_number: { type: String, default: null, trim: true, uppercase: true, maxlength: 20 },

  // Geographic Territory
  country_name: { type: String, default: 'India', trim: true },
  territory_level: { type: String, enum: ['district', 'state', 'country', 'master'], default: 'district' },
  state_id: { type: mongoose.Schema.Types.ObjectId, default: null },
  state_name: { type: String, required: true, trim: true },
  district_id: { type: mongoose.Schema.Types.ObjectId, default: null },
  district_name: { type: String, required: true, trim: true },
  pincode: { type: String, default: null, trim: true, maxlength: 10 },
  address_line: { type: String, default: null, trim: true },
  shop_photos: [{ type: String, trim: true }],

  // Plan & Commercial Scope
  interested_plan_id: { type: mongoose.Schema.Types.ObjectId, ref: 'reseller_plans', default: null },
  interested_plan_name: { type: String, default: 'Standard Franchisee Plan', trim: true },
  estimated_investment: { type: Number, default: 0 },
  expected_monthly_kits: { type: Number, default: 5 },

  // Source & Attribution
  lead_source: {
    type: String,
    enum: [
      'direct_visit',
      'phone_call',
      'referral',
      'trade_show',
      'digital',
      'cold_outreach',
      'head_office_assigned',
    ],
    default: 'direct_visit',
  },
  created_by_bde_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'bde_profiles',
    required: true,
  },
  original_bde_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'bde_profiles',
    required: true,
  },
  current_bde_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'bde_profiles',
    required: true,
  },

  // Territory Exception Status
  is_outside_territory: { type: Boolean, default: false },
  territory_exception_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'territory_exception_requests',
    default: null,
  },

  // Pipeline Status
  lead_status: {
    type: String,
    enum: [
      'new_lead',
      'contacted',
      'follow_up_scheduled',
      'interested',
      'signup_started',
      'gst_verification_pending',
      'admin_review_pending',
      'approved',
      'agreement_pending',
      'agreement_signed',
      'fee_payment_pending',
      'fee_paid',
      'completed',
      'converted',
      'onboarded',
      'rejected',
      'lost',
    ],
    default: 'new_lead',
  },

  next_follow_up_date: { type: Date, default: null },
  bde_remarks: { type: String, default: null, trim: true, maxlength: 1000 },
  lost_reason: { type: String, default: null, trim: true },
  rejection_reason: { type: String, default: null, trim: true },
  reassignment_reason: { type: String, default: null, trim: true },

  // Linkage to Reseller & Onboarding
  franchisee_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'resellers',
    default: null,
  },
  franchise_lead_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'franchise_leads',
    default: null,
  },
  signup_started_at: { type: Date, default: null },
  converted_at: { type: Date, default: null },

  deleted_at: { type: Date, default: null },
}, {
  collection: 'bde_leads',
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
});

schema.index({ lead_id: 1 }, { unique: true });
schema.index({ current_bde_id: 1, lead_status: 1 });
schema.index({ original_bde_id: 1 });
schema.index({ mobile_number: 1 });
schema.index({ email: 1 });
schema.index({ gst_number: 1 }, { sparse: true });
schema.index({ state_name: 1, district_name: 1 });
schema.index({ next_follow_up_date: 1 });

schema.virtual('id').get(function () { return this._id; });

module.exports = india_solarshop_db.model('bde_leads', schema);
