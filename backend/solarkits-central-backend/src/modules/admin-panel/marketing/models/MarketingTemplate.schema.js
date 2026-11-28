const mongoose = require('mongoose');
const { USER_DB: db } = require('../../config/databases');

const buttonSchema = new mongoose.Schema(
  {
    type: { type: String, enum: ['URL', 'QUICK_REPLY', 'PHONE_NUMBER'], default: 'URL' },
    text: { type: String, required: true },
    url: { type: String },
    phone_number: { type: String }
  },
  { _id: false }
);

const schema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    channel: { type: String, enum: ['email', 'whatsapp'], required: true },
    type: { type: String, enum: ['marketing', 'utility', 'promotional', 'followup'], default: 'marketing' },
    tags: [{ type: String }],
    is_active: { type: Boolean, default: true },

    // ── Email Specifics ──
    subject: { type: String, trim: true },
    preview_text: { type: String, trim: true },
    html_content: { type: String },
    plain_text: { type: String },
    banner_url: { type: String },
    brochure_pdf_url: { type: String },

    // ── WhatsApp Specifics (Meta Cloud API Approved Template format) ──
    wa_template_name: { type: String, lowercase: true, trim: true }, // e.g. solarkits_epc_special_offer
    language: { type: String, default: 'en' },
    category: { type: String, enum: ['MARKETING', 'UTILITY', 'AUTHENTICATION'], default: 'MARKETING' },
    header_type: { type: String, enum: ['NONE', 'TEXT', 'IMAGE', 'DOCUMENT', 'VIDEO'], default: 'NONE' },
    header_text: { type: String },
    header_media_url: { type: String },
    body_text: { type: String },
    footer_text: { type: String },
    buttons: [buttonSchema],
    wa_status: { type: String, enum: ['APPROVED', 'PENDING', 'REJECTED', 'DRAFT'], default: 'APPROVED' },

    // Dynamic variable tokens: e.g. ['{{name}}', '{{company}}', '{{kit_name}}', '{{price}}']
    dynamic_variables: [{ type: String }],
    blocks_json: { type: mongoose.Schema.Types.Mixed, default: null },
    thumbnail_url: { type: String, default: null },

    sent_count: { type: Number, default: 0 },
    opened_or_read_count: { type: Number, default: 0 },
    click_count: { type: Number, default: 0 },
    last_tested_at: { type: Date, default: null },
    last_test_target: { type: String, default: null },
    last_error: { type: String, default: null },

    created_by: { type: mongoose.Schema.Types.ObjectId, ref: 'cms_users', default: null }
  },
  {
    collection: 'marketing_templates',
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

schema.virtual('id').get(function () {
  return this._id;
});

module.exports = db.model('marketing_templates', schema);
