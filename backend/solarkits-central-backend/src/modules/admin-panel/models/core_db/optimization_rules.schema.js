const mongoose = require('mongoose');
const { solarkits_core_db: db } = require('../../config/databases');

const s = new mongoose.Schema({
  goalType: { type: String, required: true, unique: true, trim: true },
  weightPercentage: { type: Number, required: true, min: 0, max: 100 },
  scoringFormula: { type: String, required: true },
  deleted_at: { type: Date, default: null },
  created_at: { type: Date, default: Date.now }
}, { collection: 're_optimization_rules', timestamps: false, toJSON: { virtuals: true }, toObject: { virtuals: true } });

s.virtual('id').get(function () { return this._id; });

module.exports = db.model('re_optimization_rules', s);
