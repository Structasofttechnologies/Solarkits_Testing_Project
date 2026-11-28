const mongoose = require('mongoose');
const { USER_DB: db } = require('../../config/databases');

const sourceHistorySchema = new mongoose.Schema(
  {
    source: { type: String, trim: true, default: 'manual' },
    batch_id: { type: String, trim: true, default: null },
    file_name: { type: String, trim: true, default: null },
    sheet_name: { type: String, trim: true, default: null },
    primary_segment_key: { type: String, trim: true, default: null },
    subgroup_names: [{ type: String, trim: true }],
    recorded_at: { type: Date, default: Date.now }
  },
  { _id: false }
);

const mergeHistorySchema = new mongoose.Schema(
  {
    merged_from_id: { type: mongoose.Schema.Types.ObjectId, default: null },
    merged_from_lead_id: { type: String, trim: true, default: null },
    matched_on: { type: String, trim: true, default: 'email_or_mobile' },
    merged_by_name: { type: String, trim: true, default: 'Admin' },
    merged_at: { type: Date, default: Date.now },
    notes: { type: String, trim: true, default: '' }
  },
  { _id: false }
);

/**
 * Central Lead Master (FRD Section 4.1 & 17: marketing_leads)
 * Strictly decoupled from campaign participation so a lead participates in unlimited campaigns
 * without creating duplicate master records.
 */
const leadMasterSchema = new mongoose.Schema(
  {
    lead_id: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      uppercase: true,
      index: true
    },
    company_name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 250,
      index: true
    },
    contact_person: {
      type: String,
      trim: true,
      default: '',
      maxlength: 200
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
      default: null,
      index: true
    },
    country_code: {
      type: String,
      trim: true,
      default: '+91',
      maxlength: 10
    },
    mobile_number: {
      type: String,
      trim: true,
      default: null,
      index: true
    },
    mobile_normalized: {
      type: String,
      trim: true,
      default: null,
      index: true
    },
    country_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'geolocation_level_0',
      default: null
    },
    country_name: {
      type: String,
      trim: true,
      default: 'India',
      index: true
    },
    state_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'geolocation_level_1',
      default: null
    },
    state_name: {
      type: String,
      trim: true,
      default: '',
      index: true
    },
    district_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'geolocation_level_2',
      default: null
    },
    district_name: {
      type: String,
      trim: true,
      default: '',
      index: true
    },
    cluster_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'franchisee_clusters',
      default: null
    },
    cluster_name: {
      type: String,
      trim: true,
      default: '',
      index: true
    },
    cluster_code: {
      type: String,
      trim: true,
      uppercase: true,
      default: null
    },
    pincode: {
      type: String,
      trim: true,
      default: null
    },
    address_line: {
      type: String,
      trim: true,
      default: null
    },
    primary_segment_key: {
      type: String,
      enum: ['franchisee_leads', 'epc_signup_leads', 'epc_sales_leads'],
      required: true,
      index: true
    },
    subgroup_ids: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'lm_subgroups'
      }
    ],
    subgroup_names: [{ type: String, trim: true }],
    lead_source: {
      type: String,
      trim: true,
      default: 'upload',
      index: true
    },
    source_histories: { type: [sourceHistorySchema], default: [] },
    import_batch_ids: [{ type: String, trim: true }],
    gst_number: {
      type: String,
      trim: true,
      uppercase: true,
      default: null,
      index: true
    },
    assigned_bde_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'bde_profiles',
      default: null,
      index: true
    },
    assigned_bde_name: {
      type: String,
      trim: true,
      default: null
    },
    lead_status: {
      type: String,
      trim: true,
      default: 'New',
      index: true
    },
    last_followup_at: {
      type: Date,
      default: null,
      index: true
    },
    next_followup_at: {
      type: Date,
      default: null
    },
    remarks: {
      type: String,
      trim: true,
      default: ''
    },
    custom_fields: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    },
    // External live SolarKits entity bindings (linked automatically, never overwrites external modules)
    linked_epc_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'epc_accounts',
      default: null,
      index: true
    },
    linked_reseller_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'resellers',
      default: null,
      index: true
    },
    linked_franchise_lead_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'franchise_leads',
      default: null
    },
    linked_bde_lead_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'bde_leads',
      default: null
    },
    // Segment-specific conversion milestones stored independently (FRD Section 11.2)
    milestones: {
      franchisee_converted: {
        is_converted: { type: Boolean, default: false },
        reseller_id: { type: mongoose.Schema.Types.ObjectId, default: null },
        agreement_id: { type: mongoose.Schema.Types.ObjectId, default: null },
        converted_at: { type: Date, default: null }
      },
      epc_registered: {
        is_registered: { type: Boolean, default: false },
        epc_account_id: { type: mongoose.Schema.Types.ObjectId, default: null },
        gst_verified: { type: Boolean, default: false },
        registered_at: { type: Date, default: null }
      },
      epc_sales_converted: {
        has_order: { type: Boolean, default: false },
        total_orders: { type: Number, default: 0 },
        total_revenue_inr: { type: Number, default: 0 },
        total_kw: { type: Number, default: 0 },
        first_order_at: { type: Date, default: null },
        last_order_at: { type: Date, default: null }
      },
      trial_kit_ordered: { type: Boolean, default: false },
      quote_count: { type: Number, default: 0 },
      inquiry_count: { type: Number, default: 0 }
    },
    is_active: {
      type: Boolean,
      default: true,
      index: true
    },
    is_unsubscribed: {
      type: Boolean,
      default: false,
      index: true
    },
    unsubscribed_at: {
      type: Date,
      default: null
    },
    marketing_consent: {
      type: Boolean,
      default: true
    },
    merge_history: { type: [mergeHistorySchema], default: [] },
    created_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'cms_users',
      default: null
    },
    deleted_at: {
      type: Date,
      default: null,
      index: true
    }
  },
  {
    collection: 'lm_marketing_leads',
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

leadMasterSchema.index({ primary_segment_key: 1, lead_status: 1, deleted_at: 1 });
leadMasterSchema.index({ country_name: 1, state_name: 1, district_name: 1, deleted_at: 1 });
leadMasterSchema.index({ assigned_bde_id: 1, lead_status: 1, deleted_at: 1 });
leadMasterSchema.index({ subgroup_ids: 1, deleted_at: 1 });
leadMasterSchema.index({ email: 1, mobile_normalized: 1, gst_number: 1 });
leadMasterSchema.index({ created_at: -1 });

leadMasterSchema.virtual('id').get(function () {
  return this._id;
});

module.exports = db.model('lm_marketing_leads', leadMasterSchema);
