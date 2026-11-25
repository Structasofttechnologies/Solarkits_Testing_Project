const mongoose = require('mongoose');
const { company_warehouse_db: db } = require('../../config/databases');

const schema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, maxlength: 100 },
  unique_code: { type: String, required: true, trim: true, maxlength: 8, unique: true },
  parent_module_id: { type: mongoose.Schema.Types.ObjectId, ref: 'warehouse_modules', default: null },
  is_active: { type: Boolean, default: true },
  is_deleted: { type: Boolean, default: false },
  deleted_at: { type: Date, default: null },
  created_at: { type: Date, default: Date.now },
}, { collection: 'warehouse_modules', timestamps: false, toJSON: { virtuals: true }, toObject: { virtuals: true } });

schema.virtual('id').get(function () { return this._id; });
module.exports = db.model('warehouse_modules', schema);
