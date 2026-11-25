const mongoose = require('mongoose');
const { india_solarshop_db: db } = require('../../config/databases');

const schema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  category: { type: String, default: "Complete BOS Combos" },
  subCategory: { type: String, default: "Single Phase" },
  systemType: { type: String, default: "On-Grid & Hybrid" },
  projectRange: { type: String, default: "3kw-5kw" },
  comboKitType: { type: String, default: "Standard Residential" },
  ourPrice: { type: Number, required: true },
  marketPrice: { type: Number, required: true },
  inStock: { type: Boolean, default: true },
  availableStock: { type: Number, default: 20 },
  warranty: { type: String, default: "5 Years Replacement" },
  badge: { type: String, default: "Certified BOS Kit" },
  imageUrl: { type: String, default: null },
  image: { type: String, default: null },
  rating: { type: Number, default: 4.9 },
  reviewsCount: { type: Number, default: 25 },
  components: [{ type: String }],
  specifications: { type: mongoose.Schema.Types.Mixed, default: {} },
  country_id: { type: mongoose.Schema.Types.ObjectId, default: null },
  state_id: { type: mongoose.Schema.Types.ObjectId, default: null },
  is_active: { type: Boolean, default: true },
  deleted_at: { type: Date, default: null }
}, {
  collection: 'bos_kits',
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

schema.virtual('id').get(function () { return this._id.toString(); });

module.exports = db.model('bos_kits', schema);
