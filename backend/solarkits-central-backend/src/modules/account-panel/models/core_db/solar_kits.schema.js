const mongoose = require('mongoose');
const { solarkits_core_db: db } = require('../../config/databases');

const s = new mongoose.Schema({
  name: { type: String, required: true, trim: true, maxlength: 255 },
  description: { type: String, default: null },
  category_id: { type: mongoose.Schema.Types.ObjectId, ref: 'sys_filter_categories', required: true },
  subcategory_id: { type: mongoose.Schema.Types.ObjectId, ref: 'sys_filter_subcategories', required: true },
  type_id: { type: mongoose.Schema.Types.ObjectId, ref: 'sys_filter_type_maps', required: true },

  // Architectural Blueprinting
  base_template_ids: [{ type: mongoose.Schema.Types.ObjectId, ref: 'pc_product_templates' }],
  bos_template_ids: [{ type: mongoose.Schema.Types.ObjectId, ref: 'pc_product_templates' }],

  base_components: [{
    template_id: { type: mongoose.Schema.Types.ObjectId, ref: 'pc_product_templates' },
    subtype_id: { type: mongoose.Schema.Types.ObjectId, ref: 'pc_product_subtypes' }
  }],

  bos_kits: [{
    name: { type: String, required: true },
    brand_id: { type: mongoose.Schema.Types.ObjectId, ref: 'brands' },
    items: [{
      template_id: { type: mongoose.Schema.Types.ObjectId, ref: 'pc_product_templates' },
      subtype_ids: [{ type: mongoose.Schema.Types.ObjectId, ref: 'pc_product_subtypes' }]
    }]
  }],

  deleted_at: { type: Date, default: null },
  created_at: { type: Date, default: Date.now },
}, { collection: 'pc_combo_kit_definitions', timestamps: false, toJSON: { virtuals: true }, toObject: { virtuals: true } });

s.virtual('id').get(function () { return this._id; });

module.exports = db.model('pc_combo_kit_definitions', s);
