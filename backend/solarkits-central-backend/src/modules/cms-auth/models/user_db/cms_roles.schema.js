const mongoose = require('mongoose');
const { USER_DB } = require('../../config/databases');

const schema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, maxlength: 50, unique: true },
  department_id: { type: mongoose.Schema.Types.ObjectId, ref: 'cms_departments', default: null, required: true },
  level_id: { type: mongoose.Schema.Types.ObjectId, ref: 'cms_levels', default: null, required: true },
  country_id: { type: mongoose.Schema.Types.ObjectId, default: null }, // country-level scoping support
  parent_role_id: { type: mongoose.Schema.Types.ObjectId, ref: 'cms_roles', default: null },
  access_modules_by_parent: { type: Boolean, default: false },
  is_system: { type: Boolean, default: false },
  is_protected: { type: Boolean, default: false },
  is_active: { type: Boolean, default: true },
  is_deleted: { type: Boolean, default: false },
  deleted_at: { type: Date, default: null },
  deleted_by: { type: mongoose.Schema.Types.ObjectId, ref: 'cms_users', default: null },
  created_at: { type: Date, default: Date.now },
}, { collection: 'cms_roles', timestamps: false, toJSON: { virtuals: true }, toObject: { virtuals: true } });

schema.virtual('id').get(function () { return this._id; });
module.exports = USER_DB.model('cms_roles', schema);
