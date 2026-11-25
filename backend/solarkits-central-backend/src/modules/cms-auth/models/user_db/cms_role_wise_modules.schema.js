const mongoose = require('mongoose');
const { USER_DB } = require('../../config/databases');

// cms_role_wise_modules — role_id, module_id SAME DB → ObjectId
const schema = new mongoose.Schema({
  role_id: { type: mongoose.Schema.Types.ObjectId, ref: 'cms_roles', required: true },
  module_id: { type: mongoose.Schema.Types.ObjectId, ref: 'cms_modules', required: true },
  can_view: { type: Boolean, default: true, set: () => true },
  can_add: { type: Boolean, default: false },
  can_edit: { type: Boolean, default: false },
  can_delete: { type: Boolean, default: false },
  deleted_at: { type: Date, default: null },
  created_at: { type: Date, default: Date.now },
}, { collection: 'cms_role_wise_modules', timestamps: false, toJSON: { virtuals: true }, toObject: { virtuals: true } });

schema.index({ role_id: 1, module_id: 1 }, { unique: true });
schema.virtual('id').get(function () { return this._id; });
module.exports = USER_DB.model('cms_role_wise_modules', schema);
