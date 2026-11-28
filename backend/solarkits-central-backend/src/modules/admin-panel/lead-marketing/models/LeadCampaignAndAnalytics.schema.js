const mongoose = require('mongoose');
const { USER_DB: db } = require('../../config/databases');

// 1. Lead Email Campaigns Master (FRD Sections 8 & 17)
const leadCampaignSchema = new mongoose.Schema(
  {
    campaign_code: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      uppercase: true,
      index: true
    },
    campaign_name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 250
    },
    campaign_objective: {
      type: String,
      trim: true,
      default: 'Lead Engagement & Conversion'
    },
    campaign_category: {
      type: String,
      trim: true,
      default: 'General Promotional'
    },
    // Target Segment Architecture (Multi-segment & Multi-subgroup)
    target_primary_segments: [
      { type: String, enum: ['franchisee_leads', 'epc_signup_leads', 'epc_sales_leads'] }
    ],
    target_subgroup_ids: [{ type: mongoose.Schema.Types.ObjectId, ref: 'lm_subgroups' }],
    country_names: [{ type: String, trim: true }],
    state_names: [{ type: String, trim: true }],
    district_names: [{ type: String, trim: true }],
    cluster_ids: [{ type: mongoose.Schema.Types.ObjectId, ref: 'franchisee_clusters' }],
    cluster_names: [{ type: String, trim: true }],
    target_lead_statuses: [{ type: String, trim: true }],
    target_bde_ids: [{ type: mongoose.Schema.Types.ObjectId, ref: 'bde_profiles' }],
    manual_lead_ids: [{ type: mongoose.Schema.Types.ObjectId, ref: 'lm_marketing_leads' }],

    // Email Configuration
    email_sender_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'marketing_senders',
      default: null
    },
    email_template_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'marketing_templates',
      default: null
    },
    subject: { type: String, required: true, trim: true },
    preview_text: { type: String, trim: true, default: '' },
    html_content: { type: String, default: '' },
    cta_text: { type: String, trim: true, default: 'Learn More' },
    landing_page_url: { type: String, trim: true, default: 'https://solarkits.in' },
    blocks_json: { type: mongoose.Schema.Types.Mixed, default: null },

    // Scheduling & Ownership
    schedule_mode: { type: String, enum: ['immediate', 'scheduled', 'draft'], default: 'draft' },
    scheduled_at: { type: Date, default: null },
    started_at: { type: Date, default: null },
    paused_at: { type: Date, default: null },
    cancelled_at: { type: Date, default: null },
    completed_at: { type: Date, default: null },
    campaign_owner_id: { type: mongoose.Schema.Types.ObjectId, ref: 'cms_users', default: null },
    campaign_owner_name: { type: String, trim: true, default: 'Admin' },
    attribution_window_days: { type: Number, default: 30, min: 1, max: 365 },

    status: {
      type: String,
      enum: ['draft', 'scheduled', 'running', 'completed', 'paused', 'cancelled', 'failed'],
      default: 'draft',
      index: true
    },

    // Live synced counts cache (recomputed dynamically from recipients/events/conversions)
    total_target_leads: { type: Number, default: 0 },
    sent_count: { type: Number, default: 0 },
    delivered_count: { type: Number, default: 0 },
    bounced_count: { type: Number, default: 0 },
    failed_count: { type: Number, default: 0 },
    unique_opens_count: { type: Number, default: 0 },
    unique_clicks_count: { type: Number, default: 0 },
    unsubscribed_count: { type: Number, default: 0 },
    inquiries_count: { type: Number, default: 0 },
    quotations_count: { type: Number, default: 0 },
    converted_leads_count: { type: Number, default: 0 },
    last_error: { type: String, default: null },
    deleted_at: { type: Date, default: null }
  },
  {
    collection: 'lm_campaigns',
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// 2. Campaign Target Segments Normalized Link (FRD Section 17: campaign_segment_mapping)
const leadCampaignSegmentMappingSchema = new mongoose.Schema(
  {
    campaign_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'lm_campaigns',
      required: true,
      index: true
    },
    primary_segment_key: {
      type: String,
      enum: ['franchisee_leads', 'epc_signup_leads', 'epc_sales_leads'],
      required: true
    },
    subgroup_id: { type: mongoose.Schema.Types.ObjectId, ref: 'lm_subgroups', default: null }
  },
  { collection: 'lm_campaign_segment_mappings' }
);

