const mongoose = require('mongoose');
const { solarkits_core_db: db } = require('../../config/databases');

const s = new mongoose.Schema({
  name: { type: String, required: true, unique: true, trim: true },
  description: { type: String, default: null },
  deleted_at: { type: Date, default: null },
  created_at: { type: Date, default: Date.now }
}, { collection: 're_compatibility_rules', timestamps: false, toJSON: { virtuals: true }, toObject: { virtuals: true } });

s.virtual('id').get(function () { return this._id; });

module.exports = db.model('re_compatibility_rules', s);
