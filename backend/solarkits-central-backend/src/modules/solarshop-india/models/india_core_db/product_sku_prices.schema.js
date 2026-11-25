const mongoose = require('mongoose');
const { core_db: db } = require('../../config/databases');

const schema = new mongoose.Schema({
  sku_id:       { type: mongoose.Schema.Types.ObjectId, required: true },
  country_id:   { type: mongoose.Schema.Types.ObjectId, required: true },
  state_id:     { type: mongoose.Schema.Types.ObjectId, required: true },
  cluster_id:   { type: mongoose.Schema.Types.ObjectId, required: true },
  price:        { type: Number, required: true, default: 0 },
  price_per_watt: { type: Number, default: 0 },
  currency_code: { type: String, required: true, trim: true, uppercase: true }
}, {
  collection: 'pc_product_sku_prices',
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
});

schema.virtual('id').get(function () { return this._id; });

module.exports = db.model('pc_product_sku_prices', schema);
