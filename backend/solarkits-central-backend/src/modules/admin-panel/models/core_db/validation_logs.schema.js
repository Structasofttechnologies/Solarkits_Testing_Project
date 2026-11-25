const mongoose = require('mongoose');
const { solarkits_core_db: db } = require('../../config/databases');

const s = new mongoose.Schema({
  comboKitId: { type: mongoose.Schema.Types.ObjectId, ref: 'pc_combo_kits', default: null },
  evaluatedAt: { type: Date, default: Date.now, required: true },
  isValid: { type: Boolean, required: true },
  logDetails: { type: mongoose.Schema.Types.Mixed, required: true }
}, { collection: 're_validation_logs', timestamps: false, toJSON: { virtuals: true }, toObject: { virtuals: true } });

s.virtual('id').get(function () { return this._id; });
s.index({ comboKitId: 1, evaluatedAt: -1 });

module.exports = db.model('re_validation_logs', s);
