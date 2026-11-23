const mongoose = require('mongoose');
const { USER_DB: db } = require('../../config/databases');

const schema = new mongoose.Schema(
  {
    form_key: { type: String, required: true, unique: true, trim: true },
    form_name: { type: String, required: true, trim: true },
    page_route: { type: String, default: '/' },
    description: { type: String },
    is_active: { type: Boolean, default: true },
    target_team: { type: String, default: 'Sales / BDE Team' },
    default_lead_owner_id: { type: mongoose.Schema.Types.ObjectId, ref: 'cms_users', default: null },
    sla_hours: { type: Number, default: 4 },
    prevent_duplicate_days: { type: Number, default: 30 },
    auto_trigger_email: { type: Boolean, default: true },
    auto_trigger_whatsapp: { type: Boolean, default: true },
    confirmation_template_id: { type: mongoose.Schema.Types.ObjectId, ref: 'marketing_templates', default: null },
    total_submissions: { type: Number, default: 0 },
    total_leads_created: { type: Number, default: 0 }
  },
  {
    collection: 'marketing_form_mappings',
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

schema.virtual('id').get(function () {
  return this._id;
});

module.exports = db.model('marketing_form_mappings', schema);
