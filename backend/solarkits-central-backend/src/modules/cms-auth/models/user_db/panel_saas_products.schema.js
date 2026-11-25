const mongoose = require('mongoose');
const { USER_DB } = require('../../config/databases');

const schema = new mongoose.Schema({
  panel_id: { type: mongoose.Schema.Types.ObjectId, ref: 'cms_panels', required: true },
  saas_product_id: { type: mongoose.Schema.Types.ObjectId, ref: 'saas_products', required: true }
}, { collection: 'panel_saas_products', timestamps: false, toJSON: { virtuals: true }, toObject: { virtuals: true } });

schema.index({ panel_id: 1, saas_product_id: 1 }, { unique: true });
schema.virtual('id').get(function () { return this._id; });
module.exports = USER_DB.model('panel_saas_products', schema);
