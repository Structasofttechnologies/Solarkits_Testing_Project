const mongoose = require('mongoose');
const { india_solarshop_db: db } = require('../../config/databases');

/**
 * combokit_weight_master.schema.js
 * Weight master for every ComboKit.
 * Section 4: COMBOKIT KG CAPACITY CHART
 */
const schema = new mongoose.Schema({
  kit_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'pc_combo_kits',
    required: true,
    unique: true,
  },
  kit_name: {
    type: String,
    required: true,
    trim: true,
  },
  capacity_kw: {
    type: Number,
    default: 0,
  },
  solar_modules_weight_kg: {
    type: Number,
    required: true,
    min: 0,
    default: 0,
  },
  inverter_weight_kg: {
    type: Number,
    required: true,
    min: 0,
    default: 0,
  },
  boskit_weight_kg: {
    type: Number,
    required: true,
    min: 0,
    default: 0,
  },
  structure_material_weight_kg: {
    type: Number,
    required: true,
    min: 0,
    default: 0,
  },
  packaging_weight_kg: {
    type: Number,
    required: true,
    min: 0,
    default: 0,
  },
  total_kit_weight_kg: {
    type: Number,
    required: true,
    min: 0,
  },
  notes: {
    type: String,
    default: null,
    trim: true,
  },
  created_by: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'cms_users',
    default: null,
  },
  updated_by: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'cms_users',
    default: null,
  },
}, {
  collection: 'combokit_weight_masters',
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
});

schema.virtual('id').get(function () { return this._id; });

module.exports = db.model('combokit_weight_masters', schema);
