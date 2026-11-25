const mongoose = require('mongoose');
const { india_solarshop_db: db } = require('../../config/databases');

const schema = new mongoose.Schema({
  account_id:     { type: mongoose.Schema.Types.ObjectId, ref: 'epc_accounts', required: true },
  company_id:     { type: mongoose.Schema.Types.ObjectId, ref: 'epc_companies', default: null },
  state_id:       { type: mongoose.Schema.Types.ObjectId, ref: 'geolocation_level_1', required: true },
  district_id:    { type: mongoose.Schema.Types.ObjectId, ref: 'geolocation_level_2', required: true },
  state_name:     { type: String, required: true, trim: true },
  district_name:  { type: String, required: true, trim: true },
  office_name:    { type: String, default: 'Branch Office', trim: true },
  address:        { type: String, required: true, trim: true },
  pincode:        { type: String, required: true, trim: true, maxlength: 10 },
  photo_url:      { type: String, default: null },
  is_home_office: { type: Boolean, default: false },
  contact_person: { type: String, default: null, trim: true },
  contact_phone:  { type: String, default: null, trim: true },
  is_active:      { type: Boolean, default: true },
  deleted_at:     { type: Date, default: null },
}, {
  collection: 'epc_offices',
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

schema.index({ company_id: 1, state_id: 1, deleted_at: 1 });
schema.index({ account_id: 1, state_id: 1, deleted_at: 1 });
schema.virtual('id').get(function () { return this._id; });

module.exports = db.model('epc_offices', schema);
