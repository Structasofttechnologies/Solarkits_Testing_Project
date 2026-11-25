const mongoose = require('mongoose');
const { india_solarshop_db } = require('../../config/databases');

/**
 * epc_leads — EPC Contractor Prospect Leads generated and managed by BDEs.
 *
 * Collection: epc_leads
 */
const leadActivitySchema = new mongoose.Schema(
  {
    activity_type: {
      type: String,
      enum: ['call', 'visit', 'email', 'whatsapp', 'follow_up', 'status_change', 'note', 'gst_verification'],
      default: 'note',
    },
    notes: { type: String, required: true, trim: true, maxlength: 1000 },
    previous_status: { type: String, default: null },
    new_status: { type: String, default: null },
    actor_id: { type: mongoose.Schema.Types.ObjectId, ref: 'bde_profiles', default: null },
    actor_name: { type: String, default: null },
    created_at: { type: Date, default: Date.now },
  },
  { _id: true }
);

const schema = new mongoose.Schema(
  {
    lead_id: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
      unique: true,
      index: true,
    },
    company_name: { type: String, required: true, trim: true, maxlength: 200 },
    contact_person: { type: String, required: true, trim: true, maxlength: 150 },
    mobile_number: {
      type: String,
      required: true,
      trim: true,
      match: [/^[6-9]\d{9}$/, 'Please enter a valid 10-digit Indian mobile number'],
      index: true,
    },
    email: { type: String, default: null, trim: true, lowercase: true, maxlength: 150, index: true },
    gst_number: { type: String, default: null, trim: true, uppercase: true, maxlength: 20, index: true },
    gst_verified: { type: Boolean, default: false },
    gst_legal_name: { type: String, default: null, trim: true, maxlength: 300 },
    gst_trade_name: { type: String, default: null, trim: true, maxlength: 300 },
    pan_number: { type: String, default: null, trim: true, uppercase: true, maxlength: 20 },

    // Geographic Territory
    country_name: { type: String, default: 'India', trim: true },
    state_id: { type: mongoose.Schema.Types.ObjectId, default: null },
    state_name: { type: String, required: true, trim: true, index: true },
    district_id: { type: mongoose.Schema.Types.ObjectId, default: null },
    district_name: { type: String, required: true, trim: true, index: true },
    pincode: { type: String, default: null, trim: true, maxlength: 10 },
    address_line: { type: String, default: null, trim: true },

    // Lead Origin & Products of Interest
    lead_source: {
      type: String,
      enum: [
        'direct_visit',
        'phone_call',
        'referral',
        'trade_show',
        'digital',
        'cold_outreach',
        'portal',
        'head_office_assigned',
      ],
      default: 'direct_visit',
    },
    interested_products: [{ type: String, trim: true }], // e.g. 'Residential On-Grid', 'Commercial On-Grid', 'Solar Pump', 'Combo Kits', 'Off-Grid'

    // EPC Classification Type (Government Contractor, Tender Bidder, New EPC, Experienced EPC)
    epc_type: { type: String, default: 'New EPC', trim: true, index: true },
    epc_type_id: { type: mongoose.Schema.Types.ObjectId, ref: 'epc_types', default: null },

    // Franchisee Attribution
    assigned_franchisee_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'resellers',
      default: null,
      index: true,
    },
    assigned_franchisee_name: { type: String, default: null, trim: true },
    franchisee_assigned_at: { type: Date, default: null },

    // BDE Attribution
    created_by_bde_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'bde_profiles',
      required: true,
      index: true,
    },
    current_bde_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'bde_profiles',
      required: true,
      index: true,
    },

    // 10-Stage EPC Lead Lifecycle
    lead_status: {
      type: String,
      enum: [
        'New',
        'Contacted',
        'Interested',
        'Follow-up',
        'Onboarding Started',
        'GST Verification Pending',
        'Onboarded',
        'Assigned to Franchisee',
        'Not Interested',
        'Closed',
      ],
      default: 'New',
      index: true,
    },

    follow_up_date: { type: Date, default: null, index: true },
    remarks: { type: String, default: null, trim: true, maxlength: 1000 },
    history: [leadActivitySchema],

    // Onboarding Linkage
    onboarded_epc_account_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'epc_accounts',
      default: null,
    },
    onboarded_epc_company_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'pc_companies',
      default: null,
    },
    onboarded_at: { type: Date, default: null },

    deleted_at: { type: Date, default: null },
  },
  {
    collection: 'epc_leads',
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

schema.index({ current_bde_id: 1, lead_status: 1 });
schema.index({ state_name: 1, district_name: 1 });

schema.virtual('id').get(function () {
  return this._id;
});

module.exports = india_solarshop_db.model('epc_leads', schema);
