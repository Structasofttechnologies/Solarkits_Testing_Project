const mongoose = require('mongoose');
const { company_warehouse_db: db } = require('../../config/databases');

const schema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, maxlength: 50, unique: true },
  is_active: { type: Boolean, default: true },
  created_at: { type: Date, default: Date.now },
}, { collection: 'warehouse_roles', timestamps: false, toJSON: { virtuals: true }, toObject: { virtuals: true } });

schema.virtual('id').get(function () { return this._id; });
module.exports = db.model('warehouse_roles', schema);
