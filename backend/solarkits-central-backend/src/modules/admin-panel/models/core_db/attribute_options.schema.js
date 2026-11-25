const mongoose = require('mongoose');
const { solarkits_core_db: db } = require('../../config/databases');

// attribute_options — attribute_id SAME DB → ObjectId
const s = new mongoose.Schema({

  attribute_id:       { type: mongoose.Schema.Types.ObjectId, ref: 'pc_subtype_attributes', required: true },

  value:              { type: String, required: true, trim: true, maxlength: 255 },
  display_order:      { type: Number, default: 0 },
  is_active:          { type: Boolean, default: true },
  deleted_at:         { type: Date, default: null },
  created_at:         { type: Date, default: Date.now },
}, { collection: 'pc_attribute_options', timestamps: false, toJSON: { virtuals: true }, toObject: { virtuals: true } });
s.virtual('id').get(function () { return this._id; });
module.exports = db.model('pc_attribute_options', s);
