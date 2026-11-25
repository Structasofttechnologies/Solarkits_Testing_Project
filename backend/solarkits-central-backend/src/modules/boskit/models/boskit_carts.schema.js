const mongoose = require('mongoose');
const { india_solarshop_db: db } = require('../../admin-panel/config/databases');

/**
 * boskit_carts — Server-side cart for BOSKIT distributors and dealers.
 *
 * Cart is persisted on the server. Each entity has exactly one active cart.
 * Price is NOT stored on cart items — it is recalculated at checkout.
 *
 * Collection: boskit_carts
 */

const cartItemSchema = new mongoose.Schema({
  scope_type: { type: String, enum: ['product', 'kit'], required: true },
  product_id: { type: mongoose.Schema.Types.ObjectId, ref: 'products', default: null },
  kit_id:     { type: mongoose.Schema.Types.ObjectId, ref: 'warehouse_combo_kits', default: null },
  item_name:  { type: String, required: true, trim: true, maxlength: 300 },
  item_sku:   { type: String, default: null, trim: true, maxlength: 100 },
  quantity:   { type: Number, required: true, min: 1 },
  added_at:   { type: Date, default: Date.now },
  // Price is NOT stored here — recalculated at checkout by PricingEngine
}, { _id: true });

const schema = new mongoose.Schema({
  // ── Owner ─────────────────────────────────────────────────────────────────
  entity_type: {
    type: String,
    enum: ['distributor', 'dealer'],
    required: true,
  },
  entity_id: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
  },

  // ── Delivery Address ──────────────────────────────────────────────────────
  delivery_address: {
    label:       { type: String, default: null }, // 'Home', 'Office', 'Warehouse'
    line:        { type: String, default: null, trim: true, maxlength: 500 },
    city:        { type: String, default: null, trim: true, maxlength: 100 },
    pincode:     { type: String, default: null, trim: true, maxlength: 10 },
    state_id:    { type: mongoose.Schema.Types.ObjectId, ref: 'geolocation_level_1', default: null },
    district_id: { type: mongoose.Schema.Types.ObjectId, ref: 'geolocation_level_2', default: null },
    country_id:  { type: mongoose.Schema.Types.ObjectId, ref: 'geolocation_level_0', default: null },
    contact_name:   { type: String, default: null, trim: true },
    contact_phone:  { type: String, default: null, trim: true },
  },

  // ── Items ─────────────────────────────────────────────────────────────────
  items: [cartItemSchema],

  // ── Notes ─────────────────────────────────────────────────────────────────
  order_notes: { type: String, default: null, trim: true, maxlength: 1000 },

  // ── Checkout Timer ────────────────────────────────────────────────────────
  checkout_locked_at: { type: Date, default: null }, // when checkout session started
  checkout_expires_at:{ type: Date, default: null }, // when checkout session expires
}, {
  collection: 'boskit_carts',
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
});

schema.index({ entity_type: 1, entity_id: 1 }, { unique: true });

schema.virtual('id').get(function () { return this._id; });

module.exports = db.model('boskit_carts', schema);
