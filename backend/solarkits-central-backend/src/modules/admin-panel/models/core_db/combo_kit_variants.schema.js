const mongoose = require('mongoose');
const { solarkits_core_db: db } = require('../../config/databases');

const variantItemSchema = new mongoose.Schema({
  combo_kit_id: { type: mongoose.Schema.Types.ObjectId, ref: 'pc_comobo_kit', required: false },
  name: { type: String, required: true },
  color: { type: String, default: null },
  additional_price: { type: Number, required: true },
  worth_price: { type: Number, required: true },
  additional_features: [mongoose.Schema.Types.Mixed]
}, { _id: true });

const schema = new mongoose.Schema({
  country_id: { type: mongoose.Schema.Types.ObjectId, ref: 'geolocation_level_0', required: true },
  category_id: { type: mongoose.Schema.Types.ObjectId, ref: 'sys_filter_categories', required: true },
  subcategory_id: { type: mongoose.Schema.Types.ObjectId, ref: 'sys_filter_subcategories', required: true },
  type_id: { type: mongoose.Schema.Types.ObjectId, ref: 'sys_filter_type_maps', required: true },
  project_range_id: { type: mongoose.Schema.Types.ObjectId, ref: 'sys_filter_ranges', required: true },
  variants: {
    type: [variantItemSchema],
    validate: {
      validator: function(v) {
        return v && v.length >= 1;
      },
      message: 'You must assign at least one variant.'
    }
  },
  is_active: { type: Boolean, default: true },
  deleted_at: { type: Date, default: null },
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now }
}, { collection: 'combo_kit_variants', timestamps: false, toJSON: { virtuals: true }, toObject: { virtuals: true } });

schema.virtual('id').get(function () { return this._id; });

schema.index({ country_id: 1, category_id: 1, subcategory_id: 1, type_id: 1, project_range_id: 1, deleted_at: 1 }, { unique: true });

module.exports = db.model('combo_kit_variants', schema);
