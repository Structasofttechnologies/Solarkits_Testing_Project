const mongoose = require('mongoose');
const { solarkits_core_db: db } = require('../../config/databases');

const s = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  symbol: { type: String, required: true, trim: true },
  conversion_factor: { type: Number, default: 1 },
  deleted_at: { type: Date, default: null },
}, { collection: 'pc_units', timestamps: false });

s.virtual('id').get(function () { return this._id; });
module.exports = db.model('pc_units', s);
