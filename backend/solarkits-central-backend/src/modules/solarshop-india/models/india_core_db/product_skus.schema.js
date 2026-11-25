const mongoose = require('mongoose');
const { core_db: db } = require('../../config/databases');

const s = new mongoose.Schema({
  product_id:        { type: mongoose.Schema.Types.ObjectId, required: true },
  sku_code:          { type: String, required: true, trim: true, unique: true },
  image:             { type: String, default: null },
  attributes: [{
    subtype_attribute_id: { type: mongoose.Schema.Types.ObjectId },
    value_raw:            { type: String, default: null },
    value_base_unit:      { type: Number, default: 0 },
    unit_id:              { type: mongoose.Schema.Types.ObjectId }
  }],
  deleted_at:        { type: Date, default: null },
}, { collection: 'pc_product_skus', timestamps: false });

s.virtual('id').get(function () { return this._id; });

module.exports = db.models.pc_product_skus || db.model('pc_product_skus', s);
