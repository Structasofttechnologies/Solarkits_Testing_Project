const mongoose = require('mongoose');
const { USER_DB } = require('../../config/databases');

const schema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, maxlength: 100 },
  unique_code: { type: String, required: true, trim: true, maxlength: 50, unique: true },
  panel_id: { type: mongoose.Schema.Types.ObjectId, ref: 'cms_panels', required: true },
  level_id: { type: mongoose.Schema.Types.ObjectId, ref: 'cms_levels', required: true },
  parent_module_id: { type: mongoose.Schema.Types.ObjectId, ref: 'cms_modules', default: null },
  dashboard_context: { type: String, enum: ['default', 'product'], default: 'default', required: true },
  saas_product_id: { type: mongoose.Schema.Types.ObjectId, ref: 'saas_products', default: null },
  is_active: { type: Boolean, default: true },
  is_deleted: { type: Boolean, default: false },
  deleted_at: { type: Date, default: null },
  deleted_by: { type: mongoose.Schema.Types.ObjectId, ref: 'cms_users', default: null },
  created_at: { type: Date, default: Date.now },
}, { collection: 'cms_modules', timestamps: false, toJSON: { virtuals: true }, toObject: { virtuals: true } });

// Validation rules
schema.pre('save', function () {
  if (this.dashboard_context === 'default') {
    this.saas_product_id = null;
  } else if (this.dashboard_context === 'product' && !this.saas_product_id) {
    throw new Error('saas_product_id is required for product dashboard context modules');
  }
});

schema.virtual('id').get(function () { return this._id; });
module.exports = USER_DB.model('cms_modules', schema);
