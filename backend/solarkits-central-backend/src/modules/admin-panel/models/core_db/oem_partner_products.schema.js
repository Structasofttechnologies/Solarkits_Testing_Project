const mongoose = require('mongoose');
const { solarkits_core_db: db } = require('../../config/databases');

const schema = new mongoose.Schema({
  oem_brand_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'brands',
    required: true,
    unique: true
  },
  product_ids: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'products'
  }],
  is_active: {
    type: Boolean,
    default: true
  },
  notes: {
    type: String,
    default: null
  },
  deleted_at: {
    type: Date,
    default: null
  }
}, {
  collection: 'oem_partner_products',
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

schema.virtual('id').get(function () {
  return this._id;
});

module.exports = db.model('oem_partner_products', schema);
