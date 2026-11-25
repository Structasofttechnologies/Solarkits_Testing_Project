const mongoose = require('mongoose');
const { solarkits_core_db: db } = require('../../config/databases');

const s = new mongoose.Schema({
  parentTemplateId: { type: mongoose.Schema.Types.ObjectId, ref: 'pc_product_templates', required: true },
  childTemplateId: { type: mongoose.Schema.Types.ObjectId, ref: 'pc_product_templates', required: true },
  conditionSubtypeId: { type: mongoose.Schema.Types.ObjectId, ref: 'pc_product_subtypes', default: null },
  states: [{
    conditionExpression: { type: String, default: null },
    lifecycleState: { 
      type: String, 
      enum: ['Required', 'Optional', 'Recommended', 'Excluded', 'Auto Selected', 'Locked'], 
      required: true 
    }
  }],
  isActive: { type: Boolean, default: true, required: true },
  deleted_at: { type: Date, default: null },
  created_at: { type: Date, default: Date.now }
}, { collection: 're_component_connections', timestamps: false, toJSON: { virtuals: true }, toObject: { virtuals: true } });

s.virtual('id').get(function () { return this._id; });
s.index({ parentTemplateId: 1, childTemplateId: 1 });

module.exports = db.model('re_component_connections', s);
