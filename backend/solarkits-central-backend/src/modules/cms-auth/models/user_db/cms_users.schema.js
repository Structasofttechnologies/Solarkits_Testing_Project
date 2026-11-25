const mongoose = require('mongoose');
const { USER_DB } = require('../../config/databases');

const schema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, maxlength: 250 },
  email: { type: String, required: true, trim: true, lowercase: true, unique: true, maxlength: 250 },
  phone_code: { type: String, required: true, trim: true, maxlength: 10 },
  phone: { type: String, required: true, trim: true, maxlength: 15, unique: true },
  parent_user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'cms_users', default: null },
  role_id: { type: mongoose.Schema.Types.ObjectId, ref: 'cms_roles', default: null },
  passcode: { type: String, default: null },
  failed_login_attempts: { type: Number, default: 0 },
  token: { type: String, default: null },
  token_version: { type: Number, default: 0 },
  is_verified: { type: Boolean, default: false },
  is_system: { type: Boolean, default: false },
  is_protected: { type: Boolean, default: false },
  is_active: { type: Boolean, default: false },
  is_deleted: { type: Boolean, default: false },
  deleted_at: { type: Date, default: null },
  deleted_by: { type: mongoose.Schema.Types.ObjectId, ref: 'cms_users', default: null },
  last_failed_login_at: { type: Date, default: null },
  country: { type: String, default: 'India', trim: true },
}, { 
  collection: 'cms_users', 
  timestamps: { createdAt: 'created_at', updatedAt: 'update_at' },
  toJSON: { virtuals: true }, 
  toObject: { virtuals: true } 
});

schema.virtual('id').get(function () { return this._id; });
module.exports = USER_DB.model('cms_users', schema);
