const mongoose = require('mongoose');
const { india_solarshop_db: db } = require('../../admin-panel/config/databases');

/**
 * boskit_orders — BOSKIT order documents.
 *
 * IMPORTANT: Price snapshot is stored immutably on each order item.
 * Future pricing rule changes must NOT alter historical order prices.
 *
 * Order number format: BK-{YEAR}-{6-digit-sequence}
 * Example: BK-2026-000001
 *
 * Order statuses:
 *   new → confirmed → processing → packed → out_for_delivery → delivered | cancelled
 *
 * All monetary values in Paise (1 INR = 100 Paise).
 *
 * Collection: boskit_orders
 */

// ── Line item with immutable price snapshot ──────────────────────────────────
const orderItemSchema = new mongoose.Schema({
  scope_type:   { type: String, enum: ['product', 'kit'], required: true },
  product_id:   { type: mongoose.Schema.Types.ObjectId, ref: 'products', default: null },
  kit_id:       { type: mongoose.Schema.Types.ObjectId, ref: 'warehouse_combo_kits', default: null },
  item_name:    { type: String, required: true },
  item_sku:     { type: String, default: null },
  quantity:     { type: Number, required: true, min: 1 },

  // ── Immutable pricing snapshot (from PricingEngine at checkout time) ──────
  price_snapshot: {
    base_mrp_paise:         { type: Number, required: true, min: 0 },
    rule_id:                { type: mongoose.Schema.Types.ObjectId, ref: 'boskit_price_rules', default: null },
    rule_scope:             { type: String, default: null },
    discount_type:          { type: String, enum: ['percentage', 'fixed', 'fixed_rate', null], default: null },
    discount_value:         { type: Number, default: null },
    price_before_gst_paise: { type: Number, required: true, min: 0 },
    gst_pct:                { type: Number, required: true, min: 0 },
    gst_amount_paise:       { type: Number, required: true, min: 0 },
    unit_price_paise:       { type: Number, required: true, min: 0 },
    moq:                    { type: Number, default: 1 },
    moq_met:                { type: Boolean, default: true },
    pricing_explanation:    { type: String, default: null },
  },

  line_total_paise: { type: Number, required: true, min: 0 },
}, { _id: true });

// ── Status history entry ─────────────────────────────────────────────────────
const statusHistorySchema = new mongoose.Schema({
  status:     { type: String, required: true },
  actor_type: { type: String, enum: ['cms_user', 'boskit_distributor', 'boskit_dealer', 'system'], required: true },
  actor_id:   { type: mongoose.Schema.Types.ObjectId, default: null },
  comment:    { type: String, default: null, trim: true, maxlength: 1000 },
  timestamp:  { type: Date, default: Date.now },
}, { _id: false });

// ── Main order document ──────────────────────────────────────────────────────
const schema = new mongoose.Schema({
  // ── Order Number ──────────────────────────────────────────────────────────
  order_number: {
    type: String,
    required: true,
    trim: true,
    uppercase: true,
    // Format: BK-2026-000001
  },

  // ── Buyer ─────────────────────────────────────────────────────────────────
  buyer_type: {
    type: String,
    enum: ['distributor', 'dealer'],
    required: true,
  },
  buyer_id: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    // refs boskit_distributors or boskit_dealers
  },
  distributor_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'boskit_distributors',
    default: null, // null if buyer is the distributor themselves
  },

  // ── Items ─────────────────────────────────────────────────────────────────
  items: [orderItemSchema],

  // ── Totals (Paise) ────────────────────────────────────────────────────────
  subtotal_paise:     { type: Number, required: true, min: 0 },
  tax_total_paise:    { type: Number, required: true, min: 0 },
  shipping_fee_paise: { type: Number, default: 0, min: 0 },
  discount_total_paise: { type: Number, default: 0, min: 0 },
  grand_total_paise:  { type: Number, required: true, min: 0 },

  // ── Delivery Address ──────────────────────────────────────────────────────
  delivery_address: {
    label:       { type: String, default: null },
    line:        { type: String, default: null },
    city:        { type: String, default: null },
    pincode:     { type: String, default: null },
    state_id:    { type: mongoose.Schema.Types.ObjectId, ref: 'geolocation_level_1', default: null },
    district_id: { type: mongoose.Schema.Types.ObjectId, ref: 'geolocation_level_2', default: null },
    contact_name:  { type: String, default: null },
    contact_phone: { type: String, default: null },
  },

  // ── GST Billing Details ───────────────────────────────────────────────────
  billing_gst_number:  { type: String, default: null, uppercase: true, trim: true },
  billing_name:        { type: String, default: null, trim: true },
  billing_address:     { type: String, default: null, trim: true },

  // ── Order Status ──────────────────────────────────────────────────────────
  order_status: {
    type: String,
    enum: ['new', 'confirmed', 'processing', 'packed', 'out_for_delivery', 'delivered', 'cancelled'],
    default: 'new',
  },
  status_history: [statusHistorySchema],

  // ── Payment ───────────────────────────────────────────────────────────────
  payment_status: {
    type: String,
    enum: ['pending', 'captured', 'failed', 'refunded', 'partially_refunded'],
    default: 'pending',
  },
  payment_id:          { type: mongoose.Schema.Types.ObjectId, ref: 'boskit_payments', default: null },
  razorpay_order_id:   { type: String, default: null, trim: true },

  // ── Invoice ───────────────────────────────────────────────────────────────
  invoice_id:          { type: mongoose.Schema.Types.ObjectId, ref: 'boskit_invoices', default: null },
  invoice_status:      { type: String, enum: ['pending', 'generated', 'sent'], default: 'pending' },

  // ── Shipping ──────────────────────────────────────────────────────────────
  tracking_number:     { type: String, default: null, trim: true },
  shipping_carrier:    { type: String, default: null, trim: true },
  shipping_label_url:  { type: String, default: null },

  // ── Cancellation ─────────────────────────────────────────────────────────
  cancellation_reason: { type: String, default: null, trim: true, maxlength: 1000 },
  cancelled_by_type:   { type: String, enum: ['cms_user', 'boskit_distributor', 'boskit_dealer', 'system', null], default: null },
  cancelled_by_id:     { type: mongoose.Schema.Types.ObjectId, default: null },
  cancelled_at:        { type: Date, default: null },

  // ── Timestamps ────────────────────────────────────────────────────────────
  confirmed_at:        { type: Date, default: null },
  dispatched_at:       { type: Date, default: null },
  delivered_at:        { type: Date, default: null },

  // ── Notes ─────────────────────────────────────────────────────────────────
  order_notes:         { type: String, default: null, trim: true, maxlength: 2000 },
  admin_notes:         { type: String, default: null, trim: true, maxlength: 2000 },
}, {
  collection: 'boskit_orders',
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
});

schema.index({ order_number: 1 }, { unique: true });
schema.index({ buyer_type: 1, buyer_id: 1, created_at: -1 });
schema.index({ distributor_id: 1, order_status: 1 });
schema.index({ order_status: 1, payment_status: 1 });
schema.index({ razorpay_order_id: 1 }, { sparse: true });
schema.index({ 'delivery_address.state_id': 1, created_at: -1 });

schema.virtual('id').get(function () { return this._id; });

module.exports = db.model('boskit_orders', schema);
