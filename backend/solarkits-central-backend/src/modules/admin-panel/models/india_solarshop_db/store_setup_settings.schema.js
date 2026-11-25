const mongoose = require('mongoose');
const { india_solarshop_db } = require('../../config/databases');

/**
 * store_setup_settings — Global configurations and master checklist templates for Store Setup.
 *
 * Collection: store_setup_settings
 */
const activitySchema = new mongoose.Schema({
  activity_code: { type: String, required: true, trim: true },
  title: { type: String, required: true, trim: true },
  description: { type: String, default: '', trim: true },
  category: {
    type: String,
    required: true,
    trim: true,
    default: 'Location and Documentation',
  },
  is_mandatory: { type: Boolean, default: true },
  proof_required: { type: Boolean, default: true },
  proof_type: {
    type: String,
    enum: ['image_or_pdf', 'photo_only', 'document_only', 'gps_photo', 'checkbox'],
    default: 'image_or_pdf',
  },
  display_order: { type: Number, default: 0 },
  is_active: { type: Boolean, default: true },
}, { _id: true });

const schema = new mongoose.Schema({
  setting_key: {
    type: String,
    required: true,
    unique: true,
    default: 'DEFAULT_STORE_SETUP_CONFIG',
  },
  default_setup_days: {
    type: Number,
    required: true,
    default: 30,
    min: 1,
  },
  due_soon_threshold_days: {
    type: Number,
    required: true,
    default: 5,
    min: 1,
  },
  reminder_intervals: {
    type: [Number],
    default: [5, 2, 0], // Remind at 5 days remaining, 2 days remaining, and due date
  },
  require_franchisee_confirmation: {
    type: Boolean,
    default: true,
  },
  auto_delay_detection: {
    type: Boolean,
    default: true,
  },
  checklist_categories: {
    type: [String],
    default: [
      'Location and Documentation',
      'Store Infrastructure',
      'Solarkits Branding',
      'Product Display',
      'Software Setup',
      'Final Verification',
    ],
  },
  master_checklist_activities: [activitySchema],
  updated_by: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'cms_users',
    default: null,
  },
}, {
  collection: 'store_setup_settings',
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
});

schema.virtual('id').get(function () { return this._id; });

module.exports = india_solarshop_db.model('store_setup_settings', schema);
