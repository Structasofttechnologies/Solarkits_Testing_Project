const mongoose = require('mongoose');
const { core_db: db } = require('../../config/databases');

const s = new mongoose.Schema({
  name:              { type: String, required: true, trim: true, maxlength: 255 },
  description:       { type: String, default: null },
  features:          { type: [String], default: [] },
  image:             { type: String, default: null, maxlength: 500 },
  datasheet:         { type: String, default: null, maxlength: 500 },
  template_id:       { type: mongoose.Schema.Types.ObjectId, required: true },
  subtype_id:        { type: mongoose.Schema.Types.ObjectId, required: true },
  brand_id:          { type: mongoose.Schema.Types.ObjectId, default: null },
  deleted_at:        { type: Date, default: null },
}, { collection: 'products', timestamps: false });

s.virtual('id').get(function () { return this._id; });

module.exports = db.models.products || db.model('products', s);