// 3. Individual Campaign Recipient Log (FRD Section 13 & 17: Unique Lead ID + Campaign ID)
const leadCampaignRecipientSchema = new mongoose.Schema(
  {
    campaign_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'lm_campaigns',
      required: true,
      index: true
    },
    lead_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'lm_marketing_leads',
      required: true,
      index: true
    },
    lead_code: { type: String, trim: true, default: '' },
    company_name: { type: String, trim: true, default: '' },
    contact_person: { type: String, trim: true, default: '' },
    email: { type: String, trim: true, lowercase: true, default: '' },
    primary_segment_key: {
      type: String,
      enum: ['franchisee_leads', 'epc_signup_leads', 'epc_sales_leads'],
      required: true,
      index: true
    },
    subgroup_names: [{ type: String, trim: true }],
    country_name: { type: String, trim: true, default: 'India', index: true },
    state_name: { type: String, trim: true, default: '', index: true },
    district_name: { type: String, trim: true, default: '', index: true },
    cluster_name: { type: String, trim: true, default: '', index: true },
    assigned_bde_id: { type: mongoose.Schema.Types.ObjectId, default: null },

    status: {
      type: String,
      enum: ['queued', 'sent', 'delivered', 'bounced', 'failed', 'skipped_unsubscribed'],
      default: 'queued',
      index: true
    },
    tracking_token: { type: String, trim: true, unique: true, sparse: true },
    provider_message_id: { type: String, trim: true, default: null },
    error_message: { type: String, trim: true, default: null },

    sent_at: { type: Date, default: null },
    delivered_at: { type: Date, default: null },
    bounced_at: { type: Date, default: null },
    first_opened_at: { type: Date, default: null },
    last_opened_at: { type: Date, default: null },
    open_count: { type: Number, default: 0 },
    suspected_bot_open: { type: Boolean, default: false },
    first_clicked_at: { type: Date, default: null },
    last_clicked_at: { type: Date, default: null },
    click_count: { type: Number, default: 0 },
    inquired_at: { type: Date, default: null },
    quoted_at: { type: Date, default: null },
    converted_at: { type: Date, default: null },
    unsubscribed_at: { type: Date, default: null }
  },
  {
    collection: 'lm_campaign_recipients',
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
  }
);
leadCampaignRecipientSchema.index({ campaign_id: 1, lead_id: 1 }, { unique: true });

// 4. Granular Email Events Log (FRD Sections 16.2 & 17: campaign_email_events)
const leadCampaignEmailEventSchema = new mongoose.Schema(
  {
    campaign_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'lm_campaigns',
      required: true,
      index: true
    },
    recipient_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'lm_campaign_recipients',
      default: null
    },
    lead_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'lm_marketing_leads',
      required: true,
      index: true
    },
    event_type: {
      type: String,
      enum: ['sent', 'delivered', 'bounced', 'open', 'click', 'inquiry', 'quote', 'unsubscribe'],
      required: true,
      index: true
    },
    link_url: { type: String, trim: true, default: null },
    is_suspected_bot_prefetch: { type: Boolean, default: false },
    ip_address: { type: String, trim: true, default: null },
    user_agent: { type: String, trim: true, default: null },
    raw_payload: { type: mongoose.Schema.Types.Mixed, default: null },
    occurred_at: { type: Date, default: Date.now, index: true }
  },
  { collection: 'lm_campaign_email_events' }
);

// 5. Attributed Conversions Ledger (FRD Sections 11, 12, 13 & 17: marketing_conversions)
const leadConversionSchema = new mongoose.Schema(
  {
    lead_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'lm_marketing_leads',
      required: true,
      index: true
    },
    lead_code: { type: String, trim: true, default: '' },
    primary_segment_key: {
      type: String,
      enum: ['franchisee_leads', 'epc_signup_leads', 'epc_sales_leads'],
      required: true,
      index: true
    },
    conversion_type: {
      type: String,
      enum: ['franchisee_converted', 'epc_registered', 'epc_commercial_order'],
      required: true,
      index: true
    },
    source_entity_model: {
      type: String,
      enum: ['resellers', 'epc_accounts', 'epc_orders'],
      required: true
    },
    source_entity_id: {
      type: mongoose.Schema.Types.ObjectId,
      required: true
    },
    order_number: { type: String, trim: true, default: null },
    order_category: {
      type: String,
      enum: ['trial_order', 'loose_order', 'po_order', 'tender_order', 'repeat_order', null],
      default: null
    },
    order_value_inr: { type: Number, default: 0 },
    order_capacity_kw: { type: Number, default: 0 },
    order_status: { type: String, trim: true, default: null },

    // Attribution (First-Touch, Last-Touch & Full Touch Path)
    first_touch_campaign_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'lm_campaigns',
      default: null,
      index: true
    },
    last_touch_campaign_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'lm_campaigns',
      default: null,
      index: true
    },
    touch_history_campaign_ids: [
      { type: mongoose.Schema.Types.ObjectId, ref: 'lm_campaigns' }
    ],
    assigned_bde_id: { type: mongoose.Schema.Types.ObjectId, ref: 'bde_profiles', default: null },
    country_name: { type: String, trim: true, default: 'India' },
    state_name: { type: String, trim: true, default: '' },
    district_name: { type: String, trim: true, default: '' },
    cluster_name: { type: String, trim: true, default: '' },
    converted_at: { type: Date, default: Date.now, index: true }
  },
  {
    collection: 'lm_marketing_conversions',
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
  }
);
// Guarantees zero duplicate conversion recording for the same commercial order / registration / franchise activation
leadConversionSchema.index({ conversion_type: 1, source_entity_id: 1 }, { unique: true });

module.exports = {
  LeadCampaign: db.model('lm_campaigns', leadCampaignSchema),
  LeadCampaignSegmentMapping: db.model('lm_campaign_segment_mappings', leadCampaignSegmentMappingSchema),
  LeadCampaignRecipient: db.model('lm_campaign_recipients', leadCampaignRecipientSchema),
  LeadCampaignEmailEvent: db.model('lm_campaign_email_events', leadCampaignEmailEventSchema),
  LeadConversion: db.model('lm_marketing_conversions', leadConversionSchema)
};
