const mongoose = require('mongoose');
const { company_warehouse_db: db } = require('../../config/databases');

const schema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, maxlength: 250 },
  email: { type: String, required: true, trim: true, lowercase: true, unique: true, maxlength: 250 },
  phone_code: { type: String, required: true, default: '+91', trim: true, maxlength: 10 },
  phone: { type: String, required: true, trim: true, maxlength: 15, unique: true },
  role_id: { type: mongoose.Schema.Types.ObjectId, ref: 'warehouse_roles', required: true },
  warehouse_id: { type: mongoose.Schema.Types.ObjectId, ref: 'company_warehouses', required: true },
  passcode: { type: String, default: null }, // holds hashed password
  failed_login_attempts: { type: Number, default: 0 },
  token: { type: String, default: null },
  token_version: { type: Number, default: 0 },
  is_verified: { type: Boolean, default: false },
  is_active: { type: Boolean, default: true },
  is_deleted: { type: Boolean, default: false },
  deleted_at: { type: Date, default: null },
  last_failed_login_at: { type: Date, default: null },
}, { 
  collection: 'warehouse_users', 
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  toJSON: { virtuals: true }, 
  toObject: { virtuals: true } 
});

schema.virtual('id').get(function () { return this._id; });
module.exports = db.model('warehouse_users', schema);
