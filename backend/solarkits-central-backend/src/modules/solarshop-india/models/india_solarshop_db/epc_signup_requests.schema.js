const mongoose = require('mongoose');
const { india_solarshop_db: db } = require('../../config/databases');

const schema = new mongoose.Schema({
  account_id:      { type: mongoose.Schema.Types.ObjectId, ref: 'epc_accounts', required: true },
  company_name:    { type: String, required: true },
  email:           { type: String, required: true },
  whatsapp:        { type: String, required: true },
  status:          { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
  state_id:        { type: mongoose.Schema.Types.ObjectId, required: true },
  district_id:     { type: mongoose.Schema.Types.ObjectId, required: true },
  reference_image: { type: String, default: null },
  epc_type:        { type: String, default: null, trim: true },
  epc_type_id:     { type: mongoose.Schema.Types.ObjectId, ref: 'epc_types', default: null },
  reviewed_by:     { type: mongoose.Schema.Types.ObjectId, default: null }, 
  reviewed_at:     { type: Date, default: null },
  deleted_at:      { type: Date, default: null }
}, { 
  collection: 'epc_signup_requests', 
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }, 
  toJSON: { virtuals: true }, 
  toObject: { virtuals: true } 
});

schema.virtual('id').get(function () { return this._id; });

<<<<<<< HEAD
// Indexes for high performance querying, pagination, and sorting
schema.index({ status: 1, created_at: -1 });
schema.index({ deleted_at: 1, created_at: -1 });
schema.index({ deleted_at: 1, status: 1, created_at: -1 });
schema.index({ created_at: -1 });
schema.index({ account_id: 1 });
schema.index({ state_id: 1, status: 1 });
schema.index({ district_id: 1 });
schema.index({ epc_type: 1 });
schema.index({ company_name: 1 });
schema.index({ email: 1 });
schema.index({ whatsapp: 1 });

=======
>>>>>>> origin/main
module.exports = db.model('epc_signup_requests', schema);
