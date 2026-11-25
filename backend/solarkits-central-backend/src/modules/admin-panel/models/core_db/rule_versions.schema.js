const mongoose = require('mongoose');
const { solarkits_core_db: db } = require('../../config/databases');

const s = new mongoose.Schema({
  ruleId: { type: mongoose.Schema.Types.ObjectId, ref: 're_compatibility_rules', required: true },
  version: { type: String, required: true },
  countryId: { type: mongoose.Schema.Types.ObjectId, ref: 'countries', default: null },
  manufacturerId: { type: mongoose.Schema.Types.ObjectId, ref: 'brands', default: null },
  electricalStandard: { type: String, enum: ['NEC', 'IEC', 'AS/NZS'], default: 'IEC', required: true },
  effectiveDate: { type: Date, required: true },
  expiryDate: { type: Date, default: null },
  status: { type: String, enum: ['draft', 'active', 'deprecated'], default: 'draft', required: true },
  expressions: [{
    parentAttributeId: { type: mongoose.Schema.Types.ObjectId, ref: 'pc_subtype_attributes', required: true },
    operator: { type: String, enum: ['LT', 'GT', 'BETWEEN', 'EQUALS', 'IN'], required: true },
    childAttributeId: { type: mongoose.Schema.Types.ObjectId, ref: 'pc_subtype_attributes', required: true },
    severity: { type: String, enum: ['error', 'warning'], default: 'error', required: true },
    errorMessageTemplate: { type: String, required: true }
  }],
  deleted_at: { type: Date, default: null },
  created_at: { type: Date, default: Date.now }
}, { collection: 're_rule_versions', timestamps: false, toJSON: { virtuals: true }, toObject: { virtuals: true } });

s.virtual('id').get(function () { return this._id; });
s.index({ ruleId: 1, countryId: 1, status: 1 });

module.exports = db.model('re_rule_versions', s);
