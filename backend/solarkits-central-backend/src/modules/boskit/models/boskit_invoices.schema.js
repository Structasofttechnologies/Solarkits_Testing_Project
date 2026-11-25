const mongoose = require('mongoose');
const { india_solarshop_db: db } = require('../../admin-panel/config/databases');

/**
 * boskit_invoices — Invoice records for BOSKIT orders.
 *
 * PDF is generated via pdfkit and stored in Cloudinary.
 * Invoice numbers follow: BKI-{YEAR}-{6-digit-sequence}
 *
 * Collection: boskit_invoices
 */

const schema = new mongoose.Schema({
  order_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'boskit_orders',
    required: true,
  },
  order_number: { type: String, required: true, trim: true },

  // ── Invoice Number ────────────────────────────────────────────────────────
  invoice_number: {
    type: String,
    required: true,
    trim: true,
    uppercase: true,
    // Format: BKI-2026-000001
  },

  // ── Buyer ─────────────────────────────────────────────────────────────────
  buyer_type: { type: String, enum: ['distributor', 'dealer'], required: true },
  buyer_id:   { type: mongoose.Schema.Types.ObjectId, required: true },

  // ── Invoice Data Snapshot ─────────────────────────────────────────────────
  invoice_snapshot: { type: mongoose.Schema.Types.Mixed, required: true },
  // Contains: buyer details, seller details, line items, taxes, totals, HSN codes

  // ── PDF Storage ───────────────────────────────────────────────────────────
  pdf_storage_key: { type: String, default: null },  // Cloudinary storage key
  pdf_url:         { type: String, default: null },  // Temporary signed URL (not stored permanently)

  // ── Status ────────────────────────────────────────────────────────────────
  status: {
    type: String,
    enum: ['pending', 'generated', 'sent', 'cancelled'],
    default: 'pending',
  },
  generated_at: { type: Date, default: null },
  sent_at:      { type: Date, default: null },
}, {
  collection: 'boskit_invoices',
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
});

schema.index({ order_id: 1 });
schema.index({ invoice_number: 1 }, { unique: true });
schema.index({ buyer_type: 1, buyer_id: 1, created_at: -1 });
schema.index({ status: 1 });

schema.virtual('id').get(function () { return this._id; });

module.exports = db.model('boskit_invoices', schema);
