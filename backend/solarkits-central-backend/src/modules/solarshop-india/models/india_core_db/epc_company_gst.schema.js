const mongoose = require('mongoose');
const { india_core_db: db } = require('../../config/databases');

const schema = new mongoose.Schema({
  company_id:        { type: mongoose.Schema.Types.ObjectId, ref: 'epc_companies', required: true },
  state_id:          { type: mongoose.Schema.Types.ObjectId, required: true },
  gst_number:        { type: String, required: true, trim: true, maxlength: 20, unique: true },
  deleted_at:        { type: Date, default: null },
  created_at:        { type: Date, default: Date.now },
}, { 
  collection: 'epc_company_gst', 
  timestamps: false, 
  toJSON: { virtuals: true }, 
  toObject: { virtuals: true } 
});

schema.virtual('id').get(function () { return this._id; });

module.exports = db.model('epc_company_gst', schema);
