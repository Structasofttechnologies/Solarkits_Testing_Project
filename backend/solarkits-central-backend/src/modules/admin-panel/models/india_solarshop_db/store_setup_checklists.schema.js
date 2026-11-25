const mongoose = require('mongoose');
const { india_solarshop_db } = require('../../config/databases');

/**
 * store_setup_checklists — Snapshot of checklist activities generated per Store Setup.
 *
 * Collection: store_setup_checklists
 */
const proofItemSchema = new mongoose.Schema({
  url: { type: String, required: true, trim: true },
  filename: { type: String, default: null, trim: true },
  file_type: { type: String, default: 'image', trim: true },
  uploaded_at: { type: Date, default: Date.now },
  uploaded_by: { type: mongoose.Schema.Types.ObjectId, ref: 'cms_users', default: null },
}, { _id: true });

const schema = new mongoose.Schema({
  store_setup_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'store_setups',
    required: true,
  },
  franchisee_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'resellers',
    required: true,
  },
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

  // Activity Status & Progress
  status: {
    type: String,
    enum: ['pending', 'in_progress', 'completed', 'rejected'],
    default: 'pending',
  },
  completed_at: { type: Date, default: null },
  completed_by: { type: mongoose.Schema.Types.ObjectId, ref: 'cms_users', default: null },
  employee_remarks: { type: String, default: null, trim: true },

  // Proofs & Photos
  proofs: [proofItemSchema],

  // Admin Review for this item
  admin_verification_status: {
    type: String,
    enum: ['pending', 'verified', 'correction_required'],
    default: 'pending',
  },
  admin_verified_at: { type: Date, default: null },
  admin_verified_by: { type: mongoose.Schema.Types.ObjectId, ref: 'cms_users', default: null },
  admin_remarks: { type: String, default: null, trim: true },
}, {
  collection: 'store_setup_checklists',
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
});

schema.index({ store_setup_id: 1, category: 1 });
schema.index({ store_setup_id: 1, status: 1 });
schema.index({ franchisee_id: 1 });

schema.virtual('id').get(function () { return this._id; });

module.exports = india_solarshop_db.model('store_setup_checklists', schema);
