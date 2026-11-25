const mongoose = require('mongoose');
const { user_db } = require('../../config/databases');

// otps — user_id SAME DB → ObjectId
const schema = new mongoose.Schema({
  otp:            { type: String, required: true, maxlength: 200 },
  user_id:        { type: mongoose.Schema.Types.ObjectId, ref: 'cms_users', required: true },
  tries:          { type: Number, required: true, default: 0 },
  purpose: {
    type: String, required: true,
    enum: ['update_department','forgot_password','verify','update_panel','update_role','update_module','unassign_module', 'deactivate_country', 'deactivate_state', 'deactivate_district', 'reassign_districts_to_another_cluster', 'delete_cluster', 'delete_module', 'deactivate_country_saas_product'],
  },
  expires_at:  { type: Date, default: Date.now },
  created_at:  { type: Date, default: Date.now },
}, { collection: 'otps', timestamps: false, toJSON: { virtuals: true }, toObject: { virtuals: true } });

schema.index({ purpose: 1, expires_at: -1 });
schema.virtual('id').get(function () { return this._id; });
module.exports = user_db.model('otps', schema);
