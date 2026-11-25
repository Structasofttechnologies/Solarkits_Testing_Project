const mongoose = require('mongoose');
const { solarkits_core_db: db } = require('../../config/databases');

const s = new mongoose.Schema({
  module: { type: String, required: true, unique: true, trim: true },
  version: { type: String, required: true },
  seededAt: { type: Date, default: Date.now }
}, { collection: 're_seeder_versions', timestamps: false, toJSON: { virtuals: true }, toObject: { virtuals: true } });

s.virtual('id').get(function () { return this._id; });

module.exports = db.model('re_seeder_versions', s);
