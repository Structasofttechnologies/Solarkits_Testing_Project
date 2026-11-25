const mongoose = require('mongoose');
const { solarkits_core_db } = require('../../config/databases');

// subtype_scope_map — pivot table (subtype_id, subcategory_type_id)
const schema = new mongoose.Schema({
  subtype: { type: mongoose.Schema.Types.ObjectId, ref: 'pc_product_subtypes', required: true },
  subcategory_type: { type: mongoose.Schema.Types.ObjectId, ref: 'sys_filter_type_maps', required: true },
}, { timestamps: false, toJSON: { virtuals: true }, toObject: { virtuals: true } });

schema.virtual('id').get(function () { return this._id; });
module.exports = solarkits_core_db.model('pc_subtype_scope_map', schema);
