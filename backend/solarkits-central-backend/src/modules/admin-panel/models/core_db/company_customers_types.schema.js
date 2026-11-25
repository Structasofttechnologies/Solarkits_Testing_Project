const mongoose = require('mongoose');
const { solarkits_core_db: db } = require('../../config/databases');

const s = new mongoose.Schema({
  type_name: { type: String, required: true, trim: true, unique: true },
  deleted_at: { type: Date, default: null },
}, { collection: 'company_customers_types', timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } });
s.virtual('id').get(function () { return this._id; });
module.exports = db.model('company_customers_types', s);
