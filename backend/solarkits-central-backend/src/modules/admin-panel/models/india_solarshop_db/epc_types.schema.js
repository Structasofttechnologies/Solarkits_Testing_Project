const mongoose = require('mongoose');
const { india_solarshop_db: db } = require('../../config/databases');

const schema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },
    code: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      unique: true,
      maxlength: 100,
    },
    description: {
      type: String,
      default: '',
      trim: true,
      maxlength: 500,
    },
    badge_color: {
      type: String,
      default: 'blue', // 'blue' | 'purple' | 'amber' | 'emerald' | 'teal' | 'indigo' | 'rose'
      trim: true,
    },
    display_order: {
      type: Number,
      default: 0,
    },
    is_active: {
      type: Boolean,
      default: true,
      index: true,
    },
    deleted_at: {
      type: Date,
      default: null,
      index: true,
    },
  },
  {
    collection: 'epc_types',
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

schema.virtual('id').get(function () {
  return this._id;
});

module.exports = db.model('epc_types', schema);

