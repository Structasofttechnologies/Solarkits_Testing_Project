const mongoose = require('mongoose');
const { india_solarshop_db: db } = require('../../config/databases');

const schema = new mongoose.Schema({
  product_slug: { type: String, default: 'solar-shop', trim: true },
  country: { type: String, default: 'india', trim: true },
  is_approval_required: { type: Boolean, default: true },
  tolerance_percentage: { type: Number, default: 0, min: 0, max: 100 }, // Allowed % exceeding benchmark without triggering approval
  auto_alert_percentage: { type: Number, default: 50, min: 0 }, // Highlight critical deviations
  require_justification: { type: Boolean, default: true },

  // Default benchmark costs per component category
  component_benchmarks: [{
    component_type: { type: String, required: true }, // 'panel', 'inverter', 'bos_kit', 'battery', 'structure'
    display_name: { type: String, required: true },
    benchmark_cost: { type: Number, required: true, min: 0 },
    unit: { type: String, default: 'piece' },
    min_rate: { type: Number, default: 0 },
    max_rate: { type: Number, default: 0 },
    description: { type: String, default: '' },
    is_active: { type: Boolean, default: true }
  }],

  // Specific SKU overrides if configured
  sku_benchmarks: [{
    sku_code: { type: String, required: true },
    product_name: { type: String },
    benchmark_cost: { type: Number, required: true, min: 0 },
    is_active: { type: Boolean, default: true }
  }],

  updated_by: { type: mongoose.Schema.Types.ObjectId, ref: 'cms_users', default: null },
  updated_by_name: { type: String, default: 'Admin' },
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now }
}, { collection: 'benchmark_approval_configs', timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } });

schema.virtual('id').get(function () { return this._id; });

module.exports = db.model('benchmark_approval_configs', schema);
