const mongoose = require('mongoose');
const { USER_DB } = require('../../config/databases');

const schema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, maxlength: 100 },
  slug: { type: String, required: true, trim: true, unique: true, maxlength: 50 },
  description: { type: String, trim: true, default: '' },
  is_active: { type: Boolean, default: true },
  is_system: { type: Boolean, default: false },
  is_protected: { type: Boolean, default: false },
  is_deleted: { type: Boolean, default: false },
  deleted_at: { type: Date, default: null },
  deleted_by: { type: mongoose.Schema.Types.ObjectId, ref: 'cms_users', default: null }
}, { collection: 'saas_products', timestamps: false, toJSON: { virtuals: true }, toObject: { virtuals: true } });

schema.virtual('id').get(function () { return this._id; });
module.exports = USER_DB.model('saas_products', schema);
