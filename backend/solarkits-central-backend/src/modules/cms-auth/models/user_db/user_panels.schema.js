const mongoose = require('mongoose');
const { USER_DB } = require('../../config/databases');

const schema = new mongoose.Schema({
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'cms_users', required: true },
  panel_id: { type: mongoose.Schema.Types.ObjectId, ref: 'cms_panels', required: true },
  saas_product_ids: { type: [mongoose.Schema.Types.ObjectId], ref: 'saas_products', default: [] }
}, { collection: 'user_panels', timestamps: false, toJSON: { virtuals: true }, toObject: { virtuals: true } });

schema.index({ user_id: 1, panel_id: 1 }, { unique: true });
schema.virtual('id').get(function () { return this._id; });
module.exports = USER_DB.model('user_panels', schema);
