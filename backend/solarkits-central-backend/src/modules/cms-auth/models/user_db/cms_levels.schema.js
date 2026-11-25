const mongoose = require('mongoose');
const { USER_DB } = require('../../config/databases');

// cms_levels — no FK
const schema = new mongoose.Schema({
  name:           { type: String, required: true, trim: true, maxlength: 50 },
  scope_priority: { type: Number, required: true },
  geo_table_name: { type: String, default: null, maxlength: 50 }, // kept as string (maps to geo collection name)
  is_active:      { type: Boolean, default: true },
  deleted_at:     { type: Date, default: null },
  created_at:     { type: Date, default: Date.now },
}, { collection: 'cms_levels', timestamps: false, toJSON: { virtuals: true }, toObject: { virtuals: true } });

schema.virtual('id').get(function () { return this._id; });
module.exports = USER_DB.model('cms_levels', schema);
