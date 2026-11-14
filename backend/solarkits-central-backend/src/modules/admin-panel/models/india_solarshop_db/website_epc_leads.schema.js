const mongoose = require('mongoose');
const { india_solarshop_db } = require('../../config/databases');

/**
 * website_epc_leads — Bulk Solar Kit Inquiries submitted by EPC contractors from Solar Store website.
 *
 * Collection: website_epc_leads
 */
const schema = new mongoose.Schema({
  lead_id: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    uppercase: true,
    index: true,
  },
  name: {
    type: String,
    trim: true,
    maxlength: 150,
  },
  company_name: {
    type: String,
    trim: true,
    maxlength: 200,
  },
  contact_person: {
    type: String,
    trim: true,
    maxlength: 150,
  },
  phone: {
    type: String,
    trim: true,
    maxlength: 15,
    index: true,
  },
  mobile_number: {
    type: String,
    trim: true,
    maxlength: 15,
    index: true,
  },
  email: {
    type: String,
    default: null,
    trim: true,
    lowercase: true,
    maxlength: 150,
  },
  state_id: {
    type: mongoose.Schema.Types.ObjectId,
    default: null,
  },
  state_name: {
    type: String,
    required: true,
    trim: true,
    index: true,
  },
  district_name: {
    type: String,
    default: null,
    trim: true,
  },
  pincode: {
    type: String,
    default: null,
    trim: true,
    maxlength: 10,
  },
  project_type: {
    type: String,
    default: 'Bulk Solar Combo Kits',
    trim: true,
  },
  estimated_quantity: {
    type: String,
    default: '5+ Kits',
    trim: true,
  },
  gst_number: {
    type: String,
    default: null,
    trim: true,
    uppercase: true,
  },
  gst_verification_status: {
    type: String,
    enum: ['verified_automatic', 'verified_admin', 'pending_admin', 'unverified'],
    default: 'pending_admin',
  },
  query_message: {
    type: String,
    default: null,
    trim: true,
    maxlength: 1000,
  },
  status: {
    type: String,
    default: 'new',
    index: true,
  },
  lead_status: {
    type: String,
    default: 'New',
    index: true,
  },
  lead_source: {
    type: String,
    default: 'portal',
    index: true,
  },
  assigned_bde_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'bde_profiles',
    default: null,
    index: true,
  },
  current_bde_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'bde_profiles',
    default: null,
  },
  assigned_bde_name: {
    type: String,
    default: null,
    trim: true,
  },
  assigned_bde_phone: {
    type: String,
    default: null,
    trim: true,
  },
  assigned_at: {
    type: Date,
    default: null,
  },
  assigned_by: {
    type: String,
    default: null,
    trim: true,
  },
  remarks: {
    type: String,
    default: null,
    trim: true,
  },
  source: {
    type: String,
    default: 'solar-store-bulk-banner',
    trim: true,
  },
  deleted_at: {
    type: Date,
    default: null,
  },
}, {
  collection: 'epc_leads',
  strict: false,
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
});

schema.index({ state_name: 1, status: 1 });
schema.index({ assigned_bde_id: 1, status: 1 });

module.exports = india_solarshop_db.model('website_epc_leads', schema);
