const mongoose = require('mongoose');
const { solarkits_core_db: db } = require('../../config/databases');

const s = new mongoose.Schema({
  productTemplateId: { type: mongoose.Schema.Types.ObjectId, ref: 'pc_product_templates', required: true, unique: true },
  formulaId: { type: mongoose.Schema.Types.ObjectId, ref: 're_formula_definitions', required: true },
  isActive: { type: Boolean, default: true, required: true },
  deleted_at: { type: Date, default: null },
  created_at: { type: Date, default: Date.now }
}, { collection: 're_bom_rules', timestamps: false, toJSON: { virtuals: true }, toObject: { virtuals: true } });

s.virtual('id').get(function () { return this._id; });

module.exports = db.model('re_bom_rules', s);
