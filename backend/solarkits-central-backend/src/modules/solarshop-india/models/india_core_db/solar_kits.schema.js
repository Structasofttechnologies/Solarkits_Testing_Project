const mongoose = require('mongoose');
const { core_db: db } = require('../../config/databases');

const schema = new mongoose.Schema({
  name: { type: String, required: true },
  category_id: { type: mongoose.Schema.Types.ObjectId, ref: 'sys_filter_categories' },
  subcategory_id: { type: mongoose.Schema.Types.ObjectId, ref: 'sys_filter_subcategories' },
  is_active: { type: Boolean, default: true },
  deleted_at: { type: Date, default: null }
}, { 
  collection: 'pc_combo_kit_definitions' 
});

schema.virtual('id').get(function () { return this._id; });

module.exports = db.model('pc_combo_kit_definitions', schema);
