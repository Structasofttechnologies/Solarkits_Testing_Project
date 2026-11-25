const mongoose = require('mongoose');
const { solarkits_core_db: db } = require('../../config/databases');

const s = new mongoose.Schema({
  name: { type: String, required: true, unique: true, trim: true },
  expression: { type: String, required: true },
  errorMessage: { type: String, required: true },
  deleted_at: { type: Date, default: null },
  created_at: { type: Date, default: Date.now }
}, { collection: 're_constraint_definitions', timestamps: false, toJSON: { virtuals: true }, toObject: { virtuals: true } });

s.virtual('id').get(function () { return this._id; });

module.exports = db.model('re_constraint_definitions', s);
