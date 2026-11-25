const mongoose = require('mongoose');
const { solarkits_core_db } = require('../../config/databases');

// project_types
const schema = new mongoose.Schema({

  name:       { type: String, required: true, trim: true, maxlength: 250 },
  is_active:  { type: Boolean, default: true },
  deleted_at: { type: Date, default: null },
}, { collection: 'sys_filter_types', timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }, toJSON: { virtuals: true }, toObject: { virtuals: true } });

schema.virtual('id').get(function () { return this._id; });
module.exports = solarkits_core_db.model('sys_filter_types', schema);
