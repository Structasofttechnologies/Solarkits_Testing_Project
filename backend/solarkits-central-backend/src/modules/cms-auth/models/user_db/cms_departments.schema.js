const mongoose = require('mongoose');
const { USER_DB } = require('../../config/databases');

const schema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, maxlength: 100, unique: true },
  panel_id: { type: mongoose.Schema.Types.ObjectId, ref: 'cms_panels', default: null }, // legacy field, kept nullable
  level: { type: String, enum: ['global', 'country'], default: 'global', required: true },
  country_id: { type: mongoose.Schema.Types.ObjectId, default: null }, // keep for legacy compatibility
  country_ids: { type: [mongoose.Schema.Types.ObjectId], default: [] }, // multi-country support
  is_system: { type: Boolean, default: false },
  is_protected: { type: Boolean, default: false },
  is_active: { type: Boolean, default: true },
  is_deleted: { type: Boolean, default: false },
  deleted_at: { type: Date, default: null },
  deleted_by: { type: mongoose.Schema.Types.ObjectId, ref: 'cms_users', default: null },
  created_at: { type: Date, default: Date.now },
}, { collection: 'cms_departments', timestamps: false, toJSON: { virtuals: true }, toObject: { virtuals: true } });

// level and global protection validation
schema.pre('save', function () {
  if (this.level === 'global') {
    this.country_id = null;
    this.country_ids = [];
  } else if (this.level === 'country') {
    if (!this.country_ids || this.country_ids.length === 0) {
      throw new Error('At least one country is required for country level departments');
    }
    // Keep country_id synced for legacy compatibility
    this.country_id = this.country_ids[0];
  }
});

schema.virtual('id').get(function () { return this._id; });
module.exports = USER_DB.model('cms_departments', schema);
