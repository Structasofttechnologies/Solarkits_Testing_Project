const mongoose = require('mongoose');
const { company_warehouse_db: db } = require('../config/databases');

const schema = new mongoose.Schema({
  warehouse_code:  { type: String, required: true, trim: true, unique: true },
  warehouse_type:  { type: String, enum: ['company', '3pl', 'master', 'sub'], required: true },
  is_active:       { type: Boolean, default: false },
}, { collection: 'company_warehouses' });

module.exports = db.model('company_warehouses', schema);
