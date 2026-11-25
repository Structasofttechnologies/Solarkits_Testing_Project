const mongoose = require('mongoose');
const { solarkits_core_db: db } = require('../../config/databases');

const s = new mongoose.Schema({
  name:                 { type: String, required: true, trim: true },
  symbol:               { type: String, required: true, trim: true },
  unit_group_id:        { type: mongoose.Schema.Types.ObjectId, required: true },
  is_base_unit:         { type: Boolean, default: false },
  conversion_factor:    { type: Number, default: 1 },
  is_system:            { type: Boolean, default: false },
  is_active:            { type: Boolean, default: true },
  deleted_at:           { type: Date, default: null },
  created_at:           { type: Date, default: Date.now },
}, { collection: 'pc_units', timestamps: false, toJSON: { virtuals: true }, toObject: { virtuals: true } });

s.virtual('id').get(function () { return this._id; });

module.exports = db.model('pc_units', s);
