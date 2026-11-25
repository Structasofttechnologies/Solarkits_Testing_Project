const mongoose = require('mongoose');
const { solarkits_core_db: db } = require('../../config/databases');

const schema = new mongoose.Schema({
  warehouse_id: { type: mongoose.Schema.Types.ObjectId, ref: 'company_warehouses', default: null },
  warehouse_code: { type: String, required: true, trim: true },
  warehouse_name: { type: String, required: true, trim: true },
  cluster_id: { type: mongoose.Schema.Types.ObjectId, ref: 'regional_clusters', default: null },
  cluster_name: { type: String, default: null, trim: true },
  states: [{ type: String, required: true, trim: true }],
  state_ids: [{ type: mongoose.Schema.Types.ObjectId, ref: 'geolocation_level_1', default: [] }],
  franchise_cluster_ids: [{ type: mongoose.Schema.Types.ObjectId, ref: 'franchisee_clusters', default: [] }],
  franchise_clusters: [{
    cluster_id: { type: mongoose.Schema.Types.ObjectId, ref: 'franchisee_clusters' },
    cluster_code: { type: String, trim: true },
    cluster_name: { type: String, trim: true },
    state_name: { type: String, trim: true },
    district_names: [{ type: String, trim: true }]
  }],
  kit_types: [{
    type: String,
    enum: ['Combo Kit', 'Customize Kit', 'Bulk Kit'],
    default: ['Combo Kit']
  }],
  effective_from: { type: Date, default: Date.now },
  status: { type: String, enum: ['Active', 'Inactive'], default: 'Active' },
  deleted_at: { type: Date, default: null },
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now }
}, {
  collection: 'warehouse_cluster_mappings',
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

schema.virtual('id').get(function () {
  return this._id;
});

module.exports = db.model('warehouse_cluster_mappings', schema);
