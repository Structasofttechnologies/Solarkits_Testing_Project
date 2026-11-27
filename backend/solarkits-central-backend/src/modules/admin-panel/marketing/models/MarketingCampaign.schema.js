const mongoose = require('mongoose');
const { USER_DB: db } = require('../../config/databases');

const recipientSchema = new mongoose.Schema(
  {
    epc_id: { type: mongoose.Schema.Types.ObjectId, ref: 'epc_accounts', default: null },
    lead_id: { type: mongoose.Schema.Types.ObjectId, ref: 'website_epc_leads', default: null },
    source_type: { type: String, enum: ['epc', 'lead', 'segment'], default: 'epc' },
    segment_id: { type: mongoose.Schema.Types.ObjectId, ref: 'marketing_segments', default: null },
    segment_contact_id: { type: mongoose.Schema.Types.ObjectId, ref: 'marketing_segment_contacts', default: null },
    custom_fields: { type: mongoose.Schema.Types.Mixed, default: {} },
    name: { type: String, trim: true },
    phone: { type: String, trim: true },
    email: { type: String, trim: true, lowercase: true },
    channel: { type: String, enum: ['email', 'whatsapp', 'both'], default: 'both' },
    status: {
      type: String,
      enum: ['queued', 'sent', 'delivered', 'read', 'opened', 'clicked', 'visited', 'submitted_form', 'converted', 'failed', 'unsubscribed', 'skipped_unsubscribed'],
      default: 'queued'
    },
    wa_message_id: { type: String, default: null },
    email_message_id: { type: String, default: null },
    sent_at: { type: Date, default: null },
    delivered_at: { type: Date, default: null },
    read_at: { type: Date, default: null },
    clicked_at: { type: Date, default: null },
    visited_at: { type: Date, default: null },
    converted_at: { type: Date, default: null },
    error_message: { type: String, default: null }
  },
  { _id: true }
);

const followupRuleSchema = new mongoose.Schema(
  {
    condition: {
      type: String,
      enum: ['no_click', 'clicked_no_cart', 'cart_no_purchase', 'incomplete_reward_target', 'form_not_submitted'],
      default: 'no_click'
    },
    delay_days: { type: Number, default: 2 },
    channel: { type: String, enum: ['email', 'whatsapp'], default: 'email' },
    template_id: { type: mongoose.Schema.Types.ObjectId, ref: 'marketing_templates', default: null },
    is_active: { type: Boolean, default: true }
  },
  { _id: false }
);

