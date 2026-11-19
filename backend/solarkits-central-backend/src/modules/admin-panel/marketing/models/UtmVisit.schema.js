const mongoose = require('mongoose');
const { USER_DB: db } = require('../../config/databases');

const schema = new mongoose.Schema(
  {
    campaign_id: { type: mongoose.Schema.Types.ObjectId, ref: 'marketing_campaigns', index: true },
    short_code: { type: String, trim: true, index: true },
    visitor_session_id: { type: String, trim: true },
    utm_source: { type: String, trim: true },
    utm_medium: { type: String, trim: true },
    utm_campaign: { type: String, trim: true },
    utm_content: { type: String, trim: true },
    utm_term: { type: String, trim: true },
    landing_url: { type: String },
    referrer: { type: String },
    ip_address: { type: String },
    user_agent: { type: String },

    // Conversion Bridge
    has_form_submitted: { type: Boolean, default: false },
    form_key: { type: String, default: null },
    lead_id: { type: mongoose.Schema.Types.ObjectId, ref: 'website_epc_leads', default: null },
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

schema.virtual('id').get(function () {
  return this._id;
});

module.exports = db.model('marketing_utm_visits', schema);
