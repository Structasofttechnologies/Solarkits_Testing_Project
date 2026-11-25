const mongoose = require('mongoose');
const { india_solarshop_db: db } = require('../../config/databases');

const schema = new mongoose.Schema({
  group: { type: String, required: true },
  icon: { type: String, default: "📦" },
  items: [{
    id: { type: String, required: true },
    name: { type: String, required: true },
    unitPrice: { type: Number, required: true },
    unit: { type: String, default: "Piece" },
    icon: { type: String, default: "⚡" },
    imageUrl: { type: String, default: null },
    image: { type: String, default: null },
    availableStock: { type: Number, default: 100 },
    specs: { type: String, default: "" },
    defaultQty: { type: Number, default: 1 },
    recommendedPerKw: { type: Number, default: 0 },
    packInfo: { type: String, default: "" }
  }],
}, { collection: 'custom_bos_catalog', timestamps: true });

schema.virtual('id').get(function () { return this._id; });

module.exports = db.model('custom_bos_catalog', schema);
