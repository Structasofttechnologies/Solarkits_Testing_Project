const mongoose = require('mongoose');
const { solarkits_core_db: db } = require('../../config/databases');

const s = new mongoose.Schema({
  name: { type: String, required: true, unique: true, trim: true },
  expression: { type: String, required: true },
  outputType: { type: String, enum: ['integer', 'decimal', 'boolean'], required: true },
  validationRules: { type: mongoose.Schema.Types.Mixed, default: {} },
  version: { type: String, required: true },
  description: { type: String, default: null },
  variables: [{
    variableName: { type: String, required: true },
    sourceType: { type: String, enum: ['sku_attribute', 'system_metric', 'user_input'], required: true },
    sourceReferenceId: { type: mongoose.Schema.Types.ObjectId, default: null }
  }],
  deleted_at: { type: Date, default: null },
  created_at: { type: Date, default: Date.now }
}, { collection: 're_formula_definitions', timestamps: false, toJSON: { virtuals: true }, toObject: { virtuals: true } });

s.virtual('id').get(function () { return this._id; });

module.exports = db.model('re_formula_definitions', s);
