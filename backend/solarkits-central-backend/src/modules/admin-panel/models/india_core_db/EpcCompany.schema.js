const mongoose = require('mongoose');
const { india_core_db: db } = require('../../config/databases');

const schema = new mongoose.Schema({
  name:           { type: String, required: true, trim: true, maxlength: 200 },
  email:          { type: String, required: true, trim: true, lowercase: true, maxlength: 100 },
  source:         { type: String, enum: ['government','verified'], required: true },
  working_states: [{ type: mongoose.Schema.Types.ObjectId, ref: 'geolocation_level_1' }],
  deleted_at:     { type: Date, default: null },
}, { collection: 'epc_companies', timestamps: { createdAt: 'created_at', updatedAt: false }, toJSON: { virtuals: true }, toObject: { virtuals: true } });

schema.virtual('id').get(function () { return this._id; });

module.exports = db.model('epc_companies', schema);
