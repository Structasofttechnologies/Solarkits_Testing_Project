const mongoose = require('mongoose');
const { USER_DB: db } = require('../../config/databases');

const schema = new mongoose.Schema(
  {
    campaign_id: { type: mongoose.Schema.Types.ObjectId, ref: 'marketing_campaigns', index: true },
    short_code: { type: String, trim: true, index: true },
    website_key: { type: String, trim: true, index: true },
    site_domain: { type: String, trim: true, index: true },
    site_url: { type: String, trim: true },
    visitor_id: { type: String, trim: true, index: true },
    visitor_session_id: { type: String, trim: true },
    is_returning: { type: Boolean, default: false },
    utm_source: { type: String, trim: true },
    utm_medium: { type: String, trim: true },
    utm_campaign: { type: String, trim: true },
    utm_content: { type: String, trim: true },
    utm_term: { type: String, trim: true },
    landing_url: { type: String },
    page_path: { type: String, trim: true },
    visited_pages: { type: [String], default: [] },
    page_views: { type: Number, default: 1 },
    duration_seconds: { type: Number, default: 0 },
    is_bounce: { type: Boolean, default: true },
    referrer: { type: String },
    ip_address: { type: String },
    user_agent: { type: String },
    device_type: { type: String, trim: true },
    browser_language: { type: String, trim: true },
    screen_resolution: { type: String, trim: true },

    // Conversion Bridge
    has_form_submitted: { type: Boolean, default: false },
    form_key: { type: String, default: null },
    lead_id: { type: mongoose.Schema.Types.ObjectId, ref: 'website_epc_leads', default: null },
    lead_model: { type: String, trim: true, default: null },
    epc_id: { type: mongoose.Schema.Types.ObjectId, ref: 'epc_accounts', default: null },
    has_ordered: { type: Boolean, default: false },
    order_id: { type: mongoose.Schema.Types.ObjectId, ref: 'epc_orders', default: null },
    attributed_revenue: { type: Number, default: 0 },

    first_touch_at: { type: Date, default: Date.now },
    last_touch_at: { type: Date, default: Date.now },
    visit_count: { type: Number, default: 1 }
  },
  {
    collection: 'marketing_utm_visits',
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

schema.index({ website_key: 1, created_at: -1 });
schema.index({ website_key: 1, visitor_session_id: 1 }, { sparse: true });
schema.index({ visitor_id: 1, website_key: 1 });

schema.virtual('id').get(function () {
  return this._id;
});

module.exports = db.model('marketing_utm_visits', schema);