const campaignSchema = new mongoose.Schema(
  {
    campaign_name: { type: String, required: true, trim: true },
    campaign_code: { type: String, unique: true, uppercase: true, trim: true },
    campaign_type: { type: String, enum: ['email', 'whatsapp', 'both'], required: true, default: 'both' },
    campaign_objective: {
      type: String,
      enum: [
        'lead_generation',
        'sales',
        'epc_onboarding',
        'epc_signup',
        'coupon_discount',
        'franchisee_onboarding',
        'product_promotion',
        'awareness',
        'engagement',
        'store_visits',
        'add_to_cart',
        'orders',
        'epc_activation'
      ],
      default: 'lead_generation'
    },
    target_audience_summary: { type: String, default: '' },
    assigned_manager: { type: mongoose.Schema.Types.ObjectId, ref: 'cms_users', default: null },

    status: {
      type: String,
      enum: ['draft', 'scheduled', 'running', 'paused', 'completed', 'cancelled'],
      default: 'draft',
      index: true
    },

    // Dates & Scheduling
    start_date: { type: Date, default: null },
    end_date: { type: Date, default: null },
    send_mode: { type: String, enum: ['one_time', 'recurring', 'event_triggered'], default: 'one_time' },
    repeat_frequency: { type: String, enum: ['daily', 'weekly', 'monthly', 'custom'], default: 'daily' },
    send_time: { type: String, default: '10:00' },
    timezone: { type: String, default: 'Asia/Kolkata' },

    // Financial & Goal Targets
    budget: { type: Number, default: 0 },
    actual_spent: { type: Number, default: 0 },
    target_leads: { type: Number, default: 0 },
    target_conversions: { type: Number, default: 0 },
    target_messages: { type: Number, default: 0 },
    target_website_visits: { type: Number, default: 0 },
    target_revenue: { type: Number, default: 0 },

    // ── Boss Requirement: 6-Step Guided Flow Fields ───────────────────
    // Step 2: EPC Audience selection & overlap handling
    epc_groups: {
      registered_epc: { type: Boolean, default: true },
      verified_epc:   { type: Boolean, default: false },
      buyer_epc:      { type: Boolean, default: false }
    },
    segment_ids: [{ type: mongoose.Schema.Types.ObjectId, ref: 'marketing_segments' }],
    segment_state_filter: { type: String, trim: true, default: '' },
    segment_district_filter: { type: String, trim: true, default: '' },
    audience_matching: { type: String, enum: ['any', 'all'], default: 'any' },
    exclude_groups: [{ type: String, enum: ['registered_epc', 'verified_epc', 'buyer_epc'] }],
    epc_types: [{ type: mongoose.Schema.Types.ObjectId, ref: 'epc_types' }],
    purchase_activity: { type: String, enum: ['all', 'never_purchased', 'active_buyer', 'inactive_buyer'], default: 'all' },
    last_order_days_condition: { type: String, enum: ['any', 'within', 'more_than'], default: 'any' },
    last_order_days: { type: Number, default: 90 },
    kit_interest: [{ type: String, enum: ['viewed', 'favourited', 'carted', 'quoted', 'purchased'] }],
    purchase_qty_min: { type: Number, default: 0 },
    purchase_qty_max: { type: Number, default: 0 },

    // Step 3: Campaign Area
    area_type: { type: String, enum: ['all_india', 'state', 'cluster', 'warehouse', 'store'], default: 'all_india' },
    warehouse_ids: [{ type: mongoose.Schema.Types.ObjectId, ref: 'company_warehouses' }],
    state_ids: [{ type: mongoose.Schema.Types.ObjectId, ref: 'geolocation_level_1' }],
    cluster_ids: [{ type: mongoose.Schema.Types.ObjectId, ref: 'geolocation_clusters' }],
    district_ids: [{ type: mongoose.Schema.Types.ObjectId, ref: 'geolocation_level_2' }],
    store_ids: [{ type: mongoose.Schema.Types.ObjectId, ref: 'franchisee_stores' }],
    location_basis: { type: String, enum: ['registered', 'delivery'], default: 'registered' },

    // Step 4: Purpose selection & 10 Dynamic Modes
    purpose: {
      type: String,
      enum: [
        'store_visits',
        'kit_sales',
        'new_kit',
        'popular_kit',
        'reward_kit_foreign_trip',
        'coupon_kit',
        'offer_announcement',
        'sample_to_bulk',
        'inactive_reactivation',
        'custom'
      ],
      default: 'kit_sales'
    },
    purpose_data: { type: mongoose.Schema.Types.Mixed, default: {} },

    // Step 5: Kit Campaign Configuration
    kit_selection_method: { type: String, enum: ['manual', 'favourite', 'last_purchased', 'popular', 'recommended'], default: 'manual' },
    kit_category: { type: String, default: 'Combo Kits' },
    kit_id: { type: mongoose.Schema.Types.ObjectId, ref: 'solar_kits', default: null },
    kit_variant_id: { type: String, default: null },
    quantity_slab_moq: { type: Number, default: 1 },
    serving_warehouse_id: { type: mongoose.Schema.Types.ObjectId, ref: 'company_warehouses', default: null },
    campaign_price: { type: Number, default: 0 },
    call_to_action: {
      type: String,
      enum: ['view_kit', 'add_to_cart', 'buy_now', 'request_quote', 'book_visit', 'view_reward_progress'],
      default: 'view_kit'
    },
    destination_url: { type: String, default: 'https://solarkits.in' },

    // Step 6: Achievement Targets & MIS Linkage
    goal_level: { type: String, enum: ['company', 'state', 'cluster', 'store'], default: 'cluster' },
    goal_period: { type: String, enum: ['monthly', 'yearly'], default: 'monthly' },
    goal_reference_id: { type: mongoose.Schema.Types.ObjectId, default: null },
    primary_kpi: { type: String, default: 'kits_sold' },
    supporting_kpis: [{ type: String }],
    campaign_target_value: { type: Number, default: 100 },
    percentage_basis: { type: String, default: 'total_cluster_goal' },
    mis_contribution_pct: { type: Number, default: 20 },
    attribution_period_days: { type: Number, default: 30 },

    // Senders & Templates
    email_sender_id: { type: mongoose.Schema.Types.ObjectId, ref: 'marketing_senders', default: null },
    email_template_id: { type: mongoose.Schema.Types.ObjectId, ref: 'marketing_templates', default: null },
    email_subject: { type: String, trim: true, default: '' },
    email_html_content: { type: String, default: '' },
    whatsapp_sender_id: { type: mongoose.Schema.Types.ObjectId, ref: 'marketing_senders', default: null },
    whatsapp_template_id: { type: mongoose.Schema.Types.ObjectId, ref: 'marketing_templates', default: null },

    // Step 7: Automation & Follow-up Rules
    followup_rules: [followupRuleSchema],
    max_sends_per_epc: { type: Number, default: 3 },
    audience_refresh_on_send: { type: Boolean, default: true },
    stop_on_purchase: { type: Boolean, default: true },
    stop_on_target_reached: { type: Boolean, default: true },

    // ── UTM Parameters & Website Form Tracking ────────────────────────
    utm_source: { type: String, default: 'solarkits_marketing' },
    utm_medium: { type: String, default: 'campaign' },
    utm_campaign: { type: String, default: '' },
    utm_content: { type: String, default: '' },
    utm_term: { type: String, default: '' },
    tracking_short_code: { type: String, unique: true, sparse: true },
    tracking_full_url: { type: String, default: '' },
    mapped_website_forms: [{ type: String }],

    // Recipients array (Deduplicated EPCs)
    recipients: [recipientSchema],
    total_recipients: { type: Number, default: 0 },

    // Performance Aggregated Stats
    stats: {
      messages_sent: { type: Number, default: 0 },
      delivered: { type: Number, default: 0 },
      opened_or_read: { type: Number, default: 0 },
      link_clicks: { type: Number, default: 0 },
      website_visits: { type: Number, default: 0 },
      form_submissions: { type: Number, default: 0 },
      qualified_leads: { type: Number, default: 0 },
      conversions: { type: Number, default: 0 },
      revenue_generated: { type: Number, default: 0 },
      bounced: { type: Number, default: 0 },
      failed: { type: Number, default: 0 },
      unsubscribed: { type: Number, default: 0 }
    },

    created_by: { type: mongoose.Schema.Types.ObjectId, ref: 'cms_users', default: null }
  },
  {
    collection: 'marketing_campaigns',
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

campaignSchema.virtual('id').get(function () {
  return this._id;
});

// Auto-generate unique campaign_code and short code if missing
campaignSchema.pre('validate', function () {
  if (!this.campaign_code) {
    const random = Math.floor(1000 + Math.random() * 9000);
    const yr = new Date().getFullYear();
    this.campaign_code = `SK-CAMP-${yr}-${random}`;
  }
  if (!this.tracking_short_code) {
    this.tracking_short_code = Math.random().toString(36).substring(2, 8);
  }
  if (!this.utm_campaign) {
    this.utm_campaign = this.campaign_code.toLowerCase().replace(/[^a-z0-9]/g, '_');
  }
});

module.exports = db.model('marketing_campaigns', campaignSchema);
