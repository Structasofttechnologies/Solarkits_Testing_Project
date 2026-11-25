const mongoose = require('mongoose');
const { USER_DB } = require('../../config/databases');

const schema = new mongoose.Schema({
  country_id: { type: mongoose.Schema.Types.ObjectId, required: true },
  saas_product_id: { type: mongoose.Schema.Types.ObjectId, ref: 'saas_products', required: true },
  is_active: { type: Boolean, default: true },
  layout_config: { type: mongoose.Schema.Types.Mixed, default: {} }
}, { collection: 'country_saas_products', timestamps: false, toJSON: { virtuals: true }, toObject: { virtuals: true } });

schema.index({ country_id: 1, saas_product_id: 1 }, { unique: true });
schema.virtual('id').get(function () { return this._id; });
module.exports = USER_DB.model('country_saas_products', schema);
