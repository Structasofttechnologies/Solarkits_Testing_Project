const mongoose = require('mongoose');
const { solarkits_core_db: db } = require('../../config/databases');

// subtype_attribute_groups — subtype_id SAME DB → ObjectId
const s = new mongoose.Schema({

  name:               { type: String, required: true, trim: true },
  subtype_id:         { type: mongoose.Schema.Types.ObjectId, ref: 'pc_product_subtypes', required: true },
  display_order:      { type: Number, default: 0 },
  
  deleted_at:         { type: Date, default: null },
  created_at:         { type: Date, default: Date.now },
}, { collection: 'pc_attribute_groups', timestamps: false, toJSON: { virtuals: true }, toObject: { virtuals: true } });
s.virtual('id').get(function () { return this._id; });
module.exports = db.model('pc_attribute_groups', s);
