const mongoose = require('mongoose');
const { USER_DB: db } = require('../../config/databases');

const schema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    short_code: { type: String, required: true, unique: true, trim: true, index: true },
    base_url: { type: String, required: true, trim: true, default: 'https://solarkits.in' },
    full_url: { type: String, trim: true },
    campaign_id: { type: mongoose.Schema.Types.ObjectId, ref: 'marketing_campaigns', default: null },
    utm_source: { type: String, default: 'solarkits_marketing', trim: true },
    utm_medium: { type: String, default: 'campaign', trim: true },
    utm_campaign: { type: String, default: '', trim: true },
    utm_content: { type: String, default: '', trim: true },
    utm_term: { type: String, default: '', trim: true },
    clicks: { type: Number, default: 0 },
    last_clicked_at: { type: Date, default: null },
    is_active: { type: Boolean, default: true },
    created_by: { type: mongoose.Schema.Types.ObjectId, ref: 'cms_users', default: null }
  },
  {
    collection: 'marketing_tracking_links',
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

schema.pre('validate', function () {
  if (!this.short_code) {
    this.short_code = `sk${Math.random().toString(36).substring(2, 8)}`;
  }
  const cleanBase = this.base_url || 'https://solarkits.in';
  const params = new URLSearchParams();
  if (this.utm_source) params.set('utm_source', this.utm_source);
  if (this.utm_medium) params.set('utm_medium', this.utm_medium);
  if (this.utm_campaign) params.set('utm_campaign', this.utm_campaign);
  if (this.utm_content) params.set('utm_content', this.utm_content);
  if (this.utm_term) params.set('utm_term', this.utm_term);
  const sep = cleanBase.includes('?') ? '&' : '?';
  this.full_url = params.toString() ? `${cleanBase}${sep}${params.toString()}` : cleanBase;
});

schema.virtual('id').get(function () {
  return this._id;
});

module.exports = db.model('marketing_tracking_links', schema);
