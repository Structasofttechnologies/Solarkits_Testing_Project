const mongoose = require('mongoose');
const { user_db } = require('../../config/databases');

const schema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, maxlength: 50 },
  slug: { type: String, required: true, trim: true, unique: true, maxlength: 50 },
  url_prefix: { type: String, required: true, trim: true, unique: true, maxlength: 50 },
  is_active: { type: Boolean, default: true },
  is_deleted: { type: Boolean, default: false },
  deleted_at: { type: Date, default: null },
  deleted_by: { type: mongoose.Schema.Types.ObjectId, ref: 'cms_users', default: null },
  created_at: { type: Date, default: Date.now },
}, { collection: 'cms_panels', timestamps: false, toJSON: { virtuals: true }, toObject: { virtuals: true } });

schema.virtual('id').get(function () { return this._id; });
module.exports = user_db.model('cms_panels', schema);
