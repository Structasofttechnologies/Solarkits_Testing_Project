const mongoose = require('mongoose');
const { india_core_db: db } = require('../../config/databases');

const schema = new mongoose.Schema({
  name:           { type: String, required: true, trim: true, maxlength: 200 },
  email:          { type: String, required: false, trim: true, lowercase: true, maxlength: 100, default: null },
  contact_person: { type: String, trim: true, maxlength: 150, default: null },
  mobile_number:  { type: String, trim: true, maxlength: 20, default: null },
  gst_number:     { type: String, trim: true, uppercase: true, maxlength: 30, default: null },
  state_name:     { type: String, trim: true, maxlength: 120, default: null },
  district_id:    { type: mongoose.Schema.Types.ObjectId, ref: 'geolocation_level_2', default: null },
  district_name:  { type: String, trim: true, maxlength: 120, default: null },
  cluster_id:     { type: mongoose.Schema.Types.ObjectId, ref: 'franchisee_clusters', default: null, index: true },
  cluster_name:   { type: String, trim: true, maxlength: 150, default: null },
  cluster_code:   { type: String, trim: true, uppercase: true, maxlength: 60, default: null },
  cluster_ids:    [{ type: mongoose.Schema.Types.ObjectId, ref: 'franchisee_clusters' }],
  pincode:        { type: String, trim: true, maxlength: 15, default: null },
  address_line:   { type: String, trim: true, maxlength: 300, default: null },
  epc_type:       { type: String, trim: true, maxlength: 100, default: null },
  epc_type_code:  { type: String, trim: true, maxlength: 60, default: null },   // 'buyer' | 'verified_epc' | 'registered_epc'
  epc_type_id:    { type: mongoose.Schema.Types.ObjectId, ref: 'epc_types', default: null },
  remarks:        { type: String, trim: true, maxlength: 500, default: null },
  custom_attributes: { type: mongoose.Schema.Types.Mixed, default: {} },
  source:         { type: String, trim: true, default: 'government' },
  working_states: [{ type: mongoose.Schema.Types.ObjectId, ref: 'geolocation_level_1' }],
  deleted_at:     { type: Date, default: null },
}, { collection: 'epc_companies', timestamps: { createdAt: 'created_at', updatedAt: false }, toJSON: { virtuals: true }, toObject: { virtuals: true } });

schema.virtual('id').get(function () { return this._id; });

module.exports = db.model('epc_companies', schema);
