const mongoose = require('mongoose');
const { user_db } = require('../../config/databases');

const schema = new mongoose.Schema({
  role_id: { type: mongoose.Schema.Types.ObjectId, ref: 'cms_roles', required: true },
  panel_id: { type: mongoose.Schema.Types.ObjectId, ref: 'cms_panels', required: true },
  saas_product_ids: { type: [mongoose.Schema.Types.ObjectId], ref: 'saas_products', default: [] }
}, { collection: 'role_panels', timestamps: false, toJSON: { virtuals: true }, toObject: { virtuals: true } });

schema.index({ role_id: 1, panel_id: 1 }, { unique: true });
schema.virtual('id').get(function () { return this._id; });
module.exports = user_db.model('role_panels', schema);
