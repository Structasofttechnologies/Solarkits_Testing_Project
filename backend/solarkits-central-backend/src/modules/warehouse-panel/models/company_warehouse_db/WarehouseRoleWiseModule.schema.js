const mongoose = require('mongoose');
const { company_warehouse_db: db } = require('../../config/databases');

const schema = new mongoose.Schema({
  role_id: { type: mongoose.Schema.Types.ObjectId, ref: 'warehouse_roles', required: true },
  module_id: { type: mongoose.Schema.Types.ObjectId, ref: 'warehouse_modules', required: true }, // References warehouse_modules in company_warehouse_db
  can_view: { type: Boolean, default: true },
  can_add: { type: Boolean, default: false },
  can_edit: { type: Boolean, default: false },
  can_delete: { type: Boolean, default: false },
  deleted_at: { type: Date, default: null },
  created_at: { type: Date, default: Date.now },
}, { collection: 'warehouse_role_wise_modules', timestamps: false, toJSON: { virtuals: true }, toObject: { virtuals: true } });

schema.index({ role_id: 1, module_id: 1 }, { unique: true });
schema.virtual('id').get(function () { return this._id; });

module.exports = db.model('warehouse_role_wise_modules', schema);
