const mongoose = require('mongoose');
const { core_db } = require('../../config/databases');

const schema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  subtype_id: { type: mongoose.Schema.Types.ObjectId, ref: 'pc_product_subtypes', required: true },
  deleted_at: { type: Date, default: null }
}, { collection: 'pc_subtype_attributes', timestamps: false });

schema.virtual('id').get(function () { return this._id; });

module.exports = core_db.model('pc_subtype_attributes', schema);
