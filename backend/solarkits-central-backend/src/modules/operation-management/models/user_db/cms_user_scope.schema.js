const mongoose = require('mongoose');
const { user_db } = require('../../config/databases');

// cms_user_scope
// user_id → cms_users (SAME DB → ObjectId)
// scope_id → geo collections (CROSS DB → ObjectId ref)
const schema = new mongoose.Schema({
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'cms_users', required: true },
  scope_id: { type: mongoose.Schema.Types.ObjectId, required: true }, 
  deleted_at: { type: Date, default: null },
  created_at: { type: Date, default: Date.now },
}, { collection: 'cms_user_scope', timestamps: false, toJSON: { virtuals: true }, toObject: { virtuals: true } });

schema.index({ user_id: 1, scope_id: 1 }, { unique: true });
schema.virtual('id').get(function () { return this._id; });
module.exports = user_db.model('cms_user_scope', schema);
