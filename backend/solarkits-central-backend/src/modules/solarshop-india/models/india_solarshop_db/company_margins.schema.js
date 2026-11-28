const mongoose = require('mongoose');
const { india_solarshop_db: db } = require('../../config/databases');

const schema = new mongoose.Schema({
  country_id: { type: mongoose.Schema.Types.ObjectId, required: true },
  state_id: { type: mongoose.Schema.Types.ObjectId, required: true },
  cluster_id: { type: mongoose.Schema.Types.ObjectId, required: true },
  warehouse_id: { type: mongoose.Schema.Types.ObjectId, required: true },
  combo_kit_id: { type: mongoose.Schema.Types.ObjectId, required: true },
  showcase_margin: { type: Number, default: 0 },
  standard_margin: { type: Number, default: 0 },
  po_discounted_margin: { type: Number, default: 0 },
  gst_rate: { type: Number, default: null },
  loose_order_pricing: [{
    quantity: { type: Number, required: true },
    price_per_kit: { type: Number, required: true },
    discount_amount: { type: Number, default: 0 },
    margin_amount: { type: Number, default: 0 },
    margin_percent: { type: Number, default: 0 },
    base_price: { type: Number, default: 0 }
  }],
  po_order_pricing: [{
    quantity: { type: Number, required: true },
    price_per_kit: { type: Number, required: true },
    discount_amount: { type: Number, default: 0 },
    margin_amount: { type: Number, default: 0 },
    margin_percent: { type: Number, default: 0 },
    base_price: { type: Number, default: 0 }
  }],
  is_po_active: { type: Boolean, default: true },
  is_active: { type: Boolean, default: true },
  deleted_at: { type: Date, default: null },
  created_at: { type: Date, default: Date.now }
}, { 
  collection: 'company_margins', 
  timestamps: false 
});

schema.virtual('id').get(function () { return this._id; });

module.exports = db.model('company_margins', schema);
