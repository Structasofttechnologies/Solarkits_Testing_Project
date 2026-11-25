const mongoose = require('mongoose');
const { company_warehouse_db: db } = require('../../config/databases');

const schema = new mongoose.Schema({
  warehouse_id:       { type: mongoose.Schema.Types.ObjectId, ref: 'company_warehouses', required: true },
  user_id:            { type: mongoose.Schema.Types.ObjectId, required: true },
  is_read:            { type: Boolean, default: false },
  deleted_at:         { type: Date, default: null },
  created_at:         { type: Date, default: Date.now },
}, { collection: 'company_warehouse_notifications', timestamps: false, toJSON: { virtuals: true }, toObject: { virtuals: true } });

schema.virtual('id').get(function () { return this._id; });

module.exports = db.model('company_warehouse_notifications', schema);
